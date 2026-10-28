#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
本地情绪歌曲合成器 (Local Emotion Song Synthesizer)
---------------------------------------------------
使用纯 Python (wave / math / struct) 合成 7 种情绪对应的短旋律音频 (WAV)。
每个音频在 速度(tempo)、调式(mode)、响度(energy)、音色(timbre) 上刻意区分，
以便前端 "旋律曲调情绪识别算法" 能通过特征提取还原其情绪。

输出:
  public/songs/<emotion>.wav
  public/songs/manifest.json
"""
import os
import math
import wave
import struct
import json

SR = 22050          # 采样率
DURATION = 14.0     # 每个片段时长(秒)

# 情绪 -> 音乐参数设计表
# tempo: BPM  mode: 'major'/'minor'  wave: 波形  gain: 整体响度
# valence/arousal: 设计的情绪坐标 (Russell 环形模型, 范围 -1..1)
# pattern: 相对根音的半音序列 (带符号表示落在拍上的音)
DESIGN = {
    "happy": dict(
        title="快乐·晴空旋律", root=60, scale=[0, 2, 4, 5, 7, 9, 11],
        tempo=132, mode="major", wave="triangle", gain=0.55,
        pattern=[0, 4, 7, 12, 7, 4, 0, 7, 4, 0, 9, 7],
        valence=0.82, arousal=0.70,
        desc="大调、快速、明亮三角波、上行琶音，对应高愉悦/高唤醒。"),
    "sad": dict(
        title="悲伤·夜雨独白", root=57, scale=[0, 2, 3, 5, 7, 8, 10],
        tempo=64, mode="minor", wave="sine", gain=0.42,
        pattern=[0, -3, -7, -5, -3, 0, -7, -12],
        valence=-0.72, arousal=-0.32,
        desc="小调、慢速、柔和正弦波、下行旋律，对应低愉悦/低唤醒。"),
    "angry": dict(
        title="愤怒·裂帛节拍", root=64, scale=[0, 1, 3, 5, 7, 8, 10],
        tempo=150, mode="minor", wave="sawtooth", gain=0.78,
        pattern=[0, 1, 0, 1, 3, 1, 0, 1],
        valence=-0.45, arousal=0.85,
        desc="小调、极快、锯齿波、小二度不协和强奏，对应中低愉悦/高唤醒。"),
    "fearful": dict(
        title="恐惧·暗影颤栗", root=62, scale=[0, 1, 6, 7, 8, 13],
        tempo=102, mode="minor", wave="sine", gain=0.40,
        pattern=[0, 6, 1, 6, 0, 8, 1, 6],
        valence=-0.38, arousal=0.42,
        desc="小调、中速、颤音振幅调制、三全音不协和，对应低愉悦/中唤醒。"),
    "surprised": dict(
        title="惊喜·骤光迸发", root=67, scale=[0, 2, 4, 7, 9, 11],
        tempo=120, mode="major", wave="triangle", gain=0.6,
        pattern=[0, 4, 7, 12, 19, 7, 4, 0],
        valence=0.30, arousal=0.82,
        desc="大调、突然强奏与跳进、强对比力度，对应中愉悦/高唤醒。"),
    "disgusted": dict(
        title="厌恶·浊浪纠缠", root=59, scale=[0, 1, 2, 3, 5, 7],
        tempo=92, mode="minor", wave="square", gain=0.5,
        pattern=[0, 1, 2, 1, 0, 1, 2, 3],
        valence=-0.60, arousal=0.10,
        desc="小调、中速、方波、半音簇不协和，对应低愉悦/低唤醒。"),
    "neutral": dict(
        title="平静·微风随想", root=60, scale=[0, 2, 4, 5, 7, 9, 11],
        tempo=100, mode="major", wave="sine", gain=0.45,
        pattern=[0, 4, 7, 5, 4, 2, 0, 4],
        valence=0.0, arousal=0.0,
        desc="大调、中速、平衡正弦波、平稳力度，对应中性情绪原点。"),
}


def midi_to_freq(m):
    return 440.0 * (2.0 ** ((m - 69) / 12.0))


def osc(wave, t, freq):
    """基础振荡器波形生成单点样本值 [-1,1]"""
    ph = 2.0 * math.pi * freq * t
    if wave == "sine":
        return math.sin(ph)
    if wave == "triangle":
        return (2.0 / math.pi) * math.asin(math.sin(ph))
    if wave == "square":
        return 1.0 if math.sin(ph) >= 0 else -1.0
    if wave == "sawtooth":
        return 2.0 * (freq * t - math.floor(0.5 + freq * t))
    return math.sin(ph)


def render_note(wave, freq, dur, sr, attack=0.02, release=0.08, tremolo=False):
    """渲染单个音符, 返回样本列表(float)"""
    n = int(dur * sr)
    out = []
    for i in range(n):
        t = i / sr
        # ADSR 简化包络
        if t < attack:
            env = t / attack
        elif t > dur - release:
            env = max(0.0, (dur - t) / release)
        else:
            env = 1.0
        s = osc(wave, t, freq)
        if tremolo:
            # 颤音: 振幅以 6Hz 调制 (恐惧/厌恶使用)
            s *= 0.6 + 0.4 * math.sin(2.0 * math.pi * 6.0 * t)
        out.append(env * s)
    return out


def render_click(sr, dur=0.05, gain=0.25):
    """短促噪声点击 (用于清晰标记节拍, 便于速度检测)"""
    n = int(dur * sr)
    out = []
    for i in range(n):
        env = max(0.0, 1.0 - i / n)
        out.append(env * gain * (0.5 - ((i * 9301 + 49297) % 233280) / 233280.0 * 2.0))
    return out


def build_song(cfg):
    sr = SR
    beat = 60.0 / cfg["tempo"]
    total = int(DURATION * sr)
    buf = [0.0] * total

    # 1) 旋律: 每个音占 1 拍
    notes = cfg["pattern"]
    pos = 0
    idx = 0
    while pos < total:
        midi = cfg["root"] + notes[idx % len(notes)]
        freq = midi_to_freq(midi)
        ndur = beat * 0.92
        note = render_note(cfg["wave"], freq, ndur, sr,
                           tremolo=(cfg["mode"] == "minor" and cfg["wave"] in ("sine",)))
        # 叠加低音根音 (每4拍一次), 帮助调式判定
        if idx % 4 == 0:
            bass = render_note("sine", midi_to_freq(cfg["root"] - 12), beat * 0.95, sr, release=0.2)
        else:
            bass = [0.0] * int(beat * 0.95 * sr)
        seg = [note[i] + 0.5 * bass[i] for i in range(min(len(note), len(bass)))]
        start = pos
        for k, v in enumerate(seg):
            if start + k < total:
                buf[start + k] += cfg["gain"] * v
        # 节拍点击
        click = render_click(sr)
        for k, v in enumerate(click):
            if start + k < total:
                buf[start + k] += v
        pos += int(beat * sr)
        idx += 1

    # 归一化
    peak = max(1e-6, max(abs(x) for x in buf))
    buf = [max(-1.0, min(1.0, x / peak * 0.9)) for x in buf]
    return buf


def write_wav(path, buf, sr=SR):
    with wave.open(path, "w") as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(sr)
        frames = bytearray()
        for x in buf:
            v = int(max(-1.0, min(1.0, x)) * 32767)
            frames += struct.pack("<h", v)
        w.writeframes(bytes(frames))


def main():
    base = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    out_dir = os.path.join(base, "public", "songs")
    os.makedirs(out_dir, exist_ok=True)
    manifest = []
    for emo, cfg in DESIGN.items():
        buf = build_song(cfg)
        fname = f"{emo}.wav"
        write_wav(os.path.join(out_dir, fname), buf)
        manifest.append({
            "id": f"local-{emo}",
            "title": cfg["title"],
            "artist": "本地合成 · LocalSynth",
            "emotion": emo,
            "file": f"/songs/{fname}",
            "source": "local",
            "tempo": cfg["tempo"],
            "mode": cfg["mode"],
            "valence": cfg["valence"],
            "arousal": cfg["arousal"],
            "desc": cfg["desc"],
        })
        print(f"  [ok] {emo}: {fname} ({len(buf)} samples)")
    with open(os.path.join(out_dir, "manifest.json"), "w", encoding="utf-8") as f:
        json.dump(manifest, f, ensure_ascii=False, indent=2)
    print(f"manifest.json written with {len(manifest)} tracks -> {out_dir}")


if __name__ == "__main__":
    main()

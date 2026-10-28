// ============================================================
// 算法二: 歌曲旋律/曲调情绪识别 (Web Audio 离线特征分析)
// ------------------------------------------------------------
// 经典音乐信息检索 (MIR) 特征提取管线, 全部在浏览器端完成:
//   1) RMS 能量        -> 响度 (loudness)
//   2) 能量包络自相关   -> 速度 tempo (BPM)   [经典节拍检测]
//   3) STFT 谱质心      -> 明亮感 (brightness) [音色色彩]
//   4) 过零率 ZCR       -> 噪声/粗糙度
//   5) 色度旋转搜索     -> 调式 mode (大调/小调) [经典和弦特征]
// 映射: 唤醒度←速度+能量; 效价←调式(正/负)+明亮感
// 分类: 由 (效价,唤醒度) 经最近质心分类器映射到七类情绪。
// 特点: 仅用基础 DSP + 一次 FFT, 无深度学习, 经典且高效。
// ============================================================
import { vaToEmotion } from './emotions'
import { clamp, round } from './utils'

// Hann 窗
function hann(n) {
  const w = new Float32Array(n)
  for (let i = 0; i < n; i++) w[i] = 0.5 - 0.5 * Math.cos((2 * Math.PI * i) / (n - 1))
  return w
}

// 迭代基-2 FFT (Cooley-Tukey)
function fft(re, im) {
  const n = re.length
  for (let i = 1, j = 0; i < n; i++) {
    let bit = n >> 1
    for (; j & bit; bit >>= 1) j ^= bit
    j ^= bit
    if (i < j) {
      ;[re[i], re[j]] = [re[j], re[i]]
      ;[im[i], im[j]] = [im[j], im[i]]
    }
  }
  for (let len = 2; len <= n; len <<= 1) {
    const ang = (-2 * Math.PI) / len
    const wr = Math.cos(ang), wi = Math.sin(ang)
    for (let i = 0; i < n; i += len) {
      let cwr = 1, cwi = 0
      for (let k = 0; k < len / 2; k++) {
        const a = i + k, b = i + k + len / 2
        const tr = re[b] * cwr - im[b] * cwi
        const ti = re[b] * cwi + im[b] * cwr
        re[b] = re[a] - tr; im[b] = im[a] - ti
        re[a] += tr; im[a] += ti
        const ncwr = cwr * wr - cwi * wi
        cwi = cwr * wi + cwi * wr
        cwr = ncwr
      }
    }
  }
}

// 能量包络自相关估计速度 (BPM)
function estimateTempo(env, fps) {
  const mean = env.reduce((a, b) => a + b, 0) / (env.length || 1)
  const x = env.map((v) => v - mean)
  const maxLag = Math.floor(fps * 2.0)   // 30 BPM 下限
  const minLag = Math.floor(fps * 0.333) // 180 BPM 上限
  let bestLag = minLag, bestC = -Infinity
  for (let lag = minLag; lag <= maxLag; lag++) {
    let c = 0
    for (let i = lag; i < x.length; i++) c += x[i] * x[i - lag]
    if (c > bestC) { bestC = c; bestLag = lag }
  }
  let bpm = 60 / (bestLag / fps)
  while (bpm > 180) bpm /= 2
  while (bpm < 50) bpm *= 2
  return bpm
}

// 主分析函数: 输入 AudioBuffer, 输出 特征 / VA / 情绪
export async function analyzeAudioBuffer(audioBuffer) {
  const sr = audioBuffer.sampleRate
  const ch0 = audioBuffer.getChannelData(0)
  let data = ch0
  if (audioBuffer.numberOfChannels > 1) {
    const c1 = audioBuffer.getChannelData(1)
    const mix = new Float32Array(ch0.length)
    for (let i = 0; i < ch0.length; i++) mix[i] = (ch0[i] + c1[i]) * 0.5
    data = mix
  }

  // 1) RMS 能量
  let sq = 0
  for (let i = 0; i < data.length; i++) sq += data[i] * data[i]
  const rms = Math.sqrt(sq / data.length)

  // 2) 过零率
  let zc = 0
  for (let i = 1; i < data.length; i++) if ((data[i] >= 0) !== (data[i - 1] >= 0)) zc++
  const zcr = zc / data.length

  // 3) 能量包络 + 逐帧 STFT
  const hop = 512, win = 1024
  const fps = sr / hop
  const env = []
  const chroma = new Float32Array(12)
  let centroidSum = 0, centroidW = 0
  const hw = hann(win)
  const frames = Math.floor((data.length - win) / hop)
  for (let f = 0; f < frames; f++) {
    const off = f * hop
    // 能量包络
    let e = 0
    for (let j = 0; j < win; j++) { const w = data[off + j]; e += w * w }
    env.push(Math.sqrt(e / win))
    // STFT
    const re = new Float32Array(win), im = new Float32Array(win)
    for (let j = 0; j < win; j++) re[j] = data[off + j] * hw[j]
    fft(re, im)
    let mag = 0, fsum = 0
    for (let k = 1; k < win / 2; k++) {
      const m = Math.hypot(re[k], im[k])
      const freq = (k * sr) / win
      mag += m; fsum += freq * m
      // 色度: 频率 -> 最近半音 (音名)
      const midi = Math.round(69 + 12 * Math.log2(freq / 440))
      const pc = ((midi % 12) + 12) % 12
      chroma[pc] += m
    }
    if (mag > 0) { centroidSum += fsum / mag; centroidW++ }
  }
  const centroid = centroidW ? centroidSum / centroidW : 0
  let csum = 0
  for (let i = 0; i < 12; i++) csum += chroma[i]
  for (let i = 0; i < 12; i++) chroma[i] = csum ? chroma[i] / csum : 0

  // 4) 调式判定: 旋转 tonic, 比较大/小调三和弦能量
  let bestMajor = -1, bestMinor = -1
  for (let t = 0; t < 12; t++) {
    const rot = (i) => chroma[(i + t) % 12]
    const maj = rot(0) + rot(4) + rot(7)
    const min = rot(0) + rot(3) + rot(7)
    if (maj > bestMajor) bestMajor = maj
    if (min > bestMinor) bestMinor = min
  }
  const mode = bestMajor >= bestMinor ? 'major' : 'minor'
  const modeScore = mode === 'major' ? bestMajor - bestMinor : bestMinor - bestMajor

  // 5) VA 映射
  const arousal = clamp(0.55 * Math.tanh((estimateTempo(env, fps) - 95) / 45) + 0.45 * Math.tanh((rms - 0.08) / 0.12), -1, 1)
  const brightness = clamp((centroid - 800) / 1500, -1, 1)
  const valence = clamp(0.7 * (mode === 'major' ? 1 : -1) * clamp(modeScore * 4, -1, 1) + 0.3 * brightness, -1, 1)

  const va = [round(valence, 3), round(arousal, 3)]
  return {
    features: {
      rms: round(rms, 4),
      bpm: Math.round(estimateTempo(env, fps)),
      centroid: Math.round(centroid),
      zcr: round(zcr, 4),
      mode,
      modeScore: round(modeScore, 3),
      brightness: round(brightness, 3),
    },
    va,
    emotion: vaToEmotion(va[0], va[1]),
  }
}

// 便捷: 直接分析 URL 指向的音频文件
export async function analyzeAudioUrl(url, audioCtx) {
  const arr = await fetch(url).then((r) => r.arrayBuffer())
  const buf = await audioCtx.decodeAudioData(arr)
  return analyzeAudioBuffer(buf)
}

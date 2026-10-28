<script setup>
import { inject, ref } from 'vue'
import { EMOTIONS } from '../algorithms/emotions'

const recommended = inject('recommended')
const playSong = inject('playSong')
const nowPlaying = inject('nowPlaying')
const useOnline = inject('useOnline')

const expanded = ref(null)

function toggleOnline() {
  useOnline.value = !useOnline.value
}
function toggleExpand(id) {
  expanded.value = expanded.value === id ? null : id
}
</script>

<template>
  <div class="card songs">
    <div class="songs-head">
      <h2 class="card-title">④ 推荐歌曲</h2>
      <label class="online-toggle">
        <input type="checkbox" :checked="useOnline" @change="toggleOnline" />
        包含在线曲库
      </label>
    </div>

    <p v-if="!recommended || recommended.length === 0" class="empty">
      请先识别人脸情绪，系统将在「情绪空间」中为你检索最匹配的歌曲。
    </p>

    <ul class="list">
      <li v-for="(s, i) in recommended" :key="s.id" class="song" :class="{ playing: nowPlaying && nowPlaying.id === s.id }">
        <div class="rank">{{ i + 1 }}</div>
        <img v-if="s.artwork" :src="s.artwork" class="art" alt="art" />
        <div v-else class="art placeholder">🎵</div>
        <div class="info">
          <div class="title">{{ s.title }}</div>
          <div class="artist">{{ s.artist }}</div>
          <div class="meta">
            <span class="badge" :class="s.source">{{ s.source === 'local' ? '本地' : '在线' }}</span>
            <span v-if="EMOTIONS[s.emotion]" class="badge emo" :style="{ background: EMOTIONS[s.emotion].color }">
              {{ EMOTIONS[s.emotion].icon }} {{ EMOTIONS[s.emotion].zh }}
            </span>
            <span class="va">VA({{ s.va[0].toFixed(2) }},{{ s.va[1].toFixed(2) }})</span>
          </div>
          <div class="sim">
            <div class="sim-track"><div class="sim-fill" :style="{ width: s.finalScore + '%' }"></div></div>
            <span class="sim-score">匹配 {{ s.finalScore }}%</span>
          </div>
          <p class="reason">{{ s.reason }}</p>
          <button v-if="s.analyzed" class="link" @click="toggleExpand(s.id)">
            {{ expanded === s.id ? '收起旋律分析' : '查看旋律情绪分析 ▾' }}
          </button>
          <div v-if="expanded === s.id && s.analyzed" class="analysis">
            <span>速度 {{ s.analyzed.features.bpm }} BPM</span>
            <span>调式 {{ s.analyzed.features.mode === 'major' ? '大调' : '小调' }}</span>
            <span>能量 RMS {{ s.analyzed.features.rms }}</span>
            <span>谱质心 {{ s.analyzed.features.centroid }} Hz</span>
            <span>过零率 {{ s.analyzed.features.zcr }}</span>
            <span class="hint">（设计坐标 {{ s.designedVa[0] }},{{ s.designedVa[1] }} → 分析坐标 {{ s.analyzed.va[0] }},{{ s.analyzed.va[1] }}）</span>
          </div>
        </div>
        <button class="play" @click="playSong(s)" :disabled="!s.file">▶</button>
      </li>
    </ul>
  </div>
</template>

<style scoped>
.songs { display: flex; flex-direction: column; gap: 10px; max-height: 78vh; overflow: auto; }
.songs-head { display: flex; justify-content: space-between; align-items: center; }
.online-toggle { font-size: 12px; color: #475067; display: flex; align-items: center; gap: 5px; cursor: pointer; }
.empty { color: #8b93a5; font-size: 13px; padding: 20px 4px; }
.list { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 10px; }
.song { display: grid; grid-template-columns: 26px 46px 1fr 36px; gap: 10px; align-items: center;
  padding: 10px; border: 1px solid #edf0f6; border-radius: 12px; background: #fff; }
.song.playing { border-color: #2b6cff; box-shadow: 0 0 0 2px rgba(43,108,255,0.15); }
.rank { font-weight: 700; color: #9aa3b5; text-align: center; }
.art { width: 46px; height: 46px; border-radius: 8px; object-fit: cover; display: grid; place-items: center; background: #eef1f6; font-size: 20px; }
.info { min-width: 0; }
.title { font-weight: 600; font-size: 14px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.artist { font-size: 12px; color: #7a8294; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.meta { display: flex; flex-wrap: wrap; gap: 5px; margin: 4px 0; align-items: center; }
.badge { font-size: 10px; padding: 1px 6px; border-radius: 6px; color: #fff; }
.badge.local { background: #2b6cff; } .badge.online { background: #f3722c; }
.badge.emo { color: #fff; }
.va { font-size: 10px; color: #8b93a5; }
.sim { display: flex; align-items: center; gap: 6px; margin-top: 3px; }
.sim-track { flex: 1; height: 6px; background: #eef1f6; border-radius: 4px; overflow: hidden; }
.sim-fill { height: 100%; background: linear-gradient(90deg,#2b6cff,#7aa2ff); }
.sim-score { font-size: 11px; color: #2b6cff; font-weight: 600; white-space: nowrap; }
.reason { font-size: 11px; color: #6b7384; margin: 4px 0 0; line-height: 1.4; }
.link { background: none; border: none; color: #2b6cff; font-size: 11px; cursor: pointer; padding: 2px 0; }
.analysis { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 6px; font-size: 11px; color: #475067;
  background: #f6f8fb; padding: 6px 8px; border-radius: 8px; }
.analysis .hint { flex-basis: 100%; color: #8b93a5; }
.play { width: 36px; height: 36px; border-radius: 50%; border: none; background: #2b6cff; color: #fff; cursor: pointer; font-size: 13px; }
.play:disabled { opacity: 0.4; cursor: not-allowed; }
</style>

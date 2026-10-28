<script setup>
import { ref, provide, onMounted, watch, computed } from 'vue'
import FaceCapture from './components/FaceCapture.vue'
import EmotionDisplay from './components/EmotionDisplay.vue'
import SongList from './components/SongList.vue'
import DemoFaces from './components/DemoFaces.vue'
import AlgorithmExplain from './components/AlgorithmExplain.vue'
import { loadModels, detectEmotion, getModelSource } from './algorithms/faceEmotion'
import { analyzeAudioUrl } from './algorithms/melodyEmotion'
import { recommend } from './algorithms/recommender'
import { fetchOnlineSongs } from './data/online'

const detected = ref(null)
const recommended = ref([])
const localSongs = ref([])
const useOnline = ref(true)
const modelsReady = ref(false)
const busy = ref(false)
const error = ref('')
const showAlgo = ref(false)
const status = ref('初始化中…')
const lastTop = ref(null)
const nowPlaying = ref(null)
const audioEl = ref(null)

let audioCtx = null
function getCtx() {
  if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)()
  if (audioCtx.state === 'suspended') audioCtx.resume()
  return audioCtx
}

async function initLocalSongs() {
  try {
    const res = await fetch('songs/manifest.json')
    const manifest = await res.json()
    const ctx = getCtx()
    const list = []
    for (const m of manifest) {
      let va = [m.valence, m.arousal]
      let analyzed = null
      try {
        analyzed = await analyzeAudioUrl(m.file.replace(/^\//, ''), ctx)
        va = analyzed.va
      } catch (e) {
        /* 回退到设计坐标 */
      }
      list.push({ ...m, va, analyzed, designedVa: [m.valence, m.arousal] })
    }
    localSongs.value = list
    status.value = '就绪 · 本地曲库已加载 ' + list.length + ' 首（旋律情绪已分析）'
  } catch (e) {
    status.value = '本地曲库加载失败: ' + e.message
  }
}

async function buildRecommendations(va, withOnline) {
  let pool = localSongs.value.slice()
  if (withOnline && detected.value) {
    try {
      const online = await fetchOnlineSongs(detected.value.top)
      pool = pool.concat(online)
    } catch (e) {
      error.value = '在线曲库不可用，已仅使用本地曲库。'
    }
  }
  recommended.value = recommend(va, pool, 12)
}

async function runFaceDetection(el, opts = {}) {
  if (!el) return
  busy.value = true
  try {
    await loadModels()
    modelsReady.value = true
    const res = await detectEmotion(el)
    if (!res) {
      error.value = '未检测到人脸，请换一张更清晰的照片或调整光线。'
      detected.value = null
      return
    }
    res.expected = opts.expectedEmotion || null
    res.kind = opts.kind || ''
    detected.value = res
    if (opts.live) {
      if (res.top !== lastTop.value) {
        lastTop.value = res.top
        await buildRecommendations(res.va, false)
      }
    } else {
      lastTop.value = res.top
      await buildRecommendations(res.va, useOnline.value)
    }
  } catch (e) {
    error.value = (e && e.message) || String(e)
  } finally {
    busy.value = false
  }
}

function playSong(song) {
  if (!song || !song.file) return
  if (nowPlaying.value && nowPlaying.value.id === song.id) {
    if (audioEl.value.paused) audioEl.value.play().catch(() => {})
    else audioEl.value.pause()
    return
  }
  nowPlaying.value = song
  audioEl.value.src = song.file
  audioEl.value.play().catch(() => {
    error.value = '播放失败，可能是跨域或格式限制。'
  })
}

provide('runFaceDetection', runFaceDetection)
provide('detected', detected)
provide('recommended', recommended)
provide('playSong', playSong)
provide('nowPlaying', nowPlaying)
provide('useOnline', useOnline)

watch(useOnline, (v) => {
  if (detected.value) buildRecommendations(detected.value.va, v)
})

const busyText = computed(() => (busy.value ? '识别中…' : ''))

onMounted(async () => {
  try {
    await loadModels()
    modelsReady.value = true
    status.value = '人脸模型已就绪（来源：' + (getModelSource() === 'cdn' ? 'CDN 兜底' : '本地') + '）'
  } catch (e) {
    status.value = '人脸模型加载失败: ' + e.message
  }
  await initLocalSongs()
})
</script>

<template>
  <div class="app">
    <header class="topbar">
      <div class="brand">
        <span class="logo">🎭</span>
        <div>
          <h1>人脸情绪识别 · 智能歌曲推荐</h1>
          <p class="sub">本地人脸情绪识别 + 旋律情绪分析 + 情绪空间推荐</p>
        </div>
      </div>
      <div class="top-actions">
        <span class="status" :class="{ ok: modelsReady }">{{ status }}{{ busyText }}</span>
        <button class="ghost" @click="showAlgo = true">📖 算法说明</button>
      </div>
    </header>

    <main class="grid">
      <section class="col col-left">
        <FaceCapture />
        <DemoFaces />
      </section>
      <section class="col col-mid">
        <EmotionDisplay />
      </section>
      <section class="col col-right">
        <SongList />
      </section>
    </main>

    <div v-if="error" class="toast" @click="error = ''">{{ error }} &nbsp;✕</div>

    <div class="player-bar" v-show="nowPlaying">
      <span class="np" v-if="nowPlaying">{{ nowPlaying.artist }} — {{ nowPlaying.title }}</span>
      <audio ref="audioEl" controls @ended="nowPlaying = null"></audio>
    </div>

    <AlgorithmExplain v-if="showAlgo" @close="showAlgo = false" />
  </div>
</template>

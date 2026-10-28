<script setup>
import { ref, inject, onBeforeUnmount, watch } from 'vue'

const runFaceDetection = inject('runFaceDetection')

const tabs = [
  { key: 'upload', label: '📷 上传图片' },
  { key: 'video', label: '🎞️ 打开视频' },
  { key: 'camera', label: '📡 实时摄像头' },
  { key: 'photo', label: '📸 拍照' },
]
const mode = ref('upload')
const busy = ref(false)
const error = ref('')
const live = ref(false)

const imageSrc = ref('')
const videoSrc = ref('')
const imgEl = ref(null)
const videoEl = ref(null)
const camEl = ref(null)
const photoCamEl = ref(null)
const photoCanvas = ref(null)

let stream = null
let liveTimer = null

function stopStream() {
  if (stream) {
    stream.getTracks().forEach((t) => t.stop())
    stream = null
  }
}

async function startCam(elRef) {
  try {
    stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' }, audio: false })
    elRef.value.srcObject = stream
    await elRef.value.play()
  } catch (e) {
    error.value = '无法访问摄像头: ' + e.message + '（请允许摄像头权限）'
  }
}

async function switchMode(key) {
  stopStream()
  clearInterval(liveTimer)
  mode.value = key
  error.value = ''
  if (key === 'camera') startCam(camEl)
  if (key === 'photo') startCam(photoCamEl)
}

function onImage(e) {
  const f = e.target.files[0]
  if (!f) return
  imageSrc.value = URL.createObjectURL(f)
}
function onVideo(e) {
  const f = e.target.files[0]
  if (!f) return
  videoSrc.value = URL.createObjectURL(f)
}

async function detectImg() {
  if (!imgEl.value) return
  busy.value = true
  try {
    await runFaceDetection(imgEl.value, { kind: 'image' })
  } catch (e) {
    error.value = e.message
  } finally {
    busy.value = false
  }
}
async function detectVideoFrame() {
  if (!videoEl.value) return
  busy.value = true
  try {
    await runFaceDetection(videoEl.value, { kind: 'video' })
  } catch (e) {
    error.value = e.message
  } finally {
    busy.value = false
  }
}
async function detectCamera() {
  if (!camEl.value) return
  busy.value = true
  try {
    await runFaceDetection(camEl.value, { kind: 'camera' })
  } catch (e) {
    error.value = e.message
  } finally {
    busy.value = false
  }
}
async function takePhoto() {
  const v = photoCamEl.value
  const c = photoCanvas.value
  if (!v || !c) return
  c.width = v.videoWidth
  c.height = v.videoHeight
  c.getContext('2d').drawImage(v, 0, 0)
  busy.value = true
  try {
    await runFaceDetection(c, { kind: 'photo' })
  } catch (e) {
    error.value = e.message
  } finally {
    busy.value = false
  }
}

watch(live, (on) => {
  clearInterval(liveTimer)
  if (on && mode.value === 'camera' && camEl.value) {
    liveTimer = setInterval(() => {
      if (camEl.value && !busy.value) runFaceDetection(camEl.value, { kind: 'camera', live: true }).catch(() => {})
    }, 1300)
  }
})

onBeforeUnmount(() => {
  stopStream()
  clearInterval(liveTimer)
})
</script>

<template>
  <div class="card capture">
    <h2 class="card-title">① 获取人脸</h2>
    <div class="tabs">
      <button v-for="t in tabs" :key="t.key" :class="{ active: mode === t.key }" @click="switchMode(t.key)">
        {{ t.label }}
      </button>
    </div>

    <div class="pane">
      <!-- 上传图片 -->
      <div v-if="mode === 'upload'" class="pane-box">
        <input type="file" accept="image/*" @change="onImage" />
        <img v-if="imageSrc" :src="imageSrc" ref="imgEl" class="preview" alt="preview" />
        <button class="primary" :disabled="!imageSrc || busy" @click="detectImg">识别情绪</button>
      </div>

      <!-- 打开视频 -->
      <div v-else-if="mode === 'video'" class="pane-box">
        <input type="file" accept="video/*" @change="onVideo" />
        <video v-if="videoSrc" :src="videoSrc" ref="videoEl" class="preview" controls></video>
        <button class="primary" :disabled="!videoSrc || busy" @click="detectVideoFrame">识别当前帧</button>
      </div>

      <!-- 实时摄像头 -->
      <div v-else-if="mode === 'camera'" class="pane-box">
        <video ref="camEl" autoplay muted playsinline class="preview"></video>
        <label class="row"><input type="checkbox" v-model="live" /> 实时识别（每 1.3 秒）</label>
        <button class="primary" :disabled="busy" @click="detectCamera">拍照并识别</button>
      </div>

      <!-- 拍照 -->
      <div v-else-if="mode === 'photo'" class="pane-box">
        <video ref="photoCamEl" autoplay muted playsinline class="preview"></video>
        <canvas ref="photoCanvas" class="hidden"></canvas>
        <button class="primary" :disabled="busy" @click="takePhoto">拍照并识别</button>
      </div>
    </div>

    <p v-if="error" class="error">{{ error }}</p>
  </div>
</template>

<style scoped>
.capture { display: flex; flex-direction: column; gap: 12px; }
.tabs { display: flex; flex-wrap: wrap; gap: 6px; }
.tabs button {
  flex: 1 1 auto; padding: 8px 6px; border: 1px solid #d7dce5; background: #f6f8fb;
  border-radius: 8px; cursor: pointer; font-size: 13px; color: #475067;
}
.tabs button.active { background: #2b6cff; color: #fff; border-color: #2b6cff; }
.pane-box { display: flex; flex-direction: column; gap: 10px; align-items: center; }
.preview { width: 100%; max-height: 320px; object-fit: contain; border-radius: 10px; background: #0c1020; }
.hidden { display: none; }
.row { font-size: 13px; color: #475067; display: flex; align-items: center; gap: 6px; }
.primary {
  padding: 10px 18px; border: none; background: #2b6cff; color: #fff; border-radius: 10px;
  cursor: pointer; font-size: 14px; font-weight: 600;
}
.primary:disabled { opacity: 0.5; cursor: not-allowed; }
.error { color: #e2533b; font-size: 13px; }
</style>

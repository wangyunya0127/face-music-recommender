<script setup>
import { inject } from 'vue'
import { EMOTION_KEYS, EMOTIONS } from '../algorithms/emotions'

const runFaceDetection = inject('runFaceDetection')

function pick(key) {
  const img = new Image()
  img.crossOrigin = 'anonymous'
  img.onload = () => runFaceDetection(img, { kind: 'demo', expectedEmotion: key })
  img.src = `faces/${key}.png`
}
</script>

<template>
  <div class="card demo">
    <h2 class="card-title">② 演示人脸（点击直接识别）</h2>
    <p class="hint">已生成 7 张高真实度人脸照片，覆盖全部情绪，便于快速演示。</p>
    <div class="grid">
      <button v-for="k in EMOTION_KEYS" :key="k" class="face-btn" @click="pick(k)">
        <img :src="`faces/${k}.png`" :alt="EMOTIONS[k].zh" />
        <span class="tag" :style="{ background: EMOTIONS[k].color }">{{ EMOTIONS[k].icon }} {{ EMOTIONS[k].zh }}</span>
      </button>
    </div>
  </div>
</template>

<style scoped>
.demo { display: flex; flex-direction: column; gap: 8px; }
.hint { font-size: 12px; color: #7a8294; margin: 0; }
.grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; }
.face-btn {
  position: relative; border: none; padding: 0; background: none; cursor: pointer; border-radius: 10px; overflow: hidden;
  aspect-ratio: 1; transition: transform 0.12s;
}
.face-btn:hover { transform: translateY(-3px); box-shadow: 0 6px 16px rgba(0,0,0,0.18); }
.face-btn img { width: 100%; height: 100%; object-fit: cover; display: block; }
.tag {
  position: absolute; left: 0; right: 0; bottom: 0; color: #fff; font-size: 11px; font-weight: 600;
  padding: 2px 0; text-align: center; text-shadow: 0 1px 2px rgba(0,0,0,0.5);
}
</style>

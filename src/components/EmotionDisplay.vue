<script setup>
import { inject, computed } from 'vue'
import { EMOTIONS, EMOTION_KEYS } from '../algorithms/emotions'

const detected = inject('detected')

const topInfo = computed(() => {
  const d = detected.value
  if (!d) return null
  return { key: d.top, ...EMOTIONS[d.top], score: d.topScore }
})

// 把 (-1..1) 映射到 SVG 坐标 (200x200, y 轴翻转)
function px(v) { return 100 + v * 90 }
function py(a) { return 100 - a * 90 }

const target = computed(() => {
  const d = detected.value
  if (!d) return null
  return { x: px(d.va[0]), y: py(d.va[1]) }
})
</script>

<template>
  <div class="card emotion">
    <h2 class="card-title">③ 识别结果</h2>

    <div v-if="!detected" class="empty">
      <div class="big-icon">🧠</div>
      <p>尚未识别。请上传/拍摄人脸，或点击左侧演示人脸。</p>
    </div>

    <template v-else>
      <div class="top">
        <div class="emoji" :style="{ background: topInfo.color }">{{ topInfo.icon }}</div>
        <div>
          <div class="emo-name">{{ topInfo.zh }} <span class="en">{{ topInfo.en }}</span></div>
          <div class="conf">置信度 {{ (topInfo.score * 100).toFixed(1) }}%</div>
          <div v-if="detected.expected" class="expected">
            演示预期：{{ EMOTIONS[detected.expected].zh }}
            <span :class="detected.expected === detected.top ? 'ok' : 'no'">
              {{ detected.expected === detected.top ? '✓ 命中' : '△ 偏差' }}
            </span>
          </div>
        </div>
      </div>

      <div class="bars">
        <div v-for="k in EMOTION_KEYS" :key="k" class="bar-row">
          <span class="bl">{{ EMOTIONS[k].zh }}</span>
          <div class="track">
            <div class="fill" :style="{ width: (detected.scores[k] * 100).toFixed(1) + '%', background: EMOTIONS[k].color }"></div>
          </div>
          <span class="bv">{{ (detected.scores[k] * 100).toFixed(0) }}%</span>
        </div>
      </div>

      <div class="va">
        <div>
          <div class="va-title">情绪坐标（效价-唤醒度）</div>
          <div class="va-coord">V={{ detected.va[0].toFixed(2) }} · A={{ detected.va[1].toFixed(2) }}</div>
          <p class="va-note">该坐标将作为推荐算法的目标向量，在歌曲情绪空间内检索最匹配曲目。</p>
        </div>
        <svg viewBox="0 0 200 200" class="scatter">
          <line x1="100" y1="8" x2="100" y2="192" stroke="#dfe4ee" />
          <line x1="8" y1="100" x2="192" y2="100" stroke="#dfe4ee" />
          <text x="194" y="104" class="ax">愉悦 +</text>
          <text x="2" y="104" class="ax">消极</text>
          <text x="104" y="14" class="ax">激动 +</text>
          <text x="104" y="196" class="ax">平静</text>
          <circle
            v-for="k in EMOTION_KEYS" :key="k"
            :cx="px(EMOTIONS[k].va[0])" :cy="py(EMOTIONS[k].va[1])" r="4"
            :fill="EMOTIONS[k].color" opacity="0.55" />
          <circle v-if="target" :cx="target.x" :cy="target.y" r="7" fill="none" stroke="#2b6cff" stroke-width="3" />
        </svg>
      </div>
    </template>
  </div>
</template>

<style scoped>
.emotion { display: flex; flex-direction: column; gap: 14px; }
.empty { text-align: center; color: #8b93a5; padding: 30px 10px; }
.big-icon { font-size: 46px; }
.top { display: flex; gap: 14px; align-items: center; }
.emoji { width: 64px; height: 64px; border-radius: 16px; display: grid; place-items: center; font-size: 34px; }
.emo-name { font-size: 22px; font-weight: 700; }
.en { font-size: 13px; color: #8b93a5; font-weight: 400; }
.conf { font-size: 13px; color: #5a6377; }
.expected { font-size: 12px; color: #475067; margin-top: 2px; }
.expected .ok { color: #1f9d55; } .expected .no { color: #e2533b; }
.bars { display: flex; flex-direction: column; gap: 6px; }
.bar-row { display: grid; grid-template-columns: 42px 1fr 38px; align-items: center; gap: 8px; font-size: 12px; }
.bl { color: #475067; }
.track { height: 10px; background: #eef1f6; border-radius: 6px; overflow: hidden; }
.fill { height: 100%; border-radius: 6px; transition: width 0.3s; }
.bv { text-align: right; color: #5a6377; }
.va { display: flex; gap: 10px; align-items: center; justify-content: space-between; flex-wrap: wrap; }
.va-title { font-weight: 600; }
.va-coord { color: #2b6cff; font-weight: 600; }
.va-note { font-size: 12px; color: #8b93a5; max-width: 220px; margin: 4px 0 0; }
.scatter { width: 150px; height: 150px; background: #f8fafd; border-radius: 10px; }
.ax { font-size: 9px; fill: #9aa3b5; }
</style>

// ============================================================
// 算法一: 人脸情绪识别 (本地 / 端上推理)
// ------------------------------------------------------------
// 方法: face-api.js = TensorFlow.js 轻量封装
//   · 人脸检测: Tiny Face Detector (SSD 风格的单阶段检测器,
//              输入 224x224, 基于 MobileNet 主干, 速度快、精度高)
//   · 表情分类: FaceExpressionNet (小型 CNN, 7 分类 softmax)
// 特点: 模型权重随站点的 /models 目录下发, 全部推理在浏览器本地完成,
//       不上传任何图像, 满足"本地算法 + 经典高效"的要求。
// 输出: 7 类表情置信度 + 由置信度加权融合得到的目标情绪坐标 (VA)。
// ============================================================
import { EMOTIONS } from './emotions'
import { clamp } from './utils'

const MODEL_URL = 'models' // 相对路径, 适配根目录或子路径部署
// CDN 兜底: 当本地权重因部署环境(子路径/静态托管)无法加载时回退,
// 推理仍全部在浏览器本地完成, 图像绝不外传。
const MODEL_URL_CDN = 'https://cdn.jsdelivr.net/gh/justadudewhohacks/face-api.js@v0.22.2/weights'
let modelsReady = false
let modelSource = 'local' // 'local' | 'cdn'

async function tryLoadFrom(faceapi, url) {
  await faceapi.nets.tinyFaceDetector.loadFromUri(url)
  await faceapi.nets.faceExpressionNet.loadFromUri(url)
}

export async function loadModels() {
  const faceapi = window.faceapi
  if (!faceapi) throw new Error('face-api.js 尚未加载 (请检查网络/CDN)')
  if (modelsReady) return
  try {
    await tryLoadFrom(faceapi, MODEL_URL)
    modelSource = 'local'
  } catch (err) {
    console.warn('[faceEmotion] 本地模型加载失败, 回退 CDN:', err?.message || err)
    await tryLoadFrom(faceapi, MODEL_URL_CDN) // 抛错则向上传播
    modelSource = 'cdn'
  }
  modelsReady = true
}

export function getModelSource() {
  return modelSource
}

// 对 <img> / <video> / <canvas> 进行单人脸表情识别
export async function detectEmotion(input) {
  const faceapi = window.faceapi
  const detection = await faceapi
    .detectSingleFace(
      input,
      new faceapi.TinyFaceDetectorOptions({ inputSize: 224, scoreThreshold: 0.4 })
    )
    .withFaceExpressions()

  if (!detection) return null

  const e = detection.expressions
  // face-api 的 7 类与 EMOTIONS 键名完全一致
  const scores = {
    neutral: e.neutral, happy: e.happy, sad: e.sad, angry: e.angry,
    fearful: e.fearful, disgusted: e.disgusted, surprised: e.surprised,
  }

  // 关键信息融合: 用 7 类置信度对各自情绪坐标做加权平均, 得到平滑的 VA 目标点
  let v = 0, a = 0, sum = 0
  for (const k in scores) {
    v += EMOTIONS[k].va[0] * scores[k]
    a += EMOTIONS[k].va[1] * scores[k]
    sum += scores[k]
  }
  v = sum ? v / sum : 0
  a = sum ? a / sum : 0

  // 取最高置信度类别作为主情绪
  let top = 'neutral', topScore = -1
  for (const k in scores) {
    if (scores[k] > topScore) { topScore = scores[k]; top = k }
  }

  return {
    scores,
    top,
    topScore,
    va: [clamp(v, -1, 1), clamp(a, -1, 1)],
    box: detection.detection?.box || null,
  }
}

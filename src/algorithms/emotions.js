// ============================================================
// 情绪统一模型 (Russell 效价-唤醒度环形模型, Valence-Arousal)
// 七类情绪, 与 face-api.js 的表情类别一一对应。
//   va[0] = 效价 valence  (-1 消极 .. +1 积极)
//   va[1] = 唤醒度 arousal (-1 平静 .. +1 激动)
// ============================================================
export const EMOTIONS = {
  neutral:   { zh: '平静', en: 'Neutral',   va: [ 0.00,  0.00], color: '#9aa0a6', icon: '😐' },
  happy:     { zh: '快乐', en: 'Happy',     va: [ 0.82,  0.70], color: '#f9c74f', icon: '😄' },
  sad:       { zh: '悲伤', en: 'Sad',       va: [-0.72, -0.32], color: '#577590', icon: '😢' },
  angry:     { zh: '愤怒', en: 'Angry',     va: [-0.45,  0.85], color: '#e63946', icon: '😠' },
  fearful:   { zh: '恐惧', en: 'Fearful',   va: [-0.38,  0.42], color: '#7209b7', icon: '😨' },
  surprised: { zh: '惊喜', en: 'Surprised', va: [ 0.30,  0.82], color: '#f3722c', icon: '😲' },
  disgusted: { zh: '厌恶', en: 'Disgusted', va: [-0.60,  0.10], color: '#43aa8b', icon: '🤢' },
}
export const EMOTION_KEYS = Object.keys(EMOTIONS)

// 由 (效价, 唤醒度) 反查最接近的情绪标签 —— 最近质心分类器 (经典 KNN 单近邻)
export function vaToEmotion(v, a) {
  let best = 'neutral', bestD = Infinity
  for (const k of EMOTION_KEYS) {
    const [ev, ea] = EMOTIONS[k].va
    const d = (ev - v) ** 2 + (ea - a) ** 2
    if (d < bestD) { bestD = d; best = k }
  }
  return best
}

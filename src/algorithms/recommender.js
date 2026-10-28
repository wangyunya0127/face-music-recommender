// ============================================================
// 算法三: 推荐策略 (内容过滤 + 情绪空间距离排序)
// ------------------------------------------------------------
// 将"人脸情绪坐标 VA"作为用户需求向量, 在"歌曲情绪坐标 VA"空间中,
// 用欧氏距离衡量匹配程度, 以高斯核转换为 0~100 相似度得分并排序。
//   · 策略: 内容过滤 (Content-based Filtering)
//   · 度量: 效价-唤醒度二维欧氏距离 + 最近质心情绪标签命中加成
//   · 高效: 单次向量距离计算 O(1), 整体 O(N), 适合海量曲库
//   · 可解释: 为每首歌生成"目标坐标 vs 歌曲坐标"的文字理由
// ============================================================
import { EMOTIONS, vaToEmotion } from './emotions'
import { clamp } from './utils'

// 每种情绪对应的在线曲库搜索词 (iTunes Search API)
export const ONLINE_QUERY = {
  happy: 'happy upbeat pop',
  sad: 'sad piano ballad',
  angry: 'rock metal',
  fearful: 'dark ambient',
  surprised: 'energetic dance',
  disgusted: 'grunge alternative',
  neutral: 'lofi chill',
}

// 主推荐函数
export function recommend(targetVA, songs, topN = 10) {
  const [tv, ta] = targetVA
  const scored = songs.map((s) => {
    const [sv, sa] = s.va || [0, 0]
    const dist = Math.sqrt((tv - sv) ** 2 + (ta - sa) ** 2)
    // 高斯核: 距离越小得分越高
    const score = Math.round(100 * Math.exp(-dist))
    // 最近质心情绪标签命中 -> 额外加成 (top-N 稳定性)
    const labelHit = s.emotion === vaToEmotion(tv, ta)
    const finalScore = Math.min(100, score + (labelHit ? 6 : 0))
    return {
      ...s,
      dist: +dist.toFixed(3),
      score,
      finalScore,
      reason: buildReason(targetVA, s, dist),
    }
  })
  scored.sort((a, b) => b.finalScore - a.finalScore)
  return scored.slice(0, topN)
}

function buildReason(targetVA, s, dist) {
  const [tv, ta] = targetVA
  const [sv, sa] = s.va || [0, 0]
  const av = sv >= tv ? '更高' : '更低'
  const aa = sa >= ta ? '更高' : '更低'
  const tag = s.emotion ? `判定为「${EMOTIONS[s.emotion]?.zh || s.emotion}」` : ''
  return `你的情绪坐标(${tv.toFixed(2)}, ${ta.toFixed(2)}) 与歌曲(${sv.toFixed(2)}, ${sa.toFixed(2)}) 距离 ${dist.toFixed(2)}；该曲愉悦度${av}、唤醒度${aa}。${tag}`
}

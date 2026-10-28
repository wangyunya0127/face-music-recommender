// ============================================================
// 在线歌曲接口: iTunes Search API
// ------------------------------------------------------------
// 免费、无需密钥、支持浏览器跨域(CORS), 返回 30 秒预览音频(previewUrl)。
// 用情绪关键词检索, 得到候选曲目; 其情绪坐标由"情绪标签 -> 目标坐标
// + 轻微抖动"推断 (元数据内容过滤), 与本地歌曲统一进入推荐空间。
// ============================================================
import { ONLINE_QUERY } from '../algorithms/recommender'
import { EMOTIONS } from '../algorithms/emotions'
import { clamp } from '../algorithms/utils'

export async function fetchOnlineSongs(emotion, limit = 12) {
  const term = ONLINE_QUERY[emotion] || 'music'
  const url =
    'https://itunes.apple.com/search?term=' +
    encodeURIComponent(term) +
    '&media=music&limit=' + limit + '&country=CN'
  const res = await fetch(url)
  if (!res.ok) throw new Error('在线曲库请求失败: ' + res.status)
  const json = await res.json()
  const tva = EMOTIONS[emotion].va
  return (json.results || [])
    .filter((r) => r.previewUrl) // 仅保留可播放预览的曲目
    .map((r, i) => ({
      id: 'online-' + (r.trackId || i),
      title: r.trackName || '未知曲目',
      artist: r.artistName || '未知艺人',
      file: r.previewUrl,
      artwork: r.artworkUrl100 || '',
      source: 'online',
      emotion,
      // 元数据推断: 以情绪目标坐标 + 轻微抖动体现"按情绪内容过滤"
      va: [
        clamp(tva[0] + ((i % 3) - 1) * 0.05, -1, 1),
        clamp(tva[1] + (i % 2 ? 0.04 : -0.04), -1, 1),
      ],
      desc: `在线曲库 · 关键词「${term}」`,
    }))
}

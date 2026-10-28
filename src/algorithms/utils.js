// 通用数值工具
export const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v))
export const round = (v, n = 2) => {
  const p = 10 ** n
  return Math.round(v * p) / p
}

/**
 * ATR(14) 计算工具
 * @param {Array} klines - K线数据 [{high, low, close, prevClose}, ...]
 * @param {number} period - 周期，默认 14
 */
export function calcATR(klines, period = 14) {
  if (!klines || klines.length < period + 1) return null
  const trs = klines.map((k, i) => {
    if (i === 0) return k.high - k.low
    return Math.max(k.high - k.low, Math.abs(k.high - k.prevClose), Math.abs(k.low - k.prevClose))
  })
  // 简单移动平均
  const recent = trs.slice(-period)
  return recent.reduce((s, v) => s + v, 0) / period
}

/**
 * 计算简单移动平均
 */
export function calcMA(values, period) {
  if (!values || values.length < period) return null
  const recent = values.slice(-period)
  return recent.reduce((s, v) => s + v, 0) / period
}

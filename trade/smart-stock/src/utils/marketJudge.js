/**
 * 市场状态判定（对应交易系统 2.2 节）
 * 六维判定：均线排列、价格位置、创新高/新低、涨跌家数、成交额、北向资金
 */

/**
 * 判定均线排列状态
 */
export function judgeMASystem(ma20, ma60, ma120) {
  if (ma20 > ma60 && ma60 > ma120) return 'bull'
  if (ma20 < ma60 && ma60 < ma120) return 'bear'
  return 'neutral'
}

/**
 * 判定价格与MA60关系
 */
export function judgePriceVsMA(price, ma60, ma60Prev) {
  const above = price > ma60
  const turning = ma60 > ma60Prev
  if (above && turning) return 'bull'
  if (!above && !turning) return 'bear'
  return 'neutral'
}

/**
 * 判定创新高/新低
 */
export function judgeNewHighs(highCount, lowCount) {
  if (highCount > lowCount * 2) return 'bull'
  if (lowCount > highCount * 2) return 'bear'
  return 'neutral'
}

/**
 * 判定涨跌家数
 */
export function judgeBreadth(upCount, downCount) {
  if (upCount / downCount > 2) return 'bull'
  if (downCount / upCount > 2) return 'bear'
  return 'neutral'
}

/**
 * 判定北向资金
 */
export function judgeNorthbound(netFlows) {
  // netFlows: 最近5日净流入数组
  const positive = netFlows.filter(v => v > 0).length
  if (positive >= 4) return 'bull'
  if (positive <= 1) return 'bear'
  return 'neutral'
}

/**
 * 综合判定市场状态
 * @param {object} data - 六维数据
 * @returns {object} 判定结果
 */
export function judgeMarket(data) {
  const signals = [
    judgeMASystem(data.ma20, data.ma60, data.ma120),
    judgePriceVsMA(data.price, data.ma60, data.ma60Prev),
    judgeNewHighs(data.newHighs, data.newLows),
    judgeBreadth(data.upCount, data.downCount),
    data.volumeTrend || 'neutral',
    judgeNorthbound(data.northbound5d || [0]),
  ]

  const bull = signals.filter(s => s === 'bull').length
  const bear = signals.filter(s => s === 'bear').length
  const neutral = signals.filter(s => s === 'neutral').length

  let status, maxPosition, strategy

  if (bull >= 4) {
    status = 'bull'
    maxPosition = '80-100%'
    strategy = '趋势突破'
  } else if (bull >= 3) {
    status = 'bull-lean'
    maxPosition = '50-70%'
    strategy = '回调买入 / 趋势突破'
  } else if (bear >= 4) {
    status = 'bear'
    maxPosition = '0-20%'
    strategy = '空仓观望'
  } else if (bear >= 3) {
    status = 'bear-lean'
    maxPosition = '20-40%'
    strategy = '高股息防御'
  } else {
    status = 'neutral'
    maxPosition = '50-70%'
    strategy = '回调买入'
  }

  const labels = { bull: '牛市', 'bull-lean': '震荡偏多', neutral: '震荡', 'bear-lean': '震荡偏空', bear: '熊市' }
  const tags = { bull: 'tag-bull', 'bull-lean': 'tag-bull', neutral: 'tag-neutral', 'bear-lean': 'tag-bear', bear: 'tag-bear' }

  return {
    status,
    label: labels[status],
    tag: tags[status],
    maxPosition,
    strategy,
    signals,
    score: { bull, bear, neutral },
    confirmed: bull >= 3 || bear >= 3,
  }
}

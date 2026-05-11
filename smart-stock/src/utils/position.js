/**
 * 仓位计算（对应交易系统 6.3 节）
 * @param {number} totalCapital - 总资金
 * @param {number} buyPrice - 买入价
 * @param {number} atr - ATR(14) 值
 * @param {number} n - 策略乘数 (1.5 / 2.0 / 3.0)
 */
export function calcPosition(totalCapital, buyPrice, atr, n) {
  const stopDistance = n * atr
  const stopPrice = buyPrice - stopDistance
  const stopPct = stopDistance / buyPrice

  const riskBudget = totalCapital * 0.02
  const maxAllowed = totalCapital * 0.25
  const posByRisk = riskBudget / stopPct
  const position = Math.min(posByRisk, maxAllowed)
  const positionPct = position / totalCapital * 100

  return { stopPrice, stopDistance, stopPct, position, positionPct, posByRisk, maxAllowed }
}

/**
 * 盈亏比计算（对应交易系统 4.5 节）
 * @param {number} buyPrice - 买入价
 * @param {number} targetPrice - 目标价
 * @param {number} stopDistance - 止损空间
 */
export function calcRiskReward(buyPrice, targetPrice, stopDistance) {
  const reward = targetPrice - buyPrice
  const ratio = reward / stopDistance
  return { reward, ratio }
}

/**
 * 跟踪止盈初始价
 * @param {number} buyPrice - 买入价
 * @param {number} callbackPct - 回撤比例 (0.08 / 0.15 / 0.20)
 */
export function calcTrailingStop(buyPrice, callbackPct) {
  return buyPrice * (1 - callbackPct)
}

/**
 * 策略参数
 */
export const STRATEGY_PARAMS = {
  'trend': { name: '趋势突破', n: 1.5, callback: 0.08, holdDays: '1-4周' },
  'pullback': { name: '回调买入', n: 2.0, callback: 0.15, holdDays: '2-8周' },
  'bottom': { name: '底部右侧确认', n: 3.0, callback: 0.20, holdDays: '1-6月' },
}

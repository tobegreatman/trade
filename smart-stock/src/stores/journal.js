import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export const useJournalStore = defineStore('journal', () => {
  const trades = ref(JSON.parse(localStorage.getItem('journal_trades') || '[]'))

  function save() {
    localStorage.setItem('journal_trades', JSON.stringify(trades.value))
  }

  function addTrade(t) {
    trades.value.push({
      id: Date.now(),
      code: t.code,
      name: t.name,
      strategy: t.strategy,
      strategyName: t.strategyName,
      buyPrice: +t.buyPrice,
      quantity: +t.quantity,
      stopPrice: +t.stopPrice,
      targetPrice: +t.targetPrice,
      atr: +t.atr || 0,
      atrN: +t.atrN || 0,
      marketRegime: t.marketRegime || '',
      industry: t.industry || '',
      date: t.date || new Date().toISOString().slice(0, 10),
      checklist: t.checklist || [],
      status: 'open',
      sellPrice: null,
      sellDate: null,
      sellReason: null,
      pnl: null,
      pnlPct: null,
      actualRR: null,
      emotion: null,
      executionScore: null,
      violations: [],
      issues: [],
      reviewNotes: '',
    })
    save()
  }

  function updateTrade(id, updates) {
    const t = trades.value.find(t => t.id === id)
    if (t) Object.assign(t, updates)
    save()
  }

  function deleteTrade(id) {
    trades.value = trades.value.filter(t => t.id !== id)
    save()
  }

  function closeTrade(id, data) {
    const t = trades.value.find(t => t.id === id)
    if (!t) return
    const sellPrice = +data.sellPrice
    const buyPrice = t.buyPrice
    const pnl = (sellPrice - buyPrice) * t.quantity
    const pnlPct = ((sellPrice - buyPrice) / buyPrice) * 100
    const stopDist = buyPrice - t.stopPrice
    const actualRR = stopDist > 0 ? (sellPrice - buyPrice) / stopDist : 0
    Object.assign(t, {
      status: 'closed',
      sellPrice,
      sellDate: data.sellDate || new Date().toISOString().slice(0, 10),
      sellReason: data.sellReason,
      pnl,
      pnlPct,
      actualRR,
      emotion: data.emotion,
      executionScore: data.executionScore,
      violations: data.violations || [],
      issues: data.issues || [],
      reviewNotes: data.reviewNotes || '',
    })
    save()
  }

  async function fetchATR(code) {
    try {
      const res = await fetch(`/api/stock/${code}/kline`).then(r => r.json())
      if (!res.ok || !res.data?.length) return null
      const klines = res.data.slice(-15)
      const trs = klines.slice(1).map((k, i) => {
        const prev = klines[i]
        return Math.max(k.high - k.low, Math.abs(k.high - prev.close), Math.abs(k.low - prev.close))
      })
      const atr = trs.reduce((s, v) => s + v, 0) / trs.length
      return atr
    } catch {
      return null
    }
  }

  // Computed
  const openTrades = computed(() => trades.value.filter(t => t.status === 'open'))
  const closedTrades = computed(() => trades.value.filter(t => t.status === 'closed'))

  const winRate = computed(() => {
    const closed = closedTrades.value
    if (!closed.length) return 0
    return closed.filter(t => t.pnl > 0).length / closed.length * 100
  })

  const profitFactor = computed(() => {
    const closed = closedTrades.value
    const totalProfit = closed.filter(t => t.pnl > 0).reduce((s, t) => s + t.pnl, 0)
    const totalLoss = Math.abs(closed.filter(t => t.pnl < 0).reduce((s, t) => s + t.pnl, 0))
    return totalLoss > 0 ? totalProfit / totalLoss : totalProfit > 0 ? Infinity : 0
  })

  const avgWin = computed(() => {
    const wins = closedTrades.value.filter(t => t.pnl > 0)
    if (!wins.length) return 0
    return wins.reduce((s, t) => s + t.pnlPct, 0) / wins.length
  })

  const avgLoss = computed(() => {
    const losses = closedTrades.value.filter(t => t.pnl < 0)
    if (!losses.length) return 0
    return losses.reduce((s, t) => s + t.pnlPct, 0) / losses.length
  })

  const totalPnl = computed(() => closedTrades.value.reduce((s, t) => s + (t.pnl || 0), 0))

  const monthlyPnl = computed(() => {
    const map = {}
    for (const t of closedTrades.value) {
      const month = (t.sellDate || '').slice(0, 7)
      if (!month) continue
      map[month] = (map[month] || 0) + (t.pnl || 0)
    }
    return Object.entries(map).sort(([a], [b]) => a.localeCompare(b)).map(([month, pnl]) => ({ month, pnl }))
  })

  const strategyBreakdown = computed(() => {
    const map = {}
    for (const t of closedTrades.value) {
      const key = t.strategy || 'other'
      if (!map[key]) map[key] = { strategy: key, name: t.strategyName || key, count: 0, wins: 0, totalPnl: 0 }
      map[key].count++
      if (t.pnl > 0) map[key].wins++
      map[key].totalPnl += t.pnl || 0
    }
    return Object.values(map)
  })

  const consecutiveStops = computed(() => {
    let count = 0
    for (let i = trades.value.length - 1; i >= 0; i--) {
      const t = trades.value[i]
      if (t.status !== 'closed') continue
      if (t.pnl < 0) count++
      else break
    }
    return count
  })

  const systemWarning = computed(() => consecutiveStops.value >= 5)

  return {
    trades, openTrades, closedTrades,
    winRate, profitFactor, avgWin, avgLoss, totalPnl,
    monthlyPnl, strategyBreakdown, consecutiveStops, systemWarning,
    save, addTrade, updateTrade, deleteTrade, closeTrade, fetchATR,
  }
})

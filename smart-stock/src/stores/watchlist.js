import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useWatchlistStore = defineStore('watchlist', () => {
  const stocks = ref(JSON.parse(localStorage.getItem('watchlist') || '[]'))
  const quotes = ref({})
  const klineCache = ref({})
  const loading = ref(false)

  function save() {
    localStorage.setItem('watchlist', JSON.stringify(stocks.value))
  }

  function addStock(code, name) {
    if (stocks.value.find(s => s.code === code)) return
    stocks.value.push({ code, name, addedAt: Date.now() })
    save()
  }

  function removeStock(code) {
    stocks.value = stocks.value.filter(s => s.code !== code)
    delete quotes.value[code]
    delete klineCache.value[code]
    save()
  }

  function reorder(fromIdx, toIdx) {
    const [item] = stocks.value.splice(fromIdx, 1)
    stocks.value.splice(toIdx, 0, item)
    save()
  }

  async function fetchQuotes() {
    if (!stocks.value.length) return
    loading.value = true
    try {
      const codes = stocks.value.map(s => s.code).join(',')
      const res = await fetch(`/api/stock/batch/quotes?codes=${codes}`).then(r => r.json())
      if (res.ok) {
        quotes.value = res.data
        for (const [code, q] of Object.entries(res.data)) {
          const s = stocks.value.find(s => s.code === code)
          if (s) s.name = q.name
        }
        save()
      }
    } catch { /* ignore */ }
    finally { loading.value = false }
  }

  async function fetchKline(code) {
    if (klineCache.value[code]) return klineCache.value[code]
    try {
      const res = await fetch(`/api/stock/${code}/kline`).then(r => r.json())
      if (res.ok) {
        klineCache.value[code] = res.data
        return res.data
      }
    } catch { /* ignore */ }
    return null
  }

  return { stocks, quotes, klineCache, loading, addStock, removeStock, reorder, fetchQuotes, fetchKline, save }
})

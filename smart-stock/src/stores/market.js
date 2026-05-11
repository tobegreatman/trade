import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useMarketStore = defineStore('market', () => {
  const indices = ref(null)
  const breadth = ref(null)
  const northbound = ref(null)
  const loading = ref(false)
  const lastUpdate = ref(null)

  async function fetchAll() {
    loading.value = true
    try {
      const [idx, brd, nb] = await Promise.all([
        fetch('/api/market/indices').then(r => r.json()),
        fetch('/api/market/breadth').then(r => r.json()),
        fetch('/api/market/northbound').then(r => r.json()),
      ])
      if (idx.ok) indices.value = idx.data
      if (brd.ok) breadth.value = brd.data
      if (nb.ok) northbound.value = nb.data
      lastUpdate.value = new Date().toLocaleTimeString()
    } catch (e) {
      console.error('Fetch market data failed:', e)
    } finally {
      loading.value = false
    }
  }

  return { indices, breadth, northbound, loading, lastUpdate, fetchAll }
})

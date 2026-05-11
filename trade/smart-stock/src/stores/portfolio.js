import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export const usePortfolioStore = defineStore('portfolio', () => {
  const holdings = ref(JSON.parse(localStorage.getItem('holdings') || '[]'))
  const totalCapital = ref(JSON.parse(localStorage.getItem('totalCapital') || '1000000'))

  function save() {
    localStorage.setItem('holdings', JSON.stringify(holdings.value))
    localStorage.setItem('totalCapital', JSON.stringify(totalCapital.value))
  }

  function addHolding(h) {
    holdings.value.push({ ...h, id: Date.now(), date: new Date().toISOString().slice(0, 10), trailingStop: h.stopPrice })
    save()
  }

  function removeHolding(id) {
    holdings.value = holdings.value.filter(h => h.id !== id)
    save()
  }

  function updateHolding(id, updates) {
    const idx = holdings.value.findIndex(h => h.id === id)
    if (idx >= 0) { Object.assign(holdings.value[idx], updates); save() }
  }

  const totalPosition = computed(() => holdings.value.reduce((s, h) => s + h.position, 0))
  const positionPct = computed(() => ((totalPosition.value / totalCapital.value) * 100).toFixed(1))

  return { holdings, totalCapital, totalPosition, positionPct, addHolding, removeHolding, updateHolding, save }
})

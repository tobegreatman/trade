<template>
  <div class="watchlist-page">
    <!-- Index intraday bar (full width, top) -->
    <div class="wl-index-bar" v-if="indexData">
      <div class="wl-index-card" v-for="idx in indexList" :key="idx.code">
        <div class="wl-index-head">
          <span class="wl-index-name">{{ idx.name }}</span>
          <span class="wl-index-change" :class="idx.changeClass">{{ idx.changeStr }}</span>
          <span class="wl-index-price" :class="idx.changeClass">{{ idx.price }}</span>
        </div>
        <Sparkline
          v-if="idx.trends.length"
          :data="idx.trends"
          :positive="idx.positive"
          :height="68"
          :ref-price="idx.preClose"
          :show-area="true"
          :auto-width="true"
        />
      </div>
    </div>

    <!-- Body row -->
    <div class="wl-body">
    <!-- Sidebar -->
    <aside class="wl-sidebar">
      <div class="wl-sidebar-header">
        <h1 class="wl-title">股市 <span class="wl-date">({{ todayStr }})</span></h1>
      </div>

      <!-- Search -->
      <div class="wl-search-area">
        <div class="wl-search-wrap">
          <svg class="wl-search-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
          <input
            v-model="searchCode"
            class="wl-search"
            type="text"
            placeholder="搜索名称或代码"
            @input="onSearchInput"
            @focus="showDropdown = true"
            @blur="onSearchBlur"
            @keyup.enter="addStock"
          />
          <Transition name="fade">
            <button v-if="searchCode" class="wl-search-clear" @click="searchCode = ''; suggestions = []">
              <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="12" r="10" fill="#636366"/><line x1="15" y1="9" x2="9" y2="15" stroke="#fff" stroke-width="2.5" stroke-linecap="round"/><line x1="9" y1="9" x2="15" y2="15" stroke="#fff" stroke-width="2.5" stroke-linecap="round"/></svg>
            </button>
          </Transition>
        </div>
        <!-- Suggestions dropdown -->
        <Transition name="dropdown">
          <div v-if="showDropdown && suggestions.length" class="wl-suggestions">
            <div
              v-for="s in suggestions"
              :key="s.code"
              class="wl-suggest-item"
              @mousedown.prevent="selectSuggestion(s)"
            >
              <span class="wl-suggest-name">{{ s.name }}</span>
              <span class="wl-suggest-code">{{ s.code }} · {{ s.type }}</span>
            </div>
          </div>
        </Transition>
      </div>

      <!-- Watchlist section -->
      <div class="wl-sidebar-section">
        <div class="wl-section-head">
          <span class="wl-section-title">自选股</span>
          <span class="wl-count">{{ store.stocks.length }}</span>
          <button class="wl-refresh-btn" @click="refreshAll" :disabled="store.loading" title="刷新">
            <svg :class="{ spinning: store.loading }" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 2v6h-6"/><path d="M3 12a9 9 0 0 1 15-6.7L21 8"/><path d="M3 22v-6h6"/><path d="M21 12a9 9 0 0 1-15 6.7L3 16"/></svg>
          </button>
        </div>
      </div>

      <!-- Stock list -->
      <div class="wl-list" v-if="store.stocks.length">
        <TransitionGroup name="stock-list" tag="div">
          <div
            v-for="stock in store.stocks"
            :key="stock.code"
            class="wl-stock-item"
            :class="{ active: expandedCode === stock.code }"
            @click="toggleExpand(stock.code)"
          >
            <div class="wl-stock-info">
              <span class="wl-stock-name">{{ stock.name || stock.code }}</span>
              <span class="wl-stock-code">{{ stock.code }}</span>
            </div>
            <div class="wl-stock-chart">
              <Sparkline
                v-if="getMiniData(stock.code)"
                :data="getMiniData(stock.code)"
                :positive="isPositive(stock.code)"
                :width="52"
                :height="24"
                :ref-price="intradayCache[stock.code]?.preClose || undefined"
              />
            </div>
            <div class="wl-stock-nums">
              <span class="wl-stock-price">{{ formatPrice(stock.code) }}</span>
              <span class="wl-stock-change" :class="changeClass(stock.code)">{{ formatChange(stock.code) }}</span>
            </div>
          </div>
        </TransitionGroup>
      </div>

      <!-- Empty -->
      <div v-else class="wl-empty">
        <p>输入股票代码添加自选</p>
      </div>

      <div class="wl-sidebar-footer" v-if="lastUpdate">
        <span>更新 {{ lastUpdate }}</span>
      </div>
    </aside>

    <!-- Main content -->
    <main class="wl-main">
      <!-- Placeholder -->
      <div v-if="!expandedCode" class="wl-main-placeholder">
        <svg v-if="store.stocks.length" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width=".8" opacity=".15">
          <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
        </svg>
        <svg v-else width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width=".8" opacity=".15">
          <circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>
        </svg>
        <p>{{ store.stocks.length ? '选择一只股票查看详情' : '添加自选股开始使用' }}</p>
      </div>

      <!-- Detail -->
      <Transition name="slide-detail" mode="out-in">
        <div v-if="expandedCode && expandedStock" class="wl-detail" :key="expandedCode">
          <!-- Header -->
          <div class="wl-detail-head">
            <div class="wl-detail-identity">
              <h2 class="wl-detail-name">{{ expandedStock.name || expandedStock.code }}</h2>
              <span class="wl-detail-code">{{ expandedStock.code }}</span>
            </div>
            <div class="wl-detail-price-block">
              <span class="wl-detail-price">{{ formatPrice(expandedCode) }}</span>
              <div class="wl-detail-change-row">
                <span class="wl-detail-change" :class="changeClass(expandedCode)">{{ formatChangeAmt(expandedCode) }}</span>
                <span class="wl-detail-change" :class="changeClass(expandedCode)">({{ formatChange(expandedCode) }})</span>
              </div>
            </div>
          </div>

          <!-- Chart -->
          <div class="wl-detail-chart-wrap">
            <Sparkline
              v-if="filteredKline.length"
              :data="filteredKline"
              :positive="isPositive(expandedCode)"
              :height="220"
              :show-area="true"
              :ref-price="period === '1d' ? intradayPreClose : undefined"
              :auto-width="true"
            />
            <div v-else class="wl-chart-loading">加载中...</div>
          </div>

          <!-- Period tabs -->
          <div class="wl-period-tabs">
            <button
              v-for="p in periods"
              :key="p.key"
              class="wl-period-tab"
              :class="{ active: period === p.key }"
              @click="period = p.key"
            >{{ p.label }}</button>
          </div>

          <!-- Stats grid (2-column, label/value) -->
          <div class="wl-stats-grid">
            <div class="wl-stats-row">
              <div class="wl-stats-cell">
                <span class="wl-stats-label">日内波幅</span>
                <span class="wl-stats-val">{{ dayRange }}</span>
              </div>
              <div class="wl-stats-divider"></div>
              <div class="wl-stats-cell">
                <span class="wl-stats-label">总市值</span>
                <span class="wl-stats-val">{{ marketCap }}</span>
              </div>
            </div>
            <div class="wl-stats-row">
              <div class="wl-stats-cell">
                <span class="wl-stats-label">区间波幅</span>
                <span class="wl-stats-val">{{ periodRange }}</span>
              </div>
              <div class="wl-stats-divider"></div>
              <div class="wl-stats-cell">
                <span class="wl-stats-label">市盈率</span>
                <span class="wl-stats-val">{{ pe }}</span>
              </div>
            </div>
            <div class="wl-stats-row">
              <div class="wl-stats-cell">
                <span class="wl-stats-label">成交额</span>
                <span class="wl-stats-val">{{ formatAmt(expandedCode) }}</span>
              </div>
              <div class="wl-stats-divider"></div>
              <div class="wl-stats-cell">
                <span class="wl-stats-label">市净率</span>
                <span class="wl-stats-val">{{ pb }}</span>
              </div>
            </div>
            <div class="wl-stats-row">
              <div class="wl-stats-cell">
                <span class="wl-stats-label">涨跌幅</span>
                <span class="wl-stats-val" :class="changeClass(expandedCode)">{{ q(expandedCode)?.change != null ? (q(expandedCode).change / 100).toFixed(2) + '%' : '-' }}</span>
              </div>
              <div class="wl-stats-divider"></div>
              <div class="wl-stats-cell">
                <span class="wl-stats-label">区间涨跌</span>
                <span class="wl-stats-val" :class="periodChangeClass">{{ periodChange }}</span>
              </div>
            </div>
          </div>

          <!-- Actions -->
          <div class="wl-detail-actions">
            <button class="wl-action-btn primary" @click="goToPosition(expandedCode)">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="4" y="2" width="16" height="20" rx="2"/><line x1="8" y1="6" x2="16" y2="6"/><line x1="8" y1="10" x2="16" y2="10"/><line x1="8" y1="14" x2="12" y2="14"/></svg>
              计算仓位
            </button>
            <button class="wl-action-btn danger" @click="removeStock(expandedCode)">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
              移除
            </button>
          </div>
        </div>
      </Transition>
    </main>
    </div><!-- /.wl-body -->

    <!-- Toast -->
    <Transition name="toast">
      <div v-if="toast" class="wl-toast">{{ toast }}</div>
    </Transition>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { useWatchlistStore } from '../stores/watchlist'
import Sparkline from '../components/Sparkline.vue'

const store = useWatchlistStore()
const router = useRouter()
const searchCode = ref('')

// Index intraday data
const indexData = ref(null)

const indexList = computed(() => {
  if (!indexData.value) return []
  const order = ['000001', '399001', '399006']
  return order.map(code => {
    const d = indexData.value[code]
    if (!d) return { code, name: '', trends: [], preClose: 0, price: '--', changeStr: '--', positive: true, changeClass: '' }
    const trends = d.trends || []
    const preClose = d.preClose || 0
    const last = trends.length ? trends[trends.length - 1].close : 0
    const first = trends.length ? trends[0].close : 0
    const change = last - preClose
    const pct = preClose ? (change / preClose * 100) : 0
    const positive = change >= 0
    const sign = positive ? '+' : ''
    return {
      code, name: d.name, trends, preClose,
      price: last ? last.toFixed(2) : '--',
      changeStr: `${sign}${pct.toFixed(2)}%`,
      positive,
      changeClass: positive ? 'positive' : 'negative',
    }
  })
})
const expandedCode = ref(null)
const suggestions = ref([])
const showDropdown = ref(false)
let searchTimer = null
const toast = ref('')
const lastUpdate = ref(null)
const period = ref('1d')
const basicCache = ref({})
const intradayCache = ref({})
const kline5yCache = ref({})

const periods = [
  { key: '1d', label: '1日' },
  { key: '1w', label: '1周' },
  { key: '1m', label: '1月' },
  { key: '3m', label: '3月' },
  { key: '5y', label: '5年' },
  { key: 'all', label: '全部' },
]

let timer = null

const todayStr = new Date().toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'short' })

function q(code) { return store.quotes[code] }
function isPositive(code) { return (q(code)?.change || 0) >= 0 }
function changeClass(code) { return isPositive(code) ? 'positive' : 'negative' }
function formatPrice(code) { const p = q(code)?.close; return p != null ? (p / 100).toFixed(2) : '--' }
function formatChange(code) {
  const qt = q(code)
  if (!qt || qt.change == null) return '--'
  const v = qt.change / 100
  const sign = v >= 0 ? '+' : ''
  return `${sign}${v.toFixed(2)}%`
}
function formatChangeAmt(code) {
  const qt = q(code)
  if (!qt || qt.changeAmt == null) return '--'
  const v = qt.changeAmt
  const sign = v >= 0 ? '+' : ''
  return `${sign}${(v / 100).toFixed(2)}`
}
function formatAmt(code) {
  const a = q(code)?.amount
  if (!a) return '-'
  if (a > 1e8) return (a / 1e8).toFixed(1) + '亿'
  if (a > 1e4) return (a / 1e4).toFixed(0) + '万'
  return a.toFixed(0)
}
function getKline(code) { return store.klineCache[code] }

// Mini chart data for sidebar: intraday if available, else short kline
function getMiniData(code) {
  const intra = intradayCache.value[code]
  if (intra?.trends?.length) return intra.trends
  const klines = getKline(code)
  if (!klines) return null
  return klines.slice(-20)
}

const expandedStock = computed(() => store.stocks.find(s => s.code === expandedCode.value))

// Intraday preClose for reference line
const intradayPreClose = computed(() => {
  const d = intradayCache.value[expandedCode.value]
  return d?.preClose || 0
})

// Filtered kline based on period
const filteredKline = computed(() => {
  if (period.value === '1d') {
    const d = intradayCache.value[expandedCode.value]
    return d?.trends || []
  }
  if (period.value === '5y') {
    return kline5yCache.value[expandedCode.value] || []
  }
  const klines = getKline(expandedCode.value)
  if (!klines) return []
  const days = { '1w': 5, '1m': 22, '3m': 60, 'all': klines.length }
  return klines.slice(-(days[period.value] || klines.length))
})

// Stats computed values
const dayRange = computed(() => {
  const qt = q(expandedCode.value)
  if (!qt || qt.high == null) return '-'
  return `${(qt.high / 100).toFixed(2)} – ${(qt.low / 100).toFixed(2)}`
})

const periodRange = computed(() => {
  const kl = filteredKline.value
  if (!kl.length) return '-'
  if (period.value === '1d') {
    const closes = kl.map(k => k.close)
    return `${Math.min(...closes).toFixed(2)} – ${Math.max(...closes).toFixed(2)}`
  }
  const highs = kl.map(k => k.high)
  const lows = kl.map(k => k.low)
  return `${Math.min(...lows).toFixed(2)} – ${Math.max(...highs).toFixed(2)}`
})

const periodChange = computed(() => {
  const kl = filteredKline.value
  if (kl.length < 2) return '-'
  const first = kl[0].close
  const last = kl[kl.length - 1].close
  const pct = ((last - first) / first * 100)
  const sign = pct >= 0 ? '+' : ''
  return `${sign}${pct.toFixed(2)}%`
})

const periodChangeClass = computed(() => {
  const kl = filteredKline.value
  if (kl.length < 2) return ''
  return kl[kl.length - 1].close >= kl[0].close ? 'positive' : 'negative'
})

const pe = computed(() => {
  const basic = basicCache.value[expandedCode.value]
  if (!basic) return '-'
  const v = basic.f9
  return v != null ? v.toFixed(1) : '-'
})

const pb = computed(() => {
  const basic = basicCache.value[expandedCode.value]
  if (!basic) return '-'
  const v = basic.f23
  return v != null ? v.toFixed(2) : '-'
})

const marketCap = computed(() => {
  const basic = basicCache.value[expandedCode.value]
  if (!basic) return '-'
  const v = basic.f20
  if (v == null) return '-'
  if (v > 1e8) return (v / 1e8).toFixed(1) + '亿'
  if (v > 1e4) return (v / 1e4).toFixed(0) + '万'
  return v.toFixed(0)
})


async function fetchBasic(code) {
  if (basicCache.value[code]) return
  try {
    const res = await fetch(`/api/stock/${code}/basic`).then(r => r.json())
    if (res.ok) basicCache.value[code] = res.data
  } catch { /* ignore */ }
}

async function fetchIntraday(code) {
  if (intradayCache.value[code]) return
  try {
    const res = await fetch(`/api/stock/${code}/intraday`).then(r => r.json())
    if (res.ok && res.data?.trends?.length) intradayCache.value[code] = res.data
  } catch { /* ignore */ }
}

async function fetch5y(code) {
  if (kline5yCache.value[code]) return
  try {
    const res = await fetch(`/api/stock/${code}/kline5y`).then(r => r.json())
    if (res.ok && res.data?.length) kline5yCache.value[code] = res.data
  } catch { /* ignore */ }
}

async function addStock() {
  const code = searchCode.value.trim()
  if (!code) { showToast('请输入股票代码或名称'); return }
  // If input is a 6-digit code, add directly
  if (/^\d{6}$/.test(code)) {
    await doAddStock(code)
    return
  }
  // Otherwise search and pick first result
  showToast('请从搜索结果中选择股票')
}

async function doAddStock(code) {
  if (store.stocks.find(s => s.code === code)) { showToast('已在自选中'); return }
  try {
    const res = await fetch(`/api/stock/${code}/kline`).then(r => r.json())
    if (!res.ok || !res.data?.length) { showToast('未找到该股票'); return }
    store.addStock(code, code)
    store.klineCache[code] = res.data
    await store.fetchQuotes()
    searchCode.value = ''
    showToast('已添加')
  } catch { showToast('添加失败') }
}

function onSearchInput() {
  clearTimeout(searchTimer)
  suggestions.value = []
  const kw = searchCode.value.trim()
  if (!kw) return
  searchTimer = setTimeout(async () => {
    try {
      const res = await fetch(`/api/stock/search?kw=${encodeURIComponent(kw)}`).then(r => r.json())
      if (res.ok) suggestions.value = res.data
    } catch { /* ignore */ }
  }, 300)
}

function onSearchBlur() {
  setTimeout(() => { showDropdown.value = false }, 150)
}

async function selectSuggestion(s) {
  showDropdown.value = false
  suggestions.value = []
  await doAddStock(s.code)
}

function removeStock(code) {
  store.removeStock(code)
  if (expandedCode.value === code) expandedCode.value = null
  showToast('已移除')
}

async function toggleExpand(code) {
  expandedCode.value = expandedCode.value === code ? null : code
  if (expandedCode.value) {
    period.value = '1d'
    if (!store.klineCache[code]) await store.fetchKline(code)
    fetchBasic(code)
    fetchIntraday(code)
  }
}

function goToPosition(code) {
  router.push({ path: '/position', query: { code } })
}

// Fetch 5y data on demand when user switches to 5y tab
watch(period, p => {
  if (p === '5y' && expandedCode.value) fetch5y(expandedCode.value)
})

async function fetchIndices() {
  try {
    const res = await fetch('/api/market/indices/intraday').then(r => r.json())
    if (res.ok) indexData.value = res.data
  } catch { /* ignore */ }
}

async function refreshAll() {
  await Promise.all([
    store.fetchQuotes(),
    ...store.stocks.map(s => store.fetchKline(s.code)),
    ...store.stocks.map(s => fetchIntraday(s.code)),
    fetchIndices(),
  ])
  lastUpdate.value = new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
}

function showToast(msg) {
  toast.value = msg
  setTimeout(() => { toast.value = '' }, 1800)
}

onMounted(() => {
  refreshAll()
  timer = setInterval(refreshAll, 30000)
})
onUnmounted(() => { clearInterval(timer) })
</script>

<style scoped>
/* ─── Apple Stocks Dark Theme ─── */
.watchlist-page {
  --apple-bg: #000000;
  --apple-surface: #1c1c1e;
  --apple-surface2: #2c2c2e;
  --apple-text: #f5f5f7;
  --apple-text2: #8e8e93;
  --apple-text3: #636366;
  --apple-green: #30d158;
  --apple-red: #ff453a;
  --apple-blue: #0a84ff;
  --apple-border: rgba(84,84,88,.35);

  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;
  font-family: -apple-system, "SF Pro Display", "SF Pro Text", "PingFang SC", "Helvetica Neue", sans-serif;
  -webkit-font-smoothing: antialiased;
  background: var(--apple-bg);
  color: var(--apple-text);
}

/* ─── Body row ─── */
.wl-body {
  display: flex;
  flex: 1;
  min-height: 0;
}

/* ─── Sidebar ─── */
.wl-sidebar {
  width: 320px;
  min-width: 320px;
  border-right: 1px solid var(--apple-border);
  display: flex;
  flex-direction: column;
  background: var(--apple-bg);
  overflow: hidden;
}

.wl-sidebar-header { padding: 24px 20px 8px; }
.wl-title {
  font-size: 28px;
  font-weight: 700;
  letter-spacing: -.3px;
  margin: 0;
}
.wl-date {
  font-size: 13px;
  font-weight: 400;
  color: var(--apple-text2);
}

/* ─── Index bar (full width top) ─── */
.wl-index-bar {
  display: flex;
  gap: 10px;
  padding: 12px 20px;
  border-bottom: 1px solid var(--apple-border);
  flex-shrink: 0;
}
.wl-index-card {
  flex: 1;
  min-width: 0;
  background: var(--apple-surface);
  border-radius: 10px;
  padding: 8px 10px 6px;
  display: flex;
  flex-direction: column;
  align-items: stretch;
  gap: 4px;
}
.wl-index-head {
  display: flex;
  align-items: baseline;
  gap: 6px;
}
.wl-index-name {
  font-size: 12px;
  color: var(--apple-text);
  font-weight: 600;
}
.wl-index-price {
  margin-left: auto;
  font-size: 13px;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
}
.wl-index-price.positive { color: var(--apple-green); }
.wl-index-price.negative { color: var(--apple-red); }
.wl-index-change {
  font-size: 11px;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
}
.wl-index-change.positive { color: var(--apple-green); }
.wl-index-change.negative { color: var(--apple-red); }

/* ─── Search ─── */
.wl-search-wrap {
  display: flex;
  align-items: center;
  gap: 6px;
  margin: 12px 16px 0;
  background: var(--apple-surface);
  border-radius: 8px;
  padding: 0 10px;
  height: 34px;
}
.wl-search-icon { color: var(--apple-text3); flex-shrink: 0; }
.wl-search {
  flex: 1;
  background: none !important;
  border: none !important;
  padding: 0 !important;
  font-size: 13px;
  color: var(--apple-text);
  height: 100%;
}
.wl-search::placeholder { color: var(--apple-text3); }
.wl-search-clear {
  background: none;
  border: none;
  cursor: pointer;
  padding: 0;
  display: flex;
  align-items: center;
}

/* ─── Search suggestions ─── */
.wl-search-area { position: relative; }
.wl-suggestions {
  position: absolute;
  top: 100%;
  left: 16px;
  right: 16px;
  background: #2c2c2e;
  border-radius: 8px;
  margin-top: 4px;
  box-shadow: 0 8px 24px rgba(0,0,0,.5);
  z-index: 100;
  overflow: hidden;
}
.wl-suggest-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 14px;
  cursor: pointer;
  transition: background .1s;
  border-bottom: 1px solid rgba(84,84,88,.18);
}
.wl-suggest-item:last-child { border-bottom: none; }
.wl-suggest-item:hover { background: rgba(10,132,255,.1); }
.wl-suggest-name {
  font-size: 14px;
  font-weight: 500;
  color: var(--apple-text);
}
.wl-suggest-code {
  font-size: 12px;
  color: var(--apple-text3);
  flex-shrink: 0;
  margin-left: 12px;
}

.dropdown-enter-active { transition: all .15s cubic-bezier(.4,0,.2,1); }
.dropdown-leave-active { transition: all .1s ease-in; }
.dropdown-enter-from, .dropdown-leave-to { opacity: 0; transform: translateY(-4px); }

/* ─── Section head ─── */
.wl-sidebar-section { padding: 16px 20px 0; }
.wl-section-head { display: flex; align-items: center; gap: 6px; }
.wl-section-title {
  font-size: 13px;
  font-weight: 600;
  color: var(--apple-text2);
  text-transform: uppercase;
  letter-spacing: .5px;
}
.wl-count { font-size: 11px; color: var(--apple-text3); font-weight: 500; }
.wl-refresh-btn {
  margin-left: auto;
  background: none;
  border: none;
  color: var(--apple-text3);
  cursor: pointer;
  padding: 4px;
  border-radius: 6px;
  transition: color .15s, background .15s;
}
.wl-refresh-btn:hover { color: var(--apple-blue); background: rgba(10,132,255,.08); }
.wl-refresh-btn:disabled { opacity: .3; cursor: default; }

/* ─── Stock list ─── */
.wl-list {
  flex: 1;
  overflow-y: auto;
  padding: 4px 0 0;
  scrollbar-width: thin;
  scrollbar-color: var(--apple-surface) transparent;
}

.wl-stock-item {
  display: flex;
  align-items: center;
  padding: 10px 20px;
  cursor: pointer;
  gap: 10px;
  border-bottom: 1px solid rgba(84,84,88,.18);
  transition: background .12s;
}
.wl-stock-item:hover { background: rgba(255,255,255,.03); }
.wl-stock-item.active { background: rgba(10,132,255,.08); }

.wl-stock-info { flex: 1; min-width: 0; }
.wl-stock-name {
  display: block;
  font-size: 14px;
  font-weight: 500;
  line-height: 1.3;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.wl-stock-code {
  display: block;
  font-size: 11px;
  color: var(--apple-text3);
  margin-top: 1px;
}

.wl-stock-chart { flex-shrink: 0; opacity: .85; }

.wl-stock-nums { text-align: right; flex-shrink: 0; }
.wl-stock-price {
  display: block;
  font-size: 14px;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
}
.wl-stock-change {
  display: block;
  font-size: 11px;
  font-weight: 500;
  margin-top: 1px;
  font-variant-numeric: tabular-nums;
}
.wl-stock-change.positive { color: var(--apple-green); }
.wl-stock-change.negative { color: var(--apple-red); }

/* ─── Empty / Footer ─── */
.wl-empty { padding: 40px 20px; text-align: center; color: var(--apple-text3); font-size: 13px; }
.wl-sidebar-footer {
  padding: 10px 20px;
  font-size: 11px;
  color: var(--apple-text3);
  border-top: 1px solid rgba(84,84,88,.18);
}

/* ─── Main content ─── */
.wl-main {
  flex: 1;
  min-width: 0;
  background: var(--apple-bg);
  overflow-y: auto;
}

.wl-main-placeholder {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: var(--apple-text3);
  font-size: 14px;
  gap: 12px;
}

/* ─── Detail ─── */
.wl-detail {
  padding: 32px 36px 48px;
}

/* Header */
.wl-detail-head {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 24px;
}
.wl-detail-identity {}
.wl-detail-name {
  font-size: 24px;
  font-weight: 700;
  margin: 0;
  letter-spacing: -.3px;
}
.wl-detail-code {
  font-size: 13px;
  color: var(--apple-text2);
  margin-top: 2px;
  display: block;
}
.wl-detail-price-block { text-align: right; }
.wl-detail-price {
  font-size: 32px;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  letter-spacing: -.4px;
  line-height: 1;
}
.wl-detail-change-row {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 4px;
  margin-top: 4px;
}
.wl-detail-change {
  font-size: 14px;
  font-weight: 500;
  font-variant-numeric: tabular-nums;
}
.wl-detail-change.positive { color: var(--apple-green); }
.wl-detail-change.negative { color: var(--apple-red); }

/* Chart */
.wl-detail-chart-wrap {
  border-radius: 12px;
  overflow: hidden;
  margin-bottom: 0;
}
.wl-chart-loading {
  text-align: center;
  padding: 80px 0;
  color: var(--apple-text3);
  font-size: 13px;
}

/* Period tabs */
.wl-period-tabs {
  display: flex;
  gap: 2px;
  padding: 16px 0 0;
  margin-bottom: 24px;
  border-bottom: 1px solid rgba(84,84,88,.2);
}
.wl-period-tab {
  flex: 1;
  background: none;
  border: none;
  color: var(--apple-text3);
  font-size: 13px;
  font-weight: 500;
  padding: 8px 0;
  cursor: pointer;
  position: relative;
  transition: color .15s;
}
.wl-period-tab:hover { color: var(--apple-text2); }
.wl-period-tab.active {
  color: var(--apple-text);
  font-weight: 600;
}
.wl-period-tab.active::after {
  content: '';
  position: absolute;
  bottom: -1px;
  left: 20%;
  right: 20%;
  height: 2px;
  background: var(--apple-text);
  border-radius: 1px;
}

/* Stats grid */
.wl-stats-grid {
  border-top: 1px solid rgba(84,84,88,.2);
}
.wl-stats-row {
  display: flex;
  border-bottom: 1px solid rgba(84,84,88,.2);
}
.wl-stats-cell {
  flex: 1;
  padding: 12px 0;
}
.wl-stats-divider {
  width: 1px;
  background: rgba(84,84,88,.2);
  margin: 8px 0;
}
.wl-stats-label {
  display: block;
  font-size: 12px;
  color: var(--apple-text3);
  margin-bottom: 4px;
}
.wl-stats-val {
  display: block;
  font-size: 15px;
  font-weight: 500;
  font-variant-numeric: tabular-nums;
}
.wl-stats-val.positive { color: var(--apple-green); }
.wl-stats-val.negative { color: var(--apple-red); }

/* Actions */
.wl-detail-actions {
  display: flex;
  gap: 10px;
  margin-top: 24px;
}
.wl-action-btn {
  flex: 1;
  padding: 11px;
  border-radius: 10px;
  border: none;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: all .12s;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
}
.wl-action-btn.primary {
  background: rgba(10,132,255,.12);
  color: var(--apple-blue);
}
.wl-action-btn.primary:hover { background: rgba(10,132,255,.2); }
.wl-action-btn.danger {
  background: rgba(255,69,58,.08);
  color: var(--apple-red);
}
.wl-action-btn.danger:hover { background: rgba(255,69,58,.16); }

/* ─── Toast ─── */
.wl-toast {
  position: fixed;
  bottom: 40px;
  left: 50%;
  transform: translateX(-50%);
  background: var(--apple-surface2);
  color: var(--apple-text);
  padding: 10px 24px;
  border-radius: 20px;
  font-size: 13px;
  font-weight: 500;
  box-shadow: 0 8px 32px rgba(0,0,0,.5);
  z-index: 999;
  pointer-events: none;
}

/* ─── Spinning ─── */
.spinning { animation: spin .8s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }

/* ─── Transitions ─── */
.fade-enter-active, .fade-leave-active { transition: opacity .15s; }
.fade-enter-from, .fade-leave-to { opacity: 0; }

.toast-enter-active { transition: all .3s cubic-bezier(.175,.885,.32,1.275); }
.toast-leave-active { transition: all .15s ease-in; }
.toast-enter-from { opacity: 0; transform: translateX(-50%) translateY(10px); }
.toast-leave-to { opacity: 0; transform: translateX(-50%) translateY(-6px); }

.slide-detail-enter-active { transition: all .25s cubic-bezier(.4,0,.2,1); }
.slide-detail-leave-active { transition: all .15s ease-in; }
.slide-detail-enter-from { opacity: 0; transform: translateX(20px); }
.slide-detail-leave-to { opacity: 0; transform: translateX(-10px); }

.stock-list-move, .stock-list-enter-active, .stock-list-leave-active { transition: all .3s cubic-bezier(.4,0,.2,1); }
.stock-list-enter-from { opacity: 0; transform: translateY(12px); }
.stock-list-leave-to { opacity: 0; transform: translateX(-30px); }
.stock-list-leave-active { position: absolute; width: 100%; }

/* ─── Mobile ─── */
@media (max-width: 768px) {
  .wl-body { flex-direction: column; }
  .wl-index-bar { flex-direction: column; gap: 6px; padding: 10px 12px; }
  .wl-index-card { flex-direction: row; justify-content: space-between; padding: 8px 12px; }
  .wl-sidebar {
    width: 100%;
    min-width: unset;
    height: auto;
    position: relative;
    top: 0;
    border-right: none;
    border-bottom: 1px solid var(--apple-border);
  }
  .wl-list { max-height: 40vh; }
  .wl-main { height: auto; min-height: 55vh; }
  .wl-main-placeholder { height: 40vh; }
  .wl-detail { padding: 20px 16px 32px; }
  .wl-detail-name { font-size: 20px; }
  .wl-detail-price { font-size: 24px; }
  .wl-stats-cell { padding: 10px 0; }
  .wl-stats-val { font-size: 14px; }
}
</style>

<template>
  <div class="page-container">
    <div class="journal-page">
      <!-- Tab nav -->
      <div class="j-tabs">
        <button v-for="t in tabs" :key="t.key" :class="['j-tab', { active: activeTab === t.key }]" @click="activeTab = t.key">{{ t.label }}</button>
      </div>

      <!-- Tab 1: 交易记录 -->
      <div v-if="activeTab === 'trades'" class="j-content">
        <!-- 新增交易 -->
        <div class="card">
          <div class="flex-between" style="margin-bottom: 12px">
            <h3 style="margin:0">新增交易</h3>
            <button class="btn btn-ghost" @click="showForm = !showForm">{{ showForm ? '收起' : '展开' }}</button>
          </div>
          <div v-if="showForm" class="j-form">
            <div class="j-form-row">
              <div class="j-form-group" style="position:relative">
                <label>股票</label>
                <input v-model="form.kw" placeholder="输入代码/名称搜索" @input="onSearch" />
                <div v-if="searchResults.length" class="j-search-dropdown">
                  <div v-for="s in searchResults" :key="s.code" class="j-search-item" @click="pickStock(s)">
                    {{ s.name }} <span style="color:var(--text2)">{{ s.code }}</span>
                  </div>
                </div>
              </div>
              <div class="j-form-group">
                <label>买入价</label>
                <input v-model.number="form.buyPrice" type="number" step="0.01" />
              </div>
              <div class="j-form-group">
                <label>数量</label>
                <input v-model.number="form.quantity" type="number" />
              </div>
            </div>
            <div class="j-form-row">
              <div class="j-form-group">
                <label>策略</label>
                <select v-model="form.strategy">
                  <option value="trend">趋势突破</option>
                  <option value="pullback">回调买入</option>
                  <option value="bottom">底部右侧确认</option>
                </select>
              </div>
              <div class="j-form-group">
                <label>市场环境</label>
                <select v-model="form.marketRegime">
                  <option value="bull">牛市</option>
                  <option value="bull-lean">偏多</option>
                  <option value="neutral">震荡</option>
                  <option value="bear-lean">偏空</option>
                  <option value="bear">熊市</option>
                </select>
              </div>
              <div class="j-form-group">
                <label>行业</label>
                <input v-model="form.industry" placeholder="如: 半导体" />
              </div>
            </div>
            <div class="j-form-row">
              <div class="j-form-group">
                <label>ATR</label>
                <div class="flex" style="gap:6px">
                  <input :value="form.atr" type="number" step="0.01" readonly style="flex:1" />
                  <button class="btn btn-ghost" @click="calcATR" :disabled="!form.code || atrLoading">{{ atrLoading ? '...' : '获取ATR' }}</button>
                </div>
              </div>
              <div class="j-form-group">
                <label>止损价</label>
                <input v-model.number="form.stopPrice" type="number" step="0.01" />
              </div>
              <div class="j-form-group">
                <label>目标价</label>
                <input v-model.number="form.targetPrice" type="number" step="0.01" />
              </div>
            </div>
            <!-- 盈亏比提示 -->
            <div v-if="form.buyPrice && form.stopPrice && form.targetPrice" class="j-rr-hint">
              盈亏比: <strong>{{ rrRatio }}</strong>
              <span v-if="rrRatio < 2" style="color:var(--red)"> (建议 ≥ 2:1)</span>
              <span v-else style="color:var(--green)"> ✓</span>
            </div>
            <!-- 检查清单 -->
            <div class="j-checklist">
              <div class="card-title">交易前检查</div>
              <label v-for="(item, i) in PRE_TRADE_CHECKLIST" :key="i">
                <input type="checkbox" v-model="form.checklist[i]" />
                {{ item }}
              </label>
            </div>
            <button class="btn btn-primary" @click="submitTrade" :disabled="!canSubmit">确认添加</button>
          </div>
        </div>

        <!-- 持仓中 -->
        <div class="card" v-if="journal.openTrades.length">
          <h3 style="margin-bottom:12px">持仓中 ({{ journal.openTrades.length }})</h3>
          <div style="overflow-x:auto">
            <table>
              <thead>
                <tr>
                  <th>股票</th><th>策略</th><th>买价</th><th>止损</th><th>目标</th><th>数量</th><th>日期</th><th></th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="t in journal.openTrades" :key="t.id">
                  <td><strong>{{ t.name }}</strong><br><span style="color:var(--text2);font-size:11px">{{ t.code }}</span></td>
                  <td>{{ t.strategyName }}</td>
                  <td>{{ t.buyPrice.toFixed(2) }}</td>
                  <td style="color:var(--red)">{{ t.stopPrice.toFixed(2) }}</td>
                  <td style="color:var(--green)">{{ t.targetPrice.toFixed(2) }}</td>
                  <td>{{ t.quantity }}</td>
                  <td style="color:var(--text2)">{{ t.date }}</td>
                  <td>
                    <button class="btn btn-ghost" style="font-size:12px;padding:4px 10px" @click="openClose(t)">平仓</button>
                    <button class="btn btn-ghost" style="font-size:12px;padding:4px 10px;color:var(--red)" @click="delTrade(t.id)">删除</button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <!-- 已平仓 -->
        <div class="card" v-if="journal.closedTrades.length">
          <h3 style="margin-bottom:12px">已平仓 ({{ journal.closedTrades.length }})</h3>
          <div style="overflow-x:auto">
            <table>
              <thead>
                <tr>
                  <th>股票</th><th>策略</th><th>买/卖</th><th>盈亏</th><th>盈亏比</th><th>卖出原因</th><th>日期</th><th></th>
                </tr>
              </thead>
              <tbody>
                <template v-for="t in journal.closedTrades" :key="t.id">
                  <tr>
                    <td><strong>{{ t.name }}</strong><br><span style="color:var(--text2);font-size:11px">{{ t.code }}</span></td>
                    <td>{{ t.strategyName }}</td>
                    <td>{{ t.buyPrice.toFixed(2) }} → {{ t.sellPrice?.toFixed(2) }}</td>
                    <td :style="{ color: t.pnl >= 0 ? 'var(--green)' : 'var(--red)' }">
                      {{ t.pnl >= 0 ? '+' : '' }}{{ t.pnl?.toFixed(0) }}
                      <span style="font-size:11px">({{ t.pnlPct >= 0 ? '+' : '' }}{{ t.pnlPct?.toFixed(1) }}%)</span>
                    </td>
                    <td>{{ t.actualRR?.toFixed(1) }}</td>
                    <td>{{ sellReasonLabel(t.sellReason) }}</td>
                    <td style="color:var(--text2)">{{ t.sellDate }}</td>
                    <td>
                      <button class="btn btn-ghost" style="font-size:12px;padding:4px 10px" @click="toggleReview(t.id)">
                        {{ expandedReview === t.id ? '收起' : '复盘' }}
                      </button>
                    </td>
                  </tr>
                  <tr v-if="expandedReview === t.id">
                    <td colspan="8" style="padding:12px 10px;background:var(--bg)">
                      <div class="j-review-detail">
                        <div class="flex" style="gap:16px;flex-wrap:wrap;margin-bottom:8px">
                          <span>情绪: <strong>{{ emotionLabel(t.emotion) }}</strong></span>
                          <span>执行: <strong>{{ t.executionScore }}/5</strong></span>
                          <span v-if="t.violations?.length" style="color:var(--red)">违反规则: {{ t.violations.join(', ') }}</span>
                        </div>
                        <div v-if="t.issues?.length" style="margin-bottom:6px">
                          <span v-for="iss in t.issues" :key="iss" class="tag tag-bear" style="margin-right:4px">{{ issueLabels[iss] || iss }}</span>
                        </div>
                        <div v-if="t.reviewNotes" style="color:var(--text2);font-size:13px;white-space:pre-wrap">{{ t.reviewNotes }}</div>
                      </div>
                    </td>
                  </tr>
                </template>
              </tbody>
            </table>
          </div>
        </div>

        <!-- 空状态 -->
        <div v-if="!journal.trades.length" class="card" style="text-align:center;padding:40px;color:var(--text2)">
          <p>暂无交易记录，点击上方「展开」添加第一笔交易</p>
        </div>
      </div>

      <!-- Tab 2: 绩效统计 -->
      <div v-if="activeTab === 'stats'" class="j-content">
        <div class="grid-3">
          <div class="card" style="text-align:center">
            <div class="card-title">胜率</div>
            <div class="j-stat-value" :style="{ color: journal.winRate >= 50 ? 'var(--green)' : 'var(--red)' }">
              {{ journal.closedTrades.length ? journal.winRate.toFixed(1) + '%' : '--' }}
            </div>
          </div>
          <div class="card" style="text-align:center">
            <div class="card-title">盈亏比</div>
            <div class="j-stat-value">{{ journal.closedTrades.length ? (isFinite(journal.profitFactor) ? journal.profitFactor.toFixed(2) : '∞') : '--' }}</div>
          </div>
          <div class="card" style="text-align:center">
            <div class="card-title">总盈亏</div>
            <div class="j-stat-value" :style="{ color: journal.totalPnl >= 0 ? 'var(--green)' : 'var(--red)' }">
              {{ journal.closedTrades.length ? (journal.totalPnl >= 0 ? '+' : '') + journal.totalPnl.toFixed(0) : '--' }}
            </div>
          </div>
        </div>

        <!-- 额外统计 -->
        <div class="grid-3" style="margin-top:0">
          <div class="card" style="text-align:center">
            <div class="card-title">平均盈利</div>
            <div class="j-stat-sm" style="color:var(--green)">{{ journal.avgWin ? '+' + journal.avgWin.toFixed(1) + '%' : '--' }}</div>
          </div>
          <div class="card" style="text-align:center">
            <div class="card-title">平均亏损</div>
            <div class="j-stat-sm" style="color:var(--red)">{{ journal.avgLoss ? journal.avgLoss.toFixed(1) + '%' : '--' }}</div>
          </div>
          <div class="card" style="text-align:center">
            <div class="card-title">交易次数</div>
            <div class="j-stat-sm">{{ journal.closedTrades.length }}</div>
          </div>
        </div>

        <!-- 月度权益曲线 -->
        <div class="card" v-if="journal.monthlyPnl.length">
          <div class="card-title">月度盈亏</div>
          <Sparkline
            :data="monthlyChartData"
            :positive="journal.totalPnl >= 0"
            :auto-width="true"
            :height="100"
            show-area
          />
          <table style="margin-top:12px">
            <thead><tr><th>月份</th><th>盈亏</th></tr></thead>
            <tbody>
              <tr v-for="m in journal.monthlyPnl" :key="m.month">
                <td>{{ m.month }}</td>
                <td :style="{ color: m.pnl >= 0 ? 'var(--green)' : 'var(--red)' }">{{ m.pnl >= 0 ? '+' : '' }}{{ m.pnl.toFixed(0) }}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- 策略对比 -->
        <div class="card" v-if="journal.strategyBreakdown.length">
          <div class="card-title">策略对比</div>
          <table>
            <thead><tr><th>策略</th><th>交易数</th><th>胜率</th><th>总盈亏</th></tr></thead>
            <tbody>
              <tr v-for="s in journal.strategyBreakdown" :key="s.strategy">
                <td>{{ s.name }}</td>
                <td>{{ s.count }}</td>
                <td>{{ (s.count ? (s.wins / s.count * 100).toFixed(1) : '0') }}%</td>
                <td :style="{ color: s.totalPnl >= 0 ? 'var(--green)' : 'var(--red)' }">{{ s.totalPnl >= 0 ? '+' : '' }}{{ s.totalPnl.toFixed(0) }}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div v-if="!journal.closedTrades.length" class="card" style="text-align:center;padding:40px;color:var(--text2)">
          <p>平仓后自动生成统计数据</p>
        </div>
      </div>

      <!-- Tab 3: 复盘分析 -->
      <div v-if="activeTab === 'review'" class="j-content">
        <!-- 系统警告 -->
        <div v-if="journal.systemWarning" class="card j-warning">
          <div style="display:flex;align-items:center;gap:10px">
            <span style="font-size:24px">⚠️</span>
            <div>
              <div style="font-weight:700;color:var(--red)">系统警告</div>
              <div>连续 {{ journal.consecutiveStops }} 次止损，建议暂停交易、复盘检讨</div>
            </div>
          </div>
        </div>

        <!-- 规则违反统计 -->
        <div class="card" v-if="journal.closedTrades.length">
          <div class="card-title">规则违反统计</div>
          <div v-for="rule in IRON_RULES" :key="rule.id" class="j-rule-row">
            <span class="j-rule-id">{{ rule.id }}</span>
            <span style="flex:1">{{ rule.rule }}</span>
            <span class="j-rule-count" :style="{ color: violationCounts[rule.id] ? 'var(--red)' : 'var(--text2)' }">
              {{ violationCounts[rule.id] || 0 }} 次
            </span>
          </div>
        </div>

        <!-- 问题分析 -->
        <div class="card" v-if="journal.closedTrades.length">
          <div class="card-title">问题分析</div>
          <div v-for="(label, key) in issueLabels" :key="key" class="j-rule-row">
            <span style="flex:1">{{ label }}</span>
            <span class="j-rule-count" :style="{ color: issueCounts[key] ? 'var(--orange)' : 'var(--text2)' }">
              {{ issueCounts[key] || 0 }} 次
            </span>
          </div>
        </div>

        <!-- 复盘历史 -->
        <div class="card" v-if="reviewedTrades.length">
          <div class="card-title">复盘记录</div>
          <div v-for="t in reviewedTrades" :key="t.id" class="j-review-item">
            <div class="flex-between">
              <div>
                <strong>{{ t.name }}</strong>
                <span style="color:var(--text2);font-size:12px;margin-left:6px">{{ t.code }}</span>
              </div>
              <span :style="{ color: t.pnl >= 0 ? 'var(--green)' : 'var(--red)', fontWeight: 600 }">
                {{ t.pnl >= 0 ? '+' : '' }}{{ t.pnl?.toFixed(0) }}
              </span>
            </div>
            <div style="color:var(--text2);font-size:12px;margin-top:4px">
              {{ t.sellDate }} · {{ sellReasonLabel(t.sellReason) }} · 情绪{{ emotionLabel(t.emotion) }} · 执行{{ t.executionScore }}/5
            </div>
            <div v-if="t.reviewNotes" style="margin-top:6px;font-size:13px;white-space:pre-wrap;color:var(--text)">{{ t.reviewNotes }}</div>
          </div>
        </div>

        <div v-if="!journal.closedTrades.length" class="card" style="text-align:center;padding:40px;color:var(--text2)">
          <p>平仓并填写复盘后，分析数据将自动生成</p>
        </div>
      </div>

      <!-- 平仓弹窗 -->
      <div v-if="closingTrade" class="j-modal-overlay" @click.self="closingTrade = null">
        <div class="j-modal">
          <h3 style="margin-bottom:16px">平仓 — {{ closingTrade.name }}</h3>
          <div class="j-form-row">
            <div class="j-form-group">
              <label>卖出价</label>
              <input v-model.number="closeForm.sellPrice" type="number" step="0.01" />
            </div>
            <div class="j-form-group">
              <label>卖出原因</label>
              <select v-model="closeForm.sellReason">
                <option value="stop">触发止损</option>
                <option value="target">到达目标</option>
                <option value="trailing_stop">跟踪止盈</option>
                <option value="time_stop">时间止损</option>
                <option value="logic_stop">逻辑止损</option>
                <option value="manual">手动平仓</option>
              </select>
            </div>
          </div>
          <div class="j-form-row">
            <div class="j-form-group">
              <label>情绪评分 (1-5)</label>
              <div class="j-score-row">
                <button v-for="n in 5" :key="n" :class="['j-score-btn', { active: closeForm.emotion === n }]" @click="closeForm.emotion = n">{{ n }}</button>
              </div>
            </div>
            <div class="j-form-group">
              <label>执行评分 (1-5)</label>
              <div class="j-score-row">
                <button v-for="n in 5" :key="n" :class="['j-score-btn', { active: closeForm.executionScore === n }]" @click="closeForm.executionScore = n">{{ n }}</button>
              </div>
            </div>
          </div>
          <div class="j-checklist">
            <div class="card-title">规则违反</div>
            <label v-for="rule in IRON_RULES" :key="rule.id">
              <input type="checkbox" :value="rule.id" v-model="closeForm.violations" />
              {{ rule.id }}. {{ rule.rule }}
            </label>
          </div>
          <div class="j-checklist">
            <div class="card-title">问题标签</div>
            <label v-for="(label, key) in issueLabels" :key="key">
              <input type="checkbox" :value="key" v-model="closeForm.issues" />
              {{ label }}
            </label>
          </div>
          <div class="j-form-group">
            <label>复盘备注</label>
            <textarea v-model="closeForm.reviewNotes" rows="3" placeholder="记录这次交易的得失、改进方向..."></textarea>
          </div>
          <div class="flex" style="gap:8px;justify-content:flex-end;margin-top:12px">
            <button class="btn btn-ghost" @click="closingTrade = null">取消</button>
            <button class="btn btn-primary" @click="submitClose">确认平仓</button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, reactive } from 'vue'
import { useJournalStore } from '../stores/journal'
import { PRE_TRADE_CHECKLIST, IRON_RULES } from '../utils/tradeRules'
import { STRATEGY_PARAMS } from '../utils/position'
import Sparkline from '../components/Sparkline.vue'

const journal = useJournalStore()

const tabs = [
  { key: 'trades', label: '交易记录' },
  { key: 'stats', label: '绩效统计' },
  { key: 'review', label: '复盘分析' },
]
const activeTab = ref('trades')
const showForm = ref(false)
const expandedReview = ref(null)

// 搜索
const searchResults = ref([])
let searchTimer = null
function onSearch() {
  clearTimeout(searchTimer)
  if (!form.kw || form.kw.length < 1) { searchResults.value = []; return }
  searchTimer = setTimeout(async () => {
    try {
      const res = await fetch(`/api/stock/search?kw=${encodeURIComponent(form.kw)}`).then(r => r.json())
      searchResults.value = res.ok ? res.data.slice(0, 6) : []
    } catch { searchResults.value = [] }
  }, 300)
}
function pickStock(s) {
  form.code = s.code
  form.name = s.name
  form.kw = `${s.name} (${s.code})`
  searchResults.value = []
}

// 新增交易表单
const form = reactive({
  code: '', name: '', kw: '',
  buyPrice: null, quantity: null,
  strategy: 'pullback',
  marketRegime: 'neutral',
  industry: '',
  atr: 0, atrN: 0,
  stopPrice: null, targetPrice: null,
  checklist: [],
})
const atrLoading = ref(false)

const rrRatio = computed(() => {
  if (!form.buyPrice || !form.stopPrice || !form.targetPrice) return 0
  const stopDist = form.buyPrice - form.stopPrice
  if (stopDist <= 0) return 0
  return ((form.targetPrice - form.buyPrice) / stopDist).toFixed(1)
})

const canSubmit = computed(() => form.code && form.buyPrice > 0 && form.quantity > 0 && form.stopPrice > 0 && form.targetPrice > 0)

async function calcATR() {
  if (!form.code) return
  atrLoading.value = true
  const sp = STRATEGY_PARAMS[form.strategy]
  const atr = await journal.fetchATR(form.code)
  atrLoading.value = false
  if (atr && form.buyPrice) {
    form.atr = +atr.toFixed(3)
    form.atrN = sp.n
    form.stopPrice = +(form.buyPrice - sp.n * atr).toFixed(2)
    form.targetPrice = +(form.buyPrice + sp.n * atr * 2).toFixed(2)
  }
}

function submitTrade() {
  const sp = STRATEGY_PARAMS[form.strategy]
  journal.addTrade({
    code: form.code, name: form.name,
    buyPrice: form.buyPrice, quantity: form.quantity,
    strategy: form.strategy, strategyName: sp.name,
    stopPrice: form.stopPrice, targetPrice: form.targetPrice,
    atr: form.atr, atrN: form.atrN,
    marketRegime: form.marketRegime, industry: form.industry,
    checklist: [...form.checklist],
  })
  // reset
  Object.assign(form, { code: '', name: '', kw: '', buyPrice: null, quantity: null, strategy: 'pullback', marketRegime: 'neutral', industry: '', atr: 0, atrN: 0, stopPrice: null, targetPrice: null, checklist: [] })
  showForm.value = false
}

function delTrade(id) {
  if (confirm('确定删除此交易记录？')) journal.deleteTrade(id)
}

// 平仓
const closingTrade = ref(null)
const closeForm = reactive({
  sellPrice: null, sellReason: 'manual',
  emotion: 3, executionScore: 3,
  violations: [], issues: [],
  reviewNotes: '',
})

function openClose(t) {
  closingTrade.value = t
  closeForm.sellPrice = null
  closeForm.sellReason = 'manual'
  closeForm.emotion = 3
  closeForm.executionScore = 3
  closeForm.violations = []
  closeForm.issues = []
  closeForm.reviewNotes = ''
}

function submitClose() {
  if (!closingTrade.value || !closeForm.sellPrice) return
  journal.closeTrade(closingTrade.value.id, { ...closeForm })
  closingTrade.value = null
}

function toggleReview(id) {
  expandedReview.value = expandedReview.value === id ? null : id
}

// 月度图表数据
const monthlyChartData = computed(() => {
  return journal.monthlyPnl.map(m => ({ close: m.pnl }))
})

// 标签映射
const issueLabels = {
  execution_error: '执行失误',
  wrong_timing: '时机错误',
  wrong_stock: '选股错误',
  regime_mismatch: '环境不匹配',
  emotion_driven: '情绪驱动',
}

function sellReasonLabel(r) {
  const map = { stop: '止损', target: '目标', trailing_stop: '跟踪止盈', time_stop: '时间止损', logic_stop: '逻辑止损', manual: '手动' }
  return map[r] || r
}

function emotionLabel(n) {
  if (!n) return '--'
  const map = { 1: '极差', 2: '较差', 3: '一般', 4: '良好', 5: '极佳' }
  return map[n] || n
}

// 违反统计
const violationCounts = computed(() => {
  const counts = {}
  for (const t of journal.closedTrades) {
    for (const v of (t.violations || [])) {
      counts[v] = (counts[v] || 0) + 1
    }
  }
  return counts
})

const issueCounts = computed(() => {
  const counts = {}
  for (const t of journal.closedTrades) {
    for (const iss of (t.issues || [])) {
      counts[iss] = (counts[iss] || 0) + 1
    }
  }
  return counts
})

// 有复盘的已平仓交易
const reviewedTrades = computed(() => journal.closedTrades.filter(t => t.reviewNotes))
</script>

<style scoped>
.journal-page { max-width: 960px; margin: 0 auto; }
.j-tabs { display: flex; gap: 4px; margin-bottom: 20px; background: var(--surface); border-radius: 8px; padding: 4px; }
.j-tab { flex: 1; padding: 10px 0; text-align: center; border: none; background: none; color: var(--text2); font-size: 14px; font-weight: 600; cursor: pointer; border-radius: 6px; transition: all .15s; }
.j-tab:hover { color: var(--text); }
.j-tab.active { background: var(--accent); color: #fff; }

.j-form { display: flex; flex-direction: column; gap: 12px; }
.j-form-row { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; }
.j-form-group { display: flex; flex-direction: column; gap: 4px; }
.j-form-group label { font-size: 12px; color: var(--text2); padding: 0; }
.j-form-group input, .j-form-group select, .j-form-group textarea {
  background: var(--bg); border: 1px solid var(--border); color: var(--text);
  padding: 8px 12px; border-radius: 6px; font-size: 13px; outline: none;
}
.j-form-group textarea { resize: vertical; font-family: inherit; }
.j-form-group input:focus, .j-form-group select:focus, .j-form-group textarea:focus { border-color: var(--accent); }

.j-search-dropdown { position: absolute; top: 100%; left: 0; right: 0; background: var(--surface); border: 1px solid var(--border); border-radius: 6px; max-height: 200px; overflow-y: auto; z-index: 50; }
.j-search-item { padding: 8px 12px; cursor: pointer; font-size: 13px; }
.j-search-item:hover { background: var(--surface2); }

.j-checklist { display: flex; flex-direction: column; gap: 2px; padding: 10px 0; }

.j-rr-hint { font-size: 13px; padding: 8px 12px; background: var(--bg); border-radius: 6px; }

.j-stat-value { font-size: 32px; font-weight: 700; }
.j-stat-sm { font-size: 20px; font-weight: 600; }

.j-rule-row { display: flex; align-items: center; gap: 10px; padding: 8px 0; border-bottom: 1px solid rgba(71,85,105,.3); }
.j-rule-id { width: 24px; height: 24px; border-radius: 50%; background: var(--surface2); display: flex; align-items: center; justify-content: center; font-size: 11px; font-weight: 700; flex-shrink: 0; }
.j-rule-count { font-weight: 600; font-size: 13px; min-width: 40px; text-align: right; }

.j-warning { border-color: var(--red); background: rgba(239,68,68,.08); }

.j-modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,.6); z-index: 200; display: flex; align-items: center; justify-content: center; }
.j-modal { background: var(--surface); border: 1px solid var(--border); border-radius: 12px; padding: 24px; width: 560px; max-width: 92vw; max-height: 85vh; overflow-y: auto; }

.j-score-row { display: flex; gap: 6px; }
.j-score-btn { width: 36px; height: 32px; border: 1px solid var(--border); background: var(--bg); color: var(--text2); border-radius: 6px; cursor: pointer; font-size: 13px; font-weight: 600; transition: all .15s; }
.j-score-btn:hover { border-color: var(--accent); color: var(--text); }
.j-score-btn.active { background: var(--accent); color: #fff; border-color: var(--accent); }

.j-review-item { padding: 12px 0; border-bottom: 1px solid rgba(71,85,105,.3); }
.j-review-item:last-child { border-bottom: none; }
.j-review-detail { padding: 4px 0; }

@media (max-width: 768px) {
  .j-form-row { grid-template-columns: 1fr; }
  .grid-3 { grid-template-columns: 1fr; }
  .j-modal { width: 100%; max-width: 100%; max-height: 100vh; border-radius: 0; }
}
</style>

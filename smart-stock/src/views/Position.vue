<template>
  <div>
    <div class="flex-between" style="margin-bottom:20px">
      <h2 style="margin:0">仓位计算器</h2>
      <div class="flex" style="gap:12px">
        <label style="font-size:12px;color:var(--text2)">总资金
          <input type="number" v-model.number="portfolio.totalCapital" style="width:100px" @change="portfolio.save()" />
        </label>
      </div>
    </div>

    <!-- 计算器 -->
    <div class="card">
      <div class="card-title">ATR 动态仓位计算</div>
      <div class="grid-2" style="margin-bottom:12px">
        <label>股票代码 <input v-model="calc.code" placeholder="如 600519" style="width:100px" /> <button class="btn btn-ghost" style="font-size:11px;padding:4px 10px" @click="fetchATR" :disabled="!calc.code">获取ATR</button></label>
        <label>买入价 <input type="number" v-model.number="calc.buyPrice" style="width:90px" step="0.01" /></label>
        <label>目标价 <input type="number" v-model.number="calc.targetPrice" style="width:90px" step="0.01" /></label>
        <label>策略
          <select v-model="calc.strategy" style="width:120px">
            <option v-for="(v, k) in STRATEGY_PARAMS" :key="k" :value="k">{{ v.name }}</option>
          </select>
        </label>
        <label>ATR(14) <input type="number" v-model.number="calc.atr" style="width:90px" step="0.01" /> <span v-if="calc.atrFetched" style="color:var(--green);font-size:11px">已获取</span></label>
        <label>行业 <input v-model="calc.industry" placeholder="如 白酒" style="width:100px" /></label>
      </div>

      <!-- 计算结果 -->
      <div v-if="posResult" style="border-top:1px solid var(--border);padding-top:16px">
        <div class="grid-3" style="text-align:center;margin-bottom:16px">
          <div>
            <div style="font-size:12px;color:var(--text2);margin-bottom:4px">止损价</div>
            <div style="font-size:18px;font-weight:700;color:var(--red)">{{ posResult.stopPrice.toFixed(2) }}</div>
            <div style="font-size:11px;color:var(--text2)">-{{ (posResult.stopPct * 100).toFixed(1) }}%</div>
          </div>
          <div>
            <div style="font-size:12px;color:var(--text2);margin-bottom:4px">建议仓位</div>
            <div style="font-size:18px;font-weight:700;color:var(--accent2)">{{ (posResult.position / 10000).toFixed(0) }}万</div>
            <div style="font-size:11px;color:var(--text2)">{{ posResult.positionPct.toFixed(1) }}%</div>
          </div>
          <div>
            <div style="font-size:12px;color:var(--text2);margin-bottom:4px">盈亏比</div>
            <div :style="{ fontSize: '18px', fontWeight: 700, color: rrResult && rrResult.ratio >= 2 ? 'var(--green)' : 'var(--orange)' }">
              {{ rrResult ? rrResult.ratio.toFixed(1) + ':1' : '-' }}
            </div>
            <div v-if="rrResult && rrResult.ratio < 2" style="font-size:11px;color:var(--red)">盈亏比不足 2:1，不建议操作</div>
          </div>
        </div>

        <!-- 盈亏可视化 -->
        <div v-if="rrResult" style="height:32px;border-radius:6px;overflow:hidden;display:flex;margin-bottom:12px">
          <div :style="{ width: stopBarPct + '%', background: 'var(--red)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'11px', color:'#fff' }">
            止损 -{{ (posResult.stopPct * 100).toFixed(1) }}%
          </div>
          <div :style="{ width: rewardBarPct + '%', background: 'var(--green)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'11px', color:'#fff' }">
            目标 +{{ (rrResult.reward / calc.buyPrice * 100).toFixed(1) }}%
          </div>
        </div>

        <div class="grid-2" style="font-size:12px;color:var(--text2)">
          <div>跟踪止盈初始价：<span style="color:var(--text)">{{ trailingPrice.toFixed(2) }}</span> (回撤{{ (sp.callback * 100).toFixed(0) }}%)</div>
          <div>止损空间：{{ sp.n }} × ATR = {{ posResult.stopDistance.toFixed(2) }}</div>
          <div>风险预算仓位：{{ (posResult.posByRisk / 10000).toFixed(1) }}万</div>
          <div>上限仓位：{{ (posResult.maxAllowed / 10000).toFixed(1) }}万 (25%)</div>
        </div>

        <div class="flex" style="margin-top:16px;gap:8px">
          <button class="btn btn-primary" @click="addToPortfolio" :disabled="!canAdd">添加到持仓</button>
        </div>
      </div>
    </div>

    <!-- 行业集中度 -->
    <div v-if="portfolio.holdings.length" class="card">
      <div class="card-title">行业集中度</div>
      <div v-for="(pct, ind) in industryPct" :key="ind" class="flex" style="margin-bottom:6px">
        <span style="width:80px;font-size:13px">{{ ind }}</span>
        <div style="flex:1;height:20px;background:var(--surface2);border-radius:4px;overflow:hidden">
          <div :style="{ width: Math.min(pct, 100) + '%', height: '100%', background: pct > 30 ? 'var(--red)' : pct > 20 ? 'var(--orange)' : 'var(--accent)', borderRadius: '4px', transition: 'width .3s' }" />
        </div>
        <span style="width:50px;text-align:right;font-size:12px" :style="{ color: pct > 30 ? 'var(--red)' : pct > 20 ? 'var(--orange)' : 'var(--text2)' }">{{ pct.toFixed(1) }}%</span>
      </div>
      <div v-if="overIndustry" style="font-size:12px;color:var(--red);margin-top:8px">
        ⚠ {{ overIndustry }} 行业集中度超过 30%，注意分散风险
      </div>
    </div>

    <!-- 持仓列表 -->
    <div v-if="portfolio.holdings.length" class="card">
      <div class="flex-between" style="margin-bottom:12px">
        <div class="card-title" style="margin:0">持仓管理</div>
        <span style="font-size:12px;color:var(--text2)">总仓位 {{ portfolio.positionPct }}% | {{ portfolio.holdings.length }} 只</span>
      </div>
      <div style="overflow-x:auto">
        <table>
          <thead>
            <tr><th>代码</th><th>行业</th><th>买入价</th><th>止损价</th><th>跟踪止盈</th><th>仓位</th><th>策略</th><th>日期</th><th>操作</th></tr>
          </thead>
          <tbody>
            <tr v-for="h in portfolio.holdings" :key="h.id">
              <td><strong>{{ h.code }}</strong></td>
              <td>{{ h.industry || '-' }}</td>
              <td>{{ h.buyPrice?.toFixed(2) }}</td>
              <td style="color:var(--red)">{{ h.stopPrice?.toFixed(2) }}</td>
              <td style="color:var(--green)">{{ h.trailingStop?.toFixed(2) }}</td>
              <td>{{ (h.position / 10000).toFixed(1) }}万</td>
              <td><span class="tag tag-blue">{{ h.strategyName }}</span></td>
              <td style="font-size:12px;color:var(--text2)">{{ h.date }}</td>
              <td>
                <button class="btn btn-ghost" style="font-size:11px;padding:2px 8px" @click="editTrailing(h)">更新止盈</button>
                <button class="btn btn-ghost" style="font-size:11px;padding:2px 8px;color:var(--red)" @click="removeHolding(h.id)">删除</button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- 策略参数速查 -->
    <div class="card">
      <div class="card-title">策略参数速查</div>
      <table>
        <thead>
          <tr><th>策略</th><th>ATR乘数</th><th>回撤止盈</th><th>预计持有</th><th>时间止损</th></tr>
        </thead>
        <tbody>
          <tr v-for="(v, k) in STRATEGY_PARAMS" :key="k">
            <td><strong>{{ v.name }}</strong></td>
            <td>{{ v.n }} × ATR</td>
            <td>{{ (v.callback * 100).toFixed(0) }}%</td>
            <td>{{ v.holdDays }}</td>
            <td style="font-size:12px;color:var(--text2)">{{ STRATEGY_DETAILS[k]?.timeStop || '-' }}</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, reactive } from 'vue'
import { usePortfolioStore } from '../stores/portfolio'
import { calcPosition, calcRiskReward, calcTrailingStop, STRATEGY_PARAMS } from '../utils/position'
import { STRATEGY_DETAILS } from '../utils/tradeRules'

const portfolio = usePortfolioStore()

const calc = reactive({
  code: '', buyPrice: null, targetPrice: null, strategy: 'trend', atr: null, industry: '', atrFetched: false,
})

const sp = computed(() => STRATEGY_PARAMS[calc.strategy] || STRATEGY_PARAMS.trend)

const posResult = computed(() => {
  if (!calc.buyPrice || !calc.atr || calc.atr <= 0) return null
  return calcPosition(portfolio.totalCapital, calc.buyPrice, calc.atr, sp.value.n)
})

const rrResult = computed(() => {
  if (!posResult.value || !calc.targetPrice) return null
  return calcRiskReward(calc.buyPrice, calc.targetPrice, posResult.value.stopDistance)
})

const trailingPrice = computed(() => {
  if (!calc.buyPrice) return 0
  return calcTrailingStop(calc.buyPrice, sp.value.callback)
})

const stopBarPct = computed(() => {
  if (!rrResult.value) return 50
  const total = posResult.value.stopPct + rrResult.value.reward / calc.buyPrice
  return total > 0 ? (posResult.value.stopPct / total * 100) : 50
})

const rewardBarPct = computed(() => 100 - stopBarPct.value)

const canAdd = computed(() => posResult.value && calc.code && calc.buyPrice)

// 行业集中度
const industryPct = computed(() => {
  const map = {}
  const total = portfolio.totalCapital || 1
  portfolio.holdings.forEach(h => {
    const ind = h.industry || '未分类'
    map[ind] = (map[ind] || 0) + h.position
  })
  const result = {}
  for (const [k, v] of Object.entries(map)) result[k] = v / total * 100
  return result
})

const overIndustry = computed(() => {
  for (const [ind, pct] of Object.entries(industryPct.value)) {
    if (pct > 30) return ind
  }
  return null
})

async function fetchATR() {
  if (!calc.code) return
  try {
    const res = await fetch(`/api/stock/${calc.code}/kline`).then(r => r.json())
    if (res.ok && res.data?.length > 15) {
      // ATR calculation from klines
      const klines = res.data
      const period = 14
      const trs = klines.map((k, i) => {
        if (i === 0) return k.high - k.low
        return Math.max(k.high - k.low, Math.abs(k.high - k.prevClose), Math.abs(k.low - k.prevClose))
      })
      calc.atr = trs.slice(-period).reduce((s, v) => s + v, 0) / period
      calc.atrFetched = true
    }
  } catch { /* ignore */ }
}

function addToPortfolio() {
  if (!canAdd.value) return
  portfolio.addHolding({
    code: calc.code,
    buyPrice: calc.buyPrice,
    stopPrice: posResult.value.stopPrice,
    trailingStop: trailingPrice.value,
    position: posResult.value.position,
    strategy: calc.strategy,
    strategyName: sp.value.name,
    industry: calc.industry || '',
  })
  // Reset
  calc.code = ''; calc.buyPrice = null; calc.targetPrice = null; calc.atr = null; calc.atrFetched = false; calc.industry = ''
}

function editTrailing(h) {
  const newPrice = prompt('更新跟踪止盈价（只能上移）：', h.trailingStop?.toFixed(2))
  if (newPrice && +newPrice > h.trailingStop) {
    portfolio.updateHolding(h.id, { trailingStop: +newPrice })
  }
}

function removeHolding(id) {
  if (confirm('确认删除该持仓？')) portfolio.removeHolding(id)
}
</script>

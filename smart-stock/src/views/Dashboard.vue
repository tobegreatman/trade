<template>
  <div>
    <div class="flex-between" style="margin-bottom:20px">
      <h2 style="margin:0">大盘状态判定</h2>
      <div class="flex">
        <span v-if="store.lastUpdate" style="color:var(--text2);font-size:12px">更新于 {{ store.lastUpdate }}</span>
        <button class="btn btn-primary" @click="store.fetchAll()" :disabled="store.loading">
          {{ store.loading ? '加载中...' : '刷新数据' }}
        </button>
      </div>
    </div>

    <!-- 六维判定表 -->
    <div class="card">
      <div class="card-title">六维市场状态判定</div>
      <table>
        <thead>
          <tr><th>维度</th><th>数据</th><th>牛市信号</th><th>震荡信号</th><th>熊市信号</th><th>当前判定</th></tr>
        </thead>
        <tbody>
          <tr v-for="dim in dimensions" :key="dim.key">
            <td><strong>{{ dim.label }}</strong></td>
            <td style="color:var(--text)">{{ dim.value || '-' }}</td>
            <td style="color:var(--green);font-size:12px">{{ dim.bull }}</td>
            <td style="color:var(--orange);font-size:12px">{{ dim.neutral }}</td>
            <td style="color:var(--red);font-size:12px">{{ dim.bear }}</td>
            <td><span :class="'tag ' + dim.tag">{{ dim.judge || '-' }}</span></td>
          </tr>
        </tbody>
      </table>
      <p style="font-size:12px;color:var(--text2)">核心原则：至少 3 项信号共振才确认趋势</p>
    </div>

    <!-- 判定结果 -->
    <div v-if="result" class="card" style="border-left:3px solid var(--accent)">
      <div class="card-title">综合判定</div>
      <div class="grid-3" style="text-align:center">
        <div>
          <div style="font-size:12px;color:var(--text2);margin-bottom:4px">市场状态</div>
          <span :class="'tag ' + result.tag" style="font-size:16px;padding:6px 16px">{{ result.label }}</span>
        </div>
        <div>
          <div style="font-size:12px;color:var(--text2);margin-bottom:4px">建议总仓位</div>
          <div style="font-size:20px;font-weight:700;color:var(--accent2)">{{ result.maxPosition }}</div>
        </div>
        <div>
          <div style="font-size:12px;color:var(--text2);margin-bottom:4px">推荐策略</div>
          <div style="font-size:16px;font-weight:600">{{ result.strategy }}</div>
        </div>
      </div>
      <div v-if="!result.confirmed" style="margin-top:12px;font-size:12px;color:var(--orange)">
        ⚠ 信号不足3项共振，当前判定仅供参考，建议观望或轻仓
      </div>
      <div style="margin-top:8px;font-size:12px;color:var(--text2)">
        得分：牛市 {{ result.score.bull }} 项 / 震荡 {{ result.score.neutral }} 项 / 熊市 {{ result.score.bear }} 项
      </div>
    </div>

    <!-- 做多窗口快速判定 -->
    <div class="card">
      <div class="card-title">做多窗口快速判定</div>
      <div style="line-height:2.2">
        <div class="flex" style="gap:8px">
          <span :class="['auto-check', autoChecks.aboveMA60 ? 'pass' : 'fail']">{{ autoChecks.aboveMA60 ? '✓' : '✗' }}</span>
          <span style="font-size:13px">指数收盘站上 MA60</span>
          <span style="font-size:12px;color:var(--text2)">收盘 {{ shClose }} vs MA60 {{ shMa60 }}</span>
        </div>
        <div class="flex" style="gap:8px">
          <span :class="['auto-check', autoChecks.ma60Turning ? 'pass' : 'fail']">{{ autoChecks.ma60Turning ? '✓' : '✗' }}</span>
          <span style="font-size:13px">MA60 连续 3 日拐头向上</span>
          <span style="font-size:12px;color:var(--text2)">{{ ma60TrendDesc }}</span>
        </div>
        <div class="flex" style="gap:8px">
          <span :class="['auto-check', autoChecks.breadthOk ? 'pass' : 'fail']">{{ autoChecks.breadthOk ? '✓' : '✗' }}</span>
          <span style="font-size:13px">上涨家数 > 下跌家数 1.5 倍</span>
          <span style="font-size:12px;color:var(--text2)">{{ breadthRatio }}</span>
        </div>
      </div>
      <div style="margin-top:10px">
        <span v-if="autoChecks.all" class="tag tag-bull" style="font-size:14px;padding:6px 16px">做多窗口已开启</span>
        <span v-else class="tag tag-neutral" style="font-size:14px;padding:6px 16px">做多窗口未确认（三项均需满足）</span>
      </div>
    </div>

    <!-- 交易前检查清单 -->
    <div class="card">
      <div class="card-title">交易前检查清单</div>
      <div style="columns:2;column-gap:20px">
        <label v-for="(item, i) in checklist" :key="i">
          <input type="checkbox" v-model="checklistDone[i]" /> {{ item }}
        </label>
      </div>
      <div style="margin-top:12px">
        <span v-if="checklistDone.every(v => v)" class="tag tag-bull">全部通过，可以交易</span>
        <span v-else class="tag tag-neutral">还有 {{ checklistDone.filter(v => !v).length }} 项未确认</span>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useMarketStore } from '../stores/market'
import { judgeMASystem, judgePriceVsMA, judgeNewHighs, judgeBreadth, judgeNorthbound, judgeMarket } from '../utils/marketJudge'
import { PRE_TRADE_CHECKLIST } from '../utils/tradeRules'

const store = useMarketStore()
const checklist = PRE_TRADE_CHECKLIST
const checklistDone = ref(Array(checklist.length).fill(false))

// 做多窗口自动判定
const shClose = computed(() => store.indices?.['000001']?.close?.toFixed(0) || '-')
const shMa60 = computed(() => store.indices?.['000001']?.ma60?.toFixed(0) || '-')

const ma60TrendDesc = computed(() => {
  const trend = store.indices?.['000001']?.ma60Trend
  if (!trend || trend.length < 4) return '加载中...'
  return trend.map(v => v.toFixed(0)).join(' → ')
})

const breadthRatio = computed(() => {
  const brd = store.breadth
  if (!brd) return '加载中...'
  return `上涨${brd.upCount} / 下跌${brd.downCount} = ${(brd.upCount / Math.max(brd.downCount, 1)).toFixed(2)}倍`
})

const autoChecks = computed(() => {
  const sh = store.indices?.['000001']
  const brd = store.breadth
  const aboveMA60 = sh && sh.close > sh.ma60
  const trend = sh?.ma60Trend
  const ma60Turning = trend && trend.length >= 4 && trend[3] > trend[2] && trend[2] > trend[1] && trend[1] > trend[0]
  const breadthOk = brd && brd.upCount > brd.downCount * 1.5
  return { aboveMA60, ma60Turning, breadthOk, all: aboveMA60 && ma60Turning && breadthOk }
})

const dimensions = computed(() => {
  const sh = store.indices?.['000001']
  if (!sh) return []

  const maJudge = judgeMASystem(sh.ma20, sh.ma60, sh.ma120)
  const priceJudge = judgePriceVsMA(sh.close, sh.ma60, sh.ma60Prev)
  const nbFlows = (store.northbound || []).map(n => n.netFlow)
  const nbJudge = judgeNorthbound(nbFlows)

  // 创新高/新低（用指数K线判断指数是否创20日新高/新低）
  const klines = sh.klines || []
  let highlowJudge = null, highlowValue = '加载中...'
  if (klines.length >= 20) {
    const today = klines.at(-1)
    const high20 = Math.max(...klines.slice(-20).map(k => k.high))
    const low20 = Math.min(...klines.slice(-20).map(k => k.low))
    const isHigh = today.high >= high20
    const isLow = today.low <= low20
    if (isHigh && !isLow) { highlowJudge = 'bull'; highlowValue = `今日高${today.high.toFixed(0)} 创20日新高` }
    else if (isLow && !isHigh) { highlowJudge = 'bear'; highlowValue = `今日低${today.low.toFixed(0)} 创20日新低` }
    else { highlowJudge = 'neutral'; highlowValue = `20日区间 [${low20.toFixed(0)}, ${high20.toFixed(0)}]` }
  }

  // 涨跌家数（来自 breadth API）
  const brd = store.breadth
  const breadthJudge = brd ? judgeBreadth(brd.upCount, brd.downCount) : null
  const breadthValue = brd ? `上涨${brd.upCount} / 下跌${brd.downCount}` : '加载中...'

  // 成交额趋势（沪深两市合计，5日均值 vs 20日均值）
  const shKlines = (store.indices?.['000001']?.klines || [])
  const szKlines = (store.indices?.['399001']?.klines || [])
  let volumeJudge = null, volumeValue = '加载中...'
  if (shKlines.length >= 20 && szKlines.length >= 20) {
    const amounts = shKlines.map((k, i) => k.amount + (szKlines[i]?.amount || 0))
    const avg5 = amounts.slice(-5).reduce((s, v) => s + v, 0) / 5
    const avg20 = amounts.slice(-20).reduce((s, v) => s + v, 0) / 20
    const ratio = avg5 / avg20
    if (ratio > 1.15) volumeJudge = 'bull'
    else if (ratio < 0.85) volumeJudge = 'bear'
    else volumeJudge = 'neutral'
    const todayAmt = amounts.at(-1)
    volumeValue = `今日${(todayAmt / 1e8).toFixed(0)}亿 5日均/20日均=${ratio.toFixed(2)}`
  }

  return [
    {
      key: 'ma', label: '均线排列',
      value: sh.ma20 && sh.ma60 ? `MA20=${sh.ma20?.toFixed(0)} MA60=${sh.ma60?.toFixed(0)}` : '-',
      bull: 'MA20>MA60>MA120', neutral: '均线缠绕', bear: 'MA20<MA60<MA120',
      judge: maJudge === 'bull' ? '多头' : maJudge === 'bear' ? '空头' : '缠绕',
      tag: maJudge === 'bull' ? 'tag-bull' : maJudge === 'bear' ? 'tag-bear' : 'tag-neutral',
    },
    {
      key: 'price', label: '价格位置',
      value: sh.close ? `收盘=${sh.close?.toFixed(0)}` : '-',
      bull: '收盘>MA60且拐头', neutral: '反复穿越MA60', bear: '收盘<MA60且拐头',
      judge: priceJudge === 'bull' ? '上方' : priceJudge === 'bear' ? '下方' : '附近',
      tag: priceJudge === 'bull' ? 'tag-bull' : priceJudge === 'bear' ? 'tag-bear' : 'tag-neutral',
    },
    {
      key: 'highlow', label: '创新高/新低',
      value: highlowValue,
      bull: '指数创20日新高', neutral: '区间内运行', bear: '指数创20日新低',
      judge: highlowJudge === 'bull' ? '创新高' : highlowJudge === 'bear' ? '创新低' : '区间内',
      tag: highlowJudge === 'bull' ? 'tag-bull' : highlowJudge === 'bear' ? 'tag-bear' : 'tag-neutral',
    },
    {
      key: 'breadth', label: '涨跌家数',
      value: breadthValue,
      bull: '上涨/下跌>2', neutral: '涨跌各半', bear: '下跌/上涨>2',
      judge: breadthJudge === 'bull' ? '涨多跌少' : breadthJudge === 'bear' ? '跌多涨少' : '涨跌各半',
      tag: breadthJudge === 'bull' ? 'tag-bull' : breadthJudge === 'bear' ? 'tag-bear' : 'tag-neutral',
    },
    {
      key: 'volume', label: '成交额',
      value: volumeValue,
      bull: '持续放大', neutral: '均值附近', bear: '持续萎缩',
      judge: volumeJudge === 'bull' ? '放量' : volumeJudge === 'bear' ? '缩量' : '持平',
      tag: volumeJudge === 'bull' ? 'tag-bull' : volumeJudge === 'bear' ? 'tag-bear' : 'tag-neutral',
    },
    {
      key: 'north', label: '北向资金',
      value: nbFlows.length ? `近5日: ${nbFlows.map(v => (v > 0 ? '+' : '') + (v / 1e8).toFixed(1) + '亿').join(', ')}` : '-',
      bull: '连续5日净流入', neutral: '忽正忽负', bear: '连续5日净流出',
      judge: nbJudge === 'bull' ? '净流入' : nbJudge === 'bear' ? '净流出' : '分化',
      tag: nbJudge === 'bull' ? 'tag-bull' : nbJudge === 'bear' ? 'tag-bear' : 'tag-neutral',
    },
  ]
})

const result = computed(() => {
  const sh = store.indices?.['000001']
  if (!sh) return null

  const dimArr = dimensions.value
  const signals = dimArr.map(d => d.judge === '多头' || d.judge === '上方' || d.judge === '净流入' || d.judge === '创新高' ? 'bull' : d.judge === '空头' || d.judge === '下方' || d.judge === '净流出' || d.judge === '创新低' ? 'bear' : 'neutral')

  // 成交额趋势（沪深两市合计）
  const shK = (store.indices?.['000001']?.klines || [])
  const szK = (store.indices?.['399001']?.klines || [])
  const amounts = shK.map((k, i) => k.amount + (szK[i]?.amount || 0))
  let volumeTrend = 'neutral'
  if (amounts.length >= 20) {
    const avg5 = amounts.slice(-5).reduce((s, v) => s + v, 0) / 5
    const avg20 = amounts.slice(-20).reduce((s, v) => s + v, 0) / 20
    if (avg5 / avg20 > 1.15) volumeTrend = 'bull'
    else if (avg5 / avg20 < 0.85) volumeTrend = 'bear'
  }

  // 创新高/新低（指数级别）
  const klines = sh.klines || []
  let highLowSignal = 'neutral'
  if (klines.length >= 20) {
    const today = klines.at(-1)
    if (today.high >= Math.max(...klines.slice(-20).map(k => k.high))) highLowSignal = 'bull'
    else if (today.low <= Math.min(...klines.slice(-20).map(k => k.low))) highLowSignal = 'bear'
  }

  return judgeMarket({
    ma20: sh.ma20, ma60: sh.ma60, ma120: sh.ma120,
    price: sh.close, ma60Prev: sh.ma60Prev,
    newHighs: highLowSignal === 'bull' ? 200 : 50,
    newLows: highLowSignal === 'bear' ? 200 : 50,
    upCount: store.breadth?.upCount || 2000,
    downCount: store.breadth?.downCount || 2000,
    volumeTrend,
    northbound5d: (store.northbound || []).map(n => n.netFlow),
  })
})

onMounted(() => { store.fetchAll() })
</script>

<style scoped>
.auto-check {
  display: inline-flex; align-items: center; justify-content: center;
  width: 22px; height: 22px; border-radius: 50%; font-size: 13px; font-weight: 700; flex-shrink: 0;
}
.auto-check.pass { background: rgba(34,197,94,.18); color: var(--green); }
.auto-check.fail { background: rgba(239,68,68,.18); color: var(--red); }
</style>

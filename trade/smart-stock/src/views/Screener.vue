<template>
  <div>
    <div class="flex-between" style="margin-bottom:20px">
      <h2 style="margin:0">选股筛选</h2>
      <span style="color:var(--text2);font-size:12px">四层漏斗 → 东方财富条件选股提示词</span>
    </div>

    <!-- 进度指示 -->
    <div class="card" style="padding:12px 20px">
      <div class="flex" style="gap:0;width:100%">
        <div v-for="(s, i) in steps" :key="i" class="flex" style="flex:1">
          <div :class="['step-dot', step >= i ? 'active' : '']">{{ i }}</div>
          <span :style="{ color: step >= i ? 'var(--accent2)' : 'var(--text2)', fontSize: '12px' }">{{ s }}</span>
          <div v-if="i < 3" style="flex:1;height:1px;background:var(--border);margin:0 8px;align-self:center" />
        </div>
      </div>
    </div>

    <!-- Step 0: 排雷 -->
    <div class="card">
      <div class="flex-between" style="margin-bottom:12px">
        <div class="card-title" style="margin:0">第零层：一键排雷</div>
        <button class="btn btn-ghost" style="font-size:12px" @click="toggleAllMines">
          {{ mineChecks.every(v => v) ? '取消全选' : '全选' }}
        </button>
      </div>
      <div style="columns:2;column-gap:20px">
        <label v-for="(m, i) in mines" :key="m.id">
          <input type="checkbox" v-model="mineChecks[i]" />
          <span>{{ m.label }}</span>
          <span v-if="m.f10" style="color:var(--orange);font-size:11px">(F10)</span>
        </label>
      </div>
      <div v-if="minePrompt" style="margin-top:12px">
        <div style="font-size:12px;color:var(--text2);margin-bottom:4px">排雷后缀（复制后追加到选股提示词末尾）</div>
        <div class="code-block">{{ minePrompt }}<button class="btn btn-copy" style="position:absolute;top:8px;right:8px" @click="copy(minePrompt)">复制</button></div>
      </div>
      <div class="flex" style="margin-top:12px;justify-content:flex-end">
        <button class="btn btn-primary" @click="step = 1" :disabled="mineChecks.filter(v => v).length < 5">下一步 →</button>
      </div>
    </div>

    <!-- Step 1: 基本面 -->
    <div v-if="step >= 1" class="card">
      <div class="card-title">第一层：基本面筛选</div>
      <div class="grid-2">
        <label>ROE >= <input type="number" v-model.number="fund.roe" style="width:60px" /> %</label>
        <label>营收增速 >= <input type="number" v-model.number="fund.revenueGrowth" style="width:60px" /> %</label>
        <label>净利润增速 >= <input type="number" v-model.number="fund.profitGrowth" style="width:60px" /> %</label>
        <label>负债率 <= <input type="number" v-model.number="fund.debtRatio" style="width:60px" /> %</label>
        <label>PE <input type="number" v-model.number="fund.peMin" style="width:50px" /> ~ <input type="number" v-model.number="fund.peMax" style="width:50px" /></label>
        <label>市值 >= <input type="number" v-model.number="fund.marketCapMin" style="width:60px" /> 亿</label>
        <label><input type="checkbox" v-model="fund.cashFlowPositive" /> 经营现金流为正</label>
      </div>
      <div style="margin-top:12px">
        <div style="font-size:12px;color:var(--text2);margin-bottom:4px">基本面提示词</div>
        <div class="code-block">{{ fundPrompt }}<button class="btn btn-copy" style="position:absolute;top:8px;right:8px" @click="copy(fundPrompt)">复制</button></div>
      </div>
      <div class="flex" style="margin-top:12px;justify-content:flex-end;gap:8px">
        <button class="btn btn-ghost" @click="step = 0">← 上一步</button>
        <button class="btn btn-primary" @click="step = 2">下一步 →</button>
      </div>
    </div>

    <!-- Step 2: 景气度 -->
    <div v-if="step >= 2" class="card">
      <div class="card-title">第二层：景气度方向</div>
      <div class="grid-3">
        <div v-for="opt in sentiments" :key="opt.id"
          :class="['card', 'selectable', selectedSentiment === opt.id ? 'selected' : '']"
          @click="selectedSentiment = opt.id"
          style="cursor:pointer;text-align:center">
          <div style="font-weight:600;font-size:14px">{{ opt.name }}</div>
          <div style="font-size:11px;color:var(--text2);margin-top:6px">{{ opt.prompt.slice(0, 30) }}...</div>
        </div>
      </div>
      <div v-if="selectedSentiment" style="margin-top:12px">
        <div style="font-size:12px;color:var(--text2);margin-bottom:4px">景气度提示词</div>
        <div class="code-block">{{ sentimentPrompt }}<button class="btn btn-copy" style="position:absolute;top:8px;right:8px" @click="copy(sentimentPrompt)">复制</button></div>
      </div>
      <div class="flex" style="margin-top:12px;justify-content:flex-end;gap:8px">
        <button class="btn btn-ghost" @click="step = 1">← 上一步</button>
        <button class="btn btn-primary" @click="step = 3" :disabled="!selectedSentiment">下一步 →</button>
      </div>
    </div>

    <!-- Step 3: 技术信号 -->
    <div v-if="step >= 3" class="card">
      <div class="card-title">第三层：技术信号选择</div>
      <div class="grid-3">
        <div v-for="sig in techSignals" :key="sig.id"
          :class="['card', 'selectable', selectedTech === sig.id ? 'selected' : '']"
          @click="selectedTech = sig.id"
          style="cursor:pointer;text-align:center">
          <div style="font-weight:600;font-size:14px">{{ sig.name }}</div>
          <div style="font-size:11px;color:var(--text2);margin-top:6px">{{ sig.prompt.slice(0, 30) }}...</div>
        </div>
      </div>
      <div v-if="selectedTech" style="margin-top:12px">
        <div style="font-size:12px;color:var(--text2);margin-bottom:4px">技术信号提示词</div>
        <div class="code-block">{{ techPrompt }}<button class="btn btn-copy" style="position:absolute;top:8px;right:8px" @click="copy(techPrompt)">复制</button></div>
      </div>
      <!-- PC端自定义公式 -->
      <div v-if="selectedTech" style="margin-top:12px">
        <div style="font-size:12px;color:var(--text2);margin-bottom:4px">PC端自定义公式（条件选股 → 公式编辑器）</div>
        <div class="code-block">{{ pcFormula }}<button class="btn btn-copy" style="position:absolute;top:8px;right:8px" @click="copy(pcFormula)">复制</button></div>
      </div>
      <div class="flex" style="margin-top:12px;justify-content:flex-end;gap:8px">
        <button class="btn btn-ghost" @click="step = 2">← 上一步</button>
      </div>
    </div>

    <!-- 汇总 -->
    <div v-if="step >= 3 && selectedTech" class="card" style="border-left:3px solid var(--accent)">
      <div class="card-title">完整选股提示词汇总</div>
      <div style="font-size:12px;color:var(--text2);margin-bottom:4px">复制后粘贴到东方财富 App → 条件选股 → 一句话选股</div>
      <div class="code-block" style="min-height:60px">{{ fullPrompt }}<button class="btn btn-copy" style="position:absolute;top:8px;right:8px" @click="copy(fullPrompt)">复制全部</button></div>
      <div v-if="f10Reminders.length" style="margin-top:10px;font-size:12px;color:var(--orange)">
        ⚠ 需在 F10 手动检查：{{ f10Reminders.join('、') }}
      </div>
    </div>

    <!-- 复制提示 -->
    <div v-if="copyMsg" style="position:fixed;bottom:20px;right:20px;background:var(--green);color:#fff;padding:8px 16px;border-radius:6px;font-size:13px;font-weight:600;z-index:999">
      {{ copyMsg }}
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { MINE_CHECKS, FUNDAMENTAL_DEFAULTS, TECH_SIGNALS, SENTIMENT_OPTIONS } from '../utils/tradeRules'

const steps = ['排雷', '基本面', '景气度', '技术信号']
const step = ref(0)

// Step 0: 排雷
const mines = MINE_CHECKS
const mineChecks = ref(Array(mines.length).fill(true))

function toggleAllMines() {
  const all = mineChecks.value.every(v => v)
  mineChecks.value = mineChecks.value.map(() => !all)
}

const minePrompt = computed(() => {
  const checked = mines.filter((_, i) => mineChecks.value[i]).filter(m => m.auto)
  if (!checked.length) return ''
  return '且非ST且非停牌且审计意见为标准无保留且商誉除以净资产小于30%且大股东质押比例小于60%且上市天数大于250天'
})

// Step 1: 基本面
const fund = ref({ ...FUNDAMENTAL_DEFAULTS })

const fundPrompt = computed(() => {
  const f = fund.value
  let p = `ROE大于${f.roe}%且营收同比增长大于${f.revenueGrowth}%且净利润同比增长大于${f.profitGrowth}%且资产负债率小于${f.debtRatio}%`
  if (f.cashFlowPositive) p += '且经营现金流为正'
  p += `且PE大于${f.peMin}且PE小于${f.peMax}且总市值大于${f.marketCapMin}亿`
  return p
})

// Step 2: 景气度
const sentiments = SENTIMENT_OPTIONS
const selectedSentiment = ref(null)

const sentimentPrompt = computed(() => {
  const s = sentiments.find(x => x.id === selectedSentiment.value)
  return s ? s.prompt : ''
})

// Step 3: 技术信号
const techSignals = TECH_SIGNALS
const selectedTech = ref(null)

const techPrompt = computed(() => {
  const t = techSignals.find(x => x.id === selectedTech.value)
  return t ? t.prompt : ''
})

const pcFormula = computed(() => {
  if (selectedTech.value === 'breakout') {
    return `C>REF(HHV(H,20),1) AND V>MA(V,20)*1.5 AND "MACD.MACD">0 AND MA(C,20)>REF(MA(C,20),1) AND MA(C,60)>REF(MA(C,60),1)`
  } else if (selectedTech.value === 'pullback') {
    return `C>MA(C,60) AND MA(C,60)>REF(MA(C,60),1) AND ABS(C/MA(C,20)-1)<0.02 AND MA(V,5)<MA(V,20)*0.7`
  } else if (selectedTech.value === 'bottom') {
    return `C/HHV(H,120)<0.6 AND V>REF(MA(V,5),1)*1.5 AND "RSI.RSI1">REF("RSI.RSI1",1) AND "RSI.RSI1">30 AND CROSS("MACD.DIF","MACD.DEA")`
  }
  return ''
})

// Full prompt
const fullPrompt = computed(() => {
  let p = fundPrompt.value
  if (selectedSentiment.value) p += '且' + sentimentPrompt.value
  if (selectedTech.value) p += '且' + techPrompt.value
  if (minePrompt.value) p += minePrompt.value
  return p
})

// F10 reminders
const f10Reminders = computed(() => {
  return mines.filter((m, i) => m.f10 && mineChecks.value[i]).map(m => m.label)
})

// Copy
const copyMsg = ref('')
async function copy(text) {
  try {
    await navigator.clipboard.writeText(text)
    copyMsg.value = '已复制到剪贴板'
    setTimeout(() => { copyMsg.value = '' }, 1500)
  } catch {
    copyMsg.value = '复制失败，请手动选择'
    setTimeout(() => { copyMsg.value = '' }, 2000)
  }
}
</script>

<style scoped>
.step-dot {
  width: 24px; height: 24px; border-radius: 50%; display: flex; align-items: center; justify-content: center;
  font-size: 11px; font-weight: 700; background: var(--surface2); color: var(--text2); flex-shrink: 0; margin-right: 6px;
}
.step-dot.active { background: var(--accent); color: #fff; }
.selectable { border: 2px solid transparent; transition: all .15s; }
.selectable:hover { border-color: var(--border); }
.selectable.selected { border-color: var(--accent); background: rgba(59,130,246,.08); }
</style>

<template>
  <div class="guide-layout">
    <!-- 左侧固定导航 -->
    <aside class="guide-nav">
      <div class="guide-nav-title">策略速查</div>
      <nav class="guide-nav-list">
        <a v-for="s in scenarios" :key="s.id" :class="['guide-nav-item', { active: activeSection === s.id }]" @click.prevent="scrollTo(s.id)">
          {{ s.label }}
        </a>
      </nav>
    </aside>

    <!-- 右侧滚动内容 -->
    <div class="guide-content">
    <!-- 想买入 -->
    <div :id="'sec-buy'" class="card">
      <div class="flex-between" style="margin-bottom:12px">
        <div class="card-title" style="margin:0">买入决策树</div>
        <span class="tag tag-blue">4.6</span>
      </div>
      <div class="decision-tree">
        <div v-for="(node, i) in buyTree" :key="i" class="tree-node">
          <span class="tree-q">{{ node.q }}</span>
          <span :class="['tag', node.yes ? 'tag-bull' : 'tag-neutral']" style="margin-left:8px">{{ node.yes ? '是 →' : '否 →' }}</span>
          <span class="tree-a">{{ node.a }}</span>
        </div>
      </div>
    </div>

    <!-- 买入策略详情 -->
    <div :id="'sec-strategy'" class="card">
      <div class="flex-between" style="margin-bottom:12px">
        <div class="card-title" style="margin:0">三种买入策略</div>
        <span class="tag tag-blue">4.1-4.4</span>
      </div>
      <div v-for="(s, k) in STRATEGY_DETAILS" :key="k" style="margin-bottom:16px">
        <div class="flex-between" style="cursor:pointer" @click="toggleStrategy(k)">
          <div class="flex" style="gap:8px">
            <span style="font-weight:600">{{ s.name }}</span>
            <span class="tag tag-neutral" style="font-size:10px">N={{ STRATEGY_PARAMS[k].n }} | 回撤{{ (STRATEGY_PARAMS[k].callback * 100).toFixed(0) }}%</span>
          </div>
          <span style="color:var(--text2);font-size:12px">{{ expandedStrategy[k] ? '收起' : '展开' }}</span>
        </div>
        <div v-if="expandedStrategy[k]" style="margin-top:10px;padding-left:12px;border-left:2px solid var(--border)">
          <div style="font-size:12px;color:var(--text2);margin-bottom:6px">入场条件（全部满足）：</div>
          <div v-for="(r, ri) in s.rules" :key="ri" style="font-size:13px;padding:3px 0;padding-left:12px">
            <span style="color:var(--accent2)">{{ ri + 1 }}.</span> {{ r }}
          </div>
          <div class="grid-2" style="margin-top:8px;font-size:12px;color:var(--text2)">
            <div>时间止损：{{ s.timeStop }}</div>
            <div>适用市场：{{ strategyMarket[k] }}</div>
          </div>
        </div>
      </div>

      <!-- 适用场景总表 -->
      <table style="margin-top:8px">
        <thead>
          <tr><th>策略</th><th>适用市场</th><th>持有期</th><th>风险等级</th><th>收益预期</th></tr>
        </thead>
        <tbody>
          <tr><td>趋势突破</td><td>牛市/强趋势</td><td>1-4周</td><td><span class="tag tag-neutral">中</span></td><td>高</td></tr>
          <tr><td>回调买入</td><td>震荡上行</td><td>2-8周</td><td><span class="tag tag-bull">低-中</span></td><td>中-高</td></tr>
          <tr><td>底部右侧确认</td><td>熊转牛初期</td><td>1-6月</td><td><span class="tag tag-bear">高</span></td><td>极高</td></tr>
        </tbody>
      </table>
    </div>

    <!-- 要卖出 -->
    <div :id="'sec-sell'" class="card">
      <div class="flex-between" style="margin-bottom:12px">
        <div class="card-title" style="margin:0">卖出规则</div>
        <span class="tag tag-blue">5.1-5.3</span>
      </div>

      <!-- 卖出优先级 -->
      <div style="font-size:13px;font-weight:600;margin-bottom:8px">卖出优先级</div>
      <div v-for="(p, i) in sellPriority" :key="i" class="flex" style="margin-bottom:8px;padding:8px 12px;background:var(--surface2);border-radius:6px;align-items:flex-start">
        <span :class="['tag', p.tag]" style="flex-shrink:0;margin-right:8px;margin-top:2px">P{{ i + 1 }}</span>
        <div>
          <div style="font-size:13px;font-weight:600">{{ p.title }}</div>
          <div style="font-size:12px;color:var(--text2)">{{ p.desc }}</div>
        </div>
      </div>

      <!-- ATR止损 -->
      <div style="margin-top:16px;font-size:13px;font-weight:600;margin-bottom:8px">ATR 动态止损</div>
      <div class="code-block" style="font-size:12px">止损价 = 买入价 - N × ATR(14)

N 取值：
  趋势突破 → N = 1.5（紧止损）
  回调买入 → N = 2.0（适度止损）
  底部右侧确认 → N = 3.0（宽止损）

止损优先级 = min(ATR止损, 技术止损, 固定百分比止损)</div>

      <!-- 跟踪止盈 -->
      <div style="margin-top:16px;font-size:13px;font-weight:600;margin-bottom:8px">跟踪止盈（只上不下）</div>
      <div class="code-block" style="font-size:12px">每日更新：跟踪止盈价 = max(昨日止盈价, 最高收盘价 × (1 - 回撤%))

回撤比例：
  趋势突破 → 8%
  回调买入 → 15%
  底部右侧确认 → 20%

触发：收盘价 < 跟踪止盈价 → 次日开盘卖出</div>

      <!-- 其他止损 -->
      <table style="margin-top:16px">
        <thead><tr><th>止损类型</th><th>规则</th></tr></thead>
        <tbody>
          <tr><td>技术止损</td><td>跌破关键支撑位（均线/前低/趋势线），以先触发者为准</td></tr>
          <tr><td>时间止损</td><td>买入后N日未按预期运行 → 出场（具体天数见策略表）</td></tr>
          <tr><td>逻辑止损</td><td>买入逻辑被证伪（业绩暴雷、政策转向）→ 立即出场</td></tr>
          <tr><td>总仓位止损</td><td>账户回撤 >10% 减至半仓；>15% 空仓休息</td></tr>
        </tbody>
      </table>
    </div>

    <!-- 不知仓位 -->
    <div :id="'sec-position'" class="card">
      <div class="flex-between" style="margin-bottom:12px">
        <div class="card-title" style="margin:0">仓位管理</div>
        <span class="tag tag-blue">6.1-6.4</span>
      </div>

      <!-- 总仓位 -->
      <div style="font-size:13px;font-weight:600;margin-bottom:8px">总仓位控制</div>
      <table style="margin-bottom:16px">
        <thead><tr><th>大盘状态</th><th>总仓位上限</th><th>判定条件</th></tr></thead>
        <tbody>
          <tr><td><span class="tag tag-bull">牛市确认</span></td><td>80-100%</td><td>均线多头排列 + 市场广度共振</td></tr>
          <tr><td><span class="tag tag-bull">震荡偏多</span></td><td>50-70%</td><td>站上MA60但未确认趋势</td></tr>
          <tr><td><span class="tag tag-bear">震荡偏空</span></td><td>20-40%</td><td>跌破MA60但未确认熊市</td></tr>
          <tr><td><span class="tag tag-bear">熊市</span></td><td>0-20%</td><td>均线空头排列 + 广度全面走弱</td></tr>
        </tbody>
      </table>

      <!-- 个股仓位 -->
      <div style="font-size:13px;font-weight:600;margin-bottom:8px">个股仓位规则</div>
      <div class="code-block" style="font-size:12px">核心公式：单只仓位 = min(总资金 × 2% / 止损幅度, 总资金 × 25%)

约束条件：
  单只上限：25%（绝对硬性上限）
  单只标准：10-15%（常规配置）
  同行业：不超过总仓位 40%
  同产业链：不超过 3 只
  持仓数量：5-10 只</div>

      <!-- 加减仓 -->
      <table style="margin-top:16px">
        <thead><tr><th>操作</th><th>条件</th><th>动作</th></tr></thead>
        <tbody>
          <tr><td style="color:var(--green)">加仓</td><td>浮盈 > 1.5×ATR + 趋势延续确认</td><td>金字塔加仓（递减：40%→30%→20%）</td></tr>
          <tr><td style="color:var(--orange)">减仓</td><td>浮盈从最高点回撤超50%</td><td>减至半仓</td></tr>
          <tr><td style="color:var(--red)">清仓</td><td>触发止损或逻辑破坏</td><td>全部卖出</td></tr>
          <tr><td style="color:var(--red)">禁止补仓</td><td>亏损时绝不在亏损方向加仓</td><td>止损而非补仓</td></tr>
        </tbody>
      </table>
    </div>

    <!-- 铁律 -->
    <div :id="'sec-rules'" class="card">
      <div class="flex-between" style="margin-bottom:12px">
        <div class="card-title" style="margin:0">七条铁律（零容忍）</div>
        <span class="tag tag-blue">7.2</span>
      </div>
      <div v-for="rule in IRON_RULES" :key="rule.id" style="margin-bottom:10px;padding:10px 14px;background:var(--surface2);border-radius:6px">
        <div class="flex" style="gap:8px">
          <span style="color:var(--red);font-weight:700;font-size:16px;width:24px">{{ rule.id }}</span>
          <div style="flex:1">
            <div style="font-size:13px;font-weight:600">{{ rule.rule }}</div>
            <div style="font-size:12px;color:var(--text2);margin-top:2px">{{ rule.detail }}</div>
            <div style="font-size:11px;color:var(--red);margin-top:2px">违反后果：{{ rule.consequence }}</div>
          </div>
        </div>
      </div>
    </div>

    <!-- 情绪波动 -->
    <div :id="'sec-psychology'" class="card">
      <div class="flex-between" style="margin-bottom:12px">
        <div class="card-title" style="margin:0">心理管理</div>
        <span class="tag tag-blue">7.3</span>
      </div>
      <div v-for="emo in emotions" :key="emo.name" style="margin-bottom:10px;padding:10px 14px;border:1px solid var(--border);border-radius:6px">
        <div class="flex-between">
          <span style="font-weight:600;font-size:14px">{{ emo.icon }} {{ emo.name }}</span>
          <span style="font-size:12px;color:var(--text2)">{{ emo.trigger }}</span>
        </div>
        <div style="margin-top:6px;font-size:13px;color:var(--accent2)">
          应对：{{ emo.solution }}
        </div>
      </div>
    </div>

    <!-- 每日执行流程 -->
    <div :id="'sec-daily'" class="card">
      <div class="flex-between" style="margin-bottom:12px">
        <div class="card-title" style="margin:0">每日执行流程</div>
        <span class="tag tag-blue">八</span>
      </div>

      <!-- 盘前 -->
      <div style="margin-bottom:16px">
        <div class="flex" style="gap:8px;margin-bottom:8px">
          <span class="tag tag-bull">盘前</span>
          <span style="font-weight:600;font-size:13px">8:30 - 9:25</span>
        </div>
        <div v-for="t in dailyFlow.pre" :key="t.time" class="flex" style="margin-bottom:6px;padding-left:12px">
          <span style="color:var(--accent2);font-size:12px;width:80px;flex-shrink:0">{{ t.time }}</span>
          <span style="font-size:13px">{{ t.task }}</span>
        </div>
      </div>

      <!-- 盘中 -->
      <div style="margin-bottom:16px">
        <div class="flex" style="gap:8px;margin-bottom:8px">
          <span class="tag tag-neutral">盘中</span>
          <span style="font-weight:600;font-size:13px">9:30 - 15:00</span>
        </div>
        <div v-for="t in dailyFlow.intra" :key="t.time" class="flex" style="margin-bottom:6px;padding-left:12px">
          <span style="color:var(--accent2);font-size:12px;width:80px;flex-shrink:0">{{ t.time }}</span>
          <span style="font-size:13px">{{ t.task }}</span>
        </div>
      </div>

      <!-- 盘后 -->
      <div>
        <div class="flex" style="gap:8px;margin-bottom:8px">
          <span class="tag tag-blue">盘后</span>
          <span style="font-weight:600;font-size:13px">15:00 之后</span>
        </div>
        <div v-for="t in dailyFlow.post" :key="t.time" class="flex" style="margin-bottom:6px;padding-left:12px">
          <span style="color:var(--accent2);font-size:12px;width:80px;flex-shrink:0">{{ t.time }}</span>
          <span style="font-size:13px">{{ t.task }}</span>
        </div>
      </div>
    </div>

    <!-- 系统失效判定 -->
    <div class="card" style="border-left:3px solid var(--red)">
      <div class="card-title">系统失效判定（出现任一即暂停交易）</div>
      <div v-for="(rule, i) in systemFailRules" :key="i" class="flex" style="margin-bottom:6px">
        <span style="color:var(--red);font-size:14px;font-weight:700;width:20px;flex-shrink:0">{{ i + 1 }}</span>
        <span style="font-size:13px">{{ rule }}</span>
      </div>
    </div>

    <!-- 核心公式 -->
    <div class="card">
      <div class="card-title">系统核心</div>
      <div class="code-block" style="text-align:center;font-size:14px;font-weight:600;line-height:2">
长期盈利 = 正期望策略 × 严格风险控制 × 纪律性执行 × 时间复利

缺少任何一项，长期结果归零。</div>
      <table style="margin-top:12px">
        <thead><tr><th>要素</th><th>一句话</th></tr></thead>
        <tbody>
          <tr><td>选股</td><td>先排雷，再筛好公司，在好价格买入</td></tr>
          <tr><td>买入</td><td>等信号，不追涨，分批建仓，走决策树</td></tr>
          <tr><td>卖出</td><td>ATR动态止损铁律不可破，跟踪止盈按算法走</td></tr>
          <tr><td>仓位</td><td>单笔风险≤2%，单只上限≤25%，总仓位随大盘调整</td></tr>
          <tr><td>纪律</td><td>盘前计划，盘中执行，盘后复盘，不临时起意</td></tr>
          <tr><td>进化</td><td>数据驱动迭代，任何改动先回测验证</td></tr>
        </tbody>
      </table>
    </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive } from 'vue'
import { STRATEGY_DETAILS, IRON_RULES } from '../utils/tradeRules'
import { STRATEGY_PARAMS } from '../utils/position'

const activeSection = ref('')

const scenarios = [
  { id: 'sec-buy', label: '想买入', icon: '' },
  { id: 'sec-strategy', label: '买入策略', icon: '' },
  { id: 'sec-sell', label: '要卖出', icon: '' },
  { id: 'sec-position', label: '不知仓位', icon: '' },
  { id: 'sec-rules', label: '铁律', icon: '' },
  { id: 'sec-psychology', label: '情绪波动', icon: '' },
  { id: 'sec-daily', label: '每日流程', icon: '' },
]

function scrollTo(id) {
  activeSection.value = id
  document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

// 买入决策树
const buyTree = [
  { q: '触发排雷清单？', yes: false, a: '直接跳过' },
  { q: '基本面符合标准？', yes: false, a: '加入观察池，不操作' },
  { q: '大盘状态允许买入？', yes: false, a: '加入观察池，等待' },
  { q: '出现买入信号？', yes: false, a: '设置提醒价格，等待' },
  { q: '盈亏比 >= 2:1？', yes: false, a: '跳过（目标空间不够）' },
  { q: '计算仓位 ≤ 25%？', yes: true, a: '执行买入 + 设止损 + 记录交易计划' },
]

// 策略展开
const expandedStrategy = reactive({ trend: true, pullback: false, bottom: false })
function toggleStrategy(k) { expandedStrategy[k] = !expandedStrategy[k] }

const strategyMarket = { trend: '牛市/强趋势', pullback: '震荡上行', bottom: '熊转牛初期' }

// 卖出优先级
const sellPriority = [
  { title: '触发止损', desc: '立即卖出，不犹豫（当日收盘前或次日开盘）', tag: 'tag-bear' },
  { title: '买入逻辑破坏', desc: '尽快卖出（当日或次日）', tag: 'tag-bear' },
  { title: '止盈信号出现', desc: '执行止盈计划（可设条件单）', tag: 'tag-neutral' },
  { title: '发现更好机会', desc: '换股（仅当新机会盈亏比 ≥ 3:1）', tag: 'tag-blue' },
]

// 情绪管理
const emotions = [
  { name: '贪婪', icon: '', trigger: '连续盈利，想加仓加杠杆', solution: '回顾规则，严格执行仓位上限' },
  { name: '恐惧', icon: '', trigger: '连续亏损，不敢下单', solution: '缩小仓位恢复信心，检查系统是否失效' },
  { name: '后悔', icon: '', trigger: '卖出后继续涨 / 未买入的涨了', solution: '接受不确定性，关注过程而非结果' },
  { name: '侥幸', icon: '', trigger: '亏损持仓期待回本', solution: '执行止损，市场不关心你的成本' },
  { name: '疲劳', icon: '', trigger: '盯盘过度，决策质量下降', solution: '设定交易时段，其余时间不盯盘' },
]

// 每日流程
const dailyFlow = {
  pre: [
    { time: '8:30-8:50', task: '信息收集：隔夜美股、财经新闻、A50期货、重大事件' },
    { time: '8:50-9:10', task: '持仓审视：逐只检查止损/止盈，更新跟踪止盈价，记录需操作项' },
    { time: '9:10-9:15', task: '计划确认：确认关注标的及触发价，预设计条件单，写禁做事项' },
  ],
  intra: [
    { time: '9:30-10:00', task: '开盘观察：不急于操作，等待15分钟后价格稳定' },
    { time: '10:00-11:30', task: '交易执行：条件单触发按计划执行，无触发则不操作' },
    { time: '11:30-13:00', task: '午间复盘：回顾上午操作，查看资金流向，调整下午重点' },
    { time: '13:00-14:30', task: '下午观察：继续监控条件单，关注板块轮动' },
    { time: '14:30-15:00', task: '尾盘决策：检查是否需调仓，确认成交记录，不做临时隔夜决策' },
  ],
  post: [
    { time: '15:00-15:30', task: '交易记录：填写交易记录表，记录操作及理由，自评执行评分' },
    { time: '15:30-16:00', task: '持仓更新：更新现价/盈亏/止损位/跟踪止盈价，标记明日信号' },
    { time: '16:00-16:30', task: '信息整理：盘后公告、龙虎榜，整理明日关注要点，写明日计划' },
  ],
}

// 系统失效
const systemFailRules = [
  '连续 5 次交易止损 → 检查选股/买入条件是否失效',
  '单月亏损 > 8% → 检查仓位管理是否合规',
  '最大回撤 > 15% → 降低仓位，回归模拟盘',
  '月度胜率连续3月 < 30% → 系统可能不适应当前市场',
  '绩效连续3月跑输沪深300 → 重新评估策略有效性',
]
</script>

<style scoped>
.guide-layout {
  display: flex;
  gap: 24px;
  align-items: flex-start;
}

.guide-nav {
  position: sticky;
  top: 68px;
  width: 140px;
  flex-shrink: 0;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 16px 0;
  max-height: calc(100vh - 84px);
  overflow-y: auto;
}

.guide-nav-title {
  font-size: 16px;
  font-weight: 700;
  padding: 0 16px 12px;
  border-bottom: 1px solid var(--border);
  margin-bottom: 8px;
}

.guide-nav-list {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.guide-nav-item {
  display: block;
  padding: 8px 16px;
  font-size: 13px;
  color: var(--text2);
  cursor: pointer;
  transition: all .15s;
  border-left: 2px solid transparent;
}

.guide-nav-item:hover {
  color: var(--text);
  background: var(--surface2);
}

.guide-nav-item.active {
  color: var(--accent2);
  background: rgba(59, 130, 246, .1);
  border-left-color: var(--accent);
}

.guide-content {
  flex: 1;
  min-width: 0;
}

.decision-tree { border-left: 2px solid var(--border); padding-left: 16px; }
.tree-node { padding: 6px 0; display: flex; align-items: center; flex-wrap: wrap; gap: 4px; }
.tree-q { font-size: 13px; font-weight: 600; }
.tree-a { font-size: 13px; color: var(--text2); }

@media (max-width: 768px) {
  .guide-layout { flex-direction: column; }
  .guide-nav {
    position: static;
    width: 100%;
    max-height: none;
  }
  .guide-nav-list {
    flex-direction: row;
    flex-wrap: wrap;
    gap: 4px;
    padding: 8px 12px;
  }
  .guide-nav-item {
    border-left: none;
    border-bottom: 2px solid transparent;
    padding: 6px 12px;
    border-radius: 6px;
  }
  .guide-nav-item.active {
    border-left-color: transparent;
    border-bottom-color: var(--accent);
  }
}
</style>

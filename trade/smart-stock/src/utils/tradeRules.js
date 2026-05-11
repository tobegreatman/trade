/**
 * 交易规则数据（从《顶级股票交易系统》文档提取）
 */

// 排雷条件
export const MINE_CHECKS = [
  { id: 'st', label: '非ST', auto: true },
  { id: 'suspend', label: '非停牌', auto: true },
  { id: 'audit', label: '审计意见：标准无保留', auto: true },
  { id: 'goodwill', label: '商誉/净资产 < 30%', auto: true },
  { id: 'pledge', label: '大股东质押 < 60%', auto: true },
  { id: 'listing', label: '上市天数 > 250天', auto: true },
  { id: 'related', label: '关联交易/营收 < 40%', auto: false, f10: true },
  { id: 'cashDebt', label: '无存贷双高', auto: false, f10: true },
  { id: 'insider', label: '董监高减持 < 5%', auto: false, f10: true },
  { id: 'litigation', label: '无重大诉讼/处罚', auto: false, f10: true },
]

// 基本面筛选条件
export const FUNDAMENTAL_DEFAULTS = {
  roe: 12, revenueGrowth: 10, profitGrowth: 10, debtRatio: 60,
  cashFlowPositive: true, peMin: 5, peMax: 40, marketCapMin: 30,
}

// 技术信号选项
export const TECH_SIGNALS = [
  { id: 'breakout', name: '趋势突破', prompt: '今天放量突破20日高点且MACD金叉且MACD柱为正且20日均线向上且60日均线向上' },
  { id: 'pullback', name: '回调买入', prompt: '股价在60日均线上方且60日均线向上且近5日缩量回调至20日均线附近且今日成交量为近20日最低' },
  { id: 'bottom', name: '底部右侧确认', prompt: '股价从半年高点下跌超过40%且近5日成交量萎缩后今日放量且RSI从30以下拐头向上且MACD金叉' },
]

// 景气度方向
export const SENTIMENT_OPTIONS = [
  { id: 'institution', name: '机构增持', prompt: '机构持股比例较上季度增加且北向资金持股比例增加且近30日主力净流入' },
  { id: 'earnings', name: '业绩超预期', prompt: '最新报告期净利润同比增长大于30%且营收同比增长大于20%且近60日研报数量大于3' },
  { id: 'dragon', name: '龙虎榜强势', prompt: '近3日龙虎榜上榜且买方机构席位数量大于卖方机构席位且换手率大于3%小于20%且流通市值大于30亿' },
]

// 策略参数
export const STRATEGY_DETAILS = {
  trend: {
    name: '趋势突破', n: 1.5, callback: 0.08, timeStop: '5日未突破前高→出场',
    rules: [
      '收盘价 > 20日最高价 且 成交量 > 20日均量×1.5',
      'MACD金叉 且 柱状图 > 0',
      '大盘非熊市',
      '盈亏比 >= 2:1',
    ],
  },
  pullback: {
    name: '回调买入', n: 2.0, callback: 0.15, timeStop: '8日未企稳→出场',
    rules: [
      '收盘价 > MA60 且 MA60拐头向上',
      '股价回调至MA20或MA60 ±2%',
      'MA(VOL,5) < MA(VOL,20) × 0.7',
      '出现企稳K线（锤子/吞没/十字星）',
    ],
  },
  bottom: {
    name: '底部右侧确认', n: 3.0, callback: 0.20, timeStop: '15日未确认→出场',
    rules: [
      '从高点跌幅 > 40%',
      '出现底部形态（早晨之星/底部吞没/W底）',
      '大盘同期企稳',
      '实盘资金不超过总资金5%',
    ],
  },
}

// 交易前检查清单
export const PRE_TRADE_CHECKLIST = [
  '大盘环境是否适合交易？',
  '该股是否通过排雷清单？',
  '基本面是否符合标准？',
  '是否有明确的买入信号？',
  '止损位是否已设定？（用ATR计算）',
  '盈亏比是否 >= 2:1？',
  '仓位是否在风险预算内？（≤25%）',
  '是否在冷静状态下决策？',
  '是否已设条件单/提醒？',
]

// 铁律
export const IRON_RULES = [
  { id: 1, rule: '止损不可撤销', detail: '到了止损位必须卖，不抱任何幻想', consequence: '小亏变大亏' },
  { id: 2, rule: '不追涨杀跌', detail: '没有信号不进场，不因FOMO买入', consequence: '高位接盘/低位割肉' },
  { id: 3, rule: '不逆势满仓', detail: '熊市不加杠杆，震荡市不满仓', consequence: '爆仓/深度套牢' },
  { id: 4, rule: '不在亏损仓位加仓', detail: '亏了不加码，止损而非补仓', consequence: '亏损放大' },
  { id: 5, rule: '不过度交易', detail: '有信号才交易，每月不超10次', consequence: '手续费吞噬利润' },
  { id: 6, rule: '不碰不懂的票', detail: '没研究过的不买，不跟风听消息', consequence: '盲目赌博' },
  { id: 7, rule: '不临时起意', detail: '盘中不产生新想法，所有计划盘前制定', consequence: '情绪化操作' },
]

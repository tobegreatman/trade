# SmartStock - 智能股票交易辅助系统

基于《顶级股票交易系统》构建的 Vue + Koa2 全栈应用，将交易规则体系转化为可交互的盘中操作工具。

## 功能

### 大盘状态（Dashboard）
- 六维市场状态自动判定：均线排列、价格位置、创新高/新低、涨跌家数、成交额、北向资金
- 综合判定输出：市场状态（牛/震荡/熊）+ 建议总仓位 + 推荐策略
- 做多窗口快速判定（三项自动检测）
- 交易前检查清单

### 选股筛选（Screener）
- 四层漏斗交互式筛选：排雷 → 基本面 → 景气度 → 技术信号
- 每层自动生成东方财富一句话选股提示词，一键复制
- PC 端自定义公式输出

### 仓位计算（Position）
- ATR 动态仓位计算：输入买入价 + ATR → 止损价 / 建议仓位 / 盈亏比
- 输入股票代码自动获取 ATR(14)
- 持仓管理（CRUD）+ 跟踪止盈价更新
- 行业集中度自动检查

### 策略速查（Guide）
- 按场景快速定位：想买入 / 要卖出 / 不知仓位 / 铁律 / 情绪管理 / 每日流程
- 左侧固定导航，右侧内容滚动
- 完整覆盖交易系统买入决策树、卖出优先级、仓位公式、七条铁律、心理管理、每日执行流程

## 技术栈

| 层 | 技术 |
|---|------|
| 前端 | Vue 3 + Vite + Vue Router + Pinia |
| 后端 | Koa2（薄代理层，解决跨域） |
| 数据源 | 东方财富公开接口 |
| 持久化 | localStorage |

## 项目结构

```
smart-stock/
├── server/
│   ├── index.js              # Koa2 入口
│   └── routes/
│       ├── market.js          # 大盘数据（指数、涨跌家数、北向资金）
│       └── stock.js           # 个股数据（K线、基本面）
├── src/
│   ├── main.js
│   ├── App.vue
│   ├── router/index.js
│   ├── stores/
│   │   ├── market.js          # 大盘状态 store
│   │   └── portfolio.js       # 持仓 store
│   ├── views/
│   │   ├── Dashboard.vue      # 大盘状态
│   │   ├── Screener.vue       # 选股筛选
│   │   ├── Position.vue       # 仓位计算
│   │   ├── Guide.vue          # 策略速查
│   │   └── Journal.vue        # 交易日志（占位）
│   ├── components/
│   │   └── NavBar.vue
│   ├── utils/
│   │   ├── marketJudge.js     # 六维市场判定算法
│   │   ├── position.js        # 仓位/盈亏比/跟踪止盈计算
│   │   ├── market.js          # ATR/MA 计算工具
│   │   └── tradeRules.js      # 交易规则数据
│   └── styles/
│       └── main.css           # 全局样式（深色主题）
└── package.json
```

## 启动

```bash
npm install
npm start
```

- 前端：http://localhost:3000
- 后端 API：http://localhost:3001

也可分别启动：

```bash
npm run dev      # 仅前端
npm run server   # 仅后端
```

## API 接口

| 接口 | 说明 |
|------|------|
| `GET /api/market/indices` | 上证/深证/创业板指数 + MA20/60/120 + 60日K线 |
| `GET /api/market/breadth` | 沪深两市涨跌家数 |
| `GET /api/market/northbound` | 北向资金近5日净流入 |
| `GET /api/stock/:code/kline` | 个股120日K线（用于ATR计算） |
| `GET /api/stock/:code/basic` | 个股基本面指标 |

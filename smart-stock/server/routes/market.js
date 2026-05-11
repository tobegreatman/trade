import Router from '@koa/router'

const router = new Router()

// Helper: fetch from eastmoney
async function fetchEM(url) {
  const res = await fetch(url, {
    headers: { 'Referer': 'https://finance.eastmoney.com/', 'User-Agent': 'Mozilla/5.0' }
  })
  return res.json()
}

// 大盘指数 + 均线数据
router.get('/indices', async ctx => {
  try {
    // 上证指数 kline (前复权, 日k, 最近120日)
    const codes = { '000001': '上证', '399001': '深证', '399006': '创业板' }
    const result = {}
    for (const [code, name] of Object.entries(codes)) {
      const prefix = code.startsWith('399') ? '0' : '1'
      const url = `https://push2his.eastmoney.com/api/qt/stock/kline/get?secid=${prefix}.${code}&fields1=f1,f2,f3,f4,f5,f6&fields2=f51,f52,f53,f54,f55,f56,f57&klt=101&fqt=1&end=20500101&lmt=120`
      const data = await fetchEM(url)
      const klines = (data.data?.klines || []).map(s => {
        const [date, open, close, high, low, volume, amount] = s.split(',')
        return { date, open: +open, close: +close, high: +high, low: +low, volume: +volume, amount: +amount }
      })
      // 计算 MA20/60/120
      const closes = klines.map(k => k.close)
      const calcMA = (arr, p) => arr.length >= p ? arr.slice(-p).reduce((s, v) => s + v, 0) / p : null
      // 近4日MA60，用于判断连续拐头
      const ma60Trend = []
      if (closes.length >= 63) {
        for (let i = 3; i >= 0; i--) {
          const end = closes.length - i
          ma60Trend.push(closes.slice(end - 60, end).reduce((s, v) => s + v, 0) / 60)
        }
      }
      result[code] = {
        name, close: klines.at(-1)?.close, ma20: calcMA(closes, 20),
        ma60: calcMA(closes, 60), ma120: calcMA(closes, 120),
        ma60Prev: closes.length > 60 ? (closes.slice(-61, -1).reduce((s, v) => s + v, 0) / 60) : null,
        ma60Trend,
        klines: klines.slice(-60),
      }
    }
    ctx.body = { ok: true, data: result }
  } catch (e) {
    ctx.body = { ok: false, error: e.message }
  }
})

// 涨跌家数（沪深两市合计）
router.get('/breadth', async ctx => {
  try {
    // f113=上涨家数 f114=下跌家数 f115=平盘家数
    const [shData, szData] = await Promise.all([
      fetchEM(`https://push2.eastmoney.com/api/qt/stock/get?secid=1.000001&fields=f113,f114,f115`),
      fetchEM(`https://push2.eastmoney.com/api/qt/stock/get?secid=0.399001&fields=f113,f114,f115`),
    ])

    const upCount = (shData.data?.f113 || 0) + (szData.data?.f113 || 0)
    const downCount = (shData.data?.f114 || 0) + (szData.data?.f114 || 0)
    const flatCount = (shData.data?.f115 || 0) + (szData.data?.f115 || 0)

    ctx.body = {
      ok: true,
      data: {
        totalStocks: upCount + downCount + flatCount,
        upCount,
        downCount,
        flatCount,
        detail: {
          sh: { up: shData.data?.f113 || 0, down: shData.data?.f114 || 0 },
          sz: { up: szData.data?.f113 || 0, down: szData.data?.f114 || 0 },
        },
      }
    }
  } catch (e) {
    ctx.body = { ok: false, error: e.message }
  }
})

// 北向资金近5日
router.get('/northbound', async ctx => {
  try {
    const url = `https://push2his.eastmoney.com/api/qt/kamtbs.wss?fields1=f1,f2,f3&fields2=f51,f52,f53,f54,f55,f56&klt=101&lmt=5`
    const data = await fetchEM(url)
    const flows = (data.data?.s2n || []).map(s => {
      const [date, , , , hkToSh, hkToSz] = s.split(',')
      return { date, netFlow: +(hkToSh || 0) + +(hkToSz || 0) }
    })
    ctx.body = { ok: true, data: flows }
  } catch (e) {
    ctx.body = { ok: false, error: e.message }
  }
})

export default router

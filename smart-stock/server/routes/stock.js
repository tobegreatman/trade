import Router from '@koa/router'

const router = new Router()

async function fetchEM(url) {
  const res = await fetch(url, {
    headers: { 'Referer': 'https://finance.eastmoney.com/', 'User-Agent': 'Mozilla/5.0' }
  })
  return res.json()
}

// 个股K线（近120日，用于算ATR和均线）
router.get('/:code/kline', async ctx => {
  try {
    const code = ctx.params.code
    const prefix = code.startsWith('6') ? '1' : '0'
    const url = `https://push2his.eastmoney.com/api/qt/stock/kline/get?secid=${prefix}.${code}&fields1=f1,f2,f3,f4,f5,f6&fields2=f51,f52,f53,f54,f55,f56,f57&klt=101&fqt=1&end=20500101&lmt=120`
    const data = await fetchEM(url)
    const klines = (data.data?.klines || []).map((s, i, arr) => {
      const [date, open, close, high, low, volume, amount] = s.split(',')
      const prevClose = i > 0 ? arr[i - 1].split(',')[2] : close
      return { date, open: +open, close: +close, high: +high, low: +low, prevClose: +prevClose, volume: +volume, amount: +amount }
    })
    ctx.body = { ok: true, data: klines }
  } catch (e) {
    ctx.body = { ok: false, error: e.message }
  }
})

// 个股分时（当日1分钟K线）
router.get('/:code/intraday', async ctx => {
  try {
    const code = ctx.params.code
    const prefix = code.startsWith('6') ? '1' : '0'
    const url = `https://push2his.eastmoney.com/api/qt/stock/trends2/get?secid=${prefix}.${code}&fields1=f1,f2,f3,f4,f5,f6,f7,f8,f9,f10,f11,f12,f13&fields2=f51,f52,f53,f54,f55,f56,f57,f58&ndays=1&iscr=0`
    const data = await fetchEM(url)
    const preClose = data.data?.preClose ?? data.data?.preSettlement ?? 0
    const trends = (data.data?.trends || []).map(s => {
      const parts = s.split(',')
      const time = (parts[0] || '').split(' ')[1] || parts[0]
      return { time, close: +parts[1], avg: +parts[7], volume: +parts[5] }
    })
    ctx.body = { ok: true, data: { trends, preClose } }
  } catch (e) {
    ctx.body = { ok: false, error: e.message }
  }
})

// 个股基本面
router.get('/:code/basic', async ctx => {
  try {
    const code = ctx.params.code
    // 实时行情（含 PE、PB、市值）
    const prefix = code.startsWith('6') ? '1' : '0'
    const quoteUrl = `https://push2.eastmoney.com/api/qt/stock/get?secid=${prefix}.${code}&fields=f9,f23,f20,f115,f116,f117,f162,f167,f170`
    const quoteData = await fetchEM(quoteUrl)
    ctx.body = { ok: true, data: quoteData.data || {} }
  } catch (e) {
    ctx.body = { ok: false, error: e.message }
  }
})

// 个股长期K线（5年日线，用于走势图）
router.get('/:code/kline5y', async ctx => {
  try {
    const code = ctx.params.code
    const prefix = code.startsWith('6') ? '1' : '0'
    const url = `https://push2his.eastmoney.com/api/qt/stock/kline/get?secid=${prefix}.${code}&fields1=f1,f2,f3,f4,f5,f6&fields2=f51,f52,f53,f54,f55,f56,f57&klt=101&fqt=1&end=20500101&lmt=1200`
    const data = await fetchEM(url)
    const klines = (data.data?.klines || []).map(s => {
      const [date, open, close, high, low, volume, amount] = s.split(',')
      return { date, open: +open, close: +close, high: +high, low: +low, volume: +volume, amount: +amount }
    })
    ctx.body = { ok: true, data: klines }
  } catch (e) {
    ctx.body = { ok: false, error: e.message }
  }
})

// 批量行情（用于股票池）
router.get('/batch/quotes', async ctx => {
  try {
    const codes = (ctx.query.codes || '').split(',').filter(Boolean)
    if (!codes.length) { ctx.body = { ok: true, data: {} }; return }
    const secids = codes.map(c => `${c.startsWith('6') ? '1' : '0'}.${c}`).join(',')
    const url = `https://push2.eastmoney.com/api/qt/ulist.np/get?fields=f1,f2,f3,f4,f12,f13,f14,f15,f16,f6&secids=${secids}`
    const data = await fetchEM(url)
    const result = {}
    for (const item of (data.data?.diff || [])) {
      result[item.f12] = {
        name: item.f14, close: item.f2, change: item.f3, changeAmt: item.f4,
        high: item.f15, low: item.f16, amount: item.f6,
      }
    }
    ctx.body = { ok: true, data: result }
  } catch (e) {
    ctx.body = { ok: false, error: e.message }
  }
})

// 股票搜索（支持名称、代码、拼音）
router.get('/search', async ctx => {
  try {
    const kw = (ctx.query.kw || '').trim()
    if (!kw) { ctx.body = { ok: true, data: [] }; return }
    const url = `https://searchapi.eastmoney.com/api/suggest/get?input=${encodeURIComponent(kw)}&type=14&token=D43BF722C8E33BDC906FB84D85E326E8&count=8`
    const data = await fetchEM(url)
    const items = (data.QuotationCodeTable?.Data || [])
      .filter(d => d.Classify === 'AStock')
      .map(d => ({ code: d.Code, name: d.Name, type: d.SecurityTypeName }))
    ctx.body = { ok: true, data: items }
  } catch (e) {
    ctx.body = { ok: false, error: e.message }
  }
})

export default router

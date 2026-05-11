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

export default router

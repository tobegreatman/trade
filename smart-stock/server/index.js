import Koa from 'koa'
import cors from '@koa/cors'
import Router from '@koa/router'
import marketRoutes from './routes/market.js'
import stockRoutes from './routes/stock.js'

const app = new Koa()
const router = new Router()

app.use(cors())
app.use(router.routes())
app.use(router.allowedMethods())

// Mount sub-routes
router.use('/api/market', marketRoutes.routes(), marketRoutes.allowedMethods())
router.use('/api/stock', stockRoutes.routes(), stockRoutes.allowedMethods())

// Health check
router.get('/api/health', ctx => { ctx.body = { ok: true } })

const PORT = 3001
app.listen(PORT, () => console.log(`API server running on http://localhost:${PORT}`))

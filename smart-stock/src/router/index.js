import { createRouter, createWebHistory } from 'vue-router'

const routes = [
  { path: '/', name: 'Dashboard', component: () => import('../views/Dashboard.vue'), meta: { title: '大盘状态' } },
  { path: '/watchlist', name: 'Watchlist', component: () => import('../views/Watchlist.vue'), meta: { title: '股票池' } },
  { path: '/screener', name: 'Screener', component: () => import('../views/Screener.vue'), meta: { title: '选股筛选' } },
  { path: '/position', name: 'Position', component: () => import('../views/Position.vue'), meta: { title: '仓位计算' } },
  { path: '/journal', name: 'Journal', component: () => import('../views/Journal.vue'), meta: { title: '交易日志' } },
  { path: '/guide', name: 'Guide', component: () => import('../views/Guide.vue'), meta: { title: '策略速查' } },
]

export default createRouter({ history: createWebHistory(), routes })

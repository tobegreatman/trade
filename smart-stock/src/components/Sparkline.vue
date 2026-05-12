<template>
  <canvas ref="canvasRef" :style="autoWidth ? 'display:block;width:100%' : ''" />
</template>

<script setup>
import { ref, watch, onMounted, onUnmounted, nextTick } from 'vue'

const props = defineProps({
  data: Array,
  positive: Boolean,
  width: { type: Number, default: 52 },
  height: { type: Number, default: 24 },
  showArea: Boolean,
  refPrice: Number,
  autoWidth: Boolean
})

const canvasRef = ref(null)
let resizeObs = null

function getDrawWidth() {
  if (props.autoWidth && canvasRef.value?.parentElement) {
    return canvasRef.value.parentElement.clientWidth
  }
  return props.width
}

function draw() {
  const canvas = canvasRef.value
  if (!canvas || !props.data?.length) return

  const dpr = window.devicePixelRatio || 1
  let w, h = props.height

  if (props.autoWidth) {
    // Let CSS control width (100%), read actual rendered size
    canvas.style.height = h + 'px'
    w = canvas.clientWidth
  } else {
    w = props.width
    canvas.style.width = w + 'px'
    canvas.style.height = h + 'px'
  }

  if (w <= 0) return
  canvas.width = w * dpr
  canvas.height = h * dpr

  const ctx = canvas.getContext('2d')
  if (!ctx) return
  ctx.scale(dpr, dpr)
  ctx.clearRect(0, 0, w, h)

  const closes = props.data.map(k => k.close)
  let min = Math.min(...closes), max = Math.max(...closes)

  // Include refPrice in range for reference line positioning
  if (props.refPrice) {
    min = Math.min(min, props.refPrice)
    max = Math.max(max, props.refPrice)
  }
  const range = max - min || 1
  const pad = props.showArea ? 4 : 2
  const xStep = (w - pad * 2) / (closes.length - 1)

  const yOf = v => h - pad - ((v - min) / range) * (h - pad * 2)

  // Reference price line (dashed)
  if (props.refPrice) {
    const ry = yOf(props.refPrice)
    ctx.beginPath()
    ctx.setLineDash([4, 3])
    ctx.moveTo(pad, ry)
    ctx.lineTo(w - pad, ry)
    ctx.strokeStyle = 'rgba(142,142,147,.4)'
    ctx.lineWidth = 1
    ctx.stroke()
    ctx.setLineDash([])
  }

  // Line
  const color = props.positive ? '#30d158' : '#ff453a'
  ctx.beginPath()
  closes.forEach((c, i) => {
    const x = pad + i * xStep
    const y = yOf(c)
    i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)
  })
  ctx.strokeStyle = color
  ctx.lineWidth = props.showArea ? 1.8 : 1.2
  ctx.lineJoin = 'round'
  ctx.stroke()

  // Area fill
  if (props.showArea) {
    const lastX = pad + (closes.length - 1) * xStep
    ctx.lineTo(lastX, h)
    ctx.lineTo(pad, h)
    ctx.closePath()
    const grad = ctx.createLinearGradient(0, 0, 0, h)
    grad.addColorStop(0, props.positive ? 'rgba(48,209,88,.15)' : 'rgba(255,69,58,.15)')
    grad.addColorStop(1, 'transparent')
    ctx.fillStyle = grad
    ctx.fill()

    // Price labels
    ctx.font = '11px -apple-system, sans-serif'
    ctx.fillStyle = '#8e8e93'
    ctx.textAlign = 'right'
    ctx.fillText(max.toFixed(2), w - 4, pad + 12)
    ctx.fillText(min.toFixed(2), w - 4, h - pad - 2)

    // Ref price label
    if (props.refPrice) {
      const ry = yOf(props.refPrice)
      ctx.fillStyle = '#636366'
      ctx.textAlign = 'left'
      ctx.fillText(props.refPrice.toFixed(2), pad + 2, ry - 4)
    }
  }
}

onMounted(() => {
  nextTick(draw)
  if (props.autoWidth && canvasRef.value?.parentElement && typeof ResizeObserver !== 'undefined') {
    resizeObs = new ResizeObserver(() => draw())
    resizeObs.observe(canvasRef.value.parentElement)
  }
})
onUnmounted(() => { resizeObs?.disconnect() })
watch(() => props.data, () => nextTick(draw), { deep: true })
watch(() => props.width, () => nextTick(draw))
watch(() => props.positive, () => nextTick(draw))
watch(() => props.refPrice, () => nextTick(draw))
</script>

import starData from './stars.json'
import constellationData from './constellations.json'
import { arcBetween, createSkyProjection, equatorialVector } from './coordinates'
import type { SkyPoint } from './coordinates'

const stars = starData.map(([id, ra, dec, magnitude]) => ({
  id, magnitude, vector: equatorialVector(ra, dec)
}))
const constellationArcs = constellationData.flatMap(line => {
  const vectors = line.map(([ra, dec]) => equatorialVector(ra, dec))
  return vectors.slice(1).map((vector, index) => arcBetween(vectors[index], vector))
})

interface PaintedStar extends SkyPoint { id: number; magnitude: number; radius: number; alpha: number }
export function mountSky(canvas: HTMLCanvasElement) {
  const context = canvas.getContext('2d')
  const base = document.createElement('canvas')
  const baseContext = base.getContext('2d')
  if (!context || !baseContext) throw new Error('Canvas 2D is unavailable')
  const ctx = context
  const backdrop = baseContext
  const motion = window.matchMedia('(prefers-reduced-motion: reduce)')
  let width = 0
  let height = 0
  let ratio = 1
  let ink = '32, 34, 38'
  let brightStars: PaintedStar[] = []
  let frame = 0
  let lastFrame = 0
  let lastProjection = 0
  let disposed = false

  function paintStar(target: CanvasRenderingContext2D, star: PaintedStar, pulse = 1) {
    const alpha = star.alpha * pulse
    // Small round cores and soft optical halos, sized by catalog magnitude.
    if (star.magnitude < 2.4) {
      const haloRadius = star.radius * 4.5
      const halo = target.createRadialGradient(star.x, star.y, .1, star.x, star.y, haloRadius)
      halo.addColorStop(0, `rgba(${ink},${alpha * .2})`)
      halo.addColorStop(.35, `rgba(${ink},${alpha * .055})`)
      halo.addColorStop(1, `rgba(${ink},0)`)
      target.fillStyle = halo
      target.beginPath()
      target.arc(star.x, star.y, haloRadius, 0, Math.PI * 2)
      target.fill()
    }
    target.fillStyle = `rgba(${ink},${alpha})`
    target.beginPath()
    target.arc(star.x, star.y, star.radius, 0, Math.PI * 2)
    target.fill()
  }

  function rebuild(date: Date) {
    if (!width || !height || disposed) return
    lastProjection = date.getTime()
    ink = document.documentElement.classList.contains('dark') ? '228, 230, 234' : '32, 34, 38'
    const project = createSkyProjection(date, width, height)
    backdrop.clearRect(0, 0, width, height)
    // Faint reference lines make actual constellation patterns recognizable.
    backdrop.strokeStyle = `rgba(${ink},.14)`
    backdrop.lineWidth = .65
    backdrop.beginPath()
    for (const arc of constellationArcs) {
      let drawing = false
      for (const vector of arc) {
        const point = project(vector)
        if (!point) { drawing = false; continue }
        if (drawing) backdrop.lineTo(point.x, point.y)
        else backdrop.moveTo(point.x, point.y)
        drawing = true
      }
    }
    backdrop.stroke()
    brightStars = []
    let visibleStars = 0
    for (const star of stars) {
      const point = project(star.vector)
      if (!point || point.x < -10 || point.x > width + 10 || point.y < -10 || point.y > height + 10) continue
      visibleStars++
      const painted = {
        ...point, id: star.id, magnitude: star.magnitude,
        radius: .48 + 3.4 * Math.exp(-.43 * (star.magnitude + 1.5)),
        alpha: Math.min(.96, .25 + (6 - star.magnitude) * .12)
      }
      if (star.magnitude < 3.5) brightStars.push(painted)
      else paintStar(backdrop, painted)
    }
    canvas.dataset.visibleStars = String(visibleStars)
    canvas.dataset.skyTime = date.toISOString()
  }

  function draw(time: number) {
    // Layout/route changes can briefly collapse the canvas before ResizeObserver runs.
    if (!width || !height || !base.width || !base.height || disposed) return
    ctx.clearRect(0, 0, width, height)
    ctx.drawImage(base, 0, 0, width, height)
    for (const star of brightStars) {
      // Scintillation changes brightness only; star positions stay astronomical.
      const phase = star.id * 2.39996
      const strength = .12 + (1 - star.altitude / 90) * .12
      const pulse = motion.matches ? 1 : 1 - strength + strength * Math.sin(time / 740 + phase) * Math.sin(time / 1310 + phase)
      paintStar(ctx, star, pulse)
    }
  }

  function animate(time: number) {
    if (disposed || document.hidden || motion.matches) return
    frame = requestAnimationFrame(animate)
    if (time - lastFrame < 50) return // cap decorative twinkling at 20 fps
    lastFrame = time
    if (Math.abs(Date.now() - lastProjection) >= 10000) rebuild(new Date())
    draw(time)
  }

  function refresh() {
    if (disposed || document.hidden) return
    rebuild(new Date())
    draw(performance.now())
  }

  function syncAnimation() {
    cancelAnimationFrame(frame)
    if (document.hidden || disposed) return
    refresh()
    if (!motion.matches) frame = requestAnimationFrame(animate)
  }

  function resize() {
    if (disposed) return
    const bounds = canvas.getBoundingClientRect()
    width = bounds.width
    height = bounds.height
    ratio = Math.min(window.devicePixelRatio || 1, 2)
    for (const surface of [canvas, base]) {
      surface.width = Math.round(width * ratio)
      surface.height = Math.round(height * ratio)
    }
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0)
    backdrop.setTransform(ratio, 0, 0, ratio, 0, 0)
    refresh()
  }

  const resizeObserver = new ResizeObserver(resize)
  resizeObserver.observe(canvas)
  const themeObserver = new MutationObserver(refresh)
  themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] })
  motion.addEventListener('change', syncAnimation)
  document.addEventListener('visibilitychange', syncAnimation)
  window.addEventListener('resize', resize)
  // Reduced-motion users still receive current astronomical positions.
  const clock = window.setInterval(() => { if (motion.matches) refresh() }, 10000)
  resize()
  syncAnimation()

  return () => {
    disposed = true
    cancelAnimationFrame(frame)
    window.clearInterval(clock)
    resizeObserver.disconnect()
    themeObserver.disconnect()
    motion.removeEventListener('change', syncAnimation)
    document.removeEventListener('visibilitychange', syncAnimation)
    window.removeEventListener('resize', resize)
  }
}

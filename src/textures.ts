import * as THREE from 'three'

function makeCanvas(size: number) {
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  return canvas
}

function speckle(
  ctx: CanvasRenderingContext2D,
  size: number,
  count: number,
  colors: string[],
  minR: number,
  maxR: number,
  alphaRange: [number, number],
) {
  for (let i = 0; i < count; i += 1) {
    const x = Math.random() * size
    const y = Math.random() * size
    const r = minR + Math.random() * (maxR - minR)
    ctx.globalAlpha = alphaRange[0] + Math.random() * (alphaRange[1] - alphaRange[0])
    ctx.fillStyle = colors[Math.floor(Math.random() * colors.length)]
    ctx.beginPath()
    ctx.arc(x, y, r, 0, Math.PI * 2)
    ctx.fill()
  }
  ctx.globalAlpha = 1
}

function blotches(
  ctx: CanvasRenderingContext2D,
  size: number,
  count: number,
  colors: string[],
  minR: number,
  maxR: number,
  alpha: number,
) {
  for (let i = 0; i < count; i += 1) {
    const x = Math.random() * size
    const y = Math.random() * size
    const r = minR + Math.random() * (maxR - minR)
    const color = colors[Math.floor(Math.random() * colors.length)]
    const gradient = ctx.createRadialGradient(x, y, 0, x, y, r)
    gradient.addColorStop(0, color)
    gradient.addColorStop(1, 'rgba(0,0,0,0)')
    ctx.globalAlpha = alpha
    ctx.fillStyle = gradient
    ctx.beginPath()
    ctx.arc(x, y, r, 0, Math.PI * 2)
    ctx.fill()
  }
  ctx.globalAlpha = 1
}

function cracks(ctx: CanvasRenderingContext2D, size: number, count: number, color: string) {
  ctx.strokeStyle = color
  ctx.lineWidth = 1
  for (let i = 0; i < count; i += 1) {
    let x = Math.random() * size
    let y = Math.random() * size
    ctx.globalAlpha = 0.2 + Math.random() * 0.25
    ctx.beginPath()
    ctx.moveTo(x, y)
    const segments = 4 + Math.floor(Math.random() * 5)
    for (let s = 0; s < segments; s += 1) {
      x += (Math.random() - 0.5) * size * 0.12
      y += (Math.random() - 0.5) * size * 0.12
      ctx.lineTo(x, y)
    }
    ctx.stroke()
  }
  ctx.globalAlpha = 1
}

function toTexture(canvas: HTMLCanvasElement, linear = false) {
  const texture = new THREE.CanvasTexture(canvas)
  texture.wrapS = THREE.RepeatWrapping
  texture.wrapT = THREE.RepeatWrapping
  texture.anisotropy = 8
  texture.colorSpace = linear ? THREE.NoColorSpace : THREE.SRGBColorSpace
  return texture
}

const cache = new Map<string, THREE.CanvasTexture>()

function cached(key: string, build: () => THREE.CanvasTexture) {
  const hit = cache.get(key)
  if (hit) return hit
  const texture = build()
  cache.set(key, texture)
  return texture
}

/**
 * Build a tangent-space normal map from a grayscale height field drawn by
 * `drawHeight`. A Sobel filter turns luminance gradients into surface normals,
 * giving cheap, believable micro-relief that reacts to light far better than a
 * bump map — the core of the realism bump for walls, ground and roof.
 */
function makeNormalTexture(key: string, size: number, strength: number, drawHeight: (ctx: CanvasRenderingContext2D) => void) {
  return cached(key, () => {
    const src = makeCanvas(size)
    const sctx = src.getContext('2d')!
    sctx.fillStyle = '#808080'
    sctx.fillRect(0, 0, size, size)
    drawHeight(sctx)
    const height = sctx.getImageData(0, 0, size, size).data

    const out = makeCanvas(size)
    const octx = out.getContext('2d')!
    const dst = octx.createImageData(size, size)

    const lum = (x: number, y: number) => {
      const xi = (x + size) % size
      const yi = (y + size) % size
      return height[(yi * size + xi) * 4] / 255
    }

    for (let y = 0; y < size; y += 1) {
      for (let x = 0; x < size; x += 1) {
        const dx =
          lum(x - 1, y - 1) + 2 * lum(x - 1, y) + lum(x - 1, y + 1) -
          (lum(x + 1, y - 1) + 2 * lum(x + 1, y) + lum(x + 1, y + 1))
        const dy =
          lum(x - 1, y - 1) + 2 * lum(x, y - 1) + lum(x + 1, y - 1) -
          (lum(x - 1, y + 1) + 2 * lum(x, y + 1) + lum(x + 1, y + 1))
        const nx = dx * strength
        const ny = dy * strength
        const nz = 1
        const len = Math.hypot(nx, ny, nz)
        const idx = (y * size + x) * 4
        dst.data[idx] = ((nx / len) * 0.5 + 0.5) * 255
        dst.data[idx + 1] = ((ny / len) * 0.5 + 0.5) * 255
        dst.data[idx + 2] = ((nz / len) * 0.5 + 0.5) * 255
        dst.data[idx + 3] = 255
      }
    }
    octx.putImageData(dst, 0, 0)
    return toTexture(out, true)
  })
}

export function getGrassNormal() {
  return makeNormalTexture('grass-normal', 512, 2.2, (ctx) => {
    speckle(ctx, 512, 9000, ['#b6b6b6', '#4a4a4a', '#d0d0d0', '#3a3a3a'], 0.5, 1.9, [0.4, 0.85])
  })
}

export function getAsphaltNormal() {
  return makeNormalTexture('asphalt-normal', 512, 1.8, (ctx) => {
    speckle(ctx, 512, 8000, ['#a8a8a8', '#5a5a5a', '#c0c0c0'], 0.4, 1.4, [0.4, 0.8])
    cracks(ctx, 512, 7, '#2a2a2a')
  })
}

export function getConcreteNormal() {
  return makeNormalTexture('concrete-normal', 512, 2, (ctx) => {
    speckle(ctx, 512, 4200, ['#9a9a9a', '#6a6a6a', '#aeaeae'], 0.4, 1.5, [0.3, 0.6])
    ctx.strokeStyle = '#3a3a3a'
    ctx.lineWidth = 3
    const step = 512 / 4
    for (let i = 1; i < 4; i += 1) {
      ctx.beginPath()
      ctx.moveTo(i * step, 0)
      ctx.lineTo(i * step, 512)
      ctx.stroke()
      ctx.beginPath()
      ctx.moveTo(0, i * step)
      ctx.lineTo(512, i * step)
      ctx.stroke()
    }
  })
}

export function getGravelNormal() {
  return makeNormalTexture('gravel-normal', 512, 3.2, (ctx) => {
    speckle(ctx, 512, 16000, ['#c8c8c8', '#3a3a3a', '#e0e0e0', '#2a2a2a'], 0.7, 2.3, [0.5, 0.95])
  })
}

export function getWallNormal() {
  return makeNormalTexture('wall-normal', 512, 0.9, (ctx) => {
    speckle(ctx, 512, 6000, ['#8e8e8e', '#727272', '#9a9a9a'], 0.5, 1.8, [0.25, 0.5])
  })
}

export function getGrassTexture() {
  return cached('grass', () => {
    const size = 512
    const canvas = makeCanvas(size)
    const ctx = canvas.getContext('2d')!
    ctx.fillStyle = '#79a055'
    ctx.fillRect(0, 0, size, size)
    blotches(ctx, size, 26, ['#6b924a', '#87ac62', '#5f8442', '#93b76e'], size * 0.08, size * 0.24, 0.5)
    speckle(ctx, size, 9000, ['#6f9450', '#8fb56a', '#5c7f40', '#9bc178', '#729a4f', '#557a3c'], 0.5, 1.8, [0.14, 0.4])
    return toTexture(canvas)
  })
}

export function getAsphaltTexture() {
  return cached('asphalt', () => {
    const size = 512
    const canvas = makeCanvas(size)
    const ctx = canvas.getContext('2d')!
    ctx.fillStyle = '#34373d'
    ctx.fillRect(0, 0, size, size)
    blotches(ctx, size, 14, ['#2c2f34', '#3c4046', '#292b30'], size * 0.1, size * 0.3, 0.4)
    speckle(ctx, size, 7000, ['#3d4047', '#2a2c31', '#45484f', '#26282d', '#50545c'], 0.4, 1.4, [0.15, 0.45])
    cracks(ctx, size, 7, '#1e2024')
    return toTexture(canvas)
  })
}

export function getConcreteTexture() {
  return cached('concrete', () => {
    const size = 512
    const canvas = makeCanvas(size)
    const ctx = canvas.getContext('2d')!
    ctx.fillStyle = '#c8ccd2'
    ctx.fillRect(0, 0, size, size)
    blotches(ctx, size, 12, ['#c0c4ca', '#d0d4da', '#b8bcc2'], size * 0.1, size * 0.28, 0.4)
    speckle(ctx, size, 5200, ['#bdc1c8', '#d3d6db', '#b3b7bd', '#a9adb4'], 0.4, 1.4, [0.1, 0.3])
    ctx.strokeStyle = 'rgba(80,86,95,0.5)'
    ctx.lineWidth = 2
    const step = size / 4
    for (let i = 1; i < 4; i += 1) {
      ctx.beginPath()
      ctx.moveTo(i * step, 0)
      ctx.lineTo(i * step, size)
      ctx.stroke()
      ctx.beginPath()
      ctx.moveTo(0, i * step)
      ctx.lineTo(size, i * step)
      ctx.stroke()
    }
    return toTexture(canvas)
  })
}

export function getGravelTexture() {
  return cached('gravel', () => {
    const size = 512
    const canvas = makeCanvas(size)
    const ctx = canvas.getContext('2d')!
    ctx.fillStyle = '#7d8189'
    ctx.fillRect(0, 0, size, size)
    speckle(ctx, size, 16000, ['#8d919a', '#6c7078', '#9ba0a9', '#5d6169', '#aab0ba'], 0.7, 2.2, [0.35, 0.75])
    return toTexture(canvas)
  })
}

export function getWallNoiseTexture() {
  return cached('wall-noise', () => {
    const size = 512
    const canvas = makeCanvas(size)
    const ctx = canvas.getContext('2d')!
    ctx.fillStyle = '#f4f4f4'
    ctx.fillRect(0, 0, size, size)
    blotches(ctx, size, 10, ['#eeeeee', '#f8f8f8', '#e8e8e8'], size * 0.12, size * 0.3, 0.35)
    speckle(ctx, size, 5000, ['#ececec', '#fbfbfb', '#e4e4e4'], 0.5, 2.0, [0.05, 0.15])
    return toTexture(canvas)
  })
}

export function setRepeat(texture: THREE.Texture, x: number, y: number) {
  texture.repeat.set(x, y)
  texture.needsUpdate = true
}

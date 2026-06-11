import { useEffect, useRef, useState } from 'react'

const COLORS = [
  '#008080', '#00d4d4', '#4ade80', '#c9a84c', '#ffd700',
  '#ffffff', '#60a5fa', '#f472b6', '#a78bfa', '#34d399',
]

function randomBetween(a, b) { return a + Math.random() * (b - a) }

function makeParticle(w, h) {
  return {
    x: randomBetween(0, w),
    y: randomBetween(-h * 0.3, -10),
    r: randomBetween(4, 9),
    color: COLORS[Math.floor(Math.random() * COLORS.length)],
    tilt: randomBetween(-10, 10),
    tiltSpeed: randomBetween(0.05, 0.15) * (Math.random() > 0.5 ? 1 : -1),
    vx: randomBetween(-2.5, 2.5),
    vy: randomBetween(3, 7),
    shape: Math.random() > 0.4 ? 'rect' : 'circle',
    opacity: 1,
    decay: randomBetween(0.008, 0.018),
  }
}

const MESSAGES = {
  teammate: { headline: 'Congrats on the new teammate!', sub: name => `${name} is joining Team RISE!` },
  client:   { headline: 'Congrats on the new client!',   sub: name => `${name} is now part of the family!` },
}

export default function Confetti({ active, name, type = 'teammate', onDone }) {
  const msg = MESSAGES[type] || MESSAGES.teammate
  const canvasRef = useRef(null)
  const frameRef  = useRef(null)
  const particles = useRef([])
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (!active) return
    setVisible(true)

    const canvas = canvasRef.current
    const ctx    = canvas.getContext('2d')
    let W = window.innerWidth
    let H = window.innerHeight
    canvas.width  = W
    canvas.height = H

    // Burst: spawn 220 particles immediately
    particles.current = Array.from({ length: 220 }, () => makeParticle(W, H))

    let spawnTimer = 0
    let doneTimer  = null

    function draw(ts) {
      ctx.clearRect(0, 0, W, H)

      // Trickle more particles for first 1.5s
      spawnTimer += 1
      if (spawnTimer % 3 === 0 && spawnTimer < 90) {
        for (let i = 0; i < 4; i++) particles.current.push(makeParticle(W, H))
      }

      particles.current.forEach(p => {
        p.x    += p.vx
        p.y    += p.vy
        p.tilt += p.tiltSpeed
        p.vy   += 0.08  // gravity
        p.vx   *= 0.995 // slight drag
        if (p.y > H * 0.7) p.opacity -= p.decay

        ctx.save()
        ctx.globalAlpha = Math.max(0, p.opacity)
        ctx.translate(p.x, p.y)
        ctx.rotate((p.tilt * Math.PI) / 180)
        ctx.fillStyle = p.color

        if (p.shape === 'rect') {
          ctx.fillRect(-p.r / 2, -p.r / 2, p.r, p.r * 2.2)
        } else {
          ctx.beginPath()
          ctx.arc(0, 0, p.r, 0, Math.PI * 2)
          ctx.fill()
        }
        ctx.restore()
      })

      particles.current = particles.current.filter(p => p.opacity > 0)

      if (particles.current.length > 0) {
        frameRef.current = requestAnimationFrame(draw)
      } else {
        setVisible(false)
        onDone?.()
      }
    }

    // Auto-close overlay after 3.2s even if particles still going
    doneTimer = setTimeout(() => {
      setVisible(false)
      onDone?.()
    }, 3200)

    frameRef.current = requestAnimationFrame(draw)

    function onResize() {
      W = window.innerWidth
      H = window.innerHeight
      canvas.width  = W
      canvas.height = H
    }
    window.addEventListener('resize', onResize)

    return () => {
      cancelAnimationFrame(frameRef.current)
      clearTimeout(doneTimer)
      window.removeEventListener('resize', onResize)
    }
  }, [active])

  if (!active && !visible) return null

  return (
    <div className="confetti-wrap" onClick={() => { setVisible(false); onDone?.() }}>
      <canvas ref={canvasRef} className="confetti-canvas" />
      <div className="confetti-msg">
        <div className="confetti-emoji">🎉</div>
        <div className="confetti-headline">{msg.headline}</div>
        {name && <div className="confetti-name">{msg.sub(name)}</div>}
        <div className="confetti-tap">tap anywhere to dismiss</div>
      </div>
    </div>
  )
}

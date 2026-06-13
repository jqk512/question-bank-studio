import { useEffect, useRef } from 'react'

const emojis = ['✨', '🧠', '💡', '⚡', '📚', '🔍', '🎯', '🫧']

export function VisualEffects() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const context = canvas.getContext('webgl', { alpha: false, antialias: false, powerPreference: 'high-performance' })
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (!context) return
    const gl = context

    const vertexSource = `
      attribute vec2 a_position;
      void main() { gl_Position = vec4(a_position, 0.0, 1.0); }
    `
    const fragmentSource = `
      precision highp float;
      uniform vec2 u_resolution;
      uniform vec2 u_pointer;
      uniform float u_time;
      uniform float u_energy;
      float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
      float noise(vec2 p) {
        vec2 i = floor(p); vec2 f = fract(p); f = f * f * (3.0 - 2.0 * f);
        return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x), mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x), f.y);
      }
      float fbm(vec2 p) {
        float value = 0.0; float amplitude = 0.5; mat2 rotation = mat2(0.80, -0.60, 0.60, 0.80);
        for (int i = 0; i < 5; i++) { value += amplitude * noise(p); p = rotation * p * 2.03 + 13.7; amplitude *= 0.5; }
        return value;
      }
      vec3 palette(float t) {
        vec3 cyan = vec3(0.13, 0.90, 1.00); vec3 blue = vec3(0.08, 0.18, 1.00);
        vec3 orange = vec3(1.00, 0.34, 0.08); vec3 yellow = vec3(1.00, 0.96, 0.18);
        vec3 first = mix(cyan, blue, smoothstep(0.0, 0.48, fract(t)));
        vec3 second = mix(orange, yellow, smoothstep(0.48, 1.0, fract(t)));
        return mix(first, second, smoothstep(0.30, 0.76, fract(t + 0.18)));
      }
      void main() {
        vec2 uv = gl_FragCoord.xy / u_resolution.xy; vec2 p = uv - 0.5; p.x *= u_resolution.x / u_resolution.y;
        vec2 pointer = u_pointer - 0.5; pointer.x *= u_resolution.x / u_resolution.y;
        float d = length(p - pointer); float ripple = sin(d * 42.0 - u_time * 5.0) * exp(-d * 7.0) * u_energy;
        float time = u_time * 0.055;
        vec2 q = vec2(fbm(p * 2.25 + vec2(time, -time)), fbm(p * 2.25 + vec2(4.1, 2.3 - time)));
        vec2 r = vec2(fbm(p * 3.4 + q * 2.1 + ripple), fbm(p * 3.1 + q * 2.6 - ripple + 7.2));
        float field = fbm(p * 4.4 + r * 2.8 + q * 1.4);
        float bands = sin((field + r.x * 0.55 + p.x * 0.12) * 27.0 + ripple * 5.0);
        float laser = smoothstep(0.22, 0.96, abs(bands));
        vec3 base = vec3(0.018, 0.028, 0.16); vec3 acid = palette(field * 2.3 + r.y + ripple * 0.35);
        vec3 color = mix(base, acid, 0.44 + laser * 0.40);
        color += acid * pow(1.0 - abs(bands), 7.0) * 0.34;
        color += vec3(0.20, 0.62, 1.0) * exp(-d * 8.0) * u_energy * 0.45;
        float vignette = smoothstep(0.95, 0.18, length(p * vec2(0.74, 0.94)));
        color *= 0.56 + vignette * 0.70; color = pow(color, vec3(0.86)); gl_FragColor = vec4(color, 1.0);
      }
    `

    function compile(type: number, source: string) {
      const shader = gl.createShader(type)
      if (!shader) return null
      gl.shaderSource(shader, source)
      gl.compileShader(shader)
      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) return null
      return shader
    }

    const vertex = compile(gl.VERTEX_SHADER, vertexSource)
    const fragment = compile(gl.FRAGMENT_SHADER, fragmentSource)
    if (!vertex || !fragment) return
    const program = gl.createProgram()
    if (!program) return
    gl.attachShader(program, vertex); gl.attachShader(program, fragment); gl.linkProgram(program)
    const buffer = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, buffer)
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW); gl.useProgram(program)
    const position = gl.getAttribLocation(program, 'a_position')
    const resolution = gl.getUniformLocation(program, 'u_resolution')
    const pointerLocation = gl.getUniformLocation(program, 'u_pointer')
    const timeLocation = gl.getUniformLocation(program, 'u_time')
    const energyLocation = gl.getUniformLocation(program, 'u_energy')
    gl.enableVertexAttribArray(position); gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0)

    let width = 1; let height = 1; let frame = 0; let energy = 0
    const pointer = { x: 0.72, y: 0.34 }
    const resize = () => {
      const ratio = Math.min(window.devicePixelRatio || 1, 1.5)
      width = Math.max(1, window.innerWidth); height = Math.max(1, window.innerHeight)
      canvas.width = Math.round(width * ratio); canvas.height = Math.round(height * ratio)
      gl.viewport(0, 0, canvas.width, canvas.height)
    }
    const updatePointer = (event: { clientX: number; clientY: number }) => {
      pointer.x = event.clientX / width; pointer.y = 1 - event.clientY / height; energy = Math.min(1, energy + 0.32)
    }
    const pointerMove = (event: PointerEvent) => updatePointer(event)
    const pointerDown = (event: PointerEvent) => { updatePointer(event); energy = 1 }
    const touchMove = (event: TouchEvent) => { if (event.touches[0]) updatePointer(event.touches[0]) }
    const render = (milliseconds = 0) => {
      energy *= 0.965
      gl.uniform2f(resolution, canvas.width, canvas.height); gl.uniform2f(pointerLocation, pointer.x, pointer.y)
      gl.uniform1f(timeLocation, reducedMotion ? 0 : milliseconds * 0.001); gl.uniform1f(energyLocation, reducedMotion ? 0 : energy)
      gl.drawArrays(gl.TRIANGLES, 0, 3)
      if (!reducedMotion) frame = requestAnimationFrame(render)
    }
    resize(); render()
    window.addEventListener('resize', resize); window.addEventListener('pointermove', pointerMove, { passive: true })
    window.addEventListener('pointerdown', pointerDown, { passive: true }); window.addEventListener('touchmove', touchMove, { passive: true })
    return () => {
      cancelAnimationFrame(frame); window.removeEventListener('resize', resize); window.removeEventListener('pointermove', pointerMove)
      window.removeEventListener('pointerdown', pointerDown); window.removeEventListener('touchmove', touchMove)
    }
  }, [])

  useEffect(() => {
    let audioContext: AudioContext | null = null
    const click = (event: MouseEvent) => {
      const target = event.target instanceof Element ? event.target.closest('button, a, [role="button"]') : null
      if (!target || target.matches(':disabled, [aria-disabled="true"]')) return
      const AudioContextClass = window.AudioContext
      if (AudioContextClass) {
        audioContext ??= new AudioContextClass()
        const now = audioContext.currentTime; const oscillator = audioContext.createOscillator(); const gain = audioContext.createGain()
        oscillator.type = 'sine'; oscillator.frequency.setValueAtTime(760, now); oscillator.frequency.exponentialRampToValueAtTime(1320, now + 0.065)
        gain.gain.setValueAtTime(0.0001, now); gain.gain.exponentialRampToValueAtTime(0.055, now + 0.008); gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.11)
        oscillator.connect(gain); gain.connect(audioContext.destination); oscillator.start(now); oscillator.stop(now + 0.12)
      }
      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
      const bounds = target.getBoundingClientRect(); const originX = event.clientX || bounds.left + bounds.width / 2; const originY = event.clientY || bounds.top + bounds.height / 2
      for (let index = 0; index < (window.innerWidth < 600 ? 5 : 7); index += 1) {
        const angle = Math.PI * 2 * index / 7 + (Math.random() - 0.5) * 0.5; const distance = 38 + Math.random() * 48
        const particle = document.createElement('span'); particle.className = 'emoji-burst'; particle.textContent = emojis[Math.floor(Math.random() * emojis.length)]
        particle.style.left = `${originX}px`; particle.style.top = `${originY}px`; particle.style.setProperty('--emoji-x', `${Math.cos(angle) * distance}px`)
        particle.style.setProperty('--emoji-y', `${Math.sin(angle) * distance - 18}px`); particle.style.setProperty('--emoji-r', `${-80 + Math.random() * 160}deg`)
        document.body.appendChild(particle); particle.addEventListener('animationend', () => particle.remove(), { once: true })
      }
    }
    document.addEventListener('click', click)
    return () => { document.removeEventListener('click', click); void audioContext?.close() }
  }, [])

  return <><canvas ref={canvasRef} className="fluid-canvas" aria-hidden="true" /><div className="acid-noise" aria-hidden="true" /></>
}

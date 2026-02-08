import type { AnimationDefinition } from '../../runtime/types';
import { number, color, folder } from '../../runtime/params';

interface SmoothWaveParams {
  scale: number;
  primaryColor: string;
  backgroundColor: string;
  speed: number;
  waveAmplitude: number;
  waveFrequency: number;
}

const easeInOutQuad = (t: number) => t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
const easeInOutCubic = (t: number) => t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

// Given phase, returns y, dy/dx at x
function getWaveYandSlope(x: number, width: number, freq: number, amplitude: number, phase: number) {
  const k = (freq * Math.PI * 2) / width;
  const y = Math.sin(k * x + phase) * amplitude;
  const dy_dx = Math.cos(k * x + phase) * k * amplitude;
  return { y, dy_dx };
}

// Numerical arc length along the wave for physics simulation
function computeWaveArcLUT(width: number, freq: number, amplitude: number, phase: number, steps: number) {
  let arc = 0;
  const lut: { x: number; arc: number }[] = [];
  let prev = getWaveYandSlope(-width / 2, width, freq, amplitude, phase).y;
  for (let i = 0; i <= steps; i++) {
    const x = -width / 2 + (i / steps) * width;
    const curr = getWaveYandSlope(x, width, freq, amplitude, phase).y;
    if (i > 0) {
      arc += Math.hypot(width / steps, curr - prev);
    }
    lut.push({ x, arc });
    prev = curr;
  }
  return lut;
}

const animation: AnimationDefinition<SmoothWaveParams> = {
  id: 'smooth-wave-animation',
  name: 'Smooth Wave Animation',
  fps: 60,
  durationMs: 3000,
  width: 400,
  height: 400,
  background: '#FFFFFF',

  params: {
    defaults: {
      scale: 1,
      primaryColor: '#0000FF',
      backgroundColor: '#FFFFFF',
      speed: 1,
      waveAmplitude: 50,
      waveFrequency: 3,
    },
    schema: {
      ...folder('Layout', {
        scale: number({ value: 1, min: 0.1, max: 3, step: 0.1, label: 'Scale' }),
      }),
      ...folder('Colors', {
        primaryColor: color({ value: '#0000FF', label: 'Primary Color' }),
        backgroundColor: color({ value: '#FFFFFF', label: 'Background' }),
      }),
      ...folder('Animation', {
        speed: number({ value: 1, min: 0.1, max: 3, step: 0.1, label: 'Speed' }),
        waveAmplitude: number({ value: 50, min: 10, max: 100, step: 1, label: 'Wave Amplitude' }),
        waveFrequency: number({ value: 3, min: 1, max: 10, step: 0.1, label: 'Wave Frequency' }),
      }),
    },
  },

  render({ ctx, time, width, height, progress, params }) {
    const { scale, primaryColor, backgroundColor, speed, waveAmplitude, waveFrequency } = params;
    const adjustedProgress = (progress * speed) % 1;
    const easedProgress = easeInOutQuad(adjustedProgress);

    // Background
    ctx.fillStyle = backgroundColor;
    ctx.fillRect(0, 0, width, height);

    ctx.save();
    ctx.translate(width / 2, height / 2);
    ctx.scale(scale, scale);

    // Draw the wave
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(-width / 2, 0);
    for (let x = -width / 2; x <= width / 2; x++) {
      const y = Math.sin((x / width) * waveFrequency * Math.PI * 2 + easedProgress * Math.PI * 2) * waveAmplitude;
      ctx.lineTo(x, y);
    }
    ctx.strokeStyle = primaryColor;
    ctx.lineWidth = 2;
    ctx.shadowColor = primaryColor + '55';
    ctx.shadowBlur = 16;
    ctx.globalAlpha = 0.9;
    ctx.stroke();
    ctx.globalAlpha = 1;
    ctx.shadowBlur = 0;
    ctx.restore();

    // --- PHYSICS BALL ---
    // Wave parameters
    const phase = easedProgress * Math.PI * 2;
    const steps = 300;
    const lut = computeWaveArcLUT(width, waveFrequency, waveAmplitude, phase, steps);
    const totalArc = lut[lut.length - 1].arc;

    // Simulate 'gravity' for speed: ds/dt ~ sqrt(1+2gh) along the potential
    // We'll use wave height for local potential, and modulate speed accordingly.
    const g = 0.7; // gravity constant, tweak for feel
    // For a perfectly seamless loop, use progress as ball's arc position along total arc
    let s = totalArc * ((progress * speed) % 1);
    // Binary search LUT to find the corresponding x
    let idx = lut.findIndex(p => p.arc > s);
    if (idx === -1) idx = lut.length - 1;
    else if (idx === 0) idx = 1;
    const a0 = lut[idx - 1], a1 = lut[idx];
    const t = (s - a0.arc) / (a1.arc - a0.arc);
    // Interpolate x
    const x = a0.x + (a1.x - a0.x) * t;
    // Calculate y and local slope
    const { y, dy_dx } = getWaveYandSlope(x, width, waveFrequency, waveAmplitude, phase);
    // Calculate speed based on slope (more vertical => faster)
    const slope = Math.atan2(dy_dx, 1);
    // Effective local speed modifier: slow at crest, fast at trough
    const speedMod = 0.9 + 0.5 * Math.abs(Math.sin(slope));
    // Ball bob (vertical) for realism
    const bob = Math.sin(progress * Math.PI * 2 * 2) * 3;
    // Ball shadow
    ctx.save();
    ctx.globalAlpha = 0.15;
    ctx.beginPath();
    ctx.ellipse(x, y + 18 + bob, 15, 6, 0, 0, Math.PI * 2);
    ctx.fillStyle = '#000';
    ctx.fill();
    ctx.globalAlpha = 1;
    ctx.restore();
    // Ball
    ctx.save();
    ctx.beginPath();
    ctx.arc(x, y + bob, 14, 0, Math.PI * 2);
    // Radial glowing gradient for the ball
    const grad = ctx.createRadialGradient(x, y + bob, 2, x, y + bob, 14);
    grad.addColorStop(0, '#fff');
    grad.addColorStop(0.5, primaryColor);
    grad.addColorStop(1, primaryColor + '00');
    ctx.fillStyle = grad;
    ctx.globalCompositeOperation = 'lighter';
    ctx.shadowColor = primaryColor;
    ctx.shadowBlur = 18;
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.globalCompositeOperation = 'source-over';
    ctx.restore();
    // Ball outline
    ctx.save();
    ctx.beginPath();
    ctx.arc(x, y + bob, 14, 0, Math.PI * 2);
    ctx.strokeStyle = '#fff8';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.restore();

    ctx.restore();
  },
};

export default animation;

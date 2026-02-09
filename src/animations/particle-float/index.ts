import type { AnimationDefinition } from '../../runtime/types';
import { number, color, boolean, folder } from '../../runtime/params';

interface ParticleFloatParams {
  // Layout
  scale: number;
  // Colors
  particleColor: string;
  lineColor: string;
  backgroundColor: string;
  // Particles
  particleCount: number;
  minSize: number;
  maxSize: number;
  // Connections
  showLines: boolean;
  lineDistance: number;
  lineWidth: number;
  // Animation
  speed: number;
  drift: number;
}

// Seeded pseudo-random for deterministic particle positions
function seededRandom(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 16807 + 0) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

interface Particle {
  baseX: number;
  baseY: number;
  size: number;
  opacity: number;
  phaseX: number;
  phaseY: number;
  freqX: number;
  freqY: number;
  ampX: number;
  ampY: number;
  driftSpeed: number;
}

function generateParticles(
  count: number,
  width: number,
  height: number,
  minSize: number,
  maxSize: number,
): Particle[] {
  const rng = seededRandom(42);
  const particles: Particle[] = [];

  for (let i = 0; i < count; i++) {
    const depth = rng(); // 0 = far, 1 = close
    particles.push({
      baseX: rng() * width,
      baseY: rng() * height,
      size: minSize + depth * (maxSize - minSize),
      opacity: 0.15 + depth * 0.65,
      phaseX: rng() * Math.PI * 2,
      phaseY: rng() * Math.PI * 2,
      freqX: 0.3 + rng() * 0.7,
      freqY: 0.3 + rng() * 0.7,
      ampX: 20 + rng() * 60,
      ampY: 20 + rng() * 60,
      driftSpeed: 0.5 + rng() * 1.0,
    });
  }

  return particles;
}

const animation: AnimationDefinition<ParticleFloatParams> = {
  id: 'particle-float',
  name: 'Particle Float',
  fps: 60,
  durationMs: 8000,
  width: 1920,
  height: 1080,
  background: '#0A0E1A',

  params: {
    defaults: {
      scale: 1,
      particleColor: '#7EB4FF',
      lineColor: '#7EB4FF',
      backgroundColor: '#0A0E1A',
      particleCount: 80,
      minSize: 1.5,
      maxSize: 5,
      showLines: true,
      lineDistance: 150,
      lineWidth: 0.8,
      speed: 1,
      drift: 1,
    },
    schema: {
      ...folder('Layout', {
        scale: number({ value: 1, min: 0.1, max: 3, step: 0.1, label: 'Scale' }),
      }),
      ...folder('Colors', {
        particleColor: color({ value: '#7EB4FF', label: 'Particle Color' }),
        lineColor: color({ value: '#7EB4FF', label: 'Line Color' }),
        backgroundColor: color({ value: '#0A0E1A', label: 'Background' }),
      }),
      ...folder('Particles', {
        particleCount: number({ value: 80, min: 10, max: 200, step: 1, label: 'Count' }),
        minSize: number({ value: 1.5, min: 0.5, max: 5, step: 0.5, label: 'Min Size' }),
        maxSize: number({ value: 5, min: 2, max: 12, step: 0.5, label: 'Max Size' }),
      }),
      ...folder('Connections', {
        showLines: boolean({ value: true, label: 'Show Lines' }),
        lineDistance: number({ value: 150, min: 50, max: 300, step: 10, label: 'Line Distance' }),
        lineWidth: number({ value: 0.8, min: 0.2, max: 3, step: 0.1, label: 'Line Width' }),
      }),
      ...folder('Animation', {
        speed: number({ value: 1, min: 0.1, max: 3, step: 0.1, label: 'Speed' }),
        drift: number({ value: 1, min: 0, max: 3, step: 0.1, label: 'Drift Amount' }),
      }),
    },
  },

  render({ ctx, width, height, time, params }) {
    const {
      scale,
      particleColor,
      lineColor,
      backgroundColor,
      particleCount,
      minSize,
      maxSize,
      showLines,
      lineDistance,
      lineWidth,
      speed,
      drift,
    } = params;

    const t = time * speed;

    // Clear background
    ctx.fillStyle = backgroundColor;
    ctx.fillRect(0, 0, width, height);

    ctx.save();
    ctx.translate(width / 2, height / 2);
    ctx.scale(scale, scale);
    ctx.translate(-width / 2, -height / 2);

    // Generate particles (deterministic based on count)
    const particles = generateParticles(particleCount, width, height, minSize, maxSize);

    // Compute current positions
    const positions: { x: number; y: number; size: number; opacity: number }[] = [];

    for (const p of particles) {
      const offsetX = Math.sin(t * p.freqX + p.phaseX) * p.ampX * drift;
      const offsetY = Math.cos(t * p.freqY + p.phaseY) * p.ampY * drift;

      // Slow upward drift that wraps around
      const driftY = (t * 15 * p.driftSpeed * drift) % (height + 100);

      let x = p.baseX + offsetX;
      let y = p.baseY - driftY + offsetY;

      // Wrap vertically
      if (y < -50) y += height + 100;
      if (y > height + 50) y -= height + 100;

      // Wrap horizontally
      if (x < -50) x += width + 100;
      if (x > width + 50) x -= width + 100;

      positions.push({ x, y, size: p.size, opacity: p.opacity });
    }

    // Draw connecting lines
    if (showLines) {
      const distSq = lineDistance * lineDistance;

      for (let i = 0; i < positions.length; i++) {
        for (let j = i + 1; j < positions.length; j++) {
          const dx = positions[i].x - positions[j].x;
          const dy = positions[i].y - positions[j].y;
          const dSq = dx * dx + dy * dy;

          if (dSq < distSq) {
            const dist = Math.sqrt(dSq);
            const alpha = (1 - dist / lineDistance) * 0.3;
            const avgOpacity = (positions[i].opacity + positions[j].opacity) / 2;

            ctx.strokeStyle = lineColor;
            ctx.globalAlpha = alpha * avgOpacity;
            ctx.lineWidth = lineWidth;
            ctx.beginPath();
            ctx.moveTo(positions[i].x, positions[i].y);
            ctx.lineTo(positions[j].x, positions[j].y);
            ctx.stroke();
          }
        }
      }
    }

    // Draw particles
    for (const pos of positions) {
      ctx.globalAlpha = pos.opacity;
      ctx.fillStyle = particleColor;

      // Soft glow effect
      const gradient = ctx.createRadialGradient(
        pos.x, pos.y, 0,
        pos.x, pos.y, pos.size * 3,
      );
      gradient.addColorStop(0, particleColor);
      gradient.addColorStop(0.4, particleColor);
      gradient.addColorStop(1, 'transparent');

      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(pos.x, pos.y, pos.size * 3, 0, Math.PI * 2);
      ctx.fill();

      // Bright core
      ctx.fillStyle = particleColor;
      ctx.globalAlpha = Math.min(1, pos.opacity + 0.2);
      ctx.beginPath();
      ctx.arc(pos.x, pos.y, pos.size, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.globalAlpha = 1;
    ctx.restore();
  },
};

export default animation;

import type { AnimationDefinition } from '../../runtime/types';
import { number, color, boolean, folder } from '../../runtime/params';

interface ConfettiBurstParams {
  // Layout
  scale: number;
  // Colors
  backgroundColor: string;
  color1: string;
  color2: string;
  color3: string;
  color4: string;
  // Animation
  speed: number;
  density: number;
  spreadAngle: number;
  gravityFeel: number;
  burstForce: number;
  particleSize: number;
  showTrails: boolean;
}

// Seeded PRNG for deterministic rendering
function seededRandom(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 16807 + 0) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

// Easing
const easeInCubic = (t: number): number => t * t * t;
const easeOutExpo = (t: number): number => t === 1 ? 1 : 1 - Math.pow(2, -10 * t);

interface Particle {
  // Launch angle & velocity
  angle: number;
  velocity: number;
  // Appearance
  colorIndex: number;
  size: number;
  aspect: number;       // width/height ratio
  shape: number;        // 0=rect, 1=circle, 2=diamond
  rotation: number;
  rotSpeed: number;
  // Timing
  delay: number;        // 0-0.15 stagger
  // Drift
  wobbleFreq: number;
  wobbleAmp: number;
  drag: number;         // air resistance factor
}

const animation: AnimationDefinition<ConfettiBurstParams> = {
  id: 'confetti-burst',
  name: 'Confetti Burst',
  fps: 60,
  durationMs: 2500,
  width: 960,
  height: 540,
  background: '#0C0C0F',

  params: {
    defaults: {
      scale: 1,
      backgroundColor: '#0C0C0F',
      color1: '#E8C46A',
      color2: '#D4A574',
      color3: '#A8B4C2',
      color4: '#C9937A',
      speed: 1,
      density: 60,
      spreadAngle: 55,
      gravityFeel: 1,
      burstForce: 1,
      particleSize: 1,
      showTrails: false,
    },
    schema: {
      ...folder('Layout', {
        scale: number({ value: 1, min: 0.1, max: 3, step: 0.1, label: 'Scale' }),
      }),
      ...folder('Colors', {
        backgroundColor: color({ value: '#0C0C0F', label: 'Background' }),
        color1: color({ value: '#E8C46A', label: 'Gold' }),
        color2: color({ value: '#D4A574', label: 'Copper' }),
        color3: color({ value: '#A8B4C2', label: 'Silver' }),
        color4: color({ value: '#C9937A', label: 'Bronze' }),
      }),
      ...folder('Animation', {
        speed: number({ value: 1, min: 0.3, max: 2.5, step: 0.1, label: 'Speed' }),
        density: number({ value: 60, min: 10, max: 150, step: 5, label: 'Density' }),
        spreadAngle: number({ value: 55, min: 10, max: 120, step: 5, label: 'Spread Angle (°)' }),
        gravityFeel: number({ value: 1, min: 0.3, max: 3, step: 0.1, label: 'Gravity Feel' }),
        burstForce: number({ value: 1, min: 0.3, max: 2, step: 0.1, label: 'Burst Force' }),
        particleSize: number({ value: 1, min: 0.3, max: 2, step: 0.1, label: 'Particle Size' }),
        showTrails: boolean({ value: false, label: 'Motion Trails' }),
      }),
    },
  },

  render({ ctx, width, height, progress, params }) {
    const {
      scale,
      backgroundColor,
      color1, color2, color3, color4,
      speed,
      density,
      spreadAngle,
      gravityFeel,
      burstForce,
      particleSize,
      showTrails,
    } = params;

    const colors = [color1, color2, color3, color4];
    const adjustedProgress = Math.min(progress * speed, 1);

    // Clear / trails
    if (showTrails && adjustedProgress > 0.05) {
      ctx.fillStyle = backgroundColor;
      ctx.globalAlpha = 0.25;
      ctx.fillRect(0, 0, width, height);
      ctx.globalAlpha = 1;
    } else {
      ctx.fillStyle = backgroundColor;
      ctx.fillRect(0, 0, width, height);
    }

    ctx.save();
    ctx.translate(width / 2, height / 2);
    ctx.scale(scale, scale);

    // Generate deterministic particles
    const rand = seededRandom(73);
    const particles: Particle[] = [];
    const halfSpread = (spreadAngle * Math.PI) / 360; // half the spread in radians
    const upAngle = -Math.PI / 2; // straight up

    for (let i = 0; i < density; i++) {
      // Angle within spread cone, centered upward
      const angleOffset = (rand() - 0.5) * 2 * halfSpread;
      const angle = upAngle + angleOffset;

      // Velocity with slight variation
      const velocity = (0.6 + rand() * 0.4) * burstForce;

      particles.push({
        angle,
        velocity,
        colorIndex: Math.floor(rand() * 4),
        size: 0.5 + rand() * 0.8,
        aspect: 0.3 + rand() * 0.7,
        shape: rand() < 0.5 ? 0 : rand() < 0.8 ? 1 : 2,
        rotation: rand() * Math.PI * 2,
        rotSpeed: (rand() - 0.5) * 6,
        delay: rand() * 0.12,
        wobbleFreq: 1.5 + rand() * 3,
        wobbleAmp: 2 + rand() * 6,
        drag: 0.92 + rand() * 0.06,
      });
    }

    const halfW = width / 2;
    const halfH = height / 2;
    // Burst origin: center-bottom area
    const originY = halfH * 0.15;

    // Physics constants
    const gravity = 980 * gravityFeel;
    const maxTime = 2.2; // seconds of simulated physics

    for (const p of particles) {
      const pProgress = Math.max(0, (adjustedProgress - p.delay) / (1 - p.delay));
      if (pProgress <= 0) continue;

      // Map progress to simulation time with eased launch
      const launchEase = easeOutExpo(Math.min(pProgress * 2, 1));
      const simTime = pProgress * maxTime;

      // Initial velocity components
      const vx0 = Math.cos(p.angle) * p.velocity * halfW * 0.8;
      const vy0 = Math.sin(p.angle) * p.velocity * halfH * 1.1;

      // Apply drag over time (exponential decay of velocity)
      const dragFactor = Math.pow(p.drag, simTime * 60);

      // Position with drag and gravity
      const x = vx0 * simTime * dragFactor * launchEase
        + Math.sin(simTime * p.wobbleFreq * Math.PI) * p.wobbleAmp * pProgress;
      const y = originY
        + vy0 * simTime * dragFactor * launchEase
        + 0.5 * gravity * simTime * simTime * pProgress;

      // Skip off-screen particles
      if (y > halfH + 20 || y < -halfH - 20 || Math.abs(x) > halfW + 20) continue;

      // Opacity: quick burst in, then decay
      const fadeIn = Math.min(1, pProgress * 8);
      const decayStart = 0.4;
      const fadeOut = pProgress > decayStart
        ? 1 - easeInCubic((pProgress - decayStart) / (1 - decayStart))
        : 1;
      const opacity = fadeIn * fadeOut;
      if (opacity <= 0.01) continue;

      // Rotation
      const rot = p.rotation + pProgress * p.rotSpeed * Math.PI * 2;

      // 3D tumble
      const flipX = Math.cos(pProgress * p.rotSpeed * Math.PI * 4);

      const baseSize = 4 * p.size * particleSize;

      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(rot);
      ctx.scale(flipX, 1);
      ctx.globalAlpha = opacity;

      ctx.fillStyle = colors[p.colorIndex];

      if (p.shape === 0) {
        // Small rectangle (paper strip)
        const w = baseSize * 2.2;
        const h = baseSize * p.aspect;
        ctx.fillRect(-w / 2, -h / 2, w, h);
      } else if (p.shape === 1) {
        // Small circle (dot)
        ctx.beginPath();
        ctx.arc(0, 0, baseSize * 0.7, 0, Math.PI * 2);
        ctx.fill();
      } else {
        // Diamond
        const s = baseSize * 1.2;
        ctx.beginPath();
        ctx.moveTo(0, -s);
        ctx.lineTo(s * 0.6, 0);
        ctx.lineTo(0, s);
        ctx.lineTo(-s * 0.6, 0);
        ctx.closePath();
        ctx.fill();
      }

      ctx.restore();
    }

    ctx.restore();
  },
};

export default animation;

import type { AnimationDefinition } from '../../runtime/types';
import { number, color, folder } from '../../runtime/params';

interface BreathingColorFieldParams {
  // Layout
  scale: number;
  blobCount: number;
  // Colors
  backgroundColor: string;
  color1: string;
  color2: string;
  color3: string;
  color4: string;
  // Animation
  speed: number;
  breathDepth: number;
  softness: number;
}

// Smooth sine-based easing for the breathing motion
const breathe = (t: number): number => (Math.sin(t * Math.PI * 2 - Math.PI / 2) + 1) / 2;

// Parse hex color to r,g,b
function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace('#', '');
  return [
    parseInt(h.substring(0, 2), 16),
    parseInt(h.substring(2, 4), 16),
    parseInt(h.substring(4, 6), 16),
  ];
}

// Blob definitions: relative positions, phase offsets, size multipliers
const blobSeeds = [
  { rx: 0.5, ry: 0.5, phase: 0, sizeBase: 0.55 },
  { rx: 0.3, ry: 0.35, phase: 0.25, sizeBase: 0.4 },
  { rx: 0.72, ry: 0.38, phase: 0.5, sizeBase: 0.42 },
  { rx: 0.38, ry: 0.68, phase: 0.75, sizeBase: 0.38 },
  { rx: 0.68, ry: 0.7, phase: 0.6, sizeBase: 0.36 },
  { rx: 0.5, ry: 0.25, phase: 0.35, sizeBase: 0.3 },
  { rx: 0.22, ry: 0.55, phase: 0.85, sizeBase: 0.32 },
  { rx: 0.78, ry: 0.55, phase: 0.15, sizeBase: 0.34 },
];

const animation: AnimationDefinition<BreathingColorFieldParams> = {
  id: 'breathing-color-field',
  name: 'Breathing Color Field',
  fps: 60,
  durationMs: 6000,
  width: 1920,
  height: 1080,
  background: '#0B0B1A',

  params: {
    defaults: {
      scale: 1,
      blobCount: 6,
      backgroundColor: '#0B0B1A',
      color1: '#6C3CE1',
      color2: '#E14B8A',
      color3: '#2DD4BF',
      color4: '#F59E0B',
      speed: 1,
      breathDepth: 0.35,
      softness: 0.7,
    },
    schema: {
      ...folder('Layout', {
        scale: number({ value: 1, min: 0.1, max: 3, step: 0.1, label: 'Scale' }),
        blobCount: number({ value: 6, min: 2, max: 8, step: 1, label: 'Blob Count' }),
      }),
      ...folder('Colors', {
        backgroundColor: color({ value: '#0B0B1A', label: 'Background' }),
        color1: color({ value: '#6C3CE1', label: 'Color 1' }),
        color2: color({ value: '#E14B8A', label: 'Color 2' }),
        color3: color({ value: '#2DD4BF', label: 'Color 3' }),
        color4: color({ value: '#F59E0B', label: 'Color 4' }),
      }),
      ...folder('Animation', {
        speed: number({ value: 1, min: 0.1, max: 3, step: 0.1, label: 'Speed' }),
        breathDepth: number({ value: 0.35, min: 0.05, max: 0.8, step: 0.05, label: 'Breath Depth' }),
        softness: number({ value: 0.7, min: 0.1, max: 1, step: 0.05, label: 'Softness' }),
      }),
    },
  },

  render({ ctx, width, height, progress, params }) {
    const {
      scale,
      blobCount,
      backgroundColor,
      color1,
      color2,
      color3,
      color4,
      speed,
      breathDepth,
      softness,
    } = params;

    const colors = [color1, color2, color3, color4];
    const t = progress * speed;

    // Fill background
    ctx.fillStyle = backgroundColor;
    ctx.fillRect(0, 0, width, height);

    ctx.save();
    ctx.translate(width / 2, height / 2);
    ctx.scale(scale, scale);

    const w = width / scale;
    const h = height / scale;
    const maxDim = Math.max(w, h);

    // Use 'lighter' compositing for additive color blending
    ctx.globalCompositeOperation = 'lighter';

    const count = Math.min(blobCount, blobSeeds.length);

    for (let i = 0; i < count; i++) {
      const seed = blobSeeds[i];
      const blobColor = colors[i % colors.length];
      const [r, g, b] = hexToRgb(blobColor);

      // Breathing factor: each blob breathes at its own phase
      const breathPhase = t + seed.phase;
      const breathFactor = breathe(breathPhase);

      // Radius oscillates between contracted and expanded
      const minRadius = seed.sizeBase * maxDim * (1 - breathDepth) * 0.5;
      const maxRadius = seed.sizeBase * maxDim * (1 + breathDepth) * 0.5;
      const radius = minRadius + (maxRadius - minRadius) * breathFactor;

      // Blob center with subtle drift
      const cx = (seed.rx - 0.5) * w + Math.sin(t * 0.7 + seed.phase * 4) * maxDim * 0.02;
      const cy = (seed.ry - 0.5) * h + Math.cos(t * 0.6 + seed.phase * 3) * maxDim * 0.02;

      // Alpha pulses gently with breath
      const alphaBase = 0.12 + (1 - softness) * 0.15;
      const alpha = alphaBase + breathFactor * 0.08;

      // Radial gradient: color at center fading to transparent
      const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, radius);
      grad.addColorStop(0, `rgba(${r}, ${g}, ${b}, ${alpha})`);
      grad.addColorStop(0.4, `rgba(${r}, ${g}, ${b}, ${alpha * 0.6})`);
      grad.addColorStop(0.7, `rgba(${r}, ${g}, ${b}, ${alpha * 0.2})`);
      grad.addColorStop(1, `rgba(${r}, ${g}, ${b}, 0)`);

      ctx.fillStyle = grad;
      ctx.fillRect(-w / 2, -h / 2, w, h);
    }

    // Reset composite operation before overlay effects
    ctx.globalCompositeOperation = 'source-over';

    // Subtle center luminance highlight that breathes with the field
    const centerBreath = breathe(t * 0.8);
    const highlightAlpha = 0.03 + centerBreath * 0.04;
    const highlightRadius = maxDim * (0.2 + centerBreath * 0.15);
    const highlight = ctx.createRadialGradient(0, 0, 0, 0, 0, highlightRadius);
    highlight.addColorStop(0, `rgba(255, 255, 255, ${highlightAlpha})`);
    highlight.addColorStop(0.5, `rgba(255, 255, 255, ${highlightAlpha * 0.3})`);
    highlight.addColorStop(1, 'rgba(255, 255, 255, 0)');
    ctx.fillStyle = highlight;
    ctx.fillRect(-w / 2, -h / 2, w, h);

    // Soft vignette to contain the edges
    const vignette = ctx.createRadialGradient(0, 0, maxDim * 0.25, 0, 0, maxDim * 0.75);
    vignette.addColorStop(0, 'rgba(0, 0, 0, 0)');
    vignette.addColorStop(1, `rgba(0, 0, 0, ${0.3 + softness * 0.2})`);
    ctx.fillStyle = vignette;
    ctx.fillRect(-w / 2, -h / 2, w, h);

    ctx.restore();
  },
};

export default animation;

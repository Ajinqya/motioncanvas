import type { AnimationDefinition } from '../../runtime/types';
import { number, color, folder } from '../../runtime/params';

interface RibbonFlowParams {
  // Layout
  scale: number;
  // Colors
  ribbon1Color: string;
  ribbon2Color: string;
  ribbon3Color: string;
  backgroundColor: string;
  // Ribbons
  ribbonCount: number;
  ribbonWidth: number;
  waviness: number;
  // Animation
  speed: number;
  flowDirection: number;
}

// Easing helpers
const easeInOutSine = (t: number) => -(Math.cos(Math.PI * t) - 1) / 2;

// Hex to RGBA helper
function hexToRgba(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

// Interpolate between two hex colors
function lerpColor(c1: string, c2: string, t: number): string {
  const r1 = parseInt(c1.slice(1, 3), 16);
  const g1 = parseInt(c1.slice(3, 5), 16);
  const b1 = parseInt(c1.slice(5, 7), 16);
  const r2 = parseInt(c2.slice(1, 3), 16);
  const g2 = parseInt(c2.slice(3, 5), 16);
  const b2 = parseInt(c2.slice(5, 7), 16);
  const r = Math.round(r1 + (r2 - r1) * t);
  const g = Math.round(g1 + (g2 - g1) * t);
  const b = Math.round(b1 + (b2 - b1) * t);
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}

// Seeded random for deterministic ribbon placement
function seededRandom(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 16807 + 0) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

interface RibbonConfig {
  yBase: number;
  amplitude: number;
  frequency: number;
  phase: number;
  thickness: number;
  opacity: number;
  colorIndex: number; // 0, 1, or 2
  speedMult: number;
  waveOffset: number;
}

function generateRibbons(count: number, height: number): RibbonConfig[] {
  const rng = seededRandom(77);
  const ribbons: RibbonConfig[] = [];
  const margin = height * 0.1;
  const usableHeight = height - margin * 2;

  for (let i = 0; i < count; i++) {
    const t = count > 1 ? i / (count - 1) : 0.5;
    ribbons.push({
      yBase: margin + t * usableHeight + (rng() - 0.5) * usableHeight * 0.15,
      amplitude: 40 + rng() * 120,
      frequency: 0.8 + rng() * 1.2,
      phase: rng() * Math.PI * 2,
      thickness: 2 + rng() * 6,
      opacity: 0.2 + rng() * 0.5,
      colorIndex: Math.floor(rng() * 3),
      speedMult: 0.6 + rng() * 0.8,
      waveOffset: rng() * Math.PI * 2,
    });
  }

  // Sort by opacity so brighter ribbons render on top
  ribbons.sort((a, b) => a.opacity - b.opacity);
  return ribbons;
}

const animation: AnimationDefinition<RibbonFlowParams> = {
  id: 'ribbon-flow',
  name: 'Ribbon Flow Lines',
  fps: 60,
  durationMs: 10000,
  width: 1920,
  height: 1080,
  background: '#0B0F1A',

  params: {
    defaults: {
      scale: 1,
      ribbon1Color: '#6E8CFF',
      ribbon2Color: '#A78BFA',
      ribbon3Color: '#F472B6',
      backgroundColor: '#ffffff',
      ribbonCount: 10,
      ribbonWidth: 2.6,
      waviness: 2.4,
      speed: 1.2,
      flowDirection: 0,
    },
    schema: {
      ...folder('Layout', {
        scale: number({ value: 1, min: 0.1, max: 3, step: 0.1, label: 'Scale' }),
      }),
      ...folder('Colors', {
        ribbon1Color: color({ value: '#6E8CFF', label: 'Ribbon Color 1' }),
        ribbon2Color: color({ value: '#A78BFA', label: 'Ribbon Color 2' }),
        ribbon3Color: color({ value: '#F472B6', label: 'Ribbon Color 3' }),
        backgroundColor: color({ value: '#0B0F1A', label: 'Background' }),
      }),
      ...folder('Ribbons', {
        ribbonCount: number({ value: 14, min: 3, max: 30, step: 1, label: 'Count' }),
        ribbonWidth: number({ value: 1, min: 0.2, max: 3, step: 0.1, label: 'Width Mult' }),
        waviness: number({ value: 1, min: 0.1, max: 3, step: 0.1, label: 'Waviness' }),
      }),
      ...folder('Animation', {
        speed: number({ value: 1, min: 0.1, max: 3, step: 0.1, label: 'Speed' }),
        flowDirection: number({ value: 0, min: -1, max: 1, step: 0.1, label: 'Flow Direction' }),
      }),
    },
  },

  render({ ctx, width, height, time, progress, params }) {
    const {
      scale,
      ribbon1Color,
      ribbon2Color,
      ribbon3Color,
      backgroundColor,
      ribbonCount,
      ribbonWidth,
      waviness,
      speed,
      flowDirection,
    } = params;

    const t = time * speed;

    // Clear background
    ctx.fillStyle = backgroundColor;
    ctx.fillRect(0, 0, width, height);

    ctx.save();
    ctx.translate(width / 2, height / 2);
    ctx.scale(scale, scale);
    ctx.translate(-width / 2, -height / 2);

    const colors = [ribbon1Color, ribbon2Color, ribbon3Color];
    const ribbons = generateRibbons(ribbonCount, height);

    // Smooth intro/outro fade
    const fadeIn = easeInOutSine(Math.min(1, progress * 5));
    const fadeOut = easeInOutSine(Math.min(1, (1 - progress) * 5));
    const globalFade = fadeIn * fadeOut;

    // Draw each ribbon
    for (const ribbon of ribbons) {
      const segments = 200;
      const xStart = -width * 0.15;
      const xEnd = width * 1.15;
      const segWidth = (xEnd - xStart) / segments;

      // Time-based animation for this ribbon
      const ribbonTime = t * ribbon.speedMult;
      const drift = flowDirection * ribbonTime * 80;

      // Build ribbon path as a series of points
      const points: { x: number; y: number }[] = [];

      for (let i = 0; i <= segments; i++) {
        const segT = i / segments;
        const x = xStart + segT * (xEnd - xStart) + drift;

        // Multi-layered sine waves for organic movement
        const wave1 = Math.sin(
          segT * Math.PI * 2 * ribbon.frequency + ribbonTime * 1.2 + ribbon.phase
        ) * ribbon.amplitude * waviness;

        const wave2 = Math.sin(
          segT * Math.PI * 4 * ribbon.frequency * 0.7 + ribbonTime * 0.8 + ribbon.waveOffset
        ) * ribbon.amplitude * 0.35 * waviness;

        const wave3 = Math.sin(
          segT * Math.PI * 1.3 + ribbonTime * 0.5 + ribbon.phase * 2
        ) * ribbon.amplitude * 0.5 * waviness;

        // Breathing effect - subtle vertical pulse
        const breathe = Math.sin(ribbonTime * 0.6 + ribbon.phase) * 15 * waviness;

        const y = ribbon.yBase + wave1 + wave2 + wave3 + breathe;
        points.push({ x, y });
      }

      // Draw the ribbon with thickness variation and gradient
      const baseColor = colors[ribbon.colorIndex];
      const nextColor = colors[(ribbon.colorIndex + 1) % 3];

      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      // Draw multiple strokes for glow + core
      const layers = [
        { widthMult: 6, opacityMult: 0.06 },   // Outer glow
        { widthMult: 3, opacityMult: 0.12 },   // Mid glow
        { widthMult: 1.2, opacityMult: 0.5 },  // Near core
        { widthMult: 0.6, opacityMult: 1.0 },  // Core
      ];

      for (const layer of layers) {
        ctx.beginPath();

        // Use smooth curve through points (Catmull-Rom to Bezier)
        for (let i = 0; i < points.length - 1; i++) {
          const p0 = points[Math.max(0, i - 1)];
          const p1 = points[i];
          const p2 = points[Math.min(points.length - 1, i + 1)];
          const p3 = points[Math.min(points.length - 1, i + 2)];

          if (i === 0) {
            ctx.moveTo(p1.x, p1.y);
          }

          // Catmull-Rom to cubic bezier conversion
          const tension = 0.35;
          const cp1x = p1.x + (p2.x - p0.x) * tension;
          const cp1y = p1.y + (p2.y - p0.y) * tension;
          const cp2x = p2.x - (p3.x - p1.x) * tension;
          const cp2y = p2.y - (p3.y - p1.y) * tension;

          ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, p2.x, p2.y);
        }

        // Color blend along the ribbon
        const blendT = (Math.sin(ribbonTime * 0.3 + ribbon.phase) + 1) / 2;
        const strokeColor = lerpColor(baseColor, nextColor, blendT);

        const finalOpacity = ribbon.opacity * layer.opacityMult * globalFade;
        ctx.strokeStyle = hexToRgba(strokeColor, finalOpacity);
        ctx.lineWidth = ribbon.thickness * ribbonWidth * layer.widthMult;
        ctx.stroke();
      }
    }

    // Subtle vignette overlay
    const vignette = ctx.createRadialGradient(
      width / 2, height / 2, width * 0.25,
      width / 2, height / 2, width * 0.75,
    );
    vignette.addColorStop(0, 'transparent');
    vignette.addColorStop(1, hexToRgba(backgroundColor, 0.4));
    ctx.fillStyle = vignette;
    ctx.fillRect(0, 0, width, height);

    ctx.restore();
  },
};

export default animation;

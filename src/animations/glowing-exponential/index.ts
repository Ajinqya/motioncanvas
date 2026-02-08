import type { AnimationDefinition } from '../../runtime/types';
import { number, color, boolean, folder } from '../../runtime/params';

/**
 * Glowing Green Exponential Curve
 * Draws an exponential curve that sweeps in from left to right
 * with a vivid neon glow effect on a dark background.
 */

interface GlowingExponentialParams {
  // Layout
  scale: number;
  curveExponent: number;
  curveAmplitude: number;
  lineWidth: number;

  // Colors
  backgroundColor: string;
  primaryColor: string;
  glowColor: string;

  // Glow
  glowIntensity: number;
  glowLayers: number;
  showParticles: boolean;

  // Animation
  speed: number;
  trailLength: number;
}

// Easing helpers
const easeInOutCubic = (t: number) =>
  t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;


const animation: AnimationDefinition<GlowingExponentialParams> = {
  id: 'glowing-exponential',
  name: 'Glowing Exponential',
  fps: 60,
  durationMs: 4000,
  width: 1280,
  height: 720,
  background: '#050510',

  params: {
    defaults: {
      scale: 2.1,
      curveExponent: 3.5,
      curveAmplitude: 1.5,
      lineWidth: 2,
      backgroundColor: '#050510',
      primaryColor: '#7a4c33',
      glowColor: '#ff6600',
      glowIntensity: 5,
      glowLayers: 1,
      showParticles: false,
      speed: 0.7,
      trailLength: 0.15,
    },
    schema: {
      ...folder('Layout', {
        scale: number({ value: 1, min: 0.1, max: 3, step: 0.1, label: 'Scale' }),
        curveExponent: number({ value: 3, min: 1.5, max: 6, step: 0.1, label: 'Exponent' }),
        curveAmplitude: number({ value: 0.85, min: 0.2, max: 1.5, step: 0.05, label: 'Amplitude' }),
        lineWidth: number({ value: 3, min: 1, max: 8, step: 0.5, label: 'Line Width' }),
      }),
      ...folder('Colors', {
        primaryColor: color({ value: '#00ff88', label: 'Curve Color' }),
        glowColor: color({ value: '#00ff88', label: 'Glow Color' }),
        backgroundColor: color({ value: '#050510', label: 'Background' }),
      }),
      ...folder('Glow', {
        glowIntensity: number({ value: 40, min: 5, max: 100, step: 5, label: 'Glow Intensity' }),
        glowLayers: number({ value: 4, min: 1, max: 8, step: 1, label: 'Glow Layers' }),
        showParticles: boolean({ value: true, label: 'Show Particles' }),
      }),
      ...folder('Animation', {
        speed: number({ value: 1, min: 0.1, max: 3, step: 0.1, label: 'Speed' }),
        trailLength: number({ value: 0.15, min: 0.02, max: 0.4, step: 0.01, label: 'Trail Length' }),
      }),
    },
  },

  render({ ctx, width, height, progress, params }) {
    const {
      scale,
      curveExponent,
      curveAmplitude,
      lineWidth,
      backgroundColor,
      primaryColor,
      glowColor,
      glowIntensity,
      glowLayers,
      showParticles,
      speed,
      trailLength,
    } = params;

    const adjustedProgress = Math.min((progress * speed), 1);
    const drawProgress = easeInOutCubic(adjustedProgress);

    // --- Background ---
    ctx.fillStyle = backgroundColor;
    ctx.fillRect(0, 0, width, height);

    // Subtle radial vignette
    const vignette = ctx.createRadialGradient(
      width / 2, height / 2, height * 0.2,
      width / 2, height / 2, height * 0.9,
    );
    vignette.addColorStop(0, 'rgba(0,0,0,0)');
    vignette.addColorStop(1, 'rgba(0,0,0,0.45)');
    ctx.fillStyle = vignette;
    ctx.fillRect(0, 0, width, height);

    // Faint grid lines for depth
    ctx.save();
    ctx.globalAlpha = 0.06;
    ctx.strokeStyle = primaryColor;
    ctx.lineWidth = 1;
    const gridSpacing = 60 * scale;
    for (let x = gridSpacing; x < width; x += gridSpacing) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }
    for (let y = gridSpacing; y < height; y += gridSpacing) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }
    ctx.restore();

    // --- Coordinate system ---
    // The exponential curve goes from (0, 0) at bottom-left of the drawing area
    // to (1, 1) at top-right, mapped into screen space.
    const padding = 80 * scale;
    const plotLeft = padding;
    const plotRight = width - padding;
    const plotBottom = height - padding;
    const plotTop = padding;
    const plotW = plotRight - plotLeft;
    const plotH = plotBottom - plotTop;

    // Exponential function: y = ((e^(ex * t) - 1) / (e^ex - 1))  normalized to 0..1
    const expDenom = Math.exp(curveExponent) - 1;
    const expFn = (t: number) => (Math.exp(curveExponent * t) - 1) / expDenom;

    // Number of segments for smooth curve
    const segments = Math.floor(plotW / 2);

    // Helper: map normalized (t, v) to screen
    const toScreen = (t: number, v: number): [number, number] => {
      const sx = plotLeft + t * plotW;
      const sy = plotBottom - v * plotH * curveAmplitude;
      return [sx, sy];
    };

    // --- Draw axis lines ---
    ctx.save();
    ctx.globalAlpha = 0.15;
    ctx.strokeStyle = primaryColor;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(plotLeft, plotBottom);
    ctx.lineTo(plotRight, plotBottom);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(plotLeft, plotBottom);
    ctx.lineTo(plotLeft, plotTop);
    ctx.stroke();
    ctx.restore();

    // --- Build curve path up to drawProgress ---
    const drawEnd = drawProgress;
    const totalSegs = Math.max(1, Math.floor(segments * drawEnd));

    // Build the point array
    const points: [number, number][] = [];
    for (let i = 0; i <= totalSegs; i++) {
      const t = (i / segments); // normalised 0..1 along full curve
      if (t > drawEnd) break;
      const v = expFn(t);
      points.push(toScreen(t, v));
    }
    // Add exact endpoint at drawEnd
    const endV = expFn(drawEnd);
    const endPt = toScreen(drawEnd, endV);
    if (points.length > 0) {
      points.push(endPt);
    }

    if (points.length < 2) {
      // Not enough to draw yet
      return;
    }

    // --- Glow layers (multiple passes with increasing blur) ---
    for (let layer = glowLayers; layer >= 0; layer--) {
      ctx.save();

      const isCore = layer === 0;
      const layerRatio = layer / glowLayers;

      if (isCore) {
        // Core crisp line
        ctx.shadowColor = glowColor;
        ctx.shadowBlur = glowIntensity * 0.5;
        ctx.strokeStyle = primaryColor;
        ctx.lineWidth = lineWidth * scale;
        ctx.globalAlpha = 1;
      } else {
        // Glow halo
        ctx.shadowColor = 'transparent';
        ctx.strokeStyle = glowColor;
        ctx.lineWidth = (lineWidth * scale) + layer * 4;
        ctx.globalAlpha = 0.18 * (1 - layerRatio * 0.6);
        ctx.filter = `blur(${layer * 4}px)`;
      }

      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      // Draw the curve
      ctx.beginPath();
      ctx.moveTo(points[0][0], points[0][1]);
      for (let i = 1; i < points.length; i++) {
        ctx.lineTo(points[i][0], points[i][1]);
      }
      ctx.stroke();

      ctx.restore();
    }

    // --- Bright leading dot ---
    const headRadius = (lineWidth * scale) * 1.6;
    const [hx, hy] = endPt;

    // Outer glow of head
    ctx.save();
    const headGlow = ctx.createRadialGradient(hx, hy, 0, hx, hy, headRadius * 12);
    headGlow.addColorStop(0, glowColor + 'aa');
    headGlow.addColorStop(0.3, glowColor + '44');
    headGlow.addColorStop(1, glowColor + '00');
    ctx.fillStyle = headGlow;
    ctx.beginPath();
    ctx.arc(hx, hy, headRadius * 12, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // Core dot
    ctx.save();
    ctx.shadowColor = glowColor;
    ctx.shadowBlur = glowIntensity;
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(hx, hy, headRadius, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // --- Trailing fade ---
    // Fade out the tail end of the drawn curve with a gradient overlay
    if (drawProgress > trailLength) {
      const trailStart = Math.max(0, drawProgress - 1); // full curve visible once drawn
      const fadeLen = trailLength * plotW;
      const fadeX = plotLeft + trailStart * plotW;

      ctx.save();
      const fadeGrad = ctx.createLinearGradient(fadeX, 0, fadeX + fadeLen, 0);
      fadeGrad.addColorStop(0, backgroundColor);
      fadeGrad.addColorStop(1, backgroundColor + '00');
      // Only fade very start during reveal
      if (drawProgress < 0.3) {
        ctx.fillStyle = fadeGrad;
        ctx.fillRect(fadeX, 0, fadeLen, height);
      }
      ctx.restore();
    }

    // --- Floating particles along the curve ---
    if (showParticles && drawProgress > 0.05) {
      ctx.save();
      const particleCount = 30;
      const time = progress * speed * 6;

      for (let i = 0; i < particleCount; i++) {
        const seed = i * 137.508; // golden angle offset
        const t = ((seed % 1000) / 1000) * drawEnd;
        const v = expFn(t);
        const [px, py] = toScreen(t, v);

        // Float up/down gently
        const floatOffset = Math.sin(time + seed) * 12 * scale;
        const driftX = Math.cos(time * 0.7 + seed * 2.3) * 6 * scale;

        const pAlpha = 0.15 + 0.25 * Math.sin(time * 1.3 + seed);
        const pSize = (1 + Math.sin(time + seed * 0.5)) * 1.5 * scale;

        ctx.globalAlpha = Math.max(0, pAlpha);
        ctx.fillStyle = primaryColor;
        ctx.shadowColor = glowColor;
        ctx.shadowBlur = 8;
        ctx.beginPath();
        ctx.arc(px + driftX, py + floatOffset, pSize, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }
  },
};

export default animation;

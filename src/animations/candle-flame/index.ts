import type { AnimationDefinition } from '../../runtime/types';
import { number, color, boolean, folder } from '../../runtime/params';

/**
 * Candle Flame Animation
 * A realistic candle with a flickering flame, warm glow, and subtle grain.
 * Inspired by moody candlelight photography with deep blue tones and pink/magenta flame.
 */

interface CandleFlameParams {
  // Layout
  scale: number;
  // Colors
  backgroundColor: string;
  backgroundAccent: string;
  candleColor: string;
  candleHighlight: string;
  flameCore: string;
  flameMiddle: string;
  flameOuter: string;
  flameBlue: string;
  // Animation
  speed: number;
  flickerAmount: number;
  swayAmount: number;
  // Effects
  glowIntensity: number;
  grainAmount: number;
  showGrain: boolean;
}

// Easing helpers
const easeOutCubic = (t: number): number => 1 - Math.pow(1 - t, 3);

// Simple seeded pseudo-random for grain
const hash = (x: number, y: number, seed: number): number => {
  let h = seed + x * 374761393 + y * 668265263;
  h = (h ^ (h >> 13)) * 1274126177;
  h = h ^ (h >> 16);
  return (h & 0x7fffffff) / 0x7fffffff;
};

const animation: AnimationDefinition<CandleFlameParams> = {
  id: 'candle-flame',
  name: 'Candle Flame',
  fps: 60,
  durationMs: 6000,
  width: 800,
  height: 800,
  background: '#060D2E',

  params: {
    defaults: {
      scale: 1.6,
      backgroundColor: '#060D2E',
      backgroundAccent: '#0A1654',
      candleColor: '#1A3A9E',
      candleHighlight: '#3366CC',
      flameCore: '#FF6B8A',
      flameMiddle: '#E8556A',
      flameOuter: '#CC3355',
      flameBlue: '#2244AA',
      speed: 1,
      flickerAmount: 0.8,
      swayAmount: 0.8,
      glowIntensity: 0.7,
      grainAmount: 0,
      showGrain: true,
    },
    schema: {
      ...folder('Layout', {
        scale: number({ value: 1, min: 0.3, max: 2, step: 0.05, label: 'Scale' }),
      }),
      ...folder('Colors', {
        backgroundColor: color({ value: '#060D2E', label: 'Background' }),
        backgroundAccent: color({ value: '#0A1654', label: 'Background Accent' }),
        candleColor: color({ value: '#1A3A9E', label: 'Candle Body' }),
        candleHighlight: color({ value: '#3366CC', label: 'Candle Highlight' }),
        flameCore: color({ value: '#FF6B8A', label: 'Flame Core' }),
        flameMiddle: color({ value: '#E8556A', label: 'Flame Middle' }),
        flameOuter: color({ value: '#CC3355', label: 'Flame Outer' }),
        flameBlue: color({ value: '#2244AA', label: 'Flame Blue Edge' }),
      }),
      ...folder('Animation', {
        speed: number({ value: 1, min: 0.2, max: 3, step: 0.1, label: 'Speed' }),
        flickerAmount: number({ value: 0.6, min: 0, max: 1, step: 0.05, label: 'Flicker' }),
        swayAmount: number({ value: 0.5, min: 0, max: 1, step: 0.05, label: 'Sway' }),
      }),
      ...folder('Effects', {
        glowIntensity: number({ value: 0.7, min: 0, max: 1, step: 0.05, label: 'Glow Intensity' }),
        grainAmount: number({ value: 0.06, min: 0, max: 0.2, step: 0.01, label: 'Grain Amount' }),
        showGrain: boolean({ value: true, label: 'Show Grain' }),
      }),
    },
  },

  render({ ctx, time, progress, width, height, params }) {
    const {
      scale,
      backgroundColor,
      backgroundAccent,
      candleColor,
      candleHighlight,
      flameCore,
      flameMiddle,
      flameOuter,
      flameBlue,
      speed,
      flickerAmount,
      swayAmount,
      glowIntensity,
      grainAmount,
      showGrain,
    } = params;

    const t = time * speed;

    // -- Entrance animation (fade in over first 15% of duration) --
    const entranceT = Math.min(1, progress * 6.67);
    const entrance = easeOutCubic(entranceT);

    // -- Flicker values (organic noise-like variation) --
    const flicker1 = Math.sin(t * 5.7) * 0.3 + Math.sin(t * 13.1) * 0.15 + Math.sin(t * 23.7) * 0.08;
    const flicker2 = Math.sin(t * 7.3 + 1.2) * 0.25 + Math.sin(t * 17.9 + 0.5) * 0.12;
    const sway = Math.sin(t * 2.1) * 6 + Math.sin(t * 4.7 + 0.8) * 3 + Math.sin(t * 8.3) * 1.5;

    const flickerScale = 1 + flicker1 * flickerAmount * 0.15;
    const swayX = sway * swayAmount;

    // Helper to parse hex color
    const hexToRgb = (hex: string) => {
      const r = parseInt(hex.slice(1, 3), 16);
      const g = parseInt(hex.slice(3, 5), 16);
      const b = parseInt(hex.slice(5, 7), 16);
      return { r, g, b };
    };

    const bgRgb = hexToRgb(backgroundColor);
    const accentRgb = hexToRgb(backgroundAccent);
    const candleRgb = hexToRgb(candleColor);
    const candleHiRgb = hexToRgb(candleHighlight);
    const coreRgb = hexToRgb(flameCore);
    const midRgb = hexToRgb(flameMiddle);
    const outerRgb = hexToRgb(flameOuter);
    const blueRgb = hexToRgb(flameBlue);

    // ========== BACKGROUND ==========
    // Deep radial gradient background
    const bgGrad = ctx.createRadialGradient(
      width / 2, height * 0.35, 0,
      width / 2, height * 0.35, height * 0.8
    );
    bgGrad.addColorStop(0, `rgba(${accentRgb.r}, ${accentRgb.g}, ${accentRgb.b}, 1)`);
    bgGrad.addColorStop(0.5, `rgba(${Math.floor((bgRgb.r + accentRgb.r) / 2)}, ${Math.floor((bgRgb.g + accentRgb.g) / 2)}, ${Math.floor((bgRgb.b + accentRgb.b) / 2)}, 1)`);
    bgGrad.addColorStop(1, `rgba(${bgRgb.r}, ${bgRgb.g}, ${bgRgb.b}, 1)`);
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, width, height);

    ctx.save();
    ctx.translate(width / 2, height / 2);
    ctx.scale(scale, scale);

    // Candle dimensions (relative to center)
    const candleWidth = 220;
    const candleHeight = 200;
    const candleTop = 80; // Y position of candle top from center
    const candleBottom = candleTop + candleHeight;
    const wickHeight = 35;
    const wickBaseY = candleTop - 2;
    const wickTopY = wickBaseY - wickHeight;

    // Flame anchor point (top of wick)
    const flameBaseY = wickTopY + 5;

    // ========== LARGE AMBIENT GLOW ==========
    if (glowIntensity > 0) {
      const glowPulse = 1 + flicker2 * flickerAmount * 0.1;
      const glowSize = 280 * glowPulse * entrance;

      ctx.save();
      const ambientGlow = ctx.createRadialGradient(
        swayX * 0.3, flameBaseY - 80, 0,
        swayX * 0.2, flameBaseY - 40, glowSize
      );
      ambientGlow.addColorStop(0, `rgba(${coreRgb.r}, ${coreRgb.g}, ${coreRgb.b}, ${0.12 * glowIntensity * entrance})`);
      ambientGlow.addColorStop(0.3, `rgba(${midRgb.r}, ${midRgb.g}, ${midRgb.b}, ${0.06 * glowIntensity * entrance})`);
      ambientGlow.addColorStop(0.6, `rgba(${outerRgb.r}, ${outerRgb.g}, ${outerRgb.b}, ${0.02 * glowIntensity * entrance})`);
      ambientGlow.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = ambientGlow;
      ctx.fillRect(-400, -400, 800, 800);
      ctx.restore();
    }

    // ========== CANDLE BODY ==========
    ctx.save();
    ctx.globalAlpha = entrance;

    // Candle body (rounded rectangle / cylinder effect)
    const candleLeft = -candleWidth / 2;
    const candleRight = candleWidth / 2;
    const cornerRadius = 12;

    // Side shadow gradient for 3D cylinder effect
    const bodyGrad = ctx.createLinearGradient(candleLeft, 0, candleRight, 0);
    bodyGrad.addColorStop(0, `rgba(${Math.floor(candleRgb.r * 0.5)}, ${Math.floor(candleRgb.g * 0.5)}, ${Math.floor(candleRgb.b * 0.5)}, 1)`);
    bodyGrad.addColorStop(0.2, `rgba(${candleRgb.r}, ${candleRgb.g}, ${candleRgb.b}, 1)`);
    bodyGrad.addColorStop(0.45, `rgba(${candleHiRgb.r}, ${candleHiRgb.g}, ${candleHiRgb.b}, 1)`);
    bodyGrad.addColorStop(0.55, `rgba(${candleHiRgb.r}, ${candleHiRgb.g}, ${candleHiRgb.b}, 1)`);
    bodyGrad.addColorStop(0.8, `rgba(${candleRgb.r}, ${candleRgb.g}, ${candleRgb.b}, 1)`);
    bodyGrad.addColorStop(1, `rgba(${Math.floor(candleRgb.r * 0.4)}, ${Math.floor(candleRgb.g * 0.4)}, ${Math.floor(candleRgb.b * 0.4)}, 1)`);

    ctx.fillStyle = bodyGrad;
    ctx.beginPath();
    ctx.moveTo(candleLeft + cornerRadius, candleTop);
    ctx.lineTo(candleRight - cornerRadius, candleTop);
    ctx.quadraticCurveTo(candleRight, candleTop, candleRight, candleTop + cornerRadius);
    ctx.lineTo(candleRight, candleBottom - cornerRadius);
    ctx.quadraticCurveTo(candleRight, candleBottom, candleRight - cornerRadius, candleBottom);
    ctx.lineTo(candleLeft + cornerRadius, candleBottom);
    ctx.quadraticCurveTo(candleLeft, candleBottom, candleLeft, candleBottom - cornerRadius);
    ctx.lineTo(candleLeft, candleTop + cornerRadius);
    ctx.quadraticCurveTo(candleLeft, candleTop, candleLeft + cornerRadius, candleTop);
    ctx.closePath();
    ctx.fill();

    // Top ellipse (wax pool) with subtle glow from flame
    const ellipseRx = candleWidth / 2;
    const ellipseRy = 22;

    // Wax pool shadow
    const poolGrad = ctx.createRadialGradient(0, candleTop, 0, 0, candleTop, ellipseRx);
    const glowOnWax = 0.15 * glowIntensity * entrance;
    poolGrad.addColorStop(0, `rgba(${Math.min(255, candleHiRgb.r + 40)}, ${Math.min(255, candleHiRgb.g + 30)}, ${Math.min(255, candleHiRgb.b + 20)}, 1)`);
    poolGrad.addColorStop(0.3, `rgba(${candleHiRgb.r}, ${candleHiRgb.g}, ${candleHiRgb.b}, 1)`);
    poolGrad.addColorStop(0.7, `rgba(${candleRgb.r}, ${candleRgb.g}, ${candleRgb.b}, 1)`);
    poolGrad.addColorStop(1, `rgba(${Math.floor(candleRgb.r * 0.6)}, ${Math.floor(candleRgb.g * 0.6)}, ${Math.floor(candleRgb.b * 0.6)}, 1)`);

    ctx.fillStyle = poolGrad;
    ctx.beginPath();
    ctx.ellipse(0, candleTop, ellipseRx, ellipseRy, 0, 0, Math.PI * 2);
    ctx.fill();

    // Warm light reflection on wax pool from the flame
    if (glowIntensity > 0) {
      const waxGlow = ctx.createRadialGradient(0, candleTop - 5, 0, 0, candleTop, ellipseRx * 0.6);
      waxGlow.addColorStop(0, `rgba(${coreRgb.r}, ${coreRgb.g}, ${coreRgb.b}, ${glowOnWax})`);
      waxGlow.addColorStop(0.5, `rgba(${midRgb.r}, ${midRgb.g}, ${midRgb.b}, ${glowOnWax * 0.4})`);
      waxGlow.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = waxGlow;
      ctx.beginPath();
      ctx.ellipse(0, candleTop, ellipseRx, ellipseRy, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();

    // ========== WICK ==========
    ctx.save();
    ctx.globalAlpha = entrance;

    // Curved wick
    const wickCurve = swayX * 0.15;
    ctx.strokeStyle = '#1A1215';
    ctx.lineWidth = 3.5;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(0, wickBaseY);
    ctx.quadraticCurveTo(wickCurve * 0.8, wickBaseY - wickHeight * 0.5, wickCurve * 0.4 + swayX * 0.05, wickTopY);
    ctx.stroke();

    // Wick glow (ember at the top)
    const emberGlow = ctx.createRadialGradient(
      wickCurve * 0.4 + swayX * 0.05, wickTopY, 0,
      wickCurve * 0.4 + swayX * 0.05, wickTopY, 6
    );
    emberGlow.addColorStop(0, `rgba(255, 120, 60, ${0.9 * entrance})`);
    emberGlow.addColorStop(0.5, `rgba(200, 60, 30, ${0.4 * entrance})`);
    emberGlow.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = emberGlow;
    ctx.beginPath();
    ctx.arc(wickCurve * 0.4 + swayX * 0.05, wickTopY, 6, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();

    // ========== FLAME ==========
    ctx.save();
    ctx.globalAlpha = entrance;

    // Flame dimensions
    const flameHeight = 170 * flickerScale;
    const flameWidth = 52 + flicker2 * flickerAmount * 8;
    // Draw flame using layered bezier curves

    // --- Layer 1: Blue outer flame (widest, most transparent) ---
    ctx.save();
    const blueFlameH = flameHeight * 1.15;
    const blueFlameW = flameWidth * 1.6;
    const blueTipY = flameBaseY - blueFlameH;

    ctx.globalAlpha = entrance * (0.25 + flicker1 * flickerAmount * 0.05);
    const blueGrad = ctx.createLinearGradient(swayX * 0.4, flameBaseY, swayX * 0.6, blueTipY);
    blueGrad.addColorStop(0, `rgba(${blueRgb.r}, ${blueRgb.g}, ${blueRgb.b}, 0.6)`);
    blueGrad.addColorStop(0.3, `rgba(${blueRgb.r}, ${blueRgb.g}, ${blueRgb.b}, 0.3)`);
    blueGrad.addColorStop(0.7, `rgba(${blueRgb.r + 30}, ${blueRgb.g + 20}, ${blueRgb.b + 40}, 0.15)`);
    blueGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');

    ctx.fillStyle = blueGrad;
    ctx.beginPath();
    ctx.moveTo(swayX * 0.3, flameBaseY);
    ctx.bezierCurveTo(
      swayX * 0.3 - blueFlameW * 0.6, flameBaseY - blueFlameH * 0.2,
      swayX * 0.5 - blueFlameW * 0.35, blueTipY + blueFlameH * 0.3,
      swayX * 0.6, blueTipY
    );
    ctx.bezierCurveTo(
      swayX * 0.5 + blueFlameW * 0.35, blueTipY + blueFlameH * 0.3,
      swayX * 0.3 + blueFlameW * 0.6, flameBaseY - blueFlameH * 0.2,
      swayX * 0.3, flameBaseY
    );
    ctx.closePath();
    ctx.fill();
    ctx.restore();

    // --- Layer 2: Outer red/coral flame ---
    ctx.save();
    const outerH = flameHeight * 1.0;
    const outerW = flameWidth * 1.15;
    const outerTipY = flameBaseY - outerH;

    const outerGrad = ctx.createLinearGradient(swayX * 0.4, flameBaseY, swayX * 0.5, outerTipY);
    outerGrad.addColorStop(0, `rgba(${outerRgb.r}, ${outerRgb.g}, ${outerRgb.b}, 0.9)`);
    outerGrad.addColorStop(0.3, `rgba(${outerRgb.r}, ${outerRgb.g}, ${outerRgb.b}, 0.7)`);
    outerGrad.addColorStop(0.6, `rgba(${midRgb.r}, ${midRgb.g}, ${midRgb.b}, 0.5)`);
    outerGrad.addColorStop(0.85, `rgba(${coreRgb.r}, ${coreRgb.g}, ${coreRgb.b}, 0.2)`);
    outerGrad.addColorStop(1, 'rgba(255, 200, 180, 0)');

    ctx.fillStyle = outerGrad;
    ctx.globalAlpha = entrance * (0.7 + flicker1 * flickerAmount * 0.1);
    ctx.beginPath();
    ctx.moveTo(swayX * 0.35, flameBaseY);
    ctx.bezierCurveTo(
      swayX * 0.35 - outerW * 0.55, flameBaseY - outerH * 0.22,
      swayX * 0.45 - outerW * 0.3, outerTipY + outerH * 0.3,
      swayX * 0.5, outerTipY
    );
    ctx.bezierCurveTo(
      swayX * 0.45 + outerW * 0.3, outerTipY + outerH * 0.3,
      swayX * 0.35 + outerW * 0.55, flameBaseY - outerH * 0.22,
      swayX * 0.35, flameBaseY
    );
    ctx.closePath();
    ctx.fill();
    ctx.restore();

    // --- Layer 3: Middle pink/magenta flame ---
    ctx.save();
    const midH = flameHeight * 0.82;
    const midW = flameWidth * 0.8;
    const midTipY = flameBaseY - midH;

    const midGrad = ctx.createLinearGradient(swayX * 0.4, flameBaseY, swayX * 0.5, midTipY);
    midGrad.addColorStop(0, `rgba(${midRgb.r}, ${midRgb.g}, ${midRgb.b}, 0.95)`);
    midGrad.addColorStop(0.35, `rgba(${coreRgb.r}, ${coreRgb.g}, ${coreRgb.b}, 0.85)`);
    midGrad.addColorStop(0.65, `rgba(${coreRgb.r}, ${coreRgb.g}, ${coreRgb.b}, 0.6)`);
    midGrad.addColorStop(0.9, `rgba(255, 180, 200, 0.25)`);
    midGrad.addColorStop(1, 'rgba(255, 220, 230, 0)');

    ctx.fillStyle = midGrad;
    ctx.globalAlpha = entrance * (0.85 + flicker2 * flickerAmount * 0.08);
    ctx.beginPath();
    ctx.moveTo(swayX * 0.4, flameBaseY + 2);
    ctx.bezierCurveTo(
      swayX * 0.4 - midW * 0.55, flameBaseY - midH * 0.2,
      swayX * 0.45 - midW * 0.28, midTipY + midH * 0.28,
      swayX * 0.5, midTipY
    );
    ctx.bezierCurveTo(
      swayX * 0.45 + midW * 0.28, midTipY + midH * 0.28,
      swayX * 0.4 + midW * 0.55, flameBaseY - midH * 0.2,
      swayX * 0.4, flameBaseY + 2
    );
    ctx.closePath();
    ctx.fill();
    ctx.restore();

    // --- Layer 4: Hot inner core (brightest white/pink) ---
    ctx.save();
    const coreH = flameHeight * 0.5;
    const coreW = flameWidth * 0.4;
    const coreTipY = flameBaseY - coreH;

    const coreGrad = ctx.createLinearGradient(swayX * 0.45, flameBaseY, swayX * 0.5, coreTipY);
    coreGrad.addColorStop(0, `rgba(255, 240, 245, 0.95)`);
    coreGrad.addColorStop(0.3, `rgba(255, 200, 220, 0.8)`);
    coreGrad.addColorStop(0.6, `rgba(${coreRgb.r}, ${coreRgb.g}, ${coreRgb.b}, 0.5)`);
    coreGrad.addColorStop(1, 'rgba(255, 180, 200, 0)');

    ctx.fillStyle = coreGrad;
    ctx.globalAlpha = entrance * (0.9 + flicker1 * flickerAmount * 0.06);
    ctx.beginPath();
    ctx.moveTo(swayX * 0.45, flameBaseY + 3);
    ctx.bezierCurveTo(
      swayX * 0.45 - coreW * 0.5, flameBaseY - coreH * 0.18,
      swayX * 0.48 - coreW * 0.25, coreTipY + coreH * 0.3,
      swayX * 0.5, coreTipY
    );
    ctx.bezierCurveTo(
      swayX * 0.48 + coreW * 0.25, coreTipY + coreH * 0.3,
      swayX * 0.45 + coreW * 0.5, flameBaseY - coreH * 0.18,
      swayX * 0.45, flameBaseY + 3
    );
    ctx.closePath();
    ctx.fill();
    ctx.restore();

    // --- Flame glow halo ---
    if (glowIntensity > 0) {
      ctx.save();
      const haloSize = 100 + flicker1 * flickerAmount * 15;
      const haloY = flameBaseY - flameHeight * 0.4;
      const haloGrad = ctx.createRadialGradient(
        swayX * 0.4, haloY, 0,
        swayX * 0.3, haloY, haloSize
      );
      haloGrad.addColorStop(0, `rgba(${coreRgb.r}, ${coreRgb.g}, ${coreRgb.b}, ${0.15 * glowIntensity * entrance})`);
      haloGrad.addColorStop(0.4, `rgba(${midRgb.r}, ${midRgb.g}, ${midRgb.b}, ${0.06 * glowIntensity * entrance})`);
      haloGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = haloGrad;
      ctx.globalCompositeOperation = 'screen';
      ctx.fillRect(-400, -400, 800, 800);
      ctx.restore();
    }

    ctx.restore(); // end main transform

    // ========== FILM GRAIN ==========
    if (showGrain && grainAmount > 0) {
      const grainSeed = Math.floor(t * 12);
      const step = 4; // grain pixel size
      ctx.save();
      for (let x = 0; x < width; x += step) {
        for (let y = 0; y < height; y += step) {
          const noise = hash(x, y, grainSeed);
          const brightness = (noise - 0.5) * grainAmount * 255;
          if (brightness > 0) {
            ctx.fillStyle = `rgba(255, 255, 255, ${brightness / 255})`;
          } else {
            ctx.fillStyle = `rgba(0, 0, 0, ${-brightness / 255})`;
          }
          ctx.fillRect(x, y, step, step);
        }
      }
      ctx.restore();
    }
  },
};

export default animation;

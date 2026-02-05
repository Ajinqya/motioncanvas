import type { AnimationDefinition } from '../../runtime/types';
import { number, color, boolean, folder, select } from '../../runtime/params';

/**
 * Framer Logo Animation
 * Modern, clean reveal of the Framer logo with glow and inner shadow effects.
 *
 * SVG source (24×24 viewBox):
 *   Path 1 (bottom): M6 9H12L18 15H12V21L6 15V9Z
 *   Path 2 (top):    M18 3H6L12 9H18V3Z
 *
 * Animated as 2 pieces (matching SVG paths):
 *   Top path:    M18 3H6L12 9H18V3Z
 *   Bottom path: M6 9H12L18 15H12V21L6 15V9Z
 */

interface FramerLogoParams {
  // Layout
  scale: number;
  logoGap: number;
  // Colors
  backgroundColor: string;
  logoColor: string;
  // Animation
  speed: number;
  staggerDelay: number;
  entranceStyle: string;
  translationDistance: number;
  // Effects
  glowEnabled: boolean;
  glowColor: string;
  glowIntensity: number;
  glowRadius: number;
  innerShadow: boolean;
  innerShadowIntensity: number;
}

// --- Easing ---
const easeOutCubic = (t: number): number => 1 - Math.pow(1 - t, 3);

// --- Color utility ---
const hexToRgb = (hex: string): [number, number, number] => {
  const r = parseInt(hex.slice(1, 3), 16) || 0;
  const g = parseInt(hex.slice(3, 5), 16) || 0;
  const b = parseInt(hex.slice(5, 7), 16) || 0;
  return [r, g, b];
};

// --- Logo geometry ---
// SVG viewBox is 24×24. The logo spans x:6–18 (12 units) and y:3–21 (18 units).
// We scale so the logo width becomes ~160px before applying the user 'scale' param.
const VB = 24;
const BASE_LOGO_W_PX = 160;
const BASE_SCALE = BASE_LOGO_W_PX / 12; // 160 / (18-6) = 13.333...
const HW_VB = VB / 2; // 12
const HH_VB = VB / 2; // 12

interface PieceConfig {
  path: Path2D;
  enterFrom: { x: number; y: number };
  gapDirY: number;
}

const TOP_PATH = new Path2D('M18 3H6L12 9H18V3Z');
const BOTTOM_PATH = new Path2D('M6 9H12L18 15H12V21L6 15V9Z');

const createPieces = (): PieceConfig[] => [
  { path: TOP_PATH, enterFrom: { x: 0, y: -1 }, gapDirY: -1 },
  { path: BOTTOM_PATH, enterFrom: { x: 0.25, y: 1 }, gapDirY: 1 },
];

const animation: AnimationDefinition<FramerLogoParams> = {
  id: 'framer-logo',
  name: 'Framer Logo',
  fps: 60,
  durationMs: 3000,
  width: 400,
  height: 400,
  background: '#0A0A0A',

  params: {
    defaults: {
      scale: 0.7,
      logoGap: 0,
      backgroundColor: '#0a0a0a',
      logoColor: '#ffffff',
      speed: 2.75,
      staggerDelay: 0.1,
      entranceStyle: 'scale',
      translationDistance: 20,
      glowEnabled: true,
      glowColor: '#414ce1',
      glowIntensity: 0.6,
      glowRadius: 60,
      innerShadow: true,
      innerShadowIntensity: 0,
    },
    schema: {
      ...folder('Layout', {
        scale: number({ value: 1.4, min: 0.5, max: 3, step: 0.1, label: 'Scale' }),
        logoGap: number({ value: 3, min: 0, max: 10, step: 0.5, label: 'Piece Gap' }),
      }),
      ...folder('Colors', {
        backgroundColor: color({ value: '#0A0A0A', label: 'Background' }),
        logoColor: color({ value: '#0B5CFA', label: 'Logo Color' }),
      }),
      ...folder('Animation', {
        speed: number({ value: 1.5, min: 0.25, max: 3, step: 0.25, label: 'Speed' }),
        staggerDelay: number({ value: 0.06, min: 0.02, max: 0.3, step: 0.02, label: 'Stagger Delay' }),
        entranceStyle: select({
          value: 'both',
          options: ['translate', 'scale', 'both'],
          label: 'Entrance Style',
        }),
        translationDistance: number({ value: 100, min: 20, max: 300, step: 10, label: 'Slide Distance' }),
      }),
      ...folder('Effects', {
        glowEnabled: boolean({ value: true, label: 'Glow' }),
        glowColor: color({ value: '#0B5CFA', label: 'Glow Color' }),
        glowIntensity: number({ value: 0.6, min: 0, max: 1, step: 0.05, label: 'Glow Intensity' }),
        glowRadius: number({ value: 40, min: 5, max: 100, step: 5, label: 'Glow Radius' }),
        innerShadow: boolean({ value: true, label: 'Inner Shadow' }),
        innerShadowIntensity: number({ value: 0.25, min: 0, max: 0.6, step: 0.05, label: 'Shadow Intensity' }),
      }),
    },
  },

  render({ ctx, progress, width, height, params }) {
    const {
      scale, logoGap, backgroundColor, logoColor,
      speed, staggerDelay, entranceStyle, translationDistance,
      glowEnabled, glowColor, glowIntensity, glowRadius,
      innerShadow, innerShadowIntensity,
    } = params;

    // --- Clear background ---
    ctx.fillStyle = backgroundColor;
    ctx.fillRect(0, 0, width, height);

    const pieces = createPieces();
    const adjustedProgress = Math.min(progress * speed, 1);

    // --- Timing ---
    const entranceEnd = 0.6;
    const entranceProgress = Math.min(adjustedProgress / entranceEnd, 1);

    const entranceDuration = 0.35;
    const totalStaggerTime = staggerDelay * (pieces.length - 1) + entranceDuration;

    // Glow ramps up from 40%→70% of adjusted progress
    const glowRamp = adjustedProgress < 0.4
      ? 0
      : Math.min(1, (adjustedProgress - 0.4) / 0.3);

    // --- Background ambient glow ---
    if (glowEnabled && glowRamp > 0) {
      const [gr, gg, gb] = hexToRgb(glowColor);
      const bgGlowAlpha = glowRamp * glowIntensity * 0.12;
      const bgGlow = ctx.createRadialGradient(
        width / 2, height / 2, 0,
        width / 2, height / 2, width * 0.45,
      );
      bgGlow.addColorStop(0, `rgba(${gr}, ${gg}, ${gb}, ${bgGlowAlpha})`);
      bgGlow.addColorStop(1, `rgba(${gr}, ${gg}, ${gb}, 0)`);
      ctx.fillStyle = bgGlow;
      ctx.fillRect(0, 0, width, height);
    }

    // --- Draw logo pieces ---
    ctx.save();
    ctx.translate(width / 2, height / 2);
    ctx.scale(scale, scale);
    // Convert SVG coordinates (0..24) into our centered coordinate system.
    // After this, 1 SVG unit maps to BASE_SCALE px (before applying user scale).
    ctx.scale(BASE_SCALE, BASE_SCALE);
    ctx.translate(-HW_VB, -HH_VB);

    pieces.forEach((piece, index) => {
      // Staggered entrance timing
      const startTime = index * staggerDelay;
      const pieceProgress = Math.max(0, Math.min(1,
        (entranceProgress * totalStaggerTime - startTime) / entranceDuration,
      ));

      if (pieceProgress <= 0) return;

      const eased = easeOutCubic(pieceProgress);

      ctx.save();

      // Optional seam gap between the two pieces (in SVG units).
      // Translate along Y around the shared seam at y=9 (centered after translate(-12,-12)).
      if (logoGap > 0) {
        const gapSvg = (logoGap / BASE_SCALE) * 0.5;
        ctx.translate(0, piece.gapDirY * gapSvg);
      }

      // --- Entrance transforms ---
      const offsetMult = 1 - eased;

      if (entranceStyle === 'translate' || entranceStyle === 'both') {
        ctx.translate(
          piece.enterFrom.x * translationDistance * offsetMult,
          piece.enterFrom.y * translationDistance * offsetMult,
        );
      }

      if (entranceStyle === 'scale' || entranceStyle === 'both') {
        const s = 0.3 + 0.7 * eased;
        ctx.scale(s, s);
      }

      // Fade in (slightly faster than position)
      ctx.globalAlpha = Math.min(1, eased * 1.5);

      const path = piece.path;

      // --- Outer glow ---
      if (glowEnabled && glowIntensity > 0) {
        const currentGlow = glowRadius * glowIntensity * Math.max(eased, glowRamp);
        ctx.shadowColor = glowColor;
        ctx.shadowBlur = currentGlow;
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 0;
      }

      // Fill shape
      ctx.fillStyle = logoColor;
      ctx.fill(path);

      // Reset shadow before inner effects
      ctx.shadowBlur = 0;
      ctx.shadowColor = 'transparent';

      // --- Inner shadow (depth) ---
      if (innerShadow && eased > 0.3) {
        const shadowAlpha = (eased - 0.3) * innerShadowIntensity * 1.4;

        // Dark gradient on bottom-right (shadow side)
        const darkGrad = ctx.createLinearGradient(0, 0, VB, VB);
        darkGrad.addColorStop(0, `rgba(0, 0, 0, 0)`);
        darkGrad.addColorStop(0.5, `rgba(0, 0, 0, 0)`);
        darkGrad.addColorStop(1, `rgba(0, 0, 0, ${shadowAlpha})`);
        ctx.fillStyle = darkGrad;
        ctx.fill(path);

        // Light highlight on top-left
        const lightGrad = ctx.createLinearGradient(VB, VB, 0, 0);
        lightGrad.addColorStop(0, `rgba(255, 255, 255, 0)`);
        lightGrad.addColorStop(0.65, `rgba(255, 255, 255, 0)`);
        lightGrad.addColorStop(1, `rgba(255, 255, 255, ${shadowAlpha * 0.25})`);
        ctx.fillStyle = lightGrad;
        ctx.fill(path);
      }

      ctx.restore();
    });

    ctx.restore();
  },
};

export default animation;

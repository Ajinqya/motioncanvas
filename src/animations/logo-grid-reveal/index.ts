import type { AnimationDefinition } from '../../runtime/types';
import { number, color, folder } from '../../runtime/params';

/**
 * Logo Grid Reveal
 * Premium construction-grid animation that progressively builds up
 * a logo design with grid lines, construction circles, anchor points,
 * then materializes the logo with a diagonal wipe and border trace.
 */

interface LogoGridRevealParams {
  scale: number;
  logoColor1: string;
  logoColor2: string;
  borderColor1: string;
  borderColor2: string;
  gridColor: string;
  backgroundColor: string;
  speed: number;
}

// ── Easing ──────────────────────────────────────────────────
const easeOutCubic = (t: number): number => 1 - Math.pow(1 - t, 3);
const easeInOutCubic = (t: number): number =>
  t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
const easeOutQuart = (t: number): number => 1 - Math.pow(1 - t, 4);
const clamp01 = (t: number): number => Math.max(0, Math.min(1, t));
const remap = (v: number, a: number, b: number): number =>
  clamp01((v - a) / (b - a));

function rgba(hex: string, a: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${a})`;
}

// ── Static grid data ────────────────────────────────────────
const DIAGS: number[][] = [
  [-106.316, -163, 1142.68, 1086],
  [-104, -220, 1225, 1109],
  [-106.542, -293, 1241.46, 1055],
  [-103.549, -349, 1255.45, 1010],
];
const HLINES = [270.381, 384.688, 515.265, 629.531];
const VLINES = [270.688, 384.877, 515.57, 629.316];

// ── Anchor circle data [cx, cy, radius] ────────────────────
const DOTS: number[][] = [
  [281.188, 618.73, 10.8],
  [377.678, 622.301, 7.2],
  [522.455, 622.331, 7.2],
  [618.799, 618.764, 10.8],
  [618.777, 281.195, 10.77],
  [280.855, 281.16, 10.59],
  [277.346, 377.806, 6.9],
  [277.359, 522.166, 6.9],
  [324.2, 277.819, 7.2],
  [394.225, 273.787, 3.35],
  [453.72, 277.64, 7.2],
  [626.179, 376.29, 3.35],
  [622.227, 446.2, 7.2],
  [626.216, 505.809, 3.35],
  [622.282, 575.2, 7.2],
  [523.728, 273.728, 3.35],
];

// ── Logo path definitions (path commands only, no begin/fill) ──

function pBody(c: CanvasRenderingContext2D) {
  c.moveTo(329.709, 272.109);
  c.lineTo(627.891, 570.291);
  c.bezierCurveTo(629.241, 571.641, 630, 573.473, 630, 575.382);
  c.lineTo(630, 619.2);
  c.bezierCurveTo(630, 625.165, 625.165, 630, 619.2, 630);
  c.lineTo(522, 630);
  c.bezierCurveTo(518.024, 630, 514.8, 626.776, 514.8, 622.8);
  c.lineTo(514.8, 608.4);
  c.bezierCurveTo(514.8, 572.612, 485.788, 543.6, 450, 543.6);
  c.bezierCurveTo(414.212, 543.6, 385.2, 572.612, 385.2, 608.4);
  c.lineTo(385.2, 622.8);
  c.bezierCurveTo(385.2, 626.776, 381.976, 630, 378, 630);
  c.lineTo(280.8, 630);
  c.bezierCurveTo(274.835, 630, 270, 625.165, 270, 619.2);
  c.lineTo(270, 522);
  c.bezierCurveTo(270, 518.024, 273.224, 514.8, 277.2, 514.8);
  c.lineTo(291.6, 514.8);
  c.bezierCurveTo(327.388, 514.8, 356.4, 485.788, 356.4, 450);
  c.bezierCurveTo(356.4, 414.212, 327.388, 385.2, 291.6, 385.2);
  c.lineTo(277.2, 385.2);
  c.bezierCurveTo(273.224, 385.2, 270, 381.976, 270, 378);
  c.lineTo(270, 280.8);
  c.bezierCurveTo(270, 274.835, 274.835, 270, 280.8, 270);
  c.lineTo(324.618, 270);
  c.bezierCurveTo(326.527, 270, 328.359, 270.759, 329.709, 272.109);
  c.closePath();
}

function pStripe(c: CanvasRenderingContext2D) {
  c.moveTo(459.309, 272.109);
  c.lineTo(627.891, 440.691);
  c.bezierCurveTo(629.241, 442.041, 630, 443.873, 630, 445.782);
  c.lineTo(630, 506.109);
  c.bezierCurveTo(630, 509.316, 626.122, 510.922, 623.854, 508.654);
  c.lineTo(391.346, 276.146);
  c.bezierCurveTo(389.078, 273.878, 390.684, 270, 393.891, 270);
  c.lineTo(454.218, 270);
  c.bezierCurveTo(456.127, 270, 457.959, 270.759, 459.309, 272.109);
  c.closePath();
}

function pCorner(c: CanvasRenderingContext2D) {
  c.moveTo(520.946, 276.146);
  c.lineTo(623.854, 379.054);
  c.bezierCurveTo(626.122, 381.322, 630, 379.716, 630, 376.509);
  c.lineTo(630, 280.8);
  c.bezierCurveTo(630, 274.835, 625.165, 270, 619.2, 270);
  c.lineTo(523.491, 270);
  c.bezierCurveTo(520.284, 270, 518.678, 273.878, 520.946, 276.146);
  c.closePath();
}

function pBorder(c: CanvasRenderingContext2D) {
  // Main body outline
  c.moveTo(280.8, 270.5);
  c.lineTo(324.617, 270.5);
  c.bezierCurveTo(326.394, 270.5, 328.099, 271.206, 329.355, 272.462);
  c.lineTo(627.538, 570.645);
  c.bezierCurveTo(628.794, 571.901, 629.5, 573.606, 629.5, 575.383);
  c.lineTo(629.5, 619.2);
  c.bezierCurveTo(629.5, 624.889, 624.889, 629.5, 619.2, 629.5);
  c.lineTo(522, 629.5);
  c.bezierCurveTo(518.3, 629.5, 515.3, 626.5, 515.3, 622.8);
  c.lineTo(515.3, 608.4);
  c.bezierCurveTo(515.3, 572.336, 486.064, 543.1, 450, 543.1);
  c.bezierCurveTo(413.936, 543.1, 384.7, 572.336, 384.7, 608.4);
  c.lineTo(384.7, 622.8);
  c.bezierCurveTo(384.7, 626.5, 381.7, 629.5, 378, 629.5);
  c.lineTo(280.8, 629.5);
  c.bezierCurveTo(275.111, 629.5, 270.5, 624.889, 270.5, 619.2);
  c.lineTo(270.5, 522);
  c.bezierCurveTo(270.5, 518.3, 273.5, 515.3, 277.2, 515.3);
  c.lineTo(291.6, 515.3);
  c.bezierCurveTo(327.664, 515.3, 356.9, 486.064, 356.9, 450);
  c.bezierCurveTo(356.9, 413.936, 327.664, 384.7, 291.6, 384.7);
  c.lineTo(277.2, 384.7);
  c.bezierCurveTo(273.5, 384.7, 270.5, 381.7, 270.5, 378);
  c.lineTo(270.5, 280.8);
  c.bezierCurveTo(270.5, 275.111, 275.111, 270.5, 280.8, 270.5);
  c.closePath();

  // Middle stripe outline
  c.moveTo(393.892, 270.5);
  c.lineTo(454.218, 270.5);
  c.bezierCurveTo(455.995, 270.5, 457.699, 271.206, 458.955, 272.462);
  c.lineTo(627.538, 441.045);
  c.bezierCurveTo(628.794, 442.301, 629.5, 444.005, 629.5, 445.782);
  c.lineTo(629.5, 506.108);
  c.bezierCurveTo(629.5, 508.87, 626.161, 510.254, 624.208, 508.301);
  c.lineTo(391.699, 275.792);
  c.bezierCurveTo(389.746, 273.839, 391.13, 270.5, 393.892, 270.5);
  c.closePath();

  // Corner triangle outline
  c.moveTo(523.491, 270.5);
  c.lineTo(619.2, 270.5);
  c.bezierCurveTo(624.889, 270.5, 629.5, 275.111, 629.5, 280.8);
  c.lineTo(629.5, 376.509);
  c.bezierCurveTo(629.5, 379.271, 626.161, 380.654, 624.208, 378.701);
  c.lineTo(521.299, 275.792);
  c.bezierCurveTo(519.346, 273.839, 520.729, 270.5, 523.491, 270.5);
  c.closePath();
}

// ── Grid drawing helper ─────────────────────────────────────
function drawGrid(c: CanvasRenderingContext2D) {
  for (const d of DIAGS) {
    c.beginPath();
    c.moveTo(d[0], d[1]);
    c.lineTo(d[2], d[3]);
    c.stroke();
  }
  for (const y of HLINES) {
    c.beginPath();
    c.moveTo(-510, y);
    c.lineTo(1470, y);
    c.stroke();
  }
  for (const x of VLINES) {
    c.beginPath();
    c.moveTo(x, -90);
    c.lineTo(x, 990);
    c.stroke();
  }
}

// ── Animation Definition ────────────────────────────────────

const animation: AnimationDefinition<LogoGridRevealParams> = {
  id: 'logo-grid-reveal',
  name: 'Logo Grid Reveal',
  fps: 60,
  durationMs: 5000,
  width: 900,
  height: 900,
  background: '#171717',

  params: {
    defaults: {
      scale: 1,
      logoColor1: '#1C1C1C',
      logoColor2: '#292929',
      borderColor1: '#454545',
      borderColor2: '#7E7E7E',
      gridColor: '#828282',
      backgroundColor: '#171717',
      speed: 1,
    },
    schema: {
      ...folder('Layout', {
        scale: number({ value: 1, min: 0.5, max: 2, step: 0.1, label: 'Scale' }),
      }),
      ...folder('Colors', {
        logoColor1: color({ value: '#1C1C1C', label: 'Logo Top' }),
        logoColor2: color({ value: '#292929', label: 'Logo Bottom' }),
        borderColor1: color({ value: '#D3C8C8', label: 'Border Light' }),
        borderColor2: color({ value: '#7E7E7E', label: 'Border Dark' }),
        gridColor: color({ value: '#FFFFFF', label: 'Grid Lines' }),
        backgroundColor: color({ value: '#171717', label: 'Background' }),
      }),
      ...folder('Animation', {
        speed: number({ value: 1, min: 0.5, max: 2, step: 0.1, label: 'Speed' }),
      }),
    },
  },

  render({ ctx, width, height, progress, params }) {
    const {
      scale, logoColor1, logoColor2, borderColor1, borderColor2,
      gridColor, backgroundColor, speed,
    } = params;

    const p = clamp01(progress * speed);
    const cx = width / 2;
    const cy = height / 2;

    // ── Background ───────────────────────────────────────
    ctx.fillStyle = backgroundColor;
    ctx.fillRect(0, 0, width, height);

    ctx.save();

    // Subtle breathe: starts 1.5 % zoomed in, settles to 1×
    const breathe = 1 + 0.015 * (1 - easeOutCubic(remap(p, 0, 0.6)));
    ctx.translate(cx, cy);
    ctx.scale(scale * breathe, scale * breathe);
    ctx.translate(-cx, -cy);

    // ═══════════════════════════════════════════════════════
    // PHASE 1 — Grid Lines (appear first)
    // ═══════════════════════════════════════════════════════
    const gIn = easeOutCubic(remap(p, 0, 0.28));
    const gFlash = Math.max(0, 1 - easeOutCubic(remap(p, 0.2, 0.45)));
    const gA = gIn * (0.4 + gFlash * 0.25);

    if (gA > 0.002) {
      ctx.save();

      // Expanding circle clip for reveal
      if (gIn < 0.999) {
        ctx.beginPath();
        ctx.arc(cx, cy, gIn * 680, 0, Math.PI * 2);
        ctx.clip();
      }

      // Glow pass — thicker lines during flash
      if (gFlash > 0.02) {
        ctx.strokeStyle = rgba(gridColor, gFlash * 0.08);
        ctx.lineWidth = 5;
        ctx.setLineDash([7, 7]);
        ctx.lineDashOffset = -p * 60;
        drawGrid(ctx);
      }

      // Main grid lines
      ctx.strokeStyle = rgba(gridColor, gA);
      ctx.lineWidth = 1;
      ctx.setLineDash([7, 7]);
      ctx.lineDashOffset = -p * 60;
      drawGrid(ctx);

      ctx.restore();
    }

    // ═══════════════════════════════════════════════════════
    // PHASE 2 — Logo Fill (appears after grid lines)
    // ═══════════════════════════════════════════════════════
    const lP = easeOutQuart(remap(p, 0.18, 0.48));

    if (lP > 0.002) {
      ctx.save();

      // Diagonal wipe clip: visible where x + y < threshold
      if (lP < 0.999) {
        const wC = 480 + lP * 860;
        ctx.beginPath();
        ctx.moveTo(-200, -200);
        ctx.lineTo(wC + 200, -200);
        ctx.lineTo(-200, wC + 200);
        ctx.closePath();
        ctx.clip();
      }

      // Logo gradient fill
      const grad = ctx.createLinearGradient(450, 270, 450, 630);
      grad.addColorStop(0, logoColor1);
      grad.addColorStop(1, logoColor2);

      // Drop shadow
      ctx.shadowColor = 'rgba(0,0,0,0.29)';
      ctx.shadowBlur = 27;
      ctx.shadowOffsetX = 0;
      ctx.shadowOffsetY = 12;

      ctx.fillStyle = grad;
      ctx.beginPath();
      pBody(ctx);
      pStripe(ctx);
      pCorner(ctx);
      ctx.fill();

      // Clear shadow
      ctx.shadowColor = 'transparent';
      ctx.shadowBlur = 0;
      ctx.shadowOffsetY = 0;

      ctx.restore();
    }

    // ═══════════════════════════════════════════════════════
    // PHASE 3 — Border Trace (appears after logo)
    // ═══════════════════════════════════════════════════════
    const bP = easeInOutCubic(remap(p, 0.46, 0.72));

    if (bP > 0.002) {
      ctx.save();

      const bGrad = ctx.createLinearGradient(630, 270, 270, 630);
      bGrad.addColorStop(0, borderColor1);
      bGrad.addColorStop(1, borderColor2);

      ctx.strokeStyle = bGrad;
      ctx.lineWidth = 1;

      // Trace effect via dash pattern
      const len = 3000;
      ctx.setLineDash([len * bP, len]);

      ctx.beginPath();
      pBorder(ctx);
      ctx.stroke();

      ctx.restore();
    }

    // ═══════════════════════════════════════════════════════
    // PHASE 4 — Construction Circles (compass draw-in, after logo)
    // ═══════════════════════════════════════════════════════
    const ccDraw = easeInOutCubic(remap(p, 0.48, 0.70));
    const ccFlash = Math.max(0, 1 - easeOutCubic(remap(p, 0.65, 0.82)));
    const ccA = ccDraw > 0 ? 0.4 + ccFlash * 0.15 : 0;

    if (ccA > 0.002 && ccDraw > 0.002) {
      ctx.save();
      ctx.strokeStyle = rgba(gridColor, ccA);
      ctx.lineWidth = 1;
      ctx.setLineDash([8, 8]);

      const angle = ccDraw * Math.PI * 2;
      const start = -Math.PI / 2;

      // Bottom construction circle
      ctx.beginPath();
      ctx.arc(450.224, 608.511, 65.3465, start, start + angle);
      ctx.stroke();

      // Left construction circle
      ctx.beginPath();
      ctx.arc(291.299, 450.034, 65.3465, start, start + angle);
      ctx.stroke();

      ctx.restore();
    }

    // ═══════════════════════════════════════════════════════
    // PHASE 5 — Anchor Dots (staggered pop-in, after logo)
    // ═══════════════════════════════════════════════════════
    const adIn = easeOutCubic(remap(p, 0.52, 0.76));

    if (adIn > 0.002) {
      ctx.save();
      ctx.lineWidth = 2;
      ctx.setLineDash([2, 2]);

      for (let i = 0; i < DOTS.length; i++) {
        const [dx, dy, dr] = DOTS[i];
        const stagger = (i / DOTS.length) * 0.3;
        const s = easeOutQuart(clamp01((adIn - stagger) / 0.7));

        if (s > 0.01) {
          ctx.save();
          ctx.globalAlpha = s * 0.3;
          ctx.strokeStyle = gridColor;
          ctx.translate(dx, dy);
          ctx.scale(s, s);
          ctx.beginPath();
          ctx.arc(0, 0, dr, 0, Math.PI * 2);
          ctx.stroke();
          ctx.restore();
        }
      }

      ctx.restore();
    }

    // ═══════════════════════════════════════════════════════
    // PHASE 6 — Radial Vignette (focuses attention on center)
    // ═══════════════════════════════════════════════════════
    const vGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, 417);
    vGrad.addColorStop(0, rgba(backgroundColor, 0));
    vGrad.addColorStop(1, backgroundColor);

    ctx.fillStyle = vGrad;
    ctx.fillRect(0, 0, width, height);

    // ═══════════════════════════════════════════════════════
    // PHASE 7 — Ambient Glow (subtle halo on logo)
    // ═══════════════════════════════════════════════════════
    const glP = easeOutCubic(remap(p, 0.72, 0.95));

    if (glP > 0.01 && lP > 0.5) {
      ctx.save();
      ctx.globalAlpha = glP * 0.06;
      ctx.shadowColor = rgba(borderColor1, 0.5);
      ctx.shadowBlur = 60;
      ctx.fillStyle = rgba(borderColor1, 0.03);
      ctx.beginPath();
      pBody(ctx);
      pStripe(ctx);
      pCorner(ctx);
      ctx.fill();
      ctx.restore();
    }

    ctx.restore();
  },
};

export default animation;

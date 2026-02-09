import type { AnimationDefinition } from '../../runtime/types';
import { number, color, boolean, folder } from '../../runtime/params';

/**
 * Speedo Bar – Automotive speedometer with RPM arc glow, gear indicator,
 * and inner-circle scale animation that bounces on each gear shift.
 * 6 gears (0→6), top speed 160 MP/H.
 */

interface SpeedoBarParams {
  scale: number;
  primaryColor: string;
  backgroundColor: string;
  glowColor: string;
  textColor: string;
  speed: number;
  gaugeSize: number;
  arcThickness: number;
  roundedEnds: boolean;
}

// ── Easing helpers ──────────────────────────────────────────────────────────
const easeOutCubic = (t: number): number => 1 - Math.pow(1 - t, 3);
const easeInOutQuad = (t: number): number =>
  t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
const easeOutQuad = (t: number): number => 1 - (1 - t) * (1 - t);

// Deterministic pseudo-random for consistent particles across frames
const hash = (seed: number): number => {
  const x = Math.sin(seed * 12.9898 + seed * 78.233) * 43758.5453;
  return x - Math.floor(x);
};

// ── Rounded rect helper ─────────────────────────────────────────────────────
function drawRoundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  r = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.arcTo(x + w, y, x + w, y + r, r);
  ctx.lineTo(x + w, y + h - r);
  ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
  ctx.lineTo(x + r, y + h);
  ctx.arcTo(x, y + h, x, y + h - r, r);
  ctx.lineTo(x, y + r);
  ctx.arcTo(x, y, x + r, y, r);
  ctx.closePath();
}

// ── Hex-alpha helper ────────────────────────────────────────────────────────
function hexAlpha(hex: string, alpha: number): string {
  const a = Math.round(Math.min(1, Math.max(0, alpha)) * 255)
    .toString(16)
    .padStart(2, '0');
  return hex + a;
}

// ── Gear configuration ──────────────────────────────────────────────────────
// Each gear: progress range, speed range
const GEARS = [
  { gear: 0, start: 0.0, end: 0.03, spdA: 0, spdB: 0 },
  { gear: 1, start: 0.03, end: 0.15, spdA: 0, spdB: 28 },
  { gear: 2, start: 0.15, end: 0.29, spdA: 28, spdB: 58 },
  { gear: 3, start: 0.29, end: 0.45, spdA: 58, spdB: 92 },
  { gear: 4, start: 0.45, end: 0.61, spdA: 92, spdB: 122 },
  { gear: 5, start: 0.61, end: 0.79, spdA: 122, spdB: 144 },
  { gear: 6, start: 0.79, end: 1.0, spdA: 144, spdB: 160 },
];

// ── Animation definition ────────────────────────────────────────────────────
const animation: AnimationDefinition<SpeedoBarParams> = {
  id: 'speedo-bar',
  name: 'Speedo Bar',
  fps: 60,
  durationMs: 12000,
  width: 800,
  height: 800,
  background: '#000000',

  params: {
    defaults: {
      scale: 1,
      primaryColor: '#FF6B00',
      backgroundColor: '#000000',
      glowColor: '#FF8C00',
      textColor: '#FFFFFF',
      speed: 1,
      gaugeSize: 0.55,
      arcThickness: 0.27,
      roundedEnds: false,
    },
    schema: {
      ...folder('Layout', {
        scale: number({ value: 1, min: 0.1, max: 3, step: 0.1, label: 'Scale' }),
        gaugeSize: number({
          value: 0.85,
          min: 0.3,
          max: 1.0,
          step: 0.05,
          label: 'Gauge Size',
        }),
        arcThickness: number({
          value: 0.22,
          min: 0.05,
          max: 0.5,
          step: 0.01,
          label: 'Arc Thickness',
        }),
        roundedEnds: boolean({ value: true, label: 'Rounded Ends' }),
      }),
      ...folder('Colors', {
        primaryColor: color({ value: '#FF6B00', label: 'Primary Color' }),
        backgroundColor: color({ value: '#000000', label: 'Background' }),
        glowColor: color({ value: '#FF8C00', label: 'Glow Color' }),
        textColor: color({ value: '#FFFFFF', label: 'Text Color' }),
      }),
      ...folder('Animation', {
        speed: number({ value: 1, min: 0.1, max: 3, step: 0.1, label: 'Speed' }),
      }),
    },
  },

  render({ ctx, width, height, progress, params }) {
    const {
      scale,
      primaryColor,
      backgroundColor,
      glowColor,
      textColor,
      speed,
      gaugeSize,
      arcThickness,
      roundedEnds,
    } = params;

    const p = Math.min(progress * speed, 1);

    // ── Background with subtle radial gradient ────────────────────────────
    const bgGrad = ctx.createRadialGradient(
      width / 2,
      height / 2,
      0,
      width / 2,
      height / 2,
      width * 0.55,
    );
    bgGrad.addColorStop(0, '#0a0a18');
    bgGrad.addColorStop(1, backgroundColor);
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, width, height);

    ctx.save();
    ctx.translate(width / 2, height / 2);
    ctx.scale(scale, scale);

    const R = Math.min(width, height) * 0.35 * gaugeSize;

    // ── Speed: one continuous ease-out curve 0→160 ─────────────────────────
    const curSpeed = 160 * easeOutCubic(p);

    // ── Gear & RPM (only for gear indicator + inner circle bounce) ────────
    let curGear = 0;
    let gearProg = 0; // 0→1 within current gear
    let rpm = 0; // 0→1 normalized RPM within current gear

    for (const g of GEARS) {
      if (p >= g.start && p < g.end) {
        curGear = g.gear;
        gearProg = (p - g.start) / (g.end - g.start);
        rpm = g.gear === 0
          ? easeInOutQuad(gearProg) * 0.12
          : easeOutQuad(gearProg);
        break;
      }
    }
    if (p >= 1) {
      curGear = 6;
      gearProg = 1;
      rpm = 1;
    }

    // ── Inner circle scale (bounces on gear shift) ────────────────────────
    let innerScale = 1.0;
    if (curGear > 0) {
      const shiftDur = 0.14; // first 14% of gear = bounce phase
      if (gearProg < shiftDur) {
        const t = gearProg / shiftDur;
        // Drop to 0.86, then ease back to 1.0
        innerScale = 0.86 + 0.14 * easeOutCubic(t);
      } else {
        // Grow with RPM
        innerScale = 1.0 + rpm * 0.14;
      }
    }

    // ── Arc geometry (270° sweep, gap at bottom) ──────────────────────────
    const ARC_START = Math.PI * 0.75; // 135° – about 7:30 position
    const ARC_SWEEP = Math.PI * 1.5; // 270°
    const ARC_END = ARC_START + ARC_SWEEP;
    const speedNorm = Math.min(curSpeed / 160, 1); // 0→1 based on speed (continuous)
    const speedAngle = ARC_START + ARC_SWEEP * speedNorm;

    // ═══════════════════════════════════════════════════════════════════════
    // 1. OUTER SPEED ARC WITH GLOW
    // ═══════════════════════════════════════════════════════════════════════
    if (speedNorm > 0.005) {
      const arcR = R * 1.35;
      const arcW = R * arcThickness;
      const capStyle: CanvasLineCap = roundedEnds ? 'round' : 'butt';

      // ── Glow layers (furthest/softest first) ──────────────────────────
      for (let i = 5; i >= 0; i--) {
        ctx.save();
        ctx.beginPath();
        ctx.arc(0, 0, arcR, ARC_START, speedAngle, false);
        ctx.lineWidth = arcW + i * 20;
        ctx.lineCap = capStyle;
        ctx.strokeStyle = hexAlpha(primaryColor, 0.025 + (5 - i) * 0.04);
        ctx.shadowColor = primaryColor;
        ctx.shadowBlur = 15 + i * 25;
        ctx.stroke();
        ctx.restore();
      }

      // ── Main solid arc ────────────────────────────────────────────────
      ctx.save();
      ctx.beginPath();
      ctx.arc(0, 0, arcR, ARC_START, speedAngle, false);
      ctx.lineWidth = arcW;
      ctx.lineCap = capStyle;
      ctx.strokeStyle = primaryColor;
      ctx.shadowColor = glowColor;
      ctx.shadowBlur = 45;
      ctx.globalAlpha = 0.92;
      ctx.stroke();
      ctx.globalAlpha = 1;
      ctx.restore();

      // ── Bright inner edge highlight ───────────────────────────────────
      ctx.save();
      ctx.beginPath();
      ctx.arc(0, 0, arcR, ARC_START, speedAngle, false);
      ctx.lineWidth = arcW * 0.3;
      ctx.lineCap = capStyle;
      ctx.strokeStyle = glowColor;
      ctx.shadowColor = '#FFD080';
      ctx.shadowBlur = 12;
      ctx.globalAlpha = 0.45;
      ctx.stroke();
      ctx.globalAlpha = 1;
      ctx.restore();

      // ── Ember particles ───────────────────────────────────────────────
      const particleCount = Math.floor(speedNorm * 70) + 12;
      for (let i = 0; i < particleCount; i++) {
        const r1 = hash(i * 7 + 1);
        const r2 = hash(i * 13 + 3);
        const r3 = hash(i * 19 + 7);
        const r4 = hash(i * 31 + 11);
        const pAngle = ARC_START + r1 * (speedAngle - ARC_START);
        const offsetR = (r2 - 0.5) * arcW * 2.0;
        const px = Math.cos(pAngle) * (arcR + offsetR);
        const py = Math.sin(pAngle) * (arcR + offsetR);
        const pSize = 1 + r3 * 3.5;
        const pAlpha = 0.08 + r4 * 0.35;

        ctx.save();
        ctx.beginPath();
        ctx.arc(px, py, pSize, 0, Math.PI * 2);
        ctx.fillStyle = r3 > 0.5 ? glowColor : primaryColor;
        ctx.globalAlpha = pAlpha;
        ctx.shadowColor = primaryColor;
        ctx.shadowBlur = 6;
        ctx.fill();
        ctx.restore();
      }
    }

    // ═══════════════════════════════════════════════════════════════════════
    // 2. DARK SEPARATION RING
    // ═══════════════════════════════════════════════════════════════════════
    ctx.beginPath();
    ctx.arc(0, 0, R * 1.1, 0, Math.PI * 2);
    ctx.lineWidth = R * 0.1;
    ctx.strokeStyle = '#06060e';
    ctx.stroke();

    // ═══════════════════════════════════════════════════════════════════════
    // 3. TICK MARKS
    // ═══════════════════════════════════════════════════════════════════════
    const tickR = R * 1.06;
    const totalTicks = 48;
    for (let i = 0; i <= totalTicks; i++) {
      const angle = ARC_START + (ARC_SWEEP / totalTicks) * i;
      const isMajor = i % 6 === 0;
      const len = isMajor ? R * 0.065 : R * 0.03;
      const w = isMajor ? 2 : 1;

      ctx.beginPath();
      ctx.moveTo(Math.cos(angle) * tickR, Math.sin(angle) * tickR);
      ctx.lineTo(
        Math.cos(angle) * (tickR + len),
        Math.sin(angle) * (tickR + len),
      );
      ctx.lineWidth = w;
      ctx.strokeStyle = isMajor
        ? 'rgba(255,255,255,0.38)'
        : 'rgba(255,255,255,0.12)';
      ctx.stroke();
    }

    // ═══════════════════════════════════════════════════════════════════════
    // 4. OUTER THIN ARC RAIL
    // ═══════════════════════════════════════════════════════════════════════
    ctx.beginPath();
    ctx.arc(0, 0, R * 1.05, ARC_START, ARC_END, false);
    ctx.lineWidth = 1.5;
    ctx.strokeStyle = 'rgba(255,255,255,0.1)';
    ctx.stroke();

    // Arc start/end marker lines
    for (const angle of [ARC_START, ARC_END]) {
      ctx.beginPath();
      ctx.moveTo(Math.cos(angle) * R, Math.sin(angle) * R);
      ctx.lineTo(
        Math.cos(angle) * (R * 1.16),
        Math.sin(angle) * (R * 1.16),
      );
      ctx.lineWidth = 2;
      ctx.strokeStyle = 'rgba(255,255,255,0.22)';
      ctx.lineCap = 'round';
      ctx.stroke();
    }

    // ═══════════════════════════════════════════════════════════════════════
    // 5. SPEED NEEDLE INDICATOR
    // ═══════════════════════════════════════════════════════════════════════
    if (speedNorm > 0.01) {
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(
        Math.cos(speedAngle) * (R * 0.98),
        Math.sin(speedAngle) * (R * 0.98),
      );
      ctx.lineTo(
        Math.cos(speedAngle) * (R * 1.18),
        Math.sin(speedAngle) * (R * 1.18),
      );
      ctx.lineWidth = 2.5;
      ctx.strokeStyle = 'rgba(255,255,255,0.55)';
      ctx.lineCap = 'round';
      ctx.shadowColor = '#ffffff';
      ctx.shadowBlur = 4;
      ctx.stroke();
      ctx.restore();
    }

    // ═══════════════════════════════════════════════════════════════════════
    // 6. DOT INDICATORS
    // ═══════════════════════════════════════════════════════════════════════
    const dotR = R * 0.83;
    const dotCount = 44;
    for (let i = 0; i < dotCount; i++) {
      const angle = ARC_START + (ARC_SWEEP / dotCount) * i;
      ctx.beginPath();
      ctx.arc(
        Math.cos(angle) * dotR,
        Math.sin(angle) * dotR,
        1.5,
        0,
        Math.PI * 2,
      );
      ctx.fillStyle = 'rgba(255,255,255,0.1)';
      ctx.fill();
    }

    // ═══════════════════════════════════════════════════════════════════════
    // 7. INNER CIRCLE (scales with RPM)
    // ═══════════════════════════════════════════════════════════════════════
    ctx.save();
    ctx.scale(innerScale, innerScale);

    const innerR = R * 0.6;

    // Subtle outer glow ring
    ctx.beginPath();
    ctx.arc(0, 0, innerR + 5, 0, Math.PI * 2);
    ctx.lineWidth = 1;
    ctx.strokeStyle = 'rgba(255,255,255,0.05)';
    ctx.stroke();

    // Gradient fill
    const cGrad = ctx.createRadialGradient(0, 0, 0, 0, 0, innerR);
    cGrad.addColorStop(0, '#1a1a30');
    cGrad.addColorStop(0.55, '#111122');
    cGrad.addColorStop(1, '#080810');
    ctx.beginPath();
    ctx.arc(0, 0, innerR, 0, Math.PI * 2);
    ctx.fillStyle = cGrad;
    ctx.fill();

    // Border
    ctx.beginPath();
    ctx.arc(0, 0, innerR, 0, Math.PI * 2);
    ctx.lineWidth = 2;
    ctx.strokeStyle = 'rgba(255,255,255,0.07)';
    ctx.stroke();

    // Inset ring for depth
    ctx.beginPath();
    ctx.arc(0, 0, innerR * 0.91, 0, Math.PI * 2);
    ctx.lineWidth = 0.5;
    ctx.strokeStyle = 'rgba(255,255,255,0.04)';
    ctx.stroke();

    // ── Text ────────────────────────────────────────────────────────────
    const labelSize = R * 0.068;
    const font = '"SF Pro Display", "Inter", system-ui, -apple-system, sans-serif';

    // "RPM"
    ctx.fillStyle = 'rgba(255,255,255,0.42)';
    ctx.font = `600 ${labelSize}px ${font}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('RPM', 0, -innerR * 0.36);

    // Speed value
    const speedStr = Math.round(curSpeed).toString();
    ctx.fillStyle = textColor;
    ctx.font = `500 ${R * 0.32}px ${font}`;
    ctx.fillText(speedStr, 0, innerR * 0.03);

    // "MP/H"
    ctx.fillStyle = 'rgba(255,255,255,0.32)';
    ctx.font = `500 ${labelSize * 0.85}px ${font}`;
    ctx.fillText('MP/H', 0, innerR * 0.34);

    ctx.restore(); // innerScale

    // ═══════════════════════════════════════════════════════════════════════
    // 8. GEAR INDICATOR BOX
    // ═══════════════════════════════════════════════════════════════════════
    const gearY = R * 1.55;
    const boxW = R * 0.22;
    const boxH = R * 0.28;
    const cr = 10;

    // Flash on gear shift (brief brightness)
    let gearBoxAlpha = 1;
    if (curGear > 0 && gearProg < 0.08) {
      gearBoxAlpha = 1 + (1 - gearProg / 0.08) * 0.6; // brief flash to 1.6x
    }

    ctx.save();
    ctx.globalAlpha = Math.min(gearBoxAlpha, 1);

    // Box background
    const gearGrad = ctx.createLinearGradient(
      0,
      gearY - boxH / 2,
      0,
      gearY + boxH / 2,
    );
    gearGrad.addColorStop(0, '#1a1a2e');
    gearGrad.addColorStop(1, '#0e0e1a');
    drawRoundedRect(ctx, -boxW / 2, gearY - boxH / 2, boxW, boxH, cr);
    ctx.fillStyle = gearGrad;
    ctx.fill();

    // Border – brighter during shift
    const borderAlpha = curGear > 0 && gearProg < 0.08
      ? 0.12 + (1 - gearProg / 0.08) * 0.3
      : 0.12;
    drawRoundedRect(ctx, -boxW / 2, gearY - boxH / 2, boxW, boxH, cr);
    ctx.lineWidth = 1.5;
    ctx.strokeStyle = `rgba(255,255,255,${borderAlpha})`;
    ctx.stroke();

    // Gear shift flash glow
    if (curGear > 0 && gearProg < 0.1) {
      const flashAlpha = (1 - gearProg / 0.1) * 0.25;
      drawRoundedRect(ctx, -boxW / 2, gearY - boxH / 2, boxW, boxH, cr);
      ctx.shadowColor = primaryColor;
      ctx.shadowBlur = 20;
      ctx.strokeStyle = hexAlpha(primaryColor, flashAlpha);
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.shadowBlur = 0;
    }

    ctx.globalAlpha = 1;

    // Gear number
    ctx.fillStyle = textColor;
    ctx.font = `600 ${R * 0.14}px ${font}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(curGear.toString(), 0, gearY + 1);

    ctx.restore();

    // ═══════════════════════════════════════════════════════════════════════
    // 9. SECOND CONCENTRIC RING (between dots and inner circle)
    // ═══════════════════════════════════════════════════════════════════════
    ctx.beginPath();
    ctx.arc(0, 0, R * 0.72, ARC_START, ARC_END, false);
    ctx.lineWidth = 0.8;
    ctx.strokeStyle = 'rgba(255,255,255,0.06)';
    ctx.stroke();

    ctx.restore(); // main translate + scale
  },
};

export default animation;

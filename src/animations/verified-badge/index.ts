import type { AnimationDefinition } from '../../runtime/types';
import { number, color, boolean, folder } from '../../runtime/params';

/**
 * Verified Badge Animation
 * Green scalloped badge with trim-path checkmark.
 * The outer zigzag/scalloped border rotates while the checkmark stays fixed in the center.
 */

interface VerifiedBadgeParams {
  // Layout
  scale: number;
  // Colors
  primaryColor: string;
  darkGreen: string;
  backgroundColor: string;
  checkColor: string;
  // Badge
  numScallops: number;
  bumpDepth: number;
  // Animation
  speed: number;
  rotationSpeed: number;
  ringCount: number;
  showRings: boolean;
}

// ── Easing ────────────────────────────────────────────────
const easeOutCubic = (t: number): number => 1 - Math.pow(1 - t, 3);

const easeOutBack = (t: number): number => {
  const c1 = 1.70158;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
};

const easeInOutCubic = (t: number): number =>
  t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

// ── Helpers ───────────────────────────────────────────────
const hexToRgb = (hex: string) => {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return { r, g, b };
};

/**
 * Draw a scalloped / rosette path centred at (0, 0).
 * radius varies as  baseR + amplitude × cos(bumps × θ)
 */
function drawScallopedPath(
  ctx: CanvasRenderingContext2D,
  baseRadius: number,
  bumpAmplitude: number,
  numBumps: number,
) {
  ctx.beginPath();
  const steps = 360;
  for (let i = 0; i <= steps; i++) {
    const angle = (i / steps) * Math.PI * 2;
    const r = baseRadius + bumpAmplitude * Math.cos(numBumps * angle);
    const x = r * Math.cos(angle);
    const y = r * Math.sin(angle);
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
}

/** Checkmark polyline points, relative to centre */
function getCheckPoints(size: number): { x: number; y: number }[] {
  return [
    { x: -size * 0.32, y: size * 0.02 },
    { x: -size * 0.08, y: size * 0.28 },
    { x: size * 0.36, y: -size * 0.24 },
  ];
}

/**
 * "Trim path" – draw only the first `trimProgress` (0→1) fraction
 * of a polyline described by `points`.
 */
function drawTrimPath(
  ctx: CanvasRenderingContext2D,
  points: { x: number; y: number }[],
  trimProgress: number,
) {
  if (trimProgress <= 0 || points.length < 2) return;

  // total length
  let totalLength = 0;
  for (let i = 1; i < points.length; i++) {
    const dx = points[i].x - points[i - 1].x;
    const dy = points[i].y - points[i - 1].y;
    totalLength += Math.sqrt(dx * dx + dy * dy);
  }

  const targetLength = totalLength * Math.min(1, trimProgress);

  ctx.beginPath();
  ctx.moveTo(points[0].x, points[0].y);

  let accumulated = 0;
  for (let i = 1; i < points.length; i++) {
    const dx = points[i].x - points[i - 1].x;
    const dy = points[i].y - points[i - 1].y;
    const segLen = Math.sqrt(dx * dx + dy * dy);

    if (accumulated + segLen <= targetLength) {
      ctx.lineTo(points[i].x, points[i].y);
      accumulated += segLen;
    } else {
      const t = (targetLength - accumulated) / segLen;
      ctx.lineTo(points[i - 1].x + dx * t, points[i - 1].y + dy * t);
      break;
    }
  }
}

// ── Animation ─────────────────────────────────────────────
const animation: AnimationDefinition<VerifiedBadgeParams> = {
  id: 'verified-badge',
  name: 'Verified Badge',
  fps: 60,
  durationMs: 3000,
  width: 400,
  height: 400,
  background: '#f2f9f2',

  params: {
    defaults: {
      scale: 0.8,
      primaryColor: '#34C759',
      darkGreen: '#1f9d3c',
      backgroundColor: '#f2f9f2',
      checkColor: '#ffffff',
      numScallops: 12,
      bumpDepth: 4,
      speed: 1,
      rotationSpeed: 0.4,
      ringCount: 3,
      showRings: true,
    },
    schema: {
      ...folder('Layout', {
        scale: number({ value: 1, min: 0.1, max: 3, step: 0.1, label: 'Scale' }),
      }),
      ...folder('Colors', {
        primaryColor: color({ value: '#34C759', label: 'Primary Green' }),
        darkGreen: color({ value: '#1f9d3c', label: 'Dark Green' }),
        backgroundColor: color({ value: '#f2f9f2', label: 'Background' }),
        checkColor: color({ value: '#ffffff', label: 'Checkmark' }),
      }),
      ...folder('Badge', {
        numScallops: number({ value: 12, min: 6, max: 24, step: 1, label: 'Scallop Count' }),
        bumpDepth: number({ value: 14, min: 4, max: 30, step: 1, label: 'Bump Depth' }),
      }),
      ...folder('Animation', {
        speed: number({ value: 1, min: 0.1, max: 3, step: 0.1, label: 'Speed' }),
        rotationSpeed: number({
          value: 0.4,
          min: 0.05,
          max: 2,
          step: 0.05,
          label: 'Rotation Speed',
        }),
        ringCount: number({ value: 3, min: 1, max: 6, step: 1, label: 'Ring Count' }),
        showRings: boolean({ value: true, label: 'Show Rings' }),
      }),
    },
  },

  render({ ctx, progress, width, height, params }) {
    const {
      scale,
      primaryColor,
      darkGreen,
      backgroundColor,
      checkColor,
      speed,
      rotationSpeed,
      numScallops,
      bumpDepth,
      ringCount,
      showRings,
    } = params;

    const p = (progress * speed) % 1;

    // ── Phase timings ────────────────────────────────────
    const badgeScale = easeOutBack(Math.min(1, p / 0.3));
    const checkTrim = easeInOutCubic(Math.max(0, Math.min(1, (p - 0.35) / 0.3)));
    const rotation = p * Math.PI * 2 * rotationSpeed;

    const baseRadius = 72;
    const pRgb = hexToRgb(primaryColor);

    // ── 1. Background ────────────────────────────────────
    ctx.fillStyle = backgroundColor;
    ctx.fillRect(0, 0, width, height);

    // subtle radial tint
    const bgGrad = ctx.createRadialGradient(
      width / 2, height / 2, 0,
      width / 2, height / 2, width * 0.55,
    );
    bgGrad.addColorStop(0, `rgba(${pRgb.r}, ${pRgb.g}, ${pRgb.b}, 0.07)`);
    bgGrad.addColorStop(1, 'rgba(255, 255, 255, 0)');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, width, height);

    // ── 2. Pulse rings ───────────────────────────────────
    if (showRings && badgeScale > 0) {
      ctx.save();
      ctx.translate(width / 2, height / 2);
      ctx.scale(scale, scale);

      for (let i = ringCount; i >= 1; i--) {
        const ringDelay = i * 0.06;
        const ringProg = easeOutCubic(
          Math.max(0, Math.min(1, (p - ringDelay) / 0.5)),
        );
        const ringRadius = (baseRadius + bumpDepth + 15) + i * 38 * ringProg;
        const opacity = 0.12 * (1 - ringProg * 0.6) * badgeScale;

        if (opacity > 0.005) {
          ctx.beginPath();
          ctx.arc(0, 0, ringRadius, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(${pRgb.r}, ${pRgb.g}, ${pRgb.b}, ${opacity})`;
          ctx.fill();
        }
      }

      ctx.restore();
    }

    // ── 3. Rotating scalloped badge ──────────────────────
    ctx.save();
    ctx.translate(width / 2, height / 2);
    ctx.scale(scale * badgeScale, scale * badgeScale);
    ctx.rotate(rotation); // <-- rotation applied to the badge only

    // 3-a. Fill with 3D radial gradient
    drawScallopedPath(ctx, baseRadius, bumpDepth, numScallops);

    const badgeGrad = ctx.createRadialGradient(
      0, -baseRadius * 0.35, baseRadius * 0.15,
      0, baseRadius * 0.15, baseRadius + bumpDepth + 5,
    );
    badgeGrad.addColorStop(
      0,
      `rgba(${Math.min(255, pRgb.r + 50)}, ${Math.min(255, pRgb.g + 30)}, ${Math.min(255, pRgb.b + 50)}, 1)`,
    );
    badgeGrad.addColorStop(0.45, primaryColor);
    badgeGrad.addColorStop(1, darkGreen);
    ctx.fillStyle = badgeGrad;
    ctx.fill();

    // 3-b. White edge highlight
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
    ctx.lineWidth = 2.5;
    ctx.stroke();

    // 3-c. Inner gloss / sheen
    ctx.save();
    drawScallopedPath(ctx, baseRadius - 2, bumpDepth - 1, numScallops);
    ctx.clip();

    const sheen = ctx.createLinearGradient(
      0, -(baseRadius + bumpDepth),
      0, baseRadius + bumpDepth,
    );
    sheen.addColorStop(0, 'rgba(255, 255, 255, 0.3)');
    sheen.addColorStop(0.35, 'rgba(255, 255, 255, 0.05)');
    sheen.addColorStop(0.5, 'rgba(255, 255, 255, 0)');
    sheen.addColorStop(1, 'rgba(0, 0, 0, 0.12)');
    ctx.fillStyle = sheen;
    const totalR = baseRadius + bumpDepth + 5;
    ctx.fillRect(-totalR, -totalR, totalR * 2, totalR * 2);

    ctx.restore(); // end inner-gloss clip
    ctx.restore(); // end badge rotation

    // ── 4. Checkmark – trim path, NON-rotating ───────────
    if (checkTrim > 0) {
      ctx.save();
      ctx.translate(width / 2, height / 2);
      ctx.scale(scale * badgeScale, scale * badgeScale);
      // NOTE: no ctx.rotate() here – the check stays fixed

      const pts = getCheckPoints(baseRadius);

      // subtle drop shadow
      ctx.save();
      ctx.shadowColor = 'rgba(0, 0, 0, 0.18)';
      ctx.shadowBlur = 6;
      ctx.shadowOffsetY = 2;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.lineWidth = 11;
      ctx.strokeStyle = checkColor;
      drawTrimPath(ctx, pts, checkTrim);
      ctx.stroke();
      ctx.restore();

      // crisp white stroke on top
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.lineWidth = 11;
      ctx.strokeStyle = checkColor;
      drawTrimPath(ctx, pts, checkTrim);
      ctx.stroke();

      ctx.restore();
    }
  },
};

export default animation;

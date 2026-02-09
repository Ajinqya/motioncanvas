import type { AnimationDefinition } from '../../runtime/types';
import { number, color, boolean, folder } from '../../runtime/params';

/**
 * Watch Face – A warm yellow analog clock face with hour/minute numbers,
 * white rounded markers, and an animated sweeping seconds hand.
 * Inspired by a modern minimalist wall clock aesthetic.
 */

interface WatchFaceParams {
  // Layout
  scale: number;
  // Colors
  backgroundColor: string;
  dialColor: string;
  numberColor: string;
  markerColor: string;
  handColor: string;
  secondHandColor: string;
  centerDotColor: string;
  // Animation
  speed: number;
  showMinuteNumbers: boolean;
  smoothSweep: boolean;
}

// ── Easing helpers ──────────────────────────────────────────────────────────
const easeInOutCubic = (t: number): number =>
  t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

// ── Draw a rounded rectangle (standalone path helper) ───────────────────────
function roundRect(
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

// ── Animation definition ────────────────────────────────────────────────────
const animation: AnimationDefinition<WatchFaceParams> = {
  id: 'watch-face',
  name: 'Watch Face',
  fps: 60,
  durationMs: 5000,
  width: 800,
  height: 800,
  background: '#F2C94C',

  params: {
    defaults: {
      scale: 1,
      backgroundColor: '#F2C94C',
      dialColor: '#F2C94C',
      numberColor: '#3D2B00',
      markerColor: '#FFFFFF',
      handColor: '#FFFFFF',
      secondHandColor: '#FFFFFF',
      centerDotColor: '#E0E0E0',
      speed: 1,
      showMinuteNumbers: true,
      smoothSweep: true,
    },
    schema: {
      ...folder('Layout', {
        scale: number({ value: 1, min: 0.3, max: 2, step: 0.05, label: 'Scale' }),
      }),
      ...folder('Colors', {
        backgroundColor: color({ value: '#F2C94C', label: 'Background' }),
        dialColor: color({ value: '#F2C94C', label: 'Dial' }),
        numberColor: color({ value: '#3D2B00', label: 'Numbers' }),
        markerColor: color({ value: '#FFFFFF', label: 'Markers' }),
        handColor: color({ value: '#FFFFFF', label: 'Hands' }),
        secondHandColor: color({ value: '#FFFFFF', label: 'Second Hand' }),
        centerDotColor: color({ value: '#E0E0E0', label: 'Center Dot' }),
      }),
      ...folder('Animation', {
        speed: number({ value: 1, min: 0.1, max: 5, step: 0.1, label: 'Speed' }),
        showMinuteNumbers: boolean({ value: true, label: 'Minute Numbers' }),
        smoothSweep: boolean({ value: true, label: 'Smooth Sweep' }),
      }),
    },
  },

  render({ ctx, progress, width, height, params }) {
    const {
      scale,
      backgroundColor,
      dialColor,
      numberColor,
      markerColor,
      handColor,
      secondHandColor,
      centerDotColor,
      speed,
      showMinuteNumbers,
      smoothSweep,
    } = params;

    const adjustedProgress = (progress * speed) % 1;

    // ── Background ────────────────────────────────────────────────────────
    ctx.fillStyle = backgroundColor;
    ctx.fillRect(0, 0, width, height);

    // ── Center and scale ──────────────────────────────────────────────────
    ctx.save();
    ctx.translate(width / 2, height / 2);
    ctx.scale(scale, scale);

    const R = 340; // Clock radius

    // ── Dial background (subtle gradient for depth) ──────────────────────
    const dialGrad = ctx.createRadialGradient(0, 0, 0, 0, 0, R);
    dialGrad.addColorStop(0, dialColor);
    dialGrad.addColorStop(1, dialColor);
    ctx.fillStyle = dialGrad;
    ctx.beginPath();
    ctx.arc(0, 0, R, 0, Math.PI * 2);
    ctx.fill();

    // ── Minute tick marks ────────────────────────────────────────────────
    for (let i = 0; i < 60; i++) {
      const angle = (i / 60) * Math.PI * 2 - Math.PI / 2;
      const isHour = i % 5 === 0;

      if (!isHour) {
        // Small tick marks
        const innerR = R - 22;
        const outerR = R - 10;
        const x1 = Math.cos(angle) * innerR;
        const y1 = Math.sin(angle) * innerR;
        const x2 = Math.cos(angle) * outerR;
        const y2 = Math.sin(angle) * outerR;

        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.strokeStyle = numberColor;
        ctx.lineWidth = 1.8;
        ctx.globalAlpha = 0.6;
        ctx.stroke();
        ctx.globalAlpha = 1;
      }
    }

    // ── Hour markers (white rounded bars) ────────────────────────────────
    for (let i = 0; i < 12; i++) {
      const angle = (i / 12) * Math.PI * 2 - Math.PI / 2;
      const markerLength = 38;
      const markerWidth = 10;
      const markerDist = R - 45;

      ctx.save();
      ctx.translate(
        Math.cos(angle) * markerDist,
        Math.sin(angle) * markerDist,
      );
      ctx.rotate(angle + Math.PI / 2);

      // Shadow for depth
      ctx.shadowColor = 'rgba(0, 0, 0, 0.15)';
      ctx.shadowBlur = 6;
      ctx.shadowOffsetX = 2;
      ctx.shadowOffsetY = 2;

      // Draw rounded marker
      ctx.fillStyle = markerColor;
      roundRect(
        ctx,
        -markerWidth / 2,
        -markerLength / 2,
        markerWidth,
        markerLength,
        markerWidth / 2,
      );
      ctx.fill();

      // Reset shadow
      ctx.shadowColor = 'transparent';
      ctx.shadowBlur = 0;
      ctx.shadowOffsetX = 0;
      ctx.shadowOffsetY = 0;

      ctx.restore();
    }

    // ── Hour numbers (1-12) ──────────────────────────────────────────────
    const hourNumberR = R - 100;
    ctx.font = '700 42px "Georgia", "Times New Roman", serif';
    ctx.fillStyle = numberColor;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    for (let i = 1; i <= 12; i++) {
      const angle = (i / 12) * Math.PI * 2 - Math.PI / 2;
      const x = Math.cos(angle) * hourNumberR;
      const y = Math.sin(angle) * hourNumberR;
      ctx.fillText(String(i), x, y + 2);
    }

    // ── Minute numbers (05, 10, 15 ... 60) ──────────────────────────────
    if (showMinuteNumbers) {
      const minuteNumberR = R - 5;
      ctx.font = '500 16px "Georgia", "Times New Roman", serif';
      ctx.fillStyle = numberColor;
      ctx.globalAlpha = 0.7;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      for (let i = 1; i <= 12; i++) {
        const minuteValue = i * 5;
        const label = minuteValue === 60 ? '60' : String(minuteValue).padStart(2, '0');
        const angle = (i / 12) * Math.PI * 2 - Math.PI / 2;
        const x = Math.cos(angle) * minuteNumberR;
        const y = Math.sin(angle) * minuteNumberR;
        ctx.fillText(label, x, y + 1);
      }
      ctx.globalAlpha = 1;
    }

    // ── Clock hands ─────────────────────────────────────────────────────

    // Static time: 10:10 position (like the reference image)
    const hourAngle = ((10 + 10 / 60) / 12) * Math.PI * 2 - Math.PI / 2;
    const minuteAngle = (10 / 60) * Math.PI * 2 - Math.PI / 2;

    // Seconds hand angle (animated)
    const secondAngle = smoothSweep
      ? adjustedProgress * Math.PI * 2 - Math.PI / 2
      : (Math.floor(adjustedProgress * 60) / 60) * Math.PI * 2 - Math.PI / 2;

    // ── Hour hand ───────────────────────────────────────────────────────
    const hourHandLength = 160;
    const hourHandWidth = 12;
    const hourTailLength = 30;

    ctx.save();
    ctx.rotate(hourAngle);

    // Shadow
    ctx.shadowColor = 'rgba(0, 0, 0, 0.2)';
    ctx.shadowBlur = 10;
    ctx.shadowOffsetX = 3;
    ctx.shadowOffsetY = 3;

    // Hand body
    ctx.fillStyle = handColor;
    ctx.beginPath();
    ctx.moveTo(-hourTailLength, -hourHandWidth / 2);
    ctx.lineTo(hourHandLength - 15, -hourHandWidth / 2);
    ctx.lineTo(hourHandLength, 0);
    ctx.lineTo(hourHandLength - 15, hourHandWidth / 2);
    ctx.lineTo(-hourTailLength, hourHandWidth / 2);
    ctx.closePath();
    ctx.fill();

    ctx.shadowColor = 'transparent';
    ctx.restore();

    // ── Minute hand ─────────────────────────────────────────────────────
    const minuteHandLength = 230;
    const minuteHandWidth = 10;
    const minuteTailLength = 35;

    ctx.save();
    ctx.rotate(minuteAngle);

    // Shadow
    ctx.shadowColor = 'rgba(0, 0, 0, 0.2)';
    ctx.shadowBlur = 12;
    ctx.shadowOffsetX = 3;
    ctx.shadowOffsetY = 3;

    // Hand body
    ctx.fillStyle = handColor;
    ctx.beginPath();
    ctx.moveTo(-minuteTailLength, -minuteHandWidth / 2);
    ctx.lineTo(minuteHandLength - 12, -minuteHandWidth / 2);
    ctx.lineTo(minuteHandLength, 0);
    ctx.lineTo(minuteHandLength - 12, minuteHandWidth / 2);
    ctx.lineTo(-minuteTailLength, minuteHandWidth / 2);
    ctx.closePath();
    ctx.fill();

    ctx.shadowColor = 'transparent';
    ctx.restore();

    // ── Seconds hand ────────────────────────────────────────────────────
    const secondHandLength = 250;
    const secondHandWidth = 3.5;
    const secondTailLength = 60;

    ctx.save();
    ctx.rotate(secondAngle);

    // Shadow
    ctx.shadowColor = 'rgba(0, 0, 0, 0.15)';
    ctx.shadowBlur = 8;
    ctx.shadowOffsetX = 2;
    ctx.shadowOffsetY = 2;

    // Hand body (thin and elegant)
    ctx.fillStyle = secondHandColor;
    ctx.beginPath();
    ctx.moveTo(-secondTailLength, -secondHandWidth);
    ctx.lineTo(secondHandLength - 8, -1.2);
    ctx.lineTo(secondHandLength, 0);
    ctx.lineTo(secondHandLength - 8, 1.2);
    ctx.lineTo(-secondTailLength, secondHandWidth);
    ctx.closePath();
    ctx.fill();

    // Small circle counterweight on tail end
    ctx.beginPath();
    ctx.arc(-secondTailLength + 12, 0, 7, 0, Math.PI * 2);
    ctx.fill();

    ctx.shadowColor = 'transparent';
    ctx.restore();

    // ── Center dot (metallic) ───────────────────────────────────────────
    // Outer ring
    ctx.beginPath();
    ctx.arc(0, 0, 14, 0, Math.PI * 2);
    ctx.fillStyle = centerDotColor;
    ctx.shadowColor = 'rgba(0, 0, 0, 0.3)';
    ctx.shadowBlur = 6;
    ctx.shadowOffsetX = 1;
    ctx.shadowOffsetY = 1;
    ctx.fill();

    // Inner shine
    ctx.shadowColor = 'transparent';
    ctx.beginPath();
    ctx.arc(0, 0, 8, 0, Math.PI * 2);
    const dotGrad = ctx.createRadialGradient(-2, -2, 0, 0, 0, 8);
    dotGrad.addColorStop(0, '#FFFFFF');
    dotGrad.addColorStop(0.5, centerDotColor);
    dotGrad.addColorStop(1, '#AAAAAA');
    ctx.fillStyle = dotGrad;
    ctx.fill();

    // Tiny highlight
    ctx.beginPath();
    ctx.arc(-3, -3, 3, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
    ctx.fill();

    ctx.restore();
  },
};

export default animation;

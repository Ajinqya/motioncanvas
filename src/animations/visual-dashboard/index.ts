import type { AnimationDefinition } from '../../runtime/types';
import { number, color, folder } from '../../runtime/params';

// ─── Easing ────────────────────────────────────────────────────────────────────
const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);
const easeOutQuart = (t: number) => 1 - Math.pow(1 - t, 4);
const easeOutBack = (t: number) => {
  const c1 = 1.70158, c3 = c1 + 1;
  return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
};

// ─── Utilities ─────────────────────────────────────────────────────────────────
const clamp01 = (v: number) => Math.max(0, Math.min(1, v));
const phase = (p: number, s: number, e: number) => clamp01((p - s) / (e - s));

/** Rounded rectangle path helper */
function rrect(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, w: number, h: number, r: number,
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

// Font helpers
const pixelFont = (size: number) => `500 ${size}px GeistPixelSquare, monospace`;
const sansFont = (w: string, s: number) =>
  `${w} ${s}px -apple-system, "Helvetica Neue", Arial, sans-serif`;

// ─── Animation Definition ──────────────────────────────────────────────────────
interface Params {
  scale: number;
  backgroundColor: string;
  screenColor: string;
  textColor: string;
  accentColor: string;
  cardColor: string;
  cardBorder: string;
  speed: number;
}

const animation: AnimationDefinition<Params> = {
  id: 'visual-dashboard',
  name: 'Visual Dashboard',
  fps: 60,
  durationMs: 5000,
  width: 540,
  height: 960,
  background: '#d4d4d4',

  params: {
    defaults: {
      scale: 1,
      backgroundColor: '#d4d4d4',
      screenColor: '#f4f4f2',
      textColor: '#1a1a1a',
      accentColor: '#e8642c',
      cardColor: '#eaeae8',
      cardBorder: '#ddddd9',
      speed: 1,
    },
    schema: {
      ...folder('Layout', {
        scale: number({ value: 1, min: 0.5, max: 2, step: 0.1, label: 'Scale' }),
      }),
      ...folder('Colors', {
        backgroundColor: color({ value: '#d4d4d4', label: 'Background' }),
        screenColor: color({ value: '#f4f4f2', label: 'Screen' }),
        textColor: color({ value: '#1a1a1a', label: 'Text' }),
        accentColor: color({ value: '#e8642c', label: 'Accent' }),
        cardColor: color({ value: '#eaeae8', label: 'Cards' }),
        cardBorder: color({ value: '#ddddd9', label: 'Card Border' }),
      }),
      ...folder('Animation', {
        speed: number({ value: 1, min: 0.3, max: 2, step: 0.1, label: 'Speed' }),
      }),
    },
  },

  render({ ctx, progress, width, height, params }) {
    const {
      scale, backgroundColor, screenColor, textColor,
      accentColor, cardColor, cardBorder, speed,
    } = params;

    const p = clamp01(progress * speed);

    // ── Background ──
    ctx.fillStyle = backgroundColor;
    ctx.fillRect(0, 0, width, height);

    // ── Global scale ──
    ctx.save();
    ctx.translate(width / 2, height / 2);
    ctx.scale(scale, scale);
    ctx.translate(-width / 2, -height / 2);

    // ── Phone frame ──
    const F = { x: 48, y: 22, w: 444, h: 916, r: 40 };
    const fcx = F.x + F.w / 2;
    const fcy = F.y + F.h / 2;

    // Phone entrance
    const fIn = easeOutCubic(phase(p, 0, 0.10));
    const fScale = 0.97 + 0.03 * fIn;
    const fAlpha = 0.55 + 0.45 * fIn;

    ctx.save();
    ctx.translate(fcx, fcy);
    ctx.scale(fScale, fScale);
    ctx.translate(-fcx, -fcy);

    // Phone shadow + fill
    ctx.save();
    ctx.shadowColor = 'rgba(0,0,0,0.06)';
    ctx.shadowBlur = 40;
    ctx.shadowOffsetY = 12;
    ctx.globalAlpha = fAlpha;
    rrect(ctx, F.x, F.y, F.w, F.h, F.r);
    ctx.fillStyle = screenColor;
    ctx.fill();
    ctx.restore();

    // Clip interior
    ctx.save();
    rrect(ctx, F.x, F.y, F.w, F.h, F.r);
    ctx.clip();

    // Content boundaries
    const L = F.x + 35;
    const R = F.x + F.w - 35;
    const W = R - L;

    // ── Notch (pill capsule) ──
    ctx.globalAlpha = fAlpha;
    const notchW = 62, notchH = 22;
    rrect(ctx, fcx - notchW / 2, F.y + 12, notchW, notchH, notchH / 2);
    ctx.fillStyle = '#2a2a2a';
    ctx.fill();

    // ══════════════════════════════════════════════════════════════════════════
    // ── HEADER ──
    // ══════════════════════════════════════════════════════════════════════════
    const hA = fAlpha * easeOutCubic(phase(p, 0.05, 0.16));
    const hY = F.y + 78;

    ctx.globalAlpha = hA;
    ctx.textBaseline = 'top';

    ctx.fillStyle = textColor;
    ctx.font = sansFont('600', 14);
    ctx.textAlign = 'left';
    ctx.fillText('visual.study', L, hY);

    ctx.fillStyle = '#999';
    ctx.font = sansFont('400', 11);
    ctx.fillText('fri. 01. aug.', L, hY + 19);

    ctx.fillStyle = textColor;
    ctx.font = sansFont('600', 12);
    ctx.textAlign = 'left';
    const timeX = F.x + F.w / 2 + 8;
    ctx.fillText('10:45', timeX, hY);
    const timeW = ctx.measureText('10:45').width;
    ctx.font = sansFont('400', 12);
    ctx.fillText('pm.', timeX + timeW + 1, hY);

    // Three dots menu (drawn as circles)
    ctx.fillStyle = textColor;
    for (let i = 0; i < 3; i++) {
      ctx.beginPath();
      ctx.arc(R - 4 - i * 9, hY + 7, 2.5, 0, Math.PI * 2);
      ctx.fill();
    }

    // ══════════════════════════════════════════════════════════════════════════
    // ── BIG NUMBER "17" (GeistPixelSquare font) ──
    // ══════════════════════════════════════════════════════════════════════════
    const numFade = easeOutCubic(phase(p, 0.08, 0.20));
    const numCount = easeOutCubic(phase(p, 0.10, 0.34));
    const numSlide = (1 - numFade) * 14;

    ctx.globalAlpha = fAlpha * numFade;
    ctx.fillStyle = textColor;
    ctx.font = pixelFont(120);
    ctx.textBaseline = 'top';
    ctx.textAlign = 'left';
    const bigY = F.y + 130;
    const displayNum = Math.round(17 * numCount);
    const numStr = displayNum.toString();
    ctx.fillText(numStr, L, bigY + numSlide);
    const numMetrics = ctx.measureText(numStr);

    // ── Orange accent dot (superscript) ──
    const dotP = phase(p, 0.16, 0.24);
    if (dotP > 0) {
      const dotE = easeOutBack(dotP);
      ctx.globalAlpha = fAlpha * clamp01(dotE);
      ctx.fillStyle = accentColor;
      ctx.beginPath();
      ctx.arc(
        L + numMetrics.width + 10,
        bigY + 18 + numSlide,
        8 * clamp01(dotE),
        0, Math.PI * 2,
      );
      ctx.fill();
    }

    // ── "total amount" ──
    ctx.globalAlpha = fAlpha * easeOutCubic(phase(p, 0.13, 0.22));
    ctx.fillStyle = '#aaa';
    ctx.font = sansFont('400', 12);
    ctx.textAlign = 'right';
    ctx.textBaseline = 'top';
    ctx.fillText('total amount', R, bigY + 30);

    // ══════════════════════════════════════════════════════════════════════════
    // ── "+" BUTTON ──
    // ══════════════════════════════════════════════════════════════════════════
    const btnP = phase(p, 0.18, 0.28);
    if (btnP > 0) {
      const btnE = easeOutBack(btnP);
      const btnS = clamp01(btnE);
      const btnR = 32;
      ctx.save();
      ctx.globalAlpha = fAlpha * btnS;
      ctx.translate(R - btnR, bigY + 100);
      ctx.scale(btnS, btnS);

      ctx.beginPath();
      ctx.arc(0, 0, btnR, 0, Math.PI * 2);
      ctx.fillStyle = textColor;
      ctx.fill();

      ctx.strokeStyle = screenColor;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(-12, 0); ctx.lineTo(12, 0);
      ctx.moveTo(0, -12); ctx.lineTo(0, 12);
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(0, 0, 2.5, 0, Math.PI * 2);
      ctx.stroke();

      ctx.restore();
    }

    // ══════════════════════════════════════════════════════════════════════════
    // ── CHART AREA ──
    // ══════════════════════════════════════════════════════════════════════════
    const cX = L;
    const cY = F.y + 330;
    const cW = W;
    const cH = 230;
    const cBot = cY + cH;

    // Horizontal dotted grid lines
    const gridAlpha = fAlpha * easeOutCubic(phase(p, 0.20, 0.30)) * 0.12;
    if (gridAlpha > 0.001) {
      ctx.globalAlpha = gridAlpha;
      ctx.strokeStyle = textColor;
      ctx.lineWidth = 0.8;
      ctx.setLineDash([2, 5]);
      for (let i = 0; i <= 4; i++) {
        const gy = cY + i * (cH / 4);
        ctx.beginPath();
        ctx.moveTo(cX, gy);
        ctx.lineTo(cX + cW, gy);
        ctx.stroke();
      }
      ctx.setLineDash([]);
    }

    // Vertical data bars (staggered cascade)
    const barN = 48;
    const barGap = cW / barN;
    const barWidth = 2;

    for (let i = 0; i < barN; i++) {
      const ni = i / (barN - 1);
      const bx = cX + i * barGap + barGap / 2;

      const baseH = cH * 0.04 + cH * 0.88 * Math.pow(ni, 2.3);
      const jitter = Math.sin(i * 7.7 + 3.1) * cH * 0.02;
      const targetH = Math.max(3, baseH + jitter);

      const bStart = 0.24 + ni * 0.28;
      const bProg = easeOutQuart(phase(p, bStart, bStart + 0.12));

      if (bProg > 0) {
        ctx.globalAlpha = fAlpha * (0.12 + 0.72 * ni) * bProg;
        ctx.fillStyle = textColor;
        ctx.fillRect(
          bx - barWidth / 2,
          cBot - targetH * bProg,
          barWidth,
          targetH * bProg,
        );
      }
    }

    // Quarter-arc curve overlay (clipped to chart area)
    const curveP = easeOutCubic(phase(p, 0.30, 0.55));
    if (curveP > 0) {
      ctx.save();
      ctx.beginPath();
      ctx.rect(cX, cY, cW, cH);
      ctx.clip();

      ctx.globalAlpha = fAlpha * 0.20 * curveP;
      ctx.strokeStyle = textColor;
      ctx.lineWidth = 1.5;
      const arcR = Math.min(cW, cH) * 0.92;
      ctx.beginPath();
      ctx.arc(
        cX + cW, cBot, arcR,
        Math.PI,
        Math.PI - (Math.PI / 2) * curveP,
        true,
      );
      ctx.stroke();
      ctx.restore();
    }

    // Bottom tick marks
    const tickAlpha = fAlpha * easeOutCubic(phase(p, 0.32, 0.40)) * 0.25;
    if (tickAlpha > 0.001) {
      ctx.globalAlpha = tickAlpha;
      ctx.fillStyle = textColor;
      for (let i = 0; i < 35; i++) {
        const tx2 = cX + 5 + (i / 34) * (cW - 10);
        ctx.fillRect(tx2, cBot + 6, 1.5, 3);
      }
    }

    // X-axis labels
    ctx.globalAlpha = fAlpha * easeOutCubic(phase(p, 0.36, 0.44));
    ctx.fillStyle = '#aaa';
    ctx.font = sansFont('400', 11);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    const xLabels = ['0', '25', '50', '75', '1H'];
    for (let i = 0; i < xLabels.length; i++) {
      ctx.fillText(xLabels[i], cX + (i / 4) * cW, cBot + 24);
    }

    // ══════════════════════════════════════════════════════════════════════════
    // ── BOTTOM CARDS (4-card layout: 2 label + 2 data) ──
    // ══════════════════════════════════════════════════════════════════════════
    const cardGapX = 14;
    const cardGapY = 12;
    const cardW = (W - cardGapX) / 2;
    const labelCardH = 48;
    const dataCardH = 180;
    const cardTopY = cBot + 50;
    const dataCardY = cardTopY + labelCardH + cardGapY;
    const cardR = 16;

    const cardSlide = easeOutCubic(phase(p, 0.46, 0.58));
    const cardOffY = (1 - cardSlide) * 45;
    const cA = fAlpha * cardSlide;

    // --- Label cards (top row) ---
    const drawLabelCard = (cx: number, label: string) => {
      ctx.save();
      ctx.globalAlpha = cA;
      const cy = cardTopY + cardOffY;

      rrect(ctx, cx, cy, cardW, labelCardH, cardR);
      ctx.fillStyle = cardColor;
      ctx.fill();
      rrect(ctx, cx, cy, cardW, labelCardH, cardR);
      ctx.strokeStyle = cardBorder;
      ctx.lineWidth = 1;
      ctx.stroke();

      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';
      ctx.fillStyle = textColor;
      ctx.font = sansFont('400', 13);
      ctx.fillText(label, cx + 18, cy + 17);

      ctx.restore();
    };

    drawLabelCard(L, 'weather');
    drawLabelCard(L + cardW + cardGapX, 'status');

    // --- Data cards (bottom row) ---
    const drawDataCard = (
      cx: number,
      unit: string,
      value: number,
      accent: 'triangle' | 'dropdown',
    ) => {
      ctx.save();
      ctx.globalAlpha = cA;
      const cy = dataCardY + cardOffY;

      rrect(ctx, cx, cy, cardW, dataCardH, cardR);
      ctx.fillStyle = cardColor;
      ctx.fill();
      rrect(ctx, cx, cy, cardW, dataCardH, cardR);
      ctx.strokeStyle = cardBorder;
      ctx.lineWidth = 1;
      ctx.stroke();

      // Unit label
      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';
      ctx.fillStyle = '#aaa';
      ctx.font = sansFont('400', 12);
      ctx.fillText(unit, cx + 18, cy + 20);

      // Pixel number with count-up (GeistPixelSquare)
      const numProg = easeOutCubic(phase(p, 0.54, 0.74));
      const displayVal = Math.round(value * numProg);
      ctx.fillStyle = textColor;
      ctx.globalAlpha = cA * clamp01(numProg * 2);
      ctx.font = pixelFont(72);
      ctx.textBaseline = 'bottom';
      ctx.textAlign = 'left';
      ctx.fillText(displayVal.toString(), cx + 16, cy + dataCardH - 18);

      // Accent element
      const accP = easeOutCubic(phase(p, 0.64, 0.72));
      if (accP > 0) {
        ctx.globalAlpha = cA * accP;

        if (accent === 'triangle') {
          ctx.fillStyle = accentColor;
          ctx.beginPath();
          const ax = cx + cardW - 38;
          const ay = cy + dataCardH - 30;
          ctx.moveTo(ax, ay + 8);
          ctx.lineTo(ax + 10, ay + 8);
          ctx.lineTo(ax + 5, ay);
          ctx.closePath();
          ctx.fill();
        } else {
          ctx.fillStyle = textColor;
          ctx.beginPath();
          const ax = cx + cardW - 35;
          const ay = cy + dataCardH - 28;
          ctx.moveTo(ax, ay);
          ctx.lineTo(ax + 12, ay);
          ctx.lineTo(ax + 6, ay + 7);
          ctx.closePath();
          ctx.fill();
        }
      }

      ctx.restore();
    };

    drawDataCard(L, '°F', 68, 'triangle');
    drawDataCard(L + cardW + cardGapX, 'hp', 15, 'dropdown');

    // ── Restore all transforms ──
    ctx.restore(); // clip
    ctx.restore(); // phone entrance
    ctx.restore(); // global scale
  },
};

export default animation;

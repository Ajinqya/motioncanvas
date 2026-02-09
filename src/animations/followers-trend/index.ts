import type { AnimationDefinition } from '../../runtime/types';
import { number, color, folder } from '../../runtime/params';

// ─── Easing ────────────────────────────────────────────────────────────────────
const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);
const easeOutQuart = (t: number) => 1 - Math.pow(1 - t, 4);
const easeOutBack = (t: number) => {
  const c1 = 1.70158, c3 = c1 + 1;
  return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
};
const easeInOutCubic = (t: number) =>
  t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

// ─── Utilities ─────────────────────────────────────────────────────────────────
const clamp01 = (v: number) => Math.max(0, Math.min(1, v));
const phase = (p: number, s: number, e: number) => clamp01((p - s) / (e - s));
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

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

/** Pill-shaped rounded rect */
function pill(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, w: number, h: number,
) {
  rrect(ctx, x, y, w, h, h / 2);
}

// Font helpers
const sansFont = (w: string, s: number) =>
  `${w} ${s}px -apple-system, "Helvetica Neue", Arial, sans-serif`;

// ─── Bar data (Feb through Jun, ~30 bars total, heights simulate growth) ──────
const BAR_HEIGHTS: number[] = [];
const TOTAL_BARS = 30;
for (let i = 0; i < TOTAL_BARS; i++) {
  const ni = i / (TOTAL_BARS - 1);
  // Exponential growth curve with some organic variation
  const base = 0.08 + 0.82 * Math.pow(ni, 1.8);
  const jitter = Math.sin(i * 4.7 + 2.3) * 0.04 + Math.cos(i * 7.1) * 0.025;
  BAR_HEIGHTS.push(Math.max(0.06, Math.min(1.0, base + jitter)));
}

// Month boundaries (indices where each month starts)
const MONTHS = [
  { label: 'Feb', startIdx: 0 },
  { label: 'Mar', startIdx: 6 },
  { label: 'Apr', startIdx: 12 },
  { label: 'May', startIdx: 18 },
  { label: 'Jun', startIdx: 24 },
];

// The highlighted bar (the tallest one in May area)
const HIGHLIGHT_BAR_IDX = 22;

// ─── Animation Definition ──────────────────────────────────────────────────────
interface Params {
  // Layout
  scale: number;
  cardPadding: number;
  innerPadding: number;
  cardRadius: number;
  // Spacing
  titleSize: number;
  chartHeight: number;
  chartTopOffset: number;
  barWidthRatio: number;
  statsGap: number;
  statValueSize: number;
  monthLabelSize: number;
  // Colors
  cardColor: string;
  titleColor: string;
  subtitleColor: string;
  barColor: string;
  labelColor: string;
  tooltipColor: string;
  tooltipTextColor: string;
  statLabelColor: string;
  statValueColor: string;
  backgroundColor: string;
  // Animation
  speed: number;
}

const animation: AnimationDefinition<Params> = {
  id: 'followers-trend',
  name: 'Followers Trend',
  fps: 60,
  durationMs: 4500,
  width: 800,
  height: 800,
  background: '#F8F0F4',

  params: {
    defaults: {
      scale: 0.7,
      cardPadding: 80,
      innerPadding: 40,
      cardRadius: 32,
      titleSize: 42,
      chartHeight: 260,
      chartTopOffset: 155,
      barWidthRatio: 0.38,
      statsGap: 105,
      statValueSize: 50,
      monthLabelSize: 19,
      cardColor: '#F5D5F0',
      titleColor: '#2A1A28',
      subtitleColor: '#C89BC0',
      barColor: '#2A1A28',
      labelColor: '#9A7A94',
      tooltipColor: '#2A1A28',
      tooltipTextColor: '#FFFFFF',
      statLabelColor: '#8A6A84',
      statValueColor: '#2A1A28',
      backgroundColor: '#F8F0F4',
      speed: 1,
    },
    schema: {
      ...folder('Layout', {
        scale: number({ value: 0.7, min: 0.3, max: 2, step: 0.1, label: 'Scale' }),
        cardPadding: number({ value: 80, min: 20, max: 200, step: 5, label: 'Card Padding' }),
        innerPadding: number({ value: 40, min: 10, max: 80, step: 5, label: 'Inner Padding' }),
        cardRadius: number({ value: 32, min: 0, max: 60, step: 2, label: 'Card Radius' }),
      }),
      ...folder('Spacing', {
        titleSize: number({ value: 42, min: 20, max: 64, step: 1, label: 'Title Size' }),
        chartHeight: number({ value: 260, min: 120, max: 400, step: 10, label: 'Chart Height' }),
        chartTopOffset: number({ value: 160, min: 100, max: 250, step: 5, label: 'Chart Top Offset' }),
        barWidthRatio: number({ value: 0.38, min: 0.1, max: 0.9, step: 0.02, label: 'Bar Width' }),
        statsGap: number({ value: 64, min: 20, max: 120, step: 5, label: 'Stats Gap' }),
        statValueSize: number({ value: 56, min: 24, max: 80, step: 2, label: 'Stat Value Size' }),
        monthLabelSize: number({ value: 18, min: 10, max: 28, step: 1, label: 'Month Label Size' }),
      }),
      ...folder('Colors', {
        cardColor: color({ value: '#F5D5F0', label: 'Card' }),
        titleColor: color({ value: '#2A1A28', label: 'Title' }),
        subtitleColor: color({ value: '#C89BC0', label: 'Subtitle' }),
        barColor: color({ value: '#2A1A28', label: 'Bars' }),
        labelColor: color({ value: '#9A7A94', label: 'Labels' }),
        tooltipColor: color({ value: '#2A1A28', label: 'Tooltip' }),
        tooltipTextColor: color({ value: '#FFFFFF', label: 'Tooltip Text' }),
        statLabelColor: color({ value: '#8A6A84', label: 'Stat Labels' }),
        statValueColor: color({ value: '#2A1A28', label: 'Stat Values' }),
        backgroundColor: color({ value: '#F8F0F4', label: 'Background' }),
      }),
      ...folder('Animation', {
        speed: number({ value: 1, min: 0.3, max: 2, step: 0.1, label: 'Speed' }),
      }),
    },
  },

  render({ ctx, progress, width, height, params }) {
    const {
      scale, cardPadding, innerPadding, cardRadius,
      titleSize, chartHeight, chartTopOffset, barWidthRatio,
      statsGap, statValueSize, monthLabelSize,
      cardColor, titleColor, subtitleColor, barColor,
      labelColor, tooltipColor, tooltipTextColor,
      statLabelColor, statValueColor, backgroundColor, speed,
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

    // ── Card dimensions ──
    const cardX = cardPadding;
    const cardY = cardPadding;
    const cardW = width - cardPadding * 2;
    const cardH = height - cardPadding * 2;
    const cardR = cardRadius;
    const innerPad = innerPadding;

    // ══════════════════════════════════════════════════════════════════════════
    // ── CARD ENTRANCE ──
    // ══════════════════════════════════════════════════════════════════════════
    const cardIn = easeOutCubic(phase(p, 0, 0.12));
    const cardScale = 0.96 + 0.04 * cardIn;
    const cardAlpha = cardIn;

    const ccx = cardX + cardW / 2;
    const ccy = cardY + cardH / 2;

    ctx.save();
    ctx.globalAlpha = cardAlpha;
    ctx.translate(ccx, ccy);
    ctx.scale(cardScale, cardScale);
    ctx.translate(-ccx, -ccy);

    // Card shadow
    ctx.save();
    ctx.shadowColor = 'rgba(80, 20, 60, 0.08)';
    ctx.shadowBlur = 50;
    ctx.shadowOffsetY = 16;
    rrect(ctx, cardX, cardY, cardW, cardH, cardR);
    ctx.fillStyle = cardColor;
    ctx.fill();
    ctx.restore();

    // Clip to card
    ctx.save();
    rrect(ctx, cardX, cardY, cardW, cardH, cardR);
    ctx.clip();

    const L = cardX + innerPad;
    const R = cardX + cardW - innerPad;
    const contentW = R - L;

    // ══════════════════════════════════════════════════════════════════════════
    // ── TITLE "Followers" + "Trend" ──
    // ══════════════════════════════════════════════════════════════════════════
    const titleFade = easeOutCubic(phase(p, 0.06, 0.18));
    const titleSlide = (1 - titleFade) * 12;

    ctx.globalAlpha = cardAlpha * titleFade;
    ctx.textBaseline = 'top';
    ctx.textAlign = 'left';

    // "Followers"
    ctx.fillStyle = titleColor;
    ctx.font = sansFont('700', titleSize);
    ctx.fillText('Followers', L, cardY + innerPad + titleSlide);

    // "Trend"
    ctx.fillStyle = subtitleColor;
    ctx.font = sansFont('600', titleSize);
    ctx.fillText('Trend', L, cardY + innerPad + titleSize * 1.14 + titleSlide);

    // ── Arrow icon (top right) ──
    const arrowFade = easeOutBack(phase(p, 0.10, 0.22));
    if (arrowFade > 0) {
      ctx.save();
      ctx.globalAlpha = cardAlpha * clamp01(arrowFade);
      const iconR = 28;
      const iconX = R - iconR + 4;
      const iconY = cardY + innerPad + iconR;
      const iconS = clamp01(arrowFade);

      ctx.translate(iconX, iconY);
      ctx.scale(iconS, iconS);

      // White circle
      ctx.beginPath();
      ctx.arc(0, 0, iconR, 0, Math.PI * 2);
      ctx.fillStyle = '#FFFFFF';
      ctx.fill();

      // Arrow icon
      ctx.strokeStyle = titleColor;
      ctx.lineWidth = 2.5;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.beginPath();
      ctx.moveTo(-6, 6);
      ctx.lineTo(6, -6);
      ctx.moveTo(0, -6);
      ctx.lineTo(6, -6);
      ctx.lineTo(6, 0);
      ctx.stroke();

      ctx.restore();
    }

    // ══════════════════════════════════════════════════════════════════════════
    // ── BAR CHART ──
    // ══════════════════════════════════════════════════════════════════════════
    const chartX = L;
    const chartY = cardY + chartTopOffset;
    const chartW = contentW;
    const chartH = chartHeight;
    const chartBot = chartY + chartH;

    const barW = (chartW / TOTAL_BARS) * barWidthRatio;
    const barGap = chartW / TOTAL_BARS;

    // Draw bars with staggered entrance
    for (let i = 0; i < TOTAL_BARS; i++) {
      const ni = i / (TOTAL_BARS - 1);
      const bx = chartX + i * barGap + barGap / 2;
      const targetH = BAR_HEIGHTS[i] * chartH * 0.92;

      // Staggered timing: bars grow from left to right
      const bStart = 0.14 + ni * 0.30;
      const bProg = easeOutQuart(phase(p, bStart, bStart + 0.10));

      if (bProg > 0) {
        const currentH = targetH * bProg;

        // Determine if this is the highlighted bar
        const isHighlight = i === HIGHLIGHT_BAR_IDX;
        const highlightPhase = phase(p, 0.58, 0.68);

        // Bar opacity: later bars are darker (trend going up)
        let barAlpha = cardAlpha * (0.15 + 0.85 * ni) * bProg;
        let currentBarW = barW;

        if (isHighlight && highlightPhase > 0) {
          // Highlighted bar gets thicker and fully opaque
          const hEase = easeOutCubic(highlightPhase);
          currentBarW = lerp(barW, barW * 2.5, hEase);
          barAlpha = cardAlpha;
        }

        ctx.globalAlpha = barAlpha;
        ctx.fillStyle = barColor;

        // Draw bar with rounded top
        const bTop = chartBot - currentH;
        const bRadius = Math.min(currentBarW / 2, 3);
        rrect(ctx, bx - currentBarW / 2, bTop, currentBarW, currentH, bRadius);
        ctx.fill();
      }
    }

    // ── Month labels ──
    const labelFade = easeOutCubic(phase(p, 0.30, 0.42));
    ctx.globalAlpha = cardAlpha * labelFade;
    ctx.fillStyle = labelColor;
    ctx.font = sansFont('500', monthLabelSize);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';

    for (const month of MONTHS) {
      // Center each label under its bar group
      const startX = chartX + month.startIdx * barGap + barGap / 2;
      const endIdx = Math.min(month.startIdx + 5, TOTAL_BARS - 1);
      const endX = chartX + endIdx * barGap + barGap / 2;
      const centerX = (startX + endX) / 2;
      ctx.fillText(month.label, centerX, chartBot + 18);
    }

    // ══════════════════════════════════════════════════════════════════════════
    // ── CURSOR + TOOLTIP ──
    // ══════════════════════════════════════════════════════════════════════════
    const cursorPhase = phase(p, 0.52, 0.72);
    if (cursorPhase > 0) {
      const cursorEase = easeInOutCubic(cursorPhase);

      // Cursor travels from left side to the highlighted bar
      const highlightBarX = chartX + HIGHLIGHT_BAR_IDX * barGap + barGap / 2;
      const highlightBarTop = chartBot - BAR_HEIGHTS[HIGHLIGHT_BAR_IDX] * chartH * 0.92;

      const cursorStartX = chartX + chartW * 0.3;
      const cursorStartY = chartBot - chartH * 0.3;
      const cursorEndX = highlightBarX + 6;
      const cursorEndY = highlightBarTop + 40;

      const cursorX = lerp(cursorStartX, cursorEndX, cursorEase);
      const cursorY = lerp(cursorStartY, cursorEndY, cursorEase);

      // Draw cursor
      const cursorFade = easeOutCubic(phase(p, 0.52, 0.58));
      ctx.save();
      ctx.globalAlpha = cardAlpha * cursorFade;
      ctx.translate(cursorX, cursorY);

      // Cursor shape (pointer arrow)
      ctx.fillStyle = titleColor;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(0, 20);
      ctx.lineTo(5.5, 15.5);
      ctx.lineTo(9, 23);
      ctx.lineTo(12, 21.5);
      ctx.lineTo(8.5, 14);
      ctx.lineTo(14, 13);
      ctx.closePath();
      ctx.fill();

      // White outline for visibility
      ctx.strokeStyle = '#FFFFFF';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      ctx.restore();

      // ── Tooltip ──
      const tooltipPhase = phase(p, 0.64, 0.74);
      if (tooltipPhase > 0) {
        const tooltipEase = easeOutBack(tooltipPhase);
        const tooltipS = clamp01(tooltipEase);

        // Position tooltip above the highlighted bar
        const tooltipX = highlightBarX;
        const tooltipY = highlightBarTop - 28;

        ctx.save();
        ctx.globalAlpha = cardAlpha * clamp01(tooltipPhase * 2);
        ctx.translate(tooltipX, tooltipY);
        ctx.scale(tooltipS, tooltipS);

        // Tooltip pill background
        const tooltipW = 72;
        const tooltipH = 34;
        pill(ctx, -tooltipW / 2, -tooltipH / 2, tooltipW, tooltipH);
        ctx.fillStyle = tooltipColor;
        ctx.fill();

        // Tooltip text "453"
        ctx.fillStyle = tooltipTextColor;
        ctx.font = sansFont('600', 16);
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        const countProg = easeOutCubic(phase(p, 0.66, 0.80));
        const tooltipNum = Math.round(453 * countProg);
        ctx.fillText(tooltipNum.toString(), 0, 0);

        // Small triangle pointer below tooltip
        ctx.fillStyle = tooltipColor;
        ctx.beginPath();
        ctx.moveTo(-5, tooltipH / 2 - 1);
        ctx.lineTo(5, tooltipH / 2 - 1);
        ctx.lineTo(0, tooltipH / 2 + 6);
        ctx.closePath();
        ctx.fill();

        ctx.restore();
      }
    }

    // ══════════════════════════════════════════════════════════════════════════
    // ── BOTTOM STATS ──
    // ══════════════════════════════════════════════════════════════════════════
    const statsY = chartBot + statsGap;

    // Divider line
    const dividerFade = easeOutCubic(phase(p, 0.60, 0.70));
    if (dividerFade > 0) {
      ctx.globalAlpha = cardAlpha * dividerFade * 0.15;
      ctx.fillStyle = labelColor;
      ctx.fillRect(L, statsY - 6, contentW * dividerFade, 1);
    }

    // "TOTAL FOLLOWERS" and "587"
    const stat1Fade = easeOutCubic(phase(p, 0.65, 0.78));
    const stat1Slide = (1 - stat1Fade) * 16;
    ctx.globalAlpha = cardAlpha * stat1Fade;

    ctx.textBaseline = 'top';
    ctx.textAlign = 'left';
    ctx.fillStyle = statLabelColor;
    ctx.font = sansFont('600', 13);
    ctx.fillText('TOTAL FOLLOWERS', L, statsY + 10 + stat1Slide);

    // Count up 587
    const count1Prog = easeOutCubic(phase(p, 0.68, 0.88));
    const totalNum = Math.round(587 * count1Prog);
    ctx.fillStyle = statValueColor;
    ctx.font = sansFont('700', statValueSize);
    ctx.fillText(totalNum.toString(), L, statsY + 30 + stat1Slide);

    // "NEW FOLLOWERS" and "116"
    const stat2Fade = easeOutCubic(phase(p, 0.70, 0.82));
    const stat2Slide = (1 - stat2Fade) * 16;
    ctx.globalAlpha = cardAlpha * stat2Fade;

    const rightCol = L + contentW * 0.52;
    ctx.fillStyle = statLabelColor;
    ctx.font = sansFont('600', 13);
    ctx.fillText('NEW FOLLOWERS', rightCol, statsY + 10 + stat2Slide);

    // Count up 116
    const count2Prog = easeOutCubic(phase(p, 0.72, 0.90));
    const newNum = Math.round(116 * count2Prog);
    ctx.fillStyle = statValueColor;
    ctx.font = sansFont('700', statValueSize);
    ctx.fillText(newNum.toString(), rightCol, statsY + 30 + stat2Slide);

    // ── Restore all transforms ──
    ctx.restore(); // clip
    ctx.restore(); // card entrance
    ctx.restore(); // global scale
  },
};

export default animation;

import type { AnimationDefinition } from '../../runtime/types';
import { number, color, string, boolean, select, folder } from '../../runtime/params';

/**
 * Lower Third — Clean & Premium
 * A sleek lower-third overlay with title, subtitle, and accent line.
 * Smooth staggered entrance/exit with configurable timing and style.
 */

interface LowerThirdParams {
  // Content
  title: string;
  subtitle: string;
  // Typography
  titleSize: number;
  subtitleSize: number;
  titleWeight: string;
  subtitleWeight: string;
  // Layout
  scale: number;
  marginLeft: number;
  marginBottom: number;
  gap: number;
  // Accent Line
  showAccentLine: boolean;
  accentLineWidth: number;
  accentLineThickness: number;
  // Colors
  titleColor: string;
  subtitleColor: string;
  accentColor: string;
  backgroundColor: string;
  // Animation
  speed: number;
  stagger: number;
  holdTime: number;
  easing: string;
}

// --- Easing functions ---
const easings: Record<string, (t: number) => number> = {
  easeOutCubic: (t) => 1 - Math.pow(1 - t, 3),
  easeOutQuart: (t) => 1 - Math.pow(1 - t, 4),
  easeOutQuint: (t) => 1 - Math.pow(1 - t, 5),
  easeOutExpo: (t) => (t === 1 ? 1 : 1 - Math.pow(2, -10 * t)),
  easeInOutCubic: (t) =>
    t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2,
  easeInOutQuart: (t) =>
    t < 0.5 ? 8 * t * t * t * t : 1 - Math.pow(-2 * t + 2, 4) / 2,
  easeInCubic: (t) => t * t * t,
  easeInQuart: (t) => t * t * t * t,
};

/**
 * Maps progress [0..1] through an entrance → hold → exit lifecycle.
 * Returns a value 0..1 where:
 *   0 = fully hidden
 *   1 = fully visible (during hold)
 */
function lifecycle(
  progress: number,
  enterStart: number,
  enterEnd: number,
  exitStart: number,
  exitEnd: number,
  easeIn: (t: number) => number,
  easeOut: (t: number) => number,
): number {
  if (progress < enterStart) return 0;
  if (progress < enterEnd) {
    const t = (progress - enterStart) / (enterEnd - enterStart);
    return easeIn(Math.max(0, Math.min(1, t)));
  }
  if (progress < exitStart) return 1;
  if (progress < exitEnd) {
    const t = (progress - exitStart) / (exitEnd - exitStart);
    return 1 - easeOut(Math.max(0, Math.min(1, t)));
  }
  return 0;
}

const animation: AnimationDefinition<LowerThirdParams> = {
  id: 'lower-third',
  name: 'Lower Third',
  fps: 60,
  durationMs: 5000,
  width: 1920,
  height: 1080,
  background: '#0A0A0A',

  params: {
    defaults: {
      title: 'Jane Cooper',
      subtitle: 'Senior Product Designer',
      titleSize: 60,
      subtitleSize: 30,
      titleWeight: '500',
      subtitleWeight: '400',
      scale: 1,
      marginLeft: 140,
      marginBottom: 130,
      gap: 37,
      showAccentLine: true,
      accentLineWidth: 200,
      accentLineThickness: 3.5,
      titleColor: '#ffffff',
      subtitleColor: '#8C8C8C',
      accentColor: '#85ca68',
      backgroundColor: '#0A0A0A',
      speed: 1,
      stagger: 0.06,
      holdTime: 0.55,
      easing: 'easeOutQuart',
    },
    schema: {
      ...folder('Content', {
        title: string({ value: 'Jane Cooper', label: 'Title' }),
        subtitle: string({ value: 'Senior Product Designer', label: 'Subtitle' }),
      }),
      ...folder('Typography', {
        titleSize: number({ value: 52, min: 16, max: 120, step: 1, label: 'Title Size' }),
        subtitleSize: number({ value: 28, min: 12, max: 80, step: 1, label: 'Subtitle Size' }),
        titleWeight: select({
          value: '600',
          options: ['300', '400', '500', '600', '700', '800', '900'],
          label: 'Title Weight',
        }),
        subtitleWeight: select({
          value: '400',
          options: ['300', '400', '500', '600', '700'],
          label: 'Subtitle Weight',
        }),
      }),
      ...folder('Layout', {
        scale: number({ value: 1, min: 0.3, max: 3, step: 0.05, label: 'Scale' }),
        marginLeft: number({ value: 140, min: 0, max: 600, step: 10, label: 'Margin Left' }),
        marginBottom: number({ value: 140, min: 0, max: 600, step: 10, label: 'Margin Bottom' }),
        gap: number({ value: 12, min: 0, max: 40, step: 1, label: 'Gap' }),
      }),
      ...folder('Accent Line', {
        showAccentLine: boolean({ value: true, label: 'Show Line' }),
        accentLineWidth: number({ value: 56, min: 10, max: 200, step: 2, label: 'Line Width' }),
        accentLineThickness: number({ value: 3, min: 1, max: 8, step: 0.5, label: 'Thickness' }),
      }),
      ...folder('Colors', {
        titleColor: color({ value: '#FFFFFF', label: 'Title Color' }),
        subtitleColor: color({ value: '#8C8C8C', label: 'Subtitle Color' }),
        accentColor: color({ value: '#FFFFFF', label: 'Accent Color' }),
        backgroundColor: color({ value: '#0A0A0A', label: 'Background' }),
      }),
      ...folder('Animation', {
        speed: number({ value: 1, min: 0.3, max: 3, step: 0.1, label: 'Speed' }),
        stagger: number({ value: 0.06, min: 0, max: 0.2, step: 0.01, label: 'Stagger' }),
        holdTime: number({ value: 0.55, min: 0.1, max: 0.8, step: 0.05, label: 'Hold Time' }),
        easing: select({
          value: 'easeOutQuart',
          options: [
            'easeOutCubic',
            'easeOutQuart',
            'easeOutQuint',
            'easeOutExpo',
            'easeInOutCubic',
            'easeInOutQuart',
          ],
          label: 'Easing',
        }),
      }),
    },
  },

  render({ ctx, width, height, progress, params }) {
    const {
      title,
      subtitle,
      titleSize,
      subtitleSize,
      titleWeight,
      subtitleWeight,
      scale,
      marginLeft,
      marginBottom,
      gap,
      showAccentLine,
      accentLineWidth,
      accentLineThickness,
      titleColor,
      subtitleColor,
      accentColor,
      backgroundColor,
      speed,
      stagger,
      holdTime,
      easing,
    } = params;

    // --- Background ---
    ctx.fillStyle = backgroundColor;
    ctx.fillRect(0, 0, width, height);

    // Ease functions for enter / exit
    const easeIn = easings[easing] || easings.easeOutQuart;
    const easeOut = easings.easeInCubic; // exit always snappy

    // --- Timeline ---
    // Phases: entrance (0→enterEnd), hold, exit (exitStart→1)
    const enterDuration = 0.18 / speed;
    const exitDuration = 0.14 / speed;
    const holdStart = enterDuration + stagger * 3; // after all elements entered
    const exitStart = holdStart + holdTime;
    const exitEnd = Math.min(1, exitStart + exitDuration);

    // Per-element staggered timings
    const accentEnter = [0, enterDuration];
    const titleEnter = [stagger, stagger + enterDuration];
    const subtitleEnter = [stagger * 2, stagger * 2 + enterDuration];

    const accentExit = [exitStart, exitEnd];
    const titleExit = [exitStart + stagger, Math.min(1, exitEnd + stagger)];
    const subtitleExit = [exitStart + stagger * 2, Math.min(1, exitEnd + stagger * 2)];

    // Compute visibility for each element (0 = hidden, 1 = visible)
    const accentVis = lifecycle(
      progress,
      accentEnter[0], accentEnter[1],
      accentExit[0], accentExit[1],
      easeIn, easeOut,
    );
    const titleVis = lifecycle(
      progress,
      titleEnter[0], titleEnter[1],
      titleExit[0], titleExit[1],
      easeIn, easeOut,
    );
    const subtitleVis = lifecycle(
      progress,
      subtitleEnter[0], subtitleEnter[1],
      subtitleExit[0], subtitleExit[1],
      easeIn, easeOut,
    );

    // --- Positioning ---
    // Anchor at bottom-left
    const baseX = marginLeft;
    const baseY = height - marginBottom;

    ctx.save();
    ctx.translate(baseX, baseY);
    ctx.scale(scale, scale);

    // Slide offset (elements slide up/left on enter)
    const slideDistance = 28;

    // --- Subtitle (bottom element) ---
    if (subtitleVis > 0.001) {
      const slideY = (1 - subtitleVis) * slideDistance;
      ctx.save();
      ctx.globalAlpha = subtitleVis;
      ctx.translate(0, slideY);
      ctx.font = `${subtitleWeight} ${subtitleSize}px "Inter", "SF Pro Display", -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif`;
      ctx.textBaseline = 'bottom';
      ctx.textAlign = 'left';
      ctx.fillStyle = subtitleColor;
      ctx.fillText(subtitle, 0, 0);
      ctx.restore();
    }

    // --- Title (above subtitle) ---
    const titleY = -(gap + subtitleSize * 0.25);
    if (titleVis > 0.001) {
      const slideY = (1 - titleVis) * slideDistance;
      ctx.save();
      ctx.globalAlpha = titleVis;
      ctx.translate(0, titleY + slideY);
      ctx.font = `${titleWeight} ${titleSize}px "Inter", "SF Pro Display", -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif`;
      ctx.textBaseline = 'bottom';
      ctx.textAlign = 'left';
      ctx.fillStyle = titleColor;
      ctx.fillText(title, 0, 0);
      ctx.restore();
    }

    // --- Accent line (above title) ---
    if (showAccentLine && accentVis > 0.001) {
      const lineY = titleY - titleSize - gap * 0.75;
      const currentLineWidth = accentLineWidth * accentVis;
      const slideY = (1 - accentVis) * (slideDistance * 0.5);

      ctx.save();
      ctx.globalAlpha = accentVis;
      ctx.translate(0, lineY + slideY);

      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(currentLineWidth, 0);
      ctx.strokeStyle = accentColor;
      ctx.lineWidth = accentLineThickness;
      ctx.lineCap = 'round';
      ctx.stroke();

      ctx.restore();
    }

    ctx.restore();
  },
};

export default animation;

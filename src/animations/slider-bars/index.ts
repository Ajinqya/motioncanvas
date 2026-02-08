import type { AnimationDefinition } from '../../runtime/types';
import { number, color, boolean, folder } from '../../runtime/params';

/**
 * Slider Bars Animation
 * A horizontal slider with vertical bars that animate from 0 to 100%.
 * The bar at the current slider position dips shorter; all others are full height.
 * Bars are anchored from the bottom of the track.
 */

interface SliderBarsParams {
  scale: number;
  barColor: string;
  trackColor: string;
  trackStrokeColor: string;
  backgroundColor: string;
  tooltipColor: string;
  tooltipTextColor: string;
  tooltipFontSize: number;
  tooltipDistance: number;
  tooltipPaddingX: number;
  tooltipPaddingY: number;
  tooltipCornerRadius: number;
  showNubbin: boolean;
  speed: number;
  barCount: number;
  barWidth: number;
  barGap: number;
  maxBarHeight: number;
  minBarHeight: number;
  trackPadding: number;
  cornerRadius: number;
  showTooltip: boolean;
  transitionWidth: number;
}

// Easing: smooth ease-in-out for the 0→100 sweep
const easeInOutCubic = (t: number): number =>
  t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

// Smooth interpolation for bar heights around the transition zone
const smoothstep = (edge0: number, edge1: number, x: number): number => {
  const t = Math.max(0, Math.min(1, (x - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
};

const animation: AnimationDefinition<SliderBarsParams> = {
  id: 'slider-bars',
  name: 'Slider Bars',
  fps: 60,
  durationMs: 4000,
  width: 960,
  height: 540,
  background: '#FFFFFF',

  params: {
    defaults: {
      scale: 1,
      barColor: '#696969',
      trackColor: '#FFFFFF',
      trackStrokeColor: '#ebebeb',
      backgroundColor: '#FFFFFF',
      tooltipColor: '#e0e0e0',
      tooltipTextColor: '#5e5e5e',
      tooltipFontSize: 12,
      tooltipDistance: -17,
      tooltipPaddingX: 5,
      tooltipPaddingY: 8,
      tooltipCornerRadius: 4,
      showNubbin: true,
      speed: 1,
      barCount: 34,
      barWidth: 3,
      barGap: 2.5,
      maxBarHeight: 20,
      minBarHeight: 7,
      trackPadding: 12,
      cornerRadius: 8,
      showTooltip: true,
      transitionWidth: 0.15,
    },
    schema: {
      ...folder('Layout', {
        scale: number({ value: 1, min: 0.1, max: 3, step: 0.1, label: 'Scale' }),
        barCount: number({ value: 34, min: 10, max: 80, step: 1, label: 'Bar Count' }),
        barWidth: number({ value: 3, min: 2, max: 10, step: 0.5, label: 'Bar Width' }),
        barGap: number({ value: 3.5, min: 1, max: 8, step: 0.5, label: 'Bar Gap' }),
        maxBarHeight: number({ value: 52, min: 20, max: 100, step: 1, label: 'Max Bar Height' }),
        minBarHeight: number({ value: 14, min: 4, max: 40, step: 1, label: 'Min Bar Height' }),
        trackPadding: number({ value: 10, min: 4, max: 40, step: 1, label: 'Track Padding' }),
        cornerRadius: number({ value: 13, min: 4, max: 60, step: 1, label: 'Corner Radius' }),
      }),
      ...folder('Colors', {
        barColor: color({ value: '#2C2C2C', label: 'Bar Color' }),
        trackColor: color({ value: '#FFFFFF', label: 'Track Fill' }),
        trackStrokeColor: color({ value: '#D4D4D4', label: 'Track Stroke' }),
        backgroundColor: color({ value: '#FFFFFF', label: 'Background' }),
        tooltipColor: color({ value: '#F0F0F0', label: 'Tooltip Background' }),
        tooltipTextColor: color({ value: '#525252', label: 'Tooltip Text' }),
      }),
      ...folder('Tooltip', {
        showTooltip: boolean({ value: true, label: 'Show Tooltip' }),
        tooltipFontSize: number({ value: 12, min: 8, max: 48, step: 1, label: 'Font Size' }),
        tooltipDistance: number({ value: 5, min: -60, max: 60, step: 1, label: 'Distance from Slider' }),
        tooltipPaddingX: number({ value: 5, min: 2, max: 40, step: 1, label: 'Padding X' }),
        tooltipPaddingY: number({ value: 8, min: 2, max: 40, step: 1, label: 'Padding Y' }),
        tooltipCornerRadius: number({ value: 4, min: 0, max: 30, step: 1, label: 'Corner Radius' }),
        showNubbin: boolean({ value: true, label: 'Show Nubbin' }),
      }),
      ...folder('Animation', {
        speed: number({ value: 1, min: 0.1, max: 3, step: 0.1, label: 'Speed' }),
        transitionWidth: number({ value: 0.17, min: 0.02, max: 0.3, step: 0.01, label: 'Transition Softness' }),
      }),
    },
  },

  render({ ctx, progress, width, height, params }) {
    const {
      scale,
      barColor,
      trackColor,
      trackStrokeColor,
      backgroundColor,
      tooltipColor,
      tooltipTextColor,
      tooltipFontSize,
      tooltipDistance,
      tooltipPaddingX,
      tooltipPaddingY,
      tooltipCornerRadius,
      showNubbin,
      speed,
      barCount,
      barWidth,
      barGap,
      maxBarHeight,
      minBarHeight,
      trackPadding,
      cornerRadius,
      showTooltip,
      transitionWidth,
    } = params;

    // Adjusted progress with speed
    const adjustedProgress = (progress * speed) % 1;
    // Smooth eased value from 0 → 1
    const sliderValue = easeInOutCubic(adjustedProgress);
    const percentage = Math.round(sliderValue * 100);

    // Clear background
    ctx.fillStyle = backgroundColor;
    ctx.fillRect(0, 0, width, height);

    // Center everything
    ctx.save();
    ctx.translate(width / 2, height / 2);
    ctx.scale(scale, scale);

    // Calculate track dimensions
    const totalBarsWidth = barCount * barWidth + (barCount - 1) * barGap;
    const trackWidth = totalBarsWidth + trackPadding * 2;
    const trackHeight = maxBarHeight + trackPadding * 2;
    const trackX = -trackWidth / 2;
    const trackY = -trackHeight / 2;

    // Bottom of the bars area (inside the track)
    const barsBottomY = trackY + trackHeight - trackPadding;

    // Draw track background with rounded corners and stroke
    ctx.beginPath();
    ctx.roundRect(trackX, trackY, trackWidth, trackHeight, cornerRadius);
    ctx.fillStyle = trackColor;
    ctx.fill();
    ctx.strokeStyle = trackStrokeColor;
    ctx.lineWidth = 2;
    ctx.stroke();

    // Clip to track so bars don't overflow rounded corners
    ctx.save();
    ctx.beginPath();
    ctx.roundRect(trackX + 1, trackY + 1, trackWidth - 2, trackHeight - 2, cornerRadius - 1);
    ctx.clip();

    // Draw bars
    const barsStartX = -totalBarsWidth / 2;

    for (let i = 0; i < barCount; i++) {
      const barNorm = i / (barCount - 1); // 0 to 1 position across track

      // Calculate bar height based on slider value
      // Bars near the slider position are SHORT (dipped), all others are TALL
      // smoothstep gives a bump around the slider position
      const transHalf = transitionWidth;
      const dipFactor = smoothstep(sliderValue - transHalf, sliderValue, barNorm)
                      * (1 - smoothstep(sliderValue, sliderValue + transHalf, barNorm));
      // dipFactor is ~1 at the slider position, ~0 elsewhere
      const barHeight = maxBarHeight - (maxBarHeight - minBarHeight) * dipFactor;

      // Calculate opacity: bars near the dip are lighter, others fully opaque
      const opacity = 1 - 0.7 * dipFactor;

      const barX = barsStartX + i * (barWidth + barGap);
      // Anchor from bottom: bar grows upward from the bottom
      const barTopY = barsBottomY - barHeight;

      // Draw the bar with rounded ends
      const barRadius = barWidth / 2;
      ctx.beginPath();
      ctx.roundRect(barX, barTopY, barWidth, barHeight, barRadius);
      ctx.fillStyle = barColor;
      ctx.globalAlpha = opacity;
      ctx.fill();
    }

    ctx.globalAlpha = 1;
    ctx.restore(); // Remove clip

    // Draw tooltip
    if (showTooltip) {
      const tooltipX = -trackWidth / 2 + trackPadding + sliderValue * totalBarsWidth;
      const arrowSize = showNubbin ? 6 : 0;
      // tooltipDistance can be negative to overlap into the dip area
      const tooltipAnchorY = trackY - tooltipDistance;

      // Font sizes derived from param
      const mainFontSize = tooltipFontSize;
      const percentFontSize = Math.round(tooltipFontSize * 0.55);

      // Measure text for sizing -- number on top, % below
      const text = `${percentage}`;
      const percentSign = '%';
      ctx.font = `bold ${mainFontSize}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;
      const textMetrics = ctx.measureText(text);
      ctx.font = `bold ${percentFontSize}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;
      const percentMetrics = ctx.measureText(percentSign);

      // Tooltip width based on widest line
      const contentWidth = Math.max(textMetrics.width, percentMetrics.width);
      const lineGap = Math.round(mainFontSize * 0.15);
      const contentHeight = mainFontSize + lineGap + percentFontSize;

      const tooltipW = contentWidth + tooltipPaddingX * 2;
      const tooltipH = contentHeight + tooltipPaddingY * 2;
      const tooltipR = tooltipCornerRadius;

      // Tooltip box position
      const tX = tooltipX - tooltipW / 2;
      const tY = tooltipAnchorY - tooltipH - arrowSize;

      // Shadow
      ctx.save();
      ctx.shadowColor = 'rgba(0, 0, 0, 0.08)';
      ctx.shadowBlur = 10;
      ctx.shadowOffsetY = 2;

      ctx.beginPath();
      ctx.roundRect(tX, tY, tooltipW, tooltipH, tooltipR);
      ctx.fillStyle = tooltipColor;
      ctx.fill();
      ctx.restore();

      // Arrow / nubbin pointing down
      if (showNubbin) {
        ctx.beginPath();
        ctx.moveTo(tooltipX - arrowSize, tooltipAnchorY - arrowSize);
        ctx.lineTo(tooltipX, tooltipAnchorY);
        ctx.lineTo(tooltipX + arrowSize, tooltipAnchorY - arrowSize);
        ctx.closePath();
        ctx.fillStyle = tooltipColor;
        ctx.fill();
      }

      // Draw number (centered horizontally, upper portion)
      ctx.fillStyle = tooltipTextColor;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';

      const textCenterX = tX + tooltipW / 2;
      const numberY = tY + tooltipPaddingY;
      ctx.font = `bold ${mainFontSize}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;
      ctx.fillText(text, textCenterX, numberY);

      // Draw percent sign below the number (centered)
      const percentY = numberY + mainFontSize + lineGap;
      ctx.font = `bold ${percentFontSize}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;
      ctx.fillText(percentSign, textCenterX, percentY);
    }

    ctx.restore();
  },
};

export default animation;

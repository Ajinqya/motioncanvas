import type { AnimationDefinition } from '../../runtime/types';
import { number, color, string, folder } from '../../runtime/params';

interface SyncingDotsParams {
  // Layout
  scale: number;
  // Colors
  primaryColor: string;
  backgroundColor: string;
  pillColor: string;
  // Text
  labelText: string;
  // Animation
  speed: number;
  // Icon
  dotCount: number;
  iconSize: number;
}

const animation: AnimationDefinition<SyncingDotsParams> = {
  id: 'syncing-dots',
  name: 'Syncing Dots',
  fps: 60,
  durationMs: 3000,
  width: 960,
  height: 540,
  background: '#F0F0F0',

  params: {
    defaults: {
      scale: 1,
      primaryColor: '#1A1A1A',
      backgroundColor: '#F0F0F0',
      pillColor: '#FFFFFF',
      labelText: 'Syncing',
      speed: 1,
      dotCount: 8,
      iconSize: 28,
    },
    schema: {
      ...folder('Layout', {
        scale: number({ value: 1, min: 0.1, max: 3, step: 0.1, label: 'Scale' }),
        iconSize: number({ value: 28, min: 12, max: 60, step: 1, label: 'Icon Size' }),
      }),
      ...folder('Colors', {
        primaryColor: color({ value: '#1A1A1A', label: 'Primary Color' }),
        backgroundColor: color({ value: '#F0F0F0', label: 'Background' }),
        pillColor: color({ value: '#FFFFFF', label: 'Pill Color' }),
      }),
      ...folder('Text', {
        labelText: string({ value: 'Syncing', label: 'Label Text' }),
      }),
      ...folder('Animation', {
        speed: number({ value: 1, min: 0.1, max: 3, step: 0.1, label: 'Speed' }),
        dotCount: number({ value: 8, min: 4, max: 16, step: 1, label: 'Dot Count' }),
      }),
    },
  },

  render({ ctx, width, height, progress, params }) {
    const {
      scale,
      primaryColor,
      backgroundColor,
      pillColor,
      labelText,
      speed,
      dotCount,
      iconSize,
    } = params;

    const adjustedProgress = (progress * speed) % 1;

    // Clear background
    ctx.fillStyle = backgroundColor;
    ctx.fillRect(0, 0, width, height);

    ctx.save();
    ctx.translate(width / 2, height / 2);
    ctx.scale(scale, scale);

    // --- Measure text to size the pill ---
    const fontSize = iconSize * 1.5;
    ctx.font = `600 ${fontSize}px -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif`;
    const textMetrics = ctx.measureText(labelText);
    const textWidth = textMetrics.width;

    const iconTotalSize = iconSize * 2.2; // total icon area diameter
    const gap = iconSize * 0.7;
    const contentWidth = iconTotalSize + gap + textWidth;
    const paddingH = iconSize * 1.3;
    const paddingV = iconSize * 0.9;
    const pillWidth = contentWidth + paddingH * 2;
    const pillHeight = Math.max(iconTotalSize, fontSize) + paddingV * 2;
    const pillRadius = pillHeight / 2;

    // --- Draw pill shape with shadow ---
    ctx.save();
    ctx.shadowColor = 'rgba(0, 0, 0, 0.08)';
    ctx.shadowBlur = 20;
    ctx.shadowOffsetY = 4;
    ctx.beginPath();
    ctx.roundRect(-pillWidth / 2, -pillHeight / 2, pillWidth, pillHeight, pillRadius);
    ctx.fillStyle = pillColor;
    ctx.fill();
    ctx.restore();

    // --- Position content within the pill ---
    const contentStartX = -contentWidth / 2;
    const iconCenterX = contentStartX + iconTotalSize / 2;
    const textStartX = contentStartX + iconTotalSize + gap;

    // --- Draw Syncing Icon ---
    ctx.save();
    ctx.translate(iconCenterX, 0);

    const centerDotRadius = iconSize * 0.08;
    const innerRingRadius = iconSize * 0.38;
    const outerRingRadius = iconSize * 0.78;
    const dotRadius = iconSize * 0.065;

    // Rotation angles (opposite directions)
    const innerRotation = adjustedProgress * Math.PI * 2;
    const outerRotation = -adjustedProgress * Math.PI * 2;

    // 1. Center dot
    ctx.fillStyle = primaryColor;
    ctx.beginPath();
    ctx.arc(0, 0, centerDotRadius, 0, Math.PI * 2);
    ctx.fill();

    // 2. Inner ring of dots (rotating clockwise)
    ctx.save();
    ctx.rotate(innerRotation);
    for (let i = 0; i < dotCount; i++) {
      const angle = (i / dotCount) * Math.PI * 2;
      const x = Math.cos(angle) * innerRingRadius;
      const y = Math.sin(angle) * innerRingRadius;
      ctx.beginPath();
      ctx.arc(x, y, dotRadius, 0, Math.PI * 2);
      ctx.fillStyle = primaryColor;
      ctx.fill();
    }
    ctx.restore();

    // 3. Outer ring of dots (rotating counter-clockwise)
    ctx.save();
    ctx.rotate(outerRotation);
    const outerDotCount = dotCount + 4;
    for (let i = 0; i < outerDotCount; i++) {
      const angle = (i / outerDotCount) * Math.PI * 2;
      const x = Math.cos(angle) * outerRingRadius;
      const y = Math.sin(angle) * outerRingRadius;
      ctx.beginPath();
      ctx.arc(x, y, dotRadius * 0.85, 0, Math.PI * 2);
      ctx.fillStyle = primaryColor;
      ctx.fill();
    }
    ctx.restore();

    ctx.restore(); // restore icon translation

    // --- Draw text ---
    ctx.fillStyle = primaryColor;
    ctx.font = `600 ${fontSize}px -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif`;
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'left';
    ctx.fillText(labelText, textStartX, 1); // slight vertical nudge for optical alignment

    ctx.restore(); // restore main transform
  },
};

export default animation;

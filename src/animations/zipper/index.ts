import type { AnimationDefinition } from '../../runtime/types';
import { number, color, boolean, folder } from '../../runtime/params';

/**
 * Zipper Animation
 * A realistic zipper that opens and closes with metallic teeth,
 * leather tape, stitching details, and a ZIP file pull tab.
 */

interface ZipperParams {
  // Layout
  scale: number;
  rotation: number;
  // Colors
  leatherColor: string;
  toothColor: string;
  sliderColor: string;
  stitchColor: string;
  innerColor: string;
  backgroundColor: string;
  // Animation
  speed: number;
  showStitching: boolean;
}

// Easing
const easeInOutCubic = (t: number): number =>
  t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

// Adjust a hex color's brightness
const adjustBrightness = (hex: string, amount: number): string => {
  const r = Math.max(0, Math.min(255, parseInt(hex.slice(1, 3), 16) + amount));
  const g = Math.max(0, Math.min(255, parseInt(hex.slice(3, 5), 16) + amount));
  const b = Math.max(0, Math.min(255, parseInt(hex.slice(5, 7), 16) + amount));
  return `rgb(${r},${g},${b})`;
};

const animation: AnimationDefinition<ZipperParams> = {
  id: 'zipper',
  name: 'Zipper',
  fps: 60,
  durationMs: 4000,
  width: 800,
  height: 800,
  background: '#3a3d35',

  params: {
    defaults: {
      scale: 1.4,
      rotation: 0,
      leatherColor: '#4a4d42',
      toothColor: '#8a8a80',
      sliderColor: '#707068',
      stitchColor: '#2e312a',
      innerColor: '#42453a',
      backgroundColor: '#3a3d35',
      speed: 1,
      showStitching: true,
    },
    schema: {
      ...folder('Layout', {
        scale: number({ value: 1, min: 0.1, max: 3, step: 0.1, label: 'Scale' }),
        rotation: number({ value: -20, min: -90, max: 90, step: 5, label: 'Rotation (°)' }),
      }),
      ...folder('Colors', {
        leatherColor: color({ value: '#4a4d42', label: 'Leather' }),
        toothColor: color({ value: '#8a8a80', label: 'Teeth' }),
        sliderColor: color({ value: '#707068', label: 'Slider' }),
        stitchColor: color({ value: '#2e312a', label: 'Stitching' }),
        innerColor: color({ value: '#1a1d15', label: 'Inner Fabric' }),
        backgroundColor: color({ value: '#3a3d35', label: 'Background' }),
      }),
      ...folder('Animation', {
        speed: number({ value: 1, min: 0.1, max: 3, step: 0.1, label: 'Speed' }),
        showStitching: boolean({ value: true, label: 'Show Stitching' }),
      }),
    },
  },

  render({ ctx, width, height, progress, params }) {
    const {
      scale, rotation, leatherColor, toothColor, sliderColor, stitchColor,
      innerColor, backgroundColor, speed, showStitching,
    } = params;

    // --- Animation timing: open in first half, close in second half ---
    const adjustedProgress = (progress * speed) % 1;
    const rawOpen = adjustedProgress < 0.5
      ? adjustedProgress * 2
      : 2 - adjustedProgress * 2;
    const openAmount = easeInOutCubic(rawOpen);

    // --- Background ---
    ctx.fillStyle = backgroundColor;
    ctx.fillRect(0, 0, width, height);

    // --- Transform: center, rotate, scale ---
    ctx.save();
    ctx.translate(width / 2, height / 2);
    ctx.rotate((rotation * Math.PI) / 180);
    ctx.scale(scale, scale);

    // --- Zipper geometry ---
    const zipLen = 600;
    const topY = -zipLen / 2;
    const bottomY = zipLen / 2;
    const tapeW = 34;
    const maxGap = 30;
    const toothCount = 44;
    const toothSpacing = zipLen / toothCount;
    const toothW = 10;
    const toothH = toothSpacing * 0.6;

    // Slider position: top when fully closed (openAmount=0), bottom when fully open (openAmount=1)
    const sliderY = topY + openAmount * zipLen;

    // How far apart are the two sides at a given Y position?
    const getSep = (y: number): number => {
      if (y >= sliderY) return 0; // Below slider = closed
      const range = sliderY - topY;
      if (range < 0.5) return 0;
      const t = (sliderY - y) / range;
      const shape = 1 - Math.pow(1 - t, 1.5);
      // Smoothly ramp max separation based on how far the slider has traveled,
      // so the first few stitches don't jump from 0 to maxGap in one frame
      const travelRatio = Math.min(1, range / (zipLen * 0.1));
      return maxGap * shape * travelRatio;
    };

    const pathSteps = Math.ceil(zipLen / 3);

    // --- Leather background (oversized for rotation coverage) ---
    const bgSize = width * 2;
    ctx.fillStyle = leatherColor;
    ctx.fillRect(-bgSize / 2, -bgSize / 2, bgSize, bgSize);

    // Subtle radial highlight for 3D leather curvature
    const leatherGrad = ctx.createRadialGradient(0, 0, 0, 0, 0, bgSize * 0.35);
    leatherGrad.addColorStop(0, 'rgba(255,255,255,0.035)');
    leatherGrad.addColorStop(1, 'rgba(0,0,0,0.06)');
    ctx.fillStyle = leatherGrad;
    ctx.fillRect(-bgSize / 2, -bgSize / 2, bgSize, bgSize);

    // Subtle center seam (visible when closed)
    if (openAmount < 0.5) {
      ctx.globalAlpha = 1 - openAmount * 2;
      ctx.strokeStyle = adjustBrightness(leatherColor, -8);
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, -bgSize / 2);
      ctx.lineTo(0, bgSize / 2);
      ctx.stroke();
      ctx.globalAlpha = 1;
    }

    // --- Inner fabric (dark, visible through the opening) ---
    if (openAmount > 0.005) {
      ctx.save();
      ctx.beginPath();
      for (let i = 0; i <= pathSteps; i++) {
        const y = topY + (i / pathSteps) * zipLen;
        const sep = getSep(y);
        if (i === 0) ctx.moveTo(-sep - 4, y);
        else ctx.lineTo(-sep - 4, y);
      }
      for (let i = pathSteps; i >= 0; i--) {
        const y = topY + (i / pathSteps) * zipLen;
        const sep = getSep(y);
        ctx.lineTo(sep + 4, y);
      }
      ctx.closePath();
      ctx.fillStyle = innerColor;
      ctx.fill();

      // Inner depth shadow gradient
      ctx.save();
      ctx.clip();
      const depthGrad = ctx.createLinearGradient(-maxGap, 0, maxGap, 0);
      depthGrad.addColorStop(0, 'rgba(0,0,0,0.15)');
      depthGrad.addColorStop(0.3, 'rgba(0,0,0,0)');
      depthGrad.addColorStop(0.7, 'rgba(0,0,0,0)');
      depthGrad.addColorStop(1, 'rgba(0,0,0,0.15)');
      ctx.fillStyle = depthGrad;
      ctx.fillRect(-maxGap - 10, topY, maxGap * 2 + 20, zipLen);
      ctx.restore();
      ctx.restore();
    }

    // --- Zipper tape (fabric strips holding the teeth) ---
    const darkLeather = adjustBrightness(leatherColor, -14);

    // Left tape
    ctx.fillStyle = darkLeather;
    ctx.beginPath();
    for (let i = 0; i <= pathSteps; i++) {
      const y = topY + (i / pathSteps) * zipLen;
      const sep = getSep(y);
      if (i === 0) ctx.moveTo(-tapeW - sep, y);
      else ctx.lineTo(-tapeW - sep, y);
    }
    for (let i = pathSteps; i >= 0; i--) {
      const y = topY + (i / pathSteps) * zipLen;
      const sep = getSep(y);
      ctx.lineTo(-2 - sep, y);
    }
    ctx.closePath();
    ctx.fill();

    // Right tape
    ctx.beginPath();
    for (let i = 0; i <= pathSteps; i++) {
      const y = topY + (i / pathSteps) * zipLen;
      const sep = getSep(y);
      if (i === 0) ctx.moveTo(2 + sep, y);
      else ctx.lineTo(2 + sep, y);
    }
    for (let i = pathSteps; i >= 0; i--) {
      const y = topY + (i / pathSteps) * zipLen;
      const sep = getSep(y);
      ctx.lineTo(tapeW + sep, y);
    }
    ctx.closePath();
    ctx.fill();

    // Tape inner-edge highlight (subtle raised look)
    ctx.strokeStyle = adjustBrightness(leatherColor, 6);
    ctx.lineWidth = 0.7;
    ctx.beginPath();
    for (let i = 0; i <= pathSteps; i++) {
      const y = topY + (i / pathSteps) * zipLen;
      const sep = getSep(y);
      if (i === 0) ctx.moveTo(-2 - sep, y);
      else ctx.lineTo(-2 - sep, y);
    }
    ctx.stroke();
    ctx.beginPath();
    for (let i = 0; i <= pathSteps; i++) {
      const y = topY + (i / pathSteps) * zipLen;
      const sep = getSep(y);
      if (i === 0) ctx.moveTo(2 + sep, y);
      else ctx.lineTo(2 + sep, y);
    }
    ctx.stroke();

    // --- Stitching ---
    // Drawn as individual stitch marks at fixed Y positions rather than
    // setLineDash, which shifts every dash when the path length changes
    // (that caused a visible pop between frames 7 and 8).
    if (showStitching) {
      ctx.save();
      ctx.lineWidth = 1.5;
      ctx.lineCap = 'round';

      const stitchLen = 6;
      const stitchGap = 5;
      const stitchStep = stitchLen + stitchGap;

      // Inner stitching (on tape)
      ctx.strokeStyle = stitchColor;
      for (let y = topY; y <= bottomY; y += stitchStep) {
        const yEnd = Math.min(y + stitchLen, bottomY);
        const sep1 = getSep(y);
        const sep2 = getSep(yEnd);

        // Left inner
        ctx.beginPath();
        ctx.moveTo(-tapeW + 6 - sep1, y);
        ctx.lineTo(-tapeW + 6 - sep2, yEnd);
        ctx.stroke();

        // Right inner
        ctx.beginPath();
        ctx.moveTo(tapeW - 6 + sep1, y);
        ctx.lineTo(tapeW - 6 + sep2, yEnd);
        ctx.stroke();
      }

      // Outer stitching (on leather, just outside tape)
      ctx.strokeStyle = adjustBrightness(stitchColor, -5);
      for (let y = topY; y <= bottomY; y += stitchStep) {
        const yEnd = Math.min(y + stitchLen, bottomY);
        const sep1 = getSep(y);
        const sep2 = getSep(yEnd);

        // Left outer
        ctx.beginPath();
        ctx.moveTo(-tapeW - 8 - sep1, y);
        ctx.lineTo(-tapeW - 8 - sep2, yEnd);
        ctx.stroke();

        // Right outer
        ctx.beginPath();
        ctx.moveTo(tapeW + 8 + sep1, y);
        ctx.lineTo(tapeW + 8 + sep2, yEnd);
        ctx.stroke();
      }

      ctx.restore();
    }

    // --- Teeth ---
    for (let i = 0; i < toothCount; i++) {
      const y = topY + i * toothSpacing + toothSpacing / 2;
      const sep = getSep(y);

      // Metallic gradient per tooth
      const grad = ctx.createLinearGradient(
        -toothW - sep, y - toothH / 2,
        toothW + sep, y + toothH / 2,
      );
      grad.addColorStop(0, adjustBrightness(toothColor, 30));
      grad.addColorStop(0.35, adjustBrightness(toothColor, 10));
      grad.addColorStop(0.65, toothColor);
      grad.addColorStop(1, adjustBrightness(toothColor, -18));

      ctx.fillStyle = grad;

      // Left tooth (arrow pointing right ►)
      const lx = -sep;
      ctx.beginPath();
      ctx.moveTo(lx - toothW, y - toothH / 2);
      ctx.lineTo(lx - 2, y - toothH / 2);
      ctx.lineTo(lx, y);
      ctx.lineTo(lx - 2, y + toothH / 2);
      ctx.lineTo(lx - toothW, y + toothH / 2);
      ctx.closePath();
      ctx.fill();

      // Right tooth (arrow pointing left ◄)
      const rx = sep;
      ctx.beginPath();
      ctx.moveTo(rx + toothW, y - toothH / 2);
      ctx.lineTo(rx + 2, y - toothH / 2);
      ctx.lineTo(rx, y);
      ctx.lineTo(rx + 2, y + toothH / 2);
      ctx.lineTo(rx + toothW, y + toothH / 2);
      ctx.closePath();
      ctx.fill();

      // Tooth edge highlights (top edges)
      ctx.strokeStyle = 'rgba(255,255,255,0.14)';
      ctx.lineWidth = 0.5;
      ctx.beginPath();
      ctx.moveTo(lx - toothW, y - toothH / 2);
      ctx.lineTo(lx - 2, y - toothH / 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(rx + 2, y - toothH / 2);
      ctx.lineTo(rx + toothW, y - toothH / 2);
      ctx.stroke();
    }

    // --- Slider body ---
    const slW = 24;
    const slH = 32;

    // Shadow
    ctx.save();
    ctx.shadowColor = 'rgba(0,0,0,0.5)';
    ctx.shadowBlur = 12;
    ctx.shadowOffsetY = 4;

    // Trapezoidal body with metallic gradient
    const slGrad = ctx.createLinearGradient(
      -slW / 2, sliderY - slH / 2,
      slW / 2, sliderY + slH / 2,
    );
    slGrad.addColorStop(0, adjustBrightness(sliderColor, 30));
    slGrad.addColorStop(0.3, adjustBrightness(sliderColor, 15));
    slGrad.addColorStop(0.6, sliderColor);
    slGrad.addColorStop(1, adjustBrightness(sliderColor, -18));
    ctx.fillStyle = slGrad;

    ctx.beginPath();
    ctx.moveTo(-slW / 2 - 3, sliderY - slH / 2);
    ctx.lineTo(slW / 2 + 3, sliderY - slH / 2);
    ctx.lineTo(slW / 2, sliderY + slH / 2);
    ctx.lineTo(-slW / 2, sliderY + slH / 2);
    ctx.closePath();
    ctx.fill();
    ctx.restore();

    // Slider edge highlight
    ctx.strokeStyle = adjustBrightness(toothColor, 35);
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(-slW / 2 - 3, sliderY - slH / 2);
    ctx.lineTo(slW / 2 + 3, sliderY - slH / 2);
    ctx.lineTo(slW / 2, sliderY + slH / 2);
    ctx.lineTo(-slW / 2, sliderY + slH / 2);
    ctx.closePath();
    ctx.stroke();

    // Center groove
    ctx.strokeStyle = adjustBrightness(sliderColor, -12);
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(0, sliderY - slH / 2 + 5);
    ctx.lineTo(0, sliderY + slH / 2 - 5);
    ctx.stroke();

    // --- Connecting ring ---
    ctx.strokeStyle = adjustBrightness(toothColor, 12);
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(0, sliderY + slH / 2 + 2, 3.5, 0, Math.PI * 2);
    ctx.stroke();

    // --- Pull tab (ZIP document icon) ---
    const tabW = 20;
    const tabH = 28;
    const tabY = sliderY + slH / 2 + 6;
    const foldSize = 5;

    // Tab shadow
    ctx.save();
    ctx.shadowColor = 'rgba(0,0,0,0.35)';
    ctx.shadowBlur = 8;
    ctx.shadowOffsetY = 3;

    // Tab metallic gradient
    const tabGrad = ctx.createLinearGradient(-tabW / 2, tabY, tabW / 2, tabY + tabH);
    tabGrad.addColorStop(0, adjustBrightness(toothColor, 25));
    tabGrad.addColorStop(0.4, adjustBrightness(toothColor, 5));
    tabGrad.addColorStop(1, adjustBrightness(toothColor, -12));
    ctx.fillStyle = tabGrad;

    // Document shape with folded corner
    ctx.beginPath();
    ctx.moveTo(-tabW / 2 + 2, tabY);
    ctx.lineTo(tabW / 2 - foldSize, tabY);
    ctx.lineTo(tabW / 2, tabY + foldSize);
    ctx.lineTo(tabW / 2, tabY + tabH - 2);
    ctx.arcTo(tabW / 2, tabY + tabH, tabW / 2 - 2, tabY + tabH, 2);
    ctx.lineTo(-tabW / 2 + 2, tabY + tabH);
    ctx.arcTo(-tabW / 2, tabY + tabH, -tabW / 2, tabY + tabH - 2, 2);
    ctx.lineTo(-tabW / 2, tabY + 2);
    ctx.arcTo(-tabW / 2, tabY, -tabW / 2 + 2, tabY, 2);
    ctx.closePath();
    ctx.fill();
    ctx.restore();

    // Fold triangle (darker corner)
    ctx.fillStyle = adjustBrightness(toothColor, -22);
    ctx.beginPath();
    ctx.moveTo(tabW / 2 - foldSize, tabY);
    ctx.lineTo(tabW / 2 - foldSize, tabY + foldSize);
    ctx.lineTo(tabW / 2, tabY + foldSize);
    ctx.closePath();
    ctx.fill();

    // Tab top-edge highlight
    ctx.strokeStyle = 'rgba(255,255,255,0.12)';
    ctx.lineWidth = 0.5;
    ctx.beginPath();
    ctx.moveTo(-tabW / 2 + 2, tabY);
    ctx.lineTo(tabW / 2 - foldSize, tabY);
    ctx.stroke();

    // Mini zipper icon on tab
    ctx.strokeStyle = adjustBrightness(sliderColor, -30);
    ctx.lineWidth = 0.8;
    const iconCY = tabY + tabH * 0.3;
    ctx.beginPath();
    ctx.moveTo(0, iconCY - 5);
    ctx.lineTo(0, iconCY + 5);
    ctx.stroke();
    for (let j = -1; j <= 1; j++) {
      ctx.beginPath();
      ctx.moveTo(-2.5, iconCY + j * 3);
      ctx.lineTo(2.5, iconCY + j * 3);
      ctx.stroke();
    }

    // "ZIP" text
    ctx.fillStyle = adjustBrightness(sliderColor, -42);
    ctx.font = 'bold 8px -apple-system, system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('ZIP', 0, tabY + tabH * 0.68);

    ctx.restore();
  },
};

export default animation;

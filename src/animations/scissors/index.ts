import type { AnimationDefinition } from '../../runtime/types';
import { number, color, folder } from '../../runtime/params';

/**
 * Scissors Animation
 * Cutting/snipping motion: open → closed → open
 * Based on SVG icon with two crossing blades and bezier curve handles
 */

interface ScissorsParams {
  scale: number;
  backgroundColor: string;
  strokeColor: string;
  strokeWidth: number;
  cutSpeed: number;
  openAngle: number;
}

const animation: AnimationDefinition<ScissorsParams> = {
  id: 'scissors',
  name: 'Scissors',
  fps: 60,
  durationMs: 2000,
  width: 400,
  height: 400,
  background: '#FFFFFF',

  params: {
    defaults: {
      scale: 1,
      backgroundColor: '#000000',
      strokeColor: '#ffffff',
      strokeWidth: 4.5,
      cutSpeed: 1,
      openAngle: 12,
    },
    schema: {
      ...folder('Layout', {
        scale: number({ value: 1, min: 0.1, max: 3, step: 0.1, label: 'Scale' }),
      }),
      ...folder('Style', {
        backgroundColor: color({ value: '#FFFFFF', label: 'Background Color' }),
        strokeColor: color({ value: '#353535', label: 'Stroke Color' }),
        strokeWidth: number({ value: 2, min: 1, max: 5, step: 0.5, label: 'Stroke Width' }),
      }),
      ...folder('Animation', {
        cutSpeed: number({ value: 1, min: 0.5, max: 3, step: 0.1, label: 'Cut Speed' }),
        openAngle: number({ value: 12, min: 5, max: 30, step: 1, label: 'Open Angle (degrees)' }),
      }),
    },
  },

  render({ ctx, time, width, height, params }) {
    const { scale, backgroundColor, strokeColor, strokeWidth, cutSpeed, openAngle } = params;

    // Draw background
    ctx.fillStyle = backgroundColor;
    ctx.fillRect(0, 0, width, height);

    // Center canvas
    ctx.save();
    ctx.translate(width / 2, height / 2);
    ctx.scale(scale, scale);

    // Animation: smooth open-close-open cycle using sine wave
    const cycleTime = time * cutSpeed;
    const animationProgress = Math.cos(cycleTime * Math.PI * 2) * 0.5 + 0.5;
    
    // Convert open angle to radians
    const maxAngle = (openAngle * Math.PI) / 180;
    const currentAngle = animationProgress * maxAngle;

    // Setup stroke style
    ctx.strokeStyle = strokeColor;
    ctx.lineWidth = strokeWidth;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    // Scale factor to make scissors larger (original is 24x24)
    const svgScale = 8;
    
    // Calculate exact intersection of the two blade lines:
    // Left blade: (16.0005, 3) to (9.08457, 17.1821)
    // Right blade: (8, 3) to (14.9159, 17.1821)
    // Intersection is at approximately (12, 11.2) in SVG coordinates
    const intersectX = 12;
    const intersectY = 11.2;
    
    // Convert to centered coordinates (SVG center is 12, 12)
    const pivotX = (intersectX - 12) * svgScale; // 0
    const pivotY = (intersectY - 12) * svgScale; // -6.4

    // Draw left blade (top-right to bottom-left handle) - rotates one way
    ctx.save();
    ctx.translate(pivotX, pivotY);
    ctx.rotate(-currentAngle);
    ctx.translate(-pivotX, -pivotY);
    drawLeftBlade(ctx, svgScale);
    ctx.restore();

    // Draw right blade (top-left to bottom-right handle) - rotates opposite
    ctx.save();
    ctx.translate(pivotX, pivotY);
    ctx.rotate(currentAngle);
    ctx.translate(-pivotX, -pivotY);
    drawRightBlade(ctx, svgScale);
    ctx.restore();

    ctx.restore();
  },
};

/**
 * Draw the left blade of the scissors
 * SVG path: M16.0005 3L9.08457 17.1821M9.08457 17.1821L7.90522 19.5493
 *           C7.21337 20.9379 5.49659 21.4222 4.19919 20.5946
 *           C3.00617 19.8336 2.69164 18.3033 3.30968 17.0628
 *           C4.03299 15.611 5.82784 15.1048 7.18424 15.97L9.08457 17.1821Z
 */
function drawLeftBlade(ctx: CanvasRenderingContext2D, scale: number) {
  const cx = 12, cy = 12;
  const t = (x: number, y: number): [number, number] => [(x - cx) * scale, (y - cy) * scale];

  // Blade line: M16.0005 3 L9.08457 17.1821
  ctx.beginPath();
  ctx.moveTo(...t(16.0005, 3));
  ctx.lineTo(...t(9.08457, 17.1821));
  ctx.stroke();

  // Handle path: M9.08457 17.1821 L7.90522 19.5493 C... C... C... L9.08457 17.1821 Z
  ctx.beginPath();
  ctx.moveTo(...t(9.08457, 17.1821));
  ctx.lineTo(...t(7.90522, 19.5493));
  // First bezier curve
  ctx.bezierCurveTo(...t(7.21337, 20.9379), ...t(5.49659, 21.4222), ...t(4.19919, 20.5946));
  // Second bezier curve
  ctx.bezierCurveTo(...t(3.00617, 19.8336), ...t(2.69164, 18.3033), ...t(3.30968, 17.0628));
  // Third bezier curve
  ctx.bezierCurveTo(...t(4.03299, 15.611), ...t(5.82784, 15.1048), ...t(7.18424, 15.97));
  // Line back to junction
  ctx.lineTo(...t(9.08457, 17.1821));
  ctx.closePath();
  ctx.stroke();
}

/**
 * Draw the right blade of the scissors
 * SVG path: M8 3L14.9159 17.1821M14.9159 17.1821L16.0953 19.5493
 *           C16.7871 20.9379 18.5039 21.4222 19.8013 20.5946
 *           C20.9943 19.8336 21.3088 18.3033 20.6908 17.0628
 *           C19.9675 15.611 18.1726 15.1048 16.8162 15.97L14.9159 17.1821Z
 */
function drawRightBlade(ctx: CanvasRenderingContext2D, scale: number) {
  const cx = 12, cy = 12;
  const t = (x: number, y: number): [number, number] => [(x - cx) * scale, (y - cy) * scale];

  // Blade line: M8 3 L14.9159 17.1821
  ctx.beginPath();
  ctx.moveTo(...t(8, 3));
  ctx.lineTo(...t(14.9159, 17.1821));
  ctx.stroke();

  // Handle path: M14.9159 17.1821 L16.0953 19.5493 C... C... C... L14.9159 17.1821 Z
  ctx.beginPath();
  ctx.moveTo(...t(14.9159, 17.1821));
  ctx.lineTo(...t(16.0953, 19.5493));
  // First bezier curve
  ctx.bezierCurveTo(...t(16.7871, 20.9379), ...t(18.5039, 21.4222), ...t(19.8013, 20.5946));
  // Second bezier curve
  ctx.bezierCurveTo(...t(20.9943, 19.8336), ...t(21.3088, 18.3033), ...t(20.6908, 17.0628));
  // Third bezier curve
  ctx.bezierCurveTo(...t(19.9675, 15.611), ...t(18.1726, 15.1048), ...t(16.8162, 15.97));
  // Line back to junction
  ctx.lineTo(...t(14.9159, 17.1821));
  ctx.closePath();
  ctx.stroke();
}

export default animation;

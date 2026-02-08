import type { AnimationDefinition } from '../../runtime/types';
import { number, color, folder } from '../../runtime/params';

/**
 * Playhead Animation
 * The center playhead line moves left to right while side brackets stay fixed
 */

interface PlayheadParams {
  scale: number;
  strokeColor: string;
  backgroundColor: string;
  speed: number;
  moveAmount: number;
}

const animation: AnimationDefinition<PlayheadParams> = {
  id: 'playhead',
  name: 'Playhead',
  fps: 60,
  durationMs: 2000,
  width: 400,
  height: 400,
  background: '#FFFFFF',

  params: {
    defaults: {
      scale: 0.6,
      strokeColor: '#d79fdb',
      backgroundColor: '#641599',
      speed: 1,
      moveAmount: 4.5,
    },
    schema: {
      ...folder('Layout', {
        scale: number({ value: 1, min: 0.1, max: 3, step: 0.1, label: 'Scale' }),
        moveAmount: number({ value: 4, min: 1, max: 8, step: 0.5, label: 'Move Amount' }),
      }),
      ...folder('Colors', {
        strokeColor: color({ value: '#353535', label: 'Stroke Color' }),
        backgroundColor: color({ value: '#FFFFFF', label: 'Background' }),
      }),
      ...folder('Animation', {
        speed: number({ value: 1, min: 0.1, max: 3, step: 0.1, label: 'Speed' }),
      }),
    },
  },

  render({ ctx, time, width, height, params }) {
    const { scale, strokeColor, backgroundColor, speed, moveAmount } = params;

    // Clear with background
    ctx.fillStyle = backgroundColor;
    ctx.fillRect(0, 0, width, height);

    // Center the content
    ctx.save();
    ctx.translate(width / 2, height / 2);
    ctx.scale(scale, scale);

    // Scale factor for the SVG icon (original is 24x24)
    const iconScale = 8;
    ctx.scale(iconScale, iconScale);
    ctx.translate(-12, -12);

    ctx.strokeStyle = strokeColor;
    ctx.lineWidth = 1;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    // Calculate horizontal offset for the center playhead (smooth left-right loop)
    const normalizedTime = (time * speed) % 1;
    const offsetX = Math.sin(normalizedTime * Math.PI * 2) * moveAmount;

    // The playhead center X position
    const playheadX = 12 + offsetX;
    
    // Gap between playhead and bracket ends
    const gap = 4.8125; // Original gap from SVG (16.8125 - 12 = 4.8125)

    // Right bracket - extends from playhead to right edge
    const rightBracketStart = playheadX + gap;
    ctx.beginPath();
    ctx.moveTo(rightBracketStart, 9.02777);
    ctx.lineTo(21.625, 9.02777);
    ctx.quadraticCurveTo(23, 9.02777, 23, 10.4264);
    ctx.lineTo(23, 16.0208);
    ctx.quadraticCurveTo(23, 17.4194, 21.625, 17.4194);
    ctx.lineTo(rightBracketStart, 17.4194);
    ctx.stroke();

    // Left bracket - extends from left edge to playhead
    const leftBracketEnd = playheadX - gap;
    ctx.beginPath();
    ctx.moveTo(leftBracketEnd, 9.02777);
    ctx.lineTo(2.375, 9.02777);
    ctx.quadraticCurveTo(1, 9.02777, 1, 10.4264);
    ctx.lineTo(1, 16.0208);
    ctx.quadraticCurveTo(1, 17.4194, 2.375, 17.4194);
    ctx.lineTo(leftBracketEnd, 17.4194);
    ctx.stroke();

    // Draw the MOVING center playhead (handle + vertical line)
    ctx.save();
    ctx.translate(offsetX, 0);

    // Playhead vertical line
    ctx.beginPath();
    ctx.moveTo(12, 20.25);
    ctx.lineTo(12, 7.91667);
    ctx.stroke();

    // Handle shape (the top part)
    ctx.beginPath();
    ctx.moveTo(12, 7.91667);
    ctx.lineTo(9.46487, 5.17376);
    ctx.quadraticCurveTo(9.19922, 4.89, 9.19922, 4.495);
    ctx.lineTo(9.19922, 2.25);
    ctx.quadraticCurveTo(9.19922, 1.25, 10.1992, 1.25);
    ctx.lineTo(13.8011, 1.25);
    ctx.quadraticCurveTo(14.8011, 1.25, 14.8011, 2.25);
    ctx.lineTo(14.8011, 4.495);
    ctx.quadraticCurveTo(14.8011, 4.89, 14.5354, 5.17376);
    ctx.lineTo(12, 7.91667);
    ctx.stroke();

    ctx.restore();
    ctx.restore();
  },
};

export default animation;

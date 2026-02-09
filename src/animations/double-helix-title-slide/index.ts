import type { AnimationDefinition } from '../../runtime/types';
import { number, color, folder, select } from '../../runtime/params';

// Easing for smooth entrance
const easeOutCubic = (t: number): number => 1 - Math.pow(1 - t, 3);

interface DoubleHelixTitleSlideParams {
  scale: number;
  textColor: string;
  backgroundColor: string;
  speed: number;
  fontWeight: string;
}

const animation: AnimationDefinition<DoubleHelixTitleSlideParams> = {
  id: 'double-helix-title-slide',
  name: 'Double Helix Title Slide',
  fps: 60,
  durationMs: 2000,
  width: 500,
  height: 200,
  background: 'rgba(0,0,0,0)', // transparent

  params: {
    defaults: {
      scale: 1,
      textColor: '#000000',
      backgroundColor: 'rgba(0,0,0,0)',
      speed: 1,
      fontWeight: '700',
    },
    schema: {
      ...folder('Layout', {
        scale: number({ value: 1, min: 0.5, max: 2, step: 0.05, label: 'Scale' }),
      }),
      ...folder('Colors', {
        textColor: color({ value: '#000000', label: 'Text Color' }),
        backgroundColor: color({ value: 'rgba(0,0,0,0)', label: 'Background' }),
      }),
      ...folder('Animation', {
        speed: number({ value: 1, min: 0.5, max: 2, step: 0.05, label: 'Speed' }),
        fontWeight: select({ value: '700', options: ['400','500','600','700','800'], label: 'Font Weight' }),
      }),
    },
  },

  render({ ctx, progress, width, height, params }) {
    const {
      scale,
      textColor,
      backgroundColor,
      speed,
      fontWeight,
    } = params;

    // Clear background
    ctx.save();
    ctx.globalAlpha = 1;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    if (backgroundColor && backgroundColor !== 'rgba(0,0,0,0)') {
      ctx.fillStyle = backgroundColor;
      ctx.fillRect(0, 0, width, height);
    } else {
      ctx.clearRect(0, 0, width, height);
    }

    const text = 'Double Helix';
    const fontSize = 48 * scale;
    ctx.font = `${fontWeight} ${fontSize}px 'Inter', 'Helvetica Neue', Arial, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillStyle = textColor;
    
    // Animate Y position: from -fontSize*2 (well above the canvas), to targetY
    const entrance = Math.min(1, progress * speed);
    const eased = easeOutCubic(entrance);
    const targetY = 24 * scale; // Top margin
    const startY = -fontSize * 2;
    const y = startY + (targetY - startY) * eased;

    ctx.save();
    ctx.globalAlpha = eased;
    ctx.fillText(text, width/2, y);
    ctx.restore();
    ctx.restore();
  },
};

export default animation;

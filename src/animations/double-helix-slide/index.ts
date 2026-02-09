import type { AnimationDefinition } from '../../runtime/types';
import { number, color, folder, select } from '../../runtime/params';

const easeOutCubic = (t: number): number => 1 - Math.pow(1 - t, 3);

interface DoubleHelixSlideParams {
  scale: number;
  fontColor: string;
  backgroundColor: string;
  speed: number;
  fontWeight: string;
  fontFamily: string;
}

const animation: AnimationDefinition<DoubleHelixSlideParams> = {
  id: 'double-helix-slide',
  name: 'Double Helix Slide',
  fps: 60,
  durationMs: 2000,
  width: 800,
  height: 300,
  background: 'rgba(0,0,0,0)',
  params: {
    defaults: {
      scale: 1,
      fontColor: '#111111',
      backgroundColor: 'rgba(0,0,0,0)',
      speed: 1,
      fontWeight: '900',
      fontFamily: 'Inter, Arial, sans-serif',
    },
    schema: {
      ...folder('Layout', {
        scale: number({ value: 1, min: 0.5, max: 2, step: 0.05, label: 'Scale' }),
      }),
      ...folder('Colors', {
        fontColor: color({ value: '#111111', label: 'Font Color' }),
        backgroundColor: color({ value: 'rgba(0,0,0,0)', label: 'Background' }),
      }),
      ...folder('Animation', {
        speed: number({ value: 1, min: 0.1, max: 3, step: 0.05, label: 'Speed' }),
        fontWeight: select({ value: '900', options: ['900','700','600','bold','normal'], label: 'Font Weight' }),
        fontFamily: select({ value: 'Inter, Arial, sans-serif', options: ['Inter, Arial, sans-serif','Arial Black, Arial, sans-serif','Montserrat, Arial, sans-serif','sans-serif'], label: 'Font Family' }),
      }),
    },
  },

  render({ ctx, width, height, progress, params }) {
    const {
      scale,
      fontColor,
      backgroundColor,
      speed,
      fontWeight,
      fontFamily,
    } = params;

    // Clear background (transparent)
    ctx.clearRect(0, 0, width, height);
    if (backgroundColor && backgroundColor !== 'rgba(0,0,0,0)') {
      ctx.save();
      ctx.fillStyle = backgroundColor;
      ctx.fillRect(0, 0, width, height);
      ctx.restore();
    }

    // Animation progress (apply speed)
    const t = Math.min(1, progress * speed);
    const eased = easeOutCubic(t);

    // Text settings
    const text = 'Double Helix';
    const baseFontSize = 72; // px
    const fontSize = baseFontSize * scale;
    ctx.save();
    ctx.font = `${fontWeight} ${fontSize}px ${fontFamily}`;
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'left';
    const { width: textWidth } = ctx.measureText(text);
    const textHeight = fontSize * 1.1; // approx; canvas doesn't have ascent+descent reliably
    ctx.restore();

    // Start at left edge, centered vertically; end at center (canvas center minus half text width)
    const startX = 0;
    const endX = width / 2 - textWidth / 2;
    const y = height / 2;
    const x = startX + (endX - startX) * eased;

    // Draw the text
    ctx.save();
    ctx.font = `${fontWeight} ${fontSize}px ${fontFamily}`;
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'left';
    ctx.fillStyle = fontColor;
    // For subtle polish, slight shadow for contrast
    ctx.shadowColor = 'rgba(0,0,0,0.12)';
    ctx.shadowBlur = 8 * scale;
    ctx.fillText(text, x, y);
    ctx.restore();
  },
};

export default animation;

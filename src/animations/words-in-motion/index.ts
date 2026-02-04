import type { AnimationDefinition } from '../../runtime/types';
import { number, color, folder, select } from '../../runtime/params';

/**
 * Words in Motion - Kinetic Typography
 * Text follows an arc path with smooth animated movement
 * Letters stay upright for readability
 */

interface WordsInMotionParams {
  // Text
  text: string;
  fontSize: number;
  fontWeight: number;
  letterSpacing: number;
  // Path
  arcHeight: number;
  arcDirection: string;
  // Animation
  speed: number;
  flowDirection: string;
  // Colors
  textColor: string;
  backgroundColor: string;
  // Layout
  scale: number;
  verticalOffset: number;
}

// Easing functions
const easeInOutCubic = (t: number): number => 
  t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

// Arc path function - smooth curve that's high in the middle
const arcPath = (t: number, height: number, direction: string): number => {
  // t goes from 0 to 1 across the text
  // Create a smooth arc peaking at center
  const centered = t - 0.5; // -0.5 to 0.5
  const curve = 1 - (centered * centered * 4); // 0 at edges, 1 at center
  const smoothCurve = easeInOutCubic(Math.max(0, curve));
  
  // Direction: 'up' means text curves upward (smile), 'down' curves downward (frown)
  return direction === 'up' ? -smoothCurve * height : smoothCurve * height;
};

const animation: AnimationDefinition<WordsInMotionParams> = {
  id: 'words-in-motion',
  name: 'Words in Motion',
  fps: 60,
  durationMs: 4000,
  width: 800,
  height: 600,
  background: '#000000',

  params: {
    defaults: {
      text: 'Words in Motion',
      fontSize: 72,
      fontWeight: 700,
      letterSpacing: 22,
      arcHeight: 115,
      arcDirection: 'down',
      speed: 2,
      flowDirection: 'right',
      textColor: '#FFFFFF',
      backgroundColor: '#000000',
      scale: 0.3,
      verticalOffset: -10,
    },
    schema: {
      ...folder('Text', {
        text: { value: 'Words in Motion', label: 'Text' },
        fontSize: number({ value: 72, min: 12, max: 200, step: 2, label: 'Font Size' }),
        fontWeight: number({ value: 700, min: 100, max: 900, step: 100, label: 'Font Weight' }),
        letterSpacing: number({ value: 4, min: -10, max: 30, step: 1, label: 'Letter Spacing' }),
      }),
      ...folder('Path', {
        arcHeight: number({ value: 80, min: 0, max: 200, step: 5, label: 'Arc Height' }),
        arcDirection: select({
          value: 'up',
          options: ['up', 'down'],
          label: 'Arc Direction',
        }),
      }),
      ...folder('Animation', {
        speed: number({ value: 1, min: 0.1, max: 3, step: 0.1, label: 'Speed' }),
        flowDirection: select({
          value: 'right',
          options: ['right', 'left', 'none'],
          label: 'Flow Direction',
        }),
      }),
      ...folder('Colors', {
        textColor: color({ value: '#FFFFFF', label: 'Text Color' }),
        backgroundColor: color({ value: '#000000', label: 'Background' }),
      }),
      ...folder('Layout', {
        scale: number({ value: 1, min: 0.1, max: 3, step: 0.1, label: 'Scale' }),
        verticalOffset: number({ value: 0, min: -200, max: 200, step: 10, label: 'Vertical Offset' }),
      }),
    },
  },

  render({ ctx, progress, width, height, params }) {
    const {
      text,
      fontSize,
      fontWeight,
      letterSpacing,
      arcHeight,
      arcDirection,
      speed,
      flowDirection,
      textColor,
      backgroundColor,
      scale,
      verticalOffset,
    } = params;

    // Clear background
    ctx.fillStyle = backgroundColor;
    ctx.fillRect(0, 0, width, height);

    // Calculate animation progress with looping
    const animatedProgress = (progress * speed) % 1;
    
    // Flow offset creates the "scrolling" effect
    let flowOffset = 0;
    if (flowDirection === 'right') {
      flowOffset = animatedProgress;
    } else if (flowDirection === 'left') {
      flowOffset = -animatedProgress;
    }

    // Setup text properties
    const scaledFontSize = fontSize * scale;
    ctx.font = `${fontWeight} ${scaledFontSize}px "Inter", "SF Pro Display", -apple-system, BlinkMacSystemFont, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = textColor;

    // Measure each character
    const characters = text.split('');
    const charWidths: number[] = [];
    let totalWidth = 0;

    characters.forEach((char, i) => {
      const charWidth = ctx.measureText(char).width;
      charWidths.push(charWidth);
      totalWidth += charWidth + (i < characters.length - 1 ? letterSpacing * scale : 0);
    });

    // Center the text on canvas
    ctx.save();
    ctx.translate(width / 2, height / 2 + verticalOffset);

    // Draw each character along the arc
    let currentX = -totalWidth / 2;

    characters.forEach((char, i) => {
      const charWidth = charWidths[i];
      const charCenterX = currentX + charWidth / 2;

      // Normalize position to 0-1 range for arc calculation
      const normalizedX = (charCenterX + totalWidth / 2) / totalWidth;
      
      // Apply flow animation - shifts which part of the arc each character sits on
      // This creates the "text flowing along path" effect
      let arcPosition = normalizedX + flowOffset;
      
      // Keep arc position in valid range with smooth wrapping
      arcPosition = ((arcPosition % 1) + 1) % 1;

      // Get Y position from arc
      const arcY = arcPath(arcPosition, arcHeight * scale, arcDirection);

      // Draw character (no rotation - stays upright for readability)
      ctx.save();
      ctx.translate(charCenterX, arcY);
      ctx.fillText(char, 0, 0);
      ctx.restore();

      // Move to next character position
      currentX += charWidth + letterSpacing * scale;
    });

    ctx.restore();
  },
};

export default animation;

import type { AnimationDefinition } from '../../runtime/types';
import { number, color, string, boolean, select, folder } from '../../runtime/params';

/**
 * Underline Draw Accent
 * An underline draws in beneath a word with a slight bounce overshoot settle.
 * Great for emphasizing key words in motion graphics.
 */

interface UnderlineDrawAccentParams {
  // Layout
  scale: number;
  // Text
  content: string;
  fontFamily: string;
  fontSize: number;
  fontWeight: string;
  // Underline
  lineThickness: number;
  lineGap: number;
  lineOvershoot: number;
  linePadding: number;
  lineRoundCap: boolean;
  drawDirection: string;
  // Colors
  textColor: string;
  underlineColor: string;
  backgroundColor: string;
  // Animation
  speed: number;
  bounceIntensity: number;
  textFadeIn: boolean;
  textSlideDistance: number;
}

// Font family lookup
const fontMap: Record<string, string> = {
  'Inter': 'Inter, sans-serif',
  'SF Pro': '"SF Pro Display", "SF Pro", -apple-system, BlinkMacSystemFont, sans-serif',
  'Helvetica': '"Helvetica Neue", Helvetica, Arial, sans-serif',
  'Georgia': 'Georgia, "Times New Roman", serif',
  'Courier': '"Courier New", Courier, monospace',
  'Arial': 'Arial, Helvetica, sans-serif',
  'Avenir': '"Avenir Next", Avenir, "Helvetica Neue", sans-serif',
  'Times': '"Times New Roman", Times, Georgia, serif',
  'System': '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
};

// --- Easing helpers ---

/** Quintic ease-out for smooth text entrance */
const easeOutQuint = (t: number): number => 1 - Math.pow(1 - t, 5);

/**
 * Attempt-based elastic/spring easing that overshoots then settles.
 * intensity controls how far it overshoots (0 = no overshoot, 1 = heavy).
 */
function easeOutBounceSettle(t: number, intensity: number): number {
  if (t <= 0) return 0;
  if (t >= 1) return 1;

  // Spring-like oscillation that decays
  const decay = Math.exp(-6 * t);
  const oscillation = Math.sin(t * Math.PI * 2.5);
  const overshoot = decay * oscillation * intensity * 0.35;

  // Base ease-out for the main motion
  const base = 1 - Math.pow(1 - t, 3);

  return base + overshoot;
}

const animation: AnimationDefinition<UnderlineDrawAccentParams> = {
  id: 'underline-draw-accent',
  name: 'Underline Draw Accent',
  fps: 60,
  durationMs: 2500,
  width: 1920,
  height: 1080,
  background: '#0A0A0A',

  params: {
    defaults: {
      scale: 0.6,
      content: 'Emphasize',
      fontSize: 120,
      fontWeight: '600',
      lineThickness: 4.5,
      lineGap: 11,
      lineOvershoot: 0,
      linePadding: 0,
      lineRoundCap: true,
      drawDirection: 'center-out',
      textColor: '#474747',
      underlineColor: '#8a8a8a',
      backgroundColor: '#c7c7c7',
      speed: 1,
      bounceIntensity: 0.6,
      textFadeIn: true,
      textSlideDistance: 32,
      fontFamily: 'Helvetica',
    },
    schema: {
      ...folder('Layout', {
        scale: number({ value: 1, min: 0.1, max: 3, step: 0.1, label: 'Scale' }),
      }),
      ...folder('Text', {
        content: string({ value: 'Emphasize', label: 'Text' }),
        fontFamily: select({
          value: 'Inter',
          options: [
            'Inter',
            'SF Pro',
            'Helvetica',
            'Arial',
            'Avenir',
            'Georgia',
            'Times',
            'Courier',
            'System',
          ],
          label: 'Font',
        }),
        fontSize: number({ value: 120, min: 24, max: 300, step: 2, label: 'Font Size' }),
        fontWeight: select({
          value: '600',
          options: [
            { value: '300', label: 'Light' },
            { value: '400', label: 'Regular' },
            { value: '500', label: 'Medium' },
            { value: '600', label: 'Semi Bold' },
            { value: '700', label: 'Bold' },
            { value: '800', label: 'Extra Bold' },
          ],
          label: 'Font Weight',
        }),
      }),
      ...folder('Underline', {
        lineThickness: number({ value: 6, min: 1, max: 20, step: 0.5, label: 'Thickness' }),
        lineGap: number({ value: 16, min: 0, max: 60, step: 1, label: 'Gap Below Text' }),
        lineOvershoot: number({ value: 24, min: 0, max: 80, step: 2, label: 'Overshoot Width' }),
        linePadding: number({ value: 12, min: 0, max: 60, step: 2, label: 'Side Padding' }),
        lineRoundCap: boolean({ value: true, label: 'Round Caps' }),
        drawDirection: select({
          value: 'left-to-right',
          options: [
            { value: 'left-to-right', label: 'Left → Right' },
            { value: 'right-to-left', label: 'Right → Left' },
            { value: 'center-out', label: 'Center → Out' },
          ],
          label: 'Draw Direction',
        }),
      }),
      ...folder('Colors', {
        textColor: color({ value: '#FFFFFF', label: 'Text Color' }),
        underlineColor: color({ value: '#FFFFFF', label: 'Underline Color' }),
        backgroundColor: color({ value: '#0A0A0A', label: 'Background' }),
      }),
      ...folder('Animation', {
        speed: number({ value: 1, min: 0.2, max: 3, step: 0.1, label: 'Speed' }),
        bounceIntensity: number({ value: 0.6, min: 0, max: 1.5, step: 0.05, label: 'Bounce Intensity' }),
        textFadeIn: boolean({ value: true, label: 'Text Fade In' }),
        textSlideDistance: number({ value: 20, min: 0, max: 60, step: 2, label: 'Text Slide Distance' }),
      }),
    },
  },

  render({ ctx, width, height, progress, params }) {
    const {
      scale,
      content,
      fontFamily,
      fontSize,
      fontWeight,
      lineThickness,
      lineGap,
      lineOvershoot,
      linePadding,
      lineRoundCap,
      drawDirection,
      textColor,
      underlineColor,
      backgroundColor,
      speed,
      bounceIntensity,
      textFadeIn,
      textSlideDistance,
    } = params;

    const adjustedProgress = Math.min(1, progress * speed);

    // --- Background ---
    ctx.fillStyle = backgroundColor;
    ctx.fillRect(0, 0, width, height);

    ctx.save();
    ctx.translate(width / 2, height / 2);
    ctx.scale(scale, scale);

    // --- Set up font ---
    const resolvedFont = fontMap[fontFamily] || fontMap['Inter'];
    ctx.font = `${fontWeight} ${fontSize}px ${resolvedFont}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'alphabetic';

    // --- Measure text ---
    const metrics = ctx.measureText(content);
    const textWidth = metrics.width;

    // Text vertical center: shift up by half the cap-height approximation
    const capHeight = fontSize * 0.72;
    const textY = capHeight / 2;

    // --- Timeline ---
    // Phase 1: Text fades/slides in (0 → 0.35)
    // Phase 2: Underline draws with bounce (0.2 → 0.75)
    // Phase 3: Hold (0.75 → 1.0)

    const textEnterStart = 0;
    const textEnterEnd = 0.35;
    const lineDrawStart = 0.2;
    const lineDrawEnd = 0.75;

    // --- Text rendering ---
    const textT = Math.max(0, Math.min(1, (adjustedProgress - textEnterStart) / (textEnterEnd - textEnterStart)));
    const textEased = easeOutQuint(textT);

    ctx.save();

    if (textFadeIn) {
      ctx.globalAlpha = textEased;
      const slideOffset = (1 - textEased) * textSlideDistance;
      ctx.translate(0, slideOffset);
    }

    ctx.fillStyle = textColor;
    ctx.fillText(content, 0, textY);
    ctx.restore();

    // --- Underline rendering ---
    const lineT = Math.max(0, Math.min(1, (adjustedProgress - lineDrawStart) / (lineDrawEnd - lineDrawStart)));

    if (lineT > 0) {
      // Apply bounce settle easing
      const lineProgress = easeOutBounceSettle(lineT, bounceIntensity);

      // Full underline dimensions
      const fullLineHalfWidth = textWidth / 2 + linePadding;
      // Add overshoot — the bounce can extend a bit beyond the target
      const maxLineHalfWidth = fullLineHalfWidth + lineOvershoot * bounceIntensity * 0.2;
      const lineY = textY + lineGap + lineThickness / 2;

      // Current draw width
      const currentHalfWidth = Math.max(0, fullLineHalfWidth * lineProgress);
      // Clamp so it doesn't go wildly past the overshoot boundary
      const clampedHalfWidth = Math.min(currentHalfWidth, maxLineHalfWidth);

      ctx.save();
      ctx.strokeStyle = underlineColor;
      ctx.lineWidth = lineThickness;
      ctx.lineCap = lineRoundCap ? 'round' : 'butt';

      // Fade in the line quickly at the very start of draw
      const lineAlpha = Math.min(1, lineT * 8);
      ctx.globalAlpha = lineAlpha;

      ctx.beginPath();

      if (drawDirection === 'left-to-right') {
        const startX = -fullLineHalfWidth;
        const endX = startX + clampedHalfWidth * 2;
        ctx.moveTo(startX, lineY);
        ctx.lineTo(endX, lineY);
      } else if (drawDirection === 'right-to-left') {
        const startX = fullLineHalfWidth;
        const endX = startX - clampedHalfWidth * 2;
        ctx.moveTo(startX, lineY);
        ctx.lineTo(endX, lineY);
      } else {
        // center-out
        ctx.moveTo(-clampedHalfWidth, lineY);
        ctx.lineTo(clampedHalfWidth, lineY);
      }

      ctx.stroke();
      ctx.restore();
    }

    ctx.restore();
  },
};

export default animation;

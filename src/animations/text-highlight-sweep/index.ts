import type { AnimationDefinition } from '../../runtime/types';
import { number, color, select, folder, string } from '../../runtime/params';

interface TextHighlightSweepParams {
  // Layout
  scale: number;
  // Text
  content: string;
  fontFamily: string;
  fontSize: number;
  fontWeight: string;
  letterSpacing: number;
  // Colors
  textColor: string;
  highlightColor: string;
  backgroundColor: string;
  // Animation
  speed: number;
  sweepWidth: number;
  glowStrength: number;
  direction: 'left-to-right' | 'right-to-left';
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

const easeInOutCubic = (t: number) =>
  t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

const animation: AnimationDefinition<TextHighlightSweepParams> = {
  id: 'text-highlight-sweep',
  name: 'Text Highlight Sweep',
  fps: 60,
  durationMs: 3000,
  width: 1920,
  height: 1080,
  background: '#0A0A0A',

  params: {
    defaults: {
      scale: 0.5,
      content: 'Highlight',
      fontFamily: 'Inter, system-ui, sans-serif',
      fontSize: 160,
      fontWeight: '400',
      letterSpacing: 0.5,
      textColor: '#333333',
      highlightColor: '#FFFFFF',
      backgroundColor: '#0A0A0A',
      speed: 1,
      sweepWidth: 0.36,
      glowStrength: 0.6,
      direction: 'left-to-right',
    },
    schema: {
      ...folder('Layout', {
        scale: number({ value: 1, min: 0.1, max: 3, step: 0.1, label: 'Scale' }),
      }),
      ...folder('Text', {
        content: string({ value: 'Highlight', label: 'Text' }),
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
        fontSize: number({ value: 160, min: 24, max: 400, step: 1, label: 'Font Size' }),
        fontWeight: select({
          value: '700',
          options: [
            { value: '400', label: 'Normal' },
            { value: '500', label: 'Medium' },
            { value: '600', label: 'Semi Bold' },
            { value: '700', label: 'Bold' },
            { value: '800', label: 'Extra Bold' },
            { value: '900', label: 'Black' },
          ],
          label: 'Font Weight',
        }),
        letterSpacing: number({ value: -2, min: -10, max: 20, step: 0.5, label: 'Letter Spacing' }),
      }),
      ...folder('Colors', {
        textColor: color({ value: '#333333', label: 'Base Text Color' }),
        highlightColor: color({ value: '#FFFFFF', label: 'Highlight Color' }),
        backgroundColor: color({ value: '#0A0A0A', label: 'Background' }),
      }),
      ...folder('Animation', {
        speed: number({ value: 1, min: 0.1, max: 3, step: 0.1, label: 'Speed' }),
        sweepWidth: number({ value: 0.25, min: 0.05, max: 0.8, step: 0.01, label: 'Sweep Width' }),
        glowStrength: number({ value: 0.6, min: 0, max: 1, step: 0.05, label: 'Glow Strength' }),
        direction: select({
          value: 'left-to-right',
          options: [
            { value: 'left-to-right', label: 'Left → Right' },
            { value: 'right-to-left', label: 'Right → Left' },
          ],
          label: 'Direction',
        }),
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
      letterSpacing,
      textColor,
      highlightColor,
      backgroundColor,
      speed,
      sweepWidth,
      glowStrength,
      direction,
    } = params;

    // Speed-adjusted progress with easing
    const rawProgress = (progress * speed) % 1;
    const sweepProgress = easeInOutCubic(rawProgress);

    // Clear background
    ctx.fillStyle = backgroundColor;
    ctx.fillRect(0, 0, width, height);

    // Set up font
    const resolvedFont = fontMap[fontFamily] || fontMap['Inter'];
    const font = `${fontWeight} ${fontSize}px ${resolvedFont}`;

    // Measure text to know bounds
    ctx.font = font;
    if (letterSpacing !== 0) {
      ctx.letterSpacing = `${letterSpacing}px`;
    }
    const metrics = ctx.measureText(content);
    const textWidth = metrics.width;

    // Create offscreen canvas for text compositing
    const textCanvas = document.createElement('canvas');
    textCanvas.width = width;
    textCanvas.height = height;
    const tCtx = textCanvas.getContext('2d')!;

    // Position: center of canvas
    const cx = width / 2;
    const cy = height / 2;

    // --- Layer 1: Base dim text ---
    tCtx.save();
    tCtx.translate(cx, cy);
    tCtx.scale(scale, scale);
    tCtx.font = font;
    if (letterSpacing !== 0) {
      tCtx.letterSpacing = `${letterSpacing}px`;
    }
    tCtx.textAlign = 'center';
    tCtx.textBaseline = 'middle';
    tCtx.fillStyle = textColor;
    tCtx.fillText(content, 0, 0);
    tCtx.restore();

    // --- Layer 2: Highlighted text masked by sweep gradient ---
    const highlightCanvas = document.createElement('canvas');
    highlightCanvas.width = width;
    highlightCanvas.height = height;
    const hCtx = highlightCanvas.getContext('2d')!;

    // Draw highlight-colored text
    hCtx.save();
    hCtx.translate(cx, cy);
    hCtx.scale(scale, scale);
    hCtx.font = font;
    if (letterSpacing !== 0) {
      hCtx.letterSpacing = `${letterSpacing}px`;
    }
    hCtx.textAlign = 'center';
    hCtx.textBaseline = 'middle';
    hCtx.fillStyle = highlightColor;
    hCtx.fillText(content, 0, 0);
    hCtx.restore();

    // Create the sweep mask using destination-in
    // The sweep is a vertical gradient band that moves horizontally
    const halfText = (textWidth * scale) / 2;
    const sweepSpan = textWidth * scale + fontSize * scale; // extra padding for sweep to fully enter/exit
    const bandWidth = sweepWidth * sweepSpan;

    // Sweep center position (from left edge - band to right edge + band)
    let sweepCenter: number;
    if (direction === 'left-to-right') {
      sweepCenter = cx - halfText - bandWidth + sweepProgress * (sweepSpan + bandWidth);
    } else {
      sweepCenter = cx + halfText + bandWidth - sweepProgress * (sweepSpan + bandWidth);
    }

    const bandLeft = sweepCenter - bandWidth / 2;
    const bandRight = sweepCenter + bandWidth / 2;

    // Create gradient for the sweep band
    const sweepGrad = hCtx.createLinearGradient(bandLeft, 0, bandRight, 0);
    sweepGrad.addColorStop(0, 'rgba(255,255,255,0)');
    sweepGrad.addColorStop(0.3, 'rgba(255,255,255,1)');
    sweepGrad.addColorStop(0.5, 'rgba(255,255,255,1)');
    sweepGrad.addColorStop(0.7, 'rgba(255,255,255,1)');
    sweepGrad.addColorStop(1, 'rgba(255,255,255,0)');

    hCtx.globalCompositeOperation = 'destination-in';
    hCtx.fillStyle = sweepGrad;
    hCtx.fillRect(0, 0, width, height);

    // --- Layer 3: Glow effect behind the sweep ---
    if (glowStrength > 0) {
      const glowCanvas = document.createElement('canvas');
      glowCanvas.width = width;
      glowCanvas.height = height;
      const gCtx = glowCanvas.getContext('2d')!;

      // Draw glowing text at sweep position
      gCtx.save();
      gCtx.translate(cx, cy);
      gCtx.scale(scale, scale);
      gCtx.font = font;
      if (letterSpacing !== 0) {
        gCtx.letterSpacing = `${letterSpacing}px`;
      }
      gCtx.textAlign = 'center';
      gCtx.textBaseline = 'middle';

      // Multiple glow passes for a soft bloom
      const glowSize = fontSize * 0.3 * glowStrength;
      gCtx.shadowColor = highlightColor;
      gCtx.shadowBlur = glowSize;
      gCtx.fillStyle = highlightColor;
      gCtx.globalAlpha = glowStrength * 0.5;
      gCtx.fillText(content, 0, 0);
      // Second pass for stronger glow core
      gCtx.shadowBlur = glowSize * 0.5;
      gCtx.globalAlpha = glowStrength * 0.3;
      gCtx.fillText(content, 0, 0);
      gCtx.restore();

      // Mask glow to the sweep band (wider than highlight for soft spread)
      const glowBandWidth = bandWidth * 1.8;
      const glowLeft = sweepCenter - glowBandWidth / 2;
      const glowRight = sweepCenter + glowBandWidth / 2;

      const glowGrad = gCtx.createLinearGradient(glowLeft, 0, glowRight, 0);
      glowGrad.addColorStop(0, 'rgba(255,255,255,0)');
      glowGrad.addColorStop(0.2, 'rgba(255,255,255,0.6)');
      glowGrad.addColorStop(0.5, 'rgba(255,255,255,1)');
      glowGrad.addColorStop(0.8, 'rgba(255,255,255,0.6)');
      glowGrad.addColorStop(1, 'rgba(255,255,255,0)');

      gCtx.globalCompositeOperation = 'destination-in';
      gCtx.fillStyle = glowGrad;
      gCtx.fillRect(0, 0, width, height);

      // Composite glow onto base text canvas
      tCtx.drawImage(glowCanvas, 0, 0);
    }

    // Composite highlight on top of base text
    tCtx.drawImage(highlightCanvas, 0, 0);

    // Draw final composited result to main canvas
    ctx.drawImage(textCanvas, 0, 0);
  },
};

export default animation;

import type { AnimationDefinition } from '../../runtime/types';
import { number, color, text, select, folder } from '../../runtime/params';

interface TypeRevealParams {
  // Layout
  scale: number;
  // Text
  content: string;
  fontSize: number;
  fontWeight: string;
  lineHeight: number;
  letterSpacing: number;
  // Colors
  textColor: string;
  backgroundColor: string;
  // Animation
  speed: number;
  revealMode: 'word' | 'line' | 'character';
  stagger: number;
  maskSoftness: number;
  glowIntensity: number;
}

const animation: AnimationDefinition<TypeRevealParams> = {
  id: 'type-reveal',
  name: 'Type Reveal',
  fps: 60,
  durationMs: 4000,
  width: 1920,
  height: 1080,
  background: '#000000',

  params: {
    defaults: {
      scale: 0.9,
      content: 'Premium Text\nRevealed Beautifully',
      fontSize: 45,
      fontWeight: '700',
      lineHeight: 1.2,
      letterSpacing: 0,
      textColor: '#FFFFFF',
      backgroundColor: '#000000',
      speed: 1,
      revealMode: 'line',
      stagger: 0.15,
      maskSoftness: 80,
      glowIntensity: 0.3,
    },
    schema: {
      ...folder('Layout', {
        scale: number({ value: 1, min: 0.1, max: 3, step: 0.1, label: 'Scale' }),
      }),
      ...folder('Text', {
        content: text({ value: 'Premium Text\nRevealed Beautifully', label: 'Text Content', multiline: true }),
        fontSize: number({ value: 72, min: 12, max: 200, step: 1, label: 'Font Size' }),
        fontWeight: select({
          value: '700',
          options: [
            { value: '400', label: 'Normal' },
            { value: '500', label: 'Medium' },
            { value: '600', label: 'Semi Bold' },
            { value: '700', label: 'Bold' },
            { value: '800', label: 'Extra Bold' },
          ],
          label: 'Font Weight',
        }),
        lineHeight: number({ value: 1.2, min: 0.8, max: 2, step: 0.1, label: 'Line Height' }),
        letterSpacing: number({ value: 0, min: -10, max: 20, step: 0.5, label: 'Letter Spacing' }),
      }),
      ...folder('Colors', {
        textColor: color({ value: '#FFFFFF', label: 'Text Color' }),
        backgroundColor: color({ value: '#000000', label: 'Background' }),
      }),
      ...folder('Animation', {
        speed: number({ value: 1, min: 0.1, max: 3, step: 0.1, label: 'Speed' }),
        revealMode: select({
          value: 'word',
          options: [
            { value: 'word', label: 'Word by Word' },
            { value: 'line', label: 'Line by Line' },
            { value: 'character', label: 'Character by Character' },
          ],
          label: 'Reveal Mode',
        }),
        stagger: number({ value: 0.15, min: 0, max: 1, step: 0.05, label: 'Stagger Delay' }),
        maskSoftness: number({ value: 80, min: 10, max: 200, step: 5, label: 'Mask Softness' }),
        glowIntensity: number({ value: 0.3, min: 0, max: 1, step: 0.05, label: 'Glow Intensity' }),
      }),
    },
  },

  render({ ctx, width, height, progress, params }) {
    const {
      scale,
      content,
      fontSize,
      fontWeight,
      lineHeight,
      letterSpacing,
      textColor,
      backgroundColor,
      speed,
      revealMode,
      stagger,
      maskSoftness,
      glowIntensity,
    } = params;

    // Adjust progress with speed
    const adjustedProgress = Math.min(1, progress * speed);

    // Clear background
    ctx.fillStyle = backgroundColor;
    ctx.fillRect(0, 0, width, height);

    ctx.save();
    ctx.translate(width / 2, height / 2);
    ctx.scale(scale, scale);

    // Set up text style
    ctx.font = `${fontWeight} ${fontSize}px Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // Parse content into chunks based on reveal mode
    const lines = content.split('\n');
    const chunks: { text: string; x: number; y: number; index: number }[] = [];
    let globalIndex = 0;

    lines.forEach((line, lineIndex) => {
      const lineY = (lineIndex - (lines.length - 1) / 2) * fontSize * lineHeight;

      if (revealMode === 'line') {
        chunks.push({ text: line, x: 0, y: lineY, index: globalIndex++ });
      } else if (revealMode === 'word') {
        const words = line.split(' ');
        const lineWidth = ctx.measureText(line).width;
        let currentX = -lineWidth / 2;

        words.forEach((word, wordIndex) => {
          const wordWithSpace = wordIndex < words.length - 1 ? word + ' ' : word;
          const wordWidth = ctx.measureText(wordWithSpace).width;
          const wordX = currentX + wordWidth / 2;
          chunks.push({ text: wordWithSpace, x: wordX, y: lineY, index: globalIndex++ });
          currentX += wordWidth;
        });
      } else {
        // character mode
        const lineWidth = ctx.measureText(line).width;
        let currentX = -lineWidth / 2;

        for (let i = 0; i < line.length; i++) {
          const char = line[i];
          const charWidth = ctx.measureText(char).width;
          const charX = currentX + charWidth / 2;
          chunks.push({ text: char, x: charX, y: lineY, index: globalIndex++ });
          currentX += charWidth;
        }
      }
    });

    // Easing functions
    const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);
    const easeInOutQuart = (t: number) =>
      t < 0.5 ? 8 * t * t * t * t : 1 - Math.pow(-2 * t + 2, 4) / 2;

    // Render each chunk with masked reveal
    chunks.forEach((chunk) => {
      const chunkDelay = chunk.index * stagger;
      const chunkProgress = Math.max(0, Math.min(1, (adjustedProgress - chunkDelay) / (1 - stagger * chunks.length + stagger)));
      
      if (chunkProgress <= 0) return;

      const revealProgress = easeOutCubic(chunkProgress);
      const scaleProgress = easeInOutQuart(chunkProgress);

      ctx.save();
      ctx.translate(chunk.x, chunk.y);

      // Apply letter spacing
      if (letterSpacing !== 0) {
        const charSpacing = letterSpacing / chunk.text.length;
        ctx.letterSpacing = `${charSpacing}px`;
      }

      // Create gradient mask for soft reveal
      const metrics = ctx.measureText(chunk.text);
      const textWidth = metrics.width;
      const textHeight = fontSize;

      // Create a temporary canvas for masking
      const maskCanvas = document.createElement('canvas');
      const maskCtx = maskCanvas.getContext('2d')!;
      maskCanvas.width = textWidth + maskSoftness * 2;
      maskCanvas.height = textHeight + maskSoftness * 2;

      const offsetX = maskSoftness;
      const offsetY = maskSoftness + fontSize / 2;

      // Draw text on mask canvas
      maskCtx.font = ctx.font;
      maskCtx.textAlign = 'center';
      maskCtx.textBaseline = 'middle';
      maskCtx.fillStyle = textColor;
      maskCtx.fillText(chunk.text, maskCanvas.width / 2, maskCanvas.height / 2);

      // Apply glow effect if enabled
      if (glowIntensity > 0 && revealProgress < 0.95) {
        const glowSize = maskSoftness * 0.3 * glowIntensity;
        const glowAlpha = (1 - revealProgress) * glowIntensity;
        maskCtx.shadowColor = textColor;
        maskCtx.shadowBlur = glowSize;
        maskCtx.globalAlpha = glowAlpha;
        maskCtx.fillText(chunk.text, maskCanvas.width / 2, maskCanvas.height / 2);
        maskCtx.globalAlpha = 1;
      }

      // Create gradient overlay for soft reveal
      const gradient = maskCtx.createLinearGradient(
        0,
        0,
        maskCanvas.width * revealProgress,
        0
      );

      const softEdge = maskSoftness / maskCanvas.width;
      const revealEdge = Math.max(0, Math.min(1, revealProgress - softEdge));

      gradient.addColorStop(0, `rgba(255, 255, 255, 1)`);
      if (revealEdge > 0) {
        gradient.addColorStop(revealEdge, `rgba(255, 255, 255, 1)`);
      }
      gradient.addColorStop(Math.min(1, revealProgress), `rgba(255, 255, 255, 0)`);
      if (revealProgress < 1) {
        gradient.addColorStop(Math.min(1, revealProgress + 0.01), `rgba(255, 255, 255, 0)`);
      }

      maskCtx.globalCompositeOperation = 'destination-in';
      maskCtx.fillStyle = gradient;
      maskCtx.fillRect(0, 0, maskCanvas.width, maskCanvas.height);

      // Apply scale animation
      const currentScale = 0.95 + 0.05 * scaleProgress;
      ctx.scale(currentScale, currentScale);

      // Apply opacity fade-in
      ctx.globalAlpha = revealProgress;

      // Draw the masked text
      ctx.drawImage(
        maskCanvas,
        -maskCanvas.width / 2,
        -maskCanvas.height / 2
      );

      ctx.restore();
    });

    ctx.restore();
  },
};

export default animation;

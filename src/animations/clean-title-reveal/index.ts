import type { AnimationDefinition } from '../../runtime/types';
import { number, color, string, select, folder } from '../../runtime/params';

interface CleanTitleRevealParams {
  // Layout
  scale: number;
  // Text
  content: string;
  fontFamily: string;
  fontSize: number;
  fontWeight: string;
  lineHeight: number;
  letterSpacing: number;
  // Colors
  textColor: string;
  backgroundColor: string;
  // Animation
  speed: number;
  direction: string;
  staggerMode: string;
  stagger: number;
  blurAmount: number;
  slideDistance: number;
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

// Easing: smooth deceleration
const easeOutCubic = (t: number): number => 1 - Math.pow(1 - t, 3);
const easeOutQuart = (t: number): number => 1 - Math.pow(1 - t, 4);

const animation: AnimationDefinition<CleanTitleRevealParams> = {
  id: 'clean-title-reveal',
  name: 'Clean Title Reveal',
  fps: 60,
  durationMs: 3000,
  width: 1920,
  height: 1080,
  background: '#0F0F0F',

  params: {
    defaults: {
      scale: 1,
      content: 'Reveal this title',
      fontFamily: 'Inter',
      fontSize: 65,
      fontWeight: '600',
      lineHeight: 1.15,
      letterSpacing: -1,
      textColor: '#fdb4b4',
      backgroundColor: '#932525',
      speed: 1,
      direction: 'up',
      staggerMode: 'words',
      stagger: 0.08,
      blurAmount: 12,
      slideDistance: 40,
    },
    schema: {
      ...folder('Layout', {
        scale: number({ value: 1, min: 0.1, max: 3, step: 0.1, label: 'Scale' }),
      }),
      ...folder('Text', {
        content: string({ value: 'Clean Title\nReveal', label: 'Text Content' }),
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
        fontSize: number({ value: 96, min: 16, max: 300, step: 1, label: 'Font Size' }),
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
        lineHeight: number({ value: 1.15, min: 0.8, max: 2.5, step: 0.05, label: 'Line Height' }),
        letterSpacing: number({ value: -1, min: -10, max: 20, step: 0.5, label: 'Letter Spacing' }),
      }),
      ...folder('Colors', {
        textColor: color({ value: '#FFFFFF', label: 'Text Color' }),
        backgroundColor: color({ value: '#0F0F0F', label: 'Background' }),
      }),
      ...folder('Animation', {
        speed: number({ value: 1, min: 0.3, max: 3, step: 0.1, label: 'Speed' }),
        direction: select({
          value: 'up',
          options: [
            { value: 'up', label: 'From Below (↑)' },
            { value: 'down', label: 'From Above (↓)' },
          ],
          label: 'Direction',
        }),
        staggerMode: select({
          value: 'words',
          options: [
            { value: 'none', label: 'No Stagger' },
            { value: 'words', label: 'Words' },
            { value: 'letters', label: 'Letters' },
          ],
          label: 'Stagger Mode',
        }),
        stagger: number({ value: 0.08, min: 0, max: 0.5, step: 0.01, label: 'Stagger Delay' }),
        blurAmount: number({ value: 12, min: 0, max: 30, step: 1, label: 'Blur Amount' }),
        slideDistance: number({ value: 40, min: 0, max: 200, step: 5, label: 'Slide Distance' }),
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
      lineHeight,
      letterSpacing,
      textColor,
      backgroundColor,
      speed,
      direction,
      staggerMode,
      stagger,
      blurAmount,
      slideDistance,
    } = params;

    // Speed-adjusted progress
    const adjustedProgress = Math.min(1, progress * speed);

    // Clear background
    ctx.fillStyle = backgroundColor;
    ctx.fillRect(0, 0, width, height);

    ctx.save();
    ctx.translate(width / 2, height / 2);
    ctx.scale(scale, scale);

    // Font setup
    const resolvedFont = fontMap[fontFamily] || fontMap['Inter'];
    const font = `${fontWeight} ${fontSize}px ${resolvedFont}`;
    ctx.font = font;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // Slide sign: "up" means text comes from below (positive Y offset → 0)
    const slideSign = direction === 'up' ? 1 : -1;

    // Parse content into lines
    const lines = content.split('\n');
    const totalTextHeight = lines.length * fontSize * lineHeight;
    const startY = -totalTextHeight / 2 + (fontSize * lineHeight) / 2;

    // Build chunks based on stagger mode
    interface Chunk {
      text: string;
      x: number;
      y: number;
      index: number;
      align: CanvasTextAlign;
    }
    const chunks: Chunk[] = [];
    let globalIndex = 0;

    lines.forEach((line, lineIndex) => {
      const lineY = startY + lineIndex * fontSize * lineHeight;

      if (staggerMode === 'none' || staggerMode === 'words') {
        if (staggerMode === 'none') {
          // Whole line as one chunk
          chunks.push({ text: line, x: 0, y: lineY, index: globalIndex++, align: 'center' });
        } else {
          // Word by word
          const words = line.split(/(\s+)/); // preserve spaces
          // Measure full line to compute word positions
          ctx.font = font;
          if (letterSpacing !== 0) {
            (ctx as any).letterSpacing = `${letterSpacing}px`;
          }
          const fullLineWidth = ctx.measureText(line).width;
          let cursorX = -fullLineWidth / 2;

          words.forEach((word) => {
            if (word.trim() === '') {
              // It's whitespace – just advance cursor
              cursorX += ctx.measureText(word).width;
              return;
            }
            const wordWidth = ctx.measureText(word).width;
            chunks.push({
              text: word,
              x: cursorX + wordWidth / 2,
              y: lineY,
              index: globalIndex++,
              align: 'center',
            });
            cursorX += wordWidth;
          });
        }
      } else {
        // Letter by letter
        ctx.font = font;
        if (letterSpacing !== 0) {
          (ctx as any).letterSpacing = `${letterSpacing}px`;
        }
        const fullLineWidth = ctx.measureText(line).width;
        let cursorX = -fullLineWidth / 2;

        for (let i = 0; i < line.length; i++) {
          const ch = line[i];
          if (ch === ' ') {
            cursorX += ctx.measureText(' ').width;
            continue;
          }
          const chWidth = ctx.measureText(ch).width;
          chunks.push({
            text: ch,
            x: cursorX + chWidth / 2,
            y: lineY,
            index: globalIndex++,
            align: 'center',
          });
          cursorX += chWidth;
        }
      }
    });

    // Total stagger span: the last chunk finishes at progress=1
    const totalChunks = chunks.length;
    const staggerSpan = totalChunks > 1 ? stagger * (totalChunks - 1) : 0;
    // Each chunk animates over a window of (1 - staggerSpan), clamped to min 0.2
    const chunkWindow = Math.max(0.2, 1 - staggerSpan);

    // Render each chunk
    chunks.forEach((chunk) => {
      // Compute per-chunk progress
      const chunkStart = totalChunks > 1 ? (chunk.index / (totalChunks - 1)) * staggerSpan : 0;
      const rawChunkProgress = (adjustedProgress - chunkStart) / chunkWindow;
      const chunkProgress = Math.max(0, Math.min(1, rawChunkProgress));

      if (chunkProgress <= 0) return;

      // Eased values
      const easedAlpha = easeOutCubic(chunkProgress);
      const easedSlide = easeOutQuart(chunkProgress);
      const easedBlur = easeOutCubic(chunkProgress);

      // Current values
      const currentOpacity = easedAlpha;
      const currentSlideY = slideDistance * slideSign * (1 - easedSlide);
      const currentBlur = blurAmount * (1 - easedBlur);

      ctx.save();
      ctx.translate(chunk.x, chunk.y + currentSlideY);

      // Apply blur via filter
      if (currentBlur > 0.3) {
        ctx.filter = `blur(${currentBlur.toFixed(1)}px)`;
      } else {
        ctx.filter = 'none';
      }

      // Apply letter spacing
      if (letterSpacing !== 0) {
        (ctx as any).letterSpacing = `${letterSpacing}px`;
      }

      // Set styles
      ctx.font = font;
      ctx.textAlign = chunk.align;
      ctx.textBaseline = 'middle';
      ctx.globalAlpha = currentOpacity;
      ctx.fillStyle = textColor;

      ctx.fillText(chunk.text, 0, 0);

      ctx.restore();
    });

    ctx.restore();
  },
};

export default animation;

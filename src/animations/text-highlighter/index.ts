import type { AnimationDefinition } from '../../runtime/types';
import { number, color, string, select, boolean, folder } from '../../runtime/params';

interface TextHighlighterParams {
  // Layout
  scale: number;
  // Text
  text: string;
  fontSize: number;
  fontWeight: string;
  lineHeight: number;
  // Colors
  textColor: string;
  highlightColor: string;
  backgroundColor: string;
  // Highlight
  highlightOpacity: number;
  highlightPaddingX: number;
  highlightPaddingY: number;
  // Cursor dots
  showCursors: boolean;
  cursorSize: number;
  cursorColor: string;
  // Animation
  speed: number;
  easing: string;
  holdTime: number;
}

// --- Easing Functions ---
const easings: Record<string, (t: number) => number> = {
  linear: (t) => t,
  easeInQuad: (t) => t * t,
  easeOutQuad: (t) => t * (2 - t),
  easeInOutQuad: (t) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2),
  easeInCubic: (t) => t * t * t,
  easeOutCubic: (t) => 1 - Math.pow(1 - t, 3),
  easeInOutCubic: (t) =>
    t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2,
  easeOutExpo: (t) => (t === 1 ? 1 : 1 - Math.pow(2, -10 * t)),
  easeInOutExpo: (t) =>
    t === 0
      ? 0
      : t === 1
        ? 1
        : t < 0.5
          ? Math.pow(2, 20 * t - 10) / 2
          : (2 - Math.pow(2, -20 * t + 10)) / 2,
};

// Word-wrap text into lines that fit within maxWidth
function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number
): string[] {
  const words = text.split(' ');
  const lines: string[] = [];
  let currentLine = '';

  for (const word of words) {
    const testLine = currentLine ? currentLine + ' ' + word : word;
    const metrics = ctx.measureText(testLine);
    if (metrics.width > maxWidth && currentLine) {
      lines.push(currentLine);
      currentLine = word;
    } else {
      currentLine = testLine;
    }
  }
  if (currentLine) {
    lines.push(currentLine);
  }
  return lines;
}

const animation: AnimationDefinition<TextHighlighterParams> = {
  id: 'text-highlighter',
  name: 'Text Highlighter',
  fps: 60,
  durationMs: 3000,
  width: 800,
  height: 400,
  background: '#FFFFFF',

  params: {
    defaults: {
      scale: 1,
      text: 'Blowbowl is very easy to customise to suit your needs.',
      fontSize: 48,
      fontWeight: 'bold',
      lineHeight: 1.5,
      textColor: '#2D2A1E',
      highlightColor: '#FFF3B0',
      backgroundColor: '#FFFFFF',
      highlightOpacity: 1,
      highlightPaddingX: 4,
      highlightPaddingY: 4,
      showCursors: true,
      cursorSize: 10,
      cursorColor: '#1A1A1A',
      speed: 1,
      easing: 'easeOutCubic',
      holdTime: 0.2,
    },
    schema: {
      ...folder('Layout', {
        scale: number({ value: 1, min: 0.1, max: 3, step: 0.1, label: 'Scale' }),
      }),
      ...folder('Text', {
        text: string({ value: 'Blowbowl is very easy to customise to suit your needs.', label: 'Text' }),
        fontSize: number({ value: 48, min: 12, max: 120, step: 1, label: 'Font Size' }),
        fontWeight: select({
          value: 'bold',
          options: ['normal', 'bold', '100', '200', '300', '400', '500', '600', '700', '800', '900'],
          label: 'Font Weight',
        }),
        lineHeight: number({ value: 1.5, min: 1, max: 3, step: 0.1, label: 'Line Height' }),
      }),
      ...folder('Colors', {
        textColor: color({ value: '#2D2A1E', label: 'Text Color' }),
        highlightColor: color({ value: '#FFF3B0', label: 'Highlight Color' }),
        backgroundColor: color({ value: '#FFFFFF', label: 'Background' }),
      }),
      ...folder('Highlight', {
        highlightOpacity: number({ value: 1, min: 0.1, max: 1, step: 0.05, label: 'Opacity' }),
        highlightPaddingX: number({ value: 4, min: 0, max: 20, step: 1, label: 'Padding X' }),
        highlightPaddingY: number({ value: 4, min: 0, max: 20, step: 1, label: 'Padding Y' }),
      }),
      ...folder('Cursor Dots', {
        showCursors: boolean({ value: true, label: 'Show Cursors' }),
        cursorSize: number({ value: 10, min: 4, max: 20, step: 1, label: 'Cursor Size' }),
        cursorColor: color({ value: '#1A1A1A', label: 'Cursor Color' }),
      }),
      ...folder('Animation', {
        speed: number({ value: 1, min: 0.1, max: 3, step: 0.1, label: 'Speed' }),
        easing: select({
          value: 'easeOutCubic',
          options: [
            'linear',
            'easeInQuad',
            'easeOutQuad',
            'easeInOutQuad',
            'easeInCubic',
            'easeOutCubic',
            'easeInOutCubic',
            'easeOutExpo',
            'easeInOutExpo',
          ],
          label: 'Easing',
        }),
        holdTime: number({ value: 0.2, min: 0, max: 0.5, step: 0.05, label: 'Hold Time (end)' }),
      }),
    },
  },

  render({ ctx, width, height, progress, params }) {
    const {
      scale,
      text,
      fontSize,
      fontWeight,
      lineHeight,
      textColor,
      highlightColor,
      backgroundColor,
      highlightOpacity,
      highlightPaddingX,
      highlightPaddingY,
      showCursors,
      cursorSize,
      cursorColor,
      speed,
      easing,
      holdTime,
    } = params;

    // --- Background ---
    ctx.fillStyle = backgroundColor;
    ctx.fillRect(0, 0, width, height);

    ctx.save();
    ctx.translate(width / 2, height / 2);
    ctx.scale(scale, scale);

    // --- Set font ---
    const font = `${fontWeight} ${fontSize}px "Georgia", "Times New Roman", serif`;
    ctx.font = font;
    ctx.textBaseline = 'top';

    // --- Word wrap ---
    const maxTextWidth = width * 0.75;
    const lines = wrapText(ctx, text, maxTextWidth);
    const lineHeightPx = fontSize * lineHeight;
    const totalTextHeight = lines.length * lineHeightPx;

    // Position text block centered
    const startY = -totalTextHeight / 2;

    // --- Measure each line ---
    interface LineInfo {
      text: string;
      x: number;
      y: number;
      width: number;
      height: number;
    }
    const lineInfos: LineInfo[] = lines.map((line, i) => {
      const metrics = ctx.measureText(line);
      const w = metrics.width;
      return {
        text: line,
        x: -w / 2,
        y: startY + i * lineHeightPx,
        width: w,
        height: fontSize * 1.15,
      };
    });

    // --- Compute total highlight length (sum of all line widths) ---
    const totalLength = lineInfos.reduce((sum, li) => sum + li.width, 0);

    // --- Adjusted progress with speed and hold ---
    const rawProgress = Math.min(1, (progress * speed) / (1 - holdTime));
    const clampedProgress = Math.max(0, Math.min(1, rawProgress));
    const easeFn = easings[easing] || easings.easeOutCubic;
    const easedProgress = easeFn(clampedProgress);

    // How much total highlight length has been revealed
    const revealedLength = easedProgress * totalLength;

    // --- Draw highlights per line ---
    let accumulated = 0;

    ctx.save();
    ctx.globalAlpha = highlightOpacity;

    for (let i = 0; i < lineInfos.length; i++) {
      const li = lineInfos[i];
      const lineStart = accumulated;
      const lineEnd = accumulated + li.width;

      if (revealedLength <= lineStart) {
        // Haven't reached this line yet
        break;
      }

      // How much of this line is revealed
      const lineReveal = Math.min(li.width, revealedLength - lineStart);
      const highlightWidth = lineReveal;

      // Draw highlight rectangle
      ctx.fillStyle = highlightColor;
      ctx.fillRect(
        li.x - highlightPaddingX,
        li.y - highlightPaddingY,
        highlightWidth + highlightPaddingX * 2,
        li.height + highlightPaddingY * 2
      );

      accumulated = lineEnd;
    }

    ctx.globalAlpha = 1;
    ctx.restore();

    // --- Draw rounded border around all highlighted area ---
    // (subtle rounded rect around the highlighted text block, like the reference)
    if (easedProgress > 0) {
      // Find the bounding box of highlighted lines
      let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
      accumulated = 0;
      for (let i = 0; i < lineInfos.length; i++) {
        const li = lineInfos[i];
        const lineStart = accumulated;
        if (revealedLength <= lineStart) break;
        const lineReveal = Math.min(li.width, revealedLength - lineStart);
        minX = Math.min(minX, li.x - highlightPaddingX);
        minY = Math.min(minY, li.y - highlightPaddingY);
        maxX = Math.max(maxX, li.x + lineReveal + highlightPaddingX);
        maxY = Math.max(maxY, li.y + li.height + highlightPaddingY);
        accumulated += li.width;
      }

      // Rounded border
      const borderRadius = 12;
      const bx = minX - 8;
      const by = minY - 8;
      const bw = maxX - minX + 16;
      const bh = maxY - minY + 16;

      ctx.save();
      ctx.strokeStyle = '#D0D0D0';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.roundRect(bx, by, bw, bh, borderRadius);
      ctx.stroke();
      ctx.restore();

      // --- Draw cursor dots ---
      if (showCursors && easedProgress > 0.01) {
        // Start cursor: top-left of first line
        const firstLine = lineInfos[0];
        const sCursorX = firstLine.x - highlightPaddingX - 8;
        const sCursorY = firstLine.y - highlightPaddingY - 8;

        ctx.save();
        ctx.fillStyle = cursorColor;
        ctx.beginPath();
        ctx.arc(sCursorX, sCursorY, cursorSize / 2, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

        // End cursor: bottom-right of current highlight edge
        // Find the last highlighted line
        accumulated = 0;
        let lastHighlightedIdx = 0;
        let lastLineReveal = 0;
        for (let i = 0; i < lineInfos.length; i++) {
          const li = lineInfos[i];
          const lineStart = accumulated;
          if (revealedLength <= lineStart) break;
          lastLineReveal = Math.min(li.width, revealedLength - lineStart);
          lastHighlightedIdx = i;
          accumulated += li.width;
        }
        const lastLi = lineInfos[lastHighlightedIdx];
        const eCursorX = lastLi.x + lastLineReveal + highlightPaddingX + 8;
        const eCursorY = lastLi.y + lastLi.height + highlightPaddingY + 8;

        // Draw connection line from end cursor to border
        ctx.save();
        ctx.strokeStyle = cursorColor;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(sCursorX, sCursorY + cursorSize / 2);
        ctx.lineTo(sCursorX, by);
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(eCursorX, eCursorY - cursorSize / 2);
        ctx.lineTo(eCursorX, maxY + 8);
        ctx.stroke();
        ctx.restore();

        ctx.save();
        ctx.fillStyle = cursorColor;
        ctx.beginPath();
        ctx.arc(eCursorX, eCursorY, cursorSize / 2, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
    }

    // --- Draw text on top ---
    ctx.fillStyle = textColor;
    ctx.font = font;
    ctx.textBaseline = 'top';
    for (const li of lineInfos) {
      ctx.fillText(li.text, li.x, li.y);
    }

    ctx.restore();
  },
};

export default animation;

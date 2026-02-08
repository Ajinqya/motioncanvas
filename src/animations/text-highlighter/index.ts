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
      scale: 0.6,
      text: 'Highlight text',
      fontSize: 48,
      fontWeight: 'bold',
      lineHeight: 1.5,
      textColor: '#1c1c1c',
      highlightColor: '#4400ff',
      backgroundColor: '#FFFFFF',
      highlightOpacity: 0.35,
      highlightPaddingX: 4,
      highlightPaddingY: 4,
      showCursors: true,
      cursorSize: 10,
      cursorColor: '#691f6b',
      speed: 1.5,
      easing: 'easeOutExpo',
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

    // --- Draw text ---
    ctx.fillStyle = textColor;
    ctx.font = font;
    ctx.textBaseline = 'top';
    for (const li of lineInfos) {
      ctx.fillText(li.text, li.x, li.y);
    }

    // --- Draw cursor lines and dots (on top of everything) ---
    if (easedProgress > 0.01) {
      // Start position: top-left of first highlighted line
      const firstLine = lineInfos[0];
      const sCursorX = firstLine.x - highlightPaddingX;
      const sCursorY = firstLine.y - highlightPaddingY;

      // End position: bottom-right of current highlight edge
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
      const eCursorX = lastLi.x + lastLineReveal + highlightPaddingX;
      const eCursorY = lastLi.y + lastLi.height + highlightPaddingY;

      // Line runs the full height of the highlight at the edge, like a text caret
      const highlightH = fontSize * 1.15 + highlightPaddingY * 2;
      const dotGap = 4; // small gap between line end and dot center

      ctx.save();
      ctx.strokeStyle = cursorColor;
      ctx.lineWidth = 1.5;

      // Start line: runs vertically at the left edge of the first highlight,
      // from dot above down through the highlight height
      ctx.beginPath();
      ctx.moveTo(sCursorX, sCursorY - dotGap - cursorSize / 2);
      ctx.lineTo(sCursorX, sCursorY + highlightH);
      ctx.stroke();

      // End line: runs vertically at the right edge of the last highlight,
      // from top of that highlight down to dot below
      const endLineTop = lastLi.y - highlightPaddingY;
      ctx.beginPath();
      ctx.moveTo(eCursorX, endLineTop);
      ctx.lineTo(eCursorX, eCursorY + dotGap + cursorSize / 2);
      ctx.stroke();
      ctx.restore();

      // Dots (toggleable)
      if (showCursors) {
        ctx.save();
        ctx.fillStyle = cursorColor;

        // Start dot: sits above the start line
        ctx.beginPath();
        ctx.arc(sCursorX, sCursorY - dotGap - cursorSize / 2, cursorSize / 2, 0, Math.PI * 2);
        ctx.fill();

        // End dot: sits below the end line
        ctx.beginPath();
        ctx.arc(eCursorX, eCursorY + dotGap + cursorSize / 2, cursorSize / 2, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
      }
    }

    ctx.restore();
  },
};

export default animation;

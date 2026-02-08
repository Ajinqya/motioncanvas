import type { AnimationDefinition } from '../../runtime/types';
import { number, color, folder } from '../../runtime/params';

/**
 * Code Magnifier
 * A magnifying glass hovers over a purple grid background,
 * with code text scrolling vertically inside the circular lens.
 */

interface CodeMagnifierParams {
  // Layout
  scale: number;
  lensRadius: number;
  handleLength: number;
  handleWidth: number;
  rimWidth: number;

  // Colors
  backgroundColor: string;
  gridColor: string;
  rimColor: string;
  rimInnerColor: string;
  lensBackground: string;
  textColor: string;

  // Animation
  speed: number;
  fontSize: number;
  lineHeight: number;
}

// The code text that scrolls inside the magnifying glass
const codeLines = [
  '  <App>',
  '    <Header',
  '      title = "Dashboard"',
  '      style = "elevated"',
  '    />',
  '  </Header>',
  '  <View id = "987ef" viewK...',
  '  <View id = "e402d" viewKey...',
  '  <View id = "55185" viewKey ...',
  '    <TextInput',
  '        id = "accountName"',
  '        label = "Account Name"',
  '        placeholder = "Enter valu...',
  '        />',
  '    <Button id = "button1" sty...',
  '  "Submit Refund">',
  '        Event event = "click...',
  '    = "issueRefund" />',
  '        </Button>',
  '    <View id = "c9a31" viewKey...',
  '    <TextInput',
  '        id = "refundAmount"',
  '        label = "Amount"',
  '        type = "currency"',
  '        placeholder = "0.00"',
  '        />',
  '    <Select',
  '        id = "refundReason"',
  '        label = "Reason"',
  '        options = {[',
  '          "Duplicate charge",',
  '          "Product not received",',
  '          "Customer request",',
  '        ]}',
  '        />',
  '    </View>',
  '  <Footer',
  '      style = "minimal"',
  '      sticky = {true}',
  '    />',
  '  </App>',
  '',
  '  <App>',
  '    <Header',
  '      title = "Dashboard"',
  '      style = "elevated"',
  '    />',
  '  </Header>',
  '  <View id = "987ef" viewK...',
  '  <View id = "e402d" viewKey...',
  '  <View id = "55185" viewKey ...',
  '    <TextInput',
  '        id = "accountName"',
  '        label = "Account Name"',
  '        placeholder = "Enter valu...',
  '        />',
  '    <Button id = "button1" sty...',
  '  "Submit Refund">',
];

// Easing
const easeInOutSine = (t: number) => -(Math.cos(Math.PI * t) - 1) / 2;

const animation: AnimationDefinition<CodeMagnifierParams> = {
  id: 'code-magnifier',
  name: 'Code Magnifier',
  fps: 60,
  durationMs: 6000,
  width: 800,
  height: 800,
  background: '#C060C0',

  params: {
    defaults: {
      scale: 0.8,
      lensRadius: 215,
      handleLength: 170,
      handleWidth: 24,
      rimWidth: 24,
      backgroundColor: '#C266D1',
      gridColor: '#B050B8',
      rimColor: '#D6A0DC',
      rimInnerColor: '#C888D4',
      lensBackground: '#2A1838',
      textColor: '#E8D8F0',
      speed: 1,
      fontSize: 19,
      lineHeight: 27,
    },
    schema: {
      ...folder('Layout', {
        scale: number({ value: 1, min: 0.1, max: 3, step: 0.1, label: 'Scale' }),
        lensRadius: number({ value: 250, min: 80, max: 350, step: 5, label: 'Lens Radius' }),
        handleLength: number({ value: 200, min: 60, max: 300, step: 5, label: 'Handle Length' }),
        handleWidth: number({ value: 50, min: 20, max: 80, step: 2, label: 'Handle Width' }),
        rimWidth: number({ value: 28, min: 8, max: 40, step: 1, label: 'Rim Width' }),
      }),
      ...folder('Colors', {
        backgroundColor: color({ value: '#C266D1', label: 'Background' }),
        gridColor: color({ value: '#B050B8', label: 'Grid Color' }),
        rimColor: color({ value: '#D6A0DC', label: 'Rim Outer' }),
        rimInnerColor: color({ value: '#C888D4', label: 'Rim Inner' }),
        lensBackground: color({ value: '#2A1838', label: 'Lens Background' }),
        textColor: color({ value: '#E8D8F0', label: 'Text Color' }),
      }),
      ...folder('Animation', {
        speed: number({ value: 1, min: 0.1, max: 3, step: 0.1, label: 'Speed' }),
        fontSize: number({ value: 24, min: 10, max: 36, step: 1, label: 'Font Size' }),
        lineHeight: number({ value: 36, min: 16, max: 50, step: 1, label: 'Line Height' }),
      }),
    },
  },

  render({ ctx, width, height, progress, params }) {
    const {
      scale,
      lensRadius,
      handleLength,
      handleWidth,
      rimWidth,
      backgroundColor,
      gridColor,
      rimColor,
      rimInnerColor,
      lensBackground,
      textColor,
      speed,
      fontSize,
      lineHeight,
    } = params;

    const adjustedProgress = (progress * speed) % 1;

    // --- Background ---
    ctx.fillStyle = backgroundColor;
    ctx.fillRect(0, 0, width, height);

    // --- Grid pattern ---
    const gridSize = 28 * scale;
    ctx.save();
    ctx.strokeStyle = gridColor;
    ctx.lineWidth = 2;
    ctx.globalAlpha = 0.7;
    for (let x = 0; x <= width; x += gridSize) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }
    for (let y = 0; y <= height; y += gridSize) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }
    ctx.restore();

    // --- Magnifying glass position ---
    // Center the lens, offset up slightly to leave room for the handle below
    const cx = width / 2;
    const cy = height * 0.38;
    const r = lensRadius * scale;
    const rim = rimWidth * scale;

    // Handle goes straight down from the bottom of the lens
    const hLen = handleLength * scale;
    const hWidth = handleWidth * scale;
    const handleStartY = cy + r + rim * 0.3;

    // --- Draw handle (straight down from center-bottom) ---
    ctx.save();
    ctx.shadowColor = 'rgba(0,0,0,0.25)';
    ctx.shadowBlur = 15;
    ctx.shadowOffsetX = 3;
    ctx.shadowOffsetY = 3;

    // Handle body (rounded rect, vertical, centered horizontally)
    ctx.fillStyle = rimColor;
    ctx.beginPath();
    ctx.roundRect(cx - hWidth / 2, handleStartY, hWidth, hLen, hWidth / 2);
    ctx.fill();

    // Handle gradient overlay for depth
    const handleGrad = ctx.createLinearGradient(cx - hWidth / 2, handleStartY, cx + hWidth / 2, handleStartY);
    handleGrad.addColorStop(0, 'rgba(255,255,255,0.15)');
    handleGrad.addColorStop(0.5, 'rgba(255,255,255,0)');
    handleGrad.addColorStop(1, 'rgba(0,0,0,0.1)');
    ctx.fillStyle = handleGrad;
    ctx.beginPath();
    ctx.roundRect(cx - hWidth / 2, handleStartY, hWidth, hLen, hWidth / 2);
    ctx.fill();

    // Handle tip (darker end cap)
    ctx.fillStyle = rimInnerColor;
    ctx.beginPath();
    ctx.roundRect(cx - hWidth / 2, handleStartY + hLen - hWidth, hWidth, hWidth, hWidth / 2);
    ctx.fill();

    ctx.restore(); // shadow

    // --- Draw lens outer rim (shadow) ---
    ctx.save();
    ctx.shadowColor = 'rgba(0,0,0,0.3)';
    ctx.shadowBlur = 20;
    ctx.shadowOffsetX = 4;
    ctx.shadowOffsetY = 4;

    // Outer rim
    ctx.beginPath();
    ctx.arc(cx, cy, r + rim, 0, Math.PI * 2);
    ctx.fillStyle = rimColor;
    ctx.fill();
    ctx.restore();

    // Inner rim ring (slightly different shade)
    ctx.beginPath();
    ctx.arc(cx, cy, r + rim * 0.5, 0, Math.PI * 2);
    ctx.fillStyle = rimInnerColor;
    ctx.fill();

    // Rim gradient for 3D look
    const rimGrad = ctx.createRadialGradient(cx - r * 0.2, cy - r * 0.2, r * 0.7, cx, cy, r + rim);
    rimGrad.addColorStop(0, 'rgba(255,255,255,0.12)');
    rimGrad.addColorStop(0.5, 'rgba(255,255,255,0)');
    rimGrad.addColorStop(1, 'rgba(0,0,0,0.08)');
    ctx.beginPath();
    ctx.arc(cx, cy, r + rim, 0, Math.PI * 2);
    ctx.fillStyle = rimGrad;
    ctx.fill();

    // --- Lens glass area ---
    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.clip();

    // Lens dark background
    ctx.fillStyle = lensBackground;
    ctx.fillRect(cx - r, cy - r, r * 2, r * 2);

    // Slight vignette inside lens
    const vignetteGrad = ctx.createRadialGradient(cx, cy, r * 0.3, cx, cy, r);
    vignetteGrad.addColorStop(0, 'rgba(0,0,0,0)');
    vignetteGrad.addColorStop(1, 'rgba(0,0,0,0.35)');
    ctx.fillStyle = vignetteGrad;
    ctx.fillRect(cx - r, cy - r, r * 2, r * 2);

    // --- Scrolling text ---
    const fs = fontSize * scale;
    const lh = lineHeight * scale;
    const totalTextHeight = codeLines.length * lh;

    // Smooth scroll: use eased progress for gentle feel
    const scrollProgress = easeInOutSine(adjustedProgress);
    const scrollOffset = scrollProgress * (totalTextHeight - r * 1.2);

    ctx.font = `${fs}px "SF Mono", "Fira Code", "Cascadia Code", "Courier New", monospace`;
    ctx.fillStyle = textColor;
    ctx.textBaseline = 'top';
    ctx.textAlign = 'left';

    const textStartX = cx - r * 0.78;
    const textStartY = cy - r * 0.55;

    for (let i = 0; i < codeLines.length; i++) {
      const lineY = textStartY + i * lh - scrollOffset;

      // Only draw lines that are within the lens area (with buffer)
      if (lineY > cy + r + lh || lineY < cy - r - lh) continue;

      // Fade edges for smooth scroll appearance
      const distFromCenter = Math.abs(lineY + lh / 2 - cy);
      const fadeStart = r * 0.6;
      let alpha = 1;
      if (distFromCenter > fadeStart) {
        alpha = Math.max(0, 1 - (distFromCenter - fadeStart) / (r * 0.4));
      }

      ctx.save();
      ctx.globalAlpha = alpha * 0.9;
      ctx.fillText(codeLines[i], textStartX, lineY);
      ctx.restore();
    }

    ctx.restore(); // clip

    // --- Glass reflection/highlight ---
    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.clip();

    // Subtle glass sheen (top-left highlight)
    const sheenGrad = ctx.createRadialGradient(
      cx - r * 0.35, cy - r * 0.35, 0,
      cx - r * 0.35, cy - r * 0.35, r * 0.9
    );
    sheenGrad.addColorStop(0, 'rgba(255,255,255,0.08)');
    sheenGrad.addColorStop(0.5, 'rgba(255,255,255,0.02)');
    sheenGrad.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = sheenGrad;
    ctx.fillRect(cx - r, cy - r, r * 2, r * 2);

    ctx.restore();
  },
};

export default animation;

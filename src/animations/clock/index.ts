import type { AnimationDefinition } from '../../runtime/types';
import { number, color, select, folder } from '../../runtime/params';

/**
 * Apple Clock Animation
 * A faithful recreation of the macOS/iOS clock icon with an animated second hand.
 * Second hand rotates exactly 360° per 60 seconds.
 */

interface AppleClockParams {
  // Layout
  scale: number;
  cornerRadius: number;
  padding: number;
  // Time
  hour: number;
  minute: number;
  // Face
  faceColor: string;
  faceGradientColor: string;
  borderColor: string;
  borderWidth: number;
  backgroundColor: string;
  // Hands
  handColor: string;
  secondHandColor: string;
  handGlow: number;
  handGlowColor: string;
  // Numbers
  numberColor: string;
  numberSize: number;
  numberFont: string;
  // Ticks
  tickColor: string;
  // Animation
  speed: number;
}

const TWO_PI = Math.PI * 2;

const animation: AnimationDefinition<AppleClockParams> = {
  id: 'apple-clock',
  name: 'Apple Clock',
  fps: 60,
  durationMs: 60000, // 60 seconds = one full second-hand rotation
  width: 500,
  height: 500,
  background: '#E8E8ED',

  params: {
    defaults: {
      scale: 0.4,
      cornerRadius: 205,
      padding: 33,
      hour: 10,
      minute: 35,
      faceColor: '#1b0815',
      faceGradientColor: '#0a0a0a',
      borderColor: '#707070',
      borderWidth: 4,
      backgroundColor: '#d1d1d1',
      handColor: '#f5f5f5',
      secondHandColor: '#cb3a87',
      handGlow: 16,
      handGlowColor: '#761e56',
      numberColor: '#c2c2c2',
      numberSize: 41,
      numberFont: 'SF Pro',
      tickColor: '#404040',
      speed: 1,
    },
    schema: {
      ...folder('Layout', {
        scale: number({ value: 1, min: 0.1, max: 3, step: 0.1, label: 'Scale' }),
        cornerRadius: number({ value: 58, min: 0, max: 205, step: 1, label: 'Corner Radius' }),
        padding: number({ value: 22, min: 0, max: 80, step: 1, label: 'Padding' }),
      }),
      ...folder('Time', {
        hour: number({ value: 10, min: 1, max: 12, step: 1, label: 'Hour (1-12)' }),
        minute: number({ value: 9, min: 0, max: 59, step: 1, label: 'Minute (0-59)' }),
      }),
      ...folder('Face', {
        faceColor: color({ value: '#FFFFFF', label: 'Face Color' }),
        faceGradientColor: color({ value: '#FFFFFF', label: 'Gradient Color' }),
        borderColor: color({ value: '#333333', label: 'Border Color' }),
        borderWidth: number({ value: 0, min: 0, max: 12, step: 0.5, label: 'Border Width' }),
      }),
      ...folder('Hands', {
        handColor: color({ value: '#1D1D1F', label: 'Hand Color' }),
        secondHandColor: color({ value: '#FF9500', label: 'Second Hand' }),
        handGlow: number({ value: 0, min: 0, max: 40, step: 1, label: 'Hand Glow' }),
        handGlowColor: color({ value: '#ffffff', label: 'Glow Color' }),
      }),
      ...folder('Numbers', {
        numberColor: color({ value: '#6E6E73', label: 'Number Color' }),
        numberSize: number({ value: 38, min: 16, max: 64, step: 1, label: 'Font Size' }),
        numberFont: select({
          value: 'SF Pro',
          options: [
            'SF Pro',
            'Helvetica',
            'Georgia',
            'Menlo',
            'Futura',
            'Didot',
            'Avenir',
            'Courier',
            'Times',
            'Arial',
          ],
          label: 'Font Family',
        }),
      }),
      ...folder('Colors', {
        backgroundColor: color({ value: '#E8E8ED', label: 'Background' }),
        tickColor: color({ value: '#8E8E93', label: 'Tick Marks' }),
      }),
      ...folder('Animation', {
        speed: number({ value: 1, min: 0.1, max: 10, step: 0.1, label: 'Speed' }),
      }),
    },
  },

  render({ ctx, width, height, progress, params }) {
    const {
      scale, cornerRadius, padding, hour, minute,
      faceColor, faceGradientColor, borderColor, borderWidth,
      backgroundColor, handColor, secondHandColor,
      handGlow, handGlowColor,
      numberColor, numberSize, numberFont,
      tickColor, speed,
    } = params;

    // Font family mapping
    const fontMap: Record<string, string> = {
      'SF Pro': '-apple-system, BlinkMacSystemFont, "SF Pro Display", "Helvetica Neue", sans-serif',
      'Helvetica': '"Helvetica Neue", Helvetica, Arial, sans-serif',
      'Georgia': 'Georgia, "Times New Roman", serif',
      'Menlo': 'Menlo, Monaco, "Courier New", monospace',
      'Futura': 'Futura, "Trebuchet MS", sans-serif',
      'Didot': 'Didot, "Bodoni MT", "Times New Roman", serif',
      'Avenir': '"Avenir Next", Avenir, "Helvetica Neue", sans-serif',
      'Courier': '"Courier New", Courier, monospace',
      'Times': '"Times New Roman", Times, Georgia, serif',
      'Arial': 'Arial, Helvetica, sans-serif',
    };
    const fontFamily = fontMap[numberFont] || fontMap['SF Pro'];

    // progress 0→1 over 60s; speed multiplier allows faster preview
    const p = (progress * speed) % 1;

    // Clear background
    ctx.fillStyle = backgroundColor;
    ctx.fillRect(0, 0, width, height);

    ctx.save();
    ctx.translate(width / 2, height / 2);
    ctx.scale(scale, scale);

    // ─── Squircle body ───────────────────────────────────────
    const bodyR = 205; // half-width of squircle
    const cornerR = cornerRadius;

    // Drop shadow
    ctx.save();
    ctx.shadowColor = 'rgba(0, 0, 0, 0.18)';
    ctx.shadowBlur = 30;
    ctx.shadowOffsetY = 8;
    ctx.beginPath();
    ctx.roundRect(-bodyR, -bodyR, bodyR * 2, bodyR * 2, cornerR);
    ctx.fillStyle = faceColor;
    ctx.fill();
    ctx.restore();

    // Face fill — flat or gradient
    ctx.beginPath();
    ctx.roundRect(-bodyR, -bodyR, bodyR * 2, bodyR * 2, cornerR);
    if (faceColor !== faceGradientColor) {
      // Radial gradient from center (faceColor) to edges (faceGradientColor)
      const grad = ctx.createRadialGradient(0, 0, 0, 0, 0, bodyR * 1.2);
      grad.addColorStop(0, faceColor);
      grad.addColorStop(1, faceGradientColor);
      ctx.fillStyle = grad;
    } else {
      ctx.fillStyle = faceColor;
    }
    ctx.fill();

    // ─── Face border ──────────────────────────────────────────
    if (borderWidth > 0) {
      ctx.beginPath();
      ctx.roundRect(-bodyR, -bodyR, bodyR * 2, bodyR * 2, cornerR);
      ctx.strokeStyle = borderColor;
      ctx.lineWidth = borderWidth;
      ctx.stroke();
    }

    // ─── Tick marks ──────────────────────────────────────────
    const faceR = bodyR - padding; // radius where ticks live

    for (let i = 0; i < 60; i++) {
      const angle = (i / 60) * TWO_PI;
      const isHour = i % 5 === 0;
      const isQuarter = i % 15 === 0;

      ctx.save();
      ctx.rotate(angle);

      if (isHour) {
        ctx.strokeStyle = tickColor;
        ctx.lineWidth = isQuarter ? 3.5 : 3;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(0, -faceR);
        ctx.lineTo(0, -(faceR - (isQuarter ? 20 : 18)));
        ctx.stroke();
      } else {
        ctx.strokeStyle = tickColor;
        ctx.lineWidth = 1.5;
        ctx.lineCap = 'round';
        ctx.globalAlpha = 0.5;
        ctx.beginPath();
        ctx.moveTo(0, -faceR);
        ctx.lineTo(0, -(faceR - 9));
        ctx.stroke();
        ctx.globalAlpha = 1;
      }

      ctx.restore();
    }

    // ─── Numbers (12, 3, 6, 9) ──────────────────────────────
    const numR = faceR - (numberSize + 4);
    ctx.fillStyle = numberColor;
    ctx.font = `600 ${numberSize}px ${fontFamily}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // 12 at top
    ctx.fillText('12', 0, -numR + 1);
    // 3 at right
    ctx.fillText('3', numR, 2);
    // 6 at bottom
    ctx.fillText('6', 0, numR + 1);
    // 9 at left
    ctx.fillText('9', -numR, 2);

    // ─── Hand angles (clockwise from 12 o'clock) ────────────
    // Second hand: exactly 360° per 60-second cycle
    const secAngle = p * TWO_PI;

    // Seconds elapsed in the animation (0→59)
    const currentSecond = p * 60;

    // Minute hand: starts at user-set minute, advances as seconds tick
    const minuteFraction = (minute + currentSecond / 60) / 60;
    const minAngle = minuteFraction * TWO_PI;

    // Hour hand: starts at user-set hour:minute, advances proportionally
    const hourFraction = (hour + minuteFraction) / 12;
    const hrAngle = hourFraction * TWO_PI;

    // ─── Hour hand ───────────────────────────────────────────
    const hourLen = faceR * 0.43;
    const hourTail = 18;
    drawRoundedHand(ctx, hrAngle, hourLen, hourTail, 8.5, handColor, handGlow, handGlowColor);

    // ─── Minute hand ─────────────────────────────────────────
    const minLen = faceR * 0.63;
    const minTail = 20;
    drawRoundedHand(ctx, minAngle, minLen, minTail, 6.5, handColor, handGlow, handGlowColor);

    // ─── Second hand ─────────────────────────────────────────
    ctx.save();
    ctx.rotate(secAngle);

    if (handGlow > 0) {
      ctx.shadowColor = handGlowColor;
      ctx.shadowBlur = handGlow;
    }

    const secMainLen = faceR * 0.78;
    const secTailLen = 32;

    // Main line (from tail to tip)
    ctx.strokeStyle = secondHandColor;
    ctx.lineWidth = 2;
    ctx.lineCap = 'butt';
    ctx.beginPath();
    ctx.moveTo(0, secTailLen);
    ctx.lineTo(0, -secMainLen);
    ctx.stroke();

    // Pointed tip
    ctx.lineCap = 'round';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(0, -secMainLen);
    ctx.lineTo(0, -secMainLen - 3);
    ctx.stroke();

    // Counterweight disc at tail end
    ctx.fillStyle = secondHandColor;
    ctx.beginPath();
    ctx.arc(0, secTailLen - 5, 5, 0, TWO_PI);
    ctx.fill();

    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;
    ctx.restore();

    // ─── Center hub ──────────────────────────────────────────
    // Orange ring
    ctx.beginPath();
    ctx.arc(0, 0, 6.5, 0, TWO_PI);
    ctx.fillStyle = secondHandColor;
    ctx.fill();

    // White inner dot
    ctx.beginPath();
    ctx.arc(0, 0, 2.8, 0, TWO_PI);
    ctx.fillStyle = faceColor;
    ctx.fill();

    ctx.restore();
  },
};

/**
 * Draw a clock hand with rounded ends and slight taper.
 * Draws from a short tail below center to the tip above.
 */
function drawRoundedHand(
  ctx: CanvasRenderingContext2D,
  angle: number,
  length: number,
  tailLength: number,
  handWidth: number,
  fillColor: string,
  glowBlur: number,
  glowColor: string
) {
  ctx.save();
  ctx.rotate(angle);
  ctx.fillStyle = fillColor;

  // Apply glow / shadow if enabled
  if (glowBlur > 0) {
    ctx.shadowColor = glowColor;
    ctx.shadowBlur = glowBlur;
  }

  const hw = handWidth / 2;
  const tipW = handWidth * 0.35; // narrower at tip
  const tipR = tipW;

  ctx.beginPath();

  // Start at bottom-right of tail
  ctx.moveTo(hw, tailLength);

  // Right edge going up, tapering toward tip
  ctx.lineTo(hw, 0);
  ctx.lineTo(tipW, -(length - tipR));

  // Rounded tip
  ctx.quadraticCurveTo(tipW, -length, 0, -length);
  ctx.quadraticCurveTo(-tipW, -length, -tipW, -(length - tipR));

  // Left edge going down
  ctx.lineTo(-hw, 0);
  ctx.lineTo(-hw, tailLength);

  // Rounded tail
  ctx.quadraticCurveTo(-hw, tailLength + hw * 0.6, 0, tailLength + hw * 0.6);
  ctx.quadraticCurveTo(hw, tailLength + hw * 0.6, hw, tailLength);

  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

export default animation;

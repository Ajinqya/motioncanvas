import type { AnimationDefinition } from '../../runtime/types';
import { number, color, folder, select } from '../../runtime/params';

/**
 * Camera Mode Dial Animation
 * A realistic camera mode dial that rotates through different shooting modes
 * The active mode is highlighted in red
 */

interface CameraDialParams {
  scale: number;
  tickColor: string;
  activeColor: string;
  backgroundColor: string;
  iconColor: string;
  speed: number;
  direction: string;
}

// Camera modes in order around the dial (clockwise from top)
const MODES = [
  { id: 'AUTO', type: 'label' },
  { id: 'MACRO', type: 'icon' },
  { id: 'NIGHT', type: 'icon' },
  { id: 'P', type: 'circle' },
  { id: 'A', type: 'circle' },
  { id: 'S', type: 'circle' },
  { id: 'M', type: 'hexagon' },
  { id: 'C1', type: 'text' },
  { id: 'C2', type: 'text' },
  { id: 'C3', type: 'text' },
] as const;

// Easing function for smooth rotation
const easeInOutCubic = (t: number): number =>
  t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

// Easing for snappy stops
const easeOutBack = (t: number): number => {
  const c1 = 1.70158;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
};

const animation: AnimationDefinition<CameraDialParams> = {
  id: 'camera-dial',
  name: 'Camera Dial',
  fps: 60,
  durationMs: 10000,
  width: 1080,
  height: 1080,
  background: '#0D0D0D',

  params: {
    defaults: {
      scale: 1,
      tickColor: '#3A3A3A',
      activeColor: '#E63B35',
      backgroundColor: '#0D0D0D',
      iconColor: '#8A8A8A',
      speed: 1,
      direction: 'clockwise',
    },
    schema: {
      ...folder('Layout', {
        scale: number({ value: 1, min: 0.1, max: 2, step: 0.1, label: 'Scale' }),
      }),
      ...folder('Colors', {
        tickColor: color({ value: '#3A3A3A', label: 'Tick Color' }),
        activeColor: color({ value: '#E63B35', label: 'Active Color' }),
        iconColor: color({ value: '#8A8A8A', label: 'Icon Color' }),
        backgroundColor: color({ value: '#0D0D0D', label: 'Background' }),
      }),
      ...folder('Animation', {
        speed: number({ value: 1, min: 0.1, max: 3, step: 0.1, label: 'Speed' }),
        direction: select({
          value: 'clockwise',
          options: ['clockwise', 'counterclockwise'],
          label: 'Direction',
        }),
      }),
    },
  },

  render({ ctx, progress, width, height, params }) {
    const { scale, tickColor, activeColor, backgroundColor, iconColor, speed, direction } = params;

    // Clear with background
    ctx.fillStyle = backgroundColor;
    ctx.fillRect(0, 0, width, height);

    // Center the content
    ctx.save();
    ctx.translate(width / 2, height / 2);
    ctx.scale(scale, scale);

    const totalModes = MODES.length;
    const anglePerMode = (Math.PI * 2) / totalModes;

    // Animation: rotate through modes with pauses
    const adjustedProgress = (progress * speed) % 1;
    
    // Create stepped animation with smooth transitions
    const cycleDuration = 1 / totalModes;
    const pauseRatio = 0.6; // 60% pause, 40% transition
    const cycleProgress = adjustedProgress / cycleDuration;
    const currentModeIndex = Math.floor(cycleProgress) % totalModes;
    const withinCycle = cycleProgress - Math.floor(cycleProgress);
    
    // Only animate during the transition portion
    let transitionProgress = 0;
    if (withinCycle > pauseRatio) {
      transitionProgress = (withinCycle - pauseRatio) / (1 - pauseRatio);
      transitionProgress = easeOutBack(Math.min(1, transitionProgress));
    }

    // Calculate rotation angle
    const directionMultiplier = direction === 'clockwise' ? 1 : -1;
    const currentRotation = (currentModeIndex + transitionProgress) * anglePerMode * directionMultiplier;

    // Dial dimensions
    const innerRadius = 180;
    const outerRadius = 210;
    const modeRadius = 280;
    const totalTicks = 60;

    // Draw the rotating dial
    ctx.save();
    ctx.rotate(-currentRotation);

    // Draw tick marks
    for (let i = 0; i < totalTicks; i++) {
      const angle = (i / totalTicks) * Math.PI * 2 - Math.PI / 2;

      // Check if this tick is near the active position (top after rotation)
      const normalizedAngle = ((angle + currentRotation + Math.PI / 2) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2);
      const isNearActive = normalizedAngle < 0.08 || normalizedAngle > Math.PI * 2 - 0.08;

      ctx.strokeStyle = isNearActive ? activeColor : tickColor;
      ctx.lineWidth = isNearActive ? 2 : 1.5;
      ctx.lineCap = 'round';

      ctx.beginPath();
      ctx.moveTo(Math.cos(angle) * innerRadius, Math.sin(angle) * innerRadius);
      ctx.lineTo(Math.cos(angle) * outerRadius, Math.sin(angle) * outerRadius);
      ctx.stroke();
    }

    // Draw mode labels and icons
    for (let i = 0; i < totalModes; i++) {
      const mode = MODES[i];
      const angle = (i / totalModes) * Math.PI * 2 - Math.PI / 2;
      const x = Math.cos(angle) * modeRadius;
      const y = Math.sin(angle) * modeRadius;

      // Check if this mode is currently active
      const normalizedAngle = ((angle + currentRotation + Math.PI / 2) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2);
      const isActiveMode = normalizedAngle < 0.15 || normalizedAngle > Math.PI * 2 - 0.15;
      const modeColor = isActiveMode ? activeColor : iconColor;

      ctx.save();
      ctx.translate(x, y);
      // Rotate text to be upright
      ctx.rotate(-(-currentRotation) + angle + Math.PI / 2);

      switch (mode.type) {
        case 'label':
          drawAutoLabel(ctx, modeColor, isActiveMode);
          break;
        case 'icon':
          if (mode.id === 'MACRO') {
            drawMacroIcon(ctx, modeColor);
          } else if (mode.id === 'NIGHT') {
            drawNightIcon(ctx, modeColor);
          }
          break;
        case 'circle':
          drawModeCircle(ctx, mode.id, modeColor);
          break;
        case 'hexagon':
          drawModeHexagon(ctx, modeColor);
          break;
        case 'text':
          drawModeText(ctx, mode.id, modeColor);
          break;
      }

      ctx.restore();
    }

    ctx.restore();

    // Draw the fixed indicator line at the top (always red, always pointing up)
    ctx.strokeStyle = activeColor;
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(0, -innerRadius + 20);
    ctx.lineTo(0, -outerRadius - 30);
    ctx.stroke();

    ctx.restore();
  },
};

// Draw the AUTO label in a rounded rectangle
function drawAutoLabel(ctx: CanvasRenderingContext2D, color: string, isActive: boolean) {
  const w = 70;
  const h = 28;
  const radius = 14;

  ctx.strokeStyle = color;
  ctx.lineWidth = isActive ? 2 : 1.5;

  // Rounded rectangle
  ctx.beginPath();
  ctx.roundRect(-w / 2, -h / 2, w, h, radius);
  ctx.stroke();

  // Draw "AUTO" text
  ctx.font = '600 13px -apple-system, BlinkMacSystemFont, "SF Pro Display", sans-serif';
  ctx.fillStyle = color;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('AUTO', 0, 0);
}

// Draw a mode label in a circle (P, A, S)
function drawModeCircle(ctx: CanvasRenderingContext2D, label: string, color: string) {
  const radius = 18;

  ctx.strokeStyle = color;
  ctx.lineWidth = 1.5;

  // Circle
  ctx.beginPath();
  ctx.arc(0, 0, radius, 0, Math.PI * 2);
  ctx.stroke();

  // Label text
  ctx.font = '500 16px -apple-system, BlinkMacSystemFont, "SF Pro Display", sans-serif';
  ctx.fillStyle = color;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(label, 0, 1);
}

// Draw the M mode in a hexagon with Σ symbol
function drawModeHexagon(ctx: CanvasRenderingContext2D, color: string) {
  const radius = 20;
  const sides = 6;

  ctx.strokeStyle = color;
  ctx.lineWidth = 1.5;

  // Draw hexagon
  ctx.beginPath();
  for (let i = 0; i < sides; i++) {
    const angle = (i / sides) * Math.PI * 2 - Math.PI / 2;
    const x = Math.cos(angle) * radius;
    const y = Math.sin(angle) * radius;
    if (i === 0) {
      ctx.moveTo(x, y);
    } else {
      ctx.lineTo(x, y);
    }
  }
  ctx.closePath();
  ctx.stroke();

  // Draw Σ (Sigma) symbol for Manual mode
  ctx.font = '500 18px -apple-system, BlinkMacSystemFont, "SF Pro Display", sans-serif';
  ctx.fillStyle = color;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('Σ', 0, 1);
}

// Draw simple text labels (C1, C2, C3)
function drawModeText(ctx: CanvasRenderingContext2D, label: string, color: string) {
  ctx.font = '500 16px -apple-system, BlinkMacSystemFont, "SF Pro Display", sans-serif';
  ctx.fillStyle = color;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(label, 0, 0);
}

// Draw the macro/tulip icon
function drawMacroIcon(ctx: CanvasRenderingContext2D, color: string) {
  ctx.strokeStyle = color;
  ctx.fillStyle = 'transparent';
  ctx.lineWidth = 1.8;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  const scale = 1.1;

  // Draw tulip flower
  ctx.save();
  ctx.scale(scale, scale);

  // Left petal
  ctx.beginPath();
  ctx.moveTo(0, 8);
  ctx.bezierCurveTo(-12, 0, -12, -12, -6, -16);
  ctx.bezierCurveTo(-2, -18, 0, -14, 0, -10);
  ctx.stroke();

  // Right petal
  ctx.beginPath();
  ctx.moveTo(0, 8);
  ctx.bezierCurveTo(12, 0, 12, -12, 6, -16);
  ctx.bezierCurveTo(2, -18, 0, -14, 0, -10);
  ctx.stroke();

  // Center petal
  ctx.beginPath();
  ctx.moveTo(0, 8);
  ctx.bezierCurveTo(-4, -2, -4, -14, 0, -20);
  ctx.bezierCurveTo(4, -14, 4, -2, 0, 8);
  ctx.stroke();

  // Stem
  ctx.beginPath();
  ctx.moveTo(0, 8);
  ctx.lineTo(0, 18);
  ctx.stroke();

  // Left leaf
  ctx.beginPath();
  ctx.moveTo(0, 14);
  ctx.quadraticCurveTo(-8, 12, -10, 18);
  ctx.stroke();

  // Right leaf
  ctx.beginPath();
  ctx.moveTo(0, 12);
  ctx.quadraticCurveTo(6, 10, 8, 16);
  ctx.stroke();

  ctx.restore();
}

// Draw the night/crescent moon icon
function drawNightIcon(ctx: CanvasRenderingContext2D, color: string) {
  ctx.strokeStyle = color;
  ctx.lineWidth = 1.8;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  const radius = 14;

  // Draw crescent moon
  ctx.beginPath();
  // Outer arc (main moon shape)
  ctx.arc(0, 0, radius, Math.PI * 0.15, Math.PI * 1.85, false);
  ctx.stroke();

  // Inner arc to complete crescent
  ctx.beginPath();
  ctx.arc(6, -3, radius * 0.75, Math.PI * 0.5, Math.PI * 1.5, true);
  ctx.stroke();
}

export default animation;

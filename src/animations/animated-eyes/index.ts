import type { AnimationDefinition } from '../../runtime/types';
import { number, color, boolean, folder, select } from '../../runtime/params';

// Easing functions
const easeInOutSine = (t: number) => -(Math.cos(Math.PI * t) - 1) / 2;
const easeInOutCubic = (t: number) => t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

interface EyesParams {
  // Background
  backgroundColor: string;
  cornerRadius: number;
  // Eye whites
  eyeWhiteColor: string;
  // Pupils
  pupilColor: string;
  // Animation patterns
  enableRotation: boolean;
  rotationSpeed: number;
  enableHorizontalMove: boolean;
  horizontalMoveSpeed: number;
  horizontalMoveAmount: number;
  enableVerticalMove: boolean;
  verticalMoveSpeed: number;
  verticalMoveAmount: number;
  enableScaling: boolean;
  scalingSpeed: number;
  scaleMin: number;
  scaleMax: number;
  animationPattern: string;
}

const animation: AnimationDefinition<EyesParams> = {
  id: 'animated-eyes',
  name: 'Animated Eyes',
  fps: 60,
  durationMs: 6000,
  width: 284,
  height: 355,
  background: '#FFFFFF',

  params: {
    defaults: {
      backgroundColor: '#FFA228',
      cornerRadius: 1,
      eyeWhiteColor: '#EFEEEB',
      pupilColor: '#272723',
      enableRotation: false,
      rotationSpeed: 0.2,
      enableHorizontalMove: false,
      horizontalMoveSpeed: 2.5,
      horizontalMoveAmount: 5,
      enableVerticalMove: true,
      verticalMoveSpeed: 0.3,
      verticalMoveAmount: 24,
      enableScaling: true,
      scalingSpeed: 1.5,
      scaleMin: 0.7,
      scaleMax: 1.3,
      animationPattern: 'pulse',
    },
    schema: {
      ...folder('Background', {
        backgroundColor: color({ value: '#8429ff', label: 'Background Color' }),
        cornerRadius: number({ value: 1, min: 0, max: 50, step: 1, label: 'Corner Radius' }),
      }),
      ...folder('Colors', {
        eyeWhiteColor: color({ value: '#EFEEEB', label: 'Eye White Color' }),
        pupilColor: color({ value: '#272723', label: 'Pupil Color' }),
      }),
      ...folder('Rotation', {
        enableRotation: boolean({ value: false, label: 'Enable Rotation' }),
        rotationSpeed: number({ value: 1, min: 0.1, max: 5, step: 0.1, label: 'Rotation Speed' }),
      }),
      ...folder('Horizontal Movement', {
        enableHorizontalMove: boolean({ value: true, label: 'Enable Horizontal' }),
        horizontalMoveSpeed: number({ value: 1, min: 0.1, max: 3, step: 0.1, label: 'Speed' }),
        horizontalMoveAmount: number({ value: 1, min: 0, max: 30, step: 1, label: 'Movement Amount' }),
      }),
      ...folder('Vertical Movement', {
        enableVerticalMove: boolean({ value: true, label: 'Enable Vertical' }),
        verticalMoveSpeed: number({ value: 1.8, min: 0.1, max: 3, step: 0.1, label: 'Speed' }),
        verticalMoveAmount: number({ value: 12, min: 0, max: 30, step: 1, label: 'Movement Amount' }),
      }),
      ...folder('Scaling', {
        enableScaling: boolean({ value: false, label: 'Enable Scaling' }),
        scalingSpeed: number({ value: 1.5, min: 0.1, max: 5, step: 0.1, label: 'Speed' }),
        scaleMin: number({ value: 0.7, min: 0.3, max: 1, step: 0.05, label: 'Min Scale' }),
        scaleMax: number({ value: 1.3, min: 1, max: 2, step: 0.05, label: 'Max Scale' }),
      }),
      animationPattern: select({
        value: 'all',
        options: [
          { label: 'All Combined', value: 'all' },
          { label: 'Rotation Only', value: 'rotation' },
          { label: 'Horizontal Only', value: 'horizontal' },
          { label: 'Vertical Only', value: 'vertical' },
          { label: 'Scaling Only', value: 'scaling' },
          { label: 'Look Around', value: 'lookaround' },
          { label: 'Pulse', value: 'pulse' },
        ],
        label: 'Animation Pattern',
      }),
    },
  },

  render({ ctx, time, width, height, progress, params }) {
    const {
      backgroundColor,
      cornerRadius,
      eyeWhiteColor,
      pupilColor,
      enableRotation,
      rotationSpeed,
      enableHorizontalMove,
      horizontalMoveSpeed,
      horizontalMoveAmount,
      enableVerticalMove,
      verticalMoveSpeed,
      verticalMoveAmount,
      enableScaling,
      scalingSpeed,
      scaleMin,
      scaleMax,
      animationPattern,
    } = params;

    // Helper function to draw rounded rectangle
    const drawRoundedRect = (x: number, y: number, w: number, h: number, r: number) => {
      ctx.beginPath();
      ctx.moveTo(x + r, y);
      ctx.lineTo(x + w - r, y);
      ctx.arcTo(x + w, y, x + w, y + r, r);
      ctx.lineTo(x + w, y + h - r);
      ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
      ctx.lineTo(x + r, y + h);
      ctx.arcTo(x, y + h, x, y + h - r, r);
      ctx.lineTo(x, y + r);
      ctx.arcTo(x, y, x + r, y, r);
      ctx.closePath();
    };

    // Clear and draw background
    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = backgroundColor;
    drawRoundedRect(0, 0, width, height, cornerRadius);
    ctx.fill();

    // Eye positions (centers of eye whites)
    const leftEye = { x: 86, y: 255 };
    const rightEye = { x: 205, y: 255 };
    const eyeWhiteRadius = 46;
    const pupilRadius = 25;
    // The maximum pupil travel distance from the eye center
    const maxPupilOffset = eyeWhiteRadius - pupilRadius - 2;

    // For independent motion, each eye gets its own timing phase
    const eyes = [
      {
        ...leftEye,
        phase: 0.12,
      },
      {
        ...rightEye,
        phase: 0.53,
      },
    ];

    // Helper to compute each eye's animation state
    function getEyeAnim(
      baseTime: number,
      phase: number
    ) {
      let rotation = 0;
      let offsetX = 0;
      let offsetY = 0;
      let scale = 1;
      // For staggering, let each eye have a phase offset
      const t = baseTime + phase;
      // Which animations to apply?
      const shouldRotate = (animationPattern === 'all' || animationPattern === 'rotation') && enableRotation;
      const shouldMoveH = (animationPattern === 'all' || animationPattern === 'horizontal' || animationPattern === 'lookaround') && enableHorizontalMove;
      const shouldMoveV = (animationPattern === 'all' || animationPattern === 'vertical' || animationPattern === 'lookaround') && enableVerticalMove;
      const shouldScale = (animationPattern === 'all' || animationPattern === 'scaling' || animationPattern === 'pulse') && enableScaling;
      // Calculate values
      if (shouldRotate) {
        rotation = t * rotationSpeed * Math.PI * 2;
      }
      if (shouldMoveH) {
        // Use easeInOutSine for organic drift
        offsetX = easeInOutSine(0.5 + 0.5 * Math.sin(t * horizontalMoveSpeed * Math.PI)) * horizontalMoveAmount;
      }
      if (shouldMoveV) {
        offsetY = easeInOutCubic(0.5 + 0.5 * Math.sin(t * verticalMoveSpeed * Math.PI + Math.PI / 2)) * verticalMoveAmount;
      }
      if (shouldScale) {
        const scaleRange = scaleMax - scaleMin;
        scale = scaleMin + (easeInOutSine(0.5 + 0.5 * Math.sin(t * scalingSpeed * Math.PI))) * scaleRange;
      }
      // Special pattern: Look Around (each eye cycles in a different order)
      if (animationPattern === 'lookaround') {
        const lookCycle = (t % 4);
        if (lookCycle < 1) {
          offsetX = -horizontalMoveAmount;
        } else if (lookCycle < 2) {
          offsetX = horizontalMoveAmount;
        } else if (lookCycle < 3) {
          offsetY = -verticalMoveAmount;
        } else {
          offsetY = verticalMoveAmount;
        }
      }
      // Special pattern: Pulse
      if (animationPattern === 'pulse') {
        scale = scaleMin + (0.5 + 0.5 * Math.sin(t * scalingSpeed)) * (scaleMax - scaleMin);
        rotation = 0;
        offsetX = 0;
        offsetY = 0;
      }
      // Clamp total pupil travel
      const dist = Math.sqrt(offsetX * offsetX + offsetY * offsetY);
      if (dist > maxPupilOffset) {
        const ratio = maxPupilOffset / dist;
        offsetX *= ratio;
        offsetY *= ratio;
      }
      return { rotation, offsetX, offsetY, scale };
    }

    // Draw a single eye
    function drawEye(cx: number, cy: number, anim: { rotation: number; offsetX: number; offsetY: number; scale: number }) {
      ctx.save();
      // Eye white with subtle shadow
      ctx.shadowColor = 'rgba(0,0,0,0.11)';
      ctx.shadowBlur = 10;
      ctx.beginPath();
      ctx.arc(cx, cy, eyeWhiteRadius, 0, Math.PI * 2);
      ctx.fillStyle = eyeWhiteColor;
      ctx.fill();
      ctx.shadowBlur = 0;
      // Clip to the eye white
      ctx.beginPath();
      ctx.arc(cx, cy, eyeWhiteRadius, 0, Math.PI * 2);
      ctx.clip();
      // Pupil/iris group
      ctx.save();
      // Move the pupil relative to the center of the white
      ctx.translate(cx + anim.offsetX, cy + anim.offsetY);
      if (enableRotation && (animationPattern === 'all' || animationPattern === 'rotation')) {
        ctx.rotate(anim.rotation);
      }
      if (enableScaling && (animationPattern === 'all' || animationPattern === 'scaling' || animationPattern === 'pulse')) {
        ctx.scale(anim.scale, anim.scale);
      }
      // Draw iris (subtle gradient for depth)
      const irisRadius = pupilRadius * 1.1;
      const irisGrad = ctx.createRadialGradient(0, 0, pupilRadius * 0.2, 0, 0, irisRadius);
      irisGrad.addColorStop(0, '#4e50a3');
      irisGrad.addColorStop(0.75, '#23225b');
      irisGrad.addColorStop(1, 'rgba(35,34,91,0.72)');
      ctx.beginPath();
      ctx.arc(0, 0, irisRadius, 0, Math.PI * 2);
      ctx.fillStyle = irisGrad;
      ctx.globalAlpha = 0.99;
      ctx.fill();
      ctx.globalAlpha = 1;
      // Pupil (with glow)
      ctx.save();
      ctx.beginPath();
      ctx.arc(0, 0, pupilRadius, 0, Math.PI * 2);
      ctx.shadowColor = pupilColor;
      ctx.shadowBlur = 10;
      ctx.fillStyle = pupilColor;
      ctx.globalAlpha = 1;
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.restore();
      // Highlight
      ctx.save();
      ctx.beginPath();
      ctx.arc(-pupilRadius * 0.33, -pupilRadius * 0.33, pupilRadius * 0.22, 0, Math.PI * 2);
      ctx.globalAlpha = 0.25;
      ctx.fillStyle = '#fff';
      ctx.fill();
      ctx.globalAlpha = 1;
      ctx.restore();
      ctx.restore(); // end pupil group
      ctx.restore(); // end clip
      ctx.restore(); // end eye
    }

    // Draw both eyes with independent animation
    for (let i = 0; i < 2; i++) {
      const eye = eyes[i];
      const anim = getEyeAnim(time, eye.phase);
      drawEye(eye.x, eye.y, anim);
    }
  },
};

export const draftAnimation = animation;

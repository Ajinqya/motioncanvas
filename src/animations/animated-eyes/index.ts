import type { AnimationDefinition } from '../../runtime/types';
import { number, color, boolean, folder, select } from '../../runtime/params';

/**
 * Animated Eyes SVG
 * Multiple loop patterns: rotation, left-right, top-bottom, scaling
 */

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
  
  // Animation mode
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
      rotationSpeed: 3.2,
      enableHorizontalMove: false,
      horizontalMoveSpeed: 2.5,
      horizontalMoveAmount: 5,
      enableVerticalMove: true,
      verticalMoveSpeed: 0.3,
      verticalMoveAmount: 24,
      enableScaling: false,
      scalingSpeed: 1.5,
      scaleMin: 0.7,
      scaleMax: 1.3,
      animationPattern: 'all',
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

  render({ ctx, time, width, height, params }) {
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

    // Draw background
    ctx.fillStyle = backgroundColor;
    drawRoundedRect(0, 0, width, height, cornerRadius);
    ctx.fill();

    // Eye positions (centers of eye whites)
    const leftEyeX = 86;
    const leftEyeY = 255;
    const rightEyeX = 205;
    const rightEyeY = 255;
    const eyeWhiteRadius = 46;
    const pupilRadius = 25;

    // Calculate animations based on pattern
    let rotation = 0;
    let offsetX = 0;
    let offsetY = 0;
    let scale = 1;

    // Determine which animations to apply
    const shouldRotate = (animationPattern === 'all' || animationPattern === 'rotation') && enableRotation;
    const shouldMoveH = (animationPattern === 'all' || animationPattern === 'horizontal' || animationPattern === 'lookaround') && enableHorizontalMove;
    const shouldMoveV = (animationPattern === 'all' || animationPattern === 'vertical' || animationPattern === 'lookaround') && enableVerticalMove;
    const shouldScale = (animationPattern === 'all' || animationPattern === 'scaling' || animationPattern === 'pulse') && enableScaling;

    // Calculate animation values
    if (shouldRotate) {
      rotation = time * rotationSpeed * Math.PI * 2;
    }

    if (shouldMoveH) {
      offsetX = Math.sin(time * horizontalMoveSpeed * Math.PI) * horizontalMoveAmount;
    }

    if (shouldMoveV) {
      offsetY = Math.sin(time * verticalMoveSpeed * Math.PI + Math.PI / 2) * verticalMoveAmount;
    }

    if (shouldScale) {
      const scaleRange = scaleMax - scaleMin;
      scale = scaleMin + (Math.sin(time * scalingSpeed * Math.PI) * 0.5 + 0.5) * scaleRange;
    }

    // Special pattern: Look Around (sequential movements)
    if (animationPattern === 'lookaround') {
      const cycle = time % 4;
      if (cycle < 1) {
        // Look left
        offsetX = -horizontalMoveAmount;
      } else if (cycle < 2) {
        // Look right
        offsetX = horizontalMoveAmount;
      } else if (cycle < 3) {
        // Look up
        offsetY = -verticalMoveAmount;
      } else {
        // Look down
        offsetY = verticalMoveAmount;
      }
    }

    // Special pattern: Pulse (smooth breathing effect)
    if (animationPattern === 'pulse') {
      scale = scaleMin + (Math.sin(time * scalingSpeed) * 0.5 + 0.5) * (scaleMax - scaleMin);
      rotation = 0;
      offsetX = 0;
      offsetY = 0;
    }

    // Helper function to draw an eye
    const drawEye = (eyeX: number, eyeY: number) => {
      ctx.save();
      
      // Draw eye white
      ctx.fillStyle = eyeWhiteColor;
      ctx.beginPath();
      ctx.arc(eyeX, eyeY, eyeWhiteRadius, 0, Math.PI * 2);
      ctx.fill();
      
      // Create clipping mask from eye white circle to contain the pupil
      ctx.beginPath();
      ctx.arc(eyeX, eyeY, eyeWhiteRadius, 0, Math.PI * 2);
      ctx.clip();

      // Calculate pupil position (no longer need strict constraints since we're clipping)
      const pupilX = eyeX + 21 + offsetX; // Base offset of 21 from original SVG
      const pupilY = eyeY + offsetY;

      // Draw pupil with transformations (will be clipped to stay inside eye white)
      ctx.save();
      ctx.translate(pupilX, pupilY);
      
      if (shouldRotate) {
        ctx.rotate(rotation);
      }
      
      if (shouldScale) {
        ctx.scale(scale, scale);
      }

      ctx.fillStyle = pupilColor;
      ctx.beginPath();
      ctx.arc(0, 0, pupilRadius, 0, Math.PI * 2);
      ctx.fill();
      
      ctx.restore();
      
      // Restore to remove clipping mask
      ctx.restore();
    };

    // Draw both eyes
    drawEye(leftEyeX, leftEyeY);
    drawEye(rightEyeX, rightEyeY);
  },
};

export const draftAnimation = animation;

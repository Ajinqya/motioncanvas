import type { AnimationDefinition } from '../../runtime/types';
import { number, color, boolean, folder, select } from '../../runtime/params';

/**
 * Figma Logo Animation
 * Sequential reveal of Figma logo pieces appearing from different directions
 */

interface FigmaLogoParams {
  // Layout
  scale: number;
  // Colors
  backgroundColor: string;
  redColor: string;
  orangeColor: string;
  purpleColor: string;
  blueColor: string;
  greenColor: string;
  // Animation
  speed: number;
  staggerDelay: number;
  entranceStyle: string;
  translationDistance: number;
  // Effects
  glowIntensity: number;
  innerShadow: boolean;
  innerShadowIntensity: number;
}

// Ease-out easing (no bounce)
const easeOutCubic = (t: number): number => 1 - Math.pow(1 - t, 3);

// Shape definitions with their paths and animation directions
interface ShapeConfig {
  path: string;
  color: string;
  // Direction to enter from (offset multiplier)
  enterFrom: { x: number; y: number };
}

// SVG paths from the Figma logo (centered at origin)
const createShapeConfigs = (colors: {
  red: string;
  orange: string;
  purple: string;
  blue: string;
  green: string;
}): ShapeConfig[] => [
  {
    // Red (top-left) - enters from top-left
    path: 'M-91.5 -91.5C-91.5 -116.767 -71.017 -137.25 -45.75 -137.25H0V-45.75H-45.75C-71.017 -45.75 -91.5 -66.233 -91.5 -91.5Z',
    color: colors.red,
    enterFrom: { x: -1, y: -1 },
  },
  {
    // Orange (top-right) - enters from top-right
    path: 'M91.5 -91.5C91.5 -116.767 71.017 -137.25 45.75 -137.25H0V-45.75H45.75C71.017 -45.75 91.5 -66.233 91.5 -91.5Z',
    color: colors.orange,
    enterFrom: { x: 1, y: -1 },
  },
  {
    // Purple (middle-left) - enters from left
    path: 'M-91.5 0C-91.5 -25.267 -71.017 -45.75 -45.75 -45.75H0V45.75H-45.75C-71.017 45.75 -91.5 25.267 -91.5 0Z',
    color: colors.purple,
    enterFrom: { x: -1, y: 0 },
  },
  {
    // Blue (middle-right, circle) - enters from right
    path: 'M0 0C0 -25.267 20.483 -45.75 45.75 -45.75C71.017 -45.75 91.5 -25.267 91.5 0C91.5 25.267 71.017 45.75 45.75 45.75C20.483 45.75 0 25.267 0 0Z',
    color: colors.blue,
    enterFrom: { x: 1, y: 0 },
  },
  {
    // Green (bottom-left) - enters from bottom
    path: 'M-91.5 91.5C-91.5 66.233 -71.017 45.75 -45.75 45.75H0V91.5C0 116.767 -20.483 137.25 -45.75 137.25C-71.017 137.25 -91.5 116.767 -91.5 91.5Z',
    color: colors.green,
    enterFrom: { x: -1, y: 1 },
  },
];

const animation: AnimationDefinition<FigmaLogoParams> = {
  id: 'figma-logo',
  name: 'Figma Logo',
  fps: 60,
  durationMs: 2500,
  width: 400,
  height: 400,
  background: '#1A1A1A',

  params: {
    defaults: {
      scale: 0.5,
      backgroundColor: '#0d0d0d',
      redColor: '#FF0000',
      orangeColor: '#FF5600',
      purpleColor: '#9542FF',
      blueColor: '#00BAFF',
      greenColor: '#00D962',
      speed: 2.25,
      staggerDelay: 0.02,
      entranceStyle: 'scale',
      translationDistance: 120,
      glowIntensity: 0,
      innerShadow: true,
      innerShadowIntensity: 0.25,
    },
    schema: {
      ...folder('Layout', {
        scale: number({ value: 1.4, min: 0.5, max: 3, step: 0.1, label: 'Scale' }),
      }),
      ...folder('Colors', {
        backgroundColor: color({ value: '#1A1A1A', label: 'Background' }),
        redColor: color({ value: '#FF0000', label: 'Red (Top Left)' }),
        orangeColor: color({ value: '#FF5600', label: 'Orange (Top Right)' }),
        purpleColor: color({ value: '#9542FF', label: 'Purple (Middle Left)' }),
        blueColor: color({ value: '#00BAFF', label: 'Blue (Circle)' }),
        greenColor: color({ value: '#00D962', label: 'Green (Bottom)' }),
      }),
      ...folder('Animation', {
        speed: number({ value: 1, min: 0.25, max: 3, step: 0.25, label: 'Speed' }),
        staggerDelay: number({ value: 0.1, min: 0.02, max: 0.3, step: 0.02, label: 'Stagger Delay' }),
        entranceStyle: select({
          value: 'translate',
          options: ['translate', 'scale', 'both'],
          label: 'Entrance Style',
        }),
        translationDistance: number({ value: 120, min: 20, max: 300, step: 10, label: 'Translation Distance' }),
      }),
      ...folder('Effects', {
        glowIntensity: number({ value: 0, min: 0, max: 1, step: 0.1, label: 'Glow Intensity' }),
        innerShadow: boolean({ value: true, label: 'Inner Shadow' }),
        innerShadowIntensity: number({ value: 0.25, min: 0, max: 0.5, step: 0.05, label: 'Shadow Intensity' }),
      }),
    },
  },

  render({ ctx, progress, width, height, params }) {
    const {
      scale,
      backgroundColor,
      redColor,
      orangeColor,
      purpleColor,
      blueColor,
      greenColor,
      speed,
      staggerDelay,
      entranceStyle,
      translationDistance,
      glowIntensity,
      innerShadow,
      innerShadowIntensity,
    } = params;

    // Clear background
    ctx.fillStyle = backgroundColor;
    ctx.fillRect(0, 0, width, height);

    // Create shape configs with current colors
    const shapes = createShapeConfigs({
      red: redColor,
      orange: orangeColor,
      purple: purpleColor,
      blue: blueColor,
      green: greenColor,
    });

    // Adjust progress by speed
    const adjustedProgress = Math.min(progress * speed, 1);

    // Animation timing
    const entranceDuration = 0.25; // Duration for each shape's entrance animation
    const totalStaggerTime = staggerDelay * (shapes.length - 1) + entranceDuration;

    // Center canvas
    ctx.save();
    ctx.translate(width / 2, height / 2);
    ctx.scale(scale, scale);

    // Draw each shape with staggered animation
    shapes.forEach((shape, index) => {
      // Calculate this shape's animation progress
      const startTime = index * staggerDelay;
      const shapeProgress = Math.max(0, Math.min(1,
        (adjustedProgress * totalStaggerTime - startTime) / entranceDuration
      ));

      // Skip if animation hasn't started for this shape
      if (shapeProgress <= 0) return;

      // Apply ease-out easing
      const easedProgress = easeOutCubic(shapeProgress);

      ctx.save();

      // Calculate entrance offset (inverse - starts offset, ends at 0)
      const offsetMultiplier = 1 - easedProgress;
      
      if (entranceStyle === 'translate' || entranceStyle === 'both') {
        const offsetX = shape.enterFrom.x * translationDistance * offsetMultiplier;
        const offsetY = shape.enterFrom.y * translationDistance * offsetMultiplier;
        ctx.translate(offsetX, offsetY);
      }

      if (entranceStyle === 'scale' || entranceStyle === 'both') {
        const shapeScale = easedProgress;
        ctx.scale(shapeScale, shapeScale);
      }

      // Opacity fade-in (faster than position animation)
      const opacity = Math.min(1, easedProgress * 2);
      ctx.globalAlpha = opacity;

      // Add glow effect
      if (glowIntensity > 0) {
        ctx.shadowColor = shape.color;
        ctx.shadowBlur = 30 * glowIntensity * easedProgress;
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 0;
      }

      // Draw the shape
      const path = new Path2D(shape.path);
      ctx.fillStyle = shape.color;
      ctx.fill(path);

      // Reset shadow for inner effects
      ctx.shadowBlur = 0;

      // Add inner shadow effect (gradient overlay for depth, like the original SVG)
      if (innerShadow && easedProgress > 0.3) {
        const shadowOpacity = (easedProgress - 0.3) * innerShadowIntensity * 1.4;
        
        // Dark gradient on right side (inner shadow)
        const gradient = ctx.createLinearGradient(-91.5, 0, 91.5, 0);
        gradient.addColorStop(0, `rgba(0, 0, 0, 0)`);
        gradient.addColorStop(1, `rgba(0, 0, 0, ${shadowOpacity})`);
        ctx.fillStyle = gradient;
        ctx.fill(path);

        // White highlight on left/top edge
        const highlightGradient = ctx.createLinearGradient(-91.5, -45, 91.5, 45);
        highlightGradient.addColorStop(0, `rgba(255, 255, 255, ${shadowOpacity * 0.4})`);
        highlightGradient.addColorStop(0.4, `rgba(255, 255, 255, 0)`);
        highlightGradient.addColorStop(1, `rgba(255, 255, 255, 0)`);
        ctx.fillStyle = highlightGradient;
        ctx.fill(path);
      }

      ctx.restore();
    });

    ctx.restore();
  },
};

export default animation;

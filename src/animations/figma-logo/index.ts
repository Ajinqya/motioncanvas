import type { AnimationDefinition } from '../../runtime/types';
import { number, color, boolean, folder, select } from '../../runtime/params';

/**
 * Figma Logo Animation - Metallic Glass Style
 * Dark metallic Figma logo with glass-like reflections and edge highlights
 */

interface FigmaLogoParams {
  // Layout
  scale: number;
  // Colors
  backgroundColor: string;
  fillColor: string;
  edgeHighlight: string;
  edgeShadow: string;
  glowColor: string;
  // Animation
  speed: number;
  staggerDelay: number;
  entranceStyle: string;
  translationDistance: number;
  // Metallic Effects
  strokeWidth: number;
  edgeBrightness: number;
  fillOpacity: number;
  glowRadius: number;
  glowOpacity: number;
  reflectionIntensity: number;
  innerShadow: boolean;
}

// Ease-out easing
const easeOutCubic = (t: number): number => 1 - Math.pow(1 - t, 3);

// Shape definitions with their paths and animation directions
interface ShapeConfig {
  path: string;
  enterFrom: { x: number; y: number };
}

// SVG paths from the Figma logo (centered at origin)
const shapeConfigs: ShapeConfig[] = [
  {
    // Top-left capsule
    path: 'M-91.5 -91.5C-91.5 -116.767 -71.017 -137.25 -45.75 -137.25H0V-45.75H-45.75C-71.017 -45.75 -91.5 -66.233 -91.5 -91.5Z',
    enterFrom: { x: -1, y: -1 },
  },
  {
    // Top-right capsule
    path: 'M91.5 -91.5C91.5 -116.767 71.017 -137.25 45.75 -137.25H0V-45.75H45.75C71.017 -45.75 91.5 -66.233 91.5 -91.5Z',
    enterFrom: { x: 1, y: -1 },
  },
  {
    // Middle-left capsule
    path: 'M-91.5 0C-91.5 -25.267 -71.017 -45.75 -45.75 -45.75H0V45.75H-45.75C-71.017 45.75 -91.5 25.267 -91.5 0Z',
    enterFrom: { x: -1, y: 0 },
  },
  {
    // Middle-right circle
    path: 'M0 0C0 -25.267 20.483 -45.75 45.75 -45.75C71.017 -45.75 91.5 -25.267 91.5 0C91.5 25.267 71.017 45.75 45.75 45.75C20.483 45.75 0 25.267 0 0Z',
    enterFrom: { x: 1, y: 0 },
  },
  {
    // Bottom-left piece
    path: 'M-91.5 91.5C-91.5 66.233 -71.017 45.75 -45.75 45.75H0V91.5C0 116.767 -20.483 137.25 -45.75 137.25C-71.017 137.25 -91.5 116.767 -91.5 91.5Z',
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
  background: '#000000',

  params: {
    defaults: {
      scale: 0.5,
      backgroundColor: '#000000',
      fillColor: '#1a1a1a',
      edgeHighlight: '#9e9e9e',
      edgeShadow: '#c2c2c2',
      glowColor: '#222222',
      speed: 3,
      staggerDelay: 0.02,
      entranceStyle: 'scale',
      translationDistance: 240,
      strokeWidth: 2.6,
      edgeBrightness: 0.65,
      fillOpacity: 0.6,
      glowRadius: 0.6,
      glowOpacity: 0.25,
      reflectionIntensity: 0.5,
      innerShadow: true,
    },
    schema: {
      ...folder('Layout', {
        scale: number({ value: 1.4, min: 0.5, max: 3, step: 0.1, label: 'Scale' }),
      }),
      ...folder('Colors', {
        backgroundColor: color({ value: '#000000', label: 'Background' }),
        fillColor: color({ value: '#1a1a1a', label: 'Shape Fill' }),
        edgeHighlight: color({ value: '#999999', label: 'Edge Highlight' }),
        edgeShadow: color({ value: '#333333', label: 'Edge Shadow' }),
        glowColor: color({ value: '#222222', label: 'Ambient Glow' }),
      }),
      ...folder('Animation', {
        speed: number({ value: 2.25, min: 0.25, max: 3, step: 0.25, label: 'Speed' }),
        staggerDelay: number({ value: 0.02, min: 0.02, max: 0.3, step: 0.02, label: 'Stagger Delay' }),
        entranceStyle: select({
          value: 'scale',
          options: ['translate', 'scale', 'both'],
          label: 'Entrance Style',
        }),
        translationDistance: number({ value: 120, min: 20, max: 300, step: 10, label: 'Translation Distance' }),
      }),
      ...folder('Metallic Effects', {
        strokeWidth: number({ value: 1.2, min: 0.5, max: 3, step: 0.1, label: 'Edge Width' }),
        edgeBrightness: number({ value: 0.7, min: 0, max: 1, step: 0.05, label: 'Edge Brightness' }),
        fillOpacity: number({ value: 0.85, min: 0.1, max: 1, step: 0.05, label: 'Fill Opacity' }),
        glowRadius: number({ value: 0.55, min: 0.1, max: 1, step: 0.05, label: 'Glow Radius' }),
        glowOpacity: number({ value: 0.2, min: 0, max: 0.6, step: 0.05, label: 'Glow Intensity' }),
        reflectionIntensity: number({ value: 0.25, min: 0, max: 0.6, step: 0.05, label: 'Reflection' }),
        innerShadow: boolean({ value: true, label: 'Inner Shadow' }),
      }),
    },
  },

  render({ ctx, progress, width, height, params }) {
    const {
      scale,
      backgroundColor,
      fillColor,
      edgeHighlight,
      edgeShadow,
      glowColor,
      speed,
      staggerDelay,
      entranceStyle,
      translationDistance,
      strokeWidth,
      edgeBrightness,
      fillOpacity,
      glowRadius,
      glowOpacity,
      reflectionIntensity,
      innerShadow,
    } = params;

    // Parse hex to RGB for alpha blending
    const hexToRgb = (hex: string) => {
      const r = parseInt(hex.slice(1, 3), 16);
      const g = parseInt(hex.slice(3, 5), 16);
      const b = parseInt(hex.slice(5, 7), 16);
      return { r, g, b };
    };

    const fillRgb = hexToRgb(fillColor);
    const highlightRgb = hexToRgb(edgeHighlight);
    const shadowRgb = hexToRgb(edgeShadow);
    const glowRgb = hexToRgb(glowColor);

    // Clear background
    ctx.fillStyle = backgroundColor;
    ctx.fillRect(0, 0, width, height);

    // Adjust progress by speed
    const adjustedProgress = Math.min(progress * speed, 1);

    // Animation timing
    const entranceDuration = 0.25;
    const totalStaggerTime = staggerDelay * (shapeConfigs.length - 1) + entranceDuration;

    // Calculate overall entrance progress for the ambient glow
    const overallEntrance = easeOutCubic(Math.min(1, adjustedProgress * 3));

    // Draw ambient glow behind the logo (subtle radial gradient)
    if (glowOpacity > 0) {
      ctx.save();
      const glowSize = Math.min(width, height) * glowRadius;
      const ambientGlow = ctx.createRadialGradient(
        width / 2, height / 2, 0,
        width / 2, height / 2, glowSize
      );
      ambientGlow.addColorStop(0, `rgba(${glowRgb.r}, ${glowRgb.g}, ${glowRgb.b}, ${glowOpacity * overallEntrance})`);
      ambientGlow.addColorStop(0.5, `rgba(${glowRgb.r}, ${glowRgb.g}, ${glowRgb.b}, ${glowOpacity * 0.4 * overallEntrance})`);
      ambientGlow.addColorStop(1, `rgba(${glowRgb.r}, ${glowRgb.g}, ${glowRgb.b}, 0)`);
      ctx.fillStyle = ambientGlow;
      ctx.fillRect(0, 0, width, height);
      ctx.restore();
    }

    // Center canvas
    ctx.save();
    ctx.translate(width / 2, height / 2);
    ctx.scale(scale, scale);

    // Draw each shape with staggered animation
    shapeConfigs.forEach((shape, index) => {
      // Calculate this shape's animation progress
      const startTime = index * staggerDelay;
      const shapeProgress = Math.max(0, Math.min(1,
        (adjustedProgress * totalStaggerTime - startTime) / entranceDuration
      ));

      if (shapeProgress <= 0) return;

      const easedProgress = easeOutCubic(shapeProgress);

      ctx.save();

      // Calculate entrance offset
      const offsetMultiplier = 1 - easedProgress;

      if (entranceStyle === 'translate' || entranceStyle === 'both') {
        const offsetX = shape.enterFrom.x * translationDistance * offsetMultiplier;
        const offsetY = shape.enterFrom.y * translationDistance * offsetMultiplier;
        ctx.translate(offsetX, offsetY);
      }

      if (entranceStyle === 'scale' || entranceStyle === 'both') {
        ctx.scale(easedProgress, easedProgress);
      }

      // Opacity fade-in
      const opacity = Math.min(1, easedProgress * 2);
      ctx.globalAlpha = opacity;

      const path = new Path2D(shape.path);

      // 1. Draw the dark glass fill
      ctx.fillStyle = `rgba(${fillRgb.r}, ${fillRgb.g}, ${fillRgb.b}, ${fillOpacity})`;
      ctx.fill(path);

      // 2. Add subtle top-light reflection gradient (metallic sheen)
      if (reflectionIntensity > 0) {
        ctx.save();
        ctx.clip(path);

        // Top-left to bottom-right reflection
        const reflGrad = ctx.createLinearGradient(-100, -140, 100, 140);
        reflGrad.addColorStop(0, `rgba(255, 255, 255, ${reflectionIntensity * 0.35 * easedProgress})`);
        reflGrad.addColorStop(0.25, `rgba(255, 255, 255, ${reflectionIntensity * 0.08 * easedProgress})`);
        reflGrad.addColorStop(0.5, `rgba(255, 255, 255, 0)`);
        reflGrad.addColorStop(0.75, `rgba(0, 0, 0, ${reflectionIntensity * 0.1 * easedProgress})`);
        reflGrad.addColorStop(1, `rgba(0, 0, 0, ${reflectionIntensity * 0.2 * easedProgress})`);
        ctx.fillStyle = reflGrad;
        ctx.fillRect(-100, -150, 200, 300);

        ctx.restore();
      }

      // 3. Add inner shadow for depth
      if (innerShadow) {
        ctx.save();
        ctx.clip(path);

        // Subtle inner darkening at edges
        const innerGrad = ctx.createRadialGradient(0, 0, 20, 0, 0, 120);
        innerGrad.addColorStop(0, `rgba(255, 255, 255, ${0.02 * easedProgress})`);
        innerGrad.addColorStop(0.6, `rgba(0, 0, 0, 0)`);
        innerGrad.addColorStop(1, `rgba(0, 0, 0, ${0.15 * easedProgress})`);
        ctx.fillStyle = innerGrad;
        ctx.fillRect(-100, -150, 200, 300);

        ctx.restore();
      }

      // 4. Draw metallic edge stroke with directional lighting
      // Light source from top-left, so top-left edges are brighter
      const edgeGrad = ctx.createLinearGradient(-100, -140, 100, 140);
      const highAlpha = edgeBrightness * easedProgress;
      const lowAlpha = edgeBrightness * 0.25 * easedProgress;
      edgeGrad.addColorStop(0, `rgba(${highlightRgb.r}, ${highlightRgb.g}, ${highlightRgb.b}, ${highAlpha})`);
      edgeGrad.addColorStop(0.4, `rgba(${highlightRgb.r}, ${highlightRgb.g}, ${highlightRgb.b}, ${highAlpha * 0.5})`);
      edgeGrad.addColorStop(0.6, `rgba(${shadowRgb.r}, ${shadowRgb.g}, ${shadowRgb.b}, ${lowAlpha})`);
      edgeGrad.addColorStop(1, `rgba(${shadowRgb.r}, ${shadowRgb.g}, ${shadowRgb.b}, ${lowAlpha * 0.5})`);

      ctx.strokeStyle = edgeGrad;
      ctx.lineWidth = strokeWidth;
      ctx.stroke(path);

      ctx.restore();
    });

    ctx.restore();
  },
};

export default animation;

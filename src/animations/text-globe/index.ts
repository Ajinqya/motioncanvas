import type { AnimationDefinition } from '../../runtime/types';
import { number, color, folder, select } from '../../runtime/params';

/**
 * Text Globe Animation - OPTIMIZED
 * "around the world" text forming a 3D sphere
 * Features: scaling reveal from north pole, alternating rotation directions
 * 
 * Performance optimizations:
 * - Render whole words instead of individual characters
 * - Pre-calculate static values outside render loop
 * - Limit draw calls with smarter culling
 * - Avoid sorting by using insertion order
 */

interface TextGlobeParams {
  // Layout
  scale: number;
  sphereSize: number;
  // Colors
  textColor: string;
  backgroundColor: string;
  // Animation
  speed: number;
  rotationSpeed: number;
  revealDuration: number;
  // Text
  fontSize: number;
  fontWeight: string;
  // Sphere
  numBands: number;
}

// Easing functions
const easeOutCubic = (t: number): number => 1 - Math.pow(1 - t, 3);
const easeOutQuart = (t: number): number => 1 - Math.pow(1 - t, 4);

// Pre-calculated constants
const TWO_PI = Math.PI * 2;
const HALF_PI = Math.PI / 2;

const animation: AnimationDefinition<TextGlobeParams> = {
  id: 'text-globe',
  name: 'Text Globe',
  fps: 60,
  durationMs: 6000,
  width: 800,
  height: 800,
  background: '#3333FF',

  params: {
    defaults: {
      scale: 1,
      sphereSize: 270,
      textColor: '#FFFFFF',
      backgroundColor: '#3333FF',
      speed: 1.7,
      rotationSpeed: 0.4,
      revealDuration: 0.2,
      fontSize: 23,
      fontWeight: '700',
      numBands: 16,
    },
    schema: {
      ...folder('Layout', {
        scale: number({ value: 1, min: 0.1, max: 3, step: 0.1, label: 'Scale' }),
        sphereSize: number({ value: 340, min: 100, max: 400, step: 10, label: 'Sphere Size' }),
      }),
      ...folder('Colors', {
        textColor: color({ value: '#FFFFFF', label: 'Text Color' }),
        backgroundColor: color({ value: '#3333FF', label: 'Background' }),
      }),
      ...folder('Animation', {
        speed: number({ value: 1, min: 0.1, max: 3, step: 0.1, label: 'Speed' }),
        rotationSpeed: number({ value: 0.4, min: 0.1, max: 2, step: 0.1, label: 'Rotation Speed' }),
        revealDuration: number({ value: 0.35, min: 0.1, max: 1, step: 0.05, label: 'Reveal Duration' }),
      }),
      ...folder('Text', {
        fontSize: number({ value: 22, min: 10, max: 40, step: 1, label: 'Font Size' }),
        fontWeight: select({
          value: '700',
          options: ['400', '500', '600', '700', '800', '900'],
          label: 'Font Weight',
        }),
      }),
      ...folder('Sphere', {
        numBands: number({ value: 18, min: 8, max: 28, step: 1, label: 'Number of Bands' }),
      }),
    },
  },

  render({ ctx, progress, width, height, params }) {
    const {
      scale,
      sphereSize,
      textColor,
      backgroundColor,
      speed,
      rotationSpeed,
      revealDuration,
      fontSize,
      fontWeight,
      numBands,
    } = params;

    const text = 'around the world';
    const textWithSpace = text + '  ';

    // Apply speed to progress
    const adjustedProgress = (progress * speed) % 1;

    // Clear background
    ctx.fillStyle = backgroundColor;
    ctx.fillRect(0, 0, width, height);

    // Center the canvas
    ctx.save();
    ctx.translate(width / 2, height / 2);
    ctx.scale(scale, scale);

    const radius = sphereSize;

    // Animation phases
    const revealProgress = Math.min(adjustedProgress / revealDuration, 1);
    const easedReveal = easeOutQuart(revealProgress);

    // Calculate continuous rotation
    const rotationAngle = adjustedProgress * rotationSpeed * TWO_PI;

    // Set up text style ONCE
    ctx.font = `${fontWeight} ${fontSize}px "Inter", "SF Pro Display", -apple-system, sans-serif`;
    ctx.fillStyle = textColor;
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'center';

    // Measure text width ONCE outside the loop
    const textWidth = ctx.measureText(textWithSpace).width;

    // Pre-calculate band data to avoid redundant calculations
    // Draw bands from back to front (simple depth ordering without sorting)
    // We'll draw in two passes: back hemisphere first, then front

    for (let pass = 0; pass < 2; pass++) {
      const isBackPass = pass === 0;

      for (let bandIndex = 0; bandIndex < numBands; bandIndex++) {
        // Calculate latitude
        const latitudeRatio = (bandIndex + 0.5) / numBands;
        const latitude = -HALF_PI + latitudeRatio * Math.PI;
        const cosLatitude = Math.cos(latitude);
        const sinLatitude = Math.sin(latitude);

        // Calculate the radius of the circle at this latitude
        const bandRadius = radius * cosLatitude;

        // Skip bands that are too small (near poles)
        if (bandRadius < fontSize * 0.5) continue;

        // Calculate reveal for this band
        const bandRevealStart = (bandIndex / numBands) * 0.85;
        const bandRevealProgress = Math.max(
          0,
          Math.min(1, (easedReveal - bandRevealStart) / (1 - bandRevealStart))
        );

        if (bandRevealProgress <= 0) continue;

        const bandScale = easeOutCubic(bandRevealProgress);

        // Calculate rotation direction (alternate for each band)
        const rotationDirection = bandIndex % 2 === 0 ? 1 : -1;
        const bandRotation = rotationAngle * rotationDirection;

        // Calculate number of text repeats around the band
        const circumference = TWO_PI * bandRadius;
        const numTextRepeats = Math.max(1, Math.round(circumference / textWidth));
        const anglePerText = TWO_PI / numTextRepeats;

        // Y position for this band
        const y = radius * sinLatitude;

        // Vertical scale based on latitude
        const latitudeScale = Math.abs(cosLatitude);

        // Draw each text instance around the band
        for (let i = 0; i < numTextRepeats; i++) {
          const baseAngle = i * anglePerText + bandRotation;

          // 3D projection
          const cosAngle = Math.cos(baseAngle);
          const sinAngle = Math.sin(baseAngle);

          const x = bandRadius * sinAngle;
          const z = bandRadius * cosAngle;

          // Normalize depth (0 = back, 1 = front)
          const depthNormalized = (z + radius) / (2 * radius);

          // Determine which pass this belongs to
          const isFront = depthNormalized >= 0.5;
          if (isBackPass && isFront) continue;
          if (!isBackPass && !isFront) continue;

          // Skip text that's too far back
          if (depthNormalized < 0.15) continue;

          // Calculate opacity based on depth
          const depthOpacity = Math.pow(Math.max(0, depthNormalized - 0.15) / 0.85, 1.5);

          // Perspective scale
          const perspectiveScaleX = Math.max(0.2, Math.abs(cosAngle));
          const depthScale = 0.5 + 0.5 * depthNormalized;

          const finalScaleX = perspectiveScaleX * bandScale * depthScale;
          const finalScaleY = latitudeScale * bandScale * depthScale;
          const finalAlpha = depthOpacity * bandRevealProgress;

          if (finalAlpha < 0.05) continue;

          // Draw the text - no rotation, text reads horizontally
          ctx.save();
          ctx.translate(x, y);
          ctx.scale(finalScaleX, finalScaleY);
          ctx.globalAlpha = finalAlpha;
          ctx.fillText(text, 0, 0);
          ctx.restore();
        }
      }
    }

    ctx.restore();
  },
};

export default animation;

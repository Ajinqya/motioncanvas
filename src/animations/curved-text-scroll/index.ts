import type { AnimationDefinition } from '../../runtime/types';
import { number, color, select, folder } from '../../runtime/params';

const cities: string[] = [
  'New York, USA',
  'Stockholm, Sweden',
  'Berlin, Germany',
  'Oslo, Norway',
  'Copenhagen, Denmark',
  'London, UK',
  'Madrid, Spain',
  'Helsinki, Finland',
  'Shanghai, China',
  'San Francisco, USA',
  'Tokyo, Japan',
  'Sao Paulo, Brazil',
  'Auckland, New Zealand',
  'Sydney, Australia',
  'Mumbai, India',
  'Dubai, UAE',
  'Singapore',
  'Seoul, South Korea',
  'Toronto, Canada',
  'Paris, France',
  'Cape Town, South Africa',
  'Mexico City, Mexico',
  'Bangkok, Thailand',
  'Rome, Italy',
];

// Font family lookup
const fontMap: Record<string, string> = {
  'Inter': 'Inter, sans-serif',
  'SF Pro': '"SF Pro Display", "SF Pro", -apple-system, BlinkMacSystemFont, sans-serif',
  'Helvetica': '"Helvetica Neue", Helvetica, Arial, sans-serif',
  'Georgia': 'Georgia, "Times New Roman", serif',
  'Courier': '"Courier New", Courier, monospace',
  'Arial': 'Arial, Helvetica, sans-serif',
  'Avenir': '"Avenir Next", Avenir, "Helvetica Neue", sans-serif',
  'Times': '"Times New Roman", Times, Georgia, serif',
  'System': '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
};

interface CurvedTextScrollParams {
  // Layout
  scale: number;
  tilt: number;
  lineSpacing: number;
  // Text
  fontSize: number;
  fontFamily: string;
  fontWeight: string;
  // Colors
  textColor: string;
  backgroundColor: string;
  dotColor: string;
  // Dot
  dotSize: number;
  indentAmount: number;
  // Animation
  speed: number;
  arcRadius: number;
}

const animation: AnimationDefinition<CurvedTextScrollParams> = {
  id: 'curved-text-scroll',
  name: 'Curved Text Scroll',
  fps: 60,
  durationMs: 10000,
  width: 1920,
  height: 1080,
  background: '#000000',

  params: {
    defaults: {
      scale: 1,
      tilt: 0,
      lineSpacing: 1.6,
      fontSize: 48,
      fontFamily: 'Inter',
      fontWeight: '700',
      textColor: '#FFFFFF',
      backgroundColor: '#000000',
      dotColor: '#3B82F6',
      dotSize: 8,
      indentAmount: 200,
      speed: 1,
      arcRadius: 800,
    },
    schema: {
      ...folder('Layout', {
        scale: number({ value: 1, min: 0.1, max: 3, step: 0.1, label: 'Scale' }),
        tilt: number({ value: 0, min: -20, max: 20, step: 0.5, label: 'Global Tilt (°)' }),
        lineSpacing: number({ value: 1.6, min: 1, max: 4, step: 0.1, label: 'Line Spacing' }),
      }),
      ...folder('Text', {
        fontSize: number({ value: 48, min: 20, max: 100, step: 1, label: 'Font Size' }),
        fontFamily: select({
          value: 'Inter',
          options: [
            'Inter',
            'SF Pro',
            'Helvetica',
            'Arial',
            'Avenir',
            'Georgia',
            'Times',
            'Courier',
            'System',
          ],
          label: 'Font',
        }),
        fontWeight: select({
          value: '700',
          options: [
            { value: '300', label: 'Light' },
            { value: '400', label: 'Regular' },
            { value: '500', label: 'Medium' },
            { value: '600', label: 'Semi Bold' },
            { value: '700', label: 'Bold' },
            { value: '800', label: 'Extra Bold' },
            { value: '900', label: 'Black' },
          ],
          label: 'Font Weight',
        }),
      }),
      ...folder('Colors', {
        textColor: color({ value: '#FFFFFF', label: 'Text Color' }),
        backgroundColor: color({ value: '#000000', label: 'Background' }),
        dotColor: color({ value: '#3B82F6', label: 'Dot Color' }),
      }),
      ...folder('Dot', {
        dotSize: number({ value: 8, min: 2, max: 20, step: 1, label: 'Dot Size' }),
        indentAmount: number({ value: 200, min: 0, max: 500, step: 10, label: 'Indent Amount' }),
      }),
      ...folder('Animation', {
        speed: number({ value: 1, min: 0.1, max: 3, step: 0.1, label: 'Speed' }),
        arcRadius: number({ value: 800, min: 200, max: 3000, step: 10, label: 'Arc Radius' }),
      }),
    },
  },

  render({ ctx, width, height, progress, params }) {
    const {
      scale, tilt, lineSpacing, fontSize, fontFamily, fontWeight,
      textColor, backgroundColor, dotColor, dotSize, indentAmount,
      speed, arcRadius,
    } = params;

    const adjustedProgress = (progress * speed) % 1;
    const resolvedFont = fontMap[fontFamily] || fontMap['Inter'];

    // Clear background
    ctx.fillStyle = backgroundColor;
    ctx.fillRect(0, 0, width, height);

    ctx.save();
    // Position origin — dot sits here (center-left of canvas)
    ctx.translate(width * 0.38, height / 2);
    ctx.scale(scale, scale);
    // Optional global tilt
    ctx.rotate(tilt * Math.PI / 180);

    // ── Text-on-a-circle model ─────────────────────────────────────────────
    // Think of it as text written around the circumference of a large circle.
    // The whole circle spins as a rigid body. We only see the front face.
    //
    // arcRadius controls curvature:  large → nearly flat, small → tight curve
    // lineSpacing controls density:  gap between adjacent items on the arc

    const pixelSpacing = fontSize * lineSpacing;
    // Angular spacing = arc-length / radius
    const angularSpacing = pixelSpacing / arcRadius;

    // Fill the full 2π circle by repeating city names as needed
    const itemsNeeded = Math.max(cities.length, Math.ceil((2 * Math.PI) / angularSpacing));

    // Whole-circle rotation driven by progress
    const wheelAngle = adjustedProgress * 2 * Math.PI;

    // Very narrow sigma — indent only hits the single frontmost item
    const indentSigma = angularSpacing * 0.3;

    // Collect visible items
    const items: {
      text: string;
      angle: number;
      y: number;
      z: number;
      opacity: number;
    }[] = [];

    for (let i = 0; i < itemsNeeded; i++) {
      // Fixed slot on the circle
      const slotAngle = i * angularSpacing;
      // Apply wheel rotation, then normalise to [-π, π]
      let angle = slotAngle - wheelAngle;
      angle = ((angle % (2 * Math.PI)) + 3 * Math.PI) % (2 * Math.PI) - Math.PI;

      // 3D circle → 2D projection
      const y = arcRadius * Math.sin(angle);
      const z = arcRadius * Math.cos(angle);

      // Only render front hemisphere
      if (z <= 0) continue;

      // Opacity: bright at front, fading toward edges
      const normalZ = z / arcRadius; // 0 at sides → 1 at front
      const opacity = Math.pow(normalZ, 1.3);
      if (opacity < 0.03) continue;

      items.push({
        text: cities[i % cities.length],
        angle,
        y,
        z,
        opacity,
      });
    }

    // Sort back → front (painter's order)
    items.sort((a, b) => a.z - b.z);

    // ── Draw text ──────────────────────────────────────────────────────────
    const font = `${fontWeight} ${fontSize}px ${resolvedFont}`;
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'left';

    for (const item of items) {
      // Indent: tight Gaussian centered at angle 0 (the front)
      const indent = indentAmount * Math.exp(
        -(item.angle * item.angle) / (2 * indentSigma * indentSigma),
      );

      const baseX = dotSize * 3;

      ctx.save();

      // The circle center is to the LEFT of the dot by arcRadius.
      // 1. Move to circle center
      // 2. Rotate around it by the item's angle
      // 3. Move back outward to the circle edge + text gap
      // This keeps position & rotation rigidly coupled on the circle.
      ctx.translate(-arcRadius, 0);
      ctx.rotate(item.angle);
      ctx.translate(arcRadius + baseX + indent, 0);

      ctx.globalAlpha = item.opacity;
      ctx.fillStyle = textColor;
      ctx.font = font;
      ctx.fillText(item.text, 0, 0);

      ctx.restore();
    }

    // ── Draw the fixed dot (always on top) ─────────────────────────────────
    ctx.globalAlpha = 1;
    ctx.fillStyle = dotColor;
    ctx.beginPath();
    ctx.arc(0, 0, dotSize, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  },
};

export default animation;

import type { AnimationDefinition } from '../../runtime/types';
import { number, color, boolean, folder } from '../../runtime/params';

/**
 * Staggered Scale-In Logo Animation
 * Each path scales in sequentially from 0 to 100% while the entire logo rotates
 * Based on: https://www.figma.com/design/RKbDWsvXEGxSqowLx3YEs5/Visual-Design-Playground?node-id=1369-1121
 */

interface StaggeredLogoParams {
  // Animation
  animationSpeed: number;
  staggerDelay: number;
  scaleInDuration: number;
  initialRotation: number;
  rotationAfterDelay: number;
  // Colors
  backgroundColor: string;
  backgroundDark: boolean;
  redColor: string;
  cyanColor: string;
  greenColor: string;
  yellowColor: string;
  // Effects
  glowIntensity: number;
  glowSize: number;
  // Layout
  logoScale: number;
  loopAnimation: boolean;
}

// SVG Logo Paths (from Figma design)
const logoPaths = {
  // Red vertical pill (left)
  redPill: 'M28.9761 68.8634C28.9761 62.61 34.0837 57.5023 40.3371 57.5023C46.5905 57.5023 51.6982 62.6091 51.6982 68.8634V97.3023C51.6982 103.556 46.5914 108.663 40.3371 108.663C34.0837 108.663 28.9761 103.556 28.9761 97.3023V68.8634Z',
  // Cyan horizontal pill (top-left)
  cyanPill: 'M40.3362 28.9755C46.5896 28.9755 51.6973 34.0832 51.6973 40.3366C51.6973 46.59 46.5905 51.6977 40.3362 51.6977H11.8973C5.64392 51.6977 0.537109 46.5908 0.537109 40.3366C0.537109 34.0832 5.64477 28.9755 11.8982 28.9755H40.3362Z',
  // Green vertical pill (right)
  greenPill: 'M80.2246 40.3366C80.2246 46.59 75.1169 51.6977 68.8635 51.6977C62.6101 51.6977 57.5024 46.5909 57.5024 40.3366V11.8977C57.5024 5.64428 62.6092 0.537476 68.8635 0.537476C75.1169 0.537476 80.2246 5.64513 80.2246 11.8985V40.3366Z',
  // Yellow horizontal pill (bottom-right)
  yellowPill: 'M68.8635 80.2244C62.6101 80.2244 57.5024 75.1168 57.5024 68.8634C57.5024 62.61 62.6092 57.5023 68.8635 57.5023H97.3024C103.556 57.5023 108.663 62.6091 108.663 68.8634C108.663 75.1168 103.556 80.2244 97.3024 80.2244H68.8635Z',
  // Additional corner pieces
  greenCorner: 'M97.303 28.9755C91.0487 28.9755 85.9487 34.0832 85.9487 40.3366V51.6977H97.303C103.556 51.6977 108.664 46.59 108.664 40.3366C108.664 34.0832 103.557 28.9755 97.303 28.9755Z',
  cyanCorner: 'M28.9761 11.8977C28.9761 18.1519 34.0837 23.2519 40.3371 23.2519L51.6982 23.2528V11.8985C51.6982 5.64513 46.5905 0.537476 40.3371 0.537476C34.0837 0.537476 28.9761 5.64343 28.9761 11.8977Z',
  redCorner: 'M11.8973 80.2244C18.1516 80.2244 23.2516 75.1168 23.2516 68.8634L23.2524 57.5023H11.8982C5.64477 57.5023 0.537109 62.61 0.537109 68.8634C0.537109 75.1168 5.64306 80.2244 11.8973 80.2244Z',
  yellowCorner: 'M80.2246 97.3023C80.2246 91.0481 75.1169 85.9481 68.8635 85.9481H57.5024V97.3023C57.5024 103.556 62.6101 108.663 68.8635 108.663C75.1169 108.663 80.2246 103.557 80.2246 97.3023Z',
};

// Easing function - smooth ease out
const easeOutQuart = (t: number): number => {
  return 1 - Math.pow(1 - t, 4);
};

// Animation sequence: Blue → Green → Yellow → Red
// Each color: main bar shape first, then corner droplet
const animationSequence = [
  { path: 'cyanPill', color: 'cyan' },      // Blue bar
  { path: 'cyanCorner', color: 'cyan' },   // Blue droplet
  { path: 'greenPill', color: 'green' },   // Green bar
  { path: 'greenCorner', color: 'green' }, // Green droplet
  { path: 'yellowPill', color: 'yellow' }, // Yellow bar
  { path: 'yellowCorner', color: 'yellow' }, // Yellow droplet
  { path: 'redPill', color: 'red' },       // Red bar
  { path: 'redCorner', color: 'red' },     // Red droplet
];

const animation: AnimationDefinition<StaggeredLogoParams> = {
  id: 'slack-logo',
  name: 'Staggered Logo Reveal',
  fps: 60,
  durationMs: 5000, // 5 second total animation
  width: 400,
  height: 400,
  background: '#0A0A0F',

  params: {
    defaults: {
      animationSpeed: 1.5,
      staggerDelay: 0.18,
      scaleInDuration: 0.3,
      initialRotation: -270,
      rotationAfterDelay: 0.3,
      backgroundColor: '#ffffff',
      backgroundDark: false,
      redColor: '#de1c59',
      cyanColor: '#35c5f0',
      greenColor: '#2eb57d',
      yellowColor: '#ebb02e',
      glowIntensity: 0,
      glowSize: 15,
      logoScale: 1.25,
      loopAnimation: false,
    },
    schema: {
      ...folder('Animation', {
        animationSpeed: number({ value: 1.0, min: 0.25, max: 3, step: 0.25 }),
        staggerDelay: number({ value: 0.12, min: 0.05, max: 0.5, step: 0.01 }),
        scaleInDuration: number({ value: 0.35, min: 0.1, max: 1, step: 0.05 }),
        initialRotation: number({ value: -720, min: -1440, max: 0, step: 45 }),
        rotationAfterDelay: number({ value: 0.5, min: 0, max: 2, step: 0.1 }),
        loopAnimation: boolean({ value: true }),
      }),
      ...folder('Colors', {
        backgroundDark: boolean({ value: true }),
        backgroundColor: color({ value: '#0A0A0F' }),
        redColor: color({ value: '#DE1C59' }),
        cyanColor: color({ value: '#35C5F0' }),
        greenColor: color({ value: '#2EB57D' }),
        yellowColor: color({ value: '#EBB02E' }),
      }),
      ...folder('Effects', {
        glowIntensity: number({ value: 0.8, min: 0, max: 1, step: 0.1 }),
        glowSize: number({ value: 20, min: 0, max: 50, step: 5 }),
      }),
      ...folder('Layout', {
        logoScale: number({ value: 2.5, min: 1, max: 5, step: 0.25 }),
      }),
    },
  },

  setup() {
    // No setup needed - using pure SVG paths
  },

  render({ ctx, time, width, height, params }) {
    const {
      animationSpeed,
      staggerDelay,
      scaleInDuration,
      initialRotation,
      rotationAfterDelay,
      backgroundColor,
      backgroundDark,
      redColor,
      cyanColor,
      greenColor,
      yellowColor,
      glowIntensity,
      glowSize,
      logoScale,
      loopAnimation,
    } = params;

    // Clear background - use dark if enabled
    ctx.fillStyle = backgroundDark ? '#0A0A0F' : backgroundColor;
    ctx.fillRect(0, 0, width, height);

    // Calculate animation progress
    const adjustedTime = time * animationSpeed;
    const totalDuration = 5; // 5 seconds total (including rotation after delay)
    const loopTime = loopAnimation ? adjustedTime % totalDuration : Math.min(adjustedTime, totalDuration);
    const globalProgress = loopTime / totalDuration;

    // Calculate total animation time for all paths
    const numPaths = animationSequence.length;
    const totalStaggerTime = staggerDelay * (numPaths - 1) + scaleInDuration;
    
    // Calculate animation phase (for path scaling)
    const scalePhaseEnd = totalStaggerTime / totalDuration;
    let animationPhase = 0;
    
    if (globalProgress <= scalePhaseEnd) {
      animationPhase = globalProgress / scalePhaseEnd;
    } else {
      animationPhase = 1; // All paths are fully scaled
    }

    // Calculate rotation (starts at initialRotation, ends at 0°)
    // The rotation is distributed across two phases for smooth easing
    let rotation = 0;
    
    // Calculate how much rotation happens in each phase
    const rotationDuringPaths = initialRotation * (1 - rotationAfterDelay);
    const rotationAfterPaths = initialRotation * rotationAfterDelay;
    
    if (globalProgress <= scalePhaseEnd) {
      // During path animation: rotate from initialRotation toward 0
      const rotated = rotationDuringPaths * animationPhase;
      rotation = ((initialRotation - rotated) * Math.PI) / 180;
    } else {
      // After all paths appear: continue rotating smoothly to 0 with ease-out
      const afterProgress = (globalProgress - scalePhaseEnd) / (1 - scalePhaseEnd);
      const easedProgress = easeOutQuart(afterProgress);
      const rotated = rotationAfterPaths * easedProgress;
      rotation = ((rotationAfterPaths - rotated) * Math.PI) / 180;
    }

    // Center the logo
    const centerX = width / 2;
    const centerY = height / 2;

    // Get color mapping
    const colorMap: Record<string, string> = {
      red: redColor,
      cyan: cyanColor,
      green: greenColor,
      yellow: yellowColor,
    };

    // Apply global transforms (rotation of entire logo)
    ctx.save();
    ctx.translate(centerX, centerY);
    ctx.rotate(rotation);
    ctx.scale(logoScale, logoScale);
    
    // Offset to center the logo (original viewBox is 110x110, centered at 54.6)
    ctx.translate(-54.6, -54.6);

    // Draw each path with its individual scale animation
    animationSequence.forEach((item, index) => {
      const pathKey = item.path as keyof typeof logoPaths;
      const pathData = logoPaths[pathKey];
      const fillColor = colorMap[item.color];

      // Calculate timing for this specific path
      const startTime = index * staggerDelay;
      
      // Calculate scale for this path (0 to 1) with ease-out
      let pathScale = 0;
      if (animationPhase * totalStaggerTime >= startTime) {
        const localProgress = Math.min(
          (animationPhase * totalStaggerTime - startTime) / scaleInDuration,
          1
        );
        pathScale = easeOutQuart(localProgress);
      }

      if (pathScale > 0) {
        // Get the center of this specific path for scaling from its center
        // Using approximate centers for each path based on the viewBox
        const pathCenters: Record<string, [number, number]> = {
          redCorner: [17.9, 69.4],
          redPill: [40.3, 83.1],
          cyanCorner: [40.3, 17.6],
          cyanPill: [26.2, 40.3],
          greenCorner: [91.9, 40.3],
          greenPill: [68.9, 26.2],
          yellowCorner: [68.9, 91.9],
          yellowPill: [83.1, 68.9],
        };

        const [cx, cy] = pathCenters[pathKey] || [54.6, 54.6];

        ctx.save();
        
        // Scale from the path's center
        ctx.translate(cx, cy);
        ctx.scale(pathScale, pathScale);
        ctx.translate(-cx, -cy);

        // Add glow effect
        if (glowIntensity > 0 && glowSize > 0) {
          ctx.shadowColor = fillColor;
          ctx.shadowBlur = glowSize * glowIntensity * pathScale;
          ctx.shadowOffsetX = 0;
          ctx.shadowOffsetY = 0;
        }

        // Draw the path
        const path = new Path2D(pathData);
        ctx.fillStyle = fillColor;
        ctx.fill(path);

        // Draw glow again for stronger effect (double glow)
        if (glowIntensity > 0 && glowSize > 0) {
          ctx.shadowBlur = glowSize * glowIntensity * pathScale * 0.5;
          ctx.fill(path);
        }

        ctx.restore();
      }
    });

    ctx.restore();
  },
};

export default animation;

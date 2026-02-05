import type { AnimationDefinition } from '../../runtime/types';
import { number, color, folder } from '../../runtime/params';

interface SquareToCubeParams {
  // Layout
  scale: number;
  // Colors
  primaryColor: string;
  secondaryColor: string;
  tertiaryColor: string;
  backgroundColor: string;
  // Animation
  speed: number;
  rotationAmount: number;
}

// Easing functions for cinematic feel
const easeInOutCubic = (t: number): number => {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
};

const easeInOutQuart = (t: number): number => {
  return t < 0.5 ? 8 * t * t * t * t : 1 - Math.pow(-2 * t + 2, 4) / 2;
};

const animation: AnimationDefinition<SquareToCubeParams> = {
  id: 'square-to-cube',
  name: 'Square to Cube',
  fps: 60,
  durationMs: 4000,
  width: 800,
  height: 800,
  background: '#0a0a0a',

  params: {
    defaults: {
      scale: 1,
      primaryColor: '#3b82f6',
      secondaryColor: '#2563eb',
      tertiaryColor: '#1e40af',
      backgroundColor: '#0a0a0a',
      speed: 1,
      rotationAmount: 0.25,
    },
    schema: {
      ...folder('Layout', {
        scale: number({ value: 1, min: 0.1, max: 3, step: 0.1, label: 'Scale' }),
      }),
      ...folder('Colors', {
        primaryColor: color({ value: '#3b82f6', label: 'Face 1 (Top)' }),
        secondaryColor: color({ value: '#2563eb', label: 'Face 2 (Left)' }),
        tertiaryColor: color({ value: '#1e40af', label: 'Face 3 (Right)' }),
        backgroundColor: color({ value: '#0a0a0a', label: 'Background' }),
      }),
      ...folder('Animation', {
        speed: number({ value: 1, min: 0.1, max: 3, step: 0.1, label: 'Speed' }),
        rotationAmount: number({ value: 0.25, min: 0, max: 1, step: 0.05, label: 'Rotation Amount' }),
      }),
    },
  },

  render({ ctx, width, height, progress, params }) {
    const { scale, primaryColor, secondaryColor, tertiaryColor, backgroundColor, speed, rotationAmount } = params;

    // Adjust progress with speed
    const adjustedProgress = (progress * speed) % 1;

    // Split animation into two phases: square to cube (0-0.5), cube to square (0.5-1)
    let morphProgress: number;
    if (adjustedProgress < 0.5) {
      // First half: square to cube
      morphProgress = easeInOutCubic(adjustedProgress * 2);
    } else {
      // Second half: cube to square
      morphProgress = easeInOutCubic((1 - adjustedProgress) * 2);
    }

    // Clear background
    ctx.fillStyle = backgroundColor;
    ctx.fillRect(0, 0, width, height);

    // Center and scale
    ctx.save();
    ctx.translate(width / 2, height / 2);
    ctx.scale(scale, scale);

    // Add rotation during morph for cinematic effect
    const rotation = morphProgress * Math.PI * 2 * rotationAmount;
    ctx.rotate(rotation);

    // Base size
    const baseSize = 200;

    // Interpolate between 2D square and 3D isometric cube
    // In 2D mode (morphProgress = 0): just a flat square
    // In 3D mode (morphProgress = 1): isometric cube

    // Isometric projection angles
    const isoAngle = Math.PI / 6; // 30 degrees
    const depth = baseSize * 0.6;

    // Calculate the three faces of the cube with depth based on morph progress
    const currentDepth = depth * morphProgress;

    // Top face (parallelogram in isometric view)
    const topPoints = [
      { x: 0, y: -baseSize / 2 - currentDepth * Math.sin(isoAngle) },
      { x: baseSize / 2 + currentDepth * Math.cos(isoAngle), y: -baseSize / 2 - currentDepth * Math.sin(isoAngle) * 0.5 },
      { x: baseSize / 2 + currentDepth * Math.cos(isoAngle), y: baseSize / 2 - currentDepth * Math.sin(isoAngle) * 0.5 },
      { x: 0, y: baseSize / 2 },
    ];

    // Left face (when morphProgress = 0, this collapses to the left edge)
    const leftPoints = [
      { x: -baseSize / 2, y: -baseSize / 2 },
      { x: 0, y: -baseSize / 2 - currentDepth * Math.sin(isoAngle) },
      { x: 0, y: baseSize / 2 },
      { x: -baseSize / 2, y: baseSize / 2 },
    ];

    // Right face (when morphProgress = 0, this collapses to the right edge)
    const rightPoints = [
      { x: baseSize / 2, y: -baseSize / 2 },
      { x: baseSize / 2 + currentDepth * Math.cos(isoAngle), y: -baseSize / 2 - currentDepth * Math.sin(isoAngle) * 0.5 },
      { x: baseSize / 2 + currentDepth * Math.cos(isoAngle), y: baseSize / 2 - currentDepth * Math.sin(isoAngle) * 0.5 },
      { x: baseSize / 2, y: baseSize / 2 },
    ];

    // Draw shadow for depth
    const shadowOffset = 20 + morphProgress * 30;
    const shadowBlur = 30 + morphProgress * 40;
    const shadowOpacity = 0.3 + morphProgress * 0.3;
    
    ctx.save();
    ctx.translate(shadowOffset, shadowOffset);
    ctx.fillStyle = `rgba(0, 0, 0, ${shadowOpacity})`;
    ctx.filter = `blur(${shadowBlur}px)`;
    
    // Draw shadow shape (simplified)
    ctx.beginPath();
    ctx.rect(-baseSize / 2, -baseSize / 2, baseSize, baseSize);
    ctx.fill();
    ctx.restore();

    // Draw the three faces
    // Left face (darker)
    if (morphProgress > 0.01) {
      ctx.fillStyle = secondaryColor;
      ctx.beginPath();
      ctx.moveTo(leftPoints[0].x, leftPoints[0].y);
      for (let i = 1; i < leftPoints.length; i++) {
        ctx.lineTo(leftPoints[i].x, leftPoints[i].y);
      }
      ctx.closePath();
      ctx.fill();

      // Add subtle edge highlight
      ctx.strokeStyle = `rgba(255, 255, 255, ${0.1 * morphProgress})`;
      ctx.lineWidth = 2;
      ctx.stroke();
    }

    // Right face (darkest)
    if (morphProgress > 0.01) {
      ctx.fillStyle = tertiaryColor;
      ctx.beginPath();
      ctx.moveTo(rightPoints[0].x, rightPoints[0].y);
      for (let i = 1; i < rightPoints.length; i++) {
        ctx.lineTo(rightPoints[i].x, rightPoints[i].y);
      }
      ctx.closePath();
      ctx.fill();

      // Add subtle edge highlight
      ctx.strokeStyle = `rgba(255, 255, 255, ${0.05 * morphProgress})`;
      ctx.lineWidth = 2;
      ctx.stroke();
    }

    // Top face (lightest) - this is always visible
    ctx.fillStyle = primaryColor;
    ctx.beginPath();
    ctx.moveTo(topPoints[0].x, topPoints[0].y);
    for (let i = 1; i < topPoints.length; i++) {
      ctx.lineTo(topPoints[i].x, topPoints[i].y);
    }
    ctx.closePath();
    ctx.fill();

    // Add edge highlight for depth
    ctx.strokeStyle = `rgba(255, 255, 255, ${0.15 * (1 + morphProgress)})`;
    ctx.lineWidth = 2;
    ctx.stroke();

    // Draw crisp edges for definition
    ctx.strokeStyle = `rgba(0, 0, 0, ${0.2})`;
    ctx.lineWidth = 1;
    ctx.stroke();

    // Add specular highlight on top face for cinematic look
    const highlightSize = 40;
    const highlightOpacity = 0.3 * easeInOutQuart(Math.sin(adjustedProgress * Math.PI));
    const gradient = ctx.createRadialGradient(
      -baseSize / 4, 
      -baseSize / 4, 
      0, 
      -baseSize / 4, 
      -baseSize / 4, 
      highlightSize
    );
    gradient.addColorStop(0, `rgba(255, 255, 255, ${highlightOpacity})`);
    gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
    
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.moveTo(topPoints[0].x, topPoints[0].y);
    for (let i = 1; i < topPoints.length; i++) {
      ctx.lineTo(topPoints[i].x, topPoints[i].y);
    }
    ctx.closePath();
    ctx.fill();

    ctx.restore();
  },
};

export default animation;

import type { AnimationDefinition } from '../../runtime/types';
import { number, color, folder } from '../../runtime/params';

interface CircleLoaderParams {
  // Layout
  scale: number;
  spacing: number;
  circleRadius: number;
  // Colors
  circle1Color: string;
  circle2Color: string;
  circle3Color: string;
  backgroundColor: string;
  // Animation
  speed: number;
  jumpHeight: number;
}

// Easing function for smooth motion
const easeInOutCubic = (t: number): number => {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
};

const animation: AnimationDefinition<CircleLoaderParams> = {
  id: 'circle-loader',
  name: 'Circle Loader',
  fps: 60,
  durationMs: 2000,
  width: 800,
  height: 400,
  background: '#FFFFFF',

  params: {
    defaults: {
      scale: 0.3,
      spacing: 70,
      circleRadius: 20,
      circle1Color: '#ffffff',
      circle2Color: '#ffffff',
      circle3Color: '#ffffff',
      backgroundColor: '#000000',
      speed: 1.4,
      jumpHeight: 120,
    },
    schema: {
      ...folder('Layout', {
        scale: number({ value: 1, min: 0.1, max: 3, step: 0.1, label: 'Scale' }),
        spacing: number({ value: 80, min: 40, max: 200, step: 10, label: 'Circle Spacing' }),
        circleRadius: number({ value: 30, min: 10, max: 60, step: 5, label: 'Circle Radius' }),
      }),
      ...folder('Colors', {
        circle1Color: color({ value: '#FF6B6B', label: 'Circle 1 Color' }),
        circle2Color: color({ value: '#4ECDC4', label: 'Circle 2 Color' }),
        circle3Color: color({ value: '#45B7D1', label: 'Circle 3 Color' }),
        backgroundColor: color({ value: '#FFFFFF', label: 'Background' }),
      }),
      ...folder('Animation', {
        speed: number({ value: 1, min: 0.1, max: 3, step: 0.1, label: 'Speed' }),
        jumpHeight: number({ value: 80, min: 20, max: 150, step: 10, label: 'Jump Height' }),
      }),
    },
  },

  render({ ctx, width, height, progress, params }) {
    const {
      scale,
      spacing,
      circleRadius,
      circle1Color,
      circle2Color,
      circle3Color,
      backgroundColor,
      speed,
      jumpHeight,
    } = params;

    // Apply speed to progress
    const adjustedProgress = (progress * speed) % 1;

    // Clear background
    ctx.fillStyle = backgroundColor;
    ctx.fillRect(0, 0, width, height);

    // Center the animation
    ctx.save();
    ctx.translate(width / 2, height / 2);
    ctx.scale(scale, scale);

    // Define circle colors (fixed identity for each circle)
    const colors = [circle1Color, circle2Color, circle3Color];
    
    // Physical positions (left, middle, right)
    const positions = [-spacing, 0, spacing];
    
    // The animation continuously rotates circles through positions
    // Each cycle: leftmost circle jumps over the others to the right
    // While it jumps, the other two slide left to maintain balance
    
    const phaseDuration = 1 / 3; // Each jump takes 1/3 of the full cycle
    const currentPhase = Math.floor(adjustedProgress / phaseDuration) % 3;
    const phaseProgress = (adjustedProgress % phaseDuration) / phaseDuration;
    const easedPhaseProgress = easeInOutCubic(phaseProgress);

    // Track which circle ID is at which position at the start of this phase
    // After `currentPhase` rotations, each circle has moved left `currentPhase` times
    const getCircleAtPosition = (posIndex: number): number => {
      return (posIndex + currentPhase) % 3;
    };

    // Draw each circle
    for (let circleId = 0; circleId < 3; circleId++) {
      let circleX: number;
      let circleY: number;
      
      // Find where this circle is at the start of the current phase
      let startPosIndex = -1;
      for (let pos = 0; pos < 3; pos++) {
        if (getCircleAtPosition(pos) === circleId) {
          startPosIndex = pos;
          break;
        }
      }
      
      // The leftmost circle (position 0) is the one jumping
      const jumpingCircleId = getCircleAtPosition(0);
      
      if (circleId === jumpingCircleId) {
        // This circle jumps from left (position 0) to right (position 2)
        circleX = positions[0] + (positions[2] - positions[0]) * easedPhaseProgress;
        
        // Parabolic jump
        const jumpProgress = Math.sin(phaseProgress * Math.PI);
        circleY = -jumpHeight * jumpProgress;
      } else {
        // This circle slides left by one position
        const endPosIndex = startPosIndex - 1;
        
        circleX = positions[startPosIndex] + (positions[endPosIndex] - positions[startPosIndex]) * easedPhaseProgress;
        circleY = 0;
      }

      // Draw the circle
      ctx.save();
      ctx.translate(circleX, circleY);
      
      ctx.fillStyle = colors[circleId];
      ctx.beginPath();
      ctx.arc(0, 0, circleRadius, 0, Math.PI * 2);
      ctx.fill();
      
      ctx.restore();
    }

    ctx.restore();
  },
};

export default animation;

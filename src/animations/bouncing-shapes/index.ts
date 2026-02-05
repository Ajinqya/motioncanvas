import type { AnimationDefinition } from '../../runtime/types';
import { number, color, folder } from '../../runtime/params';

/**
 * Bouncing Shapes Animation
 * A shape bounces with realistic physics and transforms on each floor hit:
 * Circle → Hexagon → Pentagon → Square → Triangle → Circle (loops)
 */

interface BouncingShapesParams {
  scale: number;
  shapeColor: string;
  backgroundColor: string;
  gravity: number;
  bounciness: number;
  shapeSize: number;
}

// Shape types in order of transformation
const SHAPES = ['circle', 'hexagon', 'pentagon', 'square', 'triangle'] as const;
type ShapeType = (typeof SHAPES)[number];

// Draw a regular polygon with n sides
function drawPolygon(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  radius: number,
  sides: number,
  rotation: number = 0
) {
  ctx.beginPath();
  for (let i = 0; i <= sides; i++) {
    const angle = (i * 2 * Math.PI) / sides - Math.PI / 2 + rotation;
    const px = x + radius * Math.cos(angle);
    const py = y + radius * Math.sin(angle);
    if (i === 0) {
      ctx.moveTo(px, py);
    } else {
      ctx.lineTo(px, py);
    }
  }
  ctx.closePath();
}

// Draw shape based on type
function drawShape(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  radius: number,
  shapeType: ShapeType,
  rotation: number = 0
) {
  switch (shapeType) {
    case 'circle':
      ctx.beginPath();
      ctx.arc(x, y, radius, 0, Math.PI * 2);
      ctx.closePath();
      break;
    case 'hexagon':
      drawPolygon(ctx, x, y, radius, 6, rotation);
      break;
    case 'pentagon':
      drawPolygon(ctx, x, y, radius, 5, rotation);
      break;
    case 'square':
      drawPolygon(ctx, x, y, radius, 4, Math.PI / 4 + rotation);
      break;
    case 'triangle':
      drawPolygon(ctx, x, y, radius, 3, rotation);
      break;
  }
}

// Easing for squash/stretch
function easeOutQuad(t: number): number {
  return 1 - (1 - t) * (1 - t);
}

const animation: AnimationDefinition<BouncingShapesParams> = {
  id: 'bouncing-shapes',
  name: 'Bouncing Shapes',
  fps: 60,
  durationMs: 8000,
  width: 400,
  height: 400,
  background: '#1A1A2E',

  params: {
    defaults: {
      scale: 1,
      shapeColor: '#FF6B6B',
      backgroundColor: '#1A1A2E',
      gravity: 1,
      bounciness: 0.7,
      shapeSize: 35,
    },
    schema: {
      ...folder('Layout', {
        scale: number({ value: 1, min: 0.1, max: 3, step: 0.1, label: 'Scale' }),
        shapeSize: number({ value: 35, min: 20, max: 60, step: 5, label: 'Shape Size' }),
      }),
      ...folder('Colors', {
        shapeColor: color({ value: '#FF6B6B', label: 'Shape Color' }),
        backgroundColor: color({ value: '#1A1A2E', label: 'Background' }),
      }),
      ...folder('Physics', {
        gravity: number({ value: 1, min: 0.3, max: 2, step: 0.1, label: 'Gravity' }),
        bounciness: number({ value: 0.7, min: 0.3, max: 0.9, step: 0.05, label: 'Bounciness' }),
      }),
    },
  },

  render({ ctx, time, width, height, params }) {
    const { scale, shapeColor, backgroundColor, gravity, bounciness, shapeSize } = params;

    // Clear with background
    ctx.fillStyle = backgroundColor;
    ctx.fillRect(0, 0, width, height);

    // Physics constants
    const g = 800 * gravity; // Gravity in pixels per second squared
    const floorY = height * 0.82; // Floor position
    const startY = height * 0.2; // Starting position (top)
    const radius = shapeSize;

    // Simulate physics frame by frame to get current state
    let y = startY;
    let vy = 0; // Initial velocity (starting from rest)
    let shapeIndex = 0;
    let bounceCount = 0;
    let lastBounceTime = -1;
    
    const dt = 1 / 120; // Small time step for accurate simulation
    let simTime = 0;
    
    // Run physics simulation up to current time
    while (simTime < time) {
      // Apply gravity: v = v + g * dt
      vy += g * dt;
      
      // Update position: y = y + v * dt
      y += vy * dt;
      
      // Check for floor collision
      if (y + radius >= floorY) {
        // Snap to floor
        y = floorY - radius;
        
        // Only bounce if moving downward with enough speed
        if (vy > 20) {
          // Reflect velocity with energy loss
          vy = -vy * bounciness;
          bounceCount++;
          shapeIndex = bounceCount % SHAPES.length;
          lastBounceTime = simTime;
        } else if (vy > 0) {
          // Too slow, come to rest
          vy = 0;
        }
      }
      
      simTime += dt;
    }
    
    // Calculate morph progress (0 to 1 over 0.25 seconds after bounce)
    const morphDuration = 0.25;
    const timeSinceBounce = time - lastBounceTime;
    let morphProgress = 1;
    if (lastBounceTime >= 0 && timeSinceBounce < morphDuration) {
      morphProgress = timeSinceBounce / morphDuration;
    }
    
    // Get current and previous shape
    const currentShape = SHAPES[shapeIndex];
    const prevShapeIndex = (shapeIndex - 1 + SHAPES.length) % SHAPES.length;
    const prevShape = bounceCount === 0 ? 'circle' : SHAPES[prevShapeIndex];
    
    // Calculate squash and stretch
    const maxVelocity = Math.sqrt(2 * g * (floorY - startY - radius));
    const velocityRatio = Math.min(1, Math.abs(vy) / maxVelocity);
    
    let scaleX = 1;
    let scaleY = 1;
    
    // Squash on floor impact
    if (y + radius >= floorY - 2 && timeSinceBounce < 0.1 && lastBounceTime >= 0) {
      const squashProgress = timeSinceBounce / 0.1;
      const squashAmount = 0.35 * (1 - easeOutQuad(squashProgress));
      scaleX = 1 + squashAmount;
      scaleY = 1 - squashAmount * 0.8;
    } 
    // Stretch when moving fast
    else if (Math.abs(vy) > 100) {
      const stretchAmount = 0.12 * velocityRatio;
      scaleX = 1 - stretchAmount * 0.4;
      scaleY = 1 + stretchAmount;
    }

    // Apply global scale and center
    ctx.save();
    ctx.translate(width / 2, height / 2);
    ctx.scale(scale, scale);
    ctx.translate(-width / 2, -height / 2);
    
    // Draw floor line
    ctx.strokeStyle = shapeColor;
    ctx.lineWidth = 2;
    ctx.globalAlpha = 0.25;
    ctx.beginPath();
    ctx.moveTo(width * 0.15, floorY);
    ctx.lineTo(width * 0.85, floorY);
    ctx.stroke();
    ctx.globalAlpha = 1;
    
    // Draw shadow
    const distFromFloor = floorY - (y + radius);
    const maxDist = floorY - startY - radius;
    const shadowScale = Math.max(0.2, 1 - distFromFloor / maxDist);
    const shadowWidth = radius * 1.2 * shadowScale;
    const shadowHeight = radius * 0.15 * shadowScale;
    const shadowOpacity = 0.3 * shadowScale;
    
    ctx.fillStyle = shapeColor;
    ctx.globalAlpha = shadowOpacity;
    ctx.beginPath();
    ctx.ellipse(width / 2, floorY, shadowWidth, shadowHeight, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
    
    // Draw the shape
    ctx.save();
    ctx.translate(width / 2, y);
    ctx.scale(scaleX, scaleY);
    
    ctx.fillStyle = shapeColor;
    
    // Morph between shapes
    if (morphProgress < 1 && bounceCount > 0) {
      // Simple morph: blend between shapes using alpha
      const easedMorph = easeOutQuad(morphProgress);
      
      // Draw previous shape fading out
      ctx.globalAlpha = 1 - easedMorph;
      drawShape(ctx, 0, 0, radius, prevShape, 0);
      ctx.fill();
      
      // Draw current shape fading in
      ctx.globalAlpha = easedMorph;
      drawShape(ctx, 0, 0, radius, currentShape, 0);
      ctx.fill();
      
      ctx.globalAlpha = 1;
    } else {
      // Draw current shape
      drawShape(ctx, 0, 0, radius, currentShape, 0);
      ctx.fill();
    }
    
    // Add highlight
    ctx.fillStyle = 'rgba(255, 255, 255, 0.25)';
    ctx.beginPath();
    ctx.ellipse(-radius * 0.25, -radius * 0.3, radius * 0.3, radius * 0.2, -0.4, 0, Math.PI * 2);
    ctx.fill();
    
    ctx.restore();
    
    // Draw info in corner
    ctx.fillStyle = shapeColor;
    ctx.globalAlpha = 0.6;
    ctx.font = 'bold 12px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(`Bounces: ${bounceCount}`, 20, 30);
    ctx.font = '11px sans-serif';
    ctx.fillText(`Shape: ${currentShape}`, 20, 46);
    ctx.globalAlpha = 1;
    
    ctx.restore();
  },
};

export default animation;

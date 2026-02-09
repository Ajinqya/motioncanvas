import type { AnimationDefinition } from '../../runtime/types';
import { number, color, folder } from '../../runtime/params';

interface SoftWaveMeshParams {
  // Layout
  scale: number;
  
  // Grid
  density: number;
  amplitude: number;
  speed: number;
  
  // Colors
  gradient1: string;
  gradient2: string;
  gradient3: string;
  lineColor: string;
  lineOpacity: number;
}

const animation: AnimationDefinition<SoftWaveMeshParams> = {
  id: 'soft-wave-mesh',
  name: 'Soft Wave Mesh',
  fps: 60,
  durationMs: 8000,
  width: 1920,
  height: 1080,
  background: '#0a0a0a',

  params: {
    defaults: {
      scale: 1,
      density: 20,
      amplitude: 50,
      speed: 1.4,
      gradient1: '#2e2060',
      gradient2: '#2c1269',
      gradient3: '#3b1278',
      lineColor: '#7847a9',
      lineOpacity: 0.4,
    },
    schema: {
      ...folder('Layout', {
        scale: number({ value: 1, min: 0.1, max: 3, step: 0.1, label: 'Scale' }),
      }),
      ...folder('Grid', {
        density: number({ value: 30, min: 10, max: 80, step: 5, label: 'Density' }),
        amplitude: number({ value: 40, min: 10, max: 150, step: 5, label: 'Amplitude' }),
        speed: number({ value: 1, min: 0.1, max: 3, step: 0.1, label: 'Speed' }),
      }),
      ...folder('Colors', {
        gradient1: color({ value: '#1a1a2e', label: 'Gradient Top' }),
        gradient2: color({ value: '#16213e', label: 'Gradient Mid' }),
        gradient3: color({ value: '#0f3460', label: 'Gradient Bottom' }),
        lineColor: color({ value: '#4a90e2', label: 'Line Color' }),
        lineOpacity: number({ value: 0.15, min: 0, max: 1, step: 0.05, label: 'Line Opacity' }),
      }),
    },
  },

  render({ ctx, width, height, progress, params }) {
    const { scale, density, amplitude, speed, gradient1, gradient2, gradient3, lineColor, lineOpacity } = params;
    
    // Apply speed to progress for looping animation
    const adjustedProgress = (progress * speed) % 1;
    const time = adjustedProgress * Math.PI * 2;
    
    // Center and scale
    ctx.save();
    ctx.translate(width / 2, height / 2);
    ctx.scale(scale, scale);
    
    const scaledWidth = width / scale;
    const scaledHeight = height / scale;
    
    // Draw gradient background
    const bgGradient = ctx.createLinearGradient(0, -scaledHeight / 2, 0, scaledHeight / 2);
    bgGradient.addColorStop(0, gradient1);
    bgGradient.addColorStop(0.5, gradient2);
    bgGradient.addColorStop(1, gradient3);
    
    ctx.fillStyle = bgGradient;
    ctx.fillRect(-scaledWidth / 2, -scaledHeight / 2, scaledWidth, scaledHeight);
    
    // Calculate grid spacing
    const gridSize = density;
    const cols = Math.ceil(scaledWidth / gridSize) + 2;
    const rows = Math.ceil(scaledHeight / gridSize) + 2;
    
    // Helper function to calculate wave distortion
    const getWaveOffset = (x: number, y: number, time: number): { dx: number; dy: number } => {
      // Multiple wave layers for complexity
      const wave1X = Math.sin(x * 0.01 + time) * amplitude * 0.4;
      const wave1Y = Math.cos(y * 0.01 + time) * amplitude * 0.4;
      
      const wave2X = Math.sin(x * 0.015 - time * 0.7 + y * 0.005) * amplitude * 0.3;
      const wave2Y = Math.cos(y * 0.015 - time * 0.7 + x * 0.005) * amplitude * 0.3;
      
      const wave3X = Math.sin(x * 0.008 + y * 0.008 + time * 1.3) * amplitude * 0.3;
      const wave3Y = Math.cos(x * 0.008 + y * 0.008 + time * 1.3) * amplitude * 0.3;
      
      return {
        dx: wave1X + wave2X + wave3X,
        dy: wave1Y + wave2Y + wave3Y,
      };
    };
    
    // Calculate grid points with wave distortion
    const points: { x: number; y: number }[][] = [];
    
    for (let row = 0; row < rows; row++) {
      points[row] = [];
      for (let col = 0; col < cols; col++) {
        const baseX = (col * gridSize) - scaledWidth / 2 - gridSize;
        const baseY = (row * gridSize) - scaledHeight / 2 - gridSize;
        
        const offset = getWaveOffset(baseX, baseY, time);
        
        points[row][col] = {
          x: baseX + offset.dx,
          y: baseY + offset.dy,
        };
      }
    }
    
    // Draw the mesh
    ctx.strokeStyle = lineColor;
    ctx.globalAlpha = lineOpacity;
    ctx.lineWidth = 1.5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    
    // Draw horizontal lines
    for (let row = 0; row < rows; row++) {
      ctx.beginPath();
      for (let col = 0; col < cols; col++) {
        const point = points[row][col];
        if (col === 0) {
          ctx.moveTo(point.x, point.y);
        } else {
          ctx.lineTo(point.x, point.y);
        }
      }
      ctx.stroke();
    }
    
    // Draw vertical lines
    for (let col = 0; col < cols; col++) {
      ctx.beginPath();
      for (let row = 0; row < rows; row++) {
        const point = points[row][col];
        if (row === 0) {
          ctx.moveTo(point.x, point.y);
        } else {
          ctx.lineTo(point.x, point.y);
        }
      }
      ctx.stroke();
    }
    
    // Add subtle glow at intersection points
    ctx.globalAlpha = lineOpacity * 0.4;
    ctx.fillStyle = lineColor;
    
    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        const point = points[row][col];
        
        // Create a subtle glow at each intersection
        const glowGradient = ctx.createRadialGradient(
          point.x, point.y, 0,
          point.x, point.y, 4
        );
        glowGradient.addColorStop(0, lineColor);
        glowGradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
        
        ctx.fillStyle = glowGradient;
        ctx.beginPath();
        ctx.arc(point.x, point.y, 4, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    
    ctx.restore();
  },
};

export default animation;

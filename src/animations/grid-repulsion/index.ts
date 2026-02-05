import type { AnimationDefinition } from '../../runtime/types';
import { number, color, boolean, folder, select } from '../../runtime/params';

/**
 * Grid Repulsion Animation
 * A main dot moves along a path and repels neighboring grid points
 * based on proximity influence
 */

interface GridRepulsionParams {
  // Layout
  scale: number;
  gridDensityX: number;
  gridDensityY: number;
  gridSpacing: number;
  
  // Shapes
  shape: string;
  shapeSize: number;
  
  // Colors
  backgroundColor: string;
  gridColor: string;
  mainDotColor: string;
  
  // Main Dot
  showMainDot: boolean;
  mainDotSize: number;
  
  // Repulsion
  repulsionRadius: number;
  repulsionStrength: number;
  falloffPower: number;
  
  // Path
  pathType: string;
  pathWidth: number;
  pathHeight: number;
  pathSpeed: number;
  pathOffsetX: number;
  pathOffsetY: number;
}

const animation: AnimationDefinition<GridRepulsionParams> = {
  id: 'grid-repulsion',
  name: 'Grid Repulsion',
  fps: 60,
  durationMs: 6000,
  width: 1920,
  height: 1080,
  background: '#000000',

  params: {
    defaults: {
      scale: 0.5,
      gridDensityX: 60,
      gridDensityY: 35,
      gridSpacing: 75,
      shape: 'circle',
      shapeSize: 6,
      backgroundColor: '#030303',
      gridColor: '#7a7a7a',
      mainDotColor: '#bc3838',
      showMainDot: true,
      mainDotSize: 7,
      repulsionRadius: 370,
      repulsionStrength: 105,
      falloffPower: 2.6,
      pathType: 'horizontal',
      pathWidth: 800,
      pathHeight: 490,
      pathSpeed: 2.2,
      pathOffsetX: 0,
      pathOffsetY: 0,
    },
    schema: {
      ...folder('Layout', {
        scale: number({ value: 1, min: 0.1, max: 3, step: 0.1, label: 'Scale' }),
        gridDensityX: number({ value: 30, min: 5, max: 60, step: 1, label: 'Grid Columns' }),
        gridDensityY: number({ value: 17, min: 5, max: 40, step: 1, label: 'Grid Rows' }),
        gridSpacing: number({ value: 60, min: 20, max: 120, step: 5, label: 'Grid Spacing' }),
      }),
      ...folder('Shape', {
        shape: select({ 
          value: 'circle', 
          options: [
            { label: 'Circle', value: 'circle' },
            { label: 'Square', value: 'square' },
            { label: 'Triangle', value: 'triangle' },
            { label: 'Diamond', value: 'diamond' },
            { label: 'Cross', value: 'cross' },
          ], 
          label: 'Shape Type' 
        }),
        shapeSize: number({ value: 4, min: 1, max: 20, step: 1, label: 'Shape Size' }),
      }),
      ...folder('Colors', {
        backgroundColor: color({ value: '#000000', label: 'Background' }),
        gridColor: color({ value: '#FFFFFF', label: 'Grid Color' }),
        mainDotColor: color({ value: '#FF4444', label: 'Main Dot Color' }),
      }),
      ...folder('Main Dot', {
        showMainDot: boolean({ value: true, label: 'Show Main Dot' }),
        mainDotSize: number({ value: 12, min: 5, max: 40, step: 1, label: 'Main Dot Size' }),
      }),
      ...folder('Repulsion', {
        repulsionRadius: number({ value: 150, min: 50, max: 400, step: 10, label: 'Repulsion Radius' }),
        repulsionStrength: number({ value: 60, min: 10, max: 200, step: 5, label: 'Repulsion Strength' }),
        falloffPower: number({ value: 2, min: 0.5, max: 5, step: 0.1, label: 'Falloff Power' }),
      }),
      ...folder('Path', {
        pathType: select({ 
          value: 'circle', 
          options: [
            { label: 'Circle', value: 'circle' },
            { label: 'Ellipse', value: 'ellipse' },
            { label: 'Figure 8', value: 'figure8' },
            { label: 'Horizontal Line', value: 'horizontal' },
            { label: 'Vertical Line', value: 'vertical' },
            { label: 'Diagonal', value: 'diagonal' },
            { label: 'Square Path', value: 'square' },
            { label: 'Lissajous', value: 'lissajous' },
            { label: 'Spiral Out', value: 'spiral' },
          ], 
          label: 'Path Type' 
        }),
        pathWidth: number({ value: 300, min: 50, max: 800, step: 10, label: 'Path Width' }),
        pathHeight: number({ value: 200, min: 50, max: 500, step: 10, label: 'Path Height' }),
        pathSpeed: number({ value: 1, min: 0.1, max: 5, step: 0.1, label: 'Path Speed' }),
        pathOffsetX: number({ value: 0, min: -500, max: 500, step: 10, label: 'Path Offset X' }),
        pathOffsetY: number({ value: 0, min: -300, max: 300, step: 10, label: 'Path Offset Y' }),
      }),
    },
  },

  render({ ctx, width, height, progress, params }) {
    const {
      scale,
      gridDensityX,
      gridDensityY,
      gridSpacing,
      shape,
      shapeSize,
      backgroundColor,
      gridColor,
      mainDotColor,
      showMainDot,
      mainDotSize,
      repulsionRadius,
      repulsionStrength,
      falloffPower,
      pathType,
      pathWidth,
      pathHeight,
      pathSpeed,
      pathOffsetX,
      pathOffsetY,
    } = params;

    // Clear background
    ctx.fillStyle = backgroundColor;
    ctx.fillRect(0, 0, width, height);

    // Calculate adjusted progress for looping
    const adjustedProgress = (progress * pathSpeed) % 1;
    const t = adjustedProgress * Math.PI * 2;

    // Calculate main dot position based on path type
    let mainDotX = 0;
    let mainDotY = 0;

    switch (pathType) {
      case 'circle':
        mainDotX = Math.cos(t) * pathWidth / 2;
        mainDotY = Math.sin(t) * pathWidth / 2;
        break;
      case 'ellipse':
        mainDotX = Math.cos(t) * pathWidth / 2;
        mainDotY = Math.sin(t) * pathHeight / 2;
        break;
      case 'figure8':
        mainDotX = Math.sin(t) * pathWidth / 2;
        mainDotY = Math.sin(t * 2) * pathHeight / 2;
        break;
      case 'horizontal':
        mainDotX = Math.sin(t) * pathWidth / 2;
        mainDotY = 0;
        break;
      case 'vertical':
        mainDotX = 0;
        mainDotY = Math.sin(t) * pathHeight / 2;
        break;
      case 'diagonal':
        mainDotX = Math.sin(t) * pathWidth / 2;
        mainDotY = Math.sin(t) * pathHeight / 2;
        break;
      case 'square': {
        // Move along square path
        const segment = adjustedProgress * 4;
        const segmentProgress = segment % 1;
        const segmentIndex = Math.floor(segment) % 4;
        const halfW = pathWidth / 2;
        const halfH = pathHeight / 2;
        
        switch (segmentIndex) {
          case 0: // Top edge: left to right
            mainDotX = -halfW + segmentProgress * pathWidth;
            mainDotY = -halfH;
            break;
          case 1: // Right edge: top to bottom
            mainDotX = halfW;
            mainDotY = -halfH + segmentProgress * pathHeight;
            break;
          case 2: // Bottom edge: right to left
            mainDotX = halfW - segmentProgress * pathWidth;
            mainDotY = halfH;
            break;
          case 3: // Left edge: bottom to top
            mainDotX = -halfW;
            mainDotY = halfH - segmentProgress * pathHeight;
            break;
        }
        break;
      }
      case 'lissajous':
        mainDotX = Math.sin(t * 3) * pathWidth / 2;
        mainDotY = Math.sin(t * 2) * pathHeight / 2;
        break;
      case 'spiral': {
        const spiralT = adjustedProgress;
        const spiralRadius = spiralT * Math.min(pathWidth, pathHeight) / 2;
        const spiralAngle = spiralT * Math.PI * 6; // 3 rotations
        mainDotX = Math.cos(spiralAngle) * spiralRadius;
        mainDotY = Math.sin(spiralAngle) * spiralRadius;
        break;
      }
      default:
        mainDotX = Math.cos(t) * pathWidth / 2;
        mainDotY = Math.sin(t) * pathHeight / 2;
    }

    // Apply path offset
    mainDotX += pathOffsetX;
    mainDotY += pathOffsetY;

    // Transform to canvas coordinates (center-based)
    const centerX = width / 2;
    const centerY = height / 2;

    // Calculate grid to fill entire canvas
    const totalGridWidth = gridDensityX * gridSpacing;
    const totalGridHeight = gridDensityY * gridSpacing;
    const startX = -totalGridWidth / 2 + gridSpacing / 2;
    const startY = -totalGridHeight / 2 + gridSpacing / 2;

    ctx.save();
    ctx.translate(centerX, centerY);
    ctx.scale(scale, scale);

    // Draw grid points with repulsion
    for (let row = 0; row < gridDensityY; row++) {
      for (let col = 0; col < gridDensityX; col++) {
        // Original grid position
        const originalX = startX + col * gridSpacing;
        const originalY = startY + row * gridSpacing;

        // Calculate distance from main dot
        const dx = originalX - mainDotX;
        const dy = originalY - mainDotY;
        const distance = Math.sqrt(dx * dx + dy * dy);

        // Calculate repulsion displacement
        let displaceX = 0;
        let displaceY = 0;

        if (distance < repulsionRadius && distance > 0) {
          // Normalized direction away from main dot
          const nx = dx / distance;
          const ny = dy / distance;

          // Calculate repulsion strength based on distance (inverse with falloff)
          const normalizedDist = distance / repulsionRadius;
          const repulsionFactor = Math.pow(1 - normalizedDist, falloffPower);
          const displacement = repulsionStrength * repulsionFactor;

          displaceX = nx * displacement;
          displaceY = ny * displacement;
        }

        // Final position with repulsion
        const finalX = originalX + displaceX;
        const finalY = originalY + displaceY;

        // Calculate opacity based on distance (optional fade effect)
        const opacity = 1;

        // Draw the shape at final position
        ctx.fillStyle = gridColor;
        ctx.globalAlpha = opacity;
        drawShape(ctx, finalX, finalY, shapeSize, shape);
        ctx.globalAlpha = 1;
      }
    }

    // Draw main dot
    if (showMainDot) {
      ctx.fillStyle = mainDotColor;
      ctx.beginPath();
      ctx.arc(mainDotX, mainDotY, mainDotSize, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  },
};

// Helper function to draw different shapes
function drawShape(
  ctx: CanvasRenderingContext2D, 
  x: number, 
  y: number, 
  size: number, 
  shape: string
) {
  ctx.beginPath();
  
  switch (shape) {
    case 'circle':
      ctx.arc(x, y, size, 0, Math.PI * 2);
      ctx.fill();
      break;
      
    case 'square':
      ctx.fillRect(x - size, y - size, size * 2, size * 2);
      break;
      
    case 'triangle': {
      const h = size * Math.sqrt(3);
      ctx.moveTo(x, y - size);
      ctx.lineTo(x - h / 2, y + size / 2);
      ctx.lineTo(x + h / 2, y + size / 2);
      ctx.closePath();
      ctx.fill();
      break;
    }
    
    case 'diamond':
      ctx.moveTo(x, y - size * 1.2);
      ctx.lineTo(x + size, y);
      ctx.lineTo(x, y + size * 1.2);
      ctx.lineTo(x - size, y);
      ctx.closePath();
      ctx.fill();
      break;
      
    case 'cross': {
      const thickness = size * 0.4;
      ctx.fillRect(x - thickness / 2, y - size, thickness, size * 2);
      ctx.fillRect(x - size, y - thickness / 2, size * 2, thickness);
      break;
    }
    
    default:
      ctx.arc(x, y, size, 0, Math.PI * 2);
      ctx.fill();
  }
}

export default animation;

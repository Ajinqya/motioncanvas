import type { AnimationDefinition } from '../../runtime/types';
import { number, color, boolean, folder } from '../../runtime/params';

/**
 * DNA Double Helix Animation
 * Creates a fake 3D effect with circles moving up/down and scaling
 */

interface DNAHelixParams {
  // Layout
  scale: number;
  strandCount: number;
  strandSpacing: number;
  
  // Colors
  backgroundColor: string;
  primaryColor: string;
  secondaryColor: string;
  backboneColor: string;
  
  // Circle settings
  circleMinSize: number;
  circleMaxSize: number;
  
  // Animation
  rotationSpeed: number;
  verticalAmplitude: number;
  wobbleAmount: number;
  wobbleSpeed: number;
  
  // Visual options
  showBackbone: boolean;
  showStipple: boolean;
}

const animation: AnimationDefinition<DNAHelixParams> = {
  id: 'dna-helix',
  name: 'DNA Double Helix',
  fps: 60,
  durationMs: 4000,
  width: 1280,
  height: 720,
  background: '#F8F8F8',

  params: {
    defaults: {
      scale: 0.2,
      strandCount: 16,
      strandSpacing: 65,
      primaryColor: '#ec6580',
      secondaryColor: '#527ee5',
      backboneColor: '#c2c2c2',
      circleMinSize: 4,
      circleMaxSize: 29,
      rotationSpeed: 0.7,
      verticalAmplitude: 150,
      wobbleAmount: 12,
      wobbleSpeed: 2,
      showBackbone: true,
      showStipple: false,
      backgroundColor: '#f7f7f7',
    },
    schema: {
      ...folder('Layout', {
        scale: number({ value: 1, min: 0.1, max: 3, step: 0.1, label: 'Scale' }),
        strandCount: number({ value: 10, min: 4, max: 50, step: 1, label: 'Strand Count' }),
        strandSpacing: number({ value: 60, min: 30, max: 100, step: 5, label: 'Strand Spacing' }),
      }),
      ...folder('Colors', {
        backgroundColor: color({ value: '#F8F8F8', label: 'Background' }),
        primaryColor: color({ value: '#7C4DFF', label: 'Primary Color' }),
        secondaryColor: color({ value: '#B388FF', label: 'Secondary Color' }),
        backboneColor: color({ value: '#9E9E9E', label: 'Backbone Color' }),
      }),
      ...folder('Circles', {
        circleMinSize: number({ value: 8, min: 4, max: 20, step: 1, label: 'Min Size' }),
        circleMaxSize: number({ value: 28, min: 15, max: 50, step: 1, label: 'Max Size' }),
      }),
      ...folder('Animation', {
        rotationSpeed: number({ value: 1, min: 0.1, max: 3, step: 0.1, label: 'Rotation Speed' }),
        verticalAmplitude: number({ value: 80, min: 20, max: 150, step: 5, label: 'Vertical Amplitude' }),
        wobbleAmount: number({ value: 0, min: 0, max: 30, step: 1, label: 'Wobble Amount' }),
        wobbleSpeed: number({ value: 2, min: 0.5, max: 5, step: 0.1, label: 'Wobble Speed' }),
      }),
      ...folder('Visual Options', {
        showBackbone: boolean({ value: true, label: 'Show Backbone' }),
        showStipple: boolean({ value: true, label: 'Show Stipple Effect' }),
      }),
    },
  },

  render({ ctx, time, width, height, params }) {
    const {
      scale,
      strandCount,
      strandSpacing,
      backgroundColor,
      primaryColor,
      secondaryColor,
      backboneColor,
      circleMinSize,
      circleMaxSize,
      rotationSpeed,
      verticalAmplitude,
      wobbleAmount,
      wobbleSpeed,
      showBackbone,
      showStipple,
    } = params;

    // Draw background
    ctx.fillStyle = backgroundColor;
    ctx.fillRect(0, 0, width, height);

    // Center the animation
    ctx.save();
    ctx.translate(width / 2, height / 2);
    ctx.scale(scale, scale);

    const totalWidth = (strandCount - 1) * strandSpacing;
    const startX = -totalWidth / 2;

    // Helper function to draw stippled circle
    const drawStippledCircle = (x: number, y: number, radius: number, fillColor: string) => {
      // Draw main circle
      ctx.fillStyle = fillColor;
      ctx.beginPath();
      ctx.arc(x, y, radius, 0, Math.PI * 2);
      ctx.fill();

      if (showStipple && radius > 10) {
        // Add stipple effect (dots inside)
        const stippleColor = adjustColor(fillColor, -20);
        ctx.fillStyle = stippleColor;
        
        const dotCount = Math.floor(radius * 1.5);
        const innerRadius = radius * 0.8;
        
        for (let i = 0; i < dotCount; i++) {
          const angle = (i / dotCount) * Math.PI * 2 + time;
          const dist = Math.random() * innerRadius;
          const dotX = x + Math.cos(angle) * dist;
          const dotY = y + Math.sin(angle) * dist;
          const dotSize = Math.random() * 1.5 + 0.5;
          
          ctx.beginPath();
          ctx.arc(dotX, dotY, dotSize, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    };

    // Helper function to adjust color brightness
    const adjustColor = (hex: string, amount: number): string => {
      const num = parseInt(hex.slice(1), 16);
      const r = Math.max(0, Math.min(255, (num >> 16) + amount));
      const g = Math.max(0, Math.min(255, ((num >> 8) & 0x00FF) + amount));
      const b = Math.max(0, Math.min(255, (num & 0x0000FF) + amount));
      return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
    };

    // Store all circles to draw them sorted by z-depth (back to front)
    interface Circle {
      x: number;
      y: number;
      size: number;
      color: string;
      z: number;
      strandIndex: number;
    }
    
    const circles: Circle[] = [];
    const backbones: { x: number; y1: number; y2: number }[] = [];

    // Generate circles for both strands
    for (let i = 0; i < strandCount; i++) {
      const baseX = startX + i * strandSpacing;
      const phaseOffset = (i / strandCount) * Math.PI * 2;
      const animPhase = time * rotationSpeed * Math.PI * 2;
      
      // Calculate wobble offset for this column
      const wobbleOffset = Math.sin(time * wobbleSpeed * Math.PI + i * 0.5) * wobbleAmount;
      const x = baseX + wobbleOffset;

      // First strand (leading by PI)
      const phase1 = animPhase + phaseOffset;
      const z1 = Math.sin(phase1);
      const y1 = Math.cos(phase1) * verticalAmplitude;
      const size1 = circleMinSize + ((z1 + 1) / 2) * (circleMaxSize - circleMinSize);
      
      circles.push({
        x,
        y: y1,
        size: size1,
        color: z1 > 0 ? primaryColor : secondaryColor,
        z: z1,
        strandIndex: i,
      });

      // Second strand (offset by PI for double helix)
      const phase2 = animPhase + phaseOffset + Math.PI;
      const z2 = Math.sin(phase2);
      const y2 = Math.cos(phase2) * verticalAmplitude;
      const size2 = circleMinSize + ((z2 + 1) / 2) * (circleMaxSize - circleMinSize);
      
      circles.push({
        x,
        y: y2,
        size: size2,
        color: z2 > 0 ? primaryColor : secondaryColor,
        z: z2,
        strandIndex: i,
      });

      // Store backbone line positions (with wobble)
      backbones.push({ x, y1, y2 });
    }

    // Sort circles by z-depth (back to front)
    circles.sort((a, b) => a.z - b.z);

    // Draw backbone lines first (behind circles)
    if (showBackbone) {
      ctx.strokeStyle = backboneColor;
      ctx.lineWidth = 2;
      ctx.lineCap = 'round';
      
      for (const backbone of backbones) {
        ctx.beginPath();
        ctx.moveTo(backbone.x, backbone.y1);
        ctx.lineTo(backbone.x, backbone.y2);
        ctx.stroke();
      }
    }

    // Draw circles from back to front
    for (const circle of circles) {
      drawStippledCircle(circle.x, circle.y, circle.size, circle.color);
    }

    ctx.restore();
  },
};

export default animation;

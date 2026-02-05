import type { AnimationDefinition } from '../../runtime/types';
import { number, color, folder } from '../../runtime/params';

interface AudioRingParams {
  // Layout
  scale: number;
  innerRadius: number;
  barWidth: number;
  barCount: number;
  rotationSpeed: number;
  // Colors
  primaryColor: string;
  secondaryColor: string;
  backgroundColor: string;
  glowColor: string;
  // Audio Sensitivity
  bassSensitivity: number;
  midSensitivity: number;
  highSensitivity: number;
  // Animation
  smoothing: number;
  glowIntensity: number;
}

// Smoothed values for animation
let smoothedBars: number[] = [];
let smoothedGlow = 0;
let currentRotation = 0;

const animation: AnimationDefinition<AudioRingParams> = {
  id: 'audio-ring',
  name: 'Audio Ring Visualizer',
  fps: 60,
  durationMs: undefined, // Infinite loop
  width: 500,
  height: 500,
  background: '#0a0a0f',

  params: {
    defaults: {
      scale: 1,
      innerRadius: 70,
      barWidth: 1,
      barCount: 48,
      rotationSpeed: 0.3,
      primaryColor: '#b72a9d',
      secondaryColor: '#ff00aa',
      backgroundColor: '#0a0a0f',
      glowColor: '#e175ff',
      bassSensitivity: 2.6,
      midSensitivity: 2,
      highSensitivity: 2.2,
      smoothing: 0.4,
      glowIntensity: 0.8,
    },
    schema: {
      ...folder('Layout', {
        scale: number({ value: 1, min: 0.1, max: 3, step: 0.1, label: 'Scale' }),
        innerRadius: number({ value: 80, min: 20, max: 150, step: 5, label: 'Inner Radius' }),
        barWidth: number({ value: 4, min: 1, max: 20, step: 1, label: 'Bar Width' }),
        barCount: number({ value: 64, min: 16, max: 128, step: 8, label: 'Bar Count' }),
        rotationSpeed: number({ value: 0.2, min: 0, max: 2, step: 0.1, label: 'Rotation Speed' }),
      }),
      ...folder('Colors', {
        primaryColor: color({ value: '#00ffaa', label: 'Primary Color' }),
        secondaryColor: color({ value: '#ff00aa', label: 'Secondary Color' }),
        backgroundColor: color({ value: '#0a0a0f', label: 'Background' }),
        glowColor: color({ value: '#00ffaa', label: 'Glow Color' }),
      }),
      ...folder('Audio Sensitivity', {
        bassSensitivity: number({ value: 1.5, min: 0, max: 3, step: 0.1, label: 'Bass' }),
        midSensitivity: number({ value: 1.0, min: 0, max: 3, step: 0.1, label: 'Mid' }),
        highSensitivity: number({ value: 0.8, min: 0, max: 3, step: 0.1, label: 'High' }),
      }),
      ...folder('Animation', {
        smoothing: number({ value: 0.85, min: 0, max: 0.99, step: 0.01, label: 'Smoothing' }),
        glowIntensity: number({ value: 0.8, min: 0, max: 2, step: 0.1, label: 'Glow Intensity' }),
      }),
    },
  },

  setup() {
    // Reset smoothed values
    smoothedBars = [];
    smoothedGlow = 0;
    currentRotation = 0;
  },

  render({ ctx, width, height, deltaTime, params, audio }) {
    const {
      scale,
      innerRadius,
      barWidth,
      barCount,
      rotationSpeed,
      primaryColor,
      secondaryColor,
      backgroundColor,
      glowColor,
      bassSensitivity,
      midSensitivity,
      highSensitivity,
      smoothing,
      glowIntensity,
    } = params;

    // Clear background
    ctx.fillStyle = backgroundColor;
    ctx.fillRect(0, 0, width, height);

    // Get audio data
    const amplitude = audio?.amplitude ?? 0.5;
    const bass = audio?.bass ?? 0.5;
    const mid = audio?.mid ?? 0.4;
    const high = audio?.high ?? 0.3;
    const frequency = audio?.frequency ?? new Uint8Array(128).fill(128);
    const isBeat = audio?.isBeat ?? false;

    // Initialize smoothed bars if needed
    if (smoothedBars.length !== barCount) {
      smoothedBars = new Array(barCount).fill(0);
    }

    // Update rotation based on audio energy
    const energy = (bass * bassSensitivity + mid * midSensitivity + high * highSensitivity) / 3;
    currentRotation += deltaTime * rotationSpeed * (1 + energy);

    // Smooth the glow
    const targetGlow = amplitude * glowIntensity;
    smoothedGlow = smoothedGlow * smoothing + targetGlow * (1 - smoothing);

    // Center and scale
    ctx.save();
    ctx.translate(width / 2, height / 2);
    ctx.scale(scale, scale);
    ctx.rotate(currentRotation);

    // Draw center glow
    const glowRadius = innerRadius * (1 + smoothedGlow * 0.3);
    const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, glowRadius * 1.5);
    gradient.addColorStop(0, hexToRgba(glowColor, 0.4 * smoothedGlow));
    gradient.addColorStop(0.5, hexToRgba(glowColor, 0.15 * smoothedGlow));
    gradient.addColorStop(1, hexToRgba(glowColor, 0));
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(0, 0, glowRadius * 1.5, 0, Math.PI * 2);
    ctx.fill();

    // Beat pulse effect
    if (isBeat) {
      const pulseGradient = ctx.createRadialGradient(0, 0, innerRadius, 0, 0, innerRadius * 2);
      pulseGradient.addColorStop(0, hexToRgba(primaryColor, 0.3));
      pulseGradient.addColorStop(1, hexToRgba(primaryColor, 0));
      ctx.fillStyle = pulseGradient;
      ctx.beginPath();
      ctx.arc(0, 0, innerRadius * 2, 0, Math.PI * 2);
      ctx.fill();
    }

    // Draw frequency bars around the ring
    const angleStep = (Math.PI * 2) / barCount;
    const maxBarHeight = innerRadius * 0.8;

    for (let i = 0; i < barCount; i++) {
      const angle = i * angleStep - Math.PI / 2;
      
      // Sample frequency data
      const freqIndex = Math.floor((i / barCount) * frequency.length);
      const freqValue = frequency[freqIndex] / 255;
      
      // Apply sensitivity based on frequency range
      let sensitivity = midSensitivity;
      if (i < barCount * 0.15) {
        sensitivity = bassSensitivity;
      } else if (i > barCount * 0.6) {
        sensitivity = highSensitivity;
      }
      
      const targetHeight = freqValue * maxBarHeight * sensitivity;
      
      // Smooth the bar height
      smoothedBars[i] = smoothedBars[i] * smoothing + targetHeight * (1 - smoothing);
      const barHeight = Math.max(2, smoothedBars[i]);

      // Calculate bar position
      const x1 = Math.cos(angle) * innerRadius;
      const y1 = Math.sin(angle) * innerRadius;
      const x2 = Math.cos(angle) * (innerRadius + barHeight);
      const y2 = Math.sin(angle) * (innerRadius + barHeight);

      // Color gradient based on frequency
      const t = i / barCount;
      const barColor = lerpColor(primaryColor, secondaryColor, t);

      // Draw bar with glow
      ctx.strokeStyle = barColor;
      ctx.lineWidth = barWidth;
      ctx.lineCap = 'round';
      
      // Glow effect
      ctx.shadowColor = barColor;
      ctx.shadowBlur = 10 * smoothedGlow;
      
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();
    }

    // Reset shadow
    ctx.shadowBlur = 0;

    // Draw inner ring
    ctx.strokeStyle = hexToRgba(primaryColor, 0.5);
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, 0, innerRadius - 5, 0, Math.PI * 2);
    ctx.stroke();

    ctx.restore();
  },
};

// Helper functions
function hexToRgba(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function lerpColor(color1: string, color2: string, t: number): string {
  const r1 = parseInt(color1.slice(1, 3), 16);
  const g1 = parseInt(color1.slice(3, 5), 16);
  const b1 = parseInt(color1.slice(5, 7), 16);
  
  const r2 = parseInt(color2.slice(1, 3), 16);
  const g2 = parseInt(color2.slice(3, 5), 16);
  const b2 = parseInt(color2.slice(5, 7), 16);
  
  const r = Math.round(r1 + (r2 - r1) * t);
  const g = Math.round(g1 + (g2 - g1) * t);
  const b = Math.round(b1 + (b2 - b1) * t);
  
  return `rgb(${r}, ${g}, ${b})`;
}

export default animation;

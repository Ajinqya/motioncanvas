import type { AnimationDefinition } from '../../runtime/types';
import { number, color, folder } from '../../runtime/params';

interface AudioConstellationParams {
  // Layout
  scale: number;
  particleCount: number;
  particleSize: number;
  connectionDistance: number;
  // Colors
  primaryColor: string;
  secondaryColor: string;
  backgroundColor: string;
  lineColor: string;
  // Audio Sensitivity
  bassSensitivity: number;
  midSensitivity: number;
  highSensitivity: number;
  // Animation
  baseSpeed: number;
  smoothing: number;
  pulseIntensity: number;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  baseSize: number;
  phase: number;
  freqBand: 'bass' | 'mid' | 'high';
}

// State
let particles: Particle[] = [];
let smoothedAmplitude = 0;
let smoothedBass = 0;
let smoothedMid = 0;
let smoothedHigh = 0;
let canvasWidth = 0;
let canvasHeight = 0;

function initParticles(count: number, width: number, height: number) {
  particles = [];
  for (let i = 0; i < count; i++) {
    const freqBands: Array<'bass' | 'mid' | 'high'> = ['bass', 'mid', 'high'];
    particles.push({
      x: Math.random() * width,
      y: Math.random() * height,
      vx: (Math.random() - 0.5) * 2,
      vy: (Math.random() - 0.5) * 2,
      baseSize: 2 + Math.random() * 3,
      phase: Math.random() * Math.PI * 2,
      freqBand: freqBands[Math.floor(Math.random() * 3)],
    });
  }
  canvasWidth = width;
  canvasHeight = height;
}

const animation: AnimationDefinition<AudioConstellationParams> = {
  id: 'audio-constellation',
  name: 'Audio Constellation',
  fps: 60,
  durationMs: undefined, // Infinite loop
  width: 600,
  height: 600,
  background: '#050510',

  params: {
    defaults: {
      scale: 1,
      particleCount: 80,
      particleSize: 1,
      connectionDistance: 120,
      primaryColor: '#6366f1',
      secondaryColor: '#ec4899',
      backgroundColor: '#050510',
      lineColor: '#6366f1',
      bassSensitivity: 2.0,
      midSensitivity: 1.5,
      highSensitivity: 1.0,
      baseSpeed: 0.5,
      smoothing: 0.9,
      pulseIntensity: 1.0,
    },
    schema: {
      ...folder('Layout', {
        scale: number({ value: 1, min: 0.1, max: 3, step: 0.1, label: 'Scale' }),
        particleCount: number({ value: 80, min: 20, max: 200, step: 10, label: 'Particle Count' }),
        particleSize: number({ value: 1, min: 0.5, max: 3, step: 0.1, label: 'Particle Size' }),
        connectionDistance: number({ value: 120, min: 50, max: 200, step: 10, label: 'Connection Distance' }),
      }),
      ...folder('Colors', {
        primaryColor: color({ value: '#6366f1', label: 'Primary Color' }),
        secondaryColor: color({ value: '#ec4899', label: 'Secondary Color' }),
        backgroundColor: color({ value: '#050510', label: 'Background' }),
        lineColor: color({ value: '#6366f1', label: 'Line Color' }),
      }),
      ...folder('Audio Sensitivity', {
        bassSensitivity: number({ value: 2.0, min: 0, max: 4, step: 0.1, label: 'Bass' }),
        midSensitivity: number({ value: 1.5, min: 0, max: 4, step: 0.1, label: 'Mid' }),
        highSensitivity: number({ value: 1.0, min: 0, max: 4, step: 0.1, label: 'High' }),
      }),
      ...folder('Animation', {
        baseSpeed: number({ value: 0.5, min: 0, max: 2, step: 0.1, label: 'Base Speed' }),
        smoothing: number({ value: 0.9, min: 0, max: 0.99, step: 0.01, label: 'Smoothing' }),
        pulseIntensity: number({ value: 1.0, min: 0, max: 3, step: 0.1, label: 'Pulse Intensity' }),
      }),
    },
  },

  setup({ width, height, params }) {
    initParticles(params.particleCount, width, height);
    smoothedAmplitude = 0;
    smoothedBass = 0;
    smoothedMid = 0;
    smoothedHigh = 0;
  },

  render({ ctx, width, height, time, deltaTime, params, audio }) {
    const {
      scale,
      particleCount,
      particleSize,
      connectionDistance,
      primaryColor,
      secondaryColor,
      backgroundColor,
      lineColor,
      bassSensitivity,
      midSensitivity,
      highSensitivity,
      baseSpeed,
      smoothing,
      pulseIntensity,
    } = params;

    // Reinitialize if particle count changed or canvas size changed
    if (particles.length !== particleCount || canvasWidth !== width || canvasHeight !== height) {
      initParticles(particleCount, width, height);
    }

    // Get audio data
    const amplitude = audio?.amplitude ?? 0.5;
    const bass = audio?.bass ?? 0.4;
    const mid = audio?.mid ?? 0.35;
    const high = audio?.high ?? 0.3;
    const isBeat = audio?.isBeat ?? false;

    // Smooth audio values
    smoothedAmplitude = smoothedAmplitude * smoothing + amplitude * (1 - smoothing);
    smoothedBass = smoothedBass * smoothing + bass * (1 - smoothing);
    smoothedMid = smoothedMid * smoothing + mid * (1 - smoothing);
    smoothedHigh = smoothedHigh * smoothing + high * (1 - smoothing);

    // Clear background with slight fade for trail effect
    ctx.fillStyle = backgroundColor;
    ctx.fillRect(0, 0, width, height);

    // Draw beat flash
    if (isBeat) {
      const flashGradient = ctx.createRadialGradient(
        width / 2, height / 2, 0,
        width / 2, height / 2, width / 2
      );
      flashGradient.addColorStop(0, hexToRgba(primaryColor, 0.15));
      flashGradient.addColorStop(1, hexToRgba(primaryColor, 0));
      ctx.fillStyle = flashGradient;
      ctx.fillRect(0, 0, width, height);
    }

    ctx.save();
    ctx.translate(width / 2, height / 2);
    ctx.scale(scale, scale);
    ctx.translate(-width / 2, -height / 2);

    // Calculate effective connection distance based on amplitude
    const effectiveConnectionDist = connectionDistance * (1 + smoothedAmplitude * pulseIntensity * 0.5);

    // Update and draw particles
    for (let i = 0; i < particles.length; i++) {
      const p = particles[i];
      
      // Get audio influence based on frequency band
      let audioInfluence = smoothedMid * midSensitivity;
      let particleColor = primaryColor;
      
      if (p.freqBand === 'bass') {
        audioInfluence = smoothedBass * bassSensitivity;
        particleColor = primaryColor;
      } else if (p.freqBand === 'high') {
        audioInfluence = smoothedHigh * highSensitivity;
        particleColor = secondaryColor;
      } else {
        particleColor = lerpColor(primaryColor, secondaryColor, 0.5);
      }

      // Update velocity based on audio
      const speedMultiplier = baseSpeed * (1 + audioInfluence * 2);
      
      // Add some noise to movement
      const noiseX = Math.sin(time * 2 + p.phase) * 0.3;
      const noiseY = Math.cos(time * 2 + p.phase * 1.3) * 0.3;

      p.x += (p.vx + noiseX) * speedMultiplier * deltaTime * 60;
      p.y += (p.vy + noiseY) * speedMultiplier * deltaTime * 60;

      // Wrap around edges
      if (p.x < 0) p.x = width;
      if (p.x > width) p.x = 0;
      if (p.y < 0) p.y = height;
      if (p.y > height) p.y = 0;

      // Calculate particle size based on audio
      const size = p.baseSize * particleSize * (1 + audioInfluence * pulseIntensity);

      // Draw particle glow
      const glowGradient = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, size * 4);
      glowGradient.addColorStop(0, hexToRgba(particleColor, 0.3 * smoothedAmplitude));
      glowGradient.addColorStop(1, hexToRgba(particleColor, 0));
      ctx.fillStyle = glowGradient;
      ctx.beginPath();
      ctx.arc(p.x, p.y, size * 4, 0, Math.PI * 2);
      ctx.fill();

      // Draw particle
      ctx.fillStyle = particleColor;
      ctx.beginPath();
      ctx.arc(p.x, p.y, size, 0, Math.PI * 2);
      ctx.fill();

      // Draw connections to nearby particles
      for (let j = i + 1; j < particles.length; j++) {
        const p2 = particles[j];
        const dx = p2.x - p.x;
        const dy = p2.y - p.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < effectiveConnectionDist) {
          const opacity = (1 - dist / effectiveConnectionDist) * 0.5 * smoothedAmplitude;
          
          ctx.strokeStyle = hexToRgba(lineColor, opacity);
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(p.x, p.y);
          ctx.lineTo(p2.x, p2.y);
          ctx.stroke();
        }
      }
    }

    // Draw center attraction point on beat
    if (isBeat) {
      const centerX = width / 2;
      const centerY = height / 2;
      
      ctx.fillStyle = hexToRgba(secondaryColor, 0.8);
      ctx.beginPath();
      ctx.arc(centerX, centerY, 8, 0, Math.PI * 2);
      ctx.fill();

      // Pulse ring
      ctx.strokeStyle = hexToRgba(secondaryColor, 0.5);
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(centerX, centerY, 30, 0, Math.PI * 2);
      ctx.stroke();
    }

    ctx.restore();
  },
};

// Helper functions
function hexToRgba(hex: string, alpha: number): string {
  if (hex.startsWith('rgba')) return hex;
  if (hex.startsWith('rgb')) {
    return hex.replace('rgb', 'rgba').replace(')', `, ${alpha})`);
  }
  
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
  
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}

export default animation;

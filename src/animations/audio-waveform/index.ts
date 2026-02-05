import type { AnimationDefinition } from '../../runtime/types';
import { number, color, folder, select, boolean } from '../../runtime/params';

interface AudioWaveformParams {
  // Layout
  scale: number;
  waveHeight: number;
  lineWidth: number;
  mirrorWave: boolean;
  // Colors
  primaryColor: string;
  secondaryColor: string;
  backgroundColor: string;
  glowColor: string;
  // Audio Sensitivity
  amplitudeSensitivity: number;
  bassSensitivity: number;
  // Animation
  smoothing: number;
  glowIntensity: number;
  waveStyle: string;
}

// Smoothed values
let smoothedWaveform: number[] = [];
let smoothedAmplitude = 0;

const animation: AnimationDefinition<AudioWaveformParams> = {
  id: 'audio-waveform',
  name: 'Audio Waveform',
  fps: 60,
  durationMs: undefined, // Infinite loop
  width: 800,
  height: 400,
  background: '#0f0f1a',

  params: {
    defaults: {
      scale: 0.7,
      waveHeight: 70,
      lineWidth: 1.5,
      mirrorWave: false,
      primaryColor: '#00d4ff',
      secondaryColor: '#004cff',
      backgroundColor: '#070709',
      glowColor: '#00d4ff',
      amplitudeSensitivity: 2.6,
      bassSensitivity: 1.9,
      smoothing: 0.33,
      glowIntensity: 1.4,
      waveStyle: 'smooth',
    },
    schema: {
      ...folder('Layout', {
        scale: number({ value: 1, min: 0.1, max: 3, step: 0.1, label: 'Scale' }),
        waveHeight: number({ value: 120, min: 20, max: 200, step: 10, label: 'Wave Height' }),
        lineWidth: number({ value: 3, min: 1, max: 10, step: 0.5, label: 'Line Width' }),
        mirrorWave: boolean({ value: true, label: 'Mirror Wave' }),
      }),
      ...folder('Colors', {
        primaryColor: color({ value: '#00d4ff', label: 'Primary Color' }),
        secondaryColor: color({ value: '#ff6b00', label: 'Secondary Color' }),
        backgroundColor: color({ value: '#0f0f1a', label: 'Background' }),
        glowColor: color({ value: '#00d4ff', label: 'Glow Color' }),
      }),
      ...folder('Audio Sensitivity', {
        amplitudeSensitivity: number({ value: 1.2, min: 0, max: 3, step: 0.1, label: 'Amplitude' }),
        bassSensitivity: number({ value: 1.5, min: 0, max: 3, step: 0.1, label: 'Bass Boost' }),
      }),
      ...folder('Animation', {
        smoothing: number({ value: 0.7, min: 0, max: 0.99, step: 0.01, label: 'Smoothing' }),
        glowIntensity: number({ value: 1.0, min: 0, max: 2, step: 0.1, label: 'Glow Intensity' }),
        waveStyle: select({
          value: 'smooth',
          options: [
            { label: 'Smooth', value: 'smooth' },
            { label: 'Sharp', value: 'sharp' },
            { label: 'Bars', value: 'bars' },
          ],
          label: 'Wave Style',
        }),
      }),
    },
  },

  setup() {
    smoothedWaveform = [];
    smoothedAmplitude = 0;
  },

  render({ ctx, width, height, params, audio }) {
    const {
      scale,
      waveHeight,
      lineWidth,
      mirrorWave,
      primaryColor,
      secondaryColor,
      backgroundColor,
      glowColor,
      amplitudeSensitivity,
      bassSensitivity,
      smoothing,
      glowIntensity,
      waveStyle,
    } = params;

    const isMirrored = mirrorWave;

    // Clear background
    ctx.fillStyle = backgroundColor;
    ctx.fillRect(0, 0, width, height);

    // Get audio data
    const waveform = audio?.waveform ?? new Uint8Array(128).fill(128);
    const amplitude = audio?.amplitude ?? 0.5;
    const bass = audio?.bass ?? 0.5;
    const isBeat = audio?.isBeat ?? false;

    // Initialize smoothed waveform if needed
    if (smoothedWaveform.length !== waveform.length) {
      smoothedWaveform = Array.from(waveform).map(v => (v - 128) / 128);
    }

    // Smooth amplitude
    smoothedAmplitude = smoothedAmplitude * smoothing + amplitude * (1 - smoothing);

    // Smooth waveform
    for (let i = 0; i < waveform.length; i++) {
      const normalized = (waveform[i] - 128) / 128;
      smoothedWaveform[i] = smoothedWaveform[i] * smoothing + normalized * (1 - smoothing);
    }

    // Center and scale
    ctx.save();
    ctx.translate(width / 2, height / 2);
    ctx.scale(scale, scale);

    const drawWidth = (width / scale) * 0.85;
    const centerY = 0;

    // Draw background glow on beat
    if (isBeat) {
      const beatGlow = ctx.createRadialGradient(0, 0, 0, 0, 0, drawWidth / 2);
      beatGlow.addColorStop(0, hexToRgba(glowColor, 0.2));
      beatGlow.addColorStop(1, hexToRgba(glowColor, 0));
      ctx.fillStyle = beatGlow;
      ctx.fillRect(-drawWidth / 2, -waveHeight, drawWidth, waveHeight * 2);
    }

    // Draw horizontal center line
    const lineGradient = ctx.createLinearGradient(-drawWidth / 2, 0, drawWidth / 2, 0);
    lineGradient.addColorStop(0, hexToRgba(primaryColor, 0.1));
    lineGradient.addColorStop(0.5, hexToRgba(primaryColor, 0.3));
    lineGradient.addColorStop(1, hexToRgba(primaryColor, 0.1));
    ctx.strokeStyle = lineGradient;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(-drawWidth / 2, centerY);
    ctx.lineTo(drawWidth / 2, centerY);
    ctx.stroke();

    // Calculate effective wave height with audio sensitivity
    const effectiveHeight = waveHeight * amplitudeSensitivity * (1 + bass * bassSensitivity * 0.5);

    // Draw waveform
    const drawWave = (yMultiplier: number, colorStart: string, colorEnd: string) => {
      const gradient = ctx.createLinearGradient(-drawWidth / 2, 0, drawWidth / 2, 0);
      gradient.addColorStop(0, colorStart);
      gradient.addColorStop(0.5, colorEnd);
      gradient.addColorStop(1, colorStart);

      ctx.strokeStyle = gradient;
      ctx.lineWidth = lineWidth;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      // Glow effect
      ctx.shadowColor = glowColor;
      ctx.shadowBlur = 15 * glowIntensity * smoothedAmplitude;

      if (waveStyle === 'bars') {
        // Bar style
        const barCount = Math.min(64, smoothedWaveform.length);
        const barWidth = drawWidth / barCount * 0.8;
        const gap = drawWidth / barCount * 0.2;

        for (let i = 0; i < barCount; i++) {
          const idx = Math.floor(i * smoothedWaveform.length / barCount);
          const value = smoothedWaveform[idx];
          const x = -drawWidth / 2 + (i / barCount) * drawWidth + barWidth / 2;
          const barHeight = Math.abs(value) * effectiveHeight * yMultiplier;

          ctx.fillStyle = gradient;
          ctx.beginPath();
          ctx.roundRect(
            x - barWidth / 2,
            centerY - (yMultiplier > 0 ? barHeight : 0),
            barWidth - gap,
            barHeight,
            2
          );
          ctx.fill();
        }
      } else {
        // Line style (smooth or sharp)
        ctx.beginPath();
        
        const step = drawWidth / (smoothedWaveform.length - 1);
        const startX = -drawWidth / 2;

        for (let i = 0; i < smoothedWaveform.length; i++) {
          const x = startX + i * step;
          const y = centerY + smoothedWaveform[i] * effectiveHeight * yMultiplier;

          if (i === 0) {
            ctx.moveTo(x, y);
          } else if (waveStyle === 'smooth') {
            // Smooth curve using quadratic bezier
            const prevX = startX + (i - 1) * step;
            const prevY = centerY + smoothedWaveform[i - 1] * effectiveHeight * yMultiplier;
            const cpX = (prevX + x) / 2;
            ctx.quadraticCurveTo(prevX, prevY, cpX, (prevY + y) / 2);
          } else {
            ctx.lineTo(x, y);
          }
        }

        ctx.stroke();
      }
    };

    // Draw main wave
    drawWave(1, primaryColor, secondaryColor);

    // Draw mirrored wave (optional)
    if (isMirrored) {
      ctx.globalAlpha = 0.5;
      drawWave(-1, hexToRgba(primaryColor, 0.7), hexToRgba(secondaryColor, 0.7));
      ctx.globalAlpha = 1;
    }

    // Reset shadow
    ctx.shadowBlur = 0;

    // Draw amplitude indicator dots on sides
    const dotRadius = 4 + smoothedAmplitude * 8;
    const dotY = centerY;
    
    ctx.fillStyle = primaryColor;
    ctx.beginPath();
    ctx.arc(-drawWidth / 2 - 20, dotY, dotRadius, 0, Math.PI * 2);
    ctx.fill();
    
    ctx.fillStyle = secondaryColor;
    ctx.beginPath();
    ctx.arc(drawWidth / 2 + 20, dotY, dotRadius, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  },
};

// Helper function
function hexToRgba(hex: string, alpha: number): string {
  // Handle rgba format
  if (hex.startsWith('rgba')) return hex;
  if (hex.startsWith('rgb')) {
    return hex.replace('rgb', 'rgba').replace(')', `, ${alpha})`);
  }
  
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export default animation;

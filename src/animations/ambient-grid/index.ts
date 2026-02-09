import type { AnimationDefinition } from '../../runtime/types';
import { number, color, boolean, folder } from '../../runtime/params';

interface AmbientGridParams {
  // Layout
  scale: number;
  cellSize: number;
  // Colors
  backgroundColor: string;
  lineColor: string;
  glowColor: string;
  accentColor: string;
  // Animation
  speed: number;
  waveAmplitude: number;
  glowIntensity: number;
  showPulses: boolean;
  perspectiveTilt: number;
}

// Easing
const easeInOutSine = (t: number): number => -(Math.cos(Math.PI * t) - 1) / 2;

// Smooth noise-like function using layered sine waves
function smoothNoise(x: number, y: number, t: number): number {
  return (
    Math.sin(x * 0.8 + t * 1.2) * 0.5 +
    Math.sin(y * 0.6 - t * 0.9) * 0.5 +
    Math.sin((x + y) * 0.4 + t * 0.7) * 0.3 +
    Math.sin((x - y) * 0.5 - t * 1.1) * 0.2
  ) / 1.5;
}

const animation: AnimationDefinition<AmbientGridParams> = {
  id: 'ambient-grid',
  name: 'Ambient Grid',
  fps: 60,
  durationMs: 8000,
  width: 1920,
  height: 1080,
  background: '#0A0A12',

  params: {
    defaults: {
      scale: 1,
      cellSize: 90,
      backgroundColor: '#070708',
      lineColor: '#1A1A2E',
      glowColor: '#9d4dff',
      accentColor: '#7B5CFF',
      speed: 1,
      waveAmplitude: 16,
      glowIntensity: 0.6,
      showPulses: true,
      perspectiveTilt: 0,
    },
    schema: {
      ...folder('Layout', {
        scale: number({ value: 1, min: 0.1, max: 3, step: 0.1, label: 'Scale' }),
        cellSize: number({ value: 60, min: 20, max: 150, step: 5, label: 'Cell Size' }),
        perspectiveTilt: number({ value: 0.3, min: 0, max: 1, step: 0.05, label: 'Perspective Tilt' }),
      }),
      ...folder('Colors', {
        backgroundColor: color({ value: '#0A0A12', label: 'Background' }),
        lineColor: color({ value: '#1A1A2E', label: 'Grid Lines' }),
        glowColor: color({ value: '#4A9EFF', label: 'Glow Color' }),
        accentColor: color({ value: '#7B5CFF', label: 'Accent Color' }),
      }),
      ...folder('Animation', {
        speed: number({ value: 1, min: 0.1, max: 3, step: 0.1, label: 'Speed' }),
        waveAmplitude: number({ value: 8, min: 0, max: 30, step: 1, label: 'Wave Amplitude' }),
        glowIntensity: number({ value: 0.6, min: 0, max: 1, step: 0.05, label: 'Glow Intensity' }),
        showPulses: boolean({ value: true, label: 'Show Pulses' }),
      }),
    },
  },

  render({ ctx, width, height, progress, params }) {
    const {
      scale,
      cellSize,
      backgroundColor,
      lineColor,
      glowColor,
      accentColor,
      speed,
      waveAmplitude,
      glowIntensity,
      showPulses,
      perspectiveTilt,
    } = params;

    // Looping time value (seamless loop over duration)
    const t = progress * speed * Math.PI * 2;

    // Clear background
    ctx.fillStyle = backgroundColor;
    ctx.fillRect(0, 0, width, height);

    // Subtle radial vignette
    const vignette = ctx.createRadialGradient(
      width / 2, height / 2, Math.min(width, height) * 0.15,
      width / 2, height / 2, Math.max(width, height) * 0.75
    );
    vignette.addColorStop(0, 'rgba(0,0,0,0)');
    vignette.addColorStop(1, 'rgba(0,0,0,0.4)');
    ctx.fillStyle = vignette;
    ctx.fillRect(0, 0, width, height);

    ctx.save();
    ctx.translate(width / 2, height / 2);
    ctx.scale(scale, scale);

    // Apply subtle perspective tilt
    if (perspectiveTilt > 0) {
      const tiltY = Math.sin(t * 0.25) * perspectiveTilt * 0.04;
      const tiltX = Math.cos(t * 0.18) * perspectiveTilt * 0.02;
      ctx.transform(1 + tiltX, tiltY, tiltX * 0.5, 1 + tiltY * 0.5, 0, 0);
    }

    const scaledW = width / scale;
    const scaledH = height / scale;
    const halfW = scaledW / 2;
    const halfH = scaledH / 2;

    // Calculate grid bounds (with padding for distortion overflow)
    const pad = cellSize * 2;
    const startX = Math.floor((-halfW - pad) / cellSize) * cellSize;
    const endX = Math.ceil((halfW + pad) / cellSize) * cellSize;
    const startY = Math.floor((-halfH - pad) / cellSize) * cellSize;
    const endY = Math.ceil((halfH + pad) / cellSize) * cellSize;

    // --- Draw base grid lines with wave distortion ---
    ctx.lineWidth = 0.6;
    ctx.strokeStyle = lineColor;
    ctx.globalAlpha = 0.7;

    // Horizontal lines
    for (let y = startY; y <= endY; y += cellSize) {
      ctx.beginPath();
      for (let x = startX; x <= endX; x += 4) {
        const distortion = smoothNoise(x * 0.01, y * 0.01, t) * waveAmplitude;
        const px = x;
        const py = y + distortion;
        if (x === startX) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.stroke();
    }

    // Vertical lines
    for (let x = startX; x <= endX; x += cellSize) {
      ctx.beginPath();
      for (let y = startY; y <= endY; y += 4) {
        const distortion = smoothNoise(x * 0.01, y * 0.01, t) * waveAmplitude;
        const px = x + distortion;
        const py = y;
        if (y === startY) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.stroke();
    }

    // --- Draw glow at intersections ---
    ctx.globalAlpha = 1;

    for (let gx = startX; gx <= endX; gx += cellSize) {
      for (let gy = startY; gy <= endY; gy += cellSize) {
        // Distance from center (normalized 0-1)
        const dx = gx / halfW;
        const dy = gy / halfH;
        const dist = Math.sqrt(dx * dx + dy * dy);

        // Fade out intersections far from center
        const fadeFactor = Math.max(0, 1 - dist * 0.7);
        if (fadeFactor <= 0) continue;

        // Wave offset at this intersection
        const waveOffset = smoothNoise(gx * 0.01, gy * 0.01, t);
        const ox = waveOffset * waveAmplitude;
        const oy = smoothNoise(gx * 0.01 + 100, gy * 0.01 + 100, t) * waveAmplitude;

        // Pulsing brightness per intersection (phase offset by position)
        const pulse = (Math.sin(t + gx * 0.05 + gy * 0.03) + 1) / 2;
        const brightness = pulse * fadeFactor * glowIntensity;

        if (brightness < 0.05) continue;

        // Intersection glow dot
        const dotRadius = 1.2 + brightness * 2.5;
        const glowRadius = 4 + brightness * 18;

        // Outer glow
        const grad = ctx.createRadialGradient(
          gx + ox, gy + oy, 0,
          gx + ox, gy + oy, glowRadius
        );

        // Alternate between glow and accent colors based on position
        const useAccent = ((Math.floor(gx / cellSize) + Math.floor(gy / cellSize)) % 3 === 0);
        const dotColor = useAccent ? accentColor : glowColor;

        grad.addColorStop(0, dotColor + hexAlpha(brightness * 0.5));
        grad.addColorStop(0.5, dotColor + hexAlpha(brightness * 0.15));
        grad.addColorStop(1, dotColor + '00');

        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(gx + ox, gy + oy, glowRadius, 0, Math.PI * 2);
        ctx.fill();

        // Bright core
        ctx.fillStyle = dotColor + hexAlpha(brightness * 0.8);
        ctx.beginPath();
        ctx.arc(gx + ox, gy + oy, dotRadius, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // --- Traveling pulses along grid lines ---
    if (showPulses) {
      const pulseCount = 6;
      for (let i = 0; i < pulseCount; i++) {
        const phase = (i / pulseCount + progress * speed) % 1;
        const easedPhase = easeInOutSine(phase);
        const isHorizontal = i % 2 === 0;
        const lineIndex = Math.floor((i * 7 + 3) % 12) - 6;
        const linePos = lineIndex * cellSize;

        const pulseAlpha = Math.sin(phase * Math.PI) * 0.7 * glowIntensity;
        if (pulseAlpha < 0.01) continue;

        const pulsePos = -halfW + easedPhase * scaledW;
        const pColor = i % 3 === 0 ? accentColor : glowColor;

        // Pulse glow
        const px = isHorizontal ? pulsePos : linePos;
        const py = isHorizontal ? linePos : pulsePos;

        // Add wave distortion to pulse position
        const pd = smoothNoise(px * 0.01, py * 0.01, t) * waveAmplitude;
        const finalX = isHorizontal ? px : px + pd;
        const finalY = isHorizontal ? py + pd : py;

        const pulseGrad = ctx.createRadialGradient(
          finalX, finalY, 0,
          finalX, finalY, cellSize * 0.8
        );
        pulseGrad.addColorStop(0, pColor + hexAlpha(pulseAlpha * 0.6));
        pulseGrad.addColorStop(0.3, pColor + hexAlpha(pulseAlpha * 0.2));
        pulseGrad.addColorStop(1, pColor + '00');

        ctx.fillStyle = pulseGrad;
        ctx.beginPath();
        ctx.arc(finalX, finalY, cellSize * 0.8, 0, Math.PI * 2);
        ctx.fill();

        // Bright center of pulse
        ctx.fillStyle = '#FFFFFF' + hexAlpha(pulseAlpha * 0.5);
        ctx.beginPath();
        ctx.arc(finalX, finalY, 2.5, 0, Math.PI * 2);
        ctx.fill();

        // Trailing line segment
        const trailLength = cellSize * 1.5;
        const trailGrad = isHorizontal
          ? ctx.createLinearGradient(finalX - trailLength, finalY, finalX, finalY)
          : ctx.createLinearGradient(finalX, finalY - trailLength, finalX, finalY);

        trailGrad.addColorStop(0, pColor + '00');
        trailGrad.addColorStop(1, pColor + hexAlpha(pulseAlpha * 0.4));

        ctx.strokeStyle = trailGrad;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        if (isHorizontal) {
          ctx.moveTo(finalX - trailLength, finalY);
          ctx.lineTo(finalX, finalY);
        } else {
          ctx.moveTo(finalX, finalY - trailLength);
          ctx.lineTo(finalX, finalY);
        }
        ctx.stroke();
      }
    }

    // --- Subtle ambient glow at center ---
    const centerGlow = ctx.createRadialGradient(0, 0, 0, 0, 0, halfW * 0.5);
    const centerPulse = (Math.sin(t * 0.5) + 1) / 2 * 0.08 + 0.04;
    centerGlow.addColorStop(0, glowColor + hexAlpha(centerPulse));
    centerGlow.addColorStop(0.5, accentColor + hexAlpha(centerPulse * 0.3));
    centerGlow.addColorStop(1, glowColor + '00');
    ctx.fillStyle = centerGlow;
    ctx.fillRect(-halfW, -halfH, scaledW, scaledH);

    ctx.restore();
  },
};

// Helper: convert 0-1 alpha to 2-digit hex
function hexAlpha(a: number): string {
  const clamped = Math.max(0, Math.min(1, a));
  return Math.round(clamped * 255).toString(16).padStart(2, '0');
}

export default animation;

import type { AnimationDefinition } from '../../runtime/types';
import { number, color, folder } from '../../runtime/params';

// Easing functions
const easeInOutSine = (t: number) => -(Math.cos(Math.PI * t) - 1) / 2;

interface RotatingGeometryParams {
  scale: number;
  primaryColor: string;
  accentColor: string;
  backgroundColor: string;
  speed: number;
  layers: number;
  sides: number;
}

const animation: AnimationDefinition<RotatingGeometryParams> = {
  id: 'rotating-geometry',
  name: 'Rotating Geometric Patterns',
  fps: 60,
  durationMs: 4000,
  width: 400,
  height: 400,
  background: '#0A0A0A',
  params: {
    defaults: {
      scale: 1,
      primaryColor: '#00FFE7',
      accentColor: '#FF1B6B',
      backgroundColor: '#0A0A0A',
      speed: 1,
      layers: 5,
      sides: 6,
    },
    schema: {
      ...folder('Layout', {
        scale: number({ value: 1, min: 0.5, max: 2, step: 0.05, label: 'Scale' }),
        layers: number({ value: 5, min: 2, max: 8, step: 1, label: 'Layers' }),
        sides: number({ value: 6, min: 3, max: 12, step: 1, label: 'Polygon Sides' }),
      }),
      ...folder('Colors', {
        primaryColor: color({ value: '#00FFE7', label: 'Primary Color' }),
        accentColor: color({ value: '#FF1B6B', label: 'Accent Color' }),
        backgroundColor: color({ value: '#0A0A0A', label: 'Background' }),
      }),
      ...folder('Animation', {
        speed: number({ value: 1, min: 0.5, max: 3, step: 0.05, label: 'Speed' }),
      }),
    },
  },

  render({ ctx, width, height, progress, params }) {
    const {
      scale,
      primaryColor,
      accentColor,
      backgroundColor,
      speed,
      layers,
      sides,
    } = params;

    ctx.save();
    ctx.fillStyle = backgroundColor;
    ctx.fillRect(0, 0, width, height);
    ctx.restore();

    ctx.save();
    ctx.translate(width / 2, height / 2);
    ctx.scale(scale, scale);

    const baseRadius = Math.min(width, height) * 0.36;
    const layerGap = baseRadius / (layers + 1);

    // Parallax angular speeds for each layer (inner = slow, outer = fast)
    const angularSpeeds = Array.from({ length: layers }, (_, i) =>
      (0.3 + 0.7 * (i / (layers - 1))) * speed
    );

    // Sine-based breathing for subtle scale pulse
    const globalPulse = 0.96 + 0.06 * Math.sin(progress * Math.PI * 2);

    for (let layer = 0; layer < layers; layer++) {
      ctx.save();
      // Stagger: each layer slightly delayed in rotation phase
      const layerDelay = (layer / layers) * 0.09;
      const t = ((progress + layerDelay) % 1);
      const easedT = easeInOutSine(t);
      // Layer-specific rotation
      const angle = (easedT * Math.PI * 2 * angularSpeeds[layer]) * ((layer % 2 === 0) ? 1 : -1);
      ctx.rotate(angle);

      // Layer radius and pulse
      const layerRadius = layerGap * (layer + 1) * (1 + 0.09 * Math.sin(progress * Math.PI * 2 + layer * 0.8)) * globalPulse;

      // Choose color and glow
      const color = layer % 2 === 0 ? primaryColor : accentColor;
      ctx.shadowColor = color;
      ctx.shadowBlur = 28 + 8 * Math.sin(progress * Math.PI * 2 + layer);
      ctx.globalCompositeOperation = 'lighter';

      // Draw polygon
      ctx.beginPath();
      for (let i = 0; i <= sides; i++) {
        const a = (i / sides) * Math.PI * 2;
        const r = i % 2 === 0 ? layerRadius : layerRadius * (0.94 + 0.06 * Math.sin(progress * Math.PI * 2 + i + layer));
        const x = Math.cos(a) * r;
        const y = Math.sin(a) * r;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.closePath();
      // Gradient fill for depth
      const grad = ctx.createRadialGradient(0, 0, layerRadius * 0.1, 0, 0, layerRadius);
      grad.addColorStop(0, color + 'CC');
      grad.addColorStop(0.5, color + '44');
      grad.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = grad;
      ctx.globalAlpha = 0.80 - layer * 0.11;
      ctx.fill();
      // Subtle outline
      ctx.globalAlpha = 0.40;
      ctx.lineWidth = 2 + 1.5 * Math.sin(progress * Math.PI * 2 + layer);
      ctx.strokeStyle = color;
      ctx.stroke();
      ctx.restore();
    }

    // Central accent: subtle glowing dot
    ctx.save();
    ctx.beginPath();
    ctx.arc(0, 0, 13 + 4 * Math.sin(progress * Math.PI * 2), 0, Math.PI * 2);
    const coreGrad = ctx.createRadialGradient(0, 0, 0, 0, 0, 13);
    coreGrad.addColorStop(0, accentColor + 'FF');
    coreGrad.addColorStop(0.7, accentColor + '77');
    coreGrad.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = coreGrad;
    ctx.globalAlpha = 0.88;
    ctx.shadowColor = accentColor;
    ctx.shadowBlur = 25;
    ctx.globalCompositeOperation = 'lighter';
    ctx.fill();
    ctx.restore();

    ctx.restore();
  },
};

export default animation;

import type { AnimationDefinition } from '../../runtime/types';
import { number, color, string, folder } from '../../runtime/params';

/**
 * Voice Wave – A sleek dark audio message card with an animated waveform,
 * speaker name, "Speaking..." status, timer, and play button.
 */

interface VoiceWaveParams {
  // Layout
  scale: number;
  cardRadius: number;
  // Colors
  backgroundColor: string;
  cardColor: string;
  barColor: string;
  barHighlightColor: string;
  nameColor: string;
  subtitleColor: string;
  // Content
  speakerName: string;
  // Animation
  speed: number;
  waveAmplitude: number;
  barCount: number;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function rrect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  r = Math.min(r, w / 2, h / 2);
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.arcTo(x + w, y, x + w, y + r, r);
  ctx.lineTo(x + w, y + h - r);
  ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
  ctx.lineTo(x + r, y + h);
  ctx.arcTo(x, y + h, x, y + h - r, r);
  ctx.lineTo(x, y + r);
  ctx.arcTo(x, y, x + r, y, r);
  ctx.closePath();
}

function seededRandom(seed: number): number {
  const x = Math.sin(seed * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
}

// ── Pre-generate waveform envelope ──────────────────────────────────────────
// Creates a natural-looking audio waveform shape with peaks and valleys

const MAX_BARS = 80;
const waveEnvelope: number[] = [];
for (let i = 0; i < MAX_BARS; i++) {
  const t = i / MAX_BARS;

  // Create multiple overlapping "phrase" humps for a realistic voice shape
  const hump1 = Math.pow(Math.max(0, Math.sin(t * Math.PI * 2.2 + 0.3)), 1.2) * 0.65;
  const hump2 = Math.pow(Math.max(0, Math.sin(t * Math.PI * 3.8 - 0.5)), 1.5) * 0.45;
  const hump3 = Math.pow(Math.max(0, Math.sin(t * Math.PI * 1.3 + 1.0)), 0.8) * 0.35;

  // Random detail variation per bar
  const detail = 0.5 + seededRandom(i * 17 + 3) * 0.5;
  // Occasional spikes
  const spike = seededRandom(i * 41 + 11) > 0.88 ? 0.2 : 0;

  let h = (hump1 + hump2 + hump3) * detail + spike;

  // Taper edges gently
  const edgeFade = Math.min(t * 4, (1 - t) * 4, 1);
  h *= edgeFade;

  // Clamp
  h = Math.max(0.03, Math.min(1.0, h));
  waveEnvelope.push(h);
}

// ── Main Animation ──────────────────────────────────────────────────────────

const animation: AnimationDefinition<VoiceWaveParams> = {
  id: 'voice-wave',
  name: 'Voice Wave',
  fps: 60,
  durationMs: 6000,
  width: 500,
  height: 500,
  background: '#0B0E13',

  params: {
    defaults: {
      scale: 0.75,
      cardRadius: 28,
      backgroundColor: '#0B0E13',
      cardColor: '#141922',
      barColor: '#4A6070',
      barHighlightColor: '#A0C4D8',
      nameColor: '#FFFFFF',
      subtitleColor: '#6B8A8E',
      speakerName: 'Sally Peterson',
      speed: 2.5,
      waveAmplitude: 0.5,
      barCount: 43,
    },
    schema: {
      ...folder('Layout', {
        scale: number({ value: 1, min: 0.5, max: 1.5, step: 0.05, label: 'Scale' }),
        cardRadius: number({ value: 28, min: 0, max: 50, step: 1, label: 'Card Radius' }),
      }),
      ...folder('Colors', {
        backgroundColor: color({ value: '#0B0E13', label: 'Background' }),
        cardColor: color({ value: '#141922', label: 'Card' }),
        barColor: color({ value: '#4A6070', label: 'Bar Base' }),
        barHighlightColor: color({ value: '#A0C4D8', label: 'Bar Highlight' }),
        nameColor: color({ value: '#FFFFFF', label: 'Name' }),
        subtitleColor: color({ value: '#6B8A8E', label: 'Subtitle' }),
      }),
      ...folder('Content', {
        speakerName: string({ value: 'Sally Peterson', label: 'Speaker Name' }),
      }),
      ...folder('Animation', {
        speed: number({ value: 1, min: 0.2, max: 3, step: 0.1, label: 'Speed' }),
        waveAmplitude: number({ value: 1, min: 0.2, max: 2, step: 0.1, label: 'Amplitude' }),
        barCount: number({ value: 65, min: 30, max: 80, step: 1, label: 'Bar Count' }),
      }),
    },
  },

  render({ ctx, width, height, time, params }) {
    const {
      scale,
      cardRadius,
      backgroundColor,
      cardColor,
      barColor,
      barHighlightColor,
      nameColor,
      subtitleColor,
      speakerName,
      speed,
      waveAmplitude,
      barCount,
    } = params;

    // ── Background ──────────────────────────────────────────────────────────
    ctx.fillStyle = backgroundColor;
    ctx.fillRect(0, 0, width, height);

    ctx.save();
    ctx.translate(width / 2, height / 2);
    ctx.scale(scale, scale);
    ctx.translate(-width / 2, -height / 2);

    // ── Card dimensions ─────────────────────────────────────────────────────
    const cardPad = 30;
    const cardX = cardPad;
    const cardY = cardPad;
    const cardW = width - cardPad * 2;
    const cardH = height - cardPad * 2;

    // ── Card shadow ─────────────────────────────────────────────────────────
    ctx.save();
    ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
    ctx.shadowBlur = 40;
    ctx.shadowOffsetY = 10;
    ctx.beginPath();
    rrect(ctx, cardX, cardY, cardW, cardH, cardRadius);
    ctx.fillStyle = cardColor;
    ctx.fill();
    ctx.restore();

    // ── Card body ───────────────────────────────────────────────────────────
    ctx.beginPath();
    rrect(ctx, cardX, cardY, cardW, cardH, cardRadius);
    const cardGrad = ctx.createLinearGradient(cardX, cardY, cardX, cardY + cardH);
    cardGrad.addColorStop(0, '#1A2230');
    cardGrad.addColorStop(0.4, cardColor);
    cardGrad.addColorStop(1, '#0E1219');
    ctx.fillStyle = cardGrad;
    ctx.fill();

    // Subtle inner border
    ctx.beginPath();
    rrect(ctx, cardX, cardY, cardW, cardH, cardRadius);
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.04)';
    ctx.lineWidth = 1;
    ctx.stroke();

    // ── Clip to card ────────────────────────────────────────────────────────
    ctx.save();
    ctx.beginPath();
    rrect(ctx, cardX, cardY, cardW, cardH, cardRadius);
    ctx.clip();

    // ── Speaker name ────────────────────────────────────────────────────────
    const textX = cardX + 32;
    const nameY = cardY + 48;

    ctx.font = '600 22px -apple-system, "SF Pro Display", "Helvetica Neue", sans-serif';
    ctx.fillStyle = nameColor;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(speakerName, textX, nameY);

    // ── "Speaking..." subtitle ──────────────────────────────────────────────
    const subY = nameY + 30;
    ctx.font = '400 16px -apple-system, "SF Pro Display", "Helvetica Neue", sans-serif';
    ctx.fillStyle = subtitleColor;
    ctx.fillText('Speaking...', textX, subY);

    // ── Waveform (anchored to bottom of card) ─────────────────────────────
    const wavePadX = 16;
    const waveStartX = cardX + wavePadX;
    const waveEndX = cardX + cardW - wavePadX;
    const waveW = waveEndX - waveStartX;
    const waveBaseY = cardY + cardH; // bottom edge of card
    const waveMaxH = cardH * 0.65; // max bar height

    const numBars = Math.min(barCount, MAX_BARS);
    const barW = 3;
    const totalBarsWidth = numBars * barW;
    const barGap = (waveW - totalBarsWidth) / (numBars - 1);
    const barStartX = waveStartX;

    // Parse barColor and barHighlightColor for gradient
    const hexToRgb = (hex: string) => {
      const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
      return result
        ? {
            r: parseInt(result[1], 16),
            g: parseInt(result[2], 16),
            b: parseInt(result[3], 16),
          }
        : { r: 74, g: 96, b: 112 };
    };

    const baseRgb = hexToRgb(barColor);
    const highRgb = hexToRgb(barHighlightColor);

    for (let i = 0; i < numBars; i++) {
      const bx = barStartX + i * (barW + barGap);
      const envIdx = Math.floor((i / numBars) * MAX_BARS);
      const baseH = waveEnvelope[envIdx];

      // Animate: multi-frequency wave oscillation
      const t1 = Math.sin(time * speed * 3.0 + i * 0.35) * 0.12;
      const t2 = Math.sin(time * speed * 4.7 + i * 0.58) * 0.08;
      const t3 = Math.sin(time * speed * 2.1 + i * 0.18) * 0.06;
      const t4 = Math.sin(time * speed * 6.3 + i * 0.9) * 0.04;

      const animH = Math.max(0.03, baseH + (t1 + t2 + t3 + t4) * waveAmplitude);
      const h = animH * waveMaxH;

      // Height-based color interpolation: taller bars get brighter
      const brightness = Math.min(1, animH * 1.3);

      const r = Math.round(baseRgb.r + (highRgb.r - baseRgb.r) * brightness);
      const g = Math.round(baseRgb.g + (highRgb.g - baseRgb.g) * brightness);
      const b = Math.round(baseRgb.b + (highRgb.b - baseRgb.b) * brightness);

      // Vertical gradient: bright at bottom (base), fade toward top
      const barTop = waveBaseY - h;
      const grad = ctx.createLinearGradient(bx, barTop, bx, waveBaseY);
      grad.addColorStop(0, `rgba(${r}, ${g}, ${b}, 0.15)`);
      grad.addColorStop(0.4, `rgba(${r}, ${g}, ${b}, 0.7)`);
      grad.addColorStop(0.75, `rgba(${r}, ${g}, ${b}, 1)`);
      grad.addColorStop(1, `rgba(${r}, ${g}, ${b}, 0.9)`);

      ctx.fillStyle = grad;

      // Draw rounded bar growing upward from bottom
      const barRadius = Math.min(barW / 2, h / 2);
      ctx.beginPath();
      rrect(ctx, bx, barTop, barW, Math.max(h, 2), barRadius);
      ctx.fill();
    }

    // ── Subtle waveform glow behind the bars ────────────────────────────────
    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    ctx.globalAlpha = 0.06;
    const glowCY = waveBaseY - waveMaxH * 0.4;
    const glowGrad = ctx.createRadialGradient(
      cardX + cardW / 2, glowCY, 20,
      cardX + cardW / 2, glowCY, waveW * 0.55,
    );
    glowGrad.addColorStop(0, barHighlightColor);
    glowGrad.addColorStop(1, 'transparent');
    ctx.fillStyle = glowGrad;
    ctx.fillRect(cardX, waveBaseY - waveMaxH, cardW, waveMaxH);
    ctx.restore();

    // ── End card clip ───────────────────────────────────────────────────────
    ctx.restore();
    ctx.restore(); // end scale/translate
  },
};

export default animation;

import type { AnimationDefinition } from '../../runtime/types';
import { number, color, folder } from '../../runtime/params';

/**
 * Audio Knobs – Two skeuomorphic rotary knobs (Volume & Gain) on a dark
 * brushed-metal panel. Each knob features a chrome bezel, glowing coloured
 * orb centre, position indicator tick, and smooth animated rotation.
 * An ambient glow pulses beneath each knob in its accent colour.
 */

interface AudioKnobsParams {
  // Layout
  scale: number;
  knobSize: number;
  knobGap: number;
  sliderOffset: number;
  sliderGap: number;
  panelPadding: number;
  // Colors
  backgroundColor: string;
  panelColor: string;
  volumeColor: string;
  gainColor: string;
  bezelColor: string;
  labelColor: string;
  // Animation
  speed: number;
}

// ── Easing helpers ────────────────────────────────────────────────────────────
const easeInOutCubic = (t: number): number =>
  t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

const easeInOutSine = (t: number): number =>
  -(Math.cos(Math.PI * t) - 1) / 2;

// ── Knob drawing helper ───────────────────────────────────────────────────────
function drawKnob(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  outerRadius: number,
  angle: number,       // rotation angle in radians
  accentColor: string, // e.g. '#FF9F1C' for volume, '#00D4FF' for gain
  glowIntensity: number, // 0–1 pulsing glow
  label: string,
) {
  const r = outerRadius;

  // ── Ambient glow beneath the knob ─────────────────────────────────────────
  ctx.save();
  const glowRad = r * 1.6 + glowIntensity * r * 0.25;
  const glow = ctx.createRadialGradient(cx, cy, r * 0.25, cx, cy, glowRad);
  glow.addColorStop(0, accentColor + '30');
  glow.addColorStop(0.5, accentColor + '12');
  glow.addColorStop(1, accentColor + '00');
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(cx, cy, glowRad, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // ── Outer shadow ring ─────────────────────────────────────────────────────
  ctx.save();
  ctx.shadowColor = 'rgba(0,0,0,0.7)';
  ctx.shadowBlur = 18;
  ctx.shadowOffsetY = 4;
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fillStyle = '#0D0D0D';
  ctx.fill();
  ctx.restore();

  // ── Outer bezel (chrome ring) ─────────────────────────────────────────────
  const bezelGrad = ctx.createLinearGradient(cx - r, cy - r, cx + r, cy + r);
  bezelGrad.addColorStop(0, '#4A4A4A');
  bezelGrad.addColorStop(0.3, '#2A2A2A');
  bezelGrad.addColorStop(0.5, '#3D3D3D');
  bezelGrad.addColorStop(0.7, '#1A1A1A');
  bezelGrad.addColorStop(1, '#333333');
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fillStyle = bezelGrad;
  ctx.fill();

  // Subtle bezel border
  ctx.strokeStyle = '#555555';
  ctx.lineWidth = 0.8;
  ctx.stroke();

  // ── Knurled texture ring (the grip area) ──────────────────────────────────
  const gripR = r * 0.88;
  const gripInner = r * 0.62;

  // Dark recessed area
  const recessGrad = ctx.createRadialGradient(cx, cy, gripInner, cx, cy, gripR);
  recessGrad.addColorStop(0, '#1F1F1F');
  recessGrad.addColorStop(0.6, '#181818');
  recessGrad.addColorStop(1, '#111111');
  ctx.beginPath();
  ctx.arc(cx, cy, gripR, 0, Math.PI * 2);
  ctx.fillStyle = recessGrad;
  ctx.fill();

  // Knurled notches
  const notchCount = 48;
  ctx.save();
  ctx.translate(cx, cy);
  for (let i = 0; i < notchCount; i++) {
    const a = (i / notchCount) * Math.PI * 2;
    const x1 = Math.cos(a) * (gripR - 2);
    const y1 = Math.sin(a) * (gripR - 2);
    const x2 = Math.cos(a) * (gripR * 0.92);
    const y2 = Math.sin(a) * (gripR * 0.92);
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.strokeStyle = i % 2 === 0 ? '#2C2C2C' : '#151515';
    ctx.lineWidth = 1.2;
    ctx.stroke();
  }
  ctx.restore();

  // ── Inner dark ring ───────────────────────────────────────────────────────
  const innerRingR = gripInner;
  const innerGrad = ctx.createRadialGradient(
    cx - innerRingR * 0.2, cy - innerRingR * 0.3,
    innerRingR * 0.1,
    cx, cy,
    innerRingR,
  );
  innerGrad.addColorStop(0, '#2A2A2A');
  innerGrad.addColorStop(0.7, '#171717');
  innerGrad.addColorStop(1, '#111111');
  ctx.beginPath();
  ctx.arc(cx, cy, innerRingR, 0, Math.PI * 2);
  ctx.fillStyle = innerGrad;
  ctx.fill();
  ctx.strokeStyle = '#333333';
  ctx.lineWidth = 0.6;
  ctx.stroke();

  // ── Glowing orb centre ────────────────────────────────────────────────────
  const orbR = r * 0.36;
  const intensity = 0.8 + glowIntensity * 0.2;

  // Orb shadow
  ctx.save();
  ctx.shadowColor = accentColor;
  ctx.shadowBlur = 20 + glowIntensity * 10;
  ctx.beginPath();
  ctx.arc(cx, cy, orbR, 0, Math.PI * 2);
  ctx.fillStyle = accentColor;
  ctx.fill();
  ctx.restore();

  // Orb body gradient
  const orbGrad = ctx.createRadialGradient(
    cx - orbR * 0.3, cy - orbR * 0.3, orbR * 0.05,
    cx, cy, orbR,
  );
  // Parse accent to create lighter version for centre highlight
  orbGrad.addColorStop(0, '#FFFFFF');
  orbGrad.addColorStop(0.25, mixColor(accentColor, '#FFFFFF', 0.5));
  orbGrad.addColorStop(0.6, accentColor);
  orbGrad.addColorStop(1, mixColor(accentColor, '#000000', 0.4));

  ctx.beginPath();
  ctx.arc(cx, cy, orbR, 0, Math.PI * 2);
  ctx.fillStyle = orbGrad;
  ctx.globalAlpha = intensity;
  ctx.fill();
  ctx.globalAlpha = 1;

  // Specular highlight on the orb
  const specGrad = ctx.createRadialGradient(
    cx - orbR * 0.25, cy - orbR * 0.35, orbR * 0.05,
    cx - orbR * 0.1, cy - orbR * 0.15, orbR * 0.55,
  );
  specGrad.addColorStop(0, 'rgba(255,255,255,0.6)');
  specGrad.addColorStop(0.5, 'rgba(255,255,255,0.1)');
  specGrad.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.beginPath();
  ctx.arc(cx, cy, orbR, 0, Math.PI * 2);
  ctx.fillStyle = specGrad;
  ctx.fill();

  // ── Position indicator tick ───────────────────────────────────────────────
  const tickInner = gripInner + 3;
  const tickOuter = gripR - 4;
  const tx1 = cx + Math.cos(angle) * tickInner;
  const ty1 = cy + Math.sin(angle) * tickInner;
  const tx2 = cx + Math.cos(angle) * tickOuter;
  const ty2 = cy + Math.sin(angle) * tickOuter;

  ctx.beginPath();
  ctx.moveTo(tx1, ty1);
  ctx.lineTo(tx2, ty2);
  ctx.strokeStyle = accentColor;
  ctx.lineWidth = 2.5;
  ctx.lineCap = 'round';
  ctx.shadowColor = accentColor;
  ctx.shadowBlur = 6;
  ctx.stroke();
  ctx.shadowColor = 'transparent';
  ctx.shadowBlur = 0;

  // ── Label below knob ──────────────────────────────────────────────────────
  ctx.font = '600 13px "Inter", "SF Pro Display", -apple-system, sans-serif';
  ctx.fillStyle = '#777777';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  ctx.letterSpacing = '3px';
  ctx.fillText(label, cx, cy + r + 22);
  ctx.letterSpacing = '0px';
}

// ── Colour helpers ────────────────────────────────────────────────────────────
function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace('#', '');
  return [
    parseInt(h.substring(0, 2), 16),
    parseInt(h.substring(2, 4), 16),
    parseInt(h.substring(4, 6), 16),
  ];
}

function rgbToHex(r: number, g: number, b: number): string {
  return '#' + [r, g, b].map(v =>
    Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')
  ).join('');
}

function mixColor(c1: string, c2: string, t: number): string {
  const [r1, g1, b1] = hexToRgb(c1);
  const [r2, g2, b2] = hexToRgb(c2);
  return rgbToHex(
    r1 + (r2 - r1) * t,
    g1 + (g2 - g1) * t,
    b1 + (b2 - b1) * t,
  );
}

// ── Rounded rect helper ───────────────────────────────────────────────────────
function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, w: number, h: number, r: number,
) {
  r = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
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

// ── Slider bar drawing helper ─────────────────────────────────────────────────
function drawSliderBar(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, w: number, h: number,
  fillAmount: number, // 0–1
  accentColor: string,
  glowIntensity: number,
) {
  // Track background
  roundRect(ctx, x, y, w, h, h / 2);
  ctx.fillStyle = '#1A1A1A';
  ctx.fill();
  ctx.strokeStyle = '#2A2A2A';
  ctx.lineWidth = 0.6;
  ctx.stroke();

  // Filled portion
  const fillW = Math.max(h, w * fillAmount);
  ctx.save();
  ctx.shadowColor = accentColor;
  ctx.shadowBlur = 8 + glowIntensity * 6;
  roundRect(ctx, x, y, fillW, h, h / 2);
  const barGrad = ctx.createLinearGradient(x, y, x, y + h);
  barGrad.addColorStop(0, mixColor(accentColor, '#FFFFFF', 0.2));
  barGrad.addColorStop(0.5, accentColor);
  barGrad.addColorStop(1, mixColor(accentColor, '#000000', 0.3));
  ctx.fillStyle = barGrad;
  ctx.fill();
  ctx.restore();

  // Specular highlight on bar
  if (fillW > h) {
    roundRect(ctx, x + 2, y + 1, fillW - 4, h * 0.35, h / 2);
    ctx.fillStyle = 'rgba(255,255,255,0.15)';
    ctx.fill();
  }
}

// ── Animation definition ──────────────────────────────────────────────────────
const animation: AnimationDefinition<AudioKnobsParams> = {
  id: 'audio-knobs',
  name: 'Audio Knobs',
  fps: 60,
  durationMs: 5000,
  width: 960,
  height: 540,
  background: '#050505',

  params: {
    defaults: {
      scale: 0.65,
      knobSize: 64,
      knobGap: 250,
      sliderOffset: 175,
      sliderGap: 66,
      panelPadding: 50,
      backgroundColor: '#050505',
      panelColor: '#111116',
      volumeColor: '#FF9F1C',
      gainColor: '#00D4FF',
      bezelColor: '#2A2A2A',
      labelColor: '#666666',
      speed: 1,
    },
    schema: {
      ...folder('Layout', {
        scale: number({ value: 1, min: 0.3, max: 2, step: 0.05, label: 'Scale' }),
        knobSize: number({ value: 72, min: 30, max: 120, step: 1, label: 'Knob Size' }),
        knobGap: number({ value: 210, min: 80, max: 400, step: 5, label: 'Knob Gap' }),
        sliderOffset: number({ value: 140, min: 40, max: 300, step: 5, label: 'Slider Offset' }),
        sliderGap: number({ value: 44, min: 16, max: 100, step: 2, label: 'Slider Gap' }),
        panelPadding: number({ value: 50, min: 20, max: 120, step: 5, label: 'Panel Padding' }),
      }),
      ...folder('Colors', {
        backgroundColor: color({ value: '#050505', label: 'Background' }),
        panelColor: color({ value: '#111116', label: 'Panel' }),
        volumeColor: color({ value: '#FF9F1C', label: 'Volume Accent' }),
        gainColor: color({ value: '#00D4FF', label: 'Gain Accent' }),
        bezelColor: color({ value: '#2A2A2A', label: 'Bezel' }),
        labelColor: color({ value: '#666666', label: 'Labels' }),
      }),
      ...folder('Animation', {
        speed: number({ value: 1, min: 0.2, max: 3, step: 0.1, label: 'Speed' }),
      }),
    },
  },

  render({ ctx, progress, width, height, params }) {
    const {
      scale,
      knobSize,
      knobGap,
      sliderOffset,
      sliderGap,
      panelPadding,
      backgroundColor,
      panelColor,
      volumeColor,
      gainColor,
      speed,
    } = params;

    const p = (progress * speed) % 1;

    // ── Background ────────────────────────────────────────────────────────────
    ctx.fillStyle = backgroundColor;
    ctx.fillRect(0, 0, width, height);

    // Subtle vignette
    const vig = ctx.createRadialGradient(
      width / 2, height / 2, width * 0.15,
      width / 2, height / 2, width * 0.65,
    );
    vig.addColorStop(0, 'rgba(255,255,255,0.012)');
    vig.addColorStop(1, 'rgba(0,0,0,0.3)');
    ctx.fillStyle = vig;
    ctx.fillRect(0, 0, width, height);

    // ── Centre & scale ────────────────────────────────────────────────────────
    ctx.save();
    ctx.translate(width / 2, height / 2);
    ctx.scale(scale, scale);

    // ── Panel dimensions (derived from spacing params) ─────────────────────────
    const knobR = knobSize;
    const volumeX = -knobGap / 2;
    const gainX = knobGap / 2;
    const sliderX = gainX + knobR + sliderOffset - knobR;
    const sliderW = 170;
    const sliderH = 10;
    const sliderGap_half = sliderGap / 2;

    // Calculate content bounds
    const contentLeft = volumeX - knobR;
    const contentRight = Math.max(gainX + knobR, sliderX + sliderW);
    const contentTop = -knobR;
    const contentBottom = knobR + 40; // room for labels

    // Calculate panel dimensions centered around content
    const panelW = (contentRight - contentLeft) + panelPadding * 2;
    const panelH = (contentBottom - contentTop) + panelPadding * 2;
    
    // Center the panel at (0, 0)
    const panelX = -panelW / 2;
    const panelY = -panelH / 2;
    const panelR = 22;
    
    // Position knobs relative to panel center
    const knobCenterY = 0;
    const sliderY1 = knobCenterY - sliderGap_half;
    const sliderY2 = knobCenterY + sliderGap_half;

    // Panel shadow
    ctx.save();
    ctx.shadowColor = 'rgba(0,0,0,0.6)';
    ctx.shadowBlur = 40;
    ctx.shadowOffsetY = 8;
    roundRect(ctx, panelX, panelY, panelW, panelH, panelR);
    ctx.fillStyle = panelColor;
    ctx.fill();
    ctx.restore();

    // Panel border
    roundRect(ctx, panelX, panelY, panelW, panelH, panelR);
    ctx.strokeStyle = '#2A2A2E';
    ctx.lineWidth = 1;
    ctx.stroke();

    // Panel inner bevel (top highlight)
    roundRect(ctx, panelX + 1, panelY + 1, panelW - 2, panelH - 2, panelR - 1);
    const bevelGrad = ctx.createLinearGradient(panelX, panelY, panelX, panelY + panelH);
    bevelGrad.addColorStop(0, 'rgba(255,255,255,0.04)');
    bevelGrad.addColorStop(0.15, 'rgba(255,255,255,0)');
    bevelGrad.addColorStop(0.85, 'rgba(0,0,0,0)');
    bevelGrad.addColorStop(1, 'rgba(0,0,0,0.15)');
    ctx.fillStyle = bevelGrad;
    ctx.fill();

    // Glass reflection strip
    ctx.save();
    ctx.beginPath();
    roundRect(ctx, panelX, panelY, panelW, panelH, panelR);
    ctx.clip();
    const glassGrad = ctx.createLinearGradient(panelX, panelY, panelX + panelW * 0.5, panelY + panelH * 0.35);
    glassGrad.addColorStop(0, 'rgba(255,255,255,0.035)');
    glassGrad.addColorStop(0.5, 'rgba(255,255,255,0.015)');
    glassGrad.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = glassGrad;
    ctx.fillRect(panelX, panelY, panelW, panelH * 0.45);
    ctx.restore();

    // ── Animate knob angles ───────────────────────────────────────────────────
    // Volume: rotates from ~7 o'clock (225°) to ~5 o'clock (315°) and back
    // Gain: offset timing, different range

    const volumeAngle = (() => {
      const startAngle = (5 / 4) * Math.PI;   // 225° (7 o'clock)
      const endAngle = (7 / 4) * Math.PI;     // 315° (5 o'clock)
      const range = endAngle - startAngle;
      // Smooth back-and-forth using sine wave
      const t = easeInOutSine(p);
      // First half goes up, second half goes back
      const sweep = p < 0.5
        ? easeInOutCubic(p * 2)
        : easeInOutCubic(1 - (p - 0.5) * 2);
      return startAngle + range * sweep;
    })();

    const gainAngle = (() => {
      const startAngle = (5 / 4) * Math.PI;
      const endAngle = (7 / 4) * Math.PI;
      const range = endAngle - startAngle;
      // Offset by ~0.25 phase for visual interest
      const offsetP = (p + 0.3) % 1;
      const sweep = offsetP < 0.5
        ? easeInOutCubic(offsetP * 2)
        : easeInOutCubic(1 - (offsetP - 0.5) * 2);
      return startAngle + range * sweep;
    })();

    // Glow intensity pulse
    const volumeGlow = 0.5 + 0.5 * Math.sin(p * Math.PI * 2);
    const gainGlow = 0.5 + 0.5 * Math.sin((p + 0.3) * Math.PI * 2);

    // ── Draw the two knobs ────────────────────────────────────────────────────
    drawKnob(ctx, volumeX, knobCenterY, knobR, volumeAngle, volumeColor, volumeGlow, 'VOLUME');
    drawKnob(ctx, gainX, knobCenterY, knobR, gainAngle, gainColor, gainGlow, 'GAIN');

    // Volume bar fill follows volume knob position
    const volFill = (() => {
      const startAngle = (5 / 4) * Math.PI;
      const endAngle = (7 / 4) * Math.PI;
      return (volumeAngle - startAngle) / (endAngle - startAngle);
    })();

    const gainFill = (() => {
      const startAngle = (5 / 4) * Math.PI;
      const endAngle = (7 / 4) * Math.PI;
      return (gainAngle - startAngle) / (endAngle - startAngle);
    })();

    drawSliderBar(ctx, sliderX, sliderY1, sliderW, sliderH, volFill, volumeColor, volumeGlow);
    drawSliderBar(ctx, sliderX, sliderY2, sliderW, sliderH, gainFill, gainColor, gainGlow);

    // Slider labels
    ctx.font = '500 10px "Inter", "SF Pro Display", -apple-system, sans-serif';
    ctx.fillStyle = '#555555';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'bottom';
    ctx.fillText('VOL', sliderX, sliderY1 - 4);
    ctx.fillText('GAIN', sliderX, sliderY2 - 4);

    ctx.restore(); // end centre transform
  },
};

export default animation;

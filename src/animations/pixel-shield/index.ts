import type { AnimationDefinition } from '../../runtime/types';
import { number, color, boolean, folder, select } from '../../runtime/params';

interface PixelShieldParams {
  // Layout
  scale: number;
  shape: string;
  pixelSize: number;
  pixelGap: number;
  shieldWidth: number;
  shieldHeight: number;
  // Colors
  backgroundColor: string;
  pixelColor: string;
  glowColor: string;
  coreColor: string;
  // Animation
  speed: number;
  waveIntensity: number;
  pulseStrength: number;
  buildReveal: boolean;
  outerGlow: boolean;
  // Scan Line
  scanLine: boolean;
  scanLineColor: string;
  scanLineWidth: number;
  scanLineOpacity: number;
  scanLineSpeed: number;
  scanPixelBoost: number;
}

// ─── Shape Functions ─────────────────────────────────────────
// All take normalized coords (nx, ny) in roughly [-1, 1] and return boolean

function shapeShield(nx: number, ny: number): boolean {
  if (ny < -1 || ny > 1 || Math.abs(nx) > 1.1) return false;
  let maxW: number;
  if (ny <= -0.7) {
    const t = (ny + 1) / 0.3;
    maxW = Math.sqrt(Math.max(0, t));
  } else if (ny <= 0.15) {
    maxW = 1.0;
  } else {
    const t = (ny - 0.15) / 0.85;
    maxW = Math.pow(1 - t, 1.3);
  }
  return Math.abs(nx) <= maxW;
}

function shapeHeart(nx: number, ny: number): boolean {
  // Flip y so heart points down: map ny from visual top-to-bottom to math bottom-to-top
  const x = nx * 1.1;
  const y = -ny * 1.1 + 0.1; // shift up slightly
  // Implicit heart equation: (x² + y² - 1)³ - x²y³ <= 0
  const x2 = x * x;
  const y2 = y * y;
  const val = Math.pow(x2 + y2 - 1, 3) - x2 * y2 * y;
  return val <= 0;
}

function shapeSmiley(nx: number, ny: number): boolean {
  // Outer circle
  const dist = nx * nx + ny * ny;
  if (dist > 1) return false;

  // Left eye (hollow)
  const lex = nx + 0.35, ley = ny + 0.28;
  if (lex * lex + ley * ley < 0.025) return false;

  // Right eye (hollow)
  const rex = nx - 0.35, rey = ny + 0.28;
  if (rex * rex + rey * rey < 0.025) return false;

  // Smile (hollow arc) — carve out below a downward arc
  if (ny > 0.05 && ny < 0.55) {
    const smileY = 0.15 + 0.4 * (1 - nx * nx * 2.5);
    const smileInner = smileY - 0.12;
    if (Math.abs(nx) < 0.6 && ny > smileInner && ny < smileY) return false;
  }

  return true;
}

function shapeStar(nx: number, ny: number): boolean {
  const angle = Math.atan2(ny, nx);
  const dist = Math.sqrt(nx * nx + ny * ny);
  // 5-pointed star
  const points = 5;
  const a = (angle + Math.PI / 2); // rotate so top point faces up
  const slice = (Math.PI * 2) / points;
  const segAngle = ((a % slice) + slice) % slice;
  const halfSlice = slice / 2;
  // Outer and inner radius
  const outerR = 1.0;
  const innerR = 0.42;
  // Interpolate between inner and outer based on angle within segment
  const t = Math.abs(segAngle - halfSlice) / halfSlice; // 0 at midpoint, 1 at tip
  const maxR = innerR + (outerR - innerR) * t;
  return dist <= maxR;
}

function shapeCircle(nx: number, ny: number): boolean {
  return (nx * nx + ny * ny) <= 1;
}

function shapeDiamond(nx: number, ny: number): boolean {
  return (Math.abs(nx) + Math.abs(ny)) <= 1;
}

function shapeLock(nx: number, ny: number): boolean {
  // Lock body: rounded rectangle in bottom half
  if (ny > -0.1 && ny < 0.9) {
    const bodyW = 0.75;
    const rounded = 0.08;
    const dx = Math.max(0, Math.abs(nx) - bodyW + rounded);
    const topDy = Math.max(0, -0.1 + rounded - ny);
    const botDy = Math.max(0, ny - 0.9 + rounded);
    if (dx * dx + topDy * topDy <= rounded * rounded ||
        dx * dx + botDy * botDy <= rounded * rounded ||
        (Math.abs(nx) <= bodyW && ny >= -0.1 + rounded && ny <= 0.9 - rounded) ||
        (Math.abs(nx) <= bodyW - rounded && ny >= -0.1 && ny <= 0.9)) {

      // Keyhole cutout
      const kx = nx, ky = ny - 0.3;
      if (kx * kx + ky * ky < 0.035) return false; // circle part
      if (Math.abs(kx) < 0.07 && ky > 0 && ky < 0.35) return false; // slot part

      return true;
    }
  }

  // Shackle: U-shape arc on top
  if (ny >= -0.75 && ny <= -0.05) {
    const shackleOuter = 0.48;
    const shackleInner = 0.32;
    const sx = nx;
    const sy = ny + 0.05;
    const r = Math.sqrt(sx * sx + sy * sy);
    // Top arc only
    if (sy <= 0 && r >= shackleInner && r <= shackleOuter) return true;
    // Vertical stems
    if (ny > -0.5 && ny <= -0.05) {
      if ((Math.abs(nx) >= shackleInner && Math.abs(nx) <= shackleOuter)) return true;
    }
  }

  return false;
}

function shapeLightning(nx: number, ny: number): boolean {
  // Lightning bolt as a polygon
  const x = nx;
  const y = ny;

  // Define bolt as a series of segments with width
  // Main bolt path (simplified zigzag)
  const segments = [
    { x1: 0.15, y1: -1.0, x2: -0.25, y2: -0.15, w: 0.18 },
    { x1: -0.25, y1: -0.15, x2: 0.35, y2: -0.15, w: 0.12 }, // horizontal bar
    { x1: 0.1, y1: -0.15, x2: -0.2, y2: 1.0, w: 0.16 },
  ];

  for (const seg of segments) {
    const dx = seg.x2 - seg.x1;
    const dy = seg.y2 - seg.y1;
    const len = Math.sqrt(dx * dx + dy * dy);
    // Normal perpendicular to segment
    const pnx = -dy / len;
    const pny = dx / len;
    // Project point onto segment
    const t = ((x - seg.x1) * dx + (y - seg.y1) * dy) / (len * len);
    if (t < -0.05 || t > 1.05) continue;
    const projX = seg.x1 + t * dx;
    const projY = seg.y1 + t * dy;
    const perpDist = Math.abs((x - projX) * pnx + (y - projY) * pny);
    if (perpDist <= seg.w) return true;
  }
  return false;
}

function shapeCross(nx: number, ny: number): boolean {
  const armW = 0.3;
  return (Math.abs(nx) <= armW && Math.abs(ny) <= 0.95) ||
         (Math.abs(ny) <= armW && Math.abs(nx) <= 0.95);
}

// ─── Shape dispatcher ────────────────────────────────────────
type ShapeFn = (nx: number, ny: number) => boolean;
const shapes: Record<string, ShapeFn> = {
  shield: shapeShield,
  heart: shapeHeart,
  smiley: shapeSmiley,
  star: shapeStar,
  circle: shapeCircle,
  diamond: shapeDiamond,
  lock: shapeLock,
  lightning: shapeLightning,
  cross: shapeCross,
};

function isInsideShape(
  shape: string,
  x: number,
  y: number,
  w: number,
  h: number
): boolean {
  const nx = x / (w * 0.5);
  const ny = y / (h * 0.5);
  const fn = shapes[shape] ?? shapeShield;
  return fn(nx, ny);
}

// ─── Utility functions ───────────────────────────────────────

function seededRandom(x: number, y: number): number {
  const n = Math.sin(x * 127.1 + y * 311.7) * 43758.5453;
  return n - Math.floor(n);
}

function wave(x: number, y: number, t: number): number {
  return (
    Math.sin(x * 0.12 + t * 2.0) * 0.3 +
    Math.sin(y * 0.10 - t * 1.5) * 0.3 +
    Math.sin((x + y) * 0.06 + t * 1.0) * 0.2 +
    Math.sin((x - y) * 0.08 - t * 0.8) * 0.2
  );
}

function hexAlpha(a: number): string {
  const clamped = Math.max(0, Math.min(1, a));
  return Math.round(clamped * 255).toString(16).padStart(2, '0');
}

// ─── Animation Definition ────────────────────────────────────

const animation: AnimationDefinition<PixelShieldParams> = {
  id: 'pixel-shield',
  name: 'Pixel Shield',
  fps: 60,
  durationMs: 6000,
  width: 1920,
  height: 1080,
  background: '#050510',

  params: {
    defaults: {
      scale: 0.7,
      shape: 'heart',
      pixelSize: 20,
      pixelGap: 4,
      shieldWidth: 500,
      shieldHeight: 450,
      backgroundColor: '#050510',
      pixelColor: '#f86363',
      glowColor: '#ee2079',
      coreColor: '#ffcccc',
      speed: 1.8,
      waveIntensity: 0.5,
      pulseStrength: 0.85,
      buildReveal: true,
      outerGlow: true,
      scanLine: true,
      scanLineColor: '#CCDDFF',
      scanLineWidth: 165,
      scanLineOpacity: 0,
      scanLineSpeed: 1.4,
      scanPixelBoost: 0.4,
    },
    schema: {
      ...folder('Layout', {
        scale: number({ value: 1, min: 0.3, max: 3, step: 0.1, label: 'Scale' }),
        shape: select({
          value: 'shield',
          options: [
            { label: 'Shield', value: 'shield' },
            { label: 'Heart', value: 'heart' },
            { label: 'Smiley', value: 'smiley' },
            { label: 'Star', value: 'star' },
            { label: 'Circle', value: 'circle' },
            { label: 'Diamond', value: 'diamond' },
            { label: 'Lock', value: 'lock' },
            { label: 'Lightning', value: 'lightning' },
            { label: 'Cross', value: 'cross' },
          ],
          label: 'Shape',
        }),
        pixelSize: number({ value: 18, min: 6, max: 40, step: 1, label: 'Pixel Size' }),
        pixelGap: number({ value: 3, min: 0, max: 10, step: 1, label: 'Pixel Gap' }),
        shieldWidth: number({ value: 380, min: 150, max: 600, step: 10, label: 'Shape Width' }),
        shieldHeight: number({ value: 440, min: 200, max: 700, step: 10, label: 'Shape Height' }),
      }),
      ...folder('Colors', {
        backgroundColor: color({ value: '#050510', label: 'Background' }),
        pixelColor: color({ value: '#5566EE', label: 'Pixel Color' }),
        glowColor: color({ value: '#7788FF', label: 'Glow Color' }),
        coreColor: color({ value: '#CCDDFF', label: 'Core Bright' }),
      }),
      ...folder('Animation', {
        speed: number({ value: 1, min: 0.1, max: 3, step: 0.1, label: 'Speed' }),
        waveIntensity: number({ value: 0.5, min: 0, max: 1, step: 0.05, label: 'Wave Intensity' }),
        pulseStrength: number({ value: 0.3, min: 0, max: 1, step: 0.05, label: 'Pulse Strength' }),
        buildReveal: boolean({ value: true, label: 'Build Reveal' }),
        outerGlow: boolean({ value: true, label: 'Outer Glow' }),
      }),
      ...folder('Scan Line', {
        scanLine: boolean({ value: true, label: 'Enabled' }),
        scanLineColor: color({ value: '#CCDDFF', label: 'Color' }),
        scanLineWidth: number({ value: 100, min: 20, max: 300, step: 5, label: 'Width' }),
        scanLineOpacity: number({ value: 0.5, min: 0, max: 1, step: 0.05, label: 'Opacity' }),
        scanLineSpeed: number({ value: 0.7, min: 0.1, max: 3, step: 0.1, label: 'Speed' }),
        scanPixelBoost: number({ value: 0.4, min: 0, max: 1, step: 0.05, label: 'Pixel Boost' }),
      }),
    },
  },

  render({ ctx, width, height, progress, params }) {
    const {
      scale,
      shape,
      pixelSize,
      pixelGap,
      shieldWidth,
      shieldHeight,
      backgroundColor,
      pixelColor,
      glowColor,
      coreColor,
      speed,
      waveIntensity,
      pulseStrength,
      buildReveal,
      outerGlow,
      scanLine,
      scanLineColor,
      scanLineWidth,
      scanLineOpacity,
      scanLineSpeed,
      scanPixelBoost,
    } = params;

    const t = progress * speed * Math.PI * 2;
    const cellStep = pixelSize + pixelGap;

    // --- Background ---
    ctx.fillStyle = backgroundColor;
    ctx.fillRect(0, 0, width, height);

    // Dark radial vignette
    const vignette = ctx.createRadialGradient(
      width / 2, height / 2, Math.min(width, height) * 0.05,
      width / 2, height / 2, Math.max(width, height) * 0.65
    );
    vignette.addColorStop(0, 'rgba(0,0,0,0)');
    vignette.addColorStop(1, 'rgba(0,0,0,0.6)');
    ctx.fillStyle = vignette;
    ctx.fillRect(0, 0, width, height);

    ctx.save();
    ctx.translate(width / 2, height / 2);
    ctx.scale(scale, scale);

    // --- Parse colors to RGB ---
    const pr = parseInt(pixelColor.slice(1, 3), 16);
    const pg = parseInt(pixelColor.slice(3, 5), 16);
    const pb = parseInt(pixelColor.slice(5, 7), 16);

    const gr = parseInt(glowColor.slice(1, 3), 16);
    const gg = parseInt(glowColor.slice(3, 5), 16);
    const gb = parseInt(glowColor.slice(5, 7), 16);

    const cr = parseInt(coreColor.slice(1, 3), 16);
    const cg = parseInt(coreColor.slice(3, 5), 16);
    const cb = parseInt(coreColor.slice(5, 7), 16);

    // --- Grid bounds ---
    const halfSW = shieldWidth;
    const halfSH = shieldHeight;
    const startCol = Math.floor(-halfSW / cellStep);
    const endCol = Math.ceil(halfSW / cellStep);
    const startRow = Math.floor(-halfSH / cellStep);
    const endRow = Math.ceil(halfSH / cellStep);

    // Build reveal progress (0→1 over first 35% of animation)
    const revealProgress = buildReveal
      ? Math.min(1, progress * speed / 0.35)
      : 1;
    const easedReveal = 1 - Math.pow(1 - revealProgress, 3);

    // Scan line position (oscillates vertically, speed-controllable)
    const scanY = scanLine
      ? Math.sin(t * scanLineSpeed) * halfSH * 0.8
      : -99999;

    // --- Large outer glow behind shape ---
    if (outerGlow) {
      const glowPulse = 0.5 + 0.5 * Math.sin(t * 0.5);
      const outerRadius = Math.max(halfSW, halfSH) * 1.4;
      const grad = ctx.createRadialGradient(
        0, 0, halfSW * 0.2,
        0, 0, outerRadius
      );
      const baseAlpha = (0.15 + glowPulse * 0.1) * easedReveal;
      grad.addColorStop(0, `rgba(${gr},${gg},${gb},${baseAlpha.toFixed(3)})`);
      grad.addColorStop(0.4, `rgba(${gr},${gg},${gb},${(baseAlpha * 0.25).toFixed(3)})`);
      grad.addColorStop(1, `rgba(${gr},${gg},${gb},0)`);
      ctx.fillStyle = grad;
      ctx.fillRect(-outerRadius, -outerRadius, outerRadius * 2, outerRadius * 2);
    }

    // --- Pre-compute pixels inside the chosen shape ---
    const pixels: { col: number; row: number; cx: number; cy: number; dist: number; seed: number }[] = [];
    for (let row = startRow; row <= endRow; row++) {
      for (let col = startCol; col <= endCol; col++) {
        const cx = col * cellStep;
        const cy = row * cellStep;
        if (!isInsideShape(shape, cx, cy, halfSW, halfSH)) continue;
        const dist = Math.sqrt(
          (cx / halfSW) * (cx / halfSW) +
          (cy / halfSH) * (cy / halfSH)
        );
        pixels.push({ col, row, cx, cy, dist, seed: seededRandom(col, row) });
      }
    }

    // --- Draw pixel glows (larger, softer) behind the main pixels ---
    for (const p of pixels) {
      const { cx, cy, dist, seed } = p;

      const revealThreshold = buildReveal ? (1 - dist) * 0.65 + seed * 0.35 : 1;
      if (easedReveal < revealThreshold * 0.9) continue;

      const appearAlpha = buildReveal
        ? Math.min(1, (easedReveal - revealThreshold * 0.8) / 0.2)
        : 1;

      const waveVal = wave(cx, cy, t) * waveIntensity;
      const pulse = Math.sin(t * 1.2 - dist * 3.5) * pulseStrength;
      const scanDist = Math.abs(cy - scanY);
      const scanBoost = scanLine ? Math.max(0, 1 - scanDist / (scanLineWidth * 0.5)) * scanPixelBoost : 0;

      const brightness = Math.max(0.2, Math.min(1,
        0.65 + (1 - dist) * 0.2 + waveVal * 0.2 + pulse * 0.12 + scanBoost
      ));

      const alpha = brightness * appearAlpha;
      if (alpha < 0.05) continue;

      const glowSize = pixelSize * (2.0 + brightness * 1.5);
      const glowAlpha = alpha * 0.15 * brightness;
      ctx.fillStyle = `rgba(${gr},${gg},${gb},${glowAlpha.toFixed(3)})`;
      ctx.fillRect(cx - glowSize / 2, cy - glowSize / 2, glowSize, glowSize);
    }

    // --- Draw main pixels ---
    for (const p of pixels) {
      const { cx, cy, dist, seed } = p;

      const revealThreshold = buildReveal ? (1 - dist) * 0.65 + seed * 0.35 : 1;
      if (easedReveal < revealThreshold * 0.9) continue;

      const appearAlpha = buildReveal
        ? Math.min(1, (easedReveal - revealThreshold * 0.8) / 0.2)
        : 1;

      const waveVal = wave(cx, cy, t) * waveIntensity;
      const pulse = Math.sin(t * 1.2 - dist * 3.5) * pulseStrength;
      const scanDist = Math.abs(cy - scanY);
      const scanBoost = scanLine ? Math.max(0, 1 - scanDist / (scanLineWidth * 0.5)) * scanPixelBoost : 0;

      const brightness = Math.max(0.2, Math.min(1,
        0.65 + (1 - dist) * 0.2 + waveVal * 0.2 + pulse * 0.12 + scanBoost
      ));

      const alpha = Math.max(0, Math.min(1, brightness * appearAlpha));
      if (alpha < 0.03) continue;

      const bright = Math.pow(brightness, 1.2);
      const r = Math.round(pr + (cr - pr) * bright);
      const g = Math.round(pg + (cg - pg) * bright);
      const b = Math.round(pb + (cb - pb) * bright);

      // Main pixel square
      ctx.fillStyle = `rgba(${r},${g},${b},${(alpha * 0.92).toFixed(3)})`;
      ctx.fillRect(cx - pixelSize / 2, cy - pixelSize / 2, pixelSize, pixelSize);

      // Inner bright highlight
      if (brightness > 0.5) {
        const coreAlpha = (brightness - 0.5) * 2.0 * alpha * 0.35;
        const coreSize = pixelSize * 0.55;
        ctx.fillStyle = `rgba(${cr},${cg},${cb},${coreAlpha.toFixed(3)})`;
        ctx.fillRect(cx - coreSize / 2, cy - coreSize / 2, coreSize, coreSize);
      }

      // Subtle pixel border for definition
      if (brightness > 0.25 && pixelGap < 2) {
        ctx.strokeStyle = `rgba(${Math.round(pr * 0.4)},${Math.round(pg * 0.4)},${Math.round(pb * 0.4)},${(alpha * 0.3).toFixed(3)})`;
        ctx.lineWidth = 0.5;
        ctx.strokeRect(cx - pixelSize / 2, cy - pixelSize / 2, pixelSize, pixelSize);
      }
    }

    // --- Scan line horizontal glow ---
    if (scanLine && easedReveal > 0.3) {
      // Parse scan line color
      const slr = parseInt(scanLineColor.slice(1, 3), 16);
      const slg = parseInt(scanLineColor.slice(3, 5), 16);
      const slb = parseInt(scanLineColor.slice(5, 7), 16);

      const halfW = scanLineWidth / 2;
      const fadeIn = Math.min(1, (easedReveal - 0.3) / 0.2);
      const scanAlpha = scanLineOpacity * fadeIn;

      const scanGrad = ctx.createLinearGradient(0, scanY - halfW, 0, scanY + halfW);
      scanGrad.addColorStop(0, `rgba(${slr},${slg},${slb},0)`);
      scanGrad.addColorStop(0.3, `rgba(${slr},${slg},${slb},${(scanAlpha * 0.4).toFixed(3)})`);
      scanGrad.addColorStop(0.5, `rgba(${slr},${slg},${slb},${scanAlpha.toFixed(3)})`);
      scanGrad.addColorStop(0.7, `rgba(${slr},${slg},${slb},${(scanAlpha * 0.4).toFixed(3)})`);
      scanGrad.addColorStop(1, `rgba(${slr},${slg},${slb},0)`);
      ctx.fillStyle = scanGrad;
      ctx.fillRect(-halfSW * 1.2, scanY - halfW, halfSW * 2.4, scanLineWidth);
    }

    // --- Floating particles around perimeter ---
    const particleCount = 24;
    for (let i = 0; i < particleCount; i++) {
      const angle = (i / particleCount) * Math.PI * 2 + t * 0.25;
      const radiusX = halfSW * (0.88 + 0.12 * Math.sin(t * 0.4 + i * 2.3));
      const radiusY = halfSH * (0.82 + 0.12 * Math.cos(t * 0.35 + i * 1.9));
      const px = Math.cos(angle) * radiusX;
      const py = Math.sin(angle) * radiusY * 0.85;
      const pAlpha = (0.15 + 0.35 * Math.sin(t * 1.5 + i * 3.7)) * easedReveal;
      const pSize = 1.2 + Math.sin(t * 0.8 + i * 5) * 0.8;

      if (pAlpha < 0.05) continue;

      const pGlowGrad = ctx.createRadialGradient(px, py, 0, px, py, pSize * 4);
      pGlowGrad.addColorStop(0, glowColor + hexAlpha(pAlpha * 0.4));
      pGlowGrad.addColorStop(1, glowColor + '00');
      ctx.fillStyle = pGlowGrad;
      ctx.beginPath();
      ctx.arc(px, py, pSize * 4, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = `rgba(${cr},${cg},${cb},${pAlpha.toFixed(3)})`;
      ctx.beginPath();
      ctx.arc(px, py, pSize, 0, Math.PI * 2);
      ctx.fill();
    }

    // --- Scattered sparkle dots ---
    const sparkleCount = 40;
    for (let i = 0; i < sparkleCount; i++) {
      const seed1 = seededRandom(i * 7, i * 13);
      const seed2 = seededRandom(i * 19, i * 3);
      const angle = seed1 * Math.PI * 2 + t * 0.15 * (seed2 > 0.5 ? 1 : -1);
      const radius = halfSW * (1.05 + seed2 * 0.6);
      const sx = Math.cos(angle) * radius;
      const sy = Math.sin(angle) * radius * 0.85;
      const twinkle = Math.sin(t * 3 + seed1 * 20);
      const sAlpha = Math.max(0, twinkle * 0.3) * easedReveal;

      if (sAlpha < 0.02) continue;

      ctx.fillStyle = `rgba(${cr},${cg},${cb},${sAlpha.toFixed(3)})`;
      ctx.beginPath();
      ctx.arc(sx, sy, 0.8 + seed1 * 0.6, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  },
};

export default animation;

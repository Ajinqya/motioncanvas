import type { AnimationDefinition } from '../../runtime/types';
import { number, color, folder } from '../../runtime/params';

/**
 * Isometric Button – A clean isometric keyboard key that animates a press-and-release.
 * Inspired by technical-illustration style with thin outlines, subtle shading, and rounded caps.
 */

interface IsometricButtonParams {
  // Layout
  scale: number;
  // Colors
  backgroundColor: string;
  keyColor: string;
  strokeColor: string;
  textColor: string;
  sideColor: string;
  frontColor: string;
  baseColor: string;
  // Animation
  speed: number;
  pressDepth: number;
}

// ── Easing helpers ──────────────────────────────────────────────────────────
const easeInCubic = (t: number): number => t * t * t;

const easeOutBack = (t: number): number => {
  const c1 = 1.70158;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
};

// ── Isometric constants ─────────────────────────────────────────────────────
const ISO_ANGLE = Math.PI / 6;
const COS30 = Math.cos(ISO_ANGLE);
const SIN30 = Math.sin(ISO_ANGLE);

/** Project a 3-D point into 2-D isometric screen coordinates. */
function iso(x: number, y: number, z: number): [number, number] {
  return [(x - y) * COS30, (x + y) * SIN30 - z];
}

/** Draw a rounded-rect path manually. */
function roundedRectPath(
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

// ── Animation definition ────────────────────────────────────────────────────
const animation: AnimationDefinition<IsometricButtonParams> = {
  id: 'isometric-button',
  name: 'Isometric Button',
  fps: 60,
  durationMs: 2500,
  width: 800,
  height: 800,
  background: '#FFFFFF',

  params: {
    defaults: {
      scale: 1.4,
      backgroundColor: '#FFFFFF',
      keyColor: '#FAFAFA',
      strokeColor: '#3D3D3D',
      textColor: '#555555',
      sideColor: '#DCDCDC',
      frontColor: '#E8E8E8',
      baseColor: '#B0B0B0',
      speed: 1,
      pressDepth: 0.7,
    },
    schema: {
      ...folder('Layout', {
        scale: number({ value: 1.4, min: 0.5, max: 3, step: 0.1, label: 'Scale' }),
      }),
      ...folder('Colors', {
        backgroundColor: color({ value: '#FFFFFF', label: 'Background' }),
        keyColor: color({ value: '#FAFAFA', label: 'Key Surface' }),
        strokeColor: color({ value: '#3D3D3D', label: 'Outlines' }),
        textColor: color({ value: '#555555', label: 'Text' }),
        sideColor: color({ value: '#DCDCDC', label: 'Right Face' }),
        frontColor: color({ value: '#E8E8E8', label: 'Front Face' }),
        baseColor: color({ value: '#B0B0B0', label: 'Base Dots' }),
      }),
      ...folder('Animation', {
        speed: number({ value: 1, min: 0.5, max: 3, step: 0.1, label: 'Speed' }),
        pressDepth: number({
          value: 0.7,
          min: 0.3,
          max: 0.9,
          step: 0.05,
          label: 'Press Depth',
        }),
      }),
    },
  },

  render({ ctx, progress, width, height, params }) {
    const {
      scale,
      backgroundColor,
      keyColor,
      strokeColor,
      textColor,
      sideColor,
      frontColor,
      baseColor,
      speed,
      pressDepth,
    } = params;

    // ── Clear ────────────────────────────────────────────────────────────────
    ctx.fillStyle = backgroundColor;
    ctx.fillRect(0, 0, width, height);

    // ── Key geometry ─────────────────────────────────────────────────────────
    const keyW = 200; // width along iso X
    const keyD = 120; // depth along iso Y
    const maxH = 55; // full rest height along Z
    const minH = maxH * (1 - pressDepth);
    const topR = 14; // corner radius – top face
    const capR = 12; // corner radius for key-cap inset
    const baseR = 10; // corner radius for dotted base
    const basePad = 14; // padding around base outline
    const capInset = 8; // inset for key-cap ledge
    const strokeW = 1.6;

    // ── Press animation ──────────────────────────────────────────────────────
    const adj = (progress * speed) % 1;
    let pressAmt = 0; // 0 = rest, 1 = fully pressed

    if (adj < 0.25) {
      pressAmt = 0;
    } else if (adj < 0.42) {
      pressAmt = easeInCubic((adj - 0.25) / 0.17);
    } else if (adj < 0.50) {
      pressAmt = 1;
    } else if (adj < 0.72) {
      pressAmt = 1 - easeOutBack((adj - 0.50) / 0.22);
    } else {
      pressAmt = 0;
    }

    // Height – includes possible overshoot (pressAmt slightly < 0)
    const h = maxH - (maxH - minH) * pressAmt;

    // ── Centre the key in viewport ───────────────────────────────────────────
    const bbCx = (keyW - keyD) * COS30 / 2;
    const bbCy = (keyW + keyD) * SIN30 / 2 - maxH / 2;

    ctx.save();
    ctx.translate(width / 2, height / 2);
    ctx.scale(scale, scale);
    ctx.translate(-bbCx, -bbCy);

    // ── 1. Dotted base outline (rounded rect on ground plane) ────────────────
    ctx.save();
    const bOrigin = iso(-basePad, -basePad, 0);
    ctx.translate(bOrigin[0], bOrigin[1]);
    ctx.transform(COS30, SIN30, -COS30, SIN30, 0, 0);
    ctx.setLineDash([5, 5]);
    ctx.strokeStyle = baseColor;
    ctx.lineWidth = 1.2;
    ctx.lineCap = 'round';
    ctx.beginPath();
    roundedRectPath(ctx, 0, 0, keyW + basePad * 2, keyD + basePad * 2, baseR);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();

    // ── Projected corner points ──────────────────────────────────────────────
    // Bottom (z = 0)
    const b_fl = iso(0, 0, 0);
    const b_fr = iso(keyW, 0, 0);
    const b_br = iso(keyW, keyD, 0);
    const b_bl = iso(0, keyD, 0);
    // Top (z = h)
    const t_fl = iso(0, 0, h);
    const t_fr = iso(keyW, 0, h);
    const t_br = iso(keyW, keyD, h);
    const t_bl = iso(0, keyD, h);

    // ── 2. Silhouette fill (convex hull masks dotted base behind key body) ───
    ctx.beginPath();
    ctx.moveTo(t_fl[0], t_fl[1]);
    ctx.lineTo(t_fr[0], t_fr[1]);
    ctx.lineTo(b_fr[0], b_fr[1]);
    ctx.lineTo(b_br[0], b_br[1]);
    ctx.lineTo(b_bl[0], b_bl[1]);
    ctx.lineTo(t_bl[0], t_bl[1]);
    ctx.closePath();
    ctx.fillStyle = backgroundColor;
    ctx.fill();

    // ── 3. Left face fill ────────────────────────────────────────────────────
    ctx.beginPath();
    ctx.moveTo(b_fl[0], b_fl[1]);
    ctx.lineTo(b_bl[0], b_bl[1]);
    ctx.lineTo(t_bl[0], t_bl[1]);
    ctx.lineTo(t_fl[0], t_fl[1]);
    ctx.closePath();
    ctx.fillStyle = sideColor;
    ctx.fill();

    // ── 4. Right side face fill ──────────────────────────────────────────────
    ctx.beginPath();
    ctx.moveTo(b_fr[0], b_fr[1]);
    ctx.lineTo(b_br[0], b_br[1]);
    ctx.lineTo(t_br[0], t_br[1]);
    ctx.lineTo(t_fr[0], t_fr[1]);
    ctx.closePath();
    ctx.fillStyle = sideColor;
    ctx.fill();

    // ── 5. Front face fill ───────────────────────────────────────────────────
    ctx.beginPath();
    ctx.moveTo(b_fl[0], b_fl[1]);
    ctx.lineTo(b_fr[0], b_fr[1]);
    ctx.lineTo(t_fr[0], t_fr[1]);
    ctx.lineTo(t_fl[0], t_fl[1]);
    ctx.closePath();
    ctx.fillStyle = frontColor;
    ctx.fill();

    // ── 6. Top face (rounded rect via isometric transform) ───────────────────
    ctx.save();
    const tOrigin = iso(0, 0, h);
    ctx.translate(tOrigin[0], tOrigin[1]);
    ctx.transform(COS30, SIN30, -COS30, SIN30, 0, 0);

    // Full rounded-rect surface fill
    ctx.beginPath();
    roundedRectPath(ctx, 0, 0, keyW, keyD, topR);
    ctx.fillStyle = keyColor;
    ctx.fill();

    // Top face outline (rounded)
    ctx.strokeStyle = strokeColor;
    ctx.lineWidth = strokeW;
    ctx.lineJoin = 'round';
    ctx.stroke();

    // Key-cap ledge (subtle inset outline)
    ctx.beginPath();
    roundedRectPath(
      ctx,
      capInset,
      capInset,
      keyW - capInset * 2,
      keyD - capInset * 2,
      capR,
    );
    ctx.strokeStyle = strokeColor;
    ctx.lineWidth = 0.8;
    ctx.globalAlpha = 0.30;
    ctx.stroke();
    ctx.globalAlpha = 1;

    // ── 7. "Launch" text ─────────────────────────────────────────────────────
    const fontSize = 32;
    ctx.font = `500 ${fontSize}px "Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, sans-serif`;
    ctx.fillStyle = textColor;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('Launch', keyW / 2, keyD / 2 + 1);

    ctx.restore(); // end top-face transform

    // ── 8. Side-face outlines (drawn last so they sit on top) ────────────────
    ctx.strokeStyle = strokeColor;
    ctx.lineWidth = strokeW;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    // Front face: left vertical + bottom edge
    ctx.beginPath();
    ctx.moveTo(t_fl[0], t_fl[1]);
    ctx.lineTo(b_fl[0], b_fl[1]);
    ctx.lineTo(b_fr[0], b_fr[1]);
    ctx.stroke();

    // Front-right shared vertical edge
    ctx.beginPath();
    ctx.moveTo(b_fr[0], b_fr[1]);
    ctx.lineTo(t_fr[0], t_fr[1]);
    ctx.stroke();

    // Right face: bottom edge + back vertical
    ctx.beginPath();
    ctx.moveTo(b_fr[0], b_fr[1]);
    ctx.lineTo(b_br[0], b_br[1]);
    ctx.lineTo(t_br[0], t_br[1]);
    ctx.stroke();

    // Left face: bottom edge + back vertical
    ctx.beginPath();
    ctx.moveTo(b_fl[0], b_fl[1]);
    ctx.lineTo(b_bl[0], b_bl[1]);
    ctx.lineTo(t_bl[0], t_bl[1]);
    ctx.stroke();

    ctx.restore(); // end centring transform
  },
};

export default animation;

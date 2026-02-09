import type { AnimationDefinition } from '../../runtime/types';
import { number, color, folder } from '../../runtime/params';

/**
 * Keyboard Shortcut – Five isometric mechanical keys (⌘ ⌥ C V H) on a dark
 * tray, each pressing in sequence with a satisfying spring-bounce release.
 */

interface KeyboardShortcutParams {
  // Layout
  scale: number;
  // Colors
  backgroundColor: string;
  gridColor: string;
  keyColor: string;
  commandKeyColor: string;
  textColor: string;
  commandTextColor: string;
  // Animation
  speed: number;
  pressDepth: number;
}

// ── Key configuration ───────────────────────────────────────────────────────
const KEYS: { label: string; dark: boolean; fontSize: number }[] = [
  { label: '⌘', dark: true, fontSize: 30 },
  { label: '⌥', dark: false, fontSize: 28 },
  { label: 'C', dark: false, fontSize: 30 },
  { label: 'V', dark: false, fontSize: 30 },
  { label: 'H', dark: false, fontSize: 30 },
];

// ── Easing helpers ──────────────────────────────────────────────────────────
const easeInCubic = (t: number): number => t * t * t;

const easeOutBack = (t: number): number => {
  const c1 = 1.70158;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
};

// ── Isometric helpers ───────────────────────────────────────────────────────
const COS30 = Math.cos(Math.PI / 6);
const SIN30 = 0.5;

function iso(x: number, y: number, z: number): [number, number] {
  return [(x - y) * COS30, (x + y) * SIN30 - z];
}

function rrect(
  c: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  r = Math.min(r, w / 2, h / 2);
  c.moveTo(x + r, y);
  c.lineTo(x + w - r, y);
  c.arcTo(x + w, y, x + w, y + r, r);
  c.lineTo(x + w, y + h - r);
  c.arcTo(x + w, y + h, x + w - r, y + h, r);
  c.lineTo(x + r, y + h);
  c.arcTo(x, y + h, x, y + h - r, r);
  c.lineTo(x, y + r);
  c.arcTo(x, y, x + r, y, r);
  c.closePath();
}

/**
 * Generates bevelled perimeter points for the two visible side faces of a
 * rounded box in isometric (1,1,1) view. Returns arrays of (x,y) points in
 * local coords for the right-face and back-face "curtains".
 */
function bevelPerim(w: number, d: number, r: number, N = 8) {
  const R: [number, number][] = [];
  const B: [number, number][] = [];
  if (r <= 0) {
    R.push([w, 0], [w, d]);
    B.push([w, d], [0, d]);
    return { R, B };
  }
  // Right face: top-right arc (-π/4→0) + straight edge + bottom-right arc (0→π/4)
  for (let i = 0; i <= N; i++) {
    const a = -Math.PI / 4 + (Math.PI / 4) * i / N;
    R.push([w - r + r * Math.cos(a), r + r * Math.sin(a)]);
  }
  R.push([w, d - r]);
  for (let i = 1; i <= N; i++) {
    const a = (Math.PI / 4) * i / N;
    R.push([w - r + r * Math.cos(a), d - r + r * Math.sin(a)]);
  }
  // Back face: bottom-right arc (π/4→π/2) + straight edge + bottom-left arc (π/2→3π/4)
  for (let i = 0; i <= N; i++) {
    const a = Math.PI / 4 + (Math.PI / 4) * i / N;
    B.push([w - r + r * Math.cos(a), d - r + r * Math.sin(a)]);
  }
  B.push([r, d]);
  for (let i = 1; i <= N; i++) {
    const a = Math.PI / 2 + (Math.PI / 4) * i / N;
    B.push([r + r * Math.cos(a), d - r + r * Math.sin(a)]);
  }
  return { R, B };
}

/** Draws a bevelled side-face "curtain": top edge follows the rounded
 *  perimeter at zT, bottom edge mirrors it at zB. */
function curtain(
  ctx: CanvasRenderingContext2D,
  pts: [number, number][],
  ox: number, oy: number,
  zT: number, zB: number,
  fill: string,
) {
  if (pts.length < 2) return;
  ctx.beginPath();
  for (let i = 0; i < pts.length; i++) {
    const [sx, sy] = iso(ox + pts[i][0], oy + pts[i][1], zT);
    if (i === 0) ctx.moveTo(sx, sy); else ctx.lineTo(sx, sy);
  }
  for (let i = pts.length - 1; i >= 0; i--) {
    const [sx, sy] = iso(ox + pts[i][0], oy + pts[i][1], zB);
    ctx.lineTo(sx, sy);
  }
  ctx.closePath();
  ctx.fillStyle = fill;
  ctx.fill();
}

/** Returns 0 at rest, 1 at full press, may briefly go slightly <0 on bounce */
function keyPress(progress: number, idx: number, spd: number): number {
  const p = (progress * spd) % 1;
  const start = 0.10 + idx * 0.08;
  const down = 0.035;
  const hold = 0.025;
  const up = 0.055;
  const t = p - start;
  if (t < 0) return 0;
  if (t < down) return easeInCubic(t / down);
  if (t < down + hold) return 1;
  if (t < down + hold + up) return 1 - easeOutBack((t - down - hold) / up);
  return 0;
}

// ── Animation definition ────────────────────────────────────────────────────
const animation: AnimationDefinition<KeyboardShortcutParams> = {
  id: 'keyboard-shortcut',
  name: 'Keyboard Shortcut',
  fps: 60,
  durationMs: 3000,
  width: 960,
  height: 540,
  background: '#0A0A0A',

  params: {
    defaults: {
      scale: 0.8,
      backgroundColor: '#000000',
      gridColor: '#212121',
      keyColor: '#d6d6d6',
      commandKeyColor: '#363636',
      textColor: '#333333',
      commandTextColor: '#b3b3b3',
      speed: 0.6,
      pressDepth: 0.7,
    },
    schema: {
      ...folder('Layout', {
        scale: number({ value: 1.3, min: 0.5, max: 2.5, step: 0.1, label: 'Scale' }),
      }),
      ...folder('Colors', {
        backgroundColor: color({ value: '#0A0A0A', label: 'Background' }),
        gridColor: color({ value: '#161616', label: 'Grid Lines' }),
        keyColor: color({ value: '#D8D8D8', label: 'Key Surface' }),
        commandKeyColor: color({ value: '#1E1E1E', label: 'Cmd Key' }),
        textColor: color({ value: '#505050', label: 'Key Text' }),
        commandTextColor: color({ value: '#A0A0A0', label: 'Cmd Text' }),
      }),
      ...folder('Animation', {
        speed: number({ value: 1, min: 0.5, max: 3, step: 0.1, label: 'Speed' }),
        pressDepth: number({
          value: 0.65,
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
      gridColor,
      keyColor,
      commandKeyColor,
      textColor,
      commandTextColor,
      speed,
      pressDepth,
    } = params;

    // ── Background ──────────────────────────────────────────────────────────
    ctx.fillStyle = backgroundColor;
    ctx.fillRect(0, 0, width, height);

    // Subtle radial glow behind the keyboard
    const glow = ctx.createRadialGradient(
      width / 2, height / 2 + 20, 30,
      width / 2, height / 2 + 20, 380,
    );
    glow.addColorStop(0, '#141414');
    glow.addColorStop(1, backgroundColor);
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, width, height);

    // ── Grid ────────────────────────────────────────────────────────────────
    const gs = 50;
    ctx.beginPath();
    for (let x = gs; x < width; x += gs) {
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
    }
    for (let y = gs; y < height; y += gs) {
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
    }
    ctx.strokeStyle = gridColor;
    ctx.lineWidth = 0.5;
    ctx.stroke();

    // ── Key geometry constants ──────────────────────────────────────────────
    const KW = 95;       // key width  (iso-X)
    const KD = 85;       // key depth  (iso-Y)
    const MAX_H = 46;    // rest height (iso-Z)
    const MIN_H = MAX_H * (1 - pressDepth);
    const GAP = 13;      // gap between keys
    const TR = 14;       // top-face corner radius
    const INSET = 6;     // inner ledge inset
    const SW = 1.2;      // stroke width

    // Tray
    const TPAD = 20;     // tray padding around keys
    const TH = 15;       // tray height
    const TRAY_R = 10;   // tray corner radius
    const TOTAL_W = KEYS.length * KW + (KEYS.length - 1) * GAP;

    // ── Centre the assembly on screen ───────────────────────────────────────
    const ctr = iso(TOTAL_W / 2, KD / 2, TH + MAX_H / 2);

    ctx.save();
    ctx.translate(width / 2, height / 2);
    ctx.scale(scale, scale);
    ctx.translate(-ctr[0], -ctr[1]);

    // ── Tray ────────────────────────────────────────────────────────────────
    const tW = TOTAL_W + TPAD * 2;
    const tD = KD + TPAD * 2;
    const tX = -TPAD;
    const tY = -TPAD;

    // Rubber feet (drawn first, beneath the tray)
    for (const frac of [0.16, 0.84]) {
      const [fx, fy] = iso(tX + tW * frac, tY, 0);
      ctx.beginPath();
      ctx.ellipse(fx, fy + 5, 14, 4, 0, 0, Math.PI * 2);
      ctx.fillStyle = '#050505';
      ctx.fill();
    }

    // ── Bevelled tray side faces ────────────────────────────────────
    const tBev = bevelPerim(tW, tD, TRAY_R);
    const tAll0 = [...tBev.R, ...tBev.B.slice(1)];

    // Bevelled silhouette fill (opacity base – follows curved edges)
    ctx.beginPath();
    for (let j = 0; j < tAll0.length; j++) {
      const [sx, sy] = iso(tX + tAll0[j][0], tY + tAll0[j][1], TH);
      if (j === 0) ctx.moveTo(sx, sy); else ctx.lineTo(sx, sy);
    }
    { const [sx, sy] = iso(tX + tAll0[tAll0.length - 1][0], tY + tAll0[tAll0.length - 1][1], 0); ctx.lineTo(sx, sy); }
    for (let j = tAll0.length - 2; j >= 0; j--) {
      const [sx, sy] = iso(tX + tAll0[j][0], tY + tAll0[j][1], 0);
      ctx.lineTo(sx, sy);
    }
    ctx.closePath();
    ctx.fillStyle = '#0C0C0C';
    ctx.fill();
    curtain(ctx, tBev.R, tX, tY, TH, 0, '#0C0C0C');
    curtain(ctx, tBev.B, tX, tY, TH, 0, '#111111');

    // ── Bevelled tray outline ───────────────────────────────────────
    ctx.beginPath();
    for (let j = 0; j < tAll0.length; j++) {
      const [sx, sy] = iso(tX + tAll0[j][0], tY + tAll0[j][1], TH);
      if (j === 0) ctx.moveTo(sx, sy); else ctx.lineTo(sx, sy);
    }
    { const [sx, sy] = iso(tX + tAll0[tAll0.length - 1][0], tY + tAll0[tAll0.length - 1][1], 0); ctx.lineTo(sx, sy); }
    for (let j = tAll0.length - 2; j >= 0; j--) {
      const [sx, sy] = iso(tX + tAll0[j][0], tY + tAll0[j][1], 0);
      ctx.lineTo(sx, sy);
    }
    ctx.closePath();
    ctx.strokeStyle = '#222222';
    ctx.lineWidth = 0.8;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.stroke();

    // ── Top surface ──────────────────────────────────────────────────
    ctx.save();
    const [tto0, tto1] = iso(tX, tY, TH);
    ctx.translate(tto0, tto1);
    ctx.transform(COS30, SIN30, -COS30, SIN30, 0, 0);

    ctx.beginPath();
    rrect(ctx, 0, 0, tW, tD, TRAY_R);
    ctx.fillStyle = '#1A1A1A';
    ctx.fill();
    ctx.strokeStyle = '#272727';
    ctx.lineWidth = 0.8;
    ctx.stroke();

    // Subtle recessed area where keys sit
    ctx.beginPath();
    rrect(ctx, TPAD - 6, TPAD - 6, TOTAL_W + 12, KD + 12, 6);
    ctx.fillStyle = '#151515';
    ctx.fill();

    ctx.restore();

    // ── Precompute bevelled perimeter for keys (same shape for all) ──────
    const keyBev = bevelPerim(KW, KD, TR);
    const kAll = [...keyBev.R, ...keyBev.B.slice(1)]; // full visible perimeter

    // ── Draw keys (left → right for correct overlap) ────────────────────────
    for (let i = 0; i < KEYS.length; i++) {
      const k = KEYS[i];
      const pressAmt = keyPress(progress, i, speed);
      const h = MAX_H - (MAX_H - MIN_H) * pressAmt;

      const kx = i * (KW + GAP);
      const ky = 0;
      const kz = TH;

      const dark = k.dark;
      const topClr = dark ? commandKeyColor : keyColor;
      const sideClr = dark ? '#0A0A0A' : '#9A9A9A';
      const faceClr = dark ? '#121212' : '#B5B5B5';
      const brdClr = dark ? '#2E2E2E' : '#A8A8A8';
      const tClr = dark ? commandTextColor : textColor;

      // ── Bevelled silhouette fill (opacity base – follows curved edges) ──
      ctx.beginPath();
      for (let j = 0; j < kAll.length; j++) {
        const [sx, sy] = iso(kx + kAll[j][0], ky + kAll[j][1], kz + h);
        if (j === 0) ctx.moveTo(sx, sy); else ctx.lineTo(sx, sy);
      }
      { const [sx, sy] = iso(kx + kAll[kAll.length - 1][0], ky + kAll[kAll.length - 1][1], kz); ctx.lineTo(sx, sy); }
      for (let j = kAll.length - 2; j >= 0; j--) {
        const [sx, sy] = iso(kx + kAll[j][0], ky + kAll[j][1], kz);
        ctx.lineTo(sx, sy);
      }
      ctx.closePath();
      ctx.fillStyle = sideClr;
      ctx.fill();

      // ── Bevelled side-face curtains ─────────────────────────────────────
      curtain(ctx, keyBev.R, kx, ky, kz + h, kz, sideClr);
      curtain(ctx, keyBev.B, kx, ky, kz + h, kz, faceClr);

      // ── Bevelled silhouette outline ─────────────────────────────────────
      ctx.beginPath();
      for (let j = 0; j < kAll.length; j++) {
        const [sx, sy] = iso(kx + kAll[j][0], ky + kAll[j][1], kz + h);
        if (j === 0) ctx.moveTo(sx, sy); else ctx.lineTo(sx, sy);
      }
      { const [sx, sy] = iso(kx + kAll[kAll.length - 1][0], ky + kAll[kAll.length - 1][1], kz); ctx.lineTo(sx, sy); }
      for (let j = kAll.length - 2; j >= 0; j--) {
        const [sx, sy] = iso(kx + kAll[j][0], ky + kAll[j][1], kz);
        ctx.lineTo(sx, sy);
      }
      ctx.closePath();
      ctx.strokeStyle = brdClr;
      ctx.lineWidth = SW;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.stroke();

      // ── Subtle ridge between right & back faces ─────────────────────────
      const split = keyBev.R[keyBev.R.length - 1]; // junction point
      const [rt0, rt1] = iso(kx + split[0], ky + split[1], kz + h);
      const [rb0, rb1] = iso(kx + split[0], ky + split[1], kz);
      ctx.beginPath();
      ctx.moveTo(rt0, rt1);
      ctx.lineTo(rb0, rb1);
      ctx.strokeStyle = brdClr;
      ctx.lineWidth = SW * 0.5;
      ctx.globalAlpha = 0.3;
      ctx.stroke();
      ctx.globalAlpha = 1;

      // ── Top face (rounded rect – drawn LAST) ─────────────────────────
      // NO full parallelogram fill here; letting the body colour show
      // through at the rounded corners creates natural rounded-edge effect.
      ctx.save();
      const [to0, to1] = iso(kx, ky, kz + h);
      ctx.translate(to0, to1);
      ctx.transform(COS30, SIN30, -COS30, SIN30, 0, 0);

      // Rounded key surface fill
      ctx.beginPath();
      rrect(ctx, 0, 0, KW, KD, TR);
      ctx.fillStyle = topClr;
      ctx.fill();

      // Top face rounded outline
      ctx.strokeStyle = brdClr;
      ctx.lineWidth = SW;
      ctx.lineJoin = 'round';
      ctx.stroke();

      // Inner ledge
      ctx.beginPath();
      rrect(ctx, INSET, INSET, KW - INSET * 2, KD - INSET * 2, TR - 4);
      ctx.strokeStyle = brdClr;
      ctx.lineWidth = 0.6;
      ctx.globalAlpha = 0.25;
      ctx.stroke();
      ctx.globalAlpha = 1;

      // Subtle top-surface highlight (top-left edge glow)
      if (!dark) {
        ctx.beginPath();
        ctx.moveTo(TR, 0);
        ctx.lineTo(KW - TR, 0);
        ctx.strokeStyle = 'rgba(255,255,255,0.12)';
        ctx.lineWidth = 1.2;
        ctx.stroke();
      }

      // Key label
      ctx.font = `600 ${k.fontSize}px -apple-system, BlinkMacSystemFont, "SF Pro Display", "Segoe UI", Roboto, sans-serif`;
      ctx.fillStyle = tClr;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(k.label, KW / 2, KD / 2 + 1);

      ctx.restore(); // end top-face transform
    }

    ctx.restore(); // end centring transform
  },
};

export default animation;

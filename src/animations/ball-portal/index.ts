import type { AnimationDefinition } from '../../runtime/types';
import { number, color, folder } from '../../runtime/params';

interface BallPortalParams {
  // Layout
  scale: number;
  // Colors
  ballColor: string;
  ringColor: string;
  glowColor: string;
  backgroundColor: string;
  // Animation
  speed: number;
  travelDistance: number;
  ringCount: number;
  portalTilt: number;
  stretchStrength: number;
}

// Easing helpers
const easeInOutSine = (t: number): number => -(Math.cos(Math.PI * t) - 1) / 2;

const animation: AnimationDefinition<BallPortalParams> = {
  id: 'ball-portal',
  name: 'Ball Portal',
  fps: 60,
  durationMs: 3000,
  width: 960,
  height: 540,
  background: '#000000',

  params: {
    defaults: {
      scale: 0.8,
      ballColor: '#4AEADC',
      ringColor: '#4AEADC',
      glowColor: '#4AEADC',
      backgroundColor: '#000000',
      speed: 1,
      travelDistance: 95,
      ringCount: 3,
      portalTilt: 0.28,
      stretchStrength: 2,
    },
    schema: {
      ...folder('Layout', {
        scale: number({ value: 1, min: 0.1, max: 3, step: 0.1, label: 'Scale' }),
      }),
      ...folder('Colors', {
        ballColor: color({ value: '#4AEADC', label: 'Ball Color' }),
        ringColor: color({ value: '#4AEADC', label: 'Ring Color' }),
        glowColor: color({ value: '#4AEADC', label: 'Glow Color' }),
        backgroundColor: color({ value: '#000000', label: 'Background' }),
      }),
      ...folder('Animation', {
        speed: number({ value: 1, min: 0.1, max: 3, step: 0.1, label: 'Speed' }),
        travelDistance: number({ value: 150, min: 60, max: 300, step: 5, label: 'Travel Distance' }),
        ringCount: number({ value: 5, min: 2, max: 8, step: 1, label: 'Ring Count' }),
        portalTilt: number({ value: 0.28, min: 0.1, max: 0.5, step: 0.02, label: 'Portal Tilt' }),
        stretchStrength: number({ value: 0.8, min: 0.1, max: 2, step: 0.05, label: 'Stretch Strength' }),
      }),
    },
  },

  render({ ctx, width, height, progress, params }) {
    const {
      scale,
      ballColor,
      ringColor,
      glowColor,
      backgroundColor,
      speed,
      travelDistance,
      ringCount,
      portalTilt,
      stretchStrength,
    } = params;

    const p = (progress * speed) % 1;

    // Clear background
    ctx.fillStyle = backgroundColor;
    ctx.fillRect(0, 0, width, height);

    ctx.save();
    ctx.translate(width / 2, height / 2);
    ctx.scale(scale, scale);

    // ----- Portal configuration -----
    const portalCenterY = 0; // portal at center
    const baseRadiusX = 40;
    const ringSpacing = 30;
    const ringLineWidth = 1.8;
    const ballRadius = 14;

    // ----- Ball motion: continuous pass-through -----
    // 0→0.5: ball moves from top (above portal) down through to below
    // 0.5→1: ball moves from below back up through to above
    // Use sine easing for smooth deceleration at extremes
    let ballY: number;

    if (p < 0.5) {
      // Moving downward: top → bottom
      const t = p / 0.5;
      const eased = easeInOutSine(t);
      ballY = portalCenterY - travelDistance + eased * 2 * travelDistance;
    } else {
      // Moving upward: bottom → top
      const t = (p - 0.5) / 0.5;
      const eased = easeInOutSine(t);
      ballY = portalCenterY + travelDistance - eased * 2 * travelDistance;
    }

    // ----- Determine ball phase (above or below portal) -----
    const ballPhase = ballY < portalCenterY ? 'above' : 'below';

    // ----- Calculate ring deformation -----
    // Each ring displaces vertically based on ball proximity and ring index.
    // Inner rings (small index) follow the ball more; outer rings are stiffer.
    const distFromPortal = ballY - portalCenterY; // positive = below, negative = above
    const normalizedDist = distFromPortal / travelDistance; // -1 to 1

    // Proximity: how close the ball is to the portal plane (1 = at portal, 0 = far away)
    const proximity = Math.max(0, 1 - Math.abs(normalizedDist));
    // Use a sharper falloff so the membrane effect is concentrated near the portal
    const membraneInfluence = Math.pow(proximity, 0.6);

    // Ring displacement offsets - each ring gets a different amount
    const ringOffsets: number[] = [];
    for (let i = 0; i < ringCount; i++) {
      // Inner rings (i=0) are most influenced, outer rings less
      // Exponential decay: innermost follows ball most
      const ringInfluence = Math.pow(1 - i / ringCount, 2.0);
      
      // The displacement pushes rings in the direction the ball is moving through
      // Max displacement scales with elasticity and proximity
      const maxDisplace = 40 * stretchStrength;
      const offset = distFromPortal * membraneInfluence * ringInfluence * (maxDisplace / travelDistance);
      
      ringOffsets.push(offset);
    }

    // ----- Draw portal glow -----
    const glowIntensity = membraneInfluence;
    if (glowIntensity > 0.05) {
      const glowRadiusX = baseRadiusX + (ringCount - 1) * ringSpacing + 20;
      const glowGrad = ctx.createRadialGradient(
        0, portalCenterY, 0,
        0, portalCenterY, glowRadiusX
      );
      glowGrad.addColorStop(0, hexToRGBA(glowColor, 0.3 * glowIntensity));
      glowGrad.addColorStop(0.5, hexToRGBA(glowColor, 0.1 * glowIntensity));
      glowGrad.addColorStop(1, hexToRGBA(glowColor, 0));
      ctx.save();
      ctx.scale(1, portalTilt);
      ctx.fillStyle = glowGrad;
      ctx.beginPath();
      ctx.arc(0, portalCenterY / portalTilt, glowRadiusX, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // ----- Draw ball below portal -----
    if (ballPhase === 'below') {
      drawBall(ctx, 0, ballY, ballRadius, ballColor, glowColor, 1);
    }

    // ----- Draw portal rings -----
    for (let i = 0; i < ringCount; i++) {
      const ringRadiusX = baseRadiusX + i * ringSpacing;
      const baseRingRadiusY = ringRadiusX * portalTilt;

      const offsetY = ringOffsets[i];

      // Also stretch the ring's Y-radius based on displacement
      // When displaced, the ring elongates slightly in the direction of movement
      const stretchFactor = 1 + Math.abs(offsetY) * 0.008;
      const ringRadiusY = baseRingRadiusY * stretchFactor;

      // Ring opacity: inner rings slightly brighter, boost when membrane is active
      const ringOpacity = 0.5 + 0.5 * (1 - i / ringCount);
      const activeBoost = 1 + membraneInfluence * 0.3 * (1 - i / ringCount);

      ctx.save();
      ctx.strokeStyle = hexToRGBA(ringColor, Math.min(1, ringOpacity * activeBoost));
      ctx.lineWidth = ringLineWidth;
      ctx.beginPath();
      ctx.ellipse(0, portalCenterY + offsetY, ringRadiusX, ringRadiusY, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }

    // ----- Draw ball above portal -----
    if (ballPhase === 'above') {
      drawBall(ctx, 0, ballY, ballRadius, ballColor, glowColor, 1);
    }

    ctx.restore();
  },
};

// ----- Helper: Draw the ball with glow -----
function drawBall(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  radius: number,
  ballColor: string,
  glowColor: string,
  opacity: number
) {
  ctx.save();
  ctx.globalAlpha = opacity;

  // Outer glow
  const glowGrad = ctx.createRadialGradient(x, y, radius * 0.5, x, y, radius * 2.5);
  glowGrad.addColorStop(0, hexToRGBA(glowColor, 0.3));
  glowGrad.addColorStop(1, hexToRGBA(glowColor, 0));
  ctx.fillStyle = glowGrad;
  ctx.beginPath();
  ctx.arc(x, y, radius * 2.5, 0, Math.PI * 2);
  ctx.fill();

  // Ball body
  const bodyGrad = ctx.createRadialGradient(
    x - radius * 0.3, y - radius * 0.3, radius * 0.1,
    x, y, radius
  );
  bodyGrad.addColorStop(0, lightenColor(ballColor, 60));
  bodyGrad.addColorStop(0.5, ballColor);
  bodyGrad.addColorStop(1, darkenColor(ballColor, 40));
  ctx.fillStyle = bodyGrad;
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.fill();

  // Specular highlight
  ctx.fillStyle = hexToRGBA('#FFFFFF', 0.5);
  ctx.beginPath();
  ctx.arc(x - radius * 0.25, y - radius * 0.3, radius * 0.35, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

// ----- Color helpers -----
function hexToRGBA(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

function lightenColor(hex: string, amount: number): string {
  let r = parseInt(hex.slice(1, 3), 16);
  let g = parseInt(hex.slice(3, 5), 16);
  let b = parseInt(hex.slice(5, 7), 16);
  r = Math.min(255, r + amount);
  g = Math.min(255, g + amount);
  b = Math.min(255, b + amount);
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}

function darkenColor(hex: string, amount: number): string {
  let r = parseInt(hex.slice(1, 3), 16);
  let g = parseInt(hex.slice(3, 5), 16);
  let b = parseInt(hex.slice(5, 7), 16);
  r = Math.max(0, r - amount);
  g = Math.max(0, g - amount);
  b = Math.max(0, b - amount);
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}

export default animation;

import type { AnimationDefinition } from '../../runtime/types';
import { number, color, boolean, folder } from '../../runtime/params';

interface ConfettiParams {
  // Layout
  scale: number;
  // Colors
  backgroundColor: string;
  color1: string;
  color2: string;
  color3: string;
  color4: string;
  color5: string;
  // Animation
  speed: number;
  pieceCount: number;
  gravity: number;
  spread: number;
  showShimmer: boolean;
}

// Seeded pseudo-random number generator for deterministic animations
function seededRandom(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 16807 + 0) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

// Easing functions
const easeOutCubic = (t: number): number => 1 - Math.pow(1 - t, 3);
const easeInQuad = (t: number): number => t * t;

interface ConfettiPiece {
  x: number;
  y: number;
  size: number;
  colorIndex: number;
  shape: number;       // 0=rect, 1=circle, 2=triangle
  rotation: number;
  rotSpeed: number;
  driftX: number;
  delay: number;
  wobbleFreq: number;
  wobbleAmp: number;
  fallSpeed: number;
  aspect: number;
}

const animation: AnimationDefinition<ConfettiParams> = {
  id: 'confetti',
  name: 'Confetti',
  fps: 60,
  durationMs: 4000,
  width: 960,
  height: 540,
  background: '#0F0F1A',

  params: {
    defaults: {
      scale: 2,
      backgroundColor: '#0F0F1A',
      color1: '#FF6B6B',
      color2: '#4ECDC4',
      color3: '#FFE66D',
      color4: '#A8E6CF',
      color5: '#FF8B94',
      speed: 1,
      pieceCount: 50,
      gravity: 2.6,
      spread: 0.8,
      showShimmer: false,
    },
    schema: {
      ...folder('Layout', {
        scale: number({ value: 1, min: 0.1, max: 3, step: 0.1, label: 'Scale' }),
      }),
      ...folder('Colors', {
        backgroundColor: color({ value: '#0F0F1A', label: 'Background' }),
        color1: color({ value: '#FF6B6B', label: 'Color 1 (Coral)' }),
        color2: color({ value: '#4ECDC4', label: 'Color 2 (Teal)' }),
        color3: color({ value: '#FFE66D', label: 'Color 3 (Yellow)' }),
        color4: color({ value: '#A8E6CF', label: 'Color 4 (Mint)' }),
        color5: color({ value: '#FF8B94', label: 'Color 5 (Pink)' }),
      }),
      ...folder('Animation', {
        speed: number({ value: 1, min: 0.1, max: 3, step: 0.1, label: 'Speed' }),
        pieceCount: number({ value: 120, min: 20, max: 300, step: 10, label: 'Piece Count' }),
        gravity: number({ value: 1, min: 0.3, max: 3, step: 0.1, label: 'Gravity' }),
        spread: number({ value: 1, min: 0.3, max: 2, step: 0.1, label: 'Spread' }),
        showShimmer: boolean({ value: true, label: 'Shimmer Effect' }),
      }),
    },
  },

  render({ ctx, width, height, progress, params }) {
    const {
      scale,
      backgroundColor,
      color1, color2, color3, color4, color5,
      speed,
      pieceCount,
      gravity,
      spread,
      showShimmer,
    } = params;

    const colors = [color1, color2, color3, color4, color5];
    const adjustedProgress = Math.min(progress * speed, 1);

    // Clear background
    ctx.fillStyle = backgroundColor;
    ctx.fillRect(0, 0, width, height);

    ctx.save();
    ctx.translate(width / 2, height / 2);
    ctx.scale(scale, scale);

    // Generate deterministic confetti pieces
    const rand = seededRandom(42);
    const pieces: ConfettiPiece[] = [];

    for (let i = 0; i < pieceCount; i++) {
      pieces.push({
        x: (rand() - 0.5) * 2,
        y: -rand() * 0.5 - 0.1,
        size: 0.5 + rand() * 1,
        colorIndex: Math.floor(rand() * 5),
        shape: Math.floor(rand() * 3),
        rotation: rand() * Math.PI * 2,
        rotSpeed: (rand() - 0.5) * 8,
        driftX: (rand() - 0.5) * 0.3,
        delay: rand() * 0.4,
        wobbleFreq: 2 + rand() * 4,
        wobbleAmp: 10 + rand() * 30,
        fallSpeed: 0.6 + rand() * 0.8,
        aspect: 0.4 + rand() * 0.6,
      });
    }

    const halfW = width / 2;
    const halfH = height / 2;

    // Draw each confetti piece
    for (const piece of pieces) {
      // Calculate piece-local progress with staggered delay
      const pieceProgress = Math.max(0, (adjustedProgress - piece.delay) / (1 - piece.delay));
      if (pieceProgress <= 0) continue;

      // Burst outward from center, then fall with gravity
      const burstPhase = Math.min(pieceProgress * 3, 1);
      const fallPhase = Math.max(0, (pieceProgress - 0.15) / 0.85);

      const burstEased = easeOutCubic(burstPhase);

      // Position: burst outward from center then fall down
      const burstX = piece.x * halfW * spread * burstEased * 0.8;
      const burstY = piece.y * halfH * burstEased * 0.5 - halfH * 0.3 * burstEased;

      // Gravity pulls pieces downward
      const fallY = easeInQuad(fallPhase) * halfH * 2 * gravity * piece.fallSpeed;

      // Wobble side to side like falling paper
      const wobbleX = Math.sin(pieceProgress * piece.wobbleFreq * Math.PI * 2) * piece.wobbleAmp * spread;

      // Horizontal drift
      const driftX = piece.driftX * halfW * pieceProgress;

      const x = burstX + wobbleX + driftX;
      const y = burstY + fallY;

      // Skip if off screen
      if (y > halfH + 30 || y < -halfH - 30 || x > halfW + 30 || x < -halfW - 30) continue;

      // Rotation
      const rot = piece.rotation + pieceProgress * piece.rotSpeed * Math.PI * 2;

      // Opacity: fade in quickly at start, fade out near end
      const fadeIn = Math.min(1, pieceProgress * 5);
      const fadeOut = pieceProgress > 0.8 ? 1 - (pieceProgress - 0.8) / 0.2 : 1;
      const opacity = fadeIn * fadeOut;

      if (opacity <= 0) continue;

      const baseSize = 6 * piece.size;

      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(rot);
      ctx.globalAlpha = opacity;

      // 3D tumble effect - scale X based on rotation for paper-like flipping
      const flipScale = Math.cos(pieceProgress * piece.rotSpeed * Math.PI * 3);
      ctx.scale(flipScale, 1);

      const pieceColor = colors[piece.colorIndex];
      ctx.fillStyle = pieceColor;

      if (piece.shape === 0) {
        // Rectangle
        const w = baseSize * 2;
        const h = baseSize * piece.aspect * 2;
        ctx.fillRect(-w / 2, -h / 2, w, h);

        // Shimmer highlight on one side
        if (showShimmer && flipScale > 0.3) {
          ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
          ctx.fillRect(-w / 2, -h / 2, w / 2, h);
        }
      } else if (piece.shape === 1) {
        // Circle
        ctx.beginPath();
        ctx.arc(0, 0, baseSize, 0, Math.PI * 2);
        ctx.fill();

        // Shimmer
        if (showShimmer && flipScale > 0.3) {
          ctx.fillStyle = 'rgba(255, 255, 255, 0.25)';
          ctx.beginPath();
          ctx.arc(-baseSize * 0.2, -baseSize * 0.2, baseSize * 0.5, 0, Math.PI * 2);
          ctx.fill();
        }
      } else {
        // Triangle
        ctx.beginPath();
        ctx.moveTo(0, -baseSize * 1.2);
        ctx.lineTo(baseSize, baseSize * 0.8);
        ctx.lineTo(-baseSize, baseSize * 0.8);
        ctx.closePath();
        ctx.fill();

        // Shimmer
        if (showShimmer && flipScale > 0.3) {
          ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
          ctx.beginPath();
          ctx.moveTo(0, -baseSize * 0.8);
          ctx.lineTo(baseSize * 0.5, baseSize * 0.2);
          ctx.lineTo(-baseSize * 0.3, baseSize * 0.2);
          ctx.closePath();
          ctx.fill();
        }
      }

      ctx.restore();
    }

    ctx.restore();
  },
};

export default animation;

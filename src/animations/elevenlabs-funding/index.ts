import type { AnimationDefinition } from '../../runtime/types';
import { number, color, boolean, string, select, folder } from '../../runtime/params';

/**
 * ElevenLabs $11B Series D Funding Animation
 * Features gradient background with noise texture and counter animation
 */

interface FundingParams {
  // Counter
  targetBillions: number;
  showDollarSign: boolean;
  // Text
  subtitle: string;
  mainFontSize: number;
  subtitleFontSize: number;
  textColor: string;
  fontFamily: string;
  scale: number;
  // Colors
  blueColor: string;
  orangeColor: string;
  // Effects
  noiseOpacity: number;
  shadowBlur: number;
}

// Easing functions
const easeOutCubic = (t: number): number => 1 - Math.pow(1 - t, 3);
const easeOutQuart = (t: number): number => 1 - Math.pow(1 - t, 4);
const easeInOutCubic = (t: number): number =>
  t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

// Noise texture generation (cached)
let noiseCanvas: HTMLCanvasElement | OffscreenCanvas | null = null;
let noiseCtx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D | null = null;

function generateNoise(width: number, height: number, opacity: number = 0.15): HTMLCanvasElement | OffscreenCanvas | null {
  try {
    if (!noiseCanvas || noiseCanvas.width !== width || noiseCanvas.height !== height) {
      // Try OffscreenCanvas first, fall back to regular canvas
      if (typeof OffscreenCanvas !== 'undefined') {
        noiseCanvas = new OffscreenCanvas(width, height);
        noiseCtx = noiseCanvas.getContext('2d');
      } else {
        noiseCanvas = document.createElement('canvas');
        noiseCanvas.width = width;
        noiseCanvas.height = height;
        noiseCtx = noiseCanvas.getContext('2d');
      }
      
      if (noiseCtx) {
        const imageData = noiseCtx.createImageData(width, height);
        const data = imageData.data;
        
        for (let i = 0; i < data.length; i += 4) {
          const value = Math.random() * 255;
          data[i] = value;     // R
          data[i + 1] = value; // G
          data[i + 2] = value; // B
          data[i + 3] = opacity * 255; // A
        }
        
        noiseCtx.putImageData(imageData, 0, 0);
      }
    }
    
    return noiseCanvas;
  } catch (e) {
    return null;
  }
}

// Format number with abbreviation
function formatNumber(value: number): string {
  if (value >= 1e9) {
    const billions = value / 1e9;
    // Show decimal only if less than 10B
    if (billions < 10) {
      return billions.toFixed(1) + 'B';
    }
    return Math.round(billions) + 'B';
  }
  if (value >= 1e6) {
    return (value / 1e6).toFixed(1) + 'M';
  }
  if (value >= 1e3) {
    return (value / 1e3).toFixed(1) + 'K';
  }
  return Math.round(value).toString();
}

// Helper to parse hex color to RGB
function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
      }
    : { r: 0, g: 0, b: 0 };
}

const animation: AnimationDefinition<FundingParams> = {
  id: 'elevenlabs-funding',
  name: 'ElevenLabs $11B Funding',
  fps: 60,
  durationMs: 4000,
  width: 1920,
  height: 1080,
  background: '#1a3a5c',

  params: {
    defaults: {
      targetBillions: 11,
      showDollarSign: true,
      subtitle: 'ElevenLabs Series D',
      mainFontSize: 280,
      subtitleFontSize: 48,
      textColor: '#FFFFFF',
      fontFamily: 'Helvetica',
      scale: 0.5,
      blueColor: '#1a4a7a',
      orangeColor: '#d4854a',
      noiseOpacity: 0.08,
      shadowBlur: 20,
    },
    schema: {
      ...folder('Counter', {
        targetBillions: number({ value: 11, min: 0.1, max: 100, step: 0.1, label: 'Target (Billions)' }),
        showDollarSign: boolean({ value: true, label: 'Show $ Sign' }),
      }),
      ...folder('Text', {
        subtitle: string({ value: 'ElevenLabs Series D', label: 'Subtitle' }),
        fontFamily: select({
          value: 'System',
          options: [
            'System',
            'Arial',
            'Helvetica',
            'Georgia',
            'Times New Roman',
            'Courier New',
            'Verdana',
            'Impact',
            'Comic Sans MS',
          ],
          label: 'Font Family',
        }),
        mainFontSize: number({ value: 280, min: 100, max: 500, step: 10, label: 'Main Font Size' }),
        subtitleFontSize: number({ value: 48, min: 20, max: 100, step: 2, label: 'Subtitle Font Size' }),
        textColor: color({ value: '#FFFFFF', label: 'Text Color' }),
        scale: number({ value: 1, min: 0.5, max: 2, step: 0.1, label: 'Scale' }),
      }),
      ...folder('Colors', {
        blueColor: color({ value: '#1a4a7a', label: 'Blue (Left)' }),
        orangeColor: color({ value: '#d4854a', label: 'Orange (Right)' }),
      }),
      ...folder('Effects', {
        noiseOpacity: number({ value: 0.08, min: 0, max: 0.3, step: 0.01, label: 'Noise Opacity' }),
        shadowBlur: number({ value: 20, min: 0, max: 50, step: 5, label: 'Shadow Blur' }),
      }),
    },
  },

  render({ ctx, width, height, progress, params }) {
    const {
      targetBillions,
      showDollarSign,
      subtitle,
      mainFontSize,
      subtitleFontSize,
      textColor,
      fontFamily,
      scale,
      blueColor,
      orangeColor,
      noiseOpacity,
      shadowBlur,
    } = params;

    // Build font stack based on selection
    const fontStack = fontFamily === 'System'
      ? '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif'
      : `"${fontFamily}", sans-serif`;

    // Parse colors
    const blue = hexToRgb(blueColor);
    const orange = hexToRgb(orangeColor);

    // === Background Gradient ===
    // Create a gradient from blue (left) to orange (right) with organic blending
    
    // Base gradient
    const gradient = ctx.createLinearGradient(0, 0, width, height * 0.3);
    gradient.addColorStop(0, blueColor);
    gradient.addColorStop(0.3, `rgb(${blue.r + 20}, ${blue.g + 16}, ${blue.b + 16})`);
    gradient.addColorStop(0.5, '#6b7a8a');
    gradient.addColorStop(0.7, `rgb(${orange.r - 30}, ${orange.g - 30}, ${orange.b - 20})`);
    gradient.addColorStop(1, orangeColor);
    
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);
    
    // Add radial overlay for organic color blending (mimics the image)
    // Orange blob on right side
    const orangeBlob = ctx.createRadialGradient(
      width * 0.7, height * 0.6, 0,
      width * 0.7, height * 0.6, width * 0.5
    );
    orangeBlob.addColorStop(0, `rgba(${orange.r + 10}, ${orange.g - 10}, ${orange.b - 10}, 0.9)`);
    orangeBlob.addColorStop(0.3, `rgba(${orange.r - 10}, ${orange.g - 30}, ${orange.b - 20}, 0.7)`);
    orangeBlob.addColorStop(0.6, `rgba(${orange.r - 30}, ${orange.g - 40}, ${orange.b - 10}, 0.4)`);
    orangeBlob.addColorStop(1, `rgba(${orange.r - 30}, ${orange.g - 40}, ${orange.b - 10}, 0)`);
    
    ctx.fillStyle = orangeBlob;
    ctx.fillRect(0, 0, width, height);
    
    // Blue overlay on left side
    const blueBlob = ctx.createRadialGradient(
      width * 0.15, height * 0.3, 0,
      width * 0.15, height * 0.3, width * 0.6
    );
    blueBlob.addColorStop(0, `rgba(${blue.r + 10}, ${blue.g + 30}, ${blue.b + 50}, 0.8)`);
    blueBlob.addColorStop(0.4, `rgba(${blue.r + 20}, ${blue.g + 40}, ${blue.b + 60}, 0.5)`);
    blueBlob.addColorStop(0.7, `rgba(${blue.r + 30}, ${blue.g + 50}, ${blue.b + 70}, 0.2)`);
    blueBlob.addColorStop(1, `rgba(${blue.r + 30}, ${blue.g + 50}, ${blue.b + 70}, 0)`);
    
    ctx.fillStyle = blueBlob;
    ctx.fillRect(0, 0, width, height);
    
    // Secondary orange glow (bottom right)
    const orangeGlow2 = ctx.createRadialGradient(
      width * 0.85, height * 0.8, 0,
      width * 0.85, height * 0.8, width * 0.4
    );
    orangeGlow2.addColorStop(0, `rgba(${orange.r + 20}, ${orange.g + 20}, ${orange.b + 20}, 0.6)`);
    orangeGlow2.addColorStop(0.5, `rgba(${orange.r}, ${orange.g}, ${orange.b}, 0.3)`);
    orangeGlow2.addColorStop(1, `rgba(${orange.r - 10}, ${orange.g - 10}, ${orange.b}, 0)`);
    
    ctx.fillStyle = orangeGlow2;
    ctx.fillRect(0, 0, width, height);
    
    // === Noise Texture Overlay ===
    if (noiseOpacity > 0) {
      const noise = generateNoise(width, height, noiseOpacity);
      if (noise) {
        ctx.drawImage(noise, 0, 0);
      }
    }
    
    // === Counter Animation ===
    const targetValue = targetBillions * 1e9;
    
    // Animation timing
    const counterStartProgress = 0.1;  // Start counting at 10%
    const counterEndProgress = 0.75;   // Finish counting at 75%
    
    let displayValue = 0;
    let counterProgress = 0;
    
    if (progress >= counterStartProgress) {
      if (progress >= counterEndProgress) {
        counterProgress = 1;
        displayValue = targetValue;
      } else {
        counterProgress = (progress - counterStartProgress) / (counterEndProgress - counterStartProgress);
        counterProgress = easeOutQuart(counterProgress);
        displayValue = targetValue * counterProgress;
      }
    }
    
    // Fade in for the dollar sign and text
    const fadeInProgress = Math.min(1, progress / 0.2);
    const fadeInAlpha = easeOutCubic(fadeInProgress);
    
    // Parse text color
    const textRgb = hexToRgb(textColor);
    
    // === Draw Text ===
    ctx.save();
    ctx.translate(width / 2, height / 2);
    
    // Apply scale
    ctx.scale(scale, scale);
    
    // Main counter text "$11B"
    const prefix = showDollarSign ? '$' : '';
    const counterText = prefix + formatNumber(displayValue);
    
    // Text styling
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    
    // Main text - large bold font
    ctx.font = `bold ${mainFontSize}px ${fontStack}`;
    
    // Slight shadow for depth
    ctx.shadowColor = 'rgba(0, 0, 0, 0.3)';
    ctx.shadowBlur = shadowBlur;
    ctx.shadowOffsetX = 5;
    ctx.shadowOffsetY = 5;
    
    // Main text color
    ctx.fillStyle = `rgba(${textRgb.r}, ${textRgb.g}, ${textRgb.b}, ${fadeInAlpha})`;
    ctx.fillText(counterText, 0, -30);
    
    // Reset shadow
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;
    
    // Subtitle
    ctx.font = `500 ${subtitleFontSize}px ${fontStack}`;
    
    // Subtitle appears slightly after main text
    const subtitleDelay = 0.3;
    const subtitleFadeProgress = Math.max(0, Math.min(1, (progress - subtitleDelay) / 0.2));
    const subtitleAlpha = easeOutCubic(subtitleFadeProgress);
    
    // Subtitle position (below the main number)
    ctx.fillStyle = `rgba(${textRgb.r}, ${textRgb.g}, ${textRgb.b}, ${subtitleAlpha * 0.95})`;
    ctx.fillText(subtitle, 50, 130);
    
    ctx.restore();
  },
};

export default animation;

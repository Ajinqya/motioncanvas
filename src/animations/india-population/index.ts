import type { AnimationDefinition } from '../../runtime/types';
import { number, color, boolean, select, folder } from '../../runtime/params';

/**
 * India Population Growth Animation (2000-2025)
 * Shows India's population growth over 25 years with animated counter and visual elements
 */

interface IndiaPopulationParams {
  // Layout
  scale: number;
  // Colors
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  backgroundColor: string;
  textColor: string;
  // Animation
  speed: number;
  showBars: boolean;
  barStyle: string;
  // Text
  showSubtitle: boolean;
  fontFamily: string;
}

// India population data (in millions) - approximate values
const populationData: { year: number; population: number }[] = [
  { year: 2000, population: 1053 },
  { year: 2001, population: 1071 },
  { year: 2002, population: 1089 },
  { year: 2003, population: 1107 },
  { year: 2004, population: 1126 },
  { year: 2005, population: 1144 },
  { year: 2006, population: 1162 },
  { year: 2007, population: 1180 },
  { year: 2008, population: 1198 },
  { year: 2009, population: 1217 },
  { year: 2010, population: 1234 },
  { year: 2011, population: 1250 },
  { year: 2012, population: 1266 },
  { year: 2013, population: 1282 },
  { year: 2014, population: 1298 },
  { year: 2015, population: 1314 },
  { year: 2016, population: 1329 },
  { year: 2017, population: 1345 },
  { year: 2018, population: 1361 },
  { year: 2019, population: 1377 },
  { year: 2020, population: 1393 },
  { year: 2021, population: 1408 },
  { year: 2022, population: 1422 },
  { year: 2023, population: 1436 },
  { year: 2024, population: 1450 },
  { year: 2025, population: 1463 },
];

// Easing functions
const easeOutCubic = (t: number): number => 1 - Math.pow(1 - t, 3);
const easeInOutQuad = (t: number): number =>
  t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;

// Helper to interpolate population at any point
function getPopulationAtProgress(progress: number): { year: number; population: number } {
  const totalYears = populationData.length - 1;
  const yearIndex = progress * totalYears;
  const lowerIndex = Math.floor(yearIndex);
  const upperIndex = Math.min(lowerIndex + 1, totalYears);
  const fraction = yearIndex - lowerIndex;

  const lowerData = populationData[lowerIndex];
  const upperData = populationData[upperIndex];

  return {
    year: Math.round(lowerData.year + fraction * (upperData.year - lowerData.year)),
    population: lowerData.population + fraction * (upperData.population - lowerData.population),
  };
}

// Format population number
function formatPopulation(millions: number): string {
  const billions = millions / 1000;
  return billions.toFixed(2) + ' Billion';
}

// Parse hex to RGB
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

const animation: AnimationDefinition<IndiaPopulationParams> = {
  id: 'india-population',
  name: 'India Population Growth',
  fps: 60,
  durationMs: 8000,
  width: 1920,
  height: 1080,
  background: '#0A1628',

  params: {
    defaults: {
      scale: 0.6,
      primaryColor: '#ffffff',
      secondaryColor: '#ffffff',
      accentColor: '#4787cd',
      backgroundColor: '#04070c',
      textColor: '#FFFFFF',
      speed: 1,
      showBars: true,
      barStyle: 'gradient',
      showSubtitle: true,
      fontFamily: 'Georgia',
    },
    schema: {
      ...folder('Layout', {
        scale: number({ value: 1, min: 0.5, max: 2, step: 0.1, label: 'Scale' }),
      }),
      ...folder('Colors', {
        primaryColor: color({ value: '#FF9933', label: 'Primary (Saffron)' }),
        secondaryColor: color({ value: '#FFFFFF', label: 'Secondary (White)' }),
        accentColor: color({ value: '#138808', label: 'Accent (Green)' }),
        backgroundColor: color({ value: '#0A1628', label: 'Background' }),
        textColor: color({ value: '#FFFFFF', label: 'Text Color' }),
      }),
      ...folder('Animation', {
        speed: number({ value: 1, min: 0.5, max: 2, step: 0.1, label: 'Speed' }),
        showBars: boolean({ value: true, label: 'Show Population Bars' }),
        barStyle: select({
          value: 'gradient',
          options: ['gradient', 'solid', 'tricolor'],
          label: 'Bar Style',
        }),
      }),
      ...folder('Text', {
        showSubtitle: boolean({ value: true, label: 'Show Subtitle' }),
        fontFamily: select({
          value: 'System',
          options: ['System', 'Arial', 'Helvetica', 'Georgia', 'Verdana'],
          label: 'Font Family',
        }),
      }),
    },
  },

  render({ ctx, width, height, progress, params }) {
    const {
      scale,
      primaryColor,
      secondaryColor,
      accentColor,
      backgroundColor,
      textColor,
      speed,
      showBars,
      barStyle,
      showSubtitle,
      fontFamily,
    } = params;

    // Apply speed modifier
    const adjustedProgress = Math.min(1, progress * speed);
    const easedProgress = easeInOutQuad(adjustedProgress);

    // Get current population data
    const currentData = getPopulationAtProgress(easedProgress);

    // Build font stack
    const fontStack =
      fontFamily === 'System'
        ? '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif'
        : `"${fontFamily}", sans-serif`;

    // === Background ===
    ctx.fillStyle = backgroundColor;
    ctx.fillRect(0, 0, width, height);

    // Add subtle gradient overlay
    const bgGradient = ctx.createRadialGradient(
      width * 0.5,
      height * 0.3,
      0,
      width * 0.5,
      height * 0.3,
      width * 0.8
    );
    const primaryRgb = hexToRgb(primaryColor);
    bgGradient.addColorStop(0, `rgba(${primaryRgb.r}, ${primaryRgb.g}, ${primaryRgb.b}, 0.1)`);
    bgGradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = bgGradient;
    ctx.fillRect(0, 0, width, height);

    // === Main Content ===
    ctx.save();
    ctx.translate(width / 2, height / 2);
    ctx.scale(scale, scale);

    // Fade in animation
    const fadeIn = Math.min(1, adjustedProgress * 5);
    const alpha = easeOutCubic(fadeIn);

    // === Year Display ===
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = `bold 120px ${fontStack}`;
    ctx.fillStyle = `rgba(${hexToRgb(textColor).r}, ${hexToRgb(textColor).g}, ${hexToRgb(textColor).b}, ${alpha})`;
    ctx.fillText(currentData.year.toString(), 0, -280);

    // === "INDIA" Label ===
    ctx.font = `300 36px ${fontStack}`;
    ctx.letterSpacing = '12px';
    ctx.fillStyle = `rgba(${hexToRgb(primaryColor).r}, ${hexToRgb(primaryColor).g}, ${hexToRgb(primaryColor).b}, ${alpha * 0.9})`;
    ctx.fillText('I N D I A', 0, -380);

    // === Population Counter ===
    ctx.font = `bold 180px ${fontStack}`;
    
    // Create gradient for population number
    const textGradient = ctx.createLinearGradient(-300, 0, 300, 0);
    const accentRgb = hexToRgb(accentColor);
    textGradient.addColorStop(0, primaryColor);
    textGradient.addColorStop(0.5, secondaryColor);
    textGradient.addColorStop(1, accentColor);
    
    ctx.fillStyle = textGradient;
    ctx.globalAlpha = alpha;
    ctx.fillText(formatPopulation(currentData.population), 0, -100);
    ctx.globalAlpha = 1;

    // === "Population" Label ===
    if (showSubtitle) {
      ctx.font = `400 32px ${fontStack}`;
      ctx.fillStyle = `rgba(${hexToRgb(textColor).r}, ${hexToRgb(textColor).g}, ${hexToRgb(textColor).b}, ${alpha * 0.7})`;
      ctx.fillText('Population', 0, 20);
    }

    // === Population Growth Bars ===
    if (showBars) {
      const barAreaY = 120;
      const barWidth = 28;
      const barGap = 8;
      const maxBarHeight = 200;
      const totalBars = 26; // One for each year
      const totalWidth = totalBars * (barWidth + barGap) - barGap;
      const startX = -totalWidth / 2;

      // Calculate how many bars to show based on progress
      const visibleBars = Math.ceil(easedProgress * totalBars);

      for (let i = 0; i < visibleBars; i++) {
        const barProgress = i / (totalBars - 1);
        const populationRatio =
          (populationData[i].population - populationData[0].population) /
          (populationData[totalBars - 1].population - populationData[0].population);
        
        // Bar height based on population growth (with minimum height)
        const barHeight = 40 + populationRatio * (maxBarHeight - 40);
        
        // Animate the last bar growing
        const isLastBar = i === visibleBars - 1;
        const barGrowth = isLastBar ? (easedProgress * totalBars) % 1 : 1;
        const animatedHeight = barHeight * (isLastBar ? easeOutCubic(barGrowth) : 1);

        const x = startX + i * (barWidth + barGap);
        const y = barAreaY + maxBarHeight - animatedHeight;

        // Bar color based on style
        if (barStyle === 'tricolor') {
          // India flag tricolor gradient
          const triGradient = ctx.createLinearGradient(x, y, x, y + animatedHeight);
          triGradient.addColorStop(0, primaryColor); // Saffron
          triGradient.addColorStop(0.5, secondaryColor); // White
          triGradient.addColorStop(1, accentColor); // Green
          ctx.fillStyle = triGradient;
        } else if (barStyle === 'gradient') {
          // Progress-based gradient
          const grad = ctx.createLinearGradient(x, y, x, y + animatedHeight);
          grad.addColorStop(0, primaryColor);
          grad.addColorStop(1, `rgba(${accentRgb.r}, ${accentRgb.g}, ${accentRgb.b}, 0.8)`);
          ctx.fillStyle = grad;
        } else {
          // Solid color
          ctx.fillStyle = i === visibleBars - 1 ? primaryColor : accentColor;
        }

        // Draw rounded bar
        ctx.globalAlpha = alpha * (0.5 + 0.5 * barProgress);
        ctx.beginPath();
        const radius = 4;
        ctx.roundRect(x, y, barWidth, animatedHeight, [radius, radius, 0, 0]);
        ctx.fill();
        ctx.globalAlpha = 1;
      }

      // Year labels under bars
      ctx.font = `500 14px ${fontStack}`;
      ctx.fillStyle = `rgba(${hexToRgb(textColor).r}, ${hexToRgb(textColor).g}, ${hexToRgb(textColor).b}, ${alpha * 0.5})`;
      
      // Show start year
      ctx.textAlign = 'center';
      ctx.fillText('2000', startX + barWidth / 2, barAreaY + maxBarHeight + 25);
      
      // Show end year
      ctx.fillText('2025', startX + (totalBars - 1) * (barWidth + barGap) + barWidth / 2, barAreaY + maxBarHeight + 25);
    }

    // === Growth Indicator ===
    const growthPercent = ((currentData.population - populationData[0].population) / populationData[0].population) * 100;
    ctx.font = `600 28px ${fontStack}`;
    ctx.textAlign = 'center';
    
    // Growth percentage with arrow
    const arrowUp = '↑';
    ctx.fillStyle = `rgba(${hexToRgb(accentColor).r}, ${hexToRgb(accentColor).g}, ${hexToRgb(accentColor).b}, ${alpha})`;
    ctx.fillText(`${arrowUp} ${growthPercent.toFixed(1)}% growth since 2000`, 0, showBars ? 380 : 100);

    ctx.restore();

    // === Decorative Elements ===
    // Top accent line
    const lineWidth = width * 0.3 * easedProgress;
    ctx.fillStyle = primaryColor;
    ctx.globalAlpha = alpha * 0.8;
    ctx.fillRect(width / 2 - lineWidth / 2, 40, lineWidth, 4);

    // Bottom accent line
    ctx.fillStyle = accentColor;
    ctx.fillRect(width / 2 - lineWidth / 2, height - 44, lineWidth, 4);
    ctx.globalAlpha = 1;
  },
};

export default animation;

import type { AnimationDefinition } from '../../runtime/types';
import { number, color, boolean, folder } from '../../runtime/params';

/* ------------------------------------------------------------------ */
/*  Easing helpers                                                     */
/* ------------------------------------------------------------------ */
const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);
const easeOutQuart = (t: number) => 1 - Math.pow(1 - t, 4);
const easeOutBack = (t: number) => {
  const c1 = 1.70158;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
};
const clamp = (v: number, lo = 0, hi = 1) => Math.min(hi, Math.max(lo, v));

/* ------------------------------------------------------------------ */
/*  Dot-matrix world map data                                          */
/*  Extracted from high-fidelity SVG: 126 cols × 71 rows               */
/*  Each string is a row; '1' = land, '0' = water                      */
/* ------------------------------------------------------------------ */
const MAP_COLS = 126;
const MAP_ROWS_COUNT = 71;
const MAP_DATA: string[] = [
  '000000000000000000000000000000000000000011111000000000000000000000000000000000000000000000000000000000000000000000000000000000',
  '000000000000000000000000000000000000001111111100001101000000000000000000000000001000000000000000000000000000000000000000000000',
  '000000000000000000000000000000001010011000110010101111100000000000000000010000000110000000000000101000000000000000000000000000',
  '000000000000000000000000000011010010010111101111111111000000000000000000100000000000100000000001100000000000000000000000000000',
  '000000000000000000000000000100000001001110001111111111110000000000000010100000000000010100000000010000000000000000000000000000',
  '000000000000000000000000000001010100000100111111111111100000000011000000000000000000011110000000000010000000011111010000000000',
  '000000000000011000000000001001110101011000111111111111100000001100000000000000000000111110000000000111011001111111110000000000',
  '000000000011111100000000011100000001110001111111111111000000000110000000000010000001110100010110001111111111111111010000000000',
  '000000000011111111000000101100101010010000001111111111000000000100000000000100000001111101111111011111111111111111100000000000',
  '000000001001111111100110001111010101000000001111111110000000000000000000001000000101111111111111111111111111111111000000000000',
  '000000001111111111111111011110001010110000001111111111000000000000000000001000100011111111111111111111111111111111100000000000',
  '000000100011111111111111101101001011110000001111111100000000000000000000001000011101111111111111111111111111111111110000000000',
  '000000001111111111111011101100100001011000001111111100000000000000000000001000110110111111111111111111111111111111000000000000',
  '000000011111111111111100111111111010001100011111111010000000000000000000000100010011111111111111111111111111111011000000000000',
  '000000111111111111111111111111111110101000000111111100000000000000110000010001101101111111111111111111111111100100000000000000',
  '000000011111011111111101101110110000011100001111110000000000000001111100101111110111111111111111111111111111100100000000000000',
  '000000001000001111111110011101101101111010011111100000000000000011111110011111111111111111111111111111111100000110000000000000',
  '000000110000000111111101111111000100011000001110000010100000000111011000111111111111111111111111111111111000000110000000000000',
  '000011000000000111111111111010000001001000001100000001000000000110011101111111111111111111111111111111111000000111010000000000',
  '111100000000000111111111101110000001100000001100000000000000001110100101111111111111111111111111111111111000000010000000000000',
  '000000000000000011111111111010000011101000000000000000000000011100111011111111111111111111111111111111111000000010000000000000',
  '000000000000000011111111111111000011111000000000000000000000010110011110111111111111111111111011111111111111000010000000000000',
  '000000000000000011111111110101110011111000000000000000000100000100111111111111111111111111111110111111111110100000000000000000',
  '000000000000000001111111110111110111111100000000000000000010001000111111111111111111111111111100111111111111100010000000000000',
  '000000000000000001111111110100110111111110000000000000001010001111111111111111111111111111111011111111111110100000000000000000',
  '000000000000000001111111111111111111100000000000000000000011011111111111111111111111111111111111111111111110000100000000000000',
  '000000000000000011111111111100111110100110000000000000000000111111111111111111111111111111111111111111111110011000000000000000',
  '000000000000000011111111111110101111101000000000000000000011111111111101011100111111101111111111111111111000010000000000000000',
  '000000000000000011111111111110100110010000000000000000000001111101111001111001110111111111111111111111111000010000000000000000',
  '000000000000000111111111111111011100000000000000000000000111010100111000001100111111111111111111111111001000010000000000000000',
  '000000000000000011111111111111111100000000000000000000001111001010101011101110111111111111111111111110000100010000000000000000',
  '000000000000000011111111111111111000000000000000000000001110000001010111111100011111111111111111111111100100100000000000000000',
  '000000000000000001111111111111110000000000000000000000000100011010000000111111111111111111111111111111000001000000000000000000',
  '000000000000000001111111111111100000000000000000000000000111111000000001111111111111111111111111111111100010000000000000000000',
  '000000000000000001011111111111000000000000000000000000001111111110010000111111111111111111111111111111110000000000000000000000',
  '000000000000000001111111100001000000000000000000000000001111111111111111111110111111111111111111111111100000000000000000000000',
  '000000000000000000101111000000100000000000000000000000011111111111111111011110000111111111111111111111100000000000000000000000',
  '010000000000000000010111000000001000000000000000000000111111111111111111001111010000111111111111111111010000000000000000000000',
  '001000000000000000000111000101110000000000000000000001111111111111111111101111111000011111100011110000000000000000000000000000',
  '000000000000000000000111001000000101000000000000000001111111111111111111100111110000001111000011110010000000000000000000000000',
  '000000000000000000000001111000000000000000000000000000111111111111111111110011100000000110000000111000001000000000000000000000',
  '000000000000000000000000001110000000000000000000000001111111111111111111110100000000000110000000011100001000000000000000000000',
  '000000000000000000000000000010001000000000000000000000111111111111111111111000100000000010000000101100000100000000000000000000',
  '000000000000000000000000000001111111100000000000000000011111111111111111111111000000000001000000100000000110000000000000000000',
  '000000000000000000000000000000011111110000000000000000001110011111111111111110000000000000000000010000010000000000000000000000',
  '000000000000000000000000000000011111111110000000000000000000000111111111111100000000000000000001010000100000000000000000000000',
  '000000000000000000000000010000111111111110000000000000000000000111111110111000000000000000000000110011100101000000000000000000',
  '000000000000000000000000000000111111111111100000000000000000000111111110110000000000000000000000011011101000111000000000000000',
  '000000000000000000000000000000111111111111111100000000000000000011111101110000000000000000000000001000001000011110010000000000',
  '000000000000000000000000000000111111111111111110000000000000000011111101110000000000000000000000000111000000000111000110000000',
  '000000000000000000000000000000011111111111111100000000000000000011111111110000000000000000000000000000011100000000100001000000',
  '000000000000000000000000000000011111111111111000000000000000000001111111010000000000000000000000000000000000110010000000000000',
  '000000000000000000000000000000001111111111111000000000000000000011111111110001000000000000000000000000000010110010000000000000',
  '000000000000000000000000000000000111111111111000000000000000000011111111100011000000000000000000000000000111111010000000010001',
  '000000000000000000000000000000000011111111111000000000000000000011111111000010000000000000000000000000001111111111000000000000',
  '000000000000000000000000000000000011111111100000000000000000000001111111000110000000000000000000000000111111111111000000100000',
  '000000000000000000000000000000000011111111000000000000000000000001111110000000000000000000000000000001111111111111100000000000',
  '000000000000000000000000000000000011111111000000000000000000000001111110000000000000000000000000000001111111111111110000000000',
  '000000000000000000000000000000000011111110000000000000000000000000111100000000000000000000000000000001111111111111110000000000',
  '000000000000000000000000000000000011111110000000000000000000000000111000000000000000000000000000000001111111111111100000000000',
  '000000000000000000000000000000000011111000000000000000000000000000000000000000000000000000000000000001110000111111100000000000',
  '000000000000000000000000000000000111111000000000000000000000000000000000000000000000000000000000000000000000011111000000000000',
  '000000000000000000000000000000000011110000000000000000000000000000000000000000000000000000000000000000000000001111000000000000',
  '000000000000000000000000000000000011100000000000000000000000000000000000000000000000000000000000000000000000001110000000001000',
  '000000000000000000000000000000000011100000000000000000000000000000000000000000000000000000000000000000000000000000000000001000',
  '000000000000000000000000000000000011000000000000000000000000000000000000000000000000000000000000000000000000000100000000001000',
  '000000000000000000000000000000000011100000000000000000000000000000000000000000000000000000000000000000000000000100000000010000',
  '000000000000000000000000000000000011000000000000000000000000000000000000000000000000000000000000000000000000000000000000100000',
  '000000000000000000000000000000000011000100000000000000000000000000000000000000000000000000000000000000000000000000000011000000',
  '000000000000000000000000000000000001100000000000000000000000000000000000000000000000000000000000000000000000000000000010000000',
  '000000000000000000000000000000000000110000000000000000000000000000000000000000000000000000000000000000000000000000000000000000',
];

/* ------------------------------------------------------------------ */
/*  City database (name, lat, lon)                                     */
/* ------------------------------------------------------------------ */
interface City {
  name: string;
  lat: number;
  lon: number;
}

const CITIES: City[] = [
  // North America
  { name: 'New York', lat: 40.71, lon: -74.01 },
  { name: 'Los Angeles', lat: 34.05, lon: -118.24 },
  { name: 'Chicago', lat: 41.88, lon: -87.63 },
  { name: 'Toronto', lat: 43.65, lon: -79.38 },
  { name: 'Mexico City', lat: 19.43, lon: -99.13 },
  { name: 'San Francisco', lat: 37.77, lon: -122.42 },
  // South America
  { name: 'São Paulo', lat: -23.55, lon: -46.63 },
  { name: 'Buenos Aires', lat: -34.60, lon: -58.38 },
  { name: 'Bogotá', lat: 4.71, lon: -74.07 },
  { name: 'Lima', lat: -12.05, lon: -77.04 },
  // Europe
  { name: 'London', lat: 51.51, lon: -0.13 },
  { name: 'Paris', lat: 48.86, lon: 2.35 },
  { name: 'Berlin', lat: 52.52, lon: 13.41 },
  { name: 'Rome', lat: 41.90, lon: 12.50 },
  { name: 'Madrid', lat: 40.42, lon: -3.70 },
  { name: 'Moscow', lat: 55.76, lon: 37.62 },
  { name: 'Istanbul', lat: 41.01, lon: 28.98 },
  // Africa
  { name: 'Cairo', lat: 30.04, lon: 31.24 },
  { name: 'Lagos', lat: 6.52, lon: 3.38 },
  { name: 'Nairobi', lat: -1.29, lon: 36.82 },
  { name: 'Cape Town', lat: -33.93, lon: 18.42 },
  { name: 'Johannesburg', lat: -26.20, lon: 28.04 },
  // Middle East
  { name: 'Dubai', lat: 25.20, lon: 55.27 },
  // Asia
  { name: 'Mumbai', lat: 19.08, lon: 72.88 },
  { name: 'Delhi', lat: 28.61, lon: 77.21 },
  { name: 'Bangkok', lat: 13.76, lon: 100.50 },
  { name: 'Singapore', lat: 1.35, lon: 103.82 },
  { name: 'Beijing', lat: 39.90, lon: 116.40 },
  { name: 'Shanghai', lat: 31.23, lon: 121.47 },
  { name: 'Tokyo', lat: 35.68, lon: 139.69 },
  { name: 'Seoul', lat: 37.57, lon: 126.98 },
  { name: 'Hong Kong', lat: 22.32, lon: 114.17 },
  { name: 'Jakarta', lat: -6.21, lon: 106.85 },
  // Oceania
  { name: 'Sydney', lat: -33.87, lon: 151.21 },
  { name: 'Melbourne', lat: -37.81, lon: 144.96 },
];

/* ------------------------------------------------------------------ */
/*  Helpers: lat/lon → pixel                                           */
/* ------------------------------------------------------------------ */
function latLonToPixel(
  lat: number,
  lon: number,
  mapX: number,
  mapY: number,
  mapW: number,
  mapH: number,
): { x: number; y: number } {
  const x = mapX + ((lon + 180) / 360) * mapW;
  const y = mapY + ((90 - lat) / 180) * mapH;
  return { x, y };
}

/* ------------------------------------------------------------------ */
/*  Params interface                                                   */
/* ------------------------------------------------------------------ */
interface WorldMapParams {
  scale: number;
  dotSize: number;
  landColor: string;
  oceanColor: string;
  backgroundColor: string;
  cityGlowColor: string;
  labelColor: string;
  cityDotSize: number;
  glowIntensity: number;
  speed: number;
  showConnections: boolean;
  showLabels: boolean;
  connectionColor: string;
}

/* ------------------------------------------------------------------ */
/*  Animation definition                                               */
/* ------------------------------------------------------------------ */
const animation: AnimationDefinition<WorldMapParams> = {
  id: 'world-map-cities',
  name: 'World Map — City Highlights',
  fps: 60,
  durationMs: 12000,
  width: 1920,
  height: 1080,
  background: '#0A0E1A',

  params: {
    defaults: {
      scale: 1,
      dotSize: 5,
      landColor: '#1E3A5F',
      oceanColor: '#0A0E1A',
      backgroundColor: '#0A0E1A',
      cityGlowColor: '#00D4FF',
      labelColor: '#FFFFFF',
      cityDotSize: 3.5,
      glowIntensity: 1,
      speed: 1,
      showConnections: false,
      connectionColor: '#00D4FF',
      showLabels: false,
    },
    schema: {
      ...folder('Layout', {
        scale: number({ value: 1, min: 0.5, max: 2, step: 0.05, label: 'Scale' }),
        dotSize: number({ value: 2.2, min: 0.5, max: 5, step: 0.1, label: 'Map Dot Size' }),
      }),
      ...folder('Colors', {
        landColor: color({ value: '#1E3A5F', label: 'Land Color' }),
        oceanColor: color({ value: '#0A0E1A', label: 'Ocean Color' }),
        backgroundColor: color({ value: '#0A0E1A', label: 'Background' }),
        cityGlowColor: color({ value: '#00D4FF', label: 'City Glow Color' }),
        labelColor: color({ value: '#FFFFFF', label: 'Label Color' }),
        connectionColor: color({ value: '#00D4FF', label: 'Connection Color' }),
      }),
      ...folder('Cities', {
        cityDotSize: number({ value: 4, min: 1, max: 10, step: 0.5, label: 'City Dot Size' }),
        glowIntensity: number({ value: 1, min: 0, max: 3, step: 0.1, label: 'Glow Intensity' }),
        showConnections: boolean({ value: true, label: 'Show Connections' }),
        showLabels: boolean({ value: true, label: 'Show Labels' }),
      }),
      ...folder('Animation', {
        speed: number({ value: 1, min: 0.3, max: 3, step: 0.1, label: 'Speed' }),
      }),
    },
  },

  render({ ctx, width, height, progress, params, time }) {
    const {
      scale,
      dotSize,
      landColor,
      backgroundColor,
      cityGlowColor,
      labelColor,
      cityDotSize,
      glowIntensity,
      speed,
      showConnections,
      showLabels,
      connectionColor,
    } = params;

    const t = (progress * speed) % 1;

    // ---- Background ----
    ctx.fillStyle = backgroundColor;
    ctx.fillRect(0, 0, width, height);

    // ---- Map dimensions (centered, with padding) ----
    const pad = 80 * scale;
    const mapW = (width - pad * 2) * scale;
    const mapH = (height - pad * 2) * scale;
    const mapX = (width - mapW) / 2;
    const mapY = (height - mapH) / 2;

    // ---- Subtle grid / ambient glow behind the map ----
    const grad = ctx.createRadialGradient(
      width / 2, height / 2, 0,
      width / 2, height / 2, width * 0.6,
    );
    grad.addColorStop(0, 'rgba(0, 60, 120, 0.08)');
    grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, width, height);

    // ---- Render dot-matrix map ----
    const cols = MAP_COLS;
    const rows = MAP_ROWS_COUNT;
    const cellW = mapW / cols;
    const cellH = mapH / rows;
    const dotR = dotSize * scale * 0.5;

    // Map fade-in: first 10% of the animation
    const mapFade = clamp(t / 0.10, 0, 1);
    const mapAlpha = easeOutCubic(mapFade);

    ctx.save();
    ctx.globalAlpha = mapAlpha;

    for (let r = 0; r < rows; r++) {
      const row = MAP_DATA[r];
      if (!row) continue;
      for (let c = 0; c < cols; c++) {
        const isLand = row[c] === '1';
        const cx = mapX + (c + 0.5) * cellW;
        const cy = mapY + (r + 0.5) * cellH;

        if (isLand) {
          // Subtle shimmer for land dots
          const shimmer = 0.7 + 0.3 * Math.sin(time * 0.001 + c * 0.3 + r * 0.2);
          ctx.globalAlpha = mapAlpha * shimmer;
          ctx.fillStyle = landColor;
          ctx.beginPath();
          ctx.arc(cx, cy, dotR, 0, Math.PI * 2);
          ctx.fill();
        } else {
          // Ocean dots — very faint
          ctx.globalAlpha = mapAlpha * 0.06;
          ctx.fillStyle = landColor;
          ctx.beginPath();
          ctx.arc(cx, cy, dotR * 0.5, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }
    ctx.restore();

    // ---- City coordinates in pixels ----
    const cityPixels = CITIES.map((city) => ({
      ...city,
      ...latLonToPixel(city.lat, city.lon, mapX, mapY, mapW, mapH),
    }));

    // ---- Stagger timing ----
    // Cities start appearing at t=0.08, each one takes 0.025 of progress to enter
    const cityStartT = 0.08;
    const staggerGap = 0.025;
    const cityRevealDur = 0.06; // each city's individual animation duration
    const totalCities = CITIES.length;

    // ---- Draw connections first (behind city dots) ----
    if (showConnections) {
      ctx.save();
      for (let i = 1; i < totalCities; i++) {
        const cityT = clamp((t - (cityStartT + i * staggerGap)) / cityRevealDur, 0, 1);
        if (cityT <= 0) continue;
        const prevIdx = i - 1;
        const prevT = clamp((t - (cityStartT + prevIdx * staggerGap)) / cityRevealDur, 0, 1);
        if (prevT <= 0) continue;

        const a = cityPixels[prevIdx];
        const b = cityPixels[i];

        // Only draw connection when both cities are partially visible
        const connectionAlpha = Math.min(easeOutCubic(cityT), easeOutCubic(prevT)) * 0.12;
        if (connectionAlpha <= 0) continue;

        // Animated line drawing effect
        const lineProgress = easeOutCubic(cityT);
        const endX = a.x + (b.x - a.x) * lineProgress;
        const endY = a.y + (b.y - a.y) * lineProgress;

        ctx.strokeStyle = connectionColor;
        ctx.globalAlpha = connectionAlpha;
        ctx.lineWidth = 0.8 * scale;
        ctx.beginPath();
        ctx.moveTo(a.x, a.y);

        // Curved connection
        const midX = (a.x + endX) / 2;
        const midY = (a.y + endY) / 2 - Math.abs(b.x - a.x) * 0.15;
        ctx.quadraticCurveTo(midX, midY, endX, endY);
        ctx.stroke();
      }
      ctx.restore();
    }

    // ---- Draw cities ----
    for (let i = 0; i < totalCities; i++) {
      const cityEnterT = cityStartT + i * staggerGap;
      const cityT = clamp((t - cityEnterT) / cityRevealDur, 0, 1);
      if (cityT <= 0) continue;

      const eased = easeOutCubic(cityT);
      const city = cityPixels[i];

      ctx.save();

      // ---- Outer glow rings ----
      const numRings = 3;
      for (let ring = numRings; ring >= 1; ring--) {
        const ringDelay = ring * 0.1;
        const ringT = clamp((cityT - ringDelay) / (1 - ringDelay), 0, 1);
        if (ringT <= 0) continue;

        const ringRadius = cityDotSize * scale * (1.5 + ring * 1.8) * easeOutQuart(ringT);
        const ringAlpha = (1 - ringT) * 0.25 * glowIntensity;

        ctx.globalAlpha = ringAlpha;
        ctx.strokeStyle = cityGlowColor;
        ctx.lineWidth = 1.2 * scale;
        ctx.beginPath();
        ctx.arc(city.x, city.y, ringRadius, 0, Math.PI * 2);
        ctx.stroke();
      }

      // ---- Glow halo ----
      const glowRadius = cityDotSize * scale * 6 * glowIntensity;
      const glowGrad = ctx.createRadialGradient(
        city.x, city.y, 0,
        city.x, city.y, glowRadius,
      );
      glowGrad.addColorStop(0, hexToRGBA(cityGlowColor, 0.35 * eased * glowIntensity));
      glowGrad.addColorStop(0.4, hexToRGBA(cityGlowColor, 0.1 * eased * glowIntensity));
      glowGrad.addColorStop(1, hexToRGBA(cityGlowColor, 0));
      ctx.globalAlpha = 1;
      ctx.fillStyle = glowGrad;
      ctx.beginPath();
      ctx.arc(city.x, city.y, glowRadius, 0, Math.PI * 2);
      ctx.fill();

      // ---- City dot ----
      const dotScale = easeOutBack(clamp(cityT / 0.6, 0, 1));
      const pulseSin = Math.sin(time * 0.004 + i * 1.3);
      const pulse = 1 + pulseSin * 0.15;
      const r = cityDotSize * scale * dotScale * pulse;

      ctx.globalAlpha = eased;
      ctx.fillStyle = cityGlowColor;
      ctx.shadowColor = cityGlowColor;
      ctx.shadowBlur = 12 * glowIntensity * scale;
      ctx.beginPath();
      ctx.arc(city.x, city.y, r, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;

      // Inner bright core
      ctx.fillStyle = '#FFFFFF';
      ctx.globalAlpha = eased * 0.9;
      ctx.beginPath();
      ctx.arc(city.x, city.y, r * 0.35, 0, Math.PI * 2);
      ctx.fill();

      // ---- Label ----
      const labelDelay = 0.35; // label starts partway through city anim
      const labelT = clamp((cityT - labelDelay) / (1 - labelDelay), 0, 1);
      if (showLabels && labelT > 0) {
        const labelEased = easeOutCubic(labelT);
        const labelY = city.y - cityDotSize * scale * 2.5 - 4 * scale;
        const labelOffsetY = (1 - labelEased) * 8 * scale; // slide up

        ctx.globalAlpha = labelEased;
        ctx.font = `${Math.round(11 * scale)}px "Inter", "SF Pro Display", -apple-system, sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'bottom';

        // Label background pill
        const metrics = ctx.measureText(city.name);
        const pillW = metrics.width + 12 * scale;
        const pillH = 18 * scale;
        const pillX = city.x - pillW / 2;
        const pillY = labelY - pillH + labelOffsetY;

        ctx.fillStyle = 'rgba(10, 14, 26, 0.75)';
        roundRect(ctx, pillX, pillY, pillW, pillH, 4 * scale);
        ctx.fill();

        // Label border
        ctx.strokeStyle = hexToRGBA(cityGlowColor, 0.3 * labelEased);
        ctx.lineWidth = 0.5 * scale;
        roundRect(ctx, pillX, pillY, pillW, pillH, 4 * scale);
        ctx.stroke();

        // Label text
        ctx.fillStyle = labelColor;
        ctx.globalAlpha = labelEased;
        ctx.fillText(city.name, city.x, labelY - 2 * scale + labelOffsetY);

        // Small line from dot to label
        ctx.strokeStyle = hexToRGBA(cityGlowColor, 0.4 * labelEased);
        ctx.lineWidth = 0.6 * scale;
        ctx.beginPath();
        ctx.moveTo(city.x, city.y - r);
        ctx.lineTo(city.x, pillY + pillH);
        ctx.stroke();
      }

      ctx.restore();
    }

    // ---- Title text (bottom-right) ----
    const titleT = clamp((t - 0.04) / 0.08, 0, 1);
    if (titleT > 0) {
      ctx.save();
      const titleEased = easeOutCubic(titleT);
      ctx.globalAlpha = titleEased * 0.5;
      ctx.font = `300 ${Math.round(13 * scale)}px "Inter", "SF Pro Display", -apple-system, sans-serif`;
      ctx.textAlign = 'right';
      ctx.textBaseline = 'bottom';
      ctx.fillStyle = labelColor;
      ctx.fillText(
        `${totalCities} cities worldwide`,
        width - 40 * scale,
        height - 30 * scale,
      );
      ctx.restore();
    }

    // ---- Vignette overlay ----
    const vigGrad = ctx.createRadialGradient(
      width / 2, height / 2, width * 0.25,
      width / 2, height / 2, width * 0.75,
    );
    vigGrad.addColorStop(0, 'rgba(0,0,0,0)');
    vigGrad.addColorStop(1, 'rgba(0,0,0,0.35)');
    ctx.fillStyle = vigGrad;
    ctx.fillRect(0, 0, width, height);
  },
};

/* ------------------------------------------------------------------ */
/*  Utility: hex color to rgba string                                  */
/* ------------------------------------------------------------------ */
function hexToRGBA(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

/* ------------------------------------------------------------------ */
/*  Utility: rounded rectangle path                                    */
/* ------------------------------------------------------------------ */
function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

export default animation;

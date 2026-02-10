import type { AnimationDefinition } from '../../runtime/types';
import { number, color, folder } from '../../runtime/params';

/**
 * Meeting Notes Scene 1 – Granola Motion Design
 *
 * Scene 1: "Now your meeting notes can power what you're building in other apps"
 *
 * Features:
 * - Word reveal animations with staggered timing
 * - Pop-in text animations
 * - Smooth easing transitions
 * - Instrument Serif typography
 */

interface MeetingNotesParams {
  // Layout
  scale: number;
  // Colors
  textColor: string;
  backgroundColor: string;
  // Animation
  speed: number;
  fontSize: number;
  // Timing
  initialDelayMs: number;
  sceneGapMs: number;
  hold1: number; // Now your meeting notes
  hold2: number; // Can power
  hold3: number; // What
  hold4: number; // You're building
  hold5: number; // In other apps
  entryMultiplier: number;
  exitMultiplier: number;
  wordStaggerMs: number;
  wordEntryDurationMs: number;
  popInEntryMs: number;
}

// ── Font Loading ────────────────────────────────────────────────
let fontAttempted = false;

function loadFonts(): void {
  if (fontAttempted) return;
  fontAttempted = true;

  const font = new FontFace(
    'Instrument Serif',
    'url(https://fonts.gstatic.com/s/instrumentserif/v5/jizBRFtNs2ka5fXjeivQ4LroWlx-6zUTjnTLgNs.woff2)',
    { weight: '400', style: 'normal' }
  );

  font
    .load()
    .then((loaded) => {
      document.fonts.add(loaded);
    })
    .catch(() => {
      // Continue even if font fails
    });
}

// ── Easings ─────────────────────────────────────────────────────
const easeOutQuart = (t: number) => 1 - Math.pow(1 - t, 4);
const easeInCubic = (t: number) => t * t * t;
const easeInQuart = (t: number) => t * t * t * t;

// ── Scene Definitions (base values, scaled by params) ─────────────
interface Scene {
  type: 'wordReveal' | 'popIn';
  words?: string[];
  text?: string;
  holdKey: keyof Pick<MeetingNotesParams, 'hold1' | 'hold2' | 'hold3' | 'hold4' | 'hold5'>;
  exitScale: number;
  exitMs: number;
  fastEnd?: boolean;
}

const baseScenes: Scene[] = [
  {
    type: 'wordReveal',
    words: ['Now', 'your', 'meeting', 'notes'],
    holdKey: 'hold1',
    exitScale: 0.8,
    exitMs: 280,
    fastEnd: true,
  },
  {
    type: 'popIn',
    text: 'can power',
    holdKey: 'hold2',
    exitScale: 0.9,
    exitMs: 250,
  },
  {
    type: 'popIn',
    text: 'what',
    holdKey: 'hold3',
    exitScale: 0.9,
    exitMs: 250,
  },
  {
    type: 'wordReveal',
    words: ["you're", 'building'],
    holdKey: 'hold4',
    exitScale: 0.9,
    exitMs: 250,
  },
  {
    type: 'wordReveal',
    words: ['in', 'other', 'apps'],
    holdKey: 'hold5',
    exitScale: 0.7,
    exitMs: 300,
    fastEnd: true,
  },
];

type TimelineSegment = Scene & {
  phase: 'entry' | 'hold' | 'exit';
  start: number;
  end: number;
  entryMs: number;
};

// Build timeline from params
function buildTimeline(params: MeetingNotesParams): { timeline: TimelineSegment[]; totalMs: number } {
  const {
    initialDelayMs,
    sceneGapMs,
    entryMultiplier,
    exitMultiplier,
    wordStaggerMs,
    wordEntryDurationMs,
    popInEntryMs,
  } = params;

  const timeline: TimelineSegment[] = [];
  let t = initialDelayMs;

  for (const s of baseScenes) {
    const holdMs = Math.max(100, params[s.holdKey]);
    const exitMs = Math.max(80, s.exitMs * exitMultiplier);

    const entryMs =
      s.type === 'wordReveal' && s.words
        ? (s.words.length - 1) * wordStaggerMs + wordEntryDurationMs
        : popInEntryMs * entryMultiplier;

    timeline.push({ ...s, phase: 'entry', start: t, end: t + entryMs, entryMs });
    t += entryMs;
    timeline.push({ ...s, phase: 'hold', start: t, end: t + holdMs, entryMs });
    t += holdMs;
    timeline.push({ ...s, phase: 'exit', start: t, end: t + exitMs, entryMs });
    t += exitMs;
    t += sceneGapMs;
  }

  return { timeline, totalMs: t };
}

const DEFAULT_PARAMS: MeetingNotesParams = {
  scale: 1,
  textColor: 'rgb(44, 44, 44)',
  backgroundColor: '#FFFFFF',
  speed: 1,
  fontSize: 52,
  initialDelayMs: 300,
  sceneGapMs: 50,
  hold1: 1000,
  hold2: 800,
  hold3: 800,
  hold4: 900,
  hold5: 600,
  entryMultiplier: 1,
  exitMultiplier: 1,
  wordStaggerMs: 140,
  wordEntryDurationMs: 220,
  popInEntryMs: 160,
};

const DEFAULT_DURATION_MS = buildTimeline(DEFAULT_PARAMS).totalMs;
// Use 2x to accommodate timing param multipliers without cutting off
const DURATION_MS = Math.ceil(DEFAULT_DURATION_MS * 2);

// ── Drawing Functions ───────────────────────────────────────────
function drawCenteredText(
  ctx: CanvasRenderingContext2D,
  text: string,
  width: number,
  height: number,
  fontSize: number,
  textColor: string,
  scale: number = 1,
  alpha: number = 1
) {
  const fs = Math.max(10, fontSize * scale);
  ctx.save();
  ctx.font = `${fs}px 'Instrument Serif', Georgia, serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const match = textColor.match(/\d+/g);
  const [r, g, b] = match ? match.map(Number) : [44, 44, 44];
  ctx.fillStyle = `rgba(${r},${g},${b},${alpha})`;
  ctx.fillText(text, width / 2, height / 2);
  ctx.restore();
}

function drawWordsStaggered(
  ctx: CanvasRenderingContext2D,
  words: string[],
  offsets: Array<{ alpha: number; yOff: number }>,
  width: number,
  height: number,
  fontSize: number,
  textColor: string,
  scale: number = 1,
  alpha: number = 1
) {
  const fs = Math.max(10, fontSize * scale);
  ctx.save();
  ctx.font = `${fs}px 'Instrument Serif', Georgia, serif`;
  ctx.textBaseline = 'middle';
  const gap = 14 * scale;

  const widths = words.map((w) => ctx.measureText(w).width);
  const totalW = widths.reduce((a, b) => a + b, 0) + gap * (words.length - 1);
  let x = (width - totalW) / 2;

  const match = textColor.match(/\d+/g);
  const [r, g, b] = match ? match.map(Number) : [44, 44, 44];

  for (let i = 0; i < words.length; i++) {
    const o = offsets[i] || { alpha: 0, yOff: 22 };
    if (o.alpha > 0) {
      ctx.fillStyle = `rgba(${r},${g},${b},${Math.min(1, o.alpha * alpha)})`;
      ctx.fillText(words[i], x, height / 2 + o.yOff * scale);
    }
    x += widths[i] + gap;
  }
  ctx.restore();
}

// ── Animation Definition ────────────────────────────────────────
const animation: AnimationDefinition<MeetingNotesParams> = {
  id: 'meeting-notes-scene1',
  name: 'Meeting Notes Scene 1',
  fps: 60,
  durationMs: DURATION_MS,
  width: 1280,
  height: 720,
  background: '#FFFFFF',

  params: {
    defaults: {
      scale: 1,
      textColor: 'rgb(44, 44, 44)',
      backgroundColor: '#FFFFFF',
      speed: 1,
      fontSize: 52,
      initialDelayMs: 350,
      sceneGapMs: 50,
      hold1: 500,
      hold2: 250,
      hold3: 100,
      hold4: 400,
      hold5: 600,
      entryMultiplier: 1,
      exitMultiplier: 1,
      wordStaggerMs: 140,
      wordEntryDurationMs: 220,
      popInEntryMs: 160,
    },
    schema: {
      ...folder('Layout', {
        scale: number({ value: 1, min: 0.1, max: 3, step: 0.1, label: 'Scale' }),
        fontSize: number({ value: 52, min: 20, max: 100, step: 1, label: 'Font Size' }),
      }),
      ...folder('Colors', {
        textColor: color({ value: 'rgb(44, 44, 44)', label: 'Text Color' }),
        backgroundColor: color({ value: '#FFFFFF', label: 'Background' }),
      }),
      ...folder('Animation', {
        speed: number({ value: 1, min: 0.1, max: 3, step: 0.1, label: 'Speed' }),
      }),
      ...folder('Timing', {
        initialDelayMs: number({
          value: 300,
          min: 0,
          max: 2000,
          step: 50,
          label: 'Initial Delay (ms)',
        }),
        sceneGapMs: number({
          value: 50,
          min: 0,
          max: 500,
          step: 10,
          label: 'Gap Between Scenes (ms)',
        }),
        hold1: number({
          value: 1000,
          min: 200,
          max: 3000,
          step: 50,
          label: 'Hold: Now your meeting notes (ms)',
        }),
        hold2: number({
          value: 800,
          min: 200,
          max: 3000,
          step: 50,
          label: 'Hold: Can power (ms)',
        }),
        hold3: number({
          value: 800,
          min: 200,
          max: 3000,
          step: 50,
          label: 'Hold: What (ms)',
        }),
        hold4: number({
          value: 900,
          min: 200,
          max: 3000,
          step: 50,
          label: 'Hold: You\'re building (ms)',
        }),
        hold5: number({
          value: 600,
          min: 200,
          max: 3000,
          step: 50,
          label: 'Hold: In other apps (ms)',
        }),
        entryMultiplier: number({
          value: 1,
          min: 0.3,
          max: 2.5,
          step: 0.1,
          label: 'Entry Duration Multiplier',
        }),
        exitMultiplier: number({
          value: 1,
          min: 0.3,
          max: 2.5,
          step: 0.1,
          label: 'Exit Duration Multiplier',
        }),
        wordStaggerMs: number({
          value: 140,
          min: 50,
          max: 400,
          step: 10,
          label: 'Word Stagger (ms)',
        }),
        wordEntryDurationMs: number({
          value: 220,
          min: 100,
          max: 500,
          step: 10,
          label: 'Word Entry Duration (ms)',
        }),
        popInEntryMs: number({
          value: 160,
          min: 50,
          max: 500,
          step: 10,
          label: 'Pop-in Entry (ms)',
        }),
      }),
    },
  },

  setup() {
    loadFonts();
  },

  render({ ctx, width, height, params, time }) {
    const { scale, textColor, backgroundColor, speed, fontSize } = params;

    const { timeline, totalMs } = buildTimeline(params);

    // Apply speed to time
    const adjustedTime = (time * speed * 1000) % totalMs;

    // Clear background
    ctx.fillStyle = backgroundColor;
    ctx.fillRect(0, 0, width, height);

    // Find current segment
    let seg: TimelineSegment | null = null;
    for (const s of timeline) {
      if (adjustedTime >= s.start && adjustedTime < s.end) {
        seg = s;
        break;
      }
    }

    if (!seg) return;

    const segmentProgress = Math.min(
      1,
      (adjustedTime - seg.start) / Math.max(1, seg.end - seg.start)
    );

    // Center and scale content
    ctx.save();
    ctx.translate(width / 2, height / 2);
    ctx.scale(scale, scale);
    ctx.translate(-width / 2, -height / 2);

    const { wordStaggerMs, wordEntryDurationMs } = params;

    if (seg.phase === 'entry') {
      if (seg.type === 'wordReveal' && seg.words) {
        const offsets = seg.words.map((_, wi) => {
          const wordStartTime = seg.start + wi * wordStaggerMs;
          const elapsed = adjustedTime - wordStartTime;
          if (elapsed < 0) return { alpha: 0, yOff: 22 };
          const wt = Math.min(1, elapsed / wordEntryDurationMs);
          const e = easeOutQuart(wt);
          return { alpha: e, yOff: 22 * (1 - e) };
        });
        drawWordsStaggered(ctx, seg.words, offsets, width, height, fontSize, textColor);
      } else if (seg.text) {
        const t = easeOutQuart(segmentProgress);
        drawCenteredText(
          ctx,
          seg.text,
          width,
          height,
          fontSize,
          textColor,
          0.88 + 0.12 * t,
          0.6 + 0.4 * t
        );
      }
    } else if (seg.phase === 'hold') {
      if (seg.type === 'wordReveal' && seg.words) {
        drawWordsStaggered(
          ctx,
          seg.words,
          seg.words.map(() => ({ alpha: 1, yOff: 0 })),
          width,
          height,
          fontSize,
          textColor
        );
      } else if (seg.text) {
        drawCenteredText(ctx, seg.text, width, height, fontSize, textColor);
      }
    } else if (seg.phase === 'exit') {
      const ep = seg.fastEnd ? easeInQuart(segmentProgress) : segmentProgress;
      const sc = 1.0 - (1.0 - seg.exitScale) * ep;
      const alpha = seg.fastEnd ? 1 - easeInCubic(segmentProgress) * 0.5 : 1;

      if (seg.type === 'wordReveal' && seg.words) {
        drawWordsStaggered(
          ctx,
          seg.words,
          seg.words.map(() => ({ alpha: 1, yOff: 0 })),
          width,
          height,
          fontSize,
          textColor,
          sc,
          alpha
        );
      } else if (seg.text) {
        drawCenteredText(ctx, seg.text, width, height, fontSize, textColor, sc, alpha);
      }
    }

    ctx.restore();
  },
};

export default animation;

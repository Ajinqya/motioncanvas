/**
 * Sequence Composer - Stitches individual animations into a timeline
 * 
 * A Sequence is a series of SceneEntries, each referencing an existing animation.
 * The SequencePlayer renders them back-to-back on a shared canvas, handling
 * transitions between scenes.
 */

import type { AnyAnimationDefinition, AnimationDefinition, RenderContext, AudioData } from './types';
import { isSimpleAnimation } from './types';
import { evaluateTransformKeyframes, type SceneKeyframeTracks } from './keyframes';
export type { SceneKeyframeTracks } from './keyframes';
export {
  TRANSFORM_TRACK_KEYS,
  TRANSFORM_TRACK_LABELS,
  hasAnyKeyframes,
  getTrackKeyframeCount,
  setKeyframe,
  removeKeyframe,
  clearTrack,
  clearAllKeyframes,
  getTransformValue,
  evaluateTrack,
  evaluateTransformKeyframes,
  type TransformTrackKey,
  type KeyframeTrack,
  type Keyframe,
  type EasingType,
} from './keyframes';

// ─── Types ────────────────────────────────────────────────────────────────────

export type TransitionType = 'cut' | 'fade' | 'wipe-left' | 'wipe-right' | 'wipe-up' | 'dissolve';

export interface SceneTransition {
  type: TransitionType;
  /** Transition duration in ms — overlaps with the next scene */
  durationMs: number;
}

/** Per-scene transform: scale, position, opacity */
export interface SceneTransform {
  /** Scale factor (1 = 100%, 0.5 = 50%, 2 = 200%) */
  scale: number;
  /** Horizontal offset in pixels (relative to sequence canvas center) */
  offsetX: number;
  /** Vertical offset in pixels (relative to sequence canvas center) */
  offsetY: number;
  /** Opacity 0–1 */
  opacity: number;
}

export const DEFAULT_TRANSFORM: SceneTransform = {
  scale: 1,
  offsetX: 0,
  offsetY: 0,
  opacity: 1,
};

/** Configuration for custom code scenes (scenes not from the gallery) */
export interface CustomCodeConfig {
  name?: string;
  width?: number;
  height?: number;
  durationMs?: number;
  fps?: number;
  background?: string;
}

export interface SceneEntry {
  /** Unique id for this scene instance (for reordering / keying) */
  sceneId: string;
  /** References an animation by its registry id */
  animationId: string;
  /** Duration for this scene in ms (overrides animation's own duration) */
  durationMs: number;
  /** Optional param overrides for this scene */
  params?: Record<string, unknown>;
  /** Per-scene transform (scale, position, opacity) */
  transform?: SceneTransform;
  /** When true, the animation's own background is not drawn (transparent) */
  transparentBg?: boolean;
  /** Transition to the *next* scene */
  transition?: SceneTransition;
  /** Human-readable label for the timeline */
  label?: string;
  /** Lane: 0 or undefined = primary storyline, positive = above, negative = below */
  lane?: number;
  /** For connected clips (lane !== 0): sceneId of the primary clip this is anchored to */
  connectedTo?: string;
  /** For connected clips: time offset from the anchor clip's start (ms, can be negative) */
  connectedOffsetMs?: number;
  /**
   * Explicit audio binding: clipId of an AudioClipEntry to use as the audio
   * source for this scene. When set, the sequence player will analyse that
   * audio clip and pass AudioData to the animation's render context.
   *
   * When not set and the animation is `audioReactive`, the player will
   * auto-detect the first overlapping audio clip on the timeline.
   *
   * Set to `'none'` to explicitly disable audio for this scene even if
   * overlapping clips exist.
   */
  audioClipId?: string;
  /** When true, the animation plays in reverse (progress goes from 1→0 instead of 0→1) */
  reversed?: boolean;
  /**
   * Inline canvas code for custom scenes that don't exist in the gallery.
   * Should be a render function body or a full `function render(ctx, { width, height, progress }) { ... }`.
   * When set, the sequence player compiles this into a SimpleAnimationDefinition at runtime.
   */
  customCode?: string;
  /** Configuration for the custom code scene (dimensions, duration, background, etc.) */
  customCodeConfig?: CustomCodeConfig;
  /** Keyframe tracks for animating transform properties over the scene duration */
  keyframes?: SceneKeyframeTracks;
}

export interface AudioClipEntry {
  /** Unique id for this audio clip instance */
  clipId: string;
  /** Blob URL or data URL of the audio file */
  audioUrl: string;
  /** Original filename for display */
  audioFilename: string;
  /** Full duration of the audio file in ms */
  fullDurationMs: number;
  /** Trim start point in ms (relative to audio file start) */
  trimStartMs: number;
  /** Trim end point in ms (relative to audio file start) */
  trimEndMs: number;
  /** Playback volume 0-1 */
  volume: number;
  /** Position on the timeline in ms (absolute) */
  startMs: number;
  /** Lane: 0 = primary row, positive = above, negative = below */
  lane: number;
  /** Human-readable label */
  label?: string;
}

export interface Sequence {
  id: string;
  name: string;
  /** Output FPS */
  fps: number;
  /** Output canvas size */
  width: number;
  height: number;
  /** Ordered list of scenes */
  scenes: SceneEntry[];
  /** Background color for the sequence canvas */
  background?: string;
  /** Audio clips on the timeline */
  audioClips: AudioClipEntry[];
}

// ─── Constants ────────────────────────────────────────────────────────────────

/** Common param names that animations use for their background fill.
 *  When transparentBg is on we override these to 'transparent'. */
const BG_PARAM_KEYS = [
  'backgroundColor',
  'background',
  'bgColor',
  'bg',
  'canvasColor',
  'canvasBg',
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Primary storyline = lane 0 or undefined. Connected clips have lane !== 0 and connectedTo set. */

/** Calculate start/end time (ms) for each scene. Primary clips are sequential (magnetic); connected clips use anchor + offset. */
export function getSceneTimings(scenes: SceneEntry[]): { startMs: number; endMs: number }[] {
  const primaryScenes = scenes.filter((s) => (s.lane ?? 0) === 0);
  let cursor = 0;
  const primaryMap = new Map<string, { startMs: number; endMs: number }>();

  for (let i = 0; i < primaryScenes.length; i++) {
    const scene = primaryScenes[i];
    const start = cursor;
    const end = start + scene.durationMs;
    primaryMap.set(scene.sceneId, { startMs: start, endMs: end });
    const overlap = scene.transition?.durationMs ?? 0;
    cursor = end - overlap;
  }

  return scenes.map((scene) => {
    const lane = scene.lane ?? 0;
    if (lane === 0) {
      const t = primaryMap.get(scene.sceneId);
      return t ?? { startMs: 0, endMs: scene.durationMs };
    }
    const anchor = scene.connectedTo && primaryMap.get(scene.connectedTo);
    const offset = scene.connectedOffsetMs ?? 0;
    const startMs = anchor ? anchor.startMs + offset : 0;
    return { startMs, endMs: startMs + scene.durationMs };
  });
}

/** Total duration of the sequence in ms (max of all scene end times and audio clip end times) */
export function getSequenceDurationMs(scenes: SceneEntry[], audioClips: AudioClipEntry[] = []): number {
  const timings = getSceneTimings(scenes);
  const maxScene = timings.length > 0 ? Math.max(...timings.map((t) => t.endMs)) : 0;
  const maxAudio = audioClips.length > 0
    ? Math.max(...audioClips.map((c) => c.startMs + (c.trimEndMs - c.trimStartMs)))
    : 0;
  return Math.max(maxScene, maxAudio);
}

/** Generate a unique scene id */
let _sceneCounter = 0;
export function generateSceneId(): string {
  return `scene-${Date.now()}-${_sceneCounter++}`;
}

/** Generate a unique audio clip id */
let _audioClipCounter = 0;
export function generateAudioClipId(): string {
  return `audio-${Date.now()}-${_audioClipCounter++}`;
}

/** Create an empty sequence */
export function createEmptySequence(name = 'Untitled Sequence'): Sequence {
  return {
    id: `seq-${Date.now()}`,
    name,
    fps: 60,
    width: 1920,
    height: 1080,
    scenes: [],
    audioClips: [],
    background: '#000000',
  };
}

// ─── Sequence Player ──────────────────────────────────────────────────────────

export interface SequencePlayerOptions {
  canvas: HTMLCanvasElement;
  sequence: Sequence;
  /** Resolved animation definitions keyed by animationId */
  animations: Map<string, AnyAnimationDefinition>;
  onFrame?: (timeMs: number, progress: number) => void;
  /** Skip audio element management (e.g. for offline export) */
  disableAudio?: boolean;
}

export interface SequencePlayerControls {
  play: () => void;
  pause: () => void;
  toggle: () => void;
  seek: (timeMs: number) => void;
  restart: () => void;
  destroy: () => void;
  isPlaying: () => boolean;
  getTimeMs: () => number;
  getProgress: () => number;
  /** Update the sequence (e.g. after scene reorder) */
  setSequence: (seq: Sequence, anims: Map<string, AnyAnimationDefinition>) => void;
  /** Enable/disable ping-pong playback (forward then reverse, 0→end→0) */
  setPingPong: (enabled: boolean) => void;
  isPingPong: () => boolean;
}

export function createSequencePlayer(options: SequencePlayerOptions): SequencePlayerControls {
  const { canvas, onFrame, disableAudio } = options;
  let sequence = options.sequence;
  let animations = options.animations;

  const ctx = canvas.getContext('2d')!;
  if (!ctx) throw new Error('Could not get 2d context');

  // Off-screen canvases for compositing transitions
  let offA: OffscreenCanvas | null = null;
  let offB: OffscreenCanvas | null = null;

  let playing = false;
  let startTime = 0;
  let pausedAt = 0;
  let currentTimeMs = 0;
  let lastFrameTime = 0;
  let rafId: number | null = null;

  // Ping-pong playback mode: plays forward then reverses (0→end→0)
  let pingPong = false;

  // ── Audio clip management ───────────────────────────────────────────────
  const audioElements = new Map<string, HTMLAudioElement>();
  const manageAudio = !disableAudio;

  // ── Audio analysis for audio-reactive animations ──────────────────────
  // A shared AudioContext connects each HTMLAudioElement to an AnalyserNode
  // so we can extract real-time AudioData and pass it to audio-reactive scenes.
  let sharedAudioCtx: AudioContext | null = null;
  const audioSourceNodes = new Map<string, MediaElementAudioSourceNode>();
  const audioAnalysers = new Map<string, AnalyserNode>();
  // Analysis buffers (reusable per analyser)
  const audioFreqBuffers = new Map<string, Uint8Array>();
  const audioWaveBuffers = new Map<string, Uint8Array>();
  // Beat detection state per clip
  const beatState = new Map<string, { lastBeatTime: number; previousBass: number }>();
  const FFT_SIZE = 256;
  const BEAT_THRESHOLD = 0.6;
  const BEAT_COOLDOWN = 150; // ms

  function ensureAudioContext() {
    if (!sharedAudioCtx) {
      sharedAudioCtx = new AudioContext();
    }
    return sharedAudioCtx;
  }

  /** Connect an existing HTMLAudioElement to an AnalyserNode for real-time analysis */
  function connectAnalyser(clipId: string, el: HTMLAudioElement) {
    if (audioAnalysers.has(clipId)) return; // already connected
    const actx = ensureAudioContext();
    const analyser = actx.createAnalyser();
    analyser.fftSize = FFT_SIZE;
    analyser.smoothingTimeConstant = 0.8;

    // Create source node — note: a MediaElementAudioSourceNode can only be
    // created once per HTMLAudioElement, so we guard against double-creation.
    let src = audioSourceNodes.get(clipId);
    if (!src) {
      src = actx.createMediaElementSource(el);
      audioSourceNodes.set(clipId, src);
    }

    src.connect(analyser);
    analyser.connect(actx.destination);
    audioAnalysers.set(clipId, analyser);

    const bufLen = analyser.frequencyBinCount;
    audioFreqBuffers.set(clipId, new Uint8Array(bufLen));
    audioWaveBuffers.set(clipId, new Uint8Array(bufLen));
    beatState.set(clipId, { lastBeatTime: 0, previousBass: 0 });
  }

  /** Disconnect and clean up analyser resources for a clip */
  function disconnectAnalyser(clipId: string) {
    const src = audioSourceNodes.get(clipId);
    if (src) {
      try { src.disconnect(); } catch { /* already disconnected */ }
      audioSourceNodes.delete(clipId);
    }
    const an = audioAnalysers.get(clipId);
    if (an) {
      try { an.disconnect(); } catch { /* already disconnected */ }
      audioAnalysers.delete(clipId);
    }
    audioFreqBuffers.delete(clipId);
    audioWaveBuffers.delete(clipId);
    beatState.delete(clipId);
  }

  /** Helper: calculate RMS energy for a byte range */
  function calcBandEnergy(data: Uint8Array, start: number, end: number): number {
    let sum = 0;
    const len = Math.min(end, data.length) - start;
    if (len <= 0) return 0;
    for (let i = start; i < Math.min(end, data.length); i++) sum += data[i];
    return sum / (len * 255);
  }

  function calcRMS(data: Uint8Array, start: number, end: number): number {
    let sum = 0;
    const len = Math.min(end, data.length) - start;
    if (len <= 0) return 0;
    for (let i = start; i < Math.min(end, data.length); i++) {
      const n = (data[i] - 128) / 128;
      sum += n * n;
    }
    return Math.sqrt(sum / len);
  }

  /** Get AudioData from a specific audio clip's analyser. Returns undefined if not available. */
  function getClipAudioData(clipId: string): AudioData | undefined {
    const analyser = audioAnalysers.get(clipId);
    if (!analyser) return undefined;

    const freq = audioFreqBuffers.get(clipId)!;
    const wave = audioWaveBuffers.get(clipId)!;
    // Create new arrays with proper ArrayBuffer type
    const freqArray = new Uint8Array(freq.length);
    const waveArray = new Uint8Array(wave.length);
    analyser.getByteFrequencyData(freqArray);
    analyser.getByteTimeDomainData(waveArray);
    // Copy back to the original buffers for consistency
    freq.set(freqArray);
    wave.set(waveArray);

    const binCount = analyser.frequencyBinCount;
    const bassEnd = Math.floor(binCount * 0.05);
    const midEnd = Math.floor(binCount * 0.3);

    const bass = calcBandEnergy(freq, 0, bassEnd);
    const mid = calcBandEnergy(freq, bassEnd, midEnd);
    const high = calcBandEnergy(freq, midEnd, binCount);
    const amplitude = calcRMS(wave, 0, wave.length);

    // Beat detection
    const bs = beatState.get(clipId)!;
    const now = performance.now();
    let isBeat = false;
    if (bass > BEAT_THRESHOLD && bass > bs.previousBass * 1.2 && now - bs.lastBeatTime > BEAT_COOLDOWN) {
      isBeat = true;
      bs.lastBeatTime = now;
    }
    bs.previousBass = bass;

    return {
      frequency: freq,
      waveform: wave,
      amplitude: Math.min(1, amplitude * 2),
      bass,
      mid,
      high,
      isBeat,
    };
  }

  /**
   * Determine which audio clip (if any) should provide AudioData for a scene.
   *
   * Priority:
   * 1. Explicit `scene.audioClipId` binding (unless 'none')
   * 2. Auto-detect: first overlapping audio clip at `timeMs`
   *
   * Only returns a clipId when the animation is audio-reactive.
   */
  function resolveAudioClipForScene(
    scene: SceneEntry,
    animation: AnyAnimationDefinition,
    sceneStartMs: number,
    sceneEndMs: number,
    timeMs: number,
  ): string | undefined {
    // Only for full animations that declare audioReactive
    if (isSimpleAnimation(animation)) return undefined;
    const fullAnim = animation as AnimationDefinition<Record<string, unknown>>;
    if (!fullAnim.audioReactive) return undefined;

    // Explicit binding
    if (scene.audioClipId === 'none') return undefined;
    if (scene.audioClipId) return scene.audioClipId;

    // Auto-detect: find the first audio clip that overlaps with this scene at the current time
    const clips = sequence.audioClips || [];
    for (const clip of clips) {
      const clipStart = clip.startMs;
      const clipEnd = clipStart + (clip.trimEndMs - clip.trimStartMs);
      // Check if the audio clip overlaps the scene's time range at the current playback time
      if (timeMs >= clipStart && timeMs < clipEnd && timeMs >= sceneStartMs && timeMs < sceneEndMs) {
        return clip.clipId;
      }
    }

    return undefined;
  }

  function syncAudioElements() {
    if (!manageAudio) return;
    const clips = sequence.audioClips || [];
    // Remove elements for deleted clips
    for (const [id] of audioElements) {
      if (!clips.find((c) => c.clipId === id)) {
        const el = audioElements.get(id)!;
        el.pause();
        el.src = '';
        audioElements.delete(id);
        disconnectAnalyser(id);
      }
    }
    // Create/update elements for current clips
    for (const clip of clips) {
      let el = audioElements.get(clip.clipId);
      if (!el) {
        el = new Audio();
        el.crossOrigin = 'anonymous';
        el.src = clip.audioUrl;
        el.preload = 'auto';
        el.load();
        audioElements.set(clip.clipId, el);
      }
      el.volume = clip.volume;
      // Connect analyser for this clip (idempotent)
      connectAnalyser(clip.clipId, el);
    }
  }

  function playActiveAudioClips(timeMs: number) {
    if (!manageAudio) return;
    const clips = sequence.audioClips || [];
    for (const clip of clips) {
      const el = audioElements.get(clip.clipId);
      if (!el) continue;
      const effectiveDur = clip.trimEndMs - clip.trimStartMs;
      if (timeMs >= clip.startMs && timeMs < clip.startMs + effectiveDur) {
        const audioTimeSec = (clip.trimStartMs + (timeMs - clip.startMs)) / 1000;
        el.currentTime = audioTimeSec;
        el.play().catch(() => {});
      }
    }
  }

  function tickAudioClips() {
    if (!manageAudio) return;
    const clips = sequence.audioClips || [];
    for (const clip of clips) {
      const el = audioElements.get(clip.clipId);
      if (!el) continue;
      const effectiveDur = clip.trimEndMs - clip.trimStartMs;
      const clipStart = clip.startMs;
      const clipEnd = clipStart + effectiveDur;
      if (currentTimeMs >= clipStart && currentTimeMs < clipEnd) {
        if (el.paused) {
          const audioTimeSec = (clip.trimStartMs + (currentTimeMs - clipStart)) / 1000;
          el.currentTime = audioTimeSec;
          el.play().catch(() => {});
        }
      } else {
        if (!el.paused) el.pause();
      }
    }
  }

  function pauseAllAudioClips() {
    if (!manageAudio) return;
    for (const [, el] of audioElements) {
      el.pause();
    }
  }

  function seekAudioClips(timeMs: number) {
    if (!manageAudio) return;
    const clips = sequence.audioClips || [];
    for (const clip of clips) {
      const el = audioElements.get(clip.clipId);
      if (!el) continue;
      const effectiveDur = clip.trimEndMs - clip.trimStartMs;
      const clipStart = clip.startMs;
      const clipEnd = clipStart + effectiveDur;
      if (timeMs >= clipStart && timeMs < clipEnd) {
        const audioTimeSec = (clip.trimStartMs + (timeMs - clipStart)) / 1000;
        el.currentTime = audioTimeSec;
      } else {
        if (!el.paused) el.pause();
      }
    }
  }

  function destroyAllAudioClips() {
    for (const [id, el] of audioElements) {
      el.pause();
      el.src = '';
      disconnectAnalyser(id);
    }
    audioElements.clear();
    if (sharedAudioCtx) {
      sharedAudioCtx.close().catch(() => {});
      sharedAudioCtx = null;
    }
  }

  // HiDPI
  const dpr = window.devicePixelRatio || 1;

  function setupCanvas() {
    const { width, height } = sequence;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    ctx.scale(dpr, dpr);

    // Offscreen canvases for transition compositing
    offA = new OffscreenCanvas(width * dpr, height * dpr);
    offB = new OffscreenCanvas(width * dpr, height * dpr);
  }

  /** Render a single animation at a given local progress onto a target context.
   *  IMPORTANT: The caller is responsible for filling the sequence background
   *  before calling this function. This function only draws the animation's own
   *  background within its transformed bounding box, then the animation content. */
  function renderAnimation(
    targetCtx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D,
    animation: AnyAnimationDefinition,
    localProgress: number,
    localTimeSec: number,
    scene: SceneEntry,
    w: number,
    h: number,
    audioData?: AudioData
  ) {
    // Reverse playback: flip progress (1→0) and time accordingly
    if (scene.reversed) {
      localProgress = 1 - localProgress;
      const durationSec = scene.durationMs / 1000;
      localTimeSec = durationSec - localTimeSec;
    }

    const params = scene.params || {};
    const baseTransform = scene.transform || DEFAULT_TRANSFORM;
    // Evaluate keyframes at the current local progress to get animated transform values
    const transform = evaluateTransformKeyframes(scene.keyframes, localProgress, baseTransform);
    const transparentBg = scene.transparentBg ?? false;

    targetCtx.save();

    // Apply scene opacity
    if (transform.opacity < 1) {
      targetCtx.globalAlpha = transform.opacity;
    }
    
    // Scale animation to fit sequence canvas (base fit)
    const animW = animation.width ?? 800;
    const animH = animation.height ?? 600;
    const fitScaleX = w / animW;
    const fitScaleY = h / animH;
    const fitScale = Math.min(fitScaleX, fitScaleY);

    // Center position + user offset
    const centerX = w / 2 + transform.offsetX;
    const centerY = h / 2 + transform.offsetY;

    // Translate to center, apply user scale on top of fit scale
    targetCtx.translate(centerX, centerY);
    targetCtx.scale(fitScale * transform.scale, fitScale * transform.scale);
    targetCtx.translate(-animW / 2, -animH / 2);

    // Draw animation's own background within its bounding box (not the full canvas).
    // When transparentBg is on, skip this so the sequence background shows through.
    if (!transparentBg && animation.background) {
      targetCtx.fillStyle = animation.background;
      targetCtx.fillRect(0, 0, animW, animH);
    }

    if (isSimpleAnimation(animation)) {
      animation.render(targetCtx as CanvasRenderingContext2D, {
        width: animW,
        height: animH,
        progress: localProgress,
      });
    } else {
      const fullAnim = animation as AnimationDefinition<Record<string, unknown>>;
      const mergedParams = { ...fullAnim.params.defaults, ...params };

      // When transparent background is on, override any background-related
      // params so the animation's own render() doesn't draw a bg fill.
      if (transparentBg) {
        for (const key of BG_PARAM_KEYS) {
          if (key in mergedParams) {
            mergedParams[key] = 'transparent';
          }
        }
      }

      const renderCtx: RenderContext = {
        ctx: targetCtx as CanvasRenderingContext2D,
        time: localTimeSec,
        progress: localProgress,
        deltaTime: 0,
        width: animW,
        height: animH,
        dpr,
        params: mergedParams,
        frame: Math.floor(localTimeSec * (fullAnim.fps ?? 60)),
        audio: audioData,
      };
      fullAnim.render(renderCtx);
    }

    targetCtx.restore();
  }

  /** Apply transition compositing: draw sceneA and sceneB with blend */
  function compositeTransition(
    type: TransitionType,
    t: number, // 0→1 through the transition
    w: number,
    h: number
  ) {
    if (!offA || !offB) return;

    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);

    switch (type) {
      case 'cut':
        // Just show B
        ctx.drawImage(offB, 0, 0);
        break;

      case 'fade':
        ctx.drawImage(offA, 0, 0);
        ctx.globalAlpha = t;
        ctx.drawImage(offB, 0, 0);
        ctx.globalAlpha = 1;
        break;

      case 'dissolve':
        ctx.drawImage(offA, 0, 0);
        ctx.globalAlpha = t;
        ctx.drawImage(offB, 0, 0);
        ctx.globalAlpha = 1;
        break;

      case 'wipe-left': {
        const wipeX = t * w * dpr;
        ctx.drawImage(offA, 0, 0);
        ctx.beginPath();
        ctx.rect(0, 0, wipeX, h * dpr);
        ctx.clip();
        ctx.drawImage(offB, 0, 0);
        break;
      }

      case 'wipe-right': {
        const wipeX = (1 - t) * w * dpr;
        ctx.drawImage(offA, 0, 0);
        ctx.beginPath();
        ctx.rect(wipeX, 0, w * dpr - wipeX, h * dpr);
        ctx.clip();
        ctx.drawImage(offB, 0, 0);
        break;
      }

      case 'wipe-up': {
        const wipeY = t * h * dpr;
        ctx.drawImage(offA, 0, 0);
        ctx.beginPath();
        ctx.rect(0, 0, w * dpr, wipeY);
        ctx.clip();
        ctx.drawImage(offB, 0, 0);
        break;
      }

      default:
        ctx.drawImage(offB, 0, 0);
    }

    ctx.restore();
  }

  function renderFrame(timeMs: number) {
    const { scenes, width, height } = sequence;
    if (scenes.length === 0) {
      ctx.save();
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.fillStyle = sequence.background || '#000';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.restore();
      return;
    }

    const timings = getSceneTimings(scenes);

    // All scenes active at this time, sorted by lane (negative first, then 0, then positive)
    const activeEntries: { scene: SceneEntry; timing: { startMs: number; endMs: number }; idx: number }[] = [];
    for (let i = 0; i < scenes.length; i++) {
      const t = timings[i];
      if (timeMs >= t.startMs && timeMs < t.endMs) {
        activeEntries.push({ scene: scenes[i], timing: t, idx: i });
      }
    }
    activeEntries.sort((a, b) => (a.scene.lane ?? 0) - (b.scene.lane ?? 0));

    const primaryEntry = activeEntries.find((e) => (e.scene.lane ?? 0) === 0);
    const primaryIdx = primaryEntry?.idx ?? -1;
    const nextIdx = primaryIdx + 1;
    const nextScene = nextIdx < scenes.length ? scenes[nextIdx] : null;
    const nextPrimary = nextScene && (nextScene.lane ?? 0) === 0;
    const transition = primaryEntry?.scene.transition;
    const inTransition =
      primaryEntry &&
      transition &&
      transition.durationMs > 0 &&
      nextPrimary &&
      timeMs >= primaryEntry.timing.endMs - transition.durationMs &&
      timeMs < primaryEntry.timing.endMs;

    const offCtx = offA?.getContext('2d');
    if (!offA || !offB || !offCtx) return;

    // Draw sequence background once
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    if (sequence.background) {
      ctx.fillStyle = sequence.background;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    } else {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
    ctx.restore();

    if (activeEntries.length === 0) return;

    if (inTransition && primaryEntry) {
      const sceneA = primaryEntry.scene;
      const timingA = primaryEntry.timing;
      const animA = animations.get(sceneA.animationId);
      const nextTiming = timings[nextIdx];
      const animB = nextScene ? animations.get(nextScene.animationId) : null;
      if (!animA) {
        ctx.save();
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.fillStyle = '#1a1a1a';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = '#666';
        ctx.font = `${16 * dpr}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.fillText(`Missing: ${sceneA.animationId}`, canvas.width / 2, canvas.height / 2);
        ctx.restore();
        return;
      }
      const localMsA = Math.max(0, Math.min(timeMs - timingA.startMs, sceneA.durationMs));
      const localProgressA = sceneA.durationMs > 0 ? localMsA / sceneA.durationMs : 0;
      const localTimeSecA = localMsA / 1000;

      const ctxA = offA.getContext('2d')!;
      ctxA.save();
      ctxA.setTransform(1, 0, 0, 1, 0, 0);
      if (sequence.background) {
        ctxA.fillStyle = sequence.background;
        ctxA.fillRect(0, 0, offA.width, offA.height);
      } else {
        ctxA.clearRect(0, 0, offA.width, offA.height);
      }
      ctxA.scale(dpr, dpr);
      const audioClipIdA = resolveAudioClipForScene(sceneA, animA, timingA.startMs, timingA.endMs, timeMs);
      const audioDataA = audioClipIdA ? getClipAudioData(audioClipIdA) : undefined;
      renderAnimation(ctxA, animA, localProgressA, localTimeSecA, sceneA, width, height, audioDataA);
      ctxA.restore();

      if (animB && nextScene && nextTiming) {
        const nextLocalMs = Math.max(0, timeMs - nextTiming.startMs);
        const nextLocalProgress = nextScene.durationMs > 0 ? nextLocalMs / nextScene.durationMs : 0;
        const nextLocalTimeSec = nextLocalMs / 1000;
        const ctxB = offB.getContext('2d')!;
        ctxB.save();
        ctxB.setTransform(1, 0, 0, 1, 0, 0);
        if (sequence.background) {
          ctxB.fillStyle = sequence.background;
          ctxB.fillRect(0, 0, offB.width, offB.height);
        } else {
          ctxB.clearRect(0, 0, offB.width, offB.height);
        }
        ctxB.scale(dpr, dpr);
        const audioClipIdB = resolveAudioClipForScene(nextScene, animB, nextTiming.startMs, nextTiming.endMs, timeMs);
        const audioDataB = audioClipIdB ? getClipAudioData(audioClipIdB) : undefined;
        renderAnimation(ctxB, animB, nextLocalProgress, nextLocalTimeSec, nextScene, width, height, audioDataB);
        ctxB.restore();
        const transitionProgress = (timeMs - (timingA.endMs - transition.durationMs)) / transition.durationMs;
        ctx.save();
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        compositeTransition(transition.type, Math.min(1, Math.max(0, transitionProgress)), width, height);
        ctx.restore();
      } else {
        ctx.save();
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.drawImage(offA, 0, 0);
        ctx.restore();
      }

      // Connected clips on top of transition
      for (const entry of activeEntries) {
        if ((entry.scene.lane ?? 0) === 0) continue;
        const anim = animations.get(entry.scene.animationId);
        if (!anim) continue;
        const localMs = Math.max(0, Math.min(timeMs - entry.timing.startMs, entry.scene.durationMs));
        const localProgress = entry.scene.durationMs > 0 ? localMs / entry.scene.durationMs : 0;
        const localTimeSec = localMs / 1000;
        const connAudioClipId = resolveAudioClipForScene(entry.scene, anim, entry.timing.startMs, entry.timing.endMs, timeMs);
        const connAudioData = connAudioClipId ? getClipAudioData(connAudioClipId) : undefined;
        offCtx.save();
        offCtx.setTransform(1, 0, 0, 1, 0, 0);
        offCtx.clearRect(0, 0, offA.width, offA.height);
        offCtx.scale(dpr, dpr);
        renderAnimation(offCtx, anim, localProgress, localTimeSec, entry.scene, width, height, connAudioData);
        offCtx.restore();
        ctx.save();
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.drawImage(offA, 0, 0);
        ctx.restore();
      }
      return;
    }

    // No transition: composite all active layers in lane order
    for (const entry of activeEntries) {
      const anim = animations.get(entry.scene.animationId);
      if (!anim) {
        if (activeEntries.length === 1) {
          ctx.save();
          ctx.setTransform(1, 0, 0, 1, 0, 0);
          ctx.fillStyle = '#1a1a1a';
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          ctx.fillStyle = '#666';
          ctx.font = `${16 * dpr}px sans-serif`;
          ctx.textAlign = 'center';
          ctx.fillText(`Missing: ${entry.scene.animationId}`, canvas.width / 2, canvas.height / 2);
          ctx.restore();
        }
        continue;
      }
      const localMs = Math.max(0, Math.min(timeMs - entry.timing.startMs, entry.scene.durationMs));
      const localProgress = entry.scene.durationMs > 0 ? localMs / entry.scene.durationMs : 0;
      const localTimeSec = localMs / 1000;
      const entryAudioClipId = resolveAudioClipForScene(entry.scene, anim, entry.timing.startMs, entry.timing.endMs, timeMs);
      const entryAudioData = entryAudioClipId ? getClipAudioData(entryAudioClipId) : undefined;
      offCtx.save();
      offCtx.setTransform(1, 0, 0, 1, 0, 0);
      offCtx.clearRect(0, 0, offA.width, offA.height);
      offCtx.scale(dpr, dpr);
      renderAnimation(offCtx, anim, localProgress, localTimeSec, entry.scene, width, height, entryAudioData);
      offCtx.restore();
      ctx.save();
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.drawImage(offA, 0, 0);
      ctx.restore();
    }
  }

  /**
   * Map raw internal time to display time.
   * In ping-pong mode the effective loop is 2×totalMs: the first half plays
   * forward (0→totalMs) and the second half plays in reverse (totalMs→0).
   */
  function getDisplayTimeMs(rawTimeMs: number, totalMs: number): number {
    if (!pingPong || totalMs <= 0) return rawTimeMs;
    const cycleDuration = totalMs * 2;
    const cycleTime = rawTimeMs % cycleDuration;
    return cycleTime <= totalMs ? cycleTime : cycleDuration - cycleTime;
  }

  function tick(timestamp: number) {
    if (!playing) return;

    const frameDuration = 1000 / sequence.fps;
    if (timestamp - lastFrameTime < frameDuration) {
      rafId = requestAnimationFrame(tick);
      return;
    }
    lastFrameTime = timestamp;

    const totalMs = getSequenceDurationMs(sequence.scenes, sequence.audioClips);
    const rawTimeMs = timestamp - startTime;
    const loopDuration = pingPong && totalMs > 0 ? totalMs * 2 : totalMs;

    if (loopDuration > 0 && rawTimeMs >= loopDuration) {
      // Wrap around at the loop boundary
      currentTimeMs = rawTimeMs % loopDuration;
      startTime = timestamp - currentTimeMs;
      pauseAllAudioClips();
    } else {
      currentTimeMs = rawTimeMs;
    }

    const displayTimeMs = getDisplayTimeMs(currentTimeMs, totalMs);

    renderFrame(displayTimeMs);
    tickAudioClips();

    const progress = totalMs > 0 ? displayTimeMs / totalMs : 0;
    onFrame?.(displayTimeMs, progress);

    rafId = requestAnimationFrame(tick);
  }

  function play() {
    if (playing) return;
    playing = true;
    startTime = performance.now() - pausedAt;
    lastFrameTime = performance.now();
    playActiveAudioClips(pausedAt);
    rafId = requestAnimationFrame(tick);
  }

  function pause() {
    if (!playing) return;
    playing = false;
    pausedAt = currentTimeMs;
    pauseAllAudioClips();
    if (rafId !== null) {
      cancelAnimationFrame(rafId);
      rafId = null;
    }
  }

  function toggle() {
    if (playing) pause();
    else play();
  }

  function seek(timeMs: number) {
    const totalMs = getSequenceDurationMs(sequence.scenes, sequence.audioClips);
    const clampedMs = Math.max(0, Math.min(timeMs, totalMs));
    // In ping-pong mode the internal clock uses the forward half of the cycle
    // for display times 0→totalMs. The seek target is a display time, so map
    // it directly to the internal time (forward direction).
    currentTimeMs = clampedMs;
    pausedAt = currentTimeMs;
    startTime = performance.now() - currentTimeMs;
    seekAudioClips(clampedMs);
    renderFrame(clampedMs);
    const progress = totalMs > 0 ? clampedMs / totalMs : 0;
    onFrame?.(clampedMs, progress);
  }

  function restart() {
    pausedAt = 0;
    currentTimeMs = 0;
    startTime = performance.now();
    pauseAllAudioClips();
    if (playing) playActiveAudioClips(0);
    renderFrame(0);
    onFrame?.(0, 0);
    if (playing) {
      lastFrameTime = performance.now();
    }
  }

  function destroy() {
    pause();
    destroyAllAudioClips();
    offA = null;
    offB = null;
  }

  function setPingPong(enabled: boolean) {
    if (enabled === pingPong) return;
    // Preserve the current display position when toggling modes
    const totalMs = getSequenceDurationMs(sequence.scenes, sequence.audioClips);
    const displayMs = getDisplayTimeMs(currentTimeMs, totalMs);
    pingPong = enabled;
    // Map display time back to internal time (forward direction)
    currentTimeMs = displayMs;
    pausedAt = currentTimeMs;
    startTime = performance.now() - currentTimeMs;
  }

  function setSequence(seq: Sequence, anims: Map<string, AnyAnimationDefinition>) {
    const dimensionsChanged =
      seq.width !== sequence.width || seq.height !== sequence.height;

    sequence = seq;
    animations = anims;

    // Sync audio elements with updated clip list
    syncAudioElements();

    // Only re-setup canvas when the output dimensions actually change.
    // setupCanvas() sets canvas.width/height (which clears the canvas),
    // recreates OffscreenCanvas objects, and resets the context transform —
    // all of which are expensive and disruptive during playback.
    if (dimensionsChanged) {
      setupCanvas();
    }

    // Clamp current time to new duration
    const totalMs = getSequenceDurationMs(seq.scenes, seq.audioClips);
    if (currentTimeMs > totalMs) {
      currentTimeMs = totalMs > 0 ? totalMs - 1 : 0;
      pausedAt = currentTimeMs;
    }

    // If the player is actively playing, DON'T cancel & restart the RAF loop.
    // The running tick() already reads `sequence` and `animations` by reference,
    // so it will pick up the new data on the very next frame — no interruption.
    if (!playing) {
      renderFrame(currentTimeMs);
    }
  }

  // Initialize
  syncAudioElements();
  setupCanvas();
  renderFrame(0);
  onFrame?.(0, 0);

  return {
    play,
    pause,
    toggle,
    seek,
    restart,
    destroy,
    isPlaying: () => playing,
    getTimeMs: () => {
      const totalMs = getSequenceDurationMs(sequence.scenes, sequence.audioClips);
      return getDisplayTimeMs(currentTimeMs, totalMs);
    },
    getProgress: () => {
      const totalMs = getSequenceDurationMs(sequence.scenes, sequence.audioClips);
      const displayMs = getDisplayTimeMs(currentTimeMs, totalMs);
      return totalMs > 0 ? displayMs / totalMs : 0;
    },
    setSequence,
    setPingPong,
    isPingPong: () => pingPong,
  };
}

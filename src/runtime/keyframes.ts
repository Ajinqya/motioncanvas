/**
 * Keyframe system for the Sequence Composer
 *
 * Provides types, easing functions, and interpolation logic for animating
 * SceneTransform properties (scale, offsetX, offsetY, opacity) over the
 * duration of a scene. Designed to be extended to animation params in a
 * future phase.
 */

import type { SceneTransform } from './sequence';

// ─── Easing Types ─────────────────────────────────────────────────────────────

export type EasingType =
  | 'linear'
  | 'easeIn'
  | 'easeOut'
  | 'easeInOut'
  | 'step'; // hold previous value, snap at keyframe time

// ─── Keyframe Types ───────────────────────────────────────────────────────────

export interface Keyframe<T = number> {
  /** Normalised time within the scene: 0–1 */
  time: number;
  /** Value at this keyframe */
  value: T;
  /** Easing curve to the NEXT keyframe (default: 'easeInOut') */
  easing?: EasingType;
}

/** A single animated property track — array of keyframes sorted by time */
export type KeyframeTrack<T = number> = Keyframe<T>[];

/** Transform property names that can be keyframed */
export type TransformTrackKey =
  | 'transform.scale'
  | 'transform.offsetX'
  | 'transform.offsetY'
  | 'transform.opacity';

/** All keyframe tracks for a scene (Phase 1: transform only) */
export interface SceneKeyframeTracks {
  'transform.scale'?: KeyframeTrack<number>;
  'transform.offsetX'?: KeyframeTrack<number>;
  'transform.offsetY'?: KeyframeTrack<number>;
  'transform.opacity'?: KeyframeTrack<number>;
}

/** Human-readable labels for transform tracks */
export const TRANSFORM_TRACK_LABELS: Record<TransformTrackKey, string> = {
  'transform.scale': 'Scale',
  'transform.offsetX': 'Position X',
  'transform.offsetY': 'Position Y',
  'transform.opacity': 'Opacity',
};

/** All possible transform track keys (ordered for UI) */
export const TRANSFORM_TRACK_KEYS: TransformTrackKey[] = [
  'transform.scale',
  'transform.offsetX',
  'transform.offsetY',
  'transform.opacity',
];

// ─── Easing Functions ─────────────────────────────────────────────────────────

/** Map of easing type → (t: 0–1) → eased value */
const EASING_FNS: Record<EasingType, (t: number) => number> = {
  linear: (t) => t,
  easeIn: (t) => t * t * t,
  easeOut: (t) => 1 - Math.pow(1 - t, 3),
  easeInOut: (t) =>
    t < 0.5
      ? 4 * t * t * t
      : 1 - Math.pow(-2 * t + 2, 3) / 2,
  step: (_t) => 0, // handled specially in evaluateTrack
};

export function applyEasing(t: number, easing: EasingType = 'easeInOut'): number {
  return EASING_FNS[easing]?.(t) ?? t;
}

// ─── Interpolation ────────────────────────────────────────────────────────────

/**
 * Evaluate a single keyframe track at a given normalised time (0–1).
 * Returns the interpolated value, or `fallback` if the track is empty/undefined.
 */
export function evaluateTrack(
  track: KeyframeTrack<number> | undefined,
  time: number,
  fallback: number,
): number {
  if (!track || track.length === 0) return fallback;

  // Before first keyframe — hold first value
  if (time <= track[0].time) return track[0].value;

  // After last keyframe — hold last value
  if (time >= track[track.length - 1].time) return track[track.length - 1].value;

  // Find the two surrounding keyframes
  for (let i = 0; i < track.length - 1; i++) {
    const a = track[i];
    const b = track[i + 1];
    if (time >= a.time && time <= b.time) {
      const easing = a.easing ?? 'easeInOut';

      // Step easing: hold A's value until B's time
      if (easing === 'step') return a.value;

      // Continuous easing
      const segmentDuration = b.time - a.time;
      const localT = segmentDuration > 0 ? (time - a.time) / segmentDuration : 0;
      const easedT = applyEasing(localT, easing);
      return a.value + (b.value - a.value) * easedT;
    }
  }

  // Shouldn't reach here, but return fallback just in case
  return fallback;
}

/**
 * Evaluate all keyframe tracks for a scene at a given normalised time (0–1).
 * Returns a resolved SceneTransform with keyframe values blended in.
 * Properties without keyframes pass through from `baseTransform`.
 */
export function evaluateTransformKeyframes(
  tracks: SceneKeyframeTracks | undefined,
  time: number,
  baseTransform: SceneTransform,
): SceneTransform {
  if (!tracks) return baseTransform;

  return {
    scale: evaluateTrack(tracks['transform.scale'], time, baseTransform.scale),
    offsetX: evaluateTrack(tracks['transform.offsetX'], time, baseTransform.offsetX),
    offsetY: evaluateTrack(tracks['transform.offsetY'], time, baseTransform.offsetY),
    opacity: evaluateTrack(tracks['transform.opacity'], time, baseTransform.opacity),
  };
}

// ─── Track Helpers ────────────────────────────────────────────────────────────

/** Check whether a scene has any keyframe tracks with at least one keyframe */
export function hasAnyKeyframes(tracks: SceneKeyframeTracks | undefined): boolean {
  if (!tracks) return false;
  for (const key of TRANSFORM_TRACK_KEYS) {
    const track = tracks[key];
    if (track && track.length > 0) return true;
  }
  return false;
}

/** Get the number of keyframes in a specific track */
export function getTrackKeyframeCount(
  tracks: SceneKeyframeTracks | undefined,
  key: TransformTrackKey,
): number {
  return tracks?.[key]?.length ?? 0;
}

/**
 * Add or update a keyframe in a track.
 * If a keyframe already exists at `time` (within a small tolerance), it's updated.
 * Otherwise a new keyframe is inserted at the correct sorted position.
 * Returns a new tracks object (immutable update).
 */
export function setKeyframe(
  tracks: SceneKeyframeTracks | undefined,
  trackKey: TransformTrackKey,
  time: number,
  value: number,
  easing?: EasingType,
): SceneKeyframeTracks {
  const result: SceneKeyframeTracks = { ...tracks };
  const existing = result[trackKey] ? [...result[trackKey]!] : [];

  const TIME_TOLERANCE = 0.001;
  const idx = existing.findIndex((kf) => Math.abs(kf.time - time) < TIME_TOLERANCE);

  if (idx >= 0) {
    // Update existing keyframe
    existing[idx] = { ...existing[idx], value, ...(easing !== undefined ? { easing } : {}) };
  } else {
    // Insert new keyframe
    const kf: Keyframe<number> = { time, value };
    if (easing !== undefined) kf.easing = easing;
    existing.push(kf);
    existing.sort((a, b) => a.time - b.time);
  }

  result[trackKey] = existing;
  return result;
}

/**
 * Remove a keyframe at a given time from a track.
 * Returns a new tracks object (immutable update).
 */
export function removeKeyframe(
  tracks: SceneKeyframeTracks | undefined,
  trackKey: TransformTrackKey,
  time: number,
): SceneKeyframeTracks {
  const result: SceneKeyframeTracks = { ...tracks };
  const existing = result[trackKey];
  if (!existing) return result;

  const TIME_TOLERANCE = 0.001;
  result[trackKey] = existing.filter((kf) => Math.abs(kf.time - time) >= TIME_TOLERANCE);

  // Clean up empty tracks
  if (result[trackKey]!.length === 0) {
    delete result[trackKey];
  }

  return result;
}

/**
 * Remove all keyframes from a specific track.
 * Returns a new tracks object.
 */
export function clearTrack(
  tracks: SceneKeyframeTracks | undefined,
  trackKey: TransformTrackKey,
): SceneKeyframeTracks {
  const result: SceneKeyframeTracks = { ...tracks };
  delete result[trackKey];
  return result;
}

/**
 * Remove all keyframes from all tracks.
 */
export function clearAllKeyframes(): SceneKeyframeTracks {
  return {};
}

/**
 * Get the default/base value for a transform track key from a SceneTransform.
 */
export function getTransformValue(
  transform: SceneTransform,
  trackKey: TransformTrackKey,
): number {
  switch (trackKey) {
    case 'transform.scale': return transform.scale;
    case 'transform.offsetX': return transform.offsetX;
    case 'transform.offsetY': return transform.offsetY;
    case 'transform.opacity': return transform.opacity;
  }
}

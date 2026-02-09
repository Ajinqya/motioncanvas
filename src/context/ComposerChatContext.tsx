/**
 * ComposerChatContext
 *
 * Bridges the Composer's state/actions with the AnimationChat component.
 * The Composer registers its actions on mount; the chat reads them via a ref
 * so it always gets the latest closures without causing extra re-renders.
 */

import {
  createContext,
  useContext,
  useRef,
  useState,
  type ReactNode,
  type MutableRefObject,
} from 'react';
import type { Sequence, SceneEntry, SceneTransform } from '../runtime/sequence';
import type { SceneKeyframeTracks, TransformTrackKey, EasingType } from '../runtime/keyframes';
import { TRANSFORM_TRACK_KEYS, hasAnyKeyframes } from '../runtime/keyframes';

// ─── Public types ────────────────────────────────────────────────────────────

export interface ComposerSceneInfo {
  index: number;
  sceneId: string;
  label: string;
  animationId: string;
  durationMs: number;
  currentParams: Record<string, unknown>;
  /** Default params from the animation definition (tells the AI what's available) */
  availableParams: Record<string, unknown>;
  transform: SceneTransform;
  transition?: { type: string; durationMs: number };
  transparentBg: boolean;
  reversed: boolean;
  /** Lane: 0 = primary storyline, non-zero = secondary/overlay track */
  lane: number;
  /** For connected scenes: sceneId of the anchor in the primary lane */
  connectedTo?: string;
  /** For connected scenes: time offset from anchor start in ms */
  connectedOffsetMs?: number;
  /** Keyframe tracks (if any) */
  keyframes?: SceneKeyframeTracks;
}

export interface ComposerState {
  sequence: Sequence;
  scenes: ComposerSceneInfo[];
  availableAnimations: { id: string; name: string }[];
}

export interface ComposerActions {
  /** Snapshot the current composer state for building the AI prompt */
  getState: () => ComposerState;
  /** Update a scene by its 0-based timeline index (params & transform are merged) */
  updateScene: (sceneIndex: number, updates: Partial<SceneEntry>) => void;
  /** Remove a scene by its 0-based index */
  removeScene: (sceneIndex: number) => void;
  /** Add a gallery animation to the end of the timeline */
  addScene: (animationId: string) => void;
  /** Duplicate a scene by its 0-based index */
  duplicateScene: (sceneIndex: number) => void;
  /** Update sequence-level settings */
  updateSequence: (updates: Partial<Pick<Sequence, 'name' | 'background' | 'fps' | 'width' | 'height'>>) => void;
  /** Add a custom-code scene (inline animation code) to the end of the timeline */
  addCustomCodeScene: (code: string, label: string, config?: { durationMs?: number; width?: number; height?: number; fps?: number; background?: string }) => void;
  /** Move a scene to a different lane (0 = primary, non-zero = secondary overlay) */
  moveToLane: (sceneIndex: number, targetLane: number, anchorSceneIndex?: number, offsetMs?: number) => void;
  /** Set (add/update) a keyframe on a scene's transform track */
  setKeyframe: (sceneIndex: number, track: TransformTrackKey, time: number, value: number, easing?: EasingType) => void;
  /** Remove a keyframe at a specific time from a scene's track */
  removeKeyframe: (sceneIndex: number, track: TransformTrackKey, time: number) => void;
  /** Clear all keyframes from a specific track, or all tracks if no track specified */
  clearKeyframes: (sceneIndex: number, track?: TransformTrackKey) => void;
}

// ─── Context ─────────────────────────────────────────────────────────────────

interface ComposerChatContextValue {
  /** Mutable ref holding the latest Composer actions (updated every render) */
  actionsRef: MutableRefObject<ComposerActions | null>;
  /** Whether the Composer page is currently mounted */
  isComposerActive: boolean;
  /** Called by Composer on mount/unmount */
  setIsComposerActive: (active: boolean) => void;
}

const ComposerChatContext = createContext<ComposerChatContextValue>({
  actionsRef: { current: null },
  isComposerActive: false,
  setIsComposerActive: () => {},
});

// ─── Provider ────────────────────────────────────────────────────────────────

export function ComposerChatProvider({ children }: { children: ReactNode }) {
  const actionsRef = useRef<ComposerActions | null>(null);
  const [isComposerActive, setIsComposerActive] = useState(false);

  return (
    <ComposerChatContext.Provider value={{ actionsRef, isComposerActive, setIsComposerActive }}>
      {children}
    </ComposerChatContext.Provider>
  );
}

// ─── Hook ────────────────────────────────────────────────────────────────────

export function useComposerChat() {
  return useContext(ComposerChatContext);
}

// ─── Helpers for the chat ────────────────────────────────────────────────────

/** Build a text description of the current sequence state for the AI prompt */
export function buildSequenceStatePrompt(state: ComposerState): string {
  const { sequence, scenes, availableAnimations } = state;
  const lines: string[] = [];

  lines.push('[SEQUENCE STATE]');
  lines.push(`Name: ${sequence.name}`);
  lines.push(`Resolution: ${sequence.width}×${sequence.height} | FPS: ${sequence.fps} | Background: ${sequence.background || '#000000'}`);
  lines.push('');

  if (scenes.length === 0) {
    lines.push('Timeline: (empty — no scenes yet)');
  } else {
    lines.push(`Timeline (${scenes.length} scene${scenes.length > 1 ? 's' : ''}):`);
    for (const s of scenes) {
      const laneSuffix = s.lane !== 0 ? ` [lane ${s.lane}]` : '';
      lines.push(`  [${s.index}] "${s.label}" — animation: ${s.animationId} — ${s.durationMs}ms${laneSuffix}`);

      // Current params
      const paramEntries = Object.entries(s.currentParams);
      if (paramEntries.length > 0) {
        const paramStr = paramEntries.map(([k, v]) => `${k}: ${JSON.stringify(v)}`).join(', ');
        lines.push(`      Params: { ${paramStr} }`);
      }

      // Available param keys (from animation defaults)
      const availKeys = Object.keys(s.availableParams);
      if (availKeys.length > 0) {
        lines.push(`      Available params: [${availKeys.join(', ')}]`);
      }

      // Transform (only show non-default values)
      const t = s.transform;
      const tp: string[] = [];
      if (t.scale !== 1) tp.push(`scale=${t.scale}`);
      if (t.offsetX !== 0) tp.push(`offsetX=${t.offsetX}`);
      if (t.offsetY !== 0) tp.push(`offsetY=${t.offsetY}`);
      if (t.opacity !== 1) tp.push(`opacity=${t.opacity}`);
      if (tp.length > 0) {
        lines.push(`      Transform: ${tp.join(', ')}`);
      }

      // Transition
      if (s.transition && s.transition.type !== 'cut') {
        lines.push(`      Transition: ${s.transition.type} ${s.transition.durationMs}ms`);
      }

      if (s.transparentBg) {
        lines.push(`      Transparent background: yes`);
      }
      if (s.reversed) {
        lines.push(`      Reversed playback: yes`);
      }

      // Lane / connected info
      if (s.lane !== 0) {
        const anchorLabel = s.connectedTo
          ? scenes.find((x) => x.sceneId === s.connectedTo)?.label || s.connectedTo
          : '(none)';
        lines.push(`      Lane: ${s.lane} — anchored to "${anchorLabel}", offset ${s.connectedOffsetMs ?? 0}ms`);
      }

      // Keyframes
      if (s.keyframes && hasAnyKeyframes(s.keyframes)) {
        lines.push(`      Keyframes:`);
        for (const trackKey of TRANSFORM_TRACK_KEYS) {
          const track = s.keyframes[trackKey];
          if (track && track.length > 0) {
            const kfStr = track.map(
              (kf) => `t=${kf.time.toFixed(2)} v=${kf.value}${kf.easing && kf.easing !== 'easeInOut' ? ` ${kf.easing}` : ''}`
            ).join(' → ');
            lines.push(`        ${trackKey}: [${kfStr}]`);
          }
        }
      }
    }
  }

  lines.push('');
  lines.push('Available animations to add:');
  for (const a of availableAnimations) {
    lines.push(`  - ${a.id} ("${a.name}")`);
  }

  lines.push('[END STATE]');
  return lines.join('\n');
}

/** Execute tool calls returned by the compose API against the Composer */
export async function executeComposerToolCalls(
  toolCalls: { name: string; arguments: Record<string, unknown> }[],
  actions: ComposerActions,
  options?: { apiKey?: string },
): Promise<string[]> {
  const summaries: string[] = [];

  for (const tc of toolCalls) {
    try {
      switch (tc.name) {
        case 'update_scene': {
          const args = tc.arguments as Record<string, unknown>;
          const sceneIndex = args.scene_index as number;
          const updates: Partial<SceneEntry> = {};

          if (args.durationMs != null) updates.durationMs = args.durationMs as number;
          if (args.label != null) updates.label = args.label as string;
          if (args.transparentBg != null) updates.transparentBg = args.transparentBg as boolean;
          if (args.reversed != null) updates.reversed = args.reversed as boolean;
          if (args.params != null) updates.params = args.params as Record<string, unknown>;
          if (args.transform != null) updates.transform = args.transform as SceneTransform;
          if (args.transition != null) updates.transition = args.transition as { type: string; durationMs: number } as any;

          actions.updateScene(sceneIndex, updates);

          // Build human-readable summary
          const parts: string[] = [];
          if (args.durationMs != null) parts.push(`duration → ${args.durationMs}ms`);
          if (args.label != null) parts.push(`label → "${args.label}"`);
          if (args.params != null) {
            for (const [k, v] of Object.entries(args.params as Record<string, unknown>)) {
              parts.push(`${k} → ${JSON.stringify(v)}`);
            }
          }
          if (args.transform != null) {
            for (const [k, v] of Object.entries(args.transform as Record<string, unknown>)) {
              parts.push(`${k} → ${v}`);
            }
          }
          if (args.transition != null) {
            const tr = args.transition as Record<string, unknown>;
            parts.push(`transition → ${tr.type}${tr.durationMs ? ` ${tr.durationMs}ms` : ''}`);
          }
          if (args.transparentBg != null) parts.push(`transparent bg → ${args.transparentBg}`);
          if (args.reversed != null) parts.push(`reversed → ${args.reversed}`);

          summaries.push(`Updated scene ${sceneIndex}: ${parts.join(', ')}`);
          break;
        }

        case 'remove_scene': {
          const idx = (tc.arguments as any).scene_index as number;
          actions.removeScene(idx);
          summaries.push(`Removed scene ${idx}`);
          break;
        }

        case 'add_scene': {
          const animId = (tc.arguments as any).animation_id as string;
          actions.addScene(animId);
          summaries.push(`Added "${animId}" to timeline`);
          break;
        }

        case 'duplicate_scene': {
          const idx = (tc.arguments as any).scene_index as number;
          actions.duplicateScene(idx);
          summaries.push(`Duplicated scene ${idx}`);
          break;
        }

        case 'update_sequence': {
          const args = tc.arguments as Record<string, unknown>;
          actions.updateSequence(args as any);
          const parts = Object.entries(args).map(([k, v]) => `${k} → ${JSON.stringify(v)}`);
          summaries.push(`Updated sequence: ${parts.join(', ')}`);
          break;
        }

        case 'move_scene_to_lane': {
          const args = tc.arguments as Record<string, unknown>;
          const sceneIndex = args.scene_index as number;
          const targetLane = args.target_lane as number;
          const anchorSceneIndex = args.anchor_scene_index as number | undefined;
          const offsetMs = args.offset_ms as number | undefined;

          actions.moveToLane(sceneIndex, targetLane, anchorSceneIndex, offsetMs);

          if (targetLane === 0) {
            summaries.push(`Moved scene ${sceneIndex} to primary storyline`);
          } else {
            const parts = [`lane ${targetLane}`];
            if (anchorSceneIndex != null) parts.push(`anchored to scene ${anchorSceneIndex}`);
            if (offsetMs != null && offsetMs !== 0) parts.push(`offset ${offsetMs}ms`);
            summaries.push(`Moved scene ${sceneIndex} to ${parts.join(', ')}`);
          }
          break;
        }

        case 'set_keyframe': {
          const args = tc.arguments as Record<string, unknown>;
          const sceneIndex = args.scene_index as number;
          const track = args.track as TransformTrackKey;
          const time = args.time as number;
          const value = args.value as number;
          const easing = args.easing as EasingType | undefined;

          actions.setKeyframe(sceneIndex, track, time, value, easing);
          summaries.push(`Set keyframe on scene ${sceneIndex} ${track}: t=${time} v=${value}${easing ? ` ${easing}` : ''}`);
          break;
        }

        case 'remove_keyframe': {
          const args = tc.arguments as Record<string, unknown>;
          const sceneIndex = args.scene_index as number;
          const track = args.track as TransformTrackKey;
          const time = args.time as number;

          actions.removeKeyframe(sceneIndex, track, time);
          summaries.push(`Removed keyframe from scene ${sceneIndex} ${track} at t=${time}`);
          break;
        }

        case 'clear_keyframes': {
          const args = tc.arguments as Record<string, unknown>;
          const sceneIndex = args.scene_index as number;
          const track = args.track as TransformTrackKey | undefined;

          actions.clearKeyframes(sceneIndex, track);
          summaries.push(
            track
              ? `Cleared keyframes from scene ${sceneIndex} ${track}`
              : `Cleared all keyframes from scene ${sceneIndex}`
          );
          break;
        }

        case 'create_and_add_scene': {
          const args = tc.arguments as Record<string, unknown>;
          const description = args.description as string;
          const label = (args.label as string) || 'AI Generated';
          const durationMs = (args.durationMs as number) || 3000;

          // Call the animation creation API to generate the code
          const payload: Record<string, unknown> = {
            messages: [{ role: 'user', content: description }],
          };
          if (options?.apiKey) payload.apiKey = options.apiKey;

          const response = await fetch('/api/chat-create-animation', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          });
          const data = await response.json();

          if (data.success && data.code) {
            actions.addCustomCodeScene(data.code, label, { durationMs });
            summaries.push(`Created "${label}" and added to timeline`);
          } else {
            summaries.push(`Failed to create "${label}": ${data.error || 'Unknown error'}`);
          }
          break;
        }

        default:
          summaries.push(`Unknown action: ${tc.name}`);
      }
    } catch (e) {
      summaries.push(`Failed: ${tc.name} — ${e}`);
    }
  }

  return summaries;
}

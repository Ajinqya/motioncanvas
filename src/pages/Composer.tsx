import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useAnimationRegistry } from '../animations/registry';
import { useDeletedAnimations } from '../hooks/useDeletedAnimations';
import {
  createSequencePlayer,
  createEmptySequence,
  generateSceneId,
  generateAudioClipId,
  getSceneTimings,
  getSequenceDurationMs,
  findFreeLaneForAudio,
  findFreeLaneForOverlay,
  findFreeLaneForSceneDrop,
  findFreeLaneForAudioDrop,
  DEFAULT_TRANSFORM,
  TRANSFORM_TRACK_KEYS,
  TRANSFORM_TRACK_LABELS,
  hasAnyKeyframes,
  getTrackKeyframeCount,
  setKeyframe,
  removeKeyframe,
  clearTrack,
  getTransformValue,
  evaluateTransformKeyframes,
  type Sequence,
  type SceneEntry,
  type SceneTransform,
  type AudioClipEntry,
  type SequencePlayerControls,
  type TransitionType,
  type CustomCodeConfig,
  type TransformTrackKey,
  type EasingType,
} from '../runtime/sequence';
import type { AnyAnimationDefinition, AnimationDefinition } from '../runtime/types';
import { isSimpleAnimation } from '../runtime/types';
import { useComposerChat, type ComposerActions, type ComposerSceneInfo } from '../context/ComposerChatContext';
import { compileCustomCode, validateCustomCode, extractModuleConfig, isFullAnimationModule, CUSTOM_CODE_TEMPLATE } from '../runtime/custom-code';
import { ParameterPanel } from '../components/ParameterPanel';
import { AnimationThumbnail } from '../components/AnimationThumbnail';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ThemeToggle } from '../components/theme-toggle';
import {
  ArrowLeft,
  ArrowLeftRight,
  Play,
  Pause,
  Plus,
  Trash2,
  GripVertical,
  Copy,
  Layers,
  Clock,
  ArrowRight,
  Move,
  RotateCw,
  ZoomIn,
  ZoomOut,
  Maximize,
  SkipBack,
  SkipForward,
  Save,
  FolderOpen,
  Film,
  Music,
  Volume2,
  Code,
  LayoutGrid,
  AlertCircle,
  Check,
  Undo2,
  Diamond,
  ChevronRight,
  ChevronDown,
  LogIn,
  LogOut,
  User,
  Globe,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  saveSequence,
  listSavedSequences,
  loadSequence,
} from '../runtime/sequence-storage';
import { useWorkspace } from '../context/WorkspaceContext';
import { useAuth } from '../context/AuthContext';
import { AuthDialog } from '../components/AuthDialog';
import { exportToMp4 } from '../runtime/exporter';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getAnimationId(entry: { definition: any }) {
  return 'id' in entry.definition
    ? entry.definition.id
    : 'name' in entry.definition && entry.definition.name
      ? entry.definition.name.toLowerCase().replace(/\s+/g, '-')
      : 'animation';
}

function getAnimationName(entry: { definition: any }) {
  return 'name' in entry.definition && entry.definition.name
    ? entry.definition.name
    : getAnimationId(entry);
}

function formatTime(ms: number): string {
  const totalSec = ms / 1000;
  const min = Math.floor(totalSec / 60);
  const sec = totalSec % 60;
  return min > 0 ? `${min}:${sec.toFixed(1).padStart(4, '0')}` : `${sec.toFixed(1)}s`;
}

function formatTimecode(ms: number): string {
  const totalSec = Math.floor(ms / 1000);
  const min = Math.floor(totalSec / 60);
  const sec = totalSec % 60;
  const frames = Math.floor((ms % 1000) / (1000 / 60));
  return `${String(min).padStart(2, '0')}:${String(sec).padStart(2, '0')}:${String(frames).padStart(2, '0')}`;
}

const TRANSITION_TYPES: { value: TransitionType; label: string }[] = [
  { value: 'cut', label: 'Cut' },
  { value: 'fade', label: 'Fade' },
  { value: 'dissolve', label: 'Dissolve' },
  { value: 'wipe-left', label: 'Wipe Left' },
  { value: 'wipe-right', label: 'Wipe Right' },
  { value: 'wipe-up', label: 'Wipe Up' },
];

// Stable color per scene (by sceneId) so reordering doesn't change clip colors
function sceneColorForId(sceneId: string): string {
  let h = 0;
  for (let i = 0; i < sceneId.length; i++) h = ((h << 5) - h + sceneId.charCodeAt(i)) | 0;
  return SCENE_COLORS[Math.abs(h) % SCENE_COLORS.length];
}

const SCENE_COLORS = [
  'hsl(220, 70%, 55%)',
  'hsl(280, 65%, 55%)',
  'hsl(340, 70%, 55%)',
  'hsl(160, 60%, 45%)',
  'hsl(30, 80%, 55%)',
  'hsl(190, 65%, 50%)',
  'hsl(50, 75%, 50%)',
  'hsl(120, 55%, 45%)',
];

/** Compute pixel bounding box for a scene on the sequence canvas.
 *  When `localProgress` is provided, evaluates keyframes to get the
 *  animated transform at that point in time; otherwise uses the base transform. */
function computeSceneBBox(
  scene: SceneEntry,
  animation: AnyAnimationDefinition,
  seqW: number,
  seqH: number,
  localProgress?: number,
) {
  const baseTransform = scene.transform || DEFAULT_TRANSFORM;
  const transform =
    localProgress !== undefined
      ? evaluateTransformKeyframes(scene.keyframes, localProgress, baseTransform)
      : baseTransform;
  const animW = animation.width ?? 800;
  const animH = animation.height ?? 600;
  const fitScale = Math.min(seqW / animW, seqH / animH);
  const contentW = animW * fitScale * transform.scale;
  const contentH = animH * fitScale * transform.scale;
  const x = (seqW / 2 + transform.offsetX) - contentW / 2;
  const y = (seqH / 2 + transform.offsetY) - contentH / 2;
  return { x, y, width: contentW, height: contentH };
}

/** Helper to compute local progress (0–1) for a scene at a given absolute time */
function getSceneLocalProgress(
  currentTimeMs: number,
  sceneTiming: { startMs: number; endMs: number },
  sceneDurationMs: number,
): number {
  if (sceneDurationMs <= 0) return 0;
  const localMs = Math.max(0, Math.min(currentTimeMs - sceneTiming.startMs, sceneDurationMs));
  return localMs / sceneDurationMs;
}

// ─── Sequence Settings Sidebar ────────────────────────────────────────────────

function SequenceSettingsSidebar({
  sequence,
  onUpdate,
}: {
  sequence: Sequence;
  onUpdate: (updates: Partial<Sequence>) => void;
}) {
  return (
    <div className="p-4 space-y-4">
      <h3 className="font-semibold text-sm">Sequence Settings</h3>

      {/* Canvas Size */}
      <div>
        <Label className="text-xs">Canvas Size</Label>
        <div className="flex gap-2 mt-1">
          <Input
            type="number"
            value={sequence.width}
            onChange={(e) => onUpdate({ width: parseInt(e.target.value) || 1920 })}
            className="h-8 text-xs"
            placeholder="Width"
          />
          <span className="text-muted-foreground self-center text-xs">×</span>
          <Input
            type="number"
            value={sequence.height}
            onChange={(e) => onUpdate({ height: parseInt(e.target.value) || 1080 })}
            className="h-8 text-xs"
            placeholder="Height"
          />
        </div>
      </div>

      {/* FPS */}
      <div>
        <Label className="text-xs">FPS</Label>
        <Input
          type="number"
          value={sequence.fps}
          onChange={(e) => onUpdate({ fps: parseInt(e.target.value) || 60 })}
          className="h-8 text-xs mt-1"
        />
      </div>

      {/* Background */}
      <div>
        <Label className="text-xs">Background</Label>
        <div className="flex gap-2 mt-1 items-center">
          <div className="w-8 h-8 rounded border border-border cursor-pointer relative overflow-hidden"
            style={{ backgroundColor: sequence.background || '#000000' }}>
            <input
              type="color"
              value={sequence.background || '#000000'}
              onChange={(e) => onUpdate({ background: e.target.value })}
              className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
            />
          </div>
          <Input
            value={sequence.background || '#000000'}
            onChange={(e) => onUpdate({ background: e.target.value })}
            className="h-8 text-xs flex-1 font-mono"
          />
        </div>
      </div>

      <Separator />

      {/* Info */}
      <div className="space-y-2 text-xs text-muted-foreground">
        <div className="flex justify-between">
          <span>Scenes</span>
          <span className="tabular-nums">{sequence.scenes.length}</span>
        </div>
        <div className="flex justify-between">
          <span>Duration</span>
          <span className="tabular-nums">{formatTime(getSequenceDurationMs(sequence.scenes))}</span>
        </div>
        <div className="flex justify-between">
          <span>Resolution</span>
          <span className="tabular-nums">{sequence.width}×{sequence.height}</span>
        </div>
      </div>
    </div>
  );
}

// ─── Scene Settings Sidebar ──────────────────────────────────────────────────

const EASING_OPTIONS: { value: EasingType; label: string }[] = [
  { value: 'linear', label: 'Linear' },
  { value: 'easeIn', label: 'Ease In' },
  { value: 'easeOut', label: 'Ease Out' },
  { value: 'easeInOut', label: 'Ease In Out' },
  { value: 'step', label: 'Step (Hold)' },
];

function SceneSettingsSidebar({
  scene,
  animationsMap,
  audioClips,
  onUpdate,
  onDuplicate,
  onRemove,
  currentTimeMs,
  sceneTiming,
  selectedKfs,
  onSetSelectedKfs: _onSetSelectedKfs,
}: {
  scene: SceneEntry;
  animationsMap: Map<string, AnyAnimationDefinition>;
  audioClips: AudioClipEntry[];
  onUpdate: (updates: Partial<SceneEntry>) => void;
  onDuplicate: () => void;
  onRemove: () => void;
  currentTimeMs: number;
  sceneTiming?: { startMs: number; endMs: number };
  selectedKfs: SelectedKf[];
  onSetSelectedKfs: React.Dispatch<React.SetStateAction<SelectedKf[]>>;
}) {
  const animation = animationsMap.get(scene.animationId);
  const transform = scene.transform || DEFAULT_TRANSFORM;

  // Keyframe helpers (localProgress needed early for animatedTransform)
  const localProgress = useMemo(() => {
    if (!sceneTiming || scene.durationMs <= 0) return 0;
    const localMs = Math.max(0, Math.min(currentTimeMs - sceneTiming.startMs, scene.durationMs));
    return localMs / scene.durationMs;
  }, [currentTimeMs, sceneTiming, scene.durationMs]);

  // Interpolated transform at the current playhead (reflects keyframe animation)
  const animatedTransform = useMemo(
    () => evaluateTransformKeyframes(scene.keyframes, localProgress, transform),
    [scene.keyframes, localProgress, transform]
  );

  const hasParams = animation && !isSimpleAnimation(animation);
  const fullAnim = hasParams
    ? (animation as AnimationDefinition<Record<string, unknown>>)
    : null;
  const isAudioReactive = fullAnim?.audioReactive === true;
  const paramSchema = fullAnim?.params?.schema;
  const paramDefaults = fullAnim?.params?.defaults ?? {};

  const currentParams = useMemo(
    () => ({ ...paramDefaults, ...scene.params }),
    [paramDefaults, scene.params]
  );

  const handleParamChange = useCallback(
    (key: string, value: unknown) => {
      onUpdate({ params: { ...currentParams, [key]: value } });
    },
    [currentParams, onUpdate]
  );

  const handleTransformChange = useCallback(
    (field: keyof SceneTransform, value: number) => {
      const trackKey = `transform.${field}` as TransformTrackKey;
      const hasKfs = getTrackKeyframeCount(scene.keyframes, trackKey) > 0;

      if (hasKfs) {
        // Track has keyframes — auto-add/update keyframe at playhead, don't touch base
        const newTracks = setKeyframe(scene.keyframes, trackKey, localProgress, value);
        onUpdate({ keyframes: newTracks });
      } else {
        // No keyframes — update base transform directly
        onUpdate({ transform: { ...transform, [field]: value } });
      }
    },
    [transform, onUpdate, scene.keyframes, localProgress]
  );

  const addTransformKeyframe = useCallback(
    (trackKey: TransformTrackKey) => {
      // Use the animated (interpolated) value at the current playhead, not the base transform,
      // so that the keyframe captures what the user currently sees.
      const field = trackKey.replace('transform.', '') as keyof SceneTransform;
      const value = animatedTransform[field] as number;
      const newTracks = setKeyframe(scene.keyframes, trackKey, localProgress, value);
      onUpdate({ keyframes: newTracks });
    },
    [scene.keyframes, animatedTransform, localProgress, onUpdate]
  );

  const hasKeyframeAt = useCallback(
    (trackKey: TransformTrackKey) => {
      const track = scene.keyframes?.[trackKey];
      if (!track) return false;
      return track.some((kf) => Math.abs(kf.time - localProgress) < 0.005);
    },
    [scene.keyframes, localProgress]
  );

  const removeTransformKeyframeAtPlayhead = useCallback(
    (trackKey: TransformTrackKey) => {
      const newTracks = removeKeyframe(scene.keyframes, trackKey, localProgress);
      onUpdate({
        keyframes: Object.keys(newTracks).length > 0 ? newTracks : undefined,
      });
    },
    [scene.keyframes, localProgress, onUpdate]
  );

  return (
    <div className="p-4 space-y-4">
      <h3 className="font-semibold text-sm">Scene Settings</h3>

      {/* Label */}
      <div>
        <Label className="text-xs">Label</Label>
        <Input
          value={scene.label || ''}
          onChange={(e) => onUpdate({ label: e.target.value })}
          className="h-8 text-sm mt-1"
          placeholder="Scene name..."
        />
      </div>

      {/* Animation ref */}
      <div>
        <Label className="text-xs">Animation</Label>
        {scene.customCode ? (
          <div className="mt-1">
            <div className="flex items-center gap-1.5 px-3 py-2 rounded-md border bg-muted/50 text-sm">
              <Code className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
              <span className="font-mono truncate">{scene.label || 'Custom Code'}</span>
              <span className="ml-auto text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded-full font-medium">Code</span>
            </div>
            <details className="mt-2">
              <summary className="text-[11px] text-muted-foreground cursor-pointer hover:text-foreground">
                Edit code
              </summary>
              <textarea
                value={scene.customCode}
                onChange={(e) => onUpdate({ customCode: e.target.value })}
                className="w-full h-[160px] mt-1.5 rounded-md border bg-muted/50 p-2 font-mono text-[11px] leading-relaxed resize-y focus:outline-none focus:ring-2 focus:ring-primary/50"
                spellCheck={false}
              />
            </details>
          </div>
        ) : (
          <div className="mt-1 px-3 py-2 rounded-md border bg-muted/50 text-sm font-mono">
            {scene.animationId}
          </div>
        )}
      </div>

      {/* Duration */}
      <div>
        <Label className="text-xs">Duration</Label>
        <div className="flex items-center gap-2 mt-1">
          <Slider
            min={500} max={30000} step={100}
            value={[scene.durationMs]}
            onValueChange={([v]) => onUpdate({ durationMs: v })}
            className="flex-1"
          />
          <span className="text-xs text-muted-foreground w-12 text-right tabular-nums">
            {formatTime(scene.durationMs)}
          </span>
        </div>
      </div>

      <Separator />

      {/* ── Transform ── */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-1.5">
            <Move className="h-3.5 w-3.5 text-muted-foreground" />
            <Label className="text-xs font-semibold">Transform</Label>
          </div>
          <Button variant="ghost" size="sm" className="h-6 text-[10px] px-2"
            onClick={() => onUpdate({ transform: { ...DEFAULT_TRANSFORM }, keyframes: undefined })}>
            <RotateCw className="h-3 w-3" /> Reset
          </Button>
        </div>
        <div className="space-y-3">
          {/* Scale */}
          <div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1">
                <Label className="text-xs text-muted-foreground">Scale</Label>
                <button
                  className="p-0 leading-none"
                  title={hasKeyframeAt('transform.scale')
                    ? 'Remove keyframe at playhead'
                    : `Add keyframe at ${(localProgress * 100).toFixed(0)}%`}
                  onClick={() =>
                    hasKeyframeAt('transform.scale')
                      ? removeTransformKeyframeAtPlayhead('transform.scale')
                      : addTransformKeyframe('transform.scale')
                  }
                >
                  <Diamond className={`h-3 w-3 ${
                    hasKeyframeAt('transform.scale')
                      ? 'text-yellow-500 fill-yellow-500'
                      : getTrackKeyframeCount(scene.keyframes, 'transform.scale') > 0
                        ? 'text-yellow-500/60'
                        : 'text-muted-foreground/40 hover:text-muted-foreground'
                  } transition-colors`} />
                </button>
              </div>
              <span className="text-xs text-muted-foreground tabular-nums">{Math.round(animatedTransform.scale * 100)}%</span>
            </div>
            <Slider min={0.1} max={3} step={0.05} value={[animatedTransform.scale]}
              onValueChange={([v]) => handleTransformChange('scale', v)} className="mt-1" />
          </div>
          {/* Position X */}
          <div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1">
                <Label className="text-xs text-muted-foreground">Position X</Label>
                <button
                  className="p-0 leading-none"
                  title={hasKeyframeAt('transform.offsetX')
                    ? 'Remove keyframe at playhead'
                    : `Add keyframe at ${(localProgress * 100).toFixed(0)}%`}
                  onClick={() =>
                    hasKeyframeAt('transform.offsetX')
                      ? removeTransformKeyframeAtPlayhead('transform.offsetX')
                      : addTransformKeyframe('transform.offsetX')
                  }
                >
                  <Diamond className={`h-3 w-3 ${
                    hasKeyframeAt('transform.offsetX')
                      ? 'text-yellow-500 fill-yellow-500'
                      : getTrackKeyframeCount(scene.keyframes, 'transform.offsetX') > 0
                        ? 'text-yellow-500/60'
                        : 'text-muted-foreground/40 hover:text-muted-foreground'
                  } transition-colors`} />
                </button>
              </div>
              <span className="text-xs text-muted-foreground tabular-nums">{Math.round(animatedTransform.offsetX)}px</span>
            </div>
            <Slider min={-960} max={960} step={1} value={[animatedTransform.offsetX]}
              onValueChange={([v]) => handleTransformChange('offsetX', v)} className="mt-1" />
          </div>
          {/* Position Y */}
          <div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1">
                <Label className="text-xs text-muted-foreground">Position Y</Label>
                <button
                  className="p-0 leading-none"
                  title={hasKeyframeAt('transform.offsetY')
                    ? 'Remove keyframe at playhead'
                    : `Add keyframe at ${(localProgress * 100).toFixed(0)}%`}
                  onClick={() =>
                    hasKeyframeAt('transform.offsetY')
                      ? removeTransformKeyframeAtPlayhead('transform.offsetY')
                      : addTransformKeyframe('transform.offsetY')
                  }
                >
                  <Diamond className={`h-3 w-3 ${
                    hasKeyframeAt('transform.offsetY')
                      ? 'text-yellow-500 fill-yellow-500'
                      : getTrackKeyframeCount(scene.keyframes, 'transform.offsetY') > 0
                        ? 'text-yellow-500/60'
                        : 'text-muted-foreground/40 hover:text-muted-foreground'
                  } transition-colors`} />
                </button>
              </div>
              <span className="text-xs text-muted-foreground tabular-nums">{Math.round(animatedTransform.offsetY)}px</span>
            </div>
            <Slider min={-540} max={540} step={1} value={[animatedTransform.offsetY]}
              onValueChange={([v]) => handleTransformChange('offsetY', v)} className="mt-1" />
          </div>
          {/* Opacity */}
          <div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1">
                <Label className="text-xs text-muted-foreground">Opacity</Label>
                <button
                  className="p-0 leading-none"
                  title={hasKeyframeAt('transform.opacity')
                    ? 'Remove keyframe at playhead'
                    : `Add keyframe at ${(localProgress * 100).toFixed(0)}%`}
                  onClick={() =>
                    hasKeyframeAt('transform.opacity')
                      ? removeTransformKeyframeAtPlayhead('transform.opacity')
                      : addTransformKeyframe('transform.opacity')
                  }
                >
                  <Diamond className={`h-3 w-3 ${
                    hasKeyframeAt('transform.opacity')
                      ? 'text-yellow-500 fill-yellow-500'
                      : getTrackKeyframeCount(scene.keyframes, 'transform.opacity') > 0
                        ? 'text-yellow-500/60'
                        : 'text-muted-foreground/40 hover:text-muted-foreground'
                  } transition-colors`} />
                </button>
              </div>
              <span className="text-xs text-muted-foreground tabular-nums">{Math.round(animatedTransform.opacity * 100)}%</span>
            </div>
            <Slider min={0} max={1} step={0.01} value={[animatedTransform.opacity]}
              onValueChange={([v]) => handleTransformChange('opacity', v)} className="mt-1" />
          </div>
        </div>
      </div>

      {/* Keyframe easing — shown when keyframes belonging to this scene are selected */}
      {selectedKfs.length > 0 && selectedKfs.some((k) => k.sceneId === scene.sceneId) && (() => {
        const sceneKfs = selectedKfs.filter((k) => k.sceneId === scene.sceneId);
        // Read the easing from the first selected keyframe (they may differ, show first)
        const firstKf = sceneKfs[0];
        const track = scene.keyframes?.[firstKf.trackKey];
        const kfData = track?.[firstKf.kfIdx];
        const currentEasing = kfData?.easing ?? 'easeInOut';
        const mixed = sceneKfs.some((k) => {
          const t = scene.keyframes?.[k.trackKey];
          return t?.[k.kfIdx] && (t[k.kfIdx].easing ?? 'easeInOut') !== currentEasing;
        });

        return (
          <div className="border rounded-lg p-3 bg-muted/30">
            <div className="flex items-center gap-1.5 mb-2">
              <Diamond className="h-3.5 w-3.5 text-yellow-500 fill-yellow-500" />
              <Label className="text-xs font-semibold">
                {sceneKfs.length === 1
                  ? `Keyframe — ${TRANSFORM_TRACK_LABELS[firstKf.trackKey]} at ${((kfData?.time ?? 0) * 100).toFixed(0)}%`
                  : `${sceneKfs.length} Keyframes Selected`}
              </Label>
            </div>
            <div className="space-y-1.5">
              <Label className="text-[10px] text-muted-foreground uppercase tracking-wider">Interpolation to Next</Label>
              <div className="flex flex-wrap gap-1">
                {EASING_OPTIONS.map(({ value, label }) => (
                  <button
                    key={value}
                    className={`px-2 py-1 text-[10px] rounded border transition-colors ${
                      !mixed && currentEasing === value
                        ? 'bg-primary text-primary-foreground border-primary'
                        : 'bg-muted/50 hover:bg-muted border-border'
                    }`}
                    onClick={() => {
                      // Apply easing to all selected keyframes
                      let newKfs = scene.keyframes;
                      for (const k of sceneKfs) {
                        const t = newKfs?.[k.trackKey];
                        if (!t || !t[k.kfIdx]) continue;
                        const updated = [...t];
                        updated[k.kfIdx] = { ...updated[k.kfIdx], easing: value };
                        newKfs = { ...newKfs, [k.trackKey]: updated };
                      }
                      onUpdate({ keyframes: newKfs });
                    }}
                  >
                    {label}
                  </button>
                ))}
              </div>
              {mixed && (
                <p className="text-[10px] text-muted-foreground italic">Mixed easings — click to unify</p>
              )}
            </div>
          </div>
        );
      })()}

      {/* Transparent background */}
      {animation?.background && (
        <div className="flex items-center justify-between">
          <Label className="text-xs">Transparent Background</Label>
          <Switch checked={scene.transparentBg ?? false}
            onCheckedChange={(checked) => onUpdate({ transparentBg: checked })} />
        </div>
      )}

      {/* Reverse playback */}
      <div className="flex items-center justify-between">
        <Label className="text-xs">Reverse Playback</Label>
        <Switch checked={scene.reversed ?? false}
          onCheckedChange={(checked) => onUpdate({ reversed: checked })} />
      </div>

      {/* ── Audio Source (for audio-reactive animations) ── */}
      {isAudioReactive && (
        <>
          <Separator />
          <div>
            <div className="flex items-center gap-1.5 mb-2">
              <Volume2 className="h-3.5 w-3.5 text-muted-foreground" />
              <Label className="text-xs font-semibold">Audio Source</Label>
            </div>
            <p className="text-[11px] text-muted-foreground mb-2">
              This animation reacts to audio. Pick a timeline audio clip to drive the visualizer.
            </p>
            <select
              className="w-full h-8 rounded-md border bg-background px-2 text-sm"
              value={scene.audioClipId ?? ''}
              onChange={(e) => {
                const val = e.target.value;
                onUpdate({ audioClipId: val === '' ? undefined : val });
              }}
            >
              <option value="">Auto-detect (overlapping clip)</option>
              <option value="none">None (no audio)</option>
              {audioClips.map((clip) => (
                <option key={clip.clipId} value={clip.clipId}>
                  {clip.label || clip.audioFilename || clip.clipId}
                </option>
              ))}
            </select>
            {scene.audioClipId && scene.audioClipId !== 'none' && (
              <p className="text-[10px] text-muted-foreground mt-1">
                Linked to: {audioClips.find((c) => c.clipId === scene.audioClipId)?.audioFilename ?? scene.audioClipId}
              </p>
            )}
          </div>
        </>
      )}

      <Separator />

      {/* ── Animation Parameters ── */}
      {hasParams && paramSchema && (
        <div>
          <div className="flex items-center justify-between mb-2">
            <Label className="text-xs font-semibold">Animation Parameters</Label>
            <Button variant="ghost" size="sm" className="h-6 text-[10px] px-2"
              onClick={() => onUpdate({ params: {} })}>
              <RotateCw className="h-3 w-3" /> Reset
            </Button>
          </div>
          <ParameterPanel schema={paramSchema} values={currentParams}
            onChange={handleParamChange} title="" />
        </div>
      )}

      {!hasParams && (
        <div className="text-xs text-muted-foreground py-2">
          This animation has no configurable parameters.
        </div>
      )}

      <Separator />

      {/* ── Transition ── */}
      <div>
        <Label className="text-xs font-semibold">Transition to Next</Label>
        <div className="mt-2 space-y-2">
          <div className="flex gap-1.5 flex-wrap">
            {TRANSITION_TYPES.map((tt) => (
              <Button key={tt.value}
                variant={(scene.transition?.type ?? 'cut') === tt.value ? 'default' : 'outline'}
                size="sm" className="h-7 text-xs"
                onClick={() => onUpdate({
                  transition: {
                    type: tt.value,
                    durationMs: scene.transition?.durationMs ?? (tt.value === 'cut' ? 0 : 500),
                  },
                })}>
                {tt.label}
              </Button>
            ))}
          </div>
          {scene.transition?.type && scene.transition.type !== 'cut' && (
            <div>
              <Label className="text-xs text-muted-foreground">Transition Duration</Label>
              <div className="flex items-center gap-2 mt-1">
                <Slider min={100} max={3000} step={50}
                  value={[scene.transition?.durationMs ?? 500]}
                  onValueChange={([v]) => onUpdate({
                    transition: { type: scene.transition?.type ?? 'fade', durationMs: v },
                  })}
                  className="flex-1" />
                <span className="text-xs text-muted-foreground w-12 text-right tabular-nums">
                  {formatTime(scene.transition?.durationMs ?? 500)}
                </span>
              </div>
            </div>
          )}
        </div>
      </div>

      <Separator />

      {/* ── Actions ── */}
      <div className="space-y-2">
        <Button variant="outline" size="sm" className="w-full" onClick={onDuplicate}>
          <Copy className="h-3.5 w-3.5" /> Duplicate Scene
        </Button>
        <Button variant="destructive" size="sm" className="w-full" onClick={onRemove}>
          <Trash2 className="h-3.5 w-3.5" /> Remove Scene
        </Button>
      </div>
    </div>
  );
}

// ─── Audio Clip Settings Sidebar ──────────────────────────────────────────────

function AudioClipSettingsSidebar({
  clip,
  onUpdate,
  onRemove,
  onDuplicate,
}: {
  clip: AudioClipEntry;
  onUpdate: (updates: Partial<AudioClipEntry>) => void;
  onRemove: () => void;
  onDuplicate: () => void;
}) {
  const effectiveDuration = clip.trimEndMs - clip.trimStartMs;
  // Use fullDurationMs if available; fall back to trimEndMs; guarantee at least 1000ms for usability
  const maxTrim = Math.max(clip.fullDurationMs, clip.trimEndMs, 1000);

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center gap-2">
        <Music className="h-4 w-4 text-muted-foreground" />
        <h3 className="font-semibold text-sm">Audio Clip Settings</h3>
      </div>

      {/* Label */}
      <div>
        <Label className="text-xs">Label</Label>
        <Input
          value={clip.label || ''}
          onChange={(e) => onUpdate({ label: e.target.value })}
          className="h-8 text-sm mt-1"
          placeholder="Audio clip name..."
        />
      </div>

      {/* Filename */}
      <div>
        <Label className="text-xs">File</Label>
        <div className="mt-1 px-3 py-2 rounded-md border bg-muted/50 text-xs font-mono truncate">
          {clip.audioFilename}
        </div>
      </div>

      {/* Volume */}
      <div>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <Volume2 className="h-3.5 w-3.5 text-muted-foreground" />
            <Label className="text-xs">Volume</Label>
          </div>
          <span className="text-xs text-muted-foreground tabular-nums">{Math.round(clip.volume * 100)}%</span>
        </div>
        <Slider
          min={0} max={1} step={0.01}
          value={[clip.volume]}
          onValueChange={([v]) => onUpdate({ volume: v })}
          className="mt-1"
        />
      </div>

      {/* Fade In / Fade Out */}
      <div>
        <Label className="text-xs font-semibold">Fade</Label>
        <p className="text-[10px] text-muted-foreground mt-0.5 mb-2">
          Smooth volume ramp at the start and end of the clip.
        </p>
        <div className="space-y-3">
          <div>
            <div className="flex justify-between">
              <Label className="text-xs text-muted-foreground">Fade In</Label>
              <span className="text-xs text-muted-foreground tabular-nums">{formatTime(clip.fadeInMs ?? 0)}</span>
            </div>
            <Slider
              min={0} max={effectiveDuration} step={50}
              value={[Math.min(clip.fadeInMs ?? 0, effectiveDuration)]}
              onValueChange={([v]) => onUpdate({ fadeInMs: v })}
              className="mt-1"
            />
          </div>
          <div>
            <div className="flex justify-between">
              <Label className="text-xs text-muted-foreground">Fade Out</Label>
              <span className="text-xs text-muted-foreground tabular-nums">{formatTime(clip.fadeOutMs ?? 0)}</span>
            </div>
            <Slider
              min={0} max={effectiveDuration} step={50}
              value={[Math.min(clip.fadeOutMs ?? 0, effectiveDuration)]}
              onValueChange={([v]) => onUpdate({ fadeOutMs: v })}
              className="mt-1"
            />
          </div>
        </div>
      </div>

      <Separator />

      {/* Trim */}
      <div>
        <Label className="text-xs font-semibold">Trim</Label>
        <p className="text-[10px] text-muted-foreground mt-0.5 mb-2">
          Adjust the start and end points of the audio clip.
        </p>
        <div className="space-y-3">
          <div>
            <div className="flex items-center justify-between">
              <Label className="text-xs text-muted-foreground">Trim Start</Label>
              <span className="text-xs text-muted-foreground tabular-nums">{formatTime(clip.trimStartMs)}</span>
            </div>
            <Slider
              min={0} max={Math.max(100, maxTrim - 200)} step={100}
              value={[Math.min(clip.trimStartMs, maxTrim - 200)]}
              onValueChange={([v]) => onUpdate({ trimStartMs: v })}
              className="mt-1"
            />
          </div>
          <div>
            <div className="flex items-center justify-between">
              <Label className="text-xs text-muted-foreground">Trim End</Label>
              <span className="text-xs text-muted-foreground tabular-nums">{formatTime(clip.trimEndMs || maxTrim)}</span>
            </div>
            <Slider
              min={Math.max(200, clip.trimStartMs + 200)} max={maxTrim} step={100}
              value={[Math.max(clip.trimEndMs || maxTrim, clip.trimStartMs + 200)]}
              onValueChange={([v]) => onUpdate({ trimEndMs: v })}
              className="mt-1"
            />
          </div>
        </div>
        <div className="text-[10px] text-muted-foreground mt-2 flex justify-between">
          <span>Effective duration</span>
          <span className="tabular-nums">{formatTime(effectiveDuration)}</span>
        </div>
      </div>

      <Separator />

      {/* Timeline position */}
      <div>
        <div className="flex items-center justify-between">
          <Label className="text-xs">Start Position</Label>
          <span className="text-xs text-muted-foreground tabular-nums">{formatTime(clip.startMs)}</span>
        </div>
        <Slider
          min={0} max={Math.max(30000, clip.startMs + effectiveDuration)} step={100}
          value={[clip.startMs]}
          onValueChange={([v]) => onUpdate({ startMs: v })}
          className="mt-1"
        />
      </div>

      <Separator />

      {/* Actions */}
      <div className="space-y-2">
        <Button variant="outline" size="sm" className="w-full" onClick={onDuplicate}>
          <Copy className="h-3.5 w-3.5" /> Duplicate Audio
        </Button>
        <Button variant="destructive" size="sm" className="w-full" onClick={onRemove}>
          <Trash2 className="h-3.5 w-3.5" /> Remove Audio Clip
        </Button>
      </div>
    </div>
  );
}

// ─── Timeline Component ──────────────────────────────────────────────────────

const TIMELINE_BASE_PX_PER_SEC = 80; // base pixels per second (zoom 1×)
const TIMELINE_MIN_WIDTH = 800;
const TIMELINE_LEFT_PAD = 12; // left padding so playhead head isn't clipped at t=0
const TIMELINE_MIN_ZOOM = 0.25;
const TIMELINE_MAX_ZOOM = 10;
const TIMELINE_DEFAULT_ZOOM = 1;
const SNAP_THRESHOLD_PX = 8; // snap to targets within this many pixels

/** Playhead SVG component — uses foreground color for theme adaptability */
function PlayheadSvg({ height }: { height: number }) {
  return (
    <svg
      width="10"
      height={height}
      viewBox={`0 0 10 ${height}`}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="pointer-events-none text-foreground"
    >
      <path
        d="M0 2C0 0.895431 0.895431 0 2 0H8C9.10457 0 10 0.895431 10 2V8.03183C10 8.5515 9.79773 9.05076 9.43602 9.42389L6.43602 12.5186C5.65025 13.3292 4.34975 13.3292 3.56398 12.5186L0.563978 9.42389C0.202271 9.05076 0 8.5515 0 8.03183V2Z"
        fill="currentColor"
      />
      <path d={`M5 13L4.99999 ${height}`} stroke="currentColor" />
    </svg>
  );
}

type SelectedKf = { sceneId: string; trackKey: TransformTrackKey; kfIdx: number };

function Timeline({
  sequence,
  timings,
  totalDurationMs,
  currentTimeMs,
  playing,
  pingPong,
  selectedSceneIds,
  selectedAudioClipId,
  selectedKfs,
  onSetSelectedKfs,
  onSelectScene,
  onSelectAudioClip,
  onMarqueeSelect,
  onSeek,
  onTogglePlay,
  onRestart,
  onTogglePingPong,
  onOpenPicker,
  onOpenAudioPicker,
  onUpdateScene,
  onUpdateAudioClip,
  onDropOnLane,
  audioWaveforms,
}: {
  sequence: Sequence;
  timings: { startMs: number; endMs: number }[];
  totalDurationMs: number;
  currentTimeMs: number;
  playing: boolean;
  pingPong: boolean;
  selectedSceneIds: Set<string>;
  selectedAudioClipId: string | null;
  selectedKfs: SelectedKf[];
  onSetSelectedKfs: React.Dispatch<React.SetStateAction<SelectedKf[]>>;
  onSelectScene: (id: string | null, additive?: boolean) => void;
  onSelectAudioClip: (id: string | null) => void;
  onMarqueeSelect?: (ids: string[], additive: boolean) => void;
  onSeek: (ms: number) => void;
  onTogglePlay: () => void;
  onRestart: () => void;
  onTogglePingPong: () => void;
  onOpenPicker: () => void;
  onOpenAudioPicker: () => void;
  onUpdateScene: (sceneId: string, updates: Partial<SceneEntry>) => void;
  onUpdateAudioClip: (clipId: string, updates: Partial<AudioClipEntry>) => void;
  onDropOnLane?: (sceneId: string, targetLane: number, targetTimeMs: number) => void;
  audioWaveforms: Map<string, number[]>;
}) {
  const timelineRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(0);
  const [containerHeight, setContainerHeight] = useState(0);
  const sequenceRef = useRef(sequence);
  const selectedKfsRef = useRef(selectedKfs);
  selectedKfsRef.current = selectedKfs;
  const onDropOnLaneRef = useRef(onDropOnLane);
  const xToMsRef = useRef<(clientX: number, containerEl: HTMLElement) => number>(() => 0);
  const [trimming, setTrimming] = useState<{
    sceneId: string; edge: 'left' | 'right'; startX: number; startDuration: number; startTrimStartMs: number;
  } | null>(null);
  const [audioTrimming, setAudioTrimming] = useState<{
    clipId: string; edge: 'left' | 'right'; startX: number;
    startTrimStart: number; startTrimEnd: number; startStartMs: number;
  } | null>(null);
  const audioDragRef = useRef<{
    clipId: string; grabOffsetMs: number; startMouseX: number; startMouseY: number;
    originalLane: number; originalStartMs: number; active: boolean;
    currentMs: number; currentLane: number;
  } | null>(null);
  const audioDragDidMoveRef = useRef(false);
  const [audioDragActive, setAudioDragActive] = useState(false);
  const [seekDragging, setSeekDragging] = useState(false);
  const [timelineZoom, setTimelineZoom] = useState(TIMELINE_DEFAULT_ZOOM);

  // ── Keyframe track expansion state ──
  const [expandedKeyframeScenes, setExpandedKeyframeScenes] = useState<Set<string>>(new Set());
  const toggleKeyframeExpansion = useCallback((sceneId: string) => {
    setExpandedKeyframeScenes((prev) => {
      const next = new Set(prev);
      if (next.has(sceneId)) next.delete(sceneId);
      else next.add(sceneId);
      return next;
    });
  }, []);

  // ── Selected keyframe helpers ──
  const isKfSelected = useCallback(
    (sceneId: string, trackKey: TransformTrackKey, kfIdx: number) =>
      selectedKfs.some((k) => k.sceneId === sceneId && k.trackKey === trackKey && k.kfIdx === kfIdx),
    [selectedKfs]
  );

  // ── Keyframe drag state ──
  const kfDragRef = useRef<{
    sceneId: string;
    trackKey: TransformTrackKey;
    kfIdx: number;
    originalTime: number;
    startX: number;
    clipLeft: number;
    clipWidth: number;
    /** Original times of ALL selected keyframes when drag started — prevents accumulation */
    origTimes: Map<string, number>; // key: "sceneId|trackKey|kfIdx" → original time
  } | null>(null);
  const [kfDragActive, setKfDragActive] = useState(false);

  // ── Keyframe marquee selection ──
  const kfMarqueeRef = useRef<{
    startX: number;
    startY: number;
    scrollEl: HTMLElement;
  } | null>(null);
  const [kfMarqueeActive, setKfMarqueeActive] = useState(false);
  const [kfMarqueeRect, setKfMarqueeRect] = useState<{ x: number; y: number; w: number; h: number } | null>(null);

  // ── Custom clip drag state (replaces HTML5 DnD for precision) ──
  // All mutable drag data lives in a ref so the mousemove effect stays stable.
  // A boolean state triggers the effect; a counter forces re-renders for the ghost.
  const clipDragRef = useRef<{
    // Init (set on mousedown, don't change)
    sceneId: string;
    sceneIdx: number;
    grabOffsetMs: number; // where inside the clip the user clicked
    startMouseX: number;
    startMouseY: number;
    originalLane: number;
    clipDurationMs: number;
    // Current (updated every mousemove)
    currentMs: number;
    currentLane: number;
    snapLineMs: number | null;
    active: boolean; // true after mouse moves past threshold
  } | null>(null);

  const [clipDragActive, setClipDragActive] = useState(false);
  const [, forceClipDragRender] = useState(0);

  // Convenience read for rendering (ref is source of truth)
  const clipDragRender = clipDragRef.current;
  const isClipDragging = clipDragActive && !!clipDragRender?.active;

  sequenceRef.current = sequence;
  onDropOnLaneRef.current = onDropOnLane;

  // Minimum lanes: only include lanes actually used. New lanes created on add/drop when needed.
  const lanes = useMemo(() => {
    const set = new Set<number>();
    for (const s of sequence.scenes) set.add(s.lane ?? 0);
    for (const c of sequence.audioClips || []) set.add(c.lane);
    if (set.size === 0) return [0]; // empty timeline: one lane for drops
    return Array.from(set).sort((a, b) => b - a);
  }, [sequence.scenes, sequence.audioClips]);

  // Extra height for expanded keyframe tracks: 22px header per track + 22px diamond strip if has keyframes
  const expandedKeyframeHeight = useMemo(() => {
    let extra = 0;
    for (const sceneId of expandedKeyframeScenes) {
      const scene = sequence.scenes.find((s) => s.sceneId === sceneId);
      if (!scene) continue;
      for (const trackKey of TRANSFORM_TRACK_KEYS) {
        extra += 22; // header row always visible
        if ((scene.keyframes?.[trackKey]?.length ?? 0) > 0) {
          extra += 22; // diamond row when track has keyframes
        }
      }
    }
    return extra;
  }, [expandedKeyframeScenes, sequence.scenes]);

  const trackContentHeight = Math.max(100, 24 + lanes.length * 40 + expandedKeyframeHeight);

  // Map client Y to lane when dragging in empty region (no lane row under cursor)
  const laneFromClientY = useCallback((clientY: number, scrollEl: HTMLElement): number => {
    const rect = scrollEl.getBoundingClientRect();
    const mouseY = clientY - rect.top + scrollEl.scrollTop;
    const RULER_H = 24;
    const PAD_TOP = 4;
    // Account for top spacer when lanes are centered (container taller than content)
    const extraHeight = Math.max(0, (containerHeight || 0) - trackContentHeight);
    const topSpacerHeight = extraHeight / 2;
    let y = RULER_H + topSpacerHeight + PAD_TOP;
    for (let i = 0; i < lanes.length; i++) {
      const h = lanes[i] === 0 ? 36 : 28;
      if (mouseY >= y && mouseY < y + h) return lanes[i];
      y += h + 2;
    }
    if (mouseY < RULER_H + topSpacerHeight + PAD_TOP) return lanes.length > 0 ? Math.max(...lanes) + 1 : 1;
    return lanes.length > 0 ? Math.min(...lanes) - 1 : -1;
  }, [lanes, containerHeight, trackContentHeight]);

  // Audio clips grouped by lane
  const audioClipsByLane = useMemo(() => {
    const map = new Map<number, AudioClipEntry[]>();
    for (const clip of (sequence.audioClips || [])) {
      if (!map.has(clip.lane)) map.set(clip.lane, []);
      map.get(clip.lane)!.push(clip);
    }
    return map;
  }, [sequence.audioClips]);

  const scenesByLane = useMemo(() => {
    const map = new Map<number, { scene: SceneEntry; idx: number; timing: { startMs: number; endMs: number } }[]>();
    sequence.scenes.forEach((scene, idx) => {
      const lane = scene.lane ?? 0;
      const timing = timings[idx];
      if (!timing) return;
      if (!map.has(lane)) map.set(lane, []);
      map.get(lane)!.push({ scene, idx, timing });
    });
    return map;
  }, [sequence.scenes, timings]);

  // Zoom-aware scale: pxPerSec changes with timeline zoom level.
  const pxPerSec = TIMELINE_BASE_PX_PER_SEC * timelineZoom;
  const pxPerMs = pxPerSec / 1000;
  const contentWidth = Math.max(TIMELINE_MIN_WIDTH, totalDurationMs * pxPerMs);
  // Extend track to fill visible container so timestamps are never cut off on the right
  const trackWidth = Math.max(contentWidth, containerWidth);
  const frameDurationMs = 1000 / (sequence.fps || 60);

  // Time ruler ticks — extend across full track width so markers are visible throughout
  const totalSec = Math.max(totalDurationMs / 1000, 1);
  const rulerTicks = useMemo(() => {
    // Choose a "nice" major step so ticks are readable at any zoom
    const niceSteps = [0.01, 0.02, 0.05, 0.1, 0.2, 0.5, 1, 2, 5, 10, 15, 30, 60];
    const idealStepPx = 100; // target px between major ticks
    const rawStep = idealStepPx / pxPerSec;
    const step = niceSteps.find((s) => s >= rawStep) ?? 60;
    // Sub-divisions: split each major interval into minor ticks
    const subCount = step >= 10 ? 5 : step >= 1 ? 5 : step >= 0.1 ? 5 : 2;
    const subStep = step / subCount;
    // End ticks when we reach the full track width (in seconds)
    const endSec = Math.max(totalSec + step, trackWidth / pxPerSec);
    const ticks: { sec: number; major: boolean }[] = [];
    for (let s = 0; s <= endSec; s = +(s + subStep).toFixed(6)) {
      // A tick is major when it falls on the major step grid
      const isMajor = Math.abs(s % step) < 1e-9 || Math.abs(s % step - step) < 1e-9;
      ticks.push({ sec: s, major: isMajor });
    }
    return ticks;
  }, [totalSec, pxPerSec, trackWidth]);

  // Playhead position — absolute px
  const playheadX = TIMELINE_LEFT_PAD + currentTimeMs * pxPerMs;

  // Convert a screen x (relative to the scrollable container) into a time ms.
  // When zoomed in beyond 2× we snap to frame boundaries for precision.
  const xToMs = useCallback((clientX: number, containerEl: HTMLElement) => {
    const rect = containerEl.getBoundingClientRect();
    const x = clientX - rect.left + containerEl.scrollLeft - TIMELINE_LEFT_PAD;
    let ms = Math.max(0, Math.min(totalDurationMs, x / pxPerMs));
    // Snap to frame boundaries when zoomed in enough that frames are distinguishable
    if (timelineZoom >= 2) {
      ms = Math.round(ms / frameDurationMs) * frameDurationMs;
    }
    return ms;
  }, [totalDurationMs, pxPerMs, timelineZoom, frameDurationMs]);
  xToMsRef.current = xToMs;

  // Snap seek position to nearby keyframe absolute times
  const snapSeekToKeyframes = useCallback((rawMs: number): number => {
    const thresholdMs = SNAP_THRESHOLD_PX / pxPerMs;
    let bestMs = rawMs;
    let bestDist = thresholdMs;
    const tms = timings;
    for (let i = 0; i < sequence.scenes.length; i++) {
      const scene = sequence.scenes[i];
      if (!scene.keyframes || !tms[i]) continue;
      for (const trackKey of TRANSFORM_TRACK_KEYS) {
        const track = scene.keyframes[trackKey];
        if (!track) continue;
        for (const kf of track) {
          const kfMs = tms[i].startMs + kf.time * scene.durationMs;
          const dist = Math.abs(rawMs - kfMs);
          if (dist < bestDist) {
            bestDist = dist;
            bestMs = kfMs;
          }
        }
      }
    }
    return bestMs;
  }, [pxPerMs, sequence.scenes, timings]);
  const snapSeekRef = useRef(snapSeekToKeyframes);
  snapSeekRef.current = snapSeekToKeyframes;

  // ── Refs for snap logic (so the mousemove effect doesn't need re-attachment) ──
  const pxPerMsRef = useRef(pxPerMs);
  pxPerMsRef.current = pxPerMs;
  const frameDurationMsRef = useRef(frameDurationMs);
  frameDurationMsRef.current = frameDurationMs;
  const currentTimeMsRef = useRef(currentTimeMs);
  currentTimeMsRef.current = currentTimeMs;
  const timingsRef = useRef(timings);
  timingsRef.current = timings;

  /** Compute all snap targets (in ms) excluding the clip being dragged */
  const getSnapTargets = (excludeSceneId: string): number[] => {
    const targets: number[] = [];
    const seq = sequenceRef.current;
    const tms = timingsRef.current;
    // Playhead
    targets.push(currentTimeMsRef.current);
    // Scene clip starts and ends
    for (let i = 0; i < tms.length; i++) {
      const scene = seq.scenes[i];
      if (!scene || scene.sceneId === excludeSceneId) continue;
      targets.push(tms[i].startMs);
      targets.push(tms[i].endMs);
    }
    // Audio clip starts and ends
    for (const clip of (seq.audioClips || [])) {
      targets.push(clip.startMs);
      targets.push(clip.startMs + (clip.trimEndMs - clip.trimStartMs));
    }
    return targets;
  };

  /**
   * Snap a clip's left edge (startMs) to the nearest target.
   * Checks both left and right edges of the clip against all targets.
   * Falls back to frame-boundary snapping if no target is close enough.
   */
  const snapClipPosition = (
    rawMs: number,
    clipDurationMs: number,
    excludeSceneId: string,
  ): { snappedMs: number; snapLineMs: number | null } => {
    const targets = getSnapTargets(excludeSceneId);
    const thresholdMs = SNAP_THRESHOLD_PX / pxPerMsRef.current;

    let bestDist = Infinity;
    let bestMs = rawMs;
    let snapLineMs: number | null = null;

    // Check clip LEFT edge against all targets
    for (const target of targets) {
      const dist = Math.abs(rawMs - target);
      if (dist < thresholdMs && dist < bestDist) {
        bestDist = dist;
        bestMs = target;
        snapLineMs = target;
      }
    }
    // Check clip RIGHT edge against all targets
    const endMs = rawMs + clipDurationMs;
    for (const target of targets) {
      const dist = Math.abs(endMs - target);
      if (dist < thresholdMs && dist < bestDist) {
        bestDist = dist;
        bestMs = target - clipDurationMs;
        snapLineMs = target;
      }
    }
    // Fallback: snap to nearest frame boundary
    if (snapLineMs === null) {
      bestMs = Math.round(rawMs / frameDurationMsRef.current) * frameDurationMsRef.current;
    }

    return { snappedMs: Math.max(0, bestMs), snapLineMs };
  };

  // ── Track container size so ruler/track extend to fill visible area ─────
  useEffect(() => {
    const el = timelineRef.current;
    if (!el) return;
    const update = () => {
      setContainerWidth(el.clientWidth);
      setContainerHeight(el.clientHeight);
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // ── Pinch / Ctrl+wheel zoom — non-passive so we can preventDefault ─────
  // Ref to hold the latest zoom so the non-passive listener closure always
  // reads the current value without needing to re-attach on every change.
  const timelineZoomRef = useRef(timelineZoom);
  timelineZoomRef.current = timelineZoom;

  useEffect(() => {
    const el = timelineRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      if (!e.ctrlKey && !e.metaKey) return; // let default horizontal scroll through
      e.preventDefault();

      const oldZoom = timelineZoomRef.current;
      const factor = e.deltaY < 0 ? 1.15 : 1 / 1.15;
      const newZoom = Math.min(TIMELINE_MAX_ZOOM, Math.max(TIMELINE_MIN_ZOOM, oldZoom * factor));

      // Keep the time under the cursor fixed by adjusting scrollLeft.
      const rect = el.getBoundingClientRect();
      const cursorX = e.clientX - rect.left; // px from container left edge
      const oldPxPerMs = (TIMELINE_BASE_PX_PER_SEC * oldZoom) / 1000;
      const newPxPerMs = (TIMELINE_BASE_PX_PER_SEC * newZoom) / 1000;
      const timeAtCursor = (cursorX + el.scrollLeft - TIMELINE_LEFT_PAD) / oldPxPerMs;
      const newScrollLeft = timeAtCursor * newPxPerMs - cursorX + TIMELINE_LEFT_PAD;

      setTimelineZoom(newZoom);
      // Apply scroll in a microtask so the DOM has the new trackWidth
      requestAnimationFrame(() => { el.scrollLeft = Math.max(0, newScrollLeft); });
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, []); // stable — reads zoom from ref

  // ── Custom clip drag — mousedown/mousemove/mouseup for precise positioning ──
  // Effect only runs on drag start/end (stable boolean dep).
  useEffect(() => {
    if (!clipDragActive) return;

    const DRAG_THRESHOLD = 4; // px before activating drag
    let rafId: number | null = null;

    const handleMouseMove = (e: MouseEvent) => {
      const d = clipDragRef.current;
      if (!d) return;
      const containerEl = timelineRef.current;
      if (!containerEl) return;

      const dx = e.clientX - d.startMouseX;
      const dy = e.clientY - d.startMouseY;
      if (!d.active && Math.hypot(dx, dy) < DRAG_THRESHOLD) return;

      // Compute raw time from cursor position
      const rect = containerEl.getBoundingClientRect();
      const mouseXInContainer = e.clientX - rect.left + containerEl.scrollLeft;
      const rawMs = (mouseXInContainer - TIMELINE_LEFT_PAD) / pxPerMsRef.current - d.grabOffsetMs;

      // Detect lane under cursor; if in empty region, compute from Y to support drop-on-new-lane
      const target = document.elementFromPoint(e.clientX, e.clientY);
      const laneEl = target?.closest('[data-lane]');
      const targetLane = laneEl ? Number(laneEl.getAttribute('data-lane')) : laneFromClientY(e.clientY, containerEl);

      // Apply snapping
      const { snappedMs, snapLineMs } = snapClipPosition(
        Math.max(0, rawMs),
        d.clipDurationMs,
        d.sceneId,
      );

      // Update ref (source of truth)
      d.currentMs = snappedMs;
      d.currentLane = targetLane;
      d.snapLineMs = snapLineMs;
      d.active = true;

      // Batch render updates via rAF for smoothness
      if (rafId === null) {
        rafId = requestAnimationFrame(() => {
          rafId = null;
          forceClipDragRender((n) => n + 1);
        });
      }
    };

    const handleMouseUp = () => {
      const d = clipDragRef.current;
      if (d?.active) {
        onDropOnLaneRef.current?.(d.sceneId, d.currentLane, d.currentMs);
      }
      clipDragRef.current = null;
      setClipDragActive(false);
      forceClipDragRender((n) => n + 1);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      if (rafId !== null) cancelAnimationFrame(rafId);
    };
  }, [clipDragActive, laneFromClientY]);

  // Handle seek by clicking on ruler (snaps to keyframe positions)
  const handleRulerClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const ms = xToMs(e.clientX, e.currentTarget.closest('[data-timeline-scroll]') as HTMLElement || e.currentTarget);
    onSeek(snapSeekToKeyframes(ms));
    onSetSelectedKfs([]);
  }, [xToMs, onSeek, snapSeekToKeyframes, onSetSelectedKfs]);

  // Seek drag (with keyframe snap)
  useEffect(() => {
    if (!seekDragging) return;
    const handleMove = (e: MouseEvent) => {
      if (!timelineRef.current) return;
      const ms = xToMsRef.current(e.clientX, timelineRef.current);
      onSeek(snapSeekRef.current(ms));
    };
    const handleUp = () => setSeekDragging(false);
    window.addEventListener('mousemove', handleMove);
    window.addEventListener('mouseup', handleUp);
    return () => {
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('mouseup', handleUp);
    };
  }, [seekDragging, onSeek]);

  // ── Keyframe diamond drag (moves all selected keyframes together) ──
  useEffect(() => {
    if (!kfDragActive) return;
    const handleMouseMove = (e: MouseEvent) => {
      const d = kfDragRef.current;
      if (!d) return;
      const dx = e.clientX - d.startX;
      const timeDelta = dx / d.clipWidth;
      const seq = sequenceRef.current;
      const kfs = selectedKfsRef.current.length > 0
        ? selectedKfsRef.current
        : [{ sceneId: d.sceneId, trackKey: d.trackKey, kfIdx: d.kfIdx }];

      // Compute playhead local progress for snap-to-playhead per scene
      const tms = timingsRef.current;
      const playheadSnapMap = new Map<string, number>(); // sceneId → playhead local progress (0-1)
      for (let i = 0; i < seq.scenes.length; i++) {
        const sc = seq.scenes[i];
        const t = tms[i];
        if (!t || sc.durationMs <= 0) continue;
        const localMs = Math.max(0, Math.min(currentTimeMsRef.current - t.startMs, sc.durationMs));
        playheadSnapMap.set(sc.sceneId, localMs / sc.durationMs);
      }
      const kfSnapThreshold = SNAP_THRESHOLD_PX / d.clipWidth; // threshold in normalized time

      // Build updated scenes with all selected keyframes moved
      const updatedSceneMap = new Map<string, SceneEntry>();
      for (const kf of kfs) {
        let scene = updatedSceneMap.get(kf.sceneId) || seq.scenes.find((s) => s.sceneId === kf.sceneId);
        if (!scene?.keyframes) continue;
        const track = scene.keyframes[kf.trackKey];
        if (!track || !track[kf.kfIdx]) continue;
        // Use ORIGINAL time from drag start — prevents accumulation
        const origKey = `${kf.sceneId}|${kf.trackKey}|${kf.kfIdx}`;
        const origTime = d.origTimes.get(origKey);
        if (origTime === undefined) continue;
        let newTime = Math.max(0, Math.min(1, origTime + timeDelta));
        // Snap to playhead position
        const playheadProgress = playheadSnapMap.get(kf.sceneId);
        if (playheadProgress !== undefined && Math.abs(newTime - playheadProgress) < kfSnapThreshold) {
          newTime = playheadProgress;
        }
        const newTrack = [...track];
        newTrack[kf.kfIdx] = { ...newTrack[kf.kfIdx], time: newTime };
        const updatedScene = { ...scene, keyframes: { ...scene.keyframes, [kf.trackKey]: newTrack } };
        updatedSceneMap.set(kf.sceneId, updatedScene);
      }

      // Update scenes WITHOUT sorting during drag (sort on mouseup to avoid index confusion)
      for (const [sceneId, scene] of updatedSceneMap) {
        onUpdateScene(sceneId, { keyframes: scene.keyframes });
      }
    };
    const handleMouseUp = () => {
      // Sort keyframe tracks after drag ends and update selection indices
      const d = kfDragRef.current;
      if (d) {
        const seq = sequenceRef.current;
        const kfs = selectedKfsRef.current.length > 0
          ? selectedKfsRef.current
          : [{ sceneId: d.sceneId, trackKey: d.trackKey, kfIdx: d.kfIdx }];
        const sceneIds = new Set(kfs.map((k) => k.sceneId));
        const newSelectedKfs: SelectedKf[] = [];
        for (const sceneId of sceneIds) {
          const scene = seq.scenes.find((s) => s.sceneId === sceneId);
          if (!scene?.keyframes) continue;
          const updatedKeyframes = { ...scene.keyframes };
          for (const trackKey of TRANSFORM_TRACK_KEYS) {
            const track = updatedKeyframes[trackKey];
            if (!track) continue;
            const timesBeforeSort = track.map((kf) => kf.time);
            const sorted = [...track].sort((a, b) => a.time - b.time);
            updatedKeyframes[trackKey] = sorted;
            // Re-map selected kf indices after sort
            for (const selKf of kfs) {
              if (selKf.sceneId !== sceneId || selKf.trackKey !== trackKey) continue;
              const targetTime = timesBeforeSort[selKf.kfIdx];
              const newIdx = sorted.findIndex((kf) => Math.abs(kf.time - targetTime) < 0.0001);
              if (newIdx >= 0) {
                newSelectedKfs.push({ sceneId, trackKey, kfIdx: newIdx });
              }
            }
          }
          onUpdateScene(sceneId, { keyframes: updatedKeyframes });
        }
        if (newSelectedKfs.length > 0) {
          onSetSelectedKfs(newSelectedKfs);
        }
      }
      kfDragRef.current = null;
      setKfDragActive(false);
    };
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [kfDragActive, onUpdateScene, onSetSelectedKfs]);

  // (Delete / Escape for selected keyframes is now handled by the Composer-level keyboard handler)

  // ── Keyframe marquee selection drag ──
  useEffect(() => {
    if (!kfMarqueeActive) return;
    const handleMouseMove = (e: MouseEvent) => {
      const m = kfMarqueeRef.current;
      if (!m) return;
      const scrollRect = m.scrollEl.getBoundingClientRect();
      const x1 = Math.min(m.startX, e.clientX) - scrollRect.left + m.scrollEl.scrollLeft;
      const y1 = Math.min(m.startY, e.clientY) - scrollRect.top + m.scrollEl.scrollTop;
      const x2 = Math.max(m.startX, e.clientX) - scrollRect.left + m.scrollEl.scrollLeft;
      const y2 = Math.max(m.startY, e.clientY) - scrollRect.top + m.scrollEl.scrollTop;
      setKfMarqueeRect({ x: x1, y: y1, w: x2 - x1, h: y2 - y1 });
    };
    const handleMouseUp = (e: MouseEvent) => {
      const m = kfMarqueeRef.current;
      if (!m) { setKfMarqueeActive(false); setKfMarqueeRect(null); return; }
      // Find all keyframe diamonds within the marquee rectangle
      const diamonds = m.scrollEl.querySelectorAll('[data-kf-diamond]');
      const x1 = Math.min(m.startX, e.clientX);
      const y1 = Math.min(m.startY, e.clientY);
      const x2 = Math.max(m.startX, e.clientX);
      const y2 = Math.max(m.startY, e.clientY);

      const hits: SelectedKf[] = [];
      diamonds.forEach((el) => {
        const rect = el.getBoundingClientRect();
        const cx = rect.left + rect.width / 2;
        const cy = rect.top + rect.height / 2;
        if (cx >= x1 && cx <= x2 && cy >= y1 && cy <= y2) {
          const sceneId = el.getAttribute('data-kf-scene') || '';
          const trackKey = el.getAttribute('data-kf-track') as TransformTrackKey;
          const kfIdx = parseInt(el.getAttribute('data-kf-idx') || '0', 10);
          if (sceneId && trackKey) {
            hits.push({ sceneId, trackKey, kfIdx });
          }
        }
      });

      if (e.shiftKey) {
        onSetSelectedKfs((prev) => {
          const combined = [...prev];
          for (const h of hits) {
            if (!combined.some((k) => k.sceneId === h.sceneId && k.trackKey === h.trackKey && k.kfIdx === h.kfIdx)) {
              combined.push(h);
            }
          }
          return combined;
        });
      } else {
        onSetSelectedKfs(hits);
      }

      kfMarqueeRef.current = null;
      setKfMarqueeActive(false);
      setKfMarqueeRect(null);
    };
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [kfMarqueeActive, onSetSelectedKfs]);

  // Trim drag — snaps to frame boundaries for precision editing.
  // At higher zoom levels you get finer control; at low zoom the snap
  // keeps clips aligned to clean frame boundaries.
  // Left trim also updates trimStartMs so the animation content stays in sync.
  useEffect(() => {
    if (!trimming) return;
    const handleMouseMove = (e: MouseEvent) => {
      const dx = e.clientX - trimming.startX;
      const msDelta = dx / pxPerMs;
      let newDuration: number;
      if (trimming.edge === 'right') {
        newDuration = trimming.startDuration + msDelta;
      } else {
        newDuration = trimming.startDuration - msDelta;
      }
      // Snap to nearest frame boundary
      const snapped = Math.max(
        frameDurationMs, // minimum 1 frame
        Math.round(newDuration / frameDurationMs) * frameDurationMs,
      );
      if (trimming.edge === 'left') {
        const trimDelta = trimming.startDuration - snapped;
        const newTrimStartMs = Math.max(0, trimming.startTrimStartMs + trimDelta);
        onUpdateScene(trimming.sceneId, { durationMs: snapped, trimStartMs: Math.round(newTrimStartMs) });
      } else {
        onUpdateScene(trimming.sceneId, { durationMs: snapped });
      }
    };
    const handleMouseUp = () => setTrimming(null);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [trimming, onUpdateScene, pxPerMs, frameDurationMs]);

  // Audio clip trim drag
  useEffect(() => {
    if (!audioTrimming) return;
    const handleMouseMove = (e: MouseEvent) => {
      const dx = e.clientX - audioTrimming.startX;
      const msDelta = dx / pxPerMs;
      if (audioTrimming.edge === 'right') {
        // Trim end: adjust trimEndMs
        const newTrimEnd = Math.max(
          audioTrimming.startTrimStart + 200,
          audioTrimming.startTrimEnd + msDelta
        );
        onUpdateAudioClip(audioTrimming.clipId, { trimEndMs: Math.round(newTrimEnd) });
      } else {
        // Trim start: adjust trimStartMs and startMs together
        const newTrimStart = Math.max(0, Math.min(
          audioTrimming.startTrimEnd - 200,
          audioTrimming.startTrimStart + msDelta
        ));
        const trimDelta = newTrimStart - audioTrimming.startTrimStart;
        onUpdateAudioClip(audioTrimming.clipId, {
          trimStartMs: Math.round(newTrimStart),
          startMs: Math.max(0, Math.round(audioTrimming.startStartMs + trimDelta)),
        });
      }
    };
    const handleMouseUp = () => setAudioTrimming(null);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [audioTrimming, onUpdateAudioClip, pxPerMs]);

  // Audio clip drag-to-move
  useEffect(() => {
    if (!audioDragActive) return;
    const DRAG_THRESHOLD = 4;

    const handleMouseMove = (e: MouseEvent) => {
      const d = audioDragRef.current;
      if (!d) return;
      const containerEl = timelineRef.current;
      if (!containerEl) return;

      const dx = e.clientX - d.startMouseX;
      const dy = e.clientY - d.startMouseY;
      if (!d.active && Math.hypot(dx, dy) < DRAG_THRESHOLD) return;
      d.active = true;
      audioDragDidMoveRef.current = true;

      const rect = containerEl.getBoundingClientRect();
      const mouseXInContainer = e.clientX - rect.left + containerEl.scrollLeft;
      const rawMs = Math.max(0, (mouseXInContainer - TIMELINE_LEFT_PAD) / pxPerMsRef.current - d.grabOffsetMs);
      const currentMs = Math.round(rawMs);

      // Detect lane under cursor; if in empty region, compute from Y
      const target = document.elementFromPoint(e.clientX, e.clientY);
      const laneEl = target?.closest('[data-lane]');
      const targetLane = laneEl ? Number(laneEl.getAttribute('data-lane')) : laneFromClientY(e.clientY, containerEl);

      // Never place on top of existing content
      const seq = sequenceRef.current;
      const clip = seq.audioClips?.find((c) => c.clipId === d.clipId);
      const durationMs = clip ? Math.max(1, (clip.trimEndMs - clip.trimStartMs) || clip.fullDurationMs || 1000) : 1000;
      const actualLane = findFreeLaneForAudioDrop(
        seq.scenes,
        seq.audioClips || [],
        targetLane,
        currentMs,
        durationMs,
        d.clipId
      );

      d.currentMs = currentMs;
      d.currentLane = actualLane;

      onUpdateAudioClip(d.clipId, { startMs: d.currentMs, lane: d.currentLane });
    };

    const handleMouseUp = () => {
      audioDragRef.current = null;
      setAudioDragActive(false);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [audioDragActive, onUpdateAudioClip, laneFromClientY]);

  const handleAudioClipMouseDown = useCallback((
    e: React.MouseEvent,
    clip: AudioClipEntry,
  ) => {
    if (e.button !== 0) return;
    // Don't start drag from trim handles
    if ((e.target as HTMLElement).classList.contains('cursor-col-resize') ||
        (e.target as HTMLElement).closest('.cursor-col-resize')) return;
    e.preventDefault();

    const containerEl = timelineRef.current;
    if (!containerEl) return;

    const rect = containerEl.getBoundingClientRect();
    const mouseXInContainer = e.clientX - rect.left + containerEl.scrollLeft;
    const mouseTimeMs = (mouseXInContainer - TIMELINE_LEFT_PAD) / pxPerMs;
    const grabOffsetMs = mouseTimeMs - clip.startMs;

    audioDragRef.current = {
      clipId: clip.clipId,
      grabOffsetMs,
      startMouseX: e.clientX,
      startMouseY: e.clientY,
      originalLane: clip.lane,
      originalStartMs: clip.startMs,
      active: false,
      currentMs: clip.startMs,
      currentLane: clip.lane,
    };
    setAudioDragActive(true);
  }, [pxPerMs]);

  // ── Clip mousedown handler — starts custom drag ──
  const handleClipMouseDown = useCallback((
    e: React.MouseEvent,
    sceneId: string,
    idx: number,
    lane: number,
    timing: { startMs: number; endMs: number },
  ) => {
    if (e.button !== 0) return; // left click only
    // Don't start drag from trim handles
    if ((e.target as HTMLElement).closest('[data-trim-handle]')) return;
    e.preventDefault();

    const containerEl = timelineRef.current;
    if (!containerEl) return;

    // Calculate where on the clip the user grabbed (ms from clip start)
    const rect = containerEl.getBoundingClientRect();
    const mouseXInContainer = e.clientX - rect.left + containerEl.scrollLeft;
    const mouseTimeMs = (mouseXInContainer - TIMELINE_LEFT_PAD) / pxPerMs;
    const grabOffsetMs = mouseTimeMs - timing.startMs;

    const scene = sequence.scenes[idx];
    clipDragRef.current = {
      sceneId,
      sceneIdx: idx,
      grabOffsetMs,
      startMouseX: e.clientX,
      startMouseY: e.clientY,
      originalLane: lane,
      clipDurationMs: scene.durationMs,
      currentMs: timing.startMs,
      currentLane: lane,
      snapLineMs: null,
      active: false,
    };
    setClipDragActive(true);
  }, [pxPerMs, sequence.scenes]);

  // ── Timeline marquee select ──
  const [isTlMarqueeing, setIsTlMarqueeing] = useState(false);
  const tlMarqueeOriginRef = useRef({ startX: 0, startY: 0, shiftKey: false });
  const [tlMarqueeRect, setTlMarqueeRect] = useState<{ x: number; y: number; w: number; h: number } | null>(null);

  const handleTrackAreaMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button !== 0) return;
    const target = e.target as HTMLElement;
    // Don't start marquee if clicking on a clip, trim handle, or drag grip
    if (target.closest('[data-scene-id]') || target.closest('[data-audio-clip]')) return;
    // Don't start marquee on the ruler
    if (target.closest('[data-ruler]')) return;

    const container = timelineRef.current;
    if (!container) return;

    tlMarqueeOriginRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      shiftKey: e.shiftKey,
    };
    setIsTlMarqueeing(true);
  }, []);

  useEffect(() => {
    if (!isTlMarqueeing) return;

    const THRESHOLD = 4;
    let active = false;
    const { startX, startY, shiftKey } = tlMarqueeOriginRef.current;

    const handleMove = (e: MouseEvent) => {
      if (!active && Math.hypot(e.clientX - startX, e.clientY - startY) > THRESHOLD) {
        active = true;
      }
      if (active && timelineRef.current) {
        const rect = timelineRef.current.getBoundingClientRect();
        setTlMarqueeRect({
          x: Math.min(startX, e.clientX) - rect.left,
          y: Math.min(startY, e.clientY) - rect.top,
          w: Math.abs(e.clientX - startX),
          h: Math.abs(e.clientY - startY),
        });
      }
    };

    const handleUp = (e: MouseEvent) => {
      if (active && timelineRef.current && onMarqueeSelect) {
        // Find all clips whose screen rects intersect the marquee
        const mx1 = Math.min(startX, e.clientX);
        const my1 = Math.min(startY, e.clientY);
        const mx2 = Math.max(startX, e.clientX);
        const my2 = Math.max(startY, e.clientY);

        const clipEls = timelineRef.current.querySelectorAll('[data-scene-id]');
        const hitIds: string[] = [];
        clipEls.forEach(el => {
          const cr = el.getBoundingClientRect();
          if (cr.right >= mx1 && cr.left <= mx2 && cr.bottom >= my1 && cr.top <= my2) {
            const sid = el.getAttribute('data-scene-id');
            if (sid) hitIds.push(sid);
          }
        });
        onMarqueeSelect(hitIds, shiftKey);
      } else if (!active) {
        // It was a click on empty area — deselect
        if (!shiftKey) onSelectScene(null, false);
      }
      setIsTlMarqueeing(false);
      setTlMarqueeRect(null);
    };

    window.addEventListener('mousemove', handleMove);
    window.addEventListener('mouseup', handleUp);
    return () => {
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('mouseup', handleUp);
    };
  }, [isTlMarqueeing, onMarqueeSelect, onSelectScene]);

  return (
    <div className="h-full bg-background flex flex-col">
      {/* Transport controls — sticky so always visible when scrolling */}
      <div className="sticky top-0 z-30 px-4 py-2 border-b flex items-center gap-2 flex-shrink-0 bg-background">
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onRestart}>
          <SkipBack className="h-3.5 w-3.5" />
        </Button>
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onTogglePlay}>
          {playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
        </Button>
        <Button variant="ghost" size="icon" className="h-7 w-7"
          onClick={() => onSeek(totalDurationMs)}>
          <SkipForward className="h-3.5 w-3.5" />
        </Button>
        <Button
          variant={pingPong ? 'default' : 'ghost'}
          size="icon"
          className="h-7 w-7"
          onClick={onTogglePingPong}
          title={pingPong ? 'Ping-pong: ON (0→100%→0)' : 'Ping-pong: OFF (0→100% loop)'}
        >
          <ArrowLeftRight className="h-3.5 w-3.5" />
        </Button>

        <div className="text-xs tabular-nums text-muted-foreground ml-2 font-mono">
          {formatTimecode(currentTimeMs)} / {formatTimecode(totalDurationMs)}
        </div>

        <div className="flex-1" />

        <Button size="sm" variant="ghost" onClick={onOpenPicker} className="h-7">
          <Plus className="h-3.5 w-3.5" />
          <span className="text-xs">Scene</span>
        </Button>
        <Button size="sm" variant="ghost" onClick={onOpenAudioPicker} className="h-7">
          <Music className="h-3.5 w-3.5" />
          <span className="text-xs">Audio</span>
        </Button>

        {/* Timeline zoom control */}
        <div className="flex items-center gap-1.5 ml-1 border-l pl-2">
          <button
            className="p-0.5 rounded hover:bg-muted transition-colors"
            onClick={() => setTimelineZoom((z) => Math.max(TIMELINE_MIN_ZOOM, z / 1.3))}
            title="Zoom out"
          >
            <ZoomOut className="h-3 w-3 text-muted-foreground" />
          </button>
          <Slider
            min={TIMELINE_MIN_ZOOM}
            max={TIMELINE_MAX_ZOOM}
            step={0.01}
            value={[timelineZoom]}
            onValueChange={([v]: number[]) => setTimelineZoom(v)}
            className="w-20"
          />
          <button
            className="p-0.5 rounded hover:bg-muted transition-colors"
            onClick={() => setTimelineZoom((z) => Math.min(TIMELINE_MAX_ZOOM, z * 1.3))}
            title="Zoom in"
          >
            <ZoomIn className="h-3 w-3 text-muted-foreground" />
          </button>
          <span className="text-[10px] text-muted-foreground tabular-nums font-mono w-9 text-right">
            {timelineZoom < 1
              ? `${Math.round(timelineZoom * 100)}%`
              : `${timelineZoom.toFixed(1)}×`}
          </span>
        </div>
      </div>

      {/* Timeline track area */}
      <div
        ref={timelineRef}
        data-timeline-scroll
        className="overflow-x-auto overflow-y-auto relative flex-1 min-h-0"
      >
        {/* Keyframe marquee selection overlay */}
        {kfMarqueeRect && (
          <div
            className="absolute border border-blue-500/50 bg-blue-500/10 rounded-sm pointer-events-none z-50"
            style={{
              left: kfMarqueeRect.x,
              top: kfMarqueeRect.y,
              width: kfMarqueeRect.w,
              height: kfMarqueeRect.h,
            }}
          />
        )}
        <div
          className="relative flex flex-col"
          style={{
            width: trackWidth + TIMELINE_LEFT_PAD * 2,
            minHeight: Math.max(trackContentHeight, containerHeight || 0),
          }}
        >
          {/* Ruler — sticky so time markers and playhead stay visible when scrolling tracks */}
          <div
            className="sticky top-0 z-20 h-6 border-b bg-background relative cursor-pointer select-none shrink-0"
            onClick={handleRulerClick}
            onMouseDown={(e) => { handleRulerClick(e); setSeekDragging(true); }}
          >
            {rulerTicks.map(({ sec, major }) => {
              const x = TIMELINE_LEFT_PAD + sec * pxPerSec;
              return (
                <div key={sec + (major ? 'M' : 'm')} className="absolute top-0" style={{ left: x }}>
                  <div className={`w-px ${major ? 'h-4 bg-border' : 'h-2 bg-border/50'}`} />
                  {major && (
                    <span className="absolute top-1 left-1 text-[9px] text-muted-foreground tabular-nums whitespace-nowrap">
                      {sec >= 60
                        ? `${Math.floor(sec / 60)}:${String(Math.floor(sec % 60)).padStart(2, '0')}`
                        : sec >= 1
                          ? `${sec}s`
                          : `${Math.round(sec * 1000)}ms`}
                    </span>
                  )}
                </div>
              );
            })}
            {/* Playhead — spans full available height (container or content, whichever is taller) */}
            {(() => {
              const playheadHeight = Math.max(trackContentHeight, containerHeight);
              return (
                <div
                  className="absolute top-0 z-30 pointer-events-none overflow-visible"
                  style={{ left: playheadX, height: playheadHeight, transform: 'translateX(-5px)' }}
                >
                  <PlayheadSvg height={playheadHeight} />
                </div>
              );
            })()}
          </div>

          {/* Spacers — center lanes vertically when container is taller than content */}
          <div className="flex-1 min-h-0" aria-hidden />
          {/* Clips track — one row per lane (primary = lane 0, connected above/below) */}
          <div
            className="relative flex flex-col gap-0.5 py-1 shrink-0"
            onMouseDown={handleTrackAreaMouseDown}
            style={{ cursor: isTlMarqueeing ? 'crosshair' : undefined }}
          >
            {lanes.map((lane) => {
              const entries = scenesByLane.get(lane) ?? [];
              const isPrimary = lane === 0;
              const rowHeight = isPrimary ? 36 : 28;
              const isDropTarget = isClipDragging && clipDragRender?.currentLane === lane;

              return (
                <React.Fragment key={lane}>
                <div
                  data-lane={lane}
                  className="relative flex-shrink-0"
                  style={{ height: rowHeight }}
                >
                  <div
                    data-lane={lane}
                    className={`absolute inset-0 rounded ${isPrimary ? 'bg-muted/30' : 'bg-muted/15'} ${isDropTarget ? 'ring-2 ring-primary ring-inset' : ''}`}
                    style={{ left: TIMELINE_LEFT_PAD, right: TIMELINE_LEFT_PAD }}
                  />
                  {!isPrimary && (
                    <div className="absolute left-1 top-1/2 -translate-y-1/2 text-[9px] text-muted-foreground w-6">
                      {lane > 0 ? `+${lane}` : lane}
                    </div>
                  )}
                  {entries.map(({ scene, idx, timing }) => {
                    const isSelected = selectedSceneIds.has(scene.sceneId);
                    const isDraggingThis = isClipDragging && clipDragRender?.sceneId === scene.sceneId;
                    const color = sceneColorForId(scene.sceneId);
                    const left = TIMELINE_LEFT_PAD + timing.startMs * pxPerMs;
                    const width = Math.max(30, scene.durationMs * pxPerMs);

                    return (
                      <div
                        key={scene.sceneId}
                        role="button"
                        tabIndex={0}
                        aria-label={scene.label || scene.animationId}
                        data-scene-id={scene.sceneId}
                        onMouseDown={(e) => handleClipMouseDown(e, scene.sceneId, idx, lane, timing)}
                        onClick={(e) => { e.stopPropagation(); if (!isClipDragging) { onSelectScene(scene.sceneId, e.shiftKey); onSetSelectedKfs([]); } }}
                        className={`
                          absolute top-0.5 bottom-0.5 rounded cursor-pointer select-none group/clip
                          transition-shadow duration-100
                          ${isPrimary ? '' : 'border border-white/20'}
                          ${isDraggingThis ? 'opacity-30' : ''}
                          ${isSelected ? 'ring-2 ring-blue-500 shadow-lg z-10' : 'hover:brightness-110'}
                        `}
                        style={{
                          left,
                          width,
                          backgroundColor: color,
                        }}
                      >
                        {/* Left trim handle */}
                        <div
                          data-trim-handle
                          className="absolute left-0 top-0 w-2 h-full cursor-col-resize z-20 
                                     bg-white/0 hover:bg-white/30 active:bg-white/50 rounded-l
                                     transition-colors"
                          onMouseDown={(e) => {
                            e.stopPropagation(); e.preventDefault();
                            setTrimming({
                              sceneId: scene.sceneId,
                              edge: 'left',
                              startX: e.clientX,
                              startDuration: scene.durationMs,
                              startTrimStartMs: scene.trimStartMs ?? 0,
                            });
                          }}
                        >
                          <div className="absolute left-0.5 top-1/2 -translate-y-1/2 w-0.5 h-4 bg-white/60 rounded-full
                                          opacity-0 group-hover/clip:opacity-100 transition-opacity" />
                        </div>

                        {/* Right trim handle (duration) */}
                        <div
                          data-trim-handle
                          className="absolute right-0 top-0 w-2 h-full cursor-col-resize z-20 
                                     bg-white/0 hover:bg-white/30 active:bg-white/50 rounded-r
                                     transition-colors"
                          onMouseDown={(e) => {
                            e.stopPropagation(); e.preventDefault();
                            setTrimming({
                              sceneId: scene.sceneId,
                              edge: 'right',
                              startX: e.clientX,
                              startDuration: scene.durationMs,
                              startTrimStartMs: scene.trimStartMs ?? 0,
                            });
                          }}
                        >
                          <div className="absolute right-0.5 top-1/2 -translate-y-1/2 w-0.5 h-4 bg-white/60 rounded-full
                                          opacity-0 group-hover/clip:opacity-100 transition-opacity" />
                        </div>

                        {/* Clip content */}
                        <div className="relative z-10 flex items-center gap-1 px-2 py-0.5 h-full overflow-hidden">
                          <GripVertical className="h-3 w-3 text-white/50 flex-shrink-0 cursor-grab" />
                          {scene.customCode && <Code className="h-3 w-3 text-white/60 flex-shrink-0" />}
                          {scene.reversed && <Undo2 className="h-3 w-3 text-white/60 flex-shrink-0" />}
                          <div className="min-w-0 flex-1">
                            <div className="text-[11px] font-medium text-white truncate leading-tight">
                              {scene.label || scene.animationId}
                            </div>
                            {isPrimary && (
                              <div className="text-[9px] text-white/50 flex items-center gap-1 mt-0.5">
                                <Clock className="h-2.5 w-2.5" />
                                {formatTime(scene.durationMs)}
                                {scene.transition?.type && scene.transition.type !== 'cut' && (
                                  <>
                                    <ArrowRight className="h-2 w-2 ml-0.5" />
                                    <span>{scene.transition.type}</span>
                                  </>
                                )}
                              </div>
                            )}
                          </div>
                          {/* Keyframe expand toggle */}
                          <button
                            className="flex-shrink-0 p-0.5 rounded hover:bg-white/20 transition-colors"
                            title={expandedKeyframeScenes.has(scene.sceneId) ? 'Collapse keyframes' : 'Expand keyframes'}
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleKeyframeExpansion(scene.sceneId);
                            }}
                          >
                            <Diamond className={`h-3 w-3 ${hasAnyKeyframes(scene.keyframes) ? 'text-yellow-300' : 'text-white/40'}`} />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                  {/* Audio clips in this lane */}
                  {(audioClipsByLane.get(lane) ?? []).map((clip) => {
                    const effectiveDur = clip.trimEndMs - clip.trimStartMs;
                    const isSelected = clip.clipId === selectedAudioClipId;
                    const clipLeft = TIMELINE_LEFT_PAD + clip.startMs * pxPerMs;
                    const clipWidth = Math.max(30, effectiveDur * pxPerMs);
                    const peaks = audioWaveforms.get(clip.clipId);

                    return (
                      <div
                        key={clip.clipId}
                        role="button"
                        tabIndex={0}
                        aria-label={clip.label || clip.audioFilename}
                        onClick={(e) => {
                          e.stopPropagation();
                          // Only select if we didn't just finish a drag
                          if (audioDragDidMoveRef.current) {
                            audioDragDidMoveRef.current = false;
                            return;
                          }
                          onSelectAudioClip(clip.clipId);
                        }}
                        onMouseDown={(e) => { e.stopPropagation(); handleAudioClipMouseDown(e, clip); }}
                        data-audio-clip={clip.clipId}
                        className={`
                          absolute top-0.5 bottom-0.5 rounded cursor-grab select-none group/clip
                          transition-shadow duration-100 overflow-hidden active:cursor-grabbing
                          ${isSelected ? 'ring-2 ring-emerald-500 shadow-lg z-10' : 'hover:brightness-110'}
                        `}
                        style={{
                          left: clipLeft,
                          width: clipWidth,
                          backgroundColor: 'hsl(160, 55%, 35%)',
                        }}
                      >
                        {/* Left trim handle */}
                        <div
                          className="absolute left-0 top-0 w-2 h-full cursor-col-resize z-20 
                                     bg-white/0 hover:bg-white/30 active:bg-white/50 rounded-l
                                     transition-colors"
                          onMouseDown={(e) => {
                            e.stopPropagation(); e.preventDefault();
                            setAudioTrimming({
                              clipId: clip.clipId, edge: 'left', startX: e.clientX,
                              startTrimStart: clip.trimStartMs, startTrimEnd: clip.trimEndMs,
                              startStartMs: clip.startMs,
                            });
                          }}
                        >
                          <div className="absolute left-0.5 top-1/2 -translate-y-1/2 w-0.5 h-4 bg-white/60 rounded-full
                                          opacity-0 group-hover/clip:opacity-100 transition-opacity" />
                        </div>

                        {/* Right trim handle */}
                        <div
                          className="absolute right-0 top-0 w-2 h-full cursor-col-resize z-20 
                                     bg-white/0 hover:bg-white/30 active:bg-white/50 rounded-r
                                     transition-colors"
                          onMouseDown={(e) => {
                            e.stopPropagation(); e.preventDefault();
                            setAudioTrimming({
                              clipId: clip.clipId, edge: 'right', startX: e.clientX,
                              startTrimStart: clip.trimStartMs, startTrimEnd: clip.trimEndMs,
                              startStartMs: clip.startMs,
                            });
                          }}
                        >
                          <div className="absolute right-0.5 top-1/2 -translate-y-1/2 w-0.5 h-4 bg-white/60 rounded-full
                                          opacity-0 group-hover/clip:opacity-100 transition-opacity" />
                        </div>

                        {/* Waveform inside clip */}
                        {peaks && peaks.length > 0 && (
                          <svg
                            className="absolute inset-0 w-full h-full"
                            preserveAspectRatio="none"
                            viewBox={`0 0 ${clipWidth} 100`}
                          >
                            <path
                              fill="rgba(255,255,255,0.15)"
                              stroke="rgba(255,255,255,0.3)"
                              strokeWidth="0.5"
                              d={(() => {
                                // Show only the trimmed portion of the waveform
                                const totalDur = clip.fullDurationMs || 1;
                                const startFrac = clip.trimStartMs / totalDur;
                                const endFrac = clip.trimEndMs / totalDur;
                                const startIdx = Math.floor(startFrac * peaks.length);
                                const endIdx = Math.ceil(endFrac * peaks.length);
                                const slice = peaks.slice(startIdx, endIdx);
                                if (slice.length === 0) return '';
                                const maxP = Math.max(...slice, 1e-6);
                                const n = slice.length;
                                const w = clipWidth;
                                const h = 100;
                                const cy = h / 2;
                                const top = slice.map((p, i) => {
                                  const x = (i / (n - 1 || 1)) * w;
                                  const y = cy - (p / maxP) * (h / 2);
                                  return `${x},${y}`;
                                });
                                const bot = slice.map((p, i) => {
                                  const x = (i / (n - 1 || 1)) * w;
                                  const y = cy + (p / maxP) * (h / 2);
                                  return `${x},${y}`;
                                }).reverse();
                                return `M ${top.join(' L ')} L ${bot.join(' L ')} Z`;
                              })()}
                            />
                          </svg>
                        )}

                        {/* Clip content */}
                        <div className="relative z-10 flex items-center gap-1 px-2 py-0.5 h-full overflow-hidden">
                          <Music className="h-3 w-3 text-white/50 flex-shrink-0" />
                          <div className="min-w-0 flex-1">
                            <div className="text-[11px] font-medium text-white truncate leading-tight">
                              {clip.label || clip.audioFilename}
                            </div>
                            <div className="text-[9px] text-white/50 flex items-center gap-1 mt-0.5">
                              <Clock className="h-2.5 w-2.5" />
                              {formatTime(effectiveDur)}
                              {clip.volume < 1 && (
                                <span className="ml-0.5">{Math.round(clip.volume * 100)}%</span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}

                  {isDropTarget && (
                    <div className="absolute inset-0 border-2 border-dashed border-primary/50 rounded pointer-events-none z-0" />
                  )}
                </div>
                {/* Keyframe property tracks for expanded scenes in this lane */}
                {entries.map(({ scene, timing }) => {
                  if (!expandedKeyframeScenes.has(scene.sceneId)) return null;
                  const clipLeft = TIMELINE_LEFT_PAD + timing.startMs * pxPerMs;
                  const clipWidth = Math.max(30, scene.durationMs * pxPerMs);
                  const sceneColor = sceneColorForId(scene.sceneId);
                  const baseTransform = scene.transform || DEFAULT_TRANSFORM;

                  return (
                    <div key={`kf-${scene.sceneId}`} className="relative flex flex-col">
                      {TRANSFORM_TRACK_KEYS.map((trackKey) => {
                        const track = scene.keyframes?.[trackKey];
                        const count = track?.length ?? 0;
                        const label = TRANSFORM_TRACK_LABELS[trackKey];

                        return (
                          <React.Fragment key={trackKey}>
                            {/* Property header row */}
                            <div className="relative flex-shrink-0" style={{ height: 22 }}>
                              {/* Header background aligned to clip */}
                              <div
                                className={`absolute top-0 bottom-0 bg-muted/10 border-x border-t border-border/20 ${count > 0 ? 'rounded-t-sm' : 'rounded-sm'}`}
                                style={{ left: clipLeft, width: clipWidth }}
                              />
                              {/* Label + chevron */}
                              <div
                                className="absolute top-0 h-full flex items-center text-[10px] text-muted-foreground select-none cursor-default"
                                style={{ left: clipLeft + 6 }}
                              >
                                {count > 0 ? (
                                  <ChevronDown className="h-2.5 w-2.5 mr-1 text-muted-foreground/60" />
                                ) : (
                                  <ChevronRight className="h-2.5 w-2.5 mr-1 text-muted-foreground/40" />
                                )}
                                <span className={count > 0 ? 'text-muted-foreground' : 'text-muted-foreground/50'}>
                                  {label}
                                </span>
                              </div>
                              {/* Easing curve icon on the right */}
                              {count > 0 && (
                                <div
                                  className="absolute top-0 h-full flex items-center"
                                  style={{ left: clipLeft + clipWidth - 22 }}
                                >
                                  <svg className="h-3.5 w-3.5 text-muted-foreground/30" viewBox="0 0 16 16" fill="none">
                                    <path d="M2 14 C6 14 10 2 14 2" stroke="currentColor" strokeWidth="1.5" />
                                  </svg>
                                </div>
                              )}
                              {/* Click to add first keyframe if none exist */}
                              {count === 0 && (
                                <div
                                  className="absolute top-0 h-full cursor-pointer opacity-0 hover:opacity-100 transition-opacity"
                                  style={{ left: clipLeft, width: clipWidth }}
                                  title="Click to add keyframe"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    const rect = e.currentTarget.getBoundingClientRect();
                                    const clickX = e.clientX - rect.left;
                                    const normTime = Math.max(0, Math.min(1, clickX / clipWidth));
                                    const value = getTransformValue(baseTransform, trackKey);
                                    const newTracks = setKeyframe(scene.keyframes, trackKey, normTime, value);
                                    onUpdateScene(scene.sceneId, { keyframes: newTracks });
                                  }}
                                />
                              )}
                            </div>

                            {/* Diamond strip row — only when track has keyframes */}
                            {count > 0 && (
                              <div className="relative flex-shrink-0 group/kftrack" style={{ height: 22 }}>
                                {/* Strip background */}
                                <div
                                  className="absolute top-0 bottom-0 rounded-b-sm bg-muted/20 border-x border-b border-border/30"
                                  style={{ left: clipLeft, width: clipWidth }}
                                />

                                {/* Dotted line between first and last keyframe */}
                                {count >= 2 && (() => {
                                  const firstKf = track![0];
                                  const lastKf = track![track!.length - 1];
                                  const lineLeft = clipLeft + firstKf.time * clipWidth;
                                  const lineWidth = (lastKf.time - firstKf.time) * clipWidth;
                                  return (
                                    <div
                                      className="absolute top-1/2 -translate-y-px h-px pointer-events-none"
                                      style={{
                                        left: lineLeft,
                                        width: lineWidth,
                                        borderTop: `1px dashed ${sceneColor}`,
                                        opacity: 0.5,
                                      }}
                                    />
                                  );
                                })()}

                                {/* Keyframe diamonds */}
                                {track?.map((kf, kfIdx) => {
                                  const kfX = clipLeft + kf.time * clipWidth;
                                  const kfSel = isKfSelected(scene.sceneId, trackKey, kfIdx);
                                  return (
                                    <div
                                      key={kfIdx}
                                      data-kf-diamond
                                      data-kf-scene={scene.sceneId}
                                      data-kf-track={trackKey}
                                      data-kf-idx={kfIdx}
                                      className={`absolute top-1/2 -translate-y-1/2 -translate-x-1/2 cursor-pointer z-10
                                                   transition-transform ${kfSel ? 'scale-[1.4]' : 'hover:scale-125'}`}
                                      style={{ left: kfX }}
                                      title={`${label}: ${kf.value.toFixed(2)} at ${(kf.time * 100).toFixed(0)}%${kf.easing ? ` (${kf.easing})` : ''}`}
                                      onMouseDown={(e) => {
                                        e.stopPropagation();
                                        e.preventDefault();
                                        const thisKf = { sceneId: scene.sceneId, trackKey, kfIdx };
                                        // Compute final selection synchronously so we can capture origTimes
                                        let newSelection: SelectedKf[];
                                        if (e.shiftKey) {
                                          const prev = selectedKfsRef.current;
                                          const already = prev.some(
                                            (k) => k.sceneId === scene.sceneId && k.trackKey === trackKey && k.kfIdx === kfIdx
                                          );
                                          newSelection = already
                                            ? prev.filter(
                                                (k) => !(k.sceneId === scene.sceneId && k.trackKey === trackKey && k.kfIdx === kfIdx)
                                              )
                                            : [...prev, thisKf];
                                        } else {
                                          newSelection = [thisKf];
                                        }
                                        onSetSelectedKfs(newSelection);
                                        onSelectScene(scene.sceneId);
                                        // Capture original times for all keyframes that will be dragged
                                        const kfsToMove = newSelection.length > 0 ? newSelection : [thisKf];
                                        const origTimes = new Map<string, number>();
                                        const seq = sequenceRef.current;
                                        for (const selKf of kfsToMove) {
                                          const sc = seq.scenes.find((s) => s.sceneId === selKf.sceneId);
                                          if (!sc?.keyframes) continue;
                                          const t = sc.keyframes[selKf.trackKey];
                                          if (!t || !t[selKf.kfIdx]) continue;
                                          origTimes.set(`${selKf.sceneId}|${selKf.trackKey}|${selKf.kfIdx}`, t[selKf.kfIdx].time);
                                        }
                                        // Start drag
                                        kfDragRef.current = {
                                          sceneId: scene.sceneId,
                                          trackKey,
                                          kfIdx,
                                          originalTime: kf.time,
                                          startX: e.clientX,
                                          clipLeft,
                                          clipWidth,
                                          origTimes,
                                        };
                                        setKfDragActive(true);
                                      }}
                                    >
                                      <Diamond
                                        className={`h-3 w-3 ${kfSel ? 'text-white fill-white drop-shadow-[0_0_4px_rgba(255,255,255,0.7)]' : ''}`}
                                        style={kfSel ? {} : { color: sceneColor, fill: sceneColor }}
                                      />
                                    </div>
                                  );
                                })}

                                {/* Click/drag on strip background — click adds kf, drag starts marquee */}
                                <div
                                  className="absolute top-0 h-full cursor-crosshair opacity-0 group-hover/kftrack:opacity-100 transition-opacity"
                                  style={{ left: clipLeft, width: clipWidth }}
                                  onMouseDown={(e) => {
                                    // Check if we clicked directly on a diamond (not background)
                                    if ((e.target as HTMLElement).closest('[data-kf-diamond]')) return;
                                    e.stopPropagation();
                                    e.preventDefault();
                                    const scrollEl = e.currentTarget.closest('[data-timeline-scroll]') as HTMLElement;
                                    if (!scrollEl) return;
                                    kfMarqueeRef.current = { startX: e.clientX, startY: e.clientY, scrollEl };
                                    setKfMarqueeActive(true);
                                  }}
                                  onClick={(e) => {
                                    // Only add keyframe on clean click (no marquee drag)
                                    if (kfMarqueeRect && (kfMarqueeRect.w > 4 || kfMarqueeRect.h > 4)) return;
                                    e.stopPropagation();
                                    onSetSelectedKfs([]);
                                    const rect = e.currentTarget.getBoundingClientRect();
                                    const clickX = e.clientX - rect.left;
                                    const normTime = Math.max(0, Math.min(1, clickX / clipWidth));
                                    const value = getTransformValue(baseTransform, trackKey);
                                    const newTracks = setKeyframe(scene.keyframes, trackKey, normTime, value);
                                    onUpdateScene(scene.sceneId, { keyframes: newTracks });
                                  }}
                                />
                              </div>
                            )}
                          </React.Fragment>
                        );
                      })}
                    </div>
                  );
                })}
                </React.Fragment>
              );
            })}
          </div>

          {/* Spacer — balances top spacer to center lanes vertically */}
          <div className="flex-1 min-h-0" aria-hidden />

          {/* Timeline marquee overlay */}
          {tlMarqueeRect && (
            <div
              className="absolute pointer-events-none border border-blue-400 bg-blue-400/10 rounded-sm z-40"
              style={{
                left: tlMarqueeRect.x,
                top: tlMarqueeRect.y,
                width: tlMarqueeRect.w,
                height: tlMarqueeRect.h,
              }}
            />
          )}

          {/* ── Ghost clip preview during drag ── */}
          {isClipDragging && clipDragRender && (() => {
            const ghostLeft = TIMELINE_LEFT_PAD + clipDragRender.currentMs * pxPerMs;
            const ghostWidth = Math.max(30, clipDragRender.clipDurationMs * pxPerMs);
            const ghostColor = sceneColorForId(clipDragRender.sceneId);
            const topSpacerH = Math.max(0, (containerHeight - trackContentHeight) / 2);
            // Find the lane row position for the ghost (including virtual lanes when dropping in empty region)
            const laneIndex = lanes.indexOf(clipDragRender.currentLane);
            const laneHeight = clipDragRender.currentLane === 0 ? 36 : 28;
            let ghostTop: number;
            if (laneIndex >= 0) {
              ghostTop = topSpacerH + lanes.slice(0, laneIndex).reduce((sum, l) => sum + (l === 0 ? 36 : 28) + 2, 0) + 4 /* py-1 */;
            } else if (lanes.length > 0 && clipDragRender.currentLane > Math.max(...lanes)) {
              ghostTop = topSpacerH + 4; /* above first lane */
            } else if (lanes.length > 0 && clipDragRender.currentLane < Math.min(...lanes)) {
              ghostTop = topSpacerH + lanes.reduce((sum, l) => sum + (l === 0 ? 36 : 28) + 2, 0) + 4 - 2; /* below last lane */
            } else {
              ghostTop = topSpacerH + 4;
            }
            const ghostHeight = laneHeight - 4; /* match clip top-0.5 + bottom-0.5 */

            return (
              <>
                {/* Ghost clip */}
                <div
                  className="absolute rounded pointer-events-none z-40 border-2 border-white/60"
                  style={{
                    left: ghostLeft,
                    width: ghostWidth,
                    top: 24 + ghostTop + 2, /* ruler(24) + spacer + py-1(4) + lanes above + top-0.5(2) */
                    height: ghostHeight,
                    backgroundColor: ghostColor,
                    opacity: 0.5,
                  }}
                />
                {/* Snap indicator line */}
                {clipDragRender.snapLineMs !== null && (
                  <div
                    className="absolute top-0 pointer-events-none z-50"
                    style={{
                      left: TIMELINE_LEFT_PAD + clipDragRender.snapLineMs * pxPerMs,
                      height: trackContentHeight,
                      width: 1,
                      backgroundColor: 'hsl(210, 100%, 60%)',
                      boxShadow: '0 0 4px hsl(210, 100%, 60%)',
                    }}
                  />
                )}
              </>
            );
          })()}
        </div>
      </div>
    </div>
  );
}

// ─── Main Composer ────────────────────────────────────────────────────────────

export function Composer() {
  const [searchParams, setSearchParams] = useSearchParams();
  const allAnimations = useAnimationRegistry();
  const { isDeleted } = useDeletedAnimations();
  const animations = useMemo(
    () => allAnimations.filter((e) => !isDeleted(getAnimationId(e))),
    [allAnimations, isDeleted]
  );

  // Sequence state
  const [sequence, setSequence] = useState<Sequence>(() => createEmptySequence());
  const [selectedSceneIds, setSelectedSceneIds] = useState<Set<string>>(new Set());
  const [hoveredSceneId, setHoveredSceneId] = useState<string | null>(null);
  // Selected keyframes (lifted from Timeline so Composer-level Delete handler respects them)
  const [selectedKfs, setSelectedKfs] = useState<{ sceneId: string; trackKey: TransformTrackKey; kfIdx: number }[]>([]);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerSearch, setPickerSearch] = useState('');
  const [pickerTab, setPickerTab] = useState<'gallery' | 'code'>('gallery');
  const [customCode, setCustomCode] = useState(CUSTOM_CODE_TEMPLATE);
  const [customCodeError, setCustomCodeError] = useState<string | null>(null);
  const [customCodeConfig, setCustomCodeConfig] = useState<CustomCodeConfig>({
    name: 'Custom Animation',
    width: 800,
    height: 600,
    durationMs: 3000,
    fps: 60,
    background: '#000000',
  });
  const customCodePreviewRef = useRef<HTMLCanvasElement>(null);
  const customCodeRafRef = useRef<number | null>(null);
  const [exportMp4Open, setExportMp4Open] = useState(false);
  const [exportMp4Progress, setExportMp4Progress] = useState(0);
  const [exportMp4Exporting, setExportMp4Exporting] = useState(false);
  const [exportMp4Blob, setExportMp4Blob] = useState<Blob | null>(null);
  const [exportMp4Error, setExportMp4Error] = useState<string | null>(null);
  const [exportWidth, setExportWidth] = useState(sequence.width);
  const [exportHeight, setExportHeight] = useState(sequence.height);
  const [exportFps, setExportFps] = useState(sequence.fps);
  const exportAbortRef = useRef<AbortController | null>(null);
  const [selectedAudioClipId, setSelectedAudioClipId] = useState<string | null>(null);
  const [audioWaveforms, setAudioWaveforms] = useState<Map<string, number[]>>(new Map());
  const [authDialogOpen, setAuthDialogOpen] = useState(false);

  const workspace = useWorkspace();
  const auth = useAuth();

  // Load sequence from URL when opening from Sequences gallery (?open=id)
  const openIdHandledRef = useRef(false);
  useEffect(() => {
    const openId = searchParams.get('open');
    if (!openId || openIdHandledRef.current) return;
    openIdHandledRef.current = true;

    const doLoad = async () => {
      let loaded: Sequence | null = null;
      if (workspace.useCloud) {
        loaded = await workspace.loadSequence(openId);
      } else {
        loaded = loadSequence(openId);
      }
      if (loaded) {
        setSequence(loaded);
        setSelectedSceneIds(new Set());
        toast.success(`Loaded "${loaded.name}"`);
      }
      setSearchParams((prev) => {
        const next = new URLSearchParams(prev);
        next.delete('open');
        return next;
      }, { replace: true });
    };
    doLoad();
  }, [searchParams, workspace.useCloud, workspace.loadSequence, setSearchParams]);

  // Player state
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const playerRef = useRef<SequencePlayerControls | null>(null);
  const [playing, setPlaying] = useState(false);
  const [currentTimeMs, setCurrentTimeMs] = useState(0);
  const [totalDurationMs, setTotalDurationMs] = useState(0);
  const [pingPong, setPingPong] = useState(false);

  // Canvas zoom/pan state
  const [canvasZoom, setCanvasZoom] = useState(1);
  const [canvasPan, setCanvasPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const panStartRef = useRef({ x: 0, y: 0, panX: 0, panY: 0 });
  const canvasWrapperRef = useRef<HTMLDivElement>(null);

  // Canvas drag-to-move state
  const [isDraggingOnCanvas, setIsDraggingOnCanvas] = useState(false);
  const canvasDragRef = useRef({
    startX: 0, startY: 0, origOffsetX: 0, origOffsetY: 0, sceneId: '',
    localProgress: 0, hasKfX: false, hasKfY: false,
  });

  // Canvas scale drag state (declared early because handleCanvasAreaClick references it)
  const [isScaling, setIsScaling] = useState(false);

  // Timestamp of last drag/scale end — used to suppress the click event that fires right after mouseup
  const lastInteractionEndRef = useRef(0);

  const audioFileInputRef = useRef<HTMLInputElement>(null);

  // ── Copy / Paste clipboard (in-memory) ───────────────────────────────────────
  const clipboardRef = useRef<
    | { type: 'scenes'; items: SceneEntry[]; timings: { startMs: number; endMs: number }[] }
    | { type: 'audio'; items: AudioClipEntry[] }
    | null
  >(null);

  // ── Undo / Redo ─────────────────────────────────────────────────────────────
  // Watches `sequence` via an effect with debounced commits so rapid changes
  // (drags, trims) are grouped into a single undo entry.
  const undoStackRef = useRef<Sequence[]>([]);
  const redoStackRef = useRef<Sequence[]>([]);
  const prevSeqForUndoRef = useRef<Sequence>(sequence);
  const isUndoingRef = useRef(false);
  const undoCommitTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => {
    // Skip recording changes triggered by undo/redo itself
    if (isUndoingRef.current) {
      isUndoingRef.current = false;
      prevSeqForUndoRef.current = sequence;
      return;
    }
    const prev = prevSeqForUndoRef.current;
    if (prev === sequence) return; // referential equality — no real change

    // Debounce: batch rapid changes into a single undo entry
    clearTimeout(undoCommitTimerRef.current);
    undoCommitTimerRef.current = setTimeout(() => {
      undoStackRef.current.push(prev);
      if (undoStackRef.current.length > 100) undoStackRef.current.shift();
      redoStackRef.current = [];
      prevSeqForUndoRef.current = sequence;
    }, 500);

    return () => clearTimeout(undoCommitTimerRef.current);
  }, [sequence]);

  const undo = useCallback(() => {
    // Flush any pending debounced commit
    clearTimeout(undoCommitTimerRef.current);
    isUndoingRef.current = true;
    setSequence((current) => {
      const prev = prevSeqForUndoRef.current;
      // If there are uncommitted changes, commit them first
      if (prev !== current) {
        undoStackRef.current.push(prev);
        if (undoStackRef.current.length > 100) undoStackRef.current.shift();
      }
      if (undoStackRef.current.length === 0) {
        isUndoingRef.current = false;
        return current;
      }
      const restored = undoStackRef.current.pop()!;
      redoStackRef.current.push(current);
      prevSeqForUndoRef.current = restored;
      return restored;
    });
  }, []);

  const redo = useCallback(() => {
    if (redoStackRef.current.length === 0) return;
    clearTimeout(undoCommitTimerRef.current);
    isUndoingRef.current = true;
    setSequence((current) => {
      if (redoStackRef.current.length === 0) {
        isUndoingRef.current = false;
        return current;
      }
      const next = redoStackRef.current.pop()!;
      undoStackRef.current.push(current);
      prevSeqForUndoRef.current = next;
      return next;
    });
  }, []);

  // ── Resizable timeline height ───────────────────────────────────────────────
  const [timelineHeight, setTimelineHeight] = useState(() => Math.round(window.innerHeight * 0.38));
  const [isResizingTimeline, setIsResizingTimeline] = useState(false);
  const resizeStartRef = useRef({ startY: 0, startHeight: 0 });

  useEffect(() => {
    if (!isResizingTimeline) return;
    const handleMove = (e: MouseEvent) => {
      const delta = resizeStartRef.current.startY - e.clientY; // dragging up = bigger
      const maxH = Math.round(window.innerHeight * 0.8);
      const newHeight = Math.max(100, Math.min(maxH, resizeStartRef.current.startHeight + delta));
      setTimelineHeight(newHeight);
    };
    const handleUp = () => setIsResizingTimeline(false);
    window.addEventListener('mousemove', handleMove);
    window.addEventListener('mouseup', handleUp);
    return () => {
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('mouseup', handleUp);
    };
  }, [isResizingTimeline]);

  // Build animations map (gallery + custom code scenes)
  const animationsMap = useMemo(() => {
    const map = new Map<string, AnyAnimationDefinition>();
    for (const entry of animations) {
      map.set(getAnimationId(entry), entry.definition);
    }
    // Compile custom code scenes and add them to the map
    for (const scene of sequence.scenes) {
      if (scene.customCode && !map.has(scene.animationId)) {
        const compiled = compileCustomCode(scene.customCode, scene.customCodeConfig);
        if (compiled) {
          map.set(scene.animationId, compiled);
        }
      }
    }
    return map;
  }, [animations, sequence.scenes]);

  useEffect(() => {
    setTotalDurationMs(getSequenceDurationMs(sequence.scenes, sequence.audioClips));
  }, [sequence.scenes, sequence.audioClips]);

  // Auto-save (debounced 2s) - cloud when signed in, localStorage otherwise
  useEffect(() => {
    if (sequence.scenes.length === 0 && sequence.name === 'Untitled Sequence') return;
    const t = setTimeout(() => {
      if (workspace.useCloud) {
        workspace.saveSequence(sequence).then(({ error }) => {
          if (error) console.warn('Auto-save failed:', error.message);
        });
      } else {
        saveSequence(sequence);
      }
    }, 2000);
    return () => clearTimeout(t);
  }, [sequence, workspace.useCloud, workspace.saveSequence]);

  // ─── Audio clip waveform computation ──────────────────────────────────────

  useEffect(() => {
    const clips = sequence.audioClips || [];
    let cancelled = false;

    // Compute waveforms for clips that don't have one yet
    for (const clip of clips) {
      if (audioWaveforms.has(clip.clipId)) continue;
      (async () => {
        try {
          const res = await fetch(clip.audioUrl);
          const buf = await res.arrayBuffer();
          const ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
          const data = await ctx.decodeAudioData(buf);
          const channel = data.getChannelData(0);
          const numPeaks = 500;
          const blockSize = Math.floor(channel.length / numPeaks) || 1;
          const peaks: number[] = [];
          for (let i = 0; i < numPeaks; i++) {
            const start = i * blockSize;
            let max = 0;
            for (let j = 0; j < blockSize && start + j < channel.length; j++) {
              const v = Math.abs(channel[start + j]);
              if (v > max) max = v;
            }
            peaks.push(max);
          }
          if (!cancelled) {
            setAudioWaveforms((prev) => {
              const next = new Map(prev);
              next.set(clip.clipId, peaks);
              return next;
            });
            // Also update fullDurationMs if it was 0 (migrated clip)
            if (clip.fullDurationMs === 0 || clip.trimEndMs === 0) {
              const durationMs = data.duration * 1000;
              setSequence((prev) => ({
                ...prev,
                audioClips: prev.audioClips.map((c) =>
                  c.clipId === clip.clipId
                    ? {
                        ...c,
                        fullDurationMs: durationMs,
                        trimEndMs: c.trimEndMs === 0 ? durationMs : c.trimEndMs,
                      }
                    : c
                ),
              }));
            }
          }
          ctx.close();
        } catch {
          // Skip waveform for failed clips
        }
      })();
    }

    // Remove waveforms for deleted clips
    setAudioWaveforms((prev) => {
      const clipIds = new Set(clips.map((c) => c.clipId));
      let changed = false;
      const next = new Map(prev);
      for (const [id] of next) {
        if (!clipIds.has(id)) {
          next.delete(id);
          changed = true;
        }
      }
      return changed ? next : prev;
    });

    return () => { cancelled = true; };
  }, [sequence.audioClips]);

  // ─── Player lifecycle ─────────────────────────────────────────────────────

  // Throttle React state updates from the RAF loop.
  // The sequence player calls onFrame at ~60fps; pushing each of those into
  // React state causes the entire Composer tree to re-render 60×/sec, which
  // is far too expensive and starves the RAF of main-thread time.
  // We keep the latest value in a ref and flush to state at ~24fps — plenty
  // smooth for the timeline playhead while cutting re-renders by ~60%.
  const pendingTimeMsRef = useRef(0);
  const frameThrottleRef = useRef(0);

  const handleFrame = useCallback((timeMs: number) => {
    pendingTimeMsRef.current = timeMs;
    const now = performance.now();
    // ~24fps → one state update every ~42ms
    if (now - frameThrottleRef.current > 42) {
      frameThrottleRef.current = now;
      setCurrentTimeMs(timeMs);
    }
  }, []);

  useEffect(() => {
    if (!canvasRef.current) return;
    const player = createSequencePlayer({
      canvas: canvasRef.current,
      sequence,
      animations: animationsMap,
      onFrame: handleFrame,
    });
    playerRef.current = player;
    const canvas = canvasRef.current;
    canvas.style.width = '';
    canvas.style.height = '';
    return () => { player.destroy(); playerRef.current = null; };
  }, []);

  useEffect(() => {
    playerRef.current?.setSequence(sequence, animationsMap);
    if (canvasRef.current) {
      canvasRef.current.style.width = '';
      canvasRef.current.style.height = '';
    }
  }, [sequence, animationsMap]);

  // ─── Playback ─────────────────────────────────────────────────────────────

  const togglePlay = useCallback(() => {
    playerRef.current?.toggle();
    const nowPlaying = playerRef.current?.isPlaying() ?? false;
    setPlaying(nowPlaying);
    // When pausing, flush the latest time so the playhead settles accurately
    if (!nowPlaying) {
      setCurrentTimeMs(pendingTimeMsRef.current);
    }
  }, []);

  const restart = useCallback(() => {
    playerRef.current?.restart();
    pendingTimeMsRef.current = 0;
    setCurrentTimeMs(0);
  }, []);

  const handleSeek = useCallback((ms: number) => {
    playerRef.current?.seek(ms);
    pendingTimeMsRef.current = ms;
    setCurrentTimeMs(ms);
  }, []);

  // Sync ping-pong mode with the player
  useEffect(() => {
    playerRef.current?.setPingPong(pingPong);
  }, [pingPong]);

  // ─── Save / Load / Export / Import ─────────────────────────────────────────

  const handleSave = useCallback(async () => {
    if (workspace.useCloud) {
      const { error } = await workspace.saveSequence(sequence);
      if (error) {
        toast.error(error.message);
        return;
      }
      toast.success('Sequence saved to cloud');
    } else {
      saveSequence(sequence);
      toast.success('Sequence saved');
    }
  }, [sequence, workspace.useCloud, workspace.saveSequence]);

  const handlePromote = useCallback(async () => {
    if (!workspace.useCloud) return;
    const { error } = await workspace.saveSequence(sequence);
    if (error) {
      toast.error(error.message);
      return;
    }
    const { error: promoteError } = await workspace.promoteSequence(sequence.id);
    if (promoteError) toast.error(promoteError.message);
    else {
      workspace.refreshSequences();
      toast.success('Sequence promoted to public');
    }
  }, [sequence, workspace]);

  const handleLoad = useCallback(async (id: string) => {
    if (workspace.useCloud) {
      const loaded = await workspace.loadSequence(id);
      if (!loaded) {
        toast.error('Failed to load sequence');
        return;
      }
      setSequence(loaded);
      setSelectedSceneIds(new Set());
      toast.success(`Loaded "${loaded.name}"`);
    } else {
      const loaded = loadSequence(id);
      if (!loaded) {
        toast.error('Failed to load sequence');
        return;
      }
      setSequence(loaded);
      setSelectedSceneIds(new Set());
      toast.success(`Loaded "${loaded.name}"`);
    }
  }, [workspace.useCloud, workspace.loadSequence]);

  const openExportMp4Dialog = useCallback(() => {
    setExportWidth(sequence.width);
    setExportHeight(sequence.height);
    setExportFps(sequence.fps);
    setExportMp4Progress(0);
    setExportMp4Blob(null);
    setExportMp4Error(null);
    setExportMp4Exporting(false);
    setExportMp4Open(true);
  }, [sequence.width, sequence.height, sequence.fps]);

  const startExportMp4 = useCallback(async () => {
    if (sequence.scenes.length === 0) {
      setExportMp4Error('Sequence has no scenes');
      return;
    }
    setExportMp4Exporting(true);
    setExportMp4Error(null);
    setExportMp4Blob(null);
    exportAbortRef.current = new AbortController();
    try {
      const blob = await exportToMp4({
        sequence,
        animations: animationsMap,
        width: exportWidth,
        height: exportHeight,
        fps: exportFps,
        onProgress: setExportMp4Progress,
        signal: exportAbortRef.current.signal,
      });
      setExportMp4Blob(blob);
      setExportMp4Progress(100);
      toast.success('Export complete');
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') {
        setExportMp4Error('Export cancelled');
      } else {
        setExportMp4Error(err instanceof Error ? err.message : 'Export failed');
      }
    } finally {
      setExportMp4Exporting(false);
      exportAbortRef.current = null;
    }
  }, [sequence, animationsMap, exportWidth, exportHeight, exportFps]);

  const cancelExportMp4 = useCallback(() => {
    exportAbortRef.current?.abort();
  }, []);

  const downloadExportMp4 = useCallback(() => {
    if (!exportMp4Blob) return;
    const url = URL.createObjectURL(exportMp4Blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${sequence.name || 'sequence'}.mp4`;
    a.click();
    URL.revokeObjectURL(url);
  }, [exportMp4Blob, sequence.name]);

  const handleSequenceUpdate = useCallback((updates: Partial<Sequence>) => {
    setSequence((prev) => ({ ...prev, ...updates }));
  }, []);

  const handleAudioFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    const url = URL.createObjectURL(file);
    // Place at playhead; use 10s as placeholder duration for lane-finding (waveform will set actual)
    const placeholderDurationMs = 10000;
    const freeLane = findFreeLaneForAudio(
      sequence.scenes,
      sequence.audioClips || [],
      currentTimeMs,
      placeholderDurationMs
    );
    const newClip: AudioClipEntry = {
      clipId: generateAudioClipId(),
      audioUrl: url,
      audioFilename: file.name,
      fullDurationMs: 0, // Will be filled in by waveform effect
      trimStartMs: 0,
      trimEndMs: 0, // 0 means full duration, resolved by waveform effect
      volume: 1,
      startMs: currentTimeMs,
      lane: freeLane,
      label: file.name.replace(/\.[^.]+$/, ''),
    };
    setSequence((prev) => ({
      ...prev,
      audioClips: [...prev.audioClips, newClip],
    }));
    setSelectedSceneIds(new Set());
    setSelectedAudioClipId(newClip.clipId);
    toast.success(`Audio "${file.name}" added to timeline`);
  }, [sequence.scenes, sequence.audioClips, currentTimeMs]);

  const openAudioPicker = useCallback(() => audioFileInputRef.current?.click(), []);

  // ─── Audio clip operations ──────────────────────────────────────────────────

  const updateAudioClip = useCallback((clipId: string, updates: Partial<AudioClipEntry>) => {
    setSequence((prev) => ({
      ...prev,
      audioClips: prev.audioClips.map((c) =>
        c.clipId === clipId ? { ...c, ...updates } : c
      ),
    }));
  }, []);

  const removeAudioClip = useCallback((clipId: string) => {
    setSequence((prev) => ({
      ...prev,
      audioClips: prev.audioClips.filter((c) => c.clipId !== clipId),
    }));
    setSelectedAudioClipId((prev) => (prev === clipId ? null : prev));
  }, []);

  const duplicateAudioClip = useCallback((clipId: string) => {
    const clip = sequence.audioClips?.find((c) => c.clipId === clipId);
    if (!clip) return;
    const durationMs = Math.max(1, (clip.trimEndMs - clip.trimStartMs) || clip.fullDurationMs || 1000);
    // Do NOT exclude original — we need a lane that's truly free (including the original)
    const freeLane = findFreeLaneForAudio(
      sequence.scenes,
      sequence.audioClips || [],
      clip.startMs,
      durationMs
    );
    const newClip: AudioClipEntry = {
      ...clip,
      clipId: generateAudioClipId(),
      startMs: clip.startMs,
      lane: freeLane,
      label: clip.label ? `${clip.label} (copy)` : clip.label,
    };
    setSequence((prev) => ({ ...prev, audioClips: [...prev.audioClips, newClip] }));
    setSelectedAudioClipId(newClip.clipId);
  }, [sequence.scenes, sequence.audioClips]);

  const handleSelectAudioClip = useCallback((id: string | null) => {
    setSelectedAudioClipId(id);
    if (id) setSelectedSceneIds(new Set()); // deselect scenes when selecting audio
  }, []);

  // ─── Selection helpers for Timeline ─────────────────────────────────────────

  const handleTimelineSelectScene = useCallback((id: string | null, additive?: boolean) => {
    if (id === null) {
      if (!additive) setSelectedSceneIds(new Set());
    } else if (additive) {
      setSelectedSceneIds(prev => {
        const next = new Set(prev);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        return next;
      });
    } else {
      setSelectedSceneIds(new Set([id]));
    }
    if (id) setSelectedAudioClipId(null); // deselect audio when selecting a scene
  }, []);

  const handleTimelineMarqueeSelect = useCallback((ids: string[], additive: boolean) => {
    if (additive) {
      setSelectedSceneIds(prev => {
        const next = new Set(prev);
        ids.forEach(id => next.add(id));
        return next;
      });
    } else {
      setSelectedSceneIds(new Set(ids));
    }
  }, []);

  // ─── Keyboard shortcuts ───────────────────────────────────────────────────

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;

      // Undo / Redo
      if ((e.metaKey || e.ctrlKey) && e.key === 'z') {
        e.preventDefault();
        if (e.shiftKey) {
          redo();
        } else {
          undo();
        }
        return;
      }

      // Copy
      if ((e.metaKey || e.ctrlKey) && e.key === 'c') {
        if (selectedSceneIds.size > 0) {
          e.preventDefault();
          const items = sequence.scenes.filter((s) => selectedSceneIds.has(s.sceneId));
          if (items.length > 0) {
            const timings = getSceneTimings(sequence.scenes);
            const copiedTimings = items.map((s) => {
              const idx = sequence.scenes.findIndex((x) => x.sceneId === s.sceneId);
              return timings[idx] ?? { startMs: 0, endMs: s.durationMs };
            });
            clipboardRef.current = { type: 'scenes', items: items.map((s) => ({ ...s })), timings: copiedTimings };
          }
        } else if (selectedAudioClipId) {
          e.preventDefault();
          const clip = sequence.audioClips?.find((c) => c.clipId === selectedAudioClipId);
          if (clip) clipboardRef.current = { type: 'audio', items: [{ ...clip }] };
        }
        return;
      }

      // Paste (at playhead, no overlap)
      if ((e.metaKey || e.ctrlKey) && e.key === 'v') {
        const cb = clipboardRef.current;
        if (!cb) return;
        e.preventDefault();
        if (cb.type === 'scenes') {
          const primaryScenes = sequence.scenes.filter((s) => (s.lane ?? 0) === 0);
          const primaryTimings = getSceneTimings(primaryScenes);
          const minStart = Math.min(...cb.timings.map((t) => t.startMs));
          const idMap = new Map<string, string>();
          const newScenes: SceneEntry[] = cb.items.map((s) => {
            const newId = generateSceneId();
            idMap.set(s.sceneId, newId);
            return { ...s, sceneId: newId };
          });
          const primaryNew = newScenes.filter((s) => (s.lane ?? 0) === 0);
          const overlayNew = newScenes.filter((s) => (s.lane ?? 0) !== 0);
          let cursor = 0;
          let insertIndex = 0;
          for (let k = 0; k < primaryScenes.length; k++) {
            if (cursor <= currentTimeMs) insertIndex = k;
            const end = primaryTimings[k]?.endMs ?? 0;
            cursor = end - (primaryScenes[k].transition?.durationMs ?? 0);
          }
          if (cursor <= currentTimeMs) insertIndex = primaryScenes.length;
          const futurePrimary = [...primaryScenes];
          futurePrimary.splice(insertIndex, 0, ...primaryNew);
          const futurePrimaryTimings = getSceneTimings(futurePrimary);
          let scenesSoFar = [...sequence.scenes];
          for (const s of overlayNew) {
            const i = newScenes.indexOf(s);
            const origTiming = i >= 0 ? cb.timings[i] : undefined;
            const tStart = currentTimeMs + ((origTiming?.startMs ?? 0) - minStart);
            const tEnd = tStart + s.durationMs;
            const freeLane = findFreeLaneForOverlay(scenesSoFar, sequence.audioClips || [], tStart, tEnd);
            const anchorIdx = futurePrimaryTimings.findIndex((t) => tStart >= t.startMs && tStart < t.endMs);
            const anchor = anchorIdx >= 0 ? futurePrimary[anchorIdx] : futurePrimary[futurePrimary.length - 1];
            const anchorStart = anchor && anchorIdx >= 0 ? futurePrimaryTimings[anchorIdx].startMs : 0;
            s.lane = freeLane;
            s.connectedTo = anchor?.sceneId;
            s.connectedOffsetMs = anchor ? Math.round(tStart - anchorStart) : 0;
            scenesSoFar = [...scenesSoFar, s];
          }
          setSequence((prev) => {
            const primaryWithout = prev.scenes.filter((s) => (s.lane ?? 0) === 0);
            const connected = prev.scenes.filter((s) => (s.lane ?? 0) !== 0);
            const newPrimary = [...primaryWithout];
            newPrimary.splice(insertIndex, 0, ...primaryNew);
            return { ...prev, scenes: [...newPrimary, ...connected, ...overlayNew] };
          });
          setSelectedSceneIds(new Set(newScenes.map((s) => s.sceneId)));
        } else if (cb.type === 'audio') {
          const pasted: AudioClipEntry[] = [];
          let pasteStartMs = currentTimeMs;
          for (const clip of cb.items) {
            const durationMs = Math.max(1, (clip.trimEndMs - clip.trimStartMs) || clip.fullDurationMs || 1000);
            const freeLane = findFreeLaneForAudio(
              sequence.scenes,
              [...(sequence.audioClips || []), ...pasted],
              pasteStartMs,
              durationMs
            );
            pasted.push({
              ...clip,
              clipId: generateAudioClipId(),
              startMs: pasteStartMs,
              lane: freeLane,
              label: clip.label ? `${clip.label} (copy)` : clip.label,
            });
            pasteStartMs += durationMs;
          }
          setSequence((prev) => ({ ...prev, audioClips: [...prev.audioClips, ...pasted] }));
          setSelectedAudioClipId(pasted[pasted.length - 1]?.clipId ?? null);
          setSelectedSceneIds(new Set());
        }
        return;
      }

      if (e.key === 'Delete' || e.key === 'Backspace') {
        // Priority: selected keyframes > selected scenes > selected audio clips
        if (selectedKfs.length > 0) {
          e.preventDefault();
          // Delete all selected keyframes
          setSequence((prev) => {
            let scenes = [...prev.scenes];
            for (const kf of selectedKfs) {
              const idx = scenes.findIndex((s) => s.sceneId === kf.sceneId);
              if (idx < 0) continue;
              const scene = scenes[idx];
              const track = scene.keyframes?.[kf.trackKey];
              if (!track || !track[kf.kfIdx]) continue;
              const newTracks = removeKeyframe(scene.keyframes, kf.trackKey, track[kf.kfIdx].time);
              const hasKfs = Object.values(newTracks).some((t) => t && t.length > 0);
              scenes[idx] = { ...scene, keyframes: hasKfs ? newTracks : undefined };
            }
            return { ...prev, scenes };
          });
          setSelectedKfs([]);
        } else if (selectedSceneIds.size > 0) {
          e.preventDefault();
          setSequence((prev) => ({
            ...prev,
            scenes: prev.scenes.filter((s) => !selectedSceneIds.has(s.sceneId)),
          }));
          setSelectedSceneIds(new Set());
        } else if (selectedAudioClipId) {
          e.preventDefault();
          setSequence((prev) => ({
            ...prev,
            audioClips: prev.audioClips.filter((c) => c.clipId !== selectedAudioClipId),
          }));
          setSelectedAudioClipId(null);
        }
      }
      if (e.key === ' ') {
        e.preventDefault();
        togglePlay();
      }
      if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
        e.preventDefault();
        const frameDurationMs = 1000 / sequence.fps; // milliseconds per frame
        const framesToMove = e.shiftKey ? 10 : 1;
        const deltaMs = (e.key === 'ArrowLeft' ? -1 : 1) * framesToMove * frameDurationMs;
        const newTimeMs = Math.max(0, Math.min(totalDurationMs, currentTimeMs + deltaMs));
        handleSeek(newTimeMs);
      }
      if (e.key === 'Escape') {
        if (selectedKfs.length > 0) {
          setSelectedKfs([]);
        } else {
          setSelectedSceneIds(new Set());
          setSelectedAudioClipId(null);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedSceneIds, selectedAudioClipId, selectedKfs, togglePlay, undo, redo, sequence, currentTimeMs, totalDurationMs, handleSeek]);

  // ─── Canvas zoom/pan ──────────────────────────────────────────────────────

  const handleWheel = useCallback((e: React.WheelEvent) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      setCanvasZoom((z) => Math.min(5, Math.max(0.1, z - e.deltaY * 0.002)));
    } else {
      setCanvasPan((p) => ({ x: p.x - e.deltaX, y: p.y - e.deltaY }));
    }
  }, []);


  const handlePanMove = useCallback((e: React.MouseEvent) => {
    if (!isPanning) return;
    setCanvasPan({
      x: panStartRef.current.panX + (e.clientX - panStartRef.current.x),
      y: panStartRef.current.panY + (e.clientY - panStartRef.current.y),
    });
  }, [isPanning]);

  const handlePanEnd = useCallback(() => { setIsPanning(false); }, []);

  const zoomIn = () => setCanvasZoom((z) => Math.min(5, z + 0.25));
  const zoomOut = () => setCanvasZoom((z) => Math.max(0.1, z - 0.25));
  const zoomReset = () => { setCanvasZoom(1); setCanvasPan({ x: 0, y: 0 }); };

  // ─── Canvas marquee + click to select / deselect ──────────────────────────

  const [isCanvasMarqueeing, setIsCanvasMarqueeing] = useState(false);
  const canvasMarqueeOriginRef = useRef({ startX: 0, startY: 0, shiftKey: false, targetIsCanvas: false });
  const [canvasMarqueeRect, setCanvasMarqueeRect] = useState<{ x: number; y: number; w: number; h: number } | null>(null);
  const canvasAreaRef = useRef<HTMLDivElement>(null);

  const handleCanvasAreaMouseDown = useCallback((e: React.MouseEvent) => {
    // Middle button = pan
    if (e.button === 1) {
      e.preventDefault();
      setIsPanning(true);
      panStartRef.current = { x: e.clientX, y: e.clientY, panX: canvasPan.x, panY: canvasPan.y };
      return;
    }
    if (e.button !== 0) return;

    const target = e.target as HTMLElement;
    if (target.closest('[data-zoom-controls]') || target.closest('[data-bbox]')) return;
    if (isDraggingOnCanvas || isScaling) return;
    if (Date.now() - lastInteractionEndRef.current < 100) return;

    canvasMarqueeOriginRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      shiftKey: e.shiftKey,
      targetIsCanvas: target === canvasRef.current,
    };
    setIsCanvasMarqueeing(true);
  }, [canvasPan, isDraggingOnCanvas, isScaling]);

  useEffect(() => {
    if (!isCanvasMarqueeing) return;

    const THRESHOLD = 4;
    let active = false;
    const { startX, startY, shiftKey, targetIsCanvas } = canvasMarqueeOriginRef.current;

    const handleMove = (e: MouseEvent) => {
      if (!active && Math.hypot(e.clientX - startX, e.clientY - startY) > THRESHOLD) {
        active = true;
      }
      if (active && canvasAreaRef.current) {
        const rect = canvasAreaRef.current.getBoundingClientRect();
        setCanvasMarqueeRect({
          x: Math.min(startX, e.clientX) - rect.left,
          y: Math.min(startY, e.clientY) - rect.top,
          w: Math.abs(e.clientX - startX),
          h: Math.abs(e.clientY - startY),
        });
      }
    };

    const handleUp = (e: MouseEvent) => {
      if (active) {
        // ── Marquee selection ──
        if (canvasRef.current) {
          const canvasRect = canvasRef.current.getBoundingClientRect();
          const toSeqX = (cx: number) => ((cx - canvasRect.left) / canvasRect.width) * sequence.width;
          const toSeqY = (cy: number) => ((cy - canvasRect.top) / canvasRect.height) * sequence.height;

          const mx1 = toSeqX(Math.min(startX, e.clientX));
          const my1 = toSeqY(Math.min(startY, e.clientY));
          const mx2 = toSeqX(Math.max(startX, e.clientX));
          const my2 = toSeqY(Math.max(startY, e.clientY));

          const timingsArr = getSceneTimings(sequence.scenes);
          const hitIds: string[] = [];
          for (let i = 0; i < sequence.scenes.length; i++) {
            const scene = sequence.scenes[i];
            const timing = timingsArr[i];
            if (!timing || currentTimeMs < timing.startMs || currentTimeMs >= timing.endMs) continue;
            const animation = animationsMap.get(scene.animationId);
            if (!animation) continue;
            const lp = getSceneLocalProgress(currentTimeMs, timing, scene.durationMs);
            const bbox = computeSceneBBox(scene, animation, sequence.width, sequence.height, lp);
            if (bbox.x + bbox.width >= mx1 && bbox.x <= mx2 && bbox.y + bbox.height >= my1 && bbox.y <= my2) {
              hitIds.push(scene.sceneId);
            }
          }

          if (shiftKey) {
            setSelectedSceneIds(prev => {
              const next = new Set(prev);
              hitIds.forEach(id => next.add(id));
              return next;
            });
          } else {
            setSelectedSceneIds(new Set(hitIds));
          }
        }
      } else {
        // ── Click selection ──
        if (targetIsCanvas && canvasRef.current) {
          const canvasRect = canvasRef.current.getBoundingClientRect();
          const clickX = (e.clientX - canvasRect.left) / canvasRect.width * sequence.width;
          const clickY = (e.clientY - canvasRect.top) / canvasRect.height * sequence.height;

          const timingsArr = getSceneTimings(sequence.scenes);
          for (let i = sequence.scenes.length - 1; i >= 0; i--) {
            const scene = sequence.scenes[i];
            const timing = timingsArr[i];
            if (!timing || currentTimeMs < timing.startMs || currentTimeMs >= timing.endMs) continue;
            const animation = animationsMap.get(scene.animationId);
            if (!animation) continue;
            const lp = getSceneLocalProgress(currentTimeMs, timing, scene.durationMs);
            const bbox = computeSceneBBox(scene, animation, sequence.width, sequence.height, lp);
            if (clickX >= bbox.x && clickX <= bbox.x + bbox.width && clickY >= bbox.y && clickY <= bbox.y + bbox.height) {
              if (shiftKey) {
                setSelectedSceneIds(prev => {
                  const next = new Set(prev);
                  if (next.has(scene.sceneId)) next.delete(scene.sceneId);
                  else next.add(scene.sceneId);
                  return next;
                });
              } else {
                setSelectedSceneIds(new Set([scene.sceneId]));
              }
              setIsCanvasMarqueeing(false);
              setCanvasMarqueeRect(null);
              return;
            }
          }
        }
        // Clicked on empty space — deselect (unless shift held)
        if (!shiftKey) {
          setSelectedSceneIds(new Set());
        }
      }
      setIsCanvasMarqueeing(false);
      setCanvasMarqueeRect(null);
    };

    window.addEventListener('mousemove', handleMove);
    window.addEventListener('mouseup', handleUp);
    return () => {
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('mouseup', handleUp);
    };
  }, [isCanvasMarqueeing, sequence, animationsMap, currentTimeMs]);

  // ─── Canvas hover hit-test ──────────────────────────────────────────────────

  const handleCanvasMouseMove = useCallback((e: React.MouseEvent) => {
    if (isDraggingOnCanvas || isPanning || isScaling || isCanvasMarqueeing) return;
    if (!canvasRef.current) { setHoveredSceneId(null); return; }

    const target = e.target as HTMLElement;
    // If hovering over a bounding box element, keep current hover
    if (target.closest('[data-bbox]')) return;

    const canvasRect = canvasRef.current.getBoundingClientRect();
    const hoverX = (e.clientX - canvasRect.left) / canvasRect.width * sequence.width;
    const hoverY = (e.clientY - canvasRect.top) / canvasRect.height * sequence.height;

    const timingsArr = getSceneTimings(sequence.scenes);
    // Check from top-most (last) to bottom-most (first)
    for (let i = sequence.scenes.length - 1; i >= 0; i--) {
      const scene = sequence.scenes[i];
      const timing = timingsArr[i];
      if (!timing || currentTimeMs < timing.startMs || currentTimeMs >= timing.endMs) continue;

      const animation = animationsMap.get(scene.animationId);
      if (!animation) continue;

      const lp = getSceneLocalProgress(currentTimeMs, timing, scene.durationMs);
      const bbox = computeSceneBBox(scene, animation, sequence.width, sequence.height, lp);
      if (
        hoverX >= bbox.x && hoverX <= bbox.x + bbox.width &&
        hoverY >= bbox.y && hoverY <= bbox.y + bbox.height
      ) {
        setHoveredSceneId(scene.sceneId);
        return;
      }
    }
    setHoveredSceneId(null);
  }, [sequence, animationsMap, currentTimeMs, isDraggingOnCanvas, isPanning, isScaling]);

  const handleCanvasMouseLeave = useCallback(() => { setHoveredSceneId(null); }, []);

  // ─── Canvas drag-to-move ──────────────────────────────────────────────────

  const handleBBoxMouseDown = useCallback((e: React.MouseEvent, sceneId: string) => {
    e.stopPropagation();
    e.preventDefault();
    const scene = sequence.scenes.find((s) => s.sceneId === sceneId);
    if (!scene) return;
    const baseTransform = scene.transform || DEFAULT_TRANSFORM;
    // Use the animated (keyframed) values as the starting offsets so the drag
    // feels continuous even when keyframes are driving the position.
    const sceneIdx = sequence.scenes.findIndex((s) => s.sceneId === sceneId);
    const sceneTimingsArr = getSceneTimings(sequence.scenes);
    const lp = sceneIdx >= 0 && sceneTimingsArr[sceneIdx]
      ? getSceneLocalProgress(currentTimeMs, sceneTimingsArr[sceneIdx], scene.durationMs)
      : 0;
    const animatedT = evaluateTransformKeyframes(scene.keyframes, lp, baseTransform);
    const hasKfX = getTrackKeyframeCount(scene.keyframes, 'transform.offsetX') > 0;
    const hasKfY = getTrackKeyframeCount(scene.keyframes, 'transform.offsetY') > 0;
    setIsDraggingOnCanvas(true);
    canvasDragRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      origOffsetX: animatedT.offsetX,
      origOffsetY: animatedT.offsetY,
      sceneId,
      localProgress: lp,
      hasKfX,
      hasKfY,
    };
  }, [sequence.scenes, currentTimeMs]);

  useEffect(() => {
    if (!isDraggingOnCanvas) return;
    const handleMove = (e: MouseEvent) => {
      const ref = canvasDragRef.current;
      if (!canvasRef.current) return;
      const canvasRect = canvasRef.current.getBoundingClientRect();
      const scaleX = sequence.width / canvasRect.width;
      const scaleY = sequence.height / canvasRect.height;
      const dx = (e.clientX - ref.startX) * scaleX;
      const dy = (e.clientY - ref.startY) * scaleY;
      const newOffsetX = Math.round(ref.origOffsetX + dx);
      const newOffsetY = Math.round(ref.origOffsetY + dy);

      setSequence((prev) => ({
        ...prev,
        scenes: prev.scenes.map((s) => {
          if (s.sceneId !== ref.sceneId) return s;
          const base = s.transform || DEFAULT_TRANSFORM;
          let updatedTransform = base;
          let updatedKfs = s.keyframes;

          // If the property is keyframed, add/update a keyframe at the playhead
          if (ref.hasKfX) {
            updatedKfs = setKeyframe(updatedKfs, 'transform.offsetX', ref.localProgress!, newOffsetX);
          } else {
            updatedTransform = { ...updatedTransform, offsetX: newOffsetX };
          }
          if (ref.hasKfY) {
            updatedKfs = setKeyframe(updatedKfs, 'transform.offsetY', ref.localProgress!, newOffsetY);
          } else {
            updatedTransform = { ...updatedTransform, offsetY: newOffsetY };
          }

          return {
            ...s,
            transform: updatedTransform !== base ? updatedTransform : s.transform,
            keyframes: updatedKfs !== s.keyframes ? updatedKfs : s.keyframes,
          };
        }),
      }));
    };
    const handleUp = () => { setIsDraggingOnCanvas(false); lastInteractionEndRef.current = Date.now(); };
    window.addEventListener('mousemove', handleMove);
    window.addEventListener('mouseup', handleUp);
    return () => {
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('mouseup', handleUp);
    };
  }, [isDraggingOnCanvas, sequence.width, sequence.height]);

  // ─── Corner scale drag ────────────────────────────────────────────────────

  // Corner indices: 0=TL, 1=TR, 2=BL, 3=BR
  // Anchor sign: which direction the anchor (opposite corner) is from center
  const CORNER_ANCHOR_SIGNS: [number, number][] = [
    [+1, +1], // TL drag → BR anchor
    [-1, +1], // TR drag → BL anchor
    [+1, -1], // BL drag → TR anchor
    [-1, -1], // BR drag → TL anchor
  ];

  const scaleDragRef = useRef({
    anchorScreenX: 0, anchorScreenY: 0, startDist: 1,
    origScale: 1, origOffsetX: 0, origOffsetY: 0,
    anchorSignX: 0, anchorSignY: 0,
    halfBaseW: 0, halfBaseH: 0,
    sceneId: '',
    localProgress: 0, hasKfScale: false, hasKfX: false, hasKfY: false,
  });

  /** Start scaling from a corner handle; cornerIdx identifies which corner. */
  const handleScaleMouseDown = useCallback((e: React.MouseEvent, sceneId: string, cornerIdx: number) => {
    e.stopPropagation();
    e.preventDefault();
    const scene = sequence.scenes.find((s) => s.sceneId === sceneId);
    if (!scene || !canvasRef.current) return;
    const baseTransform = scene.transform || DEFAULT_TRANSFORM;
    const animation = animationsMap.get(scene.animationId);
    if (!animation) return;

    const canvasRect = canvasRef.current.getBoundingClientRect();
    const sceneIdx = sequence.scenes.findIndex((s) => s.sceneId === sceneId);
    const sceneTimingsArr = getSceneTimings(sequence.scenes);
    const lp = sceneIdx >= 0 && sceneTimingsArr[sceneIdx]
      ? getSceneLocalProgress(currentTimeMs, sceneTimingsArr[sceneIdx], scene.durationMs)
      : 0;
    const animatedT = evaluateTransformKeyframes(scene.keyframes, lp, baseTransform);
    const bbox = computeSceneBBox(scene, animation, sequence.width, sequence.height, lp);

    const [anchorSignX, anchorSignY] = CORNER_ANCHOR_SIGNS[cornerIdx];

    const anchorSeqX = bbox.x + bbox.width / 2 + anchorSignX * bbox.width / 2;
    const anchorSeqY = bbox.y + bbox.height / 2 + anchorSignY * bbox.height / 2;

    const anchorScreenX = canvasRect.left + (anchorSeqX / sequence.width) * canvasRect.width;
    const anchorScreenY = canvasRect.top + (anchorSeqY / sequence.height) * canvasRect.height;

    const startDist = Math.max(10, Math.hypot(e.clientX - anchorScreenX, e.clientY - anchorScreenY));

    const animW = animation.width ?? 800;
    const animH = animation.height ?? 600;
    const fitScale = Math.min(sequence.width / animW, sequence.height / animH);
    const halfBaseW = animW * fitScale / 2;
    const halfBaseH = animH * fitScale / 2;

    const hasKfScale = getTrackKeyframeCount(scene.keyframes, 'transform.scale') > 0;
    const hasKfX = getTrackKeyframeCount(scene.keyframes, 'transform.offsetX') > 0;
    const hasKfY = getTrackKeyframeCount(scene.keyframes, 'transform.offsetY') > 0;

    setIsScaling(true);
    scaleDragRef.current = {
      anchorScreenX, anchorScreenY, startDist,
      origScale: animatedT.scale,
      origOffsetX: animatedT.offsetX,
      origOffsetY: animatedT.offsetY,
      anchorSignX, anchorSignY,
      halfBaseW, halfBaseH,
      sceneId,
      localProgress: lp, hasKfScale, hasKfX, hasKfY,
    };
  }, [sequence.scenes, animationsMap, sequence.width, sequence.height, currentTimeMs]);

  useEffect(() => {
    if (!isScaling) return;
    const handleMove = (e: MouseEvent) => {
      const ref = scaleDragRef.current;
      const currentDist = Math.max(10, Math.hypot(e.clientX - ref.anchorScreenX, e.clientY - ref.anchorScreenY));
      const ratio = currentDist / ref.startDist;
      const newScale = Math.max(0.1, Math.min(5, Math.round(ref.origScale * ratio * 100) / 100));

      const newOffsetX = Math.round(ref.origOffsetX + ref.anchorSignX * ref.halfBaseW * (ref.origScale - newScale));
      const newOffsetY = Math.round(ref.origOffsetY + ref.anchorSignY * ref.halfBaseH * (ref.origScale - newScale));

      setSequence((prev) => ({
        ...prev,
        scenes: prev.scenes.map((s) => {
          if (s.sceneId !== ref.sceneId) return s;
          const base = s.transform || DEFAULT_TRANSFORM;
          let updatedTransform = base;
          let updatedKfs = s.keyframes;

          if (ref.hasKfScale) {
            updatedKfs = setKeyframe(updatedKfs, 'transform.scale', ref.localProgress, newScale);
          } else {
            updatedTransform = { ...updatedTransform, scale: newScale };
          }
          if (ref.hasKfX) {
            updatedKfs = setKeyframe(updatedKfs, 'transform.offsetX', ref.localProgress, newOffsetX);
          } else {
            updatedTransform = { ...updatedTransform, offsetX: newOffsetX };
          }
          if (ref.hasKfY) {
            updatedKfs = setKeyframe(updatedKfs, 'transform.offsetY', ref.localProgress, newOffsetY);
          } else {
            updatedTransform = { ...updatedTransform, offsetY: newOffsetY };
          }

          return {
            ...s,
            transform: updatedTransform !== base ? updatedTransform : s.transform,
            keyframes: updatedKfs !== s.keyframes ? updatedKfs : s.keyframes,
          };
        }),
      }));
    };
    const handleUp = () => { setIsScaling(false); lastInteractionEndRef.current = Date.now(); };
    window.addEventListener('mousemove', handleMove);
    window.addEventListener('mouseup', handleUp);
    return () => {
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('mouseup', handleUp);
    };
  }, [isScaling]);

  // ─── Scene operations ─────────────────────────────────────────────────────

  const addScene = (animationId: string) => {
    const entry = animations.find((e) => getAnimationId(e) === animationId);
    if (!entry) return;
    const name = getAnimationName(entry);
    const durationMs = entry.definition.durationMs ?? 3000;
    const newScene: SceneEntry = {
      sceneId: generateSceneId(),
      animationId,
      durationMs,
      transition: { type: 'cut', durationMs: 0 },
      label: name,
      lane: 0,
    };
    setSequence((prev) => {
      const primary = prev.scenes.filter((s) => (s.lane ?? 0) === 0);
      const connected = prev.scenes.filter((s) => (s.lane ?? 0) !== 0);
      const primaryTimings = getSceneTimings(primary);
      let cursor = 0;
      let insertIndex = 0;
      for (let k = 0; k < primary.length; k++) {
        if (cursor <= currentTimeMs) insertIndex = k;
        const end = primaryTimings[k]?.endMs ?? 0;
        cursor = end - (primary[k].transition?.durationMs ?? 0);
      }
      if (cursor <= currentTimeMs) insertIndex = primary.length;
      const newPrimary = [...primary];
      newPrimary.splice(insertIndex, 0, newScene);
      return { ...prev, scenes: [...newPrimary, ...connected] };
    });
    setSelectedSceneIds(new Set([newScene.sceneId]));
    setPickerOpen(false);
    setPickerSearch('');
    toast.success(`Added "${name}" to timeline`);
  };

  const addCustomCodeScene = () => {
    const error = validateCustomCode(customCode);
    if (error) {
      setCustomCodeError(error);
      toast.error(`Invalid code: ${error}`);
      return;
    }
    const config = { ...customCodeConfig };
    const name = config.name || 'Custom Animation';
    const animId = `custom-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const durationMs = config.durationMs ?? 3000;
    const newScene: SceneEntry = {
      sceneId: generateSceneId(),
      animationId: animId,
      durationMs,
      transition: { type: 'cut', durationMs: 0 },
      label: name,
      customCode,
      customCodeConfig: config,
      lane: 0,
    };
    setSequence((prev) => {
      const primary = prev.scenes.filter((s) => (s.lane ?? 0) === 0);
      const connected = prev.scenes.filter((s) => (s.lane ?? 0) !== 0);
      const primaryTimings = getSceneTimings(primary);
      let cursor = 0;
      let insertIndex = 0;
      for (let k = 0; k < primary.length; k++) {
        if (cursor <= currentTimeMs) insertIndex = k;
        const end = primaryTimings[k]?.endMs ?? 0;
        cursor = end - (primary[k].transition?.durationMs ?? 0);
      }
      if (cursor <= currentTimeMs) insertIndex = primary.length;
      const newPrimary = [...primary];
      newPrimary.splice(insertIndex, 0, newScene);
      return { ...prev, scenes: [...newPrimary, ...connected] };
    });
    setSelectedSceneIds(new Set([newScene.sceneId]));
    setPickerOpen(false);
    setPickerTab('gallery');
    toast.success(`Added custom code scene "${name}" to timeline`);
  };

  const removeScene = (sceneId: string) => {
    setSequence((prev) => ({ ...prev, scenes: prev.scenes.filter((s) => s.sceneId !== sceneId) }));
    setSelectedSceneIds(prev => {
      if (!prev.has(sceneId)) return prev;
      const next = new Set(prev);
      next.delete(sceneId);
      return next;
    });
  };

  const duplicateScene = (sceneId: string) => {
    const idx = sequence.scenes.findIndex((s) => s.sceneId === sceneId);
    if (idx === -1) return;
    const original = sequence.scenes[idx];
    const timings = getSceneTimings(sequence.scenes);
    const timing = timings[idx];
    const startMs = timing?.startMs ?? 0;
    const endMs = timing?.endMs ?? startMs + original.durationMs;
    const lane = original.lane ?? 0;

    const copy: SceneEntry = {
      ...original,
      sceneId: generateSceneId(),
      label: original.label ? `${original.label} (copy)` : undefined,
    };

    if (lane === 0) {
      // Primary: insert after original (sequential, no overlap)
      const newScenes = [...sequence.scenes];
      newScenes.splice(idx + 1, 0, copy);
      setSequence((prev) => ({ ...prev, scenes: newScenes }));
    } else {
      // Overlay: find free lane to avoid overlap
      const freeLane = findFreeLaneForOverlay(
        sequence.scenes,
        sequence.audioClips || [],
        startMs,
        endMs,
        sceneId
      );
      const primaryScenes = sequence.scenes.filter((s) => (s.lane ?? 0) === 0);
      const primaryTimings = getSceneTimings(primaryScenes);
      const anchorIdx = primaryTimings.findIndex((t) => startMs >= t.startMs && startMs < t.endMs);
      const anchor = anchorIdx >= 0 ? primaryScenes[anchorIdx] : primaryScenes[primaryScenes.length - 1];
      const anchorStart = anchor && anchorIdx >= 0 ? primaryTimings[anchorIdx].startMs : 0;
      copy.lane = freeLane;
      copy.connectedTo = anchor?.sceneId;
      copy.connectedOffsetMs = anchor ? Math.round(startMs - anchorStart) : 0;
      setSequence((prev) => ({ ...prev, scenes: [...prev.scenes, copy] }));
    }
    setSelectedSceneIds(new Set([copy.sceneId]));
  };

  const updateScene = (sceneId: string, updates: Partial<SceneEntry>) => {
    setSequence((prev) => ({
      ...prev,
      scenes: prev.scenes.map((s) => s.sceneId === sceneId ? { ...s, ...updates } : s),
    }));
  };

  // ── Composer ↔ Chat context registration ─────────────────────────────────
  const { actionsRef, setIsComposerActive } = useComposerChat();

  // Keep the ref updated with latest closures on every render
  actionsRef.current = {
    getState: () => {
      const sceneInfos: ComposerSceneInfo[] = sequence.scenes.map((s, i) => {
        const anim = animationsMap.get(s.animationId);
        let availableParams: Record<string, unknown> = {};
        let currentParams: Record<string, unknown> = { ...(s.params || {}) };
        if (anim && !isSimpleAnimation(anim)) {
          const fullAnim = anim as AnimationDefinition<Record<string, unknown>>;
          availableParams = fullAnim.params.defaults;
          currentParams = { ...fullAnim.params.defaults, ...s.params };
        }
        return {
          index: i,
          sceneId: s.sceneId,
          label: s.label || s.animationId,
          animationId: s.animationId,
          durationMs: s.durationMs,
          currentParams,
          availableParams,
          transform: s.transform || DEFAULT_TRANSFORM,
          transition: s.transition ? { type: s.transition.type, durationMs: s.transition.durationMs } : undefined,
          transparentBg: s.transparentBg ?? false,
          reversed: s.reversed ?? false,
          lane: s.lane ?? 0,
          connectedTo: s.connectedTo,
          connectedOffsetMs: s.connectedOffsetMs,
          keyframes: s.keyframes,
        };
      });

      return {
        sequence,
        scenes: sceneInfos,
        availableAnimations: animations.map((e) => ({
          id: getAnimationId(e),
          name: getAnimationName(e),
        })),
      };
    },

    updateScene: (sceneIndex: number, updates: Partial<SceneEntry>) => {
      const scene = sequence.scenes[sceneIndex];
      if (!scene) return;
      const finalUpdates = { ...updates };
      // Merge params with existing (don't replace)
      if (updates.params) {
        finalUpdates.params = { ...scene.params, ...updates.params };
      }
      // Merge transform with existing (don't replace)
      if (updates.transform) {
        finalUpdates.transform = { ...(scene.transform || DEFAULT_TRANSFORM), ...updates.transform };
      }
      updateScene(scene.sceneId, finalUpdates);
    },

    removeScene: (sceneIndex: number) => {
      const scene = sequence.scenes[sceneIndex];
      if (scene) removeScene(scene.sceneId);
    },

    addScene: (animationId: string) => addScene(animationId),

    duplicateScene: (sceneIndex: number) => {
      const scene = sequence.scenes[sceneIndex];
      if (scene) duplicateScene(scene.sceneId);
    },

    updateSequence: (updates) => handleSequenceUpdate(updates),

    addCustomCodeScene: (code: string, label: string, config?: { durationMs?: number; width?: number; height?: number; fps?: number; background?: string }) => {
      const animId = `custom-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
      const codeConfig: CustomCodeConfig = {
        name: label,
        durationMs: config?.durationMs ?? 3000,
        width: config?.width,
        height: config?.height,
        fps: config?.fps,
        background: config?.background,
      };
      const newScene: SceneEntry = {
        sceneId: generateSceneId(),
        animationId: animId,
        durationMs: codeConfig.durationMs ?? 3000,
        transition: { type: 'cut', durationMs: 0 },
        label,
        customCode: code,
        customCodeConfig: codeConfig,
      };
      setSequence((prev) => ({ ...prev, scenes: [...prev.scenes, newScene] }));
      setSelectedSceneIds(new Set([newScene.sceneId]));
    },

    moveToLane: (sceneIndex: number, targetLane: number, anchorSceneIndex?: number, offsetMs?: number) => {
      const scene = sequence.scenes[sceneIndex];
      if (!scene) return;

      if (targetLane === 0) {
        // Move back to primary storyline — clear connected properties
        updateScene(scene.sceneId, {
          lane: 0,
          connectedTo: undefined,
          connectedOffsetMs: undefined,
        });
      } else {
        // Move to a secondary lane — find anchor scene
        const primaryScenes = sequence.scenes.filter((s) => (s.lane ?? 0) === 0);
        let anchor: SceneEntry | undefined;
        if (anchorSceneIndex != null) {
          // anchorSceneIndex is the flat index in the full scenes array
          anchor = sequence.scenes[anchorSceneIndex];
        }
        if (!anchor && primaryScenes.length > 0) {
          // Default: anchor to the first primary scene
          anchor = primaryScenes[0];
        }

        updateScene(scene.sceneId, {
          lane: targetLane,
          connectedTo: anchor?.sceneId,
          connectedOffsetMs: offsetMs ?? 0,
        });
      }
    },

    setKeyframe: (sceneIndex: number, track: TransformTrackKey, time: number, value: number, easing?: EasingType) => {
      const scene = sequence.scenes[sceneIndex];
      if (!scene) return;
      const newTracks = setKeyframe(scene.keyframes, track, time, value, easing);
      updateScene(scene.sceneId, { keyframes: newTracks });
    },

    removeKeyframe: (sceneIndex: number, track: TransformTrackKey, time: number) => {
      const scene = sequence.scenes[sceneIndex];
      if (!scene) return;
      const newTracks = removeKeyframe(scene.keyframes, track, time);
      updateScene(scene.sceneId, {
        keyframes: Object.keys(newTracks).length > 0 ? newTracks : undefined,
      });
    },

    clearKeyframes: (sceneIndex: number, track?: TransformTrackKey) => {
      const scene = sequence.scenes[sceneIndex];
      if (!scene) return;
      if (track) {
        const newTracks = clearTrack(scene.keyframes, track);
        updateScene(scene.sceneId, {
          keyframes: Object.keys(newTracks).length > 0 ? newTracks : undefined,
        });
      } else {
        updateScene(scene.sceneId, { keyframes: undefined });
      }
    },
  } satisfies ComposerActions;

  // Register/unregister on mount/unmount
  useEffect(() => {
    setIsComposerActive(true);
    return () => {
      setIsComposerActive(false);
      actionsRef.current = null;
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleDropOnLane = useCallback((
    sceneId: string,
    targetLane: number,
    targetTimeMs: number
  ) => {
    const scene = sequence.scenes.find((s) => s.sceneId === sceneId);
    if (!scene) return;
    const primaryScenes = sequence.scenes.filter((s) => (s.lane ?? 0) === 0);
    const primaryTimings = getSceneTimings(primaryScenes);
    const durationMs = scene.durationMs;

    if (targetLane === 0) {
      let cursor = 0;
      let insertIndex = 0;
      for (let k = 0; k < primaryScenes.length; k++) {
        if (cursor <= targetTimeMs) insertIndex = k;
        const end = primaryTimings[k]?.endMs ?? 0;
        const overlap = primaryScenes[k].transition?.durationMs ?? 0;
        cursor = end - overlap;
      }
      if (cursor <= targetTimeMs) insertIndex = primaryScenes.length;

      const without = sequence.scenes.filter((s) => s.sceneId !== sceneId);
      const primaryWithout = without.filter((s) => (s.lane ?? 0) === 0);
      const connected = without.filter((s) => (s.lane ?? 0) !== 0);
      const newPrimary = [...primaryWithout];
      newPrimary.splice(insertIndex, 0, { ...scene, lane: 0, connectedTo: undefined, connectedOffsetMs: undefined });
      setSequence((prev) => ({ ...prev, scenes: [...newPrimary, ...connected] }));
      return;
    }

    // For overlay lanes: ensure we never place on top of existing content
    const actualLane = findFreeLaneForSceneDrop(
      sequence.scenes,
      sequence.audioClips || [],
      targetLane,
      targetTimeMs,
      durationMs,
      sceneId
    );

    const anchorIdx = primaryTimings.findIndex(
      (t) => targetTimeMs >= t.startMs && targetTimeMs < t.endMs
    );
    const anchor = anchorIdx >= 0 ? primaryScenes[anchorIdx] : primaryScenes[primaryScenes.length - 1];
    const anchorStart = anchor && anchorIdx >= 0 ? primaryTimings[anchorIdx].startMs : 0;
    updateScene(sceneId, {
      lane: actualLane,
      connectedTo: anchor?.sceneId,
      connectedOffsetMs: anchor ? Math.round(targetTimeMs - anchorStart) : 0,
    });
  }, [sequence, updateScene]);

  // ─── Derived state ────────────────────────────────────────────────────────

  // For sidebar: show the first selected scene (or null)
  const selectedScene = useMemo(
    () => {
      if (selectedSceneIds.size === 0) return null;
      const firstId = selectedSceneIds.values().next().value;
      return sequence.scenes.find((s) => s.sceneId === firstId) ?? null;
    },
    [sequence.scenes, selectedSceneIds]
  );

  // Bounding boxes for ALL selected scenes (uses keyframed transform at current time)
  const selectedBoundingBoxes = useMemo(() => {
    if (selectedSceneIds.size === 0) return [];
    const timingsArr = getSceneTimings(sequence.scenes);
    return Array.from(selectedSceneIds).map(id => {
      const idx = sequence.scenes.findIndex(s => s.sceneId === id);
      const scene = sequence.scenes[idx];
      if (!scene) return null;
      const animation = animationsMap.get(scene.animationId);
      if (!animation) return null;
      const lp = timingsArr[idx]
        ? getSceneLocalProgress(currentTimeMs, timingsArr[idx], scene.durationMs)
        : undefined;
      const bbox = computeSceneBBox(scene, animation, sequence.width, sequence.height, lp);
      return {
        sceneId: id,
        label: scene.label || scene.animationId,
        x: (bbox.x / sequence.width) * 100,
        y: (bbox.y / sequence.height) * 100,
        width: (bbox.width / sequence.width) * 100,
        height: (bbox.height / sequence.height) * 100,
      };
    }).filter(Boolean) as { sceneId: string; label: string; x: number; y: number; width: number; height: number }[];
  }, [selectedSceneIds, sequence.scenes, animationsMap, sequence.width, sequence.height, currentTimeMs]);

  // Hover bounding box — shown for any scene under the cursor that isn't selected
  const hoveredScene = hoveredSceneId && !selectedSceneIds.has(hoveredSceneId)
    ? sequence.scenes.find((s) => s.sceneId === hoveredSceneId) ?? null
    : null;
  const hoveredBoundingBox = useMemo(() => {
    if (!hoveredScene) return null;
    const animation = animationsMap.get(hoveredScene.animationId);
    if (!animation) return null;
    const idx = sequence.scenes.findIndex(s => s.sceneId === hoveredScene.sceneId);
    const timingsArr = getSceneTimings(sequence.scenes);
    const lp = idx >= 0 && timingsArr[idx]
      ? getSceneLocalProgress(currentTimeMs, timingsArr[idx], hoveredScene.durationMs)
      : undefined;
    const bbox = computeSceneBBox(hoveredScene, animation, sequence.width, sequence.height, lp);
    return {
      x: (bbox.x / sequence.width) * 100,
      y: (bbox.y / sequence.height) * 100,
      width: (bbox.width / sequence.width) * 100,
      height: (bbox.height / sequence.height) * 100,
    };
  }, [hoveredScene, animationsMap, sequence.width, sequence.height, currentTimeMs, sequence.scenes]);

  const selectedAudioClip = useMemo(
    () => sequence.audioClips?.find((c) => c.clipId === selectedAudioClipId) ?? null,
    [sequence.audioClips, selectedAudioClipId]
  );

  const timings = useMemo(() => getSceneTimings(sequence.scenes), [sequence.scenes]);

  // Timing for the selected scene (for keyframe placement in sidebar)
  const selectedSceneTiming = useMemo(() => {
    if (!selectedScene) return undefined;
    const idx = sequence.scenes.findIndex((s) => s.sceneId === selectedScene.sceneId);
    return idx >= 0 ? timings[idx] : undefined;
  }, [selectedScene, sequence.scenes, timings]);

  const filteredAnimations = useMemo(() => {
    if (!pickerSearch.trim()) return animations;
    const q = pickerSearch.toLowerCase();
    return animations.filter((entry) => {
      const name = getAnimationName(entry).toLowerCase();
      const id = getAnimationId(entry).toLowerCase();
      const tags = entry.meta?.tags?.join(' ').toLowerCase() ?? '';
      return name.includes(q) || id.includes(q) || tags.includes(q);
    });
  }, [animations, pickerSearch]);

  // ─── Custom code preview animation ──────────────────────────────────────
  useEffect(() => {
    if (!pickerOpen || pickerTab !== 'code') {
      if (customCodeRafRef.current !== null) {
        cancelAnimationFrame(customCodeRafRef.current);
        customCodeRafRef.current = null;
      }
      return;
    }

    const canvas = customCodePreviewRef.current;
    if (!canvas) return;

    const compiled = compileCustomCode(customCode, customCodeConfig);
    if (!compiled) {
      setCustomCodeError(validateCustomCode(customCode));
      return;
    }
    setCustomCodeError(null);

    const previewCtx = canvas.getContext('2d');
    if (!previewCtx) return;

    const w = customCodeConfig.width || 800;
    const h = customCodeConfig.height || 600;
    // Scale preview to fit inside 320px wide box
    const previewScale = Math.min(320 / w, 180 / h);
    canvas.width = Math.round(w * previewScale * (window.devicePixelRatio || 1));
    canvas.height = Math.round(h * previewScale * (window.devicePixelRatio || 1));
    canvas.style.width = `${Math.round(w * previewScale)}px`;
    canvas.style.height = `${Math.round(h * previewScale)}px`;

    const durationMs = customCodeConfig.durationMs || 3000;
    let startTime: number | null = null;

    function animate(timestamp: number) {
      if (!startTime) startTime = timestamp;
      const elapsed = (timestamp - startTime) % durationMs;
      const progress = elapsed / durationMs;

      previewCtx!.save();
      previewCtx!.setTransform(1, 0, 0, 1, 0, 0);
      previewCtx!.clearRect(0, 0, canvas!.width, canvas!.height);
      previewCtx!.scale(
        previewScale * (window.devicePixelRatio || 1),
        previewScale * (window.devicePixelRatio || 1)
      );

      compiled!.render(previewCtx as unknown as CanvasRenderingContext2D, {
        width: w,
        height: h,
        progress,
      });
      previewCtx!.restore();

      customCodeRafRef.current = requestAnimationFrame(animate);
    }

    customCodeRafRef.current = requestAnimationFrame(animate);

    return () => {
      if (customCodeRafRef.current !== null) {
        cancelAnimationFrame(customCodeRafRef.current);
        customCodeRafRef.current = null;
      }
    };
  }, [pickerOpen, pickerTab, customCode, customCodeConfig]);

  // Counter-scale for handles/labels so they stay constant size regardless of zoom
  const counterScale = 1 / canvasZoom;

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="h-screen bg-background flex flex-col overflow-hidden">
      {/* ── Header ── */}
      <header className="sticky top-0 z-40 border-b bg-background flex-shrink-0">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between gap-2">
          <div className="flex items-center gap-3 min-w-0">
            <Button variant="ghost" size="icon" asChild className="flex-shrink-0" title="Gallery">
              <Link to="/"><ArrowLeft className="h-5 w-5" /></Link>
            </Button>
            <Button variant="ghost" size="icon" asChild className="flex-shrink-0" title="Sequences">
              <Link to="/?tab=sequences"><Film className="h-5 w-5" /></Link>
            </Button>
            <div className="flex items-center gap-2 min-w-0">
              <Layers className="h-4 w-4 text-muted-foreground flex-shrink-0" />
              <input
                type="text"
                value={sequence.name}
                onChange={(e) => setSequence((prev) => ({ ...prev, name: e.target.value }))}
                className="text-lg font-semibold bg-transparent border-none outline-none focus:ring-0 min-w-0 w-full"
                placeholder="Untitled Sequence"
              />
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <div className="hidden sm:flex items-center gap-1.5 text-xs text-muted-foreground">
              <span>{sequence.scenes.length} scene{sequence.scenes.length !== 1 ? 's' : ''}</span>
              <span>·</span>
              <span>{formatTime(totalDurationMs)}</span>
              <span>·</span>
              <span>{sequence.width}×{sequence.height}</span>
            </div>
            <Button variant="ghost" size="sm" className="h-8 gap-1.5" onClick={handleSave}>
              <Save className="h-3.5 w-3.5" />
              <span className="hidden sm:inline text-xs">Save</span>
            </Button>
            {workspace.useCloud && (
              <Button variant="outline" size="sm" className="h-8 gap-1.5" onClick={handlePromote} title="Make public">
                <Globe className="h-3.5 w-3.5" />
                <span className="hidden sm:inline text-xs">Make Public</span>
              </Button>
            )}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="h-8 gap-1.5">
                  <FolderOpen className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline text-xs">Load</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="max-h-64 overflow-y-auto">
                <DropdownMenuLabel>Saved sequences{workspace.useCloud && ' (cloud)'}</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {workspace.useCloud && workspace.sequencesLoading ? (
                  <DropdownMenuItem disabled>Loading...</DropdownMenuItem>
                ) : (workspace.useCloud ? workspace.sequences : listSavedSequences()).length === 0 ? (
                  <DropdownMenuItem disabled>No saved sequences</DropdownMenuItem>
                ) : (
                  (workspace.useCloud ? workspace.sequences : listSavedSequences()).map((meta) => (
                    <DropdownMenuItem
                      key={meta.id}
                      onClick={() => handleLoad(meta.id)}
                    >
                      <span className="truncate">{meta.name}</span>
                      <span className="text-muted-foreground text-xs ml-1 shrink-0">
                        {meta.sceneCount} · {formatTime(meta.durationMs)}
                      </span>
                    </DropdownMenuItem>
                  ))
                )}
                
              </DropdownMenuContent>
            </DropdownMenu>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 gap-1.5"
              onClick={openExportMp4Dialog}
              disabled={sequence.scenes.length === 0}
            >
              <Film className="h-3.5 w-3.5" />
              <span className="hidden sm:inline text-xs">Export MP4</span>
            </Button>
            <input
              ref={audioFileInputRef}
              type="file"
              accept="audio/*"
              className="hidden"
              onChange={handleAudioFileSelect}
            />
            {auth.isConfigured && (
              auth.user ? (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm" className="h-8 gap-1.5">
                      <User className="h-3.5 w-3.5" />
                      <span className="hidden sm:inline text-xs max-w-[120px] truncate">
                        {auth.user.email}
                      </span>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuLabel className="font-normal">
                      {workspace.workspace?.name ?? 'Workspace'}
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => auth.signOut()}>
                      <LogOut className="h-4 w-4" />
                      Sign out
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : (
                <Button variant="ghost" size="sm" className="h-8 gap-1.5" onClick={() => setAuthDialogOpen(true)}>
                  <LogIn className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline text-xs">Sign in</span>
                </Button>
              )
            )}
            <ThemeToggle />
          </div>
        </div>
      </header>
      <AuthDialog open={authDialogOpen} onOpenChange={setAuthDialogOpen} />

      {/* ── Main area ── */}
      <div className="flex-1 flex min-h-0 overflow-hidden">
        {/* Canvas */}
        <div
          ref={canvasAreaRef}
          className="flex-1 flex items-center justify-center overflow-hidden bg-muted/30 relative"
          onWheel={handleWheel}
          onMouseDown={handleCanvasAreaMouseDown}
          onMouseMove={(e) => { handlePanMove(e); handleCanvasMouseMove(e); }}
          onMouseUp={handlePanEnd}
          onMouseLeave={() => { handlePanEnd(); handleCanvasMouseLeave(); }}
          style={{ cursor: isPanning ? 'grabbing' : isDraggingOnCanvas ? 'move' : isCanvasMarqueeing ? 'crosshair' : hoveredSceneId ? 'pointer' : undefined }}
        >
          {sequence.scenes.length === 0 ? (
            <div className="flex flex-col items-center gap-4 text-center">
              <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center">
                <Layers className="h-8 w-8 text-muted-foreground" />
              </div>
              <div>
                <h2 className="text-lg font-semibold mb-1">Start composing</h2>
                <p className="text-sm text-muted-foreground max-w-sm">
                  Add animations from your gallery to build a sequence.
                </p>
              </div>
              <Button onClick={() => setPickerOpen(true)}>
                <Plus className="h-4 w-4" /> Add First Scene
              </Button>
            </div>
          ) : null}
          <div
            ref={canvasWrapperRef}
            className="relative"
            style={{
              transform: `translate(${canvasPan.x}px, ${canvasPan.y}px) scale(${canvasZoom})`,
              transformOrigin: 'center center',
              transition: isPanning || isDraggingOnCanvas || isScaling ? 'none' : 'transform 0.1s ease-out',
            }}
          >
            <canvas
              ref={canvasRef}
              className="rounded-lg shadow-lg"
              style={{
                maxWidth: `min(100%, ${sequence.width}px)`,
                maxHeight: '100%',
                aspectRatio: `${sequence.width} / ${sequence.height}`,
                backgroundColor: sequence.background || '#000',
                display: sequence.scenes.length === 0 ? 'none' : 'block',
                cursor: isDraggingOnCanvas ? 'move' : 'default',
              }}
            />

            {/* Hover bounding box — subtle outline for scene under cursor */}
            {hoveredBoundingBox && sequence.scenes.length > 0 && (
              <div
                className="absolute pointer-events-none rounded-sm"
                style={{
                  left: `${hoveredBoundingBox.x}%`,
                  top: `${hoveredBoundingBox.y}%`,
                  width: `${hoveredBoundingBox.width}%`,
                  height: `${hoveredBoundingBox.height}%`,
                  border: `${1.5 * counterScale}px solid rgba(59, 130, 246, 0.35)`,
                }}
              >
                {/* Label — counter-scaled */}
                <div
                  className="absolute left-0 text-white/70 whitespace-nowrap rounded-sm"
                  style={{
                    top: -20 * counterScale,
                    fontSize: 10 * counterScale,
                    paddingLeft: 3 * counterScale,
                    paddingRight: 3 * counterScale,
                    paddingTop: 1 * counterScale,
                    paddingBottom: 1 * counterScale,
                    backgroundColor: 'rgba(59, 130, 246, 0.35)',
                    transformOrigin: 'bottom left',
                  }}
                >
                  {hoveredScene?.label || hoveredScene?.animationId}
                </div>
              </div>
            )}

            {/* Bounding box overlays for all selected scenes */}
            {selectedBoundingBoxes.map((bb) => (
              <div
                key={bb.sceneId}
                data-bbox
                className="absolute border-2 border-blue-500 rounded-sm"
                style={{
                  left: `${bb.x}%`,
                  top: `${bb.y}%`,
                  width: `${bb.width}%`,
                  height: `${bb.height}%`,
                  boxShadow: '0 0 0 1px rgba(59, 130, 246, 0.3)',
                  cursor: 'move',
                }}
                onMouseDown={(e) => handleBBoxMouseDown(e, bb.sceneId)}
              >
                {/* Corner scale handles — counter-scaled so they stay same screen size */}
                {[
                  { pos: '-top-1 -left-1', cursor: 'nwse-resize' },
                  { pos: '-top-1 -right-1', cursor: 'nesw-resize' },
                  { pos: '-bottom-1 -left-1', cursor: 'nesw-resize' },
                  { pos: '-bottom-1 -right-1', cursor: 'nwse-resize' },
                ].map(({ pos, cursor }, cornerIdx) => (
                  <div
                    key={cornerIdx}
                    className={`absolute ${pos} bg-blue-500 rounded-sm`}
                    style={{
                      width: 8 * counterScale,
                      height: 8 * counterScale,
                      cursor,
                    }}
                    onMouseDown={(e) => handleScaleMouseDown(e, bb.sceneId, cornerIdx)}
                  />
                ))}

                {/* Label — counter-scaled */}
                <div
                  className="absolute left-0 bg-blue-500 text-white whitespace-nowrap rounded-sm"
                  style={{
                    top: -22 * counterScale,
                    fontSize: 10 * counterScale,
                    paddingLeft: 4 * counterScale,
                    paddingRight: 4 * counterScale,
                    paddingTop: 2 * counterScale,
                    paddingBottom: 2 * counterScale,
                    transformOrigin: 'bottom left',
                  }}
                >
                  {bb.label}
                </div>
              </div>
            ))}
          </div>

          {/* Canvas marquee overlay */}
          {canvasMarqueeRect && (
            <div
              className="absolute pointer-events-none border border-blue-400 bg-blue-400/10 rounded-sm z-40"
              style={{
                left: canvasMarqueeRect.x,
                top: canvasMarqueeRect.y,
                width: canvasMarqueeRect.w,
                height: canvasMarqueeRect.h,
              }}
            />
          )}

          {/* Zoom controls */}
          {sequence.scenes.length > 0 && (
            <div data-zoom-controls className="absolute bottom-3 left-3 flex items-center gap-1 bg-background/90 backdrop-blur-sm rounded-lg border shadow-sm p-1">
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={zoomOut}>
                <ZoomOut className="h-3.5 w-3.5" />
              </Button>
              <button onClick={zoomReset}
                className="text-[11px] tabular-nums text-muted-foreground hover:text-foreground px-1.5 min-w-[3rem] text-center">
                {Math.round(canvasZoom * 100)}%
              </button>
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={zoomIn}>
                <ZoomIn className="h-3.5 w-3.5" />
              </Button>
              <div className="w-px h-4 bg-border mx-0.5" />
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={zoomReset}>
                <Maximize className="h-3.5 w-3.5" />
              </Button>
            </div>
          )}
        </div>

        {/* ── Always-visible sidebar ── */}
        <aside className="w-80 border-l bg-background overflow-y-auto flex-shrink-0 hidden lg:block">
          {selectedSceneIds.size > 1 ? (
            <div className="p-4 space-y-4">
              <h3 className="font-semibold text-sm">{selectedSceneIds.size} Scenes Selected</h3>
              <p className="text-xs text-muted-foreground">
                Hold <kbd className="px-1 py-0.5 rounded bg-muted text-[10px] font-mono">Shift</kbd> and click to toggle individual scenes. Press <kbd className="px-1 py-0.5 rounded bg-muted text-[10px] font-mono">Delete</kbd> to remove all selected.
              </p>
              <Separator />
              <div className="space-y-1">
                {Array.from(selectedSceneIds).map(id => {
                  const scene = sequence.scenes.find(s => s.sceneId === id);
                  if (!scene) return null;
                  return (
                    <div key={id} className="flex items-center gap-2 px-2 py-1.5 rounded bg-muted/50 text-xs">
                      <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: sceneColorForId(id) }} />
                      <span className="truncate flex-1">{scene.label || scene.animationId}</span>
                      <span className="text-muted-foreground tabular-nums">{formatTime(scene.durationMs)}</span>
                    </div>
                  );
                })}
              </div>
              <Separator />
              <Button variant="destructive" size="sm" className="w-full" onClick={() => {
                setSequence(prev => ({ ...prev, scenes: prev.scenes.filter(s => !selectedSceneIds.has(s.sceneId)) }));
                setSelectedSceneIds(new Set());
              }}>
                <Trash2 className="h-3.5 w-3.5" /> Remove {selectedSceneIds.size} Scenes
              </Button>
            </div>
          ) : selectedAudioClip ? (
            <AudioClipSettingsSidebar
              clip={selectedAudioClip}
              onUpdate={(updates) => updateAudioClip(selectedAudioClip.clipId, updates)}
              onRemove={() => removeAudioClip(selectedAudioClip.clipId)}
              onDuplicate={() => duplicateAudioClip(selectedAudioClip.clipId)}
            />
          ) : selectedScene ? (
            <SceneSettingsSidebar
              scene={selectedScene}
              animationsMap={animationsMap}
              audioClips={sequence.audioClips || []}
              onUpdate={(updates) => updateScene(selectedScene.sceneId, updates)}
              onDuplicate={() => duplicateScene(selectedScene.sceneId)}
              onRemove={() => removeScene(selectedScene.sceneId)}
              currentTimeMs={currentTimeMs}
              sceneTiming={selectedSceneTiming}
              selectedKfs={selectedKfs}
              onSetSelectedKfs={setSelectedKfs}
            />
          ) : (
            <SequenceSettingsSidebar
              sequence={sequence}
              onUpdate={handleSequenceUpdate}
            />
          )}
        </aside>
      </div>

      {/* ── Resize handle ── */}
      <div
        className="h-1.5 flex-shrink-0 cursor-row-resize group relative border-t hover:border-primary/40 transition-colors"
        onMouseDown={(e) => {
          e.preventDefault();
          resizeStartRef.current = { startY: e.clientY, startHeight: timelineHeight };
          setIsResizingTimeline(true);
        }}
      >
        <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-0.5 bg-border/40 group-hover:bg-primary/50 transition-colors" />
      </div>

      {/* ── Timeline ── */}
      <div className="flex-shrink-0 overflow-hidden" style={{ height: timelineHeight }}>
        <Timeline
          sequence={sequence}
          timings={timings}
          totalDurationMs={totalDurationMs}
          currentTimeMs={currentTimeMs}
          playing={playing}
          pingPong={pingPong}
          selectedSceneIds={selectedSceneIds}
          selectedKfs={selectedKfs}
          onSetSelectedKfs={setSelectedKfs}
          onSelectScene={handleTimelineSelectScene}
          onMarqueeSelect={handleTimelineMarqueeSelect}
          onSeek={handleSeek}
          onTogglePlay={togglePlay}
          onRestart={restart}
          onTogglePingPong={() => setPingPong(p => !p)}
          onOpenPicker={() => setPickerOpen(true)}
          onUpdateScene={updateScene}
          onDropOnLane={handleDropOnLane}
          selectedAudioClipId={selectedAudioClipId}
          onSelectAudioClip={handleSelectAudioClip}
          onOpenAudioPicker={openAudioPicker}
          onUpdateAudioClip={updateAudioClip}
          audioWaveforms={audioWaveforms}
        />
      </div>

      {/* ── Export MP4 Dialog ── */}
      <Dialog open={exportMp4Open} onOpenChange={(open) => { if (!open && !exportMp4Exporting) setExportMp4Open(false); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Export MP4</DialogTitle>
            <DialogDescription>Choose resolution and FPS, then start export. Cancel to abort.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Width</Label>
                <Input
                  type="number"
                  min={320}
                  max={3840}
                  value={exportWidth}
                  onChange={(e) => setExportWidth(Number(e.target.value) || sequence.width)}
                  disabled={exportMp4Exporting}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Height</Label>
                <Input
                  type="number"
                  min={240}
                  max={2160}
                  value={exportHeight}
                  onChange={(e) => setExportHeight(Number(e.target.value) || sequence.height)}
                  disabled={exportMp4Exporting}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">FPS</Label>
                <Input
                  type="number"
                  min={24}
                  max={60}
                  value={exportFps}
                  onChange={(e) => setExportFps(Number(e.target.value) || sequence.fps)}
                  disabled={exportMp4Exporting}
                />
              </div>
            </div>
            {exportMp4Exporting && (
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Encoding…</span>
                  <span>{exportMp4Progress}%</span>
                </div>
                <div className="h-2 rounded-full bg-muted overflow-hidden">
                  <div
                    className="h-full bg-primary transition-[width] duration-200"
                    style={{ width: `${exportMp4Progress}%` }}
                  />
                </div>
              </div>
            )}
            {exportMp4Error && (
              <p className="text-sm text-destructive">{exportMp4Error}</p>
            )}
          </div>
          <div className="flex justify-end gap-2">
            {exportMp4Exporting ? (
              <Button variant="outline" size="sm" onClick={cancelExportMp4}>
                Cancel
              </Button>
            ) : exportMp4Blob ? (
              <>
                <Button variant="outline" size="sm" onClick={() => setExportMp4Open(false)}>
                  Close
                </Button>
                <Button size="sm" onClick={downloadExportMp4}>
                  Download MP4
                </Button>
              </>
            ) : (
              <>
                <Button variant="outline" size="sm" onClick={() => setExportMp4Open(false)}>
                  Close
                </Button>
                <Button size="sm" onClick={startExportMp4} disabled={sequence.scenes.length === 0}>
                  Start Export
                </Button>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Picker Dialog ── */}
      <Dialog open={pickerOpen} onOpenChange={(open) => { if (!open) { setPickerOpen(false); setPickerTab('gallery'); } }}>
        <DialogContent className="max-w-3xl max-h-[85vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Add Scene</DialogTitle>
            <DialogDescription>Choose from your gallery or paste custom canvas code.</DialogDescription>
          </DialogHeader>

          {/* ── Tab switcher ── */}
          <div className="flex gap-1 p-1 bg-muted rounded-lg w-fit">
            <button
              onClick={() => setPickerTab('gallery')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                pickerTab === 'gallery'
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              Gallery
            </button>
            <button
              onClick={() => setPickerTab('code')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                pickerTab === 'code'
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Code className="w-3.5 h-3.5" />
              Custom Code
            </button>
          </div>

          {/* ── Gallery tab ── */}
          {pickerTab === 'gallery' && (
            <>
              <div className="mb-3">
                <Input placeholder="Search animations..." value={pickerSearch}
                  onChange={(e) => setPickerSearch(e.target.value)} autoFocus />
              </div>
              <div className="flex-1 overflow-y-auto -mx-6 px-6">
                {filteredAnimations.length === 0 ? (
                  <div className="py-8 text-center text-muted-foreground">No animations found.</div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pb-4">
                    {filteredAnimations.map((entry) => {
                      const id = getAnimationId(entry);
                      const name = getAnimationName(entry);
                      const w = entry.definition.width ?? 800;
                      const h = entry.definition.height ?? 600;
                      return (
                        <button key={id} onClick={() => addScene(id)}
                          className="group relative rounded-lg overflow-hidden border bg-card hover:ring-2 hover:ring-primary transition-all text-left">
                          <div className="w-full" style={{
                            backgroundColor: entry.definition.background || 'hsl(var(--muted))',
                            aspectRatio: `${w} / ${h}`, maxHeight: 120,
                          }}>
                            <AnimationThumbnail
                              animation={entry.definition}
                              isPlaying={pickerOpen}
                            />
                          </div>
                          <div className="p-2">
                            <div className="text-xs font-medium truncate">{name}</div>
                            {entry.meta?.tags && entry.meta.tags.length > 0 && (
                              <div className="text-[10px] text-muted-foreground truncate mt-0.5">
                                {entry.meta.tags.slice(0, 3).join(' · ')}
                              </div>
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </>
          )}

          {/* ── Custom Code tab ── */}
          {pickerTab === 'code' && (
            <div className="flex-1 overflow-y-auto -mx-6 px-6 flex flex-col gap-4">
              <div className="grid grid-cols-[1fr_auto] gap-4">
                {/* Code editor */}
                <div className="flex flex-col gap-2">
                  <Label className="text-xs font-medium">Render Function</Label>
                  <textarea
                    value={customCode}
                    onChange={(e) => {
                      const newCode = e.target.value;
                      setCustomCode(newCode);
                      setCustomCodeError(null);
                      // Auto-fill config panel from full module code
                      const extracted = extractModuleConfig(newCode);
                      if (extracted) {
                        setCustomCodeConfig(extracted);
                      }
                    }}
                    className="w-full h-[280px] rounded-lg border bg-muted/50 p-3 font-mono text-xs leading-relaxed resize-none focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary"
                    spellCheck={false}
                    placeholder="Paste a full AnimationDefinition module, a render function, or just the function body..."
                  />
                  {customCodeError && (
                    <div className="flex items-start gap-1.5 text-destructive text-xs">
                      <AlertCircle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
                      <span className="font-mono">{customCodeError}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    {isFullAnimationModule(customCode) ? (
                      <span className="inline-flex items-center gap-1 text-[10px] font-medium bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                        <Check className="w-3 h-3" /> Full AnimationDefinition
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[10px] font-medium bg-muted text-muted-foreground px-2 py-0.5 rounded-full">
                        Simple render function
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-muted-foreground leading-relaxed">
                    Paste a full <code className="px-1 py-0.5 rounded bg-muted font-mono text-[10px]">AnimationDefinition</code> module
                    (TypeScript supported) or a simple <code className="px-1 py-0.5 rounded bg-muted font-mono text-[10px]">render(ctx, {'{ width, height, progress }'})</code> function.
                    Config is auto-extracted from full modules.
                  </p>
                </div>

                {/* Preview + config */}
                <div className="flex flex-col gap-3 w-[200px]">
                  <Label className="text-xs font-medium">Preview</Label>
                  <div className="rounded-lg border bg-black overflow-hidden flex items-center justify-center" style={{ minHeight: 120 }}>
                    <canvas ref={customCodePreviewRef} />
                  </div>

                  <div className="space-y-2">
                    <div>
                      <Label className="text-[11px] text-muted-foreground">Name</Label>
                      <Input
                        value={customCodeConfig.name || ''}
                        onChange={(e) => setCustomCodeConfig((prev) => ({ ...prev, name: e.target.value }))}
                        className="h-7 text-xs mt-0.5"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-1.5">
                      <div>
                        <Label className="text-[11px] text-muted-foreground">Width</Label>
                        <Input
                          type="number"
                          value={customCodeConfig.width || 800}
                          onChange={(e) => setCustomCodeConfig((prev) => ({ ...prev, width: parseInt(e.target.value) || 800 }))}
                          className="h-7 text-xs mt-0.5"
                        />
                      </div>
                      <div>
                        <Label className="text-[11px] text-muted-foreground">Height</Label>
                        <Input
                          type="number"
                          value={customCodeConfig.height || 600}
                          onChange={(e) => setCustomCodeConfig((prev) => ({ ...prev, height: parseInt(e.target.value) || 600 }))}
                          className="h-7 text-xs mt-0.5"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-1.5">
                      <div>
                        <Label className="text-[11px] text-muted-foreground">Duration (ms)</Label>
                        <Input
                          type="number"
                          value={customCodeConfig.durationMs || 3000}
                          onChange={(e) => setCustomCodeConfig((prev) => ({ ...prev, durationMs: parseInt(e.target.value) || 3000 }))}
                          className="h-7 text-xs mt-0.5"
                        />
                      </div>
                      <div>
                        <Label className="text-[11px] text-muted-foreground">Background</Label>
                        <div className="flex gap-1 mt-0.5">
                          <input
                            type="color"
                            value={customCodeConfig.background || '#000000'}
                            onChange={(e) => setCustomCodeConfig((prev) => ({ ...prev, background: e.target.value }))}
                            className="h-7 w-7 rounded border cursor-pointer"
                          />
                          <Input
                            value={customCodeConfig.background || '#000000'}
                            onChange={(e) => setCustomCodeConfig((prev) => ({ ...prev, background: e.target.value }))}
                            className="h-7 text-xs flex-1"
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  <Button size="sm" className="w-full mt-1" onClick={addCustomCodeScene}>
                    <Plus className="w-3.5 h-3.5 mr-1" />
                    Add to Timeline
                  </Button>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

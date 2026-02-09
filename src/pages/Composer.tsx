import { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useAnimationRegistry } from '../animations/registry';
import { useDeletedAnimations } from '../hooks/useDeletedAnimations';
import {
  createSequencePlayer,
  createEmptySequence,
  generateSceneId,
  generateAudioClipId,
  getSceneTimings,
  getSequenceDurationMs,
  DEFAULT_TRANSFORM,
  type Sequence,
  type SceneEntry,
  type SceneTransform,
  type AudioClipEntry,
  type SequencePlayerControls,
  type TransitionType,
} from '../runtime/sequence';
import type { AnyAnimationDefinition, AnimationDefinition } from '../runtime/types';
import { isSimpleAnimation } from '../runtime/types';
import { ParameterPanel } from '../components/ParameterPanel';
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
  Play,
  Pause,
  RotateCcw,
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
} from 'lucide-react';
import { toast } from 'sonner';
import {
  saveSequence,
  listSavedSequences,
  loadSequence,
} from '../runtime/sequence-storage';
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

/** Compute pixel bounding box for a scene on the sequence canvas */
function computeSceneBBox(
  scene: SceneEntry,
  animation: AnyAnimationDefinition,
  seqW: number,
  seqH: number,
) {
  const transform = scene.transform || DEFAULT_TRANSFORM;
  const animW = animation.width ?? 800;
  const animH = animation.height ?? 600;
  const fitScale = Math.min(seqW / animW, seqH / animH);
  const contentW = animW * fitScale * transform.scale;
  const contentH = animH * fitScale * transform.scale;
  const x = (seqW / 2 + transform.offsetX) - contentW / 2;
  const y = (seqH / 2 + transform.offsetY) - contentH / 2;
  return { x, y, width: contentW, height: contentH };
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

function SceneSettingsSidebar({
  scene,
  animationsMap,
  onUpdate,
  onDuplicate,
  onRemove,
}: {
  scene: SceneEntry;
  animationsMap: Map<string, AnyAnimationDefinition>;
  onUpdate: (updates: Partial<SceneEntry>) => void;
  onDuplicate: () => void;
  onRemove: () => void;
}) {
  const animation = animationsMap.get(scene.animationId);
  const transform = scene.transform || DEFAULT_TRANSFORM;

  const hasParams = animation && !isSimpleAnimation(animation);
  const fullAnim = hasParams
    ? (animation as AnimationDefinition<Record<string, unknown>>)
    : null;
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
      onUpdate({ transform: { ...transform, [field]: value } });
    },
    [transform, onUpdate]
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
        <div className="mt-1 px-3 py-2 rounded-md border bg-muted/50 text-sm font-mono">
          {scene.animationId}
        </div>
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
            onClick={() => onUpdate({ transform: { ...DEFAULT_TRANSFORM } })}>
            <RotateCw className="h-3 w-3" /> Reset
          </Button>
        </div>
        <div className="space-y-3">
          <div>
            <div className="flex items-center justify-between">
              <Label className="text-xs text-muted-foreground">Scale</Label>
              <span className="text-xs text-muted-foreground tabular-nums">{Math.round(transform.scale * 100)}%</span>
            </div>
            <Slider min={0.1} max={3} step={0.05} value={[transform.scale]}
              onValueChange={([v]) => handleTransformChange('scale', v)} className="mt-1" />
          </div>
          <div>
            <div className="flex items-center justify-between">
              <Label className="text-xs text-muted-foreground">Position X</Label>
              <span className="text-xs text-muted-foreground tabular-nums">{transform.offsetX}px</span>
            </div>
            <Slider min={-960} max={960} step={1} value={[transform.offsetX]}
              onValueChange={([v]) => handleTransformChange('offsetX', v)} className="mt-1" />
          </div>
          <div>
            <div className="flex items-center justify-between">
              <Label className="text-xs text-muted-foreground">Position Y</Label>
              <span className="text-xs text-muted-foreground tabular-nums">{transform.offsetY}px</span>
            </div>
            <Slider min={-540} max={540} step={1} value={[transform.offsetY]}
              onValueChange={([v]) => handleTransformChange('offsetY', v)} className="mt-1" />
          </div>
          <div>
            <div className="flex items-center justify-between">
              <Label className="text-xs text-muted-foreground">Opacity</Label>
              <span className="text-xs text-muted-foreground tabular-nums">{Math.round(transform.opacity * 100)}%</span>
            </div>
            <Slider min={0} max={1} step={0.01} value={[transform.opacity]}
              onValueChange={([v]) => handleTransformChange('opacity', v)} className="mt-1" />
          </div>
        </div>
      </div>

      {/* Transparent background */}
      {animation?.background && (
        <div className="flex items-center justify-between">
          <Label className="text-xs">Transparent Background</Label>
          <Switch checked={scene.transparentBg ?? false}
            onCheckedChange={(checked) => onUpdate({ transparentBg: checked })} />
        </div>
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
}: {
  clip: AudioClipEntry;
  onUpdate: (updates: Partial<AudioClipEntry>) => void;
  onRemove: () => void;
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
      <div>
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

function Timeline({
  sequence,
  timings,
  totalDurationMs,
  currentTimeMs,
  playing,
  selectedSceneIds,
  selectedAudioClipId,
  onSelectScene,
  onSelectAudioClip,
  onMarqueeSelect,
  onSeek,
  onTogglePlay,
  onRestart,
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
  selectedSceneIds: Set<string>;
  selectedAudioClipId: string | null;
  onSelectScene: (id: string | null, additive?: boolean) => void;
  onSelectAudioClip: (id: string | null) => void;
  onMarqueeSelect?: (ids: string[], additive: boolean) => void;
  onSeek: (ms: number) => void;
  onTogglePlay: () => void;
  onRestart: () => void;
  onOpenPicker: () => void;
  onOpenAudioPicker: () => void;
  onUpdateScene: (sceneId: string, updates: Partial<SceneEntry>) => void;
  onUpdateAudioClip: (clipId: string, updates: Partial<AudioClipEntry>) => void;
  onDropOnLane?: (sceneId: string, targetLane: number, targetTimeMs: number) => void;
  audioWaveforms: Map<string, number[]>;
}) {
  const timelineRef = useRef<HTMLDivElement>(null);
  const sequenceRef = useRef(sequence);
  const onDropOnLaneRef = useRef(onDropOnLane);
  const xToMsRef = useRef<(clientX: number, containerEl: HTMLElement) => number>(() => 0);
  const [trimming, setTrimming] = useState<{
    sceneId: string; edge: 'left' | 'right'; startX: number; startDuration: number;
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

  // Always include at least lanes -2 … +2 so there's visible room to layer items.
  // Sort descending so +N is rendered at the top and -N at the bottom.
  const lanes = useMemo(() => {
    const set = new Set(sequence.scenes.map((s) => s.lane ?? 0));
    // Also include lanes used by audio clips
    for (const clip of (sequence.audioClips || [])) {
      set.add(clip.lane);
    }
    // Default visible lanes
    for (let l = -2; l <= 2; l++) set.add(l);
    // If any content exists beyond ±2, add one extra empty lane as buffer
    const minUsed = Math.min(...set);
    const maxUsed = Math.max(...set);
    set.add(minUsed - 1);
    set.add(maxUsed + 1);
    return Array.from(set).sort((a, b) => b - a);
  }, [sequence.scenes, sequence.audioClips]);

  const trackContentHeight = Math.max(100, 24 + lanes.length * 40);

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
  const trackWidth = Math.max(TIMELINE_MIN_WIDTH, totalDurationMs * pxPerMs);
  const frameDurationMs = 1000 / (sequence.fps || 60);

  // Time ruler ticks — adapt spacing to zoom level so major ticks stay ~80-140px apart
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
    const endSec = totalSec + step;
    const ticks: { sec: number; major: boolean }[] = [];
    for (let s = 0; s <= endSec; s = +(s + subStep).toFixed(6)) {
      // A tick is major when it falls on the major step grid
      const isMajor = Math.abs(s % step) < 1e-9 || Math.abs(s % step - step) < 1e-9;
      ticks.push({ sec: s, major: isMajor });
    }
    return ticks;
  }, [totalSec, pxPerSec]);

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

      // Detect lane under cursor
      const target = document.elementFromPoint(e.clientX, e.clientY);
      const laneEl = target?.closest('[data-lane]');
      const targetLane = laneEl ? Number(laneEl.getAttribute('data-lane')) : d.originalLane;

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
  }, [clipDragActive]); // stable — only fires on start/stop

  // Handle seek by clicking on ruler
  const handleRulerClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    onSeek(xToMs(e.clientX, e.currentTarget.closest('[data-timeline-scroll]') as HTMLElement || e.currentTarget));
  }, [xToMs, onSeek]);

  // Seek drag
  useEffect(() => {
    if (!seekDragging) return;
    const handleMove = (e: MouseEvent) => {
      if (!timelineRef.current) return;
      onSeek(xToMs(e.clientX, timelineRef.current));
    };
    const handleUp = () => setSeekDragging(false);
    window.addEventListener('mousemove', handleMove);
    window.addEventListener('mouseup', handleUp);
    return () => {
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('mouseup', handleUp);
    };
  }, [seekDragging, xToMs, onSeek]);

  // Trim drag — snaps to frame boundaries for precision editing.
  // At higher zoom levels you get finer control; at low zoom the snap
  // keeps clips aligned to clean frame boundaries.
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
      onUpdateScene(trimming.sceneId, { durationMs: snapped });
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

      // Detect lane under cursor
      const target = document.elementFromPoint(e.clientX, e.clientY);
      const laneEl = target?.closest('[data-lane]');
      const targetLane = laneEl ? Number(laneEl.getAttribute('data-lane')) : d.originalLane;

      d.currentMs = Math.round(rawMs);
      d.currentLane = targetLane;

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
  }, [audioDragActive, onUpdateAudioClip]);

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
      {/* Transport controls */}
      <div className="px-4 py-2 border-b flex items-center gap-2">
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
        <div className="relative" style={{ width: trackWidth + TIMELINE_LEFT_PAD * 2, minHeight: trackContentHeight }}>
          {/* Ruler */}
          <div
            className="h-6 border-b bg-muted/40 relative cursor-pointer select-none"
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
          </div>

          {/* Clips track — one row per lane (primary = lane 0, connected above/below) */}
          <div
            className="relative flex flex-col gap-0.5 py-1"
            onMouseDown={handleTrackAreaMouseDown}
            style={{ cursor: isTlMarqueeing ? 'crosshair' : undefined }}
          >
            {lanes.map((lane) => {
              const entries = scenesByLane.get(lane) ?? [];
              const isPrimary = lane === 0;
              const rowHeight = isPrimary ? 36 : 28;
              const isDropTarget = isClipDragging && clipDragRender?.currentLane === lane;

              return (
                <div
                  key={lane}
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
                        onClick={(e) => { e.stopPropagation(); if (!isClipDragging) onSelectScene(scene.sceneId, e.shiftKey); }}
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
                        {/* Right trim handle (duration) */}
                        <div
                          data-trim-handle
                          className="absolute right-0 top-0 w-2 h-full cursor-col-resize z-20 
                                     bg-white/0 hover:bg-white/30 active:bg-white/50 rounded-r
                                     transition-colors"
                          onMouseDown={(e) => {
                            e.stopPropagation(); e.preventDefault();
                            setTrimming({ sceneId: scene.sceneId, edge: 'right', startX: e.clientX, startDuration: scene.durationMs });
                          }}
                        >
                          <div className="absolute right-0.5 top-1/2 -translate-y-1/2 w-0.5 h-4 bg-white/60 rounded-full
                                          opacity-0 group-hover/clip:opacity-100 transition-opacity" />
                        </div>

                        {/* Clip content */}
                        <div className="relative z-10 flex items-center gap-1 px-2 py-0.5 h-full overflow-hidden">
                          <GripVertical className="h-3 w-3 text-white/50 flex-shrink-0 cursor-grab" />
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
              );
            })}
          </div>

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
            // Find the lane row position for the ghost
            const laneIndex = lanes.indexOf(clipDragRender.currentLane);
            const ghostTop = laneIndex >= 0
              ? lanes.slice(0, laneIndex).reduce((sum, l) => sum + (l === 0 ? 36 : 28) + 2, 0) + 4 /* py-1 */
              : 0;
            const laneHeight = clipDragRender.currentLane === 0 ? 36 : 28;
            const ghostHeight = laneHeight - 4; /* match clip top-0.5 + bottom-0.5 */

            return (
              <>
                {/* Ghost clip */}
                <div
                  className="absolute rounded pointer-events-none z-40 border-2 border-white/60"
                  style={{
                    left: ghostLeft,
                    width: ghostWidth,
                    top: 24 + ghostTop + 2, /* ruler(24) + py-1(4) + lanes above + top-0.5(2) */
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

          {/* Playhead (spans full height: ruler + clips) */}
          <div
            className="absolute top-0 z-30 pointer-events-none"
            style={{ left: playheadX, height: trackContentHeight, transform: 'translateX(-5px)' }}
          >
            <PlayheadSvg height={trackContentHeight} />
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Main Composer ────────────────────────────────────────────────────────────

export function Composer() {
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
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerSearch, setPickerSearch] = useState('');
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

  // Player state
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const playerRef = useRef<SequencePlayerControls | null>(null);
  const [playing, setPlaying] = useState(false);
  const [currentTimeMs, setCurrentTimeMs] = useState(0);
  const [totalDurationMs, setTotalDurationMs] = useState(0);

  // Canvas zoom/pan state
  const [canvasZoom, setCanvasZoom] = useState(1);
  const [canvasPan, setCanvasPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const panStartRef = useRef({ x: 0, y: 0, panX: 0, panY: 0 });
  const canvasWrapperRef = useRef<HTMLDivElement>(null);

  // Canvas drag-to-move state
  const [isDraggingOnCanvas, setIsDraggingOnCanvas] = useState(false);
  const canvasDragRef = useRef({ startX: 0, startY: 0, origOffsetX: 0, origOffsetY: 0, sceneId: '' });

  // Canvas scale drag state (declared early because handleCanvasAreaClick references it)
  const [isScaling, setIsScaling] = useState(false);

  // Timestamp of last drag/scale end — used to suppress the click event that fires right after mouseup
  const lastInteractionEndRef = useRef(0);

  const audioFileInputRef = useRef<HTMLInputElement>(null);

  // ── Undo / Redo ─────────────────────────────────────────────────────────────
  // Watches `sequence` via an effect with debounced commits so rapid changes
  // (drags, trims) are grouped into a single undo entry.
  const undoStackRef = useRef<Sequence[]>([]);
  const redoStackRef = useRef<Sequence[]>([]);
  const prevSeqForUndoRef = useRef<Sequence>(sequence);
  const isUndoingRef = useRef(false);
  const undoCommitTimerRef = useRef<ReturnType<typeof setTimeout>>();

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

  // Build animations map
  const animationsMap = useMemo(() => {
    const map = new Map<string, AnyAnimationDefinition>();
    for (const entry of animations) {
      map.set(getAnimationId(entry), entry.definition);
    }
    return map;
  }, [animations]);

  useEffect(() => {
    setTotalDurationMs(getSequenceDurationMs(sequence.scenes, sequence.audioClips));
  }, [sequence.scenes, sequence.audioClips]);

  // Auto-save to localStorage (debounced 2s)
  useEffect(() => {
    if (sequence.scenes.length === 0 && sequence.name === 'Untitled Sequence') return;
    const t = setTimeout(() => {
      saveSequence(sequence);
    }, 2000);
    return () => clearTimeout(t);
  }, [sequence]);

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

  // ─── Save / Load / Export / Import ─────────────────────────────────────────

  const handleSave = useCallback(() => {
    saveSequence(sequence);
    toast.success('Sequence saved');
  }, [sequence]);

  const handleLoad = useCallback((id: string) => {
    const loaded = loadSequence(id);
    if (!loaded) {
      toast.error('Failed to load sequence');
      return;
    }
    setSequence(loaded);
    setSelectedSceneIds(new Set());
    toast.success(`Loaded "${loaded.name}"`);
  }, []);

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
    const newClip: AudioClipEntry = {
      clipId: generateAudioClipId(),
      audioUrl: url,
      audioFilename: file.name,
      fullDurationMs: 0, // Will be filled in by waveform effect
      trimStartMs: 0,
      trimEndMs: 0, // 0 means full duration, resolved by waveform effect
      volume: 1,
      startMs: 0,
      lane: -1,
      label: file.name.replace(/\.[^.]+$/, ''),
    };
    setSequence((prev) => ({
      ...prev,
      audioClips: [...prev.audioClips, newClip],
    }));
    setSelectedSceneIds(new Set());
    setSelectedAudioClipId(newClip.clipId);
    toast.success(`Audio "${file.name}" added to timeline`);
  }, []);

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

      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedSceneIds.size > 0) {
        e.preventDefault();
        setSequence((prev) => ({
          ...prev,
          scenes: prev.scenes.filter((s) => !selectedSceneIds.has(s.sceneId)),
        }));
        setSelectedSceneIds(new Set());
      }
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedAudioClipId) {
        e.preventDefault();
        setSequence((prev) => ({
          ...prev,
          audioClips: prev.audioClips.filter((c) => c.clipId !== selectedAudioClipId),
        }));
        setSelectedAudioClipId(null);
      }
      if (e.key === ' ') {
        e.preventDefault();
        togglePlay();
      }
      if (e.key === 'Escape') {
        setSelectedSceneIds(new Set());
        setSelectedAudioClipId(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedSceneIds, selectedAudioClipId, togglePlay, undo, redo]);

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
            const bbox = computeSceneBBox(scene, animation, sequence.width, sequence.height);
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
            const bbox = computeSceneBBox(scene, animation, sequence.width, sequence.height);
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

      const bbox = computeSceneBBox(scene, animation, sequence.width, sequence.height);
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
    const transform = scene.transform || DEFAULT_TRANSFORM;
    setIsDraggingOnCanvas(true);
    canvasDragRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      origOffsetX: transform.offsetX,
      origOffsetY: transform.offsetY,
      sceneId,
    };
  }, [sequence.scenes]);

  useEffect(() => {
    if (!isDraggingOnCanvas) return;
    const handleMove = (e: MouseEvent) => {
      const ref = canvasDragRef.current;
      if (!canvasRef.current) return;
      const canvasRect = canvasRef.current.getBoundingClientRect();
      // canvasRect already includes CSS zoom, so just convert screen→sequence space
      const scaleX = sequence.width / canvasRect.width;
      const scaleY = sequence.height / canvasRect.height;
      const dx = (e.clientX - ref.startX) * scaleX;
      const dy = (e.clientY - ref.startY) * scaleY;
      const newOffsetX = Math.round(ref.origOffsetX + dx);
      const newOffsetY = Math.round(ref.origOffsetY + dy);
      setSequence((prev) => ({
        ...prev,
        scenes: prev.scenes.map((s) =>
          s.sceneId === ref.sceneId
            ? { ...s, transform: { ...(s.transform || DEFAULT_TRANSFORM), offsetX: newOffsetX, offsetY: newOffsetY } }
            : s
        ),
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
  });

  /** Start scaling from a corner handle; cornerIdx identifies which corner. */
  const handleScaleMouseDown = useCallback((e: React.MouseEvent, sceneId: string, cornerIdx: number) => {
    e.stopPropagation();
    e.preventDefault();
    const scene = sequence.scenes.find((s) => s.sceneId === sceneId);
    if (!scene || !canvasRef.current) return;
    const transform = scene.transform || DEFAULT_TRANSFORM;
    const animation = animationsMap.get(scene.animationId);
    if (!animation) return;

    const canvasRect = canvasRef.current.getBoundingClientRect();
    const bbox = computeSceneBBox(scene, animation, sequence.width, sequence.height);

    const [anchorSignX, anchorSignY] = CORNER_ANCHOR_SIGNS[cornerIdx];

    // Anchor corner in sequence space
    const anchorSeqX = bbox.x + bbox.width / 2 + anchorSignX * bbox.width / 2;
    const anchorSeqY = bbox.y + bbox.height / 2 + anchorSignY * bbox.height / 2;

    // Convert to screen coordinates
    const anchorScreenX = canvasRect.left + (anchorSeqX / sequence.width) * canvasRect.width;
    const anchorScreenY = canvasRect.top + (anchorSeqY / sequence.height) * canvasRect.height;

    const startDist = Math.max(10, Math.hypot(e.clientX - anchorScreenX, e.clientY - anchorScreenY));

    // Pre-compute base half-sizes (at scale=1) for offset adjustment
    const animW = animation.width ?? 800;
    const animH = animation.height ?? 600;
    const fitScale = Math.min(sequence.width / animW, sequence.height / animH);
    const halfBaseW = animW * fitScale / 2;
    const halfBaseH = animH * fitScale / 2;

    setIsScaling(true);
    scaleDragRef.current = {
      anchorScreenX, anchorScreenY, startDist,
      origScale: transform.scale,
      origOffsetX: transform.offsetX,
      origOffsetY: transform.offsetY,
      anchorSignX, anchorSignY,
      halfBaseW, halfBaseH,
      sceneId,
    };
  }, [sequence.scenes, animationsMap, sequence.width, sequence.height]);

  useEffect(() => {
    if (!isScaling) return;
    const handleMove = (e: MouseEvent) => {
      const ref = scaleDragRef.current;
      const currentDist = Math.max(10, Math.hypot(e.clientX - ref.anchorScreenX, e.clientY - ref.anchorScreenY));
      const ratio = currentDist / ref.startDist;
      const newScale = Math.max(0.1, Math.min(5, Math.round(ref.origScale * ratio * 100) / 100));

      // Adjust offset so anchor corner stays fixed
      const newOffsetX = Math.round(ref.origOffsetX + ref.anchorSignX * ref.halfBaseW * (ref.origScale - newScale));
      const newOffsetY = Math.round(ref.origOffsetY + ref.anchorSignY * ref.halfBaseH * (ref.origScale - newScale));

      setSequence((prev) => ({
        ...prev,
        scenes: prev.scenes.map((s) =>
          s.sceneId === ref.sceneId
            ? { ...s, transform: { ...(s.transform || DEFAULT_TRANSFORM), scale: newScale, offsetX: newOffsetX, offsetY: newOffsetY } }
            : s
        ),
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
    const newScene: SceneEntry = {
      sceneId: generateSceneId(),
      animationId,
      durationMs: entry.definition.durationMs ?? 3000,
      transition: { type: 'cut', durationMs: 0 },
      label: name,
    };
    setSequence((prev) => ({ ...prev, scenes: [...prev.scenes, newScene] }));
    setSelectedSceneIds(new Set([newScene.sceneId]));
    setPickerOpen(false);
    setPickerSearch('');
    toast.success(`Added "${name}" to timeline`);
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
    const copy: SceneEntry = { ...sequence.scenes[idx], sceneId: generateSceneId(), label: sequence.scenes[idx].label ? `${sequence.scenes[idx].label} (copy)` : undefined };
    const newScenes = [...sequence.scenes];
    newScenes.splice(idx + 1, 0, copy);
    setSequence((prev) => ({ ...prev, scenes: newScenes }));
    setSelectedSceneIds(new Set([copy.sceneId]));
  };

  const updateScene = (sceneId: string, updates: Partial<SceneEntry>) => {
    setSequence((prev) => ({
      ...prev,
      scenes: prev.scenes.map((s) => s.sceneId === sceneId ? { ...s, ...updates } : s),
    }));
  };

  const reorderScenes = useCallback((newScenes: SceneEntry[]) => {
    setSequence((prev) => ({ ...prev, scenes: newScenes }));
  }, []);

  const handleDropOnLane = useCallback((
    sceneId: string,
    targetLane: number,
    targetTimeMs: number
  ) => {
    const scene = sequence.scenes.find((s) => s.sceneId === sceneId);
    if (!scene) return;
    const primaryScenes = sequence.scenes.filter((s) => (s.lane ?? 0) === 0);
    const primaryTimings = getSceneTimings(primaryScenes);

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

    const anchorIdx = primaryTimings.findIndex(
      (t) => targetTimeMs >= t.startMs && targetTimeMs < t.endMs
    );
    const anchor = anchorIdx >= 0 ? primaryScenes[anchorIdx] : primaryScenes[primaryScenes.length - 1];
    const anchorStart = anchor && anchorIdx >= 0 ? primaryTimings[anchorIdx].startMs : 0;
    updateScene(sceneId, {
      lane: targetLane,
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

  // Bounding boxes for ALL selected scenes
  const selectedBoundingBoxes = useMemo(() => {
    if (selectedSceneIds.size === 0) return [];
    return Array.from(selectedSceneIds).map(id => {
      const scene = sequence.scenes.find(s => s.sceneId === id);
      if (!scene) return null;
      const animation = animationsMap.get(scene.animationId);
      if (!animation) return null;
      const bbox = computeSceneBBox(scene, animation, sequence.width, sequence.height);
      return {
        sceneId: id,
        label: scene.label || scene.animationId,
        x: (bbox.x / sequence.width) * 100,
        y: (bbox.y / sequence.height) * 100,
        width: (bbox.width / sequence.width) * 100,
        height: (bbox.height / sequence.height) * 100,
      };
    }).filter(Boolean) as { sceneId: string; label: string; x: number; y: number; width: number; height: number }[];
  }, [selectedSceneIds, sequence.scenes, animationsMap, sequence.width, sequence.height]);

  // Hover bounding box — shown for any scene under the cursor that isn't selected
  const hoveredScene = hoveredSceneId && !selectedSceneIds.has(hoveredSceneId)
    ? sequence.scenes.find((s) => s.sceneId === hoveredSceneId) ?? null
    : null;
  const hoveredBoundingBox = useMemo(() => {
    if (!hoveredScene) return null;
    const animation = animationsMap.get(hoveredScene.animationId);
    if (!animation) return null;
    const bbox = computeSceneBBox(hoveredScene, animation, sequence.width, sequence.height);
    return {
      x: (bbox.x / sequence.width) * 100,
      y: (bbox.y / sequence.height) * 100,
      width: (bbox.width / sequence.width) * 100,
      height: (bbox.height / sequence.height) * 100,
    };
  }, [hoveredScene, animationsMap, sequence.width, sequence.height]);

  const selectedAudioClip = useMemo(
    () => sequence.audioClips?.find((c) => c.clipId === selectedAudioClipId) ?? null,
    [sequence.audioClips, selectedAudioClipId]
  );

  const timings = useMemo(() => getSceneTimings(sequence.scenes), [sequence.scenes]);

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

  // Counter-scale for handles/labels so they stay constant size regardless of zoom
  const counterScale = 1 / canvasZoom;

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="h-screen bg-background flex flex-col overflow-hidden">
      {/* ── Header ── */}
      <header className="sticky top-0 z-40 border-b bg-background flex-shrink-0">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between gap-2">
          <div className="flex items-center gap-3 min-w-0">
            <Button variant="ghost" size="icon" asChild className="flex-shrink-0">
              <Link to="/"><ArrowLeft className="h-5 w-5" /></Link>
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
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="h-8 gap-1.5">
                  <FolderOpen className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline text-xs">Load</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="max-h-64 overflow-y-auto">
                <DropdownMenuLabel>Saved sequences</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {listSavedSequences().length === 0 ? (
                  <DropdownMenuItem disabled>No saved sequences</DropdownMenuItem>
                ) : (
                  listSavedSequences().map((meta) => (
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
            <ThemeToggle />
          </div>
        </div>
      </header>

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
          onMouseLeave={(e) => { handlePanEnd(); handleCanvasMouseLeave(); }}
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
            />
          ) : selectedScene ? (
            <SceneSettingsSidebar
              scene={selectedScene}
              animationsMap={animationsMap}
              onUpdate={(updates) => updateScene(selectedScene.sceneId, updates)}
              onDuplicate={() => duplicateScene(selectedScene.sceneId)}
              onRemove={() => removeScene(selectedScene.sceneId)}
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
          selectedSceneIds={selectedSceneIds}
          onSelectScene={handleTimelineSelectScene}
          onMarqueeSelect={handleTimelineMarqueeSelect}
          onSeek={handleSeek}
          onTogglePlay={togglePlay}
          onRestart={restart}
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
      <Dialog open={pickerOpen} onOpenChange={(open) => { if (!open) setPickerOpen(false); }}>
        <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Add Animation</DialogTitle>
            <DialogDescription>Choose an animation from your gallery to add as a scene.</DialogDescription>
          </DialogHeader>
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
                        <div className="w-full h-full flex items-center justify-center">
                          <span className="text-xs text-white/50">{w}×{h}</span>
                        </div>
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
        </DialogContent>
      </Dialog>
    </div>
  );
}

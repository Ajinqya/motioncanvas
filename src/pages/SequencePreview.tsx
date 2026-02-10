import { useEffect, useRef, useState, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import type { Sequence } from '../runtime/sequence';
import {
  createSequencePlayer,
  getSequenceDurationMs,
  type SequencePlayerControls,
} from '../runtime/sequence';
import type { AnyAnimationDefinition } from '../runtime/types';
import { useAnimationRegistry } from '../animations/registry';
import { compileCustomCode } from '../runtime/custom-code';
import { loadPublicSequenceCloud } from '../lib/sequence-cloud';
import { loadAnimationCloud } from '../lib/animation-cloud';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { ArrowLeft, ArrowLeftRight, Play, Pause, RotateCcw } from 'lucide-react';

function getAnimationId(entry: { definition: any }) {
  return 'id' in entry.definition
    ? entry.definition.id
    : 'name' in entry.definition && entry.definition.name
      ? entry.definition.name.toLowerCase().replace(/\s+/g, '-')
      : 'animation';
}

function formatTimecode(ms: number): string {
  const totalSec = ms / 1000;
  const min = Math.floor(totalSec / 60);
  const sec = totalSec % 60;
  return min > 0 ? `${min}:${sec.toFixed(1).padStart(4, '0')}` : `${sec.toFixed(1)}s`;
}

export function SequencePreview() {
  const { id } = useParams<{ id: string }>();
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const playerRef = useRef<SequencePlayerControls | null>(null);
  const [sequence, setSequence] = useState<Sequence | null>(null);
  const [animationsMap, setAnimationsMap] = useState<Map<string, AnyAnimationDefinition>>(new Map());
  const [displaySize, setDisplaySize] = useState<{ w: number; h: number }>({ w: 800, h: 450 });
  const [error, setError] = useState<string | null>(null);
  const [playing, setPlaying] = useState(false);
  const [currentTimeMs, setCurrentTimeMs] = useState(0);
  const [pingPong, setPingPong] = useState(false);

  const allAnimations = useAnimationRegistry();

  const totalDurationMs = sequence
    ? getSequenceDurationMs(sequence.scenes, sequence.audioClips ?? [])
    : 0;

  const handleFrame = useCallback((timeMs: number) => {
    setCurrentTimeMs(timeMs);
  }, []);

  // Measure container and compute display size (fit sequence within container)
  useEffect(() => {
    if (!sequence || !containerRef.current) return;
    const el = containerRef.current;
    const aspect = sequence.width / sequence.height;

    const updateSize = () => {
      const rect = el.getBoundingClientRect();
      let w = Math.round(rect.width) || 800;
      let h = Math.round(rect.height) || 450;
      if (w / h > aspect) {
        w = Math.round(h * aspect);
      } else {
        h = Math.round(w / aspect);
      }
      if (w < 1) w = 1;
      if (h < 1) h = 1;
      setDisplaySize((prev) => (prev.w === w && prev.h === h ? prev : { w, h }));
    };

    updateSize();
    const ro = new ResizeObserver(updateSize);
    ro.observe(el);
    return () => ro.disconnect();
  }, [sequence]);

  // Load sequence
  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    loadPublicSequenceCloud(id).then(({ data }) => {
      if (cancelled) return;
      if (data) {
        setSequence(data);
        setError(null);
      } else {
        setError('Sequence not found or not public');
      }
    });
    return () => { cancelled = true; };
  }, [id]);

  // Build animations map: registry + customCode + load missing cloud animations
  useEffect(() => {
    if (!sequence) return;

    const map = new Map<string, AnyAnimationDefinition>();

    // Registry
    for (const entry of allAnimations) {
      map.set(getAnimationId(entry), entry.definition);
    }

    // CustomCode from scenes
    for (const scene of sequence.scenes) {
      if (scene.customCode && !map.has(scene.animationId)) {
        const compiled = compileCustomCode(scene.customCode, scene.customCodeConfig);
        if (compiled) map.set(scene.animationId, compiled);
      }
    }

    // Missing animationIds - try load from cloud (public)
    const missing = Array.from(
      new Set(sequence.scenes.filter((s) => !s.customCode).map((s) => s.animationId))
    ).filter((aid) => !map.has(aid));

    if (missing.length === 0) {
      setAnimationsMap(map);
      return;
    }

    let cancelled = false;
    Promise.all(
      missing.map((localId) =>
        loadAnimationCloud(localId, undefined).then(({ data }) =>
          data ? { localId, def: data.definition } : null
        )
      )
    ).then((results) => {
      if (cancelled) return;
      const next = new Map(map);
      for (const r of results) {
        if (r) next.set(r.localId, r.def);
      }
      setAnimationsMap(next);
    });
    return () => { cancelled = true; };
  }, [sequence, allAnimations]);

  // Create and sync sequence player (use display size so content fits the view)
  useEffect(() => {
    if (!canvasRef.current || !sequence || animationsMap.size === 0) return;

    const { w, h } = displaySize;
    const scaledSequence: Sequence = {
      ...sequence,
      width: w,
      height: h,
    };

    const player = createSequencePlayer({
      canvas: canvasRef.current,
      sequence: scaledSequence,
      animations: animationsMap,
      onFrame: handleFrame,
      disableAudio: false,
    });

    playerRef.current = player;

    player.play();
    setPlaying(true);

    return () => {
      player.destroy();
      playerRef.current = null;
    };
  }, [sequence, animationsMap, displaySize, handleFrame]);

  useEffect(() => {
    if (!playerRef.current || !sequence) return;
    const { w, h } = displaySize;
    const scaledSequence: Sequence = {
      ...sequence,
      width: w,
      height: h,
    };
    playerRef.current.setSequence(scaledSequence, animationsMap);
  }, [sequence, animationsMap, displaySize]);

  useEffect(() => {
    playerRef.current?.setPingPong(pingPong);
  }, [pingPong]);

  const togglePlay = useCallback(() => {
    playerRef.current?.toggle();
    setPlaying((p) => !p);
  }, []);

  const restart = useCallback(() => {
    playerRef.current?.restart();
    setCurrentTimeMs(0);
  }, []);

  const handleSeek = useCallback((ms: number) => {
    playerRef.current?.seek(ms);
    setCurrentTimeMs(ms);
  }, []);

  if (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <p className="text-muted-foreground">{error}</p>
          <Button asChild>
            <Link to="/?tab=sequences" className="gap-2">
              <ArrowLeft className="h-4 w-4" />
              Back to Gallery
            </Link>
          </Button>
        </div>
      </div>
    );
  }

  if (!sequence) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Loading sequence...</p>
      </div>
    );
  }

  if (sequence.scenes.length === 0) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <p className="text-muted-foreground">This sequence has no scenes.</p>
          <Button asChild>
            <Link to="/?tab=sequences">Back to Gallery</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="flex items-center justify-between px-4 py-3 border-b">
        <Button variant="ghost" size="sm" asChild>
          <Link to="/?tab=sequences" className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            Back to Gallery
          </Link>
        </Button>
        <h1 className="text-sm font-medium truncate max-w-[200px]">{sequence.name}</h1>
        <div className="w-24" />
      </header>

      <main className="flex-1 flex flex-col items-center justify-center p-6 min-h-0">
        <div
          ref={containerRef}
          className="w-full max-w-4xl rounded-lg overflow-hidden shadow-lg bg-black flex items-center justify-center"
          style={{
            aspectRatio: `${sequence.width} / ${sequence.height}`,
            maxHeight: '70vh',
          }}
        >
          <canvas
            ref={canvasRef}
            className="block max-w-full max-h-full object-contain"
            style={{ backgroundColor: sequence.background || '#1a1a1a' }}
          />
        </div>

        <div className="flex flex-col items-center gap-4 mt-6 w-full max-w-md">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={restart} title="Restart">
              <RotateCcw className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" onClick={togglePlay} title={playing ? 'Pause' : 'Play'}>
              {playing ? <Pause className="h-8 w-8" /> : <Play className="h-8 w-8" />}
            </Button>
            <Button
              variant={pingPong ? 'default' : 'ghost'}
              size="icon"
              onClick={() => setPingPong((p) => !p)}
              title={pingPong ? 'Ping-pong: ON' : 'Ping-pong: OFF'}
            >
              <ArrowLeftRight className="h-4 w-4" />
            </Button>
          </div>

          <div className="flex items-center gap-3 w-full">
            <span className="text-xs tabular-nums text-muted-foreground w-16">
              {formatTimecode(currentTimeMs)}
            </span>
            <Slider
              value={[currentTimeMs]}
              max={totalDurationMs}
              step={100}
              onValueChange={([v]) => handleSeek(v)}
              className="flex-1"
            />
            <span className="text-xs tabular-nums text-muted-foreground w-16">
              {formatTimecode(totalDurationMs)}
            </span>
          </div>
        </div>
      </main>
    </div>
  );
}

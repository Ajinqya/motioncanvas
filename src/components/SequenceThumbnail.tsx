import { useEffect, useRef } from 'react';
import type { Sequence } from '../runtime/sequence';
import { createSequencePlayer, getSequenceDurationMs } from '../runtime/sequence';
import type { AnyAnimationDefinition } from '../runtime/types';
import { useAnimationRegistry } from '../animations/registry';
import { compileCustomCode } from '../runtime/custom-code';
import { cn } from '@/lib/utils';

function getAnimationId(entry: { definition: any }) {
  return 'id' in entry.definition
    ? entry.definition.id
    : 'name' in entry.definition && entry.definition.name
      ? entry.definition.name.toLowerCase().replace(/\s+/g, '-')
      : 'animation';
}

interface SequenceThumbnailProps {
  sequence: Sequence;
  className?: string;
  /** Control playback - play when true (e.g. on hover) */
  isPlaying?: boolean;
}

export function SequenceThumbnail({ sequence, className, isPlaying = true }: SequenceThumbnailProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const playerRef = useRef<ReturnType<typeof createSequencePlayer> | null>(null);
  const allAnimations = useAnimationRegistry();

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container || sequence.scenes.length === 0) return;

    // Build animations map (same logic as Composer)
    const map = new Map<string, AnyAnimationDefinition>();
    for (const entry of allAnimations) {
      map.set(getAnimationId(entry), entry.definition);
    }
    for (const scene of sequence.scenes) {
      if (scene.customCode && !map.has(scene.animationId)) {
        const compiled = compileCustomCode(scene.customCode, scene.customCodeConfig);
        if (compiled) {
          map.set(scene.animationId, compiled);
        }
      }
    }

    const containerRect = container.getBoundingClientRect();
    let w = Math.round(containerRect.width) || 200;
    let h = Math.round(containerRect.height) || 150;

    const aspect = sequence.width / sequence.height;
    if (w / h > aspect) {
      w = Math.round(h * aspect);
    } else {
      h = Math.round(w / aspect);
    }
    if (w < 1) w = 1;
    if (h < 1) h = 1;

    const dpr = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    canvas.style.width = `${w}px`;
    canvas.style.height = `${h}px`;

    const player = createSequencePlayer({
      canvas,
      sequence: { ...sequence, width: w, height: h },
      animations: map,
      disableAudio: true,
    });

    playerRef.current = player;

    // Seek to 50% progress for thumbnail preview (avoids blank intro frames)
    const totalMs = getSequenceDurationMs(sequence.scenes, sequence.audioClips);
    if (totalMs > 0) {
      player.seek(totalMs * 0.5);
    }

    if (isPlaying) {
      player.play();
    }

    return () => {
      player.destroy();
      playerRef.current = null;
    };
  }, [sequence, allAnimations, isPlaying]);

  useEffect(() => {
    const player = playerRef.current;
    if (!player) return;
    if (isPlaying) {
      player.play();
    } else {
      player.pause();
    }
  }, [isPlaying]);

  if (sequence.scenes.length === 0) {
    return (
      <div
        ref={containerRef}
        className={cn(
          'w-full h-full flex items-center justify-center bg-muted text-muted-foreground text-sm',
          className
        )}
        style={{
          aspectRatio: `${sequence.width} / ${sequence.height}`,
        }}
      >
        Empty sequence
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className={cn('w-full h-full overflow-hidden', className)}
      style={{
        aspectRatio: `${sequence.width} / ${sequence.height}`,
      }}
    >
      <canvas
        ref={canvasRef}
        className="block w-full h-full object-contain"
        style={{ backgroundColor: sequence.background || '#1a1a1a' }}
      />
    </div>
  );
}

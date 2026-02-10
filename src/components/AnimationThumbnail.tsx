import { useEffect, useRef } from 'react';
import type { AnyAnimationDefinition } from '../runtime/types';
import { createPlayer, type PlayerControls } from '../runtime/player';
import { cn } from '@/lib/utils';

interface AnimationThumbnailProps {
  animation: AnyAnimationDefinition;
  className?: string;
  /** Control playback externally - defaults to true for backwards compatibility */
  isPlaying?: boolean;
}

export function AnimationThumbnail({ animation, className, isPlaying = true }: AnimationThumbnailProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const playerRef = useRef<PlayerControls | null>(null);

  // Setup player on mount
  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    // Small delay to ensure DOM is ready
    const timeoutId = setTimeout(() => {
      try {
        // Use animation's native resolution - like the Player page.
        // Canvas will scale to fit via object-contain, avoiding zoom/crop.
        const params = 'params' in animation && animation.params && 'defaults' in animation.params
          ? animation.params.defaults
          : undefined;

        // Create player with original animation dimensions
        const player = createPlayer({
          canvas,
          animation,
          params,
        });

        playerRef.current = player;

        // Scale to fit (contain) within container - matches Player page behavior
        canvas.style.width = '100%';
        canvas.style.height = '100%';
        canvas.style.objectFit = 'contain';
        canvas.style.objectPosition = 'center';

        // Seek to 50% progress for thumbnail preview (avoids blank intro frames)
        const durationMs = animation.durationMs ?? 3000;
        player.seek((durationMs / 1000) * 0.5);
        
        // Only play if isPlaying is true (otherwise stays at 50% frame)
        if (isPlaying) {
          player.play();
        }
      } catch (error) {
        console.error('Failed to create animation preview:', error);
      }
    }, 50);

    // Cleanup
    return () => {
      clearTimeout(timeoutId);
      if (playerRef.current) {
        playerRef.current.destroy();
      }
    };
  }, [animation]);

  // Control playback based on isPlaying prop
  useEffect(() => {
    const player = playerRef.current;
    if (!player) return;
    
    if (isPlaying) {
      player.play();
    } else {
      player.pause();
    }
  }, [isPlaying]);

  return (
    <div 
      ref={containerRef} 
      className={cn(
        "w-full h-full overflow-hidden",
        className
      )}
    >
      <canvas 
        ref={canvasRef} 
        style={{ width: '100%', height: '100%', display: 'block', objectFit: 'contain', objectPosition: 'center' }}
      />
    </div>
  );
}

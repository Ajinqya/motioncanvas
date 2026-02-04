import { useEffect, useRef } from 'react';
import type { AnyAnimationDefinition } from '../runtime/types';
import { createPlayer, type PlayerControls } from '../runtime/player';
import { cn } from '@/lib/utils';

interface AnimationThumbnailProps {
  animation: AnyAnimationDefinition;
  className?: string;
}

export function AnimationThumbnail({ animation, className }: AnimationThumbnailProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const playerRef = useRef<PlayerControls | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    // Small delay to ensure DOM is ready
    const timeoutId = setTimeout(() => {
      // Get the actual container dimensions
      const containerRect = container.getBoundingClientRect();
      let containerWidth = containerRect.width;
      let containerHeight = containerRect.height;
      
      // Fallback if dimensions are not yet available
      if (containerWidth === 0 || containerHeight === 0) {
        containerWidth = 400;
        containerHeight = 300;
      }

      try {
        // Use container dimensions directly - parent already has correct aspect ratio
        const displayWidth = Math.round(containerWidth);
        const displayHeight = Math.round(containerHeight);

        // Create scaled animation definition to fill container
        const scaledAnimation: AnyAnimationDefinition = {
          ...animation,
          width: displayWidth,
          height: displayHeight,
        };

        // Add default params if they exist
        const params = 'params' in animation && animation.params && 'defaults' in animation.params
          ? animation.params.defaults
          : undefined;

        // Create player
        const player = createPlayer({
          canvas,
          animation: scaledAnimation,
          params,
        });

        playerRef.current = player;
        
        // Override the inline styles set by createPlayer to fill container
        canvas.style.width = '100%';
        canvas.style.height = '100%';
        
        // Start playing immediately
        player.play();
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
        style={{ width: '100%', height: '100%', display: 'block' }}
      />
    </div>
  );
}

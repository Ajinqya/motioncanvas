import type { 
  AnimationDefinition, 
  AnyAnimationDefinition,
  RenderContext,
  AudioData
} from './types';
import { isSimpleAnimation } from './types';
import { createAudioAnalyzer, generateSyntheticAudioData, type AudioAnalyzer } from './audio';

export interface PlayerOptions {
  canvas: HTMLCanvasElement;
  animation: AnyAnimationDefinition;
  params?: Record<string, unknown>;
  onFrame?: (frame: number, time: number) => void;
  /** Enable audio reactivity (provides synthetic data when no audio loaded) */
  audioEnabled?: boolean;
}

export interface PlayerControls {
  play: () => void;
  pause: () => void;
  toggle: () => void;
  seek: (time: number) => void;
  restart: () => void;
  destroy: () => void;
  isPlaying: () => boolean;
  getTime: () => number;
  getFrame: () => number;
  setParams: (params: Record<string, unknown>) => void;
  // Audio controls
  loadAudio: (file: File | string) => Promise<void>;
  isAudioLoaded: () => boolean;
  getAudioDuration: () => number;
}

/**
 * Creates a canvas animation player with HiDPI support,
 * play/pause/seek controls, and FPS throttling.
 * Supports both full AnimationDefinition and SimpleAnimationDefinition formats.
 */
export function createPlayer(options: PlayerOptions): PlayerControls {
  const { canvas, animation, onFrame, audioEnabled = false } = options;
  const isSimple = isSimpleAnimation(animation);
  let params = isSimple ? {} : { ...options.params };

  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Could not get 2d context');
  const context = ctx;

  const fps = animation.fps ?? 60;
  const frameDuration = 1000 / fps;
  const durationMs = animation.durationMs ?? (isSimple ? 3000 : undefined);
  const durationSec = durationMs ? durationMs / 1000 : Infinity;

  let playing = false;
  let startTime = 0;
  let pausedAt = 0;
  let currentTime = 0;
  let currentFrame = 0;
  let lastFrameTime = 0;
  let rafId: number | null = null;
  
  // Audio analyzer
  let audioAnalyzer: AudioAnalyzer | null = null;
  let audioLoaded = false;

  // HiDPI setup
  const dpr = window.devicePixelRatio || 1;
  const width = animation.width ?? 800;
  const height = animation.height ?? 600;

  function setupCanvas() {
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    context.scale(dpr, dpr);
  }

  function getAudioData(t: number): AudioData | undefined {
    if (!audioEnabled) return undefined;
    
    if (audioAnalyzer && audioLoaded) {
      return audioAnalyzer.getData();
    }
    
    // Provide synthetic audio data for demo/preview mode
    return generateSyntheticAudioData(t);
  }

  function createRenderContext(t: number, dt: number): RenderContext {
    // Calculate progress (0-1) based on time and duration
    const progress = durationMs 
      ? Math.min(t / durationSec, 1)
      : (t % 1); // For infinite animations, loop every second
    
    return {
      ctx: context,
      time: t,
      progress,
      deltaTime: dt,
      width,
      height,
      dpr,
      params,
      frame: currentFrame,
      audio: getAudioData(t),
    };
  }

  function clearCanvas() {
    context.save();
    context.setTransform(1, 0, 0, 1, 0, 0);
    if (animation.background) {
      context.fillStyle = animation.background;
      context.fillRect(0, 0, canvas.width, canvas.height);
    } else {
      context.clearRect(0, 0, canvas.width, canvas.height);
    }
    context.restore();
  }

  function renderFrame(t: number, dt: number) {
    clearCanvas();
    context.save();
    
    if (isSimple) {
      // Simple format: calculate progress (0-1) based on time and duration
      const progress = durationMs 
        ? Math.min(t / durationSec, 1)
        : (t % 1); // For infinite animations, loop every second
      
      animation.render(context, { width, height, progress });
    } else {
      // Full format: pass complete render context
      const fullAnimation = animation as AnimationDefinition<Record<string, unknown>>;
      fullAnimation.render(createRenderContext(t, dt));
    }
    
    context.restore();
  }

  function tick(timestamp: number) {
    if (!playing) return;

    // FPS throttling
    if (timestamp - lastFrameTime < frameDuration) {
      rafId = requestAnimationFrame(tick);
      return;
    }

    const dt = (timestamp - lastFrameTime) / 1000;
    lastFrameTime = timestamp;

    currentTime = (timestamp - startTime) / 1000;

    // Handle looping for finite animations
    if (durationMs && currentTime >= durationSec) {
      currentTime = currentTime % durationSec;
      startTime = timestamp - currentTime * 1000;
    }

    currentFrame = Math.floor(currentTime * fps);

    renderFrame(currentTime, dt);
    onFrame?.(currentFrame, currentTime);

    rafId = requestAnimationFrame(tick);
  }

  function play() {
    if (playing) return;
    playing = true;
    startTime = performance.now() - pausedAt * 1000;
    lastFrameTime = performance.now();
    rafId = requestAnimationFrame(tick);
    
    // Sync audio playback
    if (audioAnalyzer && audioLoaded) {
      audioAnalyzer.play();
    }
  }

  function pause() {
    if (!playing) return;
    playing = false;
    pausedAt = currentTime;
    if (rafId !== null) {
      cancelAnimationFrame(rafId);
      rafId = null;
    }
    
    // Sync audio playback
    if (audioAnalyzer && audioLoaded) {
      audioAnalyzer.pause();
    }
  }

  function toggle() {
    if (playing) pause();
    else play();
  }

  function seek(time: number) {
    pausedAt = Math.max(0, Math.min(time, durationSec));
    currentTime = pausedAt;
    currentFrame = Math.floor(currentTime * fps);
    startTime = performance.now() - pausedAt * 1000;

    // Sync audio seek
    if (audioAnalyzer && audioLoaded) {
      audioAnalyzer.seek(time);
    }

    // Render the frame at the seek position
    renderFrame(currentTime, 0);
    onFrame?.(currentFrame, currentTime);
  }

  function restart() {
    pausedAt = 0;
    currentTime = 0;
    currentFrame = 0;
    startTime = performance.now();
    
    // Sync audio restart
    if (audioAnalyzer && audioLoaded) {
      audioAnalyzer.seek(0);
    }
    
    renderFrame(0, 0);
    onFrame?.(0, 0);
    if (playing) {
      lastFrameTime = performance.now();
    }
  }

  function destroy() {
    pause();
    
    // Clean up audio analyzer
    if (audioAnalyzer) {
      audioAnalyzer.destroy();
      audioAnalyzer = null;
    }
    audioLoaded = false;
  }
  
  async function loadAudio(file: File | string): Promise<void> {
    // Create analyzer if needed
    if (!audioAnalyzer) {
      audioAnalyzer = createAudioAnalyzer();
    }
    
    await audioAnalyzer.load(file);
    audioLoaded = true;
    
    // Sync to current playback state
    audioAnalyzer.seek(currentTime);
    if (playing) {
      audioAnalyzer.play();
    }
  }
  
  function isAudioLoaded(): boolean {
    return audioLoaded;
  }
  
  function getAudioDuration(): number {
    return audioAnalyzer?.getDuration() ?? 0;
  }

  function setParams(newParams: Record<string, unknown>) {
    params = { ...newParams };
    // Re-render current frame with new params
    if (!playing) {
      renderFrame(currentTime, 0);
    }
  }

  // Initialize
  setupCanvas();
  if (!isSimple) {
    const fullAnimation = animation as AnimationDefinition<Record<string, unknown>>;
    if (fullAnimation.setup) {
      fullAnimation.setup(createRenderContext(0, 0));
    }
  }
  renderFrame(0, 0);
  onFrame?.(0, 0);

  return {
    play,
    pause,
    toggle,
    seek,
    restart,
    destroy,
    isPlaying: () => playing,
    getTime: () => currentTime,
    getFrame: () => currentFrame,
    setParams,
    // Audio controls
    loadAudio,
    isAudioLoaded,
    getAudioDuration,
  };
}

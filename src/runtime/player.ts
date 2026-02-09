import type { 
  AnimationDefinition, 
  AnyAnimationDefinition,
  RenderContext,
  AudioData
} from './types';
import { isSimpleAnimation } from './types';
import { createAudioAnalyzer, generateSyntheticAudioData, type AudioAnalyzer, type AudioSourceType } from './audio';

export interface PlayerOptions {
  canvas: HTMLCanvasElement;
  animation: AnyAnimationDefinition;
  params?: Record<string, unknown>;
  onFrame?: (frame: number, time: number) => void;
  /** Enable audio reactivity (provides synthetic data when no audio loaded) */
  audioEnabled?: boolean;
  /** Enable ping-pong playback (forward then reverse, 0→1→0) */
  pingPong?: boolean;
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
  // Playback mode
  setPingPong: (enabled: boolean) => void;
  isPingPong: () => boolean;
  // Audio controls
  loadAudio: (file: File | string) => Promise<void>;
  loadMicrophone: () => Promise<void>;
  unloadMicrophone: () => void;
  isAudioLoaded: () => boolean;
  isMicrophoneActive: () => boolean;
  getAudioSourceType: () => AudioSourceType;
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
  
  // Ping-pong playback mode
  let pingPong = options.pingPong ?? false;
  
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

  /** Get the effective loop duration (doubled for ping-pong) */
  function getLoopDuration(): number {
    if (!durationMs) return Infinity;
    return pingPong ? durationSec * 2 : durationSec;
  }

  /** 
   * Calculate animation progress (0→1) from internal time.
   * In ping-pong mode, progress goes 0→1→0 over a 2×duration cycle.
   */
  function getProgressFromTime(t: number): number {
    if (!durationMs) return t % 1;

    if (pingPong) {
      const cycleDuration = durationSec * 2;
      const cycleTime = t % cycleDuration;
      if (cycleTime <= durationSec) {
        // Forward: 0 → 1
        return Math.min(cycleTime / durationSec, 1);
      } else {
        // Reverse: 1 → 0
        return Math.max((cycleDuration - cycleTime) / durationSec, 0);
      }
    }

    return Math.min(t / durationSec, 1);
  }

  function getAudioData(t: number): AudioData | undefined {
    if (!audioEnabled) return undefined;
    
    if (audioAnalyzer && (audioLoaded || audioAnalyzer.isMicrophoneActive())) {
      return audioAnalyzer.getData();
    }
    
    // Provide synthetic audio data for demo/preview mode
    return generateSyntheticAudioData(t);
  }

  function createRenderContext(t: number, dt: number): RenderContext {
    const progress = getProgressFromTime(t);
    // Map time to progress-based time so animations using `time` also
    // reverse correctly in ping-pong mode
    const displayTime = durationMs ? progress * durationSec : t;
    
    return {
      ctx: context,
      time: displayTime,
      progress,
      deltaTime: dt,
      width,
      height,
      dpr,
      params,
      frame: Math.floor(displayTime * fps),
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
      // Simple format: calculate progress (0-1) using shared progress logic
      const progress = getProgressFromTime(t);
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

    // Handle looping for finite animations (doubled duration for ping-pong)
    const loopDur = getLoopDuration();
    if (durationMs && currentTime >= loopDur) {
      currentTime = currentTime % loopDur;
      startTime = timestamp - currentTime * 1000;
    }

    renderFrame(currentTime, dt);

    // Report progress-based display time to the UI so the slider
    // and time readout reflect the animation position (0→duration),
    // bouncing back and forth in ping-pong mode.
    const progress = getProgressFromTime(currentTime);
    const displayTime = durationMs ? progress * durationSec : currentTime;
    currentFrame = Math.floor(displayTime * fps);
    onFrame?.(currentFrame, displayTime);

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
    // `time` is the display time (0 to durationSec) from the slider.
    // Map to internal time in the forward direction of the cycle.
    const clamped = Math.max(0, Math.min(time, durationSec));
    currentTime = clamped;
    pausedAt = currentTime;
    startTime = performance.now() - currentTime * 1000;

    // Sync audio seek
    if (audioAnalyzer && audioLoaded) {
      audioAnalyzer.seek(clamped);
    }

    // Render the frame at the seek position
    renderFrame(currentTime, 0);

    const progress = getProgressFromTime(currentTime);
    const displayTime = durationMs ? progress * durationSec : currentTime;
    currentFrame = Math.floor(displayTime * fps);
    onFrame?.(currentFrame, displayTime);
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
  
  async function loadMicrophone(): Promise<void> {
    // Create analyzer if needed
    if (!audioAnalyzer) {
      audioAnalyzer = createAudioAnalyzer();
    }
    
    await audioAnalyzer.loadMicrophone();
    audioLoaded = false; // File is not loaded, mic is the source
  }
  
  function unloadMicrophone(): void {
    if (audioAnalyzer) {
      audioAnalyzer.unloadMicrophone();
    }
  }
  
  function isAudioLoaded(): boolean {
    return audioLoaded;
  }
  
  function isMicrophoneActive(): boolean {
    return audioAnalyzer?.isMicrophoneActive() ?? false;
  }
  
  function getAudioSourceType(): AudioSourceType {
    return audioAnalyzer?.getSourceType() ?? 'none';
  }
  
  function getAudioDuration(): number {
    return audioAnalyzer?.getDuration() ?? 0;
  }

  function setPingPong(enabled: boolean) {
    if (enabled === pingPong) return;

    // Preserve the current visual position when toggling modes
    const currentProgress = getProgressFromTime(currentTime);
    pingPong = enabled;

    // Map the current progress back to internal time (forward direction)
    if (durationMs && isFinite(durationSec)) {
      currentTime = currentProgress * durationSec;
      pausedAt = currentTime;
      startTime = performance.now() - currentTime * 1000;
    }

    if (!playing) {
      renderFrame(currentTime, 0);
    }
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
    // Playback mode
    setPingPong,
    isPingPong: () => pingPong,
    // Audio controls
    loadAudio,
    loadMicrophone,
    unloadMicrophone,
    isAudioLoaded,
    isMicrophoneActive,
    getAudioSourceType,
    getAudioDuration,
  };
}

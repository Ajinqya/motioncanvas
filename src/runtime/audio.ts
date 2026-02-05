/**
 * Audio Analysis Service
 * Provides real-time audio analysis using Web Audio API
 */

export interface AudioData {
  /** FFT frequency bins (0-255 per bin) */
  frequency: Uint8Array;
  /** Time domain waveform samples (0-255, 128 = silence) */
  waveform: Uint8Array;
  /** Overall amplitude/loudness (0-1) */
  amplitude: number;
  /** Low frequency energy (0-1) */
  bass: number;
  /** Mid frequency energy (0-1) */
  mid: number;
  /** High frequency energy (0-1) */
  high: number;
  /** Beat detected this frame */
  isBeat: boolean;
}

export interface AudioAnalyzer {
  /** Load an audio file */
  load(file: File | string): Promise<void>;
  /** Start playback */
  play(): void;
  /** Pause playback */
  pause(): void;
  /** Seek to time in seconds */
  seek(time: number): void;
  /** Get current playback time in seconds */
  getTime(): number;
  /** Get audio duration in seconds */
  getDuration(): number;
  /** Check if audio is playing */
  isPlaying(): boolean;
  /** Check if audio is loaded */
  isLoaded(): boolean;
  /** Get current audio analysis data */
  getData(): AudioData;
  /** Destroy and clean up resources */
  destroy(): void;
}

/**
 * Create an audio analyzer instance
 */
export function createAudioAnalyzer(): AudioAnalyzer {
  let audioContext: AudioContext | null = null;
  let analyser: AnalyserNode | null = null;
  let sourceNode: MediaElementAudioSourceNode | null = null;
  let audioElement: HTMLAudioElement | null = null;
  
  // Analysis buffers
  let frequencyData = new Uint8Array(0);
  let waveformData = new Uint8Array(0);
  
  // Beat detection state
  let lastBeatTime = 0;
  let beatThreshold = 0.6;
  let beatCooldown = 150; // ms between beats
  let previousBass = 0;
  
  // FFT size determines frequency resolution
  const FFT_SIZE = 256;
  
  function initAudioContext() {
    if (audioContext) return;
    
    audioContext = new AudioContext();
    analyser = audioContext.createAnalyser();
    analyser.fftSize = FFT_SIZE;
    analyser.smoothingTimeConstant = 0.8;
    
    const bufferLength = analyser.frequencyBinCount;
    frequencyData = new Uint8Array(bufferLength);
    waveformData = new Uint8Array(bufferLength);
    
    analyser.connect(audioContext.destination);
  }
  
  async function load(file: File | string): Promise<void> {
    initAudioContext();
    
    // Clean up existing audio
    if (sourceNode) {
      sourceNode.disconnect();
      sourceNode = null;
    }
    if (audioElement) {
      audioElement.pause();
      audioElement.src = '';
      audioElement = null;
    }
    
    // Create new audio element
    audioElement = new Audio();
    audioElement.crossOrigin = 'anonymous';
    
    if (typeof file === 'string') {
      audioElement.src = file;
    } else {
      audioElement.src = URL.createObjectURL(file);
    }
    
    // Wait for audio to be ready
    await new Promise<void>((resolve, reject) => {
      if (!audioElement) return reject(new Error('No audio element'));
      
      audioElement.oncanplaythrough = () => resolve();
      audioElement.onerror = () => reject(new Error('Failed to load audio'));
      audioElement.load();
    });
    
    // Connect to analyser
    if (audioContext && analyser && audioElement) {
      sourceNode = audioContext.createMediaElementSource(audioElement);
      sourceNode.connect(analyser);
    }
  }
  
  function play(): void {
    if (audioContext?.state === 'suspended') {
      audioContext.resume();
    }
    audioElement?.play();
  }
  
  function pause(): void {
    audioElement?.pause();
  }
  
  function seek(time: number): void {
    if (audioElement) {
      audioElement.currentTime = Math.max(0, Math.min(time, audioElement.duration || 0));
    }
  }
  
  function getTime(): number {
    return audioElement?.currentTime ?? 0;
  }
  
  function getDuration(): number {
    return audioElement?.duration ?? 0;
  }
  
  function isPlaying(): boolean {
    return audioElement ? !audioElement.paused : false;
  }
  
  function isLoaded(): boolean {
    return audioElement !== null && audioElement.readyState >= 2;
  }
  
  function calculateRMS(data: Uint8Array, start: number, end: number): number {
    let sum = 0;
    const length = Math.min(end, data.length) - start;
    if (length <= 0) return 0;
    
    for (let i = start; i < Math.min(end, data.length); i++) {
      // Normalize to -1 to 1 range
      const normalized = (data[i] - 128) / 128;
      sum += normalized * normalized;
    }
    
    return Math.sqrt(sum / length);
  }
  
  function calculateBandEnergy(data: Uint8Array, start: number, end: number): number {
    let sum = 0;
    const length = Math.min(end, data.length) - start;
    if (length <= 0) return 0;
    
    for (let i = start; i < Math.min(end, data.length); i++) {
      sum += data[i];
    }
    
    // Normalize to 0-1
    return sum / (length * 255);
  }
  
  function getData(): AudioData {
    // Default empty data
    const emptyData: AudioData = {
      frequency: frequencyData,
      waveform: waveformData,
      amplitude: 0,
      bass: 0,
      mid: 0,
      high: 0,
      isBeat: false,
    };
    
    if (!analyser || !audioElement) {
      return emptyData;
    }
    
    // Get frequency data
    analyser.getByteFrequencyData(frequencyData);
    analyser.getByteTimeDomainData(waveformData);
    
    const binCount = analyser.frequencyBinCount;
    
    // Calculate frequency band boundaries
    // Assuming 44.1kHz sample rate:
    // Each bin = sampleRate / fftSize = 44100 / 256 = 172.3 Hz per bin
    // Bass: 0-300Hz (bins 0-2)
    // Mid: 300-2000Hz (bins 2-12)  
    // High: 2000-20000Hz (bins 12+)
    const bassEnd = Math.floor(binCount * 0.05);  // ~5% of bins for bass
    const midEnd = Math.floor(binCount * 0.3);    // 5-30% for mids
    
    const bass = calculateBandEnergy(frequencyData, 0, bassEnd);
    const mid = calculateBandEnergy(frequencyData, bassEnd, midEnd);
    const high = calculateBandEnergy(frequencyData, midEnd, binCount);
    
    // Calculate overall amplitude from waveform
    const amplitude = calculateRMS(waveformData, 0, waveformData.length);
    
    // Beat detection based on bass energy spike
    const now = performance.now();
    let isBeat = false;
    
    if (bass > beatThreshold && bass > previousBass * 1.2 && now - lastBeatTime > beatCooldown) {
      isBeat = true;
      lastBeatTime = now;
    }
    
    previousBass = bass;
    
    return {
      frequency: frequencyData,
      waveform: waveformData,
      amplitude: Math.min(1, amplitude * 2), // Scale up for visibility
      bass,
      mid,
      high,
      isBeat,
    };
  }
  
  function destroy(): void {
    if (sourceNode) {
      sourceNode.disconnect();
      sourceNode = null;
    }
    if (audioElement) {
      audioElement.pause();
      if (audioElement.src.startsWith('blob:')) {
        URL.revokeObjectURL(audioElement.src);
      }
      audioElement.src = '';
      audioElement = null;
    }
    if (audioContext) {
      audioContext.close();
      audioContext = null;
    }
    analyser = null;
    frequencyData = new Uint8Array(0);
    waveformData = new Uint8Array(0);
  }
  
  return {
    load,
    play,
    pause,
    seek,
    getTime,
    getDuration,
    isPlaying,
    isLoaded,
    getData,
    destroy,
  };
}

/**
 * Generate synthetic audio data for demo/preview mode
 * Creates fake audio data based on time for animations without audio
 */
export function generateSyntheticAudioData(time: number): AudioData {
  const frequencyBins = 128;
  const frequency = new Uint8Array(frequencyBins);
  const waveform = new Uint8Array(frequencyBins);
  
  // Generate fake frequency spectrum
  for (let i = 0; i < frequencyBins; i++) {
    // Create a pattern that varies with time
    const phase = time * 2 + i * 0.1;
    const bassInfluence = Math.max(0, 1 - i / 10);
    const value = Math.sin(phase) * 0.3 + Math.sin(phase * 2.7) * 0.2 + 0.5;
    frequency[i] = Math.floor((value * bassInfluence + 0.2) * 255);
  }
  
  // Generate fake waveform (sine wave with noise)
  for (let i = 0; i < frequencyBins; i++) {
    const phase = time * 5 + i * 0.2;
    const value = Math.sin(phase) * 0.3 + Math.sin(phase * 3.7) * 0.15;
    waveform[i] = Math.floor((value + 0.5) * 255);
  }
  
  // Calculate synthetic values
  const pulse = Math.sin(time * 3) * 0.5 + 0.5;
  const bass = Math.sin(time * 2) * 0.3 + 0.4;
  const mid = Math.sin(time * 4 + 1) * 0.25 + 0.35;
  const high = Math.sin(time * 6 + 2) * 0.2 + 0.3;
  
  // Beat on every ~0.5 seconds
  const isBeat = Math.floor(time * 2) !== Math.floor((time - 0.016) * 2);
  
  return {
    frequency,
    waveform,
    amplitude: pulse,
    bass,
    mid,
    high,
    isBeat,
  };
}

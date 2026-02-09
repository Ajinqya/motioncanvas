/**
 * MP4 export using WebCodecs VideoEncoder + AudioEncoder and mp4-muxer.
 * Renders the sequence frame-by-frame to an offscreen canvas, encodes video with H.264,
 * optionally encodes audio from sequence.audioUrl with AAC, and muxes both into MP4.
 *
 * The muxer is created up-front so the encoders can stream chunks (with metadata) directly
 * into it. This ensures the H.264 decoder configuration (SPS/PPS) and AAC decoder
 * configuration are captured and written into the MP4 header.
 *
 * The encoding loop is async: it yields to the browser every few frames so the UI stays
 * responsive (progress bar updates) and waits when the encoder queue is full to prevent
 * runaway memory usage.
 */

import { createSequencePlayer, getSequenceDurationMs } from './sequence';
import type { Sequence, AudioClipEntry } from './sequence';
import type { AnyAnimationDefinition } from './types';
import { Muxer, ArrayBufferTarget } from 'mp4-muxer';

export interface ExportOptions {
  sequence: Sequence;
  animations: Map<string, AnyAnimationDefinition>;
  width?: number;
  height?: number;
  fps?: number;
  onProgress?: (pct: number) => void;
  signal?: AbortSignal;
}

/** Yield to the browser so the UI can repaint and callbacks can fire. */
const yieldToMain = () => new Promise<void>((r) => setTimeout(r, 0));

/** Max frames to queue before waiting for the encoder to drain. */
const ENCODER_QUEUE_THRESHOLD = 10;
/** Yield to the browser at least every N frames for UI responsiveness. */
const YIELD_EVERY_N_FRAMES = 4;
/** Audio is encoded in chunks of this many PCM samples. */
const AUDIO_CHUNK_SAMPLES = 1024;

// ─── Audio helpers ──────────────────────────────────────────────────────────

/** Decode an audio URL to raw PCM via AudioContext. */
async function decodeAudioUrl(url: string): Promise<AudioBuffer | null> {
  try {
    const res = await fetch(url);
    const arrayBuf = await res.arrayBuffer();
    const tempCtx = new AudioContext();
    const decoded = await tempCtx.decodeAudioData(arrayBuf);
    await tempCtx.close();
    return decoded;
  } catch {
    return null;
  }
}

/**
 * Mix all audio clips into a single AudioBuffer for the sequence duration.
 * Each clip is positioned at its startMs, trimmed to trimStartMs..trimEndMs,
 * and mixed at its volume level.
 */
async function mixAudioClips(
  clips: AudioClipEntry[],
  totalDurationSec: number,
): Promise<AudioBuffer | null> {
  if (clips.length === 0) return null;

  const sampleRate = 44100;
  const numChannels = 2;
  const totalSamples = Math.ceil(totalDurationSec * sampleRate);

  try {
    const offline = new OfflineAudioContext(numChannels, totalSamples, sampleRate);

    for (const clip of clips) {
      const decoded = await decodeAudioUrl(clip.audioUrl);
      if (!decoded) continue;

      const trimStartSec = clip.trimStartMs / 1000;
      // If trimEnd is 0, use full duration
      const trimEndSec = clip.trimEndMs > 0 ? clip.trimEndMs / 1000 : decoded.duration;
      const effectiveDuration = trimEndSec - trimStartSec;
      const startOffsetSec = clip.startMs / 1000;

      const source = offline.createBufferSource();
      source.buffer = decoded;

      const gainNode = offline.createGain();
      gainNode.gain.value = clip.volume;

      source.connect(gainNode);
      gainNode.connect(offline.destination);

      // Start the source at the timeline position, reading from the trim start,
      // for the effective duration
      source.start(startOffsetSec, trimStartSec, effectiveDuration);
    }

    return await offline.startRendering();
  } catch {
    return null;
  }
}

// ─── Main export ────────────────────────────────────────────────────────────

/**
 * Export the sequence to an MP4 Blob.
 */
export async function exportToMp4(options: ExportOptions): Promise<Blob> {
  const {
    sequence,
    animations,
    width = sequence.width,
    height = sequence.height,
    fps = sequence.fps,
    onProgress,
    signal,
  } = options;

  const totalDurationMs = getSequenceDurationMs(sequence.scenes, sequence.audioClips);
  if (totalDurationMs <= 0) {
    throw new Error('Sequence has no duration');
  }

  const totalFrames = Math.ceil((totalDurationMs / 1000) * fps);

  // ── Mix audio clips (if any) before creating the muxer ─────────────────

  const audioBuffer = (sequence.audioClips && sequence.audioClips.length > 0)
    ? await mixAudioClips(sequence.audioClips, totalDurationMs / 1000)
    : null;

  // ── Muxer (created first so the encoders can stream into it) ───────────

  const target = new ArrayBufferTarget();
  const muxer = new Muxer({
    target,
    video: {
      codec: 'avc',
      width,
      height,
      frameRate: fps,
    },
    ...(audioBuffer
      ? {
          audio: {
            codec: 'aac',
            numberOfChannels: audioBuffer.numberOfChannels,
            sampleRate: audioBuffer.sampleRate,
          },
        }
      : {}),
    fastStart: 'in-memory',
    firstTimestampBehavior: 'offset',
  });

  // ── Canvas + player ────────────────────────────────────────────────────

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;

  const proxyCanvas = document.createElement('canvas');
  proxyCanvas.width = width;
  proxyCanvas.height = height;
  const proxyCtx = proxyCanvas.getContext('2d', { alpha: false });
  if (!proxyCtx) throw new Error('Could not get 2d context for export');

  const exportSequence: Sequence = { ...sequence, width, height, fps };
  const player = createSequencePlayer({
    canvas,
    sequence: exportSequence,
    animations,
    onFrame: undefined,
    disableAudio: true,
  });

  // ── Video encoder → streams directly into the muxer ────────────────────

  let encoderError: Error | null = null;
  const videoEncoder = new VideoEncoder({
    output: (chunk, meta) => {
      muxer.addVideoChunk(chunk, meta);
    },
    error: (e) => {
      encoderError = e;
    },
  });

  videoEncoder.configure({
    codec: 'avc1.42E032',
    width,
    height,
    bitrate: 5_000_000,
    framerate: fps,
  });

  // ── Video frame loop (0 → ~90 %) ──────────────────────────────────────

  const videoWeight = audioBuffer ? 0.9 : 1; // reserve 10 % for audio pass

  for (let i = 0; i < totalFrames; i++) {
    if (signal?.aborted) {
      videoEncoder.close();
      player.destroy();
      throw new DOMException('Export aborted', 'AbortError');
    }
    if (encoderError) {
      videoEncoder.close();
      player.destroy();
      throw encoderError;
    }

    // Backpressure
    while (videoEncoder.encodeQueueSize > ENCODER_QUEUE_THRESHOLD) {
      await yieldToMain();
      if (signal?.aborted) {
        videoEncoder.close();
        player.destroy();
        throw new DOMException('Export aborted', 'AbortError');
      }
      if (encoderError) {
        videoEncoder.close();
        player.destroy();
        throw encoderError;
      }
    }

    const timeMs = (i / fps) * 1000;
    player.seek(timeMs);

    // DPR-aware copy
    proxyCtx.drawImage(canvas, 0, 0, width, height);
    const imageData = proxyCtx.getImageData(0, 0, width, height);
    const rgba = new Uint8Array(imageData.data);
    const frame = new VideoFrame(rgba, {
      format: 'RGBA',
      codedWidth: width,
      codedHeight: height,
      timestamp: (i * 1_000_000) / fps,
      duration: 1_000_000 / fps,
      colorSpace: { primaries: 'bt709', transfer: 'bt709', matrix: 'bt709', fullRange: false },
    });
    videoEncoder.encode(frame, { keyFrame: i % 30 === 0 });
    frame.close();

    onProgress?.(Math.round(videoWeight * 100 * (i + 1) / totalFrames));
    if ((i + 1) % YIELD_EVERY_N_FRAMES === 0) {
      await yieldToMain();
    }
  }

  await videoEncoder.flush();
  videoEncoder.close();
  player.destroy();
  if (encoderError) throw encoderError;

  // ── Audio encoding pass (~90 → 100 %) ─────────────────────────────────

  if (audioBuffer) {
    const audioEncoder = new AudioEncoder({
      output: (chunk, meta) => {
        muxer.addAudioChunk(chunk, meta);
      },
      error: (e) => {
        encoderError = e;
      },
    });

    audioEncoder.configure({
      codec: 'mp4a.40.2', // AAC-LC
      numberOfChannels: audioBuffer.numberOfChannels,
      sampleRate: audioBuffer.sampleRate,
      bitrate: 128_000,
    });

    const totalAudioSamples = audioBuffer.length;
    const numChannels = audioBuffer.numberOfChannels;

    for (let offset = 0; offset < totalAudioSamples; offset += AUDIO_CHUNK_SAMPLES) {
      if (signal?.aborted) {
        audioEncoder.close();
        throw new DOMException('Export aborted', 'AbortError');
      }
      if (encoderError) {
        audioEncoder.close();
        throw encoderError;
      }

      const size = Math.min(AUDIO_CHUNK_SAMPLES, totalAudioSamples - offset);

      // Build planar float32 buffer: [ch0 samples][ch1 samples]...
      const planar = new Float32Array(numChannels * size);
      for (let ch = 0; ch < numChannels; ch++) {
        const channelData = audioBuffer.getChannelData(ch);
        planar.set(channelData.subarray(offset, offset + size), ch * size);
      }

      const audioData = new AudioData({
        format: 'f32-planar',
        sampleRate: audioBuffer.sampleRate,
        numberOfFrames: size,
        numberOfChannels: numChannels,
        timestamp: Math.round((offset / audioBuffer.sampleRate) * 1_000_000),
        data: planar,
      });
      audioEncoder.encode(audioData);
      audioData.close();

      // Progress (90 → 100 %)
      const audioPct = (offset + size) / totalAudioSamples;
      onProgress?.(Math.round(90 + audioPct * 10));

      // Yield for UI + backpressure
      if ((offset / AUDIO_CHUNK_SAMPLES) % 40 === 0) {
        await yieldToMain();
      }
    }

    await audioEncoder.flush();
    audioEncoder.close();
    if (encoderError) throw encoderError;
  }

  // ── Finalize ───────────────────────────────────────────────────────────

  muxer.finalize();
  onProgress?.(100);

  return new Blob([target.buffer], { type: 'video/mp4' });
}

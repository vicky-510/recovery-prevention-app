import { Injectable, signal } from '@angular/core';

/** Gemini accepts WAV reliably, so recordings are converted before upload. */
const TARGET_SAMPLE_RATE = 16_000;
const MAX_RECORDING_MS = 15_000;

export interface Recording {
  base64: string;
  mimeType: string;
}

/**
 * Recording and speech playback. Both are optional capabilities: the app is
 * fully usable by tap alone and hides controls the browser cannot honour,
 * rather than offering buttons that do nothing.
 */
@Injectable({ providedIn: 'root' })
export class VoiceService {
  private readonly synth = typeof speechSynthesis !== 'undefined' ? speechSynthesis : null;

  private recorder: MediaRecorder | null = null;
  private chunks: Blob[] = [];
  private stopTimer: ReturnType<typeof setTimeout> | null = null;

  readonly recording = signal(false);

  get canRecord(): boolean {
    return (
      typeof MediaRecorder !== 'undefined' &&
      typeof navigator !== 'undefined' &&
      !!navigator.mediaDevices?.getUserMedia
    );
  }

  get canSpeak(): boolean {
    return this.synth !== null;
  }

  /**
   * Starts recording and resolves once the caller stops it, or after the cap.
   * Rejects if microphone permission is refused.
   */
  async record(): Promise<Recording> {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

    return new Promise<Recording>((resolve, reject) => {
      this.chunks = [];
      this.recorder = new MediaRecorder(stream);
      this.recording.set(true);

      const release = () => {
        stream.getTracks().forEach((track) => track.stop());
        this.recording.set(false);
        this.recorder = null;
        if (this.stopTimer) clearTimeout(this.stopTimer);
        this.stopTimer = null;
      };

      this.recorder.ondataavailable = (event) => {
        if (event.data.size > 0) this.chunks.push(event.data);
      };

      this.recorder.onerror = () => {
        release();
        reject(new Error('Recording failed.'));
      };

      this.recorder.onstop = () => {
        const blob = new Blob(this.chunks, { type: this.chunks[0]?.type ?? 'audio/webm' });
        release();

        this.toWav(blob)
          .then((base64) => resolve({ base64, mimeType: 'audio/wav' }))
          .catch(() => reject(new Error('Could not process the recording.')));
      };

      this.recorder.start();

      // A crisis note is short; the cap stops a forgotten recording running on.
      this.stopTimer = setTimeout(() => this.stopRecording(), MAX_RECORDING_MS);
    });
  }

  stopRecording(): void {
    if (this.recorder?.state === 'recording') this.recorder.stop();
  }

  /** Decodes, downmixes to 16 kHz mono, and encodes as base64 WAV. */
  private async toWav(blob: Blob): Promise<string> {
    const context = new AudioContext();
    let decoded: AudioBuffer;

    try {
      decoded = await context.decodeAudioData(await blob.arrayBuffer());
    } finally {
      await context.close();
    }

    const offline = new OfflineAudioContext(
      1,
      Math.max(1, Math.ceil(decoded.duration * TARGET_SAMPLE_RATE)),
      TARGET_SAMPLE_RATE
    );
    const source = offline.createBufferSource();
    source.buffer = decoded;
    source.connect(offline.destination);
    source.start();

    const samples = (await offline.startRendering()).getChannelData(0);
    return this.encodeWav(samples, TARGET_SAMPLE_RATE);
  }

  private encodeWav(samples: Float32Array, sampleRate: number): string {
    const bytes = new ArrayBuffer(44 + samples.length * 2);
    const view = new DataView(bytes);

    const writeText = (offset: number, text: string) => {
      for (let i = 0; i < text.length; i += 1) view.setUint8(offset + i, text.charCodeAt(i));
    };

    writeText(0, 'RIFF');
    view.setUint32(4, 36 + samples.length * 2, true);
    writeText(8, 'WAVE');
    writeText(12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true); // PCM
    view.setUint16(22, 1, true); // mono
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * 2, true);
    view.setUint16(32, 2, true);
    view.setUint16(34, 16, true);
    writeText(36, 'data');
    view.setUint32(40, samples.length * 2, true);

    for (let i = 0; i < samples.length; i += 1) {
      const clamped = Math.max(-1, Math.min(1, samples[i]));
      view.setInt16(44 + i * 2, clamped * 0x7fff, true);
    }

    // Chunked to avoid blowing the argument limit on long recordings.
    const raw = new Uint8Array(bytes);
    let binary = '';
    for (let i = 0; i < raw.length; i += 8192) {
      binary += String.fromCharCode(...raw.subarray(i, i + 8192));
    }

    return btoa(binary);
  }

  /** Reads text aloud, slightly slowed — the listener is under stress. */
  speak(text: string): void {
    if (!this.synth) return;

    this.synth.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.9;
    this.synth.speak(utterance);
  }

  stopSpeaking(): void {
    this.synth?.cancel();
  }
}

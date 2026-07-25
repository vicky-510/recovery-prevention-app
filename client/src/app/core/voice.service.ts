import { Injectable, signal } from '@angular/core';

/**
 * Web Speech API wrapper. Both halves are optional capabilities — the app is
 * fully usable by tap alone, and degrades silently where the browser lacks
 * support rather than presenting controls that do nothing.
 */
@Injectable({ providedIn: 'root' })
export class VoiceService {
  private recognition: any = null;
  private readonly synth = typeof speechSynthesis !== 'undefined' ? speechSynthesis : null;

  readonly listening = signal(false);

  constructor() {
    const Recognition =
      (window as any).SpeechRecognition ?? (window as any).webkitSpeechRecognition;

    if (Recognition) {
      this.recognition = new Recognition();
      this.recognition.lang = 'en-US';
      this.recognition.continuous = false;
      this.recognition.interimResults = false;
      this.recognition.maxAlternatives = 3;
    }
  }

  get canListen(): boolean {
    return this.recognition !== null;
  }

  get canSpeak(): boolean {
    return this.synth !== null;
  }

  /** Resolves with every alternative the recogniser heard, lowercased. */
  listen(): Promise<string[]> {
    return new Promise((resolve, reject) => {
      if (!this.recognition) {
        reject(new Error('Speech recognition is not available in this browser.'));
        return;
      }

      this.listening.set(true);

      this.recognition.onresult = (event: any) => {
        const alternatives = Array.from(event.results[0] as ArrayLike<{ transcript: string }>).map(
          (alt) => alt.transcript.toLowerCase().trim()
        );
        resolve(alternatives);
      };

      this.recognition.onerror = (event: any) =>
        reject(new Error(event.error ?? 'Could not hear anything.'));

      this.recognition.onend = () => this.listening.set(false);

      this.recognition.start();
    });
  }

  stopListening(): void {
    this.recognition?.abort();
    this.listening.set(false);
  }

  /** Reads text aloud, slightly slowed — the listener is under stress. */
  speak(text: string): void {
    if (!this.synth) return;

    this.synth.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.9;
    utterance.pitch = 1;
    this.synth.speak(utterance);
  }

  stopSpeaking(): void {
    this.synth?.cancel();
  }
}

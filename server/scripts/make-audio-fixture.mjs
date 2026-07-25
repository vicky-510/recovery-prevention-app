/**
 * Regenerates the spoken recording that the browser test feeds in as a fake
 * microphone. The committed WAV is what the suite uses; this only needs running
 * if that file is lost or the spoken line should change.
 *
 *   cd server && node scripts/make-audio-fixture.mjs
 *
 * Lives under server/ because that is where @google/genai is installed.
 */
import 'dotenv/config';
import fs from 'node:fs/promises';
import { GoogleGenAI } from '@google/genai';

const LINE = "I really want to drink right now. I can't stop thinking about it and I'm scared.";
const OUT = new URL('../../client/e2e/spoken-craving.wav', import.meta.url);
const SAMPLE_RATE = 24_000;

if (!process.env.GEMINI_API_KEY) {
  throw new Error('GEMINI_API_KEY is required. Set it in server/.env or the environment.');
}

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

console.log(`Synthesising: "${LINE}"`);

const response = await ai.models.generateContent({
  model: 'gemini-2.5-flash-preview-tts',
  contents: LINE,
  config: {
    responseModalities: ['AUDIO'],
    speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } } },
  },
});

const pcm = Buffer.from(response.candidates[0].content.parts[0].inlineData.data, 'base64');

// The model returns raw 16-bit PCM; Chrome's fake capture needs a WAV container.
const header = Buffer.alloc(44);
header.write('RIFF', 0);
header.writeUInt32LE(36 + pcm.length, 4);
header.write('WAVE', 8);
header.write('fmt ', 12);
header.writeUInt32LE(16, 16);
header.writeUInt16LE(1, 20); // PCM
header.writeUInt16LE(1, 22); // mono
header.writeUInt32LE(SAMPLE_RATE, 24);
header.writeUInt32LE(SAMPLE_RATE * 2, 28);
header.writeUInt16LE(2, 32);
header.writeUInt16LE(16, 34);
header.write('data', 36);
header.writeUInt32LE(pcm.length, 40);

await fs.writeFile(OUT, Buffer.concat([header, pcm]));
console.log(`Wrote client/e2e/spoken-craving.wav (${Math.round(pcm.length / 1024)} KB)`);

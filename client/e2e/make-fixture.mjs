/**
 * Regenerates the spoken fixture that Chrome feeds in as a fake microphone.
 * The committed WAV is what the e2e test uses; this only needs running if the
 * fixture is lost or the line should change.
 *
 *   node e2e/make-fixture.mjs
 */
import fs from 'node:fs/promises';
import { GoogleGenAI } from '@google/genai';

const LINE = "I really want to drink right now. I can't stop thinking about it and I'm scared.";
const OUT = new URL('./spoken-craving.wav', import.meta.url);

const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) throw new Error('Set GEMINI_API_KEY to regenerate the fixture.');

const ai = new GoogleGenAI({ apiKey });

const response = await ai.models.generateContent({
  model: 'gemini-2.5-flash-preview-tts',
  contents: LINE,
  config: {
    responseModalities: ['AUDIO'],
    speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } } },
  },
});

const pcm = Buffer.from(response.candidates[0].content.parts[0].inlineData.data, 'base64');
const sampleRate = 24_000;

const header = Buffer.alloc(44);
header.write('RIFF', 0);
header.writeUInt32LE(36 + pcm.length, 4);
header.write('WAVE', 8);
header.write('fmt ', 12);
header.writeUInt32LE(16, 16);
header.writeUInt16LE(1, 20);
header.writeUInt16LE(1, 22);
header.writeUInt32LE(sampleRate, 24);
header.writeUInt32LE(sampleRate * 2, 28);
header.writeUInt16LE(2, 32);
header.writeUInt16LE(16, 34);
header.write('data', 36);
header.writeUInt32LE(pcm.length, 40);

await fs.writeFile(OUT, Buffer.concat([header, pcm]));
console.log(`Wrote ${OUT.pathname} (${Math.round(pcm.length / 1024)} KB)`);

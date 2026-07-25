import { defineConfig } from '@playwright/test';
import path from 'node:path';

const fakeMicrophone = path.resolve(__dirname, 'e2e', 'spoken-craving.wav');

export default defineConfig({
  testDir: './e2e',
  // A run touches a live Gemini call, so give it room and keep it serial.
  timeout: 120_000,
  workers: 1,
  reporter: 'list',
  use: {
    baseURL: 'http://localhost:4200',
    // Drives the installed Chrome rather than downloading a browser.
    channel: 'chrome',
    launchOptions: {
      args: [
        // Grants the microphone prompt, and feeds the WAV in as the device, so
        // getUserMedia and MediaRecorder run for real without a person present.
        // The file flag is ignored unless the fake device is enabled too — with
        // only the first two, capture silently yields silence.
        '--use-fake-ui-for-media-stream',
        '--use-fake-device-for-media-stream',
        `--use-file-for-fake-audio-capture=${fakeMicrophone}`,
      ],
    },
  },
});

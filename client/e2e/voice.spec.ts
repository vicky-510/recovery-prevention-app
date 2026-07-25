import { expect, test } from '@playwright/test';

/**
 * Exercises the one path unit tests cannot reach: a real browser capturing from
 * a real MediaRecorder, converting to WAV, and getting a script back from a live
 * Gemini call. Chrome is launched with the fixture WAV standing in for a
 * microphone, so nobody has to speak into one.
 */

const EVALUATOR = { email: 'evaluator@steady.app', password: 'Steady2026!' };

async function signIn(page: import('@playwright/test').Page) {
  await page.goto('/');

  // A stored session would skip the form entirely.
  if (await page.getByRole('button', { name: 'Sign in' }).isVisible().catch(() => false)) {
    await page.getByLabel('Email').fill(EVALUATOR.email);
    await page.getByLabel('Password').fill(EVALUATOR.password);
    await page.getByRole('button', { name: 'Sign in' }).click();
  }

  await expect(page.getByRole('heading', { name: "What's happening?" })).toBeVisible();
}

test('a spoken note produces a script without choosing a category', async ({ page }) => {
  await signIn(page);

  const record = page.getByRole('button', { name: /just say it/i });
  await expect(record).toBeVisible();

  await record.click();

  // Confirms getUserMedia resolved and MediaRecorder started.
  const stop = page.getByRole('button', { name: /when you're done/i });
  await expect(stop).toBeVisible();

  // Long enough for the fixture's opening sentence to play into the recorder.
  await page.waitForTimeout(7000);
  await stop.click();

  await expect(page.getByText('Preparing your steps…')).toBeVisible();

  // Gemini classified the audio and returned steps. The category label proves it
  // was chosen from the recording, since nothing was tapped to select it.
  await expect(page.getByText(/Step 1 of \d+/)).toBeVisible({ timeout: 60_000 });
  await expect(page.getByText('Urge to use right now')).toBeVisible();

  const step = page.locator('section[aria-live="polite"] p').last();
  await expect(step).not.toBeEmpty();

  await page.getByRole('button', { name: /next/i }).click();
  await expect(page.getByText(/Step 2 of \d+/)).toBeVisible();
});

test('the microphone control is offered when the browser supports capture', async ({ page }) => {
  await signIn(page);

  const supported = await page.evaluate(
    () => typeof MediaRecorder !== 'undefined' && !!navigator.mediaDevices?.getUserMedia
  );

  expect(supported).toBe(true);
  await expect(page.getByRole('button', { name: /just say it/i })).toBeVisible();
});

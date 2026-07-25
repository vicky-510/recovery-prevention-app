import { expect, test } from '@playwright/test';

/**
 * Exercises the path unit tests cannot reach: a real getUserMedia capture, a
 * real MediaRecorder, the browser's own WAV conversion, and a live model call.
 * Chrome is launched with a spoken WAV standing in for a microphone, so this
 * needs neither a person nor audio hardware.
 *
 * Kept to a single test on purpose. Credential endpoints are rate limited, so
 * one sign-in per run leaves room to run the suite repeatedly.
 */

const EVALUATOR = { email: 'evaluator@steady.app', password: 'Steady2026!' };

test('a spoken note produces a script without choosing a category', async ({ page }) => {
  await page.goto('/');

  await page.getByLabel('Email').fill(EVALUATOR.email);
  await page.getByLabel('Password').fill(EVALUATOR.password);
  await page.getByRole('button', { name: 'Sign in' }).click();

  await expect(page.getByRole('heading', { name: "What's happening?" })).toBeVisible();

  // The control only renders where the browser can actually capture.
  expect(
    await page.evaluate(
      () => typeof MediaRecorder !== 'undefined' && !!navigator.mediaDevices?.getUserMedia
    )
  ).toBe(true);

  const record = page.getByRole('button', { name: /just say it/i });
  await expect(record).toBeVisible();
  await record.click();

  // Visible only once getUserMedia resolved and MediaRecorder started.
  const stop = page.getByRole('button', { name: /when you're done/i });
  await expect(stop).toBeVisible();

  // Long enough for the fixture's opening sentence to play into the recorder.
  await page.waitForTimeout(7000);
  await stop.click();

  await expect(page.getByText('Preparing your steps…')).toBeVisible();

  // A script came back, and the category label proves the model chose it from
  // the recording — nothing was tapped to select one.
  await expect(page.getByText(/Step 1 of \d+/)).toBeVisible({ timeout: 60_000 });
  await expect(page.getByText('Urge to use right now')).toBeVisible();

  const step = page.locator('section[aria-live="polite"] p').last();
  await expect(step).not.toBeEmpty();

  await page.getByRole('button', { name: /next/i }).click();
  await expect(page.getByText(/Step 2 of \d+/)).toBeVisible();
});

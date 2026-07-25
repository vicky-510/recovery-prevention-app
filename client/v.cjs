const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch({ channel: 'chrome' });
  const p = await b.newPage();
  let err = null;
  p.on('pageerror', (e) => (err = e.message));
  await p.goto('http://localhost:4200/', { waitUntil: 'domcontentloaded' });
  await p.waitForTimeout(2500);
  await p.getByLabel('Email').fill('evaluator@steady.app');
  await p.getByLabel('Password').fill('Steady2026!');
  await p.getByRole('button', { name: 'Sign in' }).click();
  const ok = await p.getByRole('heading', { name: "What's happening?" }).waitFor({ timeout: 20000 }).then(() => true).catch(() => false);
  console.log(`  renders + signs in: ${ok} | js error: ${err ?? 'none'}`);
  await b.close();
})();

import { expect, test } from '@playwright/test';

/** Workbook Steps 20–22 — Weigh screen, scale switching, tolerance feedback. */

const API = 'http://localhost:3000/api';
// The Dummy scale's simulated pour runs for this long (training simulator's own
// DEFAULT_RAMP_MS) — long enough that the reading is still easing, not just past the
// tolerance band, so assertions wait for the OK button itself (which requires a *stable*
// reading) rather than racing the status text, which updates before the pour settles.
const RAMP_SETTLE_TIMEOUT = 6_000;

test.beforeEach(async ({ request }) => {
  await request.post(`${API}/training/reset`);
});

async function dispenseAndConfirm(page: import('@playwright/test').Page) {
  await page.getByRole('button', { name: '▶ Simulate dispense' }).click();
  await expect(page.getByRole('button', { name: 'OK · Confirm' })).toBeEnabled({
    timeout: RAMP_SETTLE_TIMEOUT,
  });
  await expect(page.getByText('WITHIN TOLERANCE — PRESS OK TO CONFIRM')).toBeVisible();
  await page.getByRole('button', { name: 'OK · Confirm' }).click();
}

test('weighs batch B-24187 component by component, switching scale and unit at component 4', async ({
  page,
}) => {
  await page.goto('/');
  await page.getByRole('row', { name: 'Select batch B-24187' }).click();
  await expect(page.getByLabel('batch crumb')).toContainText('B-24187');

  const header = page.locator('.wms-weigh-head');

  // Component 1 — Remazol Brill. Blue RSPL, 3 kg precision scale, target 1240.0 g ± 6.0 g.
  await expect(header.getByText('Remazol Brill. Blue RSPL')).toBeVisible();
  await expect(page.getByText('3 kg precision')).toBeVisible();
  await expect(page.getByText(/TARE 214\.0 g/)).toBeVisible();

  await page.screenshot({ path: 'playwright/.results/step-20-weigh-screen.png', fullPage: true });

  await dispenseAndConfirm(page);

  // Component 2 — Remazol Red RB, same precision scale.
  await expect(header.getByText('Remazol Red RB')).toBeVisible();
  await expect(page.getByText('3 kg precision')).toBeVisible();

  await dispenseAndConfirm(page);

  // Component 3 — Remazol Yellow RGB, still the precision scale.
  await expect(header.getByText('Remazol Yellow RGB')).toBeVisible();
  await expect(page.getByText('3 kg precision')).toBeVisible();

  await page.screenshot({
    path: 'playwright/.results/step-21-scale-switch-before.png',
    fullPage: true,
  });

  await dispenseAndConfirm(page);

  // Component 4 — Sodium Sulphate: the station switches scale class and unit automatically.
  await expect(header.getByText('Sodium Sulphate')).toBeVisible();
  await expect(page.getByText('32 kg floor')).toBeVisible();
  await expect(page.getByText(/TARE 1\.850 kg/)).toBeVisible();

  await page.screenshot({
    path: 'playwright/.results/step-21-scale-switch-after.png',
    fullPage: true,
  });
});

test('an out-of-tolerance reading blocks confirm until the operator re-tares and dispenses again', async ({
  page,
}) => {
  await page.goto('/');
  await page.getByRole('row', { name: 'Select batch B-24187' }).click();
  await expect(page.getByLabel('batch crumb')).toContainText('B-24187');

  await page.getByRole('button', { name: '▶ Simulate overshoot' }).click();
  await expect(page.getByText(/OVER TOLERANCE — SURPLUS/)).toBeVisible();
  await expect(page.getByRole('button', { name: 'OK · Confirm' })).toBeDisabled();
  // The overshoot pour settles on the same timer; re-taring before it finishes would re-base
  // the still-running pour rather than zero it, so wait for it to fully land first.
  await page.waitForTimeout(RAMP_SETTLE_TIMEOUT / 2);

  await page.screenshot({ path: 'playwright/.results/step-22-tolerance-ui.png', fullPage: true });

  await page.getByRole('button', { name: 'Re-tare' }).click();
  await expect(page.getByText('DISPENSE — 1240.0 g REMAINING')).toBeVisible();
  await expect(page.getByRole('button', { name: 'OK · Confirm' })).toBeDisabled();

  await dispenseAndConfirm(page);
  await expect(page.locator('.wms-weigh-head').getByText('Remazol Red RB')).toBeVisible();
});

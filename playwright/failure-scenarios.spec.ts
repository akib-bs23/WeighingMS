import { expect, test } from '@playwright/test';

/** Workbook Step 30 — the 9 failure scenarios (story 010 AC2), each proving the defined
 *  behaviour through the real UI. Most of the underlying mechanics are already covered at the
 *  API/unit level elsewhere (bolts 006, 008, 009, 010); this spec is the end-to-end proof. */

const API = 'http://localhost:3000/api';

test.beforeEach(async ({ request }) => {
  await request.post(`${API}/training/reset`);
});

test('scale unavailable — safe failure', async ({ page, request }) => {
  await page.goto('/');
  await page.getByRole('row', { name: 'Select batch B-24187' }).click();
  await expect(page.getByLabel('batch crumb')).toContainText('B-24187');

  await request.put(`${API}/training/scales/scale-3kg`, { data: { online: false } });
  await expect(page.getByText('SCALE OFFLINE', { exact: true })).toBeVisible({ timeout: 3_000 });
  await expect(page.getByRole('button', { name: 'OK · Confirm' })).toBeDisabled();
  await expect(page.locator('.wms-strip').getByText(/SCALE 3 kg · OFFLINE/)).toBeVisible({
    timeout: 3_000,
  });

  await request.put(`${API}/training/scales/scale-3kg`, { data: { online: true } });
  await expect(page.locator('.wms-strip').getByText(/SCALE 3 kg · READY/)).toBeVisible({
    timeout: 3_000,
  });
});

test('OrgaTEX unavailable — defined behaviour (queue error; in-progress batch still completes)', async ({
  page,
  request,
}) => {
  await page.goto('/');
  await page.getByRole('row', { name: 'Select batch B-24187' }).click();
  await expect(page.getByLabel('batch crumb')).toContainText('B-24187');

  // OrgaTEX going offline mid-session must not stop weighing already in progress (TD-8).
  await request.put(`${API}/training/orgatex`, { data: { online: false } });
  await expect(page.locator('.wms-strip').getByText('ORGATEX · UNAVAILABLE')).toBeVisible({
    timeout: 3_000,
  });

  for (let i = 0; i < 5; i++) {
    await page.getByRole('button', { name: '▶ Simulate dispense' }).click();
    await expect(page.getByRole('button', { name: 'OK · Confirm' })).toBeEnabled({
      timeout: 6_000,
    });
    await page.getByRole('button', { name: 'OK · Confirm' }).click();
  }

  await expect(page.getByText('Batch B-24187 weighed')).toBeVisible({ timeout: 8_000 });
  const writeBackRow = page.locator('.summary .r', { hasText: 'Written to OrgaTEX' });
  await expect(writeBackRow).toContainText('PENDING');

  await request.put(`${API}/training/orgatex`, { data: { online: true } });
  await page.getByRole('button', { name: 'Retry' }).click();
  await expect(page.getByText(/CONFIRMED \d{2}:\d{2}:\d{2}/)).toBeVisible({ timeout: 5_000 });
});

test('printer unavailable — defined behaviour (preview still shown, Retry recovers)', async ({
  page,
  request,
}) => {
  await page.goto('/');
  await page.getByRole('row', { name: 'Select batch B-24187' }).click();
  await expect(page.getByLabel('batch crumb')).toContainText('B-24187');

  for (let i = 0; i < 5; i++) {
    await page.getByRole('button', { name: '▶ Simulate dispense' }).click();
    await expect(page.getByRole('button', { name: 'OK · Confirm' })).toBeEnabled({
      timeout: 6_000,
    });
    await page.getByRole('button', { name: 'OK · Confirm' }).click();
  }

  // Printer must be offline *before* Screen 3 mounts, since the ticket auto-composes and
  // attempts to print as soon as the screen appears.
  await request.put(`${API}/training/printer`, { data: { online: false } });
  await expect(page.getByText('Batch B-24187 weighed')).toBeVisible({ timeout: 8_000 });
  await expect(page.getByText('Printer unavailable')).toBeVisible({ timeout: 3_000 });
  // A still-PENDING ticket keeps the "Print ticket" label — clicking it again is the retry
  // (bolt 010's TicketService.submit/retry semantics; there is no separate Retry control here).
  const printAgain = page.getByRole('button', { name: 'Print ticket' });
  await expect(printAgain).toBeEnabled();

  await request.put(`${API}/training/printer`, { data: { online: true } });
  await printAgain.click();
  await expect(page.getByText('FCI DYEING — WEIGHING TICKET')).toBeVisible({ timeout: 3_000 });
});

test('invalid weight — cannot confirm', async ({ page, request }) => {
  await page.goto('/');
  await page.getByRole('row', { name: 'Select batch B-24187' }).click();
  await expect(page.getByLabel('batch crumb')).toContainText('B-24187');

  await request.post(`${API}/training/scales/scale-3kg/weight`, { data: { netMg: -5_000 } });
  await expect(page.getByText('INVALID READING', { exact: true })).toBeVisible({ timeout: 3_000 });
  await expect(page.getByRole('button', { name: 'OK · Confirm' })).toBeDisabled();
});

test('over tolerance — cannot confirm', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('row', { name: 'Select batch B-24187' }).click();
  await expect(page.getByLabel('batch crumb')).toContainText('B-24187');

  await page.getByRole('button', { name: '▶ Simulate overshoot' }).click();
  await expect(page.getByText(/OVER TOLERANCE — SURPLUS/)).toBeVisible();
  await expect(page.getByRole('button', { name: 'OK · Confirm' })).toBeDisabled();
});

test('under tolerance — cannot confirm', async ({ page, request }) => {
  await page.goto('/');
  await page.getByRole('row', { name: 'Select batch B-24187' }).click();
  await expect(page.getByLabel('batch crumb')).toContainText('B-24187');

  await request.post(`${API}/training/scales/scale-3kg/weight`, { data: { netMg: 93_000 } });
  await expect(page.getByText(/DISPENSE — /)).toBeVisible();
  await expect(page.getByRole('button', { name: 'OK · Confirm' })).toBeDisabled();
});

test('Re-tare — weight reset', async ({ page, request }) => {
  await page.goto('/');
  await page.getByRole('row', { name: 'Select batch B-24187' }).click();
  await expect(page.getByLabel('batch crumb')).toContainText('B-24187');

  await request.post(`${API}/training/scales/scale-3kg/weight`, { data: { netMg: 500_000 } });
  await expect(page.getByText('500.0', { exact: false })).toBeVisible();
  await page.getByRole('button', { name: 'Re-tare' }).click();
  await expect(page.locator('.cell.live .v')).toContainText('0.0');
});

test('Quit — safe exit', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('row', { name: 'Select batch B-24187' }).click();
  await expect(page.getByLabel('batch crumb')).toContainText('B-24187');

  await page.getByRole('button', { name: '▶ Simulate dispense' }).click();
  await expect(page.getByRole('button', { name: 'OK · Confirm' })).toBeEnabled({ timeout: 6_000 });
  await page.getByRole('button', { name: 'Quit' }).click();

  await expect(page.getByText('Select a pending component to continue.')).toBeVisible();
  await expect(
    page.getByRole('button', { name: /Remazol Brill\. Blue RSPL, pending/ }),
  ).toBeVisible();
});

test('incomplete batch — cannot complete', async ({ page, request }) => {
  await page.goto('/');
  const start = await request.post(`${API}/sessions`, { data: { batchId: 'B-24187' } });
  const sessionId = ((await start.json()) as { sessionId: string }).sessionId;

  // Only confirm 4 of 5 components — the batch is deliberately left incomplete.
  for (const [scaleId, mg] of [
    ['scale-3kg', 1_241_500],
    ['scale-3kg', 385_400],
    ['scale-3kg', 94_200],
    ['scale-32kg', 23_980_000],
  ] as const) {
    await request.post(`${API}/training/scales/${scaleId}/weight`, { data: { netMg: mg } });
    await request.post(`${API}/sessions/${sessionId}/confirm`);
  }

  const res = await request.post(`${API}/sessions/${sessionId}/complete`);
  expect(res.status()).toBe(409);
  const body = (await res.json()) as { error: { code: string } };
  expect(body.error.code).toBe('BATCH_INCOMPLETE');
});

import { expect, test } from '@playwright/test';

/** Workbook Step 19 — Connect Batch Selection. */

const API = 'http://localhost:3000/api';

test.beforeEach(async ({ request }) => {
  await request.post(`${API}/training/reset`);
});

test('shows the queue from OrgaTEX and selects a released batch', async ({ page }) => {
  // Browser requests go to the Vite origin (proxied to :3000), not directly to the API origin,
  // so matching must be by path, not by the backend's own origin.
  const requests: string[] = [];
  page.on('request', (req) => {
    const path = new URL(req.url()).pathname;
    if (path.startsWith('/api')) requests.push(path.slice('/api'.length));
  });

  await page.goto('/');

  await expect(page.getByText('WeighingMS')).toBeVisible();
  await expect(page.getByText('R. Karim')).toBeVisible();

  const row = page.getByRole('row', { name: 'Select batch B-24187' });
  await expect(row).toBeVisible();
  await expect(page.getByRole('row', { name: 'Select batch B-24188' })).toBeVisible();
  await expect(page.getByText('QUEUED').first()).toBeVisible();

  await page.screenshot({ path: 'playwright/.results/step-19-batch-screen.png', fullPage: true });

  await row.click();

  await expect(page.getByLabel('batch crumb')).toContainText('B-24187');
  await expect(page.getByLabel('batch crumb')).toContainText('SO-9931');
  await expect(page.getByLabel('batch crumb')).toContainText('JET-04');

  // Workbook Step 19: selection must read the batch, then its recipe — in that order.
  const batchIdx = requests.indexOf('/batches/B-24187');
  const recipeIdx = requests.indexOf('/batches/B-24187/recipe');
  expect(batchIdx).toBeGreaterThanOrEqual(0);
  expect(recipeIdx).toBeGreaterThan(batchIdx);
});

test('refuses a batch OrgaTEX has not released', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('row', { name: 'Select batch B-24188' }).click();
  await expect(
    page.getByText('Batch B-24188 not released by OrgaTEX (status QUEUED)'),
  ).toBeVisible();
});

test('shows OrgaTEX unavailable and recovers with Retry', async ({ page, request }) => {
  await request.put(`${API}/training/orgatex`, { data: { online: false } });
  await page.goto('/');
  await expect(page.getByText('OrgaTEX unavailable — Retry')).toBeVisible();

  await request.put(`${API}/training/orgatex`, { data: { online: true } });
  await page.getByRole('button', { name: 'Retry' }).click();
  await expect(page.getByRole('row', { name: 'Select batch B-24187' })).toBeVisible();
});

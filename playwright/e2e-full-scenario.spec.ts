import { expect, test } from '@playwright/test';

/**
 * Workbook Step 29 — the complete end-to-end scenario (story 010 AC1): select B-24187, weigh
 * and confirm all 5 components in order, complete the batch, verify OrgaTEX write-back CONFIRMED
 * and the stored consumption record, print the ticket. This is the one thing no other spec
 * checks end-to-end through the real UI — bolts 007/011's specs prove the individual mechanics;
 * this spec proves the whole chain, including the OrgaTEX side (already proven at the API layer
 * in bolts 003/009, now proven through the station itself).
 */

const API = 'http://localhost:3000/api';

test.beforeEach(async ({ request }) => {
  await request.post(`${API}/training/reset`);
});

test('the full B-24187 scenario runs green end to end, including the stored OrgaTEX consumption record', async ({
  page,
  request,
}) => {
  await page.goto('/');
  await page.getByRole('row', { name: 'Select batch B-24187' }).click();
  await expect(page.getByLabel('batch crumb')).toContainText('B-24187');
  await expect(page.getByLabel('batch crumb')).toContainText('SO-9931');
  await expect(page.getByLabel('batch crumb')).toContainText('JET-04');

  const expectedOrder = [
    'Remazol Brill. Blue RSPL',
    'Remazol Red RB',
    'Remazol Yellow RGB',
    'Sodium Sulphate',
    'Soda Ash',
  ];

  for (const name of expectedOrder) {
    await expect(page.locator('.wms-weigh-head').getByText(name)).toBeVisible();
    await page.getByRole('button', { name: '▶ Simulate dispense' }).click();
    await expect(page.getByRole('button', { name: 'OK · Confirm' })).toBeEnabled({
      timeout: 6_000,
    });
    await expect(page.getByText('WITHIN TOLERANCE — PRESS OK TO CONFIRM')).toBeVisible();
    await page.getByRole('button', { name: 'OK · Confirm' }).click();
  }

  // Screen 3: summary.
  await expect(page.getByText('Batch B-24187 weighed')).toBeVisible({ timeout: 8_000 });
  await expect(page.getByText('5 of 5')).toBeVisible();
  await expect(page.getByText('YES')).toBeVisible(); // all within tolerance
  await expect(page.getByText(/^35\.\d{3} kg$/)).toBeVisible();
  await expect(page.getByText(/CONFIRMED \d{2}:\d{2}:\d{2}/)).toBeVisible();

  // OrgaTEX write-back: the stored consumption record itself, independent of what Screen 3 says.
  const consumption = await request.get(`${API}/training/orgatex/consumption?batchId=B-24187`);
  expect(consumption.ok()).toBe(true);
  const records = (await consumption.json()) as Array<{ batchId: string; lines: unknown[] }>;
  expect(records).toHaveLength(1);
  expect(records[0]?.batchId).toBe('B-24187');
  expect(records[0]?.lines).toHaveLength(5);

  // Ticket: compose, print, preview matches.
  const printOrReprint = page.getByRole('button', { name: /Print ticket|Reprint/ });
  await expect(printOrReprint).toBeEnabled({ timeout: 5_000 });
  const ticket = page.locator('.ticket');
  await expect(ticket).toContainText('FCI DYEING — WEIGHING TICKET');
  await expect(ticket).toContainText('BATCH');
  await expect(ticket).toContainText('B-24187');
  await expect(ticket).toContainText('ALL WITHIN TOLERANCE');
  for (const name of expectedOrder) {
    await expect(ticket).toContainText(name);
  }
});

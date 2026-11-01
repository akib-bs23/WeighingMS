import { expect, test } from '@playwright/test';

/** Workbook Steps 23–27 — identity, override, Quit, Screen 3 and ticket printing. */

const API = 'http://localhost:3000/api';

test.beforeEach(async ({ request }) => {
  await request.post(`${API}/training/reset`);
});

async function dispenseAndConfirm(page: import('@playwright/test').Page) {
  await page.getByRole('button', { name: '▶ Simulate dispense' }).click();
  await expect(page.getByRole('button', { name: 'OK · Confirm' })).toBeEnabled({ timeout: 6_000 });
  await page.getByRole('button', { name: 'OK · Confirm' }).click();
}

test('identity mismatch blocks confirm and clears on the correct scan', async ({
  page,
  request,
}) => {
  await page.goto('/');
  await page.getByRole('row', { name: 'Select batch B-24187' }).click();
  await expect(page.getByLabel('batch crumb')).toContainText('B-24187');

  // Blue RSPL (DYE-1180) is active; scan Red RB's code (DYE-2204) — a mismatch. The scan feed's
  // first poll only sets its baseline (ignoring anything already queued), so wait for it to
  // settle before injecting, or the injected scan can race that baseline and be silently skipped.
  await page.waitForTimeout(1_000);
  await request.post(`${API}/training/scanner/scans`, { data: { code: 'DYE-2204' } });
  await expect(page.getByText(/Wrong dyestuff: scanned DYE-2204, expected DYE-1180/)).toBeVisible({
    timeout: 5_000,
  });
  await page.getByRole('button', { name: '▶ Simulate dispense' }).click();
  await expect(page.getByText('WITHIN TOLERANCE — PRESS OK TO CONFIRM')).toBeVisible();
  await expect(page.getByRole('button', { name: 'OK · Confirm' })).toBeDisabled();

  await page.screenshot({
    path: 'playwright/.results/step-24-identity-mismatch.png',
    fullPage: true,
  });

  // Scanning the correct code clears it.
  await request.post(`${API}/training/scanner/scans`, { data: { code: 'DYE-1180' } });
  await expect(page.getByText(/Wrong dyestuff/)).not.toBeVisible({ timeout: 5_000 });
  await expect(page.getByRole('button', { name: 'OK · Confirm' })).toBeEnabled();
});

test('supervisor override authorises an out-of-tolerance reading with the wrong-PIN path first', async ({
  page,
}) => {
  await page.goto('/');
  await page.getByRole('row', { name: 'Select batch B-24187' }).click();
  await expect(page.getByLabel('batch crumb')).toContainText('B-24187');

  await page.getByRole('button', { name: '▶ Simulate overshoot' }).click();
  await expect(page.getByText(/OVER TOLERANCE — SURPLUS/)).toBeVisible();
  await expect(page.getByRole('button', { name: 'OK · Confirm' })).toBeDisabled();
  // The pour is a timed ramp (zone text appears before it's stable) — override re-reads the
  // scale itself and refuses an unstable reading just like confirm does, so wait it out first.
  await page.waitForTimeout(3_200);

  await page.getByRole('button', { name: 'Supervisor override' }).click();
  const dialog = page.getByRole('dialog', { name: 'Supervisor override' });
  await expect(dialog).toBeVisible();
  await page.screenshot({ path: 'playwright/.results/step-25-override-dialog.png' });

  await dialog.getByLabel('Supervisor PIN').fill('0000');
  await dialog.getByLabel('Reason').fill('Known surplus, approved');
  await dialog.getByRole('button', { name: 'Authorise' }).click();
  await expect(dialog.getByRole('alert')).toHaveText('Supervisor authentication failed');

  await dialog.getByLabel('Supervisor PIN').fill('4825');
  await dialog.getByRole('button', { name: 'Authorise' }).click();
  await expect(dialog).not.toBeVisible();

  // Progresses to the next component, same as a normal confirm.
  await expect(page.locator('.wms-weigh-head').getByText('Remazol Red RB')).toBeVisible();
});

test('Quit returns the component to pending with a recovery prompt, re-selectable from scratch', async ({
  page,
}) => {
  await page.goto('/');
  await page.getByRole('row', { name: 'Select batch B-24187' }).click();
  await expect(page.getByLabel('batch crumb')).toContainText('B-24187');

  await page.getByRole('button', { name: '▶ Simulate dispense' }).click();
  // Let the pour settle before quitting — taring mid-ramp re-bases the still-running pour onto
  // the new zero rather than stopping it (same Dummy-scale physics covered in weighing.spec.ts),
  // so quitting mid-ramp wouldn't deterministically land on exactly 0.
  await expect(page.getByRole('button', { name: 'OK · Confirm' })).toBeEnabled({ timeout: 6_000 });
  await page.getByRole('button', { name: 'Quit' }).click();

  await expect(page.getByText('Select a pending component to continue.')).toBeVisible();
  await page.screenshot({ path: 'playwright/.results/step-30-quit.png', fullPage: true });

  await page.getByRole('button', { name: /Remazol Brill\. Blue RSPL/ }).click();
  await expect(page.locator('.cell.live .v')).toContainText('0.0');
});

test('completes the full five-component batch through Screen 3, prints and reprints the ticket, then returns to the queue', async ({
  page,
}) => {
  await page.goto('/');
  await page.getByRole('row', { name: 'Select batch B-24187' }).click();
  await expect(page.getByLabel('batch crumb')).toContainText('B-24187');

  for (let i = 0; i < 5; i++) {
    await dispenseAndConfirm(page);
  }

  await expect(page.getByText('Batch B-24187 weighed')).toBeVisible({ timeout: 8_000 });
  await expect(page.getByText('5 of 5')).toBeVisible();
  await expect(page.getByText('YES')).toBeVisible();
  await expect(page.getByText(/CONFIRMED \d{2}:\d{2}:\d{2}/)).toBeVisible();

  await page.screenshot({ path: 'playwright/.results/step-26-screen3.png', fullPage: true });

  // The ticket composes and auto-prints on mount — fast enough that by the time we check, the
  // button may already read "Reprint" rather than "Print ticket" (both are the same key).
  const printOrReprint = page.getByRole('button', { name: /Print ticket|Reprint/ });
  await expect(printOrReprint).toBeEnabled({ timeout: 5_000 });
  const ticket = page.locator('.ticket');
  await expect(ticket).toContainText('FCI DYEING — WEIGHING TICKET');
  await expect(ticket.getByText('B-24187', { exact: true })).toBeVisible();

  await page.screenshot({ path: 'playwright/.results/step-27-ticket.png', fullPage: true });

  // A second print is a reprint.
  await expect(page.getByRole('button', { name: 'Reprint' })).toBeVisible();
  await page.getByRole('button', { name: 'Reprint' }).click();
  await expect(page.getByRole('button', { name: 'Reprint' })).toBeEnabled();

  await page.getByRole('button', { name: 'Next batch' }).click();
  await expect(page.getByRole('row', { name: 'Select batch B-24187' })).toBeVisible();
});

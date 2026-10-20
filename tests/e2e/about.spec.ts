import { expect, test } from '@playwright/test';
import { credentials, education, experience } from '../../src/data/profile';

// Data-driven: the page must render whatever is in the profile data.
test.beforeEach(async ({ page }) => {
  await page.goto('/');
});

test('shows every experience entry', async ({ page }) => {
  for (const job of experience) {
    await expect(page.getByRole('heading', { level: 4, name: job.role })).toBeVisible();
    await expect(page.getByText(job.company, { exact: true }).first()).toBeVisible();
  }
});

test('shows education and credentials', async ({ page }) => {
  for (const e of education) {
    await expect(page.getByRole('heading', { level: 4, name: e.degree })).toBeVisible();
  }
  for (const c of credentials) {
    await expect(page.getByRole('heading', { level: 4, name: c.name })).toBeVisible();
  }
});

test('an open-ended role is labelled "Present"', async ({ page }) => {
  const current = experience.filter((job) => job.end === null);
  test.skip(current.length === 0, 'no current role in the data');
  await expect(page.getByText(/– Present/).first()).toBeVisible();
});

test('headings never skip a level', async ({ page }) => {
  const levels = await page
    .getByRole('heading')
    .evaluateAll((hs) => hs.map((h) => Number(h.tagName.slice(1))));
  expect(levels[0]).toBe(1);
  for (let i = 1; i < levels.length; i++) {
    // A heading may go one level deeper at most, or back up any amount.
    expect(
      levels[i],
      `heading #${i} jumps from h${levels[i - 1]} to h${levels[i]}`,
    ).toBeLessThanOrEqual(levels[i - 1] + 1);
  }
});

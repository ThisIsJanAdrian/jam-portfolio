import { expect, test } from '@playwright/test';
import { credentials, experience, skills } from '../../src/data/profile';

// Data-driven: the page must render whatever is in the profile data.
test.beforeEach(async ({ page }) => {
  await page.goto('/');
});

test('shows every experience entry', async ({ page }) => {
  for (const job of experience) {
    await expect(page.getByRole('heading', { level: 3, name: job.role })).toBeVisible();
    await expect(page.getByText(job.company, { exact: true }).first()).toBeVisible();
  }
});

test('shows every skill and certification', async ({ page }) => {
  const section = page.locator('#skills');
  for (const skill of skills) {
    await expect(
      section.getByRole('listitem').getByText(skill.name, { exact: false }).first(),
    ).toBeAttached();
  }
  for (const c of credentials) {
    await expect(section.getByRole('heading', { level: 4, name: c.name })).toBeAttached();
    await expect(section.getByText(c.issuer, { exact: true }).first()).toBeAttached();
  }
});

test('a certification links out only when it has a verify URL', async ({ page }) => {
  const cards = page.locator('#skills h4');
  for (const c of credentials) {
    const card = cards.filter({ hasText: c.name }).locator('xpath=..');
    const verify = card.getByRole('link', { name: /Verify/ });
    if (c.url) {
      await expect(verify).toHaveAttribute('href', c.url);
      await expect(verify).toHaveAttribute('target', '_blank');
    } else {
      await expect(verify).toHaveCount(0);
    }
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

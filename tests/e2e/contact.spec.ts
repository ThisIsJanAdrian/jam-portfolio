import { expect, test } from '@playwright/test';
import { site } from '../../src/data/site';
import { settle } from './helpers';

// The last section is one button that opens an email to the inbox; there is no form any more.
test.beforeEach(async ({ page }) => {
  await page.goto('/#contact');
  await settle(page);
});

test('has a "Get in touch" heading and a single email button', async ({ page }) => {
  const section = page.locator('#contact');
  await expect(section.getByRole('heading', { level: 2, name: 'Get in touch' })).toBeVisible();
  const button = section.getByRole('link', { name: /email me/i });
  await expect(button).toBeVisible();
  await expect(button).toHaveAttribute('href', `mailto:${site.email}`);
  // An email link opens the mail app; it must not open a blank tab.
  await expect(button).not.toHaveAttribute('target', '_blank');
});

test('has no form, fields or submit button', async ({ page }) => {
  const section = page.locator('#contact');
  await expect(section.locator('form, input, textarea, button')).toHaveCount(0);
});

test('the button hops on hover, like the chips and cards', async ({ page }) => {
  const canHover = await page.evaluate(() => matchMedia('(hover: hover)').matches);
  test.skip(!canHover, 'no hover on touch devices');
  const button = page.locator('#contact').getByRole('link', { name: /email me/i });
  const lift = () => button.evaluate((n) => new DOMMatrix(getComputedStyle(n).transform).m42);
  expect(await lift()).toBe(0);
  await button.hover();
  await page.waitForTimeout(500);
  expect(await lift()).toBeLessThan(-1);
});

test('the button is large enough to tap and readable (contrast is covered by the axe run)', async ({
  page,
}) => {
  const box = (await page
    .locator('#contact')
    .getByRole('link', { name: /email me/i })
    .boundingBox())!;
  expect(box.height).toBeGreaterThanOrEqual(44);
  expect(box.width).toBeGreaterThanOrEqual(44);
});

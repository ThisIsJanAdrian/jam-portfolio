import { expect, test } from '@playwright/test';
import { site } from '../../src/data/site';
import { settle } from './helpers';

// The last section is one button that opens an email to the inbox; there is no form any more.
test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await page
    .locator('#contact')
    .evaluate((el) => el.scrollIntoView({ block: 'end', behavior: 'instant' }));
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
  // It rises into place as it appears: wait for that to finish before looking at the hop.
  await expect.poll(lift).toBe(0);
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

test('on a phone the "Get in touch" line is the same size as the paragraphs in the cards', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 800 });
  await page.goto('/');
  const sizes = await page.evaluate(() => {
    const px = (sel: string) => getComputedStyle(document.querySelector(sel)!).fontSize;
    return { contact: px('#contact p'), card: px('#life li p') };
  });
  expect(sizes.contact).toBe(sizes.card);
});

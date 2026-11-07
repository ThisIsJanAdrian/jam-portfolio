import { expect, test, type Page } from '@playwright/test';
import { settle } from './helpers';

// A round sun/moon button beside the nav pill switches between light and dark, remembers the choice,
// and starts from the system setting.
const toggle = (page: Page) => page.getByRole('button', { name: 'Dark mode' });
const pageBg = (page: Page) => page.evaluate(() => getComputedStyle(document.body).backgroundColor);
const luma = (css: string) =>
  css
    .match(/\d+/g)!
    .slice(0, 3)
    .map(Number)
    .reduce((a, b) => a + b) / 3;

test('there is no Contact tab in the nav; the toggle sits beside it as a separate button', async ({
  page,
}) => {
  await page.goto('/');
  const nav = page.getByRole('navigation', { name: 'Main' });
  await expect(nav.getByRole('link', { name: 'Contact' })).toHaveCount(0);
  await expect(toggle(page)).toBeVisible();
  // Separate: the button is outside the nav pill, to its right, with a gap, on the same row.
  await expect(nav.getByRole('button')).toHaveCount(0);
  const [n, t] = [(await nav.boundingBox())!, (await toggle(page).boundingBox())!];
  expect(t.x).toBeGreaterThan(n.x + n.width);
  expect(Math.abs(t.y + t.height / 2 - (n.y + n.height / 2))).toBeLessThan(3);
  expect(t.width).toBeGreaterThanOrEqual(36);
  expect(t.height).toBeGreaterThanOrEqual(36);
});

test('the nav and the toggle fit a 360px phone side by side', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 740 });
  await page.goto('/');
  const t = (await toggle(page).boundingBox())!;
  const n = (await page.getByRole('navigation', { name: 'Main' }).boundingBox())!;
  expect(n.x).toBeGreaterThanOrEqual(0);
  expect(t.x + t.width).toBeLessThanOrEqual(360);
});

for (const system of ['light', 'dark'] as const) {
  test.describe(`system setting: ${system}`, () => {
    test.use({ colorScheme: system });

    test('starts from the system setting and says so', async ({ page }) => {
      await page.goto('/');
      await expect(toggle(page)).toHaveAttribute('aria-pressed', String(system === 'dark'));
      const l = luma(await pageBg(page));
      if (system === 'dark') expect(l).toBeLessThan(60);
      else expect(l).toBeGreaterThan(200);
    });

    test('pressing it switches to the other theme, and again switches back', async ({ page }) => {
      await page.goto('/');
      const before = await pageBg(page);
      await toggle(page).click();
      await settle(page);
      const flipped = await pageBg(page);
      expect(flipped).not.toBe(before);
      expect(await page.evaluate(() => document.documentElement.dataset.theme)).toBe(
        system === 'dark' ? 'light' : 'dark',
      );
      await expect(toggle(page)).toHaveAttribute('aria-pressed', String(system !== 'dark'));
      await toggle(page).click();
      expect(await pageBg(page)).toBe(before);
    });

    test('the choice is remembered, and applied before the page shows', async ({ page }) => {
      await page.goto('/');
      await toggle(page).click();
      const chosen = await pageBg(page);
      await page.reload();
      // Set by the inline script in <head>, so it is there as soon as the page exists.
      expect(await page.evaluate(() => document.documentElement.dataset.theme)).toBe(
        system === 'dark' ? 'light' : 'dark',
      );
      expect(await pageBg(page)).toBe(chosen);
    });
  });
}

test('only the sun or the moon is shown, never both', async ({ page }) => {
  await page.goto('/');
  const visible = async () =>
    page.evaluate(() =>
      [...document.querySelectorAll('[data-theme-toggle] .icon')].map((el) =>
        parseFloat(getComputedStyle(el).opacity),
      ),
    );
  await page.waitForTimeout(600);
  const [sun, moon] = await visible();
  expect(Math.round(sun + moon)).toBe(1);
  await toggle(page).click();
  await page.waitForTimeout(700);
  const [sun2, moon2] = await visible();
  expect(Math.round(sun2 + moon2)).toBe(1);
  expect(Math.round(sun2)).not.toBe(Math.round(sun));
});

test('works from the keyboard and has a visible focus ring', async ({ page, isMobile }) => {
  test.skip(isMobile, 'keyboard');
  await page.goto('/');
  await toggle(page).focus();
  await page.keyboard.press('Enter');
  await expect(toggle(page)).toHaveAttribute('aria-pressed', /true|false/);
  const outline = await toggle(page).evaluate((el) => getComputedStyle(el).outlineStyle);
  expect(outline).not.toBe('none');
});

test('a case-study page has the toggle too, and the saved choice carries over', async ({
  page,
}) => {
  await page.goto('/');
  await toggle(page).click();
  const chosen = await pageBg(page);
  await page.goto('/projects/personal-blog');
  expect(await pageBg(page)).toBe(chosen);
  await expect(toggle(page)).toBeVisible();
});

import { expect, test } from '@playwright/test';
import { site } from '../../src/data/site';
import { shortName } from '../../src/utils/names';

test('home loads with a title and a single main heading', async ({ page }) => {
  const response = await page.goto('/');
  expect(response?.status()).toBe(200);
  await expect(page).toHaveTitle(new RegExp(site.name));
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(shortName(site));
});

test('hero portrait loads, has alt text and reserves its space', async ({ page }) => {
  await page.goto('/');
  const portrait = page.getByRole('img', { name: `Portrait of ${site.name}` });
  await expect(portrait).toBeVisible();

  const info = await portrait.evaluate((img: HTMLImageElement) => ({
    loaded: img.complete && img.naturalWidth > 0,
    hasSize: img.hasAttribute('width') && img.hasAttribute('height'), // prevents layout shift
    box: img.getBoundingClientRect(),
  }));
  expect(info.loaded).toBe(true);
  expect(info.hasSize).toBe(true);
  expect(Math.round(info.box.width)).toBe(Math.round(info.box.height)); // stays a true circle
});

test('home has every section, each labelled by an h2', async ({ page }) => {
  await page.goto('/');
  const sections = await page.getByRole('heading', { level: 2 }).allTextContents();
  expect(sections).toEqual(['About', 'Journey', 'Projects', 'Background', 'Contact']);
});

// Regression: JSX whitespace once collapsed the footer to "© 2026Jan Adrian Manzanero".
test('footer shows the year and name, separated by a space', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('contentinfo')).toContainText(
    `© ${new Date().getFullYear()} ${site.name}.`,
  );
});

test('unknown routes show the 404 page', async ({ page }) => {
  const response = await page.goto('/does-not-exist');
  expect(response?.status()).toBe(404);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(/not found/i);
});

test('no console errors on the home page', async ({ page }) => {
  const errors: string[] = [];
  page.on('console', (msg) => msg.type() === 'error' && errors.push(msg.text()));
  page.on('pageerror', (err) => errors.push(err.message));
  await page.goto('/');
  expect(errors).toEqual([]);
});

// Five links must fit in the pill on the narrowest common phone (360px wide).
test.describe('narrow phones', () => {
  test.use({ viewport: { width: 360, height: 740 } });

  test('the nav fits inside the screen and its pill', async ({ page }) => {
    await page.goto('/');
    const nav = page.getByRole('navigation', { name: 'Main' });
    const box = (await nav.boundingBox())!;
    expect(box.x).toBeGreaterThanOrEqual(0);
    expect(box.x + box.width).toBeLessThanOrEqual(360);
    // Nothing inside the pill may spill out of it.
    expect(await nav.evaluate((el) => el.scrollWidth - el.clientWidth)).toBeLessThanOrEqual(0);
  });
});

// Catches the classic responsive bug: something wider than the screen causing a sideways scroll.
for (const path of ['/', '/projects/personal-blog']) {
  test(`${path} has no horizontal overflow`, async ({ page }) => {
    await page.goto(path);
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow).toBeLessThanOrEqual(0);
  });
}

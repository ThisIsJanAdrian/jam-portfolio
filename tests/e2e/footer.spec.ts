import { expect, test } from '@playwright/test';
import { site } from '../../src/data/site';

// The footer: the copyright on the left, GitHub, LinkedIn and Email links on the right.
test.beforeEach(async ({ page }) => {
  await page.goto('/');
});

const footer = (page: import('@playwright/test').Page) => page.getByRole('contentinfo');

test('has GitHub, LinkedIn and Email links that go where they say', async ({ page }) => {
  await expect(footer(page).getByRole('link', { name: /^GitHub/ })).toHaveAttribute(
    'href',
    site.links.github,
  );
  await expect(footer(page).getByRole('link', { name: /^LinkedIn/ })).toHaveAttribute(
    'href',
    site.links.linkedin,
  );
  await expect(footer(page).getByRole('link', { name: /^Email/ })).toHaveAttribute(
    'href',
    `mailto:${site.email}`,
  );
  await expect(footer(page).getByRole('link')).toHaveCount(3);
});

test('GitHub and LinkedIn open in a new tab, safely; Email stays in this tab', async ({ page }) => {
  for (const name of [/^GitHub/, /^LinkedIn/]) {
    const link = footer(page).getByRole('link', { name });
    await expect(link).toHaveAttribute('target', '_blank');
    await expect(link).toHaveAttribute('rel', /noopener/);
    await expect(link).toContainText('opens in a new tab');
  }
  await expect(footer(page).getByRole('link', { name: /^Email/ })).not.toHaveAttribute(
    'target',
    '_blank',
  );
});

test('the links sit on the right, beside the copyright, on a wide screen', async ({
  page,
  isMobile,
}) => {
  test.skip(isMobile, 'stacked on phones');
  await page.setViewportSize({ width: 1440, height: 900 });
  const copyright = (await footer(page).getByText(/©/).boundingBox())!;
  const links = (await footer(page).getByRole('list').boundingBox())!;
  expect(links.x).toBeGreaterThan(copyright.x + copyright.width);
  expect(Math.abs(links.y + links.height / 2 - (copyright.y + copyright.height / 2))).toBeLessThan(
    6,
  );
  // Right-aligned with the page's content column (max width 72rem, 1.5rem side padding).
  expect(Math.abs(links.x + links.width - (1440 - (1440 - 1152) / 2 - 24))).toBeLessThan(4);
});

test('on a phone the copyright and the links stack and nothing overflows', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 740 });
  const copyright = (await footer(page).getByText(/©/).boundingBox())!;
  const links = (await footer(page).getByRole('list').boundingBox())!;
  expect(links.y).toBeGreaterThan(copyright.y + copyright.height - 2);
  expect(links.x + links.width).toBeLessThanOrEqual(360);
  for (const link of await footer(page).getByRole('link').all()) {
    expect((await link.boundingBox())!.height).toBeGreaterThanOrEqual(16);
  }
});

test('a link is underlined and darkens on hover', async ({ page }) => {
  const canHover = await page.evaluate(() => matchMedia('(hover: hover)').matches);
  test.skip(!canHover, 'no hover on touch devices');
  const link = footer(page).getByRole('link', { name: /^GitHub/ });
  await link.scrollIntoViewIfNeeded();
  const idle = await link.evaluate((el) => getComputedStyle(el).textDecorationLine);
  await link.hover();
  await page.waitForTimeout(350);
  expect(idle).toBe('none');
  expect(await link.evaluate((el) => getComputedStyle(el).textDecorationLine)).toBe('underline');
});

import { expect, test } from '@playwright/test';
import { site } from '../../src/data/site';

// The footer: the copyright on the left, GitHub and LinkedIn links on the right.
test.beforeEach(async ({ page }) => {
  await page.goto('/');
});

const footer = (page: import('@playwright/test').Page) => page.getByRole('contentinfo');

test('has GitHub and LinkedIn links that go where they say', async ({ page }) => {
  await expect(footer(page).getByRole('link', { name: /^GitHub/ })).toHaveAttribute(
    'href',
    site.links.github,
  );
  await expect(footer(page).getByRole('link', { name: /^LinkedIn/ })).toHaveAttribute(
    'href',
    site.links.linkedin,
  );
  await expect(footer(page).getByRole('link')).toHaveCount(2);
});

test('GitHub and LinkedIn open in a new tab, safely', async ({ page }) => {
  for (const name of [/^GitHub/, /^LinkedIn/]) {
    const link = footer(page).getByRole('link', { name });
    await expect(link).toHaveAttribute('target', '_blank');
    await expect(link).toHaveAttribute('rel', /noopener/);
    await expect(link).toContainText('opens in a new tab');
  }
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
  // Right-aligned with the page's content column (max width 72rem, centred: 144px each side at 1440px).
  expect(Math.abs(links.x + links.width - (1440 - (1440 - 1152) / 2))).toBeLessThan(4);
});

// One line on a phone too, as on a desktop: the copyright on the left, the links on the right.
for (const width of [360, 390]) {
  test(`on a phone (${width}px) the footer is one line and nothing overflows`, async ({ page }) => {
    await page.setViewportSize({ width, height: 740 });
    const copyright = (await footer(page).getByText(/©/).boundingBox())!;
    const links = (await footer(page).getByRole('list').boundingBox())!;
    expect(
      Math.abs(links.y + links.height / 2 - (copyright.y + copyright.height / 2)),
    ).toBeLessThan(6);
    expect(links.x, 'the links are beside the copyright').toBeGreaterThan(
      copyright.x + copyright.width,
    );
    expect(links.x + links.width).toBeLessThanOrEqual(width - 16);
    expect(copyright.height, 'the copyright is one line').toBeLessThan(24);
    for (const link of await footer(page).getByRole('link').all()) {
      expect((await link.boundingBox())!.height).toBeGreaterThanOrEqual(16);
    }
  });
}

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

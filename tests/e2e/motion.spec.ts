import { expect, test } from '@playwright/test';

const scrollBehavior = (page: import('@playwright/test').Page) =>
  page.evaluate(() => getComputedStyle(document.documentElement).scrollBehavior);

test.describe('default motion', () => {
  test('uses smooth scrolling', async ({ page }) => {
    await page.goto('/');
    expect(await scrollBehavior(page)).toBe('smooth');
  });
});

// WCAG 2.3.3: honour the operating-system "reduce motion" setting.
test.describe('reduced motion', () => {
  test.use({ reducedMotion: 'reduce' });

  test('disables smooth scrolling', async ({ page }) => {
    await page.goto('/');
    expect(await scrollBehavior(page)).toBe('auto');
  });

  test('nav links still jump to their sections', async ({ page }) => {
    await page.goto('/');
    await page
      .getByRole('navigation', { name: 'Main' })
      .getByRole('link', { name: 'Projects', exact: true })
      .click();
    await expect(page.locator('#projects')).toBeInViewport();
  });
});

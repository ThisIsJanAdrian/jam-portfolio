import { expect, test, type Page } from '@playwright/test';
import { revealAll } from './helpers';

const opacityOf = (page: Page, selector: string) =>
  page
    .locator(selector)
    .first()
    .evaluate((el) => getComputedStyle(el).opacity);

test.describe('scroll reveal (default motion)', () => {
  test('hero reveals by itself on load', async ({ page }) => {
    await page.goto('/');
    await expect.poll(() => opacityOf(page, 'h1')).toBe('1');
  });

  test('content below the fold starts hidden and appears when scrolled into view', async ({
    page,
  }) => {
    await page.goto('/');
    expect(await opacityOf(page, '#contact [data-reveal]')).toBe('0');

    await page.evaluate(() =>
      document.querySelector('#contact')!.scrollIntoView({ behavior: 'instant' }),
    );
    await expect.poll(() => opacityOf(page, '#contact [data-reveal]')).toBe('1');
  });

  test('nothing stays hidden after scrolling through the whole page', async ({ page }) => {
    await page.goto('/');
    await revealAll(page);
    await expect(page.locator('[data-reveal]:not(.is-revealed)')).toHaveCount(0);
  });

  test('a revealed element stays visible when scrolling back up', async ({ page }) => {
    await page.goto('/');
    await revealAll(page);
    await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
    await expect.poll(() => opacityOf(page, '#contact [data-reveal]')).toBe('1');
  });

  test('switching to reduced motion mid-session shows everything immediately', async ({ page }) => {
    await page.goto('/');
    expect(await opacityOf(page, '#contact [data-reveal]')).toBe('0');
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await expect.poll(() => opacityOf(page, '#contact [data-reveal]')).toBe('1');
  });
});

test.describe('scroll reveal (reduced motion)', () => {
  test.use({ reducedMotion: 'reduce' });

  test('no content is hidden or displaced, even before scrolling', async ({ page }) => {
    await page.goto('/');
    const stillHidden = await page.locator('[data-reveal]').evaluateAll(
      (els) =>
        els.filter((el) => {
          const style = getComputedStyle(el);
          return style.opacity !== '1' || style.transform !== 'none';
        }).length,
    );
    expect(stillHidden).toBe(0);
  });

  test('the hiding class is never applied', async ({ page }) => {
    await page.goto('/');
    expect(await page.evaluate(() => document.documentElement.classList.contains('js'))).toBe(
      false,
    );
  });
});

// Progressive enhancement: if scripts fail or are blocked, content must not stay invisible.
test.describe('scroll reveal (JavaScript disabled)', () => {
  test.use({ javaScriptEnabled: false });

  test('all content is visible', async ({ page }) => {
    await page.goto('/');
    const stillHidden = await page
      .locator('[data-reveal]')
      .evaluateAll((els) => els.filter((el) => getComputedStyle(el).opacity !== '1').length);
    expect(stillHidden).toBe(0);
  });
});

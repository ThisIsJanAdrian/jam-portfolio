import { expect, test, type Page } from '@playwright/test';
import { revealAll, settle } from './helpers';

// Life: four placeholder cards (to be filled in later), side by side on a desktop, two by two on a
// phone.
const cards = (page: Page) => page.locator('#life ul > li');

async function columns(page: Page) {
  await page.goto('/');
  await revealAll(page);
  await settle(page);
  return page.evaluate(() => {
    const lefts = [...document.querySelectorAll('#life ul > li')].map((li) =>
      Math.round(li.getBoundingClientRect().left),
    );
    return new Set(lefts).size;
  });
}

test('Life is a section with a heading and four cards', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 2, name: 'Life' })).toBeVisible();
  await expect(cards(page)).toHaveCount(4);
});

test.describe('desktop', () => {
  test.use({ viewport: { width: 1440, height: 900 } });

  test('the four cards sit side by side', async ({ page }) => {
    expect(await columns(page)).toBe(4);
  });
});

test.describe('phone', () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test('the cards are laid out two by two', async ({ page }) => {
    expect(await columns(page)).toBe(2);
  });
});

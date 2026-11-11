import { expect, test, type Page } from '@playwright/test';
import { revealAll, settle } from './helpers';

// Life: four placeholder cards (to be filled in later), side by side on a desktop, stacked on a phone.
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

  test('on a phone a card title is as big as a certification title, and the icon has side room', async ({
    page,
  }) => {
    await page.goto('/');
    const m = await page.evaluate(() => {
      const size = (sel: string) => getComputedStyle(document.querySelector(sel)!).fontSize;
      const li = document.querySelector('#life ul > li')!;
      const svg = li.querySelector('svg')!;
      return {
        life: size('#life h3'),
        cert: size('#skills h4'),
        iconFromEdge: svg.getBoundingClientRect().left - li.getBoundingClientRect().left,
      };
    });
    expect(m.life).toBe(m.cert);
    expect(m.iconFromEdge, 'space left of the icon').toBeGreaterThanOrEqual(24);
  });

  test('the cards stack, each with the icon on the left and the text beside it', async ({
    page,
  }) => {
    expect(await columns(page), 'one column').toBe(1);
    const m = await cards(page)
      .first()
      .evaluate((li) => {
        const box = (sel: string) => li.querySelector(sel)!.getBoundingClientRect();
        const align = (sel: string) => getComputedStyle(li.querySelector(sel)!).textAlign;
        const card = li.getBoundingClientRect();
        return {
          icon: box('svg'),
          title: box('h3'),
          text: box('p'),
          card,
          titleAlign: align('h3'),
          textAlign: align('p'),
        };
      });
    expect(m.icon.width, 'the icon is small on a phone').toBeLessThanOrEqual(36);
    expect(m.icon.right, 'the icon is left of the title').toBeLessThanOrEqual(m.title.left);
    expect(m.icon.right, 'and of the text').toBeLessThanOrEqual(m.text.left);
    expect(Math.abs(m.title.left - m.text.left), 'title and text share a left edge').toBeLessThan(
      2,
    );
    expect(['left', 'start']).toContain(m.titleAlign);
    expect(['left', 'start']).toContain(m.textAlign);
    // The icon sits in the vertical middle of the card.
    const iconMid = m.icon.top + m.icon.height / 2;
    expect(Math.abs(iconMid - (m.card.top + m.card.height / 2))).toBeLessThan(8);
  });
});

test('each card has a title, an icon between it and the text, and the Spotify link works', async ({
  page,
}) => {
  await page.goto('/');
  const order = await cards(page).evaluateAll((lis) =>
    lis.map((li) => [...li.children].map((c) => c.tagName.toLowerCase())),
  );
  for (const tags of order) expect(tags).toEqual(['h3', 'svg', 'p']);

  const link = page.locator('#life').getByRole('link', { name: /Spotify page/ });
  await expect(link).toHaveAttribute(
    'href',
    'https://open.spotify.com/artist/2HKiqhTRhhEwSMWdz9QL79',
  );
  await expect(link).toHaveAttribute('target', '_blank');
  await expect(link).toHaveAttribute('rel', /noopener/);
  // It sits inside the Music text, which reads on both sides of it.
  const text = await link.locator('xpath=ancestor::p').innerText();
  expect(text).toContain('feel free to check out my Spotify page');
});

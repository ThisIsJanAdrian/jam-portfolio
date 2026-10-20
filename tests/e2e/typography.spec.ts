import { expect, test, type Page } from '@playwright/test';

// Astro appends a hash to each family name (e.g. "Cabinet Grotesk-19bbe0..."), so match the prefix.
const style = (page: Page, selector: string) =>
  page
    .locator(selector)
    .first()
    .evaluate((el) => {
      const s = getComputedStyle(el);
      return { family: s.fontFamily, weight: s.fontWeight };
    });

test.describe('typography', () => {
  test('headings use Cabinet Grotesk 800, body text uses Sora, labels use JetBrains Mono', async ({
    page,
  }) => {
    await page.goto('/');

    const h1 = await style(page, 'h1');
    expect(h1.family).toMatch(/^"?Cabinet Grotesk/);
    expect(h1.weight).toBe('800');

    const h2 = await style(page, 'h2');
    expect(h2.family).toMatch(/^"?Cabinet Grotesk/);
    expect(h2.weight).toBe('800');

    const body = await style(page, 'body');
    expect(body.family).toMatch(/^"?Sora/);
    expect(body.weight).toBe('400');

    const tag = await style(page, '.tech-tag');
    expect(tag.family).toMatch(/^"?JetBrains Mono/);
  });

  test('the web fonts actually load (not just the fallbacks)', async ({ page }) => {
    await page.goto('/');
    // Make sure the mono font, used further down the page, has a chance to load too.
    await page.evaluate(() => document.fonts.ready);

    const loaded = await page.evaluate(() =>
      [...document.fonts]
        .filter((f) => f.status === 'loaded')
        .map((f) => `${f.family.replace(/^"|"$/g, '').split('-')[0]} ${f.weight}`),
    );
    expect(loaded).toContain('Cabinet Grotesk 800');
    expect(loaded).toContain('Sora 400');
  });

  test('the heading uses the fluid type scale', async ({ page }) => {
    await page.goto('/');
    const sizeAt = async (width: number) => {
      await page.setViewportSize({ width, height: 800 });
      return page.locator('h1').evaluate((el) => parseFloat(getComputedStyle(el).fontSize));
    };
    // clamp(2.5rem, 5vw, 4.25rem): 40px at the low end, 68px at the high end.
    expect(await sizeAt(360)).toBe(40);
    expect(await sizeAt(1920)).toBe(68);
  });
});

// Fonts are self-hosted: visiting the site must not contact Google, Fontshare or anyone else.
test('every request goes to the site itself (no third-party hosts)', async ({ page, baseURL }) => {
  const hosts = new Set<string>();
  page.on('request', (request) => {
    const url = new URL(request.url());
    if (url.protocol.startsWith('http')) hosts.add(url.host);
  });

  await page.goto('/');
  await page.evaluate(() => document.fonts.ready);
  await page.waitForLoadState('networkidle');

  expect([...hosts]).toEqual([new URL(baseURL!).host]);
});

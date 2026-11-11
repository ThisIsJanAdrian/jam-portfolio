import { expect, test, type Page } from '@playwright/test';
import { revealAll, settle } from './helpers';

// The site is black and white: the accent is the text colour (near-black, white in dark mode). The
// only colour left is the skills filter (green QA, red SWE, blue AI), which needs it.
const rgb = (css: string) =>
  css
    .match(/\d+(\.\d+)?/g)!
    .slice(0, 3)
    .map(Number);
// Black, white and the grays between them. A "cool" gray leans a little blue, so the grays that are
// mid-tones (the pill and the dots) are allowed a wider spread than the near-black and white ones.
const isGray = (css: string, spread = 8) => {
  const [r, g, b] = rgb(css);
  return Math.max(r, g, b) - Math.min(r, g, b) <= spread;
};

async function colours(page: Page) {
  await page.goto('/');
  await revealAll(page);
  await settle(page);
  return page.evaluate(() => {
    const paint = (sel: string, prop: 'backgroundColor' | 'borderTopColor' | 'color') =>
      getComputedStyle(document.querySelector(sel)!)[prop];
    // Light up a nav link so there is a pill to look at.
    return {
      accent: getComputedStyle(document.documentElement).getPropertyValue('--color-accent').trim(),
      pill: paint('[data-nav-indicator]', 'backgroundColor'),
      button: paint('.mail-button', 'backgroundColor'),
      dot: paint('.journey-dot', 'borderTopColor'),
      dotCentre: getComputedStyle(document.querySelector('.journey-dot')!, '::after')
        .backgroundColor,
      pageBg: getComputedStyle(document.body).backgroundColor,
      text: getComputedStyle(document.body).color,
      activeText: paint('nav a[aria-current]', 'color'),
      qa: paint('.dot[data-discipline="qa"]', 'backgroundColor'),
      swe: paint('.dot[data-discipline="swe"]', 'backgroundColor'),
      ai: paint('.dot[data-discipline="ai"]', 'backgroundColor'),
    };
  });
}

for (const scheme of ['light', 'dark'] as const) {
  test.describe(`${scheme} mode`, () => {
    test.use({ colorScheme: scheme });

    test('the nav pill, the email button and the journey dots are black and white', async ({
      page,
    }) => {
      const c = await colours(page);
      expect(isGray(c.pill, 20), `nav pill ${c.pill}`).toBe(true);
      expect(isGray(c.button), `email button ${c.button}`).toBe(true);
      expect(isGray(c.dot, 20), `journey dot ${c.dot}`).toBe(true);
    });

    test('the journey dots are a mid gray, not black or white', async ({ page }) => {
      const c = await colours(page);
      for (const dot of [c.dot, c.dotCentre]) {
        const luma = rgb(dot).reduce((a, b) => a + b) / 3;
        expect(luma, `dot ${dot}`).toBeGreaterThan(100);
        expect(luma, `dot ${dot}`).toBeLessThan(190);
      }
    });

    test('the nav highlight is a light gray with the normal text colour on it', async ({
      page,
    }) => {
      const c = await colours(page);
      expect(c.pill, 'the pill differs from the page').not.toBe(c.pageBg);
      expect(isGray(c.pill, 20)).toBe(true);
      expect(c.activeText, 'the active label keeps the normal text colour').toBe(c.text);
      const pillLuma = rgb(c.pill).reduce((a, b) => a + b) / 3;
      if (scheme === 'light') expect(pillLuma, 'a light gray').toBeGreaterThan(200);
    });

    test('the accent is dark on a light page and light on a dark page', async ({ page }) => {
      const c = await colours(page);
      const hex = c.accent.replace('#', '');
      const luma =
        [0, 2, 4].map((i) => parseInt(hex.slice(i, i + 2), 16)).reduce((a, b) => a + b) / 3;
      if (scheme === 'light') expect(luma).toBeLessThan(60);
      else expect(luma).toBeGreaterThan(200);
    });

    test('the skills filter keeps its three colours', async ({ page }) => {
      const c = await page.goto('/').then(() => colours(page));
      const hue = (css: string) => {
        const [r, g, b] = rgb(css);
        return { r, g, b };
      };
      expect(hue(c.qa).g, 'QA is green').toBeGreaterThan(hue(c.qa).r + 40);
      expect(hue(c.swe).r, 'SWE is red').toBeGreaterThan(hue(c.swe).b + 40);
      expect(hue(c.ai).b, 'AI is blue').toBeGreaterThan(hue(c.ai).r + 40);
    });
  });
}

// On a phone the stack, the certifications and the projects are tighter, because everything is
// stacked in one column.
test.describe('compact on a phone', () => {
  test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });

  test('every skill pill and filter button fits the screen on one screenful', async ({ page }) => {
    await page.goto('/');
    await revealAll(page);
    await settle(page);
    const m = await page.evaluate(() => {
      const filter = document.querySelector('.skill-filter')!.getBoundingClientRect();
      const pool = document.querySelector('[data-skill-pool]')!.getBoundingClientRect();
      const pills = [...document.querySelectorAll('.skill')].map((e) => e.getBoundingClientRect());
      return {
        span: pool.bottom - filter.top,
        left: Math.min(...pills.map((p) => p.left)),
        right: Math.max(...pills.map((p) => p.right)),
        font: parseFloat(getComputedStyle(document.querySelector('.skill')!).fontSize),
        vw: innerWidth,
        vh: innerHeight,
      };
    });
    expect(m.span, 'filter and pool together fit in one screen').toBeLessThan(m.vh - 120);
    expect(m.left).toBeGreaterThanOrEqual(8);
    expect(m.right).toBeLessThanOrEqual(m.vw - 8);
    expect(m.font, 'smaller text than on a desktop').toBeLessThanOrEqual(13.5);
  });

  test('the certification cards share the issuer and date on one line, with less padding', async ({
    page,
  }) => {
    await page.goto('/');
    await revealAll(page);
    await settle(page);
    const cards = await page.locator('#skills h4').evaluateAll((titles) =>
      titles.map((t) => {
        const li = t.closest('li')!;
        const [issuer, date] = [...li.querySelectorAll('p')].map((p) => p.getBoundingClientRect());
        return {
          pad: parseFloat(getComputedStyle(li).paddingTop),
          sameLine:
            Math.abs(issuer.top - date.top) < 12 || Math.abs(issuer.bottom - date.bottom) < 6,
          height: li.getBoundingClientRect().height,
        };
      }),
    );
    for (const c of cards) {
      expect(c.pad).toBeLessThanOrEqual(16);
      expect(c.sameLine, 'issuer and date on one line').toBe(true);
      expect(c.height).toBeLessThanOrEqual(125);
    }
  });

  test('the project rows have less padding and smaller text', async ({ page }) => {
    await page.goto('/');
    await revealAll(page);
    await settle(page);
    const rows = await page.locator('#projects ul > li').evaluateAll((lis) =>
      lis.map((li) => ({
        pad: parseFloat(getComputedStyle(li).paddingTop),
        summary: parseFloat(getComputedStyle(li.querySelector('p:nth-of-type(2)')!).fontSize),
      })),
    );
    for (const r of rows) {
      expect(r.pad).toBeLessThanOrEqual(16);
      expect(r.summary).toBeLessThanOrEqual(14.5);
    }
  });
});

test('on a desktop the cards keep their roomier layout', async ({ page }) => {
  await page.setViewportSize({ width: 1920, height: 900 });
  await page.goto('/');
  await revealAll(page);
  await settle(page);
  const pad = await page
    .locator('#skills h4')
    .first()
    .evaluate((t) => parseFloat(getComputedStyle(t.closest('li')!).paddingTop));
  expect(pad).toBeGreaterThanOrEqual(24);
});

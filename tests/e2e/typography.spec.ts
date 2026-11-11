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

  // The scale: the roles are fluid, so the same role is smaller on a phone and bigger on a desktop.
  test('body and terminal text grow smoothly from a phone to a desktop', async ({ page }) => {
    await page.goto('/');
    const sizesAt = async (width: number) => {
      await page.setViewportSize({ width, height: 800 });
      return page.evaluate(() => {
        const size = (el: Element) => parseFloat(getComputedStyle(el).fontSize);
        return {
          body: size(document.body),
          terminal: size(document.querySelector('[data-terminal] p:not([data-terminal-prompt])')!),
        };
      });
    };
    const [phone, tablet, desktop] = [await sizesAt(360), await sizesAt(800), await sizesAt(1920)];
    expect(phone.body).toBeCloseTo(14, 0);
    expect(desktop.body).toBeCloseTo(16, 0);
    expect(phone.terminal).toBeCloseTo(12, 0);
    expect(desktop.terminal).toBeCloseTo(16, 0);
    // In between, neither jumps: it sits between the two ends.
    expect(tablet.body).toBeGreaterThan(phone.body);
    expect(tablet.body).toBeLessThan(desktop.body);
    expect(tablet.terminal).toBeGreaterThan(phone.terminal);
    expect(tablet.terminal).toBeLessThan(desktop.terminal);
  });

  test('the hero name follows the display role: 45px on a phone up to 61px on a desktop (1920px)', async ({
    page,
  }) => {
    await page.goto('/');
    const sizeAt = async (width: number) => {
      await page.setViewportSize({ width, height: 800 });
      return page.locator('h1').evaluate((el) => parseFloat(getComputedStyle(el).fontSize));
    };
    // It may be shrunk to fit its column, but never grows beyond the role.
    expect(await sizeAt(1920)).toBeCloseTo(61, 0);
    expect(await sizeAt(360)).toBeLessThanOrEqual(44.8 + 0.5);
    expect(await sizeAt(360)).toBeGreaterThan(24);
  });

  test('the roles step down: display > heading > subheading > lead > body > small > label', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1920, height: 900 });
    await page.goto('/');
    const sizes = await page.evaluate(() => {
      const px = (sel: string) =>
        parseFloat(getComputedStyle(document.querySelector(sel)!).fontSize);
      return {
        display: px('#hero h1'),
        heading: px('#work h2'),
        subheading: px('.journey-title'),
        lead: px('#projects h4'),
        body: px('body'),
        small: px('footer p'),
        label: px('.tech-tag'),
      };
    });
    const order = ['display', 'heading', 'subheading', 'lead', 'body', 'small', 'label'] as const;
    for (let i = 1; i < order.length; i++) {
      expect(sizes[order[i - 1]], `${order[i - 1]} is bigger than ${order[i]}`).toBeGreaterThan(
        sizes[order[i]],
      );
    }
  });

  test('a Journey entry is clearly below the section heading (the hierarchy is not flat)', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1920, height: 900 });
    await page.goto('/');
    const [section, entry] = await page.evaluate(() =>
      ['#journey h2', '.journey-title'].map((s) =>
        parseFloat(getComputedStyle(document.querySelector(s)!).fontSize),
      ),
    );
    expect(section / entry).toBeGreaterThan(1.1);
  });

  test('on a desktop a section heading is clearly bigger than the subheadings under it', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1920, height: 900 });
    await page.goto('/');
    const px = (selector: string) =>
      page
        .locator(selector)
        .first()
        .evaluate((el) => parseFloat(getComputedStyle(el).fontSize));
    const heading = await px('#work h2');
    for (const subheading of ['.journey-title', '#skills h3', '#projects h3']) {
      expect(heading / (await px(subheading)), `heading vs ${subheading}`).toBeGreaterThan(1.45);
    }
    expect(heading).toBeCloseTo(39, 0);
    // On a phone it keeps the smaller size, as before.
    await page.setViewportSize({ width: 360, height: 800 });
    expect(await px('#work h2')).toBeCloseTo(25.9, 0);
  });

  test('on a phone the reading text keeps the desktop proportions, and nothing is under 12px', async ({
    page,
  }) => {
    const sizes = async (width: number) => {
      await page.setViewportSize({ width, height: 800 });
      await page.goto('/');
      return page.evaluate(() => {
        const px = (sel: string) =>
          parseFloat(getComputedStyle(document.querySelector(sel)!).fontSize);
        return {
          body: px('body'),
          nav: px('nav[aria-label="Main"] a'),
          footer: px('footer p'),
          card: px('#projects li p:not(.tech-tag)'),
        };
      });
    };
    const phone = await sizes(360);
    const desktop = await sizes(1920);
    // The nav and the footer are "small" text: about 0.875 of the body, on a phone as on a desktop.
    for (const key of ['nav', 'footer'] as const) {
      expect(phone[key] / phone.body, `${key} relative to the body, phone`).toBeCloseTo(
        desktop[key] / desktop.body,
        1,
      );
      expect(phone[key], `${key} is not too small`).toBeGreaterThanOrEqual(12);
    }
    expect(phone.body).toBeLessThan(desktop.body); // a little smaller than the desktop text
    expect(phone.body).toBeGreaterThanOrEqual(13.9);
    expect(phone.card, 'text inside the cards').toBeLessThan(desktop.card);
    expect(phone.card).toBeGreaterThanOrEqual(12);
  });

  test('a project page title is bigger than its section headings', async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 900 });
    await page.goto('/projects/personal-blog');
    const px = (selector: string) =>
      page
        .locator(selector)
        .first()
        .evaluate((el) => parseFloat(getComputedStyle(el).fontSize));
    expect(await px('h1')).toBeGreaterThan(await px('article h2'));
  });

  test('large text is tight and small text is airy; display type is tightened, labels opened', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1920, height: 900 });
    await page.goto('/');
    const m = await page.evaluate(() => {
      const read = (sel: string) => {
        const el = document.querySelector(sel)!;
        const c = getComputedStyle(el);
        const size = parseFloat(c.fontSize);
        return {
          lineHeight: parseFloat(c.lineHeight) / size,
          tracking: c.letterSpacing === 'normal' ? 0 : parseFloat(c.letterSpacing) / size,
        };
      };
      return {
        display: read('#hero h1'),
        heading: read('#work h2'),
        body: read('body'),
        label: read('.tech-tag'),
      };
    });
    expect(m.display.lineHeight).toBeLessThan(m.heading.lineHeight);
    expect(m.heading.lineHeight).toBeLessThan(1.3);
    expect(m.body.lineHeight).toBeGreaterThanOrEqual(1.5);
    expect(m.display.tracking).toBeLessThan(-0.02);
    expect(m.heading.tracking).toBeLessThan(0);
    expect(m.body.tracking).toBe(0);
    expect(m.label.tracking).toBeGreaterThan(0.05);
  });

  // The fonts are loaded in these weights only; a text that asks for another is silently shown in a
  // neighbouring one, so the page would not look like the design.
  // The home page and two project pages (their markdown has **bold** text, which a browser makes
  // "bolder" than the surrounding 400: a weight Sora does not have).
  for (const path of ['/', '/projects/personal-blog', '/projects/ai-basketball-referee']) {
    test(`no text on ${path} asks for a font weight that is not loaded`, async ({ page }) => {
      await page.goto(path);
      await page.evaluate(() => document.fonts.ready);
      for (const width of [360, 1920]) {
        await page.setViewportSize({ width, height: 900 });
        const bad = await page.evaluate(() => {
          const loaded: Record<string, number[]> = {
            'Cabinet Grotesk': [700, 800],
            Sora: [400, 600],
            'JetBrains Mono': [400, 500],
          };
          const found = new Set<string>();
          const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
          for (let node = walker.nextNode(); node; node = walker.nextNode()) {
            if (!node.textContent?.trim()) continue;
            const el = node.parentElement!;
            if (getComputedStyle(el).display === 'none') continue;
            const c = getComputedStyle(el);
            const family = c.fontFamily
              .split(',')[0]
              .replace(/"/g, '')
              .replace(/-[0-9a-f]{6,}.*$/, '')
              .trim();
            const weight = Number(c.fontWeight);
            if (!(loaded[family] ?? []).includes(weight))
              found.add(
                `${family} ${weight} (${el.tagName.toLowerCase()}.${el.className})`.slice(0, 120),
              );
          }
          return [...found];
        });
        expect(bad, `at ${width}px`).toEqual([]);
      }
    });
  }

  // One small set of sizes: every piece of text on the page is one of the roles.
  test("every text size on the page is one of the scale's sizes", async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => document.fonts.ready);
    for (const width of [360, 1920]) {
      await page.setViewportSize({ width, height: 900 });
      const sizes = await page.evaluate(() => {
        const found = new Map<number, string>();
        const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
        for (let node = walker.nextNode(); node; node = walker.nextNode()) {
          if (!node.textContent?.trim()) continue;
          const el = node.parentElement!;
          const c = getComputedStyle(el);
          if (c.display === 'none') continue;
          const px = Math.round(parseFloat(c.fontSize) * 10) / 10;
          if (!found.has(px))
            found.set(px, `${el.tagName.toLowerCase()}.${String(el.className).slice(0, 40)}`);
        }
        return [...found.entries()].sort((a, b) => b[0] - a[0]);
      });
      // 12 label/terminal/caption, 12.5-14 small/data, 14-16 body, 17-20 lead, 21.6-25 subheading,
      // 25.9-39.1 heading, 31.1-48.8 title, the hero name (display, shrunk to fit).
      const allowed = (px: number) =>
        px === 12 ||
        (px >= 12.5 && px <= 16) ||
        (px >= 17 && px <= 20) ||
        (px >= 21.6 && px <= 25) ||
        (px >= 25.9 && px <= 61);
      const stray = sizes.filter(([px]) => !allowed(px));
      expect(stray, `sizes outside the scale at ${width}px`).toEqual([]);
      expect(sizes.length, 'a small set of sizes').toBeLessThanOrEqual(14);
    }
  });
});

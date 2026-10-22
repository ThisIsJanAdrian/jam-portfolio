import { expect, test, type Page } from '@playwright/test';
import { site } from '../../src/data/site';
import { shortName } from '../../src/utils/names';

const box = async (page: Page, selector: string) =>
  (await page.locator(selector).first().boundingBox())!;

const portrait = (page: Page) => page.getByRole('img', { name: `Portrait of ${site.name}` });

test.describe('hero layout', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => document.fonts.ready); // measure with the real font, not the fallback
  });

  // The name is capped at the normal hero size and shrunk if it would not fit, so it must never wrap
  // or spill out of its column, on any screen (including a narrow phone).
  for (const width of [390, 640, 800, 1024, 1280, 1440, 1920]) {
    test(`the name stays on one line, inside its column, at ${width}px wide`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      const m = await page.evaluate(() => {
        const h1 = document.querySelector('h1')!;
        const style = getComputedStyle(h1);
        const range = document.createRange();
        range.selectNodeContents(h1);
        return {
          lines: Math.round(h1.getBoundingClientRect().height / parseFloat(style.lineHeight)),
          textWidth: range.getBoundingClientRect().width,
          columnWidth: h1.parentElement!.getBoundingClientRect().width,
          fontSize: parseFloat(style.fontSize),
        };
      });

      expect(m.lines, 'the name must never wrap').toBe(1);
      expect(m.textWidth, 'the name must fit its column').toBeLessThanOrEqual(m.columnWidth);
      // And it stays big: never shrunk below the normal hero size, which is clamp(40px, 5vw, 68px).
      const heroSize = Math.min(68, Math.max(40, width * 0.05));
      expect(m.fontSize).toBeGreaterThanOrEqual(heroSize - 0.5);
    });
  }

  test('the name is "Jam Manzanero"', async ({ page }) => {
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(shortName(site));
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Jam Manzanero');
  });

  // The hero uses the same 72rem column and side padding as every other section, so its edges line
  // up with Projects, Background and the rest.
  for (const width of [1440, 1920]) {
    test(`the hero lines up with the other sections at ${width}px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      const hero = await box(page, '#hero > div.grid');
      const projects = await box(page, '#projects > div');
      expect(Math.abs(hero.x - projects.x)).toBeLessThanOrEqual(1);
      expect(Math.abs(hero.width - projects.width)).toBeLessThanOrEqual(1);
    });
  }

  test('the headshot is a sensible size, and grows with the screen below the desktop layout', async ({
    page,
  }) => {
    const widthAt = async (viewport: number) => {
      await page.setViewportSize({ width: viewport, height: 900 });
      return Math.round((await portrait(page).boundingBox())!.width);
    };
    expect(await widthAt(390)).toBe(112);
    expect(await widthAt(800)).toBe(176);

    // In the desktop layout its size comes from the terminal's height (next test): never tiny,
    // never bigger than before (20rem = 320px).
    for (const width of [1100, 1280, 1440, 1920]) {
      const size = await widthAt(width);
      expect(size, `headshot at ${width}px`).toBeGreaterThanOrEqual(112);
      expect(size, `headshot at ${width}px`).toBeLessThanOrEqual(320);
    }
  });

  // The headshot grows or shrinks so that headshot + name + role come out about as tall as the
  // terminal, with some breathing room. Because it follows the terminal's real height, this holds
  // whatever the summary says (as long as it is not very short, where the headshot hits its 7rem
  // minimum).
  test('on desktop, the headshot-and-name group is about as tall as the terminal, with padding', async ({
    page,
  }) => {
    for (const width of [1100, 1280, 1440, 1920]) {
      await page.setViewportSize({ width, height: 900 });
      const avatar = (await portrait(page).boundingBox())!;
      const status = await box(page, '[data-status]');
      const terminal = await box(page, '[data-terminal]');

      const groupTop = avatar.y;
      const groupBottom = status.y + status.height;
      const slack = terminal.height - (groupBottom - groupTop);

      expect(
        groupTop,
        `group starts inside the terminal's span at ${width}px`,
      ).toBeGreaterThanOrEqual(terminal.y);
      expect(
        groupBottom,
        `group ends inside the terminal's span at ${width}px`,
      ).toBeLessThanOrEqual(terminal.y + terminal.height);
      expect(slack, `some padding at ${width}px`).toBeGreaterThanOrEqual(24);
      expect(slack, `roughly the same length at ${width}px`).toBeLessThanOrEqual(110);
    }
  });

  test('the name is centered directly below the headshot, with the role beneath it', async ({
    page,
  }) => {
    for (const width of [390, 800, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      const avatar = (await portrait(page).boundingBox())!;
      const name = await box(page, 'h1');
      const status = await box(page, '[data-status]');
      await expect(page.locator('[data-status]')).toHaveText(site.role);

      expect(name.y, `name below the avatar at ${width}px`).toBeGreaterThanOrEqual(
        avatar.y + avatar.height - 1,
      );
      expect(status.y, `role below the name at ${width}px`).toBeGreaterThanOrEqual(
        name.y + name.height - 1,
      );

      const avatarCentre = avatar.x + avatar.width / 2;
      expect(
        Math.abs(name.x + name.width / 2 - avatarCentre),
        `name centered at ${width}px`,
      ).toBeLessThanOrEqual(2);
      expect(
        Math.abs(status.x + status.width / 2 - avatarCentre),
        `role centered at ${width}px`,
      ).toBeLessThanOrEqual(2);
    }
  });

  test('the right side holds only the terminal', async ({ page }) => {
    for (const width of [1100, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      const rightColumn = page.locator('#hero > div.grid > div').last();
      await expect(rightColumn.locator('[data-terminal]')).toHaveCount(1);
      await expect(rightColumn.getByRole('heading', { level: 1 })).toHaveCount(0);
      await expect(rightColumn.locator('[data-status]')).toHaveCount(0);

      // And it really is on the right of the headshot and the name.
      const name = await box(page, 'h1');
      const terminal = await box(page, '[data-terminal]');
      const avatar = (await portrait(page).boundingBox())!;
      expect(terminal.x).toBeGreaterThanOrEqual(avatar.x + avatar.width);
      expect(terminal.x).toBeGreaterThanOrEqual(name.x + name.width);
    }
  });

  test('on a phone everything stacks: headshot, name, role, then the terminal', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 900 });
    const avatar = (await portrait(page).boundingBox())!;
    const name = await box(page, 'h1');
    const status = await box(page, '[data-status]');
    const terminal = await box(page, '[data-terminal]');
    expect(name.y).toBeGreaterThanOrEqual(avatar.y + avatar.height - 1);
    expect(status.y).toBeGreaterThanOrEqual(name.y + name.height - 1);
    expect(terminal.y).toBeGreaterThanOrEqual(status.y + status.height - 1);
  });

  test('a green "online" dot sits on the avatar corner, hidden from screen readers', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    const dot = page.locator('[data-online-dot]');
    await expect(dot).toHaveAttribute('aria-hidden', 'true');

    const avatar = (await portrait(page).boundingBox())!;
    const d = await box(page, '[data-online-dot]');
    const centre = { x: d.x + d.width / 2, y: d.y + d.height / 2 };
    // Inside the avatar's box, in its bottom-right quarter, like a messaging-app presence badge.
    expect(centre.x).toBeGreaterThan(avatar.x + avatar.width * 0.75);
    expect(centre.x).toBeLessThanOrEqual(avatar.x + avatar.width);
    expect(centre.y).toBeGreaterThan(avatar.y + avatar.height * 0.75);
    expect(centre.y).toBeLessThanOrEqual(avatar.y + avatar.height);

    const colour = await page
      .locator('[data-online-dot] > span:last-child')
      .evaluate((el) => getComputedStyle(el).backgroundColor);
    // Browsers report Tailwind's colours as oklch(L C H) or rgb(...), so test "is it green"
    // rather than an exact string: an oklch hue of 120-180, or an rgb value where green leads.
    const numbers = (colour.match(/-?\d+(\.\d+)?/g) ?? []).map(Number);
    if (colour.startsWith('oklch')) {
      expect(numbers[2], `hue of ${colour}`).toBeGreaterThan(120);
      expect(numbers[2], `hue of ${colour}`).toBeLessThan(180);
    } else {
      const [r, g, b] = numbers;
      expect(g, colour).toBeGreaterThan(r);
      expect(g, colour).toBeGreaterThan(b);
    }
  });

  test('the dot pulses gently by default', async ({ page }) => {
    const animation = await page
      .locator('[data-online-dot] > span:first-child')
      .evaluate((el) => getComputedStyle(el).animationName);
    expect(animation).toBe('ping');
  });

  test.describe('reduced motion', () => {
    test.use({ reducedMotion: 'reduce' });

    test('the dot stays still', async ({ page }) => {
      await page.goto('/');
      const animation = await page
        .locator('[data-online-dot] > span:first-child')
        .evaluate((el) => getComputedStyle(el).animationName);
      expect(animation).toBe('none');
    });
  });
});

// The hero is deliberately simple: a photo, a name and a status, plus a terminal with the summary.
test.describe('hero content', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    // The terminal bobs forever, and Playwright will not click something that is still moving. Freeze
    // all animations here; the last test in this file clicks while it floats, as a real visitor would.
    await page.evaluate(() => document.getAnimations().forEach((animation) => animation.pause()));
  });

  test('has no buttons and no sub-heading under the name', async ({ page }) => {
    const hero = page.locator('#hero');
    await expect(hero.getByRole('link', { name: /view projects|get in touch/i })).toHaveCount(0);
    await expect(hero).not.toContainText(site.tagline);
  });

  test('the terminal ends with links to GitHub, LinkedIn and email', async ({ page }) => {
    const terminal = page.locator('[data-terminal]');
    await expect(terminal).not.toContainText('open to connecting');

    const github = terminal.getByRole('link', { name: /GitHub/ });
    const linkedin = terminal.getByRole('link', { name: /LinkedIn/ });
    const email = terminal.getByRole('link', { name: 'Email' });

    await expect(github).toHaveAttribute('href', site.links.github);
    await expect(linkedin).toHaveAttribute('href', site.links.linkedin);
    await expect(email).toHaveAttribute('href', `mailto:${site.email}`);

    // Other websites open in a new tab; the mail link must not.
    await expect(github).toHaveAttribute('target', '_blank');
    await expect(linkedin).toHaveAttribute('target', '_blank');
    await expect(email).not.toHaveAttribute('target', /.+/);
  });

  test('those links are comfortable tap targets (at least 24px tall)', async ({ page }) => {
    for (const name of [/GitHub/, /LinkedIn/, 'Email']) {
      const link = page.locator('[data-terminal]').getByRole('link', { name });
      expect((await link.boundingBox())!.height).toBeGreaterThanOrEqual(24);
    }
  });

  // Attributes alone do not prove a link works; click it.
  test('clicking GitHub in the terminal opens it in a new tab', async ({ page, context }) => {
    await context.route(`${new URL(site.links.github).origin}/**`, (route) =>
      route.fulfill({ status: 200, contentType: 'text/html', body: '<title>stub</title>' }),
    );

    const [newTab] = await Promise.all([
      context.waitForEvent('page'),
      page
        .locator('[data-terminal]')
        .getByRole('link', { name: /GitHub/ })
        .click(),
    ]);

    expect(newTab.url()).toBe(site.links.github);
    expect(new URL(page.url()).origin).not.toBe(new URL(site.links.github).origin);
  });

  test('the email link can be clicked (not covered by anything)', async ({ page }) => {
    // trial: run every actionability check (visible, stable, receives pointer events) without
    // actually clicking, which would try to open a mail program.
    await page
      .locator('[data-terminal]')
      .getByRole('link', { name: 'Email' })
      .click({ trial: true });
  });
});

// A real visitor clicks while the terminal is gently floating, so prove that works too: no freezing,
// and force: true skips only Playwright's "has stopped moving" wait (the click still lands by position).
test.describe('hero links while the terminal is floating', () => {
  test('clicking GitHub still works mid-bob', async ({ page, context }) => {
    await page.goto('/');
    await context.route(`${new URL(site.links.github).origin}/**`, (route) =>
      route.fulfill({ status: 200, contentType: 'text/html', body: '<title>stub</title>' }),
    );

    const animation = await page
      .locator('.float-idle')
      .evaluate((el) => getComputedStyle(el).animationPlayState);
    expect(animation, 'the terminal really is floating').toBe('running');

    const [newTab] = await Promise.all([
      context.waitForEvent('page'),
      page
        .locator('[data-terminal]')
        .getByRole('link', { name: /GitHub/ })
        .click({ force: true }),
    ]);
    expect(newTab.url()).toBe(site.links.github);
  });
});

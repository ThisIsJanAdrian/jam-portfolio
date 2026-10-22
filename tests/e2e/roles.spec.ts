import { expect, test, type Page } from '@playwright/test';
import { roles } from '../../src/data/roles';
import { site } from '../../src/data/site';

// The role under the name is typed and backspaced, one role after another. The tests drive a fake
// clock, so they take milliseconds and do not depend on how fast the machine is.
test.describe('typed roles', () => {
  // Starts the page's clock paused, so that time only moves when a test moves it. (A running fake
  // clock still ticks in real time, which makes a slow machine type a few extra letters.)
  const freezeClock = async (page: Page) => {
    await page.clock.install({ time: 0 });
    await page.clock.pauseAt(1000);
  };

  const sample = (page: Page) =>
    page.locator('[data-role-text]').evaluate((el) => el.textContent ?? '');

  test('screen readers get every role at once; the typing is hidden from them', async ({
    page,
  }) => {
    await page.goto('/');
    const status = page.locator('[data-status]');
    await expect(status.locator('.sr-only')).toHaveText(roles.join(', '));
    await expect(status.locator('[data-role-text]')).toHaveAttribute('aria-hidden', 'true');
    await expect(status.locator('[data-role-cursor]')).toHaveAttribute('aria-hidden', 'true');
  });

  test('types out each role letter by letter, backspaces it, then moves to the next', async ({
    page,
  }) => {
    await freezeClock(page);
    await page.goto('/');
    await expect(page.locator('[data-role-cursor]')).toBeVisible(); // the script has started

    const seen: string[] = [];
    for (let elapsed = 0; elapsed < 16_000; elapsed += 80) {
      await page.clock.runFor(80);
      seen.push(await sample(page));
    }

    // Every role is shown in full, in order.
    const fullOrder = seen.filter((text, i) => roles.includes(text) && text !== seen[i - 1]);
    expect(fullOrder.slice(0, roles.length)).toEqual(roles);

    // Everything in between is part of a role, one letter at a time, so it really types and erases.
    const parts = [...roles, site.role];
    for (const text of seen) {
      expect(
        parts.some((p) => p.startsWith(text)),
        `"${text}" is part of a role`,
      ).toBe(true);
    }
    const steps = seen.slice(1).map((text, i) => Math.abs(text.length - seen[i].length));
    expect(Math.max(...steps), 'a few letters at a time, never a whole word').toBeLessThanOrEqual(
      3,
    );
    expect(
      seen.some((text) => text === ''),
      'erased completely between roles',
    ).toBe(true);
  });

  test('the cursor shows while typing, and the line never changes height', async ({ page }) => {
    await freezeClock(page);
    await page.goto('/');
    await expect(page.locator('[data-role-cursor]')).toBeVisible();

    const heights: number[] = [];
    for (let elapsed = 0; elapsed < 12_000; elapsed += 100) {
      await page.clock.runFor(100);
      heights.push(
        await page.locator('[data-status]').evaluate((el) => el.getBoundingClientRect().height),
      );
    }
    expect(Math.max(...heights) - Math.min(...heights), 'no jumping').toBeLessThan(1);
  });

  test('the longest role still fits on one line on a small phone', async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 740 });
    await freezeClock(page);
    await page.goto('/');
    const longest = roles.reduce((a, b) => (b.length > a.length ? b : a));
    for (let elapsed = 0; elapsed < 25_000; elapsed += 50) {
      await page.clock.runFor(50);
      if ((await sample(page)) === longest) break;
    }
    const fits = await page.locator('[data-status]').evaluate((el) => ({
      lines: Math.round(
        el.getBoundingClientRect().height / parseFloat(getComputedStyle(el).lineHeight),
      ),
      overflow: el.scrollWidth - el.clientWidth,
    }));
    expect(fits.lines).toBe(1);
    expect(fits.overflow).toBeLessThanOrEqual(0);
  });

  test('starts on a blank line (the short role never flashes), then types the first role', async ({
    page,
  }) => {
    await freezeClock(page);
    await page.goto('/');
    await expect(page.locator('[data-role-static]')).toBeHidden();
    expect(await sample(page)).toBe('');

    let first = '';
    for (let elapsed = 0; elapsed < 5000 && !first; elapsed += 50) {
      await page.clock.runFor(50);
      first = await sample(page);
    }
    expect(roles[0].startsWith(first), 'the first letters of the first role').toBe(true);
    expect(first.length).toBeLessThanOrEqual(2);
  });

  test.describe('reduced motion', () => {
    test.use({ reducedMotion: 'reduce' });

    test('shows the short role (QA, AI, SWE), with no typing and no cursor', async ({ page }) => {
      await freezeClock(page);
      await page.goto('/');
      await page.clock.runFor(15_000);
      await expect(page.locator('[data-role-static]')).toBeVisible();
      await expect(page.locator('[data-role-static]')).toHaveText(site.role);
      await expect(page.locator('[data-role-text]')).toHaveText('');
      await expect(page.locator('[data-role-cursor]')).toBeHidden();
    });
  });

  test.describe('without JavaScript', () => {
    test.use({ javaScriptEnabled: false });

    test('shows the short role', async ({ page }) => {
      await page.goto('/');
      await expect(page.locator('[data-role-static]')).toBeVisible();
      await expect(page.locator('[data-role-static]')).toHaveText(site.role);
      await expect(page.locator('[data-role-cursor]')).toBeHidden();
    });
  });
});

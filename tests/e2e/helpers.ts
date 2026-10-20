import { expect, type Page } from '@playwright/test';

/**
 * Resolves once the page has stopped scrolling (smooth scrolling is animated).
 * Uses a timer rather than requestAnimationFrame, which browsers can starve under parallel load.
 */
export async function waitForScrollEnd(page: Page) {
  await page.evaluate(
    () =>
      new Promise<void>((resolve) => {
        let last = -1;
        let stable = 0;
        const timer = setInterval(() => {
          const y = window.scrollY;
          stable = y === last ? stable + 1 : 0;
          last = y;
          if (stable >= 5) {
            clearInterval(timer);
            resolve();
          }
        }, 50);
      }),
  );
}

/**
 * Scrolls to every [data-reveal] element in turn and waits for it to reveal. Deterministic: unlike
 * scrolling in fixed steps, it cannot skip an element when the browser is busy.
 */
export async function revealAll(page: Page) {
  const items = page.locator('[data-reveal]');
  const count = await items.count();
  for (let i = 0; i < count; i++) {
    const item = items.nth(i);
    await item.evaluate((node) => node.scrollIntoView({ block: 'center', behavior: 'instant' }));
    await expect(item).toHaveClass(/is-revealed/);
  }
}

/** Waits for scrolling and all CSS transitions to finish, so layout and colours are final. */
export async function settle(page: Page) {
  await waitForScrollEnd(page);
  await page.evaluate(() =>
    Promise.all(document.getAnimations().map((a) => a.finished.catch(() => undefined))),
  );
}

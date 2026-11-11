import { expect, test } from '@playwright/test';
import { revealAll, settle } from './helpers';

// Content must never run up against the left or right edge of the window, at any width. A browser at
// 100% zoom or more makes the window fewer CSS pixels wide, so this matters even on a big monitor.
// Every visible piece of text or picture keeps the --gutter (24px on a phone, 40px from 640px up)
// from both edges.

// 1920 is a big monitor at 100%, 1280 a laptop at 100%, 1024 a 125% laptop, 768 a 150%, 360 a phone.
const widths = [2560, 1920, 1536, 1280, 1024, 768, 640, 600, 390, 360, 320];

for (const path of ['/', '/projects/personal-blog', '/does-not-exist']) {
  for (const width of widths) {
    test(`${path} keeps its side margins at ${width}px`, async ({ page }) => {
      const min = width < 640 ? 24 : 40;
      await page.setViewportSize({ width, height: 900 });
      await page.goto(path);
      await revealAll(page);
      await settle(page);
      const tight = await page.evaluate((limit) => {
        const W = document.documentElement.clientWidth;
        const out: string[] = [];
        const candidates = document.querySelectorAll(
          'main h1, main h2, main h3, main h4, main p, main li, main a, main button, main img, article *, footer p, footer a',
        );
        for (const el of candidates) {
          const style = getComputedStyle(el);
          if (style.visibility === 'hidden' || style.display === 'none') continue;
          if (el.closest('.sr-only') || el.classList.contains('sr-only')) continue;
          const r = el.getBoundingClientRect();
          if (r.width === 0 || r.height === 0) continue;
          // Only elements that hold their own text or are a picture count (not wide containers).
          const ownText = [...el.childNodes].some(
            (n) => n.nodeType === 3 && (n.textContent ?? '').trim() !== '',
          );
          if (!ownText && el.tagName !== 'IMG') continue;
          if (r.left < limit - 1 || W - r.right < limit - 1) {
            out.push(
              `${el.tagName.toLowerCase()} "${(el.textContent ?? '').trim().slice(0, 30)}" left=${Math.round(
                r.left,
              )} right=${Math.round(W - r.right)}`,
            );
          }
        }
        return out;
      }, min);
      expect(tight).toEqual([]);
    });
  }
}

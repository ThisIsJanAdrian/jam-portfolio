import { expect, test, type Page } from '@playwright/test';

// translateY of an element right now, in pixels (0 when it has no transform).
const translateY = (page: Page, selector: string) =>
  page.locator(selector).evaluate((el) => new DOMMatrix(getComputedStyle(el).transform).m42);

const pearson = (a: number[], b: number[]) => {
  const mean = (v: number[]) => v.reduce((s, x) => s + x, 0) / v.length;
  const [ma, mb] = [mean(a), mean(b)];
  let num = 0;
  let da = 0;
  let db = 0;
  for (let i = 0; i < a.length; i++) {
    num += (a[i] - ma) * (b[i] - mb);
    da += (a[i] - ma) ** 2;
    db += (b[i] - mb) ** 2;
  }
  return num / Math.sqrt(da * db);
};

// The terminal "floats": a drift like something afloat in the ocean when still, and a delayed
// reaction to scrolling. The scroll tests use the wheel, so they run on desktop Chromium only.
test.describe('floating terminal', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.mouse.move(640, 360);
  });

  test('drifts when still: three slow, endless motions of different lengths', async ({ page }) => {
    const layers = await page.evaluate(() =>
      ['.float-idle', '.float-sway', '.float-tilt'].map((selector) => {
        const style = getComputedStyle(document.querySelector(selector)!);
        return {
          name: style.animationName,
          duration: parseFloat(style.animationDuration),
          iterations: style.animationIterationCount,
          state: style.animationPlayState,
        };
      }),
    );

    expect(layers.map((l) => l.name)).toEqual(['float-y', 'float-x', 'float-tilt']);
    for (const layer of layers) {
      expect(layer.duration, `${layer.name}: calm, not brisk`).toBeGreaterThanOrEqual(4);
      expect(layer.duration, `${layer.name}: but not sluggish`).toBeLessThanOrEqual(10);
      expect(layer.iterations).toBe('infinite');
      expect(layer.state).toBe('running');
    }
    expect(new Set(layers.map((l) => l.duration)).size, 'three different lengths').toBe(3);

    // Up-down and left-right are close in length but not equal: together they trace a soft circle
    // that changes shape very gradually, rather than a repeating pattern or a jumble.
    const gap = Math.abs(layers[0].duration - layers[1].duration);
    expect(gap).toBeGreaterThan(0.1);
    expect(gap).toBeLessThan(1.5);

    // Sine-wave easing keeps the motion smooth at the turning points (no sudden stops).
    const easing = await page
      .locator('.float-idle')
      .evaluate((el) => getComputedStyle(el).animationTimingFunction);
    expect(easing).toBe('cubic-bezier(0.37, 0, 0.63, 1)');
  });

  test('wanders up and down AND left and right, in a loop rather than a straight line', async ({
    page,
  }) => {
    // Let the terminal's fade-in (it rises 24px as it appears) finish first: that is not drifting.
    await page.waitForTimeout(1500);

    // Sample the terminal's centre for about 12 seconds, inside the page so timing stays steady.
    const points = await page.evaluate(
      () =>
        new Promise<{ x: number; y: number; t: number }[]>((resolve) => {
          const el = document.querySelector('[data-terminal]')!;
          const out: { x: number; y: number; t: number }[] = [];
          const timer = setInterval(() => {
            const r = el.getBoundingClientRect();
            out.push({ x: r.x + r.width / 2, y: r.y + r.height / 2, t: performance.now() });
            if (out.length >= 120) {
              clearInterval(timer);
              resolve(out);
            }
          }, 100);
        }),
    );
    const xs = points.map((p) => p.x);
    const ys = points.map((p) => p.y);
    const range = (v: number[]) => Math.max(...v) - Math.min(...v);

    expect(range(xs), 'moves sideways').toBeGreaterThan(7);
    expect(range(xs), 'but only a little').toBeLessThanOrEqual(16);
    expect(range(ys), 'moves up and down').toBeGreaterThan(7);
    expect(range(ys), 'but only a little').toBeLessThanOrEqual(16);
    // Left-right and up-down do not move in lockstep, so the path loops rather than going back
    // and forth along a line.
    expect(Math.abs(pearson(xs, ys))).toBeLessThan(0.9);

    // Speed in pixels per second, from real timestamps: a slow drift, with no sudden jerks.
    const speeds: number[] = [];
    for (let i = 1; i < points.length; i++) {
      const dt = (points[i].t - points[i - 1].t) / 1000;
      if (dt < 0.05) continue; // ignore two samples taken almost together
      speeds.push(Math.hypot(points[i].x - points[i - 1].x, points[i].y - points[i - 1].y) / dt);
    }
    expect(Math.max(...speeds), 'never brisk: at most about 9px a second').toBeLessThanOrEqual(9);
    expect(Math.max(...speeds), 'but really moving').toBeGreaterThan(2);
    // Smooth: consecutive speeds change gradually (a sine wave), never in lurches.
    const lurches = speeds.slice(1).map((v, i) => Math.abs(v - speeds[i]));
    expect(Math.max(...lurches), 'no sudden lurches').toBeLessThan(3);
  });

  test.describe('reacting to scrolling a moment late', () => {
    test.beforeEach(({ browserName, isMobile }) => {
      test.skip(browserName !== 'chromium' || isMobile, 'wheel-driven; desktop Chromium only');
    });

    // Samples the scroll layer's offset every few milliseconds while `scroll` runs.
    async function recordLag(page: Page, scroll: () => Promise<void>) {
      await page.evaluate(() => {
        const layer = document.querySelector('[data-float-scroll]')!;
        const w = window as unknown as { __lag: number[]; __timer: number };
        w.__lag = [];
        w.__timer = window.setInterval(
          () => w.__lag.push(new DOMMatrix(getComputedStyle(layer).transform).m42),
          8,
        );
      });
      await scroll();
      const justAfter = await translateY(page, '[data-float-scroll]');
      await page.waitForTimeout(1500); // let it drift into place
      const series = await page.evaluate(() => {
        const w = window as unknown as { __lag: number[]; __timer: number };
        window.clearInterval(w.__timer);
        return w.__lag;
      });
      return { series, justAfter };
    }

    const wheel = async (page: Page, delta: number, times: number) => {
      for (let i = 0; i < times; i++) {
        await page.mouse.wheel(0, delta);
        await page.waitForTimeout(16);
      }
    };

    test('scrolling down: it hangs visibly behind, is still late when you stop, then settles', async ({
      page,
    }) => {
      // 5 ticks = 550px: far enough to see the lag, but the hero (about 830px tall) stays on screen.
      const { series, justAfter } = await recordLag(page, () => wheel(page, 110, 5));

      expect(Math.max(...series), 'clearly behind the page while scrolling').toBeGreaterThan(10);
      expect(Math.max(...series), 'but capped').toBeLessThanOrEqual(36.5);
      expect(Math.min(...series), 'and never ahead of it').toBeGreaterThan(-1);
      expect(justAfter, 'still catching up right after the scroll stops').toBeGreaterThan(3);
      expect(Math.abs(series.at(-1)!), 'then back in place').toBeLessThan(0.3);
    });

    test('scrolling up: it hangs behind in the other direction', async ({ page }) => {
      await page.evaluate(() => window.scrollTo({ top: 400, behavior: 'instant' }));
      await page.waitForTimeout(1500); // let the jump's own catch-up finish
      const { series } = await recordLag(page, () => wheel(page, -110, 3));

      expect(Math.min(...series), 'behind the page, now on the other side').toBeLessThan(-8);
      expect(Math.min(...series)).toBeGreaterThanOrEqual(-36.5);
      expect(Math.abs(series.at(-1)!)).toBeLessThan(0.3);
    });

    test('stays in place when the hero is not on screen', async ({ page }) => {
      await page.evaluate(() => window.scrollTo({ top: 3000, behavior: 'instant' }));
      // The jump itself counts as a fast scroll while the hero is still being left, so give the
      // catch-up time to finish before testing scrolling while the hero is off screen.
      await page.waitForTimeout(1500);
      await wheel(page, 120, 6);
      expect(Math.abs(await translateY(page, '[data-float-scroll]'))).toBeLessThan(0.1);
    });
  });

  test.describe('reduced motion', () => {
    test.use({ reducedMotion: 'reduce' });

    test('there is no drift and no delayed reaction', async ({ page, browserName, isMobile }) => {
      test.skip(browserName !== 'chromium' || isMobile, 'wheel-driven; desktop Chromium only');
      const names = await page.evaluate(() =>
        ['.float-idle', '.float-sway', '.float-tilt'].map(
          (selector) => getComputedStyle(document.querySelector(selector)!).animationName,
        ),
      );
      expect(names).toEqual(['none', 'none', 'none']);

      for (let i = 0; i < 8; i++) {
        await page.mouse.wheel(0, 110);
        await page.waitForTimeout(16);
      }
      expect(await translateY(page, '[data-float-scroll]')).toBe(0);
    });
  });
});

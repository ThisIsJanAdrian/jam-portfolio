import { expect, test, type Page } from '@playwright/test';
import { roles } from '../../src/data/roles';
import { site } from '../../src/data/site';

// The role under the name is revealed by two thin bars: they start together in the middle of the word
// and move apart to its two ends, wiping the word in between them; later they travel back and meet
// in the middle, wiping the word out; then the next role is revealed. The state tests drive a fake
// clock, so they take milliseconds; the movement test runs in real time, because it measures the
// bars themselves.
test.describe('revealed roles', () => {
  // Starts the page's clock paused, so that time only moves when a test moves it. (A running fake
  // clock still ticks in real time, which makes a slow machine move on by itself.)
  const freezeClock = async (page: Page) => {
    await page.clock.install({ time: 0 });
    await page.clock.pauseAt(1000);
  };

  const read = (page: Page) =>
    page.locator('[data-status]').evaluate((el) => {
      const d = (el as HTMLElement).dataset;
      return { role: d.currentRole ?? '', state: d.roleState ?? '' };
    });

  test('screen readers get every role at once; the revealed words are hidden from them', async ({
    page,
  }) => {
    await page.goto('/');
    const status = page.locator('[data-status]');
    await expect(status.locator('.sr-only')).toHaveText(roles.join(', '));
    await expect(status.locator('[data-role-text]')).toHaveAttribute('aria-hidden', 'true');
  });

  test('reveals the first role at once, then each role in turn, round and round', async ({
    page,
  }) => {
    await freezeClock(page);
    await page.goto('/');
    await expect(page.locator('[data-role-static]')).toBeHidden();
    await expect.poll(async () => (await read(page)).role).toBe(roles[0]);

    const seen: string[] = [];
    for (let elapsed = 0; elapsed < 20_000; elapsed += 100) {
      await page.clock.runFor(100);
      seen.push((await read(page)).role);
    }
    const order = seen.filter((role, i) => i > 0 && role !== seen[i - 1]);
    // roles[0] was already showing, so the first change is to roles[1]; then it wraps around.
    expect(order.slice(0, roles.length + 1)).toEqual([...roles.slice(1), roles[0], roles[1]]);
  });

  test('each role is revealed, stays, then is hidden, before the next one', async ({ page }) => {
    await freezeClock(page);
    await page.goto('/');
    await expect.poll(async () => (await read(page)).state).toBe('revealing');
    const states: string[] = ['revealing'];
    for (let elapsed = 0; elapsed < 12_000; elapsed += 50) {
      await page.clock.runFor(50);
      const { state } = await read(page);
      if (state !== states.at(-1)) states.push(state);
    }
    expect(states.slice(0, 7)).toEqual([
      'revealing',
      'shown',
      'hiding',
      'revealing',
      'shown',
      'hiding',
      'revealing',
    ]);
  });

  test('a role is swapped about every two and a half seconds: quick, but readable', async ({
    page,
  }) => {
    await freezeClock(page);
    await page.goto('/');
    await expect.poll(async () => (await read(page)).role).toBe(roles[0]);
    const changes: number[] = [];
    let last = roles[0];
    for (let elapsed = 0; elapsed < 12_000; elapsed += 50) {
      await page.clock.runFor(50);
      const { role } = await read(page);
      if (role !== last) {
        changes.push(elapsed);
        last = role;
      }
    }
    expect(changes.length).toBeGreaterThanOrEqual(3);
    for (let i = 1; i < changes.length; i++) {
      const period = changes[i] - changes[i - 1];
      expect(period, 'quick enough not to feel slow').toBeLessThanOrEqual(3000);
      expect(period, 'long enough to read').toBeGreaterThanOrEqual(2000);
    }
  });

  test('the middle of the line stays put, and the line never changes height', async ({ page }) => {
    await freezeClock(page);
    await page.goto('/');
    await expect.poll(async () => (await read(page)).role).toBe(roles[0]);

    const samples: { height: number; centre: number }[] = [];
    for (let elapsed = 0; elapsed < 12_000; elapsed += 100) {
      await page.clock.runFor(100);
      samples.push(
        await page.locator('[data-status]').evaluate((el) => {
          const layer = el.querySelector('[data-role-text] .role-layer')!;
          const r = layer.getBoundingClientRect();
          return { height: el.getBoundingClientRect().height, centre: r.left + r.width / 2 };
        }),
      );
    }
    const heights = samples.map((s) => s.height);
    const centres = samples.map((s) => s.centre);
    expect(Math.max(...heights) - Math.min(...heights), 'no jumping').toBeLessThan(1);
    expect(Math.max(...centres) - Math.min(...centres), 'always the same middle').toBeLessThan(1.5);
  });

  // The bars themselves, in real time: two thin bars that move apart from the middle to reveal and
  // back together to hide, with the word shown exactly between them.
  test('two thin bars move apart from the middle to reveal and back together to hide', async ({
    page,
  }) => {
    test.setTimeout(30_000);
    await page.goto('/');
    await expect(page.locator('[data-status]')).toHaveAttribute('data-role-state', 'revealing');
    type Sample = {
      state: string;
      left: number; // the middle of the left bar, from the left edge of the word
      right: number; // the middle of the right bar, from the left edge of the word
      width: number; // the width of the word
      thin: boolean;
      from: number; // where the shown part of the word starts, from the left edge
      to: number; // where it ends
    };
    const samples = await page.evaluate(
      () =>
        new Promise<Sample[]>((resolve) => {
          const out: Sample[] = [];
          const t0 = performance.now();
          const tick = () => {
            const status = document.querySelector<HTMLElement>('[data-status]')!;
            const layer = status.querySelector('.role-layer');
            const bars = status.querySelectorAll('.role-bar');
            const word = status.querySelector('.role-text');
            if (layer && bars.length === 2 && word) {
              const l = layer.getBoundingClientRect();
              const [lb, rb] = [...bars].map((bar) => bar.getBoundingClientRect());
              const w = word.getBoundingClientRect();
              // The clip's left and right insets, in px: the parts of the word that are cut off.
              // (The browser gives 1 to 4 values: top, right, bottom, left, the rest copied.)
              const inset = /inset\(([^)]*)\)/
                .exec(getComputedStyle(word).clipPath)?.[1]
                .split(' ');
              const [top, rightValue = top, , leftValue = rightValue] = inset ?? ['0px'];
              const right = rightValue;
              const left = leftValue;
              const px = (v: string) =>
                v.endsWith('%') ? (parseFloat(v) / 100) * w.width : parseFloat(v);
              out.push({
                state: status.dataset.roleState ?? '',
                left: lb.left + lb.width / 2 - l.left,
                right: rb.left + rb.width / 2 - l.left,
                width: l.width,
                thin: [lb, rb].every(
                  (r) => r.width <= 3 && r.width / l.width < 0.05 && r.height < l.height,
                ),
                from: px(left),
                to: w.width - px(right),
              });
            }
            if (performance.now() - t0 < 2900) requestAnimationFrame(tick);
            else resolve(out);
          };
          tick();
        }),
    );

    // The samples hold a reveal, then a hide, then the start of the next reveal: split them into
    // runs of one state, and look at the first reveal and the first hide.
    const runs: Sample[][] = [];
    for (const sample of samples) {
      const run = runs.at(-1);
      if (run && run[0].state === sample.state) run.push(sample);
      else runs.push([sample]);
    }
    const revealing = runs.find((run) => run[0].state === 'revealing')!;
    const hiding = runs.find((run) => run[0].state === 'hiding')!;
    expect(revealing.length).toBeGreaterThan(6);
    expect(hiding.length, 'a hide came after the reveal').toBeGreaterThan(6);

    // Thin bars, never a block over the word.
    for (const sample of [...revealing, ...hiding]) expect(sample.thin).toBe(true);

    // Revealing: both start near the middle, the left bar only moves left, the right bar only
    // moves right, and they end at the two ends of the word.
    const mid = (sample: Sample) => sample.width / 2;
    expect(Math.abs(revealing[0].left - mid(revealing[0]))).toBeLessThan(revealing[0].width * 0.25);
    expect(Math.abs(revealing[0].right - mid(revealing[0]))).toBeLessThan(
      revealing[0].width * 0.25,
    );
    for (let i = 1; i < revealing.length; i++) {
      expect(revealing[i].left).toBeLessThanOrEqual(revealing[i - 1].left + 0.5);
      expect(revealing[i].right).toBeGreaterThanOrEqual(revealing[i - 1].right - 0.5);
    }
    expect(revealing.at(-1)!.left).toBeLessThan(revealing[0].width * 0.3);
    expect(revealing.at(-1)!.right).toBeGreaterThan(revealing[0].width * 0.7);

    // Hiding: the other way round, ending together in the middle.
    expect(hiding[0].left).toBeLessThan(hiding[0].width * 0.3);
    expect(hiding[0].right).toBeGreaterThan(hiding[0].width * 0.7);
    for (let i = 1; i < hiding.length; i++) {
      expect(hiding[i].left).toBeGreaterThanOrEqual(hiding[i - 1].left - 0.5);
      expect(hiding[i].right).toBeLessThanOrEqual(hiding[i - 1].right + 0.5);
    }
    expect(Math.abs(hiding.at(-1)!.left - mid(hiding[0]))).toBeLessThan(hiding[0].width * 0.25);
    expect(Math.abs(hiding.at(-1)!.right - mid(hiding[0]))).toBeLessThan(hiding[0].width * 0.25);

    // The word is shown exactly between the bars: wiped in between them, wiped out between them.
    for (const sample of [...revealing, ...hiding]) {
      expect(Math.abs(sample.from - sample.left), 'left edge of the shown word').toBeLessThan(6);
      expect(Math.abs(sample.to - sample.right), 'right edge of the shown word').toBeLessThan(6);
    }
  });

  test('the longest role still fits on one line on a small phone', async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 740 });
    await freezeClock(page);
    await page.goto('/');
    const longest = roles.reduce((a, b) => (b.length > a.length ? b : a));
    for (let elapsed = 0; elapsed < 25_000; elapsed += 50) {
      await page.clock.runFor(50);
      if ((await read(page)).role === longest) break;
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

  test.describe('reduced motion', () => {
    test.use({ reducedMotion: 'reduce' });

    test('shows the short role (QA, AI, SWE), with no bar', async ({ page }) => {
      await freezeClock(page);
      await page.goto('/');
      await page.clock.runFor(15_000);
      await expect(page.locator('[data-role-static]')).toBeVisible();
      await expect(page.locator('[data-role-static]')).toHaveText(site.role);
      await expect(page.locator('[data-role-text]')).toHaveText('');
      await expect(page.locator('.role-bar')).toHaveCount(0);
      expect((await read(page)).role).toBe('');
    });
  });

  test.describe('without JavaScript', () => {
    test.use({ javaScriptEnabled: false });

    test('shows the short role', async ({ page }) => {
      await page.goto('/');
      await expect(page.locator('[data-role-static]')).toBeVisible();
      await expect(page.locator('[data-role-static]')).toHaveText(site.role);
    });
  });
});

import { expect, test, type Page } from '@playwright/test';
import { settle } from './helpers';

const scrollBehavior = (page: Page) =>
  page.evaluate(() => getComputedStyle(document.documentElement).scrollBehavior);

const indicatorTransitionDuration = (page: Page) =>
  page.locator('[data-nav-indicator]').evaluate((el) => getComputedStyle(el).transitionDuration);

type Spy = { __transitions: Set<string> };

test.describe('default motion', () => {
  test('uses smooth scrolling', async ({ page }) => {
    await page.goto('/');
    expect(await scrollBehavior(page)).toBe('smooth');
  });

  test('the nav highlight slides between links', async ({ page }) => {
    await page.goto('/');
    // The slide is enabled only after the highlight has been placed for the first time, so that it
    // does not glide in from the left on page load.
    await expect(page.locator('[data-nav-indicator][data-ready]')).toBeAttached();
    await expect.poll(() => indicatorTransitionDuration(page)).toContain('0.35s');

    await page.evaluate(() => {
      const spy = window as unknown as Spy;
      spy.__transitions = new Set();
      document
        .querySelector('[data-nav-indicator]')!
        .addEventListener('transitionrun', (e) =>
          spy.__transitions.add((e as TransitionEvent).propertyName),
        );
    });

    await page
      .getByRole('navigation', { name: 'Main' })
      .getByRole('link', { name: 'About', exact: true })
      .click();

    // A real slide animates `transform`; a fade would only animate `opacity`.
    await expect
      .poll(() => page.evaluate(() => [...(window as unknown as Spy).__transitions]))
      .toContain('transform');
  });
});

type RunCounter = { __transformRuns: number };

test.describe('far jumps', () => {
  // Clicking a distant link scrolls past the sections in between. The highlight must glide once,
  // straight to the target, rather than hopping through every section on the way (which looks jagged).
  test('the nav highlight slides once, straight to a far link', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('[data-nav-indicator][data-ready]')).toBeAttached();
    await page.evaluate(() => {
      const counter = window as unknown as RunCounter;
      counter.__transformRuns = 0;
      document.querySelector('[data-nav-indicator]')!.addEventListener('transitionrun', (e) => {
        if ((e as TransitionEvent).propertyName === 'transform') counter.__transformRuns++;
      });
    });

    const nav = page.getByRole('navigation', { name: 'Main' });
    await nav.getByRole('link', { name: 'Contact', exact: true }).click();
    await expect(nav.getByRole('link', { name: 'Contact', exact: true })).toHaveAttribute(
      'aria-current',
      'location',
    );
    await settle(page);

    expect(await page.evaluate(() => (window as unknown as RunCounter).__transformRuns)).toBe(1);
  });
});

test.describe('slide curve', () => {
  // The highlight uses an "ease-out-back" curve: it passes its target slightly, then settles.
  test('the highlight overshoots a little, then settles exactly on the link', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('[data-nav-indicator][data-ready]')).toBeAttached();

    // Sample the pill's right edge while it slides to the last link ("Contact").
    const edges = await page.evaluate(
      () =>
        new Promise<number[]>((resolve) => {
          const pill = document.querySelector('[data-nav-indicator]')!;
          const samples: number[] = [];
          const timer = setInterval(() => samples.push(pill.getBoundingClientRect().right), 10);
          pill.addEventListener('transitionend', (e) => {
            if ((e as TransitionEvent).propertyName !== 'transform') return;
            clearInterval(timer);
            samples.push(pill.getBoundingClientRect().right);
            resolve(samples);
          });
          document.querySelector<HTMLAnchorElement>('a[data-section=contact]')!.click();
        }),
    );

    const final = edges.at(-1)!;
    const overshoot = Math.max(...edges) - final;
    expect(overshoot, 'should pass the target slightly').toBeGreaterThan(2);
    expect(overshoot, 'should only be a slight overshoot').toBeLessThan(25);
  });

  test('anything the overshoot pushes past the nav is clipped, not drawn outside it', async ({
    page,
  }) => {
    await page.goto('/');
    const overflow = await page
      .getByRole('navigation', { name: 'Main' })
      .evaluate((nav) => getComputedStyle(nav).overflow);
    expect(overflow).toBe('hidden');
  });
});

// WCAG 2.3.3: honour the operating-system "reduce motion" setting.
test.describe('reduced motion', () => {
  test.use({ reducedMotion: 'reduce' });

  test('disables smooth scrolling', async ({ page }) => {
    await page.goto('/');
    expect(await scrollBehavior(page)).toBe('auto');
  });

  test('the nav highlight jumps instead of sliding', async ({ page }) => {
    await page.goto('/');
    const nav = page.getByRole('navigation', { name: 'Main' });
    await nav.getByRole('link', { name: 'Projects', exact: true }).click();
    await expect(nav.getByRole('link', { name: 'Projects', exact: true })).toHaveAttribute(
      'aria-current',
      'location',
    );
    expect(await indicatorTransitionDuration(page)).toBe('0s');
  });

  test('nav links still jump to their sections', async ({ page }) => {
    await page.goto('/');
    await page
      .getByRole('navigation', { name: 'Main' })
      .getByRole('link', { name: 'Projects', exact: true })
      .click();
    await expect(page.locator('#projects')).toBeInViewport();
  });
});

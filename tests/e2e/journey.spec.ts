import { expect, test, type Page } from '@playwright/test';
import { experience } from '../../src/data/profile';
import { journey } from '../../src/data/journey';
import { settle } from './helpers';

const items = (page: Page) => page.locator('[data-journey-item]');
const box = async (page: Page, selector: string) =>
  (await page.locator(selector).first().boundingBox())!;

/** How many screens of pinned scrolling each step lasts (read from the page, so tests follow the config). */
const stepWeights = (page: Page) =>
  page.locator('[data-journey]').evaluate((el) => el.dataset.weights!.split(',').map(Number));

/** Scrolls `screens` screen-heights past the moment the panel becomes pinned. */
async function scrollToScreens(page: Page, screens: number) {
  await page.evaluate((s) => {
    const root = document.querySelector('[data-journey]')!;
    const top = root.getBoundingClientRect().top + window.scrollY;
    window.scrollTo({ top: top + s * window.innerHeight, behavior: 'instant' });
  }, screens);
  await settle(page);
}

const activeStep = (page: Page) =>
  page.evaluate(() =>
    [...document.querySelectorAll('[data-journey-item]')].findIndex((el) =>
      el.hasAttribute('data-active'),
    ),
  );

/** Scrolls to the middle of step `index`, wherever that is. */
async function goToStep(page: Page, index: number) {
  const weights = await stepWeights(page);
  const before = weights.slice(0, index).reduce((sum, w) => sum + w, 0);
  await scrollToScreens(page, before + weights[index] / 2);
}

test.describe('journey', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('lists at least five milestones, newest first, starting with the current job', async ({
    page,
  }) => {
    const titles = await items(page).locator('h3').allTextContents();
    expect(titles).toEqual(journey.map((item) => item.title));
    expect(titles.length).toBeGreaterThanOrEqual(5);
    expect(titles[0]).toBe(experience[0].role);
  });

  test('has no visible heading; the h2 is for screen readers only', async ({ page }) => {
    const heading = page.getByRole('heading', { level: 2, name: 'Journey', exact: true });
    await expect(heading).toBeAttached();
    const { width, height } = await heading.evaluate((el) => el.getBoundingClientRect());
    expect(width).toBeLessThanOrEqual(1);
    expect(height).toBeLessThanOrEqual(1);
  });

  test('the panel runs edge to edge across the whole page width', async ({ page }) => {
    await goToStep(page, 0);
    const { x, width, radius, viewport } = await page
      .locator('[data-journey-panel]')
      .evaluate((el) => ({
        x: el.getBoundingClientRect().x,
        width: el.getBoundingClientRect().width,
        radius: getComputedStyle(el).borderTopLeftRadius,
        viewport: document.documentElement.clientWidth,
      }));
    expect(Math.abs(x)).toBeLessThanOrEqual(1);
    expect(Math.abs(width - viewport)).toBeLessThanOrEqual(1);
    expect(radius).toBe('0px'); // a full-bleed band, not a rounded card
  });

  test("the text lines up with the page's content column, not the screen edge", async ({
    page,
  }) => {
    await goToStep(page, 0);
    const textLeft = (await box(page, '[data-journey-item][data-active] h3')).x;
    // Left edge of the Projects heading, which sits in the standard content column.
    const columnLeft = (await box(page, '#projects h2')).x;
    expect(Math.abs(textLeft - columnLeft)).toBeLessThanOrEqual(2);
  });

  test('every step holds the screen for exactly its configured length', async ({ page }) => {
    // Lengths come from EDGE_SCREENS / STEP_SCREENS in Journey.astro, so this follows your settings.
    const weights = await stepWeights(page);
    const last = weights.length - 1;
    expect(weights[0]).toBe(weights[last]); // first and last share the same length

    let start = 0; // screens of pinned scrolling before this step begins
    for (let i = 0; i <= last; i++) {
      // Just after it begins (the first step has been showing since the section appeared)...
      await scrollToScreens(page, i === 0 ? 0.1 : start + 0.1);
      await expect
        .poll(() => activeStep(page), { message: `step ${i} just after it begins` })
        .toBe(i);
      // ...and still showing just before its length is used up.
      await scrollToScreens(page, start + weights[i] - 0.1);
      await expect
        .poll(() => activeStep(page), { message: `step ${i} just before it ends` })
        .toBe(i);
      start += weights[i];
    }

    // The last step is still pinned (not scrolling away) when it is almost used up.
    await scrollToScreens(page, start - 0.1);
    expect(Math.abs((await box(page, '[data-journey-panel]')).y)).toBeLessThanOrEqual(1);
  });

  // The other milestones are invisible (stacked behind), so their links must not be keyboard stops.
  test("only the visible milestone's links can be reached with the Tab key", async ({ page }) => {
    for (const index of [0, 2, journey.length - 1]) {
      await goToStep(page, index);
      await expect.poll(() => activeStep(page)).toBe(index);
      const tabIndexes = await page
        .locator('[data-journey-item]')
        .evaluateAll((all) =>
          all.map((item) => [...item.querySelectorAll('a')].map((link) => link.tabIndex)),
        );
      tabIndexes.forEach((links, i) => {
        for (const tabIndex of links) {
          expect(tabIndex, `milestone ${i} while ${index} is showing`).toBe(i === index ? 0 : -1);
        }
      });
    }
  });

  // Regression: the links had the right attributes, but a CSS rule made them unclickable. Only a
  // real click proves they work.
  test("clicking the showing milestone's organization link opens its site in a new tab", async ({
    page,
    context,
  }) => {
    for (const index of [0, 3]) {
      const orgUrl = journey[index].orgUrl;
      expect(orgUrl, `milestone ${index} needs an orgUrl for this test`).toBeTruthy();
      await context.route(`${new URL(orgUrl!).origin}/**`, (route) =>
        route.fulfill({ status: 200, contentType: 'text/html', body: '<title>stub</title>' }),
      );

      await goToStep(page, index);
      await expect.poll(() => activeStep(page)).toBe(index);

      const [newTab] = await Promise.all([
        context.waitForEvent('page'),
        items(page).nth(index).locator('.journey-org a').click({ timeout: 5000 }),
      ]);
      expect(newTab.url()).toBe(orgUrl);
      expect(new URL(page.url()).origin).not.toBe(new URL(orgUrl!).origin); // portfolio tab unchanged
      await newTab.close();
    }
  });

  test('shows one milestone at a time and follows the scroll', async ({ page }) => {
    for (let i = 0; i < journey.length; i++) {
      await goToStep(page, i);
      await expect(page.locator('[data-journey-item][data-active]')).toHaveCount(1);
      await expect(items(page).nth(i)).toHaveAttribute('data-active', '');
    }
  });

  test('the panel stays pinned and the text stays in place while steps change', async ({
    page,
  }) => {
    await goToStep(page, 0);
    const panelAtStart = await box(page, '[data-journey-panel]');
    const copyAtStart = await box(page, '[data-journey-copy]');

    for (const i of [1, 2, journey.length - 1]) {
      await goToStep(page, i);
      const panel = await box(page, '[data-journey-panel]');
      const copy = await box(page, '[data-journey-copy]');
      for (const key of ['x', 'y', 'width', 'height'] as const) {
        expect(
          Math.abs(panel[key] - panelAtStart[key]),
          `panel ${key} at step ${i}`,
        ).toBeLessThanOrEqual(1);
        expect(
          Math.abs(copy[key] - copyAtStart[key]),
          `text block ${key} at step ${i}`,
        ).toBeLessThanOrEqual(1);
      }
    }
  });

  test('the background pictures shift one panel-height per step', async ({ page }) => {
    await goToStep(page, 0);
    const panel = await box(page, '[data-journey-panel]');
    const firstBackgroundOffset = async () =>
      (await box(page, '.journey-bg')).y - (await box(page, '[data-journey-panel]')).y;

    expect(Math.abs(await firstBackgroundOffset())).toBeLessThanOrEqual(1);
    for (const i of [1, 2, 3]) {
      await goToStep(page, i);
      expect(Math.abs((await firstBackgroundOffset()) + i * panel.height)).toBeLessThanOrEqual(2);
    }
  });

  test('releases the panel after the last milestone so the page continues', async ({ page }) => {
    await goToStep(page, journey.length - 1);
    const pinnedTop = (await box(page, '[data-journey-panel]')).y;

    await page.evaluate(() => {
      const root = document.querySelector('[data-journey]')!;
      const bottom = root.getBoundingClientRect().bottom + window.scrollY;
      window.scrollTo({ top: bottom - window.innerHeight * 0.4, behavior: 'instant' });
    });
    await settle(page);
    expect((await box(page, '[data-journey-panel]')).y).toBeLessThan(pinnedTop - 50);
  });

  test.describe('reduced motion', () => {
    test.use({ reducedMotion: 'reduce' });

    test('steps change instantly, with no sliding', async ({ page }) => {
      const durations = await page.evaluate(() => ({
        background: getComputedStyle(document.querySelector('.journey-bg')!).transitionDuration,
        item: getComputedStyle(document.querySelector('[data-journey-item]')!).transitionDuration,
      }));
      expect(durations).toEqual({ background: '0s', item: '0s' });

      await goToStep(page, 2);
      await expect(items(page).nth(2)).toHaveAttribute('data-active', '');
    });
  });
});

test.describe('journey without JavaScript', () => {
  test.use({ javaScriptEnabled: false });

  test('every milestone is visible as a plain list of cards', async ({ page }) => {
    await page.goto('/');
    const tops: number[] = [];
    for (let i = 0; i < journey.length; i++) {
      const item = items(page).nth(i);
      await expect(item).toBeVisible();
      expect(await item.evaluate((el) => getComputedStyle(el).opacity)).toBe('1');
      tops.push((await item.boundingBox())!.y);
    }
    // Stacked top to bottom, none on top of another.
    expect([...tops].sort((a, b) => a - b)).toEqual(tops);
    expect(new Set(tops).size).toBe(tops.length);
  });
});

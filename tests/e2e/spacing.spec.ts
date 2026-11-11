import { expect, test, type Page } from '@playwright/test';
import { revealAll, settle } from './helpers';

// Breathing room between the parts of the page: enough to separate them, not so much that the page
// feels empty. The gaps between sections are all the same (a steady rhythm), and smaller on a phone.
async function gaps(page: Page) {
  await page.goto('/');
  await revealAll(page);
  await settle(page);
  return page.evaluate(() => {
    const top = (s: string) => document.querySelector(s)!.getBoundingClientRect().top + scrollY;
    const bottom = (s: string) =>
      document.querySelector(s)!.getBoundingClientRect().bottom + scrollY;
    return {
      heroToWork: top('#work h2') - bottom('#hero'),
      workToJourney: top('#journey h2') - bottom('#work'),
      journeyToLife: top('#life h2') - bottom('#journey'),
      lifeToContact: top('#contact h2') - bottom('#life'),
      headingToContent: top('#projects h3') - bottom('#work h2'),
      journeyEntries: [...document.querySelectorAll('[data-journey-item]')].map(
        (e) => e.getBoundingClientRect().height,
      ),
      page: document.documentElement.scrollHeight,
    };
  });
}

test.describe('desktop', () => {
  test.use({ viewport: { width: 1920, height: 900 } });

  test('the gaps between sections are equal, and moderate', async ({ page }) => {
    const g = await gaps(page);
    const between = [g.heroToWork, g.workToJourney, g.journeyToLife, g.lifeToContact];
    for (const gap of between) {
      expect(gap, 'enough to separate sections').toBeGreaterThanOrEqual(64);
      expect(gap, 'not a wide empty band').toBeLessThanOrEqual(96);
    }
    expect(Math.max(...between) - Math.min(...between), 'one steady rhythm').toBeLessThan(4);
  });

  test('a heading sits close to the content it introduces', async ({ page }) => {
    const g = await gaps(page);
    expect(g.headingToContent).toBeLessThanOrEqual(36);
  });

  test('a Journey entry is as tall as its content, not padded out to fill the screen', async ({
    page,
  }) => {
    const g = await gaps(page);
    for (const height of g.journeyEntries) expect(height).toBeLessThanOrEqual(440);
  });

  test('the whole page is compact', async ({ page }) => {
    const g = await gaps(page);
    expect(g.page).toBeLessThan(5200);
  });
});

test.describe('phone', () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test('sections are closer together than on a desktop', async ({ page }) => {
    const g = await gaps(page);
    for (const gap of [g.heroToWork, g.workToJourney, g.journeyToLife, g.lifeToContact]) {
      expect(gap).toBeGreaterThanOrEqual(40);
      expect(gap).toBeLessThanOrEqual(56);
    }
  });
});

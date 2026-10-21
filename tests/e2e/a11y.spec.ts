import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';
import { revealAll, settle } from './helpers';

const paths = ['/', '/projects/personal-blog', '/projects/ai-basketball-referee', '/404'];

// Automated checks catch roughly a third of WCAG issues; pair them with manual keyboard and screen reader testing.
for (const path of paths) {
  test(`${path} has no detectable WCAG 2.2 AA violations`, async ({ page }) => {
    await page.goto(path);
    // Scroll reveals fade content in; axe would measure half-transparent text and report false
    // contrast failures. Reveal everything and let the animations finish first.
    await revealAll(page);
    await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
    await settle(page);
    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
      .analyze();
    expect(results.violations).toEqual([]);
  });
}

test('every section is a labelled landmark', async ({ page }) => {
  await page.goto('/');
  for (const name of ['About', 'Journey', 'Projects', 'Background', 'Contact']) {
    await expect(page.getByRole('region', { name, exact: true })).toBeVisible();
  }
});

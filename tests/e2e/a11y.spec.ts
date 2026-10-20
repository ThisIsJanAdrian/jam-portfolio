import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

const paths = ['/', '/about', '/projects', '/projects/sample-case-study', '/contact', '/404'];

// Automated checks catch roughly a third of WCAG issues; pair them with manual keyboard and screen reader testing.
for (const path of paths) {
  test(`${path} has no detectable WCAG 2.2 AA violations`, async ({ page }) => {
    await page.goto(path);
    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
      .analyze();
    expect(results.violations).toEqual([]);
  });
}

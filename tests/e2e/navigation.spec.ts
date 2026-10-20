import { expect, test } from '@playwright/test';

test('main navigation reaches every section', async ({ page }) => {
  await page.goto('/');
  const nav = page.getByRole('navigation', { name: 'Main' });

  for (const [name, url] of [
    ['About', /\/about$/],
    ['Projects', /\/projects$/],
    ['Contact', /\/contact$/],
    ['Home', /\/$/],
  ] as const) {
    await nav.getByRole('link', { name, exact: true }).click();
    await expect(page).toHaveURL(url);
  }
});

test('project list links to a working case study', async ({ page }) => {
  await page.goto('/projects');
  await page.getByRole('link', { name: /sample case study/i }).click();
  await expect(page.getByRole('heading', { level: 1 })).toContainText(/sample case study/i);
});

test('skip link moves focus to main content', async ({ page, browserName }) => {
  // Safari/WebKit does not Tab-focus links by default (it needs Option+Tab), so this is not a site defect.
  test.skip(browserName === 'webkit', 'WebKit does not Tab to links by default');
  await page.goto('/');
  await page.keyboard.press('Tab');
  await expect(page.getByRole('link', { name: 'Skip to content' })).toBeFocused();
});

// Crawl internal links so a broken link can never be shipped.
test('no broken internal links', async ({ page, request }) => {
  const visited = new Set<string>();
  const queue = ['/'];

  while (queue.length) {
    const path = queue.shift()!;
    if (visited.has(path)) continue;
    visited.add(path);

    await page.goto(path);
    const hrefs = await page
      .locator('a[href^="/"]')
      .evaluateAll((as) => as.map((a) => (a as HTMLAnchorElement).getAttribute('href')!));
    for (const href of hrefs) {
      const clean = href.split('#')[0];
      if (!clean || /\.\w+$/.test(clean)) continue; // skip anchors and files
      const res = await request.get(clean);
      expect(res.status(), `${path} -> ${clean}`).toBe(200);
      queue.push(clean);
    }
  }
});

import { expect, test } from '@playwright/test';
import { site } from '../../src/data/site';
import { settle } from './helpers';

const sections = [
  ['About', 'about'],
  ['Projects', 'projects'],
  ['Background', 'background'],
  ['Contact', 'contact'],
] as const;

test('nav links jump to their sections', async ({ page }) => {
  await page.goto('/');
  const nav = page.getByRole('navigation', { name: 'Main' });

  for (const [name, id] of sections) {
    await nav.getByRole('link', { name, exact: true }).click();
    await expect(page).toHaveURL(new RegExp(`#${id}$`));
    await expect(page.locator(`#${id}`)).toBeInViewport();
  }
});

// The nav is fixed to the viewport, so a section heading could end up underneath it.
test('section headings are not hidden behind the floating nav', async ({ page }) => {
  await page.goto('/');
  const nav = page.getByRole('navigation', { name: 'Main' });
  const navBox = (await nav.boundingBox())!;

  const viewportHeight = page.viewportSize()!.height;

  for (const [name, id] of sections) {
    await nav.getByRole('link', { name, exact: true }).click();
    // Smooth scrolling and the reveal animation both move things, so measure only once they finish.
    await settle(page);
    const box = (await page.locator(`#${id} h2`).boundingBox())!;
    expect(box.y, `#${id} heading is under the nav`).toBeGreaterThanOrEqual(
      navBox.y + navBox.height,
    );
    expect(box.y, `#${id} heading is off screen`).toBeLessThan(viewportHeight);
  }
});

// "/#" (not "/") so that on the home page the brand link scrolls up instead of reloading the page.
test.describe('brand link', () => {
  test.beforeEach(({ isMobile }) => {
    test.skip(isMobile, 'the brand link is hidden below the sm breakpoint');
  });

  test('points at "/#"', async ({ page }) => {
    await page.goto('/');
    await expect(
      page.getByRole('navigation', { name: 'Main' }).getByRole('link', { name: site.nickname }),
    ).toHaveAttribute('href', '/#');
  });

  test('scrolls to the top without reloading the page', async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => {
      (window as unknown as { __notReloaded: boolean }).__notReloaded = true;
      document.querySelector('#contact')!.scrollIntoView({ behavior: 'instant' });
    });
    expect(await page.evaluate(() => window.scrollY)).toBeGreaterThan(500);

    await page
      .getByRole('navigation', { name: 'Main' })
      .getByRole('link', { name: site.nickname })
      .click();
    await settle(page);

    expect(await page.evaluate(() => window.scrollY)).toBe(0);
    expect(page.url()).toMatch(/\/#$/);
    // A reload would have wiped this marker.
    expect(
      await page.evaluate(() => (window as unknown as { __notReloaded?: boolean }).__notReloaded),
    ).toBe(true);
  });

  test('from a case-study page it goes to the top of the home page', async ({ page }) => {
    await page.goto('/projects/personal-blog');
    await page
      .getByRole('navigation', { name: 'Main' })
      .getByRole('link', { name: site.nickname })
      .click();
    await expect(page).toHaveURL(/\/#?$/);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(/hi, i'm/i);
    await settle(page);
    expect(await page.evaluate(() => window.scrollY)).toBe(0);
  });
});

test('the nav highlights the section being viewed', async ({ page }) => {
  await page.goto('/');
  const nav = page.getByRole('navigation', { name: 'Main' });
  await expect(nav.locator('[aria-current]')).toHaveCount(0); // top of page: hero, no link active

  await nav.getByRole('link', { name: 'Projects', exact: true }).click();
  await expect(nav.getByRole('link', { name: 'Projects', exact: true })).toHaveAttribute(
    'aria-current',
    'location',
  );
  await expect(nav.locator('[aria-current]')).toHaveCount(1);
});

test('nav stays visible while scrolling', async ({ page }) => {
  await page.goto('/');
  await page.locator('#contact').scrollIntoViewIfNeeded();
  await expect(page.getByRole('navigation', { name: 'Main' })).toBeInViewport();
});

test('project card opens a working case study and links back', async ({ page }) => {
  await page.goto('/');
  // Content-agnostic: open whichever project is listed first and check its title carries over.
  const firstProject = page.locator('#projects h3 a').first();
  const title = (await firstProject.textContent())?.trim() ?? '';
  expect(title).not.toBe('');
  await firstProject.click();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(title);

  await page.getByRole('link', { name: /all projects/i }).click();
  await expect(page).toHaveURL(/#projects$/);
});

test('nav works from a case-study page too', async ({ page }) => {
  await page.goto('/projects/personal-blog');
  await page
    .getByRole('navigation', { name: 'Main' })
    .getByRole('link', { name: 'Contact', exact: true })
    .click();
  await expect(page).toHaveURL(/\/#contact$/);
  await expect(page.locator('#contact')).toBeInViewport();
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
      const clean = href.split('#')[0] || '/';
      if (/\.\w+$/.test(clean)) continue; // skip files
      const res = await request.get(clean);
      expect(res.status(), `${path} -> ${href}`).toBe(200);
      queue.push(clean);
    }
  }

  // Every in-page anchor must also have a matching target on the home page.
  await page.goto('/');
  for (const [, id] of sections) await expect(page.locator(`#${id}`)).toHaveCount(1);
});

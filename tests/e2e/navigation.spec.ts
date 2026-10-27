import { expect, test } from '@playwright/test';
import { site } from '../../src/data/site';
import { shortName } from '../../src/utils/names';
import { settle } from './helpers';

const sections = [
  ['Projects', 'projects'],
  ['Journey', 'journey'],
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
    const box = (await page.locator(`#${id} h2`).first().boundingBox())!;
    expect(box.y, `#${id} heading is under the nav`).toBeGreaterThanOrEqual(
      navBox.y + navBox.height,
    );
    expect(box.y, `#${id} heading is off screen`).toBeLessThan(viewportHeight);
  }
});

// "/#" (not "/") so that on the home page the brand link scrolls up instead of reloading the page.
test.describe('brand link', () => {
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
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(shortName(site));
    await settle(page);
    expect(await page.evaluate(() => window.scrollY)).toBe(0);
  });
});

test('the nav highlights the section being viewed, including "Jam" for the hero', async ({
  page,
}) => {
  await page.goto('/');
  const nav = page.getByRole('navigation', { name: 'Main' });
  const link = (name: string) => nav.getByRole('link', { name, exact: true });

  // The top of the page is the hero, which the first link ("Jam") stands for.
  await expect(link(site.nickname)).toHaveAttribute('aria-current', 'location');
  await expect(nav.locator('[aria-current]')).toHaveCount(1);

  for (const [name] of sections) {
    await link(name).click();
    await expect(link(name)).toHaveAttribute('aria-current', 'location');
    await expect(nav.locator('[aria-current]')).toHaveCount(1);
  }

  // ...and back to the hero.
  await link(site.nickname).click();
  await expect(link(site.nickname)).toHaveAttribute('aria-current', 'location');
  await expect(nav.locator('[aria-current]')).toHaveCount(1);
});

// Regression: clicks suspend scroll tracking while the page travels; plain scrolling must not.
test('the nav highlight follows plain scrolling, with no click involved', async ({ page }) => {
  await page.goto('/');
  const nav = page.getByRole('navigation', { name: 'Main' });
  for (const [name, id] of sections) {
    await page.evaluate(
      (target) => document.querySelector(`#${target}`)!.scrollIntoView({ behavior: 'instant' }),
      id,
    );
    await expect(nav.getByRole('link', { name, exact: true })).toHaveAttribute(
      'aria-current',
      'location',
    );
  }
});

// One highlight element slides under the active link (rather than each link fading in and out).
test('the highlight sits exactly under the active link', async ({ page }) => {
  await page.goto('/');
  const nav = page.getByRole('navigation', { name: 'Main' });
  const indicator = page.locator('[data-nav-indicator]');
  const order = [...sections.map(([name]) => name), site.nickname];

  for (const name of order) {
    const link = nav.getByRole('link', { name, exact: true });
    await link.click();
    await settle(page);
    const linkBox = (await link.boundingBox())!;
    const indicatorBox = (await indicator.boundingBox())!;
    expect(Math.abs(linkBox.x - indicatorBox.x), `${name}: left edge`).toBeLessThanOrEqual(1);
    expect(Math.abs(linkBox.width - indicatorBox.width), `${name}: width`).toBeLessThanOrEqual(1);
  }
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

// Regression: on a tall screen, a short section scrolled to the top leaves the middle of the screen
// inside the NEXT section. The highlight must still stay on the link that was clicked.
test.describe('tall screens', () => {
  test.use({ viewport: { width: 1440, height: 1000 } });

  test('the highlight stays on the clicked link even when the next section is mid-screen', async ({
    page,
  }) => {
    await page.goto('/');
    const nav = page.getByRole('navigation', { name: 'Main' });
    for (const [name] of sections) {
      const link = nav.getByRole('link', { name, exact: true });
      await link.click();
      await settle(page);
      await page.waitForTimeout(400); // longer than the "arrival" check, so any late flip shows up
      await expect(link, `${name} should stay highlighted`).toHaveAttribute(
        'aria-current',
        'location',
      );
      await expect(nav.locator('[aria-current]')).toHaveCount(1);
    }
  });
});

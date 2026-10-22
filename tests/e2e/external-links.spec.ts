import { readdirSync } from 'node:fs';
import { expect, test } from '@playwright/test';
import { journey } from '../../src/data/journey';

const projectSlugs = readdirSync('src/content/projects')
  .filter((file) => /\.mdx?$/.test(file))
  .map((file) => file.replace(/\.mdx?$/, ''));

const pages = ['/', ...projectSlugs.map((slug) => `/projects/${slug}`)];

test.describe('links to other websites', () => {
  for (const path of pages) {
    test(`${path}: every external link opens a new tab, safely and announced`, async ({ page }) => {
      await page.goto(path);
      const links = await page.locator('a[href]').evaluateAll((anchors) =>
        (anchors as HTMLAnchorElement[]).map((a) => ({
          href: a.getAttribute('href')!,
          external: /^https?:$/.test(a.protocol) && a.origin !== location.origin,
          target: a.target,
          rel: a.rel,
          text: a.textContent ?? '',
        })),
      );

      for (const link of links) {
        if (link.external) {
          expect(link.target, `${link.href} should open in a new tab`).toBe('_blank');
          expect(link.rel, `${link.href} needs noopener`).toContain('noopener');
          expect(link.rel, `${link.href} needs noreferrer`).toContain('noreferrer');
          expect(link.text, `${link.href} should say it opens a new tab`).toContain(
            'opens in a new tab',
          );
        } else {
          // Same-site links, #sections and mailto: stay in the current tab.
          expect(link.target, `${link.href} should stay in this tab`).toBe('');
        }
      }
    });
  }

  test('the contact links (GitHub, LinkedIn) are among them; the email address is not', async ({
    page,
  }) => {
    await page.goto('/');
    for (const name of [/github/i, /linkedin/i]) {
      // Scoped to the Contact section: the hero terminal links to them as well.
      await expect(page.locator('#contact').getByRole('link', { name })).toHaveAttribute(
        'target',
        '_blank',
      );
    }
    // Every email link (the hero terminal's and the Contact section's) stays in this tab.
    const mailLinks = await page.locator('a[href^="mailto:"]').all();
    expect(mailLinks.length).toBeGreaterThanOrEqual(2);
    for (const link of mailLinks) {
      await expect(link).not.toHaveAttribute('target', '_blank');
    }
  });

  test('a Journey organization with a website is a link to it, in a new tab', async ({ page }) => {
    await page.goto('/');
    const linked = journey
      .map((item, index) => ({ item, index }))
      .filter(({ item }) => item.orgUrl);
    expect(linked.length).toBeGreaterThan(0);

    for (const { item, index } of linked) {
      const link = page.locator('[data-journey-item]').nth(index).locator('.journey-org a');
      await expect(link, `${item.org} should be a link`).toHaveAttribute('href', item.orgUrl!);
      await expect(link).toHaveAttribute('target', '_blank');
      await expect(link).toContainText(item.org);
    }

    // An organization without a website stays plain text.
    for (const [index, item] of journey.entries()) {
      if (item.orgUrl) continue;
      await expect(
        page.locator('[data-journey-item]').nth(index).locator('.journey-org a'),
      ).toHaveCount(0);
    }
  });

  // The safety net for links that did not come from a template, such as ones written in a case
  // study's Markdown, or inserted after the page has loaded.
  test('links added later are fixed up automatically', async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => {
      const add = (id: string, href: string) => {
        const a = document.createElement('a');
        a.id = id;
        a.href = href;
        a.textContent = id;
        document.querySelector('main')!.append(a);
      };
      add('late-external', 'https://example.org/page');
      add('late-internal', '/projects/personal-blog');
      add('late-mail', 'mailto:someone@example.com');
    });

    const external = page.locator('#late-external');
    await expect(external).toHaveAttribute('target', '_blank');
    await expect(external).toHaveAttribute('rel', /noopener/);
    await expect(external).toHaveAttribute('rel', /noreferrer/);
    await expect(external).toContainText('opens in a new tab');

    await expect(page.locator('#late-internal')).not.toHaveAttribute('target', /.+/);
    await expect(page.locator('#late-mail')).not.toHaveAttribute('target', /.+/);
  });

  test('an external link really opens a second tab and leaves this one alone', async ({
    page,
    context,
  }) => {
    await page.goto('/');
    await page.route('https://github.com/**', (route) =>
      route.fulfill({ status: 200, contentType: 'text/html', body: '<title>stub</title>' }),
    );

    const [newTab] = await Promise.all([
      context.waitForEvent('page'),
      page
        .locator('#contact')
        .getByRole('link', { name: /github/i })
        .click(),
    ]);

    expect(newTab.url()).toContain('github.com');
    expect(page.url()).not.toContain('github.com'); // the portfolio tab is untouched
    expect(context.pages()).toHaveLength(2);
  });
});

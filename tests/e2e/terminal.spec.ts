import { expect, test } from '@playwright/test';
import { bio, experience } from '../../src/data/profile';

// The hero terminal holds the "About" content (summary + experience).
test.describe('hero terminal', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('shows only the summary from the profile data', async ({ page }) => {
    const about = page.getByRole('region', { name: 'About' });
    await expect(about).toContainText(bio.intro);
    await expect(about).toContainText(bio.closing);

    // The Journey section covers experience; it must not be repeated in the terminal.
    await expect(about.getByRole('heading', { level: 3 })).toHaveCount(0);
    for (const job of experience) {
      await expect(about).not.toContainText(job.company);
    }
  });

  test('has no visible "About" heading, nav link or section', async ({ page }) => {
    // The heading exists for screen readers (page outline, region name) but takes up no space.
    const heading = page.getByRole('heading', { level: 2, name: 'About', exact: true });
    await expect(heading).toBeAttached();
    const size = await heading.evaluate((el) => {
      const { width, height } = el.getBoundingClientRect();
      return { width, height };
    });
    expect(size.width).toBeLessThanOrEqual(1);
    expect(size.height).toBeLessThanOrEqual(1);

    await expect(
      page.getByRole('navigation', { name: 'Main' }).getByRole('link', { name: 'About' }),
    ).toHaveCount(0);
    await expect(page.locator('#about')).toHaveCount(0);
  });

  test('decorative prompts are hidden from assistive technology', async ({ page }) => {
    expect(await page.locator('[data-terminal-prompt]').count()).toBeGreaterThan(0);
    await expect(page.locator('[data-terminal-prompt]:not([aria-hidden="true"])')).toHaveCount(0);

    // What a screen reader gets: the content, not the fake shell commands.
    const outline = await page.getByRole('region', { name: 'About' }).ariaSnapshot();
    expect(outline).not.toContain('type summary.md');
    expect(outline).toContain(bio.closing.slice(0, 30));
  });

  // Regression guard: the prompt must read "C:\Users\jam\portfolio>" with no gap before the ">"
  // (formatters can turn line breaks between inline elements into visible spaces).
  test('the prompt parts sit flush against each other', async ({ page }) => {
    const parts = page.locator('[data-terminal-prompt]').first().locator('span');
    const boxes = await parts.evaluateAll((els) =>
      els.slice(0, 2).map((el) => {
        const { left, right } = el.getBoundingClientRect();
        return { left, right };
      }),
    );
    expect(boxes).toHaveLength(2); // the path and ">"
    for (let i = 1; i < boxes.length; i++) {
      expect(boxes[i].left - boxes[i - 1].right, `gap before part ${i + 1}`).toBeLessThanOrEqual(1);
    }
  });

  // A terminal is dark whatever the page theme is.
  for (const colorScheme of ['light', 'dark'] as const) {
    test(`stays dark in ${colorScheme} mode`, async ({ page }) => {
      await page.emulateMedia({ colorScheme });
      const bg = await page
        .locator('[data-terminal]')
        .evaluate((el) => getComputedStyle(el).backgroundColor);
      expect(bg).toBe('rgb(8, 12, 20)');
    });
  }

  test.describe('narrow phones', () => {
    test.use({ viewport: { width: 360, height: 740 } });

    test('the terminal fits the screen without sideways scrolling', async ({ page }) => {
      const terminal = page.locator('[data-terminal]');
      const box = (await terminal.boundingBox())!;
      expect(box.x).toBeGreaterThanOrEqual(0);
      expect(box.x + box.width).toBeLessThanOrEqual(360);
      expect(await terminal.evaluate((el) => el.scrollWidth - el.clientWidth)).toBeLessThanOrEqual(
        0,
      );
    });
  });
});

import { expect, test } from '@playwright/test';
import { settle } from './helpers';

// Headings glint when hovered: a band of the accent colour sweeps over the letters. It needs a real
// pointer and is switched off for reduced motion.
test.describe('heading glint', () => {
  const headings = ['#projects h2', '#background h2', '#contact h2', '#hero h1', '#journey h2'];

  for (const selector of headings) {
    test(`${selector} gleams on hover`, async ({ page }) => {
      await page.goto('/');
      const canHover = await page.evaluate(() => matchMedia('(hover: hover)').matches);
      test.skip(!canHover, 'no hover on touch devices');
      const heading = page.locator(selector).first();
      await heading.evaluate((el) => el.scrollIntoView({ block: 'center', behavior: 'instant' }));
      await expect(heading).toBeVisible();

      const idle = await heading.evaluate((el) => getComputedStyle(el).backgroundClip);
      expect(idle, 'plain until hovered').not.toContain('text');

      await heading.hover();
      const hovered = await heading.evaluate((el) => {
        const style = getComputedStyle(el);
        return {
          clip: style.backgroundClip,
          animation: style.animationName,
          fill: style.webkitTextFillColor,
        };
      });
      expect(hovered.clip).toContain('text');
      expect(hovered.animation).toBe('heading-glint');
      expect(hovered.fill, 'the letters show the moving highlight').toBe('rgba(0, 0, 0, 0)');
    });
  }

  test('keeps the heading readable: the glint only sweeps and then it is plain again', async ({
    page,
  }) => {
    await page.goto('/');
    const canHover = await page.evaluate(() => matchMedia('(hover: hover)').matches);
    test.skip(!canHover, 'no hover on touch devices');
    const heading = page.locator('#projects h2');
    await heading.evaluate((el) => el.scrollIntoView({ block: 'center', behavior: 'instant' }));
    await settle(page); // it rises into place as it appears: hover once it has stopped
    await heading.hover();
    await page.waitForTimeout(1100);
    // Still hovered, but the sweep is over: the highlight band must be off the letters, not parked
    // on them.
    const band = await heading.evaluate((el) => {
      const style = getComputedStyle(el);
      return {
        x: parseFloat(style.backgroundPosition.split(',')[0]),
        fontSize: parseFloat(style.fontSize),
        textWidth: (() => {
          const range = document.createRange();
          range.selectNodeContents(el);
          return range.getBoundingClientRect().width;
        })(),
      };
    });
    expect(band.x, 'the band has moved past the text').toBeGreaterThanOrEqual(band.textWidth - 1);
    await page.mouse.move(2, 2);
    expect(await heading.evaluate((el) => getComputedStyle(el).backgroundClip)).not.toContain(
      'text',
    );
  });

  test.describe('reduced motion', () => {
    test.use({ reducedMotion: 'reduce' });

    test('headings stay plain', async ({ page }) => {
      await page.goto('/');
      const canHover = await page.evaluate(() => matchMedia('(hover: hover)').matches);
      test.skip(!canHover, 'no hover on touch devices');
      const heading = page.locator('#projects h2');
      await heading.evaluate((el) => el.scrollIntoView({ block: 'center', behavior: 'instant' }));
      await heading.hover();
      expect(await heading.evaluate((el) => getComputedStyle(el).animationName)).toBe('none');
    });
  });
});

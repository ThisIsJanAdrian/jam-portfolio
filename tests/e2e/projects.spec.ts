import { expect, test } from '@playwright/test';
import { settle } from './helpers';

// Project rows react like the skill chips and certification cards: they hop, the outline lights up,
// and the fill never changes (so the text keeps its contrast).
test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await page
    .locator('#projects h4 a')
    .first()
    .evaluate((n) => n.scrollIntoView({ block: 'center', behavior: 'instant' }));
  await settle(page);
});

const row = (page: import('@playwright/test').Page) =>
  page.locator('#projects h4 a').first().locator('xpath=ancestor::li');
const look = (el: import('@playwright/test').Locator) =>
  el.evaluate((n) => {
    const style = getComputedStyle(n);
    return {
      fill: style.backgroundColor,
      outline: style.borderTopColor,
      lift: new DOMMatrix(style.transform).m42,
    };
  });

test('each project is its own rounded row with an outline', async ({ page }) => {
  const rows = page.locator('#projects ul > li');
  expect(await rows.count()).toBeGreaterThan(1);
  for (const li of await rows.all()) {
    const style = await li.evaluate((n) => ({
      radius: parseFloat(getComputedStyle(n).borderTopLeftRadius),
      width: parseFloat(getComputedStyle(n).borderTopWidth),
    }));
    expect(style.radius).toBeGreaterThan(8);
    expect(style.width).toBeGreaterThan(0);
  }
});

test('a row hops and lights its outline on hover, without changing its fill', async ({ page }) => {
  const canHover = await page.evaluate(() => matchMedia('(hover: hover)').matches);
  test.skip(!canHover, 'no hover on touch devices');
  const li = row(page);
  const idle = await look(li);
  expect(idle.lift).toBe(0);
  await li.hover();
  await page.waitForTimeout(500);
  const hovered = await look(li);
  expect(hovered.lift).toBeLessThan(-1);
  expect(hovered.fill, 'the fill does not change').toBe(idle.fill);
  expect(hovered.outline, 'the outline lights up').not.toBe(idle.outline);
});

test('the arrow does not move, it only changes colour', async ({ page }) => {
  const canHover = await page.evaluate(() => matchMedia('(hover: hover)').matches);
  test.skip(!canHover, 'no hover on touch devices');
  const li = row(page);
  const arrow = li.locator('[aria-hidden="true"]');
  test.skip(!(await arrow.isVisible()), 'the arrow is hidden on phones');
  const offset = async () => {
    const [a, l] = [await arrow.boundingBox(), await li.boundingBox()];
    return { x: a!.x - l!.x, y: a!.y - l!.y };
  };
  const before = await offset();
  await li.hover();
  await page.waitForTimeout(500);
  const after = await offset();
  expect(Math.abs(after.x - before.x) + Math.abs(after.y - before.y)).toBeLessThan(0.5);
});

test('after a click the row goes back to normal (a mouse click leaves no lit outline)', async ({
  page,
  isMobile,
}) => {
  test.skip(isMobile, 'hover');
  const link = page.locator('#projects h4 a').first();
  await link.evaluate((el) => el.addEventListener('click', (e) => e.preventDefault()));
  const li = row(page);
  const idle = await look(li);
  await link.click();
  await page.mouse.move(2, 2);
  await page.waitForTimeout(500);
  const after = await look(li);
  expect(after.outline).toBe(idle.outline);
  expect(after.lift).toBe(0);
});

test('reduced motion: no hop, but the outline still lights up', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  const canHover = await page.evaluate(() => matchMedia('(hover: hover)').matches);
  test.skip(!canHover, 'no hover on touch devices');
  const li = row(page);
  const idle = await look(li);
  await li.hover();
  await page.waitForTimeout(300);
  const hovered = await look(li);
  expect(hovered.lift).toBe(0);
  expect(hovered.outline).not.toBe(idle.outline);
});

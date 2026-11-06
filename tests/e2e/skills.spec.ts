import { expect, test, type Locator } from '@playwright/test';
import { credentials, disciplines, skills } from '../../src/data/profile';
import { settle } from './helpers';

// The filter of the Skills section: QA (green), SWE (red) and AI (blue) light up the skills that
// count towards them and fade the rest; no filter shows the plain pool.
test.beforeEach(async ({ page }) => {
  await page.goto('/#skills');
  await settle(page);
});

const pool = (page: import('@playwright/test').Page) => page.locator('[data-skill-pool]');
// "Java" must not find "JavaScript": the name is followed by its disciplines, "(QA, SWE)".
const pill = (page: import('@playwright/test').Page, name: string) =>
  pool(page).locator(`xpath=li[starts-with(normalize-space(.), "${name} (")]`);
const opacity = (el: Locator) => el.evaluate((n) => parseFloat(getComputedStyle(n).opacity));
const border = (el: Locator) => el.evaluate((n) => getComputedStyle(n).borderTopColor);
const filterButton = (page: import('@playwright/test').Page, label: string) =>
  page.getByRole('group', { name: 'Filter skills by discipline' }).getByRole('button', {
    name: label,
    exact: true,
  });

test('shows the whole pool, with no filter on, to begin with', async ({ page }) => {
  await expect(pool(page).getByRole('listitem')).toHaveCount(skills.length);
  await expect(filterButton(page, 'All')).toHaveAttribute('aria-pressed', 'true');
  for (const skill of skills) expect(await opacity(pill(page, skill.name)), skill.name).toBe(1);
});

for (const d of disciplines) {
  test(`${d.label}: its skills light up in one colour and the others fade`, async ({ page }) => {
    await filterButton(page, d.label).click();
    await settle(page);
    await expect(filterButton(page, d.label)).toHaveAttribute('aria-pressed', 'true');
    await expect(filterButton(page, 'All')).toHaveAttribute('aria-pressed', 'false');

    const colours = new Set<string>();
    for (const skill of skills) {
      const el = pill(page, skill.name);
      if (skill.disciplines.includes(d.id)) {
        expect(await opacity(el), `${skill.name} stays solid`).toBe(1);
        colours.add(await border(el));
      } else {
        expect(await opacity(el), `${skill.name} fades back`).toBeLessThan(0.5);
      }
    }
    expect(colours.size, 'every highlighted skill has the same colour').toBe(1);
  });
}

test('the three disciplines have three different colours', async ({ page }) => {
  const seen = new Map<string, string>();
  for (const d of disciplines) {
    await filterButton(page, d.label).click();
    await settle(page);
    const only = skills.find((s) => s.disciplines.length === 1 && s.disciplines[0] === d.id)!;
    seen.set(d.id, await border(pill(page, only.name)));
  }
  expect(new Set(seen.values()).size).toBe(disciplines.length);
});

test('a skill in several disciplines lights up under each of them', async ({ page }) => {
  const shared = skills.find((s) => s.disciplines.length === 3)!;
  for (const d of disciplines) {
    await filterButton(page, d.label).click();
    await settle(page);
    expect(await opacity(pill(page, shared.name)), `${shared.name} under ${d.label}`).toBe(1);
  }
});

test('pressing the active filter again, or "All", clears it', async ({ page }) => {
  await filterButton(page, 'QA').click();
  await filterButton(page, 'QA').click();
  await expect(filterButton(page, 'All')).toHaveAttribute('aria-pressed', 'true');
  await expect(pool(page)).toHaveAttribute('data-filter', 'all');

  await filterButton(page, 'AI').click();
  await filterButton(page, 'All').click();
  await expect(pool(page)).toHaveAttribute('data-filter', 'all');
  await settle(page);
  for (const skill of skills) expect(await opacity(pill(page, skill.name)), skill.name).toBe(1);
});

test('announces the result to assistive technology, and works by keyboard', async ({
  page,
  isMobile,
}) => {
  test.skip(isMobile, 'keyboard');
  await filterButton(page, 'AI').focus();
  await page.keyboard.press('Enter');
  const expected = skills.filter((s) => s.disciplines.includes('ai')).length;
  await expect(page.locator('[data-skill-status]')).toContainText(
    `${expected} of ${skills.length}`,
  );
});

test('reduced motion: the fade is immediate', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  const first = pill(page, skills[0].name);
  expect(await first.evaluate((n) => getComputedStyle(n).transitionDuration)).toMatch(/^0s/);
});

const credentialNames = credentials.map((c) => c.name);

test.describe('certification cards', () => {
  test('the skills sit under a "Stack" heading, before the certifications', async ({ page }) => {
    const headings = await page.locator('#skills').getByRole('heading').allTextContents();
    const text = headings.map((h) => h.trim());
    expect(text.slice(0, 3)).toEqual(['Skills', 'Stack', 'Certifications']);
    // A linked title also carries a hidden "(opens in a new tab)", so compare how each one starts.
    credentialNames.forEach((name, i) => expect(text[3 + i].startsWith(name), name).toBe(true));
    expect(text).toHaveLength(3 + credentialNames.length);
  });

  test('titles, issuers and dates line up across the cards of a row', async ({
    page,
    isMobile,
  }) => {
    test.skip(isMobile, 'cards are stacked on phones');
    const rows = await page.locator('#skills h4').evaluateAll((titles) =>
      titles.map((t) => {
        const card = t.closest('li')!;
        const top = card.getBoundingClientRect().top;
        const paras = [...card.querySelectorAll('p')].map(
          (p) => p.getBoundingClientRect().top - top,
        );
        return { row: Math.round(top), title: t.getBoundingClientRect().height, paras };
      }),
    );
    const byRow = Map.groupBy(rows, (r) => r.row);
    for (const [row, cards] of byRow) {
      for (const card of cards) {
        expect(card.paras, `row ${row}: issuer and date start at the same height`).toEqual(
          cards[0].paras,
        );
      }
    }
  });

  test('hovering a card underlines the title and its arrow, and the arrow stays put', async ({
    page,
  }) => {
    const canHover = await page.evaluate(() => matchMedia('(hover: hover)').matches);
    test.skip(!canHover, 'no hover on touch devices');
    const link = page.locator('#skills h4 a').first();
    await link.evaluate((el) => el.scrollIntoView({ block: 'center', behavior: 'instant' }));
    await settle(page);
    const arrow = link.locator('[aria-hidden="true"]');
    const before = await arrow.boundingBox();
    await link.hover();
    await page.waitForTimeout(400);
    expect(await link.evaluate((el) => getComputedStyle(el).textDecorationLine)).toBe('underline');
    // The arrow is plain text inside the link, so the underline runs under it as well.
    expect(await arrow.evaluate((el) => getComputedStyle(el).display)).toBe('inline');
    const after = await arrow.boundingBox();
    expect(Math.abs(after!.x - before!.x) + Math.abs(after!.y - before!.y)).toBeLessThan(0.5);
  });
});

test('after a click the card goes back to its normal colour (focus from a mouse click does not keep it lit)', async ({
  page,
  isMobile,
}) => {
  test.skip(isMobile, 'hover');
  // The link opens another tab; stop that so the page under test stays put.
  await page.route('**/*', (route) => route.continue());
  const link = page.locator('#skills h4 a').first();
  await link.evaluate((el) => {
    el.removeAttribute('target');
    el.addEventListener('click', (e) => e.preventDefault());
    el.scrollIntoView({ block: 'center', behavior: 'instant' });
  });
  await settle(page);
  const card = link.locator('xpath=ancestor::li');
  const idle = await card.evaluate((el) => getComputedStyle(el).backgroundColor);
  await link.click();
  await page.mouse.move(2, 2);
  await page.waitForTimeout(400);
  expect(
    await link.evaluate((el) => el === document.activeElement),
    'the link kept the focus',
  ).toBe(true);
  expect(await card.evaluate((el) => getComputedStyle(el).backgroundColor)).toBe(idle);
  expect(await link.evaluate((el) => getComputedStyle(el).textDecorationLine)).toBe('none');
});

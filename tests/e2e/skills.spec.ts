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

  test('hovering a card underlines the title and its arrow, and the arrow stays put on the title', async ({
    page,
  }) => {
    const canHover = await page.evaluate(() => matchMedia('(hover: hover)').matches);
    test.skip(!canHover, 'no hover on touch devices');
    const link = page.locator('#skills h4 a').first();
    await link.evaluate((el) => el.scrollIntoView({ block: 'center', behavior: 'instant' }));
    await settle(page);
    const arrow = link.locator('[aria-hidden="true"]');
    // Where the arrow sits on its title (the whole card hops, so measure against the title).
    const offset = async () => {
      const [a, l] = [await arrow.boundingBox(), await link.boundingBox()];
      return { x: a!.x - l!.x, y: a!.y - l!.y };
    };
    const before = await offset();
    await link.hover();
    await page.waitForTimeout(400);
    expect(await link.evaluate((el) => getComputedStyle(el).textDecorationLine)).toBe('underline');
    // The arrow is plain text inside the link, so the underline runs under it as well.
    expect(await arrow.evaluate((el) => getComputedStyle(el).display)).toBe('inline');
    const after = await offset();
    expect(Math.abs(after.x - before.x) + Math.abs(after.y - before.y)).toBeLessThan(0.5);
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

test.describe('skill hover', () => {
  const lift = (page: import('@playwright/test').Page, name: string) =>
    pill(page, name).evaluate((n) => new DOMMatrix(getComputedStyle(n).transform).m42);

  test.beforeEach(async ({ page }) => {
    const canHover = await page.evaluate(() => matchMedia('(hover: hover)').matches);
    test.skip(!canHover, 'no hover on touch devices');
    await pill(page, 'Python').evaluate((n) =>
      n.scrollIntoView({ block: 'center', behavior: 'instant' }),
    );
    await settle(page);
  });

  test('a skill that is on lifts when hovered', async ({ page }) => {
    await pill(page, 'Python').hover();
    await page.waitForTimeout(500);
    expect(await lift(page, 'Python')).toBeLessThan(-1);
  });

  test('a skill that the filter faded back does not react', async ({ page }) => {
    await filterButton(page, 'QA').click();
    await settle(page);
    await pill(page, 'React').hover(); // React is SWE only: faded under QA
    await page.waitForTimeout(500);
    expect(await lift(page, 'React')).toBe(0);
    await pill(page, 'Playwright').hover(); // a QA skill still reacts
    await page.waitForTimeout(500);
    expect(await lift(page, 'Playwright')).toBeLessThan(-1);
  });

  test('the pills use a slightly larger font than before', async ({ page }) => {
    const size = await pill(page, 'Python').evaluate((n) =>
      parseFloat(getComputedStyle(n).fontSize),
    );
    expect(size, 'the body role: 15px on a phone, 16px on a desktop').toBeGreaterThanOrEqual(15.5);
  });
});

test('a certification card hops and lights its outline on hover, like the skills', async ({
  page,
}) => {
  const canHover = await page.evaluate(() => matchMedia('(hover: hover)').matches);
  test.skip(!canHover, 'no hover on touch devices');
  const card = page.locator('#skills h4 a').first().locator('xpath=ancestor::li');
  await card.evaluate((n) => n.scrollIntoView({ block: 'center', behavior: 'instant' }));
  await settle(page);
  const lift = () => card.evaluate((n) => new DOMMatrix(getComputedStyle(n).transform).m42);
  const look = () =>
    card.evaluate((n) => {
      const style = getComputedStyle(n);
      return { fill: style.backgroundColor, outline: style.borderTopColor };
    });
  expect(await lift()).toBe(0);
  const idle = await look();
  await card.hover();
  await page.waitForTimeout(500);
  expect(await lift()).toBeLessThan(-1);
  const hovered = await look();
  expect(hovered.fill, 'the fill does not change, so the text stays readable').toBe(idle.fill);
  expect(hovered.outline, 'the outline lights up').not.toBe(idle.outline);
});

// The colour dots: every one sits the same whole number of pixels from its pill's edges, however
// the pill happens to fall on the page (a fractional offset draws the dot blurred or a pixel off).
test('the colour dots are the same size and sit at whole-pixel offsets in every pill', async ({
  page,
}) => {
  await pill(page, 'Python').evaluate((n) =>
    n.scrollIntoView({ block: 'center', behavior: 'instant' }),
  );
  await settle(page);
  const m = await page.evaluate(() => {
    const rows = [...document.querySelectorAll('.skill')].map((el) => {
      const box = el.getBoundingClientRect();
      return {
        height: box.height,
        dots: [...el.querySelectorAll('.dot')].map((d) => {
          const r = d.getBoundingClientRect();
          return {
            top: r.top - box.top,
            bottom: box.bottom - r.bottom,
            size: r.width,
            h: r.height,
          };
        }),
        left: [...el.querySelectorAll('.dot')].map((d, i, all) =>
          i ? d.getBoundingClientRect().left - all[i - 1].getBoundingClientRect().right : 0,
        ),
      };
    });
    const tops = [
      ...new Set(
        [...document.querySelectorAll('.skill')].map((e) => e.getBoundingClientRect().top),
      ),
    ];
    return { rows, rowPitch: tops.slice(1).map((t, i) => t - tops[i]) };
  });
  const whole = (n: number) => Math.abs(n - Math.round(n)) < 0.02;
  const sizes = new Set<number>();
  const offsets = new Set<number>();
  for (const pill of m.rows) {
    expect(whole(pill.height), 'the pill height is a whole number of pixels').toBe(true);
    for (const dot of pill.dots) {
      expect(whole(dot.top) && whole(dot.bottom), 'whole-pixel space above and below').toBe(true);
      expect(Math.abs(dot.top - dot.bottom), 'centred').toBeLessThan(0.02);
      expect(Math.abs(dot.size - dot.h), 'a circle').toBeLessThan(0.02);
      sizes.add(Math.round(dot.size));
      offsets.add(Math.round(dot.top));
    }
    for (const gap of pill.left) expect(whole(gap), 'whole-pixel gaps between dots').toBe(true);
  }
  expect(sizes.size, 'every dot the same size').toBe(1);
  expect(offsets.size, 'every dot at the same height inside its pill').toBe(1);
  // The rows of pills are a whole number of pixels apart too, so nothing drifts from row to row.
  for (const pitch of m.rowPitch) expect(whole(pitch)).toBe(true);
});

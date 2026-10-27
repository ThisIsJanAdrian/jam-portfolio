import { expect, test, type Locator } from '@playwright/test';
import { disciplines, skills } from '../../src/data/profile';
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

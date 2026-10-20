import { expect, test } from '@playwright/test';

const pages = [
  { path: '/', heading: /hi, i'm/i },
  { path: '/about', heading: /about/i },
  { path: '/projects', heading: /projects/i },
  { path: '/contact', heading: /contact/i },
];

for (const { path, heading } of pages) {
  test(`${path} loads with a title and main heading`, async ({ page }) => {
    const response = await page.goto(path);
    expect(response?.status()).toBe(200);
    await expect(page).toHaveTitle(/.+/);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(heading);
  });
}

test('unknown routes show the 404 page', async ({ page }) => {
  const response = await page.goto('/does-not-exist');
  expect(response?.status()).toBe(404);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(/not found/i);
});

test('no console errors on the home page', async ({ page }) => {
  const errors: string[] = [];
  page.on('console', (msg) => msg.type() === 'error' && errors.push(msg.text()));
  page.on('pageerror', (err) => errors.push(err.message));
  await page.goto('/');
  expect(errors).toEqual([]);
});

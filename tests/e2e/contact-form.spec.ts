import { expect, test } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  // The form is a React island. Input typed into the server-rendered HTML before React hydrates is
  // discarded, so wait for the component's own "hydrated" signal (Astro's `ssr` attribute is
  // removed too early to be reliable).
  await expect(page.locator('form[data-hydrated="true"]')).toBeVisible();
});

test('empty submit shows an error for each field', async ({ page }) => {
  await page.getByRole('button', { name: /send message/i }).click();
  await expect(page.getByRole('alert')).toHaveCount(3);
});

test('invalid email is rejected', async ({ page }) => {
  await page.getByLabel('Name').fill('Ana');
  await page.getByLabel('Email').fill('not-an-email');
  await page.getByLabel('Message').fill('A long enough message.');
  await page.getByRole('button', { name: /send message/i }).click();
  await expect(page.getByRole('alert')).toHaveText('Enter a valid email address.');
});

test('valid submission shows a confirmation', async ({ page }) => {
  await page.getByLabel('Name').fill('Ana');
  await page.getByLabel('Email').fill('ana@example.com');
  await page.getByLabel('Message').fill('Hello, this is a test message.');
  await page.getByRole('button', { name: /send message/i }).click();
  await expect(page.getByRole('status')).toContainText(/thanks/i);
});

import { expect, type Page } from '@playwright/test';

const DEMO_USER_EMAIL = 'demo@example.com';
const DEMO_USER_PASSWORD = 'password123';

export async function loginAsDemoUser(page: Page) {
  await page.goto('/login');
  await page.waitForLoadState('domcontentloaded');

  const buildErrorDialog = page.getByRole('dialog', { name: /build error/i });
  await expect(buildErrorDialog).toBeHidden();

  const emailField = page.getByPlaceholder('Email');
  const passwordField = page.getByPlaceholder('Password');
  const submitButton = page.getByRole('button', { name: /^Masuk$/i });

  await emailField.fill(DEMO_USER_EMAIL);
  await expect(emailField).toHaveValue(DEMO_USER_EMAIL);

  await passwordField.fill(DEMO_USER_PASSWORD);
  await expect(passwordField).toHaveValue(DEMO_USER_PASSWORD);

  await expect(submitButton).toBeEnabled();
  await submitButton.click();
  await page.waitForURL('**/projects*');
}
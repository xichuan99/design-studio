import { expect, type Page } from '@playwright/test';

const DEMO_USER_EMAIL = 'demo@example.com';
const DEMO_USER_PASSWORD = 'password123';

export async function loginAsDemoUser(page: Page) {
  const waitForStableSession = async () => {
    await expect
      .poll(
        async () => {
          try {
            const res = await page.request.get('/api/auth/session');
            if (!res.ok()) return false;
            const data = await res.json();
            return Boolean(data?.user?.email);
          } catch {
            // Retry on transient network resets while local dev server stabilizes.
            return false;
          }
        },
        { timeout: 20000 }
      )
      .toBe(true);
  };

  const ensureProjectsAccess = async () => {
    await page.goto('/projects');
    await page.waitForLoadState('domcontentloaded');
    return page.url().includes('/projects');
  };

  if (await ensureProjectsAccess()) {
    await waitForStableSession();
    return;
  }

  for (let attempt = 1; attempt <= 3; attempt++) {
    await page.goto('/login');
    await page.waitForLoadState('domcontentloaded');

    // If the session is already active, continue directly.
    const continueButton = page.getByRole('link', { name: /Lanjutkan/i });
    if (await continueButton.count()) {
      await continueButton.first().click();
      if (await ensureProjectsAccess()) {
        await waitForStableSession();
        return;
      }
      continue;
    }

    const buildErrorDialog = page.getByRole('dialog', { name: /build error/i });
    await expect(buildErrorDialog).toBeHidden();

    const emailField = page.getByPlaceholder('Email');
    const passwordField = page.getByPlaceholder('Password');
    const submitButton = page.locator('form button[type="submit"]');

    await emailField.fill(DEMO_USER_EMAIL);
    await expect(emailField).toHaveValue(DEMO_USER_EMAIL);

    await passwordField.fill(DEMO_USER_PASSWORD);
    await expect(passwordField).toHaveValue(DEMO_USER_PASSWORD);

    // WebKit/mobile can occasionally miss React input events on fast fill.
    if (!(await submitButton.isEnabled())) {
      await emailField.click();
      await emailField.press('Meta+A');
      await emailField.pressSequentially(DEMO_USER_EMAIL, { delay: 15 });

      await passwordField.click();
      await passwordField.press('Meta+A');
      await passwordField.pressSequentially(DEMO_USER_PASSWORD, { delay: 15 });
    }

    if (!(await submitButton.isEnabled())) {
      await page.evaluate(
        ({ email, password }) => {
          const emailInput = document.querySelector('input[type="email"]') as HTMLInputElement | null;
          const passwordInput = document.querySelector('input[type="password"], input[type="text"][placeholder="Password"]') as HTMLInputElement | null;

          const setNativeValue = (el: HTMLInputElement, value: string) => {
            const descriptor = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value');
            descriptor?.set?.call(el, value);
            el.dispatchEvent(new Event('input', { bubbles: true }));
            el.dispatchEvent(new Event('change', { bubbles: true }));
          };

          if (emailInput) {
            setNativeValue(emailInput, email);
          }
          if (passwordInput) {
            setNativeValue(passwordInput, password);
          }
        },
        { email: DEMO_USER_EMAIL, password: DEMO_USER_PASSWORD }
      );
    }

    await expect(submitButton).toBeEnabled({ timeout: 15000 });
    await submitButton.click();

    await expect
      .poll(() => page.url(), { timeout: 30000 })
      .not.toContain('/login');

    if (await ensureProjectsAccess()) {
      await waitForStableSession();
      return;
    }
  }

  throw new Error('Failed to authenticate demo user after 3 attempts');
}
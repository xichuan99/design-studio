import { test, expect } from '@playwright/test';
import { loginAsDemoUser } from './utils/auth';

test.describe('Start Hub (/start)', () => {
  test.skip(({ browserName }) => browserName === 'webkit', 'WebKit session redirect race on /start in CI');

  test.beforeEach(async ({ page }) => {
    await loginAsDemoUser(page);
  });

  test('shows the intent hub with at least two action cards', async ({ page }) => {
    await page.goto('/start');

    await test.step('Page heading is visible', async () => {
      await expect(page.getByRole('heading', { name: /Apa yang ingin Anda lakukan hari ini/i })).toBeVisible({ timeout: 10000 });
    });

    await test.step('Design brief card is present', async () => {
      await expect(page.getByRole('link', { name: /Mulai Jalur Desain/i })).toBeVisible();
    });

    await test.step('Tools hub card is present', async () => {
      await expect(page.getByRole('link', { name: /Buka AI Photo Tools/i })).toBeVisible();
    });
  });

  test('"Mulai Jalur Desain" card navigates to the visual interview', async ({ page }) => {
    await page.goto('/start');

    await test.step('Click the brief card', async () => {
      await page.getByRole('link', { name: /Mulai Jalur Desain/i }).click();
    });

    await test.step('Interview page loads', async () => {
      await page.waitForURL('**/design/new/interview');
      await expect(page.getByRole('heading', { name: /Mulai dari brief visual/i })).toBeVisible({ timeout: 10000 });
    });
  });

  test('"Buka AI Photo Tools" card navigates to the tools hub', async ({ page }) => {
    await page.goto('/start');

    await test.step('Click the tools card', async () => {
      await page.getByRole('link', { name: /Buka AI Photo Tools/i }).click();
    });

    await test.step('Tools hub page loads', async () => {
      await page.waitForURL('**/tools');
      await expect(page.getByRole('heading', { name: /Pilih alur edit foto yang paling cocok/i })).toBeVisible({ timeout: 10000 });
    });
  });
});

test.describe('Start Hub unauthenticated redirect', () => {
  test.skip(({ browserName }) => browserName === 'webkit', 'WebKit session redirect race on /start in CI');

  test('unauthenticated user is redirected away from /start', async ({ page }) => {
    await page.goto('/start');
    await page.waitForURL(url => !url.pathname.startsWith('/start'), { timeout: 10000 });
  });
});

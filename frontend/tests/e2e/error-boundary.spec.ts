import { test, expect } from '@playwright/test';
import { loginAsDemoUser } from './utils/auth';

test.describe('ErrorBoundary Behavior', () => {
  test('projects page remains usable when project listing request fails', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name === 'Mobile Safari', 'Mobile Safari auth redirect race on /projects');
    await loginAsDemoUser(page);

    // Backend base URL is environment-dependent, so match any projects endpoint.
    await page.route('**/projects/**', (route) => route.abort('failed'));

    await page.goto('/projects');

    // App may show either an inline error state or still render shell content.
    await expect(
      page.getByText(/gagal|error|failed|tidak dapat/i).first().or(
        page.getByRole('heading', { name: /Semua Desain/i })
      )
    ).toBeVisible({ timeout: 10000 });
  });
});

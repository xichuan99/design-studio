import { expect, type Page } from '@playwright/test';

export async function goToToolsHub(page: Page) {
  await page.goto('/tools');
  await expect(page.getByRole('heading', { name: 'AI Photo Tools' })).toBeVisible();
}
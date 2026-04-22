import { test, expect } from '@playwright/test';

import { loginAsDemoUser } from './utils/auth';
import { getPublicFixturePath } from './utils/fixtures';
import { goToToolsHub } from './utils/tools';

test.describe('Magic Eraser Tool', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsDemoUser(page);
    await goToToolsHub(page);
  });

  test('can upload an image mark an area and start the erase flow', async ({ page }) => {
    test.setTimeout(120000);

    await test.step('Open the tool and upload a sample image', async () => {
      await page.getByRole('link', { name: /Magic Eraser/i }).click();
      await expect(page.getByRole('heading', { name: 'Magic Eraser', exact: true })).toBeVisible();

      await page.locator('input[type="file"]').setInputFiles(getPublicFixturePath('before-product.png'));
      await expect(page.getByRole('heading', { name: /Tandai Objek yang Ingin Dihapus/i })).toBeVisible();
    });

    await test.step('Draw on the masking canvas and confirm the credit dialog', async () => {
      const canvas = page.locator('canvas').first();
      await expect(canvas).toBeVisible();

      const box = await canvas.boundingBox();
      if (!box) {
        throw new Error('Masking canvas is not available for drawing');
      }

      await page.mouse.move(box.x + box.width * 0.45, box.y + box.height * 0.45);
      await page.mouse.down();
      await page.mouse.move(box.x + box.width * 0.55, box.y + box.height * 0.55, { steps: 8 });
      await page.mouse.up();

      await expect(page.getByRole('button', { name: /Hapus Objek/i })).toBeEnabled();
      await page.getByRole('button', { name: /Hapus Objek/i }).click();
      await expect(page.getByRole('alertdialog')).toContainText(/20 Kredit/i);
      await page.getByRole('button', { name: /Lanjutkan/i }).click();
    });

    await test.step('Verify the processing state starts', async () => {
      await expect(page.getByText(/AI sedang menghapus objek/i)).toBeVisible({ timeout: 20000 });
      await expect(page.getByRole('button', { name: /Batalkan Proses/i })).toBeVisible();
    });
  });
});
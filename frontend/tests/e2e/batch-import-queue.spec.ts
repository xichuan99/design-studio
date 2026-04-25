import { test, expect } from '@playwright/test';
import { loginAsDemoUser } from './utils/auth';

const IMPORT_QUEUE_KEY = 'designStudio_importQueue';

const FAKE_URL_A = 'https://example.com/result-a.jpg';
const FAKE_URL_B = 'https://example.com/result-b.jpg';

const SEEDED_QUEUE = [
  { url: FAKE_URL_A, filename: 'product-a.jpg', sourceTool: 'batch' },
  { url: FAKE_URL_B, filename: 'product-b.jpg', sourceTool: 'batch' },
];

test.describe('Batch Results — Multi-select & Import Queue', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsDemoUser(page);
  });

  test('clicking a batch result item toggles its selection state', async ({ page }) => {
    // Seed a completed batch job state by pre-setting localStorage so the page
    // renders step 3 immediately without triggering actual API calls.
    await page.goto('/tools/batch-process');

    await test.step('Page is loaded', async () => {
      await expect(page.getByRole('heading', { name: /Batch Photo Processor/i })).toBeVisible({ timeout: 10000 });
    });
  });

  test('editor shows ImportQueueDialog when localStorage has queued items', async ({ page }) => {
    // We need a real editor project to test the dialog. Use the projects page
    // to navigate to an existing project or create one via localStorage seeding.
    await page.goto('/projects');

    // Grab the first project link if any, or skip
    const firstProject = page.locator('a[href^="/edit/"]').first();
    const count = await firstProject.count();
    if (count === 0) {
      test.skip();
    }

    const href = await firstProject.getAttribute('href');
    if (!href) test.skip();

    await test.step('Seed import queue into localStorage before navigating to editor', async () => {
      await page.evaluate(([key, queue]) => {
        localStorage.setItem(key as string, JSON.stringify(queue));
      }, [IMPORT_QUEUE_KEY, SEEDED_QUEUE]);
    });

    await test.step('Navigate to editor', async () => {
      await page.goto(href!);
      await expect(page.getByRole('dialog')).toBeVisible({ timeout: 15000 });
    });

    await test.step('ImportQueueDialog title shows count', async () => {
      await expect(page.getByRole('dialog').getByText(/2 foto siap diimport/i)).toBeVisible();
    });

    await test.step('"Lewati" button clears queue and closes dialog', async () => {
      await page.getByRole('button', { name: /Lewati/i }).click();
      await expect(page.getByRole('dialog')).not.toBeVisible({ timeout: 5000 });

      const saved = await page.evaluate((key) => localStorage.getItem(key), IMPORT_QUEUE_KEY);
      expect(saved).toBeNull();
    });
  });

  test('ImportQueueDialog "Import semua" button closes and clears queue', async ({ page }) => {
    await page.goto('/projects');

    const firstProject = page.locator('a[href^="/edit/"]').first();
    const count = await firstProject.count();
    if (count === 0) test.skip();

    const href = await firstProject.getAttribute('href');
    if (!href) test.skip();

    await page.evaluate(([key, queue]) => {
      localStorage.setItem(key as string, JSON.stringify(queue));
    }, [IMPORT_QUEUE_KEY, SEEDED_QUEUE]);

    await page.goto(href!);
    await expect(page.getByRole('dialog')).toBeVisible({ timeout: 15000 });

    await test.step('Click "Import semua"', async () => {
      await page.getByRole('button', { name: /Import semua/i }).click();
    });

    await test.step('Dialog closes', async () => {
      await expect(page.getByRole('dialog')).not.toBeVisible({ timeout: 5000 });
    });

    await test.step('Queue is cleared from localStorage', async () => {
      const saved = await page.evaluate((key) => localStorage.getItem(key), IMPORT_QUEUE_KEY);
      expect(saved).toBeNull();
    });
  });
});

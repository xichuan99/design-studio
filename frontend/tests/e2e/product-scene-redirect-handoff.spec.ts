import { test, expect } from '@playwright/test';

import { loginAsDemoUser } from './utils/auth';
import { getPublicFixturePath } from './utils/fixtures';
import { goToToolsHub } from './utils/tools';

// ---------------------------------------------------------------------------
// Shared preflight mock responses
// ---------------------------------------------------------------------------

const PREFLIGHT_BLOCK = {
  subject_type: 'human',
  confidence: 0.92,
  policy_action: 'block',
  reason_code: 'PS_BLOCK_HUMAN_OR_MIXED',
  reason:
    'Foto mengandung manusia atau campuran objek. Product Scene hanya untuk produk tanpa manusia.',
  recommended_tool: 'background_swap',
  allowed_tools: ['background_swap'],
};

const PREFLIGHT_ALLOW = {
  subject_type: 'product',
  confidence: 0.91,
  policy_action: 'allow',
  reason_code: 'PS_ALLOW_PRODUCT',
  reason: 'Foto terdeteksi sebagai produk. Silakan lanjutkan.',
  recommended_tool: 'product_scene',
  allowed_tools: ['product_scene'],
};

const PREFLIGHT_WARN = {
  subject_type: 'uncertain',
  confidence: 0.55,
  policy_action: 'warn',
  reason_code: 'PS_WARN_UNCERTAIN',
  reason: 'Foto kurang jelas — pastikan hanya berisi produk.',
  recommended_tool: 'product_scene',
  allowed_tools: ['product_scene', 'background_swap'],
};

// ---------------------------------------------------------------------------
// Helper: stub preflight endpoint on a given page
// ---------------------------------------------------------------------------

async function mockPreflight(
  page: Parameters<typeof test.step>[1] extends never ? never : import('@playwright/test').Page,
  response: object,
) {
  await page.route('**/tools/product-scene/preflight', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(response),
    }),
  );
}

async function mockUpload(page: import('@playwright/test').Page) {
  await page.route('**/designs/upload', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ url: 'https://example.com/before-product.png' }),
    }),
  );
}

// ---------------------------------------------------------------------------
// Test Suite 1 — Product Scene blocked state UI
// ---------------------------------------------------------------------------

test.describe('Product Scene — human photo blocked state', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsDemoUser(page);
    await goToToolsHub(page);
  });

  test('shows blocked banner and CTA button when preflight returns block', async ({ page }) => {
    await mockUpload(page);
    await mockPreflight(page, PREFLIGHT_BLOCK);

    await test.step('Navigate to Product Scene', async () => {
      await page.getByRole('link', { name: /AI Product Scene/i }).click();
      await expect(page.getByRole('heading', { name: 'AI Product Scene', exact: true })).toBeVisible();
    });

    await test.step('Upload a human photo — preflight fires automatically', async () => {
      await page.locator('input[type="file"]').setInputFiles(getPublicFixturePath('before-product.png'));
      await expect(page.getByRole('heading', { name: '2. Pengaturan Tampilan' })).toBeVisible();
    });

    await test.step('Blocked banner is visible with redirect CTA', async () => {
      // Reason text from backend
      await expect(
        page.getByText(/Foto mengandung manusia/i),
      ).toBeVisible();
      // CTA button
      await expect(
        page.getByRole('button', { name: /Lanjut ke Background Swap/i }),
      ).toBeVisible();
    });

    await test.step('Generate button still renders (clicking it also triggers redirect)', async () => {
      // The button is not visually disabled for blocked state —
      // clicking it calls handleGenerate which internally redirects instead of generating.
      const generateBtn = page.getByRole('button', { name: /Buat Foto Produk/i });
      await expect(generateBtn).toBeVisible();
    });
  });

  test('shows warn banner but generate button stays enabled when preflight returns warn', async ({ page }) => {
    await mockUpload(page);
    await mockPreflight(page, PREFLIGHT_WARN);

    await test.step('Navigate and upload', async () => {
      await page.getByRole('link', { name: /AI Product Scene/i }).click();
      await page.locator('input[type="file"]').setInputFiles(getPublicFixturePath('before-product.png'));
      await expect(page.getByRole('heading', { name: '2. Pengaturan Tampilan' })).toBeVisible();
    });

    await test.step('Warn banner is visible, generate stays enabled', async () => {
      await expect(page.getByText(/Foto kurang jelas/i)).toBeVisible();
      // CTA redirect button should NOT appear for warn — only for block
      await expect(
        page.getByRole('button', { name: /Lanjut ke Background Swap/i }),
      ).not.toBeVisible();
      // Generate is still available
      await expect(page.getByRole('button', { name: /Buat Foto Produk/i })).toBeEnabled();
    });
  });

  test('no banner and generate enabled when preflight returns allow', async ({ page }) => {
    await mockUpload(page);
    await mockPreflight(page, PREFLIGHT_ALLOW);

    await test.step('Navigate and upload', async () => {
      await page.getByRole('link', { name: /AI Product Scene/i }).click();
      await page.locator('input[type="file"]').setInputFiles(getPublicFixturePath('before-product.png'));
      await expect(page.getByRole('heading', { name: '2. Pengaturan Tampilan' })).toBeVisible();
    });

    await test.step('No block/warn banner, generate enabled', async () => {
      await expect(
        page.getByRole('button', { name: /Lanjut ke Background Swap/i }),
      ).not.toBeVisible();
      await expect(page.getByRole('button', { name: /Buat Foto Produk/i })).toBeEnabled();
    });
  });
});

// ---------------------------------------------------------------------------
// Test Suite 2 — Redirect and sessionStorage handoff write
// ---------------------------------------------------------------------------

test.describe('Product Scene — redirect writes sessionStorage handoff', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsDemoUser(page);
    await goToToolsHub(page);
  });

  test('clicking CTA writes handoff to sessionStorage and navigates to Background Swap', async ({ page }) => {
    await mockUpload(page);
    await mockPreflight(page, PREFLIGHT_BLOCK);

    await test.step('Navigate and upload a human photo', async () => {
      await page.getByRole('link', { name: /AI Product Scene/i }).click();
      await page.locator('input[type="file"]').setInputFiles(getPublicFixturePath('before-product.png'));
      await expect(page.getByRole('button', { name: /Lanjut ke Background Swap/i })).toBeVisible();
    });

    await test.step('Click CTA and check navigation URL', async () => {
      await page.getByRole('button', { name: /Lanjut ke Background Swap/i }).click();
      await expect(page).toHaveURL(/\/tools\/background-swap/);
    });

    await test.step('sessionStorage key is cleared after handoff is consumed', async () => {
      // After Background Swap mounts and consumes the handoff, the key must be gone
      const remaining = await page.evaluate(() =>
        sessionStorage.getItem('product_scene_redirect_file_v1'),
      );
      expect(remaining).toBeNull();
    });
  });
});

// ---------------------------------------------------------------------------
// Test Suite 3 — Background Swap restores file from sessionStorage handoff
// ---------------------------------------------------------------------------

test.describe('Background Swap — restores file from Product Scene handoff', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsDemoUser(page);
    await goToToolsHub(page);
  });

  test('auto-loads file and jumps to step 2 when handoff key present in sessionStorage', async ({ page }) => {
    await mockUpload(page);

    // Inject the handoff payload into sessionStorage before navigating
    await test.step('Seed sessionStorage with redirect handoff payload', async () => {
      // Navigate somewhere in the app first so sessionStorage is scoped to the origin
      await page.goto('/tools');

      // Build a minimal 1×1 white JPEG as a data URL (base64)
      const minimalJpegBase64 =
        '/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/2wBDAQkJCQwLDBgNDRgyIRwhMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjL/wAARCAABAAEDASIAAhEBAxEB/8QAFgABAQEAAAAAAAAAAAAAAAAABgUEA/8QAIRAAAQMEAgMAAAAAAAAAAAAAAQIDBAAFERIxIUH/xAAUAQEAAAAAAAAAAAAAAAAAAAAA/8QAFBEBAAAAAAAAAAAAAAAAAAAAAP/aAAwDAQACEQMRAD8Amz6lbXNlcpBHGC4ZgSxwAPcmiF9qF1FdPFHMdqg5BFFFAf/Z';

      const payload = JSON.stringify({
        name: 'before-product.png',
        type: 'image/jpeg',
        data_url: `data:image/jpeg;base64,${minimalJpegBase64}`,
      });

      await page.evaluate((value) => {
        sessionStorage.setItem('product_scene_redirect_file_v1', value);
      }, payload);
    });

    await test.step('Navigate to Background Swap — should auto-skip to step 2', async () => {
      await page.goto('/tools/background-swap');
      await expect(
        page.getByRole('heading', { name: '2. Tentukan Suasana Baru' }),
      ).toBeVisible({ timeout: 10000 });
    });

    await test.step('Toast confirmation is shown', async () => {
      await expect(
        page.getByText(/File dari Product Scene sudah dipindahkan/i),
      ).toBeVisible();
    });

    await test.step('sessionStorage key is cleared after consumption', async () => {
      const remaining = await page.evaluate(() =>
        sessionStorage.getItem('product_scene_redirect_file_v1'),
      );
      expect(remaining).toBeNull();
    });
  });

  test('stays on step 1 when no handoff key in sessionStorage', async ({ page }) => {
    await test.step('Navigate directly without seeded handoff', async () => {
      await page.goto('/tools/background-swap');
      // Step 1 upload UI should still be visible
      await expect(page.locator('input[type="file"]')).toBeVisible();
      await expect(
        page.getByRole('heading', { name: '2. Tentukan Suasana Baru' }),
      ).not.toBeVisible();
    });
  });

  test('stays on step 1 when handoff payload is malformed', async ({ page }) => {
    await test.step('Seed malformed payload and navigate', async () => {
      await page.goto('/tools');
      await page.evaluate(() => {
        sessionStorage.setItem('product_scene_redirect_file_v1', '{bad json: !}');
      });
      await page.goto('/tools/background-swap');
    });

    await test.step('Step 1 upload UI is still visible', async () => {
      await expect(page.locator('input[type="file"]')).toBeVisible();
      await expect(
        page.getByRole('heading', { name: '2. Tentukan Suasana Baru' }),
      ).not.toBeVisible();
    });

    await test.step('sessionStorage key is cleared after failed parse', async () => {
      const remaining = await page.evaluate(() =>
        sessionStorage.getItem('product_scene_redirect_file_v1'),
      );
      expect(remaining).toBeNull();
    });
  });
});

// ---------------------------------------------------------------------------
// Test Suite 4 — Full end-to-end redirect flow (Product Scene → Background Swap)
// ---------------------------------------------------------------------------

test.describe('Product Scene → Background Swap full redirect flow', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsDemoUser(page);
    await goToToolsHub(page);
  });

  test('human photo blocked in Product Scene carries over to Background Swap step 2', async ({
    page,
  }) => {
    test.setTimeout(60000);
    await mockUpload(page);
    await mockPreflight(page, PREFLIGHT_BLOCK);

    await test.step('Open Product Scene and upload human photo', async () => {
      await page.getByRole('link', { name: /AI Product Scene/i }).click();
      await page.locator('input[type="file"]').setInputFiles(getPublicFixturePath('before-product.png'));
      await expect(page.getByRole('button', { name: /Lanjut ke Background Swap/i })).toBeVisible();
    });

    await test.step('Click CTA — navigates to Background Swap', async () => {
      await page.getByRole('button', { name: /Lanjut ke Background Swap/i }).click();
      await expect(page).toHaveURL(/\/tools\/background-swap/);
    });

    await test.step('Background Swap auto-loaded the file and shows step 2', async () => {
      await expect(
        page.getByRole('heading', { name: '2. Tentukan Suasana Baru' }),
      ).toBeVisible({ timeout: 10000 });
    });

    await test.step('Toast is visible and sessionStorage cleaned up', async () => {
      await expect(
        page.getByText(/File dari Product Scene sudah dipindahkan/i),
      ).toBeVisible();
      const remaining = await page.evaluate(() =>
        sessionStorage.getItem('product_scene_redirect_file_v1'),
      );
      expect(remaining).toBeNull();
    });
  });
});

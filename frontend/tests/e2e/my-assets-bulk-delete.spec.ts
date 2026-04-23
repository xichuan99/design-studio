import { test, expect, type Page, type Route } from '@playwright/test';

type ToolResult = {
  id: string;
  tool_name: string;
  result_url: string;
  input_summary: string;
  file_size: number;
  created_at: string;
};

type GenerationResult = {
  id: string;
  project_id: string | null;
  result_url: string;
  visual_prompt: string | null;
  raw_text: string | null;
  seed: string | null;
  created_at: string;
};

async function fulfillJson(route: Route, data: unknown, status = 200) {
  await route.fulfill({
    status,
    contentType: 'application/json',
    body: JSON.stringify(data),
  });
}

async function setupAssetsMocks(
  page: Page,
  options?: {
    failedToolDeleteIds?: string[];
    failedGenerationDeleteIds?: string[];
  }
) {
  const failedToolDeleteIds = new Set(options?.failedToolDeleteIds ?? []);
  const failedGenerationDeleteIds = new Set(options?.failedGenerationDeleteIds ?? []);

  const toolResults: ToolResult[] = [
    {
      id: 'tool-1',
      tool_name: 'retouch',
      result_url: 'https://example.com/tool-1.jpg',
      input_summary: 'Mock Tool One',
      file_size: 12345,
      created_at: '2026-04-24T10:00:00Z',
    },
    {
      id: 'tool-2',
      tool_name: 'background_swap',
      result_url: 'https://example.com/tool-2.jpg',
      input_summary: 'Mock Tool Two',
      file_size: 23456,
      created_at: '2026-04-24T11:00:00Z',
    },
  ];

  const generations: GenerationResult[] = [
    {
      id: 'gen-1',
      project_id: null,
      result_url: 'https://example.com/gen-1.jpg',
      visual_prompt: 'prompt one',
      raw_text: 'Mock Generation One',
      seed: '1',
      created_at: '2026-04-24T12:00:00Z',
    },
    {
      id: 'gen-2',
      project_id: null,
      result_url: 'https://example.com/gen-2.jpg',
      visual_prompt: 'prompt two',
      raw_text: 'Mock Generation Two',
      seed: '2',
      created_at: '2026-04-24T13:00:00Z',
    },
  ];

  await page.route('**/api/auth/session', async (route) => {
    await fulfillJson(route, {
      user: {
        name: 'Demo User',
        email: 'demo@example.com',
      },
      expires: '2099-01-01T00:00:00.000Z',
      accessToken: 'mock-token',
    });
  });

  await page.route('**/folders*', async (route) => {
    await fulfillJson(route, []);
  });

  await page.route('**/tools/my-results**', async (route) => {
    await fulfillJson(route, toolResults);
  });

  await page.route('**/designs/my-generations**', async (route) => {
    await fulfillJson(route, generations);
  });

  await page.route('**/tools/results/**', async (route) => {
    const id = route.request().url().split('/').pop() ?? '';
    if (failedToolDeleteIds.has(id)) {
      await route.fulfill({ status: 500, contentType: 'application/json', body: JSON.stringify({ detail: 'error' }) });
      return;
    }

    const index = toolResults.findIndex((item) => item.id === id);
    if (index >= 0) toolResults.splice(index, 1);
    await route.fulfill({ status: 204, body: '' });
  });

  await page.route('**/designs/jobs/**', async (route) => {
    const id = route.request().url().split('/').pop() ?? '';
    if (failedGenerationDeleteIds.has(id)) {
      await route.fulfill({ status: 500, contentType: 'application/json', body: JSON.stringify({ detail: 'error' }) });
      return;
    }

    const index = generations.findIndex((item) => item.id === id);
    if (index >= 0) generations.splice(index, 1);
    await route.fulfill({ status: 204, body: '' });
  });
}

test.describe('My Assets Bulk Delete', () => {
  test('tools tab supports partial-success bulk delete with visible selection state', async ({ page }) => {
    await setupAssetsMocks(page, { failedToolDeleteIds: ['tool-2'] });

    await page.goto('/my-assets');
    await expect(page.getByRole('heading', { name: /Aset AI Saya/i })).toBeVisible();

    await test.step('Enable selection mode and select all visible tool assets', async () => {
      await page.getByRole('button', { name: /^Pilih$/i }).click();
      await page.getByRole('button', { name: /Pilih Semua Terlihat/i }).click();
      await expect(page.getByText('2 terpilih')).toBeVisible();
    });

    await test.step('Run bulk delete and verify partial success result', async () => {
      page.once('dialog', async (dialog) => {
        await dialog.accept();
      });

      await page.getByRole('button', { name: /Hapus Terpilih/i }).click();
      await expect(page.getByText(/1 aset terhapus, 1 aset gagal dihapus\./i)).toBeVisible();
      await expect(page.getByText('Mock Tool One')).toHaveCount(0);
      await expect(page.getByText('Mock Tool Two')).toBeVisible();
      await expect(page.getByText('1 terpilih')).toBeVisible();
    });
  });

  test('generations tab supports successful bulk delete', async ({ page }) => {
    await setupAssetsMocks(page);

    await page.goto('/my-assets');
    await expect(page.getByRole('heading', { name: /Aset AI Saya/i })).toBeVisible();

    await test.step('Switch to generations tab and select all visible items', async () => {
      await page.getByRole('button', { name: /Hasil Visual/i }).click();
      await page.getByRole('button', { name: /^Pilih$/i }).click();
      await page.getByRole('button', { name: /Pilih Semua Terlihat/i }).click();
      await expect(page.getByText('2 terpilih')).toBeVisible();
    });

    await test.step('Delete selected generations and verify success state', async () => {
      page.once('dialog', async (dialog) => {
        await dialog.accept();
      });

      await page.getByRole('button', { name: /Hapus Terpilih/i }).click();
      await expect(page.getByText(/2 aset berhasil dihapus\./i)).toBeVisible();
      await expect(page.getByText('Mock Generation One')).toHaveCount(0);
      await expect(page.getByText('Mock Generation Two')).toHaveCount(0);
      await expect(page.getByRole('button', { name: /^Pilih$/i })).toBeVisible();
    });
  });
});

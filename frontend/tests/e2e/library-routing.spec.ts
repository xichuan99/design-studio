import { test, expect, type Page, type Route } from '@playwright/test';

type ProjectResult = {
  id: string;
  title: string;
  updated_at: string;
  created_at?: string;
  aspect_ratio?: string;
  status?: string;
  canvas_schema_version?: number;
  canvas_state?: { backgroundUrl?: string; elements?: Record<string, unknown>[] };
  folder_id?: string | null;
};

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

async function setupLibraryMocks(page: Page) {
  const projects: ProjectResult[] = [
    {
      id: 'proj-1',
      title: 'Promo Produk Utama',
      updated_at: '2026-04-26T08:00:00Z',
      aspect_ratio: '1:1',
      canvas_state: { elements: [] },
      folder_id: null,
    },
    {
      id: 'proj-2',
      title: 'Campaign Lain',
      updated_at: '2026-04-25T08:00:00Z',
      aspect_ratio: '4:5',
      canvas_state: { elements: [] },
      folder_id: null,
    },
  ];

  const toolResults: ToolResult[] = [
    {
      id: 'tool-1',
      tool_name: 'retouch',
      result_url: 'https://example.com/tool-1.jpg',
      input_summary: 'Mock Tool One',
      file_size: 123,
      created_at: '2026-04-26T09:00:00Z',
    },
  ];

  const generations: GenerationResult[] = [
    {
      id: 'gen-linked',
      project_id: 'proj-1',
      result_url: 'https://example.com/gen-linked.jpg',
      visual_prompt: 'linked prompt',
      raw_text: 'Mock Generation Linked',
      seed: '100',
      created_at: '2026-04-26T10:00:00Z',
    },
    {
      id: 'gen-unrelated',
      project_id: 'proj-2',
      result_url: 'https://example.com/gen-unrelated.jpg',
      visual_prompt: 'unrelated prompt',
      raw_text: 'Mock Generation Unrelated',
      seed: '200',
      created_at: '2026-04-26T11:00:00Z',
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

  await page.route('**/projects/**', async (route) => {
    await fulfillJson(route, projects);
  });

  await page.route('**/tools/my-results**', async (route) => {
    await fulfillJson(route, toolResults);
  });

  await page.route('**/designs/my-generations**', async (route) => {
    await fulfillJson(route, generations);
  });
}

test.describe('Library Routing and Deep Link', () => {
  test('redirects legacy project route to canonical Library route', async ({ page }) => {
    await setupLibraryMocks(page);

    await page.goto('/projects');
    await expect(page).toHaveURL(/\/library\?tab=projects/);
    await expect(page.getByRole('heading', { name: /Library/i })).toBeVisible();
    await expect(page.getByRole('tab', { name: 'Projects' })).toHaveAttribute('data-state', 'active');
  });

  test('redirects legacy assets route to canonical Library route', async ({ page }) => {
    await setupLibraryMocks(page);

    await page.goto('/my-assets');
    await expect(page).toHaveURL(/\/library\?tab=assets/);
    await expect(page.getByRole('heading', { name: /Library/i })).toBeVisible();
    await expect(page.getByRole('tab', { name: 'Assets' })).toHaveAttribute('data-state', 'active');
  });

  test('preserves query params when redirecting legacy project route', async ({ page }) => {
    await setupLibraryMocks(page);

    await page.goto('/projects?folder_id=ws-1&search=Promo&sort=a-z');

    await expect(page).toHaveURL(/\/library\?/);
    await expect(page).toHaveURL(/tab=projects/);
    await expect(page).toHaveURL(/folder_id=ws-1/);
    await expect(page).toHaveURL(/search=Promo/);
    await expect(page).toHaveURL(/sort=a-z/);

    await expect(page.getByRole('tab', { name: 'Projects' })).toHaveAttribute('data-state', 'active');
    await expect(page.getByPlaceholder('Cari proyek...')).toHaveValue('Promo');
    await expect(page.getByRole('combobox', { name: 'Urutkan proyek' })).toHaveValue('a-z');
  });

  test('preserves query params when redirecting legacy assets route', async ({ page }) => {
    await setupLibraryMocks(page);

    await page.goto('/my-assets?folder_id=ws-2&asset_tab=generations&project_id=proj-1');

    await expect(page).toHaveURL(/\/library\?/);
    await expect(page).toHaveURL(/tab=assets/);
    await expect(page).toHaveURL(/folder_id=ws-2/);
    await expect(page).toHaveURL(/asset_tab=generations/);
    await expect(page).toHaveURL(/project_id=proj-1/);

    await expect(page.getByRole('tab', { name: 'Assets' })).toHaveAttribute('data-state', 'active');
    await expect(page.getByText(/Filter project aktif/i)).toBeVisible();
    await expect(page.getByText('Mock Generation Linked')).toBeVisible();
    await expect(page.getByText('Mock Generation Unrelated')).toHaveCount(0);
  });

  test('applies project deep-link state and can jump to related asset results', async ({ page }) => {
    await setupLibraryMocks(page);

    await page.goto('/library?tab=projects&search=Promo&sort=a-z');

    await expect(page.getByRole('tab', { name: 'Projects' })).toHaveAttribute('data-state', 'active');
    await expect(page.getByPlaceholder('Cari proyek...')).toHaveValue('Promo');
    await expect(page.getByRole('combobox', { name: 'Urutkan proyek' })).toHaveValue('a-z');

    await expect(page.getByText('Promo Produk Utama')).toBeVisible();
    await expect(page.getByText('Campaign Lain')).toHaveCount(0);

    await page.getByRole('button', { name: 'Lihat Hasil Terkait' }).first().click();

    await expect(page).toHaveURL(/tab=assets/);
    await expect(page).toHaveURL(/asset_tab=generations/);
    await expect(page).toHaveURL(/project_id=proj-1/);

    await expect(page.getByRole('tab', { name: 'Assets' })).toHaveAttribute('data-state', 'active');
    await expect(page.getByText(/Filter project aktif/i)).toBeVisible();
    await expect(page.getByText('Mock Generation Linked')).toBeVisible();
    await expect(page.getByText('Mock Generation Unrelated')).toHaveCount(0);

    await page.getByRole('button', { name: /Tampilkan Semua/i }).click();
    await expect(page).not.toHaveURL(/project_id=/);
    await expect(page.getByText('Mock Generation Unrelated')).toBeVisible();
  });
});
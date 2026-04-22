import { test, expect } from '@playwright/test';

import { loginAsDemoUser } from './utils/auth';
import { goToToolsHub } from './utils/tools';

const TOOL_ROUTES = [
  { cardName: 'AI Background Swap', expectedHeading: 'AI Background Swap', expectedPath: '/tools/background-swap' },
  { cardName: 'AI Image Upscaler', expectedHeading: 'AI Image Upscaler', expectedPath: '/tools/upscaler' },
  { cardName: 'Quick Retouch', expectedHeading: 'Auto-Retouch & Color Correction', expectedPath: '/tools/retouch' },
  { cardName: 'AI Product Scene', expectedHeading: 'AI Product Scene', expectedPath: '/tools/product-scene' },
  { cardName: 'Batch Photo Processor', expectedHeading: 'Batch Photo Processor', expectedPath: '/tools/batch-process' },
  { cardName: 'ID Photo Maker', expectedHeading: 'ID Photo (Pasfoto) Maker', expectedPath: '/tools/id-photo' },
  { cardName: 'Magic Eraser', expectedHeading: 'Magic Eraser', expectedPath: '/tools/magic-eraser' },
  { cardName: 'Generative Expand', expectedHeading: 'Generative Expand', expectedPath: '/tools/generative-expand' },
  { cardName: 'AI Text Banner', expectedHeading: 'AI Text Banner', expectedPath: '/tools/text-banner' },
  { cardName: 'AI Watermark Placer', expectedHeading: 'AI Watermark Placer', expectedPath: '/tools/watermark-placer' },
] as const;

test.describe('Tools Hub Navigation', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsDemoUser(page);
    await goToToolsHub(page);
  });

  test('all tools cards route to the correct tool pages', async ({ page }) => {
    for (const tool of TOOL_ROUTES) {
      await test.step(`Open ${tool.cardName}`, async () => {
        await page.getByRole('link', { name: new RegExp(tool.cardName, 'i') }).click();

        await expect(page).toHaveURL(new RegExp(`${tool.expectedPath}$`));
        await expect(page.getByRole('heading', { name: tool.expectedHeading, exact: true })).toBeVisible();

        await goToToolsHub(page);
      });
    }
  });
});
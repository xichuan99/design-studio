import { test, expect } from '@playwright/test';
import path from 'path';

test.describe('AI Tools Flow Verification', () => {

  const dummyImageName = 'before-product.png';

  test.beforeEach(async ({ page }) => {
    // Navigate to tools hub
    await page.goto('/tools');
    
    // Ensure tools hub is loaded
    await expect(page.getByRole('heading', { name: 'AI Photo Tools' })).toBeVisible();
  });

  test('AI Background Swap - Upload, Process, and Result flow', async ({ page }) => {
    await test.step('Navigate to AI Background Swap', async () => {
      // Click the background swap card link
      await page.getByRole('link', { name: /AI Background Swap/i }).click();
      
      // Verify page destination
      await expect(page.getByRole('heading', { name: 'AI Background Swap', exact: true })).toBeVisible();
    });

    await test.step('Upload Image', async () => {
      // Find the isolated file input explicitly and upload
      const filePath = path.join(__dirname, '../../public', dummyImageName);
      await page.locator('input[type="file"]').setInputFiles(filePath);
      
      // Wait for step 2 rendering
      await expect(page.getByRole('heading', { name: '2. Tentukan Suasana Baru' })).toBeVisible();
      // Ensure image preview is visible
      await expect(page.getByRole('img', { name: 'Original' })).toBeVisible();
    });

    await test.step('Configure Prompt and Generate', async () => {
      // Switch from Suggestion to Custom Prompt Mode
      await page.getByRole('button', { name: /Tulis Sendiri/i }).click();
      
      // Fill the prompt input
      await page.getByRole('textbox').fill('Studio putih minimalis dengan alas kayu oak');
      
      // Click generate button
      await page.getByRole('button', { name: /Generate AI Background/i }).click();
    });

    await test.step('Verify Processing State', async () => {
      // The button text changes to loading state
      await expect(page.getByText(/Sedang Memproses AI.../i)).toBeVisible();
    });

    await test.step('Verify Final Result', async () => {
      // Wait for the final step to appear (AI generation can take up to 30-60 seconds in E2E environment)
      await expect(page.getByRole('heading', { name: 'Hasil Akhir' })).toBeVisible({ timeout: 60000 });
      
      // Verification of action items for the final result
      await expect(page.getByRole('button', { name: /Download HD/i })).toBeVisible();
      await expect(page.getByRole('button', { name: /Lanjut ke Editor/i })).toBeVisible();
    });
  });


  test('AI Image Upscaler - Upload, Process, and Result flow', async ({ page }) => {
    await test.step('Navigate to AI Image Upscaler', async () => {
      // Click the Upscaler card link
      await page.getByRole('link', { name: /AI Image Upscaler/i }).click();
      
      // Verify page destination
      await expect(page.getByRole('heading', { name: 'AI Image Upscaler', exact: true })).toBeVisible();
    });

    await test.step('Upload Image', async () => {
      // Upload dummy image
      await page.locator('input[type="file"]').setInputFiles(path.join(__dirname, '../../public', dummyImageName));
      
      // Wait for step 2 rendering
      await expect(page.getByRole('heading', { name: '2. Pilih Tingkat Upscale' })).toBeVisible();
    });

    await test.step('Configure Upscaler and Generate', async () => {
      // Ensure the "2x" option is available and click it
      await page.getByRole('button', { name: /2x/i }).click();
      
      // Click generate/upscale button to trigger confirmation
      await page.getByRole('button', { name: /Upscale & Enhance Gambar/i }).click();
      
      // A Credit Confirm Dialog should appear, wait for the 'Lanjutkan' action button
      await page.getByRole('button', { name: /Lanjutkan/i }).click();
    });

    await test.step('Verify Processing State', async () => {
      // The state changes to loading
      await expect(page.getByText(/Menjalankan AI Upscaler.../i)).toBeVisible();
    });

    await test.step('Verify Final Result', async () => {
      // Wait for the final phase
      await expect(page.getByRole('heading', { name: /Membandingkan/i })).toBeVisible({ timeout: 60000 });
      
      // Verification of action buttons
      await expect(page.getByRole('button', { name: /Download HD/i })).toBeVisible();
      await expect(page.getByRole('button', { name: /Lanjut ke Editor/i })).toBeVisible();
    });
  });

});

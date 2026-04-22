import { test, expect } from '@playwright/test';

import { loginAsDemoUser } from './utils/auth';

test.describe('Design Brief Interview', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsDemoUser(page);
  });

  test('renders the brief interview and keeps answer state in sync', async ({ page }) => {
    test.setTimeout(60000);

    await test.step('Seed a deterministic saved brief state', async () => {
      await page.evaluate(() => {
        localStorage.setItem(
          'smartdesign_create_state',
          JSON.stringify({
            rawText: 'Poster promo kopi susu untuk Instagram',
            aspectRatio: '1:1',
            currentStep: 'brief',
            createMode: 'generate',
            redesignStrength: 0.65,
            parsedData: null,
            imageHistory: [],
            activeImageIndex: 0,
            integratedText: false,
            briefQuestions: [
              {
                id: 'goal',
                question: 'Apa tujuan utama dari desain ini?',
                type: 'choice',
                options: ['Promosi Diskon', 'Peluncuran Produk', 'Konten Edukasi'],
              },
              {
                id: 'tone',
                question: 'Nuansa visual seperti apa yang Anda inginkan?',
                type: 'text',
              },
            ],
            briefAnswers: {},
            removeProductBg: false,
            copyVariations: [],
            userIntent: 'content_from_text',
          })
        );
      });

      await page.goto('/create');
    });

    await test.step('Open the brief interview and interact with it', async () => {
      await expect(page.getByRole('heading', { name: /Mari Perjelas Visi Anda/i })).toBeVisible({ timeout: 15000 });
      await expect(page.getByText(/pertanyaan terisi/i)).toBeVisible();
      await page.getByRole('button', { name: 'Promosi Diskon' }).click();
      await page.getByRole('textbox', { name: /Ketik jawaban Anda di sini/i }).fill('Hangat, premium, dan cocok untuk promo sore hari.');

      await expect(page.getByText('2/2 pertanyaan terisi')).toBeVisible();
      await expect(page.getByRole('button', { name: /Lanjutkan ke Arahan Visual/i })).toBeVisible();
      await expect(page.getByRole('button', { name: /Kembali ke Brief/i })).toBeVisible();
    });
  });
});
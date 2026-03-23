---
name: playwright-generate-test
description: 'Generate a Playwright TypeScript E2E test for a given scenario. Navigates the app step-by-step, uses role-based locators, and saves the test in tests/e2e/.'
---

## Goal

Generate a Playwright test based on a user-provided scenario. If no scenario is provided, ask for one first.

## Rules

- **Do NOT** generate test code prematurely — run the actual steps first using Playwright MCP tools.
- Use `@playwright/test` with TypeScript.
- Save all test files in `frontend/tests/e2e/`.
- Name files `<feature>.spec.ts` (e.g., `auth.spec.ts`, `editor.spec.ts`).
- Execute the generated test and iterate until it passes.

## Locator Priority (do not use CSS class or XPath)

1. `getByRole()`
2. `getByLabel()`
3. `getByText()`
4. `getByPlaceholder()`
5. `getByTestId()` — only when semantic locators aren't possible

## Assertion Rules

- Use web-first assertions: `await expect(locator).toHaveText()`, `toHaveURL()`, `toBeEnabled()`.
- **Never** use `waitForTimeout()`.
- Rely on Playwright's built-in auto-waiting.

## Test Structure Template

```typescript
import { test, expect } from '@playwright/test';

test.describe('Feature Name', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/path');
  });

  test('Feature - specific scenario', async ({ page }) => {
    await test.step('Action description', async () => {
      // interact
    });

    await test.step('Verify result', async () => {
      await expect(page.getByRole('heading', { name: 'Expected Title' })).toBeVisible();
    });
  });
});
```

## Steps to Follow

1. Navigate to the relevant page.
2. Observe the DOM and identify accessible elements.
3. Perform each action in the scenario using MCP tools.
4. Record selectors and assertions from actual observation.
5. Generate the TypeScript test from observed session.
6. Run `npx playwright test tests/e2e/<feature>.spec.ts`.
7. Fix and re-run until green.

Source: [github/awesome-copilot — playwright-generate-test](https://github.com/github/awesome-copilot/tree/main/skills/playwright-generate-test)

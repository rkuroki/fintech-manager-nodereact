import { test, expect } from '@playwright/test';

// Helper: login as manager (has CUSTOMERS_READ permission)
async function loginAsManager(page: import('@playwright/test').Page) {
  await page.goto('/login');
  await page.getByPlaceholder('your@email.com').fill('manager@example.com');
  await page.getByPlaceholder('Password').fill('Manager123!');
  await page.getByRole('button', { name: 'Sign In' }).click();
  await expect(page).toHaveURL('/dashboard');
}

test.describe('Customers', () => {
  test('manager can view customers list', async ({ page }) => {
    await loginAsManager(page);
    await page.click('text=Customers');
    await expect(page).toHaveURL('/customers');
    await expect(page.getByText('Customers')).toBeVisible();
  });

  test('manager can view customer detail', async ({ page }) => {
    await loginAsManager(page);
    await page.goto('/customers');

    // Click the first customer view button
    await page.locator('[title="View"]').first().click();
    await expect(page).toHaveURL(/\/customers\/.+/);
    await expect(page.getByText('Full Name')).toBeVisible();
  });

  test('manager can see sensitive data (decrypted)', async ({ page }) => {
    await loginAsManager(page);
    await page.goto('/customers');
    await page.locator('[title="View"]').first().click();

    // Tax ID field should have reveal button (manager has READ_SENSITIVE)
    await expect(page.getByText('Tax ID')).toBeVisible();
    // The reveal button should be present
    await expect(page.locator('[data-icon="eye"]').first()).toBeVisible();
  });

  test('analyst cannot see sensitive data reveal button', async ({ page }) => {
    await page.goto('/login');
    await page.getByPlaceholder('your@email.com').fill('analyst@example.com');
    await page.getByPlaceholder('Password').fill('Analyst123!');
    await page.getByRole('button', { name: 'Sign In' }).click();

    await page.goto('/customers');
    await page.locator('[title="View"]').first().click();

    // Analyst should see "Restricted" instead of reveal button
    await expect(page.getByText('Restricted').first()).toBeVisible();
    await expect(page.locator('[data-icon="eye"]')).toHaveCount(0);
  });
});

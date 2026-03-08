import { test, expect } from '@playwright/test';

test.describe('Authentication', () => {
  test.beforeEach(async ({ page }) => {
    // Start each test fresh
    await page.goto('/login');
  });

  test('shows login form', async ({ page }) => {
    await expect(page.getByText('Investor Backoffice')).toBeVisible();
    await expect(page.getByPlaceholder('your@email.com')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Sign In' })).toBeVisible();
  });

  test('admin can log in and sees Users menu', async ({ page }) => {
    await page.getByPlaceholder('your@email.com').fill('admin@example.com');
    await page.getByPlaceholder('Password').fill('Admin123!');
    await page.getByRole('button', { name: 'Sign In' }).click();

    await expect(page).toHaveURL('/dashboard');
    await expect(page.getByText('Users')).toBeVisible();
    await expect(page.getByText('Customers')).toBeVisible();
  });

  test('non-admin cannot see Users menu', async ({ page }) => {
    await page.getByPlaceholder('your@email.com').fill('analyst@example.com');
    await page.getByPlaceholder('Password').fill('Analyst123!');
    await page.getByRole('button', { name: 'Sign In' }).click();

    await expect(page).toHaveURL('/dashboard');
    // Analysts don't have admin access so Users menu item should not appear
    await expect(page.getByText('Users')).not.toBeVisible();
  });

  test('shows error for invalid credentials', async ({ page }) => {
    await page.getByPlaceholder('your@email.com').fill('wrong@example.com');
    await page.getByPlaceholder('Password').fill('wrongpass');
    await page.getByRole('button', { name: 'Sign In' }).click();

    await expect(page.getByText('Invalid email or password')).toBeVisible();
    await expect(page).toHaveURL('/login');
  });

  test('redirects to login when not authenticated', async ({ page }) => {
    await page.goto('/dashboard');
    await expect(page).toHaveURL('/login');
  });
});

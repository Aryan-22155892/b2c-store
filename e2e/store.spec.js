const { test, expect } = require('@playwright/test');

test('user can browse, login, add to cart, checkout, and see purchase history', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: /browse products/i })).toBeVisible();

  await page.getByRole('button', { name: 'Login' }).click();
  await page.getByLabel('Email').fill('user@store.com');
  await page.getByLabel('Password').fill('user123');
  await page.getByRole('button', { name: /^login$/i }).click();

  await expect(page.getByText(/Test User/i)).toBeVisible();
  await page.getByLabel(/Add Wireless Headphones to cart/i).click();
  await expect(page.getByText(/Added to cart/i)).toBeVisible();

  await page.getByRole('button', { name: /Cart/i }).click();
  await expect(page.getByRole('heading', { name: /Shopping Cart/i })).toBeVisible();
  await page.getByRole('button', { name: /Complete purchase/i }).click();
  await expect(page.getByText(/Payment successful/i)).toBeVisible();

  await page.getByRole('button', { name: /Purchase History/i }).click();
  await expect(page.getByRole('heading', { name: /Purchase History/i })).toBeVisible();
  await expect(page.getByText(/Wireless Headphones/i)).toBeVisible();
});

test('admin can view dashboard and product management', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Login' }).click();
  await page.getByLabel('Email').fill('admin@store.com');
  await page.getByLabel('Password').fill('admin123');
  await page.getByRole('button', { name: /^login$/i }).click();

  await page.getByRole('button', { name: /Admin Dashboard/i }).click();
  await expect(page.getByRole('heading', { name: /Admin Dashboard/i })).toBeVisible();
  await expect(page.getByRole('heading', { name: /Add product|Edit product/i })).toBeVisible();
  await expect(page.getByRole('button', { name: /Purchase Records/i })).toBeVisible();
});

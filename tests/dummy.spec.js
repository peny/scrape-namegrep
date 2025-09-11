// Dummy test file to satisfy Playwright configuration
const { test, expect } = require('@playwright/test');

test('dummy test', async ({ page }) => {
  // This is a dummy test to ensure Playwright configuration works
  // It doesn't actually test anything, just satisfies the config requirement
  await page.goto('data:text/html,<html><body><h1>Test</h1></body></html>');
  await expect(page.locator('h1')).toHaveText('Test');
});

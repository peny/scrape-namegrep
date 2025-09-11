// Playwright configuration for production deployment
const { defineConfig, devices } = require('@playwright/test');

module.exports = defineConfig({
  // Test directory (not used for our scraper, but required for config)
  testDir: './tests',
  
  // Global settings
  timeout: 30000,
  retries: 0,
  
  // Reporter settings
  reporter: 'list',
  
  // Use chromium browser
  projects: [
    {
      name: 'chromium',
      use: { 
        ...devices['Desktop Chrome'],
        headless: true
      },
    },
  ],
  
  // Global setup
  globalSetup: undefined,
  globalTeardown: undefined,
  
  // Web server settings (not used)
  webServer: undefined,
});

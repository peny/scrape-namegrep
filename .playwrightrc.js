// Playwright configuration for Render deployment
module.exports = {
  // Use chromium browser
  projects: [
    {
      name: 'chromium',
      use: { 
        ...require('@playwright/test').devices['Desktop Chrome'],
        headless: true
      },
    },
  ],
  
  // Global settings
  globalSetup: undefined,
  globalTeardown: undefined,
  
  // Timeout settings
  timeout: 30000,
  
  // Retry settings
  retries: 0,
  
  // Reporter settings
  reporter: 'list',
  
  // Test settings
  testDir: undefined,
  testMatch: undefined,
};

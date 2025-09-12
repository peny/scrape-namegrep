#!/usr/bin/env node

// Check if Playwright browser is installed before starting the API-only server
const { execSync } = require('child_process');

console.log('🔍 Checking Playwright browser installation for API service...');

try {
  // Try to find the browser executable
  const { chromium } = require('playwright');
  
  // Check if we can launch the browser
  console.log('✅ Playwright browser found, starting API server...');
  require('./api-only.js');
  
} catch (error) {
  if (error.message.includes('Executable doesn\'t exist')) {
    console.log('❌ Browser not found, installing...');
    
    try {
      execSync('npx playwright install chromium', { stdio: 'inherit' });
      console.log('✅ Browser installed successfully, starting API server...');
      require('./api-only.js');
    } catch (installError) {
      console.error('❌ Failed to install browser:', installError.message);
      console.log('🚀 Starting API server anyway (will install browser on first use)...');
      require('./api-only.js');
    }
  } else {
    console.error('❌ Unexpected error:', error.message);
    console.log('🚀 Starting API server anyway...');
    require('./api-only.js');
  }
}

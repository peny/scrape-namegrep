#!/usr/bin/env node

// This file redirects to the API server
// This prevents Render from accidentally running the old scraper directly

console.log('⚠️  This file has been redirected to the API server');
console.log('🚀 Starting NameGrep API server instead...');

// Start the API server
require('./api.js');

#!/usr/bin/env node

// Main entry point for the NameGrep Scraper API
// This ensures Render always starts the API server, not the scraper directly

console.log('🚀 Starting NameGrep Scraper API...');
console.log('📍 Node.js version:', process.version);
console.log('🌍 Environment:', process.env.NODE_ENV || 'development');
console.log('📁 Working directory:', process.cwd());
console.log('🎯 Starting API server...');

// Start the API server
require('./api.js');

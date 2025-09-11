#!/usr/bin/env node

// This file ensures that the API server starts correctly
// regardless of how the application is launched

console.log('Starting NameGrep API Server...');
console.log('Node.js version:', process.version);
console.log('Environment:', process.env.NODE_ENV || 'development');

// Import and start the API server
require('./api.js');

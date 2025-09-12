#!/usr/bin/env node

// API-only server - no frontend serving
// This is used for the separate API service on Render

const express = require('express');
const cors = require('cors');
const { scrapeAvailableDomains } = require('./api-scraper');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// API endpoint to search for domains
app.post('/api/search-domains', async (req, res) => {
  try {
    const { regexPattern } = req.body;
    
    if (!regexPattern) {
      return res.status(400).json({ 
        error: 'regexPattern is required',
        message: 'Please provide a regex pattern to search for domains'
      });
    }

    console.log(`API request received for pattern: ${regexPattern}`);
    
    // Start scraping
    const domains = await scrapeAvailableDomains(regexPattern);
    
    console.log(`Found ${domains.length} domains for pattern: ${regexPattern}`);
    
    res.json({
      success: true,
      pattern: regexPattern,
      domains: domains,
      count: domains.length,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('API Error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to scrape domains',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// Root endpoint - just return API info
app.get('/', (req, res) => {
  res.json({
    service: 'NameGrep API',
    version: '1.0.0',
    endpoints: {
      'POST /api/search-domains': 'Search for available domains',
      'GET /api/health': 'Health check'
    },
    timestamp: new Date().toISOString()
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 NameGrep API server running on port ${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/api/health`);
  console.log(`🔍 API endpoint: http://localhost:${PORT}/api/search-domains`);
  console.log(`🌐 API info: http://localhost:${PORT}`);
});

module.exports = app;

const express = require('express');
const cors = require('cors');
const { scrapeAvailableDomains } = require('./api-scraper');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

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

// Serve the frontend
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 NameGrep API server running on http://localhost:${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/api/health`);
  console.log(`🔍 API endpoint: http://localhost:${PORT}/api/search-domains`);
  console.log(`🌐 Frontend: http://localhost:${PORT}`);
});

module.exports = app;

#!/bin/bash

# Start script for NameGrep Scraper API
# This ensures we always start the API server, not the scraper directly

echo "🚀 Starting NameGrep Scraper API..."
echo "📍 Node.js version: $(node --version)"
echo "🌍 Environment: ${NODE_ENV:-development}"
echo "📁 Working directory: $(pwd)"
echo "🎯 Starting API server..."

# Start the API server
exec node index.js

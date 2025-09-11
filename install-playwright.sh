#!/bin/bash

# Install Playwright browsers for deployment
echo "Installing Playwright browsers..."
npx playwright install --with-deps chromium

echo "Playwright installation complete!"
echo "You can now run your scraper with: node scraper.js"
#!/bin/bash

echo "🚀 Starting build process..."
echo "📍 Node.js version: $(node --version)"
echo "🌍 Environment: ${NODE_ENV:-development}"

echo "📦 Installing dependencies..."
npm install

if [ $? -ne 0 ]; then
    echo "❌ npm install failed"
    exit 1
fi

echo "🎭 Installing Playwright browsers..."
npx playwright install chromium

if [ $? -ne 0 ]; then
    echo "❌ Playwright browser installation failed"
    exit 1
fi

echo "✅ Build completed successfully!"
echo "🔍 Verifying browser installation..."
npx playwright install --dry-run chromium

echo "🎯 Ready to start!"

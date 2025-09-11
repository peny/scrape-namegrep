# NameGrep Scraper

A Node.js application that uses Playwright to scrape domain names from namegrep.com based on regex patterns.

## Features

- Headless browser automation using Playwright
- Regex-based domain search
- Extracts and filters domain names
- Saves results to text files
- Debug screenshot capability
- Multiple search approaches (form submission and direct URL)

## Installation

1. Install dependencies:
```bash
npm install
```

2. Install Playwright browsers:
```bash
npx playwright install chromium
```

## Usage

### 🌐 Web Frontend (Recommended)
```bash
npm run dev
```
Then open http://localhost:3000 in your browser

### 📡 API Server
```bash
npm run api
```
API endpoint: `POST http://localhost:3000/api/search-domains`

### 💻 Command Line Scrapers
```bash
# Original comprehensive scraper
node scraper.js "your-regex-pattern"

# Simple scraper for testing
node simple-scraper.js "your-regex-pattern"
```

### Examples

#### Web Frontend
- Open http://localhost:3000
- Enter regex pattern: `^pe.{2,3}a$` (preloaded)
- Click "Search Domains"
- View results, copy to clipboard, or download as TXT

#### API Usage
```bash
curl -X POST http://localhost:3000/api/search-domains \
  -H "Content-Type: application/json" \
  -d '{"regexPattern": "^pe.{2,3}a$"}'
```

#### Command Line
```bash
# Search for domains starting with "test"
node scraper.js "test.*"

# Search for domains containing "shop"
node scraper.js ".*shop.*"

# Search for domains ending with "app"
node scraper.js ".*app$"

# Search for domains with specific patterns
node scraper.js "tech.*[0-9]{3}"
```

## Output

### Web Frontend
- Interactive search form with regex input
- Real-time results display with domain cards
- Copy individual domains or all results to clipboard
- Download results as TXT file
- Responsive design for mobile and desktop

### API Response
```json
{
  "success": true,
  "pattern": "^pe.{2,3}a$",
  "domains": ["example1.com", "example2.com"],
  "count": 2,
  "timestamp": "2025-09-11T18:31:31.775Z"
}
```

### Command Line
- Display found domains in the console
- Save results to a timestamped text file (e.g., `domains_1703123456789.txt`)
- Show the total count of domains found
- Save debug screenshots for troubleshooting

## Files

- `api.js` - Express API server that serves the frontend and handles scraping requests
- `api-scraper.js` - Scraper optimized for API usage, filters for available .com domains
- `scraper.js` - Original standalone scraper with comprehensive functionality
- `simple-scraper.js` - Simplified version for basic testing
- `public/` - Frontend files (HTML, CSS, JS)
  - `index.html` - Main frontend interface
  - `styles.css` - Modern, responsive styling
  - `script.js` - Frontend JavaScript functionality
- `package.json` - Project dependencies
- `README.md` - This documentation

## Requirements

- Node.js (v14 or higher)
- Internet connection
- Playwright browser binaries

## Troubleshooting

### No Results Found
If the scraper returns no domains or only JavaScript-related results, this could indicate:

1. **Anti-bot protection**: The site might be detecting automated access
2. **JavaScript requirements**: The search might require specific JavaScript execution
3. **Site changes**: The website structure might have changed
4. **Rate limiting**: Too many requests might be blocked

### Debug Information
The scraper creates several debug files:
- `debug.png` - Initial page load
- `results.png` - After search attempt
- `after-trigger.png` - After JavaScript triggers
- `simple-debug.png` and `simple-results.png` - From simple scraper

Check these screenshots to see what the scraper is capturing.

### Alternative Approaches
If the main scraper doesn't work:
1. Try the simple scraper: `node simple-scraper.js "pattern"`
2. Check if the website is accessible in a regular browser
3. Verify the regex pattern syntax
4. Try different patterns to test functionality

## Notes

- The scraper respects website loading times and includes appropriate delays
- Results are automatically deduplicated and filtered for common false positives
- The application uses a realistic user agent to avoid detection
- Multiple search methods are attempted for better compatibility
- Screenshots are automatically saved for debugging purposes

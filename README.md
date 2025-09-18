# NameGrep Scraper

A Node.js application that scrapes domain names from namegrep.com using headless browser automation with Playwright. Features a beautiful Memphis design frontend with wavy borders and vibrant colors.

## 🎨 Features

- **Memphis Design Frontend**: Vibrant colors, wavy borders, and playful animations
- **Headless Browser Automation**: Uses Playwright to scrape namegrep.com
- **Regex-based Domain Search**: Support for complex regex patterns and user-friendly syntax
- **Interactive Web Interface**: Modern, responsive design with real-time results
- **Domain Filtering**: Automatically filters for available .com domains
- **Export Functionality**: Copy to clipboard or download as TXT file
- **Share Results**: Generate shareable links with hash-based URLs

## 🚀 Quick Start

### Installation

1. **Clone the repository:**
```bash
git clone https://github.com/peny/scrape-namegrep.git
cd scrape-namegrep
```

2. **Install dependencies:**
```bash
npm install
```

3. **Install Playwright browsers:**
```bash
npx playwright install chromium
```

### Usage

#### 🌐 Web Interface (Recommended)

Start the full-stack application (API + frontend on the same port):
```bash
npm start
```

Then open http://localhost:3000 in your browser.

#### 📡 API Only

Start just the API server:
```bash
npm run api
```

API endpoint: `POST http://localhost:3000/api/search-domains`

#### 💻 Command Line

Run the scraper directly:
```bash
# Basic scraper
node scraper-backup.js "your-regex-pattern"

# Simple scraper for testing
node simple-scraper.js "your-regex-pattern"
```

## 📖 Examples

### Web Interface

1. Open http://localhost:3000
2. Enter a regex pattern (e.g., `(konsonant)(vokal)(konsonant)are`)
3. Click "Search Domains"
4. View results, copy to clipboard, or download as TXT

### API Usage

```bash
curl -X POST http://localhost:3000/api/search-domains \
  -H "Content-Type: application/json" \
  -d '{"regexPattern": "test.*"}'
```

### Regex Patterns

The app supports both standard regex and user-friendly patterns:

#### Standard Regex
```bash
# Domains starting with "test"
test.*

# Domains ending with "app"
.*app$

# Domains with specific patterns
tech.*[0-9]{3}
```

#### User-friendly Patterns
```bash
# Consonant-vowel-consonant followed by "are"
(konsonant)(vokal)(konsonant)are

# Specific letter patterns
^pe[a-zA-Z]{2,3}a$
```

## 🎨 Memphis Design

The frontend features a vibrant Memphis design with:

- **Wavy borders** and **rounded corners**
- **Gradient backgrounds** with animated color shifts
- **Vibrant color palette** (pinks, blues, oranges, purples)
- **Playful animations** and **hover effects**
- **Responsive design** for mobile and desktop
- **Spinning hourglass** loading animation

## 📁 Project Structure

```
├── api.js                 # Express API server
├── api-scraper.js         # Main scraper with Playwright
├── scraper-backup.js      # Backup scraper implementation
├── simple-scraper.js      # Simplified scraper for testing
├── public/                # Frontend files
│   ├── index.html         # Main HTML page
│   ├── styles.css         # Memphis design CSS
│   └── script.js          # Frontend JavaScript
├── package.json           # Dependencies and scripts
└── README.md             # This file
```

## 🔧 Technical Details

### Browser Automation

The scraper uses Playwright to:
- Navigate to namegrep.com
- Fill in search forms
- Handle JavaScript-rendered content
- Extract domain results
- Handle anti-bot protection

### API Response Format

```json
{
  "success": true,
  "pattern": "test.*",
  "domains": ["example1.com", "example2.com"],
  "count": 2,
  "timestamp": "2025-09-14T07:31:09.440Z"
}
```

### Frontend Features

- **Real-time search** with loading animations
- **Domain cards** with click-to-copy functionality
- **Bulk operations** (copy all, download all)
- **Share links** with hash-based URLs
- **Error handling** with user-friendly messages
- **Responsive design** for all screen sizes

## 🚨 Current Limitations

⚠️ **Important**: namegrep.com has implemented anti-scraping measures:

- **AJAX endpoint limited**: Only returns count, not actual domains
- **Browser detection**: May block automated requests
- **Rate limiting**: Too many requests may be blocked

The scraper still works but may return fewer results than expected.

## 🛠️ Development

### Available Scripts

```bash
npm run dev          # Start full-stack app (API + Frontend)
npm run api          # Start API server only
npm run start:frontend # Start frontend only (port 3000)
npm test             # Run scraper backup
npm run build        # Install dependencies and browsers
```

### Environment Variables

- `PORT`: Server port (default: 3000)
- `NODE_ENV`: Environment (development/production)

## 📦 Deployment

### Render.com

1. Connect your GitHub repository to Render
2. API service (Node):
   - **Build Command**: `./build.sh`
   - **Start Command**: `npm run start:api`
   - **Environment**: Node.js 20
3. Frontend (Static Site):
   - Use `render-frontend.yaml` which defines a Static Site
   - **Publish Directory**: `public`
   - No build command needed
4. Frontend will call the API automatically using production URL logic in `public/script.js`.

### Other Platforms

Ensure Playwright browsers are installed:
```bash
npx playwright install chromium
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📄 License

MIT License - see LICENSE file for details.

## 🙏 Acknowledgments

- **namegrep.com** for providing the domain search service
- **Playwright** for browser automation
- **Express.js** for the API server
- **Memphis Design** inspiration for the vibrant UI

---

**Note**: This tool is for educational and research purposes. Please respect namegrep.com's terms of service and implement appropriate rate limiting in production use.
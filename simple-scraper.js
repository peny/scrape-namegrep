const { chromium } = require('playwright');

async function scrapeNameGrep(regexPattern) {
  console.log(`Starting scrape for pattern: ${regexPattern}`);
  
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
  });
  const page = await context.newPage();

  try {
    // Navigate to the site
    console.log('Loading namegrep.com...');
    await page.goto('https://namegrep.com', { waitUntil: 'networkidle', timeout: 30000 });
    
    // Take a screenshot for debugging
    await page.screenshot({ path: 'simple-debug.png', fullPage: true });
    console.log('Screenshot saved as simple-debug.png');
    
    // Try different approaches to search
    console.log('Attempting search...');
    
    // Method 1: Direct URL navigation
    const searchUrl = `https://namegrep.com/#${encodeURIComponent(regexPattern)}`;
    console.log(`Trying direct URL: ${searchUrl}`);
    await page.goto(searchUrl, { waitUntil: 'networkidle', timeout: 30000 });
    
    // Wait for content to load
    await page.waitForTimeout(5000);
    
    // Take screenshot after navigation
    await page.screenshot({ path: 'simple-results.png', fullPage: true });
    console.log('Results screenshot saved as simple-results.png');
    
    // Try to extract any domains from the page
    const domains = await page.evaluate(() => {
      const domains = [];
      const text = document.body.textContent || '';
      
      // Look for domain-like patterns
      const domainRegex = /\b[a-zA-Z0-9][a-zA-Z0-9.-]*\.[a-zA-Z]{2,}\b/g;
      const matches = text.match(domainRegex);
      
      if (matches) {
        matches.forEach(match => {
          // Filter out common false positives
          if (!match.includes('namegrep') && 
              !match.includes('jquery') && 
              !match.includes('github') && 
              !match.includes('google') && 
              !match.includes('mozilla') &&
              !match.includes('.js') &&
              !match.includes('.css') &&
              match.length > 4 && 
              match.length < 50) {
            domains.push(match.toLowerCase());
          }
        });
      }
      
      return [...new Set(domains)]; // Remove duplicates
    });
    
    console.log(`Found ${domains.length} potential domains:`);
    domains.forEach((domain, index) => {
      console.log(`${index + 1}. ${domain}`);
    });
    
    return domains;
    
  } catch (error) {
    console.error('Error during scraping:', error);
    return [];
  } finally {
    await browser.close();
  }
}

// Example usage
async function main() {
  const pattern = process.argv[2] || 'test.*';
  console.log(`Searching for domains matching: ${pattern}`);
  
  const domains = await scrapeNameGrep(pattern);
  
  if (domains.length > 0) {
    // Save to file
    const fs = require('fs');
    const filename = `simple_results_${Date.now()}.txt`;
    fs.writeFileSync(filename, domains.join('\n'));
    console.log(`\nResults saved to ${filename}`);
  } else {
    console.log('\nNo domains found. The site might have anti-bot protection or the search might not be working as expected.');
    console.log('You can check the screenshots (simple-debug.png and simple-results.png) to see what the scraper captured.');
  }
}

if (require.main === module) {
  main();
}

module.exports = { scrapeNameGrep };

const { chromium } = require('playwright');

class NameGrepScraper {
  constructor() {
    this.browser = null;
    this.page = null;
  }

  async init() {
    console.log('Launching headless browser...');
    this.browser = await chromium.launch({
      headless: true
    });
    
    const context = await this.browser.newContext({
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
      viewport: { width: 1366, height: 768 }
    });
    
    this.page = await context.newPage();
    
    // Listen for console messages and errors
    this.page.on('console', msg => console.log('PAGE LOG:', msg.text()));
    this.page.on('pageerror', error => console.log('PAGE ERROR:', error.message));
  }

  async scrapeDomains(regexPattern) {
    try {
      console.log(`Searching for domains matching pattern: ${regexPattern}`);
      
      // Try navigating directly to the search URL first
      const searchUrl = `https://namegrep.com/#${encodeURIComponent(regexPattern)}`;
      console.log(`Trying direct URL: ${searchUrl}`);
      
      try {
        await this.page.goto(searchUrl, {
          waitUntil: 'networkidle',
          timeout: 30000
        });
        console.log('Direct search URL loaded successfully');
        
        // Wait a moment for dynamic content to load
        await this.page.waitForTimeout(3000);
        
        // Check if we have results on this page
        const currentUrl = this.page.url();
        console.log(`Current URL after direct navigation: ${currentUrl}`);
        
      } catch (error) {
        console.log('Direct URL failed, trying form submission approach...');
        
        // Fallback to form submission approach
        await this.page.goto('https://namegrep.com', {
          waitUntil: 'networkidle',
          timeout: 30000
        });

        console.log('Page loaded successfully');

        // Take a screenshot for debugging
        await this.page.screenshot({ path: 'debug.png', fullPage: true });
        console.log('Screenshot saved as debug.png');

        // Get page title and URL for debugging
        const title = await this.page.title();
        const url = this.page.url();
        console.log(`Page title: ${title}`);
        console.log(`Current URL: ${url}`);

        // Wait for the search input field to be available
        await this.page.waitForSelector('#query', { timeout: 10000 });
        
        // Clear the field first
        await this.page.fill('#query', '');
        
        // Enter the regex pattern in the search field
        await this.page.fill('#query', regexPattern);
        
        // Wait a moment for any auto-complete or validation
        await this.page.waitForTimeout(1000);

        // Try submitting the form directly
        console.log('Submitting form...');
        await this.page.evaluate(() => {
          const form = document.getElementById('search');
          if (form) {
            form.submit();
          }
        });
      }

      console.log('Search submitted, waiting for results...');

      // Wait for results to load - try waiting for specific elements
      try {
        // Wait for potential result elements to appear
        await this.page.waitForSelector('.result, .domain, table, .search-results', { timeout: 10000 });
        console.log('Results container found!');
      } catch (e) {
        console.log('No specific results container found, waiting 10 seconds...');
        await this.page.waitForTimeout(10000);
      }
      
      // Take another screenshot after search to see results
      await this.page.screenshot({ path: 'results.png', fullPage: true });
      console.log('Results screenshot saved as results.png');

      // Check what's actually on the page after search
      const pageContent = await this.page.content();
      console.log('Page content length:', pageContent.length);
      
      // Look for any elements that might contain results
      const resultElements = await this.page.$$eval('*', elements => {
        return elements.map(el => ({
          tagName: el.tagName,
          className: el.className,
          id: el.id,
          textContent: el.textContent.trim().substring(0, 100)
        })).filter(el => 
          el.textContent && 
          el.textContent.length > 3 && 
          (el.className.includes('result') || 
           el.className.includes('domain') || 
           el.className.includes('search') ||
           el.tagName === 'TD' ||
           el.tagName === 'LI')
        );
      });
      console.log('Potential result elements found:', resultElements.length);
      if (resultElements.length > 0) {
        console.log('Sample elements:', resultElements.slice(0, 5));
      }

      // Try to trigger any JavaScript that might load results
      console.log('Attempting to trigger dynamic content loading...');
      await this.page.evaluate(() => {
        // Try triggering common events that might load results
        window.dispatchEvent(new Event('hashchange'));
        window.dispatchEvent(new Event('load'));
        
        // Look for any JavaScript functions that might be related to search
        if (window.search) {
          console.log('Found window.search function, calling it...');
          try {
            window.search();
          } catch (e) {
            console.log('Error calling window.search:', e.message);
          }
        }
        if (window.loadResults) {
          console.log('Found window.loadResults function, calling it...');
          try {
            window.loadResults();
          } catch (e) {
            console.log('Error calling window.loadResults:', e.message);
          }
        }
        if (window.performSearch) {
          console.log('Found window.performSearch function, calling it...');
          try {
            window.performSearch();
          } catch (e) {
            console.log('Error calling window.performSearch:', e.message);
          }
        }
        
        // Try to find and call any other search-related functions
        const searchFunctions = Object.keys(window).filter(key => 
          typeof window[key] === 'function' && 
          (key.toLowerCase().includes('search') || 
           key.toLowerCase().includes('load') ||
           key.toLowerCase().includes('query'))
        );
        console.log('Found potential search functions:', searchFunctions);
        
        searchFunctions.forEach(funcName => {
          try {
            console.log(`Trying to call ${funcName}...`);
            window[funcName]();
          } catch (e) {
            console.log(`Error calling ${funcName}:`, e.message);
          }
        });
      });
      
      // Wait for any dynamic content to load
      await this.page.waitForTimeout(3000);
      
      // Take another screenshot to see if anything changed
      await this.page.screenshot({ path: 'after-trigger.png', fullPage: true });
      console.log('Screenshot after trigger saved as after-trigger.png');

      // Extract domain names from the results
      const domains = await this.page.evaluate(() => {
        const domains = [];
        
        // Look for all text content on the page that might be domains
        const allText = document.body.textContent || '';
        const lines = allText.split('\n');
        
        lines.forEach(line => {
          const trimmedLine = line.trim();
          // Look for patterns that might be domain names
          if (trimmedLine && 
              trimmedLine.match(/^[a-zA-Z0-9][a-zA-Z0-9.-]*\.[a-zA-Z]{2,}$/) &&
              !trimmedLine.includes('jquery') &&
              !trimmedLine.includes('window') &&
              !trimmedLine.includes('document') &&
              !trimmedLine.includes('.js') &&
              !trimmedLine.includes('.css') &&
              !trimmedLine.includes('.html') &&
              !trimmedLine.includes('namegrep') &&
              !trimmedLine.includes('github') &&
              !trimmedLine.includes('google') &&
              !trimmedLine.includes('mozilla') &&
              trimmedLine.length > 4 &&
              trimmedLine.length < 50) {
            domains.push(trimmedLine.toLowerCase());
          }
        });
        
        // Also look for specific selectors that are likely to contain domain names
        const selectors = [
          '.domain', '.result', '.name', '.domain-name', '.search-result',
          'table td', 'li', '.item', '.available', '.unavailable', 'span', 'div'
        ];
        
        selectors.forEach(selector => {
          const elements = document.querySelectorAll(selector);
          elements.forEach(element => {
            const text = element.textContent.trim();
            // More strict domain matching - exclude common false positives
            if (text && 
                text.match(/^[a-zA-Z0-9][a-zA-Z0-9.-]*\.[a-zA-Z]{2,}$/) &&
                !text.includes('jquery') &&
                !text.includes('window') &&
                !text.includes('document') &&
                !text.includes('.js') &&
                !text.includes('.css') &&
                !text.includes('.html') &&
                !text.includes('namegrep') &&
                text.length > 4 &&
                text.length < 50) {
              domains.push(text.toLowerCase());
            }
          });
        });

        // Remove duplicates and return
        return [...new Set(domains)];
      });

      console.log(`Found ${domains.length} domains`);
      return domains;

    } catch (error) {
      console.error('Error during scraping:', error);
      throw error;
    }
  }

  async close() {
    if (this.browser) {
      await this.browser.close();
      console.log('Browser closed');
    }
  }

  // Method to take a screenshot for debugging
  async takeScreenshot(filename = 'debug.png') {
    if (this.page) {
      await this.page.screenshot({ path: filename, fullPage: true });
      console.log(`Screenshot saved as ${filename}`);
    }
  }
}

// Main execution function
async function main() {
  const scraper = new NameGrepScraper();
  
  try {
    await scraper.init();
    
    // Example usage - you can modify this regex pattern
    const regexPattern = process.argv[2] || 'test.*';
    console.log(`Using regex pattern: ${regexPattern}`);
    
    const domains = await scraper.scrapeDomains(regexPattern);
    
    console.log('\n=== SCRAPED DOMAINS ===');
    domains.forEach((domain, index) => {
      console.log(`${index + 1}. ${domain}`);
    });
    
    console.log(`\nTotal domains found: ${domains.length}`);
    
    // Optional: Save results to a file
    if (domains.length > 0) {
      const fs = require('fs');
      const filename = `domains_${Date.now()}.txt`;
      fs.writeFileSync(filename, domains.join('\n'));
      console.log(`\nResults saved to ${filename}`);
    }

  } catch (error) {
    console.error('Scraping failed:', error);
  } finally {
    await scraper.close();
  }
}

// Run if this file is executed directly
if (require.main === module) {
  main();
}

module.exports = NameGrepScraper;

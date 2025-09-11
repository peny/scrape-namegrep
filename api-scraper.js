const { chromium } = require('playwright');

class NameGrepAPIScraper {
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

  async scrapeAvailableComDomains(regexPattern) {
    try {
      console.log(`Searching for available .com domains matching pattern: ${regexPattern}`);
      
      // Navigate to namegrep.com
      await this.page.goto('https://namegrep.com', {
        waitUntil: 'networkidle',
        timeout: 30000
      });

      console.log('Page loaded successfully');

      // Wait for the search input field to be available
      await this.page.waitForSelector('#query', { timeout: 10000 });
      
      // Clear the field first and enter the regex pattern
      await this.page.fill('#query', '');
      await this.page.fill('#query', regexPattern);
      
      // Wait a moment for any auto-complete or validation
      await this.page.waitForTimeout(1000);

      // Submit the form
      console.log('Submitting form...');
      await this.page.evaluate(() => {
        const form = document.getElementById('search');
        if (form) {
          form.submit();
        }
      });

      console.log('Search submitted, waiting for results...');

      // Wait for results to load
      await this.page.waitForTimeout(8000);
      
      // Try to trigger any JavaScript that might load results
      await this.page.evaluate(() => {
        window.dispatchEvent(new Event('hashchange'));
        window.dispatchEvent(new Event('load'));
      });
      
      // Wait for any dynamic content to load
      await this.page.waitForTimeout(3000);

      // Extract available .com domains from the results
      const availableComDomains = await this.page.evaluate(() => {
        const domains = [];
        
        // Look for elements that might indicate domain availability
        const availabilitySelectors = [
          '.available', '.unavailable', '.domain-available', '.domain-unavailable',
          '.status-available', '.status-unavailable', '.available-domain', '.unavailable-domain',
          'td', 'li', '.result', '.domain', '.name', 'span', 'div'
        ];
        
        availabilitySelectors.forEach(selector => {
          const elements = document.querySelectorAll(selector);
          elements.forEach(element => {
            const text = element.textContent.trim();
            const className = element.className.toLowerCase();
            
            // Check if this element contains a .com domain
            if (text && text.includes('.com')) {
              // Extract potential domain from text
              const domainMatch = text.match(/([a-zA-Z0-9][a-zA-Z0-9.-]*\.com)/g);
              if (domainMatch) {
                domainMatch.forEach(domain => {
                  const cleanDomain = domain.toLowerCase();
                  
                  // Check if this element indicates availability
                  const isAvailable = 
                    className.includes('available') || 
                    text.includes('available') ||
                    text.includes('✓') ||
                    text.includes('yes') ||
                    (!className.includes('unavailable') && !text.includes('unavailable') && !text.includes('✗') && !text.includes('no'));
                  
                  // Only include if it looks like an available domain
                  if (isAvailable && cleanDomain.length > 4 && cleanDomain.length < 50) {
                    domains.push({
                      domain: cleanDomain,
                      status: 'available',
                      source: text.substring(0, 100)
                    });
                  }
                });
              }
            }
          });
        });

        // Also look for any .com domains in the page text
        const allText = document.body.textContent || '';
        const comDomains = allText.match(/\b[a-zA-Z0-9][a-zA-Z0-9.-]*\.com\b/g);
        
        if (comDomains) {
          comDomains.forEach(domain => {
            const cleanDomain = domain.toLowerCase();
            
            // Filter out common false positives
            if (!cleanDomain.includes('namegrep') && 
                !cleanDomain.includes('jquery') && 
                !cleanDomain.includes('github') && 
                !cleanDomain.includes('google') && 
                !cleanDomain.includes('mozilla') &&
                !cleanDomain.includes('facebook') &&
                !cleanDomain.includes('twitter') &&
                !cleanDomain.includes('youtube') &&
                cleanDomain.length > 4 && 
                cleanDomain.length < 50) {
              
              // Check if this domain appears in an available context
              const domainIndex = allText.indexOf(domain);
              const context = allText.substring(Math.max(0, domainIndex - 50), domainIndex + 50).toLowerCase();
              
              const isAvailable = 
                context.includes('available') ||
                context.includes('✓') ||
                context.includes('yes') ||
                (!context.includes('unavailable') && !context.includes('✗') && !context.includes('no'));
              
              if (isAvailable) {
                domains.push({
                  domain: cleanDomain,
                  status: 'available',
                  source: context
                });
              }
            }
          });
        }

        // Remove duplicates based on domain name
        const uniqueDomains = [];
        const seenDomains = new Set();
        
        domains.forEach(item => {
          if (!seenDomains.has(item.domain)) {
            seenDomains.add(item.domain);
            uniqueDomains.push(item.domain);
          }
        });

        return uniqueDomains;
      });

      console.log(`Found ${availableComDomains.length} available .com domains`);
      return availableComDomains;

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
}

// Function to be used by the API
async function scrapeAvailableDomains(regexPattern) {
  const scraper = new NameGrepAPIScraper();
  
  try {
    await scraper.init();
    const domains = await scraper.scrapeAvailableComDomains(regexPattern);
    return domains;
  } catch (error) {
    console.error('Scraping failed:', error);
    throw error;
  } finally {
    await scraper.close();
  }
}

module.exports = { NameGrepAPIScraper, scrapeAvailableDomains };

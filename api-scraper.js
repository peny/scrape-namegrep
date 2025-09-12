const { chromium } = require('playwright');

class NameGrepAPIScraper {
  constructor() {
    this.browser = null;
    this.page = null;
  }

  async init() {
    console.log('Launching headless browser...');
    
    // Check if we're in a production environment (like Render)
    const isProduction = process.env.NODE_ENV === 'production';
    console.log('Environment:', isProduction ? 'production' : 'development');
    
    try {
      this.browser = await chromium.launch({
        headless: true,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-accelerated-2d-canvas',
          '--no-first-run',
          '--no-zygote',
          '--single-process',
          '--disable-gpu',
          '--disable-web-security',
          '--disable-features=VizDisplayCompositor'
        ]
      });
    } catch (error) {
      if (error.message.includes('Executable doesn\'t exist')) {
        console.log('Browser not found, attempting to install...');
        console.log('This should have been done during build, but installing now as fallback...');
        
        const { execSync } = require('child_process');
        try {
          execSync('npx playwright install chromium', { stdio: 'inherit' });
          console.log('Browser installed, retrying launch...');
          
          this.browser = await chromium.launch({
            headless: true,
            args: [
              '--no-sandbox',
              '--disable-setuid-sandbox',
              '--disable-dev-shm-usage',
              '--disable-accelerated-2d-canvas',
              '--no-first-run',
              '--no-zygote',
              '--single-process',
              '--disable-gpu',
              '--disable-web-security',
              '--disable-features=VizDisplayCompositor'
            ]
          });
        } catch (installError) {
          console.error('Failed to install browser:', installError.message);
          throw new Error('Browser installation failed. Please check build process.');
        }
      } else {
        throw error;
      }
    }
    
    const context = await this.browser.newContext({
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
      viewport: { width: 1366, height: 768 }
    });
    
    this.page = await context.newPage();
    
    // Listen for console messages and errors
    this.page.on('console', msg => console.log('PAGE LOG:', msg.text()));
    this.page.on('pageerror', error => console.log('PAGE ERROR:', error.message));
  }

  async scrollToLoadAllResults() {
    console.log('Starting scroll-based lazy loading...');
    
    let previousHeight = 0;
    let currentHeight = 0;
    let scrollAttempts = 0;
    const maxScrollAttempts = 20;
    const scrollDelay = 2000;
    
    do {
      // Get current page height
      previousHeight = currentHeight;
      currentHeight = await this.page.evaluate(() => {
        return Math.max(
          document.body.scrollHeight,
          document.body.offsetHeight,
          document.documentElement.clientHeight,
          document.documentElement.scrollHeight,
          document.documentElement.offsetHeight
        );
      });
      
      console.log(`Scroll attempt ${scrollAttempts + 1}: Height ${previousHeight} -> ${currentHeight}`);
      
      // Scroll to bottom of page
      await this.page.evaluate(() => {
        window.scrollTo(0, document.body.scrollHeight);
      });
      
      // Wait for new content to load
      await this.page.waitForTimeout(scrollDelay);
      
      // Try to trigger any lazy loading mechanisms
      await this.page.evaluate(() => {
        // Dispatch scroll event
        window.dispatchEvent(new Event('scroll'));
        window.dispatchEvent(new Event('resize'));
        
        // Try to find and click any "Load More" buttons
        const loadMoreButtons = document.querySelectorAll('button, a, div');
        loadMoreButtons.forEach(btn => {
          const text = btn.textContent.toLowerCase();
          if (text.includes('load more') || text.includes('show more') || text.includes('see more')) {
            console.log('Found load more button:', text);
            btn.click();
          }
        });
      });
      
      // Wait a bit more for any new content
      await this.page.waitForTimeout(scrollDelay);
      
      scrollAttempts++;
      
      // Check if we have new content by counting domain elements
      const domainCount = await this.page.evaluate(() => {
        return document.querySelectorAll('.domain').length;
      });
      
      console.log(`Found ${domainCount} domain elements after scroll ${scrollAttempts}`);
      
    } while (currentHeight > previousHeight && scrollAttempts < maxScrollAttempts);
    
    console.log(`Scrolling completed after ${scrollAttempts} attempts`);
    
    // Final wait for any remaining content to load
    await this.page.waitForTimeout(3000);
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
      
      // Implement scrolling to load all results (lazy loading)
      console.log('Implementing scrolling to load all results...');
      await this.scrollToLoadAllResults();

      // Debug: Take a screenshot and get page content
      await this.page.screenshot({ path: 'api-debug.png', fullPage: true });
      console.log('API debug screenshot saved as api-debug.png');
      
      // Get page content for debugging
      const pageContent = await this.page.content();
      console.log('Page content length:', pageContent.length);
      
      // Check what's actually on the page
      const pageInfo = await this.page.evaluate(() => {
        return {
          title: document.title,
          url: window.location.href,
          bodyText: document.body.textContent.substring(0, 1000),
          allLinks: Array.from(document.querySelectorAll('a')).map(a => a.href).slice(0, 10),
          allText: document.body.textContent
        };
      });
      
      console.log('Page info:', pageInfo);
      
      // Extract available .com domains from the results
      const availableComDomains = await this.page.evaluate((pattern) => {
        const domains = [];
        
        // First, let's see what's actually on the page
        console.log('Searching for pattern:', pattern);
        console.log('Page title:', document.title);
        console.log('Current URL:', window.location.href);
        
        // Look for any text that might be domains
        const allText = document.body.textContent || '';
        console.log('Total text length:', allText.length);
        
        // Look for .com domains in all text
        const comDomains = allText.match(/\b[a-zA-Z0-9][a-zA-Z0-9.-]*\.com\b/g);
        console.log('Found .com domains in text:', comDomains);
        
        // Look for any elements that might contain results
        const allElements = document.querySelectorAll('*');
        console.log('Total elements on page:', allElements.length);
        
        // Look for domain names in .domain elements specifically
        const domainElements = document.querySelectorAll('.domain');
        console.log(`Found ${domainElements.length} domain elements`);
        
        // Process ALL domain elements (not just first 10)
        const elementsToProcess = Array.from(domainElements);
        console.log(`Processing all ${elementsToProcess.length} domain elements`);
        
        elementsToProcess.forEach((element, index) => {
          const text = element.textContent.trim();
          
          // Only log details for first few elements to avoid spam
          if (index < 5) {
            console.log(`Domain element ${index}:`, text);
          }
          
          if (text && text.length > 1) {
            // Extract just the domain name part (before any TLD info)
            const lines = text.split('\n');
            const firstLine = lines[0].trim();
            
            if (index < 5) {
              console.log(`First line of element ${index}:`, firstLine);
            }
            
            // Check if this looks like a domain name (without TLD)
            if (firstLine.match(/^[a-zA-Z0-9][a-zA-Z0-9.-]*$/)) {
              const cleanDomain = firstLine.toLowerCase();
              
              if (index < 5) {
                console.log(`Clean domain: ${cleanDomain}`);
              }
              
              // Filter out common false positives
              if (!cleanDomain.includes('namegrep') && 
                  !cleanDomain.includes('jquery') && 
                  !cleanDomain.includes('github') && 
                  !cleanDomain.includes('google') && 
                  !cleanDomain.includes('mozilla') &&
                  !cleanDomain.includes('facebook') &&
                  !cleanDomain.includes('twitter') &&
                  !cleanDomain.includes('youtube') &&
                  !cleanDomain.includes('amazon') &&
                  !cleanDomain.includes('microsoft') &&
                  cleanDomain.length > 1 && 
                  cleanDomain.length < 20) {
                
                // Add .com suffix to create full domain
                const fullDomain = cleanDomain + '.com';
                domains.push(fullDomain);
                
                // Log every 10th domain to track progress
                if (domains.length % 10 === 0 || domains.length < 10) {
                  console.log(`Added domain #${domains.length}:`, fullDomain);
                }
              } else if (index < 5) {
                console.log(`Filtered out domain: ${cleanDomain}`);
              }
            } else if (index < 5) {
              console.log(`First line doesn't match domain pattern: ${firstLine}`);
            }
          } else if (index < 5) {
            console.log(`Element ${index} has no text or too short`);
          }
        });
        
        // Also look for any existing .com domains in the text
        const selectors = [
          '.result', '.name', '.available', '.unavailable',
          'td', 'li', 'span', 'div', 'p'
        ];
        
        selectors.forEach(selector => {
          const elements = document.querySelectorAll(selector);
          if (elements.length > 0) {
            elements.forEach((element, index) => {
              const text = element.textContent.trim();
              if (text && text.includes('.com')) {
                // Extract .com domains from text
                const comMatches = text.match(/\b[a-zA-Z0-9][a-zA-Z0-9.-]*\.com\b/g);
                if (comMatches) {
                  comMatches.forEach(domain => {
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
                        !cleanDomain.includes('amazon') &&
                        !cleanDomain.includes('microsoft') &&
                        cleanDomain.length > 4 && 
                        cleanDomain.length < 50) {
                      
                      domains.push(cleanDomain);
                      console.log('Added existing .com domain:', cleanDomain);
                    }
                  });
                }
              }
            });
          }
        });
        
        // Also check if there are any tables or lists with results
        const tables = document.querySelectorAll('table');
        const lists = document.querySelectorAll('ul, ol');
        
        console.log('Found tables:', tables.length);
        console.log('Found lists:', lists.length);
        
        tables.forEach((table, index) => {
          const rows = table.querySelectorAll('tr');
          console.log(`Table ${index} has ${rows.length} rows`);
          
          rows.forEach((row, rowIndex) => {
            const cells = row.querySelectorAll('td, th');
            cells.forEach((cell, cellIndex) => {
              const text = cell.textContent.trim();
              if (text && text.match(/^[a-zA-Z0-9][a-zA-Z0-9.-]*\.[a-zA-Z]{2,}$/)) {
                const cleanDomain = text.toLowerCase();
                if (!cleanDomain.includes('namegrep') && 
                    !cleanDomain.includes('jquery') && 
                    cleanDomain.length > 4 && 
                    cleanDomain.length < 50) {
                  domains.push(cleanDomain);
                  console.log('Added domain from table:', cleanDomain);
                }
              }
            });
          });
        });
        
        // Remove duplicates
        const uniqueDomains = [...new Set(domains)];
        console.log('Final unique domains:', uniqueDomains);
        
        return uniqueDomains;
      }, regexPattern);

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

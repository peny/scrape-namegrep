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
          '--disable-features=VizDisplayCompositor',
          '--memory-pressure-off',
          '--max_old_space_size=512',
          '--disable-background-timer-throttling',
          '--disable-backgrounding-occluded-windows',
          '--disable-renderer-backgrounding',
          '--disable-background-networking',
          '--disable-extensions',
          '--disable-plugins',
          '--disable-images',
          '--disable-javascript-harmony-shipping',
          '--disable-back-forward-cache'
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
    console.log('Starting enhanced scroll-based lazy loading...');
    
    let previousHeight = 0;
    let currentHeight = 0;
    let scrollAttempts = 0;
    const maxScrollAttempts = 15; // Increased for better results
    const scrollDelay = 2000; // Increased for better loading
    let stableCount = 0; // Track when domain count stabilizes
    
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
      
      // Multiple scroll strategies
      await this.page.evaluate(() => {
        // Strategy 1: Scroll to bottom
        window.scrollTo(0, document.body.scrollHeight);
        
        // Strategy 2: Smooth scroll
        window.scrollTo({
          top: document.body.scrollHeight,
          behavior: 'smooth'
        });
        
        // Strategy 3: Scroll in increments
        for (let i = 0; i < 5; i++) {
          setTimeout(() => {
            window.scrollBy(0, window.innerHeight);
          }, i * 200);
        }
      });
      
      // Wait for new content to load
      await this.page.waitForTimeout(scrollDelay);
      
      // Enhanced lazy loading trigger
      await this.page.evaluate(() => {
        // Dispatch multiple events
        window.dispatchEvent(new Event('scroll'));
        window.dispatchEvent(new Event('resize'));
        window.dispatchEvent(new Event('hashchange'));
        window.dispatchEvent(new Event('load'));
        
        // Try to find and click any "Load More" buttons with more variations
        const loadMoreSelectors = [
          'button', 'a', 'div', '[class*="load"]', '[class*="more"]', 
          '[id*="load"]', '[id*="more"]', '.btn', '.button'
        ];
        
        loadMoreSelectors.forEach(selector => {
          const elements = document.querySelectorAll(selector);
          elements.forEach(btn => {
            const text = btn.textContent.toLowerCase();
            if (text.includes('load more') || text.includes('show more') || 
                text.includes('see more') || text.includes('load') || 
                text.includes('more') || text.includes('next')) {
              console.log('Found load more button:', text);
              try {
                btn.click();
              } catch (e) {
                console.log('Could not click button:', e.message);
              }
            }
          });
        });
        
        // Try to trigger infinite scroll by scrolling to specific elements
        const domainElements = document.querySelectorAll('.domain');
        if (domainElements.length > 0) {
          const lastDomain = domainElements[domainElements.length - 1];
          lastDomain.scrollIntoView({ behavior: 'smooth', block: 'end' });
        }
      });
      
      // Wait a bit more for any new content
      await this.page.waitForTimeout(scrollDelay);
      
      scrollAttempts++;
      
      // Check if we have new content by counting domain elements
      const domainCount = await this.page.evaluate(() => {
        return document.querySelectorAll('.domain').length;
      });
      
      console.log(`Found ${domainCount} domain elements after scroll ${scrollAttempts}`);
      
      // Check if domain count is stabilizing
      if (domainCount === previousHeight) {
        stableCount++;
        if (stableCount >= 3) {
          console.log('Domain count stabilized, stopping scroll');
          break;
        }
      } else {
        stableCount = 0;
      }
      
    } while (scrollAttempts < maxScrollAttempts);
    
    console.log(`Scrolling completed after ${scrollAttempts} attempts`);
    
    // Check if we hit the 50k limit
    const hasLimitMessage = await this.page.evaluate(() => {
      return document.body.textContent.includes('generates over') && 
             document.body.textContent.includes('keep it under 50,000');
    });
    
    if (hasLimitMessage) {
      console.log('⚠️  Query exceeded 50,000 match limit - try a more specific pattern');
    }
    
    // Final wait for any remaining content to load
    await this.page.waitForTimeout(3000);
  }

  async scrapeAvailableComDomains(regexPattern) {
    try {
      console.log(`Searching for available .com domains matching pattern: ${regexPattern}`);
      
      // Set up network monitoring
      const networkRequests = [];
      const networkResponses = [];
      
      this.page.on('request', request => {
        if (request.url().includes('namegrep') || request.url().includes('api')) {
          networkRequests.push({
            url: request.url(),
            method: request.method(),
            headers: request.headers(),
            postData: request.postData()
          });
        }
      });
      
      this.page.on('response', response => {
        if (response.url().includes('namegrep') || response.url().includes('api')) {
          networkResponses.push({
            url: response.url(),
            status: response.status(),
            headers: response.headers()
          });
        }
      });
      
      // Navigate to namegrep.com
      await this.page.goto('https://namegrep.com', {
        waitUntil: 'networkidle',
        timeout: 30000
      });

      console.log('Page loaded successfully');
      console.log(`Network requests during page load: ${networkRequests.length}`);
      console.log(`Network responses during page load: ${networkResponses.length}`);

      // Wait for the search input field to be available
      await this.page.waitForSelector('#query', { timeout: 10000 });
      
      // Clear the field first and enter the regex pattern
      await this.page.fill('#query', '');
      await this.page.fill('#query', regexPattern);
      
      // Wait a moment for any auto-complete or validation
      await this.page.waitForTimeout(1000);

      // Submit the form
      console.log('Submitting form...');
      const requestsBeforeSubmit = networkRequests.length;
      
      await this.page.evaluate(() => {
        const form = document.getElementById('search');
        if (form) {
          form.submit();
        }
      });
      
      console.log(`Network requests before submit: ${requestsBeforeSubmit}`);

      console.log('Search submitted, waiting for results...');

      // Wait for AJAX response
      await this.page.waitForResponse(response => 
        response.url().includes('/ajax?query=') && response.status() === 200
      );
      
      console.log('AJAX response received!');
      
      // Get the AJAX response directly
      const ajaxResponse = await this.page.evaluate(async (pattern) => {
        try {
          const encodedQuery = encodeURIComponent(pattern);
          const response = await fetch(`/ajax?query=${encodedQuery}`);
          const data = await response.text();
          return data;
        } catch (error) {
          console.log('Direct AJAX call failed:', error.message);
          return null;
        }
      }, regexPattern);
      
      if (ajaxResponse) {
        console.log('Direct AJAX response length:', ajaxResponse.length);
        console.log('First 500 chars of AJAX response:', ajaxResponse.substring(0, 500));
        
        // Parse the JSON response
        try {
          const jsonData = JSON.parse(ajaxResponse);
          console.log('Parsed JSON data keys:', Object.keys(jsonData));
          
          const items = Array.isArray(jsonData) ? jsonData : (Array.isArray(jsonData.domains) ? jsonData.domains : null);
          if (items) {
            console.log('AJAX returned items length:', items.length);
            const extracted = [];
            for (const item of items) {
              // Case 1: item is a string
              if (typeof item === 'string') {
                if (/\.com$/i.test(item)) {
                  extracted.push(item.toLowerCase());
                }
                continue;
              }

              // Case 2: item has a direct domain-like field
              const directDomain = item.domain || item.name || item.full || item.url;
              if (typeof directDomain === 'string' && /\.com$/i.test(directDomain)) {
                const isAvailable = (typeof item.available === 'boolean' ? item.available : true) &&
                                   (typeof item.mask !== 'boolean' ? true : !item.mask) &&
                                   (typeof item.status === 'string' ? item.status.toLowerCase() !== 'unavailable' : true);
                if (isAvailable) extracted.push(directDomain.toLowerCase());
                continue;
              }

              // Case 3: item is a base label with TLD availability info
              const base = item.id || item.slug || item.label;
              const tldsObj = item.tlds || item.tldAvailability || item.availability || item.availableTlds;
              const tldSingle = item.tld;

              const comAvailable = (
                (tldSingle && (tldSingle === 'com' || tldSingle === '.com')) ||
                (Array.isArray(tldsObj) && tldsObj.map(t => (typeof t === 'string' ? t.replace(/^\./, '') : '')).includes('com')) ||
                (tldsObj && typeof tldsObj === 'object' && (
                  tldsObj['com'] === true || tldsObj['.com'] === true ||
                  (typeof tldsObj['com'] === 'string' && tldsObj['com'].toLowerCase() === 'available') ||
                  (typeof tldsObj['.com'] === 'string' && tldsObj['.com'].toLowerCase() === 'available')
                ))
              );

              const notMasked = !(typeof item.mask === 'boolean' && item.mask);

              if (base && comAvailable && notMasked) {
                extracted.push(String(base).toLowerCase() + '.com');
              }
            }

            const availableDomains = [...new Set(extracted)].filter(d => /\.com$/i.test(d));
            console.log(`Found ${availableDomains.length} available .com domains from AJAX`);
            if (availableDomains.length > 0) {
              return availableDomains;
            }
          }
        } catch (parseError) {
          console.log('Failed to parse AJAX JSON:', parseError.message);
        }
      }
      
      // Log network activity after initial wait
      console.log(`Network requests after initial wait: ${networkRequests.length}`);
      console.log(`Network responses after initial wait: ${networkResponses.length}`);
      
      // Try to trigger any JavaScript that might load results
      await this.page.evaluate(() => {
        window.dispatchEvent(new Event('hashchange'));
        window.dispatchEvent(new Event('load'));
      });
      
      // Wait for any dynamic content to load
      await this.page.waitForTimeout(3000);
      
      // Log network activity after JS triggers
      console.log(`Network requests after JS triggers: ${networkRequests.length}`);
      console.log(`Network responses after JS triggers: ${networkResponses.length}`);
      
      // Implement scrolling to load all results (lazy loading)
      console.log('Implementing scrolling to load all results...');
      const requestsBeforeScroll = networkRequests.length;
      await this.scrollToLoadAllResults();
      
      // Log network activity after scrolling
      console.log(`Network requests after scrolling: ${networkRequests.length}`);
      console.log(`Network responses after scrolling: ${networkResponses.length}`);
      console.log(`New requests during scroll: ${networkRequests.length - requestsBeforeScroll}`);
      
      // Detailed DOM analysis
      const domAnalysis = await this.page.evaluate(() => {
        const domainElements = document.querySelectorAll('.domain');
        const allElements = document.querySelectorAll('*');
        const scripts = document.querySelectorAll('script');
        const links = document.querySelectorAll('link');
        
        // Check for any hidden elements or containers
        const hiddenElements = Array.from(document.querySelectorAll('*')).filter(el => {
          const style = window.getComputedStyle(el);
          return style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0';
        });
        
        // Check for any elements with data attributes that might indicate pagination
        const allElementsWithData = Array.from(document.querySelectorAll('*')).filter(el => {
          return Array.from(el.attributes).some(attr => attr.name.startsWith('data-'));
        });
        const dataElements = allElementsWithData.map(el => {
          const attrs = {};
          for (let attr of el.attributes) {
            if (attr.name.startsWith('data-')) {
              attrs[attr.name] = attr.value;
            }
          }
          return { tagName: el.tagName, className: el.className, attrs };
        });
        
        return {
          totalElements: allElements.length,
          domainElements: domainElements.length,
          scripts: scripts.length,
          links: links.length,
          hiddenElements: hiddenElements.length,
          dataElements: dataElements.slice(0, 10), // First 10 data elements
          pageHeight: document.body.scrollHeight,
          viewportHeight: window.innerHeight,
          scrollTop: window.pageYOffset
        };
      });
      
      console.log('DOM Analysis:', domAnalysis);

      // Debug: Get page content (skip screenshot to avoid memory issues)
      console.log('Getting page content for debugging...');
      
      let pageInfo = null;
      try {
        // Get page content for debugging
        const pageContent = await this.page.content();
        console.log('Page content length:', pageContent.length);
        
        // Check what's actually on the page
        pageInfo = await this.page.evaluate(() => {
          return {
            title: document.title,
            url: window.location.href,
            bodyText: document.body.textContent.substring(0, 1000),
            domainCount: document.querySelectorAll('.domain').length
          };
        });
        
        console.log('Page info:', pageInfo);
      } catch (debugError) {
        console.log('Debug info collection failed (browser may be closing):', debugError.message);
        // Continue with domain extraction even if debug fails
      }
      
      // Extract available .com domains from the results (fallback-only, if AJAX fails)
      let availableComDomains = [];
      try {
        availableComDomains = await this.page.evaluate((pattern) => {
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
        
        // Look for domain names in .domain elements specifically and only capture explicit .com mentions
        const domainElements = document.querySelectorAll('.domain');
        console.log(`Found ${domainElements.length} domain elements`);
        const elementsToProcess = Array.from(domainElements);
        console.log(`Processing all ${elementsToProcess.length} domain elements`);
        elementsToProcess.forEach((element, index) => {
          const text = element.textContent.trim();
          if (index < 5) {
            console.log(`Domain element ${index}:`, text);
          }
          if (text) {
            const comMatches = text.match(/\b[a-zA-Z0-9][a-zA-Z0-9.-]*\.com\b/g);
            if (comMatches) {
              comMatches.forEach(domain => {
                const cleanDomain = domain.toLowerCase();
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
                }
              });
            }
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
          rows.forEach((row) => {
            const cells = row.querySelectorAll('td, th');
            cells.forEach((cell) => {
              const text = cell.textContent.trim();
              if (text && text.includes('.com')) {
                const comMatches = text.match(/\b[a-zA-Z0-9][a-zA-Z0-9.-]*\.com\b/g);
                if (comMatches) {
                  comMatches.forEach(domain => {
                    const cleanDomain = domain.toLowerCase();
                    if (!cleanDomain.includes('namegrep') &&
                        !cleanDomain.includes('jquery') &&
                        cleanDomain.length > 4 &&
                        cleanDomain.length < 50) {
                      domains.push(cleanDomain);
                      console.log('Added .com domain from table:', cleanDomain);
                    }
                  });
                }
              }
            });
          });
        });
        
        // Remove duplicates and ensure only .com domains
        const uniqueDomains = [...new Set(domains)].filter(d => d.endsWith('.com'));
        console.log('Final unique domains:', uniqueDomains);
        
        return uniqueDomains;
        }, regexPattern);
        
        console.log(`Found ${availableComDomains.length} available .com domains`);
      } catch (extractError) {
        console.log('Domain extraction failed (browser may be closing):', extractError.message);
        availableComDomains = [];
      }
      
      // Final network analysis
      console.log('\n=== NETWORK ANALYSIS SUMMARY ===');
      console.log(`Total network requests: ${networkRequests.length}`);
      console.log(`Total network responses: ${networkResponses.length}`);
      
      // Log unique request URLs
      const uniqueUrls = [...new Set(networkRequests.map(req => req.url))];
      console.log('Unique request URLs:', uniqueUrls);
      
      // Log any POST requests (might be AJAX calls for more data)
      const postRequests = networkRequests.filter(req => req.method === 'POST');
      if (postRequests.length > 0) {
        console.log('POST requests found:', postRequests);
      }
      
      // Log any requests with specific patterns
      const apiRequests = networkRequests.filter(req => 
        req.url.includes('api') || 
        req.url.includes('search') || 
        req.url.includes('data') ||
        req.url.includes('load')
      );
      if (apiRequests.length > 0) {
        console.log('Potential API/search requests:', apiRequests);
      }
      
      console.log('=== END NETWORK ANALYSIS ===\n');
      
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

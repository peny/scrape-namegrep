const { chromium } = require('playwright');

async function debugNameGrep() {
  console.log('🚀 Starting headless browser to debug namegrep.com...');
  
  const browser = await chromium.launch({ 
    headless: false, // Set to true to run headless
    slowMo: 1000 // Slow down for better observation
  });
  
  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
  });
  
  const page = await context.newPage();
  
  // Monitor all network requests
  const requests = [];
  const responses = [];
  
  page.on('request', request => {
    const requestData = {
      url: request.url(),
      method: request.method(),
      headers: request.headers(),
      postData: request.postData(),
      timestamp: new Date().toISOString()
    };
    requests.push(requestData);
    console.log(`📤 REQUEST: ${request.method()} ${request.url()}`);
  });
  
  page.on('response', async response => {
    const responseData = {
      url: response.url(),
      status: response.status(),
      headers: response.headers(),
      timestamp: new Date().toISOString()
    };
    
    // Try to get response body for interesting URLs
    if (response.url().includes('ajax') || response.url().includes('api')) {
      try {
        responseData.body = await response.text();
        console.log(`📥 RESPONSE: ${response.status()} ${response.url()}`);
        console.log(`   Body: ${responseData.body.substring(0, 200)}...`);
      } catch (e) {
        console.log(`📥 RESPONSE: ${response.status()} ${response.url()} (could not read body)`);
      }
    }
    
    responses.push(responseData);
  });
  
  try {
    console.log('🌐 Navigating to namegrep.com...');
    await page.goto('https://namegrep.com', { 
      waitUntil: 'networkidle',
      timeout: 30000 
    });
    
    console.log('📄 Page loaded successfully');
    console.log(`📊 Total requests so far: ${requests.length}`);
    
    // Wait a bit for any initial AJAX calls
    await page.waitForTimeout(3000);
    
    // Try to find the search input
    console.log('🔍 Looking for search input...');
    const searchInput = await page.locator('#query');
    
    if (await searchInput.count() > 0) {
      console.log('✅ Found search input!');
      
      // Enter a test pattern
      const testPattern = 'test.*';
      console.log(`⌨️  Entering pattern: ${testPattern}`);
      await searchInput.fill(testPattern);
      
      // Submit the form by pressing Enter
      console.log('🚀 Submitting search by pressing Enter...');
      await searchInput.press('Enter');
      
      // Wait for results
      console.log('⏳ Waiting for results...');
      await page.waitForTimeout(5000);
      
      // Check what's on the page
      const pageContent = await page.content();
      console.log(`📄 Page content length: ${pageContent.length}`);
      
      // Look for domain elements
      const domainElements = await page.locator('.domain').count();
      console.log(`🎯 Found ${domainElements} domain elements`);
      
      if (domainElements > 0) {
        // Get first few domains
        const domains = [];
        for (let i = 0; i < Math.min(5, domainElements); i++) {
          const text = await page.locator('.domain').nth(i).textContent();
          domains.push(text);
        }
        console.log('📋 Sample domains:', domains);
      }
      
    } else {
      console.log('❌ Could not find search input');
    }
    
    // Summary of network activity
    console.log('\n📊 NETWORK ACTIVITY SUMMARY:');
    console.log(`Total requests: ${requests.length}`);
    console.log(`Total responses: ${responses.length}`);
    
    // Show interesting requests
    const ajaxRequests = requests.filter(req => 
      req.url.includes('ajax') || req.url.includes('api') || req.url.includes('search')
    );
    
    console.log(`\n🔍 AJAX/API Requests (${ajaxRequests.length}):`);
    ajaxRequests.forEach(req => {
      console.log(`  ${req.method} ${req.url}`);
    });
    
    const ajaxResponses = responses.filter(res => 
      res.url.includes('ajax') || res.url.includes('api') || res.url.includes('search')
    );
    
    console.log(`\n📥 AJAX/API Responses (${ajaxResponses.length}):`);
    ajaxResponses.forEach(res => {
      console.log(`  ${res.status} ${res.url}`);
      if (res.body) {
        console.log(`    Body: ${res.body.substring(0, 100)}...`);
      }
    });
    
    // Save screenshots
    await page.screenshot({ path: 'namegrep-debug.png', fullPage: true });
    console.log('📸 Screenshot saved as namegrep-debug.png');
    
  } catch (error) {
    console.error('❌ Error during debugging:', error);
  } finally {
    await browser.close();
    console.log('🔒 Browser closed');
  }
}

// Run the debug
debugNameGrep().catch(console.error);

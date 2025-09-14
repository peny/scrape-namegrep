const { chromium } = require('playwright');

async function testOurApp() {
  console.log('🚀 Testing our NameGrep app in headless browser...');
  
  const browser = await chromium.launch({ 
    headless: false, // Set to true to run headless
    slowMo: 1000 // Slow down for better observation
  });
  
  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
  });
  
  const page = await context.newPage();
  
  // Monitor network requests
  const requests = [];
  const responses = [];
  
  page.on('request', request => {
    requests.push({
      url: request.url(),
      method: request.method(),
      timestamp: new Date().toISOString()
    });
    console.log(`📤 REQUEST: ${request.method()} ${request.url()}`);
  });
  
  page.on('response', async response => {
    const responseData = {
      url: response.url(),
      status: response.status(),
      timestamp: new Date().toISOString()
    };
    
    // Log API responses
    if (response.url().includes('api/search-domains')) {
      try {
        responseData.body = await response.text();
        console.log(`📥 API RESPONSE: ${response.status()} ${response.url()}`);
        console.log(`   Body: ${responseData.body.substring(0, 300)}...`);
      } catch (e) {
        console.log(`📥 API RESPONSE: ${response.status()} ${response.url()} (could not read body)`);
      }
    }
    
    responses.push(responseData);
  });
  
  try {
    console.log('🌐 Navigating to our app...');
    await page.goto('http://localhost:62209', { 
      waitUntil: 'networkidle',
      timeout: 30000 
    });
    
    console.log('📄 Our app loaded successfully');
    console.log(`📊 Total requests so far: ${requests.length}`);
    
    // Wait for page to fully load
    await page.waitForTimeout(3000);
    
    // Check if our app loaded correctly
    const title = await page.title();
    console.log(`📋 Page title: ${title}`);
    
    // Look for the search input
    console.log('🔍 Looking for search input...');
    const searchInput = await page.locator('#regexPattern');
    
    if (await searchInput.count() > 0) {
      console.log('✅ Found search input!');
      
      // Enter the test pattern
      const testPattern = 'susu..';
      console.log(`⌨️  Entering pattern: ${testPattern}`);
      await searchInput.fill(testPattern);
      
      // Look for and click the search button
      console.log('🔍 Looking for search button...');
      const searchButton = await page.locator('#searchButton');
      
      if (await searchButton.count() > 0) {
        console.log('✅ Found search button!');
        console.log('🚀 Clicking search button...');
        await searchButton.click();
        
        // Wait for API response
        console.log('⏳ Waiting for API response...');
        await page.waitForTimeout(10000); // Wait longer for scraping
        
        // Check for results
        const resultsSection = await page.locator('#resultsSection');
        const isVisible = await resultsSection.isVisible();
        console.log(`📊 Results section visible: ${isVisible}`);
        
        if (isVisible) {
          // Get the count display
          const countDisplay = await page.locator('#countDisplay');
          if (await countDisplay.count() > 0) {
            const countText = await countDisplay.textContent();
            console.log(`📈 Count display: ${countText}`);
          }
          
          // Get the pattern display
          const patternDisplay = await page.locator('#patternDisplay');
          if (await patternDisplay.count() > 0) {
            const patternText = await patternDisplay.textContent();
            console.log(`🎯 Pattern display: ${patternText}`);
          }
          
          // Look for domain items
          const domainItems = await page.locator('.domain-item').count();
          console.log(`🎯 Found ${domainItems} domain items`);
          
          if (domainItems > 0) {
            console.log('📋 Sample domains:');
            for (let i = 0; i < Math.min(5, domainItems); i++) {
              const domainText = await page.locator('.domain-item').nth(i).textContent();
              console.log(`  ${i + 1}. ${domainText}`);
            }
          }
        } else {
          // Check for error message
          const errorSection = await page.locator('#errorSection');
          const errorVisible = await errorSection.isVisible();
          if (errorVisible) {
            const errorText = await page.locator('#errorMessage').textContent();
            console.log(`❌ Error message: ${errorText}`);
          }
        }
      } else {
        console.log('❌ Could not find search button');
      }
    } else {
      console.log('❌ Could not find search input');
    }
    
    // Summary of network activity
    console.log('\n📊 NETWORK ACTIVITY SUMMARY:');
    console.log(`Total requests: ${requests.length}`);
    console.log(`Total responses: ${responses.length}`);
    
    // Show API requests
    const apiRequests = requests.filter(req => 
      req.url.includes('api/search-domains')
    );
    
    console.log(`\n🔍 API Requests (${apiRequests.length}):`);
    apiRequests.forEach(req => {
      console.log(`  ${req.method} ${req.url}`);
    });
    
    const apiResponses = responses.filter(res => 
      res.url.includes('api/search-domains')
    );
    
    console.log(`\n📥 API Responses (${apiResponses.length}):`);
    apiResponses.forEach(res => {
      console.log(`  ${res.status} ${res.url}`);
      if (res.body) {
        console.log(`    Body: ${res.body.substring(0, 200)}...`);
      }
    });
    
    // Save screenshot
    await page.screenshot({ path: 'our-app-test.png', fullPage: true });
    console.log('📸 Screenshot saved as our-app-test.png');
    
  } catch (error) {
    console.error('❌ Error during testing:', error);
  } finally {
    await browser.close();
    console.log('🔒 Browser closed');
  }
}

// Run the test
testOurApp().catch(console.error);

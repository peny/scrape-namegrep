const https = require('https');
const http = require('http');
const { execSync } = require('child_process');

class DirectNameGrepScraper {
  constructor() {
    this.baseUrl = 'namegrep.com';
  }

  async makeRequest(url, options = {}) {
    return new Promise((resolve, reject) => {
      const isHttps = url.startsWith('https://');
      const client = isHttps ? https : http;
      
      const requestOptions = {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
          'Accept': 'application/json, text/plain, */*',
          'Accept-Language': 'en-US,en;q=0.9',
          'Accept-Encoding': 'gzip, deflate, br',
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache',
          'Connection': 'keep-alive',
          'Referer': 'https://namegrep.com/',
          'Origin': 'https://namegrep.com',
          'Sec-Fetch-Dest': 'empty',
          'Sec-Fetch-Mode': 'cors',
          'Sec-Fetch-Site': 'same-origin',
          'X-Requested-With': 'XMLHttpRequest',
          ...options.headers
        },
        timeout: 60000,
        ...options
      };

      const req = client.request(url, requestOptions, (res) => {
        let data = '';
        
        // Handle gzipped responses
        const stream = res.headers['content-encoding'] === 'gzip' 
          ? require('zlib').createGunzip() 
          : res;
        
        stream.on('data', (chunk) => {
          data += chunk;
        });
        
        stream.on('end', () => {
          try {
            resolve({
              statusCode: res.statusCode,
              headers: res.headers,
              data: data
            });
          } catch (error) {
            reject(error);
          }
        });
        
        stream.on('error', reject);
      });
      
      req.on('error', reject);
      req.on('timeout', () => {
        req.destroy();
        reject(new Error('Request timeout after 60 seconds'));
      });
      
      if (options.body) {
        req.write(options.body);
      }
      
      req.end();
    });
  }

  async searchDomains(regexPattern) {
    try {
      console.log(`🔍 Searching for domains with pattern: ${regexPattern}`);
      
      // Use curl as fallback since Node.js HTTP is having issues
      const url = `https://${this.baseUrl}/ajax?query=${encodeURIComponent(regexPattern)}`;
      console.log(`📡 Making request to: ${url}`);
      
      try {
        const curlCommand = `curl -s --compressed -H "User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36" -H "Accept: application/json, text/plain, */*" -H "Accept-Language: en-US,en;q=0.9" -H "Accept-Encoding: gzip, deflate, br" -H "Cache-Control: no-cache" -H "Pragma: no-cache" -H "X-Requested-With: XMLHttpRequest" -H "Referer: https://namegrep.com/" -H "Origin: https://namegrep.com" -H "Sec-Fetch-Dest: empty" -H "Sec-Fetch-Mode: cors" -H "Sec-Fetch-Site: same-origin" "${url}"`;
        
        console.log('🔄 Using curl command...');
        const response = execSync(curlCommand, { encoding: 'utf8', timeout: 30000 });
        
        console.log(`📄 Response length: ${response.length} characters`);
        console.log(`📋 First 500 chars of response:`, response.substring(0, 500));
        
        try {
          const jsonData = JSON.parse(response);
          console.log('✅ Successfully parsed JSON response');
          console.log(`📈 Total count: ${jsonData.count}`);
          console.log(`🎯 Domains array length: ${jsonData.domains ? jsonData.domains.length : 0}`);
          
          if (jsonData.domains && Array.isArray(jsonData.domains)) {
            const domains = this.extractDomainsFromJson(jsonData);
            console.log(`🎉 Extracted ${domains.length} available .com domains`);
            return domains;
          } else {
            console.log('❌ No domains array found in response');
            return [];
          }
        } catch (parseError) {
          console.log('❌ Failed to parse JSON:', parseError.message);
          return [];
        }
        
      } catch (curlError) {
        console.log('❌ Curl command failed, trying native HTTP...');
        
        // Fallback to native HTTP
        const response = await this.makeRequest(url);
        
        if (response.statusCode === 200 && response.data) {
          const jsonData = JSON.parse(response.data);
          if (jsonData.domains && Array.isArray(jsonData.domains)) {
            const domains = this.extractDomainsFromJson(jsonData);
            return domains;
          }
        }
        return [];
      }
      
    } catch (error) {
      console.error('❌ Error in searchDomains:', error);
      throw error;
    }
  }

  extractDomainsFromJson(jsonData) {
    const domains = [];
    
    try {
      if (!jsonData.domains || !Array.isArray(jsonData.domains)) {
        console.log('No domains array found');
        return [];
      }
      
      for (const item of jsonData.domains) {
        if (typeof item === 'object' && item.id) {
          // Extract domain from id field
          const domainId = item.id;
          
          // Check if this domain is masked (not available)
          const isMasked = item.mask && item.mask > 0;
          
          if (!isMasked && domainId) {
            // Convert id to domain name
            const domain = `${domainId}.com`;
            
            // Basic validation
            if (this.isValidDomain(domain)) {
              domains.push(domain.toLowerCase());
            }
          }
        }
      }
    } catch (error) {
      console.log('Error extracting domains from JSON:', error.message);
    }
    
    // Remove duplicates and sort
    const uniqueDomains = [...new Set(domains)].sort();
    console.log(`✅ Final result: ${uniqueDomains.length} unique domains`);
    
    return uniqueDomains;
  }

  isValidDomain(domain) {
    // Basic domain validation
    return domain.length > 4 && 
           domain.length < 50 && 
           domain.includes('.com') &&
           !domain.includes('namegrep') &&
           !domain.includes('google') &&
           !domain.includes('facebook');
  }
}

// Function to be used by the API
async function scrapeAvailableDomains(regexPattern) {
  const scraper = new DirectNameGrepScraper();
  
  try {
    const domains = await scraper.searchDomains(regexPattern);
    return domains;
  } catch (error) {
    console.error('Direct AJAX scraping failed:', error);
    throw error;
  }
}

module.exports = { DirectNameGrepScraper, scrapeAvailableDomains };

// CLI usage
if (require.main === module) {
  const pattern = process.argv[2] || 'alla..';
  
  scrapeAvailableDomains(pattern)
    .then(domains => {
      console.log(`\n🎉 Found ${domains.length} domains:`);
      domains.slice(0, 20).forEach((domain, index) => {
        console.log(`${index + 1}. ${domain}`);
      });
      if (domains.length > 20) {
        console.log(`... and ${domains.length - 20} more domains`);
      }
    })
    .catch(error => {
      console.error('Scraping failed:', error.message);
      process.exit(1);
    });
}

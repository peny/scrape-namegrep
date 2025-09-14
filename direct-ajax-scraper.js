const https = require('https');
const http = require('http');

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
          'Connection': 'keep-alive',
          'Referer': 'https://namegrep.com/',
          ...options.headers
        },
        timeout: 30000,
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
        reject(new Error('Request timeout'));
      });
      
      if (options.body) {
        req.write(options.body);
      }
      
      req.end();
    });
  }

  async getSessionCookie() {
    try {
      console.log('Getting session cookie from namegrep.com...');
      
      const response = await this.makeRequest('https://namegrep.com/');
      
      if (response.statusCode === 200) {
        // Extract cookies from response headers
        const cookies = response.headers['set-cookie'] || [];
        const cookieString = cookies.map(cookie => cookie.split(';')[0]).join('; ');
        
        console.log('Session cookie obtained');
        return cookieString;
      } else {
        console.log('Failed to get session, status:', response.statusCode);
        return '';
      }
    } catch (error) {
      console.log('Error getting session cookie:', error.message);
      return '';
    }
  }

  async searchDomains(regexPattern) {
    try {
      console.log(`Searching for domains with pattern: ${regexPattern}`);
      
      // Get session cookie first
      const cookie = await this.getSessionCookie();
      
      // Try multiple AJAX endpoints
      const endpoints = [
        `/ajax?query=${encodeURIComponent(regexPattern)}`,
        `/api/search?query=${encodeURIComponent(regexPattern)}`,
        `/search?query=${encodeURIComponent(regexPattern)}`,
        `/api/domains?pattern=${encodeURIComponent(regexPattern)}`
      ];
      
      for (const endpoint of endpoints) {
        try {
          console.log(`Trying endpoint: ${endpoint}`);
          
          const response = await this.makeRequest(`https://${this.baseUrl}${endpoint}`, {
            headers: {
              'Cookie': cookie,
              'X-Requested-With': 'XMLHttpRequest',
              'Content-Type': 'application/json'
            }
          });
          
          console.log(`Response status: ${response.statusCode}`);
          console.log(`Response headers:`, response.headers);
          console.log(`Response data length: ${response.data.length}`);
          
          if (response.statusCode === 200 && response.data) {
            console.log(`First 500 chars of response:`, response.data.substring(0, 500));
            
            // Try to parse as JSON
            try {
              const jsonData = JSON.parse(response.data);
              console.log('Successfully parsed JSON response');
              console.log('JSON keys:', Object.keys(jsonData));
              
              const domains = this.extractDomainsFromJson(jsonData);
              if (domains.length > 0) {
                console.log(`Found ${domains.length} domains from ${endpoint}`);
                return domains;
              }
            } catch (parseError) {
              console.log('Failed to parse as JSON:', parseError.message);
              
              // Try to extract domains from HTML/text response
              const domains = this.extractDomainsFromText(response.data);
              if (domains.length > 0) {
                console.log(`Found ${domains.length} domains from text response`);
                return domains;
              }
            }
          }
        } catch (endpointError) {
          console.log(`Endpoint ${endpoint} failed:`, endpointError.message);
          continue;
        }
      }
      
      // If all AJAX endpoints fail, try the main page with hash
      console.log('AJAX endpoints failed, trying main page with hash...');
      const hashUrl = `https://namegrep.com/#${encodeURIComponent(regexPattern)}`;
      
      const response = await this.makeRequest(hashUrl, {
        headers: {
          'Cookie': cookie
        }
      });
      
      if (response.statusCode === 200) {
        const domains = this.extractDomainsFromText(response.data);
        console.log(`Found ${domains.length} domains from main page`);
        return domains;
      }
      
      console.log('All methods failed, returning empty array');
      return [];
      
    } catch (error) {
      console.error('Error in searchDomains:', error);
      throw error;
    }
  }

  extractDomainsFromJson(jsonData) {
    const domains = [];
    
    try {
      // Handle different JSON structures
      let items = [];
      
      if (Array.isArray(jsonData)) {
        items = jsonData;
      } else if (jsonData.domains && Array.isArray(jsonData.domains)) {
        items = jsonData.domains;
      } else if (jsonData.results && Array.isArray(jsonData.results)) {
        items = jsonData.results;
      } else if (jsonData.data && Array.isArray(jsonData.data)) {
        items = jsonData.data;
      }
      
      for (const item of items) {
        if (typeof item === 'string' && item.includes('.com')) {
          const domain = item.toLowerCase().trim();
          if (this.isValidDomain(domain)) {
            domains.push(domain);
          }
        } else if (typeof item === 'object' && item !== null) {
          // Check various possible domain fields
          const domainFields = ['domain', 'name', 'url', 'full', 'label', 'id'];
          
          for (const field of domainFields) {
            if (item[field] && typeof item[field] === 'string' && item[field].includes('.com')) {
              const domain = item[field].toLowerCase().trim();
              if (this.isValidDomain(domain)) {
                domains.push(domain);
                break;
              }
            }
          }
          
          // Check if it's a base name with .com TLD
          const baseName = item.name || item.label || item.id;
          if (baseName && typeof baseName === 'string' && !baseName.includes('.')) {
            const domain = `${baseName.toLowerCase().trim()}.com`;
            if (this.isValidDomain(domain)) {
              domains.push(domain);
            }
          }
        }
      }
    } catch (error) {
      console.log('Error extracting domains from JSON:', error.message);
    }
    
    return [...new Set(domains)]; // Remove duplicates
  }

  extractDomainsFromText(text) {
    const domains = [];
    
    try {
      // Look for .com domains in the text
      const domainRegex = /\b[a-zA-Z0-9][a-zA-Z0-9.-]*\.com\b/g;
      const matches = text.match(domainRegex);
      
      if (matches) {
        for (const match of matches) {
          const domain = match.toLowerCase().trim();
          if (this.isValidDomain(domain)) {
            domains.push(domain);
          }
        }
      }
    } catch (error) {
      console.log('Error extracting domains from text:', error.message);
    }
    
    return [...new Set(domains)]; // Remove duplicates
  }

  isValidDomain(domain) {
    // Filter out common false positives
    const invalidPatterns = [
      'namegrep.com',
      'jquery.com',
      'github.com',
      'google.com',
      'mozilla.com',
      'facebook.com',
      'twitter.com',
      'youtube.com',
      'amazon.com',
      'microsoft.com',
      'localhost',
      'example.com'
    ];
    
    return domain.length > 4 && 
           domain.length < 50 && 
           !invalidPatterns.some(pattern => domain.includes(pattern));
  }
}

// Function to be used by the API
async function scrapeAvailableDomains(regexPattern) {
  const scraper = new DirectNameGrepScraper();
  
  try {
    const domains = await scraper.searchDomains(regexPattern);
    console.log(`Direct AJAX scraper found ${domains.length} domains`);
    return domains;
  } catch (error) {
    console.error('Direct AJAX scraping failed:', error);
    throw error;
  }
}

module.exports = { DirectNameGrepScraper, scrapeAvailableDomains };

// CLI usage
if (require.main === module) {
  const pattern = process.argv[2] || 'test.*';
  
  scrapeAvailableDomains(pattern)
    .then(domains => {
      console.log(`\n🎉 Found ${domains.length} domains:`);
      domains.forEach((domain, index) => {
        console.log(`${index + 1}. ${domain}`);
      });
    })
    .catch(error => {
      console.error('Scraping failed:', error.message);
      process.exit(1);
    });
}

class DomainSearch {
    constructor() {
        this.searchForm = document.getElementById('searchForm');
        this.searchButton = document.getElementById('searchButton');
        this.spinner = document.getElementById('spinner');
        this.buttonText = document.querySelector('.button-text');
        this.resultsSection = document.getElementById('resultsSection');
        this.errorSection = document.getElementById('errorSection');
        this.domainsList = document.getElementById('domainsList');
        this.patternDisplay = document.getElementById('patternDisplay');
        this.countDisplay = document.getElementById('countDisplay');
        this.copyButton = document.getElementById('copyButton');
        this.downloadButton = document.getElementById('downloadButton');
        this.errorMessage = document.getElementById('errorMessage');
        
        // API URL - point to the separate API service
        this.apiUrl = 'https://scrape-namegrep-api.onrender.com';
        
        this.currentDomains = [];
        this.init();
    }

    init() {
        this.searchForm.addEventListener('submit', (e) => this.handleSearch(e));
        this.copyButton.addEventListener('click', () => this.copyResults());
        this.downloadButton.addEventListener('click', () => this.downloadResults());
    }

    async handleSearch(e) {
        e.preventDefault();
        
        const regexPattern = document.getElementById('regexPattern').value.trim();
        
        if (!regexPattern) {
            this.showError('Please enter a regex pattern');
            return;
        }

        this.setLoading(true);
        this.hideResults();
        this.hideError();

        try {
            const response = await fetch(`${this.apiUrl}/api/search-domains`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ regexPattern })
            });

            const data = await response.json();

            if (data.success) {
                this.currentDomains = data.domains;
                this.showResults(data);
            } else {
                this.showError(data.message || 'Failed to search domains');
            }
        } catch (error) {
            console.error('Search error:', error);
            this.showError('Network error: Unable to connect to the server');
        } finally {
            this.setLoading(false);
        }
    }

    setLoading(loading) {
        if (loading) {
            this.searchButton.disabled = true;
            this.buttonText.style.display = 'none';
            this.spinner.style.display = 'inline';
            this.searchButton.classList.add('loading-pulse');
        } else {
            this.searchButton.disabled = false;
            this.buttonText.style.display = 'inline';
            this.spinner.style.display = 'none';
            this.searchButton.classList.remove('loading-pulse');
        }
    }

    showResults(data) {
        this.patternDisplay.textContent = data.pattern;
        this.countDisplay.textContent = `${data.count} domains found`;
        
        if (data.domains.length === 0) {
            this.domainsList.innerHTML = `
                <div class="empty-state">
                    <h3>No domains found</h3>
                    <p>Try adjusting your regex pattern or check if the site is accessible.</p>
                </div>
            `;
        } else {
            this.domainsList.innerHTML = data.domains.map(domain => `
                <div class="domain-item" data-domain="${domain}">
                    ${domain}
                </div>
            `).join('');
            
            // Add click handlers to domain items
            this.domainsList.querySelectorAll('.domain-item').forEach(item => {
                item.addEventListener('click', () => {
                    const domain = item.dataset.domain;
                    this.copyToClipboard(domain);
                    this.showNotification(`Copied ${domain} to clipboard`);
                });
            });
        }
        
        this.resultsSection.style.display = 'block';
    }

    hideResults() {
        this.resultsSection.style.display = 'none';
    }

    showError(message) {
        this.errorMessage.textContent = message;
        this.errorSection.style.display = 'block';
    }

    hideError() {
        this.errorSection.style.display = 'none';
    }

    async copyResults() {
        if (this.currentDomains.length === 0) {
            this.showNotification('No domains to copy');
            return;
        }

        const domainsText = this.currentDomains.join('\n');
        await this.copyToClipboard(domainsText);
        this.showNotification(`Copied ${this.currentDomains.length} domains to clipboard`);
    }

    downloadResults() {
        if (this.currentDomains.length === 0) {
            this.showNotification('No domains to download');
            return;
        }

        const domainsText = this.currentDomains.join('\n');
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const filename = `domains_${timestamp}.txt`;
        
        const blob = new Blob([domainsText], { type: 'text/plain' });
        const url = window.URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
        
        this.showNotification(`Downloaded ${filename}`);
    }

    async copyToClipboard(text) {
        try {
            if (navigator.clipboard && window.isSecureContext) {
                await navigator.clipboard.writeText(text);
            } else {
                // Fallback for older browsers
                const textArea = document.createElement('textarea');
                textArea.value = text;
                textArea.style.position = 'fixed';
                textArea.style.left = '-999999px';
                textArea.style.top = '-999999px';
                document.body.appendChild(textArea);
                textArea.focus();
                textArea.select();
                document.execCommand('copy');
                textArea.remove();
            }
        } catch (error) {
            console.error('Failed to copy to clipboard:', error);
            this.showNotification('Failed to copy to clipboard');
        }
    }

    showNotification(message) {
        // Create notification element
        const notification = document.createElement('div');
        notification.className = 'notification';
        notification.textContent = message;
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: #48bb78;
            color: white;
            padding: 12px 20px;
            border-radius: 8px;
            font-weight: 500;
            z-index: 1000;
            animation: slideIn 0.3s ease;
        `;

        // Add animation styles
        const style = document.createElement('style');
        style.textContent = `
            @keyframes slideIn {
                from {
                    transform: translateX(100%);
                    opacity: 0;
                }
                to {
                    transform: translateX(0);
                    opacity: 1;
                }
            }
        `;
        document.head.appendChild(style);

        document.body.appendChild(notification);

        // Remove notification after 3 seconds
        setTimeout(() => {
            notification.style.animation = 'slideIn 0.3s ease reverse';
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, 300);
        }, 3000);
    }
}

// Initialize the application when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new DomainSearch();
});

// Add some helpful regex examples
document.addEventListener('DOMContentLoaded', () => {
    const input = document.getElementById('regexPattern');
    const examples = [
        '^pr.{1,2}a$',
        '^pe.{2,3}a$',
        '^test.*',
        '.*shop.*',
        '.*app$',
        '^[a-z]{4,6}[0-9]{2,3}$'
    ];
    
    let currentExample = 0;
    
    // Add example button
    const exampleButton = document.createElement('button');
    exampleButton.type = 'button';
    exampleButton.textContent = '📝 Examples';
    exampleButton.className = 'example-button';
    exampleButton.style.cssText = `
        margin-top: 10px;
        padding: 8px 16px;
        background: #e2e8f0;
        border: none;
        border-radius: 6px;
        cursor: pointer;
        font-size: 0.9rem;
        color: #4a5568;
    `;
    
    exampleButton.addEventListener('click', () => {
        input.value = examples[currentExample];
        currentExample = (currentExample + 1) % examples.length;
        input.focus();
    });
    
    input.parentNode.appendChild(exampleButton);
});

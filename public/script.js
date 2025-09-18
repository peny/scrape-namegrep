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
        this.copyButtonTop = document.getElementById('copyButtonTop');
        this.downloadButtonTop = document.getElementById('downloadButtonTop');
        this.shareButton = document.getElementById('shareButton');
        this.shareButtonTop = document.getElementById('shareButtonTop');
        this.examplesButton = document.getElementById('examplesButton');
        this.errorMessage = document.getElementById('errorMessage');
        
        // API URL - use local API for development, production API for deployed frontend
        this.apiUrl = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' 
            ? `http://${window.location.hostname}:3000` 
            : 'https://scrape-namegrep-api.onrender.com';
        
        this.currentDomains = [];
        this.currentPattern = '';
        this.init();
    }

    init() {
        this.searchForm.addEventListener('submit', (e) => this.handleSearch(e));
        this.copyButton.addEventListener('click', () => this.copyResults());
        this.downloadButton.addEventListener('click', () => this.downloadResults());
        this.copyButtonTop.addEventListener('click', () => this.copyResults());
        this.downloadButtonTop.addEventListener('click', () => this.downloadResults());
        this.shareButton?.addEventListener('click', () => this.shareResults());
        this.shareButtonTop?.addEventListener('click', () => this.shareResults());
        this.examplesButton.addEventListener('click', () => this.showExamples());
        
        // Check for hash on page load
        this.checkHashOnLoad();

        // Show default empty state on first load when no hash is present
        if (!window.location.hash || !window.location.hash.startsWith('#search=')) {
            const defaultPattern = document.getElementById('regexPattern')?.value || '';
            this.showResults({ pattern: defaultPattern, count: 0, domains: [] });
        }
    }

    async handleSearch(e) {
        e.preventDefault();
        
        const regexPattern = document.getElementById('regexPattern').value.trim();
        
        if (!regexPattern) {
            this.showError('Please enter a regex pattern');
            return;
        }

        // Store current pattern for sharing
        this.currentPattern = regexPattern;
        
        // Translate user-friendly patterns to NameGrep syntax
        const translatedPattern = this.translateRegexPattern(regexPattern);
        console.log(`Original pattern: ${regexPattern}`);
        console.log(`Translated pattern: ${translatedPattern}`);

        this.setLoading(true);
        this.hideResults();
        this.hideError();

        try {
            const response = await fetch(`${this.apiUrl}/api/search-domains`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ regexPattern: translatedPattern })
            });

            const data = await response.json();

            if (data.success) {
                // Filter to .com domains only and dedupe
                const filteredDomains = Array.isArray(data.domains)
                    ? [...new Set(data.domains.filter(d => typeof d === 'string' && d.toLowerCase().endsWith('.com')).map(d => d.toLowerCase()))]
                    : [];
                this.currentDomains = filteredDomains;
                
                // Always show results, even if empty
                this.showResults({ ...data, domains: filteredDomains, count: filteredDomains.length });
                // Update URL hash for sharing
                this.updateUrlHash(this.currentPattern);
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
            const hasSpecialChars = /[öäåÖÄÅ]/.test(data.pattern);
            const specialCharNote = hasSpecialChars ? 
                "<br><small>💡 <strong>Tips:</strong> Specialtecken som ö, ä, å kan ge färre resultat. Prova engelska bokstäver istället!</small>" : "";
            
            this.domainsList.innerHTML = `
                <div class="empty-state">
                    <div class="empty-icon">🔍</div>
                    <h3>Inga tillgängliga domäner hittades</h3>
                    <p>För mönstret <code>"${data.pattern}"</code> hittades inga tillgängliga .com-domäner.</p>
                    <div class="empty-suggestions">
                        <p><strong>Prova dessa tips:</strong></p>
                        <ul>
                            <li>📝 Kontrollera stavningen i ditt mönster</li>
                            <li>🎯 Använd enklare mönster först (t.ex. "test.*")</li>
                            <li>🔄 Prova andra kombinationer av bokstäver</li>
                            <li>💡 Använd knappen "📋 Examples" för inspiration</li>
                        </ul>
                    </div>
                    ${specialCharNote}
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

    showExamples() {
        const examples = [
            '(konsonant)(vokal)(konsonant)are',
            '^pe[a-zA-Z]{2,3}a$',
            '(konsonant)(vokal)(konsonant)(vokal)',
            '^[a-zA-Z]{1,2}pola$',
            '^sk[a-zA-Z]{2,3}a$',
            '^(:astronomy/planets:).$'
        ];
        
        const input = document.getElementById('regexPattern');
        const randomExample = examples[Math.floor(Math.random() * examples.length)];
        input.value = randomExample;
        input.focus();
    }

    // Translate user-friendly regex patterns to NameGrep syntax
    translateRegexPattern(pattern) {
        // Replace (konsonant) with (:alphabet/letters/consonants:)
        pattern = pattern.replace(/\(konsonant\)/gi, '(:alphabet/letters/consonants:)');
        
        // Replace (vokal) with (:alphabet/letters/vowels:)
        pattern = pattern.replace(/\(vokal\)/gi, '(:alphabet/letters/vowels:)');
        
        // Log pattern translation for debugging special characters
        console.log(`Pattern translation: "${this.currentPattern}" → "${pattern}"`);
        console.log(`URL encoding: "${pattern}" → "${encodeURIComponent(pattern)}"`);
        
        return pattern;
    }

    // Hash functionality for sharing search results
    checkHashOnLoad() {
        const hash = window.location.hash;
        if (hash && hash.startsWith('#search=')) {
            try {
                const encodedPattern = hash.substring(8); // Remove '#search='
                const pattern = decodeURIComponent(encodedPattern);
                
                // Set the pattern in the input field
                document.getElementById('regexPattern').value = pattern;
                
                // Automatically trigger search
                this.handleSearchFromHash(pattern);
            } catch (error) {
                console.error('Error parsing hash:', error);
            }
        }
    }

    async handleSearchFromHash(pattern) {
        this.currentPattern = pattern;
        
        // Translate user-friendly patterns to NameGrep syntax
        const translatedPattern = this.translateRegexPattern(pattern);
        console.log(`Hash pattern - Original: ${pattern}, Translated: ${translatedPattern}`);
        
        this.setLoading(true);
        this.hideResults();
        this.hideError();

        try {
            const response = await fetch(`${this.apiUrl}/api/search-domains`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ regexPattern: translatedPattern })
            });

            const data = await response.json();

            if (data.success) {
                const filteredDomains = Array.isArray(data.domains)
                    ? [...new Set(data.domains.filter(d => typeof d === 'string' && d.toLowerCase().endsWith('.com')).map(d => d.toLowerCase()))]
                    : [];
                this.currentDomains = filteredDomains;
                this.showResults({ ...data, domains: filteredDomains, count: filteredDomains.length });
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

    shareResults() {
        if (!this.currentPattern || this.currentDomains.length === 0) {
            this.showNotification('No search results to share');
            return;
        }

        try {
            // Create shareable URL with hash
            const encodedPattern = encodeURIComponent(this.currentPattern);
            const shareUrl = `${window.location.origin}${window.location.pathname}#search=${encodedPattern}`;
            
            // Copy to clipboard
            navigator.clipboard.writeText(shareUrl).then(() => {
                this.showNotification(`🔗 Share link copied! ${this.currentDomains.length} domains for "${this.currentPattern}"`);
            }).catch(() => {
                // Fallback for older browsers
                const textArea = document.createElement('textarea');
                textArea.value = shareUrl;
                document.body.appendChild(textArea);
                textArea.select();
                document.execCommand('copy');
                document.body.removeChild(textArea);
                this.showNotification(`🔗 Share link copied! ${this.currentDomains.length} domains for "${this.currentPattern}"`);
            });
        } catch (error) {
            console.error('Error sharing results:', error);
            this.showNotification('Error creating share link');
        }
    }

    updateUrlHash(pattern) {
        if (pattern) {
            const encodedPattern = encodeURIComponent(pattern);
            window.history.replaceState(null, null, `#search=${encodedPattern}`);
        } else {
            window.history.replaceState(null, null, window.location.pathname);
        }
    }
}

// Initialize the application when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new DomainSearch();
});


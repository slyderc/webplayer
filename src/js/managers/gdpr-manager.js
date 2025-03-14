/**
 * GDPRManager - Handles GDPR compliance and cookie consent
 */
class GDPRManager {
    constructor(options = {}) {
        this.options = {
            consentCookieName: 'nwr_gdpr_consent',
            consentDuration: 365, // Days until consent expires
            ...options
        };
        
        this.storageService = options.storageService || null;
        this.overlay = document.getElementById('gdprConsentOverlay');
        this.consentButton = document.getElementById('gdprConsentButton');
        this.logoClickable = document.querySelector('#liveView .logo-container img');
        
        if (!this.storageService) {
            console.error('GDPRManager requires StorageService');
            return;
        }
        
        this.setupEventListeners();
    }
    
    setupEventListeners() {
        // Consent button click handler
        if (this.consentButton) {
            this.consentButton.addEventListener('click', () => this.giveConsent());
        }
        
        // Logo click for re-showing the consent dialog
        if (this.logoClickable) {
            this.logoClickable.addEventListener('click', () => this.showConsentOverlay());
            this.logoClickable.style.cursor = 'pointer'; // Add pointer cursor
        }
    }
    
    /**
     * Check if user has consented to GDPR already
     */
    hasConsent() {
        return !!this.storageService.getItem(this.options.consentCookieName, false);
    }
    
    /**
     * Give GDPR consent
     */
    giveConsent() {
        // Calculate expiry date - current date + consent duration in days
        const expiryDate = new Date();
        expiryDate.setDate(expiryDate.getDate() + this.options.consentDuration);
        
        // Store consent with expiry date
        this.storageService.setItem(this.options.consentCookieName, {
            consent: true,
            timestamp: new Date().toISOString(),
            expires: expiryDate.toISOString()
        });
        
        // Hide consent overlay
        this.hideConsentOverlay();
        
        // Trigger any post-consent actions (like preloading content)
        if (this.options.onConsentGiven && typeof this.options.onConsentGiven === 'function') {
            this.options.onConsentGiven();
        }
    }
    
    /**
     * Check if consent is needed/valid
     */
    checkConsent() {
        const consent = this.storageService.getItem(this.options.consentCookieName, null);
        
        // If no consent at all, we need to show the overlay
        if (!consent) {
            this.showConsentOverlay();
            return false;
        }
        
        // Check if consent has expired
        if (consent.expires) {
            const expiryDate = new Date(consent.expires);
            const now = new Date();
            
            // If expired, show overlay again
            if (now > expiryDate) {
                this.showConsentOverlay();
                return false;
            }
        }
        
        return true;
    }
    
    /**
     * Show the consent overlay
     */
    showConsentOverlay() {
        if (this.overlay) {
            this.overlay.classList.add('active');
        }
    }
    
    /**
     * Hide the consent overlay
     */
    hideConsentOverlay() {
        if (this.overlay) {
            this.overlay.classList.remove('active');
        }
    }
}

// Export as global or module depending on environment
if (typeof module !== 'undefined' && module.exports) {
    module.exports = GDPRManager;
} else {
    window.GDPRManager = GDPRManager;
}
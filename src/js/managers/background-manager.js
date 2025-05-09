/**
 * BackgroundManager - Handles background image transitions
 */
class BackgroundManager {
    constructor(options = {}) {
        this.options = {
            defaultArtwork: '/player/NWR_text_logo_angle.png',
            debugMode: false, // Set to true to enable debug logging
            ...options
        };
        
        this.currentArtworkUrl = '';
        this.activeBackground = 1;
        this.setupBackgroundElements();
    }
    
    /**
     * Debug logging function that only logs when debugMode is enabled
     * @param {string} message - Message to log
     * @param {*} data - Optional data to log
     */
    debug(message, data) {
        if (this.options.debugMode) {
            if (data !== undefined) {
                console.log(`[BackgroundManager] ${message}`, data);
            } else {
                console.log(`[BackgroundManager] ${message}`);
            }
        }
    }
    
    setupBackgroundElements() {
        // Create background container
        this.bgContainer = document.createElement('div');
        this.bgContainer.className = 'artwork-background';
        
        // Create the blurred background image element
        this.bgImage = document.createElement('div');
        this.bgImage.className = 'artwork-bg-image';
        
        // Create overlay for better readability
        this.bgOverlay = document.createElement('div');
        this.bgOverlay.className = 'artwork-overlay';
        
        // Assemble and append to the document
        this.bgContainer.appendChild(this.bgImage);
        this.bgContainer.appendChild(this.bgOverlay);
        document.body.insertBefore(this.bgContainer, document.body.firstChild);
        
        // Create a second background container for smooth transitions
        this.bgContainer2 = document.createElement('div');
        this.bgContainer2.className = 'artwork-background';
        
        this.bgImage2 = document.createElement('div');
        this.bgImage2.className = 'artwork-bg-image';
        
        this.bgOverlay2 = document.createElement('div');
        this.bgOverlay2.className = 'artwork-overlay';
        
        this.bgContainer2.appendChild(this.bgImage2);
        this.bgContainer2.appendChild(this.bgOverlay2);
        document.body.insertBefore(this.bgContainer2, document.body.firstChild);
        
        // Set initial active state
        this.activeBackground = 1;
        this.bgContainer.classList.add('active');
    }
    
    updateBackground(imageUrl, currentTab, forceUpdate = false) {
        this.debug('Background update requested:', {imageUrl, tab: currentTab, force: forceUpdate});
        
        // Skip if it's the same URL or a default image, unless force update is requested
        if (!forceUpdate && (imageUrl === this.currentArtworkUrl || 
            (this.options.defaultArtwork && imageUrl.includes(this.options.defaultArtwork)))) {
            this.debug('Skipping background update - same URL or default image');
            return;
        }
        
        // Store current artwork URL even if it's default image
        this.currentArtworkUrl = imageUrl;
        
        // Don't update background if it's the default image
        if (this.options.defaultArtwork && imageUrl.includes(this.options.defaultArtwork)) {
            this.debug('Skipping background update - default artwork');
            return;
        }
        
        // Only update if we're on the live tab
        if (currentTab !== 'live' && !forceUpdate) {
            this.debug('Skipping background update - not on live tab');
            return;
        }
        
        this.debug('Updating background with image:', imageUrl);
        
        // Toggle between the two background containers for smooth transitions
        const activeBg = this.activeBackground === 1 ? this.bgImage2 : this.bgImage;
        const activeContainer = this.activeBackground === 1 ? this.bgContainer2 : this.bgContainer;
        const inactiveContainer = this.activeBackground === 1 ? this.bgContainer : this.bgContainer2;
        
        // Set the new background image
        activeBg.style.backgroundImage = `url(${imageUrl})`;
        
        // Hide the current background and show the new one
        inactiveContainer.classList.remove('active');
        activeContainer.classList.add('active');
        
        // Toggle the active background for next update
        this.activeBackground = this.activeBackground === 1 ? 2 : 1;
    }
}

// Export as global or module depending on environment
if (typeof module !== 'undefined' && module.exports) {
    module.exports = BackgroundManager;
} else {
    window.BackgroundManager = BackgroundManager;
}
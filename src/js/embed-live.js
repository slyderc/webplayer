/**
 * Live embed functionality for Now Wave Radio
 */
(function() {
    'use strict';
    
    // DOM Elements - initialized from window.NWR_EMBED_ELEMENTS
    // which is set in the embed.php file to handle unique IDs
    let albumArtElement;
    let trackTitleElement;
    let trackArtistElement;
    let errorMessageElement;
    
    // Config
    const config = window.NWR_CONFIG || {};
    const embedConfig = window.NWR_EMBED || {};
    const apiEndpoint = config.apiEndpoint || '/api/nowplaying';
    const defaultArtwork = config.defaultArtwork || '/player/NWR_text_logo_angle.png';
    const updateInterval = 15000; // 15 seconds
    const maxErrorRetries = 3;
    
    // State tracking
    let errorCount = 0;
    let updateTimer = null;
    let isInitialized = false;
    
    // Create metadata service instance
    const metadataService = (typeof MetadataService !== 'undefined') ?
        new MetadataService({
            endpoint: apiEndpoint,
            defaultArtwork: defaultArtwork
        }) :
        {
            getCurrentTrack: () => Promise.resolve(null)
        };
    
    // Create storage service for caching
    const storageService = (typeof StorageService !== 'undefined') ? 
        new StorageService({
            prefix: 'nwr_embed_'
        }) : 
        { 
            getItem: () => null,
            setItem: () => false,
            get: () => null,
            set: () => false
        };
    
    /**
     * Update the now playing display
     */
    function updateNowPlaying() {
        // Check for DOM elements, return if not available
        if (!albumArtElement || !trackTitleElement || !trackArtistElement) {
            console.error('Required DOM elements not available for the embed');
            return;
        }
        
        // Hide error message if visible
        if (errorMessageElement) {
            errorMessageElement.style.display = 'none';
        }
        
        metadataService.getCurrentTrack()
            .then(trackData => {
                if (!trackData) {
                    // Try to use cached data if available
                    const cachedTrack = getCachedTrack();
                    if (cachedTrack) {
                        updateDisplay(cachedTrack);
                        return;
                    }
                    
                    // Handle no data case
                    incrementErrorCount();
                    return;
                }
                
                // Reset error count on success
                errorCount = 0;
                
                // Cache the track data
                cacheTrack(trackData);
                
                // Update the display
                updateDisplay(trackData);
            })
            .catch(error => {
                console.error('Error fetching current track:', error);
                incrementErrorCount();
                
                // Try to use cached data if available
                const cachedTrack = getCachedTrack();
                if (cachedTrack) {
                    updateDisplay(cachedTrack);
                }
            });
    }
    
    /**
     * Update the display with track data
     */
    function updateDisplay(trackData) {
        if (!trackData) return;
        
        // Update the display
        if (trackData.artwork_url) {
            albumArtElement.src = trackData.artwork_url;
        } else {
            albumArtElement.src = defaultArtwork;
        }
        
        trackTitleElement.textContent = trackData.title || 'Unknown Track';
        trackArtistElement.textContent = trackData.artist || 'Unknown Artist';
        
        // Set titles for tooltips on truncated text
        trackTitleElement.title = trackData.title || '';
        trackArtistElement.title = trackData.artist || '';
    }
    
    /**
     * Cache track data for offline/error cases
     */
    function cacheTrack(trackData) {
        if (!trackData) return;
        
        try {
            storageService.setItem('current_track', JSON.stringify({
                ...trackData,
                cached_at: new Date().toISOString()
            }));
        } catch (e) {
            console.warn('Error caching track data:', e);
        }
    }
    
    /**
     * Get cached track data
     */
    function getCachedTrack() {
        try {
            const cachedData = storageService.getItem('current_track');
            if (!cachedData) return null;
            
            return JSON.parse(cachedData);
        } catch (e) {
            console.warn('Error retrieving cached track:', e);
            return null;
        }
    }
    
    /**
     * Increment error count and show error message if needed
     */
    function incrementErrorCount() {
        errorCount++;
        
        if (errorCount >= maxErrorRetries && errorMessageElement) {
            errorMessageElement.style.display = 'block';
        }
    }
    
    /**
     * Initialize DOM references from the global NWR_EMBED_ELEMENTS object
     */
    function initializeDomReferences() {
        const elements = window.NWR_EMBED_ELEMENTS || {};
        
        albumArtElement = elements.albumArt;
        trackTitleElement = elements.trackTitle;
        trackArtistElement = elements.trackArtist;
        errorMessageElement = elements.errorMessage;
        
        if (!albumArtElement || !trackTitleElement || !trackArtistElement) {
            console.error('Required DOM elements not found for live embed');
            return false;
        }
        
        return true;
    }
    
    // Initialize
    function init() {
        // Check if already initialized
        if (isInitialized) return;
        
        // Initialize DOM references
        if (!initializeDomReferences()) {
            // If DOM elements not available, try again in 100ms
            setTimeout(init, 100);
            return;
        }
        
        // Mark as initialized
        isInitialized = true;
        
        // Handle errors for album art
        if (albumArtElement) {
            albumArtElement.addEventListener('error', () => {
                albumArtElement.src = defaultArtwork;
            });
        }
        
        // Try to use cached data immediately
        const cachedTrack = getCachedTrack();
        if (cachedTrack) {
            updateDisplay(cachedTrack);
        }
        
        // Initial update
        updateNowPlaying();
        
        // Set up periodic updates
        updateTimer = setInterval(updateNowPlaying, updateInterval);
        
        // Register for visibility changes to pause updates when not visible
        if (typeof document.hidden !== 'undefined') {
            document.addEventListener('visibilitychange', () => {
                if (document.hidden) {
                    // Page is hidden, clear timer to save resources
                    if (updateTimer) {
                        clearInterval(updateTimer);
                        updateTimer = null;
                    }
                } else {
                    // Page is visible again, restart updates
                    if (!updateTimer) {
                        updateNowPlaying();
                        updateTimer = setInterval(updateNowPlaying, updateInterval);
                    }
                }
            });
        }
    }
    
    // Start when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
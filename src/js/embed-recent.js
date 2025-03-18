/**
 * Recent tracks embed functionality for Now Wave Radio
 */
(function() {
    'use strict';
    
    // DOM Elements - initialized from window.NWR_EMBED_ELEMENTS
    // which is set in the embed.php file to handle unique IDs
    let recentTracksContainer;
    let errorMessageElement;
    
    // Config
    const config = window.NWR_CONFIG || {};
    const embedConfig = window.NWR_EMBED || {};
    const apiEndpoint = config.apiEndpoint || '/api/nowplaying';
    const defaultArtwork = config.defaultArtwork || '/player/NWR_text_logo_angle.png';
    const limit = embedConfig.limit || 5;
    const updateInterval = 60000; // 60 seconds
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
            getRecentTracks: () => Promise.resolve([])
        };
    
    // Create storage service for persistence 
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
     * Format time elapsed since a given date
     * @param {string|Date} date - The date to compare against
     * @returns {string} - Formatted time string (e.g., "5 minutes ago")
     */
    function formatTimeElapsed(date) {
        if (!date) return '';
        
        const seconds = Math.floor((new Date() - new Date(date)) / 1000);
        
        if (seconds < 60) return 'just now';
        if (seconds < 3600) return `${Math.floor(seconds / 60)} minutes ago`;
        if (seconds < 86400) return `${Math.floor(seconds / 3600)} hours ago`;
        return `${Math.floor(seconds / 86400)} days ago`;
    }
    
    /**
     * Update the recent tracks display
     */
    function updateRecentTracks() {
        // Check for DOM elements, return if not available
        if (!recentTracksContainer) {
            console.error('Required DOM elements not available for the embed');
            return;
        }
        
        // Hide error message if visible
        if (errorMessageElement) {
            errorMessageElement.style.display = 'none';
        }
        
        metadataService.getRecentTracks(limit)
            .then(tracks => {
                if (!tracks || !tracks.length) {
                    // Try to use cached data if available
                    const cachedTracks = getCachedTracks();
                    if (cachedTracks && cachedTracks.length) {
                        updateDisplay(cachedTracks);
                        return;
                    }
                    
                    // Handle no data case
                    recentTracksContainer.innerHTML = '<div class="embed-empty-state">No recent tracks to display</div>';
                    return;
                }
                
                // Reset error count on success
                errorCount = 0;
                
                // Cache the tracks data
                cacheTracks(tracks);
                
                // Update the display
                updateDisplay(tracks);
            })
            .catch(error => {
                console.error('Error fetching recent tracks:', error);
                incrementErrorCount();
                
                // Try to use cached data if available
                const cachedTracks = getCachedTracks();
                if (cachedTracks && cachedTracks.length) {
                    updateDisplay(cachedTracks);
                } else if (errorCount >= maxErrorRetries) {
                    recentTracksContainer.innerHTML = '<div class="embed-error-state">Unable to load recent tracks</div>';
                }
            });
    }
    
    /**
     * Update the display with track data
     */
    function updateDisplay(tracks) {
        if (!tracks || !tracks.length) return;
        
        const tracksHTML = tracks.slice(0, limit).map((track, index) => {
            const artworkUrl = track.artwork_url || defaultArtwork;
            const timeAgo = formatTimeElapsed(track.played_at);
            const title = track.title || 'Unknown Track';
            const artist = track.artist || 'Unknown Artist';
            
            return `
                <div class="embed-track-item">
                    <div class="embed-track-number">${index + 1}</div>
                    <img class="embed-track-artwork" 
                         src="${artworkUrl}" 
                         alt="${title} artwork"
                         onerror="this.src='${defaultArtwork}'">
                    <div class="embed-track-details">
                        <p class="embed-track-item-title" title="${title}">${title}</p>
                        <p class="embed-track-item-artist" title="${artist}">${artist}</p>
                    </div>
                    <div class="embed-track-timestamp">${timeAgo}</div>
                </div>
            `;
        }).join('');
        
        recentTracksContainer.innerHTML = tracksHTML;
    }
    
    /**
     * Cache tracks data for offline/error cases
     */
    function cacheTracks(tracks) {
        if (!tracks || !tracks.length) return;
        
        try {
            storageService.setItem('recent_tracks', JSON.stringify({
                tracks: tracks,
                cached_at: new Date().toISOString()
            }));
        } catch (e) {
            console.warn('Error caching tracks data:', e);
        }
    }
    
    /**
     * Get cached tracks data
     */
    function getCachedTracks() {
        try {
            const cachedData = storageService.getItem('recent_tracks');
            if (!cachedData) return null;
            
            const data = JSON.parse(cachedData);
            return data.tracks || [];
        } catch (e) {
            console.warn('Error retrieving cached tracks:', e);
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
        
        recentTracksContainer = elements.recentTracks;
        errorMessageElement = elements.errorMessage;
        
        // If not defined in the global variable, try to find by ID
        if (!recentTracksContainer) {
            const embedId = window.NWR_EMBED?.id || '';
            
            if (embedId) {
                recentTracksContainer = document.getElementById(`embed-recent-tracks-${embedId}`);
            }
            
            // If still not found, try a direct query selector
            if (!recentTracksContainer) {
                recentTracksContainer = document.querySelector('.embed-recent-tracks');
            }
        }
        
        // Do the same for error message element
        if (!errorMessageElement) {
            const embedId = window.NWR_EMBED?.id || '';
            
            if (embedId) {
                errorMessageElement = document.getElementById(`embed-error-${embedId}`);
            }
            
            // If still not found, try a direct query selector
            if (!errorMessageElement) {
                errorMessageElement = document.querySelector('.embed-error-message');
            }
        }
        
        if (!recentTracksContainer) {
            console.error('Required DOM elements not found for recent tracks embed');
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
        
        // Try to use cached data immediately
        const cachedTracks = getCachedTracks();
        if (cachedTracks && cachedTracks.length) {
            updateDisplay(cachedTracks);
        }
        
        // Initial update
        updateRecentTracks();
        
        // Set up periodic updates
        updateTimer = setInterval(updateRecentTracks, updateInterval);
        
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
                        updateRecentTracks();
                        updateTimer = setInterval(updateRecentTracks, updateInterval);
                    }
                }
            });
        }
        
        // Listen for metadata updates if in same domain
        window.addEventListener('message', function(event) {
            // Verify origin for security
            if (event.origin !== window.location.origin) return;
            
            if (event.data && event.data.type === 'nwr_track_update') {
                updateRecentTracks();
            }
        });
    }
    
    // Start when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
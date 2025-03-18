/**
 * Recent tracks embed functionality for Now Wave Radio
 * Depends on embed.js for shared functionality
 */
(function() {
    'use strict';
    
    // Wait for the base embed module to be ready
    function initialize() {
        // Make sure the base embed module is initialized
        if (!window.NWR || !window.NWR.embed) {
            console.error('Base embed module not loaded');
            return;
        }
        
        const embed = window.NWR.embed;
        const settings = embed.settings;
        const utils = embed.utils;
        
        // DOM Elements
        let recentTracksContainer;
        let errorMessageElement;
        
        // Make sure services are available
        if (!embed.services) {
            console.error('Embed services not initialized');
            return;
        }
        
        // Services
        const services = embed.services;
        const metadataService = services.metadataService;
        const storageService = services.storageService;
        
        // State tracking
        let errorCount = 0;
        const timers = {
            updateTimer: null
        };
        let isInitialized = false;
        
        /**
         * Update the recent tracks display
         */
        function updateRecentTracks() {
            // Make sure we have our container
            if (!recentTracksContainer) {
                if (!initializeDomReferences()) {
                    console.error('Could not find tracks container element');
                    return;
                }
            }
            
            // Hide error message if visible
            if (errorMessageElement) {
                errorMessageElement.style.display = 'none';
            }
            
            // Show loading indicator
            recentTracksContainer.innerHTML = '<div class="embed-loading">Loading recent tracks...</div>';
            
            // Fetch track history from our server
            metadataService.getRecentTracks(settings.limit)
                .then(tracks => {
                    if (!tracks || !tracks.length) {
                        // Handle no data case
                        recentTracksContainer.innerHTML = '<div class="embed-empty-state">No recent tracks to display</div>';
                        return;
                    }
                    
                    // Reset error count on success
                    errorCount = 0;
                    
                    // Update the display with tracks from history.json
                    updateDisplay(tracks);
                })
                .catch(error => {
                    console.error('Error fetching recent tracks:', error);
                    incrementErrorCount();
                    
                    // Show error message after too many retries
                    if (errorCount >= settings.maxErrorRetries && errorMessageElement) {
                        errorMessageElement.style.display = 'block';
                        recentTracksContainer.innerHTML = '<div class="embed-empty-state">Unable to load track history</div>';
                    }
                });
        }
        
        /**
         * Update the display with track data
         */
        function updateDisplay(tracks) {
            if (!tracks || !tracks.length) return;
            
            const tracksHTML = tracks.slice(0, settings.limit).map((track, index) => {
                const artworkUrl = track.artwork_url || settings.defaultArtwork;
                const timeAgo = utils.formatTimeElapsed(track.played_at);
                const title = track.title || 'Unknown Track';
                const artist = track.artist || 'Unknown Artist';
                
                return `
                    <div class="embed-track-item">
                        <div class="embed-track-number">${index + 1}</div>
                        <img class="embed-track-artwork" 
                             src="${artworkUrl}" 
                             alt="${title} artwork"
                             onerror="this.src='${settings.defaultArtwork}'">
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
         * We don't need caching since we're using history.json directly
         * These functions remain as stubs for compatibility
         */
        function cacheTracks(tracks) {
            // No longer needed - history.json handles persistence
            return;
        }
        
        function getCachedTracks() {
            // No longer needed - history.json is our source of truth
            return null;
        }
        
        /**
         * Increment error count and show error message if needed
         */
        function incrementErrorCount() {
            errorCount++;
            
            if (errorCount >= settings.maxErrorRetries && errorMessageElement) {
                errorMessageElement.style.display = 'block';
            }
        }
        
        /**
         * Initialize DOM references
         */
        function initializeDomReferences() {
            const embedId = utils.getEmbedId();
            console.log('Recent tracks embed initializing with ID:', embedId);
            
            // Get elements from the global object if available
            const elements = window.NWR_EMBED_ELEMENTS || {};
            recentTracksContainer = elements.recentTracks;
            errorMessageElement = elements.errorMessage;
            
            // If not found via global object, try standard selectors
            if (!recentTracksContainer) {
                recentTracksContainer = 
                    document.getElementById(`embed-recent-tracks-${embedId}`) ||
                    document.getElementById('embedRecentTracks') ||
                    document.querySelector('.embed-recent-tracks');
            }
            
            if (!errorMessageElement) {
                errorMessageElement = 
                    document.getElementById(`embed-error-${embedId}`) ||
                    document.querySelector('.embed-error-message');
            }
            
            if (!recentTracksContainer) {
                console.error('Required container not found for recent tracks embed');
                return false;
            }
            
            return true;
        }
        
        // Main initialization function
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
            
            // Initial update immediately
            updateRecentTracks();
            
            // Set up periodic updates
            timers.updateTimer = setInterval(updateRecentTracks, settings.updateInterval.recent);
            
            // Set up event listeners for track changes with callback that can handle track data
            embed.setupEvents((eventData) => {
                if (eventData && eventData.history && Array.isArray(eventData.history)) {
                    // If we received track history data directly, use it
                    console.log('Received track history from event, updating display directly');
                    updateDisplay(eventData.history);
                } else {
                    // Otherwise, fetch tracks as usual
                    updateRecentTracks();
                }
            });
            
            // Set up visibility change detection
            embed.setupVisibility(timers, updateRecentTracks, settings.updateInterval.recent);
        }
        
        // Start when DOM is ready
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', init);
        } else {
            init();
        }
    }
    
    // Check if we can initialize now or need to wait
    function checkAndInitialize() {
        try {
            if (window.NWR && window.NWR.embed && window.NWR.embed.services) {
                console.log('Recent tracks embed: Base module ready with services');
                initialize();
            } else {
                console.log('Recent tracks embed: Waiting for base module');
                
                // Listen for the ready event
                document.addEventListener('nwr:embed:ready', function() {
                    console.log('Recent tracks embed: Received ready event');
                    try {
                        initialize();
                    } catch (err) {
                        console.error('Error during initialization after ready event:', err);
                    }
                });
                
                // Also try again after a delay as a fallback
                setTimeout(function() {
                    try {
                        if (window.NWR && window.NWR.embed && window.NWR.embed.services) {
                            console.log('Recent tracks embed: Base module ready after delay');
                            initialize();
                        } else {
                            console.warn('Recent tracks embed: Base module still not ready after delay');
                            // Last resort - try to initialize even without services
                            console.log('Attempting last resort initialization');
                            initialize();
                        }
                    } catch (err) {
                        console.error('Error during delayed initialization:', err);
                    }
                }, 1000); // Increased delay time
            }
        } catch (err) {
            console.error('Error in checkAndInitialize:', err);
        }
    }
    
    // Start initialization process
    checkAndInitialize();
})();
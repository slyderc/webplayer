/**
 * Live embed functionality for Now Wave Radio
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
        let albumArtElement;
        let trackTitleElement;
        let trackArtistElement;
        let errorMessageElement;
        
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
                albumArtElement.src = settings.defaultArtwork;
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
            
            if (errorCount >= settings.maxErrorRetries && errorMessageElement) {
                errorMessageElement.style.display = 'block';
            }
        }
        
        /**
         * Initialize DOM references
         */
        function initializeDomReferences() {
            const embedId = utils.getEmbedId();
            console.log('Live embed initializing with ID:', embedId);
            
            // Try to get elements from the global object first
            const elements = window.NWR_EMBED_ELEMENTS || {};
            albumArtElement = elements.albumArt;
            trackTitleElement = elements.trackTitle;
            trackArtistElement = elements.trackArtist;
            errorMessageElement = elements.errorMessage;
            
            // Try to find by ID if not found
            if (!albumArtElement) {
                albumArtElement = utils.findElement(
                    `embed-album-art-${embedId}`, 
                    'embed-album-art', 
                    '.artwork-container img'
                );
            }
            
            if (!trackTitleElement) {
                trackTitleElement = utils.findElement(
                    `embed-track-title-${embedId}`, 
                    'embed-track-title',
                    'h2'
                );
            }
            
            if (!trackArtistElement) {
                trackArtistElement = utils.findElement(
                    `embed-track-artist-${embedId}`, 
                    'embed-track-artist',
                    'p'
                );
            }
            
            if (!errorMessageElement) {
                errorMessageElement = utils.findElement(
                    `embed-error-${embedId}`, 
                    'embed-error-message',
                    null
                );
            }
            
            if (!albumArtElement || !trackTitleElement || !trackArtistElement) {
                console.error('Required DOM elements not found for live embed');
                return false;
            }
            
            // Set up error handler for album art
            if (albumArtElement) {
                albumArtElement.addEventListener('error', () => {
                    albumArtElement.src = settings.defaultArtwork;
                });
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
            
            // Try to use cached data immediately
            const cachedTrack = getCachedTrack();
            if (cachedTrack) {
                updateDisplay(cachedTrack);
            }
            
            // Initial update
            updateNowPlaying();
            
            // Set up periodic updates
            timers.updateTimer = setInterval(updateNowPlaying, settings.updateInterval.live);
            
            // Set up event listeners for track changes
            embed.setupEvents(updateNowPlaying);
            
            // Set up visibility change detection
            embed.setupVisibility(timers, updateNowPlaying, settings.updateInterval.live);
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
        if (window.NWR && window.NWR.embed && window.NWR.embed.services) {
            console.log('Live embed: Base module ready with services');
            initialize();
        } else {
            console.log('Live embed: Waiting for base module');
            
            // Listen for the ready event
            document.addEventListener('nwr:embed:ready', function() {
                console.log('Live embed: Received ready event');
                initialize();
            });
            
            // Also try again after a delay as a fallback
            setTimeout(function() {
                if (window.NWR && window.NWR.embed && window.NWR.embed.services) {
                    console.log('Live embed: Base module ready after delay');
                    initialize();
                } else {
                    console.warn('Live embed: Base module still not ready after delay');
                }
            }, 500);
        }
    }
    
    // Start initialization process
    checkAndInitialize();
})();
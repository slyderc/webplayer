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
         * Update the now playing display from playlist.json
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
            
            // Fetch current track data from playlist.json
            metadataService.getCurrentTrack()
                .then(trackData => {
                    if (!trackData) {
                        // No track data available
                        incrementErrorCount();
                        return;
                    }
                    
                    // Reset error count on success
                    errorCount = 0;
                    
                    // Update the display
                    updateDisplay(trackData);
                })
                .catch(error => {
                    console.error('Error fetching current track:', error);
                    incrementErrorCount();
                    
                    if (errorCount >= settings.maxErrorRetries && errorMessageElement) {
                        errorMessageElement.style.display = 'block';
                    }
                });
        }
        
        /**
         * Update the display with track data
         */
        function updateDisplay(trackData) {
            if (!trackData) return;
            
            // Update the artwork - use image from playlist.json
            if (trackData.artwork_url) {
                albumArtElement.src = trackData.artwork_url;
            } else {
                albumArtElement.src = settings.defaultArtwork;
            }
            
            // Update text elements
            trackTitleElement.textContent = trackData.title || 'Unknown Track';
            trackArtistElement.textContent = trackData.artist || 'Unknown Artist';
            
            // Set tooltips for truncated text
            trackTitleElement.title = trackData.title || '';
            trackArtistElement.title = trackData.artist || '';
            
            console.log('Updated display with:', {
                title: trackData.title,
                artist: trackData.artist,
                artwork: trackData.artwork_url
            });
        }
        
        /**
         * We don't need caching since we're using playlist.json directly
         * These functions remain as stubs for compatibility if needed
         */
        function cacheTrack(trackData) {
            // No longer needed
            return;
        }
        
        function getCachedTrack() {
            // No longer needed
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
            
            // Initial update immediately
            updateNowPlaying();
            
            // Set up periodic updates
            timers.updateTimer = setInterval(updateNowPlaying, settings.updateInterval.live);
            
            // Set up event listeners for track changes with callback that can handle track data
            embed.setupEvents((eventData) => {
                if (eventData && eventData.track) {
                    // If we received track data directly, update display with it
                    console.log('Received track data from event, updating display directly');
                    updateDisplay(eventData.track);
                } else {
                    // Otherwise, fetch the current track as usual
                    updateNowPlaying();
                }
            });
            
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
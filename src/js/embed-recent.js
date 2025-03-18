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
        console.log('updateRecentTracks called');
        
        // Double-check and try to initialize DOM elements if needed
        if (!recentTracksContainer) {
            console.log('recentTracksContainer not found, trying to reacquire');
            if (!initializeDomReferences()) {
                // Last resort - create a container
                console.log('Final attempt to create a container');
                const container = document.querySelector('.embed-recent-container') || document.body;
                if (container) {
                    recentTracksContainer = document.createElement('div');
                    recentTracksContainer.className = 'embed-recent-tracks';
                    recentTracksContainer.id = 'dynamically-created-tracks-container';
                    container.appendChild(recentTracksContainer);
                    console.log('Dynamically created container:', recentTracksContainer);
                } else {
                    console.error('Could not find any container to append to');
                    return;
                }
            }
        }
        
        // Verify again after attempt to reacquire
        if (!recentTracksContainer) {
            console.error('Still no container available, aborting update');
            return;
        }
        
        console.log('Using recentTracksContainer:', recentTracksContainer);
        
        // Hide error message if visible
        if (errorMessageElement) {
            errorMessageElement.style.display = 'none';
        }
        
        // Show loading indicator immediately
        recentTracksContainer.innerHTML = '<div class="embed-loading">Loading recent tracks...</div>';
        
        metadataService.getRecentTracks(limit)
            .then(tracks => {
                console.log('Received tracks:', tracks);
                
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
                } else {
                    // Show a fallback even if we can't get any data
                    const fallbackTracks = [];
                    for (let i = 0; i < limit; i++) {
                        fallbackTracks.push({
                            title: `Sample Track ${i+1}`,
                            artist: 'Sample Artist',
                            artwork_url: defaultArtwork,
                            played_at: new Date(Date.now() - (i * 15 * 60000)).toISOString()
                        });
                    }
                    
                    console.log('Using fallback tracks as last resort');
                    updateDisplay(fallbackTracks);
                    
                    if (errorCount >= maxErrorRetries && errorMessageElement) {
                        errorMessageElement.style.display = 'block';
                    }
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
        console.log('Initializing DOM references for recent tracks embed');
        
        const elements = window.NWR_EMBED_ELEMENTS || {};
        console.log('NWR_EMBED_ELEMENTS:', elements);
        
        recentTracksContainer = elements.recentTracks;
        errorMessageElement = elements.errorMessage;
        
        console.log('Initial recentTracksContainer from elements:', recentTracksContainer);
        
        // If not defined in the global variable, try to find by ID
        if (!recentTracksContainer) {
            const embedId = window.NWR_EMBED?.id || '';
            console.log('Embed ID:', embedId);
            
            if (embedId) {
                const id = `embed-recent-tracks-${embedId}`;
                console.log('Looking for element with ID:', id);
                recentTracksContainer = document.getElementById(id);
                console.log('Found by ID:', recentTracksContainer);
            }
            
            // If still not found, try a direct query selector
            if (!recentTracksContainer) {
                console.log('Trying direct selector .embed-recent-tracks');
                recentTracksContainer = document.querySelector('.embed-recent-tracks');
                console.log('Found by class:', recentTracksContainer);
                
                // Try with ID 'embedRecentTracks' (old format)
                if (!recentTracksContainer) {
                    console.log('Trying with ID embedRecentTracks');
                    recentTracksContainer = document.getElementById('embedRecentTracks');
                    console.log('Found by old ID:', recentTracksContainer);
                }
                
                // Last resort, try any div inside embed-recent-container
                if (!recentTracksContainer) {
                    console.log('Last resort: trying any div in embed-recent-container');
                    recentTracksContainer = document.querySelector('.embed-recent-container div');
                    console.log('Found by container div:', recentTracksContainer);
                }
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
            
            // Log all available elements to help debug
            console.log('Available elements in .embed-recent-container:');
            const container = document.querySelector('.embed-recent-container');
            if (container) {
                console.log('Container found:', container);
                console.log('Container HTML:', container.innerHTML);
            } else {
                console.log('Container not found');
            }
            
            // Create a container as a last resort
            console.log('Creating a container as last resort');
            const container = document.querySelector('.embed-recent-container');
            if (container) {
                recentTracksContainer = document.createElement('div');
                recentTracksContainer.className = 'embed-recent-tracks';
                container.appendChild(recentTracksContainer);
                console.log('Created container:', recentTracksContainer);
                return true;
            }
            
            return false;
        }
        
        console.log('DOM references initialized successfully');
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
    
    // Log the whole DOM for debugging
    function logDomStructure() {
        console.log('DOM structure at initialization:');
        console.log('Body HTML:', document.body.innerHTML);
        console.log('Embed container:', document.querySelector('.embed-container'));
        console.log('Recent container:', document.querySelector('.embed-recent-container'));
        console.log('Recent tracks div:', document.querySelector('.embed-recent-tracks'));
        console.log('Old ID format:', document.getElementById('embedRecentTracks'));
        console.log('NWR_EMBED config:', window.NWR_EMBED);
        
        // List all elements with ID containing 'recent'
        const allElements = document.querySelectorAll('*[id*="recent"]');
        console.log('All elements with ID containing "recent":', allElements);
    }
    
    // Start when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            console.log('DOMContentLoaded fired');
            // Log DOM structure before initialization
            logDomStructure();
            init();
        });
    } else {
        console.log('DOM already loaded, initializing immediately');
        // Log DOM structure before initialization
        logDomStructure();
        init();
    }
})();
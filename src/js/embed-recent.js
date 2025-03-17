/**
 * Recent tracks embed functionality for Now Wave Radio
 */
(function() {
    'use strict';
    
    // DOM Elements
    const recentTracksContainer = document.getElementById('embedRecentTracks');
    
    // Config
    const config = window.NWR_CONFIG || {};
    const embedConfig = window.NWR_EMBED || {};
    const apiEndpoint = config.apiEndpoint || '/api/nowplaying';
    const defaultArtwork = config.defaultArtwork || '/player/NWR_text_logo_angle.png';
    const limit = embedConfig.limit || 5;
    const updateInterval = 60000; // 60 seconds
    
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
        new StorageService({ prefix: 'nwr_embed_' }) : 
        { 
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
        metadataService.getRecentTracks(limit)
            .then(tracks => {
                if (!tracks || !tracks.length) {
                    recentTracksContainer.innerHTML = '<div class="embed-empty-state">No recent tracks to display</div>';
                    return;
                }
                
                const tracksHTML = tracks.map((track, index) => {
                    const artworkUrl = track.artwork_url || defaultArtwork;
                    const timeAgo = formatTimeElapsed(track.played_at);
                    
                    return `
                        <div class="embed-track-item">
                            <div class="embed-track-number">${index + 1}</div>
                            <img class="embed-track-artwork" 
                                 src="${artworkUrl}" 
                                 alt="${track.title} artwork"
                                 onerror="this.src='${defaultArtwork}'">
                            <div class="embed-track-details">
                                <p class="embed-track-item-title" title="${track.title}">${track.title}</p>
                                <p class="embed-track-item-artist" title="${track.artist}">${track.artist}</p>
                            </div>
                            <div class="embed-track-timestamp">${timeAgo}</div>
                        </div>
                    `;
                }).join('');
                
                recentTracksContainer.innerHTML = tracksHTML;
            })
            .catch(error => {
                console.error('Error fetching recent tracks:', error);
                recentTracksContainer.innerHTML = '<div class="embed-error-state">Unable to load recent tracks</div>';
            });
    }
    
    // Initialize
    function init() {
        // Check for cached recent tracks to display immediately
        const cachedTracks = storageService.get('recent_tracks');
        if (cachedTracks) {
            try {
                const tracks = JSON.parse(cachedTracks);
                if (tracks && tracks.length) {
                    const tracksHTML = tracks.slice(0, limit).map((track, index) => {
                        const artworkUrl = track.artwork_url || defaultArtwork;
                        const timeAgo = formatTimeElapsed(track.played_at);
                        
                        return `
                            <div class="embed-track-item">
                                <div class="embed-track-number">${index + 1}</div>
                                <img class="embed-track-artwork" 
                                     src="${artworkUrl}" 
                                     alt="${track.title} artwork"
                                     onerror="this.src='${defaultArtwork}'">
                                <div class="embed-track-details">
                                    <p class="embed-track-item-title" title="${track.title}">${track.title}</p>
                                    <p class="embed-track-item-artist" title="${track.artist}">${track.artist}</p>
                                </div>
                                <div class="embed-track-timestamp">${timeAgo}</div>
                            </div>
                        `;
                    }).join('');
                    
                    recentTracksContainer.innerHTML = tracksHTML;
                }
            } catch (e) {
                console.warn('Error parsing cached tracks:', e);
            }
        }
        
        // Initial update
        updateRecentTracks();
        
        // Set up periodic updates
        setInterval(updateRecentTracks, updateInterval);
        
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
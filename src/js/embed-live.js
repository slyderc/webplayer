/**
 * Live embed functionality for Now Wave Radio
 */
(function() {
    'use strict';
    
    // DOM Elements
    const albumArtElement = document.getElementById('embedAlbumArt');
    const trackTitleElement = document.getElementById('embedTrackTitle');
    const trackArtistElement = document.getElementById('embedTrackArtist');
    
    // Config
    const config = window.NWR_CONFIG || {};
    const apiEndpoint = config.apiEndpoint || '/api/nowplaying';
    const defaultArtwork = config.defaultArtwork || '/player/NWR_text_logo_angle.png';
    const updateInterval = 15000; // 15 seconds
    
    // Create metadata service instance
    const metadataService = (typeof MetadataService !== 'undefined') ?
        new MetadataService({
            endpoint: apiEndpoint,
            defaultArtwork: defaultArtwork
        }) :
        {
            getCurrentTrack: () => Promise.resolve(null)
        };
    
    /**
     * Update the now playing display
     */
    function updateNowPlaying() {
        metadataService.getCurrentTrack()
            .then(trackData => {
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
            })
            .catch(error => {
                console.error('Error fetching current track:', error);
                // On error, keep the current display but log the error
            });
    }
    
    // Initialize
    function init() {
        // Initial update
        updateNowPlaying();
        
        // Set up periodic updates
        setInterval(updateNowPlaying, updateInterval);
        
        // Handle errors for album art
        albumArtElement.addEventListener('error', () => {
            albumArtElement.src = defaultArtwork;
        });
    }
    
    // Start when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
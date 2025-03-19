/**
 * MetadataService - Handles fetching and processing track metadata
 */
class MetadataService {
    constructor(options = {}) {
        this.options = {
            metadataUrl: 'https://nowwave.radio/player/publish/playlist.json',
            pollInterval: 5000,
            ...options
        };
        
        this.callbacks = {
            onMetadataUpdate: null,
            onError: null
        };
        
        this.pollingInterval = null;
    }
    
    setCallback(event, callback) {
        if (this.callbacks.hasOwnProperty(event)) {
            this.callbacks[event] = callback;
        }
        return this;
    }
    
    startPolling(isPlaying = false) {
        // Clear any existing interval
        this.stopPolling();
        
        // If playing, fetch metadata immediately
        if (isPlaying) {
            this.getCurrentTrack().then(data => {
                if (data && this.callbacks.onMetadataUpdate) {
                    this.callbacks.onMetadataUpdate(data);
                }
            }).catch(error => {
                if (this.callbacks.onError) {
                    this.callbacks.onError(error);
                }
            });
        }
        
        // Set up the interval
        this.pollingInterval = setInterval(() => {
            if (isPlaying) {
                this.getCurrentTrack().then(data => {
                    if (data && this.callbacks.onMetadataUpdate) {
                        this.callbacks.onMetadataUpdate(data);
                    }
                }).catch(error => {
                    if (this.callbacks.onError) {
                        this.callbacks.onError(error);
                    }
                });
            }
        }, this.options.pollInterval);
    }
    
    stopPolling() {
        if (this.pollingInterval) {
            clearInterval(this.pollingInterval);
            this.pollingInterval = null;
        }
    }
    
    // This method is now replaced by direct fetch calls to specific endpoints.
    // We don't need this complex method anymore since we're using dedicated
    // history.json and playlist.json files
    async fetchMetadata() {
        console.warn('fetchMetadata is deprecated - use getCurrentTrack or getRecentTracks directly');
        try {
            return await this.getCurrentTrack();
        } catch (error) {
            console.error('Error in deprecated fetchMetadata:', error);
            return null;
        }
    }
    
    /**
     * Get the current playing track from playlist.json
     * @returns {Promise<Object|null>} The current track data or null if not available
     */
    async getCurrentTrack() {
        try {
            // Make a direct request to playlist.json for the current track
            const playlistUrl = '/player/publish/playlist.json';
            console.log(`Fetching current track from ${playlistUrl}`);
            
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 5000);
            
            const response = await fetch(playlistUrl, {
                signal: controller.signal,
                headers: { 'Cache-Control': 'no-cache' }
            });
            
            clearTimeout(timeoutId);
            
            if (!response.ok) {
                throw new Error(`Failed to fetch playlist.json: ${response.status} ${response.statusText}`);
            }
            
            const data = await response.json();
            
            if (!data || !data.title || !data.artist) {
                console.warn('Invalid or empty playlist.json data');
                return null;
            }
            
            // Format the response according to expected format for embeds
            return {
                title: data.title || '',
                artist: data.artist || '',
                album: data.album || '',
                artwork_url: data.image || this.options.defaultArtwork,
                image: data.image || this.options.defaultArtwork,  // Keep the original image property
                played_at: data.timestamp || new Date().toISOString(),
                image_hash: data.image_hash || null,
                program_title: data.program_title || '',
                presenter: data.presenter || ''
            };
        } catch (error) {
            console.error('Error getting current track:', error);
            return null;
        }
    }
    
    /**
     * Get the most recent tracks played
     * @param {number} limit - Maximum number of tracks to return
     * @returns {Promise<Array>} An array of recent track data
     */
    async getRecentTracks(limit = 5) {
        try {
            // Primary endpoint for track history
            const historyEndpoint = '/player/publish/history.json';
            
            console.log(`Fetching track history from ${historyEndpoint} with limit: ${limit}`);
            
            try {
                // Set a timeout and cache control for reliable fetching
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout
                
                const response = await fetch(historyEndpoint, { 
                    signal: controller.signal,
                    headers: { 'Cache-Control': 'no-cache' }
                });
                
                clearTimeout(timeoutId);
                
                if (response.ok) {
                    const data = await response.json();
                    
                    if (Array.isArray(data) && data.length > 0) {
                        console.log(`Successfully loaded history data (${data.length} tracks)`);
                        
                        // Return only the requested number of tracks
                        return data.slice(0, limit);
                    } else {
                        console.warn('History endpoint returned empty or invalid data');
                    }
                } else {
                    console.warn(`History endpoint returned ${response.status} ${response.statusText}`);
                }
            } catch (e) {
                console.warn(`Error fetching history data: ${e.message}`);
            }
            
            // If we reach here, we couldn't get history data
            // Try to get at least the current track as fallback
            console.log('Falling back to current track only');
            try {
                const currentTrack = await this.getCurrentTrack();
                if (currentTrack) {
                    console.log('Using current track as fallback');
                    return [currentTrack];
                }
            } catch (e) {
                console.warn('Could not get current track:', e);
            }
            
            // Last resort - create a sample entry
            console.log('Creating sample track as last resort');
            return [{
                title: 'Sample Track',
                artist: 'Sample Artist',
                album: '',
                artwork_url: this.options.defaultArtwork,
                played_at: new Date().toISOString()
            }];
        } catch (error) {
            console.error('Error getting recent tracks:', error);
            return [];
        }
    }
}

// Export as global or module depending on environment
if (typeof module !== 'undefined' && module.exports) {
    module.exports = MetadataService;
} else {
    window.MetadataService = MetadataService;
}


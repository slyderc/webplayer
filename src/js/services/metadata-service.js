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
            this.fetchMetadata();
        }
        
        // Set up the interval
        this.pollingInterval = setInterval(() => {
            if (isPlaying) {
                this.fetchMetadata();
            }
        }, this.options.pollInterval);
    }
    
    stopPolling() {
        if (this.pollingInterval) {
            clearInterval(this.pollingInterval);
            this.pollingInterval = null;
        }
    }
    
    async fetchMetadata() {
        try {
            const response = await fetch(this.options.metadataUrl);
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
    
            const data = await response.json();
            
            // Add image hash if not provided by server
            if (!data.image_hash && data.title && data.artist) {
                data.image_hash = window.generateHash(data.artist, data.title);
            }
            
            if (this.callbacks.onMetadataUpdate) {
                this.callbacks.onMetadataUpdate(data);
            }
            
            return data;
        } catch (error) {
            console.error('Error fetching metadata:', error);
            if (this.callbacks.onError) {
                this.callbacks.onError(error);
            }
        }
    }
    
    /**
     * Get the current playing track
     * @returns {Promise<Object|null>} The current track data or null if not available
     */
    async getCurrentTrack() {
        try {
            const data = await this.fetchMetadata();
            if (!data) return null;
            
            // Format the response according to expected format for embeds
            return {
                title: data.title || '',
                artist: data.artist || '',
                album: data.album || '',
                artwork_url: data.artwork_url || data.image_url || this.options.defaultArtwork,
                played_at: data.timestamp || new Date().toISOString()
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
            // Attempt to get track history from the history endpoint first
            const historyUrl = this.options.metadataUrl.replace('playlist.json', 'history.json');
            const response = await fetch(historyUrl);
            
            if (response.ok) {
                const data = await response.json();
                
                if (Array.isArray(data) && data.length > 0) {
                    // Format each track according to expected format
                    return data.slice(0, limit).map(track => ({
                        title: track.title || '',
                        artist: track.artist || '',
                        album: track.album || '',
                        artwork_url: track.artwork_url || track.image_url || this.options.defaultArtwork,
                        played_at: track.timestamp || new Date().toISOString()
                    }));
                }
            }
            
            // Fallback: if no history available, at least return the current track
            const currentTrack = await this.getCurrentTrack();
            return currentTrack ? [currentTrack] : [];
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


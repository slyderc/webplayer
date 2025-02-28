/**
 * MetadataService - Handles fetching and processing track metadata
 */
class MetadataService {
    constructor(options = {}) {
        this.options = {
            metadataUrl: 'https://nowwave.radio/player/publish/playlist.json',
            pollInterval: 30000,
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
}

// Export as global or module depending on environment
if (typeof module !== 'undefined' && module.exports) {
    module.exports = MetadataService;
} else {
    window.MetadataService = MetadataService;
}


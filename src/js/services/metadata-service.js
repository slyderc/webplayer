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
            
            // For embeds, store the current track in localStorage for history building
            if (window.NWR && window.NWR.embed) {
                try {
                    // Store in localStorage so other embeds can use it
                    const trackHistoryKey = 'nwr_track_history';
                    let trackHistory = [];
                    
                    try {
                        const savedHistory = localStorage.getItem(trackHistoryKey);
                        if (savedHistory) {
                            trackHistory = JSON.parse(savedHistory);
                            if (!Array.isArray(trackHistory)) trackHistory = [];
                        }
                    } catch (e) {
                        console.warn('Error reading track history from localStorage:', e);
                    }
                    
                    // Check if this track is already in the history
                    const existingTrackIndex = trackHistory.findIndex(
                        track => track.title === data.title && track.artist === data.artist
                    );
                    
                    if (existingTrackIndex === -1) {
                        // This is a new track, add it to history
                        const newTrack = {
                            title: data.title,
                            artist: data.artist,
                            artwork_url: data.artwork_url || data.image_url,
                            played_at: new Date().toISOString()
                        };
                        
                        // Add new track to the beginning
                        trackHistory.unshift(newTrack);
                        
                        // Keep only the last 10 tracks
                        trackHistory = trackHistory.slice(0, 10);
                        
                        // Save back to localStorage
                        localStorage.setItem(trackHistoryKey, JSON.stringify(trackHistory));
                        
                        // Dispatch a DOM event for track change
                        try {
                            const trackEvent = new CustomEvent('nwr:track:change', { 
                                detail: { track: newTrack, history: trackHistory } 
                            });
                            document.dispatchEvent(trackEvent);
                            console.log('Dispatched track change event with history');
                        } catch (e) {
                            console.warn('Error dispatching track change event:', e);
                        }
                    }
                } catch (e) {
                    console.warn('Error updating track history:', e);
                }
            }
            
            // Broadcast to parent window if we're an iframe
            if (window.parent && window.parent !== window) {
                try {
                    window.parent.postMessage({ 
                        type: 'track_change',
                        data: {
                            title: data.title,
                            artist: data.artist,
                            timestamp: new Date().toISOString()
                        } 
                    }, '*');
                    
                    console.log('Broadcasting track change to parent');
                } catch (e) {
                    console.warn('Could not broadcast track change event:', e);
                }
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
            // Primary endpoint for track history
            const historyEndpoint = '/player/history.json';
            
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


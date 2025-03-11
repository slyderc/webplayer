/**
 * AnalyticsService - Tracks user interactions anonymously for station metrics
 */
class AnalyticsService {
    constructor(options = {}) {
        this.options = {
            apiEndpoint: '/webplayer/php/api/track_analytics.php',
            enabled: true,
            ...options
        };
        
        this.queuedActions = [];
        this.isProcessing = false;
        
        // Process queued actions periodically
        setInterval(() => this.processQueue(), 5000);
        
        // Process queue before page unload
        window.addEventListener('beforeunload', () => {
            if (this.queuedActions.length > 0) {
                this.processQueue(true);
            }
        });
        
        console.log('AnalyticsService initialized');
    }
    
    /**
     * Queue an action to be sent to the server
     */
    queueAction(action) {
        if (!this.options.enabled) return;
        
        // Add timestamp to action
        const actionWithTimestamp = {
            ...action,
            timestamp: new Date().toISOString()
        };
        
        this.queuedActions.push(actionWithTimestamp);
        
        // If we have enough actions, process immediately
        if (this.queuedActions.length >= 5) {
            this.processQueue();
        }
    }
    
    /**
     * Process the queue of actions
     */
    async processQueue(sync = false) {
        if (!this.options.enabled || this.queuedActions.length === 0 || this.isProcessing) {
            return;
        }
        
        this.isProcessing = true;
        let actions;
        
        try {
            // Take actions from the queue
            actions = [...this.queuedActions];
            this.queuedActions = [];
            
            // Process actions sequentially (avoid concurrent writes)
            // This helps prevent database lock issues
            const results = [];
            
            for (const action of actions) {
                try {
                    // Try with exponential backoff for locked database
                    let result = false;
                    let retries = 0;
                    const maxRetries = 3;
                    
                    while (!result && retries < maxRetries) {
                        if (retries > 0) {
                            // Wait with increasing delay before retrying (300ms, 900ms, 2700ms)
                            const delay = 300 * Math.pow(3, retries - 1);
                            await new Promise(resolve => setTimeout(resolve, delay));
                            console.log(`Retrying analytics action (attempt ${retries + 1}/${maxRetries})`);
                        }
                        
                        result = await this.sendAction(action, sync);
                        retries++;
                        
                        // If successful, break the retry loop
                        if (result) break;
                    }
                    
                    results.push(result);
                    
                    // Add small delay between requests to avoid overwhelming the server
                    if (!sync && actions.length > 1) {
                        await new Promise(resolve => setTimeout(resolve, 100));
                    }
                } catch (e) {
                    console.error('Error processing action:', e);
                    results.push(false);
                }
            }
            
            // Check if any actions failed
            const failedCount = results.filter(r => !r).length;
            if (failedCount > 0) {
                console.warn(`${failedCount}/${actions.length} analytics actions failed`);
            }
        } catch (error) {
            console.error('Error processing analytics queue:', error);
            
            // Put failed actions back in the queue
            if (actions && actions.length > 0) {
                this.queuedActions = [...this.queuedActions, ...actions];
            }
        } finally {
            this.isProcessing = false;
        }
    }
    
    /**
     * Send an action to the server
     */
    async sendAction(action, sync = false) {
        const options = {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(action)
        };
        
        if (sync) {
            // For synchronous requests (beforeunload)
            options.keepalive = true;
        }
        
        try {
            const response = await fetch(this.options.apiEndpoint, options);
            
            let errorData;
            
            try {
                // Try to parse the response as JSON
                const responseText = await response.text();
                if (responseText.trim()) {
                    errorData = JSON.parse(responseText);
                }
            } catch (parseError) {
                console.error('Error parsing API response:', parseError);
                return false;
            }
            
            if (!response.ok) {
                // Check if it's a database lock error (can be retried)
                if (errorData && 
                    typeof errorData.error === 'string' && 
                    errorData.error.includes('database is locked')) {
                    console.warn('Analytics API: Database is locked (will retry)');
                    return false;
                }
                // Other errors
                else if (errorData) {
                    console.error('Analytics API error:', errorData);
                } else {
                    console.error('Analytics API error - Status:', response.status);
                }
                return false;
            }
            
            return true;
        } catch (error) {
            console.error('Error sending analytics data:', error);
            // If API is unavailable, disable temporarily to avoid spam
            if (error instanceof TypeError && error.message.includes('Failed to fetch')) {
                console.warn('Analytics API is unavailable, disabling temporarily');
                
                // Disable for 5 minutes then try again
                this.options.enabled = false;
                setTimeout(() => {
                    this.options.enabled = true;
                    console.log('Re-enabling analytics after temporary pause');
                }, 5 * 60 * 1000);
            }
            
            return false;
        }
    }
    
    /**
     * Record a track like action
     */
    trackLike(track) {
        if (!track || !track.artist || !track.title) {
            console.error('Invalid track data for like analytics');
            return;
        }
        
        // If hash is not already present, generate it
        const hash = track.artwork_hash || this.generateHash(track.artist, track.title);
        
        this.queueAction({
            action: 'like',
            hash,
            artist: track.artist,
            title: track.title,
            album: track.album
        });
    }
    
    /**
     * Record a track unlike action
     */
    trackUnlike(track) {
        if (!track) {
            console.error('Invalid track data for unlike analytics');
            return;
        }
        
        const hash = track.artwork_hash || this.generateHash(track.artist, track.title);
        
        this.queueAction({
            action: 'unlike',
            hash
        });
    }
    
    /**
     * Record a track play action
     */
    trackPlay(track) {
        if (!track || !track.artist || !track.title) {
            console.error('Invalid track data for play analytics');
            return;
        }
        
        const hash = track.artwork_hash || this.generateHash(track.artist, track.title);
        
        this.queueAction({
            action: 'play',
            hash,
            artist: track.artist,
            title: track.title,
            album: track.album
        });
    }
    
    /**
     * Record a track stop action
     */
    trackStop(track) {
        if (!track || !track.artist || !track.title) {
            console.error('Invalid track data for stop analytics');
            return;
        }
        
        const hash = track.artwork_hash || this.generateHash(track.artist, track.title);
        
        this.queueAction({
            action: 'stop',
            hash,
            artist: track.artist,
            title: track.title,
            album: track.album
        });
    }
    
    /**
     * Get popular tracks
     */
    async getPopularTracks(limit = 10) {
        try {
            const response = await fetch(`${this.options.apiEndpoint}?action=popular&limit=${limit}`);
            
            if (!response.ok) {
                const errorData = await response.json();
                console.error('Error fetching popular tracks:', errorData);
                return [];
            }
            
            const data = await response.json();
            return data.tracks || [];
        } catch (error) {
            console.error('Error fetching popular tracks:', error);
            return [];
        }
    }
    
    /**
     * Get like count for a track
     */
    async getTrackLikes(track) {
        if (!track) return 0;
        
        const hash = track.artwork_hash || this.generateHash(track.artist, track.title);
        
        try {
            const response = await fetch(`${this.options.apiEndpoint}?action=track_likes&hash=${hash}`);
            
            if (!response.ok) {
                const errorData = await response.json();
                console.error('Error fetching track likes:', errorData);
                return 0;
            }
            
            const data = await response.json();
            return data.likes || 0;
        } catch (error) {
            console.error('Error fetching track likes:', error);
            return 0;
        }
    }
    
    /**
     * Generate a hash for a track
     * Implementing the same algorithm used in LikeManager for consistency
     */
    generateHash(artist, title) {
        const str = `${artist}-${title}`.toLowerCase();
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            hash = ((hash << 5) - hash) + str.charCodeAt(i);
            hash |= 0; // Convert to 32bit integer
        }
        return Math.abs(hash).toString(16);
    }
}

// Export as global or module depending on environment
if (typeof module !== 'undefined' && module.exports) {
    module.exports = AnalyticsService;
} else {
    window.AnalyticsService = AnalyticsService;
}
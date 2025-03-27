/**
 * LikeManager - Manages track likes (loved tracks) and related metadata
 */
class LikeManager {
    constructor(options = {}) {
        this.options = {
            storageService: null,
            analyticsService: null,
            defaultArtwork: '/player/NWR_text_logo_angle.png',
            cachedArtworkPath: '/player/publish/ca/',
            debugMode: false, // Set to true to enable debug logging
            ...options
        };
        
        // Ensure we have valid paths
        if (!this.options.cachedArtworkPath || typeof this.options.cachedArtworkPath !== 'string') {
            console.warn('[LikeManager] Invalid cachedArtworkPath, using default');
            this.options.cachedArtworkPath = '/player/publish/ca/';
        }
        
        if (!this.options.defaultArtwork || typeof this.options.defaultArtwork !== 'string') {
            console.warn('[LikeManager] Invalid defaultArtwork, using default');
            this.options.defaultArtwork = '/player/NWR_text_logo_angle.png';
        }
        
        // Log options only in debug mode
        this.debug('LikeManager initialized with options:', {
            cachedArtworkPath: this.options.cachedArtworkPath,
            defaultArtwork: this.options.defaultArtwork
        });
        
        this.storageService = this.options.storageService;
        this.analyticsService = this.options.analyticsService;
        this.lovedTracks = new Set();
        this.observers = new Set(); // For notifying components about like changes
        
        // Load saved likes
        this.loadLovedTracks();
    }
    
    // Register observer to be notified when likes change
    addObserver(observer) {
        if (typeof observer.onLikeStatusChanged === 'function') {
            this.observers.add(observer);
        }
        return this;
    }
    
    // Remove observer
    removeObserver(observer) {
        this.observers.delete(observer);
        return this;
    }
    
    /**
     * Debug logging function that only logs when debugMode is enabled
     * @param {string} message - Message to log
     * @param {*} data - Optional data to log
     */
    debug(message, data) {
        if (this.options.debugMode) {
            if (data !== undefined) {
                console.log(`[LikeManager] ${message}`, data);
            } else {
                console.log(`[LikeManager] ${message}`);
            }
        }
    }
    
    // Notify all observers of a change
    notifyObservers(trackId, isLoved) {
        this.observers.forEach(observer => {
            try {
                observer.onLikeStatusChanged(trackId, isLoved);
            } catch (e) {
                console.error('[LikeManager] Error notifying observer:', e);
            }
        });
    }
    
    // Load loved tracks from storage
    loadLovedTracks() {
        const savedTracks = this.storageService.getItem('lovedTracks', []);
        this.lovedTracks = new Set(savedTracks);
        return this.lovedTracks;
    }
    
    // Save loved tracks to storage
    saveLovedTracks() {
        this.storageService.setItem('lovedTracks', [...this.lovedTracks]);
    }
    
    // Check if a track is loved
    isLoved(trackId) {
        return this.lovedTracks.has(trackId);
    }
    
    // Toggle love status for a track
    toggleLove(trackId, trackData = null) {
        const isLoved = !this.isLoved(trackId);
        
        // Get the current loved track details
        const lovedTrackDetails = this.storageService.getItem('lovedTrackDetails', {});
        
        let trackDetails = null;
        
        if (isLoved) {
            // Add to loved tracks
            this.lovedTracks.add(trackId);
            
            // Save track details for future reference
            if (trackData) {
                // Ensure we have the hash
                if (!trackData.artwork_hash && trackData.artist && trackData.title) {
                    trackData.artwork_hash = this.generateHash(trackData.artist, trackData.title);
                }
                
                trackDetails = {
                    id: trackId,
                    artist: trackData.artist,
                    title: trackData.title,
                    artwork_url: trackData.artwork_url || this.options.defaultArtwork,
                    artwork_hash: trackData.artwork_hash,
                    album: trackData.album,
                    last_played: trackData.played_at || new Date().toISOString()
                };
                
                lovedTrackDetails[trackId] = trackDetails;
            } else {
                // Try to parse track info from ID if no data provided
                const parts = trackId.split('-');
                if (parts.length >= 2) {
                    const artist = parts.shift();
                    const title = parts.join('-');
                    
                    trackDetails = {
                        id: trackId,
                        artist: artist,
                        title: title,
                        artwork_url: this.options.defaultArtwork,
                        artwork_hash: this.generateHash(artist, title),
                        last_played: new Date().toISOString()
                    };
                    
                    lovedTrackDetails[trackId] = trackDetails;
                }
            }
            
            // Send analytics
            if (this.analyticsService && trackDetails) {
                this.analyticsService.trackLike(trackDetails);
            }
        } else {
            // Get track details before removing
            trackDetails = lovedTrackDetails[trackId];
            
            // Remove from loved tracks
            this.lovedTracks.delete(trackId);
            delete lovedTrackDetails[trackId];
            
            // Send analytics
            if (this.analyticsService && trackDetails) {
                this.analyticsService.trackUnlike(trackDetails);
            }
        }
        
        // Save to storage
        this.storageService.setItem('lovedTrackDetails', lovedTrackDetails);
        this.saveLovedTracks();
        
        // Notify observers
        this.notifyObservers(trackId, isLoved);
        
        return isLoved;
    }
    
    // Get all loved tracks with details
    getLovedTracksWithDetails(recentTracks = []) {
        const lovedTrackDetails = this.storageService.getItem('lovedTrackDetails', {});
        const lovedTracksWithDetails = [];
        
        for (const trackId of this.lovedTracks) {
            // First check recent tracks for most up-to-date info
            const recentTrack = recentTracks.find(track => track.id === trackId);
            
            if (recentTrack) {
                // Use recent track data
                const trackDetails = {
                    id: trackId,
                    artist: recentTrack.artist,
                    title: recentTrack.title,
                    artwork_url: recentTrack.artwork_url || this.options.defaultArtwork,
                    artwork_hash: recentTrack.artwork_hash || this.generateHash(recentTrack.artist, recentTrack.title),
                    last_played: recentTrack.played_at,
                    played_at: recentTrack.played_at,
                    isLoved: true
                };
                
                // Update stored details
                lovedTrackDetails[trackId] = {
                    ...trackDetails,
                    last_played: trackDetails.last_played
                };
                
                lovedTracksWithDetails.push(trackDetails);
            } 
            // Otherwise use stored details
            else if (lovedTrackDetails[trackId]) {
                // Ensure hash is present
                if (!lovedTrackDetails[trackId].artwork_hash) {
                    lovedTrackDetails[trackId].artwork_hash = this.generateHash(
                        lovedTrackDetails[trackId].artist, 
                        lovedTrackDetails[trackId].title
                    );
                }
                
                lovedTracksWithDetails.push({
                    ...lovedTrackDetails[trackId],
                    played_at: lovedTrackDetails[trackId].last_played,
                    isLoved: true
                });
            }
            // Basic fallback using track ID
            else {
                const parts = trackId.split('-');
                const artist = parts.shift();
                const title = parts.join('-');
                
                const trackDetails = {
                    id: trackId,
                    artist: artist,
                    title: title,
                    artwork_url: this.options.defaultArtwork,
                    artwork_hash: this.generateHash(artist, title),
                    last_played: null,
                    played_at: null,
                    isLoved: true
                };
                
                // Save these details
                lovedTrackDetails[trackId] = { 
                    ...trackDetails,
                    last_played: trackDetails.last_played
                };
                
                lovedTracksWithDetails.push(trackDetails);
            }
        }
        
        // Save updated details
        this.storageService.setItem('lovedTrackDetails', lovedTrackDetails);
        
        // Sort by recency
        return this.sortTracksByRecency(lovedTracksWithDetails);
    }
    
    // Get artwork URLs for a track
    getArtworkUrl(track) {
        this.debug('getArtworkUrl called with track:', track ? {
            id: track.id,
            artwork_url: track.artwork_url,
            artwork_hash: track.artwork_hash,
            hashed_artwork_url: track.hashed_artwork_url
        } : 'null or undefined');
        
        // Fixed absolute paths - NEVER rely on object properties that might be undefined
        const defaultArtwork = '/player/NWR_text_logo_angle.png';
        const cachedArtworkPath = '/player/publish/ca/';
        
        // Handle null/undefined track gracefully
        if (!track) {
            console.warn('[LikeManager] getArtworkUrl called with null/undefined track');
            return {
                primaryUrl: defaultArtwork,
                fallbackUrl: defaultArtwork,
                defaultUrl: defaultArtwork
            };
        }
        
        // For likes, we should prioritize the hashed artwork URLs since they're more permanent
        // Build a hash-based URL if we have a hash but no hashed_artwork_url
        let hashedUrl = null;
        if (track.artwork_hash) {
            hashedUrl = cachedArtworkPath + track.artwork_hash + '.jpg';
        }
        
        // Determine primary URL, with preferences in order:
        // 1. hashed_artwork_url (from history.json)
        // 2. Generated hash-based URL 
        // 3. artwork_url (regular URL - less reliable for likes)
        // 4. Default artwork
        let primaryUrl = track.hashed_artwork_url || hashedUrl || track.artwork_url || defaultArtwork;
        
        // For fallback, if we have a hash, use the hash-based URL as fallback
        // Otherwise use the default artwork
        let fallbackUrl = defaultArtwork;
        if (hashedUrl && primaryUrl !== hashedUrl) {
            fallbackUrl = hashedUrl;
        }
        
        this.debug('Generated artwork URLs:', {
            primaryUrl: primaryUrl,
            fallbackUrl: fallbackUrl,
            defaultUrl: defaultArtwork,
            trackInfo: {
                id: track.id,
                hashedArtworkUrl: track.hashed_artwork_url,
                generatedHashedUrl: hashedUrl,
                artworkUrl: track.artwork_url,
                hash: track.artwork_hash
            }
        });
        
        return {
            primaryUrl: primaryUrl,
            fallbackUrl: fallbackUrl,
            defaultUrl: defaultArtwork
        };
    }
    
    // Sort tracks by recency
    sortTracksByRecency(tracks) {
        return tracks.sort((a, b) => {
            // If both have timestamps, sort by most recent first
            if (a.played_at && b.played_at) {
                return new Date(b.played_at) - new Date(a.played_at);
            }
            // If only one has timestamp, prioritize the one with timestamp
            if (a.played_at) return -1;
            if (b.played_at) return 1;
            // If neither has timestamp, sort alphabetically
            return a.artist.localeCompare(b.artist) || a.title.localeCompare(b.title);
        });
    }
    
    // Generate hash for a track
    generateHash(artist, title) {
        const str = `${artist}-${title}`.toLowerCase();
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            hash = ((hash << 5) - hash) + str.charCodeAt(i);
            hash |= 0; // Convert to 32bit integer
        }
        return Math.abs(hash).toString(16);
    }
    
    // Format time elapsed (for UI display)
    formatTimeElapsed(date) {
        if (!date) return 'Unknown';
        
        const seconds = Math.floor((new Date() - new Date(date)) / 1000);
        
        const intervals = {
            year: 31536000,
            month: 2592000,
            week: 604800,
            day: 86400,
            hour: 3600,
            minute: 60
        };

        for (const [unit, secondsInUnit] of Object.entries(intervals)) {
            const interval = Math.floor(seconds / secondsInUnit);
            if (interval >= 1) {
                return `${interval} ${unit}${interval !== 1 ? 's' : ''} ago`;
            }
        }
        
        return 'just now';
    }
}

// Export as global or module depending on environment
if (typeof module !== 'undefined' && module.exports) {
    module.exports = LikeManager;
} else {
    window.LikeManager = LikeManager;
}
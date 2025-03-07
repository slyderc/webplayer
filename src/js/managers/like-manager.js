/**
 * LikeManager - Manages track likes (loved tracks) and related metadata
 */
class LikeManager {
    constructor(options = {}) {
        this.options = {
            storageService: null,
            defaultArtwork: '/player/NWR_text_logo_angle.png',
            cachedArtworkPath: '/player/publish/ca/',
            ...options
        };
        
        // Ensure we have valid paths
        if (!this.options.cachedArtworkPath || typeof this.options.cachedArtworkPath !== 'string') {
            console.warn('Invalid cachedArtworkPath, using default');
            this.options.cachedArtworkPath = '/player/publish/ca/';
        }
        
        if (!this.options.defaultArtwork || typeof this.options.defaultArtwork !== 'string') {
            console.warn('Invalid defaultArtwork, using default');
            this.options.defaultArtwork = '/player/NWR_text_logo_angle.png';
        }
        
        // Log options for debugging
        console.log('LikeManager initialized with options:', {
            cachedArtworkPath: this.options.cachedArtworkPath,
            defaultArtwork: this.options.defaultArtwork
        });
        
        this.storageService = this.options.storageService;
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
    
    // Notify all observers of a change
    notifyObservers(trackId, isLoved) {
        this.observers.forEach(observer => {
            try {
                observer.onLikeStatusChanged(trackId, isLoved);
            } catch (e) {
                console.error('Error notifying observer:', e);
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
        
        if (isLoved) {
            // Add to loved tracks
            this.lovedTracks.add(trackId);
            
            // Save track details for future reference
            if (trackData) {
                // Ensure we have the hash
                if (!trackData.artwork_hash && trackData.artist && trackData.title) {
                    trackData.artwork_hash = this.generateHash(trackData.artist, trackData.title);
                }
                
                lovedTrackDetails[trackId] = {
                    id: trackId,
                    artist: trackData.artist,
                    title: trackData.title,
                    artwork_url: trackData.artwork_url || this.options.defaultArtwork,
                    artwork_hash: trackData.artwork_hash,
                    last_played: trackData.played_at || new Date().toISOString()
                };
            } else {
                // Try to parse track info from ID if no data provided
                const parts = trackId.split('-');
                if (parts.length >= 2) {
                    const artist = parts.shift();
                    const title = parts.join('-');
                    
                    lovedTrackDetails[trackId] = {
                        id: trackId,
                        artist: artist,
                        title: title,
                        artwork_url: this.options.defaultArtwork,
                        artwork_hash: this.generateHash(artist, title),
                        last_played: new Date().toISOString()
                    };
                }
            }
        } else {
            // Remove from loved tracks
            this.lovedTracks.delete(trackId);
            delete lovedTrackDetails[trackId];
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
        // Fixed version with extensive debugging
        console.log('getArtworkUrl called with track:', track ? {
            id: track.id,
            artwork_url: track.artwork_url,
            artwork_hash: track.artwork_hash
        } : 'null or undefined');
        
        // Fixed absolute paths - NEVER rely on object properties that might be undefined
        const defaultArtwork = '/player/NWR_text_logo_angle.png';
        const cachedArtworkPath = '/player/publish/ca/';
        
        // Handle null/undefined track gracefully
        if (!track) {
            console.warn('getArtworkUrl called with null/undefined track');
            return {
                primaryUrl: defaultArtwork,
                fallbackUrl: defaultArtwork,
                defaultUrl: defaultArtwork
            };
        }
        
        // Try the original URL first (with fallback)
        let url = track.artwork_url || defaultArtwork;
        
        // If there's a hash, create a fallback URL
        if (track.artwork_hash) {
            // Always use absolute path with direct string concatenation
            const fallbackUrl = cachedArtworkPath + track.artwork_hash + '.jpg';
            
            console.log('Generated artwork URLs:', {
                primaryUrl: url,
                fallbackUrl: fallbackUrl,
                defaultUrl: defaultArtwork
            });
            
            return {
                primaryUrl: url,
                fallbackUrl: fallbackUrl,
                defaultUrl: defaultArtwork
            };
        }
        
        console.log('No artwork_hash found, using default fallback');
        
        // If no hash, just return the url or default
        return {
            primaryUrl: url,
            fallbackUrl: defaultArtwork,
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
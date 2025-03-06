/**
 * TrackManager - Manages track history and loved tracks
 */
class TrackManager {
    constructor(options = {}) {
        this.options = {
            maxRecentTracks: 30,
            cachedArtworkPath: '/player/publish/ca/',
            defaultArtwork: '/player/NWR_text_logo_angle.png',    
            ...options
        };
        
        this.recentTracks = [];
        this.lovedTracks = new Set();
        this.storageService = options.storageService || new StorageService();
        
        // Load loved tracks from storage
        this.loadLovedTracks();
    }
    
    loadLovedTracks() {
        const savedTracks = this.storageService.getItem('lovedTracks', []);
        this.lovedTracks = new Set(savedTracks);
        return this.lovedTracks;
    }
    
    saveLovedTracks() {
        this.storageService.setItem('lovedTracks', [...this.lovedTracks]);
    }
    
    addTrackToHistory(track) {
        if (!track || !track.title || !track.artist) return;
        
        const trackWithTimestamp = {
            id: `${track.artist}-${track.title}`,
            title: track.title,
            artist: track.artist,
            artwork_url: track.image,
            artwork_hash: track.image_hash || window.generateHash(track.artist, track.title),
            played_at: new Date().toISOString()
        };
    
        // Only add if it's different from the most recent track
        if (this.recentTracks.length === 0 || 
            this.recentTracks[0].id !== trackWithTimestamp.id) {
            
            this.recentTracks.unshift(trackWithTimestamp);
            if (this.recentTracks.length > this.options.maxRecentTracks) {
                this.recentTracks.pop();
            }
            
            return true;
        }
        
        return false;
    }

    /*** original version including the global paths -- update existing with the global config path!
    getArtworkUrl(track) {
        // Try the original URL first
        let url = track.artwork_url;
        
        // If there's a hash, create a fallback URL
        if (track.artwork_hash) {
            const cachePath = this.options.cachedArtworkPath;
            const fallbackUrl = `${this.options.cachedArtworkPath}${track.artwork_hash}.jpg`;
            
            return {
                primaryUrl: url || this.options.defaultArtwork,
                fallbackUrl: fallbackUrl,
                defaultUrl: this.options.defaultArtwork
            };
        }
        
        // If no hash, just return the url or default
        return {
            primaryUrl: url || this.options.defaultArtwork,
            fallbackUrl: this.options.defaultArtwork,
            defaultUrl: this.options.defaultArtwork
        };
    }
***/

    getArtworkUrl(track) {
        // Try the original URL first
        let url = track.artwork_url;
        
        // Default paths with absolute paths (starting with /)
        const defaultArtwork = '/player/NWR_text_logo_angle.png';
        const cachedArtworkPath = '/player/publish/ca/';
        
        // If there's a hash, create a fallback URL
        if (track.artwork_hash) {
            // Always use the absolute path and ensure no "undefined" can appear
            const fallbackUrl = cachedArtworkPath + track.artwork_hash + '.jpg';
            
            return {
                primaryUrl: url || defaultArtwork,
                fallbackUrl: fallbackUrl,
                defaultUrl: defaultArtwork
            };
        }
        
        // If no hash, just return the url or default
        return {
            primaryUrl: url || defaultArtwork,
            fallbackUrl: defaultArtwork,
            defaultUrl: defaultArtwork
        };
    }

    getRecentTracks() {
        return this.recentTracks;
    }

    getLovedTracksWithDetails() {
        // We'll need to also store track details in localStorage for tracks that
        // might not be in the recent list anymore
        const lovedTrackDetails = this.storageService.getItem('lovedTrackDetails', {});
        const lovedTracksWithDetails = [];
        
        // Convert loved tracks set to array for easier manipulation
        const lovedTrackIds = [...this.lovedTracks];
        
        for (const trackId of lovedTrackIds) {
            // First try to find it in recent tracks for most up-to-date details
            const recentTrack = this.recentTracks.find(track => track.id === trackId);
            
            if (recentTrack) {
                // Use details from recent track, and also store these details for future reference
                const trackDetails = {
                    id: trackId,
                    artist: recentTrack.artist,
                    title: recentTrack.title,
                    artwork_url: recentTrack.artwork_url || this.options.defaultArtwork,
                    artwork_hash: recentTrack.artwork_hash || window.generateHash(recentTrack.artist, recentTrack.title),
                    last_played: recentTrack.played_at
                };
                
                // Update the stored details
                lovedTrackDetails[trackId] = trackDetails;
                
                // Add to our result set
                lovedTracksWithDetails.push({
                    ...trackDetails,
                    played_at: recentTrack.played_at,
                    isLoved: true
                });
            } 
            // If not in recent, check if we have stored details
            else if (lovedTrackDetails[trackId]) {
                if (!lovedTrackDetails[trackId].artwork_hash) {
                    lovedTrackDetails[trackId].artwork_hash = window.generateHash(lovedTrackDetails[trackId].artist, lovedTrackDetails[trackId].title);
                }            
                lovedTracksWithDetails.push({
                    ...lovedTrackDetails[trackId],
                    played_at: lovedTrackDetails[trackId].last_played,
                    isLoved: true
                });
            }
            // Last resort: create a basic object from the ID
            else {
                const parts = trackId.split('-');
                const artist = parts.shift(); // First part is artist
                const title = parts.join('-'); // Remaining parts (in case title has hyphens)
                
                const trackDetails = {
                    id: trackId,
                    artist: artist,
                    title: title,
                    artwork_url: this.options.defaultArtwork,
                    artwork_hash: window.generateHash(artist, title),
                    last_played: null
                };
                
                // Store these basic details
                lovedTrackDetails[trackId] = trackDetails;
                
                lovedTracksWithDetails.push({
                    ...trackDetails,
                    played_at: null,
                    isLoved: true
                });
            }
        }
        
        // Save the updated track details back to storage
        this.storageService.setItem('lovedTrackDetails', lovedTrackDetails);
        
        // Sort by most recently played, then by artist/title
        lovedTracksWithDetails.sort((a, b) => {
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
        
        return lovedTracksWithDetails;
    }
    
    toggleLove(trackId, trackMetadata = null) {
        // Get the current loved track details
        const lovedTrackDetails = this.storageService.getItem('lovedTrackDetails', {});
    
        if (this.lovedTracks.has(trackId)) {
            // Remove from loved tracks
            this.lovedTracks.delete(trackId);
            
            if (lovedTrackDetails[trackId]) {
                delete lovedTrackDetails[trackId];
                this.storageService.setItem('lovedTrackDetails', lovedTrackDetails);
            }
        } else {
            // Add to loved tracks
            this.lovedTracks.add(trackId);
            
            // If trackMetadata is provided, use it directly
            if (trackMetadata) {
                // Ensure we have a hash
                if (!trackMetadata.artwork_hash) {
                    trackMetadata.artwork_hash = window.generateHash(
                        trackMetadata.artist,
                        trackMetadata.title
                    );
                }
                
                lovedTrackDetails[trackId] = {
                    id: trackId,
                    artist: trackMetadata.artist,
                    title: trackMetadata.title,
                    artwork_url: trackMetadata.artwork_url || this.options.defaultArtwork,
                    artwork_hash: trackMetadata.artwork_hash,
                    last_played: trackMetadata.played_at || new Date().toISOString()
                };
                
                this.storageService.setItem('lovedTrackDetails', lovedTrackDetails);
            }
            // Otherwise look for track info in recent tracks
            else {
                // Try to find detailed information about this track
                const recentTrack = this.recentTracks.find(track => track.id === trackId);
                
                if (recentTrack) {
                    // Store detailed information including the hash
                    lovedTrackDetails[trackId] = {
                        id: trackId,
                        artist: recentTrack.artist,
                        title: recentTrack.title,
                        artwork_url: recentTrack.artwork_url || this.options.defaultArtwork,
                        artwork_hash: recentTrack.artwork_hash || window.generateHash(recentTrack.artist, recentTrack.title),
                        last_played: recentTrack.played_at
                    };
                    this.storageService.setItem('lovedTrackDetails', lovedTrackDetails);
                } else {
                    // If not found in recent, try to parse from ID
                    const parts = trackId.split('-');
                    if (parts.length >= 2) {
                        const artist = parts.shift();
                        const title = parts.join('-');
                        
                        // Generate hash for this track
                        const hash = window.generateHash(artist, title);
                        
                        lovedTrackDetails[trackId] = {
                            id: trackId,
                            artist: artist,
                            title: title,
                            artwork_url: this.options.defaultArtwork,
                            artwork_hash: hash,
                            last_played: new Date().toISOString() // Use current time
                        };
                        this.storageService.setItem('lovedTrackDetails', lovedTrackDetails);
                    }
                }
            }
        }
        
        // Save the loved tracks set (IDs only)
        this.saveLovedTracks();
        
        return this.lovedTracks.has(trackId);
    }
                
    isLoved(trackId) {
        return this.lovedTracks.has(trackId);
    }
    
    formatTimeElapsed(date) {
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

    static generateHash(artist, title) {
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
    module.exports = TrackManager;
} else {
    window.TrackManager = TrackManager;
}

window.generateHash = TrackManager.generateHash;
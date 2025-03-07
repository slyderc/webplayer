/**
 * TrackManager - Manages track history (recent tracks)
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
        this.storageService = options.storageService || new StorageService();
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
        
    getArtworkUrl(track) {
        // Try the original URL first
        let url = track.artwork_url;
    
        // Default paths with absolute paths (starting with /)
        const defaultArtwork = '/player/NWR_text_logo_angle.png';
        const cachedArtworkPath = '/player/publish/ca/';
        
        // If there's a hash, create a fallback URL
        if (track.artwork_hash) {
            // Always use the absolute path
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

// Keep this for backward compatibility
window.generateHash = TrackManager.generateHash;
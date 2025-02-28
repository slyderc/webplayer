/**
 * TrackManager - Manages track history and loved tracks
 */
class TrackManager {
    constructor(options = {}) {
        this.options = {
            maxRecentTracks: 5,
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
    
    getRecentTracks() {
        return this.recentTracks;
    }
    
    toggleLove(trackId) {
        if (this.lovedTracks.has(trackId)) {
            this.lovedTracks.delete(trackId);
        } else {
            this.lovedTracks.add(trackId);
        }
        
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
}

// Export as global or module depending on environment
if (typeof module !== 'undefined' && module.exports) {
    module.exports = TrackManager;
} else {
    window.TrackManager = TrackManager;
}


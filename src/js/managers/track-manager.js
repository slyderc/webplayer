/**
 * TrackManager - Manages track history and loved tracks
 */
class TrackManager {
    constructor(options = {}) {
        this.options = {
            maxRecentTracks: 25,
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
                    artwork_url: recentTrack.artwork_url || '/player/NWR_text_logo_angle.png',
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
                    artwork_url: '/player/NWR_text_logo_angle.png',
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
    
    toggleLove(trackId) {
        // Get the current loved track details
        const lovedTrackDetails = this.storageService.getItem('lovedTrackDetails', {});
    
        if (this.lovedTracks.has(trackId)) {
            // Remove from loved tracks
            this.lovedTracks.delete(trackId);
            
            // Also remove from details if it exists
            if (lovedTrackDetails[trackId]) {
                delete lovedTrackDetails[trackId];
                this.storageService.setItem('lovedTrackDetails', lovedTrackDetails);
            }
        } else {
            // Add to loved tracks
            this.lovedTracks.add(trackId);
            
            // Try to find detailed information about this track
            const recentTrack = this.recentTracks.find(track => track.id === trackId);
            
            if (recentTrack) {
                // Store detailed information
                lovedTrackDetails[trackId] = {
                    id: trackId,
                    artist: recentTrack.artist,
                    title: recentTrack.title,
                    artwork_url: recentTrack.artwork_url || '/player/NWR_text_logo_angle.png',
                    last_played: recentTrack.played_at
                };
                this.storageService.setItem('lovedTrackDetails', lovedTrackDetails);
            } else {
                // If not found in recent, try to parse from ID
                const parts = trackId.split('-');
                if (parts.length >= 2) {
                    const artist = parts.shift();
                    const title = parts.join('-');
                    
                    lovedTrackDetails[trackId] = {
                        id: trackId,
                        artist: artist,
                        title: title,
                        artwork_url: '/player/NWR_text_logo_angle.png',
                        last_played: new Date().toISOString() // Use current time
                    };
                    this.storageService.setItem('lovedTrackDetails', lovedTrackDetails);
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


}

// Export as global or module depending on environment
if (typeof module !== 'undefined' && module.exports) {
    module.exports = TrackManager;
} else {
    window.TrackManager = TrackManager;
}


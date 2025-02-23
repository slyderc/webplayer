class NowWavePlayer {
    constructor() {
        this.audio = new Audio('https://streaming.live365.com/a78360_2');
        this.isPlaying = false;
        this.currentTab = 'live';
        this.lovedTracks = new Set(this.loadLovedTracks());
        this.recentTracks = [];
        this.maxRecentTracks = 5;
        
        this.initializeElements();
        this.attachEventListeners();
        this.startMetadataPolling();       
        this.switchTab('live');
    }
    
    initializeElements() {
        this.playButton = document.getElementById('playButton');
        this.loveButton = document.getElementById('loveButton');
        this.albumArt = document.getElementById('albumArt');
        this.trackTitle = document.getElementById('trackTitle');
        this.trackArtist = document.getElementById('trackArtist');
        this.programTitle = document.getElementById('programTitle');
        this.presenterName = document.getElementById('presenterName');
        this.tabs = document.getElementById('tabs');
        this.views = {
            live: document.getElementById('liveView'),
            recent: document.getElementById('recentView'),
            schedule: document.getElementById('scheduleView'),
            catchup: document.getElementById('catchupView'),
            favorites: document.getElementById('favoritesView')
        };

    }
    
    attachEventListeners() {
        this.playButton.addEventListener('click', () => this.togglePlay());
        this.loveButton.addEventListener('click', () => this.toggleLove());
        this.tabs.addEventListener('click', (e) => {
            if (e.target.matches('.tab-button')) {
                this.switchTab(e.target.dataset.tab);
            }
        });
        
        // Handle audio events
        this.audio.addEventListener('playing', () => this.updatePlayButton(true));
        this.audio.addEventListener('pause', () => this.updatePlayButton(false));
        this.audio.addEventListener('error', () => this.handleError());
    }
    
    addTrackToHistory(track) {
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
            if (this.recentTracks.length > this.maxRecentTracks) {
                this.recentTracks.pop();
            }
            
            if (this.currentTab === 'recent') {
                this.updateRecentTracksView();
            }
        }
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

    togglePlay() {
        if (this.isPlaying) {
            this.audio.pause();
        } else {
            this.audio.play();
        }
        this.isPlaying = !this.isPlaying;
        this.updatePlayButton(this.isPlaying);
    }
    
    updatePlayButton(isPlaying) {
        this.playButton.innerHTML = isPlaying 
            ? '<svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>'
            : '<svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg>';
    }
    
    async startMetadataPolling() {
        await this.updateMetadata();
        setInterval(() => this.updateMetadata(), 30000);
    }
    
    async updateMetadata() {
        // Use environment-based URL switching
        const API_URL = window.location.origin.includes('localhost') 
            ? '/proxy/player/publish/playlist.json' 
            : 'https://nowwave.radio/player/publish/playlist.json';
    
        try {
            const response = await fetch(API_URL);
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
    
            const data = await response.json();
            
            // Add track to history before updating current track info
            if (data.title && data.artist) {
                this.addTrackToHistory(data);
            }

            // Update track information
            this.trackTitle.textContent = data.title || 'Unknown Track';
            this.trackArtist.textContent = data.artist || 'Unknown Artist';
            
            // Update program information
            this.programTitle.textContent = data.program_title || '';
            this.presenterName.textContent = data.presenter ? `with ${data.presenter}` : '';
            
            // Update album artwork - note the change to use data.image
            if (data.image) {
                // Clean up the image path to remove any double slashes
                const cleanImagePath = data.image.replace(/^\/+/, '').replace(/\/+/g, '/');
                
                // Construct the correct URL based on environment
                const artworkUrl = window.location.origin.includes('localhost') 
                    ? `/artwork/${cleanImagePath}`
                    : `https://nowwave.radio/${cleanImagePath}`;
                
                // Only update if the image URL has changed
                if (this.albumArt.src !== artworkUrl) {
                    this.albumArt.src = artworkUrl;
                    // console.log('Updated artwork URL:', artworkUrl);
                }
            } else {
                this.albumArt.src = '/player/NWR_text_logo_angle.png';
            }
            
            
            // Update love button state
            const trackId = `${data.artist}-${data.title}`;
            this.loveButton.dataset.loved = this.lovedTracks.has(trackId);
    
        } catch (error) {
            console.error('Error fetching metadata:', error);
        }
    }

    toggleLove(specificTrackId = null) {
        const trackId = specificTrackId || `${this.trackArtist.textContent}-${this.trackTitle.textContent}`;
        
        if (this.lovedTracks.has(trackId)) {
            this.lovedTracks.delete(trackId);
        } else {
            this.lovedTracks.add(trackId);
        }
        
        // Update UI for both main player and recent tracks if visible
        if (!specificTrackId) {
            this.loveButton.dataset.loved = this.lovedTracks.has(trackId);
        }
        if (this.currentTab === 'recent') {
            this.updateRecentTracksView();
        }
        
        this.saveLovedTracks();
    }
    
    loadLovedTracks() {
        const saved = localStorage.getItem('lovedTracks');
        return saved ? JSON.parse(saved) : [];
    }
    
    saveLovedTracks() {
        localStorage.setItem('lovedTracks', JSON.stringify([...this.lovedTracks]));
    }

    updateRecentTracksView() {
        const tracksHTML = this.recentTracks.map(track => `
            <div class="track-item">
                <img class="track-artwork" 
                     src="${track.artwork_url || '/player/NWR_text_logo_angle.png'}" 
                     alt="${track.title} artwork">
                <div class="track-info">
                    <p class="track-title">${track.title}</p>
                    <p class="track-artist">${track.artist}</p>
                </div>
                <div class="track-actions">
                    <button class="heart-button" 
                            data-track-id="${track.id}"
                            data-loved="${this.lovedTracks.has(track.id)}">
                        <svg class="heart-icon" viewBox="0 0 24 24">
                            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
                        </svg>
                    </button>
                    <span class="time-ago">${this.formatTimeElapsed(track.played_at)}</span>
                </div>
            </div>
        `).join('');

        this.views.recent.innerHTML = tracksHTML;
        
        // Add click handlers for the heart buttons
        this.views.recent.querySelectorAll('.heart-button').forEach(button => {
            button.addEventListener('click', (e) => {
                const trackId = e.currentTarget.dataset.trackId;
                this.toggleLove(trackId);
            });
        });
    }

    switchTab(tabName) {
        // Update active state of tab buttons
        this.tabs.querySelectorAll('.tab-button').forEach(button => {
            button.dataset.active = button.dataset.tab === tabName;
        });
        
        // Hide all views
        Object.values(this.views).forEach(view => {
            view.dataset.active = 'false';
        });
        
        // Show selected view
        this.currentTab = tabName;
        this.views[tabName].dataset.active = 'true';
        
        // Update content based on tab
        switch(tabName) {
            case 'recent':
                this.updateRecentTracksView();
                break;
            case 'schedule':
                this.updateScheduleView();
                break;
            case 'catchup':
                this.updateCatchupView();
                break;
            case 'favorites':
                this.updateFavoritesView();
                break;
            // 'live' view doesn't need updating as it's always current
        }
    }
    
    updateScheduleView() {
        this.views.schedule.innerHTML = '<p>Show schedule will appear here</p>';
    }

    updateCatchupView() {
        this.views.catchup.innerHTML = '<p>Past shows available on Mixcloud</p>';
    }

    updateFavoritesView() {
        this.views.favorites.innerHTML = '<p>Your loved tracks will appear here</p>';
    }

    handleError() {
        console.error('Audio stream error occurred');
        this.isPlaying = false;
        this.updatePlayButton(false);
    }
}

// Initialize the player when the page loads
document.addEventListener('DOMContentLoaded', () => {
    window.player = new NowWavePlayer();
});

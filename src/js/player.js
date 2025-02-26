class NowWavePlayer {
    constructor() {
        // Get configuration from global object
        this.config = window.NWR_CONFIG || {
            streamUrl: 'https://streaming.live365.com/a78360_2',
            format: 'aac',
            metadataUrl: 'https://nowwave.radio/player/publish/playlist.json',
            pollInterval: 30000,
            defaultVolume: 1.0,
            defaultArtwork: '/player/NWR_text_logo_angle.png',
            defaultTitle: 'Now Wave Radio',
            defaultArtist: 'The Next Wave Today',
            defaultProgram: '🛜 NowWave.Radio',
            defaultPresenter: '💌 dj@NowWave.Radio'
        };
        this.audioService = new AudioService({
            streamUrl: this.config.streamUrl,
            format: [this.config.format],
            volume: this.config.defaultVolume
        });
        this.isPlaying = false;
        this.currentTab = 'live';
        this.lovedTracks = new Set(this.loadLovedTracks());
        this.recentTracks = [];
        this.maxRecentTracks = 5;
        this.currentArtworkUrl = '';
        
        this.initializeElements();
        this.setupBackgroundElements();
        this.attachEventListeners();
        this.startMetadataPolling();       
        this.switchTab('live');
        this.resetDisplayToDefault();
    }
    
    initializeElements() {
        this.playButton = document.getElementById('playButton');
        this.loveButton = document.getElementById('loveButton');
        this.albumArt = document.getElementById('albumArt');
        this.trackTitle = document.getElementById('trackTitle');
        this.trackArtist = document.getElementById('trackArtist');
        this.programTitle = document.getElementById('programTitle');
        this.presenterName = document.getElementById('presenterName');
        this.nowPlayingLabel = document.querySelector('.now-playing');
        this.tabs = document.getElementById('tabs');
        this.views = {
            live: document.getElementById('liveView'),
            recent: document.getElementById('recentView'),
            schedule: document.getElementById('scheduleView'),
            catchup: document.getElementById('catchupView'),
            favorites: document.getElementById('favoritesView')
        };

    }

    setupBackgroundElements() {
        // Create background container
        this.bgContainer = document.createElement('div');
        this.bgContainer.className = 'artwork-background';
        
        // Create the blurred background image element
        this.bgImage = document.createElement('div');
        this.bgImage.className = 'artwork-bg-image';
        
        // Create overlay for better readability
        this.bgOverlay = document.createElement('div');
        this.bgOverlay.className = 'artwork-overlay';
        
        // Assemble and append to the document
        this.bgContainer.appendChild(this.bgImage);
        this.bgContainer.appendChild(this.bgOverlay);
        document.body.insertBefore(this.bgContainer, document.body.firstChild);
        
        // Create a second background container for smooth transitions
        this.bgContainer2 = document.createElement('div');
        this.bgContainer2.className = 'artwork-background';
        
        this.bgImage2 = document.createElement('div');
        this.bgImage2.className = 'artwork-bg-image';
        
        this.bgOverlay2 = document.createElement('div');
        this.bgOverlay2.className = 'artwork-overlay';
        
        this.bgContainer2.appendChild(this.bgImage2);
        this.bgContainer2.appendChild(this.bgOverlay2);
        document.body.insertBefore(this.bgContainer2, document.body.firstChild);
        
        // Set initial active state
        this.activeBackground = 1;
        this.bgContainer.classList.add('active');
    }

    attachEventListeners() {
        this.playButton.addEventListener('click', () => this.togglePlay());
        this.loveButton.addEventListener('click', () => this.toggleLove());
        this.tabs.addEventListener('click', (e) => {
            if (e.target.matches('.tab-button')) {
                this.switchTab(e.target.dataset.tab);
            }
        });
        
        // Register event listeners with the AudioService
        this.audioService
            .addEventListener('onPlay', () => this.updatePlayButton(true))
            .addEventListener('onStop', () => this.updatePlayButton(false))
            .addEventListener('onError', () => this.handleError());
            
        // Handle album art load events to update background
        this.albumArt.addEventListener('load', () => this.updateBackground(this.albumArt.src));
    }

    updateBackground(imageUrl, forceUpdate = false) {
        // Skip if it's the same URL or a default image, unless force update is requested
        if (!forceUpdate && (imageUrl === this.currentArtworkUrl || 
            imageUrl.includes('NWR_text_logo_angle.png'))) {
            return;
        }
        
        // Store current artwork URL even if it's default image
        this.currentArtworkUrl = imageUrl;
        
        // Don't update background if it's the default image
        if (imageUrl.includes('NWR_text_logo_angle.png')) {
            return;
        }
        
        // Only update if we're on the live tab
        if (this.currentTab !== 'live' && !forceUpdate) {
            return;
        }
        
        // Toggle between the two background containers for smooth transitions
        const activeBg = this.activeBackground === 1 ? this.bgImage2 : this.bgImage;
        const activeContainer = this.activeBackground === 1 ? this.bgContainer2 : this.bgContainer;
        const inactiveContainer = this.activeBackground === 1 ? this.bgContainer : this.bgContainer2;
        
        // Set the new background image
        activeBg.style.backgroundImage = `url(${imageUrl})`;
        
        // Hide the current background and show the new one
        inactiveContainer.classList.remove('active');
        activeContainer.classList.add('active');
        
        // Toggle the active background for next update
        this.activeBackground = this.activeBackground === 1 ? 2 : 1;
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
        // Be more explicit about play vs stop actions
        if (this.isPlaying) {
            console.log('User requested to stop playback');
            this.isPlaying = this.audioService.stop();
        } else {
            console.log('User requested to start playback');
            this.isPlaying = this.audioService.play();
        }
        
        this.updatePlayButton(this.isPlaying);
        
        // If we're stopping playback, reset display to default state
        if (!this.isPlaying) {
            this.resetDisplayToDefault();
        } else {
            // If starting playback, immediately fetch new metadata
            this.updateMetadata();
        }
    }
    
    resetDisplayToDefault() {
        // Reset display to default state when stream is stopped
        this.trackTitle.textContent = this.config.defaultTitle || 'Now Wave Radio';
        this.trackArtist.textContent = this.config.defaultArtist || 'The Next Wave Today';
        
        // Reset program information
        this.programTitle.textContent = this.config.defaultProgram || '🛜 NowWave.Radio';
        this.presenterName.textContent = this.config.defaultPresenter || '💌 dj@NowWave.Radio';
        
        // Reset album artwork
        const defaultArtwork = this.config.defaultArtwork || '/player/NWR_text_logo_angle.png';
        if (this.albumArt.src !== defaultArtwork) {
            this.albumArt.src = defaultArtwork;
        }
        
        // Reset background if we're on the live tab
        if (this.currentTab === 'live') {
            this.updateBackground(defaultArtwork, true);
        }

        // Reset love button state
        this.loveButton.dataset.loved = 'false';

        // Make sure the now playing label shows "Stopped"
        if (this.nowPlayingLabel) {
            this.nowPlayingLabel.textContent = 'Stopped';
            this.nowPlayingLabel.classList.remove('playing');
            this.nowPlayingLabel.classList.add('stopped');
        }       
    }

    updatePlayButton(isPlaying) {
        // Updated to use "Stop" icon (square) instead of "Pause" icon
        this.playButton.innerHTML = isPlaying 
            ? '<svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="12" height="16"/></svg>'
            : '<svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg>';
            
        // Add title attribute for accessibility
        this.playButton.title = isPlaying ? 'Stop' : 'Play';

        // Update the Now Playing label
        if (this.nowPlayingLabel) {
            this.nowPlayingLabel.textContent = isPlaying ? 'Now Playing' : 'Stopped';
            
            if (isPlaying) {
                this.nowPlayingLabel.classList.remove('stopped');
                this.nowPlayingLabel.classList.add('playing');
            } else {
                this.nowPlayingLabel.classList.remove('playing');
                this.nowPlayingLabel.classList.add('stopped');
            }
        }
    }
    
    async startMetadataPolling() {
        // Only fetch metadata initially if we're playing
        if (this.isPlaying) {
            await this.updateMetadata();
        }
        
        // Store polling interval so we can clear it when needed
        this.metadataInterval = setInterval(() => {
            // Only poll for metadata if we're playing
            if (this.isPlaying) {
                this.updateMetadata();
            }
        }, this.config.pollInterval);
    }
    
    async updateMetadata() {
        try {
            const response = await fetch(this.config.metadataUrl);
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
    
            const data = await response.json();
            
            // Add track to history before updating current track info
            if (data.title && data.artist) {
                this.addTrackToHistory(data);
            }

            // Update track information
            this.trackTitle.textContent = data.title || 'Now Wave Radio';
            this.trackArtist.textContent = data.artist || 'The Next Wave Today';
            
            // Update program information
            this.programTitle.textContent = data.program_title || '🛜 NowWave.Radio';
            this.presenterName.textContent = data.presenter ? `with ${data.presenter}` : '💌 dj@NowWave.Radio';

            // Update album artwork - note the change to use data.image
            if (data.image) {
                // Clean up the image path to remove any double slashes
                const cleanImagePath = data.image.replace(/^\/+/, '').replace(/\/+/g, '/');
                
                // Use environment-aware URL construction
                const artworkUrl = window.location.origin.includes('localhost') 
                    ? `/artwork/${cleanImagePath}`
                    : `https://nowwave.radio/${cleanImagePath}`;
                
                // Only update if the image URL has changed
                if (this.albumArt.src !== artworkUrl) {
                    this.albumArt.src = artworkUrl;
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

        // Set active tab attribute on body element for CSS targeting
        document.body.setAttribute('data-active-tab', tabName);

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
            case 'live':
                // If switching to live tab, make sure the background is visible
                if (this.currentArtworkUrl && !this.currentArtworkUrl.includes('NWR_text_logo_angle.png')) {
                    // Force background update when switching to live tab
                    this.updateBackground(this.currentArtworkUrl, true);
                }
                break;
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
        this.resetDisplayToDefault();
    }
}

// Initialize the player when the page loads
document.addEventListener('DOMContentLoaded', () => {
    // Make sure AudioService is loaded
    if (typeof AudioService === 'undefined') {
        console.error('AudioService not loaded!');
        return;
    }
    window.player = new NowWavePlayer();
});

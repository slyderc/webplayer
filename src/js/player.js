/**
 * NowWavePlayer - Main player class that coordinates all components
 */
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
        
        this.isPlaying = false;
        
        // Initialize services
        this.storageService = new StorageService();
        this.audioService = new AudioService({
            streamUrl: this.config.streamUrl,
            format: [this.config.format],
            volume: this.config.defaultVolume
        });
        this.metadataService = new MetadataService({
            metadataUrl: this.config.metadataUrl,
            pollInterval: this.config.pollInterval
        });
        
        // Initialize managers
        this.scheduleManager = new ScheduleManager();      
        this.trackManager = new TrackManager({
            maxRecentTracks: 25,
            storageService: this.storageService
        });
        this.backgroundManager = new BackgroundManager();
        this.uiManager = new UIManager(this.config);
        this.viewManager = new ViewManager({
            trackManager: this.trackManager
        });

        // Setup event handlers
        this.setupEventHandlers();
        
        // Start metadataService polling and handle updates
        this.setupMetadataHandling();
        
        // Initialize to default state
        this.viewManager.switchTab('live');
        this.uiManager.resetToDefault();
    }
    
    setupEventHandlers() {
        // Playback control
        document.getElementById('playButton').addEventListener('click', 
            () => this.togglePlay());
        
        // Love track
        document.getElementById('loveButton').addEventListener('click', 
            () => this.toggleLove());
        
        // Album art load handler
        document.getElementById('albumArt').addEventListener('load', 
            (e) => this.handleArtworkLoad(e.target.src));
        
        // Register tab callbacks
        this.viewManager
            .registerTabCallback('recent', () => {
                console.log('Recent tab activated');
                this.updateRecentView();
            })
            .registerTabCallback('live', () => {
                console.log('Live tab activated');
                this.updateLiveView();
            })
            .registerTabCallback('schedule', () => {
                console.log('Schedule tab activated');
                if (this.scheduleManager) {
                    this.scheduleManager.handleTabActivation();
                } else {
                    console.error('Schedule manager not available');
                }
            });
    
        this.scheduleManager.initialize();
        
        // Audio service event listeners
        this.audioService
            .addEventListener('onPlay', () => this.handlePlayStateChange(true))
            .addEventListener('onStop', () => this.handlePlayStateChange(false))
            .addEventListener('onError', () => this.handleError());
    }
    
    setupMetadataHandling() {
        this.metadataService
            .setCallback('onMetadataUpdate', (data) => this.handleMetadataUpdate(data))
            .setCallback('onError', (error) => console.error('Metadata error:', error))
            .startPolling(this.isPlaying);
    }
    
    togglePlay() {
        if (this.isPlaying) {
            this.isPlaying = this.audioService.stop();
        } else {
            this.isPlaying = this.audioService.play();
        }
        
        this.handlePlayStateChange(this.isPlaying);
        
        // Update metadata polling
        this.metadataService.startPolling(this.isPlaying);
    }
    
    toggleLove(specificTrackId = null) {
        const trackId = specificTrackId || 
            `${this.uiManager.elements.trackArtist.textContent}-${this.uiManager.elements.trackTitle.textContent}`;
        
        const isLoved = this.trackManager.toggleLove(trackId);
        
        // Update love button state
        this.uiManager.updateLoveButton(isLoved);
        
        // If we're on the recent tab, refresh the view
        if (this.viewManager.getCurrentTab() === 'recent') {
            this.updateRecentView();
        }
    }
    
    handlePlayStateChange(isPlaying) {
        this.isPlaying = isPlaying;
        this.uiManager.updatePlayButton(isPlaying);
        
        if (!isPlaying) {
            this.uiManager.resetToDefault();
        } else {
            // Immediate metadata fetch when starting playback
            this.metadataService.fetchMetadata();
        }
    }
    
    handleMetadataUpdate(data) {
        // Add track to history
        if (data.title && data.artist) {
            this.trackManager.addTrackToHistory(data);
        }
        
        // Update UI with new track data
        this.uiManager.updateTrackInfo(data);
        
        // Update love button state
        const trackId = `${data.artist}-${data.title}`;
        this.uiManager.updateLoveButton(this.trackManager.isLoved(trackId));
        
        // Update recent view if active
        if (this.viewManager.getCurrentTab() === 'recent') {
            this.updateRecentView();
        }
    }
    
    handleArtworkLoad(imageUrl) {
        this.backgroundManager.updateBackground(
            imageUrl,
            this.viewManager.getCurrentTab()
        );
    }
    
    updateScheduleView() {
        // Initialize schedule manager if not already initialized
        if (!this.scheduleManager.scheduleContainer) {
            this.scheduleManager.initialize();
        } else {
            // Update the view with latest data
            this.scheduleManager.updateScheduleView();
        }
    }

    updateRecentView() {
        const tracks = this.trackManager.getRecentTracks();
        this.viewManager.updateRecentTracksView(
            tracks, 
            (trackId) => this.toggleLove(trackId)
        );
    }

    updateLiveView() {
        // If switching to live tab, ensure background is updated
        if (this.backgroundManager.currentArtworkUrl && 
            !this.backgroundManager.currentArtworkUrl.includes('NWR_text_logo_angle.png')) {
            this.backgroundManager.updateBackground(
                this.backgroundManager.currentArtworkUrl,
                'live',
                true
            );
        }
    }
    
    handleError() {
        console.error('Audio stream error occurred');
        this.isPlaying = false;
        this.uiManager.updatePlayButton(false);
        this.uiManager.resetToDefault();
    }
}


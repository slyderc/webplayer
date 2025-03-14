/**
 * NowWavePlayer - Main player class that coordinates all components
 */
class NowWavePlayer {
    constructor(options = {}) {
        // Get configuration from global object
        this.config = window.NWR_CONFIG || {
            streamUrl: 'https://streaming.live365.com/a78360_2',
            format: 'aac',
            metadataUrl: 'https://nowwave.radio/player/publish/playlist.json',
            pollInterval: 5000,
            defaultVolume: 1.0,
            defaultArtwork: '/player/NWR_text_logo_angle.png',
            cachedArtworkPath: '/player/publish/ca/',
            defaultTitle: 'Now Wave Radio',
            defaultArtist: 'The Next Wave Today',
            defaultProgram: '🛜 NowWave.Radio',
            defaultPresenter: '💌 dj@NowWave.Radio',
            // Mixcloud configuration
            mixcloud: {
                username: 'nowwaveradio',
                apiUrl: 'https://api.mixcloud.com'
            }
        };
        
        this.isPlaying = false;
        this.mixcloudContentLoaded = false;
        
        // Set GDPR manager if provided
        this.gdprManager = options.gdprManager || null;
        
        // Initialize services
        this.storageService = new StorageService();
        this.analyticsService = new AnalyticsService({
            apiEndpoint: '/webplayer/php/api/track_analytics.php',
            enabled: true
        });
        this.audioService = new AudioService({
            streamUrl: this.config.streamUrl,
            format: [this.config.format],
            volume: this.config.defaultVolume
        });
        this.metadataService = new MetadataService({
            metadataUrl: this.config.metadataUrl,
            pollInterval: this.config.pollInterval
        });
        
        // If GDPR manager is provided, set up the consent callback
        if (this.gdprManager) {
            this.gdprManager.options.onConsentGiven = () => {
                this.preloadMixcloudContent();
            };
        }
        
        // Initialize managers
        this.scheduleManager = new ScheduleManager();      

        // Track manager now only handles recent tracks history
        this.trackManager = new TrackManager({
            maxRecentTracks: 30,
            storageService: this.storageService,
            cachedArtworkPath: this.config.cachedArtworkPath,
            defaultArtwork: this.config.defaultArtwork
        });
        
        // Initialize Mixcloud manager for archived shows
        this.mixcloudManager = new MixcloudManager({
            mixcloudUsername: this.config.mixcloud?.username || 'nowwaveradio',
            apiUrl: this.config.mixcloud?.apiUrl || 'https://api.mixcloud.com',
            limit: 100
        });
        
        // New LikeManager handles all like functionality
        this.likeManager = new LikeManager({
            storageService: this.storageService,
            analyticsService: this.analyticsService,
            defaultArtwork: this.config.defaultArtwork,
            cachedArtworkPath: this.config.cachedArtworkPath
        });
        
        // ShareManager for track sharing functionality
        this.shareManager = new ShareManager({
            stationUrl: 'https://nowwave.radio',
            stationName: 'Now Wave Radio',
            storageService: this.storageService,
            defaultArtwork: this.config.defaultArtwork
        });
        
        // Register player as observer for like changes
        this.likeManager.addObserver(this);
        
        this.backgroundManager = new BackgroundManager({
            defaultArtwork: this.config.defaultArtwork
        });

        this.uiManager = new UIManager(this.config);

        this.viewManager = new ViewManager({
            trackManager: this.trackManager,
            likeManager: this.likeManager,
            shareManager: this.shareManager,
            cachedArtworkPath: this.config.cachedArtworkPath,
            defaultArtwork: this.config.defaultArtwork
        });
        
        this.setupEventHandlers();
        this.setupMetadataHandling();       
        this.viewManager.switchTab('live');
        this.uiManager.resetToDefault();
        
        // Preload Mixcloud content in the background
        this.preloadMixcloudContent();
    }
    
    setupEventHandlers() {
        // Playback control
        document.getElementById('playButton').addEventListener('click', 
            () => this.togglePlay());
        
        // Love track
        document.getElementById('loveButton').addEventListener('click', 
            () => this.toggleLove());
            
        // Share track
        document.getElementById('shareButton').addEventListener('click', 
            (e) => this.shareCurrentTrack(e.currentTarget));
        
        // Album art load handler
        document.getElementById('albumArt').addEventListener('load', 
            (e) => this.handleArtworkLoad(e.target.src));
            
        // Make logo in live view clickable to show GDPR consent (it's also handled by GDPRManager)
        const headerLogo = document.querySelector('#liveView .logo-container img');
        if (headerLogo && this.gdprManager) {
            headerLogo.style.cursor = 'pointer';
            headerLogo.addEventListener('click', () => {
                this.gdprManager.showConsentOverlay();
            });
        }
        
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
            })
            .registerTabCallback('favorites', () => {
                console.log('Favorites tab activated');
                this.updateFavoritesView();
            })
            .registerTabCallback('catchup', () => {
                console.log('Mixcloud Archive tab activated');
                if (this.mixcloudContentLoaded) {
                    console.log('Using pre-loaded Mixcloud content');
                } else {
                    this.updateMixcloudArchiveView();
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
    
    /**
     * Observer method that gets called when a track's like status changes
     */
    onLikeStatusChanged(trackId, isLoved) {
        const currentPlayingTrackId = `${this.uiManager.elements.trackArtist.textContent}-${this.uiManager.elements.trackTitle.textContent}`;
        
        // Update main player UI if this is the current track
        if (trackId === currentPlayingTrackId) {
            this.uiManager.updateLoveButton(isLoved);
        }
        
        // Update view based on current tab
        const currentTab = this.viewManager.getCurrentTab();
        if (currentTab === 'recent') {
            this.updateRecentView();
        } 
        else if (currentTab === 'favorites') {
            if (isLoved) {
                // If liked from main player and it's not already in favorites view, add it
                if (trackId === currentPlayingTrackId && 
                    !this.viewManager.views.favorites.querySelector(`[data-track-id="${trackId}"]`)) {
                    this.addNewFavoriteToView(this.getCurrentTrackData());
                } else {
                    // Otherwise refresh the entire view
                    this.updateFavoritesView();
                }
            } else {
                // If unliked, remove from view
                this.removeTrackFromFavoritesView(trackId);
            }
        }
    }
    
    /**
     * Simplified toggleLove method that uses LikeManager
     */
    toggleLove(specificTrackId = null) {
        // Get the track ID to toggle
        const trackId = specificTrackId || 
            `${this.uiManager.elements.trackArtist.textContent}-${this.uiManager.elements.trackTitle.textContent}`;
        
        // Create track data if toggling from main player
        let trackData = null;
        if (!specificTrackId) {
            trackData = this.getCurrentTrackData();
        }
        
        // Toggle the like status in the manager
        const isLoved = this.likeManager.toggleLove(trackId, trackData);
        
        // Log which tab the like came from (for debugging)
        console.log('Liked from tab:', this.viewManager.getCurrentTab());
        
        // Return the new status (observer will handle UI updates)
        return isLoved;
    }
    
    /**
     * Helper method to get current track data
     */
    getCurrentTrackData() {
        const trackId = `${this.uiManager.elements.trackArtist.textContent}-${this.uiManager.elements.trackTitle.textContent}`;
        
        // Try to find in recent tracks first
        const recentTrack = this.trackManager.recentTracks.find(t => t.id === trackId);
        
        // Get artwork URL with proper fallback logic
        let artworkUrl = recentTrack ? recentTrack.artwork_url : null;
        
        // If no recent track or no artwork_url, use the current display image
        if (!artworkUrl) {
            artworkUrl = this.uiManager.elements.albumArt.src;
            
            // If the image is displaying an error or is the default, use the default
            if (artworkUrl.includes('error') || 
                artworkUrl.includes(this.config.defaultArtwork) || 
                this.uiManager.elements.albumArt.naturalWidth === 0) {
                artworkUrl = this.config.defaultArtwork;
            }
        }
        
        return {
            id: trackId,
            title: this.uiManager.elements.trackTitle.textContent,
            artist: this.uiManager.elements.trackArtist.textContent,
            artwork_url: artworkUrl,
            artwork_hash: recentTrack ? recentTrack.artwork_hash : 
                this.likeManager.generateHash(
                    this.uiManager.elements.trackArtist.textContent,
                    this.uiManager.elements.trackTitle.textContent
                ),
            played_at: new Date().toISOString()
        };
    }
        
    /**
     * Method to add a single favorite to the view without refreshing the entire list
     */
    addNewFavoriteToView(track) {
        // Check if we're on the favorites tab
        if (this.viewManager.getCurrentTab() !== 'favorites') {
            return;
        }
        
        const favoritesView = this.viewManager.views.favorites;
        
        // If empty state is showing, clear it
        if (favoritesView.querySelector('.empty-state')) {
            favoritesView.innerHTML = '<div id="favoritesTracksContainer"></div>';
        }
        
        // Get or create the container
        let container = favoritesView.querySelector('#favoritesTracksContainer');
        if (!container) {
            container = document.createElement('div');
            container.id = 'favoritesTracksContainer';
            favoritesView.appendChild(container);
        }
        
        // Check if this track is already in the list
        const existingItem = container.querySelector(`[data-track-id="${track.id}"]`);
        if (existingItem) {
            // It's already in the list, do nothing
            return;
        }

        // Use likeManager for artwork URLs
        const artworkUrls = this.likeManager.getArtworkUrl(track);
        console.log('Track image URLs:', {
            primaryUrl: artworkUrls.primaryUrl,
            fallbackUrl: artworkUrls.fallbackUrl,
            defaultUrl: artworkUrls.defaultUrl,
            trackInfo: {
                id: track.id,
                title: track.title,
                artist: track.artist,
                artwork_hash: track.artwork_hash
            }
        });
        
        // Create new track item HTML
        const trackItemHTML = `
            <div class="track-item" style="opacity: 0; transition: opacity 0.3s ease;">
                <img class="track-artwork" 
                    src="${artworkUrls.primaryUrl}" 
                    data-fallback="${artworkUrls.fallbackUrl}"
                    data-default="${artworkUrls.defaultUrl}"
                    data-retry="0"
                    alt="${track.title} artwork"
                    onerror="if(this.dataset.retry === '0') { 
                            this.dataset.retry = '1'; 
                            this.src = this.dataset.fallback; 
                            } 
                            else { 
                            this.dataset.retry = '2'; 
                            this.src = '/player/NWR_text_logo_angle.png';
                            this.onerror = null; /* Prevent further errors */
                            }">
                    <div class="track-info">
                <p class="track-title">${track.title}</p>
                <p class="track-artist">${track.artist}</p>
            </div>
            <div class="track-actions">
                <button class="heart-button" 
                        data-track-id="${track.id}"
                        data-loved="true">
                    <svg class="heart-icon" viewBox="0 0 24 24">
                        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
                    </svg>
                </button>
                <span class="time-ago">just now</span>
            </div>
        </div>
        `;
        
        // Create a container for the new item
        const tempContainer = document.createElement('div');
        tempContainer.innerHTML = trackItemHTML;
        const newTrackItem = tempContainer.firstElementChild;
        
        // Insert at the top of the list
        if (container.firstChild) {
            container.insertBefore(newTrackItem, container.firstChild);
        } else {
            container.appendChild(newTrackItem);
        }
        
        // Add click handler for the heart button
        const heartButton = newTrackItem.querySelector('.heart-button');
        heartButton.addEventListener('click', (e) => {
            const trackId = e.currentTarget.dataset.trackId;
            
            // Call the toggleLove method
            const isLoved = this.toggleLove(trackId);
            
            // Update visual state
            e.currentTarget.dataset.loved = isLoved;
            
            // If unloved, remove the item
            if (!isLoved) {
                const trackItem = e.currentTarget.closest('.track-item');
                if (trackItem) {
                    trackItem.style.opacity = '0';
                    
                    setTimeout(() => {
                        trackItem.remove();
                        
                        // Check if we need to show empty state
                        if (container.children.length === 0) {
                            favoritesView.innerHTML = `
                                <div class="empty-state">
                                    <div class="empty-state-icon">❤️</div>
                                    <h3>No Favorites Yet</h3>
                                    <p>Click the heart icon next to a track while it's playing to add it to your favorites.</p>
                                </div>
                            `;
                        }
                    }, 300);
                }
            }
        });
        
        // Fade in the new item
        setTimeout(() => {
            newTrackItem.style.opacity = '1';
        }, 50);
    }

    removeTrackFromFavoritesView(trackId) {
        // Check if we're on the favorites tab
        if (this.viewManager.getCurrentTab() !== 'favorites') {
            return;
        }
        
        const favoritesView = this.viewManager.views.favorites;
        const container = favoritesView.querySelector('#favoritesTracksContainer');
        
        // If no container, nothing to do
        if (!container) return;
        
        // Find the track item to remove
        const trackItem = container.querySelector(`.heart-button[data-track-id="${trackId}"]`)?.closest('.track-item');
        
        if (trackItem) {
            // Fade out the item
            trackItem.style.opacity = '0';
            trackItem.style.transition = 'opacity 0.3s ease';
            
            // Remove after animation
            setTimeout(() => {
                trackItem.remove();
                
                // Check if we need to show the empty state
                if (container.children.length === 0) {
                    favoritesView.innerHTML = `
                        <div class="empty-state">
                            <div class="empty-state-icon">❤️</div>
                            <h3>No Favorites Yet</h3>
                            <p>Click the heart icon next to a track while it's playing to add it to your favorites.</p>
                        </div>
                    `;
                }
            }, 300);
        }
    }
    
    handlePlayStateChange(isPlaying) {
        this.isPlaying = isPlaying;
        this.uiManager.updatePlayButton(isPlaying);
        
        // Track play/stop events if we have current track data
        const currentTrack = this.getCurrentTrackData();
        if (currentTrack && currentTrack.title !== 'Loading...' && this.analyticsService) {
            if (isPlaying) {
                this.analyticsService.trackPlay(currentTrack);
            } else {
                this.analyticsService.trackStop(currentTrack);
            }
        }
        
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
        
        // Update love button state - now using likeManager
        const trackId = `${data.artist}-${data.title}`;
        this.uiManager.updateLoveButton(this.likeManager.isLoved(trackId));
        
        // Update recent view if active
        if (this.viewManager.getCurrentTab() === 'recent') {
            this.updateRecentView();
        }
        
        // Update schedule view if active to refresh "On Air" status
        if (this.viewManager.getCurrentTab() === 'schedule') {
            this.updateScheduleOnAirStatus();
        }
    }
    
    // Method to update only the "On Air" status in the schedule without full reload
    updateScheduleOnAirStatus() {
        if (this.scheduleManager && this.scheduleManager.generatedSchedule) {
            const now = new Date();
            // Update the view using the existing schedule data but with current time
            this.scheduleManager.updateScheduleView(this.scheduleManager.generatedSchedule, now);
            console.log('Schedule "On Air" status updated due to metadata change');
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
            (trackId) => this.toggleLove(trackId),
            this.setupShareButtonHandlers.bind(this)
        );
    }
    
    /**
     * Share the currently playing track
     */
    shareCurrentTrack(buttonElement) {
        try {
            // Make sure there's a track title and artist
            if (!this.uiManager.elements.trackTitle.textContent || 
                this.uiManager.elements.trackTitle.textContent === 'Loading...' ||
                !this.uiManager.elements.trackArtist.textContent) {
                console.log('No track data available to share');
                return;
            }
            
            const trackData = this.getCurrentTrackData();
            if (trackData) {
                this.shareManager.showSharePopup(trackData, buttonElement);
            }
        } catch (error) {
            console.error('Error sharing current track:', error);
        }
    }
    
    /**
     * Setup share button handlers for track lists
     */
    setupShareButtonHandlers(container) {
        if (!container) return;
        
        const shareButtons = container.querySelectorAll('.share-button');
        shareButtons.forEach(button => {
            button.addEventListener('click', (e) => {
                e.stopPropagation();
                const trackId = e.currentTarget.dataset.trackId;
                
                // Find track data
                let trackData = null;
                const recentTracks = this.trackManager.getRecentTracks();
                const lovedTracks = this.likeManager.getLovedTracksWithDetails(recentTracks);
                
                // Try to find in recent tracks first
                trackData = recentTracks.find(track => track.id === trackId);
                
                // If not found, try loved tracks
                if (!trackData) {
                    trackData = lovedTracks.find(track => track.id === trackId);
                }
                
                // If still not found but we have an ID, create minimal track data
                if (!trackData && trackId) {
                    const parts = trackId.split('-');
                    const artist = parts.shift();
                    const title = parts.join('-');
                    
                    trackData = {
                        id: trackId,
                        artist: artist,
                        title: title,
                        artwork_url: this.config.defaultArtwork
                    };
                }
                
                if (trackData) {
                    this.shareManager.showSharePopup(trackData, button);
                }
            });
        });
    }

    updateLiveView() {
        // If switching to live tab, ensure background is updated
        if (this.backgroundManager.currentArtworkUrl && 
            !this.backgroundManager.currentArtworkUrl.includes(this.config.defaultArtwork)) {
            this.backgroundManager.updateBackground(
                this.backgroundManager.currentArtworkUrl,
                'live',
                true
            );
        }
    }

    // Updated to use likeManager for getting loved tracks
    updateFavoritesView() {
        const tracks = this.likeManager.getLovedTracksWithDetails(this.trackManager.recentTracks);
        this.viewManager.updateFavoritesView(
            tracks, 
            (trackId) => this.toggleLove(trackId),
            this.setupShareButtonHandlers.bind(this)
        );
    }
    
    handleError(error, errorType) {
        console.error(`Audio stream error occurred: ${errorType || 'unknown'}`, error);
        this.isPlaying = false;
        this.uiManager.updatePlayButton(false);
        this.uiManager.resetToDefault();
        
        // Stop metadata polling when stream errors
        if (this.metadataService) {
            this.metadataService.startPolling(false);
        }
    }
    
    /**
     * Update Mixcloud archive view
     */
    async updateMixcloudArchiveView() {
        const catchupView = this.viewManager.views.catchup;
        
        if (!catchupView) {
            console.error('Catchup view element not found');
            return;
        }
        
        // Set loading state
        catchupView.innerHTML = this.mixcloudManager.generateArchiveShowsHTML();
        
        try {
            // Fetch archived shows from Mixcloud
            await this.mixcloudManager.fetchArchivedShows();
            
            // Update the view with the fetched shows
            catchupView.innerHTML = this.mixcloudManager.generateArchiveShowsHTML();
            
            // Initialize event listeners
            this.mixcloudManager.initializeEventListeners(catchupView, (showKey) => {
                this.playMixcloudShow(showKey);
            });
            
        } catch (error) {
            console.error('Error updating Mixcloud archive view:', error);
            catchupView.innerHTML = `
                <div class="error-container scrollable-container">
                    <p>Error loading Mixcloud archive: ${error.message}</p>
                    <button id="retryMixcloudFetch" class="retry-button">Retry</button>
                </div>
            `;
            
            // Add retry button handler
            const retryButton = catchupView.querySelector('#retryMixcloudFetch');
            if (retryButton) {
                retryButton.addEventListener('click', () => this.updateMixcloudArchiveView());
            }
        }
    }
    
    /**
     * Play a Mixcloud show
     * @param {string} showKey - Mixcloud show key
     */
    playMixcloudShow(showKey) {
        // Stop the current audio playback
        if (this.isPlaying) {
            this.audioService.stop();
            this.isPlaying = false;
            this.uiManager.updatePlayButton(false);
        }
        
        // Create the embedded player
        const embeddedPlayerHTML = this.mixcloudManager.generateEmbeddedPlayerHTML(showKey);
        
        // Create and append the embedded player container
        const embeddedPlayerContainer = document.createElement('div');
        embeddedPlayerContainer.id = 'mixcloudEmbeddedPlayer';
        embeddedPlayerContainer.innerHTML = embeddedPlayerHTML;
        document.body.appendChild(embeddedPlayerContainer);
        
        // Add click handler to the return button
        const returnButton = document.getElementById('returnToLiveButton');
        if (returnButton) {
            returnButton.addEventListener('click', () => this.closeMixcloudPlayer());
        }
    }
    
    /**
     * Close the Mixcloud embedded player and restore the main player
     */
    closeMixcloudPlayer() {
        // Remove the embedded player
        const embeddedPlayer = document.getElementById('mixcloudEmbeddedPlayer');
        if (embeddedPlayer) {
            embeddedPlayer.remove();
        }
    }
    
    /**
     * Preload Mixcloud content in the background
     * This allows the content to be ready when user clicks the tab
     */
    async preloadMixcloudContent() {
        // Don't reload if already loaded
        if (this.mixcloudContentLoaded) {
            return;
        }
        
        // Set initial content in the view (loading state)
        const catchupView = this.viewManager.views.catchup;
        if (catchupView) {
            catchupView.innerHTML = this.mixcloudManager.generateArchiveShowsHTML();
        }
        
        try {
            // Fetch archived shows in the background
            await this.mixcloudManager.fetchArchivedShows();
            
            // Update the view with the fetched shows
            if (catchupView) {
                catchupView.innerHTML = this.mixcloudManager.generateArchiveShowsHTML();
                
                // Initialize event listeners for when the tab is viewed
                this.mixcloudManager.initializeEventListeners(catchupView, (showKey) => {
                    this.playMixcloudShow(showKey);
                });
                
                this.mixcloudContentLoaded = true;
                console.log('Mixcloud content preloaded successfully');
            }
        } catch (error) {
            console.error('Error preloading Mixcloud content:', error);
            // We'll show the error when the user actually opens the tab
        }
    }
}
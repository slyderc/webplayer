class NowWavePlayer {
    constructor() {
        this.audio = new Audio('https://streaming.live365.com/a78360_2');
        this.isPlaying = false;
        this.currentTab = 'live';
        this.lovedTracks = new Set(this.loadLovedTracks());
        
        this.initializeElements();
        this.attachEventListeners();
        this.startMetadataPolling();
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
        this.tabContent = document.getElementById('tabContent');
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
            
            // Update track information
            this.trackTitle.textContent = data.title || 'Unknown Track';
            this.trackArtist.textContent = data.artist || 'Unknown Artist';
            
            // Update program information
            this.programTitle.textContent = data.program_title || '';
            this.presenterName.textContent = data.presenter ? `with ${data.presenter}` : '';
            
            // Update album artwork - note the change to use data.image
            if (data.image) {
                // Clean up the image path to remove any double slashes
                const cleanImagePath = data.image.replace(/^\/+/, '');
                
                // Construct the correct URL based on environment
                const artworkUrl = window.location.origin.includes('localhost') 
                    ? `/artwork/${cleanImagePath}`
                    : `https://nowwave.radio/${cleanImagePath}`;
                
                // Only update if the image URL has changed
                if (this.albumArt.src !== artworkUrl) {
                    this.albumArt.src = artworkUrl;
                }
            } else {
                this.albumArt.src = '/placeholder.jpg';
            }
            
            
            // Update love button state
            const trackId = `${data.artist}-${data.title}`;
            this.loveButton.dataset.loved = this.lovedTracks.has(trackId);
    
        } catch (error) {
            console.error('Error fetching metadata:', error);
        }
    }

    toggleLove() {
        const trackId = `${this.trackArtist.textContent}-${this.trackTitle.textContent}`;
        
        if (this.lovedTracks.has(trackId)) {
            this.lovedTracks.delete(trackId);
        } else {
            this.lovedTracks.add(trackId);
        }
        
        this.loveButton.dataset.loved = this.lovedTracks.has(trackId);
        this.saveLovedTracks();
    }
    
    loadLovedTracks() {
        const saved = localStorage.getItem('lovedTracks');
        return saved ? JSON.parse(saved) : [];
    }
    
    saveLovedTracks() {
        localStorage.setItem('lovedTracks', JSON.stringify([...this.lovedTracks]));
    }
    
    switchTab(tabName) {
        // Update active state
        this.tabs.querySelectorAll('.tab-button').forEach(button => {
            button.dataset.active = button.dataset.tab === tabName;
        });
        
        // Update content
        this.currentTab = tabName;
        this.updateTabContent();
    }
    
    updateTabContent() {
        // In a real implementation, this would fetch and display
        // the appropriate content for each tab
        const content = {
            live: '<p>Currently playing live stream</p>',
            schedule: '<p>Show schedule will appear here</p>',
            catchup: '<p>Past shows available on Mixcloud</p>',
            recent: '<p>Recent tracks will appear here</p>',
            favorites: '<p>Your loved tracks will appear here</p>'
        };
        
        this.tabContent.innerHTML = content[this.currentTab];
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

/**
 * UIManager - Handles UI updates and DOM manipulation
 */
class UIManager {
    constructor(options = {}) {
        this.options = {
            defaultTitle: 'Now Wave Radio',
            defaultArtist: 'The Next Wave Today',
            defaultProgram: '🛜 NowWave.Radio',
            defaultPresenter: '💌 dj@NowWave.Radio',
            defaultArtwork: '/player/NWR_text_logo_angle.png',
            ...options
        };
        
        this.elements = {
            playButton: document.getElementById('playButton'),
            loveButton: document.getElementById('loveButton'),
            albumArt: document.getElementById('albumArt'),
            trackTitle: document.getElementById('trackTitle'),
            trackArtist: document.getElementById('trackArtist'),
            programTitle: document.getElementById('programTitle'),
            presenterName: document.getElementById('presenterName'),
            nowPlayingLabel: document.querySelector('.now-playing')
        };
 
        this.contactButton = document.getElementById('contactButton');
        if (this.contactButton) {
            this.contactButton.addEventListener('click', this.handleContactButtonClick.bind(this));
        }

        this.contactFormInitialized = false;

    }
    
    updatePlayButton(isPlaying) {
        // Updated to use "Stop" icon (square) instead of "Pause" icon
        this.elements.playButton.innerHTML = isPlaying 
            ? '<svg xmlns="http://www.w3.org/2000/svg" class="ionicon" viewBox="0 0 512 512"><title>Pause</title><path style="" d="M208 432h-48a16 16 0 01-16-16V96a16 16 0 0116-16h48a16 16 0 0116 16v320a16 16 0 01-16 16zM352 432h-48a16 16 0 01-16-16V96a16 16 0 0116-16h48a16 16 0 0116 16v320a16 16 0 01-16 16z"></path></svg>'
            : '<svg xmlns="http://www.w3.org/2000/svg" class="ionicon" viewBox="0 0 512 512"><title>Play</title><path style="transform: translateX(16px);" d="M133 440a35.37 35.37 0 01-17.5-4.67c-12-6.8-19.46-20-19.46-34.33V111c0-14.37 7.46-27.53 19.46-34.33a35.13 35.13 0 0135.77.45l247.85 148.36a36 36 0 010 61l-247.89 148.4A35.5 35.5 0 01133 440z"></path></svg>';
            
        // Add title attribute for accessibility
        this.elements.playButton.title = isPlaying ? 'Stop' : 'Play';

        // Update the Now Playing label
        if (this.elements.nowPlayingLabel) {
            this.elements.nowPlayingLabel.textContent = isPlaying ? 'Now Playing' : 'Stopped';
            
            if (isPlaying) {
                this.elements.nowPlayingLabel.classList.remove('stopped');
                this.elements.nowPlayingLabel.classList.add('playing');
            } else {
                this.elements.nowPlayingLabel.classList.remove('playing');
                this.elements.nowPlayingLabel.classList.add('stopped');
            }
        }
    }
    
    updateTrackInfo(data) {
        if (!data) return;
        
        // Update track information
        if (data.title) this.elements.trackTitle.textContent = data.title;
        if (data.artist) this.elements.trackArtist.textContent = data.artist;
        
        // Update program information
        if (data.program_title) this.elements.programTitle.textContent = data.program_title;
        if (data.presenter) {
            this.elements.presenterName.textContent = `with ${data.presenter}`;
        }

        // Update album artwork
        if (data.image) {
            // Clean up the image path to remove any double slashes
            const cleanImagePath = data.image.replace(/^\/+/, '').replace(/\/+/g, '/');
            
            // Use environment-aware URL construction
            const artworkUrl = window.location.origin.includes('localhost') 
                ? `/artwork/${cleanImagePath}`
                : `https://nowwave.radio/${cleanImagePath}`;
            
            // Only update if the image URL has changed
            if (this.elements.albumArt.src !== artworkUrl) {
                this.elements.albumArt.src = artworkUrl;
            }
        }
    }
    
    resetToDefault() {
        // Reset display to default state when stream is stopped
        this.elements.trackTitle.textContent = this.options.defaultTitle;
        this.elements.trackArtist.textContent = this.options.defaultArtist;
        
        // Reset program information
        this.elements.programTitle.textContent = this.options.defaultProgram;
        this.elements.presenterName.textContent = this.options.defaultPresenter;
        
        // Reset album artwork
        const defaultArtwork = this.options.defaultArtwork;
        if (this.elements.albumArt.src !== defaultArtwork) {
            this.elements.albumArt.src = defaultArtwork;
        }

        // Reset love button state
        this.elements.loveButton.dataset.loved = 'false';

        // Make sure the now playing label shows "Stopped"
        if (this.elements.nowPlayingLabel) {
            this.elements.nowPlayingLabel.textContent = 'Stopped';
            this.elements.nowPlayingLabel.classList.remove('playing');
            this.elements.nowPlayingLabel.classList.add('stopped');
        }
    }
    
    updateLoveButton(isLoved) {
        if (this.elements.loveButton) {
            this.elements.loveButton.dataset.loved = isLoved;
        }
    }

    handleContactButtonClick() {
        // Show the contact form
        const contactFormOverlay = document.getElementById('contactFormOverlay');
        if (contactFormOverlay) {
            contactFormOverlay.classList.add('active');
            
            // Set up the event listener for the close button if not already set up
            if (!this.contactFormInitialized) {
                const closeButton = document.getElementById('closeContactForm');
                if (closeButton) {
                    closeButton.addEventListener('click', this.closeContactForm.bind(this));
                }
                
                // Set up form submission
                const contactForm = document.getElementById('contactForm');
                if (contactForm) {
                    contactForm.addEventListener('submit', this.handleFormSubmit.bind(this));
                }
                
                this.contactFormInitialized = true;
            }
        }
    }

    closeContactForm() {
        const contactFormOverlay = document.getElementById('contactFormOverlay');
        if (contactFormOverlay) {
            contactFormOverlay.classList.remove('active');
        }
    }
    
    handleFormSubmit(event) {
        // This will allow the form to submit to comment.php
        // You can add additional validation or processing here if needed
        console.log('Form submitted');
        
        // Optional: Close the form after submission
        // Uncomment this if you want the form to close automatically on submit:
        // setTimeout(() => this.closeContactForm(), 1000);
    }
}

// Export as global or module depending on environment
if (typeof module !== 'undefined' && module.exports) {
    module.exports = UIManager;
} else {
    window.UIManager = UIManager;
}


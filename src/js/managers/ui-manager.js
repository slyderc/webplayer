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
        ? '<svg xmlns="http://www.w3.org/2000/svg" class="ionicon" viewBox="0 0 512 512" width="28" height="28" stroke="currentColor" stroke-width="32"><rect x="128" y="96" width="64" height="320" rx="16" ry="16"></rect><rect x="320" y="96" width="64" height="320" rx="16" ry="16"></rect></svg>'
        : '<svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" style="stroke: #2563eb !important; stroke-width: 1; stroke-linecap: round; stroke-linejoin: round;"><polygon points="5 3 19 12 5 21 5 3" fill="#2563eb" style="fill: #2563eb !important;"></polygon></svg>';
            
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
            
            // Set up the event listeners if not already set up
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
                
                // Success OK button
                const okButton = document.getElementById('successOkButton');
                if (okButton) {
                    okButton.addEventListener('click', this.handleSuccessOk.bind(this));
                }
                
                this.contactFormInitialized = true;
            }
        }
    }
    
    closeContactForm() {
        const contactFormOverlay = document.getElementById('contactFormOverlay');
        if (contactFormOverlay) {
            contactFormOverlay.classList.remove('active');
            
            // Return to the live tab after a short delay
            setTimeout(() => {
                if (window.viewManager) {
                    window.viewManager.switchTab('live');
                }
            }, 500);
        }
    }
        
    // Helper function to disable/enable form elements
    setFormElementsState(form, disabled) {
        const elements = form.querySelectorAll('input, textarea, button');
        elements.forEach(element => {
            element.disabled = disabled;
        });
        
        // Also handle the send button which is outside the form
        const sendButton = document.getElementById('sendMessage');
        if (sendButton) {
            sendButton.disabled = disabled;
        }
    }

    // Handle OK button click on success message
    handleSuccessOk() {
        // Keep the success message visible during slide-down
        const contactFormOverlay = document.getElementById('contactFormOverlay');
        if (contactFormOverlay) {
            // Start the slide-down animation
            contactFormOverlay.classList.remove('active');
            
            // After the animation completes, reset the form
            setTimeout(() => {
                // Reset the success message once it's off-screen
                const successMessage = document.getElementById('formSuccessMessage');
                if (successMessage) {
                    successMessage.classList.remove('active');
                }
                
                // Always return to the live tab
                if (window.viewManager) {
                    window.viewManager.switchTab('live');
                }
            }, 500);
        }
    }

    handleFormSubmit(event) {
        event.preventDefault(); // Prevent normal form submission
        
        const form = event.target;
        const formData = new FormData(form);
        
        // Get elements for state management
        const submitButton = document.getElementById('sendMessage');
        const formElements = form.querySelectorAll('input, textarea');
        
        // Disable form elements during submission to prevent multiple submissions
        if (submitButton) submitButton.disabled = true;
        formElements.forEach(el => el.disabled = true);
        
        // Add visual feedback
        if (submitButton) submitButton.textContent = 'Sending...';
        
        console.log('Form submission started');
        
        // Use vanilla XMLHttpRequest for maximum compatibility
        const xhr = new XMLHttpRequest();
        xhr.open('POST', form.action);
        
        xhr.onload = () => {
            console.log('Response received:', xhr.status, xhr.responseText);
            
            // Re-enable form elements
            if (submitButton) {
                submitButton.disabled = false;
                submitButton.textContent = 'Send';
            }
            formElements.forEach(el => el.disabled = false);
            
            if (xhr.status === 200) {
                try {
                    const response = JSON.parse(xhr.responseText);
                    
                    if (response.success) {
                        console.log('Message sent successfully');
                        
                        // Reset the form
                        form.reset();
                        
                        // Show success message
                        const successMessage = document.getElementById('formSuccessMessage');
                        if (successMessage) {
                            console.log('Showing success message');
                            successMessage.classList.add('active');
                        } else {
                            console.error('Success message element not found');
                            // Fallback: just close the form
                            setTimeout(() => this.closeContactForm(), 1000);
                        }
                    } else {
                        console.error('Error:', response.message);
                        alert('Error: ' + (response.message || 'Failed to send message'));
                    }
                } catch (e) {
                    console.error('Error parsing response:', e);
                    alert('An unexpected error occurred. Please try again.');
                }
            } else if (xhr.status === 429) {
                // Rate limit exceeded
                alert('Please wait a moment before sending another message.');
            } else if (xhr.status === 403) {
                // CSRF or other security issue
                console.error('Security issue detected');
                alert('Security verification failed. Please refresh the page and try again.');
            } else {
                console.error('Request failed with status:', xhr.status);
                alert('There was a problem sending your message. Please try again later.');
            }
        };
        
        xhr.onerror = () => {
            console.error('Network error occurred');
            
            // Re-enable form elements
            if (submitButton) {
                submitButton.disabled = false;
                submitButton.textContent = 'Send';
            }
            formElements.forEach(el => el.disabled = false);
            
            alert('Network error occurred. Please check your connection and try again.');
        };
        
        // Add timeout handling
        xhr.timeout = 10000; // 10 seconds
        xhr.ontimeout = () => {
            console.error('Request timed out');
            
            // Re-enable form elements
            if (submitButton) {
                submitButton.disabled = false;
                submitButton.textContent = 'Send';
            }
            formElements.forEach(el => el.disabled = false);
            
            alert('Request timed out. Please try again later.');
        };
        
        xhr.send(formData);
    }
}

// Export as global or module depending on environment
if (typeof module !== 'undefined' && module.exports) {
    module.exports = UIManager;
} else {
    window.UIManager = UIManager;
}


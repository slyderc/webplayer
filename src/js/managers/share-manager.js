/**
 * ShareManager - Handles track sharing functionality
 */
class ShareManager {
    constructor(options = {}) {
        this.options = {
            stationUrl: 'https://nowwave.radio',
            stationName: 'Now Wave Radio',
            defaultArtwork: '/player/NWR_text_logo_angle.png',
            ...options
        };
        
        this.storageService = this.options.storageService;
        
        // Check if Web Share API is available
        this.hasNativeShare = typeof navigator !== 'undefined' && 
                              navigator.share !== undefined;
    }
    
    /**
     * Share a track with the specified method
     * @param {Object} track - The track to share
     * @param {string} method - The sharing method to use
     * @param {HTMLElement} buttonElement - The button that was clicked (for positioning feedback)
     * @returns {Promise<boolean>} - Whether the share was successful
     */
    async shareTrack(track, method, buttonElement) {
        if (!track) {
            console.error('No track provided to share');
            return false;
        }
        
        // Create sharing text
        const shareText = this.createShareText(track);
        const shareTitle = `${track.title} by ${track.artist}`;
        const shareUrl = this.options.stationUrl;
        
        try {
            switch (method) {
                case 'copy':
                    await this.copyToClipboard(shareText, buttonElement);
                    return true;
                    
                case 'native':
                    if (this.hasNativeShare) {
                        await navigator.share({
                            title: shareTitle,
                            text: shareText,
                            url: shareUrl
                        });
                        return true;
                    } else {
                        // Fallback to copying to clipboard
                        await this.copyToClipboard(shareText, buttonElement);
                        return true;
                    }
                    
                case 'twitter':
                    this.openSocialShare('twitter', shareText, shareUrl);
                    return true;
                    
                case 'facebook':
                    this.openSocialShare('facebook', shareText, shareUrl);
                    return true;
                    
                case 'whatsapp':
                    this.openSocialShare('whatsapp', shareText, shareUrl);
                    return true;
                    
                case 'telegram':
                    this.openSocialShare('telegram', shareText, shareUrl);
                    return true;
                    
                case 'email':
                    this.openEmailShare(shareTitle, shareText);
                    return true;
                    
                default:
                    console.error('Unknown share method:', method);
                    return false;
            }
        } catch (error) {
            console.error('Error sharing track:', error);
            return false;
        }
    }
    
    /**
     * Create sharing text for a track
     * @param {Object} track - The track to create sharing text for
     * @returns {string} - The formatted sharing text
     */
    createShareText(track) {
        return `Check out this track I discovered on ${this.options.stationName}: ${track.title} by ${track.artist}\n${this.options.stationUrl}`;
    }
    
    /**
     * Copy text to clipboard
     * @param {string} text - The text to copy
     * @param {HTMLElement} buttonElement - The button that was clicked (for positioning feedback)
     * @returns {Promise<boolean>} - Whether the copy was successful
     */
    async copyToClipboard(text, buttonElement) {
        try {
            await navigator.clipboard.writeText(text);
            this.showFeedback('Copied to clipboard!', buttonElement);
            return true;
        } catch (error) {
            console.error('Failed to copy to clipboard:', error);
            
            // Fallback method for browsers without clipboard API
            const textarea = document.createElement('textarea');
            textarea.value = text;
            textarea.style.position = 'fixed'; // Make it invisible
            document.body.appendChild(textarea);
            textarea.select();
            
            try {
                const success = document.execCommand('copy');
                if (success) {
                    this.showFeedback('Copied to clipboard!', buttonElement);
                    return true;
                } else {
                    this.showFeedback('Copy failed, try again', buttonElement);
                    return false;
                }
            } catch (err) {
                console.error('Fallback clipboard copy failed:', err);
                this.showFeedback('Copy failed, try again', buttonElement);
                return false;
            } finally {
                document.body.removeChild(textarea);
            }
        }
    }
    
    /**
     * Open a social media sharing window
     * @param {string} platform - The platform to share on
     * @param {string} text - The text to share
     * @param {string} url - The URL to share
     */
    openSocialShare(platform, text, url) {
        let shareUrl;
        const encodedText = encodeURIComponent(text);
        const encodedUrl = encodeURIComponent(url);
        
        switch (platform) {
            case 'twitter':
                shareUrl = `https://twitter.com/intent/tweet?text=${encodedText}`;
                break;
                
            case 'facebook':
                shareUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`;
                break;
                
            case 'whatsapp':
                shareUrl = `https://wa.me/?text=${encodedText}`;
                break;
                
            case 'telegram':
                shareUrl = `https://t.me/share/url?url=${encodedUrl}&text=${encodedText}`;
                break;
                
            default:
                console.error('Unknown social platform:', platform);
                return;
        }
        
        window.open(shareUrl, '_blank', 'width=600,height=400');
    }
    
    /**
     * Open email sharing
     * @param {string} subject - The email subject
     * @param {string} body - The email body
     */
    openEmailShare(subject, body) {
        const mailtoUrl = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
        window.location.href = mailtoUrl;
    }
    
    /**
     * Show feedback message after a share action
     * @param {string} message - The message to show
     * @param {HTMLElement} targetElement - The element to show feedback near
     */
    showFeedback(message, targetElement) {
        // Create feedback element
        const feedback = document.createElement('div');
        feedback.className = 'share-feedback';
        feedback.textContent = message;
        
        // Position near the target element if provided
        if (targetElement && targetElement.getBoundingClientRect) {
            const rect = targetElement.getBoundingClientRect();
            feedback.style.position = 'fixed';
            feedback.style.top = `${rect.top - 40}px`;
            feedback.style.left = `${rect.left}px`;
        }
        
        // Add to document
        document.body.appendChild(feedback);
        
        // Animate in
        setTimeout(() => {
            feedback.classList.add('visible');
        }, 10);
        
        // Remove after delay
        setTimeout(() => {
            feedback.classList.remove('visible');
            setTimeout(() => {
                document.body.removeChild(feedback);
            }, 300);
        }, 2000);
    }
    
    /**
     * Create and show the share popup with sharing options
     * @param {Object} track - The track to share
     * @param {HTMLElement} buttonElement - The button that was clicked
     */
    showSharePopup(track, buttonElement) {
        // Create popup container
        const popup = document.createElement('div');
        popup.className = 'share-popup';
        
        // Create popup content
        popup.innerHTML = `
            <div class="share-popup-header">
                <h3>Share Track</h3>
                <button class="close-button">
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <line x1="18" y1="6" x2="6" y2="18"></line>
                        <line x1="6" y1="6" x2="18" y2="18"></line>
                    </svg>
                </button>
            </div>
            <div class="share-popup-content">
                <div class="share-track-info">
                    <p class="share-track-title">${track.title}</p>
                    <p class="share-track-artist">${track.artist}</p>
                </div>
                <div class="share-options">
                    <button class="share-option" data-share-method="copy">
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                        </svg>
                        <span>Copy Link</span>
                    </button>
                    <button class="share-option" data-share-method="twitter">
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24">
                            <path fill="currentColor" d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"></path>
                        </svg>
                        <span>Twitter/X</span>
                    </button>
                    <button class="share-option" data-share-method="facebook">
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24">
                            <path fill="currentColor" d="M9.198 21.5h4v-8.01h3.604l.396-3.98h-4V7.5a1 1 0 0 1 1-1h3v-4h-3a5 5 0 0 0-5 5v2.01h-2l-.396 3.98h2.396v8.01Z"></path>
                        </svg>
                        <span>Facebook</span>
                    </button>
                    <button class="share-option" data-share-method="whatsapp">
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24">
                            <path fill="currentColor" d="M17.507 14.307l.009.075c-1.836 1.597-3.842 2.655-6.479 2.655c-4.697 0-8.63-3.79-8.63-8.38c0-2.288 1.17-4.397 3.094-5.605c1.603-1.034 2.942-1.269 4.937-1.354c1.654.07 2.492.282 3.034.476l.296.02c1.903.382 3.29 1.487 4.28 2.736c.793 1.356.976 2.62.576 4.377m-3.866-7.256c.34.047.676.102.965.159c.508.096 1.16.345 1.542.765c.742.82.982 1.875.753 3.254c-.192 1.15-1.02 2.048-2.139 2.63c-.898.47-1.923.715-3.137.782c-.796.044-1.143.099-1.4.302c-.268.212-.531.514-.647.855c-.196.576-.275 1.034-.53 1.388c-.117.162-.22.297-.363.407c-.146.115-.344.16-.5.187c-.16.029-.588.1-1.954-.585c-1.759-.88-2.985-2.058-3.743-3.193c-.982-1.462-1.352-2.952-1.087-4.38c.217-1.171.83-2.203 1.737-2.914c.915-.72 2.162-1.086 3.472-1.006c1.34.083 2.505.444 3.478 1.05c.705.439 1.15 1.095 1.552 1.774"></path>
                        </svg>
                        <span>WhatsApp</span>
                    </button>
                    <button class="share-option" data-share-method="telegram">
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24">
                            <path fill="currentColor" d="m12 20.664l-1.69-1.556l.497-7.323l-4.003 3.35l-1.424-1.082l5.367-14.337l1.812 1.375l-.564 8.32l3.863-3.235l1.424 1.082z"></path>
                        </svg>
                        <span>Telegram</span>
                    </button>
                    <button class="share-option" data-share-method="email">
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path>
                            <polyline points="22,6 12,13 2,6"></polyline>
                        </svg>
                        <span>Email</span>
                    </button>
                </div>
            </div>
        `;
        
        // Position popup near button if available
        if (buttonElement && buttonElement.getBoundingClientRect) {
            const rect = buttonElement.getBoundingClientRect();
            popup.style.position = 'fixed';
            popup.style.top = `${rect.bottom + 10}px`;
            popup.style.left = `${rect.left - 160 + rect.width / 2}px`;
        } else {
            popup.style.position = 'fixed';
            popup.style.top = '50%';
            popup.style.left = '50%';
            popup.style.transform = 'translate(-50%, -50%)';
        }
        
        // Add to document
        document.body.appendChild(popup);
        
        // Add click handlers for share options
        popup.querySelectorAll('.share-option').forEach(button => {
            button.addEventListener('click', async (e) => {
                const method = e.currentTarget.dataset.shareMethod;
                
                // Native share on mobile devices
                if (method === 'native') {
                    await this.shareTrack(track, 'native', button);
                } else {
                    await this.shareTrack(track, method, button);
                }
                
                // Close popup
                document.body.removeChild(popup);
            });
        });
        
        // Add close button handler
        popup.querySelector('.close-button').addEventListener('click', () => {
            document.body.removeChild(popup);
        });
        
        // Close when clicking outside
        document.addEventListener('click', function closePopup(e) {
            if (!popup.contains(e.target) && e.target !== buttonElement) {
                document.body.removeChild(popup);
                document.removeEventListener('click', closePopup);
            }
        });
        
        // Add mobile native share if available
        if (this.hasNativeShare) {
            const nativeShareButton = document.createElement('button');
            nativeShareButton.className = 'share-option';
            nativeShareButton.dataset.shareMethod = 'native';
            nativeShareButton.innerHTML = `
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"></path>
                    <polyline points="16 6 12 2 8 6"></polyline>
                    <line x1="12" y1="2" x2="12" y2="15"></line>
                </svg>
                <span>Share...</span>
            `;
            
            // Insert as first option
            const shareOptions = popup.querySelector('.share-options');
            shareOptions.insertBefore(nativeShareButton, shareOptions.firstChild);
            
            nativeShareButton.addEventListener('click', async () => {
                await this.shareTrack(track, 'native', nativeShareButton);
                document.body.removeChild(popup);
            });
        }
    }
}

// Export as global or module depending on environment
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ShareManager;
} else {
    window.ShareManager = ShareManager;
}
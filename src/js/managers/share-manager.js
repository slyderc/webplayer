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
        
        // Prepare artwork URL, prioritizing hashed artwork URL for persistence
        let artworkUrl = null;
        
        // First, try to use the hash-based artwork if available
        if (track.artwork_hash) {
            artworkUrl = `/player/publish/ca/${track.artwork_hash}.jpg`;
        } 
        // Next try hashed_artwork_url if available
        else if (track.hashed_artwork_url && 
                !track.hashed_artwork_url.includes('/NWR_text_logo_angle.png')) {
            artworkUrl = track.hashed_artwork_url;
        }
        // Finally fall back to regular artwork_url
        else if (track.artwork_url && 
                !track.artwork_url.includes('/NWR_text_logo_angle.png')) {
            artworkUrl = track.artwork_url;
        }
        
        try {
            switch (method) {
                case 'copy':
                    await this.copyToClipboard(shareText, buttonElement);
                    return true;
                    
                case 'native':
                    if (this.hasNativeShare) {
                        // Try to share with image if available and supported
                        if (artworkUrl && this.canShareFiles()) {
                            try {
                                // Try to fetch the image as a blob
                                const imageBlob = await this.fetchImageAsBlob(artworkUrl);
                                if (imageBlob) {
                                    // Create a File object from the blob
                                    const imageFile = new File([imageBlob], 'artwork.jpg', { type: 'image/jpeg' });
                                    
                                    // Share with image
                                    await navigator.share({
                                        title: shareTitle,
                                        text: shareText,
                                        url: shareUrl,
                                        files: [imageFile]
                                    });
                                    return true;
                                }
                            } catch (err) {
                                console.warn('Error sharing with image, falling back to text-only share', err);
                                // Fall back to text-only share
                            }
                        }
                        
                        // Text-only share (fallback)
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
                    this.openSocialShare('twitter', shareText, shareUrl, artworkUrl);
                    return true;
                    
                case 'facebook':
                    this.openSocialShare('facebook', shareText, shareUrl, artworkUrl);
                    return true;
                    
                case 'instagram':
                    this.openSocialShare('instagram', shareText, shareUrl, artworkUrl);
                    return true;
                    
                case 'bluesky':
                    this.openSocialShare('bluesky', shareText, shareUrl, artworkUrl);
                    return true;
                    
                case 'whatsapp':
                    this.openSocialShare('whatsapp', shareText, shareUrl, artworkUrl);
                    return true;
                    
                case 'telegram':
                    this.openSocialShare('telegram', shareText, shareUrl, artworkUrl);
                    return true;
                    
                case 'email':
                    this.openEmailShare(shareTitle, shareText, artworkUrl);
                    return true;
                    
                case 'sms':
                    this.openSocialShare('sms', shareText, shareUrl, artworkUrl);
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
     * Check if the browser supports sharing files via the Web Share API
     * @returns {boolean} - Whether file sharing is supported
     */
    canShareFiles() {
        return typeof navigator !== 'undefined' && 
               navigator.share !== undefined && 
               navigator.canShare && 
               navigator.canShare({ files: [new File([''], 'test.txt', { type: 'text/plain' })] });
    }
    
    /**
     * Fetch an image as a blob
     * @param {string} url - URL of the image to fetch
     * @returns {Promise<Blob|null>} - The image as a blob, or null if fetch failed
     */
    async fetchImageAsBlob(url) {
        try {
            // Ensure URL is absolute
            const absoluteUrl = this.getAbsoluteArtworkUrl(url);
            
            const response = await fetch(absoluteUrl, { 
                mode: 'cors',
                cache: 'no-cache'
            });
            
            if (!response.ok) {
                throw new Error(`Failed to fetch image: ${response.status} ${response.statusText}`);
            }
            
            return await response.blob();
        } catch (error) {
            console.error('Error fetching image:', error);
            return null;
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
            this.showCopyFeedback('Copied to clipboard!');
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
                    this.showCopyFeedback('Copied to clipboard!');
                    return true;
                } else {
                    this.showCopyFeedback('Copy failed, try again');
                    return false;
                }
            } catch (err) {
                console.error('Fallback clipboard copy failed:', err);
                this.showCopyFeedback('Copy failed, try again');
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
     * @param {string|null} artworkUrl - Optional URL to the track artwork
     */
    openSocialShare(platform, text, url, artworkUrl = null) {
        let shareUrl;
        const encodedText = encodeURIComponent(text);
        const encodedUrl = encodeURIComponent(url);
        
        // For platforms that support artwork, store it temporarily if available
        if (artworkUrl && typeof sessionStorage !== 'undefined') {
            try {
                sessionStorage.setItem('nwrLastSharedArtwork', artworkUrl);
            } catch (e) {
                console.warn('Could not store artwork in session storage:', e);
            }
        }
        
        switch (platform) {
            case 'twitter':
                // Twitter doesn't support direct image sharing via URL parameters
                shareUrl = `https://twitter.com/intent/tweet?text=${encodedText}`;
                break;
                
            case 'facebook':
                // For Facebook, if we had a server-side Open Graph implementation,
                // we could include artwork that way, but for now we can only share the URL
                shareUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`;
                break;
                
            case 'instagram':
                // Instagram story sharing works best with native share on mobile
                if (/Android|iPhone|iPad|iPod/i.test(navigator.userAgent)) {
                    if (this.hasNativeShare) {
                        // If we have an artwork URL and the device supports file sharing
                        if (artworkUrl && this.canShareFiles()) {
                            // We'll handle this with the native share API and fetch the image
                            this.shareWithImageNatively(text.split('\n')[0], text, url, artworkUrl);
                            return;
                        } else {
                            // Fall back to regular native share
                            navigator.share({
                                title: text.split('\n')[0],
                                text: text,
                                url: url
                            }).catch(err => console.error('Error sharing to Instagram:', err));
                            return;
                        }
                    } else {
                        alert("Instagram sharing works best with your device's native share feature, which isn't available in this browser.");
                        return;
                    }
                } else {
                    alert("Instagram sharing is only available on mobile devices.");
                    return;
                }
                break;
                
            case 'bluesky':
                // Bluesky currently only supports text sharing
                shareUrl = `https://bsky.app/intent/compose?text=${encodedText}`;
                break;
                
            case 'whatsapp':
                // WhatsApp doesn't support direct image sharing via URL
                shareUrl = `https://wa.me/?text=${encodedText}`;
                break;
                
            case 'telegram':
                // Telegram allows attaching images, but requires a Telegram bot API
                // For now, we'll just share the text and URL
                shareUrl = `https://t.me/share/url?url=${encodedUrl}&text=${encodedText}`;
                break;
                
            case 'sms':
                // SMS doesn't support images via URL schemes
                if (/iPhone|iPad|iPod/i.test(navigator.userAgent)) {
                    // iOS uses different format
                    shareUrl = `sms:&body=${encodedText}`;
                } else {
                    // Android and others
                    shareUrl = `sms:?body=${encodedText}`;
                }
                break;
                
            default:
                console.error('Unknown social platform:', platform);
                return;
        }
        
        window.open(shareUrl, '_blank', 'width=600,height=400');
    }
    
    /**
     * Share content with image using the Native Share API
     * @param {string} title - The title of the content
     * @param {string} text - The text to share
     * @param {string} url - The URL to share
     * @param {string} imageUrl - The URL of the image to share
     */
    async shareWithImageNatively(title, text, url, imageUrl) {
        try {
            // Fetch the image as a blob
            const imageBlob = await this.fetchImageAsBlob(imageUrl);
            if (!imageBlob) {
                // Fall back to text-only sharing
                navigator.share({
                    title,
                    text,
                    url
                });
                return;
            }
            
            // Create a File object
            const imageFile = new File([imageBlob], 'artwork.jpg', { type: 'image/jpeg' });
            
            // Check if we can share files
            if (navigator.canShare && navigator.canShare({ files: [imageFile] })) {
                await navigator.share({
                    title,
                    text,
                    url,
                    files: [imageFile]
                });
            } else {
                // Fall back to text-only sharing
                navigator.share({
                    title,
                    text,
                    url
                });
            }
        } catch (error) {
            console.error('Error sharing with image:', error);
            // Fall back to text-only sharing
            try {
                navigator.share({
                    title,
                    text,
                    url
                });
            } catch (e) {
                console.error('Error with fallback share:', e);
            }
        }
    }
    
    /**
     * Get absolute URL for artwork
     * @param {string} artworkUrl - The potentially relative artwork URL
     * @returns {string} - The absolute URL
     */
    getAbsoluteArtworkUrl(artworkUrl) {
        if (!artworkUrl) return null;
        
        // Already absolute
        if (artworkUrl.startsWith('http')) {
            return artworkUrl;
        }
        
        // Root-relative URL
        if (artworkUrl.startsWith('/')) {
            const baseUrl = this.options.stationUrl;
            const cleanBaseUrl = baseUrl.replace(/\/+$/, '');
            const cleanArtworkPath = artworkUrl.replace(/^\/+/, '');
            return `${cleanBaseUrl}/${cleanArtworkPath}`;
        }
        
        // Regular relative URL
        return `${this.options.stationUrl}/${artworkUrl}`;
    }
    
    /**
     * Open email sharing
     * @param {string} subject - The email subject
     * @param {string} body - The email body
     * @param {string|null} artworkUrl - Optional URL to the track artwork
     */
    openEmailShare(subject, body, artworkUrl = null) {
        // For email, we can't directly attach images via mailto links
        // But we can include an image URL in the body if available
        let emailBody = body;
        
        if (artworkUrl) {
            // Get absolute URL for artwork
            const fullArtworkUrl = this.getAbsoluteArtworkUrl(artworkUrl);
            
            // Include a note about the artwork with the full URL
            emailBody += `\n\nYou can view the album artwork here: ${fullArtworkUrl}`;
        }
        
        const mailtoUrl = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(emailBody)}`;
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
     * Show a centered copy feedback notification
     * @param {string} message - The message to display
     */
    showCopyFeedback(message) {
        // Close any existing feedback
        const existingFeedback = document.querySelector('.share-feedback');
        if (existingFeedback) {
            document.body.removeChild(existingFeedback);
        }
        
        // Create feedback element
        const feedback = document.createElement('div');
        feedback.className = 'share-feedback';
        
        // Add checkmark icon
        feedback.innerHTML = `
            <svg class="share-feedback-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                <polyline points="22 4 12 14.01 9 11.01"></polyline>
            </svg>
            ${message}
        `;
        
        // Add to document
        document.body.appendChild(feedback);
        
        // Make sure the overlay doesn't interfere with this popup
        feedback.style.zIndex = '2000';
        
        // Animate in
        setTimeout(() => {
            feedback.classList.add('visible');
        }, 10);
        
        // Remove after delay
        setTimeout(() => {
            feedback.classList.remove('visible');
            setTimeout(() => {
                if (document.body.contains(feedback)) {
                    document.body.removeChild(feedback);
                }
            }, 300);
        }, 2000);
    }
    
    /**
     * Create and show the share overlay with sharing options
     * @param {Object} track - The track to share
     * @param {HTMLElement} buttonElement - The button that was clicked
     */
    showSharePopup(track, buttonElement) {
        // Check if a share overlay already exists and remove it
        const existingOverlay = document.querySelector('.share-overlay');
        if (existingOverlay) {
            document.body.removeChild(existingOverlay);
        }
        
        // Log track details for debugging
        console.log('Sharing track with data:', {
            id: track.id,
            title: track.title,
            artist: track.artist,
            artwork_url: track.artwork_url,
            artwork_hash: track.artwork_hash,
            hashed_artwork_url: track.hashed_artwork_url
        });
        
        // Create overlay container
        const overlay = document.createElement('div');
        overlay.className = 'share-overlay';
        
        // Create overlay content
        overlay.innerHTML = `
            <div class="share-container">
                <div class="share-header">
                    <button class="close-button">
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <line x1="18" y1="6" x2="6" y2="18"></line>
                            <line x1="6" y1="6" x2="18" y2="18"></line>
                        </svg>
                    </button>
                    <h2>Share Track</h2>
                </div>
                <div class="share-content">
                    <div class="share-track-info">
                        <p class="share-track-title">${track.title}</p>
                        <p class="share-track-artist">${track.artist}</p>
                    </div>
                    <div class="share-options">
                        <button class="share-option" data-share-method="bluesky">
                            <svg  xmlns="http://www.w3.org/2000/svg"  width="24"  height="24"  viewBox="0 0 24 24"  fill="none"  stroke="currentColor"  stroke-width="2"  stroke-linecap="round"  stroke-linejoin="round"  class="icon icon-tabler icons-tabler-outline icon-tabler-brand-bluesky"><path stroke="none" d="M0 0h24v24H0z" fill="none"/><path d="M6.335 5.144c-1.654 -1.199 -4.335 -2.127 -4.335 .826c0 .59 .35 4.953 .556 5.661c.713 2.463 3.13 2.75 5.444 2.369c-4.045 .665 -4.889 3.208 -2.667 5.41c1.03 1.018 1.913 1.59 2.667 1.59c2 0 3.134 -2.769 3.5 -3.5c.333 -.667 .5 -1.167 .5 -1.5c0 .333 .167 .833 .5 1.5c.366 .731 1.5 3.5 3.5 3.5c.754 0 1.637 -.571 2.667 -1.59c2.222 -2.203 1.378 -4.746 -2.667 -5.41c2.314 .38 4.73 .094 5.444 -2.369c.206 -.708 .556 -5.072 .556 -5.661c0 -2.953 -2.68 -2.025 -4.335 -.826c-2.293 1.662 -4.76 5.048 -5.665 6.856c-.905 -1.808 -3.372 -5.194 -5.665 -6.856z" /></svg>
                            <span>Bluesky</span>
                        </button>
                        <button class="share-option" data-share-method="instagram">
                            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24">
                                <path fill="currentColor" d="M12 2c2.717 0 3.056.01 4.122.06 1.065.05 1.79.217 2.428.465.66.254 1.216.598 1.772 1.153a4.908 4.908 0 0 1 1.153 1.772c.247.637.415 1.363.465 2.428.047 1.066.06 1.405.06 4.122 0 2.717-.01 3.056-.06 4.122-.05 1.065-.218 1.79-.465 2.428a4.883 4.883 0 0 1-1.153 1.772 4.915 4.915 0 0 1-1.772 1.153c-.637.247-1.363.415-2.428.465-1.066.047-1.405.06-4.122.06-2.717 0-3.056-.01-4.122-.06-1.065-.05-1.79-.218-2.428-.465a4.89 4.89 0 0 1-1.772-1.153 4.904 4.904 0 0 1-1.153-1.772c-.248-.637-.415-1.363-.465-2.428C2.013 15.056 2 14.717 2 12c0-2.717.01-3.056.06-4.122.05-1.066.217-1.79.465-2.428a4.88 4.88 0 0 1 1.153-1.772A4.897 4.897 0 0 1 5.45 2.525c.638-.248 1.362-.415 2.428-.465C8.944 2.013 9.283 2 12 2zm0 1.802c-2.67 0-2.986.01-4.04.059-.976.045-1.505.207-1.858.344-.466.182-.8.398-1.15.748-.35.35-.566.684-.748 1.15-.137.353-.3.882-.344 1.857-.048 1.055-.058 1.37-.058 4.04 0 2.668.01 2.985.058 4.04.044.975.207 1.504.344 1.856.182.466.399.8.748 1.15.35.35.684.566 1.15.748.353.137.882.3 1.857.344 1.054.048 1.37.058 4.04.058 2.67 0 2.986-.01 4.04-.058.976-.045 1.504-.207 1.858-.344.466-.182.8-.398 1.15-.748.35-.35.566-.684.748-1.15.137-.352.3-.882.344-1.857.048-1.054.058-1.37.058-4.04 0-2.668-.01-2.985-.058-4.04-.044-.975-.207-1.504-.344-1.856a3.1 3.1 0 0 0-.748-1.15 3.09 3.09 0 0 0-1.15-.748c-.353-.137-.882-.3-1.857-.344-1.054-.048-1.37-.058-4.04-.058zm0 3.063a5.135 5.135 0 1 1 0 10.27 5.135 5.135 0 0 1 0-10.27zm0 1.802a3.333 3.333 0 1 0 0 6.666 3.333 3.333 0 0 0 0-6.666zm6.538-3.11a1.2 1.2 0 1 1-2.4 0 1.2 1.2 0 0 1 2.4 0z"/>
                            </svg>
                            <span>Instagram</span>
                        </button>
                        <button class="share-option" data-share-method="facebook">
                            <svg  xmlns="http://www.w3.org/2000/svg"  width="24"  height="24"  viewBox="0 0 24 24"  fill="none"  stroke="currentColor"  stroke-width="2"  stroke-linecap="round"  stroke-linejoin="round"  class="icon icon-tabler icons-tabler-outline icon-tabler-brand-facebook"><path stroke="none" d="M0 0h24v24H0z" fill="none"/><path d="M7 10v4h3v7h4v-7h3l1 -4h-4v-2a1 1 0 0 1 1 -1h3v-4h-3a5 5 0 0 0 -5 5v2h-3" /></svg>
                            <span>Facebook</span>
                        </button>
                        <button class="share-option" data-share-method="twitter">
                            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24">
                                <path fill="currentColor" d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"></path>
                            </svg>
                            <span>Twitter/X</span>
                        </button>
                        <button class="share-option" data-share-method="whatsapp">
                            <svg  xmlns="http://www.w3.org/2000/svg"  width="24"  height="24"  viewBox="0 0 24 24"  fill="none"  stroke="currentColor"  stroke-width="2"  stroke-linecap="round"  stroke-linejoin="round"  class="icon icon-tabler icons-tabler-outline icon-tabler-brand-whatsapp"><path stroke="none" d="M0 0h24v24H0z" fill="none"/><path d="M3 21l1.65 -3.8a9 9 0 1 1 3.4 2.9l-5.05 .9" /><path d="M9 10a.5 .5 0 0 0 1 0v-1a.5 .5 0 0 0 -1 0v1a5 5 0 0 0 5 5h1a.5 .5 0 0 0 0 -1h-1a.5 .5 0 0 0 0 1" /></svg>
                            <span>WhatsApp</span>
                        </button>
                        <button class="share-option" data-share-method="telegram">
                            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                <path d="M21 5L2 12.5l7 2M21 5L18.5 20l-5-7.5M21 5L9 14l-3.5-1.5"/>
                                <path d="M13.5 12.5L9 19l-2-4.5"/>
                            </svg>
                            <span>Telegram</span>
                        </button>
                        <button class="share-option" data-share-method="email">
                            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path>
                                <polyline points="22,6 12,13 2,6"></polyline>
                            </svg>
                            <span>Email</span>
                        </button>
                        <button class="share-option" data-share-method="sms">
                            <svg  xmlns="http://www.w3.org/2000/svg"  width="24"  height="24"  viewBox="0 0 24 24"  fill="none"  stroke="currentColor"  stroke-width="2"  stroke-linecap="round"  stroke-linejoin="round"  class="icon icon-tabler icons-tabler-outline icon-tabler-messages"><path stroke="none" d="M0 0h24v24H0z" fill="none"/><path d="M21 14l-3 -3h-7a1 1 0 0 1 -1 -1v-6a1 1 0 0 1 1 -1h9a1 1 0 0 1 1 1v10" /><path d="M14 15v2a1 1 0 0 1 -1 1h-7l-3 3v-10a1 1 0 0 1 1 -1h2" /></svg>
                            <span>Text Message</span>
                        </button>
                        <button class="share-option" data-share-method="copy">
                            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                            </svg>
                            <span>Copy Link</span>
                        </button>
                    </div>
                </div>
            </div>
        `;
        
        // Add to document
        document.body.appendChild(overlay);
        
        // Add mobile native share if available
        if (this.hasNativeShare) {
            const nativeShareButton = document.createElement('button');
            nativeShareButton.className = 'share-option';
            nativeShareButton.dataset.shareMethod = 'native';
            nativeShareButton.innerHTML = `
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"></path>
                    <polyline points="16 6 12 2 8 6"></polyline>
                    <line x1="12" y1="2" x2="12" y2="15"></line>
                </svg>
                <span>Share...</span>
            `;
            
            // Insert as first option
            const shareOptions = overlay.querySelector('.share-options');
            shareOptions.insertBefore(nativeShareButton, shareOptions.firstChild);
            
            nativeShareButton.addEventListener('click', async () => {
                await this.shareTrack(track, 'native', nativeShareButton);
                this.closeShareOverlay(overlay);
            });
        }
        
        // Slide up animation - must happen after adding to DOM
        setTimeout(() => {
            overlay.classList.add('active');
        }, 10);
        
        // Add click handlers for share options
        overlay.querySelectorAll('.share-option').forEach(button => {
            button.addEventListener('click', async (e) => {
                const method = e.currentTarget.dataset.shareMethod;
                
                if (method !== 'native') {
                    await this.shareTrack(track, method, button);
                }
                
                // Close overlay
                this.closeShareOverlay(overlay);
            });
        });
        
        // Add close button handler
        overlay.querySelector('.close-button').addEventListener('click', () => {
            this.closeShareOverlay(overlay);
        });
    }
    
    /**
     * Close the share overlay with animation
     * @param {HTMLElement} overlay - The overlay element to close
     */
    closeShareOverlay(overlay) {
        if (!overlay || !document.body.contains(overlay)) return;
        
        overlay.classList.remove('active');
        
        // Remove after animation completes
        setTimeout(() => {
            if (document.body.contains(overlay)) {
                document.body.removeChild(overlay);
            }
        }, 400); // Match the CSS transition duration
    }
}

// Export as global or module depending on environment
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ShareManager;
} else {
    window.ShareManager = ShareManager;
}
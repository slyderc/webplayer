/**
 * ArtworkZoomManager - Handles zooming in/out of album artwork
 */
class ArtworkZoomManager {
    constructor() {
        this.overlay = document.getElementById('artworkZoomOverlay');
        this.zoomedImage = document.getElementById('zoomedArtwork');
        this.closeButton = document.getElementById('closeArtworkZoom');
        this.zoomContent = this.overlay ? this.overlay.querySelector('.artwork-zoom-content') : null;
        
        this.currentArtwork = null;
        this.isAnimating = false;
        
        this.setupEventListeners();
    }
    
    setupEventListeners() {
        // Close button
        if (this.closeButton) {
            this.closeButton.addEventListener('click', () => this.hideOverlay());
        }
        
        // Close on overlay background click
        if (this.overlay) {
            this.overlay.addEventListener('click', (e) => {
                if (e.target === this.overlay) {
                    this.hideOverlay();
                }
            });
        }
        
        // Close on ESC key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.overlay && this.overlay.classList.contains('active')) {
                this.hideOverlay();
            }
        });
        
        // Handle animation end events
        if (this.zoomContent) {
            this.zoomContent.addEventListener('animationend', (e) => {
                // Reset animation classes when animations complete
                if (e.animationName === 'zoom-out') {
                    this.completeHideOverlay();
                } else if (e.animationName === 'zoom-in') {
                    this.zoomContent.classList.remove('zooming-in');
                }
                this.isAnimating = false;
            });
        }
    }
    
    showOverlay(imageElement) {
        if (!this.overlay || !this.zoomedImage || !imageElement || this.isAnimating) return;
        
        this.isAnimating = true;
        
        // Save reference to the clicked artwork
        this.currentArtwork = imageElement;
        
        // Get best source image URL and set on zoomed image
        // Try to get the highest quality image - first try fallback which is typically cached artwork
        let srcUrl = imageElement.dataset.fallback || imageElement.src;
        
        // But if we're showing the default image, use the original source which might be better
        if (srcUrl.includes('NWR_text_logo_angle.png')) {
            srcUrl = imageElement.src;
        }
        
        // Preload the image before showing
        const img = new Image();
        img.onload = () => {
            // Set image src only after it's loaded
            this.zoomedImage.src = srcUrl;
            this.zoomedImage.alt = imageElement.alt || 'Album artwork';
            
            // Show overlay
            this.overlay.classList.add('active');
            if (this.zoomContent) {
                this.zoomContent.classList.add('zooming-in');
            }
        };
        img.onerror = () => {
            // In case of error, try the original src
            this.zoomedImage.src = imageElement.src;
            this.zoomedImage.alt = imageElement.alt || 'Album artwork';
            
            // Show overlay
            this.overlay.classList.add('active');
            if (this.zoomContent) {
                this.zoomContent.classList.add('zooming-in');
            }
        };
        img.src = srcUrl;
    }
    
    hideOverlay() {
        if (!this.overlay || this.isAnimating) return;
        
        this.isAnimating = true;
        
        // Add zoom out animation
        if (this.zoomContent) {
            this.zoomContent.classList.add('zooming-out');
        } else {
            // If no zoom content element, just complete the hide
            this.completeHideOverlay();
        }
    }
    
    completeHideOverlay() {
        // Hide overlay completely
        this.overlay.classList.remove('active');
        
        // Clean up animation classes
        if (this.zoomContent) {
            this.zoomContent.classList.remove('zooming-out');
        }
        
        // Clear the image source after the transition
        setTimeout(() => {
            // This helps prevent any visible "flash" of the image
            this.zoomedImage.src = '';
        }, 50);
    }
    
    // Method to add click handlers to artwork in a container
    addArtworkClickHandlers(container) {
        if (!container) return;
        
        const artworkImages = container.querySelectorAll('.track-artwork');
        artworkImages.forEach(artwork => {
            // Check if we've already added a click handler
            if (!artwork.dataset.zoomEnabled) {
                artwork.dataset.zoomEnabled = 'true';
                artwork.addEventListener('click', (e) => {
                    e.stopPropagation(); // Prevent triggering parent element clicks
                    this.showOverlay(e.target);
                });
            }
        });
    }
}

// Export as global or module depending on environment
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ArtworkZoomManager;
} else {
    window.ArtworkZoomManager = ArtworkZoomManager;
}
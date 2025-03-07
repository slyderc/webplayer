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
    }
    
    showOverlay(imageElement) {
        if (!this.overlay || !this.zoomedImage || !imageElement) return;
        
        // Save reference to the clicked artwork
        this.currentArtwork = imageElement;
        
        // Get best source image URL and set on zoomed image
        // Try to get the highest quality image - first try fallback which is typically cached artwork
        let srcUrl = imageElement.dataset.fallback || imageElement.src;
        
        // But if we're showing the default image, use the original source which might be better
        if (srcUrl.includes('NWR_text_logo_angle.png')) {
            srcUrl = imageElement.src;
        }
        
        this.zoomedImage.src = srcUrl;
        this.zoomedImage.alt = imageElement.alt || 'Album artwork';
        
        // Show overlay
        this.overlay.classList.add('active');
        if (this.zoomContent) {
            this.zoomContent.classList.add('zooming-in');
            
            // Remove animation class after animation completes
            setTimeout(() => {
                this.zoomContent.classList.remove('zooming-in');
            }, 300);
        }
    }
    
    hideOverlay() {
        if (!this.overlay) return;
        
        // Add zoom out animation
        if (this.zoomContent) {
            this.zoomContent.classList.add('zooming-out');
        }
        
        // Hide overlay after animation completes
        setTimeout(() => {
            this.overlay.classList.remove('active');
            if (this.zoomContent) {
                this.zoomContent.classList.remove('zooming-out');
            }
        }, 300);
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
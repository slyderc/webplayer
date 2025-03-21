/**
 * MixcloudManager - Handles Mixcloud API integration for archived shows
 */
class MixcloudManager {
    constructor(options = {}) {
        this.options = {
            mixcloudUsername: 'nowwaveradio', // Default Mixcloud username
            apiUrl: 'https://api.mixcloud.com',
            limit: 100, // Number of shows to fetch
            defaultArtwork: window.NWR_CONFIG?.defaultArtwork || '/player/NWR_text_logo_angle.png',
            ...options
        };
        
        this.shows = [];
        this.containerElement = null;
        this.isLoading = false;
        this.error = null;
    }
    
    /**
     * Fetch archived shows from Mixcloud API
     * @returns {Promise<Array>} Array of shows
     */
    async fetchArchivedShows() {
        try {
            this.isLoading = true;
            this.error = null;
            
            const url = `${this.options.apiUrl}/${this.options.mixcloudUsername}/cloudcasts/?limit=${this.options.limit}`;
            const response = await fetch(url);
            
            if (!response.ok) {
                throw new Error(`Mixcloud API request failed: ${response.status}`);
            }
            
            const data = await response.json();
            this.shows = data.data || [];
            this.isLoading = false;
            return this.shows;
        } catch (error) {
            console.error('Error fetching Mixcloud shows:', error);
            this.error = error.message;
            this.isLoading = false;
            return [];
        }
    }
    
    /**
     * Format the date and time for display
     * @param {string} timestamp - ISO timestamp
     * @returns {string} Formatted date string
     */
    formatReleaseDate(timestamp) {
        if (!timestamp) return 'Unknown date';
        
        const date = new Date(timestamp);
        
        // Format: "Jan 1, 2025 | 15:30"
        return date.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric'
        }) + ' | ' + date.toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit',
            hour12: false
        });
    }
    
    /**
     * Generate HTML for the archived shows view
     * @returns {string} HTML string
     */
    generateArchiveShowsHTML() {
        if (this.isLoading) {
            return `
                <div class="loading-container">
                    <div class="loading-spinner"></div>
                    <p>Loading archived shows...</p>
                </div>
            `;
        }
        
        if (this.error) {
            return `
                <div class="error-container">
                    <p>Error loading shows: ${this.error}</p>
                    <button id="retryMixcloudFetch" class="retry-button">Retry</button>
                </div>
            `;
        }
        
        if (!this.shows || this.shows.length === 0) {
            return `
                <div class="empty-state">
                    <div class="empty-state-icon">🎧</div>
                    <h3>No Archived Shows</h3>
                    <p>No shows are currently available in the archive.</p>
                </div>
            `;
        }
        
        return `
            <div id="archiveShowsContainer" class="scrollable-container">
                ${this.shows.map(show => `
                    <div class="archive-item" data-key="${show.key}">
                        <div class="archive-artwork-container">
                            <img class="archive-artwork" 
                                src="${show.pictures?.large || this.options.defaultArtwork}" 
                                alt="${show.name} artwork"
                                onerror="this.src='${this.options.defaultArtwork}'">
                            <div class="play-overlay">
                                <svg class="play-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <polygon points="5 3 19 12 5 21 5 3" fill="white" stroke="white"></polygon>
                                </svg>
                            </div>
                        </div>
                        <div class="archive-info">
                            <p class="archive-title" title="${show.name}">${show.name}</p>
                        </div>
                        <div class="archive-time">
                            <span class="time-display">${this.formatReleaseDate(show.created_time)}</span>
                        </div>
                    </div>
                `).join('')}
            </div>
        `;
    }
    
    /**
     * Initialize event listeners for the archived shows view
     * @param {HTMLElement} container - Container element
     * @param {Function} playCallback - Callback for when a show is played
     */
    initializeEventListeners(container, playCallback) {
        this.containerElement = container;
        
        // Add click listeners to show items
        const archiveItems = container.querySelectorAll('.archive-item');
        archiveItems.forEach(item => {
            item.addEventListener('click', () => {
                const key = item.dataset.key;
                if (key && playCallback) {
                    playCallback(key);
                }
            });
        });
        
        // Add retry button listener if there was an error
        const retryButton = container.querySelector('#retryMixcloudFetch');
        if (retryButton) {
            retryButton.addEventListener('click', async (e) => {
                e.preventDefault();
                await this.fetchArchivedShows();
                container.innerHTML = this.generateArchiveShowsHTML();
                this.initializeEventListeners(container, playCallback);
            });
        }
    }
    
    /**
     * Create Mixcloud embedded player for the selected show
     * @param {string} key - Mixcloud show key
     * @returns {string} HTML for the embedded player
     */
    generateEmbeddedPlayerHTML(key) {
        if (!key) return '';
        
        return `
            <div class="mixcloud-embed-container">
                <iframe width="100%" height="120" src="https://www.mixcloud.com/widget/iframe/?hide_cover=0&feed=${encodeURIComponent(key)}" frameborder="0"></iframe>
                <button id="returnToLiveButton" class="return-to-live-button">Return to Live Music</button>
            </div>
        `;
    }
}

// Export as global or module depending on environment
if (typeof module !== 'undefined' && module.exports) {
    module.exports = MixcloudManager;
} else {
    window.MixcloudManager = MixcloudManager;
}
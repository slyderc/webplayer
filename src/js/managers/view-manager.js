/**
 * ViewManager - Handles tab switching and view updates
 */
class ViewManager {
    constructor(options = {}) {
        this.options = {
            defaultArtwork: '/player/NWR_text_logo_angle.png',
            ...options
        };
        
        this.currentTab = 'live';
        this.tabs = document.getElementById('tabs');
        this.views = {
            live: document.getElementById('liveView'),
            recent: document.getElementById('recentView'),
            schedule: document.getElementById('scheduleView'),
            catchup: document.getElementById('catchupView'),
            favorites: document.getElementById('favoritesView')
        };
        
        this.tabCallbacks = {
            recent: null,
            schedule: null,
            catchup: null,
            favorites: null,
            live: null
        };
        
        this.attachTabListeners();
    }
    
    attachTabListeners() {
        this.tabs.addEventListener('click', (e) => {
            if (e.target.matches('.tab-button')) {
                this.switchTab(e.target.dataset.tab);
            }
        });
    }
    
    registerTabCallback(tabName, callback) {
        if (this.tabCallbacks.hasOwnProperty(tabName)) {
            this.tabCallbacks[tabName] = callback;
        }
        return this;
    }
    
    switchTab(tabName) {
        if (!this.views[tabName]) return false;
        
        // Update active state of tab buttons
        this.tabs.querySelectorAll('.tab-button').forEach(button => {
            button.dataset.active = button.dataset.tab === tabName;
        });
        
        // Hide all views
        Object.values(this.views).forEach(view => {
            view.dataset.active = 'false';
        });
        
        // Show selected view
        this.currentTab = tabName;
        this.views[tabName].dataset.active = 'true';

        // Set active tab attribute on body element for CSS targeting
        document.body.setAttribute('data-active-tab', tabName);
        
        // Call tab-specific callback if registered
        if (this.tabCallbacks[tabName]) {
            this.tabCallbacks[tabName]();
        }
        
        return true;
    }
    
    getCurrentTab() {
        return this.currentTab;
    }
    
    // Helper methods for updating different views
    updateRecentTracksView(tracks, lovedCallback) {
        if (!tracks || !tracks.length) {
            this.views.recent.innerHTML = '<div id="recentTracksContainer"><p>No recent tracks to display</p></div>';
            return;
        }
        
        // Create container if it doesn't exist
        if (!this.views.recent.querySelector('#recentTracksContainer')) {
            this.views.recent.innerHTML = '<div id="recentTracksContainer"></div>';
        }
        
        const container = this.views.recent.querySelector('#recentTracksContainer');
        
        const tracksHTML = tracks.map(track => {
            // Get artwork URLs with fallback support
            const artworkUrls = this.options.trackManager.getArtworkUrl(track);
            
            return `
                <div class="track-item">
                    <img class="track-artwork" 
                         src="${artworkUrls.primaryUrl}" 
                         data-fallback="${artworkUrls.fallbackUrl}"
                         alt="${track.title} artwork"
                            onerror="if(this.dataset.retry === '0') { 
                                    this.dataset.retry = '1'; 
                                    this.src = this.dataset.fallback; 
                                    } 
                                    else { 
                                    this.dataset.retry = '2'; 
                                    this.src = '/player/NWR_text_logo_angle.png';
                                    this.onerror = null; 
                                    }">
                    <div class="track-info">
                        <p class="track-title">${track.title}</p>
                        <p class="track-artist">${track.artist}</p>
                    </div>
                    <div class="track-actions">
                        <button class="heart-button" 
                                data-track-id="${track.id}"
                                data-loved="${this.isTrackLoved(track.id)}">
                            <svg class="heart-icon" viewBox="0 0 24 24">
                                <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
                            </svg>
                        </button>
                        <span class="time-ago">${this.formatTimeElapsed(track.played_at)}</span>
                    </div>
                </div>
            `;
        }).join('');
    
        container.innerHTML = tracksHTML;
        
        // Add click handlers for the heart buttons
        if (lovedCallback) {
            container.querySelectorAll('.heart-button').forEach(button => {
                button.addEventListener('click', (e) => {
                    const trackId = e.currentTarget.dataset.trackId;
                    lovedCallback(trackId);
                });
            });
        }
    }
        
    updateScheduleView(data) {
        this.views.schedule.innerHTML = data ? data : '<p>Show schedule will appear here</p>';
    }

    updateCatchupView(data) {
        this.views.catchup.innerHTML = data ? data : '<p>Past shows available on Mixcloud</p>';
    }

    updateFavoritesView(tracks, lovedCallback) {
        // Get the favorites view element
        const favoritesView = this.views.favorites;
        
        if (!tracks || !tracks.length) {
            favoritesView.innerHTML = `
                <div class="empty-state">
                    <div class="empty-state-icon">❤️</div>
                    <h3>No Favorites Yet</h3>
                    <p>Click the heart icon next to a track while it's playing to add it to your favorites.</p>
                </div>
            `;
            return;
        }
        
        // Create container if it doesn't exist
        if (!favoritesView.querySelector('#favoritesTracksContainer')) {
            favoritesView.innerHTML = '<div id="favoritesTracksContainer"></div>';
        }
            
        const container = favoritesView.querySelector('#favoritesTracksContainer');
        
        // Generate HTML for favorites similar to recent tracks
        const tracksHTML = tracks.map(track => {
            // Get artwork URLs with fallback support
            const artworkUrls = this.options.trackManager.getArtworkUrl(track);
            
            return `
                <div class="track-item">
                    <img class="track-artwork" 
                         src="${artworkUrls.primaryUrl}" 
                         data-fallback="${artworkUrls.fallbackUrl}"
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
                        ${track.played_at ? 
                            `<span class="time-ago">${this.formatTimeElapsed(track.played_at)}</span>` : 
                            '<span class="time-ago">Favorited</span>'}
                    </div>
                </div>
            `;
        }).join('');

        container.innerHTML = tracksHTML;
            
        // Add click handlers for the heart buttons
        if (lovedCallback) {
            container.querySelectorAll('.heart-button').forEach(button => {
                button.addEventListener('click', (e) => {
                    const trackId = e.currentTarget.dataset.trackId;
                    
                    // Call the callback
                    const isLoved = lovedCallback(trackId);
                    
                    // Update the visual state of the button
                    e.currentTarget.dataset.loved = isLoved;
                    
                    // If unloved, consider removing it from the list or updating the UI
                    if (!isLoved) {
                        // Option 1: Remove the item from the DOM immediately
                        const trackItem = e.currentTarget.closest('.track-item');
                        if (trackItem) {
                            // Add a fade-out effect
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
                });
            });
        }
    }
        
    // Helper methods
    isTrackLoved(trackId) {
        if (this.options.trackManager) {
            return this.options.trackManager.isLoved(trackId);
        }
        return false;
    }
    
    formatTimeElapsed(date) {
        if (this.options.trackManager) {
            return this.options.trackManager.formatTimeElapsed(date);
        }
        
        // Fallback implementation
        const seconds = Math.floor((new Date() - new Date(date)) / 1000);
        if (seconds < 60) return 'just now';
        if (seconds < 3600) return `${Math.floor(seconds / 60)} minutes ago`;
        return `${Math.floor(seconds / 3600)} hours ago`;
    }
}

// Export as global or module depending on environment
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ViewManager;
} else {
    window.ViewManager = ViewManager;
}
/**
 * Base embed functionality for Now Wave Radio embeds
 * This serves as the foundation for both live and recent track embeds
 */
(function() {
    'use strict';
    
    // Create namespace for embed functionality
    window.NWR = window.NWR || {};
    window.NWR.embed = window.NWR.embed || {};
    
    // Store references to services
    let metadataService = null;
    let storageService = null;
    
    // Configuration
    const config = window.NWR_CONFIG || {};
    const embedConfig = window.NWR_EMBED || {};
    
    // Defaults
    const defaults = {
        apiEndpoint: '/api/nowplaying',
        defaultArtwork: '/player/NWR_text_logo_angle.png',
        storagePrefix: 'nwr_embed_',
        updateInterval: {
            live: 15000,   // 15 seconds for live mode
            recent: 30000  // 30 seconds for recent tracks mode
        },
        mode: 'live',
        limit: 5,
        theme: 'auto',
        compact: false,
        maxErrorRetries: 3
    };
    
    // Merge defaults with provided config
    const settings = {
        ...defaults,
        ...config,
        ...embedConfig
    };
    
    /**
     * Initialize services needed for embeds
     * @returns {Object} Object containing initialized services
     */
    function initializeServices() {
        // Initialize StorageService
        if (typeof StorageService !== 'undefined') {
            storageService = new StorageService({
                prefix: settings.storagePrefix
            });
        } else {
            console.warn('StorageService not available, using fallback');
            // Fallback implementation
            storageService = {
                getItem: (key, defaultValue = null) => {
                    console.log(`Fallback getItem: ${key}`);
                    return defaultValue;
                },
                setItem: () => false,
                removeItem: () => false,
                get: (key, defaultValue = null) => defaultValue,
                set: () => false
            };
        }
        
        // Initialize MetadataService
        if (typeof MetadataService !== 'undefined') {
            metadataService = new MetadataService({
                endpoint: settings.apiEndpoint,
                defaultArtwork: settings.defaultArtwork
            });
        } else {
            console.warn('MetadataService not available, using fallback');
            // Fallback implementation
            metadataService = {
                getCurrentTrack: async () => null,
                getRecentTracks: async () => []
            };
        }
        
        return {
            metadataService,
            storageService
        };
    }
    
    /**
     * Format time elapsed since a given date
     * @param {string|Date} date - The date to compare against
     * @returns {string} - Formatted time string (e.g., "5 minutes ago")
     */
    function formatTimeElapsed(date) {
        if (!date) return '';
        
        const seconds = Math.floor((new Date() - new Date(date)) / 1000);
        
        if (seconds < 60) return 'just now';
        if (seconds < 3600) return `${Math.floor(seconds / 60)} minutes ago`;
        if (seconds < 86400) return `${Math.floor(seconds / 3600)} hours ago`;
        return `${Math.floor(seconds / 86400)} days ago`;
    }
    
    /**
     * Find DOM element by ID with fallbacks
     * @param {string} id - The ID to look for
     * @param {string} className - Fallback class name to look for
     * @param {string} tagName - Fallback tag name to look for
     * @returns {HTMLElement|null} The found element or null
     */
    function findElement(id, className, tagName) {
        // Try by ID first
        let element = document.getElementById(id);
        
        // Try by class name next
        if (!element && className) {
            element = document.querySelector(`.${className}`);
        }
        
        // Last resort, try by tag name
        if (!element && tagName) {
            element = document.querySelector(tagName);
        }
        
        return element;
    }
    
    /**
     * Get unique embed ID or generate one if needed
     * @returns {string} Unique embed ID
     */
    function getEmbedId() {
        if (settings.id) return settings.id;
        
        // Generate a unique ID if one isn't provided
        const randomId = Math.random().toString(36).substring(2, 10);
        settings.id = `nwr_embed_${randomId}`;
        return settings.id;
    }
    
    /**
     * Apply theme based on settings and system preference
     */
    function applyTheme() {
        if (settings.theme === 'auto') {
            const darkModeMediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
            document.documentElement.dataset.theme = darkModeMediaQuery.matches ? 'dark' : 'light';
            
            // Listen for changes in the color scheme
            darkModeMediaQuery.addEventListener('change', (e) => {
                document.documentElement.dataset.theme = e.matches ? 'dark' : 'light';
            });
        } else {
            document.documentElement.dataset.theme = settings.theme;
        }
    }
    
    /**
     * Set up event listeners for track changes
     * @param {Function} updateCallback - Function to call when track changes
     */
    function setupEventListeners(updateCallback) {
        if (!updateCallback) return;
        
        // Listen for metadata updates if in same domain
        window.addEventListener('message', function(event) {
            // Accept messages from any origin for embeds
            if (event.data && (event.data.type === 'nwr_track_update' || event.data.type === 'track_change')) {
                console.log('Received track update notification');
                updateCallback();
            }
        });
        
        // Also listen for storage events which might indicate a track change
        window.addEventListener('storage', function(event) {
            // If the main player updates current track in localStorage, we should refresh
            if (event.key && (event.key.includes('track') || event.key.includes('current'))) {
                console.log('Storage event detected, refreshing');
                updateCallback();
            }
        });
    }
    
    /**
     * Set up visibility change detection to conserve resources
     * @param {Object} timers - Object containing timer references
     * @param {Function} updateCallback - Function to call for updates
     * @param {number} interval - Update interval in milliseconds
     */
    function setupVisibilityDetection(timers, updateCallback, interval) {
        if (typeof document.hidden !== 'undefined') {
            document.addEventListener('visibilitychange', () => {
                if (document.hidden) {
                    // Page is hidden, clear timer to save resources
                    if (timers.updateTimer) {
                        clearInterval(timers.updateTimer);
                        timers.updateTimer = null;
                    }
                } else {
                    // Page is visible again, restart updates
                    if (!timers.updateTimer) {
                        updateCallback();
                        timers.updateTimer = setInterval(updateCallback, interval);
                    }
                }
            });
        }
    }
    
    // Create the embed object
    const embedObj = {
        services: null,
        settings: settings,
        utils: {
            formatTimeElapsed,
            findElement,
            getEmbedId,
            applyTheme
        },
        isInitialized: false,
        init: function() {
            // Only initialize once
            if (this.isInitialized) return this;
            
            console.log('Initializing NWR Embed base module');
            
            // Initialize services
            console.log('Initializing services...');
            this.services = initializeServices();
            console.log('Services initialized:', this.services);
            
            // Apply theme
            applyTheme();
            
            this.isInitialized = true;
            
            // Broadcast that initialization is complete
            try {
                const event = new CustomEvent('nwr:embed:ready', { detail: { embedId: settings.id } });
                document.dispatchEvent(event);
                console.log('Embed ready event dispatched');
            } catch (e) {
                console.warn('Could not dispatch embed ready event', e);
            }
            
            return this;
        },
        setupEvents: setupEventListeners,
        setupVisibility: setupVisibilityDetection
    };
    
    // Export shared functionality
    window.NWR.embed = embedObj;
    
    // Ensure initialization happens immediately
    console.log('Starting NWR Embed initialization');
    embedObj.init();
    
    // Also initialize on DOM load to be safe
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            console.log('DOMContentLoaded: ensuring embed is initialized');
            embedObj.init();
        });
    }
})();
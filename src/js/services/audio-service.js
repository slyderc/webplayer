/**
 * AudioService - Handles all audio streaming functionality for Now Wave Radio
 * This implementation completely recreates the audio object on each play/stop toggle
 * to prevent caching issues and ensure reliable streaming
 */
class AudioService {
    constructor(options = {}) {
        this.options = {
            streamUrl: 'https://streaming.live365.com/a78360_2',
            format: ['aac'],
            volume: 1.0,
            networkErrorCheckInterval: 10000, // 10 seconds
            debugMode: false, // Set to true to enable debug logging
            ...options
        };
        
        this.isPlaying = false;
        this.listeners = {
            onPlay: [],
            onPause: [],
            onStop: [],
            onError: []
        };
        
        // Don't initialize audio until play is requested
        this.audio = null;
        this.networkErrorCheckTimer = null;
        this.lastPlaybackPosition = 0;
        this.stuckPlaybackCounter = 0;
    }
    
    /**
     * Debug logging function that only logs when debugMode is enabled
     * @param {string} message - Message to log
     * @param {*} data - Optional data to log
     */
    debug(message, data) {
        if (this.options.debugMode) {
            if (data !== undefined) {
                console.log(`[AudioService] ${message}`, data);
            } else {
                console.log(`[AudioService] ${message}`);
            }
        }
    }
    
    createAudio() {
        // Generate a unique stream URL each time to force a completely fresh connection
        // But we'll be more gentle with our cache-busting
        const uniqueStreamUrl = this.options.streamUrl + '?nocache=' + Date.now();
        this.debug('Creating fresh audio stream with URL:', uniqueStreamUrl);
        
        return new Howl({
            src: [uniqueStreamUrl],
            html5: true, // Force HTML5 Audio for streaming
            format: this.options.format,
            autoplay: false,
            volume: this.options.volume,
            // Set reasonable defaults for streaming audio
            buffer: true, // Allow buffering for better playback
            xhrWithCredentials: false, // Disable credentials which can cause caching
            preload: true, // Allow preloading to ensure faster start
            onload: () => {
                this.debug('Stream loaded successfully');
            },
            onplay: () => {
                this.debug('Stream playback started');
                this.notifyListeners('onPlay');
                this.startNetworkErrorDetection();
            },
            onpause: () => this.notifyListeners('onPause'),
            onstop: () => {
                this.stopNetworkErrorDetection();
                this.notifyListeners('onStop');
            },
            onend: () => this.handleStreamEnd(),
            onloaderror: (id, error) => this.handleError(id, error, 'load'),
            onplayerror: (id, error) => this.handleError(id, error, 'play')
        });
    }
    
    /**
     * Get a unique stream URL with aggressive cache busting
     */
    getUniqueStreamUrl() {
        // Extract the base URL without any existing parameters
        const baseUrl = this.options.streamUrl.split('?')[0];
        
        // Generate random values to make each URL completely unique
        const timestamp = Date.now();
        const random = Math.floor(Math.random() * 1000000);
        
        // Use a different parameter name each time to defeat smart caches
        const paramName = 'nocache_' + random;
        
        // Create a unique URL with multiple cache-busting techniques
        return `${baseUrl}?${paramName}=${timestamp}&rand=${random}&fresh=true`;
    }
    
    /**
     * Attempts to clean up any HTML audio elements that might be caching data
     */
    cleanupGlobalAudioElements() {
        try {
            // Base URL without parameters to find all related audio elements
            const baseUrl = this.options.streamUrl.split('?')[0];
            
            // First, find audio elements with our streaming URL
            let audioElements = document.querySelectorAll(`audio[src*="${baseUrl}"]`);
            
            // If we didn't find any, try to find all audio elements since Howler might be using a different URL format
            if (audioElements.length === 0) {
                audioElements = document.querySelectorAll('audio');
                this.debug(`No specific stream audio elements found, cleaning all ${audioElements.length} audio elements`);
            } else {
                this.debug(`Found ${audioElements.length} audio elements with our stream URL`);
            }
            
            // Process all found audio elements
            audioElements.forEach(audioEl => {
                try {
                    this.debug('Cleaning up audio element:', audioEl.currentSrc || audioEl.src);
                    
                    // First try to reset all potential buffered content
                    if (audioEl.buffered && audioEl.buffered.length > 0) {
                        this.debug(`Element has ${audioEl.buffered.length} buffered ranges`);
                    }
                    
                    // Stop any active playback
                    audioEl.pause();
                    
                    // Set current time to 0 to force buffer reset
                    try { audioEl.currentTime = 0; } catch(e) { /* Ignore */ }
                    
                    // Set empty sources to clear buffer
                    audioEl.src = '';
                    
                    // Remove any source children elements
                    while (audioEl.firstChild) {
                        audioEl.removeChild(audioEl.firstChild);
                    }
                    
                    // Remove all attributes that might hold state
                    Array.from(audioEl.attributes).forEach(attr => {
                        if (attr.name !== 'id' && attr.name !== 'class') {
                            audioEl.removeAttribute(attr.name);
                        }
                    });
                    
                    // Force reload to clear buffer
                    audioEl.load();
                    
                    // Set a dummy source and load again to ensure complete reset
                    audioEl.src = 'data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQAAAAA=';
                    audioEl.load();
                    
                    // Remove from DOM to ensure complete cleanup
                    if (audioEl.parentNode) {
                        audioEl.parentNode.removeChild(audioEl);
                    }
                } catch (e) {
                    console.warn('[AudioService] Error cleaning up audio element:', e);
                }
            });
            
            // Try to clear MediaSource objects that might be caching data
            if (window.MediaSource) {
                Object.keys(window).forEach(key => {
                    try {
                        const obj = window[key];
                        if (obj && typeof obj === 'object' && obj.constructor && 
                            obj.constructor.name === 'MediaSource') {
                            this.debug('Found a MediaSource object, attempting to clean up');
                            if (typeof obj.endOfStream === 'function') {
                                obj.endOfStream();
                            }
                        }
                    } catch (e) {
                        // Ignore errors in cleanup
                    }
                });
            }
        } catch (e) {
            console.warn('[AudioService] Error in cleanupGlobalAudioElements:', e);
        }
    }
    
    play() {
        if (this.isPlaying) {
            return true; // Already playing
        }
        
        this.debug('Preparing to play stream...');
        
        // Clean up any previous audio instance
        if (this.audio) {
            this.debug('Stopping and unloading previous audio instance');
            try {
                this.audio.stop();
                this.audio.unload();
            } catch(e) {
                console.warn('[AudioService] Error cleaning up previous audio:', e);
            }
            this.audio = null;
        }
        
        // Create a fresh audio object with cache-busting URL
        this.audio = this.createAudio();
        
        // Reset playback start time for the error detection grace period
        this.playbackStartTime = Date.now();
        
        // Attempt to play the audio
        try {
            this.debug('Starting playback...');
            this.audio.play();
            this.isPlaying = true;
            this.debug('Stream started with new audio object');
            
            // Add a verification check to make sure playback actually started
            setTimeout(() => {
                if (this.audio && this.isPlaying && !this.audio.playing()) {
                    console.warn('[AudioService] Playback verification failed, retrying play command');
                    this.audio.play();
                }
            }, 1000);
        } catch (e) {
            console.error('[AudioService] Error starting audio playback:', e);
            this.handleError(0, e, 'play');
            return false;
        }
        
        return this.isPlaying;
    }
    
    /**
     * Attempt to clear any Web Audio API cached data
     */
    clearWebAudioCache() {
        try {
            // Access Howler's internal _audioNode property to clear caches
            if (this.audio && this.audio._audioNode) {
                this.audio._audioNode.forEach(node => {
                    if (node.bufferSource) {
                        node.bufferSource.disconnect();
                    }
                });
            }
            
            // Force a garbage collection hint
            if (window.gc) {
                window.gc();
            }
        } catch (e) {
            console.warn('Error clearing Web Audio cache:', e);
        }
    }
    
    /**
     * Force complete cleanup of audio resources
     */
    forceCleanup() {
        // Stop network error detection
        this.stopNetworkErrorDetection();
        
        // Stop and destroy the audio object
        if (this.audio) {
            try {
                // First stop playback
                this.audio.stop();
                
                // Then unload completely
                this.audio.unload();
                
                // Don't try to access internal properties as this can cause errors
            } catch (e) {
                console.error('Error during audio cleanup:', e);
            }
            
            // Set to null to help garbage collection
            this.audio = null;
        }
        
        // Reset state variables
        this.stuckPlaybackCounter = 0;
        this.lastPlaybackPosition = 0;
        this.playbackStartTime = null;
    }
    
    stop() {
        if (!this.isPlaying) {
            return false; // Already stopped
        }
        
        this.debug('Stopping stream and destroying audio object...');
        
        // Stop network error detection
        this.stopNetworkErrorDetection();
        
        // Clean up audio resources
        if (this.audio) {
            try {
                this.audio.stop();
                this.audio.unload();
            } catch (e) {
                console.error('Error during audio cleanup:', e);
            }
            this.audio = null;
        }
        
        // Reset state
        this.isPlaying = false;
        this.stuckPlaybackCounter = 0;
        this.playbackStartTime = null;
        
        this.debug('Stream completely stopped');
        
        return this.isPlaying;
    }
    
    // Toggle playback state - convenience method for play/stop
    toggle() {
        return this.isPlaying ? this.stop() : this.play();
    }
    
    setVolume(volume) {
        if (volume >= 0 && volume <= 1) {
            this.options.volume = volume;
            
            // If we have an active audio object, update its volume
            if (this.audio) {
                this.audio.volume(volume);
            }
        }
        return this.options.volume;
    }
    
    getVolume() {
        return this.options.volume;
    }
    
    addEventListener(event, callback) {
        if (this.listeners[event]) {
            this.listeners[event].push(callback);
        }
        return this;
    }
    
    removeEventListener(event, callback) {
        if (this.listeners[event]) {
            this.listeners[event] = this.listeners[event].filter(cb => cb !== callback);
        }
        return this;
    }
    
    notifyListeners(event, ...args) {
        if (this.listeners[event]) {
            this.listeners[event].forEach(callback => callback(...args));
        }
    }
    
    handleError(id, error, errorType) {
        console.error(`[AudioService] ${errorType} error:`, error);
        this.isPlaying = false;
        this.stopNetworkErrorDetection();
        this.notifyListeners('onError', error, errorType);
        
        // Don't auto-recover - just clean up
        if (this.audio) {
            try {
                this.audio.unload();
            } catch (e) {
                console.error('[AudioService] Error unloading after error:', e);
            }
            this.audio = null;
        }
    }
    
    /**
     * Starts network error detection timer that periodically checks if the stream is still active
     */
    startNetworkErrorDetection() {
        this.stopNetworkErrorDetection(); // Clear any existing timers
        
        // Give the audio stream time to initialize before starting error detection
        setTimeout(() => {
            if (!this.audio || !this.isPlaying) {
                return; // Don't start detection if playback has already stopped
            }
            
            // Initialize with current position
            this.lastPlaybackPosition = this.audio ? this.audio.seek() || 0 : 0;
            this.stuckPlaybackCounter = 0;
            
            // Start the periodic check
            this.networkErrorCheckTimer = setInterval(() => {
                if (!this.audio || !this.isPlaying) {
                    this.stopNetworkErrorDetection();
                    return;
                }
                
                // Get current playback position
                const currentPosition = this.audio ? this.audio.seek() || 0 : 0;
                
                // On initial playback the position might be 0 for a while, so be more lenient
                const isInitialBuffering = this.lastPlaybackPosition === 0 && currentPosition === 0;
                
                // Check if the stream is stuck (not advancing)
                if (!isInitialBuffering && Math.abs(currentPosition - this.lastPlaybackPosition) < 0.001) {
                    this.stuckPlaybackCounter++;
                    this.debug(`Stream may be stalled. Counter: ${this.stuckPlaybackCounter}`);
                    
                    // If playback has been stuck for 3 check intervals (30 seconds by default), consider it a network error
                    if (this.stuckPlaybackCounter >= 3) {
                        console.error('[AudioService] Stream appears to be stuck. Treating as network error.');
                        this.handleStreamEnd();
                        return;
                    }
                } else {
                    // Reset counter if playback is advancing
                    this.stuckPlaybackCounter = 0;
                }
                
                // Check if the stream has ended naturally - but only after some time has passed
                if (this.stuckPlaybackCounter > 0 && this.audio && !this.audio.playing()) {
                    this.debug('Stream not playing according to Howler API');
                    this.handleStreamEnd();
                    return;
                }
                
                // Update last position for next check
                this.lastPlaybackPosition = currentPosition;
            }, this.options.networkErrorCheckInterval);
        }, 3000); // Wait 3 seconds before starting network error detection
    }
    
    /**
     * Stops the network error detection timer
     */
    stopNetworkErrorDetection() {
        if (this.networkErrorCheckTimer) {
            clearInterval(this.networkErrorCheckTimer);
            this.networkErrorCheckTimer = null;
        }
    }
    
    /**
     * Handles stream end event, which could be due to network error or stream completion
     */
    handleStreamEnd() {
        // Keep track of when playback started to avoid false positives during initial buffering
        if (!this.playbackStartTime) {
            this.playbackStartTime = Date.now();
        }
        
        // Calculate how long the stream has been playing
        const playbackDuration = Date.now() - this.playbackStartTime;
        
        // If we're still within the initial grace period, ignore premature end events
        if (playbackDuration < 5000) { // 5 second grace period
            this.debug('Ignoring potential false stream end during initialization');
            return;
        }
        
        console.warn('[AudioService] Stream ended unexpectedly');
        if (this.isPlaying) {
            this.isPlaying = false;
            this.stopNetworkErrorDetection();
            
            // Clean up the audio object
            if (this.audio) {
                try {
                    this.audio.unload();
                } catch (e) {
                    console.error('[AudioService] Error unloading after stream end:', e);
                }
                this.audio = null;
            }
            
            // Reset playback start time
            this.playbackStartTime = null;
            
            // Notify about the network error
            this.notifyListeners('onError', new Error('Stream ended unexpectedly'), 'network');
        }
    }
}

// Export as global or module depending on environment
if (typeof module !== 'undefined' && module.exports) {
    module.exports = AudioService;
} else {
    window.AudioService = AudioService;
}
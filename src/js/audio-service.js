/**
 * AudioService - Handles all audio streaming functionality for Now Wave Radio
 * This alternative implementation completely recreates the audio object on each play/stop toggle
 */
class AudioService {
    constructor(options = {}) {
        this.options = {
            streamUrl: 'https://streaming.live365.com/a78360_2',
            format: ['aac'],
            volume: 1.0,
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
    }
    
    createAudio() {
        return new Howl({
            src: [this.options.streamUrl],
            html5: true, // Force HTML5 Audio for streaming
            format: this.options.format,
            autoplay: false,
            volume: this.options.volume,
            onplay: () => this.notifyListeners('onPlay'),
            onpause: () => this.notifyListeners('onPause'),
            onstop: () => this.notifyListeners('onStop'),
            onloaderror: (id, error) => this.handleError(id, error, 'load'),
            onplayerror: (id, error) => this.handleError(id, error, 'play')
        });
    }
    
    play() {
        if (this.isPlaying) {
            return true; // Already playing
        }
        
        // Completely destroy and recreate the audio object
        if (this.audio) {
            this.audio.unload();
            this.audio = null;
        }
        
        // Create a fresh audio object
        this.audio = this.createAudio();
        
        // Play the audio
        this.audio.play();
        this.isPlaying = true;
        
        return this.isPlaying;
    }
    
    stop() {
        if (!this.isPlaying) {
            return false; // Already stopped
        }
        
        // Stop and destroy the audio object
        if (this.audio) {
            try {
                this.audio.stop();
                this.audio.unload();
            } catch (e) {
                console.error('Error during audio cleanup:', e);
            }
            
            this.audio = null;
        }
        
        this.isPlaying = false;
        
        return this.isPlaying;
    }
    
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
        console.error(`Audio ${errorType} error:`, error);
        this.isPlaying = false;
        this.notifyListeners('onError', error, errorType);
        
        // Don't auto-recover - just clean up
        if (this.audio) {
            try {
                this.audio.unload();
            } catch (e) {
                console.error('Error unloading after error:', e);
            }
            this.audio = null;
        }
    }
}

// Export as global or module depending on environment
if (typeof module !== 'undefined' && module.exports) {
    module.exports = AudioService;
} else {
    window.AudioService = AudioService;
}
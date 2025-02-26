/**
 * AudioService - Handles all audio streaming functionality for Now Wave Radio
 */
class AudioService {
    constructor(options = {}) {
        this.options = {
            streamUrl: 'https://streaming.live365.com/a78360_2',
            format: ['aac'],
            volume: 1.0
        };
        
        this.isPlaying = false;
        this.listeners = {
            onPlay: [],
            onPause: [],
            onStop: [],
            onError: []
        };
        
        this.initAudio();
    }
    
    initAudio() {
        // If we already have an audio instance, unload it first
        if (this.audio) {
            this.audio.unload();
        }
        
        this.audio = new Howl({
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
        if (!this.isPlaying) {
            // If we were previously stopped (not just paused), we need to re-init
            if (!this.audio) {
                this.initAudio();
            }
            this.audio.play();
            this.isPlaying = true;
        }
        return this.isPlaying;
    }
    
    stop() {
        if (this.isPlaying) {
            // First stop the current playback
            this.audio.stop();
            
            // Then completely unload the audio to clear buffers
            this.audio.unload();
            
            // Re-initialize to prepare for next play
            this.initAudio();
            
            this.isPlaying = false;
        }
        return this.isPlaying;
    }

    pause() {
        if (this.isPlaying) {
            this.audio.pause();
            this.isPlaying = false;
        }
        return this.isPlaying;
    }
    
    toggle() {
        return this.isPlaying ? this.stop() : this.play();
    }
    
    setVolume(volume) {
        if (volume >= 0 && volume <= 1) {
            this.audio.volume(volume);
            this.options.volume = volume;
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
        
        // Auto-recovery for streaming errors
        setTimeout(() => {
            if (!this.isPlaying) {
                console.log('Reconnecting audio...');
                this.initAudio(); // Reinitialize audio object
            }
        }, 5000); // Try to recover after 5 seconds
    }
}

// Export as global or module depending on environment
if (typeof module !== 'undefined' && module.exports) {
    module.exports = AudioService;
} else {
    window.AudioService = AudioService;
}

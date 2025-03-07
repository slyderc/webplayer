/**
 * Application entry point - initializes the player when the DOM is ready
 */
document.addEventListener('DOMContentLoaded', () => {
    // Make sure required dependencies are loaded
    const requiredDependencies = [
        'AudioService', 'MetadataService', 'StorageService', 
        'BackgroundManager', 'TrackManager', 'LikeManager', 'ViewManager', 'UIManager'
    ];
        
    const missingDependencies = requiredDependencies.filter(
        dep => typeof window[dep] === 'undefined'
    );
    
    if (missingDependencies.length > 0) {
        console.error('Missing dependencies:', missingDependencies.join(', '));
        return;
    }
    
    // Initialize the player
    window.player = new NowWavePlayer();
    console.log('Now Wave Radio player initialized');
});


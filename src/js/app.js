/**
 * Application entry point - initializes the player when the DOM is ready
 */
document.addEventListener('DOMContentLoaded', () => {
    // Make sure required dependencies are loaded
    const requiredDependencies = [
        'AudioService', 'MetadataService', 'StorageService', 'GDPRManager',
        'BackgroundManager', 'TrackManager', 'LikeManager', 'ShareManager', 'ViewManager', 'UIManager'
    ];
        
    const missingDependencies = requiredDependencies.filter(
        dep => typeof window[dep] === 'undefined'
    );
    
    if (missingDependencies.length > 0) {
        console.error('Missing dependencies:', missingDependencies.join(', '));
        return;
    }
    
    // Initialize storage service first
    const storageService = new StorageService();
    
    // Initialize GDPR manager to handle consent
    window.gdprManager = new GDPRManager({
        storageService: storageService
    });
    
    // Initialize the player (GDPR consent will be checked on first metadata request)
    window.player = new NowWavePlayer({
        gdprManager: window.gdprManager
    });
    
    // Check for GDPR consent
    window.gdprManager.checkConsent();
    
    console.log('Now Wave Radio player initialized');
});


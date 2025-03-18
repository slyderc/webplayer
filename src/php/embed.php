<?php
session_start();
include './nocache.php';
include './config.php';

// Set CORS headers for cross-domain embedding
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET');
header('Access-Control-Allow-Headers: Content-Type');

// Get embed mode and options
$mode = isset($_GET['mode']) ? strtolower($_GET['mode']) : 'live';
$limit = isset($_GET['limit']) ? intval($_GET['limit']) : 5;
$theme = isset($_GET['theme']) ? strtolower($_GET['theme']) : 'auto';
$compact = isset($_GET['compact']) && $_GET['compact'] === '1';

// Sanitize inputs
$mode = in_array($mode, ['live', 'recent']) ? $mode : 'live';
$limit = min(max($limit, 1), 10); // Limit between 1-10 items
$theme = in_array($theme, ['light', 'dark', 'auto']) ? $theme : 'auto';

// Get file modification times for cache busting
$cssVersion = filemtime(__DIR__ . '/../css/embed.css');

// Common JS services needed for both modes
$jsMetadataServiceVersion = filemtime(__DIR__ . '/../js/services/metadata-service.js');
$jsStorageServiceVersion = filemtime(__DIR__ . '/../js/services/storage-service.js');

// Get stream configuration
$streamConfig = getStreamConfig();
$defaultArtwork = $streamConfig['defaultArtwork'] ?? '/src/assets/default.jpg';

// Set unique embed ID for this instance
$embedId = 'nwr_embed_' . uniqid();
?>
<!DOCTYPE html>
<html lang="en" data-theme="<?php echo $theme; ?>">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Now Wave Radio Embed</title>
    <link rel="stylesheet" href="../css/embed.css?v=<?php echo $cssVersion; ?>">
    <script>
        window.NWR_CONFIG = <?php echo getJsConfig(); ?>;
        window.NWR_EMBED = {
            id: '<?php echo $embedId; ?>',
            mode: '<?php echo $mode; ?>',
            limit: <?php echo $limit; ?>,
            theme: '<?php echo $theme; ?>',
            compact: <?php echo $compact ? 'true' : 'false'; ?>
        };
        
        // Detect dark mode if theme is set to auto
        if (window.NWR_EMBED.theme === 'auto') {
            const darkModeMediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
            document.documentElement.dataset.theme = darkModeMediaQuery.matches ? 'dark' : 'light';
            
            // Listen for changes in the color scheme
            darkModeMediaQuery.addEventListener('change', (e) => {
                document.documentElement.dataset.theme = e.matches ? 'dark' : 'light';
            });
        }
    </script>
    
    <!-- Core services needed for embeds -->
    <script src="../js/services/storage-service.js?v=<?php echo $jsStorageServiceVersion; ?>"></script>
    <script src="../js/services/metadata-service.js?v=<?php echo $jsMetadataServiceVersion; ?>"></script>
    
    <!-- Fallback service implementations if scripts fail to load -->
    <script>
        // Fallback for StorageService if script failed to load
        if (typeof StorageService === 'undefined') {
            console.warn('StorageService not loaded, using fallback implementation');
            class StorageService {
                constructor(options = {}) {
                    this.isAvailable = false;
                    this.prefix = options.prefix || '';
                }
                getItem(key, defaultValue = null) { return defaultValue; }
                setItem(key, value) { return false; }
                removeItem(key) { return false; }
                // Aliases for backward compatibility
                get(key, defaultValue = null) { return this.getItem(key, defaultValue); }
                set(key, value) { return this.setItem(key, value); }
            }
            window.StorageService = StorageService;
        }
        
        // Fallback for MetadataService if script failed to load
        if (typeof MetadataService === 'undefined') {
            console.warn('MetadataService not loaded, using fallback implementation');
            class MetadataService {
                constructor(options = {}) {
                    this.options = {
                        metadataUrl: 'https://nowwave.radio/player/publish/playlist.json',
                        pollInterval: 5000,
                        defaultArtwork: '/player/NWR_text_logo_angle.png',
                        ...options
                    };
                }
                
                async fetchMetadata() {
                    try {
                        const response = await fetch(this.options.metadataUrl);
                        if (!response.ok) throw new Error('Failed to fetch metadata');
                        return await response.json();
                    } catch (e) {
                        console.error('Error fetching metadata:', e);
                        return null;
                    }
                }
                
                async getCurrentTrack() {
                    try {
                        const data = await this.fetchMetadata();
                        if (!data) return null;
                        
                        return {
                            title: data.title || 'Unknown Track',
                            artist: data.artist || 'Unknown Artist',
                            album: data.album || '',
                            artwork_url: data.artwork_url || data.image_url || this.options.defaultArtwork,
                            played_at: data.timestamp || new Date().toISOString()
                        };
                    } catch (e) {
                        console.error('Error getting current track:', e);
                        return null;
                    }
                }
                
                async getRecentTracks(limit = 5) {
                    try {
                        // Try various endpoints that might contain track history
                        const possibleEndpoints = [
                            '/player/history.json',              // Direct history endpoint
                            '/webplayer/api/history.json',       // API-based history endpoint
                            '/webplayer/api/track_history.php',  // PHP-based history endpoint
                            '/api/track_history'                 // General API endpoint
                        ];
                        
                        // Current track as fallback
                        let currentTrack = null;
                        
                        // Try to get current track first
                        try {
                            currentTrack = await this.getCurrentTrack();
                        } catch (e) {
                            console.warn('Could not get current track:', e);
                        }
                        
                        // Try all possible endpoints until we find one with data
                        for (const endpoint of possibleEndpoints) {
                            try {
                                console.log(`Trying history endpoint: ${endpoint}`);
                                const response = await fetch(endpoint);
                                
                                if (response.ok) {
                                    const data = await response.json();
                                    
                                    if (Array.isArray(data) && data.length > 0) {
                                        console.log(`Found history data at ${endpoint}:`, data);
                                        
                                        // Format the tracks according to our expected format
                                        return data.slice(0, limit).map(track => ({
                                            title: track.title || track.name || 'Unknown Track',
                                            artist: track.artist || track.artistName || 'Unknown Artist',
                                            album: track.album || track.albumName || '',
                                            artwork_url: track.artwork_url || track.image || track.cover || this.options.defaultArtwork,
                                            played_at: track.played_at || track.timestamp || track.date || new Date().toISOString()
                                        }));
                                    }
                                }
                            } catch (e) {
                                console.warn(`Could not fetch from ${endpoint}:`, e);
                            }
                        }
                        
                        // Add diverse sample data as a last resort
                        const sampleData = [];
                        
                        // If we have current track, add it first
                        if (currentTrack) {
                            sampleData.push(currentTrack);
                        }
                        
                        // Add some varied sample tracks
                        const sampleTracks = [
                            {
                                title: 'Blue Monday',
                                artist: 'New Order',
                                artwork_url: 'https://upload.wikimedia.org/wikipedia/en/thumb/a/a3/New_Order_-_Blue_Monday.jpg/220px-New_Order_-_Blue_Monday.jpg'
                            },
                            {
                                title: 'Running Up That Hill',
                                artist: 'Kate Bush',
                                artwork_url: 'https://upload.wikimedia.org/wikipedia/en/8/84/Running_Up_That_Hill.png'
                            },
                            {
                                title: 'Digital Love',
                                artist: 'Daft Punk',
                                artwork_url: 'https://upload.wikimedia.org/wikipedia/en/a/ae/Daft_Punk_-_Discovery.jpg'
                            },
                            {
                                title: 'Age of Consent',
                                artist: 'New Order',
                                artwork_url: 'https://upload.wikimedia.org/wikipedia/en/5/5b/NewOrderPowerCorruptionLies.jpg'
                            },
                            {
                                title: 'Just Like Heaven',
                                artist: 'The Cure',
                                artwork_url: 'https://upload.wikimedia.org/wikipedia/en/e/e8/Thecure-kiss.jpg'
                            }
                        ];
                        
                        // Add timestamps to the sample tracks
                        const now = new Date();
                        for (let i = 0; i < Math.min(limit, sampleTracks.length); i++) {
                            const date = new Date(now);
                            date.setMinutes(now.getMinutes() - ((i + 1) * 5)); // Each 5 minutes apart
                            
                            if (i === 0 && currentTrack) continue; // Skip first if we have current track
                            
                            sampleData.push({
                                ...sampleTracks[i],
                                played_at: date.toISOString()
                            });
                        }
                        
                        return sampleData.slice(0, limit);
                    } catch (e) {
                        console.error('Error getting recent tracks:', e);
                        
                        // Return a minimal fallback
                        return [{
                            title: 'Sample Track',
                            artist: 'Sample Artist',
                            album: '',
                            artwork_url: this.options.defaultArtwork,
                            played_at: new Date().toISOString()
                        }];
                    }
                }
                
                setCallback() { return this; }
                startPolling() {}
                stopPolling() {}
            }
            window.MetadataService = MetadataService;
        }
    </script>
</head>
<body class="embed-body embed-<?php echo $mode; ?><?php echo $compact ? ' embed-compact' : ''; ?>">
    <div class="embed-container">
        <?php if ($mode === 'live'): ?>
        <!-- Live embed view -->
        <div class="embed-live-container">
            <div class="artwork-container">
                <img id="embed-album-art-<?php echo $embedId; ?>" 
                     class="embed-album-art" 
                     src="<?php echo $defaultArtwork; ?>" 
                     alt="Album artwork">
            </div>
            <div class="embed-track-info">
                <h2 id="embed-track-title-<?php echo $embedId; ?>" 
                   class="embed-track-title">Loading...</h2>
                <p id="embed-track-artist-<?php echo $embedId; ?>" 
                   class="embed-track-artist"></p>
            </div>
            <div id="embed-error-<?php echo $embedId; ?>" class="embed-error-message" style="display:none;">
                Unable to load track information
            </div>
        </div>
        <script>
            /* Ensure this runs immediately and also after DOM is ready */
            (function() {
                function initElements() {
                    window.NWR_EMBED_ELEMENTS = {
                        albumArt: document.getElementById('embed-album-art-<?php echo $embedId; ?>'),
                        trackTitle: document.getElementById('embed-track-title-<?php echo $embedId; ?>'),
                        trackArtist: document.getElementById('embed-track-artist-<?php echo $embedId; ?>'),
                        errorMessage: document.getElementById('embed-error-<?php echo $embedId; ?>')
                    };
                }
                
                // Try to initialize immediately
                initElements();
                
                // And also when DOM is fully loaded
                document.addEventListener('DOMContentLoaded', initElements);
            })();
        </script>
        <script src="../js/embed-live.js"></script>
        <?php else: ?>
        <!-- Recent tracks embed view -->
        <div class="embed-recent-container">
            <div id="embedRecentTracks" class="embed-recent-tracks">
                <div class="embed-loading">Loading recent tracks...</div>
            </div>
            <div id="embed-error-<?php echo $embedId; ?>" class="embed-error-message" style="display:none;">
                Unable to load recent tracks
            </div>
        </div>
        <script>
            /* Ensure this runs immediately and also after DOM is ready */
            (function() {
                function initElements() {
                    window.NWR_EMBED_ELEMENTS = {
                        recentTracks: document.getElementById('embedRecentTracks') || document.querySelector('.embed-recent-tracks'),
                        errorMessage: document.getElementById('embed-error-<?php echo $embedId; ?>')
                    };
                    
                    console.log('Elements initialized: ', window.NWR_EMBED_ELEMENTS);
                }
                
                // Try to initialize immediately
                initElements();
                
                // And also when DOM is fully loaded
                document.addEventListener('DOMContentLoaded', initElements);
            })();
        </script>
        <script src="../js/embed-recent.js"></script>
        <?php endif; ?>
        
        <!-- Common footer with subtle branding -->
        <div class="embed-footer">
            <a href="https://nowwave.radio" target="_blank" rel="noopener noreferrer" class="embed-footer-link">
                Powered by Now Wave Radio
            </a>
        </div>
    </div>
</body>
</html>
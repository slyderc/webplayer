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
                constructor() {
                    this.isAvailable = false;
                }
                getItem(key, defaultValue = null) { return defaultValue; }
                setItem(key, value) { return false; }
                removeItem(key) { return false; }
                // Aliases for backward compatibility
                get(key, defaultValue = null) { return defaultValue; }
                set(key, value) { return false; }
            }
            window.StorageService = StorageService;
        }
        
        // Fallback for MetadataService if script failed to load
        if (typeof MetadataService === 'undefined') {
            console.warn('MetadataService not loaded, using fallback implementation');
            class MetadataService {
                constructor(options = {}) {
                    this.options = options;
                }
                getCurrentTrack() { return Promise.resolve(null); }
                getRecentTracks() { return Promise.resolve([]); }
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
            document.addEventListener('DOMContentLoaded', function() {
                // Configure embed with unique IDs
                window.NWR_EMBED_ELEMENTS = {
                    albumArt: document.getElementById('embed-album-art-<?php echo $embedId; ?>'),
                    trackTitle: document.getElementById('embed-track-title-<?php echo $embedId; ?>'),
                    trackArtist: document.getElementById('embed-track-artist-<?php echo $embedId; ?>'),
                    errorMessage: document.getElementById('embed-error-<?php echo $embedId; ?>')
                };
            });
        </script>
        <script src="../js/embed-live.js"></script>
        <?php else: ?>
        <!-- Recent tracks embed view -->
        <div class="embed-recent-container">
            <div id="embed-recent-tracks-<?php echo $embedId; ?>" class="embed-recent-tracks">
                <div class="embed-loading">Loading recent tracks...</div>
            </div>
            <div id="embed-error-<?php echo $embedId; ?>" class="embed-error-message" style="display:none;">
                Unable to load recent tracks
            </div>
        </div>
        <script>
            document.addEventListener('DOMContentLoaded', function() {
                // Configure embed with unique IDs
                window.NWR_EMBED_ELEMENTS = {
                    recentTracks: document.getElementById('embed-recent-tracks-<?php echo $embedId; ?>'),
                    errorMessage: document.getElementById('embed-error-<?php echo $embedId; ?>')
                };
            });
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
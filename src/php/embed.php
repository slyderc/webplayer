<?php
/**
 * Embeddable player for Now Wave Radio
 * Supports both live current track and recent tracks history
 */
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
$baseJsVersion = filemtime(__DIR__ . '/../js/embed.js');
$jsVersion = $mode === 'live' ? 
    filemtime(__DIR__ . '/../js/embed-live.js') : 
    filemtime(__DIR__ . '/../js/embed-recent.js');

// Get service script versions
$jsMetadataServiceVersion = filemtime(__DIR__ . '/../js/services/metadata-service.js');
$jsStorageServiceVersion = filemtime(__DIR__ . '/../js/services/storage-service.js');

// Get stream configuration
$streamConfig = getStreamConfig();
$defaultArtwork = $streamConfig['defaultArtwork'] ?? '/src/assets/default.jpg';

// Set unique embed ID for this instance
$embedId = 'nwr_embed_' . uniqid();

// Generate JSON configuration for the JavaScript
$jsConfig = json_encode([
    'id' => $embedId,
    'mode' => $mode,
    'limit' => $limit,
    'theme' => $theme,
    'compact' => $compact,
    'defaultArtwork' => $defaultArtwork,
    'apiEndpoint' => $streamConfig['metadataUrl'] ?? null
]);
?>
<!DOCTYPE html>
<html lang="en" data-theme="<?php echo $theme; ?>">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Now Wave Radio Embed</title>
    <link rel="stylesheet" href="../css/embed.css?v=<?php echo $cssVersion; ?>">
    
    <!-- Configuration for embeds -->
    <script>
        // Global configuration
        window.NWR_CONFIG = <?php echo getJsConfig(); ?>;
        
        // Embed-specific configuration
        window.NWR_EMBED = <?php echo $jsConfig; ?>;
    </script>
    
    <!-- Core services needed for embeds -->
    <script src="../js/services/storage-service.js?v=<?php echo $jsStorageServiceVersion; ?>"></script>
    <script src="../js/services/metadata-service.js?v=<?php echo $jsMetadataServiceVersion; ?>"></script>
    
    <!-- Base embed functionality -->
    <script src="../js/embed.js?v=<?php echo $baseJsVersion; ?>"></script>
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
            // Configure embed with unique IDs for element selection
            document.addEventListener('DOMContentLoaded', function() {
                window.NWR_EMBED_ELEMENTS = {
                    albumArt: document.getElementById('embed-album-art-<?php echo $embedId; ?>'),
                    trackTitle: document.getElementById('embed-track-title-<?php echo $embedId; ?>'),
                    trackArtist: document.getElementById('embed-track-artist-<?php echo $embedId; ?>'),
                    errorMessage: document.getElementById('embed-error-<?php echo $embedId; ?>')
                };
            });
        </script>
        <script src="../js/embed-live.js?v=<?php echo $jsVersion; ?>"></script>
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
            // Configure embed with unique IDs for element selection
            document.addEventListener('DOMContentLoaded', function() {
                window.NWR_EMBED_ELEMENTS = {
                    recentTracks: document.getElementById('embedRecentTracks'),
                    errorMessage: document.getElementById('embed-error-<?php echo $embedId; ?>')
                };
            });
        </script>
        <script src="../js/embed-recent.js?v=<?php echo $jsVersion; ?>"></script>
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
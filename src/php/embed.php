<?php
session_start();
include './nocache.php';
include './config.php';

// Get embed mode and options
$mode = isset($_GET['mode']) ? strtolower($_GET['mode']) : 'live';
$limit = isset($_GET['limit']) ? intval($_GET['limit']) : 5;

// Sanitize inputs
$mode = in_array($mode, ['live', 'recent']) ? $mode : 'live';
$limit = min(max($limit, 1), 10); // Limit between 1-10 items

// Get file modification times for cache busting
$cssVersion = filemtime(__DIR__ . '/../css/player.css');

// Common JS services needed for both modes
$jsMetadataServiceVersion = filemtime(__DIR__ . '/../js/services/metadata-service.js');
$jsStorageServiceVersion = filemtime(__DIR__ . '/../js/services/storage-service.js');

$streamConfig = getStreamConfig();
$audioLibs = $audioLibraries;
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Now Wave Radio Embed</title>
    <link rel="stylesheet" href="../css/embed.css?v=<?php echo $cssVersion; ?>">
    <script>
        window.NWR_CONFIG = <?php echo getJsConfig(); ?>;
        window.NWR_EMBED = {
            mode: '<?php echo $mode; ?>',
            limit: <?php echo $limit; ?>
        };
    </script>
    
    <!-- Core services needed for embeds -->
    <script src="../js/services/metadata-service.js?v=<?php echo $jsMetadataServiceVersion; ?>"></script>
    <script src="../js/services/storage-service.js?v=<?php echo $jsStorageServiceVersion; ?>"></script>
</head>
<body class="embed-body embed-<?php echo $mode; ?>">
    <?php if ($mode === 'live'): ?>
    <!-- Live embed view -->
    <div class="embed-live-container">
        <div class="artwork-container">
            <img id="embedAlbumArt" src="<?php echo $streamConfig['defaultArtwork']; ?>" alt="Album artwork">
        </div>
        <div class="embed-track-info">
            <h2 id="embedTrackTitle" class="embed-track-title">Loading...</h2>
            <p id="embedTrackArtist" class="embed-track-artist"></p>
        </div>
    </div>
    <script src="../js/embed-live.js"></script>
    <?php else: ?>
    <!-- Recent tracks embed view -->
    <div class="embed-recent-container">
        <div id="embedRecentTracks" class="embed-recent-tracks"></div>
    </div>
    <script src="../js/embed-recent.js"></script>
    <?php endif; ?>
</body>
</html>
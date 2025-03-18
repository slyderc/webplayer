<?php
// Track history API endpoint for Now Wave Radio embeds
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET');
header('Access-Control-Allow-Headers: Content-Type');

// Ensure no caching
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
header('Pragma: no-cache');
header('Expires: 0');

// Include configuration
$configPath = dirname(__DIR__) . '/config.php';
if (file_exists($configPath)) {
    include_once $configPath;
}

// Get the current track data
function getCurrentTrack() {
    global $streamConfig;
    
    // Default values
    $defaultArtwork = isset($streamConfig['defaultArtwork']) ? $streamConfig['defaultArtwork'] : '/player/NWR_text_logo_angle.png';
    
    try {
        // Try to get track data from the metadata source
        $metadataUrl = isset($streamConfig['metadataUrl']) ? $streamConfig['metadataUrl'] : 'https://nowwave.radio/player/publish/playlist.json';
        $metadataContent = @file_get_contents($metadataUrl);
        
        if ($metadataContent) {
            $trackData = json_decode($metadataContent, true);
            
            if ($trackData) {
                return [
                    'title' => isset($trackData['title']) ? $trackData['title'] : 'Unknown Track',
                    'artist' => isset($trackData['artist']) ? $trackData['artist'] : 'Unknown Artist',
                    'album' => isset($trackData['album']) ? $trackData['album'] : '',
                    'artwork_url' => isset($trackData['artwork_url']) ? $trackData['artwork_url'] : 
                                   (isset($trackData['image_url']) ? $trackData['image_url'] : $defaultArtwork),
                    'played_at' => date('c') // Current time in ISO 8601 format
                ];
            }
        }
    } catch (Exception $e) {
        // Handle any errors silently
    }
    
    // Return dummy data if we couldn't get the current track
    return [
        'title' => 'Unknown Track',
        'artist' => 'Unknown Artist',
        'album' => '',
        'artwork_url' => $defaultArtwork,
        'played_at' => date('c')
    ];
}

// A function to get or create track history
function getTrackHistory($limit = 5) {
    // Storage file for recent tracks (using a simple file as a database)
    $storageFile = dirname(__DIR__) . '/data/recent_tracks.json';
    $storageDir = dirname(__DIR__) . '/data';
    
    // Create storage directory if it doesn't exist
    if (!file_exists($storageDir)) {
        mkdir($storageDir, 0755, true);
    }
    
    // Initialize history
    $history = [];
    
    // Try to load existing history
    if (file_exists($storageFile)) {
        $historyContent = @file_get_contents($storageFile);
        if ($historyContent) {
            $history = json_decode($historyContent, true);
            if (!is_array($history)) {
                $history = [];
            }
        }
    }
    
    // Get current track
    $currentTrack = getCurrentTrack();
    
    // Check if the current track is different from the most recent one
    $isDifferent = true;
    if (!empty($history)) {
        $lastTrack = $history[0];
        if ($lastTrack['title'] === $currentTrack['title'] && $lastTrack['artist'] === $currentTrack['artist']) {
            $isDifferent = false;
        }
    }
    
    // If different, add to history
    if ($isDifferent) {
        array_unshift($history, $currentTrack);
        
        // Keep only the most recent tracks
        $history = array_slice($history, 0, 20); // Store up to 20 tracks
        
        // Save the updated history
        @file_put_contents($storageFile, json_encode($history));
    }
    
    // Return the requested number of tracks
    return array_slice($history, 0, $limit);
}

// Get the requested limit or use default
$limit = isset($_GET['limit']) ? intval($_GET['limit']) : 5;
$limit = min(max($limit, 1), 10); // Limit between 1-10

// Get track history
$history = getTrackHistory($limit);

// Output the history as JSON
echo json_encode($history);
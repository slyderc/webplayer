<?php
/**
 * Audio Configuration for Now Wave Radio Player
 */

// Stream configuration
$audioConfig = [
    'streamUrl' => 'https://streaming.live365.com/a78360_2',
    'format' => 'aac',
    'metadataUrl' => 'https://nowwave.radio/player/publish/playlist.json',
    'defaultVolume' => 1.0,
    'pollInterval' => 5000, // Metadata polling interval in milliseconds
    
    // Default display values when stream is stopped
    'defaultArtwork' => '/player/NWR_text_logo_angle.png',
    'defaultTitle' => 'Now Wave Radio',
    'defaultArtist' => 'The Next Wave Today',
    'defaultProgram' => '🛜 NowWave.Radio',
    'defaultPresenter' => '💌 dj@NowWave.Radio'
];

// Audio libraries
$audioLibraries = [
    'howler' => [
        'cdn' => 'https://cdnjs.cloudflare.com/ajax/libs/howler/2.2.4/howler.min.js',
        'local' => '/js/libs/howler.min.js', // If you want to host locally
        'version' => '2.2.4',
    ],
];

// Function to get current environment (development/production)
function getEnvironment() {
    $host = $_SERVER['HTTP_HOST'] ?? '';
    return (strpos($host, 'localhost') !== false || strpos($host, '127.0.0.1') !== false)
        ? 'development'
        : 'production';
}

// Function to get appropriate URLs based on environment
function getStreamConfig() {
    global $audioConfig;
    
    $env = getEnvironment();
    $config = $audioConfig;
    
    // Adjust URLs based on environment
    if ($env === 'development') {
        $config['metadataUrl'] = '/proxy/player/publish/playlist.json';
    }

    return $config;
}

// Function to get JavaScript configuration as JSON
function getJsConfig() {
    $config = getStreamConfig();
    return json_encode($config, JSON_PRETTY_PRINT);
}

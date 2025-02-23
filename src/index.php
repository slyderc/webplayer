<?php 
include './php/nocache.php';

// Get file modification times for cache busting
$cssVersion = filemtime(__DIR__ . '/css/player.css');
$jsVersion = filemtime(__DIR__ . '/js/player.js');
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Now Wave Radio</title>
    <link rel="stylesheet" href="./css/player.css?v=<?php echo $cssVersion; ?>">
    <script src="js/player.js?v=<?php echo $jsVersion; ?>"></script>
<body>
    <div class="player-container">
        <!-- Main content area -->
        <div class="main-content">
            <!-- Views container -->
            <div class="views-container">
                <!-- Live View -->
                <div id="liveView" class="view-content">
                    <div class="logo-container">
                        <img src="/player/logo_head.png" alt="Now Wave Radio" class="header-logo">
                    </div>
                    <div class="artwork">
                        <img id="albumArt" src="/player/NWR_text_logo_angle.png" alt="Album artwork">
                    </div>
                </div>

                <!-- Recent Tracks View -->
                <div id="recentView" class="view-content"></div>

                <!-- Schedule View -->
                <div id="scheduleView" class="view-content"></div>

                <!-- Catch Up View -->
                <div id="catchupView" class="view-content"></div>

                <!-- Favorites View -->
                <div id="favoritesView" class="view-content"></div>
            </div>
        </div>

        <!-- Persistent player bar -->
        <div class="player-bar">
            <div class="player-bar-content">
                <div class="track-info">
                    <div class="now-playing">Now Playing</div>
                    <h2 id="trackTitle" class="track-title">Loading...</h2>
                    <p id="trackArtist" class="track-artist"></p>
                    <div class="show-info">
                        <p id="programTitle" class="program-title"></p>
                        <p id="presenterName" class="presenter-name"></p>
                    </div>
                </div>

                <div class="controls">
                    <button class="love-button" id="loveButton" data-loved="false">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78L12 21.23l8.84-8.84a5.5 5.5 0 0 0 0-7.78z"/>
                        </svg>
                    </button>
                    <button class="play-button" id="playButton">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                            <polygon points="5 3 19 12 5 21 5 3"/>
                        </svg>
                    </button>
                </div>
            </div>


            <!-- Navigation Tabs -->
            <div class="tabs" id="tabs">
                <button class="tab-button" data-tab="live" data-active="true">Live</button>
                <button class="tab-button" data-tab="schedule">Schedule</button>
                <button class="tab-button" data-tab="catchup">Catch Up</button>
                <button class="tab-button" data-tab="recent">Recent</button>
                <button class="tab-button" data-tab="favorites">Favorites</button>
            </div>
        </div>
    </div>
</body>
</html>
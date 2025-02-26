<?php 
include './php/nocache.php';
include './php/config.php';

// Get file modification times for cache busting
$cssVersion = filemtime(__DIR__ . '/css/player.css');
$jsServiceVersion = filemtime(__DIR__ . '/js/audio-service.js');
$jsPlayerVersion = filemtime(__DIR__ . '/js/player.js'); // Corrected variable name
$streamConfig = getStreamConfig();
$audioLibs = $audioLibraries;
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Now Wave Radio</title>
    <link rel="stylesheet" href="./css/player.css?v=<?php echo $cssVersion; ?>">
    <script>
        window.NWR_CONFIG = <?php echo getJsConfig(); ?>;
    </script>
    <script src="<?php echo $audioLibs['howler']['cdn']; ?>"></script>
    <script src="./js/audio-service.js?v=<?php echo $jsServiceVersion; ?>"></script>
    <script src="./js/player.js?v=<?php echo $jsPlayerVersion; ?>"></script>
    </head>
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
                        <img id="albumArt" src="<?php echo $streamConfig['defaultArtwork']; ?>" alt="Album artwork">
                    </div>
                </div>

                <div id="recentView" class="view-content"></div>
                <div id="scheduleView" class="view-content"></div>
                <div id="catchupView" class="view-content"></div>
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

            <button class="tab-button" data-tab="live" data-active="true">
                <div class="tab-icon">
                <svg aria-hidden="true" role="presentation" focusable="false" width="1em" height="1em" viewBox="0 0 24 24">
                    <!-- Antenna/Radio icon for Live -->
                    <path d="M8 8a1 1 0 000 2h1a1 1 0 000-2H8z" fill="currentColor"></path>
                    <path fill-rule="evenodd" clip-rule="evenodd" d="M4 5a3 3 0 00-3 3v8a3 3 0 003 3h16a3 3 0 003-3V8a3 3 0 00-3-3H4zm16 2h-8v7h8V7zm-10 0H4v7h6V7zm-6 9v-1h16v1H4z" fill="currentColor"></path>
                    <path d="M16.5 2.5a1 1 0 01.707.293l1 1a1 1 0 01-1.414 1.414l-1-1A1 1 0 0116.5 2.5z" fill="currentColor"></path>
                    <path d="M16.5 2.5a1 1 0 000 2 1 1 0 000-2z" fill="currentColor"></path>
                </svg>
                </div>
                <span>Live</span>
            </button>
            
            <button class="tab-button" data-tab="schedule">
                <div class="tab-icon">
                <svg aria-hidden="true" role="presentation" focusable="false" width="1em" height="1em" viewBox="0 0 24 24">
                    <!-- Calendar icon for Schedule -->
                    <path fill-rule="evenodd" clip-rule="evenodd" d="M8 2a1 1 0 011 1v1h6V3a1 1 0 112 0v1h1a3 3 0 013 3v12a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h1V3a1 1 0 011-1zm10 4H6a1 1 0 00-1 1v12a1 1 0 001 1h12a1 1 0 001-1V7a1 1 0 00-1-1zM7 11a1 1 0 011-1h8a1 1 0 110 2H8a1 1 0 01-1-1zm1 3a1 1 0 100 2h5a1 1 0 100-2H8z" fill="currentColor"></path>
                </svg>
                </div>
                <span>Schedule</span>
            </button>
            
            <button class="tab-button" data-tab="catchUp">
                <div class="tab-icon">
                <svg aria-hidden="true" role="presentation" focusable="false" width="1em" height="1em" viewBox="0 0 24 24">
                    <!-- Headphones icon for Catch Up -->
                    <path fill-rule="evenodd" clip-rule="evenodd" d="M12 4a8 8 0 00-8 8v6a2 2 0 002 2h1a2 2 0 002-2v-4a2 2 0 00-2-2H6v-1a6 6 0 1112 0v1h-1a2 2 0 00-2 2v4a2 2 0 002 2h1a2 2 0 002-2v-6a8 8 0 00-8-8z" fill="currentColor"></path>
                </svg>
                </div>
                <span>Catch Up</span>
            </button>
            
            <button class="tab-button" data-tab="recent">
                <div class="tab-icon">
                <svg aria-hidden="true" role="presentation" focusable="false" width="1em" height="1em" viewBox="0 0 24 24">
                    <!-- Recent/History icon using your provided SVG path -->
                    <path d="M20 2H8c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-2 9h-3v3c0 .55-.45 1-1 1s-1-.45-1-1v-3H9c-.55 0-1-.45-1-1s.45-1 1-1h3V7c0-.55.45-1 1-1s1 .45 1 1v3h3c.55 0 1 .45 1 1s-.45 1-1 1z" fill="currentColor"></path>
                    <path d="M4 6H2v14c0 1.1.9 2 2 2h14v-2H4V6z" fill="currentColor"></path>
                </svg>
                </div>
                <span>Recent</span>
            </button>
            
            <button class="tab-button" data-tab="favorites">
                <div class="tab-icon">
                <svg aria-hidden="true" role="presentation" focusable="false" width="1em" height="1em" viewBox="0 0 24 24">
                    <!-- Heart icon for Favorites -->
                    <path fill-rule="evenodd" clip-rule="evenodd" d="M12 4.528a6 6 0 00-8.243 8.715l6.829 6.828a2 2 0 002.828 0l6.829-6.828A6 6 0 0012 4.528zm-1.172 1.644l.465.464a1 1 0 001.414 0l.465-.464a4 4 0 115.656 5.656l-6.829 6.83-6.829-6.83a4 4 0 115.657-5.656z" fill="currentColor"></path>
                </svg>
                </div>
                <span>Favorites</span>
            </button>


            </div>
        </div>
    </div>
</body>
</html>
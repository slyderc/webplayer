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
                    <svg xmlns="http://www.w3.org/2000/svg" class="ionicon" viewBox="0 0 512 512"><title>Play</title><path style="transform: translateX(16px);" d="M133 440a35.37 35.37 0 01-17.5-4.67c-12-6.8-19.46-20-19.46-34.33V111c0-14.37 7.46-27.53 19.46-34.33a35.13 35.13 0 0135.77.45l247.85 148.36a36 36 0 010 61l-247.89 148.4A35.5 35.5 0 01133 440z"></path></svg>
                    </button>
                </div>
            </div>
            <!-- Tabs with icons -->
            <div class="tabs" id="tabs">
            <button class="tab-button" data-tab="live" data-active="true">
                <div class="tab-icon">
                <svg aria-hidden="true" role="presentation" focusable="false" width="1em" height="1em" style="transform: rotate(360deg);" preserveAspectRatio="xMidYMid meet" viewBox="0 0 512 512"><circle cx="256" cy="256" r="64" fill="currentColor"></circle><path d="M144 256c0-36.9 18.553-69.208 46.314-87.034l-23.141-24.512a131.623 131.623 0 0 0-17.684 15.663C125.314 185.729 112 219.781 112 256c0 36.219 13.314 70.271 37.49 95.883a131.615 131.615 0 0 0 17.684 15.662l23.141-24.511C162.553 325.208 144 292.9 144 256z" fill="currentColor"></path><path d="M368 256c0 36.9-18.553 69.208-46.314 87.034l23.141 24.511a131.615 131.615 0 0 0 17.684-15.662C386.686 326.271 400 292.219 400 256c0-36.219-13.314-70.271-37.49-95.882a131.623 131.623 0 0 0-17.684-15.663l-23.141 24.512C349.447 186.792 368 219.1 368 256z" fill="currentColor"></path><path d="M64 256c0-55.578 25.251-104.907 64.263-135.817L105.433 96a197.799 197.799 0 0 0-17.197 16.178c-17.622 18.669-31.462 40.417-41.134 64.641C37.081 201.917 32 228.556 32 256c0 27.443 5.081 54.084 15.102 79.181 9.672 24.226 23.512 45.973 41.134 64.642a198.105 198.105 0 0 0 17.197 16.178l22.829-24.183C89.251 360.907 64 311.578 64 256z" fill="currentColor"></path><path d="M448 256c0 55.578-25.251 104.907-64.262 135.817l22.828 23.848c6-5.001 11.74-10.062 17.198-15.843 17.622-18.669 31.462-40.416 41.134-64.642C474.918 310.084 480 283.443 480 256c0-27.444-5.082-54.083-15.102-79.181-9.672-24.225-23.512-45.972-41.134-64.641A197.523 197.523 0 0 0 406.566 96l-22.829 24.183C422.749 151.093 448 200.422 448 256z" fill="currentColor"></path><rect x="0" y="0" width="512" height="512" fill="rgba(0, 0, 0, 0)"></rect></svg>
                </div>
                <span>Live</span>
            </button>
            
            <button class="tab-button" data-tab="schedule">
                <div class="tab-icon">
                <svg xmlns="http://www.w3.org/2000/svg" style="fill: currentcolor;" class="ionicon" viewBox="0 0 512 512" aria-hidden="true" role="presentation"><title>Calendar</title><rect fill="none" stroke="currentColor" stroke-linejoin="round" stroke-width="32" x="48" y="80" width="416" height="384" rx="48"></rect><circle cx="296" cy="232" r="24"></circle><circle cx="376" cy="232" r="24"></circle><circle cx="296" cy="312" r="24"></circle><circle cx="376" cy="312" r="24"></circle><circle cx="136" cy="312" r="24"></circle><circle cx="216" cy="312" r="24"></circle><circle cx="136" cy="392" r="24"></circle><circle cx="216" cy="392" r="24"></circle><circle cx="296" cy="392" r="24"></circle><path fill="none" stroke="currentColor" stroke-linejoin="round" stroke-width="32" stroke-linecap="round" d="M128 48v32M384 48v32"></path><path fill="none" stroke="currentColor" stroke-linejoin="round" stroke-width="32" d="M464 160H48"></path></svg>
                </div>
                <span>Schedule</span>
            </button>
            
            <button class="tab-button" data-tab="catchup">
                <div class="tab-icon">
                <svg focusable="false" width="1em" height="1em" style="transform: rotate(360deg);" preserveAspectRatio="xMidYMid meet" viewBox="0 0 24 24" aria-hidden="true" role="presentation"><path d="M13 16.493C13 18.427 14.573 20 16.507 20s3.507-1.573 3.507-3.507c0-.177-.027-.347-.053-.517H20V6h2V4h-3a1 1 0 0 0-1 1v8.333a3.465 3.465 0 0 0-1.493-.346A3.51 3.51 0 0 0 13 16.493zM2 5h14v2H2z" fill="currentColor"></path><path d="M2 9h14v2H2zm0 4h9v2H2zm0 4h9v2H2z" fill="currentColor"></path><rect x="0" y="0" width="24" height="24" fill="rgba(0, 0, 0, 0)"></rect></svg>
                </div>
                <span>Catch Up</span>
            </button>
            
            <button class="tab-button" data-tab="recent">
                <div class="tab-icon">
                <svg aria-hidden="true" role="presentation" focusable="false" width="1em" height="1em" style="transform: rotate(360deg);" preserveAspectRatio="xMidYMid meet" viewBox="0 0 24 24"><path d="M20 2H8c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-2 5h-3v5.5a2.5 2.5 0 0 1-5 0a2.5 2.5 0 0 1 2.5-2.5c.57 0 1.08.19 1.5.51V5h4v2zM4 6H2v14c0 1.1.9 2 2 2h14v-2H4V6z" fill="currentColor"></path><rect x="0" y="0" width="24" height="24" fill="rgba(0, 0, 0, 0)"></rect></svg>
                </div>
                <span>Recent</span>
            </button>
            
            <button class="tab-button" data-tab="favorites">
                <div class="tab-icon">
                <svg aria-hidden="true" role="presentation" focusable="false" width="1em" height="1em" viewBox="0 0 24 24">
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
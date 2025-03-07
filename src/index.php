<?php 
session_start();

// Generate CSRF token if it doesn't exist
if (empty($_SESSION['csrf_token'])) {
    $_SESSION['csrf_token'] = bin2hex(random_bytes(32));
}

include './php/nocache.php';
include './php/config.php';

// Get file modification times for cache busting
$cssVersion = filemtime(__DIR__ . '/css/player.css');

// Services
$jsServiceVersion = filemtime(__DIR__ . '/js/services/audio-service.js');
$jsMetadataServiceVersion = filemtime(__DIR__ . '/js/services/metadata-service.js');
$jsStorageServiceVersion = filemtime(__DIR__ . '/js/services/storage-service.js');

// Managers
$jsBackgroundManagerVersion = filemtime(__DIR__ . '/js/managers/background-manager.js');
$jsTrackManagerVersion = filemtime(__DIR__ . '/js/managers/track-manager.js');
$jsLikeManagerVersion = filemtime(__DIR__ . '/js/managers/like-manager.js');
$jsViewManagerVersion = filemtime(__DIR__ . '/js/managers/view-manager.js');
$jsUIManagerVersion = filemtime(__DIR__ . '/js/managers/ui-manager.js');
$jsScheduleManagerVersion = filemtime(__DIR__ . '/js/managers/schedule-manager.js');
$jsArtworkZoomManagerVersion = filemtime(__DIR__ . '/js/managers/artwork-zoom-manager.js');

// Core player files
$jsPlayerVersion = filemtime(__DIR__ . '/js/player.js');
$jsAppVersion = filemtime(__DIR__ . '/js/app.js');

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
    
    <!-- Services -->
    <script src="./js/services/audio-service.js?v=<?php echo $jsServiceVersion; ?>"></script>
    <script src="./js/services/metadata-service.js?v=<?php echo $jsMetadataServiceVersion; ?>"></script>
    <script src="./js/services/storage-service.js?v=<?php echo $jsStorageServiceVersion; ?>"></script>
    
    <!-- Managers -->
    <script src="./js/managers/background-manager.js?v=<?php echo $jsBackgroundManagerVersion; ?>"></script>
    <script src="./js/managers/like-manager.js?v=<?php echo $jsLikeManagerVersion; ?>"></script>
    <script src="./js/managers/track-manager.js?v=<?php echo $jsTrackManagerVersion; ?>"></script>
    <script src="./js/managers/artwork-zoom-manager.js?v=<?php echo $jsArtworkZoomManagerVersion; ?>"></script>
    <script src="./js/managers/view-manager.js?v=<?php echo $jsViewManagerVersion; ?>"></script>
    <script src="./js/managers/ui-manager.js?v=<?php echo $jsUIManagerVersion; ?>"></script>
    <script src="./js/managers/schedule-manager.js?v=<?php echo $jsScheduleManagerVersion; ?>"></script>

    <!-- Core player -->
    <script src="./js/player.js?v=<?php echo $jsPlayerVersion; ?>"></script>
    <script src="./js/app.js?v=<?php echo $jsAppVersion; ?>"></script>
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
                    <!-- Contact Button Overlay -->
                    <div class="contact-button-container">
                        <button id="contactButton" class="contact-button" tabindex="0" role="button" aria-label="Message The Studio" title="Message The Studio">
                            <svg fill="currentColor" role="presentation" xmlns="http://www.w3.org/2000/svg" class="ionicon" viewBox="0 0 32 32" width="20px" height="20px">
                                <path d="M 3 7 L 3 25 L 29 25 L 29 7 Z M 7.3125 9 L 24.6875 9 L 16 14.78125 Z M 5 9.875 L 11.75 14.375 L 5 19.09375 Z M 27 9.875 L 27 19.09375 L 20.25 14.375 Z M 13.5 15.5625 L 15.4375 16.84375 L 16 17.1875 L 16.5625 16.84375 L 18.5 15.5625 L 27 21.5 L 27 23 L 5 23 L 5 21.5 Z"></path>
                            </svg>
                            <span>Message Us</span>
                        </button>
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
                    <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" style="stroke: #2563eb !important; stroke-width: 1; stroke-linecap: round; stroke-linejoin: round;"><polygon points="5 3 19 12 5 21 5 3" fill="#2563eb" style="fill: #2563eb !important;"></polygon></svg>
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
    <!-- Contact Form Overlay -->
    <div id="contactFormOverlay" class="contact-form-overlay">
        <div class="contact-form-container">
            <div class="contact-form-header">
                <button id="closeContactForm" class="close-button">
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <line x1="18" y1="6" x2="6" y2="18"></line>
                        <line x1="6" y1="6" x2="18" y2="18"></line>
                    </svg>
                </button>
                <h2>Send Us A Message</h2>
                <button id="sendMessage" class="send-button" type="submit" form="contactForm">Send</button>
            </div>
            
            <form id="contactForm" action="./php/comment.php" method="post">
            <input type="hidden" name="csrf_token" value="<?php echo $_SESSION['csrf_token']; ?>">
                <div class="form-group">
                    <input type="text" id="name" name="name" placeholder="Your Name *" required>
                </div>
                
                <div class="form-group">
                    <input type="email" id="email" name="email" placeholder="Your Email *" required>
                </div>

                <div class="form-group">
                    <textarea id="message" name="message" rows="10" placeholder="Compose your message here" required></textarea>
                </div>

                <div class="form-group" style="display:none;">
                    <input type="text" id="website" name="website" autocomplete="off">
                </div>
            </form>
        </div>
        <!-- Success Message (initially hidden) -->
        <div id="formSuccessMessage" class="form-success-message">
            <div class="success-content">
                <svg xmlns="http://www.w3.org/2000/svg" width="60" height="60" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="success-icon">
                    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                    <polyline points="22 4 12 14.01 9 11.01"></polyline>
                </svg>
                <h3>Thank You!</h3>
                <p>Your message has been received successfully.</p>
                <button id="successOkButton" class="ok-button">OK</button>
            </div>
        </div>
    </div>
    
    <!-- Artwork Zoom Overlay -->
    <div id="artworkZoomOverlay" class="artwork-zoom-overlay">
        <div class="artwork-zoom-container">
            <button id="closeArtworkZoom" class="close-button" aria-label="Close artwork view">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <line x1="18" y1="6" x2="6" y2="18"></line>
                    <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
            </button>
            <div class="artwork-zoom-content">
                <img id="zoomedArtwork" src="" alt="Album artwork" class="zoomed-artwork">
            </div>
        </div>
    </div>
</body>
</html>
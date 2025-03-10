<?php
// Enable error reporting for debugging
ini_set('display_errors', 1);
error_reporting(E_ALL);

require_once '../loved_tracks.php';
require_once '../nocache.php';

// Disable caching for API endpoints
header("Cache-Control: no-store, no-cache, must-revalidate, max-age=0");
header("Cache-Control: post-check=0, pre-check=0", false);
header("Pragma: no-cache");

// Check if data directory exists and is writable
$dataDir = __DIR__ . '/../../../data';
if (!file_exists($dataDir)) {
    mkdir($dataDir, 0755, true);
}

if (!is_writable($dataDir)) {
    http_response_code(500);
    echo json_encode(['error' => 'Data directory is not writable: ' . $dataDir]);
    exit;
}

// Set content type to JSON
header('Content-Type: application/json');

// Handle different HTTP methods
$method = $_SERVER['REQUEST_METHOD'];

// Check if SQLite3 is available
if (!class_exists('SQLite3')) {
    // Send a 200 response but with a "soft error" to avoid console errors
    echo json_encode([
        'success' => true,
        'notice' => 'SQLite3 extension not available - analytics disabled',
        'status' => 'disabled'
    ]);
    exit;
}

try {
    $trackManager = new TrackManager();
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['error' => 'Database error: ' . $e->getMessage()]);
    exit;
}

switch ($method) {
    case 'POST':
        // Process track interaction data
        $requestData = json_decode(file_get_contents('php://input'), true);
        
        // Validate required fields
        if (!isset($requestData['hash']) || !isset($requestData['action'])) {
            http_response_code(400);
            echo json_encode(['error' => 'Missing required fields']);
            exit;
        }
        
        $hash = $requestData['hash'];
        $action = $requestData['action'];
        $result = false;
        
        // Handle action types
        switch ($action) {
            case 'like':
                // Require artist and title for likes (to store in tracks table)
                if (!isset($requestData['artist']) || !isset($requestData['title'])) {
                    http_response_code(400);
                    echo json_encode(['error' => 'Artist and title required for likes']);
                    exit;
                }
                
                $artist = $requestData['artist'];
                $title = $requestData['title'];
                $album = $requestData['album'] ?? null;
                
                $result = $trackManager->recordLike($hash, $artist, $title, $album);
                break;
                
            case 'unlike':
                $result = $trackManager->recordUnlike($hash);
                break;
                
            case 'play':
            case 'stop':
                // These would need track data as well, similar to like
                if (!isset($requestData['artist']) || !isset($requestData['title'])) {
                    http_response_code(400);
                    echo json_encode(['error' => 'Artist and title required']);
                    exit;
                }
                
                $artist = $requestData['artist'];
                $title = $requestData['title'];
                $album = $requestData['album'] ?? null;
                
                // Add track if it doesn't exist
                $trackManager->addTrack($hash, $artist, $title, $album);
                // Record the action
                $result = $trackManager->recordAction($hash, $action);
                break;
                
            default:
                http_response_code(400);
                echo json_encode(['error' => 'Invalid action type']);
                exit;
        }
        
        if ($result) {
            echo json_encode(['success' => true]);
        } else {
            http_response_code(500);
            echo json_encode(['error' => 'Failed to record action']);
        }
        break;
        
    case 'GET':
        // Handle different GET endpoints
        $action = $_GET['action'] ?? '';
        
        switch ($action) {
            case 'popular':
                $limit = isset($_GET['limit']) ? (int)$_GET['limit'] : 10;
                $popularTracks = $trackManager->getPopularTracks($limit);
                echo json_encode(['tracks' => $popularTracks]);
                break;
                
            case 'track_likes':
                if (!isset($_GET['hash'])) {
                    http_response_code(400);
                    echo json_encode(['error' => 'Hash parameter required']);
                    exit;
                }
                
                $likes = $trackManager->getTrackLikes($_GET['hash']);
                echo json_encode(['likes' => $likes]);
                break;
                
            default:
                http_response_code(400);
                echo json_encode(['error' => 'Invalid action']);
                break;
        }
        break;
        
    default:
        http_response_code(405);
        echo json_encode(['error' => 'Method not allowed']);
        break;
}
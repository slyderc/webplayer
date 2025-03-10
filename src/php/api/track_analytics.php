<?php
require_once '../loved_tracks.php';
require_once '../nocache.php';

// Disable caching for API endpoints
nocache();

// Set content type to JSON
header('Content-Type: application/json');

// Handle different HTTP methods
$method = $_SERVER['REQUEST_METHOD'];
$trackManager = new TrackManager();

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
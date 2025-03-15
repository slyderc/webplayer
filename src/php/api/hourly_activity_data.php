<?php
// Enable error reporting for debugging
ini_set('display_errors', 1);
error_reporting(E_ALL);

require_once '../loved_tracks.php';
require_once '../config.php';
require_once 'auth.php';

// Disable caching for API endpoints
header("Cache-Control: no-store, no-cache, must-revalidate, max-age=0");
header("Cache-Control: post-check=0, pre-check=0", false);
header("Pragma: no-cache");
header('Content-Type: application/json');

// Check if user is authenticated
if (!isAuthenticated()) {
    http_response_code(401);
    echo json_encode(['error' => 'Unauthorized']);
    exit;
}

// Check if SQLite3 is available
if (!class_exists('SQLite3')) {
    http_response_code(500);
    echo json_encode(['error' => 'SQLite3 extension not available']);
    exit;
}

// Get the date parameter
$date = $_GET['date'] ?? date('Y-m-d');

try {
    // Set the timezone for PHP
    $localTimezone = new DateTimeZone(date_default_timezone_get());
    $utcTimezone = new DateTimeZone('UTC');
    
    // Get timezone offset in hours
    $now = new DateTime('now', $utcTimezone);
    $offset = $localTimezone->getOffset($now) / 3600;
    $offsetStr = ($offset >= 0 ? '+' : '') . $offset;
    
    $db = new SQLite3(__DIR__ . '/../data/tracks.db');
    
    // Get hourly counts for each action type for the selected date
    $stmt = $db->prepare("
        SELECT 
            strftime('%H', timestamp, '{$offsetStr} hours') as hour,
            action_type,
            COUNT(*) as count
        FROM 
            actions
        WHERE 
            date(timestamp, '{$offsetStr} hours') = :selected_date
        GROUP BY 
            hour, action_type
        ORDER BY 
            hour, action_type
    ");
    
    $stmt->bindValue(':selected_date', $date, SQLITE3_TEXT);
    $result = $stmt->execute();
    
    // Initialize hourly data with all hours (0-23) and zero counts
    $hourlyActions = [];
    for ($i = 0; $i < 24; $i++) {
        $hour = sprintf('%02d', $i);
        $hourlyActions[$hour] = [
            'like' => 0,
            'unlike' => 0,
            'play' => 0,
            'stop' => 0,
            'hour' => $hour
        ];
    }
    
    // Fill in the actual counts
    while ($row = $result->fetchArray(SQLITE3_ASSOC)) {
        $hour = $row['hour'];
        $hourlyActions[$hour][$row['action_type']] = $row['count'];
    }
    
    // Format the selected date for display
    $formattedDate = date('F j, Y', strtotime($date));
    
    // Prepare the response data
    $responseData = [
        'formattedDate' => $formattedDate,
        'chartData' => [
            'hours' => array_keys($hourlyActions),
            'plays' => array_column($hourlyActions, 'play'),
            'stops' => array_column($hourlyActions, 'stop'),
            'likes' => array_column($hourlyActions, 'like'),
            'unlikes' => array_column($hourlyActions, 'unlike')
        ]
    ];
    
    echo json_encode($responseData);
    
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['error' => 'Error retrieving data: ' . $e->getMessage()]);
}
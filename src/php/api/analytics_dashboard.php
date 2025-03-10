<?php
// Enable error reporting for debugging
ini_set('display_errors', 1);
error_reporting(E_ALL);

require_once '../loved_tracks.php';
require_once '../config.php';

// Disable caching for dashboard
header("Cache-Control: no-store, no-cache, must-revalidate, max-age=0");
header("Cache-Control: post-check=0, pre-check=0", false);
header("Pragma: no-cache");

// Simple authentication check - replace with your own auth method
$authorized = false;

// Check for simple authentication (demo purposes only)
if (isset($_GET['key']) && $_GET['key'] === 'admin123') {
    $authorized = true;
}

// Database path for display
$dbPath = realpath(__DIR__ . '/../../../data/tracks.db');
$trackManager = new TrackManager();

// Get popular tracks
$popularTracks = $trackManager->getPopularTracks(20);

// Get action counts by type
$db = new SQLite3(__DIR__ . '/../../../data/tracks.db');
$actionCounts = [];
$actionTypes = ['like', 'unlike', 'play', 'stop'];

foreach ($actionTypes as $type) {
    $stmt = $db->prepare('SELECT COUNT(*) as count FROM actions WHERE action_type = :type');
    $stmt->bindValue(':type', $type, SQLITE3_TEXT);
    $result = $stmt->execute();
    $row = $result->fetchArray(SQLITE3_ASSOC);
    $actionCounts[$type] = $row['count'];
}

// Get daily action counts
$stmt = $db->prepare('
    SELECT 
        date(timestamp) as day,
        action_type,
        COUNT(*) as count
    FROM 
        actions
    WHERE 
        timestamp >= date("now", "-7 days")
    GROUP BY 
        day, action_type
    ORDER BY 
        day DESC, action_type
');

$result = $stmt->execute();
$dailyActions = [];

while ($row = $result->fetchArray(SQLITE3_ASSOC)) {
    if (!isset($dailyActions[$row['day']])) {
        $dailyActions[$row['day']] = [
            'like' => 0,
            'unlike' => 0,
            'play' => 0,
            'stop' => 0
        ];
    }
    
    $dailyActions[$row['day']][$row['action_type']] = $row['count'];
}
?>

<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Now Wave Radio - Analytics Dashboard</title>
    <style>
        body {
            font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
            line-height: 1.6;
            color: #333;
            margin: 0;
            padding: 20px;
            background-color: #f5f5f5;
        }
        
        .container {
            max-width: 1200px;
            margin: 0 auto;
            background: white;
            padding: 20px;
            border-radius: 8px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        
        h1, h2, h3 {
            color: #161616;
        }
        
        .dashboard-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 20px;
            padding-bottom: 10px;
            border-bottom: 1px solid #eee;
        }
        
        .stats-container {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 20px;
            margin-bottom: 30px;
        }
        
        .stat-card {
            background: #f9f9f9;
            padding: 15px;
            border-radius: 5px;
            box-shadow: 0 1px 3px rgba(0,0,0,0.1);
            text-align: center;
        }
        
        .stat-value {
            font-size: 2rem;
            font-weight: bold;
            margin: 10px 0;
        }
        
        .stat-label {
            color: #555;
            font-size: 0.9rem;
            text-transform: uppercase;
        }
        
        table {
            width: 100%;
            border-collapse: collapse;
            margin: 20px 0;
        }
        
        th, td {
            padding: 12px 15px;
            text-align: left;
            border-bottom: 1px solid #ddd;
        }
        
        th {
            background-color: #f2f2f2;
            font-weight: bold;
        }
        
        tr:hover {
            background-color: #f5f5f5;
        }
        
        .track-image {
            width: 50px;
            height: 50px;
            object-fit: cover;
            border-radius: 4px;
        }
        
        .unauthorized {
            text-align: center;
            padding: 50px 20px;
        }
        
        .unauthorized h1 {
            color: #e74c3c;
        }
        
        .timeline {
            margin: 30px 0;
        }
        
        .timeline-chart {
            height: 300px;
            margin-top: 20px;
        }
    </style>
</head>
<body>
    <div class="container">
        <?php if ($authorized): ?>
            <div class="dashboard-header">
                <h1>Now Wave Radio Analytics</h1>
                <div>
                    <span>Data updated: <?= date('Y-m-d H:i:s') ?></span>
                </div>
            </div>
            
            <div class="stats-container">
                <div class="stat-card">
                    <div class="stat-value"><?= $actionCounts['play'] ?? 0 ?></div>
                    <div class="stat-label">Total Plays</div>
                </div>
                <div class="stat-card">
                    <div class="stat-value"><?= $actionCounts['like'] - ($actionCounts['unlike'] ?? 0) ?></div>
                    <div class="stat-label">Net Likes</div>
                </div>
                <div class="stat-card">
                    <div class="stat-value"><?= count($popularTracks) ?></div>
                    <div class="stat-label">Tracked Tracks</div>
                </div>
                <div class="stat-card">
                    <div class="stat-value"><?= count($dailyActions) ?></div>
                    <div class="stat-label">Days with Activity</div>
                </div>
            </div>
            
            <h2>Popular Tracks</h2>
            <?php if (count($popularTracks) > 0): ?>
                <table>
                    <thead>
                        <tr>
                            <th>Track</th>
                            <th>Artist</th>
                            <th>Title</th>
                            <th>Likes</th>
                        </tr>
                    </thead>
                    <tbody>
                        <?php foreach ($popularTracks as $track): ?>
                            <tr>
                                <td>
                                    <img src="/player/publish/ca/<?= $track['hash'] ?>.jpg" 
                                         class="track-image"
                                         onerror="this.src='/player/NWR_text_logo_angle.png';">
                                </td>
                                <td><?= htmlspecialchars($track['artist']) ?></td>
                                <td><?= htmlspecialchars($track['title']) ?></td>
                                <td><?= $track['net_likes'] ?></td>
                            </tr>
                        <?php endforeach; ?>
                    </tbody>
                </table>
            <?php else: ?>
                <p>No popular tracks found.</p>
            <?php endif; ?>
            
            <h2>Daily Activity (Last 7 Days)</h2>
            <table>
                <thead>
                    <tr>
                        <th>Date</th>
                        <th>Plays</th>
                        <th>Stops</th>
                        <th>Likes</th>
                        <th>Unlikes</th>
                    </tr>
                </thead>
                <tbody>
                    <?php foreach ($dailyActions as $day => $counts): ?>
                        <tr>
                            <td><?= $day ?></td>
                            <td><?= $counts['play'] ?></td>
                            <td><?= $counts['stop'] ?></td>
                            <td><?= $counts['like'] ?></td>
                            <td><?= $counts['unlike'] ?></td>
                        </tr>
                    <?php endforeach; ?>
                </tbody>
            </table>
            
            <h2>Database Information</h2>
            <p>Database location: <?= $dbPath ?: 'Unknown' ?></p>
            
        <?php else: ?>
            <div class="unauthorized">
                <h1>Unauthorized Access</h1>
                <p>You are not authorized to view this dashboard.</p>
            </div>
        <?php endif; ?>
    </div>
</body>
</html>
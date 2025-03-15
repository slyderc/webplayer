<?php
// Enable error reporting for debugging
ini_set('display_errors', 1);
error_reporting(E_ALL);

require_once '../loved_tracks.php';
require_once '../config.php';
require_once 'auth.php';

// Disable caching for dashboard
header("Cache-Control: no-store, no-cache, must-revalidate, max-age=0");
header("Cache-Control: post-check=0, pre-check=0", false);
header("Pragma: no-cache");

// Check for login attempt
$loginError = '';
if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['login'])) {
    $username = $_POST['username'] ?? '';
    $password = $_POST['password'] ?? '';
    
    if (login($username, $password)) {
        // Redirect to remove POST data and prevent form resubmission
        header('Location: ' . $_SERVER['PHP_SELF']);
        exit;
    } else {
        $loginError = 'Invalid username or password';
    }
}

// Check for logout
if (isset($_GET['logout'])) {
    logout();
    header('Location: ' . $_SERVER['PHP_SELF']);
    exit;
}

// Check if user is authenticated
$authorized = isAuthenticated();

// Check if SQLite3 is available
$sqliteAvailable = class_exists('SQLite3');
$dbPath = realpath(__DIR__ . '/../data/tracks.db');

// Initialize with empty data in case SQLite is not available
$popularTracks = [];
$actionCounts = ['like' => 0, 'unlike' => 0, 'play' => 0, 'stop' => 0];
$dailyActions = [];
$totalTracks = 0;

if ($sqliteAvailable) {
    try {
        $trackManager = new TrackManager();

        // Get popular tracks
        $popularTracks = $trackManager->getPopularTracks(20);

        // Get action counts by type
        $db = new SQLite3(__DIR__ . '/../data/tracks.db');
        $actionTypes = ['like', 'unlike', 'play', 'stop'];

        foreach ($actionTypes as $type) {
            $stmt = $db->prepare('SELECT COUNT(*) as count FROM actions WHERE action_type = :type');
            $stmt->bindValue(':type', $type, SQLITE3_TEXT);
            $result = $stmt->execute();
            $row = $result->fetchArray(SQLITE3_ASSOC);
            $actionCounts[$type] = $row['count'];
        }
        
        // Get total number of tracks in the database
        $stmt = $db->prepare('SELECT COUNT(*) as count FROM tracks');
        $result = $stmt->execute();
        $row = $result->fetchArray(SQLITE3_ASSOC);
        $totalTracks = $row['count'];
    } catch (Exception $e) {
        error_log("Error in analytics dashboard: " . $e->getMessage());
        // Continue with empty data if there's an error
    }
}

// Get daily action counts
if ($sqliteAvailable && isset($db)) {
    try {
        // Set the timezone for PHP
        $localTimezone = new DateTimeZone(date_default_timezone_get());
        $utcTimezone = new DateTimeZone('UTC');
        
        // Get timezone offset in hours
        $now = new DateTime('now', $utcTimezone);
        $offset = $localTimezone->getOffset($now) / 3600;
        $offsetStr = ($offset >= 0 ? '+' : '') . $offset;
        
        // Log timezone info for debugging
        error_log("Local timezone: " . date_default_timezone_get() . ", Offset from UTC: " . $offsetStr . " hours");
        
        // For debugging purposes, log how many distinct days are in the database with timezone adjustment
        $debug_stmt = $db->prepare("SELECT COUNT(DISTINCT date(timestamp, '{$offsetStr} hours')) as day_count FROM actions");
        $debug_result = $debug_stmt->execute();
        $debug_row = $debug_result->fetchArray(SQLITE3_ASSOC);
        error_log("Total distinct days in database: " . $debug_row['day_count']);
        
        // Get all days with activity, adjusting for timezone
        $stmt = $db->prepare("
            SELECT 
                date(timestamp, '{$offsetStr} hours') as day,
                action_type,
                COUNT(*) as count
            FROM 
                actions
            GROUP BY 
                day, action_type
            ORDER BY 
                day DESC, action_type
        ");
        
        $result = $stmt->execute();
        $dailyActions = [];
        
        // Process all results without limiting
        while ($row = $result->fetchArray(SQLITE3_ASSOC)) {
            $day = $row['day'];
            
            // Initialize day if not set
            if (!isset($dailyActions[$day])) {
                $dailyActions[$day] = [
                    'like' => 0,
                    'unlike' => 0,
                    'play' => 0,
                    'stop' => 0
                ];
            }
            
            // Set the specific action count for this day
            $dailyActions[$day][$row['action_type']] = $row['count'];
        }
        
        // Debug info - print count of days
        error_log("Days processed in dailyActions array: " . count($dailyActions));
    } catch (Exception $e) {
        error_log("Error getting daily action counts: " . $e->getMessage());
    }
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
        
        .alert {
            padding: 15px;
            margin-bottom: 20px;
            border: 1px solid transparent;
            border-radius: 4px;
        }
        
        .alert-warning {
            background-color: #fcf8e3;
            border-color: #faebcc;
            color: #8a6d3b;
        }
        
        .alert pre {
            background: #f8f8f8;
            padding: 10px;
            border-radius: 4px;
            overflow-x: auto;
        }
        
        /* Login form styles */
        .login-container {
            max-width: 400px;
            margin: 100px auto;
            padding: 30px;
            background: white;
            border-radius: 8px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        
        .login-header {
            text-align: center;
            margin-bottom: 30px;
        }
        
        .form-group {
            margin-bottom: 20px;
        }
        
        .form-group label {
            display: block;
            margin-bottom: 5px;
            font-weight: bold;
        }
        
        .form-group input {
            width: 100%;
            padding: 10px;
            border: 1px solid #ddd;
            border-radius: 4px;
            font-size: 16px;
        }
        
        .login-button {
            width: 100%;
            padding: 12px;
            background-color: #2563eb;
            color: white;
            border: none;
            border-radius: 4px;
            font-size: 16px;
            cursor: pointer;
        }
        
        .login-button:hover {
            background-color: #1e50c8;
        }
        
        .error-message {
            color: #e74c3c;
            margin: 15px 0;
            text-align: center;
        }
        
        .logout-button {
            padding: 6px 12px;
            background-color: #f8f9fa;
            color: #333;
            border: 1px solid #ddd;
            border-radius: 4px;
            text-decoration: none;
            font-size: 14px;
        }
        
        .logout-button:hover {
            background-color: #e9ecef;
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
                    <a href="?logout=1" class="logout-button">Logout</a>
                </div>
            </div>
            
            <?php if (!$sqliteAvailable): ?>
                <div class="alert alert-warning">
                    <strong>Warning:</strong> SQLite3 extension is not installed. Analytics features are disabled.
                    <p>To enable analytics, please install SQLite3 extension for PHP:</p>
                    <pre>sudo apt-get install php-sqlite3</pre>
                    <p>Then restart your web server.</p>
                </div>
            <?php endif; ?>
            
            <div class="stats-container">
                <div class="stat-card">
                    <div class="stat-value"><?= $actionCounts['play'] ?? 0 ?></div>
                    <div class="stat-label">Total Plays</div>
                </div>
                <div class="stat-card">
                    <div class="stat-value"><?= max(0, $actionCounts['like'] - ($actionCounts['unlike'] ?? 0)) ?></div>
                    <div class="stat-label">Net Likes</div>
                </div>
                <div class="stat-card">
                    <div class="stat-value"><?= $totalTracks ?></div>
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
            
            <h2>Daily Activity (All Recorded Days - <?php echo date_default_timezone_get(); ?> Timezone)</h2>
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
            <div class="login-container">
                <div class="login-header">
                    <h2>Now Wave Radio Analytics</h2>
                    <p>Please log in to access the dashboard</p>
                </div>
                
                <?php if ($loginError): ?>
                    <div class="error-message"><?= htmlspecialchars($loginError) ?></div>
                <?php endif; ?>
                
                <form method="post" action="">
                    <div class="form-group">
                        <label for="username">Username</label>
                        <input type="text" id="username" name="username" required autocomplete="username">
                    </div>
                    
                    <div class="form-group">
                        <label for="password">Password</label>
                        <input type="password" id="password" name="password" required autocomplete="current-password">
                    </div>
                    
                    <button type="submit" class="login-button" name="login" value="1">Login</button>
                </form>
            </div>
        <?php endif; ?>
    </div>
</body>
</html>
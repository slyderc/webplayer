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
$hourlyActions = [];
$totalTracks = 0;
$availableDates = [];

// Get selected date from query parameter or default to today
$today = date('Y-m-d');
$selectedDate = isset($_GET['date']) ? $_GET['date'] : $today;

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
        
        // Get all available dates with activity data
        $dates_stmt = $db->prepare("
            SELECT DISTINCT date(timestamp, '{$offsetStr} hours') as activity_date 
            FROM actions 
            ORDER BY activity_date DESC
        ");
        $dates_result = $dates_stmt->execute();
        
        // Store all available dates in an array
        $availableDates = [];
        while ($date_row = $dates_result->fetchArray(SQLITE3_ASSOC)) {
            $availableDates[] = $date_row['activity_date'];
        }
        
        // Log the number of available dates
        error_log("Total distinct days in database: " . count($availableDates));
        
        // If selected date is not in available dates and we have dates, use the most recent date
        if (!empty($availableDates) && !in_array($selectedDate, $availableDates)) {
            $selectedDate = $availableDates[0];
        }
        
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
    
    // Get hourly action counts
    try {
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
        
        $stmt->bindValue(':selected_date', $selectedDate, SQLITE3_TEXT);
        
        $result = $stmt->execute();
        
        // Initialize hourly data with all hours (0-23) and zero counts
        // We'll use an ordered array to ensure correct display on chart
        $hourlyActions = [];
        for ($i = 0; $i < 24; $i++) {
            $hour = sprintf('%02d', $i);
            $hourlyActions[$hour] = [
                'like' => 0,
                'unlike' => 0,
                'play' => 0,
                'stop' => 0,
                'hour' => $hour // Store the hour label to ensure order
            ];
        }
        
        // Fill in the actual counts
        while ($row = $result->fetchArray(SQLITE3_ASSOC)) {
            $hour = $row['hour'];
            $hourlyActions[$hour][$row['action_type']] = $row['count'];
        }
        
        error_log("Hourly data collected for " . count($hourlyActions) . " hours");
    } catch (Exception $e) {
        error_log("Error getting hourly action counts: " . $e->getMessage());
    }
}
?>

<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Now Wave Radio - Analytics Dashboard</title>
    <script src="https://cdn.jsdelivr.net/npm/chart.js@3.9.1/dist/chart.min.js"></script>
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
        
        /* Chart container styles */
        .chart-container {
            position: relative;
            margin: 30px 0;
            height: 500px;
            width: 100%;
            background-color: #f9f9f9;
            border-radius: 8px;
            padding: 20px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            transition: opacity 0.3s ease;
        }
        
        .chart-container.loading::before {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background-color: rgba(255, 255, 255, 0.7);
            border-radius: 8px;
            z-index: 10;
        }
        
        .chart-container.loading::after {
            content: '';
            position: absolute;
            top: 50%;
            left: 50%;
            width: 50px;
            height: 50px;
            margin-top: -25px;
            margin-left: -25px;
            border: 4px solid rgba(37, 99, 235, 0.3);
            border-radius: 50%;
            border-top-color: rgba(37, 99, 235, 0.9);
            z-index: 11;
            animation: spinner 1s linear infinite;
        }
        
        @keyframes spinner {
            to {transform: rotate(360deg);}
        }
        
        /* Daily Activity Table Styles */
        .daily-activity-container {
            max-height: calc(2.5rem * 14 + 2.5rem); /* Height for 14 rows + header */
            overflow-y: auto;
            border: 1px solid #e5e7eb;
            border-radius: 8px;
            margin-bottom: 30px;
            background-color: #fff;
            box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
        }
        
        #dailyActivityTable {
            width: 100%;
            border-collapse: separate;
            border-spacing: 0;
        }
        
        #dailyActivityTable thead {
            position: sticky;
            top: 0;
            z-index: 1;
            background-color: #f3f4f6;
        }
        
        #dailyActivityTable th {
            padding: 12px 15px;
            font-weight: 600;
            color: #374151;
            text-align: left;
            border-bottom: 2px solid #e5e7eb;
        }
        
        #dailyActivityTable td {
            padding: 12px 15px;
            border-bottom: 1px solid #e5e7eb;
        }
        
        #dailyActivityTable tbody tr {
            cursor: pointer;
            transition: background-color 0.2s;
        }
        
        #dailyActivityTable tbody tr:hover {
            background-color: #f9fafb;
        }
        
        #dailyActivityTable tbody tr.selected-date {
            background-color: rgba(37, 99, 235, 0.1);
            border-left: 3px solid #2563eb;
        }
        
        #dailyActivityTable tbody tr:last-child td {
            border-bottom: none;
        }
        
        .chart-title {
            text-align: center;
            margin-bottom: 20px;
            font-size: 1.2rem;
            color: #333;
        }
        
        /* Date navigation styles */
        .date-nav-container {
            display: flex;
            justify-content: center;
            align-items: center;
            margin-bottom: 20px;
            gap: 15px;
        }
        
        .date-nav-button {
            background-color: #2563eb;
            color: white;
            border: none;
            border-radius: 4px;
            padding: 8px 12px;
            cursor: pointer;
            font-size: 14px;
            transition: background-color 0.2s;
        }
        
        .date-nav-button:hover {
            background-color: #1d4ed8;
        }
        
        .date-nav-button:disabled {
            background-color: #9ca3af;
            cursor: not-allowed;
        }
        
        .date-picker-container {
            display: flex;
            align-items: center;
        }
        
        .date-picker {
            padding: 8px 12px;
            border: 1px solid #d1d5db;
            border-radius: 4px;
            font-size: 14px;
            cursor: pointer;
        }
        
        .current-date-display {
            font-weight: bold;
            font-size: 16px;
            margin: 0 10px;
            min-width: 140px;
            text-align: center;
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
                                         onerror="this.src='<?= $streamConfig['defaultArtwork'] ?>';">
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
            
            <h2>Daily Activity (<?php echo date_default_timezone_get(); ?> Timezone)</h2>
            <div class="daily-activity-container">
                <table id="dailyActivityTable">
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
                            <tr data-date="<?= $day ?>" class="<?= ($day === $selectedDate) ? 'selected-date' : '' ?>">
                                <td><?= date('M j, Y', strtotime($day)) ?></td>
                                <td><?= $counts['play'] ?></td>
                                <td><?= $counts['stop'] ?></td>
                                <td><?= $counts['like'] ?></td>
                                <td><?= $counts['unlike'] ?></td>
                            </tr>
                        <?php endforeach; ?>
                    </tbody>
                </table>
            </div>
            
            <!-- Hourly Activity Chart -->
            <h2>Hourly Activity Chart</h2>
            
            <div class="date-nav-container">
                <?php
                    // Find current date index and adjacent dates
                    $currentIndex = array_search($selectedDate, $availableDates);
                    $prevDate = ($currentIndex !== false && $currentIndex < count($availableDates) - 1) ? $availableDates[$currentIndex + 1] : null;
                    $nextDate = ($currentIndex !== false && $currentIndex > 0) ? $availableDates[$currentIndex - 1] : null;
                    
                    // Format selected date for display
                    $formattedDate = date('F j, Y', strtotime($selectedDate));
                ?>
                
                <!-- Previous Day Button -->
                <button id="prevDayBtn" class="date-nav-button" onclick="changeDate('prev')" <?= (!$prevDate) ? 'disabled' : '' ?>>
                    &larr; Previous Day
                </button>
                
                <!-- Date Picker -->
                <div class="date-picker-container">
                    <span id="currentDateDisplay" class="current-date-display"><?= $formattedDate ?></span>
                    <select id="datePicker" class="date-picker" onchange="changeDate('select', this.value)">
                        <?php foreach ($availableDates as $date): ?>
                            <option value="<?= $date ?>" <?= ($date === $selectedDate) ? 'selected' : '' ?>>
                                <?= date('Y-m-d', strtotime($date)) ?>
                            </option>
                        <?php endforeach; ?>
                    </select>
                </div>
                
                <!-- Next Day Button -->
                <button id="nextDayBtn" class="date-nav-button" onclick="changeDate('next')" <?= (!$nextDate) ? 'disabled' : '' ?>>
                    Next Day &rarr;
                </button>
                
                <!-- Store available dates for JavaScript -->
                <script>
                    // Store the available dates and current index for navigation
                    const availableDates = <?= json_encode($availableDates) ?>;
                    let currentDateIndex = <?= $currentIndex !== false ? $currentIndex : 0 ?>;
                </script>
            </div>
            
            <div class="chart-container">
                <canvas id="hourlyActivityChart"></canvas>
            </div>
            
            <script>
            let hourlyChart; // Global chart instance
            
            // Function to change the date and update the chart
            function changeDate(action, selectedDate = null) {
                let newDate;
                
                // Determine the new date based on action
                if (action === 'prev' && currentDateIndex < availableDates.length - 1) {
                    currentDateIndex++;
                    newDate = availableDates[currentDateIndex];
                    
                    // Enable/disable navigation buttons
                    document.getElementById('nextDayBtn').disabled = currentDateIndex <= 0;
                    document.getElementById('prevDayBtn').disabled = currentDateIndex >= availableDates.length - 1;
                    
                } else if (action === 'next' && currentDateIndex > 0) {
                    currentDateIndex--;
                    newDate = availableDates[currentDateIndex];
                    
                    // Enable/disable navigation buttons
                    document.getElementById('nextDayBtn').disabled = currentDateIndex <= 0;
                    document.getElementById('prevDayBtn').disabled = currentDateIndex >= availableDates.length - 1;
                    
                } else if (action === 'select') {
                    newDate = selectedDate;
                    
                    // Find the index of the new date
                    const newIndex = availableDates.indexOf(newDate);
                    if (newIndex !== -1) {
                        currentDateIndex = newIndex;
                        
                        // Enable/disable navigation buttons
                        document.getElementById('nextDayBtn').disabled = currentDateIndex <= 0;
                        document.getElementById('prevDayBtn').disabled = currentDateIndex >= availableDates.length - 1;
                    }
                } else {
                    return; // Invalid action or boundary reached
                }
                
                // Update the dropdown selection
                document.getElementById('datePicker').value = newDate;
                
                // Show loading state
                document.querySelector('.chart-container').classList.add('loading');
                
                // Highlight the corresponding row in the table
                highlightTableRow(newDate);
                
                // Fetch the new date's data
                fetchChartData(newDate);
            }
            
            // Function to fetch chart data via AJAX
            function fetchChartData(date) {
                fetch('hourly_activity_data.php?date=' + date)
                    .then(response => {
                        if (!response.ok) {
                            throw new Error('Network response was not ok');
                        }
                        return response.json();
                    })
                    .then(data => {
                        updateChart(data);
                    })
                    .catch(error => {
                        console.error('Error fetching chart data:', error);
                    })
                    .finally(() => {
                        document.querySelector('.chart-container').classList.remove('loading');
                    });
            }
            
            // Function to update the chart with new data
            function updateChart(data) {
                // Update the formatted date display
                document.getElementById('currentDateDisplay').textContent = data.formattedDate;
                
                if (hourlyChart) {
                    // Update existing chart
                    hourlyChart.data.labels = data.chartData.hours;
                    hourlyChart.data.datasets[0].data = data.chartData.plays;
                    hourlyChart.data.datasets[1].data = data.chartData.stops;
                    hourlyChart.data.datasets[2].data = data.chartData.likes;
                    hourlyChart.data.datasets[3].data = data.chartData.unlikes;
                    
                    // Update the chart title
                    hourlyChart.options.plugins.title.text = 'Hourly Activity Distribution for ' + data.formattedDate;
                    
                    // Update the chart
                    hourlyChart.update();
                }
            }
            
            // Function to highlight the selected date in the table
            function highlightTableRow(date) {
                // Remove highlight from all rows
                const allRows = document.querySelectorAll('#dailyActivityTable tbody tr');
                allRows.forEach(row => row.classList.remove('selected-date'));
                
                // Add highlight to the selected row
                const selectedRow = document.querySelector(`#dailyActivityTable tbody tr[data-date="${date}"]`);
                if (selectedRow) {
                    selectedRow.classList.add('selected-date');
                    
                    // Scroll the row into view (with some margin)
                    const container = document.querySelector('.daily-activity-container');
                    const rowTop = selectedRow.offsetTop;
                    const containerHeight = container.clientHeight;
                    const scrollPosition = rowTop - (containerHeight / 2) + (selectedRow.clientHeight / 2);
                    
                    container.scrollTo({
                        top: Math.max(0, scrollPosition),
                        behavior: 'smooth'
                    });
                }
            }
            
            // Initialize the chart and table interactions on page load
            document.addEventListener('DOMContentLoaded', function() {
                // Get the canvas element
                const ctx = document.getElementById('hourlyActivityChart').getContext('2d');
                
                // Prepare the initial data
                const hours = <?php echo json_encode(array_keys($hourlyActions)); ?>;
                const plays = <?php echo json_encode(array_column($hourlyActions, 'play')); ?>;
                const stops = <?php echo json_encode(array_column($hourlyActions, 'stop')); ?>;
                const likes = <?php echo json_encode(array_column($hourlyActions, 'like')); ?>;
                const unlikes = <?php echo json_encode(array_column($hourlyActions, 'unlike')); ?>;
                
                // Add click event listeners to table rows
                const tableRows = document.querySelectorAll('#dailyActivityTable tbody tr');
                tableRows.forEach(row => {
                    row.addEventListener('click', function() {
                        const date = this.getAttribute('data-date');
                        
                        // Update the date picker
                        document.getElementById('datePicker').value = date;
                        
                        // Find index in available dates
                        const newIndex = availableDates.indexOf(date);
                        if (newIndex !== -1) {
                            currentDateIndex = newIndex;
                            
                            // Update navigation buttons
                            document.getElementById('nextDayBtn').disabled = currentDateIndex <= 0;
                            document.getElementById('prevDayBtn').disabled = currentDateIndex >= availableDates.length - 1;
                        }
                        
                        // Highlight the clicked row
                        highlightTableRow(date);
                        
                        // Fetch and update chart
                        fetchChartData(date);
                    });
                });
                
                // Scroll the selected date into view on initial load
                setTimeout(() => {
                    const selectedDate = '<?= $selectedDate ?>';
                    highlightTableRow(selectedDate);
                }, 100);
                
                // Create the chart
                hourlyChart = new Chart(ctx, {
                    type: 'bar',
                    data: {
                        labels: hours,
                        datasets: [
                            {
                                label: 'Plays',
                                data: plays,
                                backgroundColor: 'rgba(53, 122, 232, 0.8)',
                                borderColor: 'rgba(53, 122, 232, 1)',
                                borderWidth: 1,
                                borderRadius: 4,
                                maxBarThickness: 20
                            },
                            {
                                label: 'Stops',
                                data: stops,
                                backgroundColor: 'rgba(255, 153, 0, 0.8)',
                                borderColor: 'rgba(255, 153, 0, 1)',
                                borderWidth: 1,
                                borderRadius: 4,
                                maxBarThickness: 20
                            },
                            {
                                label: 'Likes',
                                data: likes,
                                backgroundColor: 'rgba(220, 53, 89, 0.8)',
                                borderColor: 'rgba(220, 53, 89, 1)',
                                borderWidth: 1,
                                borderRadius: 4,
                                maxBarThickness: 20
                            },
                            {
                                label: 'Unlikes',
                                data: unlikes,
                                backgroundColor: 'rgba(75, 192, 192, 0.8)',
                                borderColor: 'rgba(75, 192, 192, 1)',
                                borderWidth: 1,
                                borderRadius: 4,
                                maxBarThickness: 20
                            }
                        ]
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                            title: {
                                display: true,
                                text: 'Hourly Activity Distribution for <?= $formattedDate ?>',
                                font: {
                                    size: 18
                                }
                            },
                            legend: {
                                position: 'top',
                                labels: {
                                    boxWidth: 12,
                                    usePointStyle: true,
                                    pointStyle: 'circle'
                                }
                            },
                            tooltip: {
                                mode: 'index',
                                intersect: false,
                                backgroundColor: 'rgba(0, 0, 0, 0.8)',
                                titleFont: {
                                    size: 14
                                },
                                bodyFont: {
                                    size: 13
                                },
                                callbacks: {
                                    title: function(tooltipItems) {
                                        return 'Hour: ' + tooltipItems[0].label + ':00 - ' + tooltipItems[0].label + ':59';
                                    }
                                }
                            }
                        },
                        scales: {
                            x: {
                                title: {
                                    display: true,
                                    text: 'Hour of Day (24-hour format)',
                                    font: {
                                        weight: 'bold'
                                    }
                                },
                                grid: {
                                    display: false
                                }
                            },
                            y: {
                                beginAtZero: true,
                                title: {
                                    display: true,
                                    text: 'Number of Actions',
                                    font: {
                                        weight: 'bold'
                                    }
                                },
                                grid: {
                                    color: 'rgba(0, 0, 0, 0.05)'
                                }
                            }
                        },
                        animation: {
                            duration: 1000,
                            easing: 'easeOutQuart'
                        }
                    }
                });
            });
            </script>
            
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
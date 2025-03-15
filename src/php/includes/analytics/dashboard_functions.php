<?php
/**
 * Analytics Dashboard Functions
 * Contains utility functions for the analytics dashboard
 */

/**
 * Handles authentication for the dashboard
 * Processes login/logout requests and returns authorization status
 */
function handleAuthentication() {
    $loginError = '';
    // Check for login attempt
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
    
    // Make $loginError available to templates
    global $dashboardData;
    $dashboardData['loginError'] = $loginError;
    
    return $authorized;
}

/**
 * Initializes dashboard data
 * Checks SQLite availability and loads all required data
 */
function initializeDashboardData() {
    global $dashboardData;
    $dashboardData = [
        'sqliteAvailable' => class_exists('SQLite3'),
        'dbPath' => realpath(__DIR__ . '/../../data/tracks.db'),
        'popularTracks' => [],
        'actionCounts' => ['like' => 0, 'unlike' => 0, 'play' => 0, 'stop' => 0],
        'dailyActions' => [],
        'hourlyActions' => [],
        'totalTracks' => 0,
        'availableDates' => [],
        'today' => date('Y-m-d'),
        'selectedDate' => isset($_GET['date']) ? $_GET['date'] : date('Y-m-d'),
        'loginError' => ''
    ];
    
    if ($dashboardData['sqliteAvailable']) {
        loadDashboardData();
    }
    
    return $dashboardData;
}

/**
 * Loads all dashboard data from the database
 */
function loadDashboardData() {
    global $dashboardData;
    
    try {
        $trackManager = new TrackManager();

        // Get popular tracks
        $dashboardData['popularTracks'] = $trackManager->getPopularTracks(20);

        // Get action counts by type
        $db = new SQLite3(__DIR__ . '/../../data/tracks.db');
        $actionTypes = ['like', 'unlike', 'play', 'stop'];

        foreach ($actionTypes as $type) {
            $stmt = $db->prepare('SELECT COUNT(*) as count FROM actions WHERE action_type = :type');
            $stmt->bindValue(':type', $type, SQLITE3_TEXT);
            $result = $stmt->execute();
            $row = $result->fetchArray(SQLITE3_ASSOC);
            $dashboardData['actionCounts'][$type] = $row['count'];
        }
        
        // Get total number of tracks in the database
        $stmt = $db->prepare('SELECT COUNT(*) as count FROM tracks');
        $result = $stmt->execute();
        $row = $result->fetchArray(SQLITE3_ASSOC);
        $dashboardData['totalTracks'] = $row['count'];
        
        // Load daily and hourly data
        loadDailyActivityData($db);
        loadHourlyActivityData($db);
        
    } catch (Exception $e) {
        error_log("Error in analytics dashboard: " . $e->getMessage());
        // Continue with empty data if there's an error
    }
}

/**
 * Loads daily activity data
 */
function loadDailyActivityData($db) {
    global $dashboardData;
    
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
        
        $dashboardData['availableDates'] = $availableDates;
        
        // Log the number of available dates
        error_log("Total distinct days in database: " . count($availableDates));
        
        // If selected date is not in available dates and we have dates, use the most recent date
        if (!empty($availableDates) && !in_array($dashboardData['selectedDate'], $availableDates)) {
            $dashboardData['selectedDate'] = $availableDates[0];
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
        
        $dashboardData['dailyActions'] = $dailyActions;
        
        // Debug info - print count of days
        error_log("Days processed in dailyActions array: " . count($dailyActions));
        
    } catch (Exception $e) {
        error_log("Error getting daily action counts: " . $e->getMessage());
    }
}

/**
 * Loads hourly activity data
 */
function loadHourlyActivityData($db) {
    global $dashboardData;
    
    try {
        // Set the timezone for PHP
        $localTimezone = new DateTimeZone(date_default_timezone_get());
        $utcTimezone = new DateTimeZone('UTC');
        
        // Get timezone offset in hours
        $now = new DateTime('now', $utcTimezone);
        $offset = $localTimezone->getOffset($now) / 3600;
        $offsetStr = ($offset >= 0 ? '+' : '') . $offset;
        
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
        
        $stmt->bindValue(':selected_date', $dashboardData['selectedDate'], SQLITE3_TEXT);
        
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
        
        $dashboardData['hourlyActions'] = $hourlyActions;
        
        error_log("Hourly data collected for " . count($hourlyActions) . " hours");
    } catch (Exception $e) {
        error_log("Error getting hourly action counts: " . $e->getMessage());
    }
}

/**
 * Gets the current date selection information
 */
function getDateNavigation() {
    global $dashboardData;
    
    // Find current date index and adjacent dates
    $currentIndex = array_search($dashboardData['selectedDate'], $dashboardData['availableDates']);
    $prevDate = ($currentIndex !== false && $currentIndex < count($dashboardData['availableDates']) - 1) ? 
        $dashboardData['availableDates'][$currentIndex + 1] : null;
    $nextDate = ($currentIndex !== false && $currentIndex > 0) ? 
        $dashboardData['availableDates'][$currentIndex - 1] : null;
    
    // Format selected date for display
    $formattedDate = date('F j, Y', strtotime($dashboardData['selectedDate']));
    
    return [
        'currentIndex' => $currentIndex !== false ? $currentIndex : 0,
        'prevDate' => $prevDate,
        'nextDate' => $nextDate,
        'formattedDate' => $formattedDate
    ];
}
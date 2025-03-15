<?php
// Enable error reporting for debugging
ini_set('display_errors', 1);
error_reporting(E_ALL);

require_once '../../loved_tracks.php';
require_once '../../config.php';
require_once 'auth.php';
require_once '../../includes/analytics/dashboard_functions.php';

// Disable caching for dashboard
header("Cache-Control: no-store, no-cache, must-revalidate, max-age=0");
header("Cache-Control: post-check=0, pre-check=0", false);
header("Pragma: no-cache");

// Handle authentication (login, logout)
$authorized = handleAuthentication();

// Check SQLite availability and initialize data
$dashboardData = initializeDashboardData();

// Render appropriate template based on authorization status
if ($authorized) {
    include '../../includes/analytics/templates/dashboard.php';
} else {
    include '../../includes/analytics/templates/login.php';
}
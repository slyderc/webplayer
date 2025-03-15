<?php
/**
 * Redirect to the new hourly data API location
 * This file maintains backward compatibility with existing AJAX calls
 */

// Redirect to the new hourly data location
header('Location: analytics/hourly_data.php' . ($_SERVER['QUERY_STRING'] ? '?' . $_SERVER['QUERY_STRING'] : ''));
exit;
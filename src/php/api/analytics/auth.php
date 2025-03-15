<?php
/**
 * Authentication handler for the analytics dashboard
 */

// Authentication credentials should be set in auth_config.php
// which is not checked into version control
if (file_exists(__DIR__ . '/auth_config.php')) {
    require_once __DIR__ . '/auth_config.php';
} else {
    // Default placeholders - must be replaced in production
    define('AUTH_USERNAME', 'change_me');
    define('AUTH_PASSWORD_HASH', 'change_me');
}

// Session timeout settings (1 hour)
define('SESSION_LIFETIME', 3600); // 1 hour in seconds

/**
 * Initiates a secure session with proper settings
 */
function initSecureSession() {
    // Set secure session parameters
    ini_set('session.use_strict_mode', 1);
    ini_set('session.use_only_cookies', 1);
    ini_set('session.use_trans_sid', 0);
    ini_set('session.cookie_httponly', 1);
    
    if (isset($_SERVER['HTTPS']) && $_SERVER['HTTPS'] === 'on') {
        ini_set('session.cookie_secure', 1);
    }
    
    // Start the session
    if (session_status() === PHP_SESSION_NONE) {
        session_start();
    }
}

/**
 * Checks if a user is authenticated
 */
function isAuthenticated() {
    initSecureSession();
    
    // Check if the user is logged in and session hasn't expired
    if (isset($_SESSION['auth_user']) && 
        $_SESSION['auth_user'] === AUTH_USERNAME && 
        isset($_SESSION['auth_time'])) {
        
        // Check if session has expired (1 hour)
        $elapsed = time() - $_SESSION['auth_time'];
        if ($elapsed < SESSION_LIFETIME) {
            // Renew the session timer on activity
            $_SESSION['auth_time'] = time();
            return true;
        } else {
            // Session expired
            logout();
            return false;
        }
    }
    
    return false;
}

/**
 * Attempts to log in with given credentials
 */
function login($username, $password) {
    if ($username === AUTH_USERNAME && password_verify($password, AUTH_PASSWORD_HASH)) {
        initSecureSession();
        
        // Set authentication session data
        $_SESSION['auth_user'] = $username;
        $_SESSION['auth_time'] = time();
        
        // Regenerate session ID to prevent session fixation
        session_regenerate_id(true);
        
        return true;
    }
    
    return false;
}

/**
 * Logs the user out
 */
function logout() {
    initSecureSession();
    
    // Clear authentication data
    unset($_SESSION['auth_user']);
    unset($_SESSION['auth_time']);
    
    // Destroy the session
    session_destroy();
    
    // Clear session cookie
    if (ini_get("session.use_cookies")) {
        $params = session_get_cookie_params();
        setcookie(session_name(), '', time() - 42000,
            $params["path"], $params["domain"],
            $params["secure"], $params["httponly"]
        );
    }
}
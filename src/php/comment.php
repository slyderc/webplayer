<?php
// Basic form handler for contact messages
session_start();

// Set content type to JSON
header('Content-Type: application/json');

// Prevent direct URL access
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    header('HTTP/1.1 403 Forbidden');
    echo json_encode(['success' => false, 'message' => 'Forbidden']);
    exit;
}

// CSRF protection - verify token
if (!isset($_POST['csrf_token']) || !isset($_SESSION['csrf_token']) || $_POST['csrf_token'] !== $_SESSION['csrf_token']) {
    echo json_encode(['success' => false, 'message' => 'Security verification failed. Please refresh the page and try again.']);
    exit;
}

// Get form data
$name = $_POST['name'] ?? '';
$email = $_POST['email'] ?? '';
$message = $_POST['message'] ?? '';

// Honeypot check - if this field is filled, it's likely a bot
if (!empty($_POST['website'])) {
    // Silently fail - don't let bots know why they failed
    echo json_encode(['success' => true, 'message' => 'Message received']);
    exit;
}

// Simple rate limiting based on IP and session
$ip = $_SERVER['REMOTE_ADDR'];
$now = time();
$timeout = 600; // 10 minute timeout between submissions

// Check session-based rate limiting
if (isset($_SESSION['last_submission_time']) && 
    ($now - $_SESSION['last_submission_time']) < $timeout) {
    header('HTTP/1.1 429 Too Many Requests');
    echo json_encode([
        'success' => false, 
        'message' => 'Please wait before submitting another message.'
    ]);
    exit;
}

// Store submission time for rate limiting
$_SESSION['last_submission_time'] = $now;

// Validate inputs thoroughly
if (empty($name) || empty($email) || empty($message)) {
    echo json_encode(['success' => false, 'message' => 'All fields are required']);
    exit;
}

// Email validation
if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
    echo json_encode(['success' => false, 'message' => 'Invalid email format']);
    exit;
}

// Length limits to prevent abuse
if (strlen($name) > 100 || strlen($email) > 100 || strlen($message) > 2000) {
    echo json_encode(['success' => false, 'message' => 'Message too long']);
    exit;
}

// Basic content filtering (prevent common spam patterns)
$spam_patterns = [
    '/\b(viagra|cialis|poker|casino|lottery|payday|loan)\b/i',
    '/\b(to\.?day|best\.?price)\b/i',
    '/\b(http|www\.)\b/i'
];

foreach ($spam_patterns as $pattern) {
    if (preg_match($pattern, $message) || preg_match($pattern, $name)) {
        // Silently reject but respond with success to confuse bots
        echo json_encode(['success' => true, 'message' => 'Message received']);
        exit;
    }
}

// Validate inputs (basic validation)
if (empty($name) || empty($email) || empty($message)) {
    echo json_encode(['success' => false, 'message' => 'All fields are required']);
    exit;
}

if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
    echo json_encode(['success' => false, 'message' => 'Invalid email format']);
    exit;
}

try {
    // Store message (example: save to a file)
    $timestamp = date('Y-m-d H:i:s');
    $messageData = "Time: $timestamp\nName: $name\nEmail: $email\nMessage: $message\n\n";

    // Create a messages directory if it doesn't exist
    $dir = __DIR__ . '/messages';
    if (!is_dir($dir)) {
        mkdir($dir, 0755, true);
    }

    // Save to file
    $filename = $dir . '/messages_' . date('Y-m-d') . '.txt';
    file_put_contents($filename, $messageData, FILE_APPEND);

    // Return success
    echo json_encode(['success' => true, 'message' => 'Message sent successfully']);
} catch (Exception $e) {
    // Log the error (in a production environment)
    error_log('Error saving message: ' . $e->getMessage());
    
    // Return error
    echo json_encode(['success' => false, 'message' => 'Could not save your message']);
}
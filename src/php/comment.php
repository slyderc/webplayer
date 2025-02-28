<?php
// Basic form handler for contact messages

// Prevent direct access to this file
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    header('Location: /');
    exit;
}

// Set content type to JSON
header('Content-Type: application/json');

// Get form data
$name = $_POST['name'] ?? '';
$email = $_POST['email'] ?? '';
$message = $_POST['message'] ?? '';

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
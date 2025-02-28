<?php
// Basic form handler for contact messages

// Prevent direct access to this file
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    header('Location: /');
    exit;
}

// Get form data
$name = $_POST['name'] ?? '';
$email = $_POST['email'] ?? '';
$message = $_POST['message'] ?? '';

// Validate inputs (basic validation)
if (empty($name) || empty($email) || empty($message)) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'All fields are required']);
    exit;
}

if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Invalid email format']);
    exit;
}

// Store message (example: save to a file)
// In a production environment, you might want to use a database instead
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

// Send an email notification (you'll need to configure your server's mail settings)
// $to = 'your-email@example.com';
// $subject = 'New message from Now Wave Radio';
// $headers = "From: $email\r\n";
// mail($to, $subject, $message, $headers);

// Return success
header('Content-Type: application/json');
echo json_encode(['success' => true, 'message' => 'Message sent successfully']);

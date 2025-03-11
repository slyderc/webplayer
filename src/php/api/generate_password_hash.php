<?php
// This is a utility script to generate secure password hashes
// It should be removed from the server after use

// Basic security to prevent running this script on production
if (!isset($_GET['local']) || $_GET['local'] !== 'true') {
    die('This script should only be run locally. Add ?local=true to the URL if you are running it locally.');
}

// Check if a password was provided
$password = $_POST['password'] ?? '';
$hash = '';

if ($password) {
    $hash = password_hash($password, PASSWORD_BCRYPT);
}
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Password Hash Generator</title>
    <style>
        body {
            font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            line-height: 1.6;
            max-width: 800px;
            margin: 0 auto;
            padding: 20px;
        }
        .container {
            background: #f5f5f5;
            padding: 20px;
            border-radius: 8px;
            margin: 30px 0;
        }
        h1 { color: #333; }
        pre {
            background: #fff;
            padding: 15px;
            border-radius: 4px;
            border: 1px solid #ddd;
            overflow-x: auto;
        }
        .warning {
            background: #fff3cd;
            border: 1px solid #ffecb5;
            color: #856404;
            padding: 15px;
            border-radius: 4px;
            margin-bottom: 20px;
        }
        form { margin: 20px 0; }
        input[type="password"] {
            padding: 8px;
            width: 100%;
            margin-bottom: 10px;
            border: 1px solid #ddd;
            border-radius: 4px;
        }
        button {
            padding: 8px 16px;
            background: #4CAF50;
            color: white;
            border: none;
            border-radius: 4px;
            cursor: pointer;
        }
        button:hover { background: #45a049; }
    </style>
</head>
<body>
    <h1>Password Hash Generator</h1>
    
    <div class="warning">
        <strong>Warning:</strong> This script is for local use only. Remove it from your server after use.
    </div>
    
    <div class="container">
        <h2>Generate a password hash</h2>
        <form method="post" action="">
            <div>
                <label for="password">Enter password to hash:</label>
                <input type="password" id="password" name="password" required>
            </div>
            <button type="submit">Generate Hash</button>
        </form>
        
        <?php if ($hash): ?>
        <h3>Generated Hash:</h3>
        <pre><?php echo htmlspecialchars($hash); ?></pre>
        
        <h3>Usage Instructions:</h3>
        <ol>
            <li>Copy the hash above</li>
            <li>Open auth_config.php</li>
            <li>Replace the placeholder hash with your generated hash</li>
            <li>Save the file</li>
        </ol>
        <?php endif; ?>
    </div>
</body>
</html>
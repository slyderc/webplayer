# Analytics Dashboard Setup

This document explains how to securely set up authentication for the analytics dashboard.

## Security Setup

For security reasons, actual authentication credentials are not stored in the codebase. Follow these steps to set up authentication:

1. Copy the example configuration file:
   ```
   cp auth_config.php.example auth_config.php
   ```

2. Generate a secure password hash:
   - Navigate to `/webplayer/php/api/generate_password_hash.php?local=true` in your browser
   - Enter your desired password and click "Generate Hash"
   - Copy the generated hash

3. Edit `auth_config.php` and replace:
   - The username (default is 'admin')
   - The password hash placeholder with your generated hash

4. Set proper permissions:
   ```
   chmod 600 auth_config.php  # Ensure only the web server can read it
   ```

5. **IMPORTANT**: Remove or restrict access to the hash generator:
   ```
   rm generate_password_hash.php  # Remove it completely
   ```
   
## Usage

- The dashboard is accessible at `/webplayer/php/api/analytics_dashboard.php`
- Login with your configured username and password
- Sessions expire after 1 hour of inactivity for security
- Click "Logout" when finished to invalidate your session

## Security Features

- Passwords are never stored in plain text
- BCrypt password hashing with secure work factor
- HTTP-only cookies for session management
- Automatic session expiration after 1 hour
- Protection against session fixation attacks
- Secure file access controls via .htaccess
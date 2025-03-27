# WebPlayer Development Guide

## Project Overview
The webplayer is a feature-rich HTML5 audio streaming platform that provides live radio playback, track metadata display, favorites, sharing, and embedding capabilities. It's built with a modular JavaScript architecture and PHP backend.

## Build & Run Commands
- Start development server: `docker-compose up`
- Access app: http://localhost:8080/webplayer
- Run composer install: `docker-compose exec php composer install`
- Clear loved tracks history (test): `node teststubs/clearLovedHistory.js`
- View liked tracks in console: `node teststubs/console-LikedTracks.js`

## Project Setup
1. Clone the repository
2. Copy configuration files:
   - `cp src/php/config.php.example src/php/config.php`
   - `cp src/php/api/auth_config.php.example src/php/api/auth_config.php`
3. Generate password hash for admin access: `php src/php/api/generate_password_hash.php`
4. Start the development server: `docker-compose up`

## Architecture
The webplayer follows a modular architecture organized into:

### Services (Core Functionality)
- **AudioService**: Handles streaming with Howler.js, buffering, error handling
- **MetadataService**: Retrieves and processes track metadata
- **StorageService**: Manages persistent local storage
- **AnalyticsService**: Tracks anonymous user interactions

### Managers (UI and Business Logic)
- **TrackManager**: Manages track history and metadata display
- **LikeManager**: Handles track favorites/likes
- **ShareManager**: Provides track sharing functionality
- **ViewManager**: Controls different view tabs
- **UIManager**: Handles UI updates and references
- **BackgroundManager**: Controls background imagery
- **MixcloudManager**: Manages archived show integration
- **GDPRManager**: Handles consent for data collection
- **ScheduleManager**: Displays schedule information

## Data Management
- **Client-side**: LocalStorage via StorageService
- **Server-side**: SQLite database with tables for tracks and user actions
- **API Endpoints**:
  - `/player/publish/playlist.json`: Current track info
  - `/player/publish/history.json`: Recent track history
  - `/webplayer/php/api/track_analytics.php`: Analytics tracking

## Embedding Features
The player provides embeddable components:

1. **Live Now Playing**:
   ```html
   <iframe src="https://example.com/embed.php?mode=live" 
           style="width:300px;height:380px;max-width:100%;border:none;">
   </iframe>
   ```

2. **Recent Tracks**:
   ```html
   <iframe src="https://example.com/embed.php?mode=recent&limit=5" 
           style="width:400px;height:400px;max-width:100%;border:none;">
   </iframe>
   ```

**Customization Parameters**:
- `mode`: `live` or `recent`
- `theme`: `light`, `dark`, or `auto`
- `compact`: `1` for smaller layout
- `limit`: Number of tracks (1-10) for recent mode

## Configuration Options
Edit `src/php/config.php` to configure:

- **Audio Settings**:
  - `streamUrl`: Audio stream URL
  - `metadataUrl`: Track metadata source
  - `defaultVolume`: Initial volume (0.0-1.0)
  - `pollInterval`: Metadata refresh rate (ms)

- **Display Defaults**:
  - `defaultArtwork`: Fallback artwork path
  - `defaultTitle`, `defaultArtist`: Default track info
  - `defaultProgram`, `defaultPresenter`: Default show info

- **Analytics**:
  - `analyticsEndpoint`: Path to analytics API
  - `umamiEnabled`: Toggle for Umami analytics
  - `umamiWebsiteId`: Umami website ID
  - `umamiScriptUrl`: Umami script URL

## Analytics
- Basic analytics stores play, stop, like, and unlike events in SQLite
- Optional Umami integration for more detailed analytics
- Admin dashboard available at `/webplayer/php/api/analytics_dashboard.php`

## Code Style Guidelines
- **JavaScript**:
  - ES6 class-based architecture with modules
  - camelCase for variables and methods
  - Classes organized into managers/ and services/
  - Arrow functions for callbacks
  - Document complex methods with JSDoc comments

- **PHP**:
  - PSR-4 autoloading (Vibe namespace)
  - PHP 8.2+ features preferred

- **CSS**:
  - BEM-like naming (component-element--modifier)
  - Mobile-first responsive design
  - Custom properties for theming

## Project Structure
- **Front-end**: Modular JS with manager/service pattern
  - `src/js/app.js`: Application entry point
  - `src/js/player.js`: Core player functionality
  - `src/js/managers/`: UI components and business logic
  - `src/js/services/`: Core services (audio, metadata, storage)
  
- **Backend**:
  - `src/php/`: Main PHP endpoints
  - `src/php/api/`: Analytics and admin functionality
  - `src/php/data/`: Database storage location

- **Development Environment**:
  - Docker: PHP 8.2-FPM + Nginx for local development
  - `nginx.conf`: Web server configuration
  - `php.ini`: PHP configuration
  
## Testing
- Basic tests available in `src/tests/`
- Test runner: `src/tests/runner.html`
- Service tests for metadata and storage services

## Common Tasks
- **Adding a new manager**: Create new class in `src/js/managers/`
- **Modifying embed behavior**: Update `src/js/embed.js` and related files
- **Changing UI elements**: Modify `src/css/player.css` for styling
- **Adding analytics events**: Update `src/js/services/analytics-service.js`

## Code Cleanup Guidelines

The following areas should be addressed during code cleanup:

1. **Console Logs**:
   - Remove all debugging console.log statements in production
   - Replace with a proper logging system with configurable levels
   - Key files with excessive logging: player.js, audio-service.js, embed.js

2. **Unused Methods**:
   - AudioService: `toggle()` method is defined but never called
   - LikeManager: Reference to undefined variable `url` in getArtworkUrl() function

3. **Redundant Logging**:
   - BackgroundManager: Simplify multiple background update logs
   - Player.js: Remove excessive object dumps in console.logs

4. **Error Handling**:
   - Standardize error handling across all components
   - Add appropriate fallback behavior for all error conditions

5. **Development/Production Modes**:
   - Add environment detection to automatically disable logging in production
   - Only show detailed errors in development mode

6. **Code Style Consistency**:
   - Use consistent error handling patterns across components
   - Standardize the pattern for event listeners across all components

7. **Bug Fixes**:
   - LikeManager: Fix incorrect variable `url` in getArtworkUrl method
   - Ensure all class methods use proper error handling
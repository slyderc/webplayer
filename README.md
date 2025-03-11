### Home Screen (Initial Page Load)
- **Album Artwork:**
  - Displays the cover art for the currently playing track.
  - Supports high-resolution artwork with fallback options.
  - Artwork can be zoomed in for detailed viewing.
- **Song Metadata:**
  - Shows the track title and artist name.
  - Displays program and presenter information when available.
- **Play/Stop Button:**
  - Central control for starting and stopping the audio stream.
  - Visual feedback of play state.
- **"Love" Button (Heart Icon):**
  - Located to the left of the Play/Stop button.
  - Allows listeners to "love" (favorite) playing tracks.
  - **Persistence:** The "loved" status is saved and persists across page loads for the listener.
- **Share Button:**
  - Located to the left of the Love button.
  - Opens a modal with multiple sharing options.
  - Supports social media, messaging apps, and direct copy.

### Navigation Tabs (Located at the Bottom)
- **Live:**
  - Access the live streaming view with current track information.
  - Dynamic background that changes based on current artwork.
- **Schedule:**
  - Displays upcoming show times and details.
  - Highlights currently airing program.
  - Shows scheduled programs for the week ahead.
- **Catch Up:**
  - Lists past show recordings available on Mixcloud.
- **Recent:**
  - Shows history of recently played tracks.
  - Includes artwork, artist, and title information.
  - Provides like and share functionality for each track.
- **Favorites:**
  - Shows a list of the listener's favorited/loved tracks.
  - Allows unlove/removal directly from the list.
  - Includes share options for favorite tracks.

### Sharing & Social Features
- **Multi-platform Sharing:**
  - Integration with Twitter/X, Facebook, Instagram, BlueSky.
  - Messaging apps support: WhatsApp, Telegram, SMS.
  - Email sharing with pre-populated content.
  - Copy link functionality with visual feedback.
- **Native Share API Support:**
  - Uses device's native sharing features when available.
  - Supports sharing with artwork on compatible platforms.
- **Customized Share Messages:**
  - Auto-generates appropriate text based on track information.

### Audio Streaming
- **AAC Audio Stream:**
  - Streams audio from [https://streaming.live365.com/a78360_2](https://streaming.live365.com/a78360_2).
  - Ensures high-quality streaming for an optimal listening experience.
- **Playback Controls:**
  - Smooth start/stop transitions.
  - Auto-refreshes metadata when playback resumes.

### Analytics & Station Insights
- **Anonymous Track Analytics:**
  - Records play, stop, like, and unlike events.
  - Provides station operators with popularity metrics.
  - Maintains listener privacy with no personal data collection.
- **Admin Dashboard:**
  - Secure password-protected analytics interface.
  - Shows most popular tracks and listener engagement.
  - Displays daily activity statistics.

### User Interface & Technology
- **Responsive Design:**
  - The layout adapts to various screen sizes—desktop, tablet, and mobile.
  - Simple HTML5 with JavaScript for responsive design.
  - Optimized touch controls for mobile devices.
- **Modern UI Components:**
  - Interactive modal dialogs for sharing and messaging.
  - Smooth animations and transitions between views.
  - Consistent iconography with outlined styling.
- **Technology Stack:**
  - Fully functional on Edge, Chrome, Firefox, and Safari.
  - Docker container running all necessary software (`php:8.2-fpm-alpine`).
  - `nginx`, PHP 8, and FPM server setup for serving the interface.
  - `SQLite3` for analytics and data persistence.
- **Offline Capabilities:**
  - Recently played tracks and favorites available offline.
  - Graceful handling of network interruptions.
- **Browser Compatibility:**
  - Fully functional on Edge, Chrome, Firefox, and Safari.
  - Progressive enhancement for newer browser features.
  - Fallbacks for older browsers while maintaining core functionality.
  - Ultimately could be released as an Android and iPhone app via a "web view" native application.
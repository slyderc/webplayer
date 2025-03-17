# Now Wave Radio Web Player

A modern web player for Now Wave Radio with responsive design and a focus on usability.

## Embeddable Widgets

You can embed specific components of the Now Wave Radio player on your website. These embeds are lightweight, responsive, and require no additional JavaScript on your site.

### Live Now Playing Embed

Embed the currently playing track with album artwork:

```html
<!-- Basic embed with defaults -->
<iframe src="https://nowwave.radio/embed.php?mode=live" 
        style="width:300px;height:380px;max-width:100%;border:none;"
        title="Now Wave Radio - Now Playing">
</iframe>

<!-- Compact embed for sidebars -->
<iframe src="https://nowwave.radio/embed.php?mode=live" 
        style="width:200px;height:250px;max-width:100%;border:none;overflow:hidden;"
        title="Now Wave Radio - Now Playing">
</iframe>

<!-- Full-width responsive embed for mobile -->
<iframe src="https://nowwave.radio/embed.php?mode=live" 
        style="width:100%;height:380px;max-width:500px;border:none;display:block;margin:0 auto;"
        title="Now Wave Radio - Now Playing">
</iframe>
```

The live embed automatically updates when new tracks play without refreshing the page.

### Recent Tracks Embed

Embed a list of recently played tracks:

```html
<!-- Standard 5-track listing -->
<iframe src="https://nowwave.radio/embed.php?mode=recent&limit=5" 
        style="width:400px;height:400px;max-width:100%;border:none;"
        title="Now Wave Radio - Recent Tracks">
</iframe>

<!-- Compact 3-track listing for sidebars -->
<iframe src="https://nowwave.radio/embed.php?mode=recent&limit=3" 
        style="width:300px;height:250px;max-width:100%;border:none;"
        title="Now Wave Radio - Recent Tracks">
</iframe>

<!-- Full history (10 tracks) -->
<iframe src="https://nowwave.radio/embed.php?mode=recent&limit=10" 
        style="width:100%;height:600px;max-width:500px;border:none;display:block;margin:0 auto;"
        title="Now Wave Radio - Recent Tracks History">
</iframe>
```

You can customize the number of tracks displayed with the `limit` parameter (1-10 tracks).

### WordPress Implementation

For WordPress sites, you can add these embeds to your sidebar using the "Custom HTML" widget:

1. Go to Appearance → Widgets
2. Add a "Custom HTML" widget to your sidebar
3. Paste one of the iframe code examples above
4. Save the widget

### Styling Tips

- Both embeds are designed to work with any background color on your site
- The height may need adjustment depending on your site's font sizes and styling
- For the recent tracks embed, allow approximately 80px height per track
- Add `scrolling="no"` to the iframe if you want to disable scrolling

## Features

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
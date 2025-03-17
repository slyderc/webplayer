# Now Wave Radio Embedding Guide

This document provides detailed instructions on how to embed Now Wave Radio components on your website or blog.

## Available Embeds

Now Wave Radio offers two embedding options that you can easily add to any website:

1. **Live Now Playing** - Shows the current track with album artwork
2. **Recent Tracks** - Shows a list of recently played tracks

## Implementation Examples

### Live Now Playing Embed

The live embed displays the current track's album artwork with title and artist information. It automatically updates when a new track starts playing.

#### Basic Implementation

```html
<iframe src="https://nowwave.radio/embed.php?mode=live" 
        style="width:300px;height:380px;max-width:100%;border:none;"
        title="Now Wave Radio - Now Playing">
</iframe>
```

#### Size Variations

**Compact (for sidebars)**
```html
<iframe src="https://nowwave.radio/embed.php?mode=live" 
        style="width:200px;height:250px;max-width:100%;border:none;"
        title="Now Wave Radio - Now Playing">
</iframe>
```

**Responsive (full-width)**
```html
<iframe src="https://nowwave.radio/embed.php?mode=live" 
        style="width:100%;height:380px;max-width:500px;border:none;display:block;margin:0 auto;"
        title="Now Wave Radio - Now Playing">
</iframe>
```

### Recent Tracks Embed

The recent tracks embed shows a list of recently played songs with album artwork, title, artist, and timestamp.

#### Basic Implementation (5 tracks)

```html
<iframe src="https://nowwave.radio/embed.php?mode=recent&limit=5" 
        style="width:400px;height:400px;max-width:100%;border:none;"
        title="Now Wave Radio - Recent Tracks">
</iframe>
```

#### Size and Count Variations

**Compact (3 tracks for sidebars)**
```html
<iframe src="https://nowwave.radio/embed.php?mode=recent&limit=3" 
        style="width:300px;height:250px;max-width:100%;border:none;"
        title="Now Wave Radio - Recent Tracks">
</iframe>
```

**Full History (10 tracks)**
```html
<iframe src="https://nowwave.radio/embed.php?mode=recent&limit=10" 
        style="width:100%;height:600px;max-width:500px;border:none;display:block;margin:0 auto;"
        title="Now Wave Radio - Recent Track History">
</iframe>
```

## URL Parameters

### Live Embed Parameters

| Parameter | Default | Description                           |
|-----------|---------|---------------------------------------|
| `mode`    | `live`  | Set to `live` for the live now playing view |

### Recent Tracks Parameters

| Parameter | Default | Description                                   |
|-----------|---------|-----------------------------------------------|
| `mode`    | `live`  | Set to `recent` for the recent tracks view    |
| `limit`   | `5`     | Number of tracks to display (1-10)            |

## Implementation Tips

### WordPress

1. Go to Appearance → Widgets
2. Add a "Custom HTML" widget to your sidebar or content area
3. Paste one of the iframe code examples
4. Adjust width and height as needed
5. Save the widget

### Squarespace

1. Add a "Code" block to your page
2. Paste one of the iframe code examples
3. Save your changes

### Wix

1. Add an "HTML Code" element to your page
2. Paste one of the iframe code examples
3. Click "Update"

### Height Recommendations

- **Live embed**: 300-400px height recommended
- **Recent tracks**: Approximately 80px per track
  - 3 tracks: ~250px
  - 5 tracks: ~400px
  - 10 tracks: ~600px

## Styling Considerations

- The embeds are designed with transparent backgrounds to match your site
- If your site has a dark theme, the embeds will automatically adjust
- No additional CSS is required on your site
- To disable scrolling, add `scrolling="no"` to the iframe tag

## Technical Notes

- Embeds update automatically without page refreshes
- No JavaScript integration required on your site
- Minimal bandwidth usage
- CORS headers are properly set for cross-domain embedding

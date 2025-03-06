(() => {
  // Get data from localStorage
  const lovedTracks = JSON.parse(localStorage.getItem('lovedTracks') || '[]');
  const lovedTrackDetails = JSON.parse(localStorage.getItem('lovedTrackDetails') || '{}');
  
  // Get base path from global config if available
  const config = window.NWR_CONFIG || {};
  const cachedArtworkPath = config.cachedArtworkPath || '/player/publish/ca/';
  
  // Format output
  console.group('🎵 Loved Tracks Details');
  
  if (lovedTracks.length === 0) {
    console.log('No loved tracks found');
  } else {
    console.log(`Found ${lovedTracks.length} loved tracks`);
    
    Object.entries(lovedTrackDetails).forEach(([trackId, details]) => {
      const hashFilename = details.artwork_hash ? 
        `${cachedArtworkPath}${details.artwork_hash}.jpg` : 
        'No hash available';
      
      console.group(`Track: ${details.artist} - ${details.title}`);
      console.log('ID:', trackId);
      console.log('Artist:', details.artist);
      console.log('Title:', details.title);
      console.log('Original artwork URL:', details.artwork_url || 'Not available');
      console.log('Artwork hash:', details.artwork_hash || 'Not available');
      console.log('Hash-based filename:', hashFilename);
      console.log('Last played:', details.last_played || 'Unknown');
      console.groupEnd();
    });
  }
  
  console.groupEnd();
  
  // Return the raw data for further inspection
  return {
    lovedTracks,
    lovedTrackDetails,
    count: lovedTracks.length
  };
})();


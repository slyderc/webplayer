(() => {
  // Clear loved tracks from localStorage
  localStorage.removeItem('lovedTracks');
  localStorage.removeItem('lovedTrackDetails');
  
  // Reset UI state if player is initialized
  if (window.player) {
    // Reset the love button in the main player UI
    if (window.player.uiManager && window.player.uiManager.elements.loveButton) {
      window.player.uiManager.updateLoveButton(false);
    }
    
    // If on the favorites tab, show the empty state
    if (window.player.viewManager && window.player.viewManager.getCurrentTab() === 'favorites') {
      const favoritesView = window.player.viewManager.views.favorites;
      if (favoritesView) {
        favoritesView.innerHTML = `
          <div class="empty-state">
            <div class="empty-state-icon">❤️</div>
            <h3>No Favorites Yet</h3>
            <p>Click the heart icon next to a track while it's playing to add it to your favorites.</p>
          </div>
        `;
      }
    }
    
    // Reset the trackManager's internal Set
    if (window.player.trackManager) {
      window.player.trackManager.lovedTracks = new Set();
    }
    
    console.log('✅ All loved tracks have been cleared. You can now start fresh with testing!');
  } else {
    // Just clear storage if player isn't available
    console.log('✅ Loved tracks data cleared from localStorage. Refresh the page to reset the UI.');
  }
  
  return true;
})();

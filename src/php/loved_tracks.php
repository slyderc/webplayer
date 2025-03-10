<?php
require_once 'config.php';

class TrackManager {
    private $db;
    
    public function __construct() {
        $this->db = new SQLite3(__DIR__ . '/../../data/tracks.db');
        $this->initDatabase();
    }
    
    private function initDatabase() {
        // Tracks table - store unique track information
        $this->db->exec('
            CREATE TABLE IF NOT EXISTS tracks (
                hash TEXT PRIMARY KEY,
                artist TEXT NOT NULL,
                title TEXT NOT NULL,
                album TEXT,
                first_seen DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        ');
        
        // Actions table - store anonymous events
        $this->db->exec('
            CREATE TABLE IF NOT EXISTS actions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                hash TEXT NOT NULL,
                action_type TEXT NOT NULL,
                timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (hash) REFERENCES tracks(hash)
            )
        ');
    }
    
    /**
     * Add a track to the tracks table if it doesn't exist
     */
    public function addTrack($hash, $artist, $title, $album = null) {
        $stmt = $this->db->prepare('
            INSERT OR IGNORE INTO tracks (hash, artist, title, album)
            VALUES (:hash, :artist, :title, :album)
        ');
        
        $stmt->bindValue(':hash', $hash, SQLITE3_TEXT);
        $stmt->bindValue(':artist', $artist, SQLITE3_TEXT);
        $stmt->bindValue(':title', $title, SQLITE3_TEXT);
        $stmt->bindValue(':album', $album, SQLITE3_TEXT);
        
        return $stmt->execute();
    }
    
    /**
     * Record a track-related action (like, unlike, play, stop)
     */
    public function recordAction($hash, $actionType) {
        $validActions = ['like', 'unlike', 'play', 'stop'];
        
        if (!in_array($actionType, $validActions)) {
            return false;
        }
        
        $stmt = $this->db->prepare('
            INSERT INTO actions (hash, action_type)
            VALUES (:hash, :action_type)
        ');
        
        $stmt->bindValue(':hash', $hash, SQLITE3_TEXT);
        $stmt->bindValue(':action_type', $actionType, SQLITE3_TEXT);
        
        return $stmt->execute();
    }
    
    /**
     * Record a like action
     */
    public function recordLike($hash, $artist, $title, $album = null) {
        // First make sure track exists
        $this->addTrack($hash, $artist, $title, $album);
        
        // Then record the like action
        return $this->recordAction($hash, 'like');
    }
    
    /**
     * Record an unlike action
     */
    public function recordUnlike($hash) {
        return $this->recordAction($hash, 'unlike');
    }
    
    /**
     * Get total likes for a track
     */
    public function getTrackLikes($hash) {
        $stmt = $this->db->prepare('
            SELECT 
                (SELECT COUNT(*) FROM actions WHERE hash = :hash AND action_type = "like") -
                (SELECT COUNT(*) FROM actions WHERE hash = :hash AND action_type = "unlike") AS net_likes
        ');
        
        $stmt->bindValue(':hash', $hash, SQLITE3_TEXT);
        $result = $stmt->execute();
        $row = $result->fetchArray(SQLITE3_ASSOC);
        
        return $row ? max(0, $row['net_likes']) : 0;
    }
    
    /**
     * Get most popular tracks by net likes
     */
    public function getPopularTracks($limit = 10) {
        $stmt = $this->db->prepare('
            SELECT 
                t.hash, 
                t.artist, 
                t.title, 
                t.album,
                COUNT(CASE WHEN a.action_type = "like" THEN 1 END) - 
                COUNT(CASE WHEN a.action_type = "unlike" THEN 1 END) AS net_likes
            FROM 
                tracks t
            LEFT JOIN 
                actions a ON t.hash = a.hash
            GROUP BY 
                t.hash
            HAVING 
                net_likes > 0
            ORDER BY 
                net_likes DESC, t.first_seen DESC
            LIMIT :limit
        ');
        
        $stmt->bindValue(':limit', $limit, SQLITE3_INTEGER);
        $result = $stmt->execute();
        
        $tracks = [];
        while ($row = $result->fetchArray(SQLITE3_ASSOC)) {
            $tracks[] = $row;
        }
        
        return $tracks;
    }
}
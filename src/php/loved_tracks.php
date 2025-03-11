<?php
require_once 'config.php';

class TrackManager {
    private $db;
    
    public function __construct() {
        // Check if SQLite3 is available
        if (!class_exists('SQLite3')) {
            error_log("SQLite3 extension is not installed. Analytics will be disabled.");
            
            // Set a flag indicating we're in fallback mode
            $this->db = null;
            return;
        }
        
        $dbPath = __DIR__ . '/data/tracks.db';
        $dbDir = dirname($dbPath);
        
        // Ensure the directory exists with proper permissions
        if (!file_exists($dbDir)) {
            if (!@mkdir($dbDir, 0777, true)) {
                throw new Exception("Failed to create database directory: {$dbDir}");
            }
            // Set very permissive permissions for shared hosting environments
            @chmod($dbDir, 0777);
        }
        
        // Check if directory is writable
        if (!is_writable($dbDir)) {
            throw new Exception("Database directory is not writable: {$dbDir}");
        }
        
        // If the database file exists, make sure it's writable
        if (file_exists($dbPath) && !is_writable($dbPath)) {
            // Try to make it writable
            @chmod($dbPath, 0666);
            
            if (!is_writable($dbPath)) {
                throw new Exception("Database file exists but is not writable: {$dbPath}");
            }
        }
        
        try {
            // Open with correct permissions and timeout settings for concurrent access
            $this->db = new SQLite3($dbPath);
            $this->db->enableExceptions(true);
            
            // Set busy timeout to 5 seconds to wait for locks to clear
            $this->db->busyTimeout(5000);
            
            // Set journal mode to WAL for better concurrency
            $this->db->exec('PRAGMA journal_mode = WAL;');
            
            // Set synchronous mode to NORMAL for better performance with acceptable safety
            $this->db->exec('PRAGMA synchronous = NORMAL;');
            
            // Create tables if not exists
            $this->initDatabase();
        } catch (Exception $e) {
            throw new Exception("Failed to initialize database: " . $e->getMessage());
        }
    }
    
    private function initDatabase() {
        if ($this->db === null) return;
        
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
        if ($this->db === null) return true;
        
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
        if ($this->db === null) return true;
        
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
        if ($this->db === null) return true;
        
        // First make sure track exists
        $this->addTrack($hash, $artist, $title, $album);
        
        // Then record the like action
        return $this->recordAction($hash, 'like');
    }
    
    /**
     * Record an unlike action
     */
    public function recordUnlike($hash) {
        if ($this->db === null) return true;
        
        return $this->recordAction($hash, 'unlike');
    }
    
    /**
     * Get total likes for a track
     */
    public function getTrackLikes($hash) {
        if ($this->db === null) return 0;
        
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
        if ($this->db === null) return [];
        
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
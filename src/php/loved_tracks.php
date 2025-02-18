<?php
class TrackManager {
    private $db;
    
    public function __construct() {
        $this->db = new SQLite3('tracks.db');
        $this->initDatabase();
    }
    
    private function initDatabase() {
        $this->db->exec('
            CREATE TABLE IF NOT EXISTS loved_tracks (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                track_id TEXT UNIQUE,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        ');
    }
    
    public function loveTrack($trackId) {
        $stmt = $this->db->prepare('INSERT OR IGNORE INTO loved_tracks (track_id) VALUES (:track_id)');
        $stmt->bindValue(':track_id', $trackId, SQLITE3_TEXT);
        return $stmt->execute();
    }
    
    public function unloveTrack($trackId) {
        $stmt = $this->db->prepare('DELETE FROM loved_tracks WHERE track_id = :track_id');
        $stmt->bindValue(':track_id', $trackId, SQLITE3_TEXT);
        return $stmt->execute();
    }
    
    public function getLovedTracks() {
        $result = $this->db->query('SELECT track_id FROM loved_tracks ORDER BY created_at DESC');
        $tracks = [];
        while ($row = $result->fetchArray(SQLITE3_ASSOC)) {
            $tracks[] = $row['track_id'];
        }
        return $tracks;
    }
}
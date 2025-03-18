/**
 * StorageService - Handles local storage operations
 */
class StorageService {
    constructor() {
        this.isAvailable = this._checkStorageAvailability();
    }
    
    _checkStorageAvailability() {
        try {
            const testKey = '__storage_test__';
            localStorage.setItem(testKey, testKey);
            localStorage.removeItem(testKey);
            return true;
        } catch (e) {
            return false;
        }
    }
    
    getItem(key, defaultValue = null) {
        if (!this.isAvailable) return defaultValue;
        
        try {
            const item = localStorage.getItem(key);
            return item ? JSON.parse(item) : defaultValue;
        } catch (e) {
            console.error('Error getting item from storage:', e);
            return defaultValue;
        }
    }
    
    setItem(key, value) {
        if (!this.isAvailable) return false;
        
        try {
            localStorage.setItem(key, JSON.stringify(value));
            return true;
        } catch (e) {
            console.error('Error setting item in storage:', e);
            return false;
        }
    }
    
    removeItem(key) {
        if (!this.isAvailable) return false;
        
        try {
            localStorage.removeItem(key);
            return true;
        } catch (e) {
            console.error('Error removing item from storage:', e);
            return false;
        }
    }
    
    // Aliases for backward compatibility
    get(key, defaultValue = null) {
        return this.getItem(key, defaultValue);
    }
    
    set(key, value) {
        return this.setItem(key, value);
    }
}

// Export as global or module depending on environment
if (typeof module !== 'undefined' && module.exports) {
    module.exports = StorageService;
} else {
    window.StorageService = StorageService;
}


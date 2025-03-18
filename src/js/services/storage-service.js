/**
 * StorageService - Handles local storage operations
 */
class StorageService {
    constructor(options = {}) {
        this.isAvailable = this._checkStorageAvailability();
        this.prefix = options.prefix || '';
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
    
    _getFullKey(key) {
        return this.prefix ? `${this.prefix}${key}` : key;
    }
    
    getItem(key, defaultValue = null) {
        if (!this.isAvailable) return defaultValue;
        
        try {
            const fullKey = this._getFullKey(key);
            const item = localStorage.getItem(fullKey);
            return item ? JSON.parse(item) : defaultValue;
        } catch (e) {
            console.error('Error getting item from storage:', e);
            return defaultValue;
        }
    }
    
    setItem(key, value) {
        if (!this.isAvailable) return false;
        
        try {
            const fullKey = this._getFullKey(key);
            localStorage.setItem(fullKey, JSON.stringify(value));
            return true;
        } catch (e) {
            console.error('Error setting item in storage:', e);
            return false;
        }
    }
    
    removeItem(key) {
        if (!this.isAvailable) return false;
        
        try {
            const fullKey = this._getFullKey(key);
            localStorage.removeItem(fullKey);
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


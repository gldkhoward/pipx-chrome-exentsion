// Storage utility functions

console.log('🔵 PipX: Loading storage utility...');

class SettingsManager {
    constructor() {
      console.log('🔵 PipX: Creating SettingsManager...');
      this.cache = new Map();
      this.listeners = new Set();
    }
  
    // Get settings with defaults
    async get(keys = null) {
      try {
        console.log('🔵 PipX: Getting settings...', keys);
        
        // Check if chrome.storage is available with more robust checking
        if (typeof chrome === 'undefined' || !chrome || !chrome.storage || !chrome.storage.local) {
          console.error('🔴 PipX: chrome.storage.local not available!');
          console.log('🔵 PipX: chrome available:', typeof chrome !== 'undefined');
          console.log('🔵 PipX: chrome.storage available:', typeof chrome?.storage !== 'undefined');
          console.log('🔵 PipX: chrome.storage.local available:', typeof chrome?.storage?.local !== 'undefined');
          return this.mergeWithDefaults({});
        }
        
        const settings = keys 
          ? await chrome.storage.local.get(keys)
          : await chrome.storage.local.get();
        
        console.log('🔵 PipX: Raw settings from storage:', settings);
        
        // Merge with defaults
        const merged = this.mergeWithDefaults(settings);
        console.log('🔵 PipX: Merged settings:', merged);
        return merged;
      } catch (error) {
        console.error('🔴 PipX: Settings get failed, using defaults:', error);
        return this.mergeWithDefaults({});
      }
    }
  
    // Set settings
    async set(settings) {
      try {
        await chrome.storage.local.set(settings);
        this.notifyListeners(settings);
        return true;
      } catch (error) {
        console.error('Settings save failed:', error);
        return false;
      }
    }
  
    // Get a specific setting path (e.g., 'appearance.theme')
    async getSetting(path) {
      const settings = await this.get();
      return this.getNestedValue(settings, path);
    }
  
    // Set a specific setting path
    async setSetting(path, value) {
      const settings = await this.get();
      this.setNestedValue(settings, path, value);
      return await this.set(settings);
    }
  
    // Listen for setting changes
    addListener(callback) {
      this.listeners.add(callback);
      return () => this.listeners.delete(callback);
    }
  
    // Notify all listeners of changes
    notifyListeners(changes) {
      this.listeners.forEach(callback => {
        try {
          callback(changes);
        } catch (error) {
          console.warn('Settings listener error:', error);
        }
      });
    }
  
    // Merge settings with defaults
    mergeWithDefaults(settings) {
      // Check if DEFAULT_SETTINGS is available
      if (typeof DEFAULT_SETTINGS === 'undefined') {
        console.error('🔴 PipX: DEFAULT_SETTINGS not available in mergeWithDefaults');
        return settings; // Return settings as-is if no defaults available
      }
      return this.deepMerge(DEFAULT_SETTINGS, settings);
    }
  
    // Deep merge utility
    deepMerge(target, source) {
      const result = { ...target };
      
      for (const key in source) {
        if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
          result[key] = this.deepMerge(target[key] || {}, source[key]);
        } else {
          result[key] = source[key];
        }
      }
      
      return result;
    }
  
    // Get nested value from object path
    getNestedValue(obj, path) {
      return path.split('.').reduce((current, key) => current?.[key], obj);
    }
  
    // Set nested value in object path
    setNestedValue(obj, path, value) {
      const keys = path.split('.');
      const lastKey = keys.pop();
      const target = keys.reduce((current, key) => {
        if (!current[key] || typeof current[key] !== 'object') {
          current[key] = {};
        }
        return current[key];
      }, obj);
      target[lastKey] = value;
    }
  
    // Reset to defaults
    async reset() {
      try {
        await chrome.storage.local.clear();
        const defaults = { ...DEFAULT_SETTINGS };
        await chrome.storage.local.set(defaults);
        this.notifyListeners(defaults);
        return true;
      } catch (error) {
        console.error('Settings reset failed:', error);
        return false;
      }
    }
  
    // Export settings
    async export() {
      const settings = await this.get();
      return JSON.stringify(settings, null, 2);
    }
  
    // Import settings
    async import(jsonString) {
      try {
        const settings = JSON.parse(jsonString);
        const merged = this.mergeWithDefaults(settings);
        await this.set(merged);
        return true;
      } catch (error) {
        console.error('Settings import failed:', error);
        return false;
      }
    }
  }
  
  // Create global instance
  const settingsManager = new SettingsManager();
  
  // Convenience functions for backward compatibility
  async function getSettings(keys) {
    return await settingsManager.get(keys);
  }
  
  async function setSettings(settings) {
    return await settingsManager.set(settings);
  }
  
  async function getSetting(path) {
    return await settingsManager.getSetting(path);
  }
  
  async function setSetting(path, value) {
    return await settingsManager.setSetting(path, value);
  }
  
  // Listen for storage changes from other contexts
  if (typeof chrome !== 'undefined' && chrome.storage) {
    chrome.storage.onChanged.addListener((changes, namespace) => {
      if (namespace === 'local') {
        const flatChanges = {};
        for (const key in changes) {
          flatChanges[key] = changes[key].newValue;
        }
        settingsManager.notifyListeners(flatChanges);
      }
    });
  }
  
  // Export for use in other modules
  try {
    if (typeof window !== 'undefined') {
      window.settingsManager = settingsManager;
      window.getSettings = getSettings;
      window.setSettings = setSettings;
      window.getSetting = getSetting;
      window.setSetting = setSetting;
      
      console.log('✅ PipX: Storage utility functions exported to window');
      console.log('🔵 PipX: getSettings function available:', typeof window.getSettings === 'function');
    } else {
      console.error('🔴 PipX: window object not available for storage functions');
    }
  } catch (error) {
    console.error('🔴 PipX: Error exporting storage functions:', error);
  }
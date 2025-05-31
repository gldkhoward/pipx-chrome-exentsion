// Enhanced background service worker

// Import constants (Chrome extension context)
importScripts('../utils/constants.js');

class BackgroundManager {
  constructor() {
    this.settings = null;
    this.init();
  }

  async init() {
    await this.loadSettings();
    this.setupEventListeners();
    this.createContextMenus();
    this.updateBadge();
  }

  async loadSettings() {
    try {
      const stored = await chrome.storage.local.get();
      this.settings = this.mergeWithDefaults(stored);
      
      // Ensure settings are saved if this is first run
      if (Object.keys(stored).length === 0) {
        await chrome.storage.local.set(this.settings);
      }
    } catch (error) {
      console.warn('Failed to load settings, using defaults:', error);
      this.settings = { ...DEFAULT_SETTINGS };
    }
  }

  mergeWithDefaults(stored) {
    const merge = (target, source) => {
      const result = { ...target };
      for (const key in source) {
        if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
          result[key] = merge(target[key] || {}, source[key]);
        } else {
          result[key] = source[key];
        }
      }
      return result;
    };
    return merge(DEFAULT_SETTINGS, stored);
  }

  setupEventListeners() {
    // Extension icon click
    chrome.action.onClicked.addListener((tab) => this.handleIconClick(tab));
    
    // Context menu clicks
    chrome.contextMenus.onClicked.addListener((info, tab) => this.handleContextMenu(info, tab));
    
    // Keyboard commands
    chrome.commands.onCommand.addListener((command, tab) => this.handleCommand(command, tab));
    
    // Storage changes
    chrome.storage.onChanged.addListener((changes) => this.handleStorageChange(changes));
    
    // Extension startup
    chrome.runtime.onStartup.addListener(() => this.handleStartup());
    
    // Extension install/update
    chrome.runtime.onInstalled.addListener((details) => this.handleInstall(details));
  }

  async handleIconClick(tab) {
    // If popup is disabled or user preference, trigger PiP directly
    if (!this.settings.core.enableManualPip) return;
    
    try {
      await chrome.scripting.executeScript({
        target: { tabId: tab.id, allFrames: true },
        files: ['content/core/script.js']
      });
    } catch (error) {
      console.warn('Failed to execute PiP script:', error);
    }
  }

  async handleContextMenu(info, tab) {
    const { menuItemId, checked } = info;
    
    switch (menuItemId) {
      case 'toggleAutoPip':
        await this.updateSetting('core.autoPip', checked);
        break;
      case 'toggleKeyboardShortcuts':
        await this.updateSetting('core.keyboardShortcuts', checked);
        break;
      case 'openOptions':
        chrome.runtime.openOptionsPage();
        break;
      case 'testPip':
        await this.handleIconClick(tab);
        break;
    }
  }

  async handleCommand(command, tab) {
    switch (command) {
      case 'toggle_pip':
      case '_execute_action':
        await this.handleIconClick(tab);
        break;
    }
  }

  async handleStorageChange(changes) {
    // Reload settings
    await this.loadSettings();
    
    // Update UI elements
    this.updateBadge();
    this.updateContextMenus();
    this.updateContentScripts();
  }

  handleStartup() {
    this.updateBadge();
    this.updateContentScripts();
  }

  async handleInstall(details) {
    if (details.reason === 'install') {
      // First time install
      await this.loadSettings();
      this.showWelcomeNotification();
    } else if (details.reason === 'update') {
      // Extension updated
      await this.loadSettings();
    }
  }

  async createContextMenus() {
    await chrome.contextMenus.removeAll();
    
    const menus = [
      {
        id: 'toggleAutoPip',
        title: 'Auto Picture-in-Picture',
        type: 'checkbox',
        checked: this.settings.core.autoPip,
        contexts: ['action']
      },
      {
        id: 'toggleKeyboardShortcuts',
        title: 'Keyboard Shortcuts',
        type: 'checkbox',
        checked: this.settings.core.keyboardShortcuts,
        contexts: ['action']
      },
      {
        id: 'separator1',
        type: 'separator',
        contexts: ['action']
      },
      {
        id: 'testPip',
        title: 'Test Picture-in-Picture',
        contexts: ['action']
      },
      {
        id: 'separator2',
        type: 'separator',
        contexts: ['action']
      },
      {
        id: 'openOptions',
        title: 'Settings & Customization',
        contexts: ['action']
      }
    ];

    for (const menu of menus) {
      try {
        await chrome.contextMenus.create(menu);
      } catch (error) {
        console.warn('Failed to create context menu:', menu.id, error);
      }
    }
  }

  async updateContextMenus() {
    try {
      await chrome.contextMenus.update('toggleAutoPip', {
        checked: this.settings.core.autoPip
      });
      await chrome.contextMenus.update('toggleKeyboardShortcuts', {
        checked: this.settings.core.keyboardShortcuts
      });
    } catch (error) {
      console.warn('Failed to update context menus:', error);
    }
  }

  updateBadge() {
    const isActive = this.settings.core.autoPip || 
                     this.settings.core.enableManualPip ||
                     this.settings.sites.youtube.enhancedControls;
    
    chrome.action.setBadgeText({ 
      text: isActive ? '★' : '' 
    });
    
    chrome.action.setBadgeBackgroundColor({ 
      color: this.settings.appearance.theme === 'dark' ? '#8ab4f8' : '#4285f4' 
    });
    
    chrome.action.setBadgeTextColor({ 
      color: '#ffffff' 
    });
    
    const status = isActive ? 'Active' : 'Inactive';
    chrome.action.setTitle({ 
      title: `Enhanced Picture-in-Picture (${status})` 
    });
  }

  async updateContentScripts() {
    // Unregister existing content scripts
    try {
      await chrome.scripting.unregisterContentScripts();
    } catch (error) {
      // Ignore errors if no scripts were registered
    }

    const scripts = [];

    // Auto PiP script
    if (this.settings.core.autoPip) {
      scripts.push({
        id: 'autoPip',
        matches: ['<all_urls>'],
        js: [
          'utils/constants.js',
          'utils/storage.js',
          'content/core/autoPip.js'
        ],
        runAt: 'document_start'
      });
    }

    // Site-specific scripts
    if (this.settings.sites.youtube.enhancedControls) {
      scripts.push({
        id: 'youtube',
        matches: ['*://*.youtube.com/*'],
        js: [
          'utils/constants.js',
          'utils/storage.js',
          'content/site-specific/youtube.js'
        ],
        css: ['assets/themes/default.css'],
        runAt: 'document_idle'
      });
    }

    // Generic enhanced controls
    if (this.settings.sites.generic.enhancedControls) {
      scripts.push({
        id: 'generic',
        matches: ['<all_urls>'],
        excludeMatches: ['*://*.youtube.com/*'],
        js: [
          'utils/constants.js',
          'utils/storage.js',
          'content/site-specific/generic.js'
        ],
        runAt: 'document_idle'
      });
    }

    // Register new scripts
    if (scripts.length > 0) {
      try {
        await chrome.scripting.registerContentScripts(scripts);
      } catch (error) {
        console.warn('Failed to register content scripts:', error);
      }
    }
  }

  async updateSetting(path, value) {
    const keys = path.split('.');
    let current = this.settings;
    
    // Navigate to parent object
    for (let i = 0; i < keys.length - 1; i++) {
      if (!current[keys[i]]) current[keys[i]] = {};
      current = current[keys[i]];
    }
    
    // Update value
    current[keys[keys.length - 1]] = value;
    
    // Save to storage
    await chrome.storage.local.set(this.settings);
  }

  showWelcomeNotification() {
    if (this.settings.core.showNotifications) {
      chrome.notifications?.create({
        type: 'basic',
        iconUrl: 'assets/icons/icon48.png',
        title: 'Enhanced Picture-in-Picture',
        message: 'Extension installed! Right-click the icon to see options.'
      });
    }
  }
}

// Initialize background manager
const backgroundManager = new BackgroundManager();
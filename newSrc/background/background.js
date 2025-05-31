// PipX Background Service Worker - Enhanced Extension Controller

class BackgroundController {
  constructor() {
    this.init();
  }

  init() {
    console.log('🔵 PipX Background: Service worker starting...');
    
    // Extension lifecycle
    chrome.runtime.onInstalled.addListener((details) => {
      this.handleInstall(details);
    });

    chrome.runtime.onStartup.addListener(() => {
      this.handleStartup();
    });

    // Extension icon clicks
    chrome.action.onClicked.addListener((tab) => {
      this.handleIconClick(tab);
    });

    // Keyboard shortcuts
    chrome.commands.onCommand.addListener((command) => {
      this.handleCommand(command);
    });

    // Context menu (future feature)
    this.setupContextMenu();

    console.log('✅ PipX Background: Service worker initialized');
  }

  async handleInstall(details) {
    console.log('🔵 PipX Background: Extension installed/updated', details);
    
    if (details.reason === 'install') {
      // First time installation
      console.log('🎉 Welcome to PipX! First time installation.');
      
      // Set default configuration
      try {
        await chrome.storage.sync.set({
          pipx_config: {
            theme: {
              primaryColor: '#A3E635',
              backgroundColor: '#000000',
              textColor: '#FFFFFF',
            },
            firstRun: true,
            installDate: Date.now(),
          }
        });
        
        // Open options page for first-time setup
        chrome.runtime.openOptionsPage();
        
      } catch (error) {
        console.error('Failed to set initial configuration:', error);
      }
      
    } else if (details.reason === 'update') {
      console.log(`🔄 PipX updated from ${details.previousVersion} to ${chrome.runtime.getManifest().version}`);
      
      // Handle version-specific migrations if needed
      this.handleVersionMigration(details.previousVersion);
    }
  }

  handleStartup() {
    console.log('🔵 PipX Background: Browser startup detected');
    // Perform any startup tasks if needed
  }

  async handleIconClick(tab) {
    console.log('🔵 PipX Background: Extension icon clicked', tab.url);
    
    try {
      // Check if content script is already injected
      const isInjected = await this.checkContentScriptInjection(tab.id);
      
      if (!isInjected) {
        // Inject content script if not present
        await this.injectContentScript(tab.id);
      }
      
      // Send toggle message to content script
      await chrome.tabs.sendMessage(tab.id, {
        action: 'togglePip',
        source: 'icon_click',
        timestamp: Date.now()
      });
      
    } catch (error) {
      console.error('Failed to handle icon click:', error);
      
      // Show notification if content script injection fails
      this.showNotification('PipX Error', 'Unable to activate on this page. Try refreshing the page.');
    }
  }

  async handleCommand(command) {
    console.log('🔵 PipX Background: Keyboard command received:', command);
    
    try {
      const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
      
      if (!activeTab) {
        console.warn('No active tab found for command:', command);
        return;
      }

      switch (command) {
        case '_execute_action':
        case 'toggle_pip':
          await this.handleIconClick(activeTab);
          break;
          
        default:
          console.warn('Unknown command:', command);
      }
      
    } catch (error) {
      console.error('Failed to handle command:', error);
    }
  }

  async checkContentScriptInjection(tabId) {
    try {
      const results = await chrome.scripting.executeScript({
        target: { tabId },
        func: () => {
          return window.pipxContentScriptLoaded === true;
        }
      });
      
      return results[0]?.result === true;
    } catch (error) {
      return false;
    }
  }

  async injectContentScript(tabId) {
    try {
      console.log('🔵 Injecting content script into tab:', tabId);
      
      // Inject CSS first
      await chrome.scripting.insertCSS({
        target: { tabId },
        files: ['content/content.css']
      });
      
      // Then inject JavaScript
      await chrome.scripting.executeScript({
        target: { tabId },
        files: ['content/content.js']
      });
      
      console.log('✅ Content script injected successfully');
      
    } catch (error) {
      console.error('Failed to inject content script:', error);
      throw error;
    }
  }

  async handleVersionMigration(previousVersion) {
    console.log(`🔄 Migrating from version ${previousVersion}`);
    
    try {
      // Get current stored config
      const stored = await chrome.storage.sync.get('pipx_config');
      const config = stored.pipx_config || {};
      
      // Version-specific migrations
      if (this.compareVersions(previousVersion, '2.0.0') < 0) {
        // Migrating to v2.0.0 - new config structure
        console.log('🔄 Migrating to v2.0.0 config structure');
        
        // Add new default settings
        config.version = '2.0.0';
        config.migrationDate = Date.now();
        
        // Save updated config
        await chrome.storage.sync.set({ pipx_config: config });
      }
      
    } catch (error) {
      console.error('Migration failed:', error);
    }
  }

  compareVersions(version1, version2) {
    const v1parts = version1.split('.').map(Number);
    const v2parts = version2.split('.').map(Number);
    
    for (let i = 0; i < Math.max(v1parts.length, v2parts.length); i++) {
      const v1part = v1parts[i] || 0;
      const v2part = v2parts[i] || 0;
      
      if (v1part < v2part) return -1;
      if (v1part > v2part) return 1;
    }
    
    return 0;
  }

  setupContextMenu() {
    // Future feature: Right-click context menu
    // chrome.contextMenus.create({
    //   id: 'pipx-activate',
    //   title: 'Open in Picture-in-Picture',
    //   contexts: ['video']
    // });
  }

  showNotification(title, message) {
    // Show browser notification
    if (chrome.notifications) {
      chrome.notifications.create({
        type: 'basic',
        iconUrl: 'icons/icon48.png',
        title: title,
        message: message
      });
    }
  }

  // Utility method to get extension info
  getExtensionInfo() {
    const manifest = chrome.runtime.getManifest();
    return {
      name: manifest.name,
      version: manifest.version,
      id: chrome.runtime.id
    };
  }
}

// Initialize background controller
const backgroundController = new BackgroundController();

// Export for debugging
self.backgroundController = backgroundController; 
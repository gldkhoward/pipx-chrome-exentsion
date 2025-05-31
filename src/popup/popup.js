// Popup script for PipX extension

class PopupManager {
  constructor() {
    this.currentTab = null;
    this.settings = null;
    this.init();
  }

  async init() {
    await this.loadCurrentTab();
    await this.loadSettings();
    this.setupEventListeners();
    this.updateUI();
    this.updateTabInfo();
  }

  async loadCurrentTab() {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      this.currentTab = tab;
      
      // Check if the current tab is accessible
      if (tab && (tab.url.startsWith('chrome://') || 
                  tab.url.startsWith('chrome-extension://') ||
                  tab.url.startsWith('edge://') ||
                  tab.url.startsWith('about:') ||
                  tab.url.startsWith('moz-extension://'))) {
        console.log('🟡 PipX Popup: Current tab is a restricted page:', tab.url);
        this.currentTab = null; // Don't try to inject scripts
      }
    } catch (error) {
      console.warn('Failed to get current tab:', error);
      this.currentTab = null;
    }
  }

  async loadSettings() {
    try {
      console.log('🔵 PipX Popup: Loading settings...');
      
      const stored = await chrome.storage.local.get();
      console.log('🔵 PipX Popup: Raw stored settings:', stored);
      
      // Merge with defaults
      this.settings = this.mergeWithDefaults(stored);
      console.log('🔵 PipX Popup: Merged settings:', this.settings);
      
      this.updateUI();
      console.log('✅ PipX Popup: Settings loaded and UI updated');
      
    } catch (error) {
      console.error('🔴 PipX Popup: Failed to load settings, using defaults:', error);
      this.settings = { ...DEFAULT_SETTINGS };
      this.updateUI();
    }
  }

  setupEventListeners() {
    // Main PiP control button
    document.getElementById('trigger-pip').addEventListener('click', () => {
      this.triggerPip();
    });

    document.getElementById('exit-pip').addEventListener('click', () => {
      this.exitPip();
    });

    // Quick settings checkboxes
    document.getElementById('auto-pip').addEventListener('change', (e) => {
      this.updateSetting('core.autoPip', e.target.checked);
    });

    document.getElementById('keyboard-shortcuts').addEventListener('change', (e) => {
      this.updateSetting('core.keyboardShortcuts', e.target.checked);
    });

    document.getElementById('notifications').addEventListener('change', (e) => {
      this.updateSetting('core.showNotifications', e.target.checked);
    });

    // Footer buttons
    document.getElementById('open-options').addEventListener('click', () => {
      chrome.runtime.openOptionsPage();
      window.close();
    });

    document.getElementById('test-pip').addEventListener('click', () => {
      this.testPip();
    });

    // Listen for storage changes
    chrome.storage.onChanged.addListener((changes) => {
      this.handleStorageChange(changes);
    });

    // Check PiP status periodically
    this.pipStatusInterval = setInterval(() => {
      this.checkPipStatus();
    }, 1000);
  }

  async triggerPip() {
    if (!this.currentTab) return;

    try {
      // Try to execute PiP script on current tab
      await chrome.scripting.executeScript({
        target: { tabId: this.currentTab.id },
        function: () => {
          // Try different methods to trigger PiP
          if (window.pipManager) {
            return window.pipManager.triggerPip();
          } else if (window.youtubePipManager) {
            return window.youtubePipManager.triggerEnhancedPip();
          } else if (window.genericPipManager) {
            return window.genericPipManager.triggerPip();
          } else {
            // Fallback: find and trigger PiP on any video
            const videos = document.querySelectorAll('video');
            if (videos.length > 0) {
              const video = Array.from(videos).find(v => 
                v.readyState !== 0 && 
                !v.disablePictureInPicture &&
                v.videoWidth > 0 && 
                v.videoHeight > 0
              );
              if (video) {
                return video.requestPictureInPicture();
              }
            }
            throw new Error('No suitable video found');
          }
        }
      });

      this.showStatus('PiP activated', 'success');
      this.updateUI();

    } catch (error) {
      console.warn('PiP activation failed:', error);
      this.showStatus('PiP activation failed', 'error');
    }
  }

  async exitPip() {
    if (!this.currentTab) return;

    try {
      await chrome.scripting.executeScript({
        target: { tabId: this.currentTab.id },
        function: () => {
          if (document.pictureInPictureElement) {
            return document.exitPictureInPicture();
          }
        }
      });

      this.showStatus('PiP deactivated', 'info');
      this.updateUI();

    } catch (error) {
      console.warn('PiP exit failed:', error);
      this.showStatus('Failed to exit PiP', 'error');
    }
  }

  async testPip() {
    if (!this.currentTab) return;

    try {
      console.log('🔵 PipX Popup: Running test on tab:', this.currentTab.url);
      
      // Inject and execute test script
      const result = await chrome.scripting.executeScript({
        target: { tabId: this.currentTab.id },
        function: () => {
          // Test function to check PiP support and video availability
          console.log('🔵 PipX Test: Starting test function...');
          
          const result = {
            pipSupported: 'pictureInPictureEnabled' in document,
            videos: document.querySelectorAll('video').length,
            activeVideos: 0,
            currentlyInPip: !!document.pictureInPictureElement,
            managers: {
              pipManager: !!window.pipManager,
              youtubePipManager: !!window.youtubePipManager,
              genericPipManager: !!window.genericPipManager,
              genericPipManagerDetails: window.genericPipManager ? {
                initialized: window.genericPipManager.initialized,
                skipped: window.genericPipManager.skipped,
                reason: window.genericPipManager.reason,
                hostname: window.genericPipManager.hostname
              } : null
            },
            debug: {
              windowKeys: Object.keys(window).filter(key => key.includes('pip') || key.includes('Manager')),
              getSettingsAvailable: typeof getSettings === 'function',
              storageManagerAvailable: typeof window.settingsManager !== 'undefined',
              constantsLoaded: typeof DEFAULT_SETTINGS !== 'undefined',
              themesLoaded: typeof THEMES !== 'undefined',
              testScriptLoaded: !!window.pipxTestLoaded
            }
          };

          console.log('🔵 PipX Test: Manager states:', result.managers);
          console.log('🔵 PipX Test: Debug info:', result.debug);
          console.log('🔵 PipX Test: Window pip-related keys:', result.debug.windowKeys);

          // Count active videos
          document.querySelectorAll('video').forEach(video => {
            if (video.readyState !== 0 && 
                !video.disablePictureInPicture &&
                video.videoWidth > 0 && 
                video.videoHeight > 0) {
              result.activeVideos++;
            }
          });

          console.log('🔵 PipX Test: Test complete, returning result');
          return result;
        }
      });

      const testResult = result[0].result;
      console.log('🔵 PipX Popup: Test result received:', testResult);
      this.showTestResults(testResult);

    } catch (error) {
      console.error('🔴 PipX Popup: Test failed:', error);
      this.showStatus('Test failed', 'error');
    }
  }

  showTestResults(result) {
    const modal = document.createElement('div');
    modal.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.8);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 10000;
      backdrop-filter: blur(5px);
    `;

    const content = document.createElement('div');
    content.style.cssText = `
      background: white;
      border-radius: 12px;
      padding: 20px;
      max-width: 400px;
      width: 90%;
      max-height: 80vh;
      overflow-y: auto;
      box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
    `;

    const debugInfo = result.debug ? `
      <div style="margin-top: 12px; padding-top: 12px; border-top: 1px solid #e8eaed;">
        <strong>Debug Info:</strong>
      </div>
      <div style="font-size: 12px; color: #666;">
        <div>getSettings Available: ${result.debug.getSettingsAvailable ? '✅' : '❌'}</div>
        <div>Storage Manager: ${result.debug.storageManagerAvailable ? '✅' : '❌'}</div>
        <div>Constants Loaded: ${result.debug.constantsLoaded ? '✅' : '❌'}</div>
        <div>Themes Loaded: ${result.debug.themesLoaded ? '✅' : '❌'}</div>
        <div>Test Script Loaded: ${result.debug.testScriptLoaded ? '✅' : '❌'}</div>
        <div>Window Keys: ${result.debug.windowKeys.join(', ') || 'None'}</div>
      </div>
    ` : '';

    content.innerHTML = `
      <h3 style="margin: 0 0 16px 0; font-size: 18px; color: #3c4043;">Test Results</h3>
      <div style="display: flex; flex-direction: column; gap: 8px; font-size: 14px;">
        <div>PiP Support: ${result.pipSupported ? '✅' : '❌'}</div>
        <div>Total Videos: ${result.videos}</div>
        <div>Active Videos: ${result.activeVideos}</div>
        <div>Currently in PiP: ${result.currentlyInPip ? '✅' : '❌'}</div>
        <div style="margin-top: 8px; padding-top: 8px; border-top: 1px solid #e8eaed;">
          <strong>Extension Status:</strong>
        </div>
        <div>Core Manager: ${result.managers.pipManager ? '✅' : '❌'}</div>
        <div>YouTube Manager: ${result.managers.youtubePipManager ? '✅' : '❌'}</div>
        <div>Generic Manager: ${result.managers.genericPipManager ? '✅' : '❌'}${
          result.managers.genericPipManagerDetails && result.managers.genericPipManagerDetails.skipped 
            ? ` (skipped: ${result.managers.genericPipManagerDetails.reason})` 
            : ''
        }</div>
        ${debugInfo}
      </div>
      <button id="close-test" style="
        width: 100%;
        margin-top: 16px;
        padding: 10px;
        background: #4285f4;
        color: white;
        border: none;
        border-radius: 8px;
        font-weight: 500;
        cursor: pointer;
      ">Close</button>
    `;

    modal.appendChild(content);
    document.body.appendChild(modal);

    content.querySelector('#close-test').addEventListener('click', () => {
      modal.remove();
    });

    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        modal.remove();
      }
    });
  }

  async updateSetting(path, value) {
    try {
      console.log('🔵 PipX Popup: Updating setting:', path, '=', value);
      console.log('🔵 PipX Popup: Current settings before update:', this.settings);
      
      // Update local settings object
      const keys = path.split('.');
      let current = this.settings;
      
      for (let i = 0; i < keys.length - 1; i++) {
        if (!current[keys[i]]) current[keys[i]] = {};
        current = current[keys[i]];
      }
      
      current[keys[keys.length - 1]] = value;
      
      console.log('🔵 PipX Popup: Settings after local update:', this.settings);
      
      // Save to chrome storage
      await chrome.storage.local.set(this.settings);
      
      console.log('✅ PipX Popup: Settings saved to chrome storage');
      this.showStatus(`Setting updated`, 'success');

    } catch (error) {
      console.error('🔴 PipX Popup: Failed to update setting:', error);
      this.showStatus('Failed to update setting', 'error');
    }
  }

  handleStorageChange(changes) {
    // Update local settings when storage changes
    for (const [key, { newValue }] of Object.entries(changes)) {
      this.settings[key] = newValue;
    }
    
    this.updateUI();
  }

  updateUI() {
    // Update quick settings checkboxes
    const autoPipCheckbox = document.getElementById('auto-pip');
    const keyboardCheckbox = document.getElementById('keyboard-shortcuts');
    const notificationsCheckbox = document.getElementById('notifications');

    if (autoPipCheckbox) {
      autoPipCheckbox.checked = this.settings.core?.autoPip ?? true;
    }
    
    if (keyboardCheckbox) {
      keyboardCheckbox.checked = this.settings.core?.keyboardShortcuts ?? true;
    }
    
    if (notificationsCheckbox) {
      notificationsCheckbox.checked = this.settings.core?.showNotifications ?? true;
    }

    // Update status indicator
    this.updateStatusIndicator();
  }

  updateStatusIndicator() {
    const indicator = document.getElementById('status-indicator');
    const statusText = indicator.querySelector('.status-text');
    
    if (this.settings.core?.autoPip || this.settings.core?.enableManualPip) {
      indicator.className = 'status-indicator active';
      statusText.textContent = 'Active';
    } else {
      indicator.className = 'status-indicator inactive';
      statusText.textContent = 'Inactive';
    }
  }

  async checkPipStatus() {
    if (!this.currentTab) return;

    try {
      const result = await chrome.scripting.executeScript({
        target: { tabId: this.currentTab.id },
        function: () => {
          return {
            inPip: !!document.pictureInPictureElement,
            videoCount: document.querySelectorAll('video').length
          };
        }
      });

      const { inPip, videoCount } = result[0].result;
      
      // Update PiP button visibility
      const triggerBtn = document.getElementById('trigger-pip');
      const exitBtn = document.getElementById('exit-pip');
      
      if (inPip) {
        triggerBtn.style.display = 'none';
        exitBtn.style.display = 'flex';
        
        const indicator = document.getElementById('status-indicator');
        indicator.className = 'status-indicator pip-active';
        indicator.querySelector('.status-text').textContent = 'PiP Active';
      } else {
        triggerBtn.style.display = 'flex';
        exitBtn.style.display = 'none';
        this.updateStatusIndicator();
      }

      // Update video count
      const videoCountElement = document.getElementById('video-count');
      if (videoCountElement) {
        videoCountElement.textContent = videoCount;
      }

    } catch (error) {
      // Tab might not be accessible or script injection failed
      // This is normal for chrome:// pages, etc.
    }
  }

  updateTabInfo() {
    const siteElement = document.getElementById('current-site');
    if (siteElement && this.currentTab) {
      try {
        const url = new URL(this.currentTab.url);
        siteElement.textContent = url.hostname;
      } catch (error) {
        siteElement.textContent = 'Unknown';
      }
    } else if (siteElement) {
      // Handle restricted pages
      siteElement.textContent = 'Restricted Page';
      siteElement.style.color = '#f44336';
      
      // Show message about restricted page
      const pipButton = document.getElementById('trigger-pip');
      if (pipButton) {
        pipButton.disabled = true;
        pipButton.querySelector('.button-text').textContent = 'Not Available on This Page';
        pipButton.style.opacity = '0.5';
      }
    }
  }

  showStatus(message, type = 'info') {
    // Create temporary status message
    const statusElement = document.createElement('div');
    statusElement.style.cssText = `
      position: fixed;
      top: 10px;
      left: 50%;
      transform: translateX(-50%);
      background: ${type === 'success' ? '#4caf50' : type === 'error' ? '#f44336' : '#2196f3'};
      color: white;
      padding: 8px 16px;
      border-radius: 20px;
      font-size: 12px;
      font-weight: 500;
      z-index: 10000;
      opacity: 0;
      transition: opacity 0.3s ease;
    `;
    
    statusElement.textContent = message;
    document.body.appendChild(statusElement);
    
    // Animate in
    requestAnimationFrame(() => {
      statusElement.style.opacity = '1';
    });
    
    // Remove after delay
    setTimeout(() => {
      statusElement.style.opacity = '0';
      setTimeout(() => statusElement.remove(), 300);
    }, 2000);
  }

  mergeWithDefaults(stored) {
    const deepMerge = (target, source) => {
      const result = { ...target };
      
      for (const key in source) {
        if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
          result[key] = deepMerge(target[key] || {}, source[key]);
        } else {
          result[key] = source[key];
        }
      }
      
      return result;
    };
    
    return deepMerge(DEFAULT_SETTINGS, stored);
  }

  cleanup() {
    if (this.pipStatusInterval) {
      clearInterval(this.pipStatusInterval);
    }
  }
}

// Initialize popup when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  const popupManager = new PopupManager();
  
  // Cleanup when popup closes
  window.addEventListener('beforeunload', () => {
    popupManager.cleanup();
  });
}); 
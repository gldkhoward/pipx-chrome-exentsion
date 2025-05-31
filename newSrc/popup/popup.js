// PipX Popup Script - Modern Interface Controller

// Access configuration utilities from global scope
const { ConfigManager, SiteDetector } = window.PipXConfig || {};

class PopupController {
  constructor() {
    this.config = null;
    this.currentTab = null;
    this.siteInfo = null;
    this.init();
  }

  async init() {
    console.log('🔵 PipX Popup: Initializing...');
    
    try {
      // Load configuration
      this.config = await ConfigManager.load();
      
      // Get current tab
      [this.currentTab] = await chrome.tabs.query({ active: true, currentWindow: true });
      
      // Initialize UI
      this.setupEventListeners();
      await this.updateUI();
      
      console.log('✅ PipX Popup: Initialized successfully');
    } catch (error) {
      console.error('❌ PipX Popup: Initialization failed:', error);
      this.showError('Failed to initialize popup');
    }
  }

  setupEventListeners() {
    // Primary action button
    document.getElementById('togglePipBtn').addEventListener('click', () => {
      this.togglePiP();
    });

    // Settings button
    document.getElementById('settingsBtn').addEventListener('click', () => {
      this.openSettings();
    });

    // Options link
    document.getElementById('optionsLink').addEventListener('click', () => {
      this.openOptions();
    });

    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        window.close();
      } else if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        this.togglePiP();
      }
    });
  }

  async updateUI() {
    try {
      // Check API support and site info
      const results = await chrome.scripting.executeScript({
        target: { tabId: this.currentTab.id },
        func: () => {
          // Function to check page info - injected into the page
          const hostname = window.location.hostname.toLowerCase().replace(/^www\./, '');
          const videos = Array.from(document.querySelectorAll('video'));
          
          // Filter valid videos
          const validVideos = videos.filter(video => 
            video.readyState !== 0 && 
            !video.disablePictureInPicture &&
            video.videoWidth > 0 && 
            video.videoHeight > 0
          );

          // Site-specific detection
          const siteConfigs = {
            'youtube.com': { name: 'YouTube', features: ['next', 'previous'] },
            'netflix.com': { name: 'Netflix', features: ['next', 'previous'] },
            'vimeo.com': { name: 'Vimeo', features: [] },
            'twitch.tv': { name: 'Twitch', features: [] },
          };

          const siteConfig = siteConfigs[hostname] || { name: 'Generic Site', features: [] };

          return {
            hasDocumentPip: 'documentPictureInPicture' in window,
            hasStandardPip: 'requestPictureInPicture' in HTMLVideoElement.prototype,
            videoCount: validVideos.length,
            playingVideos: validVideos.filter(v => !v.paused).length,
            site: hostname,
            siteConfig: siteConfig,
            url: window.location.href
          };
        }
      });

      const pageInfo = results[0].result;
      this.siteInfo = pageInfo;

      // Update status indicator
      this.updateStatus(pageInfo);

      // Update site information
      this.updateSiteInfo(pageInfo);

    } catch (error) {
      console.error('Failed to update UI:', error);
      this.showError('Unable to analyze current page');
    }
  }

  updateStatus(pageInfo) {
    const statusDot = document.querySelector('.status-dot');
    const statusText = document.getElementById('statusText');
    const toggleBtn = document.getElementById('togglePipBtn');

    if (pageInfo.hasDocumentPip) {
      statusDot.className = 'status-dot supported';
      statusText.textContent = 'Supported';
      
      if (pageInfo.videoCount > 0) {
        toggleBtn.disabled = false;
        toggleBtn.querySelector('.action-text').textContent = 'Activate PiP';
      } else {
        toggleBtn.disabled = true;
        toggleBtn.querySelector('.action-text').textContent = 'No videos found';
      }
    } else if (pageInfo.hasStandardPip) {
      statusDot.className = 'status-dot warning';
      statusText.textContent = 'Standard PiP only';
      
      if (pageInfo.videoCount > 0) {
        toggleBtn.disabled = false;
        toggleBtn.querySelector('.action-text').textContent = 'Use Standard PiP';
      } else {
        toggleBtn.disabled = true;
        toggleBtn.querySelector('.action-text').textContent = 'No videos found';
      }
    } else {
      statusDot.className = 'status-dot error';
      statusText.textContent = 'PiP not supported';
      toggleBtn.disabled = true;
      toggleBtn.querySelector('.action-text').textContent = 'Not supported';
    }
  }

  updateSiteInfo(pageInfo) {
    const siteName = document.getElementById('siteName');
    const videoCount = document.getElementById('videoCount');

    siteName.textContent = pageInfo.siteConfig.name;
    
    const videoText = pageInfo.videoCount === 1 ? 'video' : 'videos';
    const playingText = pageInfo.playingVideos > 0 ? ` (${pageInfo.playingVideos} playing)` : '';
    videoCount.textContent = `${pageInfo.videoCount} ${videoText}${playingText}`;
  }

  async togglePiP() {
    try {
      const toggleBtn = document.getElementById('togglePipBtn');
      const originalText = toggleBtn.querySelector('.action-text').textContent;
      
      // Show loading state
      toggleBtn.disabled = true;
      toggleBtn.classList.add('loading');
      toggleBtn.querySelector('.action-text').textContent = 'Activating...';

      // Send message to content script
      await chrome.tabs.sendMessage(this.currentTab.id, {
        action: 'togglePip',
        useDocumentPip: this.siteInfo.hasDocumentPip,
        config: this.config
      });

      // Close popup after short delay
      setTimeout(() => {
        window.close();
      }, 500);

    } catch (error) {
      console.error('Failed to toggle PiP:', error);
      
      // Reset button state
      const toggleBtn = document.getElementById('togglePipBtn');
      toggleBtn.disabled = false;
      toggleBtn.classList.remove('loading');
      toggleBtn.querySelector('.action-text').textContent = 'Activate PiP';
      
      this.showError('Failed to activate Picture-in-Picture');
    }
  }

  openSettings() {
    chrome.runtime.openOptionsPage();
    window.close();
  }

  openOptions() {
    chrome.runtime.openOptionsPage();
    window.close();
  }

  showError(message) {
    const statusText = document.getElementById('statusText');
    const statusDot = document.querySelector('.status-dot');
    
    statusDot.className = 'status-dot error';
    statusText.textContent = message;
    
    // Reset after 3 seconds
    setTimeout(() => {
      this.updateUI();
    }, 3000);
  }
}

// Initialize popup when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  new PopupController();
}); 
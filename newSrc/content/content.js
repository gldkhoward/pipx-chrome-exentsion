// PipX Content Script - Enhanced Document Picture-in-Picture Controller

// Mark content script as loaded
window.pipxContentScriptLoaded = true;

// Access configuration utilities from global scope (loaded via utils/config.js)
const { ConfigManager, SiteDetector, IconManager } = window.PipXConfig || {};

class PipXController {
  constructor() {
    this.config = null;
    this.currentVideo = null;
    this.pipWindow = null;
    this.originalParent = null;
    this.originalNextSibling = null;
    this.updateInterval = null;
    this.hideControlsTimeout = null;
    this.siteHandler = null;
    this.siteIntegration = null;
    this.isActive = false;
    
    this.init();
  }

  async init() {
    console.log('🔵 PipX Content: Initializing...');
    
    try {
      // Load configuration
      this.config = await ConfigManager.load();
      
      // Initialize site-specific handler
      this.siteHandler = new SiteHandler();
      
      // Initialize site integration for native controls
      this.siteIntegration = new SiteIntegration(this);
      
      // Setup message listener
      this.setupMessageListener();
      
      // Setup keyboard shortcuts
      this.setupKeyboardShortcuts();
      
      console.log('✅ PipX Content: Initialized successfully');
    } catch (error) {
      console.error('❌ PipX Content: Initialization failed:', error);
    }
  }

  setupMessageListener() {
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      console.log('🔵 PipX Content: Message received:', message);
      
      switch (message.action) {
        case 'togglePip':
          this.togglePiP(message.useDocumentPip, message.config);
          sendResponse({ success: true });
          break;
          
        case 'nextVideo':
          this.siteHandler.nextVideo(message.site);
          sendResponse({ success: true });
          break;
          
        case 'previousVideo':
          this.siteHandler.previousVideo(message.site);
          sendResponse({ success: true });
          break;
          
        default:
          console.warn('Unknown action:', message.action);
          sendResponse({ success: false, error: 'Unknown action' });
      }
    });
  }

  setupKeyboardShortcuts() {
    document.addEventListener('keydown', (e) => {
      // Only handle shortcuts when PiP is not active or when focused on PiP window
      if (this.isActive && this.pipWindow && !this.pipWindow.closed) {
        return; // Let PiP window handle its own shortcuts
      }
      
      if (e.altKey && e.key.toLowerCase() === 'p') {
        e.preventDefault();
        this.togglePiP();
      }
    });
  }

  async togglePiP(useDocumentPip = null, providedConfig = null) {
    try {
      // Update config if provided
      if (providedConfig) {
        this.config = providedConfig;
      }
      
      // Close existing PiP if open
      if (this.isActive && this.pipWindow && !this.pipWindow.closed) {
        this.closePiP();
        return;
      }
      
      // Find best video
      const video = this.findBestVideo();
      if (!video) {
        this.showNotification('❌ No suitable video found on this page');
        return;
      }
      
      // Determine PiP method
      const shouldUseDocumentPip = useDocumentPip !== null ? 
        useDocumentPip : 
        ('documentPictureInPicture' in window);
      
      if (shouldUseDocumentPip) {
        await this.openDocumentPiP(video);
      } else {
        await this.openStandardPiP(video);
      }
      
    } catch (error) {
      console.error('🔴 PipX Content: Toggle PiP failed:', error);
      this.showNotification('❌ Failed to activate Picture-in-Picture: ' + error.message);
    }
  }

  findBestVideo() {
    const videos = Array.from(document.querySelectorAll('video'))
      .filter(video => {
        return video.readyState !== 0 && 
               !video.disablePictureInPicture &&
               video.videoWidth > 0 && 
               video.videoHeight > 0;
      })
      .sort((a, b) => {
        // Prioritize playing videos
        if (a.paused !== b.paused) {
          return a.paused ? 1 : -1;
        }
        
        // Then by size
        const aRect = a.getBoundingClientRect();
        const bRect = b.getBoundingClientRect();
        const aArea = aRect.width * aRect.height;
        const bArea = bRect.width * bRect.height;
        
        return bArea - aArea;
      });
    
    return videos.length > 0 ? videos[0] : null;
  }

  async openDocumentPiP(video) {
    console.log('🔵 Opening Document PiP for video:', video);
    
    // Store original position
    this.originalParent = video.parentElement;
    this.originalNextSibling = video.nextSibling;
    this.currentVideo = video;
    
    // Create Document PiP window
    const windowConfig = {
      width: this.config.window.defaultWidth,
      height: this.config.window.defaultHeight
    };
    
    this.pipWindow = await documentPictureInPicture.requestWindow(windowConfig);
    this.isActive = true;
    
    console.log('✅ Document PiP window created:', this.pipWindow);
    
    // Setup the PiP window
    await this.setupPipWindow(video);
    
    // Move video to PiP window
    this.moveVideoToPip(video);
    
    // Create custom controls
    await this.createCustomControls();
    
    // Setup event listeners
    this.setupPipEventListeners();
    
    // Start update loop
    this.startUpdateLoop();
    
    this.showNotification('🖼️ Document PiP activated');
  }

  async openStandardPiP(video) {
    console.log('🔵 Opening Standard PiP for video:', video);
    
    try {
      this.currentVideo = video;
      await video.requestPictureInPicture();
      this.isActive = true;
      
      this.showNotification('🖼️ Standard PiP activated');
      
      // Listen for PiP exit
      video.addEventListener('leavepictureinpicture', () => {
        this.cleanup();
      });
      
    } catch (error) {
      throw new Error('Standard PiP failed: ' + error.message);
    }
  }

  async setupPipWindow(video) {
    const pipDoc = this.pipWindow.document;
    
    // Set document properties
    pipDoc.title = `PipX - ${document.title}`;
    
    // Create basic structure
    pipDoc.head.innerHTML = `
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>PipX - ${document.title}</title>
    `;
    
    pipDoc.body.innerHTML = `
      <div id="pipx-container">
        <div id="pipx-video-container"></div>
        <div id="pipx-controls" class="pipx-controls">
          <div class="pipx-controls-overlay"></div>
        </div>
      </div>
    `;
    
    // Inject styles
    await this.injectPipStyles();
  }

  async injectPipStyles() {
    const style = this.pipWindow.document.createElement('style');
    style.textContent = `
      :root {
        --primary-color: ${this.config.theme.primaryColor};
        --bg-color: ${this.config.theme.backgroundColor};
        --text-color: ${this.config.theme.textColor};
        --border-radius: ${this.config.theme.borderRadius}px;
        --transition: all ${this.config.theme.animationDuration}ms cubic-bezier(0.4, 0, 0.2, 1);
      }
      
      * {
        margin: 0;
        padding: 0;
        box-sizing: border-box;
      }
      
      body {
        background: var(--bg-color);
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        overflow: hidden;
        user-select: none;
      }
      
      #pipx-container {
        width: 100vw;
        height: 100vh;
        position: relative;
        display: flex;
        flex-direction: column;
      }
      
      #pipx-video-container {
        flex: 1;
        display: flex;
        align-items: center;
        justify-content: center;
        background: var(--bg-color);
      }
      
      video {
        width: 100% !important;
        height: 100% !important;
        object-fit: contain;
        background: var(--bg-color);
      }
      
      .pipx-controls {
        position: absolute;
        bottom: 0;
        left: 0;
        right: 0;
        background: linear-gradient(transparent, rgba(0,0,0,0.8));
        padding: 16px;
        opacity: ${this.config.controls.autoHide ? '0' : '1'};
        transition: var(--transition);
        pointer-events: ${this.config.controls.autoHide ? 'none' : 'auto'};
      }
      
      .pipx-controls.visible {
        opacity: 1;
        pointer-events: auto;
      }
      
      .pipx-controls-overlay {
        display: flex;
        align-items: center;
        gap: 12px;
        background: rgba(0,0,0,0.6);
        backdrop-filter: blur(10px);
        border-radius: var(--border-radius);
        padding: 12px 16px;
      }
      
      .pipx-btn {
        background: transparent;
        border: none;
        color: var(--text-color);
        cursor: pointer;
        padding: 8px;
        border-radius: 6px;
        transition: var(--transition);
        display: flex;
        align-items: center;
        justify-content: center;
        min-width: 36px;
        height: 36px;
        position: relative;
        overflow: hidden;
      }
      
      .pipx-btn:hover {
        background: rgba(255,255,255,0.1);
        transform: scale(1.05);
      }
      
      .pipx-btn:active {
        transform: scale(0.95);
      }
      
      .pipx-btn.primary {
        background: var(--primary-color);
        color: var(--bg-color);
      }
      
      .pipx-btn.primary:hover {
        background: var(--primary-color);
        filter: brightness(1.1);
      }
      
      .pipx-icon {
        width: 20px;
        height: 20px;
        fill: none;
        stroke: currentColor;
        background: none !important;
        border: none !important;
        border-radius: 0 !important;
        display: block;
        flex-shrink: 0;
        box-shadow: none !important;
        outline: none !important;
      }
      
      /* Ensure SVG elements don't have unwanted styling */
      .pipx-icon svg {
        background: transparent !important;
        border: none !important;
        box-shadow: none !important;
      }
      
      .pipx-progress-container {
        flex: 1;
        margin: 0 16px;
        position: relative;
      }
      
      .pipx-progress {
        width: 100%;
        height: 6px;
        background: rgba(255,255,255,0.3);
        border-radius: 3px;
        cursor: pointer;
        position: relative;
        overflow: hidden;
      }
      
      .pipx-progress-bar {
        height: 100%;
        background: var(--primary-color);
        border-radius: 3px;
        width: 0%;
        transition: width 0.1s ease;
      }
      
      .pipx-progress-buffer {
        position: absolute;
        top: 0;
        left: 0;
        height: 100%;
        background: rgba(255,255,255,0.2);
        border-radius: 3px;
        width: 0%;
      }
      
      .pipx-time {
        color: var(--text-color);
        font-size: 12px;
        font-weight: 500;
        min-width: 80px;
        text-align: center;
        font-variant-numeric: tabular-nums;
      }
      
      .pipx-volume-container {
        display: flex;
        align-items: center;
        gap: 8px;
      }
      
      .pipx-volume-slider {
        width: 60px;
        height: 4px;
        background: rgba(255,255,255,0.3);
        border-radius: 2px;
        cursor: pointer;
        position: relative;
      }
      
      .pipx-volume-bar {
        height: 100%;
        background: var(--primary-color);
        border-radius: 2px;
        width: 100%;
        transition: width 0.1s ease;
      }
      
      .pipx-speed-indicator {
        color: var(--text-color);
        font-size: 11px;
        font-weight: 500;
        min-width: 30px;
        text-align: center;
      }
      
      /* Show controls on hover */
      #pipx-container:hover .pipx-controls {
        opacity: 1;
        pointer-events: auto;
      }
      
      /* Site-specific controls */
      .pipx-site-controls {
        display: flex;
        gap: 8px;
        margin-left: 8px;
        padding-left: 8px;
        border-left: 1px solid rgba(255,255,255,0.2);
      }
      
      /* Responsive adjustments */
      @media (max-width: 500px) {
        .pipx-controls-overlay {
          padding: 8px 12px;
          gap: 8px;
        }
        
        .pipx-btn {
          min-width: 32px;
          height: 32px;
          padding: 6px;
        }
        
        .pipx-icon {
          width: 16px;
          height: 16px;
        }
        
        .pipx-progress-container {
          margin: 0 12px;
        }
        
        .pipx-time {
          font-size: 11px;
          min-width: 70px;
        }
      }
    `;
    
    this.pipWindow.document.head.appendChild(style);
  }

  moveVideoToPip(video) {
    const container = this.pipWindow.document.getElementById('pipx-video-container');
    container.appendChild(video);
    console.log('✅ Video moved to PiP window');
  }

  async createCustomControls() {
    const controlsOverlay = this.pipWindow.document.querySelector('.pipx-controls-overlay');
    const siteConfig = SiteDetector.getSiteConfig();
    
    // Main controls
    const mainControls = await this.createMainControls();
    controlsOverlay.appendChild(mainControls);
    
    // Progress bar
    const progressContainer = this.createProgressBar();
    controlsOverlay.appendChild(progressContainer);
    
    // Time display
    const timeDisplay = this.createTimeDisplay();
    controlsOverlay.appendChild(timeDisplay);
    
    // Volume controls
    const volumeControls = await this.createVolumeControls();
    controlsOverlay.appendChild(volumeControls);
    
    // Site-specific controls
    if (siteConfig.features.length > 0) {
      const siteControls = await this.createSiteControls(siteConfig);
      controlsOverlay.appendChild(siteControls);
    }
    
    // Close button
    const closeButton = await this.createCloseButton();
    controlsOverlay.appendChild(closeButton);
    
    // Setup control event listeners
    this.setupControlEventListeners();
  }

  async createMainControls() {
    const container = this.pipWindow.document.createElement('div');
    container.className = 'pipx-main-controls';
    container.style.display = 'flex';
    container.style.gap = '8px';
    
    // Rewind button
    const rewindBtn = await this.createControlButton('rewind', 'Rewind 10s');
    container.appendChild(rewindBtn);
    
    // Play/Pause button
    const playBtn = await this.createControlButton('play', 'Play/Pause', 'primary');
    playBtn.id = 'pipx-play-btn';
    container.appendChild(playBtn);
    
    // Forward button
    const forwardBtn = await this.createControlButton('forward', 'Forward 10s');
    container.appendChild(forwardBtn);
    
    return container;
  }

  async createControlButton(iconName, title, className = '') {
    const button = this.pipWindow.document.createElement('button');
    button.className = `pipx-btn ${className}`;
    button.title = title;
    button.dataset.action = iconName;
    
    const icon = await IconManager.createSVGIcon(iconName, 'pipx-icon');
    if (icon) {
      button.appendChild(icon);
    } else {
      // Fallback text
      const fallbackText = {
        'play': '▶',
        'pause': '⏸',
        'rewind': '⏪',
        'forward': '⏩',
        'skipBack': '⏮',
        'skipForward': '⏭',
        'volumeHigh': '🔊',
        'volumeMuted': '🔇',
        'volumeLow': '🔉',
        'volumeEmpty': '🔈',
        'closeX': '✕'
      };
      button.textContent = fallbackText[iconName] || iconName;
    }
    
    return button;
  }

  createProgressBar() {
    const container = this.pipWindow.document.createElement('div');
    container.className = 'pipx-progress-container';
    
    const progress = this.pipWindow.document.createElement('div');
    progress.className = 'pipx-progress';
    progress.id = 'pipx-progress';
    
    const buffer = this.pipWindow.document.createElement('div');
    buffer.className = 'pipx-progress-buffer';
    buffer.id = 'pipx-progress-buffer';
    
    const bar = this.pipWindow.document.createElement('div');
    bar.className = 'pipx-progress-bar';
    bar.id = 'pipx-progress-bar';
    
    progress.appendChild(buffer);
    progress.appendChild(bar);
    container.appendChild(progress);
    
    return container;
  }

  createTimeDisplay() {
    const time = this.pipWindow.document.createElement('div');
    time.className = 'pipx-time';
    time.id = 'pipx-time';
    time.textContent = '0:00 / 0:00';
    return time;
  }

  async createVolumeControls() {
    const container = this.pipWindow.document.createElement('div');
    container.className = 'pipx-volume-container';
    
    // Volume button
    const volumeBtn = await this.createControlButton('volumeHigh', 'Mute/Unmute');
    volumeBtn.id = 'pipx-volume-btn';
    container.appendChild(volumeBtn);
    
    // Volume slider
    const slider = this.pipWindow.document.createElement('div');
    slider.className = 'pipx-volume-slider';
    slider.id = 'pipx-volume-slider';
    
    const bar = this.pipWindow.document.createElement('div');
    bar.className = 'pipx-volume-bar';
    bar.id = 'pipx-volume-bar';
    
    slider.appendChild(bar);
    container.appendChild(slider);
    
    return container;
  }

  async createSiteControls(siteConfig) {
    const container = this.pipWindow.document.createElement('div');
    container.className = 'pipx-site-controls';
    
    if (siteConfig.features.includes('previous')) {
      const prevBtn = await this.createControlButton('skipBack', 'Previous Episode');
      prevBtn.dataset.action = 'previous';
      container.appendChild(prevBtn);
    }
    
    if (siteConfig.features.includes('next')) {
      const nextBtn = await this.createControlButton('skipForward', 'Next Episode');
      nextBtn.dataset.action = 'next';
      container.appendChild(nextBtn);
    }
    
    return container;
  }

  async createCloseButton() {
    const closeBtn = await this.createControlButton('closeX', 'Close PiP');
    closeBtn.dataset.action = 'close';
    return closeBtn;
  }

  setupControlEventListeners() {
    const pipDoc = this.pipWindow.document;
    const video = this.currentVideo;
    
    // Click-to-pause functionality on video
    const videoContainer = pipDoc.getElementById('pipx-video-container');
    if (videoContainer) {
      videoContainer.addEventListener('click', (e) => {
        // Only trigger if clicking directly on video container or video element
        if (e.target === videoContainer || e.target === video) {
          this.handleControlAction('play'); // This toggles play/pause
        }
      });
      
      // Add cursor pointer to indicate clickability
      videoContainer.style.cursor = 'pointer';
    }
    
    // Button clicks
    pipDoc.addEventListener('click', (e) => {
      const btn = e.target.closest('.pipx-btn');
      if (!btn) return;
      
      const action = btn.dataset.action;
      this.handleControlAction(action);
    });
    
    // Progress bar
    const progress = pipDoc.getElementById('pipx-progress');
    if (progress) {
      progress.addEventListener('click', (e) => {
        const rect = progress.getBoundingClientRect();
        const percent = (e.clientX - rect.left) / rect.width;
        video.currentTime = percent * video.duration;
      });
    }
    
    // Volume slider
    const volumeSlider = pipDoc.getElementById('pipx-volume-slider');
    if (volumeSlider) {
      volumeSlider.addEventListener('click', (e) => {
        const rect = volumeSlider.getBoundingClientRect();
        const percent = (e.clientX - rect.left) / rect.width;
        video.volume = Math.max(0, Math.min(1, percent));
      });
    }
  }

  handleControlAction(action) {
    const video = this.currentVideo;
    
    switch (action) {
      case 'play':
        if (video.paused) {
          video.play();
        } else {
          video.pause();
        }
        break;
        
      case 'rewind':
        video.currentTime = Math.max(0, video.currentTime - 10);
        break;
        
      case 'forward':
        video.currentTime = Math.min(video.duration, video.currentTime + 10);
        break;
        
      case 'volumeHigh':
      case 'volumeMuted':
        video.muted = !video.muted;
        break;
        
      case 'next':
        this.siteHandler.nextVideo();
        break;
        
      case 'previous':
        this.siteHandler.previousVideo();
        break;
        
      case 'close':
        this.closePiP();
        break;
    }
  }

  setupPipEventListeners() {
    // Handle window close
    this.pipWindow.addEventListener('pagehide', () => {
      this.cleanup();
    });
    
    // Handle main page unload
    window.addEventListener('beforeunload', () => {
      if (this.pipWindow && !this.pipWindow.closed) {
        this.pipWindow.close();
      }
    });
    
    // Auto-hide controls
    if (this.config.controls.autoHide) {
      const container = this.pipWindow.document.getElementById('pipx-container');
      const controls = this.pipWindow.document.querySelector('.pipx-controls');
      
      container.addEventListener('mouseenter', () => {
        controls.classList.add('visible');
        this.clearHideControlsTimeout();
      });
      
      container.addEventListener('mouseleave', () => {
        this.scheduleHideControls();
      });
    }
  }

  scheduleHideControls() {
    this.clearHideControlsTimeout();
    this.hideControlsTimeout = setTimeout(() => {
      const controls = this.pipWindow.document.querySelector('.pipx-controls');
      if (controls) {
        controls.classList.remove('visible');
      }
    }, this.config.controls.autoHideDelay);
  }

  clearHideControlsTimeout() {
    if (this.hideControlsTimeout) {
      clearTimeout(this.hideControlsTimeout);
      this.hideControlsTimeout = null;
    }
  }

  startUpdateLoop() {
    this.updateInterval = setInterval(() => {
      this.updateControls();
    }, 200);
  }

  updateControls() {
    if (!this.pipWindow || this.pipWindow.closed || !this.currentVideo) {
      return;
    }
    
    const pipDoc = this.pipWindow.document;
    const video = this.currentVideo;
    
    // Update play/pause button
    const playBtn = pipDoc.getElementById('pipx-play-btn');
    if (playBtn) {
      const icon = playBtn.querySelector('.pipx-icon');
      if (icon) {
        // Update icon based on play state
        this.updatePlayIcon(icon, video.paused);
      }
    }
    
    // Update progress bar
    const progressBar = pipDoc.getElementById('pipx-progress-bar');
    const progressBuffer = pipDoc.getElementById('pipx-progress-buffer');
    if (progressBar && video.duration) {
      const percent = (video.currentTime / video.duration) * 100;
      progressBar.style.width = percent + '%';
      
      // Update buffer
      if (progressBuffer && video.buffered.length > 0) {
        const buffered = video.buffered.end(video.buffered.length - 1);
        const bufferPercent = (buffered / video.duration) * 100;
        progressBuffer.style.width = bufferPercent + '%';
      }
    }
    
    // Update time display
    const timeDisplay = pipDoc.getElementById('pipx-time');
    if (timeDisplay) {
      const current = this.formatTime(video.currentTime);
      const total = this.formatTime(video.duration);
      timeDisplay.textContent = `${current} / ${total}`;
    }
    
    // Update volume
    const volumeBtn = pipDoc.getElementById('pipx-volume-btn');
    const volumeBar = pipDoc.getElementById('pipx-volume-bar');
    
    if (volumeBtn) {
      const icon = volumeBtn.querySelector('.pipx-icon');
      if (icon) {
        this.updateVolumeIcon(icon, video.muted, video.volume);
      }
    }
    
    if (volumeBar) {
      volumeBar.style.width = (video.volume * 100) + '%';
    }
  }

  async updatePlayIcon(iconElement, isPaused) {
    const newIcon = await IconManager.createSVGIcon(isPaused ? 'play' : 'pause', 'pipx-icon');
    if (newIcon) {
      iconElement.replaceWith(newIcon);
    }
  }

  async updateVolumeIcon(iconElement, isMuted, volume) {
    let iconName = 'volumeHigh';
    if (isMuted || volume === 0) {
      iconName = 'volumeMuted';
    } else if (volume < 0.3) {
      iconName = 'volumeEmpty';
    } else if (volume < 0.7) {
      iconName = 'volumeLow';
    }
    
    const newIcon = await IconManager.createSVGIcon(iconName, 'pipx-icon');
    if (newIcon) {
      iconElement.replaceWith(newIcon);
    }
  }

  formatTime(seconds) {
    if (!seconds || isNaN(seconds)) return '0:00';
    
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }

  closePiP() {
    if (this.pipWindow && !this.pipWindow.closed) {
      this.pipWindow.close();
    } else {
      this.cleanup();
    }
  }

  cleanup() {
    console.log('🔵 PipX Content: Cleaning up...');
    
    // Stop update loop
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
    }
    
    // Clear hide controls timeout
    this.clearHideControlsTimeout();
    
    // Move video back to original location
    if (this.currentVideo && this.originalParent) {
      if (this.originalNextSibling) {
        this.originalParent.insertBefore(this.currentVideo, this.originalNextSibling);
      } else {
        this.originalParent.appendChild(this.currentVideo);
      }
      console.log('✅ Video moved back to original location');
    }
    
    // Reset state
    this.currentVideo = null;
    this.pipWindow = null;
    this.originalParent = null;
    this.originalNextSibling = null;
    this.isActive = false;
    
    // Force re-injection of native buttons after PiP close
    if (this.siteIntegration) {
      setTimeout(() => {
        console.log('🔄 Forcing button re-injection after PiP close...');
        this.siteIntegration.forceReinjection();
      }, 1000); // Wait 1 second for the page to settle
    }
    
    this.showNotification('🔄 Picture-in-Picture closed');
  }

  showNotification(message) {
    // Create notification element
    const notification = document.createElement('div');
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: rgba(0,0,0,0.9);
      color: white;
      padding: 12px 20px;
      border-radius: 8px;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      font-size: 14px;
      z-index: 10000;
      opacity: 0;
      transition: opacity 0.3s ease;
      border-left: 4px solid ${this.config.theme.primaryColor};
    `;
    
    notification.textContent = message;
    document.body.appendChild(notification);
    
    // Animate in
    requestAnimationFrame(() => {
      notification.style.opacity = '1';
    });
    
    // Auto remove
    setTimeout(() => {
      notification.style.opacity = '0';
      setTimeout(() => notification.remove(), 300);
    }, 3000);
  }
}

// Site-specific handler
class SiteHandler {
  constructor() {
    this.currentSite = SiteDetector.getCurrentSite();
    this.siteConfig = SiteDetector.getSiteConfig();
  }

  nextVideo() {
    const selector = this.siteConfig.selectors?.nextButton;
    if (selector) {
      const button = document.querySelector(selector);
      if (button) {
        button.click();
        console.log('✅ Next video triggered');
      }
    }
  }

  previousVideo() {
    const selector = this.siteConfig.selectors?.prevButton;
    if (selector) {
      const button = document.querySelector(selector);
      if (button) {
        button.click();
        console.log('✅ Previous video triggered');
      }
    }
  }
}

// Site-specific integration for native controls
class SiteIntegration {
  constructor(pipxController) {
    this.pipxController = pipxController;
    this.currentSite = SiteDetector.getCurrentSite();
    this.siteConfig = SiteDetector.getSiteConfig();
    this.injectedButtons = new Set();
    this.observer = null;
    this.injectionTimeout = null;
    this.lastInjectionAttempt = 0;
    this.injectionCooldown = 2000; // 2 second cooldown between attempts
    this.hasSuccessfulInjection = false; // Track if we've successfully injected
    
    this.init();
  }

  init() {
    console.log('🔵 PipX Site Integration: Initializing for', this.siteConfig.name);
    
    // Start observing for video controls
    this.startObserving();
    
    // Start periodic button check
    this.startPeriodicCheck();
    
    // Initial injection attempt with better timing
    const attemptInjection = () => {
      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
          setTimeout(() => this.debouncedInjectButtons(), 1000);
        });
      } else {
        // Document already loaded, try injection after a delay
        setTimeout(() => this.debouncedInjectButtons(), 1000);
        
        // Also try again after a longer delay for dynamic content
        setTimeout(() => this.debouncedInjectButtons(), 3000);
      }
    };
    
    attemptInjection();
  }

  startObserving() {
    // Wait for document.body to be available
    const startObserver = () => {
      if (!document.body) {
        // If body isn't ready, wait for DOM to load
        if (document.readyState === 'loading') {
          document.addEventListener('DOMContentLoaded', startObserver);
          return;
        } else {
          // Fallback: wait a bit and try again
          setTimeout(startObserver, 100);
          return;
        }
      }
      
      try {
        // Observe DOM changes to catch dynamically loaded video controls
        this.observer = new MutationObserver((mutations) => {
          let shouldInject = false;
          
          mutations.forEach((mutation) => {
            if (mutation.type === 'childList') {
              mutation.addedNodes.forEach((node) => {
                if (node.nodeType === Node.ELEMENT_NODE) {
                  // Skip if this is our own button
                  if (node.classList && node.classList.contains('pipx-native-btn')) {
                    return;
                  }
                  
                  // Skip if this is inside our button
                  if (node.closest && node.closest('.pipx-native-btn')) {
                    return;
                  }
                  
                  // Check if new video controls were added
                  if (this.isVideoControlsElement(node)) {
                    shouldInject = true;
                  }
                }
              });
            }
          });
          
          if (shouldInject) {
            this.debouncedInjectButtons();
          }
        });
        
        this.observer.observe(document.body, {
          childList: true,
          subtree: true
        });
        
        console.log('✅ PipX Site Integration: MutationObserver started');
      } catch (error) {
        console.error('🔴 PipX Site Integration: Failed to start observer:', error);
      }
    };
    
    startObserver();
  }

  debouncedInjectButtons() {
    const now = Date.now();
    
    // Skip if we already have a successful injection for this site
    if (this.hasSuccessfulInjection && this.injectedButtons.size > 0) {
      // Verify buttons still exist
      let buttonsStillExist = true;
      for (const button of this.injectedButtons) {
        if (!button.parentElement || !document.contains(button)) {
          buttonsStillExist = false;
          break;
        }
      }
      
      if (buttonsStillExist) {
        return; // No need to inject again
      } else {
        // Buttons were removed, reset flag
        this.hasSuccessfulInjection = false;
        this.injectedButtons.clear();
        console.log('🔄 PipX: Buttons were removed, will re-inject');
      }
    }
    
    // Check cooldown period
    if (now - this.lastInjectionAttempt < this.injectionCooldown) {
      console.log('🔶 PipX: Injection on cooldown, skipping');
      return;
    }
    
    // Clear any pending injection
    if (this.injectionTimeout) {
      clearTimeout(this.injectionTimeout);
    }
    
    // Schedule injection with debounce
    this.injectionTimeout = setTimeout(() => {
      this.lastInjectionAttempt = Date.now();
      this.injectButtons();
      this.injectionTimeout = null;
    }, 500);
  }

  isVideoControlsElement(element) {
    // More specific selectors to reduce false positives
    const controlSelectors = [
      '.ytp-chrome-controls', // YouTube main controls
      '.ytp-right-controls', // YouTube right controls specifically
      '.player-controls', // Generic
      '.video-controls', // Generic
      '.controls-bar', // Generic
      '[class*="control"][class*="bar"]', // Generic control bars
    ];
    
    // Check if element itself matches
    for (const selector of controlSelectors) {
      if (element.matches && element.matches(selector)) {
        console.log('🔍 PipX: Found matching control element:', selector);
        return true;
      }
    }
    
    // Check if element contains control elements (but be more specific)
    for (const selector of controlSelectors) {
      if (element.querySelector && element.querySelector(selector)) {
        console.log('🔍 PipX: Found control element inside:', selector);
        return true;
      }
    }
    
    return false;
  }

  async injectButtons() {
    try {
      console.log('🔵 PipX Site Integration: Attempting button injection for', this.currentSite);
      
      if (this.currentSite === 'youtube.com') {
        await this.injectYouTubeButton();
      } else {
        await this.injectGenericButton();
      }
    } catch (error) {
      console.error('🔴 PipX Site Integration: Failed to inject buttons:', error);
    }
  }

  async injectYouTubeButton() {
    // YouTube-specific injection next to settings and miniplayer
    const controlsContainer = document.querySelector('.ytp-chrome-controls .ytp-right-controls');
    
    if (!controlsContainer) {
      console.log('🔶 PipX: YouTube controls not found yet');
      return;
    }

    // Check if we already injected here
    const existingButton = controlsContainer.querySelector('.pipx-native-btn');
    if (existingButton) {
      // Mark as successful if button exists
      this.hasSuccessfulInjection = true;
      if (!this.injectedButtons.has(existingButton)) {
        this.injectedButtons.add(existingButton);
      }
      return;
    }

    // Find the settings button to insert before it
    const settingsButton = controlsContainer.querySelector('.ytp-settings-button');
    const miniplayerButton = controlsContainer.querySelector('.ytp-miniplayer-button');
    
    const insertBefore = settingsButton || miniplayerButton || controlsContainer.firstChild;
    
    console.log('🔵 PipX: Creating YouTube button, insert before:', insertBefore?.className);
    
    const pipxButton = await this.createPipXButton();
    
    if (insertBefore) {
      controlsContainer.insertBefore(pipxButton, insertBefore);
    } else {
      controlsContainer.appendChild(pipxButton);
    }
    
    this.injectedButtons.add(pipxButton);
    this.hasSuccessfulInjection = true; // Mark as successful
    this.animateButtonIntro(pipxButton);
    
    console.log('✅ PipX: Injected button into YouTube controls');
  }

  async injectGenericButton() {
    console.log('🔵 PipX: Attempting generic button injection');
    
    // Generic injection - look for fullscreen button and insert before it
    const videos = document.querySelectorAll('video');
    console.log('🔵 PipX: Found', videos.length, 'video elements');
    
    let injectedCount = 0;
    
    for (const video of videos) {
      if (this.shouldInjectForVideo(video)) {
        console.log('🔵 PipX: Video qualifies for injection:', video);
        const success = await this.injectButtonForVideo(video);
        if (success) {
          injectedCount++;
          this.hasSuccessfulInjection = true;
        }
      }
    }
    
    if (injectedCount > 0) {
      console.log(`✅ PipX: Successfully injected ${injectedCount} buttons`);
    }
  }

  shouldInjectForVideo(video) {
    // Only inject for videos that are large enough and ready
    const rect = video.getBoundingClientRect();
    return rect.width > 200 && rect.height > 150 && video.readyState > 0;
  }

  async injectButtonForVideo(video) {
    console.log('🔵 PipX: Injecting button for video:', video);
    
    // Look for controls container near this video
    const controlsSelectors = [
      '.video-controls',
      '.player-controls', 
      '.controls',
      '[class*="control"]'
    ];
    
    let controlsContainer = null;
    
    // First try to find controls as sibling or parent
    let parent = video.parentElement;
    let searchDepth = 0;
    while (parent && parent !== document.body && searchDepth < 5) {
      console.log('🔵 PipX: Searching in parent:', parent.className);
      
      for (const selector of controlsSelectors) {
        controlsContainer = parent.querySelector(selector);
        if (controlsContainer) {
          console.log('🔵 PipX: Found controls container:', controlsContainer.className);
          break;
        }
      }
      if (controlsContainer) break;
      parent = parent.parentElement;
      searchDepth++;
    }
    
    if (!controlsContainer) {
      console.log('🔶 PipX: No controls container found for video');
      return false;
    }

    // Check if we already injected here
    const existingButton = controlsContainer.querySelector('.pipx-native-btn');
    if (existingButton) {
      console.log('🔶 PipX: Button already exists in this container');
      // Add to our tracking if not already there
      if (!this.injectedButtons.has(existingButton)) {
        this.injectedButtons.add(existingButton);
      }
      return true; // Consider this a success
    }

    // Look for fullscreen button to insert before
    const fullscreenSelectors = [
      '[class*="fullscreen"]',
      '[title*="fullscreen" i]',
      '[aria-label*="fullscreen" i]'
    ];
    
    let fullscreenButton = null;
    for (const selector of fullscreenSelectors) {
      fullscreenButton = controlsContainer.querySelector(selector);
      if (fullscreenButton) {
        console.log('🔵 PipX: Found fullscreen button:', fullscreenButton.className);
        break;
      }
    }
    
    const pipxButton = await this.createPipXButton();
    
    if (fullscreenButton) {
      fullscreenButton.parentElement.insertBefore(pipxButton, fullscreenButton);
      console.log('✅ PipX: Inserted button before fullscreen button');
    } else {
      // Append to the end of controls
      controlsContainer.appendChild(pipxButton);
      console.log('✅ PipX: Appended button to end of controls');
    }
    
    this.injectedButtons.add(pipxButton);
    this.animateButtonIntro(pipxButton);
    
    console.log('✅ PipX: Injected button into generic video controls');
    return true;
  }

  async createPipXButton() {
    const button = document.createElement('button');
    button.className = 'pipx-native-btn';
    
    // Add YouTube-specific class if on YouTube
    if (this.currentSite === 'youtube.com') {
      button.className += ' ytp-button';
    }
    
    button.title = 'PipX - Enhanced Picture-in-Picture';
    button.setAttribute('aria-label', 'Open PipX Picture-in-Picture');
    
    try {
      // Load the PiP icon
      const iconSvg = await IconManager.loadIcon('pip');
      if (iconSvg) {
        button.innerHTML = iconSvg;
      } else {
        throw new Error('Failed to load pip icon');
      }
    } catch (error) {
      console.warn('🔶 PipX: Failed to load icon, using fallback:', error);
      // Fallback: create a simple PiP icon using text/symbols
      button.innerHTML = `
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <rect x="2" y="3" width="20" height="14" rx="2" ry="2"/>
          <rect x="8" y="8" width="8" height="6" rx="1" ry="1"/>
        </svg>
      `;
    }
    
    // Add click handler
    button.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      console.log('🔵 PipX: Native button clicked');
      this.pipxController.togglePiP();
    });
    
    // Apply styling
    this.styleNativeButton(button);
    
    return button;
  }

  styleNativeButton(button) {
    // Base styling that works across sites
    button.style.cssText = `
      background: transparent !important;
      border: none !important;
      color: white !important;
      cursor: pointer !important;
      padding: 8px !important;
      margin: 0 4px !important;
      border-radius: 4px !important;
      transition: all 0.3s ease !important;
      display: inline-flex !important;
      align-items: center !important;
      justify-content: center !important;
      min-width: 36px !important;
      height: 36px !important;
      opacity: 0.8 !important;
      position: relative !important;
      z-index: 1000 !important;
    `;
    
    // Style the SVG icon
    const svg = button.querySelector('svg');
    if (svg) {
      svg.style.cssText = `
        width: 20px !important;
        height: 20px !important;
        fill: currentColor !important;
        stroke: currentColor !important;
        pointer-events: none !important;
      `;
    }
    
    // Add hover effects
    button.addEventListener('mouseenter', () => {
      button.style.opacity = '1';
      button.style.background = 'rgba(255, 255, 255, 0.1)';
      button.style.transform = 'scale(1.05)';
    });
    
    button.addEventListener('mouseleave', () => {
      button.style.opacity = '0.8';
      button.style.background = 'transparent';
      button.style.transform = 'scale(1)';
    });
  }

  animateButtonIntro(button) {
    // Initial state - invisible and scaled down
    button.style.opacity = '0';
    button.style.transform = 'scale(0.5)';
    
    // Animate in with glow effect
    setTimeout(() => {
      button.style.transition = 'all 0.6s cubic-bezier(0.34, 1.56, 0.64, 1)';
      button.style.opacity = '0.8';
      button.style.transform = 'scale(1)';
      
      // Add CSS glow animation class
      button.classList.add('pipx-intro-glow');
      
      // Remove glow class after animation
      setTimeout(() => {
        button.style.transition = 'all 0.3s ease';
        button.classList.remove('pipx-intro-glow');
      }, 2000);
    }, 100);
  }

  destroy() {
    console.log('🔵 PipX Site Integration: Destroying...');
    
    if (this.observer) {
      this.observer.disconnect();
      this.observer = null;
    }
    
    // Clear periodic check interval
    if (this.periodicCheckInterval) {
      clearInterval(this.periodicCheckInterval);
      this.periodicCheckInterval = null;
    }
    
    // Clear any pending injection
    if (this.injectionTimeout) {
      clearTimeout(this.injectionTimeout);
      this.injectionTimeout = null;
    }
    
    // Remove all injected buttons
    this.injectedButtons.forEach(button => {
      if (button.parentElement) {
        button.parentElement.removeChild(button);
        console.log('🔄 PipX: Removed injected button');
      }
    });
    
    this.injectedButtons.clear();
    console.log('✅ PipX Site Integration: Cleanup complete');
  }

  forceReinjection() {
    console.log('🔵 PipX Site Integration: Forcing re-injection');
    this.destroy();
    this.init();
  }

  startPeriodicCheck() {
    // Check every 30 seconds to ensure buttons still exist
    this.periodicCheckInterval = setInterval(() => {
      if (this.injectedButtons.size > 0) {
        let buttonsNeedReinject = false;
        
        // Check if any injected buttons are missing
        for (const button of this.injectedButtons) {
          if (!button.parentElement || !document.contains(button)) {
            console.log('🔄 PipX: Periodic check found missing button, will re-inject');
            buttonsNeedReinject = true;
            break;
          }
        }
        
        if (buttonsNeedReinject) {
          this.hasSuccessfulInjection = false;
          this.injectedButtons.clear();
          this.debouncedInjectButtons();
        }
      } else if (!this.hasSuccessfulInjection) {
        // No buttons exist but we should have them, try to inject
        console.log('🔄 PipX: Periodic check found no buttons, attempting injection');
        this.debouncedInjectButtons();
      }
    }, 30000); // Check every 30 seconds
  }
}

// Initialize PipX controller
const pipxController = new PipXController();

// Export for debugging
window.pipxController = pipxController; 
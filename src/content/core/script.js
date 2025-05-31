// Manual Picture-in-Picture trigger script

(function() {
    'use strict';
  
    console.log('🔵 PipX: Loading manual PiP script...');
  
    class ManualPipManager {
      constructor() {
        console.log('🔵 PipX: Creating ManualPipManager...');
        this.currentVideo = null;
        this.pipWindow = null;
        this.keyboardHandler = null;
        this.initialized = false;
        this.settings = null;
        
        // Initialize asynchronously
        this.init();
      }

      async init() {
        try {
          console.log('🔵 PipX: Initializing ManualPipManager...');
          
          // Check if getSettings function exists
          if (typeof getSettings !== 'function') {
            console.error('🔴 PipX: getSettings function not found!');
            this.initialized = false;
            return;
          }
          
          // Get current settings
          this.settings = await getSettings();
          console.log('🔵 PipX: Settings loaded:', this.settings);
          
          if (!this.settings.core.enableManualPip) {
            console.log('🟡 PipX: Manual PiP disabled in settings');
            this.initialized = false;
            return;
          }

          this.createPipButton();
          this.setupKeyboardShortcuts();
          this.setupDoubleClickHandler();
          this.initialized = true;
          console.log('✅ PipX: ManualPipManager initialized successfully');
        } catch (error) {
          console.error('🔴 PipX: Failed to initialize ManualPipManager:', error);
          this.initialized = false;
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
            const aRect = a.getBoundingClientRect();
            const bRect = b.getBoundingClientRect();
            const aArea = aRect.width * aRect.height;
            const bArea = bRect.width * bRect.height;
            
            // Prioritize playing videos
            if (a.paused !== b.paused) {
              return a.paused ? 1 : -1;
            }
            
            // Then by visibility
            const aVisible = this.isElementVisible(a);
            const bVisible = this.isElementVisible(b);
            
            if (aVisible !== bVisible) {
              return aVisible ? -1 : 1;
            }
            
            // Finally by size
            return bArea - aArea;
          });
  
        return videos.length > 0 ? videos[0] : null;
      }
  
      isElementVisible(element) {
        const rect = element.getBoundingClientRect();
        return rect.top >= 0 && 
               rect.left >= 0 && 
               rect.bottom <= window.innerHeight && 
               rect.right <= window.innerWidth &&
               rect.width > 0 && 
               rect.height > 0;
      }
  
      async triggerPip(video = null) {
        if (!this.initialized || !this.settings) {
          console.warn('ManualPipManager not yet initialized');
          return false;
        }
  
        try {
          const targetVideo = video || this.findBestVideo();
          
          if (!targetVideo) {
            this.showNotification('No video found for Picture-in-Picture', 'warning');
            return false;
          }
  
          if (document.pictureInPictureElement) {
            await document.exitPictureInPicture();
            return true;
          }
  
          this.currentVideo = targetVideo;
          this.pipWindow = await targetVideo.requestPictureInPicture();
          
          this.setupPipEventHandlers(targetVideo);
          this.setupPipControls(targetVideo);
          this.showNotification('Picture-in-Picture activated', 'success');
          
          return true;
        } catch (error) {
          console.warn('PiP activation failed:', error);
          this.showNotification('Picture-in-Picture failed to activate', 'error');
          return false;
        }
      }
  
      setupPipEventHandlers(video) {
        const handleLeavePip = () => {
          this.cleanup();
          this.showNotification('Picture-in-Picture deactivated', 'info');
        };
  
        const handleResize = () => {
          // Handle PiP window resize events
          if (this.settings && this.settings.core.showNotifications) {
            console.log('PiP window resized');
          }
        };
  
        video.addEventListener('leavepictureinpicture', handleLeavePip, { once: true });
        
        if (this.pipWindow) {
          this.pipWindow.addEventListener('resize', handleResize);
        }
      }
  
      setupPipControls(video) {
        if (!this.settings || !this.settings.core.keyboardShortcuts) return;
  
        this.keyboardHandler = (e) => {
          if (document.pictureInPictureElement !== video) return;
          
          const preventDefault = () => {
            e.preventDefault();
            e.stopPropagation();
          };
          
          switch(e.key.toLowerCase()) {
            case ' ':
              preventDefault();
              video.paused ? video.play() : video.pause();
              this.showQuickFeedback(video.paused ? '⏸️' : '▶️');
              break;
              
            case 'arrowleft':
              preventDefault();
              video.currentTime = Math.max(0, video.currentTime - 5);
              this.showQuickFeedback('⏪ -5s');
              break;
              
            case 'arrowright':
              preventDefault();
              video.currentTime = Math.min(video.duration, video.currentTime + 5);
              this.showQuickFeedback('⏩ +5s');
              break;
              
            case 'arrowup':
              preventDefault();
              video.volume = Math.min(1, video.volume + 0.05);
              this.showQuickFeedback(`🔊 ${Math.round(video.volume * 100)}%`);
              break;
              
            case 'arrowdown':
              preventDefault();
              video.volume = Math.max(0, video.volume - 0.05);
              this.showQuickFeedback(`🔉 ${Math.round(video.volume * 100)}%`);
              break;
              
            case 'm':
              preventDefault();
              video.muted = !video.muted;
              this.showQuickFeedback(video.muted ? '🔇' : '🔊');
              break;
              
            case 'j':
              preventDefault();
              video.currentTime = Math.max(0, video.currentTime - 10);
              this.showQuickFeedback('⏪ -10s');
              break;
              
            case 'l':
              preventDefault();
              video.currentTime = Math.min(video.duration, video.currentTime + 10);
              this.showQuickFeedback('⏩ +10s');
              break;
              
            case 'k':
              preventDefault();
              video.paused ? video.play() : video.pause();
              this.showQuickFeedback(video.paused ? '⏸️' : '▶️');
              break;
              
            case ',':
              preventDefault();
              video.playbackRate = Math.max(0.25, video.playbackRate - 0.25);
              this.showQuickFeedback(`⏱️ ${video.playbackRate}x`);
              break;
              
            case '.':
              preventDefault();
              video.playbackRate = Math.min(2, video.playbackRate + 0.25);
              this.showQuickFeedback(`⏱️ ${video.playbackRate}x`);
              break;
          }
        };
  
        document.addEventListener('keydown', this.keyboardHandler, true);
      }
  
      createPipButton() {
        if (!this.settings) return;
        
        // Site-specific button injection
        const hostname = window.location.hostname.toLowerCase();
        let targetSelector = null;
        
        if (hostname.includes('youtube.com')) {
          // YouTube already handled by site-specific script
          return;
        } else if (hostname.includes('netflix.com')) {
          targetSelector = '.PlayerControlsNeo__layout';
        } else if (hostname.includes('twitch.tv')) {
          targetSelector = '.player-controls__right-control-group';
        } else if (hostname.includes('vimeo.com')) {
          targetSelector = '.vp-controls';
        } else {
          // Generic video sites
          const videos = document.querySelectorAll('video');
          if (videos.length > 0) {
            // Look for common control containers
            const selectors = [
              '.video-controls',
              '.player-controls', 
              '.controls',
              '.video-player-controls'
            ];
            
            for (const selector of selectors) {
              if (document.querySelector(selector)) {
                targetSelector = selector;
                break;
              }
            }
          }
        }
  
        if (targetSelector) {
          this.injectPipButton(targetSelector);
        }
      }
  
      injectPipButton(targetSelector) {
        // Wait for target element to be available
        const observer = new MutationObserver((mutations, obs) => {
          const target = document.querySelector(targetSelector);
          if (target && !target.querySelector('.pip-extension-button')) {
            this.createButtonElement(target);
            obs.disconnect();
          }
        });
  
        observer.observe(document.body, {
          childList: true,
          subtree: true
        });
  
        // Also try immediately in case element already exists
        const target = document.querySelector(targetSelector);
        if (target && !target.querySelector('.pip-extension-button')) {
          this.createButtonElement(target);
        }
      }
  
      createButtonElement(parent) {
        if (!this.settings) return;
        
        const button = document.createElement('button');
        button.className = 'pip-extension-button';
        button.title = 'Enhanced Picture-in-Picture (Alt+P)';
        button.innerHTML = '🖼️';
        
        const theme = THEMES[this.settings.appearance.theme] || THEMES.default;
        
        button.style.cssText = `
          background: transparent;
          border: none;
          color: ${theme.colors.text};
          cursor: pointer;
          font-size: 16px;
          padding: 8px;
          border-radius: ${theme.styles.borderRadius};
          transition: all 0.2s ease;
          opacity: 0.8;
          margin: 0 4px;
        `;
        
        button.addEventListener('mouseenter', () => {
          button.style.opacity = '1';
          button.style.background = theme.colors.primary + '20';
        });
        
        button.addEventListener('mouseleave', () => {
          button.style.opacity = '0.8';
          button.style.background = 'transparent';
        });
        
        button.addEventListener('click', (e) => {
          e.stopPropagation();
          this.triggerPip();
        });
        
        parent.appendChild(button);
      }
  
      setupDoubleClickHandler() {
        if (!this.settings) return;
        
        document.addEventListener('dblclick', (e) => {
          if (e.target.tagName === 'VIDEO' && this.settings.core.enableManualPip) {
            e.preventDefault();
            this.triggerPip(e.target);
          }
        });
      }
  
      setupKeyboardShortcuts() {
        document.addEventListener('keydown', (e) => {
          // Alt+P shortcut (when not in PiP)
          if (e.altKey && e.key.toLowerCase() === 'p' && !document.pictureInPictureElement) {
            e.preventDefault();
            this.triggerPip();
          }
        });
      }
  
      showNotification(message, type = 'info') {
        if (!this.settings || !this.settings.core.showNotifications) return;
        
        const notification = document.createElement('div');
        notification.className = `pip-notification pip-notification-${type}`;
        
        const theme = THEMES[this.settings.appearance.theme] || THEMES.default;
        const typeColors = {
          success: '#4caf50',
          warning: '#ff9800',
          error: '#f44336',
          info: theme.colors.primary
        };
        
        notification.style.cssText = `
          position: fixed;
          top: 20px;
          right: 20px;
          background: ${typeColors[type]};
          color: white;
          padding: 12px 20px;
          border-radius: ${theme.styles.borderRadius};
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          font-size: 14px;
          font-weight: 500;
          box-shadow: ${theme.styles.shadow};
          z-index: 10001;
          transform: translateX(100%);
          opacity: 0;
          transition: all 0.3s ease;
          max-width: 300px;
        `;
        
        notification.textContent = message;
        document.body.appendChild(notification);
        
        // Animate in
        requestAnimationFrame(() => {
          notification.style.transform = 'translateX(0)';
          notification.style.opacity = '1';
        });
        
        // Auto remove
        setTimeout(() => {
          notification.style.transform = 'translateX(100%)';
          notification.style.opacity = '0';
          setTimeout(() => notification.remove(), 300);
        }, 3000);
      }
  
      showQuickFeedback(text) {
        if (!this.settings || !this.settings.core.showNotifications) return;
        
        // Remove existing feedback
        const existing = document.querySelector('.pip-quick-feedback');
        if (existing) existing.remove();
        
        const feedback = document.createElement('div');
        feedback.className = 'pip-quick-feedback';
        
        const theme = THEMES[this.settings.appearance.theme] || THEMES.default;
        
        feedback.style.cssText = `
          position: fixed;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          background: rgba(0, 0, 0, 0.8);
          color: white;
          padding: 16px 24px;
          border-radius: ${theme.styles.borderRadius};
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          font-size: 18px;
          font-weight: 600;
          z-index: 10002;
          pointer-events: none;
          transition: opacity 0.2s ease;
        `;
        
        feedback.textContent = text;
        document.body.appendChild(feedback);
        
        // Auto remove
        setTimeout(() => {
          feedback.style.opacity = '0';
          setTimeout(() => feedback.remove(), 200);
        }, 1000);
      }
  
      cleanup() {
        if (this.keyboardHandler) {
          document.removeEventListener('keydown', this.keyboardHandler, true);
          this.keyboardHandler = null;
        }
        this.currentVideo = null;
        this.pipWindow = null;
      }
    }
  
    // Initialize manual PiP manager and expose it immediately
    const manualPipManager = new ManualPipManager();
    
    // Cleanup on page unload
    window.addEventListener('beforeunload', () => {
      manualPipManager.cleanup();
    });
  
    // Expose for external access (e.g., from popup) - available immediately
    window.pipManager = manualPipManager;
    console.log('✅ PipX: pipManager exposed to window');
    console.log('🔵 PipX: window.pipManager available:', typeof window.pipManager !== 'undefined');
  
})(); 
// Auto Picture-in-Picture functionality

(async function() {
    'use strict';
  
    // Get current settings
    const settings = await getSettings();
    
    if (!settings.core.autoPip) return;
  
    class AutoPipManager {
      constructor() {
        this.currentVideo = null;
        this.autoEnterTimeout = null;
        this.wasPlaying = false;
        this.observer = null;
        this.init();
      }
  
      init() {
        this.setupVisibilityListener();
        this.setupMediaSessionHandler();
        this.setupVideoObserver();
        this.checkExcludedSites();
      }
  
      checkExcludedSites() {
        const currentHost = window.location.hostname;
        const excludedSites = settings.sites.excludedSites || [];
        
        if (excludedSites.some(site => currentHost.includes(site))) {
          return false;
        }
        return true;
      }
  
      findBestVideo() {
        const videos = Array.from(document.querySelectorAll('video'))
          .filter(video => {
            return video.readyState !== 0 && 
                   !video.disablePictureInPicture &&
                   video.videoWidth > 0 && 
                   video.videoHeight > 0 &&
                   !video.hasAttribute('__pip__');
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
            const aVisible = aRect.top >= 0 && aRect.left >= 0 && 
                            aRect.bottom <= window.innerHeight && 
                            aRect.right <= window.innerWidth;
            const bVisible = bRect.top >= 0 && bRect.left >= 0 && 
                            bRect.bottom <= window.innerHeight && 
                            bRect.right <= window.innerWidth;
            
            if (aVisible !== bVisible) {
              return aVisible ? -1 : 1;
            }
            
            // Finally by size
            return bArea - aArea;
          });
  
        return videos.length > 0 ? videos[0] : null;
      }
  
      setupVisibilityListener() {
        document.addEventListener('visibilitychange', () => {
          this.handleVisibilityChange();
        });
      }
  
      async handleVisibilityChange() {
        const video = this.findBestVideo();
        if (!video) return;
  
        if (document.hidden) {
          // Tab became hidden
          this.wasPlaying = !video.paused;
          
          if (this.wasPlaying && !document.pictureInPictureElement) {
            clearTimeout(this.autoEnterTimeout);
            
            const delay = settings.core.autoEnterDelay || 2000;
            this.autoEnterTimeout = setTimeout(async () => {
              // Double-check conditions before entering PiP
              if (document.hidden && 
                  !video.paused && 
                  !document.pictureInPictureElement &&
                  this.checkExcludedSites()) {
                
                try {
                  await this.enterAutoPip(video);
                } catch (error) {
                  console.warn('Auto PiP failed:', error);
                }
              }
            }, delay);
          }
        } else {
          // Tab became visible
          clearTimeout(this.autoEnterTimeout);
          
          // Optional: Auto-exit PiP when returning to tab
          if (settings.core.autoExitOnReturn && document.pictureInPictureElement) {
            try {
              await document.exitPictureInPicture();
            } catch (error) {
              console.warn('Auto PiP exit failed:', error);
            }
          }
        }
      }
  
      async enterAutoPip(video) {
        this.currentVideo = video;
        
        await video.requestPictureInPicture();
        video.setAttribute('__pip__', 'true');
        
        this.setupPipControls(video);
        this.showAutoNotification('Auto Picture-in-Picture activated');
      }
  
      setupPipControls(video) {
        if (!settings.core.keyboardShortcuts) return;
  
        const handleKeydown = (e) => {
          if (document.pictureInPictureElement !== video) return;
          
          const preventDefault = (key) => {
            e.preventDefault();
            return key;
          };
          
          switch(e.key) {
            case ' ':
              preventDefault();
              video.paused ? video.play() : video.pause();
              break;
              
            case 'ArrowLeft':
              preventDefault();
              video.currentTime = Math.max(0, video.currentTime - 5);
              break;
              
            case 'ArrowRight':
              preventDefault();
              video.currentTime = Math.min(video.duration, video.currentTime + 5);
              break;
              
            case 'ArrowUp':
              preventDefault();
              video.volume = Math.min(1, video.volume + 0.05);
              break;
              
            case 'ArrowDown':
              preventDefault();
              video.volume = Math.max(0, video.volume - 0.05);
              break;
              
            case 'm':
            case 'M':
              preventDefault();
              video.muted = !video.muted;
              break;
              
            case 'j':
            case 'J':
              preventDefault();
              video.currentTime = Math.max(0, video.currentTime - 10);
              break;
              
            case 'l':
            case 'L':
              preventDefault();
              video.currentTime = Math.min(video.duration, video.currentTime + 10);
              break;
          }
        };
  
        document.addEventListener('keydown', handleKeydown);
        
        video.addEventListener('leavepictureinpicture', () => {
          video.removeAttribute('__pip__');
          document.removeEventListener('keydown', handleKeydown);
          this.currentVideo = null;
        }, { once: true });
      }
  
      setupMediaSessionHandler() {
        if (!navigator.mediaSession?.setActionHandler) return;
        
        try {
          navigator.mediaSession.setActionHandler('enterpictureinpicture', async () => {
            const video = this.findBestVideo();
            if (video) {
              try {
                await this.enterAutoPip(video);
              } catch (error) {
                console.warn('Media session PiP failed:', error);
              }
            }
          });
        } catch (error) {
          console.warn('Media session setup failed:', error);
        }
      }
  
      setupVideoObserver() {
        if (!MutationObserver) return;
        
        this.observer = new MutationObserver((mutations) => {
          let hasNewVideos = false;
          
          mutations.forEach((mutation) => {
            mutation.addedNodes.forEach((node) => {
              if (node.nodeType === Node.ELEMENT_NODE) {
                if (node.tagName === 'VIDEO') {
                  hasNewVideos = true;
                } else if (node.querySelectorAll) {
                  const videos = node.querySelectorAll('video');
                  if (videos.length > 0) {
                    hasNewVideos = true;
                  }
                }
              }
            });
          });
          
          // If new videos were added and we're in hidden state, check if we should enter PiP
          if (hasNewVideos && document.hidden) {
            setTimeout(() => this.handleVisibilityChange(), 1000);
          }
        });
  
        this.observer.observe(document.body, {
          childList: true,
          subtree: true
        });
      }
  
      showAutoNotification(message) {
        if (!settings.core.showNotifications) return;
        
        const notification = document.createElement('div');
        notification.className = 'pip-auto-notification';
        
        const theme = THEMES[settings.appearance.theme] || THEMES.default;
        
        notification.style.cssText = `
          position: fixed;
          top: 20px;
          left: 20px;
          background: ${theme.colors.secondary};
          color: white;
          padding: 12px 20px;
          border-radius: ${theme.styles.borderRadius};
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          font-size: 14px;
          font-weight: 500;
          box-shadow: ${theme.styles.shadow};
          z-index: 10001;
          transform: translateX(-100%);
          opacity: 0;
          transition: all 0.3s ease;
          max-width: 280px;
        `;
        
        notification.innerHTML = `
          <div style="display: flex; align-items: center; gap: 8px;">
            <span style="font-size: 16px;">🖼️</span>
            <span>${message}</span>
          </div>
        `;
        
        document.body.appendChild(notification);
        
        // Animate in
        requestAnimationFrame(() => {
          notification.style.transform = 'translateX(0)';
          notification.style.opacity = '1';
        });
        
        // Auto remove
        setTimeout(() => {
          notification.style.transform = 'translateX(-100%)';
          notification.style.opacity = '0';
          setTimeout(() => notification.remove(), 300);
        }, 4000);
      }
  
      cleanup() {
        clearTimeout(this.autoEnterTimeout);
        if (this.observer) {
          this.observer.disconnect();
        }
      }
    }
  
    // Initialize auto PiP manager
    const autoPipManager = new AutoPipManager();
    
    // Cleanup on page unload
    window.addEventListener('beforeunload', () => {
      autoPipManager.cleanup();
    });
  
  })();
// Generic Picture-in-Picture enhancements for all video sites

(function() {
    'use strict';
  
    console.log('🔵 PipX: Loading Generic script...');
  
    // Skip if this is a specifically supported site
    const hostname = window.location.hostname.toLowerCase();
    const supportedSites = ['youtube.com', 'netflix.com', 'twitch.tv'];
    
    console.log('🔵 PipX Generic: Current hostname:', hostname);
    console.log('🔵 PipX Generic: Supported sites:', supportedSites);
    
    const isSupported = supportedSites.some(site => hostname.includes(site));
    console.log('🔵 PipX Generic: Is supported site?', isSupported);
    
    if (isSupported) {
      console.log('🟡 PipX Generic: On supported site, skipping generic manager');
      // Still expose a placeholder for testing
      window.genericPipManager = { 
        initialized: false, 
        skipped: true, 
        reason: 'supported-site',
        hostname: hostname 
      };
      console.log('🔵 PipX Generic: Placeholder manager exposed for testing');
      return;
    }

    console.log('🔵 PipX: On generic site, initializing generic manager...');

    class GenericPipManager {
      constructor() {
        this.videos = new Map();
        this.activeVideo = null;
        this.pipButton = null;
        this.observer = null;
        this.overlayControls = null;
        this.initialized = false;
        this.settings = null;
        
        // Initialize asynchronously
        this.init();
      }

      async init() {
        try {
          // Get current settings
          this.settings = await getSettings();
          
          if (!this.settings.sites.generic.enhancedControls) {
            this.initialized = false;
            return;
          }

          this.setupVideoDetection();
          this.setupGlobalEventHandlers();
          this.createUniversalPipButton();
          this.initialized = true;
        } catch (error) {
          console.warn('Failed to initialize GenericPipManager:', error);
          this.initialized = false;
        }
      }

      setupVideoDetection() {
        // Initial scan for videos
        this.scanForVideos();
        
        // Watch for new videos being added
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
          
          if (hasNewVideos) {
            setTimeout(() => this.scanForVideos(), 100);
          }
        });
        
        this.observer.observe(document.body, {
          childList: true,
          subtree: true
        });
      }

      scanForVideos() {
        const videos = document.querySelectorAll('video');
        
        videos.forEach(video => {
          if (!this.videos.has(video)) {
            this.setupVideoEnhancements(video);
            this.videos.set(video, {
              enhanced: true,
              lastInteraction: Date.now()
            });
          }
        });
        
        // Clean up removed videos
        this.videos.forEach((data, video) => {
          if (!document.contains(video)) {
            this.videos.delete(video);
          }
        });
        
        this.updateActiveVideo();
      }

      setupVideoEnhancements(video) {
        // Add event handlers
        video.addEventListener('play', () => this.onVideoPlay(video));
        video.addEventListener('pause', () => this.onVideoPause(video));
        video.addEventListener('enterpictureinpicture', () => this.onEnterPip(video));
        video.addEventListener('leavepictureinpicture', () => this.onLeavePip(video));
        
        // Add context menu for right-click PiP
        video.addEventListener('contextmenu', (e) => {
          this.addContextMenuPip(e, video);
        });
        
        // Add hover controls if enabled
        if (this.settings && this.settings.sites.generic.showOverlay) {
          this.addHoverControls(video);
        }
        
        // Track interactions
        ['click', 'play', 'pause', 'volumechange', 'seeked'].forEach(event => {
          video.addEventListener(event, () => {
            const data = this.videos.get(video);
            if (data) {
              data.lastInteraction = Date.now();
              this.updateActiveVideo();
            }
          });
        });
      }

      updateActiveVideo() {
        // Find the most recently interacted with, visible, playing video
        let bestVideo = null;
        let bestScore = -1;
        
        this.videos.forEach((data, video) => {
          let score = 0;
          
          // Playing videos get priority
          if (!video.paused) score += 1000;
          
          // Visible videos get priority
          if (this.isVideoVisible(video)) score += 500;
          
          // Larger videos get priority
          const rect = video.getBoundingClientRect();
          const area = rect.width * rect.height;
          score += Math.min(area / 1000, 100);
          
          // Recent interactions get priority
          const timeSinceInteraction = Date.now() - data.lastInteraction;
          score += Math.max(0, 100 - timeSinceInteraction / 1000);
          
          if (score > bestScore) {
            bestScore = score;
            bestVideo = video;
          }
        });
        
        if (bestVideo !== this.activeVideo) {
          this.activeVideo = bestVideo;
          this.updatePipButton();
        }
      }

      isVideoVisible(video) {
        const rect = video.getBoundingClientRect();
        const viewportHeight = window.innerHeight;
        const viewportWidth = window.innerWidth;
        
        // Check if video is in viewport
        const inViewport = rect.top < viewportHeight && 
                          rect.bottom > 0 && 
                          rect.left < viewportWidth && 
                          rect.right > 0;
        
        // Check if video has reasonable size
        const hasSize = rect.width > 200 && rect.height > 150;
        
        return inViewport && hasSize;
      }

      createUniversalPipButton() {
        if (!this.settings) return;
        
        // Create floating PiP button
        this.pipButton = document.createElement('button');
        this.pipButton.className = 'generic-pip-button';
        this.pipButton.innerHTML = '🖼️';
        this.pipButton.title = 'Picture-in-Picture';
        
        const theme = THEMES[this.settings.appearance.theme] || THEMES.default;
        
        this.pipButton.style.cssText = `
          position: fixed;
          top: 20px;
          right: 20px;
          width: 48px;
          height: 48px;
          background: ${theme.colors.primary};
          color: white;
          border: none;
          border-radius: 50%;
          font-size: 16px;
          cursor: pointer;
          box-shadow: ${theme.styles.shadow};
          z-index: 9999;
          opacity: 0;
          transform: scale(0.8);
          transition: all 0.3s ease;
          backdrop-filter: blur(10px);
        `;
        
        this.pipButton.addEventListener('mouseenter', () => {
          this.pipButton.style.transform = 'scale(1.1)';
          this.pipButton.style.boxShadow = '0 4px 16px rgba(0,0,0,0.3)';
        });
        
        this.pipButton.addEventListener('mouseleave', () => {
          this.pipButton.style.transform = 'scale(1)';
          this.pipButton.style.boxShadow = theme.styles.shadow;
        });
        
        this.pipButton.addEventListener('click', () => {
          this.triggerPip();
        });
        
        document.body.appendChild(this.pipButton);
        
        // Show button when videos are detected
        this.updatePipButton();
      }

      updatePipButton() {
        if (!this.pipButton) return;
        
        const hasVideos = this.videos.size > 0;
        const isInPip = !!document.pictureInPictureElement;
        
        if (hasVideos && !isInPip) {
          this.pipButton.style.opacity = '0.8';
          this.pipButton.style.transform = 'scale(1)';
          this.pipButton.style.pointerEvents = 'auto';
        } else if (isInPip) {
          this.pipButton.style.opacity = '0.6';
          this.pipButton.innerHTML = '❌';
          this.pipButton.title = 'Exit Picture-in-Picture';
        } else {
          this.pipButton.style.opacity = '0';
          this.pipButton.style.transform = 'scale(0.8)';
          this.pipButton.style.pointerEvents = 'none';
        }
      }

      async triggerPip() {
        if (!this.initialized || !this.settings) {
          console.warn('GenericPipManager not yet initialized');
          return false;
        }

        try {
          if (document.pictureInPictureElement) {
            await document.exitPictureInPicture();
            this.pipButton.innerHTML = '🖼️';
            this.pipButton.title = 'Picture-in-Picture';
            return;
          }
          
          const video = this.findBestVideo();
          if (!video) {
            this.showGenericNotification('No suitable video found', 'warning');
            return;
          }
          
          await video.requestPictureInPicture();
          this.showGenericNotification('Picture-in-Picture activated', 'success');
          
        } catch (error) {
          console.warn('Generic PiP failed:', error);
          this.showGenericNotification('PiP not supported on this video', 'error');
        }
      }

      findBestVideo() {
        if (this.activeVideo && this.canUsePip(this.activeVideo)) {
          return this.activeVideo;
        }
        
        // Find any suitable video
        const videos = Array.from(this.videos.keys())
          .filter(video => this.canUsePip(video))
          .sort((a, b) => {
            // Prioritize playing videos
            if (a.paused !== b.paused) {
              return a.paused ? 1 : -1;
            }
            
            // Then by visibility
            const aVisible = this.isVideoVisible(a);
            const bVisible = this.isVideoVisible(b);
            if (aVisible !== bVisible) {
              return aVisible ? -1 : 1;
            }
            
            // Finally by size
            const aRect = a.getBoundingClientRect();
            const bRect = b.getBoundingClientRect();
            const aArea = aRect.width * aRect.height;
            const bArea = bRect.width * bRect.height;
            return bArea - aArea;
          });
        
        return videos.length > 0 ? videos[0] : null;
      }

      canUsePip(video) {
        return video && 
               video.readyState !== 0 && 
               !video.disablePictureInPicture &&
               video.videoWidth > 0 && 
               video.videoHeight > 0;
      }

      addHoverControls(video) {
        const container = video.parentElement;
        if (!container) return;
        
        let hoverTimeout;
        let controlsElement;
        
        const showControls = () => {
          if (controlsElement) return;
          
          controlsElement = document.createElement('div');
          controlsElement.className = 'generic-video-controls';
          
          const theme = THEMES[this.settings.appearance.theme] || THEMES.default;
          
          controlsElement.style.cssText = `
            position: absolute;
            top: 10px;
            right: 10px;
            background: rgba(0, 0, 0, 0.7);
            border-radius: ${theme.styles.borderRadius};
            padding: 8px;
            display: flex;
            gap: 8px;
            z-index: 1000;
            opacity: 0;
            transition: opacity 0.3s ease;
            backdrop-filter: blur(5px);
          `;
          
          const pipBtn = document.createElement('button');
          pipBtn.innerHTML = '🖼️';
          pipBtn.title = 'Picture-in-Picture';
          pipBtn.style.cssText = `
            background: none;
            border: none;
            color: white;
            font-size: 14px;
            padding: 4px 8px;
            border-radius: 4px;
            cursor: pointer;
            transition: background 0.2s ease;
          `;
          
          pipBtn.addEventListener('click', async (e) => {
            e.stopPropagation();
            try {
              await video.requestPictureInPicture();
            } catch (error) {
              console.warn('Video PiP failed:', error);
            }
          });
          
          pipBtn.addEventListener('mouseenter', () => {
            pipBtn.style.background = 'rgba(255, 255, 255, 0.2)';
          });
          
          pipBtn.addEventListener('mouseleave', () => {
            pipBtn.style.background = 'none';
          });
          
          controlsElement.appendChild(pipBtn);
          container.style.position = container.style.position || 'relative';
          container.appendChild(controlsElement);
          
          // Fade in
          requestAnimationFrame(() => {
            controlsElement.style.opacity = '1';
          });
        };
        
        const hideControls = () => {
          if (controlsElement) {
            controlsElement.style.opacity = '0';
            setTimeout(() => {
              if (controlsElement && controlsElement.parentElement) {
                controlsElement.remove();
                controlsElement = null;
              }
            }, 300);
          }
        };
        
        video.addEventListener('mouseenter', () => {
          clearTimeout(hoverTimeout);
          showControls();
        });
        
        video.addEventListener('mouseleave', () => {
          hoverTimeout = setTimeout(hideControls, 1000);
        });
        
        container.addEventListener('mouseenter', () => {
          clearTimeout(hoverTimeout);
        });
        
        container.addEventListener('mouseleave', () => {
          hoverTimeout = setTimeout(hideControls, 1000);
        });
      }

      addContextMenuPip(event, video) {
        // Add PiP option to context menu (browser dependent)
        if (this.canUsePip(video)) {
          // Store reference for potential use
          video.setAttribute('data-pip-ready', 'true');
        }
      }

      onVideoPlay(video) {
        const data = this.videos.get(video);
        if (data) {
          data.lastInteraction = Date.now();
          this.updateActiveVideo();
        }
      }

      onVideoPause(video) {
        // Could implement auto-pause features here
      }

      onEnterPip(video) {
        this.setupGenericPipControls(video);
        this.updatePipButton();
        this.extractVideoMetadata(video);
      }

      onLeavePip(video) {
        this.cleanupGenericPipControls();
        this.updatePipButton();
      }

      setupGenericPipControls(video) {
        // Set up basic media session if supported
        if (navigator.mediaSession) {
          this.updateMediaSession(video);
          
          navigator.mediaSession.setActionHandler('play', () => {
            video.play();
          });
          
          navigator.mediaSession.setActionHandler('pause', () => {
            video.pause();
          });
          
          navigator.mediaSession.setActionHandler('seekbackward', () => {
            video.currentTime = Math.max(0, video.currentTime - 10);
          });
          
          navigator.mediaSession.setActionHandler('seekforward', () => {
            video.currentTime = Math.min(video.duration, video.currentTime + 10);
          });
        }
      }

      extractVideoMetadata(video) {
        // Try to extract video title and site info
        let title = document.title;
        let artist = window.location.hostname;
        
        // Look for common video title patterns
        const titleSelectors = [
          'h1',
          '[class*="title"]',
          '[class*="heading"]',
          '[data-testid*="title"]',
          '.video-title',
          '.player-title'
        ];
        
        for (const selector of titleSelectors) {
          const element = document.querySelector(selector);
          if (element && element.textContent.trim()) {
            title = element.textContent.trim();
            break;
          }
        }
        
        // Try to find video source info
        const src = video.currentSrc || video.src;
        if (src && src.includes('blob:') === false) {
          try {
            const url = new URL(src);
            artist = url.hostname;
          } catch (e) {
            // Ignore URL parsing errors
          }
        }
        
        this.updateMediaSession(video, title, artist);
      }

      updateMediaSession(video, title = null, artist = null) {
        if (!navigator.mediaSession) return;
        
        const finalTitle = title || document.title || 'Video';
        const finalArtist = artist || window.location.hostname;
        
        navigator.mediaSession.metadata = new MediaMetadata({
          title: finalTitle,
          artist: finalArtist,
          artwork: [
            {
              src: this.extractThumbnail(video) || '/favicon.ico',
              sizes: '320x180',
              type: 'image/jpeg'
            }
          ]
        });
      }

      extractThumbnail(video) {
        // Try to find video thumbnail
        const thumbnailSelectors = [
          'meta[property="og:image"]',
          'meta[name="twitter:image"]',
          '[class*="thumbnail"]',
          '[class*="poster"]'
        ];
        
        for (const selector of thumbnailSelectors) {
          const element = document.querySelector(selector);
          if (element) {
            const src = element.content || element.src;
            if (src) return src;
          }
        }
        
        // Use video poster if available
        return video.poster || null;
      }

      cleanupGenericPipControls() {
        if (navigator.mediaSession) {
          navigator.mediaSession.setActionHandler('play', null);
          navigator.mediaSession.setActionHandler('pause', null);
          navigator.mediaSession.setActionHandler('seekbackward', null);
          navigator.mediaSession.setActionHandler('seekforward', null);
        }
      }

      setupGlobalEventHandlers() {
        // Handle page visibility changes
        document.addEventListener('visibilitychange', () => {
          if (document.hidden && this.settings && this.settings.core.autoPip) {
            // Auto PiP logic is handled by auto-pip.js
            // This is just for tracking
            this.updateActiveVideo();
          }
        });
        
        // Handle window resize
        window.addEventListener('resize', () => {
          setTimeout(() => this.updateActiveVideo(), 100);
        });
        
        // Handle scroll to update visibility
        window.addEventListener('scroll', () => {
          clearTimeout(this.scrollTimeout);
          this.scrollTimeout = setTimeout(() => this.updateActiveVideo(), 100);
        });
      }

      showGenericNotification(message, type = 'info') {
        if (!this.settings || !this.settings.core.showNotifications) return;
        
        const notification = document.createElement('div');
        notification.className = `generic-pip-notification generic-pip-notification-${type}`;
        
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
          right: 80px;
          background: ${typeColors[type]};
          color: white;
          padding: 12px 20px;
          border-radius: ${theme.styles.borderRadius};
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          font-size: 14px;
          font-weight: 500;
          box-shadow: ${theme.styles.shadow};
          z-index: 10000;
          transform: translateX(100%);
          opacity: 0;
          transition: all 0.3s ease;
          max-width: 280px;
          backdrop-filter: blur(10px);
        `;
        
        notification.innerHTML = `
          <div style="display: flex; align-items: center; gap: 8px;">
            <span style="font-size: 16px;">🎬</span>
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
          notification.style.transform = 'translateX(100%)';
          notification.style.opacity = '0';
          setTimeout(() => notification.remove(), 300);
        }, 4000);
      }

      cleanup() {
        if (this.observer) {
          this.observer.disconnect();
        }
        
        if (this.pipButton) {
          this.pipButton.remove();
        }
        
        this.cleanupGenericPipControls();
        this.videos.clear();
        
        clearTimeout(this.scrollTimeout);
      }
    }

    // Initialize generic PiP manager and expose it immediately
    const genericPipManager = new GenericPipManager();
    
    // Cleanup on page unload
    window.addEventListener('beforeunload', () => {
      genericPipManager.cleanup();
    });
    
    // Expose for external access - available immediately
    window.genericPipManager = genericPipManager;
    console.log('✅ PipX: genericPipManager exposed to window');
    console.log('🔵 PipX: window.genericPipManager available:', typeof window.genericPipManager !== 'undefined');

})(); 
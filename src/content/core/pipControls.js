// Enhanced Picture-in-Picture controls

(function() {
    'use strict';
  
    console.log('🔵 PipX: Loading PiP Controls...');
  
    class PipControlsManager {
      constructor() {
        this.currentVideo = null;
        this.pipWindow = null;
        this.settings = null;
        this.mediaSessionActive = false;
        this.floatingControls = null;
        this.init();
      }
  
      async init() {
        // Load settings quickly
        try {
          this.settings = await getSettings();
        } catch (error) {
          console.warn('🟡 PipX PiP Controls: Using default settings');
          this.settings = DEFAULT_SETTINGS;
        }
        
        if (!this.settings.core.keyboardShortcuts && !this.settings.appearance.pipWindow.showControls) {
          console.log('🟡 PipX PiP Controls: Controls disabled in settings');
          return;
        }
        
        this.setupPipEventListeners();
        this.setupGlobalKeyboardShortcuts();
        console.log('✅ PipX: PiP Controls initialized');
      }
  
      setupPipEventListeners() {
        document.addEventListener('enterpictureinpicture', (e) => {
          console.log('🔵 PipX PiP Controls: Video entered PiP');
          this.currentVideo = e.target;
          
          // Get the actual PiP window reference
          e.target.requestPictureInPicture().then((pipWindow) => {
            this.pipWindow = pipWindow;
            console.log('🔵 PipX PiP Controls: PiP window obtained:', pipWindow.width, 'x', pipWindow.height);
            
            // Setup PiP window-specific features
            this.setupPipWindowFeatures(e.target, pipWindow);
          }).catch((error) => {
            console.warn('🟡 PipX PiP Controls: Could not get PiP window reference:', error);
            // Fallback to basic controls
            this.setupBasicPipControls(e.target);
          });
        });
  
        document.addEventListener('leavepictureinpicture', (e) => {
          console.log('🔵 PipX PiP Controls: Video left PiP');
          this.cleanup();
        });
      }

      setupPipWindowFeatures(video, pipWindow) {
        // Setup controls with PiP window awareness
        this.setupMediaSessionControls(video);
        this.setupVideoKeyboardControls(video);
        this.createAdaptiveFloatingControls(video, pipWindow);
        
        // Setup PiP window resize listener
        pipWindow.addEventListener('resize', (e) => {
          const newWidth = e.target.width;
          const newHeight = e.target.height;
          console.log('🔵 PipX PiP Controls: PiP window resized to:', newWidth, 'x', newHeight);
          
          // Adapt controls based on new size
          this.adaptControlsToSize(newWidth, newHeight);
          
          // Update floating controls position
          this.updateFloatingControlsPosition(newWidth, newHeight);
          
          // Trigger responsive behavior
          this.handlePipResize(newWidth, newHeight);
        });
        
        // Initial adaptation
        this.adaptControlsToSize(pipWindow.width, pipWindow.height);
      }

      setupBasicPipControls(video) {
        // Fallback for when PiP window reference is not available
        console.log('🟡 PipX PiP Controls: Using basic controls (no PiP window reference)');
        this.setupMediaSessionControls(video);
        this.setupVideoKeyboardControls(video);
        this.createFloatingPipControls(video);
      }

      createAdaptiveFloatingControls(video, pipWindow) {
        if (!this.settings.appearance.pipWindow.showControls) return;
        
        console.log('🔵 PipX PiP Controls: Creating adaptive floating controls');
        
        // Remove existing floating controls
        if (this.floatingControls) {
          this.floatingControls.remove();
        }
        
        // Determine control layout based on PiP window size
        const isCompact = pipWindow.width < 400 || pipWindow.height < 300;
        const isLarge = pipWindow.width > 800 && pipWindow.height > 600;
        
        this.floatingControls = document.createElement('div');
        this.floatingControls.className = 'pipx-adaptive-controls';
        this.floatingControls.style.cssText = this.getAdaptiveControlsCSS(isCompact, isLarge);
        
        // Create controls based on available space
        const controls = this.getAdaptiveControlSet(video, isCompact, isLarge);
        
        controls.forEach(control => {
          const button = this.createControlButton(control, isCompact);
          this.floatingControls.appendChild(button);
        });
        
        // Add responsive information display
        if (!isCompact) {
          this.addPipInfoDisplay(pipWindow);
        }
        
        document.body.appendChild(this.floatingControls);
        
        // Position controls optimally
        this.positionFloatingControls(pipWindow);
        
        // Setup behaviors
        this.setupAdaptiveControlsBehavior();
        
        console.log('✅ PipX PiP Controls: Adaptive controls created');
      }

      getAdaptiveControlsCSS(isCompact, isLarge) {
        const baseCSS = `
          position: fixed;
          background: rgba(0, 0, 0, 0.9);
          border-radius: ${isCompact ? '8px' : '12px'};
          padding: ${isCompact ? '4px' : '8px'};
          display: flex;
          z-index: 10000;
          opacity: 0;
          transition: all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
          backdrop-filter: blur(20px);
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          pointer-events: none;
          box-shadow: 0 ${isLarge ? '15px 60px' : '10px 40px'} rgba(0, 0, 0, 0.4);
          border: 1px solid rgba(255, 255, 255, 0.15);
        `;
        
        if (isCompact) {
          return baseCSS + `
            flex-direction: row;
            gap: 4px;
            bottom: 20px;
            left: 50%;
            transform: translateX(-50%) translateY(100%);
          `;
        } else {
          return baseCSS + `
            flex-direction: column;
            gap: 6px;
            right: 20px;
            top: 50%;
            transform: translateX(100%) translateY(-50%);
            min-width: ${isLarge ? '60px' : '50px'};
          `;
        }
      }

      getAdaptiveControlSet(video, isCompact, isLarge) {
        if (isCompact) {
          // Minimal controls for small PiP windows
          return [
            { icon: '⚡', action: () => this.cycleSpeed(video), title: `${video.playbackRate}x`, id: 'speed' },
            { icon: '🔊', action: () => this.cycleVolume(video), title: `${Math.round(video.volume * 100)}%`, id: 'volume' },
            { icon: '❌', action: () => document.exitPictureInPicture(), title: 'Exit PiP', id: 'exit' }
          ];
        } else if (isLarge) {
          // Extended controls for large PiP windows
          return [
            { icon: '⚡', action: () => this.cycleSpeed(video), title: `Speed: ${video.playbackRate}x`, id: 'speed' },
            { icon: '🔊', action: () => this.cycleVolume(video), title: `Volume: ${Math.round(video.volume * 100)}%`, id: 'volume' },
            { icon: '🎨', action: () => this.cycleTheme(), title: 'Change Theme', id: 'theme' },
            { icon: '📱', action: () => this.toggleCompactMode(), title: 'Compact Mode', id: 'compact' },
            { icon: '🔄', action: () => this.resetPipSize(), title: 'Reset Size', id: 'reset' },
            { icon: '⚙️', action: () => this.openQuickSettings(), title: 'Quick Settings', id: 'settings' },
            { icon: '❌', action: () => document.exitPictureInPicture(), title: 'Exit PiP', id: 'exit' }
          ];
        } else {
          // Standard controls for medium PiP windows
          return [
            { icon: '⚡', action: () => this.cycleSpeed(video), title: `Speed: ${video.playbackRate}x`, id: 'speed' },
            { icon: '🔊', action: () => this.cycleVolume(video), title: `Volume: ${Math.round(video.volume * 100)}%`, id: 'volume' },
            { icon: '🎨', action: () => this.cycleTheme(), title: 'Change Theme', id: 'theme' },
            { icon: '⚙️', action: () => this.openQuickSettings(), title: 'Quick Settings', id: 'settings' }
          ];
        }
      }

      createControlButton(control, isCompact) {
        const button = document.createElement('button');
        button.innerHTML = control.icon;
        button.title = control.title;
        button.id = `pipx-${control.id}`;
        
        const size = isCompact ? '32px' : '40px';
        const fontSize = isCompact ? '14px' : '16px';
        
        button.style.cssText = `
          background: rgba(255, 255, 255, 0.1);
          border: 1px solid rgba(255, 255, 255, 0.15);
          color: white;
          font-size: ${fontSize};
          padding: ${isCompact ? '6px' : '8px'};
          border-radius: ${isCompact ? '6px' : '8px'};
          cursor: pointer;
          transition: all 0.3s ease;
          width: ${size};
          height: ${size};
          display: flex;
          align-items: center;
          justify-content: center;
          pointer-events: auto;
        `;
        
        button.addEventListener('mouseenter', () => {
          button.style.background = 'rgba(255, 255, 255, 0.25)';
          button.style.transform = 'scale(1.1)';
          button.style.borderColor = 'rgba(255, 255, 255, 0.3)';
        });
        
        button.addEventListener('mouseleave', () => {
          button.style.background = 'rgba(255, 255, 255, 0.1)';
          button.style.transform = 'scale(1)';
          button.style.borderColor = 'rgba(255, 255, 255, 0.15)';
        });
        
        button.addEventListener('click', (e) => {
          e.stopPropagation();
          control.action();
        });
        
        return button;
      }

      addPipInfoDisplay(pipWindow) {
        const infoDisplay = document.createElement('div');
        infoDisplay.className = 'pipx-info-display';
        infoDisplay.style.cssText = `
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 6px;
          padding: 6px;
          font-size: 10px;
          color: rgba(255, 255, 255, 0.7);
          text-align: center;
          margin-top: 4px;
          min-width: 45px;
        `;
        
        const updateInfo = () => {
          infoDisplay.textContent = `${pipWindow.width}×${pipWindow.height}`;
        };
        
        updateInfo();
        pipWindow.addEventListener('resize', updateInfo);
        
        this.floatingControls.appendChild(infoDisplay);
      }

      positionFloatingControls(pipWindow) {
        if (!this.floatingControls) return;
        
        // Smart positioning based on available screen space and PiP window location
        // Note: We can't get exact PiP position, but we can make educated guesses
        
        const screenWidth = window.screen.width;
        const screenHeight = window.screen.height;
        const isSmallScreen = screenWidth < 1200 || screenHeight < 800;
        
        if (isSmallScreen) {
          // Bottom positioning for small screens
          this.floatingControls.style.bottom = '20px';
          this.floatingControls.style.right = '20px';
          this.floatingControls.style.top = 'auto';
          this.floatingControls.style.left = 'auto';
        } else {
          // Side positioning for larger screens
          this.floatingControls.style.right = '20px';
          this.floatingControls.style.top = '50%';
          this.floatingControls.style.bottom = 'auto';
          this.floatingControls.style.left = 'auto';
        }
      }

      adaptControlsToSize(width, height) {
        if (!this.floatingControls) return;
        
        const isCompact = width < 400 || height < 300;
        const isLarge = width > 800 && height > 600;
        
        // Update control visibility based on size
        const controls = this.floatingControls.querySelectorAll('button');
        controls.forEach((button, index) => {
          if (isCompact && index > 2) {
            button.style.display = 'none';
          } else {
            button.style.display = 'flex';
          }
        });
        
        // Adjust control sizes
        const newSize = isCompact ? '32px' : isLarge ? '44px' : '40px';
        controls.forEach(button => {
          button.style.width = newSize;
          button.style.height = newSize;
        });
        
        console.log(`🔵 PipX PiP Controls: Adapted to ${isCompact ? 'compact' : isLarge ? 'large' : 'standard'} mode`);
      }

      updateFloatingControlsPosition(width, height) {
        if (!this.floatingControls) return;
        
        const isWide = width > height * 1.5;
        const isTall = height > width * 1.5;
        
        if (isWide) {
          // Horizontal layout for wide windows
          this.floatingControls.style.flexDirection = 'row';
          this.floatingControls.style.bottom = '20px';
          this.floatingControls.style.right = '20px';
          this.floatingControls.style.top = 'auto';
          this.floatingControls.style.transform = 'translateY(100%)';
        } else if (isTall) {
          // Vertical layout for tall windows
          this.floatingControls.style.flexDirection = 'column';
          this.floatingControls.style.right = '20px';
          this.floatingControls.style.top = '20px';
          this.floatingControls.style.bottom = 'auto';
          this.floatingControls.style.transform = 'translateX(100%)';
        }
      }

      handlePipResize(width, height) {
        // Trigger adaptive behaviors on resize
        const aspectRatio = width / height;
        
        // Update Media Session metadata if needed
        if (this.currentVideo && navigator.mediaSession) {
          this.updateMediaMetadata(this.currentVideo);
        }
        
        // Adjust floating controls visibility timing
        this.showFloatingControls();
        
        // Log resize for debugging
        console.log(`🔵 PipX PiP Controls: Window resized - ${width}x${height} (${aspectRatio.toFixed(2)}:1)`);
      }

      // New control functions
      toggleCompactMode() {
        if (this.pipWindow) {
          // Simulate compact mode by suggesting smaller size
          // Note: We can't directly resize, but can provide feedback
          this.showControlFeedback('📱 Compact Mode - Resize PiP window smaller');
        }
      }

      resetPipSize() {
        this.showControlFeedback('🔄 Reset Size - Use browser controls to resize PiP');
      }

      showFloatingControls() {
        if (!this.floatingControls || !document.pictureInPictureElement) return;
        
        this.floatingControls.style.opacity = '1';
        this.floatingControls.style.pointerEvents = 'auto';
        
        // Determine transform based on current layout
        const isVertical = this.floatingControls.style.flexDirection === 'column';
        if (isVertical) {
          this.floatingControls.style.transform = 'translateX(0) translateY(-50%)';
        } else {
          this.floatingControls.style.transform = 'translateX(-50%) translateY(0)';
        }
        
        // Auto-hide after delay
        clearTimeout(this.hideTimeout);
        this.hideTimeout = setTimeout(() => {
          this.hideFloatingControls();
        }, 4000);
      }

      hideFloatingControls() {
        if (!this.floatingControls) return;
        
        this.floatingControls.style.opacity = '0';
        this.floatingControls.style.pointerEvents = 'none';
        
        // Determine hide transform based on current layout
        const isVertical = this.floatingControls.style.flexDirection === 'column';
        if (isVertical) {
          this.floatingControls.style.transform = 'translateX(100%) translateY(-50%)';
        } else {
          this.floatingControls.style.transform = 'translateX(-50%) translateY(100%)';
        }
      }

      setupAdaptiveControlsBehavior() {
        // Enhanced behavior that responds to PiP window state
        const showOnActivity = () => {
          if (document.pictureInPictureElement) {
            this.showFloatingControls();
          }
        };
        
        // Show on various activities
        document.addEventListener('mousemove', showOnActivity);
        document.addEventListener('keydown', showOnActivity);
        
        // Keep visible when hovering
        this.floatingControls.addEventListener('mouseenter', () => {
          clearTimeout(this.hideTimeout);
        });
        
        this.floatingControls.addEventListener('mouseleave', () => {
          this.hideTimeout = setTimeout(() => {
            this.hideFloatingControls();
          }, 1000);
        });
        
        // Store reference for cleanup
        this.showOnActivity = showOnActivity;
      }

      setupMediaSessionControls(video) {
        if (!navigator.mediaSession || this.mediaSessionActive) return;
        
        console.log('🔵 PipX PiP Controls: Setting up Media Session controls (native PiP)');
        
        // Set metadata for the PiP window
        this.updateMediaMetadata(video);
        
        // These create NATIVE controls in the PiP window itself
        navigator.mediaSession.setActionHandler('play', () => {
          console.log('🔵 PipX: Native PiP play button pressed');
          video.play();
          this.showControlFeedback('▶️ Playing');
        });
        
        navigator.mediaSession.setActionHandler('pause', () => {
          console.log('🔵 PipX: Native PiP pause button pressed');
          video.pause();
          this.showControlFeedback('⏸️ Paused');
        });
        
        navigator.mediaSession.setActionHandler('seekbackward', (details) => {
          console.log('🔵 PipX: Native PiP seek backward');
          const seekTime = details.seekOffset || 10;
          video.currentTime = Math.max(0, video.currentTime - seekTime);
          this.showControlFeedback(`⏪ -${seekTime}s`);
        });
        
        navigator.mediaSession.setActionHandler('seekforward', (details) => {
          console.log('🔵 PipX: Native PiP seek forward');
          const seekTime = details.seekOffset || 10;
          video.currentTime = Math.min(video.duration, video.currentTime + seekTime);
          this.showControlFeedback(`⏩ +${seekTime}s`);
        });
        
        navigator.mediaSession.setActionHandler('seekto', (details) => {
          console.log('🔵 PipX: Native PiP seek to position');
          if (details.seekTime) {
            video.currentTime = details.seekTime;
            this.showControlFeedback(`↻ ${Math.round(details.seekTime)}s`);
          }
        });
        
        // Update position state for scrubber
        const updatePositionState = () => {
          if (navigator.mediaSession.setPositionState && video.duration) {
            try {
              navigator.mediaSession.setPositionState({
                duration: video.duration,
                playbackRate: video.playbackRate,
                position: video.currentTime
              });
            } catch (error) {
              // Some browsers don't support position state
            }
          }
        };
        
        video.addEventListener('timeupdate', updatePositionState);
        video.addEventListener('durationchange', updatePositionState);
        video.addEventListener('ratechange', updatePositionState);
        
        this.mediaSessionActive = true;
        console.log('✅ PipX PiP Controls: Native PiP controls active');
      }

      createFloatingPipControls(video) {
        if (!this.settings.appearance.pipWindow.showControls) return;
        
        console.log('🔵 PipX PiP Controls: Creating floating controls for additional features');
        
        // Remove existing floating controls
        if (this.floatingControls) {
          this.floatingControls.remove();
        }
        
        // Create floating controls that appear ONLY when PiP is active
        this.floatingControls = document.createElement('div');
        this.floatingControls.className = 'pipx-floating-controls';
        this.floatingControls.style.cssText = `
          position: fixed;
          bottom: 80px;
          right: 20px;
          background: rgba(0, 0, 0, 0.85);
          border-radius: 12px;
          padding: 8px;
          display: flex;
          flex-direction: column;
          gap: 6px;
          z-index: 10000;
          opacity: 0;
          transform: translateX(100%);
          transition: all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
          backdrop-filter: blur(20px);
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          pointer-events: none;
          box-shadow: 0 10px 40px rgba(0, 0, 0, 0.3);
          border: 1px solid rgba(255, 255, 255, 0.1);
          min-width: 50px;
        `;
        
        // Only show advanced controls that aren't available in native PiP
        const advancedControls = [
          { 
            icon: '⚡', 
            action: () => this.cycleSpeed(video), 
            title: `Speed: ${video.playbackRate}x`,
            id: 'speed'
          },
          { 
            icon: '🔊', 
            action: () => this.cycleVolume(video), 
            title: `Volume: ${Math.round(video.volume * 100)}%`,
            id: 'volume'
          },
          { 
            icon: '🎨', 
            action: () => this.cycleTheme(), 
            title: 'Change Theme',
            id: 'theme'
          },
          { 
            icon: '⚙️', 
            action: () => this.openQuickSettings(), 
            title: 'Quick Settings',
            id: 'settings'
          }
        ];
        
        advancedControls.forEach(control => {
          const button = document.createElement('button');
          button.innerHTML = control.icon;
          button.title = control.title;
          button.id = `pipx-${control.id}`;
          button.style.cssText = `
            background: rgba(255, 255, 255, 0.1);
            border: 1px solid rgba(255, 255, 255, 0.15);
            color: white;
            font-size: 16px;
            padding: 8px;
            border-radius: 8px;
            cursor: pointer;
            transition: all 0.3s ease;
            width: 40px;
            height: 40px;
            display: flex;
            align-items: center;
            justify-content: center;
            pointer-events: auto;
          `;
          
          button.addEventListener('mouseenter', () => {
            button.style.background = 'rgba(255, 255, 255, 0.25)';
            button.style.transform = 'scale(1.1)';
            button.style.borderColor = 'rgba(255, 255, 255, 0.3)';
          });
          
          button.addEventListener('mouseleave', () => {
            button.style.background = 'rgba(255, 255, 255, 0.1)';
            button.style.transform = 'scale(1)';
            button.style.borderColor = 'rgba(255, 255, 255, 0.15)';
          });
          
          button.addEventListener('click', (e) => {
            e.stopPropagation();
            control.action();
          });
          
          this.floatingControls.appendChild(button);
        });
        
        document.body.appendChild(this.floatingControls);
        
        // Show controls when PiP is active
        this.showFloatingControls();
        
        // Auto-hide behavior
        this.setupFloatingControlsBehavior();
        
        console.log('✅ PipX PiP Controls: Floating advanced controls created');
      }

      setupFloatingControlsBehavior() {
        // Show on mouse movement
        const showOnActivity = () => {
          if (document.pictureInPictureElement) {
            this.showFloatingControls();
          }
        };
        
        document.addEventListener('mousemove', showOnActivity);
        
        // Keep visible when hovering
        this.floatingControls.addEventListener('mouseenter', () => {
          clearTimeout(this.hideTimeout);
        });
        
        this.floatingControls.addEventListener('mouseleave', () => {
          this.hideTimeout = setTimeout(() => {
            this.hideFloatingControls();
          }, 1000);
        });
        
        // Store reference for cleanup
        this.showOnActivity = showOnActivity;
      }

      // Advanced control functions
      cycleSpeed(video) {
        const speeds = [0.5, 0.75, 1, 1.25, 1.5, 2];
        const currentIndex = speeds.indexOf(video.playbackRate);
        const nextIndex = (currentIndex + 1) % speeds.length;
        video.playbackRate = speeds[nextIndex];
        
        // Update button text
        const speedBtn = document.getElementById('pipx-speed');
        if (speedBtn) speedBtn.title = `Speed: ${video.playbackRate}x`;
        
        this.showControlFeedback(`⚡ Speed: ${video.playbackRate}x`);
      }

      cycleVolume(video) {
        const volumes = [0, 0.25, 0.5, 0.75, 1];
        const currentVolume = Math.round(video.volume * 100) / 100;
        let nextIndex = volumes.findIndex(v => v > currentVolume);
        if (nextIndex === -1) nextIndex = 0;
        
        video.volume = volumes[nextIndex];
        
        // Update button text
        const volumeBtn = document.getElementById('pipx-volume');
        if (volumeBtn) volumeBtn.title = `Volume: ${Math.round(video.volume * 100)}%`;
        
        this.showControlFeedback(`🔊 Volume: ${Math.round(video.volume * 100)}%`);
      }

      cycleTheme() {
        const themes = Object.keys(THEMES);
        const currentTheme = this.settings.appearance.theme;
        const currentIndex = themes.indexOf(currentTheme);
        const nextIndex = (currentIndex + 1) % themes.length;
        const newTheme = themes[nextIndex];
        
        // Update settings
        this.settings.appearance.theme = newTheme;
        // Note: In a real implementation, you'd save this to storage
        
        this.showControlFeedback(`🎨 Theme: ${THEMES[newTheme].name}`);
      }

      openQuickSettings() {
        this.showControlFeedback('⚙️ Quick Settings - Check Extension Popup');
        // Could trigger extension popup or show inline settings
      }

      updateMediaMetadata(video) {
        if (!navigator.mediaSession) return;
        
        // Extract video title and site info
        let title = document.title;
        let artist = window.location.hostname;
        
        // Look for video-specific title
        const titleSelectors = [
          'h1[class*="title"]',
          '[data-testid*="title"]',
          '.video-title',
          'h1'
        ];
        
        for (const selector of titleSelectors) {
          const element = document.querySelector(selector);
          if (element && element.textContent.trim()) {
            title = element.textContent.trim();
            break;
          }
        }
        
        // Set media metadata - this appears in the PiP window title bar
        navigator.mediaSession.metadata = new MediaMetadata({
          title: title,
          artist: artist,
          artwork: [
            {
              src: this.extractThumbnail(video) || '/favicon.ico',
              sizes: '512x512',
              type: 'image/png'
            }
          ]
        });
        
        console.log('🔵 PipX PiP Controls: Media metadata updated:', title);
      }

      extractThumbnail(video) {
        // Try to find video thumbnail
        const thumbnailSelectors = [
          'meta[property="og:image"]',
          'meta[name="twitter:image"]',
          '[class*="thumbnail"] img',
          'video[poster]'
        ];
        
        for (const selector of thumbnailSelectors) {
          const element = document.querySelector(selector);
          if (element) {
            const src = element.content || element.src || element.poster;
            if (src) return src;
          }
        }
        
        return video.poster || null;
      }

      setupVideoKeyboardControls(video) {
        if (!this.settings.core.keyboardShortcuts) return;
        
        console.log('🔵 PipX PiP Controls: Setting up keyboard controls');
        
        const handleKeydown = (e) => {
          // Only handle when PiP is active and video is the PiP element
          if (document.pictureInPictureElement !== video) return;
          
          let handled = false;
          
          switch(e.key.toLowerCase()) {
            case ' ':
            case 'k':
              e.preventDefault();
              video.paused ? video.play() : video.pause();
              this.showControlFeedback(video.paused ? '⏸️ Paused' : '▶️ Playing');
              handled = true;
              break;
              
            case 'arrowleft':
              e.preventDefault();
              const backwardTime = e.shiftKey ? 30 : 5;
              video.currentTime = Math.max(0, video.currentTime - backwardTime);
              this.showControlFeedback(`⏪ -${backwardTime}s`);
              handled = true;
              break;
              
            case 'arrowright':
              e.preventDefault();
              const forwardTime = e.shiftKey ? 30 : 5;
              video.currentTime = Math.min(video.duration, video.currentTime + forwardTime);
              this.showControlFeedback(`⏩ +${forwardTime}s`);
              handled = true;
              break;
              
            case 'arrowup':
              e.preventDefault();
              const volumeUp = e.shiftKey ? 0.1 : 0.05;
              video.volume = Math.min(1, video.volume + volumeUp);
              this.showControlFeedback(`🔊 ${Math.round(video.volume * 100)}%`);
              handled = true;
              break;
              
            case 'arrowdown':
              e.preventDefault();
              const volumeDown = e.shiftKey ? 0.1 : 0.05;
              video.volume = Math.max(0, video.volume - volumeDown);
              this.showControlFeedback(`🔉 ${Math.round(video.volume * 100)}%`);
              handled = true;
              break;
              
            case 'm':
              e.preventDefault();
              video.muted = !video.muted;
              this.showControlFeedback(video.muted ? '🔇 Muted' : '🔊 Unmuted');
              handled = true;
              break;
              
            case 'j':
              e.preventDefault();
              video.currentTime = Math.max(0, video.currentTime - 10);
              this.showControlFeedback('⏪ -10s');
              handled = true;
              break;
              
            case 'l':
              e.preventDefault();
              video.currentTime = Math.min(video.duration, video.currentTime + 10);
              this.showControlFeedback('⏩ +10s');
              handled = true;
              break;
              
            case ',':
              e.preventDefault();
              this.cycleSpeed(video);
              handled = true;
              break;
              
            case '.':
              e.preventDefault();
              this.cycleSpeed(video);
              handled = true;
              break;
              
            case 'escape':
              e.preventDefault();
              document.exitPictureInPicture();
              handled = true;
              break;
          }
          
          if (handled) {
            // Update position state for media session
            this.updatePositionState(video);
            // Show floating controls briefly
            this.showFloatingControls();
          }
        };
        
        document.addEventListener('keydown', handleKeydown, true);
        this.keyboardHandler = handleKeydown;
      }

      updatePositionState(video) {
        if (navigator.mediaSession.setPositionState && video.duration) {
          try {
            navigator.mediaSession.setPositionState({
              duration: video.duration,
              playbackRate: video.playbackRate,
              position: video.currentTime
            });
          } catch (error) {
            // Ignore position state errors
          }
        }
      }

      setupGlobalKeyboardShortcuts() {
        // Global shortcuts that work even when focus is elsewhere
        document.addEventListener('keydown', (e) => {
          if (!document.pictureInPictureElement) return;
          
          if (e.ctrlKey && e.key.toLowerCase() === 'p') {
            e.preventDefault();
            document.exitPictureInPicture();
            this.showControlFeedback('❌ Exiting PiP');
          }
        });
      }

      showControlFeedback(message) {
        if (!this.settings.core.showNotifications) return;
        
        // Show feedback in main window (this is OK since it's just temporary notification)
        const existing = document.querySelector('.pip-control-feedback');
        if (existing) existing.remove();
        
        const feedback = document.createElement('div');
        feedback.className = 'pip-control-feedback';
        feedback.style.cssText = `
          position: fixed;
          top: 20px;
          left: 50%;
          transform: translateX(-50%);
          background: rgba(0, 0, 0, 0.9);
          color: white;
          padding: 12px 20px;
          border-radius: 8px;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          font-size: 14px;
          font-weight: 500;
          z-index: 10001;
          pointer-events: none;
          backdrop-filter: blur(15px);
          border: 1px solid rgba(255, 255, 255, 0.1);
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
        `;
        
        feedback.textContent = message;
        document.body.appendChild(feedback);
        
        // Animate in
        feedback.style.opacity = '0';
        feedback.style.transform = 'translateX(-50%) translateY(-10px)';
        
        requestAnimationFrame(() => {
          feedback.style.transition = 'all 0.3s ease';
          feedback.style.opacity = '1';
          feedback.style.transform = 'translateX(-50%) translateY(0)';
        });
        
        // Auto remove
        setTimeout(() => {
          feedback.style.opacity = '0';
          feedback.style.transform = 'translateX(-50%) translateY(-10px)';
          setTimeout(() => feedback.remove(), 300);
        }, 2000);
      }

      cleanup() {
        console.log('🔵 PipX PiP Controls: Cleaning up...');
        
        // Remove keyboard handler
        if (this.keyboardHandler) {
          document.removeEventListener('keydown', this.keyboardHandler, true);
          this.keyboardHandler = null;
        }
        
        // Remove activity handler
        if (this.showOnActivity) {
          document.removeEventListener('mousemove', this.showOnActivity);
          this.showOnActivity = null;
        }
        
        // Clear timeouts
        clearTimeout(this.hideTimeout);
        
        // Clear media session
        if (this.mediaSessionActive && navigator.mediaSession) {
          navigator.mediaSession.setActionHandler('play', null);
          navigator.mediaSession.setActionHandler('pause', null);
          navigator.mediaSession.setActionHandler('seekbackward', null);
          navigator.mediaSession.setActionHandler('seekforward', null);
          navigator.mediaSession.setActionHandler('seekto', null);
          this.mediaSessionActive = false;
        }
        
        // Remove floating controls
        if (this.floatingControls) {
          this.floatingControls.remove();
          this.floatingControls = null;
        }
        
        // Reset state
        this.currentVideo = null;
        this.pipWindow = null;
        
        console.log('✅ PipX PiP Controls: Cleanup complete');
      }
    }
  
    // Initialize PiP controls manager
    const pipControlsManager = new PipControlsManager();
    
    // Cleanup on page unload
    window.addEventListener('beforeunload', () => {
      pipControlsManager.cleanup();
    });
    
    // Expose for external access
    window.pipControlsManager = pipControlsManager;
  
})(); 
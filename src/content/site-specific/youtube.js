// YouTube-specific Picture-in-Picture enhancements

(function() {
    'use strict';
  
    console.log('🔵 PipX: Loading YouTube script...');
  
    // Only run on YouTube
    if (!window.location.hostname.includes('youtube.com')) {
      console.log('🟡 PipX: Not on YouTube, skipping YouTube manager');
      return;
    }

    console.log('🔵 PipX: On YouTube, initializing YouTube manager...');

    class YouTubePipManager {
      constructor() {
        this.player = null;
        this.video = null;
        this.pipButton = null;
        this.chaptersData = [];
        this.currentChapter = null;
        this.observer = null;
        this.initialized = false;
        this.settings = null;
        
        // Initialize asynchronously
        this.init();
      }

      async init() {
        try {
          // Get current settings
          this.settings = await getSettings();
          
          if (!this.settings.sites.youtube.enhancedControls) {
            this.initialized = false;
            return;
          }

          this.waitForPlayer();
          this.setupPlayerObserver();
          this.setupChapterDetection();
          this.setupSkipIntroFeature();
          this.initialized = true;
        } catch (error) {
          console.warn('Failed to initialize YouTubePipManager:', error);
          this.initialized = false;
        }
      }

      waitForPlayer() {
        // Wait for YouTube player to be ready
        const checkPlayer = () => {
          const video = document.querySelector('video');
          const player = document.querySelector('.html5-video-player');
          
          if (video && player) {
            this.video = video;
            this.player = player;
            this.setupYouTubeEnhancements();
          } else {
            setTimeout(checkPlayer, 500);
          }
        };
        
        checkPlayer();
      }

      setupPlayerObserver() {
        // Watch for player changes (new videos, navigation)
        this.observer = new MutationObserver((mutations) => {
          let shouldUpdate = false;
          
          mutations.forEach((mutation) => {
            if (mutation.type === 'childList') {
              // Check if video element changed
              const newVideo = document.querySelector('video');
              if (newVideo && newVideo !== this.video) {
                this.video = newVideo;
                shouldUpdate = true;
              }
              
              // Check if controls changed
              if (mutation.target.closest('.ytp-right-controls')) {
                shouldUpdate = true;
              }
            }
          });
          
          if (shouldUpdate) {
            this.updateEnhancements();
          }
        });

        this.observer.observe(document.body, {
          childList: true,
          subtree: true
        });
      }

      setupYouTubeEnhancements() {
        if (!this.settings) return;
        
        this.createCustomPipButton();
        this.setupVideoEventHandlers();
        this.extractChapters();
        this.setupYouTubeKeyboardShortcuts();
      }

      updateEnhancements() {
        // Remove existing button to avoid duplicates
        if (this.pipButton) {
          this.pipButton.remove();
          this.pipButton = null;
        }
        
        // Recreate enhancements
        setTimeout(() => {
          this.setupYouTubeEnhancements();
        }, 100);
      }

      createCustomPipButton() {
        if (!this.settings || !this.settings.sites.youtube.customButton) return;
        
        const controlsContainer = document.querySelector('.ytp-right-controls');
        if (!controlsContainer || controlsContainer.querySelector('.yt-pip-button')) return;

        const theme = THEMES[this.settings.appearance.theme] || THEMES.default;
        
        this.pipButton = document.createElement('button');
        this.pipButton.className = 'ytp-button yt-pip-button';
        this.pipButton.title = 'Enhanced Picture-in-Picture';
        this.pipButton.setAttribute('data-tooltip-target-id', 'ytp-pip-button');
        
        // Create SVG icon for better integration
        this.pipButton.innerHTML = `
          <svg height="100%" version="1.1" viewBox="0 0 24 24" width="100%">
            <path fill="currentColor" d="M19 7h-8v6h8V7zm2-4H3c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h18c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H3V5h18v14z"/>
            <path fill="currentColor" d="M12 9v4h6V9h-6z"/>
          </svg>
        `;
        
        this.pipButton.style.cssText = `
          width: 48px;
          height: 48px;
          padding: 8px;
          margin: 0 4px;
          background: transparent;
          border: none;
          cursor: pointer;
          opacity: 0.8;
          transition: opacity 0.2s ease;
          color: white;
        `;
        
        this.pipButton.addEventListener('mouseenter', () => {
          this.pipButton.style.opacity = '1';
        });
        
        this.pipButton.addEventListener('mouseleave', () => {
          this.pipButton.style.opacity = '0.8';
        });
        
        this.pipButton.addEventListener('click', (e) => {
          e.stopPropagation();
          this.triggerEnhancedPip();
        });
        
        // Insert before settings button
        const settingsButton = controlsContainer.querySelector('.ytp-settings-button');
        if (settingsButton) {
          controlsContainer.insertBefore(this.pipButton, settingsButton);
        } else {
          controlsContainer.appendChild(this.pipButton);
        }
      }

      async triggerEnhancedPip() {
        if (!this.initialized || !this.settings) {
          console.warn('YouTubePipManager not yet initialized');
          return false;
        }

        try {
          if (document.pictureInPictureElement) {
            await document.exitPictureInPicture();
            return;
          }

          if (!this.video) {
            this.showYouTubeNotification('No video found', 'error');
            return;
          }

          await this.video.requestPictureInPicture();
          this.setupPipEnhancements();
          this.showYouTubeNotification('Enhanced PiP activated', 'success');
          
        } catch (error) {
          console.warn('YouTube PiP failed:', error);
          this.showYouTubeNotification('PiP activation failed', 'error');
        }
      }

      setupPipEnhancements() {
        // Add YouTube-specific PiP enhancements
        this.setupChapterNavigation();
        this.setupYouTubePipControls();
        this.updatePipTitle();
      }

      setupVideoEventHandlers() {
        if (!this.video) return;
        
        // Update chapters when video metadata loads
        this.video.addEventListener('loadedmetadata', () => {
          this.extractChapters();
        });
        
        // Update current chapter during playback
        this.video.addEventListener('timeupdate', () => {
          this.updateCurrentChapter();
        });
        
        // Handle PiP events
        this.video.addEventListener('enterpictureinpicture', () => {
          this.setupPipEnhancements();
        });
        
        this.video.addEventListener('leavepictureinpicture', () => {
          this.cleanupPipEnhancements();
        });
      }

      extractChapters() {
        if (!this.settings || !this.settings.sites.youtube.showChapters) return;
        
        this.chaptersData = [];
        
        // Method 1: Check progress bar chapters
        const chapters = document.querySelectorAll('.ytp-chapter-hover-container');
        if (chapters.length > 0) {
          chapters.forEach((chapter, index) => {
            const timeElement = chapter.querySelector('.ytp-chapter-title-content');
            const titleElement = chapter.querySelector('.ytp-chapter-title');
            
            if (timeElement && titleElement) {
              this.chaptersData.push({
                index,
                title: titleElement.textContent.trim(),
                time: this.parseTimeToSeconds(timeElement.textContent)
              });
            }
          });
        }
        
        // Method 2: Check description for timestamps
        if (this.chaptersData.length === 0) {
          this.extractChaptersFromDescription();
        }
      }

      extractChaptersFromDescription() {
        const description = document.querySelector('#description-text, #meta-contents #description');
        if (!description) return;
        
        const text = description.textContent;
        const timestampRegex = /(\d{1,2}:)?(\d{1,2}):(\d{2})\s+(.+?)(?=\n|$)/g;
        const matches = [...text.matchAll(timestampRegex)];
        
        if (matches.length > 1) {
          this.chaptersData = matches.map((match, index) => {
            const hours = match[1] ? parseInt(match[1].replace(':', '')) : 0;
            const minutes = parseInt(match[2]);
            const seconds = parseInt(match[3]);
            const time = hours * 3600 + minutes * 60 + seconds;
            
            return {
              index,
              title: match[4].trim(),
              time: time
            };
          });
        }
      }

      parseTimeToSeconds(timeString) {
        const parts = timeString.split(':').reverse();
        let seconds = 0;
        
        for (let i = 0; i < parts.length; i++) {
          seconds += parseInt(parts[i]) * Math.pow(60, i);
        }
        
        return seconds;
      }

      updateCurrentChapter() {
        if (this.chaptersData.length === 0 || !this.video) return;
        
        const currentTime = this.video.currentTime;
        let currentChapter = null;
        
        for (let i = this.chaptersData.length - 1; i >= 0; i--) {
          if (currentTime >= this.chaptersData[i].time) {
            currentChapter = this.chaptersData[i];
            break;
          }
        }
        
        if (currentChapter !== this.currentChapter) {
          this.currentChapter = currentChapter;
          this.updatePipTitle();
        }
      }

      updatePipTitle() {
        if (!document.pictureInPictureElement || !this.video) return;
        
        // Update media session metadata
        if (navigator.mediaSession) {
          const videoTitle = document.querySelector('h1.ytd-video-primary-info-renderer, h1.ytd-watch-metadata')?.textContent?.trim();
          const channelName = document.querySelector('#owner-name a, #channel-name a')?.textContent?.trim();
          
          let title = videoTitle || 'YouTube Video';
          if (this.currentChapter && this.settings && this.settings.sites.youtube.showChapters) {
            title += ` - ${this.currentChapter.title}`;
          }
          
          navigator.mediaSession.metadata = new MediaMetadata({
            title: title,
            artist: channelName || 'YouTube',
            artwork: [
              {
                src: document.querySelector('.ytp-cued-thumbnail-overlay-image')?.src || 
                     `https://img.youtube.com/vi/${this.getVideoId()}/maxresdefault.jpg`,
                sizes: '320x180',
                type: 'image/jpeg'
              }
            ]
          });
        }
      }

      getVideoId() {
        const urlParams = new URLSearchParams(window.location.search);
        return urlParams.get('v') || '';
      }

      setupChapterNavigation() {
        if (this.chaptersData.length === 0) return;
        
        // Add chapter navigation to media session
        if (navigator.mediaSession) {
          navigator.mediaSession.setActionHandler('previoustrack', () => {
            this.goToPreviousChapter();
          });
          
          navigator.mediaSession.setActionHandler('nexttrack', () => {
            this.goToNextChapter();
          });
        }
      }

      goToPreviousChapter() {
        if (!this.video || this.chaptersData.length === 0) return;
        
        const currentTime = this.video.currentTime;
        let targetChapter = null;
        
        // If we're more than 3 seconds into current chapter, go to its start
        if (this.currentChapter && currentTime - this.currentChapter.time > 3) {
          targetChapter = this.currentChapter;
        } else {
          // Otherwise go to previous chapter
          const currentIndex = this.currentChapter ? this.currentChapter.index : 0;
          if (currentIndex > 0) {
            targetChapter = this.chaptersData[currentIndex - 1];
          }
        }
        
        if (targetChapter) {
          this.video.currentTime = targetChapter.time;
          this.showChapterNotification(targetChapter);
        }
      }

      goToNextChapter() {
        if (!this.video || this.chaptersData.length === 0) return;
        
        const currentIndex = this.currentChapter ? this.currentChapter.index : -1;
        if (currentIndex < this.chaptersData.length - 1) {
          const nextChapter = this.chaptersData[currentIndex + 1];
          this.video.currentTime = nextChapter.time;
          this.showChapterNotification(nextChapter);
        }
      }

      showChapterNotification(chapter) {
        this.showYouTubeNotification(`📖 ${chapter.title}`, 'info');
      }

      setupYouTubeKeyboardShortcuts() {
        document.addEventListener('keydown', (e) => {
          if (!document.pictureInPictureElement) return;
          
          // YouTube-specific shortcuts for PiP
          switch(e.key.toLowerCase()) {
            case 'n':
              e.preventDefault();
              this.goToNextChapter();
              break;
              
            case 'p':
              if (!e.ctrlKey && !e.altKey) {
                e.preventDefault();
                this.goToPreviousChapter();
              }
              break;
              
            case 't':
              e.preventDefault();
              this.toggleTheaterMode();
              break;
          }
        });
      }

      setupYouTubePipControls() {
        // Enhanced controls specific to YouTube
        const controls = document.querySelector('.pip-controls-overlay');
        if (!controls) return;
        
        // Add YouTube-specific buttons if chapters exist
        if (this.chaptersData.length > 0) {
          this.addChapterControls(controls);
        }
      }

      addChapterControls(controlsContainer) {
        // Add previous/next chapter buttons
        const chapterPrev = document.createElement('button');
        chapterPrev.innerHTML = '⏮️';
        chapterPrev.title = 'Previous Chapter (P)';
        chapterPrev.style.cssText = `
          background: none;
          border: none;
          color: white;
          font-size: 16px;
          padding: 6px;
          border-radius: 4px;
          cursor: pointer;
          transition: background 0.2s ease;
        `;
        
        const chapterNext = document.createElement('button');
        chapterNext.innerHTML = '⏭️';
        chapterNext.title = 'Next Chapter (N)';
        chapterNext.style.cssText = chapterPrev.style.cssText;
        
        chapterPrev.addEventListener('click', () => this.goToPreviousChapter());
        chapterNext.addEventListener('click', () => this.goToNextChapter());
        
        // Insert after the first button
        const firstButton = controlsContainer.querySelector('button');
        if (firstButton) {
          controlsContainer.insertBefore(chapterNext, firstButton.nextSibling);
          controlsContainer.insertBefore(chapterPrev, chapterNext);
        }
      }

      setupSkipIntroFeature() {
        if (!this.settings || !this.settings.sites.youtube.skipIntro) return;
        
        // Watch for skip intro button
        const observer = new MutationObserver(() => {
          const skipButton = document.querySelector('.ytp-skip-intro-button');
          if (skipButton && document.pictureInPictureElement) {
            this.showYouTubeNotification('⏭️ Skip intro available', 'info');
            
            // Auto-click if user prefers
            setTimeout(() => {
              if (skipButton.offsetParent !== null) {
                skipButton.click();
                this.showYouTubeNotification('⏭️ Skipped intro', 'success');
              }
            }, 1000);
          }
        });
        
        observer.observe(document.body, {
          childList: true,
          subtree: true
        });
      }

      setupChapterDetection() {
        // This method exists for initialization consistency
      }

      toggleTheaterMode() {
        const theaterButton = document.querySelector('.ytp-size-button');
        if (theaterButton) {
          theaterButton.click();
          this.showYouTubeNotification('🎭 Theater mode toggled', 'info');
        }
      }

      showYouTubeNotification(message, type = 'info') {
        if (!this.settings || !this.settings.core.showNotifications) return;
        
        const notification = document.createElement('div');
        notification.className = `yt-pip-notification yt-pip-notification-${type}`;
        
        const theme = THEMES[this.settings.appearance.theme] || THEMES.default;
        const typeColors = {
          success: '#00ff00',
          warning: '#ffaa00',
          error: '#ff4444',
          info: '#ff0000' // YouTube red
        };
        
        notification.style.cssText = `
          position: fixed;
          top: 20px;
          left: 20px;
          background: ${typeColors[type]};
          color: white;
          padding: 12px 20px;
          border-radius: 20px;
          font-family: Roboto, Arial, sans-serif;
          font-size: 14px;
          font-weight: 500;
          box-shadow: 0 4px 12px rgba(0,0,0,0.3);
          z-index: 10001;
          transform: translateX(-100%);
          opacity: 0;
          transition: all 0.3s ease;
          max-width: 280px;
          border: 2px solid rgba(255,255,255,0.2);
        `;
        
        notification.innerHTML = `
          <div style="display: flex; align-items: center; gap: 8px;">
            <span style="font-size: 16px;">▶️</span>
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

      cleanupPipEnhancements() {
        // Clean up YouTube-specific PiP features
        if (navigator.mediaSession) {
          navigator.mediaSession.setActionHandler('previoustrack', null);
          navigator.mediaSession.setActionHandler('nexttrack', null);
        }
      }

      cleanup() {
        if (this.observer) {
          this.observer.disconnect();
        }
        
        if (this.pipButton) {
          this.pipButton.remove();
        }
        
        this.cleanupPipEnhancements();
      }
    }

    // Initialize YouTube PiP manager and expose it immediately
    const youtubePipManager = new YouTubePipManager();
    
    // Cleanup on page unload
    window.addEventListener('beforeunload', () => {
      youtubePipManager.cleanup();
    });
    
    // Expose for external access - available immediately
    window.youtubePipManager = youtubePipManager;
    console.log('✅ PipX: youtubePipManager exposed to window');
    console.log('🔵 PipX: window.youtubePipManager available:', typeof window.youtubePipManager !== 'undefined');

})(); 
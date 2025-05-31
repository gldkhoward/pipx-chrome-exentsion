// Simple Manifest V3 compliant PiP script
console.log('🔵 PipX Simple: Script loading...');

// Simple settings object (no external dependencies)
const SIMPLE_SETTINGS = {
  autoPip: true,
  keyboardShortcuts: true,
  enableManualPip: true,
  showNotifications: true
};

class SimplePipManager {
  constructor() {
    console.log('🔵 PipX Simple: Creating SimplePipManager');
    this.currentVideo = null;
    this.initialized = false;
    this.init();
  }

  init() {
    console.log('🔵 PipX Simple: Initializing...');
    this.setupKeyboardShortcuts();
    this.initialized = true;
    console.log('✅ PipX Simple: Initialized successfully');
  }

  setupKeyboardShortcuts() {
    document.addEventListener('keydown', (e) => {
      // Alt+P shortcut
      if (e.altKey && e.key.toLowerCase() === 'p' && !document.pictureInPictureElement) {
        e.preventDefault();
        this.triggerPip();
      }
    });
  }

  async triggerPip() {
    console.log('🔵 PipX Simple: Triggering PiP...');
    
    try {
      if (document.pictureInPictureElement) {
        await document.exitPictureInPicture();
        return true;
      }

      const video = this.findBestVideo();
      if (!video) {
        console.warn('🔴 PipX Simple: No video found');
        return false;
      }

      await video.requestPictureInPicture();
      console.log('✅ PipX Simple: PiP activated');
      return true;
      
    } catch (error) {
      console.error('🔴 PipX Simple: PiP failed:', error);
      return false;
    }
  }

  findBestVideo() {
    const videos = Array.from(document.querySelectorAll('video'))
      .filter(video => {
        return video.readyState !== 0 && 
               !video.disablePictureInPicture &&
               video.videoWidth > 0 && 
               video.videoHeight > 0;
      });

    if (videos.length === 0) return null;

    // Return the first playing video, or just the first video
    return videos.find(v => !v.paused) || videos[0];
  }
}

// Initialize and expose
try {
  const simplePipManager = new SimplePipManager();
  window.pipManager = simplePipManager;
  console.log('✅ PipX Simple: Manager exposed to window');
} catch (error) {
  console.error('🔴 PipX Simple: Failed to initialize:', error);
} 
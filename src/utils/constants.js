// Default settings and constants

console.log('🔵 PipX: Loading constants...');

const DEFAULT_SETTINGS = {
    // Core functionality
    core: {
      autoPip: true,
      keyboardShortcuts: true,
      autoEnterDelay: 2000,
      autoExitOnReturn: false,
      enableManualPip: true,
      showNotifications: true
    },
    
    // Visual customization
    appearance: {
      theme: 'default',
      progressBar: {
        color: '#4285f4',
        style: 'rounded',
        position: 'bottom',
        thickness: 4,
        showTime: true
      },
      pipWindow: {
        borderStyle: 'none',
        cornerRadius: 8,
        opacity: 1.0,
        showControls: true
      },
      animations: {
        enabled: true,
        duration: 300,
        easing: 'ease-out'
      }
    },
    
    // Site-specific settings
    sites: {
      excludedSites: [],
      youtube: {
        enhancedControls: true,
        skipIntro: false,
        showChapters: true,
        customButton: true
      },
      netflix: {
        skipRecap: false,
        enhancedControls: true
      },
      twitch: {
        enhancedControls: true,
        showChat: false
      },
      generic: {
        enhancedControls: true,
        showOverlay: true
      }
    },
    
    // Fun features
    personality: {
      mode: 'default',
      soundEffects: false,
      easterEggs: true,
      holidayThemes: true
    }
  };
  
  // Theme definitions
  const THEMES = {
    default: {
      name: 'Default',
      colors: {
        primary: '#4285f4',
        secondary: '#34a853',
        background: '#ffffff',
        text: '#202124',
        accent: '#ea4335'
      },
      styles: {
        borderRadius: '8px',
        shadow: '0 2px 8px rgba(0,0,0,0.1)'
      }
    },
    dark: {
      name: 'Dark',
      colors: {
        primary: '#8ab4f8',
        secondary: '#81c995',
        background: '#1a1a1a',
        text: '#e8eaed',
        accent: '#f28b82'
      },
      styles: {
        borderRadius: '8px',
        shadow: '0 2px 8px rgba(0,0,0,0.3)'
      }
    },
    gaming: {
      name: 'Gaming',
      colors: {
        primary: '#00ff88',
        secondary: '#ff0088',
        background: '#0d1117',
        text: '#ffffff',
        accent: '#ffd700'
      },
      styles: {
        borderRadius: '0px',
        shadow: '0 0 20px rgba(0,255,136,0.3)'
      }
    },
    zen: {
      name: 'Zen',
      colors: {
        primary: '#81c784',
        secondary: '#64b5f6',
        background: '#f3f4f6',
        text: '#374151',
        accent: '#ffb74d'
      },
      styles: {
        borderRadius: '16px',
        shadow: '0 4px 16px rgba(0,0,0,0.05)'
      }
    }
  };
  
  // Keyboard shortcuts
  const KEYBOARD_SHORTCUTS = {
    TOGGLE_PLAY_PAUSE: ' ',
    SEEK_BACKWARD: 'ArrowLeft',
    SEEK_FORWARD: 'ArrowRight',
    VOLUME_UP: 'ArrowUp',
    VOLUME_DOWN: 'ArrowDown',
    MUTE_TOGGLE: 'm',
    FULLSCREEN_EXIT: 'Escape',
    SKIP_BACKWARD: 'j',
    SKIP_FORWARD: 'l',
    SPEED_DECREASE: ',',
    SPEED_INCREASE: '.'
  };
  
  // Site-specific selectors and configs
  const SITE_CONFIGS = {
    'youtube.com': {
      videoSelector: 'video',
      playerSelector: '.html5-video-player',
      controlsSelector: '.ytp-right-controls',
      progressSelector: '.ytp-progress-bar',
      skipIntroSelector: '.ytp-skip-intro-button'
    },
    'netflix.com': {
      videoSelector: 'video',
      playerSelector: '.VideoContainer',
      controlsSelector: '.PlayerControlsNeo__layout',
      skipSelector: '[data-uia="skip-intro"], [data-uia="skip-recap"]'
    },
    'twitch.tv': {
      videoSelector: 'video',
      playerSelector: '.video-player',
      controlsSelector: '.player-controls__right-control-group'
    },
    'vimeo.com': {
      videoSelector: 'video',
      playerSelector: '.vp-player',
      controlsSelector: '.vp-controls'
    }
  };
  
  // Animation presets
  const ANIMATIONS = {
    slideIn: 'slideInFromRight 0.3s ease-out',
    fadeIn: 'fadeIn 0.3s ease-out',
    bounce: 'bounceIn 0.5s ease-out',
    zoom: 'zoomIn 0.3s ease-out'
  };
  
  // Export for use in other modules
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
      DEFAULT_SETTINGS,
      THEMES,
      KEYBOARD_SHORTCUTS,
      SITE_CONFIGS,
      ANIMATIONS
    };
  }

console.log('✅ PipX: Constants loaded successfully');
console.log('🔵 PipX: DEFAULT_SETTINGS available:', typeof DEFAULT_SETTINGS !== 'undefined');
console.log('🔵 PipX: THEMES available:', typeof THEMES !== 'undefined');
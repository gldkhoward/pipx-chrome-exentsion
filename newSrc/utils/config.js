// PipX Configuration System
// Central configuration for all extension features

// Guard against multiple executions
if (!window.PipXConfig) {

const DEFAULT_CONFIG = {
  // Theme & Appearance
  theme: {
    primaryColor: '#A3E635',    // Lime green highlight
    backgroundColor: '#000000',  // Black background
    textColor: '#FFFFFF',       // White text
    controlOpacity: 0.9,
    animationDuration: 300,     // ms
    borderRadius: 8,            // px
  },
  
  // PiP Window Settings
  window: {
    defaultWidth: 400,
    defaultHeight: 300,
    minWidth: 200,
    minHeight: 150,
    maxWidth: 800,
    maxHeight: 600,
    rememberSize: true,
    rememberPosition: true,
  },
  
  // Control Settings
  controls: {
    autoHide: true,
    autoHideDelay: 3000,        // ms
    showOnHover: true,
    showProgress: true,
    showVolume: true,
    showTime: true,
    showSpeed: true,
    showNext: false,            // Site-specific
    showPrevious: false,        // Site-specific
  },
  
  // Behavior Settings
  behavior: {
    autoPlay: false,
    closeOnVideoEnd: false,
    pauseOnClose: true,
    resumeOnReopen: true,
    smartVideoDetection: true,
    preferLargestVideo: true,
  },
  
  // Keyboard Shortcuts
  shortcuts: {
    toggle: 'Alt+P',
    close: 'Escape',
    playPause: 'Space',
    seekForward: 'ArrowRight',
    seekBackward: 'ArrowLeft',
    volumeUp: 'ArrowUp',
    volumeDown: 'ArrowDown',
    mute: 'M',
    fullscreen: 'F',
  },
  
  // Site-specific settings
  sites: {
    enabled: true,
    configs: {
      'youtube.com': {
        name: 'YouTube',
        features: ['next', 'previous', 'chapters', 'quality'],
        selectors: {
          video: 'video',
          nextButton: '.ytp-next-button',
          prevButton: '.ytp-prev-button',
          playButton: '.ytp-play-button',
        },
        customControls: true,
      },
      'netflix.com': {
        name: 'Netflix',
        features: ['next', 'previous', 'subtitles'],
        selectors: {
          video: 'video',
          nextButton: '[data-uia="next-episode-seamless-button"]',
          prevButton: '[data-uia="previous-episode-button"]',
        },
        customControls: true,
      },
      'vimeo.com': {
        name: 'Vimeo',
        features: ['quality', 'chapters'],
        selectors: {
          video: 'video',
        },
        customControls: true,
      },
      'twitch.tv': {
        name: 'Twitch',
        features: ['quality', 'chat'],
        selectors: {
          video: 'video',
        },
        customControls: true,
      },
    },
  },
};

// Site detection utilities
class SiteDetector {
  static getCurrentSite() {
    const hostname = window.location.hostname.toLowerCase();
    
    // Remove www. prefix
    const cleanHostname = hostname.replace(/^www\./, '');
    
    // Check for exact matches first
    if (DEFAULT_CONFIG.sites.configs[cleanHostname]) {
      return cleanHostname;
    }
    
    // Check for partial matches (e.g., subdomain.youtube.com)
    for (const site in DEFAULT_CONFIG.sites.configs) {
      if (cleanHostname.includes(site)) {
        return site;
      }
    }
    
    return 'generic';
  }
  
  static getSiteConfig(site = null) {
    const currentSite = site || this.getCurrentSite();
    return DEFAULT_CONFIG.sites.configs[currentSite] || {
      name: 'Generic',
      features: [],
      selectors: { video: 'video' },
      customControls: true,
    };
  }
  
  static isSiteSupported(site = null) {
    const currentSite = site || this.getCurrentSite();
    return currentSite !== 'generic';
  }
}

// Configuration manager
class ConfigManager {
  static async load() {
    try {
      const stored = await chrome.storage.sync.get('pipx_config');
      return this.mergeConfig(DEFAULT_CONFIG, stored.pipx_config || {});
    } catch (error) {
      console.warn('Failed to load config, using defaults:', error);
      return DEFAULT_CONFIG;
    }
  }
  
  static async save(config) {
    try {
      await chrome.storage.sync.set({ pipx_config: config });
      return true;
    } catch (error) {
      console.error('Failed to save config:', error);
      return false;
    }
  }
  
  static async update(updates) {
    const current = await this.load();
    const updated = this.mergeConfig(current, updates);
    return await this.save(updated);
  }
  
  static mergeConfig(base, updates) {
    const result = JSON.parse(JSON.stringify(base)); // Deep clone
    
    function merge(target, source) {
      for (const key in source) {
        if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
          target[key] = target[key] || {};
          merge(target[key], source[key]);
        } else {
          target[key] = source[key];
        }
      }
    }
    
    merge(result, updates);
    return result;
  }
  
  static async reset() {
    return await this.save(DEFAULT_CONFIG);
  }
}

// Icon utilities
class IconManager {
  static getIconUrl(iconName) {
    return chrome.runtime.getURL(`assets/icons/${iconName}.svg`);
  }
  
  static async loadIcon(iconName) {
    try {
      const url = this.getIconUrl(iconName);
      const response = await fetch(url);
      return await response.text();
    } catch (error) {
      console.error(`Failed to load icon ${iconName}:`, error);
      return null;
    }
  }
  
  static createIconElement(iconName, className = '') {
    const iconUrl = this.getIconUrl(iconName);
    const img = document.createElement('img');
    img.src = iconUrl;
    img.className = `pipx-icon ${className}`;
    img.alt = iconName;
    return img;
  }
  
  static async createSVGIcon(iconName, className = '') {
    const svgContent = await this.loadIcon(iconName);
    if (!svgContent) return null;
    
    const div = document.createElement('div');
    div.innerHTML = svgContent;
    const svg = div.querySelector('svg');
    
    if (svg) {
      // Use setAttribute for SVG elements since className is read-only
      svg.setAttribute('class', `pipx-icon ${className}`);
      svg.removeAttribute('width');
      svg.removeAttribute('height');
      // Remove any potential background styling
      svg.style.background = 'none';
      svg.style.backgroundColor = 'transparent';
      svg.style.border = 'none';
      svg.style.borderRadius = '0';
    }
    
    return svg;
  }
}

// Export for use in other modules
window.PipXConfig = {
  DEFAULT_CONFIG,
  SiteDetector,
  ConfigManager,
  IconManager,
};
} 
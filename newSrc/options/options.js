// PipX Options Page Script - Comprehensive Settings Management

// Access configuration utilities from global scope
const { ConfigManager, DEFAULT_CONFIG } = window.PipXConfig || {};

class OptionsController {
  constructor() {
    this.config = null;
    this.currentSection = 'theme';
    this.unsavedChanges = false;
    this.init();
  }

  async init() {
    console.log('🔵 PipX Options: Initializing...');
    
    try {
      // Check if ConfigManager is available
      if (!ConfigManager) {
        throw new Error('ConfigManager not available. Please ensure config.js is loaded.');
      }
      
      // Load current configuration
      this.config = await ConfigManager.load();
      
      // Validate config
      if (!this.config) {
        throw new Error('Failed to load configuration');
      }
      
      // Setup navigation
      this.setupNavigation();
      
      // Setup event listeners
      this.setupEventListeners();
      
      // Populate form fields
      this.populateForm();
      
      // Setup theme preview
      this.setupThemePreview();
      
      // Setup site configurations
      this.setupSiteConfigurations();
      
      // Force refresh navigation icon colors to ensure clean state
      this.forceRefreshIconColors();
      
      console.log('✅ PipX Options: Initialized successfully');
    } catch (error) {
      console.error('❌ PipX Options: Initialization failed:', error);
      this.showMessage('Failed to load settings: ' + error.message, 'error');
      
      // Fallback to default config if available
      if (DEFAULT_CONFIG) {
        console.log('🔄 Using fallback default configuration');
        this.config = DEFAULT_CONFIG;
        this.populateForm();
      }
    }
  }

  setupNavigation() {
    const navButtons = document.querySelectorAll('.nav-btn');
    
    navButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        const section = btn.dataset.section;
        this.switchSection(section);
      });
    });
  }

  switchSection(sectionName) {
    // Update navigation
    document.querySelectorAll('.nav-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.section === sectionName);
    });
    
    // Update sections
    document.querySelectorAll('.options-section').forEach(section => {
      section.classList.toggle('active', section.id === `${sectionName}-section`);
    });
    
    // Update navigation icon colors
    this.updateNavigationIconColors();
    
    this.currentSection = sectionName;
  }

  updateNavigationIconColors() {
    const primaryColor = this.config?.theme?.primaryColor || '#A3E635';
    
    document.querySelectorAll('.nav-btn').forEach(btn => {
      const icon = btn.querySelector('.icon');
      if (icon) {
        // Clear any existing inline filter styles first
        icon.style.removeProperty('filter');
        
        if (btn.classList.contains('active')) {
          // Apply primary color to active icon
          icon.style.filter = this.getColorFilter(primaryColor);
        } else {
          // Apply white color for inactive icons (default state)
          icon.style.filter = 'brightness(0) saturate(100%) invert(1)'; // Pure white
        }
      }
    });
  }

  forceRefreshIconColors() {
    // Force refresh by clearing all inline styles and reapplying
    document.querySelectorAll('.nav-btn .icon').forEach(icon => {
      // Clear all inline styles
      icon.removeAttribute('style');
    });
    
    // Reapply colors
    this.updateNavigationIconColors();
  }

  getColorFilter(hexColor) {
    // Convert hex to RGB for better color filter calculation
    const r = parseInt(hexColor.slice(1, 3), 16);
    const g = parseInt(hexColor.slice(3, 5), 16);
    const b = parseInt(hexColor.slice(5, 7), 16);
    
    // Optimized filter for lime green (#A3E635)
    if (hexColor.toUpperCase() === '#A3E635') {
      return 'brightness(0) saturate(100%) invert(84%) sepia(61%) saturate(394%) hue-rotate(39deg) brightness(97%) contrast(91%)';
    }
    
    // For other colors, calculate a more accurate filter
    // This is a simplified approach - for perfect color matching, a more complex calculation would be needed
    const hue = Math.atan2(Math.sqrt(3) * (g - b), 2 * r - g - b) * 180 / Math.PI;
    const saturation = Math.sqrt(3 * (r * r + g * g + b * b - r * g - r * b - g * b)) / 255;
    const lightness = (Math.max(r, g, b) + Math.min(r, g, b)) / 2 / 255;
    
    // Generate filter based on calculated values
    return `brightness(0) saturate(100%) invert(${lightness > 0.5 ? 0 : 1}) hue-rotate(${hue}deg) saturate(${saturation * 200}%) brightness(${lightness * 200}%)`;
  }

  setupEventListeners() {
    // Save button
    const saveBtn = document.getElementById('saveBtn');
    if (saveBtn) {
      saveBtn.addEventListener('click', () => {
        this.saveSettings();
      });
    }
    
    // Reset button
    const resetBtn = document.getElementById('resetBtn');
    if (resetBtn) {
      resetBtn.addEventListener('click', () => {
        this.resetSettings();
      });
    }
    
    // Export/Import buttons
    const exportBtn = document.getElementById('exportBtn');
    if (exportBtn) {
      exportBtn.addEventListener('click', () => {
        this.exportSettings();
      });
    }
    
    const importBtn = document.getElementById('importBtn');
    if (importBtn) {
      importBtn.addEventListener('click', () => {
        this.importSettings();
      });
    }
    
    const importFile = document.getElementById('importFile');
    if (importFile) {
      importFile.addEventListener('change', (e) => {
        this.handleFileImport(e);
      });
    }
    
    // Theme inputs
    this.setupThemeInputs();
    
    // Form change detection
    this.setupChangeDetection();
    
    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
      if (e.ctrlKey || e.metaKey) {
        if (e.key === 's') {
          e.preventDefault();
          this.saveSettings();
        }
      }
    });
  }

  setupThemeInputs() {
    // Color inputs
    const colorInputs = [
      { id: 'primaryColor', textId: 'primaryColorText', property: 'theme.primaryColor' },
      { id: 'backgroundColor', textId: 'backgroundColorText', property: 'theme.backgroundColor' },
      { id: 'textColor', textId: 'textColorText', property: 'theme.textColor' }
    ];
    
    colorInputs.forEach(({ id, textId, property }) => {
      const colorInput = document.getElementById(id);
      const textInput = document.getElementById(textId);
      
      if (colorInput && textInput) {
        colorInput.addEventListener('input', (e) => {
          textInput.value = e.target.value;
          this.updateConfigProperty(property, e.target.value);
          this.updateThemePreview();
          // Update navigation icons if primary color changed
          if (property === 'theme.primaryColor') {
            this.updateNavigationIconColors();
          }
          this.markUnsaved();
        });
        
        textInput.addEventListener('input', (e) => {
          const value = e.target.value;
          if (this.isValidColor(value)) {
            colorInput.value = value;
            this.updateConfigProperty(property, value);
            this.updateThemePreview();
            // Update navigation icons if primary color changed
            if (property === 'theme.primaryColor') {
              this.updateNavigationIconColors();
            }
            this.markUnsaved();
          }
        });
      }
    });
    
    // Range inputs
    const rangeInputs = [
      { id: 'animationDuration', property: 'theme.animationDuration', suffix: 'ms' },
      { id: 'controlOpacity', property: 'theme.controlOpacity', suffix: '%', multiplier: 100 },
      { id: 'borderRadius', property: 'theme.borderRadius', suffix: 'px' },
      { id: 'autoHideDelay', property: 'controls.autoHideDelay', suffix: 's', divider: 1000 }
    ];
    
    rangeInputs.forEach(({ id, property, suffix, multiplier, divider }) => {
      const input = document.getElementById(id);
      if (input) {
        const valueDisplay = input.parentElement.querySelector('.range-value');
        
        if (valueDisplay) {
          input.addEventListener('input', (e) => {
            let value = parseFloat(e.target.value);
            let displayValue = value;
            
            if (multiplier) displayValue = Math.round(value * multiplier);
            if (divider) displayValue = (value / divider).toFixed(1);
            
            valueDisplay.textContent = displayValue + suffix;
            this.updateConfigProperty(property, value);
            this.updateThemePreview();
            this.markUnsaved();
          });
        }
      }
    });
  }

  setupChangeDetection() {
    // Monitor all form inputs for changes
    const inputs = document.querySelectorAll('input, select, textarea');
    
    inputs.forEach(input => {
      input.addEventListener('change', () => {
        this.markUnsaved();
      });
    });
  }

  populateForm() {
    // Theme settings
    const primaryColor = document.getElementById('primaryColor');
    const primaryColorText = document.getElementById('primaryColorText');
    const backgroundColor = document.getElementById('backgroundColor');
    const backgroundColorText = document.getElementById('backgroundColorText');
    const textColor = document.getElementById('textColor');
    const textColorText = document.getElementById('textColorText');
    const animationDuration = document.getElementById('animationDuration');
    const controlOpacity = document.getElementById('controlOpacity');
    const borderRadius = document.getElementById('borderRadius');
    
    if (primaryColor) primaryColor.value = this.config.theme.primaryColor;
    if (primaryColorText) primaryColorText.value = this.config.theme.primaryColor;
    if (backgroundColor) backgroundColor.value = this.config.theme.backgroundColor;
    if (backgroundColorText) backgroundColorText.value = this.config.theme.backgroundColor;
    if (textColor) textColor.value = this.config.theme.textColor;
    if (textColorText) textColorText.value = this.config.theme.textColor;
    if (animationDuration) animationDuration.value = this.config.theme.animationDuration;
    if (controlOpacity) controlOpacity.value = this.config.theme.controlOpacity;
    if (borderRadius) borderRadius.value = this.config.theme.borderRadius;
    
    // Window settings
    const defaultWidth = document.getElementById('defaultWidth');
    const defaultHeight = document.getElementById('defaultHeight');
    const minWidth = document.getElementById('minWidth');
    const maxWidth = document.getElementById('maxWidth');
    const rememberSize = document.getElementById('rememberSize');
    const rememberPosition = document.getElementById('rememberPosition');
    
    if (defaultWidth) defaultWidth.value = this.config.window.defaultWidth;
    if (defaultHeight) defaultHeight.value = this.config.window.defaultHeight;
    if (minWidth) minWidth.value = this.config.window.minWidth;
    if (maxWidth) maxWidth.value = this.config.window.maxWidth;
    if (rememberSize) rememberSize.checked = this.config.window.rememberSize;
    if (rememberPosition) rememberPosition.checked = this.config.window.rememberPosition;
    
    // Control settings
    const autoHide = document.getElementById('autoHide');
    const autoHideDelay = document.getElementById('autoHideDelay');
    const showProgress = document.getElementById('showProgress');
    const showVolume = document.getElementById('showVolume');
    const showTime = document.getElementById('showTime');
    
    if (autoHide) autoHide.checked = this.config.controls.autoHide;
    if (autoHideDelay) autoHideDelay.value = this.config.controls.autoHideDelay;
    if (showProgress) showProgress.checked = this.config.controls.showProgress;
    if (showVolume) showVolume.checked = this.config.controls.showVolume;
    if (showTime) showTime.checked = this.config.controls.showTime;
    
    // Behavior settings
    const smartVideoDetection = document.getElementById('smartVideoDetection');
    const preferLargestVideo = document.getElementById('preferLargestVideo');
    const pauseOnClose = document.getElementById('pauseOnClose');
    const resumeOnReopen = document.getElementById('resumeOnReopen');
    const closeOnVideoEnd = document.getElementById('closeOnVideoEnd');
    
    if (smartVideoDetection) smartVideoDetection.checked = this.config.behavior.smartVideoDetection;
    if (preferLargestVideo) preferLargestVideo.checked = this.config.behavior.preferLargestVideo;
    if (pauseOnClose) pauseOnClose.checked = this.config.behavior.pauseOnClose;
    if (resumeOnReopen) resumeOnReopen.checked = this.config.behavior.resumeOnReopen;
    if (closeOnVideoEnd) closeOnVideoEnd.checked = this.config.behavior.closeOnVideoEnd;
    
    // Site settings
    const sitesEnabled = document.getElementById('sitesEnabled');
    if (sitesEnabled) sitesEnabled.checked = this.config.sites.enabled;
    
    // Update range value displays
    this.updateRangeDisplays();
  }

  updateRangeDisplays() {
    const ranges = [
      { id: 'animationDuration', suffix: 'ms' },
      { id: 'controlOpacity', suffix: '%', multiplier: 100 },
      { id: 'borderRadius', suffix: 'px' },
      { id: 'autoHideDelay', suffix: 's', divider: 1000 }
    ];
    
    ranges.forEach(({ id, suffix, multiplier, divider }) => {
      const input = document.getElementById(id);
      if (input) {
        const valueDisplay = input.parentElement.querySelector('.range-value');
        if (valueDisplay) {
          let value = parseFloat(input.value);
          
          if (multiplier) value = Math.round(value * multiplier);
          if (divider) value = (value / divider).toFixed(1);
          
          valueDisplay.textContent = value + suffix;
        }
      }
    });
  }

  setupThemePreview() {
    this.updateThemePreview();
  }

  updateThemePreview() {
    const preview = document.getElementById('themePreview');
    if (!preview) {
      console.warn('Theme preview element not found');
      return;
    }
    
    // Ensure config exists
    if (!this.config || !this.config.theme) {
      console.warn('Theme configuration not available');
      return;
    }
    
    // Update CSS custom properties for preview
    preview.style.setProperty('--primary-color', this.config.theme.primaryColor);
    preview.style.setProperty('--bg-color', this.config.theme.backgroundColor);
    preview.style.setProperty('--text-color', this.config.theme.textColor);
    preview.style.setProperty('--border-radius', this.config.theme.borderRadius + 'px');
    preview.style.setProperty('--transition', `all ${this.config.theme.animationDuration}ms cubic-bezier(0.4, 0, 0.2, 1)`);
  }

  setupSiteConfigurations() {
    const container = document.getElementById('siteConfigs');
    if (!container) {
      console.warn('Site configurations container not found');
      return;
    }
    
    // Ensure config exists
    if (!this.config || !this.config.sites || !this.config.sites.configs) {
      console.warn('Site configuration not available');
      return;
    }
    
    container.innerHTML = '';
    
    Object.entries(this.config.sites.configs).forEach(([domain, config]) => {
      const siteDiv = document.createElement('div');
      siteDiv.className = 'site-config';
      
      siteDiv.innerHTML = `
        <div class="site-config-header">
          <div class="site-name">${config.name}</div>
          <div class="toggle-switch">
            <input type="checkbox" id="site-${domain}" ${config.customControls ? 'checked' : ''}>
            <span class="toggle-slider"></span>
          </div>
        </div>
        <div class="site-features">
          ${config.features.map(feature => `<span class="feature-tag">${feature}</span>`).join('')}
        </div>
      `;
      
      container.appendChild(siteDiv);
      
      // Add event listener for site toggle
      const toggle = siteDiv.querySelector(`#site-${domain}`);
      if (toggle) {
        toggle.addEventListener('change', (e) => {
          this.updateConfigProperty(`sites.configs.${domain}.customControls`, e.target.checked);
          this.markUnsaved();
        });
      }
    });
  }

  updateConfigProperty(path, value) {
    const keys = path.split('.');
    let current = this.config;
    
    for (let i = 0; i < keys.length - 1; i++) {
      if (!current[keys[i]]) {
        current[keys[i]] = {};
      }
      current = current[keys[i]];
    }
    
    current[keys[keys.length - 1]] = value;
  }

  collectFormData() {
    const getElementValue = (id, defaultValue = '') => {
      const element = document.getElementById(id);
      return element ? element.value : defaultValue;
    };
    
    const getElementChecked = (id, defaultValue = false) => {
      const element = document.getElementById(id);
      return element ? element.checked : defaultValue;
    };
    
    const formData = {
      theme: {
        primaryColor: getElementValue('primaryColor', '#A3E635'),
        backgroundColor: getElementValue('backgroundColor', '#000000'),
        textColor: getElementValue('textColor', '#FFFFFF'),
        animationDuration: parseInt(getElementValue('animationDuration', '300')),
        controlOpacity: parseFloat(getElementValue('controlOpacity', '0.9')),
        borderRadius: parseInt(getElementValue('borderRadius', '8')),
      },
      window: {
        defaultWidth: parseInt(getElementValue('defaultWidth', '400')),
        defaultHeight: parseInt(getElementValue('defaultHeight', '300')),
        minWidth: parseInt(getElementValue('minWidth', '200')),
        maxWidth: parseInt(getElementValue('maxWidth', '800')),
        rememberSize: getElementChecked('rememberSize', true),
        rememberPosition: getElementChecked('rememberPosition', true),
      },
      controls: {
        autoHide: getElementChecked('autoHide', true),
        autoHideDelay: parseInt(getElementValue('autoHideDelay', '3000')),
        showProgress: getElementChecked('showProgress', true),
        showVolume: getElementChecked('showVolume', true),
        showTime: getElementChecked('showTime', true),
        showOnHover: true, // Always true for now
        showSpeed: true,   // Always true for now
        showNext: false,   // Site-specific
        showPrevious: false, // Site-specific
      },
      behavior: {
        smartVideoDetection: getElementChecked('smartVideoDetection', true),
        preferLargestVideo: getElementChecked('preferLargestVideo', true),
        pauseOnClose: getElementChecked('pauseOnClose', true),
        resumeOnReopen: getElementChecked('resumeOnReopen', true),
        closeOnVideoEnd: getElementChecked('closeOnVideoEnd', false),
        autoPlay: false, // Not exposed in UI yet
      },
      sites: {
        enabled: getElementChecked('sitesEnabled', true),
        configs: { ...this.config.sites.configs } // Keep existing site configs
      }
    };
    
    // Update site-specific settings
    Object.keys(this.config.sites.configs).forEach(domain => {
      const toggle = document.getElementById(`site-${domain}`);
      if (toggle) {
        formData.sites.configs[domain].customControls = toggle.checked;
      }
    });
    
    return formData;
  }

  async saveSettings() {
    try {
      const saveBtn = document.getElementById('saveBtn');
      const originalText = saveBtn ? saveBtn.textContent : 'Save Settings';
      
      // Show loading state
      if (saveBtn) {
        saveBtn.disabled = true;
        saveBtn.classList.add('loading');
        saveBtn.textContent = 'Saving...';
      }
      
      // Collect form data
      const formData = this.collectFormData();
      
      // Merge with existing config
      const updatedConfig = ConfigManager.mergeConfig(this.config, formData);
      
      // Save to storage
      const success = await ConfigManager.save(updatedConfig);
      
      if (success) {
        this.config = updatedConfig;
        this.markSaved();
        this.showMessage('Settings saved successfully!', 'success');
      } else {
        throw new Error('Failed to save settings');
      }
      
      // Reset button state
      if (saveBtn) {
        saveBtn.disabled = false;
        saveBtn.classList.remove('loading');
        saveBtn.textContent = originalText;
      }
      
    } catch (error) {
      console.error('Failed to save settings:', error);
      this.showMessage('Failed to save settings: ' + error.message, 'error');
      
      // Reset button state
      const saveBtn = document.getElementById('saveBtn');
      if (saveBtn) {
        saveBtn.disabled = false;
        saveBtn.classList.remove('loading');
        saveBtn.textContent = 'Save Settings';
      }
    }
  }

  async resetSettings() {
    if (!confirm('Are you sure you want to reset all settings to defaults? This cannot be undone.')) {
      return;
    }
    
    try {
      const resetBtn = document.getElementById('resetBtn');
      const originalText = resetBtn ? resetBtn.textContent : 'Reset to Defaults';
      
      // Show loading state
      if (resetBtn) {
        resetBtn.disabled = true;
        resetBtn.classList.add('loading');
        resetBtn.textContent = 'Resetting...';
      }
      
      // Reset to defaults
      const success = await ConfigManager.reset();
      
      if (success) {
        this.config = await ConfigManager.load();
        this.populateForm();
        this.updateThemePreview();
        this.setupSiteConfigurations();
        this.markSaved();
        this.showMessage('Settings reset to defaults', 'success');
      } else {
        throw new Error('Failed to reset settings');
      }
      
      // Reset button state
      if (resetBtn) {
        resetBtn.disabled = false;
        resetBtn.classList.remove('loading');
        resetBtn.textContent = originalText;
      }
      
    } catch (error) {
      console.error('Failed to reset settings:', error);
      this.showMessage('Failed to reset settings: ' + error.message, 'error');
      
      // Reset button state
      const resetBtn = document.getElementById('resetBtn');
      if (resetBtn) {
        resetBtn.disabled = false;
        resetBtn.classList.remove('loading');
        resetBtn.textContent = 'Reset to Defaults';
      }
    }
  }

  exportSettings() {
    try {
      const exportData = {
        version: '2.0.0',
        timestamp: new Date().toISOString(),
        config: this.config
      };
      
      const blob = new Blob([JSON.stringify(exportData, null, 2)], {
        type: 'application/json'
      });
      
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `pipx-settings-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      this.showMessage('Settings exported successfully!', 'success');
      
    } catch (error) {
      console.error('Failed to export settings:', error);
      this.showMessage('Failed to export settings: ' + error.message, 'error');
    }
  }

  importSettings() {
    document.getElementById('importFile').click();
  }

  async handleFileImport(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    try {
      const text = await file.text();
      const importData = JSON.parse(text);
      
      // Validate import data
      if (!importData.config) {
        throw new Error('Invalid settings file format');
      }
      
      // Confirm import
      if (!confirm('Are you sure you want to import these settings? Current settings will be overwritten.')) {
        return;
      }
      
      // Merge imported config with defaults to ensure all properties exist
      const mergedConfig = ConfigManager.mergeConfig(DEFAULT_CONFIG, importData.config);
      
      // Save imported settings
      const success = await ConfigManager.save(mergedConfig);
      
      if (success) {
        this.config = mergedConfig;
        this.populateForm();
        this.updateThemePreview();
        this.setupSiteConfigurations();
        this.markSaved();
        this.showMessage('Settings imported successfully!', 'success');
      } else {
        throw new Error('Failed to save imported settings');
      }
      
    } catch (error) {
      console.error('Failed to import settings:', error);
      this.showMessage('Failed to import settings: ' + error.message, 'error');
    } finally {
      // Reset file input
      event.target.value = '';
    }
  }

  markUnsaved() {
    this.unsavedChanges = true;
    const saveBtn = document.getElementById('saveBtn');
    if (saveBtn) {
      saveBtn.textContent = 'Save Settings *';
      saveBtn.classList.add('primary');
    }
  }

  markSaved() {
    this.unsavedChanges = false;
    const saveBtn = document.getElementById('saveBtn');
    if (saveBtn) {
      saveBtn.textContent = 'Save Settings';
      saveBtn.classList.remove('primary');
    }
  }

  showMessage(text, type = 'info') {
    // Remove existing messages
    const existingMessages = document.querySelectorAll('.success-message, .error-message');
    existingMessages.forEach(msg => msg.remove());
    
    // Create new message
    const message = document.createElement('div');
    message.className = type === 'success' ? 'success-message' : 'error-message';
    message.textContent = text;
    
    // Insert at top of current section
    const activeSection = document.querySelector('.options-section.active');
    const sectionHeader = activeSection.querySelector('.section-header');
    sectionHeader.insertAdjacentElement('afterend', message);
    
    // Auto remove after 5 seconds
    setTimeout(() => {
      message.remove();
    }, 5000);
  }

  isValidColor(color) {
    const style = new Option().style;
    style.color = color;
    return style.color !== '';
  }
}

// Initialize options controller when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  new OptionsController();
});

// Warn about unsaved changes
window.addEventListener('beforeunload', (e) => {
  if (window.optionsController && window.optionsController.unsavedChanges) {
    e.preventDefault();
    e.returnValue = '';
  }
}); 
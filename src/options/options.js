// Options page script for PipX extension

console.log('🔵 PipX Options: Loading options page...');

// Settings mapping
const settings = {
  'autoPip': 'core.autoPip',
  'enableManualPip': 'core.enableManualPip', 
  'keyboardShortcuts': 'core.keyboardShortcuts',
  'showNotifications': 'core.showNotifications',
  'youtubeEnhanced': 'sites.youtube.enhancedControls',
  'youtubeButton': 'sites.youtube.customButton',
  'youtubeChapters': 'sites.youtube.showChapters',
  'genericEnhanced': 'sites.generic.enhancedControls',
  'genericOverlay': 'sites.generic.showOverlay'
};

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', async () => {
  console.log('🔵 PipX Options: DOM loaded, initializing...');
  
  try {
    // Load current settings
    const stored = await chrome.storage.local.get();
    console.log('🔵 PipX Options: Loaded settings:', stored);
    
    // Apply settings to form elements
    for (const [elementId, settingPath] of Object.entries(settings)) {
      const element = document.getElementById(elementId);
      if (element) {
        const value = getNestedValue(stored, settingPath);
        element.checked = value ?? true;
        console.log(`🔵 PipX Options: Set ${elementId} = ${element.checked}`);
      }
    }
    
    // Set up change handlers
    setupChangeHandlers();
    console.log('✅ PipX Options: Options page initialized successfully');
    
  } catch (error) {
    console.error('🔴 PipX Options: Failed to initialize:', error);
    showStatus('Failed to load settings', 'error');
  }
});

function setupChangeHandlers() {
  Object.keys(settings).forEach(elementId => {
    const element = document.getElementById(elementId);
    if (element) {
      element.addEventListener('change', async () => {
        try {
          console.log(`🔵 PipX Options: Saving ${elementId} = ${element.checked}`);
          
          const stored = await chrome.storage.local.get();
          setNestedValue(stored, settings[elementId], element.checked);
          await chrome.storage.local.set(stored);
          
          console.log('✅ PipX Options: Setting saved successfully');
          showStatus('Settings saved', 'success');
          
        } catch (error) {
          console.error('🔴 PipX Options: Failed to save setting:', error);
          showStatus('Failed to save settings', 'error');
        }
      });
    }
  });
}

function getNestedValue(obj, path) {
  return path.split('.').reduce((current, key) => current?.[key], obj);
}

function setNestedValue(obj, path, value) {
  const keys = path.split('.');
  const lastKey = keys.pop();
  const target = keys.reduce((current, key) => {
    if (!current[key]) current[key] = {};
    return current[key];
  }, obj);
  target[lastKey] = value;
}

function showStatus(message, type) {
  const status = document.getElementById('status');
  if (status) {
    status.textContent = message;
    status.className = type;
    status.style.display = 'block';
    setTimeout(() => status.style.display = 'none', 3000);
  }
} 
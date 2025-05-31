# PipX Site Integration - Native Control Injection

## Overview

The Site Integration feature automatically injects PipX buttons into native video player controls across different websites. This provides users with a seamless, native-feeling way to activate Picture-in-Picture without needing to remember keyboard shortcuts or use the extension popup.

## Features

### 🎯 **Smart Button Placement**
- **YouTube**: Positioned next to settings and miniplayer buttons
- **Generic Sites**: Positioned to the left of fullscreen button
- **Fallback**: Appended to the end of control bars if specific positions aren't found

### ✨ **Visual Introduction**
- **Lime Green Glow**: 2-second animated glow effect when button first appears
- **Smooth Animation**: Bouncy scale-in animation with cubic-bezier easing
- **Hover Effects**: Scale and background color changes on interaction

### 🔍 **Dynamic Detection**
- **MutationObserver**: Watches for dynamically loaded video controls
- **Video Filtering**: Only injects for videos >200x150px with readyState > 0
- **Duplicate Prevention**: Prevents multiple buttons in the same control area

## Technical Implementation

### Core Classes

#### `SiteIntegration`
Main controller class that handles the entire injection lifecycle.

```javascript
class SiteIntegration {
  constructor(pipxController)
  init()                    // Start observing and initial injection
  startObserving()          // Setup MutationObserver
  injectButtons()           // Main injection logic
  injectYouTubeButton()     // YouTube-specific injection
  injectGenericButton()     // Generic site injection
  createPipXButton()        // Button creation and styling
  animateButtonIntro()      // Introduction animation
  destroy()                 // Cleanup and removal
}
```

### Button Creation Process

1. **Element Creation**: Creates `<button>` with `pipx-native-btn` class
2. **Icon Loading**: Loads pip.svg icon via IconManager
3. **Event Binding**: Attaches click handler to trigger PiP
4. **Styling Application**: Applies comprehensive CSS styling
5. **Accessibility**: Adds proper ARIA labels and titles

### Site-Specific Logic

#### YouTube (`youtube.com`)
```javascript
// Target container
const controlsContainer = document.querySelector('.ytp-chrome-controls .ytp-right-controls');

// Insertion point (before settings/miniplayer)
const insertBefore = settingsButton || miniplayerButton || controlsContainer.firstChild;
```

#### Generic Sites
```javascript
// Find controls near video element
const controlsSelectors = ['.video-controls', '.player-controls', '.controls'];

// Insert before fullscreen button
const fullscreenButton = controlsContainer.querySelector('[class*="fullscreen"]');
```

## CSS Styling

### Base Button Styles
```css
.pipx-native-btn {
  background: transparent !important;
  border: none !important;
  color: white !important;
  min-width: 36px !important;
  height: 36px !important;
  opacity: 0.8 !important;
  transition: all 0.3s ease !important;
}
```

### Site-Specific Adjustments
```css
/* YouTube */
.ytp-chrome-controls .pipx-native-btn {
  width: 48px !important;
  height: 48px !important;
}

/* Netflix */
.watch-video .pipx-native-btn {
  background: rgba(0, 0, 0, 0.5) !important;
  border-radius: 50% !important;
}
```

### Introduction Animation
```css
@keyframes pipx-glow {
  0% { box-shadow: 0 0 5px #A3E635; }
  50% { box-shadow: 0 0 20px #A3E635, 0 0 30px #A3E635; }
  100% { box-shadow: 0 0 5px #A3E635; }
}

.pipx-native-btn.pipx-intro-glow {
  animation: pipx-glow 2s ease-in-out !important;
}
```

## Integration Points

### Content Script Integration
```javascript
class PipXController {
  constructor() {
    // Initialize site integration
    this.siteIntegration = new SiteIntegration(this);
  }
  
  cleanup() {
    // Cleanup on PiP close
    if (this.siteIntegration) {
      this.siteIntegration.destroy();
    }
  }
}
```

### Icon Management
```javascript
// Uses existing IconManager
const iconSvg = await IconManager.loadIcon('pip');
button.innerHTML = iconSvg;
```

## Supported Sites

### ✅ **Fully Supported**
- **YouTube** - Next to settings/miniplayer buttons
- **Netflix** - Integrated with player controls
- **Vimeo** - Standard control bar integration
- **Twitch** - Player control integration

### 🔧 **Generic Support**
- Any site with standard video control patterns
- Automatic detection of fullscreen buttons
- Fallback to control bar end

## User Experience

### Discovery
1. **Visual Cue**: Lime green glow immediately draws attention
2. **Familiar Placement**: Positioned with other video controls
3. **Consistent Behavior**: Same interaction patterns as native controls

### Accessibility
- **ARIA Labels**: Proper screen reader support
- **Keyboard Navigation**: Focus management and outline styles
- **High Contrast**: Adapts to system preferences
- **Reduced Motion**: Respects user motion preferences

## Performance Considerations

### Efficient Observation
- **Targeted Selectors**: Only observes relevant DOM changes
- **Debounced Injection**: Prevents excessive re-injection attempts
- **Memory Management**: Proper cleanup prevents memory leaks

### CSS Optimization
- **Hardware Acceleration**: Uses transform for animations
- **Minimal Reflows**: Avoids layout-triggering properties
- **Scoped Styles**: High specificity prevents conflicts

## Browser Compatibility

- ✅ **Chrome 116+**: Full functionality
- ✅ **Edge 116+**: Full functionality
- ⚠️ **Firefox**: Button injection works, limited PiP functionality
- ⚠️ **Safari**: Button injection works, limited PiP functionality

## Testing

### Manual Testing
1. Visit YouTube, Netflix, or other video sites
2. Wait for video controls to load
3. Look for PipX button with lime glow
4. Click button to activate PiP
5. Verify button placement and styling

### Automated Testing
```javascript
// Test button injection
const button = document.querySelector('.pipx-native-btn');
console.assert(button !== null, 'PipX button should be injected');

// Test click functionality
button.click();
console.assert(pipxController.isActive, 'PiP should activate on click');
```

## Future Enhancements

### Planned Features
- **More Sites**: Expand support to additional video platforms
- **Custom Positioning**: User-configurable button placement
- **Theme Integration**: Button styling matches user's theme colors
- **Context Menu**: Right-click options for advanced features

### Potential Improvements
- **Smart Hiding**: Hide button when PiP is already active
- **Progress Indication**: Show PiP status in button appearance
- **Keyboard Shortcuts**: Display shortcut hints on hover
- **Site Preferences**: Per-site enable/disable options 
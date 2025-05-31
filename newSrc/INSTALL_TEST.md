# PipX Extension - Installation & Testing Guide

## Fixed Issues ✅

The following errors have been resolved:

### 1. Import Statement Errors
- **Error**: `Cannot use import statement outside a module`
- **Fix**: Converted to global scope approach
  - Content scripts use `window.PipXConfig` 
  - Extension pages load config.js before main scripts
  - Removed all ES6 import/export statements

### 2. Multiple Declaration Errors  
- **Error**: `Identifier 'ConfigManager' has already been declared`
- **Fix**: Added execution guard in config.js
  - Prevents multiple executions with `if (!window.PipXConfig)` check

### 3. SVG className Errors
- **Error**: `Cannot set property className of SVGElement which has only a getter`
- **Fix**: Use `setAttribute('class', ...)` for SVG elements
  - SVG elements have read-only className property

### 4. Icon Logic Errors
- **Error**: Play/pause button always showing same icon
- **Fix**: Corrected icon names in `updatePlayIcon` method
  - Paused state: 'play' icon
  - Playing state: 'pause' icon

## Installation Steps

1. **Open Chrome Extensions**
   - Go to `chrome://extensions/`
   - Enable "Developer mode" (top right toggle)

2. **Load Extension**
   - Click "Load unpacked"
   - Select the `newSrc` folder
   - Extension should load without errors

3. **Verify Installation**
   - Check that PipX icon appears in toolbar
   - No errors should appear in console
   - Extension popup should open without issues

## Testing Steps

### Basic Functionality Test
1. **Open Test Page**
   - Open `test-extension.html` in Chrome
   - Or visit any video site (YouTube, Netflix, etc.)

2. **Check Extension Status**
   - Click "🔍 Test Extension Status" button
   - All components should show ✅ green checkmarks

3. **Test Configuration**
   - Click "⚙️ Test Configuration" button  
   - Should load settings and detect current site

4. **Test PiP API**
   - Click "🖼️ Test PiP API" button
   - Should detect Document PiP support (Chrome 116+)

### Document PiP Test
1. **Activate PiP**
   - Click the PipX extension icon in toolbar
   - Or press `Alt+P` keyboard shortcut
   - Should open Document PiP window with custom controls

2. **Test Controls**
   - ▶️ Play/pause button should toggle correctly
   - ⏪⏩ Rewind/forward buttons (10 second jumps)
   - 🔊 Volume controls and slider
   - 📊 Progress bar (clickable for seeking)
   - ⏰ Time display (current / total)
   - ✕ Close button

3. **Test Auto-hide**
   - Controls should auto-hide after 3 seconds
   - Should reappear on mouse hover

## Expected Results

✅ **No console errors**  
✅ **Extension loads successfully**  
✅ **Popup opens without errors**  
✅ **Configuration system works**  
✅ **Document PiP window opens**  
✅ **Custom controls function properly**  
✅ **Icons load and display correctly**  
✅ **Video playback controls work**  
✅ **Auto-hide behavior works**  

## Troubleshooting

### If Extension Won't Load
1. Check Chrome version (need 116+ for Document PiP)
2. Reload extension after any changes
3. Check browser console for errors
4. Verify all files are present

### If PiP Won't Activate  
1. Ensure video is playing or ready (readyState > 0)
2. Check that video doesn't have `disablePictureInPicture` attribute
3. Try on different video sites (YouTube, Netflix work best)
4. Check console for specific error messages

### If Controls Don't Work
1. Verify SVG icons are loading from `assets/icons/`
2. Check that Document PiP window opened successfully  
3. Test with fallback text controls if icons fail

## File Structure

```
newSrc/
├── manifest.json          # Extension configuration
├── utils/config.js        # Global configuration (loaded first)
├── content/content.js     # Content script (no imports)
├── popup/                 # Extension popup
│   ├── popup.html         # Loads config.js first
│   ├── popup.js           # Uses window.PipXConfig
│   └── popup.css
├── options/              # Options page  
│   ├── options.html       # Loads config.js first
│   ├── options.js         # Uses window.PipXConfig
│   └── options.css
├── background/           # Service worker
├── assets/icons/         # SVG icons for controls
└── icons/               # Extension icons
```

## Architecture Notes

- **Global Configuration**: All parts use `window.PipXConfig`
- **No ES6 Modules**: Avoided to prevent import errors
- **Execution Guards**: Prevent multiple script execution
- **SVG Compatibility**: Proper attribute handling for SVG elements
- **Fallback Controls**: Text fallbacks when icons fail to load 
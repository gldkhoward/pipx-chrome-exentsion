# PipX - Enhanced Picture-in-Picture Chrome Extension

A Chrome extension that enhances Picture-in-Picture functionality with customizable controls, themes, and site-specific features.

## 🚀 Testing the Extension

The extension is now ready for testing! Follow these steps:

### 1. Load Extension in Chrome

1. Open Chrome and go to `chrome://extensions/`
2. Enable "Developer mode" (toggle in top right)
3. Click "Load unpacked"
4. Select the `src/` folder from this project
5. The PipX extension should now appear in your extensions list

### 2. After Code Changes

If you make any changes to the extension code:
1. Go to `chrome://extensions/`
2. Find the PipX extension
3. Click the **refresh button** (🔄) on the extension card
4. Reload any tabs where you want to test the extension

### 3. Test Basic Functionality

**On any video site:**
- Click the PipX extension icon to trigger Picture-in-Picture
- Or use the keyboard shortcut `Alt+P`
- Or use `Ctrl+Shift+P` (alternative shortcut)

**On YouTube specifically:**
- Look for the custom PiP button in the player controls
- Use `N` for next chapter, `P` for previous chapter (if chapters exist)
- Use `T` to toggle theater mode while in PiP

**On other video sites:**
- Look for the floating PiP button (🖼️) when videos are detected
- Hover over videos to see control overlays

### 4. Test Features

- **Auto PiP**: Hide the tab to automatically enter PiP mode
- **Enhanced Controls**: Use keyboard shortcuts in PiP mode:
  - `Space` or `K` - Play/Pause
  - `J`/`L` - Skip backward/forward 10 seconds
  - `←`/`→` - Skip backward/forward 5 seconds  
  - `↑`/`↓` - Volume up/down
  - `M` - Mute/unmute
  - `0-9` - Seek to percentage (0% to 90%)
  - `Shift+←`/`Shift+→` - Skip 30 seconds
  - `,`/`.` - Speed down/up

### 5. Configure Settings

- **Popup**: Click the extension icon to access quick settings
- **Options**: Right-click the icon → Settings, or click "Settings" in the popup
- **Test Button**: Use the "Test" button in popup to verify functionality

## 📁 Project Structure

```
src/
├── manifest.json              # Extension manifest
├── background/
│   └── background.js          # Service worker
├── content/
│   ├── core/                  # Core functionality
│   │   ├── script.js          # Manual PiP triggers
│   │   ├── auto-pip.js        # Auto PiP functionality  
│   │   └── pipControls.js     # Enhanced PiP controls
│   └── site-specific/         # Site-specific enhancements
│       ├── youtube.js         # YouTube features
│       └── generic.js         # Universal video site support
├── popup/                     # Extension popup interface
│   ├── popup.html
│   ├── popup.css
│   └── popup.js
├── options/                   # Settings page
│   └── options.html
├── utils/                     # Shared utilities
│   ├── constants.js           # Default settings & themes
│   └── storage.js             # Settings management
└── assets/                    # Icons and themes
    ├── icons/                 # Extension icons
    └── themes/                # CSS themes
        └── default.css
```

## ✨ Key Features Implemented

- ✅ **Manual PiP Controls** - Multiple ways to trigger PiP
- ✅ **Auto PiP** - Automatic activation when tab becomes hidden
- ✅ **Enhanced Keyboard Shortcuts** - Comprehensive media controls
- ✅ **YouTube Integration** - Custom button, chapters, skip intro
- ✅ **Universal Video Support** - Works on any video site
- ✅ **Smart Video Detection** - Prioritizes playing, visible videos
- ✅ **Themed Notifications** - Visual feedback system
- ✅ **Settings Management** - Popup and options page
- ✅ **Context Menus** - Right-click extension options

## 🧪 Testing Sites

Try the extension on:
- **YouTube** - Full enhanced features
- **Netflix** - Generic enhanced controls
- **Twitch** - Generic enhanced controls  
- **Vimeo** - Generic enhanced controls
- **Any site with videos** - Universal detection

## 🔧 Development Status

The extension has all core functionality implemented and is ready for testing. Future enhancements could include:
- Additional site-specific integrations (Netflix, Twitch, etc.)
- Advanced UI components and overlays
- Custom themes and visual customization
- Extended settings and configuration options

## 🐛 Troubleshooting

If the extension doesn't work:
1. **Refresh the extension**: Go to `chrome://extensions/` and click the refresh button (🔄) on PipX
2. **Reload the tab**: Press F5 or Ctrl+R to reload the page you're testing on
3. Check that all files are present in the `src/` directory
4. Verify Developer mode is enabled in Chrome
5. Check the Console (F12) for any error messages
6. Use the Test button in the popup to diagnose issues

**Expected Test Results:**
- PiP Support: ✅
- Total Videos: [number]
- Active Videos: [number]  
- Currently in PiP: ✅/❌
- Core Manager: ✅
- YouTube Manager: ✅ (on YouTube)
- Generic Manager: ✅ (on other sites)

The extension should work on most video sites. Some sites with heavy DRM or custom video players may have limited functionality. 

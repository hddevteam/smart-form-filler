# Smart Form Filler (MV3)

Chromium-based browser extension for AI-powered data extraction and form filling. Pure frontend (Manifest V3), no backend server required.

## 🌟 Features

### Core Functionality

- **📊 Data Extraction**: Extract data in multiple formats (Raw HTML, Cleaned HTML, Markdown)
- **🖥️ Side Panel Interface**: Seamless browsing experience with dedicated side panel
- **🔄 Multi-Tab Results**: Switch between different data formats with one-click copying
- **🎯 Smart Content Processing**: Automatic iframe content merging and intelligent data source selection

### Technical Features

- **🤖 Multiple AI Models**: Support for GPT-4o, GPT-4o Mini, and other Azure OpenAI models
- **⚡ Code-Based Extraction**: Advanced content processing with iframe content integration
- **📋 Robust Copy Functionality**: Multi-fallback copy system with download option
- **🛠️ Development Mode**: Built-in development mode for testing without authentication
- **📊 Real-time Analytics**: Processing statistics and optimization insights

## 🚀 Quick Start

### 1. Load Extension

- Open Edge and go to `edge://extensions/`
- Enable "Developer mode"
- Click "Load unpacked" and select this folder (`edge-extension/`)

### 2. Development

Use root scripts:

```bash
pnpm dev      # Vite dev build with watch
pnpm build    # Production build to dist/
pnpm test     # Unit tests (Vitest)
```

### 3. Use Extension

- Navigate to any webpage
- Click the extension icon in toolbar (or use Edge sidebar)
- Choose an AI model and click "Extract Data Sources"
- Switch between result tabs (Output, Markdown, Raw HTML, Cleaned HTML, Metadata)
- Use the copy button to copy content from the active tab

## 📁 Project Structure

```
edge-extension/
├── manifest.json           # Extension configuration (Manifest V3)
├── popup.html              # Side panel UI structure
├── content-iframe.js       # Content script for iframe extraction
├── src/
│   ├── popup-enhanced.js   # Main UI logic with advanced features
│   ├── background-sidepanel.js  # Background service worker
│   ├── api/
│   │   └── apiClient.js    # API communication layer
│   ├── auth/
│   │   └── authManager.js  # Authentication handling
│   └── utils/              # Utility functions
├── styles/
│   └── popup.css          # Modern BEM-based UI styling
├── icons/                 # Extension icons (16x16 to 128x128)
└── README.md              # This file
```

## 🔧 Architecture Notes

- Pure frontend. Background script calls providers directly (Azure OpenAI, Ollama) based on user config.
- Content scripts handle page/iframe extraction and form detection/filling.

## 🧪 Testing

### Test Pages Available

- `http://localhost:3000/test-copy-fix.html` - Copy functionality test page
- `http://localhost:3000/test-iframe-page.html` - Iframe content test page

### Features to Test

- ✅ Data extraction from various website types
- ✅ Copy functionality for all tabs
- ✅ Iframe content merging
- ✅ Error handling and recovery
- ✅ Multi-model selection

## 🔧 Development Notes

### Current State

- **Development Mode**: Enabled by default (bypasses authentication)
- **API Communication**: Uses fetch with proper error handling
- **Copy Functionality**: Multi-fallback system (Chrome API → Clipboard API → execCommand → Download)
- **Error Handling**: Comprehensive logging and user-friendly error messages

### Key Improvements Made

- Fixed `optimizations.map is not a function` error
- Resolved copy button null reference issues
- Implemented robust copy functionality with multiple fallbacks
- Added comprehensive error handling and logging
- Removed debugging methods to prevent console conflicts

## ✅ Current Status

### ✅ Completed Features

- **Data Extraction**: Multi-format extraction (Raw HTML, Cleaned HTML, Markdown)
- **Copy Functionality**: Robust multi-fallback copy system
- **Side Panel Integration**: Full Edge side panel support
- **Error Handling**: Comprehensive error recovery and user feedback
- **Iframe Processing**: Automatic iframe content merging
- **Multi-Model Support**: Dynamic model selection via user-configured providers

### 🔧 Technical Fixes Applied

- Fixed `optimizations.map is not a function` error in data processing
- Resolved copy button `textContent` null reference issues
- Implemented copy functionality debouncing to prevent double-triggers
- Added comprehensive null checks throughout the codebase
- Removed debug methods that caused console conflicts

### 🚀 Ready for Production Use

The extension is now stable and ready for testing on real websites with full functionality.

## 🎯 Usage Guide

### Data Extraction Mode

1. Navigate to any webpage you want to extract data from
2. Choose your preferred AI model
3. Click "Extract Data Sources"
4. Navigate between tabs: Output, Markdown, Raw HTML, Cleaned HTML, Metadata
5. Click "Copy" to copy content from the active tab

## 🎯 Next Steps

- **Production Deployment**: Implement MSAL authentication for production use
- **Store Submission**: Prepare for Microsoft Edge Add-ons store
- **Feature Enhancement**: Add more customization options and export formats
- **Performance Optimization**: Further optimize for large pages and complex layouts

## 📞 Support

For issues or questions:

1. Check browser console for detailed error logs
2. Ensure the extension has necessary host permissions in manifest (Azure OpenAI, Ollama)
3. Test with the provided test pages for debugging

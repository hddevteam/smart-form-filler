# Smart Form Filler - AI-Powered Browser Extension

A standalone browser extension for intelligent data extraction and form filling using AI technology.

## 🚀 Features

- **Data Extraction**: Extract structured data from web pages
- **Smart Form Filling**: AI-powered automatic form completion
- **Multi-format Output**: Raw HTML, cleaned HTML, and Markdown formats
- **Browser Integration**: Works seamlessly with Chrome and other Chromium-based browsers

## 📁 Project Structure

```
smart-form-filler/
├── backend/                 # Backend API server
│   ├── controllers/         # API controllers
│   ├── services/           # Business logic services
│   ├── routes/             # API routes
│   ├── config/             # Configuration files
│   └── server.js           # Main server file
├── extension/              # Browser extension
│   ├── src/                # Extension source code
│   ├── manifest.json       # Extension manifest
│   └── popup.html          # Extension popup UI
└── package.json            # Root package configuration
```

## 🛠️ Installation & Setup

### Prerequisites
- Node.js (v14 or higher)
- npm or yarn

### Backend Setup
```bash
# Install dependencies
npm run install:all

# Start development server
npm run dev
```

### Extension Setup
1. Open Chrome and navigate to `chrome://extensions/`
2. Enable "Developer mode"
3. Click "Load unpacked" and select the `extension` folder
4. The extension should now appear in your browser toolbar

## 🔧 Development

### Backend Development
```bash
cd backend
npm run dev
```

The backend server will start on `http://localhost:3001`

### API Endpoints
- `GET /api/extension/health` - Health check
- `GET /api/extension/models` - Available AI models
- `POST /api/extension/extract-data-sources` - Extract page data
- `POST /api/extension/chat-with-data` - Chat with extracted data
- `POST /api/form-filler/analyze-form-relevance` - Analyze form relevance
- `POST /api/form-filler/analyze-field-mapping` - Generate field mappings

## ⚙️ Configuration

Copy `.env.example` to `.env` and configure your environment variables:

```bash
cd backend
cp .env.example .env
```

## 🧪 Testing

```bash
# Run tests
npm test
```

## 📦 Building for Production

```bash
# Build extension for production
npm run build:extension
```

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the ISC License.

## 🔗 Related Links

- [Chrome Extension Developer Guide](https://developer.chrome.com/docs/extensions/)
- [Node.js Documentation](https://nodejs.org/docs/)
- [Express.js Documentation](https://expressjs.com/)

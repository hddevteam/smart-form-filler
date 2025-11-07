# Smart Form Filler - AI-Powered Browser Extension (TypeScript Migration)

A standalone browser extension for intelligent data extraction and form filling using AI technology.

## 🚀 Features

- **Data Extraction**: Extract structured data from web pages
- **Smart Form Filling**: AI-powered automatic form completion
- **Multi-format Output**: Raw HTML, cleaned HTML, and Markdown formats
- **Browser Integration**: Works seamlessly with Chrome and other Chromium-based browsers

## 📁 Project Structure

```
smart-form-filler/
├── src/                     # TypeScript source (popup/content/background, config, services, utils)
├── extension/               # Legacy extension assets (manifest, icons, html)
├── tests/                   # Vitest unit & integration tests
├── dist/                    # Build output for MV3 (Edge/Chrome) (generated)
├── .github/                 # Workflows and project docs
└── package.json             # Root package configuration
```

## 🛠️ Installation & Setup

### Prerequisites

- Node.js (v18 or higher)
- pnpm

### Backend Setup

```bash
# Install dependencies
npm run install:all

# Start development server
npm run dev
```

### Extension Setup (Edge Load-Unpacked)

1. Build MV3 bundle
   ```bash
   pnpm install
   pnpm build
   ```
2. Edge 打开 `edge://extensions/`（或 Chrome `chrome://extensions/`）
3. 打开“开发者模式”→ “加载已解压的扩展”
4. 选择仓库下的 `dist/` 目录
5. 确认工具栏显示扩展，打开 Popup 即可预览

## 🔧 Development

### Backend Development

```bash
cd backend
npm run dev
```

The backend server will start on `http://localhost:3001`

### API Endpoints (Backend)

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
pnpm test          # unit tests
pnpm lint          # eslint + prettier
pnpm test:ci       # CI-friendly run
```

## 📦 Build

```bash
pnpm build   # outputs MV3 bundle to dist/
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

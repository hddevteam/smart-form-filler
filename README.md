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

### Extension Development

```bash
pnpm dev         # Start development build with watch mode
pnpm test:watch  # TDD mode - run tests continuously
```

### Backend Reference (For Migration Only)

The `backend/` directory contains the **reference implementation** for AI services that should be migrated to frontend TypeScript:

- `backend/services/gptService/apiService.js` → Migrate to `src/background/services/ai/aiService.ts`
- `backend/services/gptService/config.js` → Migrate to `src/background/services/ai/modelConfig.ts`
- `backend/services/gptService/modelAdapters/` → Migrate to `src/background/services/ai/adapters/`

**See `.github/AI_SERVICE_MIGRATION.md` for detailed migration guide.**

**⚠️ Important**: The backend is NOT used at runtime - it's kept as a reference for migrating functionality to the frontend.

## ⚙️ Configuration

Configuration is done through the extension popup UI:

1. Click extension icon in browser toolbar
2. Go to Configuration section
3. Add AI provider configuration:
   - **Name**: Give your configuration a name (e.g., "My Azure GPT-4o")
   - **Provider**: Choose Azure OpenAI or Ollama
   - **Endpoint**: API endpoint URL
   - **API Key**: Your API key (for Azure OpenAI; not needed for Ollama)
   - **Model**: Model name

API keys are encrypted and stored securely in `chrome.storage.local`.

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

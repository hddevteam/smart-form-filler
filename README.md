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

### Migration Reference (Frontend Only)

This extension is pure frontend (MV3). The `backend/` folder is kept only as migration reference and is NOT used at runtime.
See `.github/AI_SERVICE_MIGRATION.md` for details.

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

API keys are encrypted and stored securely in `chrome.storage.local`. No server required.

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

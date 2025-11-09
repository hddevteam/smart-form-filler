# E2E Tests (Playwright)

- Location: `tests/e2e/`
- Run: `pnpm test:e2e`
- Scope (initial):
  - Popup configuration workflow (Azure & Ollama)
  - Content script form detection & filling on `docs/employee-form.html`

## TODO (M8)

- Chromium smoke spec: `edge/popupSmoke.spec.ts` (requires dev server at `http://localhost:5173`)
- Run with Edge channel via `PLAYWRIGHT_EDGE=1 pnpm test:e2e` (Edge must be installed)
- Future work: load unpacked `dist/` extension, mock AI responses, record traces on failure

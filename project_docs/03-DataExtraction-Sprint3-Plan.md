# 03 · Smart Form Filler — Sprint 3: Data Extraction Pure Frontend

**Version**: 1.0.0  
**Branch**: `develop` → `feature/mvp-sprint3-data-extraction` (TBD)  
**Last Updated**: 2026-06-29  
**Status**: Planning

---

## 1. Background & Goals

Sprint 2 completes the Form Filler AI pipeline. Sprint 3 eliminates the remaining backend dependency: **data extraction**. Currently, when a user clicks "Extract Data", the extension sends raw HTML to `POST /api/extension/extract-data-sources` on the Node.js backend, which uses Cheerio (HTML cleaning) and Turndown (HTML→Markdown) to generate three data sources. This means the extension is **non-functional without the backend running**.

**Goal**: Migrate `generateThreeDataSources()` entirely into the extension's Background Service Worker, so the extension works standalone with no Node.js server.

**MVP Definition**: A user can click "Extract Data" on any page and immediately receive three data source formats (Raw HTML, Cleaned HTML, Markdown) — entirely in-browser, no backend required.

---

## 2. Non-Goals

- Full Cheerio feature parity (use native DOM APIs instead)
- Server-side content optimization for very large pages (>1MB) — apply size limits client-side
- PDF or non-HTML content extraction
- Cross-origin iframe content (already handled by content script; out of scope here)
- AI-powered analysis/summarization of extracted content (that's chat's job)

---

## 3. Architecture Principle (Non-Negotiable)

```
❌ Old: Popup → fetch('/api/extension/extract-data-sources') → Backend (Cheerio + Turndown) → 3 sources
✅ New: Popup → chrome.runtime(EXTRACT_REQUEST) → Background SW → [DOM cleaner + Turndown.js] → 3 sources
```

Turndown.js is a browser-compatible library that can run in the Background Service Worker.
Cheerio (Node.js-only) is replaced with native DOM APIs via DOMParser + TreeWalker.

---

## 4. Gap Analysis

### G-S3-1 · HtmlProcessor (New)

- **Main reference**: `backend/controllers/utils/htmlProcessor.js` (205 lines) + parts of `dataExtractionController.js`
- **Problem**: HTML cleaning uses Cheerio (Node.js-only). Need browser-compatible equivalent using DOMParser.
- **Scope**:
  - `removeUnwantedElements()`: remove `<script>`, `<style>`, `<nav>`, `<footer>`, `<aside>`, ads
  - `cleanAttributes()`: strip event handlers, inline styles
  - `extractMainContent()`: select best content area (reuse `ContentAnalyzer.findBestContentSelectors()`)
  - `mergeIframeContents()`: inject iframe HTML into main DOM
  - `optimizeContentSize()`: truncate oversized content (max ~200KB)
- **Target file**: `src/services/processing/htmlProcessor.ts`
- **Estimate**: 2–3 days
- **Acceptance**: Given raw page HTML, produces clean HTML that matches backend output within 10% character count

### G-S3-2 · MarkdownConverter (New)

- **Main reference**: `backend/controllers/dataExtractionController.js` — `extractMarkdownDataSource()` + `postProcessMarkdown()` + `configureTurndownRules()`
- **Problem**: Turndown.js is used on the Node.js backend. Must add it as a frontend dependency.
- **Scope**:
  - Add `turndown` npm package
  - Port Turndown configuration (fenced code blocks, emphasis, links)
  - Port `postProcessMarkdown()` cleanup rules
  - Run in Background Service Worker (Web Worker-compatible)
- **Target file**: `src/services/processing/markdownConverter.ts`
- **Estimate**: 1–2 days
- **Acceptance**: Converted Markdown from a test page matches backend output structurally (headings, links, code blocks)

### G-S3-3 · DataSourceGenerator (New)

- **Main reference**: `backend/controllers/dataExtractionController.js` — `generateThreeDataSources()`
- **Problem**: The 3-source pipeline is on the backend.
- **Scope**:
  - `generateRawDataSource()`: preserve page HTML with metadata
  - `generateCleanedDataSource()`: apply HtmlProcessor
  - `generateMarkdownDataSource()`: apply MarkdownConverter on cleaned HTML
  - `generateStats()`: word count, reading time, compression ratio
  - Register `EXTRACT_DATA_SOURCES` handler in Background SW message router
- **Target file**: `src/background/services/dataExtraction/dataSourceGenerator.ts`
- **Estimate**: 1–2 days
- **Acceptance**: Returns `{ raw, cleaned, markdown }` with correct metadata shape

### G-S3-4 · Popup → Background SW Wiring

- **Main reference**: Current `src/popup/apis/backend.ts` `fetchDataSources()`
- **Problem**: Currently calls backend HTTP endpoint. Must route through Background SW.
- **Scope**:
  - Add `EXTRACT_DATA_SOURCES` case to `src/extension/background.ts`
  - Update `DataExtractor.getPageContent()` to send `EXTRACT_DATA_SOURCES` instead of backend fetch
  - Update `resultsHandler.ts` to accept the new response shape
  - Remove backend URL dependency from settings if no longer needed
- **Target file**: `src/extension/background.ts`, `src/modules/dataExtractor.ts`
- **Estimate**: 1 day
- **Acceptance**: Clicking "Extract Data" works with no backend running

---

## 5. Technical Design

### New Background Message Handler

```typescript
// src/extension/background.ts (new case)
case 'EXTRACT_DATA_SOURCES': {
  const { html, iframeContents, url, title } = message;
  const generator = new DataSourceGenerator();
  const result = await generator.generate({ html, iframeContents, url, title });
  sendResponse({ success: true, data: result });
  break;
}
```

### DataSourceGenerator Pipeline

```
Input: { html: string, iframeContents: IframeContent[], url: string, title: string }
  │
  ├─ 1. HtmlProcessor.merge(html, iframeContents)  → merged HTML
  ├─ 2. HtmlProcessor.clean(merged)               → cleaned HTML
  ├─ 3. MarkdownConverter.convert(cleaned)         → markdown text
  ├─ 4. generateStats(raw, cleaned, markdown)      → metadata
  │
Output: {
  raw:     { content: string, metadata: ExtractionMetadata }
  cleaned: { content: string, metadata: ExtractionMetadata }
  markdown: { content: string, metadata: ExtractionMetadata }
}
```

### HtmlProcessor — DOM-based Cleaning (replaces Cheerio)

```typescript
export class HtmlProcessor {
  clean(html: string): string {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    this.removeUnwantedElements(doc);
    this.cleanAttributes(doc);
    return doc.body.innerHTML;
  }

  private removeUnwantedElements(doc: Document): void {
    const selectors = [
      'script',
      'style',
      'noscript',
      'iframe',
      'nav',
      'footer',
      'aside',
      'header',
      '[class*="ad"]',
      '[class*="advertisement"]',
      '[class*="sidebar"]',
      '[aria-hidden="true"]',
    ];
    selectors.forEach(sel => doc.querySelectorAll(sel).forEach(el => el.remove()));
  }
}
```

### Size Budget

| Source       | Max Size | Rationale                |
| ------------ | -------- | ------------------------ |
| Raw HTML     | 500KB    | Full page with structure |
| Cleaned HTML | 200KB    | Remove noise             |
| Markdown     | 100KB    | Compressed text          |

---

## 6. Dependencies

```json
{
  "dependencies": {
    "turndown": "^7.2.0"
  }
}
```

`turndown` is browser-compatible and works in Service Workers.

---

## 7. BDD Test Scenarios

### HtmlProcessor

- Given page HTML with `<script>` and `<nav>`, clean HTML has neither
- Given page HTML, clean HTML retains `<p>`, `<h1>`-`<h6>`, `<a>`, `<table>`
- Given large HTML (>500KB), `optimizeContentSize()` truncates and adds notice
- Given HTML + iframe contents, merge correctly injects iframe HTML

### MarkdownConverter

- Given cleaned HTML with headings, Markdown has `#` markers
- Given HTML with `<a href>`, Markdown has `[text](url)` links
- Given HTML with `<code>`, Markdown has `` ` `` backticks
- `postProcessMarkdown()` removes excess blank lines (>2 consecutive)

### DataSourceGenerator

- Returns object with `{ raw, cleaned, markdown }` keys
- Each source has `{ content, metadata }` shape
- `metadata.wordCount` is > 0 for non-empty pages
- Works with empty iframe contents array

### Integration (Background SW)

- `EXTRACT_DATA_SOURCES` message returns success response
- No network calls to `localhost:3001` during extraction

---

## 8. Phased Delivery

### Week 1

| Task                        | Gap    | Est. |
| --------------------------- | ------ | ---- |
| Add turndown dependency     | G-S3-2 | 0.5d |
| MarkdownConverter (+ tests) | G-S3-2 | 1.5d |
| HtmlProcessor (+ tests)     | G-S3-1 | 2d   |

### Week 2

| Task                                      | Gap    | Est. |
| ----------------------------------------- | ------ | ---- |
| DataSourceGenerator (+ tests)             | G-S3-3 | 1.5d |
| Background SW wiring                      | G-S3-4 | 1d   |
| Popup integration + resultsHandler update | G-S3-4 | 0.5d |
| E2E smoke test for data extraction        | —      | 1d   |

---

## 9. Acceptance Checklist (Sprint 3 Complete)

### Data Extraction (No Backend)

- [ ] "Extract Data" button works with backend server stopped
- [ ] Raw HTML tab shows full page HTML
- [ ] Cleaned HTML tab shows HTML without scripts/nav/ads
- [ ] Markdown tab shows readable Markdown with headings and links
- [ ] Metadata tab shows word count, reading time, compression ratio

### Quality

- [ ] Markdown output is structurally equivalent to backend output (tested on 3 real pages)
- [ ] Large pages (>500KB) are handled without error (content truncated with notice)
- [ ] Empty pages show graceful empty state

### No Backend Dependency

- [ ] Extension extracts data with no network calls to any server (except AI for chat)
- [ ] Extension works in airplane mode (Ollama only)

### Tests

- [ ] `pnpm test -- --run` passes (≥280 unit tests)
- [ ] `pnpm test:e2e` passes (data extraction smoke tests added)

---

## 10. Migration Completion After Sprint 3

```
After Sprint 3, the only remaining backend dependency is:
✅ None — fully standalone extension

Features still using AI (via Background SW):
✅ Chat with Data (works, Sprint 1 complete)
✅ Form Filler analysis (Sprint 2 complete)

Features working without any network:
✅ Data extraction (Sprint 3 complete)
✅ Form detection & filling (content script)
✅ Settings & config (chrome.storage)
```

---

## 11. Risks & Rollback

| Risk                                      | Likelihood | Mitigation                                                                                                  |
| ----------------------------------------- | ---------- | ----------------------------------------------------------------------------------------------------------- |
| DOMParser not available in Service Worker | High       | Use `htmlparser2` (browser-compatible) as fallback, OR process in popup context and send cleaned HTML to BG |
| Turndown output differs from backend      | Medium     | Compare on 5 test pages before sprint close; acceptable delta = ±15% character count                        |
| Large pages cause SW memory issues        | Low        | Apply 500KB hard limit before processing                                                                    |
| Breaking resultsHandler data shape        | Medium     | Add shape migration with backward-compat shim                                                               |

> **DOMParser Note**: Service Workers do NOT have `DOMParser`. The HTML cleaning must either:
> (a) Run in the popup/content script context (send to SW after cleaning), OR
> (b) Use a pure-JS HTML parser (`node-html-parser` / `htmlparser2`) in the SW

**Recommended approach**: Run HtmlProcessor in the **popup context** (has `DOMParser`), send cleaned HTML to Background SW only for Markdown conversion (Turndown is SW-compatible).

---

## 12. Open Questions

| #   | Question                                                           | Target         |
| --- | ------------------------------------------------------------------ | -------------- |
| Q1  | Run HtmlProcessor in popup (DOMParser) or SW (needs library)?      | Sprint kickoff |
| Q2  | Keep backend as optional fallback during transition?               | Sprint kickoff |
| Q3  | Should Sprint 3 also migrate `popupSettingsManager` deduplication? | Backlog        |

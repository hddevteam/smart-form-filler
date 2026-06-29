# 01 · Smart Form Filler — TypeScript Migration MVP Plan

**Version**: 1.0.1  
**Branch**: `develop` → target: `main` merge  
**Last Updated**: 2026-06-29  
**Status**: Sprint 1 Complete — All P0/P1 Gaps Resolved ✅

---

## 1. Background & Goals

The `main` branch is a mature JavaScript implementation (v2.0.0, ~40 JS files).  
The `develop` branch is a TypeScript rewrite in progress (~52 TS files, 85% features migrated).

**Goal of this document**: Define the MVP scope — the minimum set of features that must be fully working in TypeScript before `develop` can replace `main` as the production branch.

**MVP Definition**: A user can install the extension from `extension/dist`, and all three core workflows — **Data Extraction**, **Chat with Data**, **Form Filler** — work end-to-end without relying on the legacy JS popup or backend workarounds.

---

## 2. Non-Goals

- Full feature parity on every edge case (that's v2 scope)
- Advanced Azure OAuth2 flow (simplified config is enough for MVP)
- Automated E2E test suite passing on CI (nice to have, not blocking)
- Side Panel mode (not in develop scope yet)
- Multilingual output (Chinese/English toggle is MVP; other languages are future)

---

## 3. Migration Status Overview

| Category                 | Total  | ✅ Done | ⚠️ Partial | ❌ Missing | % Done  |
| ------------------------ | ------ | ------- | ---------- | ---------- | ------- |
| Popup UI & Core          | 7      | 6       | 1          | 0          | 86%     |
| Data Extraction          | 3      | 3       | 0          | 0          | 100%    |
| Chat Features            | 2      | 2       | 0          | 0          | 100%    |
| Data Source Mgmt         | 4      | 3       | 1          | 0          | 75%     |
| Form Filler              | 7      | 6       | 1          | 0          | 86%     |
| AI & Backend Services    | 8      | 8       | 0          | 0          | 100%    |
| Content Scripts          | 5      | 3       | 2          | 0          | 60%     |
| Extension Infrastructure | 4      | 3       | 1          | 0          | 75%     |
| **TOTAL**                | **40** | **34**  | **6**      | **0**      | **85%** |

---

## 4. MVP Gap Analysis — What Must Be Fixed

### Architecture Principle (Non-Negotiable)

```
❌ Old (main branch):   Popup → fetch(localhost:3000/api/...) → AI Provider
✅ Target (develop):   Popup → chrome.runtime.sendMessage → Background SW → AI Provider
```

All AI calls **must** go through the Background Service Worker via `chrome.runtime.sendMessage`.  
`ExtensionClient.makeRequest(endpoint)` is a thin `fetch()` wrapper — it **must not** be used for AI or data processing calls.

---

### 🔴 P0 — MVP Blocking (must fix before release)

#### G0 · chatHandler still calls backend HTTP endpoint ⚠️ **NEWLY FOUND**

- **Problem**: `src/popup/modules/chatHandler.ts` line 98 calls `makeRequest('/extension/chat-with-data', ...)` which is a `fetch()` to the Node.js backend. This directly violates the pure-frontend architecture principle.
- **Impact**: Chat with Data feature is broken without the backend running locally. This is a critical regression.
- **Fix**: Replace with `sendAIRequest()` — build the chat messages locally (system prompt + data sources + chat history) and dispatch via `chrome.runtime.sendMessage` → Background SW → AI Provider.
- **Estimate**: 3–5 hours
- **Target file**: `src/popup/modules/chatHandler.ts`
- **Acceptance**: Chat works with Ollama or Azure without `localhost:3001` running.

#### G1 · Azure / API Key Authentication Flow

- **Problem**: Only a skeleton exists in develop (`extensionClient.ts`). The full token management and Azure endpoint flow from `auth/authManager.js` is not ported.
- **Impact**: Users configuring Azure OpenAI cannot authenticate properly.
- **Scope**: Port OAuth token storage, verification, and error display.
- **Estimate**: 5–10 hours
- **Target file**: `src/popup/auth/azureAuth.ts` (new) + update `src/popup/apis/extensionClient.ts`
- **Acceptance**: User can enter Azure API Key + Endpoint, test connection, and get a success indicator.

#### G2 · CSS Styling Completeness

- **Problem**: `extension/popup.html` loads TS-built JS but CSS is ~80% migrated. Several UI states (loading spinners, error cards, empty states, tab active indicator) are broken or unstyled.
- **Impact**: Affects every feature's perceived quality.
- **Scope**: Audit all CSS classes referenced in TS modules against `main` branch `popup.css`; port missing rules.
- **Estimate**: 2–4 hours
- **Target file**: `extension/styles/popup.css`
- **Acceptance**: All three feature tabs visually match the `main` branch popup.

### 🟡 P1 — Important (should fix for MVP, but won't block day-1 install)

#### G3 · Content Analyzer — Advanced Semantic Detection

- **Problem**: `content-analyzer.js` on main has heading detection, landmark analysis, and microdata extraction (~50% ported). Missing: accessibility checks, detailed content quality metrics.
- **Impact**: Form detection accuracy may be lower on complex pages.
- **Scope**: Port remaining analysis methods into `src/content/formDetector.ts`.
- **Estimate**: 4–6 hours
- **Acceptance**: Form detection on a standard login/registration form returns the same field list as main branch.

#### G4 · Data Source UI Controller Consolidation

- **Problem**: `DataSourceUIController.js` logic is spread across multiple components in develop; modal state management is fragmented.
- **Impact**: Occasional UI state inconsistencies when switching between Chat and Form Filler data source configs.
- **Scope**: Create `src/modules/popup/dataSourceUIController.ts` consolidating modal open/close, type selection, apply/cancel.
- **Estimate**: 3–5 hours
- **Acceptance**: Opening data source config modal in Chat tab does not affect Form Filler tab state.

### 🟢 P2 — Post-MVP Polish

#### G5 · Popup HTML Dual-File Cleanup

- **Problem**: Both `popup.html` (legacy) and `popup_ts.html` (TS build target) exist in `extension/`. The manifest uses `popup.html` which is the correctly built output, but `popup_ts.html` causes confusion.
- **Scope**: Remove `popup_ts.html` or clearly comment its role; update vite config input name to avoid ambiguity.
- **Estimate**: 1 hour

#### G6 · Side Panel Support

- **Problem**: `main` branch has `background-sidepanel.js` and manifest `side_panel` config. Not yet ported to develop.
- **Impact**: Side panel feature missing entirely.
- **Note**: This is out of MVP scope — track as a separate feature.

---

## 5. MVP Feature Checklist

The following must all pass manual smoke testing before MVP release:

### 5.1 Data Extraction

- [ ] Open popup on any webpage
- [ ] Click "Extract Data" — see loading state
- [ ] Results appear with Markdown / Raw HTML / Cleaned HTML / Metadata tabs
- [ ] Copy Markdown to clipboard works
- [ ] Extraction history persists across popup open/close
- [ ] Clear history works

### 5.2 Chat with Data

- [ ] Select a data source from history
- [ ] Send a chat message — see streaming response
- [ ] Model selector shows available models (Ollama + Azure)
- [ ] Refresh Ollama model list works
- [ ] Chat history visible within session

### 5.3 Form Filler

- [ ] Navigate to a page with a form
- [ ] Simple Mode: paste content → click Fill → form fields populated
- [ ] Advanced Mode: step-by-step workflow completes (Detect → Analyze → Map → Fill)
- [ ] Mode toggle (Simple ↔ Advanced) preserves content
- [ ] Language selection (Chinese/English) affects AI output
- [ ] Error state shown when no form detected

### 5.4 Configuration

- [ ] Azure API Key + Endpoint can be saved
- [ ] Connection test returns clear success/failure
- [ ] Backend URL (Ollama) configurable
- [ ] Settings persist after extension reload

### 5.5 Extension Infrastructure

- [ ] Extension loads without errors in Edge/Chrome DevTools console
- [ ] Background service worker registers successfully
- [ ] Content script injects on all http/https pages
- [ ] Icons display correctly in toolbar and extension management page

---

## 6. Phased Delivery Plan

### Phase 1 — Fix MVP Blockers (Week 1)

**Goal**: All P0 gaps resolved; smoke tests pass on Data Extraction and Chat.

| Task                                    | Gap | Owner   | Est.  |
| --------------------------------------- | --- | ------- | ----- |
| Port Azure auth flow                    | G1  | TBD     | 5–10h |
| Audit & complete CSS                    | G2  | TBD     | 2–4h  |
| Verify build pipeline (icons, manifest) | —   | Done ✅ | —     |

### Phase 2 — Stabilize Form Filler (Week 1–2)

**Goal**: Form Filler smoke tests pass; content analyzer accuracy restored.

| Task                                  | Gap | Owner | Est. |
| ------------------------------------- | --- | ----- | ---- |
| Complete content analyzer port        | G3  | TBD   | 4–6h |
| Consolidate Data Source UI Controller | G4  | TBD   | 3–5h |
| Full smoke test pass on 5.3 checklist | —   | TBD   | 2h   |

### Phase 3 — MVP Release Candidate (Week 2)

**Goal**: All smoke tests pass; `develop` branch tagged as `v3.0.0-rc.1`.

| Task                                     | Owner | Est. |
| ---------------------------------------- | ----- | ---- |
| Complete MVP checklist (§5)              | TBD   | 2–4h |
| Write CHANGELOG from main→develop        | TBD   | 1h   |
| Tag `v3.0.0-rc.1` and test clean install | TBD   | 1h   |
| Open PR: `develop` → `main`              | TBD   | —    |

### Phase 4 — Post-MVP (Future)

- Side panel support (G6)
- Full E2E Playwright test suite
- Popup HTML cleanup (G5)
- CI/CD pipeline green on develop

---

## 7. Technical Decisions (Confirmed)

| Decision        | Choice                              | Rationale                                                  |
| --------------- | ----------------------------------- | ---------------------------------------------------------- |
| Backend runtime | Keep as Node.js JS (unchanged)      | No value in migrating backend; extension is pure frontend  |
| HTTP client     | `fetch` (native) instead of `axios` | Browser extension context; no Node.js runtime              |
| Storage         | `chrome.storage.local`              | MV3 requirement; replaces localStorage for config          |
| Build tool      | Vite 5 + Rollup                     | Multi-entry point build for popup/background/content       |
| Test framework  | Vitest + Playwright                 | Already configured; TDD workflow in place                  |
| CSS approach    | Single `popup.css` file             | Matches main branch convention; avoid CSS-in-JS complexity |

---

## 8. Risks & Rollback

| Risk                                          | Likelihood                 | Mitigation                                                                           |
| --------------------------------------------- | -------------------------- | ------------------------------------------------------------------------------------ |
| Azure auth regression breaks enterprise users | Medium                     | Implement auth behind feature flag; fallback to API key only                         |
| Content analyzer changes break form detection | Medium                     | Compare field detection output against main branch on 5+ test pages before releasing |
| CSS incomplete causes unusable UI             | Low (caught in smoke test) | Run visual diff against main branch popup screenshots                                |
| `develop` accidentally breaks `main` via PR   | Low                        | Use squash merge; keep `main` branch protection enabled                              |

**Rollback**: `main` branch remains untouched until the PR is merged. Users on the old extension version are unaffected.

---

## 9. Open Questions

| #   | Question                                                                                         | Owner                                                         | Target Date |
| --- | ------------------------------------------------------------------------------------------------ | ------------------------------------------------------------- | ----------- |
| Q1  | Should Azure auth use API Key only (simpler) or full OAuth2 (more secure)?                       | Product                                                       | —           |
| Q2  | Is the backend (`localhost:3000`) required for MVP, or should the extension be fully standalone? | **Resolved: NO backend. Extension must be fully standalone.** | ✅          |
| Q3  | Should `popup_ts.html` be the primary popup entry or should we consolidate to one `popup.html`?  | Engineering                                                   | —           |

---

## 10. Acceptance Criteria for MVP

The MVP is considered **ready to merge** when:

1. All items in §5 (Feature Checklist) pass manual testing
2. P0 gaps G1 and G2 are resolved
3. No console errors on fresh extension install
4. `pnpm build` succeeds cleanly with no TypeScript errors
5. `pnpm test -- --run` passes (unit tests green)
6. PR description includes test evidence (screenshots or GIF)

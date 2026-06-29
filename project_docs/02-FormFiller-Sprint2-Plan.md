# 02 · Smart Form Filler — Sprint 2: Form Filler AI Pipeline

**Version**: 1.0.0  
**Branch**: `develop` → `feature/mvp-sprint2-form-filler` (TBD)  
**Last Updated**: 2026-06-29  
**Status**: Planning

---

## 1. Background & Goals

Sprint 1 completed the infrastructure and Chat/DataExtraction UI fixes. However, **Form Filler is currently non-functional**: the three core services (`FormFillerHandler`, `FormAnalysisService`, `FormDetectionService`) are stubs or missing entirely. The popup UI for Form Filler exists (SimpleMode + AdvancedMode components) but the actual AI-powered workflow is broken.

**Goal**: Implement the complete Form Filler AI pipeline as a pure-frontend TypeScript extension, calling AI via Background Service Worker (never directly to the legacy backend).

**MVP Definition**: A user can:

1. Navigate to a page with a form
2. Paste content (or select from data sources)
3. Click "Fill Forms" (Simple Mode) → fields are populated intelligently
4. OR use Advanced Mode step-by-step (Detect → Analyze → Map → Fill)

---

## 2. Non-Goals

- Full parity with every edge case in the original 665-line `formFillerHandler.js`
- Multi-form ranking with advanced relevance scoring (MVP uses first/best match)
- CollapsibleManager animation polish
- Form filling for dynamically-rendered SPAs with complex JS state
- Language options beyond Chinese/English

---

## 3. Architecture Principle (Non-Negotiable)

```
❌ Old: FormAnalysisService → fetch('/form-filler/analyze-form-relevance') → Backend → AI
✅ New: FormAnalysisService → sendAIRequest() → chrome.runtime → Background SW → AI Provider
```

All AI calls go through Background SW. The AI prompt logic (currently in `backend/controllers/formFillerController.js`) is migrated to frontend TypeScript.

---

## 4. Gap Analysis

### G-S2-1 · FormDetectionService (New)

- **Main reference**: `extension/src/modules/FormDetectionService.js`
- **Problem**: No TypeScript equivalent. `formDetector.ts` only provides raw DOM field extraction. `FormDetectionService` adds filtering, ranking, and summary generation needed for AI context.
- **Scope**:
  - Wrap `FormDetector.getDetectionResult()` with filtering logic
  - Generate form summary text for AI prompt context
  - Filter out non-relevant forms (login-only, search bars)
- **Target file**: `src/popup/services/formDetectionService.ts`
- **Estimate**: 1–2 days
- **Acceptance**: Given a page with 3 forms, returns ranked list with summary text for each

### G-S2-2 · FormAnalysisService (New)

- **Main reference**: `extension/src/modules/formAnalysisService.js` + `backend/controllers/formFillerController.js`
- **Problem**: Both stages call the backend. AI prompts live in `formFillerController.js` (861 lines).
- **Scope**:
  - **Stage 1** `analyzeFormRelevance()`: Build prompt from content + form structure → send via Background SW → parse relevance result
  - **Stage 2** `analyzeFieldMapping()`: Build field mapping prompt → send via Background SW → parse mapping JSON
  - Port prompt construction from `formFillerController.createEnhancedFormRelevancePrompt()` and `createFieldMappingPrompt()`
  - Support language (zh/en) in output
- **Target file**: `src/popup/services/formAnalysisService.ts`
- **Estimate**: 3–4 days
- **Acceptance**:
  - Stage 1: returns `{ success, selectedFormId, relevanceScore, reasoning }`
  - Stage 2: returns `{ success, mappings: [{ fieldId, suggestedValue, confidence }] }`

### G-S2-3 · FormFillerHandler (New)

- **Main reference**: `extension/src/modules/formFillerHandler.js` (665 lines)
- **Problem**: Stub only in `popup/index.ts`. The workflow orchestration (state machine, event wiring, progress updates) is missing.
- **Scope**:
  - 4-stage state machine: Detect → Analyze → Map → Fill
  - Event listeners for detectFormsBtn, analyzeContentBtn, generateMappingBtn, fillFormsBtn
  - Progress display via existing UI elements
  - Error recovery with per-stage retry
  - State: `currentForms`, `currentMappings`, `selectedFormId`, `analysisResult`
  - Wire to `FormDetectionService` + `FormAnalysisService`
  - Wire content script `fillForms` via `chrome.runtime.sendMessage`
- **Target file**: `src/popup/modules/formFillerHandler.ts`
- **Estimate**: 2–3 days
- **Acceptance**:
  - Simple Mode: fill textarea → click Fill → form fields populated
  - Advanced Mode: each stage button works independently
  - State resets cleanly on tab change

### G-S2-4 · SimpleMode Feature Parity Verification

- **Main reference**: `extension/src/modules/SimpleMode.js` (685 lines vs 167 lines in develop)
- **Problem**: Develop version is 75% smaller — risk of missing features.
- **Scope**:
  - Side-by-side comparison of main vs develop SimpleMode
  - Identify and port any missing: data source integration, progress steps, language selection
- **Target file**: `src/popup/modules/simpleMode.ts`
- **Estimate**: 1 day
- **Acceptance**: Simple Mode matches main's UX flow end-to-end

---

## 5. Technical Design

### FormAnalysisService — AI Prompt Pattern

```typescript
// src/popup/services/formAnalysisService.ts
export class FormAnalysisService {
  constructor(
    private readonly sendAIRequest: (opts: MakeRequestOptions) => Promise<AIResponse>,
    private readonly getApiConfig: () => Promise<ChatApiConfig>
  ) {}

  async analyzeFormRelevance(
    content: string,
    forms: DetectionResult,
    model: string,
    language: 'zh' | 'en' = 'zh'
  ): Promise<FormRelevanceResult> {
    const prompt = this.buildRelevancePrompt(content, forms, language);
    const { apiUrl, apiKey } = await this.getApiConfig();
    const response = await this.sendAIRequest({
      apiUrl, apiKey, model,
      messages: [
        { role: 'system', content: FORM_ANALYSIS_SYSTEM_PROMPT },
        { role: 'user', content: prompt },
      ],
      params: { max_tokens: 1000 },
    });
    return this.parseRelevanceResponse(response);
  }

  async analyzeFieldMapping(
    content: string,
    selectedForm: DetectedForm,
    model: string,
    analysisResult?: FormRelevanceResult,
    language: 'zh' | 'en' = 'zh'
  ): Promise<FieldMappingResult> { ... }
}
```

### FormFillerHandler — State Machine

```
IDLE → [detectForms()] → DETECTED
DETECTED → [analyzeContent()] → ANALYZED
ANALYZED → [generateMapping()] → MAPPED
MAPPED → [fillForms()] → FILLED
Any stage → [error] → ERROR (with retry)
Any stage → [reset] → IDLE
```

### Wire-up in popup/index.ts

```typescript
const formFillerHandler = new FormFillerHandler({
  formDetectionService: new FormDetectionService(),
  formAnalysisService: new FormAnalysisService(
    opts => extensionClient.sendAIRequest(opts),
    () => getApiConfig() // same as chatHandler
  ),
  fillForms: mappings => extensionClient.fillForms(mappings),
  getSelectedModel: () => getSelectedModel(),
  getDataSources: () => dataSourceManager.getFormFillerDataSources(),
});
```

---

## 6. BDD Test Scenarios

### FormDetectionService

- Given a page with 3 forms, returns ranked list with form summaries
- Given a page with only a search bar, returns empty relevant forms
- Generates correct form summary text for AI prompt

### FormAnalysisService — Stage 1

- Given content and form structure, sends AI_REQUEST via chrome.runtime
- Never calls backend fetch directly
- Parses AI response to `{ selectedFormId, relevanceScore }`
- On AI failure, throws typed error

### FormAnalysisService — Stage 2

- Given content and selected form, builds correct field mapping prompt
- Returns `mappings` array with `{ fieldId, suggestedValue }`
- Handles missing/optional fields gracefully

### FormFillerHandler

- detectForms() → transitions state to DETECTED, updates UI
- analyzeContent() → calls FormAnalysisService.analyzeFormRelevance()
- generateMapping() → calls FormAnalysisService.analyzeFieldMapping()
- fillForms() → sends fillForms message via chrome.runtime
- State resets correctly after clear

---

## 7. Phased Delivery

### Week 1

| Task                                  | Gap    | Est. |
| ------------------------------------- | ------ | ---- |
| FormDetectionService (+ tests)        | G-S2-1 | 1.5d |
| FormAnalysisService Stage 1 (+ tests) | G-S2-2 | 2d   |
| FormAnalysisService Stage 2 (+ tests) | G-S2-2 | 2d   |

### Week 2

| Task                                    | Gap    | Est. |
| --------------------------------------- | ------ | ---- |
| FormFillerHandler (+ tests)             | G-S2-3 | 2.5d |
| SimpleMode parity check + fixes         | G-S2-4 | 1d   |
| Wire-up in popup/index.ts               | —      | 0.5d |
| E2E smoke test (Simple + Advanced mode) | —      | 1d   |

---

## 8. Acceptance Checklist (Sprint 2 Complete)

### Simple Mode

- [ ] Content textarea accepts text or data source selection
- [ ] Click "Fill" → progress indicator shows Detect→Analyze→Map stages
- [ ] Form fields on active page are populated with correct values
- [ ] Language toggle (zh/en) affects AI output

### Advanced Mode

- [ ] Stage 1 "Detect Forms" button → shows detected forms list
- [ ] Stage 2 "Analyze Content" button → shows relevance result
- [ ] Stage 3 "Generate Mapping" button → shows field mapping preview
- [ ] Stage 4 "Fill Forms" button → fills form on page
- [ ] Each stage shows loading state and error recovery

### No Backend Dependency

- [ ] All AI calls go via chrome.runtime → Background SW
- [ ] Extension works with Ollama running locally (no internet needed)
- [ ] Extension works with Azure config (Ollama off)

### Tests

- [ ] `pnpm test -- --run` passes (≥250 unit tests)
- [ ] `pnpm test:e2e` passes (form filler smoke tests)
- [ ] `pnpm test:real-api` validates Ollama + Azure form mapping

---

## 9. Risks & Rollback

| Risk                                   | Likelihood | Mitigation                                                         |
| -------------------------------------- | ---------- | ------------------------------------------------------------------ |
| AI prompt quality differs from backend | Medium     | Port prompts verbatim from formFillerController.js; compare output |
| Field mapping JSON parsing fails       | Low        | Add schema validation with fallback to empty mappings              |
| SimpleMode size reduction hides bugs   | Medium     | Mandatory side-by-side test against main on 3 real forms           |
| AI response too slow for UX            | Low        | Show per-stage progress; allow cancel                              |

---

## 10. Open Questions

| #   | Question                                                              | Target         |
| --- | --------------------------------------------------------------------- | -------------- |
| Q1  | Should Simple Mode show per-stage progress or just spinner?           | Sprint kickoff |
| Q2  | Should field mapping confidence threshold be configurable?            | Sprint kickoff |
| Q3  | How to handle forms with only radio/checkbox fields (no text inputs)? | Implementation |

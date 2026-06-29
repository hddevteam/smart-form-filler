/**
 * FormFillerHandler — orchestrates the 4-stage form filling workflow.
 *
 * State machine: IDLE → DETECTED → ANALYZED → MAPPED → FILLED (or ERROR)
 *
 * TypeScript port of formFillerHandler.js (main branch, 665 lines).
 * All AI calls go through FormAnalysisService → Background SW (no backend HTTP).
 */
import { Logger } from '@/utils/logger';
import type { DetectedForm } from '@/content/formDetector';
import type {
  FormDetectionService,
  DetectionServiceResult,
} from '@/popup/services/formDetectionService';
import type {
  FormAnalysisService,
  FormRelevanceResult,
  FieldMapping,
} from '@/popup/services/formAnalysisService';
import type { ChatApiConfig, ChatDataSourceSelection } from '@/types/popup';

export type FormFillerState = 'IDLE' | 'DETECTED' | 'ANALYZED' | 'MAPPED' | 'FILLED' | 'ERROR';

export interface FormFillerHandlerDeps {
  formDetectionService: Pick<
    FormDetectionService,
    'detectForms' | 'extractPageHtml' | 'generateFormSummary' | 'filterRelevantForms'
  >;
  formAnalysisService: Pick<FormAnalysisService, 'analyzeFormRelevance' | 'analyzeFieldMapping'>;
  fillForms: (mappings: FieldMapping[]) => Promise<unknown>;
  getSelectedModel: () => string | null;
  getApiConfig: () => Promise<ChatApiConfig>;
  getContentInput: () => string;
  getDataSources: () => Pick<ChatDataSourceSelection, 'sources'> | null;
  getLanguage: () => string;
}

const logger = Logger.forScope('FormFillerHandler');

export class FormFillerHandler {
  private state: FormFillerState = 'IDLE';
  private currentForms: DetectedForm[] = [];
  private currentMappings: FieldMapping[] = [];
  private currentAnalysisResult: FormRelevanceResult | undefined;
  private selectedFormId: string | undefined;
  private pageHtml = '';

  constructor(private readonly deps: FormFillerHandlerDeps) {}

  // ── Public API ────────────────────────────────────────────────────────────────

  init(): void {
    this.bindButton('detectFormsBtn', () => void this.detectForms());
    this.bindButton('analyzeContentBtn', () => void this.analyzeContent());
    this.bindButton('generateMappingBtn', () => void this.generateMapping());
    this.bindButton('fillFormsBtn', () => void this.fillForms());
    this.bindButton('clearAllFormFillerBtn', () => this.reset());
    logger.info('FormFillerHandler initialized');
  }

  // ── Stage 1: Detect ───────────────────────────────────────────────────────────

  async detectForms(): Promise<DetectionServiceResult | false> {
    this.setStatus('Detecting forms on page…');
    try {
      const [result, html] = await Promise.all([
        this.deps.formDetectionService.detectForms(),
        this.deps.formDetectionService.extractPageHtml(),
      ]);

      this.pageHtml = html;
      const filtered = this.deps.formDetectionService.filterRelevantForms(result.forms);
      this.currentForms = filtered;

      if (filtered.length === 0) {
        this.setState('ERROR');
        this.setStatus('No relevant forms found on this page.');
        return false;
      }

      // Pre-select first/only form
      this.selectedFormId = filtered[0]?.id ?? `form-${filtered[0]?.index ?? 0}`;

      this.setState('DETECTED');
      this.setStatus(`Found ${filtered.length} form(s). Ready to analyze.`);
      this.renderDetectionResults(filtered);
      return result;
    } catch (err) {
      this.setState('ERROR');
      this.setStatus(`Detection failed: ${(err as Error).message}`);
      logger.error('detectForms error', err);
      return false;
    }
  }

  // ── Stage 2: Analyze ──────────────────────────────────────────────────────────

  async analyzeContent(): Promise<FormRelevanceResult | false> {
    if (this.state !== 'DETECTED' && this.state !== 'ANALYZED') return false;

    const model = this.deps.getSelectedModel();
    if (!model) {
      this.setStatus('Please select a model first.');
      return false;
    }

    this.setStatus('Analyzing form relevance…');
    try {
      const content = this.deps.getContentInput();
      const language = this.deps.getLanguage();

      const result = await this.deps.formAnalysisService.analyzeFormRelevance(
        content,
        this.currentForms,
        model,
        language,
        this.pageHtml
      );

      this.currentAnalysisResult = result;
      if (result.recommendedForm) this.selectedFormId = result.recommendedForm;

      this.setState('ANALYZED');
      this.setStatus(`Analysis complete. Recommended form: ${result.recommendedForm ?? 'N/A'}`);
      this.renderAnalysisResults(result);
      return result;
    } catch (err) {
      this.setState('ERROR');
      this.setStatus(`Analysis failed: ${(err as Error).message}`);
      logger.error('analyzeContent error', err);
      return false;
    }
  }

  // ── Stage 3: Map ──────────────────────────────────────────────────────────────

  async generateMapping(): Promise<FieldMapping[] | false> {
    if (this.state !== 'ANALYZED' && this.state !== 'DETECTED') return false;

    const model = this.deps.getSelectedModel();
    if (!model) {
      this.setStatus('Please select a model first.');
      return false;
    }

    const selectedForm =
      this.currentForms.find(f => (f.id ?? `form-${f.index}`) === this.selectedFormId) ??
      this.currentForms[0];

    if (!selectedForm) {
      this.setStatus('No form selected.');
      return false;
    }

    this.setStatus('Generating field mapping…');
    try {
      const content = this.deps.getContentInput();
      const language = this.deps.getLanguage();
      const dataSources = this.deps.getDataSources();

      const result = await this.deps.formAnalysisService.analyzeFieldMapping(
        content,
        selectedForm,
        model,
        this.currentAnalysisResult,
        language,
        dataSources ?? undefined
      );

      this.currentMappings = result.fieldMappings;
      this.setState('MAPPED');
      this.setStatus(`Mapping complete. ${result.fieldMappings.length} field(s) mapped.`);
      this.renderMappingResults(result.fieldMappings);
      return result.fieldMappings;
    } catch (err) {
      this.setState('ERROR');
      this.setStatus(`Mapping failed: ${(err as Error).message}`);
      logger.error('generateMapping error', err);
      return false;
    }
  }

  // ── Stage 4: Fill ─────────────────────────────────────────────────────────────

  async fillForms(): Promise<boolean> {
    if (this.currentMappings.length === 0) {
      this.setStatus('No mappings available. Run Generate Mapping first.');
      return false;
    }

    this.setStatus('Filling form fields…');
    try {
      await this.deps.fillForms(this.currentMappings);
      this.setState('FILLED');
      this.setStatus(`✓ Filled ${this.currentMappings.length} field(s) successfully.`);
      return true;
    } catch (err) {
      this.setState('ERROR');
      this.setStatus(`Fill failed: ${(err as Error).message}`);
      logger.error('fillForms error', err);
      return false;
    }
  }

  // ── Simple Mode shortcut ──────────────────────────────────────────────────────

  /** One-click fill: runs all 4 stages in sequence. */
  async simpleFill(): Promise<boolean> {
    const detected = await this.detectForms();
    if (!detected) return false;
    await this.analyzeContent();
    const mapped = await this.generateMapping();
    if (!mapped) return false;
    return this.fillForms();
  }

  // ── Reset ─────────────────────────────────────────────────────────────────────

  reset(): void {
    this.state = 'IDLE';
    this.currentForms = [];
    this.currentMappings = [];
    this.currentAnalysisResult = undefined;
    this.selectedFormId = undefined;
    this.pageHtml = '';
    this.setStatus('');
    logger.info('FormFillerHandler reset');
  }

  // ── Getters ───────────────────────────────────────────────────────────────────

  getState(): FormFillerState {
    return this.state;
  }
  getCurrentForms(): DetectedForm[] {
    return [...this.currentForms];
  }
  getCurrentMappings(): FieldMapping[] {
    return [...this.currentMappings];
  }

  // ── Private helpers ───────────────────────────────────────────────────────────

  private setState(state: FormFillerState): void {
    this.state = state;
    logger.debug('State →', state);
  }

  private setStatus(message: string): void {
    const el = document.getElementById('formFillerStatus');
    if (el) el.textContent = message;
  }

  private renderDetectionResults(forms: DetectedForm[]): void {
    const el = document.getElementById('detectionResults');
    if (!el) return;
    el.innerHTML = forms
      .map(
        f => `<div>Form ${f.index + 1}${f.id ? ` (${f.id})` : ''}: ${f.fields.length} fields</div>`
      )
      .join('');
  }

  private renderAnalysisResults(result: FormRelevanceResult): void {
    const el = document.getElementById('analysisResults');
    if (!el) return;
    el.innerHTML = `<div>Recommended: ${result.recommendedForm} (confidence: ${Math.round(result.confidence * 100)}%)</div>`;
  }

  private renderMappingResults(mappings: FieldMapping[]): void {
    const el = document.getElementById('mappingResults');
    if (!el) return;
    el.innerHTML = mappings.map(m => `<div>${m.fieldId}: ${m.suggestedValue}</div>`).join('');
  }

  private bindButton(id: string, handler: () => void): void {
    const btn = document.getElementById(id);
    if (btn) btn.addEventListener('click', handler);
  }
}

export default FormFillerHandler;

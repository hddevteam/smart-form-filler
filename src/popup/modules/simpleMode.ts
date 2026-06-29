export interface SimpleModeWorkflow {
  detectForms(): Promise<void>;
  analyze(content: string, dataSources: unknown[]): Promise<void>;
  generate(): Promise<void>;
  hasMappings(): boolean;
}

export interface SimpleModeElements {
  container: HTMLElement;
  contentInput: HTMLTextAreaElement;
  submitBtn: HTMLButtonElement;
  clearBtn: HTMLButtonElement | null;
  retryBtn: HTMLButtonElement | null;
  languageSelect: HTMLSelectElement | null;
  progressContainer: HTMLElement | null;
  progressText: HTMLElement | null;
  progressIcon: HTMLElement | null;
  resultsContainer: HTMLElement | null;
  fillSection: HTMLElement | null;
  fillFormsBtn: HTMLButtonElement | null;
  errorContainer: HTMLElement | null;
  errorMessage: HTMLElement | null;
}

export interface SimpleModeDeps {
  elements: SimpleModeElements;
  workflow: SimpleModeWorkflow;
  getSelectedDataSources?: () => unknown[];
  getLanguage?: () => string;
  document?: Document;
}

const STEP_CONFIG = [
  { key: 'detecting', icon: '🔍', message: 'Detecting forms...' },
  { key: 'analyzing', icon: '📊', message: 'Analyzing content...' },
  { key: 'generating', icon: '🔗', message: 'Generating mapping...' },
] as const;

export class SimpleMode {
  private readonly elements: SimpleModeElements;
  private readonly workflow: SimpleModeWorkflow;
  private readonly getSelectedDataSources: () => unknown[];
  private readonly getLanguage: () => string;
  private isProcessing = false;
  private lastContent = '';
  private lastDataSources: unknown[] = [];

  constructor({ elements, workflow, getSelectedDataSources, getLanguage }: SimpleModeDeps) {
    this.elements = elements;
    this.workflow = workflow;
    this.getSelectedDataSources = getSelectedDataSources ?? (() => []);
    this.getLanguage = getLanguage ?? (() => 'zh');

    this.bindEvents();
    this.updateSubmitButtonState();
  }

  private bindEvents(): void {
    this.elements.contentInput.addEventListener('input', () => {
      this.updateSubmitButtonState();
    });

    this.elements.submitBtn.addEventListener('click', event => {
      event.preventDefault();
      void this.handleSubmit();
    });

    this.elements.clearBtn?.addEventListener('click', () => this.handleClear());
    this.elements.retryBtn?.addEventListener('click', () => void this.handleRetry());
    this.elements.fillFormsBtn?.addEventListener('click', () => void this.handleFillForms());
    this.elements.languageSelect?.addEventListener('change', () => this.updateSubmitButtonState());
  }

  private async handleFillForms(): Promise<void> {
    if (!this.workflow.hasMappings()) return;
    // Re-trigger generate to fill directly if already mapped
    await this.workflow.generate();
  }

  private async handleRetry(): Promise<void> {
    this.hideAllStates();
    await this.handleSubmitWith(this.lastContent, this.lastDataSources);
  }

  private handleClear(): void {
    this.elements.contentInput.value = '';
    this.hideAllStates();
    this.updateSubmitButtonState();
  }

  private hideAllStates(): void {
    this.elements.progressContainer?.classList.add('hidden');
    this.elements.resultsContainer?.classList.add('hidden');
    this.elements.errorContainer?.classList.add('hidden');
    this.elements.fillSection?.classList.add('hidden');
    if (this.elements.fillFormsBtn) this.elements.fillFormsBtn.disabled = true;
  }

  private showProgress(stepIndex: number): void {
    const step = STEP_CONFIG[stepIndex];
    if (!step) return;

    this.elements.progressContainer?.classList.remove('hidden');
    this.elements.resultsContainer?.classList.add('hidden');
    this.elements.errorContainer?.classList.add('hidden');

    if (this.elements.progressText) this.elements.progressText.textContent = step.message;
    if (this.elements.progressIcon) this.elements.progressIcon.textContent = step.icon;
  }

  private showResults(): void {
    this.elements.progressContainer?.classList.add('hidden');
    this.elements.resultsContainer?.classList.remove('hidden');
    this.elements.errorContainer?.classList.add('hidden');

    const hasMappings = this.workflow.hasMappings();
    if (this.elements.fillFormsBtn) this.elements.fillFormsBtn.disabled = !hasMappings;
    if (this.elements.fillSection) {
      if (hasMappings) this.elements.fillSection.classList.remove('hidden');
      else this.elements.fillSection.classList.add('hidden');
    }
  }

  private showError(message: string): void {
    this.hideAllStates();
    this.elements.progressContainer?.classList.add('hidden');
    this.elements.resultsContainer?.classList.add('hidden');
    this.elements.errorContainer?.classList.remove('hidden');
    if (this.elements.errorMessage) this.elements.errorMessage.textContent = message;
  }

  /** Returns the currently selected language. */
  getSelectedLanguage(): string {
    return this.elements.languageSelect?.value ?? this.getLanguage();
  }

  private getEffectiveContent(): string {
    return this.elements.contentInput.value.trim();
  }

  private hasSelectedDataSources(): boolean {
    return (this.getSelectedDataSources() ?? []).length > 0;
  }

  private updateSubmitButtonState(): void {
    if (!this.elements.submitBtn) return;
    if (this.isProcessing) {
      this.elements.submitBtn.disabled = true;
      return;
    }

    const hasContent = this.getEffectiveContent().length > 0;
    const hasSources = this.hasSelectedDataSources();
    this.elements.submitBtn.disabled = !(hasContent || hasSources);
  }

  async handleSubmit(): Promise<void> {
    if (this.isProcessing) return;

    const content = this.getEffectiveContent();
    const dataSources = this.getSelectedDataSources();
    await this.handleSubmitWith(content, dataSources);
  }

  private async handleSubmitWith(content: string, dataSources: unknown[]): Promise<void> {
    if (!content && (!dataSources || dataSources.length === 0)) {
      this.showError('Please enter content or select data sources before submitting.');
      this.updateSubmitButtonState();
      return;
    }

    this.lastContent = content;
    this.lastDataSources = dataSources;

    try {
      this.isProcessing = true;
      this.updateSubmitButtonState();

      this.showProgress(0);
      await this.workflow.detectForms();

      this.showProgress(1);
      await this.workflow.analyze(content, dataSources);

      this.showProgress(2);
      await this.workflow.generate();

      this.showResults();
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.showError(`Simple mode failed: ${message}`);
    } finally {
      this.isProcessing = false;
      this.updateSubmitButtonState();
    }
  }
}

export default SimpleMode;

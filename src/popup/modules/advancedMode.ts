export interface AdvancedModeDeps {
  formFillerHandler: {
    currentForms?: unknown[];
    currentAnalysisResult?: unknown;
    currentMappings?: unknown[];
    getCurrentForms?: () => unknown[];
    getCurrentMappings?: () => unknown[];
    getState?: () => string;
  };
  documentRef?: Document;
}

const RESULTS_CONTAINER_IDS = [
  'formDetectionResults',
  'analysisResultsContainer',
  'mappingResultsContainer',
];

export class AdvancedMode {
  private readonly handler: AdvancedModeDeps['formFillerHandler'];
  private readonly documentRef: Document;
  private readonly container: HTMLElement | null;
  private readonly contentAnalysisSection: HTMLElement | null;
  private readonly fieldMappingSection: HTMLElement | null;
  private readonly fillActionsSection: HTMLElement | null;
  private readonly collapsibleHeaders: NodeListOf<Element>;
  private collapsedSections = new Set<string>();

  constructor({ formFillerHandler, documentRef }: AdvancedModeDeps) {
    this.handler = formFillerHandler;
    this.documentRef = documentRef ?? window.document;
    this.container = this.documentRef.getElementById('formFillerAdvancedMode');

    this.contentAnalysisSection = this.documentRef.getElementById('advancedContentAnalysis');
    this.fieldMappingSection = this.documentRef.getElementById('advancedFieldMapping');
    this.fillActionsSection = this.documentRef.getElementById('advancedFillActions');

    this.collapsibleHeaders =
      this.container?.querySelectorAll('.advanced-mode__section-header--collapsible') ??
      this.documentRef.querySelectorAll('.advanced-mode__section-header--collapsible');

    this.bindEvents();
  }

  private bindEvents(): void {
    this.collapsibleHeaders.forEach(header => {
      header.addEventListener('click', event => {
        event.stopPropagation();
        const target = (header as HTMLElement).dataset.target;
        if (target) {
          this.toggleSection(target);
        }
      });
    });

    this.documentRef.addEventListener('click', event => {
      const button = (event.target as HTMLElement | null)?.closest('.section__collapse-btn');
      if (!button) return;
      if (!this.container || !this.container.contains(button)) return;

      event.stopPropagation();
      const target = (button as HTMLElement).dataset.target;
      if (target) this.toggleResultsSection(target);
    });

    // Listen for workflow events to auto-update visibility
    this.documentRef.addEventListener('formDetectionCompleted', () =>
      this.updateSectionVisibility()
    );
    this.documentRef.addEventListener('analysisCompleted', () => this.updateSectionVisibility());
    this.documentRef.addEventListener('mappingCompleted', () => this.updateSectionVisibility());
  }

  toggleSection(sectionId: string): void {
    if (!this.container) return;
    const content = this.container.querySelector<HTMLElement>(
      `.advanced-mode__section-content[data-section="${sectionId}"]`
    );
    const header = this.container.querySelector<HTMLElement>(`[data-target="${sectionId}"]`);
    const icon = header?.querySelector<HTMLElement>('.advanced-mode__collapse-icon');

    if (!content || !header) return;

    const isCollapsed = this.collapsedSections.has(sectionId);
    if (isCollapsed) {
      content.classList.remove('advanced-mode__section-content--collapsed');
      this.collapsedSections.delete(sectionId);
      if (icon) icon.textContent = '▼';
    } else {
      content.classList.add('advanced-mode__section-content--collapsed');
      this.collapsedSections.add(sectionId);
      if (icon) icon.textContent = '▶';
    }
  }

  toggleResultsSection(sectionId: string): void {
    if (!this.container) return;
    const content = this.container.querySelector<HTMLElement>(`[data-section="${sectionId}"]`);
    const button = this.container.querySelector<HTMLElement>(`[data-target="${sectionId}"]`);
    const icon = button?.querySelector<HTMLElement>('.collapse-icon');

    if (!content || !button) return;

    const isCollapsed = content.classList.contains('collapsed');
    if (isCollapsed) {
      content.classList.remove('collapsed');
      if (icon) icon.textContent = '▼';
    } else {
      content.classList.add('collapsed');
      if (icon) icon.textContent = '▶';
    }
  }

  updateSectionVisibility(): void {
    const forms = this.handler.getCurrentForms?.() ?? this.handler.currentForms ?? [];
    const hasForms = forms.length > 0;
    const state = this.handler.getState?.() ?? '';
    const hasAnalysis =
      !!this.handler.currentAnalysisResult ||
      state === 'ANALYZED' ||
      state === 'MAPPED' ||
      state === 'FILLED';
    const hasMappings =
      (this.handler.getCurrentMappings?.() ?? this.handler.currentMappings ?? []).length > 0;

    if (this.contentAnalysisSection) {
      this.toggleHidden(this.contentAnalysisSection, !hasForms);
    }
    if (this.fieldMappingSection) {
      this.toggleHidden(this.fieldMappingSection, !hasAnalysis);
    }
    if (this.fillActionsSection) {
      this.toggleHidden(this.fillActionsSection, !hasMappings);
    }
  }

  private toggleHidden(element: HTMLElement, hidden: boolean): void {
    if (hidden) element.classList.add('hidden');
    else element.classList.remove('hidden');
  }

  expandSection(sectionId: string): void {
    if (this.collapsedSections.has(sectionId)) this.toggleSection(sectionId);
  }

  collapseSection(sectionId: string): void {
    if (!this.collapsedSections.has(sectionId)) this.toggleSection(sectionId);
  }

  expandAllSections(): void {
    ['formDetection', 'contentAnalysis', 'fieldMapping', 'fillActions'].forEach(id =>
      this.expandSection(id)
    );
  }

  collapseAllSections(): void {
    ['formDetection', 'contentAnalysis', 'fieldMapping', 'fillActions'].forEach(id =>
      this.collapseSection(id)
    );
  }

  highlightActiveStep(stepName: string): void {
    if (!this.container) return;
    this.clearStepHighlights();
    const section = this.container.querySelector<HTMLElement>(`[data-step="${stepName}"]`);
    if (section) {
      section.classList.add('advanced-mode__section--active');
      const sectionId = section.dataset.section;
      if (sectionId) this.expandSection(sectionId);
    }
  }

  clearStepHighlights(): void {
    if (!this.container) return;
    this.container.querySelectorAll('.advanced-mode__section').forEach(section => {
      section.classList.remove('advanced-mode__section--active');
    });
  }

  updateStepStatus(
    stepName: string,
    status: 'success' | 'error' | 'pending' | null,
    message?: string
  ): void {
    if (!this.container) return;
    const section = this.container.querySelector<HTMLElement>(`[data-step="${stepName}"]`);
    if (!section) return;

    section.classList.remove(
      'advanced-mode__section--success',
      'advanced-mode__section--error',
      'advanced-mode__section--pending'
    );

    if (status) section.classList.add(`advanced-mode__section--${status}`);

    if (message) {
      const statusEl = section.querySelector<HTMLElement>('.advanced-mode__step-status');
      if (statusEl) statusEl.textContent = message;
    }
  }

  reset(): void {
    this.clearStepHighlights();
    ['formDetection', 'contentAnalysis', 'fieldMapping', 'fillActions'].forEach(step =>
      this.updateStepStatus(step, null)
    );

    [this.contentAnalysisSection, this.fieldMappingSection, this.fillActionsSection].forEach(
      section => {
        if (section) section.classList.add('hidden');
      }
    );

    RESULTS_CONTAINER_IDS.forEach(id => {
      const el = this.documentRef.getElementById(id);
      if (el) el.classList.add('hidden');
    });

    this.container?.querySelectorAll('.section__content--collapsible').forEach(content => {
      content.classList.remove('collapsed');
    });

    this.container?.querySelectorAll('.collapse-icon').forEach(icon => {
      icon.textContent = '▼';
    });

    this.container?.querySelectorAll('.advanced-mode__collapse-icon').forEach(icon => {
      icon.textContent = '▼';
    });

    this.container
      ?.querySelectorAll('.advanced-mode__section-content--collapsed')
      .forEach(content => {
        content.classList.remove('advanced-mode__section-content--collapsed');
      });

    this.collapsedSections.clear();
  }

  show(): void {
    if (!this.container) return;
    this.container.classList.remove('hidden');
    this.updateSectionVisibility();
  }

  hide(): void {
    this.container?.classList.add('hidden');
  }

  isVisible(): boolean {
    return !!this.container && !this.container.classList.contains('hidden');
  }

  updateDataSourceButton(): void {
    this.documentRef.dispatchEvent(new CustomEvent('advancedModeDataSourceUpdate'));
  }

  setContent(content: string): void {
    const contentInput = this.documentRef.getElementById(
      'fillContentInput'
    ) as HTMLTextAreaElement | null;
    if (contentInput) contentInput.value = content;
  }

  getContent(): string {
    const contentInput = this.documentRef.getElementById(
      'fillContentInput'
    ) as HTMLTextAreaElement | null;
    return contentInput?.value ?? '';
  }

  getLanguage(): string {
    const select = this.documentRef.getElementById('languageSelect') as HTMLSelectElement | null;
    return select?.value ?? 'en';
  }

  setLanguage(language: string): void {
    const select = this.documentRef.getElementById('languageSelect') as HTMLSelectElement | null;
    if (select) select.value = language;
  }

  getProgress(): { [key: string]: boolean } {
    const forms = this.handler.getCurrentForms?.() ?? this.handler.currentForms ?? [];
    const state = this.handler.getState?.() ?? '';
    const analysis =
      !!this.handler.currentAnalysisResult ||
      state === 'ANALYZED' ||
      state === 'MAPPED' ||
      state === 'FILLED';
    const mappings =
      (this.handler.getCurrentMappings?.() ?? this.handler.currentMappings ?? []).length > 0;
    return {
      formDetection: forms.length > 0,
      contentAnalysis: analysis,
      fieldMapping: mappings,
      formFilling: false,
    };
  }

  scrollToSection(sectionId: string): void {
    if (!this.container) return;
    const element = this.container.querySelector<HTMLElement>(`[data-section="${sectionId}"]`);
    element?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
}

export default AdvancedMode;

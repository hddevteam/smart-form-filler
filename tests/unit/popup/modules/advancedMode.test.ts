import { beforeEach, describe, expect, it } from 'vitest';
import { AdvancedMode, AdvancedModeDeps } from '@/popup/modules/advancedMode';

describe('AdvancedMode', () => {
  let container: HTMLElement;
  let formDetectionSection: HTMLElement;
  let contentAnalysisSection: HTMLElement;
  let fieldMappingSection: HTMLElement;
  let fillActionsSection: HTMLElement;
  let formFillerHandler: any;
  let deps: AdvancedModeDeps;

  const setupDom = () => {
    document.body.innerHTML = `
      <div id="formFillerAdvancedMode">
        <section id="advancedFormDetection" class="advanced-mode__section" data-section="formDetection" data-step="formDetection">
          <header class="advanced-mode__section-header--collapsible" data-target="formDetection">
            <span class="advanced-mode__collapse-icon">▼</span>
          </header>
          <div class="advanced-mode__section-content" data-section="formDetection"></div>
        </section>
        <section id="advancedContentAnalysis" class="advanced-mode__section hidden" data-section="contentAnalysis" data-step="contentAnalysis">
          <header class="advanced-mode__section-header--collapsible" data-target="contentAnalysis">
            <span class="advanced-mode__collapse-icon">▼</span>
          </header>
          <div class="advanced-mode__section-content" data-section="contentAnalysis"></div>
        </section>
        <section id="advancedFieldMapping" class="advanced-mode__section hidden" data-section="fieldMapping" data-step="fieldMapping">
          <header class="advanced-mode__section-header--collapsible" data-target="fieldMapping">
            <span class="advanced-mode__collapse-icon">▼</span>
          </header>
          <div class="advanced-mode__section-content" data-section="fieldMapping"></div>
        </section>
        <section id="advancedFillActions" class="advanced-mode__section hidden" data-section="fillActions" data-step="fillActions">
          <header class="advanced-mode__section-header--collapsible" data-target="fillActions">
            <span class="advanced-mode__collapse-icon">▼</span>
          </header>
          <div class="advanced-mode__section-content" data-section="fillActions"></div>
        </section>
        <button class="section__collapse-btn" data-target="formDetectionResultsContent"><span class="collapse-icon">▼</span></button>
        <div class="section__content--collapsible" data-section="formDetectionResultsContent"></div>
      </div>
    `;

    container = document.getElementById('formFillerAdvancedMode') as HTMLElement;
    formDetectionSection = document.getElementById('advancedFormDetection') as HTMLElement;
    contentAnalysisSection = document.getElementById('advancedContentAnalysis') as HTMLElement;
    fieldMappingSection = document.getElementById('advancedFieldMapping') as HTMLElement;
    fillActionsSection = document.getElementById('advancedFillActions') as HTMLElement;
  };

  const createInstance = () => {
    formFillerHandler = {
      currentForms: [],
      currentAnalysisResult: null,
      currentMappings: [],
    };

    deps = {
      documentRef: document,
      formFillerHandler,
    } as AdvancedModeDeps;

    return new AdvancedMode(deps);
  };

  beforeEach(() => {
    setupDom();
  });

  it('toggles section collapse state', () => {
    const instance = createInstance();
    instance.toggleSection('formDetection');
    expect(
      formDetectionSection.querySelector('[data-section="formDetection"]')?.classList
    ).toContain('advanced-mode__section-content--collapsed');
    instance.toggleSection('formDetection');
    expect(
      formDetectionSection
        .querySelector('[data-section="formDetection"]')
        ?.classList.contains('advanced-mode__section-content--collapsed')
    ).toBe(false);
  });

  it('updates section visibility based on form filler state', () => {
    const instance = createInstance();
    formFillerHandler.currentForms = [{}];
    formFillerHandler.currentAnalysisResult = { id: 'analysis' };
    formFillerHandler.currentMappings = [{}];

    instance.updateSectionVisibility();

    expect(contentAnalysisSection.classList.contains('hidden')).toBe(false);
    expect(fieldMappingSection.classList.contains('hidden')).toBe(false);
    expect(fillActionsSection.classList.contains('hidden')).toBe(false);
  });

  it('toggles results collapsible content', () => {
    const instance = createInstance();
    const content = container.querySelector(
      '[data-section="formDetectionResultsContent"]'
    ) as HTMLElement;
    expect(content.classList.contains('collapsed')).toBe(false);
    instance.toggleResultsSection('formDetectionResultsContent');
    expect(content.classList.contains('collapsed')).toBe(true);
    instance.toggleResultsSection('formDetectionResultsContent');
    expect(content.classList.contains('collapsed')).toBe(false);
  });

  it('resets state and clears highlights', () => {
    const instance = createInstance();
    formDetectionSection.classList.add('advanced-mode__section--active');
    contentAnalysisSection.classList.remove('hidden');

    instance.reset();

    expect(formDetectionSection.classList.contains('advanced-mode__section--active')).toBe(false);
    expect(contentAnalysisSection.classList.contains('hidden')).toBe(true);
  });

  it('show and hide toggle container visibility', () => {
    const instance = createInstance();
    instance.hide();
    expect(container.classList.contains('hidden')).toBe(true);
    instance.show();
    expect(container.classList.contains('hidden')).toBe(false);
  });
});

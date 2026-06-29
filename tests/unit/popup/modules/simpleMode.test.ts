import { beforeEach, describe, expect, it, vi } from 'vitest';
import { SimpleMode, SimpleModeWorkflow } from '@/popup/modules/simpleMode';

type WorkflowSpies = {
  detectForms: ReturnType<typeof vi.fn>;
  analyze: ReturnType<typeof vi.fn>;
  generate: ReturnType<typeof vi.fn>;
  hasMappings: ReturnType<typeof vi.fn>;
};

const flushPromises = () => new Promise(resolve => setTimeout(resolve, 0));

describe('SimpleMode', () => {
  let elements: ReturnType<typeof setupDom>;
  let workflow: WorkflowSpies;

  function setupDom() {
    document.body.innerHTML = `
      <section id="formFillerSimpleMode">
        <select id="simpleModeLanguageSelect"></select>
        <button id="simpleModeDataSourceBtn"></button>
        <span id="simpleModeDataSourceText"></span>
        <span id="simpleModeDataSourceIcon"></span>
        <textarea id="simpleModeContentInput"></textarea>
        <button id="simpleModeSubmitBtn" disabled>Submit</button>
        <button id="simpleModeClearBtn">Clear</button>
        <div id="simpleModeProgress" class="hidden"></div>
        <div id="simpleModeProgressText"></div>
        <div id="simpleModeProgressIcon"></div>
        <div id="simpleModeResults" class="hidden"></div>
        <div id="simpleModeFillSection" class="hidden"></div>
        <button id="simpleModeFillFormsBtn" disabled>Fill</button>
        <div id="simpleModeError" class="hidden">
          <span id="simpleModeErrorMessage"></span>
        </div>
      </section>
    `;

    return {
      container: document.getElementById('formFillerSimpleMode') as HTMLElement,
      languageSelect: document.getElementById('simpleModeLanguageSelect') as HTMLSelectElement,
      dataSourceBtn: document.getElementById('simpleModeDataSourceBtn') as HTMLButtonElement,
      dataSourceText: document.getElementById('simpleModeDataSourceText') as HTMLElement,
      dataSourceIcon: document.getElementById('simpleModeDataSourceIcon') as HTMLElement,
      contentInput: document.getElementById('simpleModeContentInput') as HTMLTextAreaElement,
      submitBtn: document.getElementById('simpleModeSubmitBtn') as HTMLButtonElement,
      clearBtn: document.getElementById('simpleModeClearBtn') as HTMLButtonElement,
      progressContainer: document.getElementById('simpleModeProgress') as HTMLElement,
      progressText: document.getElementById('simpleModeProgressText') as HTMLElement,
      progressIcon: document.getElementById('simpleModeProgressIcon') as HTMLElement,
      resultsContainer: document.getElementById('simpleModeResults') as HTMLElement,
      fillSection: document.getElementById('simpleModeFillSection') as HTMLElement,
      fillFormsBtn: document.getElementById('simpleModeFillFormsBtn') as HTMLButtonElement,
      errorContainer: document.getElementById('simpleModeError') as HTMLElement,
      errorMessage: document.getElementById('simpleModeErrorMessage') as HTMLElement,
    };
  }

  function createHandler(overrides: Partial<WorkflowSpies> = {}, dataSources: unknown[] = []) {
    workflow = {
      detectForms: vi.fn().mockResolvedValue(undefined),
      analyze: vi.fn().mockResolvedValue(undefined),
      generate: vi.fn().mockResolvedValue(undefined),
      hasMappings: vi.fn().mockReturnValue(true),
      ...overrides,
    };

    return new SimpleMode({
      elements,
      workflow: workflow as unknown as SimpleModeWorkflow,
      getSelectedDataSources: () => dataSources,
      document: document,
    });
  }

  beforeEach(() => {
    elements = setupDom();
  });

  it('disables submit when there is no content or selected data sources', () => {
    createHandler();

    expect(elements.submitBtn.disabled).toBe(true);
  });

  it('enables submit when content is entered', () => {
    createHandler();
    elements.contentInput.value = 'Example content';
    elements.contentInput.dispatchEvent(new Event('input'));

    expect(elements.submitBtn.disabled).toBe(false);
  });

  it('enables submit when data sources are selected', () => {
    createHandler({}, [{ id: 'source-1' }]);

    expect(elements.submitBtn.disabled).toBe(false);
  });

  it('shows error when submitting without content or data source', async () => {
    const handler = createHandler();

    await handler.handleSubmit();

    expect(elements.errorContainer.classList.contains('hidden')).toBe(false);
    expect(elements.errorMessage.textContent).toContain('Please enter content');
    expect(workflow.detectForms).not.toHaveBeenCalled();
  });

  it('runs workflow steps when submission is valid', async () => {
    createHandler({}, [{ id: 'source-1' }]);

    elements.submitBtn.click();
    await flushPromises();

    expect(workflow.detectForms).toHaveBeenCalled();
    expect(workflow.analyze).toHaveBeenCalled();
    expect(workflow.generate).toHaveBeenCalled();
    expect(elements.progressContainer.classList.contains('hidden')).toBe(true);
    expect(elements.resultsContainer.classList.contains('hidden')).toBe(false);
  });

  it('shows error when workflow throws', async () => {
    createHandler(
      {
        analyze: vi.fn().mockRejectedValue(new Error('analysis failed')),
      },
      [{ id: 'source-1' }]
    );

    elements.submitBtn.click();
    await flushPromises();

    expect(elements.errorContainer.classList.contains('hidden')).toBe(false);
    expect(elements.errorMessage.textContent).toContain('analysis failed');
  });
});

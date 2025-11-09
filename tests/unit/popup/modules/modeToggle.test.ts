import { beforeEach, describe, expect, it, vi, afterEach } from 'vitest';
import { ModeToggle, SimpleModeAdapter } from '@/popup/modules/modeToggle';

describe('ModeToggle', () => {
  let simpleToggle: HTMLButtonElement;
  let advancedToggle: HTMLButtonElement;
  let simpleContainer: HTMLElement;
  let advancedContainer: HTMLElement;
  let modeIndicator: HTMLElement;
  let advancedInput: HTMLTextAreaElement;
  let simpleLanguage: HTMLSelectElement;
  let advancedLanguage: HTMLSelectElement;
  let simpleAdapter: SimpleModeAdapter;
  let options: ConstructorParameters<typeof ModeToggle>[0];

  beforeEach(() => {
    document.body.innerHTML = `
      <div>
        <button id="simpleModeToggle" class="mode-toggle mode-toggle--active" aria-pressed="true">Simple</button>
        <button id="advancedModeToggle" class="mode-toggle" aria-pressed="false">Advanced</button>
      </div>
      <div id="formFillerContent">
        <section id="formFillerSimpleMode"></section>
        <section id="formFillerAdvancedMode" class="hidden"></section>
      </div>
      <textarea id="fillContentInput"></textarea>
      <select id="simpleModeLanguageSelect">
        <option value="zh" selected>中文</option>
        <option value="en">English</option>
      </select>
      <select id="languageSelect">
        <option value="zh" selected>中文</option>
        <option value="en">English</option>
      </select>
      <div id="selectedMode"></div>
    `;

    simpleToggle = document.getElementById('simpleModeToggle') as HTMLButtonElement;
    advancedToggle = document.getElementById('advancedModeToggle') as HTMLButtonElement;
    simpleContainer = document.getElementById('formFillerSimpleMode') as HTMLElement;
    advancedContainer = document.getElementById('formFillerAdvancedMode') as HTMLElement;
    modeIndicator = document.getElementById('selectedMode') as HTMLElement;
    advancedInput = document.getElementById('fillContentInput') as HTMLTextAreaElement;
    simpleLanguage = document.getElementById('simpleModeLanguageSelect') as HTMLSelectElement;
    advancedLanguage = document.getElementById('languageSelect') as HTMLSelectElement;

    simpleAdapter = {
      getContent: vi.fn(() => 'simple content'),
      setContent: vi.fn(),
      getLanguage: vi.fn(() => simpleLanguage.value),
      setLanguage: vi.fn(language => {
        simpleLanguage.value = language;
      }),
      hideAllStates: vi.fn(),
    };

    options = {
      simpleToggle,
      advancedToggle,
      simpleContainer,
      advancedContainer,
      modeIndicator,
      simpleMode: simpleAdapter,
      advancedMode: {
        updateSectionVisibility: vi.fn(),
        reset: vi.fn(),
      },
      advancedInput,
      simpleLanguageSelect: simpleLanguage,
      advancedLanguageSelect: advancedLanguage,
    };
  });

  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('starts in simple mode and keeps advanced hidden', () => {
    const toggle = new ModeToggle(options);
    toggle.init();

    expect(toggle.getCurrentMode()).toBe('simple');
    expect(simpleToggle.classList.contains('mode-toggle--active')).toBe(true);
    expect(advancedToggle.classList.contains('mode-toggle--active')).toBe(false);
    expect(simpleContainer.classList.contains('hidden')).toBe(false);
    expect(advancedContainer.classList.contains('hidden')).toBe(true);
    expect(modeIndicator.textContent).toContain('Simple Mode');
  });

  it('switches to advanced mode, updates aria state and transfers content', () => {
    const toggle = new ModeToggle(options);
    toggle.init();

    const customEventListener = vi.fn();
    document.addEventListener('popup:form-mode-changed', customEventListener as EventListener);

    advancedInput.value = 'Advanced prepared content';
    advancedLanguage.value = 'en';
    simpleAdapter.getContent = vi.fn(() => 'Simple snapshot');
    simpleAdapter.getLanguage = vi.fn(() => 'zh');

    toggle.switchToAdvanced(true);

    expect(toggle.getCurrentMode()).toBe('advanced');
    expect(simpleToggle.getAttribute('aria-pressed')).toBe('false');
    expect(advancedToggle.getAttribute('aria-pressed')).toBe('true');
    expect(simpleContainer.classList.contains('hidden')).toBe(true);
    expect(advancedContainer.classList.contains('hidden')).toBe(false);
    expect(modeIndicator.textContent).toContain('Advanced Mode');
    expect(options.advancedMode?.updateSectionVisibility).toHaveBeenCalled();
    expect(customEventListener).toHaveBeenCalledTimes(1);
    const emittedEvent = customEventListener.mock.calls[0]?.[0] as CustomEvent | undefined;
    expect(emittedEvent?.detail).toEqual({ mode: 'advanced' });

    document.removeEventListener('popup:form-mode-changed', customEventListener as EventListener);

    // Toggling back to simple should transfer the content back
    advancedInput.value = 'Updated advanced content';
    advancedLanguage.value = 'en';
    toggle.switchToSimple(true);

    expect(toggle.getCurrentMode()).toBe('simple');
    expect(simpleAdapter.setContent).toHaveBeenCalledWith('Updated advanced content');
    expect(simpleAdapter.setLanguage).toHaveBeenCalledWith('en');
  });

  it('binds click handlers for toggles', () => {
    const toggle = new ModeToggle(options);
    toggle.init();

    advancedToggle.click();
    expect(toggle.getCurrentMode()).toBe('advanced');

    simpleAdapter.setContent = vi.fn();
    simpleAdapter.setLanguage = vi.fn();
    simpleToggle.click();
    expect(toggle.getCurrentMode()).toBe('simple');
  });
});

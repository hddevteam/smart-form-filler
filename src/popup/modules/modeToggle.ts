export type FormMode = 'simple' | 'advanced';

export interface SimpleModeAdapter {
  getContent(): string;
  setContent(content: string): void;
  getLanguage(): string;
  setLanguage(language: string): void;
  showProgress?(): void;
  showError?(message: string): void;
  hideAllStates?(): void;
}

export interface AdvancedModeAdapter {
  updateSectionVisibility?(): void;
  reset?(): void;
}

export interface ModeToggleOptions {
  simpleToggle: HTMLButtonElement | null;
  advancedToggle: HTMLButtonElement | null;
  simpleContainer: HTMLElement | null;
  advancedContainer: HTMLElement | null;
  modeIndicator?: HTMLElement | null;
  simpleMode?: SimpleModeAdapter;
  advancedMode?: AdvancedModeAdapter;
  advancedInput?: HTMLTextAreaElement | HTMLInputElement | null;
  simpleLanguageSelect?: HTMLSelectElement | null;
  advancedLanguageSelect?: HTMLSelectElement | null;
  onModeChanged?: (mode: FormMode) => void;
}

/**
 * Controls the Simple/Advanced form filler modes. Handles DOM toggles, aria state,
 * optional content transfer, and broadcasts change notifications for other modules.
 */
export class ModeToggle {
  private readonly options: ModeToggleOptions;
  private currentMode: FormMode;
  private initialised = false;

  constructor(options: ModeToggleOptions) {
    this.options = options;
    this.currentMode = this.detectInitialMode();
  }

  init(): void {
    if (this.initialised) return;
    this.bindEvents();
    // Apply initial mode without triggering redundant notifications
    this.applyMode(this.currentMode, { preserveContent: false, notify: false });
    this.initialised = true;
  }

  getCurrentMode(): FormMode {
    return this.currentMode;
  }

  switchToSimple(preserveContent = false): void {
    this.applyMode('simple', { preserveContent, notify: true });
  }

  switchToAdvanced(preserveContent = false): void {
    this.applyMode('advanced', { preserveContent, notify: true });
  }

  toggle(preserveContent = true): void {
    if (this.currentMode === 'simple') this.switchToAdvanced(preserveContent);
    else this.switchToSimple(preserveContent);
  }

  private bindEvents(): void {
    this.options.simpleToggle?.addEventListener('click', event => {
      event.preventDefault();
      this.switchToSimple(true);
    });
    this.options.advancedToggle?.addEventListener('click', event => {
      event.preventDefault();
      this.switchToAdvanced(true);
    });
  }

  private applyMode(
    mode: FormMode,
    { preserveContent, notify }: { preserveContent: boolean; notify: boolean }
  ): void {
    if (this.currentMode === mode && notify) return;
    const previousMode = this.currentMode;
    this.currentMode = mode;

    this.updateToggleButtons(mode);
    this.updateContainers(mode);
    this.updateModeIndicator(mode);

    if (preserveContent) {
      if (mode === 'advanced') this.transferContentToAdvanced();
      else this.transferContentToSimple();
    }

    if (mode === 'advanced') {
      this.options.advancedMode?.updateSectionVisibility?.();
    }

    if (notify) {
      this.dispatchModeChange(mode, previousMode !== mode);
    }
  }

  private updateToggleButtons(mode: FormMode): void {
    const { simpleToggle, advancedToggle } = this.options;
    if (simpleToggle) {
      const isActive = mode === 'simple';
      simpleToggle.classList.toggle('mode-toggle--active', isActive);
      simpleToggle.setAttribute('aria-pressed', isActive ? 'true' : 'false');
    }
    if (advancedToggle) {
      const isActive = mode === 'advanced';
      advancedToggle.classList.toggle('mode-toggle--active', isActive);
      advancedToggle.setAttribute('aria-pressed', isActive ? 'true' : 'false');
    }
  }

  private updateContainers(mode: FormMode): void {
    this.options.simpleContainer?.classList.toggle('hidden', mode !== 'simple');
    this.options.advancedContainer?.classList.toggle('hidden', mode !== 'advanced');
  }

  private updateModeIndicator(mode: FormMode): void {
    if (!this.options.modeIndicator) return;
    const suffix = mode === 'simple' ? 'Simple Mode' : 'Advanced Mode';
    this.options.modeIndicator.textContent = `Form Filler - ${suffix}`;
  }

  private transferContentToAdvanced(): void {
    const simple = this.options.simpleMode;
    const advancedInput = this.options.advancedInput;
    const advancedLanguage = this.options.advancedLanguageSelect;
    if (simple && advancedInput) {
      const content = simple.getContent();
      advancedInput.value = content;
      // Trigger input event so listeners can react (e.g., validation)
      advancedInput.dispatchEvent(new Event('input', { bubbles: true }));
    }
    if (simple && advancedLanguage) {
      const language = simple.getLanguage();
      advancedLanguage.value = language;
      advancedLanguage.dispatchEvent(new Event('change', { bubbles: true }));
    }
  }

  private transferContentToSimple(): void {
    const simple = this.options.simpleMode;
    const advancedInput = this.options.advancedInput;
    const advancedLanguage = this.options.advancedLanguageSelect;
    if (simple && advancedInput) {
      simple.setContent(advancedInput.value);
    }
    if (simple && advancedLanguage) {
      simple.setLanguage(advancedLanguage.value);
    }
  }

  private dispatchModeChange(mode: FormMode, changed: boolean): void {
    if (!changed) return;
    this.options.onModeChanged?.(mode);
    const event = new CustomEvent('popup:form-mode-changed', { detail: { mode } });
    document.dispatchEvent(event);
  }

  private detectInitialMode(): FormMode {
    const { simpleToggle, advancedToggle } = this.options;
    if (advancedToggle?.classList.contains('mode-toggle--active')) return 'advanced';
    if (simpleToggle?.classList.contains('mode-toggle--active')) return 'simple';
    // Fallback to simple when no explicit state exists
    return 'simple';
  }
}

export default ModeToggle;

export type MainTabName = 'extraction' | 'chat' | 'formfiller';

export interface MainTabControllerOptions {
  tabButtons: HTMLButtonElement[];
  tabContents: Record<MainTabName, HTMLElement | null | undefined>;
  statusLabel?: HTMLElement | null;
  onTabChanged?: (tab: MainTabName) => void;
  labelMap?: Partial<Record<MainTabName, string>>;
}

/**
 * Handles switching between main popup tabs (Extraction, Chat, Form Filler)
 * while keeping button states, content panels, and footer indicator in sync.
 */
export class MainTabController {
  private readonly tabButtons: HTMLButtonElement[];
  private readonly tabContents: Record<MainTabName, HTMLElement | null | undefined>;
  private readonly statusLabel: HTMLElement | null;
  private readonly onTabChanged: ((tab: MainTabName) => void) | undefined;
  private readonly labelMap: Record<MainTabName, string>;
  private activeTab: MainTabName;
  private isInitialised = false;

  constructor(options: MainTabControllerOptions) {
    this.tabButtons = options.tabButtons;
    this.tabContents = options.tabContents;
    this.statusLabel = options.statusLabel ?? null;
    this.onTabChanged = options.onTabChanged;
    this.labelMap = {
      extraction: 'Data Extraction',
      chat: 'Chat with Data',
      formfiller: 'Form Filler',
      ...options.labelMap,
    };
    this.activeTab = this.detectInitialTab();
  }

  init(): void {
    if (this.isInitialised) return;
    this.bindButtonEvents();
    this.applyActiveState(this.activeTab);
    this.isInitialised = true;
  }

  getActiveTab(): MainTabName {
    return this.activeTab;
  }

  switchTab(next: MainTabName): void {
    if (this.activeTab === next) return;
    this.activeTab = next;
    this.applyActiveState(next);
    this.dispatchChange(next);
  }

  private bindButtonEvents(): void {
    this.tabButtons.forEach(button => {
      button.addEventListener('click', event => {
        event.preventDefault();
        const tabName = this.normaliseTabName(button.dataset.tab);
        if (!tabName) return;
        this.switchTab(tabName);
      });
    });
  }

  private applyActiveState(active: MainTabName): void {
    // Buttons
    this.tabButtons.forEach(button => {
      const tabName = this.normaliseTabName(button.dataset.tab);
      const isActive = tabName === active;
      button.classList.toggle('main-tab--active', isActive);
      if (isActive && !button.id) {
        // Provide stable IDs for downstream code (e.g. history triggers)
        button.id = `${active}TabTrigger`;
      }
    });

    // Content panels
    (Object.keys(this.tabContents) as MainTabName[]).forEach(name => {
      const content = this.tabContents[name];
      if (!content) return;
      content.classList.toggle('main-tab-content--active', name === active);
    });

    // Footer label
    if (this.statusLabel) {
      this.statusLabel.textContent = this.labelMap[active] ?? '';
    }
  }

  private dispatchChange(tab: MainTabName): void {
    this.onTabChanged?.(tab);
    const event = new CustomEvent('popup:main-tab-changed', { detail: { tab } });
    document.dispatchEvent(event);
  }

  private detectInitialTab(): MainTabName {
    for (const button of this.tabButtons) {
      if (button.classList.contains('main-tab--active')) {
        const name = this.normaliseTabName(button.dataset.tab);
        if (name) return name;
      }
    }
    // Fallback to first known tab order
    const preferredOrder: MainTabName[] = ['extraction', 'chat', 'formfiller'];
    for (const key of preferredOrder) {
      if (this.tabButtons.some(btn => this.normaliseTabName(btn.dataset.tab) === key)) {
        return key;
      }
    }
    return 'extraction';
  }

  private normaliseTabName(value: string | undefined): MainTabName | null {
    if (!value) return null;
    const lower = value.toLowerCase();
    if (lower === 'extraction') return 'extraction';
    if (lower === 'chat') return 'chat';
    if (lower === 'formfiller' || lower === 'form-filler' || lower === 'form') return 'formfiller';
    return null;
  }
}

export default MainTabController;

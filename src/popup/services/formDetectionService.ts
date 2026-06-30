/**
 * FormDetectionService — detects forms via content script messaging.
 *
 * TypeScript port of formDetectionService.js (main branch).
 * Key difference: routes all messages through chrome.runtime.sendMessage
 * (Background SW forwards to active tab). Never injects scripts via window globals.
 */
import { Logger } from '@/utils/logger';
import type { DetectedForm } from '@/content/formDetector';

export interface DetectionServiceResult {
  success: boolean;
  forms: DetectedForm[];
  totalForms: number;
  totalFields: number;
}

const logger = Logger.forScope('FormDetectionService');

export class FormDetectionService {
  /** Detect forms on the active page via Background SW → content script. */
  async detectForms(): Promise<DetectionServiceResult> {
    // Validate active tab exists before attempting (throws if none)
    await this.getActiveTabId();

    return new Promise<DetectionServiceResult>((resolve, reject) => {
      try {
        chrome.runtime.sendMessage({ action: 'detectForms' }, (response: unknown) => {
          const lastError = chrome.runtime.lastError;
          if (lastError) {
            reject(new Error(lastError.message));
            return;
          }
          const r =
            (response as {
              success?: boolean;
              error?: string;
              forms?: DetectedForm[];
              totalForms?: number;
              totalFields?: number;
            }) ?? {};
          if (!r.success) {
            reject(new Error(r.error ?? 'Form detection failed'));
            return;
          }
          resolve({
            success: true,
            forms: r.forms ?? [],
            totalForms: r.totalForms ?? 0,
            totalFields: r.totalFields ?? 0,
          });
        });
      } catch (err) {
        reject(err instanceof Error ? err : new Error(String(err)));
      }
    });
  }

  /** Extract raw page HTML (including iframe content) via Background SW. */
  async extractPageHtml(): Promise<string> {
    return new Promise<string>((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error('HTML extraction timeout after 5s')), 5000);
      try {
        chrome.runtime.sendMessage({ action: 'extractContentWithIframes' }, (response: unknown) => {
          clearTimeout(timeout);
          const lastError = chrome.runtime.lastError;
          if (lastError) {
            reject(new Error(lastError.message));
            return;
          }
          const r =
            (response as {
              success?: boolean;
              data?: {
                mainPage?: { html?: string };
                iframes?: Array<{ content?: { html?: string } }>;
              };
            }) ?? {};
          if (!r.success) {
            reject(new Error('HTML extraction failed'));
            return;
          }
          let html = r.data?.mainPage?.html ?? '';
          for (const iframe of r.data?.iframes ?? []) {
            if (iframe.content?.html) html += `\n<!-- IFRAME -->\n${iframe.content.html}`;
          }
          resolve(html);
        });
      } catch (err) {
        clearTimeout(timeout);
        reject(err instanceof Error ? err : new Error(String(err)));
      }
    });
  }

  /**
   * Generate a concise human-readable summary of all forms for AI prompt context.
   * Mirrors _generateFormSummary() from formAnalysisService.js (main).
   */
  generateFormSummary(forms: DetectedForm[]): string {
    if (forms.length === 0) return 'No forms detected on this page.';

    const lines: string[] = [`${forms.length} form(s) detected:`];
    for (const form of forms) {
      const id = form.id ? ` (id: ${form.id})` : '';
      const fieldCount = form.fields.length;
      const fieldSummary = form.fields
        .slice(0, 5)
        .map(f => `${f.label ?? f.name} [${f.type}${f.required ? ', required' : ''}]`)
        .join(', ');
      const more = fieldCount > 5 ? ` + ${fieldCount - 5} more` : '';
      lines.push(`  Form ${form.index + 1}${id}: ${fieldCount} field(s) — ${fieldSummary}${more}`);
    }
    return lines.join('\n');
  }

  /**
   * Filter out trivial forms (search bars, single-field junk) to focus AI on relevant forms.
   */
  filterRelevantForms(forms: DetectedForm[]): DetectedForm[] {
    return forms.filter(form => {
      const usefulFields = form.fields.filter(f => f.type !== 'unknown' && f.type !== 'checkbox');
      return usefulFields.length >= 1 && form.fields.length >= 1;
    });
  }

  /** Get the active tab id (used for logging; routing goes via Background SW). */
  private async getActiveTabId(): Promise<number> {
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    const tab = tabs[0];
    if (!tab?.id) throw new Error('No active tab found');
    logger.debug('Active tab:', tab.id);
    return tab.id;
  }
}

export default FormDetectionService;

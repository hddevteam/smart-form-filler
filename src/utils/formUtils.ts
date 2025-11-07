import type { Form, FormField, FormSummary } from '@/types/forms';

/**
 * Escape HTML to prevent XSS
 */
export function escapeHtml(text: string | undefined | null): string {
  if (!text) return '';
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Get form source information (main page or iframe)
 */
export function getFormSourceInfo(form: Form): string {
  if (form.source === 'iframe') {
    const depthStr = form.depth ? ` (depth: ${form.depth})` : '';
    return `<span class="source-badge source-badge--iframe" title="Form located in iframe: ${form.iframePath}">iframe${depthStr}</span>`;
  }
  return '<span class="source-badge">main page</span>';
}

/**
 * Generate form summary for API call
 */
export function generateFormSummary(forms: Form[]): FormSummary {
  const totalFields = forms.reduce((total, f) => total + f.fields.length, 0);
  const categories: Record<string, number> = {};

  for (const form of forms) {
    for (const field of form.fields) {
      if (field.category) {
        categories[field.category] = (categories[field.category] || 0) + 1;
      }
    }
  }

  return {
    totalForms: forms.length,
    totalFields,
    categories,
    pageUrl: typeof window !== 'undefined' ? window.location.href : '',
    pageTitle: typeof document !== 'undefined' ? document.title : '',
  };
}

/**
 * Extract all fillable form fields for API call
 */
export interface ExtractedField {
  id: string;
  originalId?: string | undefined;
  name?: string | undefined;
  label?: string | undefined;
  type: FormField['type'];
  placeholder?: string | undefined;
  category?: string | undefined;
  required?: boolean | undefined;
  selector?: string | undefined;
  source?: FormField['source'] | undefined;
  iframePath?: string | undefined;
  xpath?: string | undefined;
  formId: string;
}

export function extractFormFields(forms: Form[]): ExtractedField[] {
  const all: ExtractedField[] = [];

  for (const form of forms) {
    for (const field of form.fields) {
      if (field.visible && field.editable && field.type !== 'hidden') {
        const item: ExtractedField = {
          id: field.id,
          type: field.type,
          formId: form.id,
        };

        if (field.originalId !== undefined) item.originalId = field.originalId;
        if (field.name !== undefined) item.name = field.name;
        if (field.label !== undefined) item.label = field.label;
        if (field.placeholder !== undefined) item.placeholder = field.placeholder;
        if (field.category !== undefined) item.category = field.category;
        if (field.required !== undefined) item.required = field.required;
        if (field.selector !== undefined) item.selector = field.selector;
        if (field.source !== undefined) item.source = field.source;
        if (field.iframePath !== undefined) item.iframePath = field.iframePath;
        if (field.xpath !== undefined) item.xpath = field.xpath;

        all.push(item);
      }
    }
  }

  return all;
}

/**
 * Clean HTML content for analysis (DOM-dependent, safe in browser/jsdom)
 */
export function cleanHtml(html: string | undefined | null): string {
  if (!html) return '';

  try {
    const tempDiv = typeof document !== 'undefined' ? document.createElement('div') : null;
    if (!tempDiv) return html;

    tempDiv.innerHTML = html;

    const unwantedSelectors = [
      'script',
      'style',
      'noscript',
      'meta',
      'link[rel="stylesheet"]',
      'head',
      '.advertisement',
      '.ad',
      '.ads',
      '.sponsored',
      'nav',
      'footer',
      'header .navbar',
      '.cookie-notice',
      '.popup',
      '.modal',
    ];

    for (const selector of unwantedSelectors) {
      const elements = tempDiv.querySelectorAll(selector);
      elements.forEach(el => el.remove());
    }

    const allElements = tempDiv.querySelectorAll('*');
    allElements.forEach(element => {
      const toRemove: string[] = [];
      for (let i = 0; i < element.attributes.length; i++) {
        const attr = element.attributes.item(i);
        if (!attr) continue;
        if (
          attr.name.startsWith('on') ||
          attr.name === 'style' ||
          attr.name.startsWith('data-') ||
          (attr.name === 'class' && attr.value.includes('ad'))
        ) {
          toRemove.push(attr.name);
        }
      }
      toRemove.forEach(name => element.removeAttribute(name));
    });

    const contentSelectors = [
      'main',
      '[role="main"]',
      '.main-content',
      '#main',
      '.content',
      'article',
      '.post-content',
      '.entry-content',
    ];

    for (const selector of contentSelectors) {
      const element = tempDiv.querySelector(selector);
      if (element && element.textContent && element.textContent.trim().length > 100) {
        return element.innerHTML;
      }
    }

    const body = tempDiv.querySelector('body');
    if (body) return body.innerHTML;

    return tempDiv.innerHTML;
  } catch (error) {
    // eslint-disable-next-line no-console
    console.warn('Failed to clean HTML, returning original:', error);
    return html ?? '';
  }
}

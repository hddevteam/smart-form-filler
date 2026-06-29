/**
 * FormDetector — detects forms and extracts rich field metadata.
 *
 * Enhanced in G3 to match main-branch behavior:
 * - Label extraction (for/id, parent label, aria-label, aria-labelledby, placeholder)
 * - Select option extraction
 * - Field id, required, and current value
 * - getDetectionResult() for structured content-script response
 */

export interface DetectedField {
  name: string;
  id?: string;
  type:
    | 'text'
    | 'email'
    | 'password'
    | 'checkbox'
    | 'radio'
    | 'select'
    | 'textarea'
    | 'number'
    | 'date'
    | 'tel'
    | 'url'
    | 'unknown';
  label?: string;
  value?: string;
  required?: boolean;
  options?: Array<{ value: string; text: string }>;
}

export interface DetectedForm {
  index: number;
  id?: string;
  action?: string;
  fields: DetectedField[];
}

export interface DetectionResult {
  forms: DetectedForm[];
  totalForms: number;
  totalFields: number;
}

export class FormDetector {
  detectForms(root?: Document | HTMLElement): HTMLFormElement[] {
    const scope = root ?? document;
    return Array.from(scope.querySelectorAll<HTMLFormElement>('form'));
  }

  /** Returns structured detection result for use by content script message handler. */
  getDetectionResult(root?: Document | HTMLElement): DetectionResult {
    const forms = this.detectForms(root);
    const result: DetectedForm[] = forms.map((form, index) => {
      const entry: DetectedForm = { index, fields: this.extractFields(form) };
      if (form.id) entry.id = form.id;
      if (form.action) entry.action = form.action;
      return entry;
    });
    return {
      forms: result,
      totalForms: result.length,
      totalFields: result.reduce((sum, f) => sum + f.fields.length, 0),
    };
  }

  extractFields(form: HTMLFormElement): DetectedField[] {
    const fields: DetectedField[] = [];

    for (const input of Array.from(form.querySelectorAll<HTMLInputElement>('input[name]'))) {
      const type = (input.type || 'text').toLowerCase();
      if (type === 'hidden' || type === 'submit' || type === 'button' || type === 'reset') continue;
      const field: DetectedField = {
        name: input.name,
        type: this.mapInputType(type),
        required: input.required,
      };
      if (input.id) field.id = input.id;
      const label = this.extractLabel(input);
      if (label) field.label = label;
      if (input.value) field.value = input.value;
      fields.push(field);
    }

    for (const sel of Array.from(form.querySelectorAll<HTMLSelectElement>('select[name]'))) {
      const field: DetectedField = {
        name: sel.name,
        type: 'select',
        required: sel.required,
        options: Array.from(sel.options).map(o => ({ value: o.value, text: o.text.trim() })),
      };
      if (sel.id) field.id = sel.id;
      const label = this.extractLabel(sel);
      if (label) field.label = label;
      fields.push(field);
    }

    for (const ta of Array.from(form.querySelectorAll<HTMLTextAreaElement>('textarea[name]'))) {
      const field: DetectedField = { name: ta.name, type: 'textarea', required: ta.required };
      if (ta.id) field.id = ta.id;
      const label = this.extractLabel(ta);
      if (label) field.label = label;
      if (ta.value) field.value = ta.value;
      fields.push(field);
    }

    return fields;
  }

  /** Resolve a human-readable label for a form element using multiple strategies. */
  private extractLabel(
    el: HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
  ): string | undefined {
    // 1. aria-labelledby → referenced element text
    const labelledBy = el.getAttribute('aria-labelledby');
    if (labelledBy) {
      const text = document.getElementById(labelledBy)?.textContent?.trim();
      if (text) return text;
    }

    // 2. aria-label attribute
    const ariaLabel = el.getAttribute('aria-label')?.trim();
    if (ariaLabel) return ariaLabel;

    // 3. <label for="id"> association
    if (el.id) {
      const text = document
        .querySelector<HTMLLabelElement>(`label[for="${el.id}"]`)
        ?.textContent?.trim();
      if (text) return text;
    }

    // 4. Ancestor <label> element — remove the input itself to get label text only
    const parentLabel = el.closest('label');
    if (parentLabel) {
      const clone = parentLabel.cloneNode(true) as HTMLLabelElement;
      clone.querySelectorAll('input,select,textarea').forEach(c => c.remove());
      const text = clone.textContent?.trim();
      if (text) return text;
    }

    // 5. placeholder as last resort
    const placeholder = (el as HTMLInputElement).placeholder?.trim();
    if (placeholder) return placeholder;

    return undefined;
  }

  private mapInputType(type: string): DetectedField['type'] {
    switch (type) {
      case 'text':
      case 'email':
      case 'password':
      case 'number':
      case 'date':
      case 'tel':
      case 'url':
        return type as DetectedField['type'];
      case 'checkbox':
        return 'checkbox';
      case 'radio':
        return 'radio';
      default:
        return 'unknown';
    }
  }
}

export default FormDetector;

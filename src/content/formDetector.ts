export interface DetectedField {
  name: string;
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
}

export class FormDetector {
  detectForms(root?: Document | HTMLElement): HTMLFormElement[] {
    const scope = root ?? document;
    const nodeList = scope.querySelectorAll<HTMLFormElement>('form');
    return Array.from(nodeList);
  }

  extractFields(form: HTMLFormElement): DetectedField[] {
    const fields: DetectedField[] = [];
    const inputs = Array.from(form.querySelectorAll<HTMLInputElement>('input[name]'));
    const selects = Array.from(form.querySelectorAll<HTMLSelectElement>('select[name]'));
    const textareas = Array.from(form.querySelectorAll<HTMLTextAreaElement>('textarea[name]'));

    for (const input of inputs) {
      const type = (input.type || 'text').toLowerCase();
      if (type === 'hidden') continue; // skip hidden
      const mappedType = this.mapInputType(type);
      fields.push({ name: input.name, type: mappedType });
    }

    for (const sel of selects) {
      fields.push({ name: sel.name, type: 'select' });
    }

    for (const ta of textareas) {
      fields.push({ name: ta.name, type: 'textarea' });
    }

    return fields;
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

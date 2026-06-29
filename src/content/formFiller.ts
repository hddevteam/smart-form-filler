export type FillData = Record<string, string | number | boolean | null | undefined>;

export interface FieldMapping {
  field?: {
    id?: string;
    name?: string;
    selector?: string;
    type?: string;
  };
  fieldId?: string;
  fieldName?: string;
  fieldType?: string;
  selector?: string;
  suggestedValue?: string | number | boolean | null;
  value?: string | number | boolean | null;
}

export interface FillResult {
  success: boolean;
  filled: Array<{ fieldId: string; value: unknown }>;
  failed: Array<{ fieldId: string; error: string }>;
  totalProcessed: number;
  successCount: number;
  errorCount: number;
}

const escapeCss = (value: string): string => {
  if (typeof CSS !== 'undefined' && typeof CSS.escape === 'function') {
    return CSS.escape(value);
  }
  return value.replace(/["'\\]/g, '\\$&');
};

export class FormFiller {
  fillForm(form: HTMLFormElement, data: FillData): void {
    for (const [name, value] of Object.entries(data)) {
      const el = form.elements.namedItem(name);
      if (!el) continue;
      const tag = (el as HTMLElement).tagName.toLowerCase();
      if (tag === 'input') {
        const input = el as HTMLInputElement;
        const type = (input.type || 'text').toLowerCase();
        if (type === 'checkbox') {
          input.checked = Boolean(value);
        } else if (type === 'radio') {
          // Set the radio matching value
          const radios = form.querySelectorAll<HTMLInputElement>(
            `input[name="${name}"][type="radio"]`
          );
          radios.forEach(r => {
            r.checked = String(r.value) === String(value);
          });
        } else {
          input.value = value == null ? '' : String(value);
        }
      } else if (tag === 'select') {
        const sel = el as HTMLSelectElement;
        sel.value = value == null ? '' : String(value);
      } else if (tag === 'textarea') {
        const ta = el as HTMLTextAreaElement;
        ta.value = value == null ? '' : String(value);
      }
    }
  }

  fillFormFields(mappings: unknown): FillResult {
    if (!Array.isArray(mappings)) {
      return {
        success: false,
        filled: [],
        failed: [{ fieldId: 'unknown', error: 'Invalid mapping data' }],
        totalProcessed: 0,
        successCount: 0,
        errorCount: 1,
      };
    }

    const filled: Array<{ fieldId: string; value: unknown }> = [];
    const failed: Array<{ fieldId: string; error: string }> = [];

    for (const mapping of mappings as FieldMapping[]) {
      const fieldId = this.getFieldId(mapping);
      const value = this.getMappingValue(mapping);
      if (value === undefined) {
        failed.push({ fieldId, error: 'No value provided' });
        continue;
      }

      const element = this.resolveElement(mapping);
      if (!element) {
        failed.push({ fieldId, error: 'Field element not found' });
        continue;
      }

      try {
        this.applyValue(element, mapping.fieldType ?? mapping.field?.type, value);
        filled.push({ fieldId, value });
      } catch (error) {
        failed.push({ fieldId, error: (error as Error).message });
      }
    }

    return {
      success: failed.length === 0,
      filled,
      failed,
      totalProcessed: mappings.length,
      successCount: filled.length,
      errorCount: failed.length,
    };
  }

  private getFieldId(mapping: FieldMapping): string {
    return (
      mapping.fieldId || mapping.field?.id || mapping.fieldName || mapping.field?.name || 'unknown'
    );
  }

  private getMappingValue(mapping: FieldMapping): string | number | boolean | null | undefined {
    if ('suggestedValue' in mapping && mapping.suggestedValue !== undefined) {
      return mapping.suggestedValue;
    }
    if ('value' in mapping) {
      return mapping.value ?? undefined;
    }
    if (mapping.field && 'value' in mapping.field) {
      return (mapping.field as { value?: unknown }).value as
        | string
        | number
        | boolean
        | null
        | undefined;
    }
    return undefined;
  }

  private resolveElement(mapping: FieldMapping): HTMLElement | null {
    const selectors: Array<string | null | undefined> = [mapping.selector, mapping.field?.selector];

    for (const selector of selectors) {
      if (selector) {
        try {
          const found = document.querySelector(selector);
          if (found) return found as HTMLElement;
        } catch {
          // ignore selector errors
        }
      }
    }

    const identifiers = [
      mapping.fieldId,
      mapping.field?.id,
      mapping.fieldName,
      mapping.field?.name,
    ].filter((v): v is string => !!v);

    for (const id of identifiers) {
      const byId = document.getElementById(id);
      if (byId) return byId;
      const byName = document.querySelector(`[name="${escapeCss(id)}"]`);
      if (byName) return byName as HTMLElement;
    }

    return null;
  }

  private applyValue(
    element: HTMLElement,
    explicitType: string | undefined,
    value: string | number | boolean | null
  ): void {
    const tag = element.tagName.toLowerCase();
    const inferredType = explicitType?.toLowerCase();

    if (tag === 'input') {
      const input = element as HTMLInputElement;
      const type = (input.type || inferredType || 'text').toLowerCase();
      if (type === 'checkbox') {
        input.checked = Boolean(value);
        return;
      }
      if (type === 'radio') {
        const groupName = input.name;
        if (groupName) {
          const radios = document.querySelectorAll<HTMLInputElement>(
            `input[name="${escapeCss(groupName)}"][type="radio"]`
          );
          radios.forEach(radio => {
            radio.checked = String(radio.value) === String(value);
          });
        }
        return;
      }
      input.value = value == null ? '' : String(value);
      return;
    }

    if (tag === 'select') {
      const selectEl = element as HTMLSelectElement;
      selectEl.value = value == null ? '' : String(value);
      return;
    }

    if (tag === 'textarea') {
      const ta = element as HTMLTextAreaElement;
      ta.value = value == null ? '' : String(value);
      return;
    }

    if (element instanceof HTMLElement && 'innerText' in element) {
      element.innerText = value == null ? '' : String(value);
    }
  }
}

export default FormFiller;

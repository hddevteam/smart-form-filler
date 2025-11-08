export type FillData = Record<string, string | number | boolean | null | undefined>;

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
}

export default FormFiller;

import { describe, it, expect, beforeEach } from 'vitest';

describe('FormFiller (TS)', () => {
  let FormFiller: any;

  beforeEach(async () => {
    document.body.innerHTML = '';
    FormFiller = (await import('@/content/formFiller')).FormFiller;
  });

  it('fillForm should set input/select/textarea values', async () => {
    document.body.innerHTML = `
      <form id="form">
        <input name="username" type="text" />
        <input name="agree" type="checkbox" />
        <select name="country">
          <option value="us">United States</option>
          <option value="uk">United Kingdom</option>
        </select>
        <textarea name="bio"></textarea>
      </form>
    `;
    const form = document.getElementById('form') as HTMLFormElement;
    const filler = new FormFiller();
    await filler.fillForm(form, { username: 'John', agree: true, country: 'uk', bio: 'Hello' });
    expect((form.elements.namedItem('username') as HTMLInputElement).value).toBe('John');
    expect((form.elements.namedItem('agree') as HTMLInputElement).checked).toBe(true);
    expect((form.elements.namedItem('country') as HTMLSelectElement).value).toBe('uk');
    expect((form.elements.namedItem('bio') as HTMLTextAreaElement).value).toBe('Hello');
  });
});

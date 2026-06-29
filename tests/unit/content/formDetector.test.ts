import { describe, it, expect, beforeEach } from 'vitest';

describe('FormDetector (TS)', () => {
  let FormDetector: any;

  beforeEach(async () => {
    document.body.innerHTML = '';
    FormDetector = (await import('@/content/formDetector')).FormDetector;
  });

  it('detectForms should find forms in DOM', () => {
    document.body.innerHTML = `
      <div>
        <form id="f1"><input name="email" type="email" /></form>
        <form id="f2"><input name="name" type="text" /></form>
      </div>
    `;
    const detector = new FormDetector();
    const forms = detector.detectForms();
    expect(forms.length).toBe(2);
    expect(forms[0].id).toBe('f1');
    expect(forms[1].id).toBe('f2');
  });

  it('extractFields should list inputs/selects/textarea with names', () => {
    document.body.innerHTML = `
      <form id="form">
        <input name="username" type="text" />
        <input name="agree" type="checkbox" />
        <select name="country"><option value="us">US</option></select>
        <textarea name="bio"></textarea>
        <input type="hidden" value="secret" />
      </form>
    `;
    const form = document.getElementById('form') as HTMLFormElement;
    const detector = new FormDetector();
    const fields = detector.extractFields(form);
    const names = fields.map((f: { name: string }) => f.name).sort();
    expect(names).toEqual(['agree', 'bio', 'country', 'username']);
    const types = Object.fromEntries(
      fields.map((f: { name: string; type: string }) => [f.name, f.type])
    );
    expect(types.username).toBe('text');
    expect(types.agree).toBe('checkbox');
    expect(types.country).toBe('select');
    expect(types.bio).toBe('textarea');
  });
});

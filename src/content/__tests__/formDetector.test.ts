/**
 * BDD tests for FormDetector label extraction — G3
 *
 * Verifies that the enhanced FormDetector extracts labels, options,
 * and standalone inputs correctly (matching main branch behavior).
 */
import { describe, it, expect, beforeEach } from 'vitest';
import FormDetector from '../formDetector';

function setDocument(html: string): void {
  document.body.innerHTML = html;
}

describe('FormDetector — enhanced label & field extraction (G3)', () => {
  let detector: FormDetector;

  beforeEach(() => {
    detector = new FormDetector();
  });

  // ── Label extraction ──────────────────────────────────────────────────────

  it('extracts label via for/id association', () => {
    setDocument(`
      <form>
        <label for="fullName">Full Name</label>
        <input id="fullName" name="fullName" type="text" />
      </form>
    `);
    const forms = detector.detectForms();
    const fields = detector.extractFields(forms[0]!);
    expect(fields[0]?.label).toBe('Full Name');
  });

  it('extracts label via wrapping parent label', () => {
    setDocument(`
      <form>
        <label>Email Address <input name="email" type="email" /></label>
      </form>
    `);
    const forms = detector.detectForms();
    const fields = detector.extractFields(forms[0]!);
    expect(fields[0]?.label).toBe('Email Address');
  });

  it('extracts label via aria-label attribute', () => {
    setDocument(`
      <form>
        <input name="search" type="text" aria-label="Search query" />
      </form>
    `);
    const forms = detector.detectForms();
    const fields = detector.extractFields(forms[0]!);
    expect(fields[0]?.label).toBe('Search query');
  });

  it('extracts label via aria-labelledby', () => {
    setDocument(`
      <form>
        <span id="lbl">Department</span>
        <select name="dept" aria-labelledby="lbl">
          <option value="eng">Engineering</option>
        </select>
      </form>
    `);
    const forms = detector.detectForms();
    const fields = detector.extractFields(forms[0]!);
    expect(fields[0]?.label).toBe('Department');
  });

  it('extracts placeholder as fallback label', () => {
    setDocument(`
      <form>
        <input name="notes" type="text" placeholder="Add notes here" />
      </form>
    `);
    const forms = detector.detectForms();
    const fields = detector.extractFields(forms[0]!);
    expect(fields[0]?.label).toBe('Add notes here');
  });

  // ── Select options ────────────────────────────────────────────────────────

  it('extracts select options with values and text', () => {
    setDocument(`
      <form>
        <select name="country">
          <option value="">-- Select --</option>
          <option value="us">United States</option>
          <option value="uk">United Kingdom</option>
        </select>
      </form>
    `);
    const forms = detector.detectForms();
    const fields = detector.extractFields(forms[0]!);
    const sel = fields.find(f => f.name === 'country');
    expect(sel?.options).toHaveLength(3);
    expect(sel?.options?.[1]).toMatchObject({ value: 'us', text: 'United States' });
  });

  // ── Field ID ─────────────────────────────────────────────────────────────

  it('includes field id in extracted field', () => {
    setDocument(`
      <form>
        <input id="myInput" name="myField" type="text" />
      </form>
    `);
    const forms = detector.detectForms();
    const fields = detector.extractFields(forms[0]!);
    expect(fields[0]?.id).toBe('myInput');
  });

  // ── Required field detection ──────────────────────────────────────────────

  it('marks required fields', () => {
    setDocument(`
      <form>
        <input name="required_field" type="text" required />
        <input name="optional_field" type="text" />
      </form>
    `);
    const forms = detector.detectForms();
    const fields = detector.extractFields(forms[0]!);
    expect(fields.find(f => f.name === 'required_field')?.required).toBe(true);
    expect(fields.find(f => f.name === 'optional_field')?.required).toBe(false);
  });

  // ── Checkbox/radio values ─────────────────────────────────────────────────

  it('extracts checkbox value', () => {
    setDocument(`
      <form>
        <label><input name="agree" type="checkbox" value="yes" /> I agree</label>
      </form>
    `);
    const forms = detector.detectForms();
    const fields = detector.extractFields(forms[0]!);
    const cb = fields.find(f => f.name === 'agree');
    expect(cb?.type).toBe('checkbox');
    expect(cb?.value).toBe('yes');
  });

  it('extracts radio button group values', () => {
    setDocument(`
      <form>
        <label><input name="gender" type="radio" value="male" /> Male</label>
        <label><input name="gender" type="radio" value="female" /> Female</label>
      </form>
    `);
    const forms = detector.detectForms();
    const fields = detector.extractFields(forms[0]!);
    const radios = fields.filter(f => f.name === 'gender');
    expect(radios).toHaveLength(2);
    expect(radios[0]?.value).toBe('male');
    expect(radios[1]?.value).toBe('female');
  });

  // ── Existing behavior preserved ───────────────────────────────────────────

  it('still detects basic forms without labels', () => {
    setDocument(`
      <form>
        <input name="username" type="text" />
        <input name="password" type="password" />
        <textarea name="bio"></textarea>
      </form>
    `);
    const forms = detector.detectForms();
    expect(forms).toHaveLength(1);
    const fields = detector.extractFields(forms[0]!);
    expect(fields).toHaveLength(3);
    expect(fields.find(f => f.name === 'username')?.type).toBe('text');
    expect(fields.find(f => f.name === 'password')?.type).toBe('password');
  });
});

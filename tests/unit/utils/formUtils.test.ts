import { describe, it, expect, beforeEach } from 'vitest';
import {
  escapeHtml,
  getFormSourceInfo,
  generateFormSummary,
  extractFormFields,
  cleanHtml,
} from '@/utils/formUtils';
import type { Form, FormField } from '@/types/forms';

describe('formUtils', () => {
  beforeEach(() => {
    document.title = 'Test Page';
  });

  it('escapeHtml should escape special characters', () => {
    const raw = '&<>"\'</>';
    expect(escapeHtml(raw)).toBe('&amp;&lt;&gt;&quot;&#039;&lt;/&gt;');
    expect(escapeHtml('plain')).toBe('plain');
    expect(escapeHtml('')).toBe('');
    expect(escapeHtml(null)).toBe('');
    expect(escapeHtml(undefined)).toBe('');
  });

  it('getFormSourceInfo should render main page badge', () => {
    const form: Form = { id: 'f1', source: 'main', fields: [] };
    expect(getFormSourceInfo(form)).toBe('<span class="source-badge">main page</span>');
  });

  it('getFormSourceInfo should render iframe badge with depth and path', () => {
    const form: Form = {
      id: 'f2',
      source: 'iframe',
      iframePath: 'root>iframe',
      depth: 2,
      fields: [],
    };
    const html = getFormSourceInfo(form);
    expect(html).toContain('source-badge--iframe');
    expect(html).toContain('iframe');
    expect(html).toContain('depth: 2');
    expect(html).toContain('root>iframe');
  });

  it('generateFormSummary should aggregate counts and categories', () => {
    const fieldsA: FormField[] = [
      { id: 'a1', type: 'text', visible: true, editable: true, category: 'personal' },
      { id: 'a2', type: 'email', visible: true, editable: false, category: 'contact' },
    ];
    const fieldsB: FormField[] = [
      { id: 'b1', type: 'password', visible: true, editable: true, category: 'personal' },
    ];
    const forms: Form[] = [
      { id: 'f1', source: 'main', fields: fieldsA },
      { id: 'f2', source: 'iframe', iframePath: 'root>frame', fields: fieldsB },
    ];

    const summary = generateFormSummary(forms);
    expect(summary.totalForms).toBe(2);
    expect(summary.totalFields).toBe(3);
    expect(summary.categories.personal).toBe(2);
    expect(summary.categories.contact).toBe(1);
    expect(summary.pageTitle).toBe('Test Page');
    expect(summary.pageUrl).toContain('http://');
  });

  it('extractFormFields should include only visible, editable, non-hidden fields', () => {
    const forms: Form[] = [
      {
        id: 'f1',
        source: 'main',
        fields: [
          {
            id: '1',
            name: 'n1',
            label: 'l1',
            type: 'text',
            visible: true,
            editable: true,
            selector: '#a',
          },
          { id: '2', type: 'hidden', visible: true, editable: true },
          { id: '3', type: 'email', visible: false, editable: true },
          { id: '4', type: 'number', visible: true, editable: false },
        ],
      },
      {
        id: 'f2',
        source: 'iframe',
        iframePath: 'root>frame',
        fields: [{ id: '5', type: 'textarea', visible: true, editable: true, xpath: '//x' }],
      },
    ];

    const result = extractFormFields(forms);
    expect(result).toHaveLength(2);
    const ids = result.map(r => r.id);
    expect(ids).toEqual(['1', '5']);
    expect(result[0]).toMatchObject({ id: '1', formId: 'f1', type: 'text' });
    expect(result[1]).toMatchObject({ id: '5', formId: 'f2', type: 'textarea' });
  });

  it('cleanHtml should strip unwanted nodes and attributes, prefer main content', () => {
    const html = `
      <html>
        <head>
          <title>Ignored</title>
          <script>malicious()</script>
          <style>.ad{}</style>
        </head>
        <body>
          <div class="advertisement">ad</div>
          <main>
            <div onclick="x()" style="color:red" data-x="1" class="foo bar">
              ${'content '.repeat(30)}
            </div>
          </main>
        </body>
      </html>
    `;

    const cleaned = cleanHtml(html);
    expect(cleaned).toContain('content');
    expect(cleaned).not.toContain('<script>');
    expect(cleaned).not.toContain('<style>');
    expect(cleaned).not.toContain('onclick=');
    expect(cleaned).not.toContain('style=');
    expect(cleaned).not.toContain('data-x=');
  });
});

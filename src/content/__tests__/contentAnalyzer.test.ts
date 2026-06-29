/**
 * BDD tests for ContentAnalyzer — G3
 *
 * Verifies that the TypeScript ContentAnalyzer produces the same
 * page-structure analysis as the original content-analyzer.js on main.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { ContentAnalyzer, type PageAnalysis } from '../contentAnalyzer';

function setDocument(html: string): void {
  document.body.innerHTML = html;
}

describe('ContentAnalyzer — page structure analysis (G3)', () => {
  let analyzer: ContentAnalyzer;

  beforeEach(() => {
    analyzer = new ContentAnalyzer();
  });

  // ── Semantic structure ────────────────────────────────────────────────────

  it('detects semantic landmark elements', () => {
    setDocument(`
      <main><p>Content</p></main>
      <header>Header</header>
      <footer>Footer</footer>
      <nav>Nav</nav>
      <article><p>Article</p></article>
      <aside>Aside</aside>
    `);
    const result = analyzer.analyzePageStructure();
    const s = result.semanticStructure;
    expect(s.hasMain).toBe(true);
    expect(s.hasHeader).toBe(true);
    expect(s.hasFooter).toBe(true);
    expect(s.hasNav).toBe(true);
    expect(s.hasArticle).toBe(true);
    expect(s.hasAside).toBe(true);
  });

  it('counts heading levels correctly', () => {
    setDocument(`
      <h1>Title</h1>
      <h2>Section 1</h2>
      <h2>Section 2</h2>
      <h3>Sub-section</h3>
    `);
    const result = analyzer.analyzePageStructure();
    const h = result.semanticStructure.headingLevels;
    expect(h['h1']).toBe(1);
    expect(h['h2']).toBe(2);
    expect(h['h3']).toBe(1);
    expect(h['h4']).toBeUndefined();
  });

  it('extracts landmark roles from aria attributes', () => {
    setDocument(`
      <div role="banner">Banner</div>
      <div role="navigation">Nav</div>
      <div role="navigation">Nav 2</div>
      <div role="main">Main</div>
    `);
    const result = analyzer.analyzePageStructure();
    const roles = result.semanticStructure.landmarkRoles;
    expect(roles['navigation']).toBe(2);
    expect(roles['banner']).toBe(1);
    expect(roles['main']).toBe(1);
  });

  it('extracts JSON-LD microdata', () => {
    setDocument(`
      <script type="application/ld+json">{"@type":"Person","name":"Ada"}</script>
    `);
    const result = analyzer.analyzePageStructure();
    const jsonLd = result.semanticStructure.microdata.jsonLd;
    expect(jsonLd).toHaveLength(1);
    expect((jsonLd[0] as { name: string }).name).toBe('Ada');
  });

  it('counts itemscope microdata elements', () => {
    setDocument(`
      <div itemscope itemtype="https://schema.org/Person"><span>Ada</span></div>
      <div itemscope itemtype="https://schema.org/Organization"><span>Org</span></div>
    `);
    const result = analyzer.analyzePageStructure();
    expect(result.semanticStructure.microdata.itemscope).toBe(2);
    expect(result.semanticStructure.microdata.itemtype).toHaveLength(2);
  });

  // ── Page metrics ─────────────────────────────────────────────────────────

  it('counts page elements correctly', () => {
    setDocument(`
      <a href="#">Link 1</a>
      <a href="#">Link 2</a>
      <img src="x.jpg" alt="img" />
      <form><input type="text" /></form>
      <table><tr><td>Cell</td></tr></table>
      <ul><li>Item</li></ul>
    `);
    const result = analyzer.analyzePageStructure();
    const m = result.pageMetrics;
    expect(m.links).toBe(2);
    expect(m.images).toBe(1);
    expect(m.forms).toBe(1);
    expect(m.tables).toBe(1);
    expect(m.lists).toBe(1);
  });

  // ── Accessibility ─────────────────────────────────────────────────────────

  it('checks alt text coverage on images', () => {
    setDocument(`
      <img src="a.jpg" alt="Image A" />
      <img src="b.jpg" alt="Image B" />
      <img src="c.jpg" />
    `);
    const result = analyzer.analyzePageStructure();
    const alt = result.accessibilityInfo.hasAltTexts;
    expect(alt.total).toBe(3);
    expect(alt.withAlt).toBe(2);
    expect(alt.percentage).toBe(67);
  });

  it('counts aria-label elements', () => {
    setDocument(`
      <button aria-label="Close">X</button>
      <input aria-label="Search" type="text" />
    `);
    const result = analyzer.analyzePageStructure();
    expect(result.accessibilityInfo.hasAriaLabels).toBe(2);
  });

  it('detects heading structure issues', () => {
    setDocument('<h1>Title</h1><h3>Skipped h2!</h3>');
    const result = analyzer.analyzePageStructure();
    const hs = result.accessibilityInfo.headingStructure;
    expect(hs.hasH1).toBe(true);
    expect(hs.issues.length).toBeGreaterThan(0);
    expect(hs.issues[0]).toContain('h1');
  });

  // ── Content quality ───────────────────────────────────────────────────────

  it('counts words and paragraphs for content quality', () => {
    setDocument('<p>Hello world this is a test.</p><p>Second paragraph here.</p>');
    const result = analyzer.analyzePageStructure();
    const q = result.contentQuality;
    expect(q.paragraphCount).toBe(2);
    expect(q.wordCount).toBeGreaterThan(5);
  });

  // ── Return shape ─────────────────────────────────────────────────────────

  it('returns all required top-level keys', () => {
    setDocument('<p>Content</p>');
    const result: PageAnalysis = analyzer.analyzePageStructure();
    expect(result).toHaveProperty('contentSelectors');
    expect(result).toHaveProperty('pageMetrics');
    expect(result).toHaveProperty('semanticStructure');
    expect(result).toHaveProperty('accessibilityInfo');
    expect(result).toHaveProperty('contentQuality');
  });
});

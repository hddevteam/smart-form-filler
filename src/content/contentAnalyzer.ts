/**
 * ContentAnalyzer — TypeScript port of content-analyzer.js (main branch).
 *
 * Analyzes page structure for semantic content, accessibility, and metrics.
 * Runs in content script context; has no direct AI or backend dependencies.
 */

export interface PageMetrics {
  totalElements: number;
  textElements: number;
  links: number;
  images: number;
  forms: number;
  tables: number;
  lists: number;
  scripts: number;
  styles: number;
  iframes: number;
}

export interface HeadingLevels {
  h1?: number;
  h2?: number;
  h3?: number;
  h4?: number;
  h5?: number;
  h6?: number;
}

export interface Microdata {
  itemscope: number;
  itemtype: string[];
  jsonLd: unknown[];
}

export interface SemanticStructure {
  hasMain: boolean;
  hasArticle: boolean;
  hasHeader: boolean;
  hasFooter: boolean;
  hasNav: boolean;
  hasAside: boolean;
  headingLevels: HeadingLevels;
  landmarkRoles: Record<string, number>;
  microdata: Microdata;
}

export interface AltTextInfo {
  total: number;
  withAlt: number;
  percentage: number;
}

export interface HeadingStructureInfo {
  total: number;
  issues: string[];
  hasH1: boolean;
  multipleH1: boolean;
}

export interface AccessibilityInfo {
  hasAltTexts: AltTextInfo;
  hasAriaLabels: number;
  hasAriaDescriptions: number;
  hasSkipLinks: boolean;
  colorContrast: { backgroundColor: string; textColor: string; estimated: string };
  headingStructure: HeadingStructureInfo;
}

export interface ContentQuality {
  wordCount: number;
  sentenceCount: number;
  paragraphCount: number;
  averageWordsPerSentence: number;
  averageSentencesPerParagraph: number;
  readabilityScore: number;
}

export interface ContentSelectorResult {
  selector: string;
  index: number;
  textLength: number;
  elementCount: number;
  score: number;
}

export interface PageAnalysis {
  contentSelectors: ContentSelectorResult[];
  pageMetrics: PageMetrics;
  semanticStructure: SemanticStructure;
  accessibilityInfo: AccessibilityInfo;
  contentQuality: ContentQuality;
}

const CONTENT_SELECTORS = [
  'main',
  'article',
  '.content',
  '.main-content',
  '#content',
  '#main',
  '.post',
  '.entry',
  '.article-body',
];

const EXCLUDED_TAGS = new Set(['nav', 'aside', 'footer', 'header']);
const EXCLUDED_CLASSES = new Set(['sidebar', 'navigation', 'ads', 'advertisement']);

export class ContentAnalyzer {
  analyzePageStructure(): PageAnalysis {
    return {
      contentSelectors: this.findBestContentSelectors(),
      pageMetrics: this.calculatePageMetrics(),
      semanticStructure: this.analyzeSemanticStructure(),
      accessibilityInfo: this.analyzeAccessibility(),
      contentQuality: this.assessContentQuality(),
    };
  }

  // ── Content selectors ─────────────────────────────────────────────────────

  private findBestContentSelectors(): ContentSelectorResult[] {
    const results: ContentSelectorResult[] = [];
    for (const selector of CONTENT_SELECTORS) {
      document.querySelectorAll<HTMLElement>(selector).forEach((el, index) => {
        if (this.isValidContentElement(el)) {
          results.push({
            selector,
            index,
            textLength: (el.textContent ?? '').trim().length,
            elementCount: el.querySelectorAll('*').length,
            score: this.calculateContentScore(el),
          });
        }
      });
    }
    return results.sort((a, b) => b.score - a.score);
  }

  private isValidContentElement(el: HTMLElement): boolean {
    const text = (el.textContent ?? '').trim().length;
    const tag = el.tagName.toLowerCase();
    if (text <= 100) return false;
    if (EXCLUDED_TAGS.has(tag)) return false;
    for (const cls of EXCLUDED_CLASSES) {
      if (el.classList.contains(cls)) return false;
    }
    return true;
  }

  private calculateContentScore(el: HTMLElement): number {
    const textLen = (el.textContent ?? '').trim().length;
    const elCount = el.querySelectorAll('*').length;
    const paragraphs = el.querySelectorAll('p').length;
    const headings = el.querySelectorAll('h1,h2,h3,h4,h5,h6').length;
    let score = 0;
    score += Math.min(textLen / 100, 50);
    score += Math.min(paragraphs * 2, 20);
    score += Math.min(headings * 3, 15);
    score += elCount > 0 ? Math.min((textLen / elCount) * 10, 15) : 0;
    return score;
  }

  // ── Page metrics ──────────────────────────────────────────────────────────

  private calculatePageMetrics(): PageMetrics {
    return {
      totalElements: document.querySelectorAll('*').length,
      textElements: document.querySelectorAll('p,span,div,h1,h2,h3,h4,h5,h6').length,
      links: document.querySelectorAll('a[href]').length,
      images: document.querySelectorAll('img').length,
      forms: document.querySelectorAll('form').length,
      tables: document.querySelectorAll('table').length,
      lists: document.querySelectorAll('ul,ol').length,
      scripts: document.querySelectorAll('script').length,
      styles: document.querySelectorAll("style,link[rel='stylesheet']").length,
      iframes: document.querySelectorAll('iframe').length,
    };
  }

  // ── Semantic structure ────────────────────────────────────────────────────

  private analyzeSemanticStructure(): SemanticStructure {
    return {
      hasMain: !!document.querySelector('main'),
      hasArticle: !!document.querySelector('article'),
      hasHeader: !!document.querySelector('header'),
      hasFooter: !!document.querySelector('footer'),
      hasNav: !!document.querySelector('nav'),
      hasAside: !!document.querySelector('aside'),
      headingLevels: this.getHeadingLevels(),
      landmarkRoles: this.getLandmarkRoles(),
      microdata: this.getMicrodata(),
    };
  }

  private getHeadingLevels(): HeadingLevels {
    const levels: HeadingLevels = {};
    document.querySelectorAll('h1,h2,h3,h4,h5,h6').forEach(h => {
      const key = h.tagName.toLowerCase() as keyof HeadingLevels;
      levels[key] = (levels[key] ?? 0) + 1;
    });
    return levels;
  }

  private getLandmarkRoles(): Record<string, number> {
    const roles: Record<string, number> = {};
    document.querySelectorAll('[role]').forEach(el => {
      const role = el.getAttribute('role');
      if (role) roles[role] = (roles[role] ?? 0) + 1;
    });
    return roles;
  }

  private getMicrodata(): Microdata {
    const itemtype = Array.from(document.querySelectorAll('[itemtype]'))
      .map(el => el.getAttribute('itemtype') ?? '')
      .filter(Boolean)
      .filter((v, i, a) => a.indexOf(v) === i);

    const jsonLd = Array.from(document.querySelectorAll("script[type='application/ld+json']"))
      .map(s => {
        try {
          return JSON.parse(s.textContent ?? '') as unknown;
        } catch {
          return null;
        }
      })
      .filter(d => d !== null);

    return {
      itemscope: document.querySelectorAll('[itemscope]').length,
      itemtype,
      jsonLd,
    };
  }

  // ── Accessibility ─────────────────────────────────────────────────────────

  private analyzeAccessibility(): AccessibilityInfo {
    return {
      hasAltTexts: this.checkAltTexts(),
      hasAriaLabels: document.querySelectorAll('[aria-label]').length,
      hasAriaDescriptions: document.querySelectorAll('[aria-describedby]').length,
      hasSkipLinks: this.checkSkipLinks(),
      colorContrast: this.estimateColorContrast(),
      headingStructure: this.checkHeadingStructure(),
    };
  }

  private checkAltTexts(): AltTextInfo {
    const images = Array.from(document.querySelectorAll('img'));
    const withAlt = images.filter(img => (img.alt ?? '').trim() !== '').length;
    const total = images.length;
    return {
      total,
      withAlt,
      percentage: total > 0 ? Math.round((withAlt / total) * 100) : 0,
    };
  }

  private checkSkipLinks(): boolean {
    return (
      document.querySelectorAll('a[href^="#"]:first-child,.skip-link,.skip-to-content').length > 0
    );
  }

  private estimateColorContrast(): {
    backgroundColor: string;
    textColor: string;
    estimated: string;
  } {
    const style = typeof window !== 'undefined' ? window.getComputedStyle(document.body) : null;
    return {
      backgroundColor: style?.backgroundColor ?? 'unknown',
      textColor: style?.color ?? 'unknown',
      estimated: 'unknown',
    };
  }

  private checkHeadingStructure(): HeadingStructureInfo {
    const headings = Array.from(document.querySelectorAll('h1,h2,h3,h4,h5,h6'));
    const levels = headings.map(h => parseInt(h.tagName[1] ?? '1'));
    const issues: string[] = [];
    for (let i = 1; i < levels.length; i++) {
      const prev = levels[i - 1] ?? 1;
      const curr = levels[i] ?? 1;
      if (curr > prev + 1) {
        issues.push(`Heading level jumps from h${prev} to h${curr} at position ${i}`);
      }
    }
    return {
      total: headings.length,
      issues,
      hasH1: levels.includes(1),
      multipleH1: levels.filter(l => l === 1).length > 1,
    };
  }

  // ── Content quality ───────────────────────────────────────────────────────

  private assessContentQuality(): ContentQuality {
    const textContent = document.body?.textContent ?? '';
    const wordCount = textContent.split(/\s+/).filter(w => w.length > 0).length;
    const sentences = textContent.split(/[.!?]+/).filter(s => s.trim().length > 0).length;
    const paragraphs = document.querySelectorAll('p').length;
    return {
      wordCount,
      sentenceCount: sentences,
      paragraphCount: paragraphs,
      averageWordsPerSentence: sentences > 0 ? Math.round(wordCount / sentences) : 0,
      averageSentencesPerParagraph: paragraphs > 0 ? Math.round(sentences / paragraphs) : 0,
      readabilityScore: this.calculateReadabilityScore(wordCount, sentences, textContent),
    };
  }

  private calculateReadabilityScore(
    wordCount: number,
    sentenceCount: number,
    text: string
  ): number {
    if (sentenceCount === 0 || wordCount === 0) return 0;
    const avgSentLen = wordCount / sentenceCount;
    const syllables = this.countSyllables(text);
    const avgSyllPerWord = syllables / wordCount;
    const score = 206.835 - 1.015 * avgSentLen - 84.6 * avgSyllPerWord;
    return Math.max(0, Math.min(100, Math.round(score)));
  }

  private countSyllables(text: string): number {
    const words = text.toLowerCase().match(/[a-z]+/g) ?? [];
    return words.reduce((total, word) => {
      const syllables = word.match(/[aeiouy]+/g) ?? [];
      return total + Math.max(1, syllables.length);
    }, 0);
  }
}

export default ContentAnalyzer;

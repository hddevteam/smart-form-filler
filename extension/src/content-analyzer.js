/* global chrome */
// content-analyzer.js - Advanced content analysis functionality
(function() {
    "use strict";

    // Advanced content analysis utility
    class ContentAnalyzer {
        constructor() {
            this.setupMessageListener();
        }

        setupMessageListener() {
            chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
                if (request.action === "analyzeContent") {
                    try {
                        const analysis = this.analyzePageStructure();
                        sendResponse({ success: true, analysis: analysis });
                    } catch (error) {
                        sendResponse({ success: false, error: error.message });
                    }
                }
                return true; // Keep the message channel open for async response
            });
        }

        analyzePageStructure() {
            return {
                contentSelectors: this.findBestContentSelectors(),
                pageMetrics: this.calculatePageMetrics(),
                semanticStructure: this.analyzeSemanticStructure(),
                accessibilityInfo: this.analyzeAccessibility(),
                contentQuality: this.assessContentQuality()
            };
        }

        findBestContentSelectors() {
            const selectors = [
                "main", "article", ".content", ".main-content", 
                "#content", "#main", ".post", ".entry", ".article-body"
            ];
            
            const results = [];
            
            selectors.forEach(selector => {
                const elements = document.querySelectorAll(selector);
                elements.forEach((element, index) => {
                    if (this.isValidContentElement(element)) {
                        results.push({
                            selector: selector,
                            index: index,
                            textLength: element.textContent.trim().length,
                            elementCount: element.querySelectorAll("*").length,
                            score: this.calculateContentScore(element)
                        });
                    }
                });
            });
            
            return results.sort((a, b) => b.score - a.score);
        }

        calculatePageMetrics() {
            return {
                totalElements: document.querySelectorAll("*").length,
                textElements: document.querySelectorAll("p, span, div, h1, h2, h3, h4, h5, h6").length,
                links: document.querySelectorAll("a[href]").length,
                images: document.querySelectorAll("img").length,
                forms: document.querySelectorAll("form").length,
                tables: document.querySelectorAll("table").length,
                lists: document.querySelectorAll("ul, ol").length,
                scripts: document.querySelectorAll("script").length,
                styles: document.querySelectorAll("style, link[rel='stylesheet']").length,
                iframes: document.querySelectorAll("iframe").length
            };
        }

        analyzeSemanticStructure() {
            const structure = {
                hasMain: !!document.querySelector("main"),
                hasArticle: !!document.querySelector("article"),
                hasHeader: !!document.querySelector("header"),
                hasFooter: !!document.querySelector("footer"),
                hasNav: !!document.querySelector("nav"),
                hasAside: !!document.querySelector("aside"),
                headingLevels: this.getHeadingLevels(),
                landmarkRoles: this.getLandmarkRoles(),
                microdata: this.getMicrodata()
            };
            
            return structure;
        }

        getHeadingLevels() {
            const headings = {};
            document.querySelectorAll("h1, h2, h3, h4, h5, h6").forEach(heading => {
                const level = heading.tagName.toLowerCase();
                headings[level] = (headings[level] || 0) + 1;
            });
            return headings;
        }

        getLandmarkRoles() {
            const roles = {};
            document.querySelectorAll("[role]").forEach(element => {
                const role = element.getAttribute("role");
                roles[role] = (roles[role] || 0) + 1;
            });
            return roles;
        }

        getMicrodata() {
            const microdata = {
                itemscope: document.querySelectorAll("[itemscope]").length,
                itemtype: Array.from(document.querySelectorAll("[itemtype]")).map(el => 
                    el.getAttribute("itemtype")
                ).filter((value, index, self) => self.indexOf(value) === index),
                jsonLd: Array.from(document.querySelectorAll("script[type='application/ld+json']")).map(script => {
                    try {
                        return JSON.parse(script.textContent);
                    } catch (e) {
                        return null;
                    }
                }).filter(data => data !== null)
            };
            return microdata;
        }

        analyzeAccessibility() {
            return {
                hasAltTexts: this.checkAltTexts(),
                hasAriaLabels: document.querySelectorAll("[aria-label]").length,
                hasAriaDescriptions: document.querySelectorAll("[aria-describedby]").length,
                hasSkipLinks: this.checkSkipLinks(),
                colorContrast: this.estimateColorContrast(),
                headingStructure: this.checkHeadingStructure()
            };
        }

        checkAltTexts() {
            const images = document.querySelectorAll("img");
            const withAlt = Array.from(images).filter(img => img.alt && img.alt.trim() !== "").length;
            return {
                total: images.length,
                withAlt: withAlt,
                percentage: images.length > 0 ? Math.round((withAlt / images.length) * 100) : 0
            };
        }

        checkSkipLinks() {
            const skipLinks = document.querySelectorAll("a[href^='#']:first-child, .skip-link, .skip-to-content");
            return skipLinks.length > 0;
        }

        estimateColorContrast() {
            // Simple estimation - would need more sophisticated analysis for real use
            const bodyStyle = window.getComputedStyle(document.body);
            const backgroundColor = bodyStyle.backgroundColor;
            const color = bodyStyle.color;
            
            return {
                backgroundColor: backgroundColor,
                textColor: color,
                estimated: "unknown" // Placeholder for actual contrast calculation
            };
        }

        checkHeadingStructure() {
            const headings = Array.from(document.querySelectorAll("h1, h2, h3, h4, h5, h6"));
            const levels = headings.map(h => parseInt(h.tagName.substring(1)));
            
            let issues = [];
            for (let i = 1; i < levels.length; i++) {
                if (levels[i] > levels[i-1] + 1) {
                    issues.push(`Heading level jumps from h${levels[i-1]} to h${levels[i]} at position ${i}`);
                }
            }
            
            return {
                total: headings.length,
                issues: issues,
                hasH1: levels.includes(1),
                multipleH1: levels.filter(l => l === 1).length > 1
            };
        }

        assessContentQuality() {
            const textContent = document.body.textContent;
            const wordCount = textContent.split(/\s+/).filter(word => word.length > 0).length;
            const sentences = textContent.split(/[.!?]+/).filter(s => s.trim().length > 0).length;
            const paragraphs = document.querySelectorAll("p").length;
            
            return {
                wordCount: wordCount,
                sentenceCount: sentences,
                paragraphCount: paragraphs,
                averageWordsPerSentence: sentences > 0 ? Math.round(wordCount / sentences) : 0,
                averageSentencesPerParagraph: paragraphs > 0 ? Math.round(sentences / paragraphs) : 0,
                readabilityScore: this.calculateReadabilityScore(wordCount, sentences, textContent)
            };
        }

        calculateReadabilityScore(wordCount, sentenceCount, text) {
            // Simple Flesch Reading Ease approximation
            if (sentenceCount === 0 || wordCount === 0) return 0;
            
            const avgSentenceLength = wordCount / sentenceCount;
            const syllableCount = this.countSyllables(text);
            const avgSyllablesPerWord = syllableCount / wordCount;
            
            const score = 206.835 - (1.015 * avgSentenceLength) - (84.6 * avgSyllablesPerWord);
            return Math.max(0, Math.min(100, Math.round(score)));
        }

        countSyllables(text) {
            // Simple syllable counting approximation
            const words = text.toLowerCase().match(/[a-z]+/g) || [];
            return words.reduce((total, word) => {
                const syllables = word.match(/[aeiouy]+/g) || [];
                return total + Math.max(1, syllables.length);
            }, 0);
        }

        calculateContentScore(element) {
            const textLength = element.textContent.trim().length;
            const elementCount = element.querySelectorAll("*").length;
            const paragraphs = element.querySelectorAll("p").length;
            const headings = element.querySelectorAll("h1, h2, h3, h4, h5, h6").length;
            
            // Score based on text density, structure, and semantic elements
            let score = 0;
            score += Math.min(textLength / 100, 50); // Text length score (max 50)
            score += Math.min(paragraphs * 2, 20); // Paragraph score (max 20)
            score += Math.min(headings * 3, 15); // Heading score (max 15)
            score += Math.min((textLength / elementCount) * 10, 15); // Text density score (max 15)
            
            return score;
        }

        isValidContentElement(element) {
            const textLength = element.textContent.trim().length;
            const tagName = element.tagName.toLowerCase();
            
            // Skip elements that are too small or are likely navigation/sidebar content
            return textLength > 100 && 
                   !["nav", "aside", "footer", "header"].includes(tagName) &&
                   !element.classList.contains("sidebar") &&
                   !element.classList.contains("navigation") &&
                   !element.classList.contains("ads") &&
                   !element.classList.contains("advertisement");
        }
    }

    // Initialize the content analyzer
    new ContentAnalyzer();
    console.log("🚀 Content analyzer loaded");

})();

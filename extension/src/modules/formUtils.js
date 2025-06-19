// edge-extension/src/modules/formUtils.js
/**
 * Form Utilities - Common helper functions for form handling
 */

/**
 * Shared form utility functions
 */
class FormUtils {
    /**
     * Escape HTML to prevent XSS
     * @param {string} text - Text to escape
     * @returns {string} Escaped text
     */
    static escapeHtml(text) {
        if (!text) return "";
        return text
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }

    /**
     * Get form source information (main page or iframe)
     * @param {Object} form - Form object
     * @returns {string} Source information HTML
     */
    static getFormSourceInfo(form) {
        if (form.source === "iframe") {
            return `<span class="source-badge source-badge--iframe" title="Form located in iframe: ${form.iframePath}">iframe${form.depth ? ` (depth: ${form.depth})` : ""}</span>`;
        }
        return "<span class=\"source-badge\">main page</span>";
    }

    /**
     * Generate form summary for API call
     * @param {Array} forms - Array of form objects
     * @returns {Object} Form summary
     */
    static generateFormSummary(forms) {
        const totalFields = forms.reduce((total, form) => total + form.fields.length, 0);
        const categories = {};
        
        forms.forEach(form => {
            form.fields.forEach(field => {
                categories[field.category] = (categories[field.category] || 0) + 1;
            });
        });

        return {
            totalForms: forms.length,
            totalFields: totalFields,
            categories: categories,
            pageUrl: window.location.href,
            pageTitle: document.title
        };
    }

    /**
     * Extract all form fields for API call
     * @param {Array} forms - Array of form objects
     * @returns {Array} All form fields
     */
    static extractFormFields(forms) {
        const allFields = [];
        
        forms.forEach(form => {
            form.fields.forEach(field => {
                // Only include fillable fields
                if (field.visible && field.editable && field.type !== "hidden") {
                    allFields.push({
                        id: field.id,
                        originalId: field.originalId,
                        name: field.name,
                        label: field.label,
                        type: field.type,
                        placeholder: field.placeholder,
                        category: field.category,
                        required: field.required,
                        formId: form.id,
                        selector: field.selector,
                        source: field.source,
                        iframePath: field.iframePath,
                        xpath: field.xpath
                    });
                }
            });
        });
        
        return allFields;
    }

    /**
     * Clean HTML content for analysis
     * @param {string} html - Raw HTML content
     * @returns {string} Cleaned HTML content
     */
    static cleanHtml(html) {
        if (!html) return "";
        
        try {
            // Create a temporary div to parse HTML
            const tempDiv = document.createElement("div");
            tempDiv.innerHTML = html;
            
            // Remove unwanted elements
            const unwantedSelectors = [
                "script", "style", "noscript", "meta", 
                "link[rel=\"stylesheet\"]", "head",
                ".advertisement", ".ad", ".ads", ".sponsored",
                "nav", "footer", "header .navbar",
                ".cookie-notice", ".popup", ".modal"
            ];
            
            unwantedSelectors.forEach(selector => {
                const elements = tempDiv.querySelectorAll(selector);
                elements.forEach(el => el.remove());
            });
            
            // Clean attributes from all elements
            const allElements = tempDiv.querySelectorAll("*");
            allElements.forEach(element => {
                // Remove event handlers and style attributes
                const attributesToRemove = [];
                for (let i = 0; i < element.attributes.length; i++) {
                    const attr = element.attributes[i];
                    if (attr.name.startsWith("on") || 
                        attr.name === "style" || 
                        attr.name.startsWith("data-") ||
                        attr.name === "class" && attr.value.includes("ad")) {
                        attributesToRemove.push(attr.name);
                    }
                }
                attributesToRemove.forEach(attrName => {
                    element.removeAttribute(attrName);
                });
            });
            
            // Extract main content
            const contentSelectors = [
                "main", "[role=\"main\"]", ".main-content", "#main", 
                ".content", "article", ".post-content", ".entry-content"
            ];
            
            for (const selector of contentSelectors) {
                const element = tempDiv.querySelector(selector);
                if (element && element.textContent.trim().length > 100) {
                    return element.innerHTML;
                }
            }
            
            // If no main content found, return body content
            const body = tempDiv.querySelector("body");
            if (body) {
                return body.innerHTML;
            }
            
            return tempDiv.innerHTML;
        } catch (error) {
            console.warn("Failed to clean HTML, returning original:", error);
            return html;
        }
    }
}

// Make FormUtils available globally
window.FormUtils = FormUtils;

// edge-extension/src/modules/formDetector.js
/**
 * Form Detector Module - Detects and analyzes form fields on web pages
 */

// Avoid redefinition
if (!window.FormDetector) {

    class FormDetector {
        constructor() {
            this.formElements = [];
            this.fieldTypes = {
                "text": ["text", "search", "url"],
                "email": ["email"],
                "phone": ["tel"],
                "number": ["number"],
                "date": ["date", "datetime-local", "time"],
                "textarea": ["textarea"],
                "select": ["select-one", "select-multiple"],
                "checkbox": ["checkbox"],
                "radio": ["radio"],
                "file": ["file"],
                "password": ["password"]
            };
        }

        /**
         * Detect all forms and form fields on the current page and all accessible iframes
         */
        detectForms() {
            this.formElements = [];
        
            // 1. First detect forms in the main page
            this.detectFormsInDocument(document, "main");
            
            // 2. Then detect forms in all accessible iframes
            this.detectFormsInIframes();
            
            // Log summary results only
            this.logSummaryResults();

            console.log(`✅ Detection completed: ${this.formElements.length} forms, ${this.getTotalFieldCount()} fields`);
            return this.getDetectionResult();
        }

        /**
         * Detect forms in a specific document (main page or iframe)
         */
        detectFormsInDocument(doc, source = "main", iframePath = "") {
            // Find all forms in this document
            const forms = doc.querySelectorAll("form");
            const allInputs = doc.querySelectorAll("input, textarea, select");
        
            // Process form elements
            forms.forEach((form, formIndex) => {
                this.processForm(form, formIndex, source, iframePath);
            });

            // Process standalone inputs (not in forms)
            const standaloneInputs = Array.from(allInputs).filter(input => !input.closest("form"));
            if (standaloneInputs.length > 0) {
                this.processStandaloneInputs(standaloneInputs, source, iframePath);
            }
        }

        /**
         * Detect forms in all accessible iframes
         */
        detectFormsInIframes() {
            const iframes = document.querySelectorAll("iframe");
            
            iframes.forEach((iframe, index) => {
                this.processIframeForForms(iframe, index, `iframe-${index}`);
            });
        }

        /**
         * Process a single iframe for form detection
         */
        processIframeForForms(iframe, index, indexPath) {
            try {
                // Check if iframe is accessible (same-origin)
                if (!this.isIframeAccessible(iframe)) {
                    return; // Silently skip cross-origin iframes
                }
                
                const iframeDoc = iframe.contentDocument || iframe.contentWindow.document;
                if (!iframeDoc) {
                    return; // Silently skip inaccessible iframes
                }
                
                // Detect forms in this iframe
                this.detectFormsInDocument(iframeDoc, "iframe", indexPath);
                
                // Recursively check for nested iframes (with depth limit)
                const nestedIframes = iframeDoc.querySelectorAll("iframe");
                if (nestedIframes.length > 0) {
                    nestedIframes.forEach((nestedIframe, nestedIndex) => {
                        const nestedPath = `${indexPath}.${nestedIndex}`;
                        this.processIframeForForms(nestedIframe, nestedIndex, nestedPath);
                    });
                }
                
            } catch (error) {
                // Only log actual errors
                if (error.message && !error.message.includes("cross-origin") && !error.message.includes("Permission denied")) {
                    console.log(`❌ Error processing iframe ${indexPath}:`, error.message);
                }
            }
        }

        /**
         * Check if an iframe is accessible (same-origin)
         */
        isIframeAccessible(iframe) {
            try {
                // Try to access the iframe's document
                const doc = iframe.contentDocument || iframe.contentWindow.document;
                if (!doc) return false;
                
                // Try to access a property - this will throw if cross-origin
                doc.domain;
                return true;
            } catch (error) {
                return false;
            }
        }

        /**
         * Process a single form element
         */
        processForm(form, formIndex, source = "main", iframePath = "") {
            const formId = form.id || `${source}_form_${formIndex}${iframePath ? `_${iframePath}` : ""}`;
            const formData = {
                type: "form",
                id: formId,
                index: formIndex,
                source: source, // "main" or "iframe"
                iframePath: iframePath, // e.g., "iframe-1" or "iframe-1.0"
                name: form.name || "",
                action: form.action || "",
                method: form.method || "GET",
                title: form.title || "", // Add form title
                description: this.getFormDescription(form), // Add form description
                fields: []
            };

            // Only log for forms with multiple fields or in iframes
            const shouldLog = form.querySelectorAll("input, textarea, select").length > 5 || source === "iframe";
            if (shouldLog) {
                console.log(`📝 Form found in ${source}${iframePath ? ` (${iframePath})` : ""}: ${formData.fields.length} fields`);
            }

            // Find all form fields within this form
            const fields = form.querySelectorAll("input, textarea, select");

            fields.forEach((field, fieldIndex) => {
                const fieldInfo = this.analyzeField(field, `${formData.id}_field_${fieldIndex}`, source, iframePath);
                if (fieldInfo && this.isValidFormField(fieldInfo)) {
                    formData.fields.push(fieldInfo);
                }
            });

            if (formData.fields.length > 0) {
                this.formElements.push(formData);
            }
        }

        /**
         * Process standalone input elements (not in forms)
         */
        processStandaloneInputs(inputs, source = "main", iframePath = "") {
            const standaloneFormId = `standalone_fields_${source}${iframePath ? `_${iframePath}` : ""}`;
            const standaloneForm = {
                type: "standalone",
                id: standaloneFormId,
                name: `Standalone Fields (${source}${iframePath ? ` - ${iframePath}` : ""})`,
                source: source,
                iframePath: iframePath,
                title: "",
                description: this.getStandaloneFieldsDescription(inputs),
                fields: []
            };

            // Only log if significant number of standalone inputs
            if (inputs.length > 10) {
                console.log(`🔍 Processing ${inputs.length} standalone inputs in ${source}${iframePath ? ` (${iframePath})` : ""}`);
            }

            inputs.forEach((field, index) => {
                const fieldInfo = this.analyzeField(field, `${standaloneFormId}_field_${index}`, source, iframePath);
                if (fieldInfo && this.isValidFormField(fieldInfo)) {
                    standaloneForm.fields.push(fieldInfo);
                }
            });

            if (standaloneForm.fields.length > 0) {
                this.formElements.push(standaloneForm);
            }
        }

        /**
         * Get description for standalone fields
         */
        getStandaloneFieldsDescription(inputs) {
            if (inputs.length === 0) return "";
            
            // Get the document context
            const firstInput = inputs[0];
            const ownerDoc = firstInput.ownerDocument || document;
            
            // Try to find a common container or page title
            let description = "";
            
            // Check if all inputs are in a common container with a title
            const containers = inputs.map(input => input.closest(".form-container, .questionnaire, .survey, .application, .office-form"));
            const commonContainer = containers.find(container => container && containers.every(c => c === container));
            
            if (commonContainer) {
                const containerTitle = commonContainer.querySelector("h1, h2, h3, h4, h5, h6, .title, .heading");
                if (containerTitle && containerTitle.textContent.trim()) {
                    description = containerTitle.textContent.trim();
                }
            }
            
            // Fallback to document title
            if (!description && ownerDoc.title && ownerDoc.title !== "undefined") {
                description = ownerDoc.title;
            }
            
            return description;
        }

        /**
         * Analyze a single form field
         */
        analyzeField(field, fallbackId, source = "main", iframePath = "") {
            try {
                // Ensure we get the name attribute correctly, even in complex scenarios
                const fieldName = field.name || field.getAttribute("name") || "";
                const fieldId = field.id || field.getAttribute("id") || "";
                
                const fieldInfo = {
                    id: fieldId || fallbackId,
                    originalId: fieldId, // Store the original DOM element ID
                    name: fieldName,
                    type: field.type || field.tagName.toLowerCase(),
                    tagName: field.tagName.toLowerCase(),
                    label: this.getFieldLabel(field),
                    title: field.title || "", // Include title attribute for higher priority mapping
                    placeholder: field.placeholder || "",
                    value: field.value || "",
                    required: field.required || false,
                    disabled: field.disabled || false,
                    readonly: field.readOnly || false,
                    maxLength: field.maxLength || null,
                    pattern: field.pattern || "",
                    className: field.className || "",
                    // Enhanced accessibility attributes
                    ariaLabel: field.getAttribute("aria-label") || "",
                    ariaLabelledBy: field.getAttribute("aria-labelledby") || "",
                    ariaRequired: field.getAttribute("aria-required") || "",
                    ariaDescribedBy: field.getAttribute("aria-describedby") || "",
                    // Enhanced form attributes
                    autoComplete: field.getAttribute("autocomplete") || "",
                    spellCheck: field.getAttribute("spellcheck") || "",
                    xpath: this.getXPath(field),
                    selector: this.generateSelector(field),
                    boundingRect: this.getElementBounds(field),
                    visible: this.isElementVisible(field),
                    editable: this.isFieldEditable(field),
                    source: source, // "main" or "iframe"
                    iframePath: iframePath // e.g., "iframe-1" or "iframe-1.0"
                };

                // Add select-specific info
                if (field.tagName.toLowerCase() === "select") {
                    fieldInfo.options = Array.from(field.options).map(option => ({
                        value: option.value,
                        text: option.text,
                        selected: option.selected
                    }));
                    fieldInfo.multiple = field.multiple;
                }

                // Add semantic category
                fieldInfo.category = this.categorizeField(fieldInfo);

                // Debug: Validate name and XPath consistency (only in development)
                if (fieldInfo.xpath && fieldInfo.xpath.includes("@name=") && !fieldInfo.name && window.location.href.includes("localhost")) {
                    console.warn("⚠️ XPath contains name but fieldInfo.name is empty for field:", fieldInfo.id);
                }

                return fieldInfo;
            } catch (error) {
                console.warn("⚠️ Error analyzing field:", error);
                return null;
            }
        }

        /**
         * Get the form description/context from surrounding elements
         */
        getFormDescription(form) {
            let description = "";
            
            // 1. Check for form's own title attribute
            if (form.title) {
                description = form.title;
            }
            
            // 2. Check for heading elements before the form
            const headingSelectors = ["h1", "h2", "h3", "h4", "h5", "h6"];
            for (const selector of headingSelectors) {
                const heading = this.findPrecedingElement(form, selector);
                if (heading && heading.textContent.trim()) {
                    description = heading.textContent.trim();
                    break;
                }
            }
            
            // 3. Check for legend element (form group title)
            const legend = form.querySelector("legend");
            if (legend && legend.textContent.trim()) {
                description = legend.textContent.trim();
            }
            
            // 4. Check for Office Forms specific elements
            const officeTitle = form.querySelector(".office-form-title, .office-form-heading, [data-automation-id*='title']");
            if (officeTitle && officeTitle.textContent.trim()) {
                description = officeTitle.textContent.trim();
            }
            
            // 5. Check for div/p with descriptive text before form
            if (!description) {
                const descriptiveElement = this.findPrecedingElement(form, "div, p");
                if (descriptiveElement && descriptiveElement.textContent.trim().length > 10 && descriptiveElement.textContent.trim().length < 200) {
                    description = descriptiveElement.textContent.trim();
                }
            }
            
            // 6. Check for fieldset with legend
            const fieldset = form.querySelector("fieldset legend");
            if (fieldset && fieldset.textContent.trim()) {
                description = fieldset.textContent.trim();
            }
            
            // 7. Look for container with form-related classes
            if (!description) {
                const container = form.closest(".form-container, .survey-container, .office-form, .questionnaire, .application-form");
                if (container) {
                    const containerTitle = container.querySelector("h1, h2, h3, h4, h5, h6, .title, .heading");
                    if (containerTitle && containerTitle.textContent.trim()) {
                        description = containerTitle.textContent.trim();
                    }
                }
            }
            
            // 8. Check page title as last resort if no other description found
            if (!description) {
                const ownerDoc = form.ownerDocument || document;
                if (ownerDoc.title && ownerDoc.title.length > 0 && ownerDoc.title !== "undefined") {
                    description = ownerDoc.title;
                }
            }
            
            return description;
        }

        /**
         * Find preceding element of given type near the form
         */
        findPrecedingElement(form, selector) {
            // Check immediate previous siblings
            let sibling = form.previousElementSibling;
            let count = 0;
            while (sibling && count < 5) { // Limit search to 5 preceding elements
                if (sibling.matches && sibling.matches(selector)) {
                    return sibling;
                }
                sibling = sibling.previousElementSibling;
                count++;
            }
            
            // Check parent's preceding siblings
            const parent = form.parentElement;
            if (parent) {
                sibling = parent.previousElementSibling;
                count = 0;
                while (sibling && count < 3) { // Limit search to 3 preceding parent siblings
                    const match = sibling.querySelector(selector);
                    if (match) {
                        return match;
                    }
                    sibling = sibling.previousElementSibling;
                    count++;
                }
            }
            
            return null;
        }        /**
         * Get the label text for a form field
         */
        getFieldLabel(field) {
            // Get the owner document (could be iframe document)
            const ownerDoc = field.ownerDocument || document;
            
            // Strategy 1: Associated label element by 'for' attribute
            if (field.id) {
                const label = ownerDoc.querySelector(`label[for="${field.id}"]`);
                if (label) {
                    return label.textContent.trim();
                }
            }

            // Strategy 2: Parent label element
            const parentLabel = field.closest("label");
            if (parentLabel) {
                return parentLabel.textContent.trim();
            }

            // Strategy 3: Previous sibling label
            let sibling = field.previousElementSibling;
            while (sibling) {
                if (sibling.tagName.toLowerCase() === "label") {
                    return sibling.textContent.trim();
                }
                sibling = sibling.previousElementSibling;
            }

            // Strategy 4: aria-label attribute
            if (field.getAttribute("aria-label")) {
                return field.getAttribute("aria-label");
            }

            // Strategy 5: aria-labelledby attribute
            const ariaLabelledBy = field.getAttribute("aria-labelledby");
            if (ariaLabelledBy) {
                // Try to find elements with matching IDs
                const labelIds = ariaLabelledBy.split(" ");
                const labelTexts = labelIds.map(id => {
                    const labelElement = ownerDoc.getElementById(id);
                    return labelElement ? labelElement.textContent.trim() : "";
                }).filter(text => text.length > 0);
                
                if (labelTexts.length > 0) {
                    return labelTexts.join(" ");
                }
            }

            // Strategy 6: Nearby text content
            const nearbyText = this.findNearbyText(field);
            if (nearbyText) {
                return nearbyText;
            }

            return "";
        }        /**
         * Find nearby text that might serve as a label
         */
        findNearbyText(element) {
            const container = element.closest("div, td, th, li, p") || element.parentElement;
            if (!container) return "";

            // Get the owner document (could be iframe document)
            const ownerDoc = element.ownerDocument || document;

            // Look for text nodes in the container
            const walker = ownerDoc.createTreeWalker(
                container,
                NodeFilter.SHOW_TEXT,
                null,
                false
            );

            const textNodes = [];
            let node;
            while ((node = walker.nextNode())) {
                const text = node.textContent.trim();
                if (text && text.length > 2 && text.length < 50) {
                    textNodes.push(text);
                }
            }

            return textNodes.length > 0 ? textNodes[0] : "";
        }

        /**
         * Generate a unique CSS selector for the element with enhanced strategies
         */
        generateSelector(element) {
            // Strategy 1: ID selector (most reliable)
            if (element.id) {
                return `#${CSS.escape(element.id)}`;
            }
            
            // Strategy 2: Name attribute
            if (element.name) {
                return `[name="${element.name}"]`;
            }
            
            // Strategy 3: Aria-labelledby (for Office forms)
            const ariaLabelledBy = element.getAttribute("aria-labelledby");
            if (ariaLabelledBy) {
                return `[aria-labelledby="${ariaLabelledBy}"]`;
            }
            
            // Strategy 4: Placeholder
            if (element.placeholder) {
                return `[placeholder="${element.placeholder}"]`;
            }

            // Strategy 5: Class-based selector
            let selector = element.tagName.toLowerCase();
            
            if (element.className) {
                const classes = element.className.split(" ").filter(c => 
                    c.trim() && 
                    !c.includes("focus") && 
                    !c.includes("error") && 
                    !c.includes("invalid") &&
                    c.length > 2
                );
                if (classes.length > 0) {
                    // Use most specific classes
                    const specificClasses = classes.filter(c => 
                        c.includes("textbox") || 
                        c.includes("input") || 
                        c.includes("field") ||
                        c.includes("form")
                    );
                    const classesToUse = specificClasses.length > 0 ? specificClasses.slice(0, 2) : classes.slice(0, 2);
                    selector += "." + classesToUse.map(c => CSS.escape(c)).join(".");
                }
            }

            // Strategy 6: Add type attribute for inputs
            if (element.type && element.tagName.toLowerCase() === "input") {
                selector += `[type="${element.type}"]`;
            }

            // Strategy 7: Add position if needed for uniqueness
            if (!element.id && !element.name && !ariaLabelledBy) {
                const siblings = Array.from(element.parentElement?.children || [])
                    .filter(el => el.tagName === element.tagName);
                
                if (siblings.length > 1) {
                    const index = siblings.indexOf(element) + 1;
                    selector += `:nth-of-type(${index})`;
                }
            }

            return selector;
        }

        /**
         * Generate XPath for the element with enhanced strategies
         */
        getXPath(element) {
            // Strategy 1: Use unique attributes first
            if (element.id) {
                return `//*[@id="${element.id}"]`;
            }
            
            const elementName = element.name || element.getAttribute("name");
            if (elementName) {
                return `//*[@name="${elementName}"]`;
            }
            
            // Strategy 2: Use aria-labelledby (common in Office forms)
            const ariaLabelledBy = element.getAttribute("aria-labelledby");
            if (ariaLabelledBy) {
                return `//*[@aria-labelledby="${ariaLabelledBy}"]`;
            }
            
            // Strategy 3: Use placeholder for unique identification
            if (element.placeholder) {
                return `//*[@placeholder="${element.placeholder}"]`;
            }
            
            // Strategy 4: Use class-based selection for consistent elements
            if (element.className) {
                const classes = element.className.split(" ").filter(c => 
                    c.trim() && 
                    !c.includes("focus") && 
                    !c.includes("error") && 
                    !c.includes("invalid") &&
                    !c.includes("dirty") &&
                    c.length > 2 // Avoid single-letter utility classes
                );
                if (classes.length > 0) {
                    // Use the most specific class that likely identifies the field type
                    const mainClass = classes.find(c => 
                        c.includes("textbox") || 
                        c.includes("input") || 
                        c.includes("field") ||
                        c.includes("form")
                    ) || classes[0];
                    
                    const tagName = element.tagName.toLowerCase();
                    return `//${tagName}[contains(@class, "${mainClass}")]`;
                }
            }
            
            // Strategy 5: Fallback to traditional path-based XPath
            const parts = [];
            let current = element;

            while (current && current.nodeType === Node.ELEMENT_NODE) {
                let part = current.tagName.toLowerCase();
                
                // Try to use unique attributes at each level
                if (current.id) {
                    part += `[@id="${current.id}"]`;
                    parts.unshift(part);
                    break;
                } else if (current.className) {
                    const classes = current.className.split(" ").filter(c => c.trim());
                    if (classes.length > 0) {
                        part += `[@class="${current.className}"]`;
                    }
                } else {
                    // Use position as last resort
                    const siblings = Array.from(current.parentElement?.children || [])
                        .filter(el => el.tagName === current.tagName);
                    
                    if (siblings.length > 1) {
                        const index = siblings.indexOf(current) + 1;
                        part += `[${index}]`;
                    }
                }
                
                parts.unshift(part);
                current = current.parentElement;
                
                // Limit depth to prevent overly long XPaths
                if (parts.length > 6) {
                    break;
                }
            }

            return "/" + parts.join("/");
        }

        /**
     * Get element bounding rectangle
     */
        getElementBounds(element) {
            try {
                const rect = element.getBoundingClientRect();
                return {
                    x: rect.x,
                    y: rect.y,
                    width: rect.width,
                    height: rect.height,
                    top: rect.top,
                    left: rect.left,
                    bottom: rect.bottom,
                    right: rect.right
                };
            } catch (error) {
                return {
                    x: 0, y: 0, width: 0, height: 0,
                    top: 0, left: 0, bottom: 0, right: 0
                };
            }
        }

        /**
     * Check if element is visible
     */
        isElementVisible(element) {
            const style = window.getComputedStyle(element);
            const rect = element.getBoundingClientRect();
        
            return (
                style.display !== "none" &&
            style.visibility !== "hidden" &&
            style.opacity !== "0" &&
            rect.width > 0 &&
            rect.height > 0
            );
        }

        /**
     * Check if field is editable
     */
        isFieldEditable(field) {
            // Check basic editability
            if (field.disabled || field.readOnly) {
                return false;
            }
            
            // Check field type
            if (field.type === "hidden") {
                return false;
            }
            
            // Check if field is functionally read-only (common patterns)
            const style = window.getComputedStyle(field);
            if (style.pointerEvents === "none" || style.display === "none") {
                return false;
            }
            
            // Check for common readonly class names
            const readonlyClassPatterns = ["readonly", "disabled", "non-editable", "view-only"];
            const className = field.className.toLowerCase();
            if (readonlyClassPatterns.some(pattern => className.includes(pattern))) {
                return false;
            }
            
            return true;
        }

        /**
         * Check if this is a valid form field for filling
         */
        isValidFormField(fieldInfo) {
            // Skip hidden, disabled, readonly fields
            if (!fieldInfo.visible || !fieldInfo.editable || fieldInfo.type === "hidden") {
                return false;
            }

            // Skip buttons and submit inputs
            if (["button", "submit", "reset", "image"].includes(fieldInfo.type)) {
                return false;
            }
            
            // Skip file inputs (cannot be filled programmatically for security reasons)
            if (fieldInfo.type === "file") {
                return false;
            }
            
            // Skip fields with display:none or visibility:hidden
            if (fieldInfo.boundingRect && (fieldInfo.boundingRect.width === 0 || fieldInfo.boundingRect.height === 0)) {
                return false;
            }

            // Skip fields that are too small (likely decorative or hidden)
            if (fieldInfo.boundingRect && (fieldInfo.boundingRect.width < 20 || fieldInfo.boundingRect.height < 15)) {
                return false;
            }
            
            // Skip fields with common non-fillable patterns in ID/name/class
            const identifier = `${fieldInfo.id} ${fieldInfo.name} ${fieldInfo.className}`.toLowerCase();
            const skipPatterns = [
                "captcha", "csrf", "token", "nonce", "timestamp", 
                "honeypot", "bot-check", "verification",
                "system", "internal", "debug", "test"
            ];
            
            if (skipPatterns.some(pattern => identifier.includes(pattern))) {
                return false;
            }

            return true;
        }

        /**
         * Get reason why a field was skipped (for debugging)
         */
        getSkipReason(fieldInfo) {
            const reasons = [];
            
            if (!fieldInfo.visible) reasons.push("not visible");
            if (!fieldInfo.editable) reasons.push("not editable");
            if (fieldInfo.type === "hidden") reasons.push("hidden type");
            if (["button", "submit", "reset", "image"].includes(fieldInfo.type)) reasons.push("button/submit type");
            if (fieldInfo.type === "file") reasons.push("file input");
            if (fieldInfo.boundingRect && (fieldInfo.boundingRect.width < 20 || fieldInfo.boundingRect.height < 15)) reasons.push("too small");
            
            const identifier = `${fieldInfo.id} ${fieldInfo.name} ${fieldInfo.className}`.toLowerCase();
            const skipPatterns = ["captcha", "csrf", "token", "nonce", "timestamp", "honeypot", "bot-check", "verification", "system", "internal", "debug", "test"];
            const matchedPattern = skipPatterns.find(pattern => identifier.includes(pattern));
            if (matchedPattern) reasons.push(`contains '${matchedPattern}'`);
            
            return reasons.join(", ");
        }

        /**
     * Categorize field based on its properties
     */
        categorizeField(fieldInfo) {
            const { type, name, id, label, placeholder } = fieldInfo;
            const text = (name + " " + id + " " + label + " " + placeholder).toLowerCase();

            // Date/time fields
            if (["date", "datetime-local", "time"].includes(type) ||
            /date|time|birth|born|created|updated|schedule|appointment|start|end|begin|finish|day|month|year|hour|minute|second/.test(text)) {
                return "datetime";
            }

            // Contact information
            if (type === "email" || /email|mail/.test(text)) return "email";
            if (type === "tel" || /phone|tel|mobile|contact/.test(text)) return "phone";

            // Personal information
            if (/name|title|姓名|名字|称呼/.test(text)) return "name";
            if (/department|dept|部门|科室/.test(text)) return "department";
            if (/position|job|title|职位|岗位/.test(text)) return "position";
            if (/address|location|地址|位置/.test(text)) return "location";

            // Work-related
            if (/work|job|task|project|assignment|duty|responsibility|工作|任务|项目|职责/.test(text)) return "work";
            if (/description|detail|note|comment|remark|说明|描述|备注|详情/.test(text)) return "description";

            // Generic categories
            if (type === "number" || /number|amount|quantity|count|数量|金额/.test(text)) return "number";
            if (type === "password") return "password";
            if (type === "file") return "file";
            if (fieldInfo.tagName === "select") return "select";
            if (fieldInfo.tagName === "textarea") return "description";

            return "text";
        }

        /**
     * Get total field count across all forms
     */
        getTotalFieldCount() {
            return this.formElements.reduce((total, form) => total + form.fields.length, 0);
        }

        /**
     * Get the detection result
     */
        getDetectionResult() {
            const result = {
                success: true,
                forms: this.formElements,
                summary: this.generateSummary(),
                fillableFields: this.getFillableFields(),
                timestamp: new Date().toISOString()
            };

            return result;
        }

        /**
     * Generate a summary of detected forms
     */
        generateSummary() {
            const categories = {};
            let visibleFields = 0;
            let editableFields = 0;
            let mainPageForms = 0;
            let iframeForms = 0;
            const iframePaths = new Set();

            this.formElements.forEach(form => {
                // Count forms by source
                if (form.source === "iframe") {
                    iframeForms++;
                    if (form.iframePath) iframePaths.add(form.iframePath);
                } else {
                    mainPageForms++;
                }
                
                form.fields.forEach(field => {
                    if (field.visible) visibleFields++;
                    if (field.editable) editableFields++;
                
                    categories[field.category] = (categories[field.category] || 0) + 1;
                });
            });

            return {
                totalForms: this.formElements.length,
                totalFields: this.formElements.reduce((total, form) => total + form.fields.length, 0),
                visibleFields,
                editableFields,
                categories,
                sources: {
                    mainPage: mainPageForms,
                    iframes: iframeForms,
                    uniqueIframes: iframePaths.size
                }
            };
        }

        /**
     * Get fillable fields only
     */
        getFillableFields() {
            const fillableFields = [];
        
            this.formElements.forEach(form => {
                form.fields.forEach(field => {
                    if (this.isValidFormField(field)) {
                        fillableFields.push({
                            ...field,
                            formId: form.id,
                            formType: form.type
                        });
                    }
                });
            });

            return fillableFields;
        }

        /**
         * Log detailed detection results
         */
        logSummaryResults() {
            if (this.formElements.length === 0) {
                console.log("❌ No forms detected");
                return;
            }

            // Count forms by source
            const mainForms = this.formElements.filter(f => f.source === "main");
            const iframeForms = this.formElements.filter(f => f.source === "iframe");
            
            console.log(`📊 Found: ${mainForms.length} main page, ${iframeForms.length} iframe form(s)`);
            
            // Only log iframe forms since they're more important
            if (iframeForms.length > 0) {
                iframeForms.forEach(form => {
                    console.log(`   🖼️ ${form.name || form.id} (${form.iframePath}): ${form.fields.length} fields`);
                });
            }
        }
    }

    // Export for use in content scripts
    window.FormDetector = FormDetector;

} // End of FormDetector existence check
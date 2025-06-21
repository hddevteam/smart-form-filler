// edge-extension/src/modules/formFiller.js
/**
 * Form Filler Module - Fills form fields with AI-generated data
 */

// Avoid redefinition
if (!window.FormFiller) {

    class FormFiller {
        constructor() {
            this.filledFields = new Map();
        }

        /**
         * Fill form fields with provided data
         * @param {Array} mappingData - Array of field mappings
         */
        fillFormFields(mappingData) {

            if (!Array.isArray(mappingData)) {
                console.error("❌ Invalid mapping data:", mappingData);
                return { success: false, error: "Invalid mapping data" };
            }

            let successCount = 0;
            let errorCount = 0;
            const errors = [];
            const successfullyFilled = [];
            const failedFields = [];

            mappingData.forEach((mapping, index) => {
                try {
                    // Handle different mapping data structures
                    let fieldInfo, value;
                    
                    if (mapping.field) {
                        // Old structure: mapping.field contains field info
                        fieldInfo = mapping.field;
                        value = mapping.value || mapping.suggestedValue;
                    } else if (mapping.fieldId) {
                        // New simplified structure: mapping.fieldId contains the field ID
                        fieldInfo = {
                            id: mapping.fieldId,
                            name: mapping.fieldName || mapping.fieldId,
                            xpath: mapping.xpath, // New: support xpath for precise targeting
                            selector: mapping.selector,
                            label: mapping.fieldLabel || mapping.fieldName,
                            title: mapping.fieldTitle,
                            source: mapping.fieldSource || mapping.source || "main",
                            iframePath: mapping.fieldIframePath || mapping.iframePath,
                            originalId: mapping.fieldOriginalId || mapping.originalId,
                            type: mapping.fieldType || mapping.type
                        };
                        value = mapping.suggestedValue || mapping.value; // New: support suggestedValue
                        
                        // Only log iframe fields for debugging
                        if (fieldInfo.source === "iframe") {
                        }
                    } else {
                        console.warn("⚠️ Invalid mapping structure:", mapping);
                        errorCount++;
                        failedFields.push({
                            fieldId: `field_${index}`,
                            error: "Invalid mapping structure",
                            mapping: mapping
                        });
                        errors.push(`Invalid mapping structure at index ${index}`);
                        return;
                    }
                    
                    const element = this.findElement(fieldInfo);
                    if (element && value !== undefined && value !== null) {
                        this.fillField(element, value, fieldInfo);
                        successCount++;
                        successfullyFilled.push({
                            fieldId: fieldInfo.id || fieldInfo.name,
                            fieldName: fieldInfo.name,
                            fieldLabel: fieldInfo.label,
                            value: value,
                            xpath: fieldInfo.xpath,
                            confidence: mapping.confidence
                        });
                    } else {
                        const error = `Field not found or no value: ${fieldInfo?.name || fieldInfo?.id || fieldInfo?.label || "unknown"}`;
                        console.warn("⚠️", error);
                        errorCount++;
                        failedFields.push({
                            fieldId: fieldInfo?.id || fieldInfo?.name || `field_${index}`,
                            fieldName: fieldInfo?.name,
                            fieldLabel: fieldInfo?.label,
                            error: error,
                            value: value
                        });
                        errors.push(error);
                    }
                } catch (error) {
                    console.error("❌ Error filling field:", error);
                    errorCount++;
                    const errorMsg = `Error filling field ${index}: ${error.message}`;
                    failedFields.push({
                        fieldId: `field_${index}`,
                        error: errorMsg,
                        originalError: error.message
                    });
                    errors.push(errorMsg);
                }
            });

            const result = {
                success: errorCount === 0,
                filled: successfullyFilled,
                failed: failedFields,
                skipped: [], // Currently no skipped logic, but may be added later
                totalProcessed: mappingData.length,
                successCount,
                errorCount,
                errors: errors.length > 0 ? errors : undefined
            };

            return result;
        }

        /**
         * Find form element by field info, supporting iframe context
         * @param {Object} fieldInfo - Field information including source and iframe path
         */
        findElement(fieldInfo) {
            if (!fieldInfo) return null;

            // Determine the document context based on field source
            const targetDoc = this.getTargetDocument(fieldInfo);
            if (!targetDoc) {
                console.warn("⚠️ Target document not accessible for field:", fieldInfo);
                return null;
            }

            let element = null;

            // Try different strategies to find the element in the target document
            const strategies = [
                // Strategy 1: By name attribute (most reliable for nested forms)
                () => {
                    let nameToSearch = fieldInfo.name;
                    
                    // If name is empty but XPath contains name, extract it
                    if (!nameToSearch && fieldInfo.xpath && fieldInfo.xpath.includes("@name=")) {
                        const nameMatch = fieldInfo.xpath.match(/@name="([^"]+)"/);
                        if (nameMatch) {
                            nameToSearch = nameMatch[1];
                        }
                    }
                    
                    if (!nameToSearch) return null;
                    
                    const element = targetDoc.querySelector(`[name="${nameToSearch}"]`);
                    return element;
                },
                // Strategy 2: By XPath (if available)
                () => {
                    if (!fieldInfo.xpath) return null;
                    const element = this.getElementByXPath(fieldInfo.xpath, targetDoc);
                    if (!element) {
                        console.warn(`❌ XPath failed: ${fieldInfo.xpath}`);
                    }
                    return element;
                },
                // Strategy 3: By aria-labelledby (Office forms)
                () => fieldInfo.ariaLabelledBy ? targetDoc.querySelector(`[aria-labelledby="${fieldInfo.ariaLabelledBy}"]`) : null,
                // Strategy 4: By placeholder
                () => fieldInfo.placeholder ? targetDoc.querySelector(`[placeholder="${fieldInfo.placeholder}"]`) : null,
                // Strategy 5: By original ID (not our generated ID)
                () => {
                    if (fieldInfo.originalId) {
                        return targetDoc.getElementById(fieldInfo.originalId);
                    }
                    return null;
                },
                // Strategy 6: By selector (if available and adjusted for target doc)
                () => {
                    if (!fieldInfo.selector) return null;
                    try {
                        return targetDoc.querySelector(fieldInfo.selector);
                    } catch (error) {
                        return null;
                    }
                },
                // Strategy 7: By escaped ID selector
                () => {
                    if (!fieldInfo.id) return null;
                    try {
                        const escapedId = CSS.escape(fieldInfo.id);
                        return targetDoc.querySelector(`#${escapedId}`);
                    } catch (error) {
                        return null;
                    }
                },
                // Strategy 8: By class combination (for similar fields)
                () => {
                    if (!fieldInfo.className) return null;
                    const classes = fieldInfo.className.split(" ").filter(c => 
                        c.trim() && 
                        !c.includes("focus") && 
                        !c.includes("error") &&
                        c.length > 3
                    );
                    if (classes.length > 0) {
                        const mainClass = classes.find(c => 
                            c.includes("textbox") || 
                            c.includes("input") || 
                            c.includes("field")
                        ) || classes[0];
                        return targetDoc.querySelector(`${fieldInfo.tagName}[class*="${mainClass}"]`);
                    }
                    return null;
                },
                // Strategy 9: By label text (find input associated with label)
                () => {
                    if (!fieldInfo.label) return null;
                    const labels = Array.from(targetDoc.querySelectorAll("label"));
                    const label = labels.find(l => 
                        l.textContent.trim().includes(fieldInfo.label.trim())
                    );
                    if (label) {
                        const forAttr = label.getAttribute("for");
                        if (forAttr) return targetDoc.getElementById(forAttr);
                        const input = label.querySelector("input, textarea, select");
                        if (input) return input;
                    }
                    return null;
                }
            ];

            for (let i = 0; i < strategies.length; i++) {
                try {
                    element = strategies[i]();
                    if (element) {
                        break;
                    }
                } catch (error) {
                    // Silent failure for strategies
                }
            }

            if (!element) {
                console.warn("⚠️ Element not found:", fieldInfo?.name || fieldInfo?.id);
                
                // Only show detailed debug for iframe fields
                if (fieldInfo.source === "iframe") {
                    console.warn("🖼️ Iframe field debug:", {
                        iframePath: fieldInfo.iframePath,
                        xpath: fieldInfo.xpath,
                        targetDoc: targetDoc.location?.href || "iframe document"
                    });
                }
            }

            return element;
        }

        /**
         * Get the target document based on field source information
         * @param {Object} fieldInfo - Field information with source and iframe path
         * @returns {Document|null} The target document or null if not accessible
         */
        getTargetDocument(fieldInfo) {
            // If field is from main page, use main document
            if (!fieldInfo.source || fieldInfo.source === "main") {
                return document;
            }
            
            // If field is from iframe, find the iframe document
            if (fieldInfo.source === "iframe" && fieldInfo.iframePath) {
                try {
                    const iframeDoc = this.getIframeDocument(fieldInfo.iframePath);
                    if (!iframeDoc) {
                        console.warn("❌ Failed to get iframe document:", fieldInfo.iframePath);
                    }
                    return iframeDoc;
                } catch (error) {
                    console.warn("⚠️ Cannot access iframe document:", fieldInfo.iframePath);
                    return null;
                }
            }
            
            return document;
        }

        /**
         * Get iframe document by iframe path
         * @param {string} iframePath - Path like "iframe-1" or "iframe-1.1.0"
         * @returns {Document|null} The iframe document or null if not accessible
         */
        getIframeDocument(iframePath) {
            if (!iframePath) {
                
                return null;
            }
            
            
            // Parse iframe path (e.g., "iframe-1.1.0" means first iframe, then its second iframe, then its first iframe)
            const pathParts = iframePath.split(".");
            console.log(`📂 Path parts: ${pathParts.join(" -> ")}`);
            
            let currentDoc = document;
            
            for (let i = 0; i < pathParts.length; i++) {
                const part = pathParts[i];
                
                let iframeIndex;
                
                // Handle different path part formats
                if (part.startsWith("iframe-")) {
                    // Extract iframe index from part like "iframe-1"
                    const match = part.match(/iframe-(\d+)/);
                    if (!match) {
                        console.warn("⚠️ Invalid iframe path part:", part);
                        return null;
                    }
                    iframeIndex = parseInt(match[1]);
                    console.log(`🎯 Parsed iframe index from ${part}: ${iframeIndex}`);
                } else if (/^\d+$/.test(part)) {
                    // Pure number like "1" or "0" (for nested iframes)
                    iframeIndex = parseInt(part);
                    console.log(`🔢 Parsed numeric iframe index: ${iframeIndex} from part: ${part}`);
                } else {
                    console.warn("⚠️ Invalid iframe path part:", part);
                    return null;
                }
                
                const iframes = currentDoc.querySelectorAll("iframe");
                
                if (iframeIndex >= iframes.length) {
                    console.warn("⚠️ Iframe index out of bounds:", iframeIndex, "total:", iframes.length);
                    console.log("📋 Available iframes:", Array.from(iframes).map((iframe, idx) => `${idx}: ${iframe.src || iframe.id || "no-src"}`));
                    return null;
                }
                
                const iframe = iframes[iframeIndex];
                console.log(`🎯 Selected iframe ${iframeIndex}:`, iframe.src || iframe.id || "about:blank");
                
                // Check if iframe is accessible
                try {
                    const iframeDoc = iframe.contentDocument || iframe.contentWindow.document;
                    if (!iframeDoc) {
                        console.warn("⚠️ Cannot access iframe document:", part, "- iframe may not be loaded yet");
                        return null;
                    }
                    
                    // Verify accessibility by trying to access domain
                    iframeDoc.domain;
                    
                    currentDoc = iframeDoc;
                } catch (error) {
                    console.warn("⚠️ Cross-origin or inaccessible iframe:", part, error.message);
                    return null;
                }
            }
            
            
            return currentDoc;
        }

        /**
         * Fill a single field with value
         * @param {HTMLElement} element - The form element
         * @param {*} value - The value to fill
         * @param {Object} fieldInfo - Field information
         */
        fillField(element, value, fieldInfo) {
            if (!element) return;

            const tagName = element.tagName.toLowerCase();
            const type = element.type || tagName;

            try {
                switch (tagName) {
                case "input":
                    this.fillInputField(element, value, type);
                    break;
                case "textarea":
                    this.fillTextArea(element, value);
                    break;
                case "select":
                    this.fillSelectField(element, value);
                    break;
                default:
                    console.warn("⚠️ Unsupported field type:", tagName);
                }

                // Store filled field info
                this.filledFields.set(element, { value, fieldInfo });

                // Trigger change events
                this.triggerChangeEvents(element);


            } catch (error) {
                console.error("❌ Error filling field:", error);
                throw error;
            }
        }

        /**
         * Fill input field based on type
         */
        fillInputField(element, value, type) {
            switch (type) {
            case "checkbox":
                element.checked = Boolean(value);
                break;
            case "radio":
                // For radio buttons, find the one with matching value
                if (element.value === String(value)) {
                    element.checked = true;
                }
                break;
            case "file":
                // File inputs cannot be programmatically set for security reasons
                
                break;
            default:
                element.value = String(value);
            }
        }

        /**
         * Fill textarea field
         */
        fillTextArea(element, value) {
            element.value = String(value);
        }

        /**
         * Fill select field
         */
        fillSelectField(element, value) {
            const valueStr = String(value);
            let optionFound = false;

            // Try to find exact match first
            for (let option of element.options) {
                if (option.value === valueStr || option.text === valueStr) {
                    option.selected = true;
                    optionFound = true;
                    break;
                }
            }

            // If no exact match, try partial match on text
            if (!optionFound) {
                for (let option of element.options) {
                    if (option.text.toLowerCase().includes(valueStr.toLowerCase())) {
                        option.selected = true;
                        optionFound = true;
                        break;
                    }
                }
            }

            if (!optionFound) {
                console.warn("⚠️ No matching option found for value:", value);
            }
        }

        /**
         * Clear all filled values
         */
        clearAllFields() {
            console.log("🧹 Clearing all filled fields...");

            // Clear filled fields
            this.filledFields.forEach((data, element) => {
                try {
                    const tagName = element.tagName.toLowerCase();
                    const type = element.type || tagName;

                    switch (tagName) {
                    case "input":
                        if (type === "checkbox" || type === "radio") {
                            element.checked = false;
                        } else if (type !== "file") {
                            element.value = "";
                        }
                        break;
                    case "textarea":
                        element.value = "";
                        break;
                    case "select":
                        element.selectedIndex = 0;
                        break;
                    }

                    // Trigger change events
                    this.triggerChangeEvents(element);

                } catch (error) {
                    console.error("❌ Error clearing field:", error);
                }
            });

            this.filledFields.clear();
            
        }

        /**
         * Trigger change and input events
         */
        triggerChangeEvents(element) {
            const events = ["input", "change", "blur"];
            events.forEach(eventType => {
                try {
                    const event = new Event(eventType, { bubbles: true, cancelable: true });
                    element.dispatchEvent(event);
                } catch (error) {
                    console.warn(`⚠️ Could not trigger ${eventType} event:`, error);
                }
            });
        }

        /**
         * Get element by XPath in the specified document
         * @param {string} xpath - XPath expression
         * @param {Document} targetDoc - Target document (defaults to main document)
         * @returns {Element|null} Found element or null
         */
        getElementByXPath(xpath, targetDoc = document) {
            try {
                const result = targetDoc.evaluate(
                    xpath,
                    targetDoc,
                    null,
                    XPathResult.FIRST_ORDERED_NODE_TYPE,
                    null
                );
                return result.singleNodeValue;
            } catch (error) {
                console.warn("⚠️ XPath evaluation failed:", error);
                return null;
            }
        }

        /**
         * Get current filled data
         */
        getFilledData() {
            const filledData = [];
            this.filledFields.forEach((data, element) => {
                filledData.push({
                    element: element,
                    value: data.value,
                    fieldInfo: data.fieldInfo
                });
            });
            return filledData;
        }
    }

    // Make FormFiller available globally
    window.FormFiller = FormFiller;
    console.log("📋 FormFiller class defined and available globally");

}

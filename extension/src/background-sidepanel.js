/* global chrome */
// Background service worker for Edge Extension - Side Panel Version

// Open side panel when extension icon is clicked
chrome.action.onClicked.addListener((tab) => {
    chrome.sidePanel.open({ tabId: tab.id });
});

// Set up side panel for all tabs
chrome.runtime.onInstalled.addListener(() => {
    console.log("Extension installed - side panel ready");
    
    // Set default settings
    chrome.storage.sync.set({
        selectedModel: "gpt-4",
        autoSummaryEnabled: false,
        summaryLength: "medium"
    });
});

// Handle extension startup
chrome.runtime.onStartup.addListener(() => {
    console.log("Extension started - side panel ready");
});

// Handle messages from side panel and content scripts
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    console.log("Background received message:", message);
    
    switch (message.action) {
    case "extractPageContent":
        handlePageContentExtraction(message, sender, sendResponse);
        break;
            
    case "checkAuth":
        handleAuthCheck(message, sender, sendResponse);
        break;
            
    default:
        console.log("Unknown message action:", message.action);
    }
    
    return true; // Keep message channel open for async responses
});

async function handlePageContentExtraction(message, sender, sendResponse) {
    try {
        // Get the active tab
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        
        if (!tab) {
            sendResponse({ error: "No active tab found" });
            return;
        }
        
        // Inject content script and extract content
        const results = await chrome.scripting.executeScript({
            target: { tabId: tab.id },
            function: extractPageContent
        });
        
        if (results && results[0]) {
            sendResponse({ content: results[0].result });
        } else {
            sendResponse({ error: "Failed to extract content" });
        }
    } catch (error) {
        console.error("Content extraction error:", error);
        sendResponse({ error: error.message });
    }
}

async function handleAuthCheck(message, sender, sendResponse) {
    try {
        // In development mode, always return true
        // In production, this would check actual auth status
        sendResponse({ isAuthenticated: true, mode: "development" });
    } catch (error) {
        console.error("Auth check error:", error);
        sendResponse({ isAuthenticated: false, error: error.message });
    }
}

// Function to inject into page for content extraction
function extractPageContent() {
    // Remove script and style elements
    const scripts = document.querySelectorAll("script, style, noscript");
    scripts.forEach(el => el.remove());
    
    // Get main content areas
    const contentSelectors = [
        "main",
        "article", 
        ".content",
        ".post",
        ".entry",
        "#content",
        "#main"
    ];
    
    let content = "";
    
    // Try to find main content area
    for (const selector of contentSelectors) {
        const element = document.querySelector(selector);
        if (element) {
            content = element.innerText;
            break;
        }
    }
    
    // Fallback to body content
    if (!content) {
        content = document.body.innerText;
    }
    
    // Clean up the content
    content = content
        .replace(/\s+/g, " ")
        .replace(/\n\s*\n/g, "\n")
        .trim();
    
    return {
        title: document.title,
        url: window.location.href,
        content: content,
        length: content.length
    };
}

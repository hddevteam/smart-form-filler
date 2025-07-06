// Language detection and redirect script
(function() {
    // Only run on the main index page
    if (window.location.pathname.endsWith('/') || window.location.pathname.endsWith('/index.html')) {
        // Get browser language
        const userLang = navigator.language || navigator.userLanguage;
        
        // Check if user prefers Chinese
        if (userLang.startsWith('zh') && !window.location.search.includes('lang=en')) {
            // Check if we're not already on the Chinese page
            if (!window.location.pathname.includes('index-zh.html')) {
                // Redirect to Chinese version
                window.location.href = './index-zh.html';
                return;
            }
        }
    }
})();

/* global chrome */
// Authentication Manager for Edge Extension
class AuthManager {
    constructor() {
        this.baseUrl = this.getBaseUrl();
        this.tokenKey = "azure_chatgpt_token";
        this.userKey = "azure_chatgpt_user";
    }

    getBaseUrl() {
        // For development, always use localhost
        // In production builds, this should be changed to the production URL
        return "http://localhost:3000";
    }

    async checkAuthStatus() {
        try {
            const stored = await this.getStoredAuth();
            if (!stored.token) {
                return false;
            }

            // Verify token with backend
            const isValid = await this.verifyToken(stored.token);
            if (!isValid) {
                await this.clearStoredAuth();
                return false;
            }

            return true;
        } catch (error) {
            console.error("Auth status check failed:", error);
            return false;
        }
    }

    async verifyToken(token) {
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 3000); // 3 second timeout
            
            const response = await fetch(`${this.baseUrl}/auth/verify`, {
                method: "GET",
                headers: {
                    "Authorization": `Bearer ${token}`,
                    "Content-Type": "application/json"
                },
                signal: controller.signal
            });

            clearTimeout(timeoutId);
            return response.ok;
        } catch (error) {
            console.error("Token verification failed:", error);
            return false;
        }
    }

    async login() {
        return new Promise((resolve, reject) => {
            // Open authentication popup
            const authUrl = `${this.baseUrl}/auth/signin`;
            const popup = window.open(
                authUrl,
                "azure_auth",
                "width=500,height=600,scrollbars=yes,resizable=yes"
            );

            // Listen for authentication completion
            const checkAuth = setInterval(async () => {
                try {
                    // Check if popup is closed
                    if (popup.closed) {
                        clearInterval(checkAuth);
                        
                        // Check if authentication was successful
                        const authResult = await this.checkAuthStatus();
                        if (authResult) {
                            resolve(authResult);
                        } else {
                            reject(new Error("Authentication failed or was cancelled"));
                        }
                        return;
                    }

                    // Try to communicate with popup
                    try {
                        const url = popup.location.href;
                        if (url.includes("/auth/callback") || url.includes("access_token")) {
                            // Handle callback
                            await this.handleAuthCallback(url);
                            popup.close();
                            clearInterval(checkAuth);
                            resolve(true);
                        }
                    } catch (e) {
                        // Cross-origin restrictions - expected
                    }
                } catch (error) {
                    clearInterval(checkAuth);
                    popup.close();
                    reject(error);
                }
            }, 1000);

            // Timeout after 5 minutes
            setTimeout(() => {
                clearInterval(checkAuth);
                if (!popup.closed) {
                    popup.close();
                }
                reject(new Error("Authentication timeout"));
            }, 300000);
        });
    }

    async handleAuthCallback(url) {
        // Extract token from callback URL or communicate with backend
        const urlParams = new URLSearchParams(new URL(url).search);
        const token = urlParams.get("access_token");
        const userParam = urlParams.get("user");
        
        if (token) {
            const user = userParam ? JSON.parse(decodeURIComponent(userParam)) : null;
            await this.storeAuth(token, user);
            return true;
        }
        
        // Fallback - try to get from localStorage (if popup stored it)
        return new Promise((resolve) => {
            setTimeout(() => {
                try {
                    // Check if auth success page stored token
                    const storedToken = localStorage.getItem("ext_token");
                    const storedUser = localStorage.getItem("ext_user");
                    
                    if (storedToken) {
                        const user = storedUser ? JSON.parse(storedUser) : null;
                        this.storeAuth(storedToken, user).then(() => {
                            localStorage.removeItem("ext_token");
                            localStorage.removeItem("ext_user");
                            resolve(true);
                        });
                    } else {
                        resolve(false);
                    }
                } catch (error) {
                    console.error("Auth callback handling error:", error);
                    resolve(false);
                }
            }, 500);
        });
    }

    async getStoredAuth() {
        return new Promise((resolve) => {
            chrome.storage.local.get([this.tokenKey, this.userKey], (result) => {
                resolve({
                    token: result[this.tokenKey],
                    user: result[this.userKey]
                });
            });
        });
    }

    async storeAuth(token, user) {
        return new Promise((resolve) => {
            chrome.storage.local.set({
                [this.tokenKey]: token,
                [this.userKey]: user
            }, resolve);
        });
    }

    async clearStoredAuth() {
        return new Promise((resolve) => {
            chrome.storage.local.remove([this.tokenKey, this.userKey], resolve);
        });
    }

    async getAuthToken() {
        const stored = await this.getStoredAuth();
        return stored.token;
    }

    async logout() {
        await this.clearStoredAuth();
        // Optionally notify backend
        try {
            const token = await this.getAuthToken();
            if (token) {
                await fetch(`${this.baseUrl}/auth/logout`, {
                    method: "POST",
                    headers: {
                        "Authorization": `Bearer ${token}`,
                        "Content-Type": "application/json"
                    }
                });
            }
        } catch (error) {
            console.error("Logout notification failed:", error);
        }
    }
}

// Export for use in extension
window.AuthManager = AuthManager;

// Demo Page JavaScript

class DemoManager {
    constructor() {
        this.currentStep = 'intro';
        this.extractedData = null;
        this.init();
    }

    init() {
        this.bindNavigation();
        this.bindDemoActions(); 
        this.bindChatActions();
        this.bindFormActions();
    }

    bindNavigation() {
        const navButtons = document.querySelectorAll('.nav-btn');
        navButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                const step = btn.dataset.step;
                this.switchToStep(step);
            });
        });
    }

    switchToStep(step) {
        // Update navigation
        document.querySelectorAll('.nav-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        document.querySelector(`[data-step="${step}"]`).classList.add('active');

        // Update content
        document.querySelectorAll('.demo-step').forEach(section => {
            section.classList.remove('active');
        });
        document.getElementById(step).classList.add('active');

        this.currentStep = step;
    }

    bindDemoActions() {
        // Data extraction demo
        const extractBtn = document.getElementById('extractDataBtn');
        if (extractBtn) {
            extractBtn.addEventListener('click', () => {
                this.simulateDataExtraction();
            });
        }
    }

    simulateDataExtraction() {
        const btn = document.getElementById('extractDataBtn');
        const originalText = btn.innerHTML;
        
        // Show loading state
        btn.innerHTML = '⏳ Extracting...';
        btn.disabled = true;

        // Simulate extraction process
        setTimeout(() => {
            this.extractedData = {
                name: 'John Smith',
                firstName: 'John',
                lastName: 'Smith',
                email: 'john.smith@techcorp.com',
                phone: '+1 (555) 123-4567',
                company: 'TechCorp Solutions',
                jobTitle: 'Senior Software Engineer',
                location: 'San Francisco, CA',
                department: 'engineering',
                employeeId: 'EMP-2024-001',
                startDate: 'January 15, 2020',
                // Restaurant feedback specific data
                visitDate: '2024-01-20',
                partySize: '2',
                overallRating: '5',
                foodQuality: 'excellent',
                serviceQuality: 'excellent',
                favoriteItem: 'Seafood Linguine with marinara sauce',
                feedbackComments: 'Had an absolutely wonderful dining experience! The seafood linguine was perfectly cooked and the marinara sauce was authentic and flavorful. Our server was attentive without being intrusive, and the romantic ambiance made for a perfect date night. The wine selection was excellent and reasonably priced. Will definitely be returning and highly recommend to friends!',
                recommendToFriends: 'definitely'
            };

            // Show success state
            btn.innerHTML = '✅ Data Extracted!';
            btn.style.background = '#10b981';

            // Show extracted data notification
            this.showNotification('success', 'Data successfully extracted! You can now use it for form filling and chat.');

            // Reset button after delay
            setTimeout(() => {
                btn.innerHTML = originalText;
                btn.disabled = false;
                btn.style.background = '';
            }, 3000);
        }, 2000);
    }

    bindFormActions() {
        const fillBtn = document.getElementById('fillFormBtn');
        const clearBtn = document.getElementById('clearFormBtn');
        const form = document.getElementById('feedbackForm');

        if (fillBtn) {
            fillBtn.addEventListener('click', () => {
                this.simulateFormFilling();
            });
        }

        if (clearBtn) {
            clearBtn.addEventListener('click', () => {
                this.clearForm();
            });
        }

        if (form) {
            form.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handleFormSubmit();
            });
        }
    }

    simulateFormFilling() {
        if (!this.extractedData) {
            this.showNotification('warning', 'Please extract data first from the Data Extraction tab!');
            return;
        }

        const btn = document.getElementById('fillFormBtn');
        const originalText = btn.innerHTML;
        
        // Show loading state
        btn.innerHTML = '⏳ Filling...';
        btn.disabled = true;

        // Simulate form filling with animation
        setTimeout(() => {
            this.fillFormWithAnimation();
            
            // Show success state
            btn.innerHTML = '✅ Form Filled!';
            btn.style.background = '#10b981';

            this.showNotification('success', 'Form successfully filled with extracted data!');

            // Reset button after delay
            setTimeout(() => {
                btn.innerHTML = originalText;
                btn.disabled = false;
                btn.style.background = '';
            }, 3000);
        }, 1500);
    }

    fillFormWithAnimation() {
        const fields = [
            { id: 'customerName', value: this.extractedData.name, delay: 0 },
            { id: 'customerEmail', value: this.extractedData.email, delay: 200 },
            { id: 'customerPhone', value: this.extractedData.phone, delay: 400 },
            { id: 'visitDate', value: this.extractedData.visitDate, delay: 600 },
            { id: 'partySize', value: this.extractedData.partySize, delay: 800 },
            { id: 'overallRating', value: this.extractedData.overallRating, delay: 1000 },
            { id: 'foodQuality', value: this.extractedData.foodQuality, delay: 1200 },
            { id: 'serviceQuality', value: this.extractedData.serviceQuality, delay: 1400 },
            { id: 'favoriteItem', value: this.extractedData.favoriteItem, delay: 1600 },
            { id: 'feedbackComments', value: this.extractedData.feedbackComments, delay: 1800 }
        ];

        fields.forEach(field => {
            setTimeout(() => {
                const element = document.getElementById(field.id);
                if (element) {
                    if (element.tagName === 'SELECT') {
                        this.selectOptionWithAnimation(element, field.value);
                    } else if (element.tagName === 'TEXTAREA') {
                        this.typeTextArea(element, field.value);
                    } else {
                        this.typeText(element, field.value);
                    }
                }
            }, field.delay);
        });

        // Handle radio button separately
        setTimeout(() => {
            const radioButton = document.querySelector(`input[name="recommendToFriends"][value="${this.extractedData.recommendToFriends}"]`);
            if (radioButton) {
                radioButton.checked = true;
                radioButton.parentElement.style.background = '#dbeafe';
                setTimeout(() => {
                    radioButton.parentElement.style.background = '';
                }, 1000);
            }
        }, 2000);
    }

    selectOptionWithAnimation(selectElement, value) {
        selectElement.focus();
        selectElement.style.background = '#dbeafe';
        
        setTimeout(() => {
            selectElement.value = value;
            selectElement.style.background = '';
            selectElement.blur();
        }, 500);
    }

    typeTextArea(element, text) {
        element.value = '';
        element.focus();
        element.style.background = '#dbeafe';
        
        let i = 0;
        const typeInterval = setInterval(() => {
            if (i < text.length) {
                element.value += text.charAt(i);
                element.scrollTop = element.scrollHeight; // Auto scroll
                i++;
            } else {
                clearInterval(typeInterval);
                element.style.background = '';
                element.blur();
            }
        }, 30); // Slower for textarea to be readable
    }

    typeText(element, text) {
        element.value = '';
        element.focus();
        element.style.background = '#dbeafe';
        
        let i = 0;
        const typeInterval = setInterval(() => {
            if (i < text.length) {
                element.value += text.charAt(i);
                i++;
            } else {
                clearInterval(typeInterval);
                element.style.background = '';
                element.blur();
            }
        }, 50);
    }

    clearForm() {
        const form = document.getElementById('feedbackForm');
        if (form) {
            form.reset();
            this.showNotification('info', 'Form cleared successfully!');
        }
    }

    handleFormSubmit() {
        this.showNotification('success', 'Form submitted successfully! (This is a demo - no actual submission)');
    }

    bindChatActions() {
        const sendBtn = document.getElementById('sendChatBtn');
        const chatInput = document.getElementById('chatInput');
        const questionBtns = document.querySelectorAll('.question-btn');

        if (sendBtn) {
            sendBtn.addEventListener('click', () => {
                this.sendChatMessage();
            });
        }

        if (chatInput) {
            chatInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    this.sendChatMessage();
                }
            });
        }

        questionBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                const question = btn.dataset.question;
                chatInput.value = question;
                this.sendChatMessage();
            });
        });
    }

    sendChatMessage() {
        const input = document.getElementById('chatInput');
        const message = input.value.trim();
        
        if (!message) return;

        if (!this.extractedData) {
            this.addChatMessage('system', '⚠️ Please extract data first from the Data Extraction tab to enable chat functionality!');
            input.value = '';
            return;
        }

        // Add user message
        this.addChatMessage('user', message);
        input.value = '';

        // Simulate AI response
        setTimeout(() => {
            const response = this.generateAIResponse(message);
            this.addChatMessage('assistant', response);
        }, 1000);
    }

    addChatMessage(type, content) {
        const messagesContainer = document.getElementById('chatMessages');
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${type}`;

        const time = new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
        
        messageDiv.innerHTML = `
            <div class="message-content">
                <p>${content}</p>
            </div>
            <div class="message-time">${time}</div>
        `;

        messagesContainer.appendChild(messageDiv);
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }

    generateAIResponse(question) {
        const q = question.toLowerCase();
        
        if (q.includes('name') && q.includes('title')) {
            return `📋 The person's name is ${this.extractedData.name} and they work as a ${this.extractedData.jobTitle} at ${this.extractedData.company}.`;
        }
        
        if (q.includes('contact')) {
            return `📞 Contact information available:\n• Email: ${this.extractedData.email}\n• Phone: ${this.extractedData.phone}\n• Location: ${this.extractedData.location}`;
        }
        
        if (q.includes('company')) {
            return `🏢 ${this.extractedData.name} works for ${this.extractedData.company} in the ${this.extractedData.department} department.`;
        }
        
        if (q.includes('summary') || q.includes('key information')) {
            return `📋 Key Information Summary:\n• Name: ${this.extractedData.name}\n• Position: ${this.extractedData.jobTitle}\n• Company: ${this.extractedData.company}\n• Department: ${this.extractedData.department}\n• Contact: ${this.extractedData.email}\n• Location: ${this.extractedData.location}`;
        }
        
        // Default response
        return `🤖 I can help you analyze the extracted data about ${this.extractedData.name}. You can ask me about their contact information, professional background, or request a summary of the key details.`;
    }

    showNotification(type, message) {
        // Remove existing notifications
        const existing = document.querySelector('.demo-notification');
        if (existing) {
            existing.remove();
        }

        // Create notification
        const notification = document.createElement('div');
        notification.className = `demo-notification demo-notification--${type}`;
        
        const icons = {
            success: '✅',
            warning: '⚠️',
            error: '❌',
            info: 'ℹ️'
        };
        
        notification.innerHTML = `
            <div class="notification-content">
                <span class="notification-icon">${icons[type]}</span>
                <span class="notification-message">${message}</span>
            </div>
        `;

        // Add styles
        Object.assign(notification.style, {
            position: 'fixed',
            top: '20px',
            right: '20px',
            background: type === 'success' ? '#10b981' : 
                       type === 'warning' ? '#f59e0b' :
                       type === 'error' ? '#ef4444' : '#3b82f6',
            color: 'white',
            padding: '1rem 1.5rem',
            borderRadius: '8px',
            boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
            zIndex: '1000',
            transform: 'translateX(100%)',
            transition: 'transform 0.3s ease'
        });

        document.body.appendChild(notification);

        // Animate in
        setTimeout(() => {
            notification.style.transform = 'translateX(0)';
        }, 100);

        // Auto remove
        setTimeout(() => {
            notification.style.transform = 'translateX(100%)';
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.remove();
                }
            }, 300);
        }, 5000);
    }
}

// Initialize demo when page loads
document.addEventListener('DOMContentLoaded', () => {
    new DemoManager();
    
    // Add some demo data to chat on load
    setTimeout(() => {
        const chatMessages = document.getElementById('chatMessages');
        if (chatMessages) {
            // Initial system message is already in HTML
            console.log('Demo page loaded successfully!');
        }
    }, 500);
});

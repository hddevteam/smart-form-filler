// 演示页面 JavaScript - 模块化版本

// 导入模块 (注意：在实际环境中，这些需要通过模块系统导入)
// 由于演示页面使用传统的脚本加载方式，我们将模块直接包含在这里

// 主演示管理器
class DemoManager {
    constructor() {
        this.extractedData = null;
        this.init();
    }

    init() {
        // 首先初始化UI修复工具
        this.initializeUIFixes();
        
        // 初始化所有管理器
        this.navigationManager = new NavigationManager();
        this.notificationManager = new NotificationManager();
        this.dataExtractionManager = new DataExtractionManager(this);
        this.formManager = new FormManager(this);
        this.chatManager = new ChatManager(this);
        this.copyManager = new CopyManager();

        console.log('🚀 演示页面已初始化，所有模块已加载');
    }

    // 初始化UI修复
    initializeUIFixes() {
        // 加载UI工具脚本
        this.loadUIUtils().then(() => {
            console.log('✅ UI修复工具已加载');
        }).catch((error) => {
            console.warn('⚠️ UI修复工具加载失败:', error);
        });
    }

    // 动态加载UI工具
    async loadUIUtils() {
        try {
            // 如果UIUtils还没有被定义，动态加载它
            if (typeof UIUtils === 'undefined') {
                const script = document.createElement('script');
                script.src = 'modules/uiUtils.js';
                script.type = 'module';
                document.head.appendChild(script);
                
                // 等待脚本加载
                await new Promise((resolve, reject) => {
                    script.onload = resolve;
                    script.onerror = reject;
                });
            }
        } catch (error) {
            console.warn('UIUtils加载失败，使用内联修复方案');
            this.applyInlineFixes();
        }
    }

    // 内联修复方案（fallback）
    applyInlineFixes() {
        setTimeout(() => {
            // 修复图片问题
            const profileAvatar = document.querySelector('.profile-avatar');
            if (profileAvatar) {
                const img = profileAvatar.querySelector('img');
                if (img && !img.complete) {
                    img.addEventListener('error', () => {
                        profileAvatar.innerHTML = 'JS';
                        profileAvatar.style.display = 'flex';
                        profileAvatar.style.alignItems = 'center';
                        profileAvatar.style.justifyContent = 'center';
                        profileAvatar.style.fontSize = '1.5rem';
                        profileAvatar.style.color = 'white';
                    });
                }
            }
            
            console.log('✅ 内联UI修复已应用');
        }, 100);
    }

    // 获取当前步骤
    getCurrentStep() {
        return this.navigationManager.getCurrentStep();
    }

    // 显示通知（代理到 NotificationManager）
    showNotification(type, message) {
        this.notificationManager.showNotification(type, message);
    }
}

// 导航管理器
class NavigationManager {
    constructor() {
        this.currentStep = 'intro';
        this.bindNavigation();
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
        // 更新导航
        document.querySelectorAll('.nav-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        document.querySelector(`[data-step="${step}"]`).classList.add('active');

        // 更新内容
        document.querySelectorAll('.demo-step').forEach(section => {
            section.classList.remove('active');
        });
        document.getElementById(step).classList.add('active');

        this.currentStep = step;
    }

    getCurrentStep() {
        return this.currentStep;
    }
}

// 通知管理器
class NotificationManager {
    showNotification(type, message) {
        // 移除现有通知
        const existing = document.querySelector('.demo-notification');
        if (existing) {
            existing.remove();
        }

        // 创建通知
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

        // 添加样式
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
            transition: 'transform 0.3s ease',
            fontSize: '0.875rem',
            fontWeight: '500',
            maxWidth: '400px'
        });

        document.body.appendChild(notification);

        // 动画进入
        setTimeout(() => {
            notification.style.transform = 'translateX(0)';
        }, 100);

        // 自动移除
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

// 数据提取管理器
class DataExtractionManager {
    constructor(demoManager) {
        this.demoManager = demoManager;
        this.bindDemoActions();
    }

    bindDemoActions() {
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
        
        // 显示加载状态
        btn.innerHTML = '⏳ 提取中...';
        btn.disabled = true;

        // 模拟提取过程
        setTimeout(() => {
            this.demoManager.extractedData = {
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
                // 餐厅反馈特定数据
                visitDate: '2024-01-20',
                partySize: '2',
                overallRating: '5',
                foodQuality: 'excellent',
                serviceQuality: 'excellent',
                favoriteItem: 'Seafood Linguine with marinara sauce',
                feedbackComments: '用餐体验非常棒！海鲜意面烹饪完美，番茄酱正宗美味。服务员细心周到但不打扰，浪漫的氛围营造了完美的约会夜晚。酒单选择丰富且价格合理。一定会再来，强烈推荐给朋友们！',
                recommendToFriends: 'definitely'
            };

            // 显示成功状态
            btn.innerHTML = '✅ 数据已提取！';
            btn.style.background = '#10b981';

            // 显示提取数据通知
            this.demoManager.showNotification('success', '数据提取成功！您现在可以使用它进行聊天分析。');

            // 延迟后重置按钮
            setTimeout(() => {
                btn.innerHTML = originalText;
                btn.disabled = false;
                btn.style.background = '';
            }, 3000);
        }, 2000);
    }
}

// 表单管理器
class FormManager {
    constructor(demoManager) {
        this.demoManager = demoManager;
        this.bindFormActions();
    }

    bindFormActions() {
        const clearBtn = document.getElementById('clearFormBtn');
        const form = document.getElementById('feedbackForm');

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

    clearForm() {
        const form = document.getElementById('feedbackForm');
        if (form) {
            form.reset();
            this.demoManager.showNotification('info', '表单已清空！');
        }
    }

    handleFormSubmit() {
        this.demoManager.showNotification('success', '表单提交成功！（这是演示页面，不会实际提交数据）');
    }
}

// 聊天管理器
class ChatManager {
    constructor(demoManager) {
        this.demoManager = demoManager;
        this.bindChatActions();
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

        if (!this.demoManager.extractedData) {
            this.addChatMessage('system', '⚠️ 请先从数据提取页面提取数据，以启用聊天功能！');
            input.value = '';
            return;
        }

        // 添加用户消息
        this.addChatMessage('user', message);
        input.value = '';

        // 模拟 AI 回复
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
        const data = this.demoManager.extractedData;
        
        if (q.includes('name') && q.includes('title')) {
            return `📋 此人的姓名是 ${data.name}，职位是 ${data.company} 的 ${data.jobTitle}。`;
        }
        
        if (q.includes('contact')) {
            return `📞 联系信息如下：\n• 邮箱：${data.email}\n• 电话：${data.phone}\n• 地址：${data.location}`;
        }
        
        if (q.includes('company')) {
            return `🏢 ${data.name} 在 ${data.company} 的 ${data.department} 部门工作。`;
        }
        
        if (q.includes('summary') || q.includes('key information')) {
            return `📋 关键信息摘要：\n• 姓名：${data.name}\n• 职位：${data.jobTitle}\n• 公司：${data.company}\n• 部门：${data.department}\n• 联系方式：${data.email}\n• 地址：${data.location}`;
        }
        
        // 默认回复
        return `🤖 我可以帮您分析关于 ${data.name} 的提取数据。您可以询问他们的联系信息、专业背景，或请求关键信息摘要。`;
    }
}

// 复制功能管理器
class CopyManager {
    constructor() {
        this.bindCopyButtons();
    }

    bindCopyButtons() {
        // 为所有复制按钮绑定事件
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('copy-btn')) {
                const prompt = e.target.dataset.prompt;
                this.copyToClipboard(prompt, e.target);
            }
        });
    }

    async copyToClipboard(text, button) {
        try {
            // 使用现代 Clipboard API
            if (navigator.clipboard && window.isSecureContext) {
                await navigator.clipboard.writeText(text);
            } else {
                // 降级方案：使用传统方法
                this.fallbackCopyTextToClipboard(text);
            }
            
            this.showCopySuccess(button);
        } catch (err) {
            console.error('复制失败:', err);
            this.showCopyError(button);
        }
    }

    fallbackCopyTextToClipboard(text) {
        const textArea = document.createElement('textarea');
        textArea.value = text;
        
        // 避免滚动到页面底部
        textArea.style.top = '0';
        textArea.style.left = '0';
        textArea.style.position = 'fixed';
        textArea.style.opacity = '0';
        
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        
        try {
            const successful = document.execCommand('copy');
            if (!successful) {
                throw new Error('execCommand 失败');
            }
        } finally {
            document.body.removeChild(textArea);
        }
    }

    showCopySuccess(button) {
        const originalText = button.innerHTML;
        
        // 显示成功状态
        button.innerHTML = '✅';
        button.classList.add('copied');
        
        // 恢复原始状态
        setTimeout(() => {
            button.innerHTML = originalText;
            button.classList.remove('copied');
        }, 2000);
    }

    showCopyError(button) {
        const originalText = button.innerHTML;
        
        // 显示错误状态
        button.innerHTML = '❌';
        button.style.background = '#ef4444';
        
        // 恢复原始状态
        setTimeout(() => {
            button.innerHTML = originalText;
            button.style.background = '';
        }, 2000);
    }
}

// 页面加载时初始化演示
document.addEventListener('DOMContentLoaded', () => {
    new DemoManager();
    
    // 添加一些演示数据到聊天
    setTimeout(() => {
        const chatMessages = document.getElementById('chatMessages');
        if (chatMessages) {
            // 初始系统消息已在 HTML 中
            console.log('🚀 演示页面加载成功！');
            
            // 如果可用，加载扩展调试界面
            try {
                const debugScript = document.createElement('script');
                debugScript.src = '../extension/debug-page-interface.js';
                debugScript.onload = () => {
                    console.log('🔧 扩展调试界面已加载');
                    console.log('🔧 可用的调试函数：');
                    console.log('  - debugExtensionDataSource()');
                    console.log('  - openExtensionDataSourceModal()');
                    console.log('  - getExtensionHistory()');
                };
                debugScript.onerror = () => {
                    console.warn('⚠️ 无法加载扩展调试界面');
                };
                document.head.appendChild(debugScript);
            } catch (error) {
                console.warn('⚠️ 加载扩展调试界面时出错:', error);
            }
        }
    }, 500);
});

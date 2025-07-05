// Copy Handler Module - 处理复制到剪贴板的功能

class CopyHandler {
    constructor() {
        this.init();
    }

    init() {
        this.bindCopyButtons();
        this.createCopyButtons();
    }

    /**
     * 创建复制按钮并添加到提示场景中
     */
    createCopyButtons() {
        const prompts = this.getPromptScenarios();
        
        prompts.forEach(prompt => {
            this.addCopyButtonToElement(prompt.element, prompt.text, prompt.label);
        });

        // 为表单场景添加特殊的复制按钮
        this.addFormScenarioCopyButtons();
    }

    /**
     * 获取所有提示场景的定义（仅包含AI Chat部分）
     */
    getPromptScenarios() {
        return [
            // AI Chat 快速问题按钮
            {
                element: '.question-btn[data-question*="name"]',
                text: "What is the person's name and job title?",
                label: "职业信息提示"
            },
            {
                element: '.question-btn[data-question*="contact"]',
                text: "What contact information is available?",
                label: "联系信息提示"
            },
            {
                element: '.question-btn[data-question*="company"]',
                text: "What company do they work for?",
                label: "公司信息提示"
            },
            {
                element: '.question-btn[data-question*="Summary"]',
                text: "Summarize the key information",
                label: "信息总结提示"
            }
        ];
    }

    /**
     * 为表单填写场景添加复制按钮
     */
    addFormScenarioCopyButtons() {
        // 等待DOM完全加载
        setTimeout(() => {
            const formScenarios = [
                {
                    searchText: "Restaurant Review Scenario",
                    text: `Fill this restaurant feedback form as a satisfied customer who enjoyed the seafood pasta and excellent service. Give a 5-star rating and positive detailed comments about the authentic Italian atmosphere and friendly staff.`,
                    label: "餐厅评价场景"
                },
                {
                    searchText: "Birthday Celebration",
                    text: `Fill this feedback as someone who celebrated their birthday here. Mention the surprise dessert, decorations, and how the staff made the evening special. Rate 4-5 stars.`,
                    label: "生日庆祝场景"
                },
                {
                    searchText: "Business Lunch",
                    text: `Complete this form as a business professional who brought clients here. Focus on the quiet atmosphere, prompt service, and quality food that impressed the clients. Professional tone.`,
                    label: "商务午餐场景"
                },
                {
                    searchText: "Family Dinner",
                    text: `Fill as a family visitor. Mention kid-friendly menu, accommodating staff for children, high chairs available, and how children enjoyed their meals. Family-focused feedback.`,
                    label: "家庭聚餐场景"
                }
            ];

            formScenarios.forEach(scenario => {
                this.addScenarioCopyButtonByText(scenario.searchText, scenario.text, scenario.label);
            });
        }, 1000);
    }

    /**
     * 通过搜索文本找到元素并添加复制按钮
     */
    addScenarioCopyButtonByText(searchText, textToCopy, label) {
        const promptItems = document.querySelectorAll('.prompt-item');
        
        promptItems.forEach(item => {
            if (item.textContent.includes(searchText)) {
                // 检查是否已经有复制按钮
                if (item.querySelector('.scenario-copy-btn')) return;

                // 查找code元素
                const codeElement = item.querySelector('code');
                if (!codeElement) return;

                const copyButton = this.createScenarioCopyButton(textToCopy, label);
                
                // 在code元素后面添加复制按钮
                const buttonContainer = document.createElement('div');
                buttonContainer.className = 'scenario-copy-container';
                buttonContainer.style.cssText = `
                    margin-top: 8px;
                    text-align: right;
                `;
                
                buttonContainer.appendChild(copyButton);
                codeElement.parentNode.insertBefore(buttonContainer, codeElement.nextSibling);
            }
        });
    }

    /**
     * 创建场景专用的复制按钮
     */
    createScenarioCopyButton(textToCopy, label) {
        const button = document.createElement('button');
        button.className = 'scenario-copy-btn';
        button.innerHTML = '📋 复制提示';
        button.title = `复制场景提示: ${label}`;
        
        button.style.cssText = `
            background: #3b82f6;
            color: white;
            border: none;
            border-radius: 6px;
            padding: 6px 12px;
            cursor: pointer;
            font-size: 12px;
            transition: all 0.2s ease;
            display: inline-flex;
            align-items: center;
            gap: 4px;
        `;

        // 添加悬停效果
        button.addEventListener('mouseenter', () => {
            button.style.background = '#2563eb';
            button.style.transform = 'translateY(-1px)';
        });

        button.addEventListener('mouseleave', () => {
            button.style.background = '#3b82f6';
            button.style.transform = 'translateY(0)';
        });

        // 添加点击事件
        button.addEventListener('click', (e) => {
            e.stopPropagation();
            this.copyToClipboard(textToCopy, button, label);
        });

        return button;
    }

    /**
     * 为指定元素添加复制按钮
     */
    addCopyButtonToElement(selector, textToCopy, label) {
        // 等待DOM加载完成后再执行
        setTimeout(() => {
            const elements = Array.from(document.querySelectorAll(selector));

            elements.forEach(element => {
                if (!element) return;

                // 检查是否已经有复制按钮
                if (element.parentElement && element.parentElement.querySelector('.copy-btn')) return;

                const copyButton = this.createCopyButton(textToCopy, label);
                
                // 创建包装器来容纳原按钮和复制按钮
                const wrapper = document.createElement('div');
                wrapper.className = 'prompt-with-copy';
                wrapper.style.cssText = `
                    display: flex;
                    gap: 8px;
                    align-items: center;
                    margin-bottom: 8px;
                `;

                // 包装原元素
                element.parentNode.insertBefore(wrapper, element);
                wrapper.appendChild(element);
                wrapper.appendChild(copyButton);
            });
        }, 500);
    }

    /**
     * 创建复制按钮元素
     */
    createCopyButton(textToCopy, label) {
        const button = document.createElement('button');
        button.className = 'copy-btn';
        button.innerHTML = '📋';
        button.title = `复制提示: ${label}`;
        
        button.style.cssText = `
            background: #f3f4f6;
            border: 1px solid #d1d5db;
            border-radius: 6px;
            padding: 6px 8px;
            cursor: pointer;
            font-size: 14px;
            transition: all 0.2s ease;
            min-width: 32px;
            height: 32px;
            display: flex;
            align-items: center;
            justify-content: center;
        `;

        // 添加悬停效果
        button.addEventListener('mouseenter', () => {
            button.style.background = '#e5e7eb';
            button.style.borderColor = '#9ca3af';
        });

        button.addEventListener('mouseleave', () => {
            button.style.background = '#f3f4f6';
            button.style.borderColor = '#d1d5db';
        });

        // 添加点击事件
        button.addEventListener('click', (e) => {
            e.stopPropagation();
            this.copyToClipboard(textToCopy, button, label);
        });

        return button;
    }

    /**
     * 复制文本到剪贴板
     */
    async copyToClipboard(text, button, label) {
        try {
            await navigator.clipboard.writeText(text);
            this.showCopySuccess(button, label);
        } catch (err) {
            console.error('复制失败:', err);
            this.fallbackCopyToClipboard(text, button, label);
        }
    }

    /**
     * 降级复制方法（兼容性处理）
     */
    fallbackCopyToClipboard(text, button, label) {
        const textArea = document.createElement('textarea');
        textArea.value = text;
        textArea.style.position = 'fixed';
        textArea.style.left = '-999999px';
        textArea.style.top = '-999999px';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        
        try {
            document.execCommand('copy');
            this.showCopySuccess(button, label);
        } catch (err) {
            console.error('降级复制也失败:', err);
            this.showCopyError(button);
        }
        
        document.body.removeChild(textArea);
    }

    /**
     * 显示复制成功的反馈
     */
    showCopySuccess(button, label) {
        const originalContent = button.innerHTML;
        const originalTitle = button.title;
        
        button.innerHTML = button.classList.contains('scenario-copy-btn') ? '✅ 已复制' : '✅';
        button.title = `已复制: ${label}`;
        button.style.background = '#10b981';
        button.style.borderColor = '#059669';
        button.style.color = 'white';
        
        // 显示通知
        this.showNotification('success', `提示已复制到剪贴板: ${label}`);
        
        // 恢复原状态
        setTimeout(() => {
            button.innerHTML = originalContent;
            button.title = originalTitle;
            if (button.classList.contains('scenario-copy-btn')) {
                button.style.background = '#3b82f6';
                button.style.borderColor = '';
            } else {
                button.style.background = '#f3f4f6';
                button.style.borderColor = '#d1d5db';
            }
            button.style.color = '';
        }, 2000);
    }

    /**
     * 显示复制错误的反馈
     */
    showCopyError(button) {
        const originalContent = button.innerHTML;
        
        button.innerHTML = button.classList.contains('scenario-copy-btn') ? '❌ 失败' : '❌';
        button.style.background = '#ef4444';
        button.style.borderColor = '#dc2626';
        button.style.color = 'white';
        
        this.showNotification('error', '复制失败，请手动复制');
        
        setTimeout(() => {
            button.innerHTML = originalContent;
            if (button.classList.contains('scenario-copy-btn')) {
                button.style.background = '#3b82f6';
                button.style.borderColor = '';
            } else {
                button.style.background = '#f3f4f6';
                button.style.borderColor = '#d1d5db';
            }
            button.style.color = '';
        }, 2000);
    }

    /**
     * 绑定现有的复制按钮事件
     */
    bindCopyButtons() {
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('copy-btn') || e.target.classList.contains('scenario-copy-btn')) {
                // 事件已在创建时绑定
                return;
            }
        });
    }

    /**
     * 显示通知消息
     */
    showNotification(type, message) {
        // 检查是否有全局通知方法
        if (window.demoManager && typeof window.demoManager.showNotification === 'function') {
            window.demoManager.showNotification(type, message);
            return;
        }

        // 降级通知方法
        const notification = document.createElement('div');
        notification.className = `copy-notification copy-notification--${type}`;
        
        const icons = {
            success: '✅',
            error: '❌',
            info: 'ℹ️'
        };
        
        notification.innerHTML = `
            <div style="display: flex; align-items: center; gap: 8px;">
                <span>${icons[type]}</span>
                <span>${message}</span>
            </div>
        `;

        Object.assign(notification.style, {
            position: 'fixed',
            top: '20px',
            right: '20px',
            background: type === 'success' ? '#10b981' : '#ef4444',
            color: 'white',
            padding: '12px 16px',
            borderRadius: '8px',
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
            zIndex: '1000',
            transform: 'translateX(100%)',
            transition: 'transform 0.3s ease'
        });

        document.body.appendChild(notification);

        setTimeout(() => {
            notification.style.transform = 'translateX(0)';
        }, 100);

        setTimeout(() => {
            notification.style.transform = 'translateX(100%)';
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.remove();
                }
            }, 300);
        }, 3000);
    }

    /**
     * 添加自定义提示的复制功能
     */
    addCustomPromptCopy(element, promptText, label) {
        this.addCopyButtonToElement(element, promptText, label);
    }

    /**
     * 批量添加提示复制功能
     */
    addPromptCopies(prompts) {
        prompts.forEach(prompt => {
            this.addCopyButtonToElement(prompt.selector, prompt.text, prompt.label);
        });
    }
}

// 导出模块
if (typeof module !== 'undefined' && module.exports) {
    module.exports = CopyHandler;
} else {
    window.CopyHandler = CopyHandler;
}

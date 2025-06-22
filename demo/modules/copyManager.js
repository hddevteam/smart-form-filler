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

export default CopyManager;

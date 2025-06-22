// UI工具类 - 处理常见的UI问题和改进
class UIUtils {
    // 修复图片加载问题
    static fixImageFallbacks() {
        const images = document.querySelectorAll('img');
        images.forEach(img => {
            img.addEventListener('error', function() {
                this.style.display = 'none';
                
                // 如果父元素是 profile-avatar，显示文字fallback
                if (this.parentNode.classList.contains('profile-avatar')) {
                    this.parentNode.innerHTML = this.alt || '👤';
                    this.parentNode.style.fontSize = '1.5rem';
                    this.parentNode.style.color = 'white';
                }
            });
        });
    }

    // 移除重复的图标
    static removeDuplicateIcons() {
        // 检查所有包含表情符号的标题
        const titles = document.querySelectorAll('h3, h4');
        titles.forEach(title => {
            const text = title.textContent;
            // 如果标题以表情符号开头，移除CSS添加的伪元素
            if (/^[\u{1F000}-\u{1F6FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/u.test(text)) {
                title.style.paddingLeft = '0';
                title.style.position = 'relative';
                
                // 移除可能的伪元素
                const style = document.createElement('style');
                style.textContent = `
                    h3:has-text("${text}")::before,
                    h4:has-text("${text}")::before {
                        display: none !important;
                    }
                `;
                document.head.appendChild(style);
            }
        });
    }

    // 确保所有placeholder内容正确显示
    static fixPlaceholderContent() {
        // 检查空的元素
        const emptyElements = document.querySelectorAll('[class*="profile"], [class*="avatar"], [class*="placeholder"]');
        emptyElements.forEach(element => {
            if (!element.textContent.trim() && !element.querySelector('img')) {
                // 如果是头像容器且为空，添加默认内容
                if (element.classList.contains('profile-avatar')) {
                    element.innerHTML = 'JS';
                    element.style.display = 'flex';
                    element.style.alignItems = 'center';
                    element.style.justifyContent = 'center';
                }
            }
        });
    }

    // 检查并修复布局问题
    static fixLayoutIssues() {
        // 确保flex容器有正确的显示属性
        const flexContainers = document.querySelectorAll('.profile-header, .demo-layout, .step');
        flexContainers.forEach(container => {
            const computedStyle = window.getComputedStyle(container);
            if (computedStyle.display === 'none' || computedStyle.visibility === 'hidden') {
                console.warn('发现隐藏的容器:', container);
            }
        });

        // 检查是否有元素重叠
        this.checkOverlappingElements();
    }

    // 检查重叠元素
    static checkOverlappingElements() {
        const elements = document.querySelectorAll('.profile-avatar, .step-number, .copy-btn');
        const positions = [];
        
        elements.forEach(element => {
            const rect = element.getBoundingClientRect();
            if (rect.width > 0 && rect.height > 0) {
                positions.push({
                    element,
                    rect,
                    id: element.id || element.className
                });
            }
        });

        // 检查重叠
        for (let i = 0; i < positions.length; i++) {
            for (let j = i + 1; j < positions.length; j++) {
                if (this.isOverlapping(positions[i].rect, positions[j].rect)) {
                    console.warn('发现重叠元素:', positions[i].id, positions[j].id);
                }
            }
        }
    }

    // 检查两个矩形是否重叠
    static isOverlapping(rect1, rect2) {
        return !(rect1.right < rect2.left || 
                rect2.right < rect1.left || 
                rect1.bottom < rect2.top || 
                rect2.bottom < rect1.top);
    }

    // 添加调试信息
    static addDebugInfo() {
        if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
            console.log('UI Debug Info:');
            console.log('- 页面尺寸:', window.innerWidth, 'x', window.innerHeight);
            console.log('- 用户代理:', navigator.userAgent);
            
            // 检查CSS变量
            const rootStyles = getComputedStyle(document.documentElement);
            console.log('- 主色调:', rootStyles.getPropertyValue('--primary-color'));
            console.log('- 表面色:', rootStyles.getPropertyValue('--surface'));
        }
    }

    // 初始化所有修复
    static initializeFixes() {
        // 等待DOM完全加载
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => {
                this.applyAllFixes();
            });
        } else {
            this.applyAllFixes();
        }
    }

    // 应用所有修复
    static applyAllFixes() {
        setTimeout(() => {
            this.fixImageFallbacks();
            this.removeDuplicateIcons();
            this.fixPlaceholderContent();
            this.fixLayoutIssues();
            this.addDebugInfo();
            
            console.log('✅ UI修复已应用');
        }, 100);
    }

    // 监听动态内容变化
    static observeDynamicChanges() {
        const observer = new MutationObserver((mutations) => {
            let needsFixing = false;
            
            mutations.forEach((mutation) => {
                if (mutation.type === 'childList' || mutation.type === 'attributes') {
                    needsFixing = true;
                }
            });
            
            if (needsFixing) {
                setTimeout(() => {
                    this.fixImageFallbacks();
                    this.fixPlaceholderContent();
                }, 50);
            }
        });

        observer.observe(document.body, {
            childList: true,
            subtree: true,
            attributes: true,
            attributeFilter: ['class', 'style']
        });
    }
}

// 自动初始化
UIUtils.initializeFixes();
UIUtils.observeDynamicChanges();

export default UIUtils;

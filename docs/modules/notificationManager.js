// 通知管理器
class NotificationManager {
    constructor() {
        // 初始化时无需做特殊操作
    }

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

export default NotificationManager;

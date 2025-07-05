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

export default ChatManager;

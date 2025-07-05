// 数据提取管理器
class DataExtractionManager {
    constructor(demoManager) {
        this.demoManager = demoManager;
        this.uiElements = this.initializeUIElements();
        this.state = {
            isExtracting: false,
            originalButtonText: ''
        };
        this.bindDemoActions();
    }

    // 初始化UI元素引用
    initializeUIElements() {
        return {
            extractBtn: document.getElementById('extractDataBtn')
        };
    }

    // 绑定事件监听器
    bindDemoActions() {
        if (this.uiElements.extractBtn) {
            this.uiElements.extractBtn.addEventListener('click', () => {
                if (!this.state.isExtracting) {
                    this.simulateDataExtraction();
                }
            });
        }
    }

    // 模拟数据提取过程
    simulateDataExtraction() {
        this.startExtractionProcess();
        
        // 模拟异步提取过程
        setTimeout(() => {
            this.completeExtractionProcess();
        }, 2000);
    }

    // 开始提取过程
    startExtractionProcess() {
        if (!this.uiElements.extractBtn) return;
        
        this.state.isExtracting = true;
        this.state.originalButtonText = this.uiElements.extractBtn.innerHTML;
        
        this.updateButtonState('loading');
    }

    // 完成提取过程
    completeExtractionProcess() {
        // 设置提取的数据
        this.setExtractedData();
        
        // 更新UI状态
        this.updateButtonState('success');
        
        // 显示成功通知
        this.showSuccessNotification();
        
        // 延迟重置按钮状态
        setTimeout(() => {
            this.resetButtonState();
        }, 3000);
    }

    // 设置提取的数据
    setExtractedData() {
        this.demoManager.extractedData = this.createSampleData();
    }

    // 创建示例数据
    createSampleData() {
        return {
            // 基本个人信息
            name: 'John Smith',
            firstName: 'John',
            lastName: 'Smith',
            email: 'john.smith@techcorp.com',
            phone: '+1 (555) 123-4567',
            
            // 职业信息
            company: 'TechCorp Solutions',
            jobTitle: 'Senior Software Engineer',
            location: 'San Francisco, CA',
            department: 'engineering',
            employeeId: 'EMP-2024-001',
            startDate: 'January 15, 2020',
            
            // 餐厅反馈相关数据
            visitDate: '2024-01-20',
            partySize: '2',
            overallRating: '5',
            foodQuality: 'excellent',
            serviceQuality: 'excellent',
            favoriteItem: 'Seafood Linguine with marinara sauce',
            feedbackComments: this.generateFeedbackComment(),
            recommendToFriends: 'definitely'
        };
    }

    // 生成反馈评论
    generateFeedbackComment() {
        return '用餐体验非常棒！海鲜意面烹饪完美，番茄酱正宗美味。服务员细心周到但不打扰，' +
               '浪漫的氛围营造了完美的约会夜晚。酒单选择丰富且价格合理。一定会再来，强烈推荐给朋友们！';
    }

    // 更新按钮状态
    updateButtonState(state) {
        if (!this.uiElements.extractBtn) return;
        
        const btn = this.uiElements.extractBtn;
        
        switch (state) {
            case 'loading':
                btn.innerHTML = '⏳ 提取中...';
                btn.disabled = true;
                break;
            case 'success':
                btn.innerHTML = '✅ 数据已提取！';
                btn.style.background = '#10b981';
                break;
            case 'reset':
                btn.innerHTML = this.state.originalButtonText;
                btn.disabled = false;
                btn.style.background = '';
                this.state.isExtracting = false;
                break;
        }
    }

    // 重置按钮状态
    resetButtonState() {
        this.updateButtonState('reset');
    }

    // 显示成功通知
    showSuccessNotification() {
        if (this.demoManager && this.demoManager.showNotification) {
            this.demoManager.showNotification(
                'success', 
                '数据提取成功！您现在可以使用它进行表单填写和聊天。'
            );
        }
    }

    // 获取提取状态
    isExtracting() {
        return this.state.isExtracting;
    }

    // 清理方法
    destroy() {
        if (this.uiElements.extractBtn) {
            this.uiElements.extractBtn.removeEventListener('click', this.simulateDataExtraction);
        }
    }
}

export default DataExtractionManager;

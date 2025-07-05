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

export default FormManager;

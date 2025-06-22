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

export default NavigationManager;

/**
 * Data Source Event Emitter
 * Provides a unified event system for data source configuration changes
 */
class DataSourceEventEmitter {
    constructor() {
        this.listeners = new Map();
    }

    /**
     * Event types
     */
    static get EVENTS() {
        return {
            CHAT_CONFIG_CHANGED: 'chatConfigChanged',
            FORM_FILLER_CONFIG_CHANGED: 'formFillerConfigChanged',
            DATA_SOURCES_UPDATED: 'dataSourcesUpdated',
            CONFIGURATION_APPLIED: 'configurationApplied',
            MODAL_OPENED: 'modalOpened',
            MODAL_CLOSED: 'modalClosed'
        };
    }

    /**
     * Add event listener
     */
    on(eventType, listener) {
        if (!this.listeners.has(eventType)) {
            this.listeners.set(eventType, []);
        }
        this.listeners.get(eventType).push(listener);
    }

    /**
     * Remove event listener
     */
    off(eventType, listener) {
        if (!this.listeners.has(eventType)) {
            return;
        }
        
        const listeners = this.listeners.get(eventType);
        const index = listeners.indexOf(listener);
        if (index > -1) {
            listeners.splice(index, 1);
        }
    }

    /**
     * Emit event
     */
    emit(eventType, data = null) {
        if (!this.listeners.has(eventType)) {
            return;
        }

        const listeners = this.listeners.get(eventType);
        listeners.forEach(listener => {
            try {
                listener(data);
            } catch (error) {
                console.error(`[DataSourceEventEmitter] Error in listener for ${eventType}:`, error);
            }
        });

        // Also dispatch DOM event for legacy compatibility
        this.dispatchDOMEvent(eventType, data);
    }

    /**
     * Dispatch DOM event for legacy compatibility
     */
    dispatchDOMEvent(eventType, data) {
        try {
            const event = new CustomEvent(eventType, {
                detail: data,
                bubbles: true
            });
            document.dispatchEvent(event);
        } catch (error) {
            console.error(`[DataSourceEventEmitter] Error dispatching DOM event for ${eventType}:`, error);
        }
    }

    /**
     * Remove all listeners for an event type
     */
    removeAllListeners(eventType) {
        if (eventType) {
            this.listeners.delete(eventType);
        } else {
            this.listeners.clear();
        }
    }

    /**
     * Get listener count for an event type
     */
    getListenerCount(eventType) {
        return this.listeners.has(eventType) ? this.listeners.get(eventType).length : 0;
    }

    /**
     * Check if has listeners for an event type
     */
    hasListeners(eventType) {
        return this.getListenerCount(eventType) > 0;
    }
}

// Export the class
window.DataSourceEventEmitter = DataSourceEventEmitter;

/**
 * Data Source Configuration
 * Represents the configuration for a data source selection
 */
class DataSourceConfig {
    constructor(type = 'markdown', selectedItems = []) {
        this.type = type;
        this.selectedItems = selectedItems;
        this.isConfigured = false;
    }

    /**
     * Create configuration from plain object
     */
    static fromObject(obj) {
        if (!obj) return new DataSourceConfig();
        
        const config = new DataSourceConfig(obj.type, obj.selectedItems || []);
        
        // Set isConfigured based on explicit property or infer from selectedItems
        if (obj.hasOwnProperty('isConfigured')) {
            config.isConfigured = obj.isConfigured;
        } else {
            // If not explicitly set, infer from the presence of selectedItems
            config.isConfigured = config.selectedItems.length > 0;
        }
        
        return config;
    }

    /**
     * Convert to plain object for storage
     */
    toObject() {
        return {
            type: this.type,
            selectedItems: this.selectedItems,
            isConfigured: this.isConfigured
        };
    }

    /**
     * Clone the configuration
     */
    clone() {
        return DataSourceConfig.fromObject(this.toObject());
    }

    /**
     * Update from another configuration
     */
    updateFrom(other) {
        this.type = other.type;
        this.selectedItems = [...other.selectedItems];
        this.isConfigured = other.isConfigured;
    }

    /**
     * Check if configuration is valid
     */
    isValid() {
        return this.isConfigured && this.selectedItems.length > 0;
    }

    /**
     * Add a data source item
     */
    addItem(item) {
        // Ensure item is in consistent object format
        const itemToAdd = typeof item === 'object' ? item : { id: item };
        
        // Check if not already selected
        const alreadyExists = this.selectedItems.some(existing => {
            const existingId = typeof existing === 'object' ? existing.id : existing;
            const newId = typeof itemToAdd === 'object' ? itemToAdd.id : itemToAdd;
            return existingId === newId;
        });

        if (!alreadyExists) {
            this.selectedItems.push(itemToAdd);
            this.isConfigured = true;
        }
    }

    /**
     * Remove a data source item
     */
    removeItem(itemId) {
        this.selectedItems = this.selectedItems.filter(item => {
            const id = typeof item === 'object' ? item.id : item;
            return id !== itemId;
        });
        
        if (this.selectedItems.length === 0) {
            this.isConfigured = false;
        }
    }

    /**
     * Clear all items
     */
    clear() {
        this.selectedItems = [];
        this.isConfigured = false;
    }

    /**
     * Get count of selected items
     */
    getCount() {
        return this.selectedItems.length;
    }

    /**
     * Get selected item IDs
     */
    getItemIds() {
        return this.selectedItems.map(item => 
            typeof item === 'object' ? item.id : item
        );
    }
}

// Export the class
window.DataSourceConfig = DataSourceConfig;

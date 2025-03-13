(function() {
    // Check if ModulesManager already exists
    if (window.ModulesManager) {
        return;
    }

class ModulesManager {
    constructor(apiBaseUrl) {
        // Core configuration
        this.baseUrl = apiBaseUrl || 'https://18.215.160.136.nip.io/api';
        this.token = localStorage.getItem('token');
        
        // Comprehensive method binding
        this.fetchModules = this.fetchModules.bind(this);
        this.renderModules = this.renderModules.bind(this);
        this.showAddModuleModal = this.showAddModuleModal.bind(this);
        this.closeModal = this.closeModal.bind(this);
        this.addNewModule = this.addNewModule.bind(this);
        this.updateModule = this.updateModule.bind(this);
        this.deleteModule = this.deleteModule.bind(this);
        this.toggleModuleStatus = this.toggleModuleStatus.bind(this);
        this.fetchActivityLogs = this.fetchActivityLogs.bind(this);
        this.renderActivityLogs = this.renderActivityLogs.bind(this);
        this.filterActivityLogs = this.filterActivityLogs.bind(this);

        // Initialize with delay to ensure DOM readiness
        this.initializeWithDelay();
          // Add fallback initialization
    this.initializeFallbackListeners();
    }

    initializeWithDelay() {
        setTimeout(() => {
        this.setupEventListeners();
        this.fetchModules();
        this.fetchActivityLogs();
        
        // Force re-setup of event listeners
        this.setupEventListeners();
    }, 500); 
    }

    initializeFallbackListeners() {
    document.addEventListener('DOMContentLoaded', () => {
        const addNewModuleBtn = document.getElementById('addNewModuleBtn');
        if (addNewModuleBtn) {
            addNewModuleBtn.addEventListener('click', this.showAddModuleModal);
        }
    });
}

    setupEventListeners() {
        console.log('Setting up event listeners');

        // Add New Module Button
        const addNewModuleBtn = document.getElementById('addNewModuleBtn');
    if (addNewModuleBtn) {
        // Remove existing listeners first
        addNewModuleBtn.removeEventListener('click', this.showAddModuleModal);
        addNewModuleBtn.addEventListener('click', this.showAddModuleModal);
        console.log('Add New Module Button event listener added');
    } else {
        console.error('Add New Module Button not found');
    }

        // Add Module Form Submission
        const addModuleForm = document.getElementById('addModuleForm');
        if (addModuleForm) {
            addModuleForm.addEventListener('submit', this.addNewModule);
            console.log('Add Module Form submission event listener added');
        } else {
            console.error('Add Module Form not found');
        }

        // Edit Module Form Submission
        const editModuleForm = document.getElementById('editModuleForm');
        if (editModuleForm) {
            editModuleForm.addEventListener('submit', this.updateModule);
            console.log('Edit Module Form submission event listener added');
        }

        // Modal Close Buttons
        const closeButtons = document.querySelectorAll('.modal-close');
        closeButtons.forEach(button => {
            button.addEventListener('click', this.closeModal);
        });
        console.log(`Added close listeners to ${closeButtons.length} modal close buttons`);

        // Cancel Buttons
        const cancelAddModuleBtn = document.getElementById('cancelAddModule');
        if (cancelAddModuleBtn) {
            cancelAddModuleBtn.addEventListener('click', this.closeModal);
        }

        // Activity Log Filter
        const activityLogFilter = document.getElementById('activityLogFilter');
        if (activityLogFilter) {
            activityLogFilter.addEventListener('change', this.filterActivityLogs);
        }
    }

    showAddModuleModal(event) {
        console.log('Show Add Module Modal called');
        
        if (event) {
            event.preventDefault();
        }

        const modal = document.getElementById('addModuleModal');
        console.log('Modal element:', modal);
        
        if (!modal) {
            this.showNotification('Modal not found', 'error');
            return;
        }

        // Reset form
        const form = modal.querySelector('form');
        if (form) {
            form.reset();
        }

        // Show modal with multiple methods for compatibility
       modal.style.display = 'flex';
    modal.style.visibility = 'visible';
    modal.style.opacity = '1';
    modal.classList.add('show');

        // Focus first input
        const firstInput = modal.querySelector('input[name="moduleName"]');
        if (firstInput) {
            firstInput.focus();
        }

        console.log('Modal should now be visible');
    }

    closeModal(event) {
        console.log('Close Modal called');
        
        if (event) {
            event.preventDefault();
        }

        const modals = document.querySelectorAll('.modal');
        modals.forEach(modal => {
            modal.style.display = 'none';
            modal.classList.remove('show');
        });
    }

    showNotification(message, type = 'info') {
        // Use dashboard's notification system if available
        if (window.dashboardApp && window.dashboardApp.userInterface) {
            window.dashboardApp.userInterface.showNotification(message, type);
        } else {
            // Fallback notification
            alert(`${type.toUpperCase()}: ${message}`);
        }
    }

        async fetchModules() {
        try {
            console.log('Fetching modules');
            const response = await fetch(`${this.baseUrl}/modules`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${this.token}`,
                    'Content-Type': 'application/json'
                }
            });

            const result = await response.json();
            console.log('Modules fetch result:', result);

            if (result.success) {
                this.renderModules(result.data);
            } else {
                throw new Error(result.message || 'Failed to fetch modules');
            }
        } catch (error) {
            console.error('Modules fetch error:', error);
            this.showNotification(error.message, 'error');
        }
    }

    renderModules(modules) {
        console.log('Rendering modules:', modules);
        const categoryMappings = {
            'hr': 'hrModulesList',
            'finance': 'financeModulesList',
            'operations': 'operationsModulesList',
            'integrations': 'integrationsModulesList'
        };

        // Clear existing modules
        Object.values(categoryMappings).forEach(listId => {
            const list = document.getElementById(listId);
            if (list) list.innerHTML = '';
        });

        modules.forEach(module => {
            const listId = categoryMappings[module.category];
            const moduleList = document.getElementById(listId);

            if (moduleList) {
                const moduleCard = this.createModuleCard(module);
                moduleList.appendChild(moduleCard);
            }
        });
    }

    createModuleCard(module) {
        const card = document.createElement('div');
        card.className = 'module-card';
        card.dataset.moduleId = module._id;

        const complianceClass = {
            'high': 'compliance-high',
            'medium': 'compliance-medium',
            'low': 'compliance-low'
        };

        card.innerHTML = `
            <div class="module-card-header">
                <h4 class="module-title">${module.name}</h4>
                <div class="module-status-toggle">
                    <input type="checkbox" id="moduleStatus-${module._id}" 
                           ${module.isActive ? 'checked' : ''}>
                    <label for="moduleStatus-${module._id}" class="toggle-switch"></label>
                </div>
            </div>
            <div class="module-card-content">
                <p class="module-description">${module.description}</p>
                <div class="module-meta">
                    <span class="module-category">${module.category.toUpperCase()}</span>
                    <span class="module-compliance ${complianceClass[module.complianceLevel]}">
                        ${module.complianceLevel.toUpperCase()} Compliance
                    </span>
                </div>
            </div>
            <div class="module-actions">
                <button class="btn btn-sm btn-edit">Edit</button>
                <button class="btn btn-sm btn-delete">Delete</button>
            </div>
        `;

        // Add event listeners
        const editBtn = card.querySelector('.btn-edit');
        const deleteBtn = card.querySelector('.btn-delete');
        const statusToggle = card.querySelector('input[type="checkbox"]');

        editBtn.addEventListener('click', () => this.showEditModuleModal(module));
        deleteBtn.addEventListener('click', () => this.deleteModule(module._id));
        statusToggle.addEventListener('change', (e) => this.toggleModuleStatus(module._id, e.target.checked));

        return card;
    }

    async addNewModule(event) {
        console.log('Add New Module called');
        event.preventDefault();

        const form = event.target;
        const formData = new FormData(form);

        // Collect form data
        const moduleData = {
            name: formData.get('moduleName'),
            category: formData.get('moduleCategory'),
            description: formData.get('moduleDescription'),
            complianceLevel: formData.get('complianceLevel'),
            permissions: Array.from(form.querySelectorAll('input[name="permissions"]:checked'))
                .map(checkbox => checkbox.value),
            subscriptionTiers: Array.from(form.querySelectorAll('input[name="subscriptionTiers"]:checked'))
                .map(checkbox => checkbox.value),
            isActive: true
        };

        console.log('Module Data:', moduleData);

        try {
            // Validate required fields
            if (!moduleData.name || !moduleData.category || !moduleData.description) {
                this.showNotification('Please fill in all required fields', 'error');
                return;
            }

            const response = await fetch(`${this.baseUrl}/modules`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(moduleData)
            });

            const result = await response.json();
            console.log('Add Module Response:', result);

            if (result.success) {
                this.showNotification('Module added successfully', 'success');
                this.closeModal();
                this.fetchModules();
                this.fetchActivityLogs();
                form.reset();
            } else {
                throw new Error(result.message || 'Failed to add module');
            }
        } catch (error) {
            console.error('Add module error:', error);
            this.showNotification(error.message, 'error');
        }
    }

        showEditModuleModal(module) {
        console.log('Show Edit Module Modal called', module);
        
        const modal = document.getElementById('editModuleModal');
        if (!modal) {
            this.showNotification('Edit Modal not found', 'error');
            return;
        }

        // Populate form fields
        const form = modal.querySelector('form');
        
        // Hidden ID field
        const moduleIdField = form.querySelector('input[name="moduleId"]');
        if (moduleIdField) {
            moduleIdField.value = module._id;
        }

        // Module Name
        const nameField = form.querySelector('input[name="moduleName"]');
        if (nameField) {
            nameField.value = module.name;
        }

        // Category
        const categoryField = form.querySelector('select[name="moduleCategory"]');
        if (categoryField) {
            categoryField.value = module.category;
        }

        // Description
        const descriptionField = form.querySelector('textarea[name="moduleDescription"]');
        if (descriptionField) {
            descriptionField.value = module.description;
        }

        // Compliance Level
        const complianceLevelField = form.querySelector('select[name="complianceLevel"]');
        if (complianceLevelField) {
            complianceLevelField.value = module.complianceLevel;
        }

        // Permissions
        const permissionCheckboxes = form.querySelectorAll('input[name="permissions"]');
        permissionCheckboxes.forEach(checkbox => {
            checkbox.checked = module.permissions ? 
                module.permissions.includes(checkbox.value) : 
                false;
        });

        // Subscription Tiers
        const tierCheckboxes = form.querySelectorAll('input[name="subscriptionTiers"]');
        tierCheckboxes.forEach(checkbox => {
            checkbox.checked = module.subscriptionTiers ? 
                module.subscriptionTiers.includes(checkbox.value) : 
                false;
        });

        // Show modal
        modal.style.display = 'flex';
        modal.classList.add('show');

        console.log('Edit Module Modal displayed');
    }

    async updateModule(event) {
        console.log('Update Module called');
        event.preventDefault();

        const form = event.target;
        const formData = new FormData(form);
        const moduleId = formData.get('moduleId');

        const moduleData = {
            name: formData.get('moduleName'),
            category: formData.get('moduleCategory'),
            description: formData.get('moduleDescription'),
            complianceLevel: formData.get('complianceLevel'),
            permissions: Array.from(form.querySelectorAll('input[name="permissions"]:checked'))
                .map(checkbox => checkbox.value),
            subscriptionTiers: Array.from(form.querySelectorAll('input[name="subscriptionTiers"]:checked'))
                .map(checkbox => checkbox.value)
        };

        console.log('Update Module Data:', moduleData);

        try {
            const response = await fetch(`${this.baseUrl}/modules/${moduleId}`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${this.token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(moduleData)
            });

            const result = await response.json();
            console.log('Update Module Response:', result);

            if (result.success) {
                this.showNotification('Module updated successfully', 'success');
                this.closeModal();
                this.fetchModules();
                this.fetchActivityLogs();
            } else {
                throw new Error(result.message || 'Failed to update module');
            }
        } catch (error) {
            console.error('Update module error:', error);
            this.showNotification(error.message, 'error');
        }
    }

    async deleteModule(moduleId) {
        console.log('Delete Module called', moduleId);

        try {
            const confirmDelete = window.confirm('Are you sure you want to delete this module?');
            if (!confirmDelete) return;

            const response = await fetch(`${this.baseUrl}/modules/${moduleId}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${this.token}`,
                    'Content-Type': 'application/json'
                }
            });

            const result = await response.json();
            console.log('Delete Module Response:', result);

            if (result.success) {
                this.showNotification('Module deleted successfully', 'success');
                this.fetchModules();
                this.fetchActivityLogs();
            } else {
                throw new Error(result.message || 'Failed to delete module');
            }
        } catch (error) {
            console.error('Delete module error:', error);
            this.showNotification(error.message, 'error');
        }
    }

    async toggleModuleStatus(moduleId, isActive) {
        console.log('Toggle Module Status called', moduleId, isActive);

        try {
            const response = await fetch(`${this.baseUrl}/modules/${moduleId}/status`, {
                method: 'PATCH',
                headers: {
                    'Authorization': `Bearer ${this.token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ isActive })
            });

            const result = await response.json();
            console.log('Toggle Module Status Response:', result);

            if (result.success) {
                this.showNotification(
                    `Module ${isActive ? 'activated' : 'deactivated'} successfully`, 
                    'success'
                );
                this.fetchModules();
                this.fetchActivityLogs();
            } else {
                throw new Error(result.message || 'Failed to update module status');
            }
        } catch (error) {
            console.error('Toggle module status error:', error);
            this.showNotification(error.message, 'error');
        }
    }

        async fetchActivityLogs() {
        console.log('Fetching Activity Logs');
        try {
            const response = await fetch(`${this.baseUrl}/modules/activity-logs`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${this.token}`,
                    'Content-Type': 'application/json'
                }
            });

            const result = await response.json();
            console.log('Activity Logs Response:', result);

            if (result.success) {
                this.renderActivityLogs(result.data);
            } else {
                throw new Error(result.message || 'Failed to fetch activity logs');
            }
        } catch (error) {
            console.error('Activity logs fetch error:', error);
            this.showNotification(error.message, 'error');
        }
    }

    renderActivityLogs(logs) {
        console.log('Rendering Activity Logs:', logs);
        const logsBody = document.getElementById('activityLogsBody');
        if (!logsBody) {
            console.error('Activity Logs Body not found');
            return;
        }

        // Clear existing logs
        logsBody.innerHTML = '';

        // Handle empty logs
        if (!logs || logs.length === 0) {
            logsBody.innerHTML = `
                <tr>
                    <td colspan="5" class="text-center">No activity logs found</td>
                </tr>
            `;
            return;
        }

        logs.forEach(log => {
            const row = document.createElement('tr');
            
            // Determine status class
            const statusClass = this.getActivityStatusClass(log.type);

            row.innerHTML = `
                <td>${new Date(log.timestamp).toLocaleString()}</td>
                <td>${log.moduleName || 'Unknown Module'}</td>
                <td>${log.activity || 'No Activity'}</td>
                <td>${log.userName || 'System'}</td>
                <td>
                    <span class="activity-status ${statusClass}">
                        ${this.formatActivityType(log.type)}
                    </span>
                </td>
            `;

            logsBody.appendChild(row);
        });
    }

    filterActivityLogs() {
        console.log('Filtering Activity Logs');
        const filter = document.getElementById('activityLogFilter').value;
        const logRows = document.querySelectorAll('#activityLogsBody tr');

        logRows.forEach(row => {
            const activityCell = row.querySelector('td:nth-child(3)');
            const statusCell = row.querySelector('.activity-status');

            const matchesFilter = 
                filter === 'all' || 
                (filter === 'created' && statusCell.textContent.toLowerCase().includes('created')) ||
                (filter === 'updated' && statusCell.textContent.toLowerCase().includes('updated')) ||
                (filter === 'deleted' && statusCell.textContent.toLowerCase().includes('deleted')) ||
                (filter === 'status-changed' && statusCell.textContent.toLowerCase().includes('status'));

            row.style.display = matchesFilter ? '' : 'none';
        });
    }

    getActivityStatusClass(type) {
        const statusClasses = {
            'MODULE_CREATED': 'status-success',
            'MODULE_UPDATED': 'status-warning',
            'MODULE_DELETED': 'status-danger',
            'MODULE_STATUS_CHANGED': 'status-warning'
        };

        return statusClasses[type] || 'status-warning';
    }

    formatActivityType(type) {
        return type
            .replace('MODULE_', '')
            .replace(/_/g, ' ')
            .toLowerCase()
            .replace(/\b\w/g, l => l.toUpperCase());
    }

    // Compliance and Security Methods
    checkModuleComplianceRisks(module) {
        const complianceRisks = [];

        // Check compliance level
        if (module.complianceLevel === 'low') {
            complianceRisks.push('Low compliance level detected');
        }

        // Check permissions
        if (!module.permissions || module.permissions.length === 0) {
            complianceRisks.push('No permissions defined');
        }

        // Check subscription tiers
        if (!module.subscriptionTiers || module.subscriptionTiers.length === 0) {
            complianceRisks.push('No subscription tiers defined');
        }

        return complianceRisks;
    }

    generateComplianceReport() {
        // This method would typically fetch current modules and generate a report
        const modules = []; // In a real implementation, this would come from a method that retrieves current modules
        const complianceReports = modules.map(module => ({
            moduleName: module.name,
            complianceLevel: module.complianceLevel,
            risks: this.checkModuleComplianceRisks(module)
        }));

        return complianceReports;
    }
}

// Global initialization
window.ModulesManager = ModulesManager;

// Content loaded event listener
document.addEventListener('contentLoaded', (event) => {
    console.log('Content Loaded Event:', event.detail);
    
    if (event.detail.section === 'modules') {
        console.log('Initializing Modules Manager');
        window.modulesManagerInstance = new ModulesManager('https://18.215.160.136.nip.io/api');
    }
});

// Fallback initialization
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM Content Loaded');
    if (!window.modulesManagerInstance) {
        window.modulesManagerInstance = new ModulesManager('https://18.215.160.136.nip.io/api');
    }
});
})(); 

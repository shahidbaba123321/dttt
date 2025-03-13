// public/dashboard/js/mainmodule.js
(function() {
    // Check if ModulesManager already exists
    if (window.ModulesManager) {
        return; // Exit if already defined
    }

class ModulesManager {
    constructor(apiBaseUrl) {
        this.baseUrl = apiBaseUrl || 'https://18.215.160.136.nip.io/api';
        this.token = localStorage.getItem('token');
        
        // Bind methods to ensure correct context
        this.fetchModules = this.fetchModules.bind(this);
        this.renderModules = this.renderModules.bind(this);
        this.addNewModule = this.addNewModule.bind(this);
        this.updateModule = this.updateModule.bind(this);
        this.deleteModule = this.deleteModule.bind(this);
        this.toggleModuleStatus = this.toggleModuleStatus.bind(this);

        // Initialize the module management interface
        this.initializeEventListeners();
        this.fetchModules();
    }

    initializeEventListeners() {
        // Add New Module Button
        const addNewModuleBtn = document.getElementById('addNewModuleBtn');
        if (addNewModuleBtn) {
            addNewModuleBtn.addEventListener('click', () => this.showAddModuleModal());
        }

        // Add Module Form Submission
        const addModuleForm = document.getElementById('addModuleForm');
        if (addModuleForm) {
            addModuleForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.addNewModule(e.target);
            });
        }

        // Edit Module Form Submission
        const editModuleForm = document.getElementById('editModuleForm');
        if (editModuleForm) {
            editModuleForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.updateModule(e.target);
            });
        }

        // Modal Close Buttons
        const modalCloseButtons = document.querySelectorAll('.modal-close');
        modalCloseButtons.forEach(button => {
            button.addEventListener('click', () => this.closeModal());
        });

        // Cancel Buttons
        const cancelButtons = document.querySelectorAll('#cancelAddModule, #cancelEditModule');
        cancelButtons.forEach(button => {
            button.addEventListener('click', () => this.closeModal());
        });

        // Activity Log Filter
        const activityLogFilter = document.getElementById('activityLogFilter');
        if (activityLogFilter) {
            activityLogFilter.addEventListener('change', () => this.filterActivityLogs());
        }
    }

    async fetchModules() {
        try {
            const response = await fetch(`${this.baseUrl}/modules`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${this.token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error('Failed to fetch modules');
            }

            const data = await response.json();
            
            if (data.success) {
                this.renderModules(data.data);
                this.fetchActivityLogs();
            } else {
                throw new Error(data.message || 'Unknown error fetching modules');
            }
        } catch (error) {
            this.showNotification(error.message, 'error');
            console.error('Modules fetch error:', error);
        }
    }

    renderModules(modules) {
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
                <div class="module-icon">
                    <i class="fas ${this.getModuleIcon(module.category)}"></i>
                </div>
                <div class="module-status-toggle">
                    <input type="checkbox" id="moduleStatus-${module._id}" 
                           ${module.isActive ? 'checked' : ''}>
                    <label for="moduleStatus-${module._id}" class="toggle-switch"></label>
                </div>
            </div>
            <div class="module-card-content">
                <h4 class="module-title">${module.name}</h4>
                <p class="module-description">${module.description}</p>
                <div class="module-meta">
                    <span class="module-compliance-badge ${complianceClass[module.complianceLevel]}">
                        ${module.complianceLevel.toUpperCase()} Compliance
                    </span>
                    <span class="module-tier">${module.subscriptionTiers.join(', ')}</span>
                </div>
            </div>
            <div class="module-actions">
                <button class="module-action-btn edit-module">
                    <i class="fas fa-edit"></i> Edit
                </button>
                <button class="module-action-btn delete-module">
                    <i class="fas fa-trash"></i> Delete
                </button>
            </div>
        `;

        // Add event listeners for module actions
        const editBtn = card.querySelector('.edit-module');
        const deleteBtn = card.querySelector('.delete-module');
        const statusToggle = card.querySelector('input[type="checkbox"]');

        editBtn.addEventListener('click', () => this.showEditModuleModal(module));
        deleteBtn.addEventListener('click', () => this.deleteModule(module._id));
        statusToggle.addEventListener('change', (e) => this.toggleModuleStatus(module._id, e.target.checked));

        return card;
    }

        getModuleIcon(category) {
        const icons = {
            'hr': 'fa-users',
            'finance': 'fa-chart-line',
            'operations': 'fa-cogs',
            'integrations': 'fa-plug'
        };
        return icons[category] || 'fa-cube';
    }

    showAddModuleModal() {
        const modal = document.getElementById('addModuleModal');
        if (modal) {
            // Reset form
            const form = modal.querySelector('form');
            form.reset();
            modal.classList.add('show');
        }
    }

    showEditModuleModal(module) {
        const modal = document.getElementById('editModuleModal');
        if (!modal) return;

        // Populate form with module data
        const form = modal.querySelector('form');
        form.querySelector('input[name="moduleId"]').value = module._id;
        form.querySelector('input[name="moduleName"]').value = module.name;
        form.querySelector('select[name="moduleCategory"]').value = module.category;
        form.querySelector('textarea[name="moduleDescription"]').value = module.description;

        // Set compliance level
        form.querySelector('select[name="complianceLevel"]').value = module.complianceLevel;
        
        // Set permissions
        const permissionCheckboxes = form.querySelectorAll('input[name="permissions"]');
        permissionCheckboxes.forEach(checkbox => {
            checkbox.checked = module.permissions.includes(checkbox.value);
        });

        // Set subscription tiers
        const tierCheckboxes = form.querySelectorAll('input[name="subscriptionTiers"]');
        tierCheckboxes.forEach(checkbox => {
            checkbox.checked = module.subscriptionTiers.includes(checkbox.value);
        });

        modal.classList.add('show');
    }

    closeModal() {
        const modals = document.querySelectorAll('.modal');
        modals.forEach(modal => modal.classList.remove('show'));
    }

    async addNewModule(form) {
        try {
            const formData = new FormData(form);
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

            const response = await fetch(`${this.baseUrl}/modules`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(moduleData)
            });

            const result = await response.json();

            if (!result.success) {
                throw new Error(result.message || 'Failed to add module');
            }

            this.showNotification('Module added successfully', 'success');
            this.closeModal();
            this.fetchModules();
        } catch (error) {
            this.showNotification(error.message, 'error');
            console.error('Add module error:', error);
        }
    }

    async updateModule(form) {
        try {
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

            const response = await fetch(`${this.baseUrl}/modules/${moduleId}`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${this.token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(moduleData)
            });

            const result = await response.json();

            if (!result.success) {
                throw new Error(result.message || 'Failed to update module');
            }

            this.showNotification('Module updated successfully', 'success');
            this.closeModal();
            this.fetchModules();
        } catch (error) {
            this.showNotification(error.message, 'error');
            console.error('Update module error:', error);
        }
    }

    async deleteModule(moduleId) {
        try {
            // Confirm deletion
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

            if (!result.success) {
                throw new Error(result.message || 'Failed to delete module');
            }

            this.showNotification('Module deleted successfully', 'success');
            this.fetchModules();
        } catch (error) {
            this.showNotification(error.message, 'error');
            console.error('Delete module error:', error);
        }
    }

        async toggleModuleStatus(moduleId, isActive) {
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

            if (!result.success) {
                throw new Error(result.message || 'Failed to update module status');
            }

            this.showNotification(
                `Module ${isActive ? 'activated' : 'deactivated'} successfully`, 
                'success'
            );

            // Optionally refresh modules or update specific module card
            this.fetchModules();
        } catch (error) {
            // Revert the toggle if API call fails
            const moduleCard = document.querySelector(`.module-card[data-module-id="${moduleId}"]`);
            if (moduleCard) {
                const statusToggle = moduleCard.querySelector('input[type="checkbox"]');
                statusToggle.checked = !isActive;
            }

            this.showNotification(error.message, 'error');
            console.error('Toggle module status error:', error);
        }
    }

    async fetchActivityLogs() {
        try {
            const response = await fetch(`${this.baseUrl}/modules/activity-logs`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${this.token}`,
                    'Content-Type': 'application/json'
                }
            });

            const result = await response.json();

            if (!result.success) {
                throw new Error(result.message || 'Failed to fetch activity logs');
            }

            this.renderActivityLogs(result.data);
        } catch (error) {
            this.showNotification(error.message, 'error');
            console.error('Fetch activity logs error:', error);
        }
    }

    renderActivityLogs(logs) {
        const logsBody = document.getElementById('activityLogsBody');
        if (!logsBody) return;

        // Clear existing logs
        logsBody.innerHTML = '';

        logs.forEach(log => {
            const row = document.createElement('tr');
            
            // Determine status class
            const statusClass = this.getActivityStatusClass(log.type);

            row.innerHTML = `
                <td>${new Date(log.timestamp).toLocaleString()}</td>
                <td>${log.moduleName}</td>
                <td>${log.activity}</td>
                <td>${log.userName}</td>
                <td>
                    <span class="activity-status ${statusClass}">
                        ${log.type.replace('_', ' ').toUpperCase()}
                    </span>
                </td>
            `;

            logsBody.appendChild(row);
        });
    }

    filterActivityLogs() {
        const filter = document.getElementById('activityLogFilter').value;
        const logRows = document.querySelectorAll('#activityLogsBody tr');

        logRows.forEach(row => {
            const activityCell = row.querySelector('td:nth-child(3)');
            const statusCell = row.querySelector('.activity-status');

            if (filter === 'all' || 
                filter === activityCell.textContent.toLowerCase() || 
                filter === statusCell.textContent.toLowerCase().replace(' ', '-')) {
                row.style.display = '';
            } else {
                row.style.display = 'none';
            }
        });
    }

    getActivityStatusClass(type) {
        const statusClasses = {
            'created': 'status-success',
            'updated': 'status-warning',
            'deleted': 'status-danger',
            'status_changed': 'status-warning'
        };

        return statusClasses[type.toLowerCase()] || 'status-warning';
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

    // Compliance and Security Methods
    checkModuleComplianceRisks(module) {
        const complianceRisks = [];

        // Check compliance level
        if (module.complianceLevel === 'low') {
            complianceRisks.push('Low compliance level detected');
        }

        // Check permissions
        if (!module.permissions.includes('view') && !module.permissions.includes('edit')) {
            complianceRisks.push('Insufficient access controls');
        }

        // Check subscription tiers
        if (!module.subscriptionTiers.includes('enterprise')) {
            complianceRisks.push('Limited advanced security features');
        }

        return complianceRisks;
    }

    generateComplianceReport() {
        // Placeholder for generating a detailed compliance report
        const modules = this.getCurrentModules(); // Implement this method to get current modules
        const complianceReports = modules.map(module => ({
            moduleName: module.name,
            complianceLevel: module.complianceLevel,
            risks: this.checkModuleComplianceRisks(module)
        }));

        return complianceReports;
    }
}

// Initialize the Modules Manager when the script loads
window.ModulesManager = ModulesManager;

// Ensure the module is initialized when content is loaded
document.addEventListener('contentLoaded', (event) => {
    if (event.detail.section === 'modules') {
        window.modulesManagerInstance = new ModulesManager();
    }
});
})(); 

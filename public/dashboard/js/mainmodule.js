(function() {
    'use strict';

    // Check if ModulesManager already exists
    if (window.ModulesManager) {
        console.log('ModulesManager already exists');
        return;
    }

    class ModulesManager {
        constructor(apiBaseUrl = 'https://18.215.160.136.nip.io/api') {
            this.baseUrl = apiBaseUrl;
            this.token = localStorage.getItem('token');
            this.currentPage = 1;
            this.pageSize = 10;
            this.totalModules = 0;
            this.modules = [];
            this.currentModuleId = null;
            this.currentModule = null;
            
            // Predefined categories and compliance levels
            this.categories = [
                'HR', 
                'Finance', 
                'Operations', 
                'Integrations'
            ];

            this.complianceLevels = [
                'low', 
                'medium', 
                'high'
            ];

            this.filters = {
                category: '',
                complianceLevel: '',
                status: ''
            };

            // Initialize the module
            this.init();
        }

        async init() {
            try {
                await this.validateApiEndpoint();
                await this.initializeElements();
                await this.loadModules();
                this.initializeEventListeners();
            } catch (error) {
                console.error('Initialization error:', error);
                this.showError('Failed to initialize modules module');
            }
        }

        async validateApiEndpoint() {
            try {
                const response = await fetch(`${this.baseUrl}/modules`, {
                    method: 'GET',
                    headers: this.getHeaders()
                });

                if (response.status === 401) {
                    localStorage.removeItem('token');
                    window.location.href = '/login.html';
                    return false;
                }

                if (!response.ok) {
                    throw new Error(`API validation failed: ${response.status}`);
                }

                return true;
            } catch (error) {
                console.error('API endpoint validation error:', error);
                this.showError('Failed to validate API endpoint');
                return false;
            }
        }

        getHeaders() {
            return {
                'Authorization': `Bearer ${this.token}`,
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            };
        }

        async handleApiRequest(endpoint, options = {}) {
            try {
                const url = `${this.baseUrl}${endpoint}`;
                const response = await fetch(url, {
                    ...options,
                    headers: {
                        ...this.getHeaders(),
                        ...options.headers
                    }
                });

                const data = await response.json();

                if (!response.ok) {
                    throw new Error(data.message || 'Request failed');
                }

                return data;
            } catch (error) {
                console.error('API request error:', error);
                throw error;
            }
        }

        async initializeElements() {
            this.modulesGrid = document.getElementById('modulesGrid');
            this.addModuleBtn = document.getElementById('addModuleBtn');
            
            // Filter elements
            this.categoryFilter = document.getElementById('moduleCategoryFilter');
            this.complianceFilter = document.getElementById('moduleComplianceFilter');
            this.statusFilter = document.getElementById('moduleStatusFilter');
        }

        initializeEventListeners() {
            // Add Module Button
            if (this.addModuleBtn) {
                this.addModuleBtn.addEventListener('click', () => this.showAddModuleModal());
            }

            // Filter Event Listeners
            if (this.categoryFilter) {
                this.categoryFilter.addEventListener('change', () => {
                    this.filters.category = this.categoryFilter.value;
                    this.loadModules();
                });
            }

            if (this.complianceFilter) {
                this.complianceFilter.addEventListener('change', () => {
                    this.filters.complianceLevel = this.complianceFilter.value;
                    this.loadModules();
                });
            }

            if (this.statusFilter) {
                this.statusFilter.addEventListener('change', () => {
                    this.filters.status = this.statusFilter.value;
                    this.loadModules();
                });
            }
        }

        async loadModules() {
            try {
                this.showLoading();

                const queryParams = new URLSearchParams({
                    page: this.currentPage,
                    limit: this.pageSize,
                    ...this.filters
                });

                const result = await this.handleApiRequest(`/modules?${queryParams}`);
                
                if (result) {
                    this.totalModules = result.total;
                    this.modules = result.data;
                    this.renderModules(this.modules);
                }
            } catch (error) {
                console.error('Error loading modules:', error);
                this.showError('Failed to load modules');
            } finally {
                this.hideLoading();
            }
        }

        renderModules(modules) {
            if (!modules.length) {
                this.modulesGrid.innerHTML = `
                    <div class="empty-state">
                        <i class="fas fa-cubes"></i>
                        <h3>No Modules Found</h3>
                        <p>There are no modules matching your criteria.</p>
                    </div>
                `;
                return;
            }

            this.modulesGrid.innerHTML = modules.map(module => `
                <div class="module-card" data-module-id="${module._id}">
                    <div class="module-card-header">
                        <h3>${this.escapeHtml(module.name)}</h3>
                        <span class="module-status ${module.isActive ? 'active' : 'inactive'}">
                            ${module.isActive ? 'Active' : 'Inactive'}
                        </span>
                    </div>
                    <div class="module-category">
                        ${this.escapeHtml(module.category.toUpperCase())}
                    </div>
                    <div class="module-description">
                        ${this.escapeHtml(module.description)}
                    </div>
                    <div class="module-compliance">
                        <span>Compliance:</span>
                        <span class="compliance-badge ${module.complianceLevel}">
                            ${module.complianceLevel.toUpperCase()}
                        </span>
                    </div>
                    <div class="module-actions">
                        <button class="btn-icon view" data-action="view" data-module-id="${module._id}">
                            <i class="fas fa-eye"></i>
                        </button>
                        <button class="btn-icon edit" data-action="edit" data-module-id="${module._id}">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn-icon toggle" data-action="toggle-status" data-module-id="${module._id}">
                            <i class="fas fa-power-off"></i>
                        </button>
                    </div>
                </div>
            `).join('');

            // Add event listeners for module actions
            this.modulesGrid.addEventListener('click', (e) => {
                const button = e.target.closest('button[data-action]');
                if (!button) return;

                const action = button.dataset.action;
                const moduleId = button.dataset.moduleId;

                switch (action) {
                    case 'view':
                        this.viewModuleDetails(moduleId);
                        break;
                    case 'edit':
                        this.editModule(moduleId);
                        break;
                    case 'toggle-status':
                        this.toggleModuleStatus(moduleId);
                        break;
                }
            });
        }

        showAddModuleModal() {
    try {
        const modalContent = `
            <div class="modal-content">
                <div class="modal-header">
                    <h2>Add New Module</h2>
                    <button class="close-btn"><i class="fas fa-times"></i></button>
                </div>
                <div class="modal-body">
                    <form id="addModuleForm">
                        <div class="form-group">
                            <label for="moduleName">Module Name*</label>
                            <input type="text" id="moduleName" required>
                        </div>
                        <div class="form-group">
                            <label for="moduleCategory">Category*</label>
                            <select id="moduleCategory" required>
                                <option value="">Select Category</option>
                                ${this.categories.map(category => 
                                    `<option value="${category.toLowerCase()}">${category}</option>`
                                ).join('')}
                            </select>
                        </div>
                        <div class="form-group">
                            <label for="moduleDescription">Description*</label>
                            <textarea id="moduleDescription" required></textarea>
                        </div>
                        <div class="form-group">
                            <label for="complianceLevel">Compliance Level*</label>
                            <select id="complianceLevel" required>
                                <option value="">Select Compliance Level</option>
                                ${this.complianceLevels.map(level => 
                                    `<option value="${level}">${level.charAt(0).toUpperCase() + level.slice(1)}</option>`
                                ).join('')}
                            </select>
                        </div>
                        <div class="form-group">
                            <label for="subscriptionTiers">Subscription Tiers*</label>
                            <div class="checkbox-group">
                                <label>
                                    <input type="checkbox" name="subscriptionTiers" value="basic"> Basic
                                </label>
                                <label>
                                    <input type="checkbox" name="subscriptionTiers" value="pro"> Pro
                                </label>
                                <label>
                                    <input type="checkbox" name="subscriptionTiers" value="enterprise"> Enterprise
                                </label>
                            </div>
                        </div>
                        <div class="form-group">
                            <label for="moduleStatus">Initial Status*</label>
                            <select id="moduleStatus" required>
                                <option value="active">Active</option>
                                <option value="inactive">Inactive</option>
                            </select>
                        </div>
                    </form>
                </div>
                <div class="modal-footer">
                    <button class="btn-secondary" id="cancelAddModule">Cancel</button>
                    <button class="btn-primary" id="confirmAddModule">Add Module</button>
                </div>
            </div>
        `;

        const modal = document.getElementById('moduleModal');
        modal.innerHTML = modalContent;
        this.showModal('moduleModal');

        // Add event listeners
        modal.querySelector('.close-btn').addEventListener('click', () => this.closeModals());
        modal.querySelector('#cancelAddModule').addEventListener('click', () => this.closeModals());
        modal.querySelector('#confirmAddModule').addEventListener('click', () => this.handleAddModule());
    } catch (error) {
        console.error('Error showing add module modal:', error);
        this.showError('Failed to open add module form');
    }
}


        async viewModuleDetails(moduleId) {
    try {
        // Fetch detailed module information
        const result = await this.handleApiRequest(`/modules/${moduleId}`);
        
        if (!result || !result.data) {
            throw new Error('Module details not found');
        }

        const module = result.data;

        const modalContent = `
            <div class="modal-content large">
                <div class="modal-header">
                    <h2>Module Details: ${this.escapeHtml(module.name)}</h2>
                    <button class="close-btn"><i class="fas fa-times"></i></button>
                </div>
                <div class="modal-body">
                    <div class="module-details-grid">
                        <div class="details-section">
                            <h3>Basic Information</h3>
                            <div class="info-grid">
                                <div class="info-item">
                                    <label>Name</label>
                                    <span>${this.escapeHtml(module.name)}</span>
                                </div>
                                <div class="info-item">
                                    <label>Category</label>
                                    <span class="category-badge ${module.category}">
                                        ${module.category.toUpperCase()}
                                    </span>
                                </div>
                                <div class="info-item">
                                    <label>Compliance Level</label>
                                    <span class="compliance-badge ${module.complianceLevel}">
                                        ${module.complianceLevel.toUpperCase()}
                                    </span>
                                </div>
                                <div class="info-item">
                                    <label>Status</label>
                                    <span class="status-badge ${module.isActive ? 'active' : 'inactive'}">
                                        ${module.isActive ? 'Active' : 'Inactive'}
                                    </span>
                                </div>
                            </div>
                        </div>

                        <div class="details-section">
                            <h3>Description</h3>
                            <p>${this.escapeHtml(module.description)}</p>
                        </div>

                        <div class="details-section">
                            <h3>Subscription Tiers</h3>
                            <div class="subscription-tiers">
                                ${module.subscriptionTiers.map(tier => `
                                    <span class="tier-badge ${tier}">
                                        ${tier.toUpperCase()}
                                    </span>
                                `).join('')}
                            </div>
                        </div>

                        <div class="details-section">
                            <h3>Permissions</h3>
                            <div class="permissions-list">
                                ${module.permissions ? module.permissions.map(perm => `
                                    <span class="permission-tag">${perm}</span>
                                `).join('') : 'No specific permissions'}
                            </div>
                        </div>
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="btn-secondary" id="closeModuleDetails">Close</button>
                </div>
            </div>
        `;

        const modal = document.getElementById('moduleDetailsModal');
        modal.innerHTML = modalContent;
        this.showModal('moduleDetailsModal');

        // Add close event listeners
        modal.querySelector('.close-btn').addEventListener('click', () => this.closeModals());
        modal.querySelector('#closeModuleDetails').addEventListener('click', () => this.closeModals());
    } catch (error) {
        console.error('Error viewing module details:', error);
        this.showError('Failed to load module details');
    }
}


        async editModule(moduleId) {
    try {
        // Fetch current module data
        const result = await this.handleApiRequest(`/modules/${moduleId}`);
        
        if (!result || !result.data) {
            throw new Error('Module not found');
        }

        const module = result.data;

        const modalContent = `
            <div class="modal-content">
                <div class="modal-header">
                    <h2>Edit Module: ${this.escapeHtml(module.name)}</h2>
                    <button class="close-btn"><i class="fas fa-times"></i></button>
                </div>
                <div class="modal-body">
                    <form id="editModuleForm">
                        <input type="hidden" id="moduleId" value="${module._id}">
                        <div class="form-group">
                            <label for="moduleName">Module Name*</label>
                            <input type="text" id="moduleName" value="${this.escapeHtml(module.name)}" required>
                        </div>
                        <div class="form-group">
                            <label for="moduleCategory">Category*</label>
                            <select id="moduleCategory" required>
                                ${this.categories.map(category => `
                                    <option value="${category.toLowerCase()}" 
                                        ${module.category.toLowerCase() === category.toLowerCase() ? 'selected' : ''}>
                                        ${category}
                                    </option>
                                `).join('')}
                            </select>
                        </div>
                        <div class="form-group">
                            <label for="moduleDescription">Description*</label>
                            <textarea id="moduleDescription" required>${this.escapeHtml(module.description)}</textarea>
                        </div>
                        <div class="form-group">
                            <label for="complianceLevel">Compliance Level*</label>
                            <select id="complianceLevel" required>
                                ${this.complianceLevels.map(level => `
                                    <option value="${level}" 
                                        ${module.complianceLevel === level ? 'selected' : ''}>
                                        ${level.charAt(0).toUpperCase() + level.slice(1)}
                                    </option>
                                `).join('')}
                            </select>
                        </div>
                        <div class="form-group">
                            <label for="subscriptionTiers">Subscription Tiers*</label>
                            <div class="checkbox-group">
                                <label>
                                    <input type="checkbox" name="subscriptionTiers" value="basic"
                                        ${module.subscriptionTiers.includes('basic') ? 'checked' : ''}> Basic
                                </label>
                                <label>
                                    <input type="checkbox" name="subscriptionTiers" value="pro"
                                        ${module.subscriptionTiers.includes('pro') ? 'checked' : ''}> Pro
                                </label>
                                <label>
                                    <input type="checkbox" name="subscriptionTiers" value="enterprise"
                                        ${module.subscriptionTiers.includes('enterprise') ? 'checked' : ''}> Enterprise
                                </label>
                            </div>
                        </div>
                        <div class="form-group">
                            <label for="moduleStatus">Status*</label>
                            <select id="moduleStatus" required>
                                <option value="active" ${module.isActive ? 'selected' : ''}>Active</option>
                                <option value="inactive" ${!module.isActive ? 'selected' : ''}>Inactive</option>
                            </select>
                        </div>
                    </form>
                </div>
                <div class="modal-footer">
                    <button class="btn-secondary" id="cancelEditModule">Cancel</button>
                    <button class="btn-primary" id="confirmEditModule">Update Module</button>
                </div>
            </div>
        `;

        const modal = document.getElementById('moduleModal');
        modal.innerHTML = modalContent;
        this.showModal('moduleModal');

        // Add event listeners
        modal.querySelector('.close-btn').addEventListener('click', () => this.closeModals());
        modal.querySelector('#cancelEditModule').addEventListener('click', () => this.closeModals());
        modal.querySelector('#confirmEditModule').addEventListener('click', () => this.handleEditModule());
    } catch (error) {
        console.error('Error editing module:', error);
        this.showError('Failed to open module edit form');
    }
}


       async toggleModuleStatus(moduleId) {
    try {
        // Confirm status toggle
        const confirmed = await this.showConfirmDialog(
            'Are you sure you want to toggle this module\'s status?'
        );

        if (!confirmed) return;

        // Perform status toggle
        const result = await this.handleApiRequest(`/modules/${moduleId}/status`, {
            method: 'PATCH'
        });

        if (result && result.success) {
            this.showSuccess('Module status updated successfully');
            
            // Reload modules to reflect the change
            await this.loadModules();
        }
    } catch (error) {
        console.error('Error toggling module status:', error);
        this.showError('Failed to update module status');
    }
}

        // Helper methods to support the above implementations
async handleAddModule() {
    try {
        // Collect form data
        const moduleData = {
            name: document.getElementById('moduleName').value.trim(),
            category: document.getElementById('moduleCategory').value,
            description: document.getElementById('moduleDescription').value.trim(),
            complianceLevel: document.getElementById('complianceLevel').value,
            subscriptionTiers: Array.from(
                document.querySelectorAll('input[name="subscriptionTiers"]:checked')
            ).map(checkbox => checkbox.value),
            isActive: document.getElementById('moduleStatus').value === 'active'
        };

        // Validate data
        if (!this.validateModuleData(moduleData)) {
            return;
        }

        // Disable save button during submission
        const saveButton = document.getElementById('confirmAddModule');
        saveButton.disabled = true;
        saveButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';

        // Send API request
        const result = await this.handleApiRequest('/modules', {
            method: 'POST',
            body: JSON.stringify(moduleData)
        });

        if (result) {
            this.showSuccess('Module added successfully');
            this.closeModals();
            await this.loadModules();
        }
    } catch (error) {
        console.error('Error adding module:', error);
        this.showError(error.message || 'Failed to add module');
    } finally {
        const saveButton = document.getElementById('confirmAddModule');
        if (saveButton) {
            saveButton.disabled = false;
            saveButton.innerHTML = 'Add Module';
        }
    }
}

async handleEditModule() {
    try {
        // Collect form data
        const moduleData = {
            name: document.getElementById('moduleName').value.trim(),
            category: document.getElementById('moduleCategory').value,
            description: document.getElementById('moduleDescription').value.trim(),
            complianceLevel: document.getElementById('complianceLevel').value,
            subscriptionTiers: Array.from(
                document.querySelectorAll('input[name="subscriptionTiers"]:checked')
            ).map(checkbox => checkbox.value),
            isActive: document.getElementById('moduleStatus').value === 'active'
        };

        const moduleId = document.getElementById('moduleId').value;

        // Validate data
        if (!this.validateModuleData(moduleData)) {
            return;
        }

        // Disable update button during submission
        const updateButton = document.getElementById('confirmEditModule');
        updateButton.disabled = true;
        updateButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Updating...';

        // Send API request
        const result = await this.handleApiRequest(`/modules/${moduleId}`, {
            method: 'PUT',
            body: JSON.stringify(moduleData)
        });

        if (result) {
            this.showSuccess('Module updated successfully');
            this.closeModals();
            await this.loadModules();
        }
    } catch (error) {
        console.error('Error updating module:', error);
        this.showError(error.message || 'Failed to update module');
    } finally {
        const updateButton = document.getElementById('confirmEditModule');
        if (updateButton) {
            updateButton.disabled = false;
            updateButton.innerHTML = 'Update Module';
        }
    }
}

        validateModuleData(data) {
    // Name validation
    if (!data.name || data.name.length < 2 || data.name.length > 100) {
        this.showError('Module name must be between 2 and 100 characters');
        return false;
    }

    // Category validation
    if (!this.categories.map(c => c.toLowerCase()).includes(data.category.toLowerCase())) {
        this.showError('Invalid module category');
        return false;
    }

    // Description validation
    if (!data.description || data.description.length < 10) {
        this.showError('Description must be at least 10 characters long');
        return false;
    }

    // Compliance level validation
    if (!this.complianceLevels.includes(data.complianceLevel)) {
        this.showError('Invalid compliance level');
        return false;
    }

    // Subscription tiers validation
    if (!data.subscriptionTiers || data.subscriptionTiers.length === 0) {
        this.showError('Select at least one subscription tier');
        return false;
    }

    return true;
}



        // Utility Methods
        showLoading() {
            this.modulesGrid.innerHTML = `
                <div class="content-loader">
                    <div class="loader-spinner">
                        <i class="fas fa-spinner fa-spin"></i>
                    </div>
                    <p>Loading modules...</p>
                </div>
            `;
        }

        hideLoading() {
            // Remove loading state
            const loader = this.modulesGrid.querySelector('.content-loader');
            if (loader) {
                loader.remove();
            }
        }

        showError(message) {
            if (window.dashboardApp?.userInterface) {
                window.dashboardApp.userInterface.showErrorNotification(message);
            } else {
                console.error(message);
                alert(message);
            }
        }

        escapeHtml(unsafe) {
            if (!unsafe) return '';
            return unsafe
                .replace(/&/g, "&amp;")
                .replace(/</g, "&lt;")
                .replace(/>/g, "&gt;")
                .replace(/"/g, "&quot;")
                .replace(/'/g, "&#039;");
        }
    }

    // Initialize the Modules Manager globally
    if (typeof window !== 'undefined') {
        window.ModulesManager = ModulesManager;
    }

    // Initialize on DOM load
    document.addEventListener('DOMContentLoaded', () => {
        window.modulesManager = new ModulesManager();
    });
})();

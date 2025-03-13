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

            // Bind methods to ensure correct context
            this.showAddModuleModal = this.showAddModuleModal.bind(this);
            this.handleAddModule = this.handleAddModule.bind(this);
            this.validateModuleData = this.validateModuleData.bind(this);

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
                this.addModuleBtn.addEventListener('click', (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    this.showAddModuleModal();
                });
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
            const loader = this.modulesGrid.querySelector('.content-loader');
            if (loader) {
                loader.remove();
            }
        }

        // Utility Methods for Rendering
        escapeHtml(unsafe) {
            if (!unsafe) return '';
            return unsafe
                .replace(/&/g, "&amp;")
                .replace(/</g, "&lt;")
                .replace(/>/g, "&gt;")
                .replace(/"/g, "&quot;")
                .replace(/'/g, "&#039;");
        }

        showError(message) {
            if (window.dashboardApp?.userInterface) {
                window.dashboardApp.userInterface.showErrorNotification(message);
            } else {
                console.error(message);
                alert(message);
            }
        }

        showSuccess(message) {
            if (window.dashboardApp?.userInterface) {
                window.dashboardApp.userInterface.showSuccessNotification(message);
            } else {
                console.log(message);
                alert(message);
            }
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
                                    <label>Subscription Tiers*</label>
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

        showModal(modalId) {
            const modal = document.getElementById(modalId);
            if (modal) {
                modal.style.display = 'block';
                modal.classList.add('show');
                document.body.style.overflow = 'hidden';
            }
        }

        closeModals(specificModalId = null) {
            const modals = specificModalId 
                ? [document.getElementById(specificModalId)]
                : document.querySelectorAll('.modal');

            modals.forEach(modal => {
                if (modal) {
                    modal.style.display = 'none';
                    modal.classList.remove('show');
                }
            });

            document.body.style.overflow = '';
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
                                    <label>Subscription Tiers*</label>
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

        async showConfirmDialog(message, title = 'Confirm Action') {
            return new Promise((resolve) => {
                const dialog = document.createElement('div');
                dialog.className = 'custom-dialog-overlay';
                
                dialog.innerHTML = `
                    <div class="custom-dialog confirm">
                        <div class="dialog-header">
                            <h3>${title}</h3>
                        </div>
                        <div class="dialog-content">
                            <p>${message}</p>
                        </div>
                        <div class="dialog-actions">
                            <button class="btn-secondary" id="dialogCancel">Cancel</button>
                            <button class="btn-primary" id="dialogConfirm">Confirm</button>
                        </div>
                    </div>
                `;

                document.body.appendChild(dialog);

                // Add animation class after a brief delay
                setTimeout(() => dialog.classList.add('show'), 10);

                const closeDialog = (result) => {
                    dialog.classList.remove('show');
                    setTimeout(() => {
                        dialog.remove();
                        resolve(result);
                    }, 300);
                };

                dialog.querySelector('#dialogCancel').addEventListener('click', () => closeDialog(false));
                dialog.querySelector('#dialogConfirm').addEventListener('click', () => closeDialog(true));

                // Close on overlay click
                dialog.addEventListener('click', (e) => {
                    if (e.target === dialog) {
                        closeDialog(false);
                    }
                });
            });
        }

            // Cleanup method to remove event listeners and free up resources
        cleanup() {
            // Remove module grid event listeners
            if (this.modulesGrid) {
                const oldGrid = this.modulesGrid;
                const newGrid = oldGrid.cloneNode(true);
                oldGrid.parentNode.replaceChild(newGrid, oldGrid);
            }

            // Remove add module button event listeners
            if (this.addModuleBtn) {
                const oldBtn = this.addModuleBtn;
                const newBtn = oldBtn.cloneNode(true);
                oldBtn.parentNode.replaceChild(newBtn, oldBtn);
            }

            // Remove filter event listeners
            if (this.categoryFilter) {
                const oldCategoryFilter = this.categoryFilter;
                const newCategoryFilter = oldCategoryFilter.cloneNode(true);
                oldCategoryFilter.parentNode.replaceChild(newCategoryFilter, oldCategoryFilter);
            }

            if (this.complianceFilter) {
                const oldComplianceFilter = this.complianceFilter;
                const newComplianceFilter = oldComplianceFilter.cloneNode(true);
                oldComplianceFilter.parentNode.replaceChild(newComplianceFilter, oldComplianceFilter);
            }

            if (this.statusFilter) {
                const oldStatusFilter = this.statusFilter;
                const newStatusFilter = oldStatusFilter.cloneNode(true);
                oldStatusFilter.parentNode.replaceChild(newStatusFilter, oldStatusFilter);
            }

            // Reset internal state
            this.modules = [];
            this.currentModuleId = null;
            this.currentModule = null;
            this.filters = {
                category: '',
                complianceLevel: '',
                status: ''
            };
        }
    }

    // Global initialization and setup
    document.addEventListener('DOMContentLoaded', () => {
        // Check if modulesManager is already created by ContentLoader
        if (!window.modulesManager) {
            window.modulesManager = new ModulesManager();
        }

        // Ensure modals are properly initialized
        const moduleModal = document.getElementById('moduleModal');
        const moduleDetailsModal = document.getElementById('moduleDetailsModal');
        
        if (moduleModal) {
            moduleModal.classList.add('modal');
            moduleModal.style.display = 'none';
        }
        
        if (moduleDetailsModal) {
            moduleDetailsModal.classList.add('modal');
            moduleDetailsModal.style.display = 'none';
        }

        // Add global error handling
        window.addEventListener('error', (event) => {
            console.error('Unhandled error in Modules Manager:', event.error);
        });

        // Add fallback method to ensure button works
        const addModuleBtn = document.getElementById('addModuleBtn');
        if (addModuleBtn) {
            addModuleBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                
                // Ensure ModulesManager is available
                if (window.ModulesManager && !window.modulesManager) {
                    window.modulesManager = new window.ModulesManager();
                }
                
                // Call show modal method
                if (window.modulesManager && typeof window.modulesManager.showAddModuleModal === 'function') {
                    window.modulesManager.showAddModuleModal();
                } else {
                    console.error('ModulesManager or showAddModuleModal method not available');
                }
            });
        }

        // Add method to manually trigger module initialization if needed
        window.initializeModulesManager = () => {
            if (!window.modulesManager) {
                window.modulesManager = new ModulesManager();
            }
            return window.modulesManager;
        };
    });

    // Expose ModulesManager globally
    if (typeof window !== 'undefined') {
        window.ModulesManager = ModulesManager;
    }
})();

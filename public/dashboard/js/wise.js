(function() {
    'use strict';

    // Check if WiseManager already exists
    if (window.WiseManager) {
        console.log('WiseManager already exists');
        return;
    }

    class WiseManager {
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
            this.showAddWiseModal = this.showAddWiseModal.bind(this);
            this.handleAddWise = this.handleAddWise.bind(this);
            this.validateWiseData = this.validateWiseData.bind(this);

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
                this.showError('Failed to initialize wise module');
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
            this.modulesGrid = document.getElementById('wiseGrid');
            this.addWiseBtn = document.getElementById('addWiseBtn');
            
            // Filter elements
            this.categoryFilter = document.getElementById('wiseCategoryFilter');
            this.complianceFilter = document.getElementById('wiseComplianceFilter');
            this.statusFilter = document.getElementById('wiseStatusFilter');
        }

        initializeEventListeners() {
            // Add Wise Button
            if (this.addWiseBtn) {
                this.addWiseBtn.addEventListener('click', (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    this.showAddWiseModal();
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
                        <h3>No Wise Items Found</h3>
                        <p>There are no wise items matching your criteria.</p>
                    </div>
                `;
                return;
            }

            this.modulesGrid.innerHTML = modules.map(module => `
                <div class="wise-card" data-module-id="${module._id}">
                    <div class="wise-card-header">
                        <h3>${this.escapeHtml(module.name)}</h3>
                        <span class="wise-status ${module.isActive ? 'active' : 'inactive'}">
                            ${module.isActive ? 'Active' : 'Inactive'}
                        </span>
                    </div>
                    <div class="wise-category">
                        ${this.escapeHtml(module.category.toUpperCase())}
                    </div>
                    <div class="wise-description">
                        ${this.escapeHtml(module.description)}
                    </div>
                    <div class="wise-compliance">
                        <span>Compliance:</span>
                        <span class="compliance-badge ${module.complianceLevel}">
                            ${module.complianceLevel.toUpperCase()}
                        </span>
                    </div>
                    <div class="wise-actions">
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

        // Add these methods to the WiseManager class

showLoading() {
    this.modulesGrid.innerHTML = `
        <div class="content-loader">
            <div class="loader-spinner">
                <i class="fas fa-spinner fa-spin"></i>
            </div>
            <p>Loading wise items...</p>
        </div>
    `;
}

hideLoading() {
    const loader = this.modulesGrid.querySelector('.content-loader');
    if (loader) {
        loader.remove();
    }
}

showAddWiseModal() {
    try {
        const modalContent = `
            <div class="modal-content">
                <div class="modal-header">
                    <h2>Add New Wise Item</h2>
                    <button class="close-btn"><i class="fas fa-times"></i></button>
                </div>
                <div class="modal-body">
                    <form id="addWiseForm">
                        <div class="form-group">
                            <label for="wiseName">Wise Item Name*</label>
                            <input type="text" id="wiseName" required>
                        </div>
                        <div class="form-group">
                            <label for="wiseCategory">Category*</label>
                            <select id="wiseCategory" required>
                                <option value="">Select Category</option>
                                ${this.categories.map(category => 
                                    `<option value="${category.toLowerCase()}">${category}</option>`
                                ).join('')}
                            </select>
                        </div>
                        <div class="form-group">
                            <label for="wiseDescription">Description*</label>
                            <textarea id="wiseDescription" required></textarea>
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
                            <label for="wiseStatus">Initial Status*</label>
                            <select id="wiseStatus" required>
                                <option value="active">Active</option>
                                <option value="inactive">Inactive</option>
                            </select>
                        </div>
                    </form>
                </div>
                <div class="modal-footer">
                    <button class="btn-secondary" id="cancelAddWise">Cancel</button>
                    <button class="btn-primary" id="confirmAddWise">Add Wise Item</button>
                </div>
            </div>
        `;

        const modal = document.getElementById('wiseModal');
        modal.innerHTML = modalContent;
        this.showModal('wiseModal');

        // Add event listeners
        modal.querySelector('.close-btn').addEventListener('click', () => this.closeModals());
        modal.querySelector('#cancelAddWise').addEventListener('click', () => this.closeModals());
        modal.querySelector('#confirmAddWise').addEventListener('click', () => this.handleAddWise());
    } catch (error) {
        console.error('Error showing add wise modal:', error);
        this.showError('Failed to open add wise item form');
    }
}

async handleAddWise() {
    try {
        // Collect form data
        const wiseData = {
            name: document.getElementById('wiseName').value.trim(),
            category: document.getElementById('wiseCategory').value,
            description: document.getElementById('wiseDescription').value.trim(),
            complianceLevel: document.getElementById('complianceLevel').value,
            subscriptionTiers: Array.from(
                document.querySelectorAll('input[name="subscriptionTiers"]:checked')
            ).map(checkbox => checkbox.value),
            isActive: document.getElementById('wiseStatus').value === 'active'
        };

        // Validate data
        if (!this.validateWiseData(wiseData)) {
            return;
        }

        // Disable save button during submission
        const saveButton = document.getElementById('confirmAddWise');
        saveButton.disabled = true;
        saveButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';

        // Send API request
        const result = await this.handleApiRequest('/modules', {
            method: 'POST',
            body: JSON.stringify(wiseData)
        });

        if (result) {
            this.showSuccess('Wise item added successfully');
            this.closeModals();
            await this.loadModules();
        }
    } catch (error) {
        console.error('Error adding wise item:', error);
        this.showError(error.message || 'Failed to add wise item');
    } finally {
        const saveButton = document.getElementById('confirmAddWise');
        if (saveButton) {
            saveButton.disabled = false;
            saveButton.innerHTML = 'Add Wise Item';
        }
    }
}

validateWiseData(data) {
    // Name validation
    if (!data.name || data.name.length < 2 || data.name.length > 100) {
        this.showError('Wise item name must be between 2 and 100 characters');
        return false;
    }

    // Category validation
    if (!this.categories.map(c => c.toLowerCase()).includes(data.category.toLowerCase())) {
        this.showError('Invalid wise item category');
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

async viewModuleDetails(moduleId) {
    try {
        // Fetch detailed module information
        const result = await this.handleApiRequest(`/modules/${moduleId}`);
        
        if (!result || !result.data) {
            throw new Error('Wise item details not found');
        }

        const module = result.data;

        const modalContent = `
            <div class="modal-content large">
                <div class="modal-header">
                    <h2>Wise Item Details: ${this.escapeHtml(module.name)}</h2>
                    <button class="close-btn"><i class="fas fa-times"></i></button>
                </div>
                <div class="modal-body">
                    <div class="wise-details-grid">
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
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="btn-secondary" id="closeWiseDetails">Close</button>
                </div>
            </div>
        `;

        const modal = document.getElementById('wiseDetailsModal');
        modal.innerHTML = modalContent;
        this.showModal('wiseDetailsModal');

        // Add close event listeners
        modal.querySelector('.close-btn').addEventListener('click', () => this.closeModals());
        modal.querySelector('#closeWiseDetails').addEventListener('click', () => this.closeModals());
    } catch (error) {
        console.error('Error viewing wise item details:', error);
        this.showError('Failed to load wise item details');
    }
}

async editModule(moduleId) {
    try {
        // Fetch current module data
        const result = await this.handleApiRequest(`/modules/${moduleId}`);
        
        if (!result || !result.data) {
            throw new Error('Wise item not found');
        }

        const module = result.data;

        const modalContent = `
            <div class="modal-content">
                <div class="modal-header">
                    <h2>Edit Wise Item: ${this.escapeHtml(module.name)}</h2>
                    <button class="close-btn"><i class="fas fa-times"></i></button>
                </div>
                <div class="modal-body">
                    <form id="editWiseForm">
                        <input type="hidden" id="wiseId" value="${module._id}">
                        <div class="form-group">
                            <label for="wiseName">Wise Item Name*</label>
                            <input type="text" id="wiseName" value="${this.escapeHtml(module.name)}" required>
                        </div>
                        <div class="form-group">
                            <label for="wiseCategory">Category*</label>
                            <select id="wiseCategory" required>
                                ${this.categories.map(category => `
                                    <option value="${category.toLowerCase()}" 
                                        ${module.category.toLowerCase() === category.toLowerCase() ? 'selected' : ''}>
                                        ${category}
                                    </option>
                                `).join('')}
                            </select>
                        </div>
                        <div class="form-group">
                            <label for="wiseDescription">Description*</label>
                            <textarea id="wiseDescription" required>${this.escapeHtml(module.description)}</textarea>
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
                            <label for="wiseStatus">Status*</label>
                            <select id="wiseStatus" required>
                                <option value="active" ${module.isActive ? 'selected' : ''}>Active</option>
                                <option value="inactive" ${!module.isActive ? 'selected' : ''}>Inactive</option>
                            </select>
                        </div>
                    </form>
                </div>
                <div class="modal-footer">
                    <button class="btn-secondary" id="cancelEditWise">Cancel</button>
                    <button class="btn-primary" id="confirmEditWise">Update Wise Item</button>
                </div>
            </div>
        `;

        const modal = document.getElementById('wiseModal');
        modal.innerHTML = modalContent;
        this.showModal('wiseModal');

        // Add event listeners
        modal.querySelector('.close-btn').addEventListener('click', () => this.closeModals());
        modal.querySelector('#cancelEditWise').addEventListener('click', () => this.closeModals());
        modal.querySelector('#confirmEditWise').addEventListener('click', () => this.handleEditWise());
    } catch (error) {
        console.error('Error editing wise item:', error);
        this.showError('Failed to open wise item edit form');
    }
}

async handleEditWise() {
    try {
        // Collect form data
        const wiseData = {
            name: document.getElementById('wiseName').value.trim(),
            category: document.getElementById('wiseCategory').value,
            description: document.getElementById('wiseDescription').value.trim(),
            complianceLevel: document.getElementById('complianceLevel').value,
            subscriptionTiers: Array.from(
                document.querySelectorAll('input[name="subscriptionTiers"]:checked')
            ).map(checkbox => checkbox.value),
            isActive: document.getElementById('wiseStatus').value === 'active'
        };

        const wiseId = document.getElementById('wiseId').value;

        // Validate data
        if (!this.validateWiseData(wiseData)) {
            return;
        }

        // Disable update button during submission
        const updateButton = document.getElementById('confirmEditWise');
        updateButton.disabled = true;
        updateButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Updating...';

        // Send API request
        const result = await this.handleApiRequest(`/modules/${wiseId}`, {
            method: 'PUT',
            body: JSON.stringify(wiseData)
        });

        if (result) {
            this.showSuccess('Wise item updated successfully');
            this.closeModals();
            await this.loadModules();
        }
    } catch (error) {
        console.error('Error updating wise item:', error);
        this.showError(error.message || 'Failed to update wise item');
    } finally {
        const updateButton = document.getElementById('confirmEditWise');
        if (updateButton) {
            updateButton.disabled = false;
            updateButton.innerHTML = 'Update Wise Item';
        }
    }
}

async toggleModuleStatus(moduleId) {
    try {
        // Confirm status toggle
        const confirmed = await this.showConfirmDialog(
            'Are you sure you want to toggle this wise item\'s status?'
        );

        if (!confirmed) return;

        // Perform status toggle
        const result = await this.handleApiRequest(`/modules/${moduleId}/status`, {
            method: 'PATCH'
        });

        if (result && result.success) {
            this.showSuccess('Wise item status updated successfully');
            
            // Reload modules to reflect the change
            await this.loadModules();
        }
    } catch (error) {
        console.error('Error toggling wise item status:', error);
        this.showError('Failed to update wise item status');
    }
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
        // Cleanup method
        cleanup() {
            // Remove event listeners and reset state
            if (this.modulesGrid) {
                const oldGrid = this.modulesGrid;
                const newGrid = oldGrid.cloneNode(true);
                oldGrid.parentNode.replaceChild(newGrid, oldGrid);
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

        // Utility methods
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
    }

    // Expose WiseManager globally
    if (typeof window !== 'undefined') {
        window.WiseManager = WiseManager;
    }

    // Global initialization
    document.addEventListener('DOMContentLoaded', () => {
        // Check if wiseManager is already created by ContentLoader
        if (!window.wiseManager) {
            window.wiseManager = new WiseManager();
        }

        // Ensure modals are properly initialized
        const wiseModal = document.getElementById('wiseModal');
        const wiseDetailsModal = document.getElementById('wiseDetailsModal');
        
        if (wiseModal) {
            wiseModal.classList.add('modal');
            wiseModal.style.display = 'none';
        }
        
        if (wiseDetailsModal) {
            wiseDetailsModal.classList.add('modal');
            wiseDetailsModal.style.display = 'none';
        }
    });
})();

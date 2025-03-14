(function() {
    // Check if WiseManager already exists
    if (window.WiseManager) {
        return; // Exit if already defined
    }

class WiseManager {
    constructor(apiBaseUrl) {
        this.baseUrl = apiBaseUrl;
        this.token = localStorage.getItem('token');
        this.currentPage = 1;
        this.pageSize = 10;
        this.totalModules = 0;
        this.modules = [];
        this.currentModuleId = null;
        this.filters = {
            search: '',
            category: 'all',
            complianceLevel: '',
            status: ''
        };

        // Make instance available globally
        window.wiseManager = this;
        
        this.initializeElements();
        this.initializeStyles();
        this.initializeEventListeners();
        this.loadInitialData();
    }

    initializeStyles() {
        const styles = `
            .module-toggle {
                display: flex;
                align-items: center;
                gap: 0.75rem;
            }

            .switch {
                position: relative;
                display: inline-block;
                width: 48px;
                height: 24px;
            }

            .switch input {
                opacity: 0;
                width: 0;
                height: 0;
            }

            .slider {
                position: absolute;
                cursor: pointer;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background-color: #cbd5e1;
                transition: .4s;
            }

            .slider:before {
                position: absolute;
                content: "";
                height: 18px;
                width: 18px;
                left: 3px;
                bottom: 3px;
                background-color: white;
                transition: .4s;
            }

            input:checked + .slider {
                background-color: var(--success-color);
            }

            input:focus + .slider {
                box-shadow: 0 0 1px var(--success-color);
            }

            input:checked + .slider:before {
                transform: translateX(24px);
            }

            .slider.round {
                border-radius: 24px;
            }

            .slider.round:before {
                border-radius: 50%;
            }

            .module-status {
                font-size: 0.875rem;
                font-weight: 500;
            }

            .module-active {
                color: var(--success-color);
            }

            .module-inactive {
                color: var(--text-tertiary);
            }
        `;

        const styleSheet = document.createElement('style');
        styleSheet.textContent = styles;
        document.head.appendChild(styleSheet);
    }

    initializeElements() {
        // Main containers
        this.modulesTableBody = document.getElementById('modulesTableBody');
        this.paginationControls = document.getElementById('paginationControls');
        
        // Search and filters
        this.searchInput = document.getElementById('moduleSearch');
        this.categoryTabs = document.querySelectorAll('.category-tab');
        this.complianceFilter = document.getElementById('complianceFilter');
        this.statusFilter = document.getElementById('statusFilter');
        
        // Modals
        this.moduleModal = document.getElementById('moduleModal');
        this.deleteModal = document.getElementById('deleteModal');
        this.activityLogsModal = document.getElementById('activityLogsModal');
        
        // Forms
        this.moduleForm = document.getElementById('moduleForm');
        
        // Buttons
        this.createModuleBtn = document.getElementById('createModuleBtn');
        this.saveModuleBtn = document.getElementById('saveModule');
        this.confirmDeleteBtn = document.getElementById('confirmDelete');
        
        // Modal close buttons
        this.closeModuleModal = document.getElementById('closeModuleModal');
        this.cancelModuleModal = document.getElementById('cancelModuleModal');
        this.closeDeleteModal = document.getElementById('closeDeleteModal');
        this.cancelDelete = document.getElementById('cancelDelete');

        // Stats elements
        this.startRange = document.getElementById('startRange');
        this.endRange = document.getElementById('endRange');
        this.totalModulesElement = document.getElementById('totalModules');

        // Error handling for missing elements
        Object.entries(this).forEach(([key, value]) => {
            if (key !== 'token' && key !== 'currentPage' && key !== 'pageSize' && 
                key !== 'totalModules' && key !== 'modules' && 
                key !== 'currentModuleId' && key !== 'filters' && key !== 'baseUrl' && !value) {
                console.error(`Element not found: ${key}`);
            }
        });
    }
        initializeEventListeners() {
        // Module management
        this.createModuleBtn?.addEventListener('click', () => this.showCreateModuleModal());
        this.saveModuleBtn?.addEventListener('click', () => this.saveModule());
        this.confirmDeleteBtn?.addEventListener('click', () => this.deleteModule());

        // Modal close events
        this.closeModuleModal?.addEventListener('click', () => this.closeModal(this.moduleModal));
        this.cancelModuleModal?.addEventListener('click', () => this.closeModal(this.moduleModal));
        this.closeDeleteModal?.addEventListener('click', () => this.closeModal(this.deleteModal));
        this.cancelDelete?.addEventListener('click', () => this.closeModal(this.deleteModal));

        // Category tabs
        this.categoryTabs.forEach(tab => {
            tab.addEventListener('click', (e) => {
                // Remove active class from all tabs
                this.categoryTabs.forEach(t => t.classList.remove('active'));
                
                // Add active class to clicked tab
                e.target.classList.add('active');
                
                // Set category filter
                this.filters.category = e.target.dataset.category;
                this.currentPage = 1;
                this.loadModules();
            });
        });

        // Search and filters
        this.searchInput?.addEventListener('input', debounce((e) => {
            this.filters.search = e.target.value;
            this.currentPage = 1;
            this.loadModules();
        }, 300));

        this.complianceFilter?.addEventListener('change', () => {
            this.filters.complianceLevel = this.complianceFilter.value;
            this.currentPage = 1;
            this.loadModules();
        });

        this.statusFilter?.addEventListener('change', () => {
            this.filters.status = this.statusFilter.value;
            this.currentPage = 1;
            this.loadModules();
        });

        // Form validation
        this.moduleForm?.addEventListener('submit', (e) => {
            e.preventDefault();
            this.saveModule();
        });

        // Click outside modal to close
        window.addEventListener('click', (e) => {
            if (e.target === this.moduleModal) this.closeModal(this.moduleModal);
            if (e.target === this.deleteModal) this.closeModal(this.deleteModal);
        });

        // Prevent modal close when clicking inside
        this.moduleModal?.querySelector('.modal-content')?.addEventListener('click', (e) => {
            e.stopPropagation();
        });

        this.deleteModal?.querySelector('.modal-content')?.addEventListener('click', (e) => {
            e.stopPropagation();
        });

        // Form input validation
        const moduleNameInput = document.getElementById('moduleName');
        moduleNameInput?.addEventListener('input', (e) => {
            const name = e.target.value.trim();
            if (name.length < 2) {
                e.target.setCustomValidity('Module name must be at least 2 characters long');
            } else {
                e.target.setCustomValidity('');
            }
            e.target.reportValidity();
        });
    }

    async loadInitialData() {
        try {
            this.showLoading();
            await Promise.all([
                this.loadModules(),
                this.setupActivityLogsModal()
            ]);
            this.hideLoading();
        } catch (error) {
            console.error('Error loading initial data:', error);
            this.showError('Failed to load initial data');
            this.hideLoading();
        }
    }

    async loadModules() {
        try {
            const queryParams = new URLSearchParams({
                page: this.currentPage,
                limit: this.pageSize,
                ...this.filters
            });

            // Remove undefined or empty values from query params
            Array.from(queryParams.entries()).forEach(([key, value]) => {
                if (value === 'undefined' || value === '') {
                    queryParams.delete(key);
                }
            });

            const response = await fetch(`${this.baseUrl}/modules?${queryParams}`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${this.token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error('Failed to fetch modules');
            }

            const result = await response.json();
            
            if (!result.success) {
                throw new Error(result.message || 'Failed to load modules');
            }

            this.modules = result.data || [];
            this.totalModules = result.pagination.total || 0;

            this.renderModules();
            this.updatePagination();
            this.updateDisplayRange();

        } catch (error) {
            console.error('Error loading modules:', error);
            this.showError('Failed to load modules');
        }
    }

    renderModules() {
        if (!this.modulesTableBody) return;

        if (!this.modules || this.modules.length === 0) {
            this.modulesTableBody.innerHTML = `
                <tr>
                    <td colspan="7" class="no-data">
                        <div class="no-data-message">
                            <i class="fas fa-cubes"></i>
                            <p>No modules found</p>
                        </div>
                    </td>
                </tr>
            `;
            return;
        }

        this.modulesTableBody.innerHTML = this.modules.map(module => `
            <tr>
                <td>
                    <span class="module-name">${this.escapeHtml(module.name)}</span>
                </td>
                <td>
                    <span class="module-category-badge ${module.category}">
                        ${this.escapeHtml(this.capitalizeFirstLetter(module.category))}
                    </span>
                </td>
                <td>${this.escapeHtml(module.description)}</td>
                <td>
                    <span class="compliance-badge ${module.complianceLevel}">
                        ${this.capitalizeFirstLetter(module.complianceLevel)}
                    </span>
                </td>
                <td>
                    <div class="module-toggle">
                        <label class="switch">
                            <input type="checkbox" 
                                   ${module.isActive ? 'checked' : ''} 
                                   data-action="toggle-status"
                                   data-module-id="${module._id}">
                            <span class="slider round"></span>
                        </label>
                        <span class="module-status ${module.isActive ? 'module-active' : 'module-inactive'}">
                            ${module.isActive ? 'Active' : 'Inactive'}
                        </span>
                    </div>
                </td>
                <td>
                    <div class="subscription-tiers">
                        ${module.subscriptionTiers.map(tier => `
                            <span class="subscription-tier">${this.capitalizeFirstLetter(tier)}</span>
                        `).join('')}
                    </div>
                </td>
                <td>
                    <div class="action-buttons">
                        <button class="action-button edit" 
                                data-action="edit"
                                data-module-id="${module._id}"
                                title="Edit Module">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="action-button" 
                                data-action="activity-logs"
                                data-module-id="${module._id}"
                                title="View Activity Logs">
                            <i class="fas fa-history"></i>
                        </button>
                        <button class="action-button delete" 
                                data-action="delete"
                                data-module-id="${module._id}"
                                title="Delete Module">
                            <i class="fas fa-trash-alt"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `).join('');

        this.initializeTableActions();
    }

        initializeTableActions() {
        if (!this.modulesTableBody) return;

        // Remove any existing event listeners
        const oldElements = this.modulesTableBody.querySelectorAll('.action-button, .switch input');
        oldElements.forEach(element => {
            element.replaceWith(element.cloneNode(true));
        });

        // Add new event listeners
        const buttons = this.modulesTableBody.querySelectorAll('.action-button');
        buttons.forEach(button => {
            button.addEventListener('click', (e) => {
                const action = button.dataset.action;
                const moduleId = button.dataset.moduleId;

                switch (action) {
                    case 'edit':
                        this.showEditModuleModal(moduleId);
                        break;
                    case 'activity-logs':
                        this.showActivityLogsModal(moduleId);
                        break;
                    case 'delete':
                        this.showDeleteModal(moduleId);
                        break;
                }
            });
        });

        // Add module status toggle listeners
        const statusToggles = this.modulesTableBody.querySelectorAll('input[data-action="toggle-status"]');
        statusToggles.forEach(toggle => {
            toggle.addEventListener('change', (e) => {
                const moduleId = toggle.dataset.moduleId;
                this.toggleModuleStatus(moduleId);
            });
        });
    }

    showCreateModuleModal() {
        this.currentModuleId = null;
        this.moduleForm.reset();
        document.getElementById('modalTitle').textContent = 'Add New Module';
        this.moduleModal.classList.add('show');
        document.getElementById('moduleName').focus();
    }

    async showEditModuleModal(moduleId) {
        try {
            this.showLoading();
            const response = await fetch(`${this.baseUrl}/modules/${moduleId}`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${this.token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) throw new Error('Failed to fetch module details');

            const result = await response.json();
            if (!result.success) throw new Error(result.message || 'Failed to fetch module details');

            const module = result.data;
            this.currentModuleId = moduleId;

            document.getElementById('modalTitle').textContent = 'Edit Module';
            document.getElementById('moduleName').value = module.name || '';
            document.getElementById('moduleCategory').value = module.category || '';
            document.getElementById('moduleDescription').value = module.description || '';
            document.getElementById('complianceLevel').value = module.complianceLevel || '';
            document.getElementById('moduleStatus').checked = module.isActive || false;

            // Set subscription tiers
            const tierCheckboxes = document.querySelectorAll('input[name="subscriptionTiers"]');
            tierCheckboxes.forEach(checkbox => {
                checkbox.checked = module.subscriptionTiers.includes(checkbox.value);
            });

            this.moduleModal.classList.add('show');
            document.getElementById('moduleName').focus();

        } catch (error) {
            console.error('Error loading module details:', error);
            this.showError('Failed to load module details');
        } finally {
            this.hideLoading();
        }
    }

    async saveModule() {
        try {
            // Collect form data
            const moduleData = {
                name: document.getElementById('moduleName').value.trim(),
                category: document.getElementById('moduleCategory').value,
                description: document.getElementById('moduleDescription').value.trim(),
                complianceLevel: document.getElementById('complianceLevel').value,
                isActive: document.getElementById('moduleStatus').checked,
                subscriptionTiers: Array.from(
                    document.querySelectorAll('input[name="subscriptionTiers"]:checked')
                ).map(checkbox => checkbox.value)
            };

            // Validate module data
            const validationErrors = this.validateModuleData(moduleData);
            if (validationErrors.length > 0) {
                this.showError(validationErrors[0]);
                return;
            }

            this.showLoading();

            const url = this.currentModuleId
                ? `${this.baseUrl}/modules/${this.currentModuleId}`
                : `${this.baseUrl}/modules`;

            const method = this.currentModuleId ? 'PUT' : 'POST';

            const response = await fetch(url, {
                method: method,
                headers: {
                    'Authorization': `Bearer ${this.token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(moduleData)
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.message || 'Failed to save module');
            }

            const result = await response.json();
            
            if (!result.success) {
                throw new Error(result.message || 'Failed to save module');
            }

            this.closeModal(this.moduleModal);
            await this.loadModules();

            this.showSuccess(
                this.currentModuleId 
                    ? 'Module updated successfully' 
                    : 'Module created successfully'
            );

        } catch (error) {
            console.error('Error saving module:', error);
            this.showError(error.message || 'Failed to save module');
        } finally {
            this.hideLoading();
        }
    }

    validateModuleData(moduleData) {
        const errors = [];

        if (!moduleData.name || moduleData.name.length < 2) {
            errors.push('Module name must be at least 2 characters long');
        }

        if (!moduleData.category) {
            errors.push('Category is required');
        }

        if (!moduleData.description) {
            errors.push('Description is required');
        }

        if (!moduleData.complianceLevel) {
            errors.push('Compliance level is required');
        }

        if (moduleData.subscriptionTiers.length === 0) {
            errors.push('At least one subscription tier must be selected');
        }

        return errors;
    }

        async deleteModule() {
        try {
            this.showLoading();

            const response = await fetch(`${this.baseUrl}/modules/${this.currentModuleId}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${this.token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.message || 'Failed to delete module');
            }

            const result = await response.json();
            
            if (!result.success) {
                throw new Error(result.message || 'Failed to delete module');
            }

            this.closeModal(this.deleteModal);
            await this.loadModules();
            this.showSuccess('Module deleted successfully');

        } catch (error) {
            console.error('Error deleting module:', error);
            this.showError(error.message || 'Failed to delete module');
        } finally {
            this.hideLoading();
        }
    }

    async toggleModuleStatus(moduleId) {
        try {
            const module = this.modules.find(m => m._id === moduleId);
            if (!module) throw new Error('Module not found');

            const newStatus = !module.isActive;

            this.showLoading();

            const response = await fetch(`${this.baseUrl}/modules/${moduleId}/status`, {
                method: 'PATCH',
                headers: {
                    'Authorization': `Bearer ${this.token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ isActive: newStatus })
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.message || 'Failed to update module status');
            }

            const result = await response.json();
            
            if (!result.success) {
                throw new Error(result.message || 'Failed to update module status');
            }

            await this.loadModules();
            this.showSuccess(`Module ${newStatus ? 'activated' : 'deactivated'} successfully`);

        } catch (error) {
            console.error('Error toggling module status:', error);
            this.showError(error.message || 'Failed to update module status');
        } finally {
            this.hideLoading();
        }
    }

    async setupActivityLogsModal() {
        // Activity logs modal initialization
        const activityLogsTableBody = document.getElementById('activityLogsTableBody');
        const logTypeFilter = document.getElementById('logTypeFilter');
        const startDateFilter = document.getElementById('startDateFilter');
        const endDateFilter = document.getElementById('endDateFilter');
        const activityLogsPagination = document.getElementById('activityLogsPagination');

        // Add event listeners for filtering activity logs
        logTypeFilter?.addEventListener('change', () => this.loadActivityLogs());
        startDateFilter?.addEventListener('change', () => this.loadActivityLogs());
        endDateFilter?.addEventListener('change', () => this.loadActivityLogs());
    }

    async showActivityLogsModal(moduleId) {
        try {
            this.showLoading();
            
            // Reset filters
            const logTypeFilter = document.getElementById('logTypeFilter');
            const startDateFilter = document.getElementById('startDateFilter');
            const endDateFilter = document.getElementById('endDateFilter');
            
            if (logTypeFilter) logTypeFilter.value = '';
            if (startDateFilter) startDateFilter.value = '';
            if (endDateFilter) endDateFilter.value = '';

            // Load initial activity logs
            await this.loadActivityLogs(moduleId);
            
            // Show modal
            this.activityLogsModal.classList.add('show');

        } catch (error) {
            console.error('Error showing activity logs:', error);
            this.showError('Failed to load activity logs');
        } finally {
            this.hideLoading();
        }
    }

    async loadActivityLogs(moduleId, page = 1) {
        try {
            const logTypeFilter = document.getElementById('logTypeFilter');
            const startDateFilter = document.getElementById('startDateFilter');
            const endDateFilter = document.getElementById('endDateFilter');
            const activityLogsTableBody = document.getElementById('activityLogsTableBody');

            const queryParams = new URLSearchParams({
                moduleId: moduleId,
                page: page,
                limit: 10,
                type: logTypeFilter?.value || '',
                startDate: startDateFilter?.value || '',
                endDate: endDateFilter?.value || ''
            });

            const response = await fetch(`${this.baseUrl}/modules/activity-logs?${queryParams}`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${this.token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error('Failed to fetch activity logs');
            }

            const result = await response.json();
            
            if (!result.success) {
                throw new Error(result.message || 'Failed to load activity logs');
            }

            // Render activity logs
            activityLogsTableBody.innerHTML = result.data.map(log => `
                <tr>
                    <td>${new Date(log.timestamp).toLocaleString()}</td>
                    <td>${this.escapeHtml(log.moduleName)}</td>
                    <td>${this.escapeHtml(log.type)}</td>
                    <td>${this.escapeHtml(log.user)}</td>
                    <td>${this.escapeHtml(JSON.stringify(log.details))}</td>
                </tr>
            `).join('');

            // Update pagination
            this.updateActivityLogsPagination(result.pagination);

        } catch (error) {
            console.error('Error loading activity logs:', error);
            this.showError('Failed to load activity logs');
        }
    }

    updateActivityLogsPagination(pagination) {
        const activityLogsPagination = document.getElementById('activityLogsPagination');
        
        if (!activityLogsPagination) return;

        let paginationHTML = '';

        // Previous button
        paginationHTML += `
            <button class="pagination-button" 
                    ${pagination.page === 1 ? 'disabled' : ''}
                    onclick="window.wiseManager.loadActivityLogs(null, ${pagination.page - 1})">
                <i class="fas fa-chevron-left"></i>
            </button>
        `;

        // Page numbers
        for (let i = 1; i <= pagination.totalPages; i++) {
            paginationHTML += `
                <button class="pagination-button ${i === pagination.page ? 'active' : ''}"
                        onclick="window.wiseManager.loadActivityLogs(null, ${i})">
                    ${i}
                </button>
            `;
        }

        // Next button
        paginationHTML += `
            <button class="pagination-button" 
                    ${pagination.page === pagination.totalPages ? 'disabled' : ''}
                    onclick="window.wiseManager.loadActivityLogs(null, ${pagination.page + 1})">
                <i class="fas fa-chevron-right"></i>
            </button>
        `;

        activityLogsPagination.innerHTML = paginationHTML;
    }

        updatePagination() {
        if (!this.paginationControls) return;

        const totalPages = Math.ceil(this.totalModules / this.pageSize);
        let paginationHTML = '';

        // Previous button
        paginationHTML += `
            <button class="pagination-button" 
                    ${this.currentPage === 1 ? 'disabled' : ''}
                    onclick="window.wiseManager.changePage(${this.currentPage - 1})">
                <i class="fas fa-chevron-left"></i>
            </button>
        `;

        // Page numbers
        for (let i = 1; i <= totalPages; i++) {
            if (
                i === 1 || 
                i === totalPages || 
                (i >= this.currentPage - 1 && i <= this.currentPage + 1)
            ) {
                paginationHTML += `
                    <button class="pagination-button ${i === this.currentPage ? 'active' : ''}"
                            onclick="window.wiseManager.changePage(${i})">
                        ${i}
                    </button>
                `;
            } else if (
                i === this.currentPage - 2 || 
                i === this.currentPage + 2
            ) {
                paginationHTML += `<span class="pagination-ellipsis">...</span>`;
            }
        }

        // Next button
        paginationHTML += `
            <button class="pagination-button" 
                    ${this.currentPage === totalPages ? 'disabled' : ''}
                    onclick="window.wiseManager.changePage(${this.currentPage + 1})">
                <i class="fas fa-chevron-right"></i>
            </button>
        `;

        this.paginationControls.innerHTML = paginationHTML;
    }

    updateDisplayRange() {
        if (!this.startRange || !this.endRange || !this.totalModulesElement) return;

        const start = (this.currentPage - 1) * this.pageSize + 1;
        const end = Math.min(start + this.pageSize - 1, this.totalModules);

        this.startRange.textContent = this.totalModules === 0 ? 0 : start;
        this.endRange.textContent = end;
        this.totalModulesElement.textContent = this.totalModules;
    }

    changePage(page) {
        const totalPages = Math.ceil(this.totalModules / this.pageSize);
        if (page < 1 || page > totalPages) return;
        
        this.currentPage = page;
        this.loadModules();
    }

    closeModal(modal) {
        if (!modal) return;
        modal.classList.remove('show');
        if (modal === this.moduleModal) {
            this.moduleForm.reset();
            this.currentModuleId = null;
        }
    }

    showLoading() {
        const loader = document.createElement('div');
        loader.className = 'loading-overlay';
        loader.innerHTML = `
            <div class="loading-spinner">
                <i class="fas fa-spinner fa-spin"></i>
                <span>Loading...</span>
            </div>
        `;
        document.body.appendChild(loader);
    }

    hideLoading() {
        const loader = document.querySelector('.loading-overlay');
        if (loader) {
            loader.remove();
        }
    }

    showError(message) {
        const notification = document.createElement('div');
        notification.className = 'notification error';
        notification.innerHTML = `
            <div class="notification-content">
                <i class="fas fa-exclamation-circle"></i>
                <span>${this.escapeHtml(message)}</span>
            </div>
        `;
        this.showNotification(notification);
    }

    showSuccess(message) {
        const notification = document.createElement('div');
        notification.className = 'notification success';
        notification.innerHTML = `
            <div class="notification-content">
                <i class="fas fa-check-circle"></i>
                <span>${this.escapeHtml(message)}</span>
            </div>
        `;
        this.showNotification(notification);
    }

    showNotification(notification) {
        // Remove existing notifications
        document.querySelectorAll('.notification').forEach(n => n.remove());

        // Add new notification
        document.body.appendChild(notification);

        // Remove after delay
        setTimeout(() => {
            notification.style.animation = 'slideOut 0.3s ease-in';
            setTimeout(() => notification.remove(), 300);
        }, 3000);
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

    capitalizeFirstLetter(string) {
        if (!string) return '';
        return string.charAt(0).toUpperCase() + string.slice(1).toLowerCase();
    }

    cleanup() {
        // Remove event listeners
        // Reset state
        // Clear references
        this.modules = [];
        this.currentModuleId = null;
        this.currentPage = 1;

        // Remove any lingering modals or notifications
        document.querySelectorAll('.notification, .loading-overlay').forEach(el => el.remove());
    }
}

// Helper function for debouncing
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Register the class globally
window.WiseManager = WiseManager;
})();

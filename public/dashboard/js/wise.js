(function() {
    'use strict';

    // Check if WiseManager already exists
    if (window.WiseManager) {
        console.log('WiseManager already exists');
        return;
    }

    class WiseManager {
        constructor(apiBaseUrl) {
            // Base configuration
            this.apiBaseUrl = apiBaseUrl;
            this.token = localStorage.getItem('token');
            
            // Pagination settings
            this.currentModulePage = 1;
            this.modulesPerPage = 10;
            this.totalModules = 0;

            this.currentAuditLogPage = 1;
            this.auditLogsPerPage = 10;
            this.totalAuditLogs = 0;

            // DOM Element References
            this.initializeDOMReferences();

            // Bind methods to ensure correct context
            this.bindMethodContext();

            // Bind events
            this.bindEvents();
        }

        initializeDOMReferences() {
            // Module Management References
            this.modulesGridContainer = document.getElementById('modulesGridContainer');
            this.addNewModuleBtn = document.getElementById('addNewModuleBtn');
            this.categoryFilter = document.getElementById('categoryFilter');
            this.complianceFilter = document.getElementById('complianceFilter');
            this.moduleSearchInput = document.getElementById('moduleSearchInput');
            this.searchModulesBtn = document.getElementById('searchModulesBtn');
            this.prevModulesPageBtn = document.getElementById('prevModulesPageBtn');
            this.nextModulesPageBtn = document.getElementById('nextModulesPageBtn');
            this.pageNumberContainer = document.getElementById('pageNumberContainer');
            this.modulesShowingCount = document.getElementById('modulesShowingCount');

            // Audit Logs References
            this.auditLogsTableBody = document.getElementById('auditLogsTableBody');
            this.auditStartDate = document.getElementById('auditStartDate');
            this.auditEndDate = document.getElementById('auditEndDate');
            this.activityTypeFilter = document.getElementById('activityTypeFilter');
            this.applyAuditFiltersBtn = document.getElementById('applyAuditFiltersBtn');
            this.prevAuditLogsPageBtn = document.getElementById('prevAuditLogsPageBtn');
            this.nextAuditLogsPageBtn = document.getElementById('nextAuditLogsPageBtn');
            this.auditLogsPageNumberContainer = document.getElementById('auditLogsPageNumberContainer');
            this.auditLogsShowingCount = document.getElementById('auditLogsShowingCount');
        }

        bindMethodContext() {
            // Bind methods to ensure correct context
            this.loadModules = this.loadModules.bind(this);
            this.renderModules = this.renderModules.bind(this);
            this.updatePagination = this.updatePagination.bind(this);
            this.changePage = this.changePage.bind(this);
            this.showAddModuleModal = this.showAddModuleModal.bind(this);
            this.createModule = this.createModule.bind(this);
            this.validateModuleForm = this.validateModuleForm.bind(this);
            this.collectModuleFormData = this.collectModuleFormData.bind(this);
            this.loadAuditLogs = this.loadAuditLogs.bind(this);
            this.renderAuditLogs = this.renderAuditLogs.bind(this);
            this.updateAuditLogPagination = this.updateAuditLogPagination.bind(this);
        }

        bindEvents() {
            // Module Management Events
            this.addNewModuleBtn.addEventListener('click', this.showAddModuleModal);
            this.categoryFilter.addEventListener('change', this.loadModules);
            this.complianceFilter.addEventListener('change', this.loadModules);
            this.searchModulesBtn.addEventListener('click', this.loadModules);
            this.prevModulesPageBtn.addEventListener('click', () => this.changePage(-1));
            this.nextModulesPageBtn.addEventListener('click', () => this.changePage(1));

            // Audit Logs Events
            this.applyAuditFiltersBtn.addEventListener('click', this.loadAuditLogs);
            this.prevAuditLogsPageBtn.addEventListener('click', () => this.changeAuditLogPage(-1));
            this.nextAuditLogsPageBtn.addEventListener('click', () => this.changeAuditLogPage(1));
        }

        async fetchWithAuth(url, options = {}) {
            const defaultHeaders = {
                'Authorization': `Bearer ${this.token}`,
                'Content-Type': 'application/json'
            };

            const mergedOptions = {
                ...options,
                headers: {
                    ...defaultHeaders,
                    ...options.headers
                }
            };

            try {
                const response = await fetch(url, mergedOptions);
                
                if (!response.ok) {
                    const errorData = await response.json();
                    throw new Error(errorData.message || 'An error occurred');
                }

                return await response.json();
            } catch (error) {
                console.error('Fetch error:', error);
                this.showNotification(error.message, 'error');
                throw error;
            }
        }

        showNotification(message, type = 'info') {
            // Reuse the notification method from the main dashboard
            if (window.dashboardApp && window.dashboardApp.userInterface) {
                window.dashboardApp.userInterface.showNotification(message, type);
            } else {
                console.log(`${type.toUpperCase()}: ${message}`);
            }
        }

            async loadModules() {
            try {
                // Prepare query parameters
                const category = this.categoryFilter.value;
                const complianceLevel = this.complianceFilter.value;
                const search = this.moduleSearchInput.value.trim();

                // Construct query string
                const queryParams = new URLSearchParams({
                    page: this.currentModulePage,
                    limit: this.modulesPerPage,
                    ...(category && { category }),
                    ...(complianceLevel && { complianceLevel }),
                    ...(search && { search })
                });

                // Fetch modules
                const response = await this.fetchWithAuth(
                    `${this.apiBaseUrl}/modules?${queryParams}`
                );

                // Update total modules and pagination
                this.totalModules = response.pagination.total;
                this.updatePagination(response.pagination);

                // Render modules
                this.renderModules(response.data);

            } catch (error) {
                console.error('Error loading modules:', error);
                this.modulesGridContainer.innerHTML = `
                    <div class="error-message">
                        <i class="fas fa-exclamation-triangle"></i>
                        <p>Failed to load modules. ${error.message}</p>
                    </div>
                `;
            }
        }

        renderModules(modules) {
            // Clear existing modules
            this.modulesGridContainer.innerHTML = '';

            // Check if no modules
            if (!modules || modules.length === 0) {
                this.modulesGridContainer.innerHTML = `
                    <div class="no-modules">
                        <i class="fas fa-cube"></i>
                        <p>No modules found</p>
                    </div>
                `;
                return;
            }

            // Render each module
            modules.forEach(module => {
                const moduleCard = document.createElement('div');
                moduleCard.className = 'module-card';
                moduleCard.innerHTML = `
                    <div class="module-card-header">
                        <h3 class="module-title">${this.sanitizeInput(module.name)}</h3>
                        <div class="module-status">
                            <span class="status-indicator ${module.isActive ? 'status-active' : 'status-inactive'}"></span>
                            ${module.isActive ? 'Active' : 'Inactive'}
                        </div>
                    </div>
                    <div class="module-category">
                        ${this.sanitizeInput(module.category.toUpperCase())}
                    </div>
                    <div class="module-description">
                        ${this.sanitizeInput(module.description)}
                    </div>
                    <div class="module-details">
                        <div class="module-compliance">
                            Compliance: ${this.sanitizeInput(module.complianceLevel.toUpperCase())}
                        </div>
                    </div>
                    <div class="module-actions">
                        <button class="module-action-btn edit-module" data-id="${module._id}">
                            <i class="fas fa-edit"></i> Edit
                        </button>
                        <button class="module-action-btn delete-module" data-id="${module._id}">
                            <i class="fas fa-trash"></i> Delete
                        </button>
                    </div>
                `;

                // Add event listeners for edit and delete
                const editBtn = moduleCard.querySelector('.edit-module');
                const deleteBtn = moduleCard.querySelector('.delete-module');

                editBtn.addEventListener('click', () => this.editModule(module));
                deleteBtn.addEventListener('click', () => this.deleteModule(module._id));

                this.modulesGridContainer.appendChild(moduleCard);
            });
        }

        updatePagination(pagination) {
            // Update showing count
            this.modulesShowingCount.textContent = `Showing ${pagination.page} of ${pagination.totalPages} pages`;

            // Update page buttons
            this.prevModulesPageBtn.disabled = pagination.page === 1;
            this.nextModulesPageBtn.disabled = pagination.page === pagination.totalPages;

            // Generate page numbers
            this.pageNumberContainer.innerHTML = '';
            for (let i = 1; i <= pagination.totalPages; i++) {
                const pageBtn = document.createElement('button');
                pageBtn.textContent = i;
                pageBtn.className = `page-number ${i === pagination.page ? 'active' : ''}`;
                pageBtn.addEventListener('click', () => {
                    this.currentModulePage = i;
                    this.loadModules();
                });
                this.pageNumberContainer.appendChild(pageBtn);
            }
        }

        changePage(direction) {
            // Change page based on direction
            this.currentModulePage += direction;
            this.loadModules();
        }

        sanitizeInput(input) {
            // Basic input sanitization
            const div = document.createElement('div');
            div.textContent = input;
            return div.innerHTML;
        }

        async deleteModule(moduleId) {
            try {
                // Confirm deletion
                const confirmDelete = confirm('Are you sure you want to delete this module?');
                if (!confirmDelete) return;

                // Send delete request
                await this.fetchWithAuth(`${this.apiBaseUrl}/modules/${moduleId}`, {
                    method: 'DELETE'
                });

                // Show success notification
                this.showNotification('Module deleted successfully', 'success');

                // Reload modules
                this.loadModules();
            } catch (error) {
                console.error('Error deleting module:', error);
            }
        }

        async editModule(module) {
            try {
                // Open modal with module details
                this.showAddModuleModal(module);
            } catch (error) {
                console.error('Error preparing module edit:', error);
                this.showNotification('Failed to prepare module for editing', 'error');
            }
        }

            showAddModuleModal(existingModule = null) {
            // Create modal container
            const modalContainer = document.createElement('div');
            modalContainer.id = 'moduleFormModal';
            modalContainer.className = 'modal-overlay';
            
            // Determine modal title and action
            const isEditMode = !!existingModule;
            const modalTitle = isEditMode ? 'Edit Module' : 'Add New Module';

            // Create modal HTML
            modalContainer.innerHTML = `
                <div class="modal-container">
                    <div class="modal-header">
                        <h2>${modalTitle}</h2>
                        <button class="modal-close-btn">&times;</button>
                    </div>
                    <form id="moduleForm" class="module-form">
                        <div class="form-row">
                            <div class="form-group">
                                <label for="moduleName">Module Name</label>
                                <input 
                                    type="text" 
                                    id="moduleName" 
                                    name="name" 
                                    class="form-control" 
                                    required 
                                    placeholder="Enter module name"
                                    value="${existingModule ? this.sanitizeInput(existingModule.name) : ''}"
                                >
                                <small class="error-message" id="moduleNameError"></small>
                            </div>
                            <div class="form-group">
                                <label for="moduleCategory">Category</label>
                                <select 
                                    id="moduleCategory" 
                                    name="category" 
                                    class="form-control" 
                                    required
                                >
                                    <option value="">Select Category</option>
                                    <option value="hr" ${existingModule && existingModule.category === 'hr' ? 'selected' : ''}>HR</option>
                                    <option value="finance" ${existingModule && existingModule.category === 'finance' ? 'selected' : ''}>Finance</option>
                                    <option value="operations" ${existingModule && existingModule.category === 'operations' ? 'selected' : ''}>Operations</option>
                                    <option value="integrations" ${existingModule && existingModule.category === 'integrations' ? 'selected' : ''}>Integrations</option>
                                </select>
                                <small class="error-message" id="moduleCategoryError"></small>
                            </div>
                        </div>

                        <div class="form-row">
                            <div class="form-group full-width">
                                <label for="moduleDescription">Description</label>
                                <textarea 
                                    id="moduleDescription" 
                                    name="description" 
                                    class="form-control" 
                                    rows="3" 
                                    required 
                                    placeholder="Describe the module's purpose and functionality"
                                >${existingModule ? this.sanitizeInput(existingModule.description) : ''}</textarea>
                                <small class="error-message" id="moduleDescriptionError"></small>
                            </div>
                        </div>

                        <div class="form-row">
                            <div class="form-group">
                                <label for="complianceLevel">Compliance Level</label>
                                <select 
                                    id="complianceLevel" 
                                    name="complianceLevel" 
                                    class="form-control" 
                                    required
                                >
                                    <option value="">Select Compliance Level</option>
                                    <option value="low" ${existingModule && existingModule.complianceLevel === 'low' ? 'selected' : ''}>Low</option>
                                    <option value="medium" ${existingModule && existingModule.complianceLevel === 'medium' ? 'selected' : ''}>Medium</option>
                                    <option value="high" ${existingModule && existingModule.complianceLevel === 'high' ? 'selected' : ''}>High</option>
                                </select>
                                <small class="error-message" id="complianceLevelError"></small>
                            </div>
                            <div class="form-group">
                                <label>Module Status</label>
                                <div class="toggle-switch">
                                    <input 
                                        type="checkbox" 
                                        id="moduleActiveStatus" 
                                        name="isActive" 
                                        ${existingModule ? (existingModule.isActive ? 'checked' : '') : 'checked'}
                                    >
                                    <label for="moduleActiveStatus" class="toggle-slider"></label>
                                    <span id="moduleStatusText">
                                        ${existingModule ? (existingModule.isActive ? 'Active' : 'Inactive') : 'Active'}
                                    </span>
                                </div>
                            </div>
                        </div>

                        <div class="form-row">
                            <div class="form-group full-width">
                                <label>Permissions</label>
                                <div class="permissions-grid" id="permissionsContainer">
                                    ${this.generatePermissionsCheckboxes(existingModule)}
                                </div>
                            </div>
                        </div>

                        <div class="modal-actions">
                            <button type="button" class="btn btn-secondary cancel-btn">Cancel</button>
                            <button type="submit" class="btn btn-primary save-btn">
                                ${isEditMode ? 'Update Module' : 'Save Module'}
                            </button>
                        </div>
                    </form>
                </div>
            `;

            // Append to body
            document.body.appendChild(modalContainer);

            // Get form elements
            const form = modalContainer.querySelector('#moduleForm');
            const closeBtn = modalContainer.querySelector('.modal-close-btn');
            const cancelBtn = modalContainer.querySelector('.cancel-btn');
            const moduleActiveStatus = modalContainer.querySelector('#moduleActiveStatus');
            const moduleStatusText = modalContainer.querySelector('#moduleStatusText');

            // Toggle status text
            moduleActiveStatus.addEventListener('change', (e) => {
                moduleStatusText.textContent = e.target.checked ? 'Active' : 'Inactive';
            });

            // Close modal function
            const closeModal = () => {
                document.body.removeChild(modalContainer);
            };

            // Close event listeners
            closeBtn.addEventListener('click', closeModal);
            cancelBtn.addEventListener('click', closeModal);

            // Form submission
            form.addEventListener('submit', async (e) => {
                e.preventDefault();
                
                // Validate form
                if (this.validateModuleForm(form)) {
                    try {
                        // Collect form data
                        const formData = this.collectModuleFormData(form);
                        
                        // Send data to server
                        if (isEditMode) {
                            // Update existing module
                            await this.updateModule(existingModule._id, formData);
                        } else {
                            // Create new module
                            await this.createModule(formData);
                        }
                        
                        // Show success notification
                        this.showNotification(
                            isEditMode ? 'Module updated successfully' : 'Module created successfully', 
                            'success'
                        );
                        
                        // Close modal
                        closeModal();
                        
                        // Reload modules
                        this.loadModules();
                    } catch (error) {
                        // Error handling is done in fetchWithAuth method
                        this.showNotification(error.message, 'error');
                    }
                }
            });
        }

        generatePermissionsCheckboxes(existingModule = null) {
            const permissionGroups = {
                hr: [
                    { id: 'view_employees', name: 'View Employees' },
                    { id: 'manage_employees', name: 'Manage Employees' },
                    { id: 'view_recruitment', name: 'View Recruitment' }
                ],
                finance: [
                    { id: 'view_payroll', name: 'View Payroll' },
                    { id: 'manage_payroll', name: 'Manage Payroll' },
                    { id: 'view_expenses', name: 'View Expenses' }
                ],
                operations: [
                    { id: 'view_projects', name: 'View Projects' },
                    { id: 'manage_projects', name: 'Manage Projects' },
                    { id: 'view_tasks', name: 'View Tasks' }
                ],
                integrations: [
                    { id: 'manage_integrations', name: 'Manage Integrations' },
                    { id: 'view_api_logs', name: 'View API Logs' }
                ]
            };

            const selectedPermissions = existingModule && existingModule.permissions 
                ? existingModule.permissions.map(p => p.id || p) 
                : [];

            return Object.entries(permissionGroups)
                .map(([category, permissions]) => 
                    `<div class="permission-group">
                        <h4>${category.toUpperCase()} Permissions</h4>
                        ${permissions.map(perm => `
                            <div class="permission-checkbox">
                                <input 
                                    type="checkbox" 
                                    id="${perm.id}" 
                                    name="permissions" 
                                    value="${perm.id}"
                                    data-category="${category}"
                                    ${selectedPermissions.includes(perm.id) ? 'checked' : ''}
                                >
                                <label for="${perm.id}">${perm.name}</label>
                            </div>
                        `).join('')}
                    </div>`
                )
                .join('');
        }

            validateModuleForm(form) {
            // Reset previous error states
            const errorFields = form.querySelectorAll('.error-message');
            errorFields.forEach(field => field.textContent = '');

            // Validation flags
            let isValid = true;

            // Validate Module Name
            const moduleName = form.querySelector('#moduleName');
            if (!moduleName.value.trim()) {
                this.markFieldAsInvalid(moduleName, 'Module name is required');
                isValid = false;
            }

            // Validate Category
            const moduleCategory = form.querySelector('#moduleCategory');
            if (!moduleCategory.value) {
                this.markFieldAsInvalid(moduleCategory, 'Please select a category');
                isValid = false;
            }

            // Validate Description
            const moduleDescription = form.querySelector('#moduleDescription');
            if (!moduleDescription.value.trim()) {
                this.markFieldAsInvalid(moduleDescription, 'Description is required');
                isValid = false;
            }

            // Validate Compliance Level
            const complianceLevel = form.querySelector('#complianceLevel');
            if (!complianceLevel.value) {
                this.markFieldAsInvalid(complianceLevel, 'Please select a compliance level');
                isValid = false;
            }

            // Validate Permissions (at least one must be selected)
            const permissionsContainer = form.querySelector('#permissionsContainer');
            const selectedPermissions = permissionsContainer.querySelectorAll('input[name="permissions"]:checked');
            
            if (selectedPermissions.length === 0) {
                const permissionsError = document.createElement('div');
                permissionsError.className = 'error-message';
                permissionsError.textContent = 'Select at least one permission';
                permissionsContainer.appendChild(permissionsError);
                isValid = false;
            }

            return isValid;
        }

        markFieldAsInvalid(field, errorMessage) {
            const errorElement = field.nextElementSibling;
            if (errorElement && errorElement.classList.contains('error-message')) {
                errorElement.textContent = errorMessage;
            }
            field.classList.add('invalid');
        }

        collectModuleFormData(form) {
            // Collect basic module information
            const moduleData = {
                name: form.querySelector('#moduleName').value.trim(),
                category: form.querySelector('#moduleCategory').value,
                description: form.querySelector('#moduleDescription').value.trim(),
                complianceLevel: form.querySelector('#complianceLevel').value,
                isActive: form.querySelector('#moduleActiveStatus').checked
            };

            // Collect selected permissions
            const selectedPermissions = Array.from(
                form.querySelectorAll('input[name="permissions"]:checked')
            ).map(checkbox => ({
                id: checkbox.value,
                category: checkbox.dataset.category
            }));

            // Add permissions to module data
            moduleData.permissions = selectedPermissions;

            return moduleData;
        }

        async createModule(moduleData) {
            try {
                // Send module creation request
                const response = await this.fetchWithAuth(`${this.apiBaseUrl}/modules`, {
                    method: 'POST',
                    body: JSON.stringify(moduleData)
                });

                // Return the created module
                return response.data;
            } catch (error) {
                // Error handling
                console.error('Module creation error:', error);
                throw error;
            }
        }

        async updateModule(moduleId, moduleData) {
            try {
                // Send module update request
                const response = await this.fetchWithAuth(`${this.apiBaseUrl}/modules/${moduleId}`, {
                    method: 'PUT',
                    body: JSON.stringify(moduleData)
                });

                // Return the updated module
                return response.data;
            } catch (error) {
                // Error handling
                console.error('Module update error:', error);
                throw error;
            }
        }

        // Initialization method
        initialize() {
            // Initial load of modules
            this.loadModules();

            // Setup any additional event listeners or initializations
            this.setupAdditionalFeatures();
        }

        setupAdditionalFeatures() {
            // Add export functionality
            const exportButton = document.createElement('button');
            exportButton.className = 'btn btn-secondary export-modules';
            exportButton.innerHTML = '<i class="fas fa-file-export"></i> Export Modules';
            exportButton.addEventListener('click', () => this.exportModules());

            // Add advanced search functionality
            const advancedSearchButton = document.createElement('button');
            advancedSearchButton.className = 'btn btn-secondary advanced-search';
            advancedSearchButton.innerHTML = '<i class="fas fa-search-plus"></i> Advanced Search';
            advancedSearchButton.addEventListener('click', () => this.setupAdvancedSearch());

            // Add buttons to the header actions
            const headerActions = document.querySelector('.header-actions');
            if (headerActions) {
                headerActions.appendChild(advancedSearchButton);
                headerActions.appendChild(exportButton);
            }
        }

        async exportModules() {
            try {
                // Prepare export parameters
                const category = this.categoryFilter.value;
                const complianceLevel = this.complianceFilter.value;
                const search = this.moduleSearchInput.value.trim();

                // Construct query string
                const queryParams = new URLSearchParams({
                    ...(category && { category }),
                    ...(complianceLevel && { complianceLevel }),
                    ...(search && { search })
                });

                // Fetch export data
                const response = await this.fetchWithAuth(
                    `${this.apiBaseUrl}/modules/export?${queryParams}`
                );

                // Trigger file download
                this.downloadExportedFile(response.data, 'modules_export.csv');
            } catch (error) {
                console.error('Export error:', error);
                this.showNotification('Failed to export modules', 'error');
            }
        }

        downloadExportedFile(data, filename) {
            // Create a Blob from the data
            const blob = new Blob([data], { type: 'text/csv;charset=utf-8;' });
            
            // Create a link element
            const link = document.createElement('a');
            
            // Create a temporary URL for the blob
            const url = URL.createObjectURL(blob);
            
            // Set link attributes
            link.setAttribute('href', url);
            link.setAttribute('download', filename);
            
            // Append to body, click, and remove
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        }
    }

    // Expose the WiseManager to the global scope
    window.WiseManager = WiseManager;
})();

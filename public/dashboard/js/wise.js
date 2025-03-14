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

            // DOM Element References
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

            // Bind events
            this.bindEvents();
        }

        bindEvents() {
            // Module Management Events
            this.addNewModuleBtn.addEventListener('click', () => this.showAddModuleModal());
            this.categoryFilter.addEventListener('change', () => this.loadModules());
            this.complianceFilter.addEventListener('change', () => this.loadModules());
            this.searchModulesBtn.addEventListener('click', () => this.loadModules());
            this.prevModulesPageBtn.addEventListener('click', () => this.changePage(-1));
            this.nextModulesPageBtn.addEventListener('click', () => this.changePage(1));
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

        // Placeholder methods to be implemented
        showAddModuleModal() {
            console.log('Show Add Module Modal');
        }

        loadModules() {
            console.log('Load Modules');
        }

        changePage() {
            console.log('Change Page');
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
                        <h3 class="module-title">${module.name}</h3>
                        <div class="module-status">
                            <span class="status-indicator ${module.isActive ? 'status-active' : 'status-inactive'}"></span>
                            ${module.isActive ? 'Active' : 'Inactive'}
                        </div>
                    </div>
                    <div class="module-category">
                        ${module.category.toUpperCase()}
                    </div>
                    <div class="module-description">
                        ${module.description}
                    </div>
                    <div class="module-details">
                        <div class="module-compliance">
                            Compliance: ${module.complianceLevel.toUpperCase()}
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

         showAddModuleModal() {
            // Create modal container
            const modalContainer = document.createElement('div');
            modalContainer.id = 'moduleFormModal';
            modalContainer.className = 'modal-overlay';
            
            // Modal HTML
            modalContainer.innerHTML = `
                <div class="modal-container">
                    <div class="modal-header">
                        <h2>Add New Module</h2>
                        <button class="modal-close-btn">&times;</button>
                    </div>
                    <form id="moduleForm" class="module-form">
                        <div class="form-group">
                            <label for="moduleName">Module Name</label>
                            <input 
                                type="text" 
                                id="moduleName" 
                                name="name" 
                                class="form-control" 
                                required 
                                placeholder="Enter module name"
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
                                <option value="hr">HR</option>
                                <option value="finance">Finance</option>
                                <option value="operations">Operations</option>
                                <option value="integrations">Integrations</option>
                            </select>
                            <small class="error-message" id="moduleCategoryError"></small>
                        </div>

                        <div class="form-group">
                            <label for="moduleDescription">Description</label>
                            <textarea 
                                id="moduleDescription" 
                                name="description" 
                                class="form-control" 
                                required 
                                placeholder="Describe the module's purpose"
                            ></textarea>
                            <small class="error-message" id="moduleDescriptionError"></small>
                        </div>

                        <div class="form-group">
                            <label for="complianceLevel">Compliance Level</label>
                            <select 
                                id="complianceLevel" 
                                name="complianceLevel" 
                                class="form-control" 
                                required
                            >
                                <option value="">Select Compliance Level</option>
                                <option value="low">Low</option>
                                <option value="medium">Medium</option>
                                <option value="high">High</option>
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
                                    checked
                                >
                                <label for="moduleActiveStatus" class="toggle-slider"></label>
                                <span>Active</span>
                            </div>
                        </div>

                        <div class="form-group">
                            <label>Permissions</label>
                            <div id="permissionsContainer" class="permissions-grid">
                                ${this.generatePermissionsCheckboxes()}
                            </div>
                        </div>

                        <div class="modal-actions">
                            <button type="button" class="btn btn-secondary cancel-btn">Cancel</button>
                            <button type="submit" class="btn btn-primary save-btn">Save Module</button>
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
                        const response = await this.createModule(formData);
                        
                        // Show success notification
                        this.showNotification('Module created successfully', 'success');
                        
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

        generatePermissionsCheckboxes() {
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

        // Additional utility methods
        sanitizeInput(input) {
            // Basic input sanitization
            const div = document.createElement('div');
            div.textContent = input;
            return div.innerHTML;
        }

        // Method to handle module editing (placeholder)
        async editModule(moduleId) {
            try {
                // Fetch module details
                const response = await this.fetchWithAuth(`${this.apiBaseUrl}/modules/${moduleId}`);
                
                // Populate edit modal with existing module data
                this.showEditModuleModal(response.data);
            } catch (error) {
                console.error('Error fetching module details:', error);
                this.showNotification('Failed to load module details', 'error');
            }
        }

        // Placeholder for edit module modal
        showEditModuleModal(moduleData) {
            // Similar to showAddModuleModal, but pre-populated with existing data
            console.log('Edit Module Modal', moduleData);
        }

         // Audit Logs Methods
        async loadAuditLogs() {
            try {
                // Prepare query parameters
                const startDate = this.auditStartDate.value;
                const endDate = this.auditEndDate.value;
                const activityType = this.activityTypeFilter.value;

                // Construct query string
                const queryParams = new URLSearchParams({
                    page: this.currentAuditLogPage,
                    limit: this.auditLogsPerPage,
                    ...(startDate && { startDate }),
                    ...(endDate && { endDate }),
                    ...(activityType && { type: activityType })
                });

                // Fetch audit logs
                const response = await this.fetchWithAuth(
                    `${this.apiBaseUrl}/modules/activity-logs?${queryParams}`
                );

                // Update total audit logs and pagination
                this.totalAuditLogs = response.pagination.total;
                this.updateAuditLogPagination(response.pagination);

                // Render audit logs
                this.renderAuditLogs(response.data);

            } catch (error) {
                console.error('Error loading audit logs:', error);
                this.auditLogsTableBody.innerHTML = `
                    <tr>
                        <td colspan="5" class="error-message">
                            <i class="fas fa-exclamation-triangle"></i>
                            Failed to load audit logs. ${error.message}
                        </td>
                    </tr>
                `;
            }
        }

        renderAuditLogs(logs) {
            // Clear existing logs
            this.auditLogsTableBody.innerHTML = '';

            // Check if no logs
            if (!logs || logs.length === 0) {
                this.auditLogsTableBody.innerHTML = `
                    <tr>
                        <td colspan="5" class="no-logs">
                            <i class="fas fa-history"></i>
                            No audit logs found
                        </td>
                    </tr>
                `;
                return;
            }

            // Render each log
            logs.forEach(log => {
                const logRow = document.createElement('tr');
                logRow.innerHTML = `
                    <td>${this.formatTimestamp(log.timestamp)}</td>
                    <td>${this.formatActivityType(log.type)}</td>
                    <td>${log.moduleName || 'N/A'}</td>
                    <td>${log.userName || 'System'}</td>
                    <td>
                        <button class="btn-view-details" data-log-id="${log._id}">
                            View Details
                        </button>
                    </td>
                `;

                // Add event listener for log details
                const viewDetailsBtn = logRow.querySelector('.btn-view-details');
                viewDetailsBtn.addEventListener('click', () => this.showLogDetails(log));

                this.auditLogsTableBody.appendChild(logRow);
            });
        }

        updateAuditLogPagination(pagination) {
            // Update showing count
            this.auditLogsShowingCount.textContent = `Showing ${pagination.page} of ${pagination.totalPages} pages`;

            // Update page buttons
            this.prevAuditLogsPageBtn.disabled = pagination.page === 1;
            this.nextAuditLogsPageBtn.disabled = pagination.page === pagination.totalPages;

            // Generate page numbers
            this.auditLogsPageNumberContainer.innerHTML = '';
            for (let i = 1; i <= pagination.totalPages; i++) {
                const pageBtn = document.createElement('button');
                pageBtn.textContent = i;
                pageBtn.className = `page-number ${i === pagination.page ? 'active' : ''}`;
                pageBtn.addEventListener('click', () => {
                    this.currentAuditLogPage = i;
                    this.loadAuditLogs();
                });
                this.auditLogsPageNumberContainer.appendChild(pageBtn);
            }
        }

        formatTimestamp(timestamp) {
            try {
                return new Date(timestamp).toLocaleString('en-US', {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit'
                });
            } catch (error) {
                return 'Invalid Date';
            }
        }

        formatActivityType(type) {
            const activityTypes = {
                MODULE_CREATED: 'Module Created',
                MODULE_UPDATED: 'Module Updated',
                MODULE_DELETED: 'Module Deleted',
                MODULE_STATUS_CHANGED: 'Status Changed'
            };

            return activityTypes[type] || type;
        }

        showLogDetails(log) {
            // Create modal for log details
            const modalContainer = document.createElement('div');
            modalContainer.className = 'log-details-modal';
            modalContainer.innerHTML = `
                <div class="modal-content">
                    <div class="modal-header">
                        <h3>Log Details</h3>
                        <button class="close-btn">&times;</button>
                    </div>
                    <div class="modal-body">
                        <table class="log-details-table">
                            <tr>
                                <th>Timestamp</th>
                                <td>${this.formatTimestamp(log.timestamp)}</td>
                            </tr>
                            <tr>
                                <th>Activity Type</th>
                                <td>${this.formatActivityType(log.type)}</td>
                            </tr>
                            <tr>
                                <th>Module Name</th>
                                <td>${log.moduleName || 'N/A'}</td>
                            </tr>
                            <tr>
                                <th>User</th>
                                <td>${log.userName || 'System'}</td>
                            </tr>
                            <tr>
                                <th>Details</th>
                                <td>
                                    <pre>${JSON.stringify(log.details, null, 2)}</pre>
                                </td>
                            </tr>
                        </table>
                    </div>
                </div>
            `;

            // Add close functionality
            const closeBtn = modalContainer.querySelector('.close-btn');
            closeBtn.addEventListener('click', () => {
                document.body.removeChild(modalContainer);
            });

            // Append to body
            document.body.appendChild(modalContainer);
        }

        // Audit logs pagination
        changeAuditLogPage(direction) {
            this.currentAuditLogPage += direction;
            this.loadAuditLogs();
        }

         // Initialization method
        initialize() {
            // Bind additional event listeners
            this.applyAuditFiltersBtn.addEventListener('click', () => this.loadAuditLogs());
            this.prevAuditLogsPageBtn.addEventListener('click', () => this.changeAuditLogPage(-1));
            this.nextAuditLogsPageBtn.addEventListener('click', () => this.changeAuditLogPage(1));

            // Initial load of modules and audit logs
            this.loadModules();
            this.loadAuditLogs();
        }

        // Cleanup method to remove event listeners and free up resources
        cleanup() {
            // Remove event listeners
            this.addNewModuleBtn.removeEventListener('click', this.showAddModuleModal);
            this.categoryFilter.removeEventListener('change', this.loadModules);
            this.complianceFilter.removeEventListener('change', this.loadModules);
            this.searchModulesBtn.removeEventListener('click', this.loadModules);
            this.prevModulesPageBtn.removeEventListener('click', this.changePage);
            this.nextModulesPageBtn.removeEventListener('click', this.changePage);
            this.applyAuditFiltersBtn.removeEventListener('click', this.loadAuditLogs);
            this.prevAuditLogsPageBtn.removeEventListener('click', this.changeAuditLogPage);
            this.nextAuditLogsPageBtn.removeEventListener('click', this.changeAuditLogPage);

            // Clear any ongoing requests or timers
            // Add any specific cleanup logic here
        }

        // Export functionality for modules
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

        // Advanced search and filter method
        setupAdvancedSearch() {
            // Create advanced search modal
            const modalContainer = document.createElement('div');
            modalContainer.className = 'advanced-search-modal';
            modalContainer.innerHTML = `
                <div class="modal-content">
                    <div class="modal-header">
                        <h3>Advanced Module Search</h3>
                        <button class="close-btn">&times;</button>
                    </div>
                    <div class="modal-body">
                        <div class="search-form">
                            <div class="form-group">
                                <label>Name Contains</label>
                                <input type="text" id="advancedNameSearch" class="form-control">
                            </div>
                            <div class="form-group">
                                <label>Category</label>
                                <select id="advancedCategorySearch" class="form-control">
                                    <option value="">All Categories</option>
                                    <option value="hr">HR</option>
                                    <option value="finance">Finance</option>
                                    <option value="operations">Operations</option>
                                    <option value="integrations">Integrations</option>
                                </select>
                            </div>
                            <div class="form-group">
                                <label>Compliance Level</label>
                                <select id="advancedComplianceSearch" class="form-control">
                                    <option value="">All Levels</option>
                                    <option value="low">Low</option>
                                    <option value="medium">Medium</option>
                                    <option value="high">High</option>
                                </select>
                            </div>
                            <div class="form-group">
                                <label>Status</label>
                                <select id="advancedStatusSearch" class="form-control">
                                    <option value="">All Statuses</option>
                                    <option value="active">Active</option>
                                    <option value="inactive">Inactive</option>
                                </select>
                            </div>
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button id="applyAdvancedSearch" class="btn btn-primary">Apply Search</button>
                        <button id="resetAdvancedSearch" class="btn btn-secondary">Reset</button>
                    </div>
                </div>
            `;

            // Add event listeners
            const closeBtn = modalContainer.querySelector('.close-btn');
            const applySearchBtn = modalContainer.querySelector('#applyAdvancedSearch');
            const resetSearchBtn = modalContainer.querySelector('#resetAdvancedSearch');

            closeBtn.addEventListener('click', () => {
                document.body.removeChild(modalContainer);
            });

            applySearchBtn.addEventListener('click', () => {
                // Collect advanced search parameters
                const nameSearch = document.getElementById('advancedNameSearch').value.trim();
                const categorySearch = document.getElementById('advancedCategorySearch').value;
                const complianceSearch = document.getElementById('advancedComplianceSearch').value;
                const statusSearch = document.getElementById('advancedStatusSearch').value;

                // Update filter inputs
                this.moduleSearchInput.value = nameSearch;
                this.categoryFilter.value = categorySearch;
                this.complianceFilter.value = complianceSearch;

                // Trigger module search
                this.loadModules();

                // Close modal
                document.body.removeChild(modalContainer);
            });

            resetSearchBtn.addEventListener('click', () => {
                // Reset all search inputs
                document.getElementById('advancedNameSearch').value = '';
                document.getElementById('advancedCategorySearch').value = '';
                document.getElementById('advancedComplianceSearch').value = '';
                document.getElementById('advancedStatusSearch').value = '';
            });

            // Append to body
            document.body.appendChild(modalContainer);
        }
    }

    // Expose the WiseManager to the global scope
    window.WiseManager = WiseManager;
})();

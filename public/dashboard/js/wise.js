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
            this.currentPage = 1;
            this.pageSize = 10;
            this.totalModules = 0;
            this.currentEditingModule = null;

            // DOM Element References
            this.modulesGridContainer = document.getElementById('modulesGridContainer');
            this.addNewModuleBtn = document.getElementById('addNewModuleBtn');
            this.moduleModal = null;
            this.moduleForm = null;
            this.categoryFilter = document.getElementById('categoryFilter');
            this.complianceFilter = document.getElementById('complianceFilter');
            this.moduleSearchInput = document.getElementById('moduleSearchInput');
            this.searchModulesBtn = document.getElementById('searchModulesBtn');

            // Audit Logs References
            this.auditLogsTableBody = document.getElementById('auditLogsTableBody');
            this.auditStartDate = document.getElementById('auditStartDate');
            this.auditEndDate = document.getElementById('auditEndDate');
            this.activityTypeFilter = document.getElementById('activityTypeFilter');
            this.applyAuditFiltersBtn = document.getElementById('applyAuditFiltersBtn');

            // Pagination References
            this.prevModulesPageBtn = document.getElementById('prevModulesPageBtn');
            this.nextModulesPageBtn = document.getElementById('nextModulesPageBtn');
            this.modulesShowingCount = document.getElementById('modulesShowingCount');
            this.pageNumberContainer = document.getElementById('pageNumberContainer');

            // Bind all methods to maintain correct context
            this.init = this.init.bind(this);
            this.initializeEventListeners = this.initializeEventListeners.bind(this);
            this.handleError = this.handleError.bind(this);
            this.fetchModules = this.fetchModules.bind(this);
            this.renderModules = this.renderModules.bind(this);
            this.createModuleCard = this.createModuleCard.bind(this);
            this.updatePagination = this.updatePagination.bind(this);
            this.generatePageNumbers = this.generatePageNumbers.bind(this);
            this.renderNoModulesState = this.renderNoModulesState.bind(this);
            this.handleAddNewModule = this.handleAddNewModule.bind(this);
            this.createModuleModal = this.createModuleModal.bind(this);
            this.populateFeatureCheckboxes = this.populateFeatureCheckboxes.bind(this);
            this.closeModuleModal = this.closeModuleModal.bind(this);
            this.handleModuleFormSubmit = this.handleModuleFormSubmit.bind(this);
            this.fetchAuditLogs = this.fetchAuditLogs.bind(this);
            this.renderAuditLogs = this.renderAuditLogs.bind(this);
            this.handleEditModule = this.handleEditModule.bind(this);
            this.handleDeleteModule = this.handleDeleteModule.bind(this);

            // Initialize
            this.init();
        }

        // Initialization method
        init() {
            this.initializeEventListeners();
            this.fetchModules();
            this.fetchAuditLogs();
        }

        // Event Listeners Initialization
        initializeEventListeners() {
            // Add New Module Button
            this.addNewModuleBtn.addEventListener('click', this.handleAddNewModule);

            // Filters
            this.categoryFilter.addEventListener('change', this.fetchModules);
            this.complianceFilter.addEventListener('change', this.fetchModules);
            this.searchModulesBtn.addEventListener('click', this.fetchModules);
            this.moduleSearchInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') this.fetchModules();
            });

            // Pagination
            this.prevModulesPageBtn.addEventListener('click', () => {
                if (this.currentPage > 1) {
                    this.currentPage--;
                    this.fetchModules();
                }
            });

            this.nextModulesPageBtn.addEventListener('click', () => {
                this.currentPage++;
                this.fetchModules();
            });

            // Audit Logs
            this.applyAuditFiltersBtn.addEventListener('click', this.fetchAuditLogs);
        }

        // Error Handling Utility
        handleError(error, context = 'Operation') {
            console.error(`${context} failed:`, error);
            window.dashboardApp.userInterface.showErrorNotification(
                `${context} failed. Please try again.`
            );
        }
                // Fetch Modules Method
        async fetchModules() {
            try {
                // Prepare query parameters
                const category = this.categoryFilter.value;
                const complianceLevel = this.complianceFilter.value;
                const search = this.moduleSearchInput.value;

                // Construct API endpoint
                const url = new URL(`${this.apiBaseUrl}/modules`);
                url.searchParams.append('page', this.currentPage);
                url.searchParams.append('limit', this.pageSize);
                
                if (category) url.searchParams.append('category', category);
                if (complianceLevel) url.searchParams.append('complianceLevel', complianceLevel);
                if (search) url.searchParams.append('search', search);

                // Fetch modules
                const response = await fetch(url, {
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

                // Update total modules and pagination
                this.totalModules = data.pagination.total;
                this.renderModules(data.data);
                this.updatePagination(data.pagination);
            } catch (error) {
                this.handleError(error, 'Fetching Modules');
                this.renderNoModulesState();
            }
        }

        // Render Modules Method
        renderModules(modules) {
            // Clear existing modules
            this.modulesGridContainer.innerHTML = '';

            // Handle empty state
            if (!modules || modules.length === 0) {
                this.renderNoModulesState();
                return;
            }

            // Render modules
            modules.forEach(module => {
                const moduleCard = this.createModuleCard(module);
                this.modulesGridContainer.appendChild(moduleCard);
            });
        }

        // Create Module Card Method
        createModuleCard(module) {
            const card = document.createElement('div');
            card.className = 'module-card';
            card.innerHTML = `
                <div class="module-card-header">
                    <h3 class="module-title">${module.name}</h3>
                    <div class="module-status">
                        <span class="status-indicator ${module.isActive ? 'status-active' : 'status-inactive'}"></span>
                        ${module.isActive ? 'Active' : 'Inactive'}
                    </div>
                </div>
                <div class="module-category">
                    ${module.category.toUpperCase()} Solutions
                </div>
                <div class="module-description">
                    ${module.description || 'No description available'}
                </div>
                <div class="module-details">
                    <span class="module-compliance">
                        Compliance Level: ${module.complianceLevel.toUpperCase()}
                    </span>
                </div>
                <div class="module-actions">
                    <button class="module-action-btn edit-module" data-module-id="${module._id}">
                        <i class="fas fa-edit"></i> Edit
                    </button>
                    <button class="module-action-btn delete-module" data-module-id="${module._id}">
                        <i class="fas fa-trash"></i> Delete
                    </button>
                </div>
            `;

            // Add event listeners for edit and delete
            const editBtn = card.querySelector('.edit-module');
            const deleteBtn = card.querySelector('.delete-module');

            editBtn.addEventListener('click', () => this.handleEditModule(module));
            deleteBtn.addEventListener('click', () => this.handleDeleteModule(module._id));

            return card;
        }

        // Update Pagination Method
        updatePagination(pagination) {
            // Update showing count
            this.modulesShowingCount.textContent = `Showing ${pagination.page} of ${pagination.totalPages} pages`;

            // Update pagination buttons
            this.prevModulesPageBtn.disabled = pagination.page === 1;
            this.nextModulesPageBtn.disabled = pagination.page === pagination.totalPages;

            // Generate page numbers
            this.generatePageNumbers(pagination);
        }

        // Generate Page Numbers Method
        generatePageNumbers(pagination) {
            // Clear existing page numbers
            this.pageNumberContainer.innerHTML = '';

            // Generate page number buttons
            for (let i = 1; i <= pagination.totalPages; i++) {
                const pageBtn = document.createElement('button');
                pageBtn.textContent = i;
                pageBtn.className = 'page-number';
                
                if (i === pagination.page) {
                    pageBtn.classList.add('active');
                }

                pageBtn.addEventListener('click', () => {
                    this.currentPage = i;
                    this.fetchModules();
                });

                this.pageNumberContainer.appendChild(pageBtn);
            }
        }

        // Render No Modules State Method
        renderNoModulesState() {
            this.modulesGridContainer.innerHTML = `
                <div class="no-modules">
                    <i class="fas fa-cubes"></i>
                    <p>No modules found. Create your first module!</p>
                </div>
            `;
        }
                // Handle Add New Module Method
     handleAddNewModule() {
    // Ensure modal exists
    if (!this.moduleModal) {
        this.createModuleModal();
    }

    // Use a slight delay to ensure modal is in DOM
    setTimeout(() => {
        try {
            // Verify modal exists before proceeding
            if (!this.moduleModal) {
                console.error('Failed to create module modal');
                return;
            }

            // Reset form
            this.moduleForm.reset();
            this.populateFeatureCheckboxes();
            
            // Show modal
            this.moduleModal.classList.add('show');
            
            // Setup form submission
            this.moduleForm.onsubmit = this.handleModuleFormSubmit;
        } catch (error) {
            console.error('Error in handleAddNewModule:', error);
        }
    }, 0);
}

        // Create Module Modal Method
       createModuleModal() {
    try {
        // Check if modal already exists
        if (document.getElementById('moduleModal')) {
            this.moduleModal = document.getElementById('moduleModal');
            this.moduleForm = document.getElementById('moduleForm');
            return;
        }

        // Create a container div to hold the modal
        const modalContainer = document.createElement('div');
        modalContainer.innerHTML = `
            <div class="modal" id="moduleModal">
                <div class="modal-dialog">
                    <div class="modal-header">
                        <h2>Add New Module</h2>
                        <button class="modal-close" type="button">&times;</button>
                    </div>
                    <div class="modal-body">
                        <form id="moduleForm">
                            <div class="form-row">
                                <div class="form-group">
                                    <label>Module Name</label>
                                    <input type="text" name="moduleName" class="form-control" required>
                                </div>
                                <div class="form-group">
                                    <label>Module Category</label>
                                    <select name="moduleCategory" class="form-control" required>
                                        <option value="">Select Category</option>
                                        <option value="hr">HR Solutions</option>
                                        <option value="finance">Financial Solutions</option>
                                        <option value="operations">Operational Solutions</option>
                                        <option value="integrations">Integrations</option>
                                    </select>
                                </div>
                            </div>
                            
                            <div class="form-group">
                                <label>Description</label>
                                <textarea name="moduleDescription" class="form-control" rows="3"></textarea>
                            </div>

                            <div class="form-row">
                                <div class="form-group">
                                    <label>Status</label>
                                    <select name="moduleStatus" class="form-control">
                                        <option value="active">Active</option>
                                        <option value="inactive">Inactive</option>
                                    </select>
                                </div>
                                <div class="form-group">
                                    <label>Compliance Level</label>
                                    <select name="complianceLevel" class="form-control">
                                        <option value="low">Low</option>
                                        <option value="medium">Medium</option>
                                        <option value="high">High</option>
                                    </select>
                                </div>
                            </div>

                            <div class="form-group">
                                <label>Access Levels</label>
                                <div class="permissions-grid">
                                    <label class="form-check">
                                        <input type="checkbox" name="accessLevels" value="superadmin" class="form-check-input">
                                        Superadmin
                                    </label>
                                    <label class="form-check">
                                        <input type="checkbox" name="accessLevels" value="companyadmin" class="form-check-input">
                                        Company Admin
                                    </label>
                                    <label class="form-check">
                                        <input type="checkbox" name="accessLevels" value="hrmanager" class="form-check-input">
                                        HR Manager
                                    </label>
                                    <label class="form-check">
                                        <input type="checkbox" name="accessLevels" value="employee" class="form-check-input">
                                        Employee
                                    </label>
                                </div>
                            </div>

                            <div class="form-group" id="featuresContainer">
                                <!-- Features will be dynamically populated -->
                            </div>

                            <div class="form-row">
                                <div class="form-group">
                                    <label>Pricing Plan</label>
                                    <select name="pricingPlan" class="form-control">
                                        <option value="">Select Pricing Plan</option>
                                        <option value="basic">Basic</option>
                                        <option value="professional">Professional</option>
                                        <option value="enterprise">Enterprise</option>
                                    </select>
                                </div>
                                <div class="form-group">
                                    <label>Audit Logging</label>
                                    <div class="toggle-switch">
                                        <input type="checkbox" name="auditLogging" id="auditLoggingToggle">
                                        <label for="auditLoggingToggle" class="toggle-slider"></label>
                                    </div>
                                </div>
                            </div>
                        </form>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" id="cancelModuleBtn">Cancel</button>
                        <button type="submit" form="moduleForm" class="btn btn-primary">Save Module</button>
                    </div>
                </div>
            </div>
        `;

        // Ensure the modal is added to the DOM
        const firstChild = modalContainer.firstElementChild;
        if (!firstChild) {
            console.error('Failed to create modal container');
            return;
        }

        // Append to body with a slight delay to ensure DOM is ready
        setTimeout(() => {
            document.body.appendChild(firstChild);

            // Cache modal reference
            this.moduleModal = document.getElementById('moduleModal');
            this.moduleForm = document.getElementById('moduleForm');

            // Verify modal and form exist
            if (!this.moduleModal) {
                console.error('Failed to create module modal: Modal not found');
                return;
            }

            if (!this.moduleForm) {
                console.error('Failed to create module modal: Form not found');
                return;
            }

            // Setup close button
            const closeButton = this.moduleModal.querySelector('.modal-close');
            if (closeButton) {
                closeButton.addEventListener('click', () => {
                    try {
                        this.closeModuleModal();
                    } catch (closeError) {
                        console.error('Error closing modal:', closeError);
                    }
                });
            } else {
                console.error('Close button not found in module modal');
            }

            // Setup cancel button
            const cancelButton = document.getElementById('cancelModuleBtn');
            if (cancelButton) {
                cancelButton.addEventListener('click', () => {
                    try {
                        this.closeModuleModal();
                    } catch (cancelError) {
                        console.error('Error canceling modal:', cancelError);
                    }
                });
            } else {
                console.error('Cancel button not found in module modal');
            }

            console.log('Module modal created successfully');
        }, 0);

    } catch (error) {
        console.error('Comprehensive error creating module modal:', error);
    }
}


        // Populate Feature Checkboxes Method
        populateFeatureCheckboxes() {
            const featuresContainer = document.getElementById('featuresContainer');
            featuresContainer.innerHTML = ''; // Clear existing

            const featureCategories = {
                'HR Solutions': [
                    'People Management', 
                    'Performance Management', 
                    'Attendance & Leave Management', 
                    'Payroll & Compensation', 
                    'Employee Self-Service', 
                    'WiseRecruit'
                ],
                'Financial Solutions': [
                    'Payroll Processing', 
                    'SmartExpenses', 
                    'Financial Reporting', 
                    'Book-keeping', 
                    'Taxation & Compliance', 
                    'GlobalInvoice', 
                    'Invoice & Billing', 
                    'Asset Management'
                ],
                'Operational Solutions': [
                    'Project & Task Management',
                    'ShiftMaster',
                    'StockFlow',
                    'Vendor & Supplier Management',
                    'Workflow Automation',
                    'Facility Management'
                ],
                'Integrations': [
                    'ServiceNow & ITSM',
                    'Payroll & Finance Integrations',
                    'Employee Benefits',
                    'Talent Management',
                    'Pricing Plan Association'
                ]
            };

            Object.entries(featureCategories).forEach(([category, features]) => {
                const categoryHeader = document.createElement('h3');
                categoryHeader.textContent = category;
                featuresContainer.appendChild(categoryHeader);

                features.forEach(feature => {
                    const featureWrapper = document.createElement('label');
                    featureWrapper.className = 'form-check';
                    featureWrapper.innerHTML = `
                        <input type="checkbox" name="features" value="${feature}" class="form-check-input">
                        ${feature}
                    `;
                    featuresContainer.appendChild(featureWrapper);
                });
            });
        }

        // Close Module Modal Method
        closeModuleModal() {
    if (this.moduleModal) {
        this.moduleModal.classList.remove('show');
    } else {
        console.warn('Attempted to close non-existent module modal');
    }
}
                // Module Form Submission Method
        async handleModuleFormSubmit(event) {
            event.preventDefault();
            
            // Collect form data
            const formData = {
                name: this.moduleForm.moduleName.value.trim(),
                category: this.moduleForm.moduleCategory.value,
                description: this.moduleForm.moduleDescription.value.trim(),
                isActive: this.moduleForm.moduleStatus.value === 'active',
                complianceLevel: this.moduleForm.complianceLevel.value,
                accessLevels: Array.from(
                    this.moduleForm.querySelectorAll('input[name="accessLevels"]:checked')
                ).map(el => el.value),
                features: Array.from(
                    this.moduleForm.querySelectorAll('input[name="features"]:checked')
                ).map(el => el.value),
                pricingPlan: this.moduleForm.pricingPlan.value,
                auditLogging: this.moduleForm.auditLoggingToggle.checked
            };

            // Validate form data
            if (!this.validateModuleForm(formData)) {
                return;
            }

            try {
                const url = this.currentEditingModule 
                    ? `${this.apiBaseUrl}/modules/${this.currentEditingModule._id}` 
                    : `${this.apiBaseUrl}/modules`;
                
                const method = this.currentEditingModule ? 'PUT' : 'POST';

                const response = await fetch(url, {
                    method: method,
                    headers: {
                        'Authorization': `Bearer ${this.token}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(formData)
                });

                if (!response.ok) {
                    const errorData = await response.json();
                    throw new Error(errorData.message || 'Failed to save module');
                }

                // Show success notification
                window.dashboardApp.userInterface.showSuccessNotification(
                    this.currentEditingModule 
                        ? 'Module updated successfully' 
                        : 'New module created successfully'
                );

                // Close modal and refresh modules
                this.closeModuleModal();
                this.currentEditingModule = null;
                this.fetchModules();
            } catch (error) {
                this.handleError(error, 'Saving Module');
            }
        }

        // Validate Module Form Method
        validateModuleForm(formData) {
            // Name validation
            if (!formData.name) {
                this.showFormError('Module Name is required');
                return false;
            }

            // Category validation
            if (!formData.category) {
                this.showFormError('Module Category is required');
                return false;
            }

            // Access levels validation
            if (formData.accessLevels.length === 0) {
                this.showFormError('Select at least one access level');
                return false;
            }

            // Features validation
            if (formData.features.length === 0) {
                this.showFormError('Select at least one feature');
                return false;
            }

            // Pricing plan validation
            if (!formData.pricingPlan) {
                this.showFormError('Select a pricing plan');
                return false;
            }

            return true;
        }

        // Show Form Error Method
        showFormError(message) {
            // Create or get error container
            let errorContainer = this.moduleModal.querySelector('.form-error');
            if (!errorContainer) {
                errorContainer = document.createElement('div');
                errorContainer.className = 'form-error text-danger';
                this.moduleModal.querySelector('.modal-body').prepend(errorContainer);
            }

            // Show error message
            errorContainer.textContent = message;
            errorContainer.style.display = 'block';

            // Auto-hide after 3 seconds
            setTimeout(() => {
                errorContainer.style.display = 'none';
            }, 3000);
        }

        // Handle Edit Module Method
        handleEditModule(module) {
            // Set current editing module
            this.currentEditingModule = module;

            // Populate form with existing module data
            this.moduleForm.moduleName.value = module.name;
            this.moduleForm.moduleCategory.value = module.category;
            this.moduleForm.moduleDescription.value = module.description || '';
            this.moduleForm.moduleStatus.value = module.isActive ? 'active' : 'inactive';
            this.moduleForm.complianceLevel.value = module.complianceLevel;
            this.moduleForm.pricingPlan.value = module.pricingPlan || '';
            this.moduleForm.auditLoggingToggle.checked = module.auditLogging || false;

            // Reset and repopulate features
            this.populateFeatureCheckboxes();

            // Check previously selected features and access levels
            if (module.features) {
                module.features.forEach(feature => {
                    const checkbox = this.moduleForm.querySelector(`input[name="features"][value="${feature}"]`);
                    if (checkbox) checkbox.checked = true;
                });
            }

            if (module.accessLevels) {
                module.accessLevels.forEach(level => {
                    const checkbox = this.moduleForm.querySelector(`input[name="accessLevels"][value="${level}"]`);
                    if (checkbox) checkbox.checked = true;
                });
            }

            // Show modal
            this.handleAddNewModule();
        }

        // Handle Delete Module Method
        async handleDeleteModule(moduleId) {
            // Confirm deletion
            const confirmDelete = window.confirm('Are you sure you want to delete this module?');
            
            if (!confirmDelete) return;

            try {
                const response = await fetch(`${this.apiBaseUrl}/modules/${moduleId}`, {
                    method: 'DELETE',
                    headers: {
                        'Authorization': `Bearer ${this.token}`,
                        'Content-Type': 'application/json'
                    }
                });

                if (!response.ok) {
                    const errorData = await response.json();
                    throw new Error(errorData.message || 'Failed to delete module');
                }

                // Show success notification
                window.dashboardApp.userInterface.showSuccessNotification('Module deleted successfully');

                // Refresh modules
                this.fetchModules();
            } catch (error) {
                this.handleError(error, 'Deleting Module');
            }
        }
                // Fetch Audit Logs Method
        async fetchAuditLogs() {
            try {
                // Prepare query parameters
                const startDate = this.auditStartDate.value;
                const endDate = this.auditEndDate.value;
                const activityType = this.activityTypeFilter.value;

                // Construct API endpoint
                const url = new URL(`${this.apiBaseUrl}/modules/activity-logs`);
                
                if (startDate) url.searchParams.append('startDate', startDate);
                if (endDate) url.searchParams.append('endDate', endDate);
                if (activityType) url.searchParams.append('type', activityType);

                // Fetch audit logs
                const response = await fetch(url, {
                    method: 'GET',
                    headers: {
                        'Authorization': `Bearer ${this.token}`,
                        'Content-Type': 'application/json'
                    }
                });

                if (!response.ok) {
                    throw new Error('Failed to fetch audit logs');
                }

                const data = await response.json();

                // Render audit logs
                this.renderAuditLogs(data.data);
                this.updateAuditLogsPagination(data.pagination);
            } catch (error) {
                this.handleError(error, 'Fetching Audit Logs');
                this.renderNoAuditLogsState();
            }
        }

        // Render Audit Logs Method
        renderAuditLogs(logs) {
            // Clear existing logs
            this.auditLogsTableBody.innerHTML = '';

            // Handle empty state
            if (!logs || logs.length === 0) {
                this.renderNoAuditLogsState();
                return;
            }

            // Render logs
            logs.forEach(log => {
                const logRow = this.createAuditLogRow(log);
                this.auditLogsTableBody.appendChild(logRow);
            });
        }

        // Create Audit Log Row Method
        createAuditLogRow(log) {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${new Date(log.timestamp).toLocaleString()}</td>
                <td>
                    <span class="badge ${this.getActivityBadgeClass(log.type)}">
                        ${this.formatActivityType(log.type)}
                    </span>
                </td>
                <td>${log.moduleName || 'N/A'}</td>
                <td>${log.user || 'System'}</td>
                <td>${this.formatLogDetails(log.details)}</td>
            `;
            return row;
        }

        // Get Activity Badge Class Method
        getActivityBadgeClass(type) {
            const badgeClasses = {
                'MODULE_CREATED': 'badge-success',
                'MODULE_UPDATED': 'badge-primary',
                'MODULE_DELETED': 'badge-danger',
                'MODULE_STATUS_CHANGED': 'badge-warning'
            };
            return badgeClasses[type] || 'badge-secondary';
        }

        // Format Activity Type Method
        formatActivityType(type) {
            return type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
        }

        // Format Log Details Method
        formatLogDetails(details) {
            if (!details) return 'No additional details';
            
            // Convert object to readable string
            return Object.entries(details)
                .map(([key, value]) => `${key}: ${JSON.stringify(value)}`)
                .join(', ');
        }

        // Update Audit Logs Pagination Method
        updateAuditLogsPagination(pagination) {
            // Update showing count
            const auditLogsShowingCount = document.getElementById('auditLogsShowingCount');
            auditLogsShowingCount.textContent = `Showing ${pagination.page} of ${pagination.totalPages} pages`;

            // Update pagination buttons
            const prevAuditLogsPageBtn = document.getElementById('prevAuditLogsPageBtn');
            const nextAuditLogsPageBtn = document.getElementById('nextAuditLogsPageBtn');
            
            prevAuditLogsPageBtn.disabled = pagination.page === 1;
            nextAuditLogsPageBtn.disabled = pagination.page === pagination.totalPages;

            // Generate page numbers
            this.generateAuditLogsPageNumbers(pagination);
        }

        // Generate Audit Logs Page Numbers Method
        generateAuditLogsPageNumbers(pagination) {
            const pageNumberContainer = document.getElementById('auditLogsPageNumberContainer');
            pageNumberContainer.innerHTML = '';

            for (let i = 1; i <= pagination.totalPages; i++) {
                const pageBtn = document.createElement('button');
                pageBtn.textContent = i;
                pageBtn.className = 'page-number';
                
                if (i === pagination.page) {
                    pageBtn.classList.add('active');
                }

                pageBtn.addEventListener('click', () => {
                    // Implement pagination logic if needed
                    // For now, this is a placeholder
                });

                pageNumberContainer.appendChild(pageBtn);
            }
        }

        // Render No Audit Logs State Method
        renderNoAuditLogsState() {
            this.auditLogsTableBody.innerHTML = `
                <tr>
                    <td colspan="5" class="text-center">
                        <div class="no-audit-logs">
                            <i class="fas fa-history"></i>
                            <p>No audit logs found</p>
                        </div>
                    </td>
                </tr>
            `;
        }

        // Cleanup Method
        cleanup() {
            // Remove event listeners
            if (this.addNewModuleBtn) {
                this.addNewModuleBtn.removeEventListener('click', this.handleAddNewModule);
            }

            // Remove modal if exists
            if (this.moduleModal) {
                this.moduleModal.remove();
            }

            // Clear references
            this.modulesGridContainer = null;
            this.addNewModuleBtn = null;
            this.moduleModal = null;
            this.moduleForm = null;
            this.currentEditingModule = null;
        }
    }

    // Expose WiseManager to the global scope
    window.WiseManager = WiseManager;
})();

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

            // DOM Element References
            this.modulesGridContainer = document.getElementById('modulesGridContainer');
            this.addNewModuleBtn = document.getElementById('addNewModuleBtn');
            this.moduleModal = document.getElementById('moduleModal');
            this.moduleForm = document.getElementById('moduleForm');
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

            // Bind methods
            this.initializeEventListeners = this.initializeEventListeners.bind(this);
            this.fetchModules = this.fetchModules.bind(this);
            this.renderModules = this.renderModules.bind(this);
            this.handleAddNewModule = this.handleAddNewModule.bind(this);
            this.handleModuleFormSubmit = this.handleModuleFormSubmit.bind(this);
            this.fetchAuditLogs = this.fetchAuditLogs.bind(this);

            // Initialize
            this.init();
        }

        init() {
            this.initializeEventListeners();
            this.fetchModules();
            this.fetchAuditLogs();
        }

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

        // Placeholder methods to be implemented in subsequent parts
        async fetchModules() {}
        renderModules() {}
        handleAddNewModule() {}
        handleModuleFormSubmit() {}
        async fetchAuditLogs() {}

        // Utility method for error handling
        handleError(error, context = 'Operation') {
            console.error(`${context} failed:`, error);
            window.dashboardApp.userInterface.showErrorNotification(
                `${context} failed. Please try again.`
            );
        }
    }
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

        updatePagination(pagination) {
            // Update showing count
            this.modulesShowingCount.textContent = `Showing ${pagination.page} of ${pagination.totalPages} pages`;

            // Update pagination buttons
            this.prevModulesPageBtn.disabled = pagination.page === 1;
            this.nextModulesPageBtn.disabled = pagination.page === pagination.totalPages;

            // Generate page numbers
            this.generatePageNumbers(pagination);
        }

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

        renderNoModulesState() {
            this.modulesGridContainer.innerHTML = `
                <div class="no-modules">
                    <i class="fas fa-cubes"></i>
                    <p>No modules found. Create your first module!</p>
                </div>
            `;
        }
            handleAddNewModule() {
            // Create modal dynamically if not exists
            if (!this.moduleModal) {
                this.createModuleModal();
            }

            // Reset form
            this.moduleForm.reset();
            this.populateFeatureCheckboxes();
            
            // Show modal
            this.moduleModal.classList.add('show');
            
            // Setup form submission
            this.moduleForm.onsubmit = this.handleModuleFormSubmit;
        }

        createModuleModal() {
            const modalHTML = `
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

            // Create modal element
            const modalContainer = document.createElement('div');
            modalContainer.innerHTML = modalHTML;
            document.body.appendChild(modalContainer.firstChild);

            // Cache modal reference
            this.moduleModal = document.getElementById('moduleModal');

            // Setup close and cancel buttons
            this.moduleModal.querySelector('.modal-close').addEventListener('click', this.closeModuleModal.bind(this));
            document.getElementById('cancelModuleBtn').addEventListener('click', this.closeModuleModal.bind(this));
        }

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
                ]
                // Add other categories as needed
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

        closeModuleModal() {
            if (this.moduleModal) {
                this.moduleModal.classList.remove('show');
            }
        }

         async handleModuleFormSubmit(event) {
            event.preventDefault();
            
            // Validate form
            if (!this.validateModuleForm()) {
                return;
            }

            // Collect form data
            const formData = this.collectModuleFormData();

            try {
                // Determine if this is an edit or create operation
                const url = this.currentEditingModule 
                    ? `${this.apiBaseUrl}/modules/${this.currentEditingModule._id}` 
                    : `${this.apiBaseUrl}/modules`;
                
                const method = this.currentEditingModule ? 'PUT' : 'POST';

                // Send request
                const response = await fetch(url, {
                    method: method,
                    headers: {
                        'Authorization': `Bearer ${this.token}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(formData)
                });

                // Handle response
                if (!response.ok) {
                    const errorData = await response.json();
                    throw new Error(errorData.message || 'Failed to save module');
                }

                const result = await response.json();

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

        validateModuleForm() {
            const form = document.getElementById('moduleForm');
            const moduleName = form.moduleName.value.trim();
            const moduleCategory = form.moduleCategory.value;
            
            // Basic validation
            if (!moduleName) {
                this.showFormError('Module Name is required');
                return false;
            }

            if (!moduleCategory) {
                this.showFormError('Module Category is required');
                return false;
            }

            // Additional custom validations can be added here
            return true;
        }

        collectModuleFormData() {
            const form = document.getElementById('moduleForm');
            
            // Collect basic module data
            const moduleData = {
                name: form.moduleName.value.trim(),
                category: form.moduleCategory.value,
                description: form.moduleDescription.value.trim(),
                isActive: form.moduleStatus.value === 'active',
                complianceLevel: form.complianceLevel.value,
                
                // Collect access levels
                accessLevels: Array.from(
                    form.querySelectorAll('input[name="accessLevels"]:checked')
                ).map(el => el.value),

                // Collect features
                features: Array.from(
                    form.querySelectorAll('input[name="features"]:checked')
                ).map(el => el.value),

                // Additional details
                pricingPlan: form.pricingPlan.value,
                auditLogging: form.auditLoggingToggle.checked
            };

            return moduleData;
        }

        handleEditModule(module) {
            // Set current editing module
            this.currentEditingModule = module;

            // Create modal if not exists
            if (!this.moduleModal) {
                this.createModuleModal();
            }

            // Populate form with existing module data
            this.populateEditModuleForm(module);

            // Show modal
            this.moduleModal.classList.add('show');

            // Update form submission handler
            this.moduleForm.onsubmit = this.handleModuleFormSubmit.bind(this);
        }

        populateEditModuleForm(module) {
            const form = document.getElementById('moduleForm');

            // Populate basic fields
            form.moduleName.value = module.name;
            form.moduleCategory.value = module.category;
            form.moduleDescription.value = module.description || '';
            form.moduleStatus.value = module.isActive ? 'active' : 'inactive';
            form.complianceLevel.value = module.complianceLevel;
            form.pricingPlan.value = module.pricingPlan || '';
            form.auditLoggingToggle.checked = module.auditLogging || false;

            // Reset and repopulate features
            this.populateFeatureCheckboxes();

            // Check previously selected features and access levels
            if (module.features) {
                module.features.forEach(feature => {
                    const checkbox = form.querySelector(`input[name="features"][value="${feature}"]`);
                    if (checkbox) checkbox.checked = true;
                });
            }

            if (module.accessLevels) {
                module.accessLevels.forEach(level => {
                    const checkbox = form.querySelector(`input[name="accessLevels"][value="${level}"]`);
                    if (checkbox) checkbox.checked = true;
                });
            }
        }

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

        getActivityBadgeClass(type) {
            const badgeClasses = {
                'MODULE_CREATED': 'badge-success',
                'MODULE_UPDATED': 'badge-primary',
                'MODULE_DELETED': 'badge-danger',
                'MODULE_STATUS_CHANGED': 'badge-warning'
            };
            return badgeClasses[type] || 'badge-secondary';
        }

        formatActivityType(type) {
            return type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
        }

        formatLogDetails(details) {
            if (!details) return 'No additional details';
            
            // Convert object to readable string
            return Object.entries(details)
                .map(([key, value]) => `${key}: ${JSON.stringify(value)}`)
                .join(', ');
        }

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
                });

                pageNumberContainer.appendChild(pageBtn);
            }
        }

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

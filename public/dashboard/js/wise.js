(function() {
    'use strict';

    // Prevent multiple instantiations
    if (window.WiseManager) {
        console.warn('WiseManager is already defined');
        return;
    }

    class WiseManager {
        constructor(apiBaseUrl) {
            // Configuration
            this.apiBaseUrl = apiBaseUrl;
            this.token = localStorage.getItem('token');
            
            // Pagination and Filtering
            this.currentPage = 1;
            this.pageSize = 10;
            this.totalModules = 0;
            this.currentCategory = 'all';
            this.currentComplianceLevel = '';
            this.searchQuery = '';

            // State Management
            this.currentEditModuleId = null;

            // Bind methods to ensure correct context
            this.fetchModules = this.fetchModules.bind(this);
            this.renderModules = this.renderModules.bind(this);
            this.handleCategoryChange = this.handleCategoryChange.bind(this);
            this.handleSearchInput = this.handleSearchInput.bind(this);
            this.handleComplianceFilter = this.handleComplianceFilter.bind(this);

            // Initialize
            this.initializeDOMElements();
            this.initializeEventListeners();
            this.fetchModules();
        }

        initializeDOMElements() {
            // Category Tabs
            this.categoryTabs = document.querySelectorAll('.category-tab');
            
            // Filter Elements
            this.searchInput = document.getElementById('moduleSearchInput');
            this.complianceFilter = document.getElementById('complianceFilter');
            
            // Table Container
            this.modulesTableContainer = document.getElementById('modulesTableContainer');
            
            // Pagination Container
            this.paginationContainer = document.getElementById('modulesPagination');
            
            // Add New Module Button
            this.addNewModuleBtn = document.getElementById('addNewModuleBtn');
        }

        initializeEventListeners() {
            // Category Tab Listeners
            this.categoryTabs.forEach(tab => {
                tab.addEventListener('click', this.handleCategoryChange);
            });

            // Search Input Listener
            this.searchInput.addEventListener('input', this.handleSearchInput);

            // Compliance Filter Listener
            this.complianceFilter.addEventListener('change', this.handleComplianceFilter);

            // Add New Module Button Listener
            this.addNewModuleBtn.addEventListener('click', this.openAddModuleModal.bind(this));
        }

        handleCategoryChange(event) {
            // Remove active class from all tabs
            this.categoryTabs.forEach(tab => tab.classList.remove('active'));
            
            // Add active class to clicked tab
            event.target.classList.add('active');
            
            // Update current category
            this.currentCategory = event.target.dataset.category;
            
            // Reset to first page
            this.currentPage = 1;
            
            // Fetch modules with new category
            this.fetchModules();
        }

        handleSearchInput() {
            // Update search query
            this.searchQuery = this.searchInput.value.trim();
            
            // Reset to first page
            this.currentPage = 1;
            
            // Fetch modules with search query
            this.fetchModules();
        }

        handleComplianceFilter() {
            // Update compliance level
            this.currentComplianceLevel = this.complianceFilter.value;
            
            // Reset to first page
            this.currentPage = 1;
            
            // Fetch modules with new filter
            this.fetchModules();
        }

        async fetchModules() {
            // Show loading state
            this.showLoadingState();

            try {
                // Construct query parameters
                const params = new URLSearchParams({
                    page: this.currentPage.toString(),
                    limit: this.pageSize.toString(),
                    ...(this.currentCategory !== 'all' && { category: this.currentCategory }),
                    ...(this.currentComplianceLevel && { complianceLevel: this.currentComplianceLevel }),
                    ...(this.searchQuery && { search: this.searchQuery })
                });

                // Fetch modules
                const response = await fetch(`${this.apiBaseUrl}/modules?${params}`, {
                    method: 'GET',
                    headers: {
                        'Authorization': `Bearer ${this.token}`,
                        'Content-Type': 'application/json'
                    }
                });

                // Parse response
                const result = await response.json();

                // Validate response
                if (!result.success) {
                    throw new Error(result.message || 'Failed to fetch modules');
                }

                // Update total modules
                this.totalModules = result.pagination.total;

                // Render modules and pagination
                this.renderModules(result.data);
                this.renderPagination(result.pagination);

            } catch (error) {
                // Handle fetch error
                this.handleFetchError(error);
            } finally {
                // Hide loading state
                this.hideLoadingState();
            }
        }

        renderModules(modules) {
            // Clear existing table
            this.modulesTableContainer.innerHTML = '';

            // Create table
            const table = document.createElement('table');
            table.className = 'modules-table';

            // Create table header
            const thead = document.createElement('thead');
            thead.innerHTML = `
                <tr>
                    <th>Module Name</th>
                    <th>Category</th>
                    <th>Compliance Level</th>
                    <th>Usage Count</th>
                    <th>Status</th>
                    <th>Actions</th>
                </tr>
            `;
            table.appendChild(thead);

            // Create table body
            const tbody = document.createElement('tbody');
            modules.forEach(module => {
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td>${module.name}</td>
                    <td>${this.capitalizeFirstLetter(module.category)}</td>
                    <td>${this.capitalizeFirstLetter(module.complianceLevel)}</td>
                    <td>${module.usageCount || 0}</td>
                    <td>
                        <span class="module-status ${module.isActive ? 'active' : 'inactive'}">
                            ${module.isActive ? 'Active' : 'Inactive'}
                        </span>
                    </td>
                    <td class="action-buttons">
                        <button class="action-btn edit" data-id="${module._id}">Edit</button>
                        <button class="action-btn toggle" data-id="${module._id}">
                            ${module.isActive ? 'Deactivate' : 'Activate'}
                        </button>
                    </td>
                `;
                tbody.appendChild(row);
            });

            table.appendChild(tbody);
            this.modulesTableContainer.appendChild(table);

            // Attach action listeners
            this.attachActionListeners();
        }

        attachActionListeners() {
            // Edit buttons
            const editButtons = this.modulesTableContainer.querySelectorAll('.action-btn.edit');
            editButtons.forEach(button => {
                button.addEventListener('click', (e) => {
                    const moduleId = e.target.getAttribute('data-id');
                    this.editModule(moduleId);
                });
            });

            // Toggle buttons
            const toggleButtons = this.modulesTableContainer.querySelectorAll('.action-btn.toggle');
            toggleButtons.forEach(button => {
                button.addEventListener('click', (e) => {
                    const moduleId = e.target.getAttribute('data-id');
                    this.toggleModuleStatus(moduleId);
                });
            });
        }

        // Utility methods
        capitalizeFirstLetter(string) {
            if (!string) return '';
            return string.charAt(0).toUpperCase() + string.slice(1).toLowerCase();
        }

        showLoadingState() {
            this.modulesTableContainer.innerHTML = `
                <div class="loading-spinner">
                    <i class="fas fa-spinner fa-spin"></i>
                    <p>Loading modules...</p>
                </div>
            `;
        }

        hideLoadingState() {
            // Remove loading state if needed
        }

        handleFetchError(error) {
            console.error('Module Fetch Error:', error);
            // Implement error notification
            alert(`Failed to load modules: ${error.message}`);
        }

        renderPagination(paginationData) {
            // Implement pagination rendering
            this.paginationContainer.innerHTML = `
                <div class="pagination-info">
                    Page ${paginationData.page} of ${paginationData.totalPages}
                </div>
                <div class="pagination-controls">
                    <button ${paginationData.page === 1 ? 'disabled' : ''}>Previous</button>
                    <button ${paginationData.page === paginationData.totalPages ? 'disabled' : ''}>Next</button>
                </div>
            `;
        }
    }

         openAddModuleModal() {
            // Create modal if not exists
            if (!this.moduleModal) {
                this.createModuleModal();
            }

            // Reset form
            this.resetModuleForm();

            // Set modal title
            document.getElementById('moduleModalTitle').textContent = 'Add New Module';

            // Show modal
            this.moduleModal.classList.add('show');
        }

        createModuleModal() {
            // Create modal dynamically
            this.moduleModal = document.createElement('div');
            this.moduleModal.id = 'moduleModalOverlay';
            this.moduleModal.className = 'modal-overlay';
            this.moduleModal.innerHTML = `
                <div class="modal-content">
                    <div class="modal-header">
                        <h2 id="moduleModalTitle">Add New Module</h2>
                        <button id="closeModuleModal" class="modal-close">&times;</button>
                    </div>
                    <form id="moduleForm" class="module-form">
                        <div class="form-group">
                            <label for="moduleName">Module Name</label>
                            <input type="text" id="moduleName" name="moduleName" class="form-control" required>
                            <div id="moduleNameError" class="form-error"></div>
                        </div>

                        <div class="form-group">
                            <label for="moduleCategory">Category</label>
                            <select id="moduleCategory" name="moduleCategory" class="form-control" required>
                                <option value="">Select Category</option>
                                <option value="hr">HR</option>
                                <option value="finance">Finance</option>
                                <option value="operations">Operations</option>
                                <option value="integrations">Integrations</option>
                            </select>
                            <div id="moduleCategoryError" class="form-error"></div>
                        </div>

                        <div class="form-group">
                            <label for="moduleDescription">Description</label>
                            <textarea id="moduleDescription" name="moduleDescription" class="form-control" required></textarea>
                            <div id="moduleDescriptionError" class="form-error"></div>
                        </div>

                        <div class="form-group">
                            <label for="moduleComplianceLevel">Compliance Level</label>
                            <select id="moduleComplianceLevel" name="moduleComplianceLevel" class="form-control" required>
                                <option value="">Select Compliance Level</option>
                                <option value="low">Low</option>
                                <option value="medium">Medium</option>
                                <option value="high">High</option>
                            </select>
                            <div id="moduleComplianceLevelError" class="form-error"></div>
                        </div>

                        <div class="form-group">
                            <label for="modulePermissions">Permissions</label>
                            <textarea id="modulePermissions" name="modulePermissions" class="form-control" 
                                placeholder="Enter module permissions (comma-separated)"></textarea>
                        </div>

                        <div class="form-group">
                            <label for="moduleSubscriptionTiers">Subscription Tiers</label>
                            <textarea id="moduleSubscriptionTiers" name="moduleSubscriptionTiers" class="form-control" 
                                placeholder="Enter subscription tiers (comma-separated)"></textarea>
                        </div>

                        <div class="form-group">
                            <label>
                                <input type="checkbox" id="moduleActiveStatus" name="moduleActiveStatus"> 
                                Active Module
                            </label>
                        </div>

                        <div class="modal-footer">
                            <button type="button" id="cancelModuleBtn" class="modal-btn modal-btn-secondary">Cancel</button>
                            <button type="submit" id="saveModuleBtn" class="modal-btn modal-btn-primary">Save Module</button>
                        </div>
                    </form>
                </div>
            `;

            // Append to body
            document.body.appendChild(this.moduleModal);

            // Setup modal event listeners
            this.setupModalEventListeners();

            return this.moduleModal;
        }

        setupModalEventListeners() {
            // Close modal button
            const closeModalBtn = this.moduleModal.querySelector('#closeModuleModal');
            closeModalBtn.addEventListener('click', () => this.closeModuleModal());

            // Cancel button
            const cancelBtn = this.moduleModal.querySelector('#cancelModuleBtn');
            cancelBtn.addEventListener('click', () => this.closeModuleModal());

            // Form submission
            const moduleForm = this.moduleModal.querySelector('#moduleForm');
            moduleForm.addEventListener('submit', (e) => this.handleModuleSubmit(e));
        }

        closeModuleModal() {
            if (this.moduleModal) {
                this.moduleModal.classList.remove('show');
            }
        }

        resetModuleForm() {
            const form = document.getElementById('moduleForm');
            if (form) {
                form.reset();
                // Clear any error messages
                form.querySelectorAll('.form-error').forEach(el => el.textContent = '');
            }
        }

        async handleModuleSubmit(event) {
            event.preventDefault();

            // Validate form
            if (!this.validateModuleForm()) {
                return;
            }

            try {
                // Prepare module data
                const moduleData = this.getModuleFormData();

                // Determine if it's an add or edit operation
                const isEditMode = this.currentEditModuleId;
                const url = isEditMode 
                    ? `${this.apiBaseUrl}/modules/${this.currentEditModuleId}` 
                    : `${this.apiBaseUrl}/modules`;
                const method = isEditMode ? 'PUT' : 'POST';

                // Send request
                const response = await fetch(url, {
                    method: method,
                    headers: {
                        'Authorization': `Bearer ${this.token}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(moduleData)
                });

                const result = await response.json();

                if (!response.ok) {
                    throw new Error(result.message || 'Failed to save module');
                }

                // Show success notification
                this.showSuccessNotification(
                    isEditMode ? 'Module updated successfully' : 'Module created successfully'
                );

                // Close modal and refresh modules
                this.closeModuleModal();
                this.fetchModules();

                // Reset edit mode
                this.currentEditModuleId = null;

            } catch (error) {
                console.error('Error saving module:', error);
                this.showErrorNotification(error.message);
            }
        }

        validateModuleForm() {
            const form = document.getElementById('moduleForm');
            let isValid = true;

            // Validate module name
            const moduleName = document.getElementById('moduleName');
            const moduleNameError = document.getElementById('moduleNameError');
            if (!moduleName.value.trim()) {
                moduleNameError.textContent = 'Module name is required';
                isValid = false;
            } else {
                moduleNameError.textContent = '';
            }

            // Add more validation as needed for other fields

            return isValid;
        }

        getModuleFormData() {
            return {
                name: document.getElementById('moduleName').value.trim(),
                category: document.getElementById('moduleCategory').value,
                description: document.getElementById('moduleDescription').value.trim(),
                complianceLevel: document.getElementById('moduleComplianceLevel').value,
                permissions: document.getElementById('modulePermissions').value.trim().split(',').map(p => p.trim()),
                subscriptionTiers: document.getElementById('moduleSubscriptionTiers').value.trim().split(',').map(t => t.trim()),
                isActive: document.getElementById('moduleActiveStatus').checked
            };
        }

        async editModule(moduleId) {
            try {
                // Fetch module details
                const response = await fetch(`${this.apiBaseUrl}/modules/${moduleId}`, {
                    method: 'GET',
                    headers: {
                        'Authorization': `Bearer ${this.token}`,
                        'Content-Type': 'application/json'
                    }
                });

                const result = await response.json();

                if (!response.ok) {
                    throw new Error(result.message || 'Failed to fetch module details');
                }

                // Store current edit module ID
                this.currentEditModuleId = moduleId;

                // Open modal
                this.openAddModuleModal();

                // Update modal title
                document.getElementById('moduleModalTitle').textContent = 'Edit Module';

                // Populate form fields
                const module = result.data;
                document.getElementById('moduleName').value = module.name;
                document.getElementById('moduleCategory').value = module.category;
                document.getElementById('moduleDescription').value = module.description;
                document.getElementById('moduleComplianceLevel').value = module.complianceLevel;
                document.getElementById('modulePermissions').value = 
                    module.permissions ? module.permissions.join(', ') : '';
                document.getElementById('moduleSubscriptionTiers').value = 
                    module.subscriptionTiers ? module.subscriptionTiers.join(', ') : '';
                document.getElementById('moduleActiveStatus').checked = module.isActive;

            } catch (error) {
                console.error('Error editing module:', error);
                this.showErrorNotification(error.message);
            }
        }

         async toggleModuleStatus(moduleId) {
            try {
                // Determine current status
                const currentStatus = this.getCurrentModuleStatus(moduleId);

                // Send status toggle request
                const response = await fetch(`${this.apiBaseUrl}/modules/${moduleId}/status`, {
                    method: 'PATCH',
                    headers: {
                        'Authorization': `Bearer ${this.token}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ isActive: !currentStatus })
                });

                const result = await response.json();

                if (!response.ok) {
                    throw new Error(result.message || 'Failed to toggle module status');
                }

                // Show success notification
                this.showSuccessNotification(
                    `Module ${result.data.isActive ? 'activated' : 'deactivated'} successfully`
                );

                // Refresh modules list
                this.fetchModules();

            } catch (error) {
                console.error('Error toggling module status:', error);
                this.showErrorNotification(error.message);
            }
        }

        getCurrentModuleStatus(moduleId) {
            const moduleRow = this.modulesTableContainer.querySelector(`[data-id="${moduleId}"]`).closest('tr');
            const statusCell = moduleRow.querySelector('.module-status');
            return statusCell.classList.contains('active');
        }

        renderPagination(paginationData) {
            // Clear existing pagination
            this.paginationContainer.innerHTML = '';

            // Create pagination info
            const paginationInfo = document.createElement('div');
            paginationInfo.className = 'pagination-info';
            paginationInfo.textContent = `
                Page ${paginationData.page} of ${paginationData.totalPages} 
                (Total ${paginationData.total} modules)
            `;

            // Create pagination controls
            const paginationControls = document.createElement('div');
            paginationControls.className = 'pagination-controls';

            // Previous button
            const prevButton = document.createElement('button');
            prevButton.className = 'pagination-btn';
            prevButton.textContent = 'Previous';
            prevButton.disabled = paginationData.page === 1;
            prevButton.addEventListener('click', () => {
                if (this.currentPage > 1) {
                    this.currentPage--;
                    this.fetchModules();
                }
            });

            // Next button
            const nextButton = document.createElement('button');
            nextButton.className = 'pagination-btn';
            nextButton.textContent = 'Next';
            nextButton.disabled = paginationData.page === paginationData.totalPages;
            nextButton.addEventListener('click', () => {
                if (this.currentPage < paginationData.totalPages) {
                    this.currentPage++;
                    this.fetchModules();
                }
            });

            // Append buttons to controls
            paginationControls.appendChild(prevButton);
            paginationControls.appendChild(nextButton);

            // Append to pagination container
            this.paginationContainer.appendChild(paginationInfo);
            this.paginationContainer.appendChild(paginationControls);
        }

        showSuccessNotification(message) {
            // Check if dashboard notification system exists
            if (window.dashboardApp && window.dashboardApp.userInterface) {
                window.dashboardApp.userInterface.showSuccessNotification(message);
            } else {
                // Fallback to basic alert
                alert(message);
            }
        }

        showErrorNotification(message) {
            // Check if dashboard notification system exists
            if (window.dashboardApp && window.dashboardApp.userInterface) {
                window.dashboardApp.userInterface.showErrorNotification(message);
            } else {
                // Fallback to basic alert
                console.error(message);
                alert(message);
            }
        }

        // Cleanup method to remove event listeners and reset state
        cleanup() {
            // Remove category tab listeners
            this.categoryTabs.forEach(tab => {
                tab.removeEventListener('click', this.handleCategoryChange);
            });

            // Remove search input listener
            this.searchInput.removeEventListener('input', this.handleSearchInput);

            // Remove compliance filter listener
            this.complianceFilter.removeEventListener('change', this.handleComplianceFilter);

            // Remove modal event listeners if modal exists
            if (this.moduleModal) {
                const closeModalBtn = this.moduleModal.querySelector('#closeModuleModal');
                const cancelBtn = this.moduleModal.querySelector('#cancelModuleBtn');
                const moduleForm = this.moduleModal.querySelector('#moduleForm');

                closeModalBtn.removeEventListener('click', this.closeModuleModal);
                cancelBtn.removeEventListener('click', this.closeModuleModal);
                moduleForm.removeEventListener('submit', this.handleModuleSubmit);

                // Remove modal from DOM
                this.moduleModal.remove();
            }

            // Reset state
            this.currentPage = 1;
            this.currentEditModuleId = null;
            this.searchQuery = '';
            this.currentCategory = 'all';
            this.currentComplianceLevel = '';
        }
    }
         // Advanced filtering and search methods
        setupAdvancedFiltering() {
            // Additional filtering logic can be added here
            const advancedFilterBtn = document.getElementById('advancedFilterBtn');
            if (advancedFilterBtn) {
                advancedFilterBtn.addEventListener('click', this.showAdvancedFilterModal.bind(this));
            }
        }

        showAdvancedFilterModal() {
            // Create advanced filter modal
            const modalOverlay = document.createElement('div');
            modalOverlay.className = 'modal-overlay advanced-filter-modal';
            modalOverlay.innerHTML = `
                <div class="modal-content">
                    <div class="modal-header">
                        <h2>Advanced Module Filters</h2>
                        <button class="modal-close">&times;</button>
                    </div>
                    <div class="modal-body">
                        <div class="filter-group">
                            <label>Date Range</label>
                            <div class="date-range-picker">
                                <input type="date" id="startDate" name="startDate">
                                <input type="date" id="endDate" name="endDate">
                            </div>
                        </div>
                        <div class="filter-group">
                            <label>Additional Filters</label>
                            <select id="additionalFilters" multiple>
                                <option value="recently_added">Recently Added</option>
                                <option value="high_usage">High Usage</option>
                                <option value="low_usage">Low Usage</option>
                            </select>
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button id="applyAdvancedFilters" class="btn btn-primary">Apply Filters</button>
                        <button id="clearAdvancedFilters" class="btn btn-secondary">Clear Filters</button>
                    </div>
                </div>
            `;

            // Append to body
            document.body.appendChild(modalOverlay);

            // Setup event listeners
            this.setupAdvancedFilterModalListeners(modalOverlay);
        }

        setupAdvancedFilterModalListeners(modalOverlay) {
            const closeBtn = modalOverlay.querySelector('.modal-close');
            const applyFiltersBtn = modalOverlay.querySelector('#applyAdvancedFilters');
            const clearFiltersBtn = modalOverlay.querySelector('#clearAdvancedFilters');

            closeBtn.addEventListener('click', () => modalOverlay.remove());
            
            applyFiltersBtn.addEventListener('click', () => {
                this.applyAdvancedFilters(modalOverlay);
            });

            clearFiltersBtn.addEventListener('click', () => {
                this.clearAdvancedFilters(modalOverlay);
            });
        }

        applyAdvancedFilters(modalOverlay) {
            const startDate = modalOverlay.querySelector('#startDate').value;
            const endDate = modalOverlay.querySelector('#endDate').value;
            const additionalFilters = Array.from(
                modalOverlay.querySelectorAll('#additionalFilters option:checked')
            ).map(option => option.value);

            // Update filtering parameters
            this.advancedFilterParams = {
                startDate,
                endDate,
                additionalFilters
            };

            // Fetch modules with new filters
            this.fetchModules();

            // Close modal
            modalOverlay.remove();
        }

        clearAdvancedFilters(modalOverlay) {
            // Reset form
            modalOverlay.querySelector('#startDate').value = '';
            modalOverlay.querySelector('#endDate').value = '';
            modalOverlay.querySelectorAll('#additionalFilters option:checked')
                .forEach(option => option.selected = false);

            // Clear advanced filter params
            this.advancedFilterParams = null;

            // Fetch modules with default filters
            this.fetchModules();

            // Close modal
            modalOverlay.remove();
        }

        // Export functionality
        exportModules() {
            try {
                // Prepare export parameters
                const exportParams = new URLSearchParams({
                    category: this.currentCategory,
                    complianceLevel: this.currentComplianceLevel,
                    search: this.searchQuery
                });

                // Fetch export data
                fetch(`${this.apiBaseUrl}/modules/export?${exportParams}`, {
                    method: 'GET',
                    headers: {
                        'Authorization': `Bearer ${this.token}`
                    }
                })
                .then(response => response.blob())
                .then(blob => {
                    // Create download link
                    const url = window.URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.style.display = 'none';
                    a.href = url;
                    a.download = `modules_export_${new Date().toISOString()}.csv`;
                    document.body.appendChild(a);
                    a.click();
                    window.URL.revokeObjectURL(url);
                })
                .catch(error => {
                    this.showErrorNotification('Export failed: ' + error.message);
                });
            } catch (error) {
                this.showErrorNotification('Export error: ' + error.message);
            }
        }

        // Comprehensive error tracking
        trackError(error, context = {}) {
            const errorLog = {
                message: error.message,
                stack: error.stack,
                timestamp: new Date().toISOString(),
                context: context
            };

            // Send to error tracking service or log
            console.error('Module Management Error:', errorLog);

            // Optional: Send to server-side error logging
            this.sendErrorToServer(errorLog);
        }

        sendErrorToServer(errorLog) {
            try {
                fetch(`${this.apiBaseUrl}/error-logs`, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${this.token}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(errorLog)
                });
            } catch (error) {
                console.error('Failed to send error log:', error);
            }
        }
    }
    // Expose to global scope
    window.WiseManager = WiseManager;
})();

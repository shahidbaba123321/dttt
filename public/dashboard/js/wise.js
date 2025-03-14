(function() {
    'use strict';

    // Prevent multiple instantiations
    if (window.WiseManager) {
        console.warn('WiseManager is already defined');
        return;
    }

    // WiseManager Class Definition
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
            try {
                // Construct query parameters
                const params = new URLSearchParams({
                    page: this.currentPage,
                    limit: this.pageSize,
                    category: this.currentCategory === 'all' ? '' : this.currentCategory,
                    complianceLevel: this.currentComplianceLevel,
                    search: this.searchQuery
                });

                // Fetch modules from API
                const response = await fetch(`${this.apiBaseUrl}/modules?${params}`, {
                    method: 'GET',
                    headers: {
                        'Authorization': `Bearer ${this.token}`,
                        'Content-Type': 'application/json'
                    }
                });

                // Parse response
                const result = await response.json();

                if (!response.ok) {
                    throw new Error(result.message || 'Failed to fetch modules');
                }

                // Update total modules and render
                this.totalModules = result.pagination.total;
                this.renderModules(result.data);
                this.renderPagination(result.pagination);

            } catch (error) {
                console.error('Error fetching modules:', error);
                this.showErrorNotification(error.message);
            }
        }

        renderModules(modules) {
            // Clear existing table
            this.modulesTableContainer.innerHTML = '';

            // Create table if it doesn't exist
            const table = document.createElement('table');
            table.className = 'modules-table';

            // Create table header
            const thead = document.createElement('thead');
            thead.innerHTML = `
                <tr>
                    <th>Module Name</th>
                    <th>Category</th>
                    <th>Compliance Level</th>
                    <th>Status</th>
                    <th>Actions</th>
                </tr>
            `;
            table.appendChild(thead);

            // Create table body
            const tbody = document.createElement('tbody');

            // Render modules
            modules.forEach(module => {
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td>${module.name}</td>
                    <td>${this.capitalizeFirstLetter(module.category)}</td>
                    <td>${this.capitalizeFirstLetter(module.complianceLevel)}</td>
                    <td>
                        <span class="module-status ${module.isActive ? 'active' : 'inactive'}">
                            ${module.isActive ? 'Active' : 'Inactive'}
                        </span>
                    </td>
                    <td class="action-buttons">
                        <button 
                            class="action-btn edit" 
                            data-id="${module._id}"
                            onclick="window.companiesManager.editModule('${module._id}')"
                        >
                            Edit
                        </button>
                        <button 
                            class="action-btn toggle" 
                            data-id="${module._id}"
                            onclick="window.companiesManager.toggleModuleStatus('${module._id}')"
                        >
                            ${module.isActive ? 'Deactivate' : 'Activate'}
                        </button>
                    </td>
                `;
                tbody.appendChild(row);
            });

            table.appendChild(tbody);
            this.modulesTableContainer.appendChild(table);
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

        // Utility method to capitalize first letter
        capitalizeFirstLetter(string) {
            if (!string) return '';
            return string.charAt(0).toUpperCase() + string.slice(1).toLowerCase();
        }

            openAddModuleModal() {
            // Create modal dynamically if not exists
            let modalOverlay = document.getElementById('moduleModalOverlay');
            if (!modalOverlay) {
                modalOverlay = this.createModuleModal();
            }

            // Reset form
            this.resetModuleForm();

            // Show modal
            modalOverlay.classList.add('show');
        }

        createModuleModal() {
            const modalOverlay = document.createElement('div');
            modalOverlay.id = 'moduleModalOverlay';
            modalOverlay.className = 'modal-overlay';
            modalOverlay.innerHTML = `
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
                            <div id="modulePermissionsError" class="form-error"></div>
                        </div>

                        <div class="form-group">
                            <label for="moduleSubscriptionTiers">Subscription Tiers</label>
                            <textarea id="moduleSubscriptionTiers" name="moduleSubscriptionTiers" class="form-control" 
                                placeholder="Enter subscription tiers (comma-separated)"></textarea>
                            <div id="moduleSubscriptionTiersError" class="form-error"></div>
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

            // Add event listeners
            document.body.appendChild(modalOverlay);

            // Close modal button
            const closeModalBtn = modalOverlay.querySelector('#closeModuleModal');
            closeModalBtn.addEventListener('click', () => this.closeModuleModal());

            // Cancel button
            const cancelBtn = modalOverlay.querySelector('#cancelModuleBtn');
            cancelBtn.addEventListener('click', () => this.closeModuleModal());

            // Form submission
            const moduleForm = modalOverlay.querySelector('#moduleForm');
            moduleForm.addEventListener('submit', (e) => this.handleModuleSubmit(e));

            return modalOverlay;
        }

        resetModuleForm() {
            const form = document.getElementById('moduleForm');
            if (form) {
                form.reset();
                // Clear any previous error messages
                form.querySelectorAll('.form-error').forEach(el => el.textContent = '');
            }
        }

        closeModuleModal() {
            const modalOverlay = document.getElementById('moduleModalOverlay');
            if (modalOverlay) {
                modalOverlay.classList.remove('show');
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

                // Open modal and populate form
                this.openAddModuleModal();

                // Update modal title
                const modalTitle = document.getElementById('moduleModalTitle');
                modalTitle.textContent = 'Edit Module';

                // Populate form fields
                const module = result.data;
                document.getElementById('moduleName').value = module.name;
                document.getElementById('moduleCategory').value = module.category;
                document.getElementById('moduleDescription').value = module.description;
                document.getElementById('moduleComplianceLevel').value = module.complianceLevel;
                document.getElementById('modulePermissions').value = module.permissions ? module.permissions.join(', ') : '';
                document.getElementById('moduleSubscriptionTiers').value = module.subscriptionTiers ? module.subscriptionTiers.join(', ') : '';
                document.getElementById('moduleActiveStatus').checked = module.isActive;

            } catch (error) {
                console.error('Error editing module:', error);
                this.showErrorNotification(error.message);
            }
        }

        async toggleModuleStatus(moduleId) {
            try {
                // Fetch current module status
                const response = await fetch(`${this.apiBaseUrl}/modules/${moduleId}/status`, {
                    method: 'PATCH',
                    headers: {
                        'Authorization': `Bearer ${this.token}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        isActive: !this.getCurrentModuleStatus(moduleId)
                    })
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
            const moduleRow = document.querySelector(`[data-id="${moduleId}"]`).closest('tr');
            const statusCell = moduleRow.querySelector('.module-status');
            return statusCell.classList.contains('active');
        }

        showSuccessNotification(message) {
            if (window.dashboardApp && window.dashboardApp.userInterface) {
                window.dashboardApp.userInterface.showSuccessNotification(message);
            } else {
                alert(message);
            }
        }

        showErrorNotification(message) {
            if (window.dashboardApp && window.dashboardApp.userInterface) {
                window.dashboardApp.userInterface.showErrorNotification(message);
            } else {
                alert(message);
            }
        }

        // Cleanup method for when the module is no longer needed
        cleanup() {
            // Remove event listeners
            this.categoryTabs.forEach(tab => {
                tab.removeEventListener('click', this.handleCategoryChange);
            });

            this.searchInput.removeEventListener('input', this.handleSearchInput);
            this.complianceFilter.removeEventListener('change', this.handleComplianceFilter);

            // Remove modal if it exists
            const modalOverlay = document.getElementById('moduleModalOverlay');
            if (modalOverlay) {
                modalOverlay.remove();
            }

            // Clear any references
            this.categoryTabs = null;
            this.searchInput = null;
            this.complianceFilter = null;
            this.modulesTableContainer = null;
            this.paginationContainer = null;
            this.addNewModuleBtn = null;
        }
    }

    // Expose the WiseManager to the global scope
    window.WiseManager = WiseManager;
})();

(function() {
    // Check if ModulesManager already exists
    if (window.ModulesManager) {
        return;
    }

    class ModulesManager {
        constructor(apiBaseUrl) {
            // Core configuration
            this.baseUrl = apiBaseUrl || 'https://18.215.160.136.nip.io/api';
            this.token = localStorage.getItem('token');
            
            // Comprehensive method binding
            this.fetchModules = this.fetchModules.bind(this);
            this.renderModules = this.renderModules.bind(this);
            this.showAddModuleModal = this.showAddModuleModal.bind(this);
            this.closeModal = this.closeModal.bind(this);
            this.addNewModule = this.addNewModule.bind(this);
            this.updateModule = this.updateModule.bind(this);
            this.deleteModule = this.deleteModule.bind(this);
            this.toggleModuleStatus = this.toggleModuleStatus.bind(this);
            this.fetchActivityLogs = this.fetchActivityLogs.bind(this);
            this.renderActivityLogs = this.renderActivityLogs.bind(this);
            this.filterActivityLogs = this.filterActivityLogs.bind(this);

            // Create modal dynamically
            this.createModuleModal();

            // Initialize with delay to ensure DOM readiness
            this.initializeWithDelay();
        }

        createModuleModal() {
    const existingModal = document.getElementById('addModuleModal');
    if (existingModal) {
        console.log('Modal already exists');
        return;
    }

    const modalContainer = document.getElementById('moduleModalContainer') || 
                            document.body.appendChild(document.createElement('div'));
    modalContainer.id = 'moduleModalContainer';

    const modalHTML = `
        <div class="modal" id="addModuleModal" style="display:none;">
            <div class="modal-dialog">
                <div class="modal-content">
                    <div class="modal-header">
                        <h2>Add New Module</h2>
                        <button class="modal-close" id="closeModuleModal">&times;</button>
                    </div>
                    <div class="modal-body">
                        <form id="addModuleForm">
                            <div class="form-group">
                                <label>Module Name</label>
                                <input type="text" name="moduleName" required>
                            </div>
                            <div class="form-group">
                                <label>Category</label>
                                <select name="moduleCategory" required>
                                    <option value="">Select Category</option>
                                    <option value="hr">HR</option>
                                    <option value="finance">Finance</option>
                                    <option value="operations">Operations</option>
                                    <option value="integrations">Integrations</option>
                                </select>
                            </div>
                            <div class="form-group">
                                <label>Description</label>
                                <textarea name="moduleDescription" required></textarea>
                            </div>
                            <div class="form-actions">
                                <button type="button" id="cancelAddModule">Cancel</button>
                                <button type="submit">Add Module</button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    `;

    modalContainer.innerHTML = modalHTML;
    console.log('Modal created and added to container');
}
        initializeWithDelay() {
            setTimeout(() => {
                this.setupEventListeners();
                this.fetchModules();
                this.fetchActivityLogs();
            }, 300);
        }

        setupEventListeners() {
    console.log('Setting up event listeners');

    // Log all elements
    console.log('Add New Module Button:', document.getElementById('addNewModuleBtn'));
    console.log('Add Module Modal:', document.getElementById('addModuleModal'));
    console.log('Close Modal Button:', document.getElementById('closeModuleModal'));
    console.log('Cancel Add Module Button:', document.getElementById('cancelAddModule'));
    console.log('Add Module Form:', document.getElementById('addModuleForm'));

    // Add New Module Button
    const addNewModuleBtn = document.getElementById('addNewModuleBtn');
    const addModuleModal = document.getElementById('addModuleModal');
    const closeModalBtn = document.getElementById('closeModuleModal');
    const cancelAddModuleBtn = document.getElementById('cancelAddModule');
    const addModuleForm = document.getElementById('addModuleForm');

    // Detailed logging for each element
    if (!addNewModuleBtn) {
        console.error('Add New Module Button not found');
        // Try alternative selector
        const altButton = document.querySelector('.btn-primary[data-action="add-module"]');
        if (altButton) {
            console.log('Alternative button found:', altButton);
        }
    }

    if (!addModuleModal) {
        console.error('Add Module Modal not found');
        // Force create modal if not exists
        this.createModuleModal();
    }

    // Ensure button has click event
    if (addNewModuleBtn) {
        // Remove existing listeners to prevent multiple bindings
        addNewModuleBtn.removeEventListener('click', this.showAddModuleModal);
        
        addNewModuleBtn.addEventListener('click', (event) => {
            event.preventDefault();
            event.stopPropagation();
            
            console.log('Add New Module Button Clicked');
            console.log('Modal before show:', document.getElementById('addModuleModal'));
            
            // Force modal creation if not exists
            if (!document.getElementById('addModuleModal')) {
                this.createModuleModal();
            }
            
            this.showAddModuleModal();
        });

        // Additional visibility debugging
        console.log('Button styles:', {
            display: addNewModuleBtn.style.display,
            visibility: addNewModuleBtn.style.visibility,
            computedDisplay: window.getComputedStyle(addNewModuleBtn).display
        });
    }

    // Rest of the event listeners remain the same
    if (closeModalBtn) {
        closeModalBtn.addEventListener('click', this.closeModal);
    }

    if (cancelAddModuleBtn) {
        cancelAddModuleBtn.addEventListener('click', this.closeModal);
    }

    if (addModuleForm) {
        addModuleForm.addEventListener('submit', this.addNewModule);
    }
}


            showAddModuleModal() {
            const modal = document.getElementById('addModuleModal');
            if (modal) {
                console.log('Showing Add Module Modal');
                modal.style.display = 'flex';
                modal.classList.add('show');
            } else {
                console.error('Modal element not found');
            }
        }

        closeModal() {
            const modal = document.getElementById('addModuleModal');
            if (modal) {
                modal.style.display = 'none';
                modal.classList.remove('show');
            }
        }

        showNotification(message, type = 'info') {
            // Use dashboard's notification system if available
            if (window.dashboardApp && window.dashboardApp.userInterface) {
                window.dashboardApp.userInterface.showNotification(message, type);
            } else {
                // Fallback notification
                alert(`${type.toUpperCase()}: ${message}`);
            }
        }

        async fetchModules() {
            try {
                console.log('Fetching modules');
                const response = await fetch(`${this.baseUrl}/modules`, {
                    method: 'GET',
                    headers: {
                        'Authorization': `Bearer ${this.token}`,
                        'Content-Type': 'application/json'
                    }
                });

                const result = await response.json();
                console.log('Modules fetch result:', result);

                if (result.success) {
                    this.renderModules(result.data);
                } else {
                    throw new Error(result.message || 'Failed to fetch modules');
                }
            } catch (error) {
                console.error('Modules fetch error:', error);
                this.showNotification(error.message, 'error');
            }
        }

        renderModules(modules) {
            console.log('Rendering modules:', modules);
            const categoryMappings = {
                'hr': 'hrModulesList',
                'finance': 'financeModulesList',
                'operations': 'operationsModulesList',
                'integrations': 'integrationsModulesList'
            };

            // Clear existing modules
            Object.values(categoryMappings).forEach(listId => {
                const list = document.getElementById(listId);
                if (list) list.innerHTML = '';
            });

            modules.forEach(module => {
                const listId = categoryMappings[module.category];
                const moduleList = document.getElementById(listId);

                if (moduleList) {
                    const moduleCard = this.createModuleCard(module);
                    moduleList.appendChild(moduleCard);
                }
            });
        }

        createModuleCard(module) {
            const card = document.createElement('div');
            card.className = 'module-card';
            card.dataset.moduleId = module._id;

            const complianceClass = {
                'high': 'compliance-high',
                'medium': 'compliance-medium',
                'low': 'compliance-low'
            };

            card.innerHTML = `
                <div class="module-card-header">
                    <h4 class="module-title">${module.name}</h4>
                    <div class="module-status-toggle">
                        <input type="checkbox" id="moduleStatus-${module._id}" 
                               ${module.isActive ? 'checked' : ''}>
                        <label for="moduleStatus-${module._id}" class="toggle-switch"></label>
                    </div>
                </div>
                <div class="module-card-content">
                    <p class="module-description">${module.description}</p>
                    <div class="module-meta">
                        <span class="module-category">${module.category.toUpperCase()}</span>
                        <span class="module-compliance ${complianceClass[module.complianceLevel]}">
                            ${module.complianceLevel.toUpperCase()} Compliance
                        </span>
                    </div>
                </div>
                <div class="module-actions">
                    <button class="btn btn-sm btn-edit">Edit</button>
                    <button class="btn btn-sm btn-delete">Delete</button>
                </div>
            `;

            // Add event listeners
            const editBtn = card.querySelector('.btn-edit');
            const deleteBtn = card.querySelector('.btn-delete');
            const statusToggle = card.querySelector('input[type="checkbox"]');

            editBtn.addEventListener('click', () => this.showEditModuleModal(module));
            deleteBtn.addEventListener('click', () => this.deleteModule(module._id));
            statusToggle.addEventListener('change', (e) => this.toggleModuleStatus(module._id, e.target.checked));

            return card;
        }

            async addNewModule(event) {
            event.preventDefault();
            console.log('Add New Module called');

            const form = event.target;
            const formData = new FormData(form);

            const moduleData = {
                name: formData.get('moduleName'),
                category: formData.get('moduleCategory'),
                description: formData.get('moduleDescription'),
                complianceLevel: formData.get('complianceLevel'),
                isActive: true
            };

            console.log('Module Data:', moduleData);

            try {
                // Validate required fields
                if (!moduleData.name || !moduleData.category || !moduleData.description) {
                    this.showNotification('Please fill in all required fields', 'error');
                    return;
                }

                const response = await fetch(`${this.baseUrl}/modules`, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${this.token}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(moduleData)
                });

                const result = await response.json();
                console.log('Add Module Response:', result);

                if (result.success) {
                    this.showNotification('Module added successfully', 'success');
                    this.closeModal();
                    this.fetchModules();
                    this.fetchActivityLogs();
                    form.reset();
                } else {
                    throw new Error(result.message || 'Failed to add module');
                }
            } catch (error) {
                console.error('Add module error:', error);
                this.showNotification(error.message, 'error');
            }
        }

        showEditModuleModal(module) {
            console.log('Show Edit Module Modal called', module);
            
            const modal = document.getElementById('editModuleModal');
            if (!modal) {
                // Create edit modal if it doesn't exist
                this.createEditModuleModal(module);
                return;
            }

            // Populate form fields
            const form = modal.querySelector('form');
            
            // Hidden ID field
            const moduleIdField = form.querySelector('input[name="moduleId"]');
            if (moduleIdField) moduleIdField.value = module._id;

            // Module Name
            const nameField = form.querySelector('input[name="moduleName"]');
            if (nameField) nameField.value = module.name;

            // Category
            const categoryField = form.querySelector('select[name="moduleCategory"]');
            if (categoryField) categoryField.value = module.category;

            // Description
            const descriptionField = form.querySelector('textarea[name="moduleDescription"]');
            if (descriptionField) descriptionField.value = module.description;

            // Compliance Level
            const complianceLevelField = form.querySelector('select[name="complianceLevel"]');
            if (complianceLevelField) complianceLevelField.value = module.complianceLevel;

            // Show modal
            modal.style.display = 'flex';
            modal.classList.add('show');
        }

        createEditModuleModal(module) {
            const modalContainer = document.getElementById('moduleModalContainer');
            if (!modalContainer) return;

            const modalHTML = `
                <div class="modal" id="editModuleModal">
                    <div class="modal-dialog">
                        <div class="modal-content">
                            <div class="modal-header">
                                <h2>Edit Module</h2>
                                <button class="modal-close" id="closeEditModuleModal">&times;</button>
                            </div>
                            <div class="modal-body">
                                <form id="editModuleForm">
                                    <input type="hidden" name="moduleId">
                                    <div class="form-group">
                                        <label>Module Name</label>
                                        <input type="text" name="moduleName" required>
                                    </div>
                                    <div class="form-group">
                                        <label>Category</label>
                                        <select name="moduleCategory" required>
                                            <option value="hr">HR</option>
                                            <option value="finance">Finance</option>
                                            <option value="operations">Operations</option>
                                            <option value="integrations">Integrations</option>
                                        </select>
                                    </div>
                                    <div class="form-group">
                                        <label>Description</label>
                                        <textarea name="moduleDescription" required></textarea>
                                    </div>
                                    <div class="form-group">
                                        <label>Compliance Level</label>
                                        <select name="complianceLevel" required>
                                            <option value="high">High</option>
                                            <option value="medium">Medium</option>
                                            <option value="low">Low</option>
                                        </select>
                                    </div>
                                    <div class="form-actions">
                                        <button type="button" id="cancelEditModule" class="btn btn-secondary">Cancel</button>
                                        <button type="submit" class="btn btn-primary">Update Module</button>
                                    </div>
                                </form>
                            </div>
                        </div>
                    </div>
                </div>
            `;

            modalContainer.innerHTML += modalHTML;

            // Setup event listeners for the new modal
            const closeEditModalBtn = document.getElementById('closeEditModuleModal');
            const cancelEditModuleBtn = document.getElementById('cancelEditModule');
            const editModuleForm = document.getElementById('editModuleForm');

            if (closeEditModalBtn) {
                closeEditModalBtn.addEventListener('click', this.closeEditModal.bind(this));
            }

            if (cancelEditModuleBtn) {
                cancelEditModuleBtn.addEventListener('click', this.closeEditModal.bind(this));
            }

            if (editModuleForm) {
                editModuleForm.addEventListener('submit', this.updateModule.bind(this));
            }

            // Show the modal
            this.showEditModuleModal(module);
        }

        closeEditModal() {
            const modal = document.getElementById('editModuleModal');
            if (modal) {
                modal.style.display = 'none';
                modal.classList.remove('show');
            }
        }

            async updateModule(event) {
            event.preventDefault();
            console.log('Update Module called');

            const form = event.target;
            const formData = new FormData(form);
            const moduleId = formData.get('moduleId');

            const moduleData = {
                name: formData.get('moduleName'),
                category: formData.get('moduleCategory'),
                description: formData.get('moduleDescription'),
                complianceLevel: formData.get('complianceLevel')
            };

            console.log('Update Module Data:', moduleData);

            try {
                const response = await fetch(`${this.baseUrl}/modules/${moduleId}`, {
                    method: 'PUT',
                    headers: {
                        'Authorization': `Bearer ${this.token}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(moduleData)
                });

                const result = await response.json();
                console.log('Update Module Response:', result);

                if (result.success) {
                    this.showNotification('Module updated successfully', 'success');
                    this.closeEditModal();
                    this.fetchModules();
                    this.fetchActivityLogs();
                } else {
                    throw new Error(result.message || 'Failed to update module');
                }
            } catch (error) {
                console.error('Update module error:', error);
                this.showNotification(error.message, 'error');
            }
        }

        async deleteModule(moduleId) {
            console.log('Delete Module called', moduleId);

            try {
                const confirmDelete = window.confirm('Are you sure you want to delete this module?');
                if (!confirmDelete) return;

                const response = await fetch(`${this.baseUrl}/modules/${moduleId}`, {
                    method: 'DELETE',
                    headers: {
                        'Authorization': `Bearer ${this.token}`,
                        'Content-Type': 'application/json'
                    }
                });

                const result = await response.json();
                console.log('Delete Module Response:', result);

                if (result.success) {
                    this.showNotification('Module deleted successfully', 'success');
                    this.fetchModules();
                    this.fetchActivityLogs();
                } else {
                    throw new Error(result.message || 'Failed to delete module');
                }
            } catch (error) {
                console.error('Delete module error:', error);
                this.showNotification(error.message, 'error');
            }
        }

        async toggleModuleStatus(moduleId, isActive) {
            console.log('Toggle Module Status called', moduleId, isActive);

            try {
                const response = await fetch(`${this.baseUrl}/modules/${moduleId}/status`, {
                    method: 'PATCH',
                    headers: {
                        'Authorization': `Bearer ${this.token}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ isActive })
                });

                const result = await response.json();
                console.log('Toggle Module Status Response:', result);

                if (result.success) {
                    this.showNotification(
                        `Module ${isActive ? 'activated' : 'deactivated'} successfully`, 
                        'success'
                    );
                    this.fetchModules();
                    this.fetchActivityLogs();
                } else {
                    throw new Error(result.message || 'Failed to update module status');
                }
            } catch (error) {
                console.error('Toggle module status error:', error);
                this.showNotification(error.message, 'error');
            }
        }

        async fetchActivityLogs() {
            console.log('Fetching Activity Logs');
            try {
                const response = await fetch(`${this.baseUrl}/modules/activity-logs`, {
                    method: 'GET',
                    headers: {
                        'Authorization': `Bearer ${this.token}`,
                        'Content-Type': 'application/json'
                    }
                });

                const result = await response.json();
                console.log('Activity Logs Response:', result);

                if (result.success) {
                    this.renderActivityLogs(result.data);
                } else {
                    throw new Error(result.message || 'Failed to fetch activity logs');
                }
            } catch (error) {
                console.error('Activity logs fetch error:', error);
                this.showNotification(error.message, 'error');
            }
        }

        renderActivityLogs(logs) {
            console.log('Rendering Activity Logs:', logs);
            const logsBody = document.getElementById('activityLogsBody');
            if (!logsBody) {
                console.error('Activity Logs Body not found');
                return;
            }

            // Clear existing logs
            logsBody.innerHTML = '';

            // Handle empty logs
            if (!logs || logs.length === 0) {
                logsBody.innerHTML = `
                    <tr>
                        <td colspan="5" class="text-center">No activity logs found</td>
                    </tr>
                `;
                return;
            }

            logs.forEach(log => {
                const row = document.createElement('tr');
                
                row.innerHTML = `
                    <td>${new Date(log.timestamp).toLocaleString()}</td>
                    <td>${log.moduleName || 'Unknown Module'}</td>
                    <td>${log.activity || 'No Activity'}</td>
                    <td>${log.userName || 'System'}</td>
                    <td>${log.type || 'Unknown'}</td>
                `;

                logsBody.appendChild(row);
            });
        }

        filterActivityLogs() {
            console.log('Filtering Activity Logs');
            const filter = document.getElementById('activityLogFilter').value;
            const logRows = document.querySelectorAll('#activityLogsBody tr');

            logRows.forEach(row => {
                const activityCell = row.querySelector('td:nth-child(3)');
                const typeCell = row.querySelector('td:nth-child(5)');

                const matchesFilter = 
                    filter === 'all' || 
                    (filter === 'created' && typeCell.textContent.toLowerCase().includes('created')) ||
                    (filter === 'updated' && typeCell.textContent.toLowerCase().includes('updated')) ||
                    (filter === 'deleted' && typeCell.textContent.toLowerCase().includes('deleted')) ||
                    (filter === 'status-changed' && typeCell.textContent.toLowerCase().includes('status'));

                row.style.display = matchesFilter ? '' : 'none';
            });
        }
    }

    // Global initialization
    window.ModulesManager = ModulesManager;

    // Content loaded event listener
    document.addEventListener('contentLoaded', (event) => {
        console.log('Content Loaded Event:', event.detail);
        
        if (event.detail.section === 'modules') {
            console.log('Initializing Modules Manager');
            window.modulesManagerInstance = new ModulesManager('https://18.215.160.136.nip.io/api');
        }
    });

    // Fallback initialization
    document.addEventListener('DOMContentLoaded', () => {
        console.log('DOM Content Loaded');
        if (!window.modulesManagerInstance) {
            window.modulesManagerInstance = new ModulesManager('https://18.215.160.136.nip.io/api');
        }
    });
})();

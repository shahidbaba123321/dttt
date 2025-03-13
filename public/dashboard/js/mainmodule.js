(function() {
    'use strict';

    // Check if ModulesManager already exists
    if (window.ModulesManager) {
        console.log('ModulesManager already exists');
        return;
    }

    class ModulesManager {
        constructor(apiBaseUrl) {
            // Base configuration
            this.baseUrl = apiBaseUrl;
            this.token = localStorage.getItem('token');
            
            // DOM Elements
            this.moduleModal = document.getElementById('moduleModal');
            this.addNewModuleBtn = document.getElementById('addNewModuleBtn');
            this.saveModuleBtn = document.getElementById('saveModuleBtn');
            this.closeModuleModal = document.getElementById('closeModuleModal');
            this.cancelModuleModal = document.getElementById('cancelModuleModal');
            this.moduleForm = document.getElementById('moduleForm');

            // Integration Modal Elements
            this.integrationModal = document.getElementById('integrationModal');
            this.addIntegrationBtn = document.getElementById('addIntegrationBtn');
            this.closeIntegrationModal = document.getElementById('closeIntegrationModal');

            // Filters
            this.categoryFilter = document.getElementById('categoryFilter');
            this.complianceFilter = document.getElementById('complianceFilter');
            this.statusFilter = document.getElementById('statusFilter');
            this.moduleSearchInput = document.getElementById('moduleSearchInput');

            // Initialize event listeners
            this.initializeEventListeners();
        }

        initializeEventListeners() {
            // Module Modal Events
            this.addNewModuleBtn.addEventListener('click', () => this.openModuleModal());
            this.saveModuleBtn.addEventListener('click', () => this.saveModule());
            this.closeModuleModal.addEventListener('click', () => this.closeModuleModal());
            this.cancelModuleModal.addEventListener('click', () => this.closeModuleModal());

            // Integration Modal Events
            this.addIntegrationBtn.addEventListener('click', () => this.openIntegrationModal());
            this.closeIntegrationModal.addEventListener('click', () => this.closeIntegrationModal());

            // Filter Events
            this.categoryFilter.addEventListener('change', () => this.filterModules());
            this.complianceFilter.addEventListener('change', () => this.filterModules());
            this.statusFilter.addEventListener('change', () => this.filterModules());
            this.moduleSearchInput.addEventListener('input', () => this.filterModules());

            // Toggle Module Status
            document.querySelectorAll('.btn-toggle').forEach(btn => {
                btn.addEventListener('click', (e) => this.toggleModuleStatus(e));
            });
        }

        async fetchModules() {
            try {
                const response = await fetch(`${this.baseUrl}/modules`, {
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
                this.renderModules(data.data);
            } catch (error) {
                this.showNotification('Error fetching modules', 'error');
                console.error('Modules fetch error:', error);
            }
        }

        renderModules(modules) {
            const modulesGrid = document.querySelector('.modules-grid');
            modulesGrid.innerHTML = ''; // Clear existing modules

            modules.forEach(module => {
                const moduleCard = this.createModuleCard(module);
                modulesGrid.appendChild(moduleCard);
            });
        }

        createModuleCard(module) {
            const card = document.createElement('div');
            card.className = `module-card category-${module.category}`;
            card.innerHTML = `
                <div class="module-card-header">
                    <h3>${module.name}</h3>
                    <div class="module-status ${module.isActive ? 'active' : 'inactive'}">
                        ${module.isActive ? 'Active' : 'Inactive'}
                    </div>
                </div>
                <div class="module-card-body">
                    <div class="module-details">
                        <div class="module-category">
                            <i class="fas fa-${this.getCategoryIcon(module.category)}"></i>
                            <span>${this.capitalizeName(module.category)}</span>
                        </div>
                        <div class="module-compliance ${module.complianceLevel}">
                            <i class="fas fa-shield-alt"></i>
                            <span>${this.capitalizeName(module.complianceLevel)} Compliance</span>
                        </div>
                    </div>
                    <p class="module-description">${module.description}</p>
                    <div class="module-features">
                        ${module.permissions.map(p => `<span class="feature-tag">${this.capitalizeName(p)}</span>`).join('')}
                    </div>
                </div>
                <div class="module-card-actions">
                    <button class="btn btn-edit" data-module-id="${module._id}">
                        <i class="fas fa-edit"></i> Edit
                    </button>
                    <button class="btn btn-toggle" data-module-id="${module._id}">
                        <i class="fas fa-power-off"></i> 
                        ${module.isActive ? 'Disable' : 'Enable'}
                    </button>
                </div>
            `;

            return card;
        }

        openModuleModal(module = null) {
            // Reset form
            this.moduleForm.reset();

            // Set modal title
            const modalTitle = document.getElementById('moduleModalTitle');
            modalTitle.textContent = module ? 'Edit Module' : 'Add New Module';

            // Populate form if editing
            if (module) {
                document.getElementById('moduleName').value = module.name;
                document.getElementById('moduleCategory').value = module.category;
                document.getElementById('moduleDescription').value = module.description;
                document.getElementById('complianceLevel').value = module.complianceLevel;
                document.getElementById('moduleActiveToggle').checked = module.isActive;

                // Set permissions and subscription tiers
                module.permissions?.forEach(perm => {
                    const checkbox = document.querySelector(`input[name="permissions"][value="${perm}"]`);
                    if (checkbox) checkbox.checked = true;
                });

                module.subscriptionTiers?.forEach(tier => {
                    const checkbox = document.querySelector(`input[name="subscriptionTiers"][value="${tier}"]`);
                    if (checkbox) checkbox.checked = true;
                });
            }

            this.moduleModal.classList.add('show');
        }

        closeModuleModal() {
            this.moduleModal.classList.remove('show');
        }

        async saveModule() {
            const moduleData = this.collectModuleFormData();
            
            try {
                const response = await fetch(`${this.baseUrl}/modules`, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${this.token}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(moduleData)
                });

                if (!response.ok) {
                    throw new Error('Failed to save module');
                }

                const result = await response.json();
                this.showNotification('Module saved successfully', 'success');
                this.closeModuleModal();
                this.fetchModules(); // Refresh module list
            } catch (error) {
                this.showNotification('Error saving module', 'error');
                console.error('Module save error:', error);
            }
        }

        collectModuleFormData() {
            return {
                name: document.getElementById('moduleName').value,
                category: document.getElementById('moduleCategory').value,
                description: document.getElementById('moduleDescription').value,
                complianceLevel: document.getElementById('complianceLevel').value,
                isActive: document.getElementById('moduleActiveToggle').checked,
                permissions: Array.from(document.querySelectorAll('input[name="permissions"]:checked'))
                    .map(el => el.value),
                subscriptionTiers: Array.from(document.querySelectorAll('input[name="subscriptionTiers"]:checked'))
                    .map(el => el.value)
            };
        }

        async toggleModuleStatus(event) {
            const moduleId = event.currentTarget.dataset.moduleId;
            
            try {
                const response = await fetch(`${this.baseUrl}/modules/${moduleId}/status`, {
                    method: 'PATCH',
                    headers: {
                        'Authorization': `Bearer ${this.token}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ isActive: !event.currentTarget.closest('.module-card').querySelector('.module-status').classList.contains('active') })
                });

                if (!response.ok) {
                    throw new Error('Failed to toggle module status');
                }

                const result = await response.json();
                this.showNotification('Module status updated successfully', 'success');
                this.fetchModules(); // Refresh module list
            } catch (error) {
                this.showNotification('Error updating module status', 'error');
                console.error('Module status toggle error:', error);
            }
        }

        filterModules() {
            const category = this.categoryFilter.value;
            const compliance = this.complianceFilter.value;
            const status = this.statusFilter.value;
            const searchTerm = this.moduleSearchInput.value.toLowerCase();

            const moduleCards = document.querySelectorAll('.module-card');

            moduleCards.forEach(card => {
                const moduleCategory = card.classList[1].split('-')[1];
                const moduleCompliance = card.querySelector('.module-compliance').classList[1];
                const moduleStatus = card.querySelector('.module-status').classList[1];
                const moduleName = card.querySelector('h3').textContent.toLowerCase();

                const categoryMatch = !category || moduleCategory === category;
                const complianceMatch = !compliance || moduleCompliance === compliance;
                const statusMatch = !status || moduleStatus === status;
                const searchMatch = !searchTerm || moduleName.includes(searchTerm);

                card.style.display = categoryMatch && complianceMatch && statusMatch && searchMatch ? '' : 'none';
            });
        }

        openIntegrationModal() {
            this.integrationModal.classList.add('show');
        }

        closeIntegrationModal() {
            this.integrationModal.classList.remove('show');
        }

        // Utility Methods
        showNotification(message, type = 'info') {
            // Implement notification logic similar to other parts of the application
            console.log(`${type.toUpperCase()}: ${message}`);
        }

        getCategoryIcon(category) {
            const icons = {
                'hr': 'users',
                'finance': 'money-bill-wave',
                'operations': 'cogs',
                'integrations': 'plug'
            };
            return icons[category] || 'cube';
        }

        capitalizeName(name) {
            return name.charAt(0).toUpperCase() + name.slice(1);
        }

        // Initialization method
        init() {
            this.fetchModules();
        }
    }

    // Expose the class to the global scope
    window.ModulesManager = ModulesManager;

    // Optional: Auto-initialize if needed
    document.addEventListener('DOMContentLoaded', () => {
        if (window.dashboardApp && window.dashboardApp.apiBaseUrl) {
            window.modulesManager = new ModulesManager(window.dashboardApp.apiBaseUrl);
            window.modulesManager.init();
        }
    });
})();

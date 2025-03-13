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

            this.openModuleModal = this.openModuleModal.bind(this);
        this.closeModuleModal = this.closeModuleModal.bind(this);
        this.saveModule = this.saveModule.bind(this);

            // Initialize event listeners
            this.initializeEventListeners();
        }

        initializeEventListeners() {
        // Ensure elements exist before adding listeners
        if (this.addNewModuleBtn) {
            this.addNewModuleBtn.addEventListener('click', this.openModuleModal);
        } else {
            console.error('Add New Module button not found');
        }

        if (this.saveModuleBtn) {
            this.saveModuleBtn.addEventListener('click', this.saveModule);
        } else {
            console.error('Save Module button not found');
        }

        if (this.closeModuleModalBtn) {
            this.closeModuleModalBtn.addEventListener('click', this.closeModuleModal);
        }

        if (this.cancelModuleModalBtn) {
            this.cancelModuleModalBtn.addEventListener('click', this.closeModuleModal);
        }

        // Close modal when clicking outside
        this.moduleModal?.addEventListener('click', (e) => {
            if (e.target === this.moduleModal) {
                this.closeModuleModal();
            }
        });
    }

        closeModuleModal() {
        console.log('Closing module modal');
        if (!this.moduleModal) return;

        this.moduleModal.classList.remove('show');
        setTimeout(() => {
            this.moduleModal.style.display = 'none';
        }, 300);
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

        openModuleModal(event) {
        console.log('Opening module modal');
        if (!this.moduleModal) {
            console.error('Module modal element not found');
            return;
        }

        // Reset form
        this.moduleForm.reset();

        // Show modal
        this.moduleModal.style.display = 'flex';
        setTimeout(() => {
            this.moduleModal.classList.add('show');
        }, 10);
    }
closeModuleModal() {
    this.moduleModal.classList.remove('show');
    setTimeout(() => {
        this.moduleModal.style.display = 'none';
    }, 300);
}

        async saveModule() {
        console.log('Saving module');
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
                const errorData = await response.json();
                throw new Error(errorData.message || 'Failed to save module');
            }

            const result = await response.json();
            this.showNotification('Module saved successfully', 'success');
            this.closeModuleModal();
            this.fetchModules(); // Refresh module list
        } catch (error) {
            console.error('Module save error:', error);
            this.showNotification(`Error: ${error.message}`, 'error');
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
        // Implement a simple console log for now
        console.log(`[${type.toUpperCase()}] ${message}`);
        
        // Optional: Create a more robust notification system
        const notificationContainer = document.createElement('div');
        notificationContainer.className = `notification ${type}`;
        notificationContainer.textContent = message;
        document.body.appendChild(notificationContainer);

        setTimeout(() => {
            notificationContainer.remove();
        }, 3000);
    }
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
    // Auto-initialize
document.addEventListener('DOMContentLoaded', () => {
    console.log('Initializing Modules Manager');
    if (window.dashboardApp && window.dashboardApp.apiBaseUrl) {
        window.modulesManager = new ModulesManager(window.dashboardApp.apiBaseUrl);
    } else {
        console.error('Dashboard app or API base URL not found');
    }
    });
})();

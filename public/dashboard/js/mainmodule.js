(function() {
    'use strict';

    class ModulesManager {
        constructor(apiBaseUrl) {
            this.baseUrl = apiBaseUrl;
            this.token = localStorage.getItem('token');
            
            // Container references
            this.modulesGridContainer = document.getElementById('modulesGridContainer');
            this.modulesFilterContainer = document.getElementById('modulesFilterContainer');
            this.activityLogsContainer = document.getElementById('activityLogsContainer');
            this.activityLogsFilterContainer = document.getElementById('activityLogsFilterContainer');
            this.moduleFormModalContainer = document.getElementById('moduleFormModalContainer');
            this.addNewModuleBtn = document.getElementById('addNewModuleBtn');

            this.initializeEventListeners();
        }

        initializeEventListeners() {
            this.addNewModuleBtn.addEventListener('click', () => this.renderModuleForm());
        }

        renderModuleForm() {
            const modalHTML = `
                <div class="modal module-form-modal">
                    <div class="modal-dialog">
                        <div class="modal-content">
                            <div class="modal-header">
                                <h2>Add New Module</h2>
                                <button class="modal-close">&times;</button>
                            </div>
                            <div class="modal-body">
                                <form id="moduleForm">
                                    <div class="form-group">
                                        <label>Module Name</label>
                                        <input type="text" name="name" required>
                                    </div>
                                    <div class="form-group">
                                        <label>Category</label>
                                        <select name="category" required>
                                            <option value="hr">HR</option>
                                            <option value="finance">Finance</option>
                                            <option value="operations">Operations</option>
                                            <option value="integrations">Integrations</option>
                                        </select>
                                    </div>
                                    <div class="form-group">
                                        <label>Description</label>
                                        <textarea name="description" required></textarea>
                                    </div>
                                    <div class="form-group">
                                        <label>Compliance Level</label>
                                        <select name="complianceLevel" required>
                                            <option value="low">Low</option>
                                            <option value="medium">Medium</option>
                                            <option value="high">High</option>
                                        </select>
                                    </div>
                                    <div class="form-group">
                                        <label>Active</label>
                                        <input type="checkbox" name="isActive">
                                    </div>
                                </form>
                            </div>
                            <div class="modal-footer">
                                <button class="btn btn-secondary" id="cancelModuleBtn">Cancel</button>
                                <button class="btn btn-primary" id="saveModuleBtn">Save Module</button>
                            </div>
                        </div>
                    </div>
                </div>
            `;

            this.moduleFormModalContainer.innerHTML = modalHTML;
            
            // Add event listeners
            document.querySelector('.modal-close').addEventListener('click', () => this.closeModuleForm());
            document.getElementById('cancelModuleBtn').addEventListener('click', () => this.closeModuleForm());
            document.getElementById('saveModuleBtn').addEventListener('click', () => this.saveModule());

            // Show modal
            document.querySelector('.module-form-modal').classList.add('show');
        }

        closeModuleForm() {
            const modal = document.querySelector('.module-form-modal');
            if (modal) {
                modal.classList.remove('show');
                setTimeout(() => {
                    this.moduleFormModalContainer.innerHTML = '';
                }, 300);
            }
        }

        async saveModule() {
            const form = document.getElementById('moduleForm');
            const formData = new FormData(form);
            const moduleData = Object.fromEntries(formData.entries());

            try {
                const response = await fetch(`${this.baseUrl}/modules`, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${this.token}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(moduleData)
                });

                if (!response.ok) throw new Error('Failed to save module');

                this.closeModuleForm();
                this.fetchModules();
            } catch (error) {
                console.error('Module save error:', error);
                alert('Failed to save module');
            }
        }

        async fetchModules() {
            try {
                const response = await fetch(`${this.baseUrl}/modules`, {
                    headers: {
                        'Authorization': `Bearer ${this.token}`
                    }
                });

                if (!response.ok) throw new Error('Failed to fetch modules');

                const modules = await response.json();
                this.renderModules(modules.data);
            } catch (error) {
                console.error('Modules fetch error:', error);
            }
        }

        renderModules(modules) {
            this.modulesGridContainer.innerHTML = modules.map(module => `
                <div class="module-card">
                    <div class="module-card-header">
                        <h3>${module.name}</h3>
                        <span class="module-status ${module.isActive ? 'active' : 'inactive'}">
                            ${module.isActive ? 'Active' : 'Inactive'}
                        </span>
                    </div>
                    <div class="module-card-body">
                        <p>${module.description}</p>
                        <div class="module-details">
                            <span>Category: ${module.category}</span>
                            <span>Compliance: ${module.complianceLevel}</span>
                        </div>
                    </div>
                </div>
            `).join('');
        }

        async fetchActivityLogs() {
            try {
                const response = await fetch(`${this.baseUrl}/modules/activity-logs`, {
                    headers: {
                        'Authorization': `Bearer ${this.token}`
                    }
                });

                if (!response.ok) throw new Error('Failed to fetch activity logs');

                const logs = await response.json();
                this.renderActivityLogs(logs.data);
            } catch (error) {
                console.error('Activity logs fetch error:', error);
            }
        }

        renderActivityLogs(logs) {
            this.activityLogsContainer.innerHTML = logs.map(log => `
                <div class="activity-log">
                    <span>${log.timestamp}</span>
                    <span>${log.type}</span>
                    <span>${log.details}</span>
                </div>
            `).join('');
        }

        init() {
            this.fetchModules();
            this.fetchActivityLogs();
        }
    }

    window.ModulesManager = ModulesManager;

    document.addEventListener('DOMContentLoaded', () => {
        if (window.dashboardApp && window.dashboardApp.apiBaseUrl) {
            const modulesManager = new ModulesManager(window.dashboardApp.apiBaseUrl);
            modulesManager.init();
        }
    });
})();

(function() {
    class ModulesManager {
        constructor(apiBaseUrl) {
            this.baseUrl = apiBaseUrl;
            this.token = localStorage.getItem('token');
            
            // Bind methods to ensure correct context
            this.initializeModules = this.initializeModules.bind(this);
            this.showAddModuleModal = this.showAddModuleModal.bind(this);
            this.closeModal = this.closeModal.bind(this);
            this.addNewModule = this.addNewModule.bind(this);

            // Initialize after a short delay
            this.initializeModules();
        }

        initializeModules() {
            // Create modal
            this.createModuleModal();
            
            // Setup event listeners
            this.setupEventListeners();
        }

        createModuleModal() {
            // Remove any existing modal first
            const existingModal = document.getElementById('addModuleModal');
            if (existingModal) {
                existingModal.remove();
            }

            const modalDiv = document.createElement('div');
            modalDiv.id = 'addModuleModal';
            modalDiv.className = 'modal';
            modalDiv.innerHTML = `
                <div class="modal-content">
                    <div class="modal-header">
                        <h2>Add New Module</h2>
                        <button class="modal-close" id="closeModalBtn">&times;</button>
                    </div>
                    <div class="modal-body">
                        <form id="addModuleForm">
                            <div>
                                <label>Module Name</label>
                                <input type="text" name="moduleName" required>
                            </div>
                            <div>
                                <label>Category</label>
                                <select name="moduleCategory" required>
                                    <option value="hr">HR</option>
                                    <option value="finance">Finance</option>
                                    <option value="operations">Operations</option>
                                    <option value="integrations">Integrations</option>
                                </select>
                            </div>
                            <div>
                                <label>Description</label>
                                <textarea name="moduleDescription" required></textarea>
                            </div>
                            <div>
                                <button type="submit">Add Module</button>
                                <button type="button" id="cancelModalBtn">Cancel</button>
                            </div>
                        </form>
                    </div>
                </div>
            `;
            
            // Append to body
            document.body.appendChild(modalDiv);
        }

        setupEventListeners() {
            // Timeout to ensure DOM is ready
            setTimeout(() => {
                const addNewModuleBtn = document.getElementById('addNewModuleBtn');
                const closeModalBtn = document.getElementById('closeModalBtn');
                const cancelModalBtn = document.getElementById('cancelModalBtn');
                const addModuleForm = document.getElementById('addModuleForm');
                const addModuleModal = document.getElementById('addModuleModal');

                console.log('Debugging Event Listeners:', {
                    addNewModuleBtn,
                    closeModalBtn,
                    cancelModalBtn,
                    addModuleForm,
                    addModuleModal
                });

                // Add New Module Button
                if (addNewModuleBtn) {
                    addNewModuleBtn.addEventListener('click', (event) => {
                        event.preventDefault();
                        event.stopPropagation();
                        this.showAddModuleModal();
                    });
                } else {
                    console.error('Add New Module Button not found');
                }

                // Close Modal Button
                if (closeModalBtn) {
                    closeModalBtn.addEventListener('click', (event) => {
                        event.preventDefault();
                        this.closeModal();
                    });
                }

                // Cancel Modal Button
                if (cancelModalBtn) {
                    cancelModalBtn.addEventListener('click', (event) => {
                        event.preventDefault();
                        this.closeModal();
                    });
                }

                // Form Submission
                if (addModuleForm) {
                    addModuleForm.addEventListener('submit', (event) => {
                        event.preventDefault();
                        this.addNewModule(event);
                    });
                }
            }, 500);
        }

        showAddModuleModal() {
            const modal = document.getElementById('addModuleModal');
            if (modal) {
                modal.style.display = 'flex';
                console.log('Modal displayed');
            } else {
                console.error('Modal not found');
            }
        }

        closeModal() {
            const modal = document.getElementById('addModuleModal');
            if (modal) {
                modal.style.display = 'none';
            }
        }

        async addNewModule(event) {
            event.preventDefault();
            
            const form = event.target;
            const formData = new FormData(form);

            const moduleData = {
                name: formData.get('moduleName'),
                category: formData.get('moduleCategory'),
                description: formData.get('moduleDescription')
            };

            try {
                const response = await fetch(`${this.baseUrl}/modules`, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${this.token}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(moduleData)
                });

                const result = await response.json();

                if (result.success) {
                    alert('Module added successfully');
                    this.closeModal();
                    // Optionally refresh modules list
                } else {
                    alert('Failed to add module');
                }
            } catch (error) {
                console.error('Error adding module:', error);
                alert('An error occurred');
            }
        }
    }

    // Global initialization
    window.ModulesManager = ModulesManager;

    // Initialize when modules content is loaded
    document.addEventListener('contentLoaded', (event) => {
        if (event.detail.section === 'modules') {
            console.log('Initializing Modules Manager');
            window.modulesManagerInstance = new ModulesManager('https://18.215.160.136.nip.io/api');
        }
    });

    // Fallback initialization
    document.addEventListener('DOMContentLoaded', () => {
        if (!window.modulesManagerInstance) {
            console.log('Fallback Modules Manager Initialization');
            window.modulesManagerInstance = new ModulesManager('https://18.215.160.136.nip.io/api');
        }
    });
})();

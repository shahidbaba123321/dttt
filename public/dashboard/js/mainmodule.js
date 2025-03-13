(function() {
    class ModulesManager {
        constructor(apiBaseUrl) {
            this.baseUrl = apiBaseUrl;
            this.token = localStorage.getItem('token');
            
            // Bind methods
            this.initializeModules = this.initializeModules.bind(this);
            this.setupModalHandlers = this.setupModalHandlers.bind(this);
            this.showAddModuleModal = this.showAddModuleModal.bind(this);
            this.closeModal = this.closeModal.bind(this);
            this.addNewModule = this.addNewModule.bind(this);

            // Initialize after a short delay
            setTimeout(this.initializeModules, 500);
        }

        initializeModules() {
            this.createModuleModal();
            this.setupModalHandlers();
        }

        createModuleModal() {
            const modalHTML = `
                <div class="modal" id="addModuleModal" style="display:none; position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.5); z-index:1000; justify-content:center; align-items:center;">
                    <div style="background:white; padding:20px; border-radius:8px; width:500px;">
                        <h2>Add New Module</h2>
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
                            <button type="submit">Add Module</button>
                            <button type="button" id="closeModalBtn">Cancel</button>
                        </form>
                    </div>
                </div>
            `;

            // Create a container and append to body
            const container = document.createElement('div');
            container.innerHTML = modalHTML;
            document.body.appendChild(container.firstChild);
        }

        setupModalHandlers() {
            const addNewModuleBtn = document.getElementById('addNewModuleBtn');
            const addModuleModal = document.getElementById('addModuleModal');
            const closeModalBtn = document.getElementById('closeModalBtn');
            const addModuleForm = document.getElementById('addModuleForm');

            console.log('Setup Modal Handlers:', {
                addNewModuleBtn,
                addModuleModal,
                closeModalBtn,
                addModuleForm
            });

            if (addNewModuleBtn) {
                addNewModuleBtn.addEventListener('click', this.showAddModuleModal);
            } else {
                console.error('Add New Module Button not found');
            }

            if (closeModalBtn) {
                closeModalBtn.addEventListener('click', this.closeModal);
            }

            if (addModuleForm) {
                addModuleForm.addEventListener('submit', this.addNewModule);
            }
        }

        showAddModuleModal(event) {
            if (event) event.preventDefault();
            
            const modal = document.getElementById('addModuleModal');
            if (modal) {
                modal.style.display = 'flex';
                console.log('Modal should be visible now');
            } else {
                console.error('Modal not found');
            }
        }

        closeModal(event) {
            if (event) event.preventDefault();
            
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
})();

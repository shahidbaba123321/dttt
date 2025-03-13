(function() {
    // Function to initialize modules manager
    function initializeModulesManager() {
        console.log('Initializing Modules Manager');
        
        // Create modal dynamically
        createModuleModal();
        
        // Setup event listeners
        setupModalEventListeners();
    }

    function createModuleModal() {
        // Remove any existing modal
        const existingModal = document.getElementById('addModuleModal');
        if (existingModal) {
            existingModal.remove();
        }

        // Create modal HTML
        const modalHTML = `
            <div id="addModuleModal" style="
                display: none; 
                position: fixed; 
                top: 0; 
                left: 0; 
                width: 100%; 
                height: 100%; 
                background: rgba(0,0,0,0.5); 
                z-index: 1000; 
                justify-content: center; 
                align-items: center;
            ">
                <div style="
                    background: white; 
                    padding: 20px; 
                    border-radius: 8px; 
                    width: 500px;
                ">
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

        // Create a temporary div to parse HTML
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = modalHTML;
        
        // Append to body
        document.body.appendChild(tempDiv.firstChild);

        console.log('Modal created and added to body');
    }

    function setupModalEventListeners() {
        console.log('Setting up modal event listeners');

        // Use event delegation for dynamically loaded content
        document.addEventListener('click', function(event) {
            const addNewModuleBtn = event.target.closest('#addNewModuleBtn');
            const closeModalBtn = event.target.closest('#closeModalBtn');
            const modal = document.getElementById('addModuleModal');

            if (addNewModuleBtn) {
                event.preventDefault();
                console.log('Add New Module Button Clicked');
                
                if (modal) {
                    modal.style.display = 'flex';
                    console.log('Modal should be visible');
                } else {
                    console.error('Modal not found');
                }
            }

            if (closeModalBtn) {
                if (modal) {
                    modal.style.display = 'none';
                }
            }
        });

        // Form submission
        document.addEventListener('submit', function(event) {
            const form = event.target.closest('#addModuleForm');
            if (form) {
                event.preventDefault();
                
                const formData = new FormData(form);
                const moduleData = {
                    name: formData.get('moduleName'),
                    category: formData.get('moduleCategory'),
                    description: formData.get('moduleDescription')
                };

                console.log('Module Data:', moduleData);
                alert('Module would be added: ' + JSON.stringify(moduleData));

                // Close modal
                const modal = document.getElementById('addModuleModal');
                if (modal) {
                    modal.style.display = 'none';
                }
            }
        });
    }

    // Custom event listener for content loaded
    document.addEventListener('contentLoaded', function(event) {
        if (event.detail.section === 'modules') {
            console.log('Modules content loaded');
            initializeModulesManager();
        }
    });

    // Expose initialization function globally
    window.initializeModulesManager = initializeModulesManager;
})();

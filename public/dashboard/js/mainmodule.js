(function() {
    function createModuleModal() {
        // Remove existing modal
        const existingModal = document.getElementById('addModuleModal');
        if (existingModal) {
            existingModal.remove();
        }

        // Create modal HTML
        const modalDiv = document.createElement('div');
        modalDiv.id = 'addModuleModal';
        modalDiv.style.cssText = `
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
        `;

        modalDiv.innerHTML = `
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
        `;

        // Append to body
        document.body.appendChild(modalDiv);

        return modalDiv;
    }

    function setupModalEventListeners(modal) {
        // Add New Module Button Listener
        const addNewModuleBtn = document.getElementById('addNewModuleBtn');
        if (addNewModuleBtn) {
            addNewModuleBtn.addEventListener('click', function(event) {
                event.preventDefault();
                console.log('Add New Module Button Clicked');
                modal.style.display = 'flex';
            });
        } else {
            console.error('Add New Module Button not found');
        }

        // Close Modal Button Listener
        const closeModalBtn = document.getElementById('closeModalBtn');
        if (closeModalBtn) {
            closeModalBtn.addEventListener('click', function() {
                modal.style.display = 'none';
            });
        }

        // Form Submission
        const addModuleForm = document.getElementById('addModuleForm');
        if (addModuleForm) {
            addModuleForm.addEventListener('submit', function(event) {
                event.preventDefault();
                
                const formData = new FormData(event.target);
                const moduleData = {
                    name: formData.get('moduleName'),
                    category: formData.get('moduleCategory'),
                    description: formData.get('moduleDescription')
                };

                console.log('Module Data:', moduleData);
                alert('Module would be added: ' + JSON.stringify(moduleData));

                // Close modal
                modal.style.display = 'none';
            });
        }
    }

    // Initialize when content is loaded
    document.addEventListener('contentLoaded', function(event) {
        if (event.detail.section === 'modules') {
            console.log('Modules content loaded, setting up modal');
            
            // Create modal
            const modal = createModuleModal();
            
            // Setup event listeners
            setupModalEventListeners(modal);
        }
    });

    // Fallback initialization
    document.addEventListener('DOMContentLoaded', function() {
        const modulesSection = document.querySelector('.modules-management-container');
        if (modulesSection) {
            const modal = createModuleModal();
            setupModalEventListeners(modal);
        }
    });
})();

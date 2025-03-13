(function() {
    // Ensure this runs after DOM is fully loaded
    document.addEventListener('DOMContentLoaded', function() {
        console.log('DOM Fully Loaded');
        initializeModulesManager();
    });

    function initializeModulesManager() {
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
        // Extensive logging
        console.log('Setting up modal event listeners');

        // Find all potential buttons
        const addNewModuleBtn = document.getElementById('addNewModuleBtn');
        const closeModalBtn = document.getElementById('closeModalBtn');
        const addModuleModal = document.getElementById('addModuleModal');
        const addModuleForm = document.getElementById('addModuleForm');

        // Log found elements
        console.log('Elements found:', {
            addNewModuleBtn,
            closeModalBtn,
            addModuleModal,
            addModuleForm
        });

        // Add New Module Button
        if (addNewModuleBtn) {
            addNewModuleBtn.addEventListener('click', function(event) {
                event.preventDefault();
                event.stopPropagation();
                
                console.log('Add New Module Button Clicked');
                
                const modal = document.getElementById('addModuleModal');
                if (modal) {
                    modal.style.display = 'flex';
                    console.log('Modal should be visible');
                } else {
                    console.error('Modal not found');
                }
            });
        } else {
            console.error('Add New Module Button not found');
            
            // Alternative method: Add listener to body and check target
            document.body.addEventListener('click', function(event) {
                if (event.target && event.target.textContent.includes('Add New Module')) {
                    const modal = document.getElementById('addModuleModal');
                    if (modal) {
                        modal.style.display = 'flex';
                    }
                }
            });
        }

        // Close Modal Button
        if (closeModalBtn) {
            closeModalBtn.addEventListener('click', function() {
                const modal = document.getElementById('addModuleModal');
                if (modal) {
                    modal.style.display = 'none';
                }
            });
        }

        // Form Submission
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
                const modal = document.getElementById('addModuleModal');
                if (modal) {
                    modal.style.display = 'none';
                }
            });
        }
    }

    // Fallback initialization
    window.addEventListener('load', function() {
        console.log('Window load event');
        initializeModulesManager();
    });
})();

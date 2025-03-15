(function() {
    'use strict';

    // Check if PricingManager already exists
    if (window.PricingManager) {
        console.log('PricingManager already exists');
        return;
    }

    class PricingManager {
        constructor(apiBaseUrl) {
            // Base configuration
            this.apiBaseUrl = apiBaseUrl;
            this.token = localStorage.getItem('token');
            this.currentPage = 1;
            this.pageSize = 10;
            this.totalPlans = 0;
            this.currentEditingPlan = null;

            // DOM Element References
            this.plansGridContainer = document.getElementById('plansGridContainer');
            this.addNewPlanBtn = document.getElementById('addNewPlanBtn');
            this.planModal = null;
            this.planForm = null;
            this.planNameInput = null;
            this.planTypeSelect = null;
            this.planDescriptionTextarea = null;
            this.planPriceInput = null;
            this.billingCycleSelect = null;
            this.planStatusSelect = null;

            // Pagination References
            this.prevPlansPageBtn = document.getElementById('prevPlansPageBtn');
            this.nextPlansPageBtn = document.getElementById('nextPlansPageBtn');
            this.plansShowingCount = document.getElementById('plansShowingCount');
            this.pageNumberContainer = document.getElementById('pageNumberContainer');

            // Module Selection References
            this.modulesContainer = null;

            // Add null checks
    if (!this.plansGridContainer) {
        console.error('Plans grid container not found');
    }

    if (!this.addNewPlanBtn) {
        console.error('Add new plan button not found');
    }


            // Bind methods to maintain correct context
            this.bindMethods();

            // Initialize
            this.init();
        }

        // Method to bind all class methods
        bindMethods() {
            // Initialization and core methods
            [
                'init', 'initializeEventListeners', 'handleError', 
                'cleanup', 'addUserInfoStyles'
            ].forEach(method => {
                this[method] = this[method].bind(this);
            });

            // Plan-related methods
            [
                'fetchPlans', 'renderPlans', 'createPlanCard', 
                'updatePagination', 'generatePageNumbers', 
                'renderNoPlansState', 'handleAddNewPlan', 
                'createPlanModal', 'closePlanModal', 
                'handlePlanFormSubmit', 'handleEditPlan', 
                'handleDeletePlan', 'collectPlanDetails', 
                'validatePlanForm', 'populateModulesForPlan',
                'populateEditPlanForm'
            ].forEach(method => {
                this[method] = this[method].bind(this);
            });
        }

        // Initialization method
        init() {
            this.initializeEventListeners();
            this.addUserInfoStyles();
            this.fetchPlans();
        }

        // Add User Info Styles Method
        addUserInfoStyles() {
            const styleSheet = document.createElement('style');
            styleSheet.textContent = `
                .user-info {
                    display: flex;
                    flex-direction: column;
                }
                .user-name {
                    font-weight: 600;
                }
                .user-email {
                    color: var(--text-tertiary, #6B7280);
                    font-size: 0.75rem;
                }
            `;
            document.head.appendChild(styleSheet);
        }

        // Error Handling Utility
        handleError(error, context = 'Operation') {
    // More comprehensive error logging
    console.error(`${context} failed:`, {
        message: error.message,
        stack: error.stack,
        context: context
    });

    // Fallback error notification
    const errorMessage = error.message || `${context} failed. Please try again.`;
    
    // Check if userInterface exists before calling
    if (window.dashboardApp && window.dashboardApp.userInterface) {
        window.dashboardApp.userInterface.showErrorNotification(errorMessage);
    } else {
        // Fallback alert if notification system is not available
        alert(errorMessage);
    }
}
        // Event Listeners Initialization
        initializeEventListeners() {
            // Add New Plan Button
            if (this.addNewPlanBtn) {
                this.addNewPlanBtn.addEventListener('click', this.handleAddNewPlan);
            }

            // Pagination Buttons
            if (this.prevPlansPageBtn) {
                this.prevPlansPageBtn.addEventListener('click', () => {
                    if (this.currentPage > 1) {
                        this.currentPage--;
                        this.fetchPlans();
                    }
                });
            }

            if (this.nextPlansPageBtn) {
                this.nextPlansPageBtn.addEventListener('click', () => {
                    this.currentPage++;
                    this.fetchPlans();
                });
            }
        }
                // Fetch Plans Method
        async fetchPlans() {
    try {
        // Ensure plansGridContainer exists
        if (!this.plansGridContainer) {
            console.error('Plans grid container not found');
            return [];
        }

        // Construct API endpoint
        const url = new URL(`${this.apiBaseUrl}/plans`);
        url.searchParams.append('page', this.currentPage);
        url.searchParams.append('limit', this.pageSize);

        // Fetch plans
        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${this.token}`,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            throw new Error('Failed to fetch plans');
        }

        const data = await response.json();

        // Validate data structure
        if (!data || !data.data || !data.pagination) {
            console.error('Invalid response structure:', data);
            this.renderNoPlansState();
            return [];
        }

        // Update total plans and pagination
        this.totalPlans = data.pagination.total || 0;
        this.renderPlans(data.data);
        this.updatePagination(data.pagination);

        return data.data;
    } catch (error) {
        console.error('Detailed fetch plans error:', error);
        this.handleError(error, 'Fetching Plans');
        this.renderNoPlansState();
        return [];
    }
}

        // Render Plans Method
        renderPlans(plans) {
            // Clear existing plans
            this.plansGridContainer.innerHTML = '';

            // Handle empty state
            if (!plans || plans.length === 0) {
                this.renderNoPlansState();
                return;
            }

            // Render plans
            plans.forEach(plan => {
                const planCard = this.createPlanCard(plan);
                this.plansGridContainer.appendChild(planCard);
            });
        }

        // Create Plan Card Method
        createPlanCard(plan) {
            const card = document.createElement('div');
            card.className = 'plan-card';
            
            // Prepare included modules display
            const includedModules = plan.includedModules && plan.includedModules.length > 0
                ? plan.includedModules.map(module => module.name).join(', ')
                : 'No modules included';

            card.innerHTML = `
                <div class="plan-card-header">
                    <h3 class="plan-title">${plan.name}</h3>
                    <div class="plan-status">
                        <span class="status-indicator ${plan.status === 'active' ? 'status-active' : 'status-inactive'}"></span>
                        ${plan.status}
                    </div>
                </div>
                <div class="plan-details">
                    <div class="plan-type">${plan.type.toUpperCase()} Plan</div>
                    <div class="plan-price">$${plan.price.toFixed(2)} / ${plan.billingCycle}</div>
                    <div class="plan-description">${plan.description || 'No description'}</div>
                    <div class="plan-modules">
                        <strong>Included Modules:</strong> ${includedModules}
                    </div>
                </div>
                <div class="plan-actions">
                    <button class="plan-action-btn edit-plan" data-plan-id="${plan._id}">
                        <i class="fas fa-edit"></i> Edit
                    </button>
                    <button class="plan-action-btn delete-plan" data-plan-id="${plan._id}">
                        <i class="fas fa-trash"></i> Delete
                    </button>
                </div>
            `;

            // Add event listeners for edit and delete
            const editBtn = card.querySelector('.edit-plan');
            const deleteBtn = card.querySelector('.delete-plan');

            editBtn.addEventListener('click', () => this.handleEditPlan(plan));
            deleteBtn.addEventListener('click', () => this.handleDeletePlan(plan._id));

            return card;
        }

        // Update Pagination Method
        updatePagination(pagination) {
    // Ensure pagination object is valid
    if (!pagination || typeof pagination !== 'object') {
        console.error('Invalid pagination object:', pagination);
        return;
    }

    // Null checks for DOM elements
    if (!this.prevPlansPageBtn || !this.nextPlansPageBtn || !this.plansShowingCount || !this.pageNumberContainer) {
        console.error('Pagination elements are not properly initialized');
        return;
    }

    // Update showing count
    this.plansShowingCount.textContent = `Showing ${pagination.page || 1} of ${pagination.totalPages || 1} pages`;

    // Update pagination buttons
    this.prevPlansPageBtn.disabled = (pagination.page <= 1);
    this.nextPlansPageBtn.disabled = (pagination.page >= (pagination.totalPages || 1));

    // Generate page numbers
    this.generatePageNumbers(pagination);
}

        // Generate Page Numbers Method
        generatePageNumbers(pagination) {
            // Clear existing page numbers
            this.pageNumberContainer.innerHTML = '';

            // Generate page number buttons
            for (let i = 1; i <= pagination.totalPages; i++) {
                const pageBtn = document.createElement('button');
                pageBtn.textContent = i;
                pageBtn.className = 'page-number';
                
                if (i === pagination.page) {
                    pageBtn.classList.add('active');
                }

                pageBtn.addEventListener('click', () => {
                    this.currentPage = i;
                    this.fetchPlans();
                });

                this.pageNumberContainer.appendChild(pageBtn);
            }
        }

        // Render No Plans State Method
        renderNoPlansState() {
    // Add null check for plansGridContainer
    if (!this.plansGridContainer) {
        console.error('Plans grid container is null');
        
        // Try to find the container again
        this.plansGridContainer = document.getElementById('plansGridContainer');
        
        // If still null, log and return
        if (!this.plansGridContainer) {
            console.error('Unable to find plans grid container');
            return;
        }
    }

    this.plansGridContainer.innerHTML = `
        <div class="no-plans">
            <i class="fas fa-tags"></i>
            <p>No pricing plans found. Create your first plan!</p>
        </div>
    `;
}

                // Handle Add New Plan Method
        handleAddNewPlan() {
            // Create modal dynamically if not exists
            if (!this.planModal) {
                this.createPlanModal()
                    .then(() => {
                        // Reset form
                        this.planForm.reset();
                        this.populateModulesForPlan();
                        
                        // Show modal
                        this.planModal.classList.add('show');
                        
                        // Setup form submission
                        this.planForm.onsubmit = this.handlePlanFormSubmit;
                    })
                    .catch(error => {
                        console.error('Failed to create plan modal:', error);
                        window.dashboardApp.userInterface.showErrorNotification(
                            'Unable to open plan form. Please try again.'
                        );
                    });
            } else {
                // Reset form
                this.planForm.reset();
                this.populateModulesForPlan();
                
                // Show modal
                this.planModal.classList.add('show');
                
                // Setup form submission
                this.planForm.onsubmit = this.handlePlanFormSubmit;
            }
        }

        // Create Plan Modal Method
        createPlanModal() {
            return new Promise((resolve, reject) => {
                try {
                    // Check if modal already exists
                    const existingModal = document.getElementById('planModal');
                    if (existingModal) {
                        this.planModal = existingModal;
                        this.planForm = document.getElementById('planForm');
                        resolve(this.planModal);
                        return;
                    }

                    // Create a container div to hold the modal
                    const modalContainer = document.createElement('div');
                    modalContainer.innerHTML = `
                        <div class="modal" id="planModal">
                            <div class="modal-dialog">
                                <div class="modal-header">
                                    <h2>Add New Pricing Plan</h2>
                                    <button class="modal-close" type="button">&times;</button>
                                </div>
                                <div class="modal-body">
                                    <form id="planForm">
                                        <div class="form-row">
                                            <div class="form-group">
                                                <label>Plan Name</label>
                                                <input type="text" name="planName" class="form-control" required>
                                            </div>
                                            <div class="form-group">
                                                <label>Plan Type</label>
                                                <select name="planType" class="form-control" required>
                                                    <option value="">Select Plan Type</option>
                                                    <option value="basic">Basic</option>
                                                    <option value="professional">Professional</option>
                                                    <option value="enterprise">Enterprise</option>
                                                </select>
                                            </div>
                                        </div>
                                        
                                        <div class="form-group">
                                            <label>Description</label>
                                            <textarea name="planDescription" class="form-control" rows="3"></textarea>
                                        </div>

                                        <div class="form-row">
                                            <div class="form-group">
                                                <label>Price</label>
                                                <input type="number" name="planPrice" class="form-control" step="0.01" min="0" required>
                                            </div>
                                            <div class="form-group">
                                                <label>Billing Cycle</label>
                                                <select name="billingCycle" class="form-control" required>
                                                    <option value="">Select Billing Cycle</option>
                                                    <option value="monthly">Monthly</option>
                                                    <option value="annually">Annually</option>
                                                </select>
                                            </div>
                                        </div>

                                        <div class="form-group">
                                            <label>Included Modules</label>
                                            <div id="modulesContainer" class="modules-grid">
                                                <!-- Modules will be dynamically populated -->
                                            </div>
                                        </div>

                                        <div class="form-group">
                                            <label>Status</label>
                                            <select name="planStatus" class="form-control" required>
                                                <option value="active">Active</option>
                                                <option value="inactive">Inactive</option>
                                            </select>
                                        </div>
                                    </form>
                                </div>
                                <div class="modal-footer">
                                    <button type="button" class="btn btn-secondary" id="cancelPlanBtn">Cancel</button>
                                    <button type="submit" form="planForm" class="btn btn-primary">Save Plan</button>
                                </div>
                            </div>
                        </div>
                    `;

                    // Ensure the modal is added to the DOM
                    const firstChild = modalContainer.firstElementChild;
                    if (!firstChild) {
                        reject(new Error('Failed to create modal container'));
                        return;
                    }

                    // Append to body
                    document.body.appendChild(firstChild);

                    // Use requestAnimationFrame to ensure DOM is ready
                    requestAnimationFrame(() => {
                        try {
                            // Cache modal reference
                            this.planModal = document.getElementById('planModal');
                            this.planForm = document.getElementById('planForm');
                            this.modulesContainer = document.getElementById('modulesContainer');

                            // Cache form input references
                            this.planNameInput = this.planForm.planName;
                            this.planTypeSelect = this.planForm.planType;
                            this.planDescriptionTextarea = this.planForm.planDescription;
                            this.planPriceInput = this.planForm.planPrice;
                            this.billingCycleSelect = this.planForm.billingCycle;
                            this.planStatusSelect = this.planForm.planStatus;

                            // Verify modal and form exist
                            if (!this.planModal) {
                                reject(new Error('Failed to create plan modal: Modal not found'));
                                return;
                            }

                            if (!this.planForm) {
                                reject(new Error('Failed to create plan modal: Form not found'));
                                return;
                            }

                            // Setup close button
                            const closeButton = this.planModal.querySelector('.modal-close');
                            if (closeButton) {
                                closeButton.addEventListener('click', () => {
                                    try {
                                        this.closePlanModal();
                                    } catch (closeError) {
                                        console.error('Error closing modal:', closeError);
                                    }
                                });
                            } else {
                                console.error('Close button not found in plan modal');
                            }

                            // Setup cancel button
                            const cancelButton = document.getElementById('cancelPlanBtn');
                            if (cancelButton) {
                                cancelButton.addEventListener('click', () => {
                                    try {
                                        this.closePlanModal();
                                    } catch (cancelError) {
                                        console.error('Error canceling modal:', cancelError);
                                    }
                                });
                            } else {
                                console.error('Cancel button not found in plan modal');
                            }

                            console.log('Plan modal created successfully');
                            resolve(this.planModal);
                        } catch (error) {
                            console.error('Error setting up plan modal:', error);
                            reject(error);
                        }
                    });
                } catch (error) {
                    console.error('Comprehensive error creating plan modal:', error);
                    reject(error);
                }
            });
        }

        // Populate Modules for Plan Method
        async populateModulesForPlan() {
            try {
                // Fetch modules from the server
                const modules = await this.fetchModules();

                // Clear existing modules
                this.modulesContainer.innerHTML = '';

                // Populate modules as checkboxes
                modules.forEach(module => {
                    const moduleWrapper = document.createElement('label');
                    moduleWrapper.className = 'form-check';
                    moduleWrapper.innerHTML = `
                        <input type="checkbox" name="includedModules" value="${module._id}" class="form-check-input">
                        ${module.name}
                    `;
                    this.modulesContainer.appendChild(moduleWrapper);
                });
            } catch (error) {
                console.error('Error populating modules:', error);
                this.modulesContainer.innerHTML = '<p>Unable to load modules</p>';
            }
        }

        // Fetch Modules Method (to populate module selection)
        async fetchModules() {
            try {
                const response = await fetch(`${this.apiBaseUrl}/modules`, {
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
                return data.data || [];
            } catch (error) {
                this.handleError(error, 'Fetching Modules');
                return [];
            }
        }

        // Close Plan Modal Method
        closePlanModal() {
            if (this.planModal) {
                this.planModal.classList.remove('show');
            } else {
                console.warn('Attempted to close non-existent plan modal');
            }
        }
                // Handle Plan Form Submission Method
        async handlePlanFormSubmit(event) {
            event.preventDefault();
            
            // Collect plan details
            const planDetails = this.collectPlanDetails();

            // Validate plan details
            if (!this.validatePlanForm(planDetails)) {
                return;
            }

            try {
                // Determine if this is a new plan or an update
                const url = this.currentEditingPlan 
                    ? `${this.apiBaseUrl}/plans/${this.currentEditingPlan._id}` 
                    : `${this.apiBaseUrl}/plans`;
                
                const method = this.currentEditingPlan ? 'PUT' : 'POST';

                // Send request to create or update plan
                const response = await fetch(url, {
                    method: method,
                    headers: {
                        'Authorization': `Bearer ${this.token}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(planDetails)
                });

                // Handle response
                if (!response.ok) {
                    const errorData = await response.json();
                    throw new Error(errorData.message || 'Failed to save plan');
                }

                const result = await response.json();

                // Show success notification
                window.dashboardApp.userInterface.showSuccessNotification(
                    this.currentEditingPlan 
                        ? 'Plan updated successfully' 
                        : 'New plan created successfully'
                );

                // Close modal and refresh plans
                this.closePlanModal();
                this.currentEditingPlan = null;
                this.fetchPlans();

                return result;
            } catch (error) {
                this.handleError(error, 'Saving Plan');
                throw error;
            }
        }

        // Collect Plan Details Method
        collectPlanDetails() {
            // Collect included modules
            const includedModules = Array.from(
                this.planForm.querySelectorAll('input[name="includedModules"]:checked')
            ).map(el => el.value);

            // Return plan details object
            return {
                name: this.planNameInput.value.trim(),
                type: this.planTypeSelect.value,
                description: this.planDescriptionTextarea.value.trim(),
                price: parseFloat(this.planPriceInput.value),
                billingCycle: this.billingCycleSelect.value,
                includedModules: includedModules,
                status: this.planStatusSelect.value
            };
        }

        // Validate Plan Form Method
        validatePlanForm(planDetails) {
            // Name validation
            if (!planDetails.name) {
                this.showFormError('Plan Name is required');
                return false;
            }

            // Type validation
            if (!planDetails.type) {
                this.showFormError('Plan Type is required');
                return false;
            }

            // Price validation
            if (isNaN(planDetails.price) || planDetails.price <= 0) {
                this.showFormError('Valid Price is required');
                return false;
            }

            // Billing cycle validation
            if (!planDetails.billingCycle) {
                this.showFormError('Billing Cycle is required');
                return false;
            }

            // Modules validation
            if (planDetails.includedModules.length === 0) {
                this.showFormError('Select at least one module');
                return false;
            }

            // Status validation
            if (!planDetails.status) {
                this.showFormError('Plan Status is required');
                return false;
            }

            return true;
        }

        // Show Form Error Method
        showFormError(message) {
            // Create or get error container
            let errorContainer = this.planModal.querySelector('.form-error');
            if (!errorContainer) {
                errorContainer = document.createElement('div');
                errorContainer.className = 'form-error text-danger';
                this.planModal.querySelector('.modal-body').prepend(errorContainer);
            }

            // Show error message
            errorContainer.textContent = message;
            errorContainer.style.display = 'block';

            // Auto-hide after 3 seconds
            setTimeout(() => {
                errorContainer.style.display = 'none';
            }, 3000);
        }

        // Handle Edit Plan Method
        handleEditPlan(plan) {
            // Set current editing plan
            this.currentEditingPlan = plan;

            // Ensure modal exists
            if (!this.planModal) {
                this.createPlanModal()
                    .then(() => this.populateEditPlanForm(plan))
                    .catch(error => {
                        console.error('Failed to create modal:', error);
                    });
                return;
            }

            // Populate edit form
            this.populateEditPlanForm(plan);
        }

        // Populate Edit Plan Form Method
        populateEditPlanForm(plan) {
            // Populate basic plan details
            this.planNameInput.value = plan.name;
            this.planTypeSelect.value = plan.type;
            this.planDescriptionTextarea.value = plan.description || '';
            this.planPriceInput.value = plan.price.toFixed(2);
            this.billingCycleSelect.value = plan.billingCycle;
            this.planStatusSelect.value = plan.status;

            // Populate included modules
            const moduleCheckboxes = this.planForm.querySelectorAll('input[name="includedModules"]');
            moduleCheckboxes.forEach(checkbox => {
                checkbox.checked = plan.includedModules.some(
                    module => module._id === checkbox.value
                );
            });

            // Show modal
            this.planModal.classList.add('show');

            // Update form submission to edit mode
            this.planForm.onsubmit = this.handlePlanFormSubmit;
        }

        // Handle Delete Plan Method
        async handleDeletePlan(planId) {
            // Confirm deletion
            const confirmDelete = window.confirm('Are you sure you want to delete this plan?');
            
            if (!confirmDelete) return;

            try {
                const response = await fetch(`${this.apiBaseUrl}/plans/${planId}`, {
                    method: 'DELETE',
                    headers: {
                        'Authorization': `Bearer ${this.token}`,
                        'Content-Type': 'application/json'
                    }
                });

                if (!response.ok) {
                    const errorData = await response.json();
                    throw new Error(errorData.message || 'Failed to delete plan');
                }

                // Show success notification
                window.dashboardApp.userInterface.showSuccessNotification('Plan deleted successfully');

                // Refresh plans
                this.fetchPlans();
            } catch (error) {
                this.handleError(error, 'Deleting Plan');
            }
        }
                // Cleanup Method
        cleanup() {
            // Remove event listeners
            if (this.addNewPlanBtn) {
                this.addNewPlanBtn.removeEventListener('click', this.handleAddNewPlan);
            }

            if (this.prevPlansPageBtn) {
                this.prevPlansPageBtn.removeEventListener('click', () => {
                    if (this.currentPage > 1) {
                        this.currentPage--;
                        this.fetchPlans();
                    }
                });
            }

            if (this.nextPlansPageBtn) {
                this.nextPlansPageBtn.removeEventListener('click', () => {
                    this.currentPage++;
                    this.fetchPlans();
                });
            }

            // Remove modal if exists
            if (this.planModal) {
                // Remove close button event listener
                const closeButton = this.planModal.querySelector('.modal-close');
                if (closeButton) {
                    closeButton.removeEventListener('click', this.closePlanModal);
                }

                // Remove cancel button event listener
                const cancelButton = document.getElementById('cancelPlanBtn');
                if (cancelButton) {
                    cancelButton.removeEventListener('click', this.closePlanModal);
                }

                // Remove the modal from the DOM
                this.planModal.remove();
            }

            // Clear form submission event
            if (this.planForm) {
                this.planForm.onsubmit = null;
            }

            // Clear references
            this.plansGridContainer = null;
            this.addNewPlanBtn = null;
            this.planModal = null;
            this.planForm = null;
            this.planNameInput = null;
            this.planTypeSelect = null;
            this.planDescriptionTextarea = null;
            this.planPriceInput = null;
            this.billingCycleSelect = null;
            this.planStatusSelect = null;
            this.modulesContainer = null;
            this.prevPlansPageBtn = null;
            this.nextPlansPageBtn = null;
            this.plansShowingCount = null;
            this.pageNumberContainer = null;

            // Reset state
            this.currentPage = 1;
            this.totalPlans = 0;
            this.currentEditingPlan = null;
        }
    }

    // Expose PricingManager to the global scope
    window.PricingManager = PricingManager;
})();

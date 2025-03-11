(function() {
'use strict';

// Check if PricingManager already exists
if (window.PricingManager) {
    console.log('PricingManager already exists');
    return;
}

class PricingManager {
    constructor(baseUrl) {
        // Base configuration
        this.baseUrl = baseUrl || 'https://18.215.160.136.nip.io/api';
        this.token = localStorage.getItem('token');

        // DOM elements
        this.planList = document.getElementById('planList');
        this.planModal = document.getElementById('planModal');
        this.featureModal = document.getElementById('featureModal');
        this.discountModal = document.getElementById('discountModal');
        this.subscriptionModal = document.getElementById('subscriptionModal');
        this.paymentModal = document.getElementById('paymentModal');
        this.invoiceModal = document.getElementById('invoiceModal');
        this.reportsModal = document.getElementById('reportsModal');
        this.applyDiscountModal = document.getElementById('applyDiscountModal');
        this.referralDiscountModal = document.getElementById('referralDiscountModal');
        this.subscriptionLogsModal = document.getElementById('subscriptionLogsModal');
        this.dataRetentionModal = document.getElementById('dataRetentionModal');

        // Form elements
        this.planForm = null;
        this.featureForm = null;
        this.discountForm = null;
        this.subscriptionForm = null;
        this.paymentForm = null;
        this.invoiceForm = null;
        this.applyDiscountForm = null;
        this.referralDiscountForm = null;
        this.dataRetentionForm = null;

        // Buttons
        this.createPlanButton = document.getElementById('createPlanButton');
        this.viewReportsButton = document.getElementById('viewReportsButton');
        this.closeModalButton = document.getElementById('closeModalButton');
        this.savePlanButton = document.getElementById('savePlanButton');
        this.deletePlanButton = document.getElementById('deletePlanButton');
        this.addFeatureButton = document.getElementById('addFeatureButton');
        this.closeFeatureModalButton = document.getElementById('closeFeatureModalButton');
        this.saveFeatureButton = document.getElementById('saveFeatureButton');
        this.closeDiscountModalButton = document.getElementById('closeDiscountModalButton');
        this.saveDiscountButton = document.getElementById('saveDiscountButton');
        this.deleteDiscountButton = document.getElementById('deleteDiscountButton');
        this.closeSubscriptionModalButton = document.getElementById('closeSubscriptionModalButton');
        this.saveSubscriptionButton = document.getElementById('saveSubscriptionButton');
        this.closePaymentModalButton = document.getElementById('closePaymentModalButton');
        this.savePaymentButton = document.getElementById('savePaymentButton');
        this.closeInvoiceModalButton = document.getElementById('closeInvoiceModalButton');
        this.generateInvoiceButton = document.getElementById('generateInvoiceButton');
        this.closeReportsModalButton = document.getElementById('closeReportsModalButton');
        this.generateReportButton = document.getElementById('generateReportButton');
        this.exportReportButton = document.getElementById('exportReportButton');
        this.closeApplyDiscountModalButton = document.getElementById('closeApplyDiscountModalButton');
        this.applyDiscountButton = document.getElementById('applyDiscountButton');
        this.closeReferralDiscountModalButton = document.getElementById('closeReferralDiscountModalButton');
        this.saveReferralDiscountButton = document.getElementById('saveReferralDiscountButton');
        this.closeSubscriptionLogsModalButton = document.getElementById('closeSubscriptionLogsModalButton');
        this.closeDataRetentionModalButton = document.getElementById('closeDataRetentionModalButton');
        this.saveDataRetentionButton = document.getElementById('saveDataRetentionButton');

        // Initialize event listeners with retry mechanism
        this.initializeEventListenersWithRetry();

        // Load plans on initialization
        this.loadPlans();
    }

    // New method to handle event listener initialization with retry
    initializeEventListenersWithRetry(maxAttempts = 10) {
        let attempts = 0;
        
        const tryInitialize = () => {
            attempts++;
            
            try {
                // Attempt to set up event listeners
                this.initializeEventListeners();
                console.log('Event listeners initialized successfully');
            } catch (error) {
                if (attempts < maxAttempts) {
                    console.warn(`Event listener initialization failed. Retrying (${attempts}/${maxAttempts})...`);
                    setTimeout(tryInitialize, 500);
                } else {
                    console.error('Failed to initialize event listeners after multiple attempts', error);
                }
            }
        };

        // Start the initialization process
        tryInitialize();
    }

    // Comprehensive event listener initialization
    initializeEventListeners() {
        // Safely get or create bound methods to prevent multiple listener attachments
        this.boundSavePlan = this.savePlan.bind(this);
        this.boundDeletePlan = this.deletePlan.bind(this);
        this.boundAddFeature = this.addFeatureToForm.bind(this);

        // Plan Management Event Listeners
        this.setupEventListener(this.createPlanButton, 'click', () => this.openPlanModal());
        this.setupEventListener(this.planList, 'click', (e) => this.handlePlanListClick(e));
        this.setupEventListener(this.closeModalButton, 'click', () => this.closeModal(this.planModal));
        this.setupEventListener(this.savePlanButton, 'click', this.boundSavePlan);
        this.setupEventListener(this.deletePlanButton, 'click', this.boundDeletePlan);
        this.setupEventListener(this.addFeatureButton, 'click', () => this.addFeatureToForm());

        // Continue with other event listeners for different modals and actions...
        // (I'll continue in the next part)
    }

    // Helper method to safely set up event listeners
    setupEventListener(element, eventType, handler) {
        if (element) {
            // Remove existing listeners to prevent multiple attachments
            element.removeEventListener(eventType, handler);
            element.addEventListener(eventType, handler);
        } else {
            console.warn(`Element not found for ${eventType} event`);
        }
    }

        // Helper method to close modals
    closeModal(modal) {
        if (modal) {
            modal.classList.remove('active');
        }
    }

    // Helper method to open modals
    openModal(modal, title = '') {
        if (!modal) {
            console.error('Modal element is undefined');
            return;
        }

        const modalTitle = modal.querySelector('.modal-title');
        if (modalTitle && title) {
            modalTitle.textContent = title;
        }
        modal.classList.add('active');
    }

    // Helper method to show loading state
    showLoadingState(element) {
        if (!element) {
            console.error('Element for loading state is undefined');
            return;
        }

        element.innerHTML = `
            <div class="loader-spinner">
                <i class="fas fa-spinner fa-spin"></i>
                <p>Loading...</p>
            </div>
        `;
    }

    // Helper method to show error state
    showErrorState(element, message) {
        if (!element) {
            console.error('Element for error state is undefined');
            return;
        }

        element.innerHTML = `
            <div class="error-state">
                <i class="fas fa-exclamation-triangle"></i>
                <p>${message || 'An unexpected error occurred'}</p>
            </div>
        `;
    }

    // Helper method to show success state
    showSuccessState(element, message) {
        if (!element) {
            console.error('Element for success state is undefined');
            return;
        }

        element.innerHTML = `
            <div class="success-state">
                <i class="fas fa-check-circle"></i>
                <p>${message || 'Operation completed successfully'}</p>
            </div>
        `;
    }

    // Helper method to create form error
    createFormError(element, message) {
        if (!element) {
            console.error('Element for form error is undefined');
            return;
        }

        // Remove any existing error
        const existingError = element.parentNode.querySelector('.form-error');
        if (existingError) {
            existingError.remove();
        }

        const errorElement = document.createElement('div');
        errorElement.className = 'form-error';
        errorElement.textContent = message;
        element.parentNode.insertBefore(errorElement, element.nextSibling);
    }

    // Helper method to remove form errors
    removeFormErrors(form) {
        if (!form) {
            console.error('Form for error removal is undefined');
            return;
        }

        const errorElements = form.querySelectorAll('.form-error');
        errorElements.forEach(error => error.remove());
    }

    // Helper method to validate form
    validateForm(form) {
        if (!form) {
            console.error('Form for validation is undefined');
            return false;
        }

        this.removeFormErrors(form);
        let isValid = true;

        const requiredFields = form.querySelectorAll('[required]');
        requiredFields.forEach(field => {
            if (!field.value.trim()) {
                this.createFormError(field, `${field.name || 'This field'} is required`);
                isValid = false;
            }
        });

        return isValid;
    }

    // Helper method to fetch data from API
    async fetchData(endpoint, method = 'GET', body = null) {
        const headers = {
            'Authorization': `Bearer ${this.token}`,
            'Content-Type': 'application/json'
        };

        try {
            const url = `${this.baseUrl}/${endpoint}`;
            const config = {
                method,
                headers,
                body: body ? JSON.stringify(body) : null
            };

            const response = await fetch(url, config);

            if (!response.ok) {
                const errorBody = await response.text();
                console.error('API Error Response:', errorBody);
                throw new Error(`HTTP error! status: ${response.status}, message: ${errorBody}`);
            }

            return await response.json();
        } catch (error) {
            console.error('Fetch error:', error);
            
            // Enhanced error handling
            if (window.dashboardApp && window.dashboardApp.userInterface) {
                window.dashboardApp.userInterface.showErrorNotification(
                    error.message || 'An unexpected error occurred during the API call'
                );
            }

            throw error;
        }
    }

    // Helper method to create audit log
    async createAuditLog(action, details) {
        try {
            await this.fetchData('audit-logs', 'POST', {
                action,
                details: JSON.stringify(details)
            });
        } catch (error) {
            console.error('Error creating audit log:', error);
        }
    }

    // Fallback error notification method
    showErrorNotification(message) {
        if (window.dashboardApp && window.dashboardApp.userInterface) {
            window.dashboardApp.userInterface.showErrorNotification(message);
        } else {
            console.error(message);
            alert(message);
        }
    }

        // Method to load plans
    async loadPlans() {
        try {
            // Ensure planList exists
            if (!this.planList) {
                this.planList = document.getElementById('planList');
                if (!this.planList) {
                    console.error('Plan list element not found');
                    return;
                }
            }

            // Show loading state
            this.showLoadingState(this.planList);

            // Fetch plans from API
            const response = await this.fetchData('plans');

            if (response.success && Array.isArray(response.data)) {
                // Clear existing content
                this.planList.innerHTML = '';

                // Create plan cards for each plan
                response.data.forEach(plan => {
                    const planCard = this.createPlanCard(plan);
                    this.planList.appendChild(planCard);
                });
            } else {
                // Handle unexpected response structure
                this.showErrorState(this.planList, response.message || 'Failed to load plans');
            }
        } catch (error) {
            console.error('Error loading plans:', error);
            this.showErrorState(this.planList, error.message || 'An unexpected error occurred while loading plans');
        }
    }

    // Method to create a plan card
    createPlanCard(plan) {
        // Validate plan object
        if (!plan || !plan._id) {
            console.error('Invalid plan object', plan);
            return document.createElement('div');
        }

        const planCard = document.createElement('div');
        planCard.className = 'plan-card';
        planCard.dataset.planId = plan._id;

        // Safely handle features
        const featuresHTML = plan.features && Array.isArray(plan.features)
            ? plan.features.map(feature => 
                `<li class="plan-feature">
                    <i class="fas fa-check"></i>
                    ${feature.name || 'Unnamed Feature'}
                </li>`
            ).join('')
            : '<li class="plan-feature">No features defined</li>';

        planCard.innerHTML = `
            <h3 class="plan-name">${plan.name || 'Unnamed Plan'}</h3>
            <p class="plan-description">${plan.description || 'No description'}</p>
            <div class="plan-pricing">
                <span class="plan-price">
                    $${plan.monthlyPrice?.toFixed(2) || '0.00'}/mo 
                    or 
                    $${plan.annualPrice?.toFixed(2) || '0.00'}/yr
                </span>
                ${plan.trialPeriod ? `<p class="plan-trial">${plan.trialPeriod} days free trial</p>` : ''}
            </div>
            <ul class="plan-features">
                ${featuresHTML}
            </ul>
            <div class="plan-actions">
                <button class="plan-action-button edit-plan" data-plan-id="${plan._id}">
                    <i class="fas fa-edit"></i> Edit
                </button>
                <button class="plan-action-button delete-plan" data-plan-id="${plan._id}">
                    <i class="fas fa-trash"></i> Delete
                </button>
                <button class="plan-action-button view-subscriptions" data-plan-id="${plan._id}">
                    <i class="fas fa-eye"></i> View Subscriptions
                </button>
            </div>
        `;

        return planCard;
    }

    // Method to handle plan list click events
    handlePlanListClick(e) {
        const target = e.target.closest('button');
        if (!target) return;

        const planCard = target.closest('.plan-card');
        const planId = planCard?.dataset.planId;

        if (!planId) {
            console.error('No plan ID found');
            return;
        }

        if (target.classList.contains('edit-plan')) {
            this.editPlan(planId);
        } else if (target.classList.contains('delete-plan')) {
            this.deletePlan(planId);
        } else if (target.classList.contains('view-subscriptions')) {
            this.viewSubscriptions(planId);
        }
    }

    // Method to open plan modal for editing
    async editPlan(planId) {
        try {
            // Fetch specific plan details
            const response = await this.fetchData(`plans/${planId}`);

            if (response.success && response.data) {
                this.openPlanModal(response.data);
            } else {
                this.showErrorNotification(response.message || 'Failed to fetch plan details');
            }
        } catch (error) {
            console.error('Error editing plan:', error);
            this.showErrorNotification(error.message || 'An error occurred while editing the plan');
        }
    }

    // Method to open plan modal
    openPlanModal(plan = null) {
        // Ensure form is current
        this.planForm = document.getElementById('planForm');
        if (!this.planForm) {
            console.error('Plan form not found');
            return;
        }

        // Reset form
        this.planForm.reset();

        // Populate form if editing existing plan
        if (plan) {
            this.populatePlanForm(plan);
            this.planForm.dataset.planId = plan._id;
            this.openModal(this.planModal, 'Edit Plan');
            
            // Show delete button
            if (this.deletePlanButton) {
                this.deletePlanButton.style.display = 'inline-block';
            }
        } else {
            // Creating new plan
            this.planForm.dataset.planId = '';
            this.openModal(this.planModal, 'Create New Plan');
            
            // Hide delete button
            if (this.deletePlanButton) {
                this.deletePlanButton.style.display = 'none';
            }
        }

        // Populate feature list
        this.populateFeatureList(plan?.features || []);
    }

    // Helper method to populate plan form
    populatePlanForm(plan) {
        const safeSetValue = (selector, value) => {
            const element = this.planForm.querySelector(selector);
            if (element) {
                if (element.type === 'checkbox') {
                    element.checked = value;
                } else {
                    element.value = value;
                }
            }
        };

        safeSetValue('#planName', plan.name);
        safeSetValue('#planDescription', plan.description);
        safeSetValue('#monthlyPrice', plan.monthlyPrice);
        safeSetValue('#annualPrice', plan.annualPrice);
        safeSetValue('#trialPeriod', plan.trialPeriod);
        safeSetValue('#isActive', plan.isActive);
    }

    // Helper method to populate feature list
    populateFeatureList(features) {
        const featureList = this.planForm.querySelector('#featureList');
        if (!featureList) {
            console.error('Feature list container not found');
            return;
        }

        // Clear existing features
        featureList.innerHTML = '';

        // Add features
        features.forEach(feature => {
            this.addFeatureToForm(feature);
        });
    }

        // Method to add feature to plan form
    addFeatureToForm(feature = null) {
        // Ensure feature list container exists
        const featureList = this.planForm?.querySelector('#featureList');
        if (!featureList) {
            console.error('Feature list container not found');
            return;
        }

        // Create feature item container
        const featureItem = document.createElement('div');
        featureItem.className = 'feature-item form-group';

        // Create feature name input
        const featureInput = document.createElement('input');
        featureInput.type = 'text';
        featureInput.className = 'form-input feature-name';
        featureInput.placeholder = 'Enter feature name';
        featureInput.required = true;

        // Set feature value if provided
        if (feature && feature.name) {
            featureInput.value = feature.name;
        }

        // Create remove feature button
        const removeButton = document.createElement('button');
        removeButton.type = 'button';
        removeButton.className = 'pricing-action-button secondary remove-feature';
        removeButton.innerHTML = '<i class="fas fa-trash"></i> Remove';

        // Add remove feature functionality
        removeButton.addEventListener('click', () => {
            featureItem.remove();
        });

        // Append input and remove button to feature item
        featureItem.appendChild(featureInput);
        featureItem.appendChild(removeButton);

        // Add feature item to feature list
        featureList.appendChild(featureItem);

        return featureItem;
    }

    // Method to save feature
    async saveFeature(e) {
        e.preventDefault();

        // Ensure feature form exists
        this.featureForm = document.getElementById('featureForm');
        if (!this.featureForm) {
            console.error('Feature form not found');
            return;
        }

        // Validate form
        if (!this.validateForm(this.featureForm)) return;

        // Prepare feature data
        const featureData = {
            name: this.featureForm.querySelector('#featureName').value.trim(),
            description: this.featureForm.querySelector('#featureDescription').value.trim(),
            category: this.featureForm.querySelector('#featureCategory').value
        };

        // Determine if creating or updating
        const featureId = this.featureForm.dataset.featureId;
        const method = featureId ? 'PUT' : 'POST';
        const endpoint = featureId ? `features/${featureId}` : 'features';

        try {
            // Show loading state
            this.showLoadingState(this.featureForm);

            // Send API request
            const response = await this.fetchData(endpoint, method, featureData);

            if (response.success) {
                // Show success message
                this.showSuccessState(this.featureForm, 
                    `Feature ${featureId ? 'updated' : 'created'} successfully`
                );

                // Close feature modal
                this.closeModal(this.featureModal);

                // Create audit log
                await this.createAuditLog(
                    featureId ? 'FEATURE_UPDATED' : 'FEATURE_CREATED', 
                    featureData
                );

                // Optionally refresh features or update UI
                this.updateFeatureList();
            } else {
                // Show error message
                this.showErrorState(
                    this.featureForm, 
                    response.message || 'Failed to save feature'
                );
            }
        } catch (error) {
            console.error('Error saving feature:', error);
            this.showErrorState(
                this.featureForm, 
                error.message || 'An unexpected error occurred'
            );
        }
    }

    // Method to update feature list
    updateFeatureList() {
        // This method can be used to refresh the feature list 
        // after adding, updating, or deleting a feature
        try {
            // Fetch updated features from API
            this.fetchData('features')
                .then(response => {
                    if (response.success && Array.isArray(response.data)) {
                        // Update feature selection dropdowns or lists
                        this.updateFeatureSelections(response.data);
                    }
                })
                .catch(error => {
                    console.error('Error updating feature list:', error);
                });
        } catch (error) {
            console.error('Error in updateFeatureList:', error);
        }
    }

    // Method to update feature selections
    updateFeatureSelections(features) {
        // Update feature selections in various forms or dropdowns
        const updateSelect = (selectId) => {
            const select = document.getElementById(selectId);
            if (select) {
                // Clear existing options
                select.innerHTML = '';

                // Add new feature options
                features.forEach(feature => {
                    const option = document.createElement('option');
                    option.value = feature._id;
                    option.textContent = feature.name;
                    select.appendChild(option);
                });
            }
        };

        // Update feature selections in different contexts
        updateSelect('featureCategory');
        // Add more select updates as needed
    }

    // Method to open feature modal
    openFeatureModal(feature = null) {
        // Ensure feature form exists
        this.featureForm = document.getElementById('featureForm');
        if (!this.featureForm) {
            console.error('Feature form not found');
            return;
        }

        // Reset form
        this.featureForm.reset();

        // Populate form if editing existing feature
        if (feature) {
            this.featureForm.querySelector('#featureName').value = feature.name || '';
            this.featureForm.querySelector('#featureDescription').value = feature.description || '';
            this.featureForm.querySelector('#featureCategory').value = feature.category || '';
            
            // Store feature ID for update
            this.featureForm.dataset.featureId = feature._id;
            
            // Open modal with edit title
            this.openModal(this.featureModal, 'Edit Feature');
        } else {
            // Clear feature ID for new feature
            this.featureForm.dataset.featureId = '';
            
            // Open modal with create title
            this.openModal(this.featureModal, 'Create New Feature');
        }
    }

        // Method to open discount modal
    openDiscountModal(discount = null) {
        // Ensure discount form exists
        this.discountForm = document.getElementById('discountForm');
        if (!this.discountForm) {
            console.error('Discount form not found');
            return;
        }

        // Reset form
        this.discountForm.reset();

        // Populate applicable plans dropdown
        this.populateDiscountPlans();

        // Populate form if editing existing discount
        if (discount) {
            this.populateDiscountForm(discount);
            
            // Store discount ID for update
            this.discountForm.dataset.discountId = discount._id;
            
            // Show delete button
            if (this.deleteDiscountButton) {
                this.deleteDiscountButton.style.display = 'inline-block';
            }
            
            // Open modal with edit title
            this.openModal(this.discountModal, 'Edit Discount');
        } else {
            // Clear discount ID for new discount
            this.discountForm.dataset.discountId = '';
            
            // Hide delete button
            if (this.deleteDiscountButton) {
                this.deleteDiscountButton.style.display = 'none';
            }
            
            // Open modal with create title
            this.openModal(this.discountModal, 'Create New Discount');
        }
    }

    // Method to populate discount plans dropdown
    async populateDiscountPlans() {
        try {
            // Fetch plans from API
            const response = await this.fetchData('plans');

            if (response.success && Array.isArray(response.data)) {
                const plansSelect = this.discountForm.querySelector('#discountApplicablePlans');
                
                // Clear existing options
                plansSelect.innerHTML = '';

                // Add plans to dropdown
                response.data.forEach(plan => {
                    const option = document.createElement('option');
                    option.value = plan._id;
                    option.textContent = plan.name;
                    plansSelect.appendChild(option);
                });
            } else {
                console.error('Failed to fetch plans:', response.message);
            }
        } catch (error) {
            console.error('Error populating discount plans:', error);
            this.showErrorNotification('Failed to load plans for discount');
        }
    }

    // Method to populate discount form
    populateDiscountForm(discount) {
        const safeSetValue = (selector, value) => {
            const element = this.discountForm.querySelector(selector);
            if (element) {
                element.value = value;
            }
        };

        // Set form values
        safeSetValue('#discountCode', discount.code);
        safeSetValue('#discountType', discount.type);
        safeSetValue('#discountValue', discount.value);
        
        // Format and set expiry date
        if (discount.expiryDate) {
            const expiryDate = new Date(discount.expiryDate);
            safeSetValue('#discountExpiry', expiryDate.toISOString().split('T')[0]);
        }

        safeSetValue('#discountUsageLimit', discount.usageLimit);

        // Set applicable plans
        const applicablePlansSelect = this.discountForm.querySelector('#discountApplicablePlans');
        if (applicablePlansSelect && discount.applicablePlans) {
            Array.from(applicablePlansSelect.options).forEach(option => {
                option.selected = discount.applicablePlans.includes(option.value);
            });
        }
    }

    // Method to save discount
    async saveDiscount(e) {
        e.preventDefault();

        // Ensure discount form exists
        this.discountForm = document.getElementById('discountForm');
        if (!this.discountForm) {
            console.error('Discount form not found');
            return;
        }

        // Validate form
        if (!this.validateForm(this.discountForm)) return;

        // Prepare discount data
        const applicablePlans = Array.from(
            this.discountForm.querySelector('#discountApplicablePlans').selectedOptions
        ).map(option => option.value);

        const discountData = {
            code: this.discountForm.querySelector('#discountCode').value.trim(),
            type: this.discountForm.querySelector('#discountType').value,
            value: parseFloat(this.discountForm.querySelector('#discountValue').value),
            expiryDate: new Date(this.discountForm.querySelector('#discountExpiry').value).toISOString(),
            usageLimit: parseInt(this.discountForm.querySelector('#discountUsageLimit').value) || 0,
            applicablePlans: applicablePlans
        };

        // Determine if creating or updating
        const discountId = this.discountForm.dataset.discountId;
        const method = discountId ? 'PUT' : 'POST';
        const endpoint = discountId ? `discounts/${discountId}` : 'discounts';

        try {
            // Show loading state
            this.showLoadingState(this.discountForm);

            // Send API request
            const response = await this.fetchData(endpoint, method, discountData);

            if (response.success) {
                // Show success message
                this.showSuccessState(
                    this.discountForm, 
                    `Discount ${discountId ? 'updated' : 'created'} successfully`
                );

                // Close discount modal
                this.closeModal(this.discountModal);

                // Create audit log
                await this.createAuditLog(
                    discountId ? 'DISCOUNT_UPDATED' : 'DISCOUNT_CREATED', 
                    discountData
                );

                // Optionally refresh discounts or update UI
                // You might want to add a method to refresh discount list
            } else {
                // Show error message
                this.showErrorState(
                    this.discountForm, 
                    response.message || 'Failed to save discount'
                );
            }
        } catch (error) {
            console.error('Error saving discount:', error);
            this.showErrorState(
                this.discountForm, 
                error.message || 'An unexpected error occurred'
            );
        }
    }

    // Method to delete discount
    async deleteDiscount(e) {
        e.preventDefault();

        // Get discount ID
        const discountId = this.discountForm.dataset.discountId;
        if (!discountId) {
            console.error('No discount ID found');
            return;
        }

        // Confirm deletion
        if (!confirm('Are you sure you want to delete this discount?')) return;

        try {
            // Show loading state
            this.showLoadingState(this.discountForm);

            // Send delete request
            const response = await this.fetchData(`discounts/${discountId}`, 'DELETE');

            if (response.success) {
                // Show success message
                this.showSuccessState(
                    this.discountForm, 
                    'Discount deleted successfully'
                );

                // Close discount modal
                this.closeModal(this.discountModal);

                // Create audit log
                await this.createAuditLog('DISCOUNT_DELETED', { discountId });

                // Optionally refresh discounts or update UI
                // You might want to add a method to refresh discount list
            } else {
                // Show error message
                this.showErrorState(
                    this.discountForm, 
                    response.message || 'Failed to delete discount'
                );
            }
        } catch (error) {
            console.error('Error deleting discount:', error);
            this.showErrorState(
                this.discountForm, 
                error.message || 'An unexpected error occurred'
            );
        }
    }

        // Method to open subscription modal
    async openSubscriptionModal(subscription = null) {
        // Ensure subscription form exists
        this.subscriptionForm = document.getElementById('subscriptionForm');
        if (!this.subscriptionForm) {
            console.error('Subscription form not found');
            return;
        }

        // Reset form
        this.subscriptionForm.reset();

        try {
            // Populate companies and plans dropdowns
            await Promise.all([
                this.populateSubscriptionCompanies(),
                this.populateSubscriptionPlans()
            ]);

            // Populate form if editing existing subscription
            if (subscription) {
                this.populateSubscriptionForm(subscription);
                
                // Store subscription ID for update
                this.subscriptionForm.dataset.subscriptionId = subscription._id;
                
                // Open modal with edit title
                this.openModal(this.subscriptionModal, 'Edit Subscription');
            } else {
                // Clear subscription ID for new subscription
                this.subscriptionForm.dataset.subscriptionId = '';
                
                // Open modal with create title
                this.openModal(this.subscriptionModal, 'Create New Subscription');
            }

            // Set up date-related functionality
            this.setupSubscriptionDateHandlers();
        } catch (error) {
            console.error('Error opening subscription modal:', error);
            this.showErrorNotification('Failed to open subscription modal');
        }
    }

    // Method to populate companies in subscription form
    async populateSubscriptionCompanies() {
        try {
            // Fetch companies from API
            const response = await this.fetchData('companies');

            if (response.success && Array.isArray(response.companies)) {
                const companiesSelect = this.subscriptionForm.querySelector('#companyName');
                
                // Clear existing options
                companiesSelect.innerHTML = '';

                // Add companies to dropdown
                response.companies.forEach(company => {
                    const option = document.createElement('option');
                    option.value = company._id;
                    option.textContent = company.name;
                    companiesSelect.appendChild(option);
                });
            } else {
                console.error('Failed to fetch companies:', response.message);
            }
        } catch (error) {
            console.error('Error populating subscription companies:', error);
            this.showErrorNotification('Failed to load companies');
        }
    }

    // Method to populate plans in subscription form
    async populateSubscriptionPlans() {
        try {
            // Fetch plans from API
            const response = await this.fetchData('plans');

            if (response.success && Array.isArray(response.data)) {
                const plansSelect = this.subscriptionForm.querySelector('#newPlan');
                
                // Clear existing options
                plansSelect.innerHTML = '';

                // Add plans to dropdown
                response.data.forEach(plan => {
                    const option = document.createElement('option');
                    option.value = plan._id;
                    option.textContent = plan.name;
                    plansSelect.appendChild(option);
                });
            } else {
                console.error('Failed to fetch plans:', response.message);
            }
        } catch (error) {
            console.error('Error populating subscription plans:', error);
            this.showErrorNotification('Failed to load plans');
        }
    }

    // Method to set up date-related handlers
    setupSubscriptionDateHandlers() {
        const startDateInput = this.subscriptionForm.querySelector('#startDate');
        const endDateInput = this.subscriptionForm.querySelector('#endDate');
        const billingCycleSelect = this.subscriptionForm.querySelector('#billingCycle');

        // Update end date based on start date and billing cycle
        const updateEndDate = () => {
            if (startDateInput.value) {
                const startDate = new Date(startDateInput.value);
                const billingCycle = billingCycleSelect.value;
                
                // Set end date based on billing cycle
                const endDate = new Date(startDate);
                if (billingCycle === 'monthly') {
                    endDate.setMonth(endDate.getMonth() + 1);
                } else if (billingCycle === 'annual') {
                    endDate.setFullYear(endDate.getFullYear() + 1);
                }

                // Format end date for input
                const formattedEndDate = endDate.toISOString().split('T')[0];
                endDateInput.value = formattedEndDate;
            }
        };

        // Add event listeners
        startDateInput.addEventListener('change', updateEndDate);
        billingCycleSelect.addEventListener('change', updateEndDate);
    }

    // Method to populate subscription form
    populateSubscriptionForm(subscription) {
        const safeSetValue = (selector, value) => {
            const element = this.subscriptionForm.querySelector(selector);
            if (element) {
                element.value = value;
            }
        };

        // Set form values
        safeSetValue('#companyName', subscription.companyId);
        safeSetValue('#newPlan', subscription.planId);
        safeSetValue('#billingCycle', subscription.billingCycle);
        
        // Format and set dates
        if (subscription.startDate) {
            const startDate = new Date(subscription.startDate);
            safeSetValue('#startDate', startDate.toISOString().split('T')[0]);
        }

        if (subscription.endDate) {
            const endDate = new Date(subscription.endDate);
            safeSetValue('#endDate', endDate.toISOString().split('T')[0]);
        }

        // Set discount code if exists
        safeSetValue('#discountCode', subscription.discountCode || '');
    }

    // Method to save subscription
    async saveSubscription(e) {
        e.preventDefault();

        // Ensure subscription form exists
        this.subscriptionForm = document.getElementById('subscriptionForm');
        if (!this.subscriptionForm) {
            console.error('Subscription form not found');
            return;
        }

        // Validate form
        if (!this.validateForm(this.subscriptionForm)) return;

        // Prepare subscription data
        const subscriptionData = {
            companyId: this.subscriptionForm.querySelector('#companyName').value,
            planId: this.subscriptionForm.querySelector('#newPlan').value,
            billingCycle: this.subscriptionForm.querySelector('#billingCycle').value,
            startDate: new Date(this.subscriptionForm.querySelector('#startDate').value).toISOString(),
            endDate: new Date(this.subscriptionForm.querySelector('#endDate').value).toISOString(),
            discountCode: this.subscriptionForm.querySelector('#discountCode').value.trim() || null
        };

        // Determine if creating or updating
        const subscriptionId = this.subscriptionForm.dataset.subscriptionId;
        const method = subscriptionId ? 'PUT' : 'POST';
        const endpoint = subscriptionId ? `subscriptions/${subscriptionId}` : 'subscriptions';

        try {
            // Show loading state
            this.showLoadingState(this.subscriptionForm);

            // Send API request
            const response = await this.fetchData(endpoint, method, subscriptionData);

            if (response.success) {
                // Show success message
                this.showSuccessState(
                    this.subscriptionForm, 
                    `Subscription ${subscriptionId ? 'updated' : 'created'} successfully`
                );

                // Close subscription modal
                this.closeModal(this.subscriptionModal);

                // Create audit log
                await this.createAuditLog(
                    subscriptionId ? 'SUBSCRIPTION_UPDATED' : 'SUBSCRIPTION_CREATED', 
                    subscriptionData
                );

                // Optionally refresh subscriptions or update UI
                // You might want to add a method to refresh subscription list
            } else {
                // Show error message
                this.showErrorState(
                    this.subscriptionForm, 
                    response.message || 'Failed to save subscription'
                );
            }
        } catch (error) {
            console.error('Error saving subscription:', error);
            this.showErrorState(
                this.subscriptionForm, 
                error.message || 'An unexpected error occurred'
            );
        }
    }

        // Method to open payment method modal
    openPaymentMethodModal(paymentMethod = null) {
        // Ensure payment form exists
        this.paymentForm = document.getElementById('paymentForm');
        if (!this.paymentForm) {
            console.error('Payment form not found');
            return;
        }

        // Reset form
        this.paymentForm.reset();

        // Set up event listener for payment method type change
        const paymentMethodSelect = this.paymentForm.querySelector('#paymentMethod');
        paymentMethodSelect.addEventListener('change', () => this.updatePaymentMethodDetails());

        // Populate form if editing existing payment method
        if (paymentMethod) {
            this.populatePaymentMethodForm(paymentMethod);
            
            // Store payment method ID for update
            this.paymentForm.dataset.paymentMethodId = paymentMethod._id;
            
            // Open modal with edit title
            this.openModal(this.paymentModal, 'Edit Payment Method');
        } else {
            // Clear payment method ID for new method
            this.paymentForm.dataset.paymentMethodId = '';
            
            // Open modal with create title
            this.openModal(this.paymentModal, 'Add New Payment Method');
        }

        // Initial population of payment method details
        this.updatePaymentMethodDetails();
    }

    // Method to update payment method details based on selected type
    updatePaymentMethodDetails() {
        const paymentMethodSelect = this.paymentForm.querySelector('#paymentMethod');
        const paymentDetailsContainer = this.paymentForm.querySelector('#paymentDetails');

        // Clear existing details
        paymentDetailsContainer.innerHTML = '';

        // Dynamically create input fields based on payment method
        switch (paymentMethodSelect.value) {
            case 'creditCard':
                paymentDetailsContainer.innerHTML = `
                    <div class="form-group">
                        <label for="cardNumber" class="form-label">Card Number</label>
                        <input type="text" id="cardNumber" name="cardNumber" class="form-input" required 
                               pattern="[0-9]{16}" placeholder="16-digit card number">
                    </div>
                    <div class="form-group">
                        <label for="cardHolder" class="form-label">Card Holder Name</label>
                        <input type="text" id="cardHolder" name="cardHolder" class="form-input" required>
                    </div>
                    <div class="form-row">
                        <div class="form-group">
                            <label for="expiryDate" class="form-label">Expiry Date</label>
                            <input type="text" id="expiryDate" name="expiryDate" class="form-input" 
                                   placeholder="MM/YY" required pattern="(0[1-9]|1[0-2])\/[0-9]{2}">
                        </div>
                        <div class="form-group">
                            <label for="cvv" class="form-label">CVV</label>
                            <input type="text" id="cvv" name="cvv" class="form-input" 
                                   required pattern="[0-9]{3,4}" placeholder="3-4 digit CVV">
                        </div>
                    </div>
                `;
                break;
            case 'bankTransfer':
                paymentDetailsContainer.innerHTML = `
                    <div class="form-group">
                        <label for="bankName" class="form-label">Bank Name</label>
                        <input type="text" id="bankName" name="bankName" class="form-input" required>
                    </div>
                    <div class="form-group">
                        <label for="accountNumber" class="form-label">Account Number</label>
                        <input type="text" id="accountNumber" name="accountNumber" class="form-input" required>
                    </div>
                    <div class="form-group">
                        <label for="swiftCode" class="form-label">SWIFT/BIC Code</label>
                        <input type="text" id="swiftCode" name="swiftCode" class="form-input" required>
                    </div>
                `;
                break;
            case 'paypal':
                paymentDetailsContainer.innerHTML = `
                    <div class="form-group">
                        <label for="paypalEmail" class="form-label">PayPal Email</label>
                        <input type="email" id="paypalEmail" name="paypalEmail" class="form-input" required>
                    </div>
                `;
                break;
            case 'razorpay':
                paymentDetailsContainer.innerHTML = `
                    <div class="form-group">
                        <label for="razorpayId" class="form-label">Razorpay Merchant ID</label>
                        <input type="text" id="razorpayId" name="razorpayId" class="form-input" required>
                    </div>
                `;
                break;
            default:
                paymentDetailsContainer.innerHTML = '<p>Select a payment method to view details.</p>';
        }
    }

    // Method to populate payment method form
    populatePaymentMethodForm(paymentMethod) {
        const paymentMethodSelect = this.paymentForm.querySelector('#paymentMethod');
        paymentMethodSelect.value = paymentMethod.type;

        // Trigger details update
        this.updatePaymentMethodDetails();

        // Populate specific details based on payment method type
        switch (paymentMethod.type) {
            case 'creditCard':
                this.safeSetValue('#cardNumber', paymentMethod.details.cardNumber);
                this.safeSetValue('#cardHolder', paymentMethod.details.cardHolder);
                this.safeSetValue('#expiryDate', paymentMethod.details.expiryDate);
                this.safeSetValue('#cvv', paymentMethod.details.cvv);
                break;
            case 'bankTransfer':
                this.safeSetValue('#bankName', paymentMethod.details.bankName);
                this.safeSetValue('#accountNumber', paymentMethod.details.accountNumber);
                this.safeSetValue('#swiftCode', paymentMethod.details.swiftCode);
                break;
            case 'paypal':
                this.safeSetValue('#paypalEmail', paymentMethod.details.paypalEmail);
                break;
            case 'razorpay':
                this.safeSetValue('#razorpayId', paymentMethod.details.razorpayId);
                break;
        }
    }

    // Helper method to safely set form values
    safeSetValue(selector, value) {
        const element = this.paymentForm.querySelector(selector);
        if (element && value !== undefined) {
            element.value = value;
        }
    }

    // Method to save payment method
    async savePaymentMethod(e) {
        e.preventDefault();

        // Ensure payment form exists
        this.paymentForm = document.getElementById('paymentForm');
        if (!this.paymentForm) {
            console.error('Payment form not found');
            return;
        }

        // Validate form
        if (!this.validateForm(this.paymentForm)) return;

        // Prepare payment method data
        const paymentMethodData = {
            type: this.paymentForm.querySelector('#paymentMethod').value,
            details: this.collectPaymentMethodDetails()
        };

        // Determine if creating or updating
        const paymentMethodId = this.paymentForm.dataset.paymentMethodId;
        const method = paymentMethodId ? 'PUT' : 'POST';
        const endpoint = paymentMethodId ? `payments/${paymentMethodId}` : 'payments';

        try {
            // Show loading state
            this.showLoadingState(this.paymentForm);

            // Send API request
            const response = await this.fetchData(endpoint, method, paymentMethodData);

            if (response.success) {
                // Show success message
                this.showSuccessState(
                    this.paymentForm, 
                    `Payment method ${paymentMethodId ? 'updated' : 'added'} successfully`
                );

                // Close payment method modal
                this.closeModal(this.paymentModal);

                // Create audit log
                await this.createAuditLog(
                    paymentMethodId ? 'PAYMENT_METHOD_UPDATED' : 'PAYMENT_METHOD_CREATED', 
                    paymentMethodData
                );

                // Optionally refresh payment methods or update UI
            } else {
                // Show error message
                this.showErrorState(
                    this.paymentForm, 
                    response.message || 'Failed to save payment method'
                );
            }
        } catch (error) {
            console.error('Error saving payment method:', error);
            this.showErrorState(
                this.paymentForm, 
                error.message || 'An unexpected error occurred'
            );
        }
    }

    // Method to collect payment method details
    collectPaymentMethodDetails() {
        const paymentMethodType = this.paymentForm.querySelector('#paymentMethod').value;
        const details = {};

        switch (paymentMethodType) {
            case 'creditCard':
                details.cardNumber = this.paymentForm.querySelector('#cardNumber').value;
                details.cardHolder = this.paymentForm.querySelector('#cardHolder').value;
                details.expiryDate = this.paymentForm.querySelector('#expiryDate').value;
                details.cvv = this.paymentForm.querySelector('#cvv').value;
                break;
            case 'bankTransfer':
                details.bankName = this.paymentForm.querySelector('#bankName').value;
                details.accountNumber = this.paymentForm.querySelector('#accountNumber').value;
                details.swiftCode = this.paymentForm.querySelector('#swiftCode').value;
                break;
            case 'paypal':
                details.paypalEmail = this.paymentForm.querySelector('#paypalEmail').value;
                break;
            case 'razorpay':
                details.razorpayId = this.paymentForm.querySelector('#razorpayId').value;
                break;
        }

        return details;
    }

        // Method to open invoice modal
    async openInvoiceModal(invoice = null) {
        // Ensure invoice form exists
        this.invoiceForm = document.getElementById('invoiceForm');
        if (!this.invoiceForm) {
            console.error('Invoice form not found');
            return;
        }

        // Reset form
        this.invoiceForm.reset();

        try {
            // Populate companies dropdown
            await this.populateInvoiceCompanies();

            // Populate form if editing existing invoice
            if (invoice) {
                this.populateInvoiceForm(invoice);
                
                // Store invoice ID for update
                this.invoiceForm.dataset.invoiceId = invoice._id;
                
                // Open modal with edit title
                this.openModal(this.invoiceModal, 'Edit Invoice');
            } else {
                // Clear invoice ID for new invoice
                this.invoiceForm.dataset.invoiceId = '';
                
                // Open modal with create title
                this.openModal(this.invoiceModal, 'Generate New Invoice');
            }

            // Set up date-related functionality
            this.setupInvoiceDateHandlers();
        } catch (error) {
            console.error('Error opening invoice modal:', error);
            this.showErrorNotification('Failed to open invoice modal');
        }
    }

    // Method to populate companies in invoice form
    async populateInvoiceCompanies() {
        try {
            // Fetch companies from API
            const response = await this.fetchData('companies');

            if (response.success && Array.isArray(response.companies)) {
                const companiesSelect = this.invoiceForm.querySelector('#invoiceCompany');
                
                // Clear existing options
                companiesSelect.innerHTML = '';

                // Add companies to dropdown
                response.companies.forEach(company => {
                    const option = document.createElement('option');
                    option.value = company._id;
                    option.textContent = company.name;
                    companiesSelect.appendChild(option);
                });
            } else {
                console.error('Failed to fetch companies:', response.message);
            }
        } catch (error) {
            console.error('Error populating invoice companies:', error);
            this.showErrorNotification('Failed to load companies');
        }
    }

    // Method to set up date-related handlers for invoice
    setupInvoiceDateHandlers() {
        const invoiceDateInput = this.invoiceForm.querySelector('#invoiceDate');
        const dueDateInput = this.invoiceForm.querySelector('#invoiceDueDate');

        // Update due date based on invoice date
        const updateDueDate = () => {
            if (invoiceDateInput.value) {
                const invoiceDate = new Date(invoiceDateInput.value);
                const dueDate = new Date(invoiceDate);
                
                // Set due date to 30 days after invoice date
                dueDate.setDate(dueDate.getDate() + 30);

                // Format due date for input
                const formattedDueDate = dueDate.toISOString().split('T')[0];
                dueDateInput.value = formattedDueDate;
            }
        };

        // Add event listener
        invoiceDateInput.addEventListener('change', updateDueDate);
    }

    // Method to populate invoice form
    populateInvoiceForm(invoice) {
        const safeSetValue = (selector, value) => {
            const element = this.invoiceForm.querySelector(selector);
            if (element) {
                element.value = value;
            }
        };

        // Set form values
        safeSetValue('#invoiceCompany', invoice.companyId);
        safeSetValue('#invoicePlan', invoice.planName);
        safeSetValue('#invoiceAmount', invoice.amount.toFixed(2));
        safeSetValue('#invoiceBillingCycle', invoice.billingCycle);
        
        // Format and set dates
        if (invoice.date) {
            const invoiceDate = new Date(invoice.date);
            safeSetValue('#invoiceDate', invoiceDate.toISOString().split('T')[0]);
        }

        if (invoice.dueDate) {
            const dueDate = new Date(invoice.dueDate);
            safeSetValue('#invoiceDueDate', dueDate.toISOString().split('T')[0]);
        }
    }

    // Method to generate invoice
    async generateInvoice(e) {
        e.preventDefault();

        // Ensure invoice form exists
        this.invoiceForm = document.getElementById('invoiceForm');
        if (!this.invoiceForm) {
            console.error('Invoice form not found');
            return;
        }

        // Validate form
        if (!this.validateForm(this.invoiceForm)) return;

        // Prepare invoice data
        const invoiceData = {
            companyId: this.invoiceForm.querySelector('#invoiceCompany').value,
            plan: this.invoiceForm.querySelector('#invoicePlan').value,
            amount: parseFloat(this.invoiceForm.querySelector('#invoiceAmount').value),
            billingCycle: this.invoiceForm.querySelector('#invoiceBillingCycle').value,
            date: new Date(this.invoiceForm.querySelector('#invoiceDate').value).toISOString(),
            dueDate: new Date(this.invoiceForm.querySelector('#invoiceDueDate').value).toISOString()
        };

        try {
            // Show loading state
            this.showLoadingState(this.invoiceForm);

            // Send API request
            const response = await this.fetchData('invoices', 'POST', invoiceData);

            if (response.success) {
                // Show success message
                this.showSuccessState(
                    this.invoiceForm, 
                    'Invoice generated successfully'
                );

                // Close invoice modal
                this.closeModal(this.invoiceModal);

                // Create audit log
                await this.createAuditLog(
                    'INVOICE_GENERATED', 
                    invoiceData
                );

                // Optionally refresh invoices or update UI
            } else {
                // Show error message
                this.showErrorState(
                    this.invoiceForm, 
                    response.message || 'Failed to generate invoice'
                );
            }
        } catch (error) {
            console.error('Error generating invoice:', error);
            this.showErrorState(
                this.invoiceForm, 
                error.message || 'An unexpected error occurred'
            );
        }
    }

    // Method to open reports modal
    openReportsModal() {
        // Ensure reports modal exists
        if (!this.reportsModal) {
            console.error('Reports modal not found');
            return;
        }

        // Reset report content
        const reportContent = this.reportsModal.querySelector('#reportContent');
        if (reportContent) {
            reportContent.innerHTML = '';
        }

        // Open modal
        this.openModal(this.reportsModal, 'Generate Reports');
    }

    // Method to generate report
    async generateReport(e) {
        e.preventDefault();

        // Ensure reports modal exists
        if (!this.reportsModal) {
            console.error('Reports modal not found');
            return;
        }

        // Get report parameters
        const reportType = this.reportsModal.querySelector('#reportType').value;
        const startDate = this.reportsModal.querySelector('#reportStartDate').value;
        const endDate = this.reportsModal.querySelector('#reportEndDate').value;

        // Validate date range
        if (!startDate || !endDate) {
            this.showErrorNotification('Please select both start and end dates');
            return;
        }

        try {
            // Show loading state in report content area
            const reportContent = this.reportsModal.querySelector('#reportContent');
            this.showLoadingState(reportContent);

            // Fetch report data
            const response = await this.fetchData(
                `reports/${reportType}?startDate=${startDate}&endDate=${endDate}`
            );

            if (response.success) {
                // Display report
                this.displayReport(reportType, response.data, reportContent);

                // Create audit log
                await this.createAuditLog(
                    'REPORT_GENERATED', 
                    { reportType, startDate, endDate }
                );
            } else {
                // Show error message
                this.showErrorState(
                    reportContent, 
                    response.message || 'Failed to generate report'
                );
            }
        } catch (error) {
            console.error('Error generating report:', error);
            const reportContent = this.reportsModal.querySelector('#reportContent');
            this.showErrorState(
                reportContent, 
                error.message || 'An unexpected error occurred'
            );
        }
    }

    // Method to display generated report
    displayReport(reportType, data, container) {
        // Clear previous content
        container.innerHTML = '';

        // Create report table based on report type
        const table = document.createElement('table');
        table.className = 'report-table';

        // Generate table headers and rows based on report type
        switch (reportType) {
            case 'activeSubscribers':
                table.innerHTML = `
                    <thead>
                        <tr>
                            <th>Plan</th>
                            <th>Active Subscribers</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${data.map(item => `
                            <tr>
                                <td>${item.planName}</td>
                                <td>${item.activeSubscribers}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                `;
                break;
            case 'revenueBreakdown':
                table.innerHTML = `
                    <thead>
                        <tr>
                            <th>Plan</th>
                            <th>Revenue</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${data.map(item => `
                            <tr>
                                <td>${item.planName}</td>
                                <td>$${item.revenue.toFixed(2)}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                `;
                break;
            case 'featureUsage':
                table.innerHTML = `
                    <thead>
                        <tr>
                            <th>Feature</th>
                            <th>Usage Count</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${data.map(item => `
                            <tr>
                                <td>${item.featureName}</td>
                                <td>${item.usageCount}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                `;
                break;
            default:
                container.innerHTML = '<p>Unsupported report type</p>';
                return;
        }

        // Append table to container
        container.appendChild(table);
    }

    // Method to export report
    async exportReport(e) {
        e.preventDefault();

        // Get report parameters
        const reportType = this.reportsModal.querySelector('#reportType').value;
        const startDate = this.reportsModal.querySelector('#reportStartDate').value;
        const endDate = this.reportsModal.querySelector('#reportEndDate').value;

        // Validate date range
        if (!startDate || !endDate) {
            this.showErrorNotification('Please select both start and end dates');
            return;
        }

        try {
            // Fetch exported report
            const response = await this.fetchData(
                `reports/${reportType}/export?startDate=${startDate}&endDate=${endDate}`
            );

            if (response.success) {
                // Create and trigger CSV download
                const blob = new Blob([response.data], { type: 'text/csv' });
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `${reportType}_report_${startDate}_to_${endDate}.csv`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                window.URL.revokeObjectURL(url);

                // Create audit log
                await this.createAuditLog(
                    'REPORT_EXPORTED', 
                    { reportType, startDate, endDate }
                );
            } else {
                this.showErrorNotification(response.message || 'Failed to export report');
            }
        } catch (error) {
            console.error('Error exporting report:', error);
            this.showErrorNotification(error.message || 'An unexpected error occurred');
        }
    }

        // Method to open referral discount modal
    openReferralDiscountModal(referralDiscount = null) {
        // Ensure referral discount form exists
        this.referralDiscountForm = document.getElementById('referralDiscountForm');
        if (!this.referralDiscountForm) {
            console.error('Referral discount form not found');
            return;
        }

        // Reset form
        this.referralDiscountForm.reset();

        // Populate form if editing existing referral discount
        if (referralDiscount) {
            this.populateReferralDiscountForm(referralDiscount);
            
            // Store referral discount ID for update
            this.referralDiscountForm.dataset.referralDiscountId = referralDiscount._id;
            
            // Open modal with edit title
            this.openModal(this.referralDiscountModal, 'Edit Referral Discount');
        } else {
            // Clear referral discount ID for new discount
            this.referralDiscountForm.dataset.referralDiscountId = '';
            
            // Open modal with create title
            this.openModal(this.referralDiscountModal, 'Create Referral Discount');
        }
    }

    // Method to populate referral discount form
    populateReferralDiscountForm(referralDiscount) {
        const safeSetValue = (selector, value) => {
            const element = this.referralDiscountForm.querySelector(selector);
            if (element) {
                element.value = value;
            }
        };

        // Set form values
        safeSetValue('#referralCode', referralDiscount.code);
        safeSetValue('#referralDiscountType', referralDiscount.type);
        safeSetValue('#referralDiscountValue', referralDiscount.value);
        
        // Format and set expiry date
        if (referralDiscount.expiryDate) {
            const expiryDate = new Date(referralDiscount.expiryDate);
            safeSetValue('#referralExpiry', expiryDate.toISOString().split('T')[0]);
        }

        safeSetValue('#referralUsageLimit', referralDiscount.usageLimit);
    }

    // Method to save referral discount
    async saveReferralDiscount(e) {
        e.preventDefault();

        // Ensure referral discount form exists
        this.referralDiscountForm = document.getElementById('referralDiscountForm');
        if (!this.referralDiscountForm) {
            console.error('Referral discount form not found');
            return;
        }

        // Validate form
        if (!this.validateForm(this.referralDiscountForm)) return;

        // Prepare referral discount data
        const referralDiscountData = {
            code: this.referralDiscountForm.querySelector('#referralCode').value.trim(),
            type: this.referralDiscountForm.querySelector('#referralDiscountType').value,
            value: parseFloat(this.referralDiscountForm.querySelector('#referralDiscountValue').value),
            expiryDate: new Date(this.referralDiscountForm.querySelector('#referralExpiry').value).toISOString(),
            usageLimit: parseInt(this.referralDiscountForm.querySelector('#referralUsageLimit').value) || 0
        };

        // Determine if creating or updating
        const referralDiscountId = this.referralDiscountForm.dataset.referralDiscountId;
        const method = referralDiscountId ? 'PUT' : 'POST';
        const endpoint = referralDiscountId ? `referral-discounts/${referralDiscountId}` : 'referral-discounts';

        try {
            // Show loading state
            this.showLoadingState(this.referralDiscountForm);

            // Send API request
            const response = await this.fetchData(endpoint, method, referralDiscountData);

            if (response.success) {
                // Show success message
                this.showSuccessState(
                    this.referralDiscountForm, 
                    `Referral discount ${referralDiscountId ? 'updated' : 'created'} successfully`
                );

                // Close referral discount modal
                this.closeModal(this.referralDiscountModal);

                // Create audit log
                await this.createAuditLog(
                    referralDiscountId ? 'REFERRAL_DISCOUNT_UPDATED' : 'REFERRAL_DISCOUNT_CREATED', 
                    referralDiscountData
                );

                // Optionally refresh referral discounts or update UI
            } else {
                // Show error message
                this.showErrorState(
                    this.referralDiscountForm, 
                    response.message || 'Failed to save referral discount'
                );
            }
        } catch (error) {
            console.error('Error saving referral discount:', error);
            this.showErrorState(
                this.referralDiscountForm, 
                error.message || 'An unexpected error occurred'
            );
        }
    }

    // Method to open subscription logs modal
    openSubscriptionLogsModal() {
        // Ensure subscription logs modal exists
        if (!this.subscriptionLogsModal) {
            console.error('Subscription logs modal not found');
            return;
        }

        // Reset logs content
        const logsContent = this.subscriptionLogsModal.querySelector('#subscriptionLogsContent');
        if (logsContent) {
            logsContent.innerHTML = '';
        }

        // Load subscription logs
        this.loadSubscriptionLogs();

        // Open modal
        this.openModal(this.subscriptionLogsModal, 'Subscription Logs');
    }

    // Method to load subscription logs
    async loadSubscriptionLogs() {
        try {
            // Ensure logs content container exists
            const logsContent = this.subscriptionLogsModal.querySelector('#subscriptionLogsContent');
            if (!logsContent) {
                console.error('Subscription logs content container not found');
                return;
            }

            // Show loading state
            this.showLoadingState(logsContent);

            // Fetch subscription logs
            const response = await this.fetchData('subscription-logs');

            if (response.success && Array.isArray(response.data)) {
                // Create logs table
                const table = document.createElement('table');
                table.className = 'subscription-logs-table';
                table.innerHTML = `
                    <thead>
                        <tr>
                            <th>Timestamp</th>
                            <th>Action</th>
                            <th>Details</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${response.data.map(log => `
                            <tr>
                                <td>${new Date(log.timestamp).toLocaleString()}</td>
                                <td>${log.action}</td>
                                <td>${JSON.stringify(log.details)}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                `;

                // Clear loading state and append table
                logsContent.innerHTML = '';
                logsContent.appendChild(table);
            } else {
                // Show error message
                this.showErrorState(
                    logsContent, 
                    response.message || 'No subscription logs found'
                );
            }
        } catch (error) {
            console.error('Error loading subscription logs:', error);
            const logsContent = this.subscriptionLogsModal.querySelector('#subscriptionLogsContent');
            this.showErrorState(
                logsContent, 
                error.message || 'An unexpected error occurred'
            );
        }
    }

    // Method to open data retention policies modal
    openDataRetentionModal(policy = null) {
        // Ensure data retention form exists
        this.dataRetentionForm = document.getElementById('dataRetentionForm');
        if (!this.dataRetentionForm) {
            console.error('Data retention form not found');
            return;
        }

        // Reset form
        this.dataRetentionForm.reset();

        // Populate form if editing existing policy
        if (policy) {
            this.populateDataRetentionForm(policy);
            
            // Store policy ID for update
            this.dataRetentionForm.dataset.policyId = policy._id;
            
            // Open modal with edit title
            this.openModal(this.dataRetentionModal, 'Edit Data Retention Policy');
        } else {
            // Clear policy ID for new policy
            this.dataRetentionForm.dataset.policyId = '';
            
            // Open modal with create title
            this.openModal(this.dataRetentionModal, 'Create Data Retention Policy');
        }
    }

    // Method to populate data retention form
    populateDataRetentionForm(policy) {
        const safeSetValue = (selector, value) => {
            const element = this.dataRetentionForm.querySelector(selector);
            if (element) {
                element.value = value;
            }
        };

        // Set form values
        safeSetValue('#retentionPeriod', policy.retentionPeriod);
        safeSetValue('#retentionPolicy', policy.policyDescription);
    }

    // Method to save data retention policy
    async saveDataRetention(e) {
        e.preventDefault();

        // Ensure data retention form exists
        this.dataRetentionForm = document.getElementById('dataRetentionForm');
        if (!this.dataRetentionForm) {
            console.error('Data retention form not found');
            return;
        }

        // Validate form
        if (!this.validateForm(this.dataRetentionForm)) return;

        // Prepare data retention policy data
        const policyData = {
            retentionPeriod: parseInt(this.dataRetentionForm.querySelector('#retentionPeriod').value),
            policyDescription: this.dataRetentionForm.querySelector('#retentionPolicy').value.trim()
        };

        // Determine if creating or updating
        const policyId = this.dataRetentionForm.dataset.policyId;
        const method = policyId ? 'PUT' : 'POST';
        const endpoint = policyId ? `data-retention/${policyId}` : 'data-retention';

        try {
            // Show loading state
            this.showLoadingState(this.dataRetentionForm);

            // Send API request
            const response = await this.fetchData(endpoint, method, policyData);

            if (response.success) {
                // Show success message
                this.showSuccessState(
                    this.dataRetentionForm, 
                    `Data retention policy ${policyId ? 'updated' : 'created'} successfully`
                );

                // Close data retention modal
                this.closeModal(this.dataRetentionModal);

                // Create audit log
                await this.createAuditLog(
                    policyId ? 'DATA_RETENTION_POLICY_UPDATED' : 'DATA_RETENTION_POLICY_CREATED', 
                    policyData
                );

                // Optionally refresh data retention policies or update UI
            } else {
                // Show error message
                this.showErrorState(
                    this.dataRetentionForm, 
                    response.message || 'Failed to save data retention policy'
                );
            }
        } catch (error) {
            console.error('Error saving data retention policy:', error);
            this.showErrorState(
                this.dataRetentionForm, 
                error.message || 'An unexpected error occurred'
            );
        }
    }

    // Cleanup method
    cleanup() {
        // Remove event listeners
        // Clear any ongoing processes or timers
        console.log('PricingManager cleanup initiated');
    }
}

// Expose the class to the window object
window.PricingManager = PricingManager;

// Initialize the module
document.addEventListener('DOMContentLoaded', () => {
    try {
        const pricingManager = new PricingManager();
        window.pricingManager = pricingManager;
    } catch (error) {
        console.error('Error initializing PricingManager:', error);
    }
});

})(); 


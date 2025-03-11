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

        // Bind all methods to ensure correct context
        this.bindMethods();

        // Defer DOM element selection
        this.initializeDOMElements();

        // Initialize event listeners with retry mechanism
        this.initializeEventListenersWithRetry();

        // Load initial data
        this.loadInitialData();
    }

    // Method to bind all class methods
    bindMethods() {
        const methodsToBind = [
            'initializeEventListeners',
            'loadPlans',
            'openPlanModal',
            'savePlan',
            'deletePlan',
            'addFeatureToForm',
            'saveFeature',
            'openFeatureModal',
            'openDiscountModal',
            'saveDiscount',
            'deleteDiscount',
            'openSubscriptionModal',
            'saveSubscription',
            'openPaymentMethodModal',
            'savePaymentMethod',
            'generateInvoice',
            'openInvoiceModal',
            'generateReport',
            'exportReport',
            'openReportsModal',
            'openReferralDiscountModal',
            'saveReferralDiscount',
            'openSubscriptionLogsModal',
            'loadSubscriptionLogs',
            'openDataRetentionModal',
            'saveDataRetention',
            'fetchData',
            'createAuditLog',
            'showErrorNotification'
        ];

        methodsToBind.forEach(method => {
            if (typeof this[method] === 'function') {
                this[method] = this[method].bind(this);
            } else {
                console.warn(`Method ${method} not found during binding`);
            }
        });
    }

    // Method to safely initialize DOM elements
    initializeDOMElements() {
        // DOM Elements
        this.planList = this.safeGetElement('#planList');
        this.planModal = this.safeGetElement('#planModal');
        this.featureModal = this.safeGetElement('#featureModal');
        this.discountModal = this.safeGetElement('#discountModal');
        this.subscriptionModal = this.safeGetElement('#subscriptionModal');
        this.paymentModal = this.safeGetElement('#paymentModal');
        this.invoiceModal = this.safeGetElement('#invoiceModal');
        this.reportsModal = this.safeGetElement('#reportsModal');
        this.applyDiscountModal = this.safeGetElement('#applyDiscountModal');
        this.referralDiscountModal = this.safeGetElement('#referralDiscountModal');
        this.subscriptionLogsModal = this.safeGetElement('#subscriptionLogsModal');
        this.dataRetentionModal = this.safeGetElement('#dataRetentionModal');

        // Form Elements
        this.planForm = null;
        this.featureForm = null;
        this.discountForm = null;
        this.subscriptionForm = null;
        this.paymentForm = null;
        this.invoiceForm = null;
        this.applyDiscountForm = null;
        this.referralDiscountForm = null;
        this.dataRetentionForm = null;

        // Buttons and Critical Elements
        this.buttons = {
            createPlan: this.safeGetElement('#createPlanButton'),
            savePlan: this.safeGetElement('#savePlanButton'),
            deletePlan: this.safeGetElement('#deletePlanButton'),
            addFeature: this.safeGetElement('#addFeatureButton'),
            saveFeature: this.safeGetElement('#saveFeatureButton'),
            saveDiscount: this.safeGetElement('#saveDiscountButton'),
            deleteDiscount: this.safeGetElement('#deleteDiscountButton'),
            saveSubscription: this.safeGetElement('#saveSubscriptionButton'),
            savePayment: this.safeGetElement('#savePaymentButton'),
            generateInvoice: this.safeGetElement('#generateInvoiceButton'),
            generateReport: this.safeGetElement('#generateReportButton'),
            exportReport: this.safeGetElement('#exportReportButton'),
            saveReferralDiscount: this.safeGetElement('#saveReferralDiscountButton'),
            saveDataRetention: this.safeGetElement('#saveDataRetentionButton')
        };
    }

    // Safe element retrieval method
    safeGetElement(selector) {
        const element = document.querySelector(selector);
        if (!element) {
            console.warn(`Element not found: ${selector}`);
        }
        return element;
    }

    // Method to load initial data
    loadInitialData() {
        try {
            this.loadPlans();
        } catch (error) {
            console.error('Error loading initial data:', error);
            this.showErrorNotification('Failed to load initial pricing data');
        }
    }

    // Robust event listener initialization with retry
    initializeEventListenersWithRetry(maxAttempts = 10) {
        let attempts = 0;
        
        const tryInitialize = () => {
            attempts++;
            
            try {
                this.initializeEventListeners();
                console.log('Event listeners initialized successfully');
            } catch (error) {
                console.warn(`Event listener initialization failed. Retrying (${attempts}/${maxAttempts})...`, error);
                
                if (attempts < maxAttempts) {
                    setTimeout(tryInitialize, 500);
                } else {
                    console.error('Failed to initialize event listeners after multiple attempts', error);
                    this.showErrorNotification('Failed to load pricing module. Please refresh the page.');
                }
            }
        };

        tryInitialize();
    }

    // Comprehensive event listener initialization
    initializeEventListeners() {
        // Validate and attach event listeners
        Object.entries(this.buttons).forEach(([key, button]) => {
            if (button) {
                const methodName = this.getMethodForButton(key);
                if (methodName && typeof this[methodName] === 'function') {
                    button.removeEventListener('click', this[methodName]);
                    button.addEventListener('click', this[methodName]);
                }
            }
        });

        // Additional event listeners for dynamic content
        if (this.planList) {
            this.planList.addEventListener('click', this.handlePlanListClick);
        }
    }

    // Map button names to method names
    getMethodForButton(buttonKey) {
        const buttonMethodMap = {
            createPlan: 'openPlanModal',
            savePlan: 'savePlan',
            deletePlan: 'deletePlan',
            addFeature: 'addFeatureToForm',
            saveFeature: 'saveFeature',
            saveDiscount: 'saveDiscount',
            deleteDiscount: 'deleteDiscount',
            saveSubscription: 'saveSubscription',
            savePayment: 'savePaymentMethod',
            generateInvoice: 'generateInvoice',
            generateReport: 'generateReport',
            exportReport: 'exportReport',
            saveReferralDiscount: 'saveReferralDiscount',
            saveDataRetention: 'saveDataRetention'
        };

        return buttonMethodMap[buttonKey];
    }

    // Error notification method
    showErrorNotification(message) {
        if (window.dashboardApp && window.dashboardApp.userInterface) {
            window.dashboardApp.userInterface.showErrorNotification(message);
        } else {
            console.error(message);
            alert(message);
        }
    }
}

// Expose the class to the window object
window.PricingManager = PricingManager;

// Initialize the module
document.addEventListener('DOMContentLoaded', () => {
    try {
        console.log('Attempting to initialize PricingManager');
        const pricingManager = new PricingManager();
        window.pricingManager = pricingManager;
        console.log('PricingManager initialized successfully');
    } catch (error) {
        console.error('Error initializing PricingManager:', error);
    }
});

})();
// Helper Methods and Data Fetching
PricingManager.prototype.fetchData = async function(endpoint, method = 'GET', body = null) {
    console.log('Fetching data:', { endpoint, method, body });

    const headers = {
        'Authorization': `Bearer ${this.token}`,
        'Content-Type': 'application/json'
    };

    try {
        const url = `${this.baseUrl}/${endpoint}`;
        console.log('Full URL:', url);

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
        console.error('Fetch error details:', {
            message: error.message,
            endpoint: endpoint,
            method: method,
            body: body
        });
        
        // Enhanced error handling
        if (window.dashboardApp && window.dashboardApp.userInterface) {
            window.dashboardApp.userInterface.showErrorNotification(
                error.message || 'An unexpected error occurred during the API call'
            );
        }

        throw error;
    }
};

// Audit Log Creation Method
PricingManager.prototype.createAuditLog = async function(action, details) {
    try {
        await this.fetchData('audit-logs', 'POST', {
            action,
            details: JSON.stringify(details)
        });
    } catch (error) {
        console.error('Error creating audit log:', error);
    }
};

// Form Validation Method
PricingManager.prototype.validateForm = function(form) {
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
};

// Create Form Error Method
PricingManager.prototype.createFormError = function(element, message) {
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
};

// Remove Form Errors Method
PricingManager.prototype.removeFormErrors = function(form) {
    if (!form) {
        console.error('Form for error removal is undefined');
        return;
    }

    const errorElements = form.querySelectorAll('.form-error');
    errorElements.forEach(error => error.remove());
};

// Show Loading State Method
PricingManager.prototype.showLoadingState = function(element) {
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
};

// Show Error State Method
PricingManager.prototype.showErrorState = function(element, message) {
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
};

// Show Success State Method
PricingManager.prototype.showSuccessState = function(element, message) {
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
};

// Safe Value Extraction Method
PricingManager.prototype.safeGetValue = function(input, type = 'string') {
    if (!input) return null;
    
    const value = input.value.trim();
    
    switch(type) {
        case 'number':
            return isNaN(parseFloat(value)) ? null : parseFloat(value);
        case 'integer':
            return isNaN(parseInt(value)) ? null : parseInt(value);
        case 'boolean':
            return input.type === 'checkbox' ? input.checked : value.toLowerCase() === 'true';
        default:
            return value;
    }
};
// Plan Management Methods
PricingManager.prototype.loadPlans = async function() {
    try {
        // Ensure planList exists
        if (!this.planList) {
            console.error('Plan list element not found');
            return;
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
};

PricingManager.prototype.createPlanCard = function(plan) {
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
};

PricingManager.prototype.handlePlanListClick = function(e) {
    const target = e.target.closest('button');
    if (!target) return;

    const planCard = target.closest('.plan-card');
    const planId = planCard?.dataset.planId;

    if (!planId) {
        console.error('No plan ID found');
        return;
    }

    // Prevent default behavior and stop propagation
    e.preventDefault();
    e.stopPropagation();

    if (target.classList.contains('edit-plan')) {
        // Ensure planId is a string
        this.openPlanModal(String(planId));
    } else if (target.classList.contains('delete-plan')) {
        this.deletePlan(String(planId));
    } else if (target.classList.contains('view-subscriptions')) {
        this.viewSubscriptions(String(planId));
    }
};

PricingManager.prototype.openPlanModal = async function(planId = null) {
    // Ensure plan form exists
    this.planForm = document.getElementById('planForm');
    if (!this.planForm) {
        console.error('Plan form not found');
        return;
    }

    // Reset form
    this.planForm.reset();

    try {
        let plan = null;
        if (planId) {
            // Ensure planId is a valid string
            planId = String(planId).trim();
            
            // Fetch plan details if editing
            const response = await this.fetchData(`plans/${planId}`);
            if (response.success) {
                plan = response.data;
            } else {
                throw new Error(response.message || 'Failed to fetch plan details');
            }
        }

        // Populate form
        this.populatePlanForm(plan);

        // Set modal title and visibility of delete button
        const modalTitle = this.planModal.querySelector('.modal-title');
        const deleteButton = this.buttons.deletePlan;

        if (plan) {
            modalTitle.textContent = 'Edit Plan';
            if (deleteButton) deleteButton.style.display = 'inline-block';
            this.planForm.dataset.planId = plan._id;
        } else {
            modalTitle.textContent = 'Create New Plan';
            if (deleteButton) deleteButton.style.display = 'none';
            this.planForm.dataset.planId = '';
        }

        // Open modal
        this.openModal(this.planModal);

        // Populate features
        this.populateFeatureList(plan?.features || []);
    } catch (error) {
        console.error('Error opening plan modal:', error);
        this.showErrorNotification(error.message || 'Failed to open plan modal');
    }
};

PricingManager.prototype.populatePlanForm = function(plan) {
    if (!plan) return;

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
};

PricingManager.prototype.populateFeatureList = function(features) {
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
};

PricingManager.prototype.addFeatureToForm = function(feature = null) {
    const featureList = this.planForm?.querySelector('#featureList');
    if (!featureList) {
        console.error('Feature list container not found');
        return;
    }

    const featureItem = document.createElement('div');
    featureItem.className = 'feature-item form-group';

    const featureInput = document.createElement('input');
    featureInput.type = 'text';
    featureInput.className = 'form-input feature-name';
    featureInput.placeholder = 'Enter feature name';
    featureInput.required = true;

    if (feature && feature.name) {
        featureInput.value = feature.name;
    }

    const removeButton = document.createElement('button');
    removeButton.type = 'button';
    removeButton.className = 'pricing-action-button secondary remove-feature';
    removeButton.innerHTML = '<i class="fas fa-trash"></i> Remove';

    removeButton.addEventListener('click', () => {
        featureItem.remove();
    });

    featureItem.appendChild(featureInput);
    featureItem.appendChild(removeButton);

    featureList.appendChild(featureItem);

    return featureItem;
};

// Plan Saving and Deletion Methods
PricingManager.prototype.savePlan = async function(e) {
    e.preventDefault();

    // Ensure plan form exists
    this.planForm = document.getElementById('planForm');
    if (!this.planForm) {
        console.error('Plan form not found');
        return;
    }

    // Validate form
    if (!this.validateForm(this.planForm)) return;

    // Collect feature data
    const features = Array.from(this.planForm.querySelectorAll('.feature-name'))
        .map(input => ({ 
            name: this.safeGetValue(input) 
        }))
        .filter(feature => feature.name); // Remove empty features

    // Prepare plan data
    const planData = {
        name: this.safeGetValue(this.planForm.querySelector('#planName')),
        description: this.safeGetValue(this.planForm.querySelector('#planDescription')),
        monthlyPrice: this.safeGetValue(this.planForm.querySelector('#monthlyPrice'), 'number'),
        annualPrice: this.safeGetValue(this.planForm.querySelector('#annualPrice'), 'number'),
        trialPeriod: this.safeGetValue(this.planForm.querySelector('#trialPeriod'), 'integer') || 0,
        isActive: this.safeGetValue(this.planForm.querySelector('#isActive'), 'boolean'),
        features: features
    };

    // Validate plan data
    const validationErrors = this.validatePlanData(planData);
    if (validationErrors.length > 0) {
        validationErrors.forEach(error => {
            this.showErrorNotification(error);
        });
        return;
    }

    // Determine if updating or creating
    const planId = this.planForm.dataset.planId;
    const method = planId ? 'PUT' : 'POST';
    const endpoint = planId ? `plans/${planId}` : 'plans';

    try {
        // Show loading state
        this.showLoadingState(this.planForm);

        // Send API request
        const response = await this.fetchData(endpoint, method, planData);
        
        if (response.success) {
            // Show success message
            this.showSuccessState(
                this.planForm, 
                `Plan ${planId ? 'updated' : 'created'} successfully`
            );

            // Close plan modal
            this.closeModal(this.planModal);

            // Reload plans
            await this.loadPlans();

            // Create audit log
            await this.createAuditLog(
                planId ? 'PLAN_UPDATED' : 'PLAN_CREATED', 
                planData
            );
        } else {
            // Show error message
            this.showErrorState(
                this.planForm, 
                response.message || 'Failed to save plan'
            );
        }
    } catch (error) {
        console.error('Error saving plan:', error);
        this.showErrorState(
            this.planForm, 
            error.message || 'An unexpected error occurred'
        );
    }
};

PricingManager.prototype.validatePlanData = function(data) {
    const errors = [];

    // Validate plan name
    if (!data.name || data.name.trim().length < 3) {
        errors.push('Plan name must be at least 3 characters long');
    }

    // Validate description
    if (!data.description || data.description.trim().length < 10) {
        errors.push('Plan description must be at least 10 characters long');
    }

    // Validate monthly price
    if (typeof data.monthlyPrice !== 'number' || data.monthlyPrice < 0) {
        errors.push('Monthly price must be a non-negative number');
    }

    // Validate annual price
    if (typeof data.annualPrice !== 'number' || data.annualPrice < 0) {
        errors.push('Annual price must be a non-negative number');
    }

    // Validate trial period
    if (typeof data.trialPeriod !== 'number' || data.trialPeriod < 0) {
        errors.push('Trial period must be a non-negative number');
    }

    // Validate features
    if (!Array.isArray(data.features) || data.features.length === 0) {
        errors.push('At least one feature is required');
    }

    return errors;
};

PricingManager.prototype.deletePlan = async function(planId) {
    // Confirm deletion
    if (!confirm('Are you sure you want to delete this plan?')) return;

    try {
        // Show loading state on plan list
        this.showLoadingState(this.planList);

        // Send delete request
        const response = await this.fetchData(`plans/${planId}`, 'DELETE');

        if (response.success) {
            // Show success notification
            this.showSuccessState(
                this.planList, 
                'Plan deleted successfully'
            );

            // Reload plans
            await this.loadPlans();

            // Create audit log
            await this.createAuditLog(
                'PLAN_DELETED', 
                { planId }
            );

            // Close plan modal if open
            if (this.planModal.classList.contains('active')) {
                this.closeModal(this.planModal);
            }
        } else {
            // Show error message
            this.showErrorState(
                this.planList, 
                response.message || 'Failed to delete plan'
            );
        }
    } catch (error) {
        console.error('Error deleting plan:', error);
        this.showErrorState(
            this.planList, 
            error.message || 'An unexpected error occurred'
        );
    }
};

PricingManager.prototype.viewSubscriptions = async function(planId) {
    try {
        // Fetch subscriptions for the specific plan
        const response = await this.fetchData(`subscriptions?planId=${planId}`);

        if (response.success) {
            // Open subscription modal with plan subscriptions
            this.openSubscriptionModal(response.data, planId);
        } else {
            this.showErrorNotification(
                response.message || 'Failed to fetch subscriptions'
            );
        }
    } catch (error) {
        console.error('Error viewing subscriptions:', error);
        this.showErrorNotification(
            error.message || 'An unexpected error occurred'
        );
    }
};

// Utility method to close modal
PricingManager.prototype.closeModal = function(modal) {
    if (modal) {
        modal.classList.remove('active');
    }
};

// Utility method to open modal
PricingManager.prototype.openModal = function(modal, title = '') {
    if (!modal) {
        console.error('Modal element is undefined');
        return;
    }

    const modalTitle = modal.querySelector('.modal-title');
    if (modalTitle && title) {
        modalTitle.textContent = title;
    }
    modal.classList.add('active');
};
// Feature Management Methods
PricingManager.prototype.openFeatureModal = function(feature = null) {
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
};

PricingManager.prototype.saveFeature = async function(e) {
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
        name: this.safeGetValue(this.featureForm.querySelector('#featureName')),
        description: this.safeGetValue(this.featureForm.querySelector('#featureDescription')),
        category: this.safeGetValue(this.featureForm.querySelector('#featureCategory'))
    };

    // Validate feature data
    const validationErrors = this.validateFeatureData(featureData);
    if (validationErrors.length > 0) {
        validationErrors.forEach(error => {
            this.showErrorNotification(error);
        });
        return;
    }

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
            this.showSuccessState(
                this.featureForm, 
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
};

PricingManager.prototype.validateFeatureData = function(data) {
    const errors = [];

    // Validate feature name
    if (!data.name || data.name.trim().length < 3) {
        errors.push('Feature name must be at least 3 characters long');
    }

    // Validate description
    if (!data.description || data.description.trim().length < 10) {
        errors.push('Feature description must be at least 10 characters long');
    }

    // Validate category
    if (!data.category || data.category.trim().length < 3) {
        errors.push('Feature category must be at least 3 characters long');
    }

    return errors;
};

PricingManager.prototype.updateFeatureList = async function() {
    try {
        // Fetch updated features from API
        const response = await this.fetchData('features');

        if (response.success && Array.isArray(response.data)) {
            // Update feature selections in various forms or dropdowns
            this.updateFeatureSelections(response.data);
        } else {
            console.error('Failed to fetch features:', response.message);
        }
    } catch (error) {
        console.error('Error updating feature list:', error);
    }
};

PricingManager.prototype.updateFeatureSelections = function(features) {
    // Update feature selections in various contexts
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

    // Update feature category select in feature form
    updateSelect('featureCategory');

   
};

PricingManager.prototype.deleteFeature = async function(featureId) {
    // Confirm deletion
    if (!confirm('Are you sure you want to delete this feature?')) return;

    try {
        // Show loading state
        this.showLoadingState(this.featureModal);

        // Send delete request
        const response = await this.fetchData(`features/${featureId}`, 'DELETE');

        if (response.success) {
            // Show success notification
            this.showSuccessState(
                this.featureModal, 
                'Feature deleted successfully'
            );

            // Close feature modal
            this.closeModal(this.featureModal);

            // Create audit log
            await this.createAuditLog(
                'FEATURE_DELETED', 
                { featureId }
            );

            // Update feature list
            await this.updateFeatureList();
        } else {
            // Show error message
            this.showErrorState(
                this.featureModal, 
                response.message || 'Failed to delete feature'
            );
        }
    } catch (error) {
        console.error('Error deleting feature:', error);
        this.showErrorState(
            this.featureModal, 
            error.message || 'An unexpected error occurred'
        );
    }
};
// Discount Management Methods
PricingManager.prototype.openDiscountModal = async function(discount = null) {
    // Ensure discount form exists
    this.discountForm = document.getElementById('discountForm');
    if (!this.discountForm) {
        console.error('Discount form not found');
        return;
    }

    // Reset form
    this.discountForm.reset();

    try {
        // Populate applicable plans dropdown
        await this.populateDiscountPlans();

        // Populate form if editing existing discount
        if (discount) {
            this.populateDiscountForm(discount);
            
            // Store discount ID for update
            this.discountForm.dataset.discountId = discount._id;
            
            // Show delete button
            if (this.buttons.deleteDiscount) {
                this.buttons.deleteDiscount.style.display = 'inline-block';
            }
            
            // Open modal with edit title
            this.openModal(this.discountModal, 'Edit Discount');
        } else {
            // Clear discount ID for new discount
            this.discountForm.dataset.discountId = '';
            
            // Hide delete button
            if (this.buttons.deleteDiscount) {
                this.buttons.deleteDiscount.style.display = 'none';
            }
            
            // Open modal with create title
            this.openModal(this.discountModal, 'Create New Discount');
        }
    } catch (error) {
        console.error('Error opening discount modal:', error);
        this.showErrorNotification('Failed to open discount modal');
    }
};

PricingManager.prototype.populateDiscountPlans = async function() {
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
        this.showErrorNotification('Failed to load plans');
    }
};

PricingManager.prototype.populateDiscountForm = function(discount) {
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
};

PricingManager.prototype.saveDiscount = async function(e) {
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
        code: this.safeGetValue(this.discountForm.querySelector('#discountCode')),
        type: this.safeGetValue(this.discountForm.querySelector('#discountType')),
        value: this.safeGetValue(this.discountForm.querySelector('#discountValue'), 'number'),
        expiryDate: new Date(this.safeGetValue(this.discountForm.querySelector('#discountExpiry'))).toISOString(),
        usageLimit: this.safeGetValue(this.discountForm.querySelector('#discountUsageLimit'), 'integer') || 0,
        applicablePlans: applicablePlans
    };

    // Validate discount data
    const validationErrors = this.validateDiscountData(discountData);
    if (validationErrors.length > 0) {
        validationErrors.forEach(error => {
            this.showErrorNotification(error);
        });
        return;
    }

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
};

PricingManager.prototype.validateDiscountData = function(data) {
    const errors = [];

    // Validate discount code
    if (!data.code || data.code.trim().length < 3) {
        errors.push('Discount code must be at least 3 characters long');
    }

    // Validate discount type
    if (!['percentage', 'fixed'].includes(data.type)) {
        errors.push('Invalid discount type. Must be "percentage" or "fixed".');
    }

    // Validate discount value
    if (typeof data.value !== 'number' || data.value <= 0) {
        errors.push('Discount value must be a positive number');
    }

    // Validate expiry date
    const expiryDate = new Date(data.expiryDate);
    if (isNaN(expiryDate.getTime()) || expiryDate <= new Date()) {
        errors.push('Invalid or past expiry date');
    }

    // Validate usage limit
    if (typeof data.usageLimit !== 'number' || data.usageLimit < 0) {
        errors.push('Usage limit must be a non-negative number');
    }

    // Validate applicable plans
    if (!Array.isArray(data.applicablePlans) || data.applicablePlans.length === 0) {
        errors.push('At least one applicable plan is required');
    }

    return errors;
};

PricingManager.prototype.deleteDiscount = async function(discountId) {
    // Confirm deletion
    if (!confirm('Are you sure you want to delete this discount?')) return;

    try {
        // Show loading state
        this.showLoadingState(this.discountModal);

        // Send delete request
        const response = await this.fetchData(`discounts/${discountId}`, 'DELETE');

        if (response.success) {
            // Show success notification
            this.showSuccessState(
                this.discountModal, 
                'Discount deleted successfully'
            );

            // Close discount modal
            this.closeModal(this.discountModal);

            // Create audit log
            await this.createAuditLog(
                'DISCOUNT_DELETED', 
                { discountId }
            );
        } else {
            // Show error message
            this.showErrorState(
                this.discountModal, 
                response.message || 'Failed to delete discount'
            );
        }
    } catch (error) {
        console.error('Error deleting discount:', error);
        this.showErrorState(
            this.discountModal, 
            error.message || 'An unexpected error occurred'
        );
    }
};
// Subscription Management Methods
PricingManager.prototype.openSubscriptionModal = async function(subscriptions = [], planId = null) {
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

        // Set modal title
        const modalTitle = this.subscriptionModal.querySelector('.modal-title');
        modalTitle.textContent = planId 
            ? 'Manage Subscriptions for Plan' 
            : 'Create New Subscription';

        // Populate subscriptions table if exists
        const subscriptionList = this.subscriptionModal.querySelector('.modal-content');
        if (subscriptionList && subscriptions.length > 0) {
            subscriptionList.innerHTML = this.createSubscriptionsTable(subscriptions);
        }

        // If a specific plan is selected, pre-select it
        if (planId) {
            const planSelect = this.subscriptionForm.querySelector('#newPlan');
            if (planSelect) {
                planSelect.value = planId;
                planSelect.disabled = true;
            }
        }

        // Open modal
        this.openModal(this.subscriptionModal);

        // Set up date-related functionality
        this.setupSubscriptionDateHandlers();
    } catch (error) {
        console.error('Error opening subscription modal:', error);
        this.showErrorNotification('Failed to open subscription modal');
    }
};

PricingManager.prototype.createSubscriptionsTable = function(subscriptions) {
    return `
        <table class="subscription-table">
            <thead>
                <tr>
                    <th>Company</th>
                    <th>Plan</th>
                    <th>Status</th>
                    <th>Start Date</th>
                    <th>End Date</th>
                    <th>Actions</th>
                </tr>
            </thead>
            <tbody>
                ${subscriptions.map(subscription => `
                    <tr data-subscription-id="${subscription._id}">
                        <td>${subscription.companyName || 'N/A'}</td>
                        <td>${subscription.planName || 'N/A'}</td>
                        <td>${subscription.status || 'N/A'}</td>
                        <td>${new Date(subscription.startDate).toLocaleDateString()}</td>
                        <td>${new Date(subscription.endDate).toLocaleDateString()}</td>
                        <td>
                            <button class="modal-button secondary edit-subscription">Edit</button>
                            <button class="modal-button secondary view-invoices">Invoices</button>
                        </td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `;
};

PricingManager.prototype.populateSubscriptionCompanies = async function() {
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
};

PricingManager.prototype.populateSubscriptionPlans = async function() {
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
};

PricingManager.prototype.setupSubscriptionDateHandlers = function() {
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
};

PricingManager.prototype.saveSubscription = async function(e) {
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
        companyId: this.safeGetValue(this.subscriptionForm.querySelector('#companyName')),
        planId: this.safeGetValue(this.subscriptionForm.querySelector('#newPlan')),
        billingCycle: this.safeGetValue(this.subscriptionForm.querySelector('#billingCycle')),
        startDate: new Date(this.safeGetValue(this.subscriptionForm.querySelector('#startDate'))).toISOString(),
        endDate: new Date(this.safeGetValue(this.subscriptionForm.querySelector('#endDate'))).toISOString(),
        discountCode: this.safeGetValue(this.subscriptionForm.querySelector('#discountCode')) || null
    };

    // Validate subscription data
    const validationErrors = this.validateSubscriptionData(subscriptionData);
    if (validationErrors.length > 0) {
        validationErrors.forEach(error => {
            this.showErrorNotification(error);
        });
        return;
    }

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
};

PricingManager.prototype.validateSubscriptionData = function(data) {
    const errors = [];

    // Validate company ID
    if (!data.companyId) {
        errors.push('Company is required');
    }

    // Validate plan ID
    if (!data.planId) {
        errors.push('Plan is required');
    }

    // Validate billing cycle
    if (!['monthly', 'annual'].includes(data.billingCycle)) {
        errors.push('Invalid billing cycle');
    }

    // Validate start date
    const startDate = new Date(data.startDate);
    if (isNaN(startDate.getTime())) {
        errors.push('Invalid start date');
    }

    // Validate end date
    const endDate = new Date(data.endDate);
    if (isNaN(endDate.getTime()) || endDate <= startDate) {
        errors.push('Invalid end date');
    }

    return errors;
};
// Payment Method Management Methods
PricingManager.prototype.openPaymentMethodModal = function(paymentMethod = null) {
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
};

PricingManager.prototype.updatePaymentMethodDetails = function() {
    const paymentMethodSelect = this.paymentForm.querySelector('#paymentMethod');
    const paymentDetailsContainer = this.paymentForm.querySelector('#paymentDetails');

    // Clear existing details
    paymentDetailsContainer.innerHTML = '';

    // Dynamically create input fields based on payment method
    switch (paymentMethodSelect.value) {
        case 'creditCard':
            paymentDetailsContainer.innerHTML = this.createCreditCardFields();
            break;
        case 'bankTransfer':
            paymentDetailsContainer.innerHTML = this.createBankTransferFields();
            break;
        case 'paypal':
            paymentDetailsContainer.innerHTML = this.createPayPalFields();
            break;
        case 'razorpay':
            paymentDetailsContainer.innerHTML = this.createRazorpayFields();
            break;
        default:
            paymentDetailsContainer.innerHTML = '<p>Select a payment method to view details.</p>';
    }
};

PricingManager.prototype.createCreditCardFields = function() {
    return `
        <div class="form-group">
            <label for="cardNumber" class="form-label">Card Number</label>
            <input type="text" id="cardNumber" name="cardNumber" class="form-input" 
                   required pattern="[0-9]{16}" placeholder="16-digit card number">
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
};

PricingManager.prototype.createBankTransferFields = function() {
    return `
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
};

PricingManager.prototype.createPayPalFields = function() {
    return `
        <div class="form-group">
            <label for="paypalEmail" class="form-label">PayPal Email</label>
            <input type="email" id="paypalEmail" name="paypalEmail" class="form-input" required>
        </div>
    `;
};

PricingManager.prototype.createRazorpayFields = function() {
    return `
        <div class="form-group">
            <label for="razorpayId" class="form-label">Razorpay Merchant ID</label>
            <input type="text" id="razorpayId" name="razorpayId" class="form-input" required>
        </div>
    `;
};

PricingManager.prototype.populatePaymentMethodForm = function(paymentMethod) {
    const paymentMethodSelect = this.paymentForm.querySelector('#paymentMethod');
    paymentMethodSelect.value = paymentMethod.type;

    // Trigger details update
    this.updatePaymentMethodDetails();

    // Populate specific details based on payment method type
    switch (paymentMethod.type) {
        case 'creditCard':
            this.safeSetPaymentValue('#cardNumber', paymentMethod.details.cardNumber);
            this.safeSetPaymentValue('#cardHolder', paymentMethod.details.cardHolder);
            this.safeSetPaymentValue('#expiryDate', paymentMethod.details.expiryDate);
            this.safeSetPaymentValue('#cvv', paymentMethod.details.cvv);
            break;
        case 'bankTransfer':
            this.safeSetPaymentValue('#bankName', paymentMethod.details.bankName);
            this.safeSetPaymentValue('#accountNumber', paymentMethod.details.accountNumber);
            this.safeSetPaymentValue('#swiftCode', paymentMethod.details.swiftCode);
            break;
        case 'paypal':
            this.safeSetPaymentValue('#paypalEmail', paymentMethod.details.paypalEmail);
            break;
        case 'razorpay':
            this.safeSetPaymentValue('#razorpayId', paymentMethod.details.razorpayId);
            break;
    }
};

PricingManager.prototype.safeSetPaymentValue = function(selector, value) {
    const element = this.paymentForm.querySelector(selector);
    if (element && value !== undefined) {
        element.value = value;
    }
};

PricingManager.prototype.savePaymentMethod = async function(e) {
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
        type: this.safeGetValue(this.paymentForm.querySelector('#paymentMethod')),
        details: this.collectPaymentMethodDetails()
    };

    // Validate payment method data
    const validationErrors = this.validatePaymentMethodData(paymentMethodData);
    if (validationErrors.length > 0) {
        validationErrors.forEach(error => {
            this.showErrorNotification(error);
        });
        return;
    }

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
};

PricingManager.prototype.collectPaymentMethodDetails = function() {
    const paymentMethodType = this.paymentForm.querySelector('#paymentMethod').value;
    const details = {};

    switch (paymentMethodType) {
        case 'creditCard':
            details.cardNumber = this.safeGetValue(this.paymentForm.querySelector('#cardNumber'));
            details.cardHolder = this.safeGetValue(this.paymentForm.querySelector('#cardHolder'));
            details.expiryDate = this.safeGetValue(this.paymentForm.querySelector('#expiryDate'));
            details.cvv = this.safeGetValue(this.paymentForm.querySelector('#cvv'));
            break;
        case 'bankTransfer':
            details.bankName = this.safeGetValue(this.paymentForm.querySelector('#bankName'));
            details.accountNumber = this.safeGetValue(this.paymentForm.querySelector('#accountNumber'));
            details.swiftCode = this.safeGetValue(this.paymentForm.querySelector('#swiftCode'));
            break;
        case 'paypal':
            details.paypalEmail = this.safeGetValue(this.paymentForm.querySelector('#paypalEmail'));
            break;
        case 'razorpay':
            details.razorpayId = this.safeGetValue(this.paymentForm.querySelector('#razorpayId'));
            break;
    }

    return details;
};

PricingManager.prototype.validatePaymentMethodData = function(data) {
    const errors = [];

    // Validate payment method type
    const validTypes = ['creditCard', 'bankTransfer', 'paypal', 'razorpay'];
    if (!validTypes.includes(data.type)) {
        errors.push('Invalid payment method type');
    }

    // Validate details based on payment method type
    switch (data.type) {
        case 'creditCard':
            if (!data.details.cardNumber || !/^\d{16}$/.test(data.details.cardNumber)) {
                errors.push('Invalid credit card number');
            }
            if (!data.details.cardHolder) {
                errors.push('Card holder name is required');
            }
            if (!data.details.expiryDate || !/^(0[1-9]|1[0-2])\/\d{2}$/.test(data.details.expiryDate)) {
                errors.push('Invalid expiry date format');
            }
            if (!data.details.cvv || !/^\d{3,4}$/.test(data.details.cvv)) {
                errors.push('Invalid CVV');
            }
            break;
        case 'bankTransfer':
            if (!data.details.bankName) {
                errors.push('Bank name is required');
            }
            if (!data.details.accountNumber || !/^\d{10,18}$/.test(data.details.accountNumber)) {
                errors.push('Invalid account number');
            }
            if (!data.details.swiftCode || !/^[A-Z]{6}[A-Z2-9][A-NP-Z0-9]([A-Z0-9]{3})?$/.test(data.details.swiftCode)) {
                errors.push('Invalid SWIFT/BIC code');
            }
            break;
        case 'paypal':
            if (!data.details.paypalEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.details.paypalEmail)) {
                errors.push('Invalid PayPal email');
            }
            break;
        case 'razorpay':
            if (!data.details.razorpayId) {
                errors.push('Razorpay Merchant ID is required');
            }
            break;
    }

    return errors;
};
// Invoice Management Methods
PricingManager.prototype.openInvoiceModal = async function(invoice = null) {
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
};

PricingManager.prototype.populateInvoiceCompanies = async function() {
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
};

PricingManager.prototype.setupInvoiceDateHandlers = function() {
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
};

PricingManager.prototype.populateInvoiceForm = function(invoice) {
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
};

PricingManager.prototype.generateInvoice = async function(e) {
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
        companyId: this.safeGetValue(this.invoiceForm.querySelector('#invoiceCompany')),
        plan: this.safeGetValue(this.invoiceForm.querySelector('#invoicePlan')),
        amount: this.safeGetValue(this.invoiceForm.querySelector('#invoiceAmount'), 'number'),
        billingCycle: this.safeGetValue(this.invoiceForm.querySelector('#invoiceBillingCycle')),
        date: new Date(this.safeGetValue(this.invoiceForm.querySelector('#invoiceDate'))).toISOString(),
        dueDate: new Date(this.safeGetValue(this.invoiceForm.querySelector('#invoiceDueDate'))).toISOString()
    };

    // Validate invoice data
    const validationErrors = this.validateInvoiceData(invoiceData);
    if (validationErrors.length > 0) {
        validationErrors.forEach(error => {
            this.showErrorNotification(error);
        });
        return;
    }

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
};

PricingManager.prototype.validateInvoiceData = function(data) {
    const errors = [];

    // Validate company ID
    if (!data.companyId) {
        errors.push('Company is required');
    }

    // Validate plan
    if (!data.plan) {
        errors.push('Plan is required');
    }

    // Validate amount
    if (typeof data.amount !== 'number' || data.amount <= 0) {
        errors.push('Invalid invoice amount');
    }

    // Validate billing cycle
    if (!['monthly', 'annual'].includes(data.billingCycle)) {
        errors.push('Invalid billing cycle');
    }

    // Validate invoice date
    const invoiceDate = new Date(data.date);
    if (isNaN(invoiceDate.getTime())) {
        errors.push('Invalid invoice date');
    }

    // Validate due date
    const dueDate = new Date(data.dueDate);
    if (isNaN(dueDate.getTime()) || dueDate <= invoiceDate) {
        errors.push('Invalid due date');
    }

    return errors;
};

PricingManager.prototype.downloadInvoice = async function(invoiceId) {
    try {
        // Show loading state
        this.showLoadingState(this.invoiceModal);

        // Fetch invoice download
        const response = await this.fetchData(`invoices/${invoiceId}/download`);

        if (response.success) {
            // Create and trigger download
            const blob = new Blob([JSON.stringify(response.data)], { type: 'application/json' });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `invoice_${invoiceId}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);

            // Create audit log
            await this.createAuditLog(
                'INVOICE_DOWNLOADED', 
                { invoiceId }
            );
        } else {
            // Show error message
            this.showErrorNotification(
                response.message || 'Failed to download invoice'
            );
        }
    } catch (error) {
        console.error('Error downloading invoice:', error);
        this.showErrorNotification(
            error.message || 'An unexpected error occurred'
        );
    }
};

// Reporting and Analytics Methods
PricingManager.prototype.openReportsModal = function() {
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

    // Reset date inputs
    const startDateInput = this.reportsModal.querySelector('#reportStartDate');
    const endDateInput = this.reportsModal.querySelector('#reportEndDate');
    
    if (startDateInput && endDateInput) {
        // Set default date range (last 30 days)
        const endDate = new Date();
        const startDate = new Date();
        startDate.setDate(endDate.getDate() - 30);
        
        startDateInput.value = startDate.toISOString().split('T')[0];
        endDateInput.value = endDate.toISOString().split('T')[0];
    }

    // Open modal
    this.openModal(this.reportsModal, 'Generate Reports');
};

PricingManager.prototype.generateReport = async function(e) {
    e.preventDefault();

    // Ensure reports modal exists
    if (!this.reportsModal) {
        console.error('Reports modal not found');
        return;
    }

    // Get report parameters
    const reportTypeSelect = this.reportsModal.querySelector('#reportType');
    const startDateInput = this.reportsModal.querySelector('#reportStartDate');
    const endDateInput = this.reportsModal.querySelector('#reportEndDate');
    const reportContent = this.reportsModal.querySelector('#reportContent');

    const reportType = reportTypeSelect.value;
    const startDate = startDateInput.value;
    const endDate = endDateInput.value;

    // Validate date range
    if (!startDate || !endDate) {
        this.showErrorNotification('Please select both start and end dates');
        return;
    }

    try {
        // Show loading state in report content area
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
        this.showErrorState(
            reportContent, 
            error.message || 'An unexpected error occurred'
        );
    }
};

PricingManager.prototype.displayReport = function(reportType, data, container) {
    // Clear previous content
    container.innerHTML = '';

    // Create report table based on report type
    const table = document.createElement('table');
    table.className = 'report-table';

    // Generate table headers and rows based on report type
    switch (reportType) {
        case 'activeSubscribers':
            this.createActiveSubscribersReport(table, data);
            break;
        case 'revenueBreakdown':
            this.createRevenueBreakdownReport(table, data);
            break;
        case 'featureUsage':
            this.createFeatureUsageReport(table, data);
            break;
        default:
            container.innerHTML = '<p>Unsupported report type</p>';
            return;
    }

    // Append table to container
    container.appendChild(table);

    // Add chart visualization
    this.createReportVisualization(reportType, data);
};

PricingManager.prototype.createActiveSubscribersReport = function(table, data) {
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
};

PricingManager.prototype.createRevenueBreakdownReport = function(table, data) {
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
};

PricingManager.prototype.createFeatureUsageReport = function(table, data) {
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
};

PricingManager.prototype.createReportVisualization = function(reportType, data) {
    // Ensure Chart.js is available
    if (typeof Chart === 'undefined') {
        console.warn('Chart.js not loaded. Skipping visualization.');
        return;
    }

    // Create canvas for chart
    const chartContainer = document.createElement('div');
    chartContainer.className = 'chart-container';
    const canvas = document.createElement('canvas');
    canvas.id = 'reportChart';
    chartContainer.appendChild(canvas);

    // Insert chart after the report table
    const reportContent = this.reportsModal.querySelector('#reportContent');
    reportContent.appendChild(chartContainer);

    // Prepare chart data
    const chartData = {
        labels: [],
        values: []
    };

    switch (reportType) {
        case 'activeSubscribers':
            chartData.labels = data.map(item => item.planName);
            chartData.values = data.map(item => item.activeSubscribers);
            break;
        case 'revenueBreakdown':
            chartData.labels = data.map(item => item.planName);
            chartData.values = data.map(item => item.revenue);
            break;
        case 'featureUsage':
            chartData.labels = data.map(item => item.featureName);
            chartData.values = data.map(item => item.usageCount);
            break;
    }

    // Create chart
    new Chart(canvas, {
        type: 'bar',
        data: {
            labels: chartData.labels,
            datasets: [{
                label: reportType === 'activeSubscribers' ? 'Active Subscribers' :
                       reportType === 'revenueBreakdown' ? 'Revenue' : 'Feature Usage',
                data: chartData.values,
                backgroundColor: 'rgba(79, 70, 229, 0.6)',
                borderColor: 'rgba(79, 70, 229, 1)',
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            scales: {
                y: {
                    beginAtZero: true
                }
            }
        }
    });
};

PricingManager.prototype.exportReport = async function(e) {
    e.preventDefault();

    // Get report parameters
    const reportTypeSelect = this.reportsModal.querySelector('#reportType');
    const startDateInput = this.reportsModal.querySelector('#reportStartDate');
    const endDateInput = this.reportsModal.querySelector('#reportEndDate');

    const reportType = reportTypeSelect.value;
    const startDate = startDateInput.value;
    const endDate = endDateInput.value;

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
};

// Referral Discount Management Methods
PricingManager.prototype.openReferralDiscountModal = function(referralDiscount = null) {
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
};

PricingManager.prototype.populateReferralDiscountForm = function(referralDiscount) {
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
};

PricingManager.prototype.saveReferralDiscount = async function(e) {
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
        code: this.safeGetValue(this.referralDiscountForm.querySelector('#referralCode')),
        type: this.safeGetValue(this.referralDiscountForm.querySelector('#referralDiscountType')),
        value: this.safeGetValue(this.referralDiscountForm.querySelector('#referralDiscountValue'), 'number'),
        expiryDate: new Date(this.safeGetValue(this.referralDiscountForm.querySelector('#referralExpiry'))).toISOString(),
        usageLimit: this.safeGetValue(this.referralDiscountForm.querySelector('#referralUsageLimit'), 'integer') || 0
    };

    // Validate referral discount data
    const validationErrors = this.validateReferralDiscountData(referralDiscountData);
    if (validationErrors.length > 0) {
        validationErrors.forEach(error => {
            this.showErrorNotification(error);
        });
        return;
    }

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
};

PricingManager.prototype.validateReferralDiscountData = function(data) {
    const errors = [];

    // Validate referral code
    if (!data.code || data.code.trim().length < 3) {
        errors.push('Referral code must be at least 3 characters long');
    }

    // Validate discount type
    if (!['percentage', 'fixed'].includes(data.type)) {
        errors.push('Invalid discount type. Must be "percentage" or "fixed".');
    }

    // Validate discount value
    if (typeof data.value !== 'number' || data.value <= 0) {
        errors.push('Discount value must be a positive number');
    }

    // Validate expiry date
    const expiryDate = new Date(data.expiryDate);
    if (isNaN(expiryDate.getTime()) || expiryDate <= new Date()) {
        errors.push('Invalid or past expiry date');
    }

    // Validate usage limit
    if (typeof data.usageLimit !== 'number' || data.usageLimit < 0) {
        errors.push('Usage limit must be a non-negative number');
    }

    return errors;
};

// Subscription Logs Management Methods
PricingManager.prototype.openSubscriptionLogsModal = async function() {
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

    try {
        // Show loading state
        this.showLoadingState(logsContent);

        // Fetch subscription logs
        const response = await this.fetchData('subscription-logs');

        if (response.success && Array.isArray(response.data)) {
            // Create logs table
            const table = this.createSubscriptionLogsTable(response.data);
            
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

        // Open modal
        this.openModal(this.subscriptionLogsModal, 'Subscription Logs');
    } catch (error) {
        console.error('Error loading subscription logs:', error);
        this.showErrorState(
            logsContent, 
            error.message || 'An unexpected error occurred'
        );
    }
};

PricingManager.prototype.createSubscriptionLogsTable = function(logs) {
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
            ${logs.map(log => `
                <tr>
                    <td>${new Date(log.timestamp).toLocaleString()}</td>
                    <td>${log.action}</td>
                    <td>${this.formatLogDetails(log.details)}</td>
                </tr>
            `).join('')}
        </tbody>
    `;
    return table;
};

PricingManager.prototype.formatLogDetails = function(details) {
    // Safely convert details to a readable string
    try {
        if (typeof details === 'object') {
            return JSON.stringify(details, null, 2);
        }
        return String(details);
    } catch (error) {
        return 'Unable to parse log details';
    }
};

// Data Retention Policies Management Methods
PricingManager.prototype.openDataRetentionModal = function(policy = null) {
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
};

PricingManager.prototype.populateDataRetentionForm = function(policy) {
    const safeSetValue = (selector, value) => {
        const element = this.dataRetentionForm.querySelector(selector);
        if (element) {
            element.value = value;
        }
    };

    // Set form values
    safeSetValue('#retentionPeriod', policy.retentionPeriod);
    safeSetValue('#retentionPolicy', policy.policyDescription);
};

PricingManager.prototype.saveDataRetention = async function(e) {
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
        retentionPeriod: this.safeGetValue(
            this.dataRetentionForm.querySelector('#retentionPeriod'), 
            'integer'
        ),
        policyDescription: this.safeGetValue(
            this.dataRetentionForm.querySelector('#retentionPolicy')
        )
    };

    // Validate policy data
    const validationErrors = this.validateDataRetentionData(policyData);
    if (validationErrors.length > 0) {
        validationErrors.forEach(error => {
            this.showErrorNotification(error);
        });
        return;
    }

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
};

PricingManager.prototype.validateDataRetentionData = function(data) {
    const errors = [];

    // Validate retention period
    if (typeof data.retentionPeriod !== 'number' || data.retentionPeriod < 0) {
        errors.push('Retention period must be a non-negative number');
    }

    // Validate policy description
    if (!data.policyDescription || data.policyDescription.trim().length < 10) {
        errors.push('Policy description must be at least 10 characters long');
    }

    return errors;
};

// Cleanup and Utility Methods
PricingManager.prototype.cleanup = function() {
    // Remove event listeners
    const removeListeners = (button, method) => {
        if (button) {
            button.removeEventListener('click', method);
        }
    };

    // Remove listeners for critical buttons
    Object.entries(this.buttons).forEach(([key, button]) => {
        const methodName = this.getMethodForButton(key);
        if (methodName && typeof this[methodName] === 'function') {
            removeListeners(button, this[methodName]);
        }
    });

    // Clear any ongoing processes or timers
    console.log('PricingManager cleanup initiated');
};

// Error Handling Utility
PricingManager.prototype.handleGenericError = function(error, context = 'Operation') {
    console.error(`${context} error:`, error);
    
    // Log error to server if possible
    this.createAuditLog('ERROR', {
        context,
        errorMessage: error.message,
        errorStack: error.stack
    });

    // Show user-friendly error notification
    this.showErrorNotification(
        `${context} failed. ${error.message || 'Please try again later.'}`
    );
};

// Expose the class to the window object
window.PricingManager = PricingManager;

// Initialize the module
document.addEventListener('DOMContentLoaded', () => {
    try {
        console.log('Attempting to initialize PricingManager');
        const pricingManager = new PricingManager();
        window.pricingManager = pricingManager;
        console.log('PricingManager initialized successfully');
    } catch (error) {
        console.error('Error initializing PricingManager:', error);
        
        // Fallback error handling
        if (window.dashboardApp && window.dashboardApp.userInterface) {
            window.dashboardApp.userInterface.showErrorNotification(
                'Failed to load pricing module. Please refresh the page.'
            );
        } else {
            alert('Failed to load pricing module. Please refresh the page.');
        }
    }
});

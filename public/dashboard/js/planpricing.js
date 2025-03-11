(function() {
'use strict';

// Check if PricingManager already exists
if (window.PricingManager) {
    console.log('PricingManager already exists');
    return;
}

class PricingManager {
    constructor(baseUrl) {
        this.baseUrl = baseUrl || 'https://18.215.160.136.nip.io/api';
        this.token = localStorage.getItem('token');
        this.bindMethods();
        this.initializeDOMElements();
        this.initializeEventListenersWithRetry();
        this.loadInitialData();
    }

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
            'showErrorNotification',
            'handlePlanListClick',
            'closeModal',
            'openModal',
            'handleGenericError',
            'validateForm',
            'createFormError',
            'removeFormErrors',
            'showLoadingState',
            'showErrorState',
            'showSuccessState',
            'safeGetValue',
            'createPlanCard',
            'populatePlanForm',
            'populateFeatureList',
            'addFeatureToForm',
            'validatePlanData',
            'viewSubscriptions',
            'populateDiscountPlans',
            'populateDiscountForm',
            'saveDiscount',
            'validateDiscountData',
            'deleteDiscount',
            'openSubscriptionModal',
            'createSubscriptionsTable',
            'populateSubscriptionCompanies',
            'populateSubscriptionPlans',
            'setupSubscriptionDateHandlers',
            'saveSubscription',
            'validateSubscriptionData',
            'openPaymentMethodModal',
            'updatePaymentMethodDetails',
            'createCreditCardFields',
            'createBankTransferFields',
            'createPayPalFields',
            'createRazorpayFields',
            'populatePaymentMethodForm',
            'safeSetPaymentValue',
            'savePaymentMethod',
            'collectPaymentMethodDetails',
            'validatePaymentMethodData',
            'openInvoiceModal',
            'populateInvoiceCompanies',
            'setupInvoiceDateHandlers',
            'populateInvoiceForm',
            'generateInvoice',
            'validateInvoiceData',
            'downloadInvoice',
            'openReportsModal',
            'generateReport',
            'displayReport',
            'createActiveSubscribersReport',
            'createRevenueBreakdownReport',
            'createFeatureUsageReport',
            'createReportVisualization',
            'exportReport',
            'openReferralDiscountModal',
            'populateReferralDiscountForm',
            'saveReferralDiscount',
            'validateReferralDiscountData',
            'openSubscriptionLogsModal',
            'createSubscriptionLogsTable',
            'formatLogDetails',
            'openDataRetentionModal',
            'populateDataRetentionForm',
            'saveDataRetention',
            'validateDataRetentionData',
            'cleanup',
            'handleGenericError'
        ];

        methodsToBind.forEach(method => {
            if (typeof this[method] === 'function') {
                this[method] = this[method].bind(this);
            } else {
                console.warn(`Method ${method} not found during binding`);
            }
        });
    }

    initializeDOMElements() {
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

        this.planForm = null;
        this.featureForm = null;
        this.discountForm = null;
        this.subscriptionForm = null;
        this.paymentForm = null;
        this.invoiceForm = null;
        this.applyDiscountForm = null;
        this.referralDiscountForm = null;
        this.dataRetentionForm = null;

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

    safeGetElement(selector) {
        const element = document.querySelector(selector);
        if (!element) {
            console.warn(`Element not found: ${selector}`);
        }
        return element;
    }

    loadInitialData() {
        try {
            this.loadPlans();
        } catch (error) {
            console.error('Error loading initial ', error);
            this.showErrorNotification('Failed to load initial pricing data');
        }
    }

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

    initializeEventListeners() {
        Object.entries(this.buttons).forEach(([key, button]) => {
            if (button) {
                const methodName = this.getMethodForButton(key);
                if (methodName && typeof this[methodName] === 'function') {
                    button.removeEventListener('click', this[methodName]);
                    button.addEventListener('click', this[methodName]);
                }
            }
        });

        if (this.planList) {
            this.planList.addEventListener('click', this.handlePlanListClick);
        }
    }

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

    showErrorNotification(message) {
        if (window.dashboardApp && window.dashboardApp.userInterface) {
            window.dashboardApp.userInterface.showErrorNotification(message);
        } else {
            console.error(message);
            alert(message);
        }
    }
}

window.PricingManager = PricingManager;

document.addEventListener('DOMContentLoaded', () => {
    try {
        console.log('Attempting to initialize PricingManager');
        const pricingManager = new PricingManager();
        window.pricingManager = pricingManager;
        console.log('PricingManager initialized successfully');
    } catch (error) {
        console.error('Error initializing PricingManager:', error);
        if (window.dashboardApp && window.dashboardApp.userInterface) {
            window.dashboardApp.userInterface.showErrorNotification(
                'Failed to load pricing module. Please refresh the page.'
            );
        } else {
            alert('Failed to load pricing module. Please refresh the page.');
        }
    }
});

})();
PricingManager.prototype.fetchData = async function(endpoint, method = 'GET', body = null) {
    if (!endpoint || typeof endpoint !== 'string') {
        console.error('Invalid endpoint:', endpoint);
        throw new Error('Invalid API endpoint');
    }

    console.log('Fetching ', { endpoint, method, body });

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

        this.handleGenericError(error, `API call to ${endpoint}`);
        throw error;
    }
};

PricingManager.prototype.createAuditLog = async function(action, details) {
    try {
        await this.fetchData('audit-logs', 'POST', { action, details: JSON.stringify(details) });
    } catch (error) {
        console.error('Error creating audit log:', error);
        this.handleGenericError(error, 'Audit log creation');
    }
};

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

PricingManager.prototype.createFormError = function(element, message) {
    if (!element) {
        console.error('Element for form error is undefined');
        return;
    }

    const existingError = element.parentNode.querySelector('.form-error');
    if (existingError) {
        existingError.remove();
    }

    const errorElement = document.createElement('div');
    errorElement.className = 'form-error';
    errorElement.textContent = message;
    element.parentNode.insertBefore(errorElement, element.nextSibling);
};

PricingManager.prototype.removeFormErrors = function(form) {
    if (!form) {
        console.error('Form for error removal is undefined');
        return;
    }

    const errorElements = form.querySelectorAll('.form-error');
    errorElements.forEach(error => error.remove());
};

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

PricingManager.prototype.loadPlans = async function() {
    try {
        if (!this.planList) {
            console.error('Plan list element not found');
            return;
        }

        this.showLoadingState(this.planList);

        const response = await this.fetchData('plans');

        if (response.success && Array.isArray(response.data)) {
            this.planList.innerHTML = '';
            response.data.forEach(plan => {
                const planCard = this.createPlanCard(plan);
                this.planList.appendChild(planCard);
            });
        } else {
            this.showErrorState(this.planList, response.message || 'Failed to load plans');
        }
    } catch (error) {
        console.error('Error loading plans:', error);
        this.showErrorState(this.planList, error.message || 'An unexpected error occurred while loading plans');
    }
};

PricingManager.prototype.createPlanCard = function(plan) {
    if (!plan || !plan._id) {
        console.error('Invalid plan object', plan);
        return document.createElement('div');
    }

    const planCard = document.createElement('div');
    planCard.className = 'plan-card';
    planCard.dataset.planId = plan._id;

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

    e.preventDefault();
    e.stopPropagation();

    const planCard = target.closest('.plan-card');
    const planId = planCard?.dataset.planId;

    if (target.id === 'createPlanButton') {
        this.openPlanModal();
    } else if (planId && target.classList.contains('edit-plan')) {
        this.openPlanModal(planId);
    } else if (planId && target.classList.contains('delete-plan')) {
        this.deletePlan(planId);
    } else if (planId && target.classList.contains('view-subscriptions')) {
        this.viewSubscriptions(planId);
    }
};

PricingManager.prototype.openPlanModal = async function(planId = null) {
    this.planForm = document.getElementById('planForm');
    if (!this.planForm) {
        console.error('Plan form not found');
        return;
    }

    this.planForm.reset();

    try {
        let plan = null;
        if (planId) {
            const response = await this.fetchData(`plans/${planId}`);
            if (response.success) {
                plan = response.data;
            } else {
                throw new Error(response.message || 'Failed to fetch plan details');
            }
        }

        this.populatePlanForm(plan);

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

        this.openModal(this.planModal);
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

    featureList.innerHTML = '';
    features.forEach(feature => {
        this.addFeatureToForm(feature);
    });
};

PricingManager.prototype.addFeatureToForm = function(feature = null) {
    const featureList = this.planForm.querySelector('#featureList');
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

PricingManager.prototype.savePlan = async function(e) {
    e.preventDefault();

    this.planForm = document.getElementById('planForm');
    if (!this.planForm) {
        console.error('Plan form not found');
        return;
    }

    if (!this.validateForm(this.planForm)) return;

    const features = Array.from(this.planForm.querySelectorAll('.feature-name'))
        .map(input => ({ name: this.safeGetValue(input) }))
        .filter(feature => feature.name);

    const planData = {
        name: this.safeGetValue(this.planForm.querySelector('#planName')),
        description: this.safeGetValue(this.planForm.querySelector('#planDescription')),
        monthlyPrice: this.safeGetValue(this.planForm.querySelector('#monthlyPrice'), 'number'),
        annualPrice: this.safeGetValue(this.planForm.querySelector('#annualPrice'), 'number'),
        trialPeriod: this.safeGetValue(this.planForm.querySelector('#trialPeriod'), 'integer') || 0,
        isActive: this.safeGetValue(this.planForm.querySelector('#isActive'), 'boolean'),
        features: features
    };

    const validationErrors = this.validatePlanData(planData);
    if (validationErrors.length > 0) {
        validationErrors.forEach(error => this.showErrorNotification(error));
        return;
    }

    const planId = this.planForm.dataset.planId;
    const method = planId ? 'PUT' : 'POST';
    const endpoint = planId ? `plans/${planId}` : 'plans';

    try {
        this.showLoadingState(this.planForm);

        const response = await this.fetchData(endpoint, method, planData);

        if (response.success) {
            this.showSuccessState(this.planForm, `Plan ${planId ? 'updated' : 'created'} successfully`);
            this.closeModal(this.planModal);
            await this.loadPlans();
            await this.createAuditLog(planId ? 'PLAN_UPDATED' : 'PLAN_CREATED', planData);
        } else {
            this.showErrorState(this.planForm, response.message || 'Failed to save plan');
        }
    } catch (error) {
        console.error('Error saving plan:', error);
        this.showErrorState(this.planForm, error.message || 'An unexpected error occurred');
    }
};

PricingManager.prototype.validatePlanData = function(data) {
    const errors = [];

    if (!data.name || data.name.trim().length < 3) {
        errors.push('Plan name must be at least 3 characters long');
    }

    if (!data.description || data.description.trim().length < 10) {
        errors.push('Plan description must be at least 10 characters long');
    }

    if (typeof data.monthlyPrice !== 'number' || data.monthlyPrice < 0) {
        errors.push('Monthly price must be a non-negative number');
    }

    if (typeof data.annualPrice !== 'number' || data.annualPrice < 0) {
        errors.push('Annual price must be a non-negative number');
    }

    if (typeof data.trialPeriod !== 'number' || data.trialPeriod < 0) {
        errors.push('Trial period must be a non-negative number');
    }

    if (!Array.isArray(data.features) || data.features.length === 0) {
        errors.push('At least one feature is required');
    }

    return errors;
};

PricingManager.prototype.deletePlan = async function(planId) {
    if (!confirm('Are you sure you want to delete this plan?')) return;

    try {
        this.showLoadingState(this.planList);

        const response = await this.fetchData(`plans/${planId}`, 'DELETE');

        if (response.success) {
            this.showSuccessState(this.planList, 'Plan deleted successfully');
            await this.loadPlans();
            await this.createAuditLog('PLAN_DELETED', { planId });
            if (this.planModal.classList.contains('active')) {
                this.closeModal(this.planModal);
            }
        } else {
            this.showErrorState(this.planList, response.message || 'Failed to delete plan');
        }
    } catch (error) {
        console.error('Error deleting plan:', error);
        this.showErrorState(this.planList, error.message || 'An unexpected error occurred');
    }
};

PricingManager.prototype.viewSubscriptions = async function(planId) {
    try {
        const response = await this.fetchData(`subscriptions?planId=${planId}`);

        if (response.success) {
            this.openSubscriptionModal(response.data, planId);
        } else {
            this.showErrorNotification(response.message || 'Failed to fetch subscriptions');
        }
    } catch (error) {
        console.error('Error viewing subscriptions:', error);
        this.showErrorNotification(error.message || 'An unexpected error occurred');
    }
};

PricingManager.prototype.closeModal = function(modal) {
    if (modal) {
        modal.classList.remove('active');
    }
};

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

PricingManager.prototype.openFeatureModal = function(feature = null) {
    this.featureForm = document.getElementById('featureForm');
    if (!this.featureForm) {
        console.error('Feature form not found');
        return;
    }

    this.featureForm.reset();

    if (feature) {
        this.featureForm.querySelector('#featureName').value = feature.name || '';
        this.featureForm.querySelector('#featureDescription').value = feature.description || '';
        this.featureForm.querySelector('#featureCategory').value = feature.category || '';
        this.featureForm.dataset.featureId = feature._id;
        this.openModal(this.featureModal, 'Edit Feature');
    } else {
        this.featureForm.dataset.featureId = '';
        this.openModal(this.featureModal, 'Create New Feature');
    }
};

PricingManager.prototype.saveFeature = async function(e) {
    e.preventDefault();

    this.featureForm = document.getElementById('featureForm');
    if (!this.featureForm) {
        console.error('Feature form not found');
        return;
    }

    if (!this.validateForm(this.featureForm)) return;

    const featureData = {
        name: this.safeGetValue(this.featureForm.querySelector('#featureName')),
        description: this.safeGetValue(this.featureForm.querySelector('#featureDescription')),
        category: this.safeGetValue(this.featureForm.querySelector('#featureCategory'))
    };

    const validationErrors = this.validateFeatureData(featureData);
    if (validationErrors.length > 0) {
        validationErrors.forEach(error => this.showErrorNotification(error));
        return;
    }

    const featureId = this.featureForm.dataset.featureId;
    const method = featureId ? 'PUT' : 'POST';
    const endpoint = featureId ? `features/${featureId}` : 'features';

    try {
        this.showLoadingState(this.featureForm);

        const response = await this.fetchData(endpoint, method, featureData);

        if (response.success) {
            this.showSuccessState(this.featureForm, `Feature ${featureId ? 'updated' : 'created'} successfully`);
            this.closeModal(this.featureModal);
            await this.createAuditLog(featureId ? 'FEATURE_UPDATED' : 'FEATURE_CREATED', featureData);
            this.updateFeatureList();
        } else {
            this.showErrorState(this.featureForm, response.message || 'Failed to save feature');
        }
    } catch (error) {
        console.error('Error saving feature:', error);
        this.showErrorState(this.featureForm, error.message || 'An unexpected error occurred');
    }
};

PricingManager.prototype.validateFeatureData = function(data) {
    const errors = [];

    if (!data.name || data.name.trim().length < 3) {
        errors.push('Feature name must be at least 3 characters long');
    }

    if (!data.description || data.description.trim().length < 10) {
        errors.push('Feature description must be at least 10 characters long');
    }

    if (!data.category || data.category.trim().length < 3) {
        errors.push('Feature category must be at least 3 characters long');
    }

    return errors;
};

PricingManager.prototype.updateFeatureList = async function() {
    try {
        const response = await this.fetchData('features');

        if (response.success && Array.isArray(response.data)) {
            this.updateFeatureSelections(response.data);
        } else {
            console.error('Failed to fetch features:', response.message);
        }
    } catch (error) {
        console.error('Error updating feature list:', error);
        this.handleGenericError(error, 'Updating feature list');
    }
};

PricingManager.prototype.updateFeatureSelections = function(features) {
    const updateSelect = (selectId) => {
        const select = document.getElementById(selectId);
        if (select) {
            select.innerHTML = '';
            features.forEach(feature => {
                const option = document.createElement('option');
                option.value = feature._id;
                option.textContent = feature.name;
                select.appendChild(option);
            });
        }
    };

    updateSelect('featureCategory');
};

PricingManager.prototype.deleteFeature = async function(featureId) {
    if (!confirm('Are you sure you want to delete this feature?')) return;

    try {
        this.showLoadingState(this.featureModal);

        const response = await this.fetchData(`features/${featureId}`, 'DELETE');

        if (response.success) {
            this.showSuccessState(this.featureModal, 'Feature deleted successfully');
            this.closeModal(this.featureModal);
            await this.createAuditLog('FEATURE_DELETED', { featureId });
            await this.updateFeatureList();
        } else {
            this.showErrorState(this.featureModal, response.message || 'Failed to delete feature');
        }
    } catch (error) {
        console.error('Error deleting feature:', error);
        this.showErrorState(this.featureModal, error.message || 'An unexpected error occurred');
    }
};

PricingManager.prototype.openDiscountModal = async function(discount = null) {
    this.discountForm = document.getElementById('discountForm');
    if (!this.discountForm) {
        console.error('Discount form not found');
        return;
    }

    this.discountForm.reset();

    try {
        await this.populateDiscountPlans();

        if (discount) {
            this.populateDiscountForm(discount);
            this.discountForm.dataset.discountId = discount._id;
            if (this.buttons.deleteDiscount) {
                this.buttons.deleteDiscount.style.display = 'inline-block';
            }
            this.openModal(this.discountModal, 'Edit Discount');
        } else {
            this.discountForm.dataset.discountId = '';
            if (this.buttons.deleteDiscount) {
                this.buttons.deleteDiscount.style.display = 'none';
            }
            this.openModal(this.discountModal, 'Create New Discount');
        }
    } catch (error) {
        console.error('Error opening discount modal:', error);
        this.showErrorNotification('Failed to open discount modal');
    }
};

PricingManager.prototype.populateDiscountPlans = async function() {
    try {
        const response = await this.fetchData('plans');

        if (response.success && Array.isArray(response.data)) {
            const plansSelect = this.discountForm.querySelector('#discountApplicablePlans');
            plansSelect.innerHTML = '';
            response.data.forEach(plan => {
                const option = document.createElement('option');
                option.value = plan._id;
                option.textContent = plan.name;
                plansSelect.appendChild(option);
            });
        } else {
            console.error('Failed to fetch plans:', response.message);
            this.handleGenericError(new Error(response.message || 'Failed to fetch plans'), 'Populating discount plans');
        }
    } catch (error) {
        console.error('Error populating discount plans:', error);
        this.handleGenericError(error, 'Populating discount plans');
    }
};

PricingManager.prototype.populateDiscountForm = function(discount) {
    const safeSetValue = (selector, value) => {
        const element = this.discountForm.querySelector(selector);
        if (element) {
            element.value = value;
        }
    };

    safeSetValue('#discountCode', discount.code);
    safeSetValue('#discountType', discount.type);
    safeSetValue('#discountValue', discount.value);

    if (discount.expiryDate) {
        const expiryDate = new Date(discount.expiryDate);
        safeSetValue('#discountExpiry', expiryDate.toISOString().split('T')[0]);
    }

    safeSetValue('#discountUsageLimit', discount.usageLimit);

    const applicablePlansSelect = this.discountForm.querySelector('#discountApplicablePlans');
    if (applicablePlansSelect && discount.applicablePlans) {
        Array.from(applicablePlansSelect.options).forEach(option => {
            option.selected = discount.applicablePlans.includes(option.value);
        });
    }
};

PricingManager.prototype.saveDiscount = async function(e) {
    e.preventDefault();

    this.discountForm = document.getElementById('discountForm');
    if (!this.discountForm) {
        console.error('Discount form not found');
        return;
    }

    if (!this.validateForm(this.discountForm)) return;

    const applicablePlans = Array.from(this.discountForm.querySelector('#discountApplicablePlans').selectedOptions).map(option => option.value);

    const discountData = {
        code: this.safeGetValue(this.discountForm.querySelector('#discountCode')),
        type: this.safeGetValue(this.discountForm.querySelector('#discountType')),
        value: this.safeGetValue(this.discountForm.querySelector('#discountValue'), 'number'),
        expiryDate: new Date(this.safeGetValue(this.discountForm.querySelector('#discountExpiry'))).toISOString(),
        usageLimit: this.safeGetValue(this.discountForm.querySelector('#discountUsageLimit'), 'integer') || 0,
        applicablePlans: applicablePlans
    };

    const validationErrors = this.validateDiscountData(discountData);
    if (validationErrors.length > 0) {
        validationErrors.forEach(error => this.showErrorNotification(error));
        return;
    }

    const discountId = this.discountForm.dataset.discountId;
    const method = discountId ? 'PUT' : 'POST';
    const endpoint = discountId ? `discounts/${discountId}` : 'discounts';

    try {
        this.showLoadingState(this.discountForm);

        const response = await this.fetchData(endpoint, method, discountData);

        if (response.success) {
            this.showSuccessState(this.discountForm, `Discount ${discountId ? 'updated' : 'created'} successfully`);
            this.closeModal(this.discountModal);
            await this.createAuditLog(discountId ? 'DISCOUNT_UPDATED' : 'DISCOUNT_CREATED', discountData);
        } else {
            this.showErrorState(this.discountForm, response.message || 'Failed to save discount');
        }
    } catch (error) {
        console.error('Error saving discount:', error);
        this.showErrorState(this.discountForm, error.message || 'An unexpected error occurred');
    }
};

PricingManager.prototype.validateDiscountData = function(data) {
    const errors = [];

    if (!data.code || data.code.trim().length < 3) {
        errors.push('Discount code must be at least 3 characters long');
    }

    if (!['percentage', 'fixed'].includes(data.type)) {
        errors.push('Invalid discount type. Must be "percentage" or "fixed".');
    }

    if (typeof data.value !== 'number' || data.value <= 0) {
        errors.push('Discount value must be a positive number');
    }

    const expiryDate = new Date(data.expiryDate);
    if (isNaN(expiryDate.getTime()) || expiryDate <= new Date()) {
        errors.push('Invalid or past expiry date');
    }

    if (typeof data.usageLimit !== 'number' || data.usageLimit < 0) {
        errors.push('Usage limit must be a non-negative number');
    }

    if (!Array.isArray(data.applicablePlans) || data.applicablePlans.length === 0) {
        errors.push('At least one applicable plan is required');
    }

    return errors;
};

PricingManager.prototype.deleteDiscount = async function(discountId) {
    if (!confirm('Are you sure you want to delete this discount?')) return;

    try {
        this.showLoadingState(this.discountModal);

        const response = await this.fetchData(`discounts/${discountId}`, 'DELETE');

        if (response.success) {
            this.showSuccessState(this.discountModal, 'Discount deleted successfully');
            this.closeModal(this.discountModal);
            await this.createAuditLog('DISCOUNT_DELETED', { discountId });
        } else {
            this.showErrorState(this.discountModal, response.message || 'Failed to delete discount');
        }
    } catch (error) {
        console.error('Error deleting discount:', error);
        this.showErrorState(this.discountModal, error.message || 'An unexpected error occurred');
    }
};

PricingManager.prototype.openSubscriptionModal = async function(subscriptions = [], planId = null) {
    this.subscriptionForm = document.getElementById('subscriptionForm');
    if (!this.subscriptionForm) {
        console.error('Subscription form not found');
        return;
    }

    this.subscriptionForm.reset();

    try {
        await Promise.all([
            this.populateSubscriptionCompanies(),
            this.populateSubscriptionPlans()
        ]);

        const modalTitle = this.subscriptionModal.querySelector('.modal-title');
        modalTitle.textContent = planId ? 'Manage Subscriptions for Plan' : 'Create New Subscription';

        const subscriptionList = this.subscriptionModal.querySelector('.modal-content');
        if (subscriptionList && subscriptions.length > 0) {
            subscriptionList.innerHTML = this.createSubscriptionsTable(subscriptions);
        }

        if (planId) {
            const planSelect = this.subscriptionForm.querySelector('#newPlan');
            if (planSelect) {
                planSelect.value = planId;
                planSelect.disabled = true;
            }
        }

        this.openModal(this.subscriptionModal);
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
        const response = await this.fetchData('companies');

        if (response.success && Array.isArray(response.companies)) {
            const companiesSelect = this.subscriptionForm.querySelector('#companyName');
            companiesSelect.innerHTML = '';
            response.companies.forEach(company => {
                const option = document.createElement('option');
                option.value = company._id;
                option.textContent = company.name;
                companiesSelect.appendChild(option);
            });
        } else {
            console.error('Failed to fetch companies:', response.message);
            this.handleGenericError(new Error(response.message || 'Failed to fetch companies'), 'Populating subscription companies');
        }
    } catch (error) {
        console.error('Error populating subscription companies:', error);
        this.handleGenericError(error, 'Populating subscription companies');
    }
};

PricingManager.prototype.populateSubscriptionPlans = async function() {
    try {
        const response = await this.fetchData('plans');

        if (response.success && Array.isArray(response.data)) {
            const plansSelect = this.subscriptionForm.querySelector('#newPlan');
            plansSelect.innerHTML = '';
            response.data.forEach(plan => {
                const option = document.createElement('option');
                option.value = plan._id;
                option.textContent = plan.name;
                plansSelect.appendChild(option);
            });
        } else {
            console.error('Failed to fetch plans:', response.message);
            this.handleGenericError(new Error(response.message || 'Failed to fetch plans'), 'Populating subscription plans');
        }
    } catch (error) {
        console.error('Error populating subscription plans:', error);
        this.handleGenericError(error, 'Populating subscription plans');
    }
};

PricingManager.prototype.setupSubscriptionDateHandlers = function() {
    const startDateInput = this.subscriptionForm.querySelector('#startDate');
    const endDateInput = this.subscriptionForm.querySelector('#endDate');
    const billingCycleSelect = this.subscriptionForm.querySelector('#billingCycle');

    const updateEndDate = () => {
        if (startDateInput.value) {
            const startDate = new Date(startDateInput.value);
            const billingCycle = billingCycleSelect.value;

            const endDate = new Date(startDate);
            if (billingCycle === 'monthly') {
                endDate.setMonth(endDate.getMonth() + 1);
            } else if (billingCycle === 'annual') {
                endDate.setFullYear(endDate.getFullYear() + 1);
            }

            const formattedEndDate = endDate.toISOString().split('T')[0];
            endDateInput.value = formattedEndDate;
        }
    };

    startDateInput.addEventListener('change', updateEndDate);
    billingCycleSelect.addEventListener('change', updateEndDate);
};

PricingManager.prototype.saveSubscription = async function(e) {
    e.preventDefault();

    this.subscriptionForm = document.getElementById('subscriptionForm');
    if (!this.subscriptionForm) {
        console.error('Subscription form not found');
        return;
    }

    if (!this.validateForm(this.subscriptionForm)) return;

    const subscriptionData = {
        companyId: this.safeGetValue(this.subscriptionForm.querySelector('#companyName')),
        planId: this.safeGetValue(this.subscriptionForm.querySelector('#newPlan')),
        billingCycle: this.safeGetValue(this.subscriptionForm.querySelector('#billingCycle')),
        startDate: new Date(this.safeGetValue(this.subscriptionForm.querySelector('#startDate'))).toISOString(),
        endDate: new Date(this.safeGetValue(this.subscriptionForm.querySelector('#endDate'))).toISOString(),
        discountCode: this.safeGetValue(this.subscriptionForm.querySelector('#discountCode')) || null
    };

    const validationErrors = this.validateSubscriptionData(subscriptionData);
    if (validationErrors.length > 0) {
        validationErrors.forEach(error => this.showErrorNotification(error));
        return;
    }

    const subscriptionId = this.subscriptionForm.dataset.subscriptionId;
    const method = subscriptionId ? 'PUT' : 'POST';
    const endpoint = subscriptionId ? `subscriptions/${subscriptionId}` : 'subscriptions';

    try {
        this.showLoadingState(this.subscriptionForm);

        const response = await this.fetchData(endpoint, method, subscriptionData);

        if (response.success) {
            this.showSuccessState(this.subscriptionForm, `Subscription ${subscriptionId ? 'updated' : 'created'} successfully`);
            this.closeModal(this.subscriptionModal);
            await this.createAuditLog(subscriptionId ? 'SUBSCRIPTION_UPDATED' : 'SUBSCRIPTION_CREATED', subscriptionData);
        } else {
            this.showErrorState(this.subscriptionForm, response.message || 'Failed to save subscription');
        }
    } catch (error) {
        console.error('Error saving subscription:', error);
        this.showErrorState(this.subscriptionForm, error.message || 'An unexpected error occurred');
    }
};

PricingManager.prototype.validateSubscriptionData = function(data) {
    const errors = [];

    if (!data.companyId) {
        errors.push('Company is required');
    }

    if (!data.planId) {
        errors.push('Plan is required');
    }

    if (!['monthly', 'annual'].includes(data.billingCycle)) {
        errors.push('Invalid billing cycle');
    }

    const startDate = new Date(data.startDate);
    if (isNaN(startDate.getTime())) {
        errors.push('Invalid start date');
    }

    const endDate = new Date(data.endDate);
    if (isNaN(endDate.getTime()) || endDate <= startDate) {
        errors.push('Invalid end date');
    }

    return errors;
};

PricingManager.prototype.openPaymentMethodModal = function(paymentMethod = null) {
    this.paymentForm = document.getElementById('paymentForm');
    if (!this.paymentForm) {
        console.error('Payment form not found');
        return;
    }

    this.paymentForm.reset();

    const paymentMethodSelect = this.paymentForm.querySelector('#paymentMethod');
    paymentMethodSelect.addEventListener('change', () => this.updatePaymentMethodDetails());

    if (paymentMethod) {
        this.populatePaymentMethodForm(paymentMethod);
        this.paymentForm.dataset.paymentMethodId = paymentMethod._id;
        this.openModal(this.paymentModal, 'Edit Payment Method');
    } else {
        this.paymentForm.dataset.paymentMethodId = '';
        this.openModal(this.paymentModal, 'Add New Payment Method');
    }

    this.updatePaymentMethodDetails();
};

PricingManager.prototype.updatePaymentMethodDetails = function() {
    const paymentMethodSelect = this.paymentForm.querySelector('#paymentMethod');
    const paymentDetailsContainer = this.paymentForm.querySelector('#paymentDetails');

    paymentDetailsContainer.innerHTML = '';

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

    this.updatePaymentMethodDetails();

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

    this.paymentForm = document.getElementById('paymentForm');
    if (!this.paymentForm) {
        console.error('Payment form not found');
        return;
    }

    if (!this.validateForm(this.paymentForm)) return;

    const paymentMethodData = {
        type: this.safeGetValue(this.paymentForm.querySelector('#paymentMethod')),
        details: this.collectPaymentMethodDetails()
    };

    const validationErrors = this.validatePaymentMethodData(paymentMethodData);
    if (validationErrors.length > 0) {
        validationErrors.forEach(error => this.showErrorNotification(error));
        return;
    }

    const paymentMethodId = this.paymentForm.dataset.paymentMethodId;
    const method = paymentMethodId ? 'PUT' : 'POST';
    const endpoint = paymentMethodId ? `payments/${paymentMethodId}` : 'payments';

    try {
        this.showLoadingState(this.paymentForm);

        const response = await this.fetchData(endpoint, method, paymentMethodData);

        if (response.success) {
            this.showSuccessState(this.paymentForm, `Payment method ${paymentMethodId ? 'updated' : 'added'} successfully`);
            this.closeModal(this.paymentModal);
            await this.createAuditLog(paymentMethodId ? 'PAYMENT_METHOD_UPDATED' : 'PAYMENT_METHOD_CREATED', paymentMethodData);
        } else {
            this.showErrorState(this.paymentForm, response.message || 'Failed to save payment method');
        }
    } catch (error) {
        console.error('Error saving payment method:', error);
        this.showErrorState(this.paymentForm, error.message || 'An unexpected error occurred');
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

    const validTypes = ['creditCard', 'bankTransfer', 'paypal', 'razorpay'];
    if (!validTypes.includes(data.type)) {
        errors.push('Invalid payment method type');
    }

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

PricingManager.prototype.openInvoiceModal = async function(invoice = null) {
    this.invoiceForm = document.getElementById('invoiceForm');
    if (!this.invoiceForm) {
        console.error('Invoice form not found');
        return;
    }

    this.invoiceForm.reset();

    try {
        await this.populateInvoiceCompanies();

        if (invoice) {
            this.populateInvoiceForm(invoice);
            this.invoiceForm.dataset.invoiceId = invoice._id;
            this.openModal(this.invoiceModal, 'Edit Invoice');
        } else {
            this.invoiceForm.dataset.invoiceId = '';
            this.openModal(this.invoiceModal, 'Generate New Invoice');
        }

        this.setupInvoiceDateHandlers();
    } catch (error) {
        console.error('Error opening invoice modal:', error);
        this.showErrorNotification('Failed to open invoice modal');
    }
};

PricingManager.prototype.populateInvoiceCompanies = async function() {
    try {
        const response = await this.fetchData('companies');

        if (response.success && Array.isArray(response.companies)) {
            const companiesSelect = this.invoiceForm.querySelector('#invoiceCompany');
            companiesSelect.innerHTML = '';
            response.companies.forEach(company => {
                const option = document.createElement('option');
                option.value = company._id;
                option.textContent = company.name;
                companiesSelect.appendChild(option);
            });
        } else {
            console.error('Failed to fetch companies:', response.message);
            this.handleGenericError(new Error(response.message || 'Failed to fetch companies'), 'Populating invoice companies');
        }
    } catch (error) {
        console.error('Error populating invoice companies:', error);
        this.handleGenericError(error, 'Populating invoice companies');
    }
};

PricingManager.prototype.setupInvoiceDateHandlers = function() {
    const invoiceDateInput = this.invoiceForm.querySelector('#invoiceDate');
    const dueDateInput = this.invoiceForm.querySelector('#invoiceDueDate');

    const updateDueDate = () => {
        if (invoiceDateInput.value) {
            const invoiceDate = new Date(invoiceDateInput.value);
            const dueDate = new Date(invoiceDate);
            dueDate.setDate(dueDate.getDate() + 30);
            const formattedDueDate = dueDate.toISOString().split('T')[0];
            dueDateInput.value = formattedDueDate;
        }
    };

    invoiceDateInput.addEventListener('change', updateDueDate);
};

PricingManager.prototype.populateInvoiceForm = function(invoice) {
    const safeSetValue = (selector, value) => {
        const element = this.invoiceForm.querySelector(selector);
        if (element) {
            element.value = value;
        }
    };

    safeSetValue('#invoiceCompany', invoice.companyId);
    safeSetValue('#invoicePlan', invoice.planName);
    safeSetValue('#invoiceAmount', invoice.amount.toFixed(2));
    safeSetValue('#invoiceBillingCycle', invoice.billingCycle);

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

    this.invoiceForm = document.getElementById('invoiceForm');
    if (!this.invoiceForm) {
        console.error('Invoice form not found');
        return;
    }

    if (!this.validateForm(this.invoiceForm)) return;

    const invoiceData = {
        companyId: this.safeGetValue(this.invoiceForm.querySelector('#invoiceCompany')),
        plan: this.safeGetValue(this.invoiceForm.querySelector('#invoicePlan')),
        amount: this.safeGetValue(this.invoiceForm.querySelector('#invoiceAmount'), 'number'),
        billingCycle: this.safeGetValue(this.invoiceForm.querySelector('#invoiceBillingCycle')),
        date: new Date(this.safeGetValue(this.invoiceForm.querySelector('#invoiceDate'))).toISOString(),
        dueDate: new Date(this.safeGetValue(this.invoiceForm.querySelector('#invoiceDueDate'))).toISOString()
    };

    const validationErrors = this.validateInvoiceData(invoiceData);
    if (validationErrors.length > 0) {
        validationErrors.forEach(error => this.showErrorNotification(error));
        return;
    }

    try {
        this.showLoadingState(this.invoiceForm);

        const response = await this.fetchData('invoices', 'POST', invoiceData);

        if (response.success) {
            this.showSuccessState(this.invoiceForm, 'Invoice generated successfully');
            this.closeModal(this.invoiceModal);
            await this.createAuditLog('INVOICE_GENERATED', invoiceData);
        } else {
            this.showErrorState(this.invoiceForm, response.message || 'Failed to generate invoice');
        }
    } catch (error) {
        console.error('Error generating invoice:', error);
        this.showErrorState(this.invoiceForm, error.message || 'An unexpected error occurred');
    }
};

PricingManager.prototype.validateInvoiceData = function(data) {
    const errors = [];

    if (!data.companyId) {
        errors.push('Company is required');
    }

    if (!data.plan) {
        errors.push('Plan is required');
    }

    if (typeof data.amount !== 'number' || data.amount <= 0) {
        errors.push('Invalid invoice amount');
    }

    if (!['monthly', 'annual'].includes(data.billingCycle)) {
        errors.push('Invalid billing cycle');
    }

    const invoiceDate = new Date(data.date);
    if (isNaN(invoiceDate.getTime())) {
        errors.push('Invalid invoice date');
    }

    const dueDate = new Date(data.dueDate);
    if (isNaN(dueDate.getTime()) || dueDate <= invoiceDate) {
        errors.push('Invalid due date');
    }

    return errors;
};

PricingManager.prototype.downloadInvoice = async function(invoiceId) {
    try {
        this.showLoadingState(this.invoiceModal);

        const response = await this.fetchData(`invoices/${invoiceId}/download`);

        if (response.success) {
            const blob = new Blob([JSON.stringify(response.data)], { type: 'application/json' });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `invoice_${invoiceId}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);

            await this.createAuditLog('INVOICE_DOWNLOADED', { invoiceId });
        } else {
            this.showErrorNotification(response.message || 'Failed to download invoice');
        }
    } catch (error) {
        console.error('Error downloading invoice:', error);
        this.showErrorNotification(error.message || 'An unexpected error occurred');
    }
};

PricingManager.prototype.openReportsModal = function() {
    if (!this.reportsModal) {
        console.error('Reports modal not found');
        return;
    }

    const reportContent = this.reportsModal.querySelector('#reportContent');
    if (reportContent) {
        reportContent.innerHTML = '';
    }

    const startDateInput = this.reportsModal.querySelector('#reportStartDate');
    const endDateInput = this.reportsModal.querySelector('#reportEndDate');

    if (startDateInput && endDateInput) {
        const endDate = new Date();
        const startDate = new Date();
        startDate.setDate(endDate.getDate() - 30);

        startDateInput.value = startDate.toISOString().split('T')[0];
        endDateInput.value = endDate.toISOString().split('T')[0];
    }

    this.openModal(this.reportsModal, 'Generate Reports');
};

PricingManager.prototype.generateReport = async function(e) {
    e.preventDefault();

    if (!this.reportsModal) {
        console.error('Reports modal not found');
        return;
    }

    const reportTypeSelect = this.reportsModal.querySelector('#reportType');
    const startDateInput = this.reportsModal.querySelector('#reportStartDate');
    const endDateInput = this.reportsModal.querySelector('#reportEndDate');
    const reportContent = this.reportsModal.querySelector('#reportContent');

    const reportType = reportTypeSelect.value;
    const startDate = startDateInput.value;
    const endDate = endDateInput.value;

    if (!startDate || !endDate) {
        this.showErrorNotification('Please select both start and end dates');
        return;
    }

    try {
        this.showLoadingState(reportContent);

        const response = await this.fetchData(
            `reports/${reportType}?startDate=${startDate}&endDate=${endDate}`
        );

        if (response.success) {
            this.displayReport(reportType, response.data, reportContent);
            await this.createAuditLog('REPORT_GENERATED', { reportType, startDate, endDate });
        } else {
            this.showErrorState(reportContent, response.message || 'Failed to generate report');
        }
    } catch (error) {
        console.error('Error generating report:', error);
        this.showErrorState(reportContent, error.message || 'An unexpected error occurred');
    }
};

PricingManager.prototype.displayReport = function(reportType, data, container) {
    container.innerHTML = '';

    const table = document.createElement('table');
    table.className = 'report-table';

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

    container.appendChild(table);
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
    if (typeof Chart === 'undefined') {
        console.warn('Chart.js not loaded. Skipping visualization.');
        return;
    }

    const chartContainer = document.createElement('div');
    chartContainer.className = 'chart-container';
    const canvas = document.createElement('canvas');
    canvas.id = 'reportChart';
    chartContainer.appendChild(canvas);

    const reportContent = this.reportsModal.querySelector('#reportContent');
    reportContent.appendChild(chartContainer);

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

    new Chart(canvas, {
        type: 'bar',
         {
            labels: chartData.labels,
            datasets: [{
                label: reportType === 'activeSubscribers' ? 'Active Subscribers' :
                       reportType === 'revenueBreakdown' ? 'Revenue' : 'Feature Usage',
                 chartData.values,
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

    const reportTypeSelect = this.reportsModal.querySelector('#reportType');
    const startDateInput = this.reportsModal.querySelector('#reportStartDate');
    const endDateInput = this.reportsModal.querySelector('#reportEndDate');

    const reportType = reportTypeSelect.value;
    const startDate = startDateInput.value;
    const endDate = endDateInput.value;

    if (!startDate || !endDate) {
        this.showErrorNotification('Please select both start and end dates');
        return;
    }

    try {
        const response = await this.fetchData(
            `reports/${reportType}/export?startDate=${startDate}&endDate=${endDate}`
        );

        if (response.success) {
            const blob = new Blob([response.data], { type: 'text/csv' });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${reportType}_report_${startDate}_to_${endDate}.csv`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);

            await this.createAuditLog('REPORT_EXPORTED', { reportType, startDate, endDate });
        } else {
            this.showErrorNotification(response.message || 'Failed to export report');
        }
    } catch (error) {
        console.error('Error exporting report:', error);
        this.showErrorNotification(error.message || 'An unexpected error occurred');
    }
};

PricingManager.prototype.openReferralDiscountModal = function(referralDiscount = null) {
    this.referralDiscountForm = document.getElementById('referralDiscountForm');
    if (!this.referralDiscountForm) {
        console.error('Referral discount form not found');
        return;
    }

    this.referralDiscountForm.reset();

    if (referralDiscount) {
        this.populateReferralDiscountForm(referralDiscount);
        this.referralDiscountForm.dataset.referralDiscountId = referralDiscount._id;
        this.openModal(this.referralDiscountModal, 'Edit Referral Discount');
    } else {
        this.referralDiscountForm.dataset.referralDiscountId = '';
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

    safeSetValue('#referralCode', referralDiscount.code);
    safeSetValue('#referralDiscountType', referralDiscount.type);
    safeSetValue('#referralDiscountValue', referralDiscount.value);

    if (referralDiscount.expiryDate) {
        const expiryDate = new Date(referralDiscount.expiryDate);
        safeSetValue('#referralExpiry', expiryDate.toISOString().split('T')[0]);
    }

    safeSetValue('#referralUsageLimit', referralDiscount.usageLimit);
};

PricingManager.prototype.saveReferralDiscount = async function(e) {
    e.preventDefault();

    this.referralDiscountForm = document.getElementById('referralDiscountForm');
    if (!this.referralDiscountForm) {
        console.error('Referral discount form not found');
        return;
    }

    if (!this.validateForm(this.referralDiscountForm)) return;

    const referralDiscountData = {
        code: this.safeGetValue(this.referralDiscountForm.querySelector('#referralCode')),
        type: this.safeGetValue(this.referralDiscountForm.querySelector('#referralDiscountType')),
        value: this.safeGetValue(this.referralDiscountForm.querySelector('#referralDiscountValue'), 'number'),
        expiryDate: new Date(this.safeGetValue(this.referralDiscountForm.querySelector('#referralExpiry'))).toISOString(),
        usageLimit: this.safeGetValue(this.referralDiscountForm.querySelector('#referralUsageLimit'), 'integer') || 0
    };

    const validationErrors = this.validateReferralDiscountData(referralDiscountData);
    if (validationErrors.length > 0) {
        validationErrors.forEach(error => this.showErrorNotification(error));
        return;
    }

    const referralDiscountId = this.referralDiscountForm.dataset.referralDiscountId;
    const method = referralDiscountId ? 'PUT' : 'POST';
    const endpoint = referralDiscountId ? `referral-discounts/${referralDiscountId}` : 'referral-discounts';

    try {
        this.showLoadingState(this.referralDiscountForm);

        const response = await this.fetchData(endpoint, method, referralDiscountData);

        if (response.success) {
            this.showSuccessState(this.referralDiscountForm, `Referral discount ${referralDiscountId ? 'updated' : 'created'} successfully`);
            this.closeModal(this.referralDiscountModal);
            await this.createAuditLog(referralDiscountId ? 'REFERRAL_DISCOUNT_UPDATED' : 'REFERRAL_DISCOUNT_CREATED', referralDiscountData);
        } else {
            this.showErrorState(this.referralDiscountForm, response.message || 'Failed to save referral discount');
        }
    } catch (error) {
        console.error('Error saving referral discount:', error);
        this.showErrorState(this.referralDiscountForm, error.message || 'An unexpected error occurred');
    }
};

PricingManager.prototype.validateReferralDiscountData = function(data) {
    const errors = [];

    if (!data.code || data.code.trim().length < 3) {
        errors.push('Referral code must be at least 3 characters long');
    }

    if (!['percentage', 'fixed'].includes(data.type)) {
        errors.push('Invalid discount type. Must be "percentage" or "fixed".');
    }

    if (typeof data.value !== 'number' || data.value <= 0) {
        errors.push('Discount value must be a positive number');
    }

    const expiryDate = new Date(data.expiryDate);
    if (isNaN(expiryDate.getTime()) || expiryDate <= new Date()) {
        errors.push('Invalid or past expiry date');
    }

    if (typeof data.usageLimit !== 'number' || data.usageLimit < 0) {
        errors.push('Usage limit must be a non-negative number');
    }

    return errors;
};

PricingManager.prototype.openSubscriptionLogsModal = async function() {
    if (!this.subscriptionLogsModal) {
        console.error('Subscription logs modal not found');
        return;
    }

    const logsContent = this.subscriptionLogsModal.querySelector('#subscriptionLogsContent');
    if (logsContent) {
        logsContent.innerHTML = '';
    }

    try {
        this.showLoadingState(logsContent);

        const response = await this.fetchData('subscription-logs');

        if (response.success && Array.isArray(response.data)) {
            const table = this.createSubscriptionLogsTable(response.data);
            logsContent.innerHTML = '';
            logsContent.appendChild(table);
        } else {
            this.showErrorState(logsContent, response.message || 'No subscription logs found');
        }

        this.openModal(this.subscriptionLogsModal, 'Subscription Logs');
    } catch (error) {
        console.error('Error loading subscription logs:', error);
        this.showErrorState(logsContent, error.message || 'An unexpected error occurred');
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
    try {
        if (typeof details === 'object') {
            return JSON.stringify(details, null, 2);
        }
        return String(details);
    } catch (error) {
        return 'Unable to parse log details';
    }
};

PricingManager.prototype.openDataRetentionModal = function(policy = null) {
    this.dataRetentionForm = document.getElementById('dataRetentionForm');
    if (!this.dataRetentionForm) {
        console.error('Data retention form not found');
        return;
    }

    this.dataRetentionForm.reset();

    if (policy) {
        this.populateDataRetentionForm(policy);
        this.dataRetentionForm.dataset.policyId = policy._id;
        this.openModal(this.dataRetentionModal, 'Edit Data Retention Policy');
    } else {
        this.dataRetentionForm.dataset.policyId = '';
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

    safeSetValue('#retentionPeriod', policy.retentionPeriod);
    safeSetValue('#retentionPolicy', policy.policyDescription);
};

PricingManager.prototype.saveDataRetention = async function(e) {
    e.preventDefault();

    this.dataRetentionForm = document.getElementById('dataRetentionForm');
    if (!this.dataRetentionForm) {
        console.error('Data retention form not found');
        return;
    }

    if (!this.validateForm(this.dataRetentionForm)) return;

    const policyData = {
        retentionPeriod: this.safeGetValue(this.dataRetentionForm.querySelector('#retentionPeriod'), 'integer'),
        policyDescription: this.safeGetValue(this.dataRetentionForm.querySelector('#retentionPolicy'))
    };

    const validationErrors = this.validateDataRetentionData(policyData);
    if (validationErrors.length > 0) {
        validationErrors.forEach(error => this.showErrorNotification(error));
        return;
    }

    const policyId = this.dataRetentionForm.dataset.policyId;
    const method = policyId ? 'PUT' : 'POST';
    const endpoint = policyId ? `data-retention/${policyId}` : 'data-retention';

    try {
        this.showLoadingState(this.dataRetentionForm);

        const response = await this.fetchData(endpoint, method, policyData);

        if (response.success) {
            this.showSuccessState(this.dataRetentionForm, `Data retention policy ${policyId ? 'updated' : 'created'} successfully`);
            this.closeModal(this.dataRetentionModal);
            await this.createAuditLog(policyId ? 'DATA_RETENTION_POLICY_UPDATED' : 'DATA_RETENTION_POLICY_CREATED', policyData);
        } else {
            this.showErrorState(this.dataRetentionForm, response.message || 'Failed to save data retention policy');
        }
    } catch (error) {
        console.error('Error saving data retention policy:', error);
        this.showErrorState(this.dataRetentionForm, error.message || 'An unexpected error occurred');
    }
};

PricingManager.prototype.validateDataRetentionData = function(data) {
    const errors = [];

    if (typeof data.retentionPeriod !== 'number' || data.retentionPeriod < 0) {
        errors.push('Retention period must be a non-negative number');
    }

    if (!data.policyDescription || data.policyDescription.trim().length < 10) {
        errors.push('Policy description must be at least 10 characters long');
    }

    return errors;
};

PricingManager.prototype.cleanup = function() {
    const removeListeners = (button, method) => {
        if (button) {
            button.removeEventListener('click', method);
        }
    };

    Object.entries(this.buttons).forEach(([key, button]) => {
        const methodName = this.getMethodForButton(key);
        if (methodName && typeof this[methodName] === 'function') {
            removeListeners(button, this[methodName]);
        }
    });

    console.log('PricingManager cleanup initiated');
};

PricingManager.prototype.handleGenericError = function(error, context = 'Operation') {
    console.error(`${context} error:`, error);
    this.createAuditLog('ERROR', { context, errorMessage: error.message, errorStack: error.stack });
    this.showErrorNotification(`${context} failed. ${error.message || 'Please try again later.'}`);
};

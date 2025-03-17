(function() {
'use strict';

// Ensure clean initialization by removing existing PricingManager
if (window.PricingManager) {
    delete window.PricingManager;
}

class PricingManager {
    constructor(baseUrl) {
        // Base configuration
        this.baseUrl = baseUrl || 'https://18.215.160.136.nip.io/api';
        this.token = localStorage.getItem('token');
        this.currentPage = 1;
        this.pageSize = 10;
        this.totalPlans = 0;
        this.activityLogCurrentPage = 1;

        // Currency configurations
        this.currencies = [
            { code: 'USD', symbol: '$', name: 'US Dollar', conversionRates: {
                INR: 0.012, 
                AED: 0.27, 
                QAR: 0.27, 
                GBP: 0.79
            }},
            { code: 'INR', symbol: '₹', name: 'Indian Rupee', conversionRates: {
                USD: 85.50, 
                AED: 22.70, 
                QAR: 22.70, 
                GBP: 66.50
            }},
            { code: 'AED', symbol: 'د.إ', name: 'UAE Dirham', conversionRates: {
                USD: 3.67, 
                INR: 0.044, 
                QAR: 1.0, 
                GBP: 2.93
            }},
            { code: 'QAR', symbol: 'ر.ق', name: 'Qatari Riyal', conversionRates: {
                USD: 3.64, 
                INR: 0.044, 
                AED: 1.0, 
                GBP: 2.90
            }},
            { code: 'GBP', symbol: '£', name: 'British Pound', conversionRates: {
                USD: 1.26, 
                INR: 0.015, 
                AED: 0.34, 
                QAR: 0.34
            }}
        ];

        // Markup configurations
        this.markupRules = {
            INR: { 
                USD: 1.3, 
                AED: 1.3, 
                QAR: 1.3, 
                GBP: 1.4 
            },
            USD: { 
                GBP: 1.2 
            },
            AED: { 
                GBP: 1.3 
            },
            QAR: { 
                GBP: 1.3 
            }
        };

        // Comprehensive method binding
        const methodsToBind = [
            'showPlanCreationModal',
            'setupPlanCreationModalListeners',
            'showModal',
            'hideModal',
            'getSelectedModuleNames',
            'initializeActivityLogFeature',
            'setupActivityLogFeature',
            'loadActivityLogs',
            'loadMoreActivityLogs',
            'createEditPlanModal',
            'editPlan',
            'deletePlan',
            'fetchAndDisplayPlans',
            'displayPlans',
            'setupPlanCardListeners',
            'convertCurrency',
            'fetchLiveCurrencyRates',
            'getCurrencyRates',
            'demonstrateCurrencyConversion',
            'validatePlanData',
            'savePlan',
            'updatePlan',
            'showValidationErrors',
            'calculatePlanChanges',
            'validateUpdatePlanData',
            'showConfirmationModal',
            'convertPricesToAllCurrencies',
            'createAuditLog',
            'renderActivityLogs'
        ];

        // Safely bind methods
        methodsToBind.forEach(method => {
            if (typeof this[method] === 'function') {
                this[method] = this[method].bind(this);
            } else {
                console.warn(`Method ${method} not found during binding`);
            }
        });

        // Initialize event listeners and setup
        try {
            this.initializeEventListeners();
            this.fetchAndDisplayPlans();
            
            // Safely initialize activity log feature
            if (typeof this.initializeActivityLogFeature === 'function') {
                this.initializeActivityLogFeature();
            }

            this.showPlanCreationModal = this.showPlanCreationModal.bind(this);
this.setupPlanCreationModalListeners = this.setupPlanCreationModalListeners.bind(this);

            // Debug modules endpoint
            this.debugModulesEndpoint();
                this.setupSubscriptionManagementListeners();


        } catch (error) {
            console.error('Error during PricingManager initialization:', error);
        }
    }

    // Method to initialize event listeners
    initializeEventListeners() {
        try {
            const addNewPlanBtn = document.getElementById('addNewPlanBtn');
            if (addNewPlanBtn) {
                // Remove existing listeners first
                const oldButton = addNewPlanBtn.cloneNode(true);
                addNewPlanBtn.parentNode.replaceChild(oldButton, addNewPlanBtn);
                
                // Add new listener
                oldButton.addEventListener('click', () => {
                    if (typeof this.showPlanCreationModal === 'function') {
                        this.showPlanCreationModal();
                    } else {
                        console.error('showPlanCreationModal method is not available');
                    }
                });
            }
        } catch (error) {
            console.error('Error in initializeEventListeners:', error);
        }
    }

    // Reinitialize event listeners method
    reinitializeEventListeners() {
        try {
            this.initializeEventListeners();
            this.setupPlanCardListeners();
        } catch (error) {
            console.error('Error in reinitializeEventListeners:', error);
        }
    }
        // Fetch available modules for plan creation
    async fetchAvailableModules() {
        try {
            const response = await fetch(`${this.baseUrl}/modules`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${this.token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error('Failed to fetch modules');
            }

            const responseData = await response.json();
            const modules = responseData.data || responseData.modules || responseData;

            if (!modules || !Array.isArray(modules)) {
                console.warn('No modules found or invalid module data');
                return [];
            }

            return modules;

        } catch (error) {
            console.error('Modules Fetch Error:', error);
            this.showErrorNotification(`Failed to load modules: ${error.message}`);
            return [];
        }
    }

    showErrorNotification(message) {
    console.error('Error Notification:', message);
    
    // Create error notification element
    const notificationContainer = document.createElement('div');
    notificationContainer.className = 'error-notification';
    notificationContainer.innerHTML = `
        <div class="alert alert-danger alert-dismissible fade show" role="alert">
            <strong>Error!</strong> ${message}
            <button type="button" class="close" data-dismiss="alert" aria-label="Close">
                <span aria-hidden="true">&times;</span>
            </button>
        </div>
    `;

    // Append to body
    document.body.appendChild(notificationContainer);

    // Remove notification after 5 seconds
    setTimeout(() => {
        notificationContainer.remove();
    }, 5000);
}

    setupSubscriptionManagementListeners() {
    // Ensure DOM is ready and container exists
    const checkAndInitialize = () => {
        const subscriptionsContainer = document.getElementById('subscriptionsListContainer');
        const createSubscriptionBtn = document.getElementById('createNewSubscriptionBtn');

        if (subscriptionsContainer && createSubscriptionBtn) {
            this.initializeSubscriptionEventListeners();
        } else {
            // If not found, retry after a short delay
            setTimeout(checkAndInitialize, 100);
        }
    };

    // Start checking
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', checkAndInitialize);
    } else {
        checkAndInitialize();
    }
}

    initializeSubscriptionEventListeners() {
    // Find the create new subscription button
    const createSubscriptionBtn = document.getElementById('createNewSubscriptionBtn');
    
    if (createSubscriptionBtn) {
        // Remove existing listeners first
        const oldButton = createSubscriptionBtn.cloneNode(true);
        createSubscriptionBtn.parentNode.replaceChild(oldButton, createSubscriptionBtn);
        
        // Add new listener
        oldButton.addEventListener('click', () => {
            if (typeof this.showSubscriptionCreationModal === 'function') {
                this.showSubscriptionCreationModal();
            } else {
                console.error('showSubscriptionCreationModal method is not available');
            }
        });
    }

    // Additional initialization for subscription-related features
    this.fetchSubscriptions();
}

// Method to fetch and display subscriptions
async fetchSubscriptions() {
    try {
        // Find subscriptions container with null check
        const subscriptionsContainer = document.getElementById('subscriptionsListContainer');
        
        // Early return if container doesn't exist
        if (!subscriptionsContainer) {
            console.warn('Subscriptions container not found. Skipping fetch.');
            return;
        }

        // Show loading state
        subscriptionsContainer.innerHTML = `
            <div class="loading-container">
                <div class="spinner-border text-primary" role="status">
                    <span class="sr-only">Loading...</span>
                </div>
                <p class="mt-2">Loading subscriptions...</p>
            </div>
        `;

        // Fetch subscriptions
        const response = await fetch(`${this.baseUrl}/subscriptions`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${this.token}`,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            throw new Error('Failed to fetch subscriptions');
        }

        const responseData = await response.json();
        const subscriptions = responseData.data || responseData.subscriptions || responseData;

        // Recheck container existence before manipulation
        const currentContainer = document.getElementById('subscriptionsListContainer');
        if (!currentContainer) {
            console.warn('Subscriptions container disappeared during fetch');
            return;
        }

        // Check if subscriptions exist
        if (!subscriptions || subscriptions.length === 0) {
            currentContainer.innerHTML = `
                <div class="no-subscriptions-container">
                    <i class="fas fa-folder-open text-muted" style="font-size: 3rem;"></i>
                    <h4 class="mt-3">No Subscriptions Found</h4>
                    <p class="text-muted">Click "Create New Subscription" to get started.</p>
                </div>
            `;
            return;
        }

        // Display subscriptions
        this.displaySubscriptions(subscriptions);

    } catch (error) {
        console.error('Subscription Fetch Error:', error);
        
        // Safely find container
        const subscriptionsContainer = document.getElementById('subscriptionsListContainer');
        
        if (subscriptionsContainer) {
            subscriptionsContainer.innerHTML = `
                <div class="error-container">
                    <i class="fas fa-exclamation-triangle text-danger" style="font-size: 3rem;"></i>
                    <h4 class="mt-3">Failed to Load Subscriptions</h4>
                    <p class="text-muted">Error: ${error.message}</p>
                    <button id="retryFetchSubscriptions" class="btn btn-primary mt-3">
                        <i class="fas fa-redo"></i> Retry
                    </button>
                </div>
            `;

            // Add retry event listener
            const retryButton = document.getElementById('retryFetchSubscriptions');
            if (retryButton) {
                retryButton.addEventListener('click', () => this.fetchSubscriptions());
            }
        } else {
            console.warn('Cannot display error: Subscriptions container not found');
        }
    }
}
// Method to display subscriptions
displaySubscriptions(subscriptions) {
    const subscriptionsContainer = document.getElementById('subscriptionsListContainer');
    
    // Clear existing content
    subscriptionsContainer.innerHTML = '';

    // Create subscription cards
    subscriptions.forEach(subscription => {
        const subscriptionCard = document.createElement('div');
        subscriptionCard.className = 'subscription-card';
        
        subscriptionCard.innerHTML = `
            <div class="subscription-header">
                <h3>${subscription.planName}</h3>
                <span class="subscription-status ${subscription.status}">
                    ${subscription.status.charAt(0).toUpperCase() + subscription.status.slice(1)}
                </span>
            </div>
            <div class="subscription-body">
                <div class="subscription-details">
                    <p><strong>Users:</strong> ${subscription.userCount}</p>
                    <p><strong>Start Date:</strong> ${new Date(subscription.startDate).toLocaleDateString()}</p>
                    <p><strong>End Date:</strong> ${new Date(subscription.endDate).toLocaleDateString()}</p>
                    <p><strong>Auto-Renewal:</strong> ${subscription.autoRenewal ? 'Yes' : 'No'}</p>
                </div>
            </div>
            <div class="subscription-actions">
                <button class="btn btn-sm btn-primary edit-subscription" data-id="${subscription._id}">
                    Manage
                </button>
                <button class="btn btn-sm btn-danger cancel-subscription" data-id="${subscription._id}">
                    Cancel
                </button>
            </div>
        `;

        subscriptionsContainer.appendChild(subscriptionCard);
    });

    // Setup listeners for subscription actions
    this.setupSubscriptionCardListeners();
}

// Setup listeners for subscription card actions
setupSubscriptionCardListeners() {
    const editButtons = document.querySelectorAll('.edit-subscription');
    const cancelButtons = document.querySelectorAll('.cancel-subscription');

    // Edit subscription listeners
    editButtons.forEach(button => {
        button.addEventListener('click', (e) => {
            const subscriptionId = e.target.getAttribute('data-id');
            this.showSubscriptionEditModal(subscriptionId);
        });
    });

    // Cancel subscription listeners
    cancelButtons.forEach(button => {
        button.addEventListener('click', (e) => {
            const subscriptionId = e.target.getAttribute('data-id');
            this.showSubscriptionCancellationModal(subscriptionId);
        });
    });
}

    

    // Debugging method to verify modules endpoint
    async debugModulesEndpoint() {
        try {
            console.log('Debugging modules endpoint');
            const response = await fetch(`${this.baseUrl}/modules`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${this.token}`,
                    'Content-Type': 'application/json'
                }
            });

            console.log('Raw response status:', response.status);
            
            const responseText = await response.text();
            console.log('Raw response text:', responseText);

            // Try parsing as JSON
            try {
                const responseData = JSON.parse(responseText);
                console.log('Parsed response data:', responseData);
            } catch (parseError) {
                console.error('Failed to parse response:', parseError);
            }

        } catch (error) {
            console.error('Endpoint debugging error:', error);
        }
    }

    // Logging method to log modules
    logModules(modules) {
        console.log('Modules received:', modules);
        console.log('Modules type:', typeof modules);
        console.log('Is Array:', Array.isArray(modules));
        
        if (Array.isArray(modules)) {
            modules.forEach((module, index) => {
                console.log(`Module ${index}:`, module);
                console.log(`Module ${index} ID:`, module._id || module.id || module.moduleId);
            });
        }
    }

    // Helper method to get input value with validation
    getInputValue(elementId, fieldName, required = true) {
        const element = document.getElementById(elementId);
        
        if (!element) {
            console.error(`Element not found: ${elementId}`);
            if (required) {
                throw new Error(`${fieldName} is required`);
            }
            return '';
        }

        const value = element.value.trim();

        if (required && (!value || value.length === 0)) {
            throw new Error(`${fieldName} is required`);
        }

        return value;
    }

    // Helper method to get numeric input value
    getNumericInputValue(elementId, fieldName) {
        const element = document.getElementById(elementId);
        
        if (!element) {
            console.error(`Element not found: ${elementId}`);
            throw new Error(`${fieldName} is required`);
        }

        const value = parseFloat(element.value);

        if (isNaN(value) || value <= 0) {
            throw new Error(`${fieldName} must be a positive number`);
        }

        return value;
    }

    // Helper method to get selected module names
    getSelectedModuleNames(modules) {
        // Ensure modules is an array
        if (!Array.isArray(modules)) {
            console.warn('Modules is not an array:', modules);
            return [];
        }

        const selectedModuleIds = Array.from(
            document.querySelectorAll('#modulesContainer input:checked')
        ).map(checkbox => checkbox.value);

        if (selectedModuleIds.length === 0) {
            throw new Error('At least one module must be selected');
        }

        // Map selected module IDs to their names
        return selectedModuleIds.map(moduleId => {
            const module = modules.find(m => {
                // Handle different possible ID formats
                return (m._id || m.id || m.moduleId) === moduleId;
            });

            if (!module) {
                console.warn(`Module with ID ${moduleId} not found`);
                return moduleId; // Return the ID if no matching module found
            }
            return module.name;
        });
    }

    // Validate plan form data
    validatePlanData(formData, modules) {
        const errors = [];

        // Comprehensive validation
        try {
            // Name validation
            if (formData.name.length < 3) {
                errors.push('Plan name must be at least 3 characters long');
            }

            // Description validation 
            if (formData.description.length < 10) {
                errors.push('Description must be at least 10 characters long');
            }

            // Price validations
            if (formData.monthlyPrice <= 0) {
                errors.push('Monthly price must be a positive number');
            }

            if (formData.annualPrice <= 0) {
                errors.push('Annual price must be a positive number');
            }

            // Module validation
            if (!formData.features || formData.features.length === 0) {
                errors.push('Select at least one module for the plan');
            }

        } catch (error) {
            // Catch any unexpected validation errors
            errors.push(error.message);
        }

        return errors;
    }

    async showPlanCreationModal() {
    try {
        // Log the start of modal creation
        console.log('Attempting to create plan creation modal');

        // Fetch available modules
        const modules = await this.fetchAvailableModules();

        // Find or create modal container
        let modalContainer = document.getElementById('planFormModalContainer');
        if (!modalContainer) {
            console.warn('Modal container not found, creating new container');
            modalContainer = document.createElement('div');
            modalContainer.id = 'planFormModalContainer';
            document.body.appendChild(modalContainer);
        }

        // Remove any existing modal with the same ID
        const existingModal = document.getElementById('planCreationModal');
        if (existingModal) {
            console.log('Removing existing modal');
            existingModal.remove();
        }

        // Create modal HTML
        const modalDiv = document.createElement('div');
        modalDiv.innerHTML = `
            <div class="modal" id="planCreationModal" tabindex="-1" role="dialog">
                <div class="modal-dialog modal-lg" role="document">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h5 class="modal-title">Create New Plan</h5>
                            <button type="button" class="close" data-dismiss="modal" aria-label="Close">
                                <span aria-hidden="true">&times;</span>
                            </button>
                        </div>
                        <div class="modal-body">
                            <form id="planCreationForm">
                                <div class="row">
                                    <div class="col-md-6">
                                        <div class="form-group">
                                            <label>Plan Name</label>
                                            <input type="text" class="form-control" id="planName" required>
                                        </div>
                                    </div>
                                    <div class="col-md-6">
                                        <div class="form-group">
                                            <label>Currency</label>
                                            <select class="form-control" id="planCurrency">
                                                ${this.currencies.map(currency => 
                                                    `<option value="${currency.code}">${currency.name} (${currency.symbol})</option>`
                                                ).join('')}
                                            </select>
                                        </div>
                                    </div>
                                </div>
                                
                                <div class="form-group">
                                    <label>Plan Description</label>
                                    <textarea class="form-control" id="planDescription" rows="3"></textarea>
                                </div>
                                
                                <div class="row">
                                    <div class="col-md-6">
                                        <div class="form-group">
                                            <label>Monthly Rate</label>
                                            <div class="input-group">
                                                <div class="input-group-prepend">
                                                    <span class="input-group-text" id="currencySymbol">$</span>
                                                </div>
                                                <input type="number" class="form-control" id="monthlyRate" min="0" step="0.01" required>
                                            </div>
                                        </div>
                                    </div>
                                    <div class="col-md-6">
                                        <div class="form-group">
                                            <label>Annual Rate</label>
                                            <div class="input-group">
                                                <div class="input-group-prepend">
                                                    <span class="input-group-text" id="currencySymbol">$</span>
                                                </div>
                                                <input type="number" class="form-control" id="annualRate" min="0" step="0.01" required>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                
                                <div class="row">
                                    <div class="col-md-6">
                                        <div class="form-group">
                                            <label>Trial Period (Days)</label>
                                            <input type="number" class="form-control" id="trialPeriod" min="0" value="0">
                                        </div>
                                    </div>
                                    <div class="col-md-6">
                                        <div class="form-group">
                                            <label>Plan Status</label>
                                            <select class="form-control" id="planStatus">
                                                <option value="active">Active</option>
                                                <option value="inactive">Inactive</option>
                                            </select>
                                        </div>
                                    </div>
                                </div>
                                
                                <div class="form-group">
                                    <label>Select Modules</label>
                                    <div id="modulesContainer">
                                        ${modules.length > 0 ? 
                                            modules.map(module => `
                                                <div class="form-check">
                                                    <input class="form-check-input" type="checkbox" 
                                                           value="${module._id || module.id}" 
                                                           id="module-${module._id || module.id}">
                                                    <label class="form-check-label" for="module-${module._id || module.id}">
                                                        ${this.escapeHtml(module.name)}
                                                    </label>
                                                </div>
                                            `).join('') : 
                                            `<div class="alert alert-warning">
                                                No modules available. Please add modules first.
                                            </div>`
                                        }
                                    </div>
                                </div>
                            </form>
                        </div>
                        <div class="modal-footer">
                            <button type="button" class="btn btn-secondary" data-dismiss="modal">Cancel</button>
                            <button type="button" class="btn btn-primary" id="savePlanBtn" ${modules.length === 0 ? 'disabled' : ''}>
                                Save Plan
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;

        // Append to container
        modalContainer.appendChild(modalDiv.firstElementChild);

        // Log modal creation
        console.log('Modal created and appended to container');

        // Show modal
        this.showModal('planCreationModal');

        // Add event listeners
        this.setupPlanCreationModalListeners(modules);

    } catch (error) {
        // Comprehensive error logging
        console.error('Complete Error Details for Plan Creation Modal:', {
            message: error.message,
            name: error.name,
            stack: error.stack
        });

        // Log the error without using await
        this.createAuditLog('PLAN_CREATION_MODAL_FAILED', {
            errorMessage: error.message,
            errorStack: error.stack
        }).catch(logError => {
            console.error('Failed to create audit log:', logError);
        });

        // Show error notification
        this.showErrorNotification(`Failed to create plan modal: ${error.message}`);
    }
}

// Setup event listeners for plan creation modal
setupPlanCreationModalListeners(modules) {
    // Log modules for debugging
    this.logModules(modules);

    // Currency symbol update
    const currencySelect = document.getElementById('planCurrency');
    const currencySymbols = document.querySelectorAll('#currencySymbol');
    
    if (currencySelect) {
        currencySelect.addEventListener('change', (e) => {
            const selectedCurrency = this.currencies.find(c => c.code === e.target.value);
            currencySymbols.forEach(symbol => {
                symbol.textContent = selectedCurrency.symbol;
            });
        });
    }

    // Save plan button
    const savePlanBtn = document.getElementById('savePlanBtn');
    if (savePlanBtn) {
        // Remove existing listeners
        const oldButton = savePlanBtn.cloneNode(true);
        savePlanBtn.parentNode.replaceChild(oldButton, savePlanBtn);

        // Add new listener
        oldButton.addEventListener('click', () => {
            // Ensure modules is passed
            this.savePlan(modules || []);
            this.hideModal('planCreationModal');
        });
    }

    // Close modal buttons
    const closeButtons = document.querySelectorAll('[data-dismiss="modal"], .close-modal');
    closeButtons.forEach(button => {
        button.addEventListener('click', () => this.hideModal('planCreationModal'));
    });
}

    // Currency conversion and pricing adjustment method
async adjustPricingForMultipleCurrencies(formData) {
    try {
        // Ensure we have the latest currency rates
        await this.getCurrencyRates();

        // Create a copy of the form data to avoid mutation
        const adjustedPricing = { ...formData };

        // Define markup rules
        const markupRules = {
            'INR': { 
                'USD': 1.3,   // +30%
                'GBP': 1.4,   // +40%
                'AED': 1.3,   // +30%
                'QAR': 1.3    // +30%
            },
            'USD': { 
                'GBP': 1.2    // +20%
            },
            'AED': { 
                'GBP': 1.3    // +30%
            },
            'QAR': { 
                'GBP': 1.3    // +30%
            }
        };

        // Supported currencies
        const supportedCurrencies = ['USD', 'INR', 'GBP', 'AED', 'QAR'];

        // Prepare converted prices for all currencies
        const convertedPrices = {
            [formData.currency]: {
                monthlyPrice: formData.monthlyPrice,
                annualPrice: formData.annualPrice
            }
        };

        // Convert prices to other currencies
        for (const targetCurrency of supportedCurrencies) {
            if (targetCurrency === formData.currency) continue;

            try {
                // Convert monthly price
                const convertedMonthlyPrice = await this.convertCurrency(
                    formData.monthlyPrice, 
                    formData.currency, 
                    targetCurrency
                );

                // Convert annual price
                const convertedAnnualPrice = await this.convertCurrency(
                    formData.annualPrice, 
                    formData.currency, 
                    targetCurrency
                );

                // Get markup
                const markup = this.getMarkup(formData.currency, targetCurrency);

                // Apply markup if exists
                const adjustedMonthlyPrice = markup 
                    ? convertedMonthlyPrice * markup 
                    : convertedMonthlyPrice;

                const adjustedAnnualPrice = markup 
                    ? convertedAnnualPrice * markup 
                    : convertedAnnualPrice;

                // Store converted and adjusted prices
                convertedPrices[targetCurrency] = {
                    monthlyPrice: Math.round(adjustedMonthlyPrice * 100) / 100,
                    annualPrice: Math.round(adjustedAnnualPrice * 100) / 100
                };
            } catch (conversionError) {
                console.warn(`Conversion error for ${targetCurrency}:`, conversionError);
                // Fallback to base currency price if conversion fails
                convertedPrices[targetCurrency] = {
                    monthlyPrice: formData.monthlyPrice,
                    annualPrice: formData.annualPrice
                };
            }
        }

        // Add converted prices to the form data
        adjustedPricing.convertedPrices = convertedPrices;

        return adjustedPricing;
    } catch (error) {
        console.error('Currency conversion error:', error);
        // Fallback to original pricing if conversion fails
        return {
            ...formData,
            convertedPrices: {
                [formData.currency]: {
                    monthlyPrice: formData.monthlyPrice,
                    annualPrice: formData.annualPrice
                }
            }
        };
    }
}
async showSubscriptionCreationModal() {
    try {
        // Fetch available plans
        const plansResponse = await fetch(`${this.baseUrl}/plans`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${this.token}`,
                'Content-Type': 'application/json'
            }
        });

        if (!plansResponse.ok) {
            throw new Error('Failed to fetch plans');
        }

        const plansData = await plansResponse.json();
        const plans = plansData.data || plansData.plans || plansData;

        // Find or create modal container
        let modalContainer = document.getElementById('subscriptionFormModalContainer');
        if (!modalContainer) {
            modalContainer = document.createElement('div');
            modalContainer.id = 'subscriptionFormModalContainer';
            document.body.appendChild(modalContainer);
        }

        // Remove any existing modal
        const existingModal = document.getElementById('subscriptionCreationModal');
        if (existingModal) {
            existingModal.remove();
        }

        // Create modal HTML
        const modalDiv = document.createElement('div');
        modalDiv.innerHTML = `
            <div class="modal" id="subscriptionCreationModal" tabindex="-1" role="dialog">
                <div class="modal-dialog modal-lg" role="document">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h5 class="modal-title">Create New Subscription</h5>
                            <button type="button" class="close" data-dismiss="modal" aria-label="Close">
                                <span aria-hidden="true">&times;</span>
                            </button>
                        </div>
                        <div class="modal-body">
                            <form id="subscriptionCreationForm">
                                <div class="row">
                                    <div class="col-md-6">
                                        <div class="form-group">
                                            <label>Select Plan</label>
                                            <select class="form-control" id="subscriptionPlan" required>
                                                <option value="">Choose a Plan</option>
                                                ${plans.map(plan => `
                                                    <option value="${plan._id}">
                                                        ${plan.name} - 
                                                        ${plan.currency} ${plan.monthlyPrice}/month
                                                    </option>
                                                `).join('')}
                                            </select>
                                        </div>
                                    </div>
                                    <div class="col-md-6">
                                        <div class="form-group">
                                            <label>Number of Users</label>
                                            <input type="number" class="form-control" 
                                                   id="subscriptionUserCount" 
                                                   min="1" 
                                                   required 
                                                   placeholder="Enter number of users">
                                        </div>
                                    </div>
                                </div>

                                <div class="row">
                                    <div class="col-md-6">
                                        <div class="form-group">
                                            <label>Start Date</label>
                                            <input type="date" class="form-control" 
                                                   id="subscriptionStartDate" 
                                                   required>
                                        </div>
                                    </div>
                                    <div class="col-md-6">
                                        <div class="form-group">
                                            <label>End Date</label>
                                            <input type="date" class="form-control" 
                                                   id="subscriptionEndDate" 
                                                   required>
                                        </div>
                                    </div>
                                </div>

                                <div class="row">
                                    <div class="col-md-6">
                                        <div class="form-group">
                                            <label>Payment Status</label>
                                            <select class="form-control" id="subscriptionPaymentStatus">
                                                <option value="pending">Pending</option>
                                                <option value="paid">Paid</option>
                                                <option value="failed">Payment Failed</option>
                                            </select>
                                        </div>
                                    </div>
                                    <div class="col-md-6">
                                        <div class="form-group">
                                            <label>Auto-Renewal</label>
                                            <div class="custom-control custom-switch">
                                                <input type="checkbox" 
                                                       class="custom-control-input" 
                                                       id="subscriptionAutoRenewal">
                                                <label class="custom-control-label" 
                                                       for="subscriptionAutoRenewal">
                                                    Enable Auto-Renewal
                                                </label>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div class="form-group">
                                    <label>Coupon Code (Optional)</label>
                                    <div class="input-group">
                                        <input type="text" 
                                               class="form-control" 
                                               id="subscriptionCouponCode" 
                                               placeholder="Enter coupon code">
                                        <div class="input-group-append">
                                            <button class="btn btn-outline-secondary" 
                                                    type="button" 
                                                    id="validateCouponBtn">
                                                Validate
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </form>
                        </div>
                        <div class="modal-footer">
                            <button type="button" class="btn btn-secondary" data-dismiss="modal">Cancel</button>
                            <button type="button" class="btn btn-primary" id="createSubscriptionBtn">
                                Create Subscription
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;

        // Append to container
        modalContainer.appendChild(modalDiv.firstElementChild);

        // Setup event listeners
        this.setupSubscriptionCreationModalListeners(plans);

        // Show modal
        this.showModal('subscriptionCreationModal');

    } catch (error) {
        console.error('Error creating subscription modal:', error);
        this.showErrorNotification(`Failed to create subscription modal: ${error.message}`);
    }
}

// Setup event listeners for subscription creation modal
setupSubscriptionCreationModalListeners(plans) {
    // Plan selection listener to update pricing dynamically
    const planSelect = document.getElementById('subscriptionPlan');
    const userCountInput = document.getElementById('subscriptionUserCount');
    const startDateInput = document.getElementById('subscriptionStartDate');
    const endDateInput = document.getElementById('subscriptionEndDate');
    const createSubscriptionBtn = document.getElementById('createSubscriptionBtn');
    const validateCouponBtn = document.getElementById('validateCouponBtn');

    // Set default dates
    const today = new Date();
    startDateInput.valueAsDate = today;
    
    // Calculate end date based on plan (default to monthly)
    const endDate = new Date(today);
    endDate.setMonth(endDate.getMonth() + 1);
    endDateInput.valueAsDate = endDate;

    // Plan selection change listener
    planSelect.addEventListener('change', (e) => {
        const selectedPlanId = e.target.value;
        const selectedPlan = plans.find(plan => plan._id === selectedPlanId);
        
        if (selectedPlan) {
            // Optional: Update user count based on plan
            userCountInput.max = selectedPlan.maxUsers || 100;
        }
    });

    // Validate coupon button
    validateCouponBtn.addEventListener('click', () => {
        const couponCode = document.getElementById('subscriptionCouponCode').value;
        this.validateCoupon(couponCode);
    });

    // Create subscription button
    createSubscriptionBtn.addEventListener('click', () => {
        this.createSubscription();
    });

    // Date range validation
    startDateInput.addEventListener('change', () => {
        const startDate = new Date(startDateInput.value);
        const endDate = new Date(endDateInput.value);
        
        if (startDate >= endDate) {
            endDate.setMonth(startDate.getMonth() + 1);
            endDateInput.valueAsDate = endDate;
        }
    });
}

// Validate coupon method
async validateCoupon(couponCode) {
    // If no coupon code is provided, return immediately
    if (!couponCode || couponCode.trim() === '') {
        return {
            success: true,
            message: 'No coupon code provided',
            discount: 0
        };
    }

    try {
        const response = await fetch(`${this.baseUrl}/validate-coupon`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${this.token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ couponCode })
        });

        const result = await response.json();

        if (result.success) {
            this.showSuccessNotification('Coupon validated successfully');
            return result;
        } else {
            this.showErrorNotification(result.message || 'Invalid coupon code');
            return {
                success: false,
                message: result.message || 'Invalid coupon code',
                discount: 0
            };
        }
    } catch (error) {
        console.error('Coupon validation error:', error);
        this.showErrorNotification('Failed to validate coupon');
        return {
            success: false,
            message: 'Coupon validation failed',
            discount: 0
        };
    }
}

// Create subscription method
async createSubscription() {
    try {
        // Collect form data with comprehensive logging and validation
        const formData = {
            planId: this.getFormValue('subscriptionPlan', 'Plan'),
            userCount: this.getNumericFormValue('subscriptionUserCount', 'User Count'),
            startDate: this.getFormValue('subscriptionStartDate', 'Start Date'),
            endDate: this.getFormValue('subscriptionEndDate', 'End Date'),
            paymentStatus: this.getFormValue('subscriptionPaymentStatus', 'Payment Status'),
            autoRenewal: document.getElementById('subscriptionAutoRenewal').checked,
            couponCode: document.getElementById('subscriptionCouponCode').value || null
        };

        // Comprehensive logging
        console.log('Subscription Creation Payload:', JSON.stringify(formData, null, 2));

        // Validate dates
        this.validateDateRange(formData.startDate, formData.endDate);

        // Send subscription creation request
        const response = await fetch(`${this.baseUrl}/subscriptions`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${this.token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(formData)
        });

        // Log raw response details
        console.log('Response Status:', response.status);
        console.log('Response Headers:', Object.fromEntries(response.headers.entries()));

        // Parse response
        const result = await response.text(); // Change to text to see full response
        console.log('Raw Response Body:', result);

        // Try parsing as JSON
        let parsedResult;
        try {
            parsedResult = JSON.parse(result);
        } catch (parseError) {
            console.error('Failed to parse response:', parseError);
            throw new Error(`Server returned non-JSON response: ${result}`);
        }

        // Check response
        if (!response.ok) {
            throw new Error(parsedResult.message || 'Failed to create subscription');
        }

        // Success handling
        this.showSuccessNotification('Subscription created successfully');
        this.hideModal('subscriptionCreationModal');
        
        // Refresh subscriptions list
        await this.fetchSubscriptions();

        return parsedResult.data;

    } catch (error) {
        // Comprehensive error logging
        console.error('Subscription Creation Error:', {
            message: error.message,
            name: error.name,
            stack: error.stack
        });

        // Show detailed error notification
        this.showErrorNotification(`Subscription creation failed: ${error.message}`);

        // Modify audit log to handle potential issues
        try {
            await this.createAuditLog('SUBSCRIPTION_CREATION_FAILED', {
                errorMessage: error.message,
                errorStack: error.stack,
                formData: formData // Include form data for debugging
            });
        } catch (auditError) {
            console.error('Audit log creation failed:', auditError);
        }

        throw error;
    }
}

    // Helper method to safely get form values
getFormValue(elementId, fieldName) {
    const element = document.getElementById(elementId);
    if (!element) {
        throw new Error(`Element not found: ${elementId}`);
    }
    
    const value = element.value.trim();
    if (!value) {
        throw new Error(`${fieldName} is required`);
    }
    
    return value;
}

// Helper method to get numeric form values
getNumericFormValue(elementId, fieldName) {
    const element = document.getElementById(elementId);
    if (!element) {
        throw new Error(`Element not found: ${elementId}`);
    }
    
    const value = parseInt(element.value);
    if (isNaN(value) || value <= 0) {
        throw new Error(`${fieldName} must be a positive number`);
    }
    
    return value;
}
    
validateDateRange(startDate, endDate) {
    const start = new Date(startDate);
    const end = new Date(endDate);

    if (isNaN(start.getTime())) {
        throw new Error('Invalid start date');
    }

    if (isNaN(end.getTime())) {
        throw new Error('Invalid end date');
    }

    if (start >= end) {
        throw new Error('End date must be after start date');
    }
}

    
// Validate subscription data
validateSubscriptionData(formData) {
    const errors = [];

    if (!formData.planId) {
        errors.push('Please select a plan');
    }

    if (formData.userCount <= 0) {
        errors.push('Number of users must be positive');
    }

    if (!formData.startDate || !formData.endDate) {
        errors.push('Start and end dates are required');
    }

    const startDate = new Date(formData.startDate);
    const endDate = new Date(formData.endDate);

    if (startDate >= endDate) {
        errors.push('End date must be after start date');
    }

    if (errors.length > 0) {
        throw new Error(errors.join('; '));
    }
}
    
// Helper method to get markup
getMarkup(fromCurrency, toCurrency) {
    const markupRules = {
        'INR': { 
            'USD': 1.3,   // +30%
            'GBP': 1.4,   // +40%
            'AED': 1.3,   // +30%
            'QAR': 1.3    // +30%
        },
        'USD': { 
            'GBP': 1.2    // +20%
        },
        'AED': { 
            'GBP': 1.3    // +30%
        },
        'QAR': { 
            'GBP': 1.3    // +30%
        }
    };

    // Check if markup exists
    return markupRules[fromCurrency]?.[toCurrency] || null;
}

    


    
        // Save plan method
   async savePlan(modules) {
    try {
        // Collect form data
        const formData = {
            name: this.getInputValue('planName', 'Plan Name'),
            description: this.getInputValue('planDescription', 'Description'),
            currency: this.getInputValue('planCurrency', 'Currency'),
            monthlyPrice: this.getNumericInputValue('monthlyRate', 'Monthly Rate'),
            annualPrice: this.getNumericInputValue('annualRate', 'Annual Rate'),
            trialPeriod: parseInt(document.getElementById('trialPeriod').value) || 0,
            isActive: this.getInputValue('planStatus', 'Plan Status') === 'active',
            features: this.getSelectedModuleNames(modules)
        };

        // Adjust pricing for multiple currencies
        const adjustedPricing = await this.adjustPricingForMultipleCurrencies(formData);

        // Validate form data
        const validationErrors = this.validatePlanData(adjustedPricing, modules);
        if (validationErrors.length > 0) {
            this.showValidationErrors(validationErrors);
            return;
        }

        // Send plan to backend
        const response = await fetch(`${this.baseUrl}/plans`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${this.token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(adjustedPricing)
        });

        const responseData = await response.json();

        if (!response.ok) {
            throw new Error(responseData.message || 'Failed to create plan');
        }

        // Create audit log for plan creation
        await this.createAuditLog('PLAN_CREATED', {
            planId: responseData.data._id,
            planName: adjustedPricing.name,
            planDetails: {
                currency: adjustedPricing.currency,
                monthlyPrice: adjustedPricing.monthlyPrice,
                annualPrice: adjustedPricing.annualPrice,
                convertedPrices: adjustedPricing.convertedPrices
            }
        });

        // Show success notification
        this.showSuccessNotification('Plan created successfully');

        // Refresh plans list
        await this.fetchAndDisplayPlans();

        // Close modal
        this.hideModal();

        return responseData.data;

    } catch (error) {
        // Log error to audit logs
        await this.createAuditLog('PLAN_CREATION_FAILED', {
            errorMessage: error.message,
            errorStack: error.stack
        });

        this.showErrorNotification(`Failed to save plan: ${error.message}`);
        throw error;
    }
}

    
    // Show validation errors
    showValidationErrors(errors) {
        // Create error message container
        const modalBody = document.querySelector('#planCreationModal .modal-body');
        
        // Remove existing error messages
        const existingErrors = modalBody.querySelector('.validation-errors');
        if (existingErrors) {
            existingErrors.remove();
        }

        // Create new error message
        const errorContainer = document.createElement('div');
        errorContainer.className = 'validation-errors alert alert-danger';
        errorContainer.innerHTML = `
            <strong>Validation Errors:</strong>
            <ul>
                ${errors.map(error => `<li>${error}</li>`).join('')}
            </ul>
        `;

        // Insert error container at the top of the modal body
        modalBody.insertBefore(errorContainer, modalBody.firstChild);
    }

    // Show modal method
    showModal(modalId = 'planCreationModal') {
        console.log(`Attempting to show modal: ${modalId}`);

        const modal = document.getElementById(modalId);
        
        if (!modal) {
            console.error(`Modal with id ${modalId} not found`);
            return;
        }

        // Remove any existing backdrops
        const existingBackdrops = document.querySelectorAll('.modal-backdrop');
        existingBackdrops.forEach(backdrop => backdrop.remove());

        // Ensure modal is in the document body
        if (!document.body.contains(modal)) {
            document.body.appendChild(modal);
        }

        // Show modal explicitly
        modal.style.display = 'block';
        modal.classList.add('show');
        
        // Add backdrop
        const backdrop = document.createElement('div');
        backdrop.classList.add('modal-backdrop', 'fade', 'show');
        document.body.appendChild(backdrop);

        // Ensure modal is on top of other elements
        modal.style.zIndex = '1050';
        backdrop.style.zIndex = '1040';

        // Close on backdrop click
        backdrop.addEventListener('click', () => this.hideModal(modalId));

        // Close on escape key
        const escapeHandler = (event) => {
            if (event.key === 'Escape') {
                this.hideModal(modalId);
            }
        };
        document.addEventListener('keydown', escapeHandler);

        // Add close button listeners
        const closeButtons = modal.querySelectorAll('[data-dismiss="modal"], .close');
        closeButtons.forEach(button => {
            button.addEventListener('click', () => this.hideModal(modalId));
        });

        console.log('Modal displayed successfully');
    }
    
    // Hide modal method
    hideModal(modalId = 'planCreationModal') {
        console.log(`Attempting to hide modal: ${modalId}`);

        // Find modal in document or modal container
        let modal = document.getElementById(modalId);
        if (!modal) {
            const modalContainer = document.getElementById('planFormModalContainer');
            if (modalContainer) {
                modal = modalContainer.querySelector(`#${modalId}`);
            }
        }

        // Remove modal
        if (modal) {
            modal.style.display = 'none';
            modal.classList.remove('show');
        }

        // Remove backdrop
        const backdrop = document.querySelector('.modal-backdrop');
        if (backdrop) {
            backdrop.remove();
        }

        // Remove escape key listener
        document.removeEventListener('keydown', this.escapeHandler);
    }

    // Fetch and display existing plans
    async fetchAndDisplayPlans() {
        const plansContainer = document.getElementById('plansListContainer');
        
        try {
            // Clear container and show loading state
            plansContainer.innerHTML = `
                <div class="loading-container">
                    <div class="spinner-border text-primary" role="status">
                        <span class="sr-only">Loading...</span>
                    </div>
                    <p class="mt-2">Loading plans...</p>
                </div>
            `;

            // Enhanced logging for debugging
            console.log('Fetching plans with:', {
                baseUrl: this.baseUrl,
                token: this.token ? 'Token present' : 'No token'
            });

            const response = await fetch(`${this.baseUrl}/plans`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${this.token}`,
                    'Content-Type': 'application/json'
                }
            });

            // Log raw response
            console.log('Response status:', response.status);
            
            // Parse response
            const responseData = await response.json();
            
            // Log parsed response
            console.log('Response data:', responseData);

            // Check response structure
            if (!response.ok) {
                throw new Error(responseData.message || 'Failed to fetch plans');
            }

            // Determine the correct path to plans
            const plans = responseData.data || responseData.plans || responseData;

            // Check if plans exist
            if (!plans || plans.length === 0) {
                plansContainer.innerHTML = `
                    <div class="no-plans-container">
                        <i class="fas fa-folder-open text-muted" style="font-size: 3rem;"></i>
                        <h4 class="mt-3">No Plans Found</h4>
                        <p class="text-muted">Click "Add New Plan" to create your first plan.</p>
                    </div>
                `;
                return;
            }

            // Display plans
            this.displayPlans(plans);

        } catch (error) {
            console.error('Comprehensive Plan Fetch Error:', {
                message: error.message,
                stack: error.stack,
                name: error.name
            });
            
            // Detailed error handling
            plansContainer.innerHTML = `
                <div class="error-container">
                    <i class="fas fa-exclamation-triangle text-danger" style="font-size: 3rem;"></i>
                    <h4 class="mt-3">Failed to Load Plans</h4>
                    <p class="text-muted">Error: ${error.message}</p>
                    <button id="retryFetchPlans" class="btn btn-primary mt-3">
                        <i class="fas fa-redo"></i> Retry
                    </button>
                </div>
            `;

            // Add retry event listener
            const retryButton = document.getElementById('retryFetchPlans');
            if (retryButton) {
                retryButton.addEventListener('click', () => this.fetchAndDisplayPlans());
            }

            // Log the error
            this.createAuditLog('PLANS_FETCH_FAILED', {
                errorMessage: error.message,
                errorStack: error.stack,
                timestamp: new Date().toISOString()
            });
        }
    }
        // Display plans in the plans container
   displayPlans(plans) {
    // Store plans as a class property
    this.plans = plans;

    const plansContainer = document.getElementById('plansListContainer');
    
    // Clear existing content
    plansContainer.innerHTML = '';

    // Normalize plan data
    const normalizedPlans = plans.map(plan => ({
        _id: plan._id || plan.id,
        name: plan.name,
        description: plan.description || 'No description',
        baseCurrency: plan.currency || 'USD',
        convertedPrices: plan.convertedPrices || {},
        monthlyRate: this.normalizePrice(plan.monthlyPrice || plan.monthlyRate),
        annualRate: this.normalizePrice(plan.annualPrice || plan.annualRate),
        status: plan.status || (plan.isActive ? 'active' : 'inactive'),
        modules: plan.modules || plan.features || [],
        trialPeriod: plan.trialPeriod || 0
    }));

    // Create plan cards
    normalizedPlans.forEach(plan => {
        const planCard = document.createElement('div');
        planCard.className = 'plan-card';
        
        // Prepare currency options
        const currencyOptions = Object.keys(plan.convertedPrices || {})
            .concat(plan.baseCurrency)
            .filter((value, index, self) => self.indexOf(value) === index);

        planCard.innerHTML = `
            <div class="plan-header">
                <h3>${plan.name}</h3>
                <span class="plan-status ${plan.status}">
                    ${plan.status.charAt(0).toUpperCase() + plan.status.slice(1)}
                </span>
            </div>
            <div class="plan-body">
                <p>${plan.description}</p>
                
                <div class="form-group">
                    <label>Select Currency</label>
                    <select class="form-control plan-currency-selector" data-plan-id="${plan._id}">
                        ${currencyOptions.map(currency => `
                            <option value="${currency}" ${currency === plan.baseCurrency ? 'selected' : ''}>
                                ${this.getCurrencySymbol(currency)} ${currency}
                            </option>
                        `).join('')}
                    </select>
                </div>
                
                <div class="plan-pricing">
                    <div class="monthly-price">
                        Monthly: 
                        <span class="plan-monthly-price">
                            ${this.formatPriceForCurrency(plan, plan.baseCurrency, 'monthly')}
                        </span>
                    </div>
                    <div class="annual-price">
                        Annual: 
                        <span class="plan-annual-price">
                            ${this.formatPriceForCurrency(plan, plan.baseCurrency, 'annual')}
                        </span>
                    </div>
                    ${plan.trialPeriod > 0 ? `
                        <div class="trial-period">
                            Trial Period: ${plan.trialPeriod} days
                        </div>
                    ` : ''}
                </div>
                
                <div class="plan-modules">
                    <strong>Modules:</strong>
                    ${plan.modules.map(module => 
                        `<span class="badge">${typeof module === 'string' ? module : module.name}</span>`
                    ).join('')}
                </div>
            </div>
            <div class="plan-actions">
                <button class="btn btn-sm btn-primary edit-plan" data-id="${plan._id}">Edit</button>
                <button class="btn btn-sm btn-danger delete-plan" data-id="${plan._id}">Delete</button>
            </div>
        `;

        plansContainer.appendChild(planCard);
    });

    // Setup currency selector listeners
    this.setupPlanCurrencySelectors();

    // Setup listeners for plan actions
    this.setupPlanCardListeners();
}

    // Helper method to format price for selected currency
formatPriceForCurrency(plan, currency, type) {
    const currencySymbol = this.getCurrencySymbol(currency);
    
    // If converted prices exist and the currency is different from base
    if (plan.convertedPrices && plan.convertedPrices[currency]) {
        const price = type === 'monthly' 
            ? plan.convertedPrices[currency].monthlyPrice 
            : plan.convertedPrices[currency].annualPrice;
        
        return `${currencySymbol} ${price.toFixed(2)}`;
    }
    
    // Fallback to base currency
    const basePrice = type === 'monthly' ? plan.monthlyRate : plan.annualRate;
    const baseCurrencySymbol = this.getCurrencySymbol(plan.baseCurrency);
    
    return `${baseCurrencySymbol} ${basePrice.toFixed(2)}`;
}


// Method to get currency symbol
getCurrencySymbol(currencyCode) {
    const currencySymbols = {
        'USD': '$',
        'INR': '₹',
        'AED': 'د.إ',
        'QAR': 'ر.ق',
        'GBP': '£'
    };
    return currencySymbols[currencyCode] || currencyCode;
}
setupPlanCurrencySelectors() {
    const currencySelectors = document.querySelectorAll('.plan-currency-selector');
    
    currencySelectors.forEach(selector => {
        selector.addEventListener('change', (e) => {
            const selectedCurrency = e.target.value;
            const planCard = e.target.closest('.plan-card');
            
            // Get current plan data
            const plan = this.getCurrentPlanData(e.target);
            
            if (!plan) {
                console.error('Unable to find plan data');
                return;
            }

            // Update monthly price
            const monthlyPriceElement = planCard.querySelector('.plan-monthly-price');
            monthlyPriceElement.textContent = this.formatPriceForCurrency(plan, selectedCurrency, 'monthly');
            
            // Update annual price
            const annualPriceElement = planCard.querySelector('.plan-annual-price');
            annualPriceElement.textContent = this.formatPriceForCurrency(plan, selectedCurrency, 'annual');
        });
    });
}


    // Helper method to get current plan data
getCurrentPlanData(element) {
    const planId = element.getAttribute('data-plan-id');
    
    // Find the plan in the stored plans array
    const plan = this.plans.find(p => 
        (p._id || p.id) === planId
    );

    if (!plan) {
        console.error('Plan not found:', planId);
        return null;
    }

    // Normalize plan data
    return {
        _id: plan._id || plan.id,
        name: plan.name,
        description: plan.description || 'No description',
        baseCurrency: plan.currency || 'USD',
        convertedPrices: plan.convertedPrices || {},
        monthlyRate: this.normalizePrice(plan.monthlyPrice || plan.monthlyRate),
        annualRate: this.normalizePrice(plan.annualPrice || plan.annualRate),
        status: plan.status || (plan.isActive ? 'active' : 'inactive'),
        modules: plan.modules || plan.features || [],
        trialPeriod: plan.trialPeriod || 0
    };
}


    // Helper method to normalize price
    normalizePrice(price) {
        // Handle different price formats
        if (typeof price === 'object') {
            // Handle MongoDB Decimal128 or similar objects
            return parseFloat(price.$numberDecimal || price.value || 0);
        }
        return parseFloat(price || 0);
    }

    // Setup listeners for plan card actions
    setupPlanCardListeners() {
        console.log('Setting up plan card listeners');

        // Log all edit and delete buttons
        const editButtons = document.querySelectorAll('.edit-plan');
        const deleteButtons = document.querySelectorAll('.delete-plan');

        console.log(`Edit buttons found: ${editButtons.length}`);
        console.log(`Delete buttons found: ${deleteButtons.length}`);

        // Edit Buttons Listener
        editButtons.forEach((button, index) => {
            console.log(`Edit Button ${index}:`, {
                button: button,
                dataId: button.getAttribute('data-id'),
                innerHTML: button.innerHTML
            });

            // Remove existing listeners
            const oldButton = button.cloneNode(true);
            button.parentNode.replaceChild(oldButton, button);

            // Add new listener with comprehensive error handling
            oldButton.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();

                console.log('Edit button clicked');
                console.log('Event target:', e.target);
                console.log('Closest button:', e.target.closest('.edit-plan'));

                try {
                    // Multiple methods to get plan ID
                    const planId = 
                        oldButton.getAttribute('data-id') || 
                        oldButton.dataset.id || 
                        e.target.getAttribute('data-id') || 
                        e.target.dataset.id ||
                        e.target.closest('.edit-plan')?.getAttribute('data-id');

                    console.log('Retrieved Plan ID for Edit:', planId);

                    if (!planId) {
                        console.error('No plan ID found for edit');
                        this.showErrorNotification('Unable to determine plan ID for editing');
                        return;
                    }

                    // Bind context and call method
                    this.editPlan(planId);
                } catch (error) {
                    console.error('Error in edit button listener:', error);
                    this.showErrorNotification(`Edit failed: ${error.message}`);
                }
            });
        });

        // Delete Buttons Listener
        deleteButtons.forEach((button, index) => {
            console.log(`Delete Button ${index}:`, {
                button: button,
                dataId: button.getAttribute('data-id'),
                innerHTML: button.innerHTML
            });

            // Remove existing listeners
            const oldButton = button.cloneNode(true);
            button.parentNode.replaceChild(oldButton, button);

            // Add new listener with comprehensive error handling
            oldButton.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();

                console.log('Delete button clicked');
                console.log('Event target:', e.target);
                console.log('Closest button:', e.target.closest('.delete-plan'));

                try {
                    // Multiple methods to get plan ID
                    const planId = 
                        oldButton.getAttribute('data-id') || 
                        oldButton.dataset.id || 
                        e.target.getAttribute('data-id') || 
                        e.target.dataset.id ||
                        e.target.closest('.delete-plan')?.getAttribute('data-id');

                    console.log('Retrieved Plan ID for Delete:', planId);

                    if (!planId) {
                        console.error('No plan ID found for delete');
                        this.showErrorNotification('Unable to determine plan ID for deletion');
                        return;
                    }

                    // Bind context and call method
                    this.deletePlan(planId);
                } catch (error) {
                    console.error('Error in delete button listener:', error);
                    this.showErrorNotification(`Delete failed: ${error.message}`);
                }
            });
        });

        // Additional logging for debugging
        console.log('Plan card listeners setup complete');
    }
        // Edit Plan Method
    async editPlan(planId) {
        try {
            console.log(`Attempting to edit plan: ${planId}`);

            // Fetch plan details
            const response = await fetch(`${this.baseUrl}/plans/${planId}`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${this.token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error('Failed to fetch plan details');
            }

            const responseData = await response.json();
            const plan = responseData.data;

            // Create edit modal
            this.createEditPlanModal(plan);

        } catch (error) {
            console.error('Error in editPlan:', error);
            
            // Create audit log for edit plan failure
            await this.createAuditLog('PLAN_EDIT_FAILED', {
                planId: planId,
                errorMessage: error.message,
                errorStack: error.stack
            });

            this.showErrorNotification(`Failed to edit plan: ${error.message}`);
        }
    }

    // Create Edit Plan Modal
    createEditPlanModal(plan) {
    console.log('Creating Edit Plan Modal');
    console.log('Full Plan Details:', JSON.stringify(plan, null, 2));

    try {
        // Normalize plan data to handle potential object/string issues
        const normalizedPlan = {
            _id: plan._id || plan.id,
            name: plan.name || '',
            description: plan.description || '',
            currency: plan.currency || 'USD',
            monthlyPrice: this.normalizePrice(plan.monthlyPrice),
            annualPrice: this.normalizePrice(plan.annualPrice),
            trialPeriod: plan.trialPeriod || 0,
            isActive: plan.isActive !== undefined ? plan.isActive : true,
            features: plan.features || plan.modules || []
        };

        // Find or create modal container
        let modalContainer = document.getElementById('planFormModalContainer');
        if (!modalContainer) {
            modalContainer = document.createElement('div');
            modalContainer.id = 'planFormModalContainer';
            document.body.appendChild(modalContainer);
        }

        // Remove existing edit modal
        const existingModal = document.getElementById('planEditModal');
        if (existingModal) {
            existingModal.remove();
        }

        // Create modal HTML
        const modalDiv = document.createElement('div');
        modalDiv.innerHTML = `
            <div class="modal" id="planEditModal" tabindex="-1" role="dialog">
                <div class="modal-dialog modal-lg" role="document">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h5 class="modal-title">Edit Plan: ${normalizedPlan.name}</h5>
                            <button type="button" class="close" data-dismiss="modal" aria-label="Close">
                                <span aria-hidden="true">&times;</span>
                            </button>
                        </div>
                        <div class="modal-body">
                            <form id="planEditForm">
                                <input type="hidden" id="editPlanId" value="${normalizedPlan._id}">
                                <div class="row">
                                    <div class="col-md-6">
                                        <div class="form-group">
                                            <label>Plan Name</label>
                                            <input type="text" class="form-control" id="editPlanName" 
                                                   value="${this.escapeHtml(normalizedPlan.name)}" required>
                                        </div>
                                    </div>
                                    <div class="col-md-6">
                                        <div class="form-group">
                                            <label>Currency</label>
                                            <select class="form-control" id="editPlanCurrency">
                                                ${this.currencies.map(currency => 
                                                    `<option value="${currency.code}" 
                                                        ${currency.code === normalizedPlan.currency ? 'selected' : ''}>
                                                        ${currency.name} (${currency.symbol})
                                                    </option>`
                                                ).join('')}
                                            </select>
                                        </div>
                                    </div>
                                </div>
                                
                                <div class="form-group">
                                    <label>Plan Description</label>
                                    <textarea class="form-control" id="editPlanDescription" rows="3">${this.escapeHtml(normalizedPlan.description)}</textarea>
                                </div>
                                
                                <div class="row">
                                    <div class="col-md-6">
                                        <div class="form-group">
                                            <label>Monthly Rate</label>
                                            <div class="input-group">
                                                <div class="input-group-prepend">
                                                    <span class="input-group-text" id="editCurrencySymbol">${normalizedPlan.currency}</span>
                                                </div>
                                                <input type="number" class="form-control" id="editMonthlyRate" 
                                                       value="${normalizedPlan.monthlyPrice}" min="0" step="0.01" required>
                                            </div>
                                        </div>
                                    </div>
                                    <div class="col-md-6">
                                        <div class="form-group">
                                            <label>Annual Rate</label>
                                            <div class="input-group">
                                                <div class="input-group-prepend">
                                                    <span class="input-group-text" id="editCurrencySymbol">${normalizedPlan.currency}</span>
                                                </div>
                                                <input type="number" class="form-control" id="editAnnualRate" 
                                                       value="${normalizedPlan.annualPrice}" min="0" step="0.01" required>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                
                                <div class="row">
                                    <div class="col-md-6">
                                        <div class="form-group">
                                            <label>Trial Period (Days)</label>
                                            <input type="number" class="form-control" id="editTrialPeriod" 
                                                   value="${normalizedPlan.trialPeriod}" min="0">
                                        </div>
                                    </div>
                                    <div class="col-md-6">
                                        <div class="form-group">
                                            <label>Plan Status</label>
                                            <select class="form-control" id="editPlanStatus">
                                                <option value="active" ${normalizedPlan.isActive ? 'selected' : ''}>Active</option>
                                                <option value="inactive" ${!normalizedPlan.isActive ? 'selected' : ''}>Inactive</option>
                                            </select>
                                        </div>
                                    </div>
                                </div>

                                <div class="form-group">
                                    <label>Select Modules</label>
                                    <div id="editModulesContainer">
                                        <!-- Modules will be dynamically populated -->
                                    </div>
                                </div>
                            </form>
                        </div>
                        <div class="modal-footer">
                            <button type="button" class="btn btn-secondary" data-dismiss="modal">Cancel</button>
                            <button type="button" class="btn btn-primary" id="updatePlanBtn">Update Plan</button>
                        </div>
                    </div>
                </div>
            </div>
        `;

        // Append to container
        modalContainer.appendChild(modalDiv.firstElementChild);

        // Fetch and populate modules
        this.populateModulesForEditModal(normalizedPlan);

        console.log('Modal created and appended');

        // Show modal
        this.showModal('planEditModal');

        // Setup event listeners
        this.setupEditPlanModalListeners(normalizedPlan);

    } catch (error) {
        console.error('Error creating edit plan modal:', error);
        
        // Log the error without using await
        this.createAuditLog('PLAN_EDIT_MODAL_FAILED', {
            errorMessage: error.message,
            errorStack: error.stack
        }).catch(logError => {
            console.error('Failed to create audit log:', logError);
        });

        this.showErrorNotification(`Failed to create edit modal: ${error.message}`);
    }
}

// Helper method to populate modules
populateModulesForEditModal(normalizedPlan) {
    // Fetch available modules
    this.fetchAvailableModules().then(modules => {
        const modulesContainer = document.getElementById('editModulesContainer');
        
        if (modules.length > 0) {
            const modulesHTML = modules.map(module => `
                <div class="form-check">
                    <input class="form-check-input" type="checkbox" 
                           value="${module._id || module.id}" 
                           id="edit-module-${module._id || module.id}"
                           ${this.isModuleSelected(module, normalizedPlan.features) ? 'checked' : ''}>
                    <label class="form-check-label" for="edit-module-${module._id || module.id}">
                        ${this.escapeHtml(module.name)}
                    </label>
                </div>
            `).join('');
            modulesContainer.innerHTML = modulesHTML;
        } else {
            modulesContainer.innerHTML = `
                <div class="alert alert-warning">
                    No modules available. Please add modules first.
                </div>
            `;
        }
    }).catch(error => {
        console.error('Error populating modules:', error);
        const modulesContainer = document.getElementById('editModulesContainer');
        modulesContainer.innerHTML = `
            <div class="alert alert-danger">
                Failed to load modules. ${error.message}
            </div>
        `;
    });
}

// Helper method to check if module is selected
isModuleSelected(module, selectedFeatures) {
    return selectedFeatures.some(f => 
        f._id === module._id || 
        f.id === module.id || 
        f === module.name
    );
}

// Helper method to escape HTML to prevent XSS
escapeHtml(unsafe) {
    return unsafe
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}
        // Setup edit plan modal listeners
    setupEditPlanModalListeners(plan) {
        // Currency symbol update
        const currencySelect = document.getElementById('editPlanCurrency');
        const currencySymbols = document.querySelectorAll('#editCurrencySymbol');
        
        if (currencySelect) {
            currencySelect.addEventListener('change', (e) => {
                const selectedCurrency = this.currencies.find(c => c.code === e.target.value);
                currencySymbols.forEach(symbol => {
                    symbol.textContent = selectedCurrency.symbol;
                });
            });
        }

        // Update plan button
        const updatePlanBtn = document.getElementById('updatePlanBtn');
        if (updatePlanBtn) {
            // Remove existing listeners
            const oldButton = updatePlanBtn.cloneNode(true);
            updatePlanBtn.parentNode.replaceChild(oldButton, updatePlanBtn);

            // Add new listener
            oldButton.addEventListener('click', () => this.updatePlan());
        }

        // Close modal buttons
        const closeButtons = document.querySelectorAll('[data-dismiss="modal"], .close-modal');
        closeButtons.forEach(button => {
            button.addEventListener('click', () => this.hideModal());
        });
    }

    // Update Plan Method
    async updatePlan() {
    try {
        // Collect selected modules
        const selectedModules = Array.from(
            document.querySelectorAll('#editModulesContainer input:checked')
        ).map(checkbox => checkbox.value);

        // Collect form data
        const formData = {
            planId: document.getElementById('editPlanId').value,
            name: document.getElementById('editPlanName').value.trim(),
            description: document.getElementById('editPlanDescription').value.trim(),
            currency: document.getElementById('editPlanCurrency').value,
            monthlyPrice: parseFloat(document.getElementById('editMonthlyRate').value),
            annualPrice: parseFloat(document.getElementById('editAnnualRate').value),
            trialPeriod: parseInt(document.getElementById('editTrialPeriod').value) || 0,
            isActive: document.getElementById('editPlanStatus').value === 'active',
            features: selectedModules
        };

        // Adjust pricing for multiple currencies
        const adjustedPricing = await this.adjustPricingForMultipleCurrencies(formData);

        // Validate form data
        this.validateUpdatePlanData(adjustedPricing);

        // Fetch existing plan details for comparison
        const existingPlanResponse = await fetch(`${this.baseUrl}/plans/${adjustedPricing.planId}`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${this.token}`,
                'Content-Type': 'application/json'
            }
        });
        const existingPlanData = await existingPlanResponse.json();
        const existingPlan = existingPlanData.data;

        // Send update request
        const response = await fetch(`${this.baseUrl}/plans/${adjustedPricing.planId}`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${this.token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(adjustedPricing)
        });

        const responseData = await response.json();

        if (!response.ok) {
            throw new Error(responseData.message || 'Failed to update plan');
        }

        // Create audit log for plan update
        await this.createAuditLog('PLAN_UPDATED', {
            planId: adjustedPricing.planId,
            planName: adjustedPricing.name,
            changes: {
                ...this.calculatePlanChanges(existingPlan, adjustedPricing),
                convertedPrices: adjustedPricing.convertedPrices
            }
        });

        // Show success notification
        this.showSuccessNotification('Plan updated successfully');

        // Refresh plans list
        await this.fetchAndDisplayPlans();

        // Close modal
        this.hideModal();

        return responseData.data;

    } catch (error) {
        // Log error to audit logs
        await this.createAuditLog('PLAN_UPDATE_FAILED', {
            planId: formData?.planId,
            errorMessage: error.message,
            errorStack: error.stack
        });

        this.showErrorNotification(error.message);
        throw error;
    }
}
    
    // Calculate changes between existing and new plan
    calculatePlanChanges(existingPlan, newPlan) {
        const changes = {};

        // Compare each field
        const fieldsToCompare = [
            'name', 'description', 'currency', 
            'monthlyPrice', 'annualPrice', 'isActive', 
            'trialPeriod'
        ];

        fieldsToCompare.forEach(field => {
            // Handle potential nested or object values
            const existingValue = this.normalizeValue(existingPlan[field]);
            const newValue = this.normalizeValue(newPlan[field]);

            if (existingValue !== newValue) {
                changes[field] = {
                    from: existingValue,
                    to: newValue
                };
            }
        });

        // Compare features/modules
        if (JSON.stringify(existingPlan.features) !== JSON.stringify(newPlan.features)) {
            changes.features = {
                from: existingPlan.features,
                to: newPlan.features
            };
        }

        return changes;
    }

    // Helper method to normalize values for comparison
    normalizeValue(value) {
        // Handle different types of values
        if (value === null || value === undefined) return null;
        
        // Handle object types (like Decimal128)
        if (typeof value === 'object') {
            return parseFloat(value.$numberDecimal || value.value || 0);
        }

        // Handle boolean and string values directly
        if (typeof value === 'boolean' || typeof value === 'string') {
            return value;
        }

        // Handle numeric values
        return parseFloat(value);
    }

    // Validate Update Plan Data
    validateUpdatePlanData(formData) {
        const errors = [];

        if (!formData.name || formData.name.length < 3) {
            errors.push('Plan name must be at least 3 characters long');
        }

        if (!formData.description || formData.description.length < 10) {
            errors.push('Description must be at least 10 characters long');
        }

        if (formData.monthlyPrice <= 0) {
            errors.push('Monthly price must be a positive number');
        }

        if (formData.annualPrice <= 0) {
            errors.push('Annual price must be a positive number');
        }

        if (formData.trialPeriod < 0) {
            errors.push('Trial period cannot be negative');
        }

        if (errors.length > 0) {
            throw new Error(errors.join('; '));
        }
    }
        // Delete Plan Method
    async deletePlan(planId) {
        try {
            console.log(`Attempting to delete plan: ${planId}`);

            // Show confirmation modal
            const confirmed = await this.showConfirmationModal(
                'Delete Plan', 
                'Are you sure you want to delete this plan? This action cannot be undone.'
            );

            if (!confirmed) {
                console.log('Plan deletion cancelled');
                return;
            }

            // Fetch plan details before deletion for audit
            const planResponse = await fetch(`${this.baseUrl}/plans/${planId}`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${this.token}`,
                    'Content-Type': 'application/json'
                }
            });
            const planData = await planResponse.json();
            const plan = planData.data;

            // Send delete request
            const response = await fetch(`${this.baseUrl}/plans/${planId}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${this.token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    auditDetails: {
                        planName: plan.name,
                        planDetails: {
                            currency: plan.currency,
                            monthlyPrice: this.normalizePrice(plan.monthlyPrice),
                            annualPrice: this.normalizePrice(plan.annualPrice),
                            trialPeriod: plan.trialPeriod,
                            isActive: plan.isActive,
                            features: plan.features || plan.modules
                        }
                    }
                })
            });

            const responseData = await response.json();

            if (!response.ok) {
                throw new Error(responseData.message || 'Failed to delete plan');
            }

            // Create audit log for plan deletion
            await this.createAuditLog('PLAN_DELETED', {
                planId: planId,
                planName: plan.name,
                planDetails: {
                    currency: plan.currency,
                    monthlyPrice: this.normalizePrice(plan.monthlyPrice),
                    annualPrice: this.normalizePrice(plan.annualPrice),
                    trialPeriod: plan.trialPeriod,
                    isActive: plan.isActive
                }
            });

            // Show success notification
            this.showSuccessNotification('Plan deleted successfully');

            // Refresh plans list
            await this.fetchAndDisplayPlans();

        } catch (error) {
            // Log error to audit logs
            await this.createAuditLog('PLAN_DELETION_FAILED', {
                planId: planId,
                errorMessage: error.message,
                errorStack: error.stack
            });

            console.error('Error deleting plan:', error);
            this.showErrorNotification(error.message);
        }
    }

    // Utility method for confirmation modal
    showConfirmationModal(title, message) {
        return new Promise((resolve) => {
            // Find or create modal container
            let modalContainer = document.getElementById('confirmationModalContainer');
            if (!modalContainer) {
                console.warn('Confirmation modal container not found, creating new container');
                modalContainer = document.createElement('div');
                modalContainer.id = 'confirmationModalContainer';
                document.body.appendChild(modalContainer);
            }

            // Remove existing confirmation modal
            const existingModal = document.getElementById('confirmationModal');
            if (existingModal) {
                existingModal.remove();
            }

            // Create confirmation modal
            const modalDiv = document.createElement('div');
            modalDiv.innerHTML = `
                <div class="modal" id="confirmationModal" tabindex="-1">
                    <div class="modal-dialog">
                        <div class="modal-content">
                            <div class="modal-header">
                                <h5 class="modal-title">${title}</h5>
                                <button type="button" class="close" data-dismiss="modal">&times;</button>
                            </div>
                            <div class="modal-body">
                                <p>${message}</p>
                            </div>
                            <div class="modal-footer">
                                <button type="button" class="btn btn-secondary" data-dismiss="modal">Cancel</button>
                                <button type="button" class="btn btn-danger" id="confirmButton">Confirm</button>
                            </div>
                        </div>
                    </div>
                </div>
            `;

            // Append to container
            modalContainer.appendChild(modalDiv.firstElementChild);

            // Show modal
            this.showModal('confirmationModal');

            // Setup confirmation logic
            const confirmButton = document.getElementById('confirmButton');
            confirmButton.onclick = () => {
                this.hideModal('confirmationModal');
                resolve(true);
            };

            // Cancel logic
            const closeButtons = document.querySelectorAll('#confirmationModal [data-dismiss="modal"]');
            closeButtons.forEach(button => {
                button.onclick = () => {
                    this.hideModal('confirmationModal');
                    resolve(false);
                };
            });
        });
    }

    // Convert prices to all supported currencies
    async convertPricesToAllCurrencies(monthlyRate, annualRate, baseCurrency) {
        const convertedPrices = {
            prices: {}
        };

        // Convert to each supported currency
        for (const currency of this.currencies) {
            if (currency.code !== baseCurrency) {
                convertedPrices.prices[currency.code] = {
                    monthlyRate: await this.convertCurrency(monthlyRate, baseCurrency, currency.code),
                    annualRate: await this.convertCurrency(annualRate, baseCurrency, currency.code)
                };
            }
        }

        return convertedPrices;
    }

    // Fetch live currency rates
    async fetchLiveCurrencyRates() {
        try {
            // Use a reliable, free currency exchange rate API
            const response = await fetch('https://api.exchangerate-api.com/v4/latest/USD');
            
            if (!response.ok) {
                throw new Error('Failed to fetch live currency rates');
            }

            const ratesData = await response.json();
            
            // Update currencies with live rates
            this.currencies = this.currencies.map(currency => {
                if (currency.code === 'USD') {
                    // For USD, create conversion rates for other currencies
                    return {
                        ...currency,
                        conversionRates: {
                            INR: ratesData.rates.INR,
                            AED: ratesData.rates.AED,
                            QAR: ratesData.rates.QAR,
                            GBP: ratesData.rates.GBP
                        }
                    };
                } else {
                    // For other currencies, calculate rates based on USD
                    return {
                        ...currency,
                        conversionRates: {
                            USD: 1 / ratesData.rates[currency.code],
                            INR: ratesData.rates[currency.code] / ratesData.rates.INR,
                            AED: ratesData.rates[currency.code] / ratesData.rates.AED,
                            QAR: ratesData.rates[currency.code] / ratesData.rates.QAR,
                            GBP: ratesData.rates[currency.code] / ratesData.rates.GBP
                        }
                    };
                }
            });

            // Cache rates in localStorage with timestamp
            localStorage.setItem('currencyRates', JSON.stringify({
                rates: this.currencies,
                timestamp: Date.now()
            }));

            return this.currencies;
        } catch (error) {
            console.error('Error fetching live currency rates:', error);
            
            // Fallback to cached rates if available
            const cachedRates = localStorage.getItem('currencyRates');
            if (cachedRates) {
                const { rates, timestamp } = JSON.parse(cachedRates);
                
                // Use cached rates if less than 24 hours old
                if (Date.now() - timestamp < 24 * 60 * 60 * 1000) {
                    this.currencies = rates;
                    return rates;
                }
            }

            // If no cached rates, use predefined rates
            return this.currencies;
        }
    }
        // Currency conversion method with markup
    async convertCurrency(amount, fromCurrency, toCurrency) {
    try {
        // Ensure we have the latest rates
        await this.getCurrencyRates();

        // Find source and target currency configurations
        const sourceCurrency = this.currencies.find(c => c.code === fromCurrency);
        const targetCurrency = this.currencies.find(c => c.code === toCurrency);

        if (!sourceCurrency || !targetCurrency) {
            console.error('Invalid currency conversion');
            return amount;
        }

        // Base conversion
        const baseAmount = amount / sourceCurrency.conversionRates[toCurrency];

        return baseAmount;
    } catch (error) {
        console.error('Currency conversion error:', error);
        return amount;
    }
}

    // Method to get currency rates with caching and auto-refresh
    async getCurrencyRates() {
        const cachedRates = localStorage.getItem('currencyRates');
        
        if (cachedRates) {
            const { rates, timestamp } = JSON.parse(cachedRates);
            
            // Check if cached rates are less than 24 hours old
            if (Date.now() - timestamp < 24 * 60 * 60 * 1000) {
                this.currencies = rates;
                return rates;
            }
        }

        // Fetch fresh rates if no valid cache exists
        return await this.fetchLiveCurrencyRates();
    }

    // Example usage method to demonstrate conversion
    async demonstrateCurrencyConversion() {
        try {
            // Convert 1000 INR to USD
            const convertedAmount = await this.convertCurrency(1000, 'INR', 'USD');
            console.log('Converted Amount:', convertedAmount);
        } catch (error) {
            console.error('Conversion demonstration failed:', error);
        }
    }

    // Audit logging method
   async createAuditLog(action, details) {
    try {
        // Ensure we have a valid token
        if (!this.token) {
            console.warn('No token available for audit logging');
            return null;
        }

        // Prepare log payload
        const logPayload = {
            type: `PLAN_${action.toUpperCase()}`,
            timestamp: new Date().toISOString(),
            userId: this.getUserId() || 'unknown',
            details: {
                ...details,
                ipAddress: await this.safeGetClientIP(),
                userAgent: navigator.userAgent
            }
        };

        // Log the payload for debugging
        console.log('Audit Log Payload:', logPayload);

        // Use a more generic endpoint if plan-activity-logs fails
        const auditLogEndpoints = [
            `${this.baseUrl}/plan-activity-logs`,
            `${this.baseUrl}/audit-logs`,
            `${this.baseUrl}/logs`
        ];

        // Try multiple endpoints
        for (const endpoint of auditLogEndpoints) {
            try {
                const response = await fetch(endpoint, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${this.token}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(logPayload)
                });

                // Log response details
                console.log(`Audit Log Response from ${endpoint}:`, {
                    status: response.status,
                    statusText: response.statusText
                });

                if (response.ok) {
                    return logPayload;
                }
            } catch (endpointError) {
                console.warn(`Failed to log to ${endpoint}:`, endpointError);
            }
        }

        // Fallback logging
        console.warn('Failed to log audit entry through all endpoints');
        return null;

    } catch (error) {
        console.error('Comprehensive Audit Logging Error:', error);
        return null;
    }
}
    // Method to get client IP
    async safeGetClientIP() {
    try {
        const response = await fetch('https://api.ipify.org?format=json');
        const data = await response.json();
        return data.ip;
    } catch (error) {
        console.warn('Could not fetch IP address');
        return 'Unknown';
    }
}

    // Get user ID from local storage
    getUserId() {
        const userData = JSON.parse(localStorage.getItem('userData'));
        return userData ? userData._id : null;
    }

    // Show success notification
    showSuccessNotification(message) {
        console.log(message);
        // Fallback notification if no global notification system
        alert(message);
    }

    // Fetch plan activity logs
   async fetchPlanActivityLogs(
    type = 'all', 
    page = 1, 
    limit = 10, 
    dateFrom = null, 
    dateTo = null
) {
    try {
        // Construct query parameters
        const params = new URLSearchParams({
            type,
            page: page.toString(),
            limit: limit.toString()
        });

        // Add date filters if they exist
        if (dateFrom) {
            params.append('dateFrom', dateFrom);
        }
        if (dateTo) {
            params.append('dateTo', dateTo);
        }

        const response = await fetch(`${this.baseUrl}/plan-activity-logs?${params}`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${this.token}`,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            throw new Error('Failed to fetch activity logs');
        }

        return await response.json();
    } catch (error) {
        console.error('Error fetching activity logs:', error);
        this.showErrorNotification('Failed to load activity logs');
        return { logs: [], total: 0 };
    }
}

    // Method to get meaningful user information
getUserDisplayInfo(log) {
    // Check for user details in different possible locations
    const userDetails = 
        log.user || 
        log.details?.user || 
        log.details?.userDetails || 
        {};

    // Prioritize name, then email, then fallback
    const name = userDetails.name || 
                 userDetails.fullName || 
                 userDetails.username || 
                 userDetails.email?.split('@')[0] ||
                 'System User';
    
    const email = userDetails.email || 'system@example.com';

    return {
        name: name,
        email: email,
        initials: this.generateUserInitials(name)
    };
}


// Generate user initials with more robust logic
generateUserInitials(name) {
    if (!name) return 'SU';

    // Try to get initials from full name
    const initials = name
        .split(' ')
        .map(word => word[0])
        .join('')
        .toUpperCase()
        .slice(0, 2);

    return initials || 'SU';
}



    // Render activity logs
    renderActivityLogs(logs) {
    const container = document.getElementById('activityLogContainer');
    const loadMoreBtn = document.getElementById('loadMoreActivitiesBtn');

    // Clear existing content
    container.innerHTML = '';

    if (logs.length === 0) {
        container.innerHTML = `
            <div class="no-activities-placeholder">
                <i class="fas fa-inbox text-muted"></i>
                <p>No recent activities</p>
            </div>
        `;
        loadMoreBtn.style.display = 'none';
        return;
    }

    // Render activity logs with enhanced details
    logs.forEach(log => {
        // Get user display information
        const userInfo = this.getUserDisplayInfo(log);

        const logItem = document.createElement('div');
        logItem.className = 'activity-log-item';
        
        // Enhanced icon and color mapping
        const iconMap = {
            'PLAN_CREATED': { 
                icon: 'fa-plus-circle', 
                color: 'text-success',
                category: 'Plan Creation'
            },
            'PLAN_UPDATED': { 
                icon: 'fa-edit', 
                color: 'text-warning',
                category: 'Plan Update'
            },
            'PLAN_DELETED': { 
                icon: 'fa-trash-alt', 
                color: 'text-danger',
                category: 'Plan Deletion'
            },
            'PLAN_DETAILS_VIEWED': { 
                icon: 'fa-eye', 
                color: 'text-info',
                category: 'Plan Viewed'
            },
            'PLAN_EDIT_MODAL_FAILED': { 
                icon: 'fa-exclamation-triangle', 
                color: 'text-warning',
                category: 'Modal Error'
            },
            'PLAN_CREATION_FAILED': { 
                icon: 'fa-times-circle', 
                color: 'text-danger',
                category: 'Creation Error'
            },
            'PLAN_UPDATE_FAILED': { 
                icon: 'fa-times-circle', 
                color: 'text-danger',
                category: 'Update Error'
            },
            'PLAN_DELETION_FAILED': { 
                icon: 'fa-times-circle', 
                color: 'text-danger',
                category: 'Deletion Error'
            }
        };

        // Get log details
        const logDetails = iconMap[log.type] || { 
            icon: 'fa-history', 
            color: 'text-muted',
            category: 'System Activity'
        };

        // Format timestamp
        const formattedTime = this.formatDetailedTimestamp(log.timestamp);

        // Generate user avatar with dynamic color
        const avatarHue = this.generateHueFromString(userInfo.name);

        // Prepare log message
        const logMessage = this.formatActivityLogMessage(log);

        // Prepare additional context
        const additionalContext = this.prepareLogContext(log);

        logItem.innerHTML = `
            <div class="activity-log-card">
                <div class="activity-log-header">
                    <div class="activity-icon-container">
                        <i class="fas ${logDetails.icon} ${logDetails.color} activity-icon"></i>
                    </div>
                    <div class="activity-header-details">
                        <div class="activity-category">${logDetails.category}</div>
                        <div class="activity-timestamp">${formattedTime}</div>
                    </div>
                </div>
                <div class="activity-log-body">
                    <div class="activity-main-message">
                        ${this.escapeHtml(logMessage)}
                    </div>
                    <div class="activity-user-details">
                        <div class="user-avatar">
                            <div class="user-initials-avatar" style="background-color: hsl(${avatarHue}, 50%, 50%);">
                                ${userInfo.initials}
                            </div>
                        </div>
                        <div class="user-info">
                            <div class="user-name">${this.escapeHtml(userInfo.name)}</div>
                            <div class="user-email">${this.escapeHtml(userInfo.email)}</div>
                        </div>
                    </div>
                    ${additionalContext ? `
                        <div class="activity-additional-context">
                            <strong>Details:</strong>
                            <pre>${this.escapeHtml(JSON.stringify(additionalContext, null, 2))}</pre>
                        </div>
                    ` : ''}
                </div>
            </div>
        `;

        container.appendChild(logItem);
    });

    // Handle load more button
    if (logs.length >= 10) {
        loadMoreBtn.style.display = 'block';
    } else {
        loadMoreBtn.style.display = 'none';
    }
}


    // Helper method to prepare additional context
prepareAdditionalContext(log) {
    const context = this.prepareLogContext(log);
    if (!context) return '';

    return `
        <div class="activity-additional-context">
            <strong>Details:</strong>
            <pre>${JSON.stringify(context, null, 2)}</pre>
        </div>
    `;
}


    // Format detailed timestamp
formatDetailedTimestamp(timestamp) {
    const date = new Date(timestamp);
    return date.toLocaleString('en-US', {
        weekday: 'short',
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: true
    });
}
// Prepare additional context for log
prepareLogContext(log) {
    // More comprehensive context extraction
    const contextExtractors = {
        'PLAN_CREATED': (details) => ({
            'Plan Name': details?.planName || details?.name,
            'Monthly Price': details?.planDetails?.monthlyPrice,
            'Annual Price': details?.planDetails?.annualPrice,
            'Currency': details?.planDetails?.currency,
            'Active': details?.planDetails?.isActive
        }),
        'PLAN_UPDATED': (details) => {
            if (!details?.changes) return null;
            
            return Object.entries(details.changes).reduce((acc, [key, value]) => {
                acc[key] = {
                    from: value.from,
                    to: value.to
                };
                return acc;
            }, {});
        },
        'PLAN_DELETED': (details) => ({
            'Plan Name': details?.planName,
            'Deletion Time': new Date().toISOString()
        })
    };

    // Extract context based on log type
    const extractor = contextExtractors[log.type];
    return extractor ? extractor(log.details) : null;
}



// Generate user avatar
generateUserAvatar(userName, userEmail) {
    // Prefer full name, fall back to email
    const displayName = userName || userEmail.split('@')[0];

    // Generate initials
    const initials = displayName
        .split(' ')
        .map(word => word[0])
        .join('')
        .toUpperCase()
        .slice(0, 2);

    // Generate a consistent color based on the name/email
    const hue = this.generateHueFromString(displayName);
    
    return `
        <div class="user-initials-avatar" style="background-color: hsl(${hue}, 50%, 50%);">
            ${initials}
        </div>
    `;
}
// Generate consistent color hue from string
generateHueFromString(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    return Math.abs(hash) % 360;
}


    // Format activity log message
   formatActivityLogMessage(log) {
    // Detailed log type mapping
    const logTypeDetails = {
        'PLAN_CREATED': {
            baseMessage: 'Created plan',
            getDetails: (details) => {
                const planName = details?.planName || details?.name || 'Unnamed Plan';
                const currency = details?.planDetails?.currency || '';
                const monthlyPrice = details?.planDetails?.monthlyPrice ? 
                    `${currency} ${details.planDetails.monthlyPrice}` : '';
                
                return `${planName} ${monthlyPrice ? `(${monthlyPrice} monthly)` : ''}`;
            }
        },
        'PLAN_UPDATED': {
            baseMessage: 'Updated plan',
            getDetails: (details) => {
                const planName = details?.planName || 'Unnamed Plan';
                const changes = details?.changes ? 
                    Object.keys(details.changes).join(', ') : 
                    'No specific changes';
                
                return `${planName} (Changes: ${changes})`;
            }
        },
        'PLAN_DELETED': {
            baseMessage: 'Deleted plan',
            getDetails: (details) => {
                return details?.planName || details?.name || 'Unnamed Plan';
            }
        },
        'PLAN_DETAILS_VIEWED': {
            baseMessage: 'Viewed plan details',
            getDetails: (details) => {
                return details?.planName || details?.name || 'Unnamed Plan';
            }
        },
        'PLAN_EDIT_MODAL_FAILED': {
            baseMessage: 'Failed to open edit modal',
            getDetails: (details) => details?.errorMessage || 'Unknown error'
        },
        'PLAN_CREATION_FAILED': {
            baseMessage: 'Plan creation failed',
            getDetails: (details) => details?.errorMessage || 'Unknown error'
        }
    };

    // Get log type details
    const logType = logTypeDetails[log.type] || {
        baseMessage: log.type,
        getDetails: () => ''
    };

    // Construct full message
    const baseMessage = logType.baseMessage;
    const details = logType.getDetails(log.details);

    return `${baseMessage}: ${details}`;
}


    // Format timestamp
   formatDetailedTimestamp(timestamp) {
    const date = new Date(timestamp);
    return date.toLocaleString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
    });
}

    // Initialize activity log functionality
    initializeActivityLogFeature() {
        // Wait for DOM to be fully loaded
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', this.setupActivityLogFeature.bind(this));
        } else {
            this.setupActivityLogFeature();
        }
    }

    // Setup activity log feature
    setupActivityLogFeature() {
    // Initialize filter state
    this.activityLogFilters = {
        type: 'all',
        dateFrom: null,
        dateTo: null,
        page: 1,
        limit: 10
    };

    // Get elements with null checks
    const filterSelect = document.getElementById('activityLogFilter');
    const loadMoreBtn = document.getElementById('loadMoreActivitiesBtn');
    const dateFromInput = document.getElementById('activityLogDateFrom');
    const dateToInput = document.getElementById('activityLogDateTo');
    const applyFiltersBtn = document.getElementById('applyActivityLogFilters');
    const resetFiltersBtn = document.getElementById('resetActivityLogFilters');

    // Initial load
    this.loadActivityLogs();

    // Filter change event for activity type
    if (filterSelect) {
        filterSelect.addEventListener('change', (e) => {
            this.activityLogFilters.type = e.target.value;
            this.activityLogFilters.page = 1;
            this.loadActivityLogs();
        });
    }

    // Apply filters button
    if (applyFiltersBtn) {
        applyFiltersBtn.addEventListener('click', () => {
            // Update filters
            this.activityLogFilters.type = filterSelect.value;
            this.activityLogFilters.dateFrom = dateFromInput.value ? 
                new Date(dateFromInput.value).toISOString() : null;
            this.activityLogFilters.dateTo = dateToInput.value ? 
                new Date(dateToInput.value).toISOString() : null;
            this.activityLogFilters.page = 1;

            // Load logs with new filters
            this.loadActivityLogs();
        });
    }

    // Reset filters button
    if (resetFiltersBtn) {
        resetFiltersBtn.addEventListener('click', () => {
            // Reset input fields
            filterSelect.value = 'all';
            dateFromInput.value = '';
            dateToInput.value = '';

            // Reset filter state
            this.activityLogFilters = {
                type: 'all',
                dateFrom: null,
                dateTo: null,
                page: 1,
                limit: 10
            };

            // Reload logs
            this.loadActivityLogs();
        });
    }

    // Load more button
    if (loadMoreBtn) {
        loadMoreBtn.addEventListener('click', () => {
            // Increment page for load more functionality
            this.activityLogFilters.page++;
            this.loadMoreActivityLogs();
        });
    }
}
    // Load activity logs
   async loadActivityLogs() {
    try {
        // Fetch logs with current filters
        const data = await this.fetchPlanActivityLogs(
            this.activityLogFilters.type, 
            this.activityLogFilters.page, 
            this.activityLogFilters.limit,
            this.activityLogFilters.dateFrom,
            this.activityLogFilters.dateTo
        );

        // Render logs
        this.renderActivityLogsTable(data.logs);

        // Update load more button visibility
        const loadMoreBtn = document.getElementById('loadMoreActivitiesBtn');
        if (loadMoreBtn) {
            loadMoreBtn.style.display = 
                data.logs.length < this.activityLogFilters.limit ? 'none' : 'block';
        }

    } catch (error) {
        console.error('Error loading activity logs:', error);
    }
}

  renderActivityLogsTable(logs) {
    const tableBody = document.getElementById('activityLogTableBody');
    
    // Clear existing rows
    tableBody.innerHTML = '';

    // Check if no logs
    if (!logs || logs.length === 0) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="5" class="text-center">
                    <div class="no-activities-placeholder">
                        <i class="fas fa-inbox text-muted"></i>
                        <p>No recent activities</p>
                    </div>
                </td>
            </tr>
        `;
        return;
    }

    // Render logs
    logs.forEach((log, index) => {
        // Determine activity type
        const activityTypeMap = {
            'PLAN_CREATED': 'Plan Created',
            'PLAN_UPDATED': 'Plan Updated',
            'PLAN_DELETED': 'Plan Deleted',
            'PLAN_VIEWED': 'Plan Viewed'
        };

        // Get user information
        const userName = log.user?.name || 
                         log.details?.user?.name || 
                         log.details?.userName || 
                         'System User';

        // Prepare log details for modal
        const logDetails = this.prepareLogContext(log) || {};
        
        // Create table row
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${this.formatDetailedTimestamp(log.timestamp)}</td>
            <td>${activityTypeMap[log.type] || log.type}</td>
            <td>${this.extractPlanName(log)}</td>
            <td>${userName}</td>
            <td>
                <button class="btn btn-sm btn-info" data-log-index="${index}">
                    View Details
                </button>
            </td>
        `;

        // Add click event listener to the button
        const detailsButton = row.querySelector('button');
        detailsButton.addEventListener('click', () => {
            this.showLogDetails(logDetails);
        });

        tableBody.appendChild(row);
    });

    // Update load more button visibility
    const loadMoreBtn = document.getElementById('loadMoreActivitiesBtn');
    if (loadMoreBtn) {
        loadMoreBtn.style.display = logs.length < 10 ? 'none' : 'block';
    }
}

    // Method to show log details within the class
showLogDetails(logDetails) {
    try {
        const modalBody = document.getElementById('logDetailsModalBody');
        const modal = document.getElementById('logDetailsModal');
        
        // Convert log details to formatted JSON string
        const formattedDetails = JSON.stringify(logDetails, null, 2);
        
        // Populate modal body
        modalBody.innerHTML = `<pre>${this.escapeHtml(formattedDetails)}</pre>`;
        
        // Show modal using vanilla JavaScript
        modal.classList.add('show');
        modal.style.display = 'block';
        
        // Add backdrop
        const backdrop = document.createElement('div');
        backdrop.classList.add('modal-backdrop', 'fade', 'show');
        document.body.appendChild(backdrop);

        // Close modal functionality
        const closeButtons = modal.querySelectorAll('[data-dismiss="modal"]');
        closeButtons.forEach(button => {
            button.addEventListener('click', () => {
                modal.classList.remove('show');
                modal.style.display = 'none';
                backdrop.remove();
            });
        });
    } catch (error) {
        console.error('Error showing log details:', error);
        this.showErrorNotification('Failed to display log details');
    }
}




    // Ensure these methods are defined in the class
formatTimestamp(timestamp) {
    const date = new Date(timestamp);
    return date.toLocaleString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

    // Helper methods
formatActivityType(type) {
    const typeMap = {
        'PLAN_CREATED': 'Plan Created',
        'PLAN_UPDATED': 'Plan Updated',
        'PLAN_DELETED': 'Plan Deleted',
        'PLAN_VIEWED': 'Plan Viewed'
    };
    return typeMap[type] || type;
}

extractPlanName(log) {
    return log.details?.planName || 
           log.details?.name || 
           log.details?.planDetails?.name || 
           'Unnamed Plan';
}
    
formatUserInfo(log) {
    const user = log.user || log.details?.user || {};
    return user.name || user.email || 'System User';
}

prepareLogDetails(log) {
    return encodeURIComponent(JSON.stringify(log.details || {}, null, 2));
}



    // Load more activity logs
    async loadMoreActivityLogs() {
    try {
        // Fetch next page of logs
        const data = await this.fetchPlanActivityLogs(
            this.activityLogFilters.type, 
            this.activityLogFilters.page, 
            this.activityLogFilters.limit,
            this.activityLogFilters.dateFrom,
            this.activityLogFilters.dateTo
        );

        // Append new logs to existing container
        const container = document.getElementById('activityLogTableBody');
        
        if (data.logs.length === 0) {
            // No more logs to load
            const loadMoreBtn = document.getElementById('loadMoreActivitiesBtn');
            if (loadMoreBtn) loadMoreBtn.style.display = 'none';
            return;
        }

        // Render and append new logs
        data.logs.forEach(log => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${this.formatDetailedTimestamp(log.timestamp)}</td>
                <td>${this.formatActivityType(log.type)}</td>
                <td>${this.extractPlanName(log)}</td>
                <td>${this.formatUserInfo(log)}</td>
                <td>
                    <button class="btn btn-sm btn-info" onclick="showLogDetails('${this.prepareLogDetails(log)}')">
                        View Details
                    </button>
                </td>
            `;
            container.appendChild(row);
        });

        // Update load more button visibility
        const loadMoreBtn = document.getElementById('loadMoreActivitiesBtn');
        if (loadMoreBtn) {
            loadMoreBtn.style.display = 
                data.logs.length < this.activityLogFilters.limit ? 'none' : 'block';
        }

    } catch (error) {
        console.error('Error loading more activity logs:', error);
        this.showErrorNotification('Failed to load more activities');
    }
}

}

// Expose the PricingManager to the global window object
window.PricingManager = PricingManager;
})();

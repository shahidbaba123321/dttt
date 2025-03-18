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

        // Initialize plans and subscriptions
        this.plans = [];
        this.subscriptions = [];

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

        // Bind methods to ensure correct context
        this.bindMethods();

        // Initialize event listeners and setup
        this.initializeEventListeners();
        this.setupSubscriptionManagementListeners();
    }

    // Method to bind all class methods
    bindMethods() {
        const methodsToBind = [
            // Plan-related methods
            'showPlanCreationModal',
            'setupPlanCreationModalListeners',
            'fetchAndDisplayPlans',
            'displayPlans',
            'savePlan',
            'editPlan',
            'deletePlan',
            'validatePlanData',

            // Subscription-related methods
            'showSubscriptionCreationModal',
            'createSubscription',
            'fetchSubscriptions',
            'displaySubscriptions',
            'showSubscriptionEditModal',
            'updateSubscription',

            // Utility methods
            'showModal',
            'hideModal',
            'showErrorNotification',
            'showSuccessNotification',
            'getInputValue',
            'getNumericInputValue',

            // Logging methods
            'createAuditLog',
            'storeLogLocally',
            'syncLocalLogs',

            // Currency methods
            'convertCurrency',
            'fetchLiveCurrencyRates'
        ];

        methodsToBind.forEach(method => {
            if (typeof this[method] === 'function') {
                this[method] = this[method].bind(this);
            } else {
                console.warn(`Method ${method} not found during binding`);
            }
        });
    }

    // Initialize event listeners
    initializeEventListeners() {
        try {
            // Plan creation button
            const addNewPlanBtn = document.getElementById('addNewPlanBtn');
            if (addNewPlanBtn) {
                addNewPlanBtn.addEventListener('click', this.showPlanCreationModal);
            }

            // Subscription creation button
            const createSubscriptionBtn = document.getElementById('createNewSubscriptionBtn');
            if (createSubscriptionBtn) {
                createSubscriptionBtn.addEventListener('click', this.showSubscriptionCreationModal);
            }

            // Initial data fetching
            this.fetchAndDisplayPlans();
            this.fetchSubscriptions();

        } catch (error) {
            console.error('Error initializing event listeners:', error);
        }
    }

    // Setup subscription management listeners
    setupSubscriptionManagementListeners() {
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

        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', checkAndInitialize);
        } else {
            checkAndInitialize();
        }
    }

    // Initialize subscription event listeners
    initializeSubscriptionEventListeners() {
        try {
            // Fetch and display subscriptions
            this.fetchSubscriptions();
        } catch (error) {
            console.error('Error in subscription event listeners:', error);
        }
    }

    // Reinitialize event listeners method
    reinitializeEventListeners() {
        try {
            this.initializeEventListeners();
            this.setupPlanCardListeners();
            this.setupSubscriptionCardListeners();
        } catch (error) {
            console.error('Error in reinitializeEventListeners:', error);
        }
    }
}
       // Helper method to escape HTML to prevent XSS
    escapeHtml(unsafe) {
        if (!unsafe) return '';
        return unsafe
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
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

    // Show error notification
    showErrorNotification(message) {
        console.error('Error Notification:', message);
        
        // Create error notification element
        const notificationContainer = document.createElement('div');
        notificationContainer.className = 'error-notification';
        notificationContainer.innerHTML = `
            <div class="alert alert-danger alert-dismissible fade show" role="alert">
                <strong>Error!</strong> ${this.escapeHtml(message)}
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

    // Show success notification
    showSuccessNotification(message) {
        console.log('Success Notification:', message);
        
        // Create success notification element
        const notificationContainer = document.createElement('div');
        notificationContainer.className = 'success-notification';
        notificationContainer.innerHTML = `
            <div class="alert alert-success alert-dismissible fade show" role="alert">
                <strong>Success!</strong> ${this.escapeHtml(message)}
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

    // Get user ID from local storage
    getUserId() {
        const userData = JSON.parse(localStorage.getItem('userData'));
        return userData ? userData._id : null;
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

            // Apply markup if exists
            const markup = this.getMarkup(fromCurrency, toCurrency);
            const adjustedAmount = markup ? baseAmount * markup : baseAmount;

            return Math.round(adjustedAmount * 100) / 100;
        } catch (error) {
            console.error('Currency conversion error:', error);
            return amount;
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

    // Get currency symbol
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

    // Demonstrate currency conversion (example method)
    async demonstrateCurrencyConversion() {
        try {
            // Convert 1000 INR to USD
            const convertedAmount = await this.convertCurrency(1000, 'INR', 'USD');
            console.log('Converted Amount:', convertedAmount);
        } catch (error) {
            console.error('Conversion demonstration failed:', error);
        }
    }
}
    // Show Plan Creation Modal
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

            // Remove any existing modal
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

            // Setup event listeners
            this.setupPlanCreationModalListeners(modules);

            // Show modal
            this.showModal('planCreationModal');

        } catch (error) {
            console.error('Error creating plan creation modal:', error);
            this.showErrorNotification(`Failed to create plan modal: ${error.message}`);
        }
    }

    // Setup event listeners for plan creation modal
    setupPlanCreationModalListeners(modules) {
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
                this.savePlan(modules || []);
            });
        }

        // Close modal buttons
        const closeButtons = document.querySelectorAll('[data-dismiss="modal"], .close-modal');
        closeButtons.forEach(button => {
            button.addEventListener('click', () => this.hideModal('planCreationModal'));
        });
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
            this.hideModal('planCreationModal');

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
                ${errors.map(error => `<li>${this.escapeHtml(error)}</li>`).join('')}
            </ul>
        `;

        // Insert error container at the top of the modal body
        modalBody.insertBefore(errorContainer, modalBody.firstChild);
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

            // Fetch plans
            const response = await fetch(`${this.baseUrl}/plans`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${this.token}`,
                    'Content-Type': 'application/json'
                }
            });

            // Check response
            if (!response.ok) {
                throw new Error('Failed to fetch plans');
            }

            const responseData = await response.json();

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
            console.error('Comprehensive Plan Fetch Error:', error);
            
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
                    <h3>${this.escapeHtml(plan.name)}</h3>
                    <span class="plan-status ${plan.status}">
                        ${plan.status.charAt(0).toUpperCase() + plan.status.slice(1)}
                    </span>
                </div>
                <div class="plan-body">
                    <p>${this.escapeHtml(plan.description)}</p>
                    
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

    // Setup listeners for plan card actions
    setupPlanCardListeners() {
        console.log('Setting up plan card listeners');

        // Edit Buttons Listener
        const editButtons = document.querySelectorAll('.edit-plan');
        editButtons.forEach(button => {
            // Remove existing listeners
            const oldButton = button.cloneNode(true);
            button.parentNode.replaceChild(oldButton, button);

            // Add new listener
            oldButton.addEventListener('click', (e) => {
                const planId = oldButton.getAttribute('data-id');
                this.editPlan(planId);
            });
        });

        // Delete Buttons Listener
        const deleteButtons = document.querySelectorAll('.delete-plan');
        deleteButtons.forEach(button => {
            // Remove existing listeners
            const oldButton = button.cloneNode(true);
            button.parentNode.replaceChild(oldButton, button);

            // Add new listener
            oldButton.addEventListener('click', (e) => {
                const planId = oldButton.getAttribute('data-id');
                this.deletePlan(planId);
            });
        });
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
                }
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
}
    // Setup plan currency selectors
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
                                <h5 class="modal-title">${this.escapeHtml(title)}</h5>
                                <button type="button" class="close" data-dismiss="modal">&times;</button>
                            </div>
                            <div class="modal-body">
                                <p>${this.escapeHtml(message)}</p>
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
                type: action.toUpperCase(),
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

            // Send to backend logging endpoint
            const response = await fetch(`${this.baseUrl}/activity-logs`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(logPayload)
            });

            // Check response
            if (!response.ok) {
                throw new Error('Failed to create audit log');
            }

            return logPayload;

        } catch (error) {
            console.error('Audit logging error:', error);
            
            // Store locally if logging fails
            this.storeLogLocally(logPayload);
            
            return null;
        }
    }

    // Method to store logs locally when remote logging fails
    storeLogLocally(logPayload) {
        try {
            // Retrieve existing logs or initialize
            const storedLogs = JSON.parse(localStorage.getItem('activityLogs') || '[]');
            
            // Add new log
            storedLogs.push({
                ...logPayload,
                localStorageTimestamp: new Date().toISOString()
            });

            // Limit local storage to last 100 logs
            const trimmedLogs = storedLogs.slice(-100);

            // Store back in local storage
            localStorage.setItem('activityLogs', JSON.stringify(trimmedLogs));

            console.warn('Log stored locally due to remote logging failure');
        } catch (error) {
            console.error('Error storing log locally:', error);
        }
    }

    // Method to sync local logs
    async syncLocalLogs() {
        try {
            // Retrieve local logs
            const storedLogs = JSON.parse(localStorage.getItem('activityLogs') || '[]');
            
            if (storedLogs.length === 0) return;

            // Try to send logs to server
            const response = await fetch(`${this.baseUrl}/activity-logs/bulk`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(storedLogs)
            });

            // If successful, clear local logs
            if (response.ok) {
                localStorage.removeItem('activityLogs');
                console.log('Local logs synced successfully');
            }
        } catch (error) {
            console.error('Error syncing local logs:', error);
        }
    }
}
    // Get user ID from local storage
    getUserId() {
        const userData = JSON.parse(localStorage.getItem('userData'));
        return userData ? userData._id : null;
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

    // Generate consistent color hue from string
    generateHueFromString(str) {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            hash = str.charCodeAt(i) + ((hash << 5) - hash);
        }
        return Math.abs(hash) % 360;
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

    // Render activity logs table
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

    // Helper methods for log rendering
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

    // Method to show log details
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
}

// Expose the PricingManager to the global window object
window.PricingManager = PricingManager;
})();

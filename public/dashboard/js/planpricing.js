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
        this.currentPage = 1;
        this.pageSize = 10;
        this.totalPlans = 0;

        // Currency configurations
        this.currencies = [
            { code: 'USD', symbol: '$', name: 'US Dollar', conversionRates: {
                INR: 0.012, 
                AED: 0.27, 
                QAR: 0.27, 
                GBP: 0.79
            }},
            { code: 'INR', symbol: '₹', name: 'Indian Rupee', conversionRates: {
                USD: 83.50, 
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
        this.showPlanCreationModal = this.showPlanCreationModal.bind(this);
        this.setupPlanCreationModalListeners = this.setupPlanCreationModalListeners.bind(this);
        this.showModal = this.showModal.bind(this);
        this.hideModal = this.hideModal.bind(this);

        // Initialize event listeners and setup
        this.initializeEventListeners();
        this.fetchAndDisplayPlans();
        this.debugModulesEndpoint();
    }

    // Method to initialize event listeners
    initializeEventListeners() {
        const addNewPlanBtn = document.getElementById('addNewPlanBtn');
        if (addNewPlanBtn) {
            addNewPlanBtn.addEventListener('click', () => this.showPlanCreationModal());
        }
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
                return null;
            }

            // Base conversion
            const baseAmount = amount / sourceCurrency.conversionRates[toCurrency];

            // Apply markup if exists
            const markupRules = this.markupRules[fromCurrency];
            if (markupRules && markupRules[toCurrency]) {
                return baseAmount * markupRules[toCurrency];
            }

            return baseAmount;
        } catch (error) {
            console.error('Currency conversion error:', error);
            return null;
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
        console.error(message);
        // Fallback notification if no global notification system
        alert(message);
    }


    


    // Create dynamic plan creation modal
    async showPlanCreationModal() {
        try {
            // Fetch available modules
            const modules = await this.fetchAvailableModules();

            // Create modal container
            const modalContainer = document.getElementById('planFormModalContainer');
            if (!modalContainer) {
                throw new Error('Modal container not found');
            }

            modalContainer.innerHTML = `
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
                                    
                                    <div class="form-group">
                                        <label>Plan Status</label>
                                        <select class="form-control" id="planStatus">
                                            <option value="active">Active</option>
                                            <option value="inactive">Inactive</option>
                                        </select>
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
                                                            ${module.name}
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
                                <button type="button" class="btn btn-secondary close-modal" data-dismiss="modal">Cancel</button>
                                <button type="button" class="btn btn-primary" id="savePlanBtn" ${modules.length === 0 ? 'disabled' : ''}>
                                    Save Plan
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            `;

            // Create method to show modal
            this.showModal();

            // Add event listeners
            this.setupPlanCreationModalListeners(modules);

        } catch (error) {
            console.error('Error creating plan modal:', error);
            this.showErrorNotification(`Failed to create plan modal: ${error.message}`);
        }
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



    showModal() {
        const modal = document.getElementById('planCreationModal');
        if (modal) {
            modal.style.display = 'block';
            modal.classList.add('show');
            
            // Add backdrop
            const backdrop = document.createElement('div');
            backdrop.classList.add('modal-backdrop', 'fade', 'show');
            document.body.appendChild(backdrop);

            // Close on backdrop click
            backdrop.addEventListener('click', () => this.hideModal());

            // Close on escape key
            document.addEventListener('keydown', this.handleEscapeKey);
        }
    }

    hideModal() {
        const modal = document.getElementById('planCreationModal');
        const backdrop = document.querySelector('.modal-backdrop');
        
        if (modal) {
            modal.style.display = 'none';
            modal.classList.remove('show');
        }
        
        if (backdrop) {
            backdrop.remove();
        }

        // Remove escape key listener
        document.removeEventListener('keydown', this.handleEscapeKey);
    }

handleEscapeKey = (event) => {
        if (event.key === 'Escape') {
            this.hideModal();
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
            savePlanBtn.addEventListener('click', () => {
                this.savePlan(modules);
                this.hideModal();
            });
        }
        // Close modal buttons
        const closeButtons = document.querySelectorAll('[data-dismiss="modal"], .close-modal');
        closeButtons.forEach(button => {
            button.addEventListener('click', () => this.hideModal());
        });
    }


    // Add this method to the PricingManager class
async createAuditLog(action, details) {
    try {
        const logPayload = {
            type: `PLAN_${action.toUpperCase()}`,
            timestamp: new Date().toISOString(),
            userId: this.getUserId(), // Implement method to get current user ID
            details: {
                ...details,
                ipAddress: await this.getClientIP(),
                userAgent: navigator.userAgent
            }
        };

        const response = await fetch(`${this.baseUrl}/audit-logs`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${this.token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(logPayload)
        });

        if (!response.ok) {
            console.warn('Failed to create audit log', await response.json());
        }

        return logPayload;
    } catch (error) {
        console.error('Audit logging error:', error);
    }
}

// Method to get client IP (optional, can use server-side method)
async getClientIP() {
    try {
        const response = await fetch('https://api.ipify.org?format=json');
        const data = await response.json();
        return data.ip;
    } catch (error) {
        console.warn('Could not fetch IP address');
        return 'Unknown';
    }
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
        // Validate plan form data
    validatePlanData(formData, modules) {
        const errors = [];

        // Name validation
        if (!formData.name || formData.name.trim().length < 3) {
            errors.push('Plan name must be at least 3 characters long');
        }

        // Description validation (optional, but with max length)
        if (formData.description && formData.description.length > 500) {
            errors.push('Description cannot exceed 500 characters');
        }

        // Price validations
        if (formData.monthlyRate <= 0) {
            errors.push('Monthly rate must be a positive number');
        }

        if (formData.annualRate <= 0) {
            errors.push('Annual rate must be a positive number');
        }

        // Module validation
        if (!formData.modules || formData.modules.length === 0) {
            errors.push('Select at least one module for the plan');
        }

        // Validate selected modules exist
        const validModuleIds = modules.map(module => module._id);
        const invalidModules = formData.modules.filter(moduleId => 
            !validModuleIds.includes(moduleId)
        );

        if (invalidModules.length > 0) {
            errors.push('Some selected modules are invalid');
        }

        return errors;
    }

    // Save plan method
    async savePlan(modules) {
    try {
        // Collect form data
        const formData = {
            name: document.getElementById('planName').value.trim(),
            description: document.getElementById('planDescription').value.trim(),
            currency: document.getElementById('planCurrency').value,
            monthlyRate: parseFloat(document.getElementById('monthlyRate').value),
            annualRate: parseFloat(document.getElementById('annualRate').value),
            status: document.getElementById('planStatus').value,
            modules: Array.from(document.querySelectorAll('#modulesContainer input:checked'))
                .map(checkbox => checkbox.value)
        };

        // Validate form data
        const validationErrors = this.validatePlanData(formData, modules);
        if (validationErrors.length > 0) {
            // Show validation errors
            this.showValidationErrors(validationErrors);
            return;
        }

        // Convert prices to other currencies
        const convertedPrices = await this.convertPricesToAllCurrencies(
            formData.monthlyRate, 
            formData.annualRate, 
            formData.currency
        );

        // Prepare plan payload
        const planPayload = {
            ...formData,
            ...convertedPrices,
            createdBy: this.getUserId(),
            createdAt: new Date().toISOString()
        };

        // Send plan to backend
        const response = await fetch(`${this.baseUrl}/plans`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${this.token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(planPayload)
        });

        const responseData = await response.json();

        if (!response.ok) {
            throw new Error(responseData.message || 'Failed to create plan');
        }

        // Create detailed audit log
        await this.createAuditLog('CREATED', {
            planId: responseData.plan._id,
            planName: formData.name,
            planDetails: {
                currency: formData.currency,
                monthlyRate: formData.monthlyRate,
                annualRate: formData.annualRate,
                status: formData.status,
                moduleCount: formData.modules.length
            }
        });

        // Show success notification
        this.showSuccessNotification('Plan created successfully');

        // Refresh plans list
        await this.fetchAndDisplayPlans();

        // Close modal
        $('#planCreationModal').modal('hide');

        return responseData.plan;

    } catch (error) {
        // Create error audit log
        await this.createAuditLog('CREATE_FAILED', {
            errorMessage: error.message,
            attemptedPlanData: {
                name: formData.name,
                currency: formData.currency
            }
        });

        console.error('Error saving plan:', error);
        this.showErrorNotification(error.message);
        
        throw error;
    }
}
async editPlan(planId) {
    try {
        // Fetch plan details
        const response = await fetch(`${this.baseUrl}/plans/${planId}`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${this.token}`,
                'Content-Type': 'application/json'
            }
        });

        const planData = await response.json();

        // Create audit log for plan view
        await this.createAuditLog('VIEWED', {
            planId: planId,
            planName: planData.name,
            action: 'Attempting to edit'
        });

        // Open edit modal with plan details
        this.openEditPlanModal(planData);

    } catch (error) {
        // Log view attempt failure
        await this.createAuditLog('VIEW_FAILED', {
            planId: planId,
            errorMessage: error.message
        });

        console.error('Error fetching plan details:', error);
        this.showErrorNotification('Failed to load plan details');
    }
}

async deletePlan(planId) {
    try {
        // Show confirmation modal
        const confirmed = await this.showConfirmationModal(
            'Delete Plan', 
            'Are you sure you want to delete this plan? This action cannot be undone.'
        );

        if (!confirmed) {
            return;
        }

        // Fetch plan details before deletion for logging
        const planResponse = await fetch(`${this.baseUrl}/plans/${planId}`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${this.token}`,
                'Content-Type': 'application/json'
            }
        });
        const planData = await planResponse.json();

        // Delete plan
        const response = await fetch(`${this.baseUrl}/plans/${planId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${this.token}`,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            throw new Error('Failed to delete plan');
        }

        // Create detailed deletion audit log
        await this.createAuditLog('DELETED', {
            planId: planId,
            planName: planData.name,
            planDetails: {
                currency: planData.currency,
                monthlyRate: planData.monthlyRate,
                annualRate: planData.annualRate
            }
        });

        // Show success notification
        this.showSuccessNotification('Plan deleted successfully');

        // Refresh plans list
        await this.fetchAndDisplayPlans();

    } catch (error) {
        // Log deletion attempt failure
        await this.createAuditLog('DELETE_FAILED', {
            planId: planId,
            errorMessage: error.message
        });

        console.error('Error deleting plan:', error);
        this.showErrorNotification(error.message);
    }
}

    // Utility method for confirmation modal
showConfirmationModal(title, message) {
    return new Promise((resolve) => {
        // Create confirmation modal dynamically
        const modalContainer = document.getElementById('confirmationModalContainer');
        modalContainer.innerHTML = `
            <div class="modal fade" id="confirmationModal" tabindex="-1">
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

        // Show modal
        $('#confirmationModal').modal('show');

        // Setup confirmation logic
        const confirmButton = document.getElementById('confirmButton');
        confirmButton.onclick = () => {
            $('#confirmationModal').modal('hide');
            resolve(true);
        };

        // Cancel logic
        const closeButtons = document.querySelectorAll('#confirmationModal [data-dismiss="modal"]');
        closeButtons.forEach(button => {
            button.onclick = () => {
                $('#confirmationModal').modal('hide');
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

    // Show validation errors
    showValidationErrors(errors) {
        // Create error message container
        const errorContainer = document.createElement('div');
        errorContainer.className = 'alert alert-danger';
        errorContainer.innerHTML = `
            <strong>Validation Errors:</strong>
            <ul>
                ${errors.map(error => `<li>${error}</li>`).join('')}
            </ul>
        `;

        // Insert error container before the form
        const modalBody = document.querySelector('#planCreationModal .modal-body');
        const existingErrors = modalBody.querySelector('.alert-danger');
        
        if (existingErrors) {
            existingErrors.remove();
        }

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

    refreshPlans() {
    this.fetchAndDisplayPlans();
}
    


    // Display plans in the plans container
   displayPlans(plans) {
    const plansContainer = document.getElementById('plansListContainer');
    
    // Clear existing content
    plansContainer.innerHTML = '';

    // Normalize plan data
    const normalizedPlans = plans.map(plan => ({
        _id: plan._id || plan.id,
        name: plan.name,
        description: plan.description || 'No description',
        currency: plan.currency || 'USD',
        monthlyRate: plan.monthlyPrice || plan.monthlyRate,
        annualRate: plan.annualPrice || plan.annualRate,
        status: plan.status || plan.isActive ? 'active' : 'inactive',
        modules: plan.modules || plan.features || []
    }));

    // Create plan cards
    normalizedPlans.forEach(plan => {
        const planCard = document.createElement('div');
        planCard.className = 'plan-card';
        planCard.innerHTML = `
            <div class="plan-header">
                <h3>${plan.name}</h3>
                <span class="plan-status ${plan.status}">
                    ${plan.status.charAt(0).toUpperCase() + plan.status.slice(1)}
                </span>
            </div>
            <div class="plan-body">
                <p>${plan.description}</p>
                <div class="plan-pricing">
                    <div>Monthly: ${plan.currency} ${plan.monthlyRate.toFixed(2)}</div>
                    <div>Annual: ${plan.currency} ${plan.annualRate.toFixed(2)}</div>
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

    // Setup listeners for plan actions
    this.setupPlanCardListeners();
}
    // Setup listeners for plan card actions
    setupPlanCardListeners() {
        const editButtons = document.querySelectorAll('.edit-plan');
        const deleteButtons = document.querySelectorAll('.delete-plan');

        editButtons.forEach(button => {
            button.addEventListener('click', (e) => {
                const planId = e.target.dataset.id;
                this.editPlan(planId);
            });
        });

        deleteButtons.forEach(button => {
            button.addEventListener('click', (e) => {
                const planId = e.target.dataset.id;
                this.deletePlan(planId);
            });
        });
    }

    // Placeholder methods for edit and delete
    editPlan(planId) {
        console.log('Editing plan:', planId);
        // Implement plan editing logic
    }

    deletePlan(planId) {
        console.log('Deleting plan:', planId);
        // Implement plan deletion logic
    }
}

// Expose the PricingManager to the global window object
window.PricingManager = PricingManager;
})();

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

        // Initialize event listeners and setup
        this.initializeEventListeners();
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

            const data = await response.json();
            return data.modules || [];
        } catch (error) {
            console.error('Error fetching modules:', error);
            return [];
        }
    }

    // Create dynamic plan creation modal
    async showPlanCreationModal() {
        try {
            // Fetch available modules
            const modules = await this.fetchAvailableModules();

            // Create modal container
            const modalContainer = document.getElementById('planFormModalContainer');
            modalContainer.innerHTML = `
                <div class="modal fade" id="planCreationModal" tabindex="-1" role="dialog">
                    <div class="modal-dialog modal-lg" role="document">
                        <div class="modal-content">
                            <div class="modal-header">
                                <h5 class="modal-title">Create New Plan</h5>
                                <button type="button" class="close" data-dismiss="modal">
                                    <span>&times;</span>
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
                                            ${modules.map(module => `
                                                <div class="form-check">
                                                    <input class="form-check-input" type="checkbox" 
                                                           value="${module._id}" 
                                                           id="module-${module._id}">
                                                    <label class="form-check-label" for="module-${module._id}">
                                                        ${module.name}
                                                    </label>
                                                </div>
                                            `).join('')}
                                        </div>
                                    </div>
                                </form>
                            </div>
                            <div class="modal-footer">
                                <button type="button" class="btn btn-secondary" data-dismiss="modal">Cancel</button>
                                <button type="button" class="btn btn-primary" id="savePlanBtn">Save Plan</button>
                            </div>
                        </div>
                    </div>
                </div>
            `;

            // Add event listeners
            this.setupPlanCreationModalListeners(modules);

            // Show the modal (assuming Bootstrap is used)
            $('#planCreationModal').modal('show');

        } catch (error) {
            console.error('Error creating plan modal:', error);
            // Show error notification
        }
    }

    // Setup event listeners for plan creation modal
    setupPlanCreationModalListeners(modules) {
        // Currency symbol update
        const currencySelect = document.getElementById('planCurrency');
        const currencySymbols = document.querySelectorAll('#currencySymbol');
        
        currencySelect.addEventListener('change', (e) => {
            const selectedCurrency = this.currencies.find(c => c.code === e.target.value);
            currencySymbols.forEach(symbol => {
                symbol.textContent = selectedCurrency.symbol;
            });
        });

        // Save plan button
        const savePlanBtn = document.getElementById('savePlanBtn');
        savePlanBtn.addEventListener('click', () => this.savePlan(modules));
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
                createdBy: this.getUserId(), // Implement method to get current user ID
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

            // Show success notification
            this.showSuccessNotification('Plan created successfully');

            // Refresh plans list
            await this.fetchAndDisplayPlans();

            // Close modal
            $('#planCreationModal').modal('hide');

        } catch (error) {
            console.error('Error saving plan:', error);
            this.showErrorNotification(error.message);
        }
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
        try {
            const response = await fetch(`${this.baseUrl}/plans`, {
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
            this.displayPlans(data.plans);

        } catch (error) {
            console.error('Error fetching plans:', error);
            this.showErrorNotification('Failed to load plans');
        }
    }

    // Display plans in the plans container
    displayPlans(plans) {
        const plansContainer = document.getElementById('plansListContainer');
        
        // Clear existing content
        plansContainer.innerHTML = '';

        // Create plan cards
        plans.forEach(plan => {
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
                    <p>${plan.description || 'No description provided'}</p>
                    <div class="plan-pricing">
                        <div>Monthly: ${plan.currency} ${plan.monthlyRate.toFixed(2)}</div>
                        <div>Annual: ${plan.currency} ${plan.annualRate.toFixed(2)}</div>
                    </div>
                    <div class="plan-modules">
                        <strong>Modules:</strong>
                        ${plan.modules.map(module => `<span class="badge">${module.name}</span>`).join('')}
                    </div>
                </div>
                <div class="plan-actions">
                    <button class="btn btn-sm btn-primary edit-plan" data-id="${plan._id}">Edit</button>
                    <button class="btn btn-sm btn-danger delete-plan" data-id="${plan._id}">Delete</button>
                </div>
            `;

            plansContainer.appendChild(planCard);
        });

        // Add event listeners for edit and delete
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

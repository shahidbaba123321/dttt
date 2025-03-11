(function() {
    'use strict';

    // Check if PricingManager already exists
    if (window.PricingManager) {
        console.warn('PricingManager is already defined');
        return;
    }

    class PricingManager {
        constructor(baseUrl) {
            // Validate and sanitize base URL
            if (!baseUrl || typeof baseUrl !== 'string') {
                console.error('Invalid base URL provided');
                throw new Error('Base URL is required and must be a string');
            }

            // Remove trailing slashes and ensure proper URL format
            this.baseUrl = baseUrl.replace(/\/+$/, '');

            // Retrieve authentication token with enhanced security
            this.token = (() => {
                try {
                    const token = localStorage.getItem('token');
                    
                    // Additional token validation
                    if (!token) {
                        console.warn('No authentication token found');
                        window.location.href = '/login.html';
                        return null;
                    }

                    // Optional: Basic token format validation
                    if (token.split('.').length !== 3) {
                        console.error('Invalid token format');
                        localStorage.removeItem('token');
                        window.location.href = '/login.html';
                        return null;
                    }

                    return token;
                } catch (error) {
                    console.error('Token retrieval error:', error);
                    return null;
                }
            })();

            // Currency options with comprehensive details
            this.currencyOptions = [
                { 
                    code: 'USD', 
                    symbol: '$', 
                    name: 'US Dollar', 
                    country: 'USA',
                    locale: 'en-US',
                    decimalPlaces: 2
                },
                { 
                    code: 'INR', 
                    symbol: '₹', 
                    name: 'Indian Rupee', 
                    country: 'India',
                    locale: 'en-IN',
                    decimalPlaces: 2
                },
                { 
                    code: 'AED', 
                    symbol: 'د.إ', 
                    name: 'UAE Dirham', 
                    country: 'UAE',
                    locale: 'ar-AE',
                    decimalPlaces: 2
                },
                { 
                    code: 'QAR', 
                    symbol: 'ر.ق', 
                    name: 'Qatari Riyal', 
                    country: 'Qatar',
                    locale: 'ar-QA',
                    decimalPlaces: 2
                },
                { 
                    code: 'GBP', 
                    symbol: '£', 
                    name: 'British Pound', 
                    country: 'UK',
                    locale: 'en-GB',
                    decimalPlaces: 2
                }
            ];

            // Helper method to get DOM element with error handling
            this.getElement = (id) => {
                const element = document.getElementById(id);
                if (!element) {
                    console.warn(`Element not found: ${id}`);
                }
                return element;
            };

            // DOM Element References
            this.elements = {
                plansContainer: this.getElement('plansContainer'),
                createPlanBtn: this.getElement('createNewPlanBtn'),
                planModal: this.getElement('planModal'),
                modalOverlay: this.getElement('modalOverlay'),
                closePlanModal: this.getElement('closePlanModal'),
                cancelPlanModal: this.getElement('cancelPlanModal'),
                planForm: this.getElement('planForm'),
                featuresContainer: this.getElement('featuresContainer')
            };

            // Validate all required elements
            this.validateElements();

            // Bind methods to ensure correct context
            this.bindMethods([
                'initializeEventListeners',
                'loadPlans',
                'openPlanModal',
                'closePlanModal',
                'handlePlanSubmission',
                'initializeCurrencySelection'
            ]);

            // Performance tracking
            this.initializePerformanceTracking();
        }

        // Validate all required elements
        validateElements() {
            const missingElements = Object.entries(this.elements)
                .filter(([key, element]) => !element)
                .map(([key]) => key);

            if (missingElements.length > 0) {
                console.error('Missing UI elements:', missingElements);
                throw new Error(`Missing required UI elements: ${missingElements.join(', ')}`);
            }
        }

        // Method to bind multiple methods
        bindMethods(methodNames) {
            methodNames.forEach(methodName => {
                if (typeof this[methodName] === 'function') {
                    this[methodName] = this[methodName].bind(this);
                } else {
                    console.warn(`Method not found: ${methodName}`);
                }
            });
        }

        // Performance tracking
        initializePerformanceTracking() {
            const startTime = performance.now();
            
            window.addEventListener('load', () => {
                const endTime = performance.now();
                const loadTime = endTime - startTime;
                
                console.log(`Pricing Module Initialization Time: ${loadTime.toFixed(2)}ms`);
            });
        }

        // Currency formatting method
        formatCurrency(amount, currencyCode = 'USD') {
            const currency = this.currencyOptions.find(c => c.code === currencyCode) || 
                             this.currencyOptions.find(c => c.code === 'USD');
            
            return new Intl.NumberFormat(currency.locale, {
                style: 'currency',
                currency: currency.code,
                minimumFractionDigits: currency.decimalPlaces,
                maximumFractionDigits: currency.decimalPlaces
            }).format(amount);
        }

        // Notification methods
        showErrorNotification(message) {
            if (window.dashboardApp && window.dashboardApp.userInterface) {
                window.dashboardApp.userInterface.showErrorNotification(message);
            } else {
                console.error(message);
            }
        }

        showSuccessNotification(message) {
            if (window.dashboardApp && window.dashboardApp.userInterface) {
                window.dashboardApp.userInterface.showSuccessNotification(message);
            } else {
                console.log(message);
            }
        }

        // Initialize method
        init() {
            try {
                this.initializeEventListeners();
                this.initializeCurrencySelection();
                this.loadPlans();
                this.loadAvailableFeatures();
            } catch (error) {
                console.error('Pricing Manager Initialization Error:', error);
                this.showErrorNotification('Failed to initialize Pricing Module');
            }
        }

            // Initialize event listeners
        initializeEventListeners() {
            // Validate elements before adding listeners
            if (!this.elements.createPlanBtn || 
                !this.elements.closePlanModal || 
                !this.elements.cancelPlanModal || 
                !this.elements.planForm) {
                console.error('Missing required elements for event listeners');
                return;
            }

            // Create Plan Button
            this.elements.createPlanBtn.addEventListener('click', () => {
                        console.log('Create New Plan Button Clicked');

                this.openPlanModal();
            });

            // Modal Close Buttons
            this.elements.closePlanModal.addEventListener('click', this.closePlanModal);
            this.elements.cancelPlanModal.addEventListener('click', this.closePlanModal);

            // Form Submission
            this.elements.planForm.addEventListener('submit', this.handlePlanSubmission);
        }

        // Initialize currency selection
        initializeCurrencySelection() {
            const currencySelect = document.getElementById('planCurrency');
            const monthlyPriceLabel = document.getElementById('currencySymbolMonthly');
            const annualPriceLabel = document.getElementById('currencySymbolAnnual');

            if (!currencySelect || !monthlyPriceLabel || !annualPriceLabel) {
                console.warn('Currency selection elements not found');
                return;
            }

            currencySelect.addEventListener('change', (e) => {
                const selectedCurrency = this.currencyOptions.find(c => c.code === e.target.value);
                
                // Update label symbols
                monthlyPriceLabel.textContent = `(${selectedCurrency.symbol})`;
                annualPriceLabel.textContent = `(${selectedCurrency.symbol})`;
            });
        }

        // Open Plan Modal
       openPlanModal(planId = null) {
    try {
        console.log('Opening Plan Modal', { planId });

        // Reset form
        if (this.elements.planForm) {
            this.elements.planForm.reset();
        }
        
        // Populate currency dropdown
        const currencySelect = document.getElementById('planCurrency');
        if (currencySelect) {
            currencySelect.innerHTML = this.currencyOptions.map(currency => `
                <option value="${currency.code}">${currency.name} (${currency.symbol})</option>
            `).join('');
        }

        // Set modal title
        const modalTitle = document.getElementById('planModalTitle');
        if (modalTitle) {
            modalTitle.textContent = planId ? 'Edit Plan' : 'Create New Plan';
        }

        // Initialize currency symbol
        const selectedCurrency = this.currencyOptions.find(c => c.code === (currencySelect ? currencySelect.value : 'USD'));
        const monthlySymbol = document.getElementById('currencySymbolMonthly');
        const annualSymbol = document.getElementById('currencySymbolAnnual');
        
        if (monthlySymbol && annualSymbol) {
            monthlySymbol.textContent = `(${selectedCurrency.symbol})`;
            annualSymbol.textContent = `(${selectedCurrency.symbol})`;
        }

        // If editing, populate existing plan details
        if (planId) {
            this.populatePlanEditModal(planId);
        }

        // Show modal
        const modalOverlay = document.getElementById('modalOverlay');
        if (modalOverlay) {
            modalOverlay.classList.add('show');
        } else {
            console.error('Modal overlay not found');
        }

    } catch (error) {
        console.error('Open Plan Modal Error:', error);
        this.showErrorNotification('Failed to open plan modal');
    }
}

        // Populate Plan Edit Modal
        async populatePlanEditModal(planId) {
            try {
                // Log the attempt to populate plan edit modal
                console.log(`Attempting to populate plan edit modal for planId: ${planId}`);

                // Validate planId
                if (!planId) {
                    console.error('Invalid planId: No plan ID provided');
                    this.showErrorNotification('Invalid Plan ID');
                    return;
                }

                // Fetch plan details with comprehensive error handling
                const response = await fetch(`${this.baseUrl}/plans/${planId}`, {
                    method: 'GET',
                    headers: {
                        'Authorization': `Bearer ${this.token}`,
                        'Content-Type': 'application/json'
                    }
                });

                // Check response status
                if (!response.ok) {
                    const errorText = await response.text();
                    console.error(`Plan fetch error: ${response.status}`, errorText);
                    
                    // Handle specific error scenarios
                    if (response.status === 404) {
                        this.showErrorNotification('Plan not found');
                        return;
                    }
                    if (response.status === 403) {
                        this.showErrorNotification('You do not have permission to edit this plan');
                        return;
                    }

                    throw new Error(`HTTP error! status: ${response.status}`);
                }

                // Parse response
                const result = await response.json();

                // Validate response structure
                if (!result.success) {
                    console.error('API returned unsuccessful response', result);
                    this.showErrorNotification(result.message || 'Failed to fetch plan details');
                    return;
                }

                const plan = result.data;

                // Validate plan object
                if (!plan) {
                    console.error('No plan data received');
                    this.showErrorNotification('No plan details found');
                    return;
                }

                // Populate form fields
                document.getElementById('planName').value = plan.name || '';
                document.getElementById('planDescription').value = plan.description || '';
                document.getElementById('monthlyPrice').value = plan.monthlyPrice?.toFixed(2) || '0.00';
                document.getElementById('annualPrice').value = plan.annualPrice?.toFixed(2) || '0.00';
                document.getElementById('trialPeriod').value = plan.trialPeriod || 0;
                document.getElementById('planCurrency').value = plan.currency || 'USD';
                document.getElementById('planActiveStatus').checked = plan.isActive || false;
                document.getElementById('planId').value = planId;

                // Update currency symbols
                const selectedCurrency = this.currencyOptions.find(c => c.code === (plan.currency || 'USD'));
                document.getElementById('currencySymbolMonthly').textContent = `(${selectedCurrency.symbol})`;
                document.getElementById('currencySymbolAnnual').textContent = `(${selectedCurrency.symbol})`;

                // Handle features
                const featuresContainer = document.getElementById('featuresContainer');
                if (featuresContainer) {
                    const featureCheckboxes = featuresContainer.querySelectorAll('input[type="checkbox"]');
                    featureCheckboxes.forEach(checkbox => {
                        checkbox.checked = plan.features && 
                            plan.features.some(f => f._id === checkbox.value || f.name === checkbox.value);
                    });
                }

                // Log successful population
                console.log('Plan edit modal populated successfully', plan);

            } catch (error) {
                // Comprehensive error handling
                console.error('Populate Plan Edit Modal Error:', error);
                
                // User-friendly error notification
                this.showErrorNotification(
                    error.message || 'Failed to load plan details. Please try again.'
                );
            }
        }

        // Close Plan Modal
        closePlanModal() {
            this.elements.modalOverlay.classList.remove('show');
        }

            // Handle Plan Submission
        async handlePlanSubmission(e) {
            e.preventDefault();
          console.log('Plan Submission Started');

    try {
        // Collect form data with comprehensive validation
        const formData = {
            name: document.getElementById('planName').value.trim(),
            description: document.getElementById('planDescription').value.trim(),
            monthlyPrice: this.validatePrice(document.getElementById('monthlyPrice').value),
            annualPrice: this.validatePrice(document.getElementById('annualPrice').value),
            trialPeriod: this.validateTrialPeriod(document.getElementById('trialPeriod').value),
            isActive: document.getElementById('planActiveStatus').checked,
            currency: document.getElementById('planCurrency').value,
            features: this.collectSelectedFeatures()
        };

        console.log('Form Data:', formData);

        // Validate form data
        this.validatePlanData(formData);

        // Determine method and endpoint
        const planId = document.getElementById('planId').value;
        const method = planId ? 'PUT' : 'POST';
        const endpoint = planId 
            ? `${this.baseUrl}/plans/${planId}` 
            : `${this.baseUrl}/plans`;

        console.log('Submission Method:', method);
        console.log('Endpoint:', endpoint);

        // Perform API request
        fetch(endpoint, {
            method: method,
            headers: {
                'Authorization': `Bearer ${this.token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(formData)
        })
        .then(response => response.json())
        .then(result => {
            console.log('API Response:', result);

            if (!result.success) {
                throw new Error(result.message || 'Failed to save plan');
            }

            // Show success notification
            this.showSuccessNotification(
                planId 
                    ? 'Plan updated successfully' 
                    : 'New plan created successfully'
            );

            // Reload plans
            this.loadPlans();

            // Close modal
            this.closePlanModal();
        })
        .catch(error => {
            console.error('Plan Submission Error:', error);
            this.showErrorNotification(error.message);
        });

    } catch (error) {
        console.error('Plan Submission Validation Error:', error);
        this.showErrorNotification(error.message);
    }
}

        // Validate price input
        validatePrice(price) {
            const parsedPrice = parseFloat(price);
            if (isNaN(parsedPrice) || parsedPrice < 0) {
                throw new Error('Invalid price. Price must be a non-negative number.');
            }
            return parsedPrice;
        }

        // Validate trial period
        validateTrialPeriod(period) {
            const parsedPeriod = parseInt(period);
            if (isNaN(parsedPeriod) || parsedPeriod < 0 || parsedPeriod > 90) {
                throw new Error('Invalid trial period. Must be between 0 and 90 days.');
            }
            return parsedPeriod;
        }

        // Collect selected features
        collectSelectedFeatures() {
            const featureCheckboxes = document.querySelectorAll('input[name="features"]:checked');
            return Array.from(featureCheckboxes).map(checkbox => checkbox.value);
        }

        // Validate plan data
        validatePlanData(data) {
            // Name validation
            if (!data.name || data.name.length < 3 || data.name.length > 50) {
                throw new Error('Plan name must be between 3 and 50 characters.');
            }

            // Description validation
            if (!data.description || data.description.length < 10 || data.description.length > 500) {
                throw new Error('Description must be between 10 and 500 characters.');
            }

            // Price validations
            if (data.monthlyPrice < 0 || data.annualPrice < 0) {
                throw new Error('Prices cannot be negative.');
            }

            // Currency validation
            const validCurrencies = this.currencyOptions.map(c => c.code);
            if (!validCurrencies.includes(data.currency)) {
                throw new Error('Invalid currency selected.');
            }
        }

        // Load Plans
        async loadPlans() {
            try {
                // Validate elements
                if (!this.elements.plansContainer) {
                    console.error('Plans container not found');
                    return;
                }

                // Fetch plans
                const response = await fetch(`${this.baseUrl}/plans`, {
                    method: 'GET',
                    headers: {
                        'Authorization': `Bearer ${this.token}`,
                        'Content-Type': 'application/json'
                    }
                });

                // Handle response
                const result = await response.json();

                if (!response.ok) {
                    throw new Error(result.message || 'Failed to load plans');
                }

                // Render plans
                this.renderPlans(result.data);

            } catch (error) {
                console.error('Load Plans Error:', error);
                this.showErrorNotification('Failed to load pricing plans');
            }
        }

        // Render Plans
        renderPlans(plans) {
            // Clear existing plans
            this.elements.plansContainer.innerHTML = '';

            // Render each plan
            plans.forEach(plan => {
                // Determine if the plan is a system plan
                const isSystemPlan = plan.isSystem || false;

                const planCard = document.createElement('div');
                planCard.className = 'plan-card';
                planCard.innerHTML = `
                    <div class="plan-header">
                        <h3 class="plan-title">${plan.name}</h3>
                        ${isSystemPlan ? '<span class="plan-badge">System Plan</span>' : ''}
                    </div>
                    <div class="plan-price">
                        <span class="plan-price-value">${this.formatCurrency(plan.monthlyPrice, plan.currency)}</span>
                        <span class="plan-price-period">/month</span>
                    </div>
                    <p>${plan.description}</p>
                    <div class="plan-actions">
                        <button class="plan-action-btn edit-plan" data-id="${plan._id}">Edit Plan</button>
                        ${!isSystemPlan ? `
                            <button class="plan-action-btn delete-plan" data-id="${plan._id}">Delete Plan</button>
                        ` : ''}
                    </div>
                `;

                this.elements.plansContainer.appendChild(planCard);
            });

            // Add event listeners for edit and delete buttons
            this.addPlanActionListeners();
        }

        // Add Plan Action Listeners
        addPlanActionListeners() {
            const editButtons = this.elements.plansContainer.querySelectorAll('.edit-plan');
            const deleteButtons = this.elements.plansContainer.querySelectorAll('.delete-plan');

            editButtons.forEach(button => {
                button.addEventListener('click', (e) => {
                    const planId = e.target.dataset.id;
                    this.openPlanModal(planId);
                });
            });

            deleteButtons.forEach(button => {
                button.addEventListener('click', (e) => {
                    const planId = e.target.dataset.id;
                    this.confirmDeletePlan(planId);
                });
            });
        }

            // Confirm Plan Deletion
        async confirmDeletePlan(planId) {
            try {
                // Fetch plan details to check system status and active subscriptions
                const planResponse = await fetch(`${this.baseUrl}/plans/${planId}`, {
                    method: 'GET',
                    headers: {
                        'Authorization': `Bearer ${this.token}`,
                        'Content-Type': 'application/json'
                    }
                });

                const planResult = await planResponse.json();

                if (!planResponse.ok) {
                    throw new Error(planResult.message || 'Failed to fetch plan details');
                }

                const plan = planResult.data;

                // Check if it's a system plan
                if (plan.isSystem) {
                    this.showErrorNotification('System plans cannot be deleted');
                    return;
                }

                // Check active subscriptions
                const subscriptionsResponse = await fetch(`${this.baseUrl}/subscriptions?planId=${planId}`, {
                    method: 'GET',
                    headers: {
                        'Authorization': `Bearer ${this.token}`,
                        'Content-Type': 'application/json'
                    }
                });

                const subscriptionsResult = await subscriptionsResponse.json();

                if (!subscriptionsResponse.ok) {
                    throw new Error(subscriptionsResult.message || 'Failed to check subscriptions');
                }

                // Show confirmation modal
                const confirmModal = document.getElementById('confirmDeleteModal');
                const deletePlanName = document.getElementById('deletePlanName');
                const confirmDeleteBtn = document.getElementById('confirmDeleteBtn');
                const cancelDeleteBtn = document.getElementById('cancelDelete');
                const closeConfirmDelete = document.getElementById('closeConfirmDelete');

                // Populate plan name
                deletePlanName.textContent = plan.name;

                // Show modal
                confirmModal.classList.add('show');

                // Remove previous event listeners to prevent multiple bindings
                confirmDeleteBtn.onclick = null;
                cancelDeleteBtn.onclick = null;
                closeConfirmDelete.onclick = null;

                // Add event listeners
                confirmDeleteBtn.onclick = () => this.deletePlan(planId, subscriptionsResult.data.length);
                cancelDeleteBtn.onclick = () => confirmModal.classList.remove('show');
                closeConfirmDelete.onclick = () => confirmModal.classList.remove('show');

            } catch (error) {
                console.error('Confirm Delete Plan Error:', error);
                this.showErrorNotification(error.message);
            }
        }

        // Delete Plan
        async deletePlan(planId, activeSubscriptionsCount) {
            // Check if there are active subscriptions
            if (activeSubscriptionsCount > 0) {
                this.showErrorNotification(`Cannot delete plan. ${activeSubscriptionsCount} active subscriptions exist.`);
                return;
            }

            try {
                const response = await fetch(`${this.baseUrl}/plans/${planId}`, {
                    method: 'DELETE',
                    headers: {
                        'Authorization': `Bearer ${this.token}`,
                        'Content-Type': 'application/json'
                    }
                });

                const result = await response.json();

                if (!response.ok) {
                    throw new Error(result.message || 'Failed to delete plan');
                }

                // Show success notification
                this.showSuccessNotification('Plan deleted successfully');

                // Close confirmation modal
                const confirmModal = document.getElementById('confirmDeleteModal');
                confirmModal.classList.remove('show');

                // Reload plans
                this.loadPlans();
            } catch (error) {
                console.error('Delete Plan Error:', error);
                this.showErrorNotification(error.message);
            }
        }

        // Load Available Features
        async loadAvailableFeatures() {
            try {
                const response = await fetch(`${this.baseUrl}/features`, {
                    method: 'GET',
                    headers: {
                        'Authorization': `Bearer ${this.token}`,
                        'Content-Type': 'application/json'
                    }
                });

                const result = await response.json();

                if (!response.ok) {
                    throw new Error(result.message || 'Failed to load features');
                }

                this.renderFeatures(result.data);
            } catch (error) {
                console.error('Load Features Error:', error);
                this.showErrorNotification('Failed to load available features');
            }
        }

        // Render Features
        renderFeatures(features) {
            // Validate features container
            if (!this.elements.featuresContainer) {
                console.error('Features container not found');
                return;
            }

            // Clear existing features
            this.elements.featuresContainer.innerHTML = '';

            // Render features
            features.forEach(feature => {
                const featureCheckbox = document.createElement('div');
                featureCheckbox.innerHTML = `
                    <label>
                        <input type="checkbox" name="features" value="${feature._id}">
                        ${feature.name}
                    </label>
                `;
                this.elements.featuresContainer.appendChild(featureCheckbox);
            });
        }

        // Pricing Toggle Functionality
        initializePricingToggle() {
            const monthlyToggle = document.querySelector('.pricing-toggle button:first-child');
            const annualToggle = document.querySelector('.pricing-toggle button:last-child');

            if (!monthlyToggle || !annualToggle) {
                console.warn('Pricing toggle buttons not found');
                return;
            }

            monthlyToggle.addEventListener('click', () => {
                monthlyToggle.classList.add('active');
                annualToggle.classList.remove('active');
                this.updatePlanPrices('monthly');
            });

            annualToggle.addEventListener('click', () => {
                annualToggle.classList.add('active');
                monthlyToggle.classList.remove('active');
                this.updatePlanPrices('annual');
            });
        }

        // Update Plan Prices
        updatePlanPrices(billingCycle) {
            const planCards = document.querySelectorAll('.plan-card');
            
            planCards.forEach(card => {
                const priceValue = card.querySelector('.plan-price-value');
                const pricePeriod = card.querySelector('.plan-price-period');
                
                // Extract numeric price
                const monthlyPrice = parseFloat(priceValue.textContent.replace(/[^\d.]/g, ''));
                const annualPrice = monthlyPrice * 12 * 0.9; // 10% discount for annual

                if (billingCycle === 'monthly') {
                    priceValue.textContent = this.formatCurrency(monthlyPrice);
                    pricePeriod.textContent = '/month';
                } else {
                    priceValue.textContent = this.formatCurrency(annualPrice);
                    pricePeriod.textContent = '/year';
                }
            });
        }

            // Subscription Management Methods
        async loadSubscriptions() {
            try {
                const response = await fetch(`${this.baseUrl}/subscriptions`, {
                    method: 'GET',
                    headers: {
                        'Authorization': `Bearer ${this.token}`,
                        'Content-Type': 'application/json'
                    }
                });

                const result = await response.json();

                if (!response.ok) {
                    throw new Error(result.message || 'Failed to load subscriptions');
                }

                this.renderSubscriptions(result.data);
            } catch (error) {
                console.error('Load Subscriptions Error:', error);
                this.showErrorNotification('Failed to load subscriptions');
            }
        }

        renderSubscriptions(subscriptions) {
            const subscriptionContainer = document.getElementById('subscriptionsContainer');
            
            if (!subscriptionContainer) {
                console.error('Subscriptions container not found');
                return;
            }

            subscriptionContainer.innerHTML = '';

            subscriptions.forEach(subscription => {
                const subscriptionCard = document.createElement('div');
                subscriptionCard.className = 'subscription-card';
                subscriptionCard.innerHTML = `
                    <div class="subscription-header">
                        <h3>${subscription.companyName}</h3>
                        <span class="badge ${this.getSubscriptionStatusClass(subscription.status)}">
                            ${subscription.status}
                        </span>
                    </div>
                    <div class="subscription-details">
                        <p>Plan: ${subscription.planName}</p>
                        <p>Start Date: ${new Date(subscription.startDate).toLocaleDateString()}</p>
                        <p>Next Renewal: ${new Date(subscription.endDate).toLocaleDateString()}</p>
                    </div>
                    <div class="subscription-actions">
                        <button class="btn btn-sm btn-details" data-id="${subscription._id}">
                            View Details
                        </button>
                    </div>
                `;

                subscriptionContainer.appendChild(subscriptionCard);
            });

            this.addSubscriptionActionListeners();
        }

        getSubscriptionStatusClass(status) {
            switch(status.toLowerCase()) {
                case 'active': return 'badge-success';
                case 'expired': return 'badge-danger';
                case 'pending': return 'badge-warning';
                default: return 'badge-secondary';
            }
        }

        addSubscriptionActionListeners() {
            const detailButtons = document.querySelectorAll('.btn-details');
            detailButtons.forEach(button => {
                button.addEventListener('click', (e) => {
                    const subscriptionId = e.target.dataset.id;
                    this.showSubscriptionDetails(subscriptionId);
                });
            });
        }

        async showSubscriptionDetails(subscriptionId) {
            try {
                const response = await fetch(`${this.baseUrl}/subscriptions/${subscriptionId}`, {
                    method: 'GET',
                    headers: {
                        'Authorization': `Bearer ${this.token}`,
                        'Content-Type': 'application/json'
                    }
                });

                const result = await response.json();

                if (!response.ok) {
                    throw new Error(result.message || 'Failed to load subscription details');
                }

                this.populateSubscriptionModal(result.data);
            } catch (error) {
                console.error('Subscription Details Error:', error);
                this.showErrorNotification('Failed to retrieve subscription details');
            }
        }

        populateSubscriptionModal(subscription) {
            const modal = document.getElementById('subscriptionDetailsModal');
            
            if (!modal) {
                console.error('Subscription details modal not found');
                return;
            }

            // Populate company details
            const companyNameEl = document.getElementById('companyName');
            const companyEmailEl = document.getElementById('companyEmail');
            const currentPlanNameEl = document.getElementById('currentPlanName');
            const billingCycleEl = document.getElementById('billingCycle');
            const subscriptionStartDateEl = document.getElementById('subscriptionStartDate');
            const nextRenewalDateEl = document.getElementById('nextRenewalDate');
            const statusBadgeEl = document.getElementById('subscriptionStatusBadge');
            const featuresListEl = document.getElementById('activeFeaturesList');

            if (!companyNameEl || !companyEmailEl || !currentPlanNameEl || 
                !billingCycleEl || !subscriptionStartDateEl || !nextRenewalDateEl || 
                !statusBadgeEl || !featuresListEl) {
                console.error('One or more subscription modal elements not found');
                return;
            }

            // Populate details
            companyNameEl.textContent = subscription.companyName;
            companyEmailEl.textContent = subscription.companyEmail;
            currentPlanNameEl.textContent = subscription.planName;
            billingCycleEl.textContent = subscription.billingCycle;
            subscriptionStartDateEl.textContent = new Date(subscription.startDate).toLocaleDateString();
            nextRenewalDateEl.textContent = new Date(subscription.endDate).toLocaleDateString();

            // Set status badge
            statusBadgeEl.textContent = subscription.status;
            statusBadgeEl.className = `badge ${this.getSubscriptionStatusClass(subscription.status)}`;

            // Populate active features
            featuresListEl.innerHTML = subscription.features.map(feature => `
                <li>
                    <i class="fas fa-check"></i> ${feature.name}
                </li>
            `).join('');

            // Show modal
            modal.classList.add('show');

            // Setup upgrade and payment method buttons
            this.setupSubscriptionActions(subscription);
        }

        setupSubscriptionActions(subscription) {
            const upgradeBtn = document.getElementById('upgradeSubscriptionBtn');
            const changePaymentBtn = document.getElementById('changePaymentMethodBtn');

            if (!upgradeBtn || !changePaymentBtn) {
                console.warn('Subscription action buttons not found');
                return;
            }

            // Upgrade subscription
            upgradeBtn.onclick = () => this.initiateSubscriptionUpgrade(subscription);

            // Change payment method
            changePaymentBtn.onclick = () => this.initiatePaymentMethodChange(subscription);
        }

        async initiateSubscriptionUpgrade(subscription) {
            try {
                // Fetch available plans
                const plansResponse = await fetch(`${this.baseUrl}/plans`, {
                    method: 'GET',
                    headers: {
                        'Authorization': `Bearer ${this.token}`,
                        'Content-Type': 'application/json'
                    }
                });

                const plansResult = await plansResponse.json();

                if (!plansResponse.ok) {
                    throw new Error(plansResult.message || 'Failed to load plans');
                }

                // Filter out current plan and create upgrade options
                const upgradePlans = plansResult.data.filter(
                    plan => plan._id !== subscription.planId
                );

                // Open upgrade modal with plan options
                this.openUpgradeModal(subscription, upgradePlans);
            } catch (error) {
                console.error('Upgrade Subscription Error:', error);
                this.showErrorNotification('Failed to initiate subscription upgrade');
            }
        }

        openUpgradeModal(currentSubscription, upgradePlans) {
            const upgradeModal = document.getElementById('upgradeSubscriptionModal');
            const plansContainer = document.getElementById('upgradePlansContainer');

            if (!upgradeModal || !plansContainer) {
                console.error('Upgrade modal elements not found');
                return;
            }

            // Clear existing plans
            plansContainer.innerHTML = '';

            // Render upgrade plan options
            upgradePlans.forEach(plan => {
                const planOption = document.createElement('div');
                planOption.className = 'upgrade-plan-option';
                planOption.innerHTML = `
                    <input type="radio" 
                           name="upgradePlan" 
                           id="plan-${plan._id}" 
                           value="${plan._id}">
                    <label for="plan-${plan._id}">
                        <h4>${plan.name}</h4>
                        <p>${this.formatCurrency(plan.monthlyPrice)}/month</p>
                        <ul>
                            ${plan.features.map(feature => `
                                <li>${feature.name}</li>
                            `).join('')}
                        </ul>
                    </label>
                `;

                plansContainer.appendChild(planOption);
            });

            // Show modal
            upgradeModal.classList.add('show');
        }

            // Discount Management Methods
        initializeDiscountManagement() {
            const createDiscountBtn = document.getElementById('createDiscountBtn');
            const discountModal = document.getElementById('discountModal');
            const closeDiscountModal = document.getElementById('closeDiscountModal');
            const cancelDiscountBtn = document.getElementById('cancelDiscountBtn');
            const discountForm = document.getElementById('discountForm');

            if (!createDiscountBtn || !discountModal || !closeDiscountModal || 
                !cancelDiscountBtn || !discountForm) {
                console.error('One or more discount management elements not found');
                return;
            }

            // Create discount button
            createDiscountBtn.addEventListener('click', () => {
                this.prepareDiscountModal();
                discountModal.classList.add('show');
            });

            // Close modal buttons
            closeDiscountModal.addEventListener('click', () => discountModal.classList.remove('show'));
            cancelDiscountBtn.addEventListener('click', () => discountModal.classList.remove('show'));

            // Form submission
            discountForm.addEventListener('submit', this.handleDiscountSubmission.bind(this));

            // Load existing discounts
            this.loadDiscounts();
        }

        prepareDiscountModal() {
            // Populate applicable plans
            this.loadApplicablePlans();

            // Generate random discount code
            this.generateDiscountCode();
        }

        async loadApplicablePlans() {
            try {
                const response = await fetch(`${this.baseUrl}/plans`, {
                    method: 'GET',
                    headers: {
                        'Authorization': `Bearer ${this.token}`,
                        'Content-Type': 'application/json'
                    }
                });

                const result = await response.json();

                if (!response.ok) {
                    throw new Error(result.message || 'Failed to load plans');
                }

                const applicablePlansContainer = document.getElementById('applicablePlansContainer');
                
                if (!applicablePlansContainer) {
                    console.error('Applicable plans container not found');
                    return;
                }

                applicablePlansContainer.innerHTML = '';

                result.data.forEach(plan => {
                    const planCheckbox = document.createElement('div');
                    planCheckbox.innerHTML = `
                        <label>
                            <input type="checkbox" name="applicablePlans" value="${plan._id}">
                            ${plan.name}
                        </label>
                    `;
                    applicablePlansContainer.appendChild(planCheckbox);
                });
            } catch (error) {
                console.error('Load Applicable Plans Error:', error);
                this.showErrorNotification('Failed to load applicable plans');
            }
        }

        generateDiscountCode() {
            const codeInput = document.getElementById('discountCode');
            
            if (!codeInput) {
                console.error('Discount code input not found');
                return;
            }

            const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
            const codeLength = 8;
            let code = '';

            for (let i = 0; i < codeLength; i++) {
                code += characters.charAt(Math.floor(Math.random() * characters.length));
            }

            codeInput.value = code;
        }

        async handleDiscountSubmission(e) {
            e.preventDefault();

            // Collect form data
            const formData = {
                code: document.getElementById('discountCode').value,
                type: document.getElementById('discountType').value,
                value: parseFloat(document.getElementById('discountValue').value),
                expiryDate: document.getElementById('discountExpiryDate').value,
                usageLimit: parseInt(document.getElementById('discountUsageLimit').value) || 0,
                applicablePlans: Array.from(
                    document.querySelectorAll('input[name="applicablePlans"]:checked')
                ).map(el => el.value)
            };

            try {
                // Validate form data
                this.validateDiscountData(formData);

                const response = await fetch(`${this.baseUrl}/discounts`, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${this.token}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(formData)
                });

                const result = await response.json();

                if (!response.ok) {
                    throw new Error(result.message || 'Failed to create discount');
                }

                this.showSuccessNotification('Discount created successfully');
                
                // Close modal
                document.getElementById('discountModal').classList.remove('show');

                // Reload discounts
                this.loadDiscounts();
            } catch (error) {
                console.error('Discount Submission Error:', error);
                this.showErrorNotification(error.message);
            }
        }

        validateDiscountData(data) {
            // Validate discount code
            if (!data.code || data.code.length < 6) {
                throw new Error('Discount code must be at least 6 characters long');
            }

            // Validate discount type
            if (!['percentage', 'fixed'].includes(data.type)) {
                throw new Error('Invalid discount type');
            }

            // Validate discount value
            if (isNaN(data.value) || data.value <= 0) {
                throw new Error('Discount value must be a positive number');
            }

            // Validate percentage discount
            if (data.type === 'percentage' && data.value > 100) {
                throw new Error('Percentage discount cannot exceed 100%');
            }

            // Validate expiry date
            const expiryDate = new Date(data.expiryDate);
            if (isNaN(expiryDate.getTime())) {
                throw new Error('Invalid expiry date');
            }

            // Validate usage limit
            if (data.usageLimit < 0) {
                throw new Error('Usage limit cannot be negative');
            }

            // Validate applicable plans
            if (!data.applicablePlans || data.applicablePlans.length === 0) {
                throw new Error('At least one plan must be selected');
            }
        }

        async loadDiscounts() {
            try {
                const response = await fetch(`${this.baseUrl}/discounts`, {
                    method: 'GET',
                    headers: {
                        'Authorization': `Bearer ${this.token}`,
                        'Content-Type': 'application/json'
                    }
                });

                const result = await response.json();

                if (!response.ok) {
                    throw new Error(result.message || 'Failed to load discounts');
                }

                this.renderDiscounts(result.data);
            } catch (error) {
                console.error('Load Discounts Error:', error);
                this.showErrorNotification('Failed to load discounts');
            }
        }

        renderDiscounts(discounts) {
            const discountsContainer = document.getElementById('discountsContainer');
            
            if (!discountsContainer) {
                console.error('Discounts container not found');
                return;
            }

            discountsContainer.innerHTML = '';

            discounts.forEach(discount => {
                const discountCard = document.createElement('div');
                discountCard.className = 'discount-card';
                discountCard.innerHTML = `
                    <div class="discount-header">
                        <h3>${discount.code}</h3>
                        <span class="badge ${this.getDiscountStatusClass(discount)}">
                            ${this.getDiscountStatus(discount)}
                        </span>
                    </div>
                    <div class="discount-details">
                        <p>
                            ${discount.type === 'percentage' 
                                ? `${discount.value}% off` 
                                : `${this.formatCurrency(discount.value)} off`}
                        </p>
                        <p>Expires: ${new Date(discount.expiryDate).toLocaleDateString()}</p>
                        <p>Usage: ${discount.usageCount}/${discount.usageLimit || '∞'}</p>
                    </div>
                    <div class="discount-actions">
                        <button class="btn btn-sm btn-edit" data-id="${discount._id}">Edit</button>
                        <button class="btn btn-sm btn-delete" data-id="${discount._id}">Delete</button>
                    </div>
                `;

                discountsContainer.appendChild(discountCard);
            });

            // Add event listeners for edit and delete
            this.addDiscountActionListeners();
        }

        getDiscountStatusClass(discount) {
            const now = new Date();
            const expiryDate = new Date(discount.expiryDate);

            if (now > expiryDate) return 'badge-danger';
            if (discount.usageLimit && discount.usageCount >= discount.usageLimit) return 'badge-warning';
            return 'badge-success';
        }

        getDiscountStatus(discount) {
            const now = new Date();
            const expiryDate = new Date(discount.expiryDate);

            if (now > expiryDate) return 'Expired';
            if (discount.usageLimit && discount.usageCount >= discount.usageLimit) return 'Limit Reached';
            return 'Active';
        }

        addDiscountActionListeners() {
            const editButtons = document.querySelectorAll('.btn-edit');
            const deleteButtons = document.querySelectorAll('.btn-delete');

            editButtons.forEach(button => {
                button.addEventListener('click', (e) => {
                    const discountId = e.target.dataset.id;
                    this.editDiscount(discountId);
                });
            });

            deleteButtons.forEach(button => {
                button.addEventListener('click', (e) => {
                    const discountId = e.target.dataset.id;
                    this.confirmDeleteDiscount(discountId);
                });
            });
        }

            async editDiscount(discountId) {
            try {
                const response = await fetch(`${this.baseUrl}/discounts/${discountId}`, {
                    method: 'GET',
                    headers: {
                        'Authorization': `Bearer ${this.token}`,
                        'Content-Type': 'application/json'
                    }
                });

                const result = await response.json();

                if (!response.ok) {
                    throw new Error(result.message || 'Failed to fetch discount details');
                }

                this.populateDiscountModal(result.data);
            } catch (error) {
                console.error('Edit Discount Error:', error);
                this.showErrorNotification('Failed to retrieve discount details');
            }
        }

        populateDiscountModal(discount) {
            const discountModal = document.getElementById('discountModal');
            
            if (!discountModal) {
                console.error('Discount modal not found');
                return;
            }

            // Populate form fields
            const elements = {
                discountCode: document.getElementById('discountCode'),
                discountType: document.getElementById('discountType'),
                discountValue: document.getElementById('discountValue'),
                discountExpiryDate: document.getElementById('discountExpiryDate'),
                discountUsageLimit: document.getElementById('discountUsageLimit'),
                applicablePlansContainer: document.getElementById('applicablePlansContainer')
            };

            // Validate all elements exist
            Object.entries(elements).forEach(([key, element]) => {
                if (!element) {
                    console.error(`Element not found: ${key}`);
                    throw new Error(`Missing UI element: ${key}`);
                }
            });

            // Populate basic discount details
            elements.discountCode.value = discount.code;
            elements.discountType.value = discount.type;
            elements.discountValue.value = discount.value;
            elements.discountExpiryDate.value = 
                new Date(discount.expiryDate).toISOString().split('T')[0];
            elements.discountUsageLimit.value = discount.usageLimit || '';

            // Reset and check applicable plans
            const planCheckboxes = elements.applicablePlansContainer.querySelectorAll('input[type="checkbox"]');
            planCheckboxes.forEach(checkbox => {
                checkbox.checked = discount.applicablePlans.includes(checkbox.value);
            });

            // Show modal
            discountModal.classList.add('show');
        }

        confirmDeleteDiscount(discountId) {
            const confirmModal = document.getElementById('confirmDeleteModal');
            const confirmDeleteBtn = document.getElementById('confirmDeleteBtn');
            const cancelDeleteBtn = document.getElementById('cancelDelete');
            const closeConfirmDelete = document.getElementById('closeConfirmDelete');

            if (!confirmModal || !confirmDeleteBtn || !cancelDeleteBtn || !closeConfirmDelete) {
                console.error('Confirm delete modal elements not found');
                return;
            }

            // Show modal
            confirmModal.classList.add('show');

            // Remove previous event listeners
            confirmDeleteBtn.onclick = null;
            cancelDeleteBtn.onclick = null;
            closeConfirmDelete.onclick = null;

            // Add new event listeners
            confirmDeleteBtn.onclick = () => this.deleteDiscount(discountId);
            cancelDeleteBtn.onclick = () => confirmModal.classList.remove('show');
            closeConfirmDelete.onclick = () => confirmModal.classList.remove('show');
        }

        async deleteDiscount(discountId) {
            try {
                const response = await fetch(`${this.baseUrl}/discounts/${discountId}`, {
                    method: 'DELETE',
                    headers: {
                        'Authorization': `Bearer ${this.token}`,
                        'Content-Type': 'application/json'
                    }
                });

                const result = await response.json();

                if (!response.ok) {
                    throw new Error(result.message || 'Failed to delete discount');
                }

                this.showSuccessNotification('Discount deleted successfully');
                
                // Close confirmation modal
                const confirmModal = document.getElementById('confirmDeleteModal');
                confirmModal.classList.remove('show');

                // Reload discounts
                this.loadDiscounts();
            } catch (error) {
                console.error('Delete Discount Error:', error);
                this.showErrorNotification(error.message);
            }
        }

        // Reporting and Analytics Methods
        initializeReportingModule() {
            const generateReportBtn = document.getElementById('generateReportBtn');
            const exportReportBtn = document.getElementById('exportReportBtn');
            const reportTypeSelector = document.getElementById('reportTypeSelector');
            const reportStartDate = document.getElementById('reportStartDate');
            const reportEndDate = document.getElementById('reportEndDate');

            if (!generateReportBtn || !exportReportBtn || !reportTypeSelector || 
                !reportStartDate || !reportEndDate) {
                console.error('One or more reporting module elements not found');
                return;
            }

            // Set default date range (last 30 days)
            const endDate = new Date();
            const startDate = new Date();
            startDate.setDate(endDate.getDate() - 30);

            reportStartDate.valueAsDate = startDate;
            reportEndDate.valueAsDate = endDate;

            // Generate report button
            generateReportBtn.addEventListener('click', () => {
                this.generateReport();
            });

            // Export report button
            exportReportBtn.addEventListener('click', () => {
                this.exportReport();
            });
        }

        async generateReport() {
            const reportType = document.getElementById('reportTypeSelector').value;
            const startDate = document.getElementById('reportStartDate').value;
            const endDate = document.getElementById('reportEndDate').value;

            try {
                const response = await fetch(`${this.baseUrl}/reports/${reportType}?startDate=${startDate}&endDate=${endDate}`, {
                    method: 'GET',
                    headers: {
                        'Authorization': `Bearer ${this.token}`,
                        'Content-Type': 'application/json'
                    }
                });

                const result = await response.json();

                if (!response.ok) {
                    throw new Error(result.message || 'Failed to generate report');
                }

                this.renderReport(reportType, result.data);
            } catch (error) {
                console.error('Generate Report Error:', error);
                this.showErrorNotification(error.message);
            }
        }

        renderReport(reportType, reportData) {
            const reportContainer = document.getElementById('reportContainer');
            
            if (!reportContainer) {
                console.error('Report container not found');
                return;
            }

            reportContainer.innerHTML = '';

            switch(reportType) {
                case 'activeSubscribers':
                    this.renderActiveSubscribersReport(reportData);
                    break;
                case 'revenueBreakdown':
                    this.renderRevenueBreakdownReport(reportData);
                    break;
                case 'featureUsage':
                    this.renderFeatureUsageReport(reportData);
                    break;
                default:
                    reportContainer.innerHTML = '<p>Unsupported report type</p>';
            }
        }

            renderActiveSubscribersReport(data) {
            const reportContainer = document.getElementById('reportContainer');
            
            // Create table
            const table = document.createElement('table');
            table.className = 'report-table';
            table.innerHTML = `
                <thead>
                    <tr>
                        <th>Plan Name</th>
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

            // Create chart container
            const chartContainer = document.createElement('div');
            chartContainer.id = 'activeSubscribersChart';
            chartContainer.style.height = '300px';

            reportContainer.appendChild(table);
            reportContainer.appendChild(chartContainer);

            // Render chart if Chart.js is available
            this.renderBarChart(
                'activeSubscribersChart', 
                data.map(item => item.planName), 
                data.map(item => item.activeSubscribers),
                'Active Subscribers by Plan'
            );
        }

        renderRevenueBreakdownReport(data) {
            const reportContainer = document.getElementById('reportContainer');
            
            // Create table
            const table = document.createElement('table');
            table.className = 'report-table';
            table.innerHTML = `
                <thead>
                    <tr>
                        <th>Plan Name</th>
                        <th>Total Revenue</th>
                    </tr>
                </thead>
                <tbody>
                    ${data.map(item => `
                        <tr>
                            <td>${item.planName}</td>
                            <td>${this.formatCurrency(item.revenue)}</td>
                        </tr>
                    `).join('')}
                </tbody>
            `;

            // Create chart container
            const chartContainer = document.createElement('div');
            chartContainer.id = 'revenueBreakdownChart';
            chartContainer.style.height = '300px';

            reportContainer.appendChild(table);
            reportContainer.appendChild(chartContainer);

            // Render chart if Chart.js is available
            this.renderPieChart(
                'revenueBreakdownChart', 
                data.map(item => item.planName), 
                data.map(item => item.revenue),
                'Revenue Breakdown by Plan'
            );
        }

        renderFeatureUsageReport(data) {
            const reportContainer = document.getElementById('reportContainer');
            
            // Create table
            const table = document.createElement('table');
            table.className = 'report-table';
            table.innerHTML = `
                <thead>
                    <tr>
                        <th>Feature Name</th>
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

            // Create chart container
            const chartContainer = document.createElement('div');
            chartContainer.id = 'featureUsageChart';
            chartContainer.style.height = '300px';

            reportContainer.appendChild(table);
            reportContainer.appendChild(chartContainer);

            // Render chart if Chart.js is available
            this.renderBarChart(
                'featureUsageChart', 
                data.map(item => item.featureName), 
                data.map(item => item.usageCount),
                'Feature Usage Breakdown'
            );
        }

        exportReport() {
            const reportType = document.getElementById('reportTypeSelector').value;
            const startDate = document.getElementById('reportStartDate').value;
            const endDate = document.getElementById('reportEndDate').value;

            // Construct export URL
            const exportUrl = `${this.baseUrl}/reports/${reportType}/export?startDate=${startDate}&endDate=${endDate}`;

            // Trigger download
            fetch(exportUrl, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${this.token}`
                }
            })
            .then(response => {
                if (!response.ok) {
                    throw new Error('Export failed');
                }
                return response.blob();
            })
            .then(blob => {
                // Create download link
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.style.display = 'none';
                a.href = url;
                a.download = `${reportType}_report_${startDate}_to_${endDate}.csv`;
                document.body.appendChild(a);
                a.click();
                window.URL.revokeObjectURL(url);
            })
            .catch(error => {
                console.error('Export Report Error:', error);
                this.showErrorNotification('Failed to export report');
            });
        }

        // Chart rendering methods (requires Chart.js)
        renderBarChart(containerId, labels, data, title) {
            if (typeof Chart === 'undefined') {
                console.warn('Chart.js is not loaded');
                return;
            }

            const ctx = document.getElementById(containerId).getContext('2d');
            new Chart(ctx, {
                type: 'bar',
                data: {
                    labels: labels,
                    datasets: [{
                        label: title,
                        data: data,
                        backgroundColor: 'rgba(79, 70, 229, 0.6)',
                        borderColor: 'rgba(79, 70, 229, 1)',
                        borderWidth: 1
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    scales: {
                        y: {
                            beginAtZero: true
                        }
                    }
                }
            });
        }

        renderPieChart(containerId, labels, data, title) {
            if (typeof Chart === 'undefined') {
                console.warn('Chart.js is not loaded');
                return;
            }

            const ctx = document.getElementById(containerId).getContext('2d');
            new Chart(ctx, {
                type: 'pie',
                data: {
                    labels: labels,
                    datasets: [{
                        label: title,
                        data: data,
                        backgroundColor: [
                            'rgba(79, 70, 229, 0.6)',
                            'rgba(99, 102, 241, 0.6)',
                            'rgba(165, 180, 252, 0.6)',
                            'rgba(129, 140, 248, 0.6)'
                        ],
                        borderColor: [
                            'rgba(79, 70, 229, 1)',
                            'rgba(99, 102, 241, 1)',
                            'rgba(165, 180, 252, 1)',
                            'rgba(129, 140, 248, 1)'
                        ],
                        borderWidth: 1
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false
                }
            });
        }

        // Data Retention Policy Management
        initializeDataRetentionModule() {
            const createRetentionPolicyBtn = document.getElementById('createRetentionPolicyBtn');
            const retentionPolicyModal = document.getElementById('retentionPolicyModal');
            const closeRetentionPolicyModal = document.getElementById('closeRetentionPolicyModal');
            const cancelRetentionPolicyBtn = document.getElementById('cancelRetentionPolicyBtn');
            const retentionPolicyForm = document.getElementById('retentionPolicyForm');

            if (!createRetentionPolicyBtn || !retentionPolicyModal || 
                !closeRetentionPolicyModal || !cancelRetentionPolicyBtn || 
                !retentionPolicyForm) {
                console.error('One or more data retention module elements not found');
                return;
            }

            // Create retention policy button
            createRetentionPolicyBtn.addEventListener('click', () => {
                this.prepareRetentionPolicyModal();
                retentionPolicyModal.classList.add('show');
            });

            // Close modal buttons
            closeRetentionPolicyModal.addEventListener('click', () => retentionPolicyModal.classList.remove('show'));
            cancelRetentionPolicyBtn.addEventListener('click', () => retentionPolicyModal.classList.remove('show'));

            // Form submission
            retentionPolicyForm.addEventListener('submit', this.handleRetentionPolicySubmission.bind(this));

            // Load existing retention policies
            this.loadDataRetentionPolicies();
        }

             prepareRetentionPolicyModal() {
            // Reset form
            const retentionPeriodInput = document.getElementById('retentionPeriod');
            const policyDescriptionInput = document.getElementById('policyDescription');

            if (!retentionPeriodInput || !policyDescriptionInput) {
                console.error('Retention policy modal elements not found');
                return;
            }

            retentionPeriodInput.value = '';
            policyDescriptionInput.value = '';
        }

        async handleRetentionPolicySubmission(e) {
            e.preventDefault();

            const formData = {
                retentionPeriod: parseInt(document.getElementById('retentionPeriod').value),
                policyDescription: document.getElementById('policyDescription').value
            };

            try {
                // Validate retention policy data
                this.validateRetentionPolicyData(formData);

                const response = await fetch(`${this.baseUrl}/data-retention`, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${this.token}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(formData)
                });

                const result = await response.json();

                if (!response.ok) {
                    throw new Error(result.message || 'Failed to create retention policy');
                }

                this.showSuccessNotification('Data retention policy created successfully');
                
                // Close modal
                document.getElementById('retentionPolicyModal').classList.remove('show');

                // Reload policies
                this.loadDataRetentionPolicies();
            } catch (error) {
                console.error('Retention Policy Submission Error:', error);
                this.showErrorNotification(error.message);
            }
        }

        validateRetentionPolicyData(data) {
            // Validate retention period
            if (isNaN(data.retentionPeriod) || data.retentionPeriod < 0 || data.retentionPeriod > 365) {
                throw new Error('Retention period must be between 0 and 365 days');
            }

            // Validate policy description
            if (!data.policyDescription || data.policyDescription.trim().length < 10) {
                throw new Error('Policy description must be at least 10 characters long');
            }
        }

        async loadDataRetentionPolicies() {
            try {
                const response = await fetch(`${this.baseUrl}/data-retention`, {
                    method: 'GET',
                    headers: {
                        'Authorization': `Bearer ${this.token}`,
                        'Content-Type': 'application/json'
                    }
                });

                const result = await response.json();

                if (!response.ok) {
                    throw new Error(result.message || 'Failed to load data retention policies');
                }

                this.renderDataRetentionPolicies(result.data);
            } catch (error) {
                console.error('Load Data Retention Policies Error:', error);
                this.showErrorNotification('Failed to load data retention policies');
            }
        }

        renderDataRetentionPolicies(policies) {
            const policiesContainer = document.getElementById('dataRetentionPoliciesContainer');
            
            if (!policiesContainer) {
                console.error('Data retention policies container not found');
                return;
            }

            policiesContainer.innerHTML = '';

            policies.forEach(policy => {
                const policyCard = document.createElement('div');
                policyCard.className = 'retention-policy-card';
                policyCard.innerHTML = `
                    <div class="policy-header">
                        <h3>Retention Policy</h3>
                        <span class="badge ${this.getPolicyStatusClass(policy)}">
                            ${this.getPolicyStatus(policy)}
                        </span>
                    </div>
                    <div class="policy-details">
                        <p><strong>Retention Period:</strong> ${policy.retentionPeriod} days</p>
                        <p><strong>Description:</strong> ${policy.policyDescription}</p>
                        <div class="policy-metadata">
                            <p>Created: ${new Date(policy.createdAt).toLocaleDateString()}</p>
                            <p>Created By: ${policy.createdBy || 'System'}</p>
                        </div>
                    </div>
                    <div class="policy-actions">
                        <button class="btn btn-sm btn-edit" data-id="${policy._id}">Edit</button>
                        <button class="btn btn-sm btn-delete" data-id="${policy._id}">Delete</button>
                    </div>
                `;

                policiesContainer.appendChild(policyCard);
            });

            // Add event listeners for edit and delete
            this.addDataRetentionPolicyActionListeners();
        }

        getPolicyStatusClass(policy) {
            // Implement status logic based on retention period and creation date
            const createdDate = new Date(policy.createdAt);
            const daysSinceCreation = (new Date() - createdDate) / (1000 * 60 * 60 * 24);

            if (daysSinceCreation > policy.retentionPeriod) {
                return 'badge-warning';
            }
            return 'badge-success';
        }

        getPolicyStatus(policy) {
            const createdDate = new Date(policy.createdAt);
            const daysSinceCreation = (new Date() - createdDate) / (1000 * 60 * 60 * 24);

            if (daysSinceCreation > policy.retentionPeriod) {
                return 'Expired';
            }
            return 'Active';
        }

        addDataRetentionPolicyActionListeners() {
            const editButtons = document.querySelectorAll('.btn-edit');
            const deleteButtons = document.querySelectorAll('.btn-delete');

            editButtons.forEach(button => {
                button.addEventListener('click', (e) => {
                    const policyId = e.target.dataset.id;
                    this.editDataRetentionPolicy(policyId);
                });
            });

            deleteButtons.forEach(button => {
                button.addEventListener('click', (e) => {
                    const policyId = e.target.dataset.id;
                    this.confirmDeleteDataRetentionPolicy(policyId);
                });
            });
        }

        async editDataRetentionPolicy(policyId) {
            try {
                const response = await fetch(`${this.baseUrl}/data-retention/${policyId}`, {
                    method: 'GET',
                    headers: {
                        'Authorization': `Bearer ${this.token}`,
                        'Content-Type': 'application/json'
                    }
                });

                const result = await response.json();

                if (!response.ok) {
                    throw new Error(result.message || 'Failed to fetch retention policy details');
                }

                this.populateRetentionPolicyModal(result.data);
            } catch (error) {
                console.error('Edit Retention Policy Error:', error);
                this.showErrorNotification('Failed to retrieve retention policy details');
            }
        }

        populateRetentionPolicyModal(policy) {
            const retentionPolicyModal = document.getElementById('retentionPolicyModal');
            
            if (!retentionPolicyModal) {
                console.error('Retention policy modal not found');
                return;
            }

            // Populate form fields
            document.getElementById('retentionPeriod').value = policy.retentionPeriod;
            document.getElementById('policyDescription').value = policy.policyDescription;

            // Show modal
            retentionPolicyModal.classList.add('show');
        }

        confirmDeleteDataRetentionPolicy(policyId) {
            const confirmModal = document.getElementById('confirmDeleteModal');
            const confirmDeleteBtn = document.getElementById('confirmDeleteBtn');
            const cancelDeleteBtn = document.getElementById('cancelDelete');

            if (!confirmModal || !confirmDeleteBtn || !cancelDeleteBtn) {
                console.error('Confirm delete modal elements not found');
                return;
            }

            // Show modal
            confirmModal.classList.add('show');

            // Remove previous event listeners
            confirmDeleteBtn.onclick = null;
            cancelDeleteBtn.onclick = null;

            // Add new event listeners
            confirmDeleteBtn.onclick = () => this.deleteDataRetentionPolicy(policyId);
            cancelDeleteBtn.onclick = () => confirmModal.classList.remove('show');
        }

        async deleteDataRetentionPolicy(policyId) {
            try {
                const response = await fetch(`${this.baseUrl}/data-retention/${policyId}`, {
                    method: 'DELETE',
                    headers: {
                        'Authorization': `Bearer ${this.token}`,
                        'Content-Type': 'application/json'
                    }
                });

                const result = await response.json();

                if (!response.ok) {
                    throw new Error(result.message || 'Failed to delete retention policy');
                }

                this.showSuccessNotification('Data retention policy deleted successfully');
                
                // Close confirmation modal
                document.getElementById('confirmDeleteModal').classList.remove('show');

                // Reload policies
                this.loadDataRetentionPolicies();
            } catch (error) {
                console.error('Delete Retention Policy Error:', error);
                this.showErrorNotification(error.message);
            }
        }

        // Final Initialization Method
        initializeModule() {
            try {
                // Initialize various modules
                this.initializePricingToggle();
                this.initializeReportingModule();
                this.initializeDiscountManagement();
                this.initializeDataRetentionModule();
                this.initializeCurrencySelection();

                // Load initial data
                this.loadPlans();
                this.loadSubscriptions();
                this.loadDiscounts();
                this.loadDataRetentionPolicies();

                // Show success message
                this.showSuccessNotification('Pricing Module Initialized Successfully');
            } catch (error) {
                console.error('Pricing Module Initialization Error:', error);
                this.showErrorNotification('Failed to initialize Pricing Module');
            }
        }
    }

    // Expose the class to the global scope
    window.PricingManager = PricingManager;
})();   
    

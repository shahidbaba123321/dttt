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
            this.baseUrl = baseUrl;
            this.token = localStorage.getItem('token');
            
            // DOM Element References
            this.elements = {
                plansContainer: document.getElementById('plansContainer'),
                createPlanBtn: document.getElementById('createNewPlanBtn'),
                planModal: document.getElementById('planModal'),
                modalOverlay: document.getElementById('modalOverlay'),
                closePlanModal: document.getElementById('closePlanModal'),
                cancelPlanModal: document.getElementById('cancelPlanModal'),
                planForm: document.getElementById('planForm'),
                featuresContainer: document.getElementById('featuresContainer'),
                confirmDeleteModal: document.getElementById('confirmDeleteModal')
            };

            // Bind methods to ensure correct context
            this.bindMethods();

            // Initialize the module
            this.init();
        }

        // Separate method for binding to ensure all methods exist
        bindMethods() {
            // Get all methods of the class prototype
            Object.getOwnPropertyNames(Object.getPrototypeOf(this))
                .filter(prop => typeof this[prop] === 'function' && prop !== 'constructor')
                .forEach(method => {
                    this[method] = this[method].bind(this);
                });
        }


         init() {
            try {
                // Check if elements exist before adding event listeners
                if (!this.elements.createPlanBtn) {
                    console.error('Create Plan Button not found');
                    return;
                }

                this.initializeEventListeners();
                this.loadPlans();
                this.loadAvailableFeatures();
                
                // Only initialize these if their respective elements exist
                if (document.getElementById('createDiscountBtn')) {
                    this.initializeDiscountManagement();
                }
                
                if (document.getElementById('generateReportBtn')) {
                    this.initializeReportingModule();
                }
                
                if (document.getElementById('createRetentionPolicyBtn')) {
                    this.initializeDataRetentionModule();
                }
            } catch (error) {
                console.error('Pricing Manager Initialization Error:', error);
                this.showErrorNotification('Failed to initialize Pricing Module');
            }
        }

        closePlanModal() {
            if (this.elements.modalOverlay) {
                this.elements.modalOverlay.classList.remove('show');
            }
        }

        



        initializeEventListeners() {
            // Create Plan Button
            this.elements.createPlanBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.openPlanModal();
            });

            // Modal Close Buttons
            this.elements.closePlanModal.addEventListener('click', this.closeAllModals);
            this.elements.cancelPlanModal.addEventListener('click', this.closeAllModals);

            // Form Submission
            this.elements.planForm.addEventListener('submit', this.handlePlanSubmission);

            // Add plan action listeners
            this.addPlanActionListeners();

            // Modal close listeners
            const modalCloseButtons = document.querySelectorAll('.modal-close');
            modalCloseButtons.forEach(button => {
                button.addEventListener('click', this.closeAllModals);
            });

            // Add overlay click listener to close modals
            this.elements.modalOverlay.addEventListener('click', (e) => {
                if (e.target === this.elements.modalOverlay) {
                    this.closeAllModals();
                }
            });
        }

        closeAllModals() {
            const modals = document.querySelectorAll('.modal');
            modals.forEach(modal => modal.classList.remove('show'));
            
            const modalOverlays = document.querySelectorAll('.modal-overlay');
            modalOverlays.forEach(overlay => overlay.classList.remove('show'));
        }

        showErrorNotification(message) {
    console.error(message);
    
    // More robust notification handling
    if (window.dashboardApp && window.dashboardApp.userInterface && 
        typeof window.dashboardApp.userInterface.showErrorNotification === 'function') {
        window.dashboardApp.userInterface.showErrorNotification(message);
    } else {
        // Fallback notification methods
        const errorContainer = document.getElementById('error-notification');
        if (errorContainer) {
            errorContainer.textContent = message;
            errorContainer.style.display = 'block';
            
            // Auto-hide after 5 seconds
            setTimeout(() => {
                errorContainer.style.display = 'none';
            }, 5000);
        } else {
            // Last resort - browser alert
            alert(message);
        }
    }
}

        fetchPlanDetails(planId) {
    try {
        // Validate planId
        if (!planId || typeof planId !== 'string') {
            console.warn('Invalid plan ID provided');
            return Promise.reject(new Error('Invalid plan ID'));
        }

        // Trim and validate planId format (MongoDB ObjectId is 24 hex characters)
        const formattedPlanId = planId.trim();
        const objectIdRegex = /^[0-9a-fA-F]{24}$/;
        
        if (!objectIdRegex.test(formattedPlanId)) {
            console.warn('Invalid plan ID format', formattedPlanId);
            return Promise.reject(new Error('Invalid plan ID format'));
        }

        // Fetch plan details
        return fetch(`${this.baseUrl}/plans/${formattedPlanId}`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${this.token}`,
                'Content-Type': 'application/json'
            }
        })
        .then(response => {
            if (!response.ok) {
                throw new Error('Failed to fetch plan details');
            }
            return response.json();
        })
        .then(result => {
            if (!result.data) {
                throw new Error('No plan data received');
            }

            const plan = result.data;

            // Populate form fields
            this.populatePlanForm(plan);

            return plan;
        })
        .catch(error => {
            console.error('Fetch Plan Details Error:', error);
            this.showErrorNotification(`Failed to retrieve plan details: ${error.message}`);
            throw error;
        });
    } catch (error) {
        console.error('Plan Details Fetch Error:', error);
        this.showErrorNotification('An unexpected error occurred');
        throw error;
    }
}

populatePlanForm(plan) {
    // Comprehensive form population with fallback values
    const formElements = {
        planId: document.getElementById('planId'),
        planName: document.getElementById('planName'),
        planDescription: document.getElementById('planDescription'),
        monthlyPrice: document.getElementById('monthlyPrice'),
        annualPrice: document.getElementById('annualPrice'),
        trialPeriod: document.getElementById('trialPeriod'),
        planActiveStatus: document.getElementById('planActiveStatus'),
        planCurrency: document.getElementById('planCurrency')
    };

    // Validate form elements exist
    const missingElements = Object.entries(formElements)
        .filter(([key, element]) => !element)
        .map(([key]) => key);

    if (missingElements.length > 0) {
        console.error(`Missing form elements: ${missingElements.join(', ')}`);
        this.showErrorNotification('Some form elements are missing');
        return;
    }

    // Populate form fields with robust error handling
    try {
        // Set plan ID
        formElements.planId.value = plan._id || '';

        // Set plan name
        formElements.planName.value = plan.name || '';

        // Set plan description
        formElements.planDescription.value = plan.description || '';

        // Set monthly price
        formElements.monthlyPrice.value = 
            plan.monthlyPrice !== undefined ? plan.monthlyPrice : 0;

        // Set annual price
        formElements.annualPrice.value = 
            plan.annualPrice !== undefined ? plan.annualPrice : 0;

        // Set trial period
        formElements.trialPeriod.value = 
            plan.trialPeriod !== undefined ? plan.trialPeriod : 0;

        // Set active status
        formElements.planActiveStatus.checked = 
            plan.isActive !== undefined ? plan.isActive : false;

        // Set currency
        formElements.planCurrency.value = plan.currency || 'USD';

        // Handle features
        const featureCheckboxes = document.querySelectorAll('input[name="features"]');
    featureCheckboxes.forEach(checkbox => {
        // Check if the feature is in the plan's features
        const isFeatureSelected = Array.isArray(plan.features) && 
            plan.features.some(f => 
                f._id === checkbox.value || 
                f.name === checkbox.value ||
                f.name === checkbox.textContent.trim()
            );
        
        checkbox.checked = !!isFeatureSelected;
    });
    } catch (error) {
        console.error('Error populating plan form:', error);
        this.showErrorNotification('Failed to populate plan form');
    }
}

        



        showSuccessNotification(message) {
            console.log(message);
            // Fallback success notification
            if (window.dashboardApp && window.dashboardApp.userInterface) {
                window.dashboardApp.userInterface.showSuccessNotification(message);
            } else {
                alert(message);
            }
        }

            loadPlans() {
            try {
                fetch(`${this.baseUrl}/plans`, {
                    method: 'GET',
                    headers: {
                        'Authorization': `Bearer ${this.token}`,
                        'Content-Type': 'application/json'
                    }
                })
                .then(response => {
                    if (!response.ok) {
                        throw new Error('Failed to load plans');
                    }
                    return response.json();
                })
                .then(result => {
                    if (!result.data) {
                        throw new Error('No plan data received');
                    }
                    this.renderPlans(result.data);
                })
                .catch(error => {
                    console.error('Load Plans Error:', error);
                    this.showErrorNotification('Failed to load pricing plans');
                });
            } catch (error) {
                console.error('Load Plans Fetch Error:', error);
                this.showErrorNotification('An unexpected error occurred while loading plans');
            }
        }

        renderPlans(plans) {
            // Clear existing plans
            this.elements.plansContainer.innerHTML = '';

            // Define currency symbols
            const currencySymbols = {
                'USD': '$',
                'INR': '₹',
                'AED': 'د.إ',
                'QAR': 'ر.ق',
                'GBP': '£'
            };

            // Render each plan
            plans.forEach(plan => {
                // Get currency symbol, default to USD if not found
                const currencySymbol = currencySymbols[plan.currency] || '$';

                const planCard = document.createElement('div');
                planCard.className = 'plan-card';
                planCard.innerHTML = `
                    <div class="plan-header">
                        <h3 class="plan-title">${plan.name}</h3>
                        ${plan.isSystem ? '<span class="plan-badge">System Plan</span>' : ''}
                    </div>
                    <div class="plan-price">
                        <span class="plan-price-value">${currencySymbol}${plan.monthlyPrice.toFixed(2)}</span>
                        <span class="plan-price-period">/month</span>
                    </div>
                    <p>${plan.description}</p>
                    <div class="plan-actions">
                        <button class="plan-action-btn edit-plan" data-id="${plan._id}">Edit Plan</button>
                        <button class="plan-action-btn delete-plan" data-id="${plan._id}">Delete Plan</button>
                    </div>
                `;

                this.elements.plansContainer.appendChild(planCard);
            });

            // Add event listeners for edit and delete buttons
            this.addPlanActionListeners();
        }

        openPlanModal(planId = null) {
            // Close all modals first
            this.closeAllModals();

            // Reset form completely
            this.elements.planForm.reset();
            
            // Clear any pre-existing plan ID
            const planIdInput = document.getElementById('planId');
            if (planIdInput) {
                planIdInput.value = '';
            }

            // Set modal title
            const modalTitle = document.getElementById('planModalTitle');
            modalTitle.textContent = planId ? 'Edit Plan' : 'Create New Plan';

            // Only fetch details if planId is a valid string
            if (planId && typeof planId === 'string' && planId.trim() !== '') {
                this.fetchPlanDetails(planId);
            }

            // Show plan modal
            this.elements.planModal.classList.add('show');
            this.elements.modalOverlay.classList.add('show');
        }

        loadAvailableFeatures() {
    try {
        fetch(`${this.baseUrl}/features`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${this.token}`,
                'Content-Type': 'application/json'
            }
        })
        .then(response => {
            if (!response.ok) {
                throw new Error('Failed to load features');
            }
            return response.json();
        })
        .then(result => {
            if (!result.data) {
                throw new Error('No feature data received');
            }
            this.renderFeatures(result.data);
        })
        .catch(error => {
            console.error('Load Features Error:', error);
            this.showErrorNotification('Failed to load available features');
        });
    } catch (error) {
        console.error('Load Features Fetch Error:', error);
        this.showErrorNotification('An unexpected error occurred while loading features');
    }
}


        renderFeatures(features) {
    // Clear existing features
    this.elements.featuresContainer.innerHTML = '';

    // Create feature groups
    const featureGroups = {};

    // Group features by category
    features.forEach(feature => {
        if (!featureGroups[feature.category]) {
            featureGroups[feature.category] = [];
        }
        featureGroups[feature.category].push(feature);
    });

    // Render features with category grouping
    Object.entries(featureGroups).forEach(([category, categoryFeatures]) => {
        // Create category container
        const categoryContainer = document.createElement('div');
        categoryContainer.className = 'feature-category';
        
        // Category header
        const categoryHeader = document.createElement('h4');
        categoryHeader.textContent = category;
        categoryContainer.appendChild(categoryHeader);

        // Features grid for this category
        const featuresGrid = document.createElement('div');
        featuresGrid.className = 'features-grid';

        // Render features in this category
        categoryFeatures.forEach(feature => {
            const featureCheckbox = document.createElement('div');
            featureCheckbox.className = 'feature-checkbox';
            featureCheckbox.innerHTML = `
                <label>
                    <input 
                        type="checkbox" 
                        name="features" 
                        value="${feature._id}"
                    >
                    ${feature.name}
                </label>
            `;
            featuresGrid.appendChild(featureCheckbox);
        });

        // Add category container to main container
        categoryContainer.appendChild(featuresGrid);
        this.elements.featuresContainer.appendChild(categoryContainer);
    });
}


        handlePlanSubmission(e) {
    e.preventDefault();
    
    // Collect form data
    const formData = {
        name: document.getElementById('planName').value,
        description: document.getElementById('planDescription').value,
        monthlyPrice: parseFloat(document.getElementById('monthlyPrice').value),
        annualPrice: parseFloat(document.getElementById('annualPrice').value),
        trialPeriod: parseInt(document.getElementById('trialPeriod').value) || 0,
        isActive: document.getElementById('planActiveStatus').checked,
        currency: document.getElementById('planCurrency').value,
        features: Array.from(
            document.querySelectorAll('input[name="features"]:checked')
        ).map(el => el.value)
    };

    // Validate form data
    try {
        this.validatePlanData(formData);
    } catch (validationError) {
        this.showErrorNotification(validationError.message);
        return;
    }

    // Get existing plan ID if in edit mode
    const planId = document.getElementById('planId').value;

    // Prepare fetch options
    const fetchOptions = {
        method: planId ? 'PUT' : 'POST',
        headers: {
            'Authorization': `Bearer ${this.token}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
    };

    // Construct endpoint
    const endpoint = planId 
        ? `${this.baseUrl}/plans/${planId}` 
        : `${this.baseUrl}/plans`;

    // Fetch with enhanced error handling
    fetch(endpoint, fetchOptions)
        .then(response => {
            // Log response status and headers for debugging
            console.log('Response Status:', response.status);
            console.log('Response Headers:', Object.fromEntries(response.headers.entries()));

            // Check response content type
            const contentType = response.headers.get('content-type');
            if (!contentType || !contentType.includes('application/json')) {
                return response.text().then(text => {
                    console.error('Non-JSON response:', text);
                    throw new Error('Received non-JSON response from server');
                });
            }

            // Parse JSON response
            return response.json();
        })
        .then(result => {
            // Log full result for debugging
            console.log('Server Response:', result);

            // Check for success status
            if (!result.success) {
                throw new Error(result.message || 'Failed to save plan');
            }

            // Show success notification
            this.showSuccessNotification(
                planId ? 'Plan updated successfully' : 'New plan created successfully'
            );

            // Reload plans
            this.loadPlans();

            // Close modal
            this.closeAllModals();
        })
        .catch(error => {
            // Comprehensive error logging
            console.error('Plan Submission Error:', {
                message: error.message,
                stack: error.stack,
                formData: formData
            });

            // Provide user-friendly error message
            let errorMessage = 'Failed to save plan';
            
            if (error.message.includes('Missing required fields')) {
                errorMessage = 'Please fill in all required fields';
            } else if (error.message.includes('Plan with this name already exists')) {
                errorMessage = 'A plan with this name already exists';
            } else if (error.message.includes('Invalid currency')) {
                errorMessage = 'Invalid currency selected';
            } else if (error.message.includes('network')) {
                errorMessage = 'Network error. Please check your connection.';
            } else if (error.message.includes('unauthorized')) {
                errorMessage = 'You are not authorized to perform this action.';
            }

            this.showErrorNotification(errorMessage);
        });
}


        // Validation method
validatePlanData(data) {
    // Name validation
    if (!data.name || data.name.trim().length < 3) {
        throw new Error('Plan name must be at least 3 characters long');
    }

    // Description validation
    if (!data.description || data.description.trim().length < 10) {
        throw new Error('Plan description must be at least 10 characters long');
    }

    // Price validations
    if (data.monthlyPrice === undefined || isNaN(data.monthlyPrice) || data.monthlyPrice < 0) {
        throw new Error('Monthly price is required and must be a non-negative number');
    }

    if (data.annualPrice === undefined || isNaN(data.annualPrice) || data.annualPrice < 0) {
        throw new Error('Annual price is required and must be a non-negative number');
    }

    // Trial period validation
    if (data.trialPeriod !== undefined && (isNaN(data.trialPeriod) || data.trialPeriod < 0)) {
        throw new Error('Trial period must be a non-negative number');
    }

    // Currency validation
    const validCurrencies = ['USD', 'INR', 'AED', 'QAR', 'GBP'];
    if (!validCurrencies.includes(data.currency)) {
        throw new Error('Invalid currency selected');
    }

    // Features validation
    if (!Array.isArray(data.features)) {
        throw new Error('Features must be an array');
    }
}

            addPlanActionListeners() {
            // Remove existing listeners to prevent multiple bindings
            const container = this.elements.plansContainer;
            
            // Use event delegation to handle edit and delete actions
            container.addEventListener('click', (e) => {
                const editButton = e.target.closest('.edit-plan');
                const deleteButton = e.target.closest('.delete-plan');

                if (editButton) {
                    e.stopPropagation();
                    const planId = editButton.getAttribute('data-id');
                    this.openPlanModal(planId);
                }

                if (deleteButton) {
                    e.stopPropagation();
                    const planId = deleteButton.getAttribute('data-id');
                    this.confirmDeletePlan(planId);
                }
            });
        }

        confirmDeletePlan(planId) {
            // Ensure only delete modal is shown
            const confirmModal = document.getElementById('confirmDeleteModal');
            const deletePlanName = document.getElementById('deletePlanName');
            const confirmDeleteBtn = document.getElementById('confirmDeleteBtn');
            const cancelDeleteBtn = document.getElementById('cancelDelete');
            const closeConfirmDelete = document.getElementById('closeConfirmDelete');

            // Prevent any other modals from being open
            this.closeAllModals();

            // Find plan name and populate delete confirmation
            this.getPlanDetails(planId).then(plan => {
                if (plan) {
                    deletePlanName.textContent = plan.name;

                    // Show only the delete confirmation modal
                    confirmModal.classList.add('show');
                    this.elements.modalOverlay.classList.add('show');

                    // Remove previous event listeners to prevent multiple bindings
                    confirmDeleteBtn.onclick = null;
                    cancelDeleteBtn.onclick = null;
                    closeConfirmDelete.onclick = null;

                    // Add new event listeners
                    confirmDeleteBtn.onclick = () => this.deletePlan(planId);
                    cancelDeleteBtn.onclick = () => this.closeAllModals();
                    closeConfirmDelete.onclick = () => this.closeAllModals();
                }
            });
        }

        async getPlanDetails(planId) {
            try {
                const response = await fetch(`${this.baseUrl}/plans/${planId}`, {
                    method: 'GET',
                    headers: {
                        'Authorization': `Bearer ${this.token}`,
                        'Content-Type': 'application/json'
                    }
                });

                const result = await response.json();

                if (!response.ok) {
                    throw new Error(result.message || 'Failed to fetch plan details');
                }

                return result.data;
            } catch (error) {
                console.error('Get Plan Details Error:', error);
                this.showErrorNotification('Failed to retrieve plan details');
                return null;
            }
        }

        deletePlan(planId) {
            try {
                fetch(`${this.baseUrl}/plans/${planId}`, {
                    method: 'DELETE',
                    headers: {
                        'Authorization': `Bearer ${this.token}`,
                        'Content-Type': 'application/json'
                    }
                })
                .then(response => {
                    if (!response.ok) {
                        throw new Error('Failed to delete plan');
                    }
                    return response.json();
                })
                .then(result => {
                    // Show success notification
                    this.showSuccessNotification('Plan deleted successfully');

                    // Close confirmation modal
                    this.closeAllModals();

                    // Reload plans
                    this.loadPlans();
                })
                .catch(error => {
                    console.error('Delete Plan Error:', error);
                    this.showErrorNotification(error.message);
                });
            } catch (error) {
                console.error('Delete Plan Fetch Error:', error);
                this.showErrorNotification('An unexpected error occurred while deleting the plan');
            }
        }

        initializePricingToggle() {
            const monthlyToggle = document.querySelector('.pricing-toggle button:first-child');
            const annualToggle = document.querySelector('.pricing-toggle button:last-child');

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

        updatePlanPrices(billingCycle) {
            const planCards = document.querySelectorAll('.plan-card');
            
            planCards.forEach(card => {
                const priceValue = card.querySelector('.plan-price-value');
                const pricePeriod = card.querySelector('.plan-price-period');
                
                // This would typically come from the plan data
                const monthlyPrice = parseFloat(priceValue.textContent.replace(/[^\d.]/g, ''));
                const annualPrice = monthlyPrice * 12 * 0.9; // 10% discount for annual

                if (billingCycle === 'monthly') {
                    priceValue.textContent = `$${monthlyPrice.toFixed(2)}`;
                    pricePeriod.textContent = '/month';
                } else {
                    priceValue.textContent = `$${annualPrice.toFixed(2)}`;
                    pricePeriod.textContent = '/year';
                }
            });
        }

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
            const subscriptionTable = document.createElement('table');
            subscriptionTable.className = 'subscriptions-table';
            subscriptionTable.innerHTML = `
                <thead>
                    <tr>
                        <th>Company</th>
                        <th>Plan</th>
                        <th>Status</th>
                        <th>Start Date</th>
                        <th>Next Renewal</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    ${subscriptions.map(subscription => `
                        <tr>
                            <td>${subscription.companyName}</td>
                            <td>${subscription.planName}</td>
                            <td>
                                <span class="badge ${this.getSubscriptionStatusClass(subscription.status)}">
                                    ${subscription.status}
                                </span>
                            </td>
                            <td>${new Date(subscription.startDate).toLocaleDateString()}</td>
                            <td>${new Date(subscription.endDate).toLocaleDateString()}</td>
                            <td>
                                <button class="btn btn-sm btn-details" data-id="${subscription._id}">
                                    View Details
                                </button>
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            `;

            // Replace existing content or create a new container
            const subscriptionsContainer = document.getElementById('subscriptionsContainer');
            if (subscriptionsContainer) {
                subscriptionsContainer.innerHTML = '';
                subscriptionsContainer.appendChild(subscriptionTable);
            }

            // Add event listeners for view details
            this.addSubscriptionDetailsListeners();
        }

        getSubscriptionStatusClass(status) {
            switch(status.toLowerCase()) {
                case 'active': return 'badge-success';
                case 'expired': return 'badge-danger';
                case 'pending': return 'badge-warning';
                default: return 'badge-secondary';
            }
        }

        addSubscriptionDetailsListeners() {
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
            
            // Populate company details
            document.getElementById('companyName').textContent = subscription.companyName;
            document.getElementById('companyEmail').textContent = subscription.companyEmail;

            // Populate subscription details
            document.getElementById('currentPlanName').textContent = subscription.planName;
            document.getElementById('billingCycle').textContent = subscription.billingCycle;
            document.getElementById('subscriptionStartDate').textContent = 
                new Date(subscription.startDate).toLocaleDateString();
            document.getElementById('nextRenewalDate').textContent = 
                new Date(subscription.endDate).toLocaleDateString();

            // Set status badge
            const statusBadge = document.getElementById('subscriptionStatusBadge');
            statusBadge.textContent = subscription.status;
            statusBadge.className = `badge ${this.getSubscriptionStatusClass(subscription.status)}`;

            // Populate active features
            const featuresList = document.getElementById('activeFeaturesList');
            featuresList.innerHTML = subscription.features.map(feature => `
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
                        <p>$${plan.monthlyPrice}/month</p>
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

            initializeDiscountManagement() {
            const createDiscountBtn = document.getElementById('createDiscountBtn');
            const discountModal = document.getElementById('discountModal');
            const closeDiscountModal = document.getElementById('closeDiscountModal');
            const cancelDiscountBtn = document.getElementById('cancelDiscountBtn');
            const discountForm = document.getElementById('discountForm');

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
            const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
            const codeLength = 8;
            let code = '';

            for (let i = 0; i < codeLength; i++) {
                code += characters.charAt(Math.floor(Math.random() * characters.length));
            }

            document.getElementById('discountCode').value = code;
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
                                : `$${discount.value} off`}
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
            
            // Populate form fields
            document.getElementById('discountCode').value = discount.code;
            document.getElementById('discountType').value = discount.type;
            document.getElementById('discountValue').value = discount.value;
            document.getElementById('discountExpiryDate').value = 
                new Date(discount.expiryDate).toISOString().split('T')[0];
            document.getElementById('discountUsageLimit').value = discount.usageLimit || '';

            // Reset and check applicable plans
            const applicablePlansContainer = document.getElementById('applicablePlansContainer');
            const planCheckboxes = applicablePlansContainer.querySelectorAll('input[type="checkbox"]');
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

            // Show modal
            confirmModal.classList.add('show');

            // Remove previous event listeners
            confirmDeleteBtn.onclick = null;
            cancelDeleteBtn.onclick = null;

            // Add new event listeners
            confirmDeleteBtn.onclick = () => this.deleteDiscount(discountId);
            cancelDeleteBtn.onclick = () => confirmModal.classList.remove('show');
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
                document.getElementById('confirmDeleteModal').classList.remove('show');

                // Reload discounts
                this.loadDiscounts();
            } catch (error) {
                console.error('Delete Discount Error:', error);
                this.showErrorNotification(error.message);
            }
        }

            initializeReportingModule() {
            const generateReportBtn = document.getElementById('generateReportBtn');
            const exportReportBtn = document.getElementById('exportReportBtn');
            const reportTypeSelector = document.getElementById('reportTypeSelector');
            const reportStartDate = document.getElementById('reportStartDate');
            const reportEndDate = document.getElementById('reportEndDate');

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

            // Create chart
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
                            <td>$${item.revenue.toFixed(2)}</td>
                        </tr>
                    `).join('')}
                </tbody>
            `;

            // Create chart
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

            // Create chart
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

            initializeDataRetentionModule() {
            const createRetentionPolicyBtn = document.getElementById('createRetentionPolicyBtn');
            const retentionPolicyModal = document.getElementById('retentionPolicyModal');
            const closeRetentionPolicyModal = document.getElementById('closeRetentionPolicyModal');
            const cancelRetentionPolicyBtn = document.getElementById('cancelRetentionPolicyBtn');
            const retentionPolicyForm = document.getElementById('retentionPolicyForm');

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
            document.getElementById('retentionPeriod').value = '';
            document.getElementById('policyDescription').value = '';
        }

        async handleRetentionPolicySubmission(e) {
            e.preventDefault();

            const formData = {
                retentionPeriod: parseInt(document.getElementById('retentionPeriod').value),
                policyDescription: document.getElementById('policyDescription').value
            };

            try {
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

            initializeFeatureManagement() {
            const createFeatureBtn = document.getElementById('createFeatureBtn');
            const featureModal = document.getElementById('featureModal');
            const closeFeatureModal = document.getElementById('closeFeatureModal');
            const cancelFeatureBtn = document.getElementById('cancelFeatureBtn');
            const featureForm = document.getElementById('featureForm');

            // Create feature button
            createFeatureBtn.addEventListener('click', () => {
                this.prepareFeatureModal();
                featureModal.classList.add('show');
            });

            // Close modal buttons
            closeFeatureModal.addEventListener('click', () => featureModal.classList.remove('show'));
            cancelFeatureBtn.addEventListener('click', () => featureModal.classList.remove('show'));

            // Form submission
            featureForm.addEventListener('submit', this.handleFeatureSubmission.bind(this));

            // Load existing features
            this.loadFeatures();
        }

        prepareFeatureModal() {
            // Reset form
            document.getElementById('featureName').value = '';
            document.getElementById('featureDescription').value = '';
            document.getElementById('featureCategory').value = '';
        }

        async handleFeatureSubmission(e) {
            e.preventDefault();

            const formData = {
                name: document.getElementById('featureName').value,
                description: document.getElementById('featureDescription').value,
                category: document.getElementById('featureCategory').value
            };

            try {
                const response = await fetch(`${this.baseUrl}/features`, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${this.token}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(formData)
                });

                const result = await response.json();

                if (!response.ok) {
                    throw new Error(result.message || 'Failed to create feature');
                }

                this.showSuccessNotification('Feature created successfully');
                
                // Close modal
                document.getElementById('featureModal').classList.remove('show');

                // Reload features
                this.loadFeatures();
            } catch (error) {
                console.error('Feature Submission Error:', error);
                this.showErrorNotification(error.message);
            }
        }

        async loadFeatures() {
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
                this.showErrorNotification('Failed to load features');
            }
        }

        renderFeatures(features) {
            const featuresContainer = document.getElementById('featuresContainer');
            featuresContainer.innerHTML = '';

            features.forEach(feature => {
                const featureCard = document.createElement('div');
                featureCard.className = 'feature-card';
                featureCard.innerHTML = `
                    <div class="feature-header">
                        <h3>${feature.name}</h3>
                        <span class="badge">${feature.category}</span>
                    </div>
                    <div class="feature-details">
                        <p>${feature.description}</p>
                        <div class="feature-metadata">
                            <p>Created: ${new Date(feature.createdAt).toLocaleDateString()}</p>
                        </div>
                    </div>
                    <div class="feature-actions">
                        <button class="btn btn-sm btn-edit" data-id="${feature._id}">Edit</button>
                        <button class="btn btn-sm btn-delete" data-id="${feature._id}">Delete</button>
                    </div>
                `;

                featuresContainer.appendChild(featureCard);
            });

            // Add event listeners for edit and delete
            this.addFeatureActionListeners();
        }

        addFeatureActionListeners() {
            const editButtons = document.querySelectorAll('.btn-edit');
            const deleteButtons = document.querySelectorAll('.btn-delete');

            editButtons.forEach(button => {
                button.addEventListener('click', (e) => {
                    const featureId = e.target.dataset.id;
                    this.editFeature(featureId);
                });
            });

            deleteButtons.forEach(button => {
                button.addEventListener('click', (e) => {
                    const featureId = e.target.dataset.id;
                    this.confirmDeleteFeature(featureId);
                });
            });
        }

        async editFeature(featureId) {
    try {
        const response = await fetch(`${this.baseUrl}/features/${featureId}`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${this.token}`,
                'Content-Type': 'application/json'
            }
        });

        // Check if response is JSON
        const contentType = response.headers.get('content-type');
        if (!contentType || !contentType.includes('application/json')) {
            // Log the full response text for debugging
            const responseText = await response.text();
            console.error('Non-JSON response:', responseText);
            
            throw new Error('Received non-JSON response from server');
        }

        // Parse JSON response
        const result = await response.json();

        if (!response.ok) {
            throw new Error(result.message || 'Failed to fetch feature details');
        }

        // Validate result structure
        if (!result.data) {
            throw new Error('No feature data received');
        }

        this.populateFeatureModal(result.data);
    } catch (error) {
        console.error('Edit Feature Error:', {
            message: error.message,
            stack: error.stack
        });

        // More detailed error handling
        let errorMessage = 'Failed to retrieve feature details';
        
        if (error.message.includes('Failed to fetch')) {
            errorMessage = 'Network error. Please check your connection.';
        } else if (error.message.includes('Received non-JSON response')) {
            errorMessage = 'Server returned an invalid response. Please contact support.';
        }

        this.showErrorNotification(errorMessage);
    }
}

        populateFeatureModal(feature) {
            const featureModal = document.getElementById('featureModal');
            
            // Populate form fields
            document.getElementById('featureName').value = feature.name;
            document.getElementById('featureDescription').value = feature.description;
            document.getElementById('featureCategory').value = feature.category;

            // Show modal
            featureModal.classList.add('show');
        }

        confirmDeleteFeature(featureId) {
            const confirmModal = document.getElementById('confirmDeleteModal');
            const confirmDeleteBtn = document.getElementById('confirmDeleteBtn');
            const cancelDeleteBtn = document.getElementById('cancelDelete');

            // Show modal
            confirmModal.classList.add('show');

            // Remove previous event listeners
            confirmDeleteBtn.onclick = null;
            cancelDeleteBtn.onclick = null;

            // Add new event listeners
            confirmDeleteBtn.onclick = () => this.deleteFeature(featureId);
            cancelDeleteBtn.onclick = () => confirmModal.classList.remove('show');
        }

        async deleteFeature(featureId) {
            try {
                const response = await fetch(`${this.baseUrl}/features/${featureId}`, {
                    method: 'DELETE',
                    headers: {
                        'Authorization': `Bearer ${this.token}`,
                        'Content-Type': 'application/json'
                    }
                });

                const result = await response.json();

                if (!response.ok) {
                    throw new Error(result.message || 'Failed to delete feature');
                }

                this.showSuccessNotification('Feature deleted successfully');
                
                // Close confirmation modal
                document.getElementById('confirmDeleteModal').classList.remove('show');

                // Reload features
                this.loadFeatures();
            } catch (error) {
                console.error('Delete Feature Error:', error);
                this.showErrorNotification(error.message);
            }
        }

            initializePaymentMethodManagement() {
            const addPaymentMethodBtn = document.getElementById('addPaymentMethodBtn');
            const paymentMethodModal = document.getElementById('paymentMethodModal');
            const closePaymentMethodModal = document.getElementById('closePaymentMethodModal');
            const cancelPaymentMethodBtn = document.getElementById('cancelPaymentMethodBtn');
            const paymentMethodForm = document.getElementById('paymentMethodForm');

            // Add payment method button
            addPaymentMethodBtn.addEventListener('click', () => {
                this.preparePaymentMethodModal();
                paymentMethodModal.classList.add('show');
            });

            // Close modal buttons
            closePaymentMethodModal.addEventListener('click', () => paymentMethodModal.classList.remove('show'));
            cancelPaymentMethodBtn.addEventListener('click', () => paymentMethodModal.classList.remove('show'));

            // Payment method type change listener
            document.getElementById('paymentMethodType').addEventListener('change', this.togglePaymentMethodFields.bind(this));

            // Form submission
            paymentMethodForm.addEventListener('submit', this.handlePaymentMethodSubmission.bind(this));

            // Load existing payment methods
            this.loadPaymentMethods();
        }

        preparePaymentMethodModal() {
            // Reset form
            document.getElementById('paymentMethodType').value = '';
            this.togglePaymentMethodFields();
        }

        togglePaymentMethodFields() {
            const paymentMethodType = document.getElementById('paymentMethodType').value;
            const paymentDetailsContainer = document.getElementById('paymentDetailsContainer');
            
            // Hide all payment method specific fields
            const creditCardFields = document.getElementById('creditCardFields');
            const bankTransferFields = document.getElementById('bankTransferFields');
            const paypalFields = document.getElementById('paypalFields');
            const razorpayFields = document.getElementById('razorpayFields');

            creditCardFields.style.display = 'none';
            bankTransferFields.style.display = 'none';
            paypalFields.style.display = 'none';
            razorpayFields.style.display = 'none';

            // Show relevant fields based on payment method type
            switch(paymentMethodType) {
                case 'creditCard':
                    creditCardFields.style.display = 'block';
                    break;
                case 'bankTransfer':
                    bankTransferFields.style.display = 'block';
                    break;
                case 'paypal':
                    paypalFields.style.display = 'block';
                    break;
                case 'razorpay':
                    razorpayFields.style.display = 'block';
                    break;
            }
        }

        async handlePaymentMethodSubmission(e) {
            e.preventDefault();

            const paymentMethodType = document.getElementById('paymentMethodType').value;
            let paymentDetails = {};

            // Collect payment method specific details
            switch(paymentMethodType) {
                case 'creditCard':
                    paymentDetails = {
                        cardNumber: document.getElementById('cardNumber').value,
                        expiryDate: document.getElementById('expiryDate').value,
                        cvv: document.getElementById('cvv').value
                    };
                    break;
                case 'bankTransfer':
                    paymentDetails = {
                        accountNumber: document.getElementById('accountNumber').value,
                        bankName: document.getElementById('bankName').value,
                        swiftCode: document.getElementById('swiftCode').value
                    };
                    break;
                case 'paypal':
                    paymentDetails = {
                        paypalEmail: document.getElementById('paypalEmail').value
                    };
                    break;
                case 'razorpay':
                    paymentDetails = {
                        razorpayId: document.getElementById('razorpayId').value
                    };
                    break;
            }

            const formData = {
                type: paymentMethodType,
                details: paymentDetails
            };

            try {
                const response = await fetch(`${this.baseUrl}/payments`, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${this.token}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(formData)
                });

                const result = await response.json();

                if (!response.ok) {
                    throw new Error(result.message || 'Failed to add payment method');
                }

                this.showSuccessNotification('Payment method added successfully');
                
                // Close modal
                document.getElementById('paymentMethodModal').classList.remove('show');

                // Reload payment methods
                this.loadPaymentMethods();
            } catch (error) {
                console.error('Payment Method Submission Error:', error);
                this.showErrorNotification(error.message);
            }
        }

        async loadPaymentMethods() {
            try {
                const response = await fetch(`${this.baseUrl}/payments`, {
                    method: 'GET',
                    headers: {
                        'Authorization': `Bearer ${this.token}`,
                        'Content-Type': 'application/json'
                    }
                });

                const result = await response.json();

                if (!response.ok) {
                    throw new Error(result.message || 'Failed to load payment methods');
                }

                this.renderPaymentMethods(result.data);
            } catch (error) {
                console.error('Load Payment Methods Error:', error);
                this.showErrorNotification('Failed to load payment methods');
            }
        }

        renderPaymentMethods(paymentMethods) {
            const paymentMethodsContainer = document.getElementById('paymentMethodsContainer');
            paymentMethodsContainer.innerHTML = '';

            paymentMethods.forEach(method => {
                const methodCard = document.createElement('div');
                methodCard.className = 'payment-method-card';
                methodCard.innerHTML = `
                    <div class="payment-method-header">
                        <h3>${this.getPaymentMethodIcon(method.type)} ${method.type}</h3>
                    </div>
                    <div class="payment-method-details">
                        ${this.maskPaymentDetails(method)}
                    </div>
                    <div class="payment-method-actions">
                        <button class="btn btn-sm btn-edit" data-id="${method._id}">Edit</button>
                        <button class="btn btn-sm btn-delete" data-id="${method._id}">Delete</button>
                    </div>
                `;

                paymentMethodsContainer.appendChild(methodCard);
            });

            // Add event listeners for edit and delete
            this.addPaymentMethodActionListeners();
        }

        getPaymentMethodIcon(type) {
            switch(type.toLowerCase()) {
                case 'creditcard': return '<i class="fas fa-credit-card"></i>';
                case 'paypal': return '<i class="fab fa-paypal"></i>';
                case 'banktransfer': return '<i class="fas fa-university"></i>';
                case 'razorpay': return '<i class="fas fa-rupee-sign"></i>';
                default: return '<i class="fas fa-money-bill-alt"></i>';
            }
        }

        maskPaymentDetails(method) {
            switch(method.type.toLowerCase()) {
                case 'creditcard':
                    return `**** **** **** ${method.details.cardNumber.slice(-4)}`;
                case 'banktransfer':
                    return `**** ${method.details.accountNumber.slice(-4)}`;
                case 'paypal':
                    return method.details.paypalEmail;
                case 'razorpay':
                    return `Razorpay ID: ${method.details.razorpayId.slice(0, 8)}...`;
                default:
                    return 'Payment Method Details';
            }
        }

        addPaymentMethodActionListeners() {
            const editButtons = document.querySelectorAll('.btn-edit');
            const deleteButtons = document.querySelectorAll('.btn-delete');

            editButtons.forEach(button => {
                button.addEventListener('click', (e) => {
                    const paymentMethodId = e.target.dataset.id;
                    this.editPaymentMethod(paymentMethodId);
                });
            });

            deleteButtons.forEach(button => {
                button.addEventListener('click', (e) => {
                    const paymentMethodId = e.target.dataset.id;
                    this.confirmDeletePaymentMethod(paymentMethodId);
                });
            });
        }

        async editPaymentMethod(paymentMethodId) {
            try {
                const response = await fetch(`${this.baseUrl}/payments/${paymentMethodId}`, {
                    method: 'GET',
                    headers: {
                        'Authorization': `Bearer ${this.token}`,
                        'Content-Type': 'application/json'
                    }
                });

                const result = await response.json();

                if (!response.ok) {
                    throw new Error(result.message || 'Failed to fetch payment method details');
                }

                this.populatePaymentMethodModal(result.data);
            } catch (error) {
                console.error('Edit Payment Method Error:', error);
                this.showErrorNotification('Failed to retrieve payment method details');
            }
        }

        populatePaymentMethodModal(paymentMethod) {
            const paymentMethodModal = document.getElementById('paymentMethodModal');
            
            // Set payment method type
            document.getElementById('paymentMethodType').value = paymentMethod.type;
            this.togglePaymentMethodFields();

            // Populate fields based on payment method type
            switch(paymentMethod.type.toLowerCase()) {
                case 'creditcard':
                    document.getElementById('cardNumber').value = paymentMethod.details.cardNumber;
                    document.getElementById('expiryDate').value = paymentMethod.details.expiryDate;
                    document.getElementById('cvv').value = ''; // CVV is not returned for security
                    break;
                case 'banktransfer':
                    document.getElementById('accountNumber').value = paymentMethod.details.accountNumber;
                    document.getElementById('bankName').value = paymentMethod.details.bankName;
                    document.getElementById('swiftCode').value = paymentMethod.details.swiftCode;
                    break;
                case 'paypal':
                    document.getElementById('paypalEmail').value = paymentMethod.details.paypalEmail;
                    break;
                case 'razorpay':
                    document.getElementById('razorpayId').value = paymentMethod.details.razorpayId;
                    break;
            }

            // Show modal
            paymentMethodModal.classList.add('show');
        }

        confirmDeletePaymentMethod(paymentMethodId) {
            const confirmModal = document.getElementById('confirmDeleteModal');
            const confirmDeleteBtn = document.getElementById('confirmDeleteBtn');
            const cancelDeleteBtn = document.getElementById('cancelDelete');

            // Show modal
            confirmModal.classList.add('show');

            // Remove previous event listeners
            confirmDeleteBtn.onclick = null;
            cancelDeleteBtn.onclick = null;

            // Add new event listeners
            confirmDeleteBtn.onclick = () => this.deletePaymentMethod(paymentMethodId);
            cancelDeleteBtn.onclick = () => confirmModal.classList.remove('show');
        }

        async deletePaymentMethod(paymentMethodId) {
            try {
                const response = await fetch(`${this.baseUrl}/payments/${paymentMethodId}`, {
                    method: 'DELETE',
                    headers: {
                        'Authorization': `Bearer ${this.token}`,
                        'Content-Type': 'application/json'
                    }
                });

                const result = await response.json();

                if (!response.ok) {
                    throw new Error(result.message || 'Failed to delete payment method');
                }

                this.showSuccessNotification('Payment method deleted successfully');
                
                // Close confirmation modal
                document.getElementById('confirmDeleteModal').classList.remove('show');

                // Reload payment methods
                this.loadPaymentMethods();
            } catch (error) {
                console.error('Delete Payment Method Error:', error);
                this.showErrorNotification(error.message);
            }
        }

            // Initialization method to set up all modules
        initializeModule() {
            try {
                // Initialize various modules
                this.initializePricingToggle();
                this.initializeReportingModule();
                this.initializeDiscountManagement();
                this.initializeDataRetentionModule();
                this.initializeFeatureManagement();
                this.initializePaymentMethodManagement();

                // Load initial data
                this.loadPlans();
                this.loadSubscriptions();
                this.loadDiscounts();
                this.loadDataRetentionPolicies();
                this.loadFeatures();
                this.loadPaymentMethods();

                // Show success message
                this.showSuccessNotification('Pricing Module Initialized Successfully');
            } catch (error) {
                console.error('Pricing Module Initialization Error:', error);
                this.showErrorNotification('Failed to initialize Pricing Module');
            }
        }

        // Utility method for deep cloning objects
        deepClone(obj) {
            if (obj === null || typeof obj !== 'object') {
                return obj;
            }

            // Handle Date
            if (obj instanceof Date) {
                return new Date(obj.getTime());
            }

            // Handle Array
            if (Array.isArray(obj)) {
                return obj.map(item => this.deepClone(item));
            }

            // Handle Object
            const clonedObj = {};
            for (const key in obj) {
                if (Object.prototype.hasOwnProperty.call(obj, key)) {
                    clonedObj[key] = this.deepClone(obj[key]);
                }
            }

            return clonedObj;
        }

        // Utility method for comparing objects
        isEqual(obj1, obj2) {
            // Check if both are the same object reference
            if (obj1 === obj2) return true;

            // Check if either is null or not an object
            if (obj1 == null || obj2 == null || 
                typeof obj1 !== 'object' || typeof obj2 !== 'object') {
                return false;
            }

            // Compare keys
            const keys1 = Object.keys(obj1);
            const keys2 = Object.keys(obj2);

            if (keys1.length !== keys2.length) return false;

            // Compare each key's value
            for (const key of keys1) {
                const val1 = obj1[key];
                const val2 = obj2[key];

                // Recursive comparison for nested objects
                if (typeof val1 === 'object' && typeof val2 === 'object') {
                    if (!this.isEqual(val1, val2)) return false;
                } else if (val1 !== val2) {
                    return false;
                }
            }

            return true;
        }

        // Utility method for debouncing function calls
        debounce(func, delay) {
            let timeoutId;
            return function(...args) {
                const context = this;
                clearTimeout(timeoutId);
                timeoutId = setTimeout(() => {
                    func.apply(context, args);
                }, delay);
            };
        }

        // Utility method for throttling function calls
        throttle(func, limit) {
            let inThrottle;
            return function(...args) {
                const context = this;
                if (!inThrottle) {
                    func.apply(context, args);
                    inThrottle = true;
                    setTimeout(() => inThrottle = false, limit);
                }
            };
        }

        // Utility method for generating unique identifiers
        generateUniqueId() {
            return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
                const r = Math.random() * 16 | 0;
                const v = c === 'x' ? r : (r & 0x3 | 0x8);
                return v.toString(16);
            });
        }

        // Utility method for formatting currency
        formatCurrency(amount, currency = 'USD') {
            return new Intl.NumberFormat('en-US', {
                style: 'currency',
                currency: currency
            }).format(amount);
        }

        // Utility method for date formatting
        formatDate(date, format = 'short') {
            const options = {
                short: { 
                    year: 'numeric', 
                    month: 'short', 
                    day: 'numeric' 
                },
                long: { 
                    year: 'numeric', 
                    month: 'long', 
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                }
            };

            return new Intl.DateTimeFormat('en-US', options[format]).format(new Date(date));
        }

        // Error handling utility
        handleError(error, customMessage = '') {
            console.error('Error:', error);
            
            // Log to server or error tracking service
            this.logErrorToServer(error);

            // Show user-friendly notification
            const message = customMessage || error.message || 'An unexpected error occurred';
            this.showErrorNotification(message);
        }

        // Log errors to server (optional implementation)
        async logErrorToServer(error) {
            try {
                await fetch(`${this.baseUrl}/error-log`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${this.token}`
                    },
                    body: JSON.stringify({
                        message: error.message,
                        stack: error.stack,
                        timestamp: new Date().toISOString()
                    })
                });
            } catch (logError) {
                console.error('Failed to log error to server', logError);
            }
        }

            // Final initialization method to set up the entire module
        initializeModuleWithConfig(config) {
            try {
                // Validate configuration
                if (!config || !config.baseUrl) {
                    throw new Error('Invalid configuration: baseUrl is required');
                }

                // Set base URL and token from configuration
                this.baseUrl = config.baseUrl;
                this.token = config.token || localStorage.getItem('token');

                // Optional: Set custom error handling
                if (config.errorHandler) {
                    this.handleError = config.errorHandler;
                }

                // Optional: Set custom notification methods
                if (config.notificationMethods) {
                    if (config.notificationMethods.success) {
                        this.showSuccessNotification = config.notificationMethods.success;
                    }
                    if (config.notificationMethods.error) {
                        this.showErrorNotification = config.notificationMethods.error;
                    }
                }

                // Initialize all modules
                this.initializeModule();

                // Optional: Run custom initialization callbacks
                if (typeof config.onInit === 'function') {
                    config.onInit(this);
                }

                // Return the instance for chaining or further configuration
                return this;
            } catch (error) {
                this.handleError(error, 'Failed to initialize Pricing Module');
                return null;
            }
        }

        // Method to destroy and clean up the module
        destroyModule() {
            try {
                // Remove all event listeners
                const removeEventListeners = (element, eventType, handler) => {
                    if (element) {
                        element.removeEventListener(eventType, handler);
                    }
                };

                // Remove specific event listeners
                removeEventListeners(this.elements.createPlanBtn, 'click', this.openPlanModal);
                removeEventListeners(this.elements.closePlanModal, 'click', this.closeAllModals);
                removeEventListeners(this.elements.cancelPlanModal, 'click', this.closeAllModals);

                // Clear containers
                Object.values(this.elements).forEach(element => {
                    if (element) {
                        element.innerHTML = '';
                    }
                });

                // Reset instance properties
                this.baseUrl = null;
                this.token = null;

                // Optional: Call cleanup callback
                if (typeof this.onDestroy === 'function') {
                    this.onDestroy();
                }

                return true;
            } catch (error) {
                this.handleError(error, 'Error during module destruction');
                return false;
            }
        }
    }

    // Expose the class to the global scope
    window.PricingManager = PricingManager;

    // Optional: Automatic initialization
    document.addEventListener('DOMContentLoaded', () => {
        // Check if auto-initialization is desired
        if (window.PRICING_MANAGER_CONFIG) {
            try {
                window.pricingManagerInstance = new PricingManager().initializeModuleWithConfig(
                    window.PRICING_MANAGER_CONFIG
                );
            } catch (error) {
                console.error('Automatic Pricing Manager Initialization Failed:', error);
            }
        }
    });
})();

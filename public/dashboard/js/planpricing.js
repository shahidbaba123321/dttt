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
                featuresContainer: document.getElementById('featuresContainer')
            };

            // Bind methods
            this.initializeEventListeners = this.initializeEventListeners.bind(this);
            this.loadPlans = this.loadPlans.bind(this);
            this.openPlanModal = this.openPlanModal.bind(this);
            this.closePlanModal = this.closePlanModal.bind(this);
            this.handlePlanSubmission = this.handlePlanSubmission.bind(this);

            // Initialize the module
            this.init();
        }

        init() {
            try {
                this.initializeEventListeners();
                this.loadPlans();
                this.loadAvailableFeatures();
            } catch (error) {
                console.error('Pricing Manager Initialization Error:', error);
                this.showErrorNotification('Failed to initialize Pricing Module');
            }
        }

        initializeEventListeners() {
            // Create Plan Button
            this.elements.createPlanBtn.addEventListener('click', this.openPlanModal);

            // Modal Close Buttons
            this.elements.closePlanModal.addEventListener('click', this.closePlanModal);
            this.elements.cancelPlanModal.addEventListener('click', this.closePlanModal);

            // Form Submission
            this.elements.planForm.addEventListener('submit', this.handlePlanSubmission);
        }

        async loadPlans() {
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

                this.renderPlans(result.data);
            } catch (error) {
                console.error('Load Plans Error:', error);
                this.showErrorNotification('Failed to load pricing plans');
            }
        }

        renderPlans(plans) {
    // Clear existing plans
    this.elements.plansContainer.innerHTML = '';

    // Render each plan
    plans.forEach(plan => {
        // Define currency symbols
        const currencySymbols = {
            'USD': '$',
            'INR': '₹',
            'AED': 'د.إ',
            'QAR': 'ر.ق',
            'GBP': '£'
        };

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

        addPlanActionListeners() {
            const editButtons = this.elements.plansContainer.querySelectorAll('.edit-plan');
            const deleteButtons = this.elements.plansContainer.querySelectorAll('.delete-plan');

            editButtons.forEach(button => {
                button.addEventListener('click', (e) => this.openPlanModal(e.target.dataset.id));
            });

            deleteButtons.forEach(button => {
                button.addEventListener('click', (e) => this.confirmDeletePlan(e.target.dataset.id));
            });
        }

        openPlanModal(planId = null) {
            // Reset form
            this.elements.planForm.reset();
            
            // Set modal title
            const modalTitle = document.getElementById('planModalTitle');
            modalTitle.textContent = planId ? 'Edit Plan' : 'Create New Plan';

            // Show modal
            this.elements.modalOverlay.classList.add('show');
        }

        closePlanModal() {
            this.elements.modalOverlay.classList.remove('show');
        }

        

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

        renderFeatures(features) {
            this.elements.featuresContainer.innerHTML = '';

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

        showErrorNotification(message) {
            // Implement error notification logic
            console.error(message);
        }

        confirmDeletePlan(planId) {
            // Confirmation and deletion logic will be implemented later
            console.log('Confirm delete plan:', planId);
        }
                // Placeholder for error notification method
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

        async handlePlanSubmission(e) {
            e.preventDefault();
            
            // Collect form data
           const formData = {
        name: document.getElementById('planName').value,
        description: document.getElementById('planDescription').value,
        monthlyPrice: parseFloat(document.getElementById('monthlyPrice').value),
        annualPrice: parseFloat(document.getElementById('annualPrice').value),
        trialPeriod: parseInt(document.getElementById('trialPeriod').value) || 0,
        isActive: document.getElementById('planActiveStatus').checked,
        currency: document.getElementById('planCurrency').value, // Add currency
        features: Array.from(
            document.querySelectorAll('input[name="features"]:checked')
        ).map(el => el.value)
    };


            // Get existing plan ID if in edit mode
            const planId = document.getElementById('planId').value;

            try {
                let response;
                let endpoint = planId ? `${this.baseUrl}/plans/${planId}` : `${this.baseUrl}/plans`;
                let method = planId ? 'PUT' : 'POST';

                response = await fetch(endpoint, {
                    method: method,
                    headers: {
                        'Authorization': `Bearer ${this.token}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(formData)
                });

                const result = await response.json();

                if (!response.ok) {
                    throw new Error(result.message || 'Failed to save plan');
                }

                // Show success notification
                this.showSuccessNotification(
                    planId ? 'Plan updated successfully' : 'New plan created successfully'
                );

                // Reload plans
                this.loadPlans();

                // Close modal
                this.closePlanModal();
            } catch (error) {
                console.error('Plan Submission Error:', error);
                this.showErrorNotification(error.message);
            }
        }

        async confirmDeletePlan(planId) {
            // Show confirmation modal
            const confirmModal = document.getElementById('confirmDeleteModal');
            const deletePlanName = document.getElementById('deletePlanName');
            const confirmDeleteBtn = document.getElementById('confirmDeleteBtn');
            const cancelDeleteBtn = document.getElementById('cancelDelete');
            const closeConfirmDelete = document.getElementById('closeConfirmDelete');

            // Find plan name
            const plan = await this.getPlanDetails(planId);
            deletePlanName.textContent = plan.name;

            // Show modal
            confirmModal.classList.add('show');

            // Remove previous event listeners to prevent multiple bindings
            confirmDeleteBtn.onclick = null;
            cancelDeleteBtn.onclick = null;
            closeConfirmDelete.onclick = null;

            // Add event listeners
            confirmDeleteBtn.onclick = () => this.deletePlan(planId);
            cancelDeleteBtn.onclick = () => confirmModal.classList.remove('show');
            closeConfirmDelete.onclick = () => confirmModal.classList.remove('show');
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

        async deletePlan(planId) {
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

        // Pricing Toggle Functionality
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
                const monthlyPrice = parseFloat(priceValue.textContent.replace('$', ''));
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

        initiatePaymentMethodChange(subscription) {
            // Open payment method modal
            const paymentModal = document.getElementById('paymentMethodModal');
            paymentModal.classList.add('show');

            // Populate existing payment methods
            this.loadPaymentMethods(subscription);
        }

        async loadPaymentMethods(subscription) {
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
                console.error('Payment Methods Error:', error);
                this.showErrorNotification('Failed to load payment methods');
            }
        }

        renderPaymentMethods(paymentMethods) {
            const methodsContainer = document.getElementById('paymentMethodsContainer');
            methodsContainer.innerHTML = '';

            paymentMethods.forEach(method => {
                const methodCard = document.createElement('div');
                methodCard.className = 'payment-method-card';
                methodCard.innerHTML = `
                    <input type="radio" 
                           name="paymentMethod" 
                           id="method-${method._id}" 
                           value="${method._id}">
                    <label for="method-${method._id}">
                        <i class="fas fa-${this.getPaymentMethodIcon(method.type)}"></i>
                        <span>${method.type}</span>
                        <small>${this.maskPaymentDetails(method)}</small>
                    </label>
                `;

                methodsContainer.appendChild(methodCard);
            });
        }

        getPaymentMethodIcon(type) {
            switch(type.toLowerCase()) {
                case 'creditcard': return 'credit-card';
                case 'paypal': return 'paypal';
                case 'banktransfer': return 'university';
                default: return 'money-bill-alt';
            }
        }

        maskPaymentDetails(method) {
            // Implement masking logic based on payment method type
            switch(method.type.toLowerCase()) {
                case 'creditcard':
                    return `**** **** **** ${method.details.cardNumber.slice(-4)}`;
                case 'banktransfer':
                    return `**** ${method.details.accountNumber.slice(-4)}`;
                default:
                    return method.details.email || '';
            }
        }

            // Discount and Coupon Management
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

            // Reporting and Analytics Methods
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

            // Data Retention Policy Management
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

        // Initialization method to set up all modules
        initializeModule() {
            try {
                // Initialize various modules
                this.initializePricingToggle();
                this.initializeReportingModule();
                this.initializeDiscountManagement();
                this.initializeDataRetentionModule();

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

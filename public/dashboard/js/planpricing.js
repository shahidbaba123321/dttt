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
            
            // Currency options
            this.currencyOptions = [
                { code: 'USD', symbol: '$', name: 'US Dollar', country: 'USA' },
                { code: 'INR', symbol: '₹', name: 'Indian Rupee', country: 'India' },
                { code: 'AED', symbol: 'د.إ', name: 'UAE Dirham', country: 'UAE' },
                { code: 'QAR', symbol: 'ر.ق', name: 'Qatari Riyal', country: 'Qatar' },
                { code: 'GBP', symbol: '£', name: 'British Pound', country: 'UK' }
            ];
            
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
            this.initializeCurrencySelection = this.initializeCurrencySelection.bind(this);

            // Initialize the module
            this.init();
        }

        init() {
            try {
                this.initializeEventListeners();
                this.loadPlans();
                this.loadAvailableFeatures();
                this.initializeCurrencySelection();
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

        initializeCurrencySelection() {
            const currencySelect = document.getElementById('planCurrency');
            const monthlyPriceLabel = document.getElementById('currencySymbolMonthly');
            const annualPriceLabel = document.getElementById('currencySymbolAnnual');

            currencySelect.addEventListener('change', (e) => {
                const selectedCurrency = this.currencyOptions.find(c => c.code === e.target.value);
                
                // Update label symbols
                monthlyPriceLabel.textContent = `(${selectedCurrency.symbol})`;
                annualPriceLabel.textContent = `(${selectedCurrency.symbol})`;
            });
        }

        formatCurrency(amount, currencyCode = 'USD') {
            const currency = this.currencyOptions.find(c => c.code === currencyCode) || 
                             this.currencyOptions.find(c => c.code === 'USD');
            return `${currency.symbol}${amount.toFixed(2)}`;
        }

        // Currency selection initialization in modal
        openPlanModal(planId = null) {
            // Reset form
            this.elements.planForm.reset();
            
            // Populate currency dropdown
            const currencySelect = document.getElementById('planCurrency');
            currencySelect.innerHTML = this.currencyOptions.map(currency => `
                <option value="${currency.code}">${currency.name} (${currency.symbol})</option>
            `).join('');

            // Set modal title
            const modalTitle = document.getElementById('planModalTitle');
            modalTitle.textContent = planId ? 'Edit Plan' : 'Create New Plan';

            // Initialize currency symbol
            const selectedCurrency = this.currencyOptions.find(c => c.code === currencySelect.value);
            document.getElementById('currencySymbolMonthly').textContent = `(${selectedCurrency.symbol})`;
            document.getElementById('currencySymbolAnnual').textContent = `(${selectedCurrency.symbol})`;

            // If editing, populate existing plan details
            if (planId) {
                this.populatePlanEditModal(planId);
            }

            // Show modal
            this.elements.modalOverlay.classList.add('show');
        }
                async populatePlanEditModal(planId) {
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

                const plan = result.data;

                // Populate form fields
                document.getElementById('planName').value = plan.name;
                document.getElementById('planDescription').value = plan.description;
                document.getElementById('monthlyPrice').value = plan.monthlyPrice;
                document.getElementById('annualPrice').value = plan.annualPrice;
                document.getElementById('trialPeriod').value = plan.trialPeriod;
                document.getElementById('planCurrency').value = plan.currency || 'USD';
                document.getElementById('planActiveStatus').checked = plan.isActive;

                // Update currency symbols
                const selectedCurrency = this.currencyOptions.find(c => c.code === (plan.currency || 'USD'));
                document.getElementById('currencySymbolMonthly').textContent = `(${selectedCurrency.symbol})`;
                document.getElementById('currencySymbolAnnual').textContent = `(${selectedCurrency.symbol})`;

                // Populate features
                const featuresContainer = document.getElementById('featuresContainer');
                featuresContainer.querySelectorAll('input[type="checkbox"]').forEach(checkbox => {
                    checkbox.checked = plan.features.some(f => f._id === checkbox.value);
                });

                // Store plan ID for update
                document.getElementById('planId').value = planId;
            } catch (error) {
                console.error('Populate Plan Edit Modal Error:', error);
                this.showErrorNotification('Failed to load plan details');
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
                currency: document.getElementById('planCurrency').value,
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

        closePlanModal() {
            this.elements.modalOverlay.classList.remove('show');
        }

    async confirmDeletePlan(planId) {
            try {
                // First, fetch plan details to check if it's a system plan
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

                const plan = result.data;

                // Check if it's a system plan
                if (plan.isSystem) {
                    this.showErrorNotification('System plans cannot be deleted');
                    return;
                }

                // Check if plan has active subscriptions
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
        }
                // Discount Management Methods
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
                                : `${this.formatCurrency(discount.value, 'USD')} off`}
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

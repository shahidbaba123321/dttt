(function() {
'use strict';

// Check if PricingManager already exists
if (window.PricingManager) {
    console.log('PricingManager already exists');
    return;
}

class PricingManager {
    constructor() {
        // Base configuration
        this.baseUrl = 'https://18.215.160.136.nip.io/api';
        this.token = localStorage.getItem('token');

        // DOM elements
        this.planList = document.getElementById('planList');
        this.planModal = document.getElementById('planModal');
        this.featureModal = document.getElementById('featureModal');
        this.discountModal = document.getElementById('discountModal');
        this.subscriptionModal = document.getElementById('subscriptionModal');
        this.paymentModal = document.getElementById('paymentModal');
        this.invoiceModal = document.getElementById('invoiceModal');
        this.reportsModal = document.getElementById('reportsModal');
        this.applyDiscountModal = document.getElementById('applyDiscountModal');
        this.referralDiscountModal = document.getElementById('referralDiscountModal');
        this.subscriptionLogsModal = document.getElementById('subscriptionLogsModal');
        this.dataRetentionModal = document.getElementById('dataRetentionModal');

        // Form elements
        this.planForm = document.getElementById('planForm');
        this.featureForm = document.getElementById('featureForm');
        this.discountForm = document.getElementById('discountForm');
        this.subscriptionForm = document.getElementById('subscriptionForm');
        this.paymentForm = document.getElementById('paymentForm');
        this.invoiceForm = document.getElementById('invoiceForm');
        this.applyDiscountForm = document.getElementById('applyDiscountForm');
        this.referralDiscountForm = document.getElementById('referralDiscountForm');
        this.dataRetentionForm = document.getElementById('dataRetentionForm');

        // Buttons
        this.createPlanButton = document.getElementById('createPlanButton');
        this.viewReportsButton = document.getElementById('viewReportsButton');
        this.closeModalButton = document.getElementById('closeModalButton');
        this.savePlanButton = document.getElementById('savePlanButton');
        this.deletePlanButton = document.getElementById('deletePlanButton');
        this.addFeatureButton = document.getElementById('addFeatureButton');
        this.closeFeatureModalButton = document.getElementById('closeFeatureModalButton');
        this.saveFeatureButton = document.getElementById('saveFeatureButton');
        this.closeDiscountModalButton = document.getElementById('closeDiscountModalButton');
        this.saveDiscountButton = document.getElementById('saveDiscountButton');
        this.deleteDiscountButton = document.getElementById('deleteDiscountButton');
        this.closeSubscriptionModalButton = document.getElementById('closeSubscriptionModalButton');
        this.saveSubscriptionButton = document.getElementById('saveSubscriptionButton');
        this.closePaymentModalButton = document.getElementById('closePaymentModalButton');
        this.savePaymentButton = document.getElementById('savePaymentButton');
        this.closeInvoiceModalButton = document.getElementById('closeInvoiceModalButton');
        this.generateInvoiceButton = document.getElementById('generateInvoiceButton');
        this.closeReportsModalButton = document.getElementById('closeReportsModalButton');
        this.generateReportButton = document.getElementById('generateReportButton');
        this.exportReportButton = document.getElementById('exportReportButton');
        this.closeApplyDiscountModalButton = document.getElementById('closeApplyDiscountModalButton');
        this.applyDiscountButton = document.getElementById('applyDiscountButton');
        this.closeReferralDiscountModalButton = document.getElementById('closeReferralDiscountModalButton');
        this.saveReferralDiscountButton = document.getElementById('saveReferralDiscountButton');
        this.closeSubscriptionLogsModalButton = document.getElementById('closeSubscriptionLogsModalButton');
        this.closeDataRetentionModalButton = document.getElementById('closeDataRetentionModalButton');
        this.saveDataRetentionButton = document.getElementById('saveDataRetentionButton');

        // Initialize event listeners
        this.initializeEventListeners();

        // Load plans on initialization
        this.loadPlans();
    }

    initializeEventListeners() {
        // Plan Management
        this.createPlanButton.addEventListener('click', () => this.openPlanModal());
        this.planList.addEventListener('click', (e) => this.handlePlanListClick(e));
        this.closeModalButton.addEventListener('click', () => this.closeModal(this.planModal));
        this.savePlanButton.addEventListener('click', (e) => this.savePlan(e));
        this.deletePlanButton.addEventListener('click', (e) => this.deletePlan(e));
        this.addFeatureButton.addEventListener('click', () => this.openFeatureModal());

        // Feature Management
        this.closeFeatureModalButton.addEventListener('click', () => this.closeModal(this.featureModal));
        this.saveFeatureButton.addEventListener('click', (e) => this.saveFeature(e));

        // Discount Management
        this.discountModal.addEventListener('click', (e) => this.handleDiscountModalClick(e));
        this.closeDiscountModalButton.addEventListener('click', () => this.closeModal(this.discountModal));
        this.saveDiscountButton.addEventListener('click', (e) => this.saveDiscount(e));
        this.deleteDiscountButton.addEventListener('click', (e) => this.deleteDiscount(e));

        // Subscription Management
        this.subscriptionModal.addEventListener('click', (e) => this.handleSubscriptionModalClick(e));
        this.closeSubscriptionModalButton.addEventListener('click', () => this.closeModal(this.subscriptionModal));
        this.saveSubscriptionButton.addEventListener('click', (e) => this.saveSubscription(e));

        // Payment Management
        this.paymentModal.addEventListener('click', (e) => this.handlePaymentModalClick(e));
        this.closePaymentModalButton.addEventListener('click', () => this.closeModal(this.paymentModal));
        this.savePaymentButton.addEventListener('click', (e) => this.savePayment(e));

        // Invoice Management
        this.invoiceModal.addEventListener('click', (e) => this.handleInvoiceModalClick(e));
        this.closeInvoiceModalButton.addEventListener('click', () => this.closeModal(this.invoiceModal));
        this.generateInvoiceButton.addEventListener('click', (e) => this.generateInvoice(e));

        // Reports
        this.viewReportsButton.addEventListener('click', () => this.openReportsModal());
        this.closeReportsModalButton.addEventListener('click', () => this.closeModal(this.reportsModal));
        this.generateReportButton.addEventListener('click', (e) => this.generateReport(e));
        this.exportReportButton.addEventListener('click', (e) => this.exportReport(e));

        // Discount Application
        this.applyDiscountModal.addEventListener('click', (e) => this.handleApplyDiscountModalClick(e));
        this.closeApplyDiscountModalButton.addEventListener('click', () => this.closeModal(this.applyDiscountModal));
        this.applyDiscountButton.addEventListener('click', (e) => this.applyDiscount(e));

        // Referral & Partner Discounts
        this.referralDiscountModal.addEventListener('click', (e) => this.handleReferralDiscountModalClick(e));
        this.closeReferralDiscountModalButton.addEventListener('click', () => this.closeModal(this.referralDiscountModal));
        this.saveReferralDiscountButton.addEventListener('click', (e) => this.saveReferralDiscount(e));

        // Subscription Logs
        this.subscriptionLogsModal.addEventListener('click', (e) => this.handleSubscriptionLogsModalClick(e));
        this.closeSubscriptionLogsModalButton.addEventListener('click', () => this.closeModal(this.subscriptionLogsModal));

        // Data Retention Policies
        this.dataRetentionModal.addEventListener('click', (e) => this.handleDataRetentionModalClick(e));
        this.closeDataRetentionModalButton.addEventListener('click', () => this.closeModal(this.dataRetentionModal));
        this.saveDataRetentionButton.addEventListener('click', (e) => this.saveDataRetention(e));
    }

    // Helper method to close modals
    closeModal(modal) {
        modal.classList.remove('active');
    }

    // Helper method to open modals
    openModal(modal, title = '') {
        const modalTitle = modal.querySelector('.modal-title');
        if (modalTitle) {
            modalTitle.textContent = title;
        }
        modal.classList.add('active');
    }

    // Helper method to show loading state
    showLoadingState(element) {
        element.innerHTML = '<div class="loader-spinner"><i class="fas fa-spinner fa-spin"></i></div>';
    }

    // Helper method to show error state
    showErrorState(element, message) {
        element.innerHTML = `<div class="error-state"><i class="fas fa-exclamation-triangle"></i><p>${message}</p></div>`;
    }

    // Helper method to show success state
    showSuccessState(element, message) {
        element.innerHTML = `<div class="success-state"><i class="fas fa-check-circle"></i><p>${message}</p></div>`;
    }

    // Helper method to create form error
    createFormError(element, message) {
        const errorElement = document.createElement('div');
        errorElement.className = 'form-error';
        errorElement.textContent = message;
        element.parentNode.insertBefore(errorElement, element.nextSibling);
    }

    // Helper method to remove form errors
    removeFormErrors(form) {
        const errorElements = form.querySelectorAll('.form-error');
        errorElements.forEach(error => error.remove());
    }

    // Helper method to validate form
    validateForm(form) {
        this.removeFormErrors(form);
        let isValid = true;

        const requiredFields = form.querySelectorAll('[required]');
        requiredFields.forEach(field => {
            if (!field.value.trim()) {
                this.createFormError(field, `${field.name} is required`);
                isValid = false;
            }
        });

        return isValid;
    }

    // Helper method to fetch data from API
    async fetchData(endpoint, method = 'GET', body = null) {
        const headers = {
            'Authorization': `Bearer ${this.token}`,
            'Content-Type': 'application/json'
        };

        try {
            const response = await fetch(`${this.baseUrl}/${endpoint}`, {
                method,
                headers,
                body: body ? JSON.stringify(body) : null
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            return await response.json();
        } catch (error) {
            console.error('Fetch error:', error);
            throw error;
        }
    }

    // Helper method to create audit log
    async createAuditLog(action, details) {
        try {
            await this.fetchData('audit-logs', 'POST', {
                action,
                details
            });
        } catch (error) {
            console.error('Error creating audit log:', error);
        }
    }
}

     // Plan Management Methods

    async loadPlans() {
        try {
            this.showLoadingState(this.planList);
            const response = await this.fetchData('plans');
            if (response.success) {
                this.planList.innerHTML = '';
                response.data.forEach(plan => {
                    const planCard = this.createPlanCard(plan);
                    this.planList.appendChild(planCard);
                });
            } else {
                this.showErrorState(this.planList, response.message || 'Failed to load plans');
            }
        } catch (error) {
            this.showErrorState(this.planList, error.message || 'An error occurred while loading plans');
        }
    }

    createPlanCard(plan) {
        const planCard = document.createElement('div');
        planCard.className = 'plan-card';
        planCard.dataset.planId = plan._id;
        planCard.innerHTML = `
            <h3 class="plan-name">${plan.name}</h3>
            <p class="plan-price">$${plan.monthlyPrice}/mo or $${plan.annualPrice}/yr</p>
            <ul class="plan-features">
                ${plan.features.map(feature => `<li class="plan-feature"><i class="fas fa-check"></i>${feature.name}</li>`).join('')}
            </ul>
            <div class="plan-actions">
                <button class="plan-action-button edit-plan">Edit</button>
                <button class="plan-action-button delete-plan">Delete</button>
                <button class="plan-action-button view-subscriptions">View Subscriptions</button>
            </div>
        `;
        return planCard;
    }

    openPlanModal(plan = null) {
        this.planForm.reset();
        this.planForm.querySelector('#planName').value = plan ? plan.name : '';
        this.planForm.querySelector('#planDescription').value = plan ? plan.description : '';
        this.planForm.querySelector('#monthlyPrice').value = plan ? plan.monthlyPrice : '';
        this.planForm.querySelector('#annualPrice').value = plan ? plan.annualPrice : '';
        this.planForm.querySelector('#trialPeriod').value = plan ? plan.trialPeriod : '';
        this.planForm.querySelector('#isActive').checked = plan ? plan.isActive : true;

        const featureList = this.planForm.querySelector('#featureList');
        featureList.innerHTML = '';
        if (plan && plan.features) {
            plan.features.forEach(feature => {
                this.addFeatureToForm(featureList, feature);
            });
        }

        this.planForm.dataset.planId = plan ? plan._id : '';
        this.openModal(this.planModal, plan ? 'Edit Plan' : 'Create New Plan');

        if (plan) {
            this.deletePlanButton.style.display = 'inline-block';
        } else {
            this.deletePlanButton.style.display = 'none';
        }
    }

    addFeatureToForm(featureList, feature = null) {
        const featureItem = document.createElement('div');
        featureItem.className = 'form-group';
        featureItem.innerHTML = `
            <label class="form-label">Feature</label>
            <input type="text" class="form-input feature-name" value="${feature ? feature.name : ''}" required>
            <button type="button" class="pricing-action-button secondary remove-feature">Remove</button>
        `;
        featureList.appendChild(featureItem);

        featureItem.querySelector('.remove-feature').addEventListener('click', () => {
            featureItem.remove();
        });
    }

    async savePlan(e) {
        e.preventDefault();
        if (!this.validateForm(this.planForm)) return;

        const planId = this.planForm.dataset.planId;
        const method = planId ? 'PUT' : 'POST';
        const endpoint = planId ? `plans/${planId}` : 'plans';

        const features = Array.from(this.planForm.querySelectorAll('.feature-name')).map(input => ({
            name: input.value.trim()
        }));

        const planData = {
            name: this.planForm.querySelector('#planName').value.trim(),
            description: this.planForm.querySelector('#planDescription').value.trim(),
            monthlyPrice: parseFloat(this.planForm.querySelector('#monthlyPrice').value),
            annualPrice: parseFloat(this.planForm.querySelector('#annualPrice').value),
            trialPeriod: parseInt(this.planForm.querySelector('#trialPeriod').value) || 0,
            isActive: this.planForm.querySelector('#isActive').checked,
            features: features
        };

        try {
            this.showLoadingState(this.planForm);
            const response = await this.fetchData(endpoint, method, planData);
            if (response.success) {
                this.showSuccessState(this.planForm, `${planId ? 'Plan updated' : 'Plan created'} successfully`);
                this.closeModal(this.planModal);
                this.loadPlans();
                await this.createAuditLog(planId ? 'PLAN_UPDATED' : 'PLAN_CREATED', planData);
            } else {
                this.showErrorState(this.planForm, response.message || 'Failed to save plan');
            }
        } catch (error) {
            this.showErrorState(this.planForm, error.message || 'An error occurred while saving the plan');
        }
    }

    async deletePlan(e) {
        e.preventDefault();
        const planId = this.planForm.dataset.planId;
        if (!planId) return;

        if (!confirm('Are you sure you want to delete this plan?')) return;

        try {
            this.showLoadingState(this.planForm);
            const response = await this.fetchData(`plans/${planId}`, 'DELETE');
            if (response.success) {
                this.showSuccessState(this.planForm, 'Plan deleted successfully');
                this.closeModal(this.planModal);
                this.loadPlans();
                await this.createAuditLog('PLAN_DELETED', { planId });
            } else {
                this.showErrorState(this.planForm, response.message || 'Failed to delete plan');
            }
        } catch (error) {
            this.showErrorState(this.planForm, error.message || 'An error occurred while deleting the plan');
        }
    }

    handlePlanListClick(e) {
        const target = e.target;
        if (target.classList.contains('edit-plan')) {
            const planCard = target.closest('.plan-card');
            const planId = planCard.dataset.planId;
            this.editPlan(planId);
        } else if (target.classList.contains('delete-plan')) {
            const planCard = target.closest('.plan-card');
            const planId = planCard.dataset.planId;
            this.deletePlanFromList(planId);
        } else if (target.classList.contains('view-subscriptions')) {
            const planCard = target.closest('.plan-card');
            const planId = planCard.dataset.planId;
            this.viewSubscriptions(planId);
        }
    }

    async editPlan(planId) {
        try {
            const response = await this.fetchData(`plans/${planId}`);
            if (response.success) {
                this.openPlanModal(response.data);
            } else {
                console.error('Error fetching plan:', response.message);
            }
        } catch (error) {
            console.error('Error fetching plan:', error);
        }
    }

    async deletePlanFromList(planId) {
        if (!confirm('Are you sure you want to delete this plan?')) return;

        try {
            const response = await this.fetchData(`plans/${planId}`, 'DELETE');
            if (response.success) {
                this.loadPlans();
                await this.createAuditLog('PLAN_DELETED', { planId });
            } else {
                console.error('Error deleting plan:', response.message);
            }
        } catch (error) {
            console.error('Error deleting plan:', error);
        }
    }

    async viewSubscriptions(planId) {
        try {
            const response = await this.fetchData(`subscriptions?planId=${planId}`);
            if (response.success) {
                this.openSubscriptionModal(response.data, planId);
            } else {
                console.error('Error fetching subscriptions:', response.message);
            }
        } catch (error) {
            console.error('Error fetching subscriptions:', error);
        }
    }

     // Feature Management Methods

    openFeatureModal(feature = null) {
        this.featureForm.reset();
        if (feature) {
            this.featureForm.querySelector('#featureName').value = feature.name;
            this.featureForm.querySelector('#featureDescription').value = feature.description;
            this.featureForm.querySelector('#featureCategory').value = feature.category;
            this.featureForm.dataset.featureId = feature._id;
        } else {
            this.featureForm.dataset.featureId = '';
        }
        this.openModal(this.featureModal, feature ? 'Edit Feature' : 'Add Feature');
    }

    async saveFeature(e) {
        e.preventDefault();
        if (!this.validateForm(this.featureForm)) return;

        const featureId = this.featureForm.dataset.featureId;
        const method = featureId ? 'PUT' : 'POST';
        const endpoint = featureId ? `features/${featureId}` : 'features';

        const featureData = {
            name: this.featureForm.querySelector('#featureName').value.trim(),
            description: this.featureForm.querySelector('#featureDescription').value.trim(),
            category: this.featureForm.querySelector('#featureCategory').value
        };

        try {
            this.showLoadingState(this.featureForm);
            const response = await this.fetchData(endpoint, method, featureData);
            if (response.success) {
                this.showSuccessState(this.featureForm, `${featureId ? 'Feature updated' : 'Feature added'} successfully`);
                this.closeModal(this.featureModal);
                await this.createAuditLog(featureId ? 'FEATURE_UPDATED' : 'FEATURE_CREATED', featureData);
                this.updateFeatureList();
            } else {
                this.showErrorState(this.featureForm, response.message || 'Failed to save feature');
            }
        } catch (error) {
            this.showErrorState(this.featureForm, error.message || 'An error occurred while saving the feature');
        }
    }

    updateFeatureList() {
        const featureList = this.planForm.querySelector('#featureList');
        const existingFeatures = Array.from(featureList.querySelectorAll('.feature-name')).map(input => input.value.trim());
        featureList.innerHTML = '';
        existingFeatures.forEach(featureName => {
            this.addFeatureToForm(featureList, { name: featureName });
        });
    }

    // Discount Management Methods

    openDiscountModal(discount = null) {
        this.discountForm.reset();
        if (discount) {
            this.discountForm.querySelector('#discountCode').value = discount.code;
            this.discountForm.querySelector('#discountType').value = discount.type;
            this.discountForm.querySelector('#discountValue').value = discount.value;
            this.discountForm.querySelector('#discountExpiry').value = discount.expiryDate.split('T')[0];
            this.discountForm.querySelector('#discountUsageLimit').value = discount.usageLimit || '';
            this.discountForm.querySelector('#discountApplicablePlans').value = discount.applicablePlans || [];

            this.discountForm.dataset.discountId = discount._id;
            this.openModal(this.discountModal, 'Edit Discount');
            this.deleteDiscountButton.style.display = 'inline-block';
        } else {
            this.discountForm.dataset.discountId = '';
            this.openModal(this.discountModal, 'Create Discount');
            this.deleteDiscountButton.style.display = 'none';
        }

        this.populateDiscountPlans();
    }

    async populateDiscountPlans() {
        try {
            const response = await this.fetchData('plans');
            if (response.success) {
                const select = this.discountForm.querySelector('#discountApplicablePlans');
                select.innerHTML = '';
                response.data.forEach(plan => {
                    const option = document.createElement('option');
                    option.value = plan._id;
                    option.textContent = plan.name;
                    select.appendChild(option);
                });
            } else {
                console.error('Error fetching plans:', response.message);
            }
        } catch (error) {
            console.error('Error fetching plans:', error);
        }
    }

    async saveDiscount(e) {
        e.preventDefault();
        if (!this.validateForm(this.discountForm)) return;

        const discountId = this.discountForm.dataset.discountId;
        const method = discountId ? 'PUT' : 'POST';
        const endpoint = discountId ? `discounts/${discountId}` : 'discounts';

        const applicablePlans = Array.from(this.discountForm.querySelector('#discountApplicablePlans').selectedOptions).map(option => option.value);

        const discountData = {
            code: this.discountForm.querySelector('#discountCode').value.trim(),
            type: this.discountForm.querySelector('#discountType').value,
            value: parseFloat(this.discountForm.querySelector('#discountValue').value),
            expiryDate: new Date(this.discountForm.querySelector('#discountExpiry').value).toISOString(),
            usageLimit: parseInt(this.discountForm.querySelector('#discountUsageLimit').value) || 0,
            applicablePlans: applicablePlans
        };

        try {
            this.showLoadingState(this.discountForm);
            const response = await this.fetchData(endpoint, method, discountData);
            if (response.success) {
                this.showSuccessState(this.discountForm, `${discountId ? 'Discount updated' : 'Discount created'} successfully`);
                this.closeModal(this.discountModal);
                await this.createAuditLog(discountId ? 'DISCOUNT_UPDATED' : 'DISCOUNT_CREATED', discountData);
            } else {
                this.showErrorState(this.discountForm, response.message || 'Failed to save discount');
            }
        } catch (error) {
            this.showErrorState(this.discountForm, error.message || 'An error occurred while saving the discount');
        }
    }

    async deleteDiscount(e) {
        e.preventDefault();
        const discountId = this.discountForm.dataset.discountId;
        if (!discountId) return;

        if (!confirm('Are you sure you want to delete this discount?')) return;

        try {
            this.showLoadingState(this.discountForm);
            const response = await this.fetchData(`discounts/${discountId}`, 'DELETE');
            if (response.success) {
                this.showSuccessState(this.discountForm, 'Discount deleted successfully');
                this.closeModal(this.discountModal);
                await this.createAuditLog('DISCOUNT_DELETED', { discountId });
            } else {
                this.showErrorState(this.discountForm, response.message || 'Failed to delete discount');
            }
        } catch (error) {
            this.showErrorState(this.discountForm, error.message || 'An error occurred while deleting the discount');
        }
    }

    handleDiscountModalClick(e) {
        const target = e.target;
        if (target.classList.contains('modal-close')) {
            this.closeModal(this.discountModal);
        }
    }

     // Subscription Management Methods

    openSubscriptionModal(subscriptions = [], planId = null) {
        this.subscriptionForm.reset();
        const subscriptionModalTitle = this.subscriptionModal.querySelector('#subscriptionModalTitle');
        subscriptionModalTitle.textContent = planId ? 'Manage Subscriptions for Plan' : 'Manage Subscriptions';

        const subscriptionList = this.subscriptionModal.querySelector('.modal-content');
        subscriptionList.innerHTML = `
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
                            <td>${subscription.companyName}</td>
                            <td>${subscription.planName}</td>
                            <td>${subscription.status}</td>
                            <td>${new Date(subscription.startDate).toLocaleDateString()}</td>
                            <td>${new Date(subscription.endDate).toLocaleDateString()}</td>
                            <td>
                                <button class="modal-button secondary edit-subscription">Edit</button>
                                <button class="modal-button secondary view-invoices">View Invoices</button>
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;

        if (planId) {
            this.subscriptionForm.querySelector('#newPlan').value = planId;
            this.subscriptionForm.querySelector('#newPlan').disabled = true;
        } else {
            this.populateSubscriptionPlans();
        }

        this.openModal(this.subscriptionModal);
    }

    async populateSubscriptionPlans() {
        try {
            const response = await this.fetchData('plans');
            if (response.success) {
                const select = this.subscriptionForm.querySelector('#newPlan');
                select.innerHTML = '';
                response.data.forEach(plan => {
                    const option = document.createElement('option');
                    option.value = plan._id;
                    option.textContent = plan.name;
                    select.appendChild(option);
                });
            } else {
                console.error('Error fetching plans:', response.message);
            }
        } catch (error) {
            console.error('Error fetching plans:', error);
        }
    }

    async populateCompanies() {
        try {
            const response = await this.fetchData('companies');
            if (response.success) {
                const select = this.subscriptionForm.querySelector('#companyName');
                select.innerHTML = '';
                response.companies.forEach(company => {
                    const option = document.createElement('option');
                    option.value = company._id;
                    option.textContent = company.name;
                    select.appendChild(option);
                });
            } else {
                console.error('Error fetching companies:', response.message);
            }
        } catch (error) {
            console.error('Error fetching companies:', error);
        }
    }

    async saveSubscription(e) {
        e.preventDefault();
        if (!this.validateForm(this.subscriptionForm)) return;

        const subscriptionId = this.subscriptionForm.dataset.subscriptionId;
        const method = subscriptionId ? 'PUT' : 'POST';
        const endpoint = subscriptionId ? `subscriptions/${subscriptionId}` : 'subscriptions';

        const subscriptionData = {
            companyId: this.subscriptionForm.querySelector('#companyName').value,
            planId: this.subscriptionForm.querySelector('#newPlan').value,
            billingCycle: this.subscriptionForm.querySelector('#billingCycle').value,
            startDate: new Date(this.subscriptionForm.querySelector('#startDate').value).toISOString(),
            endDate: new Date(this.subscriptionForm.querySelector('#endDate').value).toISOString(),
            discountCode: this.subscriptionForm.querySelector('#discountCode').value.trim() || null
        };

        try {
            this.showLoadingState(this.subscriptionForm);
            const response = await this.fetchData(endpoint, method, subscriptionData);
            if (response.success) {
                this.showSuccessState(this.subscriptionForm, `${subscriptionId ? 'Subscription updated' : 'Subscription created'} successfully`);
                this.closeModal(this.subscriptionModal);
                await this.createAuditLog(subscriptionId ? 'SUBSCRIPTION_UPDATED' : 'SUBSCRIPTION_CREATED', subscriptionData);
            } else {
                this.showErrorState(this.subscriptionForm, response.message || 'Failed to save subscription');
            }
        } catch (error) {
            this.showErrorState(this.subscriptionForm, error.message || 'An error occurred while saving the subscription');
        }
    }

    handleSubscriptionModalClick(e) {
        const target = e.target;
        if (target.classList.contains('modal-close')) {
            this.closeModal(this.subscriptionModal);
        } else if (target.classList.contains('edit-subscription')) {
            const subscriptionRow = target.closest('tr');
            const subscriptionId = subscriptionRow.dataset.subscriptionId;
            this.editSubscription(subscriptionId);
        } else if (target.classList.contains('view-invoices')) {
            const subscriptionRow = target.closest('tr');
            const subscriptionId = subscriptionRow.dataset.subscriptionId;
            this.viewInvoices(subscriptionId);
        }
    }

    async editSubscription(subscriptionId) {
        try {
            const response = await this.fetchData(`subscriptions/${subscriptionId}`);
            if (response.success) {
                const subscription = response.data;
                this.subscriptionForm.reset();
                this.subscriptionForm.querySelector('#companyName').value = subscription.companyId;
                this.subscriptionForm.querySelector('#currentPlan').value = subscription.planName;
                this.subscriptionForm.querySelector('#newPlan').value = subscription.planId;
                this.subscriptionForm.querySelector('#billingCycle').value = subscription.billingCycle;
                this.subscriptionForm.querySelector('#startDate').value = subscription.startDate.split('T')[0];
                this.subscriptionForm.querySelector('#endDate').value = subscription.endDate.split('T')[0];
                this.subscriptionForm.querySelector('#discountCode').value = subscription.discountCode || '';

                this.subscriptionForm.dataset.subscriptionId = subscriptionId;
                this.openModal(this.subscriptionModal, 'Edit Subscription');
            } else {
                console.error('Error fetching subscription:', response.message);
            }
        } catch (error) {
            console.error('Error fetching subscription:', error);
        }
    }

    async viewInvoices(subscriptionId) {
        try {
            const response = await this.fetchData(`invoices?subscriptionId=${subscriptionId}`);
            if (response.success) {
                this.openInvoiceModal(response.data, subscriptionId);
            } else {
                console.error('Error fetching invoices:', response.message);
            }
        } catch (error) {
            console.error('Error fetching invoices:', error);
        }
    }

     // Payment Management Methods

    openPaymentModal(paymentMethod = null) {
        this.paymentForm.reset();
        if (paymentMethod) {
            this.paymentForm.querySelector('#paymentMethod').value = paymentMethod.type;
            this.populatePaymentDetails(paymentMethod);
            this.paymentForm.dataset.paymentId = paymentMethod._id;
            this.openModal(this.paymentModal, 'Edit Payment Method');
        } else {
            this.paymentForm.dataset.paymentId = '';
            this.openModal(this.paymentModal, 'Add Payment Method');
        }

        this.populatePaymentMethods();
    }

    populatePaymentMethods() {
        const paymentDetails = this.paymentForm.querySelector('#paymentDetails');
        paymentDetails.innerHTML = '';

        const selectedMethod = this.paymentForm.querySelector('#paymentMethod').value;
        switch (selectedMethod) {
            case 'creditCard':
                paymentDetails.innerHTML = `
                    <div class="form-group">
                        <label for="cardNumber" class="form-label">Card Number</label>
                        <input type="text" id="cardNumber" name="cardNumber" class="form-input" required>
                    </div>
                    <div class="form-group">
                        <label for="expiryDate" class="form-label">Expiry Date</label>
                        <input type="text" id="expiryDate" name="expiryDate" class="form-input" placeholder="MM/YY" required>
                    </div>
                    <div class="form-group">
                        <label for="cvv" class="form-label">CVV</label>
                        <input type="text" id="cvv" name="cvv" class="form-input" required>
                    </div>
                `;
                break;
            case 'bankTransfer':
                paymentDetails.innerHTML = `
                    <div class="form-group">
                        <label for="accountNumber" class="form-label">Account Number</label>
                        <input type="text" id="accountNumber" name="accountNumber" class="form-input" required>
                    </div>
                    <div class="form-group">
                        <label for="bankName" class="form-label">Bank Name</label>
                        <input type="text" id="bankName" name="bankName" class="form-input" required>
                    </div>
                    <div class="form-group">
                        <label for="swiftCode" class="form-label">SWIFT Code</label>
                        <input type="text" id="swiftCode" name="swiftCode" class="form-input" required>
                    </div>
                `;
                break;
            case 'paypal':
                paymentDetails.innerHTML = `
                    <div class="form-group">
                        <label for="paypalEmail" class="form-label">PayPal Email</label>
                        <input type="email" id="paypalEmail" name="paypalEmail" class="form-input" required>
                    </div>
                `;
                break;
            case 'razorpay':
                paymentDetails.innerHTML = `
                    <div class="form-group">
                        <label for="razorpayId" class="form-label">Razorpay ID</label>
                        <input type="text" id="razorpayId" name="razorpayId" class="form-input" required>
                    </div>
                `;
                break;
            default:
                paymentDetails.innerHTML = '<p>Select a payment method to proceed.</p>';
        }
    }

    populatePaymentDetails(paymentMethod) {
        switch (paymentMethod.type) {
            case 'creditCard':
                this.paymentForm.querySelector('#cardNumber').value = paymentMethod.details.cardNumber;
                this.paymentForm.querySelector('#expiryDate').value = paymentMethod.details.expiryDate;
                this.paymentForm.querySelector('#cvv').value = paymentMethod.details.cvv;
                break;
            case 'bankTransfer':
                this.paymentForm.querySelector('#accountNumber').value = paymentMethod.details.accountNumber;
                this.paymentForm.querySelector('#bankName').value = paymentMethod.details.bankName;
                this.paymentForm.querySelector('#swiftCode').value = paymentMethod.details.swiftCode;
                break;
            case 'paypal':
                this.paymentForm.querySelector('#paypalEmail').value = paymentMethod.details.paypalEmail;
                break;
            case 'razorpay':
                this.paymentForm.querySelector('#razorpayId').value = paymentMethod.details.razorpayId;
                break;
        }
    }

    async savePayment(e) {
        e.preventDefault();
        if (!this.validateForm(this.paymentForm)) return;

        const paymentId = this.paymentForm.dataset.paymentId;
        const method = paymentId ? 'PUT' : 'POST';
        const endpoint = paymentId ? `payments/${paymentId}` : 'payments';

        const paymentData = {
            type: this.paymentForm.querySelector('#paymentMethod').value,
            details: {}
        };

        switch (paymentData.type) {
            case 'creditCard':
                paymentData.details = {
                    cardNumber: this.paymentForm.querySelector('#cardNumber').value,
                    expiryDate: this.paymentForm.querySelector('#expiryDate').value,
                    cvv: this.paymentForm.querySelector('#cvv').value
                };
                break;
            case 'bankTransfer':
                paymentData.details = {
                    accountNumber: this.paymentForm.querySelector('#accountNumber').value,
                    bankName: this.paymentForm.querySelector('#bankName').value,
                    swiftCode: this.paymentForm.querySelector('#swiftCode').value
                };
                break;
            case 'paypal':
                paymentData.details = {
                    paypalEmail: this.paymentForm.querySelector('#paypalEmail').value
                };
                break;
            case 'razorpay':
                paymentData.details = {
                    razorpayId: this.paymentForm.querySelector('#razorpayId').value
                };
                break;
        }

        try {
            this.showLoadingState(this.paymentForm);
            const response = await this.fetchData(endpoint, method, paymentData);
            if (response.success) {
                this.showSuccessState(this.paymentForm, `${paymentId ? 'Payment method updated' : 'Payment method added'} successfully`);
                this.closeModal(this.paymentModal);
                await this.createAuditLog(paymentId ? 'PAYMENT_METHOD_UPDATED' : 'PAYMENT_METHOD_CREATED', paymentData);
            } else {
                this.showErrorState(this.paymentForm, response.message || 'Failed to save payment method');
            }
        } catch (error) {
            this.showErrorState(this.paymentForm, error.message || 'An error occurred while saving the payment method');
        }
    }

    handlePaymentModalClick(e) {
        const target = e.target;
        if (target.classList.contains('modal-close')) {
            this.closeModal(this.paymentModal);
        } else if (target.id === 'paymentMethod') {
            this.populatePaymentMethods();
        }
    }

     // Invoice Management Methods

    openInvoiceModal(invoices = [], subscriptionId = null) {
        this.invoiceForm.reset();
        const invoiceModalTitle = this.invoiceModal.querySelector('#invoiceModalTitle');
        invoiceModalTitle.textContent = subscriptionId ? 'Invoices for Subscription' : 'Generate Invoice';

        const invoiceList = this.invoiceModal.querySelector('.modal-content');
        invoiceList.innerHTML = `
            <table class="invoice-table">
                <thead>
                    <tr>
                        <th>Invoice Number</th>
                        <th>Amount</th>
                        <th>Date</th>
                        <th>Status</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    ${invoices.map(invoice => `
                        <tr data-invoice-id="${invoice._id}">
                            <td>${invoice.invoiceNumber}</td>
                            <td>$${invoice.amount.toFixed(2)}</td>
                            <td>${new Date(invoice.date).toLocaleDateString()}</td>
                            <td>${invoice.status}</td>
                            <td>
                                <button class="modal-button secondary view-invoice">View</button>
                                <button class="modal-button secondary download-invoice">Download</button>
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;

        if (subscriptionId) {
            this.invoiceForm.querySelector('#invoiceCompany').disabled = true;
            this.invoiceForm.querySelector('#invoicePlan').disabled = true;
            this.invoiceForm.querySelector('#invoiceAmount').disabled = true;
            this.invoiceForm.querySelector('#invoiceBillingCycle').disabled = true;
            this.populateInvoiceDetails(subscriptionId);
        } else {
            this.populateInvoiceCompanies();
        }

        this.openModal(this.invoiceModal);
    }

    async populateInvoiceCompanies() {
        try {
            const response = await this.fetchData('companies');
            if (response.success) {
                const select = this.invoiceForm.querySelector('#invoiceCompany');
                select.innerHTML = '';
                response.companies.forEach(company => {
                    const option = document.createElement('option');
                    option.value = company._id;
                    option.textContent = company.name;
                    select.appendChild(option);
                });
            } else {
                console.error('Error fetching companies:', response.message);
            }
        } catch (error) {
            console.error('Error fetching companies:', error);
        }
    }

    async populateInvoiceDetails(subscriptionId) {
        try {
            const response = await this.fetchData(`subscriptions/${subscriptionId}`);
            if (response.success) {
                const subscription = response.data;
                this.invoiceForm.querySelector('#invoiceCompany').value = subscription.companyId;
                this.invoiceForm.querySelector('#invoicePlan').value = subscription.planName;
                this.invoiceForm.querySelector('#invoiceAmount').value = subscription.amount;
                this.invoiceForm.querySelector('#invoiceBillingCycle').value = subscription.billingCycle;
            } else {
                console.error('Error fetching subscription:', response.message);
            }
        } catch (error) {
            console.error('Error fetching subscription:', error);
        }
    }

    async generateInvoice(e) {
        e.preventDefault();
        if (!this.validateForm(this.invoiceForm)) return;

        const invoiceData = {
            companyId: this.invoiceForm.querySelector('#invoiceCompany').value,
            plan: this.invoiceForm.querySelector('#invoicePlan').value,
            amount: parseFloat(this.invoiceForm.querySelector('#invoiceAmount').value),
            billingCycle: this.invoiceForm.querySelector('#invoiceBillingCycle').value,
            date: new Date(this.invoiceForm.querySelector('#invoiceDate').value).toISOString(),
            dueDate: new Date(this.invoiceForm.querySelector('#invoiceDueDate').value).toISOString()
        };

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
            this.showErrorState(this.invoiceForm, error.message || 'An error occurred while generating the invoice');
        }
    }

    handleInvoiceModalClick(e) {
        const target = e.target;
        if (target.classList.contains('modal-close')) {
            this.closeModal(this.invoiceModal);
        } else if (target.classList.contains('view-invoice')) {
            const invoiceRow = target.closest('tr');
            const invoiceId = invoiceRow.dataset.invoiceId;
            this.viewInvoice(invoiceId);
        } else if (target.classList.contains('download-invoice')) {
            const invoiceRow = target.closest('tr');
            const invoiceId = invoiceRow.dataset.invoiceId;
            this.downloadInvoice(invoiceId);
        }
    }

    async viewInvoice(invoiceId) {
        try {
            const response = await this.fetchData(`invoices/${invoiceId}`);
            if (response.success) {
                const invoice = response.data;
                alert(`Invoice Details:\n\nNumber: ${invoice.invoiceNumber}\nAmount: $${invoice.amount.toFixed(2)}\nDate: ${new Date(invoice.date).toLocaleDateString()}\nStatus: ${invoice.status}`);
            } else {
                console.error('Error fetching invoice:', response.message);
            }
        } catch (error) {
            console.error('Error fetching invoice:', error);
        }
    }

    async downloadInvoice(invoiceId) {
        try {
            const response = await this.fetchData(`invoices/${invoiceId}/download`);
            if (response.success) {
                const invoice = response.data;
                const blob = new Blob([JSON.stringify(invoice, null, 2)], { type: 'application/json' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `invoice_${invoice.invoiceNumber}.json`;
                a.click();
                URL.revokeObjectURL(url);
            } else {
                console.error('Error downloading invoice:', response.message);
            }
        } catch (error) {
            console.error('Error downloading invoice:', error);
        }
    }

    // Reports & Analytics Methods

    openReportsModal() {
        this.reportsModal.querySelector('#reportContent').innerHTML = '';
        this.openModal(this.reportsModal);
    }

    async generateReport(e) {
        e.preventDefault();
        const reportType = this.reportsModal.querySelector('#reportType').value;
        const startDate = this.reportsModal.querySelector('#reportStartDate').value;
        const endDate = this.reportsModal.querySelector('#reportEndDate').value;

        if (!startDate || !endDate) {
            this.createFormError(this.reportsModal.querySelector('#reportStartDate'), 'Start date is required');
            this.createFormError(this.reportsModal.querySelector('#reportEndDate'), 'End date is required');
            return;
        }

        try {
            this.showLoadingState(this.reportsModal.querySelector('#reportContent'));
            const response = await this.fetchData(`reports/${reportType}?startDate=${startDate}&endDate=${endDate}`);
            if (response.success) {
                this.displayReport(reportType, response.data);
                await this.createAuditLog('REPORT_GENERATED', { reportType, startDate, endDate });
            } else {
                this.showErrorState(this.reportsModal.querySelector('#reportContent'), response.message || 'Failed to generate report');
            }
        } catch (error) {
            this.showErrorState(this.reportsModal.querySelector('#reportContent'), error.message || 'An error occurred while generating the report');
        }
    }

    displayReport(reportType, data) {
        const reportContent = this.reportsModal.querySelector('#reportContent');
        reportContent.innerHTML = '';

        switch (reportType) {
            case 'activeSubscribers':
                this.displayActiveSubscribersReport(data, reportContent);
                break;
            case 'revenueBreakdown':
                this.displayRevenueBreakdownReport(data, reportContent);
                break;
            case 'featureUsage':
                this.displayFeatureUsageReport(data, reportContent);
                break;
            default:
                reportContent.innerHTML = '<p>Invalid report type</p>';
        }
    }

    displayActiveSubscribersReport(data, container) {
        const table = document.createElement('table');
        table.className = 'report-table';
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
        container.appendChild(table);
    }

    displayRevenueBreakdownReport(data, container) {
        const table = document.createElement('table');
        table.className = 'report-table';
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
        container.appendChild(table);
    }

    displayFeatureUsageReport(data, container) {
        const table = document.createElement('table');
        table.className = 'report-table';
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
        container.appendChild(table);
    }

    async exportReport(e) {
        e.preventDefault();
        const reportType = this.reportsModal.querySelector('#reportType').value;
        const startDate = this.reportsModal.querySelector('#reportStartDate').value;
        const endDate = this.reportsModal.querySelector('#reportEndDate').value;

        if (!startDate || !endDate) {
            this.createFormError(this.reportsModal.querySelector('#reportStartDate'), 'Start date is required');
            this.createFormError(this.reportsModal.querySelector('#reportEndDate'), 'End date is required');
            return;
        }

        try {
            const response = await this.fetchData(`reports/${reportType}/export?startDate=${startDate}&endDate=${endDate}`);
            if (response.success) {
                const blob = new Blob([response.data], { type: 'text/csv' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `${reportType}_report_${startDate}_to_${endDate}.csv`;
                a.click();
                URL.revokeObjectURL(url);
                await this.createAuditLog('REPORT_EXPORTED', { reportType, startDate, endDate });
            } else {
                console.error('Error exporting report:', response.message);
            }
        } catch (error) {
            console.error('Error exporting report:', error);
        }
    }

    handleReportsModalClick(e) {
        const target = e.target;
        if (target.classList.contains('modal-close')) {
            this.closeModal(this.reportsModal);
        }
    }

     // Discount Application Methods

    openApplyDiscountModal() {
        this.applyDiscountForm.reset();
        this.populateApplyDiscountPlans();
        this.openModal(this.applyDiscountModal);
    }

    async populateApplyDiscountPlans() {
        try {
            const response = await this.fetchData('plans');
            if (response.success) {
                const select = this.applyDiscountForm.querySelector('#applyDiscountPlan');
                select.innerHTML = '';
                response.data.forEach(plan => {
                    const option = document.createElement('option');
                    option.value = plan._id;
                    option.textContent = plan.name;
                    select.appendChild(option);
                });
            } else {
                console.error('Error fetching plans:', response.message);
            }
        } catch (error) {
            console.error('Error fetching plans:', error);
        }
    }

    async applyDiscount(e) {
        e.preventDefault();
        if (!this.validateForm(this.applyDiscountForm)) return;

        const discountCode = this.applyDiscountForm.querySelector('#applyDiscountCode').value.trim();
        const planId = this.applyDiscountForm.querySelector('#applyDiscountPlan').value;

        try {
            this.showLoadingState(this.applyDiscountForm);
            const response = await this.fetchData(`discounts/apply?code=${discountCode}&planId=${planId}`, 'POST');
            if (response.success) {
                this.showSuccessState(this.applyDiscountForm, 'Discount applied successfully');
                this.closeModal(this.applyDiscountModal);
                await this.createAuditLog('DISCOUNT_APPLIED', { discountCode, planId });
            } else {
                this.showErrorState(this.applyDiscountForm, response.message || 'Failed to apply discount');
            }
        } catch (error) {
            this.showErrorState(this.applyDiscountForm, error.message || 'An error occurred while applying the discount');
        }
    }

    handleApplyDiscountModalClick(e) {
        const target = e.target;
        if (target.classList.contains('modal-close')) {
            this.closeModal(this.applyDiscountModal);
        }
    }

    // Referral & Partner Discounts Methods

    openReferralDiscountModal(referralDiscount = null) {
        this.referralDiscountForm.reset();
        if (referralDiscount) {
            this.referralDiscountForm.querySelector('#referralCode').value = referralDiscount.code;
            this.referralDiscountForm.querySelector('#referralDiscountType').value = referralDiscount.type;
            this.referralDiscountForm.querySelector('#referralDiscountValue').value = referralDiscount.value;
            this.referralDiscountForm.querySelector('#referralExpiry').value = referralDiscount.expiryDate.split('T')[0];
            this.referralDiscountForm.querySelector('#referralUsageLimit').value = referralDiscount.usageLimit || '';

            this.referralDiscountForm.dataset.referralDiscountId = referralDiscount._id;
            this.openModal(this.referralDiscountModal, 'Edit Referral Discount');
        } else {
            this.referralDiscountForm.dataset.referralDiscountId = '';
            this.openModal(this.referralDiscountModal, 'Create Referral Discount');
        }
    }

    async saveReferralDiscount(e) {
        e.preventDefault();
        if (!this.validateForm(this.referralDiscountForm)) return;

        const referralDiscountId = this.referralDiscountForm.dataset.referralDiscountId;
        const method = referralDiscountId ? 'PUT' : 'POST';
        const endpoint = referralDiscountId ? `referral-discounts/${referralDiscountId}` : 'referral-discounts';

        const referralDiscountData = {
            code: this.referralDiscountForm.querySelector('#referralCode').value.trim(),
            type: this.referralDiscountForm.querySelector('#referralDiscountType').value,
            value: parseFloat(this.referralDiscountForm.querySelector('#referralDiscountValue').value),
            expiryDate: new Date(this.referralDiscountForm.querySelector('#referralExpiry').value).toISOString(),
            usageLimit: parseInt(this.referralDiscountForm.querySelector('#referralUsageLimit').value) || 0
        };

        try {
            this.showLoadingState(this.referralDiscountForm);
            const response = await this.fetchData(endpoint, method, referralDiscountData);
            if (response.success) {
                this.showSuccessState(this.referralDiscountForm, `${referralDiscountId ? 'Referral discount updated' : 'Referral discount created'} successfully`);
                this.closeModal(this.referralDiscountModal);
                await this.createAuditLog(referralDiscountId ? 'REFERRAL_DISCOUNT_UPDATED' : 'REFERRAL_DISCOUNT_CREATED', referralDiscountData);
            } else {
                this.showErrorState(this.referralDiscountForm, response.message || 'Failed to save referral discount');
            }
        } catch (error) {
            this.showErrorState(this.referralDiscountForm, error.message || 'An error occurred while saving the referral discount');
        }
    }

    handleReferralDiscountModalClick(e) {
        const target = e.target;
        if (target.classList.contains('modal-close')) {
            this.closeModal(this.referralDiscountModal);
        }
    }

     // Subscription Logs Methods

    openSubscriptionLogsModal() {
        this.subscriptionLogsModal.querySelector('#subscriptionLogsContent').innerHTML = '';
        this.loadSubscriptionLogs();
        this.openModal(this.subscriptionLogsModal);
    }

    async loadSubscriptionLogs() {
        try {
            this.showLoadingState(this.subscriptionLogsModal.querySelector('#subscriptionLogsContent'));
            const response = await this.fetchData('subscription-logs');
            if (response.success) {
                this.displaySubscriptionLogs(response.data);
            } else {
                this.showErrorState(this.subscriptionLogsModal.querySelector('#subscriptionLogsContent'), response.message || 'Failed to load subscription logs');
            }
        } catch (error) {
            this.showErrorState(this.subscriptionLogsModal.querySelector('#subscriptionLogsContent'), error.message || 'An error occurred while loading subscription logs');
        }
    }

    displaySubscriptionLogs(logs) {
        const logsContent = this.subscriptionLogsModal.querySelector('#subscriptionLogsContent');
        logsContent.innerHTML = '';

        const table = document.createElement('table');
        table.className = 'logs-table';
        table.innerHTML = `
            <thead>
                <tr>
                    <th>Date</th>
                    <th>Action</th>
                    <th>Details</th>
                </tr>
            </thead>
            <tbody>
                ${logs.map(log => `
                    <tr>
                        <td>${new Date(log.timestamp).toLocaleString()}</td>
                        <td>${log.action}</td>
                        <td>${JSON.stringify(log.details)}</td>
                    </tr>
                `).join('')}
            </tbody>
        `;
        logsContent.appendChild(table);
    }

    handleSubscriptionLogsModalClick(e) {
        const target = e.target;
        if (target.classList.contains('modal-close')) {
            this.closeModal(this.subscriptionLogsModal);
        }
    }

    // Data Retention Policies Methods

    openDataRetentionModal(policy = null) {
        this.dataRetentionForm.reset();
        if (policy) {
            this.dataRetentionForm.querySelector('#retentionPeriod').value = policy.retentionPeriod;
            this.dataRetentionForm.querySelector('#retentionPolicy').value = policy.policyDescription;
            this.dataRetentionForm.dataset.policyId = policy._id;
            this.openModal(this.dataRetentionModal, 'Edit Data Retention Policy');
        } else {
            this.dataRetentionForm.dataset.policyId = '';
            this.openModal(this.dataRetentionModal, 'Create Data Retention Policy');
        }
    }

    async saveDataRetention(e) {
        e.preventDefault();
        if (!this.validateForm(this.dataRetentionForm)) return;

        const policyId = this.dataRetentionForm.dataset.policyId;
        const method = policyId ? 'PUT' : 'POST';
        const endpoint = policyId ? `data-retention/${policyId}` : 'data-retention';

        const policyData = {
            retentionPeriod: parseInt(this.dataRetentionForm.querySelector('#retentionPeriod').value),
            policyDescription: this.dataRetentionForm.querySelector('#retentionPolicy').value.trim()
        };

        try {
            this.showLoadingState(this.dataRetentionForm);
            const response = await this.fetchData(endpoint, method, policyData);
            if (response.success) {
                this.showSuccessState(this.dataRetentionForm, `${policyId ? 'Data retention policy updated' : 'Data retention policy created'} successfully`);
                this.closeModal(this.dataRetentionModal);
                await this.createAuditLog(policyId ? 'DATA_RETENTION_POLICY_UPDATED' : 'DATA_RETENTION_POLICY_CREATED', policyData);
            } else {
                this.showErrorState(this.dataRetentionForm, response.message || 'Failed to save data retention policy');
            }
        } catch (error) {
            this.showErrorState(this.dataRetentionForm, error.message || 'An error occurred while saving the data retention policy');
        }
    }

    handleDataRetentionModalClick(e) {
        const target = e.target;
        if (target.classList.contains('modal-close')) {
            this.closeModal(this.dataRetentionModal);
        }
    }

 }

// Initialize PricingManager
window.PricingManager = PricingManager;

// Create instance of PricingManager
const pricingManager = new PricingManager();

})();

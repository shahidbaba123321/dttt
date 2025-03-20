(function() {
    'use strict';

    if (window.PricingManager) {
        delete window.PricingManager;
    }

    class PricingManager {
        constructor(baseUrl) {
            this.baseUrl = baseUrl || 'https://18.215.160.136.nip.io/api';
            this.token = localStorage.getItem('token');

            if (!this.token) {
                this.redirectToLogin();
                return;
            }

            this.tabs = document.querySelectorAll('.pricing-tab');
            this.tabContents = document.querySelectorAll('.tab-content');
            this.plansTableBody = document.getElementById('plansTableBody');
            this.createPlanBtn = document.getElementById('createPlanBtn');
            this.planModal = document.getElementById('planModal');
            this.planForm = document.getElementById('planForm');
            this.closePlanModal = document.getElementById('closePlanModal');
            this.planModalTitle = document.getElementById('planModalTitle');

            this.currencies = [
                { code: 'INR', symbol: '₹', name: 'Indian Rupee' },
                { code: 'USD', symbol: '$', name: 'US Dollar' },
                { code: 'GBP', symbol: '£', name: 'British Pound' },
                { code: 'AED', symbol: 'د.إ', name: 'UAE Dirham' },
                { code: 'QAR', symbol: 'ر.ق', name: 'Qatari Riyal' }
            ];

            this.initialize();
        }

        initialize() {
            this.setupTabNavigation();
            this.setupEventListeners();
            this.loadInitialData();
        }

        setupTabNavigation() {
            this.tabs.forEach(tab => {
                tab.addEventListener('click', () => {
                    this.tabs.forEach(t => t.classList.remove('active'));
                    tab.classList.add('active');
                    const tabId = tab.getAttribute('data-tab');
                    this.tabContents.forEach(content => {
                        content.style.display = content.getAttribute('data-tab-content') === tabId ? 'block' : 'none';
                    });
                    this.logActivity('tab_switch', { tab: tabId });
                });
            });

            const activeTab = document.querySelector('.pricing-tab.active');
            if (activeTab) {
                const tabId = activeTab.getAttribute('data-tab');
                this.tabContents.forEach(content => {
                    content.style.display = content.getAttribute('data-tab-content') === tabId ? 'block' : 'none';
                });
            }
        }

        async fetchWithAuth(url, options = {}) {
            const headers = {
                'Authorization': `Bearer ${this.token}`,
                'Content-Type': 'application/json',
                ...options.headers
            };

            const response = await fetch(`${this.baseUrl}${url}`, { ...options, headers });
            if (!response.ok) {
                if (response.status === 401) this.redirectToLogin();
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            if (!data.success) throw new Error(data.message || 'API request failed');
            return data.data;
        }

        async logActivity(action, details) {
            try {
                const logData = {
                    action,
                    details,
                    timestamp: new Date().toISOString(),
                    userId: window.dashboardApp?.userSession?.userData?.id || 'unknown'
                };
                await this.fetchWithAuth('/audit-log', {
                    method: 'POST',
                    body: JSON.stringify(logData)
                });
            } catch (error) {
                console.error('Failed to log activity:', error);
            }
        }

        redirectToLogin() {
            window.location.href = '/login.html';
        }

        async loadPlans() {
            try {
                const plans = await this.fetchWithAuth('/plans');
                this.renderPlans(plans);
                await this.logActivity('load_plans', { count: plans.length });
            } catch (error) {
                console.error('Error loading plans:', error);
                window.dashboardApp?.userInterface?.showErrorNotification('Failed to load plans.');
                await this.logActivity('load_plans_error', { error: error.message });
            }
        }

        renderPlans(plans) {
            this.plansTableBody.innerHTML = '';
            plans.forEach(plan => {
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td>${plan.name}</td>
                    <td><select class="currency-select" data-plan-id="${plan._id}">
                        ${this.currencies.map(c => `<option value="${c.code}" data-price="${plan.prices[c.code].monthly}">${c.code}: ${c.symbol}${plan.prices[c.code].monthly.toFixed(2)}</option>`).join('')}
                    </select></td>
                    <td><select class="currency-select" data-plan-id="${plan._id}">
                        ${this.currencies.map(c => `<option value="${c.code}" data-price="${plan.prices[c.code].annual}">${c.code}: ${c.symbol}${plan.prices[c.code].annual.toFixed(2)}</option>`).join('')}
                    </select></td>
                    <td><span class="plan-status ${plan.isActive ? 'active' : 'inactive'}">${plan.isActive ? 'Active' : 'Inactive'}</span></td>
                    <td class="plan-actions">
                        <button class="action-btn edit-plan" data-plan-id="${plan._id}"><i class="fas fa-edit"></i></button>
                        <button class="action-btn delete-plan" data-plan-id="${plan._id}"><i class="fas fa-trash"></i></button>
                    </td>
                `;
                this.plansTableBody.appendChild(row);
            });
            this.setupPlanActions();
        }

        setupPlanActions() {
            document.querySelectorAll('.edit-plan').forEach(btn => {
                btn.addEventListener('click', () => this.editPlan(btn.dataset.planId));
            });
            document.querySelectorAll('.delete-plan').forEach(btn => {
                btn.addEventListener('click', () => this.deletePlan(btn.dataset.planId));
            });
        }

        async editPlan(planId) {
            try {
                const plan = await this.fetchWithAuth(`/plans/${planId}`);
                this.planModalTitle.textContent = 'Edit Plan';
                this.planForm.name.value = plan.name;
                this.planForm.monthlyPrice.value = plan.monthlyPrice;
                this.planForm.annualPrice.value = plan.annualPrice;
                this.planForm.description.value = plan.description || '';
                this.planForm.isActive.checked = plan.isActive;
                this.planForm.trialPeriod.value = plan.trialPeriod || 0;
                this.planForm.baseCurrency.value = plan.baseCurrency;
                this.planForm.dataset.planId = planId;
                this.planModal.style.display = 'flex';
                await this.logActivity('open_edit_plan', { planId });
            } catch (error) {
                console.error('Error loading plan for edit:', error);
                window.dashboardApp?.userInterface?.showErrorNotification('Failed to load plan details.');
                await this.logActivity('edit_plan_error', { planId, error: error.message });
            }
        }

        async deletePlan(planId) {
            if (!confirm('Are you sure you want to delete this plan?')) return;
            try {
                await this.fetchWithAuth(`/plans/${planId}`, { method: 'DELETE' });
                window.dashboardApp?.userInterface?.showSuccessNotification('Plan deleted successfully.');
                await this.loadPlans();
                await this.logActivity('delete_plan', { planId });
            } catch (error) {
                console.error('Error deleting plan:', error);
                window.dashboardApp?.userInterface?.showErrorNotification(error.message || 'Failed to delete plan.');
                await this.logActivity('delete_plan_error', { planId, error: error.message });
            }
        }

        setupPlanForm() {
            if (!this.planForm.querySelector('#baseCurrency')) {
                const baseCurrencyGroup = document.createElement('div');
                baseCurrencyGroup.className = 'form-group';
                baseCurrencyGroup.innerHTML = `
                    <label for="baseCurrency">Base Currency</label>
                    <select id="baseCurrency" name="baseCurrency" required>
                        ${this.currencies.map(c => `<option value="${c.code}">${c.code} - ${c.name}</option>`).join('')}
                    </select>
                `;
                this.planForm.insertBefore(baseCurrencyGroup, this.planForm.querySelector('button'));
            }
            if (!this.planForm.querySelector('#trialPeriod')) {
                const trialPeriodGroup = document.createElement('div');
                trialPeriodGroup.className = 'form-group';
                trialPeriodGroup.innerHTML = `
                    <label for="trialPeriod">Trial Period (days)</label>
                    <input type="number" id="trialPeriod" name="trialPeriod" min="0" value="0">
                `;
                this.planForm.insertBefore(trialPeriodGroup, this.planForm.querySelector('button'));
            }
            if (!this.planForm.querySelector('#isActive')) {
                const isActiveGroup = document.createElement('div');
                isActiveGroup.className = 'form-group';
                isActiveGroup.innerHTML = `
                    <label for="isActive">Active</label>
                    <input type="checkbox" id="isActive" name="isActive" checked>
                `;
                this.planForm.insertBefore(isActiveGroup, this.planForm.querySelector('button'));
            }

            this.planForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                const planId = this.planForm.dataset.planId;
                const planData = {
                    name: this.planForm.name.value,
                    description: this.planForm.description.value,
                    monthlyPrice: parseFloat(this.planForm.monthlyPrice.value),
                    annualPrice: parseFloat(this.planForm.annualPrice.value),
                    trialPeriod: parseInt(this.planForm.trialPeriod.value),
                    isActive: this.planForm.isActive.checked,
                    baseCurrency: this.planForm.baseCurrency.value
                };
                try {
                    if (planId) {
                        await this.fetchWithAuth(`/plans/${planId}`, {
                            method: 'PUT',
                            body: JSON.stringify(planData)
                        });
                        window.dashboardApp?.userInterface?.showSuccessNotification('Plan updated successfully.');
                        await this.logActivity('update_plan', { planId, ...planData });
                    } else {
                        await this.fetchWithAuth('/plans', {
                            method: 'POST',
                            body: JSON.stringify(planData)
                        });
                        window.dashboardApp?.userInterface?.showSuccessNotification('Plan created successfully.');
                        await this.logActivity('create_plan', { ...planData });
                    }
                    this.planModal.style.display = 'none';
                    await this.loadPlans();
                } catch (error) {
                    console.error('Error saving plan:', error);
                    window.dashboardApp?.userInterface?.showErrorNotification(error.message || 'Failed to save plan.');
                    await this.logActivity(planId ? 'update_plan_error' : 'create_plan_error', { planId: planId || 'new', error: error.message });
                }
            });
        }

        async loadFeatures() {
            try {
                const features = await this.fetchWithAuth('/features');
                this.renderFeatures(features);
                await this.logActivity('load_features', { count: features.length });
            } catch (error) {
                console.error('Error loading features:', error);
                window.dashboardApp?.userInterface?.showErrorNotification('Failed to load features.');
                await this.logActivity('load_features_error', { error: error.message });
            }
        }

        renderFeatures(features) {
            const featuresTableBody = document.getElementById('featuresTableBody');
            if (!featuresTableBody) return;
            featuresTableBody.innerHTML = '';
            features.forEach(feature => {
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td>${feature.name}</td>
                    <td>${feature.description}</td>
                    <td>${feature.category}</td>
                    <td class="feature-actions">
                        <button class="action-btn edit-feature" data-feature-id="${feature._id}"><i class="fas fa-edit"></i></button>
                        <button class="action-btn delete-feature" data-feature-id="${feature._id}"><i class="fas fa-trash"></i></button>
                    </td>
                `;
                featuresTableBody.appendChild(row);
            });
            this.setupFeatureActions();
        }

        setupFeatureActions() {
            document.querySelectorAll('.edit-feature').forEach(btn => {
                btn.addEventListener('click', () => this.editFeature(btn.dataset.featureId));
            });
            document.querySelectorAll('.delete-feature').forEach(btn => {
                btn.addEventListener('click', () => this.deleteFeature(btn.dataset.featureId));
            });
        }

        async editFeature(featureId) {
            try {
                const feature = await this.fetchWithAuth(`/features/${featureId}`);
                const featureModal = document.getElementById('featureModal');
                const featureForm = document.getElementById('featureForm');
                const featureModalTitle = document.getElementById('featureModalTitle');
                featureModalTitle.textContent = 'Edit Feature';
                featureForm.name.value = feature.name;
                featureForm.description.value = feature.description;
                featureForm.category.value = feature.category;
                featureForm.dataset.featureId = featureId;
                featureModal.style.display = 'flex';
                await this.logActivity('open_edit_feature', { featureId });
            } catch (error) {
                console.error('Error loading feature for edit:', error);
                window.dashboardApp?.userInterface?.showErrorNotification('Failed to load feature details.');
                await this.logActivity('edit_feature_error', { featureId, error: error.message });
            }
        }

        async deleteFeature(featureId) {
            if (!confirm('Are you sure you want to delete this feature?')) return;
            try {
                await this.fetchWithAuth(`/features/${featureId}`, { method: 'DELETE' });
                window.dashboardApp?.userInterface?.showSuccessNotification('Feature deleted successfully.');
                await this.loadFeatures();
                await this.logActivity('delete_feature', { featureId });
            } catch (error) {
                console.error('Error deleting feature:', error);
                window.dashboardApp?.userInterface?.showErrorNotification(error.message || 'Failed to delete feature.');
                await this.logActivity('delete_feature_error', { featureId, error: error.message });
            }
        }

        setupFeatureForm() {
            const featureModal = document.getElementById('featureModal');
            const featureForm = document.getElementById('featureForm');
            const closeFeatureModal = document.getElementById('closeFeatureModal');
            const createFeatureBtn = document.getElementById('createFeatureBtn');
            if (!featureForm.querySelector('#name')) {
                featureForm.innerHTML = `
                    <div class="form-group">
                        <label for="name">Feature Name</label>
                        <input type="text" id="name" name="name" required>
                    </div>
                    <div class="form-group">
                        <label for="description">Description</label>
                        <textarea id="description" name="description" required></textarea>
                    </div>
                    <div class="form-group">
                        <label for="category">Category</label>
                        <input type="text" id="category" name="category" required>
                    </div>
                    <button type="submit">Save Feature</button>
                `;
            }
            closeFeatureModal.addEventListener('click', this.closeFeatureModalHandler);
            createFeatureBtn.addEventListener('click', this.createFeatureHandler);
            featureForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                const featureId = featureForm.dataset.featureId;
                const featureData = {
                    name: featureForm.name.value,
                    description: featureForm.description.value,
                    category: featureForm.category.value
                };
                try {
                    if (featureId) {
                        await this.fetchWithAuth(`/features/${featureId}`, {
                            method: 'PUT',
                            body: JSON.stringify(featureData)
                        });
                        window.dashboardApp?.userInterface?.showSuccessNotification('Feature updated successfully.');
                        await this.logActivity('update_feature', { featureId, ...featureData });
                    } else {
                        await this.fetchWithAuth('/features', {
                            method: 'POST',
                            body: JSON.stringify(featureData)
                        });
                        window.dashboardApp?.userInterface?.showSuccessNotification('Feature created successfully.');
                        await this.logActivity('create_feature', { ...featureData });
                    }
                    featureModal.style.display = 'none';
                    await this.loadFeatures();
                } catch (error) {
                    console.error('Error saving feature:', error);
                    window.dashboardApp?.userInterface?.showErrorNotification(error.message || 'Failed to save feature.');
                    await this.logActivity(featureId ? 'update_feature_error' : 'create_feature_error', { featureId: featureId || 'new', error: error.message });
                }
            });
        }

        async loadSubscriptions(planId = null) {
            try {
                const url = planId ? `/subscriptions?planId=${planId}` : '/subscriptions';
                const subscriptions = await this.fetchWithAuth(url);
                this.renderSubscriptions(subscriptions);
                await this.logActivity('load_subscriptions', { count: subscriptions.length, planId });
            } catch (error) {
                console.error('Error loading subscriptions:', error);
                window.dashboardApp?.userInterface?.showErrorNotification('Failed to load subscriptions.');
                await this.logActivity('load_subscriptions_error', { error: error.message, planId });
            }
        }

        renderSubscriptions(subscriptions) {
            const subscriptionsTableBody = document.getElementById('subscriptionsTableBody');
            if (!subscriptionsTableBody) return;
            subscriptionsTableBody.innerHTML = '';
            subscriptions.forEach(sub => {
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td>${sub.companyId}</td>
                    <td>${sub.planName}</td>
                    <td>${sub.billingCycle}</td>
                    <td>${new Date(sub.startDate).toLocaleDateString()}</td>
                    <td>${new Date(sub.endDate).toLocaleDateString()}</td>
                    <td>${this.currencies.find(c => c.code === sub.plan?.baseCurrency)?.symbol || '$'}${sub.price.toFixed(2)}</td>
                    <td><span class="subscription-status ${sub.status}">${sub.status}</span></td>
                    <td class="subscription-actions">
                        <button class="action-btn edit-subscription" data-subscription-id="${sub._id}"><i class="fas fa-edit"></i></button>
                    </td>
                `;
                subscriptionsTableBody.appendChild(row);
            });
            this.setupSubscriptionActions();
        }

        setupSubscriptionActions() {
            document.querySelectorAll('.edit-subscription').forEach(btn => {
                btn.addEventListener('click', () => this.editSubscription(btn.dataset.subscriptionId));
            });
        }

        async editSubscription(subscriptionId) {
            try {
                const subscription = await this.fetchWithAuth(`/subscriptions/${subscriptionId}`);
                const subscriptionModal = document.getElementById('subscriptionModal');
                const subscriptionForm = document.getElementById('subscriptionForm');
                const subscriptionModalTitle = document.getElementById('subscriptionModalTitle');
                subscriptionModalTitle.textContent = 'Edit Subscription';
                subscriptionForm.companyId.value = subscription.companyId;
                subscriptionForm.planId.value = subscription.planId;
                subscriptionForm.billingCycle.value = subscription.billingCycle;
                subscriptionForm.startDate.value = subscription.startDate.split('T')[0];
                subscriptionForm.endDate.value = subscription.endDate.split('T')[0];
                subscriptionForm.discountCode.value = subscription.discountCode || '';
                subscriptionForm.dataset.subscriptionId = subscriptionId;
                subscriptionModal.style.display = 'flex';
                await this.logActivity('open_edit_subscription', { subscriptionId });
            } catch (error) {
                console.error('Error loading subscription for edit:', error);
                window.dashboardApp?.userInterface?.showErrorNotification('Failed to load subscription details.');
                await this.logActivity('edit_subscription_error', { subscriptionId, error: error.message });
            }
        }

        setupSubscriptionForm() {
            const subscriptionModal = document.getElementById('subscriptionModal');
            const subscriptionForm = document.getElementById('subscriptionForm');
            const closeSubscriptionModal = document.getElementById('closeSubscriptionModal');
            const createSubscriptionBtn = document.getElementById('createSubscriptionBtn');

            this.fetchWithAuth('/plans').then(plans => {
                const planSelect = subscriptionForm.planId;
                planSelect.innerHTML = '<option value="">Select Plan</option>' + 
                    plans.map(plan => `<option value="${plan._id}">${plan.name}</option>`).join('');
            }).catch(error => console.error('Error loading plans for form:', error));

            this.fetchWithAuth('/companies').then(companies => {
                const companySelect = subscriptionForm.companyId;
                companySelect.innerHTML = '<option value="">Select Company</option>' + 
                    companies.map(company => `<option value="${company._id}">${company.name}</option>`).join('');
            }).catch(error => console.error('Error loading companies for form:', error));

            closeSubscriptionModal.addEventListener('click', this.closeSubscriptionModalHandler);
            createSubscriptionBtn.addEventListener('click', this.createSubscriptionHandler);
            subscriptionForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                const subscriptionId = subscriptionForm.dataset.subscriptionId;
                const subscriptionData = {
                    companyId: subscriptionForm.companyId.value,
                    planId: subscriptionForm.planId.value,
                    billingCycle: subscriptionForm.billingCycle.value,
                    startDate: subscriptionForm.startDate.value,
                    endDate: subscriptionForm.endDate.value,
                    discountCode: subscriptionForm.discountCode.value || null
                };
                try {
                    if (subscriptionId) {
                        await this.fetchWithAuth(`/subscriptions/${subscriptionId}`, {
                            method: 'PUT',
                            body: JSON.stringify(subscriptionData)
                        });
                        window.dashboardApp?.userInterface?.showSuccessNotification('Subscription updated successfully.');
                        await this.logActivity('update_subscription', { subscriptionId, ...subscriptionData });
                    } else {
                        await this.fetchWithAuth('/subscriptions', {
                            method: 'POST',
                            body: JSON.stringify(subscriptionData)
                        });
                        window.dashboardApp?.userInterface?.showSuccessNotification('Subscription created successfully.');
                        await this.logActivity('create_subscription', { ...subscriptionData });
                    }
                    subscriptionModal.style.display = 'none';
                    await this.loadSubscriptions();
                } catch (error) {
                    console.error('Error saving subscription:', error);
                    window.dashboardApp?.userInterface?.showErrorNotification(error.message || 'Failed to save subscription.');
                    await this.logActivity(subscriptionId ? 'update_subscription_error' : 'create_subscription_error', { subscriptionId: subscriptionId || 'new', error: error.message });
                }
            });
        }

        loadInitialData() {
            this.loadPlans();
            this.setupPlanForm();
            this.loadFeatures();
            this.setupFeatureForm();
            this.loadSubscriptions();
            this.setupSubscriptionForm();
        }

        cleanup() {
            this.tabs.forEach(tab => {
                tab.removeEventListener('click', this.setupTabNavigation);
            });
            this.closePlanModal.removeEventListener('click', this.closePlanModalHandler);
            this.createPlanBtn.removeEventListener('click', this.createPlanHandler);
            this.planForm.removeEventListener('submit', this.planFormHandler);
            
            const featureModal = document.getElementById('featureModal');
            const closeFeatureModal = document.getElementById('closeFeatureModal');
            const createFeatureBtn = document.getElementById('createFeatureBtn');
            const featureForm = document.getElementById('featureForm');
            closeFeatureModal.removeEventListener('click', this.closeFeatureModalHandler);
            createFeatureBtn.removeEventListener('click', this.createFeatureHandler);
            featureForm.removeEventListener('submit', this.featureFormHandler);

            const subscriptionModal = document.getElementById('subscriptionModal');
            const closeSubscriptionModal = document.getElementById('closeSubscriptionModal');
            const createSubscriptionBtn = document.getElementById('createSubscriptionBtn');
            const subscriptionForm = document.getElementById('subscriptionForm');
            closeSubscriptionModal.removeEventListener('click', this.closeSubscriptionModalHandler);
            createSubscriptionBtn.removeEventListener('click', this.createSubscriptionHandler);
            subscriptionForm.removeEventListener('submit', this.subscriptionFormHandler);

            this.logActivity('cleanup', { message: 'PricingManager cleaned up' });
        }

        async refreshAll() {
            try {
                await Promise.all([
                    this.loadPlans(),
                    this.loadFeatures(),
                    this.loadSubscriptions()
                ]);
                window.dashboardApp?.userInterface?.showSuccessNotification('All data refreshed successfully.');
                await this.logActivity('refresh_all', { timestamp: new Date().toISOString() });
            } catch (error) {
                console.error('Error refreshing data:', error);
                window.dashboardApp?.userInterface?.showErrorNotification('Failed to refresh data.');
                await this.logActivity('refresh_all_error', { error: error.message });
            }
        }

        closePlanModalHandler = () => this.planModal.style.display = 'none';
        createPlanHandler = () => {
            this.planModalTitle.textContent = 'Create New Plan';
            this.planForm.reset();
            this.planForm.dataset.planId = '';
            this.planModal.style.display = 'flex';
        };
        planFormHandler = this.planForm.onsubmit;

        closeFeatureModalHandler = () => document.getElementById('featureModal').style.display = 'none';
        createFeatureHandler = () => {
            document.getElementById('featureModalTitle').textContent = 'Create New Feature';
            document.getElementById('featureForm').reset();
            document.getElementById('featureForm').dataset.featureId = '';
            document.getElementById('featureModal').style.display = 'flex';
        };
        featureFormHandler = document.getElementById('featureForm').onsubmit;

        closeSubscriptionModalHandler = () => document.getElementById('subscriptionModal').style.display = 'none';
        createSubscriptionHandler = () => {
            document.getElementById('subscriptionModalTitle').textContent = 'Create New Subscription';
            document.getElementById('subscriptionForm').reset();
            document.getElementById('subscriptionForm').dataset.subscriptionId = '';
            document.getElementById('subscriptionModal').style.display = 'flex';
        };
        subscriptionFormHandler = document.getElementById('subscriptionForm').onsubmit;

        setupEventListeners() {
            this.closePlanModal.addEventListener('click', this.closePlanModalHandler);
            this.createPlanBtn.addEventListener('click', this.createPlanHandler);
            this.planForm.addEventListener('submit', this.planFormHandler);

            const closeFeatureModal = document.getElementById('closeFeatureModal');
            const createFeatureBtn = document.getElementById('createFeatureBtn');
            closeFeatureModal.addEventListener('click', this.closeFeatureModalHandler);
            createFeatureBtn.addEventListener('click', this.createFeatureHandler);

            const closeSubscriptionModal = document.getElementById('closeSubscriptionModal');
            const createSubscriptionBtn = document.getElementById('createSubscriptionBtn');
            closeSubscriptionModal.addEventListener('click', this.closeSubscriptionModalHandler);
            createSubscriptionBtn.addEventListener('click', this.createSubscriptionHandler);
        }
    }

    window.PricingManager = new PricingManager();

    const refreshBtn = document.getElementById('refreshAllBtn');
    if (refreshBtn) {
        refreshBtn.addEventListener('click', () => window.PricingManager.refreshAll());
    }
})();

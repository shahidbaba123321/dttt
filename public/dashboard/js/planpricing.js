(function() {
    'use strict';

    // Check if PricingManager already exists
    if (window.PricingManager) {
        console.log('PricingManager already exists');
        return;
    }

    class PricingManager {
        constructor(apiBaseUrl, axiosInstance = axios) {
            // Configuration
            this.apiBaseUrl = apiBaseUrl;
            this.token = localStorage.getItem('token');
                    this.axios = axiosInstance;

            
            // DOM Elements
            this.plansContainer = document.getElementById('plansContainer');
            this.addPlanBtn = document.getElementById('addPlanBtn');
            this.modalContainer = document.getElementById('modalContainer');
            this.notificationContainer = document.getElementById('notificationContainer');
            
            // State Management
            this.plans = [];
            this.modules = [];
            this.selectedModules = [];
            
            // Currencies with symbols and conversion rates
            this.currencies = {
                'USD': { symbol: '$', name: 'US Dollar', conversionRates: {} },
                'INR': { symbol: '₹', name: 'Indian Rupee', conversionRates: {} },
                'GBP': { symbol: '£', name: 'British Pound', conversionRates: {} },
                'AED': { symbol: 'د.إ', name: 'UAE Dirham', conversionRates: {} },
                'QAR': { symbol: 'ر.ق', name: 'Qatari Riyal', conversionRates: {} }
            };

            // Markup rules for currency conversion
            this.currencyMarkupRules = {
                'INR': {
                    'USD': 1.3, 'GBP': 1.4, 
                    'AED': 1.3, 'QAR': 1.3
                },
                'USD': {
                    'GBP': 1.2,
                    'INR': 1, 'AED': 1, 'QAR': 1
                },
                'AED': {
                    'USD': 1.2, 'GBP': 1.3, 
                    'INR': 1
                },
                'QAR': {
                    'USD': 1.2, 'GBP': 1.3, 
                    'INR': 1
                },
                'GBP': {
                    'INR': 1, 'USD': 1, 
                    'AED': 1, 'QAR': 1
                }
            };

            // Initialize event listeners
            this.initializeEventListeners();
        }
                initializeEventListeners() {
            // Add Plan Button Event Listener
            this.addPlanBtn.addEventListener('click', () => this.showAddPlanModal());

            // Log Type Filter
            const logTypeFilter = document.getElementById('logTypeFilter');
            logTypeFilter.addEventListener('change', () => this.filterActivityLogs());

            // Log Date Filter
            const logDateFilter = document.getElementById('logDateFilter');
            logDateFilter.addEventListener('change', () => this.filterActivityLogs());
        }

        // Currency Conversion Method
        convertCurrency(amount, fromCurrency, toCurrency) {
            if (fromCurrency === toCurrency) return amount;

            const markup = this.currencyMarkupRules[fromCurrency]?.[toCurrency] || 1;
            return amount * markup;
        }

        // Validation Methods
        validatePlanName(name) {
            if (!name || name.trim().length < 3) {
                throw new Error('Plan name must be at least 3 characters long');
            }
            return name.trim();
        }

        validatePricing(monthlyPrice, annualPrice) {
            const monthlyNum = parseFloat(monthlyPrice);
            const annualNum = parseFloat(annualPrice);

            if (isNaN(monthlyNum) || monthlyNum < 0) {
                throw new Error('Monthly price must be a non-negative number');
            }

            if (isNaN(annualNum) || annualNum < 0) {
                throw new Error('Annual price must be a non-negative number');
            }

            return { monthlyPrice: monthlyNum, annualPrice: annualNum };
        }

        // Notification Methods
        showNotification(message, type = 'info') {
            const notification = document.createElement('div');
            notification.className = `notification ${type}`;
            notification.innerHTML = `
                <i class="fas ${this.getNotificationIcon(type)}"></i>
                <span>${message}</span>
            `;
            
            this.notificationContainer.appendChild(notification);
            
            setTimeout(() => {
                notification.remove();
            }, 3000);
        }

        getNotificationIcon(type) {
            switch(type) {
                case 'success': return 'fa-check-circle';
                case 'error': return 'fa-exclamation-circle';
                case 'warning': return 'fa-exclamation-triangle';
                default: return 'fa-info-circle';
            }
        }
                // Modal Generation Methods
        showAddPlanModal() {
            // Clear any existing modal content
            this.modalContainer.innerHTML = '';

            // Create modal structure
            const modalWrapper = document.createElement('div');
            modalWrapper.className = 'modal show';
            
            modalWrapper.innerHTML = `
                <div class="modal-content">
                    <div class="modal-header">
                        <h2 class="modal-title">Add New Plan</h2>
                        <button class="modal-close" id="closeAddPlanModal">&times;</button>
                    </div>
                    <div id="addPlanForm"></div>
                </div>
            `;

            this.modalContainer.appendChild(modalWrapper);

            // Generate form dynamically
            this.generatePlanForm();

            // Close modal event listener
            document.getElementById('closeAddPlanModal').addEventListener('click', () => {
                this.modalContainer.innerHTML = '';
            });
        }

        generatePlanForm() {
            const formContainer = document.getElementById('addPlanForm');
            
            formContainer.innerHTML = `
                <form id="newPlanForm">
                    <div class="form-group">
                        <label class="form-label">Plan Name</label>
                        <input type="text" id="planName" class="form-input" required>
                    </div>

                    <div class="form-group">
                        <label class="form-label">Plan Description</label>
                        <textarea id="planDescription" class="form-input" rows="3"></textarea>
                    </div>

                    <div class="form-group">
                        <label class="form-label">Select Currency</label>
                        <select id="planCurrency" class="form-select">
                            ${Object.entries(this.currencies).map(([code, details]) => 
                                `<option value="${code}">${details.name} (${details.symbol})</option>`
                            ).join('')}
                        </select>
                    </div>

                    <div class="form-group">
                        <label class="form-label">Monthly Price</label>
                        <div class="input-with-symbol">
                            <span class="currency-symbol" id="monthlyCurrencySymbol">$</span>
                            <input type="number" id="monthlyPrice" class="form-input" min="0" step="0.01" required>
                        </div>
                    </div>

                    <div class="form-group">
                        <label class="form-label">Annual Price</label>
                        <div class="input-with-symbol">
                            <span class="currency-symbol" id="annualCurrencySymbol">$</span>
                            <input type="number" id="annualPrice" class="form-input" min="0" step="0.01" required>
                        </div>
                    </div>

                    <div class="form-group">
                        <label class="form-label">Plan Status</label>
                        <select id="planStatus" class="form-select">
                            <option value="active">Active</option>
                            <option value="inactive">Inactive</option>
                        </select>
                    </div>

                    <div class="form-group">
                        <button type="button" id="selectModulesBtn" class="modal-btn modal-btn-secondary">
                            Select Modules
                        </button>
                    </div>

                    <div class="modal-footer">
                        <button type="button" id="cancelPlanBtn" class="modal-btn modal-btn-secondary">Cancel</button>
                        <button type="submit" class="modal-btn modal-btn-primary">Create Plan</button>
                    </div>
                </form>
            `;

            // Currency symbol update
            document.getElementById('planCurrency').addEventListener('change', (e) => {
                const symbol = this.currencies[e.target.value].symbol;
                document.getElementById('monthlyCurrencySymbol').textContent = symbol;
                document.getElementById('annualCurrencySymbol').textContent = symbol;
            });

            // Cancel button
            document.getElementById('cancelPlanBtn').addEventListener('click', () => {
                this.modalContainer.innerHTML = '';
            });

            // Select Modules Button
            document.getElementById('selectModulesBtn').addEventListener('click', () => {
                this.showModulesSelectionModal();
            });

            // Form submission
            document.getElementById('newPlanForm').addEventListener('submit', (e) => {
                e.preventDefault();
                this.createNewPlan();
            });
        }
                showModulesSelectionModal() {
            // Clear any existing modal content
            this.modalContainer.innerHTML = '';

            // Create modules selection modal structure
            const modalWrapper = document.createElement('div');
            modalWrapper.className = 'modal show';
            
            modalWrapper.innerHTML = `
                <div class="modal-content">
                    <div class="modal-header">
                        <h2 class="modal-title">Select Modules</h2>
                        <button class="modal-close" id="closeModulesModal">&times;</button>
                    </div>
                    <div class="modules-grid" id="modulesContainer"></div>
                    <div class="modal-footer">
                        <button type="button" id="cancelModulesBtn" class="modal-btn modal-btn-secondary">Cancel</button>
                        <button type="button" id="saveModulesBtn" class="modal-btn modal-btn-primary">Save Modules</button>
                    </div>
                </div>
            `;

            this.modalContainer.appendChild(modalWrapper);

            // Fetch and populate modules
            this.fetchModules();

            // Close modal event listeners
            document.getElementById('closeModulesModal').addEventListener('click', () => {
                this.modalContainer.innerHTML = '';
            });

            document.getElementById('cancelModulesBtn').addEventListener('click', () => {
                this.modalContainer.innerHTML = '';
            });

            document.getElementById('saveModulesBtn').addEventListener('click', () => {
                this.saveSelectedModules();
            });
        }

        async fetchModules() {
    try {
        let response;
        if (typeof axios !== 'undefined') {
            // Use axios if available
            response = await axios.get(`${this.apiBaseUrl}/modules`, {
                headers: {
                    'Authorization': `Bearer ${this.token}`
                }
            });
        } else {
            // Fallback to native fetch
            const fetchResponse = await fetch(`${this.apiBaseUrl}/modules`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${this.token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!fetchResponse.ok) {
                throw new Error('Network response was not ok');
            }

            response = await fetchResponse.json();
        }

        const modulesContainer = document.getElementById('modulesContainer');
        modulesContainer.innerHTML = '';

        response.data.forEach(module => {
            const moduleElement = document.createElement('div');
            moduleElement.className = 'module-checkbox';
            moduleElement.innerHTML = `
                <input 
                    type="checkbox" 
                    id="module-${module._id}" 
                    value="${module._id}"
                    ${this.selectedModules.includes(module._id) ? 'checked' : ''}
                >
                <label for="module-${module._id}">${module.name}</label>
            `;
            modulesContainer.appendChild(moduleElement);
        });
    } catch (error) {
        console.error('Error fetching modules:', error);
        this.showNotification('Failed to fetch modules', 'error');
    }
}
        saveSelectedModules() {
            const selectedModuleCheckboxes = document.querySelectorAll('#modulesContainer input:checked');
            this.selectedModules = Array.from(selectedModuleCheckboxes).map(checkbox => checkbox.value);
            
            // Update modules display in main form
            const selectModulesBtn = document.getElementById('selectModulesBtn');
            selectModulesBtn.textContent = `${this.selectedModules.length} Modules Selected`;
            
            // Close modules modal
            this.modalContainer.innerHTML = '';
        }

        async createNewPlan() {
            try {
                // Validate inputs
                const planName = this.validatePlanName(document.getElementById('planName').value);
                const planDescription = document.getElementById('planDescription').value;
                const currency = document.getElementById('planCurrency').value;
                const { monthlyPrice, annualPrice } = this.validatePricing(
                    document.getElementById('monthlyPrice').value,
                    document.getElementById('annualPrice').value
                );
                const planStatus = document.getElementById('planStatus').value;

                // Prepare plan data
                const planData = {
                    name: planName,
                    description: planDescription,
                    currency: currency,
                    monthlyPrice: monthlyPrice,
                    annualPrice: annualPrice,
                    status: planStatus,
                    modules: this.selectedModules
                };

                // Send request to create plan
                const response = await axios.post(`${this.apiBaseUrl}/plans`, planData, {
                    headers: {
                        'Authorization': `Bearer ${this.token}`,
                        'Content-Type': 'application/json'
                    }
                });

                // Show success notification
                this.showNotification('Plan created successfully', 'success');

                // Close modal and refresh plans
                this.modalContainer.innerHTML = '';
                this.fetchPlans();
            } catch (error) {
                console.error('Error creating plan:', error);
                this.showNotification(error.response?.data?.message || 'Failed to create plan', 'error');
            }
        }
                async fetchPlans() {
            try {
                const response = await axios.get(`${this.apiBaseUrl}/plans`, {
                    headers: {
                        'Authorization': `Bearer ${this.token}`
                    }
                });

                this.plans = response.data.data;
                this.renderPlans();
            } catch (error) {
                console.error('Error fetching plans:', error);
                this.showNotification('Failed to fetch plans', 'error');
            }
        }

        renderPlans() {
            this.plansContainer.innerHTML = '';

            this.plans.forEach(plan => {
                const planCard = document.createElement('div');
                planCard.className = 'plan-card';
                planCard.innerHTML = `
                    <div class="plan-header">
                        <h3 class="plan-name">${plan.name}</h3>
                        <span class="plan-status ${plan.status}">
                            ${plan.status.charAt(0).toUpperCase() + plan.status.slice(1)}
                        </span>
                    </div>
                    <div class="plan-pricing">
                        <span class="plan-price">
                            ${this.currencies[plan.currency].symbol}${plan.monthlyPrice}/month
                        </span>
                        <span class="plan-billing">
                            ${this.currencies[plan.currency].symbol}${plan.annualPrice}/year
                        </span>
                    </div>
                    <p class="plan-description">${plan.description}</p>
                    <div class="plan-modules">
                        <strong>Modules:</strong>
                        ${plan.modules ? plan.modules.length : 0} selected
                    </div>
                    <div class="plan-actions">
                        <button class="plan-action-btn edit-btn" data-id="${plan._id}">
                            <i class="fas fa-edit"></i> Edit
                        </button>
                        <button class="plan-action-btn delete-btn" data-id="${plan._id}">
                            <i class="fas fa-trash"></i> Delete
                        </button>
                    </div>
                `;

                // Add event listeners for edit and delete
                planCard.querySelector('.edit-btn').addEventListener('click', () => this.showEditPlanModal(plan));
                planCard.querySelector('.delete-btn').addEventListener('click', () => this.showDeleteConfirmation(plan));

                this.plansContainer.appendChild(planCard);
            });
        }

        showEditPlanModal(plan) {
            // Clear any existing modal content
            this.modalContainer.innerHTML = '';

            // Create modal structure
            const modalWrapper = document.createElement('div');
            modalWrapper.className = 'modal show';
            
            modalWrapper.innerHTML = `
                <div class="modal-content">
                    <div class="modal-header">
                        <h2 class="modal-title">Edit Plan: ${plan.name}</h2>
                        <button class="modal-close" id="closeEditPlanModal">&times;</button>
                    </div>
                    <div id="editPlanForm"></div>
                </div>
            `;

            this.modalContainer.appendChild(modalWrapper);

            // Generate edit form
            this.generateEditPlanForm(plan);

            // Close modal event listener
            document.getElementById('closeEditPlanModal').addEventListener('click', () => {
                this.modalContainer.innerHTML = '';
            });
        }

        generateEditPlanForm(plan) {
            const formContainer = document.getElementById('editPlanForm');
            
            formContainer.innerHTML = `
                <form id="editPlanFormData">
                    <input type="hidden" id="editPlanId" value="${plan._id}">
                    <div class="form-group">
                        <label class="form-label">Plan Name</label>
                        <input type="text" id="editPlanName" class="form-input" value="${plan.name}" required>
                    </div>

                    <div class="form-group">
                        <label class="form-label">Plan Description</label>
                        <textarea id="editPlanDescription" class="form-input" rows="3">${plan.description}</textarea>
                    </div>

                    <div class="form-group">
                        <label class="form-label">Select Currency</label>
                        <select id="editPlanCurrency" class="form-select">
                            ${Object.entries(this.currencies).map(([code, details]) => 
                                `<option value="${code}" ${code === plan.currency ? 'selected' : ''}>
                                    ${details.name} (${details.symbol})
                                </option>`
                            ).join('')}
                        </select>
                    </div>

                    <div class="form-group">
                        <label class="form-label">Monthly Price</label>
                        <div class="input-with-symbol">
                            <span class="currency-symbol" id="editMonthlyCurrencySymbol">
                                ${this.currencies[plan.currency].symbol}
                            </span>
                            <input type="number" id="editMonthlyPrice" class="form-input" 
                                   value="${plan.monthlyPrice}" min="0" step="0.01" required>
                        </div>
                    </div>

                    <div class="form-group">
                        <label class="form-label">Annual Price</label>
                        <div class="input-with-symbol">
                            <span class="currency-symbol" id="editAnnualCurrencySymbol">
                                ${this.currencies[plan.currency].symbol}
                            </span>
                            <input type="number" id="editAnnualPrice" class="form-input" 
                                   value="${plan.annualPrice}" min="0" step="0.01" required>
                        </div>
                    </div>

                    <div class="form-group">
                        <label class="form-label">Plan Status</label>
                        <select id="editPlanStatus" class="form-select">
                            <option value="active" ${plan.status === 'active' ? 'selected' : ''}>Active</option>
                            <option value="inactive" ${plan.status === 'inactive' ? 'selected' : ''}>Inactive</option>
                        </select>
                    </div>

                    <div class="form-group">
                        <button type="button" id="editSelectModulesBtn" class="modal-btn modal-btn-secondary">
                            Select Modules (${plan.modules ? plan.modules.length : 0} selected)
                        </button>
                    </div>

                    <div class="modal-footer">
                        <button type="button" id="cancelEditPlanBtn" class="modal-btn modal-btn-secondary">Cancel</button>
                        <button type="submit" class="modal-btn modal-btn-primary">Update Plan</button>
                    </div>
                </form>
            `;

            // Currency symbol update
            document.getElementById('editPlanCurrency').addEventListener('change', (e) => {
                const symbol = this.currencies[e.target.value].symbol;
                document.getElementById('editMonthlyCurrencySymbol').textContent = symbol;
                document.getElementById('editAnnualCurrencySymbol').textContent = symbol;
            });

            // Cancel button
            document.getElementById('cancelEditPlanBtn').addEventListener('click', () => {
                this.modalContainer.innerHTML = '';
            });

            // Select Modules Button
            document.getElementById('editSelectModulesBtn').addEventListener('click', () => {
                this.showModulesSelectionModal(plan.modules);
            });

            // Form submission
            document.getElementById('editPlanFormData').addEventListener('submit', (e) => {
                e.preventDefault();
                this.updatePlan();
            });
        }
                async updatePlan() {
            try {
                // Validate inputs
                const planId = document.getElementById('editPlanId').value;
                const planName = this.validatePlanName(document.getElementById('editPlanName').value);
                const planDescription = document.getElementById('editPlanDescription').value;
                const currency = document.getElementById('editPlanCurrency').value;
                const { monthlyPrice, annualPrice } = this.validatePricing(
                    document.getElementById('editMonthlyPrice').value,
                    document.getElementById('editAnnualPrice').value
                );
                const planStatus = document.getElementById('editPlanStatus').value;

                // Prepare plan data
                const planData = {
                    name: planName,
                    description: planDescription,
                    currency: currency,
                    monthlyPrice: monthlyPrice,
                    annualPrice: annualPrice,
                    status: planStatus,
                    modules: this.selectedModules
                };

                // Send request to update plan
                const response = await axios.put(`${this.apiBaseUrl}/plans/${planId}`, planData, {
                    headers: {
                        'Authorization': `Bearer ${this.token}`,
                        'Content-Type': 'application/json'
                    }
                });

                // Show success notification
                this.showNotification('Plan updated successfully', 'success');

                // Close modal and refresh plans
                this.modalContainer.innerHTML = '';
                this.fetchPlans();
            } catch (error) {
                console.error('Error updating plan:', error);
                this.showNotification(error.response?.data?.message || 'Failed to update plan', 'error');
            }
        }

        showDeleteConfirmation(plan) {
            // Clear any existing modal content
            this.modalContainer.innerHTML = '';

            // Create confirmation modal structure
            const modalWrapper = document.createElement('div');
            modalWrapper.className = 'modal show';
            
            modalWrapper.innerHTML = `
                <div class="modal-content">
                    <div class="modal-header">
                        <h2 class="modal-title">Confirm Delete Plan</h2>
                        <button class="modal-close" id="closeDeleteConfirmModal">&times;</button>
                    </div>
                    <div class="modal-body">
                        <p>Are you sure you want to delete the plan "${plan.name}"?</p>
                        <p>This action cannot be undone.</p>
                    </div>
                    <div class="modal-footer">
                        <button type="button" id="cancelDeleteBtn" class="modal-btn modal-btn-secondary">Cancel</button>
                        <button type="button" id="confirmDeleteBtn" class="modal-btn modal-btn-primary">Delete Plan</button>
                    </div>
                </div>
            `;

            this.modalContainer.appendChild(modalWrapper);

            // Close modal event listeners
            document.getElementById('closeDeleteConfirmModal').addEventListener('click', () => {
                this.modalContainer.innerHTML = '';
            });

            document.getElementById('cancelDeleteBtn').addEventListener('click', () => {
                this.modalContainer.innerHTML = '';
            });

            document.getElementById('confirmDeleteBtn').addEventListener('click', () => {
                this.deletePlan(plan._id);
            });
        }

        async deletePlan(planId) {
            try {
                // Send request to delete plan
                const response = await axios.delete(`${this.apiBaseUrl}/plans/${planId}`, {
                    headers: {
                        'Authorization': `Bearer ${this.token}`
                    }
                });

                // Show success notification
                this.showNotification('Plan deleted successfully', 'success');

                // Close modal and refresh plans
                this.modalContainer.innerHTML = '';
                this.fetchPlans();
            } catch (error) {
                console.error('Error deleting plan:', error);
                this.showNotification(error.response?.data?.message || 'Failed to delete plan', 'error');
            }
        }

        filterActivityLogs() {
            const logTypeFilter = document.getElementById('logTypeFilter').value;
            const logDateFilter = document.getElementById('logDateFilter').value;

            // Fetch filtered activity logs
            this.fetchActivityLogs(logTypeFilter, logDateFilter);
        }

        async fetchActivityLogs(type = '', dateRange = '7') {
            try {
                const response = await axios.get(`${this.apiBaseUrl}/activity-logs`, {
                    headers: {
                        'Authorization': `Bearer ${this.token}`
                    },
                    params: {
                        type: type,
                        dateRange: dateRange
                    }
                });

                this.renderActivityLogs(response.data.data);
            } catch (error) {
                console.error('Error fetching activity logs:', error);
                this.showNotification('Failed to fetch activity logs', 'error');
            }
        }

        renderActivityLogs(logs) {
            const logsContainer = document.getElementById('activityLogsContainer');
            logsContainer.innerHTML = '';

            logs.forEach(log => {
                const logItem = document.createElement('div');
                logItem.className = 'activity-log-item';
                logItem.innerHTML = `
                    <div class="activity-log-details">
                        <span class="activity-log-action">${log.action}</span>
                        <span class="activity-log-user">by ${log.user.name}</span>
                    </div>
                    <span class="log-type-badge log-type-${log.type}">${log.type}</span>
                    <span class="activity-log-timestamp">${new Date(log.timestamp).toLocaleString()}</span>
                `;
                logsContainer.appendChild(logItem);
            });
        }
                // Initialization method to load initial data
        async initialize() {
            try {
                // Fetch initial plans
                await this.fetchPlans();

                // Fetch initial activity logs
                await this.fetchActivityLogs();
            } catch (error) {
                console.error('Initialization error:', error);
                this.showNotification('Failed to initialize pricing management', 'error');
            }
        }
    }

    // Expose PricingManager to the global window object
    window.PricingManager = PricingManager;
})();

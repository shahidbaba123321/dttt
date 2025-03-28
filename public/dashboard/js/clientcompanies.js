(function() {
    'use strict';

    // Check if CompaniesManager already exists
    if (window.CompaniesManager) {
        console.log('CompaniesManager already exists');
        return;
    }

    class CompaniesManager {
        constructor() {
            // Base configuration
            this.baseUrl = 'https://18.215.160.136.nip.io/api';
            this.token = localStorage.getItem('token');
            this.currentPage = 1;
            this.pageSize = 10;
            this.totalCompanies = 0;
            this.companies = [];
            this.currentCompanyId = null;
            this.currentCompany = null;
            this.filters = {
                search: '',
                industry: '',
                status: '',
                plan: ''
            };
            this.industries = [
                'Technology', 'Healthcare', 'Finance', 'Manufacturing', 
                'Retail', 'Education', 'Construction', 'Hospitality',
                'Transportation', 'Energy', 'Media', 'Agriculture'
            ];
            this.subscriptionPlans = {
                 basic: { price: 99 },
            premium: { price: 199 },
            enterprise: { price: 499 }
            };
            
            // Initialize with async wrapper
            this.init();
            this.initializeStyles();
        }
        
        getPlanPrice(plan) {
        if (!plan) return 0;
        const planKey = plan.toLowerCase();
        return this.subscriptionPlans[planKey]?.price || 0;
    }


        async init() {
            try {
                await this.validateApiEndpoint();
                await this.initialize();
            } catch (error) {
                console.error('Initialization error:', error);
                this.showError('Failed to initialize companies module');
            }
        }

        async validateApiEndpoint() {
            try {
                const response = await fetch(`${this.baseUrl}/companies`, {
                    method: 'GET',
                    headers: this.getHeaders()
                });

                if (response.status === 401) {
                    localStorage.removeItem('token');
                    window.location.href = '/login.html';
                    return false;
                }

                if (!response.ok) {
                    throw new Error(`API validation failed: ${response.status}`);
                }

                this.showConnectionStatus('connected');
                return true;
            } catch (error) {
                console.error('API endpoint validation error:', error);
                this.showConnectionStatus('error');
                return false;
            }
        }

        getHeaders() {
            return {
                'Authorization': `Bearer ${this.token}`,
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            };
        }

        async handleApiRequest(endpoint, options = {}) {
    try {
        const url = `${this.baseUrl}${endpoint}`;
        console.log('Making API request:', { url, method: options.method }); // Debug log

        const response = await fetch(url, {
            ...options,
            headers: {
                ...this.getHeaders(),
                ...options.headers
            }
        });

        const data = await response.json();
        console.log('API response:', data); // Debug log

        if (!response.ok) {
            throw new Error(data.message || 'Request failed');
        }

        return data;
    } catch (error) {
        console.error('API request error:', error);
        throw error;
    }
}

        showConnectionStatus(status) {
            const statusElement = document.createElement('div');
            statusElement.className = `connection-status ${status}`;
            statusElement.innerHTML = `
                <i class="fas fa-${status === 'connected' ? 'check-circle' : 'exclamation-circle'}"></i>
                <span>${status === 'connected' ? 'Connected to server' : 'Connection error'}</span>
            `;
            
            document.body.appendChild(statusElement);
            setTimeout(() => statusElement.remove(), 3000);
        }

          initializeStyles() {
            const styles = `
                .alert {
                    padding: 16px;
                    border-radius: 12px;
                    margin-bottom: 16px;
                    display: flex;
                    align-items: center;
                    gap: 12px;
                }

                .alert-warning {
                    background-color: rgba(245, 158, 11, 0.1);
                    border: 1px solid rgba(245, 158, 11, 0.2);
                    color: var(--warning-color);
                }

                .credentials-box {
                    background-color: var(--bg-secondary);
                    border-radius: 12px;
                    padding: 20px;
                    margin: 20px 0;
                    border: 1px solid var(--border-light);
                }

                .credential-item {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    padding: 12px 0;
                    border-bottom: 1px solid var(--border-light);
                }

                .credential-item:last-child {
                    border-bottom: none;
                }

                .credential-item label {
                    color: var(--text-secondary);
                    font-weight: 500;
                }

                .credential-item .password {
                    font-family: monospace;
                    font-size: 1.1rem;
                    color: var(--primary-color);
                    font-weight: 600;
                    padding: 4px 8px;
                    background-color: rgba(79, 70, 229, 0.1);
                    border-radius: 6px;
                }

                .warning-message {
                    background-color: rgba(239, 68, 68, 0.1);
                    color: var(--danger-color);
                    padding: 12px 16px;
                    border-radius: 12px;
                    margin-top: 16px;
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    font-size: 0.9rem;
                }

                .warning-message i {
                    font-size: 1.1rem;
                }

                .connection-status {
                    position: fixed;
                    top: 20px;
                    right: 20px;
                    padding: 10px 20px;
                    border-radius: 4px;
                    display: flex;
                    align-items: center;
                    gap: 10px;
                    z-index: 9999;
                    animation: slideIn 0.3s ease-out;
                }

                .connection-status.connected {
                    background-color: var(--success-color);
                    color: white;
                }

                .connection-status.error {
                    background-color: var(--danger-color);
                    color: white;
                }

                .summary-row {
            display: flex;
            justify-content: space-between;
            padding: 8px 0;
            border-bottom: 1px solid var(--border-light);
        }

        .summary-row:last-child {
            border-bottom: none;
        }

        .summary-row.total {
            font-weight: 600;
            font-size: 1.1em;
            margin-top: 12px;
            padding-top: 12px;
            border-top: 2px solid var(--border-medium);
        }

        .summary-row.discount {
            color: var(--success-color);
        }

        .bulk-action-container {
            display: flex;
            gap: 12px;
            align-items: center;
            margin-bottom: 16px;
        }

        .bulk-action-select {
            min-width: 200px;
            padding: 8px 12px;
            border-radius: var(--border-radius-md);
            border: 1px solid var(--border-medium);
        }
        
                .user-action-menu {
        position: absolute;
        background: var(--bg-primary);
        border-radius: var(--border-radius-md);
        box-shadow: var(--shadow-lg);
        border: 1px solid var(--border-light);
        z-index: 1000;
        min-width: 200px;
        overflow: hidden;
    }

    .menu-item {
        padding: 12px 16px;
        cursor: pointer;
        display: flex;
        align-items: center;
        gap: 8px;
        color: var(--text-primary);
        transition: all 0.2s ease;
    }

    .menu-item:hover {
        background-color: var(--bg-secondary);
    }

    .menu-item.danger {
        color: var(--danger-color);
    }

    .menu-item.danger:hover {
        background-color: var(--danger-color);
        color: white;
    }

    .menu-item i {
        width: 16px;
        text-align: center;
    }
    .active-filter {
            border-color: var(--primary-color) !important;
            background-color: rgba(79, 70, 229, 0.1) !important;
        }

        .filter-status {
            display: none;
            padding: 8px 12px;
            background-color: var(--bg-secondary);
            border-radius: var(--border-radius-md);
            font-size: 0.875rem;
            color: var(--text-secondary);
            margin-top: 12px;
            margin-bottom: 12px;
        }
        .filters-section {
            position: relative;
        }
        .temp-password-modal .modal-content {
        max-width: 500px;
    }

    .password-container {
        display: flex;
        align-items: center;
        gap: 8px;
    }

    .password {
        font-family: 'Courier New', monospace;
        font-size: 1.1rem;
        background-color: var(--bg-secondary);
        padding: 8px 12px;
        border-radius: var(--border-radius-md);
        border: 1px solid var(--border-light);
        color: var(--primary-color);
        flex: 1;
    }

    .copy-btn {
        padding: 8px;
        border: none;
        background-color: var(--bg-secondary);
        color: var(--text-secondary);
        border-radius: var(--border-radius-sm);
        cursor: pointer;
        transition: all 0.2s ease;
    }

    .copy-btn:hover {
        background-color: var(--primary-color);
        color: white;
    }

    .credential-item {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 12px 0;
        border-bottom: 1px solid var(--border-light);
    }

    .credential-item:last-child {
        border-bottom: none;
    }

    .credential-item label {
        font-weight: 500;
        color: var(--text-secondary);
    }

    .credential-value {
        color: var(--text-primary);
    }

    .warning-message {
        margin-top: 16px;
        padding: 12px;
        background-color: var(--bg-secondary);
        border-radius: var(--border-radius-md);
        display: flex;
        align-items: center;
        gap: 8px;
        color: var(--warning-color);
    }


        .tooltip {
            position: absolute;
            background-color: var(--bg-primary);
            color: var(--text-primary);
            padding: 5px 10px;
            border-radius: var(--border-radius-sm);
            font-size: 0.875rem;
            box-shadow: var(--shadow-md);
            z-index: 1000;
            pointer-events: none;
        }

        [data-tooltip] {
            position: relative;
            cursor: help;
        }
        .filter-group {
            display: flex;
            gap: 12px;
            align-items: center;
            flex-wrap: wrap;
        }

        .filter-group select {
            min-width: 150px;
            padding: 8px 12px;
            border: 1px solid var(--border-medium);
            border-radius: var(--border-radius-md);
            background-color: var(--bg-primary);
            color: var(--text-primary);
            cursor: pointer;
            transition: all 0.3s ease;
        }

        .filter-group select:hover {
            border-color: var(--primary-color);
        }

        .filter-group select:focus {
            outline: none;
            border-color: var(--primary-color);
            box-shadow: 0 0 0 3px rgba(79, 70, 229, 0.1);
        }

        .filter-status {
            padding: 4px 8px;
            background-color: var(--bg-secondary);
            border-radius: var(--border-radius-sm);
            font-size: 0.875rem;
            color: var(--text-secondary);
            margin-top: 8px;
        }

        .filtered-out {
            opacity: 0.5;
        }

        /* Active Filter Indicators */
        .filter-group select:not([value=""]) {
            border-color: var(--primary-color);
            background-color: var(--bg-secondary);
        }

         .custom-dialog-overlay {
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background-color: rgba(0, 0, 0, 0.5);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 2000;
            opacity: 0;
            transition: opacity 0.3s ease;
            backdrop-filter: blur(4px);
        }

        .custom-dialog-overlay.show {
            opacity: 1;
        }

        .custom-dialog {
            background-color: var(--bg-primary);
            border-radius: var(--border-radius-lg);
            box-shadow: var(--shadow-lg);
            width: 90%;
            max-width: 400px;
            transform: translateY(-20px);
            transition: transform 0.3s ease;
            border: 1px solid var(--border-light);
        }

        .custom-dialog-overlay.show .custom-dialog {
            transform: translateY(0);
        }

        .dialog-header {
            padding: 1.5rem;
            border-bottom: 1px solid var(--border-light);
        }

        .dialog-header h3 {
            margin: 0;
            color: var(--text-primary);
            font-size: 1.25rem;
            font-weight: 600;
        }

        .dialog-content {
            padding: 1.5rem;
            color: var(--text-secondary);
        }

        .dialog-actions {
            padding: 1rem 1.5rem;
            border-top: 1px solid var(--border-light);
            display: flex;
            justify-content: flex-end;
            gap: 1rem;
        }

        .modal-stack {
            position: relative;
            z-index: 1000;
        }

        .modal-stack .modal {
            z-index: 1001;
        }

        .modal-stack .modal + .modal {
            z-index: 1002;
        }

        /* Responsive Filter Layout */
        @media (max-width: 768px) {
            .filter-group {
                flex-direction: column;
                align-items: stretch;
            }

            .filter-group select {
                width: 100%;
            }
        }

    

                @keyframes slideIn {
                    from {
                        transform: translateX(100%);
                        opacity: 0;
                    }
                    to {
                        transform: translateX(0);
                        opacity: 1;
                    }
                }
                .activity-logs {
            padding: 20px;
        }

        .activity-filters {
            display: flex;
            gap: 16px;
            margin-bottom: 24px;
        }

        .activity-filters select,
        .activity-filters input {
            padding: 8px 12px;
            border: 1px solid var(--border-medium);
            border-radius: var(--border-radius-md);
            background-color: var(--bg-primary);
        }

        .activity-list {
            display: flex;
            flex-direction: column;
            gap: 16px;
        }

        .activity-item {
            display: flex;
            gap: 16px;
            padding: 16px;
            background-color: var(--bg-primary);
            border-radius: var(--border-radius-md);
            border: 1px solid var(--border-light);
        }

        .activity-icon {
            width: 40px;
            height: 40px;
            border-radius: 50%;
            background-color: var(--bg-secondary);
            display: flex;
            align-items: center;
            justify-content: center;
            color: var(--primary-color);
        }

        .activity-details {
            flex: 1;
        }

        .activity-header {
            display: flex;
            justify-content: space-between;
            margin-bottom: 8px;
        }

        .activity-type {
            font-weight: 600;
            color: var(--primary-color);
        }

        .activity-date {
            color: var(--text-tertiary);
            font-size: 0.9rem;
        }

        .activity-description {
            color: var(--text-secondary);
            margin-bottom: 8px;
        }

        .btn-link {
            background: none;
            border: none;
            color: var(--primary-color);
            padding: 0;
            font-size: 0.9rem;
            cursor: pointer;
            text-decoration: underline;
        }

        .activity-details-expanded {
            margin-top: 8px;
            padding: 12px;
            background-color: var(--bg-secondary);
            border-radius: var(--border-radius-sm);
            font-family: monospace;
            font-size: 0.9rem;
            white-space: pre-wrap;
        }

        .activity-details-expanded.hidden {
            display: none;
        }
    
            `;

            const styleSheet = document.createElement('style');
            styleSheet.textContent = styles;
            document.head.appendChild(styleSheet);
        }

        async initialize() {
            try {
                await this.initializeElements();
                await this.initializeEventListeners();
                await this.loadCompanies();
            } catch (error) {
                console.error('Initialization error:', error);
                this.showError('Failed to initialize companies module');
            }
        }

        async initializeElements() {
            this.companiesGrid = document.querySelector('.companies-grid');
            this.paginationContainer = document.querySelector('.pagination');
            
            this.searchInput = document.getElementById('companySearch');
            this.industryFilter = document.getElementById('industryFilter');
            this.statusFilter = document.getElementById('statusFilter');
            this.planFilter = document.getElementById('planFilter');
            
            this.companyModal = document.getElementById('companyModal');
            this.detailsModal = document.getElementById('companyDetailsModal');
            this.changePlanModal = document.getElementById('changePlanModal');
            
            this.companyForm = document.getElementById('companyForm');
            
            this.addCompanyBtn = document.getElementById('addCompanyBtn');
            this.saveCompanyBtn = document.getElementById('saveCompanyBtn');
            this.cancelBtn = document.getElementById('cancelBtn');

            await this.populateIndustryDropdowns();
        }

        initializeEventListeners() {
    // Company Management Events
    if (this.addCompanyBtn) {
        this.addCompanyBtn.addEventListener('click', () => this.showAddCompanyModal());
    }

    if (this.companyForm) {
        this.companyForm.addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleCompanySubmit();
        });
    }

    // Search and Filter Events
    // Company Search
    if (this.searchInput) {
        this.searchInput.addEventListener('input', this.debounce(() => {
            this.filters.search = this.searchInput.value;
            this.currentPage = 1;
            this.loadCompanies();
        }, 300));
    }

    // Industry Filter
    if (this.industryFilter) {
    this.industryFilter.addEventListener('change', (e) => {
        try {
            this.filters.industry = e.target.value;
            this.currentPage = 1;
            this.loadCompanies();
            this.highlightActiveFilter(e.target);
        } catch (error) {
            console.error('Error handling industry filter:', error);
        }
    });
}

    // Status Filter
   if (this.statusFilter) {
    this.statusFilter.addEventListener('change', (e) => {
        try {
            this.filters.status = e.target.value;
            this.currentPage = 1;
            this.loadCompanies();
            this.highlightActiveFilter(e.target);
        } catch (error) {
            console.error('Error handling status filter:', error);
        }
    });
}

    // Plan Filter
    if (this.planFilter) {
    this.planFilter.addEventListener('change', (e) => {
        try {
            this.filters.plan = e.target.value;
            this.currentPage = 1;
            this.loadCompanies();
            this.highlightActiveFilter(e.target);
        } catch (error) {
            console.error('Error handling plan filter:', error);
        }
    });
}

    // Clear Filters Button
    const clearFiltersBtn = document.getElementById('clearFiltersBtn');
    if (clearFiltersBtn) {
        clearFiltersBtn.addEventListener('click', () => {
            this.clearFilters();
        });
    }

    // Modal Close Buttons
    document.querySelectorAll('.close-btn').forEach(btn => {
        btn.addEventListener('click', () => this.closeModals());
    });

    // Cancel Buttons
    document.querySelectorAll('#cancelBtn, #cancelAddUser, #cancelPlanChange').forEach(btn => {
        if (btn) {
            btn.addEventListener('click', () => this.closeModals());
        }
    });

    // User Management Events
    document.getElementById('addUserBtn')?.addEventListener('click', () => {
        if (this.currentCompanyId) {
            this.showAddUserModal(this.currentCompanyId);
        }
    });

    document.getElementById('confirmAddUser')?.addEventListener('click', () => {
        this.handleAddUser();
    });

    // Subscription Management Events
    document.getElementById('changePlanBtn')?.addEventListener('click', () => {
        if (this.currentCompanyId) {
            this.showChangePlanModal(this.currentCompanyId);
        }
    });

    document.getElementById('confirmPlanChange')?.addEventListener('click', () => {
        this.handlePlanChange(this.currentCompanyId);
    });

    // Tab Navigation
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const tabName = e.target.dataset.tab;
            this.activateTab(tabName);
        });
    });

    // Global Modal Close Events
    document.addEventListener('click', (e) => {
        if (e.target.classList.contains('modal')) {
            this.closeModals();
        }
    });

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            this.closeModals();
        }
    });

    // Company Card Actions
    if (this.companiesGrid) {
        this.companiesGrid.addEventListener('click', (e) => {
            const actionButton = e.target.closest('[data-action]');
            if (!actionButton) return;

            const action = actionButton.dataset.action;
            const companyId = actionButton.dataset.companyId;

            switch (action) {
                case 'view':
                    this.viewCompanyDetails(companyId);
                    break;
                case 'edit':
                    this.editCompany(companyId);
                    break;
                case 'toggle-status':
                    this.toggleCompanyStatus(companyId);
                    break;
            }
        });
    }

    // Subscription Plan Selection Events
    const planSelect = document.getElementById('newPlan');
    const cycleSelect = document.getElementById('billingCycle');
    if (planSelect && cycleSelect) {
        [planSelect, cycleSelect].forEach(select => {
            select.addEventListener('change', () => {
                this.updatePlanSummary();
            });
        });
    }

    // Export Functionality
    document.getElementById('exportBtn')?.addEventListener('click', () => {
        this.exportData();
    });

    // Bulk Actions
    document.getElementById('bulkActionBtn')?.addEventListener('click', () => {
        this.handleBulkAction();
    });

    // Initialize Tooltips
    this.initializeTooltips();
}

        
// Helper methods for event listeners
highlightActiveFilter(filterElement) {
    try {
        if (!filterElement) return;

        if (filterElement.value) {
            filterElement.classList.add('active-filter');
        } else {
            filterElement.classList.remove('active-filter');
        }
        this.updateFilterStatus();
    } catch (error) {
        console.error('Error highlighting filter:', error);
    }
}
clearFilters() {
    try {
        // Reset all filter values
        this.filters = {
            search: '',
            industry: '',
            status: '',
            plan: ''
        };

        // Reset form elements
        if (this.searchInput) this.searchInput.value = '';
        if (this.industryFilter) this.industryFilter.value = '';
        if (this.statusFilter) this.statusFilter.value = '';
        if (this.planFilter) this.planFilter.value = '';

        // Remove active filter highlights
        document.querySelectorAll('.filter-group select').forEach(select => {
            select.classList.remove('active-filter');
        });

        // Reload companies with cleared filters
        this.currentPage = 1;
        this.loadCompanies();
        this.updateFilterStatus();
    } catch (error) {
        console.error('Error clearing filters:', error);
    }
}

        updatePlanSummary() {
    try {
        const plan = document.getElementById('newPlan').value;
        const cycle = document.getElementById('billingCycle').value;
        
        if (!plan || !this.subscriptionPlans[plan]) {
            console.error('Invalid plan selected');
            return;
        }

        const basePrice = this.subscriptionPlans[plan].price;
        const months = cycle === 'annual' ? 12 : 1;
        const subtotal = basePrice * months;
        const discount = cycle === 'annual' ? subtotal * 0.1 : 0; // 10% annual discount
        const total = subtotal - discount;

        const summaryElement = document.getElementById('planSummary');
        if (summaryElement) {
            summaryElement.innerHTML = `
                <div class="summary-row">
                    <span>Base Price:</span>
                    <span>$${basePrice}/month</span>
                </div>
                <div class="summary-row">
                    <span>Billing Period:</span>
                    <span>${months} month${months > 1 ? 's' : ''}</span>
                </div>
                <div class="summary-row">
                    <span>Subtotal:</span>
                    <span>$${subtotal.toFixed(2)}</span>
                </div>
                ${discount > 0 ? `
                    <div class="summary-row discount">
                        <span>Annual Discount (10%):</span>
                        <span>-$${discount.toFixed(2)}</span>
                    </div>
                ` : ''}
                <div class="summary-row total">
                    <span>Total:</span>
                    <span>$${total.toFixed(2)}</span>
                </div>
            `;
        }
    } catch (error) {
        console.error('Error updating plan summary:', error);
        this.showError('Failed to update plan summary');
    }
}

  handleBulkAction() {
    try {
        const selectedItems = document.querySelectorAll('.company-checkbox:checked');
        if (selectedItems.length === 0) {
            this.showError('Please select items to perform bulk action');
            return;
        }

        const actionSelect = document.getElementById('bulkActionSelect');
        if (!actionSelect) {
            this.showError('Bulk action selector not found');
            return;
        }

        const action = actionSelect.value;
        const selectedIds = Array.from(selectedItems).map(item => item.value);

        switch (action) {
            case 'activate':
                this.bulkActivate(selectedIds);
                break;
            case 'deactivate':
                this.bulkDeactivate(selectedIds);
                break;
            case 'delete':
                this.bulkDelete(selectedIds);
                break;
            default:
                this.showError('Please select a valid action');
        }
    } catch (error) {
        console.error('Error handling bulk action:', error);
        this.showError('Failed to perform bulk action');
    }
}

        async bulkActivate(ids) {
    try {
        const result = await this.handleApiRequest('/companies/bulk/activate', {
            method: 'POST',
            body: JSON.stringify({ ids })
        });

        if (result) {
            this.showSuccess('Companies activated successfully');
            await this.loadCompanies();
        }
    } catch (error) {
        console.error('Error activating companies:', error);
        this.showError('Failed to activate companies');
    }
}

async bulkDeactivate(ids) {
    try {
        const result = await this.handleApiRequest('/companies/bulk/deactivate', {
            method: 'POST',
            body: JSON.stringify({ ids })
        });

        if (result) {
            this.showSuccess('Companies deactivated successfully');
            await this.loadCompanies();
        }
    } catch (error) {
        console.error('Error deactivating companies:', error);
        this.showError('Failed to deactivate companies');
    }
}

async bulkDelete(ids) {
    try {
        if (await this.showConfirmDialog('Are you sure you want to delete the selected companies?')) {
            const result = await this.handleApiRequest('/companies/bulk/delete', {
                method: 'POST',
                body: JSON.stringify({ ids })
            });

            if (result) {
                this.showSuccess('Companies deleted successfully');
                await this.loadCompanies();
            }
        }
    } catch (error) {
        console.error('Error deleting companies:', error);
        this.showError('Failed to delete companies');
    }
}

exportData() {
    try {
        const data = this.companies.map(company => ({
            'Company Name': company.name,
            'Industry': company.industry,
            'Company Size': company.companySize,
            'Status': company.status,
            'Subscription Plan': company.subscriptionPlan,
            'Email': company.contactDetails?.email || '',
            'Phone': company.contactDetails?.phone || '',
            'Address': company.contactDetails?.address || '',
            'Created Date': new Date(company.createdAt).toLocaleDateString()
        }));

        if (data.length === 0) {
            this.showError('No data to export');
            return;
        }

        // Convert to CSV
        const headers = Object.keys(data[0]);
        const csvContent = [
            headers.join(','),
            ...data.map(row => 
                headers.map(header => 
                    `"${(row[header] || '').toString().replace(/"/g, '""')}"`
                ).join(',')
            )
        ].join('\n');

        // Create and trigger download
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.setAttribute('download', `companies_export_${new Date().toISOString().slice(0,10)}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        this.showSuccess('Data exported successfully');
    } catch (error) {
        console.error('Error exporting data:', error);
        this.showError('Failed to export data');
    }
}

        
   
updateFilterStatus() {
    try {
        // Ensure filters object exists
        if (!this.filters) {
            this.filters = {
                search: '',
                industry: '',
                status: '',
                plan: ''
            };
        }

        // Create or get filter status element
        let filterStatus = document.querySelector('.filter-status');
        if (!filterStatus) {
            filterStatus = document.createElement('div');
            filterStatus.className = 'filter-status';
            const filtersSection = document.querySelector('.filters-section');
            if (filtersSection) {
                filtersSection.appendChild(filterStatus);
            }
        }

        // Count active filters
        const activeFilters = Object.values(this.filters).filter(Boolean).length;

        // Update status display
        if (filterStatus) {
            if (activeFilters > 0) {
                filterStatus.textContent = `${activeFilters} active filter${activeFilters > 1 ? 's' : ''}`;
                filterStatus.style.display = 'block';
            } else {
                filterStatus.style.display = 'none';
            }
        }
    } catch (error) {
        console.error('Error updating filter status:', error);
    }
}

initializeTooltips() {
    document.querySelectorAll('[data-tooltip]').forEach(element => {
        element.addEventListener('mouseenter', (e) => {
            const tooltip = document.createElement('div');
            tooltip.className = 'tooltip';
            tooltip.textContent = e.target.dataset.tooltip;
            document.body.appendChild(tooltip);

            const rect = e.target.getBoundingClientRect();
            tooltip.style.top = `${rect.bottom + 5}px`;
            tooltip.style.left = `${rect.left + (rect.width / 2) - (tooltip.offsetWidth / 2)}px`;
        });

        element.addEventListener('mouseleave', () => {
            document.querySelector('.tooltip')?.remove();
        });
    });
}

     
        
        

            async loadCompanies() {
    try {
        this.showLoading();
        const queryParams = new URLSearchParams({
            page: this.currentPage,
            limit: this.pageSize,
            ...this.filters
        });

        const result = await this.handleApiRequest(`/companies?${queryParams}`);
        
        if (result) {
            this.totalCompanies = result.total;
            this.companies = result.companies;
            this.renderCompanies(this.companies);
            this.renderPagination();
        }
    } catch (error) {
        console.error('Error loading companies:', error);
        this.showError('Failed to load companies');
        
        // Show empty state when there's an error
        if (this.companiesGrid) {
            this.companiesGrid.innerHTML = `
                <div class="error-state">
                    <i class="fas fa-exclamation-circle"></i>
                    <h3>Error Loading Companies</h3>
                    <p>Unable to load companies. Please try again later.</p>
                    <button class="btn-primary" onclick="window.companiesManager.loadCompanies()">
                        <i class="fas fa-redo"></i> Retry
                    </button>
                </div>
            `;
        }
    } finally {
        this.hideLoading();
    }
}
        renderCompanies(companies) {
            if (!companies.length) {
                this.companiesGrid.innerHTML = `
                    <div class="empty-state">
                        <i class="fas fa-building"></i>
                        <h3>No Companies Found</h3>
                        <p>There are no companies matching your criteria.</p>
                    </div>
                `;
                return;
            }

            this.companiesGrid.innerHTML = companies.map(company => `
                <div class="company-card" data-id="${company._id}">
                    <div class="company-header">
                        <h3>${this.escapeHtml(company.name)}</h3>
                        <span class="status-badge ${company.status}">
                            ${company.status.charAt(0).toUpperCase() + company.status.slice(1)}
                        </span>
                    </div>
                    <div class="company-details">
                        <p><i class="fas fa-industry"></i> ${this.escapeHtml(company.industry)}</p>
                        <p><i class="fas fa-users"></i> ${company.companySize} employees</p>
                        <p><i class="fas fa-tag"></i> ${company.subscriptionPlan} plan</p>
                        <p><i class="fas fa-envelope"></i> ${this.escapeHtml(company.contactDetails.email)}</p>
                    </div>
                    <div class="company-actions">
                        <button class="btn-icon view" data-action="view" data-company-id="${company._id}">
                            <i class="fas fa-eye"></i>
                        </button>
                        <button class="btn-icon edit" data-action="edit" data-company-id="${company._id}">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn-icon toggle" data-action="toggle-status" data-company-id="${company._id}">
                            <i class="fas fa-power-off"></i>
                        </button>
                    </div>
                </div>
            `).join('');

            // Add event listeners for company actions
            this.companiesGrid.addEventListener('click', (e) => {
                const button = e.target.closest('button[data-action]');
                if (!button) return;

                const action = button.dataset.action;
                const companyId = button.dataset.companyId;

                switch (action) {
                    case 'view':
                        this.viewCompanyDetails(companyId);
                        break;
                    case 'edit':
                        this.editCompany(companyId);
                        break;
                    case 'toggle-status':
                        this.toggleCompanyStatus(companyId);
                        break;
                }
            });
        }

        renderPagination() {
            const totalPages = Math.ceil(this.totalCompanies / this.pageSize);
            
            if (totalPages <= 1) {
                this.paginationContainer.innerHTML = '';
                return;
            }

            const pages = this.getPaginationRange(this.currentPage, totalPages);
            
            this.paginationContainer.innerHTML = `
                <button class="btn-page" ${this.currentPage === 1 ? 'disabled' : ''} 
                        data-page="1">
                    <i class="fas fa-angle-double-left"></i>
                </button>
                ${pages.map(page => `
                    <button class="btn-page ${page === this.currentPage ? 'active' : ''}"
                            data-page="${page}">
                        ${page}
                    </button>
                `).join('')}
                <button class="btn-page" ${this.currentPage === totalPages ? 'disabled' : ''} 
                        data-page="${totalPages}">
                    <i class="fas fa-angle-double-right"></i>
                </button>
            `;

            this.paginationContainer.querySelectorAll('.btn-page').forEach(button => {
                button.addEventListener('click', () => {
                    if (!button.disabled) {
                        this.changePage(parseInt(button.dataset.page));
                    }
                });
            });
        }

        getPaginationRange(current, total) {
            const delta = 2;
            const range = [];
            const rangeWithDots = [];
            let l;

            for (let i = 1; i <= total; i++) {
                if (i === 1 || i === total || 
                    (i >= current - delta && i <= current + delta)) {
                    range.push(i);
                }
            }

            for (let i of range) {
                if (l) {
                    if (i - l === 2) {
                        rangeWithDots.push(l + 1);
                    } else if (i - l !== 1) {
                        rangeWithDots.push('...');
                    }
                }
                rangeWithDots.push(i);
                l = i;
            }

            return rangeWithDots;
        }

        async populateIndustryDropdowns() {
            try {
                const industrySelects = [
                    this.industryFilter,
                    document.querySelector('#industry')
                ];

                industrySelects.forEach(select => {
                    if (select) {
                        select.innerHTML = '';

                        const defaultOption = document.createElement('option');
                        defaultOption.value = '';
                        defaultOption.textContent = select === this.industryFilter ? 'All Industries' : 'Select Industry';
                        select.appendChild(defaultOption);

                        this.industries.forEach(industry => {
                            const option = document.createElement('option');
                            option.value = industry.toLowerCase();
                            option.textContent = industry;
                            select.appendChild(option);
                        });
                    }
                });
            } catch (error) {
                console.error('Error populating industry dropdowns:', error);
                throw new Error('Failed to populate industry dropdowns');
            }
        }

            async showAddCompanyModal() {
    try {
        this.currentCompanyId = null;
        this.currentCompany = null;
        
        const modalContent = `
            <div class="modal-content">
                <div class="modal-header">
                    <h2>Add New Company</h2>
                    <button class="close-btn"><i class="fas fa-times"></i></button>
                </div>
                <div class="modal-body">
                    <form id="companyForm">
                        <div class="form-group">
                            <label for="companyName">Company Name*</label>
                            <input type="text" id="companyName" required>
                        </div>
                        <div class="form-group">
                            <label for="industry">Industry Type*</label>
                            <select id="industry" required>
                                <option value="">Select Industry</option>
                                ${this.industries.map(industry => 
                                    `<option value="${industry.toLowerCase()}">${industry}</option>`
                                ).join('')}
                            </select>
                        </div>
                        <div class="form-group">
                            <label for="companySize">Company Size*</label>
                            <input type="number" id="companySize" min="1" required>
                        </div>
                        <div class="form-group">
                            <label for="email">Contact Email*</label>
                            <input type="email" id="email" required>
                        </div>
                        <div class="form-group">
                            <label for="phone">Contact Phone*</label>
                            <input type="tel" id="phone" required>
                        </div>
                        <div class="form-group">
                            <label for="address">Address*</label>
                            <textarea id="address" required></textarea>
                        </div>
                        <div class="form-group">
                            <label for="subscriptionPlan">Subscription Plan*</label>
                            <select id="subscriptionPlan" required>
                                <option value="basic">Basic</option>
                                <option value="premium">Premium</option>
                                <option value="enterprise">Enterprise</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label for="status">Status*</label>
                            <select id="status" required>
                                <option value="active">Active</option>
                                <option value="inactive">Inactive</option>
                            </select>
                        </div>
                    </form>
                </div>
                <div class="modal-footer">
                    <button class="btn-secondary" id="cancelBtn">Cancel</button>
                    <button class="btn-primary" id="saveCompanyBtn">Save Company</button>
                </div>
            </div>
        `;

        const modal = document.getElementById('companyModal');
        if (modal) {
            modal.innerHTML = modalContent;
            this.showModal('companyModal');

            // Add event listeners
            modal.querySelector('.close-btn').addEventListener('click', () => this.closeModals());
            modal.querySelector('#cancelBtn').addEventListener('click', () => this.closeModals());
            modal.querySelector('#saveCompanyBtn').addEventListener('click', () => this.handleCompanySubmit());
        }
    } catch (error) {
        console.error('Error showing add company modal:', error);
        this.showError('Failed to show add company form');
    }
}

      async handleCompanySubmit() {
    try {
        const formData = {
            name: document.getElementById('companyName').value.trim(),
            industry: document.getElementById('industry').value,
            companySize: parseInt(document.getElementById('companySize').value),
            contactDetails: {
                email: document.getElementById('email').value.trim(),
                phone: document.getElementById('phone').value.trim(),
                address: document.getElementById('address').value.trim()
            },
            subscriptionPlan: document.getElementById('subscriptionPlan').value,
            status: document.getElementById('status').value
        };

        const saveButton = document.getElementById('saveCompanyBtn');
        if (saveButton) {
            saveButton.disabled = true;
            saveButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';
        }

        const endpoint = this.currentCompanyId 
            ? `/companies/${this.currentCompanyId}`
            : '/companies';

        const method = this.currentCompanyId ? 'PUT' : 'POST';

        const result = await this.handleApiRequest(endpoint, {
            method,
            body: JSON.stringify(formData)
        });

        if (result) {
            this.showSuccess(`Company successfully ${this.currentCompanyId ? 'updated' : 'created'}`);
            this.closeModals();
            await this.loadCompanies();
        }
    } catch (error) {
        console.error('Error saving company:', error);
        this.showError(error.message || 'Failed to save company');
    } finally {
        const saveButton = document.getElementById('saveCompanyBtn');
        if (saveButton) {
            saveButton.disabled = false;
            saveButton.innerHTML = this.currentCompanyId ? 'Update Company' : 'Save Company';
        }
    }
}
async checkForDuplicates(name, email, excludeId) {
    try {
        const response = await this.handleApiRequest(`/companies/check-duplicates`, {
            method: 'POST',
            body: JSON.stringify({
                name,
                email,
                excludeId
            })
        });
        return response.isDuplicate;
    } catch (error) {
        console.error('Error checking for duplicates:', error);
        return false;
    }
}

        
        validateCompanyData(data) {
    try {
        // Name validation
        if (!data.name || data.name.length < 2 || data.name.length > 100) {
            throw new Error('Company name must be between 2 and 100 characters');
        }

        // Industry validation
        if (!this.industries.map(i => i.toLowerCase()).includes(data.industry.toLowerCase())) {
            throw new Error('Please select a valid industry');
        }

        // Company size validation
        if (!Number.isInteger(data.companySize) || data.companySize < 1) {
            throw new Error('Company size must be a positive number');
        }

        // Email validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(data.contactDetails.email)) {
            throw new Error('Please enter a valid email address');
        }

        // Phone validation
        const phoneRegex = /^\+?[\d\s-]{10,}$/;
        if (!phoneRegex.test(data.contactDetails.phone)) {
            throw new Error('Please enter a valid phone number (minimum 10 digits)');
        }

        // Address validation
        if (!data.contactDetails.address || data.contactDetails.address.length < 5) {
            throw new Error('Address must be at least 5 characters long');
        }

        // Subscription plan validation
        const validPlans = ['basic', 'premium', 'enterprise'];
        if (!validPlans.includes(data.subscriptionPlan.toLowerCase())) {
            throw new Error('Please select a valid subscription plan');
        }

        // Status validation
        const validStatuses = ['active', 'inactive'];
        if (!validStatuses.includes(data.status.toLowerCase())) {
            throw new Error('Please select a valid status');
        }

        return true;
    } catch (error) {
        this.showError(error.message);
        return false;
    }
}
        async checkCompanyExists(name, email, excludeId = null) {
    try {
        const query = new URLSearchParams({
            name,
            email,
            ...(excludeId && { excludeId })
        });

        const result = await this.handleApiRequest(`/companies/check-exists?${query}`);
        return result.exists;
    } catch (error) {
        console.error('Error checking company existence:', error);
        return false;
    }
}
       async editCompany(companyId) {
    try {
        const result = await this.handleApiRequest(`/companies/${companyId}`);
        
        if (!result || !result.data) {
            throw new Error('Failed to fetch company data');
        }

        this.currentCompanyId = companyId;
        this.currentCompany = result.data;

        // Show the modal with edit form
        const modalContent = `
            <div class="modal-content">
                <div class="modal-header">
                    <h2>Edit Company</h2>
                    <button class="close-btn"><i class="fas fa-times"></i></button>
                </div>
                <div class="modal-body">
                    <form id="companyForm">
                        <div class="form-group">
                            <label for="companyName">Company Name*</label>
                            <input type="text" id="companyName" required>
                        </div>
                        <div class="form-group">
                            <label for="industry">Industry Type*</label>
                            <select id="industry" required>
                                <option value="">Select Industry</option>
                                ${this.industries.map(industry => 
                                    `<option value="${industry.toLowerCase()}">${industry}</option>`
                                ).join('')}
                            </select>
                        </div>
                        <div class="form-group">
                            <label for="companySize">Company Size*</label>
                            <input type="number" id="companySize" min="1" required>
                        </div>
                        <div class="form-group">
                            <label for="email">Contact Email*</label>
                            <input type="email" id="email" required>
                        </div>
                        <div class="form-group">
                            <label for="phone">Contact Phone*</label>
                            <input type="tel" id="phone" required>
                        </div>
                        <div class="form-group">
                            <label for="address">Address*</label>
                            <textarea id="address" required></textarea>
                        </div>
                        <div class="form-group">
                            <label for="subscriptionPlan">Subscription Plan*</label>
                            <select id="subscriptionPlan" required>
                                <option value="basic">Basic</option>
                                <option value="premium">Premium</option>
                                <option value="enterprise">Enterprise</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label for="status">Status*</label>
                            <select id="status" required>
                                <option value="active">Active</option>
                                <option value="inactive">Inactive</option>
                            </select>
                        </div>
                    </form>
                </div>
                <div class="modal-footer">
                    <button class="btn-secondary" id="cancelBtn">Cancel</button>
                    <button class="btn-primary" id="saveCompanyBtn">Update Company</button>
                </div>
            </div>
        `;

        const modal = document.getElementById('companyModal');
        if (modal) {
            modal.innerHTML = modalContent;
            this.showModal('companyModal');

            // Wait for DOM to update before populating
            setTimeout(() => {
                this.populateCompanyForm(this.currentCompany);
            }, 0);

            // Add event listeners
            modal.querySelector('.close-btn').addEventListener('click', () => this.closeModals());
            modal.querySelector('#cancelBtn').addEventListener('click', () => this.closeModals());
            modal.querySelector('#saveCompanyBtn').addEventListener('click', () => this.handleCompanySubmit());
        }
    } catch (error) {
        console.error('Error in editCompany:', error);
        this.showError('Failed to load company data');
    }
}

        populateCompanyForm(company) {
    try {
        if (!company) {
            throw new Error('No company data provided');
        }

        const elements = {
            companyName: document.getElementById('companyName'),
            industry: document.getElementById('industry'),
            companySize: document.getElementById('companySize'),
            email: document.getElementById('email'),
            phone: document.getElementById('phone'),
            address: document.getElementById('address'),
            subscriptionPlan: document.getElementById('subscriptionPlan'),
            status: document.getElementById('status')
        };

        // Verify all form elements exist
        Object.entries(elements).forEach(([key, element]) => {
            if (!element) {
                throw new Error(`Form element '${key}' not found`);
            }
        });

        // Populate form fields
        elements.companyName.value = company.name || '';
        elements.industry.value = company.industry?.toLowerCase() || '';
        elements.companySize.value = company.companySize || '';
        elements.email.value = company.contactDetails?.email || '';
        elements.phone.value = company.contactDetails?.phone || '';
        elements.address.value = company.contactDetails?.address || '';
        elements.subscriptionPlan.value = company.subscriptionPlan?.toLowerCase() || 'basic';
        elements.status.value = company.status || 'active';

    } catch (error) {
        console.error('Error populating form:', error);
        this.showError('Failed to populate form with company data');
    }
}

       async toggleCompanyStatus(companyId) {
    try {
        const company = this.companies.find(c => c._id === companyId);
        if (!company) {
            throw new Error('Company not found');
        }

        const newStatus = company.status === 'active' ? 'inactive' : 'active';
        
        // Show custom confirmation dialog
        const confirmed = await this.showCustomDialog({
            title: `${newStatus === 'active' ? 'Activate' : 'Deactivate'} Company`,
            message: `Are you sure you want to ${newStatus === 'active' ? 'activate' : 'deactivate'} ${company.name}?`,
            confirmText: newStatus === 'active' ? 'Yes, Activate' : 'Yes, Deactivate',
            cancelText: 'Cancel',
            type: newStatus === 'active' ? 'success' : 'warning'
        });

        if (!confirmed) return;

        // Disable the toggle button
        const toggleButton = document.querySelector(`button[data-action="toggle-status"][data-company-id="${companyId}"]`);
        if (toggleButton) {
            toggleButton.disabled = true;
            toggleButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
        }

        const result = await this.handleApiRequest(`/companies/${companyId}/toggle-status`, {
            method: 'PATCH'
        });

        if (result && result.success) {
            // Update local data
            company.status = newStatus;
            
            // Show success message
            this.showSuccess(`Company successfully ${newStatus === 'active' ? 'activated' : 'deactivated'}`);

            // Update UI without full reload
            const companyCard = document.querySelector(`.company-card[data-id="${companyId}"]`);
            if (companyCard) {
                const statusBadge = companyCard.querySelector('.status-badge');
                if (statusBadge) {
                    statusBadge.className = `status-badge ${newStatus}`;
                    statusBadge.textContent = newStatus.charAt(0).toUpperCase() + newStatus.slice(1);
                }
            }

            // If company details modal is open, refresh it
            if (this.currentCompanyId === companyId && 
                document.getElementById('companyDetailsModal').classList.contains('show')) {
                await this.viewCompanyDetails(companyId);
            }
        }
    } catch (error) {
        console.error('Error toggling company status:', error);
        this.showError(error.message || 'Failed to update company status');
    } finally {
        // Re-enable the toggle button
        const toggleButton = document.querySelector(`button[data-action="toggle-status"][data-company-id="${companyId}"]`);
        if (toggleButton) {
            toggleButton.disabled = false;
            toggleButton.innerHTML = '<i class="fas fa-power-off"></i>';
        }
    }
}


        async viewCompanyDetails(companyId) {
        try {
            const result = await this.handleApiRequest(`/companies/${companyId}`);
            
            if (!result || !result.data) {
                throw new Error('Failed to fetch company details');
            }

            this.currentCompanyId = companyId;
            this.currentCompany = result.data;

            // Show the modal with details
            const modalContent = `
                <div class="modal-content large">
                    <div class="modal-header">
                        <h2>Company Details</h2>
                        <button class="close-btn"><i class="fas fa-times"></i></button>
                    </div>
                    <div class="modal-body">
                        <div class="tabs">
                            <button class="tab-btn active" data-tab="details">Details</button>
                            <button class="tab-btn" data-tab="users">Users</button>
                            <button class="tab-btn" data-tab="subscription">Subscription</button>
                            <button class="tab-btn" data-tab="activity">Activity</button>
                        </div>
                        <div class="tab-content">
                            <!-- Content will be loaded dynamically -->
                        </div>
                    </div>
                </div>
            `;

            const modal = document.getElementById('companyDetailsModal');
            if (modal) {
                modal.innerHTML = modalContent;
                this.showModal('companyDetailsModal');

                // Initialize tabs
                const firstTab = modal.querySelector('.tab-btn');
                if (firstTab) {
                    this.activateTab(firstTab.dataset.tab);
                }

                // Add event listeners
                modal.querySelector('.close-btn').addEventListener('click', () => this.closeModals());
                modal.querySelectorAll('.tab-btn').forEach(btn => {
                    btn.addEventListener('click', (e) => {
                        this.activateTab(e.target.dataset.tab);
                    });
                });
            }
        } catch (error) {
            console.error('Error viewing company details:', error);
            this.showError('Failed to load company details');
        }
    }


            activateTab(tabName) {
    try {
        // Update tab buttons
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.tab === tabName);
        });

        // Store current tab
        this.currentTab = tabName;

        // Update tab content visibility
        document.querySelectorAll('.tab-content > div[data-tab]').forEach(content => {
            content.style.display = content.dataset.tab === tabName ? 'block' : 'none';
        });

        // Load tab content based on type
        switch(tabName) {
            case 'details':
                this.renderCompanyDetails(this.currentCompany);
                break;
            case 'users':
                this.renderUsersTab(this.currentCompany);
                break;
            case 'subscription':
                this.renderSubscriptionTab(this.currentCompany);
                break;
            case 'activity':
                this.renderActivityTab(this.currentCompany);
                break;
        }
    } catch (error) {
        console.error('Error switching tabs:', error);
        this.showError('Failed to switch tabs');
    }
}

        showCustomDialog({ title, message, confirmText = 'Confirm', cancelText = 'Cancel', type = 'confirm' }) {
    return new Promise((resolve) => {
        const dialog = document.createElement('div');
        dialog.className = 'custom-dialog-overlay';
        
        dialog.innerHTML = `
            <div class="custom-dialog ${type}">
                <div class="dialog-header">
                    <h3>${title}</h3>
                </div>
                <div class="dialog-content">
                    <p>${message}</p>
                </div>
                <div class="dialog-actions">
                    ${type === 'confirm' ? `
                        <button class="btn-secondary" id="dialogCancel">${cancelText}</button>
                        <button class="btn-primary" id="dialogConfirm">${confirmText}</button>
                    ` : `
                        <button class="btn-primary" id="dialogOk">OK</button>
                    `}
                </div>
            </div>
        `;

        document.body.appendChild(dialog);

        // Add animation class after a brief delay
        setTimeout(() => dialog.classList.add('show'), 10);

        const closeDialog = (result) => {
            dialog.classList.remove('show');
            setTimeout(() => {
                dialog.remove();
                resolve(result);
            }, 300);
        };

        dialog.querySelector('#dialogCancel')?.addEventListener('click', () => closeDialog(false));
        dialog.querySelector('#dialogConfirm')?.addEventListener('click', () => closeDialog(true));
        dialog.querySelector('#dialogOk')?.addEventListener('click', () => closeDialog(true));

        // Close on overlay click
        dialog.addEventListener('click', (e) => {
            if (e.target === dialog) {
                closeDialog(false);
            }
        });

        // Close on Escape key
        document.addEventListener('keydown', function handler(e) {
            if (e.key === 'Escape') {
                document.removeEventListener('keydown', handler);
                closeDialog(false);
            }
        });
    });
}

        renderCompanyDetails(company) {
            try {
                if (!company) {
                    throw new Error('No company data provided');
                }

                const subscription = company.subscription || {};
                const tabContent = document.querySelector('.tab-content');
                
                tabContent.innerHTML = `
                    <div class="company-details-view">
                        <div class="details-section">
                            <h3><i class="fas fa-building"></i> Company Information</h3>
                            <div class="info-grid">
                                <div class="info-item">
                                    <label>Company Name</label>
                                    <span>${this.escapeHtml(company.name || '')}</span>
                                </div>
                                <div class="info-item">
                                    <label>Industry</label>
                                    <span>${this.escapeHtml(company.industry || '')}</span>
                                </div>
                                <div class="info-item">
                                    <label>Company Size</label>
                                    <span>${company.companySize || 0} employees</span>
                                </div>
                                <div class="info-item">
                                    <label>Status</label>
                                    <span class="status-badge ${company.status || 'inactive'}">
                                        ${(company.status || 'Inactive').toUpperCase()}
                                    </span>
                                </div>
                                <div class="info-item">
                                    <label>Total Users</label>
                                    <span>${company.usersCount || 0}</span>
                                </div>
                            </div>
                        </div>

                        <div class="details-section">
                            <h3><i class="fas fa-address-card"></i> Contact Information</h3>
                            <div class="info-grid">
                                <div class="info-item">
                                    <label>Email</label>
                                    <span>${this.escapeHtml(company.contactDetails?.email || '')}</span>
                                </div>
                                <div class="info-item">
                                    <label>Phone</label>
                                    <span>${this.escapeHtml(company.contactDetails?.phone || '')}</span>
                                </div>
                                <div class="info-item">
                                    <label>Address</label>
                                    <span>${this.escapeHtml(company.contactDetails?.address || '')}</span>
                                </div>
                            </div>
                        </div>

                        <div class="details-section">
                            <h3><i class="fas fa-credit-card"></i> Subscription Details</h3>
                            <div class="info-grid">
                                <div class="info-item">
                                    <label>Current Plan</label>
                                    <span class="plan-badge ${subscription.plan || 'basic'}">
                                        ${(subscription.plan || 'Basic').toUpperCase()}
                                    </span>
                                </div>
                                <div class="info-item">
                                    <label>Status</label>
                                    <span class="status-badge ${subscription.status || 'inactive'}">
                                        ${(subscription.status || 'Inactive').toUpperCase()}
                                    </span>
                                </div>
                                <div class="info-item">
                                    <label>Start Date</label>
                                    <span>${subscription.startDate ? new Date(subscription.startDate).toLocaleDateString() : 'N/A'}</span>
                                </div>
                                <div class="info-item">
                                    <label>Next Billing</label>
                                    <span>${subscription.endDate ? new Date(subscription.endDate).toLocaleDateString() : 'N/A'}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                `;
            } catch (error) {
                console.error('Error rendering company details:', error);
                const tabContent = document.querySelector('.tab-content');
                tabContent.innerHTML = `
                    <div class="error-state">
                        <i class="fas fa-exclamation-circle"></i>
                        <p>Failed to display company details: ${error.message}</p>
                    </div>
                `;
            }
        }

        async renderSubscriptionTab(company) {
            try {
                const subscription = company.subscription || {};
                const tabContent = document.querySelector('.tab-content');
                
                tabContent.innerHTML = `
                    <div class="subscription-details">
                        <div class="current-plan">
                            <h4>Current Subscription</h4>
                            <div class="plan-info">
                                <div class="info-group">
                                    <label>Plan Type:</label>
                                    <span class="plan-badge ${subscription.plan || 'basic'}">
                                        ${(subscription.plan || 'Basic').toUpperCase()}
                                    </span>
                                </div>
                                <div class="info-group">
                                    <label>Status:</label>
                                    <span class="status-badge ${subscription.status || 'inactive'}">
                                        ${(subscription.status || 'Inactive').toUpperCase()}
                                    </span>
                                </div>
                                <div class="info-group">
                                    <label>Billing Cycle:</label>
                                    <span>${subscription.billingCycle || 'Monthly'}</span>
                                </div>
                                <div class="info-group">
                                    <label>Next Billing Date:</label>
                                    <span>${subscription.nextBillingDate ? new Date(subscription.nextBillingDate).toLocaleDateString() : 'N/A'}</span>
                                </div>
                            </div>
                        </div>

                        <div class="subscription-actions">
                            <button class="btn-primary" data-action="changePlan">
                                <i class="fas fa-exchange-alt"></i> Change Plan
                            </button>
                            <button class="btn-secondary" data-action="generateInvoice">
                                <i class="fas fa-file-invoice"></i> Generate Invoice
                            </button>
                        </div>

                        <div class="billing-history">
                            <h4>Billing History</h4>
                            ${await this.renderBillingHistory(company._id)}
                        </div>
                    </div>
                `;

                const actionsContainer = tabContent.querySelector('.subscription-actions');
                if (actionsContainer) {
                    actionsContainer.addEventListener('click', (e) => {
                        const button = e.target.closest('button[data-action]');
                        if (!button) return;

                        const action = button.dataset.action;
                        if (action === 'changePlan') {
                            this.showChangePlanModal(this.currentCompanyId);
                        } else if (action === 'generateInvoice') {
                            this.generateInvoice(this.currentCompanyId);
                        }
                    });
                }
            } catch (error) {
                console.error('Error rendering subscription tab:', error);
                this.showError('Failed to load subscription information');
            }
        }

        async showChangePlanModal(companyId) {
    try {
        const subscription = this.currentCompany.subscription || {};
        
        const modalHtml = `
            <div class="modal-content">
                <div class="modal-header">
                    <h2>Change Subscription Plan</h2>
                    <button class="close-btn"><i class="fas fa-times"></i></button>
                </div>
                <div class="modal-body">
                    <div class="current-plan-info">
                        <label>Current Plan:</label>
                        <span class="plan-badge ${subscription.plan || 'basic'}">
                            ${(subscription.plan || 'Basic').toUpperCase()}
                        </span>
                    </div>
                    <form id="changePlanForm">
                        <div class="form-group">
                            <label for="newPlan">Select New Plan</label>
                            <select id="newPlan" required>
                                <option value="basic">Basic Plan ($${this.subscriptionPlans.basic.price}/month)</option>
                                <option value="premium">Premium Plan ($${this.subscriptionPlans.premium.price}/month)</option>
                                <option value="enterprise">Enterprise Plan ($${this.subscriptionPlans.enterprise.price}/month)</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label for="billingCycle">Billing Cycle</label>
                            <select id="billingCycle" required>
                                <option value="monthly">Monthly</option>
                                <option value="annual">Annual (10% discount)</option>
                            </select>
                        </div>
                        <div id="planSummary" class="plan-summary">
                            <!-- Will be populated dynamically -->
                        </div>
                    </form>
                </div>
                <div class="modal-footer">
                    <button class="btn-secondary" id="cancelPlanChange">Cancel</button>
                    <button class="btn-primary" id="confirmPlanChange">Confirm Change</button>
                </div>
            </div>
        `;

        const modal = document.getElementById('changePlanModal');
        if (!modal) {
            throw new Error('Change plan modal not found');
        }

        modal.innerHTML = modalHtml;
        this.showModal('changePlanModal');
        
        // Set initial values
        document.getElementById('newPlan').value = subscription.plan || 'basic';
        document.getElementById('billingCycle').value = subscription.billingCycle || 'monthly';

        // Initialize event listeners
        document.getElementById('newPlan').addEventListener('change', () => this.updatePlanSummary());
        document.getElementById('billingCycle').addEventListener('change', () => this.updatePlanSummary());
        document.getElementById('cancelPlanChange').addEventListener('click', () => this.closeModals());
        document.getElementById('confirmPlanChange').addEventListener('click', () => this.handlePlanChange(companyId));
        document.querySelector('#changePlanModal .close-btn').addEventListener('click', () => this.closeModals());

        // Update initial summary
        this.updatePlanSummary();

    } catch (error) {
        console.error('Error showing plan change modal:', error);
        this.showError('Failed to load plan change options');
    }
}
        validatePlanChange(planData) {
        if (!planData.plan) {
            this.showError('Please select a plan');
            return false;
        }

        if (!planData.billingCycle) {
            this.showError('Please select a billing cycle');
            return false;
        }

        if (!this.subscriptionPlans[planData.plan.toLowerCase()]) {
            this.showError('Invalid plan selected');
            return false;
        }

        return true;
    }

        async handlePlanChange(companyId) {
        try {
            const planData = {
                plan: document.getElementById('newPlan').value,
                billingCycle: document.getElementById('billingCycle').value
            };

            if (!this.validatePlanChange(planData)) {
                return;
            }

            const confirmBtn = document.getElementById('confirmPlanChange');
            if (confirmBtn) {
                confirmBtn.disabled = true;
                confirmBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Updating...';
            }

            const result = await this.handleApiRequest(`/companies/${companyId}/subscription`, {
                method: 'POST',
                body: JSON.stringify(planData)
            });

            if (result) {
                this.showSuccess('Subscription updated successfully');
                this.closeModals();
                await this.viewCompanyDetails(companyId);
            }
        } catch (error) {
            console.error('Error changing subscription plan:', error);
            this.showError(error.message || 'Failed to update subscription');
        } finally {
            const confirmBtn = document.getElementById('confirmPlanChange');
            if (confirmBtn) {
                confirmBtn.disabled = false;
                confirmBtn.innerHTML = 'Confirm Change';
            }
        }
    }
        

            async renderActivityTab(company) {
    try {
        const result = await this.handleApiRequest(`/companies/${company._id}/activity-logs`);
        const logs = result?.data || [];
        const tabContent = document.querySelector('.tab-content');

        tabContent.innerHTML = `
            <div class="activity-logs">
                <div class="activity-filters">
                    <select id="activityTypeFilter">
                        <option value="">All Activities</option>
                        <option value="COMPANY_UPDATED">Company Updates</option>
                        <option value="COMPANY_STATUS_CHANGED">Status Changes</option>
                        <option value="USER_CREATED">User Created</option>
                        <option value="USER_UPDATED">User Updated</option>
                        <option value="USER_STATUS_CHANGED">User Status Changes</option>
                        <option value="SUBSCRIPTION_CHANGED">Subscription Changes</option>
                    </select>
                    <input type="date" id="activityDateFilter">
                </div>
                ${logs.length === 0 ? `
                    <div class="empty-state">
                        <i class="fas fa-history"></i>
                        <p>No activity logs found</p>
                    </div>
                ` : `
                    <div class="activity-list">
                        ${logs.map(log => this.renderActivityLogItem(log)).join('')}
                    </div>
                `}
            </div>
        `;

        this.initializeActivityFilters();

    } catch (error) {
        console.error('Error loading activity logs:', error);
        const tabContent = document.querySelector('.tab-content');
        tabContent.innerHTML = `
            <div class="error-state">
                <i class="fas fa-exclamation-circle"></i>
                <p>Failed to load activity logs</p>
            </div>
        `;
    }
}

        renderActivityLogItem(log) {
    const icon = this.getActivityIcon(log.type);
    const timestamp = new Date(log.timestamp).toLocaleString();
    const description = this.formatActivityDescription(log);

    return `
        <div class="activity-item ${log.type.toLowerCase()}">
            <div class="activity-icon">
                <i class="fas ${icon}"></i>
            </div>
            <div class="activity-details">
                <div class="activity-header">
                    <span class="activity-type">${this.formatActivityType(log.type)}</span>
                    <span class="activity-date">${timestamp}</span>
                </div>
                <p class="activity-description">${description}</p>
                ${log.details ? `
                    <button class="btn-link" onclick="window.companiesManager.toggleActivityDetails(this)">
                        Show Details
                    </button>
                    <div class="activity-details-expanded hidden">
                        <pre>${this.escapeHtml(JSON.stringify(log.details, null, 2))}</pre>
                    </div>
                ` : ''}
            </div>
        </div>
    `;
}

        formatActivityType(type) {
    return type.split('_').map(word => 
        word.charAt(0) + word.slice(1).toLowerCase()
    ).join(' ');
}
        formatActivityDescription(log) {
    switch (log.type) {
        case 'COMPANY_UPDATED':
            return `Company information was updated`;
        case 'COMPANY_STATUS_CHANGED':
            return `Company status was changed from ${log.details?.oldStatus || 'unknown'} to ${log.details?.newStatus || 'unknown'}`;
        case 'USER_CREATED':
            return `New user "${log.details?.userName || 'Unknown'}" was added`;
        case 'USER_UPDATED':
            return `User "${log.details?.userName || 'Unknown'}" information was updated`;
        case 'USER_STATUS_CHANGED':
            return `User "${log.details?.userName || 'Unknown'}" status was changed to ${log.details?.newStatus || 'unknown'}`;
        case 'SUBSCRIPTION_CHANGED':
            return `Subscription plan was changed from ${log.details?.oldPlan || 'unknown'} to ${log.details?.newPlan || 'unknown'}`;
        default:
            return log.description || 'Activity logged';
    }
}


        initializeActivityFilters() {
    const typeFilter = document.getElementById('activityTypeFilter');
    const dateFilter = document.getElementById('activityDateFilter');

    if (typeFilter) {
        typeFilter.addEventListener('change', () => this.filterActivityLogs());
    }

    if (dateFilter) {
        dateFilter.addEventListener('change', () => this.filterActivityLogs());
    }
}

filterActivityLogs() {
    const type = document.getElementById('activityTypeFilter').value;
    const date = document.getElementById('activityDateFilter').value;
    
    const items = document.querySelectorAll('.activity-item');
    items.forEach(item => {
        const activityType = item.querySelector('.activity-type').textContent.toLowerCase();
        const activityDate = new Date(item.querySelector('.activity-date').textContent).toLocaleDateString();
        
        const matchesType = !type || activityType.includes(type.toLowerCase());
        const matchesDate = !date || activityDate === new Date(date).toLocaleDateString();
        
        item.style.display = matchesType && matchesDate ? '' : 'none';
    });
}

        getActivityIcon(type) {
    const icons = {
        'COMPANY_UPDATED': 'fa-building',
        'COMPANY_STATUS_CHANGED': 'fa-toggle-on',
        'USER_CREATED': 'fa-user-plus',
        'USER_UPDATED': 'fa-user-edit',
        'USER_STATUS_CHANGED': 'fa-user-clock',
        'SUBSCRIPTION_CHANGED': 'fa-sync',
        'PASSWORD_RESET': 'fa-key',
        'LOGIN': 'fa-sign-in-alt',
        'LOGOUT': 'fa-sign-out-alt'
    };
    return icons[type] || 'fa-info-circle';
}
        
toggleActivityDetails(button) {
    const detailsDiv = button.nextElementSibling;
    const isHidden = detailsDiv.classList.contains('hidden');
    
    detailsDiv.classList.toggle('hidden');
    button.textContent = isHidden ? 'Hide Details' : 'Show Details';
}


        async renderBillingHistory(companyId) {
    try {
        const result = await this.handleApiRequest(`/companies/${companyId}/billing-history`);
        const history = result?.data || [];
        
        if (!history.length) {
            return `
                <div class="empty-state">
                    <i class="fas fa-history"></i>
                    <p>No billing history available</p>
                </div>
            `;
        }

        return `
            <div class="billing-table-container">
                <table class="billing-table">
                    <thead>
                        <tr>
                            <th>Invoice #</th>
                            <th>Date</th>
                            <th>Amount</th>
                            <th>Status</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${history.map(invoice => `
                            <tr>
                                <td>${invoice.invoiceNumber}</td>
                                <td>${new Date(invoice.date).toLocaleDateString()}</td>
                                <td>$${(invoice.amount || 0).toFixed(2)}</td>
                                <td>
                                    <span class="status-badge ${invoice.status || 'pending'}">
                                        ${(invoice.status || 'PENDING').toUpperCase()}
                                    </span>
                                </td>
                                <td>
                                    <button class="btn-icon" onclick="window.companiesManager.downloadInvoice('${invoice.invoiceNumber}')">
                                        <i class="fas fa-download"></i>
                                    </button>
                                </td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        `;
    } catch (error) {
        console.error('Error loading billing history:', error);
        return `
            <div class="error-state">
                <i class="fas fa-exclamation-circle"></i>
                <p>Failed to load billing history</p>
            </div>
        `;
    }
}

        async generateInvoice(companyId) {
            try {
                const result = await this.handleApiRequest(`/companies/${companyId}/generate-invoice`, {
                    method: 'POST'
                });

                if (result) {
                    this.showSuccess('Invoice generated successfully');
                    
                    if (this.currentCompany) {
                        await this.renderSubscriptionTab(this.currentCompany);
                    }

                    if (result.data?.invoiceNumber) {
                        const downloadConfirmed = await this.showConfirmDialog(
                            'Would you like to download the invoice?'
                        );
                        if (downloadConfirmed) {
                            await this.downloadInvoice(result.data.invoiceNumber);
                        }
                    }
                }
            } catch (error) {
                console.error('Error generating invoice:', error);
                this.showError(error.message || 'Failed to generate invoice');
            }
        }

        async downloadInvoice(invoiceNumber) {
            try {
                const response = await fetch(`${this.baseUrl}/invoices/${invoiceNumber}/download`, {
                    headers: this.getHeaders()
                });

                if (!response.ok) {
                    throw new Error('Failed to download invoice');
                }

                const blob = await response.blob();
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `invoice-${invoiceNumber}.pdf`;
                document.body.appendChild(a);
                a.click();
                window.URL.revokeObjectURL(url);
                a.remove();
            } catch (error) {
                console.error('Error downloading invoice:', error);
                this.showError('Failed to download invoice');
            }
        }
        // Add these methods in the CompaniesManager class

showLoading() {
    const loader = document.createElement('div');
    loader.className = 'content-loader';
    loader.innerHTML = `
        <div class="loader-spinner">
            <i class="fas fa-spinner fa-spin"></i>
        </div>
        <p>Loading content...</p>
    `;
    
    const container = document.querySelector('.companies-grid');
    if (container) {
        container.innerHTML = '';
        container.appendChild(loader);
    }

    // Add loading styles if not already present
    if (!document.querySelector('#loading-styles')) {
        const styles = document.createElement('style');
        styles.id = 'loading-styles';
        styles.textContent = `
            .content-loader {
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                padding: 2rem;
                text-align: center;
                background-color: var(--bg-primary);
                border-radius: var(--border-radius-lg);
                box-shadow: var(--shadow-sm);
            }

            .loader-spinner {
                font-size: 2rem;
                color: var(--primary-color);
                margin-bottom: 1rem;
            }

            .loader-spinner i {
                animation: spin 1s linear infinite;
            }

            @keyframes spin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
            }

            .content-loader p {
                color: var(--text-secondary);
                margin: 0;
            }
        `;
        document.head.appendChild(styles);
    }
}

hideLoading() {
    const loader = document.querySelector('.content-loader');
    if (loader) {
        loader.remove();
    }
}

// Also add a method to show loading state in any container
showLoadingIn(container) {
    if (!container) return;
    
    const loader = document.createElement('div');
    loader.className = 'content-loader';
    loader.innerHTML = `
        <div class="loader-spinner">
            <i class="fas fa-spinner fa-spin"></i>
        </div>
        <p>Loading content...</p>
    `;
    
    container.innerHTML = '';
    container.appendChild(loader);
}

// And a method to handle global loading state
toggleGlobalLoading(show) {
    let globalLoader = document.getElementById('global-loader');
    
    if (show && !globalLoader) {
        globalLoader = document.createElement('div');
        globalLoader.id = 'global-loader';
        globalLoader.className = 'global-loader';
        globalLoader.innerHTML = `
            <div class="loader-content">
                <div class="loader-spinner">
                    <i class="fas fa-spinner fa-spin"></i>
                </div>
                <p>Loading...</p>
            </div>
        `;
        
        // Add global loader styles
        if (!document.querySelector('#global-loader-styles')) {
            const styles = document.createElement('style');
            styles.id = 'global-loader-styles';
            styles.textContent = `
                .global-loader {
                    position: fixed;
                    top: 0;
                    left: 0;
                    width: 100%;
                    height: 100%;
                    background-color: rgba(0, 0, 0, 0.5);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    z-index: 9999;
                    backdrop-filter: blur(4px);
                }

                .loader-content {
                    background-color: var(--bg-primary);
                    padding: 2rem;
                    border-radius: var(--border-radius-lg);
                    box-shadow: var(--shadow-lg);
                    text-align: center;
                }

                .global-loader .loader-spinner {
                    font-size: 2.5rem;
                    color: var(--primary-color);
                    margin-bottom: 1rem;
                }

                .global-loader p {
                    color: var(--text-primary);
                    margin: 0;
                    font-weight: 500;
                }
            `;
            document.head.appendChild(styles);
        }
        
        document.body.appendChild(globalLoader);
    } else if (!show && globalLoader) {
        globalLoader.remove();
    }
}

            async renderUsersTab(company) {
            try {
                const users = await this.loadCompanyUsers(company._id);
                const tabContent = document.querySelector('.tab-content');
                
                tabContent.innerHTML = `
                    <div class="users-management">
                        <div class="users-header">
                            <div class="search-filters">
                                <div class="search-box">
                                    <i class="fas fa-search"></i>
                                    <input type="text" id="userSearch" placeholder="Search by name or email...">
                                </div>
                                <div class="filter-group">
                                    <select id="roleFilter">
                                        <option value="">All Roles</option>
                                        <option value="admin">Admin</option>
                                        <option value="manager">Manager</option>
                                        <option value="employee">Employee</option>
                                    </select>
                                    <select id="userStatusFilter">
                                        <option value="">All Status</option>
                                        <option value="active">Active</option>
                                        <option value="inactive">Inactive</option>
                                    </select>
                                </div>
                            </div>
                            <button class="btn-primary" id="addUserBtn">
                                <i class="fas fa-user-plus"></i> Add User
                            </button>
                        </div>
                        <div class="users-table-wrapper">
                            ${this.renderUsersTable(users)}
                        </div>
                    </div>
                `;

                this.initializeUserFilters();
                this.initializeUserEventListeners();
            } catch (error) {
                console.error('Error rendering users tab:', error);
                this.showError('Failed to load users information');
            }
        }

       initializeUserFilters() {
    const searchInput = document.getElementById('userSearch');
    const roleFilter = document.getElementById('roleFilter');
    const statusFilter = document.getElementById('userStatusFilter');

    // Store current filter values
    this.userFilters = {
        search: '',
        role: '',
        status: ''
    };

    if (searchInput) {
        searchInput.addEventListener('input', this.debounce((e) => {
            this.userFilters.search = e.target.value;
            this.applyUserFilters();
        }, 300));
    }

    if (roleFilter) {
        roleFilter.addEventListener('change', (e) => {
            this.userFilters.role = e.target.value;
            this.applyUserFilters();
        });
    }

    if (statusFilter) {
        statusFilter.addEventListener('change', (e) => {
            this.userFilters.status = e.target.value;
            this.applyUserFilters();
        });
    }
}

applyUserFilters() {
    const rows = document.querySelectorAll('.users-table tbody tr');
    const { search, role, status } = this.userFilters;

    rows.forEach(row => {
        const userName = row.querySelector('.user-name')?.textContent.toLowerCase() || '';
        const userEmail = row.querySelector('.user-email')?.textContent.toLowerCase() || '';
        const userRole = row.querySelector('.role-badge')?.textContent.toLowerCase() || '';
        const userStatus = row.querySelector('.status-badge')?.textContent.toLowerCase() || '';

        const matchesSearch = !search || 
            userName.includes(search.toLowerCase()) || 
            userEmail.includes(search.toLowerCase());
            
        const matchesRole = !role || userRole.includes(role.toLowerCase());
        const matchesStatus = !status || userStatus.includes(status.toLowerCase());

        row.style.display = matchesSearch && matchesRole && matchesStatus ? '' : 'none';

        // Add visual feedback for filtered rows
        row.classList.toggle('filtered-out', !(matchesSearch && matchesRole && matchesStatus));
    });

    // Update UI to show filter status
    this.updateFilterStatus();
}


filterUsers(search = '', role = '', status = '') {
    const rows = document.querySelectorAll('.users-table tbody tr');
    
    rows.forEach(row => {
        const userName = row.querySelector('.user-name')?.textContent.toLowerCase() || '';
        const userEmail = row.querySelector('.user-email')?.textContent.toLowerCase() || '';
        const userRole = row.querySelector('.role-badge')?.textContent.toLowerCase() || '';
        const userStatus = row.querySelector('.status-badge')?.textContent.toLowerCase() || '';

        const searchTerm = search.toLowerCase();
        const matchesSearch = !searchTerm || 
            userName.includes(searchTerm) || 
            userEmail.includes(searchTerm);
        const matchesRole = !role || userRole === role.toLowerCase();
        const matchesStatus = !status || userStatus.includes(status.toLowerCase());

        row.style.display = matchesSearch && matchesRole && matchesStatus ? '' : 'none';
    });
}

 initializeUserEventListeners() {
    // Add User button
    const addUserBtn = document.getElementById('addUserBtn');
    if (addUserBtn) {
        addUserBtn.addEventListener('click', () => {
            this.showAddUserModal();
        });
    }

    // Reset Password buttons
    document.querySelectorAll('.btn-icon.reset-password').forEach(button => {
        button.addEventListener('click', async (e) => {
            const userId = e.currentTarget.dataset.userId;
            if (await this.showConfirmDialog('Are you sure you want to reset this user\'s password?')) {
                await this.resetUserPassword(userId);
            }
        });
    });

    // Toggle Status buttons
    document.querySelectorAll('.btn-icon.toggle-status').forEach(button => {
        button.addEventListener('click', async (e) => {
            const userId = e.currentTarget.dataset.userId;
            const userName = e.currentTarget.closest('tr').querySelector('.user-name').textContent;
            if (await this.showConfirmDialog(`Are you sure you want to toggle the status for ${userName}?`)) {
                await this.toggleUserStatus(userId);
            }
        });
    });

    // Export Users button (if exists)
    const exportBtn = document.getElementById('exportUsersBtn');
    if (exportBtn) {
        exportBtn.addEventListener('click', () => {
            this.exportUsers();
        });
    }
}

        async exportUsers() {
    try {
        const users = await this.loadCompanyUsers(this.currentCompanyId);
        if (!users.length) {
            this.showError('No users to export');
            return;
        }

        // Create CSV content
        const headers = ['Name', 'Email', 'Role', 'Department', 'Status', 'Last Login'];
        const csvContent = [
            headers.join(','),
            ...users.map(user => [
                `"${user.name}"`,
                `"${user.email}"`,
                `"${user.role}"`,
                `"${user.department || ''}"`,
                `"${user.status}"`,
                `"${user.lastLogin ? new Date(user.lastLogin).toLocaleDateString() : 'Never'}"`
            ].join(','))
        ].join('\n');

        // Create and trigger download
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.setAttribute('download', `users_${new Date().toISOString().split('T')[0]}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        this.showSuccess('Users exported successfully');
    } catch (error) {
        console.error('Error exporting users:', error);
        this.showError('Failed to export users');
    }
}

        showUserActionMenu(userId) {
    const menu = document.createElement('div');
    menu.className = 'user-action-menu';
    menu.innerHTML = `
        <div class="menu-item" data-action="edit">
            <i class="fas fa-edit"></i> Edit User
        </div>
        <div class="menu-item" data-action="reset-password">
            <i class="fas fa-key"></i> Reset Password
        </div>
        <div class="menu-item" data-action="toggle-status">
            <i class="fas fa-power-off"></i> Toggle Status
        </div>
        <div class="menu-item danger" data-action="delete">
            <i class="fas fa-trash"></i> Delete User
        </div>
    `;

    // Position the menu
    const button = document.querySelector(`[data-user-id="${userId}"]`);
    const rect = button.getBoundingClientRect();
    menu.style.position = 'absolute';
    menu.style.top = `${rect.bottom + window.scrollY}px`;
    menu.style.left = `${rect.left + window.scrollX}px`;

    // Add event listeners
    menu.addEventListener('click', async (e) => {
        const action = e.target.closest('.menu-item')?.dataset.action;
        if (!action) return;

        menu.remove();
        
        switch (action) {
            case 'edit':
                await this.editUser(userId);
                break;
            case 'reset-password':
                if (await this.showConfirmDialog('Are you sure you want to reset the password?')) {
                    await this.resetUserPassword(userId);
                }
                break;
            case 'toggle-status':
                if (await this.showConfirmDialog('Are you sure you want to toggle the user status?')) {
                    await this.toggleUserStatus(userId);
                }
                break;
            case 'delete':
                if (await this.showConfirmDialog('Are you sure you want to delete this user?')) {
                    await this.deleteUser(userId);
                }
                break;
        }
    });

    // Close menu when clicking outside
    const closeMenu = (e) => {
        if (!menu.contains(e.target)) {
            menu.remove();
            document.removeEventListener('click', closeMenu);
        }
    };
    document.addEventListener('click', closeMenu);

    document.body.appendChild(menu);
}

       


        renderUsersTable(users) {
            if (!users.length) {
                return `
                    <div class="empty-state">
                        <i class="fas fa-users"></i>
                        <h3>No Users Found</h3>
                        <p>There are no users in this company yet.</p>
                    </div>
                `;
            }

            return `
                <table class="users-table">
                    <thead>
                        <tr>
                            <th>User</th>
                            <th>Role</th>
                            <th>Department</th>
                            <th>Status</th>
                            <th>Last Login</th>
                            <th class="actions-column">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${users.map(user => `
                            <tr>
                                <td>
                                    <div class="user-cell">
                                        <div class="user-avatar" style="background-color: ${this.getAvatarColor(user.name)}">
                                            ${this.getInitials(user.name)}
                                        </div>
                                        <div class="user-info">
                                            <span class="user-name">${this.escapeHtml(user.name)}</span>
                                            <span class="user-email">${this.escapeHtml(user.email)}</span>
                                        </div>
                                    </div>
                                </td>
                                <td>
                                    <span class="role-badge ${user.role.toLowerCase()}">
                                        ${user.role}
                                    </span>
                                </td>
                                <td>${this.escapeHtml(user.department || '-')}</td>
                                <td>
                                    <span class="status-badge ${user.status}">
                                        ${user.status.toUpperCase()}
                                    </span>
                                </td>
                                <td>${user.lastLogin ? new Date(user.lastLogin).toLocaleDateString() : 'Never'}</td>
                                <td class="actions-column">
                                    <div class="action-buttons">
                                        <button class="btn-icon reset-password" data-user-id="${user._id}" title="Reset Password">
                                            <i class="fas fa-key"></i>
                                        </button>
                                        <button class="btn-icon toggle-status" data-user-id="${user._id}" title="Toggle Status">
                                            <i class="fas fa-power-off"></i>
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            `;
        }

        async loadCompanyUsers(companyId) {
            try {
                const result = await this.handleApiRequest(`/companies/${companyId}/users`);
                return result?.data || [];
            } catch (error) {
                console.error('Error loading company users:', error);
                this.showError('Failed to load company users');
                return [];
            }
        }

        showAddUserModal() {
            const modalHtml = `
                <div class="modal-content">
                    <div class="modal-header">
                        <h2>Add New User</h2>
                        <button class="close-btn"><i class="fas fa-times"></i></button>
                    </div>
                    <div class="modal-body">
                        <form id="addUserForm">
                            <div class="form-group">
                                <label for="userName">Full Name*</label>
                                <input type="text" id="userName" required>
                            </div>
                            <div class="form-group">
                                <label for="userEmail">Email*</label>
                                <input type="email" id="userEmail" required>
                            </div>
                            <div class="form-group">
                                <label for="userRole">Role*</label>
                                <select id="userRole" required>
                                    <option value="">Select Role</option>
                                    <option value="admin">Admin</option>
                                    <option value="manager">Manager</option>
                                    <option value="employee">Employee</option>
                                </select>
                            </div>
                            <div class="form-group">
                                <label for="userDepartment">Department</label>
                                <input type="text" id="userDepartment">
                            </div>
                        </form>
                    </div>
                    <div class="modal-footer">
                        <button class="btn-secondary" id="cancelAddUser">Cancel</button>
                        <button class="btn-primary" id="confirmAddUser">Add User</button>
                    </div>
                </div>
            `;

            const modal = document.getElementById('addUserModal');
            if (modal) {
                modal.innerHTML = modalHtml;
                this.showModal('addUserModal');

                // Add event listeners
                modal.querySelector('.close-btn').addEventListener('click', () => this.closeModals());
                modal.querySelector('#cancelAddUser').addEventListener('click', () => this.closeModals());
                modal.querySelector('#confirmAddUser').addEventListener('click', () => this.handleAddUser());
            }
        }

            async handleAddUser() {
            try {
                const userData = {
                    name: document.getElementById('userName').value.trim(),
                    email: document.getElementById('userEmail').value.trim(),
                    role: document.getElementById('userRole').value,
                    department: document.getElementById('userDepartment').value.trim() || null
                };

                if (!this.validateUserData(userData)) {
                    return;
                }

                const result = await this.handleApiRequest(`/companies/${this.currentCompanyId}/users`, {
                    method: 'POST',
                    body: JSON.stringify(userData)
                });

                if (result) {
                    this.showSuccess('User added successfully');
                    
                    if (result.data?.tempPassword) {
                        await this.showTempPasswordModal(userData.email, result.data.tempPassword);
                    }

                    this.closeModals();
                    await this.renderUsersTab({ _id: this.currentCompanyId });
                }
            } catch (error) {
                console.error('Error adding user:', error);
                this.showError(error.message || 'Failed to add user');
            }
        }

        validateUserData(userData) {
            if (!userData.name) {
                this.showError('Name is required');
                return false;
            }

            if (!userData.email || !userData.email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
                this.showError('Valid email is required');
                return false;
            }

            if (!userData.role) {
                this.showError('Role is required');
                return false;
            }

            return true;
        }

      async resetUserPassword(userId) {
    try {
        if (!this.currentCompanyId || !userId) {
            throw new Error('Missing required information');
        }

        // Get user info for confirmation dialog
        const userRow = document.querySelector(`button[data-user-id="${userId}"]`)?.closest('tr');
        const userName = userRow?.querySelector('.user-name')?.textContent || 'this user';

        // Show custom confirmation dialog
        const confirmed = await this.showCustomDialog({
            title: 'Reset User Password',
            message: `Are you sure you want to reset the password for ${userName}? A new temporary password will be generated.`,
            confirmText: 'Yes, Reset Password',
            cancelText: 'Cancel',
            type: 'warning'
        });

        if (!confirmed) return;

        // Disable the reset button
        const resetButton = document.querySelector(`button[data-action="reset-password"][data-user-id="${userId}"]`);
        if (resetButton) {
            resetButton.disabled = true;
            resetButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
        }

        const result = await this.handleApiRequest(
            `/companies/${this.currentCompanyId}/users/${userId}/reset-password`,
            {
                method: 'POST',
                body: JSON.stringify({})
            }
        );

        if (result && result.success) {
            // Show success message
            this.showSuccess('Password reset successfully');

            // Show temporary password modal if provided
            if (result.data?.tempPassword) {
                await this.showTempPasswordModal(result.data.email, result.data.tempPassword);
            }
        }
    } catch (error) {
        console.error('Error resetting password:', error);
        this.showError(error.message || 'Failed to reset password');
    } finally {
        // Re-enable the reset button
        const resetButton = document.querySelector(`button[data-action="reset-password"][data-user-id="${userId}"]`);
        if (resetButton) {
            resetButton.disabled = false;
            resetButton.innerHTML = '<i class="fas fa-key"></i>';
        }
    }
}

async handleUserAction(action, userId) {
    try {
        switch (action) {
            case 'edit':
                await this.editUser(userId);
                break;
            case 'reset-password':
                await this.resetUserPassword(userId);
                break;
            case 'toggle-status':
                await this.toggleUserStatus(userId);
                break;
            case 'delete':
                await this.deleteUser(userId);
                break;
            default:
                throw new Error('Invalid action');
        }
    } catch (error) {
        console.error(`Error performing user action ${action}:`, error);
        this.showError(error.message || `Failed to perform ${action}`);
    }
}
        

        async toggleUserStatus(userId) {
            try {
                const result = await this.handleApiRequest(
                    `/companies/${this.currentCompanyId}/users/${userId}/toggle-status`,
                    { method: 'PATCH' }
                );

                if (result) {
                    this.showSuccess('User status updated successfully');
                    await this.renderUsersTab({ _id: this.currentCompanyId });
                }
            } catch (error) {
                console.error('Error toggling user status:', error);
                this.showError('Failed to update user status');
            }
        }

        // Utility Methods
        showModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        // Add to modal stack
        modal.classList.add('modal-stack');
        modal.style.display = 'flex';
        setTimeout(() => modal.classList.add('show'), 10);
        document.body.style.overflow = 'hidden';
    }
}

closeModals(specificModalId = null) {
    const modals = specificModalId 
        ? [document.getElementById(specificModalId)]
        : document.querySelectorAll('.modal');

    modals.forEach(modal => {
        if (modal) {
            modal.classList.remove('show');
            setTimeout(() => {
                modal.style.display = 'none';
                modal.classList.remove('modal-stack');
            }, 300);
        }
    });

    // Only restore scroll if closing all modals or closing the last modal
    if (!specificModalId || document.querySelectorAll('.modal.show').length === 0) {
        document.body.style.overflow = '';
    }
}
        showTempPasswordModal(email, password) {
    return new Promise((resolve) => {
        const modalHtml = `
            <div class="modal-content">
                <div class="modal-header">
                    <h2><i class="fas fa-key"></i> Temporary Password</h2>
                    <button class="close-btn"><i class="fas fa-times"></i></button>
                </div>
                <div class="modal-body">
                    <div class="alert alert-warning">
                        <i class="fas fa-exclamation-triangle"></i>
                        <p>Please securely share these credentials with the user.</p>
                    </div>
                    <div class="credentials-box">
                        <div class="credential-item">
                            <label>Email:</label>
                            <span class="credential-value">${this.escapeHtml(email)}</span>
                        </div>
                        <div class="credential-item">
                            <label>Temporary Password:</label>
                            <div class="password-container">
                                <span class="password" id="tempPassword">${this.escapeHtml(password)}</span>
                                <button class="btn-icon copy-btn" onclick="navigator.clipboard.writeText('${password}')">
                                    <i class="fas fa-copy"></i>
                                </button>
                            </div>
                        </div>
                    </div>
                    <div class="warning-message">
                        <i class="fas fa-info-circle"></i>
                        <p>This password will only be shown once. Make sure to copy it now.</p>
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="btn-primary" id="confirmPassword">
                        <i class="fas fa-check"></i> I've Copied the Password
                    </button>
                </div>
            </div>
        `;

        const modal = document.createElement('div');
        modal.className = 'modal temp-password-modal';
        modal.innerHTML = modalHtml;

        // Add to modal stack and show
        document.body.appendChild(modal);
        this.showModal(modal);

        // Add event listeners
        const closeModal = () => {
            this.closeModals(modal);
            setTimeout(() => {
                modal.remove();
                resolve();
            }, 300);
        };

        modal.querySelector('.close-btn').addEventListener('click', closeModal);
        modal.querySelector('#confirmPassword').addEventListener('click', closeModal);

        // Add copy button functionality
        modal.querySelector('.copy-btn').addEventListener('click', async () => {
            try {
                await navigator.clipboard.writeText(password);
                this.showSuccess('Password copied to clipboard');
            } catch (error) {
                this.showError('Failed to copy password');
            }
        });
    });
}
async showConfirmDialog(message, title = 'Confirm Action') {
    return await this.showCustomDialog({
        title,
        message,
        type: 'confirm',
        confirmText: 'Confirm',
        cancelText: 'Cancel'
    });
}


        showError(message) {
            if (window.dashboardApp?.userInterface) {
                window.dashboardApp.userInterface.showErrorNotification(message);
            } else {
                console.error(message);
                alert(message);
            }
        }

        showSuccess(message) {
            if (window.dashboardApp?.userInterface) {
                window.dashboardApp.userInterface.showSuccessNotification(message);
            } else {
                console.log(message);
                alert(message);
            }
        }

        escapeHtml(unsafe) {
            if (!unsafe) return '';
            return unsafe
                .replace(/&/g, "&amp;")
                .replace(/</g, "&lt;")
                .replace(/>/g, "&gt;")
                .replace(/"/g, "&quot;")
                .replace(/'/g, "&#039;");
        }

        getInitials(name) {
            return name
                .split(' ')
                .map(word => word[0])
                .join('')
                .toUpperCase()
                .slice(0, 2);
        }

        getAvatarColor(name) {
            let hash = 0;
            for (let i = 0; i < name.length; i++) {
                hash = name.charCodeAt(i) + ((hash << 5) - hash);
            }
            const h = hash % 360;
            return `hsl(${h}, 70%, 45%)`;
        }

        debounce(func, wait) {
            let timeout;
            return function executedFunction(...args) {
                const later = () => {
                    clearTimeout(timeout);
                    func(...args);
                };
                clearTimeout(timeout);
                timeout = setTimeout(later, wait);
            };
        }
    }

    // Initialize the Companies Manager globally
    if (typeof window !== 'undefined') {
        window.CompaniesManager = CompaniesManager;
    }
    // Ensure all modals are hidden by default
    document.addEventListener('DOMContentLoaded', () => {
        document.querySelectorAll('.modal').forEach(modal => {
            modal.style.display = 'none';
            modal.classList.remove('show');
        });
    });
})();

(function() {
    // Check if CompaniesManager already exists
    if (window.CompaniesManager) {
        return; // Exit if already defined
    }

    class CompaniesManager {
        constructor() {
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
                basic: {
                    price: 99,
                    features: ['Basic HRMS', 'Up to 50 employees', 'Email support']
                },
                premium: {
                    price: 199,
                    features: ['Advanced HRMS', 'Up to 200 employees', '24/7 support', 'Custom reports']
                },
                enterprise: {
                    price: 499,
                    features: ['Full HRMS suite', 'Unlimited employees', 'Dedicated support', 'Custom development']
                }
            };
            this.initialize();
        }

        async initialize() {
            try {
                // Hide all modals by default
                document.querySelectorAll('.modal').forEach(modal => {
                    modal.style.display = 'none';
                    modal.classList.remove('show');
                });

                await this.initializeElements();
                await this.initializeEventListeners();
                await this.loadCompanies();
            } catch (error) {
                console.error('Initialization error:', error);
                this.showError('Failed to initialize companies module');
            }
        }

        async initializeElements() {
            // Main elements
            this.companiesGrid = document.querySelector('.companies-grid');
            this.paginationContainer = document.querySelector('.pagination');
            
            // Filters
            this.searchInput = document.getElementById('companySearch');
            this.industryFilter = document.getElementById('industryFilter');
            this.statusFilter = document.getElementById('statusFilter');
            this.planFilter = document.getElementById('planFilter');
            
            // Company Modals
            this.companyModal = document.getElementById('companyModal');
            this.detailsModal = document.getElementById('companyDetailsModal');
            this.changePlanModal = document.getElementById('changePlanModal');
            
            // Forms
            this.companyForm = document.getElementById('companyForm');
            
            // Buttons
            this.addCompanyBtn = document.getElementById('addCompanyBtn');
            this.saveCompanyBtn = document.getElementById('saveCompanyBtn');
            this.cancelBtn = document.getElementById('cancelBtn');

            // Initialize dropdowns
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

            // Search and Filters
            if (this.searchInput) {
                this.searchInput.addEventListener('input', this.debounce(() => {
                    this.filters.search = this.searchInput.value;
                    this.currentPage = 1;
                    this.loadCompanies();
                }, 300));
            }

            // Filter dropdowns
            ['industryFilter', 'statusFilter', 'planFilter'].forEach(filterId => {
                const element = document.getElementById(filterId);
                if (element) {
                    element.addEventListener('change', (e) => {
                        this.filters[e.target.id.replace('Filter', '')] = e.target.value;
                        this.currentPage = 1;
                        this.loadCompanies();
                    });
                }
            });

            // Modal close buttons
            document.querySelectorAll('.close-btn').forEach(btn => {
                btn.addEventListener('click', () => this.closeModals());
            });

            // Cancel buttons
            document.querySelectorAll('#cancelBtn, #cancelAddUser, #cancelPlanChange').forEach(btn => {
                if (btn) {
                    btn.addEventListener('click', () => this.closeModals());
                }
            });

            // Add User functionality
            document.getElementById('addUserBtn')?.addEventListener('click', () => {
                if (this.currentCompanyId) {
                    this.showAddUserModal(this.currentCompanyId);
                }
            });

            document.getElementById('confirmAddUser')?.addEventListener('click', () => {
                this.handleAddUser();
            });

            // Change Plan functionality
            document.getElementById('changePlanBtn')?.addEventListener('click', () => {
                if (this.currentCompanyId) {
                    this.showChangePlanModal(this.currentCompanyId);
                }
            });

            document.getElementById('confirmPlanChange')?.addEventListener('click', () => {
                this.handlePlanChange(this.currentCompanyId);
            });

            // Tab switching
            document.querySelectorAll('.tab-btn').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    const tabName = e.target.dataset.tab;
                    this.activateTab(tabName);
                });
            });

            // Global click handler for closing modals
            document.addEventListener('click', (e) => {
                if (e.target.classList.contains('modal')) {
                    this.closeModals();
                }
            });

            // Keyboard Events
            document.addEventListener('keydown', (e) => {
                if (e.key === 'Escape') {
                    this.closeModals();
                }
            });

            // Plan calculation events
            const planSelect = document.getElementById('newPlan');
            const cycleSelect = document.getElementById('billingCycle');
            if (planSelect && cycleSelect) {
                [planSelect, cycleSelect].forEach(select => {
                    select.addEventListener('change', () => {
                        this.updatePlanSummary();
                    });
                });
            }
        }

        getHeaders() {
            return {
                'Authorization': `Bearer ${this.token}`,
                'Content-Type': 'application/json'
            };
        }

            async loadCompanies() {
            try {
                this.showLoading();
                const queryParams = new URLSearchParams({
                    page: this.currentPage,
                    limit: this.pageSize,
                    ...this.filters
                });

                const response = await fetch(`${this.baseUrl}/companies?${queryParams}`, {
                    headers: this.getHeaders()
                });

                if (response.status === 401) {
                    localStorage.removeItem('token');
                    window.location.href = '/login.html';
                    return;
                }

                if (!response.ok) {
                    throw new Error('Failed to fetch companies');
                }

                const data = await response.json();
                this.totalCompanies = data.total;
                this.companies = data.companies;
                this.renderCompanies(this.companies);
                this.renderPagination();
            } catch (error) {
                console.error('Error loading companies:', error);
                this.showError('Failed to load companies');
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
                        <span class="company-status status-${company.status}">
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
                        <button class="btn-icon" data-action="view" data-company-id="${company._id}">
                            <i class="fas fa-eye"></i>
                        </button>
                        <button class="btn-icon" data-action="edit" data-company-id="${company._id}">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn-icon" data-action="toggle-status" data-company-id="${company._id}">
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

            // Add click handlers for pagination
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

        changePage(page) {
            if (page !== this.currentPage) {
                this.currentPage = page;
                this.loadCompanies();
            }
        }

        async populateIndustryDropdowns() {
            try {
                // Get all industry select elements
                const industrySelects = [
                    this.industryFilter,
                    document.querySelector('#industry')
                ];

                // Populate each select element
                industrySelects.forEach(select => {
                    if (select) {
                        // Clear existing options
                        select.innerHTML = '';

                        // Add default option
                        const defaultOption = document.createElement('option');
                        defaultOption.value = '';
                        defaultOption.textContent = select === this.industryFilter ? 'All Industries' : 'Select Industry';
                        select.appendChild(defaultOption);

                        // Add industry options
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
            this.currentCompanyId = null;
            this.currentCompany = null;
            document.getElementById('modalTitle').textContent = 'Add New Company';
            this.companyForm.reset();
            this.showModal('companyModal');
        }

        async handleCompanySubmit() {
            try {
                const formData = {
                    name: document.getElementById('companyName').value,
                    industry: document.getElementById('industry').value,
                    companySize: parseInt(document.getElementById('companySize').value),
                    contactDetails: {
                        email: document.getElementById('email').value,
                        phone: document.getElementById('phone').value,
                        address: document.getElementById('address').value
                    },
                    subscriptionPlan: document.getElementById('subscriptionPlan').value,
                    status: document.getElementById('status').value
                };

                if (!this.validateCompanyData(formData)) {
                    return;
                }

                const endpoint = this.currentCompanyId 
                    ? `${this.baseUrl}/companies/${this.currentCompanyId}`
                    : `${this.baseUrl}/companies`;

                const method = this.currentCompanyId ? 'PUT' : 'POST';

                const response = await fetch(endpoint, {
                    method,
                    headers: this.getHeaders(),
                    body: JSON.stringify(formData)
                });

                if (!response.ok) {
                    const error = await response.json();
                    throw new Error(error.message || 'Failed to save company');
                }

                this.showSuccess(`Company successfully ${this.currentCompanyId ? 'updated' : 'created'}`);
                this.closeModals();
                await this.loadCompanies();
            } catch (error) {
                console.error('Error saving company:', error);
                this.showError(error.message);
            }
        }

        validateCompanyData(data) {
            if (!data.name || data.name.trim().length < 2) {
                this.showError('Company name must be at least 2 characters long');
                return false;
            }

            if (!data.industry) {
                this.showError('Please select an industry');
                return false;
            }

            if (!data.companySize || data.companySize < 1) {
                this.showError('Company size must be at least 1');
                return false;
            }

            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(data.contactDetails.email)) {
                this.showError('Please enter a valid email address');
                return false;
            }

            const phoneRegex = /^\+?[\d\s-]{10,}$/;
            if (!phoneRegex.test(data.contactDetails.phone)) {
                this.showError('Please enter a valid phone number');
                return false;
            }

            if (!data.contactDetails.address || data.contactDetails.address.trim().length < 5) {
                this.showError('Please enter a valid address');
                return false;
            }

            return true;
        }

        async editCompany(companyId) {
            try {
                const response = await fetch(`${this.baseUrl}/companies/${companyId}`, {
                    headers: this.getHeaders()
                });

                if (!response.ok) {
                    throw new Error('Failed to fetch company data');
                }

                const result = await response.json();
                
                if (!result.success || !result.data) {
                    throw new Error(result.message || 'Invalid response format');
                }

                const company = result.data;
                this.currentCompanyId = companyId;
                this.currentCompany = company;
                this.populateCompanyForm(company);
                document.getElementById('modalTitle').textContent = 'Edit Company';
                this.showModal('companyModal');
            } catch (error) {
                console.error('Error loading company for edit:', error);
                this.showError('Failed to load company data');
            }
        }

        populateCompanyForm(company) {
            try {
                if (!company) {
                    throw new Error('No company data provided');
                }

                // Get form elements
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

                // Populate basic company info
                elements.companyName.value = company.name || '';
                elements.industry.value = company.industry || '';
                elements.companySize.value = company.companySize || '';
                elements.status.value = company.status || 'inactive';

                // Handle contact details
                if (company.contactDetails) {
                    elements.email.value = company.contactDetails.email || '';
                    elements.phone.value = company.contactDetails.phone || '';
                    elements.address.value = company.contactDetails.address || '';
                }

                // Handle subscription plan
                const subscription = company.subscription || {};
                elements.subscriptionPlan.value = subscription.plan || company.subscriptionPlan || 'basic';

            } catch (error) {
                console.error('Error populating form:', error);
                throw new Error(`Failed to populate form: ${error.message}`);
            }
        }

        async toggleCompanyStatus(companyId) {
            try {
                const response = await fetch(`${this.baseUrl}/companies/${companyId}/toggle-status`, {
                    method: 'PATCH',
                    headers: this.getHeaders()
                });

                if (!response.ok) {
                    throw new Error('Failed to toggle company status');
                }

                const result = await response.json();
                this.showSuccess(result.message || 'Company status updated successfully');
                await this.loadCompanies();

                // If the company details modal is open, refresh it
                if (this.currentCompanyId === companyId && 
                    this.detailsModal.classList.contains('show')) {
                    await this.viewCompanyDetails(companyId);
                }
            } catch (error) {
                console.error('Error toggling company status:', error);
                this.showError('Failed to update company status');
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

        async viewCompanyDetails(companyId) {
            try {
                const response = await fetch(`${this.baseUrl}/companies/${companyId}`, {
                    headers: this.getHeaders()
                });

                if (!response.ok) {
                    throw new Error('Failed to fetch company details');
                }

                const result = await response.json();
                
                if (!result.success || !result.data) {
                    throw new Error(result.message || 'Invalid response format');
                }

                // Store the company data
                this.currentCompany = result.data;
                this.currentCompanyId = companyId;

                // Show the modal
                this.showModal('companyDetailsModal');

                // Set the first tab as active and trigger its content
                const firstTab = document.querySelector('.tab-btn');
                if (firstTab) {
                    this.activateTab(firstTab.dataset.tab);
                }
            } catch (error) {
                console.error('Error fetching company details:', error);
                this.showError('Failed to load company details');
            }
        }

            activateTab(tabName) {
            // Update tab buttons
            document.querySelectorAll('.tab-btn').forEach(btn => {
                btn.classList.toggle('active', btn.dataset.tab === tabName);
            });

            // Update tab content
            document.querySelectorAll('.tab-content > div[data-tab]').forEach(content => {
                content.classList.toggle('active', content.dataset.tab === tabName);
            });

            // Load tab content
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
                            <h3>Company Information</h3>
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
                            <h3>Contact Information</h3>
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
                            <h3>Subscription Details</h3>
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

        // Add event listeners after rendering
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
        async renderActivityTab(company) {
    try {
        const response = await fetch(`${this.baseUrl}/companies/${company._id}/activity-logs`, {
            headers: this.getHeaders()
        });

        if (!response.ok) {
            throw new Error('Failed to fetch activity logs');
        }

        const result = await response.json();
        const logs = result.data || [];
        const tabContent = document.querySelector('.tab-content');

        tabContent.innerHTML = `
            <div class="activity-logs">
                <div class="activity-filters">
                    <select id="activityTypeFilter">
                        <option value="">All Activities</option>
                        <option value="user">User Management</option>
                        <option value="subscription">Subscription Changes</option>
                        <option value="system">System Changes</option>
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
                        ${logs.map(log => `
                            <div class="activity-item ${log.type.toLowerCase()}">
                                <div class="activity-icon">
                                    <i class="fas ${this.getActivityIcon(log.type)}"></i>
                                </div>
                                <div class="activity-details">
                                    <div class="activity-header">
                                        <span class="activity-type">${log.type}</span>
                                        <span class="activity-date">
                                            ${new Date(log.timestamp).toLocaleString()}
                                        </span>
                                    </div>
                                    <p class="activity-description">${this.escapeHtml(log.description)}</p>
                                    ${log.details ? `
                                        <button class="btn-link" data-action="toggleDetails">
                                            Show Details
                                        </button>
                                        <div class="activity-details-expanded hidden">
                                            <pre>${this.escapeHtml(JSON.stringify(log.details, null, 2))}</pre>
                                        </div>
                                    ` : ''}
                                </div>
                            </div>
                        `).join('')}
                    </div>
                `}
            </div>
        `;

        // Initialize activity filters
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

renderActivityList(logs) {
    if (!logs.length) {
        return `
            <div class="empty-state">
                <i class="fas fa-history"></i>
                <p>No activity logs found</p>
            </div>
        `;
    }

    return logs.map(log => `
        <div class="activity-item ${log.type.toLowerCase()}">
            <div class="activity-icon">
                <i class="fas ${this.getActivityIcon(log.type)}"></i>
            </div>
            <div class="activity-details">
                <div class="activity-header">
                    <span class="activity-type">${log.type}</span>
                    <span class="activity-date">
                        ${new Date(log.timestamp).toLocaleString()}
                    </span>
                </div>
                <p class="activity-description">${this.escapeHtml(log.description)}</p>
                ${log.details ? `
                    <button class="btn-link" data-action="toggleDetails">
                        Show Details
                    </button>
                    <div class="activity-details-expanded hidden">
                        <pre>${this.escapeHtml(JSON.stringify(log.details, null, 2))}</pre>
                    </div>
                ` : ''}
            </div>
        </div>
    `).join('');
}

            async renderBillingHistory(companyId) {
            try {
                const response = await fetch(`${this.baseUrl}/companies/${companyId}/billing-history`, {
                    headers: this.getHeaders()
                });

                if (!response.ok) {
                    throw new Error('Failed to fetch billing history');
                }

                const history = await response.json();
                
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
                                        <td>$${invoice.amount.toFixed(2)}</td>
                                        <td>
                                            <span class="status-badge ${invoice.status}">
                                                ${invoice.status.toUpperCase()}
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

        async showChangePlanModal(companyId) {
    try {
        const subscription = this.currentCompany.subscription || {};
        
        // First, ensure the modal HTML is correct
        const modalContent = `
            <div class="modal-content">
                <div class="modal-header">
                    <h2>Change Subscription Plan</h2>
                    <button class="close-btn"><i class="fas fa-times"></i></button>
                </div>
                <div class="modal-body">
                    <div class="current-plan-info">
                        <label>Current Plan:</label>
                        <span id="currentPlan" class="plan-badge ${subscription.plan || 'basic'}">
                            ${(subscription.plan || 'Basic').toUpperCase()}
                        </span>
                    </div>
                    <form id="changePlanForm">
                        <div class="form-group">
                            <label for="newPlan">Select New Plan</label>
                            <select id="newPlan" required>
                                <option value="basic">Basic Plan</option>
                                <option value="premium">Premium Plan</option>
                                <option value="enterprise">Enterprise Plan</option>
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

        modal.innerHTML = modalContent;
        this.showModal('changePlanModal');
        
        // Set initial values
        document.getElementById('newPlan').value = subscription.plan || 'basic';
        document.getElementById('billingCycle').value = subscription.billingCycle || 'monthly';

        // Initialize event listeners
        document.getElementById('newPlan').addEventListener('change', () => this.updatePlanSummary());
        document.getElementById('billingCycle').addEventListener('change', () => this.updatePlanSummary());
        document.getElementById('cancelPlanChange').addEventListener('click', () => this.closeModals());
        document.getElementById('confirmPlanChange').addEventListener('click', () => this.handlePlanChange(companyId));

        // Update plan summary
        this.updatePlanSummary();

    } catch (error) {
        console.error('Error showing plan change modal:', error);
        this.showError('Failed to load plan change options');
    }
}
        updatePlanSummary() {
            const plan = document.getElementById('newPlan').value;
            const cycle = document.getElementById('billingCycle').value;
            const basePrice = this.subscriptionPlans[plan].price;
            
            const months = cycle === 'annual' ? 12 : 1;
            const subtotal = basePrice * months;
            const discount = cycle === 'annual' ? subtotal * 0.1 : 0; // 10% annual discount
            const total = subtotal - discount;

            document.getElementById('planSummary').innerHTML = `
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

        async handlePlanChange(companyId) {
            try {
                const planData = {
                    plan: document.getElementById('newPlan').value,
                    billingCycle: document.getElementById('billingCycle').value
                };

                if (!this.validatePlanChange(planData)) {
                    return;
                }

                const response = await fetch(`${this.baseUrl}/companies/${companyId}/subscription`, {
                    method: 'POST',
                    headers: this.getHeaders(),
                    body: JSON.stringify(planData)
                });

                if (!response.ok) {
                    const error = await response.json();
                    throw new Error(error.message || 'Failed to update subscription');
                }

                this.showSuccess('Subscription updated successfully');
                this.closeModals();
                await this.viewCompanyDetails(companyId);
            } catch (error) {
                console.error('Error changing subscription plan:', error);
                this.showError(error.message);
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

            if (!this.subscriptionPlans[planData.plan]) {
                this.showError('Invalid plan selected');
                return false;
            }

            return true;
        }

        async generateInvoice(companyId) {
    try {
        const response = await fetch(`${this.baseUrl}/companies/${companyId}/generate-invoice`, {
            method: 'POST',
            headers: this.getHeaders()
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || 'Failed to generate invoice');
        }

        const result = await response.json();
        this.showSuccess('Invoice generated successfully');
        
        // Refresh the billing history
        if (this.currentCompany) {
            await this.renderSubscriptionTab(this.currentCompany);
        }

        // If the invoice number is returned, offer download
        if (result.data?.invoiceNumber) {
            const downloadConfirmed = await this.showConfirmDialog(
                'Would you like to download the invoice?'
            );
            if (downloadConfirmed) {
                await this.downloadInvoice(result.data.invoiceNumber);
            }
        }
    } catch (error) {
        console.error('Error generating invoice:', error);
        this.showError(error.message || 'Failed to generate invoice');
    }
}

showConfirmDialog(message) {
    return new Promise(resolve => {
        const confirmed = window.confirm(message);
        resolve(confirmed);
    });
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

            // User Management Methods
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
                            <input type="text" id="userSearch" placeholder="Search users...">
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
                ${this.renderUsersTable(users)}
            </div>
        `;

        // Add event listener for Add User button
        const addUserBtn = document.getElementById('addUserBtn');
        if (addUserBtn) {
            addUserBtn.addEventListener('click', () => {
                this.showAddUserModal(company._id);
            });
        }

        this.initializeUserFilters();
    } catch (error) {
        console.error('Error rendering users tab:', error);
        this.showError('Failed to load users information');
    }
}

        async loadCompanyUsers(companyId) {
            try {
                const response = await fetch(`${this.baseUrl}/companies/${companyId}/users`, {
                    headers: this.getHeaders()
                });

                if (!response.ok) {
                    throw new Error('Failed to load company users');
                }

                const result = await response.json();
                return result.data || [];
            } catch (error) {
                console.error('Error loading company users:', error);
                this.showError('Failed to load company users');
                return [];
            }
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
                <div class="users-table-container">
                    <table class="users-table">
                        <thead>
                            <tr>
                                <th>User</th>
                                <th>Role</th>
                                <th>Department</th>
                                <th>Status</th>
                                <th>Last Login</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${users.map(user => `
                        <tr>
                            <!-- ... other cells ... -->
                            <td>
                                <div class="action-buttons">
                                    <button class="btn-icon" data-action="resetPassword" data-user-id="${user._id}">
                                        <i class="fas fa-key"></i>
                                    </button>
                                    <button class="btn-icon" data-action="toggleStatus" data-user-id="${user._id}">
                                        <i class="fas fa-power-off"></i>
                                    </button>
                                </div>
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
            `;
        }

        showAddUserModal(companyId) {
    try {
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
        if (!modal) {
            throw new Error('Add user modal not found');
        }

        modal.innerHTML = modalHtml;
        this.showModal('addUserModal');

        // Add event listeners
        document.getElementById('cancelAddUser').addEventListener('click', () => this.closeModals());
        document.getElementById('confirmAddUser').addEventListener('click', () => this.handleAddUser(companyId));
        document.querySelector('#addUserModal .close-btn').addEventListener('click', () => this.closeModals());

    } catch (error) {
        console.error('Error showing add user modal:', error);
        this.showError('Failed to show add user modal');
    }
}
        async handleAddUser(companyId) {
    try {
        const form = document.getElementById('addUserForm');
        if (!form) {
            throw new Error('Add user form not found');
        }

        const userData = {
            name: document.getElementById('userName').value,
            email: document.getElementById('userEmail').value,
            role: document.getElementById('userRole').value,
            department: document.getElementById('userDepartment').value || null
        };

        if (!this.validateUserData(userData)) {
            return;
        }

        const response = await fetch(`${this.baseUrl}/companies/${companyId}/users`, {
            method: 'POST',
            headers: this.getHeaders(),
            body: JSON.stringify(userData)
        });

        const result = await response.json();
        if (!response.ok) {
            throw new Error(result.message || 'Failed to add user');
        }

        this.showSuccess('User added successfully');
        
        if (result.data?.tempPassword) {
            this.showTempPasswordModal(userData.email, result.data.tempPassword);
        }

        this.closeModals();
        await this.renderUsersTab({ _id: companyId });
    } catch (error) {
        console.error('Error adding user:', error);
        this.showError(error.message);
    }
}

        validateUserData(userData) {
            if (!userData.name || userData.name.trim().length < 2) {
                this.showError('Name must be at least 2 characters long');
                return false;
            }

            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(userData.email)) {
                this.showError('Please enter a valid email address');
                return false;
            }

            if (!userData.role) {
                this.showError('Please select a role');
                return false;
            }

            return true;
        }

        async resetUserPassword(userId) {
            try {
                if (!confirm('Are you sure you want to reset this user\'s password?')) {
                    return;
                }

                const response = await fetch(
                    `${this.baseUrl}/companies/${this.currentCompanyId}/users/${userId}/reset-password`,
                    {
                        method: 'POST',
                        headers: this.getHeaders()
                    }
                );

                if (!response.ok) {
                    throw new Error('Failed to reset password');
                }

                const result = await response.json();
                this.showSuccess('Password reset successfully');

                if (result.data?.tempPassword) {
                    const user = await this.getUserDetails(userId);
                    this.showTempPasswordModal(user.email, result.data.tempPassword);
                }
            } catch (error) {
                console.error('Error resetting password:', error);
                this.showError('Failed to reset password');
            }
        }

        async toggleUserStatus(userId) {
            try {
                const response = await fetch(
                    `${this.baseUrl}/companies/${this.currentCompanyId}/users/${userId}/toggle-status`,
                    {
                        method: 'PATCH',
                        headers: this.getHeaders()
                    }
                );

                if (!response.ok) {
                    throw new Error('Failed to toggle user status');
                }

                this.showSuccess('User status updated successfully');
                await this.renderUsersTab({ _id: this.currentCompanyId });
            } catch (error) {
                console.error('Error toggling user status:', error);
                this.showError('Failed to update user status');
            }
        }

        initializeUserEventListeners() {
    const tableContainer = document.querySelector('.users-table-container');
    if (tableContainer) {
        tableContainer.addEventListener('click', async (e) => {
            const button = e.target.closest('button[data-action]');
            if (!button) return;

            const action = button.dataset.action;
            const userId = button.dataset.userId;

            switch (action) {
                case 'resetPassword':
                    await this.resetUserPassword(userId);
                    break;
                case 'toggleStatus':
                    await this.toggleUserStatus(userId);
                    break;
            }
        });
    }

    // Add User button
    const addUserBtn = document.getElementById('addUserBtn');
    if (addUserBtn) {
        addUserBtn.addEventListener('click', () => {
            if (this.currentCompanyId) {
                this.showAddUserModal(this.currentCompanyId);
            }
        });
    }
}

            // Utility Methods
        showModal(modalId) {
            const modal = document.getElementById(modalId);
            if (modal) {
                modal.style.display = 'flex';
                setTimeout(() => modal.classList.add('show'), 10);
                document.body.style.overflow = 'hidden'; // Prevent background scrolling
            }
        }

        closeModals() {
            document.querySelectorAll('.modal').forEach(modal => {
                modal.classList.remove('show');
                setTimeout(() => {
                    modal.style.display = 'none';
                    document.body.style.overflow = '';
                }, 300);
            });
            this.resetForms();
        }

        resetForms() {
            document.querySelectorAll('form').forEach(form => {
                form.reset();
            });
            this.currentCompanyId = null;
            this.currentCompany = null;
        }

        showLoading() {
            const loader = document.createElement('div');
            loader.className = 'content-loader';
            loader.innerHTML = `
                <div class="loader-spinner">
                    <i class="fas fa-spinner fa-spin"></i>
                </div>
                <p>Loading content...</p>
            `;
            
            if (this.companiesGrid) {
                this.companiesGrid.innerHTML = '';
                this.companiesGrid.appendChild(loader);
            }
        }

        hideLoading() {
            const loader = document.querySelector('.content-loader');
            if (loader) {
                loader.remove();
            }
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

        showTempPasswordModal(email, password) {
            const modal = document.createElement('div');
            modal.className = 'modal show';
            modal.innerHTML = `
                <div class="modal-content">
                    <div class="modal-header">
                        <h2>Temporary Password</h2>
                        <button class="close-btn"><i class="fas fa-times"></i></button>
                    </div>
                    <div class="modal-body">
                        <p>Please securely share these credentials with the user:</p>
                        <div class="credentials-box">
                            <div class="credential-item">
                                <label>Email:</label>
                                <span>${this.escapeHtml(email)}</span>
                            </div>
                            <div class="credential-item">
                                <label>Temporary Password:</label>
                                <span>${this.escapeHtml(password)}</span>
                            </div>
                        </div>
                        <div class="warning-message">
                            <i class="fas fa-exclamation-triangle"></i>
                            <p>This password will only be shown once. Please make sure to copy it.</p>
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button class="btn-primary" onclick="this.parentElement.parentElement.parentElement.remove()">
                            I've copied the password
                        </button>
                    </div>
                </div>
            `;

            document.body.appendChild(modal);

            // Add close button functionality
            modal.querySelector('.close-btn').addEventListener('click', () => {
                modal.remove();
            });
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

        initializeUserFilters() {
            const searchInput = document.getElementById('userSearch');
            const roleFilter = document.getElementById('roleFilter');
            const statusFilter = document.getElementById('userStatusFilter');

            if (searchInput) {
                searchInput.addEventListener('input', this.debounce((e) => {
                    this.filterUsers(
                        e.target.value,
                        roleFilter?.value || '',
                        statusFilter?.value || ''
                    );
                }, 300));
            }

            if (roleFilter) {
                roleFilter.addEventListener('change', () => {
                    this.filterUsers(
                        searchInput?.value || '',
                        roleFilter.value,
                        statusFilter?.value || ''
                    );
                });
            }

            if (statusFilter) {
                statusFilter.addEventListener('change', () => {
                    this.filterUsers(
                        searchInput?.value || '',
                        roleFilter?.value || '',
                        statusFilter.value
                    );
                });
            }
        }

        filterUsers(search = '', role = '', status = '') {
            const rows = document.querySelectorAll('.users-table tbody tr');
            rows.forEach(row => {
                const userName = row.querySelector('.user-name')?.textContent.toLowerCase() || '';
                const userEmail = row.querySelector('.user-email')?.textContent.toLowerCase() || '';
                const userRole = row.querySelector('.role-badge')?.textContent.toLowerCase() || '';
                const userStatus = row.querySelector('.status-badge')?.textContent.toLowerCase() || '';

                const matchesSearch = !search || 
                    userName.includes(search.toLowerCase()) || 
                    userEmail.includes(search.toLowerCase());
                const matchesRole = !role || userRole === role.toLowerCase();
                const matchesStatus = !status || userStatus === status.toLowerCase();

                row.style.display = matchesSearch && matchesRole && matchesStatus ? '' : 'none';
            });
        }
    }

    // Initialize the Companies Manager globally
    window.CompaniesManager = CompaniesManager;


    // Ensure all modals are hidden by default
    document.addEventListener('DOMContentLoaded', () => {
        document.querySelectorAll('.modal').forEach(modal => {
            modal.style.display = 'none';
            modal.classList.remove('show');
        });
    });
})();

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

            // Modal Management
            document.querySelectorAll('.close-btn').forEach(btn => {
                btn.addEventListener('click', () => this.closeModals());
            });

            // Tab Management
            document.querySelectorAll('.tab-btn').forEach(btn => {
                btn.addEventListener('click', (e) => this.switchTab(e.target));
            });

            // Global Modal Close
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

            // Company Card Actions
            if (this.companiesGrid) {
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
            this.companyModal.classList.add('show');
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
                this.companyModal.classList.add('show');
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
                this.detailsModal.classList.add('show');

                // Set the first tab as active and trigger its content
                const firstTab = document.querySelector('.tab-btn');
                if (firstTab) {
                    this.switchTab(firstTab);
                }
            } catch (error) {
                console.error('Error fetching company details:', error);
                this.showError('Failed to load company details');
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


       switchTab(tabButton) {
            if (!this.currentCompanyId || !this.currentCompany) {
                this.showError('No company selected');
                return;
            }

            const tabName = tabButton.dataset.tab;
            
            // Update active tab button
            document.querySelectorAll('.tab-btn').forEach(btn => {
                btn.classList.remove('active');
            });
            tabButton.classList.add('active');

            // Show loading state
            const tabContent = document.querySelector('.tab-content');
            tabContent.innerHTML = `
                <div class="content-loader">
                    <div class="loader-spinner">
                        <i class="fas fa-spinner fa-spin"></i>
                    </div>
                    <p>Loading ${tabName} content...</p>
                </div>
            `;

            // Load tab content based on type
            try {
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
                    default:
                        tabContent.innerHTML = `
                            <div class="error-state">
                                <i class="fas fa-exclamation-circle"></i>
                                <p>Invalid tab selected</p>
                            </div>
                        `;
                }
            } catch (error) {
                console.error('Error switching tab:', error);
                tabContent.innerHTML = `
                    <div class="error-state">
                        <i class="fas fa-exclamation-circle"></i>
                        <p>Failed to load tab content: ${error.message}</p>
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
                            <button class="btn-primary" onclick="window.companiesManager.showChangePlanModal('${company._id}')">
                                <i class="fas fa-exchange-alt"></i> Change Plan
                            </button>
                            <button class="btn-secondary" onclick="window.companiesManager.generateInvoice('${company._id}')">
                                <i class="fas fa-file-invoice"></i> Generate Invoice
                            </button>
                        </div>

                        <div class="billing-history">
                            <h4>Billing History</h4>
                            ${await this.renderBillingHistory(company._id)}
                        </div>
                    </div>
                `;
            } catch (error) {
                console.error('Error rendering subscription tab:', error);
                this.showError('Failed to load subscription information');
            }
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
                this.changePlanModal.classList.add('show');
                
                // Populate current plan details
                document.getElementById('currentPlan').textContent = 
                    (subscription.plan || 'Basic').toUpperCase();
                document.getElementById('newPlan').value = subscription.plan || 'basic';
                document.getElementById('billingCycle').value = 
                    subscription.billingCycle || 'monthly';

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
                this.changePlanModal.classList.remove('show');
                
                // Refresh company details
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
                    throw new Error('Failed to generate invoice');
                }

                const result = await response.json();
                this.showSuccess('Invoice generated successfully');
                
                // Refresh billing history
                await this.renderSubscriptionTab(this.currentCompany);
            } catch (error) {
                console.error('Error generating invoice:', error);
                this.showError('Failed to generate invoice');
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
                            <button class="btn-primary" onclick="window.companiesManager.showAddUserModal('${company._id}')">
                                <i class="fas fa-user-plus"></i> Add User
                            </button>
                        </div>
                        ${this.renderUsersTable(users)}
                    </div>
                `;

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
                                    <td>
                                        <div class="action-buttons">
                                            <button class="btn-icon" onclick="window.companiesManager.editUser('${user._id}')">
                                                <i class="fas fa-edit"></i>
                                            </button>
                                            <button class="btn-icon" onclick="window.companiesManager.resetUserPassword('${user._id}')">
                                                <i class="fas fa-key"></i>
                                            </button>
                                            <button class="btn-icon" onclick="window.companiesManager.toggleUserStatus('${user._id}')">
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

        showAddUserModal(companyId) {
            const modal = document.getElementById('addUserModal');
            if (!modal) {
                this.showError('User modal not found');
                return;
            }

            modal.classList.add('show');
            const form = modal.querySelector('form');
            if (form) {
                form.dataset.companyId = companyId;
                form.reset();
            }
        }

        async handleAddUser(event) {
            try {
                const form = event.target;
                const companyId = form.dataset.companyId;

                const userData = {
                    name: document.getElementById('userName').value,
                    email: document.getElementById('userEmail').value,
                    role: document.getElementById('userRole').value,
                    department: document.getElementById('userDepartment').value
                };

                if (!this.validateUserData(userData)) {
                    return;
                }

                const response = await fetch(`${this.baseUrl}/companies/${companyId}/users`, {
                    method: 'POST',
                    headers: this.getHeaders(),
                    body: JSON.stringify(userData)
                });

                if (!response.ok) {
                    const error = await response.json();
                    throw new Error(error.message || 'Failed to add user');
                }

                const result = await response.json();
                this.showSuccess('User added successfully');
                
                if (result.data.tempPassword) {
                    this.showTempPasswordModal(userData.email, result.data.tempPassword);
                }

                document.getElementById('addUserModal').classList.remove('show');
                form.reset();
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

        // Utility Methods
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

        closeModals() {
            document.querySelectorAll('.modal').forEach(modal => {
                modal.classList.remove('show');
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

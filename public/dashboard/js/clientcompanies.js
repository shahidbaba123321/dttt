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

        async populateIndustryDropdowns() {
            try {
                // Get all industry select elements
                const industrySelects = [
                    this.industryFilter,
                    document.querySelector('#industry'), // In the add/edit company form
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

            // Subscription Plan Events
            if (document.getElementById('changePlanForm')) {
                document.getElementById('changePlanForm').addEventListener('submit', (e) => {
                    e.preventDefault();
                    this.handlePlanChange(this.currentCompanyId);
                });
            }

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

            // User Management Events
            if (document.getElementById('addUserForm')) {
                document.getElementById('addUserForm').addEventListener('submit', (e) => {
                    e.preventDefault();
                    this.handleAddUser(e);
                });
            }

            if (document.getElementById('editUserForm')) {
                document.getElementById('editUserForm').addEventListener('submit', (e) => {
                    e.preventDefault();
                    this.handleEditUser(e);
                });
            }

            // User Filters
            const userSearchInput = document.getElementById('userSearch');
            if (userSearchInput) {
                userSearchInput.addEventListener('input', this.debounce((e) => {
                    this.filterUsers(
                        e.target.value,
                        document.getElementById('roleFilter')?.value,
                        document.getElementById('userStatusFilter')?.value
                    );
                }, 300));
            }

            // Role and Status Filters for Users
            ['roleFilter', 'userStatusFilter'].forEach(filterId => {
                const element = document.getElementById(filterId);
                if (element) {
                    element.addEventListener('change', () => {
                        this.filterUsers(
                            document.getElementById('userSearch')?.value || '',
                            document.getElementById('roleFilter')?.value || '',
                            document.getElementById('userStatusFilter')?.value || ''
                        );
                    });
                }
            });

            // Activity Log Filters
            const activityTypeFilter = document.getElementById('activityTypeFilter');
            const activityDateFilter = document.getElementById('activityDateFilter');

            if (activityTypeFilter) {
                activityTypeFilter.addEventListener('change', () => this.filterActivityLogs());
            }

            if (activityDateFilter) {
                activityDateFilter.addEventListener('change', () => this.filterActivityLogs());
            }

            // Invoice Generation
            const generateInvoiceBtn = document.getElementById('generateInvoiceBtn');
            if (generateInvoiceBtn) {
                generateInvoiceBtn.addEventListener('click', () => {
                    if (this.currentCompanyId) {
                        this.generateInvoice(this.currentCompanyId);
                    }
                });
            }

            // Pagination Events
            if (this.paginationContainer) {
                this.paginationContainer.addEventListener('click', (e) => {
                    if (e.target.classList.contains('btn-page')) {
                        const page = parseInt(e.target.dataset.page);
                        if (!isNaN(page)) {
                            this.changePage(page);
                        }
                    }
                });
            }
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
                        <button class="btn-icon" onclick="window.companiesManager.viewCompanyDetails('${company._id}')">
                            <i class="fas fa-eye"></i>
                        </button>
                        <button class="btn-icon" onclick="window.companiesManager.editCompany('${company._id}')">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn-icon" onclick="window.companiesManager.toggleCompanyStatus('${company._id}')">
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

        async showAddCompanyModal() {
            this.currentCompanyId = null;
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

                // Validate form data
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

                const company = await response.json();
                this.currentCompanyId = companyId;
                this.populateCompanyForm(company);
                document.getElementById('modalTitle').textContent = 'Edit Company';
                this.companyModal.classList.add('show');
            } catch (error) {
                console.error('Error loading company for edit:', error);
                this.showError('Failed to load company data');
            }
        }

        populateCompanyForm(company) {
            document.getElementById('companyName').value = company.name;
            document.getElementById('industry').value = company.industry;
            document.getElementById('companySize').value = company.companySize;
            document.getElementById('email').value = company.contactDetails.email;
            document.getElementById('phone').value = company.contactDetails.phone;
            document.getElementById('address').value = company.contactDetails.address;
            document.getElementById('subscriptionPlan').value = company.subscriptionPlan;
            document.getElementById('status').value = company.status;
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
                this.showSuccess(result.message);
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

                const company = await response.json();
                this.currentCompanyId = companyId;
                await this.renderCompanyDetails(company);
                this.detailsModal.classList.add('show');

                // Set the first tab as active by default
                const firstTab = document.querySelector('.tab-btn');
                if (firstTab) {
                    this.switchTab(firstTab);
                }
            } catch (error) {
                console.error('Error fetching company details:', error);
                this.showError('Failed to load company details');
            }
        }

        async renderCompanyDetails(company) {
            const detailsContent = document.querySelector('.tab-content');
            detailsContent.innerHTML = `
                <div class="company-details-view">
                    <div class="details-section">
                        <h3>Company Information</h3>
                        <div class="info-grid">
                            <div class="info-item">
                                <label>Company Name</label>
                                <span>${this.escapeHtml(company.name)}</span>
                            </div>
                            <div class="info-item">
                                <label>Industry</label>
                                <span>${this.escapeHtml(company.industry)}</span>
                            </div>
                            <div class="info-item">
                                <label>Company Size</label>
                                <span>${company.companySize} employees</span>
                            </div>
                            <div class="info-item">
                                <label>Status</label>
                                <span class="status-badge ${company.status}">
                                    ${company.status.toUpperCase()}
                                </span>
                            </div>
                        </div>
                    </div>

                    <div class="details-section">
                        <h3>Contact Information</h3>
                        <div class="info-grid">
                            <div class="info-item">
                                <label>Email</label>
                                <span>${this.escapeHtml(company.contactDetails.email)}</span>
                            </div>
                            <div class="info-item">
                                <label>Phone</label>
                                <span>${this.escapeHtml(company.contactDetails.phone)}</span>
                            </div>
                            <div class="info-item">
                                <label>Address</label>
                                <span>${this.escapeHtml(company.contactDetails.address)}</span>
                            </div>
                        </div>
                    </div>

                    <div class="details-section">
                        <h3>Subscription Details</h3>
                        <div class="info-grid">
                            <div class="info-item">
                                <label>Current Plan</label>
                                <span class="plan-badge ${company.subscriptionPlan}">
                                    ${company.subscriptionPlan.toUpperCase()}
                                </span>
                            </div>
                            <div class="info-item">
                                <label>Start Date</label>
                                <span>${new Date(company.subscriptionStartDate).toLocaleDateString()}</span>
                            </div>
                            <div class="info-item">
                                <label>Next Billing</label>
                                <span>${new Date(company.nextBillingDate).toLocaleDateString()}</span>
                            </div>
                        </div>
                    </div>
                </div>
            `;
        }

            // Subscription Management Methods
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

                const result = await response.json();
                this.showSuccess('Subscription updated successfully');
                this.changePlanModal.classList.remove('show');
                
                // Refresh subscription tab if it's active
                const activeTab = document.querySelector('.tab-btn.active');
                if (activeTab && activeTab.dataset.tab === 'subscription') {
                    await this.renderSubscriptionTab({ _id: companyId });
                }
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
                
                // Offer invoice download
                if (result.data.invoiceUrl) {
                    this.downloadInvoice(result.data.invoiceUrl);
                }

                // Refresh billing history if visible
                const activeTab = document.querySelector('.tab-btn.active');
                if (activeTab && activeTab.dataset.tab === 'subscription') {
                    await this.renderSubscriptionTab({ _id: companyId });
                }
            } catch (error) {
                console.error('Error generating invoice:', error);
                this.showError('Failed to generate invoice');
            }
        }

        async downloadInvoice(invoiceUrl) {
            try {
                const response = await fetch(invoiceUrl, {
                    headers: this.getHeaders()
                });

                if (!response.ok) {
                    throw new Error('Failed to download invoice');
                }

                const blob = await response.blob();
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `invoice-${Date.now()}.pdf`;
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
                
                // Show temporary password if provided
                if (result.data.tempPassword) {
                    this.showTempPasswordModal(userData.email, result.data.tempPassword);
                }

                this.addUserModal.classList.remove('show');
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

                if (result.data.tempPassword) {
                    const user = await this.getUserDetails(userId);
                    this.showTempPasswordModal(user.email, result.data.tempPassword);
                }
            } catch (error) {
                console.error('Error resetting password:', error);
                this.showError('Failed to reset password');
            }
        }

        async getUserDetails(userId) {
            const response = await fetch(
                `${this.baseUrl}/companies/${this.currentCompanyId}/users/${userId}`,
                {
                    headers: this.getHeaders()
                }
            );

            if (!response.ok) {
                throw new Error('Failed to fetch user details');
            }

            return await response.json();
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

         // Tab Management Methods
        switchTab(tabButton) {
            if (!this.currentCompanyId) {
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

            // Load tab content
            switch(tabName) {
                case 'details':
                    this.renderDetailsTab({ _id: this.currentCompanyId });
                    break;
                case 'users':
                    this.renderUsersTab({ _id: this.currentCompanyId });
                    break;
                case 'subscription':
                    this.renderSubscriptionTab({ _id: this.currentCompanyId });
                    break;
                case 'activity':
                    this.renderActivityTab({ _id: this.currentCompanyId });
                    break;
                default:
                    tabContent.innerHTML = `
                        <div class="error-state">
                            <i class="fas fa-exclamation-circle"></i>
                            <p>Invalid tab selected</p>
                        </div>
                    `;
            }
        }

        // Activity Log Methods
        async renderActivityTab(company) {
            try {
                const response = await fetch(`${this.baseUrl}/companies/${company._id}/activity-logs`, {
                    headers: this.getHeaders()
                });

                if (!response.ok) {
                    throw new Error('Failed to fetch activity logs');
                }

                const logs = await response.json();
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
                        ${this.renderActivityLogs(logs)}
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

        renderActivityLogs(logs) {
            if (!logs.length) {
                return `
                    <div class="empty-state">
                        <i class="fas fa-history"></i>
                        <p>No activity logs found</p>
                    </div>
                `;
            }

            return `
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
                                <div class="activity-meta">
                                    <span class="activity-user">
                                        <i class="fas fa-user"></i> ${this.escapeHtml(log.performedBy)}
                                    </span>
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
                        </div>
                    `).join('')}
                </div>
            `;
        }

        getActivityIcon(type) {
            const icons = {
                'user': 'fa-user',
                'subscription': 'fa-credit-card',
                'system': 'fa-cog',
                'login': 'fa-sign-in-alt',
                'security': 'fa-shield-alt',
                'default': 'fa-info-circle'
            };
            return icons[type.toLowerCase()] || icons.default;
        }

        toggleActivityDetails(button) {
            const detailsDiv = button.nextElementSibling;
            const isHidden = detailsDiv.classList.contains('hidden');
            
            detailsDiv.classList.toggle('hidden');
            button.textContent = isHidden ? 'Hide Details' : 'Show Details';
        }

        filterActivityLogs() {
            const type = document.getElementById('activityTypeFilter').value;
            const date = document.getElementById('activityDateFilter').value;
            
            const items = document.querySelectorAll('.activity-item');
            items.forEach(item => {
                const matchesType = !type || item.classList.contains(type);
                const matchesDate = !date || this.checkActivityDate(item, date);
                item.style.display = matchesType && matchesDate ? '' : 'none';
            });
        }

        checkActivityDate(item, filterDate) {
            const activityDate = item.querySelector('.activity-date').textContent;
            const itemDate = new Date(activityDate).toLocaleDateString();
            const compareDate = new Date(filterDate).toLocaleDateString();
            return itemDate === compareDate;
        }

        // Utility Methods
        getHeaders() {
            return {
                'Authorization': `Bearer ${this.token}`,
                'Content-Type': 'application/json'
            };
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

        showWarning(message) {
            if (window.dashboardApp?.userInterface) {
                window.dashboardApp.userInterface.showWarningNotification(message);
            } else {
                console.warn(message);
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
            // Reset all forms
            document.querySelectorAll('form').forEach(form => {
                form.reset();
            });

            // Clear any stored IDs
            this.currentCompanyId = null;
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

(function() {
    // Check if UsersManager already exists
    if (window.UsersManager) {
        return; // Exit if already defined
    }

class CompaniesManager {
    constructor() {
        this.apiBaseUrl = 'https://18.215.160.136.nip.io/api';
        this.currentPage = 1;
        this.itemsPerPage = 10;
        this.totalItems = 0;
        this.companies = [];
        this.filters = {
            search: '',
            industry: '',
            status: '',
            plan: ''
        };
        this.sortField = 'createdAt';
        this.sortOrder = 'desc';
        this.selectedCompanyId = null;
        this.industries = new Set();
        
        this.initializeEventListeners();
        this.loadCompanies();
        this.loadStatistics();
    }

    async initializeEventListeners() {
        // Add Company Button
        document.getElementById('addCompanyBtn')?.addEventListener('click', () => {
            this.showCompanyModal();
        });

        // Search Input
        document.getElementById('companySearch')?.addEventListener('input', debounce((e) => {
            this.filters.search = e.target.value;
            this.currentPage = 1;
            this.loadCompanies();
        }, 300));

        // Filters
        ['industry', 'status', 'plan'].forEach(filter => {
            document.getElementById(`${filter}Filter`)?.addEventListener('change', (e) => {
                this.filters[filter] = e.target.value;
                this.currentPage = 1;
                this.loadCompanies();
            });
        });

        // Clear Filters
        document.getElementById('clearFiltersBtn')?.addEventListener('click', () => {
            this.clearFilters();
        });

        // Pagination
        document.getElementById('itemsPerPage')?.addEventListener('change', (e) => {
            this.itemsPerPage = parseInt(e.target.value);
            this.currentPage = 1;
            this.loadCompanies();
        });

        document.getElementById('prevPage')?.addEventListener('click', () => {
            if (this.currentPage > 1) {
                this.currentPage--;
                this.loadCompanies();
            }
        });

        document.getElementById('nextPage')?.addEventListener('click', () => {
            if (this.currentPage < Math.ceil(this.totalItems / this.itemsPerPage)) {
                this.currentPage++;
                this.loadCompanies();
            }
        });

        // Export Data
        document.getElementById('exportDataBtn')?.addEventListener('click', () => {
            this.exportData();
        });

        // Refresh Data
        document.getElementById('refreshDataBtn')?.addEventListener('click', () => {
            this.loadCompanies(true);
            this.loadStatistics();
        });

        // Company Form
        document.getElementById('companyForm')?.addEventListener('submit', (e) => {
            e.preventDefault();
            this.saveCompany();
        });

        // Modal Close Buttons
        document.querySelectorAll('.close-modal, [data-dismiss="modal"]').forEach(button => {
            button.addEventListener('click', () => {
                this.closeModals();
            });
        });

        // Table Selection
        document.getElementById('selectAllCompanies')?.addEventListener('change', (e) => {
            this.toggleAllCompanies(e.target.checked);
        });

        // Tab Navigation
        document.querySelectorAll('.tab-btn').forEach(button => {
            button.addEventListener('click', (e) => {
                this.switchTab(e.target.dataset.tab);
            });
        });

        // Close modals when clicking outside
        window.addEventListener('click', (e) => {
            if (e.target.classList.contains('modal')) {
                this.closeModals();
            }
        });

        // Handle escape key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.closeModals();
            }
        });
    }

    // Utility function for debouncing
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

    clearFilters() {
        this.filters = {
            search: '',
            industry: '',
            status: '',
            plan: ''
        };

        // Reset filter inputs
        document.getElementById('companySearch').value = '';
        document.getElementById('industryFilter').value = '';
        document.getElementById('statusFilter').value = '';
        document.getElementById('planFilter').value = '';

        this.currentPage = 1;
        this.loadCompanies();
    }

    async loadStatistics() {
        try {
            const response = await this.makeRequest('/companies/statistics', 'GET');
            
            if (response.success) {
                const stats = response.statistics;
                
                // Update statistics cards
                document.getElementById('totalCompanies').textContent = stats.total || 0;
                document.getElementById('activeCompanies').textContent = stats.active || 0;
                document.getElementById('pendingRenewals').textContent = stats.pendingRenewals || 0;
                document.getElementById('inactiveCompanies').textContent = stats.inactive || 0;

                // Animate numbers
                this.animateNumbers();
            }
        } catch (error) {
            console.error('Error loading statistics:', error);
            this.showNotification('Error loading statistics', 'error');
        }
    }

    animateNumbers() {
        document.querySelectorAll('.stat-details h3').forEach(element => {
            const finalValue = parseInt(element.textContent);
            this.animateValue(element, 0, finalValue, 1000);
        });
    }

    animateValue(element, start, end, duration) {
        const range = end - start;
        const increment = end > start ? 1 : -1;
        const stepTime = Math.abs(Math.floor(duration / range));
        let current = start;
        
        const timer = setInterval(() => {
            current += increment;
            element.textContent = current;
            if (current === end) {
                clearInterval(timer);
            }
        }, stepTime);
    }
      async loadCompanies(showLoader = true) {
        try {
            if (showLoader) {
                this.showTableLoader();
            }

            const queryParams = new URLSearchParams({
                page: this.currentPage,
                limit: this.itemsPerPage,
                sortField: this.sortField,
                sortOrder: this.sortOrder,
                ...this.filters
            });

            const response = await this.makeRequest(`/companies?${queryParams}`, 'GET');

            if (response.success) {
                this.companies = response.data.companies;
                this.totalItems = response.data.pagination.total;
                this.updatePagination();
                this.renderCompaniesTable();
                this.updateIndustryFilter(response.data.filters.industries);
            }
        } catch (error) {
            console.error('Error loading companies:', error);
            this.showNotification('Error loading companies', 'error');
        } finally {
            if (showLoader) {
                this.hideTableLoader();
            }
        }
    }

    renderCompaniesTable() {
        const tbody = document.getElementById('companiesTableBody');
        tbody.innerHTML = '';

        if (this.companies.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="8" class="text-center py-4">
                        <div class="empty-state">
                            <i class="fas fa-building text-muted"></i>
                            <p>No companies found</p>
                        </div>
                    </td>
                </tr>
            `;
            return;
        }

        this.companies.forEach(company => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>
                    <input type="checkbox" class="company-checkbox" 
                           data-company-id="${company._id}">
                </td>
                <td>
                    <div class="company-name-cell">
                        <div class="company-avatar">
                            ${this.getCompanyInitials(company.name)}
                        </div>
                        <div class="company-info">
                            <div class="company-name">${this.escapeHtml(company.name)}</div>
                            <div class="company-email">${this.escapeHtml(company.contactDetails.email)}</div>
                        </div>
                    </div>
                </td>
                <td>${this.escapeHtml(company.industry)}</td>
                <td>
                    <div class="user-count">
                        <i class="fas fa-users"></i>
                        ${company.metrics.users.total}
                    </div>
                </td>
                <td>
                    <div class="subscription-info">
                        <span class="plan-badge ${company.subscription.plan.toLowerCase()}">
                            ${company.subscription.plan}
                        </span>
                        <span class="subscription-status ${company.subscription.status}">
                            ${this.formatSubscriptionStatus(company.subscription)}
                        </span>
                    </div>
                </td>
                <td>
                    <span class="status-badge status-${company.status.toLowerCase()}">
                        <i class="fas fa-circle"></i>
                        ${this.capitalizeFirstLetter(company.status)}
                    </span>
                </td>
                <td>
                    <div class="last-active">
                        <i class="fas fa-clock"></i>
                        ${this.formatLastActive(company.lastActivity)}
                    </div>
                </td>
                <td>
                    <div class="action-buttons">
                        <button class="btn-icon" title="View Details"
                                onclick="companiesManager.viewCompanyDetails('${company._id}')">
                            <i class="fas fa-eye"></i>
                        </button>
                        <button class="btn-icon" title="Edit Company"
                                onclick="companiesManager.editCompany('${company._id}')">
                            <i class="fas fa-edit"></i>
                        </button>
                        <div class="dropdown">
                            <button class="btn-icon" title="More Actions">
                                <i class="fas fa-ellipsis-v"></i>
                            </button>
                            <div class="dropdown-menu">
                                <a href="#" onclick="companiesManager.toggleCompanyStatus('${company._id}')">
                                    ${company.status === 'active' ? 'Deactivate' : 'Activate'}
                                </a>
                                <a href="#" onclick="companiesManager.resetAdminPassword('${company._id}')">
                                    Reset Admin Password
                                </a>
                                <a href="#" onclick="companiesManager.backupCompanyData('${company._id}')">
                                    Backup Data
                                </a>
                                <div class="dropdown-divider"></div>
                                <a href="#" class="text-danger" 
                                   onclick="companiesManager.deleteCompany('${company._id}')">
                                    Delete Company
                                </a>
                            </div>
                        </div>
                    </div>
                </td>
            `;
            tbody.appendChild(tr);
        });

        // Initialize dropdowns
        this.initializeDropdowns();
    }

    updatePagination() {
        const totalPages = Math.ceil(this.totalItems / this.itemsPerPage);
        const startRange = ((this.currentPage - 1) * this.itemsPerPage) + 1;
        const endRange = Math.min(startRange + this.itemsPerPage - 1, this.totalItems);

        // Update range text
        document.getElementById('startRange').textContent = this.totalItems ? startRange : 0;
        document.getElementById('endRange').textContent = endRange;
        document.getElementById('totalItems').textContent = this.totalItems;

        // Update pagination buttons
        document.getElementById('prevPage').disabled = this.currentPage === 1;
        document.getElementById('nextPage').disabled = this.currentPage === totalPages;

        // Generate page numbers
        const pageNumbers = document.getElementById('pageNumbers');
        pageNumbers.innerHTML = '';

        let startPage = Math.max(1, this.currentPage - 2);
        let endPage = Math.min(totalPages, startPage + 4);

        if (endPage - startPage < 4) {
            startPage = Math.max(1, endPage - 4);
        }

        if (startPage > 1) {
            this.addPageButton(pageNumbers, 1);
            if (startPage > 2) {
                pageNumbers.appendChild(this.createEllipsis());
            }
        }

        for (let i = startPage; i <= endPage; i++) {
            this.addPageButton(pageNumbers, i);
        }

        if (endPage < totalPages) {
            if (endPage < totalPages - 1) {
                pageNumbers.appendChild(this.createEllipsis());
            }
            this.addPageButton(pageNumbers, totalPages);
        }
    }

    addPageButton(container, pageNum) {
        const button = document.createElement('button');
        button.textContent = pageNum;
        button.classList.toggle('active', pageNum === this.currentPage);
        button.addEventListener('click', () => {
            this.currentPage = pageNum;
            this.loadCompanies();
        });
        container.appendChild(button);
    }

    createEllipsis() {
        const span = document.createElement('span');
        span.className = 'pagination-ellipsis';
        span.textContent = '...';
        return span;
    }

    updateIndustryFilter(industries) {
        const select = document.getElementById('industryFilter');
        const currentValue = select.value;

        // Store new industries in the Set
        industries.forEach(industry => this.industries.add(industry));

        // Clear existing options except the first one
        while (select.options.length > 1) {
            select.remove(1);
        }

        // Add sorted industries
        Array.from(this.industries)
            .sort()
            .forEach(industry => {
                const option = new Option(industry, industry);
                select.add(option);
            });

        // Restore selected value
        select.value = currentValue;
    }

    showTableLoader() {
        const tbody = document.getElementById('companiesTableBody');
        tbody.innerHTML = `
            <tr>
                <td colspan="8" class="text-center py-4">
                    <div class="loader">
                        <i class="fas fa-spinner fa-spin"></i>
                        <p>Loading companies...</p>
                    </div>
                </td>
            </tr>
        `;
    }

    hideTableLoader() {
        // Table content will be replaced by renderCompaniesTable
    }

    initializeDropdowns() {
        document.querySelectorAll('.dropdown').forEach(dropdown => {
            const button = dropdown.querySelector('.btn-icon');
            const menu = dropdown.querySelector('.dropdown-menu');

            button.addEventListener('click', (e) => {
                e.stopPropagation();
                menu.classList.toggle('show');
            });
        });

        // Close dropdowns when clicking outside
        document.addEventListener('click', () => {
            document.querySelectorAll('.dropdown-menu.show').forEach(menu => {
                menu.classList.remove('show');
            });
        });
    }
      async showCompanyModal(companyId = null) {
        this.selectedCompanyId = companyId;
        const modal = document.getElementById('companyModal');
        const modalTitle = document.getElementById('modalTitle');
        const form = document.getElementById('companyForm');

        modalTitle.textContent = companyId ? 'Edit Company' : 'Add New Company';

        if (companyId) {
            try {
                const response = await this.makeRequest(`/companies/${companyId}`, 'GET');
                if (response.success) {
                    this.populateCompanyForm(response.data);
                }
            } catch (error) {
                console.error('Error fetching company details:', error);
                this.showNotification('Error fetching company details', 'error');
                return;
            }
        } else {
            form.reset();
        }

        modal.classList.add('show');
        document.body.style.overflow = 'hidden';

        // Focus first input
        const firstInput = form.querySelector('input:not([type="hidden"])');
        if (firstInput) {
            firstInput.focus();
        }
    }

    populateCompanyForm(company) {
        const form = document.getElementById('companyForm');
        
        // Basic Details
        form.querySelector('#companyName').value = company.name;
        form.querySelector('#industry').value = company.industry;
        form.querySelector('#companySize').value = company.size;
        form.querySelector('#subscriptionPlan').value = company.subscription.plan;
        
        // Contact Details
        form.querySelector('#contactEmail').value = company.contactDetails.email;
        form.querySelector('#contactPhone').value = company.contactDetails.phone || '';
        form.querySelector('#address').value = company.contactDetails.address || '';
        
        // Admin Details (if editing, these might be disabled)
        const adminEmailInput = form.querySelector('#adminEmail');
        const adminNameInput = form.querySelector('#adminName');
        if (this.selectedCompanyId) {
            adminEmailInput.disabled = true;
            adminNameInput.disabled = true;
            adminEmailInput.value = company.adminEmail || '';
            adminNameInput.value = company.adminName || '';
        } else {
            adminEmailInput.disabled = false;
            adminNameInput.disabled = false;
        }

        // Status
        form.querySelector('#status').value = company.status;
    }

    async saveCompany() {
        try {
            const form = document.getElementById('companyForm');
            const formData = new FormData(form);
            const data = Object.fromEntries(formData);

            // Validate form data
            if (!this.validateCompanyForm(data)) {
                return;
            }

            // Structure the data according to API requirements
            const companyData = {
                name: data.name,
                industry: data.industry,
                size: parseInt(data.size),
                contactDetails: {
                    email: data.contactEmail,
                    phone: data.contactPhone,
                    address: data.address
                },
                subscription: {
                    plan: data.subscriptionPlan
                },
                status: data.status,
                adminDetails: {
                    name: data.adminName,
                    email: data.adminEmail
                },
                sendWelcomeEmail: data.sendWelcomeEmail === 'on'
            };

            let response;
            if (this.selectedCompanyId) {
                response = await this.makeRequest(
                    `/companies/${this.selectedCompanyId}`,
                    'PUT',
                    companyData
                );
            } else {
                response = await this.makeRequest('/companies', 'POST', companyData);
            }

            if (response.success) {
                this.showNotification(
                    `Company ${this.selectedCompanyId ? 'updated' : 'created'} successfully`,
                    'success'
                );
                this.closeModals();
                this.loadCompanies();
                this.loadStatistics();
            }
        } catch (error) {
            console.error('Error saving company:', error);
            this.showNotification(
                `Error ${this.selectedCompanyId ? 'updating' : 'creating'} company`,
                'error'
            );
        }
    }

    validateCompanyForm(data) {
        // Company name validation
        if (!data.name || data.name.length < 2) {
            this.showNotification('Company name must be at least 2 characters long', 'error');
            return false;
        }

        // Email validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(data.contactEmail)) {
            this.showNotification('Please enter a valid contact email', 'error');
            return false;
        }

        // Validate company domain email
        if (this.isGenericEmail(data.contactEmail)) {
            this.showNotification('Please use a company domain email', 'error');
            return false;
        }

        // Company size validation
        if (parseInt(data.size) <= 0) {
            this.showNotification('Company size must be greater than 0', 'error');
            return false;
        }

        // Admin email validation
        if (!this.selectedCompanyId) { // Only validate for new companies
            if (!emailRegex.test(data.adminEmail)) {
                this.showNotification('Please enter a valid admin email', 'error');
                return false;
            }
            if (this.isGenericEmail(data.adminEmail)) {
                this.showNotification('Please use a company domain email for admin', 'error');
                return false;
            }
        }

        return true;
    }

    isGenericEmail(email) {
        const genericDomains = [
            'gmail.com', 'yahoo.com', 'hotmail.com', 
            'outlook.com', 'aol.com', 'icloud.com'
        ];
        const domain = email.split('@')[1].toLowerCase();
        return genericDomains.includes(domain);
    }

    async viewCompanyDetails(companyId) {
        try {
            const response = await this.makeRequest(`/companies/${companyId}`, 'GET');
            if (response.success) {
                this.selectedCompanyId = companyId;
                this.showCompanyDetailsModal(response.data);
            }
        } catch (error) {
            console.error('Error fetching company details:', error);
            this.showNotification('Error fetching company details', 'error');
        }
    }

    showCompanyDetailsModal(company) {
        const modal = document.getElementById('companyDetailsModal');
        
        // Populate overview tab
        document.getElementById('overview').innerHTML = this.generateOverviewContent(company);
        
        // Populate users tab
        document.getElementById('users').innerHTML = this.generateUsersContent(company);
        
        // Populate subscription tab
        document.getElementById('subscription').innerHTML = this.generateSubscriptionContent(company);
        
        // Populate activity tab
        document.getElementById('activity').innerHTML = this.generateActivityContent(company);

        modal.classList.add('show');
        document.body.style.overflow = 'hidden';

        // Initialize any charts or additional features
        this.initializeCompanyDetailsCharts(company);
    }

    generateOverviewContent(company) {
        return `
            <div class="company-overview">
                <div class="company-header">
                    <div class="company-avatar large">
                        ${this.getCompanyInitials(company.name)}
                    </div>
                    <div class="company-info">
                        <h2>${this.escapeHtml(company.name)}</h2>
                        <p class="industry">${this.escapeHtml(company.industry)}</p>
                        <span class="status-badge status-${company.status.toLowerCase()}">
                            ${this.capitalizeFirstLetter(company.status)}
                        </span>
                    </div>
                </div>

                <div class="info-grid">
                    <div class="info-card">
                        <h3>Contact Information</h3>
                        <div class="info-item">
                            <i class="fas fa-envelope"></i>
                            <span>${this.escapeHtml(company.contactDetails.email)}</span>
                        </div>
                        <div class="info-item">
                            <i class="fas fa-phone"></i>
                            <span>${this.escapeHtml(company.contactDetails.phone || 'N/A')}</span>
                        </div>
                        <div class="info-item">
                            <i class="fas fa-map-marker-alt"></i>
                            <span>${this.escapeHtml(company.contactDetails.address || 'N/A')}</span>
                        </div>
                    </div>

                    <div class="info-card">
                        <h3>Company Metrics</h3>
                        <div class="metrics-grid">
                            <div class="metric">
                                <span class="metric-value">${company.metrics.users.total}</span>
                                <span class="metric-label">Total Users</span>
                            </div>
                            <div class="metric">
                                <span class="metric-value">${company.metrics.users.active}</span>
                                <span class="metric-label">Active Users</span>
                            </div>
                            <div class="metric">
                                <span class="metric-value">${company.metrics.departments.total}</span>
                                <span class="metric-label">Departments</span>
                            </div>
                            <div class="metric">
                                <span class="metric-value">${this.formatStorageSize(company.metrics.storage)}</span>
                                <span class="metric-label">Storage Used</span>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="chart-container">
                    <canvas id="activityChart"></canvas>
                </div>
            </div>
        `;
    }
      generateUsersContent(company) {
        const users = company.users || [];
        return `
            <div class="users-section">
                <div class="section-header">
                    <h3>Company Users</h3>
                    <button class="btn btn-outline" onclick="companiesManager.showAddUserModal('${company._id}')">
                        <i class="fas fa-user-plus"></i> Add User
                    </button>
                </div>

                <div class="users-stats">
                    <div class="stat-item">
                        <span class="stat-value">${company.metrics.users.total}</span>
                        <span class="stat-label">Total Users</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-value">${company.metrics.users.active}</span>
                        <span class="stat-label">Active Users</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-value">${company.subscription.limits.users}</span>
                        <span class="stat-label">User Limit</span>
                    </div>
                </div>

                <div class="users-table-container">
                    <table class="users-table">
                        <thead>
                            <tr>
                                <th>User</th>
                                <th>Role</th>
                                <th>Status</th>
                                <th>Last Login</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${users.map(user => this.generateUserRow(user)).join('')}
                        </tbody>
                    </table>
                </div>
            </div>
        `;
    }

    generateUserRow(user) {
        return `
            <tr>
                <td>
                    <div class="user-info">
                        <div class="user-avatar">
                            ${this.getUserInitials(user.name || user.email)}
                        </div>
                        <div class="user-details">
                            <div class="user-name">${this.escapeHtml(user.name || 'N/A')}</div>
                            <div class="user-email">${this.escapeHtml(user.email)}</div>
                        </div>
                    </div>
                </td>
                <td>
                    <span class="role-badge ${user.role.toLowerCase()}">
                        ${this.capitalizeFirstLetter(user.role)}
                    </span>
                </td>
                <td>
                    <span class="status-badge status-${user.status.toLowerCase()}">
                        ${this.capitalizeFirstLetter(user.status)}
                    </span>
                </td>
                <td>
                    <div class="last-login">
                        <i class="fas fa-clock"></i>
                        ${this.formatLastActive(user.lastLogin)}
                    </div>
                </td>
                <td>
                    <div class="action-buttons">
                        <button class="btn-icon" onclick="companiesManager.editUser('${user._id}')"
                                title="Edit User">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn-icon" onclick="companiesManager.resetUserPassword('${user._id}')"
                                title="Reset Password">
                            <i class="fas fa-key"></i>
                        </button>
                        <button class="btn-icon ${user.status === 'active' ? 'text-danger' : 'text-success'}"
                                onclick="companiesManager.toggleUserStatus('${user._id}')"
                                title="${user.status === 'active' ? 'Deactivate' : 'Activate'} User">
                            <i class="fas fa-${user.status === 'active' ? 'ban' : 'check-circle'}"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `;
    }

    generateSubscriptionContent(company) {
        const subscription = company.subscription;
        return `
            <div class="subscription-section">
                <div class="section-header">
                    <h3>Subscription Details</h3>
                    <button class="btn btn-outline" 
                            onclick="companiesManager.showChangePlanModal('${company._id}')">
                        <i class="fas fa-edit"></i> Change Plan
                    </button>
                </div>

                <div class="subscription-details">
                    <div class="plan-info">
                        <div class="current-plan">
                            <span class="plan-badge ${subscription.plan.toLowerCase()}">
                                ${subscription.plan}
                            </span>
                            <span class="plan-price">
                                ${this.formatCurrency(subscription.price)} / month
                            </span>
                        </div>
                        <div class="plan-dates">
                            <div class="date-item">
                                <span class="label">Start Date:</span>
                                <span class="value">${this.formatDate(subscription.startDate)}</span>
                            </div>
                            <div class="date-item">
                                <span class="label">Next Billing:</span>
                                <span class="value">${this.formatDate(subscription.nextBillingDate)}</span>
                            </div>
                        </div>
                    </div>

                    <div class="usage-metrics">
                        <h4>Resource Usage</h4>
                        <div class="usage-grid">
                            ${this.generateUsageMetrics(subscription.usage)}
                        </div>
                    </div>

                    <div class="billing-history">
                        <h4>Billing History</h4>
                        <table class="billing-table">
                            <thead>
                                <tr>
                                    <th>Date</th>
                                    <th>Description</th>
                                    <th>Amount</th>
                                    <th>Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${this.generateBillingHistory(company.billingHistory)}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        `;
    }

    generateUsageMetrics(usage) {
        return Object.entries(usage).map(([resource, data]) => `
            <div class="usage-item">
                <div class="usage-header">
                    <span class="resource-name">${this.formatResourceName(resource)}</span>
                    <span class="usage-value">
                        ${data.current} / ${data.limit === null ? '∞' : data.limit}
                    </span>
                </div>
                <div class="usage-bar">
                    <div class="progress-bar" style="width: ${this.calculateUsagePercentage(data)}%"></div>
                </div>
                <div class="usage-footer">
                    <span class="usage-percent">
                        ${this.calculateUsagePercentage(data)}% used
                    </span>
                </div>
            </div>
        `).join('');
    }

    generateBillingHistory(history = []) {
        if (!history.length) {
            return `
                <tr>
                    <td colspan="4" class="text-center">No billing history available</td>
                </tr>
            `;
        }

        return history.map(item => `
            <tr>
                <td>${this.formatDate(item.date)}</td>
                <td>${this.escapeHtml(item.description)}</td>
                <td>${this.formatCurrency(item.amount)}</td>
                <td>
                    <span class="payment-status ${item.status.toLowerCase()}">
                        ${this.capitalizeFirstLetter(item.status)}
                    </span>
                </td>
            </tr>
        `).join('');
    }

    generateActivityContent(company) {
        return `
            <div class="activity-section">
                <div class="section-header">
                    <h3>Activity Log</h3>
                    <div class="activity-filters">
                        <select id="activityTypeFilter" class="filter-select">
                            <option value="">All Activities</option>
                            <option value="user">User Activities</option>
                            <option value="system">System Activities</option>
                            <option value="security">Security Events</option>
                        </select>
                        <input type="date" id="activityDateFilter" class="date-filter">
                    </div>
                </div>

                <div class="activity-timeline">
                    ${this.generateActivityTimeline(company.activityLogs)}
                </div>

                <div class="activity-stats">
                    <div class="stats-grid">
                        ${this.generateActivityStats(company.analytics)}
                    </div>
                    <div class="chart-container">
                        <canvas id="activityTrendsChart"></canvas>
                    </div>
                </div>
            </div>
        `;
    }

    generateActivityTimeline(activities = []) {
        if (!activities.length) {
            return `
                <div class="empty-timeline">
                    <i class="fas fa-history"></i>
                    <p>No activity recorded yet</p>
                </div>
            `;
        }

        return activities.map(activity => `
            <div class="timeline-item ${activity.type.toLowerCase()}">
                <div class="timeline-icon">
                    ${this.getActivityIcon(activity.type)}
                </div>
                <div class="timeline-content">
                    <div class="activity-header">
                        <span class="activity-type">
                            ${this.formatActivityType(activity.type)}
                        </span>
                        <span class="activity-time">
                            ${this.formatTimeAgo(activity.timestamp)}
                        </span>
                    </div>
                    <p class="activity-description">
                        ${this.formatActivityDescription(activity)}
                    </p>
                    <div class="activity-meta">
                        <span class="activity-user">
                            <i class="fas fa-user"></i>
                            ${this.escapeHtml(activity.performedBy.name || 'System')}
                        </span>
                        ${activity.details ? this.generateActivityDetails(activity.details) : ''}
                    </div>
                </div>
            </div>
        `).join('');
    }
      // Utility Functions
    formatDate(dateString) {
        if (!dateString) return 'N/A';
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    }

    formatTimeAgo(timestamp) {
        if (!timestamp) return 'N/A';
        
        const seconds = Math.floor((new Date() - new Date(timestamp)) / 1000);
        
        let interval = seconds / 31536000;
        if (interval > 1) return Math.floor(interval) + ' years ago';
        
        interval = seconds / 2592000;
        if (interval > 1) return Math.floor(interval) + ' months ago';
        
        interval = seconds / 86400;
        if (interval > 1) return Math.floor(interval) + ' days ago';
        
        interval = seconds / 3600;
        if (interval > 1) return Math.floor(interval) + ' hours ago';
        
        interval = seconds / 60;
        if (interval > 1) return Math.floor(interval) + ' minutes ago';
        
        return 'just now';
    }

    formatCurrency(amount) {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD'
        }).format(amount);
    }

    formatStorageSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    calculateUsagePercentage(data) {
        if (!data.limit) return 0;
        return Math.min(Math.round((data.current / data.limit) * 100), 100);
    }

    getCompanyInitials(name) {
        return name
            .split(' ')
            .map(word => word[0])
            .join('')
            .toUpperCase()
            .slice(0, 2);
    }

    getUserInitials(name) {
        return name
            .split(' ')
            .map(word => word[0])
            .join('')
            .toUpperCase()
            .slice(0, 2);
    }

    escapeHtml(unsafe) {
        return unsafe
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }

    // Chart Initialization
    initializeCompanyDetailsCharts(company) {
        this.initializeActivityChart(company.analytics.activity);
        this.initializeUserTrendsChart(company.analytics.users);
        this.initializeResourceUsageChart(company.subscription.usage);
    }

    initializeActivityChart(activityData) {
        const ctx = document.getElementById('activityChart').getContext('2d');
        
        if (this.activityChart) {
            this.activityChart.destroy();
        }

        this.activityChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: activityData.timeline.map(item => item.date),
                datasets: [{
                    label: 'User Activity',
                    data: activityData.timeline.map(item => item.count),
                    borderColor: 'rgb(75, 192, 192)',
                    tension: 0.1,
                    fill: false
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            precision: 0
                        }
                    }
                },
                plugins: {
                    legend: {
                        display: false
                    },
                    tooltip: {
                        mode: 'index',
                        intersect: false
                    }
                }
            }
        });
    }

    // API Request Handler
    async makeRequest(endpoint, method = 'GET', data = null) {
        try {
            const token = localStorage.getItem('token');
            if (!token) {
                throw new Error('No authentication token found');
            }

            const headers = {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            };

            const config = {
                method,
                headers,
                credentials: 'include'
            };

            if (data && (method === 'POST' || method === 'PUT')) {
                config.body = JSON.stringify(data);
            }

            const response = await fetch(`${this.apiBaseUrl}${endpoint}`, config);
            const responseData = await response.json();

            if (!response.ok) {
                throw new Error(responseData.message || 'API request failed');
            }

            return responseData;
        } catch (error) {
            console.error('API Request Error:', error);
            throw error;
        }
    }

    // Notification System
    showNotification(message, type = 'info') {
        const event = new CustomEvent('showNotification', {
            detail: { message, type }
        });
        document.dispatchEvent(event);
    }

    // Export Functionality
    async exportData() {
        try {
            const response = await this.makeRequest('/companies/export', 'GET');
            
            if (response.success && response.data) {
                const blob = new Blob([JSON.stringify(response.data, null, 2)], {
                    type: 'application/json'
                });
                
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `companies_export_${new Date().toISOString().split('T')[0]}.json`;
                document.body.appendChild(a);
                a.click();
                window.URL.revokeObjectURL(url);
                document.body.removeChild(a);

                this.showNotification('Data exported successfully', 'success');
            }
        } catch (error) {
            console.error('Export error:', error);
            this.showNotification('Error exporting data', 'error');
        }
    }

    // Cleanup
    cleanup() {
        // Remove event listeners
        document.removeEventListener('click', this.handleOutsideClick);
        
        // Destroy charts
        if (this.activityChart) {
            this.activityChart.destroy();
        }
        
        // Clear intervals/timeouts
        if (this.refreshInterval) {
            clearInterval(this.refreshInterval);
        }
    }
}
}
// Initialize the Companies Manager
document.addEventListener('DOMContentLoaded', () => {
    window.companiesManager = new CompaniesManager();
});

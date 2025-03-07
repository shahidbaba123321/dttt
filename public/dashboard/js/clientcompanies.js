(function() {
    // Check if CompaniesManager already exists
    if (window.CompaniesManager) {
        return; // Exit if already defined
    }

    class CompaniesManager {
        constructor(apiBaseUrl) {
            // API Configuration
            this.apiBaseUrl = apiBaseUrl || 'https://18.215.160.136.nip.io/api';
            
            // State Management
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

            // Add loader styles
            this.addLoaderStyles();
            
            // Initialize after DOM is ready
            if (document.readyState === 'loading') {
                document.addEventListener('DOMContentLoaded', () => this.initialize());
            } else {
                this.initialize();
            }
        }

        addLoaderStyles() {
            const styles = `
                .table-loader {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    padding: 2rem;
                    background: var(--bg-primary);
                }
                .table-loader i {
                    font-size: 2rem;
                    color: var(--primary-color);
                    margin-bottom: 1rem;
                }
                .table-loader p {
                    color: var(--text-secondary);
                    margin: 0;
                }
                .loading-row {
                    background: var(--bg-secondary);
                }
                .empty-state {
                    text-align: center;
                    padding: 2rem;
                }
                .empty-state i {
                    font-size: 3rem;
                    color: var(--text-tertiary);
                    margin-bottom: 1rem;
                }
                .error-state {
                    text-align: center;
                    padding: 2rem;
                }
                .error-state i {
                    font-size: 3rem;
                    color: var(--danger-color);
                    margin-bottom: 1rem;
                }
                .company-avatar {
                    width: 40px;
                    height: 40px;
                    border-radius: 8px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    color: white;
                    font-weight: 500;
                    font-size: 1.2rem;
                }
                .company-name-cell {
                    display: flex;
                    align-items: center;
                    gap: 1rem;
                }
                .company-info {
                    display: flex;
                    flex-direction: column;
                }
                .company-name {
                    font-weight: 500;
                    color: var(--text-primary);
                }
                .company-email {
                    font-size: 0.875rem;
                    color: var(--text-tertiary);
                }
                .status-badge {
                    display: inline-flex;
                    align-items: center;
                    gap: 0.5rem;
                    padding: 0.25rem 0.75rem;
                    border-radius: 9999px;
                    font-size: 0.875rem;
                    font-weight: 500;
                }
                .status-active {
                    background-color: #DEF7EC;
                    color: #03543F;
                }
                .status-inactive {
                    background-color: #FDE8E8;
                    color: #9B1C1C;
                }
                .status-suspended {
                    background-color: #FEF3C7;
                    color: #92400E;
                }
                .action-buttons {
                    display: flex;
                    gap: 0.5rem;
                    align-items: center;
                }
                .btn-icon {
                    padding: 0.5rem;
                    border: none;
                    background: none;
                    color: var(--text-secondary);
                    cursor: pointer;
                    border-radius: var(--border-radius-sm);
                    transition: all 0.2s;
                }
                .btn-icon:hover {
                    background-color: var(--bg-tertiary);
                    color: var(--primary-color);
                }
            `;

            const styleSheet = document.createElement('style');
            styleSheet.textContent = styles;
            document.head.appendChild(styleSheet);
        }

                initialize() {
            try {
                console.log('Initializing CompaniesManager...');
                this.initializeEventListeners();
                this.initializeModalHandlers(); // Add this line
                this.loadCompanies();
                
                if (document.getElementById('totalCompanies')) {
                    this.loadStatistics();
                }
            } catch (error) {
                console.error('Error initializing CompaniesManager:', error);
                this.showNotification('Error initializing companies module', 'error');
            }
        }
                initializeModalHandlers() {
            // Form submission handler
            const companyForm = document.getElementById('companyForm');
            if (companyForm) {
                companyForm.addEventListener('submit', (e) => {
                    e.preventDefault();
                    this.saveCompany();
                });
            }

            // Close modal handlers
            document.querySelectorAll('.close-modal, [data-dismiss="modal"]').forEach(button => {
                button.addEventListener('click', () => {
                    this.closeModals();
                });
            });

            // Close on outside click
            document.querySelectorAll('.modal').forEach(modal => {
                modal.addEventListener('click', (e) => {
                    if (e.target === modal) {
                        this.closeModals();
                    }
                });
            });

            // Initialize industry dropdown
            this.initializeIndustryDropdown();
        }

        async initializeIndustryDropdown() {
            const industrySelect = document.getElementById('industry');
            if (!industrySelect) return;

            const industries = [
                'Technology',
                'Healthcare',
                'Finance',
                'Education',
                'Manufacturing',
                'Retail',
                'Construction',
                'Transportation',
                'Energy',
                'Agriculture',
                'Entertainment',
                'Real Estate',
                'Hospitality',
                'Telecommunications',
                'Consulting',
                'Other'
            ];

            // Clear existing options except the first one
            while (industrySelect.options.length > 1) {
                industrySelect.remove(1);
            }

            // Add industry options
            industries.forEach(industry => {
                const option = new Option(industry, industry);
                industrySelect.add(option);
            });
        }

        closeModals() {
            document.querySelectorAll('.modal').forEach(modal => {
                modal.classList.remove('show');
            });
            document.body.style.overflow = '';

            // Reset form if it exists
            const form = document.getElementById('companyForm');
            if (form) {
                form.reset();
                // Re-enable admin fields
                const adminEmailInput = form.querySelector('#adminEmail');
                const adminNameInput = form.querySelector('#adminName');
                if (adminEmailInput) adminEmailInput.disabled = false;
                if (adminNameInput) adminNameInput.disabled = false;
            }
        }

        async initializeEventListeners() {
            // Add Company Button
            document.getElementById('addCompanyBtn')?.addEventListener('click', () => {
                this.showCompanyModal();
            });

            // Search Input
            document.getElementById('companySearch')?.addEventListener('input', 
                this.debounce((e) => {
                    this.filters.search = e.target.value;
                    this.currentPage = 1;
                    this.loadCompanies();
                }, 300)
            );

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

            // Items Per Page
            document.getElementById('itemsPerPage')?.addEventListener('change', (e) => {
                this.itemsPerPage = parseInt(e.target.value);
                this.currentPage = 1;
                this.loadCompanies();
            });

            // Pagination Navigation
            document.getElementById('prevPage')?.addEventListener('click', () => {
                if (this.currentPage > 1) {
                    this.currentPage--;
                    this.loadCompanies();
                }
            });

            document.getElementById('nextPage')?.addEventListener('click', () => {
                const totalPages = Math.ceil(this.totalItems / this.itemsPerPage);
                if (this.currentPage < totalPages) {
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

            async loadCompanies(showLoader = true) {
            try {
                if (showLoader) {
                    this.showTableLoader();
                }

                console.log('Loading companies with params:', {
                    page: this.currentPage,
                    limit: this.itemsPerPage,
                    sortField: this.sortField,
                    sortOrder: this.sortOrder,
                    ...this.filters
                });

                const queryParams = new URLSearchParams({
                    page: this.currentPage.toString(),
                    limit: this.itemsPerPage.toString(),
                    sortField: this.sortField,
                    sortOrder: this.sortOrder,
                    ...(this.filters.search && { search: this.filters.search }),
                    ...(this.filters.industry && { industry: this.filters.industry }),
                    ...(this.filters.status && { status: this.filters.status }),
                    ...(this.filters.plan && { plan: this.filters.plan })
                });

                const response = await this.makeRequest(`/companies?${queryParams}`, 'GET');

                if (response.success) {
                    console.log('Companies data received:', response.data);
                    
                    this.companies = response.data.companies || [];
                    this.totalItems = response.data.pagination.total || 0;

                    const tbody = document.getElementById('companiesTableBody');
                    if (tbody) {
                        if (this.companies.length === 0) {
                            tbody.innerHTML = this.getEmptyStateHtml();
                        } else {
                            this.renderCompaniesTable();
                        }

                        this.updatePagination();
                        
                        if (response.data.filters) {
                            this.updateFilters(response.data.filters);
                        }
                    }
                } else {
                    throw new Error(response.message || 'Failed to load companies');
                }
            } catch (error) {
                console.error('Error loading companies:', error);
                
                const tbody = document.getElementById('companiesTableBody');
                if (tbody) {
                    tbody.innerHTML = this.getErrorStateHtml();
                }

                this.showNotification('Error loading companies. Please try again.', 'error');
            } finally {
                if (showLoader) {
                    this.hideTableLoader();
                }
            }
        }

        getEmptyStateHtml() {
            return `
                <tr>
                    <td colspan="8" class="text-center py-4">
                        <div class="empty-state">
                            <i class="fas fa-building text-muted"></i>
                            <p>No companies found</p>
                            <button class="btn btn-primary mt-3" onclick="companiesManager.showCompanyModal()">
                                <i class="fas fa-plus"></i> Add New Company
                            </button>
                        </div>
                    </td>
                </tr>
            `;
        }

        getErrorStateHtml() {
            return `
                <tr>
                    <td colspan="8" class="text-center py-4">
                        <div class="error-state">
                            <i class="fas fa-exclamation-circle text-danger"></i>
                            <p>Error loading companies data</p>
                            <button class="btn btn-outline-primary btn-sm mt-2" 
                                    onclick="companiesManager.loadCompanies()">
                                <i class="fas fa-redo"></i> Retry
                            </button>
                        </div>
                    </td>
                </tr>
            `;
        }

        renderCompaniesTable() {
            const tbody = document.getElementById('companiesTableBody');
            if (!tbody) return;

            tbody.innerHTML = this.companies.map(company => `
                <tr>
                    <td>
                        <input type="checkbox" class="company-checkbox" 
                               data-company-id="${company._id}">
                    </td>
                    <td>
                        <div class="company-name-cell">
                            <div class="company-avatar" style="background-color: ${this.getCompanyColor(company.name)}">
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
                            ${company.metrics?.users || 0}
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
                </tr>
            `).join('');

            this.initializeDropdowns();
        }

        updateFilters(filters) {
            // Update industry filter
            const industrySelect = document.getElementById('industryFilter');
            if (industrySelect && filters.industries) {
                this.updateSelectOptions(industrySelect, filters.industries);
            }

            // Update plan filter
            const planSelect = document.getElementById('planFilter');
            if (planSelect && filters.plans) {
                this.updateSelectOptions(planSelect, filters.plans);
            }

            // Update status filter
            const statusSelect = document.getElementById('statusFilter');
            if (statusSelect && filters.statuses) {
                this.updateSelectOptions(statusSelect, filters.statuses);
            }
        }

        updateSelectOptions(select, options) {
            const currentValue = select.value;
            
            // Clear existing options except the first one
            while (select.options.length > 1) {
                select.remove(1);
            }

            // Add new options
            options.forEach(option => {
                const optionElement = new Option(option, option);
                select.add(optionElement);
            });

            // Restore selected value if it exists in new options
            if (options.includes(currentValue)) {
                select.value = currentValue;
            }
        }

        showTableLoader() {
            const tbody = document.getElementById('companiesTableBody');
            if (!tbody) return;

            tbody.innerHTML = `
                <tr>
                    <td colspan="8">
                        <div class="table-loader">
                            <i class="fas fa-spinner fa-spin"></i>
                            <p>Loading companies data...</p>
                        </div>
                    </td>
                </tr>
            `;
        }

        hideTableLoader() {
            // Table content will be replaced by renderCompaniesTable
        }

            updatePagination() {
            const totalPages = Math.ceil(this.totalItems / this.itemsPerPage);
            
            // Update range text
            document.getElementById('startRange').textContent = 
                this.totalItems ? ((this.currentPage - 1) * this.itemsPerPage) + 1 : 0;
            document.getElementById('endRange').textContent = 
                Math.min(this.currentPage * this.itemsPerPage, this.totalItems);
            document.getElementById('totalItems').textContent = this.totalItems;

            // Update pagination buttons
            const prevPageBtn = document.getElementById('prevPage');
            const nextPageBtn = document.getElementById('nextPage');
            if (prevPageBtn) prevPageBtn.disabled = this.currentPage === 1;
            if (nextPageBtn) nextPageBtn.disabled = this.currentPage === totalPages;

            // Generate page numbers
            this.renderPageNumbers(totalPages);
        }

        renderPageNumbers(totalPages) {
            const pageNumbers = document.getElementById('pageNumbers');
            if (!pageNumbers) return;

            pageNumbers.innerHTML = '';

            let startPage = Math.max(1, this.currentPage - 2);
            let endPage = Math.min(totalPages, startPage + 4);

            if (endPage - startPage < 4) {
                startPage = Math.max(1, endPage - 4);
            }

            // First page
            if (startPage > 1) {
                pageNumbers.appendChild(this.createPageButton(1));
                if (startPage > 2) {
                    pageNumbers.appendChild(this.createEllipsis());
                }
            }

            // Page numbers
            for (let i = startPage; i <= endPage; i++) {
                pageNumbers.appendChild(this.createPageButton(i));
            }

            // Last page
            if (endPage < totalPages) {
                if (endPage < totalPages - 1) {
                    pageNumbers.appendChild(this.createEllipsis());
                }
                pageNumbers.appendChild(this.createPageButton(totalPages));
            }
        }

        createPageButton(pageNum) {
            const button = document.createElement('button');
            button.textContent = pageNum;
            button.className = pageNum === this.currentPage ? 'active' : '';
            button.addEventListener('click', () => {
                this.currentPage = pageNum;
                this.loadCompanies();
            });
            return button;
        }

        createEllipsis() {
            const span = document.createElement('span');
            span.className = 'pagination-ellipsis';
            span.textContent = '...';
            return span;
        }

        async loadStatistics() {
            try {
                console.log('Loading company statistics...');
                const response = await this.makeRequest('/companies/overall-statistics', 'GET');
                
                if (response.success) {
                    const stats = response.statistics;
                    
                    // Update statistics cards if they exist
                    const statsMapping = {
                        'totalCompanies': stats.total || 0,
                        'activeCompanies': stats.active || 0,
                        'pendingRenewals': stats.pendingRenewals || 0,
                        'inactiveCompanies': stats.inactive || 0
                    };

                    Object.entries(statsMapping).forEach(([id, value]) => {
                        const element = document.getElementById(id);
                        if (element) {
                            element.textContent = value;
                            // Add animation if needed
                            this.animateNumber(element, 0, value, 1000);
                        }
                    });
                }
            } catch (error) {
                console.error('Error loading statistics:', error);
                // Update stats cards to show error state
                ['totalCompanies', 'activeCompanies', 'pendingRenewals', 'inactiveCompanies'].forEach(id => {
                    const element = document.getElementById(id);
                    if (element) {
                        element.textContent = '-';
                        element.parentElement.classList.add('error-state');
                    }
                });
            }
        }

        // Add this helper method for number animation
        animateNumber(element, start, end, duration) {
            if (start === end) return;
            
            const range = end - start;
            const increment = end > start ? 1 : -1;
            const stepTime = Math.abs(Math.floor(duration / range));
            let current = start;
            
            const timer = setInterval(() => {
                current += increment;
                element.textContent = current.toLocaleString();
                if (current === end) {
                    clearInterval(timer);
                }
            }, stepTime);
        }


        // Company Operations
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
                    contactEmail: data.contactEmail,        // Changed this
                    contactPhone: data.contactPhone,        // Changed this
                    address: data.address,                  // Changed this
                    subscriptionPlan: data.subscriptionPlan, // Changed this
                    adminEmail: data.adminEmail,            // Changed this
                    adminName: data.adminName,              // Changed this
                    status: data.status || 'active',
                    sendWelcomeEmail: data.sendWelcomeEmail === 'on'
                };

                // Log the data being sent
                console.log('Sending company data:', companyData);

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
                    `Error ${this.selectedCompanyId ? 'updating' : 'creating'} company: ${error.message}`,
                    'error'
                );
            }
        }

        validateCompanyForm(data) {
            // Company name validation
            if (!data.name?.trim()) {
                this.showNotification('Company name is required', 'error');
                return false;
            }

            if (data.name.length < 2) {
                this.showNotification('Company name must be at least 2 characters long', 'error');
                return false;
            }

            // Industry validation
            if (!data.industry) {
                this.showNotification('Industry is required', 'error');
                return false;
            }

            // Company size validation
            if (!data.size || parseInt(data.size) <= 0) {
                this.showNotification('Company size must be greater than 0', 'error');
                return false;
            }

            // Subscription plan validation
            if (!data.subscriptionPlan) {
                this.showNotification('Subscription plan is required', 'error');
                return false;
            }

            // Contact email validation
            if (!data.contactEmail) {
                this.showNotification('Contact email is required', 'error');
                return false;
            }

            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(data.contactEmail)) {
                this.showNotification('Please enter a valid contact email', 'error');
                return false;
            }

            if (this.isGenericEmail(data.contactEmail)) {
                this.showNotification('Please use a company domain email for contact', 'error');
                return false;
            }

            // Admin details validation for new companies
            if (!this.selectedCompanyId) {
                if (!data.adminName) {
                    this.showNotification('Admin name is required', 'error');
                    return false;
                }

                if (!data.adminEmail) {
                    this.showNotification('Admin email is required', 'error');
                    return false;
                }

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
            // Utility Functions
        isGenericEmail(email) {
            const genericDomains = [
                'gmail.com', 'yahoo.com', 'hotmail.com', 
                'outlook.com', 'aol.com', 'icloud.com'
            ];
            const domain = email.split('@')[1].toLowerCase();
            return genericDomains.includes(domain);
        }

        getCompanyInitials(name) {
            return name
                .split(' ')
                .map(word => word[0])
                .join('')
                .toUpperCase()
                .slice(0, 2);
        }

        getCompanyColor(name) {
            let hash = 0;
            for (let i = 0; i < name.length; i++) {
                hash = name.charCodeAt(i) + ((hash << 5) - hash);
            }
            const hue = hash % 360;
            return `hsl(${hue}, 70%, 45%)`;
        }

        formatSubscriptionStatus(subscription) {
            const status = subscription.status.toLowerCase();
            const expiryDate = new Date(subscription.nextBillingDate);
            const daysUntilExpiry = Math.ceil((expiryDate - new Date()) / (1000 * 60 * 60 * 24));

            if (status === 'active' && daysUntilExpiry <= 7) {
                return `Renews in ${daysUntilExpiry} days`;
            }
            return this.capitalizeFirstLetter(status);
        }

        formatLastActive(timestamp) {
            if (!timestamp) return 'Never';
            
            const date = new Date(timestamp);
            const now = new Date();
            const diffInSeconds = Math.floor((now - date) / 1000);

            if (diffInSeconds < 60) return 'Just now';
            if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
            if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
            if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`;
            
            return date.toLocaleDateString();
        }

        capitalizeFirstLetter(string) {
            return string.charAt(0).toUpperCase() + string.slice(1).toLowerCase();
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

        // API Request Handler
        async makeRequest(endpoint, method = 'GET', data = null, queryParams = null) {
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

                let url = `${this.apiBaseUrl}${endpoint}`;
                if (queryParams) {
                    const params = new URLSearchParams(queryParams);
                    url += `?${params.toString()}`;
                }

                console.log(`API Request: ${method} ${endpoint}`, {
                    headers: config.headers,
                    body: config.body
                });

                const response = await fetch(url, config);
                const responseData = await response.json();

                console.log(`API Response for ${endpoint}:`, responseData);

                if (!response.ok) {
                    throw new Error(responseData.message || `API request failed with status ${response.status}`);
                }

                return responseData;
            } catch (error) {
                console.error('API Request Error:', error);
                throw error;
            }
        }

        // Modal Management
        closeModals() {
            document.querySelectorAll('.modal').forEach(modal => {
                modal.classList.remove('show');
            });
            document.body.style.overflow = '';
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

        // Notification System
        showNotification(message, type = 'info') {
            // Dispatch event to global notification system
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
            
            // Clear any timeouts/intervals
            if (this.searchDebounceTimeout) {
                clearTimeout(this.searchDebounceTimeout);
            }
        }
    }
          

    // Make CompaniesManager available globally
    window.CompaniesManager = CompaniesManager;
    console.log('CompaniesManager registered globally');
})();

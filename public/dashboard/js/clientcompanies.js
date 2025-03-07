(function() {
    // Check if CompaniesManager already exists
    if (window.CompaniesManager) {
        return; // Exit if already defined
    }

    class CompaniesManager {
        constructor() {
            // Initialize core properties
            this.baseUrl = 'https://18.215.160.136.nip.io/api';
            this.token = localStorage.getItem('token');
            this.currentPage = 1;
            this.pageSize = 10;
            this.totalCompanies = 0;
            this.companies = [];
            this.currentCompany = null;
            this.filters = {
                search: '',
                industry: '',
                status: '',
                plan: ''
            };
            this.notificationTimeout = null;

            // Log initialization
            console.log('Initializing CompaniesManager...');
            console.log('API Base URL:', this.baseUrl);
            console.log('Token Present:', !!this.token);

            // Start initialization
            if (!this.checkInitialization()) {
                console.error('Initialization check failed');
                return;
            }

            // Initialize components
            this.initializeStyles();
            this.initializeElements();
            this.initializeEventListeners();
            this.loadInitialData();
        }

        checkInitialization() {
            if (!this.token) {
                console.error('No authentication token found');
                window.location.href = '/login.html';
                return false;
            }

            if (!this.baseUrl) {
                console.error('API base URL not configured');
                return false;
            }

            return true;
        }

        async loadInitialData() {
            try {
                console.log('Loading initial data...');
                
                // Check API connection first
                const isConnected = await this.checkApiConnection();
                if (!isConnected) {
                    throw new Error('Failed to connect to the API');
                }

                // Show loading state
                this.showTableLoader(true);

                // Load data
                await Promise.all([
                    this.loadStatistics(),
                    this.loadCompanies()
                ]);

                console.log('Initial data loaded successfully');
            } catch (error) {
                console.error('Error loading initial data:', error);
                this.handleApiError(error, 'Failed to load initial data');
                this.renderEmptyTable();
            } finally {
                this.showTableLoader(false);
            }
        }

        async checkApiConnection() {
            try {
                console.log('Checking API connection...');
                const response = await fetch(`${this.baseUrl}/verify-token`, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${this.token}`,
                        'Content-Type': 'application/json'
                    }
                });

                if (!response.ok) {
                    throw new Error(`API check failed: ${response.status}`);
                }

                const data = await response.json();
                console.log('API Connection Check:', data);
                return data.success;
            } catch (error) {
                console.error('API Connection Error:', error);
                this.showNotification('Unable to connect to the server', 'error');
                return false;
            }
        }

        initializeElements() {
            try {
                console.log('Initializing elements...');
                
                this.elements = {
                    stats: {
                        total: document.getElementById('totalCompanies'),
                        active: document.getElementById('activeCompanies'),
                        pending: document.getElementById('pendingRenewals'),
                        inactive: document.getElementById('inactiveCompanies')
                    },
                    filters: {
                        search: document.getElementById('companySearch'),
                        industry: document.getElementById('industryFilter'),
                        status: document.getElementById('statusFilter'),
                        plan: document.getElementById('planFilter'),
                        reset: document.getElementById('resetFilters')
                    },
                    table: {
                        body: document.getElementById('companiesTableBody'),
                        loader: document.getElementById('tableLoader'),
                        noData: document.getElementById('noDataMessage')
                    },
                    pagination: {
                        container: document.getElementById('paginationControls'),
                        pageSize: document.getElementById('pageSize')
                    },
                    modals: {
                        addCompany: document.getElementById('companyModal'),
                        companyForm: document.getElementById('companyForm'),
                        deleteModal: document.getElementById('deleteConfirmModal'),
                        detailsModal: document.getElementById('companyDetailsModal')
                    },
                    buttons: {
                        addNew: document.getElementById('addCompanyBtn')
                    }
                };

                // Validate critical elements
                this.validateElements();
                console.log('Elements initialized successfully');
            } catch (error) {
                console.error('Error initializing elements:', error);
                throw new Error('Failed to initialize elements');
            }
        }

        validateElements() {
            const criticalElements = [
                { name: 'Companies Table Body', element: this.elements.table.body },
                { name: 'Add Company Button', element: this.elements.buttons.addNew },
                { name: 'Company Modal', element: this.elements.modals.addCompany },
                { name: 'Company Form', element: this.elements.modals.companyForm }
            ];

            const missingElements = criticalElements
                .filter(({ element }) => !element)
                .map(({ name }) => name);

            if (missingElements.length > 0) {
                const error = `Missing critical elements: ${missingElements.join(', ')}`;
                console.error(error);
                throw new Error(error);
            }
        }

        initializeEventListeners() {
            try {
                console.log('Initializing event listeners...');

                // Filter listeners
                this.elements.filters.search?.addEventListener('input', 
                    this.debounce(() => {
                        console.log('Search filter changed:', this.elements.filters.search.value);
                        this.filters.search = this.elements.filters.search.value;
                        this.currentPage = 1;
                        this.loadCompanies();
                    }, 300)
                );

                this.elements.filters.industry?.addEventListener('change', () => {
                    console.log('Industry filter changed:', this.elements.filters.industry.value);
                    this.filters.industry = this.elements.filters.industry.value;
                    this.currentPage = 1;
                    this.loadCompanies();
                });

                this.elements.filters.status?.addEventListener('change', () => {
                    console.log('Status filter changed:', this.elements.filters.status.value);
                    this.filters.status = this.elements.filters.status.value;
                    this.currentPage = 1;
                    this.loadCompanies();
                });

                this.elements.filters.plan?.addEventListener('change', () => {
                    console.log('Plan filter changed:', this.elements.filters.plan.value);
                    this.filters.plan = this.elements.filters.plan.value;
                    this.currentPage = 1;
                    this.loadCompanies();
                });

                this.elements.filters.reset?.addEventListener('click', () => {
                    console.log('Resetting filters');
                    this.resetFilters();
                });

                // Pagination listener
                this.elements.pagination.pageSize?.addEventListener('change', () => {
                    console.log('Page size changed:', this.elements.pagination.pageSize.value);
                    this.pageSize = parseInt(this.elements.pagination.pageSize.value);
                    this.currentPage = 1;
                    this.loadCompanies();
                });

                // Add company button
                this.elements.buttons.addNew?.addEventListener('click', () => {
                    console.log('Opening add company modal');
                    this.openAddCompanyModal();
                });

                // Form submission
                this.elements.modals.companyForm?.addEventListener('submit', (e) => {
                    console.log('Company form submitted');
                    e.preventDefault();
                    this.handleFormSubmit(e);
                });

                // Global click handler for company actions
                document.addEventListener('click', (e) => {
                    const actionButton = e.target.closest('[data-company-action]');
                    if (actionButton) {
                        const companyId = actionButton.dataset.companyId;
                        const action = actionButton.dataset.companyAction;
                        console.log('Company action clicked:', action, 'for company:', companyId);
                        this.handleCompanyAction(action, companyId);
                    }

                    // Modal close handlers
                    if (e.target.matches('.close-modal') || e.target.matches('[data-dismiss="modal"]')) {
                        console.log('Closing modals');
                        this.closeModals();
                    }
                });

                // ESC key handler for modals
                document.addEventListener('keydown', (e) => {
                    if (e.key === 'Escape') {
                        console.log('ESC key pressed - closing modals');
                        this.closeModals();
                    }
                });

                console.log('Event listeners initialized successfully');
            } catch (error) {
                console.error('Error initializing event listeners:', error);
                throw new Error('Failed to initialize event listeners');
            }
        }

        // API Integration Methods
        async loadStatistics() {
            try {
                console.log('Loading company statistics...');
                const response = await fetch(`${this.baseUrl}/companies/overall-statistics`, {
                    method: 'GET',
                    headers: {
                        'Authorization': `Bearer ${this.token}`,
                        'Content-Type': 'application/json'
                    }
                });

                if (!response.ok) {
                    const errorData = await response.json().catch(() => ({}));
                    throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
                }

                const data = await response.json();
                console.log('Statistics data received:', data);

                if (data.success) {
                    this.updateStatistics(data.statistics);
                } else {
                    throw new Error(data.message || 'Invalid statistics data received');
                }
            } catch (error) {
                console.error('Statistics loading error:', error);
                this.handleApiError(error, 'Failed to load statistics');
                this.updateStatistics({
                    total: 0,
                    active: 0,
                    pendingRenewals: 0,
                    inactive: 0
                });
            }
        }

        updateStatistics(statistics) {
            try {
                console.log('Updating statistics display:', statistics);
                
                // Update statistics elements if they exist
                if (this.elements.stats.total) {
                    this.elements.stats.total.textContent = statistics.total || 0;
                }
                if (this.elements.stats.active) {
                    this.elements.stats.active.textContent = statistics.active || 0;
                }
                if (this.elements.stats.pending) {
                    this.elements.stats.pending.textContent = statistics.pendingRenewals || 0;
                }
                if (this.elements.stats.inactive) {
                    this.elements.stats.inactive.textContent = statistics.inactive || 0;
                }
            } catch (error) {
                console.error('Error updating statistics:', error);
            }
        }

        async loadCompanies() {
            try {
                console.log('Loading companies...');
                this.showTableLoader(true);
                
                const queryParams = new URLSearchParams({
                    page: this.currentPage.toString(),
                    limit: this.pageSize.toString(),
                    search: this.filters.search || '',
                    industry: this.filters.industry || '',
                    status: this.filters.status || '',
                    plan: this.filters.plan || ''
                });

                const url = `${this.baseUrl}/companies?${queryParams}`;
                console.log('Fetching companies from:', url);

                const response = await fetch(url, {
                    method: 'GET',
                    headers: {
                        'Authorization': `Bearer ${this.token}`,
                        'Content-Type': 'application/json',
                        'Accept': 'application/json'
                    }
                });

                if (!response.ok) {
                    const errorData = await response.json().catch(() => ({}));
                    throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
                }

                const data = await response.json();
                console.log('Companies data received:', data);

                if (data.success) {
                    this.companies = data.data.companies;
                    this.totalCompanies = data.data.pagination.total;
                    this.renderCompaniesTable();
                    this.updatePagination(data.data.pagination);
                } else {
                    throw new Error(data.message || 'Failed to load companies');
                }
            } catch (error) {
                console.error('Companies loading error:', error);
                this.handleApiError(error, 'Failed to load companies');
                this.renderEmptyTable();
            } finally {
                this.showTableLoader(false);
            }
        }

        async createCompany(formData) {
            try {
                console.log('Creating new company:', formData);
                const response = await fetch(`${this.baseUrl}/companies`, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${this.token}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(formData)
                });

                if (!response.ok) {
                    const errorData = await response.json().catch(() => ({}));
                    throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
                }

                const data = await response.json();
                console.log('Company creation response:', data);

                if (data.success) {
                    this.showNotification('Company created successfully', 'success');
                    return true;
                } else {
                    throw new Error(data.message || 'Failed to create company');
                }
            } catch (error) {
                console.error('Company creation error:', error);
                this.handleApiError(error, 'Failed to create company');
                return false;
            }
        }

        async updateCompany(companyId, formData) {
            try {
                console.log('Updating company:', companyId, formData);
                const response = await fetch(`${this.baseUrl}/companies/${companyId}`, {
                    method: 'PUT',
                    headers: {
                        'Authorization': `Bearer ${this.token}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(formData)
                });

                if (!response.ok) {
                    const errorData = await response.json().catch(() => ({}));
                    throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
                }

                const data = await response.json();
                console.log('Company update response:', data);

                if (data.success) {
                    this.showNotification('Company updated successfully', 'success');
                    return true;
                } else {
                    throw new Error(data.message || 'Failed to update company');
                }
            } catch (error) {
                console.error('Company update error:', error);
                this.handleApiError(error, 'Failed to update company');
                return false;
            }
        }

        async deleteCompany(companyId) {
            try {
                console.log('Deleting company:', companyId);
                const response = await fetch(`${this.baseUrl}/companies/${companyId}`, {
                    method: 'DELETE',
                    headers: {
                        'Authorization': `Bearer ${this.token}`,
                        'Content-Type': 'application/json'
                    }
                });

                if (!response.ok) {
                    const errorData = await response.json().catch(() => ({}));
                    throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
                }

                const data = await response.json();
                console.log('Company deletion response:', data);

                if (data.success) {
                    this.showNotification('Company deleted successfully', 'success');
                    return true;
                } else {
                    throw new Error(data.message || 'Failed to delete company');
                }
            } catch (error) {
                console.error('Company deletion error:', error);
                this.handleApiError(error, 'Failed to delete company');
                return false;
            }
        }

        // Table Rendering Methods
        renderCompaniesTable() {
            if (!this.elements.table.body) {
                console.error('Table body element not found');
                return;
            }

            console.log('Rendering companies table:', this.companies);

            if (!this.companies.length) {
                this.showNoDataMessage(true);
                return;
            }

            this.showNoDataMessage(false);
            this.elements.table.body.innerHTML = this.companies
                .map(company => this.createTableRow(company))
                .join('');
        }

        createTableRow(company) {
            return `
                <tr data-company-id="${company._id}">
                    <td>
                        <div class="company-info">
                            <span class="company-name">${this.escapeHtml(company.name)}</span>
                            <small class="company-id">#${company._id}</small>
                        </div>
                    </td>
                    <td>
                        <span class="industry-badge">
                            ${this.escapeHtml(company.industry)}
                        </span>
                    </td>
                    <td>
                        <div class="user-count">
                            <i class="fas fa-users"></i>
                            ${company.userCount || 0}
                        </div>
                    </td>
                    <td>
                        <span class="subscription-badge ${(company.subscription?.plan || '').toLowerCase()}">
                            ${this.escapeHtml(company.subscription?.plan || 'No Plan')}
                        </span>
                    </td>
                    <td>
                        <span class="status-badge ${company.status.toLowerCase()}">
                            <i class="fas fa-circle"></i>
                            ${this.capitalizeFirstLetter(company.status)}
                        </span>
                    </td>
                    <td>${this.formatDate(company.lastActive)}</td>
                    <td>
                        <div class="action-buttons">
                            <button class="btn-icon btn-view" 
                                data-company-action="view" 
                                data-company-id="${company._id}" 
                                title="View Details">
                                <i class="fas fa-eye"></i>
                            </button>
                            <button class="btn-icon btn-edit" 
                                data-company-action="edit" 
                                data-company-id="${company._id}" 
                                title="Edit Company">
                                <i class="fas fa-edit"></i>
                            </button>
                            <button class="btn-icon btn-delete" 
                                data-company-action="delete" 
                                data-company-id="${company._id}" 
                                title="Delete Company">
                                <i class="fas fa-trash-alt"></i>
                            </button>
                        </div>
                    </td>
                </tr>
            `;
        }

        renderEmptyTable() {
            if (!this.elements.table.body) return;

            this.elements.table.body.innerHTML = `
                <tr>
                    <td colspan="7" class="empty-table">
                        <div class="empty-state">
                            <i class="fas fa-folder-open"></i>
                            <p>No companies found</p>
                        </div>
                    </td>
                </tr>
            `;
        }

        updatePagination(paginationData) {
            if (!this.elements.pagination.container) return;

            const { total, page, pages } = paginationData;
            console.log('Updating pagination:', { total, page, pages });

            const startItem = ((page - 1) * this.pageSize) + 1;
            const endItem = Math.min(page * this.pageSize, total);

            this.elements.pagination.container.innerHTML = `
                <div class="pagination-info">
                    Showing ${startItem} to ${endItem} of ${total} entries
                </div>
                <div class="pagination-buttons">
                    ${this.createPaginationButtons(page, pages)}
                </div>
            `;
        }

        createPaginationButtons(currentPage, totalPages) {
            let buttons = [];
            
            // Previous button
            buttons.push(`
                <button class="page-button ${currentPage === 1 ? 'disabled' : ''}"
                    ${currentPage === 1 ? 'disabled' : `onclick="companiesManager.goToPage(${currentPage - 1})"`}>
                    <i class="fas fa-chevron-left"></i>
                </button>
            `);

            // Page numbers
            for (let i = 1; i <= totalPages; i++) {
                if (i === 1 || i === totalPages || (i >= currentPage - 1 && i <= currentPage + 1)) {
                    buttons.push(`
                        <button class="page-button ${i === currentPage ? 'active' : ''}"
                            onclick="companiesManager.goToPage(${i})">
                            ${i}
                        </button>
                    `);
                } else if (i === currentPage - 2 || i === currentPage + 2) {
                    buttons.push('<span class="page-ellipsis">...</span>');
                }
            }

            // Next button
            buttons.push(`
                <button class="page-button ${currentPage === totalPages ? 'disabled' : ''}"
                    ${currentPage === totalPages ? 'disabled' : `onclick="companiesManager.goToPage(${currentPage + 1})"`}>
                    <i class="fas fa-chevron-right"></i>
                </button>
            `);

            return buttons.join('');
        }

        goToPage(page) {
            console.log('Navigating to page:', page);
            this.currentPage = page;
            this.loadCompanies();
        }

        // Modal Handling Methods
        handleCompanyAction(action, companyId) {
            console.log('Handling company action:', action, 'for company:', companyId);
            
            const company = this.companies.find(c => c._id === companyId);
            if (!company) {
                this.showNotification('Company not found', 'error');
                return;
            }

            switch (action) {
                case 'view':
                    this.openViewCompanyModal(company);
                    break;
                case 'edit':
                    this.openEditCompanyModal(company);
                    break;
                case 'delete':
                    this.openDeleteConfirmationModal(company);
                    break;
                default:
                    console.warn('Unknown company action:', action);
            }
        }

        openAddCompanyModal() {
            if (!this.elements.modals.addCompany) return;

            console.log('Opening add company modal');
            this.currentCompany = null;
            this.elements.modals.companyForm.reset();
            
            const modalTitle = this.elements.modals.addCompany.querySelector('#modalTitle');
            if (modalTitle) {
                modalTitle.textContent = 'Add New Company';
            }

            this.showModal(this.elements.modals.addCompany);
        }

        openEditCompanyModal(company) {
            if (!this.elements.modals.addCompany) return;

            console.log('Opening edit company modal for:', company);
            this.currentCompany = company;
            
            const modalTitle = this.elements.modals.addCompany.querySelector('#modalTitle');
            if (modalTitle) {
                modalTitle.textContent = 'Edit Company';
            }

            this.populateCompanyForm(company);
            this.showModal(this.elements.modals.addCompany);
        }

        openViewCompanyModal(company) {
            if (!this.elements.modals.detailsModal) return;

            console.log('Opening view company modal for:', company);
            this.populateCompanyDetails(company);
            this.showModal(this.elements.modals.detailsModal);
            this.loadCompanyDetails(company._id);
        }

        openDeleteConfirmationModal(company) {
            if (!this.elements.modals.deleteModal) return;

            console.log('Opening delete confirmation modal for:', company);
            const companyNameElement = this.elements.modals.deleteModal.querySelector('#deleteCompanyName');
            if (companyNameElement) {
                companyNameElement.textContent = company.name;
            }

            this.elements.modals.deleteModal.dataset.companyId = company._id;
            this.showModal(this.elements.modals.deleteModal);
        }

        // Form Handling Methods
        async handleFormSubmit(event) {
            event.preventDefault();
            console.log('Handling form submission');

            try {
                const formData = this.getFormData();
                console.log('Form data:', formData);

                if (!this.validateFormData(formData)) {
                    return;
                }

                this.showLoadingState(true);

                const isSuccess = this.currentCompany
                    ? await this.updateCompany(this.currentCompany._id, formData)
                    : await this.createCompany(formData);

                if (isSuccess) {
                    this.closeModals();
                    await this.loadCompanies();
                    this.showNotification(
                        this.currentCompany 
                            ? 'Company updated successfully' 
                            : 'Company created successfully',
                        'success'
                    );
                }
            } catch (error) {
                console.error('Form submission error:', error);
                this.handleApiError(error, 'Error processing form submission');
            } finally {
                this.showLoadingState(false);
            }
        }

        getFormData() {
            const form = this.elements.modals.companyForm;
            if (!form) return {};

            const formData = new FormData(form);
            const data = {
                contactDetails: {}
            };

            for (const [key, value] of formData.entries()) {
                if (key.startsWith('contact')) {
                    const contactKey = key.replace('contact', '').toLowerCase();
                    data.contactDetails[contactKey] = value.trim();
                } else {
                    data[key] = value.trim();
                }
            }

            console.log('Processed form data:', data);
            return data;
        }

        validateFormData(data) {
            console.log('Validating form data:', data);

            const requiredFields = [
                { key: 'name', label: 'Company Name' },
                { key: 'industry', label: 'Industry' },
                { key: 'contactDetails.email', label: 'Contact Email' }
            ];

            const missingFields = [];

            requiredFields.forEach(({ key, label }) => {
                if (key.includes('.')) {
                    const [parent, child] = key.split('.');
                    if (!data[parent] || !data[parent][child]) {
                        missingFields.push(label);
                    }
                } else if (!data[key]) {
                    missingFields.push(label);
                }
            });

            if (missingFields.length > 0) {
                this.showNotification(
                    `Please fill in required fields: ${missingFields.join(', ')}`,
                    'error'
                );
                return false;
            }

            if (data.contactDetails?.email && !this.isValidEmail(data.contactDetails.email)) {
                this.showNotification('Please enter a valid email address', 'error');
                return false;
            }

            return true;
        }

        populateCompanyForm(company) {
            const form = this.elements.modals.companyForm;
            if (!form) return;

            console.log('Populating form with company data:', company);

            // Reset form first
            form.reset();

            // Populate basic fields
            Object.keys(company).forEach(key => {
                const input = form.querySelector(`[name="${key}"]`);
                if (input && !['_id', 'createdAt', 'updatedAt'].includes(key)) {
                    if (input.type === 'checkbox') {
                        input.checked = company[key];
                    } else {
                        input.value = company[key];
                    }
                }
            });

            // Populate contact details
            if (company.contactDetails) {
                Object.keys(company.contactDetails).forEach(key => {
                    const input = form.querySelector(`[name="contact${this.capitalizeFirstLetter(key)}"]`);
                    if (input) {
                        input.value = company.contactDetails[key];
                    }
                });
            }
        }

        populateCompanyDetails(company) {
            const modal = this.elements.modals.detailsModal;
            if (!modal) return;

            console.log('Populating company details:', company);

            // Update basic information
            modal.querySelector('#detailCompanyName').textContent = company.name;
            modal.querySelector('#detailIndustry').textContent = company.industry;
            modal.querySelector('#detailStatus').className = `status-badge ${company.status.toLowerCase()}`;
            modal.querySelector('#detailStatus').textContent = this.capitalizeFirstLetter(company.status);

            // Update contact information
            if (company.contactDetails) {
                modal.querySelector('#detailEmail').textContent = company.contactDetails.email || 'N/A';
                modal.querySelector('#detailPhone').textContent = company.contactDetails.phone || 'N/A';
                modal.querySelector('#detailAddress').textContent = company.contactDetails.address || 'N/A';
            }

            // Update subscription information
            if (company.subscription) {
                modal.querySelector('#detailPlanName').textContent = company.subscription.plan;
                modal.querySelector('#detailBillingCycle').textContent = 
                    this.capitalizeFirstLetter(company.subscription.billingCycle);
                modal.querySelector('#detailNextBilling').textContent = 
                    this.formatDate(company.subscription.nextBillingDate);
            }
        }

        // Modal Utility Methods
        showModal(modal) {
            if (!modal) return;
            console.log('Showing modal');
            modal.style.display = 'block';
            document.body.style.overflow = 'hidden';
        }

        closeModals() {
            console.log('Closing all modals');
            const modals = document.querySelectorAll('.modal');
            modals.forEach(modal => {
                modal.style.display = 'none';
            });
            document.body.style.overflow = '';
        }

        showLoadingState(show) {
            const submitButton = this.elements.modals.companyForm?.querySelector('button[type="submit"]');
            if (submitButton) {
                submitButton.disabled = show;
                submitButton.innerHTML = show 
                    ? '<i class="fas fa-spinner fa-spin"></i> Processing...'
                    : 'Save Company';
            }
        }

        showTableLoader(show) {
            if (this.elements.table.loader) {
                this.elements.table.loader.style.display = show ? 'flex' : 'none';
            }
            if (this.elements.table.body) {
                this.elements.table.body.style.display = show ? 'none' : 'table-row-group';
            }
        }

        showNoDataMessage(show) {
            if (this.elements.table.noData) {
                this.elements.table.noData.style.display = show ? 'block' : 'none';
            }
        }

        // Error Handling Methods
        handleApiError(error, defaultMessage) {
            console.error('API Error:', {
                message: error.message,
                stack: error.stack,
                defaultMessage
            });

            if (!navigator.onLine) {
                this.showNotification(
                    'Network connection lost. Please check your internet connection.',
                    'error'
                );
                return;
            }

            if (error.message.includes('401') || error.message.includes('unauthorized')) {
                this.showNotification('Session expired. Please log in again.', 'error');
                localStorage.removeItem('token');
                window.location.href = '/login.html';
                return;
            }

            this.showNotification(error.message || defaultMessage, 'error');
        }

        showNotification(message, type = 'info') {
            if (window.dashboardApp?.userInterface) {
                window.dashboardApp.userInterface.showNotification(message, type);
            } else {
                console.log(`${type.toUpperCase()}: ${message}`);
                alert(message);
            }
        }

        // Utility Methods
        resetFilters() {
            console.log('Resetting filters');
            
            this.filters = {
                search: '',
                industry: '',
                status: '',
                plan: ''
            };

            // Reset form inputs
            Object.values(this.elements.filters).forEach(filter => {
                if (filter && filter.tagName) {
                    filter.value = '';
                }
            });

            this.currentPage = 1;
            this.loadCompanies();
        }

        isValidEmail(email) {
            return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
        }

        escapeHtml(unsafe) {
            return unsafe
                .replace(/&/g, "&amp;")
                .replace(/</g, "&lt;")
                .replace(/>/g, "&gt;")
                .replace(/"/g, "&quot;")
                .replace(/'/g, "&#039;");
        }

        formatDate(date) {
            if (!date) return 'N/A';
            return new Date(date).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });
        }

        capitalizeFirstLetter(string) {
            if (!string) return '';
            return string.charAt(0).toUpperCase() + string.slice(1).toLowerCase();
        }

        debounce(func, wait) {
            let timeout;
            return (...args) => {
                clearTimeout(timeout);
                timeout = setTimeout(() => func.apply(this, args), wait);
            };
        }

        // Cleanup method
        cleanup() {
            console.log('Cleaning up CompaniesManager');
            
            // Remove event listeners
            if (this.elements.filters.search) {
                this.elements.filters.search.removeEventListener('input', this.handleSearch);
            }

            // Close any open modals
            this.closeModals();

            // Clear any pending timeouts
            if (this.notificationTimeout) {
                clearTimeout(this.notificationTimeout);
            }

            // Reset state
            this.companies = [];
            this.currentCompany = null;
            
            console.log('CompaniesManager cleanup completed');
        }
    }

    // Export to window object
    window.CompaniesManager = CompaniesManager;
})();

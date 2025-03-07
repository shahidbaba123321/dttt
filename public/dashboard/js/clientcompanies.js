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
                throw new Error(`Missing critical elements: ${missingElements.join(', ')}`);
            }
        }

        initializeEventListeners() {
            try {
                console.log('Initializing event listeners...');

                // Filter listeners
                this.elements.filters.search?.addEventListener('input', 
                    this.debounce(() => {
                        this.filters.search = this.elements.filters.search.value;
                        this.currentPage = 1;
                        this.loadCompanies();
                    }, 300)
                );

                this.elements.filters.industry?.addEventListener('change', () => {
                    this.filters.industry = this.elements.filters.industry.value;
                    this.currentPage = 1;
                    this.loadCompanies();
                });

                this.elements.filters.status?.addEventListener('change', () => {
                    this.filters.status = this.elements.filters.status.value;
                    this.currentPage = 1;
                    this.loadCompanies();
                });

                this.elements.filters.plan?.addEventListener('change', () => {
                    this.filters.plan = this.elements.filters.plan.value;
                    this.currentPage = 1;
                    this.loadCompanies();
                });

                this.elements.filters.reset?.addEventListener('click', () => {
                    this.resetFilters();
                });

                // Pagination listener
                this.elements.pagination.pageSize?.addEventListener('change', () => {
                    this.pageSize = parseInt(this.elements.pagination.pageSize.value);
                    this.currentPage = 1;
                    this.loadCompanies();
                });

                // Add company button
                this.elements.buttons.addNew?.addEventListener('click', () => {
                    this.openAddCompanyModal();
                });

                // Form submission
                this.elements.modals.companyForm?.addEventListener('submit', (e) => {
                    e.preventDefault();
                    this.handleFormSubmit(e);
                });

                // Global click handler for company actions
                document.addEventListener('click', (e) => {
                    const actionButton = e.target.closest('[data-company-action]');
                    if (actionButton) {
                        const companyId = actionButton.dataset.companyId;
                        const action = actionButton.dataset.companyAction;
                        this.handleCompanyAction(action, companyId);
                    }

                    // Modal close handlers
                    if (e.target.matches('.close-modal') || e.target.matches('[data-dismiss="modal"]')) {
                        this.closeModals();
                    }
                });

                // ESC key handler for modals
                document.addEventListener('keydown', (e) => {
                    if (e.key === 'Escape') {
                        this.closeModals();
                    }
                });

                console.log('Event listeners initialized successfully');
            } catch (error) {
                console.error('Error initializing event listeners:', error);
                throw new Error('Failed to initialize event listeners');
            }
        }

         async loadInitialData() {
            try {
                console.log('Loading initial data...');
                
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
                this.showEmptyState();
            } finally {
                this.showTableLoader(false);
            }
        }

        async loadCompanies() {
            try {
                this.showTableLoader(true);
                
                const queryParams = new URLSearchParams({
                    page: this.currentPage.toString(),
                    limit: this.pageSize.toString(),
                    search: this.filters.search || '',
                    industry: this.filters.industry || '',
                    status: this.filters.status || '',
                    plan: this.filters.plan || ''
                });

                const url = `${this.baseUrl}/companies`;
                console.log('Fetching companies from:', url, 'with params:', queryParams.toString());

                const response = await fetch(`${url}?${queryParams}`, {
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
                this.showNotification('Failed to load companies', 'error');
                this.showEmptyState();
            } finally {
                this.showTableLoader(false);
            }
        }

        async loadStatistics() {
            try {
                const response = await fetch(`${this.baseUrl}/companies/overall-statistics`, {
                    method: 'GET',
                    headers: {
                        'Authorization': `Bearer ${this.token}`,
                        'Content-Type': 'application/json'
                    }
                });

                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }

                const data = await response.json();
                if (data.success) {
                    this.updateStatistics(data.statistics);
                } else {
                    throw new Error(data.message || 'Invalid statistics data');
                }
            } catch (error) {
                console.error('Statistics loading error:', error);
                this.updateStatistics({
                    total: 0,
                    active: 0,
                    pendingRenewals: 0,
                    inactive: 0
                });
            }
        }

        renderCompaniesTable() {
            if (!this.elements.table.body) return;

            if (!this.companies.length) {
                this.showEmptyState();
                return;
            }

            this.elements.table.body.innerHTML = this.companies
                .map(company => this.createTableRow(company))
                .join('');
        }

        showEmptyState() {
            if (!this.elements.table.body) return;

            this.elements.table.body.innerHTML = `
                <tr>
                    <td colspan="7" class="empty-state">
                        <div class="empty-state-content">
                            <i class="fas fa-folder-open"></i>
                            <p>No companies found</p>
                            <button class="btn btn-primary btn-sm" onclick="companiesManager.openAddCompanyModal()">
                                <i class="fas fa-plus"></i> Add Company
                            </button>
                        </div>
                    </td>
                </tr>
            `;

            if (this.elements.table.noData) {
                this.elements.table.noData.style.display = 'block';
            }
        }

        createTableRow(company) {
            return `
                <tr>
                    <td>
                        <div class="company-info">
                            <span class="company-name">${this.escapeHtml(company.name)}</span>
                            <small class="company-id">#${company._id}</small>
                        </div>
                    </td>
                    <td>${this.escapeHtml(company.industry)}</td>
                    <td>
                        <div class="user-count">
                            <i class="fas fa-users"></i>
                            ${company.size || 0}
                        </div>
                    </td>
                    <td>
                        <span class="status-badge ${company.status?.toLowerCase()}">
                            <i class="fas fa-circle"></i>
                            ${this.capitalizeFirstLetter(company.status)}
                        </span>
                    </td>
                    <td>${this.escapeHtml(company.contactDetails?.email || 'N/A')}</td>
                    <td>${this.formatDate(company.createdAt)}</td>
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

        updatePagination(paginationData) {
            if (!this.elements.pagination.container) return;

            const { total, page, pages } = paginationData;
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

         // Modal Handling Methods
        handleCompanyAction(action, companyId) {
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

            this.populateCompanyDetails(company);
            this.showModal(this.elements.modals.detailsModal);
        }

        openDeleteConfirmationModal(company) {
            if (!this.elements.modals.deleteModal) return;

            const companyNameElement = this.elements.modals.deleteModal.querySelector('#deleteCompanyName');
            if (companyNameElement) {
                companyNameElement.textContent = company.name;
            }

            this.elements.modals.deleteModal.dataset.companyId = company._id;
            this.showModal(this.elements.modals.deleteModal);

            // Set up delete confirmation button
            const confirmButton = this.elements.modals.deleteModal.querySelector('#confirmDelete');
            if (confirmButton) {
                confirmButton.onclick = () => this.handleDeleteCompany(company._id);
            }
        }

        // Form Handling Methods
        async handleFormSubmit(event) {
            event.preventDefault();

            try {
                const formData = this.getFormData();
                if (!this.validateFormData(formData)) {
                    return;
                }

                this.showLoadingState(true);

                if (this.currentCompany) {
                    await this.updateCompany(this.currentCompany._id, formData);
                } else {
                    await this.createCompany(formData);
                }

                this.closeModals();
                await this.loadCompanies();
                this.showNotification(
                    this.currentCompany ? 'Company updated successfully' : 'Company created successfully',
                    'success'
                );
            } catch (error) {
                console.error('Form submission error:', error);
                this.showNotification(error.message || 'Error processing form submission', 'error');
            } finally {
                this.showLoadingState(false);
            }
        }

        async createCompany(formData) {
            try {
                const response = await fetch(`${this.baseUrl}/companies`, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${this.token}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(formData)
                });

                if (!response.ok) {
                    const errorData = await response.json();
                    throw new Error(errorData.message || 'Failed to create company');
                }

                const data = await response.json();
                return data.success;
            } catch (error) {
                console.error('Company creation error:', error);
                throw error;
            }
        }

        async updateCompany(companyId, formData) {
            try {
                const response = await fetch(`${this.baseUrl}/companies/${companyId}`, {
                    method: 'PUT',
                    headers: {
                        'Authorization': `Bearer ${this.token}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(formData)
                });

                if (!response.ok) {
                    const errorData = await response.json();
                    throw new Error(errorData.message || 'Failed to update company');
                }

                const data = await response.json();
                return data.success;
            } catch (error) {
                console.error('Company update error:', error);
                throw error;
            }
        }

        async handleDeleteCompany(companyId) {
            try {
                const response = await fetch(`${this.baseUrl}/companies/${companyId}`, {
                    method: 'DELETE',
                    headers: {
                        'Authorization': `Bearer ${this.token}`
                    }
                });

                if (!response.ok) {
                    const errorData = await response.json();
                    throw new Error(errorData.message || 'Failed to delete company');
                }

                const data = await response.json();
                if (data.success) {
                    this.closeModals();
                    await this.loadCompanies();
                    this.showNotification('Company deleted successfully', 'success');
                }
            } catch (error) {
                console.error('Company deletion error:', error);
                this.showNotification('Failed to delete company', 'error');
            }
        }

        getFormData() {
            const form = this.elements.modals.companyForm;
            const formData = new FormData(form);
            const data = {
                name: formData.get('name'),
                industry: formData.get('industry'),
                size: formData.get('size'),
                contactDetails: {
                    email: formData.get('contactEmail'),
                    phone: formData.get('contactPhone'),
                    address: formData.get('address')
                },
                adminName: formData.get('adminName'),
                adminEmail: formData.get('adminEmail')
            };

            return data;
        }

        validateFormData(data) {
            const requiredFields = [
                { field: 'name', label: 'Company Name' },
                { field: 'industry', label: 'Industry' },
                { field: 'contactDetails.email', label: 'Contact Email' },
                { field: 'adminName', label: 'Admin Name' },
                { field: 'adminEmail', label: 'Admin Email' }
            ];

            const missingFields = [];

            requiredFields.forEach(({ field, label }) => {
                if (field.includes('.')) {
                    const [parent, child] = field.split('.');
                    if (!data[parent] || !data[parent][child]) {
                        missingFields.push(label);
                    }
                } else if (!data[field]) {
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

            if (!this.isValidEmail(data.contactDetails.email)) {
                this.showNotification('Please enter a valid contact email', 'error');
                return false;
            }

            if (!this.isValidEmail(data.adminEmail)) {
                this.showNotification('Please enter a valid admin email', 'error');
                return false;
            }

            return true;
        }

          // UI Helper Methods
        showModal(modal) {
            if (!modal) return;
            modal.style.display = 'block';
            document.body.style.overflow = 'hidden';
        }

        closeModals() {
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
                this.elements.table.body.style.display = show ? 'none' : '';
            }
        }

        updateStatistics(statistics) {
            try {
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

        populateCompanyForm(company) {
            const form = this.elements.modals.companyForm;
            if (!form) return;

            // Basic fields
            form.elements['name'].value = company.name || '';
            form.elements['industry'].value = company.industry || '';
            form.elements['size'].value = company.size || '';

            // Contact details
            if (company.contactDetails) {
                form.elements['contactEmail'].value = company.contactDetails.email || '';
                form.elements['contactPhone'].value = company.contactDetails.phone || '';
                form.elements['address'].value = company.contactDetails.address || '';
            }
        }

        populateCompanyDetails(company) {
            const modal = this.elements.modals.detailsModal;
            if (!modal) return;

            // Update basic information
            modal.querySelector('#detailCompanyName').textContent = company.name || 'N/A';
            modal.querySelector('#detailIndustry').textContent = company.industry || 'N/A';
            
            const statusElement = modal.querySelector('#detailStatus');
            if (statusElement) {
                statusElement.className = `status-badge ${company.status?.toLowerCase() || 'inactive'}`;
                statusElement.textContent = this.capitalizeFirstLetter(company.status || 'inactive');
            }

            // Update contact information
            modal.querySelector('#detailEmail').textContent = company.contactDetails?.email || 'N/A';
            modal.querySelector('#detailPhone').textContent = company.contactDetails?.phone || 'N/A';
            modal.querySelector('#detailAddress').textContent = company.contactDetails?.address || 'N/A';
            modal.querySelector('#detailSize').textContent = company.size || 'N/A';
            modal.querySelector('#detailCreatedAt').textContent = this.formatDate(company.createdAt);
        }

        resetFilters() {
            // Reset filter values
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

            // Reset pagination
            this.currentPage = 1;
            
            // Reload companies
            this.loadCompanies();
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
        goToPage(page) {
            this.currentPage = page;
            this.loadCompanies();
        }

        isValidEmail(email) {
            return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
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

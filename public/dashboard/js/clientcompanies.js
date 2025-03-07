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
            this.filters = {
                search: '',
                industry: '',
                status: '',
                plan: ''
            };
            this.notificationTimeout = null;
            this.initializeStyles();
            this.initializeElements();
            this.initializeEventListeners();
            this.loadInitialData();
        }

        initializeStyles() {
            const styles = `
                /* Companies Table Styles */
                .companies-container {
                    padding: var(--spacing-lg);
                }

                .companies-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: var(--spacing-lg);
                }

                .header-left h1 {
                    margin: 0;
                    color: var(--text-primary);
                    font-size: 1.5rem;
                }

                .subtitle {
                    color: var(--text-secondary);
                    margin-top: var(--spacing-xs);
                }

                /* Statistics Grid */
                .statistics-grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
                    gap: var(--spacing-md);
                    margin-bottom: var(--spacing-xl);
                }

                .stat-card {
                    background: var(--bg-primary);
                    padding: var(--spacing-lg);
                    border-radius: var(--border-radius-lg);
                    box-shadow: var(--shadow-sm);
                    display: flex;
                    align-items: center;
                    gap: var(--spacing-md);
                }

                .stat-icon {
                    width: 48px;
                    height: 48px;
                    border-radius: var(--border-radius-md);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 1.5rem;
                    background: var(--primary-light);
                    color: var(--primary-color);
                }

                .stat-icon.active {
                    background: #DEF7EC;
                    color: #03543F;
                }

                .stat-icon.pending {
                    background: #FEF3C7;
                    color: #92400E;
                }

                .stat-icon.inactive {
                    background: #FDE8E8;
                    color: #9B1C1C;
                }

                .stat-content h3 {
                    margin: 0;
                    font-size: 1.5rem;
                    color: var(--text-primary);
                }

                .stat-content p {
                    margin: 0;
                    color: var(--text-secondary);
                }

                /* Filters Section */
                .filters-section {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: var(--spacing-lg);
                    gap: var(--spacing-md);
                    flex-wrap: wrap;
                }

                .filters-group {
                    display: flex;
                    gap: var(--spacing-sm);
                    flex-wrap: wrap;
                }

                .filter-select {
                    min-width: 150px;
                }

                /* Table Styles */
                .table-container {
                    background: var(--bg-primary);
                    border-radius: var(--border-radius-lg);
                    box-shadow: var(--shadow-sm);
                    overflow: hidden;
                }

                .companies-table {
                    width: 100%;
                    border-collapse: collapse;
                }

                .companies-table th {
                    background: var(--bg-secondary);
                    padding: var(--spacing-md);
                    text-align: left;
                    color: var(--text-secondary);
                    font-weight: 500;
                    border-bottom: 1px solid var(--border-light);
                }

                .companies-table td {
                    padding: var(--spacing-md);
                    border-bottom: 1px solid var(--border-light);
                    color: var(--text-primary);
                }

                .companies-table tr:last-child td {
                    border-bottom: none;
                }

                .companies-table tr:hover {
                    background: var(--bg-secondary);
                }

                /* Status Badges */
                .status-badge {
                    padding: 4px 8px;
                    border-radius: 12px;
                    font-size: 0.875rem;
                    font-weight: 500;
                    display: inline-flex;
                    align-items: center;
                    gap: 4px;
                }

                .status-badge.active {
                    background: #DEF7EC;
                    color: #03543F;
                }

                .status-badge.inactive {
                    background: #FDE8E8;
                    color: #9B1C1C;
                }

                .status-badge.pending {
                    background: #FEF3C7;
                    color: #92400E;
                }

                /* Action Buttons */
                .action-buttons {
                    display: flex;
                    gap: var(--spacing-sm);
                }

                .btn-icon {
                    width: 32px;
                    height: 32px;
                    border-radius: var(--border-radius-md);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    border: none;
                    cursor: pointer;
                    transition: all 0.3s ease;
                }

                .btn-icon:hover {
                    transform: translateY(-1px);
                }

                .btn-view {
                    background: var(--primary-light);
                    color: var(--primary-color);
                }

                .btn-edit {
                    background: #FEF3C7;
                    color: #92400E;
                }

                .btn-delete {
                    background: #FDE8E8;
                    color: #9B1C1C;
                }

                /* Loader */
                .table-loader {
                    display: none;
                    padding: var(--spacing-xl);
                    text-align: center;
                    color: var(--text-secondary);
                }

                .table-loader i {
                    font-size: 2rem;
                    margin-bottom: var(--spacing-md);
                }

                /* No Data Message */
                .no-data-message {
                    display: none;
                    padding: var(--spacing-xl);
                    text-align: center;
                    color: var(--text-secondary);
                }

                .no-data-message i {
                    font-size: 3rem;
                    margin-bottom: var(--spacing-md);
                    color: var(--text-tertiary);
                }

                /* Pagination */
                .pagination-container {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    padding: var(--spacing-md);
                    border-top: 1px solid var(--border-light);
                }

                .pagination-info {
                    color: var(--text-secondary);
                }

                .pagination-controls {
                    display: flex;
                    gap: var(--spacing-sm);
                }

                .page-button {
                    padding: var(--spacing-sm) var(--spacing-md);
                    border: 1px solid var(--border-light);
                    border-radius: var(--border-radius-md);
                    background: var(--bg-primary);
                    color: var(--text-secondary);
                    cursor: pointer;
                    transition: all 0.3s ease;
                }

                .page-button:hover {
                    background: var(--bg-secondary);
                    color: var(--primary-color);
                }

                .page-button.active {
                    background: var(--primary-color);
                    color: white;
                    border-color: var(--primary-color);
                }

                .page-button.disabled {
                    opacity: 0.5;
                    cursor: not-allowed;
                }

                /* Responsive Adjustments */
                @media (max-width: 768px) {
                    .companies-header {
                        flex-direction: column;
                        align-items: flex-start;
                        gap: var(--spacing-md);
                    }

                    .filters-section {
                        flex-direction: column;
                        align-items: stretch;
                    }

                    .companies-table {
                        display: block;
                        overflow-x: auto;
                    }

                    .pagination-container {
                        flex-direction: column;
                        gap: var(--spacing-md);
                    }
                }
            `;

            const styleSheet = document.createElement('style');
            styleSheet.textContent = styles;
            document.head.appendChild(styleSheet);
        }

        initializeElements() {
            // Statistics elements
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
                    deleteModal: document.getElementById('deleteConfirmModal')
                },
                buttons: {
                    addNew: document.getElementById('addCompanyBtn')
                }
            };
        }

        // Continuing the CompaniesManager class...

        initializeEventListeners() {
            // Filter listeners
            this.elements.filters.search?.addEventListener('input', 
                this.debounce(() => this.handleSearch(), 300)
            );

            this.elements.filters.industry?.addEventListener('change', 
                () => this.handleFilterChange()
            );

            this.elements.filters.status?.addEventListener('change', 
                () => this.handleFilterChange()
            );

            this.elements.filters.plan?.addEventListener('change', 
                () => this.handleFilterChange()
            );

            this.elements.filters.reset?.addEventListener('click', 
                () => this.resetFilters()
            );

            // Add company button
            this.elements.buttons.addNew?.addEventListener('click', 
                () => this.openAddCompanyModal()
            );

            // Form submission
            this.elements.modals.companyForm?.addEventListener('submit', 
                (e) => this.handleFormSubmit(e)
            );

            // Table action buttons
            document.addEventListener('click', (e) => {
                const actionButton = e.target.closest('[data-company-action]');
                if (actionButton) {
                    const companyId = actionButton.dataset.companyId;
                    const action = actionButton.dataset.companyAction;
                    this.handleCompanyAction(action, companyId);
                }
            });

            // Pagination
            this.elements.pagination.pageSize?.addEventListener('change', 
                () => this.handlePageSizeChange()
            );

            // Modal close buttons
            document.querySelectorAll('.close-modal, [data-dismiss="modal"]')
                .forEach(button => {
                    button.addEventListener('click', () => this.closeModals());
                });
        }

        async loadInitialData() {
            try {
                await Promise.all([
                    this.loadStatistics(),
                    this.loadCompanies()
                ]);
            } catch (error) {
                console.error('Error loading initial data:', error);
                this.showNotification('Failed to load initial data', 'error');
            }
        }

        // API Integration Methods
        async loadStatistics() {
            try {
                const response = await fetch(`${this.baseUrl}/companies/overall-statistics`, {
                    headers: {
                        'Authorization': `Bearer ${this.token}`
                    }
                });

                if (!response.ok) throw new Error('Failed to load statistics');

                const data = await response.json();
                if (data.success) {
                    this.updateStatistics(data.statistics);
                }
            } catch (error) {
                console.error('Statistics loading error:', error);
                this.showNotification('Failed to load statistics', 'error');
            }
        }

        async loadCompanies() {
            try {
                this.showTableLoader(true);
                
                const queryParams = new URLSearchParams({
                    page: this.currentPage,
                    limit: this.pageSize,
                    search: this.filters.search,
                    industry: this.filters.industry,
                    status: this.filters.status,
                    plan: this.filters.plan
                });

                const response = await fetch(`${this.baseUrl}/companies?${queryParams}`, {
                    headers: {
                        'Authorization': `Bearer ${this.token}`
                    }
                });

                if (!response.ok) throw new Error('Failed to load companies');

                const data = await response.json();
                if (data.success) {
                    this.companies = data.data.companies;
                    this.totalCompanies = data.data.pagination.total;
                    this.renderCompaniesTable();
                    this.updatePagination(data.data.pagination);
                }
            } catch (error) {
                console.error('Companies loading error:', error);
                this.showNotification('Failed to load companies', 'error');
            } finally {
                this.showTableLoader(false);
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

                if (!response.ok) throw new Error('Failed to create company');

                const data = await response.json();
                if (data.success) {
                    this.showNotification('Company created successfully', 'success');
                    this.closeModals();
                    this.loadCompanies();
                    return true;
                }
                return false;
            } catch (error) {
                console.error('Company creation error:', error);
                this.showNotification('Failed to create company', 'error');
                return false;
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

                if (!response.ok) throw new Error('Failed to update company');

                const data = await response.json();
                if (data.success) {
                    this.showNotification('Company updated successfully', 'success');
                    this.closeModals();
                    this.loadCompanies();
                    return true;
                }
                return false;
            } catch (error) {
                console.error('Company update error:', error);
                this.showNotification('Failed to update company', 'error');
                return false;
            }
        }

        async deleteCompany(companyId) {
            try {
                const response = await fetch(`${this.baseUrl}/companies/${companyId}`, {
                    method: 'DELETE',
                    headers: {
                        'Authorization': `Bearer ${this.token}`
                    }
                });

                if (!response.ok) throw new Error('Failed to delete company');

                const data = await response.json();
                if (data.success) {
                    this.showNotification('Company deleted successfully', 'success');
                    this.loadCompanies();
                    return true;
                }
                return false;
            } catch (error) {
                console.error('Company deletion error:', error);
                this.showNotification('Failed to delete company', 'error');
                return false;
            }
        }

        // Utility Methods
        showTableLoader(show) {
            if (this.elements.table.loader) {
                this.elements.table.loader.style.display = show ? 'flex' : 'none';
            }
            if (this.elements.table.body) {
                this.elements.table.body.style.display = show ? 'none' : 'table-row-group';
            }
        }

        showNotification(message, type = 'info') {
            if (window.dashboardApp?.userInterface) {
                window.dashboardApp.userInterface.showNotification(message, type);
            } else {
                alert(message);
            }
        }

        debounce(func, wait) {
            let timeout;
            return (...args) => {
                clearTimeout(timeout);
                timeout = setTimeout(() => func.apply(this, args), wait);
            };
        }
                // Table Rendering Methods
        renderCompaniesTable() {
            if (!this.elements.table.body) return;

            if (!this.companies.length) {
                this.showNoDataMessage(true);
                return;
            }

            this.showNoDataMessage(false);
            this.elements.table.body.innerHTML = this.companies.map(company => this.createTableRow(company)).join('');
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
                            ${company.userCount || 0}
                        </div>
                    </td>
                    <td>
                        <span class="subscription-badge ${company.subscription?.plan?.toLowerCase()}">
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

        // Pagination Methods
        updatePagination(paginationData) {
            if (!this.elements.pagination.container) return;

            const { total, page, pages } = paginationData;
            const paginationHTML = `
                <div class="pagination-info">
                    Showing ${((page - 1) * this.pageSize) + 1} to 
                    ${Math.min(page * this.pageSize, total)} of ${total} entries
                </div>
                <div class="pagination-buttons">
                    ${this.createPaginationButtons(page, pages)}
                </div>
            `;

            this.elements.pagination.container.innerHTML = paginationHTML;
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
        openAddCompanyModal() {
            if (!this.elements.modals.addCompany) return;

            this.currentCompany = null;
            this.elements.modals.companyForm.reset();
            this.elements.modals.addCompany.querySelector('#modalTitle').textContent = 'Add New Company';
            this.showModal(this.elements.modals.addCompany);
        }

        openEditCompanyModal(company) {
            if (!this.elements.modals.addCompany) return;

            this.currentCompany = company;
            this.elements.modals.addCompany.querySelector('#modalTitle').textContent = 'Edit Company';
            this.populateCompanyForm(company);
            this.showModal(this.elements.modals.addCompany);
        }

        openDeleteConfirmationModal(companyId) {
            if (!this.elements.modals.deleteModal) return;

            const company = this.companies.find(c => c._id === companyId);
            if (!company) return;

            const companyNameElement = this.elements.modals.deleteModal.querySelector('#deleteCompanyName');
            if (companyNameElement) {
                companyNameElement.textContent = company.name;
            }

            this.elements.modals.deleteModal.dataset.companyId = companyId;
            this.showModal(this.elements.modals.deleteModal);
        }

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

        // Form Handling Methods
        async handleFormSubmit(event) {
            event.preventDefault();

            try {
                const formData = this.getFormData();
                if (!this.validateFormData(formData)) {
                    return;
                }

                const isSuccess = this.currentCompany
                    ? await this.updateCompany(this.currentCompany._id, formData)
                    : await this.createCompany(formData);

                if (isSuccess) {
                    this.closeModals();
                    await this.loadCompanies();
                }
            } catch (error) {
                console.error('Form submission error:', error);
                this.showNotification('Error processing form submission', 'error');
            }
        }

        getFormData() {
            const form = this.elements.modals.companyForm;
            const formData = new FormData(form);
            const data = {};

            for (const [key, value] of formData.entries()) {
                data[key] = value;
            }

            return data;
        }

        validateFormData(data) {
            const requiredFields = ['name', 'industry', 'contactEmail', 'subscriptionPlan'];
            const missingFields = requiredFields.filter(field => !data[field]);

            if (missingFields.length > 0) {
                this.showNotification(`Please fill in all required fields: ${missingFields.join(', ')}`, 'error');
                return false;
            }

            if (!this.isValidEmail(data.contactEmail)) {
                this.showNotification('Please enter a valid email address', 'error');
                return false;
            }

            return true;
        }

        populateCompanyForm(company) {
            const form = this.elements.modals.companyForm;
            if (!form) return;

            // Populate each form field
            Object.keys(company).forEach(key => {
                const input = form.querySelector(`[name="${key}"]`);
                if (input) {
                    input.value = company[key];
                }
            });
        }

        // Utility Methods
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
            return string.charAt(0).toUpperCase() + string.slice(1).toLowerCase();
        }

        showNoDataMessage(show) {
            if (this.elements.table.noData) {
                this.elements.table.noData.style.display = show ? 'block' : 'none';
            }
        }

        // Cleanup method
        cleanup() {
            // Remove event listeners and clean up resources
            this.closeModals();
            // Additional cleanup as needed
        }
    }



    // Export to window object
    window.CompaniesManager = CompaniesManager;
})();

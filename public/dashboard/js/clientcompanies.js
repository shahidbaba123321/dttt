(function() {
    // Check if CompaniesManager already exists
    if (window.CompaniesManager) {
        return; // Exit if already defined
    }

    class CompaniesManager {
        constructor(apiBaseUrl) {
            this.apiBaseUrl = apiBaseUrl || 'https://18.215.160.136.nip.io/api';
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
                .loader {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    gap: var(--spacing-md);
                    padding: var(--spacing-xl);
                    color: var(--text-secondary);
                }
                
                .loader i {
                    font-size: 2rem;
                    color: var(--primary-color);
                }
                
                .loader p {
                    margin: 0;
                }
            `;

            const styleSheet = document.createElement('style');
            styleSheet.textContent = styles;
            document.head.appendChild(styleSheet);
        }

                        initialize() {
            try {
                console.log('Initializing CompaniesManager...');
                
                // Delay initialization slightly to ensure DOM is ready
                setTimeout(async () => {
                    try {
                        await this.initializeEventListeners();
                        await this.loadCompanies();
                        await this.loadStatistics();
                    } catch (error) {
                        console.error('Error during delayed initialization:', error);
                    }
                }, 100);
                
            } catch (error) {
                console.error('Error initializing CompaniesManager:', error);
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

        showTableLoader() {
            const tbody = document.getElementById('companiesTableBody');
            if (!tbody) return;

            // Add loader styles if not already added
            if (!document.querySelector('#table-loader-styles')) {
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
                `;
                const styleSheet = document.createElement('style');
                styleSheet.id = 'table-loader-styles';
                styleSheet.textContent = styles;
                document.head.appendChild(styleSheet);
            }

            tbody.innerHTML = `
                <tr class="loading-row">
                    <td colspan="8">
                        <div class="table-loader">
                            <i class="fas fa-spinner fa-spin"></i>
                            <p>Loading companies data...</p>
                        </div>
                    </td>
                </tr>
            `;

            // Disable interactive elements while loading
            const filterElements = document.querySelectorAll('.filter-select, .search-box input');
            filterElements.forEach(element => {
                element.disabled = true;
            });
        }

        hideTableLoader() {
            // Re-enable interactive elements
            const filterElements = document.querySelectorAll('.filter-select, .search-box input');
            filterElements.forEach(element => {
                element.disabled = false;
            });

            // The actual table content will be replaced by renderCompaniesTable
            // But we'll ensure the loader is removed if renderCompaniesTable hasn't run
            const tbody = document.getElementById('companiesTableBody');
            if (tbody && tbody.querySelector('.loading-row')) {
                tbody.innerHTML = `
                    <tr>
                        <td colspan="8" class="text-center py-4">
                            <div class="empty-state">
                                <i class="fas fa-building text-muted"></i>
                                <p>No data available</p>
                            </div>
                        </td>
                    </tr>
                `;
            }
        }

        

                // Data Loading Methods
                        async loadCompanies(showLoader = true) {
            try {
                if (showLoader && document.getElementById('companiesTableBody')) {
                    this.showTableLoader();
                }

                const queryParams = new URLSearchParams({
                    page: this.currentPage,
                    limit: this.itemsPerPage,
                    sortField: this.sortField,
                    sortOrder: this.sortOrder,
                    ...this.filters
                });

                console.log('Loading companies with params:', queryParams.toString());
                const response = await this.makeRequest(`/companies?${queryParams}`, 'GET');

                if (response.success) {
                    this.companies = response.data.companies;
                    this.totalItems = response.data.pagination.total;
                    
                    if (document.getElementById('companiesTableBody')) {
                        this.updatePagination();
                        this.renderCompaniesTable();
                        if (response.data.filters?.industries) {
                            this.updateIndustryFilter(response.data.filters.industries);
                        }
                    }
                }
            } catch (error) {
                console.error('Error loading companies:', error);
                this.showNotification?.('Error loading companies. Please try again.', 'error');
                
                // Show error state in table
                const tbody = document.getElementById('companiesTableBody');
                if (tbody) {
                    tbody.innerHTML = `
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
            } finally {
                if (showLoader) {
                    this.hideTableLoader();
                }
            }
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
                }
            });

            // Animate numbers if elements exist
            if (document.querySelector('.stat-details')) {
                this.animateNumbers();
            }
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

                console.log(`Making ${method} request to:`, `${this.apiBaseUrl}${endpoint}`);
                const response = await fetch(`${this.apiBaseUrl}${endpoint}`, config);
                const responseData = await response.json();

                if (!response.ok) {
                    console.error('API Error Response:', responseData);
                    throw new Error(responseData.message || `API request failed with status ${response.status}`);
                }

                return responseData;
            } catch (error) {
                console.error('API Request Error:', error);
                throw error;
            }
        }
        // UI Rendering Methods
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
                // Modal Management
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

        async deleteCompany(companyId) {
            if (!confirm('Are you sure you want to delete this company? This action cannot be undone.')) {
                return;
            }

            try {
                const response = await this.makeRequest(`/companies/${companyId}`, 'DELETE');
                
                if (response.success) {
                    this.showNotification('Company deleted successfully', 'success');
                    this.loadCompanies();
                    this.loadStatistics();
                }
            } catch (error) {
                console.error('Error deleting company:', error);
                this.showNotification('Error deleting company', 'error');
            }
        }

        async toggleCompanyStatus(companyId) {
            try {
                const company = this.companies.find(c => c._id === companyId);
                if (!company) return;

                const newStatus = company.status === 'active' ? 'inactive' : 'active';
                const response = await this.makeRequest(
                    `/companies/${companyId}/status`,
                    'PATCH',
                    { status: newStatus }
                );

                if (response.success) {
                    this.showNotification(
                        `Company ${newStatus === 'active' ? 'activated' : 'deactivated'} successfully`,
                        'success'
                    );
                    this.loadCompanies();
                }
            } catch (error) {
                console.error('Error toggling company status:', error);
                this.showNotification('Error updating company status', 'error');
            }
        }

        // Form Validation
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

            // Utility Functions
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

        getCompanyInitials(name) {
            return name
                .split(' ')
                .map(word => word[0])
                .join('')
                .toUpperCase()
                .slice(0, 2);
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

        isGenericEmail(email) {
            const genericDomains = [
                'gmail.com', 'yahoo.com', 'hotmail.com', 
                'outlook.com', 'aol.com', 'icloud.com'
            ];
            const domain = email.split('@')[1].toLowerCase();
            return genericDomains.includes(domain);
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

        // Modal Management
        closeModals() {
            document.querySelectorAll('.modal').forEach(modal => {
                modal.classList.remove('show');
            });
            document.body.style.overflow = '';
        }

        // Cleanup
        cleanup() {
            // Remove event listeners
            document.removeEventListener('click', this.handleOutsideClick);
            
            // Destroy charts if any
            if (this.activityChart) {
                this.activityChart.destroy();
            }
            
            // Clear intervals/timeouts
            if (this.refreshInterval) {
                clearInterval(this.refreshInterval);
            }

            // Clear any other resources
            this.companies = [];
            this.selectedCompanyId = null;
        }

        // Animation
        animateNumbers() {
            document.querySelectorAll('.stat-details h3').forEach(element => {
                const finalValue = parseInt(element.textContent);
                this.animateValue(element, 0, finalValue, 1000);
            });
        }

        animateValue(element, start, end, duration) {
            if (start === end) return;
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
    }

    // Make CompaniesManager available globally
    window.CompaniesManager = CompaniesManager;
    console.log('CompaniesManager registered globally');
})();

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
                this.initializeElements();
                this.initializeEventListeners();
                this.populateIndustryDropdowns();
                await this.loadCompanies();
            } catch (error) {
                console.error('Initialization error:', error);
                this.showError('Failed to initialize companies module');
            }
        }

        initializeElements() {
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
            
            // User Management Modals
            this.addUserModal = document.getElementById('addUserModal');
            this.editUserModal = document.getElementById('editUserModal');
            
            // Forms
            this.companyForm = document.getElementById('companyForm');
            this.addUserForm = document.getElementById('addUserForm');
            this.changePlanForm = document.getElementById('changePlanForm');
            
            // Buttons
            this.addCompanyBtn = document.getElementById('addCompanyBtn');
            this.saveCompanyBtn = document.getElementById('saveCompanyBtn');
            this.cancelBtn = document.getElementById('cancelBtn');
        }

        initializeEventListeners() {
            // Company Management
            this.addCompanyBtn.addEventListener('click', () => this.showAddCompanyModal());
            this.companyForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handleCompanySubmit();
            });

            // Filters
            this.searchInput.addEventListener('input', this.debounce(() => {
                this.filters.search = this.searchInput.value;
                this.currentPage = 1;
                this.loadCompanies();
            }, 300));

            ['industryFilter', 'statusFilter', 'planFilter'].forEach(filterId => {
                document.getElementById(filterId)?.addEventListener('change', (e) => {
                    this.filters[e.target.id.replace('Filter', '')] = e.target.value;
                    this.currentPage = 1;
                    this.loadCompanies();
                });
            });

            // Subscription Management
            document.getElementById('changePlanForm')?.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handlePlanChange();
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

            // User Management
            document.getElementById('addUserForm')?.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handleAddUser();
            });

            // Modal close buttons
            document.querySelectorAll('.close-btn').forEach(btn => {
                btn.addEventListener('click', () => this.closeModals());
            });

            // Tab switching in details modal
            document.querySelectorAll('.tab-btn').forEach(btn => {
                btn.addEventListener('click', (e) => this.switchTab(e.target));
            });

            // Global click handler for closing modals
            document.addEventListener('click', (e) => {
                if (e.target.classList.contains('modal')) {
                    this.closeModals();
                }
            });

            // Escape key handler
            document.addEventListener('keydown', (e) => {
                if (e.key === 'Escape') {
                    this.closeModals();
                }
            });

            // User search and filters
            document.getElementById('userSearch')?.addEventListener('input', this.debounce((e) => {
                this.filterUsers(e.target.value);
            }, 300));

            document.getElementById('roleFilter')?.addEventListener('change', (e) => {
                this.filterUsers(document.getElementById('userSearch').value, e.target.value);
            });

            document.getElementById('userStatusFilter')?.addEventListener('change', (e) => {
                this.filterUsers(
                    document.getElementById('userSearch').value,
                    document.getElementById('roleFilter').value,
                    e.target.value
                );
            });
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

                if (!response.ok) throw new Error('Failed to fetch companies');

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
                // Pagination Methods
        renderPagination() {
            const totalPages = Math.ceil(this.totalCompanies / this.pageSize);
            
            if (totalPages <= 1) {
                this.paginationContainer.innerHTML = '';
                return;
            }

            let pages = this.getPaginationRange(this.currentPage, totalPages);
            
            this.paginationContainer.innerHTML = `
                <button class="btn-page" ${this.currentPage === 1 ? 'disabled' : ''} 
                        onclick="window.companiesManager.changePage(1)">
                    <i class="fas fa-angle-double-left"></i>
                </button>
                ${pages.map(page => `
                    <button class="btn-page ${page === this.currentPage ? 'active' : ''}"
                            onclick="window.companiesManager.changePage(${page})">
                        ${page}
                    </button>
                `).join('')}
                <button class="btn-page" ${this.currentPage === totalPages ? 'disabled' : ''} 
                        onclick="window.companiesManager.changePage(${totalPages})">
                    <i class="fas fa-angle-double-right"></i>
                </button>
            `;
        }

        getPaginationRange(current, total) {
            const range = [];
            const delta = 2;
            const left = current - delta;
            const right = current + delta + 1;

            for (let i = 1; i <= total; i++) {
                if (i === 1 || i === total || (i >= left && i < right)) {
                    range.push(i);
                }
            }

            return range;
        }

        changePage(page) {
            this.currentPage = page;
            this.loadCompanies();
        }

        // Subscription Management Methods
        async loadSubscriptionDetails(companyId) {
            try {
                const response = await fetch(`${this.baseUrl}/companies/${companyId}/subscription`, {
                    headers: this.getHeaders()
                });

                if (!response.ok) throw new Error('Failed to load subscription details');

                const data = await response.json();
                return data.subscription;
            } catch (error) {
                console.error('Error loading subscription:', error);
                this.showError('Failed to load subscription details');
                return null;
            }
        }

        async renderSubscriptionTab(company) {
            try {
                const subscription = await this.loadSubscriptionDetails(company._id);
                if (!subscription) return;

                const tabContent = document.querySelector('.tab-content');
                tabContent.innerHTML = `
                    <div class="subscription-details">
                        <div class="current-plan">
                            <h4>Current Subscription</h4>
                            <div class="plan-info">
                                <div class="info-group">
                                    <label>Plan Type:</label>
                                    <span class="plan-badge ${subscription.plan}">
                                        ${subscription.plan.toUpperCase()}
                                    </span>
                                </div>
                                <div class="info-group">
                                    <label>Status:</label>
                                    <span class="status-badge ${subscription.status}">
                                        ${subscription.status.toUpperCase()}
                                    </span>
                                </div>
                                <div class="info-group">
                                    <label>Billing Cycle:</label>
                                    <span>${subscription.billingCycle}</span>
                                </div>
                                <div class="info-group">
                                    <label>Next Billing Date:</label>
                                    <span>${new Date(subscription.nextBillingDate).toLocaleDateString()}</span>
                                </div>
                                <div class="info-group">
                                    <label>Amount:</label>
                                    <span>$${subscription.amount.toFixed(2)}/month</span>
                                </div>
                            </div>
                        </div>

                        <div class="plan-features">
                            <h4>Plan Features</h4>
                            <ul class="feature-list">
                                ${this.subscriptionPlans[subscription.plan].features.map(feature => `
                                    <li><i class="fas fa-check"></i> ${feature}</li>
                                `).join('')}
                            </ul>
                        </div>

                        <div class="subscription-actions">
                            <button class="btn-primary" onclick="window.companiesManager.showChangePlanModal('${company._id}')">
                                <i class="fas fa-exchange-alt"></i> Change Plan
                            </button>
                            <button class="btn-secondary" onclick="window.companiesManager.generateInvoice('${company._id}')">
                                <i class="fas fa-file-invoice"></i> Generate Invoice
                            </button>
                        </div>
                    </div>

                    <div class="billing-history">
                        <h4>Billing History</h4>
                        ${await this.renderBillingHistory(company._id)}
                    </div>
                `;

                this.initializeSubscriptionEventListeners(company._id);
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

                if (!response.ok) throw new Error('Failed to load billing history');

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
                const subscription = await this.loadSubscriptionDetails(companyId);
                if (!subscription) return;

                this.changePlanModal.classList.add('show');
                
                // Populate current plan details
                document.getElementById('currentPlan').textContent = subscription.plan.toUpperCase();
                document.getElementById('newPlan').value = subscription.plan;
                document.getElementById('billingCycle').value = subscription.billingCycle;

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

                const response = await fetch(`${this.baseUrl}/companies/${companyId}/subscription`, {
                    method: 'POST',
                    headers: this.getHeaders(),
                    body: JSON.stringify(planData)
                });

                if (!response.ok) throw new Error('Failed to update subscription');

                this.showSuccess('Subscription updated successfully');
                this.changePlanModal.classList.remove('show');
                await this.renderSubscriptionTab({ _id: companyId });
            } catch (error) {
                console.error('Error changing subscription plan:', error);
                this.showError('Failed to update subscription');
            }
        }

        async generateInvoice(companyId) {
            try {
                const response = await fetch(`${this.baseUrl}/companies/${companyId}/generate-invoice`, {
                    method: 'POST',
                    headers: this.getHeaders()
                });

                if (!response.ok) throw new Error('Failed to generate invoice');

                const invoice = await response.json();
                this.showSuccess('Invoice generated successfully');
                await this.renderSubscriptionTab({ _id: companyId });
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

                if (!response.ok) throw new Error('Failed to download invoice');

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
        async loadCompanyUsers(companyId) {
            try {
                const response = await fetch(`${this.baseUrl}/companies/${companyId}/users`, {
                    headers: this.getHeaders()
                });

                if (!response.ok) throw new Error('Failed to load company users');

                const data = await response.json();
                return data.users;
            } catch (error) {
                console.error('Error loading company users:', error);
                this.showError('Failed to load company users');
                return [];
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

                        <div class="users-table-container">
                            ${this.renderUsersTable(users)}
                        </div>
                    </div>
                `;

                this.initializeUserManagementListeners();
            } catch (error) {
                console.error('Error rendering users tab:', error);
                this.showError('Failed to load users information');
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
            `;
        }

        showAddUserModal(companyId) {
            this.addUserModal.classList.add('show');
            this.addUserModal.querySelector('form').dataset.companyId = companyId;
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

                const response = await fetch(`${this.baseUrl}/companies/${companyId}/users`, {
                    method: 'POST',
                    headers: this.getHeaders(),
                    body: JSON.stringify(userData)
                });

                if (!response.ok) throw new Error('Failed to add user');

                const result = await response.json();
                this.showSuccess('User added successfully');
                
                if (result.data.tempPassword) {
                    alert(`Temporary password for ${userData.email}: ${result.data.tempPassword}`);
                }

                this.addUserModal.classList.remove('show');
                form.reset();
                await this.renderUsersTab({ _id: companyId });
            } catch (error) {
                console.error('Error adding user:', error);
                this.showError('Failed to add user');
            }
        }

        async editUser(userId) {
            try {
                const response = await fetch(`${this.baseUrl}/companies/${this.currentCompanyId}/users/${userId}`, {
                    headers: this.getHeaders()
                });

                if (!response.ok) throw new Error('Failed to fetch user details');

                const user = await response.json();
                this.populateEditUserForm(user);
                this.editUserModal.classList.add('show');
            } catch (error) {
                console.error('Error loading user details:', error);
                this.showError('Failed to load user details');
            }
        }

        populateEditUserForm(user) {
            document.getElementById('editUserName').value = user.name;
            document.getElementById('editUserEmail').value = user.email;
            document.getElementById('editUserRole').value = user.role;
            document.getElementById('editUserDepartment').value = user.department || '';
            document.getElementById('editUserForm').dataset.userId = user._id;
        }

        async handleEditUser(event) {
            try {
                const form = event.target;
                const userId = form.dataset.userId;

                const userData = {
                    name: document.getElementById('editUserName').value,
                    email: document.getElementById('editUserEmail').value,
                    role: document.getElementById('editUserRole').value,
                    department: document.getElementById('editUserDepartment').value
                };

                const response = await fetch(`${this.baseUrl}/companies/${this.currentCompanyId}/users/${userId}`, {
                    method: 'PUT',
                    headers: this.getHeaders(),
                    body: JSON.stringify(userData)
                });

                if (!response.ok) throw new Error('Failed to update user');

                this.showSuccess('User updated successfully');
                this.editUserModal.classList.remove('show');
                await this.renderUsersTab({ _id: this.currentCompanyId });
            } catch (error) {
                console.error('Error updating user:', error);
                this.showError('Failed to update user');
            }
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

                if (!response.ok) throw new Error('Failed to reset password');

                const result = await response.json();
                this.showSuccess('Password reset successfully');
                
                if (result.data.tempPassword) {
                    alert(`New temporary password: ${result.data.tempPassword}`);
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

                if (!response.ok) throw new Error('Failed to toggle user status');

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

        initializeUserManagementListeners() {
            // User search
            const searchInput = document.getElementById('userSearch');
            if (searchInput) {
                searchInput.addEventListener('input', this.debounce((e) => {
                    this.filterUsers(
                        e.target.value,
                        document.getElementById('roleFilter').value,
                        document.getElementById('userStatusFilter').value
                    );
                }, 300));
            }

            // Role filter
            const roleFilter = document.getElementById('roleFilter');
            if (roleFilter) {
                roleFilter.addEventListener('change', (e) => {
                    this.filterUsers(
                        document.getElementById('userSearch').value,
                        e.target.value,
                        document.getElementById('userStatusFilter').value
                    );
                });
            }

            // Status filter
            const statusFilter = document.getElementById('userStatusFilter');
            if (statusFilter) {
                statusFilter.addEventListener('change', (e) => {
                    this.filterUsers(
                        document.getElementById('userSearch').value,
                        document.getElementById('roleFilter').value,
                        e.target.value
                    );
                });
            }
        }

        // Utility Methods for User Management
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

            // Utility Methods
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

        escapeHtml(unsafe) {
            if (!unsafe) return '';
            return unsafe
                .replace(/&/g, "&amp;")
                .replace(/</g, "&lt;")
                .replace(/>/g, "&gt;")
                .replace(/"/g, "&quot;")
                .replace(/'/g, "&#039;");
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

        // Modal Management
        closeModals() {
            document.querySelectorAll('.modal').forEach(modal => {
                modal.classList.remove('show');
            });
            this.resetForms();
        }

        resetForms() {
            // Reset company form
            if (this.companyForm) {
                this.companyForm.reset();
            }

            // Reset user forms
            const addUserForm = document.getElementById('addUserForm');
            if (addUserForm) {
                addUserForm.reset();
            }

            const editUserForm = document.getElementById('editUserForm');
            if (editUserForm) {
                editUserForm.reset();
            }

            // Reset plan change form
            const changePlanForm = document.getElementById('changePlanForm');
            if (changePlanForm) {
                changePlanForm.reset();
            }

            // Clear any stored IDs
            this.currentCompanyId = null;
        }

        // Tab Management
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

        // Activity Log Management
        async renderActivityTab(company) {
            try {
                const response = await fetch(`${this.baseUrl}/companies/${company._id}/activity-logs`, {
                    headers: this.getHeaders()
                });

                if (!response.ok) throw new Error('Failed to fetch activity logs');

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
    }

    // Initialize the Companies Manager globally
    window.CompaniesManager = CompaniesManager;
})();

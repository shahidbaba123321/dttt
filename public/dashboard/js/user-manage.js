class UserManagementSystem {
    constructor() {
        this.currentPage = 1;
        this.itemsPerPage = 10;
        this.totalUsers = 0;
        this.users = [];
        this.currentEditUserId = null;
        this.filters = {
            search: '',
            role: '',
            status: '',
            department: ''
        };
        this.departments = [
            'Information Technology',
            'Human Resources',
            'Finance',
            'Marketing',
            'Operations',
            'Sales',
            'Research & Development',
            'Legal',
            'Customer Support',
            'Administration'
        ];
    }

    async initialize() {
        try {
            this.initializeElements();
            await this.loadFilters();
            await this.loadUsers();
            this.initializeEventListeners();
            console.log('User Management System initialized successfully');
        } catch (error) {
            console.error('Failed to initialize User Management System:', error);
            utils.showNotification('Failed to load user management system', 'error');
        }
    }

        initializeElements() {
        try {
            // Search and filter elements
            this.searchInput = document.getElementById('userSearchInput');
            this.roleFilter = document.getElementById('roleFilter');
            this.statusFilter = document.getElementById('statusFilter');
            this.departmentFilter = document.getElementById('departmentFilter');

            // Table and pagination elements
            this.tableBody = document.getElementById('usersTableBody');
            this.paginationControls = document.getElementById('paginationControls');
            this.currentRangeElement = document.getElementById('currentRange');
            this.totalUsersElement = document.getElementById('totalUsers');

            // Modal elements
            this.userModal = document.getElementById('userModal');
            this.deleteModal = document.getElementById('deleteModal');
            this.userForm = document.getElementById('userForm');
            this.addUserBtn = document.getElementById('addUserBtn');
            this.saveUserBtn = document.getElementById('saveUserBtn');
            this.cancelUserBtn = document.getElementById('cancelUserBtn');
            this.confirmDeleteBtn = document.getElementById('confirmDeleteBtn');
            this.cancelDeleteBtn = document.getElementById('cancelDeleteBtn');

            // Validate required elements
            if (!this.validateElements()) {
                throw new Error('Required elements not found in the DOM');
            }
        } catch (error) {
            console.error('Error initializing elements:', error);
            throw error;
        }
    }
    validateElements() {
        const requiredElements = [
            this.searchInput,
            this.roleFilter,
            this.statusFilter,
            this.departmentFilter,
            this.tableBody,
            this.paginationControls,
            this.currentRangeElement,
            this.totalUsersElement,
            this.userModal,
            this.deleteModal,
            this.userForm,
            this.addUserBtn,
            this.saveUserBtn,
            this.cancelUserBtn,
            this.confirmDeleteBtn,
            this.cancelDeleteBtn
        ];

        return requiredElements.every(element => element !== null);
    }

    initializeEventListeners() {
        // Search input with debounce
        this.searchInput.addEventListener('input', debounce(() => {
            this.filters.search = this.searchInput.value;
            this.currentPage = 1;
            this.loadUsers();
        }, 300));

        // Filter change handlers
        this.roleFilter.addEventListener('change', () => {
            this.filters.role = this.roleFilter.value;
            this.currentPage = 1;
            this.loadUsers();
        });

        this.statusFilter.addEventListener('change', () => {
            this.filters.status = this.statusFilter.value;
            this.currentPage = 1;
            this.loadUsers();
        });

        this.departmentFilter.addEventListener('change', () => {
            this.filters.department = this.departmentFilter.value;
            this.currentPage = 1;
            this.loadUsers();
        });

        // Modal handlers
        this.addUserBtn.addEventListener('click', () => this.showUserModal());
        this.saveUserBtn.addEventListener('click', (e) => {
            e.preventDefault();
            this.handleUserFormSubmit();
        });
        this.cancelUserBtn.addEventListener('click', () => this.hideUserModal());
        this.cancelDeleteBtn.addEventListener('click', () => this.hideDeleteModal());

        // Close modal on outside click
        window.addEventListener('click', (e) => {
            if (e.target === this.userModal) this.hideUserModal();
            if (e.target === this.deleteModal) this.hideDeleteModal();
        });

        // Form submission
        this.userForm.addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleUserFormSubmit();
        });
    }

        async loadFilters() {
        try {
            // Load roles
            const rolesResponse = await utils.fetchWithAuth('/roles');
            if (rolesResponse.success) {
                this.populateSelect(this.roleFilter, rolesResponse.roles, 'name');
            }

            // Status filter is static
            this.statusFilter.innerHTML = `
                <option value="">All Status</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
                <option value="pending">Pending</option>
                <option value="suspended">Suspended</option>
            `;

        } catch (error) {
            console.error('Error loading filters:', error);
            utils.showNotification('Failed to load filters', 'error');
            throw error;
        }
    }
    
    populateSelect(selectElement, items, valueKey) {
        const currentValue = selectElement.value;
        const defaultOption = document.createElement('option');
        defaultOption.value = '';
        defaultOption.textContent = `All ${selectElement.id.replace('Filter', 's')}`;
        
        selectElement.innerHTML = '';
        selectElement.appendChild(defaultOption);

        items.forEach(item => {
            const option = document.createElement('option');
            option.value = item[valueKey];
            option.textContent = item[valueKey];
            selectElement.appendChild(option);
        });

        selectElement.value = currentValue;
    }

    async loadUsers() {
        try {
            this.showLoadingState();
            const queryParams = new URLSearchParams({
                page: this.currentPage,
                limit: this.itemsPerPage,
                search: this.filters.search,
                role: this.filters.role,
                status: this.filters.status,
                department: this.filters.department
            });

            const response = await utils.fetchWithAuth(`/users?${queryParams}`);
            if (response.success) {
                this.users = response.users;
                this.totalUsers = response.pagination.total;
                this.renderUsers();
                this.updatePagination(response.pagination);
            } else {
                throw new Error(response.message || 'Failed to load users');
            }
        } catch (error) {
            console.error('Error loading users:', error);
            utils.showNotification('Failed to load users', 'error');
        } finally {
            this.hideLoadingState();
        }
    }

    showLoadingState() {
        this.tableBody.innerHTML = `
            <tr>
                <td colspan="7" class="loading-state">
                    <div class="loading-spinner"></div>
                    <p>Loading users...</p>
                </td>
            </tr>
        `;
    }

    hideLoadingState() {
        const loadingRow = this.tableBody.querySelector('.loading-state');
        if (loadingRow) {
            loadingRow.remove();
        }
    }

            renderUsers() {
        this.tableBody.innerHTML = '';
        if (this.users.length === 0) {
            this.tableBody.innerHTML = `
                <tr>
                    <td colspan="7" class="no-data">
                        <i class="fas fa-search"></i>
                        <p>No users found</p>
                    </td>
                </tr>
            `;
            return;
        }

        this.users.forEach(user => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>
                    <div class="user-info">
                        <div class="user-avatar">${this.getInitials(user.name || user.email)}</div>
                        <div class="user-details">
                            <div class="user-name">${user.name || 'N/A'}</div>
                            <div class="user-email">${user.email}</div>
                        </div>
                    </div>
                </td>
                <td>${user.department || 'N/A'}</td>
                <td>
                    <span class="role-badge ${user.role.toLowerCase()}">${user.role}</span>
                </td>
                <td>
                    <span class="status-badge status-${user.status.toLowerCase()}">
                        ${this.capitalizeFirst(user.status)}
                    </span>
                </td>
                <td>
                    <label class="switch">
                        <input type="checkbox" ${user.requires2FA ? 'checked' : ''} 
                               class="tfa-toggle" data-userid="${user._id}">
                        <span class="slider round"></span>
                    </label>
                </td>
                <td>
                    <div class="action-buttons">
                        <button class="btn-icon btn-edit" data-userid="${user._id}" title="Edit User">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn-icon btn-status" data-userid="${user._id}" 
                                title="${user.status === 'active' ? 'Deactivate' : 'Activate'} User">
                            <i class="fas fa-${user.status === 'active' ? 'ban' : 'check-circle'}"></i>
                        </button>
                        <button class="btn-icon btn-delete" data-userid="${user._id}" title="Delete User">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </td>
            `;

            // Add event listeners
            const editBtn = row.querySelector('.btn-edit');
            const deleteBtn = row.querySelector('.btn-delete');
            const statusBtn = row.querySelector('.btn-status');
            const twoFAToggle = row.querySelector('.tfa-toggle'); // Changed from 2fa-toggle to tfa-toggle

            editBtn.addEventListener('click', () => this.editUser(user._id));
            deleteBtn.addEventListener('click', () => this.showDeleteModal(user._id));
            statusBtn.addEventListener('click', () => this.toggleUserStatus(user._id, user.status));
            twoFAToggle.addEventListener('change', (e) => this.toggle2FA(user._id, e.target.checked));

            this.tableBody.appendChild(row);
        });
    }

    updatePagination(pagination) {
        const { total, page, pages } = pagination;
        
        // Update range and total display
        const start = (page - 1) * this.itemsPerPage + 1;
        const end = Math.min(page * this.itemsPerPage, total);
        this.currentRangeElement.textContent = `${start}-${end}`;
        this.totalUsersElement.textContent = total;

        // Generate pagination controls
        this.paginationControls.innerHTML = '';
        
        if (pages > 1) {
            // Previous button
            const prevButton = this.createPaginationButton(
                '<i class="fas fa-chevron-left"></i>',
                page > 1,
                () => this.changePage(page - 1)
            );
            this.paginationControls.appendChild(prevButton);

            // Page numbers
            let startPage = Math.max(1, page - 2);
            let endPage = Math.min(pages, page + 2);

            if (startPage > 1) {
                this.paginationControls.appendChild(
                    this.createPaginationButton('1', true, () => this.changePage(1))
                );
                if (startPage > 2) {
                    this.paginationControls.appendChild(
                        this.createPaginationButton('...', false)
                    );
                }
            }

            for (let i = startPage; i <= endPage; i++) {
                this.paginationControls.appendChild(
                    this.createPaginationButton(i.toString(), true, () => this.changePage(i), i === page)
                );
            }

            if (endPage < pages) {
                if (endPage < pages - 1) {
                    this.paginationControls.appendChild(
                        this.createPaginationButton('...', false)
                    );
                }
                this.paginationControls.appendChild(
                    this.createPaginationButton(pages.toString(), true, () => this.changePage(pages))
                );
            }

            // Next button
            const nextButton = this.createPaginationButton(
                '<i class="fas fa-chevron-right"></i>',
                page < pages,
                () => this.changePage(page + 1)
            );
            this.paginationControls.appendChild(nextButton);
        }
    }

    createPaginationButton(text, enabled, onClick, isActive = false) {
        const button = document.createElement('button');
        button.className = `pagination-button ${isActive ? 'active' : ''} ${!enabled ? 'disabled' : ''}`;
        button.innerHTML = text;
        if (enabled && onClick) {
            button.addEventListener('click', onClick);
        }
        return button;
    }

    async changePage(page) {
        this.currentPage = page;
        await this.loadUsers();
    }

    async editUser(userId) {
        try {
            const user = this.users.find(u => u._id === userId);
            if (!user) {
                utils.showNotification('User not found', 'error');
                return;
            }

            this.currentEditUserId = userId;
            const form = this.userForm;

            // Populate form fields
            form.elements.userName.value = user.name || '';
            form.elements.userEmail.value = user.email;
            form.elements.userDepartment.value = user.department || '';
            form.elements.userRole.value = user.role;
            form.elements.user2FA.checked = user.requires2FA;

            // Update modal title and show
            document.getElementById('modalTitle').textContent = 'Edit User';
            this.showUserModal();

        } catch (error) {
            console.error('Error preparing user edit:', error);
            utils.showNotification('Failed to load user data', 'error');
        }
    }

    async handleUserFormSubmit() {
        try {
            if (!this.userForm.checkValidity()) {
                this.userForm.reportValidity();
                return;
            }

            const formData = {
                name: this.userForm.elements.userName.value.trim(),
                email: this.userForm.elements.userEmail.value.trim(),
                department: this.userForm.elements.userDepartment.value,
                role: this.userForm.elements.userRole.value,
                requires2FA: this.userForm.elements.user2FA.checked
            };

            const isEdit = !!this.currentEditUserId;
            const endpoint = isEdit ? `/users/${this.currentEditUserId}` : '/users';
            const method = isEdit ? 'PUT' : 'POST';

            const response = await utils.fetchWithAuth(endpoint, {
                method: method,
                body: JSON.stringify(formData)
            });

            if (response.success) {
                utils.showNotification(
                    `User successfully ${isEdit ? 'updated' : 'created'}`,
                    'success'
                );
                this.hideUserModal();
                await this.loadUsers();
            } else {
                throw new Error(response.message || 'Operation failed');
            }

        } catch (error) {
            console.error('Error saving user:', error);
            utils.showNotification(
                `Failed to ${this.currentEditUserId ? 'update' : 'create'} user: ${error.message}`,
                'error'
            );
        }
    }

    async toggle2FA(userId, enabled) {
        try {
            const response = await utils.fetchWithAuth(`/users/${userId}/2fa`, {
                method: 'PUT',
                body: JSON.stringify({ requires2FA: enabled })
            });

            if (response.success) {
                utils.showNotification(`2FA ${enabled ? 'enabled' : 'disabled'} successfully`);
                await this.loadUsers();
            } else {
                throw new Error(response.message || 'Failed to update 2FA settings');
            }
        } catch (error) {
            console.error('Error toggling 2FA:', error);
            utils.showNotification('Failed to update 2FA settings', 'error');
            // Revert toggle state
            const toggle = document.querySelector(`input[data-userid="${userId}"]`);
            if (toggle) toggle.checked = !enabled;
        }
    }

    async toggleUserStatus(userId, currentStatus) {
        try {
            const newStatus = currentStatus === 'active' ? 'inactive' : 'active';
            const response = await utils.fetchWithAuth(`/users/${userId}/status`, {
                method: 'PUT',
                body: JSON.stringify({ status: newStatus })
            });

            if (response.success) {
                utils.showNotification(`User ${newStatus === 'active' ? 'activated' : 'deactivated'} successfully`);
                await this.loadUsers();
            } else {
                throw new Error(response.message || 'Failed to update user status');
            }
        } catch (error) {
            console.error('Error toggling user status:', error);
            utils.showNotification('Failed to update user status', 'error');
        }
    }

    async showDeleteModal(userId) {
        this.currentEditUserId = userId;
        const user = this.users.find(u => u._id === userId);
        
        if (!user) {
            utils.showNotification('User not found', 'error');
            return;
        }

        const confirmMessage = document.querySelector('#deleteModal .modal-body p');
        confirmMessage.textContent = `Are you sure you want to delete ${user.name || user.email}? This action cannot be undone.`;
        
        this.deleteModal.style.display = 'block';
        
        // Reset and focus on reason input
        const reasonInput = document.getElementById('deleteReason');
        reasonInput.value = '';
        reasonInput.focus();
    }

    async handleDeleteUser() {
        try {
            const reason = document.getElementById('deleteReason').value.trim();
            if (!reason) {
                utils.showNotification('Please provide a reason for deletion', 'error');
                return;
            }

            const response = await utils.fetchWithAuth(`/users/${this.currentEditUserId}`, {
                method: 'DELETE',
                body: JSON.stringify({ reason })
            });

            if (response.success) {
                utils.showNotification('User deleted successfully');
                this.hideDeleteModal();
                await this.loadUsers();
            } else {
                throw new Error(response.message || 'Failed to delete user');
            }
        } catch (error) {
            console.error('Error deleting user:', error);
            utils.showNotification('Failed to delete user', 'error');
        }
    }

    showUserModal() {
        this.userModal.style.display = 'block';
        this.userForm.elements.userName.focus();
    }

    hideUserModal() {
        this.userModal.style.display = 'none';
        this.userForm.reset();
        this.currentEditUserId = null;
    }

    hideDeleteModal() {
        this.deleteModal.style.display = 'none';
        document.getElementById('deleteReason').value = '';
        this.currentEditUserId = null;
    }

    getInitials(name) {
        return name
            .split(/[\s@.]/)
            .map(part => part[0])
            .join('')
            .toUpperCase()
            .slice(0, 2);
    }

    capitalizeFirst(string) {
        return string.charAt(0).toUpperCase() + string.slice(1).toLowerCase();
    }
}

// Utility function for debouncing
function debounce(func, wait) {
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

// Initialize the User Management System
let userManagement;
document.addEventListener('DOMContentLoaded', () => {
    userManagement = new UserManagementSystem();
    userManagement.initialize().catch(error => {
        console.error('Failed to initialize User Management System:', error);
        utils.showNotification('System initialization failed', 'error');
    });
});

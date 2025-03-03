class UserManagementSystem {
    constructor() {
        this.currentPage = 1;
        this.itemsPerPage = 10;
        this.totalUsers = 0;
        this.users = [];
        this.currentEditUserId = null;
        this.availableRoles = [];
        this.filters = {
            search: '',
            role: '',
            status: '',
            department: ''
        };
    }

    async initialize() {
        try {
            await this.initializeElements();
            await this.loadFilters();
            await this.loadUsers();
            this.initializeEventListeners();
            console.log('User Management System initialized successfully');
        } catch (error) {
            console.error('Failed to initialize User Management System:', error);
            this.showNotification('Failed to load user management system', 'error');
        }
    }

    async initializeElements() {
        try {
            // Search and filter elements
            this.searchInput = document.getElementById('userManageSearchInput');
            this.roleFilter = document.getElementById('userManageRoleFilter');
            this.statusFilter = document.getElementById('userManageStatusFilter');

            // Table and pagination elements
            this.tableBody = document.getElementById('userManageTableBody');
            this.paginationControls = document.getElementById('userManagePaginationControls');
            this.currentRangeElement = document.getElementById('userManageCurrentRange');
            this.totalUsersElement = document.getElementById('userManageTotalUsers');

            // Modal elements
            this.userModal = document.getElementById('userManageModal');
            this.deleteModal = document.getElementById('userManageDeleteModal');
            this.userForm = document.getElementById('userManageForm');
            this.modalTitle = document.getElementById('userManageModalTitle');

            // Form elements
            this.nameInput = document.getElementById('userManageName');
            this.emailInput = document.getElementById('userManageEmail');
            this.departmentInput = document.getElementById('userManageDepartment');
            this.roleSelect = document.getElementById('userManageRole');
            this.twoFACheckbox = document.getElementById('userManage2FA');

            // Buttons
            this.addUserBtn = document.getElementById('addUserManageBtn');
            this.saveUserBtn = document.getElementById('saveUserManageBtn');
            this.cancelUserBtn = document.getElementById('cancelUserManageBtn');
            this.closeUserModalBtn = document.getElementById('closeUserManageModal');
            this.confirmDeleteBtn = document.getElementById('confirmUserManageDeleteBtn');
            this.cancelDeleteBtn = document.getElementById('cancelUserManageDeleteBtn');
            this.closeDeleteModalBtn = document.getElementById('closeUserManageDeleteModal');

            if (!this.validateElements()) {
                throw new Error('Required elements not found in the DOM');
            }
        } catch (error) {
            console.error('Error initializing elements:', error);
            throw error;
        }
    }

    validateElements() {
        const requiredElements = {
            searchInput: this.searchInput,
            roleFilter: this.roleFilter,
            statusFilter: this.statusFilter,
            tableBody: this.tableBody,
            paginationControls: this.paginationControls,
            currentRangeElement: this.currentRangeElement,
            totalUsersElement: this.totalUsersElement,
            userModal: this.userModal,
            deleteModal: this.deleteModal,
            userForm: this.userForm,
            modalTitle: this.modalTitle,
            nameInput: this.nameInput,
            emailInput: this.emailInput,
            departmentInput: this.departmentInput,
            roleSelect: this.roleSelect,
            twoFACheckbox: this.twoFACheckbox,
            addUserBtn: this.addUserBtn,
            saveUserBtn: this.saveUserBtn,
            cancelUserBtn: this.cancelUserBtn,
            closeUserModalBtn: this.closeUserModalBtn,
            confirmDeleteBtn: this.confirmDeleteBtn,
            cancelDeleteBtn: this.cancelDeleteBtn,
            closeDeleteModalBtn: this.closeDeleteModalBtn
        };

        const missingElements = Object.entries(requiredElements)
            .filter(([, element]) => !element)
            .map(([name]) => name);

        if (missingElements.length > 0) {
            console.error('Missing elements:', missingElements);
            return false;
        }

        return true;
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

        // Modal handlers
        this.addUserBtn.addEventListener('click', () => {
            this.currentEditUserId = null;
            this.modalTitle.textContent = 'Add New User';
            this.showUserModal();
        });

        this.saveUserBtn.addEventListener('click', (e) => {
            e.preventDefault();
            this.handleUserFormSubmit();
        });

        this.userForm.addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleUserFormSubmit();
        });

        // Modal close handlers
        this.closeUserModalBtn.addEventListener('click', () => this.hideUserModal());
        this.cancelUserBtn.addEventListener('click', () => this.hideUserModal());
        this.closeDeleteModalBtn.addEventListener('click', () => this.hideDeleteModal());
        this.cancelDeleteBtn.addEventListener('click', () => this.hideDeleteModal());
        this.confirmDeleteBtn.addEventListener('click', () => this.handleDeleteUser());

        // Close modals on outside click
        window.addEventListener('click', (e) => {
            if (e.target === this.userModal) this.hideUserModal();
            if (e.target === this.deleteModal) this.hideDeleteModal();
        });
    }
        async loadFilters() {
        try {
            // Load roles for both filter and user form
            const rolesResponse = await utils.fetchWithAuth('/roles');
            if (rolesResponse.success) {
                // Store roles for later use
                this.availableRoles = rolesResponse.roles.filter(role => 
                    role.name.toLowerCase() !== 'superadmin'
                );
                
                // Populate role filter in search
                this.populateSelect(this.roleFilter, this.availableRoles, 'name');
                
                // Populate role select in user form
                this.populateRoleSelect();
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
            this.showNotification('Failed to load filters', 'error');
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

    populateRoleSelect() {
        if (!this.roleSelect) return;

        this.roleSelect.innerHTML = '<option value="">Select Role</option>';
        
        this.availableRoles.forEach(role => {
            const option = document.createElement('option');
            option.value = role._id;
            option.textContent = role.name;
            this.roleSelect.appendChild(option);
        });
    }

    async loadUsers() {
        try {
            this.showLoadingState();
            const queryParams = new URLSearchParams({
                page: this.currentPage,
                limit: this.itemsPerPage,
                search: this.filters.search,
                role: this.filters.role,
                status: this.filters.status
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
            this.showNotification('Failed to load users', 'error');
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
                <td colspan="6" class="no-data">
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
        const twoFAToggle = row.querySelector('.tfa-toggle');

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
                this.showNotification('User not found', 'error');
                return;
            }

            this.currentEditUserId = userId;

            // Populate form fields
            this.nameInput.value = user.name || '';
            this.emailInput.value = user.email;
            this.departmentInput.value = user.department || '';
            
            // Ensure roles are populated and set the correct role
            this.populateRoleSelect();
            if (user.roleId) {
                this.roleSelect.value = user.roleId;
            } else {
                const roleObj = this.availableRoles.find(r => r.name === user.role);
                if (roleObj) {
                    this.roleSelect.value = roleObj._id;
                }
            }
            
            this.twoFACheckbox.checked = user.requires2FA;

            // Update modal title and show
            this.modalTitle.textContent = 'Edit User';
            this.showUserModal();

        } catch (error) {
            console.error('Error preparing user edit:', error);
            this.showNotification('Failed to load user data', 'error');
        }
    }

    async handleUserFormSubmit() {
    try {
        if (!this.userForm.checkValidity()) {
            this.userForm.reportValidity();
            return;
        }

        if (!this.roleSelect.value) {
            this.showNotification('Please select a role', 'error');
            return;
        }

        // Get the selected role details
        const selectedRole = this.availableRoles.find(role => role._id === this.roleSelect.value);
        if (!selectedRole) {
            this.showNotification('Invalid role selected', 'error');
            return;
        }

        const formData = {
            name: this.nameInput.value.trim(),
            email: this.emailInput.value.trim(),
            department: this.departmentInput.value.trim(),
            role: selectedRole.name, // Send role name instead of ID
            requires2FA: this.twoFACheckbox.checked,
            status: 'active' // Add default status for new users
        };

        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(formData.email)) {
            this.showNotification('Please enter a valid email address', 'error');
            return;
        }

        // Validate required fields
        if (!formData.name || !formData.email || !formData.department || !formData.role) {
            this.showNotification('Please fill in all required fields', 'error');
            return;
        }

        const isEdit = !!this.currentEditUserId;
        const endpoint = isEdit ? `/users/${this.currentEditUserId}` : '/users';
        const method = isEdit ? 'PUT' : 'POST';

        // Log the request data for debugging
        console.log('Sending request:', {
            endpoint,
            method,
            formData
        });

        const response = await utils.fetchWithAuth(endpoint, {
            method: method,
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(formData)
        });

        if (response.success) {
            this.showNotification(
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
        this.showNotification(
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
                this.showNotification(`2FA ${enabled ? 'enabled' : 'disabled'} successfully`);
                await this.loadUsers();
            } else {
                throw new Error(response.message || 'Failed to update 2FA settings');
            }
        } catch (error) {
            console.error('Error toggling 2FA:', error);
            this.showNotification('Failed to update 2FA settings', 'error');
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
                this.showNotification(`User ${newStatus === 'active' ? 'activated' : 'deactivated'} successfully`);
                await this.loadUsers();
            } else {
                throw new Error(response.message || 'Failed to update user status');
            }
        } catch (error) {
            console.error('Error toggling user status:', error);
            this.showNotification('Failed to update user status', 'error');
        }
    }

    async showDeleteModal(userId) {
        try {
            const user = this.users.find(u => u._id === userId);
            if (!user) {
                this.showNotification('User not found', 'error');
                return;
            }

            this.currentEditUserId = userId;

            const confirmMessage = document.querySelector('#userManageDeleteModal .modal-body p');
            confirmMessage.textContent = `Are you sure you want to delete ${user.name || user.email}? This action cannot be undone.`;
            
            const reasonInput = document.getElementById('userManageDeleteReason');
            reasonInput.value = '';
            
            this.deleteModal.style.display = 'block';
            reasonInput.focus();

        } catch (error) {
            console.error('Error showing delete modal:', error);
            this.showNotification('Failed to prepare delete operation', 'error');
        }
    }

    async handleDeleteUser() {
        try {
            const reason = document.getElementById('userManageDeleteReason').value.trim();
            if (!reason) {
                this.showNotification('Please provide a reason for deletion', 'error');
                return;
            }

            const response = await utils.fetchWithAuth(`/users/${this.currentEditUserId}`, {
                method: 'DELETE',
                body: JSON.stringify({ reason })
            });

            if (response.success) {
                this.showNotification('User deleted successfully');
                this.hideDeleteModal();
                await this.loadUsers();
            } else {
                throw new Error(response.message || 'Failed to delete user');
            }
        } catch (error) {
            console.error('Error deleting user:', error);
            this.showNotification('Failed to delete user', 'error');
        }
    }

    showUserModal() {
        this.userModal.style.display = 'block';
        this.nameInput.focus();
    }

    hideUserModal() {
        this.userModal.style.display = 'none';
        this.userForm.reset();
        this.currentEditUserId = null;
    }

    hideDeleteModal() {
        this.deleteModal.style.display = 'none';
        document.getElementById('userManageDeleteReason').value = '';
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

    showNotification(message, type = 'success') {
        const existingNotifications = document.querySelectorAll('.notification');
        existingNotifications.forEach(notification => notification.remove());

        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.innerHTML = `
            <i class="fas fa-${type === 'success' ? 'check-circle' : 'exclamation-circle'}"></i>
            <span>${message}</span>
        `;
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.classList.add('show');
            setTimeout(() => {
                notification.classList.remove('show');
                setTimeout(() => notification.remove(), 300);
            }, 3000);
        }, 100);
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

// Initialize the User Management System when the page content is loaded
window.UserManagementSystem = UserManagementSystem;

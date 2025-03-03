class UserManagementSystem {
    constructor() {
        this.users = [];
        this.roles = [];
        this.currentPage = 1;
        this.itemsPerPage = 10;
        this.totalUsers = 0;
        this.currentUser = null;
        this.baseUrl = 'https://18.215.160.136.nip.io/api';
        this.filters = {
            search: '',
            department: '',
            role: '',
            status: ''
        };
        this.initialized = false;
    }

    async initialize() {
        if (this.initialized) return;
        
        try {
            console.log('Initializing user management system...');
            await this.loadRoles();
            await this.loadUsers();
            this.initializeEventListeners();
            this.setupFilters();
            this.initialized = true;
            console.log('User management system initialized successfully');
        } catch (error) {
            console.error('Failed to initialize user management system:', error);
            this.showNotification('Failed to initialize user management system', 'error');
        }
    }

    async fetchWithAuth(endpoint, options = {}) {
        const token = localStorage.getItem('token');
        if (!token) {
            throw new Error('No authentication token found');
        }

        const defaultOptions = {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
        };

        const finalOptions = {
            ...defaultOptions,
            ...options,
            headers: {
                ...defaultOptions.headers,
                ...(options.headers || {})
            }
        };

        try {
            console.log(`Fetching ${endpoint} with options:`, finalOptions);

            const response = await fetch(`${this.baseUrl}${endpoint}`, finalOptions);
            
            console.log(`Response status:`, response.status);

            if (response.status === 401) {
                localStorage.clear();
                window.location.href = '/login.html';
                throw new Error('Session expired. Please login again.');
            }

            const contentType = response.headers.get('content-type');
            if (contentType && contentType.includes('application/json')) {
                const data = await response.json();
                console.log('Response data:', data);

                if (!response.ok) {
                    throw new Error(data.message || `HTTP error! status: ${response.status}`);
                }
                return data;
            }

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            return response;
        } catch (error) {
            console.error('API request failed:', error);
            throw error;
        }
    }

    async loadUsers() {
        try {
            console.log('Loading users...');
            const queryParams = new URLSearchParams({
                page: this.currentPage,
                limit: this.itemsPerPage,
                ...this.filters
            });

            const response = await this.fetchWithAuth('/users');
            
            if (response.success) {
                this.users = response.users;
                this.totalUsers = response.pagination?.total || response.users.length;
                this.renderUsers();
                this.updatePagination();
                console.log('Users loaded successfully:', this.users);
            } else {
                throw new Error('Failed to load users');
            }
        } catch (error) {
            console.error('Error loading users:', error);
            this.showNotification('Failed to load users', 'error');
        }
    }

    async loadRoles() {
        try {
            console.log('Loading roles...');
            const response = await this.fetchWithAuth('/roles');
            
            if (response.success) {
                this.roles = response.roles;
                this.populateRoleFilter();
                this.populateRoleSelect();
                console.log('Roles loaded successfully:', this.roles);
            } else {
                throw new Error('Failed to load roles');
            }
        } catch (error) {
            console.error('Error loading roles:', error);
            this.showNotification('Failed to load roles', 'error');
        }
    }

    setupFilters() {
        // Populate department filter with unique departments
        const departments = [...new Set(this.users.map(user => user.department).filter(Boolean))];
        const departmentFilter = document.getElementById('departmentFilter');
        if (departmentFilter) {
            departmentFilter.innerHTML = `
                <option value="">All Departments</option>
                ${departments.map(dept => `
                    <option value="${dept}">${dept}</option>
                `).join('')}
            `;
        }

        // Populate role filter
        this.populateRoleFilter();
    }

    populateRoleFilter() {
        const roleFilter = document.getElementById('roleFilter');
        if (roleFilter && this.roles.length) {
            roleFilter.innerHTML = `
                <option value="">All Roles</option>
                ${this.roles.map(role => `
                    <option value="${role._id}">${role.name}</option>
                `).join('')}
            `;
        }
    }

    populateRoleSelect() {
        const roleSelect = document.getElementById('userRoleSelect'); // Updated ID
        if (roleSelect && this.roles.length) {
            roleSelect.innerHTML = `
                <option value="">Select Role</option>
                ${this.roles.map(role => `
                    <option value="${role._id}">${role.name}</option>
                `).join('')}
            `;
        }
    }
        initializeEventListeners() {
        // Create User Button
        const createUserBtn = document.getElementById('createUserBtn');
        if (createUserBtn) {
            createUserBtn.addEventListener('click', () => {
                console.log('Create user button clicked');
                this.openModal();
            });
        }

        // Modal Close Button
        const closeModalBtn = document.getElementById('closeModal');
        if (closeModalBtn) {
            closeModalBtn.addEventListener('click', () => {
                console.log('Close modal button clicked');
                this.closeModal();
            });
        }

        // Save User Button
        const saveUserBtn = document.getElementById('saveUser');
        if (saveUserBtn) {
            saveUserBtn.addEventListener('click', (e) => {
                e.preventDefault();
                console.log('Save user button clicked');
                this.saveUser();
            });
        }

        // Cancel Button
        const cancelUserBtn = document.getElementById('cancelUser');
        if (cancelUserBtn) {
            cancelUserBtn.addEventListener('click', () => {
                console.log('Cancel button clicked');
                this.closeModal();
            });
        }

        // Search Input
        const searchInput = document.getElementById('userSearch');
        if (searchInput) {
            searchInput.addEventListener('input', this.debounce(() => {
                this.filters.search = searchInput.value;
                this.currentPage = 1;
                this.loadUsers();
            }, 300));
        }

        // Filters
        ['department', 'role', 'status'].forEach(filterType => {
            const filter = document.getElementById(`${filterType}Filter`);
            if (filter) {
                filter.addEventListener('change', () => {
                    this.filters[filterType] = filter.value;
                    this.currentPage = 1;
                    this.loadUsers();
                });
            }
        });

        // Modal Outside Click
        const userModal = document.getElementById('userModal');
        if (userModal) {
            userModal.addEventListener('click', (e) => {
                if (e.target.id === 'userModal') {
                    this.closeModal();
                }
            });
        }

        // Form Validation
        const userNameInput = document.getElementById('userName');
        const userEmailInput = document.getElementById('userEmail');
        const userDepartmentInput = document.getElementById('userDepartment');
        const userRoleSelect = document.getElementById('userRoleSelect');

        if (userNameInput) {
            userNameInput.addEventListener('blur', () => {
                this.validateField('userName', 'Name is required');
            });
        }

        if (userEmailInput) {
            userEmailInput.addEventListener('blur', () => {
                this.validateField('userEmail', 'Valid email is required', this.isValidEmail);
            });
        }

        if (userDepartmentInput) {
            userDepartmentInput.addEventListener('blur', () => {
                this.validateField('userDepartment', 'Department is required');
            });
        }

        if (userRoleSelect) {
            userRoleSelect.addEventListener('change', () => {
                this.validateField('userRoleSelect', 'Role is required');
            });
        }
    }

    renderUsers() {
        const tbody = document.getElementById('usersTableBody');
        if (!tbody) return;

        if (this.users.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="7" class="no-data">
                        <div class="no-data-message">
                            <i class="fas fa-users-slash"></i>
                            <p>No users found</p>
                        </div>
                    </td>
                </tr>
            `;
            return;
        }

        tbody.innerHTML = this.users.map(user => `
            <tr>
                <td>
                    <div class="user-info">
                        <div class="user-avatar">
                            ${this.getInitials(user.name || user.email)}
                        </div>
                        <div class="user-details">
                            <div class="user-name">${user.name || 'N/A'}</div>
                            <div class="user-email">${user.email}</div>
                        </div>
                    </div>
                </td>
                <td>${user.email}</td>
                <td>${user.department || 'N/A'}</td>
                <td>${this.getRoleName(user.role)}</td>
                <td>
                    <span class="status-badge ${user.status}">
                        ${user.status}
                    </span>
                </td>
                <td>
                    <div class="toggle-switch">
                        <input type="checkbox" id="2fa_${user._id}" 
                            ${user.requires2FA ? 'checked' : ''} 
                            onchange="userManagement.toggle2FA('${user._id}')">
                        <label for="2fa_${user._id}"></label>
                    </div>
                </td>
                <td>
                    <div class="action-buttons">
                        <button class="action-btn edit" onclick="userManagement.editUser('${user._id}')" title="Edit User">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="action-btn" onclick="userManagement.resetPassword('${user._id}')" title="Reset Password">
                            <i class="fas fa-key"></i>
                        </button>
                        <button class="action-btn" onclick="userManagement.toggleUserStatus('${user._id}')" 
                            title="${user.status === 'active' ? 'Deactivate' : 'Activate'} User">
                            <i class="fas fa-${user.status === 'active' ? 'ban' : 'check-circle'}"></i>
                        </button>
                        <button class="action-btn delete" onclick="userManagement.deleteUser('${user._id}')" title="Delete User">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `).join('');

        this.updatePaginationInfo();
    }

    updatePaginationInfo() {
        const startRange = document.getElementById('startRange');
        const endRange = document.getElementById('endRange');
        const totalUsers = document.getElementById('totalUsers');

        if (startRange && endRange && totalUsers) {
            const start = (this.currentPage - 1) * this.itemsPerPage + 1;
            const end = Math.min(start + this.itemsPerPage - 1, this.totalUsers);
            
            startRange.textContent = this.totalUsers ? start : 0;
            endRange.textContent = end;
            totalUsers.textContent = this.totalUsers;
        }
    }
        updatePagination() {
        const pagination = document.getElementById('pagination');
        if (!pagination) return;

        const totalPages = Math.ceil(this.totalUsers / this.itemsPerPage);
        let paginationHTML = '';

        // Previous button
        paginationHTML += `
            <button class="pagination-btn" 
                ${this.currentPage === 1 ? 'disabled' : ''} 
                onclick="userManagement.changePage(${this.currentPage - 1})">
                <i class="fas fa-chevron-left"></i>
            </button>
        `;

        // Page numbers
        for (let i = 1; i <= totalPages; i++) {
            if (
                i === 1 || 
                i === totalPages || 
                (i >= this.currentPage - 1 && i <= this.currentPage + 1)
            ) {
                paginationHTML += `
                    <button class="pagination-btn ${i === this.currentPage ? 'active' : ''}" 
                        onclick="userManagement.changePage(${i})">
                        ${i}
                    </button>
                `;
            } else if (
                i === this.currentPage - 2 || 
                i === this.currentPage + 2
            ) {
                paginationHTML += `<span class="pagination-ellipsis">...</span>`;
            }
        }

        // Next button
        paginationHTML += `
            <button class="pagination-btn" 
                ${this.currentPage === totalPages ? 'disabled' : ''} 
                onclick="userManagement.changePage(${this.currentPage + 1})">
                <i class="fas fa-chevron-right"></i>
            </button>
        `;

        pagination.innerHTML = paginationHTML;
    }

    async changePage(page) {
        if (page < 1 || page > Math.ceil(this.totalUsers / this.itemsPerPage)) return;
        
        this.currentPage = page;
        await this.loadUsers();
    }

    async saveUser() {
        try {
            const form = document.getElementById('userForm');
            if (!form) return;

            const userData = {
                name: document.getElementById('userName').value.trim(),
                email: document.getElementById('userEmail').value.trim(),
                department: document.getElementById('userDepartment').value.trim(),
                role: document.getElementById('userRoleSelect').value,
                requires2FA: document.getElementById('user2FA').checked
            };

            if (!this.validateUserData(userData)) {
                return;
            }

            const isEditing = !!this.currentUser;
            const endpoint = isEditing 
                ? `/users/${this.currentUser._id}`
                : '/users';

            const response = await this.fetchWithAuth(endpoint, {
                method: isEditing ? 'PUT' : 'POST',
                body: JSON.stringify(userData)
            });

            if (response.success) {
                await this.createAuditLog(
                    isEditing ? 'USER_UPDATED' : 'USER_CREATED',
                    {
                        targetUser: isEditing ? this.currentUser._id : response.userId,
                        details: {
                            previousState: isEditing ? this.currentUser : null,
                            newState: userData
                        }
                    }
                );

                this.showNotification(
                    `User ${isEditing ? 'updated' : 'created'} successfully`,
                    'success'
                );
                await this.loadUsers();
                this.closeModal();
            } else {
                throw new Error(response.message || `Failed to ${isEditing ? 'update' : 'create'} user`);
            }
        } catch (error) {
            console.error('Error saving user:', error);
            this.showNotification(error.message || 'Failed to save user', 'error');
        }
    }

    validateUserData(userData) {
        const validations = [
            { field: 'userName', value: userData.name, message: 'Name is required' },
            { 
                field: 'userEmail', 
                value: userData.email, 
                message: 'Valid email is required',
                validator: this.isValidEmail 
            },
            { field: 'userDepartment', value: userData.department, message: 'Department is required' },
            { field: 'userRoleSelect', value: userData.role, message: 'Role is required' }
        ];

        let isValid = true;

        validations.forEach(({ field, value, message, validator }) => {
            if (!this.validateField(field, message, validator)) {
                isValid = false;
            }
        });

        return isValid;
    }

    validateField(fieldId, message, validator = null) {
        const field = document.getElementById(fieldId);
        if (!field) return false;

        const value = field.value.trim();
        const isValid = validator ? validator(value) : value.length > 0;

        const errorDiv = field.parentElement.querySelector('.error-message');
        if (!isValid) {
            if (!errorDiv) {
                const error = document.createElement('div');
                error.className = 'error-message';
                error.innerHTML = `<i class="fas fa-exclamation-circle"></i> ${message}`;
                field.parentElement.appendChild(error);
            }
            field.classList.add('error');
        } else {
            if (errorDiv) {
                errorDiv.remove();
            }
            field.classList.remove('error');
        }

        return isValid;
    }

    isValidEmail(email) {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    }

    getInitials(name) {
        return name
            .split(' ')
            .map(word => word[0])
            .join('')
            .toUpperCase()
            .slice(0, 2);
    }

    getRoleName(roleId) {
        const role = this.roles.find(r => r._id === roleId);
        return role ? role.name : 'N/A';
    }
        openModal(isEditing = false) {
        const modal = document.getElementById('userModal');
        const modalTitle = document.getElementById('modalTitle');
        const form = document.getElementById('userForm');

        if (!modal || !modalTitle || !form) {
            console.error('Required modal elements not found');
            return;
        }

        modalTitle.textContent = isEditing ? 'Edit User' : 'Add New User';
        form.reset();

        if (isEditing && this.currentUser) {
            document.getElementById('userName').value = this.currentUser.name || '';
            document.getElementById('userEmail').value = this.currentUser.email;
            document.getElementById('userDepartment').value = this.currentUser.department || '';
            document.getElementById('userRoleSelect').value = this.currentUser.role || '';
            document.getElementById('user2FA').checked = this.currentUser.requires2FA || false;
            document.getElementById('userEmail').disabled = true;
        } else {
            document.getElementById('userEmail').disabled = false;
            this.currentUser = null;
        }

        // Clear any existing error messages
        const errorMessages = form.querySelectorAll('.error-message');
        errorMessages.forEach(error => error.remove());

        modal.style.display = 'flex';
        modal.classList.add('active');
        document.getElementById('userName').focus();
    }

    closeModal() {
        const modal = document.getElementById('userModal');
        if (modal) {
            modal.style.display = 'none';
            modal.classList.remove('active');
            this.currentUser = null;
            
            const form = document.getElementById('userForm');
            if (form) {
                form.reset();
                const errorMessages = form.querySelectorAll('.error-message');
                errorMessages.forEach(error => error.remove());

                // Remove error classes from inputs
                const inputs = form.querySelectorAll('input, select');
                inputs.forEach(input => input.classList.remove('error'));
            }

            const emailInput = document.getElementById('userEmail');
            if (emailInput) {
                emailInput.disabled = false;
            }
        }
    }

    async toggle2FA(userId) {
        try {
            const user = this.users.find(u => u._id === userId);
            if (!user) return;

            const checkbox = document.getElementById(`2fa_${userId}`);
            const newState = checkbox.checked;

            const response = await this.fetchWithAuth(`/users/${userId}/2fa`, {
                method: 'PUT',
                body: JSON.stringify({
                    requires2FA: newState
                })
            });

            if (response.success) {
                await this.createAuditLog('TWO_FA_SETTING_CHANGED', {
                    targetUser: userId,
                    details: {
                        previous2FAStatus: !newState,
                        new2FAStatus: newState
                    }
                });

                this.showNotification(
                    `2FA ${newState ? 'enabled' : 'disabled'} successfully`,
                    'success'
                );
            } else {
                checkbox.checked = !newState;
                throw new Error(response.message || 'Failed to update 2FA status');
            }
        } catch (error) {
            console.error('Error toggling 2FA:', error);
            this.showNotification(error.message || 'Failed to update 2FA status', 'error');
            const checkbox = document.getElementById(`2fa_${userId}`);
            if (checkbox) {
                checkbox.checked = !checkbox.checked;
            }
        }
    }

    async toggleUserStatus(userId) {
        try {
            const user = this.users.find(u => u._id === userId);
            if (!user) return;

            const newStatus = user.status === 'active' ? 'inactive' : 'active';
            const action = newStatus === 'active' ? 'activate' : 'deactivate';

            const confirmed = await this.showConfirmDialog(
                `${action.charAt(0).toUpperCase() + action.slice(1)} User`,
                `Are you sure you want to ${action} this user?`
            );

            if (!confirmed) return;

            const response = await this.fetchWithAuth(`/users/${userId}/status`, {
                method: 'PUT',
                body: JSON.stringify({ status: newStatus })
            });

            if (response.success) {
                await this.createAuditLog('USER_STATUS_CHANGED', {
                    targetUser: userId,
                    details: {
                        previousStatus: user.status,
                        newStatus
                    }
                });

                this.showNotification(`User ${action}d successfully`, 'success');
                await this.loadUsers();
            } else {
                throw new Error(response.message || `Failed to ${action} user`);
            }
        } catch (error) {
            console.error('Error toggling user status:', error);
            this.showNotification(error.message || 'Failed to update user status', 'error');
        }
    }

    async deleteUser(userId) {
        try {
            const confirmed = await this.showConfirmDialog(
                'Delete User',
                'Are you sure you want to delete this user? This action cannot be undone.'
            );

            if (!confirmed) return;

            const response = await this.fetchWithAuth(`/users/${userId}`, {
                method: 'DELETE'
            });

            if (response.success) {
                await this.createAuditLog('USER_DELETED', {
                    targetUser: userId
                });

                this.showNotification('User deleted successfully', 'success');
                await this.loadUsers();
            } else {
                throw new Error(response.message || 'Failed to delete user');
            }
        } catch (error) {
            console.error('Error deleting user:', error);
            this.showNotification(error.message || 'Failed to delete user', 'error');
        }
    }

    async resetPassword(userId) {
        try {
            const confirmed = await this.showConfirmDialog(
                'Reset Password',
                'Are you sure you want to reset this user\'s password? They will receive an email with the new password.'
            );

            if (!confirmed) return;

            const response = await this.fetchWithAuth(`/users/${userId}/reset-password`, {
                method: 'POST'
            });

            if (response.success) {
                await this.createAuditLog('USER_PASSWORD_RESET', {
                    targetUser: userId
                });

                this.showNotification('Password reset successfully', 'success');
            } else {
                throw new Error(response.message || 'Failed to reset password');
            }
        } catch (error) {
            console.error('Error resetting password:', error);
            this.showNotification(error.message || 'Failed to reset password', 'error');
        }
    }

    async createAuditLog(action, details) {
        try {
            const response = await this.fetchWithAuth('/audit-logs', {
                method: 'POST',
                body: JSON.stringify({
                    action,
                    performedBy: localStorage.getItem('userId'),
                    targetUser: details.targetUser,
                    details: details.details || {},
                    timestamp: new Date().toISOString()
                })
            });

            if (!response.success) {
                console.error('Failed to create audit log:', response);
            }
        } catch (error) {
            console.error('Error creating audit log:', error);
        }
    }

    showConfirmDialog(title, message) {
        return new Promise((resolve) => {
            const confirmationModal = document.getElementById('confirmationModal');
            if (!confirmationModal) {
                resolve(window.confirm(message));
                return;
            }

            const confirmationTitle = document.getElementById('confirmationTitle');
            const confirmationMessage = document.getElementById('confirmationMessage');
            const confirmButton = document.getElementById('confirmAction');
            const cancelButton = document.getElementById('cancelAction');
            const closeButton = document.getElementById('closeConfirmationModal');

            confirmationTitle.textContent = title;
            confirmationMessage.textContent = message;

            confirmationModal.style.display = 'flex';
            confirmationModal.classList.add('active');

            const cleanup = () => {
                confirmationModal.style.display = 'none';
                confirmationModal.classList.remove('active');
            };

            confirmButton.onclick = () => {
                cleanup();
                resolve(true);
            };

            cancelButton.onclick = closeButton.onclick = () => {
                cleanup();
                resolve(false);
            };
        });
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
}

// Initialize the User Management System
document.addEventListener('DOMContentLoaded', () => {
    console.log('Initializing User Management System...');
    window.userManagement = new UserManagementSystem();
    window.userManagement.initialize().catch(error => {
        console.error('Failed to initialize user management system:', error);
    });
});

// Export the class for use in other modules if needed
window.UserManagementSystem = UserManagementSystem;

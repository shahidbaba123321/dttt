(function() {
    // Check if UsersManager already exists
    if (window.UsersManager) {
        return; // Exit if already defined
    }

class UsersManager {
    constructor() {
        this.baseUrl = 'https://18.215.160.136.nip.io/api';
        this.token = localStorage.getItem('token');
        this.currentPage = 1;
        this.pageSize = 10;
        this.totalUsers = 0;
        this.users = [];
        this.roles = [];
        this.currentUserId = null;
        this.filters = {
            search: '',
            role: '',
            status: '',
            tfa: ''
        };
        
        // Make instance available globally
        window.usersManager = this;
        
        this.initializeElements();
        this.initializeStyles();
        this.initializeEventListeners();
        this.loadInitialData();
    }

    initializeStyles() {
        const styles = `
            .tfa-toggle {
                display: flex;
                align-items: center;
                gap: 0.75rem;
            }

            .switch {
                position: relative;
                display: inline-block;
                width: 48px;
                height: 24px;
            }

            .switch input {
                opacity: 0;
                width: 0;
                height: 0;
            }

            .slider {
                position: absolute;
                cursor: pointer;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background-color: #cbd5e1;
                transition: .4s;
            }

            .slider:before {
                position: absolute;
                content: "";
                height: 18px;
                width: 18px;
                left: 3px;
                bottom: 3px;
                background-color: white;
                transition: .4s;
            }

            input:checked + .slider {
                background-color: var(--success-color);
            }

            input:focus + .slider {
                box-shadow: 0 0 1px var(--success-color);
            }

            input:checked + .slider:before {
                transform: translateX(24px);
            }

            .slider.round {
                border-radius: 24px;
            }

            .slider.round:before {
                border-radius: 50%;
            }

            .tfa-status {
                font-size: 0.875rem;
                font-weight: 500;
            }

            .tfa-enabled {
                color: var(--success-color);
            }

            .tfa-disabled {
                color: var(--text-tertiary);
            }

            .loading-overlay {
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background-color: rgba(0, 0, 0, 0.5);
                display: flex;
                justify-content: center;
                align-items: center;
                z-index: 9999;
            }

            .loading-spinner {
                background-color: var(--bg-primary);
                padding: var(--spacing-lg);
                border-radius: var(--border-radius-lg);
                display: flex;
                flex-direction: column;
                align-items: center;
                gap: var(--spacing-md);
                box-shadow: var(--shadow-lg);
            }

            .loading-spinner i {
                font-size: 2rem;
                color: var(--primary-color);
            }

            .notification {
                position: fixed;
                top: 20px;
                right: 20px;
                padding: 15px 25px;
                border-radius: var(--border-radius-md);
                background-color: white;
                box-shadow: var(--shadow-lg);
                z-index: 1100;
                animation: slideIn 0.3s ease-out;
            }

            .notification-content {
                display: flex;
                align-items: center;
                gap: var(--spacing-sm);
            }

            .notification.success {
                background-color: #DEF7EC;
                color: #03543F;
            }

            .notification.error {
                background-color: #FDE8E8;
                color: #9B1C1C;
            }

            @keyframes slideIn {
                from {
                    transform: translateX(100%);
                    opacity: 0;
                }
                to {
                    transform: translateX(0);
                    opacity: 1;
                }
            }

            @keyframes slideOut {
                from {
                    transform: translateX(0);
                    opacity: 1;
                }
                to {
                    transform: translateX(100%);
                    opacity: 0;
                }
            }
        `;

        const styleSheet = document.createElement('style');
        styleSheet.textContent = styles;
        document.head.appendChild(styleSheet);
    }

    initializeElements() {
        // Main containers
        this.usersTableBody = document.getElementById('usersTableBody');
        this.paginationControls = document.getElementById('paginationControls');
        
        // Search and filters
        this.searchInput = document.getElementById('userSearch');
        this.roleFilter = document.getElementById('roleFilter');
        this.statusFilter = document.getElementById('statusFilter');
        this.tfaFilter = document.getElementById('2faFilter');
        
        // Modals
        this.userModal = document.getElementById('userModal');
        this.deleteModal = document.getElementById('deleteModal');
        this.passwordModal = document.getElementById('passwordModal');
        
        // Forms
        this.userForm = document.getElementById('userForm');
        this.passwordForm = document.getElementById('passwordForm');
        
        // Buttons
        this.createUserBtn = document.getElementById('createUserBtn');
        this.saveUserBtn = document.getElementById('saveUser');
        this.confirmDeleteBtn = document.getElementById('confirmDelete');
        this.savePasswordBtn = document.getElementById('savePassword');
        
        // Modal close buttons
        this.closeUserModal = document.getElementById('closeUserModal');
        this.cancelUserModal = document.getElementById('cancelUserModal');
        this.closeDeleteModal = document.getElementById('closeDeleteModal');
        this.cancelDelete = document.getElementById('cancelDelete');
        this.closePasswordModal = document.getElementById('closePasswordModal');
        this.cancelPasswordModal = document.getElementById('cancelPasswordModal');

        // Stats elements
        this.startRange = document.getElementById('startRange');
        this.endRange = document.getElementById('endRange');
        this.totalUsersElement = document.getElementById('totalUsers');

        // Error handling for missing elements
        Object.entries(this).forEach(([key, value]) => {
            if (key !== 'token' && key !== 'currentPage' && key !== 'pageSize' && 
                key !== 'totalUsers' && key !== 'users' && key !== 'roles' && 
                key !== 'currentUserId' && key !== 'filters' && key !== 'baseUrl' && !value) {
                console.error(`Element not found: ${key}`);
            }
        });
    }
        initializeEventListeners() {
        // User management
        this.createUserBtn?.addEventListener('click', () => this.showCreateUserModal());
        this.saveUserBtn?.addEventListener('click', () => this.saveUser());
        this.confirmDeleteBtn?.addEventListener('click', () => this.deleteUser());
        this.savePasswordBtn?.addEventListener('click', () => this.changePassword());

        // Modal close events
        this.closeUserModal?.addEventListener('click', () => this.closeModal(this.userModal));
        this.cancelUserModal?.addEventListener('click', () => this.closeModal(this.userModal));
        this.closeDeleteModal?.addEventListener('click', () => this.closeModal(this.deleteModal));
        this.cancelDelete?.addEventListener('click', () => this.closeModal(this.deleteModal));
        this.closePasswordModal?.addEventListener('click', () => this.closeModal(this.passwordModal));
        this.cancelPasswordModal?.addEventListener('click', () => this.closeModal(this.passwordModal));

        // Search and filters
        this.searchInput?.addEventListener('input', debounce((e) => {
            this.filters.search = e.target.value;
            this.currentPage = 1;
            this.loadUsers();
        }, 300));

        this.roleFilter?.addEventListener('change', () => {
            this.filters.role = this.roleFilter.value;
            this.currentPage = 1;
            this.loadUsers();
        });

        this.statusFilter?.addEventListener('change', () => {
            this.filters.status = this.statusFilter.value;
            this.currentPage = 1;
            this.loadUsers();
        });

        this.tfaFilter?.addEventListener('change', () => {
            this.filters.tfa = this.tfaFilter.value;
            this.currentPage = 1;
            this.loadUsers();
        });

        // Form validation
        this.userForm?.addEventListener('submit', (e) => {
            e.preventDefault();
            this.saveUser();
        });

        this.passwordForm?.addEventListener('submit', (e) => {
            e.preventDefault();
            this.changePassword();
        });

        // Click outside modal to close
        window.addEventListener('click', (e) => {
            if (e.target === this.userModal) this.closeModal(this.userModal);
            if (e.target === this.deleteModal) this.closeModal(this.deleteModal);
            if (e.target === this.passwordModal) this.closeModal(this.passwordModal);
        });

        // Prevent modal close when clicking inside
        this.userModal?.querySelector('.modal-content')?.addEventListener('click', (e) => {
            e.stopPropagation();
        });

        this.deleteModal?.querySelector('.modal-content')?.addEventListener('click', (e) => {
            e.stopPropagation();
        });

        this.passwordModal?.querySelector('.modal-content')?.addEventListener('click', (e) => {
            e.stopPropagation();
        });

        // Form input validation
        const roleNameInput = document.getElementById('userName');
        roleNameInput?.addEventListener('input', (e) => {
            const name = e.target.value.trim();
            if (name.length < 2) {
                e.target.setCustomValidity('Name must be at least 2 characters long');
            } else {
                e.target.setCustomValidity('');
            }
            e.target.reportValidity();
        });

        const emailInput = document.getElementById('userEmail');
        emailInput?.addEventListener('input', (e) => {
            const email = e.target.value.trim();
            if (!this.isValidEmail(email)) {
                e.target.setCustomValidity('Please enter a valid email address');
            } else {
                e.target.setCustomValidity('');
            }
            e.target.reportValidity();
        });
    }

    async loadInitialData() {
        try {
            this.showLoading();
            await Promise.all([
                this.loadRoles(),
                this.loadUsers()
            ]);
            this.hideLoading();
        } catch (error) {
            console.error('Error loading initial data:', error);
            this.showError('Failed to load initial data');
            this.hideLoading();
        }
    }

    async loadRoles() {
        try {
            const response = await fetch(`${this.baseUrl}/roles`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${this.token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) throw new Error('Failed to fetch roles');

            const result = await response.json();
            this.roles = result.data || [];

            // Populate role filter
            if (this.roleFilter) {
                this.roleFilter.innerHTML = `
                    <option value="">All Roles</option>
                    ${this.roles.map(role => `
                        <option value="${role._id}">${this.escapeHtml(role.name)}</option>
                    `).join('')}
                `;
            }

            // Populate role select in user form
            const userRoleSelect = document.getElementById('userRole');
            if (userRoleSelect) {
                userRoleSelect.innerHTML = this.roles.map(role => `
                    <option value="${role._id}">${this.escapeHtml(role.name)}</option>
                `).join('');
            }

        } catch (error) {
            console.error('Error loading roles:', error);
            this.showError('Failed to load roles');
        }
    }

    async loadUsers() {
        try {
            const queryParams = new URLSearchParams({
                page: this.currentPage,
                limit: this.pageSize,
                ...this.filters
            });

            const response = await fetch(`${this.baseUrl}/users?${queryParams}`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${this.token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error('Failed to fetch users');
            }

            const result = await response.json();
            
            if (!result.success) {
                throw new Error(result.message || 'Failed to load users');
            }

            this.users = result.data || [];
            this.totalUsers = result.total || 0;

            this.renderUsers();
            this.updatePagination();
            this.updateDisplayRange();

        } catch (error) {
            console.error('Error loading users:', error);
            this.showError('Failed to load users');
        }
    }
        renderUsers() {
        if (!this.usersTableBody) return;

        if (!this.users || this.users.length === 0) {
            this.usersTableBody.innerHTML = `
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

        this.usersTableBody.innerHTML = this.users.map(user => {
            // Safely get user properties with defaults
            const userName = user?.name || 'N/A';
            const userEmail = user?.email || 'N/A';
            const userDepartment = user?.department || 'N/A';
            const userRole = user?.role || 'N/A';
            const userStatus = user?.status || 'inactive';
            const requires2FA = user?.requires2FA || false;

            return `
                <tr>
                    <td>
                        <div class="user-info">
                            <div class="user-avatar" style="background-color: ${this.getAvatarColor(userName)}">
                                ${this.getInitials(userName)}
                            </div>
                            <div class="user-details">
                                <span class="user-name">${this.escapeHtml(userName)}</span>
                                <span class="user-email">${this.escapeHtml(userEmail)}</span>
                            </div>
                        </div>
                    </td>
                    <td>${this.escapeHtml(userEmail)}</td>
                    <td>${this.escapeHtml(userDepartment)}</td>
                    <td>${this.escapeHtml(this.getRoleName(userRole))}</td>
                    <td>
                        <span class="status-badge status-${userStatus.toLowerCase()}">
                            ${this.capitalizeFirstLetter(userStatus)}
                        </span>
                    </td>
                    <td>
                        <div class="tfa-toggle">
                            <label class="switch">
                                <input type="checkbox" 
                                       ${requires2FA ? 'checked' : ''} 
                                       data-action="toggle-2fa"
                                       data-user-id="${user._id}">
                                <span class="slider round"></span>
                            </label>
                            <span class="tfa-status ${requires2FA ? 'tfa-enabled' : 'tfa-disabled'}">
                                ${requires2FA ? 'Enabled' : 'Disabled'}
                            </span>
                        </div>
                    </td>
                    <td>
                        <div class="action-buttons">
                            <button class="action-button edit" 
                                    data-action="edit"
                                    data-user-id="${user._id}"
                                    title="Edit User">
                                <i class="fas fa-edit"></i>
                            </button>
                            <button class="action-button" 
                                    data-action="password"
                                    data-user-id="${user._id}"
                                    title="Change Password">
                                <i class="fas fa-key"></i>
                            </button>
                            <button class="action-button ${userStatus === 'active' ? 'deactivate' : 'activate'}"
                                    data-action="toggle-status"
                                    data-user-id="${user._id}"
                                    title="${userStatus === 'active' ? 'Deactivate' : 'Activate'} User">
                                <i class="fas ${userStatus === 'active' ? 'fa-user-slash' : 'fa-user-check'}"></i>
                            </button>
                            <button class="action-button delete" 
                                    data-action="delete"
                                    data-user-id="${user._id}"
                                    title="Delete User">
                                <i class="fas fa-trash-alt"></i>
                            </button>
                        </div>
                    </td>
                </tr>
            `;
        }).join('');

        this.initializeTableActions();
    }

    initializeTableActions() {
        if (!this.usersTableBody) return;

        // Remove any existing event listeners
        const oldElements = this.usersTableBody.querySelectorAll('.action-button, .switch input');
        oldElements.forEach(element => {
            element.replaceWith(element.cloneNode(true));
        });

        // Add new event listeners
        const buttons = this.usersTableBody.querySelectorAll('.action-button');
        buttons.forEach(button => {
            button.addEventListener('click', (e) => {
                const action = button.dataset.action;
                const userId = button.dataset.userId;

                switch (action) {
                    case 'edit':
                        this.showEditUserModal(userId);
                        break;
                    case 'password':
                        this.showPasswordModal(userId);
                        break;
                    case 'toggle-status':
                        this.toggleUserStatus(userId);
                        break;
                    case 'delete':
                        this.showDeleteModal(userId);
                        break;
                }
            });
        });

        // Add 2FA toggle listeners
        const tfaToggles = this.usersTableBody.querySelectorAll('input[data-action="toggle-2fa"]');
        tfaToggles.forEach(toggle => {
            toggle.addEventListener('change', (e) => {
                const userId = toggle.dataset.userId;
                this.toggle2FA(userId);
            });
        });
    }

    async toggle2FA(userId) {
        try {
            const user = this.users.find(u => u._id === userId);
            if (!user) throw new Error('User not found');

            const newState = !user.requires2FA;

            this.showLoading();

            const response = await fetch(`${this.baseUrl}/users/${userId}`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${this.token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ requires2FA: newState })
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.message || 'Failed to update 2FA status');
            }

            const result = await response.json();
            
            if (!result.success) {
                throw new Error(result.message || 'Failed to update 2FA status');
            }

            await this.loadUsers();
            this.showSuccess(`Two-factor authentication ${newState ? 'enabled' : 'disabled'} successfully`);

        } catch (error) {
            console.error('Error toggling 2FA:', error);
            this.showError(error.message || 'Failed to update 2FA status');
        } finally {
            this.hideLoading();
        }
    }
        showCreateUserModal() {
        this.currentUserId = null;
        this.userForm.reset();
        document.getElementById('modalTitle').textContent = 'Add New User';
        this.userModal.classList.add('show');
        document.getElementById('userName').focus();
    }

    async showEditUserModal(userId) {
    try {
        this.showLoading();
        const response = await fetch(`${this.baseUrl}/users/${userId}`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${this.token}`,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) throw new Error('Failed to fetch user details');

        const result = await response.json();
        if (!result.success) throw new Error(result.message || 'Failed to fetch user details');

        const user = result.data;
        this.currentUserId = userId;

        // Find role ID by name
        const userRole = this.roles.find(r => r.name === user.role);

        document.getElementById('modalTitle').textContent = 'Edit User';
        document.getElementById('userName').value = user.name || '';
        document.getElementById('userEmail').value = user.email || '';
        document.getElementById('userDepartment').value = user.department || '';
        document.getElementById('userRole').value = userRole ? userRole._id : '';
        document.querySelector(`input[name="userStatus"][value="${user.status}"]`).checked = true;
        document.getElementById('enable2FA').checked = user.requires2FA || false;

        this.userModal.classList.add('show');
        document.getElementById('userName').focus();

    } catch (error) {
        console.error('Error loading user details:', error);
        this.showError('Failed to load user details');
    } finally {
        this.hideLoading();
    }
}

    showPasswordModal(userId) {
        this.currentUserId = userId;
        this.passwordForm.reset();
        this.passwordModal.classList.add('show');
        document.getElementById('newPassword').focus();
    }

    showDeleteModal(userId) {
        this.currentUserId = userId;
        const user = this.users.find(u => u._id === userId);
        
        if (user) {
            const warningText = document.querySelector('#deleteModal .warning-message span');
            warningText.textContent = `Are you sure you want to delete ${user.name}? This action cannot be undone.`;
        }
        
        this.deleteModal.classList.add('show');
    }

    async saveUser() {
    try {
        const roleId = document.getElementById('userRole').value;
        const selectedRole = this.roles.find(r => r._id === roleId);
        
        if (!selectedRole) {
            throw new Error('Invalid role selected');
        }

        const userData = {
            name: document.getElementById('userName').value.trim(),
            email: document.getElementById('userEmail').value.trim(),
            department: document.getElementById('userDepartment').value.trim(),
            role: selectedRole.name, // Store role name instead of ID
            status: document.querySelector('input[name="userStatus"]:checked').value,
            requires2FA: document.getElementById('enable2FA').checked
        };

        const validationErrors = this.validateUserData(userData);
        if (validationErrors.length > 0) {
            this.showError(validationErrors[0]);
            return;
        }

        this.showLoading();

        const url = this.currentUserId
            ? `${this.baseUrl}/users/${this.currentUserId}`
            : `${this.baseUrl}/users`;

        const method = this.currentUserId ? 'PUT' : 'POST';

        // If creating new user, add password
        if (!this.currentUserId) {
            userData.password = this.generateTemporaryPassword();
        }

        const response = await fetch(url, {
            method: method,
            headers: {
                'Authorization': `Bearer ${this.token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(userData)
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || 'Failed to save user');
        }

        const result = await response.json();
        
        if (!result.success) {
            throw new Error(result.message || 'Failed to save user');
        }

        this.closeModal(this.userModal);
        await this.loadUsers();

        // Show success message with password if new user
        if (!this.currentUserId && userData.password) {
            this.showSuccess(`User created successfully. Temporary password: ${userData.password}`);
        } else {
            this.showSuccess('User updated successfully');
        }

    } catch (error) {
        console.error('Error saving user:', error);
        this.showError(error.message || 'Failed to save user');
    } finally {
        this.hideLoading();
    }
}

    async changePassword() {
        try {
            const newPassword = document.getElementById('newPassword').value;
            const confirmPassword = document.getElementById('confirmPassword').value;

            if (newPassword !== confirmPassword) {
                this.showError('Passwords do not match');
                return;
            }

            if (!this.validatePassword(newPassword)) {
                this.showError('Password must be at least 8 characters long and include uppercase, lowercase, number, and special character');
                return;
            }

            this.showLoading();

            const response = await fetch(`${this.baseUrl}/users/${this.currentUserId}/password`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${this.token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ password: newPassword })
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.message || 'Failed to change password');
            }

            const result = await response.json();
            
            if (!result.success) {
                throw new Error(result.message || 'Failed to change password');
            }

            this.closeModal(this.passwordModal);
            this.showSuccess('Password changed successfully');

        } catch (error) {
            console.error('Error changing password:', error);
            this.showError(error.message || 'Failed to change password');
        } finally {
            this.hideLoading();
        }
    }
        async deleteUser() {
        try {
            this.showLoading();

            const response = await fetch(`${this.baseUrl}/users/${this.currentUserId}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${this.token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.message || 'Failed to delete user');
            }

            const result = await response.json();
            
            if (!result.success) {
                throw new Error(result.message || 'Failed to delete user');
            }

            this.closeModal(this.deleteModal);
            await this.loadUsers();
            this.showSuccess('User deleted successfully');

        } catch (error) {
            console.error('Error deleting user:', error);
            this.showError(error.message || 'Failed to delete user');
        } finally {
            this.hideLoading();
        }
    }

    async toggleUserStatus(userId) {
        try {
            const user = this.users.find(u => u._id === userId);
            if (!user) throw new Error('User not found');

            const newStatus = user.status === 'active' ? 'inactive' : 'active';

            this.showLoading();

            const response = await fetch(`${this.baseUrl}/users/${userId}`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${this.token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ status: newStatus })
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.message || 'Failed to update user status');
            }

            const result = await response.json();
            
            if (!result.success) {
                throw new Error(result.message || 'Failed to update user status');
            }

            await this.loadUsers();
            this.showSuccess(`User ${newStatus === 'active' ? 'activated' : 'deactivated'} successfully`);

        } catch (error) {
            console.error('Error toggling user status:', error);
            this.showError(error.message || 'Failed to update user status');
        } finally {
            this.hideLoading();
        }
    }

    updatePagination() {
        if (!this.paginationControls) return;

        const totalPages = Math.ceil(this.totalUsers / this.pageSize);
        let paginationHTML = '';

        // Previous button
        paginationHTML += `
            <button class="pagination-button" 
                    ${this.currentPage === 1 ? 'disabled' : ''}
                    onclick="window.usersManager.changePage(${this.currentPage - 1})">
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
                    <button class="pagination-button ${i === this.currentPage ? 'active' : ''}"
                            onclick="window.usersManager.changePage(${i})">
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
            <button class="pagination-button" 
                    ${this.currentPage === totalPages ? 'disabled' : ''}
                    onclick="window.usersManager.changePage(${this.currentPage + 1})">
                <i class="fas fa-chevron-right"></i>
            </button>
        `;

        this.paginationControls.innerHTML = paginationHTML;
    }

    updateDisplayRange() {
        if (!this.startRange || !this.endRange || !this.totalUsersElement) return;

        const start = (this.currentPage - 1) * this.pageSize + 1;
        const end = Math.min(start + this.pageSize - 1, this.totalUsers);

        this.startRange.textContent = this.totalUsers === 0 ? 0 : start;
        this.endRange.textContent = end;
        this.totalUsersElement.textContent = this.totalUsers;
    }

    changePage(page) {
        const totalPages = Math.ceil(this.totalUsers / this.pageSize);
        if (page < 1 || page > totalPages) return;
        
        this.currentPage = page;
        this.loadUsers();
    }

    closeModal(modal) {
        if (!modal) return;
        modal.classList.remove('show');
        if (modal === this.userModal) {
            this.userForm.reset();
            this.currentUserId = null;
        }
        if (modal === this.passwordModal) {
            this.passwordForm.reset();
            this.currentUserId = null;
        }
    }
        // Utility Methods
    validateUserData(userData) {
        const errors = [];

        if (!userData.name || userData.name.length < 2) {
            errors.push('Name must be at least 2 characters long');
        }

        if (!userData.email || !this.isValidEmail(userData.email)) {
            errors.push('Please enter a valid email address');
        }

        if (!userData.department) {
            errors.push('Department is required');
        }

        if (!userData.role) {
            errors.push('Role is required');
        }

        if (userData.name && userData.name.length > 50) {
            errors.push('Name cannot exceed 50 characters');
        }

        return errors;
    }

    validatePassword(password) {
        const minLength = 8;
        const hasUpperCase = /[A-Z]/.test(password);
        const hasLowerCase = /[a-z]/.test(password);
        const hasNumbers = /\d/.test(password);
        const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);

        return password.length >= minLength && 
               hasUpperCase && 
               hasLowerCase && 
               hasNumbers && 
               hasSpecialChar;
    }

    generateTemporaryPassword() {
        const length = 12;
        const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*';
        let password = '';
        
        // Ensure at least one of each required character type
        password += 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'[Math.floor(Math.random() * 26)];
        password += 'abcdefghijklmnopqrstuvwxyz'[Math.floor(Math.random() * 26)];
        password += '0123456789'[Math.floor(Math.random() * 10)];
        password += '!@#$%^&*'[Math.floor(Math.random() * 8)];

        // Fill the rest randomly
        for (let i = password.length; i < length; i++) {
            password += charset[Math.floor(Math.random() * charset.length)];
        }

        // Shuffle the password
        return password.split('').sort(() => Math.random() - 0.5).join('');
    }

    getInitials(name) {
        if (!name || name === 'N/A') return 'NA';
        
        return name
            .split(' ')
            .map(word => word[0])
            .join('')
            .toUpperCase()
            .slice(0, 2);
    }

    getAvatarColor(name) {
        if (!name || name === 'N/A') return '#6B7280'; // Default gray color
        
        let hash = 0;
        for (let i = 0; i < name.length; i++) {
            hash = name.charCodeAt(i) + ((hash << 5) - hash);
        }
        
        const hue = hash % 360;
        return `hsl(${hue}, 70%, 45%)`;
    }

    getRoleName(roleId) {
    // If roleId is already a name, return it
    if (typeof roleId === 'string' && !roleId.match(/^[0-9a-fA-F]{24}$/)) {
        return roleId;
    }
    // Otherwise, look up the role by ID
    const role = this.roles.find(r => r._id === roleId);
    return role ? role.name : 'Unknown Role';
}
    
    isValidEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }

    capitalizeFirstLetter(string) {
        if (!string) return '';
        return string.charAt(0).toUpperCase() + string.slice(1).toLowerCase();
    }

    showLoading() {
        const loader = document.createElement('div');
        loader.className = 'loading-overlay';
        loader.innerHTML = `
            <div class="loading-spinner">
                <i class="fas fa-spinner fa-spin"></i>
                <span>Loading...</span>
            </div>
        `;
        document.body.appendChild(loader);
    }

    hideLoading() {
        const loader = document.querySelector('.loading-overlay');
        if (loader) {
            loader.remove();
        }
    }

    showError(message) {
        const notification = document.createElement('div');
        notification.className = 'notification error';
        notification.innerHTML = `
            <div class="notification-content">
                <i class="fas fa-exclamation-circle"></i>
                <span>${this.escapeHtml(message)}</span>
            </div>
        `;
        this.showNotification(notification);
    }

    showSuccess(message) {
        const notification = document.createElement('div');
        notification.className = 'notification success';
        notification.innerHTML = `
            <div class="notification-content">
                <i class="fas fa-check-circle"></i>
                <span>${this.escapeHtml(message)}</span>
            </div>
        `;
        this.showNotification(notification);
    }

    showNotification(notification) {
        // Remove existing notifications
        document.querySelectorAll('.notification').forEach(n => n.remove());

        // Add new notification
        document.body.appendChild(notification);

        // Remove after delay
        setTimeout(() => {
            notification.style.animation = 'slideOut 0.3s ease-in';
            setTimeout(() => notification.remove(), 300);
        }, 3000);
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

    cleanup() {
        // Remove event listeners
        if (this.searchInput) {
            this.searchInput.removeEventListener('input', this.debounce);
        }

        if (this.createUserBtn) {
            this.createUserBtn.removeEventListener('click', this.showCreateUserModal);
        }

        // Remove all modals
        this.closeModal(this.userModal);
        this.closeModal(this.deleteModal);
        this.closeModal(this.passwordModal);

        // Remove all notifications and loaders
        document.querySelectorAll('.notification, .loading-overlay').forEach(el => el.remove());

        // Reset state
        this.currentPage = 1;
        this.users = [];
        this.roles = [];
        this.currentUserId = null;

        // Clear references
        this.usersTableBody = null;
        this.paginationControls = null;
        this.searchInput = null;
        this.roleFilter = null;
        this.statusFilter = null;
        this.tfaFilter = null;
        this.userModal = null;
        this.deleteModal = null;
        this.passwordModal = null;
        this.userForm = null;
        this.passwordForm = null;
    }
}

// Helper function for debouncing
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

// Register the class globally
window.UsersManager = UsersManager;
})();

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
        this.filters = {
            search: '',
            role: '',
            status: '',
            tfa: ''
        };
        
        this.initializeElements();
        this.initializeEventListeners();
        this.loadInitialData();
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
            if (key !== 'token' && key !== 'baseUrl' && key !== 'currentPage' && 
                key !== 'pageSize' && key !== 'totalUsers' && key !== 'users' && 
                key !== 'roles' && key !== 'filters' && !value) {
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
        this.searchInput?.addEventListener('input', debounce(() => {
            this.filters.search = this.searchInput.value;
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
                    <span class="tfa-status ${requires2FA ? 'tfa-enabled' : 'tfa-disabled'}">
                        <i class="fas ${requires2FA ? 'fa-shield-alt' : 'fa-shield-alt'}"></i>
                        ${requires2FA ? 'Enabled' : 'Disabled'}
                    </span>
                </td>
                <td>
                    <div class="action-buttons">
                        <button class="action-button edit" 
                                onclick="window.usersManager.showEditUserModal('${user._id}')"
                                title="Edit User">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="action-button" 
                                onclick="window.usersManager.showPasswordModal('${user._id}')"
                                title="Change Password">
                            <i class="fas fa-key"></i>
                        </button>
                        <button class="action-button ${userStatus === 'active' ? 'deactivate' : 'activate'}"
                                onclick="window.usersManager.toggleUserStatus('${user._id}')"
                                title="${userStatus === 'active' ? 'Deactivate' : 'Activate'} User">
                            <i class="fas ${userStatus === 'active' ? 'fa-user-slash' : 'fa-user-check'}"></i>
                        </button>
                        <button class="action-button delete" 
                                onclick="window.usersManager.showDeleteModal('${user._id}')"
                                title="Delete User">
                            <i class="fas fa-trash-alt"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `;
    }).join('');
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

    async showCreateUserModal() {
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

            document.getElementById('modalTitle').textContent = 'Edit User';
            document.getElementById('userName').value = user.name || '';
            document.getElementById('userEmail').value = user.email || '';
            document.getElementById('userDepartment').value = user.department || '';
            document.getElementById('userRole').value = user.role || '';
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
    async showPasswordModal(userId) {
        this.currentUserId = userId;
        this.passwordForm.reset();
        this.passwordModal.classList.add('show');
        document.getElementById('newPassword').focus();
    }

    async showDeleteModal(userId) {
        this.currentUserId = userId;
        const user = this.users.find(u => u._id === userId);
        
        if (user) {
            document.getElementById('deleteWarningText').textContent = 
                `Are you sure you want to delete ${user.name}? This action cannot be undone.`;
        }
        
        this.deleteModal.classList.add('show');
    }
       async saveUser() {
        try {
            const userData = {
                name: document.getElementById('userName').value.trim(),
                email: document.getElementById('userEmail').value.trim(),
                department: document.getElementById('userDepartment').value.trim(),
                role: document.getElementById('userRole').value,
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

            this.closeModal(this.userModal);
            await this.loadUsers();
            this.showSuccess(`User ${this.currentUserId ? 'updated' : 'created'} successfully`);

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
                this.showError('Password does not meet security requirements');
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

            const response = await fetch(`${this.baseUrl}/users/${userId}/status`, {
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

            await this.loadUsers();
            this.showSuccess(`User ${newStatus === 'active' ? 'activated' : 'deactivated'} successfully`);

        } catch (error) {
            console.error('Error toggling user status:', error);
            this.showError(error.message || 'Failed to update user status');
        } finally {
            this.hideLoading();
        }
    }

    changePage(page) {
        if (page < 1 || page > Math.ceil(this.totalUsers / this.pageSize)) return;
        this.currentPage = page;
        this.loadUsers();
    }

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
        // Utility Functions
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

    getRoleName(roleId) {
    const role = this.roles.find(r => r._id === roleId);
    return role ? role.name : 'Unknown Role';
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


    capitalizeFirstLetter(string) {
    if (!string) return '';
    return string.charAt(0).toUpperCase() + string.slice(1).toLowerCase();
}


    isValidEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
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
        this.showNotification(message, 'error');
    }

    showSuccess(message) {
        this.showNotification(message, 'success');
    }

    showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.innerHTML = `
            <div class="notification-content">
                <i class="fas ${this.getNotificationIcon(type)}"></i>
                <span>${this.escapeHtml(message)}</span>
            </div>
        `;

        // Remove existing notifications
        document.querySelectorAll('.notification').forEach(n => n.remove());

        document.body.appendChild(notification);
        
        notification.style.animation = 'slideIn 0.3s ease-out';

        setTimeout(() => {
            notification.style.animation = 'slideOut 0.3s ease-in';
            setTimeout(() => notification.remove(), 300);
        }, 3000);
    }

    getNotificationIcon(type) {
        switch (type) {
            case 'success': return 'fa-check-circle';
            case 'error': return 'fa-exclamation-circle';
            case 'warning': return 'fa-exclamation-triangle';
            default: return 'fa-info-circle';
        }
    }

    // Debounce function for search
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

    cleanup() {
        // Remove event listeners
        if (this.searchInput) {
            this.searchInput.removeEventListener('input', this.debounce);
        }

        // Remove all notifications and loaders
        document.querySelectorAll('.notification, .loading-overlay').forEach(el => el.remove());

        // Clear timeouts if any
        if (this.notificationTimeout) {
            clearTimeout(this.notificationTimeout);
        }

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

// Register the class globally
window.UsersManager = UsersManager;
})();

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

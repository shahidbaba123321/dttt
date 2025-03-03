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

        // Modal Outside Click
        const userModal = document.getElementById('userModal');
        if (userModal) {
            userModal.addEventListener('click', (e) => {
                if (e.target.id === 'userModal') {
                    this.closeModal();
                }
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
    }

    async saveUser() {
        try {
            const form = document.getElementById('userForm');
            if (!form) return;

            const userData = {
                name: document.getElementById('userName').value.trim(),
                email: document.getElementById('userEmail').value.trim(),
                department: document.getElementById('userDepartment').value.trim(),
                role: document.getElementById('userRole').value,
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
            document.getElementById('userRole').value = this.currentUser.role || '';
            document.getElementById('user2FA').checked = this.currentUser.requires2FA || false;
            document.getElementById('userEmail').disabled = true;
        } else {
            document.getElementById('userEmail').disabled = false;
            this.currentUser = null;
        }

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
            }

            const emailInput = document.getElementById('userEmail');
            if (emailInput) {
                emailInput.disabled = false;
            }
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

    validateUserData(userData) {
        if (!userData.name) {
            this.showNotification('Name is required', 'error');
            return false;
        }

        if (!userData.email || !this.isValidEmail(userData.email)) {
            this.showNotification('Valid email is required', 'error');
            return false;
        }

        if (!userData.department) {
            this.showNotification('Department is required', 'error');
            return false;
        }

        if (!userData.role) {
            this.showNotification('Role is required', 'error');
            return false;
        }

        return true;
    }

    isValidEmail(email) {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
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

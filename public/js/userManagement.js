 <script>
   // userManagement.js
(function() {
    'use strict';

    // Create module namespace
    window.UserManagementModule = {
        // State Management
        state: {
            users: [],
            deletedUsers: [],
            currentUser: null,
            filters: {
                search: '',
                department: '',
                status: '',
                role: ''
            },
            pagination: {
                page: 1,
                limit: 10,
                total: 0
            },
            loading: false,
            selectedRole: null,
            auditLogs: [],
            permissions: new Map(),
            initialized: false
        },


            // Core Functions
          // Core Functions
        init: async function() {
            try {
                console.log('Initializing User Management module...');
                
                // Add necessary styles
                this.addStyles();

                // Initialize state
                this.state.currentUser = this.getCurrentUserFromToken();

                // Setup event listeners
                this.setupEventListeners();
                
                // Load initial data
                await this.loadUsers();
                
                console.log('User Management module initialized');
                this.state.initialized = true;

            } catch (error) {
                console.error('Failed to initialize User Management:', error);
                throw error;
            }
        },


            getCurrentUserFromToken: function() {
            try {
                const token = localStorage.getItem('token');
                if (!token) return null;

                const base64Url = token.split('.')[1];
                const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
                const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
                    return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
                }).join(''));

                const userData = JSON.parse(jsonPayload);
                console.log('Parsed user data from token:', userData);
                
                return {
                    ...userData,
                    role: userData.role?.toLowerCase()
                };
            } catch (error) {
                console.error('Error parsing token:', error);
                return null;
            }
        },

            setupEventListeners: function() {
            // Search input with debounce
            const searchInput = document.getElementById('userSearch');
            if (searchInput) {
                let debounceTimer;
                const handleSearch = (e) => {
                    clearTimeout(debounceTimer);
                    debounceTimer = setTimeout(() => {
                        this.state.filters.search = e.target.value;
                        this.loadUsers();
                    }, 300);
                };
                
                searchInput.removeEventListener('input', handleSearch);
                searchInput.addEventListener('input', handleSearch);
            }

            // Filter selects
            ['department', 'status', 'role'].forEach(filterType => {
                const select = document.getElementById(`${filterType}Filter`);
                if (select) {
                    const handleFilter = (e) => {
                        this.state.filters[filterType] = e.target.value;
                        this.loadUsers();
                    };
                    
                    select.removeEventListener('change', handleFilter);
                    select.addEventListener('change', handleFilter);
                }
            });
        },

            addStyles: function() {
                if (!document.getElementById('user-management-styles')) {
                    const style = document.createElement('style');
                    style.id = 'user-management-styles';
                    style.textContent = `
                        .notification {
                            position: fixed;
                            top: 20px;
                            right: 20px;
                            min-width: 300px;
                            max-width: 400px;
                            background: var(--surface-color);
                            border-radius: var(--card-radius);
                            box-shadow: var(--shadow-lg);
                            z-index: 1000;
                            overflow: hidden;
                        }

                        .notification-content {
                            display: flex;
                            align-items: center;
                            padding: 15px;
                        }

                        .notification-icon {
                            margin-right: 15px;
                            font-size: 20px;
                        }

                        .notification-message {
                            flex-grow: 1;
                            font-size: 14px;
                        }

                        .notification-close {
                            background: none;
                            border: none;
                            color: var(--text-secondary);
                            cursor: pointer;
                            padding: 5px;
                        }

                        .notification-progress {
                            height: 3px;
                            background: var(--primary-color);
                            width: 100%;
                        }

                        @keyframes notification-progress {
                            from { width: 100%; }
                            to { width: 0%; }
                        }

                        .tooltip {
                            position: fixed;
                            background: rgba(0, 0, 0, 0.8);
                            color: white;
                            padding: 5px 10px;
                            border-radius: 4px;
                            font-size: 12px;
                            z-index: 1000;
                            pointer-events: none;
                        }
                    `;
                    document.head.appendChild(style);
                }
            },
                        // Data Loading Functions
            loadUsers: function() {
                return new Promise((resolve, reject) => {
                    this.state.loading = true;
                    this.renderLoadingState();

                    const token = localStorage.getItem('token');
                    if (!token) {
                        this.state.loading = false;
                        reject(new Error('No authentication token found'));
                        return;
                    }

                    const queryParams = new URLSearchParams({
                        page: (this.state.pagination.page || 1).toString(),
                        limit: (this.state.pagination.limit || 10).toString(),
                        search: this.state.filters.search || '',
                        department: this.state.filters.department || '',
                        role: this.state.filters.role || '',
                        status: this.state.filters.status || ''
                    });

                    fetch(`https://18.215.160.136.nip.io/api/users?${queryParams}`, {
                        method: 'GET',
                        headers: {
                            'Authorization': `Bearer ${token}`,
                            'Content-Type': 'application/json'
                        }
                    })
                    .then(response => {
                        if (!response.ok) {
                            throw new Error('Failed to load users');
                        }
                        return response.json();
                    })
                    .then(data => {
                        console.log('API Response:', data);

                        if (data && data.users) {
                            this.state.users = data.users;
                        } else if (Array.isArray(data)) {
                            this.state.users = data;
                        } else {
                            this.state.users = [];
                            console.warn('Unexpected data format:', data);
                        }

                        if (data.pagination) {
                            this.state.pagination = {
                                ...this.state.pagination,
                                ...data.pagination
                            };
                        }

                        this.renderUsers();
                        if (document.getElementById('pagination')) {
                            this.renderPagination();
                        }
                        resolve();
                    })
                    .catch(error => {
                        console.error('Error loading users:', error);
                        this.showNotification('Failed to load users: ' + error.message, 'error');
                        this.renderErrorState(error.message);
                        reject(error);
                    })
                    .finally(() => {
                        this.state.loading = false;
                    });
                });
            },

            refreshData: async function() {
                try {
                    this.state.loading = true;
                    await Promise.all([
                        this.loadUsers(),
                        this.hasPermission('VIEW_DELETED_USERS') && this.loadDeletedUsers(),
                        this.hasPermission('VIEW_AUDIT_LOGS') && this.loadAuditLogs()
                    ]);
                } catch (error) {
                    this.handleApiError(error);
                } finally {
                    this.state.loading = false;
                }
            },

            // Rendering Functions
            renderUsers: function() {
                const tbody = document.getElementById('usersTableBody');
                if (!tbody) {
                    console.error('Users table body not found');
                    return;
                }

                if (this.state.loading) {
                    this.renderLoadingState();
                    return;
                }

                console.log('Current users state:', this.state.users);

                if (!Array.isArray(this.state.users) || this.state.users.length === 0) {
                    tbody.innerHTML = `
                        <tr>
                            <td colspan="7" class="empty-state">
                                <i class="fas fa-users-slash"></i>
                                <p>No users found</p>
                            </td>
                        </tr>
                    `;
                    return;
                }

                try {
                    tbody.innerHTML = this.state.users.map(user => {
                        if (!user) {
                            console.warn('Invalid user object found');
                            return '';
                        }

                        const name = user.name || 'Unknown User';
                        const email = user.email || 'No Email';
                        const department = user.department || 'Unassigned';
                        const role = user.role || 'No Role';
                        const status = user.status || 'inactive';
                        const requires2FA = !!user.requires2FA;

                        return `
                            <tr data-user-id="${user._id || ''}">
                                <td>
                                    <div class="user-info">
                                        <div class="user-avatar" style="background-color: ${this.getAvatarColor(name)}">
                                            ${this.getInitials(name)}
                                        </div>
                                        <div class="user-details">
                                            <div class="user-name">${this.escapeHtml(name)}</div>
                                            <div class="user-id">${this.escapeHtml(email)}</div>
                                        </div>
                                    </div>
                                </td>
                                <td>${this.escapeHtml(email)}</td>
                                <td>
                                    <span class="department-badge department-${department.toLowerCase()}">
                                        ${this.escapeHtml(department)}
                                    </span>
                                </td>
                                <td>
                                    <span class="role-badge role-${role.toLowerCase()}">
                                        ${this.escapeHtml(role)}
                                    </span>
                                </td>
                                <td>
                                    <span class="status-badge status-${status.toLowerCase()}">
                                        <i class="fas fa-${status === 'active' ? 'check-circle' : 'times-circle'}"></i>
                                        ${status}
                                    </span>
                                </td>
                                <td>
                                    <span class="2fa-badge ${requires2FA ? 'enabled' : 'disabled'}">
                                        <i class="fas fa-shield-alt"></i>
                                        ${requires2FA ? 'Enabled' : 'Disabled'}
                                    </span>
                                </td>
                                <td>
                                    <div class="action-buttons">
                                        ${this.renderActionButtons(user)}
                                    </div>
                                </td>
                            </tr>
                        `;
                    }).join('');

                    this.attachTableEventListeners();
                } catch (error) {
                    console.error('Error rendering users:', error);
                    this.renderErrorState('Error rendering user list');
                }
            },

            renderActionButtons: function(user) {
                const buttons = [];

                if (this.hasPermission('EDIT_USERS')) {
                    buttons.push(`
                        <button onclick="UserManagement.editUser('${user._id}')" 
                                class="btn-icon" title="Edit User">
                            <i class="fas fa-edit"></i>
                        </button>
                    `);
                }

                if (this.hasPermission('MANAGE_USER_STATUS')) {
                    buttons.push(`
                        <button onclick="UserManagement.toggleUserStatus('${user._id}')" 
                                class="btn-icon ${user.status === 'active' ? 'danger' : 'success'}"
                                title="${user.status === 'active' ? 'Deactivate' : 'Activate'} User">
                            <i class="fas fa-${user.status === 'active' ? 'ban' : 'check'}"></i>
                        </button>
                    `);
                }

                if (this.hasPermission('MANAGE_USER_SECURITY')) {
                    buttons.push(`
                        <button onclick="UserManagement.changeUserPassword('${user._id}')" 
                                class="btn-icon warning" title="Change Password">
                            <i class="fas fa-key"></i>
                        </button>
                        <button onclick="UserManagement.toggle2FA('${user._id}')"
                                class="btn-icon ${user.requires2FA ? 'success' : 'warning'}"
                                title="${user.requires2FA ? 'Disable' : 'Enable'} 2FA">
                            <i class="fas fa-shield-alt"></i>
                        </button>
                    `);
                }

                if (this.hasPermission('DELETE_USERS')) {
                    buttons.push(`
                        <button onclick="UserManagement.deleteUser('${user._id}')" 
                                class="btn-icon danger" title="Delete User">
                            <i class="fas fa-trash-alt"></i>
                        </button>
                    `);
                }

                return buttons.join('');
            },
                        // User Management Functions
            openAddUserModal: function() {
                if (!this.hasPermission('CREATE_USERS')) {
                    this.showNotification('You do not have permission to create users', 'error');
                    return;
                }

                const modalContainer = document.createElement('div');
                modalContainer.innerHTML = `
                    <div class="modal active">
                        <div class="modal-content">
                            <div class="modal-header">
                                <h2>Add New User</h2>
                                <button class="close-btn" onclick="this.closest('.modal').remove()">
                                    <i class="fas fa-times"></i>
                                </button>
                            </div>
                            <form id="addUserForm">
                                <div class="form-group">
                                    <label for="userName">Full Name *</label>
                                    <input type="text" id="userName" name="name" required>
                                </div>
                                <div class="form-group">
                                    <label for="userEmail">Email *</label>
                                    <input type="email" id="userEmail" name="email" required>
                                </div>
                                <div class="form-group">
                                    <label for="userDepartment">Department *</label>
                                    <select id="userDepartment" name="department" required>
                                        <option value="">Select Department</option>
                                        <option value="HR">HR</option>
                                        <option value="Finance">Finance</option>
                                        <option value="IT">IT</option>
                                        <option value="Admin">Admin</option>
                                        <option value="Support">Support</option>
                                        <option value="Sales">Sales</option>
                                    </select>
                                </div>
                                <div class="form-group">
                                    <label for="userRole">Role *</label>
                                    <select id="userRole" name="role" required>
                                        ${this.generateRoleOptions()}
                                    </select>
                                </div>
                                <div class="form-group">
                                    <label class="checkbox-label">
                                        <input type="checkbox" id="require2FA" name="requires2FA">
                                        <span>Require 2FA</span>
                                    </label>
                                </div>
                                <div class="modal-footer">
                                    <button type="button" class="btn btn-secondary" 
                                            onclick="this.closest('.modal').remove()">Cancel</button>
                                    <button type="submit" class="btn btn-primary">Add User</button>
                                </div>
                            </form>
                        </div>
                    </div>
                `;

                document.body.appendChild(modalContainer.firstElementChild);
                this.setupAddUserForm();
            },

            setupAddUserForm: function() {
                const form = document.getElementById('addUserForm');
                if (!form) return;

                form.onsubmit = (e) => {
                    e.preventDefault();
                    const submitButton = form.querySelector('button[type="submit"]');
                    submitButton.disabled = true;
                    submitButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Adding User...';

                    const formData = new FormData(form);
                    const userData = {
                        name: formData.get('name'),
                        email: formData.get('email'),
                        department: formData.get('department'),
                        role: formData.get('role'),
                        requires2FA: formData.get('requires2FA') === 'on'
                    };

                    const token = localStorage.getItem('token');
                    fetch('https://18.215.160.136.nip.io/api/users', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${token}`
                        },
                        body: JSON.stringify(userData)
                    })
                    .then(response => response.json())
                    .then(data => {
                        if (!data.success) {
                            throw new Error(data.message || 'Failed to add user');
                        }

                        if (data.temporaryPassword) {
                            this.showNotification(`
                                User created successfully!<br>
                                Temporary Password: ${data.temporaryPassword}<br>
                                Please share this password securely with the user.
                            `, 'success', 10000);
                        } else {
                            this.showNotification('User added successfully', 'success');
                        }

                        form.closest('.modal').remove();
                        this.loadUsers();
                    })
                    .catch(error => {
                        console.error('Error adding user:', error);
                        this.showNotification(error.message, 'error');
                    })
                    .finally(() => {
                        submitButton.disabled = false;
                        submitButton.innerHTML = 'Add User';
                    });
                };
            },

            editUser: function(userId) {
                if (!this.hasPermission('EDIT_USERS')) {
                    this.showNotification('You do not have permission to edit users', 'error');
                    return;
                }

                const user = this.state.users.find(u => u._id === userId);
                if (!user) {
                    this.showNotification('User not found', 'error');
                    return;
                }

                const modalContainer = document.createElement('div');
                modalContainer.innerHTML = `
                    <div class="modal active">
                        <div class="modal-content">
                            <div class="modal-header">
                                <h2>Edit User: ${this.escapeHtml(user.name)}</h2>
                                <button class="close-btn" onclick="this.closest('.modal').remove()">
                                    <i class="fas fa-times"></i>
                                </button>
                            </div>
                            <form id="editUserForm">
                                <div class="form-group">
                                    <label for="editName">Full Name *</label>
                                    <input type="text" id="editName" name="name" value="${this.escapeHtml(user.name)}" required>
                                </div>
                                <div class="form-group">
                                    <label for="editEmail">Email *</label>
                                    <input type="email" id="editEmail" name="email" value="${this.escapeHtml(user.email)}" required>
                                </div>
                                <div class="form-group">
                                    <label for="editDepartment">Department *</label>
                                    <select id="editDepartment" name="department" required>
                                        <option value="HR" ${user.department === 'HR' ? 'selected' : ''}>HR</option>
                                        <option value="Finance" ${user.department === 'Finance' ? 'selected' : ''}>Finance</option>
                                        <option value="IT" ${user.department === 'IT' ? 'selected' : ''}>IT</option>
                                        <option value="Admin" ${user.department === 'Admin' ? 'selected' : ''}>Admin</option>
                                        <option value="Support" ${user.department === 'Support' ? 'selected' : ''}>Support</option>
                                        <option value="Sales" ${user.department === 'Sales' ? 'selected' : ''}>Sales</option>
                                    </select>
                                </div>
                                <div class="form-group">
                                    <label for="editRole">Role *</label>
                                    <select id="editRole" name="role" required>
                                        ${this.generateRoleOptions(user.role)}
                                    </select>
                                </div>
                                <div class="form-group">
                                    <label class="checkbox-label">
                                        <input type="checkbox" id="editRequire2FA" name="requires2FA" ${user.requires2FA ? 'checked' : ''}>
                                        <span>Require 2FA</span>
                                    </label>
                                </div>
                                <div class="modal-footer">
                                    <button type="button" class="btn btn-secondary" onclick="this.closest('.modal').remove()">Cancel</button>
                                    <button type="submit" class="btn btn-primary">Save Changes</button>
                                </div>
                            </form>
                        </div>
                    </div>
                `;

                document.body.appendChild(modalContainer.firstElementChild);
                this.setupEditUserForm(userId);
            },
                        setupEditUserForm: function(userId) {
                const form = document.getElementById('editUserForm');
                if (!form) return;

                form.onsubmit = (e) => {
                    e.preventDefault();
                    const submitButton = form.querySelector('button[type="submit"]');
                    submitButton.disabled = true;
                    submitButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';

                    const formData = new FormData(form);
                    const userData = {
                        name: formData.get('name'),
                        email: formData.get('email'),
                        department: formData.get('department'),
                        role: formData.get('role'),
                        requires2FA: formData.get('requires2FA') === 'on'
                    };

                    const token = localStorage.getItem('token');
                    fetch(`https://18.215.160.136.nip.io/api/users/${userId}`, {
                        method: 'PUT',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${token}`
                        },
                        body: JSON.stringify(userData)
                    })
                    .then(response => response.json())
                    .then(data => {
                        if (!data.success) {
                            throw new Error(data.message || 'Failed to update user');
                        }
                        this.showNotification('User updated successfully', 'success');
                        form.closest('.modal').remove();
                        this.loadUsers();
                    })
                    .catch(error => {
                        console.error('Error updating user:', error);
                        this.showNotification(error.message, 'error');
                    })
                    .finally(() => {
                        submitButton.disabled = false;
                        submitButton.innerHTML = 'Save Changes';
                    });
                };
            },

            deleteUser: function(userId) {
                const user = this.state.users.find(u => u._id === userId);
                if (!user) {
                    this.showNotification('User not found', 'error');
                    return;
                }

                this.showDeleteConfirmationModal(user)
                    .then(confirmed => {
                        if (!confirmed) return;

                        const token = localStorage.getItem('token');
                        return fetch(`https://18.215.160.136.nip.io/api/users/${userId}`, {
                            method: 'DELETE',
                            headers: {
                                'Authorization': `Bearer ${token}`
                            }
                        });
                    })
                    .then(response => {
                        if (!response || !response.ok) {
                            throw new Error('Failed to delete user');
                        }
                        return response.json();
                    })
                    .then(() => {
                        this.showNotification('User deleted successfully', 'success');
                        this.loadUsers();
                    })
                    .catch(error => {
                        console.error('Error deleting user:', error);
                        this.showNotification(error.message, 'error');
                    });
            },

            showDeleteConfirmationModal: function(user) {
                return new Promise(resolve => {
                    const modal = document.createElement('div');
                    modal.className = 'modal active delete-confirmation-modal';
                    modal.innerHTML = `
                        <div class="modal-content">
                            <div class="modal-header">
                                <h2>Confirm User Deletion</h2>
                                <button class="close-btn" onclick="this.closest('.modal').remove()">
                                    <i class="fas fa-times"></i>
                                </button>
                            </div>
                            <div class="modal-body">
                                <div class="warning-icon">
                                    <i class="fas fa-exclamation-triangle"></i>
                                </div>
                                <h3 class="confirmation-title">Delete User Account</h3>
                                <p class="confirmation-message">
                                    Are you sure you want to delete the following user?
                                </p>
                                <div class="user-details">
                                    <div class="user-detail-item">
                                        <span class="user-detail-label">Name:</span>
                                        <span class="user-detail-value">${this.escapeHtml(user.name)}</span>
                                    </div>
                                    <div class="user-detail-item">
                                        <span class="user-detail-label">Email:</span>
                                        <span class="user-detail-value">${this.escapeHtml(user.email)}</span>
                                    </div>
                                    <div class="user-detail-item">
                                        <span class="user-detail-label">Role:</span>
                                        <span class="user-detail-value">${this.escapeHtml(user.role)}</span>
                                    </div>
                                </div>
                            </div>
                            <div class="modal-footer">
                                <button class="btn btn-secondary" onclick="this.closest('.modal').remove()">
                                    Cancel
                                </button>
                                <button class="btn btn-danger" onclick="UserManagement.confirmDeletion(this)">
                                    Delete User
                                </button>
                            </div>
                        </div>
                    `;

                    document.body.appendChild(modal);

                    this.confirmDeletion = button => {
                        modal.remove();
                        resolve(true);
                    };
                });
            },

            toggleUserStatus: function(userId) {
                if (!this.hasPermission('MANAGE_USER_STATUS')) {
                    this.showNotification('You do not have permission to manage user status', 'error');
                    return;
                }

                const user = this.state.users.find(u => u._id === userId);
                if (!user) {
                    this.showNotification('User not found', 'error');
                    return;
                }

                const newStatus = user.status === 'active' ? 'inactive' : 'active';
                const token = localStorage.getItem('token');

                fetch(`https://18.215.160.136.nip.io/api/users/${userId}/status`, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify({ status: newStatus })
                })
                .then(response => response.json())
                .then(data => {
                    if (!data.success) {
                        throw new Error(data.message || 'Failed to update user status');
                    }
                    this.showNotification(`User ${newStatus === 'active' ? 'activated' : 'deactivated'} successfully`, 'success');
                    this.loadUsers();
                })
                .catch(error => {
                    console.error('Error toggling user status:', error);
                    this.showNotification(error.message, 'error');
                });
            },
                        changeUserPassword: function(userId) {
                if (!this.hasPermission('MANAGE_USER_SECURITY')) {
                    this.showNotification('You do not have permission to change passwords', 'error');
                    return;
                }

                const user = this.state.users.find(u => u._id === userId);
                if (!user) {
                    this.showNotification('User not found', 'error');
                    return;
                }

                const modalContainer = document.createElement('div');
                modalContainer.innerHTML = `
                    <div class="modal active">
                        <div class="modal-content">
                            <div class="modal-header">
                                <h2>Change Password: ${this.escapeHtml(user.name)}</h2>
                                <button class="close-btn" onclick="this.closest('.modal').remove()">
                                    <i class="fas fa-times"></i>
                                </button>
                            </div>
                            <form id="changePasswordForm">
                                <div class="form-group">
                                    <label for="newPassword">New Password</label>
                                    <input type="password" id="newPassword" name="password" required minlength="8">
                                </div>
                                <div class="form-group">
                                    <label for="confirmPassword">Confirm Password</label>
                                    <input type="password" id="confirmPassword" required minlength="8">
                                </div>
                                <div class="modal-footer">
                                    <button type="button" class="btn btn-secondary" onclick="this.closest('.modal').remove()">Cancel</button>
                                    <button type="submit" class="btn btn-primary">Change Password</button>
                                </div>
                            </form>
                        </div>
                    </div>
                `;

                document.body.appendChild(modalContainer.firstElementChild);
                this.setupChangePasswordForm(userId);
            },

            setupChangePasswordForm: function(userId) {
                const form = document.getElementById('changePasswordForm');
                if (!form) return;

                form.onsubmit = (e) => {
                    e.preventDefault();
                    const newPassword = document.getElementById('newPassword').value;
                    const confirmPassword = document.getElementById('confirmPassword').value;

                    if (newPassword !== confirmPassword) {
                        this.showNotification('Passwords do not match', 'error');
                        return;
                    }

                    const submitButton = form.querySelector('button[type="submit"]');
                    submitButton.disabled = true;
                    submitButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Changing Password...';

                    const token = localStorage.getItem('token');
                    fetch(`https://18.215.160.136.nip.io/api/users/${userId}/reset-password`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${token}`
                        },
                        body: JSON.stringify({ password: newPassword })
                    })
                    .then(response => response.json())
                    .then(data => {
                        if (!data.success) {
                            throw new Error(data.message || 'Failed to change password');
                        }
                        this.showNotification('Password changed successfully', 'success');
                        form.closest('.modal').remove();
                    })
                    .catch(error => {
                        console.error('Error changing password:', error);
                        this.showNotification(error.message, 'error');
                    })
                    .finally(() => {
                        submitButton.disabled = false;
                        submitButton.innerHTML = 'Change Password';
                    });
                };
            },

            toggle2FA: function(userId) {
                if (!this.hasPermission('MANAGE_USER_SECURITY')) {
                    this.showNotification('You do not have permission to manage 2FA', 'error');
                    return;
                }

                const user = this.state.users.find(u => u._id === userId);
                if (!user) {
                    this.showNotification('User not found', 'error');
                    return;
                }

                const token = localStorage.getItem('token');
                fetch(`https://18.215.160.136.nip.io/api/users/${userId}/2fa`, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify({ requires2FA: !user.requires2FA })
                })
                .then(response => response.json())
                .then(data => {
                    if (!data.success) {
                        throw new Error(data.message || 'Failed to update 2FA status');
                    }
                    this.showNotification(`2FA ${!user.requires2FA ? 'enabled' : 'disabled'} successfully`, 'success');
                    this.loadUsers();
                })
                .catch(error => {
                    console.error('Error toggling 2FA:', error);
                    this.showNotification(error.message, 'error');
                });
            },

            // Utility Functions
            showNotification: function(message, type = 'info', duration = 5000) {
                const notificationId = 'notification-' + Date.now();
                const notification = document.createElement('div');
                notification.id = notificationId;
                notification.className = `notification notification-${type} ${type}`;
                
                notification.innerHTML = `
                    <div class="notification-content">
                        <div class="notification-icon">
                            <i class="fas fa-${this.getNotificationIcon(type)}"></i>
                        </div>
                        <div class="notification-message">
                            ${message}
                        </div>
                        <button class="notification-close" onclick="this.parentElement.parentElement.remove()">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                    <div class="notification-progress"></div>
                `;

                // Remove existing notifications of the same type
                document.querySelectorAll(`.notification.${type}`).forEach(n => n.remove());

                document.body.appendChild(notification);

                const progress = notification.querySelector('.notification-progress');
                progress.style.animation = `notification-progress ${duration}ms linear`;

                setTimeout(() => {
                    notification.classList.add('notification-hiding');
                    setTimeout(() => {
                        if (document.getElementById(notificationId)) {
                            document.getElementById(notificationId).remove();
                        }
                    }, 300);
                }, duration);
            },

            getNotificationIcon: function(type) {
                const icons = {
                    success: 'check-circle',
                    error: 'exclamation-circle',
                    warning: 'exclamation-triangle',
                    info: 'info-circle'
                };
                return icons[type] || icons.info;
            },
                        // Additional Utility Functions
            renderLoadingState: function() {
                const tbody = document.getElementById('usersTableBody');
                if (tbody) {
                    tbody.innerHTML = `
                        <tr>
                            <td colspan="7" class="loading-state">
                                <div class="loading-spinner">
                                    <i class="fas fa-spinner fa-spin"></i>
                                </div>
                                <p>Loading users...</p>
                            </td>
                        </tr>
                    `;
                }
            },

            renderErrorState: function(message) {
                const tbody = document.getElementById('usersTableBody');
                if (tbody) {
                    tbody.innerHTML = `
                        <tr>
                            <td colspan="7" class="error-state">
                                <div class="error-icon">
                                    <i class="fas fa-exclamation-circle"></i>
                                </div>
                                <p>${this.escapeHtml(message || 'Error loading users')}</p>
                                <button class="btn btn-secondary" onclick="UserManagement.retryLoad()">
                                    <i class="fas fa-sync"></i> Retry
                                </button>
                            </td>
                        </tr>
                    `;
                }
            },

            retryLoad: function() {
                this.loadUsers();
            },

            attachTableEventListeners: function() {
                const tbody = document.getElementById('usersTableBody');
                if (!tbody) return;

                // Row hover effects
                tbody.querySelectorAll('tr').forEach(row => {
                    row.addEventListener('mouseenter', () => {
                        row.classList.add('hover');
                    });
                    row.addEventListener('mouseleave', () => {
                        row.classList.remove('hover');
                    });
                });

                // Action button tooltips
                tbody.querySelectorAll('.btn-icon').forEach(button => {
                    button.addEventListener('mouseenter', (e) => {
                        const tooltip = document.createElement('div');
                        tooltip.className = 'tooltip';
                        tooltip.textContent = button.getAttribute('title');
                        document.body.appendChild(tooltip);

                        const rect = button.getBoundingClientRect();
                        tooltip.style.top = `${rect.top - tooltip.offsetHeight - 5}px`;
                        tooltip.style.left = `${rect.left + (button.offsetWidth - tooltip.offsetWidth) / 2}px`;

                        button.addEventListener('mouseleave', () => tooltip.remove());
                    });
                });
            },

            cleanup: function() {
                // Remove event listeners
                const searchInput = document.getElementById('userSearch');
                if (searchInput) {
                    searchInput.removeEventListener('input', this.handleSearch);
                }

                ['department', 'status', 'role'].forEach(filterType => {
                    const select = document.getElementById(`${filterType}Filter`);
                    if (select) {
                        select.removeEventListener('change', this.handleFilter);
                    }
                });

                // Clear any open modals
                document.querySelectorAll('.modal.active').forEach(modal => modal.remove());

                // Clear tooltips
                document.querySelectorAll('.tooltip').forEach(tooltip => tooltip.remove());

                // Reset state
                this.state = {
                    users: [],
                    deletedUsers: [],
                    currentUser: null,
                    filters: {
                        search: '',
                        department: '',
                        status: '',
                        role: ''
                    },
                    pagination: {
                        page: 1,
                        limit: 10,
                        total: 0
                    },
                    loading: false,
                    selectedRole: null,
                    auditLogs: [],
                    permissions: new Map(),
                    initialized: false
                };
            },

            escapeHtml: function(str) {
                if (!str) return '';
                const div = document.createElement('div');
                div.textContent = str;
                return div.innerHTML;
            },

            getAvatarColor: function(name) {
                if (!name) return '#4f46e5';
                const colors = [
                    '#4f46e5', '#7c3aed', '#db2777', '#ea580c', '#16a34a',
                    '#2563eb', '#9333ea', '#e11d48', '#d97706', '#15803d'
                ];
                let hash = 0;
                for (let i = 0; i < name.length; i++) {
                    hash = name.charCodeAt(i) + ((hash << 5) - hash);
                }
                return colors[Math.abs(hash) % colors.length];
            },

            getInitials: function(name) {
                if (!name) return 'U';
                return name
                    .split(' ')
                    .map(word => word[0] || '')
                    .join('')
                    .toUpperCase()
                    .slice(0, 2);
            },

            handleApiError: function(error) {
                console.error('API Error:', error);
                let message = 'An unexpected error occurred';
                if (error.response) {
                    try {
                        const errorData = error.response.json();
                        message = errorData.message || message;
                    } catch (e) {
                        console.error('Error parsing error response:', e);
                    }
                } else if (error.message) {
                    message = error.message;
                }
                this.showNotification(message, 'error');
            }
        };

        // Initialize the module
        window.UserManagement = UserManagementModule;

        // Create initialization function
        const initializeUserManagement = function() {
            if (document.readyState === 'loading') {
                document.addEventListener('DOMContentLoaded', function() {
                    window.UserManagement.init()
                        .catch(function(error) {
                            console.error('Failed to initialize UserManagement:', error);
                        });
                });
            } else {
                window.UserManagement.init()
                    .catch(function(error) {
                        console.error('Failed to initialize UserManagement:', error);
                    });
            }
        };

        // Make sure to add proper error handling
        handleError: function(error, context) {
            console.error(`Error in ${context}:`, error);
            this.showNotification(
                `An error occurred while ${context}: ${error.message}`,
                'error'
            );
        },

        // Add a cleanup method
        destroy: function() {
            try {
                this.cleanup();
                this.state = null;
                console.log('User Management module destroyed');
            } catch (error) {
                console.error('Error destroying User Management module:', error);
            }
        }
    };

    window.UserManagement = window.UserManagementModule;

  

        // Handle errors globally
        window.addEventListener('error', function(event) {
            console.error('Global error:', event);
        });

        window.addEventListener('unhandledrejection', function(event) {
            console.error('Unhandled promise rejection:', event.reason);
        });

        // Initialize the module
        initializeUserManagement();
    })();

</script>

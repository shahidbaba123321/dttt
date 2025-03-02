class RolesPermissionsManager {
    constructor() {
        this.roles = [];
        this.currentEditingRole = null;
        this.permissions = {
            ui: [
                { id: 'dashboard_view', name: 'View Dashboard', description: 'Access to view dashboard' },
                { id: 'reports_view', name: 'View Reports', description: 'Access to view reports' },
                { id: 'analytics_view', name: 'View Analytics', description: 'Access to view analytics' },
                { id: 'settings_view', name: 'View Settings', description: 'Access to view settings' }
            ],
            modules: [
                { id: 'user_management', name: 'User Management', description: 'Access to user management module' },
                { id: 'role_management', name: 'Role Management', description: 'Access to role management module' },
                { id: 'system_settings', name: 'System Settings', description: 'Access to system settings' },
                { id: 'audit_logs', name: 'Audit Logs', description: 'Access to audit logs' },
                { id: 'api_management', name: 'API Management', description: 'Access to API management' }
            ],
            userManagement: [
                { id: 'users_create', name: 'Create Users', description: 'Ability to create new users' },
                { id: 'users_edit', name: 'Edit Users', description: 'Ability to edit existing users' },
                { id: 'users_delete', name: 'Delete Users', description: 'Ability to delete users' },
                { id: 'users_activate', name: 'Activate/Deactivate Users', description: 'Ability to activate or deactivate users' },
                { id: 'manage_2fa', name: 'Manage 2FA', description: 'Ability to manage two-factor authentication' },
                { id: 'reset_password', name: 'Reset Passwords', description: 'Ability to reset user passwords' }
            ]
        };
        this.baseUrl = 'https://18.215.160.136.nip.io/api';
        this.initialized = false;
    }

    async initialize() {
        if (this.initialized) return;
        
        try {
            await this.loadRoles();
            this.initializeEventListeners();
            this.setupModal();
            this.initialized = true;
        } catch (error) {
            console.error('Failed to initialize roles manager:', error);
            this.showNotification('Failed to initialize roles manager', 'error');
        }
    }

    async loadRoles() {
        try {
            const response = await this.fetchWithAuth('/roles');
            
            if (!response.ok) {
                throw new Error('Failed to load roles');
            }

            const data = await response.json();
            if (data.success) {
                this.roles = data.roles;
                this.loadModulePermissions().catch(console.error);
                this.renderRoles();
            } else {
                throw new Error(data.message || 'Failed to load roles');
            }
        } catch (error) {
            console.error('Error loading roles:', error);
            throw error;
        }
    }

    async loadModulePermissions() {
        try {
            return this.permissions.modules;
           /* const response = await this.fetchWithAuth('/permissions/modules');
            
            if (!response.ok) {
                throw new Error('Failed to load module permissions');
            }

            const data = await response.json();
            if (data.success && Array.isArray(data.permissions)) {
                this.permissions.modules = data.permissions;
            }*/
        } catch (error) {
            console.error('Error loading module permissions:', error);
            return this.permissions.modules;
            /*this.showNotification('Failed to load module permissions', 'error');*/
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

        return fetch(
            `${this.baseUrl}${endpoint}`,
            { ...defaultOptions, ...options }
        );
    }

    initializeEventListeners() {
        // Create Role Button
        const createRoleBtn = document.getElementById('createRoleBtn');
        if (createRoleBtn) {
            createRoleBtn.addEventListener('click', () => this.openModal());
        }

        // Modal Close Button
        const closeModalBtn = document.getElementById('closeModal');
        if (closeModalBtn) {
            closeModalBtn.addEventListener('click', () => this.closeModal());
        }

        // Save Role Button
        const saveRoleBtn = document.getElementById('saveRole');
        if (saveRoleBtn) {
            saveRoleBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.saveRole();
            });
        }

        // Cancel Button
        const cancelRoleBtn = document.getElementById('cancelRole');
        if (cancelRoleBtn) {
            cancelRoleBtn.addEventListener('click', () => this.closeModal());
        }

        // Modal Outside Click
        const roleModal = document.getElementById('roleModal');
        if (roleModal) {
            roleModal.addEventListener('click', (e) => {
                if (e.target.id === 'roleModal') {
                    this.closeModal();
                }
            });
        }

        // Custom Roles List Click Delegation
        const customRolesList = document.getElementById('customRolesList');
        if (customRolesList) {
            customRolesList.addEventListener('click', (e) => {
                const roleCard = e.target.closest('.role-card');
                if (!roleCard) return;

                if (e.target.closest('.edit-role')) {
                    this.editRole(roleCard.dataset.roleId);
                } else if (e.target.closest('.delete-role')) {
                    this.deleteRole(roleCard.dataset.roleId);
                }
            });
        }

        // Form validation
        const roleNameInput = document.getElementById('roleName');
        if (roleNameInput) {
            roleNameInput.addEventListener('input', () => {
                this.validateRoleName(roleNameInput.value);
            });
        }
    }
        renderRoles() {
        const customRolesList = document.getElementById('customRolesList');
        if (!customRolesList) return;

        customRolesList.innerHTML = '';

        this.roles.forEach(role => {
            if (role.name.toLowerCase() !== 'superadmin') {
                const roleCard = this.createRoleCard(role);
                customRolesList.appendChild(roleCard);
            }
        });

        // Update superadmin user count
        const superadminRole = this.roles.find(r => r.name.toLowerCase() === 'superadmin');
        const superadminCount = document.getElementById('superadminUserCount');
        if (superadminRole && superadminCount) {
            superadminCount.textContent = superadminRole.userCount || 0;
        }
    }

    createRoleCard(role) {
        const template = document.getElementById('roleCardTemplate');
        if (!template) {
            console.error('Role card template not found');
            return document.createElement('div');
        }

        const roleCard = template.content.cloneNode(true);
        const card = roleCard.querySelector('.role-card');
        
        card.dataset.roleId = role._id;
        card.querySelector('.role-name').textContent = role.name;
        card.querySelector('.role-description').textContent = role.description || 'No description provided';
        card.querySelector('.user-count').textContent = role.userCount || 0;
        card.querySelector('.permission-count').textContent = role.permissions?.length || 0;

        // Add tooltip for permissions
        if (role.permissions && role.permissions.length > 0) {
            const permissionsList = this.getPermissionNames(role.permissions);
            card.querySelector('.permission-count').setAttribute('title', permissionsList);
        }

        return roleCard;
    }

    getPermissionNames(permissionIds) {
        const allPermissions = [
            ...this.permissions.ui,
            ...this.permissions.modules,
            ...this.permissions.userManagement
        ];

        return permissionIds
            .map(id => allPermissions.find(p => p.id === id)?.name || id)
            .join('\n');
    }

    setupModal() {
        const permissionsContainer = document.getElementById('permissionsContainer');
        if (!permissionsContainer) return;

        // Clear existing permissions
        permissionsContainer.innerHTML = '';

        // Create permission sections
        Object.entries(this.permissions).forEach(([category, permissions]) => {
            const section = this.createPermissionSection(category, permissions);
            permissionsContainer.appendChild(section);
        });
    }

    createPermissionSection(category, permissions) {
        const section = document.createElement('div');
        section.className = 'permission-group';
        
        const title = document.createElement('h5');
        title.textContent = this.formatCategoryName(category);
        section.appendChild(title);

        const grid = document.createElement('div');
        grid.className = 'permissions-grid';

        permissions.forEach(permission => {
            const item = document.createElement('div');
            item.className = 'permission-item';
            item.innerHTML = `
                <input type="checkbox" 
                       id="${permission.id}" 
                       name="permissions" 
                       value="${permission.id}">
                <label for="${permission.id}" 
                       title="${permission.description}">
                    ${permission.name}
                </label>
            `;
            grid.appendChild(item);
        });

        section.appendChild(grid);
        return section;
    }

    formatCategoryName(category) {
        return category
            .split(/(?=[A-Z])/)
            .map(word => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' ');
    }

    async validateRoleName(name) {
        const nameError = document.getElementById('roleNameError');
        if (!nameError) return true;

        if (!name) {
            nameError.textContent = 'Role name is required';
            return false;
        }

        // Check if name exists (excluding current role when editing)
        const nameExists = this.roles.some(role => 
            role.name.toLowerCase() === name.toLowerCase() && 
            role._id !== this.currentEditingRole?._id
        );

        if (nameExists) {
            nameError.textContent = 'Role name already exists';
            return false;
        }

        nameError.textContent = '';
        return true;
    }

    openModal(roleId = null) {
        const modal = document.getElementById('roleModal');
        const modalTitle = document.getElementById('modalTitle');
        const form = document.getElementById('roleForm');

        if (!modal || !modalTitle || !form) return;

        this.currentEditingRole = roleId ? this.roles.find(r => r._id === roleId) : null;
        modalTitle.textContent = roleId ? 'Edit Role' : 'Create New Role';
        form.reset();

        if (this.currentEditingRole) {
            document.getElementById('roleName').value = this.currentEditingRole.name;
            document.getElementById('roleDescription').value = this.currentEditingRole.description || '';
            
            // Set permissions
            const checkboxes = form.querySelectorAll('input[type="checkbox"]');
            checkboxes.forEach(checkbox => {
                checkbox.checked = this.currentEditingRole.permissions?.includes(checkbox.value) || false;
            });
        }

        modal.classList.add('active');
    }

    closeModal() {
        const modal = document.getElementById('roleModal');
        if (modal) {
            modal.classList.remove('active');
            this.currentEditingRole = null;
            const nameError = document.getElementById('roleNameError');
            if (nameError) {
                nameError.textContent = '';
            }
        }
    }

    async createAuditLog(action, details) {
        try {
            const response = await this.fetchWithAuth('/audit-logs', {
                method: 'POST',
                body: JSON.stringify({
                    action,
                    details,
                    timestamp: new Date().toISOString()
                })
            });

            if (!response.ok) {
                throw new Error('Failed to create audit log');
            }
        } catch (error) {
            console.error('Error creating audit log:', error);
        }
    }
        async saveRole() {
        try {
            const form = document.getElementById('roleForm');
            if (!form) return;

            const roleName = document.getElementById('roleName')?.value.trim();
            const roleDescription = document.getElementById('roleDescription')?.value.trim();
            
            // Validate role name
            if (!roleName) {
                this.showNotification('Role name is required', 'error');
                return;
            }

            if (!await this.validateRoleName(roleName)) {
                return;
            }

            // Get selected permissions
            const permissions = Array.from(form.querySelectorAll('input[name="permissions"]:checked'))
                .map(checkbox => checkbox.value);

            if (permissions.length === 0) {
                this.showNotification('Please select at least one permission', 'error');
                return;
            }

            const roleData = {
                name: roleName,
                description: roleDescription,
                permissions
            };

            const isEditing = !!this.currentEditingRole;
            const endpoint = isEditing
                ? `/roles/${this.currentEditingRole._id}`
                : '/roles';

            const response = await this.fetchWithAuth(endpoint, {
                method: isEditing ? 'PUT' : 'POST',
                body: JSON.stringify(roleData)
            });

            const data = await response.json();

            if (data.success) {
                // Create audit log
                await this.createAuditLog(
                    isEditing ? 'ROLE_UPDATED' : 'ROLE_CREATED',
                    {
                        roleId: isEditing ? this.currentEditingRole._id : data.roleId,
                        roleName,
                        previousState: isEditing ? {
                            name: this.currentEditingRole.name,
                            description: this.currentEditingRole.description,
                            permissions: this.currentEditingRole.permissions
                        } : null,
                        newState: roleData,
                        modifiedBy: localStorage.getItem('userEmail'),
                        timestamp: new Date().toISOString()
                    }
                );

                this.showNotification(
                    `Role ${isEditing ? 'updated' : 'created'} successfully`,
                    'success'
                );
                await this.loadRoles();
                this.closeModal();
            } else {
                throw new Error(data.message || `Failed to ${isEditing ? 'update' : 'create'} role`);
            }
        } catch (error) {
            console.error('Error saving role:', error);
            this.showNotification(error.message || 'Failed to save role', 'error');
        }
    }

    async editRole(roleId) {
        try {
            const role = this.roles.find(r => r._id === roleId);
            if (!role) {
                throw new Error('Role not found');
            }

            if (role.name.toLowerCase() === 'superadmin') {
                this.showNotification('Super Admin role cannot be edited', 'error');
                return;
            }

            // Fetch fresh role data from server
            const response = await this.fetchWithAuth(`/roles/${roleId}`);
            const data = await response.json();

            if (data.success) {
                this.currentEditingRole = data.role;
                this.openModal(roleId);
            } else {
                throw new Error(data.message || 'Failed to fetch role details');
            }
        } catch (error) {
            console.error('Error editing role:', error);
            this.showNotification('Failed to edit role', 'error');
        }
    }

    async deleteRole(roleId) {
        try {
            const role = this.roles.find(r => r._id === roleId);
            if (!role) {
                throw new Error('Role not found');
            }

            if (role.name.toLowerCase() === 'superadmin') {
                this.showNotification('Super Admin role cannot be deleted', 'error');
                return;
            }

            // Check if role has assigned users
            if (role.userCount > 0) {
                const confirmed = await this.showConfirmDialog(
                    'Delete Role',
                    `This role is assigned to ${role.userCount} user(s). These users will lose their permissions. Are you sure you want to continue?`
                );
                if (!confirmed) return;
            } else {
                const confirmed = await this.showConfirmDialog(
                    'Delete Role',
                    `Are you sure you want to delete the role "${role.name}"? This action cannot be undone.`
                );
                if (!confirmed) return;
            }

            const response = await this.fetchWithAuth(`/roles/${roleId}`, {
                method: 'DELETE'
            });

            const data = await response.json();

            if (data.success) {
                // Create audit log
                await this.createAuditLog('ROLE_DELETED', {
                    roleId,
                    roleName: role.name,
                    deletedRole: {
                        name: role.name,
                        description: role.description,
                        permissions: role.permissions,
                        userCount: role.userCount
                    },
                    deletedBy: localStorage.getItem('userEmail'),
                    timestamp: new Date().toISOString()
                });

                this.showNotification('Role deleted successfully', 'success');
                await this.loadRoles();
            } else {
                throw new Error(data.message || 'Failed to delete role');
            }
        } catch (error) {
            console.error('Error deleting role:', error);
            this.showNotification(error.message || 'Failed to delete role', 'error');
        }
    }

    showConfirmDialog(title, message) {
        return new Promise((resolve) => {
            // You can replace this with a custom modal if needed
            const confirmed = window.confirm(message);
            resolve(confirmed);
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

    handleError(error, defaultMessage = 'An error occurred') {
        console.error(error);
        this.showNotification(error.message || defaultMessage, 'error');
    }
}

// Initialize the Roles & Permissions Manager
document.addEventListener('DOMContentLoaded', () => {
    const rolesManager = new RolesPermissionsManager();
    rolesManager.initialize().catch(error => {
        console.error('Failed to initialize roles manager:', error);
    });
});

// Export the class for use in other modules if needed
window.RolesPermissionsManager = RolesPermissionsManager;

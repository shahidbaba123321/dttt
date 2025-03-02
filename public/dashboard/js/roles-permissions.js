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
                { id: 'api_management', name: 'API Management', description: 'Access to API management' },
                { id: 'backup_restore', name: 'Backup & Restore', description: 'Access to backup and restore functionality' },
                { id: 'reports_management', name: 'Reports Management', description: 'Access to reports management' },
                { id: 'company_management', name: 'Company Management', description: 'Access to company management' }
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
                this.renderRoles();
            } else {
                throw new Error(data.message || 'Failed to load roles');
            }
        } catch (error) {
            console.error('Error loading roles:', error);
            throw error;
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

        return roleCard;
    }

    setupModal() {
        // Get the modal body where permissions will be displayed
        const modalBody = document.querySelector('.modal-body');
        if (!modalBody) return;

        // Create the permissions section
        const permissionsSection = document.createElement('div');
        permissionsSection.className = 'permissions-section';
        permissionsSection.innerHTML = '<h4>Permissions</h4>';

        // Create sections for each permission category
        Object.entries(this.permissions).forEach(([category, permissions]) => {
            const categorySection = document.createElement('div');
            categorySection.className = 'permission-group';
            
            const categoryTitle = document.createElement('h5');
            categoryTitle.textContent = this.formatCategoryName(category);
            categorySection.appendChild(categoryTitle);

            const permissionsGrid = document.createElement('div');
            permissionsGrid.className = 'permissions-grid';

            permissions.forEach(permission => {
                const permissionItem = document.createElement('div');
                permissionItem.className = 'permission-item';
                permissionItem.innerHTML = `
                    <input type="checkbox" 
                           id="${permission.id}" 
                           name="permissions" 
                           value="${permission.id}">
                    <label for="${permission.id}" 
                           title="${permission.description}">
                        ${permission.name}
                    </label>
                `;
                permissionsGrid.appendChild(permissionItem);
            });

            categorySection.appendChild(permissionsGrid);
            permissionsSection.appendChild(categorySection);
        });

        // Add the permissions section to the modal body
        const form = modalBody.querySelector('form');
        if (form) {
            form.appendChild(permissionsSection);
        }
    }

    formatCategoryName(category) {
        return category
            .split(/(?=[A-Z])/)
            .map(word => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' ');
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
        }
    }

    async saveRole() {
        try {
            const form = document.getElementById('roleForm');
            if (!form) return;

            const roleName = document.getElementById('roleName')?.value.trim();
            const roleDescription = document.getElementById('roleDescription')?.value.trim();
            
            if (!roleName) {
                this.showNotification('Role name is required', 'error');
                return;
            }

            // Check if role name exists (excluding current role when editing)
            const nameExists = this.roles.some(role => 
                role.name.toLowerCase() === roleName.toLowerCase() && 
                role._id !== this.currentEditingRole?._id
            );

            if (nameExists) {
                this.showNotification('Role name already exists', 'error');
                return;
            }

            const permissions = Array.from(form.querySelectorAll('input[name="permissions"]:checked'))
                .map(checkbox => checkbox.value);

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
                await this.createAuditLog(
                    isEditing ? 'ROLE_UPDATED' : 'ROLE_CREATED',
                    {
                        roleId: isEditing ? this.currentEditingRole._id : data.roleId,
                        roleName,
                        previousState: isEditing ? this.currentEditingRole : null,
                        newState: roleData
                    }
                );

                this.showNotification(
                    `Role ${isEditing ? 'updated' : 'created'} successfully`,
                    'success'
                );
                await this.loadRoles();
                this.closeModal();
            } else {
                throw new Error(data.message || 'Failed to save role');
            }
        } catch (error) {
            console.error('Error saving role:', error);
            this.showNotification(error.message || 'Failed to save role', 'error');
        }
    }

    async createAuditLog(action, details) {
        try {
            await this.fetchWithAuth('/audit-logs', {
                method: 'POST',
                body: JSON.stringify({
                    action,
                    details,
                    timestamp: new Date().toISOString()
                })
            });
        } catch (error) {
            console.error('Error creating audit log:', error);
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

            const confirmed = await this.showConfirmDialog(
                'Delete Role',
                `Are you sure you want to delete the role "${role.name}"? This action cannot be undone.`
            );

            if (!confirmed) return;

            const response = await this.fetchWithAuth(`/roles/${roleId}`, {
                method: 'DELETE'
            });

            const data = await response.json();

            if (data.success) {
                await this.createAuditLog('ROLE_DELETED', {
                    roleId,
                    roleName: role.name,
                    deletedRole: role
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

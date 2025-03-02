// public/dashboard/js/roles-permissions.js

class RolesPermissionsManager {
    constructor() {
        this.roles = [];
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
    }

    async initialize() {
        try {
            if (document.readyState === 'loading') {
                document.addEventListener('DOMContentLoaded', () => this.initializeManager());
            } else {
                await this.initializeManager();
            }
        } catch (error) {
            console.error('Failed to initialize roles manager:', error);
            this.showNotification('Failed to load roles', 'error');
        }
    }

    async initializeManager() {
        try {
            await this.loadRoles();
            this.initializeEventListeners();
            this.renderRoles();
            this.setupModal();
        } catch (error) {
            console.error('Error initializing manager:', error);
            throw error;
        }
    }

    showNotification(message, type = 'success') {
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

    async loadRoles() {
        try {
            const response = await fetch('https://18.215.160.136.nip.io/api/roles', {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error('Failed to load roles');
            }

            const data = await response.json();
            if (data.success) {
                this.roles = data.roles;
            } else {
                throw new Error(data.message || 'Failed to load roles');
            }
        } catch (error) {
            console.error('Error loading roles:', error);
            throw error;
        }
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
            saveRoleBtn.addEventListener('click', () => this.saveRole());
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
        if (!template) return document.createElement('div');

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
        Object.entries(this.permissions).forEach(([category, permissions]) => {
            const container = document.getElementById(`${category}Permissions`);
            if (container) {
                container.innerHTML = permissions.map(perm => `
                    <div class="permission-item">
                        <input type="checkbox" 
                               id="${perm.id}" 
                               name="permissions" 
                               value="${perm.id}">
                        <label for="${perm.id}" title="${perm.description}">
                            ${perm.name}
                        </label>
                    </div>
                `).join('');
            }
        });
    }

    openModal(roleId = null) {
        const modal = document.getElementById('roleModal');
        const modalTitle = document.getElementById('modalTitle');
        const form = document.getElementById('roleForm');

        if (!modal || !modalTitle || !form) return;

        modalTitle.textContent = roleId ? 'Edit Role' : 'Create New Role';
        form.reset();

        if (roleId) {
            const role = this.roles.find(r => r._id === roleId);
            if (role) {
                document.getElementById('roleName').value = role.name;
                document.getElementById('roleDescription').value = role.description || '';
                
                const checkboxes = form.querySelectorAll('input[type="checkbox"]');
                checkboxes.forEach(checkbox => {
                    checkbox.checked = role.permissions?.includes(checkbox.value) || false;
                });
            }
        }

        modal.classList.add('active');
    }

    closeModal() {
        const modal = document.getElementById('roleModal');
        if (modal) {
            modal.classList.remove('active');
        }
    }

    async saveRole() {
        try {
            const form = document.getElementById('roleForm');
            if (!form) return;

            const roleId = form.dataset.roleId;
            const roleName = document.getElementById('roleName')?.value;
            const roleDescription = document.getElementById('roleDescription')?.value;
            
            if (!roleName) {
                this.showNotification('Role name is required', 'error');
                return;
            }

            const permissions = Array.from(form.querySelectorAll('input[name="permissions"]:checked'))
                .map(checkbox => checkbox.value);

            const roleData = {
                name: roleName,
                description: roleDescription,
                permissions
            };

            const endpoint = roleId 
                ? `https://18.215.160.136.nip.io/api/roles/${roleId}`
                : 'https://18.215.160.136.nip.io/api/roles';

            const response = await fetch(endpoint, {
                method: roleId ? 'PUT' : 'POST',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(roleData)
            });

            const data = await response.json();

            if (data.success) {
                this.showNotification(
                    `Role ${roleId ? 'updated' : 'created'} successfully`,
                    'success'
                );
                await this.loadRoles();
                this.renderRoles();
                this.closeModal();
            } else {
                throw new Error(data.message || 'Failed to save role');
            }
        } catch (error) {
            console.error('Error saving role:', error);
            this.showNotification(error.message || 'Failed to save role', 'error');
        }
    }

    async deleteRole(roleId) {
        try {
            const confirmed = await this.showConfirmDialog(
                'Delete Role',
                'Are you sure you want to delete this role? This action cannot be undone.'
            );

            if (!confirmed) return;

            const response = await fetch(`https://18.215.160.136.nip.io/api/roles/${roleId}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`,
                    'Content-Type': 'application/json'
                }
            });

            const data = await response.json();

            if (data.success) {
                this.showNotification('Role deleted successfully', 'success');
                await this.loadRoles();
                this.renderRoles();
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

    async editRole(roleId) {
        try {
            const role = this.roles.find(r => r._id === roleId);
            if (!role) {
                throw new Error('Role not found');
            }

            this.openModal(roleId);
        } catch (error) {
            console.error('Error editing role:', error);
            this.showNotification('Failed to edit role', 'error');
        }
    }
}

// Make the class available globally
window.RolesPermissionsManager = RolesPermissionsManager;

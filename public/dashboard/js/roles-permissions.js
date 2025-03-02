

class RolesPermissionsManager {
    constructor() {
        this.roles = [];
        this.permissions = {
            ui: [
                { id: 'dashboard_view', name: 'View Dashboard', description: 'Access to view dashboard' },
                { id: 'reports_view', name: 'View Reports', description: 'Access to view reports' },
                { id: 'analytics_view', name: 'View Analytics', description: 'Access to view analytics' }
            ],
            modules: [
                { id: 'user_management', name: 'User Management', description: 'Access to user management module' },
                { id: 'role_management', name: 'Role Management', description: 'Access to role management module' },
                { id: 'system_settings', name: 'System Settings', description: 'Access to system settings' }
            ],
            userManagement: [
                { id: 'users_create', name: 'Create Users', description: 'Ability to create new users' },
                { id: 'users_edit', name: 'Edit Users', description: 'Ability to edit existing users' },
                { id: 'users_delete', name: 'Delete Users', description: 'Ability to delete users' },
                { id: 'users_activate', name: 'Activate/Deactivate Users', description: 'Ability to activate or deactivate users' },
                { id: 'manage_2fa', name: 'Manage 2FA', description: 'Ability to manage two-factor authentication' }
            ]
        };
        this.initializeEventListeners();
    }

    async initialize() {
        try {
            await this.loadRoles();
            this.renderRoles();
            this.setupModal();
        } catch (error) {
            console.error('Failed to initialize roles manager:', error);
            utils.showNotification('Failed to load roles', 'error');
        }
    }

    async loadRoles() {
        try {
            const response = await utils.fetchWithAuth('/roles');
            if (response.success) {
                this.roles = response.roles;
            } else {
                throw new Error(response.message);
            }
        } catch (error) {
            console.error('Error loading roles:', error);
            throw error;
        }
    }

    initializeEventListeners() {
        // Create Role Button
        document.getElementById('createRoleBtn').addEventListener('click', () => {
            this.openModal();
        });

        // Modal Close Button
        document.getElementById('closeModal').addEventListener('click', () => {
            this.closeModal();
        });

        // Save Role Button
        document.getElementById('saveRole').addEventListener('click', () => {
            this.saveRole();
        });

        // Cancel Button
        document.getElementById('cancelRole').addEventListener('click', () => {
            this.closeModal();
        });

        // Close modal when clicking outside
        document.getElementById('roleModal').addEventListener('click', (e) => {
            if (e.target.id === 'roleModal') {
                this.closeModal();
            }
        });

        // Delegate event listeners for dynamic role cards
        document.getElementById('customRolesList').addEventListener('click', (e) => {
            const roleCard = e.target.closest('.role-card');
            if (!roleCard) return;

            if (e.target.closest('.edit-role')) {
                this.editRole(roleCard.dataset.roleId);
            } else if (e.target.closest('.delete-role')) {
                this.deleteRole(roleCard.dataset.roleId);
            }
        });
    }

    renderRoles() {
        const customRolesList = document.getElementById('customRolesList');
        customRolesList.innerHTML = '';

        this.roles.forEach(role => {
            if (role.name.toLowerCase() !== 'superadmin') {
                const roleCard = this.createRoleCard(role);
                customRolesList.appendChild(roleCard);
            }
        });

        // Update superadmin user count
        const superadminRole = this.roles.find(r => r.name.toLowerCase() === 'superadmin');
        if (superadminRole) {
            document.getElementById('superadminUserCount').textContent = superadminRole.userCount || 0;
        }
    }

    createRoleCard(role) {
        const template = document.getElementById('roleCardTemplate');
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
        // Setup permission checkboxes
        Object.entries(this.permissions).forEach(([category, permissions]) => {
            const container = document.getElementById(`${category}Permissions`);
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
        });
    }

    openModal(roleId = null) {
        const modal = document.getElementById('roleModal');
        const modalTitle = document.getElementById('modalTitle');
        const form = document.getElementById('roleForm');

        modalTitle.textContent = roleId ? 'Edit Role' : 'Create New Role';
        form.reset();

        if (roleId) {
            const role = this.roles.find(r => r._id === roleId);
            if (role) {
                document.getElementById('roleName').value = role.name;
                document.getElementById('roleDescription').value = role.description || '';
                
                // Set permissions
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
        modal.classList.remove('active');
    }

    async saveRole() {
        try {
            const form = document.getElementById('roleForm');
            const roleId = form.dataset.roleId;
            
            const roleData = {
                name: document.getElementById('roleName').value,
                description: document.getElementById('roleDescription').value,
                permissions: Array.from(form.querySelectorAll('input[name="permissions"]:checked'))
                    .map(checkbox => checkbox.value)
            };

            const endpoint = roleId ? `/roles/${roleId}` : '/roles';
            const method = roleId ? 'PUT' : 'POST';

            const response = await utils.fetchWithAuth(endpoint, {
                method,
                body: JSON.stringify(roleData)
            });

            if (response.success) {
                utils.showNotification(
                    `Role ${roleId ? 'updated' : 'created'} successfully`,
                    'success'
                );
                await this.loadRoles();
                this.renderRoles();
                this.closeModal();
            } else {
                throw new Error(response.message);
            }
        } catch (error) {
            console.error('Error saving role:', error);
            utils.showNotification(error.message || 'Failed to save role', 'error');
        }
    }

    async deleteRole(roleId) {
        try {
            const confirmed = await this.showConfirmDialog(
                'Delete Role',
                'Are you sure you want to delete this role? This action cannot be undone.'
            );

            if (!confirmed) return;

            const response = await utils.fetchWithAuth(`/roles/${roleId}`, {
                method: 'DELETE'
            });

            if (response.success) {
                utils.showNotification('Role deleted successfully', 'success');
                await this.loadRoles();
                this.renderRoles();
            } else {
                throw new Error(response.message);
            }
        } catch (error) {
            console.error('Error deleting role:', error);
            utils.showNotification(error.message || 'Failed to delete role', 'error');
        }
    }

    showConfirmDialog(title, message) {
        return new Promise((resolve) => {
            const confirmed = window.confirm(message);
            resolve(confirmed);
        });
    }
}

// Initialize the Roles & Permissions Manager
document.addEventListener('DOMContentLoaded', () => {
    const rolesManager = new RolesPermissionsManager();
    rolesManager.initialize();
});

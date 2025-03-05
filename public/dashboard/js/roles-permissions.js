// Check for browser environment
if (typeof window === 'undefined') {
    throw new Error('This module must be run in a browser environment');
}

class RolesPermissionsManager {
    constructor(apiBaseUrl) {
        this.baseUrl = apiBaseUrl || 'https://18.215.160.136.nip.io/api';
        this.token = localStorage.getItem('token');
        this.currentRole = null;
        this.roles = [];
        this.permissions = [];
        this.initializeElements();
        this.initializeEventListeners();
        this.loadRolesAndPermissions();
    }

    initializeElements() {
        // Main containers
        this.rolesList = document.getElementById('rolesList');
        this.permissionsPanel = document.getElementById('permissionsPanel');
        this.permissionsGroups = document.getElementById('permissionsGroups');

        // Modals
        this.roleModal = document.getElementById('roleModal');
        this.deleteModal = document.getElementById('deleteModal');

        // Forms and inputs
        this.roleForm = document.getElementById('roleForm');
        this.roleSearch = document.getElementById('roleSearch');

        // Buttons
        this.createRoleBtn = document.getElementById('createRoleBtn');
        this.editRoleBtn = document.getElementById('editRoleBtn');
        this.deleteRoleBtn = document.getElementById('deleteRoleBtn');
        this.selectAllPermissions = document.getElementById('selectAllPermissions');
        this.deselectAllPermissions = document.getElementById('deselectAllPermissions');
        this.saveRoleBtn = document.getElementById('saveRole');
        this.confirmDeleteBtn = document.getElementById('confirmDelete');

        // Modal close buttons
        this.closeRoleModal = document.getElementById('closeRoleModal');
        this.cancelRoleModal = document.getElementById('cancelRoleModal');
        this.closeDeleteModal = document.getElementById('closeDeleteModal');
        this.cancelDelete = document.getElementById('cancelDelete');
    }

    initializeEventListeners() {
        // Role management
        this.createRoleBtn.addEventListener('click', () => this.showCreateRoleModal());
        this.editRoleBtn.addEventListener('click', () => this.showEditRoleModal());
        this.deleteRoleBtn.addEventListener('click', () => this.showDeleteModal());
        
        // Modal actions
        this.saveRoleBtn.addEventListener('click', () => this.saveRole());
        this.confirmDeleteBtn.addEventListener('click', () => this.deleteRole());
        
        // Modal close events
        this.closeRoleModal.addEventListener('click', () => this.closeModal(this.roleModal));
        this.cancelRoleModal.addEventListener('click', () => this.closeModal(this.roleModal));
        this.closeDeleteModal.addEventListener('click', () => this.closeModal(this.deleteModal));
        this.cancelDelete.addEventListener('click', () => this.closeModal(this.deleteModal));

        // Permission management
        this.selectAllPermissions.addEventListener('click', () => this.toggleAllPermissions(true));
        this.deselectAllPermissions.addEventListener('click', () => this.toggleAllPermissions(false));

        // Search functionality
        this.roleSearch.addEventListener('input', (e) => this.searchRoles(e.target.value));
    }

    async loadRolesAndPermissions() {
        try {
            const [rolesResponse, permissionsResponse] = await Promise.all([
                this.fetchRoles(),
                this.fetchPermissions()
            ]);

            if (!rolesResponse.success || !permissionsResponse.success) {
                throw new Error('Failed to fetch data');
            }

            this.roles = rolesResponse.data || [];
            this.permissions = permissionsResponse.data || {};
            
            this.renderRolesList();
            this.updateUI();
        } catch (error) {
            console.error('Error loading roles and permissions:', error);
            this.showError('Failed to load roles and permissions');
        }
    }

    async fetchRoles() {
        try {
            const response = await fetch(`${this.baseUrl}/roles`, {
                headers: {
                    'Authorization': `Bearer ${this.token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error('Failed to fetch roles');
            }

            return await response.json();
        } catch (error) {
            console.error('Error fetching roles:', error);
            return { success: false, data: [] };
        }
    }

    async fetchPermissions() {
        try {
            const response = await fetch(`${this.baseUrl}/permissions`, {
                headers: {
                    'Authorization': `Bearer ${this.token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error('Failed to fetch permissions');
            }

            const data = await response.json();
            return data;
        } catch (error) {
            console.error('Error fetching permissions:', error);
            return { success: false, data: {} };
        }
    }

    groupPermissions(permissions) {
        if (typeof permissions === 'object' && !Array.isArray(permissions)) {
            return permissions;
        }

        if (Array.isArray(permissions)) {
            return permissions.reduce((groups, permission) => {
                const category = permission.category || 'General';
                if (!groups[category]) {
                    groups[category] = [];
                }
                groups[category].push(permission);
                return groups;
            }, {});
        }

        return {};
    }

    renderRolesList() {
        this.rolesList.innerHTML = this.roles
            .map(role => this.createRoleListItem(role))
            .join('');

        const roleItems = this.rolesList.querySelectorAll('.role-item');
        roleItems.forEach(item => {
            item.addEventListener('click', () => this.selectRole(item.dataset.roleId));
        });
    }

    createRoleListItem(role) {
        const isActive = this.currentRole && this.currentRole._id === role._id;
        return `
            <div class="role-item ${isActive ? 'active' : ''}" data-role-id="${role._id}">
                <div class="role-item-content">
                    <div class="role-item-header">
                        <span class="role-name">${role.name}</span>
                        <span class="role-type">${role.isSystem ? 'System' : 'Custom'}</span>
                    </div>
                    <div class="role-description">${role.description || 'No description'}</div>
                </div>
            </div>
        `;
    }

    async selectRole(roleId) {
        try {
            const response = await fetch(`${this.baseUrl}/roles/${roleId}`, {
                headers: {
                    'Authorization': `Bearer ${this.token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error('Failed to fetch role details');
            }

            const roleData = await response.json();
            this.currentRole = roleData.data;
            this.updateUI();
            this.renderPermissions();
        } catch (error) {
            console.error('Error selecting role:', error);
            this.showError('Failed to load role details');
        }
    }

    renderPermissions() {
        if (!this.currentRole) return;

        this.permissionsGroups.innerHTML = Object.entries(this.permissions)
            .map(([category, permissions]) => this.createPermissionGroup(category, permissions))
            .join('');

        const checkboxes = this.permissionsGroups.querySelectorAll('input[type="checkbox"]');
        checkboxes.forEach(checkbox => {
            checkbox.addEventListener('change', () => this.handlePermissionChange(checkbox));
        });
    }

    createPermissionGroup(category, permissions) {
        return `
            <div class="permission-group">
                <div class="permission-group-header">${category}</div>
                <div class="permission-list">
                    ${permissions.map(permission => this.createPermissionItem(permission)).join('')}
                </div>
            </div>
        `;
    }

    createPermissionItem(permission) {
        const isChecked = this.currentRole.permissions.includes(permission.name);
        return `
            <div class="permission-item">
                <input type="checkbox" 
                       id="${permission.name}" 
                       class="permission-checkbox"
                       ${isChecked ? 'checked' : ''}
                       ${this.currentRole.isSystem ? 'disabled' : ''}>
                <label for="${permission.name}" class="permission-label">
                    ${permission.displayName || permission.name}
                </label>
            </div>
        `;
    }

    async handlePermissionChange(checkbox) {
        if (!this.currentRole || this.currentRole.isSystem) return;

        try {
            const updatedPermissions = [...this.currentRole.permissions];
            if (checkbox.checked) {
                updatedPermissions.push(checkbox.id);
            } else {
                const index = updatedPermissions.indexOf(checkbox.id);
                if (index > -1) updatedPermissions.splice(index, 1);
            }

            await this.updateRolePermissions(updatedPermissions);
        } catch (error) {
            console.error('Error updating permissions:', error);
            this.showError('Failed to update permissions');
            checkbox.checked = !checkbox.checked;
        }
    }

    async updateRolePermissions(permissions) {
        const response = await fetch(`${this.baseUrl}/roles/${this.currentRole._id}/permissions`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${this.token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ permissions })
        });

        if (!response.ok) {
            throw new Error('Failed to update permissions');
        }

        const updatedRole = await response.json();
        this.currentRole = updatedRole.data;
        this.updateUI();
    }

    showCreateRoleModal() {
        this.roleForm.reset();
        document.getElementById('modalTitle').textContent = 'Create New Role';
        this.roleModal.classList.add('show');
        document.getElementById('roleName').focus();
    }

    showEditRoleModal() {
        if (!this.currentRole || this.currentRole.isSystem) {
            this.showError('System roles cannot be edited');
            return;
        }

        document.getElementById('modalTitle').textContent = 'Edit Role';
        document.getElementById('roleName').value = this.currentRole.name;
        document.getElementById('roleDescription').value = this.currentRole.description || '';
        
        const roleTypeInputs = document.getElementsByName('roleType');
        roleTypeInputs.forEach(input => {
            input.checked = input.value === (this.currentRole.isSystem ? 'system' : 'custom');
        });

        this.roleModal.classList.add('show');
    }

    async saveRole() {
        try {
            const roleData = {
                name: document.getElementById('roleName').value.trim(),
                description: document.getElementById('roleDescription').value.trim(),
                isSystem: document.querySelector('input[name="roleType"]:checked').value === 'system'
            };

            if (!roleData.name) {
                this.showError('Role name is required');
                return;
            }

            let response;
            if (this.currentRole && !this.currentRole.isSystem) {
                response = await fetch(`${this.baseUrl}/roles/${this.currentRole._id}`, {
                    method: 'PUT',
                    headers: {
                        'Authorization': `Bearer ${this.token}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(roleData)
                });
            } else {
                response = await fetch(`${this.baseUrl}/roles`, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${this.token}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(roleData)
                });
            }

            if (!response.ok) {
                throw new Error('Failed to save role');
            }

            const result = await response.json();
            await this.loadRolesAndPermissions();
            
            if (result.data._id) {
                await this.selectRole(result.data._id);
            }

            this.closeModal(this.roleModal);
            this.showSuccess(this.currentRole ? 'Role updated successfully' : 'Role created successfully');
        } catch (error) {
            console.error('Error saving role:', error);
            this.showError('Failed to save role');
        }
    }

    showDeleteModal() {
        if (!this.currentRole) {
            this.showError('Please select a role to delete');
            return;
        }

        if (this.currentRole.isSystem) {
            this.showError('System roles cannot be deleted');
            return;
        }

        const warningText = document.getElementById('deleteWarningText');
        warningText.textContent = `Users assigned to "${this.currentRole.name}" will need to be reassigned.`;
        this.deleteModal.classList.add('show');
    }

    async deleteRole() {
        if (!this.currentRole || this.currentRole.isSystem) return;

        try {
            const response = await fetch(`${this.baseUrl}/roles/${this.currentRole._id}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${this.token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error('Failed to delete role');
            }

            this.closeModal(this.deleteModal);
            this.currentRole = null;
            await this.loadRolesAndPermissions();
            this.showSuccess('Role deleted successfully');
        } catch (error) {
            console.error('Error deleting role:', error);
            this.showError('Failed to delete role');
        }
    }

    toggleAllPermissions(state) {
        if (!this.currentRole || this.currentRole.isSystem) return;

        const checkboxes = this.permissionsGroups.querySelectorAll('input[type="checkbox"]:not(:disabled)');
        checkboxes.forEach(checkbox => {
            checkbox.checked = state;
            this.handlePermissionChange(checkbox);
        });
    }

    searchRoles(query) {
        const normalizedQuery = query.toLowerCase();
        const roleItems = this.rolesList.querySelectorAll('.role-item');

        roleItems.forEach(item => {
            const roleName = item.querySelector('.role-name').textContent.toLowerCase();
            const roleDescription = item.querySelector('.role-description').textContent.toLowerCase();
            
            const matches = roleName.includes(normalizedQuery) || 
                           roleDescription.includes(normalizedQuery);
            
            item.style.display = matches ? 'flex' : 'none';
        });
    }

    updateUI() {
        const roleNameElement = document.getElementById('selectedRoleName');
        const roleMetadata = document.getElementById('roleMetadata');
        const usersCount = document.getElementById('usersCount');
        const lastModified = document.getElementById('lastModified');

        if (this.currentRole) {
            roleNameElement.textContent = this.currentRole.name;
            roleMetadata.textContent = `${this.currentRole.isSystem ? 'System Role' : 'Custom Role'} • Created ${this.formatDate(this.currentRole.createdAt)}`;
            usersCount.textContent = this.currentRole.usersCount || 0;
            lastModified.textContent = this.formatDate(this.currentRole.updatedAt || this.currentRole.createdAt);

            this.editRoleBtn.disabled = this.currentRole.isSystem;
            this.deleteRoleBtn.disabled = this.currentRole.isSystem;
        } else {
            roleNameElement.textContent = 'Select a role';
            roleMetadata.textContent = '';
            usersCount.textContent = '0';
            lastModified.textContent = '-';

            this.editRoleBtn.disabled = true;
            this.deleteRoleBtn.disabled = true;
        }
    }

    closeModal(modal) {
        modal.classList.remove('show');
    }

    formatDate(dateString) {
        if (!dateString) return '-';
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    }

    showError(message) {
        console.error(message);
        this.showNotification(message, 'error');
    }

    showSuccess(message) {
        console.log(message);
        this.showNotification(message, 'success');
    }

    showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.innerHTML = `
            <div class="notification-content">
                <i class="fas ${this.getNotificationIcon(type)}"></i>
                <span>${message}</span>
            </div>
        `;

        document.body.appendChild(notification);

        setTimeout(() => {
            notification.remove();
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

    cleanup() {
        // Remove event listeners and clean up resources
        if (this.rolesList) {
            const roleItems = this.rolesList.querySelectorAll('.role-item');
            roleItems.forEach(item => {
                item.removeEventListener('click', () => this.selectRole(item.dataset.roleId));
            });
        }
    }
}

// Make the class available globally
window.RolesPermissionsManager = RolesPermissionsManager;

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = RolesPermissionsManager;
}

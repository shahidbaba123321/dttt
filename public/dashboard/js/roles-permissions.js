// Utility function for debouncing (defined before class to ensure availability)
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

// Main RolesPermissionsManager class
function RolesPermissionsManager() {
    // Singleton pattern implementation
    if (RolesPermissionsManager._instance) {
        return RolesPermissionsManager._instance;
    }
    RolesPermissionsManager._instance = this;

    // Initialize properties
    this.baseUrl = 'https://18.215.160.136.nip.io/api';
    this.token = localStorage.getItem('token');
    this.currentRole = null;
    this.permissions = [];
    this.roles = [];
    this.hasUnsavedChanges = false;

    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => this.initialize());
    } else {
        this.initialize();
    }
}

// Static method for getting instance
RolesPermissionsManager.getInstance = function() {
    if (!RolesPermissionsManager._instance) {
        RolesPermissionsManager._instance = new RolesPermissionsManager();
    }
    return RolesPermissionsManager._instance;
};

// Static property for instance
RolesPermissionsManager._instance = null;

// Prototype methods
RolesPermissionsManager.prototype = {
    initialize: function() {
        setTimeout(() => {
            if (document.querySelector('.roles-permissions-container')) {
                this.initializeElements();
                this.initializeEventListeners();
                this.loadInitialData();
            }
        }, 100);
    },

    initializeElements: function() {
        try {
            // Main containers
            this.rolesList = document.getElementById('rolesList');
            this.permissionsPanel = document.getElementById('permissionsPanel');
            
            // Buttons
            this.createRoleBtn = document.getElementById('createRoleBtn');
            this.savePermissionsBtn = document.getElementById('savePermissions');
            
            // Modal elements
            this.createRoleModal = document.getElementById('createRoleModal');
            this.closeRoleModal = document.getElementById('closeRoleModal');
            this.confirmRoleCreate = document.getElementById('confirmRoleCreate');
            this.cancelRoleCreate = document.getElementById('cancelRoleCreate');
            
            // Form elements
            this.roleNameInput = document.getElementById('roleName');
            this.roleDescriptionInput = document.getElementById('roleDescription');
            this.isDefaultInput = document.getElementById('isDefault');
            
            // Search
            this.roleSearch = document.getElementById('roleSearch');

            // Verify required elements
            if (!this.rolesList || !this.permissionsPanel) {
                throw new Error('Required elements not found');
            }
        } catch (error) {
            console.error('Error initializing elements:', error);
            throw error;
        }
    },

    initializeEventListeners: function() {
        // Only add event listeners if elements exist
        if (this.createRoleBtn) {
            this.createRoleBtn.addEventListener('click', () => this.showCreateRoleModal());
        }
        if (this.closeRoleModal) {
            this.closeRoleModal.addEventListener('click', () => this.hideCreateRoleModal());
        }
        if (this.cancelRoleCreate) {
            this.cancelRoleCreate.addEventListener('click', () => this.hideCreateRoleModal());
        }
        if (this.confirmRoleCreate) {
            this.confirmRoleCreate.addEventListener('click', () => this.handleRoleCreation());
        }
        if (this.roleSearch) {
            this.roleSearch.addEventListener('input', debounce((e) => {
                this.filterRoles(e.target.value);
            }, 300));
        }
        if (this.savePermissionsBtn) {
            this.savePermissionsBtn.addEventListener('click', () => this.savePermissions());
        }

        // Warn about unsaved changes
        window.addEventListener('beforeunload', (e) => {
            if (this.hasUnsavedChanges) {
                e.preventDefault();
                e.returnValue = '';
            }
        });
    },

    async loadInitialData() {
        try {
            await Promise.all([
                this.loadRoles(),
                this.loadPermissions()
            ]);
        } catch (error) {
            console.error('Error loading initial data:', error);
            this.showError('Failed to load roles and permissions data');
        }
    },

    async loadRoles() {
        try {
            const response = await fetch(`${this.baseUrl}/roles`, {
                headers: {
                    'Authorization': `Bearer ${this.token}`
                }
            });

            if (!response.ok) throw new Error('Failed to fetch roles');

            const data = await response.json();
            this.roles = data.roles;
            this.renderRoles();
        } catch (error) {
            console.error('Error loading roles:', error);
            this.showError('Failed to load roles');
        }
    },

    async loadPermissions() {
        try {
            const response = await fetch(`${this.baseUrl}/permissions`, {
                headers: {
                    'Authorization': `Bearer ${this.token}`
                }
            });

            if (!response.ok) throw new Error('Failed to fetch permissions');

            const data = await response.json();
            this.permissions = data.permissions;
        } catch (error) {
            console.error('Error loading permissions:', error);
            this.showError('Failed to load permissions');
        }
    },

    renderRoles() {
        // Keep the superadmin role
        const superadminRole = this.rolesList.querySelector('.superadmin');
        this.rolesList.innerHTML = '';
        if (superadminRole) this.rolesList.appendChild(superadminRole);

        this.roles.forEach(role => {
            if (role.name.toLowerCase() !== 'superadmin') {
                const roleElement = this.createRoleElement(role);
                this.rolesList.appendChild(roleElement);
            }
        });
    },

    createRoleElement(role) {
        const div = document.createElement('div');
        div.className = 'rp-role-item';
        div.dataset.roleId = role._id;
        
        div.innerHTML = `
            <div class="rp-role-info">
                <span class="rp-role-name">${role.name}</span>
                ${role.isDefault ? '<span class="rp-role-badge">Default</span>' : ''}
            </div>
            <div class="rp-role-stats">
                <span class="rp-users-count" title="Users with this role">
                    <i class="fas fa-users"></i> <span>${role.userCount || 0}</span>
                </span>
            </div>
        `;

        div.addEventListener('click', () => this.selectRole(role._id));
        return div;
    },

    async selectRole(roleId) {
        if (this.hasUnsavedChanges) {
            const confirm = await this.showConfirmDialog(
                'You have unsaved changes. Do you want to continue without saving?'
            );
            if (!confirm) return;
        }

        try {
            const response = await fetch(`${this.baseUrl}/roles/${roleId}`, {
                headers: {
                    'Authorization': `Bearer ${this.token}`
                }
            });

            if (!response.ok) throw new Error('Failed to fetch role details');

            const roleData = await response.json();
            this.currentRole = roleData;
            this.renderPermissions(roleData);
            
            // Update UI
            this.rolesList.querySelectorAll('.rp-role-item').forEach(item => {
                item.classList.toggle('active', item.dataset.roleId === roleId);
            });
            
            this.savePermissionsBtn.disabled = roleData.name.toLowerCase() === 'superadmin';
            this.hasUnsavedChanges = false;
        } catch (error) {
            console.error('Error selecting role:', error);
            this.showError('Failed to load role details');
        }
    },

    renderPermissions(roleData) {
        const permissionsContent = document.querySelector('.rp-permissions-content');
        permissionsContent.innerHTML = '';

        const groupedPermissions = this.groupPermissionsByCategory(this.permissions);

        Object.entries(groupedPermissions).forEach(([category, permissions]) => {
            const categoryElement = this.createPermissionCategory(category, permissions, roleData);
            permissionsContent.appendChild(categoryElement);
        });
    },

    groupPermissionsByCategory(permissions) {
        return permissions.reduce((acc, permission) => {
            const category = permission.category || 'Other';
            if (!acc[category]) acc[category] = [];
            acc[category].push(permission);
            return acc;
        }, {});
    },

    createPermissionCategory(category, permissions, roleData) {
        const div = document.createElement('div');
        div.className = 'rp-permission-category';
        
        div.innerHTML = `
            <h4>${category}</h4>
            <div class="rp-permission-group">
                ${permissions.map(permission => this.createPermissionToggle(
                    permission, 
                    roleData.permissions.includes(permission.key)
                )).join('')}
            </div>
        `;

        div.querySelectorAll('.rp-permission-toggle').forEach(toggle => {
            toggle.addEventListener('change', () => {
                this.hasUnsavedChanges = true;
                this.savePermissionsBtn.disabled = false;
            });
        });

        return div;
    },

    createPermissionToggle(permission, isChecked) {
        return `
            <div class="rp-permission-item">
                <label class="rp-permission-toggle">
                    <input type="checkbox" 
                           data-permission="${permission.key}"
                           ${isChecked ? 'checked' : ''}
                           ${this.currentRole?.name.toLowerCase() === 'superadmin' ? 'disabled' : ''}>
                    <span class="rp-permission-label">${permission.name}</span>
                    <span class="rp-permission-description">${permission.description}</span>
                </label>
            </div>
        `;
    },

    async savePermissions() {
        try {
            const selectedPermissions = Array.from(
                document.querySelectorAll('.rp-permission-toggle input:checked')
            ).map(input => input.dataset.permission);

            const response = await fetch(`${this.baseUrl}/roles/${this.currentRole._id}/permissions`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${this.token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ permissions: selectedPermissions })
            });

            if (!response.ok) throw new Error('Failed to update permissions');

            this.hasUnsavedChanges = false;
            this.savePermissionsBtn.disabled = true;
            this.showSuccess('Permissions updated successfully');
            
            await this.loadRoles();
        } catch (error) {
            console.error('Error saving permissions:', error);
            this.showError('Failed to update permissions');
        }
    },

    async handleRoleCreation() {
        try {
            const roleName = this.roleNameInput.value.trim();
            const description = this.roleDescriptionInput.value.trim();
            const isDefault = this.isDefaultInput.checked;

            if (!roleName) {
                this.showError('Role name is required');
                return;
            }

            const response = await fetch(`${this.baseUrl}/roles`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    name: roleName,
                    description,
                    isDefault
                })
            });

            if (!response.ok) throw new Error('Failed to create role');

            await this.loadRoles();
            this.hideCreateRoleModal();
            this.showSuccess('Role created successfully');
        } catch (error) {
            console.error('Error creating role:', error);
            this.showError('Failed to create role');
        }
    },

    showCreateRoleModal() {
        this.createRoleModal.classList.add('active');
        this.roleNameInput.value = '';
        this.roleDescriptionInput.value = '';
        this.isDefaultInput.checked = false;
    },

    hideCreateRoleModal() {
        this.createRoleModal.classList.remove('active');
    },

    filterRoles(searchTerm) {
        const normalizedSearch = searchTerm.toLowerCase();
        const roleItems = this.rolesList.querySelectorAll('.rp-role-item');

        roleItems.forEach(item => {
            const roleName = item.querySelector('.rp-role-name').textContent.toLowerCase();
            item.style.display = roleName.includes(normalizedSearch) ? 'flex' : 'none';
        });
    },

    showError(message) {
        console.error(message);
    },

    showSuccess(message) {
        console.log(message);
    },

    async showConfirmDialog(message) {
        return window.confirm(message);
    }
};

// Initialize the module
(function() {
    // On direct script load
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initModule);
    } else {
        initModule();
    }

    // On dynamic content load
    document.addEventListener('contentLoaded', (event) => {
        if (event.detail && event.detail.section === 'roles') {
            initModule();
        }
    });

    function initModule() {
        if (document.querySelector('.roles-permissions-container')) {
            RolesPermissionsManager.getInstance();
        }
    }
})();

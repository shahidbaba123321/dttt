(function() {
    // Check if RolesPermissionsManager already exists
    if (window.RolesPermissionsManager) {
        return; // Exit if already defined
    }

class RolesPermissionsManager {
    constructor(apiBaseUrl) {
        this.baseUrl = 'https://18.215.160.136.nip.io/api';
        this.token = localStorage.getItem('token');
        this.currentRole = null;
        this.roles = [];
        this.permissions = [];
        this.notificationTimeout = null;
        this.initializeElements();
        this.initializeStyles();
        this.initializeEventListeners();
        this.loadRolesAndPermissions();
    }

    initializeStyles() {
        const styles = `
            .permission-group {
                margin-bottom: var(--spacing-md);
                border: 1px solid var(--border-light);
                border-radius: var(--border-radius-md);
                overflow: hidden;
                background-color: var(--bg-primary);
            }

            .permission-item {
                padding: var(--spacing-sm) var(--spacing-md);
                border-bottom: 1px solid var(--border-light);
                transition: background-color 0.2s ease;
            }

            .permission-item:hover {
                background-color: var(--bg-tertiary);
            }

            .permission-item:last-child {
                border-bottom: none;
            }

            .permission-label-content {
                display: flex;
                flex-direction: column;
                gap: 4px;
            }

            .permission-name {
                font-weight: 500;
                color: var(--text-primary);
            }

            .permission-description {
                font-size: 0.875rem;
                color: var(--text-secondary);
            }

            .permission-checkbox-wrapper {
                display: flex;
                align-items: flex-start;
                gap: var(--spacing-sm);
            }

            .permission-checkbox {
                margin-top: 4px;
            }

            .permission-group-header {
                background-color: var(--bg-tertiary);
                padding: var(--spacing-md);
                font-weight: 600;
                display: flex;
                justify-content: space-between;
                align-items: center;
                border-bottom: 1px solid var(--border-light);
            }

            .permission-count {
                font-size: 0.875rem;
                color: var(--text-tertiary);
                background-color: var(--bg-primary);
                padding: 2px 8px;
                border-radius: 12px;
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

            .no-results-message {
                text-align: center;
                padding: var(--spacing-lg);
                color: var(--text-tertiary);
                font-style: italic;
            }

            .no-permissions-message {
                text-align: center;
                padding: var(--spacing-lg);
                color: var(--text-tertiary);
                background-color: var(--bg-secondary);
                border-radius: var(--border-radius-md);
                margin: var(--spacing-md);
            }

            .permission-group:empty {
                display: none;
            }

            .tooltip {
                position: absolute;
                background-color: var(--bg-primary);
                color: var(--text-primary);
                padding: 8px 12px;
                border-radius: var(--border-radius-md);
                font-size: 0.875rem;
                box-shadow: var(--shadow-lg);
                z-index: 1000;
                max-width: 250px;
                word-wrap: break-word;
                border: 1px solid var(--border-light);
                pointer-events: none;
                animation: tooltipFadeIn 0.2s ease-in-out;
            }

            @keyframes tooltipFadeIn {
                from {
                    opacity: 0;
                    transform: translateY(5px);
                }
                to {
                    opacity: 1;
                    transform: translateY(0);
                }
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

            .notification.warning {
                background-color: #FEF3C7;
                color: #92400E;
            }

            .notification.info {
                background-color: #E1EFFE;
                color: #1E429F;
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

        // Error handling for missing elements
        Object.entries(this).forEach(([key, value]) => {
            if (key !== 'token' && key !== 'currentRole' && key !== 'roles' && 
                key !== 'permissions' && key !== 'baseUrl' && 
                key !== 'notificationTimeout' && !value) {
                console.error(`Element not found: ${key}`);
            }
        });
    }

    initializeEventListeners() {
        // Role management
        this.createRoleBtn?.addEventListener('click', () => this.showCreateRoleModal());
        this.editRoleBtn?.addEventListener('click', () => this.showEditRoleModal());
        this.deleteRoleBtn?.addEventListener('click', () => this.showDeleteModal());
        
        // Modal actions
        this.roleForm?.addEventListener('submit', (e) => {
            e.preventDefault();
            this.saveRole();
        });
        
        this.saveRoleBtn?.addEventListener('click', (e) => {
            e.preventDefault();
            this.saveRole();
        });
        
        this.confirmDeleteBtn?.addEventListener('click', (e) => {
            e.preventDefault();
            this.deleteRole();
        });
        
        // Modal close events
        this.closeRoleModal?.addEventListener('click', () => this.closeModal(this.roleModal));
        this.cancelRoleModal?.addEventListener('click', () => this.closeModal(this.roleModal));
        this.closeDeleteModal?.addEventListener('click', () => this.closeModal(this.deleteModal));
        this.cancelDelete?.addEventListener('click', () => this.closeModal(this.deleteModal));

        // Permission management
        this.selectAllPermissions?.addEventListener('click', () => this.toggleAllPermissions(true));
        this.deselectAllPermissions?.addEventListener('click', () => this.toggleAllPermissions(false));

        // Search functionality
        this.roleSearch?.addEventListener('input', (e) => this.searchRoles(e.target.value));

        // Role name validation
        const roleNameInput = document.getElementById('roleName');
        roleNameInput?.addEventListener('input', (e) => {
            const name = e.target.value.trim();
            const errors = this.validateRole({ name });
            
            if (errors.length > 0) {
                e.target.setCustomValidity(errors[0]);
                e.target.reportValidity();
            } else {
                e.target.setCustomValidity('');
            }
        });

        // Role description validation
        const roleDescriptionInput = document.getElementById('roleDescription');
        roleDescriptionInput?.addEventListener('input', (e) => {
            const description = e.target.value.trim();
            if (description.length > 200) {
                e.target.setCustomValidity('Description cannot exceed 200 characters');
                e.target.reportValidity();
            } else {
                e.target.setCustomValidity('');
            }
        });

        // Modal keyboard navigation
        this.roleModal?.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.closeModal(this.roleModal);
            }
        });

        this.deleteModal?.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.closeModal(this.deleteModal);
            }
        });

        // Click outside modal to close
        window.addEventListener('click', (e) => {
            if (e.target === this.roleModal) {
                this.closeModal(this.roleModal);
            }
            if (e.target === this.deleteModal) {
                this.closeModal(this.deleteModal);
            }
        });

        // Prevent modal close when clicking inside
        this.roleModal?.querySelector('.modal-content')?.addEventListener('click', (e) => {
            e.stopPropagation();
        });

        this.deleteModal?.querySelector('.modal-content')?.addEventListener('click', (e) => {
            e.stopPropagation();
        });
    }

    async loadRolesAndPermissions() {
        try {
            this.showLoading();
            const [rolesResponse, permissionsResponse] = await Promise.all([
                this.fetchRoles(),
                this.fetchPermissions()
            ]);

            if (!rolesResponse.success || !permissionsResponse.success) {
                throw new Error('Failed to fetch data');
            }

            this.roles = rolesResponse.data || [];
            this.permissions = permissionsResponse.data || {};
            
            console.log('Loaded permissions:', this.permissions);
            
            this.renderRolesList();
            this.updateUI();
            this.hideLoading();
        } catch (error) {
            console.error('Error loading roles and permissions:', error);
            this.showError('Failed to load roles and permissions');
            this.hideLoading();
        }
    }
        async fetchRoles() {
        try {
            const response = await fetch(`${this.baseUrl}/roles`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${this.token}`,
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const contentType = response.headers.get("content-type");
            if (!contentType || !contentType.includes("application/json")) {
                throw new Error("Received non-JSON response from server");
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
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${this.token}`,
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            }
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const result = await response.json();
        console.log('Raw API Response:', result);

        // Initialize default permissions if none exist
        if (!result.data || Object.keys(result.data).length === 0) {
            console.warn('No permissions found in response');
            return { success: false, data: [] };
        }

        // Extract all permissions into a flat array
        let allPermissions = [];
        if (Array.isArray(result.data)) {
            allPermissions = result.data;
        } else {
            Object.values(result.data).forEach(categoryPermissions => {
                if (Array.isArray(categoryPermissions)) {
                    allPermissions = allPermissions.concat(categoryPermissions);
                }
            });
        }

        console.log('Processed permissions:', allPermissions);

        return {
            success: true,
            data: allPermissions
        };
    } catch (error) {
        console.error('Error fetching permissions:', error);
        return { success: false, data: [] };
    }
}

organizePermissionsByCategory(permissions) {
    if (!permissions || !Array.isArray(permissions) || permissions.length === 0) {
        console.warn('Invalid permissions data received:', permissions);
        return {};
    }

    // Define all possible categories
    const categorizedPermissions = {
        'Dashboard Access': [],
        'User Management': [],
        'Role Management': [],
        'Company Management': [],
        'System Settings': [],
        'Module Management': [],
        'Analytics & Reports': [],
        'System Tools': [],
        'Support': []
    };

    // Default permissions if they're not in the server response
    const defaultPermissions = [
        {
            name: 'view_dashboard',
            displayName: 'View Dashboard',
            category: 'Dashboard Access',
            description: 'Can access the dashboard overview'
        },
        {
            name: 'view_companies',
            displayName: 'View Companies',
            category: 'Company Management',
            description: 'Can view company list and details'
        },
        {
            name: 'manage_companies',
            displayName: 'Manage Companies',
            category: 'Company Management',
            description: 'Can create, edit, and delete companies'
        },
        {
            name: 'view_settings',
            displayName: 'View Settings',
            category: 'System Settings',
            description: 'Can view system settings'
        },
        {
            name: 'manage_settings',
            displayName: 'Manage Settings',
            category: 'System Settings',
            description: 'Can modify system settings'
        },
        {
            name: 'manage_pricing',
            displayName: 'Manage Pricing',
            category: 'System Settings',
            description: 'Can manage pricing and plans'
        },
        {
            name: 'manage_security',
            displayName: 'Manage Security',
            category: 'System Settings',
            description: 'Can manage security settings'
        },
        {
            name: 'view_modules',
            displayName: 'View Modules',
            category: 'Module Management',
            description: 'Can view available modules'
        },
        {
            name: 'manage_modules',
            displayName: 'Manage Modules',
            category: 'Module Management',
            description: 'Can manage and configure modules'
        },
        {
            name: 'view_analytics',
            displayName: 'View Analytics',
            category: 'Analytics & Reports',
            description: 'Can view analytics and reports'
        },
        {
            name: 'manage_reports',
            displayName: 'Manage Reports',
            category: 'Analytics & Reports',
            description: 'Can create and manage custom reports'
        },
        {
            name: 'manage_backup',
            displayName: 'Manage Backup',
            category: 'System Tools',
            description: 'Can perform backup and restore operations'
        },
        {
            name: 'view_audit_logs',
            displayName: 'View Audit Logs',
            category: 'System Tools',
            description: 'Can view system audit logs'
        },
        {
            name: 'manage_api',
            displayName: 'Manage API',
            category: 'System Tools',
            description: 'Can manage API settings and keys'
        },
        {
            name: 'access_support',
            displayName: 'Access Support',
            category: 'Support',
            description: 'Can access support center'
        },
        {
            name: 'manage_support',
            displayName: 'Manage Support',
            category: 'Support',
            description: 'Can manage support tickets and resources'
        }
    ];

    // Combine server permissions with default permissions
    const allPermissions = [...permissions, ...defaultPermissions];

    // Remove duplicates based on permission name
    const uniquePermissions = Array.from(
        new Map(allPermissions.map(item => [item.name, item])).values()
    );

    // Organize permissions into categories
    uniquePermissions.forEach(permission => {
        if (permission.category && categorizedPermissions[permission.category]) {
            categorizedPermissions[permission.category].push({
                name: permission.name,
                displayName: permission.displayName || this.formatPermissionName(permission.name),
                description: permission.description || '',
                category: permission.category
            });
        }
    });

    // Remove empty categories
    Object.keys(categorizedPermissions).forEach(category => {
        if (categorizedPermissions[category].length === 0) {
            delete categorizedPermissions[category];
        }
    });

    console.log('Final organized permissions:', categorizedPermissions);
    return categorizedPermissions;
}

    formatPermissionName(name) {
        return name
            .split('_')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
            .join(' ');
    }

    renderRolesList() {
        if (!this.rolesList) return;

        this.rolesList.innerHTML = this.roles
            .map(role => this.createRoleListItem(role))
            .join('');

        const roleItems = this.rolesList.querySelectorAll('.role-item');
        roleItems.forEach(item => {
            item.addEventListener('click', () => this.selectRole(item.dataset.roleId));
            item.setAttribute('tabindex', '0');
            item.addEventListener('keypress', (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    this.selectRole(item.dataset.roleId);
                }
            });
        });
    }

    createRoleListItem(role) {
        const isActive = this.currentRole && this.currentRole._id === role._id;
        return `
            <div class="role-item ${isActive ? 'active' : ''}" 
                 data-role-id="${role._id}"
                 role="button"
                 aria-selected="${isActive}">
                <div class="role-item-content">
                    <div class="role-item-header">
                        <span class="role-name">${this.escapeHtml(role.name)}</span>
                        <span class="role-type ${role.isSystem ? 'system' : 'custom'}">
                            ${role.isSystem ? 'System' : 'Custom'}
                        </span>
                    </div>
                    <div class="role-description">
                        ${this.escapeHtml(role.description || 'No description')}
                    </div>
                    <div class="role-meta">
                        <span class="users-count">
                            <i class="fas fa-users"></i> ${role.usersCount || 0} users
                        </span>
                        <span class="last-updated">
                            <i class="fas fa-clock"></i> 
                            ${this.formatDate(role.updatedAt || role.createdAt)}
                        </span>
                    </div>
                </div>
            </div>
        `;
    }
       renderPermissions() {
    if (!this.currentRole || !this.permissionsGroups) return;

    console.log('Current role:', this.currentRole);
    const categorizedPermissions = this.organizePermissionsByCategory(this.permissions);
    
    if (Object.keys(categorizedPermissions).length === 0) {
        this.permissionsGroups.innerHTML = `
            <div class="no-permissions-message">
                <p>No permissions available</p>
            </div>
        `;
        return;
    }

    // Sort categories in a specific order
    const categoryOrder = [
        'Dashboard Access',
        'User Management',
        'Role Management',
        'Company Management',
        'System Settings',
        'Module Management',
        'Analytics & Reports',
        'System Tools',
        'Support'
    ];

    const sortedCategories = Object.entries(categorizedPermissions)
        .sort(([a], [b]) => {
            return categoryOrder.indexOf(a) - categoryOrder.indexOf(b);
        });

    this.permissionsGroups.innerHTML = sortedCategories
        .map(([category, permissions]) => {
            if (permissions.length === 0) return '';
            return this.createPermissionGroup(category, permissions);
        })
        .filter(Boolean)
        .join('');

    const checkboxes = this.permissionsGroups.querySelectorAll('input[type="checkbox"]');
    checkboxes.forEach(checkbox => {
        checkbox.addEventListener('change', () => this.handlePermissionChange(checkbox));
    });

    this.initializeTooltips();
}
    
    createPermissionGroup(category, permissions) {
        return `
            <div class="permission-group">
                <div class="permission-group-header">
                    <span>${this.escapeHtml(category)}</span>
                    <span class="permission-count">${permissions.length}</span>
                </div>
                <div class="permission-list">
                    ${permissions.map(permission => this.createPermissionItem(permission)).join('')}
                </div>
            </div>
        `;
    }

    createPermissionItem(permission) {
    const isChecked = Array.isArray(this.currentRole.permissions) && 
                     this.currentRole.permissions.includes(permission.name);
    const isDisabled = this.currentRole.isSystem;
    
    return `
        <div class="permission-item">
            <div class="permission-checkbox-wrapper">
                <input type="checkbox" 
                       id="${permission.name}" 
                       class="permission-checkbox"
                       ${isChecked ? 'checked' : ''}
                       ${isDisabled ? 'disabled' : ''}
                       data-tooltip="${this.escapeHtml(permission.description)}"
                       data-permission="${permission.name}">
                <label for="${permission.name}" class="permission-label">
                    <div class="permission-label-content">
                        <span class="permission-name">${this.escapeHtml(permission.displayName || permission.name)}</span>
                        <span class="permission-description">
                            ${this.escapeHtml(permission.description)}
                        </span>
                    </div>
                </label>
            </div>
        </div>
    `;
}
    
    async handlePermissionChange(checkbox) {
        if (!this.currentRole || this.currentRole.isSystem) return;

        try {
            const updatedPermissions = [...this.currentRole.permissions];
            if (checkbox.checked) {
                updatedPermissions.push(checkbox.dataset.permission);
            } else {
                const index = updatedPermissions.indexOf(checkbox.dataset.permission);
                if (index > -1) updatedPermissions.splice(index, 1);
            }

            await this.updateRolePermissions(updatedPermissions);
        } catch (error) {
            console.error('Error updating permissions:', error);
            this.showError('Failed to update permissions');
            checkbox.checked = !checkbox.checked; // Revert checkbox state
        }
    }

    async updateRolePermissions(permissions) {
        try {
            const response = await fetch(`${this.baseUrl}/roles/${this.currentRole._id}/permissions`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${this.token}`,
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                body: JSON.stringify({ permissions })
            });

            if (!response.ok) {
                throw new Error('Failed to update permissions');
            }

            const result = await response.json();
            if (!result.success) {
                throw new Error(result.message || 'Failed to update permissions');
            }

            this.currentRole.permissions = permissions;
            this.showSuccess('Permissions updated successfully');
            await this.loadRolesAndPermissions();
        } catch (error) {
            throw error;
        }
    }

    async selectRole(roleId) {
        try {
            this.showLoading();
            const response = await fetch(`${this.baseUrl}/roles/${roleId}`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${this.token}`,
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error('Failed to fetch role details');
            }

            const data = await response.json();
            this.currentRole = data.data;
            
            this.updateUI();
            this.renderPermissions();
            
            const url = new URL(window.location.href);
            url.searchParams.set('roleId', roleId);
            window.history.pushState({}, '', url);

            this.hideLoading();
        } catch (error) {
            console.error('Error selecting role:', error);
            this.showError('Failed to load role details');
            this.hideLoading();
        }
    }
        async toggleAllPermissions(checked) {
        if (!this.currentRole || this.currentRole.isSystem) return;

        const checkboxes = this.permissionsGroups.querySelectorAll('input[type="checkbox"]');
        const permissions = new Set();

        checkboxes.forEach(checkbox => {
            checkbox.checked = checked;
            if (checked) {
                permissions.add(checkbox.dataset.permission);
            }
        });

        try {
            await this.updateRolePermissions(Array.from(permissions));
            this.showSuccess(`All permissions ${checked ? 'selected' : 'deselected'} successfully`);
        } catch (error) {
            console.error('Error updating permissions:', error);
            this.showError('Failed to update permissions');
            checkboxes.forEach(checkbox => checkbox.checked = !checked);
        }
    }

    async saveRole() {
        try {
            const roleData = {
                name: document.getElementById('roleName').value.trim(),
                description: document.getElementById('roleDescription').value.trim(),
                isSystem: document.querySelector('input[name="roleType"]:checked').value === 'system',
                permissions: this.currentRole ? [...this.currentRole.permissions] : []
            };

            const validationErrors = this.validateRole(roleData);
            if (validationErrors.length > 0) {
                this.showError(validationErrors[0]);
                return;
            }

            this.showLoading();

            let response;
            const headers = {
                'Authorization': `Bearer ${this.token}`,
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            };

            if (this.currentRole && !this.currentRole.isSystem) {
                response = await fetch(`${this.baseUrl}/roles/${this.currentRole._id}`, {
                    method: 'PUT',
                    headers: headers,
                    body: JSON.stringify(roleData)
                });
            } else {
                response = await fetch(`${this.baseUrl}/roles`, {
                    method: 'POST',
                    headers: headers,
                    body: JSON.stringify(roleData)
                });
            }

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Failed to save role');
            }

            const result = await response.json();
            
            if (!result.success) {
                throw new Error(result.message || 'Failed to save role');
            }

            await this.loadRolesAndPermissions();
            
            if (result.data && result.data._id) {
                await this.selectRole(result.data._id);
            }

            this.closeModal(this.roleModal);
            this.showSuccess(this.currentRole ? 'Role updated successfully' : 'Role created successfully');

        } catch (error) {
            console.error('Error saving role:', error);
            this.showError(error.message || 'Failed to save role');
        } finally {
            this.hideLoading();
        }
    }

    showCreateRoleModal() {
        this.roleForm.reset();
        document.getElementById('modalTitle').textContent = 'Create New Role';
        
        const roleTypeInputs = document.getElementsByName('roleType');
        roleTypeInputs.forEach(input => {
            input.disabled = false;
            if (input.value === 'custom') {
                input.checked = true;
            }
        });

        this.currentRole = null;
        this.roleModal.classList.add('show');
        document.getElementById('roleName').focus();
    }

    showEditRoleModal() {
        if (!this.currentRole) {
            this.showError('Please select a role to edit');
            return;
        }

        if (this.currentRole.isSystem) {
            this.showError('System roles cannot be edited');
            return;
        }

        document.getElementById('modalTitle').textContent = 'Edit Role';
        document.getElementById('roleName').value = this.currentRole.name;
        document.getElementById('roleDescription').value = this.currentRole.description || '';
        
        const roleTypeInputs = document.getElementsByName('roleType');
        roleTypeInputs.forEach(input => {
            input.checked = input.value === (this.currentRole.isSystem ? 'system' : 'custom');
            input.disabled = this.currentRole.isSystem;
        });

        this.roleModal.classList.add('show');
        document.getElementById('roleName').focus();
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
        if (warningText) {
            warningText.textContent = `Are you sure you want to delete "${this.currentRole.name}"? This action cannot be undone.`;
            if (this.currentRole.usersCount > 0) {
                warningText.textContent += ` ${this.currentRole.usersCount} users are currently assigned to this role and will need to be reassigned.`;
            }
        }

        this.deleteModal.classList.add('show');
    }
        async deleteRole() {
        if (!this.currentRole || this.currentRole.isSystem) return;

        try {
            this.showLoading();

            const response = await fetch(`${this.baseUrl}/roles/${this.currentRole._id}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${this.token}`,
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                }
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Failed to delete role');
            }

            const result = await response.json();
            if (!result.success) {
                throw new Error(result.message || 'Failed to delete role');
            }

            this.closeModal(this.deleteModal);
            this.currentRole = null;
            await this.loadRolesAndPermissions();
            this.showSuccess('Role deleted successfully');

        } catch (error) {
            console.error('Error deleting role:', error);
            this.showError(error.message || 'Failed to delete role');
        } finally {
            this.hideLoading();
        }
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
            
            if (this.selectAllPermissions && this.deselectAllPermissions) {
                this.selectAllPermissions.disabled = this.currentRole.isSystem;
                this.deselectAllPermissions.disabled = this.currentRole.isSystem;
            }
        } else {
            roleNameElement.textContent = 'Select a role';
            roleMetadata.textContent = '';
            usersCount.textContent = '0';
            lastModified.textContent = '-';

            this.editRoleBtn.disabled = true;
            this.deleteRoleBtn.disabled = true;
            
            if (this.selectAllPermissions && this.deselectAllPermissions) {
                this.selectAllPermissions.disabled = true;
                this.deselectAllPermissions.disabled = true;
            }
        }
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
            item.setAttribute('aria-hidden', !matches);
        });

        let noResultsMsg = this.rolesList.querySelector('.no-results-message');
        const hasVisibleRoles = Array.from(roleItems).some(item => item.style.display !== 'none');

        if (!hasVisibleRoles) {
            if (!noResultsMsg) {
                noResultsMsg = document.createElement('div');
                noResultsMsg.className = 'no-results-message';
                noResultsMsg.textContent = 'No roles found matching your search';
                this.rolesList.appendChild(noResultsMsg);
            }
        } else if (noResultsMsg) {
            noResultsMsg.remove();
        }
    }

    initializeTooltips() {
        document.querySelectorAll('.tooltip').forEach(tooltip => tooltip.remove());

        const tooltipElements = document.querySelectorAll('[data-tooltip]');
        tooltipElements.forEach(element => {
            element.addEventListener('mouseenter', (e) => {
                const tooltip = document.createElement('div');
                tooltip.className = 'tooltip';
                tooltip.textContent = e.target.dataset.tooltip;
                document.body.appendChild(tooltip);

                const rect = e.target.getBoundingClientRect();
                tooltip.style.top = `${rect.bottom + 5}px`;
                tooltip.style.left = `${rect.left + (rect.width / 2) - (tooltip.offsetWidth / 2)}px`;
            });

            element.addEventListener('mouseleave', () => {
                document.querySelectorAll('.tooltip').forEach(tooltip => tooltip.remove());
            });
        });
    }

    validateRole(roleData) {
        const errors = [];

        if (!roleData.name) {
            errors.push('Role name is required');
        }

        if (roleData.name && roleData.name.length < 3) {
            errors.push('Role name must be at least 3 characters long');
        }

        if (roleData.name && roleData.name.length > 50) {
            errors.push('Role name cannot exceed 50 characters');
        }

        const nameRegex = /^[a-zA-Z0-9\s_-]+$/;
        if (roleData.name && !nameRegex.test(roleData.name)) {
            errors.push('Role name can only contain letters, numbers, spaces, hyphens, and underscores');
        }

        if (roleData.description && roleData.description.length > 200) {
            errors.push('Description cannot exceed 200 characters');
        }

        return errors;
    }

    closeModal(modal) {
        if (!modal) return;
        modal.classList.remove('show');
        if (modal === this.roleModal) {
            this.roleForm.reset();
        }
    }

    formatDate(dateString) {
        if (!dateString) return '-';
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
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
        if (this.notificationTimeout) {
            clearTimeout(this.notificationTimeout);
        }

        document.querySelectorAll('.notification').forEach(n => n.remove());

        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.innerHTML = `
            <div class="notification-content">
                <i class="fas ${this.getNotificationIcon(type)}"></i>
                <span>${this.escapeHtml(message)}</span>
            </div>
        `;

        document.body.appendChild(notification);
        
        notification.style.animation = 'slideIn 0.3s ease-out';

        this.notificationTimeout = setTimeout(() => {
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

    cleanup() {
        if (this.rolesList) {
            const roleItems = this.rolesList.querySelectorAll('.role-item');
            roleItems.forEach(item => {
                item.removeEventListener('click', () => this.selectRole(item.dataset.roleId));
            });
        }

        document.querySelectorAll('.notification, .loading-overlay, .tooltip').forEach(el => el.remove());

        if (this.notificationTimeout) {
            clearTimeout(this.notificationTimeout);
        }

        this.currentRole = null;
        this.roles = [];
        this.permissions = [];

        this.rolesList = null;
        this.permissionsPanel = null;
        this.permissionsGroups = null;
        this.roleModal = null;
        this.deleteModal = null;
        this.roleForm = null;
        this.roleSearch = null;
        this.createRoleBtn = null;
        this.editRoleBtn = null;
        this.deleteRoleBtn = null;
        this.selectAllPermissions = null;
        this.deselectAllPermissions = null;
        this.saveRoleBtn = null;
        this.confirmDeleteBtn = null;
        this.closeRoleModal = null;
        this.cancelRoleModal = null;
        this.closeDeleteModal = null;
        this.cancelDelete = null;
    }
}

// Register the class globally
window.RolesPermissionsManager = RolesPermissionsManager;
})();

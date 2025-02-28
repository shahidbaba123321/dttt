const RolesPermissions = {
    // State management
    state: {
        roles: [],
        currentPage: 1,
        itemsPerPage: 10,
        totalItems: 0,
        sortField: 'name',
        sortOrder: 'asc',
        searchTerm: '',
        statusFilter: 'all',
        typeFilter: 'all',
        selectedRoleId: null,
        permissions: {
            'Dashboard & Analytics': [
                { id: 'view_dashboard', name: 'View Dashboard' },
                { id: 'view_analytics', name: 'View Analytics' },
                { id: 'export_reports', name: 'Export Reports' },
                { id: 'manage_widgets', name: 'Manage Widgets' }
            ],
            'User Management': [
                { id: 'create_users', name: 'Create Users' },
                { id: 'edit_users', name: 'Edit Users' },
                { id: 'delete_users', name: 'Delete Users' },
                { id: 'view_users', name: 'View Users' },
                { id: 'manage_user_status', name: 'Manage User Status' },
                { id: 'manage_2fa', name: 'Manage 2FA' },
                { id: 'assign_roles', name: 'Assign Roles' }
            ],
            'System Settings': [
                { id: 'view_settings', name: 'View Settings' },
                { id: 'edit_settings', name: 'Edit Settings' },
                { id: 'manage_backups', name: 'Manage Backups' },
                { id: 'view_logs', name: 'View Logs' },
                { id: 'manage_integrations', name: 'Manage Integrations' },
                { id: 'manage_api_keys', name: 'Manage API Keys' }
            ]
        }
    },

    // Initialize module
    init() {
        console.log('Initializing Roles & Permissions module');
        this.attachEventListeners();
        this.loadRoles();
        this.setupPermissionsUI();
    },

    // Event Listeners
    attachEventListeners() {
        // Create Role Button
        const createBtn = document.getElementById('rpCreateRoleBtn');
        if (createBtn) {
            createBtn.addEventListener('click', () => this.openCreateRoleModal());
        }

        // Search Input
        const searchInput = document.getElementById('rpSearchInput');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                this.state.searchTerm = e.target.value;
                this.state.currentPage = 1;
                this.loadRoles();
            });
        }

        // Filters
        const statusFilter = document.getElementById('rpStatusFilter');
        const typeFilter = document.getElementById('rpTypeFilter');

        if (statusFilter) {
            statusFilter.addEventListener('change', (e) => {
                this.state.statusFilter = e.target.value;
                this.state.currentPage = 1;
                this.loadRoles();
            });
        }

        if (typeFilter) {
            typeFilter.addEventListener('change', (e) => {
                this.state.typeFilter = e.target.value;
                this.state.currentPage = 1;
                this.loadRoles();
            });
        }

        // Modal Close Buttons
        const closeModalBtns = ['rpCloseModal', 'rpCancelBtn', 'rpCloseDeleteModal', 'rpCancelDeleteBtn'];
        closeModalBtns.forEach(btnId => {
            const btn = document.getElementById(btnId);
            if (btn) {
                btn.addEventListener('click', () => this.closeModals());
            }
        });

        // Save Role Button
        const saveBtn = document.getElementById('rpSaveBtn');
        if (saveBtn) {
            saveBtn.addEventListener('click', () => this.saveRole());
        }

        // Delete Role Button
        const deleteBtn = document.getElementById('rpConfirmDeleteBtn');
        if (deleteBtn) {
            deleteBtn.addEventListener('click', () => this.deleteRole());
        }

        // Pagination
        const prevPage = document.getElementById('rpPrevPage');
        const nextPage = document.getElementById('rpNextPage');

        if (prevPage) {
            prevPage.addEventListener('click', () => {
                if (this.state.currentPage > 1) {
                    this.state.currentPage--;
                    this.loadRoles();
                }
            });
        }

        if (nextPage) {
            nextPage.addEventListener('click', () => {
                const maxPages = Math.ceil(this.state.totalItems / this.state.itemsPerPage);
                if (this.state.currentPage < maxPages) {
                    this.state.currentPage++;
                    this.loadRoles();
                }
            });
        }
    },

    // API Calls
    async loadRoles() {
        try {
            const token = localStorage.getItem('token');
            const queryParams = new URLSearchParams({
                page: this.state.currentPage,
                limit: this.state.itemsPerPage,
                search: this.state.searchTerm,
                status: this.state.statusFilter,
                type: this.state.typeFilter,
                sort: this.state.sortField,
                order: this.state.sortOrder
            });

            const response = await fetch(`https://18.215.160.136.nip.io/api/roles?${queryParams}`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            const data = await response.json();
            if (data.success) {
                this.state.roles = data.roles;
                this.state.totalItems = data.pagination.total;
                this.renderRoles();
                this.updatePagination();
                this.updateStats();
            } else {
                throw new Error(data.message || 'Failed to load roles');
            }
        } catch (error) {
            console.error('Error loading roles:', error);
            this.showToast(error.message || 'Error loading roles', 'error');
        }
    },

    async saveRole() {
        try {
            const roleData = this.getRoleFormData();
            if (!this.validateRoleData(roleData)) {
                return;
            }

            const token = localStorage.getItem('token');
            const url = this.state.selectedRoleId 
                ? `https://18.215.160.136.nip.io/api/roles/${this.state.selectedRoleId}`
                : 'https://18.215.160.136.nip.io/api/roles';
            
            const response = await fetch(url, {
                method: this.state.selectedRoleId ? 'PUT' : 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(roleData)
            });

            const data = await response.json();
            if (data.success) {
                this.showToast(`Role ${this.state.selectedRoleId ? 'updated' : 'created'} successfully`, 'success');
                this.closeModals();
                this.loadRoles();
            } else {
                throw new Error(data.message || 'Failed to save role');
            }
        } catch (error) {
            console.error('Error saving role:', error);
            this.showToast(error.message || 'Error saving role', 'error');
        }
    },

    async deleteRole() {
        try {
            if (!this.state.selectedRoleId) return;

            const token = localStorage.getItem('token');
            const response = await fetch(`https://18.215.160.136.nip.io/api/roles/${this.state.selectedRoleId}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            const data = await response.json();
            if (data.success) {
                this.showToast('Role deleted successfully', 'success');
                this.closeModals();
                this.loadRoles();
            } else {
                throw new Error(data.message || 'Failed to delete role');
            }
        } catch (error) {
            console.error('Error deleting role:', error);
            this.showToast(error.message || 'Error deleting role', 'error');
        }
    },

    // UI Rendering
    renderRoles() {
        const tableBody = document.getElementById('rpRolesTableBody');
        if (!tableBody) return;

        tableBody.innerHTML = '';
        this.state.roles.forEach(role => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${role.name}</td>
                <td>${role.description || '-'}</td>
                <td>${role.userCount || 0}</td>
                <td>
                    <span class="rp-status-badge ${role.isSystem ? 'system' : 'custom'}">
                        ${role.isSystem ? 'System' : 'Custom'}
                    </span>
                </td>
                <td>
                    <span class="rp-status-badge ${role.status === 'active' ? 'active' : 'inactive'}">
                        ${role.status === 'active' ? 'Active' : 'Inactive'}
                    </span>
                </td>
                <td>${new Date(role.updatedAt || role.createdAt).toLocaleDateString()}</td>
                <td>
                    <div class="rp-action-buttons">
                        ${!role.isSystem ? `
                            <button class="rp-action-btn edit" onclick="RolesPermissions.editRole('${role._id}')">
                                <i class="fas fa-edit"></i>
                            </button>
                            <button class="rp-action-btn delete" onclick="RolesPermissions.confirmDelete('${role._id}')">
                                <i class="fas fa-trash"></i>
                            </button>
                        ` : '-'}
                    </div>
                </td>
            `;
            tableBody.appendChild(row);
        });
    },

    updatePagination() {
        const totalPages = Math.ceil(this.state.totalItems / this.state.itemsPerPage);
        const startRange = ((this.state.currentPage - 1) * this.state.itemsPerPage) + 1;
        const endRange = Math.min(startRange + this.state.itemsPerPage - 1, this.state.totalItems);

        // Update range display
        document.getElementById('rpStartRange').textContent = startRange;
        document.getElementById('rpEndRange').textContent = endRange;
        document.getElementById('rpTotalItems').textContent = this.state.totalItems;

        // Update pagination buttons
        document.getElementById('rpPrevPage').disabled = this.state.currentPage === 1;
        document.getElementById('rpNextPage').disabled = this.state.currentPage === totalPages;

        // Render page numbers
        this.renderPageNumbers(totalPages);
    },

    renderPageNumbers(totalPages) {
        const pageNumbers = document.getElementById('rpPageNumbers');
        pageNumbers.innerHTML = '';

        let startPage = Math.max(1, this.state.currentPage - 2);
        let endPage = Math.min(totalPages, startPage + 4);

        if (endPage - startPage < 4) {
            startPage = Math.max(1, endPage - 4);
        }

        for (let i = startPage; i <= endPage; i++) {
            const button = document.createElement('button');
            button.className = `rp-page-btn ${i === this.state.currentPage ? 'active' : ''}`;
            button.textContent = i;
            button.onclick = () => {
                this.state.currentPage = i;
                this.loadRoles();
            };
            pageNumbers.appendChild(button);
        }
    },

    updateStats() {
        const totalRoles = this.state.totalItems;
        const activeRoles = this.state.roles.filter(role => role.status === 'active').length;
        const customRoles = this.state.roles.filter(role => !role.isSystem).length;

        document.getElementById('rpTotalRoles').textContent = totalRoles;
        document.getElementById('rpActiveRoles').textContent = activeRoles;
        document.getElementById('rpCustomRoles').textContent = customRoles;
    },

    setupPermissionsUI() {
        const container = document.getElementById('rpPermissionsContainer');
        if (!container) return;

        container.innerHTML = '';
        Object.entries(this.state.permissions).forEach(([category, permissions]) => {
            const categoryDiv = document.createElement('div');
            categoryDiv.className = 'rp-permission-category';
            categoryDiv.innerHTML = `
                <div class="rp-category-header">
                    <div class="rp-category-title">
                        <i class="fas fa-folder"></i>
                        ${category}
                    </div>
                    <div class="rp-category-toggle">
                        <input type="checkbox" class="rp-category-checkbox" id="rp${category.replace(/\s+/g, '')}">
                        <label for="rp${category.replace(/\s+/g, '')}">Select All</label>
                    </div>
                </div>
                <div class="rp-permission-list">
                    ${permissions.map(perm => `
                        <div class="rp-permission-item">
                            <input type="checkbox" 
                                id="rp${perm.id}" 
                                name="permissions" 
                                value="${perm.id}">
                            <label for="rp${perm.id}">${perm.name}</label>
                        </div>
                    `).join('')}
                </div>
            `;
            container.appendChild(categoryDiv);

            // Add category toggle functionality
            const categoryCheckbox = categoryDiv.querySelector('.rp-category-checkbox');
            const permissionCheckboxes = categoryDiv.querySelectorAll('.rp-permission-item input');
            
            categoryCheckbox.addEventListener('change', (e) => {
                permissionCheckboxes.forEach(checkbox => {
                    checkbox.checked = e.target.checked;
                });
            });

            // Update category checkbox when individual permissions change
            permissionCheckboxes.forEach(checkbox => {
                checkbox.addEventListener('change', () => {
                    categoryCheckbox.checked = Array.from(permissionCheckboxes)
                        .every(cb => cb.checked);
                });
            });
        });
    },

    // Modal Management
    openCreateRoleModal() {
        this.state.selectedRoleId = null;
        document.getElementById('rpModalTitle').textContent = 'Create New Role';
        document.getElementById('rpRoleForm').reset();
        document.getElementById('rpRoleModal').classList.add('show');
    },

    editRole(roleId) {
        const role = this.state.roles.find(r => r._id === roleId);
        if (!role) return;

        this.state.selectedRoleId = roleId;
        document.getElementById('rpModalTitle').textContent = 'Edit Role';
        document.getElementById('rpRoleName').value = role.name;
        document.getElementById('rpRoleDescription').value = role.description || '';
        document.getElementById('rpRoleStatus').checked = role.status === 'active';
        
        // Set permissions
        document.querySelectorAll('.rp-permission-item input').forEach(checkbox => {
            checkbox.checked = role.permissions?.includes(checkbox.value);
        });

        document.getElementById('rpRoleModal').classList.add('show');
    },

    confirmDelete(roleId) {
        this.state.selectedRoleId = roleId;
        document.getElementById('rpDeleteModal').classList.add('show');
    },

    closeModals() {
        document.getElementById('rpRoleModal').classList.remove('show');
        document.getElementById('rpDeleteModal').classList.remove('show');
        this.state.selectedRoleId = null;
    },

    // Utility Functions
    getRoleFormData() {
        return {
            name: document.getElementById('rpRoleName').value,
            description: document.getElementById('rpRoleDescription').value,
            status: document.getElementById('rpRoleStatus').checked ? 'active' : 'inactive',
            permissions: Array.from(document.querySelectorAll('.rp-permission-item input:checked'))
                .map(input => input.value)
        };
    },

    validateRoleData(data) {
        if (!data.name.trim()) {
            this.showToast('Role name is required', 'error');
            return false;
        }
        if (data.name.length < 3) {
            this.showToast('Role name must be at least 3 characters', 'error');
            return false;
        }
        return true;
    },

    showToast(message, type = 'success') {
        const toast = document.createElement('div');
        toast.className = `rp-toast ${type}`;
        toast.innerHTML = `
            <i class="fas fa-${type === 'success' ? 'check-circle' : 'exclamation-circle'}"></i>
            <span>${message}</span>
        `;

        const container = document.getElementById('rpToastContainer');
        container.appendChild(toast);

        setTimeout(() => {
            toast.remove();
        }, 3000);
    }
};


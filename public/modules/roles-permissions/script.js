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
                'view_dashboard',
                'view_analytics',
                'export_reports',
                'manage_widgets'
            ],
            'User Management': [
                'create_users',
                'edit_users',
                'delete_users',
                'view_users',
                'manage_user_status',
                'manage_2fa',
                'assign_roles'
            ],
            'System Settings': [
                'view_settings',
                'edit_settings',
                'manage_backups',
                'view_logs',
                'manage_integrations',
                'manage_api_keys'
            ]
        }
    },

    // Initialize module
    init() {
        this.attachEventListeners();
        this.loadRoles();
        this.updateStats();
    },

    // Event Listeners
    attachEventListeners() {
        // Create Role Button
        document.getElementById('rpCreateRoleBtn').addEventListener('click', () => {
            this.openRoleModal();
        });

        // Search Input
        document.getElementById('rpSearchInput').addEventListener('input', (e) => {
            this.state.searchTerm = e.target.value;
            this.state.currentPage = 1;
            this.loadRoles();
        });

        // Filters
        document.getElementById('rpStatusFilter').addEventListener('change', (e) => {
            this.state.statusFilter = e.target.value;
            this.state.currentPage = 1;
            this.loadRoles();
        });

        document.getElementById('rpTypeFilter').addEventListener('change', (e) => {
            this.state.typeFilter = e.target.value;
            this.state.currentPage = 1;
            this.loadRoles();
        });

        // Modal Close Buttons
        document.getElementById('rpCloseModal').addEventListener('click', () => {
            this.closeRoleModal();
        });

        document.getElementById('rpCancelBtn').addEventListener('click', () => {
            this.closeRoleModal();
        });

        // Save Role Button
        document.getElementById('rpSaveBtn').addEventListener('click', () => {
            this.saveRole();
        });

        // Delete Modal Buttons
        document.getElementById('rpCloseDeleteModal').addEventListener('click', () => {
            this.closeDeleteModal();
        });

        document.getElementById('rpCancelDeleteBtn').addEventListener('click', () => {
            this.closeDeleteModal();
        });

        document.getElementById('rpConfirmDeleteBtn').addEventListener('click', () => {
            this.deleteRole();
        });

        // Category Checkboxes
        document.querySelectorAll('.rp-category-checkbox').forEach(checkbox => {
            checkbox.addEventListener('change', (e) => {
                const category = e.target.closest('.rp-permission-category');
                const permissions = category.querySelectorAll('.rp-permission-item input');
                permissions.forEach(perm => {
                    perm.checked = e.target.checked;
                });
            });
        });

        // Pagination
        document.getElementById('rpPrevPage').addEventListener('click', () => {
            if (this.state.currentPage > 1) {
                this.state.currentPage--;
                this.loadRoles();
            }
        });

        document.getElementById('rpNextPage').addEventListener('click', () => {
            const maxPages = Math.ceil(this.state.totalItems / this.state.itemsPerPage);
            if (this.state.currentPage < maxPages) {
                this.state.currentPage++;
                this.loadRoles();
            }
        });
    },

    // API Calls
    async loadRoles() {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`https://18.215.160.136.nip.io/api/roles?page=${this.state.currentPage}&limit=${this.state.itemsPerPage}&search=${this.state.searchTerm}&status=${this.state.statusFilter}&type=${this.state.typeFilter}&sort=${this.state.sortField}&order=${this.state.sortOrder}`, {
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
                this.showToast('Error loading roles', 'error');
            }
        } catch (error) {
            console.error('Error loading roles:', error);
            this.showToast('Failed to load roles', 'error');
        }
    },

    async saveRole() {
        try {
            const roleData = this.getRoleFormData();
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
                this.closeRoleModal();
                this.loadRoles();
            } else {
                throw new Error(data.message);
            }
        } catch (error) {
            console.error('Error saving role:', error);
            this.showToast(error.message || 'Failed to save role', 'error');
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
                this.closeDeleteModal();
                this.loadRoles();
            } else {
                throw new Error(data.message);
            }
        } catch (error) {
            console.error('Error deleting role:', error);
            this.showToast(error.message || 'Failed to delete role', 'error');
        }
    },

    // UI Rendering
    renderRoles() {
        const tableBody = document.getElementById('rpRolesTableBody');
        tableBody.innerHTML = '';

        this.state.roles.forEach(role => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>
                    <div class="rp-role-name">
                        <span>${role.name}</span>
                    </div>
                </td>
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

        document.getElementById('rpStartRange').textContent = startRange;
        document.getElementById('rpEndRange').textContent = endRange;
        document.getElementById('rpTotalItems').textContent = this.state.totalItems;

        document.getElementById('rpPrevPage').disabled = this.state.currentPage === 1;
        document.getElementById('rpNextPage').disabled = this.state.currentPage === totalPages;

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
        document.getElementById('rpTotalRoles').textContent = this.state.totalItems;
        const activeRoles = this.state.roles.filter(role => role.status === 'active').length;
        const customRoles = this.state.roles.filter(role => !role.isSystem).length;
        
        document.getElementById('rpActiveRoles').textContent = activeRoles;
        document.getElementById('rpCustomRoles').textContent = customRoles;
    },

    // Modal Management
    openRoleModal(roleId = null) {
        this.state.selectedRoleId = roleId;
        document.getElementById('rpModalTitle').textContent = roleId ? 'Edit Role' : 'Create New Role';
        document.getElementById('rpRoleForm').reset();
        
        if (roleId) {
            const role = this.state.roles.find(r => r._id === roleId);
            if (role) {
                document.getElementById('rpRoleName').value = role.name;
                document.getElementById('rpRoleDescription').value = role.description || '';
                document.getElementById('rpRoleStatus').checked = role.status === 'active';
                this.setPermissions(role.permissions);
            }
        }

        document.getElementById('rpRoleModal').classList.add('show');
    },

    closeRoleModal() {
        document.getElementById('rpRoleModal').classList.remove('show');
        this.state.selectedRoleId = null;
    },

    confirmDelete(roleId) {
        this.state.selectedRoleId = roleId;
        document.getElementById('rpDeleteModal').classList.add('show');
    },

    closeDeleteModal() {
        document.getElementById('rpDeleteModal').classList.remove('show');
        this.state.selectedRoleId = null;
    },

    // Utility Functions
    getRoleFormData() {
        const form = document.getElementById('rpRoleForm');
        const permissions = Array.from(form.querySelectorAll('.rp-permission-item input:checked'))
            .map(input => input.value);

        return {
            name: document.getElementById('rpRoleName').value,
            description: document.getElementById('rpRoleDescription').value,
            status: document.getElementById('rpRoleStatus').checked ? 'active' : 'inactive',
            permissions: permissions
        };
    },

    setPermissions(permissions = []) {
        document.querySelectorAll('.rp-permission-item input').forEach(input => {
            input.checked = permissions.includes(input.value);
        });

        // Update category checkboxes
        document.querySelectorAll('.rp-category-checkbox').forEach(checkbox => {
            const category = checkbox.closest('.rp-permission-category');
            const permInputs = category.querySelectorAll('.rp-permission-item input');
            checkbox.checked = Array.from(permInputs).every(input => input.checked);
        });
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

// Initialize the module
document.addEventListener('DOMContentLoaded', () => {
    RolesPermissions.init();
});

// user-manage.js

class UserManagementSystem {
    constructor() {
        this.currentPage = 1;
        this.itemsPerPage = 10;
        this.totalUsers = 0;
        this.users = [];
        this.filters = {
            search: '',
            role: '',
            status: '',
            department: ''
        };
        this.initializeElements();
    }

    initializeElements() {
        // Search and filter elements
        this.searchInput = document.getElementById('userSearchInput');
        this.roleFilter = document.getElementById('roleFilter');
        this.statusFilter = document.getElementById('statusFilter');
        this.departmentFilter = document.getElementById('departmentFilter');

        // Table and pagination elements
        this.tableBody = document.getElementById('usersTableBody');
        this.paginationControls = document.getElementById('paginationControls');
        this.currentRangeElement = document.getElementById('currentRange');
        this.totalUsersElement = document.getElementById('totalUsers');

        // Modal elements
        this.userModal = document.getElementById('userModal');
        this.deleteModal = document.getElementById('deleteModal');
        this.userForm = document.getElementById('userForm');
        this.addUserBtn = document.getElementById('addUserBtn');

        // Initialize event listeners
        this.initializeEventListeners();
    }

    async initialize() {
        try {
            await this.loadFilters();
            await this.loadUsers();
            this.initializeEventListeners();
        } catch (error) {
            console.error('Failed to initialize User Management System:', error);
            utils.showNotification('Failed to load user management system', 'error');
        }
    }

    initializeEventListeners() {
        // Search and filter listeners
        this.searchInput.addEventListener('input', debounce(() => {
            this.filters.search = this.searchInput.value;
            this.currentPage = 1;
            this.loadUsers();
        }, 300));

        [this.roleFilter, this.statusFilter, this.departmentFilter].forEach(filter => {
            filter.addEventListener('change', () => {
                this.filters[filter.id.replace('Filter', '')] = filter.value;
                this.currentPage = 1;
                this.loadUsers();
            });
        });

        // Add user button
        this.addUserBtn.addEventListener('click', () => this.showUserModal());

        // Modal form submission
        this.userForm.addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleUserFormSubmit();
        });

        // Close modal buttons
        document.querySelectorAll('.close-modal').forEach(button => {
            button.addEventListener('click', () => {
                this.userModal.style.display = 'none';
                this.deleteModal.style.display = 'none';
            });
        });
    }

    async loadFilters() {
        try {
            // Load roles for filter
            const rolesResponse = await utils.fetchWithAuth('/roles');
            if (rolesResponse.success) {
                this.populateSelect(this.roleFilter, rolesResponse.roles, 'name');
            }

            // Load departments
            const departments = ['IT', 'HR', 'Finance', 'Marketing', 'Operations']; // Replace with API call
            this.populateSelect(this.departmentFilter, departments.map(d => ({ name: d })), 'name');

        } catch (error) {
            console.error('Error loading filters:', error);
            utils.showNotification('Failed to load filters', 'error');
        }
    }

    populateSelect(selectElement, items, valueKey) {
        const currentValue = selectElement.value;
        selectElement.innerHTML = `<option value="">All ${selectElement.id.replace('Filter', 's')}</option>`;
        items.forEach(item => {
            const option = document.createElement('option');
            option.value = item[valueKey];
            option.textContent = item[valueKey];
            selectElement.appendChild(option);
        });
        selectElement.value = currentValue;
    }

    async loadUsers() {
        try {
            const queryParams = new URLSearchParams({
                page: this.currentPage,
                limit: this.itemsPerPage,
                ...this.filters
            });

            const response = await utils.fetchWithAuth(`/users?${queryParams}`);
            if (response.success) {
                this.users = response.users;
                this.totalUsers = response.pagination.total;
                this.renderUsers();
                this.updatePagination(response.pagination);
            }
        } catch (error) {
            console.error('Error loading users:', error);
            utils.showNotification('Failed to load users', 'error');
        }
    }

    renderUsers() {
        this.tableBody.innerHTML = '';
        this.users.forEach(user => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>
                    <div class="user-info">
                        <div class="user-avatar">${this.getInitials(user.name || user.email)}</div>
                        <div class="user-name">${user.name || 'N/A'}</div>
                    </div>
                </td>
                <td>${user.email}</td>
                <td>${user.department || 'N/A'}</td>
                <td><span class="role-badge">${user.role}</span></td>
                <td>
                    <span class="status-badge status-${user.status}">
                        ${user.status}
                    </span>
                </td>
                <td>
                    <label class="switch">
                        <input type="checkbox" ${user.requires2FA ? 'checked' : ''} 
                            onchange="userManagement.toggle2FA('${user._id}', this.checked)">
                        <span class="slider round"></span>
                    </label>
                </td>
                <td>
                    <div class="action-buttons">
                        <button class="btn-icon btn-edit" onclick="userManagement.editUser('${user._id}')">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn-icon btn-delete" onclick="userManagement.showDeleteModal('${user._id}')">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </td>
            `;
            this.tableBody.appendChild(row);
        });
    }

    updatePagination(pagination) {
        const { total, page, pages } = pagination;
        this.currentRangeElement.textContent = 
            `${(page - 1) * this.itemsPerPage + 1}-${Math.min(page * this.itemsPerPage, total)}`;
        this.totalUsersElement.textContent = total;

        this.paginationControls.innerHTML = '';
        if (pages > 1) {
            // Previous button
            this.addPaginationButton('Previous', page > 1, () => this.changePage(page - 1));

            // Page numbers
            for (let i = 1; i <= pages; i++) {
                this.addPaginationButton(i.toString(), true, () => this.changePage(i), i === page);
            }

            // Next button
            this.addPaginationButton('Next', page < pages, () => this.changePage(page + 1));
        }
    }

    addPaginationButton(text, enabled, onClick, isActive = false) {
        const button = document.createElement('button');
        button.className = `pagination-button ${isActive ? 'active' : ''} ${!enabled ? 'disabled' : ''}`;
        button.textContent = text;
        if (enabled) {
            button.addEventListener('click', onClick);
        }
        this.paginationControls.appendChild(button);
    }

    async showUserModal(userId = null) {
        const modalTitle = document.getElementById('modalTitle');
        const form = document.getElementById('userForm');
        
        if (userId) {
            modalTitle.textContent = 'Edit User';
            const user = this.users.find(u => u._id === userId);
            if (user) {
                form.elements.userName.value = user.name || '';
                form.elements.userEmail.value = user.email;
                form.elements.userDepartment.value = user.department || '';
                form.elements.userRole.value = user.role;
                form.elements.user2FA.checked = user.requires2FA;
            }
        } else {
            modalTitle.textContent = 'Add New User';
            form.reset();
        }

        this.userModal.style.display = 'block';
    }

    async handleUserFormSubmit() {
        try {
            const formData = {
                name: this.userForm.elements.userName.value,
                email: this.userForm.elements.userEmail.value,
                department: this.userForm.elements.userDepartment.value,
                role: this.userForm.elements.userRole.value,
                requires2FA: this.userForm.elements.user2FA.checked
            };

            const response = await utils.fetchWithAuth('/users', {
                method: 'POST',
                body: JSON.stringify(formData)
            });

            if (response.success) {
                utils.showNotification('User created successfully');
                this.userModal.style.display = 'none';
                this.loadUsers();
            }
        } catch (error) {
            console.error('Error creating user:', error);
            utils.showNotification('Failed to create user', 'error');
        }
    }

    async toggle2FA(userId, enabled) {
        try {
            const response = await utils.fetchWithAuth(`/users/${userId}/2fa`, {
                method: 'PUT',
                body: JSON.stringify({ requires2FA: enabled })
            });

            if (response.success) {
                utils.showNotification(`2FA ${enabled ? 'enabled' : 'disabled'} successfully`);
            }
        } catch (error) {
            console.error('Error toggling 2FA:', error);
            utils.showNotification('Failed to update 2FA settings', 'error');
        }
    }

    async showDeleteModal(userId) {
        this.deleteModal.style.display = 'block';
        const confirmDeleteBtn = document.getElementById('confirmDeleteBtn');
        
        confirmDeleteBtn.onclick = async () => {
            const reason = document.getElementById('deleteReason').value;
            if (!reason) {
                utils.showNotification('Please provide a reason for deletion', 'error');
                return;
            }

            try {
                const response = await utils.fetchWithAuth(`/users/${userId}`, {
                    method: 'DELETE',
                    body: JSON.stringify({ reason })
                });

                if (response.success) {
                    utils.showNotification('User deleted successfully');
                    this.deleteModal.style.display = 'none';
                    this.loadUsers();
                }
            } catch (error) {
                console.error('Error deleting user:', error);
                utils.showNotification('Failed to delete user', 'error');
            }
        };
    }

    getInitials(name) {
        return name
            .split(' ')
            .map(word => word[0])
            .join('')
            .toUpperCase()
            .slice(0, 2);
    }
}

// Utility function for debouncing
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

// Initialize the User Management System
let userManagement;
document.addEventListener('DOMContentLoaded', () => {
    userManagement = new UserManagementSystem();
});

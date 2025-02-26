// public/js/rbac/rbac-manager.js
window.RBAC = window.RBAC || {};

window.RBAC.manager = {
    currentRole: null,
    currentPermissions: new Set(),
    initialized: false,

    async initialize() {
        try {
            const token = localStorage.getItem('token');
            if (!token) return false;

            const payload = this.decodeToken(token);
            this.currentRole = payload.role?.toUpperCase() || 'USER';
            this.setPermissions();
            this.initialized = true;

            return true;
        } catch (error) {
            console.error('RBAC initialization failed:', error);
            return false;
        }
    },

    decodeToken(token) {
        try {
            const base64Url = token.split('.')[1];
            const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
            return JSON.parse(window.atob(base64));
        } catch (error) {
            console.error('Token decode failed:', error);
            return {};
        }
    },

    setPermissions() {
        const roleConfig = window.RBAC.CONFIG.ROLES[this.currentRole];
        if (!roleConfig) return;

        this.currentPermissions.clear();
        
        if (roleConfig.permissions.includes('*')) {
            Object.values(window.RBAC.CONFIG.PERMISSIONS).forEach(group => {
                Object.values(group).forEach(permission => {
                    this.currentPermissions.add(permission);
                });
            });
        } else {
            roleConfig.permissions.forEach(permission => {
                this.currentPermissions.add(permission);
            });
        }
    },

    hasPermission(permission) {
        if (!this.initialized) return true;
        if (this.currentRole === 'SUPER_ADMIN') return true;
        return this.currentPermissions.has(permission);
    },

    hasAnyPermission(permissions) {
        return permissions.some(permission => this.hasPermission(permission));
    },

    hasAllPermissions(permissions) {
        return permissions.every(permission => this.hasPermission(permission));
    },

    getCurrentRole() {
        return this.currentRole;
    }
};

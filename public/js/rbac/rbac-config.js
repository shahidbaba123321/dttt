// public/js/rbac/rbac-config.js
window.RBAC = window.RBAC || {};

window.RBAC.CONFIG = {
    PERMISSIONS: {
        USERS: {
            VIEW: 'users:view',
            CREATE: 'users:create',
            EDIT: 'users:edit',
            DELETE: 'users:delete',
            MANAGE_ROLES: 'users:manage-roles'
        },
        SECURITY: {
            MANAGE_2FA: 'security:manage-2fa',
            MANAGE_SETTINGS: 'security:manage-settings'
        }
    },

    ROLES: {
        SUPER_ADMIN: {
            name: 'Super Admin',
            description: 'Full system access',
            permissions: ['*']
        },
        ADMIN: {
            name: 'Admin',
            description: 'Administrative access',
            permissions: [
                'users:view',
                'users:create',
                'users:edit',
                'users:manage-roles',
                'security:manage-2fa'
            ]
        },
        MANAGER: {
            name: 'Manager',
            description: 'Department management',
            permissions: [
                'users:view',
                'users:create',
                'users:edit'
            ]
        },
        USER: {
            name: 'User',
            description: 'Basic user access',
            permissions: [
                'users:view'
            ]
        }
    }
};

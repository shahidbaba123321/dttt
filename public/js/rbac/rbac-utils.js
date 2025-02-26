// public/js/rbac/rbac-utils.js
const RBACUtils = {
    updateUIBasedOnPermissions() {
        const permissionMap = {
            'add-user-btn': RBAC_CONFIG.PERMISSIONS.USERS.CREATE,
            'edit-user-btn': RBAC_CONFIG.PERMISSIONS.USERS.EDIT,
            'delete-user-btn': RBAC_CONFIG.PERMISSIONS.USERS.DELETE,
            'manage-roles-btn': RBAC_CONFIG.PERMISSIONS.USERS.MANAGE_ROLES,
            '2fa-toggle-btn': RBAC_CONFIG.PERMISSIONS.SECURITY.MANAGE_2FA
        };

        Object.entries(permissionMap).forEach(([className, permission]) => {
            const elements = document.getElementsByClassName(className);
            Array.from(elements).forEach(element => {
                if (!rbacManager.hasPermission(permission)) {
                    element.style.display = 'none';
                }
            });
        });
    }
};

const permissions = {
    checkPermission: (requiredPermission) => {
        const userRole = localStorage.getItem('userRole');
        const rolePermissions = {
            superadmin: ['all'],
            admin: ['manage_users', 'manage_settings', 'view_reports'],
            manager: ['view_reports', 'manage_team'],
            user: ['view_dashboard']
        };

        if (userRole === 'superadmin') return true;
        return rolePermissions[userRole]?.includes(requiredPermission) || false;
    },

    withPermission: (WrappedComponent, requiredPermission) => {
        return (props) => {
            if (!permissions.checkPermission(requiredPermission)) {
                return (
                    <Alert severity="warning">
                        You don't have permission to access this feature.
                    </Alert>
                );
            }
            return <WrappedComponent {...props} />;
        };
    }
};

// First, add this to your existing component destructuring
const {
    // ... existing components
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Switch,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    TextField,
    FormControlLabel,
    Checkbox,
    Alert,
    Tooltip,
    IconButton
} = MaterialUI;

// Add this to your main script
const RolesAndPermissions = () => {
    const [roles, setRoles] = React.useState([]);
    const [loading, setLoading] = React.useState(true);
    const [openDialog, setOpenDialog] = React.useState(false);
    const [selectedRole, setSelectedRole] = React.useState(null);
    const [newRoleData, setNewRoleData] = React.useState({
        name: '',
        description: '',
        permissions: {}
    });

    // Permission categories
    const permissionCategories = {
        ui_access: {
            title: 'UI Access',
            permissions: {
                dashboard_view: 'View Dashboard',
                companies_view: 'View Companies',
                settings_view: 'View Settings',
                modules_view: 'View Modules',
                users_view: 'View Users',
                tools_view: 'View Tools',
                support_view: 'View Support'
            }
        },
        user_management: {
            title: 'User Management',
            permissions: {
                users_create: 'Create Users',
                users_edit: 'Edit Users',
                users_delete: 'Delete Users',
                users_activate: 'Activate/Deactivate Users',
                users_2fa: 'Manage 2FA',
                roles_manage: 'Manage Roles'
            }
        },
        data_access: {
            title: 'Data Access',
            permissions: {
                view_sensitive: 'View Sensitive Data',
                export_data: 'Export Data',
                audit_logs: 'View Audit Logs',
                api_access: 'API Access'
            }
        }
    };

    React.useEffect(() => {
        fetchRoles();
    }, []);

    const fetchRoles = async () => {
        try {
            const response = await fetch('https://18.215.160.136.nip.io/api/roles', {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });
            const data = await response.json();
            setRoles(data.roles);
        } catch (error) {
            showNotification('Failed to fetch roles', 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleCreateRole = async () => {
        try {
            const response = await fetch('https://18.215.160.136.nip.io/api/roles', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(newRoleData)
            });
            
            if (!response.ok) throw new Error('Failed to create role');
            
            showNotification('Role created successfully', 'success');
            setOpenDialog(false);
            fetchRoles();
        } catch (error) {
            showNotification(error.message, 'error');
        }
    };

    const handleUpdatePermissions = async (roleId, permissions) => {
        try {
            const response = await fetch(`https://18.215.160.136.nip.io/api/roles/${roleId}/permissions`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ permissions })
            });
            
            if (!response.ok) throw new Error('Failed to update permissions');
            
            showNotification('Permissions updated successfully', 'success');
            fetchRoles();
        } catch (error) {
            showNotification(error.message, 'error');
        }
    };

    const RoleDialog = () => (
        <Dialog open={openDialog} onClose={() => setOpenDialog(false)} maxWidth="md" fullWidth>
            <DialogTitle>
                {selectedRole ? 'Edit Role' : 'Create New Role'}
            </DialogTitle>
            <DialogContent>
                <TextField
                    fullWidth
                    label="Role Name"
                    value={newRoleData.name}
                    onChange={(e) => setNewRoleData({ ...newRoleData, name: e.target.value })}
                    margin="normal"
                />
                <TextField
                    fullWidth
                    label="Description"
                    value={newRoleData.description}
                    onChange={(e) => setNewRoleData({ ...newRoleData, description: e.target.value })}
                    margin="normal"
                    multiline
                    rows={2}
                />
                
                {Object.entries(permissionCategories).map(([category, { title, permissions }]) => (
                    <Box key={category} sx={{ mt: 3 }}>
                        <Typography variant="h6" gutterBottom>{title}</Typography>
                        <Grid container spacing={2}>
                            {Object.entries(permissions).map(([key, label]) => (
                                <Grid item xs={6} key={key}>
                                    <FormControlLabel
                                        control={
                                            <Checkbox
                                                checked={newRoleData.permissions[key] || false}
                                                onChange={(e) => setNewRoleData({
                                                    ...newRoleData,
                                                    permissions: {
                                                        ...newRoleData.permissions,
                                                        [key]: e.target.checked
                                                    }
                                                })}
                                            />
                                        }
                                        label={label}
                                    />
                                </Grid>
                            ))}
                        </Grid>
                    </Box>
                ))}
            </DialogContent>
            <DialogActions>
                <Button onClick={() => setOpenDialog(false)}>Cancel</Button>
                <Button 
                    onClick={handleCreateRole} 
                    variant="contained" 
                    color="primary"
                >
                    {selectedRole ? 'Update' : 'Create'}
                </Button>
            </DialogActions>
        </Dialog>
    );

    if (loading) {
        return <CircularProgress />;
    }

    return (
        <Box sx={{ p: 3 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                <Typography variant="h4">Roles & Permissions</Typography>
                <Button
                    variant="contained"
                    startIcon={<span className="material-icons">add</span>}
                    onClick={() => {
                        setSelectedRole(null);
                        setNewRoleData({ name: '', description: '', permissions: {} });
                        setOpenDialog(true);
                    }}
                >
                    Create New Role
                </Button>
            </Box>

            <TableContainer component={Paper}>
                <Table>
                    <TableHead>
                        <TableRow>
                            <TableCell>Role Name</TableCell>
                            <TableCell>Description</TableCell>
                            <TableCell>Users</TableCell>
                            <TableCell>Permissions</TableCell>
                            <TableCell>Actions</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {/* Superadmin Role - Fixed */}
                        <TableRow>
                            <TableCell>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                    <span className="material-icons" style={{ color: '#4F46E5' }}>
                                        security
                                    </span>
                                    Superadmin
                                </Box>
                            </TableCell>
                            <TableCell>Full system access with no restrictions</TableCell>
                            <TableCell>1</TableCell>
                            <TableCell>All Permissions</TableCell>
                            <TableCell>
                                <Tooltip title="Superadmin role cannot be modified">
                                    <span>
                                        <IconButton disabled>
                                            <span className="material-icons">edit</span>
                                        </IconButton>
                                    </span>
                                </Tooltip>
                            </TableCell>
                        </TableRow>

                        {/* Dynamic Roles */}
                        {roles.map((role) => (
                            <TableRow key={role._id}>
                                <TableCell>{role.name}</TableCell>
                                <TableCell>{role.description}</TableCell>
                                <TableCell>{role.userCount || 0}</TableCell>
                                <TableCell>
                                    <Button
                                        size="small"
                                        onClick={() => {
                                            setSelectedRole(role);
                                            setNewRoleData({
                                                name: role.name,
                                                description: role.description,
                                                permissions: role.permissions
                                            });
                                            setOpenDialog(true);
                                        }}
                                    >
                                        View Permissions
                                    </Button>
                                </TableCell>
                                <TableCell>
                                    <IconButton onClick={() => {
                                        setSelectedRole(role);
                                        setNewRoleData({
                                            name: role.name,
                                            description: role.description,
                                            permissions: role.permissions
                                        });
                                        setOpenDialog(true);
                                    }}>
                                        <span className="material-icons">edit</span>
                                    </IconButton>
                                    <IconButton 
                                        color="error"
                                        onClick={() => handleDeleteRole(role._id)}
                                    >
                                        <span className="material-icons">delete</span>
                                    </IconButton>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </TableContainer>

            <RoleDialog />
        </Box>
    );
};

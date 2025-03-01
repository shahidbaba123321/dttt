const { 
    DataGrid,
    Button,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    TextField,
    MenuItem,
    IconButton,
    Tooltip
} = MaterialUI;

const Users = () => {
    const [users, setUsers] = React.useState([]);
    const [loading, setLoading] = React.useState(true);
    const [openDialog, setOpenDialog] = React.useState(false);
    const [selectedUser, setSelectedUser] = React.useState(null);
    const [formData, setFormData] = React.useState({
        name: '',
        email: '',
        role: '',
        department: ''
    });

    const columns = [
        { field: 'name', headerName: 'Name', flex: 1 },
        { field: 'email', headerName: 'Email', flex: 1 },
        { field: 'role', headerName: 'Role', flex: 1 },
        { field: 'department', headerName: 'Department', flex: 1 },
        { field: 'status', headerName: 'Status', flex: 1,
            renderCell: (params) => (
                <Chip 
                    label={params.value}
                    color={params.value === 'active' ? 'success' : 'default'}
                />
            )
        },
        { field: 'actions', headerName: 'Actions', flex: 1,
            renderCell: (params) => (
                <div>
                    <Tooltip title="Edit">
                        <IconButton onClick={() => handleEdit(params.row)}>
                            <span className="material-icons">edit</span>
                        </IconButton>
                    </Tooltip>
                    <Tooltip title="Delete">
                        <IconButton onClick={() => handleDelete(params.row.id)}>
                            <span className="material-icons">delete</span>
                        </IconButton>
                    </Tooltip>
                </div>
            )
        }
    ];

    React.useEffect(() => {
        fetchUsers();
    }, []);

    const fetchUsers = async () => {
        try {
            const response = await api.authenticatedRequest('/users');
            setUsers(response.users);
        } catch (error) {
            console.error('Error fetching users:', error);
            showNotification('Failed to fetch users', 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleEdit = (user) => {
        setSelectedUser(user);
        setFormData({
            name: user.name,
            email: user.email,
            role: user.role,
            department: user.department
        });
        setOpenDialog(true);
    };

    const handleDelete = async (userId) => {
        if (window.confirm('Are you sure you want to delete this user?')) {
            try {
                await api.authenticatedRequest(`/users/${userId}`, 'DELETE');
                fetchUsers();
                showNotification('User deleted successfully', 'success');
            } catch (error) {
                console.error('Error deleting user:', error);
                showNotification('Failed to delete user', 'error');
            }
        }
    };

    const handleSubmit = async () => {
        try {
            if (selectedUser) {
                await api.authenticatedRequest(`/users/${selectedUser.id}`, 'PUT', formData);
                showNotification('User updated successfully', 'success');
            } else {
                await api.authenticatedRequest('/users', 'POST', formData);
                showNotification('User created successfully', 'success');
            }
            setOpenDialog(false);
            fetchUsers();
        } catch (error) {
            console.error('Error saving user:', error);
            showNotification('Failed to save user', 'error');
        }
    };

    return (
        <div>
            <Typography variant="h4" gutterBottom>
                User Management
            </Typography>

            <Button
                variant="contained"
                color="primary"
                startIcon={<span className="material-icons">add</span>}
                onClick={() => {
                    setSelectedUser(null);
                    setFormData({
                        name: '',
                        email: '',
                        role: '',
                        department: ''
                    });
                    setOpenDialog(true);
                }}
                sx={{ mb: 3 }}
            >
                Add New User
            </Button>

            <div style={{ height: 600, width: '100%' }}>
                <DataGrid
                    rows={users}
                    columns={columns}
                    pageSize={10}
                    rowsPerPageOptions={[10, 25, 50]}
                    checkboxSelection
                    disableSelectionOnClick
                    loading={loading}
                />
            </div>

            <Dialog open={openDialog} onClose={() => setOpenDialog(false)}>
                <DialogTitle>
                    {selectedUser ? 'Edit User' : 'Add New User'}
                </DialogTitle>
                <DialogContent>
                    <TextField
                        fullWidth
                        label="Name"
                        value={formData.name}
                        onChange={(e) => setFormData({...formData, name: e.target.value})}
                        margin="normal"
                    />
                    <TextField
                        fullWidth
                        label="Email"
                        value={formData.email}
                        onChange={(e) => setFormData({...formData, email: e.target.value})}
                        margin="normal"
                    />
                    <TextField
                        fullWidth
                        select
                        label="Role"
                        value={formData.role}
                        onChange={(e) => setFormData({...formData, role: e.target.value})}
                        margin="normal"
                    >
                        <MenuItem value="admin">Admin</MenuItem>
                        <MenuItem value="user">User</MenuItem>
                        <MenuItem value="manager">Manager</MenuItem>
                    </TextField>
                    <TextField
                        fullWidth
                        label="Department"
                        value={formData.department}
                        onChange={(e) => setFormData({...formData, department: e.target.value})}
                        margin="normal"
                    />
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setOpenDialog(false)}>Cancel</Button>
                    <Button onClick={handleSubmit} variant="contained" color="primary">
                        {selectedUser ? 'Update' : 'Create'}
                    </Button>
                </DialogActions>
            </Dialog>
        </div>
    );
};

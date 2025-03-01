const { 
    AppBar, 
    Toolbar, 
    IconButton, 
    Typography, 
    Menu, 
    MenuItem, 
    Avatar, 
    Badge 
} = MaterialUI;

const Header = () => {
    const [anchorEl, setAnchorEl] = React.useState(null);
    const [notifications, setNotifications] = React.useState([]);
    const userName = localStorage.getItem('userName');
    const userEmail = localStorage.getItem('userEmail');

    const handleMenu = (event) => {
        setAnchorEl(event.currentTarget);
    };

    const handleClose = () => {
        setAnchorEl(null);
    };

    const handleLogout = () => {
        localStorage.clear();
        window.location.href = '/login.html';
    };

    const handleProfile = () => {
        // Navigate to profile page
        window.location.href = '/dashboard/profile';
    };

    return (
        <AppBar position="fixed" sx={{ zIndex: (theme) => theme.zIndex.drawer + 1 }}>
            <Toolbar>
                <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
                    WorkWise Pro
                </Typography>

                {/* Notifications */}
                <IconButton color="inherit" sx={{ mr: 2 }}>
                    <Badge badgeContent={notifications.length} color="error">
                        <span className="material-icons">notifications</span>
                    </Badge>
                </IconButton>

                {/* User Menu */}
                <div>
                    <IconButton
                        onClick={handleMenu}
                        sx={{ p: 0 }}
                    >
                        <Avatar sx={{ bgcolor: 'secondary.main' }}>
                            {userName?.charAt(0) || userEmail?.charAt(0)}
                        </Avatar>
                    </IconButton>
                    <Menu
                        anchorEl={anchorEl}
                        open={Boolean(anchorEl)}
                        onClose={handleClose}
                    >
                        <MenuItem onClick={handleProfile}>
                            <span className="material-icons" style={{ marginRight: '8px' }}>
                                account_circle
                            </span>
                            My Profile
                        </MenuItem>
                        <MenuItem onClick={handleLogout}>
                            <span className="material-icons" style={{ marginRight: '8px' }}>
                                logout
                            </span>
                            Logout
                        </MenuItem>
                    </Menu>
                </div>
            </Toolbar>
        </AppBar>
    );
};

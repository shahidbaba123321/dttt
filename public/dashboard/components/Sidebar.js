const { 
    Drawer, 
    List, 
    ListItem, 
    ListItemIcon, 
    ListItemText, 
    Collapse 
} = MaterialUI;

const Sidebar = () => {
    const [open, setOpen] = React.useState({});
    const navigate = ReactRouterDOM.useNavigate();

    const menuItems = [
        {
            title: 'Dashboard Overview',
            icon: 'dashboard',
            path: '/dashboard'
        },
        {
            title: 'Companies/Organizations',
            icon: 'business',
            path: '/companies'
        },
        {
            title: 'System Settings',
            icon: 'settings',
            children: [
                { title: 'General Settings', path: '/settings/general' },
                { title: 'Pricing & Plans', path: '/settings/pricing' },
                { title: 'Security Settings', path: '/settings/security' }
            ]
        },
        // Add more menu items here
    ];

    return (
        <Drawer
            variant="permanent"
            sx={{
                width: 280,
                flexShrink: 0,
                '& .MuiDrawer-paper': {
                    width: 280,
                    boxSizing: 'border-box',
                    mt: 8
                },
            }}
        >
            <List>
                {menuItems.map((item) => (
                    <React.Fragment key={item.title}>
                        <ListItem 
                            button
                            onClick={() => {
                                if (item.children) {
                                    setOpen(prev => ({
                                        ...prev,
                                        [item.title]: !prev[item.title]
                                    }));
                                } else {
                                    navigate(item.path);
                                }
                            }}
                        >
                            <ListItemIcon>
                                <span className="material-icons">{item.icon}</span>
                            </ListItemIcon>
                            <ListItemText primary={item.title} />
                            {item.children && (
                                <span className="material-icons">
                                    {open[item.title] ? 'expand_less' : 'expand_more'}
                                </span>
                            )}
                        </ListItem>
                        {item.children && (
                            <Collapse in={open[item.title]} timeout="auto" unmountOnExit>
                                <List component="div" disablePadding>
                                    {item.children.map((child) => (
                                        <ListItem
                                            button
                                            key={child.title}
                                            sx={{ pl: 4 }}
                                            onClick={() => navigate(child.path)}
                                        >
                                            <ListItemText primary={child.title} />
                                        </ListItem>
                                    ))}
                                </List>
                            </Collapse>
                        )}
                    </React.Fragment>
                ))}
            </List>
        </Drawer>
    );
};

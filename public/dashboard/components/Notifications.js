const Notifications = () => {
    const [notifications, setNotifications] = React.useState([]);
    const [loading, setLoading] = React.useState(true);

    React.useEffect(() => {
        fetchNotifications();
    }, []);

    const fetchNotifications = async () => {
        try {
            const response = await api.authenticatedRequest('/notifications');
            setNotifications(response.notifications);
        } catch (error) {
            console.error('Error fetching notifications:', error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return <CircularProgress />;
    }

    return (
        <List>
            {notifications.map((notification) => (
                <ListItem key={notification.id}>
                    <ListItemIcon>
                        <span className="material-icons">{notification.icon}</span>
                    </ListItemIcon>
                    <ListItemText
                        primary={notification.message}
                        secondary={new Date(notification.timestamp).toLocaleString()}
                    />
                    <ListItemSecondaryAction>
                        <IconButton edge="end" onClick={() => markAsRead(notification.id)}>
                            <span className="material-icons">done</span>
                        </IconButton>
                    </ListItemSecondaryAction>
                </ListItem>
            ))}
        </List>
    );
};

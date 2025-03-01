const { 
    Grid, 
    Paper, 
    Typography, 
    LinearProgress,
    Card,
    CardContent
} = MaterialUI;

const DashboardCard = ({ title, value, icon, color }) => (
    <Card sx={{ height: '100%' }}>
        <CardContent>
            <Grid container spacing={2} alignItems="center">
                <Grid item>
                    <Avatar sx={{ bgcolor: color }}>
                        <span className="material-icons">{icon}</span>
                    </Avatar>
                </Grid>
                <Grid item xs>
                    <Typography color="textSecondary" variant="h6">
                        {title}
                    </Typography>
                    <Typography variant="h4">
                        {value}
                    </Typography>
                </Grid>
            </Grid>
        </CardContent>
    </Card>
);

const Dashboard = () => {
    const [stats, setStats] = React.useState({
        totalUsers: 0,
        activeCompanies: 0,
        pendingTasks: 0,
        systemHealth: 0
    });
    const [loading, setLoading] = React.useState(true);
    const [error, setError] = React.useState(null);

    React.useEffect(() => {
        fetchDashboardStats();
    }, []);

    const fetchDashboardStats = async () => {
        try {
            const response = await fetch('https://18.215.160.136.nip.io/api/dashboard/stats', {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });
            
            if (!response.ok) throw new Error('Failed to fetch dashboard stats');
            
            const data = await response.json();
            setStats(data);
        } catch (error) {
            setError(error.message);
        } finally {
            setLoading(false);
        }
    };

    if (loading) return <LinearProgress />;
    if (error) return <Typography color="error">{error}</Typography>;

    return (
        <div>
            <Typography variant="h4" gutterBottom>
                Dashboard Overview
            </Typography>

            <Grid container spacing={3}>
                <Grid item xs={12} sm={6} md={3}>
                    <DashboardCard
                        title="Total Users"
                        value={stats.totalUsers}
                        icon="people"
                        color="#4F46E5"
                    />
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                    <DashboardCard
                        title="Active Companies"
                        value={stats.activeCompanies}
                        icon="business"
                        color="#10B981"
                    />
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                    <DashboardCard
                        title="Pending Tasks"
                        value={stats.pendingTasks}
                        icon="assignment"
                        color="#F59E0B"
                    />
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                    <DashboardCard
                        title="System Health"
                        value={`${stats.systemHealth}%`}
                        icon="health_and_safety"
                        color="#EF4444"
                    />
                </Grid>

                {/* Recent Activity */}
                <Grid item xs={12} md={6}>
                    <Paper sx={{ p: 2 }}>
                        <Typography variant="h6" gutterBottom>
                            Recent Activity
                        </Typography>
                        {/* Add activity list component here */}
                    </Paper>
                </Grid>

                {/* Quick Actions */}
                <Grid item xs={12} md={6}>
                    <Paper sx={{ p: 2 }}>
                        <Typography variant="h6" gutterBottom>
                            Quick Actions
                        </Typography>
                        {/* Add quick actions component here */}
                    </Paper>
                </Grid>
            </Grid>
        </div>
    );
};

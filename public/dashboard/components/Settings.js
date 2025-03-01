const { 
    Tabs, 
    Tab, 
    Box, 
    Card, 
    CardContent,
    TextField,
    Switch,
    FormControlLabel,
    Button
} = MaterialUI;

const Settings = () => {
    const [currentTab, setCurrentTab] = React.useState(0);
    const [settings, setSettings] = React.useState({
        companyName: '',
        email: '',
        notifications: true,
        twoFactorAuth: false
    });

    const handleTabChange = (event, newValue) => {
        setCurrentTab(newValue);
    };

    const handleSettingChange = (setting, value) => {
        setSettings(prev => ({
            ...prev,
            [setting]: value
        }));
    };

    const handleSave = async () => {
        try {
            await api.authenticatedRequest('/settings', 'PUT', settings);
            // Show success message
        } catch (error) {
            console.error('Error saving settings:', error);
            // Show error message
        }
    };

    return (
        <div>
            <Typography variant="h4" gutterBottom>
                Settings
            </Typography>

            <Tabs value={currentTab} onChange={handleTabChange}>
                <Tab label="General" />
                <Tab label="Security" />
                <Tab label="Notifications" />
            </Tabs>

            <Box sx={{ mt: 3 }}>
                {currentTab === 0 && (
                    <Card>
                        <CardContent>
                            <Typography variant="h6" gutterBottom>
                                General Settings
                            </Typography>
                            <TextField
                                fullWidth
                                label="Company Name"
                                value={settings.companyName}
                                onChange={(e) => handleSettingChange('companyName', e.target.value)}
                                margin="normal"
                            />
                            <TextField
                                fullWidth
                                label="Email"
                                value={settings.email}
                                onChange={(e) => handleSettingChange('email', e.target.value)}
                                margin="normal"
                            />
                            <Button 
                                variant="contained" 
                                color="primary"
                                onClick={handleSave}
                                sx={{ mt: 2 }}
                            >
                                Save Changes
                            </Button>
                        </CardContent>
                    </Card>
                )}

                {currentTab === 1 && (
                    <Card>
                        <CardContent>
                            <Typography variant="h6" gutterBottom>
                                Security Settings
                            </Typography>
                            <FormControlLabel
                                control={
                                    <Switch
                                        checked={settings.twoFactorAuth}
                                        onChange={(e) => handleSettingChange('twoFactorAuth', e.target.checked)}
                                    />
                                }
                                label="Two-Factor Authentication"
                            />
                        </CardContent>
                    </Card>
                )}

                {currentTab === 2 && (
                    <Card>
                        <CardContent>
                            <Typography variant="h6" gutterBottom>
                                Notification Settings
                            </Typography>
                            <FormControlLabel
                                control={
                                    <Switch
                                        checked={settings.notifications}
                                        onChange={(e) => handleSettingChange('notifications', e.target.checked)}
                                    />
                                }
                                label="Email Notifications"
                            />
                        </CardContent>
                    </Card>
                )}
            </Box>
        </div>
    );
};

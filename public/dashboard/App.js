const { BrowserRouter, Routes, Route, Navigate } = ReactRouterDOM;
const { ThemeProvider, createTheme } = MaterialUI;

const theme = createTheme({
    palette: {
        primary: {
            main: '#4F46E5',
        },
        secondary: {
            main: '#4338CA',
        },
    },
});

const App = () => {
    const [isAuthenticated, setIsAuthenticated] = React.useState(false);
    const [loading, setLoading] = React.useState(true);

    React.useEffect(() => {
        const token = localStorage.getItem('token');
        if (token) {
            // Verify token
            axios.post('/api/verify-token', {}, {
                headers: { Authorization: `Bearer ${token}` }
            })
            .then(() => setIsAuthenticated(true))
            .catch(() => {
                localStorage.removeItem('token');
                setIsAuthenticated(false);
            })
            .finally(() => setLoading(false));
        } else {
            setLoading(false);
        }
    }, []);

    if (loading) {
        return <div>Loading...</div>;
    }

    return (
        <ThemeProvider theme={theme}>
            <BrowserRouter>
                <Routes>
                    <Route 
                        path="/*" 
                        element={
                            isAuthenticated ? (
                                <Layout>
                                    <Routes>
                                        <Route path="/" element={<Navigate to="/dashboard" />} />
                                        <Route path="/dashboard" element={<Dashboard />} />
                                        {/* Add more routes here */}
                                    </Routes>
                                </Layout>
                            ) : (
                                <Navigate to="/login.html" />
                            )
                        } 
                    />
                </Routes>
            </BrowserRouter>
        </ThemeProvider>
    );
};

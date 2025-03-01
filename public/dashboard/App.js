const { ThemeProvider, createTheme, CssBaseline } = MaterialUI;

// Create theme
const theme = createTheme({
    palette: {
        primary: {
            main: '#4F46E5',
        },
        secondary: {
            main: '#4338CA',
        },
        background: {
            default: '#F8FAFC',
            paper: '#FFFFFF',
        },
    },
    typography: {
        fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
    },
    components: {
        MuiButton: {
            styleOverrides: {
                root: {
                    borderRadius: 8,
                },
            },
        },
        MuiCard: {
            styleOverrides: {
                root: {
                    borderRadius: 12,
                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                },
            },
        },
    },
});

const App = () => {
    const [isAuthenticated, setIsAuthenticated] = React.useState(false);
    const [loading, setLoading] = React.useState(true);
    const [currentPage, setCurrentPage] = React.useState('dashboard');

    React.useEffect(() => {
        verifyAuthentication();
    }, []);

    const verifyAuthentication = async () => {
        try {
            const token = localStorage.getItem('token');
            if (!token) {
                throw new Error('No token found');
            }

            const response = await api.verifyToken();
            if (!response.success) {
                throw new Error('Invalid token');
            }

            setIsAuthenticated(true);
        } catch (error) {
            console.error('Authentication failed:', error);
            window.location.href = '/login.html';
        } finally {
            setLoading(false);
        }
    };

    const handlePageChange = (page) => {
        setCurrentPage(page);
    };

    if (loading) {
        return (
            <div className="loading-overlay">
                <CircularProgress />
            </div>
        );
    }

    const renderPage = () => {
        switch (currentPage) {
            case 'dashboard':
                return <Dashboard />;
            case 'companies':
                return <Companies />;
            case 'settings':
                return <Settings />;
            case 'users':
                return <Users />;
            default:
                return <Dashboard />;
        }
    };

    return (
        <ThemeProvider theme={theme}>
            <CssBaseline />
            <div className="dashboard-container">
                <Header />
                <Sidebar onPageChange={handlePageChange} />
                <main className="main-content">
                    {renderPage()}
                </main>
            </div>
        </ThemeProvider>
    );
};

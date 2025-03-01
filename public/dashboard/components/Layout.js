const { Box, CssBaseline } = MaterialUI;

const Layout = ({ children }) => {
    return (
        <Box sx={{ display: 'flex', minHeight: '100vh' }}>
            <CssBaseline />
            <Header />
            <Sidebar />
            <Box
                component="main"
                sx={{
                    flexGrow: 1,
                    p: 3,
                    mt: 8,
                    ml: '280px'
                }}
            >
                {children}
            </Box>
        </Box>
    );
};

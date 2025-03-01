const { Alert, Button } = MaterialUI;

class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error) {
        return { hasError: true, error };
    }

    componentDidCatch(error, errorInfo) {
        console.error('Error caught by boundary:', error, errorInfo);
        // You can log this to your error tracking service
    }

    handleRetry = () => {
        this.setState({ hasError: false, error: null });
        window.location.reload();
    };

    render() {
        if (this.state.hasError) {
            return (
                <div style={{ padding: '20px', textAlign: 'center' }}>
                    <Alert severity="error" sx={{ mb: 2 }}>
                        Something went wrong. Please try again.
                    </Alert>
                    <Button 
                        variant="contained" 
                        color="primary" 
                        onClick={this.handleRetry}
                    >
                        Retry
                    </Button>
                </div>
            );
        }

        return this.props.children;
    }
}

const { Backdrop, CircularProgress, Skeleton } = MaterialUI;

const LoadingOverlay = ({ open }) => (
    <Backdrop
        sx={{
            color: '#fff',
            zIndex: (theme) => theme.zIndex.drawer + 1
        }}
        open={open}
    >
        <CircularProgress color="inherit" />
    </Backdrop>
);

const TableSkeleton = () => (
    <div style={{ padding: '20px' }}>
        {[...Array(5)].map((_, index) => (
            <div key={index} style={{ display: 'flex', marginBottom: '10px' }}>
                <Skeleton variant="rectangular" width={50} height={40} sx={{ mr: 1 }} />
                <Skeleton variant="rectangular" width={200} height={40} sx={{ mr: 1 }} />
                <Skeleton variant="rectangular" width={200} height={40} sx={{ mr: 1 }} />
                <Skeleton variant="rectangular" width={100} height={40} />
            </div>
        ))}
    </div>
);

const CardSkeleton = () => (
    <div style={{ padding: '20px' }}>
        <Skeleton variant="rectangular" height={118} />
        <Skeleton variant="text" sx={{ mt: 1 }} />
        <Skeleton variant="text" width="60%" />
    </div>
);

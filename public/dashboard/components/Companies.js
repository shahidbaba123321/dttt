const { 
    Paper, 
    Table, 
    TableBody, 
    TableCell, 
    TableContainer, 
    TableHead, 
    TableRow,
    TablePagination,
    Button,
    IconButton,
    Typography
} = MaterialUI;

const Companies = () => {
    const [companies, setCompanies] = React.useState([]);
    const [loading, setLoading] = React.useState(true);
    const [page, setPage] = React.useState(0);
    const [rowsPerPage, setRowsPerPage] = React.useState(10);

    React.useEffect(() => {
        fetchCompanies();
    }, [page, rowsPerPage]);

    const fetchCompanies = async () => {
        try {
            const response = await api.authenticatedRequest(
                `/companies?page=${page + 1}&limit=${rowsPerPage}`
            );
            setCompanies(response.companies);
        } catch (error) {
            console.error('Error fetching companies:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleChangePage = (event, newPage) => {
        setPage(newPage);
    };

    const handleChangeRowsPerPage = (event) => {
        setRowsPerPage(parseInt(event.target.value, 10));
        setPage(0);
    };

    if (loading) {
        return <CircularProgress />;
    }

    return (
        <div>
            <Typography variant="h4" gutterBottom>
                Companies/Organizations
            </Typography>
            
            <Button
                variant="contained"
                color="primary"
                startIcon={<span className="material-icons">add</span>}
                sx={{ mb: 3 }}
            >
                Add New Company
            </Button>

            <TableContainer component={Paper}>
                <Table>
                    <TableHead>
                        <TableRow>
                            <TableCell>Company Name</TableCell>
                            <TableCell>Industry</TableCell>
                            <TableCell>Employees</TableCell>
                            <TableCell>Status</TableCell>
                            <TableCell>Actions</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {companies.map((company) => (
                            <TableRow key={company._id}>
                                <TableCell>{company.name}</TableCell>
                                <TableCell>{company.industry}</TableCell>
                                <TableCell>{company.employeeCount}</TableCell>
                                <TableCell>
                                    <Chip 
                                        label={company.status}
                                        color={company.status === 'active' ? 'success' : 'default'}
                                    />
                                </TableCell>
                                <TableCell>
                                    <IconButton>
                                        <span className="material-icons">edit</span>
                                    </IconButton>
                                    <IconButton>
                                        <span className="material-icons">delete</span>
                                    </IconButton>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
                <TablePagination
                    component="div"
                    count={100} // Replace with actual total count
                    page={page}
                    onPageChange={handleChangePage}
                    rowsPerPage={rowsPerPage}
                    onRowsPerPageChange={handleChangeRowsPerPage}
                />
            </TableContainer>
        </div>
    );
};

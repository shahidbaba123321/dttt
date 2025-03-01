const { TextField, Select, FormControl, InputLabel, FormHelperText } = MaterialUI;

const FormInput = ({ 
    label, 
    value, 
    onChange, 
    error, 
    type = 'text', 
    required = false,
    ...props 
}) => (
    <TextField
        fullWidth
        label={label}
        value={value}
        onChange={onChange}
        error={Boolean(error)}
        helperText={error}
        type={type}
        required={required}
        variant="outlined"
        margin="normal"
        {...props}
    />
);

const FormSelect = ({
    label,
    value,
    onChange,
    options,
    error,
    required = false,
    ...props
}) => (
    <FormControl 
        fullWidth 
        error={Boolean(error)} 
        required={required}
        margin="normal"
    >
        <InputLabel>{label}</InputLabel>
        <Select
            value={value}
            onChange={onChange}
            label={label}
            {...props}
        >
            {options.map(option => (
                <MenuItem key={option.value} value={option.value}>
                    {option.label}
                </MenuItem>
            ))}
        </Select>
        {error && <FormHelperText>{error}</FormHelperText>}
    </FormControl>
);

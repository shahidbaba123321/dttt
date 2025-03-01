const ValidationRules = {
    required: (value) => ({
        isValid: value !== undefined && value !== null && value !== '',
        message: 'This field is required'
    }),
    
    email: (value) => ({
        isValid: /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value),
        message: 'Please enter a valid email address'
    }),
    
    minLength: (length) => (value) => ({
        isValid: value.length >= length,
        message: `Must be at least ${length} characters`
    }),
    
    maxLength: (length) => (value) => ({
        isValid: value.length <= length,
        message: `Must not exceed ${length} characters`
    }),
    
    password: (value) => ({
        isValid: /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d]{8,}$/.test(value),
        message: 'Password must contain at least 8 characters, including letters and numbers'
    }),
    
    phone: (value) => ({
        isValid: /^\+?[\d\s-]{10,}$/.test(value),
        message: 'Please enter a valid phone number'
    })
};

const validateForm = (formData, rules) => {
    const errors = {};
    
    Object.keys(rules).forEach(field => {
        const fieldRules = rules[field];
        const value = formData[field];
        
        fieldRules.forEach(rule => {
            const validation = rule(value);
            if (!validation.isValid) {
                errors[field] = validation.message;
            }
        });
    });
    
    return {
        isValid: Object.keys(errors).length === 0,
        errors
    };
};

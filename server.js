require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
const { MongoClient } = require('mongodb');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const rateLimit = require('express-rate-limit');
const nodemailer = require('nodemailer');
const crypto = require('crypto');

const app = express();

// Email configuration
const transporter = nodemailer.createTransport({
service: 'gmail',
auth: {
user: process.env.EMAIL_USER,
pass: process.env.EMAIL_PASS
}
});

// Enhanced CORS configuration
app.use(cors({
origin: true,
credentials: true,
methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
allowedHeaders: ['Content-Type', 'Authorization', 'Accept']
}));

// Security middleware
app.use(helmet({
contentSecurityPolicy: false
}));
app.use(compression());
app.use(express.json());
app.use(express.static('public'));
app.use(morgan('dev'));

// Rate limiting
const limiter = rateLimit({
windowMs: 15 * 60 * 1000,
max: 100,
message: { message: 'Too many requests, please try again later.' }
});
app.use('/api/', limiter);

// MongoDB connection
const uri = process.env.MONGODB_URI;
const client = new MongoClient(uri, {
useNewUrlParser: true,
useUnifiedTopology: true,
maxPoolSize: 10,
serverSelectionTimeoutMS: 5000,
socketTimeoutMS: 45000,
});

// Database connection function
async function connectDB() {
try {
await client.connect();
console.log("Connected to MongoDB Atlas");


    const db = client.db('infocraftorbis');
    await db.collection('users').createIndex({ email: 1 }, { unique: true });
    await db.collection('users').createIndex({ verificationToken: 1 });
    await db.collection('users').createIndex({ resetPasswordToken: 1 });
    
    console.log("Database indexes created");
    await db.command({ ping: 1 });
    console.log("Database connection test successful");
} catch (err) {
    console.error("MongoDB connection error:", err);
    process.exit(1);
}
}

connectDB();

// Email sending function
async function sendEmail(to, subject, html) {
try {
await transporter.sendMail({
from: process.env.EMAIL_USER,
to,
subject,
html
});
console.log(Email sent to ${to});
} catch (error) {
console.error('Email sending error:', error);
throw error;
}
}

// Authentication middleware
const authenticateToken = (req, res, next) => {
const authHeader = req.headers['authorization'];
const token = authHeader && authHeader.split(' ')[1];


if (!token) {
    return res.status(401).json({ message: 'No token provided' });
}

jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) {
        return res.status(403).json({ message: 'Invalid token' });
    }
    req.user = user;
    next();
});
};

// Health check endpoint
app.get('/api/health', (req, res) => {
res.status(200).json({
status: 'healthy',
timestamp: new Date(),
uptime: process.uptime(),
mongodb: client.topology?.isConnected() ? 'connected' : 'disconnected'
});
});

// Login endpoint
app.post('/api/login', async (req, res) => {
console.log('Login attempt received:', {
email: req.body.email,
role: req.body.role,
timestamp: new Date().toISOString()
});


Collapse
const { email, password, role } = req.body;

try {
    if (!email || !password || !role) {
        console.log('Login failed: Missing required fields');
        return res.status(400).json({ message: 'All fields are required' });
    }

    const database = client.db('infocraftorbis');
    const users = database.collection('users');
    const user = await users.findOne({ email, role });

    if (!user) {
        console.log('Login failed: User not found');
        return res.status(401).json({ message: 'Invalid credentials' });
    }

    if (user.status !== 'active') {
        return res.status(401).json({ message: 'Account is not active' });
    }

    const isPasswordMatch = await bcrypt.compare(password, user.password);
    if (!isPasswordMatch) {
        await users.updateOne(
            { _id: user._id },
            { $inc: { failedLoginAttempts: 1 } }
        );

        if (user.failedLoginAttempts >= 4) {
            await users.updateOne(
                { _id: user._id },
                { $set: { status: 'locked' } }
            );
            return res.status(401).json({ message: 'Account locked due to too many failed attempts' });
        }

        console.log('Login failed: Invalid password');
        return res.status(401).json({ message: 'Invalid credentials' });
    }

    const token = jwt.sign(
        { 
            userId: user._id,
            email: user.email, 
            role: user.role 
        },
        process.env.JWT_SECRET,
        { expiresIn: '24h' }
    );

    await users.updateOne(
        { _id: user._id },
        { 
            $set: { 
                lastLogin: new Date(),
                failedLoginAttempts: 0
            } 
        }
    );

    console.log('Login successful:', {
        email: user.email,
        role: user.role,
        timestamp: new Date().toISOString()
    });

    res.json({ 
        token,
        user: {
            email: user.email,
            role: user.role,
            firstName: user.firstName,
            lastName: user.lastName
        }
    });

} catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ 
        message: 'Internal server error',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
}
});
// Registration endpoint
app.post('/api/register', async (req, res) => {
console.log('Registration attempt received:', {
email: req.body.email,
role: req.body.role,
timestamp: new Date().toISOString()
});


Collapse
const { email, password, role, firstName, lastName } = req.body;

try {
    // Enhanced input validation
    const validationErrors = [];
    
    if (!email) validationErrors.push('Email is required');
    if (!password) validationErrors.push('Password is required');
    if (!role) validationErrors.push('Role is required');
    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (email && !emailRegex.test(email)) {
        validationErrors.push('Invalid email format');
    }

    if (password) {
        if (password.length < 8) validationErrors.push('Password must be at least 8 characters long');
        if (!/\d/.test(password)) validationErrors.push('Password must contain at least one number');
        if (!/[A-Z]/.test(password)) validationErrors.push('Password must contain at least one uppercase letter');
        if (!/[a-z]/.test(password)) validationErrors.push('Password must contain at least one lowercase letter');
        if (!/[!@#$%^&*]/.test(password)) validationErrors.push('Password must contain at least one special character');
    }

    const validRoles = ['admin', 'user', 'superadmin'];
    if (role && !validRoles.includes(role)) {
        validationErrors.push('Invalid role specified');
    }

    if (validationErrors.length > 0) {
        console.log('Registration validation failed:', validationErrors);
        return res.status(400).json({ 
            message: 'Validation failed', 
            errors: validationErrors 
        });
    }

    const database = client.db('infocraftorbis');
    const users = database.collection('users');

    const existingUser = await users.findOne({ email });
    if (existingUser) {
        console.log('Registration failed: Email already exists');
        return res.status(400).json({ message: 'Email already registered' });
    }

    const verificationToken = crypto.randomBytes(32).toString('hex');
    const saltRounds = 12;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    const newUser = {
        email,
        password: hashedPassword,
        role,
        firstName: firstName || '',
        lastName: lastName || '',
        createdAt: new Date(),
        lastLogin: null,
        status: 'pending',
        failedLoginAttempts: 0,
        lastPasswordChange: new Date(),
        verificationToken,
        verificationTokenExpires: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
        settings: {
            twoFactorEnabled: false,
            notifications: {
                email: true,
                browser: true
            }
        }
    };

    const result = await users.insertOne(newUser);

    // Send verification email
    const verificationUrl = `${process.env.BASE_URL}/verify-email/${verificationToken}`;
    await sendEmail(
        email,
        'Verify Your Email - Workwise Pro',
        `
        <h1>Welcome to Workwise Pro!</h1>
        <p>Please click the link below to verify your email address:</p>
        <a href="${verificationUrl}">Verify Email</a>
        <p>This link will expire in 24 hours.</p>
        `
    );

    console.log('Registration successful:', {
        userId: result.insertedId,
        email: email,
        role: role,
        timestamp: new Date().toISOString()
    });

    res.status(201).json({ 
        message: 'User registered successfully. Please check your email for verification.',
        userId: result.insertedId
    });

} catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ 
        message: 'Registration failed',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
}
});

// Email verification endpoint
app.get('/api/verify-email/:token', async (req, res) => {
try {
const { token } = req.params;
const database = client.db('infocraftorbis');
const users = database.collection('users');


Collapse
    const user = await users.findOne({ 
        verificationToken: token,
        verificationTokenExpires: { $gt: new Date() }
    });

    if (!user) {
        return res.status(400).json({ message: 'Invalid or expired verification token' });
    }

    await users.updateOne(
        { _id: user._id },
        { 
            $set: { 
                status: 'active',
                verificationToken: null,
                verificationTokenExpires: null
            }
        }
    );

    res.json({ message: 'Email verified successfully' });
} catch (error) {
    console.error('Email verification error:', error);
    res.status(500).json({ message: 'Email verification failed' });
}
});

// Password reset request endpoint
app.post('/api/reset-password-request', async (req, res) => {
try {
const { email } = req.body;
const database = client.db('infocraftorbis');
const users = database.collection('users');


Collapse
    const user = await users.findOne({ email });
    if (!user) {
        return res.status(200).json({ message: 'If an account exists, password reset instructions have been sent' });
    }

    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetTokenExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    await users.updateOne(
        { _id: user._id },
        { 
            $set: { 
                resetPasswordToken: resetToken,
                resetPasswordExpires: resetTokenExpires
            }
        }
    );

    const resetUrl = `${process.env.BASE_URL}/reset-password/${resetToken}`;
    await sendEmail(
        email,
        'Password Reset - Workwise Pro',
        `
        <h1>Password Reset Request</h1>
        <p>Click the link below to reset your password:</p>
        <a href="${resetUrl}">Reset Password</a>
        <p>This link will expire in 1 hour.</p>
        <p>If you didn't request this, please ignore this email.</p>
        `
    );

    res.json({ message: 'Password reset instructions sent to email' });
} catch (error) {
    console.error('Password reset request error:', error);
    res.status(500).json({ message: 'Failed to process password reset request' });
}
});

// Reset password endpoint
app.post('/api/reset-password/:token', async (req, res) => {
try {
const { token } = req.params;
const { newPassword } = req.body;
const database = client.db('infocraftorbis');
const users = database.collection('users');


Collapse
    const user = await users.findOne({ 
        resetPasswordToken: token,
        resetPasswordExpires: { $gt: new Date() }
    });

    if (!user) {
        return res.status(400).json({ message: 'Invalid or expired reset token' });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 12);

    await users.updateOne(
        { _id: user._id },
        { 
            $set: { 
                password: hashedPassword,
                resetPasswordToken: null,
                resetPasswordExpires: null,
                lastPasswordChange: new Date()
            }
        }
    );

    res.json({ message: 'Password reset successful' });
} catch (error) {
    console.error('Password reset error:', error);
    res.status(500).json({ message: 'Failed to reset password' });
}
});

// Error handling middleware
app.use((err, req, res, next) => {
console.error('Application error:', {
message: err.message,
stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
timestamp: new Date().toISOString()
});


res.status(500).json({ 
    message: 'Internal server error',
    error: process.env.NODE_ENV === 'development' ? err.message : undefined
});
});

// Start server
const PORT = process.env.PORT || 8080;
const server = app.listen(PORT, () => {
console.log(Server running on port ${PORT});
console.log(Environment: ${process.env.NODE_ENV});
console.log(MongoDB URI: ${uri ? 'Configured' : 'Missing'});
console.log(JWT Secret: ${process.env.JWT_SECRET ? 'Configured' : 'Missing'});
});

// Graceful shutdown
process.on('SIGTERM', async () => {
console.log('SIGTERM received. Shutting down gracefully...');
try {
await client.close();
console.log('MongoDB connection closed.');
server.close(() => {
console.log('Server closed.');
process.exit(0);
});
} catch (err) {
console.error('Error during shutdown:', err);
process.exit(1);
}
});

// Handle uncaught errors
process.on('unhandledRejection', (reason, promise) => {
console.error('Unhandled Rejection:', reason);
});

process.on('uncaughtException', (error) => {
console.error('Uncaught Exception:', error);
process.exit(1);
});

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

// Middleware
app.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept']
}));

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
        
        console.log("Database indexes created");
        await db.command({ ping: 1 });
        console.log("Database connection test successful");
    } catch (err) {
        console.error("MongoDB connection error:", err);
        process.exit(1);
    }
}

connectDB();

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

// Routes
app.get('/api/health', (req, res) => {
    res.status(200).json({ 
        status: 'healthy',
        timestamp: new Date(),
        mongodb: client.topology?.isConnected() ? 'connected' : 'disconnected'
    });
});

app.post('/api/signup', async (req, res) => {
    try {
        const { email, password, role } = req.body;

        if (!email || !password || !role) {
            return res.status(400).json({ message: 'All fields are required' });
        }

        const database = client.db('infocraftorbis');
        const users = database.collection('users');

        // Check if Super Admin exists
        if (role === 'superadmin') {
            const existingSuperAdmin = await users.findOne({ role: 'superadmin' });
            if (existingSuperAdmin) {
                return res.status(400).json({ message: 'Super Admin already exists' });
            }
        }

        // Check if email exists
        const existingUser = await users.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ message: 'Email already registered' });
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 12);

        // Create user
        const newUser = {
            email,
            password: hashedPassword,
            role,
            createdAt: new Date(),
            status: 'active',
            lastLogin: null,
            failedLoginAttempts: 0
        };

        await users.insertOne(newUser);

        res.status(201).json({ 
            message: 'Registration successful',
            email: email
        });

    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({ message: 'Registration failed' });
    }
});

app.post('/api/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ message: 'Email and password are required' });
        }

        const database = client.db('infocraftorbis');
        const users = database.collection('users');

        const user = await users.findOne({ email });

        if (!user) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        const isValidPassword = await bcrypt.compare(password, user.password);

        if (!isValidPassword) {
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

            return res.status(401).json({ message: 'Invalid credentials' });
        }

        const token = jwt.sign(
            { userId: user._id, email: user.email, role: user.role },
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

        res.json({ 
            token,
            user: {
                email: user.email,
                role: user.role
            }
        });

    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ message: 'Login failed' });
    }
});

// Protected route example
app.get('/api/protected', authenticateToken, (req, res) => {
    res.json({ message: 'Protected data', user: req.user });
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
    console.log(`Server running on port ${PORT}`);
    console.log(`Environment: ${process.env.NODE_ENV}`);
    console.log(`MongoDB URI: ${uri ? 'Configured' : 'Missing'}`);
    console.log(`JWT Secret: ${process.env.JWT_SECRET ? 'Configured' : 'Missing'}`);
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

module.exports = app;

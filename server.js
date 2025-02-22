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

// Global variable to track Super Admin creation
let superAdminCreated = false;

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
        
        // Check if Super Admin exists
        const superAdmin = await db.collection('users').findOne({ role: 'superadmin' });
        superAdminCreated = !!superAdmin;
        
        console.log("Database indexes created");
        await db.command({ ping: 1 });
        console.log("Database connection test successful");
    } catch (err) {
        console.error("MongoDB connection error:", err);
        process.exit(1);
    }
}

connectDB();

// Super Admin creation endpoint
app.post('/api/create-super-admin', async (req, res) => {
    try {
        if (superAdminCreated) {
            return res.status(403).json({ message: 'Super Admin already exists' });
        }

        const { email, password, firstName, lastName } = req.body;

        // Validate input
        if (!email || !password || !firstName || !lastName) {
            return res.status(400).json({ message: 'All fields are required' });
        }

        const database = client.db('infocraftorbis');
        const users = database.collection('users');

        // Double-check if Super Admin exists
        const existingSuperAdmin = await users.findOne({ role: 'superadmin' });
        if (existingSuperAdmin) {
            superAdminCreated = true;
            return res.status(403).json({ message: 'Super Admin already exists' });
        }

        // Create Super Admin
        const hashedPassword = await bcrypt.hash(password, 12);
        const superAdmin = {
            email,
            password: hashedPassword,
            role: 'superadmin',
            firstName,
            lastName,
            createdAt: new Date(),
            status: 'active',
            lastLogin: null,
            failedLoginAttempts: 0,
            permissions: {
                fullAccess: true,
                systemConfig: true,
                userManagement: true,
                organizationManagement: true
            }
        };

        await users.insertOne(superAdmin);
        superAdminCreated = true;

        res.status(201).json({ 
            message: 'Super Admin created successfully',
            email: email
        });

    } catch (error) {
        console.error('Super Admin creation error:', error);
        res.status(500).json({ message: 'Failed to create Super Admin' });
    }
});

// Check Super Admin existence
app.get('/api/check-super-admin', async (req, res) => {
    try {
        const database = client.db('infocraftorbis');
        const users = database.collection('users');
        const superAdmin = await users.findOne({ role: 'superadmin' });
        res.json({ exists: !!superAdmin });
    } catch (error) {
        res.status(500).json({ message: 'Error checking Super Admin status' });
    }
});

// Super Admin Dashboard Data
app.get('/api/super-admin/dashboard', authenticateToken, async (req, res) => {
    try {
        if (req.user.role !== 'superadmin') {
            return res.status(403).json({ message: 'Access denied' });
        }

        const database = client.db('infocraftorbis');
        const users = database.collection('users');
        const organizations = database.collection('organizations');

        const dashboardData = {
            totalUsers: await users.countDocuments(),
            totalOrganizations: await organizations.countDocuments(),
            recentUsers: await users.find().sort({ createdAt: -1 }).limit(5).toArray(),
            systemHealth: {
                status: 'healthy',
                lastChecked: new Date(),
                dbConnection: client.topology?.isConnected() ? 'connected' : 'disconnected'
            }
        };

        res.json(dashboardData);
    } catch (error) {
        console.error('Dashboard data error:', error);
        res.status(500).json({ message: 'Failed to fetch dashboard data' });
    }
});

// [Previous code remains the same: Login, Register, Email verification, Password reset, etc.]

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

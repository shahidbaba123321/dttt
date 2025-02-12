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

const app = express();

// Middleware
app.use(helmet());
app.use(compression());
app.use(cors());
app.use(express.json());
app.use(express.static('public'));
app.use(morgan('dev'));

// Rate limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100 // limit each IP to 100 requests per windowMs
});
app.use('/api/', limiter);

// MongoDB connection
const uri = process.env.MONGODB_URI;
const client = new MongoClient(uri, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    maxPoolSize: 10
});

// Database connection function
async function connectDB() {
    try {
        await client.connect();
        console.log("Connected to MongoDB Atlas");
        
        // Create indexes
        const db = client.db('infocraftorbis');
        await db.collection('users').createIndex({ email: 1 }, { unique: true });
        
        console.log("Database indexes created");
    } catch (err) {
        console.error("MongoDB connection error:", err);
        process.exit(1);
    }
}

// Connect to database
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
        uptime: process.uptime()
    });
});

// Login endpoint
app.post('/api/login', async (req, res) => {
    const { email, password, role } = req.body;

    try {
        // Input validation
        if (!email || !password || !role) {
            return res.status(400).json({ message: 'All fields are required' });
        }

        const database = client.db('infocraftorbis');
        const users = database.collection('users');
        const user = await users.findOne({ email, role });

        if (!user) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        const isPasswordMatch = await bcrypt.compare(password, user.password);
        if (!isPasswordMatch) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        // Create token
        const token = jwt.sign(
            { 
                userId: user._id,
                email: user.email, 
                role: user.role 
            },
            process.env.JWT_SECRET,
            { expiresIn: '24h' }
        );

        // Update last login
        await users.updateOne(
            { _id: user._id },
            { $set: { lastLogin: new Date() } }
        );

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
        res.status(500).json({ message: 'Internal server error' });
    }
});

// Register endpoint
app.post('/api/register', async (req, res) => {
    const { email, password, role, firstName, lastName } = req.body;

    try {
        // Input validation
        if (!email || !password || !role) {
            return res.status(400).json({ message: 'All fields are required' });
        }

        // Password strength validation
        if (password.length < 8) {
            return res.status(400).json({ message: 'Password must be at least 8 characters long' });
        }

        const database = client.db('infocraftorbis');
        const users = database.collection('users');

        // Check if user exists
        const existingUser = await users.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ message: 'Email already registered' });
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Create user
        const result = await users.insertOne({
            email,
            password: hashedPassword,
            role,
            firstName,
            lastName,
            createdAt: new Date(),
            lastLogin: null,
            status: 'active'
        });

        res.status(201).json({ 
            message: 'User registered successfully',
            userId: result.insertedId
        });

    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

// Protected route example
app.get('/api/profile', authenticateToken, async (req, res) => {
    try {
        const database = client.db('infocraftorbis');
        const users = database.collection('users');
        const user = await users.findOne(
            { email: req.user.email },
            { projection: { password: 0 } }
        );

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        res.json(user);
    } catch (error) {
        console.error('Profile fetch error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ 
        message: 'Internal server error',
        error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
});

// Start server
const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('SIGTERM received. Shutting down gracefully...');
    client.close().then(() => {
        console.log('MongoDB connection closed.');
        process.exit(0);
    });
});

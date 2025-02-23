const express = require('express');
const cors = require('cors');
const { MongoClient } = require('mongodb');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const app = express();

// Enable CORS for all origins during development
app.use(cors({
    origin: 'https://main.d1cfw592vg73f.amplifyapp.com',
    methods: ['GET', 'POST', 'OPTIONS'],
    credentials: true,
    allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());

// MongoDB connection
const uri = process.env.MONGODB_URI;
const client = new MongoClient(uri, { 
    useNewUrlParser: true, 
    useUnifiedTopology: true 
});

async function connectDB() {
    try {
        await client.connect();
        console.log("Connected to MongoDB Atlas");
    } catch (err) {
        console.error("MongoDB connection error:", err);
    }
}

connectDB();

// Test route
app.get('/', (req, res) => {
    res.json({ message: 'Server is running!' });
});

// Registration endpoint
app.post('/api/register', async (req, res) => {
    try {
        console.log('Registration request received:', req.body);

        const { email, password, role } = req.body;
        
        if (!email || !password || !role) {
            return res.status(400).json({ 
                success: false, 
                message: 'All fields are required' 
            });
        }

        const database = client.db('infocraftorbis');
        const users = database.collection('users');

        // Check if user exists
        const existingUser = await users.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ 
                success: false, 
                message: 'User already exists' 
            });
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Create user
        await users.insertOne({
            email,
            password: hashedPassword,
            role,
            createdAt: new Date()
        });

        res.status(201).json({ 
            success: true, 
            message: 'User registered successfully' 
        });

    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Server error during registration' 
        });
    }
});

// Updated Login endpoint
app.post('/api/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        const database = client.db('infocraftorbis');
        const users = database.collection('users');

        // Find user
        const user = await users.findOne({ email });
        if (!user) {
            return res.status(400).json({ 
                success: false, 
                message: 'Invalid credentials' 
            });
        }

        // Check password
        const validPassword = await bcrypt.compare(password, user.password);
        if (!validPassword) {
            return res.status(400).json({ 
                success: false, 
                message: 'Invalid credentials' 
            });
        }

        // Generate token with user information
        const token = jwt.sign(
            { 
                userId: user._id, 
                email: user.email,
                role: user.role 
            },
            process.env.JWT_SECRET,
            { expiresIn: '24h' }
        );

        // Send response with user role and email
        res.json({ 
            success: true, 
            token,
            role: user.role,
            email: user.email,
            message: 'Login successful'
        });

    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Server error during login' 
        });
    }
});

document.addEventListener('DOMContentLoaded', function() {
    checkAuthentication();
    initializeUserProfile();
    
    // Toggle dropdown
    const userProfile = document.querySelector('.user-profile');
    userProfile.addEventListener('click', function(e) {
        this.classList.toggle('active');
        e.stopPropagation();
    });

    // Close dropdown when clicking outside
    document.addEventListener('click', function() {
        userProfile.classList.remove('active');
    });

    // Sign out handler
    document.getElementById('signOutBtn').addEventListener('click', function(e) {
        e.preventDefault();
        signOut();
    });
});

function checkAuthentication() {
    const token = localStorage.getItem('token');
    if (!token) {
        window.location.href = 'login.html';
        return;
    }

    // Optional: Verify token validity with backend
    verifyToken(token);
}

async function verifyToken(token) {
    try {
        const response = await fetch('https://18.215.160.136.nip.io/api/verify-token', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            throw new Error('Token invalid');
        }
    } catch (error) {
        console.error('Token verification failed:', error);
        signOut();
    }
}

function initializeUserProfile() {
    const userEmail = localStorage.getItem('userEmail');
    const userRole = localStorage.getItem('userRole');
    
    if (userEmail && userRole) {
        document.getElementById('userName').textContent = userEmail;
        document.getElementById('userRole').textContent = userRole;
    } else {
        signOut();
    }
}

function signOut() {
    // Clear all localStorage items
    localStorage.clear();
    
    // Redirect to login page
    window.location.href = 'login.html';
}

const PORT = process.env.PORT || 8080;
app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on port ${PORT}`);
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ 
        success: false, 
        message: 'Something broke!' 
    });
});

const express = require('express');
const cors = require('cors');
const { MongoClient, ObjectId } = require('mongodb');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const app = express();

// Updated CORS configuration to include all necessary methods
app.use(cors({
    origin: 'https://main.d1cfw592vg73f.amplifyapp.com',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
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

// Login endpoint
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

        // Generate token
        const token = jwt.sign(
            { 
                userId: user._id, 
                email: user.email,
                role: user.role 
            },
            process.env.JWT_SECRET,
            { expiresIn: '24h' }
        );

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

// Token verification endpoint
app.post('/api/verify-token', async (req, res) => {
    try {
        const token = req.headers.authorization?.split(' ')[1];
        
        if (!token) {
            return res.status(401).json({ 
                success: false, 
                message: 'No token provided' 
            });
        }

        // Verify the token
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        
        // Check if user still exists in database
        const database = client.db('infocraftorbis');
        const users = database.collection('users');
        const user = await users.findOne({ _id: new ObjectId(decoded.userId) });

        if (!user) {
            return res.status(401).json({ 
                success: false, 
                message: 'User not found' 
            });
        }

        res.json({ 
            success: true, 
            user: {
                email: user.email,
                role: user.role
            }
        });

    } catch (error) {
        console.error('Token verification error:', error);
        res.status(401).json({ 
            success: false, 
            message: 'Invalid token' 
        });
    }
});

// User Management Routes
app.post('/api/users', async (req, res) => {
    try {
        const { name, email, department, role, requires2FA } = req.body;

        // Basic validation
        if (!name || !email || !department || !role) {
            return res.status(400).json({ 
                success: false, 
                message: 'All required fields must be provided' 
            });
        }

        const database = client.db('infocraftorbis');
        const users = database.collection('users');

        // Check if user already exists
        const existingUser = await users.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ 
                success: false, 
                message: 'User with this email already exists' 
            });
        }

        // Generate temporary password
        const tempPassword = Math.random().toString(36).slice(-8);
        const hashedPassword = await bcrypt.hash(tempPassword, 10);

        // Create user document
        const newUser = {
            name,
            email,
            department,
            role,
            requires2FA: requires2FA || false,
            password: hashedPassword,
            status: 'active',
            createdAt: new Date(),
            lastLogin: null,
            passwordResetRequired: true
        };

        const result = await users.insertOne(newUser);

        res.status(201).json({
            success: true,
            message: 'User created successfully',
            userId: result.insertedId,
            temporaryPassword: tempPassword
        });

    } catch (error) {
        console.error('Error creating user:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Error creating user' 
        });
    }
});

// Get all users
app.get('/api/users', async (req, res) => {
    try {
        const database = client.db('infocraftorbis');
        const users = database.collection('users');

        const usersList = await users.find({}, {
            projection: {
                password: 0
            }
        }).toArray();

        res.json(usersList);

    } catch (error) {
        console.error('Error fetching users:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Error fetching users' 
        });
    }
});

// Update user
app.put('/api/users/:userId', async (req, res) => {
    try {
        const { userId } = req.params;
        const { name, email, department, role, requires2FA } = req.body;

        const database = client.db('infocraftorbis');
        const users = database.collection('users');

        // Check if email is being changed and if it's already in use
        if (email) {
            const existingUser = await users.findOne({ 
                email, 
                _id: { $ne: new ObjectId(userId) }
            });
            
            if (existingUser) {
                return res.status(400).json({ 
                    success: false, 
                    message: 'Email already in use' 
                });
            }
        }

        const result = await users.updateOne(
            { _id: new ObjectId(userId) },
            {
                $set: {
                    name,
                    email,
                    department,
                    role,
                    requires2FA,
                    updatedAt: new Date()
                }
            }
        );

        if (result.matchedCount === 0) {
            return res.status(404).json({ 
                success: false, 
                message: 'User not found' 
            });
        }

        res.json({ 
            success: true, 
            message: 'User updated successfully' 
        });

    } catch (error) {
        console.error('Error updating user:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Error updating user' 
        });
    }
});

// Toggle user status
app.put('/api/users/:userId/status', async (req, res) => {
    try {
        const { userId } = req.params;
        const { status } = req.body;

        const database = client.db('infocraftorbis');
        const users = database.collection('users');

        const result = await users.updateOne(
            { _id: new ObjectId(userId) },
            {
                $set: {
                    status,
                    updatedAt: new Date()
                }
            }
        );

        if (result.matchedCount === 0) {
            return res.status(404).json({ 
                success: false, 
                message: 'User not found' 
            });
        }

        res.json({ 
            success: true, 
            message: `User ${status === 'active' ? 'activated' : 'deactivated'} successfully` 
        });

    } catch (error) {
        console.error('Error updating user status:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Error updating user status' 
        });
    }
});

// Reset user password
app.post('/api/users/:userId/reset-password', async (req, res) => {
    try {
        const { userId } = req.params;

        const database = client.db('infocraftorbis');
        const users = database.collection('users');

        // Generate new temporary password
        const tempPassword = Math.random().toString(36).slice(-8);
        const hashedPassword = await bcrypt.hash(tempPassword, 10);

        const result = await users.updateOne(
            { _id: new ObjectId(userId) },
            {
                $set: {
                    password: hashedPassword,
                    passwordResetRequired: true,
                    updatedAt: new Date()
                }
            }
        );

        if (result.matchedCount === 0) {
            return res.status(404).json({ 
                success: false, 
                message: 'User not found' 
            });
        }

        res.json({ 
            success: true, 
            message: 'Password reset successful',
            temporaryPassword: tempPassword
        });

    } catch (error) {
        console.error('Error resetting password:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Error resetting password' 
        });
    }
});

// Toggle 2FA requirement
app.put('/api/users/:userId/2fa', async (req, res) => {
    try {
        const { userId } = req.params;
        const { requires2FA } = req.body;

        const database = client.db('infocraftorbis');
        const users = database.collection('users');

        const result = await users.updateOne(
            { _id: new ObjectId(userId) },
            {
                $set: {
                    requires2FA,
                    updatedAt: new Date()
                }
            }
        );

        if (result.matchedCount === 0) {
            return res.status(404).json({ 
                success: false, 
                message: 'User not found' 
            });
        }

        res.json({ 
            success: true, 
            message: `2FA ${requires2FA ? 'enabled' : 'disabled'} successfully` 
        });

    } catch (error) {
        console.error('Error updating 2FA status:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Error updating 2FA status' 
        });
    }
});

// Delete user
app.delete('/api/users/:userId', async (req, res) => {
    try {
        const { userId } = req.params;

        const database = client.db('infocraftorbis');
        const users = database.collection('users');

        const result = await users.deleteOne({ _id: new ObjectId(userId) });

        if (result.deletedCount === 0) {
            return res.status(404).json({ 
                success: false, 
                message: 'User not found' 
            });
        }

        res.json({ 
            success: true, 
            message: 'User deleted successfully' 
        });

    } catch (error) {
        console.error('Error deleting user:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Error deleting user' 
        });
    }
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ 
        success: false, 
        message: 'Something broke!' 
    });
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on port ${PORT}`);
});

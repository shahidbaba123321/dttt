const express = require('express');
const cors = require('cors');
const { MongoClient, ObjectId } = require('mongodb');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const app = express();

// Define CORS options
const corsOptions = {
    origin: 'https://main.d1cfw592vg73f.amplifyapp.com',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
    allowedHeaders: [
        'Content-Type', 
        'Authorization', 
        'Origin', 
        'Accept', 
        'X-Requested-With',
        'X-User-Role'
    ],
    exposedHeaders: [
        'Content-Range', 
        'X-Content-Range',
        'X-User-Role'
    ],
    credentials: true,
    maxAge: 86400,
    preflightContinue: false,
    optionsSuccessStatus: 204
};

// Apply CORS configuration
app.use(cors(corsOptions));
app.options('*', cors(corsOptions));
app.use(express.json());

// Add security headers
app.use((req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
    next();
});

// MongoDB connection
const uri = process.env.MONGODB_URI;
const client = new MongoClient(uri, { 
    useNewUrlParser: true, 
    useUnifiedTopology: true,
    serverSelectionTimeoutMS: 5000,
    maxPoolSize: 10
});

// Database and Collections initialization
let database;
let users;
let audit_logs;
let deleted_users;
let user_permissions;

// Initialize database connection and collections
// Initialize database connection and collections
async function initializeDatabase() {
    try {
        await client.connect();
        console.log("Connected to MongoDB Atlas");
        
        database = client.db('infocraftorbis');
        users = database.collection('users');
        audit_logs = database.collection('audit_logs');
        deleted_users = database.collection('deleted_users');
        user_permissions = database.collection('user_permissions');

        // Function to check and create index if needed
        const ensureIndex = async (collection, indexSpec, options = {}) => {
            try {
                // Get existing indexes
                const existingIndexes = await collection.listIndexes().toArray();
                
                // Check if an equivalent index already exists
                const indexExists = existingIndexes.some(idx => {
                    const keyMatch = Object.keys(idx.key).every(k => 
                        idx.key[k] === indexSpec[k]
                    );
                    return keyMatch;
                });

                if (!indexExists) {
                    await collection.createIndex(indexSpec, options);
                    console.log(`Created index for ${collection.collectionName}`);
                } else {
                    console.log(`Index already exists for ${collection.collectionName}`);
                }
            } catch (err) {
                console.warn(`Warning handling index for ${collection.collectionName}:`, err.message);
            }
        };

        // Initialize indexes
        const indexPromises = [
            ensureIndex(users, { email: 1 }, { unique: true }),
            ensureIndex(audit_logs, { timestamp: -1 }),
            ensureIndex(deleted_users, { originalId: 1 }),
            ensureIndex(user_permissions, { userId: 1 }, { unique: true })
        ];

        await Promise.all(indexPromises);
        console.log("Database collections and indexes initialized");
        
        return {
            database,
            users,
            audit_logs,
            deleted_users,
            user_permissions
        };
    } catch (err) {
        console.error("MongoDB connection error:", err);
        throw err;
    }
}

// Audit log function
async function createAuditLog(action, performedBy, targetUser = null, details = {}) {
    try {
        const auditLog = {
            action,
            performedBy: performedBy ? new ObjectId(performedBy) : null,
            targetUser: targetUser ? new ObjectId(targetUser) : null,
            details,
            timestamp: new Date()
        };

        await audit_logs.insertOne(auditLog);
    } catch (error) {
        console.error('Error creating audit log:', error);
    }
}

// Token verification middleware
const verifyToken = async (req, res, next) => {
    try {
        const token = req.headers.authorization?.split(' ')[1];
        
        if (!token) {
            return res.status(401).json({ 
                success: false, 
                message: 'No token provided' 
            });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded;

        // Check if user still exists and is active
        const user = await users.findOne({ 
            _id: new ObjectId(decoded.userId),
            status: 'active'
        });

        if (!user) {
            return res.status(401).json({ 
                success: false, 
                message: 'User not found or inactive' 
            });
        }

        // Add user permissions to request
        const userPerms = await user_permissions.findOne({ userId: user._id });
        req.user.permissions = userPerms?.permissions || [];

        next();
    } catch (error) {
        console.error('Token verification error:', error);
        return res.status(401).json({ 
            success: false, 
            message: 'Invalid token' 
        });
    }
};

// Admin verification middleware
const verifyAdmin = async (req, res, next) => {
    try {
        if (!req.user) {
            return res.status(401).json({
                success: false,
                message: 'Authentication required'
            });
        }

        if (!['superadmin', 'admin'].includes(req.user.role.toLowerCase())) {
            return res.status(403).json({
                success: false,
                message: 'Admin access required'
            });
        }

        next();
    } catch (error) {
        console.error('Admin verification error:', error);
        return res.status(500).json({
            success: false,
            message: 'Error verifying admin access'
        });
    }
};

// Error handling middleware
const errorHandler = (err, req, res, next) => {
    console.error('Global error handler:', err);
    
    if (err.name === 'ValidationError') {
        return res.status(400).json({
            success: false,
            message: 'Validation Error',
            errors: err.errors
        });
    }

    if (err.name === 'MongoError' && err.code === 11000) {
        return res.status(409).json({
            success: false,
            message: 'Duplicate key error'
        });
    }

    res.status(500).json({
        success: false,
        message: 'Internal server error'
    });
};

// Test route
app.get('/', (req, res) => {
    res.json({ message: 'Server is running!' });
});

// Registration endpoint
app.post('/api/register', async (req, res) => {
    try {
        console.log('Registration request received:', req.body);

        const { email, password, role } = req.body;
        
        // Enhanced validation
        if (!email || !password || !role) {
            return res.status(400).json({ 
                success: false, 
                message: 'All fields are required' 
            });
        }

        if (password.length < 8) {
            return res.status(400).json({
                success: false,
                message: 'Password must be at least 8 characters long'
            });
        }

        // Check if user exists with case-insensitive email check
        const existingUser = await users.findOne({ 
            email: { $regex: new RegExp(`^${email}$`, 'i') } 
        });
        
        if (existingUser) {
            return res.status(400).json({ 
                success: false, 
                message: 'User already exists' 
            });
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 12);

        // Create user with additional security fields
        const newUser = {
            email,
            password: hashedPassword,
            role,
            status: 'active',
            createdAt: new Date(),
            lastLogin: null,
            failedLoginAttempts: 0,
            passwordResetRequired: false,
            requires2FA: false
        };

        const result = await users.insertOne(newUser);

        // Initialize user permissions
        await user_permissions.insertOne({
            userId: result.insertedId,
            permissions: [],
            createdAt: new Date(),
            updatedAt: new Date()
        });

        // Create audit log
        await createAuditLog(
            'USER_REGISTERED',
            result.insertedId,
            result.insertedId,
            { email, role }
        );

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

        // Find user with case-insensitive email check
        const user = await users.findOne({ 
            email: { $regex: new RegExp(`^${email}$`, 'i') } 
        });

        if (!user) {
            return res.status(400).json({ 
                success: false, 
                message: 'Invalid credentials' 
            });
        }

        // Check if user is active
        if (user.status !== 'active') {
            return res.status(403).json({
                success: false,
                message: 'Account is inactive'
            });
        }

        // Check for too many failed login attempts
        if (user.failedLoginAttempts >= 5) {
            const lastFailedLogin = user.lastFailedLogin || new Date(0);
            const lockoutDuration = 15 * 60 * 1000; // 15 minutes
            
            if ((new Date() - lastFailedLogin) < lockoutDuration) {
                return res.status(403).json({
                    success: false,
                    message: 'Account temporarily locked. Please try again later.'
                });
            } else {
                // Reset failed attempts after lockout period
                await users.updateOne(
                    { _id: user._id },
                    { $set: { failedLoginAttempts: 0 } }
                );
            }
        }

        // Check password
        const validPassword = await bcrypt.compare(password, user.password);
        if (!validPassword) {
            // Increment failed login attempts
            await users.updateOne(
                { _id: user._id },
                { 
                    $inc: { failedLoginAttempts: 1 },
                    $set: { lastFailedLogin: new Date() }
                }
            );

            return res.status(400).json({ 
                success: false, 
                message: 'Invalid credentials' 
            });
        }

        // Get user permissions
        const userPerms = await user_permissions.findOne({ userId: user._id });

        // Generate token
        const token = jwt.sign(
            { 
                userId: user._id, 
                email: user.email,
                role: user.role,
                permissions: userPerms?.permissions || []
            },
            process.env.JWT_SECRET,
            { expiresIn: '24h' }
        );

        // Reset failed login attempts and update last login
        await users.updateOne(
            { _id: user._id },
            { 
                $set: { 
                    failedLoginAttempts: 0,
                    lastLogin: new Date()
                }
            }
        );

        // Create audit log
        await createAuditLog(
            'USER_LOGIN',
            user._id,
            user._id,
            { email: user.email }
        );

        res.json({ 
            success: true, 
            token,
            role: user.role,
            email: user.email,
            requires2FA: user.requires2FA,
            passwordResetRequired: user.passwordResetRequired,
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
        
        // Check if user still exists and is active
        const user = await users.findOne({ 
            _id: new ObjectId(decoded.userId),
            status: 'active'
        });

        if (!user) {
            return res.status(401).json({ 
                success: false, 
                message: 'User not found or inactive' 
            });
        }

        // Get current permissions
        const userPerms = await user_permissions.findOne({ userId: user._id });

        res.json({ 
            success: true, 
            user: {
                email: user.email,
                role: user.role,
                permissions: userPerms?.permissions || [],
                requires2FA: user.requires2FA
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

// Create new user
app.post('/api/users', verifyToken, verifyAdmin, async (req, res) => {
    try {
        const { name, email, department, role, requires2FA } = req.body;

        // Enhanced validation
        if (!name || !email || !department || !role) {
            return res.status(400).json({ 
                success: false, 
                message: 'All required fields must be provided' 
            });
        }

        // Case-insensitive email check
        const existingUser = await users.findOne({ 
            email: { $regex: new RegExp(`^${email}$`, 'i') }
        });

        if (existingUser) {
            return res.status(400).json({ 
                success: false, 
                message: 'User with this email already exists' 
            });
        }

        // Generate secure temporary password
        const tempPassword = require('crypto').randomBytes(8).toString('hex');
        const hashedPassword = await bcrypt.hash(tempPassword, 12);

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
            createdBy: new ObjectId(req.user.userId),
            lastLogin: null,
            failedLoginAttempts: 0,
            passwordResetRequired: true,
            passwordLastChanged: new Date()
        };

        const result = await users.insertOne(newUser);

        // Initialize user permissions
        await user_permissions.insertOne({
            userId: result.insertedId,
            permissions: [],
            createdAt: new Date(),
            createdBy: new ObjectId(req.user.userId),
            updatedAt: new Date()
        });

        // Create audit log
        await createAuditLog(
            'USER_CREATED',
            req.user.userId,
            result.insertedId,
            {
                name,
                email,
                department,
                role,
                requires2FA
            }
        );

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

// Get all users with pagination and filtering
app.get('/api/users', verifyToken, async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const search = req.query.search;
        const department = req.query.department;
        const role = req.query.role;
        const status = req.query.status;

        // Build filter query
        const filter = {};

        if (search) {
            filter.$or = [
                { name: { $regex: search, $options: 'i' } },
                { email: { $regex: search, $options: 'i' } }
            ];
        }

        if (department) filter.department = department;
        if (role) filter.role = role;
        if (status) filter.status = status;

        // Get total count for pagination
        const total = await users.countDocuments(filter);

        // Get users with pagination
        const usersList = await users.find(filter, {
            projection: {
                password: 0,
                failedLoginAttempts: 0,
                lastFailedLogin: 0
            }
        })
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .toArray();

        // Get permissions for all users
        const userIds = usersList.map(user => user._id);
        const permissions = await user_permissions
            .find({ userId: { $in: userIds } })
            .toArray();

        // Merge permissions with user data
        const usersWithPermissions = usersList.map(user => ({
            ...user,
            permissions: permissions.find(p => p.userId.equals(user._id))?.permissions || []
        }));

        res.json({
            success: true,
            users: usersWithPermissions,
            pagination: {
                total,
                page,
                pages: Math.ceil(total / limit)
            }
        });

    } catch (error) {
        console.error('Error fetching users:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Error fetching users' 
        });
    }
});

// Update user
app.put('/api/users/:userId', verifyToken, verifyAdmin, async (req, res) => {
    try {
        const { userId } = req.params;
        const { name, email, department, role, requires2FA, permissions } = req.body;

        // Verify user exists
        const existingUser = await users.findOne({ _id: new ObjectId(userId) });
        if (!existingUser) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        // Check email uniqueness if email is being changed
        if (email && email !== existingUser.email) {
            const emailExists = await users.findOne({ 
                email: { $regex: new RegExp(`^${email}$`, 'i') },
                _id: { $ne: new ObjectId(userId) }
            });
            
            if (emailExists) {
                return res.status(400).json({ 
                    success: false, 
                    message: 'Email already in use' 
                });
            }
        }

        // Prepare update document
        const updateDoc = {
            $set: {
                ...(name && { name }),
                ...(email && { email }),
                ...(department && { department }),
                ...(role && { role }),
                ...(typeof requires2FA !== 'undefined' && { requires2FA }),
                updatedAt: new Date(),
                updatedBy: new ObjectId(req.user.userId)
            }
        };

        // Update user
        await users.updateOne(
            { _id: new ObjectId(userId) },
            updateDoc
        );

        // Update permissions if provided
        if (permissions && Array.isArray(permissions)) {
            await user_permissions.updateOne(
                { userId: new ObjectId(userId) },
                {
                    $set: {
                        permissions,
                        updatedAt: new Date(),
                        updatedBy: new ObjectId(req.user.userId)
                    }
                },
                { upsert: true }
            );
        }

        // Create audit log
        await createAuditLog(
            'USER_UPDATED',
            req.user.userId,
            userId,
            {
                changes: req.body,
                previousState: existingUser
            }
        );

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
app.put('/api/users/:userId/status', verifyToken, verifyAdmin, async (req, res) => {
    try {
        const { userId } = req.params;
        const { status } = req.body;

        if (!['active', 'inactive'].includes(status)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid status value'
            });
        }

        const user = await users.findOne({ _id: new ObjectId(userId) });
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        const result = await users.updateOne(
            { _id: new ObjectId(userId) },
            {
                $set: {
                    status,
                    updatedAt: new Date(),
                    updatedBy: new ObjectId(req.user.userId)
                }
            }
        );

        await createAuditLog(
            'USER_STATUS_CHANGED',
            req.user.userId,
            userId,
            {
                previousStatus: user.status,
                newStatus: status
            }
        );

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
app.post('/api/users/:userId/reset-password', verifyToken, verifyAdmin, async (req, res) => {
    try {
        const { userId } = req.params;
        const { password } = req.body;

        // Validate password
        if (!password || password.length < 8) {
            return res.status(400).json({ 
                success: false, 
                message: 'Password must be at least 8 characters long' 
            });
        }

        const user = await users.findOne({ _id: new ObjectId(userId) });
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        // Hash the new password
        const hashedPassword = await bcrypt.hash(password, 12);

        const result = await users.updateOne(
            { _id: new ObjectId(userId) },
            {
                $set: {
                    password: hashedPassword,
                    passwordResetRequired: true,
                    passwordLastChanged: new Date(),
                    updatedAt: new Date(),
                    updatedBy: new ObjectId(req.user.userId)
                }
            }
        );

        await createAuditLog(
            'PASSWORD_RESET',
            req.user.userId,
            userId,
            {
                resetBy: req.user.email
            }
        );

        res.json({ 
            success: true, 
            message: 'Password reset successful'
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
app.put('/api/users/:userId/2fa', verifyToken, verifyAdmin, async (req, res) => {
    try {
        const { userId } = req.params;
        const { requires2FA } = req.body;

        const user = await users.findOne({ _id: new ObjectId(userId) });
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        const result = await users.updateOne(
            { _id: new ObjectId(userId) },
            {
                $set: {
                    requires2FA,
                    updatedAt: new Date(),
                    updatedBy: new ObjectId(req.user.userId)
                }
            }
        );

        await createAuditLog(
            'TWO_FA_SETTING_CHANGED',
            req.user.userId,
            userId,
            {
                previous2FAStatus: user.requires2FA,
                new2FAStatus: requires2FA
            }
        );

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

// Delete user (moves to deleted_users collection)
app.delete('/api/users/:userId', verifyToken, verifyAdmin, async (req, res) => {
    const session = client.startSession();
    try {
        await session.withTransaction(async () => {
            const { userId } = req.params;
            const { reason } = req.body;

            if (!reason) {
                throw new Error('Deletion reason is required');
            }

            // Find user before deletion
            const user = await users.findOne(
                { _id: new ObjectId(userId) },
                { session }
            );

            if (!user) {
                throw new Error('User not found');
            }

            // Get user's permissions
            const userPerms = await user_permissions.findOne(
                { userId: new ObjectId(userId) },
                { session }
            );

            // Prepare archived user document
            const archivedUser = {
                originalId: user._id,
                ...user,
                permissions: userPerms?.permissions || [],
                deletedAt: new Date(),
                deletedBy: new ObjectId(req.user.userId),
                deletionReason: reason,
                userStatus: user.status,
                lastKnownRole: user.role,
                lastKnownDepartment: user.department
            };

            // Insert into deleted_users collection
            await deleted_users.insertOne(archivedUser, { session });

            // Delete from users collection
            await users.deleteOne(
                { _id: new ObjectId(userId) },
                { session }
            );

            // Delete from user_permissions collection
            await user_permissions.deleteOne(
                { userId: new ObjectId(userId) },
                { session }
            );

            // Create audit log
            await createAuditLog(
                'USER_DELETED',
                req.user.userId,
                userId,
                {
                    reason,
                    deletedUser: user
                }
            );
        });

        res.json({ 
            success: true, 
            message: 'User deleted and archived successfully'
        });

    } catch (error) {
        console.error('Error deleting user:', error);
        res.status(error.message === 'User not found' ? 404 : 500).json({ 
            success: false, 
            message: error.message || 'Error deleting user'
        });
    } finally {
        await session.endSession();
    }
});

// Get deleted users
app.get('/api/deleted-users', verifyToken, verifyAdmin, async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const search = req.query.search;
        const dateFrom = req.query.dateFrom ? new Date(req.query.dateFrom) : null;
        const dateTo = req.query.dateTo ? new Date(req.query.dateTo) : null;

        // Build filter
        const filter = {};

        if (search) {
            filter.$or = [
                { name: { $regex: search, $options: 'i' } },
                { email: { $regex: search, $options: 'i' } }
            ];
        }

        if (dateFrom || dateTo) {
            filter.deletedAt = {};
            if (dateFrom) filter.deletedAt.$gte = dateFrom;
            if (dateTo) filter.deletedAt.$lte = dateTo;
        }

        // Get total count
        const total = await deleted_users.countDocuments(filter);

        // Get deleted users with pagination
        const deletedUsersList = await deleted_users
            .find(filter)
            .sort({ deletedAt: -1 })
            .skip((page - 1) * limit)
            .limit(limit)
            .project({
                password: 0,
                failedLoginAttempts: 0
            })
            .toArray();

        // Get deleting user details
        const populatedUsers = await Promise.all(deletedUsersList.map(async (user) => {
            const deletedBy = await users.findOne(
                { _id: user.deletedBy },
                { projection: { name: 1, email: 1 } }
            );

            return {
                ...user,
                deletedByUser: deletedBy || { name: 'System', email: 'system' }
            };
        }));

        res.json({
            success: true,
            deletedUsers: populatedUsers,
            pagination: {
                total,
                page,
                pages: Math.ceil(total / limit)
            }
        });

    } catch (error) {
        console.error('Error fetching deleted users:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching deleted users'
        });
    }
});

// Restore deleted user
app.post('/api/deleted-users/:userId/restore', verifyToken, verifyAdmin, async (req, res) => {
    const session = client.startSession();
    try {
        await session.withTransaction(async () => {
            const { userId } = req.params;

            // Find deleted user
            const deletedUser = await deleted_users.findOne(
                { originalId: new ObjectId(userId) },
                { session }
            );

            if (!deletedUser) {
                throw new Error('Deleted user not found');
            }

            // Check if email is still available
            const emailExists = await users.findOne(
                { email: deletedUser.email },
                { session }
            );

            if (emailExists) {
                throw new Error('Email address is no longer available');
            }

            // Prepare user document for restoration
            const restoredUser = {
                _id: new ObjectId(),
                name: deletedUser.name,
                email: deletedUser.email,
                password: deletedUser.password,
                department: deletedUser.lastKnownDepartment,
                role: deletedUser.lastKnownRole,
                requires2FA: deletedUser.requires2FA,
                status: 'active',
                createdAt: new Date(),
                restoredAt: new Date(),
                restoredBy: new ObjectId(req.user.userId),
                originalCreatedAt: deletedUser.createdAt,
                passwordResetRequired: true
            };

            // Insert restored user
            const result = await users.insertOne(restoredUser, { session });

            // Restore permissions if they existed
            if (deletedUser.permissions && deletedUser.permissions.length > 0) {
                await user_permissions.insertOne({
                    userId: restoredUser._id,
                    permissions: deletedUser.permissions,
                    createdAt: new Date(),
                    createdBy: new ObjectId(req.user.userId)
                }, { session });
            }

            // Remove from deleted_users
            await deleted_users.deleteOne(
                { originalId: new ObjectId(userId) },
                { session }
            );

            // Create audit log
            await createAuditLog(
                'USER_RESTORED',
                req.user.userId,
                restoredUser._id,
                {
                    originalId: userId,
                    restoredUser: restoredUser
                }
            );
        });

        res.json({
            success: true,
            message: 'User restored successfully'
        });

    } catch (error) {
        console.error('Error restoring user:', error);
        res.status(error.message.includes('not found') ? 404 : 500).json({
            success: false,
            message: error.message || 'Error restoring user'
        });
    } finally {
        await session.endSession();
    }
});

// Get audit logs
app.get('/api/audit-logs', verifyToken, verifyAdmin, async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 50;
        const action = req.query.action;
        const userId = req.query.userId;
        const dateFrom = req.query.dateFrom ? new Date(req.query.dateFrom) : null;
        const dateTo = req.query.dateTo ? new Date(req.query.dateTo) : null;

        // Build filter
        const filter = {};

        if (action) filter.action = action;
        if (userId) filter.targetUser = new ObjectId(userId);

        if (dateFrom || dateTo) {
            filter.timestamp = {};
            if (dateFrom) filter.timestamp.$gte = dateFrom;
            if (dateTo) filter.timestamp.$lte = dateTo;
        }

        // Get total count
        const total = await audit_logs.countDocuments(filter);

        // Get logs with pagination
        const logs = await audit_logs
            .find(filter)
            .sort({ timestamp: -1 })
            .skip((page - 1) * limit)
            .limit(limit)
            .toArray();

        // Populate user details
        const populatedLogs = await Promise.all(logs.map(async (log) => {
            const performer = await users.findOne(
                { _id: log.performedBy },
                { projection: { name: 1, email: 1 } }
            );

            const target = log.targetUser ? await users.findOne(
                { _id: log.targetUser },
                { projection: { name: 1, email: 1 } }
            ) : null;

            return {
                ...log,
                performedByUser: performer || { name: 'System', email: 'system' },
                targetUserDetails: target || null
            };
        }));

        res.json({
            success: true,
            logs: populatedLogs,
            pagination: {
                total,
                page,
                pages: Math.ceil(total / limit)
            }
        });

    } catch (error) {
        console.error('Error fetching audit logs:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching audit logs'
        });
    }
});

// Apply error handling middleware
app.use(errorHandler);

// Initialize database and start server
initializeDatabase()
    .then(() => {
        const PORT = process.env.PORT || 8080;
        const server = app.listen(PORT, '0.0.0.0', () => {
            console.log(`Server running on port ${PORT}`);
        });

        // Handle server errors
        server.on('error', (error) => {
            console.error('Server error:', error);
            process.exit(1);
        });
    })
    .catch(error => {
        console.error('Failed to initialize database:', error);
        setTimeout(() => {
            process.exit(1);
        }, 1000);
    });

// Enhanced error handling for process events
process.on('SIGTERM', async () => {
    console.log('SIGTERM received. Starting graceful shutdown...');
    try {
        await client.close();
        console.log('MongoDB connection closed.');
        process.exit(0);
    } catch (error) {
        console.error('Error during shutdown:', error);
        process.exit(1);
    }
});

process.on('uncaughtException', (error) => {
    console.error('Uncaught Exception:', error);
    client.close().finally(() => {
        process.exit(1);
    });
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
    client.close().finally(() => {
        process.exit(1);
    });
});

module.exports = app;

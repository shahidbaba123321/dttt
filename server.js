const express = require('express');
const cors = require('cors');
const { MongoClient, ObjectId } = require('mongodb');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const app = express();

// Enhanced logging function
const logError = (context, error) => {
    console.error(`[${new Date().toISOString()}] ${context}:`, error);
    console.error('Stack:', error.stack);
};

// Enhanced token verification middleware with role checking
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

        // Check if user is superadmin
        if (decoded.role.toLowerCase() === 'superadmin') {
            req.isAdmin = true;
            next();
            return;
        }

        // For non-admin routes
        next();
    } catch (error) {
        return res.status(401).json({ 
            success: false, 
            message: 'Invalid token' 
        });
    }
};

// Admin role verification middleware
const verifyAdmin = (req, res, next) => {
    if (req.user && (req.user.role.toLowerCase() === 'superadmin' || req.user.role.toLowerCase() === 'admin')) {
        next();
    } else {
        res.status(403).json({
            success: false,
            message: 'Admin access required'
        });
    }
};

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
        'X-User-Role' // Add the new custom header
    ],
    exposedHeaders: [
        'Content-Range', 
        'X-Content-Range',
        'X-User-Role' // Expose the custom header in responses
    ],
    credentials: true,
    maxAge: 86400,
    preflightContinue: false,
    optionsSuccessStatus: 204
};

// Apply CORS configuration
app.use(cors(corsOptions));

// Handle preflight requests
app.options('*', cors(corsOptions));

// Parse JSON bodies
app.use(express.json());

// Add security headers
app.use((req, res, next) => {
    // Basic security headers
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
    
    // Allow the custom header to be read by the client
    res.setHeader('Access-Control-Expose-Headers', 'X-User-Role');
    next();
});

// MongoDB connection with enhanced error handling
const uri = process.env.MONGODB_URI;
const client = new MongoClient(uri, { 
    useNewUrlParser: true, 
    useUnifiedTopology: true,
    serverSelectionTimeoutMS: 5000,
    maxPoolSize: 10
});

// Database connection function with retry mechanism
async function connectDB(retries = 5) {
    for (let i = 0; i < retries; i++) {
        try {
            await client.connect();
            console.log("Connected to MongoDB Atlas");
            
            // Initialize collections
           

            const database = client.db('infocraftorbis');
            const collections = {
                users: database.collection('users'),
                deletedUsers: database.collection('deleted_users'),
                userPermissions: database.collection('user_permissions'),
                rbacRoles: database.collection('rbac_roles')
            };

            // Create indexes
            await collections.users.createIndex({ email: 1 }, { unique: true });
            await collections.deletedUsers.createIndex({ originalId: 1 });
            await collections.userPermissions.createIndex({ userId: 1 });
            
            return collections;
        } catch (err) {
            logError(`MongoDB connection attempt ${i + 1}/${retries}`, err);
            if (i === retries - 1) throw err;
            await new Promise(resolve => setTimeout(resolve, 2000 * (i + 1)));
        }
    }
}

// Initialize database connection
let dbCollections;
connectDB()
    .then(collections => {
        dbCollections = collections;
        console.log("Database collections initialized");
    })
    .catch(err => {
        logError('Database initialization', err);
        process.exit(1);
    });

// Test route
app.get('/', (req, res) => {
    res.json({ message: 'Server is running!' });
});

const audit_logs = database.collection('audit_logs');

// Get audit logs endpoint
app.get('/api/audit-logs', verifyToken, async (req, res) => {
    try {
        // Verify admin access
        if (!req.user || !['superadmin', 'admin'].includes(req.user.role.toLowerCase())) {
            return res.status(403).json({
                success: false,
                message: 'Admin access required'
            });
        }

        const database = client.db('infocraftorbis');
        const audit_logs = database.collection('audit_logs');

        // Add pagination
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 50;
        const skip = (page - 1) * limit;

        // Get total count
        const total = await audit_logs.countDocuments();

        // Get logs with pagination
        const logs = await audit_logs
            .find({})
            .sort({ timestamp: -1 })
            .skip(skip)
            .limit(limit)
            .toArray();

        // Populate user details for each log
        const populatedLogs = await Promise.all(logs.map(async (log) => {
            let performedBy = null;
            if (log.performedBy) {
                performedBy = await database.collection('users').findOne(
                    { _id: new ObjectId(log.performedBy) },
                    { projection: { name: 1, email: 1 } }
                );
            }

            return {
                ...log,
                performedByUser: performedBy || { name: 'System', email: 'system' }
            };
        }));

        res.json({
            success: true,
            logs: populatedLogs,
            pagination: {
                page,
                limit,
                total,
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

// Create audit log function
const createAuditLog = async (action, performedBy, targetUser = null, details = {}) => {
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
};

// Registration endpoint with enhanced validation and error handling
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

        const database = client.db('infocraftorbis');
        const users = database.collection('users');
        const userPermissions = database.collection('user_permissions');

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

        // Hash password with enhanced security
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
        await userPermissions.insertOne({
            userId: result.insertedId,
            permissions: [],
            createdAt: new Date(),
            updatedAt: new Date()
        });

        res.status(201).json({ 
            success: true, 
            message: 'User registered successfully' 
        });

    } catch (error) {
        logError('Registration', error);
        res.status(500).json({ 
            success: false, 
            message: 'Server error during registration' 
        });
    }
});

// Enhanced login endpoint with security features
app.post('/api/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        const database = client.db('infocraftorbis');
        const users = database.collection('users');

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
            return res.status(403).json({
                success: false,
                message: 'Account temporarily locked due to too many failed attempts'
            });
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

        // Get user permissions
        const userPermissions = await dbCollections.userPermissions.findOne(
            { userId: user._id }
        );

        // Generate token with enhanced payload
        const token = jwt.sign(
            { 
                userId: user._id, 
                email: user.email,
                role: user.role,
                permissions: userPermissions?.permissions || [],
                requires2FA: user.requires2FA
            },
            process.env.JWT_SECRET,
            { expiresIn: '24h' }
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
        logError('Login', error);
        res.status(500).json({ 
            success: false, 
            message: 'Server error during login' 
        });
    }
});

// Enhanced token verification endpoint
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
        const database = client.db('infocraftorbis');
        const users = database.collection('users');
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
        const userPermissions = await dbCollections.userPermissions.findOne(
            { userId: user._id }
        );

        res.json({ 
            success: true, 
            user: {
                email: user.email,
                role: user.role,
                permissions: userPermissions?.permissions || [],
                requires2FA: user.requires2FA
            }
        });

    } catch (error) {
        logError('Token Verification', error);
        res.status(401).json({ 
            success: false, 
            message: 'Invalid token' 
        });
    }
});

// Enhanced User Management Routes

// Create new user with RBAC support
app.post('/api/users', verifyToken, async (req, res) => {
    try {
        const { name, email, department, role, requires2FA, permissions } = req.body;

        // Enhanced validation
        if (!name || !email || !department || !role) {
            return res.status(400).json({ 
                success: false, 
                message: 'All required fields must be provided' 
            });
        }

        const database = client.db('infocraftorbis');
        const users = database.collection('users');

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

        // Create user document with enhanced fields
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
        if (permissions && Array.isArray(permissions)) {
            await dbCollections.userPermissions.insertOne({
                userId: result.insertedId,
                permissions,
                createdAt: new Date(),
                createdBy: new ObjectId(req.user.userId),
                updatedAt: new Date()
            });
        }

        // Audit log entry
        await database.collection('audit_logs').insertOne({
            action: 'USER_CREATED',
            performedBy: new ObjectId(req.user.userId),
            targetUser: result.insertedId,
            details: {
                name,
                email,
                department,
                role,
                requires2FA
            },
            timestamp: new Date()
        });

        res.status(201).json({
            success: true,
            message: 'User created successfully',
            userId: result.insertedId,
            temporaryPassword: tempPassword
        });

    } catch (error) {
        logError('User Creation', error);
        res.status(500).json({ 
            success: false, 
            message: 'Error creating user' 
        });
    }
});

// Enhanced Get all users with pagination and filtering
app.get('/api/users', verifyToken, async (req, res) => {
    try {
        const {
            page = 1,
            limit = 10,
            search,
            department,
            role,
            status
        } = req.query;

        const database = client.db('infocraftorbis');
        const users = database.collection('users');

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
                failedLoginAttempts: 0
            }
        })
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(parseInt(limit))
        .toArray();

        // Get permissions for all users
        const userIds = usersList.map(user => user._id);
        const permissions = await dbCollections.userPermissions
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
                page: parseInt(page),
                pages: Math.ceil(total / limit)
            }
        });

    } catch (error) {
        logError('Fetching Users', error);
        res.status(500).json({ 
            success: false, 
            message: 'Error fetching users' 
        });
    }
});

// Enhanced Update user endpoint
app.put('/api/users/:userId', verifyToken, async (req, res) => {
    try {
        const { userId } = req.params;
        const { name, email, department, role, requires2FA, permissions } = req.body;

        const database = client.db('infocraftorbis');
        const users = database.collection('users');

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
        const result = await users.updateOne(
            { _id: new ObjectId(userId) },
            updateDoc
        );

        // Update permissions if provided
        if (permissions && Array.isArray(permissions)) {
            await dbCollections.userPermissions.updateOne(
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
        await database.collection('audit_logs').insertOne({
            action: 'USER_UPDATED',
            performedBy: new ObjectId(req.user.userId),
            targetUser: new ObjectId(userId),
            details: {
                changes: req.body,
                previousState: existingUser
            },
            timestamp: new Date()
        });

        res.json({ 
            success: true, 
            message: 'User updated successfully' 
        });

    } catch (error) {
        logError('Updating User', error);
        res.status(500).json({ 
            success: false, 
            message: 'Error updating user' 
        });
    }
});
// Enhanced Delete user with archiving
app.delete('/api/users/:userId', verifyToken, async (req, res) => {
    try {
        const { userId } = req.params;
        const database = client.db('infocraftorbis');
        
        // Start a session for transaction
        const session = client.startSession();
        
        try {
            await session.withTransaction(async () => {
                // Find user before deletion
                const user = await dbCollections.users.findOne(
                    { _id: new ObjectId(userId) },
                    { session }
                );

                if (!user) {
                    throw new Error('User not found');
                }

                // Get user's permissions
                const userPermissions = await dbCollections.userPermissions.findOne(
                    { userId: new ObjectId(userId) },
                    { session }
                );

                // Prepare archived user document
                const archivedUser = {
                    ...user,
                    originalId: user._id,
                    permissions: userPermissions?.permissions || [],
                    deletedAt: new Date(),
                    deletedBy: new ObjectId(req.user.userId),
                    deletionReason: req.body.reason || 'Not specified',
                    userStatus: user.status,
                    lastKnownRole: user.role,
                    lastKnownDepartment: user.department
                };

                // Insert into deleted_users collection
                await dbCollections.deletedUsers.insertOne(archivedUser, { session });

                // Delete from users collection
                await dbCollections.users.deleteOne(
                    { _id: new ObjectId(userId) },
                    { session }
                );

                // Delete from user_permissions collection
                await dbCollections.userPermissions.deleteOne(
                    { userId: new ObjectId(userId) },
                    { session }
                );

                // Create audit log
                await database.collection('audit_logs').insertOne({
                    action: 'USER_DELETED',
                    performedBy: new ObjectId(req.user.userId),
                    targetUser: new ObjectId(userId),
                    details: {
                        deletedUser: user,
                        reason: req.body.reason
                    },
                    timestamp: new Date()
                }, { session });
            });

            await session.endSession();

            res.json({ 
                success: true, 
                message: 'User successfully deleted and archived'
            });

        } catch (error) {
            await session.abortTransaction();
            throw error;
        }

    } catch (error) {
        logError('Deleting User', error);
        res.status(error.message === 'User not found' ? 404 : 500).json({ 
            success: false, 
            message: error.message || 'Error deleting user'
        });
    }
});

// Get deleted users (Admin only)
app.get('/api/deleted-users', verifyToken, verifyAdmin, async (req, res) => {
    try {
        const {
            page = 1,
            limit = 10,
            search,
            dateFrom,
            dateTo
        } = req.query;

        const filter = {};

        if (search) {
            filter.$or = [
                { name: { $regex: search, $options: 'i' } },
                { email: { $regex: search, $options: 'i' } }
            ];
        }

        if (dateFrom || dateTo) {
            filter.deletedAt = {};
            if (dateFrom) filter.deletedAt.$gte = new Date(dateFrom);
            if (dateTo) filter.deletedAt.$lte = new Date(dateTo);
        }

        const total = await dbCollections.deletedUsers.countDocuments(filter);

        const deletedUsers = await dbCollections.deletedUsers
            .find(filter)
            .sort({ deletedAt: -1 })
            .skip((page - 1) * limit)
            .limit(parseInt(limit))
            .project({
                password: 0,
                failedLoginAttempts: 0
            })
            .toArray();

        res.json({
            success: true,
            deletedUsers,
            pagination: {
                total,
                page: parseInt(page),
                pages: Math.ceil(total / limit)
            }
        });

    } catch (error) {
        logError('Fetching Deleted Users', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching deleted users'
        });
    }
});

// RBAC Endpoints

// Get user permissions
app.get('/api/users/:userId/permissions', verifyToken, async (req, res) => {
    try {
        const { userId } = req.params;

        const permissions = await dbCollections.userPermissions.findOne(
            { userId: new ObjectId(userId) }
        );

        if (!permissions) {
            return res.json({
                success: true,
                permissions: []
            });
        }

        res.json({
            success: true,
            permissions: permissions.permissions
        });

    } catch (error) {
        logError('Fetching User Permissions', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching user permissions'
        });
    }
});

// Update user permissions
app.put('/api/users/:userId/permissions', verifyToken, verifyAdmin, async (req, res) => {
    try {
        const { userId } = req.params;
        const { permissions } = req.body;

        if (!Array.isArray(permissions)) {
            return res.status(400).json({
                success: false,
                message: 'Permissions must be an array'
            });
        }

        // Verify user exists
        const userExists = await dbCollections.users.findOne(
            { _id: new ObjectId(userId) }
        );

        if (!userExists) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        // Update permissions
        await dbCollections.userPermissions.updateOne(
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

        // Create audit log
        await dbCollections.audit_logs.insertOne({
            action: 'PERMISSIONS_UPDATED',
            performedBy: new ObjectId(req.user.userId),
            targetUser: new ObjectId(userId),
            details: {
                newPermissions: permissions
            },
            timestamp: new Date()
        });

        res.json({
            success: true,
            message: 'Permissions updated successfully'
        });

    } catch (error) {
        logError('Updating User Permissions', error);
        res.status(500).json({
            success: false,
            message: 'Error updating user permissions'
        });
    }
});
// Restore deleted user (Admin only)
app.post('/api/deleted-users/:userId/restore', verifyToken, verifyAdmin, async (req, res) => {
    try {
        const { userId } = req.params;
        const session = client.startSession();

        try {
            await session.withTransaction(async () => {
                // Find deleted user
                const deletedUser = await dbCollections.deletedUsers.findOne(
                    { originalId: new ObjectId(userId) },
                    { session }
                );

                if (!deletedUser) {
                    throw new Error('Deleted user not found');
                }

                // Check if email is still available
                const emailExists = await dbCollections.users.findOne(
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
                await dbCollections.users.insertOne(restoredUser, { session });

                // Restore permissions if they existed
                if (deletedUser.permissions && deletedUser.permissions.length > 0) {
                    await dbCollections.userPermissions.insertOne({
                        userId: restoredUser._id,
                        permissions: deletedUser.permissions,
                        createdAt: new Date(),
                        createdBy: new ObjectId(req.user.userId)
                    }, { session });
                }

                // Remove from deleted_users
                await dbCollections.deletedUsers.deleteOne(
                    { originalId: new ObjectId(userId) },
                    { session }
                );

                // Create audit log
                await dbCollections.audit_logs.insertOne({
                    action: 'USER_RESTORED',
                    performedBy: new ObjectId(req.user.userId),
                    targetUser: restoredUser._id,
                    details: {
                        originalId: userId,
                        restoredUser: restoredUser
                    },
                    timestamp: new Date()
                }, { session });
            });

            await session.endSession();

            res.json({
                success: true,
                message: 'User restored successfully'
            });

        } catch (error) {
            await session.abortTransaction();
            throw error;
        }

    } catch (error) {
        logError('Restoring User', error);
        res.status(error.message.includes('not found') ? 404 : 500).json({
            success: false,
            message: error.message || 'Error restoring user'
        });
    }
});

// Get audit logs (Admin only)
app.get('/api/audit-logs', verifyToken, verifyAdmin, async (req, res) => {
    try {
        const {
            page = 1,
            limit = 50,
            action,
            userId,
            dateFrom,
            dateTo
        } = req.query;

        const filter = {};

        if (action) filter.action = action;
        if (userId) filter.targetUser = new ObjectId(userId);

        if (dateFrom || dateTo) {
            filter.timestamp = {};
            if (dateFrom) filter.timestamp.$gte = new Date(dateFrom);
            if (dateTo) filter.timestamp.$lte = new Date(dateTo);
        }

        const total = await dbCollections.audit_logs.countDocuments(filter);

        const logs = await dbCollections.audit_logs
            .find(filter)
            .sort({ timestamp: -1 })
            .skip((page - 1) * limit)
            .limit(parseInt(limit))
            .toArray();

        // Populate user details for the logs
        const populatedLogs = await Promise.all(logs.map(async (log) => {
            const performer = await dbCollections.users.findOne(
                { _id: log.performedBy },
                { projection: { name: 1, email: 1 } }
            );

            return {
                ...log,
                performedByUser: performer || { name: 'Deleted User' }
            };
        }));

        res.json({
            success: true,
            logs: populatedLogs,
            pagination: {
                total,
                page: parseInt(page),
                pages: Math.ceil(total / limit)
            }
        });

    } catch (error) {
        logError('Fetching Audit Logs', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching audit logs'
        });
    }
});

// Global error handling middleware
app.use((err, req, res, next) => {
    logError('Global Error Handler', err);
    
    // Handle specific error types
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

    // Default error response
    res.status(err.status || 500).json({
        success: false,
        message: err.message || 'Internal server error'
    });
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
    logError('Uncaught Exception', error);
    // Perform any necessary cleanup
    process.exit(1);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
    logError('Unhandled Rejection', reason);
    // Perform any necessary cleanup
    process.exit(1);
});

// Graceful shutdown
process.on('SIGTERM', async () => {
    console.log('SIGTERM received. Starting graceful shutdown...');
    try {
        await client.close();
        console.log('MongoDB connection closed.');
        process.exit(0);
    } catch (error) {
        logError('Shutdown Error', error);
        process.exit(1);
    }
});

// Server initialization
const PORT = process.env.PORT || 8080;
const server = app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on port ${PORT}`);
});

// Enable keep-alive connections
server.keepAliveTimeout = 65000;
server.headersTimeout = 66000;

module.exports = app;

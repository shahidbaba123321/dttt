const express = require('express');
const cors = require('cors');
const { MongoClient, ObjectId } = require('mongodb');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
const { validationResult } = require('express-validator');
require('dotenv').config();

// Redis Configuration
const app = express();
let redis = null;
let RedisStore = null;

app.set('trust proxy', 1);

// Rate limiter configuration
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // Limit each IP to 100 requests per windowMs
    standardHeaders: true,
    legacyHeaders: false,
    message: {
        success: false,
        message: 'Too many requests, please try again later.'
    }
});

// Authentication rate limiter
const authLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 5, // 5 failed attempts per hour
    standardHeaders: true,
    legacyHeaders: false,
    message: {
        success: false,
        message: 'Too many failed attempts, please try again later'
    }
});

// Define CORS options
const corsOptions = {
    origin: process.env.FRONTEND_URL || 'https://main.d1cfw592vg73f.amplifyapp.com',
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

// Middleware
app.use(cors(corsOptions));
app.use(express.json());
app.use(helmet());
app.use(compression());
app.use(morgan('combined'));
app.use(limiter);
app.use('/api/login', authLimiter);

// Error logging middleware
app.use((err, req, res, next) => {
    console.error('Global error:', {
        message: err.message,
        stack: err.stack,
        code: err.code,
        name: err.name
    });
    
    res.status(500).json({
        success: false,
        message: 'Internal server error',
        debug: process.env.NODE_ENV === 'development' ? {
            error: err.message,
            type: err.name,
            code: err.code
        } : undefined
    });
});

// Request logging
app.use((req, res, next) => {
    console.log(`${req.method} ${req.url}`, {
        body: req.body,
        headers: req.headers
    });
    next();
});

// Cache middleware
const cacheMiddleware = (duration) => {
    const memoryCache = new Map();

    return async (req, res, next) => {
        if (req.method !== 'GET') {
            return next();
        }

        const key = `cache:${req.originalUrl}`;
        try {
            let cachedResponse;

            if (redis) {
                cachedResponse = await redis.get(key);
            } else {
                cachedResponse = memoryCache.get(key);
            }

            if (cachedResponse) {
                return res.json(JSON.parse(cachedResponse));
            }

            res.sendResponse = res.json;
            res.json = (body) => {
                const stringifiedBody = JSON.stringify(body);
                if (redis) {
                    redis.setex(key, duration, stringifiedBody);
                } else {
                    memoryCache.set(key, stringifiedBody);
                    setTimeout(() => memoryCache.delete(key), duration * 1000);
                }
                res.sendResponse(body);
            };

            next();
        } catch (error) {
            console.error('Cache error:', error);
            next();
        }
    };
};

// Cache invalidation helper
async function invalidateCache(pattern) {
    try {
        if (redis) {
            const keys = await redis.keys(pattern);
            if (keys.length) {
                await redis.del(keys);
            }
        }
        console.log(`Cache invalidation requested for pattern: ${pattern}`);
    } catch (error) {
        console.error('Cache invalidation error:', error);
    }
}

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
let roles;
let role_permissions;
let user_role_assignments;
let sessions;

// Initialize Redis separately after ensuring connection
async function initializeRedis() {
    try {
        const Redis = require('ioredis');
        const RedisStore = require('rate-limit-redis');

        redisClient = new Redis({
            host: process.env.REDIS_HOST || 'localhost',
            port: process.env.REDIS_PORT || 6379,
            password: process.env.REDIS_PASSWORD,
            retryStrategy: (times) => {
                const delay = Math.min(times * 50, 2000);
                return delay;
            }
        });

        await new Promise((resolve, reject) => {
            redisClient.on('connect', resolve);
            redisClient.on('error', reject);
        });

        console.log('Redis connected successfully');

        const redisStore = new RedisStore({
            sendCommand: (...args) => redisClient.call(...args),
            prefix: 'rl:'
        });

        limiter.store = redisStore;
        authLimiter.store = redisStore;

        return redisClient;
    } catch (error) {
        console.warn('Redis initialization failed, using memory store:', error.message);
        return null;
    }
}


// Initialize default data
async function initializeDefaultData() {
    try {
        // Check and initialize default roles
        const rolesCount = await roles.countDocuments();
        if (rolesCount === 0) {
            console.log('Initializing default roles...');
            await initializeDefaultRoles();
        }

        // Check and initialize default permissions
        const permissionsCount = await database.collection('permissions').countDocuments();
        if (permissionsCount === 0) {
            console.log('Initializing default permissions...');
            await initializeDefaultPermissions();
        }

        console.log('Default data initialization completed');
    } catch (error) {
        console.error('Error initializing default data:', error);
        throw error;
    }
}

// Initialize default roles
async function initializeDefaultRoles() {
    const defaultRoles = {
        superadmin: {
            name: 'Superadmin',
            description: 'Full system access with no restrictions',
            permissions: ['all'],
            isDefault: true,
            isSystem: true
        },
        admin: {
            name: 'Admin',
            description: 'System administrator with extensive access rights',
            permissions: [
                'view_users',
                'manage_users',
                'view_roles',
                'manage_roles',
                'view_dashboard',
                'view_settings',
                'manage_settings'
            ],
            isDefault: true
        },
        user: {
            name: 'User',
            description: 'Regular user access',
            permissions: [
                'view_dashboard',
                'view_profile'
            ],
            isDefault: true
        }
    };

    try {
        for (const [key, role] of Object.entries(defaultRoles)) {
            await roles.updateOne(
                { name: role.name },
                { 
                    $setOnInsert: { 
                        ...role,
                        createdAt: new Date(),
                        updatedAt: new Date()
                    }
                },
                { upsert: true }
            );

            // Create role permissions
            if (role.permissions && role.permissions.length > 0) {
                const roleDoc = await roles.findOne({ name: role.name });
                if (roleDoc) {
                    await role_permissions.updateOne(
                        { roleId: roleDoc._id },
                        {
                            $set: {
                                permissions: role.permissions,
                                updatedAt: new Date()
                            }
                        },
                        { upsert: true }
                    );
                }
            }
        }
        console.log('Default roles initialized');
    } catch (error) {
        console.error('Error initializing default roles:', error);
        throw error;
    }
}

// Initialize default permissions
async function initializeDefaultPermissions() {
    const defaultPermissions = [
        {
            name: 'view_dashboard',
            displayName: 'View Dashboard',
            category: 'Dashboard',
            description: 'Can view dashboard'
        },
        {
            name: 'view_users',
            displayName: 'View Users',
            category: 'User Management',
            description: 'Can view user list and details'
        },
        {
            name: 'manage_users',
            displayName: 'Manage Users',
            category: 'User Management',
            description: 'Can create, edit, and delete users'
        },
        {
            name: 'view_roles',
            displayName: 'View Roles',
            category: 'Role Management',
            description: 'Can view roles and permissions'
        },
        {
            name: 'manage_roles',
            displayName: 'Manage Roles',
            category: 'Role Management',
            description: 'Can create, edit, and delete roles'
        },
        {
            name: 'view_settings',
            displayName: 'View Settings',
            category: 'Settings',
            description: 'Can view system settings'
        },
        {
            name: 'manage_settings',
            displayName: 'Manage Settings',
            category: 'Settings',
            description: 'Can modify system settings'
        },
        {
            name: 'view_profile',
            displayName: 'View Profile',
            category: 'Profile',
            description: 'Can view own profile'
        }
    ];

    try {
        await database.collection('permissions').insertMany(defaultPermissions, { 
            ordered: false 
        });
        console.log('Default permissions initialized');
    } catch (error) {
        if (error.code !== 11000) { // Ignore duplicate key errors
            console.error('Error initializing permissions:', error);
            throw error;
        }
    }
}


// Initialize database connection and collections
async function initializeDatabase() {
    try {
        await client.connect();
        console.log("Connected to MongoDB Atlas");
        
        database = client.db('infocraftorbis');

        // List of required collections
        const collectionsToCreate = [
            'users',
            'audit_logs',
            'deleted_users',
            'user_permissions',
            'roles',
            'role_permissions',
            'user_role_assignments',
            'sessions'
        ];

        // Create collections if they don't exist
        for (const collectionName of collectionsToCreate) {
            try {
                await database.createCollection(collectionName);
                console.log(`Collection ${collectionName} created or already exists`);
            } catch (error) {
                if (error.code !== 48) { // 48 is the error code for "collection already exists"
                    console.warn(`Error creating collection ${collectionName}:`, error);
                }
            }
        }

        // Assign collections
        users = database.collection('users');
        audit_logs = database.collection('audit_logs');
        deleted_users = database.collection('deleted_users');
        user_permissions = database.collection('user_permissions');
        roles = database.collection('roles');
        role_permissions = database.collection('role_permissions');
        user_role_assignments = database.collection('user_role_assignments');
        sessions = database.collection('sessions');

        // Create necessary indexes
        const indexPromises = [
            // User-related indexes
            ensureIndex(users, { email: 1 }, { unique: true }),
            ensureIndex(users, { status: 1 }),
            ensureIndex(audit_logs, { timestamp: -1 }),
            ensureIndex(deleted_users, { originalId: 1 }),
            ensureIndex(user_permissions, { userId: 1 }, { unique: true }),

            // Role and permission indexes
            ensureIndex(roles, { name: 1 }, { unique: true }),
            ensureIndex(role_permissions, { roleId: 1 }, { unique: true }),
            ensureIndex(user_role_assignments, { userId: 1 }, { unique: true }),

            // Session indexes
            ensureIndex(sessions, { userId: 1 }),
            ensureIndex(sessions, { expires: 1 })
        ];

        await Promise.all(indexPromises);
        
        // Initialize default data
        await initializeDefaultData();

        console.log("Database collections and indexes initialized");
        
        return {
            database,
            users,
            audit_logs,
            deleted_users,
            user_permissions,
            roles,
            role_permissions,
            user_role_assignments,
            sessions
        };
    } catch (err) {
        console.error("MongoDB initialization error:", err);
        throw err;
    }
}

// Ensure index helper function
const ensureIndex = async (collection, indexSpec, options = {}) => {
    try {
        const indexName = options.name || Object.keys(indexSpec).map(key => `${key}_${indexSpec[key]}`).join('_');
        const existingIndexes = await collection.listIndexes().toArray();
        
        const indexExists = existingIndexes.some(idx => {
            const keyMatch = Object.keys(indexSpec).every(k => 
                idx.key[k] === indexSpec[k]
            );
            return keyMatch;
        });

        if (!indexExists) {
            await collection.createIndex(indexSpec, options);
            console.log(`Created index for ${collection.collectionName}`);
        }
    } catch (error) {
        console.warn(`Warning handling index for ${collection.collectionName}:`, error.message);
    }
};



// Authentication Endpoints
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

        // Check if token is in blacklist
        const isBlacklisted = await redis?.get(`blacklist:${token}`);
        if (isBlacklisted) {
            return res.status(401).json({
                success: false,
                message: 'Token has been invalidated'
            });
        }

        // Add user permissions to request
        const userPerms = await user_permissions.findOne({ userId: user._id });
        req.user.permissions = userPerms?.permissions || [];

        // Update last activity
        await users.updateOne(
            { _id: user._id },
            { $set: { lastActivity: new Date() } }
        );

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
            await createAuditLog(
                'UNAUTHORIZED_ACCESS_ATTEMPT',
                req.user.userId,
                null,
                {
                    requiredRole: 'admin',
                    userRole: req.user.role,
                    endpoint: req.originalUrl
                }
            );

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
// Registration endpoint
app.post('/api/register', async (req, res) => {
    try {
        const { email, password, role } = req.body;
        
        if (!email || !password || !role) {
            return res.status(400).json({ 
                success: false, 
                message: 'All fields are required' 
            });
        }

        const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
        if (!passwordRegex.test(password)) {
            return res.status(400).json({
                success: false,
                message: 'Password must be at least 8 characters long and include uppercase, lowercase, numbers, and special characters'
            });
        }

        const existingUser = await users.findOne({ 
            email: { $regex: new RegExp(`^${email}$`, 'i') } 
        });
        
        if (existingUser) {
            return res.status(400).json({ 
                success: false, 
                message: 'User already exists' 
            });
        }

        const hashedPassword = await bcrypt.hash(password, 12);

        const newUser = {
            email,
            password: hashedPassword,
            role,
            status: 'active',
            createdAt: new Date(),
            lastLogin: null,
            failedLoginAttempts: 0,
            passwordResetRequired: false,
            requires2FA: false,
            securityQuestions: [],
            lastPasswordChange: new Date(),
            passwordHistory: [],
            loginHistory: [],
            profile: {
                emailVerified: false,
                phoneVerified: false,
                lastProfileUpdate: new Date()
            },
            settings: {
                notifications: {
                    email: true,
                    inApp: true
                },
                timezone: 'UTC',
                language: 'en'
            }
        };

        const result = await users.insertOne(newUser);

        await user_permissions.insertOne({
            userId: result.insertedId,
            permissions: [],
            createdAt: new Date(),
            updatedAt: new Date()
        });

        await createAuditLog(
            'USER_REGISTERED',
            result.insertedId,
            result.insertedId,
            { 
                email, 
                role,
                ip: req.ip,
                userAgent: req.get('user-agent')
            }
        );

        res.status(201).json({ 
            success: true, 
            message: 'User registered successfully',
            userId: result.insertedId
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
app.post('/api/login', authLimiter, async (req, res) => {
    try {
        const { email, password } = req.body;

        // Find user with case-insensitive email check
        const user = await users.findOne({ 
            email: { $regex: new RegExp(`^${email}$`, 'i') } 
        });

        if (!user) {
            await security_logs.insertOne({
                type: 'FAILED_LOGIN',
                timestamp: new Date(),
                ip: req.ip,
                userAgent: req.get('user-agent'),
                attemptedEmail: email,
                reason: 'User not found'
            });

            return res.status(400).json({ 
                success: false, 
                message: 'Invalid credentials' 
            });
        }

        // Check if user is active
        if (user.status !== 'active') {
            await security_logs.insertOne({
                type: 'FAILED_LOGIN',
                timestamp: new Date(),
                ip: req.ip,
                userAgent: req.get('user-agent'),
                userId: user._id,
                reason: 'Account inactive'
            });

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
                await security_logs.insertOne({
                    type: 'FAILED_LOGIN',
                    timestamp: new Date(),
                    ip: req.ip,
                    userAgent: req.get('user-agent'),
                    userId: user._id,
                    reason: 'Account locked'
                });

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

            await security_logs.insertOne({
                type: 'FAILED_LOGIN',
                timestamp: new Date(),
                ip: req.ip,
                userAgent: req.get('user-agent'),
                userId: user._id,
                reason: 'Invalid password'
            });

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

        // Create session
        const session = {
            userId: user._id,
            token,
            ip: req.ip,
            userAgent: req.get('user-agent'),
            createdAt: new Date(),
            expires: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours
        };

        await sessions.insertOne(session);

        // Reset failed login attempts and update last login
        await users.updateOne(
            { _id: user._id },
            { 
                $set: { 
                    failedLoginAttempts: 0,
                    lastLogin: new Date()
                },
                $push: {
                    loginHistory: {
                        timestamp: new Date(),
                        ip: req.ip,
                        userAgent: req.get('user-agent'),
                        success: true
                    }
                }
            }
        );

        // Create audit log
        await createAuditLog(
            'USER_LOGIN',
            user._id,
            user._id,
            { 
                email: user.email,
                ip: req.ip,
                userAgent: req.get('user-agent')
            }
        );

        res.json({ 
            success: true, 
            token,
            user: {
                id: user._id,
                email: user.email,
                role: user.role,
                requires2FA: user.requires2FA,
                passwordResetRequired: user.passwordResetRequired
            },
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

// Logout endpoint
app.post('/api/logout', verifyToken, async (req, res) => {
    try {
        const token = req.headers.authorization?.split(' ')[1];

        // Add token to blacklist with expiry
        if (redis) {
            const decoded = jwt.decode(token);
            const expiryTime = decoded.exp - Math.floor(Date.now() / 1000);
            await redis.setex(`blacklist:${token}`, expiryTime, 'true');
        }

        // Remove session
        await sessions.deleteOne({
            userId: new ObjectId(req.user.userId),
            token: token
        });

        // Create audit log
        await createAuditLog(
            'USER_LOGOUT',
            req.user.userId,
            req.user.userId,
            {
                ip: req.ip,
                userAgent: req.get('user-agent')
            }
        );

        res.json({
            success: true,
            message: 'Logged out successfully'
        });

    } catch (error) {
        console.error('Logout error:', error);
        res.status(500).json({
            success: false,
            message: 'Error during logout'
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

        // Check if token is blacklisted
        if (redis) {
            const isBlacklisted = await redis.get(`blacklist:${token}`);
            if (isBlacklisted) {
                return res.status(401).json({
                    success: false,
                    message: 'Token has been invalidated'
                });
            }
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

        // Check if session exists
        const session = await sessions.findOne({
            userId: user._id,
            token: token
        });

        if (!session) {
            return res.status(401).json({
                success: false,
                message: 'Session not found'
            });
        }

        res.json({ 
            success: true, 
            user: {
                id: user._id,
                email: user.email,
                role: user.role,
                permissions: userPerms?.permissions || [],
                requires2FA: user.requires2FA,
                lastLogin: user.lastLogin
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



// Get all users with filtering and pagination
app.get('/api/users', verifyToken, async (req, res) => {
    try {
        const {
            page = 1,
            limit = 10,
            search,
            role,
            status,
            tfa
        } = req.query;

        // Build filter
        const filter = {};

        if (search) {
            filter.$or = [
                { name: { $regex: search, $options: 'i' } },
                { email: { $regex: search, $options: 'i' } }
            ];
        }

        if (role) filter.role = role;
        if (status) filter.status = status;
        if (tfa) filter.requires2FA = tfa === 'enabled';

        // Get total count
        const total = await users.countDocuments(filter);

        // Get users with pagination
        const usersList = await users
            .find(filter)
            .sort({ createdAt: -1 })
            .skip((parseInt(page) - 1) * parseInt(limit))
            .limit(parseInt(limit))
            .toArray();

        // Remove sensitive information
        const sanitizedUsers = usersList.map(user => {
            const { password, resetToken, resetTokenExpires, ...safeUser } = user;
            return safeUser;
        });

        res.json({
            success: true,
            data: sanitizedUsers,
            total,
            page: parseInt(page),
            totalPages: Math.ceil(total / parseInt(limit))
        });

    } catch (error) {
        console.error('Error fetching users:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching users'
        });
    }
});

// Get single user
app.get('/api/users/:userId', verifyToken, async (req, res) => {
    try {
        const { userId } = req.params;

        const user = await users.findOne({ 
            _id: new ObjectId(userId)
        });

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        // Remove sensitive information
        const { password, resetToken, resetTokenExpires, ...safeUser } = user;

        res.json({
            success: true,
            data: safeUser
        });

    } catch (error) {
        console.error('Error fetching user:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching user'
        });
    }
});

// Create new user
app.post('/api/users', verifyToken, verifyAdmin, async (req, res) => {
    try {
        const {
            name,
            email,
            password,
            department,
            role,
            requires2FA = false
        } = req.body;

        // Validate required fields
        if (!name || !email || !password || !role) {
            return res.status(400).json({
                success: false,
                message: 'Missing required fields'
            });
        }

        // Check if email exists
        const existingUser = await users.findOne({ 
            email: { $regex: new RegExp(`^${email}$`, 'i') }
        });

        if (existingUser) {
            return res.status(400).json({
                success: false,
                message: 'Email already exists'
            });
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 12);

        // Create user
        const newUser = {
            name,
            email,
            password: hashedPassword,
            department,
            role,
            requires2FA,
            status: 'active',
            createdAt: new Date(),
            createdBy: new ObjectId(req.user.userId),
            failedLoginAttempts: 0,
            lastLogin: null
        };

        const result = await users.insertOne(newUser);

        // Create audit log
        await createAuditLog(
            'USER_CREATED',
            req.user.userId,
            result.insertedId,
            {
                name,
                email,
                department,
                role
            }
        );

        res.status(201).json({
            success: true,
            message: 'User created successfully',
            data: {
                _id: result.insertedId,
                ...newUser,
                password: undefined
            }
        });

    } catch (error) {
        console.error('Error creating user:', error);
        res.status(500).json({
            success: false,
            message: 'Error creating user'
        });
    }
});

// Update user
app.put('/api/users/:userId', verifyToken, verifyAdmin, async (req, res) => {
    try {
        const { userId } = req.params;
        const {
            name,
            email,
            department,
            role,
            requires2FA,
            status
        } = req.body;

        const updateDoc = {
            $set: {
                ...(name && { name }),
                ...(email && { email }),
                ...(department && { department }),
                ...(role && { role }),
                ...(requires2FA !== undefined && { requires2FA }),
                ...(status && { status }),
                updatedAt: new Date(),
                updatedBy: new ObjectId(req.user.userId)
            }
        };

        const result = await users.updateOne(
            { _id: new ObjectId(userId) },
            updateDoc
        );

        if (result.matchedCount === 0) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        // Create audit log
        await createAuditLog(
            'USER_UPDATED',
            req.user.userId,
            userId,
            {
                updates: req.body
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

// Delete user
app.delete('/api/users/:userId', verifyToken, verifyAdmin, async (req, res) => {
    try {
        const { userId } = req.params;

        // Get user before deletion
        const user = await users.findOne({ _id: new ObjectId(userId) });

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        // Move to deleted_users collection
        await deleted_users.insertOne({
            ...user,
            deletedAt: new Date(),
            deletedBy: new ObjectId(req.user.userId)
        });

        // Delete user
        await users.deleteOne({ _id: new ObjectId(userId) });

        // Create audit log
        await createAuditLog(
            'USER_DELETED',
            req.user.userId,
            userId,
            {
                email: user.email,
                name: user.name
            }
        );

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

// Change user password
app.put('/api/users/:userId/password', verifyToken, verifyAdmin, async (req, res) => {
    try {
        const { userId } = req.params;
        const { password } = req.body;

        if (!password) {
            return res.status(400).json({
                success: false,
                message: 'Password is required'
            });
        }

        const hashedPassword = await bcrypt.hash(password, 12);

        const result = await users.updateOne(
            { _id: new ObjectId(userId) },
            {
                $set: {
                    password: hashedPassword,
                    passwordLastChanged: new Date(),
                    updatedAt: new Date(),
                    updatedBy: new ObjectId(req.user.userId)
                }
            }
        );

        if (result.matchedCount === 0) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        // Create audit log
        await createAuditLog(
            'USER_PASSWORD_CHANGED',
            req.user.userId,
            userId,
            {
                changedBy: req.user.userId
            }
        );

        res.json({
            success: true,
            message: 'Password changed successfully'
        });

    } catch (error) {
        console.error('Error changing password:', error);
        res.status(500).json({
            success: false,
            message: 'Error changing password'
        });
    }
});

// Get all roles
app.get('/api/roles', verifyToken, verifyAdmin, async (req, res) => {
    try {
        // Get pagination parameters
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const skip = (page - 1) * limit;

        // Get search and filter parameters
        const search = req.query.search;
        const filter = {};

        if (search) {
            filter.$or = [
                { name: { $regex: search, $options: 'i' } },
                { description: { $regex: search, $options: 'i' } }
            ];
        }

        // Get total count for pagination
        const totalRoles = await roles.countDocuments(filter);

        // Get roles with pagination
        const rolesList = await roles.find(filter)
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit)
            .toArray();

        // Enhance roles with user counts and additional data
        const enhancedRoles = await Promise.all(rolesList.map(async (role) => {
            const [usersCount, permissions] = await Promise.all([
                user_role_assignments.countDocuments({ roleId: role._id }),
                role_permissions.findOne({ roleId: role._id })
            ]);

            return {
                ...role,
                usersCount,
                permissions: permissions?.permissions || [],
                createdBy: await getUserInfo(role.createdBy),
                updatedBy: role.updatedBy ? await getUserInfo(role.updatedBy) : null
            };
        }));

        res.json({
            success: true,
            data: enhancedRoles,
            pagination: {
                total: totalRoles,
                page,
                totalPages: Math.ceil(totalRoles / limit),
                hasMore: page * limit < totalRoles
            }
        });
    } catch (error) {
        console.error('Error fetching roles:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching roles',
            error: error.message
        });
    }
});

// Get single role
app.get('/api/roles/:roleId', verifyToken, verifyAdmin, async (req, res) => {
    try {
        const { roleId } = req.params;

        if (!ObjectId.isValid(roleId)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid role ID format'
            });
        }

        const role = await roles.findOne({ 
            _id: new ObjectId(roleId) 
        });

        if (!role) {
            return res.status(404).json({
                success: false,
                message: 'Role not found'
            });
        }

        const [usersCount, permissions, userAssignments, auditLogs] = await Promise.all([
            user_role_assignments.countDocuments({ roleId: role._id }),
            role_permissions.findOne({ roleId: role._id }),
            user_role_assignments.find({ roleId: role._id }).limit(5).toArray(),
            audit_logs.find({ 
                'details.roleId': role._id 
            })
            .sort({ timestamp: -1 })
            .limit(10)
            .toArray()
        ]);

        const assignedUsers = await Promise.all(userAssignments.map(async (assignment) => {
            const user = await users.findOne(
                { _id: assignment.userId },
                { projection: { password: 0, resetToken: 0 } }
            );
            return user;
        }));

        res.json({
            success: true,
            data: {
                ...role,
                usersCount,
                permissions: permissions?.permissions || [],
                recentUsers: assignedUsers,
                auditLogs,
                createdBy: await getUserInfo(role.createdBy),
                updatedBy: role.updatedBy ? await getUserInfo(role.updatedBy) : null
            }
        });
    } catch (error) {
        console.error('Error fetching role details:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching role details',
            error: error.message
        });
    }
});

// Create role
app.post('/api/roles', verifyToken, verifyAdmin, async (req, res) => {
    const session = client.startSession();
    try {
        await session.withTransaction(async () => {
            const { name, description, permissions = [], isSystem = false } = req.body;

            // Validation
            if (!name || typeof name !== 'string' || name.trim().length < 3) {
                throw new Error('Role name must be at least 3 characters long');
            }

            if (description && description.length > 200) {
                throw new Error('Description cannot exceed 200 characters');
            }

            const nameRegex = /^[a-zA-Z0-9\s_-]+$/;
            if (!nameRegex.test(name)) {
                throw new Error('Role name can only contain letters, numbers, spaces, hyphens, and underscores');
            }

            // Check for existing role
            const existingRole = await roles.findOne({ 
                name: { $regex: new RegExp(`^${name}$`, 'i') }
            }, { session });

            if (existingRole) {
                throw new Error('Role name already exists');
            }

            // Create role
            const role = {
                name,
                description,
                isSystem,
                createdAt: new Date(),
                createdBy: new ObjectId(req.user.userId),
                updatedAt: new Date()
            };

            const result = await roles.insertOne(role, { session });

            // Create role permissions
            if (permissions.length > 0) {
                await role_permissions.insertOne({
                    roleId: result.insertedId,
                    permissions,
                    createdAt: new Date(),
                    createdBy: new ObjectId(req.user.userId)
                }, { session });
            }

            // Create audit log
            await createAuditLog(
                'ROLE_CREATED',
                req.user.userId,
                result.insertedId,
                {
                    roleName: name,
                    permissions,
                    isSystem
                },
                session
            );

            res.status(201).json({
                success: true,
                message: 'Role created successfully',
                data: {
                    _id: result.insertedId,
                    ...role,
                    permissions
                }
            });
        });
    } catch (error) {
        console.error('Error creating role:', error);
        res.status(error.message.includes('already exists') ? 400 : 500).json({
            success: false,
            message: error.message || 'Error creating role'
        });
    } finally {
        await session.endSession();
    }
});

// Update role permissions
app.put('/api/roles/:roleId/permissions', verifyToken, verifyAdmin, async (req, res) => {
    const session = client.startSession();
    try {
        await session.withTransaction(async () => {
            const { roleId } = req.params;
            const { permissions } = req.body;

            if (!ObjectId.isValid(roleId)) {
                throw new Error('Invalid role ID format');
            }

            if (!Array.isArray(permissions)) {
                throw new Error('Permissions must be an array');
            }

            const role = await roles.findOne({ 
                _id: new ObjectId(roleId) 
            }, { session });

            if (!role) {
                throw new Error('Role not found');
            }

            if (role.isSystem) {
                throw new Error('System roles cannot be modified');
            }

            const currentPermissions = await role_permissions.findOne({ 
                roleId: new ObjectId(roleId) 
            }, { session });

            await role_permissions.updateOne(
                { roleId: new ObjectId(roleId) },
                { 
                    $set: { 
                        permissions,
                        updatedAt: new Date(),
                        updatedBy: new ObjectId(req.user.userId)
                    }
                },
                { upsert: true, session }
            );

            await roles.updateOne(
                { _id: new ObjectId(roleId) },
                { 
                    $set: { 
                        updatedAt: new Date(),
                        updatedBy: new ObjectId(req.user.userId)
                    }
                },
                { session }
            );

            await createAuditLog(
                'ROLE_PERMISSIONS_UPDATED',
                req.user.userId,
                roleId,
                {
                    roleName: role.name,
                    previousPermissions: currentPermissions?.permissions || [],
                    newPermissions: permissions,
                    changes: {
                        added: permissions.filter(p => !currentPermissions?.permissions?.includes(p)),
                        removed: currentPermissions?.permissions?.filter(p => !permissions.includes(p))
                    }
                },
                session
            );

            res.json({
                success: true,
                message: 'Role permissions updated successfully',
                data: {
                    roleId,
                    permissions
                }
            });
        });
    } catch (error) {
        console.error('Error updating role permissions:', error);
        res.status(error.message.includes('not found') ? 404 : 500).json({
            success: false,
            message: error.message || 'Error updating role permissions'
        });
    } finally {
        await session.endSession();
    }
});

// Get Permissions
app.get('/api/permissions', verifyToken, verifyAdmin, async (req, res) => {
    try {
        let permissionsList = await database.collection('permissions').find().toArray();
        
        if (!permissionsList || permissionsList.length === 0) {
            await initializeDefaultPermissions();
            permissionsList = await database.collection('permissions').find().toArray();
        }

        // Process permissions sequentially to avoid too many concurrent operations
        const groupedPermissions = {};
        for (const permission of permissionsList) {
            const category = permission.category || 'General';
            if (!groupedPermissions[category]) {
                groupedPermissions[category] = [];
            }
            
            const usage = await countPermissionUsage(permission.name);
            groupedPermissions[category].push({
                ...permission,
                usageCount: usage
            });
        }

        const metadata = {
            totalPermissions: permissionsList.length,
            categories: Object.keys(groupedPermissions).length,
            lastUpdated: await getLastPermissionUpdate()
        };

        res.json({
            success: true,
            data: groupedPermissions,
            metadata
        });
    } catch (error) {
        console.error('Error fetching permissions:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching permissions',
            error: error.message
        });
    }
});

// Helper Functions
async function createAuditLog(action, performedBy, targetUser = null, details = {}) {
    try {
        const auditLog = {
            action,
            performedBy: performedBy ? new ObjectId(performedBy) : null,
            targetUser: targetUser ? new ObjectId(targetUser) : null,
            details,
            timestamp: new Date(),
            ip: details.ip || null,
            userAgent: details.userAgent || null
        };

        await audit_logs.insertOne(auditLog);
    } catch (error) {
        console.error('Error creating audit log:', error);
    }
}

async function getUserInfo(userId) {
    if (!userId) return null;
    const user = await users.findOne(
        { _id: new ObjectId(userId) },
        { projection: { name: 1, email: 1 } }
    );
    return user;
}

async function countPermissionUsage(permissionName) {
    return await role_permissions.countDocuments({
        permissions: permissionName
    });
}

async function getLastPermissionUpdate() {
    const lastUpdate = await audit_logs.findOne(
        { action: { $regex: /^PERMISSION_/ } },
        { sort: { timestamp: -1 } }
    );
    return lastUpdate?.timestamp || null;
}

// Graceful Shutdown Handler
async function gracefulShutdown(signal) {
    console.log(`${signal} received. Starting graceful shutdown...`);

    try {
        // Check if database is connected
        if (client) {
            try {
                // Check connection status
                const isConnected = await client.db().admin().ping();
                if (isConnected) {
                    // Close all active sessions if the collection exists
                    if (sessions) {
                        try {
                            await sessions.updateMany(
                                { expires: { $gt: new Date() } },
                                { $set: { expires: new Date() } }
                            );
                            console.log('Active sessions closed');
                        } catch (error) {
                            console.warn('Error closing sessions:', error);
                        }
                    }

                    // Close database connection
                    await client.close();
                    console.log('MongoDB connection closed');
                }
            } catch (error) {
                console.warn('Error checking MongoDB connection:', error);
            }
        }

        // Close Redis connection if available
        if (redisClient) {
            try {
                await redisClient.quit();
                console.log('Redis connection closed');
            } catch (error) {
                console.warn('Error closing Redis connection:', error);
            }
        }

        console.log('Shutdown completed');
        process.exit(0);
    } catch (error) {
        console.error('Error during shutdown:', error);
        process.exit(1);
    }
}

// Register shutdown handlers
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Handle uncaught exceptions and unhandled rejections
process.on('uncaughtException', (error) => {
    console.error('Uncaught Exception:', error);
    gracefulShutdown('Uncaught Exception');
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
    gracefulShutdown('Unhandled Rejection');
});

// Initialize application
const initializeApp = async () => {
    try {
        // Initialize database first
        await initializeDatabase();

        // Initialize Redis
        await initializeRedis();

        // Apply middleware
        app.use(cors(corsOptions));
        app.use(express.json());
        app.use(helmet());
        app.use(compression());
        app.use(morgan('combined'));
        app.use(limiter);
        app.use('/api/login', authLimiter);

        // Start server
        const PORT = process.env.PORT || 8080;
        const server = app.listen(PORT, '0.0.0.0', () => {
            console.log(`Server running on port ${PORT}`);
        });

        // Handle server errors
        server.on('error', (error) => {
            console.error('Server error:', error);
            gracefulShutdown('Server Error');
        });

    } catch (error) {
        console.error('Error initializing application:', error);
        process.exit(1);
    }
};

// Start the application
initializeApp().catch(error => {
    console.error('Application startup failed:', error);
    process.exit(1);
});

module.exports = app;

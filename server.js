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

const createRateLimiter = (options) => {
    const baseOptions = {
        windowMs: options.windowMs || 15 * 60 * 1000,
        max: options.max || 100,
        standardHeaders: true,
        legacyHeaders: false,
        message: {
            success: false,
            message: options.message || 'Too many requests, please try again later.'
        }
    };

    // If Redis is available, use it for storage
    if (redis) {
        const RedisStore = require('rate-limit-redis');
        return rateLimit({
            ...baseOptions,
            store: new RedisStore({
                sendCommand: (...args) => redis.call(...args)
            })
        });
    }

    // Fall back to memory store
    return rateLimit(baseOptions);
};

// Update the rate limiters
const limiter = createRateLimiter({
    windowMs: 15 * 60 * 1000,
    max: 100
});

const authLimiter = createRateLimiter({
    windowMs: 60 * 60 * 1000,
    max: 5,
    message: 'Too many failed attempts, please try again later'
});


// Define CORS options
const corsOptions = {
    origin: [
        'https://main.d1cfw592vg73f.amplifyapp.com',
        'https://18.215.160.136.nip.io'
    ],
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
                    redis.setex(key, duration, stringifiedBody).catch(console.error);
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
let companies;
let company_users;
let company_subscriptions;
let company_audit_logs;
let subscription_plans;
let roles;
let role_permissions;
let user_role_assignments;
let webhooks;
let api_keys;
let notifications;
let system_config;
let migration_jobs;
let security_logs;
let sessions;
let billing_history;

// Initialize Redis separately after ensuring connection
async function initializeRedis() {
    // Check if Redis is enabled via environment variable
    if (process.env.USE_REDIS !== 'true') {
        console.log('Redis is disabled by configuration. Using memory store.');
        return null;
    }

    try {
        const Redis = require('ioredis');
        
        const redisConfig = {
            host: process.env.REDIS_HOST,
            port: parseInt(process.env.REDIS_PORT),
            password: process.env.REDIS_PASSWORD,
            maxRetriesPerRequest: 1,
            retryStrategy: (times) => {
                if (times > 3) {
                    console.log('Redis connection failed after 3 attempts, falling back to memory store');
                    return null;
                }
                return Math.min(times * 100, 3000);
            },
            enableOfflineQueue: false
        };

        // Only attempt Redis connection if host is configured
        if (!redisConfig.host || redisConfig.host === 'localhost') {
            console.log('Redis host not configured. Using memory store.');
            return null;
        }

        const client = new Redis(redisConfig);

        // Set a timeout for the initial connection attempt
        const connectionTimeout = setTimeout(() => {
            client.disconnect();
            console.log('Redis connection timeout. Using memory store.');
        }, 5000);

        // Wait for connection
        await new Promise((resolve, reject) => {
            client.once('ready', () => {
                clearTimeout(connectionTimeout);
                console.log('Redis connected successfully');
                resolve();
            });

            client.once('error', (err) => {
                clearTimeout(connectionTimeout);
                console.log('Redis connection failed:', err.message);
                reject(err);
            });
        });

        return client;
    } catch (error) {
        console.log('Redis initialization failed:', error.message);
        return null;
    }
}
// Initialize database connection and collections
async function initializeDatabase() {
    try {
        await client.connect();
        console.log("Connected to MongoDB Atlas");
        
        database = client.db('infocraftorbis');

        // List of all collections to initialize
        const collectionsToCreate = [
            'users',
            'audit_logs',
            'deleted_users',
            'user_permissions',
            'companies',
            'company_users',
            'company_subscriptions',
            'company_audit_logs',
            'subscription_plans',
            'roles',
            'role_permissions',
            'user_role_assignments',
            'webhooks',
            'api_keys',
            'notifications',
            'system_config',
            'migration_jobs',
            'security_logs',
            'sessions',
            'billing_history'
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
        companies = database.collection('companies');
        company_users = database.collection('company_users');
        company_subscriptions = database.collection('company_subscriptions');
        company_audit_logs = database.collection('company_audit_logs');
        subscription_plans = database.collection('subscription_plans');
        roles = database.collection('roles');
        role_permissions = database.collection('role_permissions');
        user_role_assignments = database.collection('user_role_assignments');
        webhooks = database.collection('webhooks');
        api_keys = database.collection('api_keys');
        notifications = database.collection('notifications');
        system_config = database.collection('system_config');
        migration_jobs = database.collection('migration_jobs');
        security_logs = database.collection('security_logs');
        sessions = database.collection('sessions');
        billing_history = database.collection('billing_history');

        // Function to check and create index if needed
        const ensureIndex = async (collection, indexSpec, options = {}) => {
    try {
        // Check if index already exists
        const indexName = options.name || Object.keys(indexSpec).map(key => `${key}_${indexSpec[key]}`).join('_');
        const existingIndexes = await collection.listIndexes().toArray();
        
        const indexExists = existingIndexes.some(idx => {
            // Compare index specification
            const keyMatch = Object.keys(indexSpec).every(k => 
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
    } catch (error) {
        console.warn(`Warning handling index for ${collection.collectionName}:`, error.message);
    }
};

// Update the initialization promises in initializeDatabase
const indexPromises = [
    // User-related indexes
    ensureIndex(users, { email: 1 }, { unique: true }),
    ensureIndex(users, { status: 1 }),
    ensureIndex(audit_logs, { timestamp: -1 }),
    ensureIndex(deleted_users, { originalId: 1 }),
    ensureIndex(user_permissions, { userId: 1 }, { unique: true, name: 'user_permissions_userId' }),

    // Company-related indexes
    ensureIndex(companies, { name: 1 }, { unique: true }),
    ensureIndex(companies, { 'contactDetails.email': 1 }, { unique: true }),
    ensureIndex(companies, { status: 1 }),
    ensureIndex(company_users, { companyId: 1 }),
    ensureIndex(company_users, { email: 1 }, { unique: true }),
    ensureIndex(company_subscriptions, { companyId: 1 }, { unique: true }),
    ensureIndex(company_audit_logs, { companyId: 1 }),

    // Role and permission indexes
    ensureIndex(roles, { name: 1 }, { unique: true }),
    ensureIndex(role_permissions, { roleId: 1 }, { unique: true }),
    ensureIndex(user_role_assignments, { userId: 1 }, { unique: true }),

    // Integration and security indexes
    ensureIndex(webhooks, { companyId: 1 }),
    ensureIndex(api_keys, { companyId: 1 }),
    ensureIndex(notifications, { companyId: 1 }),
    ensureIndex(security_logs, { timestamp: -1 }),
    ensureIndex(security_logs, { type: 1 }),
    ensureIndex(sessions, { userId: 1 }),
    ensureIndex(sessions, { expires: 1 }),
    ensureIndex(migration_jobs, { status: 1 }),

     // Add billing history indexes
            ensureIndex(billing_history, { companyId: 1 }),
            ensureIndex(billing_history, { invoiceNumber: 1 }, { unique: true }),
            ensureIndex(billing_history, { date: -1 })
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
            companies,
            company_users,
            company_subscriptions,
            company_audit_logs,
            subscription_plans,
            roles,
            role_permissions,
            user_role_assignments,
            webhooks,
            api_keys,
            notifications,
            system_config,
            migration_jobs,
            security_logs,
            sessions,
            billing_history
        };
    } catch (err) {
        console.error("MongoDB initialization error:", err);
        throw err;
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

        // Check and initialize default subscription plans
        const plansCount = await subscription_plans.countDocuments();
        if (plansCount === 0) {
            console.log('Initializing default subscription plans...');
            await initializeDefaultPlans();
        }

        // Check and initialize system configuration
        const configExists = await system_config.findOne({ type: 'global' });
        if (!configExists) {
            console.log('Initializing system configuration...');
            await initializeSystemConfig();
        }

        console.log('Default data initialization completed');
    } catch (error) {
        console.error('Error initializing default data:', error);
        throw error;
    }
}


async function initializeDefaultPermissions() {
    const defaultPermissions = [
        // Existing permissions
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

        // Add new UI/UX permissions
        // Dashboard permissions
        {
            name: 'view_dashboard',
            displayName: 'View Dashboard',
            category: 'Dashboard Access',
            description: 'Can access the dashboard overview'
        },

        // Companies/Organizations permissions
        {
            name: 'view_companies',
            displayName: 'View Companies',
            category: 'Company Management',
            description: 'Can view company list and details'
        },
        {
            name: 'manage_companies',
            displayName: 'Manage Companies',
            category: 'Company Management',
            description: 'Can create, edit, and delete companies'
        },

        // System Settings permissions
        {
            name: 'view_settings',
            displayName: 'View Settings',
            category: 'System Settings',
            description: 'Can view system settings'
        },
        {
            name: 'manage_settings',
            displayName: 'Manage Settings',
            category: 'System Settings',
            description: 'Can modify system settings'
        },
        {
            name: 'manage_pricing',
            displayName: 'Manage Pricing',
            category: 'System Settings',
            description: 'Can manage pricing and plans'
        },
        {
            name: 'manage_security',
            displayName: 'Manage Security',
            category: 'System Settings',
            description: 'Can manage security settings'
        },

        // Modules Management permissions
        {
            name: 'view_modules',
            displayName: 'View Modules',
            category: 'Module Management',
            description: 'Can view available modules'
        },
        {
            name: 'manage_modules',
            displayName: 'Manage Modules',
            category: 'Module Management',
            description: 'Can manage and configure modules'
        },

        // Analytics & Reports permissions
        {
            name: 'view_analytics',
            displayName: 'View Analytics',
            category: 'Analytics & Reports',
            description: 'Can view analytics and reports'
        },
        {
            name: 'manage_reports',
            displayName: 'Manage Reports',
            category: 'Analytics & Reports',
            description: 'Can create and manage custom reports'
        },

        // Backup & System Tools permissions
        {
            name: 'manage_backup',
            displayName: 'Manage Backup',
            category: 'System Tools',
            description: 'Can perform backup and restore operations'
        },
        {
            name: 'view_audit_logs',
            displayName: 'View Audit Logs',
            category: 'System Tools',
            description: 'Can view system audit logs'
        },
        {
            name: 'manage_api',
            displayName: 'Manage API',
            category: 'System Tools',
            description: 'Can manage API settings and keys'
        },

        // Support Center permissions
        {
            name: 'access_support',
            displayName: 'Access Support',
            category: 'Support',
            description: 'Can access support center'
        },
        {
            name: 'manage_support',
            displayName: 'Manage Support',
            category: 'Support',
            description: 'Can manage support tickets and resources'
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
                // User Management
                'view_users',
                'manage_users',
                'view_roles',
                'manage_roles',
                
                // Dashboard Access
                'view_dashboard',
                
                // Company Management
                'view_companies',
                'manage_companies',
                
                // System Settings
                'view_settings',
                'manage_settings',
                'manage_pricing',
                'manage_security',
                
                // Module Management
                'view_modules',
                'manage_modules',
                
                // Analytics & Reports
                'view_analytics',
                'manage_reports',
                
                // System Tools
                'manage_backup',
                'view_audit_logs',
                'manage_api',
                
                // Support
                'access_support',
                'manage_support'
            ],
            isDefault: true
        },
        hr_admin: {
            name: 'HR Admin',
            description: 'Manages HR functions and user accounts',
            permissions: [
                'view_dashboard',
                'view_users',
                'manage_users',
                'view_roles',
                'view_analytics',
                'access_support'
            ],
            isDefault: true
        },
        manager: {
            name: 'Manager',
            description: 'Department or team manager',
            permissions: [
                'view_dashboard',
                'view_users',
                'view_analytics',
                'access_support'
            ],
            isDefault: true
        },
        employee: {
            name: 'Employee',
            description: 'Regular employee access',
            permissions: [
                'view_dashboard',
                'access_support'
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


// Audit logging functions
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

// Middleware Functions

// Token verification middleware
const verifyToken = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        
        if (!authHeader) {
            return res.status(401).json({ 
                success: false, 
                message: 'No authorization header provided' 
            });
        }

        // Properly extract the token
        const parts = authHeader.split(' ');
        if (parts.length !== 2 || parts[0] !== 'Bearer') {
            return res.status(401).json({ 
                success: false, 
                message: 'Invalid authorization format. Use: Bearer <token>' 
            });
        }

        const token = parts[1];
        
        if (!token) {
            return res.status(401).json({ 
                success: false, 
                message: 'No token provided' 
            });
        }

        try {
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
                message: 'Invalid or expired token' 
            });
        }
    } catch (error) {
        console.error('Auth middleware error:', error);
        return res.status(500).json({ 
            success: false, 
            message: 'Internal server error during authentication' 
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



// Request validation middleware
const validateRequest = (validations) => {
    return async (req, res, next) => {
        await Promise.all(validations.map(validation => validation.run(req)));

        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                message: 'Validation error',
                errors: errors.array()
            });
        }
        next();
    };
};

// API Routes Start Here

// Test route
app.get('/', (req, res) => {
    res.json({ message: 'Server is running!' });
});
// Authentication Routes

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

        // Password strength validation
        const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
        if (!passwordRegex.test(password)) {
            return res.status(400).json({
                success: false,
                message: 'Password must be at least 8 characters long and include uppercase, lowercase, numbers, and special characters'
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
            { 
                email, 
                role,
                ip: req.ip,
                userAgent: req.get('user-agent')
            }
        );

        // Create security log
        await security_logs.insertOne({
            type: 'USER_REGISTRATION',
            userId: result.insertedId,
            timestamp: new Date(),
            ip: req.ip,
            userAgent: req.get('user-agent'),
            details: {
                email,
                role
            }
        });

        res.status(201).json({ 
            success: true, 
            message: 'User registered successfully',
            userId: result.insertedId
        });

    } catch (error) {
        console.error('Registration error:', error);
        
        await security_logs.insertOne({
            type: 'REGISTRATION_ERROR',
            timestamp: new Date(),
            ip: req.ip,
            userAgent: req.get('user-agent'),
            error: error.message
        });

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

        // Create security log
        await security_logs.insertOne({
            type: 'SUCCESSFUL_LOGIN',
            timestamp: new Date(),
            ip: req.ip,
            userAgent: req.get('user-agent'),
            userId: user._id
        });

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
        
        await security_logs.insertOne({
            type: 'LOGIN_ERROR',
            timestamp: new Date(),
            ip: req.ip,
            userAgent: req.get('user-agent'),
            error: error.message
        });

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

// Password reset request
app.post('/api/reset-password-request', async (req, res) => {
    try {
        const { email } = req.body;

        const user = await users.findOne({ 
            email: { $regex: new RegExp(`^${email}$`, 'i') },
            status: 'active'
        });

        if (!user) {
            return res.status(400).json({
                success: false,
                message: 'If the email exists, reset instructions will be sent'
            });
        }

        // Generate reset token
        const resetToken = crypto.randomBytes(32).toString('hex');
        const hashedToken = await bcrypt.hash(resetToken, 12);

        // Save reset token
        await users.updateOne(
            { _id: user._id },
            {
                $set: {
                    resetToken: hashedToken,
                    resetTokenExpires: new Date(Date.now() + 3600000) // 1 hour
                }
            }
        );

        // Create audit log
        await createAuditLog(
            'PASSWORD_RESET_REQUESTED',
            user._id,
            user._id,
            {
                ip: req.ip,
                userAgent: req.get('user-agent')
            }
        );

        // In a production environment, send email here
        console.log('Reset token for development:', resetToken);

        res.json({
            success: true,
            message: 'If the email exists, reset instructions will be sent',
            // Only include token in development
            ...(process.env.NODE_ENV === 'development' && { resetToken })
        });

    } catch (error) {
        console.error('Password reset request error:', error);
        res.status(500).json({
            success: false,
            message: 'Error processing password reset request'
        });
    }
});

// Reset password
app.post('/api/reset-password', async (req, res) => {
    try {
        const { token, password } = req.body;

        // Validate password strength
        const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
        if (!passwordRegex.test(password)) {
            return res.status(400).json({
                success: false,
                message: 'Password must meet security requirements'
            });
        }

        // Find user with valid reset token
        const user = await users.findOne({
            resetTokenExpires: { $gt: new Date() }
        });

        if (!user) {
            return res.status(400).json({
                success: false,
                message: 'Invalid or expired reset token'
            });
        }

        // Verify token
        const validToken = await bcrypt.compare(token, user.resetToken);
        if (!validToken) {
            return res.status(400).json({
                success: false,
                message: 'Invalid or expired reset token'
            });
        }

        // Check password history
        const passwordHistory = user.passwordHistory || [];
        for (const oldPassword of passwordHistory) {
            const matchesOld = await bcrypt.compare(password, oldPassword.password);
            if (matchesOld) {
                return res.status(400).json({
                    success: false,
                    message: 'Cannot reuse recent passwords'
                });
            }
        }

        // Hash new password
        const hashedPassword = await bcrypt.hash(password, 12);

        // Update user
        await users.updateOne(
            { _id: user._id },
            {
                $set: {
                    password: hashedPassword,
                    resetToken: null,
                    resetTokenExpires: null,
                    passwordLastChanged: new Date(),
                    passwordResetRequired: false
                },
                $push: {
                    passwordHistory: {
                        $each: [{
                            password: user.password,
                            changedAt: new Date()
                        }],
                        $slice: -5 // Keep last 5 passwords
                    }
                }
            }
        );

        // Invalidate all existing sessions
        await sessions.deleteMany({ userId: user._id });

        // Create audit log
        await createAuditLog(
            'PASSWORD_RESET_COMPLETED',
            user._id,
            user._id,
            {
                ip: req.ip,
                userAgent: req.get('user-agent')
            }
        );

        res.json({
            success: true,
            message: 'Password reset successful'
        });

    } catch (error) {
        console.error('Password reset error:', error);
        res.status(500).json({
            success: false,
            message: 'Error resetting password'
        });
    }
});
// User Profile Management Routes

// Get user profile
app.get('/api/users/profile', verifyToken, async (req, res) => {
    try {
        const user = await users.findOne(
            { _id: new ObjectId(req.user.userId) },
            { projection: { password: 0, resetToken: 0, resetTokenExpires: 0 } }
        );

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        // Get user's company information if exists
        const companyUser = await company_users.findOne({
            userId: new ObjectId(req.user.userId)
        });

        let companyInfo = null;
        if (companyUser) {
            companyInfo = await companies.findOne(
                { _id: companyUser.companyId },
                { projection: { name: 1, industry: 1 } }
            );
        }

        // Get user permissions
        const userPerms = await user_permissions.findOne({ userId: user._id });

        // Get recent activity
        const recentActivity = await audit_logs
            .find({ performedBy: user._id })
            .sort({ timestamp: -1 })
            .limit(10)
            .toArray();

        res.json({
            success: true,
            profile: {
                ...user,
                company: companyInfo,
                permissions: userPerms?.permissions || [],
                recentActivity
            }
        });

    } catch (error) {
        console.error('Error fetching user profile:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching user profile'
        });
    }
});

// Update user profile
app.put('/api/users/profile', verifyToken, async (req, res) => {
    try {
        const {
            name,
            phone,
            address,
            settings,
            notifications
        } = req.body;

        // Validate phone format if provided
        if (phone && !/^\+?[\d\s-]{10,}$/.test(phone)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid phone number format'
            });
        }

        const updateDoc = {
            $set: {
                ...(name && { name }),
                ...(phone && { phone }),
                ...(address && { address }),
                ...(settings && { settings }),
                ...(notifications && { 'settings.notifications': notifications }),
                updatedAt: new Date()
            }
        };

        const result = await users.updateOne(
            { _id: new ObjectId(req.user.userId) },
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
            'PROFILE_UPDATED',
            req.user.userId,
            req.user.userId,
            {
                changes: req.body,
                ip: req.ip,
                userAgent: req.get('user-agent')
            }
        );

        res.json({
            success: true,
            message: 'Profile updated successfully'
        });

    } catch (error) {
        console.error('Error updating user profile:', error);
        res.status(500).json({
            success: false,
            message: 'Error updating user profile'
        });
    }
});

// Change password
app.post('/api/users/change-password', verifyToken, async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;

        const user = await users.findOne({ _id: new ObjectId(req.user.userId) });

        // Verify current password
        const validPassword = await bcrypt.compare(currentPassword, user.password);
        if (!validPassword) {
            return res.status(400).json({
                success: false,
                message: 'Current password is incorrect'
            });
        }

        // Validate new password
        const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
        if (!passwordRegex.test(newPassword)) {
            return res.status(400).json({
                success: false,
                message: 'New password does not meet security requirements'
            });
        }

        // Check password history
        const passwordHistory = user.passwordHistory || [];
        for (const oldPassword of passwordHistory) {
            const matchesOld = await bcrypt.compare(newPassword, oldPassword.password);
            if (matchesOld) {
                return res.status(400).json({
                    success: false,
                    message: 'Cannot reuse recent passwords'
                });
            }
        }

        // Hash new password
        const hashedPassword = await bcrypt.hash(newPassword, 12);

        // Update password
        await users.updateOne(
            { _id: user._id },
            {
                $set: {
                    password: hashedPassword,
                    passwordLastChanged: new Date(),
                    passwordResetRequired: false
                },
                $push: {
                    passwordHistory: {
                        $each: [{
                            password: user.password,
                            changedAt: new Date()
                        }],
                        $slice: -5 // Keep last 5 passwords
                    }
                }
            }
        );

        // Invalidate all other sessions
        await sessions.deleteMany({
            userId: user._id,
            token: { $ne: req.headers.authorization?.split(' ')[1] }
        });

        // Create audit log
        await createAuditLog(
            'PASSWORD_CHANGED',
            user._id,
            user._id,
            {
                ip: req.ip,
                userAgent: req.get('user-agent')
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

// Enable/Disable 2FA
app.post('/api/users/2fa/toggle', verifyToken, async (req, res) => {
    try {
        const { enable } = req.body;

        const user = await users.findOne({ _id: new ObjectId(req.user.userId) });

        if (enable) {
            // Generate 2FA secret
            const secret = crypto.randomBytes(20).toString('hex');
            const qrCode = await generateQRCode(secret, user.email);

            await users.updateOne(
                { _id: user._id },
                {
                    $set: {
                        '2fa.secret': secret,
                        '2fa.enabled': false,
                        '2fa.pending': true
                    }
                }
            );

            res.json({
                success: true,
                message: '2FA setup initiated',
                data: {
                    secret,
                    qrCode
                }
            });
        } else {
            await users.updateOne(
                { _id: user._id },
                {
                    $set: {
                        '2fa.enabled': false,
                        '2fa.secret': null,
                        '2fa.pending': false
                    }
                }
            );

            // Create audit log
            await createAuditLog(
                'TWO_FA_DISABLED',
                user._id,
                user._id,
                {
                    ip: req.ip,
                    userAgent: req.get('user-agent')
                }
            );

            res.json({
                success: true,
                message: '2FA disabled successfully'
            });
        }

    } catch (error) {
        console.error('Error toggling 2FA:', error);
        res.status(500).json({
            success: false,
            message: 'Error toggling 2FA'
        });
    }
});
// Company Management Routes


// Helper functions
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

async function getUserInfo(userId) {
    if (!userId) return null;
    const user = await users.findOne(
        { _id: new ObjectId(userId) },
        { projection: { name: 1, email: 1 } }
    );
    return user;
}

// 1. Get All Roles
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

// 2. Get Single Role
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

// 3. Create Role
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

// 4. Update Role Permissions
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

// 5. Get Permissions
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
// Delete Role
app.delete('/api/roles/:roleId', verifyToken, verifyAdmin, async (req, res) => {
    const session = client.startSession();
    try {
        await session.withTransaction(async () => {
            const { roleId } = req.params;

            // Validate roleId format
            if (!ObjectId.isValid(roleId)) {
                throw new Error('Invalid role ID format');
            }

            // Get role and validate
            const role = await roles.findOne({ 
                _id: new ObjectId(roleId) 
            }, { session });

            if (!role) {
                throw new Error('Role not found');
            }

            if (role.isSystem) {
                throw new Error('System roles cannot be deleted');
            }

            // Check if role has assigned users
            const assignedUsersCount = await user_role_assignments.countDocuments({ 
                roleId: new ObjectId(roleId) 
            }, { session });

            if (assignedUsersCount > 0) {
                throw new Error(`Cannot delete role. ${assignedUsersCount} users are currently assigned to this role.`);
            }

            // Delete role permissions
            await role_permissions.deleteOne({ 
                roleId: new ObjectId(roleId) 
            }, { session });

            // Delete role
            await roles.deleteOne({ 
                _id: new ObjectId(roleId) 
            }, { session });

            // Create audit log
            await createAuditLog(
                'ROLE_DELETED',
                req.user.userId,
                roleId,
                {
                    roleName: role.name,
                    roleDetails: role,
                    deletedAt: new Date()
                },
                session
            );

            // Archive role data
            await database.collection('deleted_roles').insertOne({
                ...role,
                deletedAt: new Date(),
                deletedBy: new ObjectId(req.user.userId),
                originalId: role._id
            }, { session });

            res.json({
                success: true,
                message: 'Role deleted successfully',
                data: {
                    roleId,
                    roleName: role.name
                }
            });
        });
    } catch (error) {
        console.error('Error deleting role:', error);
        const statusCode = error.message.includes('not found') ? 404 :
                          error.message.includes('System roles') ? 403 :
                          error.message.includes('users are currently assigned') ? 400 :
                          500;
        
        res.status(statusCode).json({
            success: false,
            message: error.message || 'Error deleting role'
        });
    } finally {
        await session.endSession();
    }
});

// Add this endpoint if it's missing
app.put('/api/roles/:roleId', verifyToken, verifyAdmin, async (req, res) => {
    const session = client.startSession();
    try {
        await session.withTransaction(async () => {
            const { roleId } = req.params;
            const { name, description, isSystem } = req.body;

            // Validate roleId format
            if (!ObjectId.isValid(roleId)) {
                throw new Error('Invalid role ID format');
            }

            // Validate required fields
            if (!name || typeof name !== 'string' || name.trim().length < 3) {
                throw new Error('Role name must be at least 3 characters long');
            }

            // Get existing role
            const existingRole = await roles.findOne({ 
                _id: new ObjectId(roleId) 
            }, { session });

            if (!existingRole) {
                throw new Error('Role not found');
            }

            if (existingRole.isSystem) {
                throw new Error('System roles cannot be modified');
            }

            // Check if new name conflicts with other roles
            if (name !== existingRole.name) {
                const nameExists = await roles.findOne({
                    _id: { $ne: new ObjectId(roleId) },
                    name: { $regex: new RegExp(`^${name}$`, 'i') }
                }, { session });

                if (nameExists) {
                    throw new Error('Role name already exists');
                }
            }

            // Update role
            await roles.updateOne(
                { _id: new ObjectId(roleId) },
                { 
                    $set: { 
                        name,
                        description,
                        isSystem,
                        updatedAt: new Date(),
                        updatedBy: new ObjectId(req.user.userId)
                    }
                },
                { session }
            );

            // Create audit log
            await createAuditLog(
                'ROLE_UPDATED',
                req.user.userId,
                roleId,
                {
                    roleName: name,
                    previousName: existingRole.name,
                    changes: {
                        name: name !== existingRole.name,
                        description: description !== existingRole.description,
                        isSystem: isSystem !== existingRole.isSystem
                    }
                },
                session
            );

            // Get updated role
            const updatedRole = await roles.findOne({ 
                _id: new ObjectId(roleId) 
            }, { session });

            res.json({
                success: true,
                message: 'Role updated successfully',
                data: updatedRole
            });
        });
    } catch (error) {
        console.error('Error updating role:', error);
        res.status(
            error.message.includes('not found') ? 404 :
            error.message.includes('already exists') ? 400 :
            error.message.includes('System roles') ? 403 :
            500
        ).json({
            success: false,
            message: error.message || 'Error updating role'
        });
    } finally {
        await session.endSession();
    }
});

// User Management Routes

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

// Company Management Routes

// Get all companies with filtering and pagination
app.get('/api/companies', verifyToken, verifyAdmin, async (req, res) => {
    try {
        const {
            page = 1,
            limit = 10,
            search = '',
            industry = '',
            status = '',
            plan = ''
        } = req.query;

        // Build filter
        const filter = {};
        
        if (search) {
            filter.$or = [
                { name: { $regex: search, $options: 'i' } },
                { 'contactDetails.email': { $regex: search, $options: 'i' } }
            ];
        }
        
        if (industry) filter.industry = industry;
        if (status) filter.status = status;
        if (plan) filter.subscriptionPlan = plan;

        // Get total count
        const total = await companies.countDocuments(filter);

        // Get companies with pagination
        const companiesList = await companies
            .find(filter)
            .sort({ createdAt: -1 })
            .skip((parseInt(page) - 1) * parseInt(limit))
            .limit(parseInt(limit))
            .toArray();

        // Create audit log
        await createAuditLog(
            'COMPANIES_VIEWED',
            req.user.userId,
            null,
            {
                filters: req.query,
                resultsCount: companiesList.length
            }
        );

        res.json({
            success: true,
            companies: companiesList,
            total,
            page: parseInt(page),
            totalPages: Math.ceil(total / parseInt(limit))
        });

    } catch (error) {
        console.error('Error fetching companies:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching companies'
        });
    }
});

// Get single company with detailed information
app.get('/api/companies/:companyId', verifyToken, verifyAdmin, async (req, res) => {
    try {
        const { companyId } = req.params;

        if (!ObjectId.isValid(companyId)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid company ID'
            });
        }

        const company = await companies.findOne({
            _id: new ObjectId(companyId)
        });

        if (!company) {
            return res.status(404).json({
                success: false,
                message: 'Company not found'
            });
        }

        // Get additional company data
        const [
            usersCount,
            subscription,
            activityLogs
        ] = await Promise.all([
            company_users.countDocuments({ companyId: new ObjectId(companyId) }),
            company_subscriptions.findOne({ companyId: new ObjectId(companyId) }),
            company_audit_logs
                .find({ companyId: new ObjectId(companyId) })
                .sort({ timestamp: -1 })
                .limit(50)
                .toArray()
        ]);

        // Create audit log
        await createAuditLog(
            'COMPANY_DETAILS_VIEWED',
            req.user.userId,
            companyId,
            { companyName: company.name }
        );

        res.json({
            success: true,
            data: {
                ...company,
                usersCount,
                subscription,
                activityLogs
            }
        });

    } catch (error) {
        console.error('Error fetching company details:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching company details'
        });
    }
});

// Create new company
app.post('/api/companies', verifyToken, verifyAdmin, async (req, res) => {
    const session = client.startSession();
    try {
        await session.withTransaction(async () => {
            const {
                name,
                industry,
                companySize,
                contactDetails,
                subscriptionPlan,
                status
            } = req.body;

            // Validate required fields
            if (!name || !industry || !companySize || !contactDetails || !subscriptionPlan) {
                throw new Error('Missing required fields');
            }

            // Validate email format
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(contactDetails.email)) {
                throw new Error('Invalid email format');
            }

            // Check if company exists
            const existingCompany = await companies.findOne({
                $or: [
                    { name: { $regex: new RegExp(`^${name}$`, 'i') } },
                    { 'contactDetails.email': contactDetails.email }
                ]
            }, { session });

            if (existingCompany) {
                throw new Error('Company with this name or email already exists');
            }

            // Create company
            const company = {
                name,
                industry,
                companySize,
                contactDetails,
                subscriptionPlan,
                status: status || 'active',
                createdAt: new Date(),
                createdBy: new ObjectId(req.user.userId),
                updatedAt: new Date()
            };

            const result = await companies.insertOne(company, { session });

            // Create initial subscription
            const subscription = {
                companyId: result.insertedId,
                plan: subscriptionPlan,
                status: 'active',
                startDate: new Date(),
                endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
                billingCycle: 'monthly',
                price: this.getPlanPrice(subscriptionPlan),
                createdAt: new Date(),
                createdBy: new ObjectId(req.user.userId)
            };

            await company_subscriptions.insertOne(subscription, { session });

            // Create audit log
            await createAuditLog(
                'COMPANY_CREATED',
                req.user.userId,
                result.insertedId,
                {
                    companyName: name,
                    industry,
                    subscriptionPlan
                },
                session
            );

            res.status(201).json({
                success: true,
                message: 'Company created successfully',
                data: {
                    _id: result.insertedId,
                    ...company
                }
            });
        });
    } catch (error) {
        console.error('Error creating company:', error);
        res.status(error.message.includes('already exists') ? 400 : 500).json({
            success: false,
            message: error.message || 'Error creating company'
        });
    } finally {
        await session.endSession();
    }
});

// Update company
app.put('/api/companies/:companyId', verifyToken, verifyAdmin, async (req, res) => {
    const session = client.startSession();
    try {
        await session.withTransaction(async () => {
            const { companyId } = req.params;
            const updateData = req.body;

            if (!ObjectId.isValid(companyId)) {
                throw new Error('Invalid company ID');
            }

            // Get existing company
            const existingCompany = await companies.findOne({
                _id: new ObjectId(companyId)
            }, { session });

            if (!existingCompany) {
                throw new Error('Company not found');
            }

            // Check for name/email conflicts
            if (updateData.name || updateData.contactDetails?.email) {
                const conflicts = await companies.findOne({
                    _id: { $ne: new ObjectId(companyId) },
                    $or: [
                        updateData.name ? { name: { $regex: new RegExp(`^${updateData.name}$`, 'i') } } : null,
                        updateData.contactDetails?.email ? { 'contactDetails.email': updateData.contactDetails.email } : null
                    ].filter(Boolean)
                }, { session });

                if (conflicts) {
                    throw new Error('Company with this name or email already exists');
                }
            }

            // Update company
            const result = await companies.updateOne(
                { _id: new ObjectId(companyId) },
                {
                    $set: {
                        ...updateData,
                        updatedAt: new Date(),
                        updatedBy: new ObjectId(req.user.userId)
                    }
                },
                { session }
            );

            // Create audit log
            await createAuditLog(
                'COMPANY_UPDATED',
                req.user.userId,
                companyId,
                {
                    companyName: existingCompany.name,
                    changes: this.getChanges(existingCompany, updateData)
                },
                session
            );

            res.json({
                success: true,
                message: 'Company updated successfully',
                data: result
            });
        });
    } catch (error) {
        console.error('Error updating company:', error);
        res.status(error.message.includes('not found') ? 404 : 400).json({
            success: false,
            message: error.message || 'Error updating company'
        });
    } finally {
        await session.endSession();
    }
});

// Toggle company status
app.patch('/api/companies/:companyId/toggle-status', verifyToken, verifyAdmin, async (req, res) => {
    const session = client.startSession();
    try {
        await session.withTransaction(async () => {
            const { companyId } = req.params;

            if (!ObjectId.isValid(companyId)) {
                throw new Error('Invalid company ID');
            }

            const company = await companies.findOne({
                _id: new ObjectId(companyId)
            }, { session });

            if (!company) {
                throw new Error('Company not found');
            }

            const newStatus = company.status === 'active' ? 'inactive' : 'active';

            await companies.updateOne(
                { _id: new ObjectId(companyId) },
                {
                    $set: {
                        status: newStatus,
                        updatedAt: new Date(),
                        updatedBy: new ObjectId(req.user.userId)
                    }
                },
                { session }
            );

            // Update subscription status if company is deactivated
            if (newStatus === 'inactive') {
                await company_subscriptions.updateOne(
                    { companyId: new ObjectId(companyId) },
                    {
                        $set: {
                            status: 'suspended',
                            updatedAt: new Date(),
                            updatedBy: new ObjectId(req.user.userId)
                        }
                    },
                    { session }
                );
            }

            // Create audit log
            await createAuditLog(
                'COMPANY_STATUS_CHANGED',
                req.user.userId,
                companyId,
                {
                    companyName: company.name,
                    oldStatus: company.status,
                    newStatus
                },
                session
            );

            res.json({
                success: true,
                message: `Company ${newStatus === 'active' ? 'activated' : 'deactivated'} successfully`
            });
        });
    } catch (error) {
        console.error('Error toggling company status:', error);
        res.status(error.message.includes('not found') ? 404 : 500).json({
            success: false,
            message: error.message || 'Error toggling company status'
        });
    } finally {
        await session.endSession();
    }
});

// Get company users
app.get('/api/companies/:companyId/users', verifyToken, verifyAdmin, async (req, res) => {
    try {
        const { companyId } = req.params;

        if (!ObjectId.isValid(companyId)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid company ID'
            });
        }

        const users = await company_users
            .find({ companyId: new ObjectId(companyId) })
            .toArray();

        res.json({
            success: true,
            data: users
        });

    } catch (error) {
        console.error('Error fetching company users:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching company users'
        });
    }
});

// Helper function to get plan price
function getPlanPrice(plan) {
    const prices = {
        'basic': 99,
        'premium': 199,
        'enterprise': 499
    };
    return prices[plan.toLowerCase()] || 0;
}

// Helper function to get changes between objects
function getChanges(oldObj, newObj) {
    const changes = {};
    for (const key in newObj) {
        if (JSON.stringify(oldObj[key]) !== JSON.stringify(newObj[key])) {
            changes[key] = {
                old: oldObj[key],
                new: newObj[key]
            };
        }
    }
    return changes;
}

// Subscription Management Endpoints

// Change company subscription plan
app.post('/api/companies/:companyId/subscription', verifyToken, verifyAdmin, async (req, res) => {
    const session = client.startSession();
    try {
        await session.withTransaction(async () => {
            const { companyId } = req.params;
            const { plan, billingCycle } = req.body;

            if (!ObjectId.isValid(companyId)) {
                throw new Error('Invalid company ID');
            }

            // Validate plan
            const validPlans = ['basic', 'premium', 'enterprise'];
            if (!validPlans.includes(plan.toLowerCase())) {
                throw new Error('Invalid subscription plan');
            }

            // Validate billing cycle
            const validCycles = ['monthly', 'annual'];
            if (!validCycles.includes(billingCycle.toLowerCase())) {
                throw new Error('Invalid billing cycle');
            }

            const company = await companies.findOne({
                _id: new ObjectId(companyId)
            }, { session });

            if (!company) {
                throw new Error('Company not found');
            }

            // Calculate subscription details
            const startDate = new Date();
            const endDate = new Date();
            endDate.setMonth(endDate.getMonth() + (billingCycle === 'annual' ? 12 : 1));

            const basePrice = getPlanPrice(plan);
            const price = billingCycle === 'annual' ? basePrice * 12 * 0.9 : basePrice; // 10% discount for annual

            // Update company subscription
            await company_subscriptions.updateOne(
                { companyId: new ObjectId(companyId) },
                {
                    $set: {
                        plan,
                        billingCycle,
                        price,
                        startDate,
                        endDate,
                        status: 'active',
                        updatedAt: new Date(),
                        updatedBy: new ObjectId(req.user.userId)
                    },
                    $push: {
                        history: {
                            previousPlan: company.subscriptionPlan,
                            newPlan: plan,
                            changedAt: new Date(),
                            changedBy: new ObjectId(req.user.userId)
                        }
                    }
                },
                { upsert: true, session }
            );

            // Update company record
            await companies.updateOne(
                { _id: new ObjectId(companyId) },
                {
                    $set: {
                        subscriptionPlan: plan,
                        updatedAt: new Date(),
                        updatedBy: new ObjectId(req.user.userId)
                    }
                },
                { session }
            );

            // Create audit log
            await createAuditLog(
                'SUBSCRIPTION_CHANGED',
                req.user.userId,
                companyId,
                {
                    companyName: company.name,
                    oldPlan: company.subscriptionPlan,
                    newPlan: plan,
                    billingCycle,
                    price
                },
                session
            );

            // Generate invoice
            const invoice = await generateInvoice(company, plan, price, billingCycle);

            res.json({
                success: true,
                message: 'Subscription updated successfully',
                data: {
                    plan,
                    billingCycle,
                    price,
                    startDate,
                    endDate,
                    invoice
                }
            });
        });
    } catch (error) {
        console.error('Error updating subscription:', error);
        res.status(error.message.includes('not found') ? 404 : 400).json({
            success: false,
            message: error.message || 'Error updating subscription'
        });
    } finally {
        await session.endSession();
    }
});

// Get subscription history
app.get('/api/companies/:companyId/subscription/history', verifyToken, verifyAdmin, async (req, res) => {
    try {
        const { companyId } = req.params;

        if (!ObjectId.isValid(companyId)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid company ID'
            });
        }

        const history = await company_subscriptions
            .findOne(
                { companyId: new ObjectId(companyId) },
                { projection: { history: 1, billingHistory: 1 } }
            );

        res.json({
            success: true,
            data: history || { history: [], billingHistory: [] }
        });

    } catch (error) {
        console.error('Error fetching subscription history:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching subscription history'
        });
    }
});

// Generate invoice
app.post('/api/companies/:companyId/invoice', verifyToken, verifyAdmin, async (req, res) => {
    try {
        const { companyId } = req.params;

        if (!ObjectId.isValid(companyId)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid company ID'
            });
        }

        const company = await companies.findOne({
            _id: new ObjectId(companyId)
        });

        if (!company) {
            return res.status(404).json({
                success: false,
                message: 'Company not found'
            });
        }

        const subscription = await company_subscriptions.findOne({
            companyId: new ObjectId(companyId)
        });

        const invoice = await generateInvoice(
            company,
            subscription.plan,
            subscription.price,
            subscription.billingCycle
        );

        res.json({
            success: true,
            data: invoice
        });

    } catch (error) {
        console.error('Error generating invoice:', error);
        res.status(500).json({
            success: false,
            message: 'Error generating invoice'
        });
    }
});

// Company User Management Endpoints

// Add user to company
app.post('/api/companies/:companyId/users', verifyToken, verifyAdmin, async (req, res) => {
    const session = client.startSession();
    try {
        await session.withTransaction(async () => {
            const { companyId } = req.params;
            const { name, email, role, department } = req.body;

            if (!ObjectId.isValid(companyId)) {
                throw new Error('Invalid company ID');
            }

            // Validate required fields
            if (!name || !email || !role) {
                throw new Error('Missing required fields');
            }

            // Check if company exists and is active
            const company = await companies.findOne({
                _id: new ObjectId(companyId),
                status: 'active'
            }, { session });

            if (!company) {
                throw new Error('Company not found or inactive');
            }

            // Check if user email already exists
            const existingUser = await company_users.findOne({
                email: { $regex: new RegExp(`^${email}$`, 'i') }
            }, { session });

            if (existingUser) {
                throw new Error('User with this email already exists');
            }

            // Generate temporary password
            const tempPassword = crypto.randomBytes(10).toString('hex');
            const hashedPassword = await bcrypt.hash(tempPassword, 12);

            // Create user
            const user = {
                companyId: new ObjectId(companyId),
                name,
                email,
                password: hashedPassword,
                role,
                department,
                status: 'active',
                passwordResetRequired: true,
                createdAt: new Date(),
                createdBy: new ObjectId(req.user.userId),
                lastLogin: null
            };

            const result = await company_users.insertOne(user, { session });

            // Create audit log
            await createAuditLog(
                'COMPANY_USER_CREATED',
                req.user.userId,
                companyId,
                {
                    companyName: company.name,
                    userName: name,
                    userEmail: email,
                    userRole: role
                },
                session
            );

            // Send welcome email with temporary password
            // TODO: Implement email sending functionality

            res.status(201).json({
                success: true,
                message: 'User created successfully',
                data: {
                    _id: result.insertedId,
                    name,
                    email,
                    role,
                    department,
                    tempPassword // Only in development environment
                }
            });
        });
    } catch (error) {
        console.error('Error creating company user:', error);
        res.status(error.message.includes('already exists') ? 400 : 500).json({
            success: false,
            message: error.message || 'Error creating company user'
        });
    } finally {
        await session.endSession();
    }
});

// Update company user
app.put('/api/companies/:companyId/users/:userId', verifyToken, verifyAdmin, async (req, res) => {
    const session = client.startSession();
    try {
        await session.withTransaction(async () => {
            const { companyId, userId } = req.params;
            const updateData = req.body;

            if (!ObjectId.isValid(companyId) || !ObjectId.isValid(userId)) {
                throw new Error('Invalid company or user ID');
            }

            // Get existing user
            const existingUser = await company_users.findOne({
                _id: new ObjectId(userId),
                companyId: new ObjectId(companyId)
            }, { session });

            if (!existingUser) {
                throw new Error('User not found');
            }

            // Check email uniqueness if email is being updated
            if (updateData.email && updateData.email !== existingUser.email) {
                const emailExists = await company_users.findOne({
                    _id: { $ne: new ObjectId(userId) },
                    email: { $regex: new RegExp(`^${updateData.email}$`, 'i') }
                }, { session });

                if (emailExists) {
                    throw new Error('Email already in use');
                }
            }

            // Update user
            await company_users.updateOne(
                { _id: new ObjectId(userId) },
                {
                    $set: {
                        ...updateData,
                        updatedAt: new Date(),
                        updatedBy: new ObjectId(req.user.userId)
                    }
                },
                { session }
            );

            // Create audit log
            await createAuditLog(
                'COMPANY_USER_UPDATED',
                req.user.userId,
                companyId,
                {
                    userId,
                    changes: getChanges(existingUser, updateData)
                },
                session
            );

            res.json({
                success: true,
                message: 'User updated successfully'
            });
        });
    } catch (error) {
        console.error('Error updating company user:', error);
        res.status(error.message.includes('not found') ? 404 : 400).json({
            success: false,
            message: error.message || 'Error updating company user'
        });
    } finally {
        await session.endSession();
    }
});

// Reset user password
app.post('/api/companies/:companyId/users/:userId/reset-password', verifyToken, verifyAdmin, async (req, res) => {
    const session = client.startSession();
    try {
        await session.withTransaction(async () => {
            const { companyId, userId } = req.params;

            if (!ObjectId.isValid(companyId) || !ObjectId.isValid(userId)) {
                throw new Error('Invalid company or user ID');
            }

            const user = await company_users.findOne({
                _id: new ObjectId(userId),
                companyId: new ObjectId(companyId)
            }, { session });

            if (!user) {
                throw new Error('User not found');
            }

            // Generate new temporary password
            const tempPassword = crypto.randomBytes(10).toString('hex');
            const hashedPassword = await bcrypt.hash(tempPassword, 12);

            await company_users.updateOne(
                { _id: new ObjectId(userId) },
                {
                    $set: {
                        password: hashedPassword,
                        passwordResetRequired: true,
                        updatedAt: new Date(),
                        updatedBy: new ObjectId(req.user.userId)
                    }
                },
                { session }
            );

            // Create audit log
            await createAuditLog(
                'COMPANY_USER_PASSWORD_RESET',
                req.user.userId,
                companyId,
                {
                    userId,
                    userEmail: user.email
                },
                session
            );

            // TODO: Send email with new temporary password

            res.json({
                success: true,
                message: 'Password reset successfully',
                data: {
                    tempPassword // Only in development environment
                }
            });
        });
    } catch (error) {
        console.error('Error resetting user password:', error);
        res.status(error.message.includes('not found') ? 404 : 500).json({
            success: false,
            message: error.message || 'Error resetting user password'
        });
    } finally {
        await session.endSession();
    }
});

// Toggle user status
app.patch('/api/companies/:companyId/users/:userId/toggle-status', verifyToken, verifyAdmin, async (req, res) => {
    const session = client.startSession();
    try {
        await session.withTransaction(async () => {
            const { companyId, userId } = req.params;

            if (!ObjectId.isValid(companyId) || !ObjectId.isValid(userId)) {
                throw new Error('Invalid company or user ID');
            }

            const user = await company_users.findOne({
                _id: new ObjectId(userId),
                companyId: new ObjectId(companyId)
            }, { session });

            if (!user) {
                throw new Error('User not found');
            }

            const newStatus = user.status === 'active' ? 'inactive' : 'active';

            await company_users.updateOne(
                { _id: new ObjectId(userId) },
                {
                    $set: {
                        status: newStatus,
                        updatedAt: new Date(),
                        updatedBy: new ObjectId(req.user.userId)
                    }
                },
                { session }
            );

            // Create audit log
            await createAuditLog(
                'COMPANY_USER_STATUS_CHANGED',
                req.user.userId,
                companyId,
                {
                    userId,
                    userEmail: user.email,
                    oldStatus: user.status,
                    newStatus
                },
                session
            );

            res.json({
                success: true,
                message: `User ${newStatus === 'active' ? 'activated' : 'deactivated'} successfully`
            });
        });
    } catch (error) {
        console.error('Error toggling user status:', error);
        res.status(error.message.includes('not found') ? 404 : 500).json({
            success: false,
            message: error.message || 'Error toggling user status'
        });
    } finally {
        await session.endSession();
    }
});

// Get company billing history
app.get('/api/companies/:companyId/billing-history', verifyToken, verifyAdmin, async (req, res) => {
    try {
        const { companyId } = req.params;

        if (!ObjectId.isValid(companyId)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid company ID'
            });
        }

        // Get company billing history from the database
        const billingHistory = await database.collection('billing_history').find({
            companyId: new ObjectId(companyId)
        }).sort({ date: -1 }).toArray();

        // If no history exists, return empty array
        if (!billingHistory) {
            return res.json({
                success: true,
                data: []
            });
        }

        res.json({
            success: true,
            data: billingHistory
        });

    } catch (error) {
        console.error('Error fetching billing history:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching billing history'
        });
    }
});

// Generate invoice
app.post('/api/companies/:companyId/generate-invoice', verifyToken, verifyAdmin, async (req, res) => {
    try {
        const { companyId } = req.params;

        if (!ObjectId.isValid(companyId)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid company ID'
            });
        }

        const company = await companies.findOne({ _id: new ObjectId(companyId) });
        if (!company) {
            return res.status(404).json({
                success: false,
                message: 'Company not found'
            });
        }

        const subscription = await company_subscriptions.findOne({ 
            companyId: new ObjectId(companyId) 
        });

        // Generate invoice number
        const invoiceNumber = `INV-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

        // Create invoice record
        const invoice = {
            invoiceNumber,
            companyId: new ObjectId(companyId),
            date: new Date(),
            amount: subscription.price || 0,
            status: 'pending',
            items: [{
                description: `${subscription.plan} Plan Subscription`,
                quantity: 1,
                unitPrice: subscription.price || 0,
                total: subscription.price || 0
            }],
            billingDetails: {
                companyName: company.name,
                address: company.contactDetails.address,
                email: company.contactDetails.email
            },
            createdAt: new Date(),
            createdBy: new ObjectId(req.user.userId)
        };

        // Save invoice to billing history
        await database.collection('billing_history').insertOne(invoice);

        res.json({
            success: true,
            message: 'Invoice generated successfully',
            data: invoice
        });

    } catch (error) {
        console.error('Error generating invoice:', error);
        res.status(500).json({
            success: false,
            message: 'Error generating invoice'
        });
    }
});

// Download invoice
app.get('/api/invoices/:invoiceNumber/download', verifyToken, verifyAdmin, async (req, res) => {
    try {
        const { invoiceNumber } = req.params;

        // Get invoice from database
        const invoice = await database.collection('billing_history').findOne({
            invoiceNumber: invoiceNumber
        });

        if (!invoice) {
            return res.status(404).json({
                success: false,
                message: 'Invoice not found'
            });
        }

        // In a real implementation, you would generate a PDF here
        // For now, we'll just send the invoice data
        res.json({
            success: true,
            data: invoice
        });

    } catch (error) {
        console.error('Error downloading invoice:', error);
        res.status(500).json({
            success: false,
            message: 'Error downloading invoice'
        });
    }
});

// Get company activity logs
app.get('/api/companies/:companyId/activity-logs', verifyToken, verifyAdmin, async (req, res) => {
    try {
        const { companyId } = req.params;

        if (!ObjectId.isValid(companyId)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid company ID'
            });
        }

        const logs = await company_audit_logs
            .find({ 
                companyId: new ObjectId(companyId) 
            })
            .sort({ timestamp: -1 })
            .limit(50)
            .toArray();

        res.json({
            success: true,
            data: logs
        });

    } catch (error) {
        console.error('Error fetching activity logs:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching activity logs'
        });
    }
});

// Helper function to generate invoice
async function generateInvoice(company, plan, amount, billingCycle) {
    const invoiceNumber = `INV-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    
    const invoice = {
        invoiceNumber,
        companyId: company._id,
        companyName: company.name,
        companyAddress: company.contactDetails.address,
        plan,
        amount,
        billingCycle,
        issuedDate: new Date(),
        dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
        status: 'pending',
        items: [
            {
                description: `${plan.charAt(0).toUpperCase() + plan.slice(1)} Plan Subscription`,
                quantity: 1,
                unitPrice: amount,
                total: amount
            }
        ],
        subtotal: amount,
        tax: amount * 0.2, // 20% tax
        total: amount * 1.2,
        notes: `${billingCycle.charAt(0).toUpperCase() + billingCycle.slice(1)} billing cycle`
    };

    // Save invoice to database
    await database.collection('invoices').insertOne(invoice);

    return invoice;
}


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

        // Try to initialize Redis, but continue if it fails
        redis = await initializeRedis();

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
            console.log(`Redis status: ${redis ? 'Connected' : 'Disabled'}`);
        });

        // Handle server errors
        server.on('error', (error) => {
            console.error('Server error:', error);
            process.exit(1);
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

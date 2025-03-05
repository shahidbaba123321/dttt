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
let client = null;
let redis = null;
let RedisStore = null;


const app = express();

// Rate limiter configuration
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // Limit each IP to 100 requests per windowMs
    message: {
        success: false,
        message: 'Too many requests, please try again later.'
    }
});

// Authentication rate limiter
const authLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 5, // 5 failed attempts per hour
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

        // Wait for Redis connection
        await new Promise((resolve, reject) => {
            redisClient.on('connect', resolve);
            redisClient.on('error', reject);
        });

        console.log('Redis connected successfully');

        // Only setup Redis store after successful connection
        const redisStore = new RedisStore({
            sendCommand: (...args) => redisClient.call(...args),
            prefix: 'rl:'
        });

        // Update rate limiters with Redis store
        limiter.store = redisStore;
        authLimiter.store = redisStore;

        return redisClient;
    } catch (error) {
        console.warn('Redis initialization failed, using memory store:', error.message);
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
    ensureIndex(migration_jobs, { status: 1 })
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
            sessions
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
        // Add more permissions as needed
    ];

    try {
        await database.collection('permissions').insertMany(defaultPermissions, { ordered: false });
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
            permissions: ['all_except_superadmin'],
            isDefault: true
        },
        hr_admin: {
            name: 'HR Admin',
            description: 'Manages HR functions and user accounts',
            permissions: [
                'users_view',
                'users_create',
                'users_edit',
                'users_delete',
                'departments_manage',
                'attendance_manage'
            ],
            isDefault: true
        },
        manager: {
            name: 'Manager',
            description: 'Department or team manager',
            permissions: [
                'team_view',
                'team_manage',
                'attendance_view',
                'reports_view'
            ],
            isDefault: true
        },
        employee: {
            name: 'Employee',
            description: 'Regular employee access',
            permissions: [
                'profile_view',
                'profile_edit',
                'attendance_submit'
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
        }
        console.log('Default roles initialized');
    } catch (error) {
        console.error('Error initializing default roles:', error);
        throw error;
    }
}

// Initialize default subscription plans
async function initializeDefaultPlans() {
    const defaultPlans = [
        {
            name: 'Basic',
            description: 'Essential HRMS features for small businesses',
            price: 99.99,
            billingCycle: 'monthly',
            features: [
                'Employee Management',
                'Basic Leave Management',
                'Basic Attendance Tracking',
                'Standard Reports'
            ],
            limits: {
                users: 50,
                departments: 5,
                storage: 5 // GB
            },
            status: 'active',
            createdAt: new Date()
        },
        {
            name: 'Professional',
            description: 'Advanced features for growing companies',
            price: 199.99,
            billingCycle: 'monthly',
            features: [
                'All Basic Features',
                'Advanced Leave Management',
                'Time Tracking',
                'Performance Management',
                'Custom Reports',
                'API Access'
            ],
            limits: {
                users: 200,
                departments: 15,
                storage: 20 // GB
            },
            status: 'active',
            createdAt: new Date()
        },
        {
            name: 'Enterprise',
            description: 'Complete HRMS solution for large organizations',
            price: 499.99,
            billingCycle: 'monthly',
            features: [
                'All Professional Features',
                'Unlimited Users',
                'Unlimited Departments',
                'Custom Integrations',
                'Dedicated Support',
                'Data Analytics',
                'Multi-branch Management'
            ],
            limits: {
                users: null, // unlimited
                departments: null, // unlimited
                storage: 100 // GB
            },
            status: 'active',
            createdAt: new Date()
        }
    ];

    try {
        await subscription_plans.insertMany(defaultPlans, { ordered: false });
        console.log('Default subscription plans initialized');
    } catch (error) {
        if (error.code !== 11000) { // Ignore duplicate key errors
            console.error('Error initializing subscription plans:', error);
            throw error;
        }
    }
}

// Initialize system configuration
async function initializeSystemConfig() {
    const defaultConfig = {
        type: 'global',
        security: {
            sessionTimeout: 1800,
            maxLoginAttempts: 5,
            passwordPolicy: {
                minLength: 8,
                requireNumbers: true,
                requireSpecialChars: true,
                requireUppercase: true,
                requireLowercase: true
            }
        },
        backup: {
            frequency: 'daily',
            retentionDays: 30
        },
        maintenance: {
            window: 'sunday',
            time: '00:00'
        },
        createdAt: new Date()
    };

    await system_config.insertOne(defaultConfig);
}

// Utility Functions
function isValidCompanyEmail(email) {
    const genericDomains = [
        'gmail.com', 'yahoo.com', 'hotmail.com', 
        'outlook.com', 'aol.com', 'icloud.com'
    ];
    const domain = email.split('@')[1].toLowerCase();
    return !genericDomains.includes(domain);
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
// Company audit log function
async function createCompanyAuditLog(action, companyId, performedBy, details = {}) {
    try {
        const auditLog = {
            action,
            companyId: new ObjectId(companyId),
            performedBy: new ObjectId(performedBy),
            details,
            timestamp: new Date()
        };

        await company_audit_logs.insertOne(auditLog);
    } catch (error) {
        console.error('Error creating company audit log:', error);
    }
}

// Create notification
async function createNotification(companyId, type, message, metadata = {}) {
    try {
        const notification = {
            companyId: new ObjectId(companyId),
            type,
            message,
            metadata,
            status: 'unread',
            createdAt: new Date()
        };

        await notifications.insertOne(notification);

        // Trigger webhooks if configured
        const webhook = await webhooks.findOne({
            companyId: new ObjectId(companyId),
            events: { $in: [type, 'all'] },
            status: 'active'
        });

        if (webhook) {
            await triggerWebhook(webhook, notification);
        }

        return notification;
    } catch (error) {
        console.error('Error creating notification:', error);
        throw error;
    }
}

// Middleware Functions

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

// Company access verification middleware
const verifyCompanyAccess = async (req, res, next) => {
    try {
        const companyId = req.params.companyId || req.body.companyId;
        
        if (!companyId) {
            return res.status(400).json({
                success: false,
                message: 'Company ID is required'
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

        // For superadmin, allow all access
        if (req.user.role.toLowerCase() === 'superadmin') {
            req.company = company;
            return next();
        }

        // For company admin, verify they belong to the company
        const companyUser = await company_users.findOne({
            userId: new ObjectId(req.user.userId),
            companyId: new ObjectId(companyId),
            role: 'admin'
        });

        if (!companyUser) {
            await createAuditLog(
                'UNAUTHORIZED_COMPANY_ACCESS',
                req.user.userId,
                null,
                {
                    companyId,
                    endpoint: req.originalUrl
                }
            );

            return res.status(403).json({
                success: false,
                message: 'Access denied'
            });
        }

        req.company = company;
        next();
    } catch (error) {
        console.error('Company access verification error:', error);
        res.status(500).json({
            success: false,
            message: 'Error verifying company access'
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

// Create new company
app.post('/api/companies', verifyToken, verifyAdmin, async (req, res) => {
    try {
        const {
            name,
            industry,
            size,
            contactEmail,
            contactPhone,
            address,
            subscriptionPlan,
            adminEmail,
            adminName
        } = req.body;

        // Validate required fields
        if (!name || !industry || !contactEmail || !subscriptionPlan || !adminEmail) {
            return res.status(400).json({
                success: false,
                message: 'Missing required fields'
            });
        }

        // Validate company email domain
        if (!isValidCompanyEmail(contactEmail) || !isValidCompanyEmail(adminEmail)) {
            return res.status(400).json({
                success: false,
                message: 'Generic email domains are not allowed. Please use a company domain.'
            });
        }

        // Check if company name exists
        const existingCompany = await companies.findOne({ 
            name: { $regex: new RegExp(`^${name}$`, 'i') }
        });

        if (existingCompany) {
            return res.status(400).json({
                success: false,
                message: 'Company name already exists'
            });
        }

        // Get subscription plan details
        const plan = await subscription_plans.findOne({ name: subscriptionPlan });
        if (!plan) {
            return res.status(400).json({
                success: false,
                message: 'Invalid subscription plan'
            });
        }

        // Start MongoDB transaction
        const session = client.startSession();
        let companyId;

        try {
            await session.withTransaction(async () => {
                // Create company
                const company = {
                    name,
                    industry,
                    size: parseInt(size),
                    contactDetails: {
                        email: contactEmail,
                        phone: contactPhone,
                        address
                    },
                    subscription: {
                        plan: subscriptionPlan,
                        startDate: new Date(),
                        status: 'active'
                    },
                    status: 'active',
                    createdAt: new Date(),
                    createdBy: new ObjectId(req.user.userId),
                    updatedAt: new Date(),
                    settings: {
                        dataRetentionDays: 365,
                        securitySettings: {
                            passwordPolicy: {
                                minLength: 8,
                                requireSpecialChar: true,
                                requireNumber: true
                            },
                            sessionTimeout: 30,
                            maxLoginAttempts: 5
                        }
                    }
                };

                const companyResult = await companies.insertOne(company, { session });
                companyId = companyResult.insertedId;

                // Create company admin account
                const adminPassword = crypto.randomBytes(12).toString('base64url');
                const hashedPassword = await bcrypt.hash(adminPassword, 12);

                const adminUser = {
                    companyId: companyId,
                    name: adminName,
                    email: adminEmail,
                    password: hashedPassword,
                    role: 'admin',
                    status: 'active',
                    createdAt: new Date(),
                    createdBy: new ObjectId(req.user.userId),
                    passwordResetRequired: true,
                    lastLogin: null,
                    failedLoginAttempts: 0
                };

                await company_users.insertOne(adminUser, { session });

                // Create subscription record
                const subscription = {
                    companyId: companyId,
                    plan: plan._id,
                    startDate: new Date(),
                    status: 'active',
                    billingCycle: plan.billingCycle,
                    price: plan.price,
                    features: plan.features,
                    createdAt: new Date(),
                    nextBillingDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
                };

                await company_subscriptions.insertOne(subscription, { session });

                // Initialize company-specific collections
                await Promise.all([
                    database.createCollection(`company_${companyId}_employees`, { session }),
                    database.createCollection(`company_${companyId}_departments`, { session }),
                    database.createCollection(`company_${companyId}_attendance`, { session })
                ]);

                // Create initial department
                await database.collection(`company_${companyId}_departments`).insertOne({
                    name: 'Administration',
                    description: 'Main administrative department',
                    createdAt: new Date(),
                    createdBy: new ObjectId(req.user.userId),
                    status: 'active'
                }, { session });
            });

            // Create audit log
            await createCompanyAuditLog(
                'COMPANY_CREATED',
                companyId,
                req.user.userId,
                {
                    companyName: name,
                    adminEmail,
                    subscriptionPlan
                }
            );

            // Create notification
            await createNotification(
                companyId,
                'COMPANY_WELCOME',
                `Welcome to WorkWise Pro! Your company ${name} has been successfully registered.`,
                {
                    companyName: name,
                    adminEmail: adminEmail
                }
            );

            // Send welcome email (commented out for sandbox)
            /*
            await sendEmail({
                to: adminEmail,
                subject: 'Welcome to WorkWise Pro',
                template: 'company-welcome',
                data: {
                    companyName: name,
                    adminName,
                    tempPassword: adminPassword
                }
            });
            */

            res.status(201).json({
                success: true,
                message: 'Company created successfully',
                data: {
                    companyId,
                    adminCredentials: {
                        email: adminEmail,
                        temporaryPassword: adminPassword
                    }
                }
            });

        } catch (error) {
            throw error;
        } finally {
            await session.endSession();
        }

    } catch (error) {
        console.error('Error creating company:', error);
        res.status(500).json({
            success: false,
            message: 'Error creating company'
        });
    }
});

// Get all companies with filtering and pagination
app.get('/api/companies', verifyToken, verifyAdmin, cacheMiddleware(300), async (req, res) => {
    try {
        const {
            page = 1,
            limit = 10,
            search,
            industry,
            status,
            plan,
            sortField = 'createdAt',
            sortOrder = 'desc',
            dateFrom,
            dateTo
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
        if (plan) filter['subscription.plan'] = plan;

        if (dateFrom || dateTo) {
            filter.createdAt = {};
            if (dateFrom) filter.createdAt.$gte = new Date(dateFrom);
            if (dateTo) filter.createdAt.$lte = new Date(dateTo);
        }

        // Get total count
        const total = await companies.countDocuments(filter);

        // Get companies with pagination and sorting
        const companiesList = await companies
            .find(filter)
            .sort({ [sortField]: sortOrder === 'desc' ? -1 : 1 })
            .skip((parseInt(page) - 1) * parseInt(limit))
            .limit(parseInt(limit))
            .toArray();

        // Enrich company data
        const enrichedCompanies = await Promise.all(companiesList.map(async (company) => {
            const [
                userCount,
                subscription,
                recentActivity,
                storageUsage
            ] = await Promise.all([
                company_users.countDocuments({ companyId: company._id }),
                company_subscriptions.findOne({ companyId: company._id }),
                company_audit_logs
                    .find({ companyId: company._id })
                    .sort({ timestamp: -1 })
                    .limit(5)
                    .toArray(),
                calculateCompanyStorageUsage(company._id)
            ]);

            return {
                ...company,
                metrics: {
                    users: userCount,
                    storage: storageUsage,
                    activity: recentActivity.length
                },
                subscription: {
                    ...company.subscription,
                    details: subscription
                },
                recentActivity,
                health: await checkCompanyHealth(company._id)
            };
        }));

        res.json({
            success: true,
            data: {
                companies: enrichedCompanies,
                pagination: {
                    total,
                    page: parseInt(page),
                    pages: Math.ceil(total / parseInt(limit))
                },
                filters: {
                    industries: await getUniqueIndustries(),
                    plans: await getSubscriptionPlans(),
                    statuses: ['active', 'inactive', 'suspended']
                }
            }
        });

    } catch (error) {
        console.error('Error fetching companies:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching companies'
        });
    }
});
// Get company details
app.get('/api/companies/:companyId', verifyToken, verifyCompanyAccess, cacheMiddleware(60), async (req, res) => {
    try {
        const { companyId } = req.params;
        const { includeMetrics = true } = req.query;

        const company = await companies.findOne({
            _id: new ObjectId(companyId)
        });

        if (!company) {
            return res.status(404).json({
                success: false,
                message: 'Company not found'
            });
        }

        // Get comprehensive company information
        const [
            users,
            subscription,
            activityLogs,
            departments,
            storageUsage,
            analytics
        ] = await Promise.all([
            company_users.find({ companyId: company._id })
                .project({ password: 0 })
                .toArray(),
            company_subscriptions.findOne({ companyId: company._id }),
            company_audit_logs
                .find({ companyId: company._id })
                .sort({ timestamp: -1 })
                .limit(50)
                .toArray(),
            database.collection(`company_${companyId}_departments`).find().toArray(),
            calculateCompanyStorageUsage(company._id),
            includeMetrics ? getCompanyAnalytics(company._id) : null
        ]);

        // Get subscription usage metrics
        const usageMetrics = await getSubscriptionUsageMetrics(company._id, subscription);

        // Calculate department statistics
        const departmentStats = departments.reduce((acc, dept) => {
            acc.total++;
            acc.activeUsers += dept.userCount || 0;
            return acc;
        }, { total: 0, activeUsers: 0 });

        const enrichedCompany = {
            ...company,
            metrics: {
                users: {
                    total: users.length,
                    active: users.filter(u => u.status === 'active').length,
                    byRole: users.reduce((acc, user) => {
                        acc[user.role] = (acc[user.role] || 0) + 1;
                        return acc;
                    }, {})
                },
                departments: departmentStats,
                storage: storageUsage,
                activity: {
                    total: activityLogs.length,
                    recent: activityLogs.slice(0, 10)
                }
            },
            subscription: {
                ...subscription,
                usage: usageMetrics,
                status: subscription.status,
                nextBillingDate: subscription.nextBillingDate
            },
            departments: departments,
            analytics: analytics,
            security: await getCompanySecurityMetrics(company._id)
        };

        res.json({
            success: true,
            data: enrichedCompany
        });

    } catch (error) {
        console.error('Error fetching company details:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching company details'
        });
    }
});

// Update company
app.put('/api/companies/:companyId', verifyToken, verifyCompanyAccess, async (req, res) => {
    try {
        const { companyId } = req.params;
        const {
            name,
            industry,
            size,
            contactEmail,
            contactPhone,
            address,
            settings
        } = req.body;

        // Get current company data for comparison
        const currentCompany = await companies.findOne({ 
            _id: new ObjectId(companyId) 
        });

        if (!currentCompany) {
            return res.status(404).json({
                success: false,
                message: 'Company not found'
            });
        }

        // Validate company email if being updated
        if (contactEmail && !isValidCompanyEmail(contactEmail)) {
            return res.status(400).json({
                success: false,
                message: 'Generic email domains are not allowed'
            });
        }

        // Check if new name conflicts with existing companies
        if (name && name !== currentCompany.name) {
            const nameExists = await companies.findOne({
                name: { $regex: new RegExp(`^${name}$`, 'i') },
                _id: { $ne: new ObjectId(companyId) }
            });

            if (nameExists) {
                return res.status(400).json({
                    success: false,
                    message: 'Company name already exists'
                });
            }
        }

        // Prepare update document
        const updateDoc = {
            $set: {
                ...(name && { name }),
                ...(industry && { industry }),
                ...(size && { size: parseInt(size) }),
                ...(contactEmail && { 'contactDetails.email': contactEmail }),
                ...(contactPhone && { 'contactDetails.phone': contactPhone }),
                ...(address && { 'contactDetails.address': address }),
                ...(settings && { settings }),
                updatedAt: new Date(),
                updatedBy: new ObjectId(req.user.userId)
            }
        };

        // Update company
        const result = await companies.updateOne(
            { _id: new ObjectId(companyId) },
            updateDoc
        );

        // Track changes for audit log
        const changes = {};
        Object.keys(updateDoc.$set).forEach(key => {
            if (key !== 'updatedAt' && key !== 'updatedBy') {
                const oldValue = key.includes('.') ? 
                    key.split('.').reduce((obj, k) => obj[k], currentCompany) : 
                    currentCompany[key];
                const newValue = updateDoc.$set[key];
                if (oldValue !== newValue) {
                    changes[key] = {
                        from: oldValue,
                        to: newValue
                    };
                }
            }
        });

        // Create audit log
        await createCompanyAuditLog(
            'COMPANY_UPDATED',
            companyId,
            req.user.userId,
            {
                changes,
                previousState: currentCompany
            }
        );

        // Create notification if significant changes
        if (Object.keys(changes).length > 0) {
            await createNotification(
                companyId,
                'COMPANY_UPDATED',
                `Company details have been updated by ${req.user.email}`,
                { changes }
            );
        }

        // Invalidate relevant caches
        await Promise.all([
            invalidateCache(`cache:/api/companies/${companyId}`),
            invalidateCache(`cache:/api/companies`)
        ]);

        res.json({
            success: true,
            message: 'Company updated successfully',
            changes
        });

    } catch (error) {
        console.error('Error updating company:', error);
        res.status(500).json({
            success: false,
            message: 'Error updating company'
        });
    }
});
// Role and Permission Management Routes
app.get('/api/roles', verifyToken, verifyAdmin, async (req, res) => {
    try {
        const rolesList = await roles.find().toArray();
        
        // Enhance roles with user counts
        const enhancedRoles = await Promise.all(rolesList.map(async (role) => {
            const usersCount = await user_role_assignments.countDocuments({ roleId: role._id });
            return {
                ...role,
                usersCount
            };
        }));

        res.json({
            success: true,
            data: enhancedRoles
        });
    } catch (error) {
        console.error('Error fetching roles:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching roles'
        });
    }
});

app.get('/api/roles/:roleId', verifyToken, verifyAdmin, async (req, res) => {
    try {
        const role = await roles.findOne({ 
            _id: new ObjectId(req.params.roleId) 
        });

        if (!role) {
            return res.status(404).json({
                success: false,
                message: 'Role not found'
            });
        }

        const usersCount = await user_role_assignments.countDocuments({ 
            roleId: role._id 
        });

        const rolePermissions = await role_permissions.findOne({ 
            roleId: role._id 
        });

        res.json({
            success: true,
            data: {
                ...role,
                usersCount,
                permissions: rolePermissions?.permissions || []
            }
        });
    } catch (error) {
        console.error('Error fetching role:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching role details'
        });
    }
});

app.get('/api/permissions', verifyToken, verifyAdmin, async (req, res) => {
    try {
        const permissionsList = await database.collection('permissions').find().toArray();
        
        const groupedPermissions = permissionsList.reduce((acc, permission) => {
            const category = permission.category || 'General';
            if (!acc[category]) {
                acc[category] = [];
            }
            acc[category].push(permission);
            return acc;
        }, {});

        res.json({
            success: true,
            data: groupedPermissions
        });
    } catch (error) {
        console.error('Error fetching permissions:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching permissions'
        });
    }
});

app.put('/api/roles/:roleId/permissions', verifyToken, verifyAdmin, async (req, res) => {
    try {
        const { roleId } = req.params;
        const { permissions } = req.body;

        const role = await roles.findOne({ _id: new ObjectId(roleId) });
        if (!role) {
            return res.status(404).json({
                success: false,
                message: 'Role not found'
            });
        }

        if (role.isSystem) {
            return res.status(403).json({
                success: false,
                message: 'System roles cannot be modified'
            });
        }

        await role_permissions.updateOne(
            { roleId: new ObjectId(roleId) },
            { 
                $set: { 
                    permissions,
                    updatedAt: new Date(),
                    updatedBy: new ObjectId(req.user.userId)
                }
            },
            { upsert: true }
        );

        await createAuditLog(
            'ROLE_PERMISSIONS_UPDATED',
            req.user.userId,
            roleId,
            {
                roleName: role.name,
                permissions
            }
        );

        res.json({
            success: true,
            message: 'Role permissions updated successfully'
        });
    } catch (error) {
        console.error('Error updating role permissions:', error);
        res.status(500).json({
            success: false,
            message: 'Error updating role permissions'
        });
    }
});

app.post('/api/roles', verifyToken, verifyAdmin, async (req, res) => {
    try {
        const { name, description, permissions, isSystem = false } = req.body;

        if (!name) {
            return res.status(400).json({
                success: false,
                message: 'Role name is required'
            });
        }

        const existingRole = await roles.findOne({ 
            name: { $regex: new RegExp(`^${name}$`, 'i') }
        });

        if (existingRole) {
            return res.status(400).json({
                success: false,
                message: 'Role name already exists'
            });
        }

        const role = {
            name,
            description,
            isSystem,
            createdAt: new Date(),
            createdBy: new ObjectId(req.user.userId),
            updatedAt: new Date()
        };

        const result = await roles.insertOne(role);

        if (permissions && permissions.length > 0) {
            await role_permissions.insertOne({
                roleId: result.insertedId,
                permissions,
                createdAt: new Date(),
                createdBy: new ObjectId(req.user.userId)
            });
        }

        await createAuditLog(
            'ROLE_CREATED',
            req.user.userId,
            result.insertedId,
            {
                roleName: name,
                permissions
            }
        );

        res.status(201).json({
            success: true,
            message: 'Role created successfully',
            data: {
                _id: result.insertedId,
                ...role
            }
        });
    } catch (error) {
        console.error('Error creating role:', error);
        res.status(500).json({
            success: false,
            message: 'Error creating role'
        });
    }
});


// Helper function to calculate company storage usage
async function calculateCompanyStorageUsage(companyId) {
    try {
        const collections = [
            `company_${companyId}_employees`,
            `company_${companyId}_departments`,
            `company_${companyId}_attendance`
        ];

        let totalSize = 0;
        let documentCount = 0;

        for (const collectionName of collections) {
            const stats = await database.collection(collectionName).stats();
            totalSize += stats.size;
            documentCount += stats.count;
        }

        return {
            totalSize: totalSize,
            sizeInMB: (totalSize / (1024 * 1024)).toFixed(2),
            documentCount,
            collections: collections.length
        };
    } catch (error) {
        console.error('Error calculating storage usage:', error);
        return null;
    }
}

// Helper function to get subscription usage metrics
async function getSubscriptionUsageMetrics(companyId, subscription) {
    try {
        const [
            userCount,
            storageUsage,
            apiUsage
        ] = await Promise.all([
            company_users.countDocuments({ companyId: new ObjectId(companyId) }),
            calculateCompanyStorageUsage(companyId),
            getCompanyApiUsage(companyId)
        ]);

        return {
            users: {
                current: userCount,
                limit: subscription.limits?.users || 'unlimited',
                utilizationPercentage: subscription.limits?.users ? 
                    (userCount / subscription.limits.users * 100).toFixed(2) : null
            },
            storage: {
                current: parseFloat(storageUsage.sizeInMB),
                limit: subscription.limits?.storage || 'unlimited',
                utilizationPercentage: subscription.limits?.storage ?
                    (parseFloat(storageUsage.sizeInMB) / (subscription.limits.storage * 1024) * 100).toFixed(2) : null
            },
            api: apiUsage
        };
    } catch (error) {
        console.error('Error calculating subscription metrics:', error);
        return null;
    }
}
// Company Analytics and Metrics Routes

// Get company analytics
app.get('/api/companies/:companyId/analytics', verifyToken, verifyCompanyAccess, cacheMiddleware(300), async (req, res) => {
    try {
        const { companyId } = req.params;
        const { 
            startDate, 
            endDate, 
            type = 'all',
            interval = 'daily' 
        } = req.query;

        const dateFilter = {};
        if (startDate || endDate) {
            dateFilter.timestamp = {};
            if (startDate) dateFilter.timestamp.$gte = new Date(startDate);
            if (endDate) dateFilter.timestamp.$lte = new Date(endDate);
        }

        const analytics = await getCompanyAnalytics(companyId, type, dateFilter, interval);

        res.json({
            success: true,
            data: analytics
        });

    } catch (error) {
        console.error('Error fetching company analytics:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching company analytics'
        });
    }
});

// Get company security metrics
app.get('/api/companies/:companyId/security', verifyToken, verifyCompanyAccess, async (req, res) => {
    try {
        const { companyId } = req.params;
        const securityMetrics = await getCompanySecurityMetrics(companyId);

        res.json({
            success: true,
            data: securityMetrics
        });

    } catch (error) {
        console.error('Error fetching security metrics:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching security metrics'
        });
    }
});

// Analytics Helper Functions

async function getCompanyAnalytics(companyId, type, dateFilter, interval = 'daily') {
    try {
        const baseFilter = {
            companyId: new ObjectId(companyId),
            ...dateFilter
        };

        let analytics = {};

        if (type === 'all' || type === 'users') {
            analytics.users = await getUserAnalytics(companyId, baseFilter, interval);
        }

        if (type === 'all' || type === 'activity') {
            analytics.activity = await getActivityAnalytics(companyId, baseFilter, interval);
        }

        if (type === 'all' || type === 'departments') {
            analytics.departments = await getDepartmentAnalytics(companyId, baseFilter);
        }

        if (type === 'all' || type === 'security') {
            analytics.security = await getSecurityAnalytics(companyId, baseFilter, interval);
        }

        return analytics;
    } catch (error) {
        console.error('Error generating analytics:', error);
        throw error;
    }
}

async function getUserAnalytics(companyId, filter, interval) {
    const users = await company_users.find({
        companyId: new ObjectId(companyId)
    }).toArray();

    const timeSeriesData = await company_audit_logs.aggregate([
        { 
            $match: { 
                ...filter,
                action: { $regex: /^USER_/ }
            }
        },
        {
            $group: {
                _id: {
                    $switch: {
                        branches: [
                            { 
                                case: { $eq: [interval, 'hourly'] },
                                then: {
                                    year: { $year: '$timestamp' },
                                    month: { $month: '$timestamp' },
                                    day: { $dayOfMonth: '$timestamp' },
                                    hour: { $hour: '$timestamp' }
                                }
                            },
                            {
                                case: { $eq: [interval, 'daily'] },
                                then: {
                                    year: { $year: '$timestamp' },
                                    month: { $month: '$timestamp' },
                                    day: { $dayOfMonth: '$timestamp' }
                                }
                            },
                            {
                                case: { $eq: [interval, 'monthly'] },
                                then: {
                                    year: { $year: '$timestamp' },
                                    month: { $month: '$timestamp' }
                                }
                            }
                        ],
                        default: {
                            year: { $year: '$timestamp' },
                            month: { $month: '$timestamp' }
                        }
                    }
                },
                count: { $sum: 1 }
            }
        },
        { $sort: { '_id': 1 } }
    ]).toArray();

    return {
        summary: {
            total: users.length,
            active: users.filter(u => u.status === 'active').length,
            inactive: users.filter(u => u.status === 'inactive').length,
            locked: users.filter(u => u.failedLoginAttempts >= 5).length
        },
        roleDistribution: await company_users.aggregate([
            { $match: { companyId: new ObjectId(companyId) } },
            { $group: { _id: '$role', count: { $sum: 1 } } }
        ]).toArray(),
        activityTrends: timeSeriesData,
        recentActivities: await company_audit_logs
            .find({ ...filter, action: { $regex: /^USER_/ } })
            .sort({ timestamp: -1 })
            .limit(10)
            .toArray()
    };
}

async function getActivityAnalytics(companyId, filter, interval) {
    const activityData = await company_audit_logs.aggregate([
        { $match: { ...filter, companyId: new ObjectId(companyId) } },
        {
            $group: {
                _id: {
                    interval: {
                        $switch: {
                            branches: [
                                { 
                                    case: { $eq: [interval, 'hourly'] },
                                    then: {
                                        year: { $year: '$timestamp' },
                                        month: { $month: '$timestamp' },
                                        day: { $dayOfMonth: '$timestamp' },
                                        hour: { $hour: '$timestamp' }
                                    }
                                },
                                {
                                    case: { $eq: [interval, 'daily'] },
                                    then: {
                                        year: { $year: '$timestamp' },
                                        month: { $month: '$timestamp' },
                                        day: { $dayOfMonth: '$timestamp' }
                                    }
                                },
                                {
                                    case: { $eq: [interval, 'monthly'] },
                                    then: {
                                        year: { $year: '$timestamp' },
                                        month: { $month: '$timestamp' }
                                    }
                                }
                            ],
                            default: {
                                year: { $year: '$timestamp' },
                                month: { $month: '$timestamp' }
                            }
                        }
                    },
                    action: '$action'
                },
                count: { $sum: 1 }
            }
        },
        { $sort: { '_id.interval': 1 } }
    ]).toArray();

    return {
        timeline: activityData,
        summary: {
            total: await company_audit_logs.countDocuments(filter),
            byAction: await company_audit_logs.aggregate([
                { $match: filter },
                { $group: { _id: '$action', count: { $sum: 1 } } }
            ]).toArray(),
            byUser: await company_audit_logs.aggregate([
                { $match: filter },
                { $group: { _id: '$performedBy', count: { $sum: 1 } } },
                { $sort: { count: -1 } },
                { $limit: 10 }
            ]).toArray()
        }
    };
}

async function getDepartmentAnalytics(companyId, filter) {
    const departments = await database.collection(`company_${companyId}_departments`).find().toArray();
    
    const departmentMetrics = await Promise.all(departments.map(async (dept) => {
        const userCount = await company_users.countDocuments({
            companyId: new ObjectId(companyId),
            department: dept.name
        });

        const activityCount = await company_audit_logs.countDocuments({
            ...filter,
            'details.department': dept.name
        });

        return {
            ...dept,
            metrics: {
                users: userCount,
                activity: activityCount
            }
        };
    }));

    return {
        departments: departmentMetrics,
        summary: {
            total: departments.length,
            activeUsers: departmentMetrics.reduce((sum, dept) => sum + dept.metrics.users, 0),
            totalActivity: departmentMetrics.reduce((sum, dept) => sum + dept.metrics.activity, 0)
        }
    };
}

async function getSecurityAnalytics(companyId, filter, interval) {
    const securityEvents = await security_logs.aggregate([
        { 
            $match: { 
                ...filter,
                companyId: new ObjectId(companyId)
            }
        },
        {
            $group: {
                _id: {
                    interval: {
                        $switch: {
                            branches: [
                                { 
                                    case: { $eq: [interval, 'hourly'] },
                                    then: {
                                        year: { $year: '$timestamp' },
                                        month: { $month: '$timestamp' },
                                        day: { $dayOfMonth: '$timestamp' },
                                        hour: { $hour: '$timestamp' }
                                    }
                                },
                                {
                                    case: { $eq: [interval, 'daily'] },
                                    then: {
                                        year: { $year: '$timestamp' },
                                        month: { $month: '$timestamp' },
                                        day: { $dayOfMonth: '$timestamp' }
                                    }
                                }
                            ],
                            default: {
                                year: { $year: '$timestamp' },
                                month: { $month: '$timestamp' }
                            }
                        }
                    },
                    type: '$type'
                },
                count: { $sum: 1 }
            }
        },
        { $sort: { '_id.interval': 1 } }
    ]).toArray();

    return {
        timeline: securityEvents,
        summary: await getCompanySecurityMetrics(companyId)
    };
}
// Security Metrics and Backup Routes

// Get company security metrics
async function getCompanySecurityMetrics(companyId) {
    try {
        const [
            loginAttempts,
            suspiciousActivities,
            passwordResets,
            userSecurityStats,
            accessPatterns
        ] = await Promise.all([
            security_logs.aggregate([
                { 
                    $match: { 
                        companyId: new ObjectId(companyId),
                        type: { $in: ['LOGIN_SUCCESS', 'LOGIN_FAILED'] },
                        timestamp: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }
                    }
                },
                { $group: { _id: '$type', count: { $sum: 1 } } }
            ]).toArray(),
            security_logs.aggregate([
                {
                    $match: {
                        companyId: new ObjectId(companyId),
                        type: 'SUSPICIOUS_ACTIVITY',
                        timestamp: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }
                    }
                },
                { $group: { _id: '$details.reason', count: { $sum: 1 } } }
            ]).toArray(),
            security_logs.countDocuments({
                companyId: new ObjectId(companyId),
                type: 'PASSWORD_RESET',
                timestamp: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }
            }),
            company_users.aggregate([
                { $match: { companyId: new ObjectId(companyId) } },
                {
                    $group: {
                        _id: null,
                        total: { $sum: 1 },
                        mfaEnabled: {
                            $sum: { $cond: [{ $eq: ['$requires2FA', true] }, 1, 0] }
                        },
                        passwordResetRequired: {
                            $sum: { $cond: [{ $eq: ['$passwordResetRequired', true] }, 1, 0] }
                        },
                        lockedAccounts: {
                            $sum: { $cond: [{ $gte: ['$failedLoginAttempts', 5] }, 1, 0] }
                        }
                    }
                }
            ]).toArray(),
            security_logs.aggregate([
                {
                    $match: {
                        companyId: new ObjectId(companyId),
                        timestamp: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
                    }
                },
                {
                    $group: {
                        _id: {
                            ip: '$ip',
                            userAgent: '$userAgent'
                        },
                        count: { $sum: 1 },
                        lastAccess: { $max: '$timestamp' }
                    }
                },
                { $sort: { count: -1 } },
                { $limit: 10 }
            ]).toArray()
        ]);

        return {
            authentication: {
                successfulLogins: loginAttempts.find(l => l._id === 'LOGIN_SUCCESS')?.count || 0,
                failedLogins: loginAttempts.find(l => l._id === 'LOGIN_FAILED')?.count || 0,
                passwordResets
            },
            userSecurity: userSecurityStats[0] || {
                total: 0,
                mfaEnabled: 0,
                passwordResetRequired: 0,
                lockedAccounts: 0
            },
            threats: {
                suspiciousActivities,
                unusualAccessPatterns: accessPatterns
            },
            recommendations: await generateSecurityRecommendations(companyId)
        };
    } catch (error) {
        console.error('Error getting security metrics:', error);
        throw error;
    }
}

// Generate security recommendations
async function generateSecurityRecommendations(companyId) {
    try {
        const recommendations = [];
        const company = await companies.findOne({ _id: new ObjectId(companyId) });
        const users = await company_users.find({ companyId: new ObjectId(companyId) }).toArray();

        // Check MFA adoption
        const mfaUsers = users.filter(u => u.requires2FA).length;
        const mfaPercentage = (mfaUsers / users.length) * 100;
        if (mfaPercentage < 80) {
            recommendations.push({
                type: 'security',
                priority: 'high',
                message: 'Enable 2FA for more users',
                details: `Only ${mfaPercentage.toFixed(1)}% of users have 2FA enabled`
            });
        }

        // Check password age
        const oldPasswords = users.filter(u => {
            const lastChanged = u.passwordLastChanged || u.createdAt;
            const daysSinceChange = (Date.now() - lastChanged.getTime()) / (1000 * 60 * 60 * 24);
            return daysSinceChange > 90;
        }).length;

        if (oldPasswords > 0) {
            recommendations.push({
                type: 'security',
                priority: 'medium',
                message: 'Password update required',
                details: `${oldPasswords} users have passwords older than 90 days`
            });
        }

        // Check recent security incidents
        const recentIncidents = await security_logs.countDocuments({
            companyId: new ObjectId(companyId),
            type: 'SUSPICIOUS_ACTIVITY',
            timestamp: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }
        });

        if (recentIncidents > 0) {
            recommendations.push({
                type: 'security',
                priority: 'high',
                message: 'Review recent security incidents',
                details: `${recentIncidents} suspicious activities detected in the last 7 days`
            });
        }

        return recommendations;
    } catch (error) {
        console.error('Error generating security recommendations:', error);
        return [];
    }
}

// Backup company data
app.post('/api/companies/:companyId/backup', verifyToken, verifyCompanyAccess, async (req, res) => {
    try {
        const { companyId } = req.params;
        const { includeAttachments = true } = req.body;

        // Create backup record
        const backup = {
            companyId: new ObjectId(companyId),
            startTime: new Date(),
            status: 'in_progress',
            type: 'manual',
            initiatedBy: new ObjectId(req.user.userId),
            includeAttachments,
            metadata: {
                version: process.env.APP_VERSION,
                timestamp: new Date()
            }
        };

        const backupRecord = await database.collection('backups').insertOne(backup);

        // Start backup process asynchronously
        performCompanyBackup(backupRecord.insertedId, companyId, includeAttachments)
            .catch(error => console.error('Backup error:', error));

        res.json({
            success: true,
            message: 'Backup initiated successfully',
            backupId: backupRecord.insertedId
        });

    } catch (error) {
        console.error('Error initiating backup:', error);
        res.status(500).json({
            success: false,
            message: 'Error initiating backup'
        });
    }
});

// Perform company backup
async function performCompanyBackup(backupId, companyId, includeAttachments) {
    try {
        const backupPath = `backups/company_${companyId}_${Date.now()}`;
        await fs.promises.mkdir(backupPath, { recursive: true });

        // Backup company data
        const company = await companies.findOne({ _id: new ObjectId(companyId) });
        await fs.promises.writeFile(
            `${backupPath}/company.json`,
            JSON.stringify(company, null, 2)
        );

        // Backup collections
        const collections = [
            'company_users',
            'company_audit_logs',
            `company_${companyId}_departments`,
            `company_${companyId}_employees`,
            `company_${companyId}_attendance`
        ];

        for (const collection of collections) {
            const data = await database.collection(collection)
                .find({ companyId: new ObjectId(companyId) })
                .toArray();

            await fs.promises.writeFile(
                `${backupPath}/${collection}.json`,
                JSON.stringify(data, null, 2)
            );
        }

        // Backup attachments if requested
        if (includeAttachments) {
            // Implementation depends on your file storage solution
            // This is a placeholder for the attachment backup logic
        }

        // Update backup record
        await database.collection('backups').updateOne(
            { _id: backupId },
            {
                $set: {
                    status: 'completed',
                    completedAt: new Date(),
                    path: backupPath,
                    size: await calculateDirectorySize(backupPath)
                }
            }
        );

        // Create audit log
        await createCompanyAuditLog(
            'BACKUP_COMPLETED',
            companyId,
            null,
            {
                backupId,
                path: backupPath
            }
        );

    } catch (error) {
        console.error('Backup error:', error);
        await database.collection('backups').updateOne(
            { _id: backupId },
            {
                $set: {
                    status: 'failed',
                    error: error.message,
                    completedAt: new Date()
                }
            }
        );
    }
}
// Restore company data
app.post('/api/companies/:companyId/restore', verifyToken, verifyAdmin, async (req, res) => {
    try {
        const { companyId } = req.params;
        const { backupId } = req.body;

        // Start MongoDB session for transaction
        const session = client.startSession();

        try {
            await session.withTransaction(async () => {
                // Get backup record
                const backup = await database.collection('backups').findOne({
                    _id: new ObjectId(backupId),
                    status: 'completed'
                });

                if (!backup) {
                    throw new Error('Valid backup not found');
                }

                // Create restore record
                const restore = {
                    companyId: new ObjectId(companyId),
                    backupId: new ObjectId(backupId),
                    startTime: new Date(),
                    status: 'in_progress',
                    initiatedBy: new ObjectId(req.user.userId)
                };

                const restoreRecord = await database.collection('restores').insertOne(restore, { session });

                // Read backup files
                const backupFiles = await fs.promises.readdir(backup.path);

                // Restore each collection
                for (const file of backupFiles) {
                    if (file.endsWith('.json')) {
                        const data = JSON.parse(
                            await fs.promises.readFile(`${backup.path}/${file}`, 'utf8')
                        );

                        const collectionName = file.replace('.json', '');

                        // Delete existing data
                        await database.collection(collectionName).deleteMany({
                            companyId: new ObjectId(companyId)
                        }, { session });

                        // Insert backup data
                        if (Array.isArray(data) && data.length > 0) {
                            await database.collection(collectionName).insertMany(
                                data.map(item => ({
                                    ...item,
                                    _id: new ObjectId(item._id)
                                })),
                                { session }
                            );
                        }
                    }
                }

                // Update restore record
                await database.collection('restores').updateOne(
                    { _id: restoreRecord.insertedId },
                    {
                        $set: {
                            status: 'completed',
                            completedAt: new Date()
                        }
                    },
                    { session }
                );

                // Create audit log
                await createCompanyAuditLog(
                    'RESTORE_COMPLETED',
                    companyId,
                    req.user.userId,
                    {
                        backupId,
                        restoreId: restoreRecord.insertedId
                    }
                );
            });

            // Invalidate all caches for this company
            await invalidateCache(`cache:/api/companies/${companyId}*`);

            res.json({
                success: true,
                message: 'Company data restored successfully'
            });

        } catch (error) {
            throw error;
        } finally {
            await session.endSession();
        }

    } catch (error) {
        console.error('Error restoring company data:', error);
        res.status(500).json({
            success: false,
            message: 'Error restoring company data'
        });
    }
});

// Delete company
app.delete('/api/companies/:companyId', verifyToken, verifyAdmin, async (req, res) => {
    const session = client.startSession();
    try {
        await session.withTransaction(async () => {
            const { companyId } = req.params;
            const { reason, createBackup = true } = req.body;

            // Verify company exists
            const company = await companies.findOne({ 
                _id: new ObjectId(companyId) 
            });

            if (!company) {
                throw new Error('Company not found');
            }

            // Create backup if requested
            let backupId = null;
            if (createBackup) {
                const backup = {
                    companyId: new ObjectId(companyId),
                    type: 'pre_deletion',
                    startTime: new Date(),
                    status: 'in_progress',
                    initiatedBy: new ObjectId(req.user.userId)
                };

                const backupRecord = await database.collection('backups').insertOne(backup, { session });
                backupId = backupRecord.insertedId;

                await performCompanyBackup(backupId, companyId, true);
            }

            // Archive company data
            const archivedCompany = {
                ...company,
                deletedAt: new Date(),
                deletedBy: new ObjectId(req.user.userId),
                deletionReason: reason,
                backupId
            };

            await database.collection('deleted_companies').insertOne(archivedCompany, { session });

            // Delete company-specific collections
            const collections = [
                `company_${companyId}_departments`,
                `company_${companyId}_employees`,
                `company_${companyId}_attendance`
            ];

            for (const collection of collections) {
                await database.collection(collection).drop({ session });
            }

            // Delete company users
            await company_users.deleteMany({
                companyId: new ObjectId(companyId)
            }, { session });

            // Delete company subscriptions
            await company_subscriptions.deleteMany({
                companyId: new ObjectId(companyId)
            }, { session });

            // Delete company
            await companies.deleteOne({
                _id: new ObjectId(companyId)
            }, { session });

            // Create audit log
            await createAuditLog(
                'COMPANY_DELETED',
                req.user.userId,
                null,
                {
                    companyId,
                    companyName: company.name,
                    reason,
                    backupId
                }
            );

            // Invalidate all caches related to this company
            await invalidateCache(`cache:/api/companies/${companyId}*`);
        });

        res.json({
            success: true,
            message: 'Company deleted successfully'
        });

    } catch (error) {
        console.error('Error deleting company:', error);
        res.status(error.message === 'Company not found' ? 404 : 500).json({
            success: false,
            message: error.message || 'Error deleting company'
        });
    } finally {
        await session.endSession();
    }
});

// Get company statistics
app.get('/api/companies/:companyId/statistics', verifyToken, verifyCompanyAccess, cacheMiddleware(300), async (req, res) => {
    try {
        const { companyId } = req.params;
        const { startDate, endDate } = req.query;

        const dateFilter = {};
        if (startDate || endDate) {
            dateFilter.timestamp = {};
            if (startDate) dateFilter.timestamp.$gte = new Date(startDate);
            if (endDate) dateFilter.timestamp.$lte = new Date(endDate);
        }

        const [
            userStats,
            activityStats,
            resourceStats,
            securityStats
        ] = await Promise.all([
            getUserStatistics(companyId, dateFilter),
            getActivityStatistics(companyId, dateFilter),
            getResourceStatistics(companyId),
            getSecurityStatistics(companyId, dateFilter)
        ]);

        res.json({
            success: true,
            statistics: {
                users: userStats,
                activity: activityStats,
                resources: resourceStats,
                security: securityStats
            }
        });

    } catch (error) {
        console.error('Error fetching company statistics:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching company statistics'
        });
    }
});

// Statistics Helper Functions
async function getUserStatistics(companyId, dateFilter) {
    const users = await company_users.find({
        companyId: new ObjectId(companyId)
    }).toArray();

    return {
        total: users.length,
        active: users.filter(u => u.status === 'active').length,
        roleDistribution: users.reduce((acc, user) => {
            acc[user.role] = (acc[user.role] || 0) + 1;
            return acc;
        }, {}),
        departmentDistribution: users.reduce((acc, user) => {
            acc[user.department] = (acc[user.department] || 0) + 1;
            return acc;
        }, {}),
        recentActivity: await company_audit_logs
            .find({ 
                companyId: new ObjectId(companyId),
                ...dateFilter 
            })
            .sort({ timestamp: -1 })
            .limit(10)
            .toArray()
    };
}
// Continue Statistics Helper Functions

async function getActivityStatistics(companyId, dateFilter) {
    const baseFilter = { 
        companyId: new ObjectId(companyId),
        ...dateFilter
    };

    const [
        activityByType,
        activityByUser,
        activityTimeline,
        peakUsageTimes
    ] = await Promise.all([
        company_audit_logs.aggregate([
            { $match: baseFilter },
            { $group: { _id: '$action', count: { $sum: 1 } } },
            { $sort: { count: -1 } }
        ]).toArray(),
        company_audit_logs.aggregate([
            { $match: baseFilter },
            { $group: { 
                _id: '$performedBy',
                count: { $sum: 1 },
                lastActivity: { $max: '$timestamp' }
            }},
            { $sort: { count: -1 } },
            { $limit: 10 }
        ]).toArray(),
        company_audit_logs.aggregate([
            { $match: baseFilter },
            { 
                $group: {
                    _id: {
                        year: { $year: '$timestamp' },
                        month: { $month: '$timestamp' },
                        day: { $dayOfMonth: '$timestamp' }
                    },
                    count: { $sum: 1 }
                }
            },
            { $sort: { '_id': 1 } }
        ]).toArray(),
        company_audit_logs.aggregate([
            { $match: baseFilter },
            {
                $group: {
                    _id: {
                        hour: { $hour: '$timestamp' },
                        dayOfWeek: { $dayOfWeek: '$timestamp' }
                    },
                    count: { $sum: 1 }
                }
            },
            { $sort: { count: -1 } }
        ]).toArray()
    ]);

    // Enrich user activity data with user details
    const enrichedUserActivity = await Promise.all(activityByUser.map(async (activity) => {
        const user = await company_users.findOne(
            { _id: activity._id },
            { projection: { name: 1, email: 1, role: 1 } }
        );
        return {
            ...activity,
            user: user || { name: 'Deleted User' }
        };
    }));

    return {
        summary: {
            totalActivities: await company_audit_logs.countDocuments(baseFilter),
            uniqueUsers: await company_audit_logs.distinct('performedBy', baseFilter).length,
            activityByType,
            mostActiveUsers: enrichedUserActivity
        },
        timeline: {
            daily: activityTimeline,
            peakUsage: peakUsageTimes
        }
    };
}

async function getResourceStatistics(companyId) {
    const [
        storageUsage,
        databaseStats,
        apiUsage
    ] = await Promise.all([
        calculateCompanyStorageUsage(companyId),
        getDatabaseStatistics(companyId),
        getApiUsageStatistics(companyId)
    ]);

    return {
        storage: storageUsage,
        database: databaseStats,
        api: apiUsage
    };
}

async function getDatabaseStatistics(companyId) {
    const collections = [
        `company_${companyId}_departments`,
        `company_${companyId}_employees`,
        `company_${companyId}_attendance`
    ];

    const stats = await Promise.all(collections.map(async (collection) => {
        const collStats = await database.collection(collection).stats();
        return {
            collection: collection.split('_').pop(),
            documentCount: collStats.count,
            size: collStats.size,
            avgDocumentSize: collStats.avgObjSize
        };
    }));

    return {
        collections: stats,
        total: {
            documentCount: stats.reduce((sum, stat) => sum + stat.documentCount, 0),
            size: stats.reduce((sum, stat) => sum + stat.size, 0)
        }
    };
}

async function getApiUsageStatistics(companyId) {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const [
        totalRequests,
        endpointUsage,
        errorRates,
        responseTimeStats
    ] = await Promise.all([
        api_keys.aggregate([
            { $match: { companyId: new ObjectId(companyId) } },
            { $group: { _id: null, total: { $sum: '$usageStats.totalCalls' } } }
        ]).toArray(),
        security_logs.aggregate([
            { 
                $match: { 
                    companyId: new ObjectId(companyId),
                    type: 'API_REQUEST',
                    timestamp: { $gte: thirtyDaysAgo }
                }
            },
            { $group: { _id: '$details.endpoint', count: { $sum: 1 } } },
            { $sort: { count: -1 } }
        ]).toArray(),
        security_logs.aggregate([
            {
                $match: {
                    companyId: new ObjectId(companyId),
                    type: 'API_ERROR',
                    timestamp: { $gte: thirtyDaysAgo }
                }
            },
            { 
                $group: {
                    _id: '$details.errorType',
                    count: { $sum: 1 }
                }
            }
        ]).toArray(),
        security_logs.aggregate([
            {
                $match: {
                    companyId: new ObjectId(companyId),
                    type: 'API_REQUEST',
                    timestamp: { $gte: thirtyDaysAgo }
                }
            },
            {
                $group: {
                    _id: null,
                    avgResponseTime: { $avg: '$details.responseTime' },
                    maxResponseTime: { $max: '$details.responseTime' },
                    minResponseTime: { $min: '$details.responseTime' }
                }
            }
        ]).toArray()
    ]);

    return {
        totalRequests: totalRequests[0]?.total || 0,
        endpoints: {
            usage: endpointUsage,
            mostUsed: endpointUsage[0]?._id || 'N/A'
        },
        errors: {
            distribution: errorRates,
            total: errorRates.reduce((sum, rate) => sum + rate.count, 0)
        },
        performance: responseTimeStats[0] || {
            avgResponseTime: 0,
            maxResponseTime: 0,
            minResponseTime: 0
        }
    };
}

async function getSecurityStatistics(companyId, dateFilter) {
    const baseFilter = {
        companyId: new ObjectId(companyId),
        ...dateFilter
    };

    const [
        loginStats,
        securityIncidents,
        accessPatterns,
        userSecurityStatus
    ] = await Promise.all([
        security_logs.aggregate([
            {
                $match: {
                    ...baseFilter,
                    type: { $in: ['LOGIN_SUCCESS', 'LOGIN_FAILED'] }
                }
            },
            { $group: { _id: '$type', count: { $sum: 1 } } }
        ]).toArray(),
        security_logs.aggregate([
            {
                $match: {
                    ...baseFilter,
                    type: 'SECURITY_INCIDENT'
                }
            },
            {
                $group: {
                    _id: '$details.incidentType',
                    count: { $sum: 1 },
                    latestOccurrence: { $max: '$timestamp' }
                }
            }
        ]).toArray(),
        security_logs.aggregate([
            { $match: baseFilter },
            {
                $group: {
                    _id: {
                        ip: '$ip',
                        userAgent: '$userAgent'
                    },
                    count: { $sum: 1 },
                    lastAccess: { $max: '$timestamp' }
                }
            },
            { $sort: { count: -1 } },
            { $limit: 10 }
        ]).toArray(),
        company_users.aggregate([
            { $match: { companyId: new ObjectId(companyId) } },
            {
                $group: {
                    _id: null,
                    totalUsers: { $sum: 1 },
                    mfaEnabled: {
                        $sum: { $cond: [{ $eq: ['$requires2FA', true] }, 1, 0] }
                    },
                    passwordResetRequired: {
                        $sum: { $cond: [{ $eq: ['$passwordResetRequired', true] }, 1, 0] }
                    },
                    lockedAccounts: {
                        $sum: { $cond: [{ $gte: ['$failedLoginAttempts', 5] }, 1, 0] }
                    }
                }
            }
        ]).toArray()
    ]);

    return {
        authentication: {
            successful: loginStats.find(s => s._id === 'LOGIN_SUCCESS')?.count || 0,
            failed: loginStats.find(s => s._id === 'LOGIN_FAILED')?.count || 0
        },
        incidents: {
            total: securityIncidents.reduce((sum, incident) => sum + incident.count, 0),
            byType: securityIncidents
        },
        access: {
            patterns: accessPatterns,
            unusualActivity: accessPatterns.filter(p => p.count > 100)
        },
        userSecurity: userSecurityStatus[0] || {
            totalUsers: 0,
            mfaEnabled: 0,
            passwordResetRequired: 0,
            lockedAccounts: 0
        }
    };
}
// System Health and Maintenance Endpoints

// Get system health status
app.get('/api/system/health', verifyToken, verifyAdmin, async (req, res) => {
    try {
        const startTime = process.hrtime();

        const [
            dbHealth,
            redisHealth,
            systemMetrics,
            serviceStatus,
            recentErrors
        ] = await Promise.all([
            checkDatabaseHealth(),
            checkRedisHealth(),
            getSystemMetrics(),
            checkServiceStatus(),
            getRecentErrors()
        ]);

        // Calculate response time
        const [seconds, nanoseconds] = process.hrtime(startTime);
        const responseTime = seconds * 1000 + nanoseconds / 1000000;

        const healthStatus = {
            status: 'healthy', // Will be updated based on checks
            timestamp: new Date(),
            responseTime,
            components: {
                database: dbHealth,
                cache: redisHealth,
                system: systemMetrics,
                services: serviceStatus
            },
            errors: recentErrors,
            uptime: process.uptime(),
            version: process.env.APP_VERSION || '1.0.0'
        };

        // Update overall status if any component is unhealthy
        if (!dbHealth.healthy || !redisHealth.healthy || !serviceStatus.healthy) {
            healthStatus.status = 'degraded';
        }

        // Log health check results
        await database.collection('system_health_logs').insertOne({
            ...healthStatus,
            checkedBy: new ObjectId(req.user.userId),
            checkedAt: new Date()
        });

        res.json({
            success: true,
            health: healthStatus
        });

    } catch (error) {
        console.error('Health check error:', error);
        res.status(500).json({
            success: false,
            message: 'Error performing health check',
            error: error.message
        });
    }
});

// System maintenance mode toggle
app.post('/api/system/maintenance', verifyToken, verifyAdmin, async (req, res) => {
    try {
        const { enabled, message, estimatedDuration } = req.body;

        const maintenanceStatus = {
            enabled,
            message,
            estimatedDuration,
            startTime: enabled ? new Date() : null,
            updatedBy: new ObjectId(req.user.userId),
            updatedAt: new Date()
        };

        await system_config.updateOne(
            { type: 'global' },
            {
                $set: {
                    'maintenance': maintenanceStatus
                }
            }
        );

        // If enabling maintenance mode, disconnect all non-admin users
        if (enabled) {
            const adminUsers = await users.find({ 
                role: { $in: ['superadmin', 'admin'] } 
            }).toArray();
            
            const adminIds = adminUsers.map(user => user._id.toString());

            await sessions.deleteMany({
                userId: { 
                    $nin: adminIds.map(id => new ObjectId(id))
                }
            });
        }

        // Create system notification
        const notification = {
            type: enabled ? 'MAINTENANCE_START' : 'MAINTENANCE_END',
            message: enabled ? 
                `System maintenance started: ${message}` : 
                'System maintenance completed',
            timestamp: new Date(),
            severity: 'info'
        };

        await database.collection('system_notifications').insertOne(notification);

        res.json({
            success: true,
            message: `Maintenance mode ${enabled ? 'enabled' : 'disabled'} successfully`,
            maintenance: maintenanceStatus
        });

    } catch (error) {
        console.error('Error toggling maintenance mode:', error);
        res.status(500).json({
            success: false,
            message: 'Error toggling maintenance mode'
        });
    }
});

// Get system metrics
app.get('/api/system/metrics', verifyToken, verifyAdmin, async (req, res) => {
    try {
        const [
            systemMetrics,
            databaseMetrics,
            apiMetrics,
            userMetrics
        ] = await Promise.all([
            getDetailedSystemMetrics(),
            getDatabaseMetrics(),
            getApiMetrics(),
            getUserMetrics()
        ]);

        res.json({
            success: true,
            metrics: {
                system: systemMetrics,
                database: databaseMetrics,
                api: apiMetrics,
                users: userMetrics
            }
        });

    } catch (error) {
        console.error('Error fetching system metrics:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching system metrics'
        });
    }
});

// System Metrics Helper Functions

async function getDetailedSystemMetrics() {
    const metrics = {
        memory: process.memoryUsage(),
        cpu: process.cpuUsage(),
        uptime: process.uptime(),
        resourceUsage: {
            heap: v8.getHeapStatistics(),
            eventLoop: await checkEventLoopLag()
        }
    };

    return {
        memory: {
            total: Math.round(metrics.memory.heapTotal / 1024 / 1024),
            used: Math.round(metrics.memory.heapUsed / 1024 / 1024),
            external: Math.round(metrics.memory.external / 1024 / 1024),
            percentage: Math.round((metrics.memory.heapUsed / metrics.memory.heapTotal) * 100)
        },
        cpu: {
            user: metrics.cpu.user,
            system: metrics.cpu.system,
            percentage: process.cpuUsage().user / process.cpuUsage().system
        },
        uptime: {
            days: Math.floor(metrics.uptime / 86400),
            hours: Math.floor((metrics.uptime % 86400) / 3600),
            minutes: Math.floor((metrics.uptime % 3600) / 60)
        },
        heap: {
            total: Math.round(metrics.resourceUsage.heap.total_heap_size / 1024 / 1024),
            used: Math.round(metrics.resourceUsage.heap.used_heap_size / 1024 / 1024),
            limit: Math.round(metrics.resourceUsage.heap.heap_size_limit / 1024 / 1024)
        },
        eventLoop: {
            lag: metrics.resourceUsage.eventLoop,
            utilization: process.eventLoop ? process.eventLoop.utilization() : null
        }
    };
}

async function getDatabaseMetrics() {
    try {
        const adminDb = client.db().admin();
        const serverStatus = await adminDb.serverStatus();
        
        const collectionsStats = await Promise.all(
            (await database.listCollections().toArray())
                .map(async collection => {
                    const stats = await database.collection(collection.name).stats();
                    return {
                        name: collection.name,
                        size: stats.size,
                        count: stats.count
                    };
                })
        );

        return {
            connections: serverStatus.connections,
            operations: serverStatus.opcounters,
            collections: collectionsStats,
            storage: {
                total: collectionsStats.reduce((acc, curr) => acc + curr.size, 0),
                byCollection: collectionsStats
            }
        };
    } catch (error) {
        console.error('Error getting database metrics:', error);
        throw error;
    }
}

async function getApiMetrics() {
    const last24Hours = new Date(Date.now() - 24 * 60 * 60 * 1000);

    try {
        const [
            requestCounts,
            responseTimeStats,
            errorRates,
            endpointUsage
        ] = await Promise.all([
            security_logs.countDocuments({
                type: 'API_REQUEST',
                timestamp: { $gte: last24Hours }
            }),
            security_logs.aggregate([
                {
                    $match: {
                        type: 'API_REQUEST',
                        timestamp: { $gte: last24Hours }
                    }
                },
                {
                    $group: {
                        _id: null,
                        average: { $avg: '$details.responseTime' },
                        max: { $max: '$details.responseTime' },
                        min: { $min: '$details.responseTime' }
                    }
                }
            ]).toArray(),
            security_logs.aggregate([
                {
                    $match: {
                        type: 'API_ERROR',
                        timestamp: { $gte: last24Hours }
                    }
                },
                {
                    $group: {
                        _id: '$details.errorType',
                        count: { $sum: 1 }
                    }
                }
            ]).toArray(),
            security_logs.aggregate([
                {
                    $match: {
                        type: 'API_REQUEST',
                        timestamp: { $gte: last24Hours }
                    }
                },
                {
                    $group: {
                        _id: '$details.endpoint',
                        count: { $sum: 1 },
                        avgResponseTime: { $avg: '$details.responseTime' }
                    }
                },
                { $sort: { count: -1 } },
                { $limit: 10 }
            ]).toArray()
        ]);

        return {
            requests: {
                total: requestCounts,
                perHour: requestCounts / 24
            },
            performance: responseTimeStats[0] || {
                average: 0,
                max: 0,
                min: 0
            },
            errors: {
                distribution: errorRates,
                total: errorRates.reduce((sum, curr) => sum + curr.count, 0)
            },
            endpoints: {
                mostUsed: endpointUsage,
                total: endpointUsage.length
            }
        };
    } catch (error) {
        console.error('Error getting API metrics:', error);
        throw error;
    }
}
// Continue System Metrics Helper Functions

async function getUserMetrics() {
    const last24Hours = new Date(Date.now() - 24 * 60 * 60 * 1000);

    try {
        const [
            userStats,
            sessionStats,
            loginStats,
            activityStats
        ] = await Promise.all([
            users.aggregate([
                {
                    $group: {
                        _id: null,
                        total: { $sum: 1 },
                        active: { 
                            $sum: { 
                                $cond: [{ $eq: ['$status', 'active'] }, 1, 0] 
                            }
                        },
                        locked: {
                            $sum: {
                                $cond: [{ $gte: ['$failedLoginAttempts', 5] }, 1, 0]
                            }
                        }
                    }
                }
            ]).toArray(),
            sessions.aggregate([
                {
                    $match: {
                        expires: { $gt: new Date() }
                    }
                },
                {
                    $group: {
                        _id: null,
                        activeSessions: { $sum: 1 },
                        uniqueUsers: { $addToSet: '$userId' }
                    }
                }
            ]).toArray(),
            security_logs.aggregate([
                {
                    $match: {
                        type: { $in: ['LOGIN_SUCCESS', 'LOGIN_FAILED'] },
                        timestamp: { $gte: last24Hours }
                    }
                },
                {
                    $group: {
                        _id: '$type',
                        count: { $sum: 1 }
                    }
                }
            ]).toArray(),
            audit_logs.aggregate([
                {
                    $match: {
                        timestamp: { $gte: last24Hours }
                    }
                },
                {
                    $group: {
                        _id: '$action',
                        count: { $sum: 1 }
                    }
                },
                { $sort: { count: -1 } },
                { $limit: 5 }
            ]).toArray()
        ]);

        return {
            users: userStats[0] || {
                total: 0,
                active: 0,
                locked: 0
            },
            sessions: sessionStats[0] || {
                activeSessions: 0,
                uniqueUsers: []
            },
            authentication: {
                successful: loginStats.find(s => s._id === 'LOGIN_SUCCESS')?.count || 0,
                failed: loginStats.find(s => s._id === 'LOGIN_FAILED')?.count || 0
            },
            activity: {
                topActions: activityStats,
                total: activityStats.reduce((sum, stat) => sum + stat.count, 0)
            }
        };
    } catch (error) {
        console.error('Error getting user metrics:', error);
        throw error;
    }
}

// Error Handling and Logging Functions

async function getRecentErrors() {
    try {
        return await security_logs.find({
            type: 'ERROR',
            timestamp: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
        })
        .sort({ timestamp: -1 })
        .limit(50)
        .toArray();
    } catch (error) {
        console.error('Error fetching recent errors:', error);
        return [];
    }
}

// System cleanup functions
async function performSystemCleanup() {
    try {
        const [
            expiredSessions,
            oldLogs,
            deletedCompanies
        ] = await Promise.all([
            cleanupExpiredSessions(),
            cleanupOldLogs(),
            cleanupDeletedCompanies()
        ]);

        return {
            sessions: expiredSessions,
            logs: oldLogs,
            companies: deletedCompanies
        };
    } catch (error) {
        console.error('Error during system cleanup:', error);
        throw error;
    }
}

async function cleanupExpiredSessions() {
    try {
        const result = await sessions.deleteMany({
            expires: { $lt: new Date() }
        });
        return result.deletedCount;
    } catch (error) {
        console.error('Error cleaning up sessions:', error);
        throw error;
    }
}

async function cleanupOldLogs() {
    const retentionPeriod = 90; // days
    const cutoffDate = new Date(Date.now() - retentionPeriod * 24 * 60 * 60 * 1000);

    try {
        const [auditLogs, securityLogs] = await Promise.all([
            audit_logs.deleteMany({
                timestamp: { $lt: cutoffDate }
            }),
            security_logs.deleteMany({
                timestamp: { $lt: cutoffDate }
            })
        ]);

        return {
            auditLogs: auditLogs.deletedCount,
            securityLogs: securityLogs.deletedCount
        };
    } catch (error) {
        console.error('Error cleaning up logs:', error);
        throw error;
    }
}

async function cleanupDeletedCompanies() {
    const retentionPeriod = 30; // days
    const cutoffDate = new Date(Date.now() - retentionPeriod * 24 * 60 * 60 * 1000);

    try {
        const result = await database.collection('deleted_companies').deleteMany({
            deletedAt: { $lt: cutoffDate },
            backupId: { $exists: true } // Only delete if backup exists
        });

        return result.deletedCount;
    } catch (error) {
        console.error('Error cleaning up deleted companies:', error);
        throw error;
    }
}

// Scheduled Tasks
const scheduleSystemTasks = () => {
    // Run system cleanup daily
    setInterval(async () => {
        try {
            console.log('Starting scheduled system cleanup...');
            const results = await performSystemCleanup();
            console.log('System cleanup completed:', results);
        } catch (error) {
            console.error('Error during scheduled cleanup:', error);
        }
    }, 24 * 60 * 60 * 1000); // 24 hours

    // Monitor system health every 5 minutes
    setInterval(async () => {
        try {
            const healthStatus = await checkSystemHealth();
            if (healthStatus.status !== 'healthy') {
                console.warn('System health check failed:', healthStatus);
                // Implement alert mechanism here
            }
        } catch (error) {
            console.error('Error during health check:', error);
        }
    }, 5 * 60 * 1000); // 5 minutes
};

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

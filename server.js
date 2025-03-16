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
const crypto = require('crypto');
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
let plans;
let features;
let discounts;
let referral_discounts;
let invoices;
let subscription_logs;
let data_retention_policies;
let deleted_plans;
let deleted_features;
let deleted_discounts;
let deleted_referral_discounts;
let deleted_payments;
let modules;
let module_activity_logs;
let company_modules;
let deleted_modules;
let plan_activity_logs;



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
            'billing_history',
            'plans', // Add this for pricing plans
            'features', // Add this for features
            'discounts', // Add this for discounts
            'referral_discounts', // Add this for referral discounts
            'invoices', // Add this for invoices
            'subscription_logs', // Add this for subscription logs
            'data_retention_policies', // Add this for data retention policies
            'deleted_plans', // Add this for deleted plans
            'deleted_features', // Add this for deleted features
            'deleted_discounts', // Add this for deleted discounts
            'deleted_referral_discounts', // Add this for deleted referral discounts
            'deleted_payments', // Add this for deleted payments
            'modules',
    'module_activity_logs',
    'company_modules',
    'deleted_modules',
    'plan_activity_logs'        
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
        plans = database.collection('plans'); // Add this for pricing plans
        features = database.collection('features'); // Add this for features
        discounts = database.collection('discounts'); // Add this for discounts
        referral_discounts = database.collection('referral_discounts'); // Add this for referral discounts
        invoices = database.collection('invoices'); // Add this for invoices
        subscription_logs = database.collection('subscription_logs'); // Add this for subscription logs
        data_retention_policies = database.collection('data_retention_policies'); // Add this for data retention policies
        deleted_plans = database.collection('deleted_plans'); // Add this for deleted plans
        deleted_features = database.collection('deleted_features'); // Add this for deleted features
        deleted_discounts = database.collection('deleted_discounts'); // Add this for deleted discounts
        deleted_referral_discounts = database.collection('deleted_referral_discounts'); // Add this for deleted referral discounts
        deleted_payments = database.collection('deleted_payments'); // Add this for deleted payments
         modules = database.collection('modules');
        module_activity_logs = database.collection('module_activity_logs');
        company_modules = database.collection('company_modules');
        deleted_modules = database.collection('deleted_modules');
        plan_activity_logs = database.collection('plan_activity_logs');


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
            ensureIndex(billing_history, { date: -1 }),

            // Company index
            ensureIndex(company_audit_logs, { companyId: 1 }),
            ensureIndex(company_audit_logs, { timestamp: -1 }),
            ensureIndex(company_audit_logs, { type: 1 }),

            // Add indexes for new collections
            ensureIndex(plans, { name: 1 }, { unique: true }),
            ensureIndex(features, { name: 1 }, { unique: true }),
            ensureIndex(discounts, { code: 1 }, { unique: true }),
            ensureIndex(referral_discounts, { code: 1 }, { unique: true }),
            ensureIndex(invoices, { invoiceNumber: 1 }, { unique: true }),
            ensureIndex(subscription_logs, { timestamp: -1 }),
            ensureIndex(data_retention_policies, { retentionPeriod: 1 }),
            ensureIndex(deleted_plans, { name: 1 }),
            ensureIndex(deleted_features, { name: 1 }),
            ensureIndex(deleted_discounts, { code: 1 }),
            ensureIndex(deleted_referral_discounts, { code: 1 }),
            ensureIndex(deleted_payments, { type: 1 }),
            // Modules indexes
            ensureIndex(modules, { name: 1 }, { unique: true }),
            ensureIndex(modules, { category: 1 }),
            ensureIndex(modules, { complianceLevel: 1 }),
            ensureIndex(modules, { isActive: 1 }),
            
            // Module activity logs indexes
            ensureIndex(module_activity_logs, { timestamp: -1 }),
            ensureIndex(module_activity_logs, { type: 1 }),
            ensureIndex(module_activity_logs, { moduleId: 1 }),
            
            // Company modules indexes
            ensureIndex(company_modules, { moduleId: 1 }),
            ensureIndex(company_modules, { companyId: 1 }),
            ensureIndex(company_modules, { status: 1 }),
            
            // Deleted modules indexes
            ensureIndex(deleted_modules, { originalId: 1 }),
            ensureIndex(deleted_modules, { deletedAt: -1 }),


            ensureIndex(database.collection('plan_activity_logs'), { 
    type: 1, 
    timestamp: -1 
}, { 
    name: 'plan_activity_type_timestamp_index' 
}),
ensureIndex(database.collection('plan_activity_logs'), { 
    'details.planId': 1 
}, { 
    name: 'plan_activity_plan_id_index' 
}),
ensureIndex(database.collection('plan_activity_logs'), { 
    'details.planName': 1 
}, { 
    name: 'plan_activity_plan_name_index' 
}),
ensureIndex(database.collection('plan_activity_logs'), { 
    userId: 1, 
    type: 1 
}, { 
    name: 'plan_activity_user_type_index' 
}),

            
ensureIndex(database.collection('plan_activity_logs'), { type: 1 }),
ensureIndex(database.collection('plan_activity_logs'), { timestamp: -1 }),
ensureIndex(database.collection('plan_activity_logs'), { userId: 1 }),
            // Add to your index creation in initializeDatabase
ensureIndex(plan_activity_logs, { timestamp: -1 }),
ensureIndex(plan_activity_logs, { type: 1, timestamp: -1 }),
ensureIndex(plan_activity_logs, { userId: 1, timestamp: -1 })

            
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
            billing_history,
            plans, // Add this for pricing plans
            features, // Add this for features
            discounts, // Add this for discounts
            referral_discounts, // Add this for referral discounts
            invoices, // Add this for invoices
            subscription_logs, // Add this for subscription logs
            data_retention_policies, // Add this for data retention policies
            modules,
            module_activity_logs,
            company_modules,
            deleted_modules
        };
    } catch (err) {
        console.error("MongoDB initialization error:", err);
        throw err;
    }
}

// Helper function to initialize default modules
async function initializeDefaultModules() {
    try {
        const existingModules = await modules.countDocuments();
        if (existingModules === 0) {
            console.log('Initializing default modules...');

            const defaultModules = [
                {
                    name: 'Employee Management',
                    category: 'hr',
                    description: 'Comprehensive employee record and profile management',
                    complianceLevel: 'high',
                    permissions: ['view', 'edit', 'delete'],
                    subscriptionTiers: ['basic', 'pro', 'enterprise'],
                    isActive: true,
                    createdAt: new Date()
                },
                {
                    name: 'Payroll Processing',
                    category: 'finance',
                    description: 'Automated payroll calculation and management',
                    complianceLevel: 'high',
                    permissions: ['view', 'edit'],
                    subscriptionTiers: ['pro', 'enterprise'],
                    isActive: true,
                    createdAt: new Date()
                },
                {
                    name: 'Performance Management',
                    category: 'hr',
                    description: 'Goal setting, performance reviews, and tracking',
                    complianceLevel: 'medium',
                    permissions: ['view', 'edit'],
                    subscriptionTiers: ['pro', 'enterprise'],
                    isActive: true,
                    createdAt: new Date()
                },
                {
                    name: 'Recruitment',
                    category: 'hr',
                    description: 'Job posting, application tracking, and hiring management',
                    complianceLevel: 'medium',
                    permissions: ['view', 'edit'],
                    subscriptionTiers: ['pro', 'enterprise'],
                    isActive: true,
                    createdAt: new Date()
                },
                {
                    name: 'Attendance Tracking',
                    category: 'hr',
                    description: 'Employee attendance and time-off management',
                    complianceLevel: 'low',
                    permissions: ['view', 'edit'],
                    subscriptionTiers: ['basic', 'pro', 'enterprise'],
                    isActive: true,
                    createdAt: new Date()
                },
                {
                    name: 'Financial Reporting',
                    category: 'finance',
                    description: 'Comprehensive financial reporting and analytics',
                    complianceLevel: 'high',
                    permissions: ['view'],
                    subscriptionTiers: ['enterprise'],
                    isActive: true,
                    createdAt: new Date()
                },
                {
                    name: 'API Integrations',
                    category: 'integrations',
                    description: 'Third-party system and tool integrations',
                    complianceLevel: 'medium',
                    permissions: ['view', 'edit'],
                    subscriptionTiers: ['pro', 'enterprise'],
                    isActive: true,
                    createdAt: new Date()
                }
            ];

            await modules.insertMany(defaultModules);
            console.log('Default modules initialized');
        }
    } catch (error) {
        console.error('Error initializing default modules:', error);
        throw error;
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
async function createAuditLog(logType, userId, companyId, details, session = null, moduleId = null) {
    try {
        // Fetch user details before creating the log
        let userDetails = { 
            name: 'System', 
            email: 'system@example.com',
            role: 'system'
        };
        
        if (userId) {
            try {
                const user = await database.collection('users').findOne(
                    { _id: new ObjectId(userId) },
                    { 
                        projection: { 
                            name: 1, 
                            email: 1, 
                            role: 1 
                        } 
                    }
                );

                if (user) {
                    userDetails = {
                        name: user.name || user.email.split('@')[0],
                        email: user.email,
                        role: user.role || 'user'
                    };
                }
            } catch (userFetchError) {
                console.error('Error fetching user details:', {
                    userId,
                    error: userFetchError.message
                });
            }
        }

        // Prepare audit log entry
        const auditLog = {
            type: logType,
            timestamp: new Date(),
            userId: userId ? new ObjectId(userId) : null,
            user: userDetails,  // Include full user details
            details: details,
            ip: details?.ip || null,
            userAgent: details?.userAgent || null
        };

        // Add moduleId if provided
        if (moduleId) {
            auditLog.moduleId = new ObjectId(moduleId);
        }

        // Add companyId if provided
        if (companyId) {
            auditLog.companyId = new ObjectId(companyId);
        }

        // Determine the target collection based on log type and context
        let targetCollection;

        switch (true) {
            case logType.startsWith('MODULE_'):
                targetCollection = database.collection('module_activity_logs');
                break;
            case logType.startsWith('PLAN_'):
                targetCollection = database.collection('plan_activity_logs');
                break;
            case !!companyId:
                targetCollection = company_audit_logs;
                break;
            default:
                targetCollection = audit_logs;
        }

        // Comprehensive log details
        const logDetails = {
            ...details,
            originalDetails: { ...details }  // Keep original details for reference
        };

        // Update auditLog with comprehensive details
        auditLog.details = logDetails;

        // Insert log with or without session
        let result;
        if (session) {
            result = await targetCollection.insertOne(auditLog, { session });
        } else {
            result = await targetCollection.insertOne(auditLog);
        }

        // Detailed logging
        console.log(`Audit log created in ${targetCollection.collectionName}:`, {
            logType,
            userId,
            moduleId,
            collectionName: targetCollection.collectionName,
            insertedId: result.insertedId
        });

        return auditLog;
    } catch (error) {
        // Comprehensive error handling
        console.error('Error creating audit log:', {
            logType,
            userId,
            companyId,
            moduleId,
            details,
            errorMessage: error.message,
            errorStack: error.stack
        });

        // Log errors to a separate error collection
        try {
            await database.collection('error_logs').insertOne({
                type: 'AUDIT_LOG_CREATION_ERROR',
                timestamp: new Date(),
                details: {
                    logType,
                    userId,
                    companyId,
                    moduleId,
                    errorMessage: error.message,
                    errorStack: error.stack
                }
            });
        } catch (logError) {
            console.error('Failed to log audit log creation error:', {
                originalError: error,
                logError
            });
        }

        // Rethrow the original error
        throw error;
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

// Validation helper functions
function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

function validateCompanyData(data) {
    // Check for required fields
    if (!data.name || data.name.trim().length < 2) {
        throw new Error('Company name must be at least 2 characters long');
    }

    if (!data.industry) {
        throw new Error('Industry is required');
    }

    if (!data.companySize || data.companySize < 1) {
        throw new Error('Company size must be at least 1');
    }

    if (!data.contactDetails || !data.contactDetails.email) {
        throw new Error('Contact email is required');
    }

    if (!isValidEmail(data.contactDetails.email)) {
        throw new Error('Invalid email format');
    }

    if (!data.contactDetails.phone) {
        throw new Error('Contact phone is required');
    }

    if (!data.contactDetails.address) {
        throw new Error('Contact address is required');
    }

    if (!data.subscriptionPlan) {
        throw new Error('Subscription plan is required');
    }

    if (!data.status) {
        throw new Error('Status is required');
    }

    // Validate subscription plan
    const validPlans = ['basic', 'premium', 'enterprise'];
    if (!validPlans.includes(data.subscriptionPlan.toLowerCase())) {
        throw new Error('Invalid subscription plan');
    }

    // Validate status
    const validStatuses = ['active', 'inactive'];
    if (!validStatuses.includes(data.status.toLowerCase())) {
        throw new Error('Invalid status');
    }

    return true;
}

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

            // Calculate plan price
            const planPrice = getPlanPrice(subscriptionPlan);

            // Create company object
            const company = {
                name,
                industry,
                companySize: parseInt(companySize),
                contactDetails,
                subscriptionPlan,
                planPrice,
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
                price: planPrice,
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

            // Get the created company
            const createdCompany = await companies.findOne(
                { _id: result.insertedId },
                { session }
            );

            res.status(201).json({
                success: true,
                message: 'Company created successfully',
                data: createdCompany
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
            const conflicts = await companies.findOne({
                _id: { $ne: new ObjectId(companyId) },
                $or: [
                    { name: updateData.name },
                    { 'contactDetails.email': updateData.contactDetails?.email }
                ]
            }, { session });

            if (conflicts) {
                throw new Error('Company with this name or email already exists');
            }

            // Get plan price
            const planPrice = getPlanPrice(updateData.subscriptionPlan);

            // Prepare update data
            const companyUpdateData = {
                name: updateData.name,
                industry: updateData.industry,
                companySize: parseInt(updateData.companySize),
                contactDetails: {
                    email: updateData.contactDetails?.email,
                    phone: updateData.contactDetails?.phone,
                    address: updateData.contactDetails?.address
                },
                subscriptionPlan: updateData.subscriptionPlan,
                planPrice: planPrice,
                status: updateData.status,
                updatedAt: new Date(),
                updatedBy: new ObjectId(req.user.userId)
            };

            // Update company
            const updateResult = await companies.updateOne(
                { _id: new ObjectId(companyId) },
                { $set: companyUpdateData },
                { session }
            );

            if (updateResult.matchedCount === 0) {
                throw new Error('Company not found');
            }

            // Get updated company
            const updatedCompany = await companies.findOne(
                { _id: new ObjectId(companyId) },
                { session }
            );

            // Create audit log
            await createAuditLog(
                'COMPANY_UPDATED',
                req.user.userId,
                companyId,
                {
                    companyName: existingCompany.name,
                    changes: {
                        before: existingCompany,
                        after: updatedCompany
                    }
                },
                session
            );

            res.json({
                success: true,
                message: 'Company updated successfully',
                data: updatedCompany
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

            // Create audit log for status change
            await createAuditLog(
                'COMPANY_STATUS_CHANGED',
                req.user.userId,
                companyId,
                {
                    companyName: company.name,
                    oldStatus: company.status,
                    newStatus: newStatus,
                    changedAt: new Date()
                },
                session
            );

            res.json({
                success: true,
                message: `Company ${newStatus === 'active' ? 'activated' : 'deactivated'} successfully`,
                data: { status: newStatus }
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
        if (key === '_id' || key === 'createdAt' || key === 'updatedAt' || key === 'updatedBy') continue;
        
        if (typeof newObj[key] === 'object' && newObj[key] !== null) {
            const nestedChanges = getChanges(oldObj[key] || {}, newObj[key]);
            if (Object.keys(nestedChanges).length > 0) {
                changes[key] = nestedChanges;
            }
        } else if (oldObj[key] !== newObj[key]) {
            changes[key] = {
                previous: oldObj[key],
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
                    oldPlan: company.subscriptionPlan,
                    newPlan: plan,
                    oldBillingCycle: company.billingCycle,
                    newBillingCycle: billingCycle,
                    changedAt: new Date()
                },
                session
            );
            
            // Generate invoice
             res.json({
                success: true,
                message: 'Subscription updated successfully',
                data: updatedSubscription
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

// Module Management Routes

// 1. Get All Modules
app.get('/api/modules', verifyToken, verifyAdmin, async (req, res) => {
    try {
        // Set CORS headers explicitly
        res.set({
            'Access-Control-Allow-Origin': req.get('Origin') || '*',
            'Access-Control-Allow-Methods': 'GET,OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization, Origin, Accept, X-Requested-With, X-User-Role'
        });

        // Get pagination parameters
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const skip = (page - 1) * limit;

        // Get search and filter parameters
        const { search, category, complianceLevel } = req.query;
        const filter = {};

        // Add search filter
        if (search) {
            filter.$or = [
                { name: { $regex: search, $options: 'i' } },
                { description: { $regex: search, $options: 'i' } }
            ];
        }

        // Add category filter
        if (category) {
            filter.category = category;
        }

        // Add compliance level filter
        if (complianceLevel) {
            filter.complianceLevel = complianceLevel;
        }

        // Logging for debugging
        console.log('Module Query Filter:', {
            page,
            limit,
            filter,
            requestOrigin: req.get('Origin')
        });

        // Get total count for pagination
        const totalModules = await database.collection('modules').countDocuments(filter);

        // Fetch modules with pagination
        const modules = await database.collection('modules')
            .find(filter)
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit)
            .toArray();

        // Enhance modules with additional metadata
        const enhancedModules = await Promise.all(modules.map(async (module) => {
            try {
                const usageCount = await calculateModuleUsage(module._id);
                return {
                    ...module,
                    usageCount
                };
            } catch (usageError) {
                console.error(`Usage calculation error for module ${module._id}:`, usageError);
                return {
                    ...module,
                    usageCount: 0
                };
            }
        }));

        // Send response with pagination details
        res.json({
            success: true,
            data: enhancedModules,
            pagination: {
                total: totalModules,
                page,
                totalPages: Math.ceil(totalModules / limit),
                hasMore: page * limit < totalModules
            }
        });

    } catch (error) {
        // Comprehensive error handling
        console.error('Error fetching modules:', {
            message: error.message,
            stack: error.stack,
            requestQuery: req.query
        });

        // Send error response
        res.status(500).json({
            success: false,
            message: 'Error fetching modules',
            error: error.message
        });
    }
});

// Add an OPTIONS handler for preflight requests
app.options('/api/modules', (req, res) => {
    res.set({
        'Access-Control-Allow-Origin': req.get('Origin') || '*',
        'Access-Control-Allow-Methods': 'GET,OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization, Origin, Accept, X-Requested-With, X-User-Role'
    });
    res.status(204).send();
});

// Helper function for error logging
async function createErrorLog(type, details) {
    try {
        await database.collection('error_logs').insertOne({
            type,
            timestamp: new Date(),
            ...details
        });
    } catch (logError) {
        console.error('Error logging failed:', logError);
    }
}

// Helper function to calculate module usage
async function calculateModuleUsage(moduleId) {
    try {
        // Ensure moduleId is converted to ObjectId
        const objectId = typeof moduleId === 'string' 
            ? new ObjectId(moduleId) 
            : moduleId;

        // Detailed logging
        console.log('Calculating usage for moduleId:', objectId);

        // Count how many companies are using this module
        const usageCount = await database.collection('company_modules').countDocuments({
            moduleId: objectId,
            status: 'active'
        });

        console.log(`Usage count for ${objectId}: ${usageCount}`);

        return usageCount;
    } catch (error) {
        console.error('Detailed Error in calculateModuleUsage:', {
            moduleId,
            error: error.message,
            stack: error.stack
        });
        return 0;
    }
}
// 2. Create New Module
app.post('/api/modules', verifyToken, verifyAdmin, async (req, res) => {
    const session = client.startSession();
    try {
        await session.withTransaction(async () => {
            const {
                name,
                category,
                description,
                complianceLevel,
                permissions,
                subscriptionTiers,
                isActive = true
            } = req.body;

            // Validate required fields
            if (!name || !category || !description) {
                throw new Error('Missing required module fields');
            }

            // Validate category
            const validCategories = ['hr', 'finance', 'operations', 'integrations'];
            if (!validCategories.includes(category)) {
                throw new Error('Invalid module category');
            }

            // Validate compliance level
            const validComplianceLevels = ['low', 'medium', 'high'];
            if (!validComplianceLevels.includes(complianceLevel)) {
                throw new Error('Invalid compliance level');
            }

            // Check if module with same name exists
            const existingModule = await database.collection('modules').findOne({
                name: { $regex: new RegExp(`^${name}$`, 'i') }
            }, { session });

            if (existingModule) {
                throw new Error('Module with this name already exists');
            }

            // Prepare module object
            const module = {
                name,
                category,
                description,
                complianceLevel,
                permissions: permissions || [],
                subscriptionTiers: subscriptionTiers || [],
                isActive,
                createdAt: new Date(),
                createdBy: new ObjectId(req.user.userId),
                updatedAt: new Date()
            };

            // Insert module
            const result = await database.collection('modules').insertOne(module, { session });

            // Create audit log
            await createAuditLog(
                'MODULE_CREATED',
                req.user.userId,
                result.insertedId,
                {
                    moduleName: name,
                    category,
                    complianceLevel
                },
                session
            );

            res.status(201).json({
                success: true,
                message: 'Module created successfully',
                data: {
                    _id: result.insertedId,
                    ...module
                }
            });
        });
    } catch (error) {
        console.error('Error creating module:', error);
        res.status(error.message.includes('exists') ? 400 : 500).json({
            success: false,
            message: error.message || 'Error creating module'
        });
    } finally {
        await session.endSession();
    }
});

// 3. Update Module
app.put('/api/modules/:moduleId', verifyToken, verifyAdmin, async (req, res) => {
    const session = client.startSession();
    try {
        await session.withTransaction(async () => {
            const { moduleId } = req.params;
            const {
                name,
                category,
                description,
                complianceLevel,
                permissions,
                subscriptionTiers
            } = req.body;

            // Validate moduleId
            if (!ObjectId.isValid(moduleId)) {
                throw new Error('Invalid module ID');
            }

            // Get existing module
            const existingModule = await database.collection('modules').findOne({
                _id: new ObjectId(moduleId)
            }, { session });

            if (!existingModule) {
                throw new Error('Module not found');
            }

            // Validate category if provided
            const validCategories = ['hr', 'finance', 'operations', 'integrations'];
            if (category && !validCategories.includes(category)) {
                throw new Error('Invalid module category');
            }

            // Validate compliance level if provided
            const validComplianceLevels = ['low', 'medium', 'high'];
            if (complianceLevel && !validComplianceLevels.includes(complianceLevel)) {
                throw new Error('Invalid compliance level');
            }

            // Check if new name conflicts with other modules
            if (name && name !== existingModule.name) {
                const nameExists = await database.collection('modules').findOne({
                    _id: { $ne: new ObjectId(moduleId) },
                    name: { $regex: new RegExp(`^${name}$`, 'i') }
                }, { session });

                if (nameExists) {
                    throw new Error('Module name already exists');
                }
            }

            // Prepare update data
            const updateData = {
                ...(name && { name }),
                ...(category && { category }),
                ...(description && { description }),
                ...(complianceLevel && { complianceLevel }),
                ...(permissions && { permissions }),
                ...(subscriptionTiers && { subscriptionTiers }),
                updatedAt: new Date(),
                updatedBy: new ObjectId(req.user.userId)
            };

            // Update module
            const result = await database.collection('modules').updateOne(
                { _id: new ObjectId(moduleId) },
                { $set: updateData },
                { session }
            );

            if (result.matchedCount === 0) {
                throw new Error('Module not found');
            }

            // Get updated module
            const updatedModule = await database.collection('modules').findOne(
                { _id: new ObjectId(moduleId) },
                { session }
            );

            // Create audit log
            await createAuditLog(
                'MODULE_UPDATED',
                req.user.userId,
                moduleId,
                {
                    changes: getChanges(existingModule, updatedModule)
                },
                session
            );

            res.json({
                success: true,
                message: 'Module updated successfully',
                data: updatedModule
            });
        });
    } catch (error) {
        console.error('Error updating module:', error);
        res.status(
            error.message.includes('not found') ? 404 :
            error.message.includes('exists') ? 400 :
            500
        ).json({
            success: false,
            message: error.message || 'Error updating module'
        });
    } finally {
        await session.endSession();
    }
});

// 4. Delete Module
app.delete('/api/modules/:moduleId', verifyToken, verifyAdmin, async (req, res) => {
    const session = client.startSession();
    try {
        await session.withTransaction(async () => {
            const { moduleId } = req.params;

            // Validate moduleId
            if (!ObjectId.isValid(moduleId)) {
                throw new Error('Invalid module ID');
            }

            // Get module before deletion
            const module = await database.collection('modules').findOne({
                _id: new ObjectId(moduleId)
            }, { session });

            if (!module) {
                throw new Error('Module not found');
            }

            // Check if module is in use by any companies
            const moduleUsage = await database.collection('company_modules').countDocuments({
                moduleId: new ObjectId(moduleId),
                status: 'active'
            }, { session });

            if (moduleUsage > 0) {
                throw new Error(`Cannot delete module. It is currently in use by ${moduleUsage} companies.`);
            }

            // Delete module
            const result = await database.collection('modules').deleteOne({
                _id: new ObjectId(moduleId)
            }, { session });

            if (result.deletedCount === 0) {
                throw new Error('Module not found');
            }

            // Create audit log
            await createAuditLog(
                'MODULE_DELETED',
                req.user.userId,
                moduleId,
                {
                    moduleName: module.name,
                    moduleDetails: module
                },
                session
            );

            // Archive module data
            await database.collection('deleted_modules').insertOne({
                ...module,
                deletedAt: new Date(),
                deletedBy: new ObjectId(req.user.userId)
            }, { session });

            res.json({
                success: true,
                message: 'Module deleted successfully',
                data: {
                    moduleId,
                    moduleName: module.name
                }
            });
        });
    } catch (error) {
        console.error('Error deleting module:', error);
        res.status(
            error.message.includes('not found') ? 404 :
            error.message.includes('in use') ? 400 :
            500
        ).json({
            success: false,
            message: error.message || 'Error deleting module'
        });
    } finally {
        await session.endSession();
    }
});

// 5. Toggle Module Status
app.patch('/api/modules/:moduleId/status', verifyToken, verifyAdmin, async (req, res) => {
    const session = client.startSession();
    try {
        await session.withTransaction(async () => {
            const { moduleId } = req.params;
            const { isActive } = req.body;

            // Validate moduleId
            if (!ObjectId.isValid(moduleId)) {
                throw new Error('Invalid module ID');
            }

            // Get existing module
            const existingModule = await database.collection('modules').findOne({
                _id: new ObjectId(moduleId)
            }, { session });

            if (!existingModule) {
                throw new Error('Module not found');
            }

            // Update module status
            await database.collection('modules').updateOne(
                { _id: new ObjectId(moduleId) },
                { 
                    $set: { 
                        isActive,
                        updatedAt: new Date(),
                        updatedBy: new ObjectId(req.user.userId)
                    } 
                },
                { session }
            );

            // Create audit log
            await createAuditLog(
                'MODULE_STATUS_CHANGED',
                req.user.userId,
                moduleId,
                {
                    oldStatus: existingModule.isActive,
                    newStatus: isActive
                },
                session
            );

            res.json({
                success: true,
                message: `Module ${isActive ? 'activated' : 'deactivated'} successfully`,
                data: { isActive }
            });
        });
    } catch (error) {
        console.error('Error changing module status:', error);
        res.status(
            error.message.includes('not found') ? 404 : 500
        ).json({
            success: false,
            message: error.message || 'Error changing module status'
        });
    } finally {
        await session.endSession();
    }
});

// 6. Fetch Module Activity Logs
app.get('/api/modules/activity-logs', verifyToken, verifyAdmin, async (req, res) => {
    try {
        const { 
            page = 1, 
            limit = 50, 
            startDate, 
            endDate, 
            type 
        } = req.query;

        const filter = {};

        // Add date range filter
        if (startDate && endDate) {
            filter.timestamp = {
                $gte: new Date(startDate),
                $lte: new Date(endDate)
            };
        }

        // Add activity type filter
        if (type) {
            filter.type = type;
        }

        // Fetch activity logs
        const logs = await database.collection('module_activity_logs')
            .find(filter)
            .sort({ timestamp: -1 })
            .skip((page - 1) * limit)
            .limit(parseInt(limit))
            .toArray();

        // Get total count
        const totalLogs = await database.collection('module_activity_logs').countDocuments(filter);

        res.json({
            success: true,
            data: logs,
            pagination: {
                total: totalLogs,
                page: parseInt(page),
                totalPages: Math.ceil(totalLogs / limit)
            }
        });
    } catch (error) {
        console.error('Error fetching module activity logs:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching module activity logs',
            error: error.message
        });
    }
});

// Company User Management Endpoints

// Add user to company
// Add user to company
app.post('/api/companies/:companyId/users', verifyToken, verifyAdmin, async (req, res) => {
    const session = client.startSession();
    try {
        await session.withTransaction(async () => {
            const { companyId } = req.params;
            const { name, email, role, department } = req.body;

            // Validate company ID
            if (!ObjectId.isValid(companyId)) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid company ID'
                });
            }

            // Check if company exists and is active
            const company = await companies.findOne({
                _id: new ObjectId(companyId),
                status: 'active'
            }, { session });

            if (!company) {
                return res.status(404).json({
                    success: false,
                    message: 'Company not found or inactive'
                });
            }

            // Check if user email already exists
            const existingUser = await company_users.findOne({
                email: { $regex: new RegExp(`^${email}$`, 'i') }
            }, { session });

            if (existingUser) {
                return res.status(400).json({
                    success: false,
                    message: 'User with this email already exists'
                });
            }

            // Generate temporary password
            const tempPassword = require('crypto')
                .randomBytes(8)
                .toString('hex');
            
            // Hash the password
            const hashedPassword = await bcrypt.hash(tempPassword, 12);

            // Create user object
            const newUser = {
                companyId: new ObjectId(companyId),
                name,
                email,
                password: hashedPassword,
                role,
                department,
                status: 'active',
                createdAt: new Date(),
                createdBy: new ObjectId(req.user.userId),
                lastLogin: null,
                passwordResetRequired: true
            };

            // Insert user
            const result = await company_users.insertOne(newUser, { session });

            // Create audit log
          await createAuditLog(
                'USER_CREATED',
                req.user.userId,
                companyId,
                {
                    userName: name,
                    userEmail: email,
                    userRole: role,
                    userDepartment: department,
                    createdAt: new Date()
                },
                session
            );

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
        res.status(500).json({
            success: false,
            message: error.message || 'Error creating user'
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
                'PASSWORD_RESET',
                req.user.userId,
                companyId,
                {
                    userId: userId,
                    userEmail: user.email,
                    resetAt: new Date()
                },
                session
            );

            res.json({
                success: true,
                message: 'Password reset successful',
                data: {
                    email: user.email,
                    tempPassword
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

// In server.js
app.post('/api/companies/:companyId/generate-invoice', verifyToken, verifyAdmin, async (req, res) => {
    const session = client.startSession();
    try {
        await session.withTransaction(async () => {
            const { companyId } = req.params;

            if (!ObjectId.isValid(companyId)) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid company ID'
                });
            }

            // Get company details
            const company = await companies.findOne(
                { _id: new ObjectId(companyId) }
            );

            if (!company) {
                return res.status(404).json({
                    success: false,
                    message: 'Company not found'
                });
            }

            // Use the subscription plan from company if no active subscription
            const subscriptionPlan = company.subscriptionPlan || 'basic';
            const planPrices = {
                basic: 99,
                premium: 199,
                enterprise: 499
            };

            const baseAmount = planPrices[subscriptionPlan] || planPrices.basic;
            const taxRate = 0.20; // 20% tax
            const taxAmount = baseAmount * taxRate;
            const totalAmount = baseAmount + taxAmount;

            // Generate invoice number
            const invoiceNumber = `INV-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

            // Create invoice
            const invoice = {
                invoiceNumber,
                companyId: new ObjectId(companyId),
                companyName: company.name,
                companyAddress: company.contactDetails?.address || '',
                companyEmail: company.contactDetails?.email || '',
                date: new Date(),
                dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
                items: [
                    {
                        description: `${subscriptionPlan.charAt(0).toUpperCase() + subscriptionPlan.slice(1)} Plan Subscription`,
                        quantity: 1,
                        unitPrice: baseAmount,
                        total: baseAmount
                    }
                ],
                subtotal: baseAmount,
                taxRate: taxRate,
                taxAmount: taxAmount,
                totalAmount: totalAmount,
                status: 'pending',
                createdAt: new Date(),
                createdBy: new ObjectId(req.user.userId)
            };

            // Save invoice
            await billing_history.insertOne(invoice);

            res.json({
                success: true,
                message: 'Invoice generated successfully',
                data: invoice
            });
        });
    } catch (error) {
        console.error('Error generating invoice:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Error generating invoice'
        });
    } finally {
        await session.endSession();
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

// Plan Management Endpoints

// Get all plans
app.get('/api/plans', verifyToken, verifyAdmin, async (req, res) => {
    try {
        const plans = await database.collection('plans').find().toArray();
        res.json({
            success: true,
            data: plans
        });
    } catch (error) {
        console.error('Error fetching plans:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching plans'
        });
    }
});

// Get single plan details
app.get('/api/plans/:planId', verifyToken, verifyAdmin, async (req, res) => {
    try {
        const { planId } = req.params;

        // Validate planId format
        if (!ObjectId.isValid(planId)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid plan ID format'
            });
        }

        // Find plan in database
        const plan = await database.collection('plans').findOne({ 
            _id: new ObjectId(planId) 
        });

        // Check if plan exists
        if (!plan) {
            return res.status(404).json({
                success: false,
                message: 'Plan not found'
            });
        }

        // Ensure convertedPrices exists
        if (!plan.convertedPrices) {
            plan.convertedPrices = {
                USD: { monthlyPrice: plan.monthlyPrice, annualPrice: plan.annualPrice },
                INR: { monthlyPrice: 0, annualPrice: 0 },
                AED: { monthlyPrice: 0, annualPrice: 0 },
                QAR: { monthlyPrice: 0, annualPrice: 0 },
                GBP: { monthlyPrice: 0, annualPrice: 0 }
            };
        }

        // Create audit log
        await createAuditLog(
            'PLAN_DETAILS_VIEWED',
            req.user.userId,
            null,
            {
                planId: plan._id,
                planName: plan.name,
                currency: plan.currency
            }
        );

        // Return plan details with comprehensive information
        res.json({
            success: true,
            data: {
                ...plan,
                supportedCurrencies: [
                    { code: 'USD', symbol: '$', name: 'US Dollar', country: 'USA' },
                    { code: 'INR', symbol: '₹', name: 'Indian Rupee', country: 'India' },
                    { code: 'AED', symbol: 'د.إ', name: 'UAE Dirham', country: 'UAE' },
                    { code: 'QAR', symbol: 'ر.ق', name: 'Qatari Riyal', country: 'Qatar' },
                    { code: 'GBP', symbol: '£', name: 'British Pound', country: 'UK' }
                ]
            }
        });

    } catch (error) {
        console.error('Error fetching plan details:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching plan details',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});
// Create new plan
// Create new plan
app.post('/api/plans', verifyToken, verifyAdmin, async (req, res) => {
    const session = client.startSession();
    try {
        await session.withTransaction(async () => {
            const {
                name,
                description,
                monthlyPrice,
                annualPrice,
                trialPeriod = 0,
                isActive = true,
                currency = 'USD',
                features = []
            } = req.body;

            // Validate required fields
            if (!name || !description || !monthlyPrice || !annualPrice) {
                throw new Error('Missing required fields');
            }

            // Validate currency
            const validCurrencies = ['USD', 'INR', 'AED', 'QAR', 'GBP'];
            if (!validCurrencies.includes(currency)) {
                throw new Error('Invalid currency');
            }

            // Check if plan exists
            const existingPlan = await database.collection('plans').findOne({
                name: { $regex: new RegExp(`^${name}$`, 'i') }
            }, { session });

            if (existingPlan) {
                throw new Error('Plan with this name already exists');
            }

            // Prepare converted prices
            const convertedPrices = {
                USD: { monthlyPrice: 0, annualPrice: 0 },
                INR: { monthlyPrice: 0, annualPrice: 0 },
                AED: { monthlyPrice: 0, annualPrice: 0 },
                QAR: { monthlyPrice: 0, annualPrice: 0 },
                GBP: { monthlyPrice: 0, annualPrice: 0 }
            };

            // Conversion rates (you might want to fetch these dynamically)
            const conversionRates = {
                USD: { INR: 83.50, AED: 3.67, QAR: 3.64, GBP: 0.79 },
                INR: { USD: 0.012, AED: 0.044, QAR: 0.044, GBP: 0.015 },
                AED: { USD: 0.27, INR: 22.70, QAR: 1.0, GBP: 0.34 },
                QAR: { USD: 0.27, INR: 22.70, AED: 1.0, GBP: 0.34 },
                GBP: { USD: 1.26, INR: 66.50, AED: 2.93, QAR: 2.90 }
            };

            // Markup rules
            const markupRules = {
                INR: { USD: 1.3, AED: 1.3, QAR: 1.3, GBP: 1.4 },
                USD: { GBP: 1.2 },
                AED: { GBP: 1.3 },
                QAR: { GBP: 1.3 }
            };

            // Calculate converted prices
            validCurrencies.forEach(targetCurrency => {
                if (targetCurrency === currency) {
                    // Set base currency prices
                    convertedPrices[targetCurrency] = {
                        monthlyPrice: parseFloat(monthlyPrice),
                        annualPrice: parseFloat(annualPrice)
                    };
                } else {
                    // Convert prices
                    const monthlyRate = parseFloat(monthlyPrice) * conversionRates[currency][targetCurrency];
                    const annualRate = parseFloat(annualPrice) * conversionRates[currency][targetCurrency];

                    // Apply markup if exists
                    const markup = markupRules[currency]?.[targetCurrency] || 1;
                    
                    convertedPrices[targetCurrency] = {
                        monthlyPrice: Math.round(monthlyRate * markup * 100) / 100,
                        annualPrice: Math.round(annualRate * markup * 100) / 100
                    };
                }
            });

            // Create plan object
            const plan = {
                name,
                description,
                monthlyPrice: parseFloat(monthlyPrice),
                annualPrice: parseFloat(annualPrice),
                trialPeriod: parseInt(trialPeriod),
                isActive,
                currency,
                features: features.map(f => ({ name: f })),
                convertedPrices, // Add converted prices
                createdAt: new Date(),
                createdBy: new ObjectId(req.user.userId),
                updatedAt: new Date()
            };

            const result = await database.collection('plans').insertOne(plan, { session });

            // Create comprehensive audit log
            await createAuditLog(
                'PLAN_CREATED',
                req.user.userId,
                null,
                {
                    planId: result.insertedId,
                    planName: name,
                    planDetails: {
                        ...plan,
                        convertedPrices
                    },
                    createdBy: req.user.userId
                },
                session
            );

            res.status(201).json({
                success: true,
                message: 'Plan created successfully',
                data: {
                    _id: result.insertedId,
                    ...plan
                }
            });
        });
    } catch (error) {
        console.error('Error creating plan:', error);
        res.status(error.message.includes('already exists') ? 400 : 500).json({
            success: false,
            message: error.message || 'Error creating plan'
        });
    } finally {
        await session.endSession();
    }
});

// Update existing plan
app.put('/api/plans/:planId', verifyToken, verifyAdmin, async (req, res) => {
    const session = client.startSession();
    try {
        await session.withTransaction(async () => {
            const { planId } = req.params;
            const {
                name,
                description,
                monthlyPrice,
                annualPrice,
                trialPeriod,
                isActive,
                features
            } = req.body;

            // Validate planId format
            if (!ObjectId.isValid(planId)) {
                throw new Error('Invalid plan ID');
            }

            // Get existing plan
            const existingPlan = await database.collection('plans').findOne({
                _id: new ObjectId(planId)
            }, { session });

            if (!existingPlan) {
                throw new Error('Plan not found');
            }

            // Conversion rates
            const conversionRates = {
                USD: { INR: 83.50, AED: 3.67, QAR: 3.64, GBP: 0.79 },
                INR: { USD: 0.012, AED: 0.044, QAR: 0.044, GBP: 0.015 },
                AED: { USD: 0.27, INR: 22.70, QAR: 1.0, GBP: 0.34 },
                QAR: { USD: 0.27, INR: 22.70, AED: 1.0, GBP: 0.34 },
                GBP: { USD: 1.26, INR: 66.50, AED: 2.93, QAR: 2.90 }
            };

            // Markup rules
            const markupRules = {
                INR: { USD: 1.3, AED: 1.3, QAR: 1.3, GBP: 1.4 },
                USD: { GBP: 1.2 },
                AED: { GBP: 1.3 },
                QAR: { GBP: 1.3 }
            };

            // Prepare converted prices
            const convertedPrices = existingPlan.convertedPrices || {
                USD: { monthlyPrice: 0, annualPrice: 0 },
                INR: { monthlyPrice: 0, annualPrice: 0 },
                AED: { monthlyPrice: 0, annualPrice: 0 },
                QAR: { monthlyPrice: 0, annualPrice: 0 },
                GBP: { monthlyPrice: 0, annualPrice: 0 }
            };

            // Recalculate converted prices
            const validCurrencies = ['USD', 'INR', 'AED', 'QAR', 'GBP'];
            validCurrencies.forEach(targetCurrency => {
                if (targetCurrency === existingPlan.currency) {
                    // Update base currency prices
                    convertedPrices[targetCurrency] = {
                        monthlyPrice: parseFloat(monthlyPrice || existingPlan.monthlyPrice),
                        annualPrice: parseFloat(annualPrice || existingPlan.annualPrice)
                    };
                } else {
                    // Convert prices
                    const monthlyRate = parseFloat(monthlyPrice || existingPlan.monthlyPrice) * 
                        conversionRates[existingPlan.currency][targetCurrency];
                    const annualRate = parseFloat(annualPrice || existingPlan.annualPrice) * 
                        conversionRates[existingPlan.currency][targetCurrency];

                    // Apply markup if exists
                    const markup = markupRules[existingPlan.currency]?.[targetCurrency] || 1;
                    
                    convertedPrices[targetCurrency] = {
                        monthlyPrice: Math.round(monthlyRate * markup * 100) / 100,
                        annualPrice: Math.round(annualRate * markup * 100) / 100
                    };
                }
            });

            // Prepare update data
            const updateData = {
                ...(name && { name }),
                ...(description && { description }),
                ...(monthlyPrice && { monthlyPrice: parseFloat(monthlyPrice) }),
                ...(annualPrice && { annualPrice: parseFloat(annualPrice) }),
                ...(trialPeriod !== undefined && { trialPeriod: parseInt(trialPeriod) }),
                ...(isActive !== undefined && { isActive }),
                ...(features && { features }),
                convertedPrices,
                updatedAt: new Date(),
                updatedBy: new ObjectId(req.user.userId)
            };

            // Update plan
            const result = await database.collection('plans').updateOne(
                { _id: new ObjectId(planId) },
                { $set: updateData },
                { session }
            );

            if (result.matchedCount === 0) {
                throw new Error('Plan not found');
            }

            // Get updated plan
            const updatedPlan = await database.collection('plans').findOne(
                { _id: new ObjectId(planId) },
                { session }
            );

            // Create audit log
            await createAuditLog(
                'PLAN_UPDATED',
                req.user.userId,
                null,
                {
                    planId,
                    planName: updatedPlan.name,
                    changes: {
                        ...getChanges(existingPlan, updatedPlan),
                        convertedPrices: updatedPlan.convertedPrices
                    }
                },
                session
            );

            res.json({
                success: true,
                message: 'Plan updated successfully',
                data: updatedPlan
            });
        });
    } catch (error) {
        console.error('Error updating plan:', error);
        res.status(
            error.message.includes('not found') ? 404 :
            error.message.includes('already exists') ? 400 :
            500
        ).json({
            success: false,
            message: error.message || 'Error updating plan'
        });
    } finally {
        await session.endSession();
    }
});
// Delete plan
app.delete('/api/plans/:planId', verifyToken, verifyAdmin, async (req, res) => {
    const session = client.startSession();
    try {
        await session.withTransaction(async () => {
            const { planId } = req.params;

            // Validate planId format
            if (!ObjectId.isValid(planId)) {
                throw new Error('Invalid plan ID');
            }

            // Get plan before deletion
            const plan = await database.collection('plans').findOne({
                _id: new ObjectId(planId)
            }, { session });

            if (!plan) {
                throw new Error('Plan not found');
            }

            // Check if plan has active subscriptions
            const activeSubscriptions = await database.collection('subscriptions').countDocuments({
                planId: new ObjectId(planId),
                status: 'active'
            }, { session });

            if (activeSubscriptions > 0) {
                throw new Error(`Cannot delete plan. ${activeSubscriptions} active subscriptions exist.`);
            }

            // Delete plan
            const result = await database.collection('plans').deleteOne({
                _id: new ObjectId(planId)
            }, { session });

            if (result.deletedCount === 0) {
                throw new Error('Plan not found');
            }

            // Create audit log
            await createAuditLog(
                'PLAN_DELETED',
                req.user.userId,
                null,
                {
                    planId,
                    planName: plan.name
                },
                session
            );

            // Archive plan data
            await database.collection('deleted_plans').insertOne({
                ...plan,
                deletedAt: new Date(),
                deletedBy: new ObjectId(req.user.userId)
            }, { session });

            res.json({
                success: true,
                message: 'Plan deleted successfully',
                data: {
                    planId,
                    planName: plan.name
                }
            });
        });
    } catch (error) {
        console.error('Error deleting plan:', error);
        res.status(
            error.message.includes('not found') ? 404 :
            error.message.includes('active subscriptions') ? 400 :
            500
        ).json({
            success: false,
            message: error.message || 'Error deleting plan'
        });
    } finally {
        await session.endSession();
    }
});

// Add this to your server.js file
app.get('/api/plan-activity-logs', verifyToken, verifyAdmin, async (req, res) => {
    try {
        // Extract query parameters
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const filter = req.query.filter || 'all';

        // Calculate skip value for pagination
        const skip = (page - 1) * limit;

        // Prepare filter query
        const filterQuery = filter === 'all' 
            ? {} 
            : { type: filter };

        // Aggregate pipeline for fetching and transforming logs
        const pipeline = [
            // Match filter
            { $match: filterQuery },

            // Sort by timestamp (most recent first)
            { $sort: { timestamp: -1 } },

            // Pagination
            { $skip: skip },
            { $limit: limit },

            // Optional: Lookup user details (if needed)
            {
                $lookup: {
                    from: 'users',
                    localField: 'userId',
                    foreignField: '_id',
                    as: 'userDetails'
                }
            },

            // Deconstruct user details
            {
                $unwind: {
                    path: '$userDetails',
                    preserveNullAndEmptyArrays: true
                }
            },

            // Project to shape the output
            {
                $project: {
                    type: 1,
                    timestamp: 1,
                    details: 1,
                    user: {
                        name: '$userDetails.name',
                        email: '$userDetails.email'
                    }
                }
            }
        ];

        // Execute aggregation
        const logs = await plan_activity_logs.aggregate(pipeline).toArray();

        // Count total logs for pagination
        const totalLogsQuery = filter === 'all' 
            ? {} 
            : { type: filter };
        const totalLogs = await plan_activity_logs.countDocuments(totalLogsQuery);

        // Prepare response
        res.json({
            success: true,
            logs: logs,
            total: totalLogs,
            page: page,
            totalPages: Math.ceil(totalLogs / limit)
        });

    } catch (error) {
        console.error('Error fetching plan activity logs:', {
            error: error.message,
            stack: error.stack
        });

        // Create a security log for unexpected errors
        await security_logs.insertOne({
            type: 'PLAN_ACTIVITY_LOGS_FETCH_ERROR',
            timestamp: new Date(),
            error: error.message,
            details: {
                query: req.query,
                userId: req.user.userId
            }
        });

        res.status(500).json({
            success: false,
            message: 'Error fetching plan activity logs',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

// Optional: Endpoint for detailed activity log
app.get('/api/plan-activity-logs/:logId', verifyToken, verifyAdmin, async (req, res) => {
    try {
        const { logId } = req.params;

        // Validate logId
        if (!ObjectId.isValid(logId)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid log ID format'
            });
        }

        // Fetch detailed log
        const log = await plan_activity_logs.findOne({ 
            _id: new ObjectId(logId) 
        });

        if (!log) {
            return res.status(404).json({
                success: false,
                message: 'Activity log not found'
            });
        }

        // Lookup user details
        const userDetails = await database.collection('users').findOne(
            { _id: log.userId },
            { projection: { name: 1, email: 1 } }
        );

        // Enrich log with user details
        const enrichedLog = {
            ...log,
            user: userDetails || { name: 'System', email: 'system@example.com' }
        };

        // Create audit log for log access
        await createAuditLog(
            'PLAN_ACTIVITY_LOG_VIEWED',
            req.user.userId,
            null,
            {
                logId: log._id,
                logType: log.type
            }
        );

        res.json({
            success: true,
            log: enrichedLog
        });

    } catch (error) {
        console.error('Error fetching specific plan activity log:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching activity log details'
        });
    }
});

// Helper function to get changes between objects
function getChanges(oldObj, newObj) {
    const changes = {};
    for (const key in newObj) {
        if (key === '_id' || key === 'createdAt' || key === 'updatedAt' || key === 'updatedBy') continue;

        if (typeof newObj[key] === 'object' && newObj[key] !== null) {
            const nestedChanges = getChanges(oldObj[key] || {}, newObj[key]);
            if (Object.keys(nestedChanges).length > 0) {
                changes[key] = nestedChanges;
            }
        } else if (oldObj[key] !== newObj[key]) {
            changes[key] = {
                previous: oldObj[key],
                new: newObj[key]
            };
        }
    }
    return changes;
}

// Helper function to validate plan data
function validatePlanData(data) {
    if (!data.name || typeof data.name !== 'string' || data.name.trim().length < 3) {
        throw new Error('Plan name must be at least 3 characters long');
    }

    if (!data.description || typeof data.description !== 'string' || data.description.trim().length < 10) {
        throw new Error('Plan description must be at least 10 characters long');
    }

    if (typeof data.monthlyPrice !== 'number' || data.monthlyPrice < 0) {
        throw new Error('Monthly price must be a non-negative number');
    }

    if (typeof data.annualPrice !== 'number' || data.annualPrice < 0) {
        throw new Error('Annual price must be a non-negative number');
    }

    if (data.trialPeriod !== undefined && (typeof data.trialPeriod !== 'number' || data.trialPeriod < 0)) {
        throw new Error('Trial period must be a non-negative number');
    }

    if (data.isActive !== undefined && typeof data.isActive !== 'boolean') {
        throw new Error('isActive must be a boolean');
    }

    if (!Array.isArray(data.features) || data.features.length === 0) {
        throw new Error('Features must be a non-empty array');
    }

    data.features.forEach((feature, index) => {
        if (typeof feature !== 'object' || !feature.name || typeof feature.name !== 'string') {
            throw new Error(`Invalid feature at index ${index}. Each feature must have a name.`);
        }
    });

    return true;
}

// Helper function to initialize default plans
async function initializeDefaultPlans() {
    try {
        const existingPlans = await database.collection('plans').countDocuments();
        if (existingPlans === 0) {
            console.log('Initializing default plans...');

            const defaultPlans = [
                {
                    name: 'Free',
                    description: 'Basic access to core HRMS features',
                    monthlyPrice: 0,
                    annualPrice: 0,
                    trialPeriod: 30,
                    isActive: true,
                    features: [
                        { name: 'Employee Management' },
                        { name: 'Attendance Tracking' }
                    ]
                },
                {
                    name: 'Basic',
                    description: 'Essential HRMS features for small businesses',
                    monthlyPrice: 99,
                    annualPrice: 999,
                    trialPeriod: 14,
                    isActive: true,
                    features: [
                        { name: 'Employee Management' },
                        { name: 'Attendance Tracking' },
                        { name: 'Payroll Processing' }
                    ]
                },
                {
                    name: 'Pro',
                    description: 'Advanced HRMS features for growing companies',
                    monthlyPrice: 199,
                    annualPrice: 1999,
                    trialPeriod: 7,
                    isActive: true,
                    features: [
                        { name: 'Employee Management' },
                        { name: 'Attendance Tracking' },
                        { name: 'Payroll Processing' },
                        { name: 'Performance Management' },
                        { name: 'Recruitment' }
                    ]
                },
                {
                    name: 'Enterprise',
                    description: 'Comprehensive HRMS solution with premium support',
                    monthlyPrice: 499,
                    annualPrice: 4999,
                    trialPeriod: 0,
                    isActive: true,
                    features: [
                        { name: 'Employee Management' },
                        { name: 'Attendance Tracking' },
                        { name: 'Payroll Processing' },
                        { name: 'Performance Management' },
                        { name: 'Recruitment' },
                        { name: 'Advanced Analytics' },
                        { name: 'Custom Integrations' },
                        { name: 'Premium Support' }
                    ]
                }
            ];

            await database.collection('plans').insertMany(defaultPlans);
            console.log('Default plans initialized');
        }
    } catch (error) {
        console.error('Error initializing default plans:', error);
        throw error;
    }
}

// Feature Management Endpoints

// Get all features
app.get('/api/features', verifyToken, verifyAdmin, async (req, res) => {
    try {
        const features = await database.collection('features').find().toArray();
        res.json({
            success: true,
            data: features
        });
    } catch (error) {
        console.error('Error fetching features:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching features'
        });
    }
});

// Create new feature
app.post('/api/features', verifyToken, verifyAdmin, async (req, res) => {
    const session = client.startSession();
    try {
        await session.withTransaction(async () => {
            const {
                name,
                description,
                category
            } = req.body;

            // Validate required fields
            if (!name || !description || !category) {
                throw new Error('Missing required fields');
            }

            // Check if feature exists
            const existingFeature = await database.collection('features').findOne({
                name: { $regex: new RegExp(`^${name}$`, 'i') }
            }, { session });

            if (existingFeature) {
                throw new Error('Feature with this name already exists');
            }

            // Create feature object
            const feature = {
                name,
                description,
                category,
                createdAt: new Date(),
                createdBy: new ObjectId(req.user.userId),
                updatedAt: new Date()
            };

            const result = await database.collection('features').insertOne(feature, { session });

            // Create audit log
            await createAuditLog(
                'FEATURE_CREATED',
                req.user.userId,
                null,
                {
                    featureName: name,
                    featureDetails: feature
                },
                session
            );

            res.status(201).json({
                success: true,
                message: 'Feature created successfully',
                data: {
                    _id: result.insertedId,
                    ...feature
                }
            });
        });
    } catch (error) {
        console.error('Error creating feature:', error);
        res.status(error.message.includes('already exists') ? 400 : 500).json({
            success: false,
            message: error.message || 'Error creating feature'
        });
    } finally {
        await session.endSession();
    }
});

// Update existing feature
app.put('/api/features/:featureId', verifyToken, verifyAdmin, async (req, res) => {
    const session = client.startSession();
    try {
        await session.withTransaction(async () => {
            const { featureId } = req.params;
            const {
                name,
                description,
                category
            } = req.body;

            // Validate featureId format
            if (!ObjectId.isValid(featureId)) {
                throw new Error('Invalid feature ID');
            }

            // Get existing feature
            const existingFeature = await database.collection('features').findOne({
                _id: new ObjectId(featureId)
            }, { session });

            if (!existingFeature) {
                throw new Error('Feature not found');
            }

            // Check if new name conflicts with other features
            if (name && name !== existingFeature.name) {
                const nameExists = await database.collection('features').findOne({
                    _id: { $ne: new ObjectId(featureId) },
                    name: { $regex: new RegExp(`^${name}$`, 'i') }
                }, { session });

                if (nameExists) {
                    throw new Error('Feature name already exists');
                }
            }

            // Prepare update data
            const updateData = {
                ...(name && { name }),
                ...(description && { description }),
                ...(category && { category }),
                updatedAt: new Date(),
                updatedBy: new ObjectId(req.user.userId)
            };

            // Update feature
            const result = await database.collection('features').updateOne(
                { _id: new ObjectId(featureId) },
                { $set: updateData },
                { session }
            );

            if (result.matchedCount === 0) {
                throw new Error('Feature not found');
            }

            // Get updated feature
            const updatedFeature = await database.collection('features').findOne(
                { _id: new ObjectId(featureId) },
                { session }
            );

            // Create audit log
            await createAuditLog(
                'FEATURE_UPDATED',
                req.user.userId,
                null,
                {
                    featureId,
                    featureName: updatedFeature.name,
                    changes: getChanges(existingFeature, updatedFeature)
                },
                session
            );

            res.json({
                success: true,
                message: 'Feature updated successfully',
                data: updatedFeature
            });
        });
    } catch (error) {
        console.error('Error updating feature:', error);
        res.status(
            error.message.includes('not found') ? 404 :
            error.message.includes('already exists') ? 400 :
            500
        ).json({
            success: false,
            message: error.message || 'Error updating feature'
        });
    } finally {
        await session.endSession();
    }
});

// Delete feature
app.delete('/api/features/:featureId', verifyToken, verifyAdmin, async (req, res) => {
    const session = client.startSession();
    try {
        await session.withTransaction(async () => {
            const { featureId } = req.params;

            // Validate featureId format
            if (!ObjectId.isValid(featureId)) {
                throw new Error('Invalid feature ID');
            }

            // Get feature before deletion
            const feature = await database.collection('features').findOne({
                _id: new ObjectId(featureId)
            }, { session });

            if (!feature) {
                throw new Error('Feature not found');
            }

            // Check if feature is used in any plans
            const usedInPlans = await database.collection('plans').countDocuments({
                'features.name': feature.name
            }, { session });

            if (usedInPlans > 0) {
                throw new Error(`Cannot delete feature. It is used in ${usedInPlans} plans.`);
            }

            // Delete feature
            const result = await database.collection('features').deleteOne({
                _id: new ObjectId(featureId)
            }, { session });

            if (result.deletedCount === 0) {
                throw new Error('Feature not found');
            }

            // Create audit log
            await createAuditLog(
                'FEATURE_DELETED',
                req.user.userId,
                null,
                {
                    featureId,
                    featureName: feature.name
                },
                session
            );

            // Archive feature data
            await database.collection('deleted_features').insertOne({
                ...feature,
                deletedAt: new Date(),
                deletedBy: new ObjectId(req.user.userId)
            }, { session });

            res.json({
                success: true,
                message: 'Feature deleted successfully',
                data: {
                    featureId,
                    featureName: feature.name
                }
            });
        });
    } catch (error) {
        console.error('Error deleting feature:', error);
        res.status(
            error.message.includes('not found') ? 404 :
            error.message.includes('used in') ? 400 :
            500
        ).json({
            success: false,
            message: error.message || 'Error deleting feature'
        });
    } finally {
        await session.endSession();
    }
});

// Helper function to validate feature data
function validateFeatureData(data) {
    if (!data.name || typeof data.name !== 'string' || data.name.trim().length < 3) {
        throw new Error('Feature name must be at least 3 characters long');
    }

    if (!data.description || typeof data.description !== 'string' || data.description.trim().length < 10) {
        throw new Error('Feature description must be at least 10 characters long');
    }

    if (!data.category || typeof data.category !== 'string' || data.category.trim().length < 3) {
        throw new Error('Feature category must be at least 3 characters long');
    }

    return true;
}

// Helper function to initialize default features
async function initializeDefaultFeatures() {
    try {
        const existingFeatures = await database.collection('features').countDocuments();
        if (existingFeatures === 0) {
            console.log('Initializing default features...');

            const defaultFeatures = [
                { name: 'Employee Management', description: 'Manage employee records and profiles', category: 'HRMS' },
                { name: 'Attendance Tracking', description: 'Track employee attendance and time off', category: 'HRMS' },
                { name: 'Payroll Processing', description: 'Automate payroll calculations and payments', category: 'Payroll' },
                { name: 'Performance Management', description: 'Set goals, conduct reviews, and track performance', category: 'Performance' },
                { name: 'Recruitment', description: 'Manage job postings, applications, and hiring process', category: 'Recruitment' },
                { name: 'Advanced Analytics', description: 'Generate detailed reports and analytics', category: 'Analytics' },
                { name: 'Custom Integrations', description: 'Integrate with third-party systems and tools', category: 'Integration' },
                { name: 'Premium Support', description: 'Access to priority support and dedicated account manager', category: 'Support' }
            ];

            await database.collection('features').insertMany(defaultFeatures);
            console.log('Default features initialized');
        }
    } catch (error) {
        console.error('Error initializing default features:', error);
        throw error;
    }
}
// Discount Management Endpoints

// Get all discounts
app.get('/api/discounts', verifyToken, verifyAdmin, async (req, res) => {
    try {
        const discounts = await database.collection('discounts').find().toArray();
        res.json({
            success: true,
            data: discounts
        });
    } catch (error) {
        console.error('Error fetching discounts:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching discounts'
        });
    }
});

// Create new discount
app.post('/api/discounts', verifyToken, verifyAdmin, async (req, res) => {
    const session = client.startSession();
    try {
        await session.withTransaction(async () => {
            const {
                code,
                type,
                value,
                expiryDate,
                usageLimit = 0,
                applicablePlans
            } = req.body;

            // Validate required fields
            if (!code || !type || !value || !expiryDate || !applicablePlans || applicablePlans.length === 0) {
                throw new Error('Missing required fields');
            }

            // Validate discount type
            if (type !== 'percentage' && type !== 'fixed') {
                throw new Error('Invalid discount type. Must be "percentage" or "fixed".');
            }

            // Validate discount value
            if (typeof value !== 'number' || value <= 0) {
                throw new Error('Discount value must be a positive number');
            }

            // Validate expiry date
            const expiry = new Date(expiryDate);
            if (isNaN(expiry.getTime())) {
                throw new Error('Invalid expiry date');
            }

            // Validate usage limit
            if (typeof usageLimit !== 'number' || usageLimit < 0) {
                throw new Error('Usage limit must be a non-negative number');
            }

            // Check if discount code exists
            const existingDiscount = await database.collection('discounts').findOne({
                code: { $regex: new RegExp(`^${code}$`, 'i') }
            }, { session });

            if (existingDiscount) {
                throw new Error('Discount code already exists');
            }

            // Validate applicable plans
            const validPlans = await database.collection('plans').find({
                _id: { $in: applicablePlans.map(id => new ObjectId(id)) }
            }, { session }).toArray();

            if (validPlans.length !== applicablePlans.length) {
                throw new Error('One or more specified plans do not exist');
            }

            // Create discount object
            const discount = {
                code,
                type,
                value,
                expiryDate: expiry.toISOString(),
                usageLimit,
                usageCount: 0,
                applicablePlans: validPlans.map(plan => plan._id),
                createdAt: new Date(),
                createdBy: new ObjectId(req.user.userId),
                updatedAt: new Date()
            };

            const result = await database.collection('discounts').insertOne(discount, { session });

            // Create audit log
            await createAuditLog(
                'DISCOUNT_CREATED',
                req.user.userId,
                null,
                {
                    discountCode: code,
                    discountDetails: discount
                },
                session
            );

            res.status(201).json({
                success: true,
                message: 'Discount created successfully',
                data: {
                    _id: result.insertedId,
                    ...discount
                }
            });
        });
    } catch (error) {
        console.error('Error creating discount:', error);
        res.status(error.message.includes('already exists') ? 400 : 500).json({
            success: false,
            message: error.message || 'Error creating discount'
        });
    } finally {
        await session.endSession();
    }
});

// Update existing discount
app.put('/api/discounts/:discountId', verifyToken, verifyAdmin, async (req, res) => {
    const session = client.startSession();
    try {
        await session.withTransaction(async () => {
            const { discountId } = req.params;
            const {
                code,
                type,
                value,
                expiryDate,
                usageLimit,
                applicablePlans
            } = req.body;

            // Validate discountId format
            if (!ObjectId.isValid(discountId)) {
                throw new Error('Invalid discount ID');
            }

            // Get existing discount
            const existingDiscount = await database.collection('discounts').findOne({
                _id: new ObjectId(discountId)
            }, { session });

            if (!existingDiscount) {
                throw new Error('Discount not found');
            }

            // Check if new code conflicts with other discounts
            if (code && code !== existingDiscount.code) {
                const codeExists = await database.collection('discounts').findOne({
                    _id: { $ne: new ObjectId(discountId) },
                    code: { $regex: new RegExp(`^${code}$`, 'i') }
                }, { session });

                if (codeExists) {
                    throw new Error('Discount code already exists');
                }
            }

            // Validate discount type
            if (type && type !== 'percentage' && type !== 'fixed') {
                throw new Error('Invalid discount type. Must be "percentage" or "fixed".');
            }

            // Validate discount value
            if (value !== undefined && (typeof value !== 'number' || value <= 0)) {
                throw new Error('Discount value must be a positive number');
            }

            // Validate expiry date
            let expiry;
            if (expiryDate) {
                expiry = new Date(expiryDate);
                if (isNaN(expiry.getTime())) {
                    throw new Error('Invalid expiry date');
                }
            }

            // Validate usage limit
            if (usageLimit !== undefined && (typeof usageLimit !== 'number' || usageLimit < 0)) {
                throw new Error('Usage limit must be a non-negative number');
            }

            // Validate applicable plans
            let validPlans;
            if (applicablePlans) {
                validPlans = await database.collection('plans').find({
                    _id: { $in: applicablePlans.map(id => new ObjectId(id)) }
                }, { session }).toArray();

                if (validPlans.length !== applicablePlans.length) {
                    throw new Error('One or more specified plans do not exist');
                }
            }

            // Prepare update data
            const updateData = {
                ...(code && { code }),
                ...(type && { type }),
                ...(value !== undefined && { value }),
                ...(expiryDate && { expiryDate: expiry.toISOString() }),
                ...(usageLimit !== undefined && { usageLimit }),
                ...(applicablePlans && { applicablePlans: validPlans.map(plan => plan._id) }),
                updatedAt: new Date(),
                updatedBy: new ObjectId(req.user.userId)
            };

            // Update discount
            const result = await database.collection('discounts').updateOne(
                { _id: new ObjectId(discountId) },
                { $set: updateData },
                { session }
            );

            if (result.matchedCount === 0) {
                throw new Error('Discount not found');
            }

            // Get updated discount
            const updatedDiscount = await database.collection('discounts').findOne(
                { _id: new ObjectId(discountId) },
                { session }
            );

            // Create audit log
            await createAuditLog(
                'DISCOUNT_UPDATED',
                req.user.userId,
                null,
                {
                    discountId,
                    discountCode: updatedDiscount.code,
                    changes: getChanges(existingDiscount, updatedDiscount)
                },
                session
            );

            res.json({
                success: true,
                message: 'Discount updated successfully',
                data: updatedDiscount
            });
        });
    } catch (error) {
        console.error('Error updating discount:', error);
        res.status(
            error.message.includes('not found') ? 404 :
            error.message.includes('already exists') ? 400 :
            500
        ).json({
            success: false,
            message: error.message || 'Error updating discount'
        });
    } finally {
        await session.endSession();
    }
});

// Delete discount
app.delete('/api/discounts/:discountId', verifyToken, verifyAdmin, async (req, res) => {
    const session = client.startSession();
    try {
        await session.withTransaction(async () => {
            const { discountId } = req.params;

            // Validate discountId format
            if (!ObjectId.isValid(discountId)) {
                throw new Error('Invalid discount ID');
            }

            // Get discount before deletion
            const discount = await database.collection('discounts').findOne({
                _id: new ObjectId(discountId)
            }, { session });

            if (!discount) {
                throw new Error('Discount not found');
            }

            // Check if discount has been used
            const usedInSubscriptions = await database.collection('subscriptions').countDocuments({
                discountCode: discount.code
            }, { session });

            if (usedInSubscriptions > 0) {
                throw new Error(`Cannot delete discount. It has been used in ${usedInSubscriptions} subscriptions.`);
            }

            // Delete discount
            const result = await database.collection('discounts').deleteOne({
                _id: new ObjectId(discountId)
            }, { session });

            if (result.deletedCount === 0) {
                throw new Error('Discount not found');
            }

            // Create audit log
            await createAuditLog(
                'DISCOUNT_DELETED',
                req.user.userId,
                null,
                {
                    discountId,
                    discountCode: discount.code
                },
                session
            );

            // Archive discount data
            await database.collection('deleted_discounts').insertOne({
                ...discount,
                deletedAt: new Date(),
                deletedBy: new ObjectId(req.user.userId)
            }, { session });

            res.json({
                success: true,
                message: 'Discount deleted successfully',
                data: {
                    discountId,
                    discountCode: discount.code
                }
            });
        });
    } catch (error) {
        console.error('Error deleting discount:', error);
        res.status(
            error.message.includes('not found') ? 404 :
            error.message.includes('used in') ? 400 :
            500
        ).json({
            success: false,
            message: error.message || 'Error deleting discount'
        });
    } finally {
        await session.endSession();
    }
});

// Apply discount to a plan
app.post('/api/discounts/apply', verifyToken, verifyAdmin, async (req, res) => {
    const session = client.startSession();
    try {
        await session.withTransaction(async () => {
            const { code, planId } = req.body;

            // Validate required fields
            if (!code || !planId) {
                throw new Error('Missing required fields');
            }

            // Validate planId format
            if (!ObjectId.isValid(planId)) {
                throw new Error('Invalid plan ID');
            }

            // Find discount
            const discount = await database.collection('discounts').findOne({
                code: { $regex: new RegExp(`^${code}$`, 'i') }
            }, { session });

            if (!discount) {
                throw new Error('Discount not found');
            }

            // Check if discount is still valid
            const now = new Date();
            const expiry = new Date(discount.expiryDate);
            if (now > expiry) {
                throw new Error('Discount has expired');
            }

            // Check if discount has reached usage limit
            if (discount.usageLimit > 0 && discount.usageCount >= discount.usageLimit) {
                throw new Error('Discount usage limit reached');
            }

            // Find plan
            const plan = await database.collection('plans').findOne({
                _id: new ObjectId(planId)
            }, { session });

            if (!plan) {
                throw new Error('Plan not found');
            }

            // Check if discount is applicable to the plan
            if (!discount.applicablePlans.includes(plan._id)) {
                throw new Error('Discount is not applicable to this plan');
            }

            // Apply discount to plan
            let updatedPlan;
            if (discount.type === 'percentage') {
                const discountAmount = plan.monthlyPrice * (discount.value / 100);
                updatedPlan = {
                    ...plan,
                    monthlyPrice: Math.max(0, plan.monthlyPrice - discountAmount),
                    annualPrice: Math.max(0, plan.annualPrice - (discountAmount * 12))
                };
            } else if (discount.type === 'fixed') {
                updatedPlan = {
                    ...plan,
                    monthlyPrice: Math.max(0, plan.monthlyPrice - discount.value),
                    annualPrice: Math.max(0, plan.annualPrice - (discount.value * 12))
                };
            }

            // Update plan with discounted prices
            await database.collection('plans').updateOne(
                { _id: new ObjectId(planId) },
                { $set: { monthlyPrice: updatedPlan.monthlyPrice, annualPrice: updatedPlan.annualPrice } },
                { session }
            );

            // Increment usage count of discount
            await database.collection('discounts').updateOne(
                { _id: discount._id },
                { $inc: { usageCount: 1 } },
                { session }
            );

            // Create audit log
            await createAuditLog(
                'DISCOUNT_APPLIED',
                req.user.userId,
                null,
                {
                    discountCode: discount.code,
                    planId: plan._id,
                    planName: plan.name,
                    discountType: discount.type,
                    discountValue: discount.value,
                    newMonthlyPrice: updatedPlan.monthlyPrice,
                    newAnnualPrice: updatedPlan.annualPrice
                },
                session
            );

            res.json({
                success: true,
                message: 'Discount applied successfully',
                data: {
                    planId: plan._id,
                    planName: plan.name,
                    newMonthlyPrice: updatedPlan.monthlyPrice,
                    newAnnualPrice: updatedPlan.annualPrice
                }
            });
        });
    } catch (error) {
        console.error('Error applying discount:', error);
        res.status(
            error.message.includes('not found') ? 404 :
            error.message.includes('expired') || error.message.includes('limit reached') || error.message.includes('not applicable') ? 400 :
            500
        ).json({
            success: false,
            message: error.message || 'Error applying discount'
        });
    } finally {
        await session.endSession();
    }
});

// Subscription Management Endpoints

// Get all subscriptions
app.get('/api/subscriptions', verifyToken, verifyAdmin, async (req, res) => {
    try {
        const subscriptions = await database.collection('subscriptions').find().toArray();
        res.json({
            success: true,
            data: subscriptions
        });
    } catch (error) {
        console.error('Error fetching subscriptions:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching subscriptions'
        });
    }
});

// Get subscriptions for a specific plan
app.get('/api/subscriptions', verifyToken, verifyAdmin, async (req, res) => {
    try {
        const { planId } = req.query;

        // Validate planId format
        if (planId && !ObjectId.isValid(planId)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid plan ID'
            });
        }

        const filter = planId ? { planId: new ObjectId(planId) } : {};
        const subscriptions = await database.collection('subscriptions').find(filter).toArray();

        res.json({
            success: true,
            data: subscriptions
        });
    } catch (error) {
        console.error('Error fetching subscriptions for specific plan:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching subscriptions'
        });
    }
});


// Create new subscription
app.post('/api/subscriptions', verifyToken, verifyAdmin, async (req, res) => {
    const session = client.startSession();
    try {
        await session.withTransaction(async () => {
            const {
                companyId,
                planId,
                billingCycle,
                startDate,
                endDate,
                discountCode = null
            } = req.body;

            // Validate required fields
            if (!companyId || !planId || !billingCycle || !startDate || !endDate) {
                throw new Error('Missing required fields');
            }

            // Validate companyId format
            if (!ObjectId.isValid(companyId)) {
                throw new Error('Invalid company ID');
            }

            // Validate planId format
            if (!ObjectId.isValid(planId)) {
                throw new Error('Invalid plan ID');
            }

            // Validate billing cycle
            if (billingCycle !== 'monthly' && billingCycle !== 'annual') {
                throw new Error('Invalid billing cycle. Must be "monthly" or "annual".');
            }

            // Validate dates
            const start = new Date(startDate);
            const end = new Date(endDate);
            if (isNaN(start.getTime()) || isNaN(end.getTime()) || start >= end) {
                throw new Error('Invalid start or end date');
            }

            // Find company
            const company = await database.collection('companies').findOne({
                _id: new ObjectId(companyId)
            }, { session });

            if (!company) {
                throw new Error('Company not found');
            }

            // Find plan
            const plan = await database.collection('plans').findOne({
                _id: new ObjectId(planId)
            }, { session });

            if (!plan) {
                throw new Error('Plan not found');
            }

            // Calculate subscription price
            let price = billingCycle === 'monthly' ? plan.monthlyPrice : plan.annualPrice;

            // Apply discount if provided
            if (discountCode) {
                const discount = await database.collection('discounts').findOne({
                    code: { $regex: new RegExp(`^${discountCode}$`, 'i') }
                }, { session });

                if (!discount) {
                    throw new Error('Invalid discount code');
                }

                const now = new Date();
                const expiry = new Date(discount.expiryDate);
                if (now > expiry) {
                    throw new Error('Discount has expired');
                }

                if (discount.usageLimit > 0 && discount.usageCount >= discount.usageLimit) {
                    throw new Error('Discount usage limit reached');
                }

                if (!discount.applicablePlans.includes(plan._id)) {
                    throw new Error('Discount is not applicable to this plan');
                }

                if (discount.type === 'percentage') {
                    price = price * (1 - discount.value / 100);
                } else if (discount.type === 'fixed') {
                    price = Math.max(0, price - discount.value * (billingCycle === 'annual' ? 12 : 1));
                }

                // Increment usage count of discount
                await database.collection('discounts').updateOne(
                    { _id: discount._id },
                    { $inc: { usageCount: 1 } },
                    { session }
                );
            }

            // Create subscription object
            const subscription = {
                companyId: new ObjectId(companyId),
                planId: new ObjectId(planId),
                planName: plan.name,
                billingCycle,
                startDate: start.toISOString(),
                endDate: end.toISOString(),
                price,
                status: 'active',
                discountCode: discountCode || null,
                createdAt: new Date(),
                createdBy: new ObjectId(req.user.userId),
                updatedAt: new Date()
            };

            const result = await database.collection('subscriptions').insertOne(subscription, { session });

            // Update company subscription
            await database.collection('companies').updateOne(
                { _id: new ObjectId(companyId) },
                { $set: { subscriptionPlan: plan.name, subscriptionStatus: 'active' } },
                { session }
            );

            // Create audit log
            await createAuditLog(
                'SUBSCRIPTION_CREATED',
                req.user.userId,
                companyId,
                {
                    companyName: company.name,
                    planName: plan.name,
                    billingCycle,
                    startDate: start.toISOString(),
                    endDate: end.toISOString(),
                    price,
                    discountCode
                },
                session
            );

            res.status(201).json({
                success: true,
                message: 'Subscription created successfully',
                data: {
                    _id: result.insertedId,
                    ...subscription
                }
            });
        });
    } catch (error) {
        console.error('Error creating subscription:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Error creating subscription'
        });
    } finally {
        await session.endSession();
    }
});

// Update existing subscription
app.put('/api/subscriptions/:subscriptionId', verifyToken, verifyAdmin, async (req, res) => {
    const session = client.startSession();
    try {
        await session.withTransaction(async () => {
            const { subscriptionId } = req.params;
            const {
                planId,
                billingCycle,
                startDate,
                endDate,
                discountCode = null
            } = req.body;

            // Validate subscriptionId format
            if (!ObjectId.isValid(subscriptionId)) {
                throw new Error('Invalid subscription ID');
            }

            // Get existing subscription
            const existingSubscription = await database.collection('subscriptions').findOne({
                _id: new ObjectId(subscriptionId)
            }, { session });

            if (!existingSubscription) {
                throw new Error('Subscription not found');
            }

            // Validate planId format if provided
            if (planId && !ObjectId.isValid(planId)) {
                throw new Error('Invalid plan ID');
            }

            // Validate billing cycle if provided
            if (billingCycle && billingCycle !== 'monthly' && billingCycle !== 'annual') {
                throw new Error('Invalid billing cycle. Must be "monthly" or "annual".');
            }

            // Validate dates if provided
            let start, end;
            if (startDate || endDate) {
                start = startDate ? new Date(startDate) : new Date(existingSubscription.startDate);
                end = endDate ? new Date(endDate) : new Date(existingSubscription.endDate);
                if (isNaN(start.getTime()) || isNaN(end.getTime()) || start >= end) {
                    throw new Error('Invalid start or end date');
                }
            }

            // Find company
            const company = await database.collection('companies').findOne({
                _id: existingSubscription.companyId
            }, { session });

            if (!company) {
                throw new Error('Company not found');
            }

            // Find new plan if planId is provided
            let newPlan;
            if (planId) {
                newPlan = await database.collection('plans').findOne({
                    _id: new ObjectId(planId)
                }, { session });

                if (!newPlan) {
                    throw new Error('Plan not found');
                }
            }

            // Calculate new subscription price
            let newPrice = existingSubscription.price;
            if (planId || billingCycle || discountCode !== null) {
                const plan = newPlan || await database.collection('plans').findOne({
                    _id: existingSubscription.planId
                }, { session });

                const cycle = billingCycle || existingSubscription.billingCycle;
                newPrice = cycle === 'monthly' ? plan.monthlyPrice : plan.annualPrice;

                // Apply discount if provided
                if (discountCode !== null) {
                    if (discountCode) {
                        const discount = await database.collection('discounts').findOne({
                            code: { $regex: new RegExp(`^${discountCode}$`, 'i') }
                        }, { session });

                        if (!discount) {
                            throw new Error('Invalid discount code');
                        }

                        const now = new Date();
                        const expiry = new Date(discount.expiryDate);
                        if (now > expiry) {
                            throw new Error('Discount has expired');
                        }

                        if (discount.usageLimit > 0 && discount.usageCount >= discount.usageLimit) {
                            throw new Error('Discount usage limit reached');
                        }

                        if (!discount.applicablePlans.includes(plan._id)) {
                            throw new Error('Discount is not applicable to this plan');
                        }

                        if (discount.type === 'percentage') {
                            newPrice = newPrice * (1 - discount.value / 100);
                        } else if (discount.type === 'fixed') {
                            newPrice = Math.max(0, newPrice - discount.value * (cycle === 'annual' ? 12 : 1));
                        }

                        // Increment usage count of discount
                        await database.collection('discounts').updateOne(
                            { _id: discount._id },
                            { $inc: { usageCount: 1 } },
                            { session }
                        );
                    } else {
                        // Remove discount if discountCode is null
                        await database.collection('discounts').updateOne(
                            { code: existingSubscription.discountCode },
                            { $inc: { usageCount: -1 } },
                            { session }
                        );
                    }
                }
            }

            // Prepare update data
            const updateData = {
                ...(planId && { planId: new ObjectId(planId), planName: newPlan.name }),
                ...(billingCycle && { billingCycle }),
                ...(startDate && { startDate: start.toISOString() }),
                ...(endDate && { endDate: end.toISOString() }),
                ...(newPrice !== existingSubscription.price && { price: newPrice }),
                ...(discountCode !== null && { discountCode }),
                updatedAt: new Date(),
                updatedBy: new ObjectId(req.user.userId)
            };

            // Update subscription
            const result = await database.collection('subscriptions').updateOne(
                { _id: new ObjectId(subscriptionId) },
                { $set: updateData },
                { session }
            );

            if (result.matchedCount === 0) {
                throw new Error('Subscription not found');
            }

            // Update company subscription
            if (planId) {
                await database.collection('companies').updateOne(
                    { _id: existingSubscription.companyId },
                    { $set: { subscriptionPlan: newPlan.name } },
                    { session }
                );
            }

            // Get updated subscription
            const updatedSubscription = await database.collection('subscriptions').findOne(
                { _id: new ObjectId(subscriptionId) },
                { session }
            );

            // Create audit log
            await createAuditLog(
                'SUBSCRIPTION_UPDATED',
                req.user.userId,
                existingSubscription.companyId,
                {
                    subscriptionId,
                    companyName: company.name,
                    changes: getChanges(existingSubscription, updatedSubscription)
                },
                session
            );

            res.json({
                success: true,
                message: 'Subscription updated successfully',
                data: updatedSubscription
            });
        });
    } catch (error) {
        console.error('Error updating subscription:', error);
        res.status(
            error.message.includes('not found') ? 404 :
            500
        ).json({
            success: false,
            message: error.message || 'Error updating subscription'
        });
    } finally {
        await session.endSession();
    }
});

// Payment Management Endpoints

// Get all payment methods
app.get('/api/payments', verifyToken, verifyAdmin, async (req, res) => {
    try {
        const payments = await database.collection('payments').find().toArray();
        res.json({
            success: true,
            data: payments
        });
    } catch (error) {
        console.error('Error fetching payments:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching payments'
        });
    }
});

// Add new payment method
app.post('/api/payments', verifyToken, verifyAdmin, async (req, res) => {
    const session = client.startSession();
    try {
        await session.withTransaction(async () => {
            const {
                type,
                details
            } = req.body;

            // Validate required fields
            if (!type || !details) {
                throw new Error('Missing required fields');
            }

            // Validate payment type
            const validTypes = ['creditCard', 'bankTransfer', 'paypal', 'razorpay'];
            if (!validTypes.includes(type)) {
                throw new Error('Invalid payment type');
            }

            // Validate payment details based on type
            let validatedDetails;
            switch (type) {
                case 'creditCard':
                    validatedDetails = validateCreditCardDetails(details);
                    break;
                case 'bankTransfer':
                    validatedDetails = validateBankTransferDetails(details);
                    break;
                case 'paypal':
                    validatedDetails = validatePayPalDetails(details);
                    break;
                case 'razorpay':
                    validatedDetails = validateRazorpayDetails(details);
                    break;
                default:
                    throw new Error('Unsupported payment type');
            }

            // Create payment object
            const payment = {
                type,
                details: validatedDetails,
                createdAt: new Date(),
                createdBy: new ObjectId(req.user.userId),
                updatedAt: new Date()
            };

            const result = await database.collection('payments').insertOne(payment, { session });

            // Create audit log
            await createAuditLog(
                'PAYMENT_METHOD_ADDED',
                req.user.userId,
                null,
                {
                    paymentType: type,
                    paymentDetails: validatedDetails
                },
                session
            );

            res.status(201).json({
                success: true,
                message: 'Payment method added successfully',
                data: {
                    _id: result.insertedId,
                    ...payment
                }
            });
        });
    } catch (error) {
        console.error('Error adding payment method:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Error adding payment method'
        });
    } finally {
        await session.endSession();
    }
});

// Helper function to validate credit card details
function validateCreditCardDetails(details) {
    const { cardNumber, expiryDate, cvv } = details;

    if (!cardNumber || !expiryDate || !cvv) {
        throw new Error('Missing required credit card details');
    }

    if (!/^\d{16}$/.test(cardNumber)) {
        throw new Error('Invalid card number format');
    }

    if (!/^\d{2}\/\d{2}$/.test(expiryDate)) {
        throw new Error('Invalid expiry date format (MM/YY)');
    }

    if (!/^\d{3,4}$/.test(cvv)) {
        throw new Error('Invalid CVV format');
    }

    return { cardNumber, expiryDate, cvv };
}

// Helper function to validate bank transfer details
function validateBankTransferDetails(details) {
    const { accountNumber, bankName, swiftCode } = details;

    if (!accountNumber || !bankName || !swiftCode) {
        throw new Error('Missing required bank transfer details');
    }

    if (!/^\d{10,18}$/.test(accountNumber)) {
        throw new Error('Invalid account number format');
    }

    if (typeof bankName !== 'string' || bankName.trim().length < 3) {
        throw new Error('Invalid bank name');
    }

    if (!/^[A-Z]{6}[A-Z2-9][A-NP-Z0-9]([A-Z0-9]{3})?$/.test(swiftCode)) {
        throw new Error('Invalid SWIFT code format');
    }

    return { accountNumber, bankName, swiftCode };
}

// Helper function to validate PayPal details
function validatePayPalDetails(details) {
    const { paypalEmail } = details;

    if (!paypalEmail) {
        throw new Error('Missing required PayPal email');
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(paypalEmail)) {
        throw new Error('Invalid PayPal email format');
    }

    return { paypalEmail };
}

// Helper function to validate Razorpay details
function validateRazorpayDetails(details) {
    const { razorpayId } = details;

    if (!razorpayId) {
        throw new Error('Missing required Razorpay ID');
    }

    if (typeof razorpayId !== 'string' || razorpayId.trim().length < 10) {
        throw new Error('Invalid Razorpay ID format');
    }

    return { razorpayId };
}

// Update existing payment method
app.put('/api/payments/:paymentId', verifyToken, verifyAdmin, async (req, res) => {
    const session = client.startSession();
    try {
        await session.withTransaction(async () => {
            const { paymentId } = req.params;
            const {
                type,
                details
            } = req.body;

            // Validate paymentId format
            if (!ObjectId.isValid(paymentId)) {
                throw new Error('Invalid payment ID');
            }

            // Get existing payment method
            const existingPayment = await database.collection('payments').findOne({
                _id: new ObjectId(paymentId)
            }, { session });

            if (!existingPayment) {
                throw new Error('Payment method not found');
            }

            // Validate payment type if provided
            if (type && !['creditCard', 'bankTransfer', 'paypal', 'razorpay'].includes(type)) {
                throw new Error('Invalid payment type');
            }

            // Validate payment details based on type
            let validatedDetails;
            if (details) {
                switch (type || existingPayment.type) {
                    case 'creditCard':
                        validatedDetails = validateCreditCardDetails(details);
                        break;
                    case 'bankTransfer':
                        validatedDetails = validateBankTransferDetails(details);
                        break;
                    case 'paypal':
                        validatedDetails = validatePayPalDetails(details);
                        break;
                    case 'razorpay':
                        validatedDetails = validateRazorpayDetails(details);
                        break;
                    default:
                        throw new Error('Unsupported payment type');
                }
            }

            // Prepare update data
            const updateData = {
                ...(type && { type }),
                ...(validatedDetails && { details: validatedDetails }),
                updatedAt: new Date(),
                updatedBy: new ObjectId(req.user.userId)
            };

            // Update payment method
            const result = await database.collection('payments').updateOne(
                { _id: new ObjectId(paymentId) },
                { $set: updateData },
                { session }
            );

            if (result.matchedCount === 0) {
                throw new Error('Payment method not found');
            }

            // Get updated payment method
            const updatedPayment = await database.collection('payments').findOne(
                { _id: new ObjectId(paymentId) },
                { session }
            );

            // Create audit log
            await createAuditLog(
                'PAYMENT_METHOD_UPDATED',
                req.user.userId,
                null,
                {
                    paymentId,
                    changes: getChanges(existingPayment, updatedPayment)
                },
                session
            );

            res.json({
                success: true,
                message: 'Payment method updated successfully',
                data: updatedPayment
            });
        });
    } catch (error) {
        console.error('Error updating payment method:', error);
        res.status(
            error.message.includes('not found') ? 404 :
            500
        ).json({
            success: false,
            message: error.message || 'Error updating payment method'
        });
    } finally {
        await session.endSession();
    }
});

// Delete payment method
app.delete('/api/payments/:paymentId', verifyToken, verifyAdmin, async (req, res) => {
    const session = client.startSession();
    try {
        await session.withTransaction(async () => {
            const { paymentId } = req.params;

            // Validate paymentId format
            if (!ObjectId.isValid(paymentId)) {
                throw new Error('Invalid payment ID');
            }

            // Get payment method before deletion
            const payment = await database.collection('payments').findOne({
                _id: new ObjectId(paymentId)
            }, { session });

            if (!payment) {
                throw new Error('Payment method not found');
            }

            // Check if payment method is used in any subscriptions
            const usedInSubscriptions = await database.collection('subscriptions').countDocuments({
                paymentMethodId: new ObjectId(paymentId)
            }, { session });

            if (usedInSubscriptions > 0) {
                throw new Error(`Cannot delete payment method. It is used in ${usedInSubscriptions} subscriptions.`);
            }

            // Delete payment method
            const result = await database.collection('payments').deleteOne({
                _id: new ObjectId(paymentId)
            }, { session });

            if (result.deletedCount === 0) {
                throw new Error('Payment method not found');
            }

            // Create audit log
            await createAuditLog(
                'PAYMENT_METHOD_DELETED',
                req.user.userId,
                null,
                {
                    paymentId,
                    paymentType: payment.type
                },
                session
            );

            // Archive payment method data
            await database.collection('deleted_payments').insertOne({
                ...payment,
                deletedAt: new Date(),
                deletedBy: new ObjectId(req.user.userId)
            }, { session });

            res.json({
                success: true,
                message: 'Payment method deleted successfully',
                data: {
                    paymentId,
                    paymentType: payment.type
                }
            });
        });
    } catch (error) {
        console.error('Error deleting payment method:', error);
        res.status(
            error.message.includes('not found') ? 404 :
            error.message.includes('used in') ? 400 :
            500
        ).json({
            success: false,
            message: error.message || 'Error deleting payment method'
        });
    } finally {
        await session.endSession();
    }
});

// Invoice Management Endpoints

// Get all invoices
app.get('/api/invoices', verifyToken, verifyAdmin, async (req, res) => {
    try {
        const invoices = await database.collection('invoices').find().toArray();
        res.json({
            success: true,
            data: invoices
        });
    } catch (error) {
        console.error('Error fetching invoices:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching invoices'
        });
    }
});

// Get invoices for a specific subscription
app.get('/api/invoices', verifyToken, verifyAdmin, async (req, res) => {
    try {
        const { subscriptionId } = req.query;

        // Validate subscriptionId format
        if (subscriptionId && !ObjectId.isValid(subscriptionId)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid subscription ID'
            });
        }

        const filter = subscriptionId ? { subscriptionId: new ObjectId(subscriptionId) } : {};
        const invoices = await database.collection('invoices').find(filter).toArray();

        res.json({
            success: true,
            data: invoices
        });
    } catch (error) {
        console.error('Error fetching invoices for specific subscription:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching invoices'
        });
    }
});


// Generate new invoice
app.post('/api/invoices', verifyToken, verifyAdmin, async (req, res) => {
    const session = client.startSession();
    try {
        await session.withTransaction(async () => {
            const {
                subscriptionId,
                amount,
                billingCycle,
                date,
                dueDate
            } = req.body;

            // Validate required fields
            if (!subscriptionId || !amount || !billingCycle || !date || !dueDate) {
                throw new Error('Missing required fields');
            }

            // Validate subscriptionId format
            if (!ObjectId.isValid(subscriptionId)) {
                throw new Error('Invalid subscription ID');
            }

            // Validate amount
            if (typeof amount !== 'number' || amount <= 0) {
                throw new Error('Invalid amount');
            }

            // Validate billing cycle
            if (billingCycle !== 'monthly' && billingCycle !== 'annual') {
                throw new Error('Invalid billing cycle. Must be "monthly" or "annual".');
            }

            // Validate dates
            const invoiceDate = new Date(date);
            const invoiceDueDate = new Date(dueDate);
            if (isNaN(invoiceDate.getTime()) || isNaN(invoiceDueDate.getTime()) || invoiceDate > invoiceDueDate) {
                throw new Error('Invalid invoice date or due date');
            }

            // Find subscription
            const subscription = await database.collection('subscriptions').findOne({
                _id: new ObjectId(subscriptionId)
            }, { session });

            if (!subscription) {
                throw new Error('Subscription not found');
            }

            // Find company
            const company = await database.collection('companies').findOne({
                _id: subscription.companyId
            }, { session });

            if (!company) {
                throw new Error('Company not found');
            }

            // Generate invoice number
            const invoiceNumber = `INV-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

            // Create invoice object
            const invoice = {
                invoiceNumber,
                subscriptionId: new ObjectId(subscriptionId),
                companyId: subscription.companyId,
                companyName: company.name,
                planName: subscription.planName,
                amount,
                billingCycle,
                date: invoiceDate.toISOString(),
                dueDate: invoiceDueDate.toISOString(),
                status: 'pending',
                createdAt: new Date(),
                createdBy: new ObjectId(req.user.userId),
                updatedAt: new Date()
            };

            const result = await database.collection('invoices').insertOne(invoice, { session });

            // Create audit log
            await createAuditLog(
                'INVOICE_GENERATED',
                req.user.userId,
                subscription.companyId,
                {
                    invoiceNumber,
                    subscriptionId: subscription._id,
                    companyName: company.name,
                    planName: subscription.planName,
                    amount,
                    billingCycle,
                    date: invoiceDate.toISOString(),
                    dueDate: invoiceDueDate.toISOString()
                },
                session
            );

            res.status(201).json({
                success: true,
                message: 'Invoice generated successfully',
                data: {
                    _id: result.insertedId,
                    ...invoice
                }
            });
        });
    } catch (error) {
        console.error('Error generating invoice:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Error generating invoice'
        });
    } finally {
        await session.endSession();
    }
});

// View invoice
app.get('/api/invoices/:invoiceId', verifyToken, verifyAdmin, async (req, res) => {
    try {
        const { invoiceId } = req.params;

        // Validate invoiceId format
        if (!ObjectId.isValid(invoiceId)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid invoice ID'
            });
        }

        const invoice = await database.collection('invoices').findOne({
            _id: new ObjectId(invoiceId)
        });

        if (!invoice) {
            return res.status(404).json({
                success: false,
                message: 'Invoice not found'
            });
        }

        res.json({
            success: true,
            data: invoice
        });
    } catch (error) {
        console.error('Error fetching invoice:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching invoice'
        });
    }
});

// Download invoice
app.get('/api/invoices/:invoiceId/download', verifyToken, verifyAdmin, async (req, res) => {
    try {
        const { invoiceId } = req.params;

        // Validate invoiceId format
        if (!ObjectId.isValid(invoiceId)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid invoice ID'
            });
        }

        const invoice = await database.collection('invoices').findOne({
            _id: new ObjectId(invoiceId)
        });

        if (!invoice) {
            return res.status(404).json({
                success: false,
                message: 'Invoice not found'
            });
        }

        // Create audit log
        await createAuditLog(
            'INVOICE_DOWNLOADED',
            req.user.userId,
            invoice.companyId,
            {
                invoiceId: invoice._id,
                invoiceNumber: invoice.invoiceNumber,
                companyName: invoice.companyName
            }
        );

        // In a real implementation, you would generate a PDF here
        // For now, we'll just send the invoice data as JSON
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Content-Disposition', `attachment; filename="invoice_${invoice.invoiceNumber}.json"`);
        res.json(invoice);

    } catch (error) {
        console.error('Error downloading invoice:', error);
        res.status(500).json({
            success: false,
            message: 'Error downloading invoice'
        });
    }
});

// Reports & Analytics Endpoints

// Generate report
app.get('/api/reports/:reportType', verifyToken, verifyAdmin, async (req, res) => {
    const { reportType } = req.params;
    const { startDate, endDate } = req.query;

    // Validate report type
    const validReportTypes = ['activeSubscribers', 'revenueBreakdown', 'featureUsage'];
    if (!validReportTypes.includes(reportType)) {
        return res.status(400).json({
            success: false,
            message: 'Invalid report type'
        });
    }

    // Validate date range
    if (!startDate || !endDate) {
        return res.status(400).json({
            success: false,
            message: 'Start date and end date are required'
        });
    }

    const start = new Date(startDate);
    const end = new Date(endDate);
    if (isNaN(start.getTime()) || isNaN(end.getTime()) || start > end) {
        return res.status(400).json({
            success: false,
            message: 'Invalid date range'
        });
    }

    try {
        let reportData;
        switch (reportType) {
            case 'activeSubscribers':
                reportData = await generateActiveSubscribersReport(start, end);
                break;
            case 'revenueBreakdown':
                reportData = await generateRevenueBreakdownReport(start, end);
                break;
            case 'featureUsage':
                reportData = await generateFeatureUsageReport(start, end);
                break;
            default:
                throw new Error('Unsupported report type');
        }

        // Create audit log
        await createAuditLog(
            'REPORT_GENERATED',
            req.user.userId,
            null,
            {
                reportType,
                startDate: start.toISOString(),
                endDate: end.toISOString()
            }
        );

        res.json({
            success: true,
            data: reportData
        });
    } catch (error) {
        console.error('Error generating report:', error);
        res.status(500).json({
            success: false,
            message: 'Error generating report'
        });
    }
});

// Helper function to generate active subscribers report
async function generateActiveSubscribersReport(startDate, endDate) {
    const pipeline = [
        {
            $match: {
                startDate: { $lte: endDate },
                endDate: { $gte: startDate },
                status: 'active'
            }
        },
        {
            $group: {
                _id: '$planName',
                activeSubscribers: { $sum: 1 }
            }
        },
        {
            $project: {
                planName: '$_id',
                activeSubscribers: 1,
                _id: 0
            }
        }
    ];

    return await database.collection('subscriptions').aggregate(pipeline).toArray();
}

// Helper function to generate revenue breakdown report
async function generateRevenueBreakdownReport(startDate, endDate) {
    const pipeline = [
        {
            $match: {
                startDate: { $lte: endDate },
                endDate: { $gte: startDate },
                status: 'active'
            }
        },
        {
            $group: {
                _id: '$planName',
                revenue: { $sum: '$price' }
            }
        },
        {
            $project: {
                planName: '$_id',
                revenue: 1,
                _id: 0
            }
        }
    ];

    return await database.collection('subscriptions').aggregate(pipeline).toArray();
}

// Helper function to generate feature usage report
async function generateFeatureUsageReport(startDate, endDate) {
    const pipeline = [
        {
            $match: {
                startDate: { $lte: endDate },
                endDate: { $gte: startDate },
                status: 'active'
            }
        },
        {
            $lookup: {
                from: 'plans',
                localField: 'planId',
                foreignField: '_id',
                as: 'planDetails'
            }
        },
        {
            $unwind: '$planDetails'
        },
        {
            $unwind: '$planDetails.features'
        },
        {
            $group: {
                _id: '$planDetails.features.name',
                usageCount: { $sum: 1 }
            }
        },
        {
            $project: {
                featureName: '$_id',
                usageCount: 1,
                _id: 0
            }
        }
    ];

    return await database.collection('subscriptions').aggregate(pipeline).toArray();
}

// Export report
app.get('/api/reports/:reportType/export', verifyToken, verifyAdmin, async (req, res) => {
    const { reportType } = req.params;
    const { startDate, endDate } = req.query;

    // Validate report type
    const validReportTypes = ['activeSubscribers', 'revenueBreakdown', 'featureUsage'];
    if (!validReportTypes.includes(reportType)) {
        return res.status(400).json({
            success: false,
            message: 'Invalid report type'
        });
    }

    // Validate date range
    if (!startDate || !endDate) {
        return res.status(400).json({
            success: false,
            message: 'Start date and end date are required'
        });
    }

    const start = new Date(startDate);
    const end = new Date(endDate);
    if (isNaN(start.getTime()) || isNaN(end.getTime()) || start > end) {
        return res.status(400).json({
            success: false,
            message: 'Invalid date range'
        });
    }

    try {
        let reportData;
        switch (reportType) {
            case 'activeSubscribers':
                reportData = await generateActiveSubscribersReport(start, end);
                break;
            case 'revenueBreakdown':
                reportData = await generateRevenueBreakdownReport(start, end);
                break;
            case 'featureUsage':
                reportData = await generateFeatureUsageReport(start, end);
                break;
            default:
                throw new Error('Unsupported report type');
        }

        // Convert report data to CSV
        const csvData = convertToCSV(reportData, reportType);

        // Create audit log
        await createAuditLog(
            'REPORT_EXPORTED',
            req.user.userId,
            null,
            {
                reportType,
                startDate: start.toISOString(),
                endDate: end.toISOString()
            }
        );

        // Set response headers for CSV download
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename="${reportType}_report_${startDate}_to_${endDate}.csv"`);
        res.send(csvData);
    } catch (error) {
        console.error('Error exporting report:', error);
        res.status(500).json({
            success: false,
            message: 'Error exporting report'
        });
    }
});

// Helper function to convert data to CSV
function convertToCSV(data, reportType) {
    let headers;
    switch (reportType) {
        case 'activeSubscribers':
            headers = ['Plan Name', 'Active Subscribers'];
            break;
        case 'revenueBreakdown':
            headers = ['Plan Name', 'Revenue'];
            break;
        case 'featureUsage':
            headers = ['Feature Name', 'Usage Count'];
            break;
        default:
            throw new Error('Unsupported report type');
    }

    const rows = [headers.join(',')];
    data.forEach(item => {
        let values;
        switch (reportType) {
            case 'activeSubscribers':
                values = [item.planName, item.activeSubscribers];
                break;
            case 'revenueBreakdown':
                values = [item.planName, item.revenue];
                break;
            case 'featureUsage':
                values = [item.featureName, item.usageCount];
                break;
        }
        rows.push(values.join(','));
    });

    return rows.join('\n');
}

// Update existing referral discount
app.put('/api/referral-discounts/:referralDiscountId', verifyToken, verifyAdmin, async (req, res) => {
    const session = client.startSession();
    try {
        await session.withTransaction(async () => {
            const { referralDiscountId } = req.params;
            const {
                code,
                type,
                value,
                expiryDate,
                usageLimit
            } = req.body;

            // Validate referralDiscountId format
            if (!ObjectId.isValid(referralDiscountId)) {
                throw new Error('Invalid referral discount ID');
            }

            // Get existing referral discount
            const existingDiscount = await database.collection('referral_discounts').findOne({
                _id: new ObjectId(referralDiscountId)
            }, { session });

            if (!existingDiscount) {
                throw new Error('Referral discount not found');
            }

            // Check if new code conflicts with other referral discounts
            if (code && code !== existingDiscount.code) {
                const codeExists = await database.collection('referral_discounts').findOne({
                    _id: { $ne: new ObjectId(referralDiscountId) },
                    code: { $regex: new RegExp(`^${code}$`, 'i') }
                }, { session });

                if (codeExists) {
                    throw new Error('Referral discount code already exists');
                }
            }

            // Validate discount type
            if (type && type !== 'percentage' && type !== 'fixed') {
                throw new Error('Invalid discount type. Must be "percentage" or "fixed".');
            }

            // Validate discount value
            if (value !== undefined && (typeof value !== 'number' || value <= 0)) {
                throw new Error('Discount value must be a positive number');
            }

            // Validate expiry date
            let expiry;
            if (expiryDate) {
                expiry = new Date(expiryDate);
                if (isNaN(expiry.getTime())) {
                    throw new Error('Invalid expiry date');
                }
            }

            // Validate usage limit
            if (usageLimit !== undefined && (typeof usageLimit !== 'number' || usageLimit < 0)) {
                throw new Error('Usage limit must be a non-negative number');
            }

            // Prepare update data
            const updateData = {
                ...(code && { code }),
                ...(type && { type }),
                ...(value !== undefined && { value }),
                ...(expiryDate && { expiryDate: expiry.toISOString() }),
                ...(usageLimit !== undefined && { usageLimit }),
                updatedAt: new Date(),
                updatedBy: new ObjectId(req.user.userId)
            };

            // Update referral discount
            const result = await database.collection('referral_discounts').updateOne(
                { _id: new ObjectId(referralDiscountId) },
                { $set: updateData },
                { session }
            );

            if (result.matchedCount === 0) {
                throw new Error('Referral discount not found');
            }

            // Get updated referral discount
            const updatedDiscount = await database.collection('referral_discounts').findOne(
                { _id: new ObjectId(referralDiscountId) },
                { session }
            );

            // Create audit log
            await createAuditLog(
                'REFERRAL_DISCOUNT_UPDATED',
                req.user.userId,
                null,
                {
                    referralDiscountId,
                    referralDiscountCode: updatedDiscount.code,
                    changes: getChanges(existingDiscount, updatedDiscount)
                },
                session
            );

            res.json({
                success: true,
                message: 'Referral discount updated successfully',
                data: updatedDiscount
            });
        });
    } catch (error) {
        console.error('Error updating referral discount:', error);
        res.status(
            error.message.includes('not found') ? 404 :
            error.message.includes('already exists') ? 400 :
            500
        ).json({
            success: false,
            message: error.message || 'Error updating referral discount'
        });
    } finally {
        await session.endSession();
    }
});

// Delete referral discount
app.delete('/api/referral-discounts/:referralDiscountId', verifyToken, verifyAdmin, async (req, res) => {
    const session = client.startSession();
    try {
        await session.withTransaction(async () => {
            const { referralDiscountId } = req.params;

            // Validate referralDiscountId format
            if (!ObjectId.isValid(referralDiscountId)) {
                throw new Error('Invalid referral discount ID');
            }

            // Get referral discount before deletion
            const referralDiscount = await database.collection('referral_discounts').findOne({
                _id: new ObjectId(referralDiscountId)
            }, { session });

            if (!referralDiscount) {
                throw new Error('Referral discount not found');
            }

            // Check if referral discount has been used
            const usedInSubscriptions = await database.collection('subscriptions').countDocuments({
                referralDiscountCode: referralDiscount.code
            }, { session });

            if (usedInSubscriptions > 0) {
                throw new Error(`Cannot delete referral discount. It has been used in ${usedInSubscriptions} subscriptions.`);
            }

            // Delete referral discount
            const result = await database.collection('referral_discounts').deleteOne({
                _id: new ObjectId(referralDiscountId)
            }, { session });

            if (result.deletedCount === 0) {
                throw new Error('Referral discount not found');
            }

            // Create audit log
            await createAuditLog(
                'REFERRAL_DISCOUNT_DELETED',
                req.user.userId,
                null,
                {
                    referralDiscountId,
                    referralDiscountCode: referralDiscount.code
                },
                session
            );

            // Archive referral discount data
            await database.collection('deleted_referral_discounts').insertOne({
                ...referralDiscount,
                deletedAt: new Date(),
                deletedBy: new ObjectId(req.user.userId)
            }, { session });

            res.json({
                success: true,
                message: 'Referral discount deleted successfully',
                data: {
                    referralDiscountId,
                    referralDiscountCode: referralDiscount.code
                }
            });
        });
    } catch (error) {
        console.error('Error deleting referral discount:', error);
        res.status(
            error.message.includes('not found') ? 404 :
            error.message.includes('used in') ? 400 :
            500
        ).json({
            success: false,
            message: error.message || 'Error deleting referral discount'
        });
    } finally {
        await session.endSession();
    }
});

// Subscription Logs Endpoints

// Get all subscription logs
app.get('/api/subscription-logs', verifyToken, verifyAdmin, async (req, res) => {
    try {
        const subscriptionLogs = await database.collection('subscription_logs').find().sort({ timestamp: -1 }).toArray();
        res.json({
            success: true,
            data: subscriptionLogs
        });
    } catch (error) {
        console.error('Error fetching subscription logs:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching subscription logs'
        });
    }
});

// Data Retention Policies Endpoints

// Get all data retention policies
app.get('/api/data-retention', verifyToken, verifyAdmin, async (req, res) => {
    try {
        const dataRetentionPolicies = await database.collection('data_retention_policies').find().toArray();
        res.json({
            success: true,
            data: dataRetentionPolicies
        });
    } catch (error) {
        console.error('Error fetching data retention policies:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching data retention policies'
        });
    }
});

// Create new data retention policy
app.post('/api/data-retention', verifyToken, verifyAdmin, async (req, res) => {
    const session = client.startSession();
    try {
        await session.withTransaction(async () => {
            const {
                retentionPeriod,
                policyDescription
            } = req.body;

            // Validate required fields
            if (!retentionPeriod || !policyDescription) {
                throw new Error('Missing required fields');
            }

            // Validate retention period
            if (typeof retentionPeriod !== 'number' || retentionPeriod < 0) {
                throw new Error('Retention period must be a non-negative number');
            }

            // Create data retention policy object
            const dataRetentionPolicy = {
                retentionPeriod,
                policyDescription,
                createdAt: new Date(),
                createdBy: new ObjectId(req.user.userId),
                updatedAt: new Date()
            };

            const result = await database.collection('data_retention_policies').insertOne(dataRetentionPolicy, { session });

            // Create audit log
            await createAuditLog(
                'DATA_RETENTION_POLICY_CREATED',
                req.user.userId,
                null,
                {
                    retentionPeriod,
                    policyDescription
                },
                session
            );

            res.status(201).json({
                success: true,
                message: 'Data retention policy created successfully',
                data: {
                    _id: result.insertedId,
                    ...dataRetentionPolicy
                }
            });
        });
    } catch (error) {
        console.error('Error creating data retention policy:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Error creating data retention policy'
        });
    } finally {
        await session.endSession();
    }
});


// Update existing data retention policy
app.put('/api/data-retention/:policyId', verifyToken, verifyAdmin, async (req, res) => {
    const session = client.startSession();
    try {
        await session.withTransaction(async () => {
            const { policyId } = req.params;
            const {
                retentionPeriod,
                policyDescription
            } = req.body;

            // Validate policyId format
            if (!ObjectId.isValid(policyId)) {
                throw new Error('Invalid policy ID');
            }

            // Get existing data retention policy
            const existingPolicy = await database.collection('data_retention_policies').findOne({
                _id: new ObjectId(policyId)
            }, { session });

            if (!existingPolicy) {
                throw new Error('Data retention policy not found');
            }

            // Validate retention period
            if (retentionPeriod !== undefined && (typeof retentionPeriod !== 'number' || retentionPeriod < 0)) {
                throw new Error('Retention period must be a non-negative number');
            }

            // Prepare update data
            const updateData = {
                ...(retentionPeriod !== undefined && { retentionPeriod }),
                ...(policyDescription && { policyDescription }),
                updatedAt: new Date(),
                updatedBy: new ObjectId(req.user.userId)
            };

            // Update data retention policy
            const result = await database.collection('data_retention_policies').updateOne(
                { _id: new ObjectId(policyId) },
                { $set: updateData },
                { session }
            );

            if (result.matchedCount === 0) {
                throw new Error('Data retention policy not found');
            }

            // Get updated data retention policy
            const updatedPolicy = await database.collection('data_retention_policies').findOne(
                { _id: new ObjectId(policyId) },
                { session }
            );

            // Create audit log
            await createAuditLog(
                'DATA_RETENTION_POLICY_UPDATED',
                req.user.userId,
                null,
                {
                    policyId,
                    changes: getChanges(existingPolicy, updatedPolicy)
                },
                session
            );

            res.json({
                success: true,
                message: 'Data retention policy updated successfully',
                data: updatedPolicy
            });
        });
    } catch (error) {
        console.error('Error updating data retention policy:', error);
        res.status(
            error.message.includes('not found') ? 404 :
            500
        ).json({
            success: false,
            message: error.message || 'Error updating data retention policy'
        });
    } finally {
        await session.endSession();
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

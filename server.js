const express = require('express');
const cors = require('cors');
const { MongoClient, ObjectId } = require('mongodb');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const rateLimit = require('express-rate-limit');
const RedisStore = require('rate-limit-redis');
const Redis = require('ioredis');
const crypto = require('crypto');
require('dotenv').config();

const app = express();

// Redis client setup
const redis = new Redis({
    host: process.env.REDIS_HOST || 'localhost',
    port: process.env.REDIS_PORT || 6379,
    password: process.env.REDIS_PASSWORD,
    retryStrategy: (times) => {
        const delay = Math.min(times * 50, 2000);
        return delay;
    }
});

// Rate limiters setup
const globalLimiter = rateLimit({
    store: new RedisStore({
        client: redis,
        prefix: 'rl:global:'
    }),
    windowMs: 15 * 60 * 1000,
    max: 100,
    message: {
        success: false,
        message: 'Too many requests, please try again later.'
    }
});

const apiLimiter = rateLimit({
    store: new RedisStore({
        client: redis,
        prefix: 'rl:api:'
    }),
    windowMs: 60 * 1000,
    max: 30,
    message: {
        success: false,
        message: 'API rate limit exceeded'
    }
});

const authLimiter = rateLimit({
    store: new RedisStore({
        client: redis,
        prefix: 'rl:auth:'
    }),
    windowMs: 60 * 60 * 1000,
    max: 5,
    message: {
        success: false,
        message: 'Too many failed attempts, please try again later'
    }
});

// Apply rate limiters
app.use(globalLimiter);
app.use('/api/', apiLimiter);
app.use('/api/login', authLimiter);

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

// Security headers middleware
const securityHeaders = (req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
    res.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline';");
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    next();
};

// Request sanitization middleware
const sanitizeRequest = (req, res, next) => {
    const sanitize = (obj) => {
        for (let key in obj) {
            if (typeof obj[key] === 'string') {
                obj[key] = obj[key]
                    .replace(/[<>]/g, '')
                    .trim();
            } else if (typeof obj[key] === 'object') {
                sanitize(obj[key]);
            }
        }
    };

    if (req.body) sanitize(req.body);
    if (req.query) sanitize(req.query);
    if (req.params) sanitize(req.params);

    next();
};

// Apply security middlewares
app.use(securityHeaders);
app.use(sanitizeRequest);

// Global error handler
app.use((err, req, res, next) => {
    console.error('Global error handler:', err);
    res.status(500).json({
        success: false,
        message: 'Internal server error'
    });
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

// Initialize database connection and collections
async function initializeDatabase() {
    try {
        await client.connect();
        console.log("Connected to MongoDB Atlas");
        
        database = client.db('infocraftorbis');
        
        // Initialize all collections
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

        // Function to check and create index if needed
        const ensureIndex = async (collection, indexSpec, options = {}) => {
            try {
                const existingIndexes = await collection.listIndexes().toArray();
                
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

        // Initialize indexes for all collections
        const indexPromises = [
            // User-related indexes
            ensureIndex(users, { email: 1 }, { unique: true }),
            ensureIndex(audit_logs, { timestamp: -1 }),
            ensureIndex(deleted_users, { originalId: 1 }),
            ensureIndex(user_permissions, { userId: 1 }, { unique: true }),
            ensureIndex(roles, { name: 1 }, { unique: true }),
            ensureIndex(role_permissions, { roleId: 1 }, { unique: true }),
            ensureIndex(user_role_assignments, { userId: 1 }, { unique: true }),

            // Company-related indexes
            ensureIndex(companies, { name: 1 }, { unique: true }),
            ensureIndex(companies, { 'contactDetails.email': 1 }, { unique: true }),
            ensureIndex(companies, { status: 1 }),
            ensureIndex(companies, { 'subscription.plan': 1 }),
            ensureIndex(company_users, { companyId: 1 }),
            ensureIndex(company_users, { email: 1 }, { unique: true }),
            ensureIndex(company_subscriptions, { companyId: 1 }, { unique: true }),
            ensureIndex(company_audit_logs, { companyId: 1 }),
            ensureIndex(company_audit_logs, { timestamp: -1 }),

            // Integration and security indexes
            ensureIndex(webhooks, { companyId: 1 }),
            ensureIndex(api_keys, { companyId: 1 }),
            ensureIndex(notifications, { companyId: 1 }),
            ensureIndex(security_logs, { timestamp: -1 }),
            ensureIndex(security_logs, { ip: 1 }),
            ensureIndex(migration_jobs, { companyId: 1 }),
            ensureIndex(migration_jobs, { status: 1 })
        ];

        await Promise.all(indexPromises);
        
        // Verify and initialize default data
        console.log('Verifying collections and initializing default data...');
        
        const [rolesCount, plansCount] = await Promise.all([
            roles.countDocuments(),
            subscription_plans.countDocuments()
        ]);

        if (rolesCount === 0) {
            console.log('Initializing default roles...');
            await initializeDefaultRoles();
        }

        if (plansCount === 0) {
            console.log('Initializing default subscription plans...');
            await initializeDefaultPlans();
        }

        // Initialize system configuration if not exists
        const configExists = await system_config.findOne({ type: 'global' });
        if (!configExists) {
            await initializeSystemConfig();
        }

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
            security_logs
        };
    } catch (err) {
        console.error("MongoDB connection error:", err);
        throw err;
    }
}

// Initialize default system configuration
async function initializeSystemConfig() {
    const defaultConfig = {
        type: 'global',
        security: {
            sessionTimeout: 1800, // 30 minutes
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
        notifications: {
            enabled: true,
            types: ['email', 'in-app']
        },
        maintenance: {
            window: 'sunday',
            time: '00:00'
        },
        createdAt: new Date()
    };

    await system_config.insertOne(defaultConfig);
    console.log('Default system configuration initialized');
}

// Cache middleware
const cacheMiddleware = (duration) => {
    return async (req, res, next) => {
        if (req.method !== 'GET') {
            return next();
        }

        const key = `cache:${req.originalUrl}`;
        try {
            const cachedResponse = await redis.get(key);
            
            if (cachedResponse) {
                return res.json(JSON.parse(cachedResponse));
            }

            res.sendResponse = res.json;
            res.json = (body) => {
                redis.setex(key, duration, JSON.stringify(body));
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
        const keys = await redis.keys(pattern);
        if (keys.length) {
            await redis.del(keys);
        }
    } catch (error) {
        console.error('Cache invalidation error:', error);
    }
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

// Audit log functions
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

        // Log security relevant information
        await security_logs.insertOne({
            type: 'TOKEN_VERIFICATION',
            userId: user._id,
            timestamp: new Date(),
            ip: req.ip,
            userAgent: req.get('user-agent'),
            success: true
        });

        next();
    } catch (error) {
        console.error('Token verification error:', error);
        
        // Log failed verification attempt
        await security_logs.insertOne({
            type: 'TOKEN_VERIFICATION_FAILED',
            timestamp: new Date(),
            ip: req.ip,
            userAgent: req.get('user-agent'),
            error: error.message,
            success: false
        });

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
                'UNAUTHORIZED_ADMIN_ACCESS_ATTEMPT',
                req.user.userId,
                null,
                { endpoint: req.originalUrl }
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
                'UNAUTHORIZED_COMPANY_ACCESS_ATTEMPT',
                req.user.userId,
                null,
                { companyId, endpoint: req.originalUrl }
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

// Security monitoring middleware
const monitorSecurity = async (req, res, next) => {
    const startTime = Date.now();
    const requestId = crypto.randomBytes(16).toString('hex');

    req.requestId = requestId;

    res.on('finish', async () => {
        try {
            const duration = Date.now() - startTime;
            
            await security_logs.insertOne({
                requestId,
                timestamp: new Date(),
                method: req.method,
                path: req.path,
                ip: req.ip,
                userAgent: req.get('user-agent'),
                userId: req.user?.userId,
                duration,
                statusCode: res.statusCode,
                headers: {
                    ...req.headers,
                    authorization: undefined
                }
            });

            // Check for security anomalies
            if (duration > 5000 || res.statusCode >= 400) {
                await redis.incr(`anomaly:${req.ip}`);
            }

        } catch (error) {
            console.error('Security monitoring error:', error);
        }
    });

    next();
};

// IP blocking middleware
const ipBlockingSystem = async (req, res, next) => {
    try {
        const ip = req.ip;
        const blockedIP = await redis.get(`blocked:${ip}`);

        if (blockedIP) {
            return res.status(403).json({
                success: false,
                message: 'Access denied'
            });
        }

        const suspiciousCount = await redis.incr(`suspicious:${req.ip}`);
        await redis.expire(`suspicious:${req.ip}`, 3600);

        if (suspiciousCount > 10) {
            await redis.setex(`blocked:${ip}`, 86400, 'blocked');
            
            await security_logs.insertOne({
                type: 'IP_BLOCKED',
                ip,
                reason: 'Suspicious activity threshold exceeded',
                timestamp: new Date()
            });

            return res.status(403).json({
                success: false,
                message: 'Access denied due to suspicious activity'
            });
        }

        next();
    } catch (error) {
        console.error('IP blocking system error:', error);
        next();
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

    // Log error to security logs
    security_logs.insertOne({
        type: 'ERROR',
        timestamp: new Date(),
        error: {
            name: err.name,
            message: err.message,
            stack: err.stack
        },
        requestInfo: {
            method: req.method,
            path: req.path,
            ip: req.ip,
            userId: req.user?.userId
        }
    }).catch(console.error);

    res.status(500).json({
        success: false,
        message: 'Internal server error'
    });
};

// Apply security middleware
app.use(monitorSecurity);
app.use(ipBlockingSystem);
app.use(errorHandler);

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
            loginHistory: []
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
            success: true
        });

        res.status(201).json({ 
            success: true, 
            message: 'User registered successfully' 
        });

    } catch (error) {
        console.error('Registration error:', error);
        
        await security_logs.insertOne({
            type: 'REGISTRATION_ERROR',
            timestamp: new Date(),
            ip: req.ip,
            userAgent: req.get('user-agent'),
            error: error.message,
            success: false
        });

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
                        userAgent: req.get('user-agent')
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

        // Create security log for successful login
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
            role: user.role,
            email: user.email,
            requires2FA: user.requires2FA,
            passwordResetRequired: user.passwordResetRequired,
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

        // Log verification attempt
        await security_logs.insertOne({
            type: 'TOKEN_VERIFICATION',
            userId: user._id,
            timestamp: new Date(),
            ip: req.ip,
            userAgent: req.get('user-agent'),
            success: true
        });

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
        
        await security_logs.insertOne({
            type: 'TOKEN_VERIFICATION_FAILED',
            timestamp: new Date(),
            ip: req.ip,
            userAgent: req.get('user-agent'),
            error: error.message
        });

        res.status(401).json({ 
            success: false, 
            message: 'Invalid token' 
        });
    }
});

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
                    sessionTimeout: 30, // minutes
                    maxLoginAttempts: 5
                }
            }
        };

        const result = await companies.insertOne(company);

        // Create company admin account
        const adminPassword = crypto.randomBytes(12).toString('base64url');
        const hashedPassword = await bcrypt.hash(adminPassword, 12);

        const adminUser = {
            companyId: result.insertedId,
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

        await company_users.insertOne(adminUser);

        // Create subscription record
        const subscription = {
            companyId: result.insertedId,
            plan: plan._id,
            startDate: new Date(),
            status: 'active',
            billingCycle: plan.billingCycle,
            price: plan.price,
            features: plan.features,
            createdAt: new Date(),
            nextBillingDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days from now
        };

        await company_subscriptions.insertOne(subscription);

        // Initialize company-specific collections
        await Promise.all([
            database.createCollection(`company_${result.insertedId}_employees`),
            database.createCollection(`company_${result.insertedId}_departments`),
            database.createCollection(`company_${result.insertedId}_attendance`)
        ]);

        // Create audit log
        await createCompanyAuditLog(
            'COMPANY_CREATED',
            result.insertedId,
            req.user.userId,
            {
                companyName: name,
                adminEmail,
                subscriptionPlan
            }
        );

        // Create notification
        await createNotification(
            result.insertedId,
            'COMPANY_WELCOME',
            `Welcome to WorkWise Pro! Your company ${name} has been successfully registered.`,
            {
                companyName: name,
                adminEmail: adminEmail
            }
        );

        res.status(201).json({
            success: true,
            message: 'Company created successfully',
            companyId: result.insertedId,
            adminCredentials: {
                email: adminEmail,
                temporaryPassword: adminPassword
            }
        });

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
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const search = req.query.search;
        const industry = req.query.industry;
        const status = req.query.status;
        const plan = req.query.plan;
        const sortField = req.query.sortField || 'createdAt';
        const sortOrder = req.query.sortOrder === 'asc' ? 1 : -1;

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

        // Get total count
        const total = await companies.countDocuments(filter);

        // Get companies with pagination and sorting
        const companiesList = await companies
            .find(filter)
            .sort({ [sortField]: sortOrder })
            .skip((page - 1) * limit)
            .limit(limit)
            .toArray();

        // Get additional data for each company
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
                userCount,
                subscription: {
                    ...company.subscription,
                    details: subscription
                },
                recentActivity,
                storageUsage,
                health: await checkCompanyHealth(company._id)
            };
        }));

        res.json({
            success: true,
            companies: enrichedCompanies,
            pagination: {
                total,
                page,
                pages: Math.ceil(total / limit)
            },
            filters: {
                industries: await getUniqueIndustries(),
                plans: await getSubscriptionPlans(),
                statuses: ['active', 'inactive', 'suspended']
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

// Helper function to calculate company storage usage
async function calculateCompanyStorageUsage(companyId) {
    try {
        const collections = [
            `company_${companyId}_employees`,
            `company_${companyId}_departments`,
            `company_${companyId}_attendance`
        ];

        let totalSize = 0;
        for (const collectionName of collections) {
            const stats = await database.collection(collectionName).stats();
            totalSize += stats.size;
        }

        return {
            sizeInBytes: totalSize,
            sizeInMB: (totalSize / (1024 * 1024)).toFixed(2)
        };
    } catch (error) {
        console.error('Error calculating storage usage:', error);
        return null;
    }
}

// Helper function to check company health
async function checkCompanyHealth(companyId) {
    try {
        const [
            userActivity,
            subscriptionStatus,
            securityIssues
        ] = await Promise.all([
            company_users.countDocuments({
                companyId,
                lastLogin: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }
            }),
            company_subscriptions.findOne({ companyId }),
            security_logs.countDocuments({
                companyId,
                type: { $in: ['FAILED_LOGIN', 'SUSPICIOUS_ACTIVITY'] },
                timestamp: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
            })
        ]);

        return {
            status: 'healthy',
            metrics: {
                activeUsers: userActivity,
                subscriptionStatus: subscriptionStatus?.status || 'unknown',
                securityIssues
            }
        };
    } catch (error) {
        console.error('Error checking company health:', error);
        return null;
    }
}

// Get company details
app.get('/api/companies/:companyId', verifyToken, verifyCompanyAccess, cacheMiddleware(60), async (req, res) => {
    try {
        const { companyId } = req.params;

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
            storageUsage,
            departments,
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
            calculateCompanyStorageUsage(company._id),
            database.collection(`company_${companyId}_departments`).find().toArray(),
            getCompanyAnalytics(company._id)
        ]);

        // Get user activity statistics
        const userStats = await getUserActivityStats(company._id);

        // Get subscription usage metrics
        const usageMetrics = await getSubscriptionUsageMetrics(company._id, subscription);

        const enrichedCompany = {
            ...company,
            users: {
                total: users.length,
                active: users.filter(u => u.status === 'active').length,
                lastActive: userStats.lastActive,
                roleDistribution: userStats.roleDistribution
            },
            subscription: {
                ...subscription,
                usage: usageMetrics,
                nextBillingDate: subscription.nextBillingDate,
                features: subscription.features
            },
            departments: {
                total: departments.length,
                list: departments
            },
            activity: {
                recent: activityLogs,
                statistics: await getActivityStatistics(company._id)
            },
            storage: storageUsage,
            analytics: analytics,
            health: await checkCompanyHealth(company._id),
            security: await getCompanySecurityMetrics(company._id)
        };

        res.json({
            success: true,
            company: enrichedCompany
        });

    } catch (error) {
        console.error('Error fetching company details:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching company details'
        });
    }
});

// Update company details
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

        // Validate company email if being updated
        if (contactEmail && !isValidCompanyEmail(contactEmail)) {
            return res.status(400).json({
                success: false,
                message: 'Generic email domains are not allowed'
            });
        }

        // Check if new name conflicts with existing companies
        if (name) {
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

        // Get current company data for comparison
        const currentCompany = await companies.findOne({ 
            _id: new ObjectId(companyId) 
        });

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

        const result = await companies.updateOne(
            { _id: new ObjectId(companyId) },
            updateDoc
        );

        // Invalidate cache
        await invalidateCache(`cache:/api/companies/${companyId}`);

        // Create audit log with detailed changes
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

        await createCompanyAuditLog(
            'COMPANY_UPDATED',
            companyId,
            req.user.userId,
            {
                changes,
                previousState: currentCompany
            }
        );

        // Create notification if significant changes were made
        if (Object.keys(changes).length > 0) {
            await createNotification(
                companyId,
                'COMPANY_UPDATED',
                `Company details have been updated by ${req.user.email}`,
                { changes }
            );
        }

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

// Update company subscription
app.put('/api/companies/:companyId/subscription', verifyToken, verifyAdmin, async (req, res) => {
    try {
        const { companyId } = req.params;
        const {
            plan,
            startDate,
            customFeatures,
            billingCycle,
            price
        } = req.body;

        // Validate subscription plan
        const subscriptionPlan = await subscription_plans.findOne({ name: plan });
        if (!plan) {
            return res.status(400).json({
                success: false,
                message: 'Invalid subscription plan'
            });
        }

        // Get current subscription for comparison
        const currentSubscription = await company_subscriptions.findOne({
            companyId: new ObjectId(companyId)
        });

        // Calculate next billing date
        const billingDays = {
            monthly: 30,
            quarterly: 90,
            annual: 365
        };

        const nextBillingDate = new Date(
            startDate || Date.now() + (billingDays[billingCycle] * 24 * 60 * 60 * 1000)
        );

        // Update subscription
        const subscriptionUpdate = {
            plan: subscriptionPlan.name,
            startDate: new Date(startDate || Date.now()),
            nextBillingDate,
            billingCycle: billingCycle || 'monthly',
            price: price || subscriptionPlan.price,
            status: 'active',
            features: {
                ...subscriptionPlan.features,
                ...(customFeatures || {})
            },
            updatedAt: new Date(),
            updatedBy: new ObjectId(req.user.userId)
        };

        await company_subscriptions.updateOne(
            { companyId: new ObjectId(companyId) },
            { $set: subscriptionUpdate },
            { upsert: true }
        );

        // Update company document
        await companies.updateOne(
            { _id: new ObjectId(companyId) },
            {
                $set: {
                    'subscription.plan': plan,
                    'subscription.status': 'active',
                    'subscription.updatedAt': new Date()
                }
            }
        );

        // Create audit log
        await createCompanyAuditLog(
            'SUBSCRIPTION_UPDATED',
            companyId,
            req.user.userId,
            {
                previousPlan: currentSubscription?.plan,
                newPlan: plan,
                changes: {
                    from: currentSubscription,
                    to: subscriptionUpdate
                }
            }
        );

        // Create notification
        await createNotification(
            companyId,
            'SUBSCRIPTION_UPDATED',
            `Your subscription has been updated to ${plan}`,
            {
                plan,
                startDate: new Date(startDate || Date.now()),
                nextBillingDate
            }
        );

        // Invalidate relevant caches
        await Promise.all([
            invalidateCache(`cache:/api/companies/${companyId}`),
            invalidateCache(`cache:/api/companies/${companyId}/subscription`)
        ]);

        res.json({
            success: true,
            message: 'Subscription updated successfully',
            subscription: subscriptionUpdate
        });

    } catch (error) {
        console.error('Error updating subscription:', error);
        res.status(500).json({
            success: false,
            message: 'Error updating subscription'
        });
    }
});

// Get company analytics
app.get('/api/companies/:companyId/analytics', verifyToken, verifyCompanyAccess, cacheMiddleware(300), async (req, res) => {
    try {
        const { companyId } = req.params;
        const { startDate, endDate, type } = req.query;

        const dateFilter = {};
        if (startDate || endDate) {
            dateFilter.timestamp = {};
            if (startDate) dateFilter.timestamp.$gte = new Date(startDate);
            if (endDate) dateFilter.timestamp.$lte = new Date(endDate);
        }

        const analytics = await getCompanyAnalytics(companyId, type, dateFilter);
        res.json({
            success: true,
            analytics
        });

    } catch (error) {
        console.error('Error fetching company analytics:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching company analytics'
        });
    }
});

// Helper function to get company analytics
async function getCompanyAnalytics(companyId, type = 'all', dateFilter = {}) {
    try {
        const baseFilter = {
            companyId: new ObjectId(companyId),
            ...dateFilter
        };

        const [
            userMetrics,
            activityMetrics,
            resourceUsage,
            securityMetrics
        ] = await Promise.all([
            getUserMetrics(companyId, baseFilter),
            getActivityMetrics(companyId, baseFilter),
            getResourceUsageMetrics(companyId),
            getSecurityMetrics(companyId, baseFilter)
        ]);

        // Return specific analytics based on type
        switch (type) {
            case 'users':
                return userMetrics;
            case 'activity':
                return activityMetrics;
            case 'resources':
                return resourceUsage;
            case 'security':
                return securityMetrics;
            default:
                return {
                    users: userMetrics,
                    activity: activityMetrics,
                    resources: resourceUsage,
                    security: securityMetrics
                };
        }
    } catch (error) {
        console.error('Error generating analytics:', error);
        throw error;
    }
}

// Analytics helper functions
async function getUserMetrics(companyId, filter) {
    const users = await company_users.find({
        companyId: new ObjectId(companyId)
    }).toArray();

    return {
        total: users.length,
        active: users.filter(u => u.status === 'active').length,
        roleDistribution: await company_users.aggregate([
            { $match: { companyId: new ObjectId(companyId) } },
            { $group: { _id: '$role', count: { $sum: 1 } } }
        ]).toArray(),
        activityTrends: await company_audit_logs.aggregate([
            { $match: { ...filter, action: { $regex: /^USER_/ } } },
            {
                $group: {
                    _id: {
                        action: '$action',
                        day: { $dateToString: { format: '%Y-%m-%d', date: '$timestamp' } }
                    },
                    count: { $sum: 1 }
                }
            }
        ]).toArray()
    };
}

async function getActivityMetrics(companyId, filter) {
    return {
        overview: await company_audit_logs.aggregate([
            { $match: { companyId: new ObjectId(companyId), ...filter } },
            { $group: { _id: '$action', count: { $sum: 1 } } }
        ]).toArray(),
        timeDistribution: await company_audit_logs.aggregate([
            { $match: { companyId: new ObjectId(companyId), ...filter } },
            {
                $group: {
                    _id: {
                        hour: { $hour: '$timestamp' },
                        day: { $dayOfWeek: '$timestamp' }
                    },
                    count: { $sum: 1 }
                }
            }
        ]).toArray(),
        userActivity: await company_audit_logs.aggregate([
            { $match: { companyId: new ObjectId(companyId), ...filter } },
            { 
                $group: {
                    _id: '$performedBy',
                    actions: { $sum: 1 },
                    lastActivity: { $max: '$timestamp' }
                }
            },
            { $limit: 10 },
            { $sort: { actions: -1 } }
        ]).toArray()
    };
}

async function getResourceUsageMetrics(companyId) {
    const collections = [
        `company_${companyId}_employees`,
        `company_${companyId}_departments`,
        `company_${companyId}_attendance`
    ];

    const usage = await Promise.all(collections.map(async (collection) => {
        const stats = await database.collection(collection).stats();
        return {
            collection: collection.split('_').pop(),
            size: stats.size,
            documents: stats.count
        };
    }));

    return {
        storage: usage,
        summary: {
            totalSize: usage.reduce((acc, curr) => acc + curr.size, 0),
            totalDocuments: usage.reduce((acc, curr) => acc + curr.documents, 0)
        }
    };
}

async function getSecurityMetrics(companyId, filter) {
    return {
        loginAttempts: await security_logs.aggregate([
            { 
                $match: { 
                    companyId: new ObjectId(companyId),
                    type: { $in: ['LOGIN_SUCCESS', 'LOGIN_FAILED'] },
                    ...filter
                }
            },
            { $group: { _id: '$type', count: { $sum: 1 } } }
        ]).toArray(),
        suspiciousActivities: await security_logs.aggregate([
            {
                $match: {
                    companyId: new ObjectId(companyId),
                    type: 'SUSPICIOUS_ACTIVITY',
                    ...filter
                }
            },
            { $group: { _id: '$details.reason', count: { $sum: 1 } } }
        ]).toArray(),
        accessPatterns: await security_logs.aggregate([
            { $match: { companyId: new ObjectId(companyId), ...filter } },
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
    };
}

// Generate company report
app.post('/api/companies/:companyId/reports', verifyToken, verifyCompanyAccess, async (req, res) => {
    try {
        const { companyId } = req.params;
        const { 
            type, 
            startDate, 
            endDate, 
            format = 'json',
            sections = ['all']
        } = req.body;

        // Validate date range
        if (startDate && endDate && new Date(startDate) > new Date(endDate)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid date range'
            });
        }

        // Get company details
        const company = await companies.findOne({ _id: new ObjectId(companyId) });
        
        // Generate report data based on type
        const reportData = await generateReportData(
            companyId, 
            type, 
            { startDate, endDate }, 
            sections
        );

        // Format report based on requested format
        const formattedReport = await formatReport(
            reportData,
            format,
            {
                companyName: company.name,
                generatedAt: new Date(),
                dateRange: { startDate, endDate }
            }
        );

        // Log report generation
        await createCompanyAuditLog(
            'REPORT_GENERATED',
            companyId,
            req.user.userId,
            {
                type,
                format,
                sections,
                dateRange: { startDate, endDate }
            }
        );

        // Send response based on format
        if (format === 'json') {
            res.json({
                success: true,
                report: formattedReport
            });
        } else {
            // For other formats (PDF, CSV, etc.)
            res.setHeader('Content-Type', getContentType(format));
            res.setHeader(
                'Content-Disposition',
                `attachment; filename=report_${companyId}_${Date.now()}.${format}`
            );
            res.send(formattedReport);
        }

    } catch (error) {
        console.error('Error generating report:', error);
        res.status(500).json({
            success: false,
            message: 'Error generating report'
        });
    }
});

// Helper function to generate report data
async function generateReportData(companyId, type, dateRange, sections) {
    const reportData = {};

    if (sections.includes('all') || sections.includes('overview')) {
        reportData.overview = await getCompanyOverview(companyId);
    }

    if (sections.includes('all') || sections.includes('users')) {
        reportData.users = await getUserMetrics(companyId, dateRange);
    }

    if (sections.includes('all') || sections.includes('activity')) {
        reportData.activity = await getActivityMetrics(companyId, dateRange);
    }

    if (sections.includes('all') || sections.includes('resources')) {
        reportData.resources = await getResourceUsageMetrics(companyId);
    }

    if (sections.includes('all') || sections.includes('security')) {
        reportData.security = await getSecurityMetrics(companyId, dateRange);
    }

    return reportData;
}

// Helper function to format report
async function formatReport(data, format, metadata) {
    switch (format.toLowerCase()) {
        case 'json':
            return {
                metadata,
                data
            };

        case 'csv':
            return convertToCSV(data, metadata);

        case 'pdf':
            return generatePDFReport(data, metadata);

        default:
            throw new Error('Unsupported format');
    }
}

// Helper function to get content type
function getContentType(format) {
    const contentTypes = {
        json: 'application/json',
        csv: 'text/csv',
        pdf: 'application/pdf'
    };
    return contentTypes[format.toLowerCase()] || 'application/octet-stream';
}

// Add user to company
app.post('/api/companies/:companyId/users', verifyToken, verifyCompanyAccess, async (req, res) => {
    try {
        const { companyId } = req.params;
        const {
            name,
            email,
            role,
            department,
            position,
            permissions = []
        } = req.body;

        // Validate email domain
        if (!isValidCompanyEmail(email)) {
            return res.status(400).json({
                success: false,
                message: 'Generic email domains are not allowed'
            });
        }

        // Check if email exists
        const existingUser = await company_users.findOne({ email });
        if (existingUser) {
            return res.status(400).json({
                success: false,
                message: 'Email already registered'
            });
        }

        // Check company subscription limits
        const company = await companies.findOne({ _id: new ObjectId(companyId) });
        const plan = await subscription_plans.findOne({ name: company.subscription.plan });
        const currentUserCount = await company_users.countDocuments({ 
            companyId: new ObjectId(companyId) 
        });

        if (plan.maxUsers && currentUserCount >= plan.maxUsers) {
            return res.status(400).json({
                success: false,
                message: 'Company has reached maximum user limit for current plan'
            });
        }

        // Generate secure temporary password
        const tempPassword = crypto.randomBytes(12).toString('base64url');
        const hashedPassword = await bcrypt.hash(tempPassword, 12);

        // Create user document
        const newUser = {
            companyId: new ObjectId(companyId),
            name,
            email,
            password: hashedPassword,
            role,
            department,
            position,
            permissions,
            status: 'active',
            createdAt: new Date(),
            createdBy: new ObjectId(req.user.userId),
            passwordResetRequired: true,
            lastLogin: null,
            failedLoginAttempts: 0,
            securitySettings: {
                requires2FA: false,
                lastPasswordChange: new Date(),
                passwordHistory: []
            },
            profile: {
                joinDate: new Date(),
                contactInfo: {},
                preferences: {
                    notifications: true,
                    language: 'en'
                }
            }
        };

        const result = await company_users.insertOne(newUser);

        // Update department user count if department exists
        if (department) {
            await database.collection(`company_${companyId}_departments`)
                .updateOne(
                    { name: department },
                    { $inc: { userCount: 1 } }
                );
        }

        // Create audit log
        await createCompanyAuditLog(
            'USER_ADDED',
            companyId,
            req.user.userId,
            {
                userId: result.insertedId,
                email,
                role,
                department
            }
        );

        // Create notification for company admins
        await createNotification(
            companyId,
            'NEW_USER_ADDED',
            `New user ${name} (${email}) has been added to the company`,
            {
                userName: name,
                userEmail: email,
                role,
                department
            }
        );

        // Invalidate relevant caches
        await Promise.all([
            invalidateCache(`cache:/api/companies/${companyId}/users`),
            invalidateCache(`cache:/api/companies/${companyId}`)
        ]);

        res.status(201).json({
            success: true,
            message: 'User added successfully',
            userId: result.insertedId,
            temporaryPassword: tempPassword
        });

    } catch (error) {
        console.error('Error adding company user:', error);
        res.status(500).json({
            success: false,
            message: 'Error adding company user'
        });
    }
});

// Get company users with advanced filtering and sorting
app.get('/api/companies/:companyId/users', verifyToken, verifyCompanyAccess, cacheMiddleware(60), async (req, res) => {
    try {
        const { companyId } = req.params;
        const {
            page = 1,
            limit = 10,
            search,
            department,
            role,
            status,
            sortBy = 'createdAt',
            sortOrder = 'desc',
            active,
            dateRange
        } = req.query;

        // Build filter
        const filter = { companyId: new ObjectId(companyId) };

        if (search) {
            filter.$or = [
                { name: { $regex: search, $options: 'i' } },
                { email: { $regex: search, $options: 'i' } }
            ];
        }

        if (department) filter.department = department;
        if (role) filter.role = role;
        if (status) filter.status = status;
        if (active === 'true') {
            filter.lastLogin = {
                $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
            };
        }

        if (dateRange) {
            const [start, end] = dateRange.split(',');
            filter.createdAt = {
                $gte: new Date(start),
                $lte: new Date(end)
            };
        }

        // Get total count
        const total = await company_users.countDocuments(filter);

        // Get users with pagination and sorting
        const users = await company_users
            .find(filter)
            .project({ password: 0 })
            .sort({ [sortBy]: sortOrder === 'desc' ? -1 : 1 })
            .skip((parseInt(page) - 1) * parseInt(limit))
            .limit(parseInt(limit))
            .toArray();

        // Enrich user data
        const enrichedUsers = await Promise.all(users.map(async (user) => {
            const [
                activityLogs,
                loginHistory,
                permissions
            ] = await Promise.all([
                company_audit_logs
                    .find({ 
                        companyId: new ObjectId(companyId),
                        'details.userId': user._id 
                    })
                    .sort({ timestamp: -1 })
                    .limit(5)
                    .toArray(),
                security_logs
                    .find({
                        companyId: new ObjectId(companyId),
                        userId: user._id,
                        type: 'LOGIN_SUCCESS'
                    })
                    .sort({ timestamp: -1 })
                    .limit(5)
                    .toArray(),
                user_permissions.findOne({ userId: user._id })
            ]);

            return {
                ...user,
                recentActivity: activityLogs,
                loginHistory,
                permissions: permissions?.permissions || [],
                status: {
                    current: user.status,
                    lastActive: user.lastLogin,
                    loginCount: await security_logs.countDocuments({
                        userId: user._id,
                        type: 'LOGIN_SUCCESS'
                    })
                }
            };
        }));

        // Get department statistics
        const departmentStats = await company_users.aggregate([
            { $match: { companyId: new ObjectId(companyId) } },
            { $group: { _id: '$department', count: { $sum: 1 } } }
        ]).toArray();

        // Get role statistics
        const roleStats = await company_users.aggregate([
            { $match: { companyId: new ObjectId(companyId) } },
            { $group: { _id: '$role', count: { $sum: 1 } } }
        ]).toArray();

        res.json({
            success: true,
            users: enrichedUsers,
            statistics: {
                departments: departmentStats,
                roles: roleStats,
                total,
                active: await company_users.countDocuments({
                    companyId: new ObjectId(companyId),
                    status: 'active'
                })
            },
            pagination: {
                total,
                page: parseInt(page),
                pages: Math.ceil(total / parseInt(limit))
            }
        });

    } catch (error) {
        console.error('Error fetching company users:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching company users'
        });
    }
});

// Update company user
app.put('/api/companies/:companyId/users/:userId', verifyToken, verifyCompanyAccess, async (req, res) => {
    try {
        const { companyId, userId } = req.params;
        const {
            name,
            email,
            role,
            department,
            position,
            permissions,
            status,
            securitySettings
        } = req.body;

        // Verify user exists
        const existingUser = await company_users.findOne({
            _id: new ObjectId(userId),
            companyId: new ObjectId(companyId)
        });

        if (!existingUser) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        // Check email uniqueness if being changed
        if (email && email !== existingUser.email) {
            if (!isValidCompanyEmail(email)) {
                return res.status(400).json({
                    success: false,
                    message: 'Generic email domains are not allowed'
                });
            }

            const emailExists = await company_users.findOne({
                email: email.toLowerCase(),
                _id: { $ne: new ObjectId(userId) }
            });

            if (emailExists) {
                return res.status(400).json({
                    success: false,
                    message: 'Email already in use'
                });
            }
        }

        // Handle department change
        if (department && department !== existingUser.department) {
            // Decrease count in old department
            if (existingUser.department) {
                await database.collection(`company_${companyId}_departments`)
                    .updateOne(
                        { name: existingUser.department },
                        { $inc: { userCount: -1 } }
                    );
            }
            // Increase count in new department
            await database.collection(`company_${companyId}_departments`)
                .updateOne(
                    { name: department },
                    { $inc: { userCount: 1 } }
                );
        }

        // Prepare update document
        const updateDoc = {
            $set: {
                ...(name && { name }),
                ...(email && { email: email.toLowerCase() }),
                ...(role && { role }),
                ...(department && { department }),
                ...(position && { position }),
                ...(permissions && { permissions }),
                ...(status && { status }),
                ...(securitySettings && { securitySettings }),
                updatedAt: new Date(),
                updatedBy: new ObjectId(req.user.userId)
            }
        };

        // Update user
        await company_users.updateOne(
            { _id: new ObjectId(userId) },
            updateDoc
        );

        // Track changes for audit log
        const changes = {};
        Object.keys(updateDoc.$set).forEach(key => {
            if (existingUser[key] !== updateDoc.$set[key]) {
                changes[key] = {
                    from: existingUser[key],
                    to: updateDoc.$set[key]
                };
            }
        });

        // Create audit log
        await createCompanyAuditLog(
            'USER_UPDATED',
            companyId,
            req.user.userId,
            {
                userId,
                changes,
                previousState: existingUser
            }
        );

        // Create notification if significant changes
        if (Object.keys(changes).length > 0) {
            await createNotification(
                companyId,
                'USER_UPDATED',
                `User ${existingUser.name} has been updated`,
                { changes }
            );
        }

        // Invalidate relevant caches
        await Promise.all([
            invalidateCache(`cache:/api/companies/${companyId}/users`),
            invalidateCache(`cache:/api/companies/${companyId}/users/${userId}`)
        ]);

        res.json({
            success: true,
            message: 'User updated successfully',
            changes
        });

    } catch (error) {
        console.error('Error updating company user:', error);
        res.status(500).json({
            success: false,
            message: 'Error updating company user'
        });
    }
});

// Reset user password
app.post('/api/companies/:companyId/users/:userId/reset-password', verifyToken, verifyCompanyAccess, async (req, res) => {
    try {
        const { companyId, userId } = req.params;
        const { sendEmail = true } = req.body;

        const user = await company_users.findOne({
            _id: new ObjectId(userId),
            companyId: new ObjectId(companyId)
        });

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        // Generate new temporary password
        const tempPassword = crypto.randomBytes(12).toString('base64url');
        const hashedPassword = await bcrypt.hash(tempPassword, 12);

        // Update user password
        await company_users.updateOne(
            { _id: new ObjectId(userId) },
            {
                $set: {
                    password: hashedPassword,
                    passwordResetRequired: true,
                    lastPasswordChange: new Date(),
                    updatedAt: new Date(),
                    updatedBy: new ObjectId(req.user.userId)
                },
                $push: {
                    'securitySettings.passwordHistory': {
                        password: user.password,
                        changedAt: new Date(),
                        changedBy: new ObjectId(req.user.userId)
                    }
                }
            }
        );

        // Create audit log
        await createCompanyAuditLog(
            'PASSWORD_RESET',
            companyId,
            req.user.userId,
            {
                userId,
                userEmail: user.email,
                resetBy: req.user.email
            }
        );

        // Create security log
        await security_logs.insertOne({
            type: 'PASSWORD_RESET',
            companyId: new ObjectId(companyId),
            userId: new ObjectId(userId),
            performedBy: new ObjectId(req.user.userId),
            timestamp: new Date(),
            ip: req.ip,
            userAgent: req.get('user-agent')
        });

        // Create notification
        await createNotification(
            companyId,
            'PASSWORD_RESET',
            `Password has been reset for user ${user.name}`,
            {
                userEmail: user.email,
                resetBy: req.user.email
            }
        );

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

// Manage user permissions
app.put('/api/companies/:companyId/users/:userId/permissions', verifyToken, verifyCompanyAccess, async (req, res) => {
    try {
        const { companyId, userId } = req.params;
        const { permissions } = req.body;

        // Verify user exists
        const user = await company_users.findOne({
            _id: new ObjectId(userId),
            companyId: new ObjectId(companyId)
        });

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        // Get current permissions for comparison
        const currentPermissions = user.permissions || [];

        // Update permissions
        await company_users.updateOne(
            { _id: new ObjectId(userId) },
            {
                $set: {
                    permissions,
                    updatedAt: new Date(),
                    updatedBy: new ObjectId(req.user.userId)
                }
            }
        );

        // Create audit log
        await createCompanyAuditLog(
            'PERMISSIONS_UPDATED',
            companyId,
            req.user.userId,
            {
                userId,
                previousPermissions: currentPermissions,
                newPermissions: permissions,
                changes: {
                    added: permissions.filter(p => !currentPermissions.includes(p)),
                    removed: currentPermissions.filter(p => !permissions.includes(p))
                }
            }
        );

        // Create notification
        await createNotification(
            companyId,
            'PERMISSIONS_UPDATED',
            `Permissions updated for user ${user.name}`,
            {
                userEmail: user.email,
                updatedBy: req.user.email
            }
        );

        // Invalidate relevant caches
        await invalidateCache(`cache:/api/companies/${companyId}/users/${userId}`);

        res.json({
            success: true,
            message: 'Permissions updated successfully',
            permissions
        });

    } catch (error) {
        console.error('Error updating user permissions:', error);
        res.status(500).json({
            success: false,
            message: 'Error updating user permissions'
        });
    }
});

// Deactivate/Activate user
app.patch('/api/companies/:companyId/users/:userId/status', verifyToken, verifyCompanyAccess, async (req, res) => {
    try {
        const { companyId, userId } = req.params;
        const { status, reason } = req.body;

        if (!['active', 'inactive', 'suspended'].includes(status)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid status value'
            });
        }

        const user = await company_users.findOne({
            _id: new ObjectId(userId),
            companyId: new ObjectId(companyId)
        });

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        // Update user status
        await company_users.updateOne(
            { _id: new ObjectId(userId) },
            {
                $set: {
                    status,
                    statusReason: reason,
                    statusUpdatedAt: new Date(),
                    statusUpdatedBy: new ObjectId(req.user.userId)
                }
            }
        );

        // If deactivating, terminate all active sessions
        if (status !== 'active') {
            await invalidateUserSessions(userId);
        }

        // Create audit log
        await createCompanyAuditLog(
            'USER_STATUS_CHANGED',
            companyId,
            req.user.userId,
            {
                userId,
                previousStatus: user.status,
                newStatus: status,
                reason
            }
        );

        // Create notification
        await createNotification(
            companyId,
            'USER_STATUS_CHANGED',
            `Status changed to ${status} for user ${user.name}`,
            {
                userEmail: user.email,
                status,
                reason
            }
        );

        // Invalidate caches
        await invalidateUserRelatedCaches(companyId, userId);

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

// Delete user
app.delete('/api/companies/:companyId/users/:userId', verifyToken, verifyCompanyAccess, async (req, res) => {
    const session = client.startSession();
    try {
        await session.withTransaction(async () => {
            const { companyId, userId } = req.params;
            const { transferDataTo, reason } = req.body;

            const user = await company_users.findOne({
                _id: new ObjectId(userId),
                companyId: new ObjectId(companyId)
            });

            if (!user) {
                throw new Error('User not found');
            }

            // If data transfer is requested, verify target user
            if (transferDataTo) {
                const targetUser = await company_users.findOne({
                    _id: new ObjectId(transferDataTo),
                    companyId: new ObjectId(companyId),
                    status: 'active'
                });

                if (!targetUser) {
                    throw new Error('Target user for data transfer not found or inactive');
                }
            }

            // Backup user data
            const userBackup = {
                ...user,
                deletedAt: new Date(),
                deletedBy: new ObjectId(req.user.userId),
                deletionReason: reason,
                originalId: user._id
            };

            await database.collection('deleted_company_users').insertOne(userBackup, { session });

            // Transfer or archive user data
            if (transferDataTo) {
                await transferUserData(userId, transferDataTo, session);
            } else {
                await archiveUserData(userId, session);
            }

            // Remove user from departments
            if (user.department) {
                await database.collection(`company_${companyId}_departments`)
                    .updateOne(
                        { name: user.department },
                        { $inc: { userCount: -1 } },
                        { session }
                    );
            }

            // Delete user
            await company_users.deleteOne(
                { _id: new ObjectId(userId) },
                { session }
            );

            // Create audit log
            await createCompanyAuditLog(
                'USER_DELETED',
                companyId,
                req.user.userId,
                {
                    deletedUser: user,
                    transferredTo: transferDataTo,
                    reason
                }
            );

            // Create notification
            await createNotification(
                companyId,
                'USER_DELETED',
                `User ${user.name} has been deleted`,
                {
                    userEmail: user.email,
                    deletedBy: req.user.email,
                    reason
                }
            );
        });

        // Invalidate caches
        await invalidateUserRelatedCaches(companyId, userId);

        res.json({
            success: true,
            message: 'User deleted successfully'
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

// Bulk user operations
app.post('/api/companies/:companyId/users/bulk', verifyToken, verifyCompanyAccess, async (req, res) => {
    const session = client.startSession();
    try {
        await session.withTransaction(async () => {
            const { companyId } = req.params;
            const { operation, userIds, data } = req.body;

            if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
                throw new Error('Invalid user IDs provided');
            }

            const users = await company_users
                .find({ 
                    _id: { $in: userIds.map(id => new ObjectId(id)) },
                    companyId: new ObjectId(companyId)
                })
                .toArray();

            if (users.length !== userIds.length) {
                throw new Error('Some users not found');
            }

            const results = {
                successful: [],
                failed: []
            };

            switch (operation) {
                case 'updateStatus':
                    for (const user of users) {
                        try {
                            await company_users.updateOne(
                                { _id: user._id },
                                {
                                    $set: {
                                        status: data.status,
                                        statusReason: data.reason,
                                        statusUpdatedAt: new Date(),
                                        statusUpdatedBy: new ObjectId(req.user.userId)
                                    }
                                },
                                { session }
                            );
                            results.successful.push(user._id);
                        } catch (error) {
                            results.failed.push({ id: user._id, error: error.message });
                        }
                    }
                    break;

                case 'updateDepartment':
                    for (const user of users) {
                        try {
                            await company_users.updateOne(
                                { _id: user._id },
                                {
                                    $set: {
                                        department: data.department,
                                        updatedAt: new Date(),
                                        updatedBy: new ObjectId(req.user.userId)
                                    }
                                },
                                { session }
                            );
                            results.successful.push(user._id);
                        } catch (error) {
                            results.failed.push({ id: user._id, error: error.message });
                        }
                    }
                    break;

                case 'updatePermissions':
                    for (const user of users) {
                        try {
                            await company_users.updateOne(
                                { _id: user._id },
                                {
                                    $set: {
                                        permissions: data.permissions,
                                        updatedAt: new Date(),
                                        updatedBy: new ObjectId(req.user.userId)
                                    }
                                },
                                { session }
                            );
                            results.successful.push(user._id);
                        } catch (error) {
                            results.failed.push({ id: user._id, error: error.message });
                        }
                    }
                    break;

                default:
                    throw new Error('Invalid operation');
            }

            // Create audit log
            await createCompanyAuditLog(
                'BULK_USER_OPERATION',
                companyId,
                req.user.userId,
                {
                    operation,
                    affected: results.successful,
                    failed: results.failed,
                    data
                }
            );

            // Invalidate relevant caches
            await invalidateCache(`cache:/api/companies/${companyId}/users`);

            return results;
        });

        res.json({
            success: true,
            message: 'Bulk operation completed',
            results
        });

    } catch (error) {
        console.error('Error in bulk operation:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Error performing bulk operation'
        });
    } finally {
        await session.endSession();
    }
});

// Create department
app.post('/api/companies/:companyId/departments', verifyToken, verifyCompanyAccess, async (req, res) => {
    try {
        const { companyId } = req.params;
        const {
            name,
            description,
            parentDepartmentId,
            managerId,
            settings = {}
        } = req.body;

        // Validate department name
        if (!name || typeof name !== 'string') {
            return res.status(400).json({
                success: false,
                message: 'Valid department name is required'
            });
        }

        // Check if department exists
        const existingDepartment = await database
            .collection(`company_${companyId}_departments`)
            .findOne({ name: { $regex: new RegExp(`^${name}$`, 'i') } });

        if (existingDepartment) {
            return res.status(400).json({
                success: false,
                message: 'Department already exists'
            });
        }

        // Verify manager if provided
        if (managerId) {
            const manager = await company_users.findOne({
                _id: new ObjectId(managerId),
                companyId: new ObjectId(companyId),
                status: 'active'
            });

            if (!manager) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid manager ID'
                });
            }
        }

        // Verify parent department if provided
        if (parentDepartmentId) {
            const parentDept = await database
                .collection(`company_${companyId}_departments`)
                .findOne({ _id: new ObjectId(parentDepartmentId) });

            if (!parentDept) {
                return res.status(400).json({
                    success: false,
                    message: 'Parent department not found'
                });
            }
        }

        const department = {
            name,
            description,
            parentDepartmentId: parentDepartmentId ? new ObjectId(parentDepartmentId) : null,
            managerId: managerId ? new ObjectId(managerId) : null,
            settings,
            status: 'active',
            userCount: 0,
            hierarchy: [],
            createdAt: new Date(),
            createdBy: new ObjectId(req.user.userId),
            updatedAt: new Date()
        };

        // Set department hierarchy
        if (parentDepartmentId) {
            const parentDept = await database
                .collection(`company_${companyId}_departments`)
                .findOne({ _id: new ObjectId(parentDepartmentId) });
            
            department.hierarchy = [...parentDept.hierarchy, parentDepartmentId];
        }

        const result = await database
            .collection(`company_${companyId}_departments`)
            .insertOne(department);

        // Update company structure version
        await companies.updateOne(
            { _id: new ObjectId(companyId) },
            { 
                $inc: { 'structure.version': 1 },
                $set: { 'structure.lastUpdated': new Date() }
            }
        );

        // Create audit log
        await createCompanyAuditLog(
            'DEPARTMENT_CREATED',
            companyId,
            req.user.userId,
            {
                departmentId: result.insertedId,
                departmentName: name,
                parentDepartmentId,
                managerId
            }
        );

        // Create notification
        await createNotification(
            companyId,
            'DEPARTMENT_CREATED',
            `New department "${name}" has been created`,
            {
                departmentName: name,
                createdBy: req.user.email
            }
        );

        // Invalidate relevant caches
        await Promise.all([
            invalidateCache(`cache:/api/companies/${companyId}/departments`),
            invalidateCache(`cache:/api/companies/${companyId}/structure`)
        ]);

        res.status(201).json({
            success: true,
            message: 'Department created successfully',
            departmentId: result.insertedId
        });

    } catch (error) {
        console.error('Error creating department:', error);
        res.status(500).json({
            success: false,
            message: 'Error creating department'
        });
    }
});

// Get department structure
app.get('/api/companies/:companyId/departments', verifyToken, verifyCompanyAccess, cacheMiddleware(300), async (req, res) => {
    try {
        const { companyId } = req.params;
        const { includeUsers = false, includeMetrics = false } = req.query;

        // Get all departments
        const departments = await database
            .collection(`company_${companyId}_departments`)
            .find()
            .toArray();

        // Build department tree
        const departmentTree = await buildDepartmentTree(companyId, departments, includeUsers, includeMetrics);

        // Get department statistics
        const statistics = await getDepartmentStatistics(companyId, departments);

        res.json({
            success: true,
            structure: {
                tree: departmentTree,
                statistics,
                totalDepartments: departments.length
            }
        });

    } catch (error) {
        console.error('Error fetching department structure:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching department structure'
        });
    }
});

// Helper function to build department tree
async function buildDepartmentTree(companyId, departments, includeUsers, includeMetrics) {
    const departmentMap = new Map();
    const rootDepartments = [];

    // First pass: Create department nodes
    for (const dept of departments) {
        const deptNode = {
            ...dept,
            children: [],
            users: includeUsers ? [] : undefined,
            metrics: includeMetrics ? await getDepartmentMetrics(companyId, dept._id) : undefined
        };
        departmentMap.set(dept._id.toString(), deptNode);
    }

    // Second pass: Build tree structure
    for (const dept of departments) {
        const deptNode = departmentMap.get(dept._id.toString());
        
        if (dept.parentDepartmentId) {
            const parentNode = departmentMap.get(dept.parentDepartmentId.toString());
            if (parentNode) {
                parentNode.children.push(deptNode);
            }
        } else {
            rootDepartments.push(deptNode);
        }

        // Add users if requested
        if (includeUsers) {
            const users = await company_users.find({
                companyId: new ObjectId(companyId),
                department: dept.name
            }).project({ password: 0 }).toArray();
            
            deptNode.users = users;
        }
    }

    return rootDepartments;
}

// Helper function to get department metrics
async function getDepartmentMetrics(companyId, departmentId) {
    const department = await database
        .collection(`company_${companyId}_departments`)
        .findOne({ _id: departmentId });

    const [
        activeUsers,
        recentActivity,
        resourceUtilization
    ] = await Promise.all([
        company_users.countDocuments({
            companyId: new ObjectId(companyId),
            department: department.name,
            status: 'active'
        }),
        company_audit_logs.find({
            companyId: new ObjectId(companyId),
            'details.department': department.name
        })
        .sort({ timestamp: -1 })
        .limit(10)
        .toArray(),
        calculateDepartmentResourceUsage(companyId, department.name)
    ]);

    return {
        userMetrics: {
            total: department.userCount,
            active: activeUsers
        },
        activity: {
            recent: recentActivity,
            lastUpdated: department.updatedAt
        },
        resources: resourceUtilization
    };
}

// Helper function to get department statistics
async function getDepartmentStatistics(companyId, departments) {
    const stats = {
        totalDepartments: departments.length,
        totalUsers: 0,
        departmentDistribution: [],
        averageUsersPerDepartment: 0,
        maxDepth: 0
    };

    // Calculate department metrics
    for (const dept of departments) {
        stats.totalUsers += dept.userCount;
        stats.maxDepth = Math.max(stats.maxDepth, dept.hierarchy.length);
        
        stats.departmentDistribution.push({
            name: dept.name,
            userCount: dept.userCount,
            level: dept.hierarchy.length
        });
    }

    stats.averageUsersPerDepartment = stats.totalUsers / stats.totalDepartments;

    return stats;
}

// Helper function to calculate department resource usage
async function calculateDepartmentResourceUsage(companyId, departmentName) {
    // This would be implemented based on your specific resource tracking needs
    // Example implementation:
    return {
        storage: {
            used: 0,
            allocated: 0
        },
        bandwidth: {
            monthly: 0,
            average: 0
        },
        applications: {
            total: 0,
            active: 0
        }
    };
}

// Get company activity logs
app.get('/api/companies/:companyId/activity', verifyToken, verifyCompanyAccess, async (req, res) => {
    try {
        const { companyId } = req.params;
        const {
            startDate,
            endDate,
            type,
            userId,
            department,
            page = 1,
            limit = 50,
            sortBy = 'timestamp',
            sortOrder = 'desc'
        } = req.query;

        // Build filter
        const filter = { companyId: new ObjectId(companyId) };

        if (startDate || endDate) {
            filter.timestamp = {};
            if (startDate) filter.timestamp.$gte = new Date(startDate);
            if (endDate) filter.timestamp.$lte = new Date(endDate);
        }

        if (type) filter.action = type;
        if (userId) filter['details.userId'] = new ObjectId(userId);
        if (department) filter['details.department'] = department;

        // Get total count
        const total = await company_audit_logs.countDocuments(filter);

        // Get activity logs with pagination and sorting
        const logs = await company_audit_logs
            .find(filter)
            .sort({ [sortBy]: sortOrder === 'desc' ? -1 : 1 })
            .skip((parseInt(page) - 1) * parseInt(limit))
            .limit(parseInt(limit))
            .toArray();

        // Enrich logs with user details
        const enrichedLogs = await Promise.all(logs.map(async (log) => {
            const [performer, targetUser] = await Promise.all([
                company_users.findOne(
                    { _id: log.performedBy },
                    { projection: { name: 1, email: 1, role: 1 } }
                ),
                log.details.userId ? company_users.findOne(
                    { _id: log.details.userId },
                    { projection: { name: 1, email: 1, role: 1 } }
                ) : null
            ]);

            return {
                ...log,
                performer: performer || { name: 'System', email: 'system' },
                targetUser: targetUser || null
            };
        }));

        // Get activity statistics
        const statistics = await getActivityStatistics(companyId, filter);

        res.json({
            success: true,
            activity: {
                logs: enrichedLogs,
                statistics,
                pagination: {
                    total,
                    page: parseInt(page),
                    pages: Math.ceil(total / parseInt(limit))
                }
            }
        });

    } catch (error) {
        console.error('Error fetching activity logs:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching activity logs'
        });
    }
});

// Get security alerts
app.get('/api/companies/:companyId/security/alerts', verifyToken, verifyCompanyAccess, async (req, res) => {
    try {
        const { companyId } = req.params;
        const { status, severity, page = 1, limit = 20 } = req.query;

        const filter = { companyId: new ObjectId(companyId) };
        if (status) filter.status = status;
        if (severity) filter.severity = severity;

        const alerts = await security_logs
            .find(filter)
            .sort({ timestamp: -1 })
            .skip((parseInt(page) - 1) * parseInt(limit))
            .limit(parseInt(limit))
            .toArray();

        // Get alert statistics
        const statistics = await getSecurityStatistics(companyId);

        res.json({
            success: true,
            alerts,
            statistics
        });

    } catch (error) {
        console.error('Error fetching security alerts:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching security alerts'
        });
    }
});

// Monitor user sessions
app.get('/api/companies/:companyId/sessions', verifyToken, verifyCompanyAccess, async (req, res) => {
    try {
        const { companyId } = req.params;
        
        const activeSessions = await database.collection('sessions')
            .find({
                companyId: new ObjectId(companyId),
                expires: { $gt: new Date() }
            })
            .toArray();

        // Enrich session data
        const enrichedSessions = await Promise.all(activeSessions.map(async (session) => {
            const user = await company_users.findOne(
                { _id: session.userId },
                { projection: { name: 1, email: 1, role: 1 } }
            );

            return {
                ...session,
                user
            };
        }));

        // Get session statistics
        const statistics = await getSessionStatistics(companyId);

        res.json({
            success: true,
            sessions: enrichedSessions,
            statistics
        });

    } catch (error) {
        console.error('Error monitoring sessions:', error);
        res.status(500).json({
            success: false,
            message: 'Error monitoring sessions'
        });
    }
});

// Real-time activity monitoring (WebSocket endpoint)
const WebSocket = require('ws');
const wss = new WebSocket.Server({ noServer: true });

// Upgrade HTTP connection to WebSocket
server.on('upgrade', (request, socket, head) => {
    wss.handleUpgrade(request, socket, head, (ws) => {
        wss.emit('connection', ws, request);
    });
});

// Handle WebSocket connections
wss.on('connection', async (ws, request) => {
    try {
        // Verify token from request headers
        const token = request.headers['sec-websocket-protocol'];
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        // Set up activity monitoring
        const activityStream = company_audit_logs.watch();
        
        activityStream.on('change', async (change) => {
            if (change.operationType === 'insert') {
                const activity = change.fullDocument;
                
                // Enrich activity data
                const enrichedActivity = await enrichActivityData(activity);
                
                // Send to WebSocket client
                ws.send(JSON.stringify({
                    type: 'activity',
                    data: enrichedActivity
                }));
            }
        });

        // Set up security alert monitoring
        const securityStream = security_logs.watch();
        
        securityStream.on('change', async (change) => {
            if (change.operationType === 'insert') {
                const alert = change.fullDocument;
                
                // Send to WebSocket client
                ws.send(JSON.stringify({
                    type: 'security',
                    data: alert
                }));
            }
        });

        // Handle WebSocket closure
        ws.on('close', () => {
            activityStream.close();
            securityStream.close();
        });

    } catch (error) {
        console.error('WebSocket error:', error);
        ws.close();
    }
});

// Helper function to get activity statistics
async function getActivityStatistics(companyId, filter) {
    const baseFilter = { companyId: new ObjectId(companyId), ...filter };

    const [
        actionTypes,
        userActivity,
        timeDistribution,
        departmentActivity
    ] = await Promise.all([
        company_audit_logs.aggregate([
            { $match: baseFilter },
            { $group: { _id: '$action', count: { $sum: 1 } } }
        ]).toArray(),
        company_audit_logs.aggregate([
            { $match: baseFilter },
            { $group: { _id: '$performedBy', count: { $sum: 1 } } },
            { $sort: { count: -1 } },
            { $limit: 10 }
        ]).toArray(),
        company_audit_logs.aggregate([
            { $match: baseFilter },
            {
                $group: {
                    _id: {
                        hour: { $hour: '$timestamp' },
                        day: { $dayOfWeek: '$timestamp' }
                    },
                    count: { $sum: 1 }
                }
            }
        ]).toArray(),
        company_audit_logs.aggregate([
            { $match: baseFilter },
            { $group: { _id: '$details.department', count: { $sum: 1 } } }
        ]).toArray()
    ]);

    return {
        actionTypes,
        userActivity,
        timeDistribution,
        departmentActivity
    };
}

// Helper function to get security statistics
async function getSecurityStatistics(companyId) {
    const [
        alertsByType,
        alertsBySeverity,
        alertTrends,
        topIPs
    ] = await Promise.all([
        security_logs.aggregate([
            { $match: { companyId: new ObjectId(companyId) } },
            { $group: { _id: '$type', count: { $sum: 1 } } }
        ]).toArray(),
        security_logs.aggregate([
            { $match: { companyId: new ObjectId(companyId) } },
            { $group: { _id: '$severity', count: { $sum: 1 } } }
        ]).toArray(),
        security_logs.aggregate([
            { $match: { companyId: new ObjectId(companyId) } },
            {
                $group: {
                    _id: {
                        date: { $dateToString: { format: '%Y-%m-%d', date: '$timestamp' } }
                    },
                    count: { $sum: 1 }
                }
            },
            { $sort: { '_id.date': 1 } }
        ]).toArray(),
        security_logs.aggregate([
            { $match: { companyId: new ObjectId(companyId) } },
            { $group: { _id: '$ip', count: { $sum: 1 } } },
            { $sort: { count: -1 } },
            { $limit: 10 }
        ]).toArray()
    ]);

    return {
        alertsByType,
        alertsBySeverity,
        alertTrends,
        topIPs
    };
}

// API Key Management
app.post('/api/companies/:companyId/api-keys', verifyToken, verifyCompanyAccess, async (req, res) => {
    try {
        const { companyId } = req.params;
        const { name, permissions, expiryDays, allowedIPs = [] } = req.body;

        // Validate subscription plan allows API access
        const company = await companies.findOne({ _id: new ObjectId(companyId) });
        const plan = await subscription_plans.findOne({ name: company.subscription.plan });

        if (!plan.features.includes('API Access')) {
            return res.status(403).json({
                success: false,
                message: 'Current subscription plan does not include API access'
            });
        }

        // Generate API key
        const apiKey = crypto.randomBytes(32).toString('hex');
        const hashedKey = await bcrypt.hash(apiKey, 12);

        const apiKeyDoc = {
            companyId: new ObjectId(companyId),
            name,
            key: hashedKey,
            permissions: permissions || ['read'],
            allowedIPs,
            createdAt: new Date(),
            createdBy: new ObjectId(req.user.userId),
            expiresAt: expiryDays ? new Date(Date.now() + (expiryDays * 86400000)) : null,
            status: 'active',
            lastUsed: null,
            usageStats: {
                totalCalls: 0,
                lastCall: null,
                errorCount: 0
            }
        };

        const result = await api_keys.insertOne(apiKeyDoc);

        // Create audit log
        await createCompanyAuditLog(
            'API_KEY_GENERATED',
            companyId,
            req.user.userId,
            {
                keyId: result.insertedId,
                name,
                permissions,
                expiryDays
            }
        );

        res.json({
            success: true,
            message: 'API key generated successfully',
            apiKey: apiKey,
            keyId: result.insertedId
        });

    } catch (error) {
        console.error('Error generating API key:', error);
        res.status(500).json({
            success: false,
            message: 'Error generating API key'
        });
    }
});

// Webhook Configuration
app.post('/api/companies/:companyId/webhooks', verifyToken, verifyCompanyAccess, async (req, res) => {
    try {
        const { companyId } = req.params;
        const { url, events, secret, description } = req.body;

        // Validate URL
        if (!url || !url.startsWith('https://')) {
            return res.status(400).json({
                success: false,
                message: 'Invalid webhook URL. HTTPS required.'
            });
        }

        // Generate webhook secret if not provided
        const webhookSecret = secret || crypto.randomBytes(32).toString('hex');

        const webhook = {
            companyId: new ObjectId(companyId),
            url,
            events: events || ['all'],
            secret: await bcrypt.hash(webhookSecret, 12),
            description,
            status: 'active',
            createdAt: new Date(),
            createdBy: new ObjectId(req.user.userId),
            lastTriggered: null,
            failureCount: 0,
            stats: {
                successCount: 0,
                failureCount: 0,
                lastSuccess: null,
                lastFailure: null,
                averageResponseTime: 0
            }
        };

        const result = await webhooks.insertOne(webhook);

        // Create audit log
        await createCompanyAuditLog(
            'WEBHOOK_CONFIGURED',
            companyId,
            req.user.userId,
            {
                webhookId: result.insertedId,
                url,
                events
            }
        );

        res.json({
            success: true,
            message: 'Webhook configured successfully',
            webhookId: result.insertedId,
            secret: webhookSecret
        });

    } catch (error) {
        console.error('Error configuring webhook:', error);
        res.status(500).json({
            success: false,
            message: 'Error configuring webhook'
        });
    }
});

// System Health Check
app.get('/api/system/health', verifyToken, verifyAdmin, async (req, res) => {
    try {
        const startTime = process.hrtime();

        // Perform comprehensive health checks
        const [
            dbHealth,
            redisHealth,
            systemMetrics,
            serviceStatus
        ] = await Promise.all([
            checkDatabaseHealth(),
            checkRedisHealth(),
            getSystemMetrics(),
            checkServiceStatus()
        ]);

        // Calculate response time
        const [seconds, nanoseconds] = process.hrtime(startTime);
        const responseTime = seconds * 1000 + nanoseconds / 1000000;

        const healthStatus = {
            status: 'healthy',
            timestamp: new Date(),
            responseTime,
            components: {
                database: dbHealth,
                cache: redisHealth,
                system: systemMetrics,
                services: serviceStatus
            },
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

// Database health check
async function checkDatabaseHealth() {
    try {
        const startTime = process.hrtime();
        
        // Check database connection
        const adminDb = client.db().admin();
        const serverStatus = await adminDb.serverStatus();
        
        // Calculate response time
        const [seconds, nanoseconds] = process.hrtime(startTime);
        const responseTime = seconds * 1000 + nanoseconds / 1000000;

        return {
            healthy: true,
            responseTime,
            connections: serverStatus.connections,
            metrics: {
                activeConnections: serverStatus.connections.current,
                availableConnections: serverStatus.connections.available,
                totalOperations: serverStatus.opcounters
            }
        };
    } catch (error) {
        return {
            healthy: false,
            error: error.message
        };
    }
}

// Redis health check
async function checkRedisHealth() {
    try {
        const startTime = process.hrtime();
        
        // Test Redis connection
        await redis.ping();
        
        // Get Redis info
        const info = await redis.info();
        
        // Calculate response time
        const [seconds, nanoseconds] = process.hrtime(startTime);
        const responseTime = seconds * 1000 + nanoseconds / 1000000;

        return {
            healthy: true,
            responseTime,
            info: parseRedisInfo(info)
        };
    } catch (error) {
        return {
            healthy: false,
            error: error.message
        };
    }
}

// System metrics collection
async function getSystemMetrics() {
    const metrics = {
        memory: process.memoryUsage(),
        cpu: process.cpuUsage(),
        heap: v8.getHeapStatistics(),
        eventLoop: {
            lag: await checkEventLoopLag(),
            utilization: process.eventLoop.utilization()
        }
    };

    return {
        healthy: true,
        metrics: {
            memoryUsage: {
                heapUsed: Math.round(metrics.memory.heapUsed / 1024 / 1024),
                heapTotal: Math.round(metrics.memory.heapTotal / 1024 / 1024),
                external: Math.round(metrics.memory.external / 1024 / 1024),
                rss: Math.round(metrics.memory.rss / 1024 / 1024)
            },
            cpu: {
                user: metrics.cpu.user,
                system: metrics.cpu.system
            },
            heap: {
                total: Math.round(metrics.heap.total_heap_size / 1024 / 1024),
                used: Math.round(metrics.heap.used_heap_size / 1024 / 1024),
                limit: Math.round(metrics.heap.heap_size_limit / 1024 / 1024)
            },
            eventLoop: metrics.eventLoop
        }
    };
}

// Service status check
async function checkServiceStatus() {
    const services = {
        api: true,
        websocket: wss.clients.size >= 0,
        database: client.isConnected(),
        cache: redis.status === 'ready'
    };

    return {
        healthy: Object.values(services).every(status => status),
        services
    };
}

// Event loop lag check
function checkEventLoopLag() {
    return new Promise((resolve) => {
        const start = Date.now();
        setImmediate(() => {
            resolve(Date.now() - start);
        });
    });
}

// System Maintenance Endpoints

// Schedule maintenance window
app.post('/api/system/maintenance', verifyToken, verifyAdmin, async (req, res) => {
    try {
        const {
            startTime,
            duration,
            type,
            description,
            affectedServices,
            notifyUsers = true
        } = req.body;

        // Validate maintenance window
        const maintenanceStart = new Date(startTime);
        if (maintenanceStart < new Date()) {
            return res.status(400).json({
                success: false,
                message: 'Maintenance window cannot be in the past'
            });
        }

        const maintenance = {
            startTime: maintenanceStart,
            endTime: new Date(maintenanceStart.getTime() + duration * 60000),
            type,
            description,
            affectedServices,
            status: 'scheduled',
            createdBy: new ObjectId(req.user.userId),
            createdAt: new Date(),
            notifications: {
                scheduled: false,
                started: false,
                completed: false
            },
            progress: {
                status: 'pending',
                steps: [],
                currentStep: null,
                completedSteps: 0,
                errors: []
            }
        };

        const result = await database.collection('maintenance_windows')
            .insertOne(maintenance);

        // Schedule maintenance tasks
        scheduleMaintenance(result.insertedId);

        // Notify affected companies if requested
        if (notifyUsers) {
            const companies = await getAffectedCompanies(affectedServices);
            await notifyMaintenanceWindow(companies, maintenance);
        }

        res.json({
            success: true,
            message: 'Maintenance window scheduled successfully',
            maintenanceId: result.insertedId
        });

    } catch (error) {
        console.error('Error scheduling maintenance:', error);
        res.status(500).json({
            success: false,
            message: 'Error scheduling maintenance'
        });
    }
});

// System Backup Endpoints

// Initiate system backup
app.post('/api/system/backup', verifyToken, verifyAdmin, async (req, res) => {
    try {
        const { type, includeData = true } = req.body;

        const backup = {
            type,
            startTime: new Date(),
            status: 'in_progress',
            initiatedBy: new ObjectId(req.user.userId),
            includeData,
            metadata: {
                version: process.env.APP_VERSION,
                node: process.version,
                platform: process.platform
            }
        };

        const result = await database.collection('system_backups')
            .insertOne(backup);

        // Start backup process asynchronously
        performSystemBackup(result.insertedId, type, includeData)
            .catch(error => console.error('Backup error:', error));

        res.json({
            success: true,
            message: 'System backup initiated',
            backupId: result.insertedId
        });

    } catch (error) {
        console.error('Error initiating backup:', error);
        res.status(500).json({
            success: false,
            message: 'Error initiating backup'
        });
    }
});

// System Configuration Management

// Update system configuration
app.put('/api/system/config', verifyToken, verifyAdmin, async (req, res) => {
    try {
        const { settings } = req.body;

        // Validate settings
        const validationResult = validateSystemSettings(settings);
        if (!validationResult.valid) {
            return res.status(400).json({
                success: false,
                message: 'Invalid settings',
                errors: validationResult.errors
            });
        }

        // Get current configuration for comparison
        const currentConfig = await system_config.findOne({ type: 'global' });

        // Update configuration
        await system_config.updateOne(
            { type: 'global' },
            {
                $set: {
                    ...settings,
                    updatedAt: new Date(),
                    updatedBy: new ObjectId(req.user.userId)
                }
            },
            { upsert: true }
        );

        // Log configuration changes
        await createAuditLog(
            'SYSTEM_CONFIG_UPDATED',
            req.user.userId,
            null,
            {
                previous: currentConfig,
                new: settings
            }
        );

        // Apply new configuration
        await applySystemConfiguration(settings);

        res.json({
            success: true,
            message: 'System configuration updated successfully'
        });

    } catch (error) {
        console.error('Error updating system configuration:', error);
        res.status(500).json({
            success: false,
            message: 'Error updating system configuration'
        });
    }
});

// Helper Functions

// Schedule maintenance tasks
async function scheduleMaintenance(maintenanceId) {
    try {
        const maintenance = await database.collection('maintenance_windows')
            .findOne({ _id: maintenanceId });

        // Schedule pre-maintenance notification
        setTimeout(async () => {
            await notifyMaintenanceStart(maintenance);
        }, maintenance.startTime.getTime() - Date.now() - 3600000); // 1 hour before

        // Schedule maintenance start
        setTimeout(async () => {
            await startMaintenance(maintenance);
        }, maintenance.startTime.getTime() - Date.now());

        // Schedule maintenance end
        setTimeout(async () => {
            await completeMaintenance(maintenance);
        }, maintenance.endTime.getTime() - Date.now());

    } catch (error) {
        console.error('Error scheduling maintenance:', error);
    }
}

// Perform system backup
async function performSystemBackup(backupId, type, includeData) {
    try {
        const startTime = Date.now();
        const backupPath = `backups/${backupId}_${Date.now()}`;

        // Create backup directory
        await fs.promises.mkdir(backupPath, { recursive: true });

        // Backup system configuration
        const config = await system_config.findOne({ type: 'global' });
        await fs.promises.writeFile(
            `${backupPath}/config.json`,
            JSON.stringify(config, null, 2)
        );

        if (includeData) {
            // Backup collections
            const collections = await database.listCollections().toArray();
            for (const collection of collections) {
                const data = await database.collection(collection.name).find().toArray();
                await fs.promises.writeFile(
                    `${backupPath}/${collection.name}.json`,
                    JSON.stringify(data, null, 2)
                );
            }
        }

        // Create backup metadata
        const metadata = {
            backupId,
            type,
            startTime: new Date(startTime),
            endTime: new Date(),
            size: await calculateDirectorySize(backupPath),
            collections: includeData ? collections.length : 0,
            path: backupPath
        };

        // Update backup status
        await database.collection('system_backups').updateOne(
            { _id: backupId },
            {
                $set: {
                    status: 'completed',
                    completedAt: new Date(),
                    metadata
                }
            }
        );

    } catch (error) {
        console.error('Backup error:', error);
        await database.collection('system_backups').updateOne(
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

// Apply system configuration
async function applySystemConfiguration(settings) {
    // Apply rate limiting settings
    if (settings.rateLimit) {
        updateRateLimits(settings.rateLimit);
    }

    // Apply security settings
    if (settings.security) {
        updateSecuritySettings(settings.security);
    }

    // Apply cache settings
    if (settings.cache) {
        updateCacheSettings(settings.cache);
    }

    // Apply logging settings
    if (settings.logging) {
        updateLoggingSettings(settings.logging);
    }
}

// Validate system settings
function validateSystemSettings(settings) {
    const errors = [];

    // Validate rate limiting
    if (settings.rateLimit) {
        if (settings.rateLimit.windowMs < 1000) {
            errors.push('Rate limit window must be at least 1 second');
        }
        if (settings.rateLimit.max < 1) {
            errors.push('Rate limit maximum must be at least 1');
        }
    }

    // Validate security settings
    if (settings.security) {
        if (settings.security.sessionTimeout < 300) {
            errors.push('Session timeout must be at least 5 minutes');
        }
        if (settings.security.maxLoginAttempts < 3) {
            errors.push('Maximum login attempts must be at least 3');
        }
    }

    // Validate cache settings
    if (settings.cache) {
        if (settings.cache.ttl < 0) {
            errors.push('Cache TTL cannot be negative');
        }
    }

    return {
        valid: errors.length === 0,
        errors
    };
}

// Calculate directory size
async function calculateDirectorySize(directoryPath) {
    let totalSize = 0;
    const files = await fs.promises.readdir(directoryPath);

    for (const file of files) {
        const stats = await fs.promises.stat(`${directoryPath}/${file}`);
        totalSize += stats.size;
    }

    return totalSize;
}

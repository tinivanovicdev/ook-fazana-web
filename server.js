const express = require('express');
const multer = require('multer');
const cors = require('cors');
const helmet = require('helmet');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const mysql = require('mysql2/promise');
const path = require('path');
const fs = require('fs');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Security middleware
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'"],
            scriptSrc: ["'self'", "'unsafe-inline'"],
            scriptSrcAttr: ["'unsafe-inline'"],
            imgSrc: ["'self'", "data:", "blob:"],
            fontSrc: ["'self'"],
            connectSrc: ["'self'"]
        }
    }
}));

// CORS configuration
app.use(cors({
    origin: process.env.NODE_ENV === 'production' ? process.env.FRONTEND_URL : true,
    credentials: true
}));

// Rate limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100 // limit each IP to 100 requests per windowMs
});
app.use('/api/', limiter);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Static files
app.use(express.static('public'));

// Database connection
let db;

async function connectDatabase() {
    try {
        let connectionConfig;
        
        if (process.env.DATABASE_URL) {
            const dbUrl = process.env.DATABASE_URL;
            
            // Parse Railway MySQL URL format: mysql://username:password@host:port/database
            const url = new URL(dbUrl);
            connectionConfig = {
                host: url.hostname,
                port: url.port || 3306,
                user: url.username,
                password: url.password,
                database: url.pathname.slice(1), // Remove leading slash
                ssl: {
                    rejectUnauthorized: false
                }
            };
        } else {
            // Fallback to environment variables
            connectionConfig = {
                host: process.env.DB_HOST || 'localhost',
                port: process.env.DB_PORT || 3306,
                user: process.env.DB_USER || 'root',
                password: process.env.DB_PASSWORD || '',
                database: process.env.DB_NAME || 'ook_fazana'
            };
        }
        
        // Use a connection pool to avoid closed connection issues
        db = await mysql.createPool({
            ...connectionConfig,
            waitForConnections: true,
            connectionLimit: 10,
            queueLimit: 0,
            enableKeepAlive: true,
            keepAliveInitialDelay: 0
        });
        console.log('Connected to MySQL database (pool)');
        
        // Initialize database tables
        await initializeTables();
        
    } catch (error) {
        console.error('Database connection error:', error);
        process.exit(1);
    }
}

async function migrateTables() {
    try {
        // Check if results table has old schema and migrate
        const [resultsColumns] = await db.execute(`
            SELECT COLUMN_NAME 
            FROM INFORMATION_SCHEMA.COLUMNS 
            WHERE TABLE_NAME = 'results' 
            AND TABLE_SCHEMA = DATABASE()
        `);
        
        const columnNames = resultsColumns.map(col => col.COLUMN_NAME);
        
        if (columnNames.includes('image_path') && !columnNames.includes('image_data')) {
            console.log('Migrating results table from file path to BLOB schema...');
            
            // Create new table with BLOB schema
            await db.execute(`
                CREATE TABLE results_new (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    category VARCHAR(50) NOT NULL,
                    year VARCHAR(10) NOT NULL,
                    image_data LONGBLOB NOT NULL,
                    image_filename VARCHAR(255) NOT NULL,
                    image_mimetype VARCHAR(100) NOT NULL,
                    description TEXT,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                    UNIQUE KEY unique_category_year (category, year)
                )
            `);
            
            // Drop old table and rename new one
            await db.execute('DROP TABLE results');
            await db.execute('RENAME TABLE results_new TO results');
            
            console.log('Results table migrated successfully - existing data cleared due to schema change from file paths to BLOB storage');
        }
        
        // Check if documents table has old schema and migrate
        const [documentsColumns] = await db.execute(`
            SELECT COLUMN_NAME 
            FROM INFORMATION_SCHEMA.COLUMNS 
            WHERE TABLE_NAME = 'documents' 
            AND TABLE_SCHEMA = DATABASE()
        `);
        
        const docColumnNames = documentsColumns.map(col => col.COLUMN_NAME);
        
        if (docColumnNames.includes('file_path') && !docColumnNames.includes('file_data')) {
            console.log('Migrating documents table from file path to BLOB schema...');
            
            // Create new table with BLOB schema
            await db.execute(`
                CREATE TABLE documents_new (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    title VARCHAR(255) NOT NULL,
                    category VARCHAR(50) NOT NULL,
                    file_data LONGBLOB NOT NULL,
                    file_filename VARCHAR(255) NOT NULL,
                    file_mimetype VARCHAR(100) NOT NULL,
                    description TEXT,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
                )
            `);
            
            // Drop old table and rename new one
            await db.execute('DROP TABLE documents');
            await db.execute('RENAME TABLE documents_new TO documents');
            
            console.log('Documents table migrated successfully - existing data cleared due to schema change from file paths to BLOB storage');
        }
        
    } catch (error) {
        console.error('Migration error:', error);
        // Don't throw error - let the app continue with new tables
    }
}

async function initializeTables() {
    try {
        // Check if tables exist and migrate if needed
        await migrateTables();
        
        // Create results table
        await db.execute(`
            CREATE TABLE IF NOT EXISTS results (
                id INT AUTO_INCREMENT PRIMARY KEY,
                category VARCHAR(50) NOT NULL,
                year VARCHAR(10) NOT NULL,
                image_data LONGBLOB NOT NULL,
                image_filename VARCHAR(255) NOT NULL,
                image_mimetype VARCHAR(100) NOT NULL,
                description TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                UNIQUE KEY unique_category_year (category, year)
            )
        `);

        // Create documents table
        await db.execute(`
            CREATE TABLE IF NOT EXISTS documents (
                id INT AUTO_INCREMENT PRIMARY KEY,
                title VARCHAR(255) NOT NULL,
                category VARCHAR(50) NOT NULL,
                file_data LONGBLOB NOT NULL,
                file_filename VARCHAR(255) NOT NULL,
                file_mimetype VARCHAR(100) NOT NULL,
                description TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            )
        `);

        // Create admin users table
        await db.execute(`
            CREATE TABLE IF NOT EXISTS admin_users (
                id INT AUTO_INCREMENT PRIMARY KEY,
                username VARCHAR(50) UNIQUE NOT NULL,
                password_hash VARCHAR(255) NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // Create default admin user if table is empty
        const [rows] = await db.execute('SELECT COUNT(*) as count FROM admin_users');
        if (rows[0].count === 0) {
            const hashedPassword = await bcrypt.hash('admin123', 10);
            await db.execute(
                'INSERT INTO admin_users (username, password_hash) VALUES (?, ?)',
                ['admin', hashedPassword]
            );
            console.log('Default admin user created: username=admin, password=admin123');
        }

        console.log('Database tables initialized successfully');
    } catch (error) {
        console.error('Error initializing database tables:', error);
        throw error;
    }
}

// File upload configuration - store in memory for BLOB storage
const storage = multer.memoryStorage();

const upload = multer({ 
    storage: storage,
    limits: {
        fileSize: 10 * 1024 * 1024 // 10MB limit
    },
    fileFilter: (req, file, cb) => {
        if (file.fieldname === 'image') {
            // Allow only images
            if (file.mimetype.startsWith('image/')) {
                cb(null, true);
            } else {
                cb(new Error('Only image files are allowed for results'), false);
            }
        } else if (file.fieldname === 'file') {
            // Allow only PDFs for documents
            if (file.mimetype === 'application/pdf') {
                cb(null, true);
            } else {
                cb(new Error('Only PDF files are allowed for documents'), false);
            }
        } else {
            cb(new Error('Invalid field name'), false);
        }
    }
});

// Authentication middleware
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ error: 'Access token required' });
    }

    jwt.verify(token, process.env.JWT_SECRET || 'fallback_secret_key', (err, user) => {
        if (err) {
            return res.status(403).json({ error: 'Invalid or expired token' });
        }
        req.user = user;
        next();
    });
};

// Authentication routes
app.post('/api/login', async (req, res) => {
    try {
        const { username, password } = req.body;

        if (!username || !password) {
            return res.status(400).json({ error: 'Username and password are required' });
        }

        const [rows] = await db.execute(
            'SELECT * FROM admin_users WHERE username = ?',
            [username]
        );

        if (rows.length === 0) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        const user = rows[0];
        const isValidPassword = await bcrypt.compare(password, user.password_hash);

        if (!isValidPassword) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        const token = jwt.sign(
            { userId: user.id, username: user.username },
            process.env.JWT_SECRET || 'fallback_secret_key',
            { expiresIn: '24h' }
        );

        res.json({
            token,
            user: { id: user.id, username: user.username }
        });

    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Database error' });
    }
});

// Results API routes
app.get('/api/results', async (req, res) => {
    try {
        const [rows] = await db.execute('SELECT id, category, year, image_filename, image_mimetype, description, created_at, updated_at FROM results ORDER BY year DESC, category');
        console.log(`GET /api/results returned ${rows.length} records:`, rows.map(r => ({id: r.id, category: r.category, year: r.year})));
        res.json(rows);
    } catch (error) {
        console.error('Database error in GET /api/results:', error);
        res.status(500).json({ error: 'Database error', details: error.message });
    }
});

app.get('/api/results/:category/:year', async (req, res) => {
    try {
        const { category, year } = req.params;
        
        const [rows] = await db.execute(
            'SELECT id, category, year, image_filename, image_mimetype, description, created_at, updated_at FROM results WHERE category = ? AND year = ?',
            [category, year]
        );
        
        if (rows.length === 0) {
            return res.status(404).json({ error: 'Result not found' });
        }
        
        res.json(rows[0]);
    } catch (error) {
        console.error('Database error:', error);
        res.status(500).json({ error: 'Database error' });
    }
});

app.post('/api/results', authenticateToken, upload.single('image'), async (req, res) => {
    try {
        const { category, year, description } = req.body;
        
        if (!req.file) {
            return res.status(400).json({ error: 'Image file is required' });
        }

        if (!category || !year) {
            return res.status(400).json({ error: 'Category and year are required' });
        }

        // Store BLOB data in database
        await db.execute(
            'INSERT INTO results (category, year, image_data, image_filename, image_mimetype, description) VALUES (?, ?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE image_data = VALUES(image_data), image_filename = VALUES(image_filename), image_mimetype = VALUES(image_mimetype), description = VALUES(description), updated_at = CURRENT_TIMESTAMP',
            [category, year, req.file.buffer, req.file.originalname, req.file.mimetype, description]
        );
        
        res.json({
            category,
            year,
            image_filename: req.file.originalname,
            image_mimetype: req.file.mimetype,
            description,
            message: 'Result saved successfully'
        });

    } catch (error) {
        console.error('Database error:', error);
        res.status(500).json({ error: 'Database error' });
    }
});

app.put('/api/results/:id', authenticateToken, upload.single('image'), async (req, res) => {
    try {
        const { id } = req.params;
        const { category, year, description } = req.body;

        let updateQuery = 'UPDATE results SET category = ?, year = ?, description = ?, updated_at = CURRENT_TIMESTAMP';
        let params = [category, year, description];

        // If a new image is uploaded, update the image path
        if (req.file) {
            updateQuery += ', image_path = ?';
            params.push(`assets/results/${req.file.filename}`);
        }

        updateQuery += ' WHERE id = ?';
        params.push(id);

        const [result] = await db.execute(updateQuery, params);
        
        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Result not found' });
        }
        
        res.json({ message: 'Result updated successfully' });

    } catch (error) {
        console.error('Database error:', error);
        res.status(500).json({ error: 'Database error' });
    }
});

app.delete('/api/results/:id', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;

        // Ensure record exists
        const [rows] = await db.execute('SELECT id FROM results WHERE id = ?', [id]);
        if (rows.length === 0) {
            return res.status(404).json({ error: 'Result not found' });
        }

        // Delete the record
        await db.execute('DELETE FROM results WHERE id = ?', [id]);

        res.json({ message: 'Result deleted successfully' });

    } catch (error) {
        console.error('Database error:', error);
        res.status(500).json({ error: 'Database error' });
    }
});

// Get result image as BLOB
app.get('/api/results/:id/image', async (req, res) => {
    try {
        const { id } = req.params;
        console.log(`BLOB endpoint called for result ID: ${id}`);
        
        const [rows] = await db.execute(
            'SELECT image_data, image_mimetype FROM results WHERE id = ?',
            [id]
        );
        
        console.log(`Query returned ${rows.length} rows for ID ${id}`);
        
        if (rows.length === 0) {
            console.log(`No result found for ID ${id}`);
            return res.status(404).json({ error: 'Result not found' });
        }
        
        const { image_data, image_mimetype } = rows[0];
        console.log(`Serving image data for ID ${id}, mimetype: ${image_mimetype}, data size: ${image_data ? image_data.length : 'null'}`);
        
        res.set('Content-Type', image_mimetype);
        res.send(image_data);
    } catch (error) {
        console.error('Database error in BLOB endpoint:', error);
        res.status(500).json({ error: 'Database error', details: error.message });
    }
});

// Documents API routes
app.get('/api/documents', async (req, res) => {
    try {
        const [rows] = await db.execute('SELECT id, title, category, file_filename, file_mimetype, description, created_at, updated_at FROM documents ORDER BY created_at DESC');
        res.json(rows);
    } catch (error) {
        console.error('Database error in GET /api/documents:', error);
        res.status(500).json({ error: 'Database error', details: error.message });
    }
});

app.get('/api/documents/:id', async (req, res) => {
    try {
        const { id } = req.params;
        
        const [rows] = await db.execute('SELECT id, title, category, file_filename, file_mimetype, description, created_at, updated_at FROM documents WHERE id = ?', [id]);
        
        if (rows.length === 0) {
            return res.status(404).json({ error: 'Document not found' });
        }
        
        res.json(rows[0]);
    } catch (error) {
        console.error('Database error:', error);
        res.status(500).json({ error: 'Database error' });
    }
});

app.post('/api/documents', authenticateToken, upload.single('file'), async (req, res) => {
    try {
        const { title, category, description } = req.body;
        
        if (!req.file) {
            return res.status(400).json({ error: 'PDF file is required' });
        }

        if (!title) {
            return res.status(400).json({ error: 'Title is required' });
        }

        // Store BLOB data in database
        const [result] = await db.execute(
            'INSERT INTO documents (title, category, file_data, file_filename, file_mimetype, description) VALUES (?, ?, ?, ?, ?, ?)',
            [title, category || 'general', req.file.buffer, req.file.originalname, req.file.mimetype, description]
        );
        
        res.json({
            id: result.insertId,
            title,
            category: category || 'general',
            file_filename: req.file.originalname,
            file_mimetype: req.file.mimetype,
            description,
            message: 'Document saved successfully'
        });

    } catch (error) {
        console.error('Database error:', error);
        res.status(500).json({ error: 'Database error' });
    }
});

app.put('/api/documents/:id', authenticateToken, upload.single('file'), async (req, res) => {
    try {
        const { id } = req.params;
        const { title, category, description } = req.body;

        let updateQuery = 'UPDATE documents SET title = ?, category = ?, description = ?, updated_at = CURRENT_TIMESTAMP';
        let params = [title, category, description];

        // If a new file is uploaded, update the file path
        if (req.file) {
            updateQuery += ', file_path = ?';
            params.push(`assets/documents/${req.file.filename}`);
        }

        updateQuery += ' WHERE id = ?';
        params.push(id);

        const [result] = await db.execute(updateQuery, params);
        
        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Document not found' });
        }
        
        res.json({ message: 'Document updated successfully' });

    } catch (error) {
        console.error('Database error:', error);
        res.status(500).json({ error: 'Database error' });
    }
});

// Get document file as BLOB
app.get('/api/documents/:id/file', async (req, res) => {
    try {
        const { id } = req.params;
        
        const [rows] = await db.execute(
            'SELECT file_data, file_mimetype, file_filename FROM documents WHERE id = ?',
            [id]
        );
        
        if (rows.length === 0) {
            return res.status(404).json({ error: 'Document not found' });
        }
        
        const { file_data, file_mimetype, file_filename } = rows[0];
        
        res.set('Content-Type', file_mimetype);
        res.set('Content-Disposition', `attachment; filename="${file_filename}"`);
        res.send(file_data);
    } catch (error) {
        console.error('Database error:', error);
        res.status(500).json({ error: 'Database error' });
    }
});

app.delete('/api/documents/:id', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;

        // Ensure record exists
        const [rows] = await db.execute('SELECT id FROM documents WHERE id = ?', [id]);
        if (rows.length === 0) {
            return res.status(404).json({ error: 'Document not found' });
        }

        // Delete the record
        await db.execute('DELETE FROM documents WHERE id = ?', [id]);

        res.json({ message: 'Document deleted successfully' });

    } catch (error) {
        console.error('Database error:', error);
        res.status(500).json({ error: 'Database error' });
    }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
    res.json({ 
        status: 'OK', 
        timestamp: new Date().toISOString(),
        version: '2.1.0',
        mode: 'database'
    });
});

// Start server
async function startServer() {
    await connectDatabase();
    
    app.listen(PORT, () => {
        console.log(`Server running on port ${PORT}`);
        console.log('Database mode - MySQL connection established');
    });
}

startServer().catch(console.error);
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

// Database setup
let db;

async function initDatabase() {
    try {
        // Parse DATABASE_URL for MySQL connection
        const dbUrl = process.env.DATABASE_URL;
        let connectionConfig;
        
        if (dbUrl) {
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
        
        db = await mysql.createConnection(connectionConfig);
        console.log('Connected to MySQL database');
        
        // Initialize database tables
        await initializeTables();
        
    } catch (error) {
        console.error('Database connection error:', error);
        process.exit(1);
    }
}

async function initializeTables() {
    try {
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

        // Check if admin user exists
        const [rows] = await db.execute('SELECT COUNT(*) as count FROM admin_users');
        
        if (rows[0].count === 0) {
            const defaultPassword = process.env.ADMIN_PASSWORD || 'ookfazana2024';
            const hashedPassword = bcrypt.hashSync(defaultPassword, 10);
            
            await db.execute(
                'INSERT INTO admin_users (username, password_hash) VALUES (?, ?)',
                ['admin', hashedPassword]
            );
            
            console.log('Default admin user created: admin /', defaultPassword);
        }
        
        console.log('Database tables initialized');
        
    } catch (error) {
        console.error('Error initializing database tables:', error);
        throw error;
    }
}

// File upload configuration - store in memory for database storage
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

    jwt.verify(token, process.env.JWT_SECRET || 'ook-fazana-secret-key', (err, user) => {
        if (err) {
            return res.status(403).json({ error: 'Invalid or expired token' });
        }
        req.user = user;
        next();
    });
};

// Routes

// Authentication routes
app.post('/api/auth/login', async (req, res) => {
    try {
        const { username, password } = req.body;

        if (!username || !password) {
            return res.status(400).json({ error: 'Username and password are required' });
        }

        const [rows] = await db.execute(
            'SELECT * FROM admin_users WHERE username = ?',
            [username]
        );

        if (rows.length === 0 || !bcrypt.compareSync(password, rows[0].password_hash)) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        const user = rows[0];
        const token = jwt.sign(
            { id: user.id, username: user.username },
            process.env.JWT_SECRET || 'ook-fazana-secret-key',
            { expiresIn: '24h' }
        );

        res.json({
            token,
            user: {
                id: user.id,
                username: user.username
            }
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
        res.json(rows);
    } catch (error) {
        console.error('Database error:', error);
        res.status(500).json({ error: 'Database error' });
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

// Serve image data from database
app.get('/api/results/:id/image', async (req, res) => {
    try {
        const { id } = req.params;
        
        const [rows] = await db.execute(
            'SELECT image_data, image_mimetype, image_filename FROM results WHERE id = ?',
            [id]
        );
        
        if (rows.length === 0) {
            return res.status(404).json({ error: 'Image not found' });
        }
        
        const { image_data, image_mimetype, image_filename } = rows[0];
        
        res.set({
            'Content-Type': image_mimetype,
            'Content-Disposition': `inline; filename="${image_filename}"`,
            'Cache-Control': 'public, max-age=31536000' // Cache for 1 year
        });
        
        res.send(image_data);
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

        // Store image data in database instead of filesystem
        const imageData = req.file.buffer;
        const imageFilename = req.file.originalname;
        const imageMimetype = req.file.mimetype;

        await db.execute(
            'INSERT INTO results (category, year, image_data, image_filename, image_mimetype, description) VALUES (?, ?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE image_data = VALUES(image_data), image_filename = VALUES(image_filename), image_mimetype = VALUES(image_mimetype), description = VALUES(description), updated_at = CURRENT_TIMESTAMP',
            [category, year, imageData, imageFilename, imageMimetype, description]
        );
        
        res.json({
            category,
            year,
            image_filename: imageFilename,
            image_mimetype: imageMimetype,
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
            params.push(req.file.path);
            
            // Get old image path to delete it
            const [rows] = await db.execute('SELECT image_path FROM results WHERE id = ?', [id]);
            if (rows.length > 0 && rows[0].image_path) {
                fs.unlink(rows[0].image_path, (err) => {
                    if (err) console.error('Error deleting old image:', err);
                });
            }
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

        // Get image path before deleting
        const [rows] = await db.execute('SELECT image_path FROM results WHERE id = ?', [id]);

        if (rows.length === 0) {
            return res.status(404).json({ error: 'Result not found' });
        }

        // Delete the record
        await db.execute('DELETE FROM results WHERE id = ?', [id]);

        // Delete the image file
        fs.unlink(rows[0].image_path, (err) => {
            if (err) console.error('Error deleting image file:', err);
        });

        res.json({ message: 'Result deleted successfully' });

    } catch (error) {
        console.error('Database error:', error);
        res.status(500).json({ error: 'Database error' });
    }
});

// Documents API routes
app.get('/api/documents', async (req, res) => {
    try {
        const [rows] = await db.execute('SELECT id, title, category, file_filename, file_mimetype, description, created_at, updated_at FROM documents ORDER BY created_at DESC');
        res.json(rows);
    } catch (error) {
        console.error('Database error:', error);
        res.status(500).json({ error: 'Database error' });
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

// Serve document file from database
app.get('/api/documents/:id/file', async (req, res) => {
    try {
        const { id } = req.params;
        
        const [rows] = await db.execute(
            'SELECT file_data, file_mimetype, file_filename FROM documents WHERE id = ?',
            [id]
        );
        
        if (rows.length === 0) {
            return res.status(404).json({ error: 'Document file not found' });
        }
        
        const { file_data, file_mimetype, file_filename } = rows[0];
        
        res.set({
            'Content-Type': file_mimetype,
            'Content-Disposition': `attachment; filename="${file_filename}"`,
            'Cache-Control': 'public, max-age=31536000' // Cache for 1 year
        });
        
        res.send(file_data);
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

        if (!title || !category) {
            return res.status(400).json({ error: 'Title and category are required' });
        }

        // Store file data in database instead of filesystem
        const fileData = req.file.buffer;
        const fileFilename = req.file.originalname;
        const fileMimetype = req.file.mimetype;

        const [result] = await db.execute(
            'INSERT INTO documents (title, category, file_data, file_filename, file_mimetype, description) VALUES (?, ?, ?, ?, ?, ?)',
            [title, category, fileData, fileFilename, fileMimetype, description]
        );
        
        res.json({
            id: result.insertId,
            title,
            category,
            file_path: filePath,
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
            params.push(req.file.path);
            
            // Get old file path to delete it
            const [rows] = await db.execute('SELECT file_path FROM documents WHERE id = ?', [id]);
            if (rows.length > 0 && rows[0].file_path) {
                fs.unlink(rows[0].file_path, (err) => {
                    if (err) console.error('Error deleting old file:', err);
                });
            }
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

app.delete('/api/documents/:id', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;

        // Get file path before deleting
        const [rows] = await db.execute('SELECT file_path FROM documents WHERE id = ?', [id]);

        if (rows.length === 0) {
            return res.status(404).json({ error: 'Document not found' });
        }

        // Delete the record
        await db.execute('DELETE FROM documents WHERE id = ?', [id]);

        // Delete the file
        fs.unlink(rows[0].file_path, (err) => {
            if (err) console.error('Error deleting file:', err);
        });

        res.json({ message: 'Document deleted successfully' });

    } catch (error) {
        console.error('Database error:', error);
        res.status(500).json({ error: 'Database error' });
    }
});

// Note: File serving routes removed - files are now served from database via /api/results/:id/image and /api/documents/:id/file

// Health check endpoint
app.get('/api/health', (req, res) => {
    res.json({ 
        status: 'OK', 
        timestamp: new Date().toISOString(),
        version: '1.0.0',
        database: 'MySQL'
    });
});

// Error handling middleware
app.use((error, req, res, next) => {
    console.error('Error:', error);
    
    if (error instanceof multer.MulterError) {
        if (error.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).json({ error: 'File too large. Maximum size is 10MB.' });
        }
    }
    
    res.status(500).json({ error: 'Internal server error' });
});

// 404 handler
app.use('*', (req, res) => {
    res.status(404).json({ error: 'Not found' });
});

// Graceful shutdown
process.on('SIGINT', async () => {
    console.log('Shutting down gracefully...');
    if (db) {
        await db.end();
        console.log('Database connection closed.');
    }
    process.exit(0);
});

// Initialize database and start server
async function startServer() {
    try {
        await initDatabase();
        
        app.listen(PORT, () => {
            console.log(`🚀 OOK FAŽANA Web Server running on port ${PORT}`);
            console.log(`📊 Database: MySQL`);
            console.log(`🔒 Environment: ${process.env.NODE_ENV || 'development'}`);
        });
    } catch (error) {
        console.error('Failed to start server:', error);
        process.exit(1);
    }
}

startServer();

module.exports = app;
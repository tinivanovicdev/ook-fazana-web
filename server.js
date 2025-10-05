const express = require('express');
const multer = require('multer');
const cors = require('cors');
const helmet = require('helmet');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const sqlite3 = require('sqlite3').verbose();
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
            scriptSrc: ["'self'"],
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
const dbPath = process.env.DATABASE_URL || './database.sqlite';
const db = new sqlite3.Database(dbPath);

// Initialize database
db.serialize(() => {
    // Results table
    db.run(`CREATE TABLE IF NOT EXISTS results (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        category TEXT NOT NULL,
        year TEXT NOT NULL,
        image_path TEXT NOT NULL,
        description TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(category, year)
    )`);

    // Documents table
    db.run(`CREATE TABLE IF NOT EXISTS documents (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        category TEXT NOT NULL,
        file_path TEXT NOT NULL,
        description TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    // Admin users table
    db.run(`CREATE TABLE IF NOT EXISTS admin_users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    // Create default admin user if none exists
    db.get('SELECT COUNT(*) as count FROM admin_users', (err, row) => {
        if (err) {
            console.error('Error checking admin users:', err);
            return;
        }
        
        if (row.count === 0) {
            const defaultPassword = process.env.ADMIN_PASSWORD || 'ookfazana2024';
            const hashedPassword = bcrypt.hashSync(defaultPassword, 10);
            
            db.run(
                'INSERT INTO admin_users (username, password_hash) VALUES (?, ?)',
                ['admin', hashedPassword],
                (err) => {
                    if (err) {
                        console.error('Error creating default admin:', err);
                    } else {
                        console.log('Default admin user created: admin /', defaultPassword);
                    }
                }
            );
        }
    });
});

// File upload configuration
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadDir = file.fieldname === 'image' ? 'uploads/results' : 'uploads/documents';
        
        // Create directory if it doesn't exist
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }
        
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const extension = path.extname(file.originalname);
        cb(null, file.fieldname + '-' + uniqueSuffix + extension);
    }
});

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
app.post('/api/auth/login', (req, res) => {
    const { username, password } = req.body;

    if (!username || !password) {
        return res.status(400).json({ error: 'Username and password are required' });
    }

    db.get(
        'SELECT * FROM admin_users WHERE username = ?',
        [username],
        (err, user) => {
            if (err) {
                console.error('Database error:', err);
                return res.status(500).json({ error: 'Database error' });
            }

            if (!user || !bcrypt.compareSync(password, user.password_hash)) {
                return res.status(401).json({ error: 'Invalid credentials' });
            }

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
        }
    );
});

// Results API routes
app.get('/api/results', (req, res) => {
    db.all('SELECT * FROM results ORDER BY year DESC, category', (err, rows) => {
        if (err) {
            console.error('Database error:', err);
            return res.status(500).json({ error: 'Database error' });
        }
        res.json(rows);
    });
});

app.get('/api/results/:category/:year', (req, res) => {
    const { category, year } = req.params;
    
    db.get(
        'SELECT * FROM results WHERE category = ? AND year = ?',
        [category, year],
        (err, row) => {
            if (err) {
                console.error('Database error:', err);
                return res.status(500).json({ error: 'Database error' });
            }
            
            if (!row) {
                return res.status(404).json({ error: 'Result not found' });
            }
            
            res.json(row);
        }
    );
});

app.post('/api/results', authenticateToken, upload.single('image'), (req, res) => {
    const { category, year, description } = req.body;
    
    if (!req.file) {
        return res.status(400).json({ error: 'Image file is required' });
    }

    if (!category || !year) {
        return res.status(400).json({ error: 'Category and year are required' });
    }

    const imagePath = req.file.path;

    db.run(
        'INSERT OR REPLACE INTO results (category, year, image_path, description, updated_at) VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)',
        [category, year, imagePath, description],
        function(err) {
            if (err) {
                console.error('Database error:', err);
                return res.status(500).json({ error: 'Database error' });
            }
            
            res.json({
                id: this.lastID,
                category,
                year,
                image_path: imagePath,
                description,
                message: 'Result saved successfully'
            });
        }
    );
});

app.put('/api/results/:id', authenticateToken, upload.single('image'), (req, res) => {
    const { id } = req.params;
    const { category, year, description } = req.body;

    let updateQuery = 'UPDATE results SET category = ?, year = ?, description = ?, updated_at = CURRENT_TIMESTAMP';
    let params = [category, year, description];

    // If a new image is uploaded, update the image path
    if (req.file) {
        updateQuery += ', image_path = ?';
        params.push(req.file.path);
        
        // Get old image path to delete it
        db.get('SELECT image_path FROM results WHERE id = ?', [id], (err, row) => {
            if (row && row.image_path) {
                fs.unlink(row.image_path, (err) => {
                    if (err) console.error('Error deleting old image:', err);
                });
            }
        });
    }

    updateQuery += ' WHERE id = ?';
    params.push(id);

    db.run(updateQuery, params, function(err) {
        if (err) {
            console.error('Database error:', err);
            return res.status(500).json({ error: 'Database error' });
        }
        
        if (this.changes === 0) {
            return res.status(404).json({ error: 'Result not found' });
        }
        
        res.json({ message: 'Result updated successfully' });
    });
});

app.delete('/api/results/:id', authenticateToken, (req, res) => {
    const { id } = req.params;

    // Get image path before deleting
    db.get('SELECT image_path FROM results WHERE id = ?', [id], (err, row) => {
        if (err) {
            console.error('Database error:', err);
            return res.status(500).json({ error: 'Database error' });
        }

        if (!row) {
            return res.status(404).json({ error: 'Result not found' });
        }

        // Delete the record
        db.run('DELETE FROM results WHERE id = ?', [id], function(err) {
            if (err) {
                console.error('Database error:', err);
                return res.status(500).json({ error: 'Database error' });
            }

            // Delete the image file
            fs.unlink(row.image_path, (err) => {
                if (err) console.error('Error deleting image file:', err);
            });

            res.json({ message: 'Result deleted successfully' });
        });
    });
});

// Documents API routes
app.get('/api/documents', (req, res) => {
    db.all('SELECT * FROM documents ORDER BY created_at DESC', (err, rows) => {
        if (err) {
            console.error('Database error:', err);
            return res.status(500).json({ error: 'Database error' });
        }
        res.json(rows);
    });
});

app.get('/api/documents/:id', (req, res) => {
    const { id } = req.params;
    
    db.get('SELECT * FROM documents WHERE id = ?', [id], (err, row) => {
        if (err) {
            console.error('Database error:', err);
            return res.status(500).json({ error: 'Database error' });
        }
        
        if (!row) {
            return res.status(404).json({ error: 'Document not found' });
        }
        
        res.json(row);
    });
});

app.post('/api/documents', authenticateToken, upload.single('file'), (req, res) => {
    const { title, category, description } = req.body;
    
    if (!req.file) {
        return res.status(400).json({ error: 'PDF file is required' });
    }

    if (!title || !category) {
        return res.status(400).json({ error: 'Title and category are required' });
    }

    const filePath = req.file.path;

    db.run(
        'INSERT INTO documents (title, category, file_path, description) VALUES (?, ?, ?, ?)',
        [title, category, filePath, description],
        function(err) {
            if (err) {
                console.error('Database error:', err);
                return res.status(500).json({ error: 'Database error' });
            }
            
            res.json({
                id: this.lastID,
                title,
                category,
                file_path: filePath,
                description,
                message: 'Document saved successfully'
            });
        }
    );
});

app.put('/api/documents/:id', authenticateToken, upload.single('file'), (req, res) => {
    const { id } = req.params;
    const { title, category, description } = req.body;

    let updateQuery = 'UPDATE documents SET title = ?, category = ?, description = ?, updated_at = CURRENT_TIMESTAMP';
    let params = [title, category, description];

    // If a new file is uploaded, update the file path
    if (req.file) {
        updateQuery += ', file_path = ?';
        params.push(req.file.path);
        
        // Get old file path to delete it
        db.get('SELECT file_path FROM documents WHERE id = ?', [id], (err, row) => {
            if (row && row.file_path) {
                fs.unlink(row.file_path, (err) => {
                    if (err) console.error('Error deleting old file:', err);
                });
            }
        });
    }

    updateQuery += ' WHERE id = ?';
    params.push(id);

    db.run(updateQuery, params, function(err) {
        if (err) {
            console.error('Database error:', err);
            return res.status(500).json({ error: 'Database error' });
        }
        
        if (this.changes === 0) {
            return res.status(404).json({ error: 'Document not found' });
        }
        
        res.json({ message: 'Document updated successfully' });
    });
});

app.delete('/api/documents/:id', authenticateToken, (req, res) => {
    const { id } = req.params;

    // Get file path before deleting
    db.get('SELECT file_path FROM documents WHERE id = ?', [id], (err, row) => {
        if (err) {
            console.error('Database error:', err);
            return res.status(500).json({ error: 'Database error' });
        }

        if (!row) {
            return res.status(404).json({ error: 'Document not found' });
        }

        // Delete the record
        db.run('DELETE FROM documents WHERE id = ?', [id], function(err) {
            if (err) {
                console.error('Database error:', err);
                return res.status(500).json({ error: 'Database error' });
            }

            // Delete the file
            fs.unlink(row.file_path, (err) => {
                if (err) console.error('Error deleting file:', err);
            });

            res.json({ message: 'Document deleted successfully' });
        });
    });
});

// File serving routes
app.get('/uploads/results/:filename', (req, res) => {
    const filename = req.params.filename;
    const filepath = path.join(__dirname, 'uploads', 'results', filename);
    
    res.sendFile(filepath, (err) => {
        if (err) {
            console.error('Error serving file:', err);
            res.status(404).json({ error: 'File not found' });
        }
    });
});

app.get('/uploads/documents/:filename', (req, res) => {
    const filename = req.params.filename;
    const filepath = path.join(__dirname, 'uploads', 'documents', filename);
    
    res.sendFile(filepath, (err) => {
        if (err) {
            console.error('Error serving file:', err);
            res.status(404).json({ error: 'File not found' });
        }
    });
});

// Health check endpoint
app.get('/api/health', (req, res) => {
    res.json({ 
        status: 'OK', 
        timestamp: new Date().toISOString(),
        version: '1.0.0'
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
process.on('SIGINT', () => {
    console.log('Shutting down gracefully...');
    db.close((err) => {
        if (err) {
            console.error('Error closing database:', err);
        } else {
            console.log('Database connection closed.');
        }
        process.exit(0);
    });
});

app.listen(PORT, () => {
    console.log(`🚀 OOK FAŽANA Web Server running on port ${PORT}`);
    console.log(`📊 Database: ${dbPath}`);
    console.log(`🔒 Environment: ${process.env.NODE_ENV || 'development'}`);
});

module.exports = app;

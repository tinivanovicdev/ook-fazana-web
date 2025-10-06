const express = require('express');
const multer = require('multer');
const cors = require('cors');
const helmet = require('helmet');
const path = require('path');
const fs = require('fs');
const rateLimit = require('express-rate-limit');

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

// File upload configuration - store in assets folder
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadDir = file.fieldname === 'image' ? 'public/assets/results' : 'public/assets/documents';
        
        // Create directory if it doesn't exist
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }
        
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        // Create consistent naming convention
        let filename;
        if (file.fieldname === 'image') {
            // For results: category-year.extension (e.g., mini-odbojka-2023.jpg)
            const { category, year } = req.body;
            const extension = path.extname(file.originalname);
            filename = `${category}-${year}${extension}`;
        } else {
            // For documents: sanitized-title.extension
            const { title } = req.body;
            const sanitizedTitle = title.toLowerCase()
                .replace(/[^a-z0-9]/g, '-')
                .replace(/-+/g, '-')
                .replace(/^-|-$/g, '');
            const extension = path.extname(file.originalname);
            filename = `${sanitizedTitle}${extension}`;
        }
        cb(null, filename);
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

// Results API routes - return static file structure
app.get('/api/results', async (req, res) => {
    try {
        const resultsDir = 'public/assets/results';
        const files = fs.readdirSync(resultsDir);
        
        const results = files
            .filter(file => /\.(jpg|jpeg|png|gif|webp)$/i.test(file))
            .map(file => {
                // Parse filename: category-year.extension
                const nameWithoutExt = path.parse(file).name;
                const [category, year] = nameWithoutExt.split('-');
                
                return {
                    category,
                    year,
                    image_path: `/assets/results/${file}`,
                    filename: file
                };
            });
        
        res.json(results);
    } catch (error) {
        console.error('Error reading results directory:', error);
        res.json([]); // Return empty array if directory doesn't exist
    }
});

// Documents API routes - return static file structure
app.get('/api/documents', async (req, res) => {
    try {
        const documentsDir = 'public/assets/documents';
        const files = fs.readdirSync(documentsDir);
        
        const documents = files
            .filter(file => /\.pdf$/i.test(file))
            .map(file => {
                // Parse filename: sanitized-title.pdf
                const nameWithoutExt = path.parse(file).name;
                
                return {
                    title: nameWithoutExt.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
                    category: 'general', // Default category
                    file_path: `/assets/documents/${file}`,
                    filename: file
                };
            });
        
        res.json(documents);
    } catch (error) {
        console.error('Error reading documents directory:', error);
        res.json([]); // Return empty array if directory doesn't exist
    }
});

// Upload results endpoint
app.post('/api/results', upload.single('image'), async (req, res) => {
    try {
        const { category, year, description } = req.body;
        
        if (!req.file) {
            return res.status(400).json({ error: 'Image file is required' });
        }

        if (!category || !year) {
            return res.status(400).json({ error: 'Category and year are required' });
        }

        res.json({
            category,
            year,
            image_path: `/assets/results/${req.file.filename}`,
            description,
            message: 'Result saved successfully'
        });

    } catch (error) {
        console.error('Error uploading result:', error);
        res.status(500).json({ error: 'Upload error', details: error.message });
    }
});

// Upload documents endpoint
app.post('/api/documents', upload.single('file'), async (req, res) => {
    try {
        const { title, category, description } = req.body;
        
        if (!req.file) {
            return res.status(400).json({ error: 'PDF file is required' });
        }

        if (!title) {
            return res.status(400).json({ error: 'Title is required' });
        }

        res.json({
            title,
            category: category || 'general',
            file_path: `/assets/documents/${req.file.filename}`,
            description,
            message: 'Document saved successfully'
        });

    } catch (error) {
        console.error('Error uploading document:', error);
        res.status(500).json({ error: 'Upload error', details: error.message });
    }
});

// Delete results endpoint
app.delete('/api/results/:filename', async (req, res) => {
    try {
        const { filename } = req.params;
        const filePath = path.join('public/assets/results', filename);
        
        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
            res.json({ message: 'Result deleted successfully' });
        } else {
            res.status(404).json({ error: 'File not found' });
        }
    } catch (error) {
        console.error('Error deleting result:', error);
        res.status(500).json({ error: 'Delete error', details: error.message });
    }
});

// Delete documents endpoint
app.delete('/api/documents/:filename', async (req, res) => {
    try {
        const { filename } = req.params;
        const filePath = path.join('public/assets/documents', filename);
        
        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
            res.json({ message: 'Document deleted successfully' });
        } else {
            res.status(404).json({ error: 'File not found' });
        }
    } catch (error) {
        console.error('Error deleting document:', error);
        res.status(500).json({ error: 'Delete error', details: error.message });
    }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
    res.json({ 
        status: 'OK', 
        timestamp: new Date().toISOString(),
        version: '2.0.0',
        mode: 'static-files'
    });
});

// Start server
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log('Static file mode - no database required');
});
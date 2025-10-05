# OOK FAŽANA Web

Official website for OOK FAŽANA (Otvoreni odbojkaški klub Fažana) volleyball club.

## Features

- **Homepage** with hero section, about section, and categories
- **Contact page** with training schedule and banking information
- **Results pages** for each season with image galleries
- **Documents page** for PDF document management
- **Info pages** for coaches, management, and partners
- **CMS system** for content management
- **Responsive design** for all devices
- **API backend** with authentication

## Technology Stack

- **Frontend**: HTML5, CSS3, JavaScript (ES6+)
- **Backend**: Node.js, Express.js
- **Database**: SQLite
- **Authentication**: JWT tokens
- **File Upload**: Multer
- **Hosting**: Railway

## API Endpoints

### Authentication
- `POST /api/auth/login` - Admin login

### Results
- `GET /api/results` - Get all results
- `GET /api/results/:category/:year` - Get specific result
- `POST /api/results` - Upload new result (auth required)
- `PUT /api/results/:id` - Update result (auth required)
- `DELETE /api/results/:id` - Delete result (auth required)

### Documents
- `GET /api/documents` - Get all documents
- `GET /api/documents/:id` - Get specific document
- `POST /api/documents` - Upload new document (auth required)
- `PUT /api/documents/:id` - Update document (auth required)
- `DELETE /api/documents/:id` - Delete document (auth required)

### Health Check
- `GET /api/health` - Server health status

## File Structure

```
ook-fazana-web/
├── index.html              # Homepage
├── contact.html            # Contact page
├── treneri.html            # Coaches page
├── uprava.html             # Management page
├── prijatelji.html         # Partners page
├── dokumenti.html          # Documents page
├── cms.html               # CMS interface
├── rezultati-2024.html    # 2023/2024 results
├── rezultati-2023.html    # 2022/2023 results
├── rezultati-2022.html    # 2021/2022 results
├── styles.css             # Main stylesheet
├── script.js              # Main JavaScript
├── cms.js                 # CMS functionality
├── results.js             # Results functionality
├── documents.js           # Documents functionality
├── server.js              # Backend server
├── package.json           # Node.js dependencies
├── railway.json           # Railway configuration
├── nixpacks.toml          # Railway build config
├── assets/                # Static assets
│   ├── logo.webp         # Club logo
│   ├── 1.jpg             # Hero image 1
│   ├── 2.jpeg            # Hero image 2
│   └── 3.jpg             # Hero image 3
└── uploads/               # Uploaded files
    ├── results/          # Result images
    └── documents/        # PDF documents
```

## Deployment on Railway

### 1. Create Railway Project

1. Go to [Railway.app](https://railway.app)
2. Create a new project called "OOK Fazana Web"
3. Connect your GitHub repository

### 2. Environment Variables

Set these environment variables in Railway:

```bash
NODE_ENV=production
JWT_SECRET=your-secure-jwt-secret-key
ADMIN_PASSWORD=your-secure-admin-password
DATABASE_URL=./database.sqlite
```

### 3. Deploy

Railway will automatically deploy when you push to your repository.

### 4. Custom Domain (Optional)

1. Go to your Railway project settings
2. Add a custom domain
3. Update CORS settings in `server.js` if needed

## Local Development

### Prerequisites

- Node.js 18+ 
- npm

### Setup

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```

3. Create `.env` file:
   ```bash
   NODE_ENV=development
   JWT_SECRET=development-secret-key
   ADMIN_PASSWORD=ookfazana2024
   DATABASE_URL=./database.sqlite
   ```

4. Start the server:
   ```bash
   npm start
   ```

5. Open `http://localhost:3000` in your browser

## CMS Access

- **URL**: `/cms.html`
- **Default credentials**: `admin` / `ookfazana2024`
- **Change default password** in production!

## File Upload Limits

- **Images**: 10MB maximum
- **PDFs**: 10MB maximum
- **Supported formats**: JPG, PNG, GIF (images), PDF (documents)

## Security Features

- JWT authentication for admin access
- Rate limiting (100 requests per 15 minutes)
- File type validation
- CORS protection
- Helmet.js security headers
- Input validation

## Database Schema

### Results Table
```sql
CREATE TABLE results (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    category TEXT NOT NULL,
    year TEXT NOT NULL,
    image_path TEXT NOT NULL,
    description TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(category, year)
);
```

### Documents Table
```sql
CREATE TABLE documents (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    category TEXT NOT NULL,
    file_path TEXT NOT NULL,
    description TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

### Admin Users Table
```sql
CREATE TABLE admin_users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test locally
5. Submit a pull request

## License

MIT License - see LICENSE file for details

## Contact

- **Website**: [OOK FAŽANA](https://ookfazana.hr)
- **Email**: info@ookfazana.hr
- **Facebook**: [OOK FAŽANA](https://www.facebook.com/fazana.hr)
- **Instagram**: [@ook_fazana](https://www.instagram.com/ook_fazana/)

---

**OOK FAŽANA** - Otvoreni odbojkaški klub Fažana  
Put Sv. Elizeja 27, 52212 Fažana, Hrvatska
// CMS Management JavaScript
document.addEventListener('DOMContentLoaded', function() {
    initCMS();
});

// CMS Configuration
const CMS_CONFIG = {
    // API endpoints
    api: {
        results: '/api/results',
        documents: '/api/documents',
        auth: '/api/auth/login'
    }
};

// Get base URL for API calls
const getBaseURL = () => {
    return window.location.origin;
};

function initCMS() {
    // Check if user is already logged in
    if (isLoggedIn()) {
        showDashboard();
    } else {
        showLogin();
    }
    
    // Setup event listeners
    setupEventListeners();
    
    // Load initial data
    loadResults();
    loadDocuments();
}

function setupEventListeners() {
    // Login form
    document.getElementById('loginForm').addEventListener('submit', handleLogin);
    
    // Logout button
    document.getElementById('logoutBtn').addEventListener('click', handleLogout);
    
    // Tab navigation
    document.querySelectorAll('.nav-tab').forEach(tab => {
        tab.addEventListener('click', function() {
            switchTab(this.dataset.tab);
        });
    });
    
    // Results form
    document.getElementById('resultsForm').addEventListener('submit', handleResultsSubmit);
    
    // Documents form
    document.getElementById('documentsForm').addEventListener('submit', handleDocumentsSubmit);
}

// Authentication Functions
async function handleLogin(e) {
    e.preventDefault();
    
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    
    try {
        const response = await fetch(`${getBaseURL()}${CMS_CONFIG.api.auth}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ username, password })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            localStorage.setItem('cms_token', data.token);
            localStorage.setItem('cms_user', JSON.stringify(data.user));
            showDashboard();
            showMessage('Uspješno ste se prijavili!', 'success');
        } else {
            showMessage(data.error || 'Neispravno korisničko ime ili lozinka!', 'error', 'loginMessage');
        }
    } catch (error) {
        console.error('Login error:', error);
        showMessage('Greška pri prijavi!', 'error', 'loginMessage');
    }
}

function handleLogout() {
    localStorage.removeItem('cms_token');
    localStorage.removeItem('cms_user');
    showLogin();
    showMessage('Uspješno ste se odjavili!', 'success');
}

function isLoggedIn() {
    return localStorage.getItem('cms_token') !== null;
}

function getAuthHeaders() {
    const token = localStorage.getItem('cms_token');
    return {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
    };
}

function showLogin() {
    document.getElementById('loginSection').style.display = 'block';
    document.getElementById('cmsDashboard').classList.remove('active');
}

function showDashboard() {
    document.getElementById('loginSection').style.display = 'none';
    document.getElementById('cmsDashboard').classList.add('active');
}

// Tab Management
function switchTab(tabName) {
    // Update tab buttons
    document.querySelectorAll('.nav-tab').forEach(tab => {
        tab.classList.remove('active');
    });
    document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');
    
    // Update tab content
    document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.remove('active');
    });
    document.getElementById(`${tabName}Tab`).classList.add('active');
}

// Results Management
async function handleResultsSubmit(e) {
    e.preventDefault();
    
    const formData = new FormData();
    const category = document.getElementById('resultCategory').value;
    const year = document.getElementById('resultYear').value;
    const image = document.getElementById('resultImage').files[0];
    const description = document.getElementById('resultDescription').value;
    
    formData.append('category', category);
    formData.append('year', year);
    formData.append('image', image);
    formData.append('description', description);
    
    try {
        // In production, this would be a real API call
        await saveResults(formData);
        
        showMessage('Rezultati su uspješno spremljeni!', 'success');
        document.getElementById('resultsForm').reset();
        loadResults();
        
    } catch (error) {
        console.error('Error saving results:', error);
        showMessage('Greška pri spremanju rezultata!', 'error');
    }
}

async function saveResults(formData) {
    const response = await fetch(`${getBaseURL()}${CMS_CONFIG.api.results}`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${localStorage.getItem('cms_token')}`
        },
        body: formData
    });
    
    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to save results');
    }
    
    return response.json();
}

async function loadResults() {
    try {
        // In production, this would fetch from your backend
        const results = await fetchResults();
        renderResults(results);
    } catch (error) {
        console.error('Error loading results:', error);
        showMessage('Greška pri učitavanju rezultata!', 'error');
    }
}

async function fetchResults() {
    const response = await fetch(`${getBaseURL()}${CMS_CONFIG.api.results}`);
    
    if (!response.ok) {
        throw new Error('Failed to fetch results');
    }
    
    const results = await response.json();
    
    // Transform the data to include full image URLs
    return results.map(result => ({
        ...result,
        imageUrl: `${getBaseURL()}/${result.image_path}`
    }));
}

function renderResults(results) {
    const grid = document.getElementById('resultsGrid');
    grid.innerHTML = '';
    
    results.forEach(result => {
        const resultItem = document.createElement('div');
        resultItem.className = 'result-item';
        resultItem.innerHTML = `
            <img src="${result.imageUrl}" alt="${result.description}" class="result-image" onerror="this.src='data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzAwIiBoZWlnaHQ9IjIwMCIgdmlld0JveD0iMCAwIDMwMCAyMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIzMDAiIGhlaWdodD0iMjAwIiBmaWxsPSIjZjNmNGY2Ii8+Cjx0ZXh0IHg9IjE1MCIgeT0iMTAwIiBmb250LWZhbWlseT0iQXJpYWwsIHNhbnMtc2VyaWYiIGZvbnQtc2l6ZT0iMTQiIGZpbGw9IiM5Y2EzYWYiIHRleHQtYW5jaG9yPSJtaWRkbGUiPk5lbWEgc2xpa2U8L3RleHQ+Cjwvc3ZnPgo='">
            <div class="result-info">
                <h4>${getCategoryName(result.category)} - ${getSeasonYear(result.year)}</h4>
                <p>${result.description}</p>
            </div>
            <div class="result-actions">
                <button class="btn btn-edit" onclick="editResult(${result.id})">Uredi</button>
                <button class="btn btn-delete" onclick="deleteResult(${result.id})">Obriši</button>
            </div>
        `;
        grid.appendChild(resultItem);
    });
}

// Documents Management
async function handleDocumentsSubmit(e) {
    e.preventDefault();
    
    const formData = new FormData();
    const title = document.getElementById('documentTitle').value;
    const category = document.getElementById('documentCategory').value;
    const file = document.getElementById('documentFile').files[0];
    const description = document.getElementById('documentDescription').value;
    
    formData.append('title', title);
    formData.append('category', category);
    formData.append('file', file);
    formData.append('description', description);
    
    try {
        // In production, this would be a real API call
        await saveDocument(formData);
        
        showMessage('Dokument je uspješno dodan!', 'success');
        document.getElementById('documentsForm').reset();
        loadDocuments();
        
    } catch (error) {
        console.error('Error saving document:', error);
        showMessage('Greška pri dodavanju dokumenta!', 'error');
    }
}

async function saveDocument(formData) {
    const response = await fetch(`${getBaseURL()}${CMS_CONFIG.api.documents}`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${localStorage.getItem('cms_token')}`
        },
        body: formData
    });
    
    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to save document');
    }
    
    return response.json();
}

async function loadDocuments() {
    try {
        // In production, this would fetch from your backend
        const documents = await fetchDocuments();
        renderDocuments(documents);
    } catch (error) {
        console.error('Error loading documents:', error);
        showMessage('Greška pri učitavanju dokumenata!', 'error');
    }
}

async function fetchDocuments() {
    const response = await fetch(`${getBaseURL()}${CMS_CONFIG.api.documents}`);
    
    if (!response.ok) {
        throw new Error('Failed to fetch documents');
    }
    
    const documents = await response.json();
    
    // Transform the data to include full file URLs
    return documents.map(doc => ({
        ...doc,
        fileUrl: `${getBaseURL()}/${doc.file_path}`,
        uploadDate: doc.created_at
    }));
}

function renderDocuments(documents) {
    const list = document.getElementById('documentsList');
    list.innerHTML = '';
    
    documents.forEach(doc => {
        const docItem = document.createElement('div');
        docItem.className = 'document-item';
        docItem.innerHTML = `
            <div class="document-info">
                <h4>${doc.title}</h4>
                <div class="document-meta">
                    <strong>Kategorija:</strong> ${getCategoryName(doc.category)} | 
                    <strong>Datum:</strong> ${formatDate(doc.uploadDate)}
                </div>
                <p>${doc.description}</p>
            </div>
            <div class="document-actions">
                <button class="btn btn-edit" onclick="editDocument(${doc.id})">Uredi</button>
                <button class="btn btn-delete" onclick="deleteDocument(${doc.id})">Obriši</button>
            </div>
        `;
        list.appendChild(docItem);
    });
}

// Utility Functions
function getCategoryName(category) {
    const categories = {
        'mini-odbojka': 'Mini Odbojka',
        'djevojcice': 'Djevojčice',
        'mlade-kadetkinje': 'Mlađe Kadetkinje',
        'statut': 'Statut',
        'pravilnici': 'Pravilnici',
        'izvjestaji': 'Izvještaji',
        'ostalo': 'Ostalo'
    };
    return categories[category] || category;
}

function getSeasonYear(year) {
    const yearMap = {
        '2024': '2023/2024',
        '2023': '2022/2023',
        '2022': '2021/2022'
    };
    return yearMap[year] || `${parseInt(year) - 1}/${year}`;
}

function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('hr-HR');
}

function showMessage(message, type, containerId = 'cmsMessage') {
    const messageEl = document.getElementById(containerId);
    messageEl.textContent = message;
    messageEl.className = `message ${type} show`;
    
    // Hide message after 5 seconds
    setTimeout(() => {
        messageEl.classList.remove('show');
    }, 5000);
}

// CRUD Operations (for future backend integration)
async function editResult(id) {
    showMessage('Funkcija uređivanja će biti dostupna s backend integracijom', 'error');
    // In production, this would open an edit form with pre-filled data
}

async function deleteResult(id) {
    if (confirm('Jeste li sigurni da želite obrisati ove rezultate?')) {
        try {
            // In production, this would call DELETE API endpoint
            await deleteResultsFromAPI(id);
            showMessage('Rezultati su uspješno obrisani!', 'success');
            loadResults();
        } catch (error) {
            console.error('Error deleting results:', error);
            showMessage('Greška pri brisanju rezultata!', 'error');
        }
    }
}

async function editDocument(id) {
    showMessage('Funkcija uređivanja će biti dostupna s backend integracijom', 'error');
    // In production, this would open an edit form with pre-filled data
}

async function deleteDocument(id) {
    if (confirm('Jeste li sigurni da želite obrisati ovaj dokument?')) {
        try {
            // In production, this would call DELETE API endpoint
            await deleteDocumentFromAPI(id);
            showMessage('Dokument je uspješno obrisan!', 'success');
            loadDocuments();
        } catch (error) {
            console.error('Error deleting document:', error);
            showMessage('Greška pri brisanju dokumenta!', 'error');
        }
    }
}

// API functions for CRUD operations
async function deleteResultsFromAPI(id) {
    const response = await fetch(`${getBaseURL()}/api/results/${id}`, {
        method: 'DELETE',
        headers: {
            'Authorization': `Bearer ${localStorage.getItem('cms_token')}`
        }
    });
    
    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to delete results');
    }
    
    return response.json();
}

async function deleteDocumentFromAPI(id) {
    const response = await fetch(`${getBaseURL()}/api/documents/${id}`, {
        method: 'DELETE',
        headers: {
            'Authorization': `Bearer ${localStorage.getItem('cms_token')}`
        }
    });
    
    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to delete document');
    }
    
    return response.json();
}

// Export functions for global access
window.editResult = editResult;
window.deleteResult = deleteResult;
window.editDocument = editDocument;
window.deleteDocument = deleteDocument;

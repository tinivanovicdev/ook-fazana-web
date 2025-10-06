// Documents Management JavaScript
document.addEventListener('DOMContentLoaded', function() {
    initDocumentsPage();
});

function initDocumentsPage() {
    // Load documents from API/database
    loadDocuments();
    
    // Set up download functionality
    setupDownloadHandlers();
}

// Load documents from backend API
async function loadDocuments() {
    try {
        const response = await fetch('/api/documents');
        if (!response.ok) {
            throw new Error('Failed to fetch documents');
        }
        
        const documents = await response.json();
        
        // Transform documents into categorized format
        const categorizedDocuments = {};
        documents.forEach(doc => {
            if (!categorizedDocuments[doc.category]) {
                categorizedDocuments[doc.category] = [];
            }
            categorizedDocuments[doc.category].push({
                id: doc.id,
                title: doc.title,
                filename: doc.file_filename,
                date: formatDate(doc.created_at),
                category: doc.category,
                fileUrl: `/api/documents/${doc.id}/file`
            });
        });
        
        // Populate document categories
        populateDocumentCategories(categorizedDocuments);
        
    } catch (error) {
        console.error('Error loading documents:', error);
        // Fallback to static data if API fails
        const documents = getStaticDocuments();
        populateDocumentCategories(documents);
    }
}

// Static documents data - will be replaced with database
function getStaticDocuments() {
    return {
        'statut': [
            {
                id: 1,
                title: 'Statut kluba',
                filename: 'statut-kluba.pdf',
                date: '15.03.2024',
                category: 'statut'
            }
        ],
        'prijave': [
            {
                id: 2,
                title: 'Pristupnica za sezonu 2024/2025',
                filename: 'pristupnica-2024-2025.pdf',
                date: '01.09.2024',
                category: 'prijave'
            }
        ],
        'natjecanja': [
            {
                id: 3,
                title: 'Pravila natjecanja 2024/2025',
                filename: 'pravila-natjecanja-2024-2025.pdf',
                date: '20.08.2024',
                category: 'natjecanja'
            }
        ],
        'ostali': [
            {
                id: 4,
                title: 'Sigurnosni protokol',
                filename: 'sigurnosni-protokol.pdf',
                date: '10.09.2024',
                category: 'ostali'
            }
        ]
    };
}

// Populate document categories with data
function populateDocumentCategories(documents) {
    // Map category keys to HTML elements
    const categoryMapping = {
        'statut': 'statut-documents',
        'prijave': 'prijave-documents', 
        'natjecanja': 'natjecanja-documents',
        'ostali': 'ostali-documents',
        'general': 'ostali-documents' // Default category goes to "Ostali dokumenti"
    };
    
    // Clear all containers first
    Object.values(categoryMapping).forEach(elementId => {
        const element = document.getElementById(elementId);
        if (element) {
            element.innerHTML = '';
        }
    });
    
    // Populate each category
    Object.keys(documents).forEach(categoryKey => {
        const categoryId = categoryMapping[categoryKey] || categoryMapping['general'];
        const container = document.getElementById(categoryId);
        
        if (container && documents[categoryKey]) {
            // Add documents from database
            documents[categoryKey].forEach(doc => {
                const documentElement = createDocumentElement(doc);
                container.appendChild(documentElement);
            });
        }
    });
}

// Create document element
function createDocumentElement(document) {
    const div = document.createElement('div');
    div.className = 'document-item';
    div.innerHTML = `
        <div class="document-icon">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                <polyline points="14,2 14,8 20,8"></polyline>
                <line x1="16" y1="13" x2="8" y2="13"></line>
                <line x1="16" y1="17" x2="8" y2="17"></line>
                <polyline points="10,9 9,9 8,9"></polyline>
            </svg>
        </div>
        <div class="document-info">
            <h4>${document.title}</h4>
            <p class="document-date">Datum: ${formatDate(document.date)}</p>
        </div>
        <div class="document-actions">
            <a href="${document.fileUrl}" class="download-btn" data-filename="${document.filename}" data-id="${document.id}" download>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                    <polyline points="7,10 12,15 17,10"></polyline>
                    <line x1="12" y1="15" x2="12" y2="3"></line>
                </svg>
                Preuzmi
            </a>
        </div>
    `;
    return div;
}

// Setup download handlers
function setupDownloadHandlers() {
    document.addEventListener('click', function(e) {
        if (e.target.closest('.download-btn')) {
            e.preventDefault();
            const btn = e.target.closest('.download-btn');
            const filename = btn.getAttribute('data-filename');
            const docId = btn.getAttribute('data-id');
            
            downloadDocument(docId, filename);
        }
    });
}

// Download document function
async function downloadDocument(docId, filename) {
    try {
        // Show loading state
        showDownloadLoading(docId);
        
        // In production, this will call the backend API
        // const response = await fetch(`/api/documents/${docId}/download`);
        // const blob = await response.blob();
        
        // For now, simulate download with static file
        simulateDownload(filename);
        
        // Hide loading state
        hideDownloadLoading(docId);
        
        // Show success message
        showSuccessMessage(`Dokument "${filename}" je uspješno preuzet`);
        
    } catch (error) {
        console.error('Download error:', error);
        hideDownloadLoading(docId);
        showErrorMessage('Greška pri preuzimanju dokumenta');
    }
}

// Simulate download (replace with actual API call)
function simulateDownload(filename) {
    // Create a temporary link and trigger download
    const link = document.createElement('a');
    link.href = `#`; // Will be replaced with actual file URL from database
    link.download = filename;
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

// Show download loading state
function showDownloadLoading(docId) {
    const btn = document.querySelector(`[data-id="${docId}"]`);
    if (btn) {
        btn.innerHTML = `
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="animate-spin">
                <path d="M21 12a9 9 0 11-6.219-8.56"></path>
            </svg>
            Preuzimanje...
        `;
        btn.style.pointerEvents = 'none';
    }
}

// Hide download loading state
function hideDownloadLoading(docId) {
    const btn = document.querySelector(`[data-id="${docId}"]`);
    if (btn) {
        btn.innerHTML = `
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                <polyline points="7,10 12,15 17,10"></polyline>
                <line x1="12" y1="15" x2="12" y2="3"></line>
            </svg>
            Preuzmi
        `;
        btn.style.pointerEvents = 'auto';
    }
}

// Format date for display
function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('hr-HR');
}

// Show success message
function showSuccessMessage(message) {
    showMessage(message, 'success');
}

// Show error message
function showErrorMessage(message) {
    showMessage(message, 'error');
}

// Show message (success/error)
function showMessage(message, type) {
    // Create message element
    const messageEl = document.createElement('div');
    messageEl.className = `message message-${type}`;
    messageEl.textContent = message;
    
    // Style the message
    messageEl.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 1rem 1.5rem;
        border-radius: 6px;
        color: white;
        font-weight: 500;
        z-index: 10000;
        animation: slideIn 0.3s ease;
        ${type === 'success' ? 'background-color: #10b981;' : 'background-color: #ef4444;'}
    `;
    
    // Add animation styles
    const style = document.createElement('style');
    style.textContent = `
        @keyframes slideIn {
            from { transform: translateX(100%); opacity: 0; }
            to { transform: translateX(0); opacity: 1; }
        }
    `;
    document.head.appendChild(style);
    
    // Add to page
    document.body.appendChild(messageEl);
    
    // Remove after 3 seconds
    setTimeout(() => {
        messageEl.remove();
        style.remove();
    }, 3000);
}

// CMS Integration Functions (for future use)
window.DocumentsCMS = {
    // Add new document
    addDocument: async function(documentData) {
        try {
            const response = await fetch('/api/documents', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(documentData)
            });
            
            if (response.ok) {
                showSuccessMessage('Dokument je uspješno dodan');
                loadDocuments(); // Reload documents
            } else {
                throw new Error('Failed to add document');
            }
        } catch (error) {
            console.error('Error adding document:', error);
            showErrorMessage('Greška pri dodavanju dokumenta');
        }
    },
    
    // Update document
    updateDocument: async function(docId, documentData) {
        try {
            const response = await fetch(`/api/documents/${docId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(documentData)
            });
            
            if (response.ok) {
                showSuccessMessage('Dokument je uspješno ažuriran');
                loadDocuments(); // Reload documents
            } else {
                throw new Error('Failed to update document');
            }
        } catch (error) {
            console.error('Error updating document:', error);
            showErrorMessage('Greška pri ažuriranju dokumenta');
        }
    },
    
    // Delete document
    deleteDocument: async function(docId) {
        try {
            const response = await fetch(`/api/documents/${docId}`, {
                method: 'DELETE'
            });
            
            if (response.ok) {
                showSuccessMessage('Dokument je uspješno obrisan');
                loadDocuments(); // Reload documents
            } else {
                throw new Error('Failed to delete document');
            }
        } catch (error) {
            console.error('Error deleting document:', error);
            showErrorMessage('Greška pri brisanju dokumenta');
        }
    }
};

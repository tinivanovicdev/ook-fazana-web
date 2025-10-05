// Results Management JavaScript
document.addEventListener('DOMContentLoaded', function() {
    initResultsPage();
});

function initResultsPage() {
    // Load results images from API/database
    loadResultsImages();
    
    // Set up modal functionality
    setupModalHandlers();
    
    // Set up keyboard navigation for modal
    setupKeyboardNavigation();
    
    // Set up click handlers for view buttons
    setupViewButtonHandlers();
}

// Load results images from backend API
async function loadResultsImages() {
    try {
        console.log('Loading results images from API...');
        const response = await fetch('/api/results');
        if (!response.ok) {
            throw new Error('Failed to fetch results');
        }
        
        const results = await response.json();
        console.log('API results:', results);
        
        // Transform results into the format expected by populateResultImages
        const formattedResults = {};
        
        // Start with placeholder data for all categories
        const staticResults = getStaticResults();
        Object.assign(formattedResults, staticResults);
        
        // Override with API data if available
        if (results && results.length > 0) {
            results.forEach(result => {
                // Use the new API endpoint to serve images from database
                const imageUrl = `/api/results/${result.id}/image`;
                formattedResults[result.category] = {
                    title: getCategoryName(result.category),
                    image: imageUrl,
                    description: result.description,
                    year: result.year,
                    id: result.id // Store ID for modal functionality
                };
            });
        }
        
        // Populate result images
        populateResultImages(formattedResults);
        
    } catch (error) {
        console.error('Error loading results:', error);
        // Fallback to static data if API fails
        const results = getStaticResults();
        populateResultImages(results);
    }
}

// Static results data - will be replaced with database
function getStaticResults() {
    // Get current year from URL or default to 2024
    const currentYear = getCurrentYearFromURL();
    
    // Use placeholder SVG for missing results
    const placeholderImage = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAwIiBoZWlnaHQ9IjI1MCIgdmlld0JveD0iMCAwIDQwMCAyNTAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSI0MDAiIGhlaWdodD0iMjUwIiBmaWxsPSIjZjNmNGY2Ii8+Cjx0ZXh0IHg9IjIwMCIgeT0iMTI1IiBmb250LWZhbWlseT0iQXJpYWwsIHNhbnMtc2VyaWYiIGZvbnQtc2l6ZT0iMTYiIGZpbGw9IiM5Y2EzYWYiIHRleHQtYW5jaG9yPSJtaWRkbGUiPk5lbWEgcmV6dWx0YXRhPC90ZXh0Pgo8L3N2Zz4K';
    
    return {
        'mini-odbojka': {
            title: 'Mini Odbojka',
            image: placeholderImage,
            description: `Rezultati Mini Odbojke za sezonu ${getSeasonYear(currentYear)}`,
            year: currentYear
        },
        'djevojcice': {
            title: 'Djevojčice',
            image: placeholderImage,
            description: `Rezultati Djevojčica za sezonu ${getSeasonYear(currentYear)}`,
            year: currentYear
        },
        'mlade-kadetkinje': {
            title: 'Mlađe Kadetkinje',
            image: placeholderImage,
            description: `Rezultati Mlađih Kadetkinja za sezonu ${getSeasonYear(currentYear)}`,
            year: currentYear
        }
    };
}

// Get current year from URL
function getCurrentYearFromURL() {
    const path = window.location.pathname;
    if (path.includes('2022')) {
        return '2022';
    } else if (path.includes('2023')) {
        return '2023';
    }
    return '2024'; // default
}

// Get season year format
function getSeasonYear(year) {
    const yearMap = {
        '2024': '2023/2024',
        '2023': '2022/2023',
        '2022': '2021/2022'
    };
    
    return yearMap[year] || `${parseInt(year) - 1}/${year}`;
}

// Get category display name
function getCategoryName(category) {
    const categories = {
        'mini-odbojka': 'Mini Odbojka',
        'djevojcice': 'Djevojčice',
        'mlade-kadetkinje': 'Mlađe Kadetkinje'
    };
    return categories[category] || category;
}

// Populate result images with data
function populateResultImages(results) {
    console.log('Populating result images:', results);
    Object.keys(results).forEach(categoryKey => {
        const imageElement = document.querySelector(`[data-category="${categoryKey}"]`);
        const result = results[categoryKey];
        
        console.log(`Setting image for ${categoryKey}:`, result.image);
        
        if (imageElement) {
            // Update image source
            imageElement.src = result.image;
            imageElement.alt = result.description;
            
            // Add error handling for missing images
            imageElement.onerror = function() {
                this.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAwIiBoZWlnaHQ9IjI1MCIgdmlld0JveD0iMCAwIDQwMCAyNTAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSI0MDAiIGhlaWdodD0iMjUwIiBmaWxsPSIjZjNmNGY2Ii8+Cjx0ZXh0IHg9IjIwMCIgeT0iMTI1IiBmb250LWZhbWlseT0iQXJpYWwsIHNhbnMtc2VyaWYiIGZvbnQtc2l6ZT0iMTYiIGZpbGw9IiM5Y2EzYWYiIHRleHQtYW5jaG9yPSJtaWRkbGUiPk5lbWEgcmV6dWx0YXRhPC90ZXh0Pgo8L3N2Zz4K';
                this.alt = 'Nema rezultata';
            };
        }
    });
}

// Setup modal handlers
function setupModalHandlers() {
    const modal = document.getElementById('imageModal');
    const closeBtn = document.querySelector('.close');
    
    // Close modal when clicking outside
    window.addEventListener('click', function(event) {
        if (event.target === modal) {
            closeModal();
        }
    });
    
    // Close modal with close button
    if (closeBtn) {
        closeBtn.addEventListener('click', closeModal);
    }
}

// Setup keyboard navigation
function setupKeyboardNavigation() {
    document.addEventListener('keydown', function(event) {
        const modal = document.getElementById('imageModal');
        
        if (modal && modal.style.display === 'block') {
            if (event.key === 'Escape') {
                closeModal();
            }
        }
    });
}

// Setup view button click handlers
function setupViewButtonHandlers() {
    // Use event delegation to handle dynamically created buttons
    document.addEventListener('click', function(event) {
        if (event.target.closest('.view-btn')) {
            const button = event.target.closest('.view-btn');
            const imageElement = button.closest('.result-category').querySelector('.result-image');
            const category = imageElement.dataset.category;
            const year = imageElement.dataset.year;
            
            if (category && year) {
                viewImage(category, year);
            }
        }
    });
}

// View image in modal
async function viewImage(category, year) {
    try {
        // Get the image element to use its current data
        const imageElement = document.querySelector(`[data-category="${category}"]`);
        if (!imageElement) {
            throw new Error('Image element not found');
        }
        
        const result = {
            title: getCategoryName(category),
            image: imageElement.src,
            description: imageElement.alt
        };
        
        console.log('Opening modal with result:', result);
        
        // Show modal
        const modal = document.getElementById('imageModal');
        const modalImage = document.getElementById('modalImage');
        const modalTitle = document.getElementById('modalTitle');
        const modalDescription = document.getElementById('modalDescription');
        
        if (modal && modalImage && modalTitle && modalDescription) {
            modalImage.src = result.image;
            modalImage.alt = result.description;
            modalTitle.textContent = result.title;
            modalDescription.textContent = result.description;
            
            modal.style.display = 'block';
            document.body.style.overflow = 'hidden'; // Prevent background scrolling
        }
        
    } catch (error) {
        console.error('Error viewing image:', error);
        showErrorMessage('Greška pri prikazivanju slike');
    }
}

// Close modal
function closeModal() {
    const modal = document.getElementById('imageModal');
    if (modal) {
        modal.style.display = 'none';
        document.body.style.overflow = 'auto'; // Restore scrolling
    }
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
window.ResultsCMS = {
    // Add new result image
    addResult: async function(resultData) {
        try {
            const response = await fetch('/api/results', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(resultData)
            });
            
            if (response.ok) {
                showSuccessMessage('Rezultat je uspješno dodan');
                loadResultsImages(); // Reload results
            } else {
                throw new Error('Failed to add result');
            }
        } catch (error) {
            console.error('Error adding result:', error);
            showErrorMessage('Greška pri dodavanju rezultata');
        }
    },
    
    // Update result image
    updateResult: async function(category, year, resultData) {
        try {
            const response = await fetch(`/api/results/${category}/${year}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(resultData)
            });
            
            if (response.ok) {
                showSuccessMessage('Rezultat je uspješno ažuriran');
                loadResultsImages(); // Reload results
            } else {
                throw new Error('Failed to update result');
            }
        } catch (error) {
            console.error('Error updating result:', error);
            showErrorMessage('Greška pri ažuriranju rezultata');
        }
    },
    
    // Delete result image
    deleteResult: async function(category, year) {
        try {
            const response = await fetch(`/api/results/${category}/${year}`, {
                method: 'DELETE'
            });
            
            if (response.ok) {
                showSuccessMessage('Rezultat je uspješno obrisan');
                loadResultsImages(); // Reload results
            } else {
                throw new Error('Failed to delete result');
            }
        } catch (error) {
            console.error('Error deleting result:', error);
            showErrorMessage('Greška pri brisanju rezultata');
        }
    }
};

// Global functions for onclick handlers
window.viewImage = viewImage;
window.closeModal = closeModal;

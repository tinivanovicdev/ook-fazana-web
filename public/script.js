// DOM Content Loaded
document.addEventListener('DOMContentLoaded', function() {
    // Initialize all functionality
    initMobileMenu();
    initDesktopDropdowns();
    initMobileDropdowns();
    initActiveNavigation();
    initImageCarousel();
});

// Mobile Menu Functionality
function initMobileMenu() {
    const mobileMenuBtn = document.querySelector('.mobile-menu-btn');
    const mobileNav = document.querySelector('.mobile-nav');

    if (mobileMenuBtn && mobileNav) {
        mobileMenuBtn.addEventListener('click', function() {
            // Toggle mobile menu
            mobileNav.classList.toggle('active');
            mobileMenuBtn.classList.toggle('active');

            // Close all dropdowns when menu closes
            if (!mobileNav.classList.contains('active')) {
                closeAllMobileDropdowns();
            }
        });

        // Close mobile menu when clicking outside
        document.addEventListener('click', function(event) {
            if (!mobileMenuBtn.contains(event.target) && !mobileNav.contains(event.target)) {
                mobileNav.classList.remove('active');
                mobileMenuBtn.classList.remove('active');
                closeAllMobileDropdowns();
            }
        });

        // Close mobile menu when window is resized to desktop
        window.addEventListener('resize', function() {
            if (window.innerWidth > 768) {
                mobileNav.classList.remove('active');
                mobileMenuBtn.classList.remove('active');
                closeAllMobileDropdowns();
            }
        });
    }
}

// Desktop Dropdown Functionality
function initDesktopDropdowns() {
    const dropdowns = document.querySelectorAll('.dropdown');

    dropdowns.forEach(dropdown => {
        const dropdownTrigger = dropdown.querySelector('.nav-link');
        const dropdownMenu = dropdown.querySelector('.dropdown-menu');

        if (dropdownTrigger && dropdownMenu) {
            dropdownTrigger.addEventListener('click', function(e) {
                e.preventDefault();
                
                // Close other dropdowns
                closeAllDesktopDropdowns();
                
                // Toggle current dropdown
                dropdown.classList.toggle('open');
            });
        }
    });

    // Close dropdowns when clicking outside
    document.addEventListener('click', function(event) {
        if (!event.target.closest('.dropdown')) {
            closeAllDesktopDropdowns();
        }
    });

    // Close dropdowns when pressing Escape
    document.addEventListener('keydown', function(event) {
        if (event.key === 'Escape') {
            closeAllDesktopDropdowns();
        }
    });
}

// Mobile Dropdown Functionality
function initMobileDropdowns() {
    const mobileDropdowns = document.querySelectorAll('.mobile-nav-item.dropdown');

    mobileDropdowns.forEach(dropdown => {
        const dropdownTrigger = dropdown.querySelector('.mobile-nav-link');
        const dropdownMenu = dropdown.querySelector('.mobile-dropdown-menu');

        if (dropdownTrigger && dropdownMenu) {
            dropdownTrigger.addEventListener('click', function(e) {
                e.preventDefault();
                
                // Close other mobile dropdowns
                closeAllMobileDropdowns();
                
                // Toggle current dropdown
                dropdown.classList.toggle('open');
            });
        }
    });
}

// Close all desktop dropdowns
function closeAllDesktopDropdowns() {
    const dropdowns = document.querySelectorAll('.dropdown');
    dropdowns.forEach(dropdown => {
        dropdown.classList.remove('open');
    });
}

// Close all mobile dropdowns
function closeAllMobileDropdowns() {
    const mobileDropdowns = document.querySelectorAll('.mobile-nav-item.dropdown');
    mobileDropdowns.forEach(dropdown => {
        dropdown.classList.remove('open');
    });
}

// Active Navigation Functionality
function initActiveNavigation() {
    const navLinks = document.querySelectorAll('.nav-link, .mobile-nav-link');
    
    // Get current page URL
    const currentPage = window.location.pathname.split('/').pop() || 'index.html';
    
    // Remove active class from all links first
    navLinks.forEach(link => link.classList.remove('active'));
    
    // Set active class based on current page
    navLinks.forEach(link => {
        const href = link.getAttribute('href');
        
        // Check if this link matches the current page
        if (href === currentPage || 
            (currentPage === 'index.html' && href === 'index.html') ||
            (currentPage === 'contact.html' && href === 'contact.html') ||
            (currentPage === 'dokumenti.html' && href === 'dokumenti.html') ||
            (currentPage === 'treneri.html' && href === 'treneri.html') ||
            (currentPage === 'uprava.html' && href === 'uprava.html') ||
            (currentPage === 'prijatelji.html' && href === 'prijatelji.html') ||
            (currentPage === 'rezultati-2024.html' && href === 'rezultati-2024.html') ||
            (currentPage === 'rezultati-2023.html' && href === 'rezultati-2023.html') ||
            (currentPage === 'rezultati-2022.html' && href === 'rezultati-2022.html') ||
            // Special case: Rezultati dropdown should be active when on any results page
            ((currentPage === 'rezultati-2024.html' || currentPage === 'rezultati-2023.html' || currentPage === 'rezultati-2022.html') && 
             (link.getAttribute('data-dropdown') === 'rezultati' || link.getAttribute('data-mobile-dropdown') === 'rezultati'))) {
            link.classList.add('active');
        }
        
        // Add click handler for active state management
        link.addEventListener('click', function(e) {
            // Only prevent default for placeholder links (href="#")
            if (this.getAttribute('href') === '#') {
                e.preventDefault();
            }
            
            // Remove active from all links
            navLinks.forEach(l => l.classList.remove('active'));
            
            // Add active to clicked link
            this.classList.add('active');
        });
    });
}

// Static year options for Rezultati dropdown
function generateYearOptions() {
    return ['2024/25', '2023/24', '2022/23'];
}

// Function to update year options (can be called when needed)
function updateYearOptions() {
    const rezultatiDropdowns = document.querySelectorAll('.dropdown-menu');
    
    rezultatiDropdowns.forEach(dropdown => {
        const parentNavItem = dropdown.closest('.nav-item, .mobile-nav-item');
        const navLink = parentNavItem?.querySelector('.nav-link, .mobile-nav-link');
        
        if (navLink && navLink.textContent.includes('Rezultati')) {
            const yearOptions = generateYearOptions();
            dropdown.innerHTML = '';
            
            yearOptions.forEach(year => {
                const li = document.createElement('li');
                const a = document.createElement('a');
                
                // Map year display to actual file names
                let href;
                if (year === '2024/25') {
                    href = 'rezultati-2024.html';
                } else if (year === '2023/24') {
                    href = 'rezultati-2023.html';
                } else if (year === '2022/23') {
                    href = 'rezultati-2022.html';
                }
                
                a.href = href;
                a.textContent = year;
                a.className = 'dropdown-link';
                li.appendChild(a);
                dropdown.appendChild(li);
            });
        }
    });
}

// Year options are now static in HTML, no need to generate dynamically

// Smooth scrolling for anchor links
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        e.preventDefault();
        const target = document.querySelector(this.getAttribute('href'));
        if (target) {
            target.scrollIntoView({
                behavior: 'smooth',
                block: 'start'
            });
        }
    });
});

// Handle keyboard navigation
document.addEventListener('keydown', function(event) {
    // Tab navigation support
    if (event.key === 'Tab') {
        // Ensure focus is visible
        document.body.classList.add('keyboard-navigation');
    }
});

document.addEventListener('mousedown', function() {
    // Remove keyboard navigation class when using mouse
    document.body.classList.remove('keyboard-navigation');
});

// Add loading state management
function showLoading() {
    document.body.classList.add('loading');
}

function hideLoading() {
    document.body.classList.remove('loading');
}

// Image Carousel Functionality
function initImageCarousel() {
    const indicators = document.querySelectorAll('.indicator');
    const teamImage = document.querySelector('.team-image');
    
    // Team photos for carousel
    const carouselImages = [
        'assets/1.jpg',
        'assets/2.jpeg',
        'assets/3.jpg'
    ];
    
    let currentImageIndex = 0;
    
    indicators.forEach((indicator, index) => {
        indicator.addEventListener('click', function() {
            // Update active indicator
            indicators.forEach(ind => ind.classList.remove('active'));
            this.classList.add('active');
            
            // Update image
            currentImageIndex = index;
            if (teamImage) {
                teamImage.src = carouselImages[index];
            }
        });
    });
    
    // Auto-advance carousel every 5 seconds
    setInterval(() => {
        if (indicators.length > 0) {
            currentImageIndex = (currentImageIndex + 1) % indicators.length;
            indicators.forEach(ind => ind.classList.remove('active'));
            if (indicators[currentImageIndex]) {
                indicators[currentImageIndex].classList.add('active');
            }
            if (teamImage && carouselImages[currentImageIndex]) {
                teamImage.src = carouselImages[currentImageIndex];
            }
        }
    }, 5000);
}

// Export functions for potential use in other scripts
window.OOKFazanaNavigation = {
    closeAllDesktopDropdowns,
    closeAllMobileDropdowns,
    updateYearOptions,
    showLoading,
    hideLoading,
    initImageCarousel
};

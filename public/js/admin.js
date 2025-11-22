// Wait for DOM to be ready
console.log('📊 Admin.js script loaded');
document.addEventListener('DOMContentLoaded', initializeAdmin);

// Global state for artworks management
let allArtworks = [];
let filteredArtworks = [];
let currentView = 'grid'; // 'grid' or 'table'
let currentPage = 1;
const itemsPerPage = 16;

// Check authentication on load
async function initializeAdmin() {
    const token = localStorage.getItem('authToken');
    if (!token) {
        window.location.href = '/admin/login.html';
        return;
    }

    try {
        const response = await fetch('/api/auth/verify', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (!response.ok) {
            throw new Error('Invalid token');
        }

        // Load initial data
        loadDashboard();
        setupEventListeners();
    } catch (error) {
        localStorage.removeItem('authToken');
        localStorage.removeItem('user');
        window.location.href = '/admin/login.html';
    }
}

// Setup all event listeners
function setupEventListeners() {

    // Navigation
    document.querySelectorAll('.nav-menu a').forEach(link => {
    link.addEventListener('click', (e) => {
        e.preventDefault();
        const page = link.dataset.page;

        // Update active link
        document.querySelectorAll('.nav-menu a').forEach(l => l.classList.remove('active'));
        link.classList.add('active');

        // Hide all pages
        document.querySelectorAll('[id$="-page"]').forEach(p => p.style.display = 'none');

        // Show selected page
        document.getElementById(`${page}-page`).style.display = 'block';

        // Load page data
        switch (page) {
            case 'overview':
                loadDashboard();
                break;
            case 'artworks':
                loadArtworks();
                break;
            case 'content':
                loadContent();
                break;
            case 'pricelist':
                loadPriceList();
                break;
        }
    });
    });

    // Mobile Sidebar Toggle
    const mobileSidebarToggle = document.querySelector('.mobile-sidebar-toggle');
    const sidebar = document.querySelector('.sidebar');
    const sidebarOverlay = document.querySelector('.sidebar-overlay');

    if (mobileSidebarToggle) {
        mobileSidebarToggle.addEventListener('click', () => {
            mobileSidebarToggle.classList.toggle('active');
            sidebar.classList.toggle('active');
            sidebarOverlay.classList.toggle('active');
        });

        // Close sidebar when clicking overlay
        sidebarOverlay.addEventListener('click', () => {
            mobileSidebarToggle.classList.remove('active');
            sidebar.classList.remove('active');
            sidebarOverlay.classList.remove('active');
        });

        // Close sidebar when clicking nav link on mobile
        document.querySelectorAll('.nav-menu a').forEach(link => {
            link.addEventListener('click', () => {
                if (window.innerWidth <= 768) {
                    mobileSidebarToggle.classList.remove('active');
                    sidebar.classList.remove('active');
                    sidebarOverlay.classList.remove('active');
                }
            });
        });
    }

    // Logout Button
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', function() {
            console.log('Logout button clicked');
            try {
                localStorage.removeItem('authToken');
                localStorage.removeItem('token');
                localStorage.removeItem('user');
                console.log('Auth tokens cleared, redirecting to login...');
                window.location.href = '/admin/login.html';
            } catch (error) {
                console.error('Error during logout:', error);
                // Force redirect even if localStorage fails
                window.location.href = '/admin/login.html';
            }
        });
    } else {
        console.warn('Logout button not found in DOM');
    }

    // Handle Artwork Form Submission
    const artworkForm = document.getElementById('artwork-form');
    if (artworkForm) {
        artworkForm.addEventListener('submit', handleArtworkSubmit);
    }

    // Handle Hero Form Submission
    const heroForm = document.getElementById('hero-form');
    if (heroForm) {
        heroForm.addEventListener('submit', handleHeroSubmit);
    }

    // Handle About Form Submission
    const aboutForm = document.getElementById('about-form');
    if (aboutForm) {
        aboutForm.addEventListener('submit', handleAboutSubmit);
    }

    // Click outside modal to close
    window.addEventListener('click', (e) => {
        if (e.target.id === 'artwork-modal') {
            closeModal();
        }
    });

    // Search and filter event listeners
    const searchInput = document.getElementById('artwork-search');
    const categoryFilter = document.getElementById('category-filter');
    const availabilityFilter = document.getElementById('availability-filter');

    if (searchInput) {
        searchInput.addEventListener('input', handleSearchFilter);
    }
    if (categoryFilter) {
        categoryFilter.addEventListener('change', handleSearchFilter);
    }
    if (availabilityFilter) {
        availabilityFilter.addEventListener('change', handleSearchFilter);
    }

    // Event delegation for dynamic elements
    document.body.addEventListener('click', (e) => {
        const target = e.target;
        const action = target.dataset.action;

        if (!action) return;

        switch (action) {
            case 'open-lightbox':
                e.preventDefault();
                window.openLightbox(target.dataset.image);
                break;
            case 'toggle-featured':
                e.preventDefault();
                window.toggleFeatured(parseInt(target.dataset.id), target.dataset.featured === '1');
                break;
            case 'edit-artwork':
                e.preventDefault();
                window.editArtwork(parseInt(target.dataset.id));
                break;
            case 'delete-artwork':
                e.preventDefault();
                window.deleteArtwork(parseInt(target.dataset.id));
                break;
            case 'change-page':
                e.preventDefault();
                if (!target.disabled) {
                    window.changePage(parseInt(target.dataset.page));
                }
                break;
            case 'switch-view':
                e.preventDefault();
                window.switchView(target.dataset.view);
                break;
            case 'add-artwork':
                e.preventDefault();
                window.showAddArtwork();
                break;
            case 'close-modal':
                e.preventDefault();
                window.closeModal();
                break;
            case 'close-lightbox':
                e.preventDefault();
                window.closeLightbox();
                break;
        }
    });

    // Setup Drag & Drop functionality
    setupDropzone();
}

// Setup Drag & Drop Upload Zone
function setupDropzone() {
    const dropzone = document.getElementById('dropzone');
    const fileInput = document.getElementById('image-upload');
    const previewContainer = document.getElementById('image-preview-container');
    const removeBtn = document.getElementById('remove-image-btn');

    if (!dropzone || !fileInput) return;

    // Prevent default drag behaviors
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
        dropzone.addEventListener(eventName, preventDefaults, false);
        document.body.addEventListener(eventName, preventDefaults, false);
    });

    function preventDefaults(e) {
        e.preventDefault();
        e.stopPropagation();
    }

    // Highlight drop zone when item is dragged over it
    ['dragenter', 'dragover'].forEach(eventName => {
        dropzone.addEventListener(eventName, () => {
            dropzone.classList.add('dragover');
        }, false);
    });

    ['dragleave', 'drop'].forEach(eventName => {
        dropzone.addEventListener(eventName, () => {
            dropzone.classList.remove('dragover');
        }, false);
    });

    // Handle dropped files
    dropzone.addEventListener('drop', (e) => {
        const files = e.dataTransfer.files;
        if (files.length > 0) {
            handleImageFile(files[0]);
        }
    }, false);

    // Handle file input change
    fileInput.addEventListener('change', (e) => {
        if (e.target.files.length > 0) {
            handleImageFile(e.target.files[0]);
        }
    });

    // Handle remove button
    if (removeBtn) {
        removeBtn.addEventListener('click', () => {
            clearImagePreview();
        });
    }
}

// Handle image file selection
function handleImageFile(file) {
    const previewContainer = document.getElementById('image-preview-container');
    const preview = document.getElementById('image-preview');
    const filename = document.getElementById('image-filename');
    const sizeEl = document.getElementById('image-size');
    const dropzone = document.getElementById('dropzone');
    const fileInput = document.getElementById('image-upload');

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
        alert('Please select an image file (JPEG, PNG, GIF, or WebP)');
        return;
    }

    // Validate file size (10MB max)
    const maxSize = 10 * 1024 * 1024;
    if (file.size > maxSize) {
        alert('Image size must be less than 10MB');
        return;
    }

    // Create a new FileList with the dropped file
    const dataTransfer = new DataTransfer();
    dataTransfer.items.add(file);
    fileInput.files = dataTransfer.files;

    // Preview the image
    const reader = new FileReader();
    reader.onload = function(e) {
        preview.src = e.target.result;
        filename.textContent = file.name;

        // Format file size
        const sizeKB = file.size / 1024;
        const sizeMB = sizeKB / 1024;
        sizeEl.textContent = sizeMB >= 1
            ? `${sizeMB.toFixed(1)} MB`
            : `${sizeKB.toFixed(1)} KB`;

        // Hide dropzone, show preview
        dropzone.style.display = 'none';
        previewContainer.style.display = 'block';
    };
    reader.readAsDataURL(file);
}

// Clear image preview
function clearImagePreview() {
    const previewContainer = document.getElementById('image-preview-container');
    const preview = document.getElementById('image-preview');
    const dropzone = document.getElementById('dropzone');
    const fileInput = document.getElementById('image-upload');
    const optimizationInfo = document.getElementById('optimization-info');

    if (preview) preview.src = '';
    if (fileInput) fileInput.value = '';
    if (previewContainer) previewContainer.style.display = 'none';
    if (dropzone) dropzone.style.display = 'block';
    if (optimizationInfo) optimizationInfo.style.display = 'none';
}

// Show upload progress
function showUploadProgress(show = true) {
    const progressContainer = document.getElementById('upload-progress');
    if (progressContainer) {
        if (show) {
            progressContainer.classList.add('active');
        } else {
            progressContainer.classList.remove('active');
        }
    }
}

// Update upload progress
function updateUploadProgress(percent, status = 'Uploading...') {
    const progressBar = document.getElementById('progress-bar');
    const progressPercent = document.getElementById('progress-percent');
    const progressStatus = document.getElementById('progress-status');

    if (progressBar) progressBar.style.width = `${percent}%`;
    if (progressPercent) progressPercent.textContent = `${Math.round(percent)}%`;
    if (progressStatus) progressStatus.textContent = status;
}

// Show optimization info after upload
function showOptimizationInfo(processing) {
    const optimizationInfo = document.getElementById('optimization-info');
    const sizeEl = document.getElementById('image-size');

    if (optimizationInfo && processing) {
        const originalKB = (processing.originalSize / 1024).toFixed(1);
        const optimizedKB = (processing.optimizedSize / 1024).toFixed(1);

        optimizationInfo.innerHTML = `Image optimized: ${originalKB}KB &rarr; ${optimizedKB}KB (${processing.savings}% saved)`;
        optimizationInfo.style.display = 'block';

        if (sizeEl) {
            sizeEl.textContent = `${optimizedKB} KB`;
            sizeEl.classList.add('optimized');
        }
    }
}

// Load Dashboard
async function loadDashboard() {
    const token = localStorage.getItem('authToken');

    try {
        const response = await fetch('/api/artworks', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        const artworks = await response.json();

        // Update stats
        document.getElementById('total-artworks').textContent = artworks.length;
        document.getElementById('available-artworks').textContent = artworks.filter(a => a.available).length;

        const totalValue = artworks.reduce((sum, a) => sum + (a.price || 0), 0);
        document.getElementById('total-value').textContent = `£${totalValue.toLocaleString()}`;

        const categories = [...new Set(artworks.map(a => a.category).filter(c => c))];
        document.getElementById('categories').textContent = categories.length;

        // Show recent artworks
        const recentArtworks = artworks.slice(0, 4);
        const artworkGrid = document.getElementById('recent-artworks');

        if (recentArtworks.length === 0) {
            artworkGrid.innerHTML = '<p>No artworks yet. Add your first artwork!</p>';
        } else {
            artworkGrid.innerHTML = recentArtworks.map(artwork => `
                <div class="artwork-card">
                    <img src="${artwork.image_path}" alt="${artwork.title}">
                    <div class="artwork-card-info">
                        <h4>${artwork.title}</h4>
                        <p>£${artwork.price || 0}</p>
                    </div>
                </div>
            `).join('');
        }
    } catch (error) {
        console.error('Failed to load dashboard:', error);
    }
}

// Load Artworks
async function loadArtworks() {
    const token = localStorage.getItem('authToken');

    try {
        const response = await fetch('/api/artworks', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        allArtworks = await response.json();
        filteredArtworks = [...allArtworks];

        // Apply current filters
        handleSearchFilter();
    } catch (error) {
        console.error('Failed to load artworks:', error);
    }
}

// Handle search and filter
function handleSearchFilter() {
    const searchTerm = document.getElementById('artwork-search')?.value.toLowerCase() || '';
    const categoryFilter = document.getElementById('category-filter')?.value || 'all';
    const availabilityFilter = document.getElementById('availability-filter')?.value || 'all';

    filteredArtworks = allArtworks.filter(artwork => {
        const matchesSearch = artwork.title.toLowerCase().includes(searchTerm) ||
                             artwork.artist.toLowerCase().includes(searchTerm);
        const matchesCategory = categoryFilter === 'all' || artwork.category === categoryFilter;
        const matchesAvailability = availabilityFilter === 'all' ||
                                   (availabilityFilter === 'available' && artwork.available) ||
                                   (availabilityFilter === 'sold' && !artwork.available);

        return matchesSearch && matchesCategory && matchesAvailability;
    });

    currentPage = 1; // Reset to first page when filtering
    renderArtworks();
}

// Render artworks based on current view
function renderArtworks() {
    if (currentView === 'grid') {
        renderGridView();
    } else {
        renderTableView();
    }
}

// Render card grid view
function renderGridView() {
    const gridContainer = document.getElementById('artworks-grid');
    const paginationContainer = document.getElementById('grid-pagination');

    // Calculate pagination
    const totalPages = Math.ceil(filteredArtworks.length / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const paginatedArtworks = filteredArtworks.slice(startIndex, endIndex);

    // Render cards
    if (paginatedArtworks.length === 0) {
        gridContainer.innerHTML = '<div class="loading">No artworks found. Try adjusting your filters or add your first artwork!</div>';
    } else {
        gridContainer.innerHTML = paginatedArtworks.map(artwork => `
            <div class="artwork-management-card ${artwork.featured ? 'featured-artwork' : ''}">
                ${artwork.featured ? '<span class="featured-badge">⭐ Featured on Homepage</span>' : ''}
                <img src="${artwork.image_path}" alt="${artwork.title}" class="card-image" data-action="open-lightbox" data-image="${artwork.image_path}">
                <div class="card-body">
                    <h3 class="card-title">${artwork.title}</h3>
                    <div class="card-details">
                        <div class="card-detail-row">
                            <span>${artwork.artist}</span>
                            <span>${artwork.year || 'N/A'}</span>
                        </div>
                        <div class="card-detail-row">
                            <span class="card-price">£${artwork.price || 0}</span>
                            <span class="card-badge ${artwork.available ? 'badge-available' : 'badge-sold'}">
                                ${artwork.available ? 'Available' : 'Sold'}
                            </span>
                        </div>
                        ${artwork.technique ? `<div><small>${artwork.technique}</small></div>` : ''}
                        ${artwork.dimensions ? `<div><small>${artwork.dimensions}</small></div>` : ''}
                    </div>
                    <div class="card-actions">
                        <button class="btn ${artwork.featured ? 'btn-warning' : 'btn-success'} btn-icon"
                                data-action="toggle-featured"
                                data-id="${artwork.id}"
                                data-featured="${artwork.featured ? '1' : '0'}"
                                title="${artwork.featured ? 'Remove from homepage' : 'Add to homepage'}">
                            ${artwork.featured ? '★ Featured' : '☆ Feature'}
                        </button>
                        <button class="btn btn-icon" data-action="edit-artwork" data-id="${artwork.id}">Edit</button>
                        <button class="btn btn-danger btn-icon" data-action="delete-artwork" data-id="${artwork.id}">Delete</button>
                    </div>
                </div>
            </div>
        `).join('');
    }

    // Render pagination
    renderPagination(paginationContainer, totalPages);
}

// Render table view
function renderTableView() {
    const tbody = document.getElementById('artworks-table');
    const paginationContainer = document.getElementById('table-pagination');

    // Calculate pagination
    const totalPages = Math.ceil(filteredArtworks.length / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const paginatedArtworks = filteredArtworks.slice(startIndex, endIndex);

    // Render table rows
    if (paginatedArtworks.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" class="loading">No artworks found. Try adjusting your filters or add your first artwork!</td></tr>';
    } else {
        tbody.innerHTML = paginatedArtworks.map(artwork => `
            <tr>
                <td><img src="${artwork.image_path}" alt="${artwork.title}" style="width: 100px; height: 100px; object-fit: cover; border-radius: 8px; cursor: pointer;" data-action="open-lightbox" data-image="${artwork.image_path}"></td>
                <td>${artwork.title}</td>
                <td>${artwork.artist}</td>
                <td>${artwork.year || '-'}</td>
                <td>£${artwork.price || 0}</td>
                <td>${artwork.available ? '✓' : '✗'}</td>
                <td>
                    <button class="btn" data-action="edit-artwork" data-id="${artwork.id}" style="margin-right: 0.5rem;">Edit</button>
                    <button class="btn btn-danger" data-action="delete-artwork" data-id="${artwork.id}">Delete</button>
                </td>
            </tr>
        `).join('');
    }

    // Render pagination
    renderPagination(paginationContainer, totalPages);
}

// Render pagination controls
function renderPagination(container, totalPages) {
    if (totalPages <= 1) {
        container.innerHTML = '';
        return;
    }

    const startItem = (currentPage - 1) * itemsPerPage + 1;
    const endItem = Math.min(currentPage * itemsPerPage, filteredArtworks.length);

    let paginationHTML = `
        <button data-action="change-page" data-page="1" ${currentPage === 1 ? 'disabled' : ''}>First</button>
        <button data-action="change-page" data-page="${currentPage - 1}" ${currentPage === 1 ? 'disabled' : ''}>Prev</button>
    `;

    // Show page numbers (max 5 visible)
    let startPage = Math.max(1, currentPage - 2);
    let endPage = Math.min(totalPages, startPage + 4);

    if (endPage - startPage < 4) {
        startPage = Math.max(1, endPage - 4);
    }

    for (let i = startPage; i <= endPage; i++) {
        paginationHTML += `<button class="${i === currentPage ? 'active' : ''}" data-action="change-page" data-page="${i}">${i}</button>`;
    }

    paginationHTML += `
        <button data-action="change-page" data-page="${currentPage + 1}" ${currentPage === totalPages ? 'disabled' : ''}>Next</button>
        <button data-action="change-page" data-page="${totalPages}" ${currentPage === totalPages ? 'disabled' : ''}>Last</button>
        <span class="pagination-info">${startItem}-${endItem} of ${filteredArtworks.length}</span>
    `;

    container.innerHTML = paginationHTML;
}

// Change page (global for inline onclick handlers)
window.changePage = function(page) {
    currentPage = page;
    renderArtworks();
    // Scroll to top of artworks section
    const artworksPage = document.getElementById('artworks-page');
    if (artworksPage) {
        artworksPage.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
}

// Switch between grid and table view (global for inline onclick handlers)
window.switchView = function(view) {
    currentView = view;

    // Update button states
    const gridBtn = document.getElementById('grid-view-btn');
    const tableBtn = document.getElementById('table-view-btn');

    if (view === 'grid') {
        gridBtn.classList.add('active');
        tableBtn.classList.remove('active');
    } else {
        gridBtn.classList.remove('active');
        tableBtn.classList.add('active');
    }

    // Show/hide containers
    document.getElementById('artworks-grid-container').style.display = view === 'grid' ? 'block' : 'none';
    document.getElementById('artworks-table-container').style.display = view === 'table' ? 'block' : 'none';

    // Render current view
    renderArtworks();
}

// Lightbox functions (global for inline onclick handlers)
window.openLightbox = function(imagePath) {
    const lightbox = document.getElementById('lightbox');
    const lightboxImage = document.getElementById('lightbox-image');

    lightboxImage.src = imagePath;
    lightbox.style.display = 'flex';
}

window.closeLightbox = function() {
    document.getElementById('lightbox').style.display = 'none';
}

// Load Content
async function loadContent() {
    const token = localStorage.getItem('authToken');

    try {
        // Load hero content
        const heroResponse = await fetch('/api/content/hero');
        const heroData = await heroResponse.json();

        if (heroData.content) {
            document.getElementById('hero-title').value = heroData.content.title || '';
            document.getElementById('hero-subtitle').value = heroData.content.subtitle || '';
            document.getElementById('hero-journey').value = heroData.content.journey || '';
        }

        // Load about content
        const aboutResponse = await fetch('/api/content/about');
        const aboutData = await aboutResponse.json();

        if (aboutData.content) {
            document.getElementById('about-title').value = aboutData.content.title || '';
            const paragraphs = aboutData.content.paragraphs || [];
            document.getElementById('about-content').value = paragraphs.join('\n\n');
        }
    } catch (error) {
        console.error('Failed to load content:', error);
    }
}

// Load Price List
async function loadPriceList() {
    const token = localStorage.getItem('authToken');

    try {
        const response = await fetch('/api/artworks/admin/pricelist', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        const artworks = await response.json();
        const tbody = document.getElementById('pricelist-table');

        if (artworks.length === 0) {
            tbody.innerHTML = '<tr><td colspan="7">No artworks in price list.</td></tr>';
        } else {
            tbody.innerHTML = artworks.map(artwork => `
                <tr>
                    <td>${artwork.title}</td>
                    <td>${artwork.artist}</td>
                    <td>${artwork.technique || '-'}</td>
                    <td>${artwork.dimensions || '-'}</td>
                    <td>${artwork.year || '-'}</td>
                    <td>£${artwork.price || 0}</td>
                    <td>${artwork.available ? 'Available' : 'Sold'}</td>
                </tr>
            `).join('');
        }
    } catch (error) {
        console.error('Failed to load price list:', error);
    }
}

// Show Add Artwork Modal
window.showAddArtwork = function() {
    document.getElementById('modal-title').textContent = 'Add New Artwork';
    document.getElementById('artwork-form').reset();
    delete document.getElementById('artwork-form').dataset.artworkId;

    // Hide image preview
    const previewContainer = document.getElementById('image-preview-container');
    if (previewContainer) {
        previewContainer.style.display = 'none';
    }

    document.getElementById('artwork-modal').style.display = 'flex';
}

// Edit Artwork (global for inline onclick handlers)
window.editArtwork = async function(id) {
    const token = localStorage.getItem('authToken');

    try {
        const response = await fetch(`/api/artworks/${id}`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        const artwork = await response.json();

        document.getElementById('modal-title').textContent = 'Edit Artwork';

        const form = document.getElementById('artwork-form');
        form.elements.title.value = artwork.title;
        form.elements.artist.value = artwork.artist;
        form.elements.technique.value = artwork.technique || '';
        form.elements.dimensions.value = artwork.dimensions || '';
        form.elements.year.value = artwork.year || '';
        form.elements.price.value = artwork.price || '';
        form.elements.category.value = artwork.category || 'Contemporary';
        form.elements.description.value = artwork.description || '';
        form.elements.available.checked = artwork.available;

        // Show current image
        if (artwork.image_path) {
            const preview = document.getElementById('image-preview');
            const filename = document.getElementById('image-filename');
            const previewContainer = document.getElementById('image-preview-container');

            preview.src = artwork.image_path;
            filename.textContent = `Current image: ${artwork.image_path.split('/').pop()}`;
            previewContainer.style.display = 'block';
        }

        form.dataset.artworkId = id;
        document.getElementById('artwork-modal').style.display = 'flex';
    } catch (error) {
        console.error('Failed to load artwork:', error);
        alert('Failed to load artwork details');
    }
}

// Delete Artwork (global for inline onclick handlers)
window.deleteArtwork = async function(id) {
    if (!confirm('Are you sure you want to delete this artwork?')) {
        return;
    }

    const token = localStorage.getItem('authToken');

    try {
        const response = await fetch(`/api/artworks/${id}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (!response.ok) {
            throw new Error('Failed to delete artwork');
        }

        alert('Artwork deleted successfully');
        await loadArtworks();
        await loadDashboard();
    } catch (error) {
        console.error('Failed to delete artwork:', error);
        alert('Failed to delete artwork');
    }
}

// Toggle Featured Status (global for inline onclick handlers)
window.toggleFeatured = async function(id, currentFeatured) {
    const newFeatured = !currentFeatured;
    const token = localStorage.getItem('authToken');

    try {
        const response = await fetch(`/api/artworks/${id}/featured`, {
            method: 'PATCH',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ featured: newFeatured })
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || 'Failed to update featured status');
        }

        alert(data.message);
        await loadArtworks();
        await loadDashboard();
    } catch (error) {
        console.error('Failed to toggle featured:', error);
        alert(error.message || 'Failed to update featured status');
    }
}

// Close Modal (global for inline onclick handlers)
window.closeModal = function() {
    document.getElementById('artwork-modal').style.display = 'none';
    document.getElementById('artwork-form').reset();
    delete document.getElementById('artwork-form').dataset.artworkId;

    // Reset dropzone and image preview
    clearImagePreview();

    // Hide upload progress
    showUploadProgress(false);

    // Reset optimization info
    const optimizationInfo = document.getElementById('optimization-info');
    if (optimizationInfo) {
        optimizationInfo.style.display = 'none';
    }

    // Reset size badge style
    const sizeEl = document.getElementById('image-size');
    if (sizeEl) {
        sizeEl.classList.remove('optimized');
    }
}

// Preview image before upload (global for inline onchange handler)
window.previewImage = function(event) {
    const file = event.target.files[0];
    const previewContainer = document.getElementById('image-preview-container');
    const preview = document.getElementById('image-preview');
    const filename = document.getElementById('image-filename');

    if (file) {
        const reader = new FileReader();
        reader.onload = function(e) {
            preview.src = e.target.result;
            filename.textContent = `Selected: ${file.name} (${(file.size / 1024).toFixed(1)} KB)`;
            previewContainer.style.display = 'block';
        };
        reader.readAsDataURL(file);
    } else {
        previewContainer.style.display = 'none';
    }
}

// Handle Artwork Form Submission with Progress Tracking
async function handleArtworkSubmit(e) {
    e.preventDefault();

    const token = localStorage.getItem('authToken');
    const form = e.target;
    const formData = new FormData(form);

    const artworkId = form.dataset.artworkId;
    const method = artworkId ? 'PUT' : 'POST';
    const url = artworkId ? `/api/artworks/${artworkId}` : '/api/artworks';

    // Convert available checkbox to number
    formData.set('available', form.elements.available.checked ? '1' : '0');

    // Check if there's an image to upload
    const hasImage = formData.get('image') && formData.get('image').size > 0;

    if (hasImage) {
        // Use XMLHttpRequest for progress tracking
        return new Promise((resolve, reject) => {
            const xhr = new XMLHttpRequest();

            // Show progress bar
            showUploadProgress(true);
            updateUploadProgress(0, 'Preparing upload...');

            xhr.upload.addEventListener('progress', (e) => {
                if (e.lengthComputable) {
                    const percent = (e.loaded / e.total) * 80; // Reserve 20% for processing
                    updateUploadProgress(percent, 'Uploading image...');
                }
            });

            xhr.addEventListener('load', async () => {
                if (xhr.status >= 200 && xhr.status < 300) {
                    updateUploadProgress(90, 'Processing image...');

                    try {
                        const response = JSON.parse(xhr.responseText);

                        // Show optimization info if available
                        if (response.processing) {
                            updateUploadProgress(100, 'Optimization complete!');
                            showOptimizationInfo(response.processing);
                        } else {
                            updateUploadProgress(100, 'Upload complete!');
                        }

                        setTimeout(() => {
                            showUploadProgress(false);
                            alert(artworkId ? 'Artwork updated successfully' : 'Artwork added successfully');
                            closeModal();
                            loadArtworks();
                            loadDashboard();
                            resolve(response);
                        }, 1000);
                    } catch (parseError) {
                        showUploadProgress(false);
                        alert(artworkId ? 'Artwork updated successfully' : 'Artwork added successfully');
                        closeModal();
                        loadArtworks();
                        loadDashboard();
                        resolve();
                    }
                } else {
                    showUploadProgress(false);
                    alert('Failed to save artwork');
                    reject(new Error('Upload failed'));
                }
            });

            xhr.addEventListener('error', () => {
                showUploadProgress(false);
                alert('Failed to save artwork. Network error.');
                reject(new Error('Network error'));
            });

            xhr.open(method, url);
            xhr.setRequestHeader('Authorization', `Bearer ${token}`);
            xhr.send(formData);
        });
    } else {
        // No image, use regular fetch
        try {
            const response = await fetch(url, {
                method: method,
                headers: {
                    'Authorization': `Bearer ${token}`
                },
                body: formData
            });

            if (!response.ok) {
                throw new Error('Failed to save artwork');
            }

            alert(artworkId ? 'Artwork updated successfully' : 'Artwork added successfully');
            closeModal();
            await loadArtworks();
            await loadDashboard();
        } catch (error) {
            console.error('Failed to save artwork:', error);
            alert('Failed to save artwork');
        }
    }
}

// Handle Hero Form Submission
async function handleHeroSubmit(e) {
    e.preventDefault();

    const token = localStorage.getItem('authToken');
    const content = {
        title: document.getElementById('hero-title').value,
        subtitle: document.getElementById('hero-subtitle').value,
        journey: document.getElementById('hero-journey').value
    };

    try {
        const response = await fetch('/api/content/hero', {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ content })
        });

        if (!response.ok) {
            throw new Error('Failed to update content');
        }

        alert('Hero section updated successfully');
    } catch (error) {
        console.error('Failed to update hero:', error);
        alert('Failed to update hero section');
    }
}

// Handle About Form Submission
async function handleAboutSubmit(e) {
    e.preventDefault();

    const token = localStorage.getItem('authToken');
    const paragraphs = document.getElementById('about-content').value.split('\n\n').filter(p => p.trim());
    const content = {
        title: document.getElementById('about-title').value,
        paragraphs: paragraphs
    };

    try {
        const response = await fetch('/api/content/about', {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ content })
        });

        if (!response.ok) {
            throw new Error('Failed to update content');
        }

        alert('About section updated successfully');
    } catch (error) {
        console.error('Failed to update about:', error);
        alert('Failed to update about section');
    }
}

// Export Price List (placeholder)
function exportPriceList() {
    alert('PDF export will be implemented in the next phase. For now, you can use browser print (Ctrl+P) to save as PDF.');
    window.print();
}
// Wait for DOM to be ready
document.addEventListener('DOMContentLoaded', initializeAdmin);

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

        const artworks = await response.json();
        const tbody = document.getElementById('artworks-table');

        if (artworks.length === 0) {
            tbody.innerHTML = '<tr><td colspan="7">No artworks found. Add your first artwork!</td></tr>';
        } else {
            tbody.innerHTML = artworks.map(artwork => `
                <tr>
                    <td><img src="${artwork.image_path}" alt="${artwork.title}" style="width: 50px; height: 50px; object-fit: cover; border-radius: 5px;"></td>
                    <td>${artwork.title}</td>
                    <td>${artwork.artist}</td>
                    <td>${artwork.year || '-'}</td>
                    <td>£${artwork.price || 0}</td>
                    <td>${artwork.available ? '✓' : '✗'}</td>
                    <td>
                        <button class="btn" onclick="editArtwork(${artwork.id})" style="margin-right: 0.5rem;">Edit</button>
                        <button class="btn btn-danger" onclick="deleteArtwork(${artwork.id})">Delete</button>
                    </td>
                </tr>
            `).join('');
        }
    } catch (error) {
        console.error('Failed to load artworks:', error);
    }
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
function showAddArtwork() {
    document.getElementById('modal-title').textContent = 'Add New Artwork';
    document.getElementById('artwork-form').reset();
    document.getElementById('artwork-modal').style.display = 'flex';
}

// Edit Artwork
async function editArtwork(id) {
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

        form.dataset.artworkId = id;
        document.getElementById('artwork-modal').style.display = 'flex';
    } catch (error) {
        console.error('Failed to load artwork:', error);
        alert('Failed to load artwork details');
    }
}

// Delete Artwork
async function deleteArtwork(id) {
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
        loadArtworks();
    } catch (error) {
        console.error('Failed to delete artwork:', error);
        alert('Failed to delete artwork');
    }
}

// Close Modal
function closeModal() {
    document.getElementById('artwork-modal').style.display = 'none';
    document.getElementById('artwork-form').reset();
    delete document.getElementById('artwork-form').dataset.artworkId;
}

// Handle Artwork Form Submission
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
        loadArtworks();
        loadDashboard();
    } catch (error) {
        console.error('Failed to save artwork:', error);
        alert('Failed to save artwork');
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

// Logout
function logout() {
    localStorage.removeItem('authToken');
    localStorage.removeItem('token'); // Also remove 'token' for backward compatibility
    localStorage.removeItem('user');
    window.location.href = '/admin/login.html';
}
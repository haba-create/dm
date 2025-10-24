// Load gallery data when page loads
window.addEventListener('DOMContentLoaded', async () => {
    await loadGalleryData();
    await loadSiteContent();
});

// Load gallery artworks
async function loadGalleryData() {
    try {
        const response = await fetch('/api/artworks?featured=true');
        const artworks = await response.json();

        const galleryGrid = document.querySelector('.gallery-grid');
        if (!galleryGrid) return;

        if (artworks.length === 0) {
            galleryGrid.innerHTML = '<p style="text-align: center; grid-column: 1/-1;">Gallery is being updated. Please check back soon!</p>';
            return;
        }

        // Generate artwork HTML (without prices for public view)
        galleryGrid.innerHTML = artworks.map(artwork => `
            <div class="artwork-item fade-in">
                <img src="${artwork.image_path}" alt="${artwork.title}" class="artwork-image" loading="lazy">
                <div class="artwork-info">
                    <h3 class="artwork-title">${artwork.title}</h3>
                    <p class="artwork-details">
                        ${artwork.technique || 'Oil on canvas'} • ${artwork.dimensions || ''} • ${artwork.year || ''}
                        ${artwork.description ? '<br>' + artwork.description : ''}
                    </p>
                    ${artwork.available ?
                        '<p class="artwork-price" style="color: var(--deep-saffron);">Inquire for pricing</p>' :
                        '<p class="artwork-price" style="color: var(--charcoal); opacity: 0.7;">Sold</p>'
                    }
                </div>
            </div>
        `).join('');

        // Reapply fade-in animations
        observeFadeInElements();
    } catch (error) {
        console.error('Failed to load gallery:', error);
    }
}

// Load dynamic site content
async function loadSiteContent() {
    try {
        // Load hero content
        const heroResponse = await fetch('/api/content/hero');
        const heroData = await heroResponse.json();

        if (heroData.content) {
            const heroTitle = document.querySelector('.hero h1');
            const heroSubtitle = document.querySelector('.hero-subtitle');
            const heroJourney = document.querySelector('.hero-journey');

            if (heroTitle) heroTitle.textContent = heroData.content.title || 'Daamitha';
            if (heroSubtitle) heroSubtitle.textContent = heroData.content.subtitle || 'Contemporary Oil Paintings with Soul';
            if (heroJourney) heroJourney.textContent = heroData.content.journey || 'Contemporary Oil Painter • London';
        }

        // Load about content
        const aboutResponse = await fetch('/api/content/about');
        const aboutData = await aboutResponse.json();

        if (aboutData.content) {
            const aboutTitle = document.querySelector('.about-text h2');
            const aboutText = document.querySelector('.about-text');

            if (aboutTitle) aboutTitle.textContent = aboutData.content.title || "The Artist's Journey";

            if (aboutText && aboutData.content.paragraphs) {
                // Find existing paragraphs
                const existingParagraphs = aboutText.querySelectorAll('p');

                // Update or create paragraphs
                aboutData.content.paragraphs.forEach((text, index) => {
                    if (existingParagraphs[index]) {
                        existingParagraphs[index].textContent = text;
                    } else if (index < 2) { // Only show first 2 paragraphs
                        const p = document.createElement('p');
                        p.textContent = text;
                        // Insert before cultural highlights
                        const highlights = aboutText.querySelector('.cultural-highlights');
                        if (highlights) {
                            aboutText.insertBefore(p, highlights);
                        } else {
                            aboutText.appendChild(p);
                        }
                    }
                });
            }
        }

        // Load process content
        const processResponse = await fetch('/api/content/process');
        const processData = await processResponse.json();

        if (processData.content) {
            const processTitle = document.querySelector('.process-text h2');
            const processSteps = document.querySelector('.process-steps');

            if (processTitle) processTitle.textContent = processData.content.title || 'The Oil Painting Process';

            if (processSteps && processData.content.steps) {
                processSteps.innerHTML = processData.content.steps.map(step => `
                    <li>
                        <strong>${step.title}:</strong> ${step.description}
                    </li>
                `).join('');
            }
        }
    } catch (error) {
        console.error('Failed to load site content:', error);
    }
}

// Reapply intersection observer for fade-in animations
function observeFadeInElements() {
    const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    };

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.style.animationDelay = Math.random() * 0.5 + 's';
                entry.target.classList.add('fade-in');
            }
        });
    }, observerOptions);

    document.querySelectorAll('.fade-in').forEach(el => {
        observer.observe(el);
    });
}
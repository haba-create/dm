# Daamitha - Art Portfolio 

This portfolio presents a selection of my artworks created over the years, reflecting my exploration of different ideas, techniques, and materials. I enjoy working with a variety of art styles and experimenting with processes that allow each piece to develop its own character. Many of my paintings are created using oil-based pigment, a practice that requires time and patience, as each work is built up through careful layering and meticulous detail. I hope you like my work!!


## ✨ Features

### 🎨 **Artist Showcase**
- Contemporary oil painting gallery with high-quality images
- Individual artwork details including dimensions, year, and pricing

### 🎨 **Visual Design**
- Custom color palette inspired by Indian spices and traditions
- Gradient backgrounds and artistic layouts
- 

## 🛠️ Technologies Used

- **HTML5** - Semantic markup structure
- **CSS3** - Advanced styling with custom properties, gradients, and animations
- **Vanilla JavaScript** - Interactive features and scroll effects
- **Google Fonts** - Crimson Text and Lora typography
- **SVG** - Scalable decorative elements and patterns

## 📁 Project Structure

```
daamitha-portfolio/
├── index.html              # Main website file
├── README.md               # Project documentation
└── assets/
    ├── images/
    │   ├── 5d66fab2-9942-4bc9-9573-cac1643e61c5.png    # Artist photo
    │   ├── 1e851424-27bb-479e-9d11-f9f402ccb81b.png    # Monsoon Memories
    │   ├── 2791f81d-5022-45a3-bd5a-4850ec69605c.png    # Between Worlds
    │   ├── 311385b7-56fe-4d3e-bbf7-bc7b5d73af42.png    # Golden Dreams
    │   ├── 33724789-08e0-438c-ac43-d08678f7efaf.png    # Temple Bells
    │   ├── 34053899-4e55-4367-9c32-09f7b52d513a.png    # Healing Hands
    │   ├── 5b16c3d8-3713-477b-89c4-847bf939e0a8.png    # Songs of Home
    │   └── [process images]                              # Studio process photos
    └── styles/
        └── main.css         # (Optional: Extract inline styles)
```

## 🚀 Getting Started

### Prerequisites
- Modern web browser (Chrome, Firefox, Safari, Edge)
- Local web server (optional, for development)

### Installation

1. **Clone or download the project files**
   ```bash
   git clone [repository-url]
   cd daamitha-portfolio
   ```

2. **Open the website**
   - **Simple**: Double-click `index.html` to open in your browser
   - **Development**: Use a local server for better performance
     ```bash
     # Using Python
     python -m http.server 8000
     
     # Using Node.js
     npx http-server
     
     # Using PHP
     php -S localhost:8000
     ```

3. **View the website**
   - Open `http://localhost:8000` in your browser

## 📊 Website Sections

| Section | Description |
|---------|-------------|
| **Home** | Hero section with artist introduction and call-to-action |
| **Story** | Artist's journey from India to London, medical studies, and cultural fusion |
| **Gallery** | Collection of 6 featured oil paintings with prices (£1,400 - £2,400) |
| **Process** | Behind-the-scenes look at oil painting techniques and cultural inspiration |
| **Heritage** | Musical background and traditional South Indian influences |
| **Acquire** | Contact information for commissions and art purchases |

## 🎨 Customization

### Color Scheme
The website uses CSS custom properties for easy theme modification:

```css
:root {
    --deep-saffron: #ff6b35;
    --turmeric: #f7931e;
    --emerald: #2d5016;
    --burgundy: #800020;
    --marigold: #ffb000;
    --terracotta: #e07a5f;
    /* ... more colors */
}
```

### Adding New Artworks
To add new pieces to the gallery:

1. Add the image to the `assets/images/` folder
2. Insert a new artwork item in the gallery section:

```html
<div class="artwork-item fade-in">
    <img src="your-artwork.jpg" alt="Artwork Title" class="artwork-image">
    <div class="artwork-info">
        <h3 class="artwork-title">Your Artwork Title</h3>
        <p class="artwork-details">Medium • Dimensions • Year<br>Description</p>
        <p class="artwork-price">£Price</p>
    </div>
</div>
```

### Contact Information
Update the contact section with current email and details:

```html
<a href="mailto:your-email@domain.com">your-email@domain.com</a>
```

## 📱 Responsive Design

The website is fully responsive with breakpoints:
- **Desktop**: 1400px+ (full grid layout)
- **Tablet**: 768px - 1399px (adapted grid)
- **Mobile**: <768px (single column, stacked layout)

## ⚡ Performance Features

- **Optimized Images**: All artwork images should be web-optimized
- **CSS Animations**: Hardware-accelerated transforms
- **Lazy Loading**: Intersection Observer API for fade-in effects
- **Smooth Scrolling**: Native CSS smooth scrolling behavior

## 🎭 Cultural Elements

### Design Inspiration
- **Colors**: Inspired by Indian spices (turmeric, saffron, terracotta)
- **Patterns**: Paisley and mandala decorative elements
- **Typography**: Elegant serif fonts reflecting artistic sophistication
- **Layout**: Asymmetrical designs with cultural motifs

### Musical Integration
- Traditional South Indian music influences visual rhythm
- Color choices reflect classical raga emotions
- Flowing brushstroke animations mirror melodic phrases

## 📧 Contact & Commissions

**Artist Email**: `daamitha.artist@gmail.com`

**Services Offered**:
- Original oil paintings for sale
- Custom commission works
- Cultural storytelling through art
- Studio visits by appointment (UK)
- Global shipping with insurance

**Price Range**: £1,400 - £2,400 for featured works

## 🌍 Deployment

### GitHub Pages
1. Push to GitHub repository
2. Enable GitHub Pages in repository settings
3. Select source branch (main/master)
4. Access via `https://username.github.io/repository-name`

### Netlify
1. Connect GitHub repository to Netlify
2. Deploy automatically on push to main branch
3. Custom domain available

### Traditional Web Hosting
1. Upload all files via FTP/SFTP
2. Ensure `index.html` is in root directory
3. Test all image paths and links

## 📄 License

© 2024 Daamitha. All artwork and content are original creations. Website code structure may be adapted with attribution.

**Artwork**: All paintings and images are copyrighted original works.
**Code**: Website structure and design can be used as reference with proper attribution.

## 🤝 Contributing

This is a personal artist portfolio. For technical suggestions or bug reports, please reach out via the contact form or email.

---

*"Each painting carries the songs of my ancestors and the dreams of my future."* - Daamitha

**Tags**: `oil-painting` `indian-art` `contemporary-art` `cultural-fusion` `portfolio-website` `medical-student-artist` `traditional-music` `responsive-design`

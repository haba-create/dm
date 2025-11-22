const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const bcrypt = require('bcryptjs');

// Create database connection
const dbPath = path.join(__dirname, '../../gallery.db');
const db = new sqlite3.Database(dbPath);

// Initialize database tables
const initializeDatabase = () => {
    db.serialize(() => {
        // Users table
        db.run(`
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                email TEXT UNIQUE NOT NULL,
                password_hash TEXT NOT NULL,
                role TEXT DEFAULT 'admin',
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // Artworks table
        db.run(`
            CREATE TABLE IF NOT EXISTS artworks (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                title TEXT NOT NULL,
                artist TEXT DEFAULT 'Daamitha',
                technique TEXT,
                dimensions TEXT,
                year INTEGER,
                price REAL,
                image_path TEXT,
                thumbnail_path TEXT,
                description TEXT,
                category TEXT,
                available INTEGER DEFAULT 1,
                featured INTEGER DEFAULT 0,
                display_order INTEGER DEFAULT 0,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // Add thumbnail_path column if it doesn't exist (migration for existing DBs)
        db.run(`ALTER TABLE artworks ADD COLUMN thumbnail_path TEXT`, (err) => {
            // Ignore error if column already exists
            if (err && !err.message.includes('duplicate column name')) {
                console.error('Migration error:', err.message);
            }
        });

        // Site content table
        db.run(`
            CREATE TABLE IF NOT EXISTS site_content (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                section TEXT UNIQUE NOT NULL,
                content TEXT,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // Check if admin user exists, if not create default admin
        const adminEmail = process.env.ADMIN_EMAIL || 'admin@daamitha.art';
        const adminPassword = process.env.ADMIN_PASSWORD || 'Admin@123';

        db.get("SELECT * FROM users WHERE email = ?", [adminEmail], async (err, row) => {
            if (!row) {
                try {
                    const hashedPassword = await bcrypt.hash(adminPassword, 10);
                    db.run(
                        "INSERT INTO users (email, password_hash, role) VALUES (?, ?, ?)",
                        [adminEmail, hashedPassword, 'admin'],
                        (err) => {
                            if (err) {
                                console.error('Error creating admin user:', err);
                            } else {
                                console.log('Default admin user created');
                                console.log('Email:', adminEmail);
                                // Don't log password in production
                                if (process.env.NODE_ENV !== 'production') {
                                    console.log('Password:', adminPassword);
                                }
                            }
                        }
                    );
                } catch (hashError) {
                    console.error('Error hashing password:', hashError);
                }
            }
        });

        // Insert default site content
        const defaultContent = [
            {
                section: 'hero',
                content: JSON.stringify({
                    title: 'Daamitha',
                    subtitle: 'Contemporary Oil Paintings with Soul',
                    journey: 'Contemporary Oil Painter • London'
                })
            },
            {
                section: 'about',
                content: JSON.stringify({
                    title: "The Artist's Journey",
                    paragraphs: [
                        "Born amidst the vibrant colors and rich traditions of India, Daamitha's artistic soul was nurtured by the cultural heartbeat of South Indian traditions. Currently pursuing her medical studies in London while maintaining her artistic practice, she has created a beautiful fusion of Eastern heritage and contemporary expression.",
                        "Daamitha bridges the analytical precision of her medical studies with the emotional depth of oil painting. Her canvas becomes a meeting place where traditional Indian philosophy meets Western technique, creating works that speak to the universal human experience while celebrating her cultural roots."
                    ]
                })
            },
            {
                section: 'process',
                content: JSON.stringify({
                    title: 'The Oil Painting Process',
                    steps: [
                        {
                            title: 'Cultural Inspiration',
                            description: 'Each painting begins with a memory, a song, or a moment of cultural reflection. I sketch while listening to traditional Indian music.'
                        },
                        {
                            title: 'Canvas Meditation',
                            description: 'Premium Belgian linen is prepared with multiple layers of rabbit skin glue and oil-based primer, creating a luminous foundation.'
                        },
                        {
                            title: 'Color Alchemy',
                            description: 'Hand-mixed oil pigments create custom colors inspired by Indian spices, desert sunsets, and English gardens.'
                        },
                        {
                            title: 'Layered Storytelling',
                            description: 'Each layer is applied using traditional glazing techniques, building depth and luminosity over weeks of careful work.'
                        },
                        {
                            title: 'Soul Integration',
                            description: 'The final details are painted while singing traditional songs, infusing each piece with cultural memory and personal journey.'
                        }
                    ]
                })
            }
        ];

        defaultContent.forEach(item => {
            db.run(
                "INSERT OR IGNORE INTO site_content (section, content) VALUES (?, ?)",
                [item.section, item.content]
            );
        });

        // Insert existing artworks as initial data
        const initialArtworks = [
            {
                title: 'Spirit Twin',
                technique: 'Oil on linen canvas',
                dimensions: '30" × 24"',
                year: 2024,
                price: 1800,
                image_path: '/images/abstract.wolf&woman.jpg',
                description: 'Inspired by a painting done by Dimitra Milan',
                category: 'Contemporary',
                featured: 1
            },
            {
                title: 'Deep within thought',
                technique: 'Oil on canvas',
                dimensions: '36" × 28"',
                year: 2024,
                price: 2400,
                image_path: '/images/cat-oils.jpg',
                description: 'An original artwork, capturing a cat staring off into the distance deep within thought',
                category: 'Animals',
                featured: 1
            },
            {
                title: 'Treetop Reverie',
                technique: 'Oil on canvas',
                dimensions: '24" × 20"',
                year: 2023,
                price: 1400,
                image_path: '/images/monkey-oils.jpg',
                description: 'An original piece, depicting the playful nature of 3 chimps within their habitat. A photo was used as a reference to help create this piece',
                category: 'Animals',
                featured: 1
            },
            {
                title: 'Feathered Jewel',
                technique: 'Oil on linen canvas',
                dimensions: '32" × 26"',
                year: 2024,
                price: 2000,
                image_path: '/images/peacock-feather.jpg',
                description: 'Capturing the elegance and intricacy of a peacock feather',
                category: 'Nature',
                featured: 1
            },
            {
                title: "Mother's Love",
                technique: 'Oil on canvas',
                dimensions: '22" × 18"',
                year: 2024,
                price: 1600,
                image_path: '/images/penguins.jpg',
                description: 'Capturing the raw emotion between a mother and a child',
                category: 'Animals',
                featured: 1
            },
            {
                title: "Predator's gaze",
                technique: 'Oil on canvas',
                dimensions: '28" × 22"',
                year: 2024,
                price: 1700,
                image_path: '/images/tiger.jpg',
                description: 'An original artwork using a photo taken by David Whelan as a reference',
                category: 'Animals',
                featured: 1
            }
        ];

        // Check if artworks table is empty before inserting
        db.get("SELECT COUNT(*) as count FROM artworks", (err, row) => {
            if (row && row.count === 0) {
                initialArtworks.forEach(artwork => {
                    db.run(
                        `INSERT INTO artworks (title, artist, technique, dimensions, year, price, image_path, description, category, featured)
                         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                        [artwork.title, 'Daamitha', artwork.technique, artwork.dimensions, artwork.year, artwork.price, artwork.image_path, artwork.description, artwork.category, artwork.featured]
                    );
                });
                console.log('Initial artworks added to database (6 featured on homepage)');
            }
        });
    });
};

// Initialize database on module load
initializeDatabase();

module.exports = db;
const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const db = require('../models/database');
const authMiddleware = require('../middleware/auth');

// Configure multer for file uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, path.join(__dirname, '../../uploads/artworks'));
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({
    storage: storage,
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB max
    fileFilter: (req, file, cb) => {
        const allowedTypes = /jpeg|jpg|png|gif|webp/;
        const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
        const mimetype = allowedTypes.test(file.mimetype);

        if (mimetype && extname) {
            return cb(null, true);
        } else {
            cb(new Error('Only image files are allowed'));
        }
    }
});

// Get all artworks (public route - no prices for public)
router.get('/', (req, res) => {
    const isAuthenticated = req.header('Authorization');
    const featuredOnly = req.query.featured === 'true';

    let query;
    if (isAuthenticated) {
        query = featuredOnly
            ? "SELECT * FROM artworks WHERE featured = 1 ORDER BY created_at DESC"
            : "SELECT * FROM artworks ORDER BY created_at DESC";
    } else {
        query = featuredOnly
            ? "SELECT id, title, artist, technique, dimensions, year, image_path, description, category, available, featured FROM artworks WHERE available = 1 AND featured = 1 ORDER BY created_at DESC LIMIT 6"
            : "SELECT id, title, artist, technique, dimensions, year, image_path, description, category, available, featured FROM artworks WHERE available = 1 ORDER BY created_at DESC";
    }

    db.all(query, [], (err, rows) => {
        if (err) {
            return res.status(500).json({ error: 'Failed to fetch artworks' });
        }
        res.json(rows);
    });
});

// Get single artwork
router.get('/:id', (req, res) => {
    const isAuthenticated = req.header('Authorization');

    const query = isAuthenticated
        ? "SELECT * FROM artworks WHERE id = ?"
        : "SELECT id, title, artist, technique, dimensions, year, image_path, description, category, available FROM artworks WHERE id = ? AND available = 1";

    db.get(query, [req.params.id], (err, row) => {
        if (err) {
            return res.status(500).json({ error: 'Failed to fetch artwork' });
        }
        if (!row) {
            return res.status(404).json({ error: 'Artwork not found' });
        }
        res.json(row);
    });
});

// Get artworks with prices (admin only)
router.get('/admin/pricelist', authMiddleware, (req, res) => {
    db.all("SELECT * FROM artworks ORDER BY created_at DESC", [], (err, rows) => {
        if (err) {
            return res.status(500).json({ error: 'Failed to fetch artworks' });
        }
        res.json(rows);
    });
});

// Toggle featured status (admin only)
router.patch('/:id/featured', authMiddleware, (req, res) => {
    const { featured } = req.body;
    const artworkId = req.params.id;

    // First check how many artworks are currently featured
    db.get("SELECT COUNT(*) as count FROM artworks WHERE featured = 1", [], (err, row) => {
        if (err) {
            return res.status(500).json({ error: 'Database error' });
        }

        // If trying to feature and already have 6, reject
        if (featured && row.count >= 6) {
            return res.status(400).json({
                error: 'Maximum of 6 featured artworks reached. Please unfeature another artwork first.'
            });
        }

        // Update featured status
        db.run(
            "UPDATE artworks SET featured = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
            [featured ? 1 : 0, artworkId],
            function(err) {
                if (err) {
                    return res.status(500).json({ error: 'Failed to update featured status' });
                }
                if (this.changes === 0) {
                    return res.status(404).json({ error: 'Artwork not found' });
                }
                res.json({
                    message: featured ? 'Artwork featured on homepage' : 'Artwork removed from homepage',
                    featured: featured ? 1 : 0
                });
            }
        );
    });
});

// Create new artwork (admin only)
router.post('/', authMiddleware, upload.single('image'), (req, res) => {
    const {
        title,
        artist = 'Daamitha',
        technique,
        dimensions,
        year,
        price,
        description,
        category,
        available = 1,
        featured = 0
    } = req.body;

    const imagePath = req.file ? `/uploads/artworks/${req.file.filename}` : null;

    db.run(
        `INSERT INTO artworks (title, artist, technique, dimensions, year, price, image_path, description, category, available, featured)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [title, artist, technique, dimensions, year, price, imagePath, description, category, available, featured],
        function(err) {
            if (err) {
                return res.status(500).json({ error: 'Failed to create artwork' });
            }
            res.json({
                id: this.lastID,
                title,
                artist,
                technique,
                dimensions,
                year,
                price,
                image_path: imagePath,
                description,
                category,
                available
            });
        }
    );
});

// Update artwork (admin only)
router.put('/:id', authMiddleware, upload.single('image'), (req, res) => {
    const {
        title,
        artist,
        technique,
        dimensions,
        year,
        price,
        description,
        category,
        available,
        featured
    } = req.body;

    // First get the current artwork to handle image update
    db.get("SELECT image_path FROM artworks WHERE id = ?", [req.params.id], (err, row) => {
        if (err || !row) {
            return res.status(404).json({ error: 'Artwork not found' });
        }

        const imagePath = req.file ? `/uploads/artworks/${req.file.filename}` : row.image_path;

        // Delete old image if new one is uploaded
        if (req.file && row.image_path && row.image_path.startsWith('/uploads/')) {
            const oldImagePath = path.join(__dirname, '../..', row.image_path);
            fs.unlink(oldImagePath, (err) => {
                if (err) console.error('Failed to delete old image:', err);
            });
        }

        db.run(
            `UPDATE artworks
             SET title = ?, artist = ?, technique = ?, dimensions = ?, year = ?,
                 price = ?, image_path = ?, description = ?, category = ?, available = ?, featured = ?,
                 updated_at = CURRENT_TIMESTAMP
             WHERE id = ?`,
            [title, artist, technique, dimensions, year, price, imagePath, description, category, available, featured, req.params.id],
            function(err) {
                if (err) {
                    return res.status(500).json({ error: 'Failed to update artwork' });
                }
                if (this.changes === 0) {
                    return res.status(404).json({ error: 'Artwork not found' });
                }
                res.json({ message: 'Artwork updated successfully' });
            }
        );
    });
});

// Delete artwork (admin only)
router.delete('/:id', authMiddleware, (req, res) => {
    // First get the artwork to delete associated image
    db.get("SELECT image_path FROM artworks WHERE id = ?", [req.params.id], (err, row) => {
        if (err || !row) {
            return res.status(404).json({ error: 'Artwork not found' });
        }

        // Delete the image file if it exists in uploads
        if (row.image_path && row.image_path.startsWith('/uploads/')) {
            const imagePath = path.join(__dirname, '../..', row.image_path);
            fs.unlink(imagePath, (err) => {
                if (err) console.error('Failed to delete image:', err);
            });
        }

        // Delete from database
        db.run("DELETE FROM artworks WHERE id = ?", [req.params.id], function(err) {
            if (err) {
                return res.status(500).json({ error: 'Failed to delete artwork' });
            }
            if (this.changes === 0) {
                return res.status(404).json({ error: 'Artwork not found' });
            }
            res.json({ message: 'Artwork deleted successfully' });
        });
    });
});

module.exports = router;
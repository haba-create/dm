const express = require('express');
const router = express.Router();
const db = require('../models/database');
const { authMiddleware } = require('../middleware/auth');

// Get content by section (public)
router.get('/:section', (req, res) => {
    const { section } = req.params;

    db.get(
        "SELECT * FROM site_content WHERE section = ?",
        [section],
        (err, row) => {
            if (err) {
                return res.status(500).json({ error: 'Failed to fetch content' });
            }
            if (!row) {
                return res.status(404).json({ error: 'Content section not found' });
            }

            try {
                const content = JSON.parse(row.content);
                res.json({
                    section: row.section,
                    content: content,
                    updated_at: row.updated_at
                });
            } catch (parseError) {
                res.json({
                    section: row.section,
                    content: row.content,
                    updated_at: row.updated_at
                });
            }
        }
    );
});

// Get all content sections (admin only)
router.get('/', authMiddleware, (req, res) => {
    db.all("SELECT * FROM site_content ORDER BY section", [], (err, rows) => {
        if (err) {
            return res.status(500).json({ error: 'Failed to fetch content' });
        }

        const parsedRows = rows.map(row => {
            try {
                return {
                    ...row,
                    content: JSON.parse(row.content)
                };
            } catch {
                return row;
            }
        });

        res.json(parsedRows);
    });
});

// Update content section (admin only)
router.put('/:section', authMiddleware, (req, res) => {
    const { section } = req.params;
    const { content } = req.body;

    if (!content) {
        return res.status(400).json({ error: 'Content is required' });
    }

    const contentString = typeof content === 'object' ? JSON.stringify(content) : content;

    db.run(
        `INSERT OR REPLACE INTO site_content (section, content, updated_at)
         VALUES (?, ?, CURRENT_TIMESTAMP)`,
        [section, contentString],
        function(err) {
            if (err) {
                return res.status(500).json({ error: 'Failed to update content' });
            }
            res.json({
                message: 'Content updated successfully',
                section: section
            });
        }
    );
});

// Create new content section (admin only)
router.post('/', authMiddleware, (req, res) => {
    const { section, content } = req.body;

    if (!section || !content) {
        return res.status(400).json({ error: 'Section and content are required' });
    }

    const contentString = typeof content === 'object' ? JSON.stringify(content) : content;

    db.run(
        "INSERT INTO site_content (section, content) VALUES (?, ?)",
        [section, contentString],
        function(err) {
            if (err) {
                if (err.message.includes('UNIQUE')) {
                    return res.status(400).json({ error: 'Section already exists' });
                }
                return res.status(500).json({ error: 'Failed to create content section' });
            }
            res.json({
                id: this.lastID,
                section: section,
                message: 'Content section created successfully'
            });
        }
    );
});

// Delete content section (admin only)
router.delete('/:section', authMiddleware, (req, res) => {
    const { section } = req.params;

    // Prevent deletion of core sections
    const protectedSections = ['hero', 'about', 'process'];
    if (protectedSections.includes(section)) {
        return res.status(400).json({ error: 'Cannot delete protected section' });
    }

    db.run(
        "DELETE FROM site_content WHERE section = ?",
        [section],
        function(err) {
            if (err) {
                return res.status(500).json({ error: 'Failed to delete content section' });
            }
            if (this.changes === 0) {
                return res.status(404).json({ error: 'Content section not found' });
            }
            res.json({ message: 'Content section deleted successfully' });
        }
    );
});

module.exports = router;
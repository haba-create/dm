const sharp = require('sharp');
const path = require('path');
const fs = require('fs').promises;

// Image processing configuration
const config = {
    maxWidth: 1920,
    maxHeight: 1920,
    quality: 85,
    thumbnailWidth: 400,
    thumbnailHeight: 400,
    thumbnailQuality: 80,
    formats: ['jpeg', 'png', 'webp', 'gif']
};

/**
 * Process uploaded image - optimize, resize, strip EXIF, generate thumbnail
 */
async function processImage(filePath) {
    const ext = path.extname(filePath).toLowerCase();
    const baseName = path.basename(filePath, ext);
    const dirPath = path.dirname(filePath);

    try {
        // Read the image
        const image = sharp(filePath);
        const metadata = await image.metadata();

        // Determine output format
        let outputFormat = metadata.format;
        if (outputFormat === 'jpg') outputFormat = 'jpeg';

        // Process main image - resize if needed and optimize
        const mainImage = sharp(filePath)
            .rotate() // Auto-rotate based on EXIF orientation, then strip EXIF
            .resize(config.maxWidth, config.maxHeight, {
                fit: 'inside',
                withoutEnlargement: true
            });

        // Apply format-specific optimizations
        let optimizedBuffer;
        let finalExt = ext;

        if (outputFormat === 'jpeg' || outputFormat === 'jpg') {
            optimizedBuffer = await mainImage
                .jpeg({ quality: config.quality, progressive: true })
                .toBuffer();
            finalExt = '.jpg';
        } else if (outputFormat === 'png') {
            optimizedBuffer = await mainImage
                .png({ compressionLevel: 8, progressive: true })
                .toBuffer();
            finalExt = '.png';
        } else if (outputFormat === 'webp') {
            optimizedBuffer = await mainImage
                .webp({ quality: config.quality })
                .toBuffer();
            finalExt = '.webp';
        } else if (outputFormat === 'gif') {
            // For GIF, just pass through with minimal processing
            optimizedBuffer = await mainImage.toBuffer();
            finalExt = '.gif';
        } else {
            // Default to JPEG for unknown formats
            optimizedBuffer = await mainImage
                .jpeg({ quality: config.quality, progressive: true })
                .toBuffer();
            finalExt = '.jpg';
        }

        // Generate optimized filename
        const optimizedFilename = `${baseName}-optimized${finalExt}`;
        const optimizedPath = path.join(dirPath, optimizedFilename);

        // Write optimized image
        await fs.writeFile(optimizedPath, optimizedBuffer);

        // Generate thumbnail
        const thumbnailFilename = `${baseName}-thumb${finalExt}`;
        const thumbnailPath = path.join(dirPath, thumbnailFilename);

        const thumbnailImage = sharp(filePath)
            .rotate()
            .resize(config.thumbnailWidth, config.thumbnailHeight, {
                fit: 'cover',
                position: 'center'
            });

        let thumbnailBuffer;
        if (outputFormat === 'jpeg' || outputFormat === 'jpg') {
            thumbnailBuffer = await thumbnailImage
                .jpeg({ quality: config.thumbnailQuality })
                .toBuffer();
        } else if (outputFormat === 'png') {
            thumbnailBuffer = await thumbnailImage
                .png({ compressionLevel: 8 })
                .toBuffer();
        } else if (outputFormat === 'webp') {
            thumbnailBuffer = await thumbnailImage
                .webp({ quality: config.thumbnailQuality })
                .toBuffer();
        } else {
            thumbnailBuffer = await thumbnailImage
                .jpeg({ quality: config.thumbnailQuality })
                .toBuffer();
        }

        await fs.writeFile(thumbnailPath, thumbnailBuffer);

        // Get file sizes for logging
        const originalStats = await fs.stat(filePath);
        const optimizedStats = await fs.stat(optimizedPath);
        const thumbnailStats = await fs.stat(thumbnailPath);

        // Delete original file (keep optimized)
        await fs.unlink(filePath);

        // Rename optimized to original filename for consistency
        const finalPath = path.join(dirPath, `${baseName}${finalExt}`);
        await fs.rename(optimizedPath, finalPath);

        const result = {
            success: true,
            mainImage: {
                path: finalPath,
                filename: `${baseName}${finalExt}`,
                originalSize: originalStats.size,
                optimizedSize: optimizedStats.size,
                savings: Math.round((1 - optimizedStats.size / originalStats.size) * 100)
            },
            thumbnail: {
                path: thumbnailPath,
                filename: thumbnailFilename,
                size: thumbnailStats.size
            },
            metadata: {
                width: metadata.width,
                height: metadata.height,
                format: metadata.format
            }
        };

        console.log(`[ImageProcessor] Processed: ${baseName}${finalExt}`);
        console.log(`  - Original: ${(originalStats.size / 1024).toFixed(1)}KB`);
        console.log(`  - Optimized: ${(optimizedStats.size / 1024).toFixed(1)}KB (${result.mainImage.savings}% saved)`);
        console.log(`  - Thumbnail: ${(thumbnailStats.size / 1024).toFixed(1)}KB`);

        return result;
    } catch (error) {
        console.error('[ImageProcessor] Error processing image:', error);
        throw error;
    }
}

/**
 * Express middleware to process uploaded images
 */
function imageProcessorMiddleware(req, res, next) {
    if (!req.file) {
        return next();
    }

    const filePath = req.file.path;

    processImage(filePath)
        .then(result => {
            // Attach processing result to request
            req.imageProcessing = result;

            // Update file info with processed image
            const dirPath = path.dirname(req.file.path);
            req.file.filename = result.mainImage.filename;
            req.file.path = result.mainImage.path;
            req.file.thumbnailFilename = result.thumbnail.filename;
            req.file.thumbnailPath = result.thumbnail.path;

            next();
        })
        .catch(error => {
            console.error('[ImageProcessor] Middleware error:', error);
            // Continue without processing if there's an error
            // The original file is still available
            next();
        });
}

/**
 * Delete image and its thumbnail
 */
async function deleteImageWithThumbnail(imagePath) {
    try {
        const ext = path.extname(imagePath);
        const baseName = path.basename(imagePath, ext);
        const dirPath = path.dirname(imagePath);
        const thumbnailPath = path.join(dirPath, `${baseName}-thumb${ext}`);

        // Delete main image
        await fs.unlink(imagePath).catch(() => {});

        // Delete thumbnail if exists
        await fs.unlink(thumbnailPath).catch(() => {});

        console.log(`[ImageProcessor] Deleted: ${imagePath} and thumbnail`);
    } catch (error) {
        console.error('[ImageProcessor] Error deleting image:', error);
    }
}

/**
 * Get image dimensions
 */
async function getImageDimensions(filePath) {
    try {
        const metadata = await sharp(filePath).metadata();
        return {
            width: metadata.width,
            height: metadata.height,
            format: metadata.format
        };
    } catch (error) {
        console.error('[ImageProcessor] Error getting dimensions:', error);
        return null;
    }
}

module.exports = {
    processImage,
    imageProcessorMiddleware,
    deleteImageWithThumbnail,
    getImageDimensions,
    config
};

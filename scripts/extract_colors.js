const fs = require('fs');
const path = require('path');

// Try to load canvas, but make it optional
let canvas, loadImage;
try {
    const canvasModule = require('canvas');
    canvas = canvasModule.createCanvas;
    loadImage = canvasModule.loadImage;
} catch (error) {
    console.warn('⚠️  Canvas module not available. Color extraction will be skipped.');
    console.warn('   Install canvas with: npm install canvas (requires system dependencies)');
    console.warn('   Or colors will be extracted client-side in the browser.\n');
}

const BOOKS_JSON = path.join(__dirname, '../public/data/books.json');
const COVERS_DIR = path.join(__dirname, '../public/images/covers');

// Simple color quantization - find dominant color
function getDominantColor(imageData) {
    const data = imageData.data;
    const colorCounts = {};

    // Sample every 10th pixel for performance
    for (let i = 0; i < data.length; i += 40) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];

        // Quantize to reduce color space
        const qr = Math.floor(r / 32) * 32;
        const qg = Math.floor(g / 32) * 32;
        const qb = Math.floor(b / 32) * 32;
        const key = `${qr},${qg},${qb}`;

        colorCounts[key] = (colorCounts[key] || 0) + 1;
    }

    // Find most common color
    let maxCount = 0;
    let dominantKey = '128,128,128'; // Default gray

    for (const [key, count] of Object.entries(colorCounts)) {
        if (count > maxCount) {
            maxCount = count;
            dominantKey = key;
        }
    }

    const [r, g, b] = dominantKey.split(',').map(Number);
    return { r, g, b };
}

// Calculate contrasting text color (black or white)
function getContrastColor(r, g, b) {
    // Calculate relative luminance
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    return luminance > 0.5 ? '#1f1f2e' : '#ffffff';
}

function rgbToHex(r, g, b) {
    return '#' + [r, g, b].map(x => {
        const hex = x.toString(16);
        return hex.length === 1 ? '0' + hex : hex;
    }).join('');
}

async function extractColorFromCover(coverPath) {
    if (!coverPath || !fs.existsSync(path.join(__dirname, '../public', coverPath))) {
        return {
            backgroundColor: '#f0f0f0',
            textColor: '#1f1f2e'
        };
    }

    // If canvas is not available, return default colors
    if (!canvas || !loadImage) {
        return {
            backgroundColor: '#f0f0f0',
            textColor: '#1f1f2e'
        };
    }

    try {
        const fullPath = path.join(__dirname, '../public', coverPath);
        const image = await loadImage(fullPath);

        // Create canvas and draw image
        const canvasInstance = canvas(image.width, image.height);
        const ctx = canvasInstance.getContext('2d');
        ctx.drawImage(image, 0, 0);

        // Get image data
        const imageData = ctx.getImageData(0, 0, image.width, image.height);

        // Extract dominant color
        const { r, g, b } = getDominantColor(imageData);
        const backgroundColor = rgbToHex(r, g, b);
        const textColor = getContrastColor(r, g, b);

        return { backgroundColor, textColor };
    } catch (error) {
        console.error(`Error extracting color from ${coverPath}:`, error.message);
        return {
            backgroundColor: '#f0f0f0',
            textColor: '#1f1f2e'
        };
    }
}

async function extractAllColors() {
    console.log('🎨 Extracting colors from book covers...\n');

    if (!fs.existsSync(BOOKS_JSON)) {
        console.error('❌ books.json not found. Run process_books_data.js first.');
        process.exit(1);
    }

    const books = JSON.parse(fs.readFileSync(BOOKS_JSON, 'utf-8'));
    console.log(`Processing ${books.length} books\n`);

    for (let i = 0; i < books.length; i++) {
        const book = books[i];
        console.log(`[${i + 1}/${books.length}] Extracting color from: ${book.title.substring(0, 50)}...`);

        const colors = await extractColorFromCover(book.cover);
        book.backgroundColor = colors.backgroundColor;
        book.textColor = colors.textColor;
    }

    // Save updated books data
    fs.writeFileSync(BOOKS_JSON, JSON.stringify(books, null, 2));

    console.log(`\n✅ Extracted colors for ${books.length} books\n`);
}

// Run if called directly
if (require.main === module) {
    extractAllColors().catch(console.error);
}

module.exports = { extractAllColors, extractColorFromCover };


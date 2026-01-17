const fs = require('fs');
const path = require('path');
const csv = require('csv-parser');

// Configuration - Allow override via environment variables or command line args
const UNIQUE_CSV = process.env.UNIQUE_CSV ||
    process.argv[2] ||
    path.join(__dirname, '../seenunseen_books_20251230_090116_unique.csv');
const EXPANDED_CSV = process.env.EXPANDED_CSV ||
    process.argv[3] ||
    path.join(__dirname, '../seenunseen_books_20251230_090116_expanded.csv');
const OUTPUT_JSON = path.join(__dirname, '../public/data/books.json');

async function parseCSV(filePath) {
    return new Promise((resolve, reject) => {
        const results = [];
        fs.createReadStream(filePath)
            .pipe(csv())
            .on('data', (data) => results.push(data))
            .on('end', () => resolve(results))
            .on('error', reject);
    });
}

function generateId(asin) {
    // Generate a short ID from ASIN
    return asin.replace(/[^A-Z0-9]/g, '').substring(0, 10);
}

function calculateSpineWidth(episodeCount) {
    // Base width + episode count multiplier
    // More episodes = wider spine (proxy for popularity/importance)
    const baseWidth = 40;
    const multiplier = 3;
    const maxWidth = 120;
    const width = baseWidth + (episodeCount * multiplier);
    return Math.min(width, maxWidth);
}

function sanitizeTitle(title) {
    // Clean up titles that have HTML artifacts or are generic
    if (!title || title === 'Amazon Book Link' || title.length < 3) {
        return null;
    }

    // Remove HTML-like artifacts
    let cleaned = title
        .replace(/tag=maswe-21.*$/i, '')
        .replace(/target=["']_blank["']/gi, '')
        .replace(/rel=["']noopener["']/gi, '')
        .replace(/data-saferedirecturl=["'][^"']*["']/gi, '')
        .trim();

    // If it's just numbers or very short, skip
    if (/^\d+$/.test(cleaned) || cleaned.length < 3) {
        return null;
    }

    return cleaned || null;
}

async function processBooksData() {
    console.log('📚 Processing books data...\n');

    // Check if CSV files exist
    if (!fs.existsSync(UNIQUE_CSV)) {
        console.error(`❌ Error: CSV file not found: ${UNIQUE_CSV}\n`);
        console.error('Please provide the path to the unique books CSV file.\n');
        console.error('Usage options:');
        console.error('  1. Set UNIQUE_CSV and EXPANDED_CSV environment variables:');
        console.error('     UNIQUE_CSV=./path/to/unique.csv EXPANDED_CSV=./path/to/expanded.csv npm run process-data');
        console.error('  2. Pass CSV paths as command line arguments:');
        console.error('     node scripts/process_books_data.js ./path/to/unique.csv ./path/to/expanded.csv');
        console.error('  3. Update the CSV file paths in scripts/process_books_data.js\n');

        // Check if books.json already exists
        if (fs.existsSync(OUTPUT_JSON)) {
            const stats = fs.statSync(OUTPUT_JSON);
            const sizeMB = (stats.size / 1024 / 1024).toFixed(2);
            console.log(`ℹ️  Note: books.json already exists (${sizeMB}MB)`);
            console.log('   If you want to regenerate it, you need to provide the CSV files.\n');
        }

        process.exit(1);
    }

    if (!fs.existsSync(EXPANDED_CSV)) {
        console.error(`❌ Error: CSV file not found: ${EXPANDED_CSV}\n`);
        console.error('Please provide the path to the expanded books CSV file.\n');
        process.exit(1);
    }

    // Read both CSV files
    console.log(`Reading unique books CSV: ${path.basename(UNIQUE_CSV)}`);
    const uniqueBooks = await parseCSV(UNIQUE_CSV);
    console.log(`Found ${uniqueBooks.length} unique books\n`);

    console.log(`Reading expanded books CSV: ${path.basename(EXPANDED_CSV)}`);
    const expandedBooks = await parseCSV(EXPANDED_CSV);
    console.log(`Found ${expandedBooks.length} book-episode entries\n`);

    // Create a map of ASIN to episode details
    const episodeMap = new Map();
    expandedBooks.forEach((entry) => {
        const asin = entry.ASIN;
        if (!episodeMap.has(asin)) {
            episodeMap.set(asin, []);
        }

        // Deduplicate episodes by episode number
        const episodeNum = parseInt(entry['Episode Number']) || 0;
        const existing = episodeMap.get(asin).find(e => e.episodeNum === episodeNum);

        if (!existing) {
            episodeMap.get(asin).push({
                episodeNum: episodeNum,
                episodeTitle: entry['Episode Title'] || '',
                episodeDate: entry['Episode Date'] || '',
                episodeUrl: entry['Episode URL'] || ''
            });
        }
    });

    // Process unique books
    const processedBooks = [];

    for (const book of uniqueBooks) {
        const asin = book.ASIN.replace(/"/g, '');
        const title = sanitizeTitle(book['Book Title'].replace(/"/g, ''));

        // Skip if title is invalid
        if (!title) {
            console.log(`⚠️  Skipping book with invalid title: ASIN ${asin}`);
            continue;
        }

        const amazonLink = book['Amazon Link'].replace(/"/g, '');
        const episodeCount = parseInt(book['Episode Count']) || 0;
        const episodes = episodeMap.get(asin) || [];

        // Sort episodes by episode number
        episodes.sort((a, b) => a.episodeNum - b.episodeNum);

        const bookData = {
            id: generateId(asin),
            asin: asin,
            title: title,
            amazonLink: amazonLink,
            episodeCount: episodeCount,
            episodes: episodes,
            // These will be filled in by the cover fetching script
            cover: null,
            backgroundColor: '#f0f0f0', // Default light gray
            textColor: '#1f1f2e', // Default dark text
            spineWidth: calculateSpineWidth(episodeCount),
            height: 384 // Standard book height
        };

        processedBooks.push(bookData);
    }

    // Sort books by title for better organization
    processedBooks.sort((a, b) => a.title.localeCompare(b.title));

    // Ensure output directory exists
    const outputDir = path.dirname(OUTPUT_JSON);
    if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
    }

    // Write JSON file (minified in production, pretty-printed in development)
    const isProduction = process.env.NODE_ENV === 'production'
    fs.writeFileSync(
        OUTPUT_JSON,
        isProduction
            ? JSON.stringify(processedBooks)  // Minified
            : JSON.stringify(processedBooks, null, 2)  // Pretty for dev
    );

    console.log(`\n✅ Processed ${processedBooks.length} books`);
    console.log(`📄 Output saved to: ${OUTPUT_JSON}\n`);

    // Print summary
    const totalEpisodes = processedBooks.reduce((sum, book) => sum + book.episodeCount, 0);
    const avgEpisodes = (totalEpisodes / processedBooks.length).toFixed(2);

    console.log('📊 Summary:');
    console.log(`   Total books: ${processedBooks.length}`);
    console.log(`   Total episode mentions: ${totalEpisodes}`);
    console.log(`   Average episodes per book: ${avgEpisodes}`);
    console.log(`   Books with 1 episode: ${processedBooks.filter(b => b.episodeCount === 1).length}`);
    console.log(`   Books with 5+ episodes: ${processedBooks.filter(b => b.episodeCount >= 5).length}\n`);

    return processedBooks;
}

// Run if called directly
if (require.main === module) {
    processBooksData().catch(console.error);
}

module.exports = { processBooksData };


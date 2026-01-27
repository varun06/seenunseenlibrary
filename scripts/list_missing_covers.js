const fs = require('fs');
const path = require('path');

const BOOKS_JSON = path.join(__dirname, '../public/data/books.json');
const COVERS_DIR = path.join(__dirname, '../public/images/covers');

function listMissingCovers() {
    console.log('📚 Checking for books with missing covers...\n');

    if (!fs.existsSync(BOOKS_JSON)) {
        console.error('❌ books.json not found. Run process_books_data.js first.');
        process.exit(1);
    }

    const books = JSON.parse(fs.readFileSync(BOOKS_JSON, 'utf-8'));
    const booksMissingCovers = [];

    for (const book of books) {
        const hasCoverField = book.cover && book.cover.trim() !== '';
        let hasCoverFile = false;

        if (hasCoverField) {
            // Extract the filename from the cover path
            const coverPath = book.cover.startsWith('/')
                ? path.join(__dirname, '..', 'public', book.cover)
                : path.join(COVERS_DIR, `${book.id}.jpg`);
            hasCoverFile = fs.existsSync(coverPath);
        }

        // Book is missing cover if:
        // 1. No cover field, OR
        // 2. Cover field exists but file doesn't exist
        if (!hasCoverField || !hasCoverFile) {
            booksMissingCovers.push({
                id: book.id,
                title: book.title,
                asin: book.asin,
                episodeCount: book.episodeCount || 0,
                hasCoverField: hasCoverField,
                hasCoverFile: hasCoverFile
            });
        }
    }

    console.log(`Found ${books.length} total books`);
    console.log(`  ${books.length - booksMissingCovers.length} have covers`);
    console.log(`  ${booksMissingCovers.length} missing covers\n`);

    if (booksMissingCovers.length === 0) {
        console.log('✅ All books have covers!\n');
        return;
    }

    // Sort by episode count (descending) to show most mentioned books first
    booksMissingCovers.sort((a, b) => b.episodeCount - a.episodeCount);

    console.log('='.repeat(80));
    console.log('📋 Books Missing Covers:');
    console.log('='.repeat(80));
    console.log();

    booksMissingCovers.forEach((book, index) => {
        const status = !book.hasCoverField 
            ? '❌ No cover field' 
            : '⚠️  Cover field exists but file missing';
        
        console.log(`${index + 1}. ${book.title}`);
        console.log(`   ASIN: ${book.asin}`);
        console.log(`   ID: ${book.id}`);
        console.log(`   Episodes: ${book.episodeCount}`);
        console.log(`   Status: ${status}`);
        console.log();
    });

    // Also create a summary file
    const summaryPath = path.join(__dirname, '../missing_covers_list.txt');
    const summaryContent = booksMissingCovers
        .map((book, index) => {
            return `${index + 1}. ${book.title} (ASIN: ${book.asin}, Episodes: ${book.episodeCount})`;
        })
        .join('\n');

    fs.writeFileSync(summaryPath, `Books Missing Covers (${booksMissingCovers.length} total)\n\n${summaryContent}\n`);
    console.log(`\n💾 Summary saved to: ${summaryPath}`);
    console.log();
}

listMissingCovers();

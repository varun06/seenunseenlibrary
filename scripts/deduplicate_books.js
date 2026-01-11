const fs = require('fs');
const path = require('path');

const BOOKS_JSON = path.join(__dirname, '../public/data/books.json');

console.log('🔍 Checking for duplicate books...\n');

if (!fs.existsSync(BOOKS_JSON)) {
    console.error('❌ books.json not found!');
    process.exit(1);
}

const books = JSON.parse(fs.readFileSync(BOOKS_JSON, 'utf-8'));
console.log(`📚 Total books before deduplication: ${books.length}`);

// Deduplicate by ID (keep first occurrence, merge episodes if needed)
const uniqueBooksMap = new Map();
const duplicates = [];

books.forEach((book, index) => {
    if (uniqueBooksMap.has(book.id)) {
        const existing = uniqueBooksMap.get(book.id);
        duplicates.push({
            index,
            id: book.id,
            title: book.title,
            existingIndex: existing.originalIndex
        });

        // Merge episodes (add unique episodes)
        const existingEpisodeNums = new Set(existing.episodes.map(e => e.episodeNum));
        book.episodes.forEach(ep => {
            if (!existingEpisodeNums.has(ep.episodeNum)) {
                existing.episodes.push(ep);
            }
        });

        // Recalculate episode count
        existing.episodeCount = existing.episodes.length;
        existing.spineWidth = calculateSpineWidth(existing.episodeCount);

        // Use better cover if existing doesn't have one
        if (!existing.cover && book.cover) {
            existing.cover = book.cover;
        }
    } else {
        uniqueBooksMap.set(book.id, {
            ...book,
            originalIndex: index
        });
    }
});

function calculateSpineWidth(episodeCount) {
    const baseWidth = 40;
    const multiplier = 3;
    const maxWidth = 120;
    const width = baseWidth + (episodeCount * multiplier);
    return Math.min(width, maxWidth);
}

const uniqueBooks = Array.from(uniqueBooksMap.values());

// Sort by title
uniqueBooks.sort((a, b) => a.title.localeCompare(b.title));

console.log(`✅ Unique books after deduplication: ${uniqueBooks.length}`);
console.log(`🗑️  Duplicates removed: ${duplicates.length}\n`);

if (duplicates.length > 0) {
    console.log('📋 Duplicate entries found and merged:');
    duplicates.slice(0, 20).forEach(dup => {
        console.log(`   - ID: ${dup.id} "${dup.title.substring(0, 50)}"`);
    });
    if (duplicates.length > 20) {
        console.log(`   ... and ${duplicates.length - 20} more`);
    }
    console.log('');
}

// Backup original file
const backupPath = BOOKS_JSON + '.backup.' + Date.now();
fs.writeFileSync(backupPath, JSON.stringify(books, null, 2));
console.log(`💾 Backup saved to: ${path.basename(backupPath)}\n`);

// Write deduplicated books
fs.writeFileSync(BOOKS_JSON, JSON.stringify(uniqueBooks, null, 2));

console.log('✅ Deduplication complete!');
console.log(`📄 Updated books.json with ${uniqueBooks.length} unique books\n`);

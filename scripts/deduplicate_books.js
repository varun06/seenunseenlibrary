const fs = require('fs');
const path = require('path');

const BOOKS_JSON = path.join(__dirname, '../public/data/books.json');

function calculateSpineWidth(episodeCount) {
    const baseWidth = 40;
    const multiplier = 3;
    const maxWidth = 120;
    const width = baseWidth + (episodeCount * multiplier);
    return Math.min(width, maxWidth);
}

// Normalize title for comparison (lowercase, trim, remove HTML entities)
function normalizeTitle(title) {
    return title
        .toLowerCase()
        .trim()
        .replace(/&#8217;/g, "'")
        .replace(/&amp;/g, '&')
        .replace(/&quot;/g, '"')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>');
}

/**
 * Deduplicate books by ID and normalized title
 * @param {Array} books - Array of book objects
 * @returns {Object} - Object with deduplicated books and stats
 */
function deduplicateBooks(books) {
    const initialCount = books.length;

    // First, deduplicate by ID (keep first occurrence, merge episodes if needed)
    const uniqueByIdMap = new Map();
    const idDuplicates = [];

    books.forEach((book, index) => {
        if (uniqueByIdMap.has(book.id)) {
            const existing = uniqueByIdMap.get(book.id);
            idDuplicates.push({
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
            uniqueByIdMap.set(book.id, {
                ...book,
                originalIndex: index
            });
        }
    });

    const booksById = Array.from(uniqueByIdMap.values());

    // Then, deduplicate by normalized title (keep the one with more episodes)
    const uniqueByTitleMap = new Map();
    const titleDuplicates = [];

    booksById.forEach((book, index) => {
        const normalizedTitle = normalizeTitle(book.title);

        if (uniqueByTitleMap.has(normalizedTitle)) {
            const existing = uniqueByTitleMap.get(normalizedTitle);
            titleDuplicates.push({
                index,
                id: book.id,
                title: book.title,
                existingId: existing.id,
                existingTitle: existing.title
            });

            // Keep the book with more episodes
            if (book.episodeCount > existing.episodeCount ||
                (book.episodeCount === existing.episodeCount && book.cover && !existing.cover)) {
                // Merge episodes from the existing one into this one
                const existingEpisodeNums = new Set(book.episodes.map(e => e.episodeNum));
                existing.episodes.forEach(ep => {
                    if (!existingEpisodeNums.has(ep.episodeNum)) {
                        book.episodes.push(ep);
                    }
                });

                // Recalculate episode count
                book.episodeCount = book.episodes.length;
                book.spineWidth = calculateSpineWidth(book.episodeCount);

                // Use better cover
                if (!book.cover && existing.cover) {
                    book.cover = existing.cover;
                }

                // Replace in map
                uniqueByTitleMap.set(normalizedTitle, book);
            } else {
                // Merge episodes from this book into existing
                const existingEpisodeNums = new Set(existing.episodes.map(e => e.episodeNum));
                book.episodes.forEach(ep => {
                    if (!existingEpisodeNums.has(ep.episodeNum)) {
                        existing.episodes.push(ep);
                    }
                });

                // Recalculate episode count
                existing.episodeCount = existing.episodes.length;
                existing.spineWidth = calculateSpineWidth(existing.episodeCount);

                // Use better cover
                if (!existing.cover && book.cover) {
                    existing.cover = book.cover;
                }
            }
        } else {
            uniqueByTitleMap.set(normalizedTitle, { ...book });
        }
    });

    const uniqueBooks = Array.from(uniqueByTitleMap.values());
    const duplicates = [...idDuplicates, ...titleDuplicates];

    // Sort by title
    uniqueBooks.sort((a, b) => a.title.localeCompare(b.title));

    return {
        books: uniqueBooks,
        stats: {
            initialCount,
            afterIdDedup: booksById.length,
            afterTitleDedup: uniqueBooks.length,
            idDuplicates: idDuplicates.length,
            titleDuplicates: titleDuplicates.length,
            totalDuplicates: duplicates.length,
            idDuplicatesList: idDuplicates,
            titleDuplicatesList: titleDuplicates
        }
    };
}

// Main execution when run as script
function runDeduplication() {
    console.log('🔍 Checking for duplicate books...\n');

    if (!fs.existsSync(BOOKS_JSON)) {
        console.error('❌ books.json not found!');
        process.exit(1);
    }

    const books = JSON.parse(fs.readFileSync(BOOKS_JSON, 'utf-8'));
    console.log(`📚 Total books before deduplication: ${books.length}`);

    const result = deduplicateBooks(books);
    const { books: uniqueBooks, stats } = result;

    console.log(`✅ Unique books after ID deduplication: ${stats.afterIdDedup}`);
    console.log(`✅ Unique books after title deduplication: ${stats.afterTitleDedup}`);
    console.log(`🗑️  Duplicates removed: ${stats.totalDuplicates}\n`);

    if (stats.idDuplicates > 0) {
        console.log(`📋 Duplicate IDs found and merged: ${stats.idDuplicates}`);
    }

    if (stats.titleDuplicates > 0) {
        console.log(`📋 Duplicate titles found and merged: ${stats.titleDuplicates}`);
        console.log('   Sample duplicates:');
        stats.titleDuplicatesList.slice(0, 10).forEach(dup => {
            console.log(`   - "${dup.title.substring(0, 50)}" (IDs: ${dup.id} → ${dup.existingId})`);
        });
        if (stats.titleDuplicates > 10) {
            console.log(`   ... and ${stats.titleDuplicates - 10} more`);
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
}

if (require.main === module) {
    runDeduplication();
}

module.exports = { deduplicateBooks };


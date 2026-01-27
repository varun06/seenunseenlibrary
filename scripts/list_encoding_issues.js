const fs = require('fs');
const path = require('path');

const BOOKS_JSON = path.join(__dirname, '../public/data/books.json');

function listEncodingIssues() {
    console.log('🔍 Checking for HTML entity encoding issues in book titles...\n');

    if (!fs.existsSync(BOOKS_JSON)) {
        console.error('❌ books.json not found.');
        process.exit(1);
    }

    const books = JSON.parse(fs.readFileSync(BOOKS_JSON, 'utf-8'));
    const booksWithIssues = [];

    for (const book of books) {
        const title = book.title || '';
        
        // Check if title contains HTML entities
        if (title && (
            title.includes('&#') || 
            title.includes('&amp;') || 
            title.includes('&quot;') || 
            title.includes('&lt;') || 
            title.includes('&gt;') ||
            title.includes('&apos;') ||
            title.includes('&nbsp;')
        )) {
            booksWithIssues.push({
                id: book.id,
                title: book.title,
                asin: book.asin,
                episodeCount: book.episodeCount || 0
            });
        }
    }

    console.log(`Found ${books.length} total books`);
    console.log(`  ${books.length - booksWithIssues.length} have clean titles`);
    console.log(`  ${booksWithIssues.length} have HTML entity encoding issues\n`);

    if (booksWithIssues.length === 0) {
        console.log('✅ No encoding issues found!\n');
        return;
    }

    // Sort by episode count (descending)
    booksWithIssues.sort((a, b) => b.episodeCount - a.episodeCount);

    console.log('='.repeat(80));
    console.log('📋 Books with HTML Entity Encoding Issues:');
    console.log('='.repeat(80));
    console.log();

    booksWithIssues.forEach((book, index) => {
        console.log(`${index + 1}. ${book.title}`);
        console.log(`   ASIN: ${book.asin}`);
        console.log(`   ID: ${book.id}`);
        console.log(`   Episodes: ${book.episodeCount}`);
        console.log();
    });

    // Save to file
    const summaryPath = path.join(__dirname, '../encoding_issues_list.txt');
    const summaryContent = booksWithIssues
        .map((book, index) => {
            return `${index + 1}. ${book.title} (ASIN: ${book.asin}, Episodes: ${book.episodeCount})`;
        })
        .join('\n');

    fs.writeFileSync(summaryPath, `Books with HTML Entity Encoding Issues (${booksWithIssues.length} total)\n\n${summaryContent}\n`);
    console.log(`\n💾 Summary saved to: ${summaryPath}`);
    console.log();
}

listEncodingIssues();

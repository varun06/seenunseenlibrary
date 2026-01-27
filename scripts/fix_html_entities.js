const fs = require('fs');
const path = require('path');

const BOOKS_JSON = path.join(__dirname, '../public/data/books.json');

// HTML entity decoder
function decodeHtmlEntities(text) {
    if (!text) return text;
    
    // Common HTML entities
    const entities = {
        '&#8217;': "'",  // Right single quotation mark (apostrophe)
        '&#8216;': "'",  // Left single quotation mark
        '&#8220;': '"',  // Left double quotation mark
        '&#8221;': '"',  // Right double quotation mark
        '&#8211;': '–',  // En dash
        '&#8212;': '—',  // Em dash
        '&#8230;': '…',  // Horizontal ellipsis
        '&amp;': '&',    // Ampersand
        '&lt;': '<',     // Less than
        '&gt;': '>',     // Greater than
        '&quot;': '"',   // Quotation mark
        '&apos;': "'",   // Apostrophe
        '&nbsp;': ' ',  // Non-breaking space
    };

    let decoded = text;
    
    // Replace numeric entities (like &#8217;)
    decoded = decoded.replace(/&#(\d+);/g, (match, code) => {
        const charCode = parseInt(code, 10);
        // Common character codes
        if (charCode === 8217) return "'";
        if (charCode === 8216) return "'";
        if (charCode === 8220) return '"';
        if (charCode === 8221) return '"';
        if (charCode === 8211) return '–';
        if (charCode === 8212) return '—';
        if (charCode === 8230) return '…';
        // For other numeric entities, convert to actual character
        return String.fromCharCode(charCode);
    });

    // Replace named entities (like &amp;)
    for (const [entity, replacement] of Object.entries(entities)) {
        decoded = decoded.replace(new RegExp(entity.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), replacement);
    }

    return decoded;
}

function fixHtmlEntities() {
    console.log('🔧 Fixing HTML entity encoding issues in book titles...\n');

    if (!fs.existsSync(BOOKS_JSON)) {
        console.error('❌ books.json not found.');
        process.exit(1);
    }

    const books = JSON.parse(fs.readFileSync(BOOKS_JSON, 'utf-8'));
    const booksWithIssues = [];
    let fixedCount = 0;

    for (let i = 0; i < books.length; i++) {
        const book = books[i];
        const originalTitle = book.title;
        
        // Check if title contains HTML entities
        if (originalTitle && (
            originalTitle.includes('&#') || 
            originalTitle.includes('&amp;') || 
            originalTitle.includes('&quot;') || 
            originalTitle.includes('&lt;') || 
            originalTitle.includes('&gt;') ||
            originalTitle.includes('&apos;') ||
            originalTitle.includes('&nbsp;')
        )) {
            const decodedTitle = decodeHtmlEntities(originalTitle);
            
            if (decodedTitle !== originalTitle) {
                booksWithIssues.push({
                    id: book.id,
                    original: originalTitle,
                    fixed: decodedTitle
                });
                
                books[i].title = decodedTitle;
                fixedCount++;
            }
        }
    }

    if (booksWithIssues.length === 0) {
        console.log('✅ No HTML entity encoding issues found!\n');
        return;
    }

    console.log(`Found ${booksWithIssues.length} books with HTML entity encoding issues\n`);
    console.log('='.repeat(80));
    console.log('📋 Books with encoding issues (showing first 20):');
    console.log('='.repeat(80));
    console.log();

    booksWithIssues.slice(0, 20).forEach((book, index) => {
        console.log(`${index + 1}. ${book.id}`);
        console.log(`   Before: ${book.original}`);
        console.log(`   After:  ${book.fixed}`);
        console.log();
    });

    if (booksWithIssues.length > 20) {
        console.log(`... and ${booksWithIssues.length - 20} more\n`);
    }

    // Backup original file
    const backupPath = BOOKS_JSON + '.backup.' + Date.now();
    fs.copyFileSync(BOOKS_JSON, backupPath);
    console.log(`💾 Backup created: ${path.basename(backupPath)}\n`);

    // Write fixed data
    fs.writeFileSync(BOOKS_JSON, JSON.stringify(books, null, 2));
    
    console.log(`✅ Fixed ${fixedCount} book titles`);
    console.log(`📝 Updated ${BOOKS_JSON}\n`);
}

fixHtmlEntities();

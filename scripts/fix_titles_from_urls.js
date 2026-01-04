const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');
const csv = require('csv-parser');

const UNIQUE_CSV = path.join(__dirname, '../seenunseen_books_20251230_090116_unique.csv');
const OUTPUT_UNIQUE_CSV = path.join(__dirname, '../seenunseen_books_20251230_090116_unique_fixed.csv');

function isBadTitle(title) {
    if (!title) return true;

    const badPatterns = [
        /^amazon\s+book\s+link$/i,
        /^buy\s+here$/i,
        /^on\s+amazon$/i,
        /^here$/i,
        /^\d+$/,  // Just numbers
        /^click\s+here$/i,
        /^link$/i,
        /^book$/i,
        /^amazon$/i,
        /amazon\s+link/i,
        /tag=maswe/i,
        /target=["']_blank["']/i,
        /rel=["']noopener["']/i,
    ];

    const titleLower = title.toLowerCase().trim();

    for (const pattern of badPatterns) {
        if (pattern.test(titleLower)) {
            return true;
        }
    }

    // Also check if it's very short (likely not a real title)
    if (titleLower.length < 5) {
        return true;
    }

    // Check for HTML artifacts
    if (title.includes('<') || title.includes('>') || title.includes('&nbsp;')) {
        return true;
    }

    return false;
}

function extractASIN(url) {
    if (!url) return null;

    // Common patterns for ASIN in Amazon URLs
    const patterns = [
        /\/dp\/([A-Z0-9]{10})/,
        /\/gp\/product\/([A-Z0-9]{10})/,
        /\/product\/([A-Z0-9]{10})/,
        /amazon\.[^/]+\/([A-Z0-9]{10})/,
    ];

    for (const pattern of patterns) {
        const match = url.match(pattern);
        if (match) {
            return match[1];
        }
    }

    return null;
}

function fetchTitleFromAmazon(url, asin) {
    // Use ASIN to construct a clean Amazon URL
    const domain = url.includes('amazon.in') ? 'amazon.in' : 'amazon.com';
    const amazonUrl = `https://www.${domain}/dp/${asin}`;

    return new Promise((resolve) => {
        const protocol = amazonUrl.startsWith('https') ? https : http;

        const req = protocol.get(amazonUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                'Accept-Language': 'en-US,en;q=0.5',
                'Accept-Encoding': 'gzip, deflate, br',
                'Connection': 'keep-alive',
            },
            timeout: 15000
        }, (response) => {
            let data = '';

            // Handle different encodings
            const encoding = response.headers['content-encoding'];

            if (encoding === 'gzip') {
                const zlib = require('zlib');
                const gunzip = zlib.createGunzip();
                response.pipe(gunzip);
                gunzip.on('data', (chunk) => { data += chunk.toString(); });
                gunzip.on('end', () => parseTitle(data, resolve));
                gunzip.on('error', () => resolve(null));
            } else if (encoding === 'br') {
                // Brotli encoding - try to decode or skip
                response.on('data', (chunk) => { data += chunk.toString(); });
                response.on('end', () => parseTitle(data, resolve));
            } else {
                response.on('data', (chunk) => { data += chunk.toString(); });
                response.on('end', () => parseTitle(data, resolve));
            }

            response.on('error', () => resolve(null));
        });

        req.on('error', () => resolve(null));
        req.on('timeout', () => {
            req.destroy();
            resolve(null);
        });
        req.setTimeout(15000);
    });
}

function parseTitle(html, resolve) {
    if (!html) {
        resolve(null);
        return;
    }

    // Try multiple patterns to extract title
    const titlePatterns = [
        /<span[^>]*id=["']productTitle["'][^>]*>([^<]+)<\/span>/i,
        /<h1[^>]*class="[^"]*product-title[^"]*"[^>]*>([^<]+)<\/h1>/i,
        /<h1[^>]*data-automation-id=["']title["'][^>]*>([^<]+)<\/h1>/i,
        /"title":"([^"]+)"/i,
        /<title>([^<]+)<\/title>/i,
        // Try to extract from JSON-LD structured data
        /"name"\s*:\s*"([^"]+)"/i,
    ];

    for (const pattern of titlePatterns) {
        const match = html.match(pattern);
        if (match) {
            let title = match[1];

            // Clean up the title
            title = title
                .replace(/\s+/g, ' ')
                .replace(/&nbsp;/g, ' ')
                .replace(/&amp;/g, '&')
                .replace(/&quot;/g, '"')
                .replace(/&lt;/g, '<')
                .replace(/&gt;/g, '>')
                .replace(/&#39;/g, "'")
                .replace(/&#x27;/g, "'")
                .replace(/&apos;/g, "'")
                .trim();

            // Remove "Amazon.in:" or "Amazon.com:" prefix if present
            title = title.replace(/^Amazon\.(in|com):\s*/i, '');

            // Remove common suffixes
            title = title.replace(/\s*:\s*Amazon\.(in|com)$/i, '');

            if (title.length > 5 && !isBadTitle(title)) {
                resolve(title);
                return;
            }
        }
    }

    resolve(null);
}

async function fixTitlesInFile(csvPath, outputPath, isUnique = false) {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`Processing: ${path.basename(csvPath)}`);
    console.log(`${'='.repeat(60)}\n`);

    const rows = [];
    const booksToFix = [];
    const asinCache = new Map(); // Cache titles by ASIN to avoid duplicate requests

    // First pass: read all rows and identify which need fixing
    console.log('Reading CSV file...');
    await new Promise((resolve, reject) => {
        fs.createReadStream(csvPath)
            .pipe(csv())
            .on('data', (row) => {
                rows.push(row);

                const title = row['Book Title'] || '';
                const url = row['Amazon Link'] || '';
                const asin = row['ASIN'] || '';

                if (isBadTitle(title) && (url || asin)) {
                    const bookASIN = asin || extractASIN(url);
                    if (bookASIN && !asinCache.has(bookASIN)) {
                        booksToFix.push({
                            asin: bookASIN,
                            url: url,
                            rowIndex: rows.length - 1
                        });
                        asinCache.set(bookASIN, null); // Mark as needing fetch
                    }
                }
            })
            .on('end', resolve)
            .on('error', reject);
    });

    console.log(`Found ${rows.length} total rows`);
    console.log(`Found ${booksToFix.length} unique books with bad titles to fix\n`);

    if (booksToFix.length === 0) {
        console.log('✅ No books need fixing in this file!\n');
        return { fixed: 0, failed: 0, total: rows.length };
    }

    // Fetch titles
    let fixed = 0;
    let failed = 0;
    const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

    for (let i = 0; i < booksToFix.length; i++) {
        const book = booksToFix[i];
        console.log(`[${i + 1}/${booksToFix.length}] Fetching title for ASIN: ${book.asin}`);

        const title = await fetchTitleFromAmazon(book.url, book.asin);

        if (title) {
            asinCache.set(book.asin, title);
            console.log(`  ✅ Title: "${title}"`);
            fixed++;
        } else {
            console.log(`  ❌ Could not fetch title`);
            failed++;
        }

        // Rate limiting - be nice to Amazon
        if (i < booksToFix.length - 1) {
            await delay(2000); // 2 second delay between requests
        }
    }

    // Second pass: update rows with fixed titles
    console.log('\n📝 Updating CSV with fixed titles...\n');

    for (const row of rows) {
        const title = row['Book Title'] || '';
        const asin = row['ASIN'] || '';
        const url = row['Amazon Link'] || '';

        if (isBadTitle(title)) {
            const bookASIN = asin || extractASIN(url);
            if (bookASIN && asinCache.has(bookASIN) && asinCache.get(bookASIN)) {
                row['Book Title'] = asinCache.get(bookASIN);
            }
        }
    }

    // Write updated CSV
    let headers, csvContent;

    if (isUnique) {
        // Unique CSV format: ASIN,Book Title,Amazon Link,Episode Count,Episode Numbers
        headers = ['ASIN', 'Book Title', 'Amazon Link', 'Episode Count', 'Episode Numbers'];
        csvContent = headers.join(',') + '\n';

        for (const row of rows) {
            const values = [
                `"${(row['ASIN'] || '').replace(/"/g, '""')}"`,
                `"${(row['Book Title'] || '').replace(/"/g, '""')}"`,
                `"${(row['Amazon Link'] || '').replace(/"/g, '""')}"`,
                row['Episode Count'] || '0',
                `"${(row['Episode Numbers'] || '').replace(/"/g, '""')}"`
            ];
            csvContent += values.join(',') + '\n';
        }
    } else {
        // Expanded CSV format
        headers = ['Episode Number', 'Episode Title', 'Episode Date', 'ASIN', 'Book Title', 'Amazon Link', 'Episode URL'];
        csvContent = headers.join(',') + '\n';

        for (const row of rows) {
            const values = [
                row['Episode Number'] || '',
                `"${(row['Episode Title'] || '').replace(/"/g, '""')}"`,
                row['Episode Date'] || '',
                `"${(row['ASIN'] || '').replace(/"/g, '""')}"`,
                `"${(row['Book Title'] || '').replace(/"/g, '""')}"`,
                `"${(row['Amazon Link'] || '').replace(/"/g, '""')}"`,
                `"${(row['Episode URL'] || '').replace(/"/g, '""')}"`
            ];
            csvContent += values.join(',') + '\n';
        }
    }

    fs.writeFileSync(outputPath, csvContent);

    console.log(`✅ Output saved to: ${path.basename(outputPath)}\n`);

    return { fixed, failed, total: rows.length };
}

async function fixTitles() {
    console.log('📚 Fixing book titles from Amazon URLs...\n');

    // Fix unique CSV
    const uniqueResult = await fixTitlesInFile(UNIQUE_CSV, OUTPUT_UNIQUE_CSV, true);

    // Summary
    console.log(`\n${'='.repeat(60)}`);
    console.log(`✅ Title fixing complete!`);
    console.log(`${'='.repeat(60)}`);
    console.log(`\nExpanded CSV:`);
    console.log(`  Total rows: ${expandedResult.total}`);
    console.log(`  Books fixed: ${expandedResult.fixed}`);
    console.log(`  Books failed: ${expandedResult.failed}`);
    console.log(`\nUnique CSV:`);
    console.log(`  Total rows: ${uniqueResult.total}`);
    console.log(`  Books fixed: ${uniqueResult.fixed}`);
    console.log(`  Books failed: ${uniqueResult.failed}`);
    console.log(`  Output: ${path.basename(OUTPUT_UNIQUE_CSV)}`);
    console.log(`\n${'='.repeat(60)}\n`);
}

// Run if called directly
if (require.main === module) {
    fixTitles().catch(console.error);
}

module.exports = { fixTitles, isBadTitle, extractASIN, fetchTitleFromAmazon };


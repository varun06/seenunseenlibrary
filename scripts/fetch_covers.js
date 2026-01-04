const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');

const BOOKS_JSON = path.join(__dirname, '../public/data/books.json');
const COVERS_DIR = path.join(__dirname, '../public/images/covers');

// Ensure covers directory exists
if (!fs.existsSync(COVERS_DIR)) {
    fs.mkdirSync(COVERS_DIR, { recursive: true });
}

function downloadImage(url, filepath) {
    return new Promise((resolve, reject) => {
        const protocol = url.startsWith('https') ? https : http;

        const req = protocol.get(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
            },
            timeout: 10000
        }, (response) => {
            if (response.statusCode === 200) {
                const fileStream = fs.createWriteStream(filepath);
                response.pipe(fileStream);
                fileStream.on('finish', () => {
                    fileStream.close();
                    resolve(filepath);
                });
                fileStream.on('error', (err) => {
                    fs.unlink(filepath, () => { }); // Delete partial file
                    reject(err);
                });
            } else if (response.statusCode === 301 || response.statusCode === 302) {
                // Follow redirect
                const redirectUrl = response.headers.location;
                if (redirectUrl) {
                    downloadImage(redirectUrl, filepath)
                        .then(resolve)
                        .catch(reject);
                } else {
                    reject(new Error(`Redirect without location: ${response.statusCode}`));
                }
            } else {
                reject(new Error(`Failed to download: ${response.statusCode}`));
            }
        });

        req.on('error', reject);
        req.on('timeout', () => {
            req.destroy();
            reject(new Error('Request timeout'));
        });
        req.setTimeout(10000);
    });
}

async function fetchCoverFromOpenLibrary(isbn) {
    // Open Library API: https://openlibrary.org/api/books?bibkeys=ISBN:${isbn}&format=json&jscmd=data
    const url = `https://openlibrary.org/api/books?bibkeys=ISBN:${isbn}&format=json&jscmd=data`;

    return new Promise((resolve, reject) => {
        https.get(url, (response) => {
            let data = '';
            response.on('data', (chunk) => { data += chunk; });
            response.on('end', () => {
                try {
                    const json = JSON.parse(data);
                    const bookKey = `ISBN:${isbn}`;

                    if (json[bookKey] && json[bookKey].cover) {
                        // Try large cover first, then medium, then small
                        const coverUrl = json[bookKey].cover.large ||
                            json[bookKey].cover.medium ||
                            json[bookKey].cover.small;
                        resolve(coverUrl);
                    } else {
                        resolve(null);
                    }
                } catch (error) {
                    reject(error);
                }
            });
        }).on('error', reject);
    });
}

async function fetchCoverFromAmazon(asin) {
    // Amazon cover image URLs - try multiple patterns
    // These are public image URLs that don't require authentication
    const patterns = [
        // Modern Amazon CDN
        `https://m.media-amazon.com/images/P/${asin}.01._SCLZZZZZZZ_.jpg`,
        `https://m.media-amazon.com/images/I/${asin}._SL500_.jpg`,
        // Older Amazon CDN patterns
        `https://images-na.ssl-images-amazon.com/images/P/${asin}.01.L.jpg`,
        `https://images-na.ssl-images-amazon.com/images/P/${asin}.01.M.jpg`,
        `https://images-na.ssl-images-amazon.com/images/I/${asin}._AC_SL1500_.jpg`,
        // Alternative patterns
        `https://images-na.ssl-images-amazon.com/images/I/${asin}.jpg`,
    ];

    // Try each pattern and return the first one that exists
    for (const url of patterns) {
        try {
            const exists = await checkUrlExists(url);
            if (exists) {
                return url;
            }
        } catch (error) {
            // Try next pattern
            continue;
        }
    }

    return null;
}

function checkUrlExists(url) {
    return new Promise((resolve) => {
        const protocol = url.startsWith('https') ? https : http;
        const req = protocol.get(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
            },
            timeout: 5000
        }, (response) => {
            // If we get a 200, the image exists
            if (response.statusCode === 200) {
                req.destroy();
                resolve(true);
            } else if (response.statusCode === 301 || response.statusCode === 302) {
                // Follow redirect once
                const redirectUrl = response.headers.location;
                if (redirectUrl) {
                    req.destroy();
                    checkUrlExists(redirectUrl).then(resolve).catch(() => resolve(false));
                } else {
                    req.destroy();
                    resolve(false);
                }
            } else {
                req.destroy();
                resolve(false);
            }
        });

        req.on('error', () => resolve(false));
        req.on('timeout', () => {
            req.destroy();
            resolve(false);
        });
        req.setTimeout(5000);
    });
}

async function fetchCoverForBook(book, index, total, sourceStats) {
    const { asin, id } = book;

    // Skip if already has cover
    const coverPath = path.join(COVERS_DIR, `${id}.jpg`);
    if (fs.existsSync(coverPath)) {
        return { path: coverPath.replace(path.join(__dirname, '../public'), ''), source: 'existing' };
    }

    const titleDisplay = book.title.substring(0, 50);
    console.log(`[${index + 1}/${total}] 🔍 ${titleDisplay}...`);

    try {
        // Try Open Library first
        let coverUrl = await fetchCoverFromOpenLibrary(asin);
        let source = 'Open Library';

        // If not found, try Amazon
        if (!coverUrl) {
            coverUrl = await fetchCoverFromAmazon(asin);
            source = 'Amazon';
        }

        if (coverUrl) {
            try {
                await downloadImage(coverUrl, coverPath);
                console.log(`[${index + 1}/${total}] ✅ ${source}`);

                // Track source
                if (source === 'Open Library') {
                    sourceStats.openLibrary++;
                } else if (source === 'Amazon') {
                    sourceStats.amazon++;
                }

                return { path: `/images/covers/${id}.jpg`, source };
            } catch (downloadError) {
                console.log(`[${index + 1}/${total}] ⚠️  Failed to download from ${source}: ${downloadError.message}`);
                return { path: null, source: null };
            }
        } else {
            console.log(`[${index + 1}/${total}] ⚠️  No cover found`);
            return { path: null, source: null };
        }
    } catch (error) {
        console.log(`[${index + 1}/${total}] ❌ Error: ${error.message}`);
        return { path: null, source: null };
    }
}

async function fetchAllCovers() {
    console.log('🖼️  Fetching book covers...\n');

    if (!fs.existsSync(BOOKS_JSON)) {
        console.error('❌ books.json not found. Run process_books_data.js first.');
        process.exit(1);
    }

    const books = JSON.parse(fs.readFileSync(BOOKS_JSON, 'utf-8'));

    // Filter out books that already have covers
    const booksNeedingCovers = books.filter(book => {
        const coverPath = path.join(COVERS_DIR, `${book.id}.jpg`);
        return !fs.existsSync(coverPath);
    });

    const alreadyHaveCovers = books.length - booksNeedingCovers.length;

    console.log(`Found ${books.length} total books`);
    console.log(`  ${alreadyHaveCovers} already have covers`);
    console.log(`  ${booksNeedingCovers.length} need covers\n`);

    if (booksNeedingCovers.length === 0) {
        console.log('✅ All books already have covers!\n');
        return;
    }

    let updated = 0;
    const sourceStats = {
        openLibrary: 0,
        amazon: 0
    };
    const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

    for (let i = 0; i < booksNeedingCovers.length; i++) {
        const book = booksNeedingCovers[i];
        const result = await fetchCoverForBook(book, i, booksNeedingCovers.length, sourceStats);

        if (result.path) {
            // Find the book in the original array and update it
            const bookIndex = books.findIndex(b => b.id === book.id);
            if (bookIndex !== -1) {
                books[bookIndex].cover = result.path;
                updated++;
            }
        }

        // Rate limiting - be nice to APIs
        if (i < booksNeedingCovers.length - 1) {
            await delay(300); // 300ms delay between requests
        }

        // Save progress every 50 books
        if ((i + 1) % 50 === 0) {
            fs.writeFileSync(BOOKS_JSON, JSON.stringify(books, null, 2));
            console.log(`\n💾 Progress saved (${i + 1}/${booksNeedingCovers.length} processed)\n`);
        }
    }

    // Final save
    fs.writeFileSync(BOOKS_JSON, JSON.stringify(books, null, 2));

    console.log(`\n${'='.repeat(60)}`);
    console.log(`✅ Cover fetching complete!`);
    console.log(`${'='.repeat(60)}`);
    console.log(`Total books: ${books.length}`);
    console.log(`Covers fetched: ${updated}`);
    console.log(`  - From Open Library: ${sourceStats.openLibrary}`);
    console.log(`  - From Amazon: ${sourceStats.amazon}`);
    console.log(`  - Already had covers: ${alreadyHaveCovers}`);
    console.log(`  - Still missing: ${books.length - updated - alreadyHaveCovers}`);
    console.log(`${'='.repeat(60)}\n`);
}

// Run if called directly
if (require.main === module) {
    fetchAllCovers().catch(console.error);
}

module.exports = { fetchAllCovers, fetchCoverForBook };


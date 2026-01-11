const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');
const { URL } = require('url');

// Import cover fetching functions
const { fetchCoverForBook } = require('./fetch_covers');

// Configuration
const BOOKS_JSON = path.join(__dirname, '../public/data/books.json');
const COVERS_DIR = path.join(__dirname, '../public/images/covers');

// Ensure covers directory exists
if (!fs.existsSync(COVERS_DIR)) {
    fs.mkdirSync(COVERS_DIR, { recursive: true });
}

function generateId(asin) {
    // Generate a short ID from ASIN
    return asin.replace(/[^A-Z0-9]/g, '').substring(0, 10);
}

function calculateSpineWidth(episodeCount) {
    const baseWidth = 40;
    const multiplier = 3;
    const maxWidth = 120;
    const width = baseWidth + (episodeCount * multiplier);
    return Math.min(width, maxWidth);
}

function sanitizeTitle(title) {
    if (!title || title === 'Amazon Book Link' || title.length < 3) {
        return null;
    }

    let cleaned = title
        .replace(/tag=maswe-21.*$/i, '')
        .replace(/target=["']_blank["']/gi, '')
        .replace(/rel=["']noopener["']/gi, '')
        .replace(/data-saferedirecturl=["'][^"']*["']/gi, '')
        .trim();

    if (/^\d+$/.test(cleaned) || cleaned.length < 3) {
        return null;
    }

    return cleaned || null;
}

function extractEpisodeInfo(episodeUrl) {
    // Pattern: /episodes/YYYY/M/D/episode-N-TITLE/
    const pattern = /\/episodes\/(\d{4})\/(\d{1,2})\/(\d{1,2})\/(episode-(\d+)-(.+))\/$/;
    const match = episodeUrl.match(pattern);

    if (match) {
        const [, year, month, day, slug, episodeNum, titleSlug] = match;
        const episodeTitle = titleSlug.replace(/-/g, ' ')
            .replace(/\b\w/g, l => l.toUpperCase());
        const episodeDate = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;

        return {
            episodeNum: parseInt(episodeNum),
            episodeTitle: episodeTitle,
            episodeDate: episodeDate,
            episodeUrl: episodeUrl
        };
    }

    return null;
}

function extractASIN(amazonUrl) {
    // Common patterns for ASIN in Amazon URLs
    const patterns = [
        /\/dp\/([A-Z0-9]{10})/,
        /\/gp\/product\/([A-Z0-9]{10})/,
        /\/product\/([A-Z0-9]{10})/,
        /amazon\.[^/]+\/([A-Z0-9]{10})\//,
    ];

    for (const pattern of patterns) {
        const match = amazonUrl.match(pattern);
        if (match) {
            return match[1];
        }
    }

    return null;
}

function fetchHTML(url) {
    return new Promise((resolve, reject) => {
        const protocol = url.startsWith('https') ? https : http;

        const req = protocol.get(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
            },
            timeout: 30000
        }, (response) => {
            if (response.statusCode === 200) {
                let data = '';
                response.on('data', (chunk) => { data += chunk; });
                response.on('end', () => resolve(data));
            } else if (response.statusCode === 301 || response.statusCode === 302) {
                // Follow redirect
                const redirectUrl = response.headers.location;
                if (redirectUrl) {
                    const absoluteUrl = new URL(redirectUrl, url).href;
                    fetchHTML(absoluteUrl).then(resolve).catch(reject);
                } else {
                    reject(new Error(`Redirect without location: ${response.statusCode}`));
                }
            } else {
                reject(new Error(`Failed to fetch: ${response.statusCode}`));
            }
        });

        req.on('error', reject);
        req.on('timeout', () => {
            req.destroy();
            reject(new Error('Request timeout'));
        });
        req.setTimeout(30000);
    });
}

function extractBooksFromHTML(htmlContent, episodeUrl) {
    // Find all Amazon links (supports amzn.in, amazon.in, amazon.com, a.co, amzn.to)
    const amznPattern = /https?:\/\/(?:(?:www\.)?amazon\.(?:in|com)|amzn\.(?:in|to)|a\.co)\/[^\s<>"&]+/g;
    const amznMatches = htmlContent.match(amznPattern) || [];

    // Also look for Google redirect URLs that contain Amazon links
    const googleRedirectPattern = /https:\/\/www\.google\.com\/url\?q=(https?:\/\/(?:(?:www\.)?amazon\.(?:in|com)|amzn\.(?:in|to)|a\.co)\/[^&]+)/g;
    let googleMatches = [];
    let match;
    while ((match = googleRedirectPattern.exec(htmlContent)) !== null) {
        googleMatches.push(match[1]);
    }

    // Combine and deduplicate
    const allLinks = [...new Set([...amznMatches, ...googleMatches])];

    const books = [];

    for (const link of allLinks) {
        const asin = extractASIN(link);
        if (!asin) {
            console.log(`⚠️  Could not extract ASIN from: ${link}`);
            continue;
        }

        // Try to extract title from HTML context
        let title = "Amazon Book Link";

        // Pattern: find text in href="link">TITLE</a>
        const escapedLink = link.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const titlePattern = new RegExp(`<a[^>]*href=["']?[^"']*${escapedLink}[^"']*["']?[^>]*>([^<]+)</a>`, 'i');
        const titleMatch = htmlContent.match(titlePattern);

        if (titleMatch) {
            title = titleMatch[1]
                .replace(/\s+/g, ' ')
                .replace(/&nbsp;/g, ' ')
                .replace(/&amp;/g, '&')
                .replace(/&quot;/g, '"')
                .trim();
        }

        // Clean title
        const cleanedTitle = sanitizeTitle(title);
        if (!cleanedTitle) {
            console.log(`⚠️  Skipping book with invalid title: ASIN ${asin}`);
            continue;
        }

        books.push({
            asin: asin,
            title: cleanedTitle,
            amazonLink: link
        });
    }

    return books;
}

async function updateBooksJSON(newBooks, episodeInfo) {
    console.log('\n📚 Updating books.json...\n');

    // Load existing books
    let existingBooks = [];
    if (fs.existsSync(BOOKS_JSON)) {
        try {
            existingBooks = JSON.parse(fs.readFileSync(BOOKS_JSON, 'utf-8'));
        } catch (error) {
            console.error('❌ Error reading existing books.json:', error.message);
            console.log('💡 Creating new books.json file...\n');
        }
    }

    // Create a map of existing books by ASIN
    const booksMap = new Map();
    existingBooks.forEach(book => {
        booksMap.set(book.asin, book);
    });

    const newBooksList = [];
    const updatedBooksList = [];

    // Process new books
    for (const book of newBooks) {
        const existingBook = booksMap.get(book.asin);

        if (existingBook) {
            // Book already exists - check if episode is already added
            const episodeExists = existingBook.episodes.some(
                ep => ep.episodeNum === episodeInfo.episodeNum
            );

            if (!episodeExists) {
                // Add episode to existing book
                existingBook.episodes.push(episodeInfo);
                existingBook.episodes.sort((a, b) => a.episodeNum - b.episodeNum);
                existingBook.episodeCount = existingBook.episodes.length;
                existingBook.spineWidth = calculateSpineWidth(existingBook.episodeCount);
                updatedBooksList.push(existingBook);
                console.log(`✅ Updated existing book: "${existingBook.title}" (added episode ${episodeInfo.episodeNum})`);
            } else {
                console.log(`ℹ️  Book "${existingBook.title}" already has episode ${episodeInfo.episodeNum}`);
            }
        } else {
            // New book - create entry
            const bookData = {
                id: generateId(book.asin),
                asin: book.asin,
                title: book.title,
                amazonLink: book.amazonLink,
                episodeCount: 1,
                episodes: [episodeInfo],
                cover: null,
                backgroundColor: '#f0f0f0',
                textColor: '#1f1f2e',
                spineWidth: calculateSpineWidth(1),
                height: 384
            };
            newBooksList.push(bookData);
            booksMap.set(book.asin, bookData);
            console.log(`➕ New book: "${book.title}" (ASIN: ${book.asin})`);
        }
    }

    // Convert map back to array and sort
    const allBooks = Array.from(booksMap.values());
    allBooks.sort((a, b) => a.title.localeCompare(b.title));

    // Save updated books.json
    fs.writeFileSync(BOOKS_JSON, JSON.stringify(allBooks, null, 2));

    console.log(`\n✅ Updated books.json:`);
    console.log(`   Total books: ${allBooks.length}`);
    console.log(`   New books added: ${newBooksList.length}`);
    console.log(`   Existing books updated: ${updatedBooksList.length}\n`);

    return {
        newBooks: newBooksList,
        updatedBooks: updatedBooksList,
        allBooks: allBooks
    };
}

async function fetchCoversForNewBooks(newBooks) {
    if (newBooks.length === 0) {
        console.log('ℹ️  No new books to fetch covers for.\n');
        return;
    }

    console.log(`\n🖼️  Fetching covers for ${newBooks.length} new book(s)...\n`);

    const sourceStats = {
        openLibrary: 0,
        amazon: 0,
        existing: 0
    };

    const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

    for (let i = 0; i < newBooks.length; i++) {
        const book = newBooks[i];
        const result = await fetchCoverForBook(book, i, newBooks.length, sourceStats);

        if (result.path) {
            // Update book in books.json
            const books = JSON.parse(fs.readFileSync(BOOKS_JSON, 'utf-8'));
            const bookIndex = books.findIndex(b => b.id === book.id);
            if (bookIndex !== -1) {
                books[bookIndex].cover = result.path;
                fs.writeFileSync(BOOKS_JSON, JSON.stringify(books, null, 2));
            }
        }

        // Rate limiting
        if (i < newBooks.length - 1) {
            await delay(300);
        }
    }

    console.log(`\n${'='.repeat(60)}`);
    console.log(`✅ Cover fetching complete!`);
    console.log(`${'='.repeat(60)}`);
    console.log(`Covers fetched: ${newBooks.length}`);
    console.log(`  - From Open Library: ${sourceStats.openLibrary}`);
    console.log(`  - From Amazon: ${sourceStats.amazon}`);
    console.log(`  - Already had covers: ${sourceStats.existing}`);
    console.log(`${'='.repeat(60)}\n`);
}

async function processEpisode(episodeUrl) {
    console.log('='.repeat(60));
    console.log('🚀 ADDING BOOKS FROM EPISODE');
    console.log('='.repeat(60));
    console.log(`\n📺 Episode URL: ${episodeUrl}\n`);

    try {
        // Extract episode info from URL
        const episodeInfo = extractEpisodeInfo(episodeUrl);
        if (!episodeInfo) {
            console.error('❌ Could not extract episode info from URL.');
            console.error('   Expected format: /episodes/YYYY/M/D/episode-N-TITLE/');
            process.exit(1);
        }

        console.log(`📋 Episode Info:`);
        console.log(`   Number: ${episodeInfo.episodeNum}`);
        console.log(`   Title: ${episodeInfo.episodeTitle}`);
        console.log(`   Date: ${episodeInfo.episodeDate}\n`);

        // Fetch episode page HTML
        console.log('🔍 Fetching episode page...');
        const htmlContent = await fetchHTML(episodeUrl);
        console.log(`✅ Fetched ${htmlContent.length.toLocaleString()} characters\n`);

        // Extract books from HTML
        console.log('📚 Extracting book links...');
        const books = extractBooksFromHTML(htmlContent, episodeUrl);
        console.log(`✅ Found ${books.length} book(s)\n`);

        if (books.length === 0) {
            console.log('ℹ️  No books found in this episode.\n');
            return;
        }

        // Update books.json
        const { newBooks, updatedBooks } = await updateBooksJSON(books, episodeInfo);

        // Fetch covers for new books
        if (newBooks.length > 0) {
            await fetchCoversForNewBooks(newBooks);
        }

        console.log('='.repeat(60));
        console.log('✅ SUCCESS!');
        console.log('='.repeat(60));
        console.log(`   New books added: ${newBooks.length}`);
        console.log(`   Existing books updated: ${updatedBooks.length}`);
        console.log('='.repeat(60) + '\n');

    } catch (error) {
        console.error('\n❌ Error processing episode:', error.message);
        console.error(error.stack);
        process.exit(1);
    }
}

// Main execution
if (require.main === module) {
    const episodeUrl = process.argv[2];

    if (!episodeUrl) {
        console.error('❌ Please provide an episode URL as an argument.');
        console.error('\nUsage:');
        console.error('  node scripts/add_episode_books.js <episode-url>');
        console.error('\nExample:');
        console.error('  node scripts/add_episode_books.js https://seenunseen.in/episodes/2024/1/15/episode-500-some-title/');
        process.exit(1);
    }

    // Validate URL format
    try {
        new URL(episodeUrl);
    } catch (error) {
        console.error('❌ Invalid URL format:', episodeUrl);
        process.exit(1);
    }

    processEpisode(episodeUrl).catch(error => {
        console.error('❌ Fatal error:', error);
        process.exit(1);
    });
}

module.exports = { processEpisode, extractEpisodeInfo, extractBooksFromHTML, extractASIN };

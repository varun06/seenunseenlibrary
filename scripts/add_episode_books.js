const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');
const { URL } = require('url');

// Import cover fetching functions
const { fetchCoverForBook } = require('./fetch_covers');
const { deduplicateBooks } = require('./deduplicate_books');

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

function isShortLink(url) {
    return /amzn\.(in|to|com)\/d\/[A-Za-z0-9]+/.test(url);
}

function resolveShortLink(shortUrl) {
    return new Promise((resolve, reject) => {
        const protocol = shortUrl.startsWith('https') ? https : http;

        const req = protocol.get(shortUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
            },
            timeout: 10000
        }, (response) => {
            if (response.statusCode === 301 || response.statusCode === 302 || response.statusCode === 307 || response.statusCode === 308) {
                const redirectUrl = response.headers.location;
                if (redirectUrl) {
                    // Handle relative URLs
                    const absoluteUrl = new URL(redirectUrl, shortUrl).href;
                    resolve(absoluteUrl);
                } else {
                    reject(new Error('Redirect without location'));
                }
            } else if (response.statusCode === 200) {
                // If no redirect, return original URL
                resolve(shortUrl);
            } else {
                reject(new Error(`Failed to resolve: ${response.statusCode}`));
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

function extractASIN(amazonUrl) {
    // Skip author/store pages and other non-book links
    if (/\/stores\/|\/author\/|\/gp\/seller\/|\/s\?k=|ref=sr_ntt/.test(amazonUrl)) {
        return null;
    }

    // Common patterns for ASIN in Amazon URLs
    const patterns = [
        /\/dp\/([A-Z0-9]{10})/,
        /\/gp\/product\/([A-Z0-9]{10})/,
        /\/product\/([A-Z0-9]{10})/,
        /\/e\/([A-Z0-9]{10})/, // Kindle edition
        /\/ASIN\/([A-Z0-9]{10})/i,
        /\/[^/]+\/([A-Z0-9]{10})(?:\/|$|\?)/, // Generic pattern: /something/ASIN/
    ];

    for (const pattern of patterns) {
        const match = amazonUrl.match(pattern);
        if (match) {
            const asin = match[1];
            // Validate ASIN format (10 alphanumeric characters)
            if (/^[A-Z0-9]{10}$/.test(asin)) {
                return asin;
            }
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

async function extractBooksFromHTML(htmlContent, episodeUrl) {
    // Find all Amazon links (supports amzn.in, amazon.in, amazon.com, a.co, amzn.to)
    const amznPattern = /https?:\/\/(?:(?:www\.)?amazon\.(?:in|com)|amzn\.(?:in|to|com)|a\.co)\/[^\s<>"&]+/g;
    const amznMatches = htmlContent.match(amznPattern) || [];

    // Also look for Google redirect URLs that contain Amazon links
    const googleRedirectPattern = /https:\/\/www\.google\.com\/url\?q=(https?:\/\/(?:(?:www\.)?amazon\.(?:in|com)|amzn\.(?:in|to|com)|a\.co)\/[^&]+)/g;
    let googleMatches = [];
    let match;
    while ((match = googleRedirectPattern.exec(htmlContent)) !== null) {
        googleMatches.push(match[1]);
    }

    // Combine and deduplicate
    const allLinks = [...new Set([...amznMatches, ...googleMatches])];

    const books = [];
    const shortLinksMap = new Map(); // Map original short link to resolved URL

    // Separate short links from regular links
    for (const link of allLinks) {
        if (isShortLink(link)) {
            // Store short link for later resolution
            shortLinksMap.set(link, null);
        } else {
            // Try to extract ASIN directly
            const asin = extractASIN(link);
            if (asin) {
                books.push({
                    asin: asin,
                    originalLink: link, // Store original for title extraction
                    amazonLink: link,
                    title: null // Will be extracted later
                });
            }
        }
    }

    // Resolve short links
    if (shortLinksMap.size > 0) {
        console.log(`🔗 Resolving ${shortLinksMap.size} short link(s)...`);
        const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

        for (const [shortLink] of shortLinksMap) {
            try {
                const resolvedUrl = await resolveShortLink(shortLink);
                const asin = extractASIN(resolvedUrl);
                if (asin) {
                    shortLinksMap.set(shortLink, resolvedUrl);
                    books.push({
                        asin: asin,
                        originalLink: shortLink, // Store original short link for title extraction
                        amazonLink: resolvedUrl, // Store resolved URL for the actual link
                        title: null
                    });
                    console.log(`   ✅ Resolved: ${shortLink.substring(0, 30)}... -> ASIN ${asin}`);
                } else {
                    console.log(`   ⚠️  Resolved but no ASIN: ${shortLink} -> ${resolvedUrl.substring(0, 80)}`);
                }
            } catch (error) {
                console.log(`   ⚠️  Failed to resolve: ${shortLink} - ${error.message}`);
            }

            // Rate limiting - delay between requests
            await delay(200);
        }
    }

    // Now extract titles for all found books
    const booksWithTitles = [];

    for (const book of books) {
        // Try to extract title from HTML context using the original link
        let title = null;

        // Pattern: find text in href="link">TITLE</a> - try original link first
        const linkToMatch = book.originalLink || book.amazonLink;
        const escapedLink = linkToMatch.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

        // Try multiple patterns to find the title
        // Escape special regex characters in the URL
        const linkInHtml = linkToMatch.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

        // Try the most common pattern: href="link">TITLE</a>
        const mainPattern = new RegExp(`<a[^>]*href=["'][^"']*${linkInHtml}[^"']*["'][^>]*>([^<]+?)</a>`, 'i');
        const mainMatch = htmlContent.match(mainPattern);
        if (mainMatch && mainMatch[1]) {
            title = mainMatch[1].trim();
        } else {
            // Try with just the short link ID (last part after /d/)
            const shortId = linkToMatch.split('/').pop();
            if (shortId) {
                const escapedId = shortId.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                const idPattern = new RegExp(`<a[^>]*href=["'][^"']*${escapedId}[^"']*["'][^>]*>([^<]+?)</a>`, 'i');
                const idMatch = htmlContent.match(idPattern);
                if (idMatch && idMatch[1]) {
                    title = idMatch[1].trim();
                }
            }
        }

        if (!title) {
            // Try to find title by looking for the link and then nearby text
            const linkIndex = htmlContent.indexOf(linkToMatch);
            if (linkIndex !== -1) {
                // Look for text after the link tag
                const afterLink = htmlContent.substring(linkIndex, linkIndex + 300);
                const titleAfterMatch = afterLink.match(/>([^<]{10,100})</);
                if (titleAfterMatch && titleAfterMatch[1]) {
                    title = titleAfterMatch[1];
                }
            }
        }

        if (!title) {
            // If still no title, try to fetch from Amazon (but skip for now to avoid delays)
            // For now, use a placeholder that will be filtered
            title = "Amazon Book Link";
        } else {
            // Clean up the title
            title = title
                .replace(/\s+/g, ' ')
                .replace(/&nbsp;/g, ' ')
                .replace(/&amp;/g, '&')
                .replace(/&quot;/g, '"')
                .replace(/&#8217;/g, "'")
                .replace(/&#8211;/g, "-")
                .replace(/&#8212;/g, "--")
                .replace(/&[a-z]+;/gi, '') // Remove other HTML entities
                .trim();
        }

        // Clean title
        const cleanedTitle = sanitizeTitle(title);
        if (!cleanedTitle) {
            console.log(`⚠️  Skipping book with invalid title: ASIN ${book.asin}`);
            continue;
        }

        booksWithTitles.push({
            asin: book.asin,
            title: cleanedTitle,
            amazonLink: book.amazonLink
        });
    }

    // Deduplicate by ASIN
    const uniqueBooks = [];
    const seenAsins = new Set();
    for (const book of booksWithTitles) {
        if (!seenAsins.has(book.asin)) {
            seenAsins.add(book.asin);
            uniqueBooks.push(book);
        }
    }

    return uniqueBooks;
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
        const books = await extractBooksFromHTML(htmlContent, episodeUrl);
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

        // Deduplicate books (merge duplicates by title)
        console.log('\n🔍 Deduplicating books...');
        const allBooks = JSON.parse(fs.readFileSync(BOOKS_JSON, 'utf-8'));
        const { books: deduplicatedBooks, stats } = deduplicateBooks(allBooks);

        if (stats.totalDuplicates > 0) {
            // Backup before deduplication
            const backupPath = BOOKS_JSON + '.backup.' + Date.now();
            fs.writeFileSync(backupPath, JSON.stringify(allBooks, null, 2));
            fs.writeFileSync(BOOKS_JSON, JSON.stringify(deduplicatedBooks, null, 2));
            console.log(`   ✅ Removed ${stats.totalDuplicates} duplicate(s) (${stats.titleDuplicates} by title, ${stats.idDuplicates} by ID)`);
        } else {
            console.log('   ✅ No duplicates found');
        }

        console.log('='.repeat(60));
        console.log('✅ SUCCESS!');
        console.log('='.repeat(60));
        console.log(`   New books added: ${newBooks.length}`);
        console.log(`   Existing books updated: ${updatedBooks.length}`);
        console.log(`   Total unique books: ${deduplicatedBooks.length}`);
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

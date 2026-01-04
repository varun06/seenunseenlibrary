import urllib.request
import re
import json
import xml.etree.ElementTree as ET
import time
from datetime import datetime

def fetch_sitemap(sitemap_url="https://seenunseen.in/sitemap.xml"):
    """Fetch and parse the sitemap XML"""

    print(f"🔍 Fetching sitemap from: {sitemap_url}\n")

    try:
        headers = {
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
        }
        req = urllib.request.Request(sitemap_url, headers=headers)

        with urllib.request.urlopen(req, timeout=30) as response:
            xml_content = response.read().decode('utf-8')

        print(f"✅ Successfully fetched sitemap\n")

        # Parse XML
        root = ET.fromstring(xml_content)

        # Extract namespaces
        namespaces = {'ns': 'http://www.sitemaps.org/schemas/sitemap/0.9'}

        # Find all episode URLs (month and day can be 1 or 2 digits)
        episode_pattern = r'/episodes/(\d{4})/(\d{1,2})/(\d{1,2})/(episode-\d+-[^/]+)/'
        episodes = []

        for url_element in root.findall('ns:url', namespaces):
            loc = url_element.find('ns:loc', namespaces)
            if loc is not None:
                url = loc.text
                match = re.search(episode_pattern, url)
                if match:
                    year, month, day, slug = match.groups()

                    # Extract episode number and title from slug
                    slug_match = re.match(r'episode-(\d+)-(.+)', slug)
                    if slug_match:
                        episode_num = slug_match.group(1)
                        episode_title = slug_match.group(2).replace('-', ' ').title()

                        episodes.append({
                            'url': url,
                            'year': year,
                            'month': month.zfill(2),  # Zero-pad to 2 digits
                            'day': day.zfill(2),      # Zero-pad to 2 digits
                            'episode_num': episode_num,
                            'title': episode_title,
                            'date': f"{year}-{month.zfill(2)}-{day.zfill(2)}"
                        })

        # Sort by episode number
        episodes.sort(key=lambda x: int(x['episode_num']))

        print(f"📚 Found {len(episodes)} episodes in sitemap\n")
        return episodes

    except Exception as e:
        print(f"❌ Error fetching sitemap: {e}")
        import traceback
        traceback.print_exc()
        return []

def fetch_and_extract_books(url, episode_info=None):
    """Fetch webpage and extract Amazon book links"""
    
    print(f"🔍 Fetching content from:\n{url}\n")
    
    try:
        headers = {
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
        }
        req = urllib.request.Request(url, headers=headers)
        
        with urllib.request.urlopen(req, timeout=30) as response:
            html_content = response.read().decode('utf-8')
        
        print(f"✅ Successfully fetched {len(html_content):,} characters\n")
        
        # Find all Amazon links (supports amzn.in, amazon.in, amazon.com, a.co, amzn.to)
        amzn_pattern = r'https?://(?:(?:www\.)?amazon\.(?:in|com)|amzn\.(?:in|to)|a\.co)/[^\s<>"&]+'
        amzn_matches = re.findall(amzn_pattern, html_content)

        # Also look for Google redirect URLs that contain Amazon links
        google_redirect_pattern = r'https://www\.google\.com/url\?q=(https?://(?:(?:www\.)?amazon\.(?:in|com)|amzn\.(?:in|to)|a\.co)/[^&]+)'
        google_matches = re.findall(google_redirect_pattern, html_content)
        
        # Combine and deduplicate
        all_links = list(set(amzn_matches + google_matches))
        
        print(f"📚 Found {len(all_links)} unique Amazon link(s)\n")
        
        books = []
        
        for link in all_links:
            # Try to find context around this link to extract book title
            escaped_link = re.escape(link)
            
            # Pattern: find text before and after the link
            context_pattern = f'([^<>]{{0,200}}){escaped_link}([^<>]{{0,200}})'
            context_match = re.search(context_pattern, html_content, re.DOTALL)
            
            title = "Amazon Book Link"
            
            if context_match:
                before = context_match.group(1)
                after = context_match.group(2)
                
                # Try to extract text from href="link">TITLE</a> pattern
                title_pattern = f'<a[^>]*href=["\'][^"\']*{re.escape(link)}[^"\']*["\'][^>]*>([^<]+)</a>'
                title_match = re.search(title_pattern, html_content, re.IGNORECASE)
                
                if title_match:
                    title = title_match.group(1)
                    title = re.sub(r'\s+', ' ', title).strip()
                    title = re.sub(r'&nbsp;', ' ', title)
                else:
                    # Try to find nearby text that looks like a title
                    before_clean = re.sub(r'<[^>]+>', '', before)
                    before_clean = re.sub(r'\s+', ' ', before_clean).strip()
                    
                    # Take last meaningful text before the link
                    if len(before_clean) > 10:
                        parts = re.split(r'[.!?;,\n]', before_clean)
                        for part in reversed(parts):
                            part = part.strip()
                            if len(part) > 10 and len(part) < 200:
                                title = part
                                break
            
            book_data = {
                'title': title,
                'link': link
            }

            # Add episode info if provided
            if episode_info:
                book_data.update({
                    'episode_num': episode_info['episode_num'],
                    'episode_title': episode_info['title'],
                    'episode_date': episode_info['date'],
                    'episode_url': episode_info['url']
                })

            books.append(book_data)

        # Sort by title for better organization
        books.sort(key=lambda x: x['title'])

        return books
    
    except Exception as e:
        print(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()
        return []

def extract_asin(amazon_url):
    """Extract ASIN (Amazon Standard Identification Number) from Amazon URL"""

    # Common patterns for ASIN in Amazon URLs:
    # /dp/ASIN/
    # /gp/product/ASIN/
    # /product/ASIN/
    # /ASIN/ (sometimes appears directly)

    patterns = [
        r'/dp/([A-Z0-9]{10})',
        r'/gp/product/([A-Z0-9]{10})',
        r'/product/([A-Z0-9]{10})',
        r'amazon\.[^/]+/([A-Z0-9]{10})/',
    ]

    for pattern in patterns:
        match = re.search(pattern, amazon_url)
        if match:
            return match.group(1)

    return None

def is_generic_title(title):
    """Check if a title is generic/bad and needs to be fetched from Amazon"""

    generic_patterns = [
        r'^amazon\s+book\s+link$',
        r'^buy\s+here$',
        r'^on\s+amazon$',
        r'^here$',
        r'^\d+$',  # Just numbers like "1", "2", "3"
        r'^click\s+here$',
        r'^link$',
        r'^book$',
        r'^amazon$',
        r'amazon\s+link',
    ]

    title_lower = title.lower().strip()

    for pattern in generic_patterns:
        if re.match(pattern, title_lower):
            return True

    # Also check if it's very short (likely not a real title)
    if len(title_lower) < 5:
        return True

    return False

def fetch_title_from_amazon(asin, domain='amazon.in'):
    """Fetch actual book title from Amazon product page using ASIN"""

    url = f"https://www.{domain}/dp/{asin}"

    try:
        headers = {
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.5',
            'Accept-Encoding': 'gzip, deflate',
            'Connection': 'keep-alive',
        }
        req = urllib.request.Request(url, headers=headers)

        with urllib.request.urlopen(req, timeout=15) as response:
            html_content = response.read().decode('utf-8')

        # Try multiple patterns to extract title
        title_patterns = [
            r'<span id="productTitle"[^>]*>([^<]+)</span>',
            r'<h1[^>]*class="[^"]*product-title[^"]*"[^>]*>([^<]+)</h1>',
            r'"title":"([^"]+)"',
        ]

        for pattern in title_patterns:
            match = re.search(pattern, html_content, re.IGNORECASE)
            if match:
                title = match.group(1)
                # Clean up the title
                title = re.sub(r'\s+', ' ', title).strip()
                title = re.sub(r'&nbsp;', ' ', title)
                title = re.sub(r'&amp;', '&', title)
                title = re.sub(r'&quot;', '"', title)

                if len(title) > 5:  # Sanity check
                    return title

        return None

    except Exception as e:
        print(f"⚠️  Could not fetch title for ASIN {asin}: {e}")
        return None

def deduplicate_books(books):
    """Deduplicate books based on ASIN and keep track of all episodes where they appear"""

    print(f"\n{'='*120}")
    print(f"🔄 DEDUPLICATING BOOKS BY ASIN")
    print(f"{'='*120}\n")

    asin_map = {}  # ASIN -> book data with list of episodes
    books_without_asin = []

    for book in books:
        asin = extract_asin(book['link'])

        if asin:
            if asin not in asin_map:
                # First time seeing this ASIN
                asin_map[asin] = {
                    'asin': asin,
                    'title': book['title'],
                    'link': book['link'],
                    'episodes': []
                }

            # Add episode info to this book
            asin_map[asin]['episodes'].append({
                'episode_num': book.get('episode_num'),
                'episode_title': book.get('episode_title'),
                'episode_date': book.get('episode_date'),
                'episode_url': book.get('episode_url')
            })

            # Update title if we have a better one (non-generic)
            if is_generic_title(asin_map[asin]['title']) and not is_generic_title(book['title']):
                asin_map[asin]['title'] = book['title']
        else:
            # No ASIN found - keep track of these separately
            books_without_asin.append(book)

    unique_books = list(asin_map.values())

    print(f"📊 Deduplication summary:")
    print(f"   Total book entries: {len(books)}")
    print(f"   Unique books (by ASIN): {len(unique_books)}")
    print(f"   Books without ASIN: {len(books_without_asin)}")
    print(f"   Duplicates removed: {len(books) - len(unique_books) - len(books_without_asin)}\n")

    return unique_books, books_without_asin

def fix_generic_titles(books, delay_seconds=3):
    """Fetch actual titles from Amazon for books with generic titles"""

    print(f"\n{'='*120}")
    print(f"🔧 FIXING GENERIC TITLES")
    print(f"{'='*120}\n")

    books_needing_fix = [b for b in books if is_generic_title(b['title'])]

    print(f"📋 Found {len(books_needing_fix)} books with generic titles that need fixing")

    if not books_needing_fix:
        print("✅ All titles look good!\n")
        return books

    print(f"⏳ Fetching titles from Amazon (this may take a while)...\n")

    fixed_count = 0
    failed_count = 0

    for idx, book in enumerate(books_needing_fix, 1):
        print(f"[{idx}/{len(books_needing_fix)}] Fetching title for ASIN: {book['asin']}")
        print(f"   Current title: \"{book['title']}\"")

        new_title = fetch_title_from_amazon(book['asin'])

        if new_title:
            print(f"   ✅ New title: \"{new_title}\"")
            book['title'] = new_title
            fixed_count += 1
        else:
            print(f"   ❌ Could not fetch title, keeping original")
            failed_count += 1

        # Rate limiting
        if idx < len(books_needing_fix):
            print(f"   ⏳ Waiting {delay_seconds} seconds...\n")
            time.sleep(delay_seconds)

    print(f"\n{'─'*120}")
    print(f"✅ Title fixing complete:")
    print(f"   Successfully fixed: {fixed_count}")
    print(f"   Failed to fix: {failed_count}")
    print(f"{'─'*120}\n")

    return books

def print_table(books):
    """Print books in a formatted table"""

    if not books:
        print("❌ No book links found!")
        return
    
    print(f"\n{'='*120}")
    print(f"📖 BOOK LINKS TABLE ({len(books)} books found)")
    print(f"{'='*120}\n")
    print(f"{'#':<4} {'Book Title':<80} {'Link':<36}")
    print(f"{'-'*120}")
    
    for idx, book in enumerate(books, 1):
        title = (book['title'][:77] + "...") if len(book['title']) > 80 else book['title']
        link_display = (book['link'][:33] + "...") if len(book['link']) > 36 else book['link']
        print(f"{idx:<4} {title:<80} {link_display:<36}")
    
    print(f"{'='*120}\n")

def generate_markdown_table(books):
    """Generate a markdown table"""
    
    if not books:
        return
    
    print(f"\n📋 MARKDOWN TABLE FORMAT:")
    print(f"{'-'*120}")
    print("| # | Book Title | Amazon Link |")
    print("|---|------------|-------------|")
    
    for idx, book in enumerate(books, 1):
        title = book['title'].replace('|', '\\|').replace('[', '\\[').replace(']', '\\]')
        link = book['link']
        print(f"| {idx} | {title} | {link} |")
    
    print(f"{'-'*120}\n")

def generate_csv(books, filename='books.csv'):
    """Generate CSV format and optionally save to file

    For deduplicated books, creates two CSVs:
    1. One with unique books listing all episodes
    2. One expanded with one row per book per episode (traditional format)
    """

    if not books:
        return

    # Check if books are deduplicated (have 'episodes' list) or original format
    is_deduplicated = books and isinstance(books[0].get('episodes'), list)

    if is_deduplicated:
        # Generate unique books CSV
        unique_csv = "ASIN,Book Title,Amazon Link,Episode Count,Episode Numbers\n"

        for book in books:
            title = book['title'].replace('"', '""')
            link = book['link'].replace('"', '""')
            asin = book['asin']
            episode_count = len(book['episodes'])
            episode_nums = ';'.join([str(ep['episode_num']) for ep in book['episodes'] if ep.get('episode_num')])

            unique_csv += f'"{asin}","{title}","{link}",{episode_count},"{episode_nums}"\n'

        # Save unique books CSV
        unique_filename = filename.replace('.csv', '_unique.csv')
        try:
            with open(unique_filename, 'w', encoding='utf-8') as f:
                f.write(unique_csv)
            print(f"✅ Unique books CSV saved as: {unique_filename}")
        except Exception as e:
            print(f"⚠️ Could not save unique books CSV: {e}")

        # Generate expanded CSV (one row per episode per book)
        expanded_csv = "Episode Number,Episode Title,Episode Date,ASIN,Book Title,Amazon Link,Episode URL\n"

        for book in books:
            title = book['title'].replace('"', '""')
            link = book['link'].replace('"', '""')
            asin = book['asin']

            for episode in book['episodes']:
                episode_num = episode.get('episode_num', '')
                episode_title = episode.get('episode_title', '').replace('"', '""')
                episode_date = episode.get('episode_date', '')
                episode_url = episode.get('episode_url', '').replace('"', '""')

                expanded_csv += f'{episode_num},"{episode_title}",{episode_date},"{asin}","{title}","{link}","{episode_url}"\n'

        # Save expanded CSV
        expanded_filename = filename.replace('.csv', '_expanded.csv')
        try:
            with open(expanded_filename, 'w', encoding='utf-8') as f:
                f.write(expanded_csv)
            print(f"✅ Expanded books CSV saved as: {expanded_filename}")
        except Exception as e:
            print(f"⚠️ Could not save expanded CSV: {e}")

    else:
        # Original format - single CSV with episode info
        has_episode_info = books and 'episode_num' in books[0]

        if has_episode_info:
            csv_content = "Episode Number,Episode Title,Episode Date,Book Title,Amazon Link,Episode URL\n"
        else:
            csv_content = "Number,Book Title,Amazon Link\n"

        for idx, book in enumerate(books, 1):
            title = book['title'].replace('"', '""')
            link = book['link'].replace('"', '""')

            if has_episode_info:
                episode_num = book['episode_num']
                episode_title = book['episode_title'].replace('"', '""')
                episode_date = book['episode_date']
                episode_url = book['episode_url'].replace('"', '""')
                csv_content += f'{episode_num},"{episode_title}",{episode_date},"{title}","{link}","{episode_url}"\n'
            else:
                csv_content += f'{idx},"{title}","{link}"\n'

        # Save to file
        try:
            with open(filename, 'w', encoding='utf-8') as f:
                f.write(csv_content)
            print(f"✅ CSV file saved as: {filename}")
        except Exception as e:
            print(f"⚠️ Could not save CSV file: {e}")

def process_episodes_batch(episodes, start_idx=0, batch_size=50, delay_seconds=2):
    """Process a batch of episodes with rate limiting"""

    all_books = []
    end_idx = min(start_idx + batch_size, len(episodes))

    print(f"\n{'='*120}")
    print(f"📦 PROCESSING BATCH: Episodes {start_idx + 1} to {end_idx} (out of {len(episodes)} total)")
    print(f"{'='*120}\n")

    for idx in range(start_idx, end_idx):
        episode = episodes[idx]

        print(f"\n{'─'*120}")
        print(f"Processing Episode {episode['episode_num']}: {episode['title']}")
        print(f"Date: {episode['date']} | URL: {episode['url']}")
        print(f"Progress: {idx - start_idx + 1}/{end_idx - start_idx} in this batch ({idx + 1}/{len(episodes)} overall)")
        print(f"{'─'*120}\n")

        books = fetch_and_extract_books(episode['url'], episode)

        if books:
            all_books.extend(books)
            print(f"✅ Found {len(books)} book(s) in this episode")
        else:
            print(f"ℹ️  No books found in this episode")

        # Rate limiting: wait before next request (except for last item)
        if idx < end_idx - 1:
            print(f"⏳ Waiting {delay_seconds} seconds before next request...\n")
            time.sleep(delay_seconds)

    print(f"\n{'='*120}")
    print(f"✅ BATCH COMPLETE: Processed {end_idx - start_idx} episodes")
    print(f"📚 Total books found in this batch: {len(all_books)}")
    print(f"{'='*120}\n")

    return all_books

# Main execution
if __name__ == "__main__":
    # Configuration
    BATCH_SIZE = 500  # Process all episodes
    DELAY_SECONDS = 2  # Delay between requests to avoid overwhelming the server
    START_INDEX = 0  # Start from the beginning
    TITLE_FETCH_DELAY = 3  # Delay between Amazon title fetches

    print("="*120)
    print("🚀 SEEN UNSEEN PODCAST - BOOK EXTRACTOR WITH DEDUPLICATION")
    print("="*120 + "\n")

    # Fetch all episodes from sitemap
    episodes = fetch_sitemap()

    if not episodes:
        print("❌ Could not fetch episodes from sitemap. Exiting.")
        exit(1)

    print(f"📊 Found {len(episodes)} total episodes")
    print(f"⚙️  Batch size: {BATCH_SIZE} episodes")
    print(f"⏱️  Delay between requests: {DELAY_SECONDS} seconds")
    print(f"📍 Starting from episode index: {START_INDEX}\n")

    # Process the batch
    all_books = process_episodes_batch(
        episodes,
        start_idx=START_INDEX,
        batch_size=BATCH_SIZE,
        delay_seconds=DELAY_SECONDS
    )

    # Deduplicate books by ASIN
    if all_books:
        unique_books, books_without_asin = deduplicate_books(all_books)

        # Fix generic titles by fetching from Amazon (DISABLED - Amazon blocks automated requests)
        # unique_books = fix_generic_titles(unique_books, delay_seconds=TITLE_FETCH_DELAY)

        # Generate output
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        csv_filename = f"seenunseen_books_{timestamp}.csv"

        print(f"\n{'='*120}")
        print(f"📊 FINAL RESULTS")
        print(f"{'='*120}\n")
        print(f"Total book entries extracted: {len(all_books)}")
        print(f"Unique books (after deduplication): {len(unique_books)}")
        print(f"Books without ASIN: {len(books_without_asin)}")
        print(f"From episodes: {START_INDEX + 1} to {min(START_INDEX + BATCH_SIZE, len(episodes))}\n")

        # Save to CSV (will create both unique and expanded versions)
        generate_csv(unique_books, filename=csv_filename)

        # Show sample
        print(f"\n🔧 SAMPLE DATA (first 3 unique books):")
        print(f"{'-'*120}")
        for idx, book in enumerate(unique_books[:3], 1):
            print(f"\n{idx}. {book['title']}")
            print(f"   ASIN: {book['asin']}")
            print(f"   Link: {book['link']}")
            print(f"   Appears in {len(book['episodes'])} episode(s): {', '.join([str(ep['episode_num']) for ep in book['episodes'][:5]])}")
        print(f"{'-'*120}\n")

        print(f"✅ Successfully processed {min(BATCH_SIZE, len(episodes) - START_INDEX)} episode(s)!")
        print(f"💾 Results saved to:")
        print(f"   - {csv_filename.replace('.csv', '_unique.csv')} (unique books)")
        print(f"   - {csv_filename.replace('.csv', '_expanded.csv')} (one row per episode)")

        # Show next batch info if there are more episodes
        remaining = len(episodes) - (START_INDEX + BATCH_SIZE)
        if remaining > 0:
            print(f"\nℹ️  {remaining} episodes remaining. To process the next batch, update START_INDEX to {START_INDEX + BATCH_SIZE}")
    else:
        print("❌ No Amazon book links found in any episode.")

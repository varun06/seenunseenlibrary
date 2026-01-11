# Add Episode Books Script

This script allows you to add books from a single episode page to your bookshelf.

## Usage

```bash
npm run add-episode <episode-url>
```

Or directly:

```bash
node scripts/add_episode_books.js <episode-url>
```

## Example

```bash
npm run add-episode https://seenunseen.in/episodes/2024/1/15/episode-500-some-title/
```

## What It Does

1. **Fetches the episode page** - Downloads the HTML from the provided episode URL
2. **Extracts book links** - Finds all Amazon book links in the episode page
3. **Extracts episode info** - Parses episode number, title, and date from the URL
4. **Updates books.json**:
   - Adds new books if they don't exist
   - Updates existing books by adding the episode to their episode list
   - Skips books that already have this episode
5. **Fetches covers** - Automatically downloads book covers for newly added books

## Features

- **Smart deduplication** - Won't add duplicate episodes to existing books
- **Automatic cover fetching** - New books get their covers downloaded automatically
- **Episode info extraction** - Automatically extracts episode number, title, and date from URL
- **Error handling** - Provides clear error messages if something goes wrong

## URL Format

The script expects episode URLs in this format:

```
https://seenunseen.in/episodes/YYYY/M/D/episode-N-TITLE/
```

Where:
- `YYYY` = Year (4 digits)
- `M` = Month (1-2 digits)
- `D` = Day (1-2 digits)
- `N` = Episode number
- `TITLE` = Episode title slug

## Output

The script will:
- Print progress messages as it works
- Show which books were added/updated
- Display cover fetching progress
- Update `public/data/books.json` with the new/updated books

## Notes

- The script respects rate limiting (300ms delay between cover fetches)
- Existing books will have their episode count and spine width recalculated
- Books are automatically sorted by title in books.json

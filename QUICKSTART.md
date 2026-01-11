# Quick Start Guide

## Step 1: Install Dependencies

```bash
npm install
```

This will install Next.js, React, Framer Motion, and other dependencies.

## Step 2: Process Your Data

The data processing script has already been run and generated `public/data/books.json` with 1427 books.

If you need to regenerate it:

```bash
npm run process-data
```

## Step 3: (Optional) Fetch Book Covers

To fetch book covers from Open Library and Amazon:

```bash
npm run fetch-covers
```

**Note**: 
- Tries Open Library first (good for international books)
- Falls back to Amazon image URLs (better for Indian editions)
- 300ms delay between requests to be respectful
- For 1400+ books, this will take about 15-20 minutes

## Step 4: (Optional) Extract Colors

If you have the `canvas` package installed (requires system dependencies), you can extract colors server-side:

```bash
npm run extract-colors
```

**Note**: If canvas isn't installed, colors will be extracted automatically in the browser when the page loads.

## Step 5: Run the Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Adding Books from New Episodes

When a new episode is released, you can easily add books from that episode:

```bash
npm run add-episode <episode-url>
```

**Example:**
```bash
npm run add-episode https://seenunseen.in/episodes/2024/1/15/episode-500-some-title/
```

**What it does:**
1. Fetches the episode page HTML
2. Extracts Amazon book links from the page
3. Updates `books.json`:
   - Adds new books if they don't exist
   - Adds episode info to existing books
   - Automatically avoids duplicates
4. Fetches covers for newly added books

**Note**: The script automatically:
- Extracts episode number, title, and date from the URL
- Skips books that already have this episode
- Recalculates episode counts and spine widths
- Fetches covers only for new books (skips existing ones)

## What's Working

✅ Data processing - 1427 books processed  
✅ Bookshelf component with scroll animation  
✅ Stack view for mobile  
✅ Book detail modal with episode links  
✅ Client-side color extraction (if server-side fails)  
✅ Responsive design  
✅ **Personal book lists** - Mark books as "Read", "Want to Read", or "Currently Reading"  
✅ **Filter tabs** - Filter books by status with real-time counts  
✅ **Status badges** - Visual indicators on book cards  
✅ **Browser-based storage** - All data stored locally (no backend needed)  
✅ **Easy episode updates** - Add books from new episodes with one command  

## User Features

### Personal Book Lists

You can categorize books into three lists:
- **Read** - Books you've already read
- **Want to Read** - Books you'd like to read
- **Currently Reading** - Books you're currently reading

**How to use:**
1. Click any book to open the modal
2. Use the "Add to List" button to mark a status
3. Use the filter tabs at the top to view specific lists
4. All data is saved automatically in your browser

**Note**: Your book lists are stored in browser localStorage - they're private and stay on your device.

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run process-data` - Process CSV files into books.json
- `npm run fetch-covers` - Fetch book covers from Open Library/Amazon
- `npm run extract-colors` - Extract colors from book covers (requires canvas)
- `npm run add-episode` - Add books from a new episode page
- `npm run setup-data` - Run all data processing steps at once

## Next Steps

1. **Fetch covers**: Run `npm run fetch-covers` to get book cover images
2. **Add new episodes**: Use `npm run add-episode` when new episodes are released
3. **Customize**: Adjust colors, spacing, and animations in the components
4. **Deploy**: Deploy to Vercel, Netlify, or your preferred hosting (including self-hosted NAS)

## Troubleshooting

### Canvas Installation Issues

If `canvas` fails to install, that's okay! Color extraction will happen automatically in the browser using the Canvas API.

### Missing Covers

Some books may not have covers in Open Library. The UI will show a colored placeholder with the book title.

### Book Lists Not Saving

If your book lists aren't persisting:
- Check if localStorage is enabled in your browser
- Some browsers in private/incognito mode may clear localStorage
- Check browser console for any errors

### Adding Episodes Fails

If `npm run add-episode` fails:
- Make sure the URL follows the format: `/episodes/YYYY/M/D/episode-N-TITLE/`
- Check your internet connection
- Verify the episode page is accessible
- Check that `public/data/books.json` exists

### Performance

For 1400+ books, the page may take a moment to load. Consider:
- Implementing virtual scrolling for the bookshelf
- Lazy loading images
- Pagination or infinite scroll

Note: The app works great for self-hosted deployments on a NAS - all data is client-side!

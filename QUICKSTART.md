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

## What's Working

✅ Data processing - 1427 books processed  
✅ Bookshelf component with scroll animation  
✅ Stack view for mobile  
✅ Book detail modal with episode links  
✅ Client-side color extraction (if server-side fails)  
✅ Responsive design  

## Next Steps

1. **Fetch covers**: Run `npm run fetch-covers` to get book cover images
2. **Customize**: Adjust colors, spacing, and animations in the components
3. **Deploy**: Deploy to Vercel, Netlify, or your preferred hosting

## Troubleshooting

### Canvas Installation Issues

If `canvas` fails to install, that's okay! Color extraction will happen automatically in the browser using the Canvas API.

### Missing Covers

Some books may not have covers in Open Library. The UI will show a colored placeholder with the book title.

### Performance

For 1400+ books, the page may take a moment to load. Consider:
- Implementing virtual scrolling for the bookshelf
- Lazy loading images
- Pagination or infinite scroll


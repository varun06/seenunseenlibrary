# Bookshelf UI Plan for SeenUnseen Books

## Overview
Create a beautiful bookshelf UI similar to [balajmarius.com's bookshelf](https://balajmarius.com/writings/vibe-coding-a-bookshelf-with-claude-code/) for displaying books recommended on the SeenUnseen podcast.

## Data Source
- **CSV Files**: We have two CSV files:
  - `seenunseen_books_20251230_090116_unique.csv` - Unique books with ASIN, title, Amazon link, episode count
  - `seenunseen_books_20251230_090116_expanded.csv` - Expanded view with episode details

## Key Features to Implement

### 1. **Bookshelf View (Desktop)**
   - Display books as spines (not covers) arranged horizontally
   - Variable spine widths based on page count (or episode count as proxy)
   - Color extraction from book covers for spine backgrounds
   - Contrasting text colors for readability
   - Smooth scroll-based tilt animation (books tilt as you scroll)

### 2. **Stack View (Mobile)**
   - Books displayed flat, stacked vertically
   - Readable without tilting head
   - Same color extraction and styling

### 3. **Data Processing Pipeline**
   - Parse CSV files
   - Fetch book covers using:
     - Open Library API (primary)
     - Google Images via SerpAPI (fallback)
   - Extract dominant colors from covers
   - Calculate spine widths (use episode count as proxy for page count)
   - Generate JSON data structure for the UI

### 4. **Technical Stack**
   - **Frontend**: Next.js (React) with TypeScript
   - **Styling**: Tailwind CSS
   - **Animation**: Framer Motion (for scroll-based tilt)
   - **Image Processing**: Canvas API or sharp (Node.js) for color extraction
   - **Data Fetching**: Node.js scripts for cover fetching and processing

## Implementation Steps

### Phase 1: Data Processing
1. **Parse CSV** → Convert to JSON
2. **Fetch Book Covers**:
   - Use Open Library API with ISBN/ASIN
   - Fallback to Google Images for missing covers
   - Download and optimize images
3. **Extract Colors**:
   - Use color quantization to find dominant colors
   - Calculate contrasting text colors
4. **Calculate Spine Widths**:
   - Use episode count as proxy (more episodes = wider spine)
   - Add slight randomization for natural look
5. **Generate JSON** with all book data

### Phase 2: Frontend Setup
1. **Initialize Next.js project** with TypeScript
2. **Set up Tailwind CSS** for styling
3. **Install dependencies**: Framer Motion, etc.
4. **Create data structure** to load book JSON

### Phase 3: Bookshelf Component
1. **Spine Component**:
   - Display book title on spine
   - Dynamic width based on episode count
   - Background color from cover
   - Text color for contrast
2. **Bookshelf Container**:
   - Horizontal scrolling container
   - Arrange spines side by side
3. **Scroll Animation**:
   - Use Framer Motion motion values
   - Tilt spines based on scroll position
   - Smooth spring animations

### Phase 4: Stack View (Mobile)
1. **Stack Component**:
   - Vertical layout
   - Books displayed flat
   - Cover images visible
2. **Toggle** between shelf and stack views

### Phase 5: Polish
1. **Loading states** for images
2. **Error handling** for missing covers
3. **Search/Filter** functionality (optional)
4. **Episode links** - show which episodes mentioned each book
5. **Responsive design** refinements

## Data Structure

```json
{
  "id": "unique-id",
  "asin": "8193197690",
  "title": "Between the Buyer and the Seller",
  "author": "Karthik Shashidhar",
  "amazonLink": "https://...",
  "episodeCount": 3,
  "episodes": [33, 34, 36],
  "cover": "/images/books/between-buyer-seller.jpg",
  "backgroundColor": "#f0f0ff",
  "textColor": "#1f1f2e",
  "spineWidth": 80,
  "height": 384
}
```

## Challenges & Solutions

1. **Missing Covers**: Some books may not have covers in Open Library
   - Solution: Use Google Images fallback, or placeholder with book title

2. **Generic Titles**: Some books have "Amazon Book Link" as title
   - Solution: Try to fetch from Amazon, or use ASIN-based lookup

3. **Color Extraction**: Need to extract colors from images
   - Solution: Use Canvas API in browser or sharp in Node.js

4. **Performance**: 400+ books could be heavy
   - Solution: Lazy loading, image optimization, virtual scrolling if needed

## Next Steps

1. Create data processing script to:
   - Parse CSV
   - Fetch covers
   - Extract colors
   - Generate JSON

2. Set up Next.js project structure

3. Build bookshelf component with Framer Motion

4. Add mobile stack view

5. Deploy (Vercel, Netlify, etc.)

## Questions to Consider

- Should we show episode information when hovering/clicking a book?
- Do we want search/filter functionality?
- Should books be sortable (by title, episode count, date)?
- Do we want to link back to the podcast episodes?


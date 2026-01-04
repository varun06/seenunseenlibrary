# SeenUnseen Bookshelf

A beautiful bookshelf UI for displaying books recommended on the [SeenUnseen podcast](https://seenunseen.in).

Inspired by [balajmarius.com's bookshelf](https://balajmarius.com/writings/vibe-coding-a-bookshelf-with-claude-code/).

## Features

- 📚 **Bookshelf View**: Books displayed as spines with variable widths
- 🎨 **Color Extraction**: Automatic color extraction from book covers
- 🎭 **Scroll Animation**: Smooth tilt animation as you scroll
- 📱 **Stack View**: Mobile-friendly flat book display
- 🔍 **Search**: Find books quickly
- 📖 **Episode Links**: See which episodes mentioned each book

## Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Process Data

First, process the CSV files to generate JSON:

```bash
npm run process-data
```

This will:
- Parse the CSV files
- Generate a JSON structure with book data

### 3. Fetch Book Covers

Fetch covers from Open Library and Amazon (this may take a while for 1400+ books):

```bash
npm run fetch-covers
```

**Note**: This will:
- Try Open Library first (good for international books)
- Fall back to Amazon image URLs (better for Indian editions)
- Use a 300ms delay between requests to be respectful
- For 1400+ books, this will take about 15-20 minutes

### 4. Extract Colors

Extract dominant colors from book covers:

```bash
npm run extract-colors
```

Or run all three steps at once:

```bash
npm run setup-data
```

### 5. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Project Structure

```
seenunseen/
├── app/                    # Next.js app directory
│   ├── page.tsx           # Main page
│   ├── layout.tsx         # Root layout
│   └── globals.css        # Global styles
├── components/            # React components
│   ├── Bookshelf.tsx     # Bookshelf view component
│   ├── StackView.tsx     # Stack view component
│   └── BookModal.tsx     # Book detail modal
├── scripts/               # Data processing scripts
│   ├── process_books_data.js
│   ├── fetch_covers.js
│   └── extract_colors.js
├── public/
│   ├── data/
│   │   └── books.json    # Generated book data
│   └── images/
│       └── covers/       # Book cover images
└── package.json
```

## Data Format

Books are stored in `public/data/books.json` with the following structure:

```json
{
  "id": "unique-id",
  "asin": "8193197690",
  "title": "Between the Buyer and the Seller",
  "amazonLink": "https://...",
  "episodeCount": 3,
  "episodes": [
    {
      "episodeNum": 33,
      "episodeTitle": "Football Transfers",
      "episodeDate": "2017-08-28",
      "episodeUrl": "https://seenunseen.in/episodes/..."
    }
  ],
  "cover": "/images/covers/...jpg",
  "backgroundColor": "#f0f0ff",
  "textColor": "#1f1f2e",
  "spineWidth": 80,
  "height": 384
}
```

## Technologies

- **Next.js 14** - React framework
- **TypeScript** - Type safety
- **Tailwind CSS** - Styling
- **Framer Motion** - Animations
- **Canvas API** - Color extraction

## License

MIT

# seenunseenlibrary

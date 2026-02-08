'use client'

import { useState, useMemo } from 'react'
import dynamic from 'next/dynamic'
import Link from 'next/link'
import StackView from '@/components/StackView'
import BookCard from '@/components/BookCard'
import { useBookStatus } from '@/hooks/useBookStatus'
import { useTypewriterCycle } from '@/hooks/useTypewriterCycle'
import type { Book, Episode } from '@/types/book'

// Cycling values that fill the search box when empty (like CWT: "mentioned by Doug Irwin")
const SEARCH_CYCLING_VALUES = [
  'Ram Guha',
  'Kavitha Rao',
  'economics',
  'history',
  'fiction',
  'Naushad Forbes',
  'Arshia Sattar',
]

// Lazy load modal (only loads when opened)
const BookModal = dynamic(() => import('@/components/BookModal'), {
  ssr: false,
  loading: () => (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-lg p-6">Loading...</div>
    </div>
  )
})

type FilterTab = 'all' | 'read' | 'want_to_read' | 'currently_reading'
type ViewMode = 'highlights' | 'all'

function episodeKey(ep: Episode) {
  return ep.episodeUrl || `${ep.episodeNum}-${ep.episodeTitle}`
}

interface BooksClientProps {
  initialBooks: Book[]
}

export default function BooksClient({ initialBooks }: BooksClientProps) {
  const [selectedBook, setSelectedBook] = useState<Book | null>(null)
  const [activeFilter, setActiveFilter] = useState<FilterTab>('all')
  const [viewMode, setViewMode] = useState<ViewMode>('highlights')
  const [highlightsSearchQuery, setHighlightsSearchQuery] = useState('')
  const [highlightsSearchFocused, setHighlightsSearchFocused] = useState(false)
  const { statuses, getStatusCounts } = useBookStatus()
  const cyclingSearchValue = useTypewriterCycle(SEARCH_CYCLING_VALUES, { typeMs: 90, deleteMs: 45, holdMs: 2000 })
  const highlightsSearchDisplayValue =
    highlightsSearchQuery !== ''
      ? highlightsSearchQuery
      : highlightsSearchFocused
        ? ''
        : cyclingSearchValue

  // Single deduplication pass (safety check)
  const books = useMemo(() => {
    const seen = new Set<string>()
    return initialBooks.filter(book => {
      if (seen.has(book.id)) return false
      seen.add(book.id)
      return true
    })
  }, [initialBooks])

  // Highlights: top 10 most mentioned (by episode count)
  const top10MostMentioned = useMemo(() => {
    return [...books]
      .sort((a, b) => b.episodeCount - a.episodeCount)
      .slice(0, 10)
  }, [books])

  // Highlights: latest episode (max episodeNum) and books from that episode
  const { latestEpisode, latestEpisodeBooks } = useMemo((): {
    latestEpisode: Episode | null
    latestEpisodeBooks: Book[]
  } => {
    let latest: Episode | null = null
    books.forEach((book) => {
      book.episodes?.forEach((ep) => {
        if (!latest || ep.episodeNum > latest.episodeNum) latest = ep
      })
    })
    if (!latest) return { latestEpisode: null, latestEpisodeBooks: [] }
    const key = episodeKey(latest)
    const fromLatest = books.filter((book) =>
      book.episodes?.some((ep) => episodeKey(ep) === key)
    )
    return { latestEpisode: latest, latestEpisodeBooks: fromLatest }
  }, [books])

  // Filter books based on active filter (for "all" view)
  const filteredBooks = useMemo(() => {
    if (activeFilter === 'all') return books
    return books.filter((book) => {
      const status = statuses[book.id] || null
      return status === activeFilter
    })
  }, [books, activeFilter, statuses])

  const statusCounts = useMemo(() => {
    return getStatusCounts(books.map((b) => b.id))
  }, [books, getStatusCounts])

  const goToAllBooks = (searchQueryToApply = '') => {
    setHighlightsSearchQuery(searchQueryToApply)
    setViewMode('all')
  }

  return (
    <main className="min-h-screen bg-background">
      <header className="sticky top-0 z-10 bg-white/90 backdrop-blur-sm border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <Link href="/" className="text-lg font-semibold text-accent hover:text-accent/90 transition-colors">
              SeenUnseen Books
            </Link>
            <Link
              href="/about"
              className="text-sm font-medium text-gray-600 hover:text-accent transition-colors"
            >
              About
            </Link>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-8 sm:py-10">
        {viewMode === 'highlights' ? (
          <>
            <h2 className="text-xl sm:text-2xl font-semibold text-foreground mb-2">
              Books from the podcast
            </h2>
            <p className="text-gray-600 text-sm mb-6">
              Start with highlights below, or search and browse all {books.length} books.
            </p>

            {/* Search bar: takes you to full list with query */}
            <div className="mb-8">
              <label htmlFor="highlights-search" className="sr-only">
                Search books
              </label>
              <div className="flex flex-col sm:flex-row gap-2">
                <input
                  id="highlights-search"
                  type="text"
                  value={highlightsSearchDisplayValue}
                  onChange={(e) => setHighlightsSearchQuery(e.target.value)}
                  onFocus={() => setHighlightsSearchFocused(true)}
                  onBlur={() => setHighlightsSearchFocused(false)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      const q = highlightsSearchQuery || (highlightsSearchFocused ? '' : cyclingSearchValue)
                      goToAllBooks(q)
                    }
                  }}
                  className={`flex-1 px-4 py-3 rounded-lg border border-gray-300 bg-white focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent ${highlightsSearchQuery === '' && !highlightsSearchFocused ? 'text-gray-500' : 'text-gray-900'}`}
                />
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      const q = highlightsSearchQuery || (highlightsSearchFocused ? '' : cyclingSearchValue)
                      goToAllBooks(q)
                    }}
                    className="px-4 py-3 rounded-lg bg-accent text-white font-medium hover:bg-accent/90 transition-colors whitespace-nowrap"
                  >
                    Search all
                  </button>
                  <button
                    type="button"
                    onClick={() => goToAllBooks('')}
                    className="px-4 py-3 rounded-lg border border-gray-300 bg-white text-gray-700 font-medium hover:bg-gray-50 transition-colors whitespace-nowrap"
                  >
                    Browse all books
                  </button>
                </div>
              </div>
            </div>

            {/* Single flow: Most mentioned then Latest episode */}
            <div className="space-y-10 mb-10">
              <section>
                <h3 className="text-base font-medium text-foreground mb-1">Most mentioned</h3>
                <p className="text-sm text-gray-500 mb-4">Books recommended across the most episodes.</p>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 items-stretch">
                  {top10MostMentioned.map((book, index) => (
                    <BookCard
                      key={book.id}
                      book={book}
                      onBookClick={setSelectedBook}
                      status={statuses[book.id] || null}
                      index={index}
                    />
                  ))}
                </div>
              </section>

              {latestEpisode != null && latestEpisodeBooks.length > 0 ? (
                <section>
                  <h3 className="text-base font-medium text-foreground mb-1">From the latest episode</h3>
                  <a
                    href={latestEpisode.episodeUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-accent hover:underline mb-4 inline-block"
                  >
                    #{latestEpisode.episodeNum} – {latestEpisode.episodeTitle} ({latestEpisode.episodeDate})
                  </a>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 items-stretch">
                    {latestEpisodeBooks.map((book, index) => (
                      <BookCard
                        key={book.id}
                        book={book}
                        onBookClick={setSelectedBook}
                        status={statuses[book.id] || null}
                        index={index}
                      />
                    ))}
                  </div>
                </section>
              ) : (
                <section>
                  <h3 className="text-base font-medium text-foreground mb-1">From the latest episode</h3>
                  <p className="text-sm text-gray-500">No episode data yet.</p>
                </section>
              )}
            </div>

            <div className="pt-4 border-t border-gray-200">
              <button
                type="button"
                onClick={() => goToAllBooks('')}
                className="text-accent font-medium hover:underline"
              >
                Browse all {books.length} books →
              </button>
            </div>
          </>
        ) : (
          <>
            <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
              <h2 className="text-xl sm:text-2xl font-semibold text-foreground">
                Books from the podcast
              </h2>
              <button
                type="button"
                onClick={() => setViewMode('highlights')}
                className="text-sm font-medium text-gray-600 hover:text-accent transition-colors"
              >
                ← Back to highlights
              </button>
            </div>
            <div className="mb-6 border-b border-gray-200">
              <nav className="flex flex-wrap gap-1" role="tablist" aria-label="Filter books by status">
                <button
                  role="tab"
                  aria-selected={activeFilter === 'all'}
                  aria-controls="books-panel"
                  onClick={() => setActiveFilter('all')}
                  className={`px-3 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm font-medium rounded-t-lg transition-all duration-200 ${activeFilter === 'all'
                    ? 'bg-accent text-white shadow-sm'
                    : 'text-gray-600 hover:text-foreground hover:bg-gray-100'
                    }`}
                >
                  All Books
                  <span className="ml-1.5 sm:ml-2 text-xs opacity-75">({statusCounts.total})</span>
                </button>
                <button
                  role="tab"
                  aria-selected={activeFilter === 'read'}
                  aria-controls="books-panel"
                  onClick={() => setActiveFilter('read')}
                  className={`px-3 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm font-medium rounded-t-lg transition-all duration-200 ${activeFilter === 'read'
                    ? 'bg-accent text-white shadow-sm'
                    : 'text-gray-600 hover:text-foreground hover:bg-gray-100'
                    }`}
                >
                  Read
                  <span className="ml-1.5 sm:ml-2 text-xs opacity-75">({statusCounts.read})</span>
                </button>
                <button
                  role="tab"
                  aria-selected={activeFilter === 'want_to_read'}
                  aria-controls="books-panel"
                  onClick={() => setActiveFilter('want_to_read')}
                  className={`px-3 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm font-medium rounded-t-lg transition-all duration-200 ${activeFilter === 'want_to_read'
                    ? 'bg-accent text-white shadow-sm'
                    : 'text-gray-600 hover:text-foreground hover:bg-gray-100'
                    }`}
                >
                  Want to Read
                  <span className="ml-1.5 sm:ml-2 text-xs opacity-75">({statusCounts.want_to_read})</span>
                </button>
                <button
                  role="tab"
                  aria-selected={activeFilter === 'currently_reading'}
                  aria-controls="books-panel"
                  onClick={() => setActiveFilter('currently_reading')}
                  className={`px-3 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm font-medium rounded-t-lg transition-all duration-200 ${activeFilter === 'currently_reading'
                    ? 'bg-accent text-white shadow-sm'
                    : 'text-gray-600 hover:text-foreground hover:bg-gray-100'
                    }`}
                >
                  Currently Reading
                  <span className="ml-1.5 sm:ml-2 text-xs opacity-75">({statusCounts.currently_reading})</span>
                </button>
              </nav>
            </div>

            <div id="books-panel" role="tabpanel" aria-labelledby={`tab-${activeFilter}`}>
              <StackView
                books={filteredBooks}
                onBookClick={setSelectedBook}
                initialSearchQuery={highlightsSearchQuery}
              />
            </div>
          </>
        )}
      </div>

      {selectedBook && (
        <BookModal book={selectedBook} onClose={() => setSelectedBook(null)} />
      )}
    </main>
  )
}

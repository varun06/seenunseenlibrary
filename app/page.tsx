'use client'

import { useState, useEffect, useMemo } from 'react'
import StackView from '@/components/StackView'
import BookModal from '@/components/BookModal'
import { useBookStatus, type BookStatus } from '@/hooks/useBookStatus'

export interface Book {
  id: string
  asin: string
  title: string
  amazonLink: string
  episodeCount: number
  episodes: Array<{
    episodeNum: number
    episodeTitle: string
    episodeDate: string
    episodeUrl: string
  }>
  cover: string | null
  backgroundColor: string
  textColor: string
  spineWidth: number
  height: number
}

type FilterTab = 'all' | 'read' | 'want_to_read' | 'currently_reading'

export default function Home() {
  const [books, setBooks] = useState<Book[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  const [selectedBook, setSelectedBook] = useState<Book | null>(null)
  const [activeFilter, setActiveFilter] = useState<FilterTab>('all')
  const { statuses, getStatus, getStatusCounts } = useBookStatus()

  const loadBooks = async () => {
    try {
      setLoading(true)
      setError(null)
      const res = await fetch('/data/books.json')
      if (!res.ok) {
        throw new Error(`Failed to load books: ${res.status} ${res.statusText}`)
      }
      const data = await res.json()
      if (Array.isArray(data)) {
        // Deduplicate books by ID (in case of duplicates in data)
        const uniqueBooks = data.reduce((acc: Book[], book: Book) => {
          const exists = acc.find(b => b.id === book.id)
          if (!exists) {
            acc.push(book)
          }
          return acc
        }, [])
        setBooks(uniqueBooks)
      } else {
        throw new Error('Invalid book data format')
      }
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Unknown error occurred')
      console.error('Error loading books:', error)
      setError(error)
      setBooks([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadBooks()
  }, [])

  // Filter books based on active filter and deduplicate
  const filteredBooks = useMemo(() => {
    // First, deduplicate the books array itself by ID (keep first occurrence)
    const uniqueBooksMap = new Map<string, Book>()
    books.forEach((book) => {
      if (!uniqueBooksMap.has(book.id)) {
        uniqueBooksMap.set(book.id, book)
      }
    })
    const deduplicatedBooks = Array.from(uniqueBooksMap.values())

    // Then filter by status if needed
    let filtered = deduplicatedBooks
    if (activeFilter !== 'all') {
      filtered = deduplicatedBooks.filter((book) => {
        const status = statuses[book.id] || null
        return status === activeFilter
      })
    }

    // Final deduplication pass (shouldn't be needed but safety check)
    const seen = new Set<string>()
    const result = filtered.filter((book) => {
      if (seen.has(book.id)) {
        console.warn(`Duplicate book ID detected: ${book.id} - ${book.title}`)
        return false
      }
      seen.add(book.id)
      return true
    })

    return result
  }, [books, activeFilter, statuses])

  // Get status counts
  const statusCounts = useMemo(() => {
    if (books.length === 0) {
      return { read: 0, want_to_read: 0, currently_reading: 0, total: 0 }
    }
    return getStatusCounts(books.map((b) => b.id))
  }, [books, statuses, getStatusCounts])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading bookshelf...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <main className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100">
        <header className="sticky top-0 z-10 bg-white/80 backdrop-blur-sm border-b border-gray-200 shadow-sm">
          <div className="max-w-7xl mx-auto px-4 py-4">
            <h1 className="text-2xl font-bold text-gray-900">SeenUnseen Bookshelf</h1>
          </div>
        </header>
        <div className="flex items-center justify-center min-h-[calc(100vh-80px)] px-4">
          <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-6 text-center">
            <div className="mb-4">
              <svg
                className="w-16 h-16 mx-auto text-red-500"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">Failed to Load Books</h2>
            <p className="text-gray-600 mb-4">{error.message}</p>
            <p className="text-sm text-gray-500 mb-6">
              Make sure <code className="bg-gray-100 px-2 py-1 rounded">books.json</code> exists in the{' '}
              <code className="bg-gray-100 px-2 py-1 rounded">public/data</code> directory.
            </p>
            <button
              onClick={loadBooks}
              className="px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors"
            >
              Try Again
            </button>
          </div>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100">
      <header className="sticky top-0 z-10 bg-white/80 backdrop-blur-sm border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">SeenUnseen Bookshelf</h1>
            <p className="text-sm text-gray-600 mt-1">
              {books.length} books recommended on the podcast
            </p>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Filter Tabs */}
        <div className="mb-6 border-b border-gray-200">
          <nav className="flex flex-wrap gap-1" role="tablist" aria-label="Filter books by status">
            <button
              role="tab"
              aria-selected={activeFilter === 'all'}
              aria-controls="books-panel"
              onClick={() => setActiveFilter('all')}
              className={`px-3 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm font-medium rounded-t-lg transition-all duration-200 ${activeFilter === 'all'
                ? 'bg-gray-900 text-white shadow-sm'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
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
                ? 'bg-green-600 text-white shadow-sm'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
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
                ? 'bg-orange-500 text-white shadow-sm'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
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
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                }`}
            >
              Currently Reading
              <span className="ml-1.5 sm:ml-2 text-xs opacity-75">({statusCounts.currently_reading})</span>
            </button>
          </nav>
        </div>

        <div id="books-panel" role="tabpanel" aria-labelledby={`tab-${activeFilter}`}>
          <StackView books={filteredBooks} onBookClick={setSelectedBook} />
        </div>
      </div>

      {selectedBook && (
        <BookModal book={selectedBook} onClose={() => setSelectedBook(null)} />
      )}
    </main>
  )
}


'use client'

import { useState, useMemo } from 'react'
import dynamic from 'next/dynamic'
import Link from 'next/link'
import StackView from '@/components/StackView'
import { useBookStatus } from '@/hooks/useBookStatus'
import type { Book } from '@/types/book'

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

interface BooksClientProps {
  initialBooks: Book[]
}

export default function BooksClient({ initialBooks }: BooksClientProps) {
  const [selectedBook, setSelectedBook] = useState<Book | null>(null)
  const [activeFilter, setActiveFilter] = useState<FilterTab>('all')
  const { statuses, getStatusCounts } = useBookStatus()

  // Single deduplication pass (safety check)
  const books = useMemo(() => {
    const seen = new Set<string>()
    return initialBooks.filter(book => {
      if (seen.has(book.id)) return false
      seen.add(book.id)
      return true
    })
  }, [initialBooks])

  // Filter books based on active filter
  const filteredBooks = useMemo(() => {
    if (activeFilter === 'all') return books
    return books.filter((book) => {
      const status = statuses[book.id] || null
      return status === activeFilter
    })
  }, [books, activeFilter, statuses])

  // Get status counts
  const statusCounts = useMemo(() => {
    return getStatusCounts(books.map((b) => b.id))
  }, [books, getStatusCounts])

  return (
    <main className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100">
      <header className="sticky top-0 z-10 bg-white/80 backdrop-blur-sm border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">SeenUnseen Bookshelf</h1>
              <p className="text-sm text-gray-600 mt-1">
                {books.length} books recommended on the podcast
              </p>
            </div>
            <Link
              href="/about"
              className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
            >
              About
            </Link>
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

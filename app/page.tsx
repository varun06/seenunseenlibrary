'use client'

import { useState, useEffect } from 'react'
import StackView from '@/components/StackView'
import BookModal from '@/components/BookModal'

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

export default function Home() {
  const [books, setBooks] = useState<Book[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedBook, setSelectedBook] = useState<Book | null>(null)

  useEffect(() => {
    // Load books data
    fetch('/data/books.json')
      .then(res => {
        if (!res.ok) {
          throw new Error(`Failed to load books: ${res.status}`)
        }
        return res.json()
      })
      .then(data => {
        if (Array.isArray(data)) {
          setBooks(data)
        } else {
          console.error('Invalid book data format')
          setBooks([])
        }
        setLoading(false)
      })
      .catch(err => {
        console.error('Error loading books:', err)
        console.error('Make sure to run: npm run process-data')
        setBooks([])
        setLoading(false)
      })
  }, [])

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
        <StackView books={books} onBookClick={setSelectedBook} />
      </div>

      {selectedBook && (
        <BookModal book={selectedBook} onClose={() => setSelectedBook(null)} />
      )}
    </main>
  )
}


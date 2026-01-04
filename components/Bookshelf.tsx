'use client'

import { useRef, useEffect, useState, useMemo } from 'react'
import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion'
import Image from 'next/image'
import { useBookColors } from './ColorExtractor'
import type { Book } from '@/app/page'

interface BookshelfProps {
  books: Book[]
  onBookClick: (book: Book) => void
}

const BOOKS_PER_VIEW = 10

export default function Bookshelf({ books, onBookClick }: BookshelfProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const scrollY = useMotionValue(0)
  const scrollYProgress = useMotionValue(0)
  const [currentPage, setCurrentPage] = useState(0)

  // Filter to only show books with covers
  const booksWithCovers = useMemo(() => {
    return books.filter(book => book.cover && book.cover.trim() !== '')
  }, [books])

  const totalPages = Math.ceil(booksWithCovers.length / BOOKS_PER_VIEW)
  const visibleBooks = useMemo(() => {
    const start = currentPage * BOOKS_PER_VIEW
    return booksWithCovers.slice(start, start + BOOKS_PER_VIEW)
  }, [booksWithCovers, currentPage])

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    // Smooth scroll behavior
    container.style.scrollBehavior = 'smooth'
    container.style.scrollSnapType = 'x mandatory'

    const handleScroll = () => {
      scrollY.set(container.scrollLeft)
      const maxScroll = container.scrollWidth - container.clientWidth
      scrollYProgress.set(maxScroll > 0 ? container.scrollLeft / maxScroll : 0)
    }

    container.addEventListener('scroll', handleScroll, { passive: true })
    handleScroll() // Initial call

    return () => container.removeEventListener('scroll', handleScroll)
  }, [scrollY, scrollYProgress])

  const goToPage = (page: number) => {
    if (page >= 0 && page < totalPages) {
      setCurrentPage(page)
      containerRef.current?.scrollTo({ left: 0, behavior: 'smooth' })
    }
  }

  return (
    <div className="relative">
      {/* Navigation */}
      <div className="flex items-center justify-between mb-4">
        <div className="text-sm text-gray-600">
          Showing {booksWithCovers.length > 0 ? currentPage * BOOKS_PER_VIEW + 1 : 0}-{Math.min((currentPage + 1) * BOOKS_PER_VIEW, booksWithCovers.length)} of {booksWithCovers.length} books with covers
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => goToPage(currentPage - 1)}
            disabled={currentPage === 0}
            className="px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed bg-gray-200 text-gray-700 hover:bg-gray-300"
          >
            Previous
          </button>
          <button
            onClick={() => goToPage(currentPage + 1)}
            disabled={currentPage >= totalPages - 1}
            className="px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed bg-gray-200 text-gray-700 hover:bg-gray-300"
          >
            Next
          </button>
        </div>
      </div>

      <div
        ref={containerRef}
        className="flex overflow-x-hidden overflow-y-hidden pb-8"
        style={{
          scrollbarWidth: 'none',
          msOverflowStyle: 'none',
          perspective: '1000px',
          scrollBehavior: 'smooth',
        }}
      >
        <style jsx>{`
          .scrollbar-hide::-webkit-scrollbar {
            display: none;
          }
        `}</style>
        
        <div className="flex items-end justify-center h-[450px] gap-3 px-8 w-full" style={{ perspective: '1000px' }}>
          {booksWithCovers.length === 0 ? (
            <div className="text-center text-gray-500">
              <p className="text-lg">No books with covers found.</p>
              <p className="text-sm mt-2">Run <code className="bg-gray-200 px-2 py-1 rounded">npm run fetch-covers</code> to fetch book covers.</p>
            </div>
          ) : (
            visibleBooks.map((book, index) => (
              <BookSpine
                key={book.id}
                book={book}
                index={index}
                scrollY={scrollY}
                containerRef={containerRef}
                onClick={() => onBookClick(book)}
              />
            ))
          )}
        </div>
      </div>
    </div>
  )
}

interface BookSpineProps {
  book: Book
  index: number
  scrollY: any
  containerRef: React.RefObject<HTMLDivElement>
  onClick: () => void
}

function BookSpine({ book, index, scrollY, containerRef, onClick }: BookSpineProps) {
  const ref = useRef<HTMLDivElement>(null)
  const colors = useBookColors(book)
  
  // Calculate tilt based on scroll position and book position
  const tilt = useTransform(scrollY, () => {
    if (!ref.current || !containerRef.current) return 0
    
    const container = containerRef.current
    const bookRect = ref.current.getBoundingClientRect()
    const containerRect = container.getBoundingClientRect()
    
    const bookCenter = bookRect.left + bookRect.width / 2
    const containerCenter = containerRect.left + containerRect.width / 2
    
    // Calculate distance from center (normalized to -1 to 1)
    const distance = (bookCenter - containerCenter) / (containerRect.width / 2)
    
    // Tilt based on distance (max 12 degrees)
    return Math.max(-12, Math.min(12, distance * 12))
  })

  const springTilt = useSpring(tilt, {
    stiffness: 200,
    damping: 40,
  })

  return (
    <motion.div
      ref={ref}
      style={{
        rotateY: springTilt,
        transformStyle: 'preserve-3d',
      }}
      className="cursor-pointer"
      onClick={onClick}
      whileHover={{ scale: 1.05, z: 20 }}
      whileTap={{ scale: 0.98 }}
    >
      <div
        className="flex items-center justify-center rounded-sm shadow-lg hover:shadow-xl transition-shadow relative overflow-hidden"
        style={{
          width: `${book.spineWidth}px`,
          height: `${book.height}px`,
        }}
      >
        {book.cover ? (
          <>
            {/* Cover Image - full cover displayed vertically */}
            <div className="absolute inset-0">
              <Image
                src={book.cover}
                alt={book.title}
                fill
                className="object-cover"
                sizes={`${book.spineWidth}px`}
                style={{
                  objectFit: 'cover',
                  objectPosition: 'center',
                }}
              />
            </div>
            {/* Subtle overlay for text readability if needed */}
            <div 
              className="absolute inset-0 pointer-events-none"
              style={{
                background: `linear-gradient(to right, 
                  rgba(0,0,0,0.1) 0%, 
                  rgba(0,0,0,0) 20%, 
                  rgba(0,0,0,0) 80%, 
                  rgba(0,0,0,0.1) 100%)`
              }}
            />
            {/* Title Text - overlay on cover */}
            <div className="relative z-10 flex flex-col items-center justify-center h-full px-1">
              <div 
                className="font-bold text-[10px] leading-tight text-center text-white"
                style={{ 
                  writingMode: 'vertical-rl',
                  textOrientation: 'upright',
                  maxWidth: `${book.height - 40}px`,
                  overflow: 'hidden',
                  wordBreak: 'break-word',
                  textShadow: '1px 1px 2px rgba(0,0,0,0.9), 0 0 4px rgba(0,0,0,0.7)',
                  lineHeight: '1.2',
                }}
              >
                {book.title}
              </div>
              {book.episodeCount > 1 && (
                <div 
                  className="text-[9px] mt-1.5 opacity-90 text-center text-white"
                  style={{
                    writingMode: 'vertical-rl',
                    textOrientation: 'upright',
                    textShadow: '1px 1px 2px rgba(0,0,0,0.9)',
                  }}
                >
                  {book.episodeCount} eps
                </div>
              )}
            </div>
          </>
        ) : (
          // Fallback for books without covers
          <div
            className="flex items-center justify-center p-3 w-full h-full"
            style={{
              backgroundColor: colors.backgroundColor,
              color: colors.textColor,
            }}
          >
            <div className="flex flex-col items-center justify-center h-full">
              <div 
                className="font-medium text-xs leading-tight text-center"
                style={{ 
                  writingMode: 'vertical-rl',
                  textOrientation: 'upright',
                  maxWidth: `${book.height - 60}px`,
                  overflow: 'hidden',
                  wordBreak: 'break-word',
                }}
              >
                {book.title}
              </div>
              {book.episodeCount > 1 && (
                <div 
                  className="text-[10px] mt-2 opacity-75 text-center"
                  style={{
                    writingMode: 'vertical-rl',
                    textOrientation: 'upright',
                  }}
                >
                  {book.episodeCount} eps
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </motion.div>
  )
}


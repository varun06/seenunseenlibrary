'use client'

import { motion } from 'framer-motion'
import Image from 'next/image'
import type { Book } from '@/types/book'
import type { BookStatus } from '@/hooks/useBookStatus'
import StatusBadge from './StatusBadge'

interface BookCardProps {
  book: Book
  onBookClick: (book: Book) => void
  status: BookStatus | null
  index?: number
}

export default function BookCard({ book, onBookClick, status, index = 0 }: BookCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.2 }}
      className="cursor-pointer h-full flex flex-col"
      onClick={() => onBookClick(book)}
    >
      <div className="bg-white rounded-lg shadow-md hover:shadow-xl transition-shadow overflow-hidden relative h-full flex flex-col">
        {book.cover ? (
          <div className="relative w-full aspect-[2/3] bg-gray-200 overflow-hidden flex-shrink-0 min-h-0">
            <Image
              src={book.cover}
              alt={book.title}
              fill
              className="object-cover transition-opacity duration-200"
              sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 20vw"
              loading={index < 20 ? 'eager' : 'lazy'}
              quality={85}
              style={{ objectFit: 'cover', objectPosition: 'center' }}
            />
            <div className="absolute top-2 right-2">
              <StatusBadge bookId={book.id} status={status} />
            </div>
          </div>
        ) : (
          <div
            className="w-full aspect-[2/3] flex items-center justify-center p-4 relative"
            style={{ backgroundColor: book.backgroundColor }}
          >
            <div className="absolute top-2 right-2">
              <StatusBadge bookId={book.id} status={status} />
            </div>
            <p className="text-sm font-medium text-center" style={{ color: book.textColor }}>
              {book.title}
            </p>
          </div>
        )}
        <div className="p-3">
          <h3 className="text-sm font-medium text-gray-900 line-clamp-2 flex-1">
            {book.title}
          </h3>
          <div className="flex items-center justify-between mt-1">
            {book.episodeCount > 0 && (
              <p className="text-xs text-gray-500">
                {book.episodeCount} episode{book.episodeCount !== 1 ? 's' : ''}
              </p>
            )}
            <div className="sm:hidden">
              <StatusBadge bookId={book.id} status={status} />
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  )
}

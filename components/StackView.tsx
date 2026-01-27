'use client'

import { useState, useMemo, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Image from 'next/image'
import type { Book } from '@/types/book'
import { useBookStatus } from '@/hooks/useBookStatus'
import StatusBadge from './StatusBadge'

interface StackViewProps {
    books: Book[]
    onBookClick: (book: Book) => void
}

type SortOption = 'title' | 'episodes-desc' | 'episodes-asc'

export default function StackView({ books, onBookClick }: StackViewProps) {
    const [searchQuery, setSearchQuery] = useState('')
    const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('')
    const [sortBy, setSortBy] = useState<SortOption>('episodes-desc')
    const { statuses } = useBookStatus() // Call once at top level

    // Debounce search input (300ms delay)
    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearchQuery(searchQuery)
        }, 300)

        return () => clearTimeout(timer)
    }, [searchQuery])

    // Deduplicate books once (books prop should already be deduplicated, but this is a safety check)
    const uniqueBooks = useMemo(() => {
        const seen = new Set<string>()
        return books.filter((book) => {
            if (seen.has(book.id)) {
                return false
            }
            seen.add(book.id)
            return true
        })
    }, [books])

    const filteredAndSortedBooks = useMemo(() => {
        // Filter by search query
        const filtered = debouncedSearchQuery
            ? uniqueBooks.filter((book) =>
                book.title.toLowerCase().includes(debouncedSearchQuery.toLowerCase())
            )
            : uniqueBooks

        // Sort (create new array to avoid mutation)
        const sorted = [...filtered].sort((a, b) => {
            switch (sortBy) {
                case 'episodes-desc':
                    return b.episodeCount - a.episodeCount // Most mentioned first
                case 'episodes-asc':
                    return a.episodeCount - b.episodeCount // Least mentioned first
                case 'title':
                    return a.title.localeCompare(b.title)
                default:
                    return 0
            }
        })

        return sorted
    }, [uniqueBooks, debouncedSearchQuery, sortBy])

    const handleBookClick = useCallback(
        (book: Book) => {
            onBookClick(book)
        },
        [onBookClick]
    )

    return (
        <div className="w-full">
            <div className="mb-6 space-y-4">
                {/* Search */}
                <input
                    type="text"
                    placeholder="Search books..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    aria-label="Search books"
                    className="w-full px-4 py-3 rounded-lg border border-gray-300 bg-white text-gray-900 placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                />

                {/* Sort/Filter */}
                <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
                    <div className="flex items-center gap-3">
                        <label className="text-sm font-medium text-gray-700 whitespace-nowrap">
                            Sort by:
                        </label>
                        <select
                            value={sortBy}
                            onChange={(e) => setSortBy(e.target.value as SortOption)}
                            className="px-4 py-2.5 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent bg-white text-sm font-medium text-gray-900 cursor-pointer appearance-none bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg xmlns=%27http://www.w3.org/2000/svg%27 fill=%27none%27 viewBox=%270 0 20 20%27%3E%3Cpath stroke=%27%236b7280%27 stroke-linecap=%27round%27 stroke-linejoin=%27round%27 stroke-width=%271.5%27 d=%27M6 8l4 4 4-4%27/%3E%3C/svg%3E')] bg-[length:1.5em_1.5em] bg-[right_0.5rem_center] bg-no-repeat pr-10 min-w-[200px]"
                        >
                            <option value="episodes-desc">Most Mentioned First</option>
                            <option value="episodes-asc">Least Mentioned First</option>
                            <option value="title">Title (A-Z)</option>
                        </select>
                    </div>
                    {sortBy === 'episodes-desc' && filteredAndSortedBooks.length > 0 && (
                        <span className="text-sm text-gray-500 flex-shrink-0">
                            Showing books mentioned in {filteredAndSortedBooks[0]?.episodeCount || 0}+ episodes at the top
                        </span>
                    )}
                </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 items-stretch">
                <AnimatePresence>
                    {filteredAndSortedBooks.map((book, index) => (
                        <motion.div
                            key={book.id}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            transition={{ duration: 0.2 }}
                            className="cursor-pointer h-full flex flex-col"
                            onClick={() => handleBookClick(book)}
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
                                            <StatusBadge bookId={book.id} status={statuses[book.id] || null} />
                                        </div>
                                    </div>
                                ) : (
                                    <div
                                        className="w-full aspect-[2/3] flex items-center justify-center p-4 relative"
                                        style={{ backgroundColor: book.backgroundColor }}
                                    >
                                        <div className="absolute top-2 right-2">
                                            <StatusBadge bookId={book.id} status={statuses[book.id] || null} />
                                        </div>
                                        <p
                                            className="text-sm font-medium text-center"
                                            style={{ color: book.textColor }}
                                        >
                                            {book.title}
                                        </p>
                                    </div>
                                )}
                                <div className="p-3">
                                    <div className="flex items-start justify-between gap-2 mb-1">
                                        <h3 className="text-sm font-medium text-gray-900 line-clamp-2 flex-1">
                                            {book.title}
                                        </h3>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        {book.episodeCount > 0 && (
                                            <p className="text-xs text-gray-500">
                                                {book.episodeCount} episode{book.episodeCount !== 1 ? 's' : ''}
                                            </p>
                                        )}
                                        <div className="sm:hidden">
                                            <StatusBadge bookId={book.id} status={statuses[book.id] || null} />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    ))}
                </AnimatePresence>
            </div>

            {filteredAndSortedBooks.length === 0 && (
                <div className="text-center py-12">
                    <p className="text-gray-500">
                        {searchQuery
                            ? `No books found matching "${searchQuery}"`
                            : 'No books found'}
                    </p>
                </div>
            )}
        </div>
    )
}


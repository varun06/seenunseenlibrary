'use client'

import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Image from 'next/image'
import type { Book } from '@/app/page'

interface StackViewProps {
    books: Book[]
    onBookClick: (book: Book) => void
}

type SortOption = 'title' | 'episodes-desc' | 'episodes-asc'

export default function StackView({ books, onBookClick }: StackViewProps) {
    const [searchQuery, setSearchQuery] = useState('')
    const [sortBy, setSortBy] = useState<SortOption>('episodes-desc')

    const filteredAndSortedBooks = useMemo(() => {
        // First filter by search query
        let filtered = books.filter((book) =>
            book.title.toLowerCase().includes(searchQuery.toLowerCase())
        )

        // Then sort
        filtered.sort((a, b) => {
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

        return filtered
    }, [books, searchQuery, sortBy])

    return (
        <div className="w-full">
            <div className="mb-6 space-y-4">
                {/* Search */}
                <input
                    type="text"
                    placeholder="Search books..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
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

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                <AnimatePresence>
                    {filteredAndSortedBooks.map((book, index) => (
                        <motion.div
                            key={book.id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                            transition={{ delay: index * 0.02 }}
                            className="cursor-pointer"
                            onClick={() => onBookClick(book)}
                        >
                            <div className="bg-white rounded-lg shadow-md hover:shadow-xl transition-shadow overflow-hidden">
                                {book.cover ? (
                                    <div className="relative w-full aspect-[2/3] bg-gray-200">
                                        <Image
                                            src={book.cover}
                                            alt={book.title}
                                            fill
                                            className="object-cover"
                                            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 20vw"
                                        />
                                    </div>
                                ) : (
                                    <div
                                        className="w-full aspect-[2/3] flex items-center justify-center p-4"
                                        style={{ backgroundColor: book.backgroundColor }}
                                    >
                                        <p
                                            className="text-sm font-medium text-center"
                                            style={{ color: book.textColor }}
                                        >
                                            {book.title}
                                        </p>
                                    </div>
                                )}
                                <div className="p-3">
                                    <h3 className="text-sm font-medium text-gray-900 line-clamp-2 mb-1">
                                        {book.title}
                                    </h3>
                                    {book.episodeCount > 0 && (
                                        <p className="text-xs text-gray-500">
                                            {book.episodeCount} episode{book.episodeCount !== 1 ? 's' : ''}
                                        </p>
                                    )}
                                </div>
                            </div>
                        </motion.div>
                    ))}
                </AnimatePresence>
            </div>

            {filteredAndSortedBooks.length === 0 && (
                <div className="text-center py-12">
                    <p className="text-gray-500">No books found matching "{searchQuery}"</p>
                </div>
            )}
        </div>
    )
}


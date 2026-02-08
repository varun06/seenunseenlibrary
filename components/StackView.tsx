'use client'

import { useState, useMemo, useEffect, useCallback } from 'react'
import { AnimatePresence } from 'framer-motion'
import Link from 'next/link'
import type { Book, Episode } from '@/types/book'
import { useBookStatus } from '@/hooks/useBookStatus'
import { useTypewriterCycle } from '@/hooks/useTypewriterCycle'
import BookCard from './BookCard'

const TITLE_SEARCH_CYCLING_VALUES = [
    'Ram Guha',
    'Kavitha Rao',
    'economics',
    'history',
    'fiction',
]

interface StackViewProps {
    books: Book[]
    onBookClick: (book: Book) => void
    initialSearchQuery?: string
}

type SortOption = 'title' | 'episodes-desc' | 'episodes-asc'

function episodeKey(ep: Episode) {
    return ep.episodeUrl || `${ep.episodeNum}-${ep.episodeTitle}`
}

export default function StackView({ books, onBookClick, initialSearchQuery = '' }: StackViewProps) {
    const [searchQuery, setSearchQuery] = useState(initialSearchQuery)
    const [debouncedSearchQuery, setDebouncedSearchQuery] = useState(initialSearchQuery)
    const [guestQuery, setGuestQuery] = useState('')
    const [debouncedGuestQuery, setDebouncedGuestQuery] = useState('')
    const [sortBy, setSortBy] = useState<SortOption>('episodes-desc')
    const [selectedEpisodeUrl, setSelectedEpisodeUrl] = useState<string>('')
    const [titleSearchFocused, setTitleSearchFocused] = useState(false)
    const { statuses } = useBookStatus()
    const cyclingTitleValue = useTypewriterCycle(TITLE_SEARCH_CYCLING_VALUES, { typeMs: 90, deleteMs: 45, holdMs: 2000 })
    const titleSearchDisplayValue =
        searchQuery !== ''
            ? searchQuery
            : titleSearchFocused
                ? ''
                : cyclingTitleValue

    // Debounce search input (300ms delay)
    useEffect(() => {
        const timer = setTimeout(() => setDebouncedSearchQuery(searchQuery), 300)
        return () => clearTimeout(timer)
    }, [searchQuery])
    useEffect(() => {
        const timer = setTimeout(() => setDebouncedGuestQuery(guestQuery), 300)
        return () => clearTimeout(timer)
    }, [guestQuery])

    // Deduplicate books once
    const uniqueBooks = useMemo(() => {
        const seen = new Set<string>()
        return books.filter((book) => {
            if (seen.has(book.id)) return false
            seen.add(book.id)
            return true
        })
    }, [books])

    // Unique episodes from current book list (for filter dropdown)
    const uniqueEpisodes = useMemo(() => {
        const byUrl = new Map<string, Episode>()
        uniqueBooks.forEach((book) => {
            book.episodes?.forEach((ep) => {
                const key = episodeKey(ep)
                if (!byUrl.has(key)) byUrl.set(key, ep)
            })
        })
        return Array.from(byUrl.values()).sort((a, b) => b.episodeNum - a.episodeNum)
    }, [uniqueBooks])

    const filteredAndSortedBooks = useMemo(() => {
        let filtered = uniqueBooks

        if (selectedEpisodeUrl) {
            filtered = filtered.filter((book) =>
                book.episodes?.some((ep) => episodeKey(ep) === selectedEpisodeUrl)
            )
        }

        if (debouncedGuestQuery.trim()) {
            const q = debouncedGuestQuery.toLowerCase().trim()
            filtered = filtered.filter((book) =>
                book.episodes?.some((ep) =>
                    ep.episodeTitle.toLowerCase().includes(q)
                )
            )
        }

        if (debouncedSearchQuery) {
            filtered = filtered.filter((book) =>
                book.title.toLowerCase().includes(debouncedSearchQuery.toLowerCase())
            )
        }

        const sorted = [...filtered].sort((a, b) => {
            switch (sortBy) {
                case 'episodes-desc':
                    return b.episodeCount - a.episodeCount
                case 'episodes-asc':
                    return a.episodeCount - b.episodeCount
                case 'title':
                    return a.title.localeCompare(b.title)
                default:
                    return 0
            }
        })

        return sorted
    }, [uniqueBooks, debouncedSearchQuery, debouncedGuestQuery, sortBy, selectedEpisodeUrl])

    const handleBookClick = useCallback(
        (book: Book) => {
            onBookClick(book)
        },
        [onBookClick]
    )

    return (
        <div className="w-full">
            <div className="mb-8 space-y-4">
                {/* Search titles */}
                <div>
                    <label htmlFor="search-titles" className="block text-sm font-medium text-gray-700 mb-1.5">
                        Search titles
                    </label>
                    <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" aria-hidden>
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                            </svg>
                        </span>
                        <input
                            id="search-titles"
                            type="text"
                            value={titleSearchDisplayValue}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            onFocus={() => setTitleSearchFocused(true)}
                            onBlur={() => setTitleSearchFocused(false)}
                            aria-label="Search titles"
                            className={`w-full pl-10 pr-4 py-3 rounded-lg border border-gray-300 bg-white focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent ${searchQuery === '' && !titleSearchFocused ? 'text-gray-500' : 'text-gray-900'}`}
                        />
                    </div>
                </div>

                {/* Guest or episode (matches episode title, e.g. guest name) */}
                <div>
                    <label htmlFor="guest-search" className="block text-sm font-medium text-gray-700 mb-1.5">
                        Guest or episode
                    </label>
                    <input
                        id="guest-search"
                        type="text"
                        placeholder="e.g. Ram Guha or episode topic..."
                        value={guestQuery}
                        onChange={(e) => setGuestQuery(e.target.value)}
                        aria-label="Search by guest or episode title"
                        className="w-full px-4 py-3 rounded-lg border border-gray-300 bg-white text-gray-900 placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent"
                    />
                </div>

                {/* Mentioned in episode */}
                {uniqueEpisodes.length > 0 && (
                    <div>
                        <label htmlFor="episode-filter" className="block text-sm font-medium text-gray-700 mb-1.5">
                            Mentioned in episode
                        </label>
                        <select
                            id="episode-filter"
                            value={selectedEpisodeUrl}
                            onChange={(e) => setSelectedEpisodeUrl(e.target.value)}
                            className="w-full sm:w-auto min-w-[200px] px-4 py-2.5 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent bg-white text-sm font-medium text-gray-900 cursor-pointer appearance-none bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg xmlns=%27http://www.w3.org/2000/svg%27 fill=%27none%27 viewBox=%270 0 20 20%27%3E%3Cpath stroke=%27%236b7280%27 stroke-linecap=%27round%27 stroke-linejoin=%27round%27 stroke-width=%271.5%27 d=%27M6 8l4 4 4-4%27/%3E%3C/svg%3E')] bg-[length:1.5em_1.5em] bg-[right_0.5rem_center] bg-no-repeat pr-10"
                        >
                            <option value="">All episodes</option>
                            {uniqueEpisodes.map((ep) => (
                                <option key={episodeKey(ep)} value={episodeKey(ep)}>
                                    #{ep.episodeNum} – {ep.episodeTitle}
                                </option>
                            ))}
                        </select>
                    </div>
                )}

                <p className="text-sm text-gray-500">
                    or{' '}
                    <Link href="/episodes" className="text-accent font-medium hover:underline">
                        browse all episodes
                    </Link>
                </p>

                {/* Sort */}
                <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
                    <div className="flex items-center gap-3">
                        <label className="text-sm font-medium text-gray-700 whitespace-nowrap">
                            Sort by:
                        </label>
                        <select
                            value={sortBy}
                            onChange={(e) => setSortBy(e.target.value as SortOption)}
                            className="px-4 py-2.5 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent bg-white text-sm font-medium text-gray-900 cursor-pointer appearance-none bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg xmlns=%27http://www.w3.org/2000/svg%27 fill=%27none%27 viewBox=%270 0 20 20%27%3E%3Cpath stroke=%27%236b7280%27 stroke-linecap=%27round%27 stroke-linejoin=%27round%27 stroke-width=%271.5%27 d=%27M6 8l4 4 4-4%27/%3E%3C/svg%3E')] bg-[length:1.5em_1.5em] bg-[right_0.5rem_center] bg-no-repeat pr-10 min-w-[200px]"
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
                        <BookCard
                            key={book.id}
                            book={book}
                            onBookClick={handleBookClick}
                            status={statuses[book.id] || null}
                            index={index}
                        />
                    ))}
                </AnimatePresence>
            </div>

            {filteredAndSortedBooks.length === 0 && (
                <div className="text-center py-12">
                    <p className="text-gray-500">
                        {searchQuery
                            ? `No books found matching "${searchQuery}"`
                            : debouncedGuestQuery.trim()
                            ? `No books from episodes matching "${debouncedGuestQuery}"`
                            : selectedEpisodeUrl
                            ? 'No books found for this episode'
                            : 'No books found'}
                    </p>
                </div>
            )}
        </div>
    )
}


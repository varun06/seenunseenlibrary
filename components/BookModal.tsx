'use client'

import { useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Image from 'next/image'
import type { Book } from '@/types/book'
import BookStatusButton from './BookStatusButton'

interface BookModalProps {
    book: Book
    onClose: () => void
}

export default function BookModal({ book, onClose }: BookModalProps) {
    const modalRef = useRef<HTMLDivElement>(null)
    const previousActiveElement = useRef<HTMLElement | null>(null)

    useEffect(() => {
        // Prevent body scroll when modal is open
        document.body.style.overflow = 'hidden'

        // Store the previously focused element
        previousActiveElement.current = document.activeElement as HTMLElement

        // Focus the modal when it opens
        if (modalRef.current) {
            modalRef.current.focus()
        }

        return () => {
            document.body.style.overflow = 'unset'
            // Return focus to the previously focused element
            if (previousActiveElement.current) {
                previousActiveElement.current.focus()
            }
        }
    }, [])

    useEffect(() => {
        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                onClose()
            }
        }
        window.addEventListener('keydown', handleEscape)
        return () => window.removeEventListener('keydown', handleEscape)
    }, [onClose])

    // Trap focus within modal
    useEffect(() => {
        const handleTabKey = (e: KeyboardEvent) => {
            if (e.key !== 'Tab' || !modalRef.current) return

            const focusableElements = modalRef.current.querySelectorAll(
                'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
            )
            const firstElement = focusableElements[0] as HTMLElement
            const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement

            if (e.shiftKey) {
                if (document.activeElement === firstElement) {
                    e.preventDefault()
                    lastElement?.focus()
                }
            } else {
                if (document.activeElement === lastElement) {
                    e.preventDefault()
                    firstElement?.focus()
                }
            }
        }

        const modal = modalRef.current
        if (modal) {
            modal.addEventListener('keydown', handleTabKey)
            return () => modal.removeEventListener('keydown', handleTabKey)
        }
    }, [])

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
                onClick={onClose}
            >
                <motion.div
                    ref={modalRef}
                    tabIndex={-1}
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.9, opacity: 0 }}
                    onClick={(e) => e.stopPropagation()}
                    className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto outline-none"
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby="modal-title"
                >
                    <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between z-10">
                        <h2 id="modal-title" className="text-xl font-bold text-gray-900">Book Details</h2>
                        <button
                            onClick={onClose}
                            className="text-gray-400 hover:text-gray-600 transition-colors"
                            aria-label="Close"
                        >
                            <svg
                                className="w-6 h-6"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M6 18L18 6M6 6l12 12"
                                />
                            </svg>
                        </button>
                    </div>

                    <div className="p-6">
                        <div className="flex flex-col md:flex-row gap-6 mb-6">
                            {book.cover ? (
                                <div className="relative w-full md:w-48 h-72 md:h-64 flex-shrink-0 rounded-lg overflow-hidden shadow-lg">
                                    <Image
                                        src={book.cover}
                                        alt={book.title}
                                        fill
                                        className="object-cover"
                                    />
                                </div>
                            ) : (
                                <div
                                    className="w-full md:w-48 h-72 md:h-64 flex-shrink-0 rounded-lg flex items-center justify-center p-4 shadow-lg"
                                    style={{ backgroundColor: book.backgroundColor }}
                                >
                                    <p
                                        className="text-lg font-medium text-center"
                                        style={{ color: book.textColor }}
                                    >
                                        {book.title}
                                    </p>
                                </div>
                            )}

                            <div className="flex-1">
                                <h3 className="text-2xl font-bold text-gray-900 mb-2">
                                    {book.title}
                                </h3>
                                <div className="flex flex-wrap gap-2 mb-4">
                                    <span className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm">
                                        ASIN: {book.asin}
                                    </span>
                                    <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm">
                                        {book.episodeCount} episode{book.episodeCount !== 1 ? 's' : ''}
                                    </span>
                                </div>
                                <div className="flex flex-wrap gap-3 mb-4">
                                    <BookStatusButton bookId={book.id} />
                                    <a
                                        href={book.amazonLink}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="inline-flex items-center gap-2 px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors"
                                    >
                                        <span>View on Amazon</span>
                                        <svg
                                            className="w-4 h-4"
                                            fill="none"
                                            stroke="currentColor"
                                            viewBox="0 0 24 24"
                                        >
                                            <path
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                                strokeWidth={2}
                                                d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                                            />
                                        </svg>
                                    </a>
                                </div>
                            </div>
                        </div>

                        <div className="border-t border-gray-200 pt-6">
                            <h4 className="text-lg font-semibold text-gray-900 mb-4">
                                Mentioned in Episodes
                            </h4>
                            {book.episodes.length > 0 ? (
                                <div className="space-y-3">
                                    {book.episodes.map((episode, index) => (
                                        <motion.a
                                            key={`${episode.episodeNum}-${index}`}
                                            href={episode.episodeUrl}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            initial={{ opacity: 0, x: -20 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            transition={{ delay: index * 0.05 }}
                                            className="block p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors border border-gray-200"
                                        >
                                            <div className="flex items-start justify-between">
                                                <div className="flex-1">
                                                    <div className="flex items-center gap-2 mb-1">
                                                        <span className="text-sm font-semibold text-gray-900">
                                                            Episode {episode.episodeNum}
                                                        </span>
                                                        {episode.episodeDate && (
                                                            <span className="text-xs text-gray-500">
                                                                {new Date(episode.episodeDate).toLocaleDateString('en-US', {
                                                                    year: 'numeric',
                                                                    month: 'long',
                                                                    day: 'numeric',
                                                                })}
                                                            </span>
                                                        )}
                                                    </div>
                                                    {episode.episodeTitle && (
                                                        <p className="text-sm text-gray-700">
                                                            {episode.episodeTitle}
                                                        </p>
                                                    )}
                                                </div>
                                                <svg
                                                    className="w-5 h-5 text-gray-400 flex-shrink-0 ml-2"
                                                    fill="none"
                                                    stroke="currentColor"
                                                    viewBox="0 0 24 24"
                                                >
                                                    <path
                                                        strokeLinecap="round"
                                                        strokeLinejoin="round"
                                                        strokeWidth={2}
                                                        d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                                                    />
                                                </svg>
                                            </div>
                                        </motion.a>
                                    ))}
                                </div>
                            ) : (
                                <p className="text-gray-500 text-sm">No episode information available.</p>
                            )}
                        </div>
                    </div>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    )
}


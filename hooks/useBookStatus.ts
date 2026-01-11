'use client'

import { useState, useEffect, useCallback } from 'react'
import { showToast } from '@/components/Toast'

export type BookStatus = 'read' | 'want_to_read' | 'currently_reading' | null

const STORAGE_KEY = 'seenunseen_book_statuses'

interface BookStatuses {
    [bookId: string]: BookStatus
}

export function useBookStatus() {
    const [statuses, setStatuses] = useState<BookStatuses>({})

    // Load statuses from localStorage on mount (client-side only)
    useEffect(() => {
        // Guard against SSR
        if (typeof window === 'undefined') return

        const loadStatuses = () => {
            try {
                const stored = localStorage.getItem(STORAGE_KEY)
                if (stored) {
                    setStatuses(JSON.parse(stored))
                }
            } catch (error) {
                console.error('Failed to load book statuses from localStorage:', error)
            }
        }

        loadStatuses()

        // Listen for storage changes (syncs across tabs/components)
        const handleStorageChange = (e: StorageEvent) => {
            if (e.key === STORAGE_KEY) {
                loadStatuses()
            }
        }

        // Listen for custom storage events (for same-tab updates)
        const handleCustomStorageChange = () => {
            loadStatuses()
        }

        window.addEventListener('storage', handleStorageChange)
        window.addEventListener('bookStatusChange', handleCustomStorageChange as EventListener)

        return () => {
            window.removeEventListener('storage', handleStorageChange)
            window.removeEventListener('bookStatusChange', handleCustomStorageChange as EventListener)
        }
    }, [])

    // Get status for a specific book
    const getStatus = useCallback(
        (bookId: string): BookStatus => {
            return statuses[bookId] || null
        },
        [statuses]
    )

    // Set status for a specific book
    const setStatus = useCallback(
        (bookId: string, status: BookStatus) => {
            try {
                const newStatuses = { ...statuses }
                if (status === null) {
                    delete newStatuses[bookId]
                } else {
                    newStatuses[bookId] = status
                }

                setStatuses(newStatuses)

                // Guard against SSR
                if (typeof window !== 'undefined') {
                    localStorage.setItem(STORAGE_KEY, JSON.stringify(newStatuses))
                    // Dispatch custom event to sync other hook instances in the same tab
                    window.dispatchEvent(new Event('bookStatusChange'))
                }
            } catch (error) {
                console.error('Failed to save book status to localStorage:', error)
                // If quota exceeded, show a helpful message
                if (error instanceof DOMException && error.name === 'QuotaExceededError') {
                    showToast(
                        'Storage limit reached. Please clear some data or use a different browser.',
                        'error'
                    )
                } else {
                    showToast('Failed to save book status. Please try again.', 'error')
                }
            }
        },
        [statuses]
    )

    // Get all books with a specific status
    const getBooksByStatus = useCallback(
        (status: BookStatus, allBookIds: string[]): string[] => {
            if (status === null) {
                // Return books without any status
                return allBookIds.filter((id) => !statuses[id])
            }
            return allBookIds.filter((id) => statuses[id] === status)
        },
        [statuses]
    )

    // Get counts for each status
    const getStatusCounts = useCallback(
        (allBookIds: string[]) => {
            const counts = {
                read: 0,
                want_to_read: 0,
                currently_reading: 0,
                total: allBookIds.length,
            }

            allBookIds.forEach((id) => {
                const status = statuses[id]
                if (status === 'read') counts.read++
                else if (status === 'want_to_read') counts.want_to_read++
                else if (status === 'currently_reading') counts.currently_reading++
            })

            return counts
        },
        [statuses]
    )

    return {
        statuses, // Expose statuses so components can react to changes
        getStatus,
        setStatus,
        getBooksByStatus,
        getStatusCounts,
    }
}

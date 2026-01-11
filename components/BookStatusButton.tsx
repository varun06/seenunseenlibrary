'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useBookStatus, type BookStatus } from '@/hooks/useBookStatus'

interface BookStatusButtonProps {
    bookId: string
    className?: string
}

const statusOptions: Array<{ value: BookStatus; label: string; icon: string; color: string }> = [
    { value: 'read', label: 'Mark as Read', icon: '✓', color: 'text-green-600 hover:bg-green-50' },
    { value: 'currently_reading', label: 'Currently Reading', icon: '👁', color: 'text-blue-600 hover:bg-blue-50' },
    { value: 'want_to_read', label: 'Want to Read', icon: '🔖', color: 'text-orange-600 hover:bg-orange-50' },
    { value: null, label: 'Remove from List', icon: '✕', color: 'text-gray-600 hover:bg-gray-50' },
]

const currentStatusConfig: Record<NonNullable<BookStatus>, { label: string; color: string; bgColor: string }> = {
    read: { label: 'Read', color: 'text-green-700', bgColor: 'bg-green-100' },
    want_to_read: { label: 'Want to Read', color: 'text-orange-700', bgColor: 'bg-orange-100' },
    currently_reading: { label: 'Currently Reading', color: 'text-blue-700', bgColor: 'bg-blue-100' },
}

export default function BookStatusButton({ bookId, className = '' }: BookStatusButtonProps) {
    const { getStatus, setStatus } = useBookStatus()
    const [isOpen, setIsOpen] = useState(false)
    const [justUpdated, setJustUpdated] = useState(false)
    const dropdownRef = useRef<HTMLDivElement>(null)

    const currentStatus = getStatus(bookId)

    // Close dropdown when clicking outside or pressing Escape
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false)
            }
        }

        const handleEscape = (event: KeyboardEvent) => {
            if (event.key === 'Escape' && isOpen) {
                setIsOpen(false)
            }
        }

        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside)
            document.addEventListener('keydown', handleEscape)
            return () => {
                document.removeEventListener('mousedown', handleClickOutside)
                document.removeEventListener('keydown', handleEscape)
            }
        }
    }, [isOpen])

    // Handle status change with proper cleanup
    useEffect(() => {
        if (justUpdated) {
            const timer = setTimeout(() => setJustUpdated(false), 1000)
            return () => clearTimeout(timer)
        }
    }, [justUpdated])

    const handleStatusChange = (status: BookStatus) => {
        setStatus(bookId, status)
        setIsOpen(false)
        setJustUpdated(true)
    }

    return (
        <div className={`relative ${className}`} ref={dropdownRef}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                aria-label={currentStatus ? `Change status from ${currentStatusConfig[currentStatus].label}` : 'Add book to list'}
                aria-expanded={isOpen}
                aria-haspopup="true"
                className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all duration-200 ${currentStatus
                        ? `${currentStatusConfig[currentStatus].bgColor} ${currentStatusConfig[currentStatus].color}`
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    } ${justUpdated ? 'scale-105 ring-2 ring-offset-2 ring-gray-400' : ''}`}
            >
                {currentStatus ? (
                    <>
                        <span>{currentStatusConfig[currentStatus].label}</span>
                        <span className="text-sm">✓</span>
                    </>
                ) : (
                    <>
                        <span>Add to List</span>
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                    </>
                )}
            </button>

            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: -10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -10, scale: 0.95 }}
                        transition={{ duration: 0.15 }}
                        className="absolute top-full left-0 mt-2 w-56 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-50"
                    >
                        {statusOptions.map((option, index) => (
                            <button
                                key={option.value || 'remove'}
                                onClick={() => handleStatusChange(option.value)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' || e.key === ' ') {
                                        e.preventDefault()
                                        handleStatusChange(option.value)
                                    }
                                }}
                                className={`w-full text-left px-4 py-2.5 flex items-center gap-3 transition-colors focus:outline-none focus:ring-2 focus:ring-gray-900 focus:ring-inset ${currentStatus === option.value ? 'bg-gray-50 font-medium' : ''
                                    } ${option.color}`}
                            >
                                <span className="text-lg" aria-hidden="true">{option.icon}</span>
                                <span>{option.label}</span>
                                {currentStatus === option.value && (
                                    <span className="ml-auto text-sm" aria-hidden="true">✓</span>
                                )}
                            </button>
                        ))}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    )
}

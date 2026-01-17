'use client'

import type { BookStatus } from '@/hooks/useBookStatus'

interface StatusBadgeProps {
    bookId: string
    status: BookStatus  // Pass as prop instead
    className?: string
}

const statusConfig: Record<NonNullable<BookStatus>, { label: string; color: string; bgColor: string }> = {
    read: {
        label: 'Read',
        color: 'text-green-700',
        bgColor: 'bg-green-100',
    },
    want_to_read: {
        label: 'Want to Read',
        color: 'text-orange-700',
        bgColor: 'bg-orange-100',
    },
    currently_reading: {
        label: 'Currently Reading',
        color: 'text-blue-700',
        bgColor: 'bg-blue-100',
    },
}

export default function StatusBadge({ bookId, status, className = '' }: StatusBadgeProps) {
    // No longer calls useBookStatus hook

    if (!status) return null

    const config = statusConfig[status]

    const dotColor = status === 'read' ? '#10b981' : status === 'want_to_read' ? '#f59e0b' : '#3b82f6'

    return (
        <div
            className={`inline-flex items-center gap-1.5 px-2 py-0.5 sm:py-1 rounded-full text-[10px] sm:text-xs font-medium shadow-sm ${config.bgColor} ${config.color} ${className}`}
            title={config.label}
        >
            <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: dotColor }} />
            <span className="hidden sm:inline">{config.label}</span>
        </div>
    )
}

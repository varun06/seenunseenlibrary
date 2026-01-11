'use client'

import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

export type ToastType = 'success' | 'error' | 'info' | 'warning'

interface Toast {
    id: string
    message: string
    type: ToastType
}

interface ToastContextType {
    toasts: Toast[]
    showToast: (message: string, type?: ToastType) => void
    removeToast: (id: string) => void
}

// Simple toast manager using events (no context needed for simplicity)
class ToastManager {
    private listeners: Set<(toasts: Toast[]) => void> = new Set()
    private toasts: Toast[] = []

    subscribe(listener: (toasts: Toast[]) => void) {
        this.listeners.add(listener)
        return () => this.listeners.delete(listener)
    }

    private notify() {
        this.listeners.forEach((listener) => listener([...this.toasts]))
    }

    show(message: string, type: ToastType = 'info', duration: number = 3000) {
        const id = Math.random().toString(36).substring(7)
        const toast: Toast = { id, message, type }
        this.toasts.push(toast)
        this.notify()

        if (duration > 0) {
            setTimeout(() => {
                this.remove(id)
            }, duration)
        }

        return id
    }

    remove(id: string) {
        this.toasts = this.toasts.filter((t) => t.id !== id)
        this.notify()
    }
}

export const toastManager = new ToastManager()

export function showToast(message: string, type?: ToastType) {
    return toastManager.show(message, type)
}

const toastStyles = {
    success: 'bg-green-500 text-white',
    error: 'bg-red-500 text-white',
    warning: 'bg-orange-500 text-white',
    info: 'bg-blue-500 text-white',
}

export default function ToastContainer() {
    const [toasts, setToasts] = useState<Toast[]>([])

    useEffect(() => {
        const unsubscribe = toastManager.subscribe(setToasts)
        return () => {
            unsubscribe()
        }
    }, [])

    return (
        <div className="fixed top-4 right-4 z-50 flex flex-col gap-2 pointer-events-none">
            <AnimatePresence>
                {toasts.map((toast) => (
                    <motion.div
                        key={toast.id}
                        initial={{ opacity: 0, y: -20, x: 100 }}
                        animate={{ opacity: 1, y: 0, x: 0 }}
                        exit={{ opacity: 0, x: 100, transition: { duration: 0.2 } }}
                        className={`${toastStyles[toast.type]} px-4 py-3 rounded-lg shadow-lg pointer-events-auto min-w-[300px] max-w-md`}
                    >
                        <div className="flex items-start justify-between gap-3">
                            <p className="text-sm font-medium flex-1">{toast.message}</p>
                            <button
                                onClick={() => toastManager.remove(toast.id)}
                                className="text-white/80 hover:text-white transition-colors flex-shrink-0"
                                aria-label="Close notification"
                            >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M6 18L18 6M6 6l12 12"
                                    />
                                </svg>
                            </button>
                        </div>
                    </motion.div>
                ))}
            </AnimatePresence>
        </div>
    )
}

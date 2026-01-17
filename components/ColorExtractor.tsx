'use client'

import { useEffect, useState } from 'react'
import type { Book } from '@/types/book'

// Extract dominant color from an image
function getDominantColor(imageData: ImageData) {
    const data = imageData.data
    const colorCounts: Record<string, number> = {}

    // Sample every 10th pixel for performance
    for (let i = 0; i < data.length; i += 40) {
        const r = data[i]
        const g = data[i + 1]
        const b = data[i + 2]

        // Quantize to reduce color space
        const qr = Math.floor(r / 32) * 32
        const qg = Math.floor(g / 32) * 32
        const qb = Math.floor(b / 32) * 32
        const key = `${qr},${qg},${qb}`

        colorCounts[key] = (colorCounts[key] || 0) + 1
    }

    // Find most common color
    let maxCount = 0
    let dominantKey = '128,128,128' // Default gray

    for (const [key, count] of Object.entries(colorCounts)) {
        if (count > maxCount) {
            maxCount = count
            dominantKey = key
        }
    }

    const [r, g, b] = dominantKey.split(',').map(Number)
    return { r, g, b }
}

// Calculate contrasting text color (black or white)
function getContrastColor(r: number, g: number, b: number) {
    // Calculate relative luminance
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255
    return luminance > 0.5 ? '#1f1f2e' : '#ffffff'
}

function rgbToHex(r: number, g: number, b: number) {
    return '#' + [r, g, b].map(x => {
        const hex = x.toString(16)
        return hex.length === 1 ? '0' + hex : hex
    }).join('')
}

export function extractColorFromImage(imageUrl: string): Promise<{ backgroundColor: string; textColor: string }> {
    return new Promise((resolve) => {
        const img = new Image()
        img.crossOrigin = 'anonymous'

        img.onload = () => {
            try {
                const canvas = document.createElement('canvas')
                canvas.width = img.width
                canvas.height = img.height
                const ctx = canvas.getContext('2d')

                if (!ctx) {
                    resolve({ backgroundColor: '#f0f0f0', textColor: '#1f1f2e' })
                    return
                }

                ctx.drawImage(img, 0, 0)
                const imageData = ctx.getImageData(0, 0, img.width, img.height)

                const { r, g, b } = getDominantColor(imageData)
                const backgroundColor = rgbToHex(r, g, b)
                const textColor = getContrastColor(r, g, b)

                resolve({ backgroundColor, textColor })
            } catch (error) {
                console.error('Error extracting color:', error)
                resolve({ backgroundColor: '#f0f0f0', textColor: '#1f1f2e' })
            }
        }

        img.onerror = () => {
            resolve({ backgroundColor: '#f0f0f0', textColor: '#1f1f2e' })
        }

        img.src = imageUrl
    })
}

// Hook to extract colors for books that don't have them
export function useBookColors(book: Book) {
    const [colors, setColors] = useState<{ backgroundColor: string; textColor: string } | null>(null)

    useEffect(() => {
        // Only extract if book has a cover but no colors set (using defaults)
        if (book.cover && (book.backgroundColor === '#f0f0f0' || !book.backgroundColor)) {
            extractColorFromImage(book.cover).then(setColors)
        }
    }, [book.cover, book.backgroundColor])

    return colors || {
        backgroundColor: book.backgroundColor || '#f0f0f0',
        textColor: book.textColor || '#1f1f2e'
    }
}


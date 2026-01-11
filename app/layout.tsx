import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import './globals.css'
import { ErrorBoundary } from '@/components/ErrorBoundary'
import ToastContainer from '@/components/Toast'

export const metadata: Metadata = {
    title: 'SeenUnseen Bookshelf',
    description: 'Books recommended on the SeenUnseen podcast',
}

interface RootLayoutProps {
    children: ReactNode
}

export default function RootLayout({ children }: RootLayoutProps) {
    return (
        <html lang="en">
            <body>
                <ErrorBoundary>
                    {children}
                    <ToastContainer />
                </ErrorBoundary>
            </body>
        </html>
    )
}


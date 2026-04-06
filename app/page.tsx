import { getBooks } from '@/lib/books'
import BooksClient from './BooksClient'
import type { Book, Episode } from '@/types/book'

// Helper to create a consistent key for an episode
function episodeKey(ep: Episode) {
  return ep.episodeUrl || `${ep.episodeNum}-${ep.episodeTitle}`
}

// Error handling component for server-side errors
function ErrorDisplay({ error }: { error: Error }) {
  return (
    <main className="min-h-screen bg-background">
      <header className="sticky top-0 z-10 bg-white/90 backdrop-blur-sm border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 py-3">
          <h1 className="text-lg font-semibold text-accent">SeenUnseen Books</h1>
        </div>
      </header>
      <div className="flex items-center justify-center min-h-[calc(100vh-80px)] px-4">
        <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-6 text-center">
          <div className="mb-4">
            <svg
              className="w-16 h-16 mx-auto text-red-500"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Failed to Load Books</h2>
          <p className="text-gray-600 mb-4">{error.message}</p>
          <p className="text-sm text-gray-500 mb-6">
            Make sure <code className="bg-gray-100 px-2 py-1 rounded">books.json</code> exists in the{' '}
            <code className="bg-gray-100 px-2 py-1 rounded">public/data</code> directory.
          </p>
        </div>
      </div>
    </main>
  )
}

export default async function Home() {
  try {
    const books = await getBooks()

    if (!Array.isArray(books) || books.length === 0) {
      return <ErrorDisplay error={new Error('No books found in data file')} />
    }

    // --- Server-side data processing ---

    // Highlights: top 10 most mentioned (by episode count)
    const top10MostMentioned = [...books]
      .sort((a, b) => b.episodeCount - a.episodeCount)
      .slice(0, 10)

    // Highlights: latest episode and books from that episode
    let latestEpisode: Episode | null = null
    books.forEach((book) => {
      book.episodes?.forEach((ep) => {
        if (!latestEpisode || ep.episodeNum > latestEpisode.episodeNum) {
          latestEpisode = ep
        }
      })
    })

    let latestEpisodeBooks: Book[] = []
    if (latestEpisode) {
      const key = episodeKey(latestEpisode)
      latestEpisodeBooks = books.filter((book) =>
        book.episodes?.some((ep) => episodeKey(ep) === key)
      )
    }
    
    // --- End server-side data processing ---

    return (
      <BooksClient
        initialBooks={books}
        top10MostMentioned={top10MostMentioned}
        latestEpisode={latestEpisode}
        latestEpisodeBooks={latestEpisodeBooks}
      />
    )
  } catch (error) {
    const errorMessage = error instanceof Error ? error : new Error('Unknown error occurred')
    console.error('Error loading books:', errorMessage)
    return <ErrorDisplay error={errorMessage} />
  }
}

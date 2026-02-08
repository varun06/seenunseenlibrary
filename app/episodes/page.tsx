import Link from 'next/link'
import { getBooks } from '@/lib/books'
import type { Book, Episode } from '@/types/book'

function episodeKey(ep: Episode) {
  return ep.episodeUrl || `${ep.episodeNum}-${ep.episodeTitle}`
}

export default async function EpisodesPage() {
  const books = await getBooks()

  const episodesMap = new Map<string, { episode: Episode; books: Book[] }>()
  books.forEach((book) => {
    book.episodes?.forEach((ep) => {
      const key = episodeKey(ep)
      if (!episodesMap.has(key)) {
        episodesMap.set(key, { episode: ep, books: [] })
      }
      const entry = episodesMap.get(key)!
      if (!entry.books.some((b) => b.id === book.id)) {
        entry.books.push(book)
      }
    })
  })

  const episodes = Array.from(episodesMap.values()).sort(
    (a, b) => b.episode.episodeNum - a.episode.episodeNum
  )

  return (
    <main className="min-h-screen bg-background">
      <header className="sticky top-0 z-10 bg-white/90 backdrop-blur-sm border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <Link
              href="/"
              className="text-lg font-semibold text-accent hover:text-accent/90 transition-colors"
            >
              SeenUnseen Books
            </Link>
            <Link
              href="/"
              className="text-sm font-medium text-gray-600 hover:text-accent transition-colors"
            >
              ← Back to Bookshelf
            </Link>
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 py-10 sm:py-12">
        <h1 className="text-2xl font-semibold text-foreground mb-2">Browse all episodes</h1>
        <p className="text-gray-600 mb-8">
          Books recommended in each episode of the SeenUnseen podcast.
        </p>

        <ul className="space-y-8">
          {episodes.map(({ episode, books: episodeBooks }) => (
            <li key={episodeKey(episode)} className="border-b border-gray-200 pb-8 last:border-0">
              <div className="mb-3">
                <a
                  href={episode.episodeUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-lg font-medium text-accent hover:underline"
                >
                  #{episode.episodeNum} – {episode.episodeTitle}
                </a>
                <span className="text-sm text-gray-500 ml-2">{episode.episodeDate}</span>
              </div>
              <ul className="list-disc list-inside text-gray-700 space-y-1 text-sm">
                {episodeBooks.slice(0, 20).map((book) => (
                  <li key={book.id}>
                    <a
                      href={book.amazonLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-foreground hover:text-accent hover:underline"
                    >
                      {book.title}
                    </a>
                  </li>
                ))}
                {episodeBooks.length > 20 && (
                  <li className="text-gray-500">+{episodeBooks.length - 20} more</li>
                )}
              </ul>
            </li>
          ))}
        </ul>

        {episodes.length === 0 && (
          <p className="text-gray-500">No episodes with book data found.</p>
        )}
      </div>
    </main>
  )
}

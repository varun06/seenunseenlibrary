import Link from 'next/link'

export default function About() {
  return (
    <main className="min-h-screen bg-background">
      <header className="sticky top-0 z-10 bg-white/90 backdrop-blur-sm border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <Link href="/" className="text-lg font-semibold text-accent hover:text-accent/90 transition-colors">
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
        <div className="bg-white rounded-lg shadow-lg p-8 md:p-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-6">About This Bookshelf</h1>

          <div className="prose prose-lg max-w-none">
            <p className="text-gray-700 mb-6 leading-relaxed">
              This bookshelf showcases books recommended on the{' '}
              <a
                href="https://seenunseen.in"
                target="_blank"
                rel="noopener noreferrer"
                className="text-accent font-semibold hover:underline"
              >
                SeenUnseen podcast
              </a>
              . The SeenUnseen podcast features in-depth conversations about books, ideas, and the world around us.
            </p>

            <p className="text-gray-700 mb-6 leading-relaxed">
              All book recommendations featured here are sourced directly from episodes of the SeenUnseen podcast.
              Each book includes links to the specific episodes where it was mentioned, allowing you to explore
              the context and discussions that led to the recommendation.
            </p>

            <div className="bg-gray-50 rounded-lg p-6 mb-6 border-l-4 border-accent">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">About SeenUnseen</h2>
              <p className="text-gray-700 leading-relaxed">
                SeenUnseen is a podcast that explores books, ideas, and conversations. You can listen to episodes
                and learn more at{' '}
                <a
                  href="https://seenunseen.in"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-accent font-semibold hover:underline"
                >
                  seenunseen.in
                </a>
                .
              </p>
            </div>

            <div className="mt-8 pt-8 border-t border-gray-200">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">How to Use This Bookshelf</h2>
              <ul className="list-disc list-inside text-gray-700 space-y-2 leading-relaxed">
                <li>Browse all recommended books or filter by your reading status</li>
                <li>Click on any book to see details and links to relevant podcast episodes</li>
                <li>Track your reading progress by marking books as "Read", "Want to Read", or "Currently Reading"</li>
                <li>Explore the episodes where each book was discussed</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}

import Link from 'next/link'

export default function About() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100">
      <header className="sticky top-0 z-10 bg-white/80 backdrop-blur-sm border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <Link href="/" className="text-2xl font-bold text-gray-900 hover:text-gray-700 transition-colors">
                SeenUnseen Bookshelf
              </Link>
              <p className="text-sm text-gray-600 mt-1">About</p>
            </div>
            <Link
              href="/"
              className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
            >
              ← Back to Bookshelf
            </Link>
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 py-12">
        <div className="bg-white rounded-lg shadow-lg p-8 md:p-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-6">About This Bookshelf</h1>

          <div className="prose prose-lg max-w-none">
            <p className="text-gray-700 mb-6 leading-relaxed">
              This bookshelf showcases books recommended on the{' '}
              <a
                href="https://seenunseen.in"
                target="_blank"
                rel="noopener noreferrer"
                className="text-gray-900 font-semibold hover:text-gray-700 underline"
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

            <div className="bg-gray-50 rounded-lg p-6 mb-6 border-l-4 border-gray-900">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">About SeenUnseen</h2>
              <p className="text-gray-700 leading-relaxed">
                SeenUnseen is a podcast that explores books, ideas, and conversations. You can listen to episodes
                and learn more at{' '}
                <a
                  href="https://seenunseen.in"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-gray-900 font-semibold hover:text-gray-700 underline"
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

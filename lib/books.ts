import type { Book } from '@/types/book'

let cachedBooks: Book[] | null = null

export async function getBooks(): Promise<Book[]> {
  // Use cache in production (during build/render)
  if (cachedBooks && process.env.NODE_ENV === 'production') {
    return cachedBooks
  }

  try {
    const fs = await import('fs/promises')
    const path = await import('path')
    const filePath = path.join(process.cwd(), 'public/data/books.json')
    const fileContents = await fs.readFile(filePath, 'utf8')
    const books = JSON.parse(fileContents) as Book[]

    // Deduplicate once
    const seen = new Set<string>()
    const uniqueBooks = books.filter(book => {
      if (seen.has(book.id)) return false
      seen.add(book.id)
      return true
    })

    cachedBooks = uniqueBooks
    return uniqueBooks
  } catch (error) {
    console.error('Error loading books:', error)
    return []
  }
}

export interface Episode {
  episodeNum: number
  episodeTitle: string
  episodeDate: string
  episodeUrl: string
}

export interface Book {
  id: string
  asin: string
  title: string
  amazonLink: string
  episodeCount: number
  episodes: Episode[]
  cover: string | null
  backgroundColor: string
  textColor: string
  spineWidth: number
  height: number
}

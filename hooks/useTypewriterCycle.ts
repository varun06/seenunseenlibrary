'use client'

import { useState, useEffect, useRef } from 'react'

type Phase = 'typing' | 'hold' | 'deleting'

const DEFAULT_TYPE_MS = 90
const DEFAULT_DELETE_MS = 45
const DEFAULT_HOLD_MS = 2000

/**
 * Returns a string that types out character-by-character, holds, then deletes,
 * then cycles to the next phrase. Like someone typing in the search box.
 */
export function useTypewriterCycle(
  phrases: string[],
  options?: {
    typeMs?: number
    deleteMs?: number
    holdMs?: number
  }
): string {
  const { typeMs = DEFAULT_TYPE_MS, deleteMs = DEFAULT_DELETE_MS, holdMs = DEFAULT_HOLD_MS } = options ?? {}
  const [phraseIndex, setPhraseIndex] = useState(0)
  const [length, setLength] = useState(0)
  const [phase, setPhase] = useState<Phase>('typing')

  const phraseIndexRef = useRef(phraseIndex)
  const lengthRef = useRef(length)
  const phaseRef = useRef(phase)
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const phrasesRef = useRef(phrases)

  phraseIndexRef.current = phraseIndex
  lengthRef.current = length
  phaseRef.current = phase
  phrasesRef.current = phrases

  const phrase = phrases[phraseIndex % phrases.length] ?? ''
  const displayed = phrase.slice(0, length)

  useEffect(() => {
    if (phrases.length === 0) return

    const schedule = (fn: () => void, ms: number) => {
      timeoutRef.current = setTimeout(fn, ms)
    }

    const run = () => {
      const idx = phraseIndexRef.current
      const len = lengthRef.current
      const ph = phaseRef.current
      const phraseList = phrasesRef.current
      const currentPhrase = phraseList[idx % phraseList.length] ?? ''

      if (ph === 'typing') {
        if (len < currentPhrase.length) {
          const nextLen = len + 1
          lengthRef.current = nextLen
          setLength(nextLen)
          schedule(run, typeMs)
        } else {
          phaseRef.current = 'hold'
          setPhase('hold')
          schedule(run, holdMs)
        }
        return
      }
      if (ph === 'hold') {
        phaseRef.current = 'deleting'
        setPhase('deleting')
        schedule(run, deleteMs)
        return
      }
      if (ph === 'deleting') {
        if (len > 0) {
          const nextLen = len - 1
          lengthRef.current = nextLen
          setLength(nextLen)
          schedule(run, deleteMs)
        } else {
          const nextIdx = (idx + 1) % phraseList.length
          phraseIndexRef.current = nextIdx
          lengthRef.current = 0
          phaseRef.current = 'typing'
          setPhraseIndex(nextIdx)
          setLength(0)
          setPhase('typing')
          schedule(run, typeMs)
        }
      }
    }

    run()
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current)
    }
  }, [phrases.length, typeMs, deleteMs, holdMs])

  return displayed
}

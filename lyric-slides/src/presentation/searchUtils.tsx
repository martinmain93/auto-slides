import React from 'react'
import type { Song, Slide } from '../types'

// Helper function to strip punctuation and normalize for search
export function normalizeForSearch(text: string): string {
  return text.toLowerCase().replace(/[^\w\s]/g, '').replace(/\s+/g, ' ').trim()
}

// Helper function to extract context around match (flattened to single line)
export function getMatchContext(text: string, query: string, contextLength: number = 100): string {
  const flattened = text.replace(/\s+/g, ' ').trim()
  const normalizedQuery = normalizeForSearch(query)
  const normalizedFlattened = normalizeForSearch(flattened)
  const matchIndex = normalizedFlattened.indexOf(normalizedQuery)
  
  if (matchIndex === -1) {
    // No match, return first contextLength chars
    return flattened.length > contextLength 
      ? flattened.substring(0, contextLength) + '...'
      : flattened
  }
  
  // Map normalized position back to flattened position
  // Since we're matching on normalized text, we need to find where that match is in the flattened text
  let flattenedMatchIndex = 0
  let normalizedPos = 0
  for (let i = 0; i < flattened.length; i++) {
    if (normalizedPos === matchIndex) {
      flattenedMatchIndex = i
      break
    }
    if (/[\w\s]/.test(flattened[i])) {
      normalizedPos++
    }
  }
  
  // Extract context around match in flattened text
  const start = Math.max(0, flattenedMatchIndex - contextLength / 2)
  const end = Math.min(flattened.length, flattenedMatchIndex + normalizedQuery.length + contextLength / 2)
  let result = flattened.substring(start, end)
  
  if (start > 0) result = '...' + result
  if (end < flattened.length) result = result + '...'
  
  return result
}

// Helper function to highlight matching text (using normalized matching)
export function highlightText(text: string, query: string): React.ReactNode | string {
  if (!query.trim()) return text
  const normalizedQuery = normalizeForSearch(query)
  const normalizedText = normalizeForSearch(text)
  
  // Find all matches in normalized text
  const matches: Array<{ start: number; end: number }> = []
  let searchIndex = 0
  while (true) {
    const matchIndex = normalizedText.indexOf(normalizedQuery, searchIndex)
    if (matchIndex === -1) break
    
    // Map normalized start position back to original text position
    let originalStart = 0
    let normalizedPos = 0
    for (let i = 0; i < text.length; i++) {
      if (normalizedPos === matchIndex) {
        originalStart = i
        break
      }
      if (/[\w\s]/.test(text[i])) {
        normalizedPos++
      }
    }
    
    // Map normalized end position back to original text position
    let originalEnd = text.length
    normalizedPos = 0
    const targetEndPos = matchIndex + normalizedQuery.length
    for (let i = 0; i < text.length; i++) {
      if (/[\w\s]/.test(text[i])) {
        normalizedPos++
        if (normalizedPos === targetEndPos) {
          originalEnd = i + 1
          break
        }
      }
    }
    
    matches.push({ start: originalStart, end: originalEnd })
    searchIndex = matchIndex + 1
  }
  
  if (matches.length === 0) return text
  
  // Build highlighted text
  const parts: React.ReactNode[] = []
  let lastIndex = 0
  matches.forEach((match, i) => {
    if (match.start > lastIndex) {
      parts.push(text.substring(lastIndex, match.start))
    }
    parts.push(
      <span key={i} style={{ backgroundColor: '#1E90FF', color: 'white', fontWeight: 600 }}>
        {text.substring(match.start, match.end)}
      </span>
    )
    lastIndex = match.end
  })
  if (lastIndex < text.length) {
    parts.push(text.substring(lastIndex))
  }
  
  return parts.length > 0 ? parts : text
}

// Search results type
export type SearchResult = {
  song: Song
  matchingSlide: Slide
  slideIndex: number
  matchType: 'title' | 'slide'
}

// Search logic
export function searchSongs(library: Song[], query: string): SearchResult[] {
  if (!query.trim()) return []
  const normalizedQuery = normalizeForSearch(query)
  const results: SearchResult[] = []

  for (const song of library) {
    // Skip songs with no slides
    if (!song.slides || song.slides.length === 0) continue
    
    const normalizedTitle = normalizeForSearch(song.title)
    
    // Check title match
    if (normalizedTitle.includes(normalizedQuery)) {
      // Find first slide that also matches if possible
      const matchingSlide = song.slides.find(slide => 
        normalizeForSearch(slide.text).includes(normalizedQuery)
      )
      if (matchingSlide) {
        results.push({
          song,
          matchingSlide,
          slideIndex: song.slides.indexOf(matchingSlide),
          matchType: 'title'
        })
      } else {
        // Just title match, use first slide
        results.push({
          song,
          matchingSlide: song.slides[0],
          slideIndex: 0,
          matchType: 'title'
        })
      }
    } else {
      // Check slide text matches
      for (let i = 0; i < song.slides.length; i++) {
        const slide = song.slides[i]
        if (normalizeForSearch(slide.text).includes(normalizedQuery)) {
          results.push({
            song,
            matchingSlide: slide,
            slideIndex: i,
            matchType: 'slide'
          })
          break // Only add first matching slide per song
        }
      }
    }
  }

  // Sort results: title matches first, then slide matches
  return results.sort((a, b) => {
    if (a.matchType === 'title' && b.matchType === 'slide') return -1
    if (a.matchType === 'slide' && b.matchType === 'title') return 1
    return 0 // Keep original order for same type
  })
}


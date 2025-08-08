// Simple heuristic to estimate whether a slide's text will fit comfortably
// Colors returned correspond to Mantine color names: 'green', 'orange', 'red'.
export type FitLevel = 'green' | 'orange' | 'red'

export function estimateSlideFit(text: string): FitLevel {
  const trimmed = text.trim()
  if (!trimmed) return 'green'

  const lines = trimmed.split(/\n+/)
  const lineCount = lines.length
  const maxLineLen = Math.max(...lines.map((l) => l.length))
  const words = trimmed.split(/\s+/).length
  const chars = trimmed.length

  // Crude density score: weight lines and longest line more than total chars
  const density = lineCount * 20 + maxLineLen * 1.2 + chars * 0.2 + words * 0.5

  // Tune thresholds based on expected projector font sizing (~5vw in present)
  if (density <= 180) return 'green'
  if (density <= 320) return 'orange'
  return 'red'
}

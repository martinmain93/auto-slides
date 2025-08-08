import type { SongSection } from '../types'

export function sectionToColor(section?: SongSection): string {
  if (!section) return 'gray'
  switch (section) {
    case 'chorus':
      return 'grape'
    case 'verse':
      return 'blue'
    case 'bridge':
      return 'teal'
    case 'pre-chorus':
      return 'cyan'
    case 'instrumental':
      return 'green'
    case 'tag':
      return 'pink'
    case 'intro':
      return 'yellow'
    case 'outro':
      return 'orange'
    default:
      return 'gray'
  }
}

export function sectionLabel(section?: SongSection): string | undefined {
  if (!section) return undefined
  return section.charAt(0).toUpperCase() + section.slice(1)
}

export function firstWords(text: string, count = 5): string {
  const words = text.replace(/\n/g, ' ').trim().split(/\s+/)
  const snippet = words.slice(0, count).join(' ')
  return words.length > count ? snippet + '…' : snippet || '—'
}

const baseHex: Record<string, string> = {
  grape: '#ab4eaa',
  blue: '#228be6',
  teal: '#12b886',
  cyan: '#15aabf',
  green: '#40c057',
  pink: '#e64980',
  yellow: '#fab005',
  orange: '#fd7e14',
  gray: '#868e96',
}

export function rgbaFromMantine(colorName: string, alpha: number): string {
  const hex = baseHex[colorName] || baseHex.gray
  const m = /^#?([\da-f]{2})([\da-f]{2})([\da-f]{2})$/i.exec(hex)
  if (!m) return `rgba(255,255,255,${alpha})`
  const r = parseInt(m[1], 16), g = parseInt(m[2], 16), b = parseInt(m[3], 16)
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

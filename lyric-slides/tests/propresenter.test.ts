import { describe, expect, it } from 'vitest'
import { parseProPresenterExport } from '../src/importers/propresenter'

const sample = `Title: Amazing Grace\n\nAmazing grace! how sweet the sound\nThat saved a wretch like me!\n\nI once was lost, but now am found;\nWas blind, but now I see.\n\nTitle: How Great Thou Art\n\nO Lord my God, when I in awesome wonder\nConsider all the worlds Thy Hands have made`;

describe('parseProPresenterExport', () => {
  it('parses multiple songs with slides', () => {
    const songs = parseProPresenterExport(sample)
    expect(songs.length).toBe(2)
    const ag = songs.find((s) => s.id === 'amazing-grace')
    expect(ag?.title).toBe('Amazing Grace')
    expect(ag?.slides.length).toBe(2)
    expect(ag?.slides[0].text).toContain('Amazing grace')
  })

  it('returns empty array for empty input', () => {
    expect(parseProPresenterExport('')).toEqual([])
  })
})


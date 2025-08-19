// Minimal decision types and stub for future matcher
export type PhoneticDecision =
  | { action: 'none'; best: { songId: string; slideId: string; score: number } | null; transcriptWindow: string }
  | { action: 'update' | 'advance'; targetIndex: number; targetSongId?: string; best: { songId: string; slideId: string; score: number } | null; transcriptWindow: string }
  | { action: 'blank'; blankPos: 'start' | 'end' | null; best: { songId: string; slideId: string; score: number } | null; transcriptWindow: string }

export function decideSlidePhonetic(params: {
  transcriptWindow: string
}): PhoneticDecision {
  const { transcriptWindow } = params
  console.log("Here")
  console.log(transcriptWindow)
  return { action: 'none', best: null, transcriptWindow }
}


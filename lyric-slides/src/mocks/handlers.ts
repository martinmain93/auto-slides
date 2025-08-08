import { http, HttpResponse } from 'msw'

// Example handlers - adjust to your real API routes if/when they exist
export const handlers = [
  http.get('/api/health', () => HttpResponse.json({ ok: true })),
]


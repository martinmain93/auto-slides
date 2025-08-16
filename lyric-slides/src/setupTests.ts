import '@testing-library/jest-dom/vitest'
import { afterAll, afterEach, beforeAll } from 'vitest'
import { loadPhonemeDictFromUrl } from './lib/phonemeLoader'

// MSW setup for tests in Node/jsdom using request interception
import { setupServer } from 'msw/node'
import { handlers } from './mocks/handlers'

const server = setupServer(...handlers)

// Minimal matchMedia polyfill for Mantine/use-media-query in JSDOM
if (typeof window !== 'undefined') {
  if (!window.matchMedia) {
    ;(window as any).matchMedia = (query: string) => {
      return {
        matches: false,
        media: query,
        onchange: null,
        addListener: () => {}, // deprecated
        removeListener: () => {}, // deprecated
        addEventListener: () => {},
        removeEventListener: () => {},
        dispatchEvent: () => false,
      } as unknown as MediaQueryList
    }
  }
  if (!('ResizeObserver' in window)) {
    // Simple ResizeObserver polyfill for tests
    ;(window as any).ResizeObserver = class {
      observe() {}
      unobserve() {}
      disconnect() {}
    }
  }
}

beforeAll(async () => {
  server.listen({ onUnhandledRequest: 'bypass' })
  // Load a small local phoneme dictionary subset for deterministic tests
  await loadPhonemeDictFromUrl('/phonemes.json')
})
afterEach(() => server.resetHandlers())
afterAll(() => server.close())


import '@testing-library/jest-dom/vitest'
import { afterAll, afterEach, beforeAll } from 'vitest'

// MSW setup for tests in Node/jsdom using request interception
import { setupServer } from 'msw/node'
import { handlers } from './mocks/handlers'

const server = setupServer(...handlers)

// Minimal matchMedia polyfill for Mantine/use-media-query in JSDOM
if (typeof window !== 'undefined') {
  if (!window.matchMedia) {
    // @ts-expect-error - define on window
    window.matchMedia = (query: string) => {
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
    // @ts-expect-error - define on window
    window.ResizeObserver = class {
      observe() {}
      unobserve() {}
      disconnect() {}
    }
  }
}

beforeAll(() => server.listen({ onUnhandledRequest: 'bypass' }))
afterEach(() => server.resetHandlers())
afterAll(() => server.close())


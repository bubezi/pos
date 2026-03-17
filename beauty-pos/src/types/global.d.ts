export {}

declare global {
  interface Window {
    posAPI: {
      ping: () => string
    }
  }
}
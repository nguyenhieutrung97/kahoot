import '@testing-library/jest-dom';

// Polyfill fetch if needed (Next.js may already provide it)
if (!(globalThis as any).fetch) {
  (globalThis as any).fetch = async () => ({ ok: true, json: async () => ({}) });
}
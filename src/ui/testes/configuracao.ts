import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach, vi } from 'vitest';

// O jsdom ainda não implementa <dialog>.showModal()/close().
HTMLDialogElement.prototype.showModal = function showModal(this: HTMLDialogElement) {
  this.open = true;
};
HTMLDialogElement.prototype.close = function close(this: HTMLDialogElement) {
  this.open = false;
  this.dispatchEvent(new Event('close'));
};

// matchMedia (prefers-color-scheme) não existe no jsdom.
Object.defineProperty(globalThis, 'matchMedia', {
  writable: true,
  value: (consulta: string) => ({ matches: false, media: consulta, addEventListener: vi.fn(), removeEventListener: vi.fn() }),
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.useRealTimers();
  localStorage.clear();
});

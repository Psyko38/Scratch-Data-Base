import { writable } from 'svelte/store';

export const toasts = writable([]);

let toastIdCounter = 0;

export function showToast(message, type = 'info') {
  const id = ++toastIdCounter;
  const toast = { id, message, type };
  toasts.update(list => [...list, toast]);

  setTimeout(() => {
    removeToast(id);
  }, 3500);
}

export function removeToast(id) {
  toasts.update(list => list.filter(t => t.id !== id));
}
